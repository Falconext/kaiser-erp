import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ComprobanteService } from '../comprobante/comprobante.service';

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
}
