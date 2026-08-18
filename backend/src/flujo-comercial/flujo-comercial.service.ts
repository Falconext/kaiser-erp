import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ComprobanteService } from '../comprobante/comprobante.service';
import { S3Service } from '../s3/s3.service';

/**
 * Flujo comercial de Kaiser (acta POSIGESA, marzo 2026).
 *
 * Gestiona el ciclo de estados de la Nota de Pedido / cotización y el catálogo
 * de personas facultadas para autorizar ("Autorizado por").
 *
 * Transiciones válidas:
 *   PENDIENTE  → AUTORIZADO | ANULADO
 *   AUTORIZADO → ENTREGADO  | FACTURADO | ANULADO
 *   ENTREGADO  → FACTURADO  | ANULADO
 *   FACTURADO  → (terminal)
 *   ANULADO    → (terminal)
 */
type Estado = 'PENDIENTE' | 'AUTORIZADO' | 'ANULADO' | 'ENTREGADO' | 'FACTURADO';

const TRANSICIONES: Record<Estado, Estado[]> = {
  PENDIENTE: ['AUTORIZADO', 'ANULADO'],
  AUTORIZADO: ['ENTREGADO', 'FACTURADO', 'ANULADO'],
  ENTREGADO: ['FACTURADO', 'ANULADO'],
  FACTURADO: [],
  ANULADO: [],
};

