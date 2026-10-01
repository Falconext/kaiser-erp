import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Reportes de gestión (gerencia): ventas por vendedor, cliente, producto,
 * categoría, sector y ubigeo (departamento / provincia / distrito).
 *
 * Criterio de "venta válida" — EXACTAMENTE el mismo que usa el Dashboard
 * (`DashboardService.filtroExcluirConvertidos` + `estadoEnvioSunat != ANULADO`):
 *  - no anulados;
 *  - se excluyen documentos de pre-venta (NP nota de pedido, COT cotización, OT);
 *  - se excluyen informales (NV, TICKET, RH, CP…) que ya fueron convertidos a
 *    un comprobante formal (tienen `comprobantesDerivados`), para no duplicar;
 *  - las notas de crédito (07) restan, igual que en `headerResumen`.
 *
 * Montos siempre en PEN: los comprobantes en USD se convierten con el
 * `tipoCambio` guardado en el propio comprobante (fallback 1 si no tiene).
 */

export const DIMENSIONES = [
  'vendedor',
  'cliente',
  'producto',
  'categoria',
  'sector',
  'departamento',
  'provincia',
  'distrito',
] as const;
export type Dimension = (typeof DIMENSIONES)[number];

const TIPOS_INFORMALES = ['NP', 'OT', 'COT', 'TICKET', 'NV', 'RH', 'CP'];
const TIPOS_PREVENTA = ['NP', 'COT', 'OT'];
const NOTA_CREDITO = '07';

const SECTOR_LABEL: Record<string, string> = {
  AGROEXPORTACION: 'Agroexportación',
  AVICOLA: 'Avícola',
  PECUARIO: 'Pecuario',
  MINERIA: 'Minería',
  CONSTRUCCION: 'Construcción',
  INDUSTRIA: 'Industria',
  COMERCIO: 'Comercio',
  OTRO: 'Otro',
};

export interface FilaReporte {
  clave: string;
  nombre: string;
  ventas: number;
  documentos: number;
  unidades?: number;
  participacion: number;
  extra?: Record<string, any>;
}

export interface ReporteVentas {
  dimension: Dimension;
  periodo: { fechaInicio: string; fechaFin: string };
  moneda: 'PEN';
  /** Venta NETA del periodo, sin IGV: la cifra que cuadra con el P&L. */
  totalVentas: number;
  /** Total facturado con IGV: lo que se le cobró al cliente. */
  totalFacturado: number;
  totalDocumentos: number;
  filas: FilaReporte[];
}

export interface DetalleComprobanteReporte {
  id: number;
  fecha: string;
  tipoDoc: string;
  numero: string;
  cliente: string;
  vendedor: string;
  moneda: string;
  total: number; // en la moneda del comprobante
  totalPEN: number;
  estado: string;
}

export interface FiltrosReporte {
  empresaId: number;
  fechaInicio: string;
  fechaFin: string;
  sedeId?: number;
  moneda?: string;
}

type ComprobanteBase = {
  id: number;
  tipoDoc: string;
  serie: string;
  correlativo: number;
  fechaEmision: Date;
  tipoMoneda: string;
  tipoCambio: number | null;
  /** Total CON IGV. Para la venta neta, ver `montoPEN`. */
  mtoImpVenta: number;
  mtoOperGravadas: number | null;
  mtoOperExoneradas: number | null;
  mtoOperInafectas: number | null;
  mtoOperExportacion: number | null;
  valorVenta: number | null;
  estadoEnvioSunat: string;
  usuarioId: number | null;
  usuario: { id: number; nombre: string } | null;
  vendedorCampoId: number | null;
  vendedorCampoNombre: string | null;
  clienteId: number;
  cliente: {
    id: number;
    nombre: string;
    nroDoc: string;
    sector: string | null;
    departamento: string | null;
    provincia: string | null;
    distrito: string | null;
    ubigeo: string | null;
  } | null;
};

export type MatrizVentas = {
  dimensionFila: Dimension;
  dimensionColumna: Dimension;
  filas: { clave: string; etiqueta: string; total: number }[];
  columnas: { clave: string; etiqueta: string; total: number }[];
  /** valores[i][j] = cruce de filas[i] con columnas[j]. */
  valores: { montoPEN: number; unidades: number }[][];
  totalGeneral: number;
  /** Lo que queda fuera del top de filas / columnas mostrado. */
  restoFilas: number;
  restoColumnas: number;
  totalFilasMostradas: number;
  totalColumnasMostradas: number;
};

