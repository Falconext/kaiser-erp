import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Libros contables en formato PLE de SUNAT: Libro Diario (5.1) y Libro Mayor (6.1).
 *
 * ⚠ LEER ANTES DE USAR ESTO CON SUNAT
 *
 * La estructura de campos de abajo está armada con la documentación que se pudo
 * contrastar el 29-sep-2026, pero **no se validó contra la especificación oficial
 * ni contra el Programa Validador de SUNAT (PVS)**: el PDF del anexo de la
 * resolución no fue accesible. El PVS es el único juez de si un TXT es válido, y
 * nadie presenta un libro sin pasarlo por él.
 *
 * Por eso:
 *   · el archivo se genera y se puede descargar, para tenerlo y probarlo;
 *   · el orden de los campos vive en UNA constante (`CAMPOS_5_1`), para que
 *     ajustarlo cuando se tenga la especificación sea cambiar una lista;
 *   · la pantalla y la documentación lo dicen, para que nadie lo presente
 *     creyendo que ya está verificado.
 *
 * Lo que SÍ está verificado y en producción es el SIRE (RVIE de ventas y RCE de
 * compras), que es por donde van hoy los libros de ventas y compras.
 */

const r2 = (v: unknown) => Math.round(Number(v ?? 0) * 100) / 100;
const importe = (v: unknown) => r2(v).toFixed(2);

/** Texto libre: la norma prohíbe el palote y las barras dentro de un campo. */
const texto = (v: string | null | undefined) =>
  (v ?? '')
    .replace(/[|/\\]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/** DD/MM/AAAA en hora de Lima. */
const fecha = (d: Date | null | undefined) => {
  if (!d) return '';
  const l = new Date(d.getTime() - 5 * 60 * 60 * 1000);
  return `${String(l.getUTCDate()).padStart(2, '0')}/${String(l.getUTCMonth() + 1).padStart(2, '0')}/${l.getUTCFullYear()}`;
};

/**
 * Los campos del formato 5.1, en orden. Cambiar aquí = cambiar el archivo.
 * Cada entrada dice qué campo es para que, al contrastarlo con la resolución,
 * se vea de un vistazo qué encaja y qué no.
 */
export const CAMPOS_5_1 = [
  'Periodo (AAAAMM00)',
  'CUO',
  'Correlativo del asiento',
  'Código de la cuenta contable',
  'Código de la unidad de operación',
  'Centro de costos',
  'Tipo de moneda',
  'Tipo de documento de identidad de la contraparte',
  'Número de documento de identidad de la contraparte',
  'Tipo de comprobante',
  'Serie del comprobante',
  'Número del comprobante',
  'Fecha contable',
  'Fecha de vencimiento',
  'Fecha de la operación',
  'Glosa',
  'Glosa referencial',
  'Debe',
  'Haber',
  'Dato estructurado',
  'Indicador del estado de la operación',
] as const;

export const CAMPOS_6_1 = [
  'Periodo (AAAAMM00)',
  'CUO',
  'Correlativo del asiento',
  'Código de la cuenta contable',
  'Debe',
  'Haber',
  'Indicador del estado de la operación',
] as const;

@Injectable()
export class PleService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Nombre del archivo según la máscara del PLE:
   * LE + RUC + AAAA + MM + 00 + libro + 00 + indicador de contenido + 1 + 1 + 1 + .txt
   * El indicador de contenido es 1 si hay movimientos y 0 si el libro va vacío.
   */
  nombreArchivo(
    ruc: string,
    anio: number,
    mes: number,
    libro: '050100' | '060100',
    conDatos: boolean,
  ) {
    const periodo = `${anio}${String(mes).padStart(2, '0')}00`;
    return `LE${ruc}${periodo}${libro}00${conDatos ? '1' : '0'}11.txt`;
  }

  private async lineas(
    empresaId: number,
    anio: number,
    mes: number,
    sedeId?: number,
  ) {
    const desde = new Date(Date.UTC(anio, mes - 1, 1, 5, 0, 0));
    const hasta = new Date(Date.UTC(anio, mes, 1, 5, 0, 0));
    return this.prisma.asientoDetalle.findMany({
      where: {
        asiento: {
          empresaId,
          fecha: { gte: desde, lt: hasta },
          ...(sedeId ? { sedeId } : {}),
        },
      },
      orderBy: [{ asiento: { correlativo: 'asc' } }, { orden: 'asc' }],
      select: {
        debe: true,
        haber: true,
        glosa: true,
        centroCosto: true,
        tipoDocSunat: true,
        serie: true,
        numero: true,
        fechaVencimiento: true,
        cuenta: { select: { codigo: true } },
        asiento: {
          select: {
            cuo: true,
            correlativo: true,
            fecha: true,
            glosa: true,
            moneda: true,
          },
        },
      },
    });
  }

  /** Libro Diario · formato 5.1 · identificador 050100. */
  async diario(empresaId: number, anio: number, mes: number, sedeId?: number) {
    const detalles = await this.lineas(empresaId, anio, mes, sedeId);
    const periodo = `${anio}${String(mes).padStart(2, '0')}00`;
    const filas = detalles.map((d) =>
      [
        periodo, //  1
        d.asiento.cuo, //  2
        `M${String(d.asiento.correlativo).padStart(6, '0')}`, //  3
        d.cuenta.codigo, //  4
        '', //  5  unidad de operación
        d.centroCosto ?? '', //  6  centro de costos
        d.asiento.moneda === 'USD' ? 'USD' : 'PEN', //  7
        '', //  8  tipo doc contraparte
        '', //  9  nro doc contraparte
        d.tipoDocSunat ?? '', // 10
        d.serie ?? '', // 11
        d.numero ?? '', // 12
        fecha(d.asiento.fecha), // 13  fecha contable
        fecha(d.fechaVencimiento), // 14
        fecha(d.asiento.fecha), // 15  fecha de la operación
        texto(d.glosa ?? d.asiento.glosa), // 16
        '', // 17  glosa referencial
        importe(d.debe), // 18
        importe(d.haber), // 19
        '', // 20  dato estructurado
        '1', // 21  operación del periodo
      ].join('|'),
    );
    return { filas, lineas: filas.length, campos: CAMPOS_5_1.length };
  }

  /** Libro Mayor · formato 6.1 · identificador 060100. */
  async mayor(empresaId: number, anio: number, mes: number, sedeId?: number) {
    const detalles = await this.lineas(empresaId, anio, mes, sedeId);
    const periodo = `${anio}${String(mes).padStart(2, '0')}00`;
    const filas = detalles.map((d) =>
      [
        periodo,
        d.asiento.cuo,
        `M${String(d.asiento.correlativo).padStart(6, '0')}`,
        d.cuenta.codigo,
        importe(d.debe),
        importe(d.haber),
        '1',
      ].join('|'),
    );
    return { filas, lineas: filas.length, campos: CAMPOS_6_1.length };
  }

  /**
   * El TXT tal cual se entrega: ISO-8859-1, que es la codificación con la que
   * SUNAT trabaja sus libros. En UTF-8 las eñes y las tildes llegan partidas.
   */
  aBuffer(filas: string[]): Buffer {
    return Buffer.from(
      filas.join('\r\n') + (filas.length ? '\r\n' : ''),
      'latin1',
    );
  }
}
