import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreditoClienteService } from '../cliente/credito.service';
import { DespachoPendienteService } from '../guia-remision/despacho-pendiente.service';

/**
 * "Mi día": la pantalla de inicio de un vendedor.
 *
 * El panel general no es su pantalla: le muestra el negocio de otro. Un vendedor
 * de Kaiser abre el sistema para contestar cuatro preguntas, y ninguna estaba a
 * la vista:
 *
 *   1. ¿a quién persigo hoy?      → sus cotizaciones, ordenadas por lo que vence
 *   2. ¿qué pedido mío está trabado? → esperando V°B° o retenido por crédito
 *   3. ¿qué le debo al cliente?   → lo suyo que no ha salido del almacén, porque
 *                                    el cliente le llama a ÉL, no a almacén
 *   4. ¿quién me debe?            → su cobranza, con lo vencido primero
 *
 * Todo va acotado al usuario que entra (`usuarioId` del documento). Gerencia ve
 * lo de todos, porque para eso es gerencia.
 */
@Injectable()
export class MiDiaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly credito: CreditoClienteService,
    private readonly despachos: DespachoPendienteService,
  ) {}

  async resumen(
    empresaId: number,
    usuarioId: number,
    opts?: { todos?: boolean; sedeId?: number },
  ) {
    const mio = opts?.todos ? {} : { usuarioId };
    const hoy = new Date();
    const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);

    const [cotizaciones, pedidos, porCobrar, comisiones, ventasMes] =
      await Promise.all([
        this.cotizaciones(empresaId, mio),
        this.pedidos(empresaId, mio),
        this.porCobrar(empresaId, mio),
        this.comisiones(empresaId, usuarioId, opts?.todos, hoy),
        this.ventasDelMes(empresaId, mio, inicioMes),
      ]);

    const despachos = await this.despachosMios(empresaId, mio, opts?.sedeId);

    return {
      cotizaciones,
      pedidos,
      despachos,
      porCobrar,
      comisiones,
      ventasMes,
      // Lo que hay que hacer HOY, en una sola cifra: es lo que decide si la
      // pantalla sirve o es otro tablero bonito.
      pendientesTotal:
        cotizaciones.porVencer.length +
        pedidos.esperandoVoBo.length +
        despachos.filas.length +
        porCobrar.vencidos.length,
    };
  }

  /**
   * Cotizaciones vivas. "Por vencer" sale de `cotizVigencia` (días desde la
   * emisión), que es lo que el vendedor le prometió al cliente: pasada esa fecha
   * el precio ya no vale y hay que rehacerla.
   */
  private async cotizaciones(empresaId: number, mio: object) {
    const cots = await this.prisma.comprobante.findMany({
      where: {
        empresaId,
        ...mio,
        tipoDoc: 'COT',
        estadoPedido: { notIn: ['ANULADO', 'FACTURADO'] },
      },
      select: {
        id: true,
        serie: true,
        correlativo: true,
        fechaEmision: true,
        cotizVigencia: true,
        mtoImpVenta: true,
        cliente: { select: { id: true, nombre: true } },
      },
      orderBy: { fechaEmision: 'asc' },
    });

    const filas = cots.map((c) => {
      const dias = c.cotizVigencia ?? 7;
      const vence = new Date(c.fechaEmision);
      vence.setDate(vence.getDate() + dias);
      const faltan = Math.ceil((vence.getTime() - Date.now()) / 86_400_000);
      return {
        id: c.id,
        documento: `${c.serie}-${String(c.correlativo).padStart(8, '0')}`,
        cliente: c.cliente?.nombre ?? 'Sin cliente',
        clienteId: c.cliente?.id ?? null,
        importe: Number(c.mtoImpVenta),
        fechaEmision: c.fechaEmision,
        venceEn: vence,
        diasParaVencer: faltan,
        vencida: faltan < 0,
      };
    });

    return {
      total: filas.length,
      importe: r2(filas.reduce((a, f) => a + f.importe, 0)),
      // Las que hay que llamar hoy: vencidas o a menos de tres días.
      porVencer: filas
        .filter((f) => f.diasParaVencer <= 3)
        .sort((a, b) => a.diasParaVencer - b.diasParaVencer),
      todas: filas,
    };
  }

  /** Pedidos míos trabados: esperando V°B°, y por qué. */
  private async pedidos(empresaId: number, mio: object) {
    const peds = await this.prisma.comprobante.findMany({
      where: {
        empresaId,
        ...mio,
        tipoDoc: 'NP',
        estadoPedido: { notIn: ['ANULADO', 'FACTURADO'] },
        estadoEnvioSunat: { not: 'ANULADO' },
      },
      select: {
        id: true,
        serie: true,
        correlativo: true,
        fechaEmision: true,
        mtoImpVenta: true,
        estadoPedido: true,
        excedeLimiteCredito: true,
        cliente: { select: { id: true, nombre: true } },
      },
      orderBy: { fechaEmision: 'desc' },
    });

    const filas = peds.map((p) => ({
      id: p.id,
      documento: `${p.serie}-${String(p.correlativo).padStart(8, '0')}`,
      cliente: p.cliente?.nombre ?? 'Sin cliente',
      importe: Number(p.mtoImpVenta),
      fechaEmision: p.fechaEmision,
      estado: p.estadoPedido,
      retenidoPorCredito: p.excedeLimiteCredito,
      diasEsperando: Math.floor(
        (Date.now() - p.fechaEmision.getTime()) / 86_400_000,
      ),
    }));

    return {
      total: filas.length,
      esperandoVoBo: filas.filter((f) => f.estado === 'PENDIENTE'),
      retenidos: filas.filter((f) => f.retenidoPorCredito),
      autorizados: filas.filter((f) => f.estado === 'AUTORIZADO'),
    };
  }

  /**
   * Lo mío que no ha salido del almacén. Se apoya en el servicio de despachos y
   * se filtra por los documentos del vendedor: la lista general es de almacén,
   * esta es la que le van a reclamar por teléfono.
   */
  private async despachosMios(
    empresaId: number,
    mio: object,
    sedeId?: number,
  ) {
    const { filas } = await this.despachos.pendientes(empresaId, { sedeId });
    if (!Object.keys(mio).length) return { filas };

    const mios = await this.prisma.comprobante.findMany({
      where: { empresaId, ...mio },
      select: { id: true },
    });
    const ids = new Set(mios.map((m) => m.id));
    return { filas: filas.filter((f) => ids.has(f.comprobanteId)) };
  }

  /** Quién me debe, con lo vencido primero. */
  private async porCobrar(empresaId: number, mio: object) {
    const docs = await this.prisma.comprobante.findMany({
      where: {
        empresaId,
        ...mio,
        tipoDoc: { notIn: ['COT', '07'] },
        estadoEnvioSunat: { not: 'ANULADO' },
        estadoPago: { notIn: ['ANULADO', 'COMPLETADO'] },
        saldo: { gt: 0 },
      },
      select: {
        id: true,
        serie: true,
        correlativo: true,
        saldo: true,
        fechaVencimientoCredito: true,
        cliente: { select: { id: true, nombre: true } },
      },
      orderBy: { fechaVencimientoCredito: 'asc' },
    });

    const filas = docs.map((d) => {
      const vence = d.fechaVencimientoCredito;
      const diasVencido = vence
        ? Math.floor((Date.now() - vence.getTime()) / 86_400_000)
        : 0;
      return {
        id: d.id,
        documento: `${d.serie}-${String(d.correlativo).padStart(8, '0')}`,
        cliente: d.cliente?.nombre ?? 'Sin cliente',
        clienteId: d.cliente?.id ?? null,
        saldo: Number(d.saldo ?? 0),
        fechaVencimiento: vence,
        diasVencido: diasVencido > 0 ? diasVencido : 0,
      };
    });

    return {
      total: r2(filas.reduce((a, f) => a + f.saldo, 0)),
      vencidos: filas.filter((f) => f.diasVencido > 0),
      todos: filas,
    };
  }

  /** Mis comisiones del mes, separando lo ya pagado de lo que falta. */
  private async comisiones(
    empresaId: number,
    usuarioId: number,
    todos: boolean | undefined,
    hoy: Date,
  ) {
    const filas = await this.prisma.comisionVendedor.findMany({
      where: {
        empresaId,
        ...(todos ? {} : { vendedorId: usuarioId }),
        mes: hoy.getMonth() + 1,
        anio: hoy.getFullYear(),
      },
      select: { montoComision: true, estado: true },
    });
    const suma = (e?: string) =>
      r2(
        filas
          .filter((f) => (e ? f.estado === e : true))
          .reduce((a, f) => a + Number(f.montoComision), 0),
      );
    return {
      total: suma(),
      pendiente: suma('PENDIENTE'),
      documentos: filas.length,
    };
  }

  /** Lo que llevo vendido este mes. */
  private async ventasDelMes(
    empresaId: number,
    mio: object,
    desde: Date,
  ) {
    const r = await this.prisma.comprobante.aggregate({
      where: {
        empresaId,
        ...mio,
        // El mismo criterio que el P&L y el dashboard: un pedido no es venta.
        tipoDoc: { in: ['01', '03'] },
        estadoEnvioSunat: { notIn: ['ANULADO', 'RECHAZADO'] },
        fechaEmision: { gte: desde },
      },
      _sum: { valorVenta: true },
      _count: true,
    });
    return {
      importe: r2(Number(r._sum.valorVenta ?? 0)),
      documentos: r._count,
    };
  }
}

const r2 = (n: number) => Math.round(n * 100) / 100;
