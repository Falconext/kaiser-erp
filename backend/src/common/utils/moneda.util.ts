/**
 * Utilidades de moneda para normalizar montos a Soles (PEN).
 *
 * Los comprobantes guardan `mtoImpVenta` en su moneda nativa (`tipoMoneda`).
 * Para las Facturas en USD y — desde 2026-08 — las Notas de Venta en USD, el
 * monto queda en dólares. Los reportes (Dashboard, Caja, Finanzas) trabajan en
 * soles, así que deben convertir el monto por el tipo de cambio antes de sumar.
 */

/** Convierte un monto a Soles usando la moneda y el tipo de cambio del comprobante. */
type NumeroLike = number | string | { toNumber(): number } | null | undefined;

function aNumero(v: NumeroLike): number {
  if (v == null) return 0;
  if (typeof v === 'object' && typeof (v as any).toNumber === 'function') {
    return (v as any).toNumber();
  }
  return Number(v) || 0;
}

export function montoEnPen(
  monto: NumeroLike,
  tipoMoneda?: string | null,
  tipoCambio?: NumeroLike,
): number {
  const base = aNumero(monto);
  if (String(tipoMoneda || 'PEN').toUpperCase() !== 'USD') return base;
  const tc = aNumero(tipoCambio);
  // Si por algún dato antiguo no hay TC válido, se deja el monto tal cual (no
  // se infla ni se pierde); mejor no convertir que convertir con un TC falso.
  return tc > 0 ? base * tc : base;
}

/**
 * Expresión SQL equivalente a `montoEnPen`, para sumar en consultas crudas.
 * Uso: `SUM(${montoEnPenSql('mtoImpVenta')})`. Asume columnas `tipoMoneda` y
 * `tipoCambio` en la tabla consultada.
 */
export function montoEnPenSql(col = 'mtoImpVenta'): string {
  return `(${col} * CASE WHEN "tipoMoneda" = 'USD' AND COALESCE("tipoCambio", 0) > 0 THEN "tipoCambio" ELSE 1 END)`;
}

/**
 * Campos que hay que sumar para obtener la VENTA NETA de un comprobante, sin IGV.
 *
 * Existe porque el mismo error apareció en tres módulos independientes: el P&L, el
 * reporte de gestión y el dashboard sumaban `mtoImpVenta` —el total CON IGV— y lo
 * presentaban como ingreso. El IGV no es venta de la empresa: se le cobra al
 * cliente y se le entrega a SUNAT. Con los datos de la demo eso informaba
 * S/ 135.342,69 donde el ingreso real era S/ 114.697,21, y en el dashboard una
 * ganancia de S/ 18.666 donde había una pérdida de S/ 1.979.
 *
 * Cada módulo lo calculaba por su cuenta, así que arreglar uno no arreglaba los
 * otros. Con esto hay un solo sitio donde está escrito qué es una venta neta.
 *
 * Uso con Prisma:
 *   const agg = await prisma.comprobante.aggregate({ where, _sum: SUMA_VENTA_NETA });
 *   const neto = leerVentaNeta(agg);
 */
export const SUMA_VENTA_NETA = {
  mtoOperGravadas: true,
  mtoOperExoneradas: true,
  mtoOperInafectas: true,
  mtoOperExportacion: true,
} as const;

/** Lee el neto de un `aggregate` hecho con `SUMA_VENTA_NETA`. */
export function leerVentaNeta(agg: {
  _sum?: {
    mtoOperGravadas?: NumeroLike;
    mtoOperExoneradas?: NumeroLike;
    mtoOperInafectas?: NumeroLike;
    mtoOperExportacion?: NumeroLike;
  } | null;
}): number {
  const s = agg?._sum ?? {};
  return (
    aNumero(s.mtoOperGravadas) +
    aNumero(s.mtoOperExoneradas) +
    aNumero(s.mtoOperInafectas) +
    aNumero(s.mtoOperExportacion)
  );
}

/** La venta neta en SQL, para los sitios que consultan en crudo. */
export function ventaNetaSql(alias = ''): string {
  const p = alias ? `${alias}.` : '';
  return `(${p}"mtoOperGravadas" + COALESCE(${p}"mtoOperExoneradas",0) + COALESCE(${p}"mtoOperInafectas",0) + COALESCE(${p}"mtoOperExportacion",0))`;
}
