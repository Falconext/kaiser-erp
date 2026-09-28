/**
 * Normaliza una fecha "solo día" a mediodía UTC para evitar el corrimiento de
 * un día al mostrarla en zonas horarias negativas (p. ej. America/Lima UTC-5).
 *
 * `new Date('2026-06-28')` => 2026-06-28T00:00:00.000Z, que en Lima se ve como
 * 27/06. Con mediodía UTC (12:00) la fecha calendario se mantiene en cualquier
 * zona de UTC-12 a UTC+12.
 */
export function parseFechaSoloDia(value: string | Date): Date {
  if (value instanceof Date) {
    return new Date(
      Date.UTC(
        value.getUTCFullYear(),
        value.getUTCMonth(),
        value.getUTCDate(),
        12,
        0,
        0,
      ),
    );
  }
  const soloFecha = String(value).slice(0, 10); // YYYY-MM-DD
  const [y, m, d] = soloFecha.split('-').map(Number);
  if (!y || !m || !d) return new Date(value); // fallback si no es ISO date
  return new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
}

/**
 * Fecha de emisión de un comprobante.
 *
 * La interfaz manda la fecha con hora y zona (`2026-09-28T14:23:11-05:00`) y
 * esa se respeta tal cual. Pero si llega solo el día (`2026-09-28`) —una
 * integración, un script, una carga masiva— `new Date()` la interpreta como
 * medianoche UTC, que en Lima es el día ANTERIOR a las 19:00. El comprobante
 * se emitía con la fecha de ayer, y así viajaba al XML de SUNAT.
 *
 * Con esto, una fecha sin hora se ancla al mediodía UTC y el día calendario se
 * mantiene en cualquier zona entre UTC-12 y UTC+12.
 */
export function parseFechaEmision(value: string | Date): Date {
  if (value instanceof Date) return value;
  const texto = String(value ?? '');
  // Si trae hora (T…) se confía en lo que venga: ahí el emisor ya decidió.
  if (texto.includes('T') || texto.includes(' ')) return new Date(texto);
  return parseFechaSoloDia(texto);
}
