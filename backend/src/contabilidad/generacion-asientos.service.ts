import { BadRequestException, Injectable } from '@nestjs/common';
import { OrigenAsiento, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
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

type VentaParaAsentar = Prisma.ComprobanteGetPayload<{
  include: typeof INCLUIR_VENTA;
}>;
type CompraParaAsentar = Prisma.CompraGetPayload<{
  include: typeof INCLUIR_COMPRA;
}>;
type SalidaKardex = VentaParaAsentar['movimientosKardex'][number];

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
    // regenerar el período sea seguro.
    const yaAsentados = await this.prisma.asiento.findMany({
      where: {
        empresaId,
        estado: 'REGISTRADO',
        origen: { in: origenes },
        origenId: { not: null },
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
