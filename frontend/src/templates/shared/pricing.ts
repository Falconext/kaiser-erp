/**
 * Lógica de precios de oferta para las tiendas virtuales.
 *
 * Fuente única de verdad para:
 *  - decidir si un producto está en oferta (vigencia por fecha),
 *  - calcular el precio a cobrar (precioFinal),
 *  - exponer el precio "antes" (precioRegular) para mostrarlo tachado.
 *
 * Se usa tanto en las cards (display) como al normalizar los productos
 * recién traídos del backend, de modo que el carrito/checkout cobren
 * automáticamente el precio de oferta.
 */

export interface ProductPricing {
  /** Hay una oferta vigente y menor al precio regular. */
  enOferta: boolean;
  /** Precio original (lo que vale normalmente) — se muestra tachado. */
  precioRegular: number;
  /** Precio a cobrar (oferta si está vigente, si no el regular). */
  precioFinal: number;
  /** % de descuento redondeado (0 si no hay oferta). */
  porcentajeDescuento: number;
}

/** Parsea fechas `YYYY-MM-DD` como hora local (evita corrimiento por UTC). */
function parseOfertaDate(value: unknown, endOfDay = false): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  const raw = String(value);
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const [year, month, day] = raw.split('-').map(Number);
    return new Date(year, month - 1, day, endOfDay ? 23 : 0, endOfDay ? 59 : 0, endOfDay ? 59 : 0, endOfDay ? 999 : 0);
  }
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Indica si la oferta está vigente según el rango de fechas (ambas opcionales). */
export function ofertaVigente(producto: any, now: Date = new Date()): boolean {
  const inicio = parseOfertaDate(producto?.fechaInicioOferta);
  const fin = parseOfertaDate(producto?.fechaFinOferta, true);
  if (inicio && inicio > now) return false;
  if (fin && fin < now) return false;
  return true;
}

/**
 * Calcula el estado de precios de un producto.
 * Idempotente: usa `precioRegular` si ya fue normalizado, si no `precioUnitario`.
 */
export function getProductPricing(producto: any, now: Date = new Date()): ProductPricing {
  const precioRegular = Number(producto?.precioRegular ?? producto?.precioOriginal ?? producto?.precio ?? producto?.precioUnitario ?? 0);
  const precioUnitario = Number(producto?.precioUnitario ?? 0);
  const oferta = producto?.precioOferta != null
    ? Number(producto.precioOferta)
    : producto?.enOferta && precioUnitario > 0 && precioUnitario < precioRegular
      ? precioUnitario
      : null;

  const enOferta =
    oferta != null &&
    oferta > 0 &&
    oferta < precioRegular &&
    ofertaVigente(producto, now);

  const precioFinal = enOferta ? oferta! : precioRegular;
  const porcentajeDescuento =
    enOferta && precioRegular > 0 ? Math.round((1 - precioFinal / precioRegular) * 100) : 0;

  return { enOferta, precioRegular, precioFinal, porcentajeDescuento };
}

/**
 * Normaliza un producto a una convención única para toda la tienda:
 *  - `precioUnitario`  → precio a COBRAR (oferta vigente o regular). El carrito
 *                        y el checkout lo usan tal cual, así pagan la oferta.
 *  - `precioRegular`   → precio original (para mostrarlo tachado).
 *  - `precioOriginal`  → alias de `precioRegular` (compat con cards que lo leen).
 *  - `precioOferta`    → la oferta solo si está vigente (si no, null, para que
 *                        las cards que lo leen sin validar fecha no muestren
 *                        ofertas vencidas).
 *  - `enOferta` / `descuentoOferta` → banderas de conveniencia.
 * Idempotente.
 */
export function withPricing<T extends Record<string, any>>(producto: T): T {
  if (!producto) return producto;
  const { enOferta, precioRegular, precioFinal, porcentajeDescuento } = getProductPricing(producto);
  return {
    ...producto,
    precioRegular,
    precioOriginal: enOferta ? precioRegular : (producto.precioOriginal ?? null),
    precioOferta: enOferta ? precioFinal : null,
    precioUnitario: precioFinal,
    enOferta,
    descuentoOferta: porcentajeDescuento,
  };
}

/** Aplica `withPricing` a una lista (tolera no-arrays). */
export function withPricingList<T extends Record<string, any>>(productos: T[]): T[] {
  return Array.isArray(productos) ? productos.map(withPricing) : productos;
}
