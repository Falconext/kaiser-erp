/**
 * WhatsApp de la tienda virtual.
 *
 * El número de destino SIEMPRE es el del dueño de la empresa
 * (`empresa.whatsappTienda`, expuesto en el payload público de la tienda y en
 * `configPago.whatsappTienda`). No se debe forzar ningún número de la plataforma.
 *
 * Si la tienda no tiene número configurado, los helpers devuelven `null` y el
 * consumidor debe ocultar el botón/enlace de WhatsApp.
 */

/**
 * Normaliza un número peruano al formato wa.me (`51XXXXXXXXX`).
 * Devuelve `null` si el valor no es utilizable.
 */
export const normalizeStoreWhatsapp = (raw?: string | null): string | null => {
  const digits = String(raw ?? '').replace(/\D/g, '');
  if (!digits) return null;
  // Ya incluye código de país (51 + 9 dígitos)
  if (digits.startsWith('51') && digits.length >= 11) return digits;
  // Móvil local de 9 dígitos
  if (digits.length === 9) return `51${digits}`;
  // Otros formatos plausibles: anteponer 51 si falta
  if (digits.length >= 9) return digits.startsWith('51') ? digits : `51${digits}`;
  return null;
};

/**
 * Construye la URL wa.me al WhatsApp de la tienda.
 * @param rawNumber número del dueño (p. ej. `tienda.whatsappTienda` / `configPago.whatsappTienda`)
 * @param message  texto opcional prellenado
 * @returns URL wa.me, o `null` si la tienda no tiene número configurado.
 */
export const buildStorePurchaseWhatsappUrl = (
  rawNumber?: string | null,
  message?: string,
): string | null => {
  const number = normalizeStoreWhatsapp(rawNumber);
  if (!number) return null;
  const text = String(message ?? '').trim();
  return `https://wa.me/${number}${text ? `?text=${encodeURIComponent(text)}` : ''}`;
};

/**
 * Normaliza (sin sobrescribir) el número real de WhatsApp de la tienda y lo
 * refleja en `diseno.whatsappTienda` para los consumidores que lo lean de ahí.
 * Si no hay número configurado, queda `null` y el botón se oculta.
 */
export const withStorePurchaseWhatsapp = <T extends Record<string, any> | null | undefined>(tienda: T): T => {
  if (!tienda) return tienda;
  const number = normalizeStoreWhatsapp(
    (tienda as any).whatsappTienda ?? (tienda as any).diseno?.whatsappTienda,
  );
  return {
    ...tienda,
    whatsappTienda: number,
    diseno: {
      ...(tienda as any).diseno,
      whatsappTienda: number,
    },
  } as T;
};