@Injectable()
export class ReportesService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Helpers ───────────────────────────────────────────────────────────────

  private assertDimension(dimension: string): Dimension {
    if (!DIMENSIONES.includes(dimension as Dimension)) {
      throw new BadRequestException(
        `dimension inválida. Valores: ${DIMENSIONES.join(', ')}`,
      );
    }
    return dimension as Dimension;
  }

  private assertFechas(fechaInicio?: string, fechaFin?: string) {
    const re = /^\d{4}-\d{2}-\d{2}$/;
    if (
      !fechaInicio ||
      !fechaFin ||
      !re.test(fechaInicio) ||
      !re.test(fechaFin)
    )
      throw new BadRequestException(
        'fechaInicio y fechaFin son requeridos (YYYY-MM-DD)',
      );
  }

  /** Signo del documento: las notas de crédito restan. */
  private signo(tipoDoc: string) {
    return tipoDoc === NOTA_CREDITO ? -1 : 1;
  }

  /** Factor para llevar el monto a PEN según la moneda del comprobante. */
  private factorPEN(c: { tipoMoneda: string; tipoCambio: number | null }) {
    if ((c.tipoMoneda || 'PEN').toUpperCase() !== 'USD') return 1;
    const tc = Number(c.tipoCambio ?? 0);
    return tc > 0 ? tc : 1;
  }

  /**
   * Venta NETA del comprobante, en soles y sin IGV.
   *
   * Antes esto agregaba `mtoImpVenta`, el total con impuesto, y la pantalla lo
   * rotulaba «Ventas del periodo». El P&L responde a la misma pregunta con el neto,
   * así que las dos pantallas daban cifras distintas para el mismo mes:
   * S/ 135.342,69 aquí y S/ 114.697,21 allí. Quien las abra a la vez no sabe cuál
   * creer, y el IGV no es venta de la empresa: se cobra y se entrega a SUNAT.
   *
   * El total facturado sigue disponible en `montoFacturadoPEN`, para quien necesite
   * saber cuánto se cobró.
   */
  private montoPEN(c: ComprobanteBase) {
    const porTipo =
      Number(c.mtoOperGravadas ?? 0) +
      Number(c.mtoOperExoneradas ?? 0) +
      Number(c.mtoOperInafectas ?? 0) +
      Number(c.mtoOperExportacion ?? 0);
    const neto = porTipo > 0 ? porTipo : Number(c.valorVenta ?? 0);
    return this.signo(c.tipoDoc) * neto * this.factorPEN(c);
  }

  /** Total facturado (con IGV), que es lo que se le cobró al cliente. */
  private montoFacturadoPEN(c: ComprobanteBase) {
    return (
      this.signo(c.tipoDoc) * Number(c.mtoImpVenta ?? 0) * this.factorPEN(c)
    );
  }

  private round2(n: number) {
    return Math.round(n * 100) / 100;
  }

  // Lima es siempre UTC-5 (sin DST). Extrae "YYYY-MM-DD" en hora Lima.
  private toFechaLima(d: Date): string {
    return new Date(d.getTime() - 5 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);
  }

  private vendedorEfectivo(c: ComprobanteBase): {
    id: number | null;
    nombre: string;
  } {
    // Regla "vendedor efectivo": vendedor de campo si existe, si no el emisor.
    if (c.vendedorCampoId) {
      return {
        id: c.vendedorCampoId,
        nombre: c.vendedorCampoNombre || `Vendedor #${c.vendedorCampoId}`,
      };
    }
    if (c.usuarioId) {
      return {
        id: c.usuarioId,
        nombre: c.usuario?.nombre || `Usuario #${c.usuarioId}`,
      };
    }
    return { id: null, nombre: 'Sin vendedor' };
  }

  /**
   * Comprobantes que cuentan como venta en el periodo (mismo criterio que el
   * Dashboard). Devuelve sólo los campos necesarios para agrupar.
   */
  private async comprobantesBase(
    f: FiltrosReporte,
  ): Promise<ComprobanteBase[]> {
    const monedaNorm = f.moneda ? f.moneda.toUpperCase() : undefined;
    const rows = await this.prisma.comprobante.findMany({
      where: {
        empresaId: f.empresaId,
        ...(f.sedeId ? { sedeId: f.sedeId } : {}),
        fechaEmision: {
          gte: new Date(`${f.fechaInicio}T00:00:00.000-05:00`),
          lte: new Date(`${f.fechaFin}T23:59:59.999-05:00`),
        },
        estadoEnvioSunat: { not: 'ANULADO' as any },
        ...(monedaNorm && monedaNorm !== 'TODAS'
          ? { tipoMoneda: monedaNorm }
          : {}),
        AND: [
          {
            NOT: {
              tipoDoc: { in: TIPOS_INFORMALES },
              comprobantesDerivados: { some: {} },
            },
          },
          { tipoDoc: { notIn: TIPOS_PREVENTA } },
        ],
      },
      orderBy: { fechaEmision: 'desc' },
      select: {
        id: true,
        tipoDoc: true,
        serie: true,
        correlativo: true,
        fechaEmision: true,
        tipoMoneda: true,
        tipoCambio: true,
        mtoImpVenta: true,
        mtoOperGravadas: true,
        mtoOperExoneradas: true,
        mtoOperInafectas: true,
        mtoOperExportacion: true,
        valorVenta: true,
        estadoEnvioSunat: true,
        usuarioId: true,
        usuario: { select: { id: true, nombre: true } },
        vendedorCampoId: true,
        vendedorCampoNombre: true,
        clienteId: true,
        cliente: {
          select: {
            id: true,
            nombre: true,
            nroDoc: true,
            sector: true,
            departamento: true,
            provincia: true,
            distrito: true,
            ubigeo: true,
          },
        },
      },
    });
    return rows as unknown as ComprobanteBase[];
  }

  /** Clave + nombre + extra de un comprobante para dimensiones a nivel documento. */
  private claveDocumento(
    dimension: Exclude<Dimension, 'producto' | 'categoria'>,
    c: ComprobanteBase,
  ): { clave: string; nombre: string; extra?: Record<string, any> } {
    const cli = c.cliente;
    switch (dimension) {
      case 'vendedor': {
        const v = this.vendedorEfectivo(c);
        return {
          clave: v.id != null ? String(v.id) : 'SIN_VENDEDOR',
          nombre: v.nombre,
        };
      }
      case 'cliente':
        return {
          clave: String(c.clienteId),
          nombre: cli?.nombre || `Cliente #${c.clienteId}`,
          extra: {
            nroDoc: cli?.nroDoc ?? '',
            sector: cli?.sector ?? null,
            departamento: cli?.departamento ?? null,
            provincia: cli?.provincia ?? null,
            distrito: cli?.distrito ?? null,
          },
        };
      case 'sector': {
        const s = (cli?.sector || '').trim().toUpperCase();
        return s
          ? { clave: s, nombre: SECTOR_LABEL[s] ?? s }
          : { clave: 'SIN_SECTOR', nombre: 'Sin sector' };
      }
      case 'departamento': {
        const d = (cli?.departamento || '').trim().toUpperCase();
        return d
          ? { clave: d, nombre: d }
          : { clave: 'SIN_UBIGEO', nombre: 'Sin ubigeo' };
      }
      case 'provincia': {
        const d = (cli?.departamento || '').trim().toUpperCase();
        const p = (cli?.provincia || '').trim().toUpperCase();
        return p
          ? {
              clave: `${d}|${p}`,
              nombre: p,
              extra: { departamento: d || null },
            }
          : { clave: 'SIN_UBIGEO', nombre: 'Sin ubigeo' };
      }
      case 'distrito': {
        const d = (cli?.departamento || '').trim().toUpperCase();
        const p = (cli?.provincia || '').trim().toUpperCase();
        const t = (cli?.distrito || '').trim().toUpperCase();
        return t
          ? {
              clave: `${d}|${p}|${t}`,
              nombre: t,
              extra: {
                departamento: d || null,
                provincia: p || null,
                ubigeo: cli?.ubigeo ?? null,
              },
            }
          : { clave: 'SIN_UBIGEO', nombre: 'Sin ubigeo' };
      }
    }
  }

  /**
   * Detalles (líneas) de los comprobantes base, con su producto/categoría.
   * Monto de línea = valor de venta + impuestos (con IGV), llevado a PEN y con
   * signo negativo si la línea pertenece a una nota de crédito, para que la
   * suma por producto cuadre con el total del periodo.
   */
  private async detallesBase(comprobantes: ComprobanteBase[]) {
    if (comprobantes.length === 0) return [];
    const mapComp = new Map(comprobantes.map((c) => [c.id, c] as const));
    const detalles = await this.prisma.detalleComprobante.findMany({
      where: { comprobanteId: { in: comprobantes.map((c) => c.id) } },
      select: {
        comprobanteId: true,
        productoId: true,
        descripcion: true,
        cantidad: true,
        mtoValorVenta: true,
        totalImpuestos: true,
        producto: {
          select: {
            id: true,
            codigo: true,
            descripcion: true,
            categoriaId: true,
            categoria: { select: { id: true, nombre: true } },
          },
        },
      },
    });
    return detalles.map((d) => {
      const c = mapComp.get(d.comprobanteId)!;
      const factor = this.signo(c.tipoDoc) * this.factorPEN(c);
      return {
        comprobanteId: d.comprobanteId,
        productoId: d.productoId,
        descripcion: d.producto?.descripcion || d.descripcion,
        codigo: d.producto?.codigo ?? null,
        categoriaId: d.producto?.categoriaId ?? null,
        categoriaNombre: d.producto?.categoria?.nombre ?? null,
        cantidad: this.signo(c.tipoDoc) * Number(d.cantidad ?? 0),
        // El NETO de la línea, sin IGV. Antes se le sumaba `totalImpuestos`, así que
        // agrupar por producto o por categoría daba el 118 % del total del informe:
        // las filas venían con impuesto y la cabecera sin él. Se veía a simple vista
        // —las participaciones sumaban 118 %— y nadie lo había mirado.
        montoPEN: Number(d.mtoValorVenta ?? 0) * factor,
        /** Lo facturado de la línea, con IGV, para quien necesite el cobrado. */
        montoFacturadoPEN:
          (Number(d.mtoValorVenta ?? 0) + Number(d.totalImpuestos ?? 0)) *
          factor,
      };
    });
  }

  // ─── Reporte agrupado ──────────────────────────────────────────────────────

  async ventasPor(
    dimensionRaw: string,
    f: FiltrosReporte,
    limit?: number,
  ): Promise<ReporteVentas> {
    const dimension = this.assertDimension(dimensionRaw);
    this.assertFechas(f.fechaInicio, f.fechaFin);

    const comprobantes = await this.comprobantesBase(f);
    const totalVentas = this.round2(
      comprobantes.reduce((s, c) => s + this.montoPEN(c), 0),
    );
    // Se devuelven las dos: la venta neta (que es la que cuadra con el P&L) y lo
    // facturado con IGV, para no quitarle a nadie el número que usaba.
    const totalFacturado = this.round2(
      comprobantes.reduce((s, c) => s + this.montoFacturadoPEN(c), 0),
    );
    const totalDocumentos = comprobantes.length;

    type Acc = {
      clave: string;
      nombre: string;
      ventas: number;
      docs: Set<number>;
      unidades: number;
      extra?: Record<string, any>;
    };
    const acc = new Map<string, Acc>();
    const push = (
      k: { clave: string; nombre: string; extra?: Record<string, any> },
      monto: number,
      compId: number,
      unidades = 0,
    ) => {
      const item = acc.get(k.clave) ?? {
        clave: k.clave,
        nombre: k.nombre,
        ventas: 0,
        docs: new Set<number>(),
        unidades: 0,
        extra: k.extra,
      };
      item.ventas += monto;
      item.unidades += unidades;
      item.docs.add(compId);
      acc.set(k.clave, item);
    };

    if (dimension === 'producto' || dimension === 'categoria') {
      const detalles = await this.detallesBase(comprobantes);
      for (const d of detalles) {
        const k =
          dimension === 'producto'
            ? {
                clave:
                  d.productoId != null ? String(d.productoId) : `SIN_PRODUCTO`,
                nombre: d.descripcion || 'Sin producto',
                extra: { codigo: d.codigo, categoria: d.categoriaNombre },
              }
            : {
                clave:
                  d.categoriaId != null
                    ? String(d.categoriaId)
                    : 'SIN_CATEGORIA',
                nombre: d.categoriaNombre || 'Sin categoría',
              };
        push(k, d.montoPEN, d.comprobanteId, d.cantidad);
      }
    } else {
      for (const c of comprobantes) {
        push(this.claveDocumento(dimension, c), this.montoPEN(c), c.id);
      }
    }

    let filas: FilaReporte[] = Array.from(acc.values())
      .map((a) => ({
        clave: a.clave,
        nombre: a.nombre,
        ventas: this.round2(a.ventas),
        documentos: a.docs.size,
        ...(dimension === 'producto'
          ? { unidades: this.round2(a.unidades) }
          : {}),
        participacion:
          totalVentas > 0 ? this.round2((a.ventas / totalVentas) * 100) : 0,
        ...(a.extra ? { extra: a.extra } : {}),
      }))
      .sort((a, b) => b.ventas - a.ventas);

    if (limit && limit > 0) filas = filas.slice(0, limit);

    return {
      dimension,
      periodo: { fechaInicio: f.fechaInicio, fechaFin: f.fechaFin },
      moneda: 'PEN',
      totalVentas,
      totalFacturado,
      totalDocumentos,
      filas,
    };
  }

  // ─── Drill-down: comprobantes de una fila ──────────────────────────────────

  async detalle(
    dimensionRaw: string,
    clave: string,
    f: FiltrosReporte,
  ): Promise<DetalleComprobanteReporte[]> {
    const dimension = this.assertDimension(dimensionRaw);
    this.assertFechas(f.fechaInicio, f.fechaFin);
    if (!clave) throw new BadRequestException('clave es requerida');

    const comprobantes = await this.comprobantesBase(f);
    let seleccion: ComprobanteBase[];

    if (dimension === 'producto' || dimension === 'categoria') {
      const detalles = await this.detallesBase(comprobantes);
      const ids = new Set(
        detalles
          .filter((d) =>
            dimension === 'producto'
              ? (d.productoId != null
                  ? String(d.productoId)
                  : 'SIN_PRODUCTO') === clave
              : (d.categoriaId != null
                  ? String(d.categoriaId)
                  : 'SIN_CATEGORIA') === clave,
          )
          .map((d) => d.comprobanteId),
      );
      seleccion = comprobantes.filter((c) => ids.has(c.id));
    } else {
      seleccion = comprobantes.filter(
        (c) => this.claveDocumento(dimension, c).clave === clave,
      );
    }

    return seleccion.map((c) => ({
      id: c.id,
      fecha: this.toFechaLima(c.fechaEmision),
      tipoDoc: c.tipoDoc,
      numero: `${c.serie}-${String(c.correlativo).padStart(8, '0')}`,
      cliente: c.cliente?.nombre || `Cliente #${c.clienteId}`,
      vendedor: this.vendedorEfectivo(c).nombre,
      moneda: (c.tipoMoneda || 'PEN').toUpperCase(),
      total: this.round2(this.signo(c.tipoDoc) * Number(c.mtoImpVenta ?? 0)),
      totalPEN: this.round2(this.montoFacturadoPEN(c)),
      /** Venta neta en soles, sin IGV: la que cuadra con el P&L. */
      netoPEN: this.round2(this.montoPEN(c)),
      estado: c.estadoEnvioSunat,
    }));
  }

  // ─── Matriz: dos dimensiones cruzadas ──────────────────────────────────────

  /**
   * Cruza DOS dimensiones a la vez — p. ej. producto × departamento: qué se
   * consume más y dónde. `ventasPor` agrupa por una sola, así que respondía "qué
   * producto se vende más" o "cuánto vende Lambayeque", pero nunca "qué producto
   * se vende más EN Lambayeque", que es la pregunta que se hace quien decide qué
   * fabricar y para qué zona.
   *
   * Las dimensiones de LÍNEA (producto, categoría) se resuelven sobre los
   * detalles; las de DOCUMENTO (cliente, zona, sector, vendedor) sobre el
   * comprobante. Cruzar una de cada tipo obliga a recorrer los detalles y mirar
   * su comprobante: por eso el reparto de abajo, y no un groupBy de Prisma.
   *
   * Los totales de fila y de columna se calculan sobre TODO el universo, no
   * sobre las celdas mostradas: si se recortaran a la vez que el top, la suma de
   * la tabla no cuadraría con el total del periodo y el informe se volvería
   * indefendible delante de gerencia.
   */
  async matriz(
    dimFilaRaw: string,
    dimColumnaRaw: string,
    f: FiltrosReporte,
    limiteFilas = 15,
    limiteColumnas = 12,
  ): Promise<MatrizVentas> {
    const dimFila = this.assertDimension(dimFilaRaw);
    const dimColumna = this.assertDimension(dimColumnaRaw);
    if (dimFila === dimColumna) {
      throw new BadRequestException(
        'Las dos dimensiones tienen que ser distintas.',
      );
    }
    this.assertFechas(f.fechaInicio, f.fechaFin);

    const esDeLinea = (d: Dimension) => d === 'producto' || d === 'categoria';
    if (esDeLinea(dimFila) && esDeLinea(dimColumna)) {
      throw new BadRequestException(
        'Producto y categoría describen la misma línea: cruzarlas no dice nada. ' +
          'Combina una con cliente, zona, sector o vendedor.',
      );
    }

    const comprobantes = await this.comprobantesBase(f);
    const detalles = await this.detallesBase(comprobantes);
    const porComprobante = new Map(comprobantes.map((c) => [c.id, c] as const));

    const etiquetas = new Map<string, string>();
    const totalFila = new Map<string, number>();
    const totalColumna = new Map<string, number>();
    const celdas = new Map<string, { monto: number; unidades: number }>();
    let totalGeneral = 0;

    // Clave de una dimensión de línea, con la misma convención que `ventasPor`.
    const claveLinea = (d: Dimension, det: (typeof detalles)[number]) =>
      d === 'producto'
        ? {
            clave:
              det.productoId != null ? String(det.productoId) : 'SIN_PRODUCTO',
            nombre: det.descripcion || 'Sin producto',
          }
        : {
            clave:
              det.categoriaId != null
                ? String(det.categoriaId)
                : 'SIN_CATEGORIA',
            nombre: det.categoriaNombre || 'Sin categoría',
          };

    for (const det of detalles) {
      const comp = porComprobante.get(det.comprobanteId);
      if (!comp) continue;

      const fila = esDeLinea(dimFila)
        ? claveLinea(dimFila, det)
        : this.claveDocumento(dimFila, comp);
      const col = esDeLinea(dimColumna)
        ? claveLinea(dimColumna, det)
        : this.claveDocumento(dimColumna, comp);

      etiquetas.set(`F:${fila.clave}`, fila.nombre);
      etiquetas.set(`C:${col.clave}`, col.nombre);

      const monto = det.montoPEN;
      totalFila.set(fila.clave, (totalFila.get(fila.clave) ?? 0) + monto);
      totalColumna.set(col.clave, (totalColumna.get(col.clave) ?? 0) + monto);
      totalGeneral += monto;

      const k = `${fila.clave}\u0000${col.clave}`;
      const prev = celdas.get(k) ?? { monto: 0, unidades: 0 };
      prev.monto += monto;
      prev.unidades += det.cantidad;
      celdas.set(k, prev);
    }

    const ordenarYRecortar = (
      totales: Map<string, number>,
      prefijo: 'F' | 'C',
      limite: number,
    ) =>
      [...totales.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, Math.max(1, limite))
        .map(([clave, total]) => ({
          clave,
          etiqueta: etiquetas.get(`${prefijo}:${clave}`) ?? clave,
          total: this.round2(total),
        }));

    const filas = ordenarYRecortar(totalFila, 'F', limiteFilas);
    const columnas = ordenarYRecortar(totalColumna, 'C', limiteColumnas);

    const valores = filas.map((fila) =>
      columnas.map((col) => {
        const c = celdas.get(`${fila.clave}\u0000${col.clave}`);
        return {
          montoPEN: this.round2(c?.monto ?? 0),
          unidades: c ? Math.round(c.unidades * 1000) / 1000 : 0,
        };
      }),
    );

    // Lo que queda fuera del recorte, dicho explícitamente: una matriz que no
    // suma el total del periodo hace dudar de todo lo demás.
    const sumaFilas = filas.reduce((s, x) => s + x.total, 0);
    const sumaColumnas = columnas.reduce((s, x) => s + x.total, 0);

    return {
      dimensionFila: dimFila,
      dimensionColumna: dimColumna,
      filas,
      columnas,
      valores,
      totalGeneral: this.round2(totalGeneral),
      restoFilas: this.round2(totalGeneral - sumaFilas),
      restoColumnas: this.round2(totalGeneral - sumaColumnas),
      totalFilasMostradas: totalFila.size,
      totalColumnasMostradas: totalColumna.size,
    };
  }
}