@Injectable()
export class FlujoComercialService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly comprobanteService: ComprobanteService,
    private readonly s3: S3Service,
  ) {}

  // ─── Autorizadores (catálogo "Autorizado por") ─────────────────────────────
  listarAutorizadores(empresaId: number) {
    return this.prisma.autorizadorPedido.findMany({
      where: { empresaId },
      orderBy: { nombre: 'asc' },
    });
  }

  crearAutorizador(
    empresaId: number,
    data: { nombre: string; telefono?: string; email?: string },
  ) {
    if (!data?.nombre?.trim())
      throw new BadRequestException('El nombre del autorizador es obligatorio.');
    return this.prisma.autorizadorPedido.create({
      data: {
        empresaId,
        nombre: data.nombre.trim(),
        telefono: data.telefono?.trim() || null,
        email: data.email?.trim() || null,
      },
    });
  }

  async actualizarAutorizador(
    empresaId: number,
    id: number,
    data: { nombre?: string; telefono?: string; email?: string; activo?: boolean },
  ) {
    await this.ensureAutorizador(empresaId, id);
    return this.prisma.autorizadorPedido.update({
      where: { id },
      data: {
        ...(data.nombre !== undefined ? { nombre: data.nombre.trim() } : {}),
        ...(data.telefono !== undefined ? { telefono: data.telefono?.trim() || null } : {}),
        ...(data.email !== undefined ? { email: data.email?.trim() || null } : {}),
        ...(data.activo !== undefined ? { activo: data.activo } : {}),
      },
    });
  }

  async eliminarAutorizador(empresaId: number, id: number) {
    await this.ensureAutorizador(empresaId, id);
    // Desactiva en vez de borrar si ya autorizó pedidos (preserva historial).
    const usados = await this.prisma.comprobante.count({ where: { autorizadoPorId: id } });
    if (usados > 0) {
      return this.prisma.autorizadorPedido.update({ where: { id }, data: { activo: false } });
    }
    return this.prisma.autorizadorPedido.delete({ where: { id } });
  }

  private async ensureAutorizador(empresaId: number, id: number) {
    const a = await this.prisma.autorizadorPedido.findFirst({ where: { id, empresaId } });
    if (!a) throw new NotFoundException('Autorizador no encontrado.');
    return a;
  }

  // ─── Transiciones de estado del pedido ─────────────────────────────────────
  private async getPedido(empresaId: number, comprobanteId: number) {
    const comp = await this.prisma.comprobante.findFirst({
      where: { id: comprobanteId, empresaId },
      select: { id: true, estadoPedido: true, tipoDoc: true },
    });
    if (!comp) throw new NotFoundException('Pedido/cotización no encontrado.');
    return comp;
  }

  private validarTransicion(actual: Estado, destino: Estado) {
    const permitidas = TRANSICIONES[actual] || [];
    if (!permitidas.includes(destino)) {
      throw new BadRequestException(
        `No se puede pasar de ${actual} a ${destino}. Transiciones válidas: ${permitidas.join(', ') || '(ninguna)'}.`,
      );
    }
  }

  /** Autoriza el pedido: el cliente abonó/emitió OC y logística da V°B°. */
  async autorizar(empresaId: number, comprobanteId: number, autorizadoPorId: number) {
    const comp = await this.getPedido(empresaId, comprobanteId);
    this.validarTransicion((comp.estadoPedido || 'PENDIENTE') as Estado, 'AUTORIZADO');
    await this.ensureAutorizador(empresaId, autorizadoPorId);
    return this.prisma.comprobante.update({
      where: { id: comprobanteId },
      data: {
        estadoPedido: 'AUTORIZADO',
        autorizadoPorId,
        autorizadoEn: new Date(),
      },
      include: { autorizadoPor: true },
    });
  }

  /** Marca la mercadería como entregada (almacén entregó con su guía de remisión). */
  async marcarEntregado(empresaId: number, comprobanteId: number) {
    const comp = await this.getPedido(empresaId, comprobanteId);
    this.validarTransicion((comp.estadoPedido || 'PENDIENTE') as Estado, 'ENTREGADO');
    return this.prisma.comprobante.update({
      where: { id: comprobanteId },
      data: { estadoPedido: 'ENTREGADO', entregadoEn: new Date() },
    });
  }

  /** Marca el pedido como facturado (se emitió el comprobante formal). */
  async marcarFacturado(empresaId: number, comprobanteId: number) {
    const comp = await this.getPedido(empresaId, comprobanteId);
    this.validarTransicion((comp.estadoPedido || 'PENDIENTE') as Estado, 'FACTURADO');
    return this.prisma.comprobante.update({
      where: { id: comprobanteId },
      data: { estadoPedido: 'FACTURADO' },
    });
  }

  /** Anula el pedido y revierte el stock (reutiliza la anulación de comprobante). */
  async anular(empresaId: number, comprobanteId: number, motivo?: string) {
    const comp = await this.getPedido(empresaId, comprobanteId);
    this.validarTransicion((comp.estadoPedido || 'PENDIENTE') as Estado, 'ANULADO');
    // Revierte stock y aplica reglas SUNAT (formales aceptados exigen Nota de Crédito).
    await this.comprobanteService.anularComprobante(comprobanteId, motivo);
    return this.prisma.comprobante.update({
      where: { id: comprobanteId },
      data: { estadoPedido: 'ANULADO' },
    });
  }

  /**
   * Ventas envía el pedido al encargado de autorizar: guarda los datos de pago y
   * entrega en el pedido, y manda un correo interno (Resend) con el comprobante
   * en PDF adjunto y esos datos. Es el "requerimiento con copia" del acta POSIGESA.
   */
  async enviarAAutorizador(
    empresaId: number,
    comprobanteId: number,
    data: {
      destinatarios?: string[]; // correos de autorizadores; si vacío, se usan los del catálogo
      nroOperacion?: string;
      banco?: string;
      direccionEntrega?: string;
      clienteDireccionId?: number;
      nota?: string;
    },
    voucher?: { buffer: Buffer; mimetype: string; originalname: string },
  ) {
    const comp = await this.prisma.comprobante.findFirst({
      where: { id: comprobanteId, empresaId },
      include: { cliente: true },
    });
    if (!comp) throw new NotFoundException('Pedido/cotización no encontrado.');

    // 1) Subir el voucher de pago (si se adjuntó) a S3.
    let comprobantePagoUrl: string | null = comp.comprobantePagoUrl ?? null;
    if (voucher?.buffer?.length) {
      const ext = (voucher.originalname?.split('.').pop() || 'jpg').toLowerCase();
      const key = `kaiser/vouchers/pedido-${comprobanteId}-${Date.now()}.${ext}`;
      try {
        if (voucher.mimetype === 'application/pdf' || ext === 'pdf') {
          comprobantePagoUrl = await this.s3.uploadPDF(voucher.buffer, key);
        } else {
          comprobantePagoUrl = await this.s3.uploadImage(voucher.buffer, key, voucher.mimetype);
        }
      } catch {
        // si falla la subida, continuar sin bloquear el envío
      }
    }

    // 2) Guardar datos de pago/entrega en el pedido.
    await this.prisma.comprobante.update({
      where: { id: comprobanteId },
      data: {
        nroOperacionBanco: data.nroOperacion?.trim() || null,
        bancoOperacion: data.banco?.trim() || null,
        direccionEntrega: data.direccionEntrega?.trim() || null,
        clienteDireccionId: data.clienteDireccionId || null,
        comprobantePagoUrl,
      },
    });

    // 2) Resolver destinatarios (autorizadores con email).
    let destinatarios = (data.destinatarios || []).map((e) => e.trim()).filter(Boolean);
    if (destinatarios.length === 0) {
      const auts = await this.prisma.autorizadorPedido.findMany({
        where: { empresaId, activo: true, email: { not: null } },
      });
      destinatarios = auts.map((a) => a.email!).filter(Boolean);
    }
    if (destinatarios.length === 0) {
      throw new BadRequestException(
        'No hay un correo de destino. Registra el email de un autorizador o escríbelo al enviar.',
      );
    }

    // 3) Generar PDF del comprobante.
    let pdfBuffer: Buffer | null = null;
    try {
      const r = await this.comprobanteService.generarBufferPdf(comprobanteId);
      pdfBuffer = r.buffer;
    } catch {
      pdfBuffer = null; // si falla el PDF, igual se envía el correo con los datos
    }

    // 4) Enviar correo (Resend).
    const resendKey = process.env.RESEND_API_KEY;
    if (!resendKey) {
      throw new BadRequestException(
        'Correo no configurado. Agrega RESEND_API_KEY en el backend para enviar.',
      );
    }
    const empresa = await this.prisma.empresa.findUnique({ where: { id: empresaId } });
    const { Resend } = await import('resend');
    const resend = new Resend(resendKey);
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'pedidos@kaisercorp.com.pe';
    const numero = `${comp.serie}-${comp.correlativo}`;
    const total = `S/ ${Number(comp.mtoImpVenta).toFixed(2)}`;

    const html = `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#1a2432">
        <div style="background:#214878;color:#fff;padding:16px 20px;border-radius:10px 10px 0 0">
          <h2 style="margin:0;font-size:18px">Nuevo pedido para autorizar · ${numero}</h2>
        </div>
        <div style="border:1px solid #e2e6ec;border-top:none;padding:20px;border-radius:0 0 10px 10px">
          <p>El área de ventas envió un pedido pendiente de autorización.</p>
          <table style="width:100%;font-size:14px;border-collapse:collapse">
            <tr><td style="padding:6px 0;color:#566072">Cliente</td><td style="text-align:right;font-weight:600">${comp.cliente?.nombre || '—'}</td></tr>
            <tr><td style="padding:6px 0;color:#566072">Total</td><td style="text-align:right;font-weight:700">${total}</td></tr>
            <tr><td style="padding:6px 0;color:#566072">N° operación banco</td><td style="text-align:right;font-weight:600">${data.nroOperacion || '—'}</td></tr>
            <tr><td style="padding:6px 0;color:#566072">Banco</td><td style="text-align:right">${data.banco || '—'}</td></tr>
            <tr><td style="padding:6px 0;color:#566072">Dirección de entrega</td><td style="text-align:right">${data.direccionEntrega || '—'}</td></tr>
          </table>
          ${comprobantePagoUrl ? `<p style="margin-top:14px"><a href="${comprobantePagoUrl}" style="display:inline-block;background:#37b7c6;color:#fff;text-decoration:none;padding:9px 16px;border-radius:8px;font-size:13px;font-weight:600">Ver comprobante de pago</a></p>` : ''}
          ${data.nota ? `<p style="margin-top:14px;padding:10px;background:#f6f7f9;border-radius:8px;font-size:13px">${data.nota}</p>` : ''}
          <p style="margin-top:18px;font-size:12px;color:#8a94a6">${empresa?.razonSocial || 'Kaiser Corporation S.A.'} — Sistema de gestión</p>
        </div>
      </div>`;

    const { error } = await resend.emails.send({
      from: `${empresa?.razonSocial || 'Kaiser'} <${fromEmail}>`,
      to: destinatarios,
      subject: `Pedido para autorizar ${numero} — ${comp.cliente?.nombre || ''} (${total})`,
      html,
      attachments: [
        ...(pdfBuffer ? [{ filename: `Pedido_${numero}.pdf`, content: pdfBuffer, contentType: 'application/pdf' }] : []),
        ...(voucher?.buffer?.length ? [{ filename: `Voucher_${numero}.${(voucher.originalname?.split('.').pop() || 'jpg')}`, content: voucher.buffer, contentType: voucher.mimetype }] : []),
      ],
    });
    if (error) throw new BadRequestException(`Error al enviar correo: ${error.message}`);

    return { ok: true, enviadoA: destinatarios };
  }
}
