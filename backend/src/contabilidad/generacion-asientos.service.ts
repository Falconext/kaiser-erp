import { BadRequestException, Injectable } from '@nestjs/common';
import { OrigenAsiento, Prisma } from '@prisma/client';
import type {
  GastoOperativo,
  IngresoManual,
  MovimientoCaja,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { mapCategoriaCaja } from '../common/utils/egresos-caja.util';
import {
  LibroDiarioService,
  type LineaAsiento,
  type NuevoAsiento,
} from './libro-diario.service';

export interface OpcionesGeneracion {
  anio: number;
  mes: number;
  sedeId?: number;
  origenes?: OrigenAsiento[];
  /** Arma los asientos y los devuelve sin escribir nada. */
  simular?: boolean;
}

export interface ResultadoGeneracion {
  periodo: string;
  simulado: boolean;
  generados: Array<{
    origen: OrigenAsiento;
    origenId: number;
    documento: string;
    cuo?: string;
    debe: number;
  }>;
  omitidos: Array<{
    origen: OrigenAsiento;
    origenId: number;
    documento: string;
    motivo: string;
  }>;
  extornados: Array<{
    origenId: number;
    documento: string;
    cuo: string;
    motivo: string;
  }>;
  errores: Array<{
    origen: OrigenAsiento;
    origenId: number;
    documento: string;
    error: string;
  }>;
  totales: {
    generados: number;
    omitidos: number;
    extornados: number;
    errores: number;
    debe: number;
  };
}

/** Lo que hace falta para armar los asientos de un período, cargado una vez. */
interface Contexto {
  empresaId: number;
  cuenta: (clave: string) => string;
  /** Productos con receta propia: lo que Kaiser fabrica. */
  fabricados: Set<number>;
  /** Productos que aparecen como insumo de alguna receta: materia prima. */
  materiasPrimas: Set<number>;
  usaClase9: boolean;
}

const r2 = (n: number) => Math.round((Number(n) || 0) * 100) / 100;

/** Lo que se pide de un comprobante para poder asentarlo. */
const INCLUIR_VENTA = {
  cliente: { select: { nombre: true } },
  detalles: { select: { productoId: true, mtoValorVenta: true } },
  movimientosKardex: {
    select: {
      tipoMovimiento: true,
      productoId: true,
      cantidad: true,
      costoUnitario: true,
      valorTotal: true,
      producto: { select: { costoPromedio: true } },
    },
  },
} satisfies Prisma.ComprobanteInclude;

const INCLUIR_COMPRA = {
  proveedor: { select: { nombre: true } },
  detalles: { select: { productoId: true, subtotal: true } },
} satisfies Prisma.CompraInclude;

/**
 * Un cobro se asienta contra el 12 de SU comprobante, así que hace falta el
 * documento entero. `pagos` viene para repartir la detracción entre los cobros
 * parciales: el importe detraído no es caja libre y sale del primer dinero que
 * entra (ver `deCobro`).
 */
const INCLUIR_COBRO = {
  comprobante: {
    select: {
      id: true,
      serie: true,
      correlativo: true,
      tipoDoc: true,
      sedeId: true,
      estadoEnvioSunat: true,
      montoDetraccion: true,
      tipoMoneda: true,
      tipoCambio: true,
      fechaVencimientoCredito: true,
      cliente: { select: { nombre: true } },
      pagos: { select: { id: true, monto: true, fecha: true } },
    },
  },
} satisfies Prisma.PagoInclude;

const INCLUIR_PAGO_COMPRA = {
  compra: {
    select: {
      id: true,
      serie: true,
      numero: true,
      tipoDoc: true,
      sedeId: true,
      estado: true,
      moneda: true,
      tipoCambio: true,
      fechaVencimiento: true,
      proveedor: { select: { nombre: true } },
    },
  },
} satisfies Prisma.PagoCompraInclude;

type VentaParaAsentar = Prisma.ComprobanteGetPayload<{
  include: typeof INCLUIR_VENTA;
}>;
type CompraParaAsentar = Prisma.CompraGetPayload<{
  include: typeof INCLUIR_COMPRA;
}>;
type CobroParaAsentar = Prisma.PagoGetPayload<{
  include: typeof INCLUIR_COBRO;
}>;
type PagoCompraParaAsentar = Prisma.PagoCompraGetPayload<{
  include: typeof INCLUIR_PAGO_COMPRA;
}>;
type SalidaKardex = VentaParaAsentar['movimientosKardex'][number];

/**
 * Medios de pago que mueven una cuenta bancaria y no el cajón. Yape y Plin son
 * transferencias bancarias con otro nombre: el dinero entra a la cuenta, no a
 * la caja, y contarlos como efectivo descuadra el arqueo.
 */
const MEDIOS_BANCARIOS = new Set([
  'TRANSFERENCIA',
  'DEPOSITO',
  'DEPÓSITO',
  'BANCO',
  'CHEQUE',
  'YAPE',
  'PLIN',
  'TARJETA',
  'TARJETA_CREDITO',
  'TARJETA_DEBITO',
  'POS',
  'VISA',
  'MASTERCARD',
]);

/** `CategoriaGasto` → clave del mapeo contable. SUELDOS reusa la clave de planilla. */
const CLAVE_GASTO: Record<string, string> = {
  PUBLICIDAD: 'GASTO_PUBLICIDAD',
  SUELDOS: 'SUELDOS',
  ENVIOS: 'GASTO_ENVIOS',
  COMISIONES: 'GASTO_COMISIONES',
  ALQUILER: 'GASTO_ALQUILER',
  OTROS: 'GASTO_OTROS',
  PERSONALIZADA: 'GASTO_OTROS',
};

/**
 * Qué categorías son gasto de ventas (95) y no administrativo (94) en el
 * destino de la clase 9. Publicidad, envíos y comisiones son del área
 * comercial; el resto se carga a administración.
 */
const GASTO_DE_VENTAS = new Set(['PUBLICIDAD', 'ENVIOS', 'COMISIONES']);

const DIA_MS = 24 * 60 * 60 * 1000;
/** Lima es UTC-5 todo el año: no hay horario de verano que corrija. */
const LIMA_MS = 5 * 60 * 60 * 1000;

@Injectable()
export class GeneracionAsientosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly diario: LibroDiarioService,
  ) {}

  // ───────────────────────── Contexto ─────────────────────────

  /**
   * El mapeo vive en `ConfiguracionContable`, no en el código: la contadora
   * cambia una cuenta desde la pantalla y la generación la usa sin desplegar.
   */
  private async contexto(empresaId: number): Promise<Contexto> {
    const config = await this.prisma.configuracionContable.findMany({
      where: { empresaId },
      select: {
        clave: true,
        valor: true,
        cuenta: { select: { codigo: true, imputable: true, activa: true } },
      },
    });
    const porClave = new Map(config.map((c) => [c.clave, c]));

    const cuenta = (clave: string): string => {
      const c = porClave.get(clave);
      if (!c?.cuenta?.codigo) {
        throw new BadRequestException(
          `Falta configurar la cuenta para ${clave}. Contabilidad › Configuración contable.`,
        );
      }
      if (!c.cuenta.activa || !c.cuenta.imputable) {
        throw new BadRequestException(
          `La cuenta ${c.cuenta.codigo} de ${clave} está inactiva o no recibe movimientos.`,
        );
      }
      return c.cuenta.codigo;
    };

    const [recetas, componentes] = await Promise.all([
      this.prisma.recetaProduccion.findMany({
        where: { empresaId },
        select: { productoFinalId: true },
      }),
      this.prisma.recetaComponente.findMany({
        where: { receta: { empresaId } },
        select: { productoInsumoId: true },
      }),
    ]);

    return {
      empresaId,
      cuenta,
      fabricados: new Set(recetas.map((r) => r.productoFinalId)),
      materiasPrimas: new Set(componentes.map((c) => c.productoInsumoId)),
      usaClase9:
        String(porClave.get('USA_CLASE_9')?.valor ?? 'false') === 'true',
    };
  }

  /** Factor a soles del documento: 1 en PEN, su tipo de cambio en USD. */
  private aSoles(
    moneda: string | null | undefined,
    tipoCambio: unknown,
  ): number {
    if (String(moneda ?? 'PEN').toUpperCase() !== 'USD') return 1;
    const tc = Number(tipoCambio);
    return Number.isFinite(tc) && tc > 0 ? tc : 1;
  }

  /**
   * Cuadra el céntimo del redondeo contra una línea concreta. Repartir un total
   * entre varias cuentas deja diferencias de 0.01 que harían que `registrar()`
   * rechace el asiento entero; el ajuste va donde menos distorsiona: la
   * contrapartida (cliente o proveedor).
   */
  private cuadrar(
    lineas: LineaAsiento[],
    indiceAjuste: number,
  ): LineaAsiento[] {
    const c = (n: number) => Math.round(n * 100);
    const debe = lineas.reduce((s, l) => s + c(l.debe), 0);
    const haber = lineas.reduce((s, l) => s + c(l.haber), 0);
    const dif = debe - haber;
    if (dif === 0) return lineas;
    const l = lineas[indiceAjuste];
    if (l.debe > 0) l.debe = r2(l.debe - dif / 100);
    else l.haber = r2(l.haber + dif / 100);
    return lineas;
  }

  /** Reparte un importe entre fabricado y revendido según el peso de cada línea. */
  private repartir(
    detalles: Array<{ productoId: number | null; importe: number }>,
    esFabricado: (id: number) => boolean,
    total: number,
  ): { fabricado: number; mercaderia: number } {
    const suma = detalles.reduce((s, d) => s + d.importe, 0);
    if (suma <= 0) return { fabricado: 0, mercaderia: r2(total) };
    const fab = detalles
      .filter((d) => d.productoId != null && esFabricado(d.productoId))
      .reduce((s, d) => s + d.importe, 0);
    const fabricado = r2((fab / suma) * total);
    return { fabricado, mercaderia: r2(total - fabricado) };
  }

  /**
   * Caja o bancos. La cuenta bancaria manda sobre el medio declarado: si el
   * usuario eligió una cuenta, el dinero pasó por el banco aunque el combo
   * diga otra cosa. Sin medio ni cuenta se asume caja, que es lo que traen por
   * defecto los modales de cobro y de pago.
   */
  private tesoreria(
    ctx: Contexto,
    medio: string | null | undefined,
    cuentaBancariaId?: number | null,
  ): string {
    if (cuentaBancariaId != null) return ctx.cuenta('BANCOS');
    const m = String(medio ?? '')
      .trim()
      .toUpperCase();
    return MEDIOS_BANCARIOS.has(m) ? ctx.cuenta('BANCOS') : ctx.cuenta('CAJA');
  }

  /**
   * Destino del gasto (clase 9 contra 791). El PCGE lo deja opcional pero la
   * mayoría de contadoras lo usan, y un Diario sin clase 9 les parece
   * incompleto. Se activa por empresa con la clave USA_CLASE_9.
   */
  private destinoDelGasto(
    ctx: Contexto,
    categoria: string,
    importe: number,
    glosa: string,
  ): LineaAsiento[] {
    if (!ctx.usaClase9 || importe <= 0) return [];
    const destino = GASTO_DE_VENTAS.has(categoria)
      ? 'DESTINO_GASTO_VENTAS'
      : 'DESTINO_GASTO_ADMINISTRATIVO';
    return [
      {
        cuenta: ctx.cuenta(destino),
        debe: importe,
        haber: 0,
        glosa: `Destino ${glosa}`,
      },
      {
        cuenta: ctx.cuenta('CARGAS_IMPUTABLES'),
        debe: 0,
        haber: importe,
        glosa: `Destino ${glosa}`,
      },
    ];
  }

  /** Día absoluto en hora de Lima, para contar días sin pelearse con la zona. */
  private diaLima(fecha: Date): number {
    return Math.floor((fecha.getTime() - LIMA_MS) / DIA_MS);
  }

  /** Mediodía de Lima del día absoluto dado: una fecha que no se corre de mes. */
  private mediodiaLima(dia: number): Date {
    return new Date(dia * DIA_MS + LIMA_MS + 12 * 60 * 60 * 1000);
  }

  // ───────────────────────── Ventas ─────────────────────────

  private deVenta(
    c: VentaParaAsentar,
    ctx: Contexto,
  ): NuevoAsiento | { omitido: string } {
    const doc = `${c.serie}-${c.correlativo}`;
    const factor = this.aSoles(c.tipoMoneda, c.tipoCambio);
    const total = r2(Number(c.mtoImpVenta ?? 0) * factor);
    const igv = r2(Number(c.mtoIGV ?? 0) * factor);
    const neto = r2(total - igv);
    if (total <= 0) return { omitido: 'sin importe' };

    const detalles = c.detalles.map((d) => ({
      productoId: d.productoId ?? null,
      importe: Number(d.mtoValorVenta ?? 0),
    }));
    const esNota = c.tipoDoc === '07';
    const parte = this.repartir(detalles, (id) => ctx.fabricados.has(id), neto);

    const pleDoc = {
      tipoDocSunat: c.tipoDoc,
      serie: c.serie,
      numero: String(c.correlativo),
      fechaVencimiento: c.fechaVencimientoCredito ?? null,
    };
    const lineas: LineaAsiento[] = [];

    if (esNota) {
      // Nota de crédito: el asiento va al revés. El costo NO se revierte aquí —
      // la mercadería vuelve al stock solo cuando almacén confirma la
      // devolución, y esa entrada de kardex lleva su propia contrapartida.
      if (parte.mercaderia > 0)
        lineas.push({
          cuenta: ctx.cuenta('DEVOLUCION_VENTA_MERCADERIA'),
          debe: parte.mercaderia,
          haber: 0,
          glosa: doc,
          ...pleDoc,
        });
      if (parte.fabricado > 0)
        lineas.push({
          cuenta: ctx.cuenta('DEVOLUCION_VENTA_PRODUCTO_TERMINADO'),
          debe: parte.fabricado,
          haber: 0,
          glosa: doc,
          ...pleDoc,
        });
      if (igv > 0)
        lineas.push({
          cuenta: ctx.cuenta('IGV_VENTAS'),
          debe: igv,
          haber: 0,
          glosa: doc,
          ...pleDoc,
        });
      lineas.push({
        cuenta: ctx.cuenta('CLIENTES'),
        debe: 0,
        haber: total,
        glosa: doc,
        ...pleDoc,
      });
    } else {
      lineas.push({
        cuenta: ctx.cuenta('CLIENTES'),
        debe: total,
        haber: 0,
        glosa: doc,
        ...pleDoc,
      });
      if (igv > 0)
        lineas.push({
          cuenta: ctx.cuenta('IGV_VENTAS'),
          debe: 0,
          haber: igv,
          glosa: doc,
          ...pleDoc,
        });
      if (parte.mercaderia > 0)
        lineas.push({
          cuenta: ctx.cuenta('VENTA_MERCADERIA'),
          debe: 0,
          haber: parte.mercaderia,
          glosa: doc,
          ...pleDoc,
        });
      if (parte.fabricado > 0)
        lineas.push({
          cuenta: ctx.cuenta('VENTA_PRODUCTO_TERMINADO'),
          debe: 0,
          haber: parte.fabricado,
          glosa: doc,
          ...pleDoc,
        });

      // Costo de lo vendido, del kardex. Sin esto el diario no tiene margen.
      const costo = this.costoDeSalidas(c.movimientosKardex, ctx);
      if (costo.mercaderia > 0) {
        lineas.push({
          cuenta: ctx.cuenta('COSTO_VENTA_MERCADERIA'),
          debe: costo.mercaderia,
          haber: 0,
          glosa: `Costo ${doc}`,
        });
        lineas.push({
          cuenta: ctx.cuenta('EXISTENCIA_MERCADERIA'),
          debe: 0,
          haber: costo.mercaderia,
          glosa: `Costo ${doc}`,
        });
      }
      if (costo.fabricado > 0) {
        lineas.push({
          cuenta: ctx.cuenta('COSTO_VENTA_PRODUCTO_TERMINADO'),
          debe: costo.fabricado,
          haber: 0,
          glosa: `Costo ${doc}`,
        });
        lineas.push({
          cuenta: ctx.cuenta('EXISTENCIA_PRODUCTO_TERMINADO'),
          debe: 0,
          haber: costo.fabricado,
          glosa: `Costo ${doc}`,
        });
      }
    }

    this.cuadrar(lineas, esNota ? lineas.length - 1 : 0);
    return {
      fecha: c.fechaEmision,
      glosa: `${esNota ? 'Nota de crédito' : c.tipoDoc === '01' ? 'Factura' : c.tipoDoc === '08' ? 'Nota de débito' : 'Boleta'} ${doc} · ${c.cliente?.nombre ?? 'cliente'}`,
      origen: 'VENTA',
      origenId: c.id,
      sedeId: c.sedeId ?? null,
      moneda: c.tipoMoneda ?? 'PEN',
      tipoCambio: factor === 1 ? null : factor,
      lineas,
    };
  }

  /**
   * Costo de las salidas de almacén de una venta, separando fabricado de
   * revendido. El kardex no siempre guardó el importe —hay movimientos con
   * `valorTotal` en null—, así que cae a cantidad × costo promedio del producto.
   */
  private costoDeSalidas(movimientos: SalidaKardex[], ctx: Contexto) {
    let fabricado = 0;
    let mercaderia = 0;
    for (const m of movimientos) {
      if (m.tipoMovimiento !== 'SALIDA') continue;
      const valor =
        Number(m.valorTotal ?? 0) ||
        Number(m.cantidad ?? 0) *
          Number(m.costoUnitario ?? m.producto?.costoPromedio ?? 0);
      if (!valor) continue;
      if (m.productoId != null && ctx.fabricados.has(m.productoId))
        fabricado += valor;
      else mercaderia += valor;
    }
    return { fabricado: r2(fabricado), mercaderia: r2(mercaderia) };
  }

  // ───────────────────────── Compras ─────────────────────────

  private deCompra(
    co: CompraParaAsentar,
    ctx: Contexto,
  ): NuevoAsiento | { omitido: string } {
    const doc = `${co.serie}-${co.numero}`;
    const factor = this.aSoles(co.moneda, co.tipoCambio);
    const total = r2(Number(co.total ?? 0) * factor);
    const igv = r2(Number(co.igv ?? 0) * factor);
    const neto = r2(total - igv);
    if (total <= 0) return { omitido: 'sin importe' };

    const pleDoc = {
      tipoDocSunat: co.tipoDoc,
      serie: co.serie,
      numero: co.numero,
      fechaVencimiento: co.fechaVencimiento ?? null,
    };
    const lineas: LineaAsiento[] = [];

    if (co.esGasto) {
      // Consumo propio: no es inventario, así que no lleva asiento de destino.
      lineas.push({
        cuenta: ctx.cuenta('GASTO_OTROS'),
        debe: neto,
        haber: 0,
        glosa: doc,
        ...pleDoc,
      });
      if (igv > 0)
        lineas.push({
          cuenta: ctx.cuenta('IGV_COMPRAS'),
          debe: igv,
          haber: 0,
          glosa: doc,
          ...pleDoc,
        });
      lineas.push({
        cuenta: ctx.cuenta('PROVEEDORES'),
        debe: 0,
        haber: total,
        glosa: doc,
        ...pleDoc,
      });
      this.cuadrar(lineas, lineas.length - 1);
    } else {
      const detalles = co.detalles.map((d) => ({
        productoId: d.productoId ?? null,
        importe: Number(d.subtotal ?? 0),
      }));
      // Materia prima si el producto es insumo de alguna receta; si no, mercadería.
      const parte = this.repartir(
        detalles,
        (id) => ctx.materiasPrimas.has(id),
        neto,
      );
      const materiaPrima = parte.fabricado;
      const mercaderia = parte.mercaderia;

      // Naturaleza (clase 6) contra la cuenta por pagar.
      if (mercaderia > 0)
        lineas.push({
          cuenta: ctx.cuenta('COMPRA_MERCADERIA'),
          debe: mercaderia,
          haber: 0,
          glosa: doc,
          ...pleDoc,
        });
      if (materiaPrima > 0)
        lineas.push({
          cuenta: ctx.cuenta('COMPRA_MATERIA_PRIMA'),
          debe: materiaPrima,
          haber: 0,
          glosa: doc,
          ...pleDoc,
        });
      if (igv > 0)
        lineas.push({
          cuenta: ctx.cuenta('IGV_COMPRAS'),
          debe: igv,
          haber: 0,
          glosa: doc,
          ...pleDoc,
        });
      lineas.push({
        cuenta: ctx.cuenta('PROVEEDORES'),
        debe: 0,
        haber: total,
        glosa: doc,
        ...pleDoc,
      });

      // Destino (clase 2 contra 61). Sin esto la existencia nunca entra al
      // balance: en Perú la compra son dos asientos, no uno.
      if (mercaderia > 0) {
        lineas.push({
          cuenta: ctx.cuenta('EXISTENCIA_MERCADERIA'),
          debe: mercaderia,
          haber: 0,
          glosa: `Destino ${doc}`,
        });
        lineas.push({
          cuenta: ctx.cuenta('VARIACION_MERCADERIA'),
          debe: 0,
          haber: mercaderia,
          glosa: `Destino ${doc}`,
        });
      }
      if (materiaPrima > 0) {
        lineas.push({
          cuenta: ctx.cuenta('EXISTENCIA_MATERIA_PRIMA'),
          debe: materiaPrima,
          haber: 0,
          glosa: `Destino ${doc}`,
        });
        lineas.push({
          cuenta: ctx.cuenta('VARIACION_MATERIA_PRIMA'),
          debe: 0,
          haber: materiaPrima,
          glosa: `Destino ${doc}`,
        });
      }
      this.cuadrar(
        lineas,
        lineas.findIndex((l) => l.haber === total),
      );
    }

    return {
      fecha: co.fechaEmision,
      glosa: `Compra ${doc} · ${co.proveedor?.nombre ?? 'proveedor'}`,
      origen: 'COMPRA',
      origenId: co.id,
      sedeId: co.sedeId ?? null,
      moneda: co.moneda ?? 'PEN',
      tipoCambio: factor === 1 ? null : factor,
      lineas,
    };
  }

  // ───────────────────────── Cobros y pagos ─────────────────────────

  /**
   * Cobro de un comprobante: el dinero entra y la cuenta por cobrar baja.
   *
   * La detracción no es caja libre: el cliente deposita ese importe en la
   * cuenta del Banco de la Nación (107) y solo el resto llega a la empresa. Sin
   * un campo que diga qué cobro cubrió la detracción, se imputa al primer
   * dinero que entra (FIFO sobre los cobros del comprobante): es determinista,
   * no depende del orden en que se generen los asientos, y con un solo cobro
   * —el caso normal— coincide con la realidad.
   */
  private deCobro(
    p: CobroParaAsentar,
    ctx: Contexto,
  ): NuevoAsiento | { omitido: string } {
    const c = p.comprobante;
    const doc = `${c.serie}-${c.correlativo}`;
    const factor = this.aSoles(c.tipoMoneda, c.tipoCambio);
    const monto = r2(Number(p.monto ?? 0) * factor);
    if (monto <= 0) return { omitido: 'sin importe' };

    const detraccion = r2(Number(c.montoDetraccion ?? 0) * factor);
    let cubiertoAntes = 0;
    if (detraccion > 0) {
      const previos = c.pagos
        .filter(
          (o) =>
            o.fecha.getTime() < p.fecha.getTime() ||
            (o.fecha.getTime() === p.fecha.getTime() && o.id < p.id),
        )
        .reduce((s, o) => s + Number(o.monto ?? 0) * factor, 0);
      cubiertoAntes = Math.min(r2(previos), detraccion);
    }
    const aDetraccion = r2(
      Math.max(0, Math.min(cubiertoAntes + monto, detraccion) - cubiertoAntes),
    );
    const aTesoreria = r2(monto - aDetraccion);

    const pleDoc = {
      tipoDocSunat: c.tipoDoc,
      serie: c.serie,
      numero: String(c.correlativo),
      fechaVencimiento: c.fechaVencimientoCredito ?? null,
    };
    const lineas: LineaAsiento[] = [];
    if (aDetraccion > 0)
      lineas.push({
        cuenta: ctx.cuenta('DETRACCIONES'),
        debe: aDetraccion,
        haber: 0,
        glosa: `Detracción ${doc}`,
        ...pleDoc,
      });
    if (aTesoreria > 0)
      lineas.push({
        cuenta: this.tesoreria(ctx, p.medioPago, p.cuentaBancariaId),
        debe: aTesoreria,
        haber: 0,
        glosa: doc,
        ...pleDoc,
      });
    lineas.push({
      cuenta: ctx.cuenta('CLIENTES'),
      debe: 0,
      haber: monto,
      glosa: doc,
      ...pleDoc,
    });

    // El céntimo del redondeo se ajusta en el debe (caja o detracción), nunca
    // en el 12: la cuenta por cobrar tiene que cerrar contra la venta.
    this.cuadrar(lineas, 0);
    return {
      fecha: p.fecha,
      glosa: `Cobro ${doc} · ${c.cliente?.nombre ?? 'cliente'}`,
      origen: 'COBRO',
      origenId: p.id,
      sedeId: c.sedeId ?? null,
      moneda: c.tipoMoneda ?? 'PEN',
      tipoCambio: factor === 1 ? null : factor,
      lineas,
    };
  }

  /** Pago a proveedor: baja la cuenta por pagar y sale el dinero. */
  private dePagoCompra(
    p: PagoCompraParaAsentar,
    ctx: Contexto,
  ): NuevoAsiento | { omitido: string } {
    const co = p.compra;
    const doc = `${co.serie}-${co.numero}`;
    const factor = this.aSoles(co.moneda, co.tipoCambio);
    const monto = r2(Number(p.monto ?? 0) * factor);
    if (monto <= 0) return { omitido: 'sin importe' };

    const pleDoc = {
      tipoDocSunat: co.tipoDoc,
      serie: co.serie,
      numero: co.numero,
      fechaVencimiento: co.fechaVencimiento ?? null,
    };
    const lineas: LineaAsiento[] = [
      {
        cuenta: ctx.cuenta('PROVEEDORES'),
        debe: monto,
        haber: 0,
        glosa: doc,
        ...pleDoc,
      },
      {
        cuenta: this.tesoreria(ctx, p.metodoPago, p.cuentaBancariaId),
        debe: 0,
        haber: monto,
        glosa: doc,
        ...pleDoc,
      },
    ];
    this.cuadrar(lineas, 1);
    return {
      fecha: p.fecha,
      glosa: `Pago ${doc} · ${co.proveedor?.nombre ?? 'proveedor'}`,
      origen: 'PAGO',
      origenId: p.id,
      sedeId: co.sedeId ?? null,
      moneda: co.moneda ?? 'PEN',
      tipoCambio: factor === 1 ? null : factor,
      lineas,
    };
  }

  // ───────────────────────── Caja, gastos e ingresos ─────────────────────────

  /**
   * Movimiento de caja. Solo INGRESO y EGRESO: la apertura y el cierre no son
   * hechos contables —no mueven patrimonio, solo declaran cuánto hay en el
   * cajón— y asentarlos duplicaría el saldo.
   *
   * Un movimiento de caja es efectivo por definición, así que la contrapartida
   * es siempre 101 aunque `metodoPago` diga otra cosa: si el dinero fue por
   * banco, el hecho se registra como gasto operativo o como cobro, no en caja.
   */
  private deCaja(
    m: MovimientoCaja,
    ctx: Contexto,
  ): NuevoAsiento | { omitido: string } {
    const monto = r2(Number(m.monto ?? 0));
    if (monto <= 0) return { omitido: 'sin importe' };
    const detalle = m.descripcionGasto?.trim() || m.observaciones?.trim() || '';
    const caja = ctx.cuenta('CAJA');

    if (m.tipoMovimiento === 'INGRESO') {
      const lineas: LineaAsiento[] = [
        { cuenta: caja, debe: monto, haber: 0, glosa: detalle || 'Ingreso' },
        {
          cuenta: ctx.cuenta('INGRESO_OTROS'),
          debe: 0,
          haber: monto,
          glosa: detalle || 'Ingreso',
        },
      ];
      return {
        fecha: m.fecha,
        glosa: `Ingreso de caja${detalle ? ` · ${detalle}` : ''}`,
        origen: 'CAJA',
        origenId: m.id,
        sedeId: m.sedeId ?? null,
        moneda: 'PEN',
        tipoCambio: null,
        lineas,
      };
    }

    // La caja guarda la categoría como texto libre ("menu", "Servicios
    // básicos"); `mapCategoriaCaja` es el mismo normalizador que usa el P&L,
    // así que el asiento y el reporte clasifican igual.
    const categoria = mapCategoriaCaja(m.categoriaGasto);
    const lineas: LineaAsiento[] = [
      {
        cuenta: ctx.cuenta(CLAVE_GASTO[categoria] ?? 'GASTO_OTROS'),
        debe: monto,
        haber: 0,
        glosa: detalle || categoria,
      },
      { cuenta: caja, debe: 0, haber: monto, glosa: detalle || categoria },
      ...this.destinoDelGasto(ctx, categoria, monto, `caja ${categoria}`),
    ];
    return {
      fecha: m.fecha,
      glosa: `Egreso de caja · ${detalle || categoria}`,
      origen: 'CAJA',
      origenId: m.id,
      sedeId: m.sedeId ?? null,
      moneda: 'PEN',
      tipoCambio: null,
      lineas,
    };
  }

  /**
   * Gasto operativo. `GastoOperativo` **no guarda el IGV**, así que se asienta
   * el importe completo al gasto y no hay crédito fiscal que recuperar: el
   * importe que la contadora vea en el 63/65 incluirá el IGV de los gastos con
   * factura. Mejora futura: un campo `igv` en el modelo y una línea 40111.
   *
   * Un gasto `recurrenteDiario` guarda el importe de UN día; se asienta una vez
   * al mes por el total de los días que cubre, con fecha del último día
   * cubierto. Asentarlo día a día llenaría el Diario de 30 asientos de S/ 20.
   */
  private deGasto(
    g: GastoOperativo,
    ctx: Contexto,
    primerDia: number,
    ultimoDia: number,
  ): NuevoAsiento | { omitido: string } {
    const factor = this.aSoles(g.moneda, g.tipoCambio);
    let importe: number;
    let dia: number;

    if (g.recurrenteDiario) {
      const inicio = g.fechaInicio
        ? Math.max(this.diaLima(g.fechaInicio), primerDia)
        : primerDia;
      const fin = g.fechaFin
        ? Math.min(this.diaLima(g.fechaFin), ultimoDia)
        : ultimoDia;
      const dias = fin - inicio + 1;
      if (dias <= 0) return { omitido: 'el recurrente no cubre el período' };
      importe = r2(Number(g.monto ?? 0) * factor * dias);
      dia = fin;
    } else {
      importe = r2(Number(g.monto ?? 0) * factor);
      // Un gasto puede venir sin fecha (solo mes/año) o fechado en otro mes:
      // se asienta al cierre del período, o `registrar()` lo mandaría a otro.
      const propio = g.fecha ? this.diaLima(g.fecha) : null;
      dia =
        propio != null && propio >= primerDia && propio <= ultimoDia
          ? propio
          : ultimoDia;
    }
    if (importe <= 0) return { omitido: 'sin importe' };

    const categoria = String(g.categoria);
    const etiqueta = g.etiqueta?.trim() || g.descripcion?.trim() || categoria;
    const pleDoc = {
      // El gasto solo guarda el número de documento como texto libre: no hay
      // tipo ni serie que poner en el PLE.
      numero: g.numeroDocumento?.trim() || null,
    };
    const lineas: LineaAsiento[] = [
      {
        cuenta: ctx.cuenta(CLAVE_GASTO[categoria] ?? 'GASTO_OTROS'),
        debe: importe,
        haber: 0,
        glosa: etiqueta,
        ...pleDoc,
      },
      {
        cuenta: this.tesoreria(ctx, g.medioPago, g.cuentaBancariaId),
        debe: 0,
        haber: importe,
        glosa: etiqueta,
        ...pleDoc,
      },
      ...this.destinoDelGasto(ctx, categoria, importe, etiqueta),
    ];
    return {
      fecha: this.mediodiaLima(dia),
      glosa: `Gasto ${categoria} · ${etiqueta}${g.proveedor ? ` · ${g.proveedor}` : ''}`,
      origen: 'GASTO',
      origenId: g.id,
      sedeId: g.sedeId ?? null,
      moneda: g.moneda ?? 'PEN',
      tipoCambio: factor === 1 ? null : factor,
      lineas,
    };
  }

  /**
   * Ingreso manual. El modelo no guarda medio de pago ni cuenta bancaria, así
   * que entra por caja: es el supuesto conservador —el dinero está en el cajón
   * hasta que alguien diga lo contrario—. Si Kaiser necesita distinguirlo, hace
   * falta un `medioPago` en `IngresoManual`.
   */
  private deIngreso(
    i: IngresoManual,
    ctx: Contexto,
  ): NuevoAsiento | { omitido: string } {
    const monto = r2(Number(i.monto ?? 0));
    if (monto <= 0) return { omitido: 'sin importe' };
    const lineas: LineaAsiento[] = [
      {
        cuenta: ctx.cuenta('CAJA'),
        debe: monto,
        haber: 0,
        glosa: i.concepto,
      },
      {
        cuenta: ctx.cuenta('INGRESO_OTROS'),
        debe: 0,
        haber: monto,
        glosa: i.concepto,
      },
    ];
    return {
      fecha: i.fecha,
      glosa: `Ingreso ${i.tipo} · ${i.concepto}`,
      origen: 'INGRESO',
      origenId: i.id,
      sedeId: i.sedeId ?? null,
      moneda: 'PEN',
      tipoCambio: null,
      lineas,
    };
  }

  // ───────────────────────── Orquestación ─────────────────────────

  async generar(
    empresaId: number,
    usuarioId: number | null,
    opts: OpcionesGeneracion,
  ): Promise<ResultadoGeneracion> {
    const { anio, mes, sedeId, simular = false } = opts;
    const origenes = opts.origenes?.length
      ? opts.origenes
      : (['VENTA', 'COMPRA'] as OrigenAsiento[]);
    const ctx = await this.contexto(empresaId);

    const desde = new Date(Date.UTC(anio, mes - 1, 1, 5, 0, 0));
    const hasta = new Date(Date.UTC(anio, mes, 1, 5, 0, 0));
    const rango = { gte: desde, lt: hasta };
    const res: ResultadoGeneracion = {
      periodo: `${anio}${String(mes).padStart(2, '0')}`,
      simulado: simular,
      generados: [],
      omitidos: [],
      extornados: [],
      errores: [],
      totales: {
        generados: 0,
        omitidos: 0,
        extornados: 0,
        errores: 0,
        debe: 0,
      },
    };

    // Un documento ya asentado no se vuelve a asentar: es lo que hace que
    // regenerar el período sea seguro. Acotado al período porque un mismo
    // documento puede tener un asiento por mes: el gasto `recurrenteDiario` es
    // una sola fila que se devenga todos los meses que dura.
    const yaAsentados = await this.prisma.asiento.findMany({
      where: {
        empresaId,
        estado: 'REGISTRADO',
        origen: { in: origenes },
        origenId: { not: null },
        periodo: { anio, mes },
      },
      select: { id: true, origen: true, origenId: true, cuo: true },
    });
    const asentado = new Map(
      yaAsentados.map((a) => [`${a.origen}|${a.origenId}`, a]),
    );

    /**
     * Extorna en el período del asiento original si sigue abierto, no en el de
     * hoy. Anular una compra de agosto en septiembre dejaba agosto cuadrando
     * sobre un importe que ya no existe. Si agosto está cerrado —lo declarado a
     * SUNAT no se toca— el extorno cae en la fecha de hoy, que es lo correcto.
     */
    const extornar = async (
      asientoId: number,
      fechaOriginal: Date,
      motivo: string,
    ) => {
      try {
        await this.diario.extornar(empresaId, usuarioId ?? 0, asientoId, {
          fecha: fechaOriginal.toISOString(),
          motivo,
        });
      } catch (e) {
        const cerrado = e instanceof Error && /cerrado/i.test(e.message);
        if (!cerrado) throw e;
        await this.diario.extornar(empresaId, usuarioId ?? 0, asientoId, {
          motivo,
        });
      }
    };

    const registrar = async (nuevo: NuevoAsiento, documento: string) => {
      const debe = nuevo.lineas.reduce((s, l) => s + Number(l.debe || 0), 0);
      if (simular) {
        res.generados.push({
          origen: nuevo.origen,
          origenId: nuevo.origenId!,
          documento,
          debe: r2(debe),
        });
        return;
      }
      try {
        const a = await this.diario.registrar(empresaId, usuarioId, nuevo);
        res.generados.push({
          origen: nuevo.origen,
          origenId: nuevo.origenId!,
          documento,
          cuo: a.cuo,
          debe: a.totalDebe,
        });
      } catch (e) {
        res.errores.push({
          origen: nuevo.origen,
          origenId: nuevo.origenId!,
          documento,
          error: e instanceof Error ? e.message : String(e),
        });
      }
    };

    /**
     * El recorrido común de un origen: lo ya asentado se omite diciendo en qué
     * asiento está, lo anulado con asiento se extorna, y el resto se arma y se
     * registra. Es el mismo criterio de las ventas y las compras, escrito una
     * vez para los cinco orígenes de la Fase 2.
     */
    const procesar = async <T>(
      origen: OrigenAsiento,
      filas: T[],
      campos: {
        id: (f: T) => number;
        documento: (f: T) => string;
        /** Por qué el documento dejó de ser un hecho contable, o null. */
        anulado?: (f: T) => string | null;
        /** Fecha del documento: el extorno cae en su período, no en el de hoy. */
        fecha: (f: T) => Date;
        armar: (f: T) => NuevoAsiento | { omitido: string };
      },
    ) => {
      for (const f of filas) {
        const id = campos.id(f);
        const doc = campos.documento(f);
        const previo = asentado.get(`${origen}|${id}`);
        const anulado = campos.anulado?.(f) ?? null;

        if (previo && anulado) {
          if (!simular) await extornar(previo.id, campos.fecha(f), anulado);
          res.extornados.push({
            origenId: id,
            documento: doc,
            cuo: previo.cuo,
            motivo: anulado,
          });
          continue;
        }
        if (previo) {
          res.omitidos.push({
            origen,
            origenId: id,
            documento: doc,
            motivo: `ya asentado en ${previo.cuo}`,
          });
          continue;
        }
        if (anulado) {
          res.omitidos.push({
            origen,
            origenId: id,
            documento: doc,
            motivo: anulado,
          });
          continue;
        }
        const armado = campos.armar(f);
        if ('omitido' in armado) {
          res.omitidos.push({
            origen,
            origenId: id,
            documento: doc,
            motivo: armado.omitido,
          });
          continue;
        }
        await registrar(armado, doc);
      }
    };

    // ── Ventas ──
    if (origenes.includes('VENTA')) {
      const comprobantes = await this.prisma.comprobante.findMany({
        where: {
          empresaId,
          ...(sedeId ? { sedeId } : {}),
          // Solo documentos de SUNAT. Las notas de venta (NV) del histórico
          // importado no son hechos contables de este período.
          tipoDoc: { in: ['01', '03', '07', '08'] },
          fechaEmision: rango,
        },
        orderBy: { fechaEmision: 'asc' },
        include: INCLUIR_VENTA,
      });

      for (const c of comprobantes) {
        const doc = `${c.serie}-${c.correlativo}`;
        const previo = asentado.get(`VENTA|${c.id}`);
        const rechazado =
          c.estadoEnvioSunat === 'RECHAZADO' ||
          c.estadoEnvioSunat === 'ANULADO';

        if (previo && rechazado) {
          // Se asentó y después SUNAT la rechazó o se anuló: se extorna.
          if (!simular) {
            await extornar(
              previo.id,
              c.fechaEmision,
              `comprobante ${c.estadoEnvioSunat.toLowerCase()}`,
            );
          }
          res.extornados.push({
            origenId: c.id,
            documento: doc,
            cuo: previo.cuo,
            motivo: c.estadoEnvioSunat,
          });
          continue;
        }
        if (previo) {
          res.omitidos.push({
            origen: 'VENTA',
            origenId: c.id,
            documento: doc,
            motivo: `ya asentado en ${previo.cuo}`,
          });
          continue;
        }
        if (rechazado) {
          res.omitidos.push({
            origen: 'VENTA',
            origenId: c.id,
            documento: doc,
            motivo: `comprobante ${c.estadoEnvioSunat.toLowerCase()}`,
          });
          continue;
        }

        const armado = this.deVenta(c, ctx);
        if ('omitido' in armado) {
          res.omitidos.push({
            origen: 'VENTA',
            origenId: c.id,
            documento: doc,
            motivo: armado.omitido,
          });
          continue;
        }
        await registrar(armado, doc);
      }
    }

    // ── Compras ──
    if (origenes.includes('COMPRA')) {
      const compras = await this.prisma.compra.findMany({
        where: {
          empresaId,
          ...(sedeId ? { sedeId } : {}),
          fechaEmision: rango,
        },
        orderBy: { fechaEmision: 'asc' },
        include: INCLUIR_COMPRA,
      });

      for (const co of compras) {
        const doc = `${co.serie}-${co.numero}`;
        const previo = asentado.get(`COMPRA|${co.id}`);
        const anulada = co.estado === 'ANULADO';

        if (previo && anulada) {
          if (!simular) {
            await extornar(previo.id, co.fechaEmision, 'compra anulada');
          }
          res.extornados.push({
            origenId: co.id,
            documento: doc,
            cuo: previo.cuo,
            motivo: 'ANULADO',
          });
          continue;
        }
        if (previo) {
          res.omitidos.push({
            origen: 'COMPRA',
            origenId: co.id,
            documento: doc,
            motivo: `ya asentado en ${previo.cuo}`,
          });
          continue;
        }
        if (anulada) {
          res.omitidos.push({
            origen: 'COMPRA',
            origenId: co.id,
            documento: doc,
            motivo: 'compra anulada',
          });
          continue;
        }

        const armado = this.deCompra(co, ctx);
        if ('omitido' in armado) {
          res.omitidos.push({
            origen: 'COMPRA',
            origenId: co.id,
            documento: doc,
            motivo: armado.omitido,
          });
          continue;
        }
        await registrar(armado, doc);
      }
    }

    // ── Cobros ──
    if (origenes.includes('COBRO')) {
      const cobros = await this.prisma.pago.findMany({
        where: {
          fecha: rango,
          // `Pago.empresaId` es opcional y los cobros antiguos lo traen en
          // null: la empresa y la sede se acotan por el comprobante, que
          // siempre las tiene.
          comprobante: {
            empresaId,
            ...(sedeId ? { sedeId } : {}),
            // Solo documentos que pasaron por el 12. Las notas de venta (NV)
            // del histórico no tienen cuenta por cobrar que cerrar, y la nota
            // de crédito (07) no se cobra: se aplica.
            tipoDoc: { in: ['01', '03', '08'] },
          },
        },
        orderBy: [{ fecha: 'asc' }, { id: 'asc' }],
        include: INCLUIR_COBRO,
      });

      await procesar('COBRO', cobros, {
        id: (p) => p.id,
        documento: (p) => `${p.comprobante.serie}-${p.comprobante.correlativo}`,
        anulado: (p) =>
          p.comprobante.estadoEnvioSunat === 'RECHAZADO' ||
          p.comprobante.estadoEnvioSunat === 'ANULADO'
            ? `comprobante ${p.comprobante.estadoEnvioSunat.toLowerCase()}`
            : null,
        fecha: (p) => p.fecha,
        armar: (p) => this.deCobro(p, ctx),
      });
    }

    // ── Pagos a proveedores ──
    if (origenes.includes('PAGO')) {
      const pagos = await this.prisma.pagoCompra.findMany({
        where: {
          empresaId,
          fecha: rango,
          ...(sedeId ? { compra: { sedeId } } : {}),
        },
        orderBy: [{ fecha: 'asc' }, { id: 'asc' }],
        include: INCLUIR_PAGO_COMPRA,
      });

      await procesar('PAGO', pagos, {
        id: (p) => p.id,
        documento: (p) => `${p.compra.serie}-${p.compra.numero}`,
        anulado: (p) =>
          p.compra.estado === 'ANULADO' ? 'compra anulada' : null,
        fecha: (p) => p.fecha,
        armar: (p) => this.dePagoCompra(p, ctx),
      });
    }

    // ── Caja ──
    if (origenes.includes('CAJA')) {
      const movimientos = await this.prisma.movimientoCaja.findMany({
        where: {
          empresaId,
          ...(sedeId ? { sedeId } : {}),
          fecha: rango,
          // La apertura y el cierre declaran cuánto hay en el cajón; no mueven
          // patrimonio y asentarlos duplicaría el saldo de caja.
          tipoMovimiento: { in: ['INGRESO', 'EGRESO'] },
        },
        orderBy: [{ fecha: 'asc' }, { id: 'asc' }],
      });

      await procesar('CAJA', movimientos, {
        id: (m) => m.id,
        documento: (m) => `Caja #${m.id}`,
        anulado: (m) =>
          m.estado === 'ACTIVO' ? null : 'movimiento de caja anulado',
        fecha: (m) => m.fecha,
        armar: (m) => this.deCaja(m, ctx),
      });
    }

    // ── Gastos operativos ──
    if (origenes.includes('GASTO')) {
      const primerDia = this.diaLima(desde);
      const ultimoDia = this.diaLima(hasta) - 1;
      const gastos = await this.prisma.gastoOperativo.findMany({
        where: {
          empresaId,
          ...(sedeId ? { sedeId } : {}),
          // Mismo criterio que el P&L: los puntuales entran por mes/año (la
          // `fecha` es opcional) y los recurrentes por el tramo que cubren.
          OR: [
            { recurrenteDiario: false, mes, anio },
            {
              recurrenteDiario: true,
              fechaInicio: { lt: hasta },
              OR: [{ fechaFin: null }, { fechaFin: { gte: desde } }],
            },
          ],
        },
        orderBy: { id: 'asc' },
      });

      await procesar('GASTO', gastos, {
        id: (g) => g.id,
        documento: (g) => `Gasto #${g.id}`,
        fecha: (g) => g.fecha ?? this.mediodiaLima(ultimoDia),
        armar: (g) => this.deGasto(g, ctx, primerDia, ultimoDia),
      });
    }

    // ── Ingresos manuales ──
    if (origenes.includes('INGRESO')) {
      const ingresos = await this.prisma.ingresoManual.findMany({
        where: {
          empresaId,
          ...(sedeId ? { sedeId } : {}),
          fecha: rango,
        },
        orderBy: [{ fecha: 'asc' }, { id: 'asc' }],
      });

      await procesar('INGRESO', ingresos, {
        id: (i) => i.id,
        documento: (i) => `Ingreso #${i.id}`,
        fecha: (i) => i.fecha,
        armar: (i) => this.deIngreso(i, ctx),
      });
    }

    res.totales = {
      generados: res.generados.length,
      omitidos: res.omitidos.length,
      extornados: res.extornados.length,
      errores: res.errores.length,
      debe: r2(res.generados.reduce((s, g) => s + g.debe, 0)),
    };
    return res;
  }
}
