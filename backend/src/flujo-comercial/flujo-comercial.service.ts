import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SeguimientoCotizacionService } from '../cotizaciones/seguimiento.service';
import { CreditoClienteService } from '../cliente/credito.service';
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
type Estado =
  | 'PENDIENTE'
  | 'AUTORIZADO'
  | 'ANULADO'
  | 'ENTREGADO'
  | 'FACTURADO';

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
    private readonly seguimiento: SeguimientoCotizacionService,
    private readonly credito: CreditoClienteService,
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
      throw new BadRequestException(
        'El nombre del autorizador es obligatorio.',
      );
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
    data: {
      nombre?: string;
      telefono?: string;
      email?: string;
      activo?: boolean;
    },
  ) {
    await this.ensureAutorizador(empresaId, id);
    return this.prisma.autorizadorPedido.update({
      where: { id },
      data: {
        ...(data.nombre !== undefined ? { nombre: data.nombre.trim() } : {}),
        ...(data.telefono !== undefined
          ? { telefono: data.telefono?.trim() || null }
          : {}),
        ...(data.email !== undefined
          ? { email: data.email?.trim() || null }
          : {}),
        ...(data.activo !== undefined ? { activo: data.activo } : {}),
      },
    });
  }

  async eliminarAutorizador(empresaId: number, id: number) {
    await this.ensureAutorizador(empresaId, id);
    // Desactiva en vez de borrar si ya autorizó pedidos (preserva historial).
    const usados = await this.prisma.comprobante.count({
      where: { autorizadoPorId: id },
    });
    if (usados > 0) {
      return this.prisma.autorizadorPedido.update({
        where: { id },
        data: { activo: false },
      });
    }
    return this.prisma.autorizadorPedido.delete({ where: { id } });
  }

  private async ensureAutorizador(empresaId: number, id: number) {
    const a = await this.prisma.autorizadorPedido.findFirst({
      where: { id, empresaId },
    });
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
  async autorizar(
    empresaId: number,
    comprobanteId: number,
    autorizadoPorId: number,
    opts?: { autorizarExcesoCredito?: boolean },
  ) {
    const comp = await this.getPedido(empresaId, comprobanteId);
    this.validarTransicion(
      (comp.estadoPedido || 'PENDIENTE') as Estado,
      'AUTORIZADO',
    );
    await this.ensureAutorizador(empresaId, autorizadoPorId);

    // ── Límite de crédito ────────────────────────────────────────────────────
    // AQUÍ y no al emitir. En Kaiser la cotización ES la nota de pedido: la
    // pantalla "Nota de Pedido" opera sobre cotizaciones, y el V°B° es lo que la
    // convierte en compromiso. Cotizar no compromete crédito —un vendedor tiene
    // que poder ofertar a quien deba plata—; autorizar sí, porque a partir de ahí
    // se despacha.
    //
    // El control estaba puesto solo en la emisión de facturas y pedidos NP, que
    // no es por donde pasa el flujo real: nunca llegaba a dispararse.
    const datos = await this.prisma.comprobante.findUnique({
      where: { id: comprobanteId },
      select: {
        clienteId: true,
        mtoImpVenta: true,
        formaPagoTipo: true,
        cotizTipoPago: true,
      },
    });
    const alCredito =
      String(datos?.formaPagoTipo ?? '').toUpperCase() === 'CREDITO' ||
      String(datos?.cotizTipoPago ?? '').toUpperCase() === 'CREDITO';
    if (datos?.clienteId && alCredito) {
      const ev = await this.credito.evaluar(
        empresaId,
        datos.clienteId,
        Number(datos.mtoImpVenta ?? 0),
      );
      if (ev.aplica && ev.excede && !opts?.autorizarExcesoCredito) {
        await this.prisma.comprobante.update({
          where: { id: comprobanteId },
          data: {
            excedeLimiteCredito: true,
            deudaAlEmitir: ev.deuda,
            limiteAlEmitir: ev.limite,
          },
        });
        throw new BadRequestException(
          `${ev.mensaje} Autorizarlo de todas formas exige confirmarlo expresamente.`,
        );
      }
      if (ev.aplica) {
        await this.prisma.comprobante.update({
          where: { id: comprobanteId },
          data: {
            excedeLimiteCredito: ev.excede,
            deudaAlEmitir: ev.deuda,
            limiteAlEmitir: ev.limite,
          },
        });
      }
    }
    const autorizado = await this.prisma.comprobante.update({
      where: { id: comprobanteId },
      data: {
        estadoPedido: 'AUTORIZADO',
        autorizadoPorId,
        autorizadoEn: new Date(),
      },
      include: { autorizadoPor: true },
    });
    await this.seguimiento.registrar(
      empresaId,
      comprobanteId,
      {
        usuarioId: null,
        tipo: 'NOTA',
        detalle: `Pedido autorizado por ${autorizado.autorizadoPor?.nombre ?? 'el autorizador'}.`,
      },
      { auto: true },
    );
    return autorizado;
  }

  /** Marca la mercadería como entregada (almacén entregó con su guía de remisión). */
  async marcarEntregado(empresaId: number, comprobanteId: number) {
    const comp = await this.getPedido(empresaId, comprobanteId);
    this.validarTransicion(
      (comp.estadoPedido || 'PENDIENTE') as Estado,
      'ENTREGADO',
    );
    const entregado = await this.prisma.comprobante.update({
      where: { id: comprobanteId },
      data: { estadoPedido: 'ENTREGADO', entregadoEn: new Date() },
    });
    await this.seguimiento.registrar(
      empresaId,
      comprobanteId,
      { usuarioId: null, tipo: 'NOTA', detalle: 'Mercadería entregada.' },
      { auto: true },
    );
    return entregado;
  }

  /** Marca el pedido como facturado (se emitió el comprobante formal). */
  async marcarFacturado(empresaId: number, comprobanteId: number) {
    const comp = await this.getPedido(empresaId, comprobanteId);
    this.validarTransicion(
      (comp.estadoPedido || 'PENDIENTE') as Estado,
      'FACTURADO',
    );
    // Bitácora: se ganó. Cierra el ciclo de la cotización en el mismo sitio
    // donde se cierra su estado, para que no puedan divergir.
    //
    // ⚠ Esto estaba DESPUÉS del `return`, así que nunca llegaba a ejecutarse y
    // ninguna cotización facturada quedaba marcada como GANADA en su bitácora.
    const facturado = await this.prisma.comprobante.update({
      where: { id: comprobanteId },
      data: { estadoPedido: 'FACTURADO' },
    });
    await this.seguimiento.registrar(
      empresaId,
      comprobanteId,
      { usuarioId: null, tipo: 'GANADA', detalle: 'Convertida en comprobante' },
      { auto: true },
    );
    return facturado;
  }

  /** Anula el pedido y revierte el stock (reutiliza la anulación de comprobante). */
  async anular(empresaId: number, comprobanteId: number, motivo?: string) {
    const comp = await this.getPedido(empresaId, comprobanteId);
    this.validarTransicion(
      (comp.estadoPedido || 'PENDIENTE') as Estado,
      'ANULADO',
    );
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
    /** Quién pide el V°B°; queda en la bitácora del pedido. */
    usuarioId?: number | null,
  ) {
    const comp = await this.prisma.comprobante.findFirst({
      where: { id: comprobanteId, empresaId },
      include: {
        cliente: true,
        // El correo muestra QUÉ se pidió y QUIÉN lo envió: un autorizador que
        // solo ve un total no puede decidir sin abrir el adjunto.
        detalles: {
          select: {
            descripcion: true,
            cantidad: true,
            unidad: true,
            mtoValorVenta: true,
          },
        },
        usuario: { select: { nombre: true, email: true, celular: true } },
      },
    });
    if (!comp) throw new NotFoundException('Pedido/cotización no encontrado.');

    // 1) Subir el voucher de pago (si se adjuntó) a S3.
    let comprobantePagoUrl: string | null = comp.comprobantePagoUrl ?? null;
    if (voucher?.buffer?.length) {
      const ext = (
        voucher.originalname?.split('.').pop() || 'jpg'
      ).toLowerCase();
      const key = `kaiser/vouchers/pedido-${comprobanteId}-${Date.now()}.${ext}`;
      try {
        if (voucher.mimetype === 'application/pdf' || ext === 'pdf') {
          comprobantePagoUrl = await this.s3.uploadPDF(voucher.buffer, key);
        } else {
          comprobantePagoUrl = await this.s3.uploadImage(
            voucher.buffer,
            key,
            voucher.mimetype,
          );
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
    let destinatarios = (data.destinatarios || [])
      .map((e) => e.trim())
      .filter(Boolean);
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
    const empresa = await this.prisma.empresa.findUnique({
      where: { id: empresaId },
    });
    const { Resend } = await import('resend');
    const resend = new Resend(resendKey);
    const fromEmail =
      process.env.RESEND_FROM_EMAIL || 'pedidos@kaisercorp.com.pe';
    const numero = `${comp.serie}-${comp.correlativo}`;
    const total = `S/ ${Number(comp.mtoImpVenta).toFixed(2)}`;

    // Escapar lo que viene del usuario: el nombre del cliente, la nota y la
    // dirección acaban dentro del HTML del correo.
    const esc = (v: any) =>
      String(v ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    const money = (n: any) =>
      `S/ ${Number(n || 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    const fechaLarga = new Intl.DateTimeFormat('es-PE', {
      timeZone: 'America/Lima',
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    }).format(new Date(comp.fechaEmision ?? new Date()));

    // Hasta 8 líneas; el detalle completo va en el PDF adjunto.
    const lineas = (comp.detalles ?? []).slice(0, 8);
    const resto = (comp.detalles ?? []).length - lineas.length;
    const filasProductos = lineas
      .map(
        (d: any, i: number) => `
            <tr style="background:${i % 2 ? '#fafbfc' : '#ffffff'}">
              <td style="padding:9px 10px;font-size:13px;color:#1a2432;border-bottom:1px solid #eef1f5">${esc(d.descripcion)}</td>
              <td style="padding:9px 10px;font-size:13px;color:#566072;text-align:center;white-space:nowrap;border-bottom:1px solid #eef1f5">${Number(d.cantidad || 0)} ${esc(d.unidad || '')}</td>
              <td style="padding:9px 10px;font-size:13px;color:#1a2432;text-align:right;white-space:nowrap;border-bottom:1px solid #eef1f5">${money(d.mtoValorVenta)}</td>
            </tr>`,
      )
      .join('');

    const fila = (k: string, v: string, fuerte = false) => `
            <tr>
              <td style="padding:7px 0;font-size:13px;color:#566072;white-space:nowrap">${k}</td>
              <td style="padding:7px 0;font-size:13px;color:#1a2432;text-align:right;${fuerte ? 'font-weight:700' : 'font-weight:600'}">${v}</td>
            </tr>`;

    const html = `
      <div style="background:#eef1f5;padding:24px 12px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif">
        <div style="max-width:620px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(16,24,40,.08)">

          <div style="background:#214878;padding:22px 26px">
            <div style="color:#9db8da;font-size:11px;letter-spacing:1.4px;text-transform:uppercase;font-weight:700">
              ${esc(empresa?.razonSocial || 'Kaiser Corporation S.A.')}
            </div>
            <div style="color:#ffffff;font-size:21px;font-weight:700;margin-top:6px">Pedido pendiente de autorización</div>
            <div style="color:#c8d6ea;font-size:13px;margin-top:3px">${esc(numero)} · ${fechaLarga}</div>
          </div>

          <div style="padding:22px 26px">
            <p style="margin:0 0 18px;font-size:14px;line-height:1.6;color:#344054">
              ${esc(comp.usuario?.nombre || 'El área de ventas')} envió este pedido para tu visto bueno.
              Abajo está el resumen; el detalle completo va en el PDF adjunto.
            </p>

            <div style="background:#f7f9fb;border:1px solid #e6eaf0;border-radius:10px;padding:14px 16px;margin-bottom:18px">
              <table style="width:100%;border-collapse:collapse">
                ${fila('Cliente', esc(comp.cliente?.nombre || '—'))}
                ${comp.cliente?.nroDoc ? fila('RUC / DNI', esc(comp.cliente.nroDoc)) : ''}
                ${fila('Total del pedido', money(comp.mtoImpVenta), true)}
              </table>
            </div>

            ${
              filasProductos
                ? `<table style="width:100%;border-collapse:collapse;margin-bottom:18px;border:1px solid #e6eaf0;border-radius:10px;overflow:hidden">
              <tr style="background:#f0f3f7">
                <th style="padding:9px 10px;font-size:11px;letter-spacing:.6px;text-transform:uppercase;color:#566072;text-align:left">Producto</th>
                <th style="padding:9px 10px;font-size:11px;letter-spacing:.6px;text-transform:uppercase;color:#566072;text-align:center">Cant.</th>
                <th style="padding:9px 10px;font-size:11px;letter-spacing:.6px;text-transform:uppercase;color:#566072;text-align:right">Importe</th>
              </tr>
              ${filasProductos}
              ${
                resto > 0
                  ? `<tr><td colspan="3" style="padding:9px 10px;font-size:12px;color:#8a94a6;text-align:center;background:#fafbfc">y ${resto} producto(s) más — ver el PDF adjunto</td></tr>`
                  : ''
              }
            </table>`
                : ''
            }

            <div style="font-size:11px;letter-spacing:.6px;text-transform:uppercase;color:#8a94a6;font-weight:700;margin-bottom:8px">Pago y entrega</div>
            <table style="width:100%;border-collapse:collapse;margin-bottom:18px">
              ${fila('N° de operación', esc(data.nroOperacion || '—'))}
              ${fila('Banco', esc(data.banco || '—'))}
              ${fila('Dirección de entrega', esc(data.direccionEntrega || '—'))}
            </table>

            ${
              comprobantePagoUrl
                ? `<a href="${comprobantePagoUrl}" style="display:block;background:#214878;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:9px;font-size:14px;font-weight:600;text-align:center;margin-bottom:16px">Ver comprobante de pago</a>`
                : ''
            }

            ${
              data.nota
                ? `<div style="border-left:3px solid #214878;background:#f7f9fb;padding:11px 14px;border-radius:0 8px 8px 0;margin-bottom:16px">
                     <div style="font-size:11px;text-transform:uppercase;letter-spacing:.6px;color:#8a94a6;font-weight:700;margin-bottom:4px">Nota de quien envía</div>
                     <div style="font-size:13px;color:#344054;line-height:1.55">${esc(data.nota)}</div>
                   </div>`
                : ''
            }

            <div style="border-top:1px solid #eef1f5;padding-top:14px;font-size:12px;color:#8a94a6;line-height:1.6">
              <strong style="color:#566072">Adjuntos:</strong> el pedido en PDF${voucher?.buffer?.length ? ' y el comprobante de pago' : ''}.<br>
              <strong style="color:#566072">Enviado por:</strong> ${esc(comp.usuario?.nombre || '—')}${comp.usuario?.email ? ` · ${esc(comp.usuario.email)}` : ''}${comp.usuario?.celular ? ` · ${esc(comp.usuario.celular)}` : ''}
            </div>
          </div>

          <div style="background:#f7f9fb;border-top:1px solid #eef1f5;padding:14px 26px;font-size:11px;color:#8a94a6;line-height:1.6">
            ${esc(empresa?.razonSocial || 'Kaiser Corporation S.A.')}${empresa?.ruc ? ` · RUC ${esc(empresa.ruc)}` : ''}<br>
            ${esc(empresa?.direccion || '')}<br>
            Correo automático del sistema de gestión — no es necesario responder.
          </div>
        </div>
      </div>`;

    const { error } = await resend.emails.send({
      from: `${empresa?.razonSocial || 'Kaiser'} <${fromEmail}>`,
      to: destinatarios,
      // Asunto legible en la bandeja sin abrir: qué hay que hacer, de quién y
      // por cuánto. El cliente se recorta para que no empuje el importe fuera
      // de la vista previa del correo.
      subject: `V°B° pendiente · ${numero} · ${String(comp.cliente?.nombre || 'Cliente').slice(0, 38)} · ${money(comp.mtoImpVenta)}`,
      html,
      attachments: [
        ...(pdfBuffer
          ? [
              {
                filename: `Pedido_${numero}.pdf`,
                content: pdfBuffer,
                contentType: 'application/pdf',
              },
            ]
          : []),
        ...(voucher?.buffer?.length
          ? [
              {
                filename: `Voucher_${numero}.${voucher.originalname?.split('.').pop() || 'jpg'}`,
                content: voucher.buffer,
                contentType: voucher.mimetype,
              },
            ]
          : []),
      ],
    });
    if (error)
      throw new BadRequestException(`Error al enviar correo: ${error.message}`);

    // Bitácora: pedir el V°B° es un contacto más del ciclo y tiene que quedar
    // registrado. Sin esto, el vendedor abría "Seguimiento" y no veía ni que se
    // había pedido, ni a quién, ni cuándo — justo lo que la bitácora existe
    // para contestar. Tipo CORREO porque eso es: un correo que salió.
    const detallePartes = [
      `V°B° solicitado a ${destinatarios.join(', ')}`,
      data.nroOperacion ? `Operación ${data.nroOperacion}` : null,
      data.banco ? `Banco ${data.banco}` : null,
      voucher?.buffer?.length ? 'con comprobante de pago' : null,
    ].filter(Boolean);
    await this.seguimiento.registrar(
      empresaId,
      comprobanteId,
      {
        usuarioId: usuarioId ?? null,
        tipo: 'CORREO',
        detalle: detallePartes.join(' · '),
      },
      { auto: true },
    );

    // Marca de que el V°B° YA se pidió, con fecha y destinatario. Se escribe
    // después de que el proveedor acepte el correo: si el envío falla, el
    // pedido no debe quedar marcado como solicitado.
    await this.prisma.comprobante.update({
      where: { id: comprobanteId },
      data: {
        vbSolicitadoEn: new Date(),
        vbSolicitadoA: destinatarios.join(', ').slice(0, 250),
      },
    });

    return { ok: true, enviadoA: destinatarios };
  }
}
