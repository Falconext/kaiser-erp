/**
 * Formateo de importes respetando la moneda del documento.
 *
 * Varias vistas tenían el símbolo "S/" en duro, así que un comprobante o una
 * compra emitidos en dólares se mostraban como soles: el dato estaba bien
 * guardado (`tipoMoneda`/`moneda`), pero en pantalla decía otra cosa.
 */

/** Acepta 'USD', 'PEN', o etiquetas del tipo "DÓLARES (US$)". */
export const esDolares = (moneda?: string | null): boolean =>
  /US\$|D[ÓO]LAR|USD/i.test(String(moneda ?? ''));

export const simboloMoneda = (moneda?: string | null): string =>
  esDolares(moneda) ? 'US$' : 'S/';

/** Ej. formatMoneda(12, 'USD') → "US$ 12.00" */
export const formatMoneda = (
  valor: number | string | null | undefined,
  moneda?: string | null,
): string =>
  `${simboloMoneda(moneda)} ${Number(valor || 0).toLocaleString('es-PE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

/**
 * Factor para llevar un importe a soles. Espejo de `factorConversionPen` en
 * `backend/src/compras/compras.service.ts`: PEN (o moneda ausente) → 1; otra
 * moneda → su tipo de cambio, y 1 si el tipo de cambio no es utilizable.
 *
 * Se usa al comparar contra precios que el backend ya devuelve en soles.
 */
export const factorConversionPen = (
  moneda?: string | null,
  tipoCambio?: number | string | null,
): number => {
  if (!esDolares(moneda)) return 1;
  const tc = Number(tipoCambio);
  return Number.isFinite(tc) && tc > 0 ? tc : 1;
};
