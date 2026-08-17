/**
 * pastedSpecs — Parsea el texto "pegado" de Especificaciones/Destacados que el
 * comerciante ingresa en el admin (guardado en atributosTecnicos.__*Texto).
 * Cada línea se interpreta como "Etiqueta: Valor". Líneas sin separador se
 * muestran como valor a ancho completo (label vacío).
 */
export interface PastedPair {
  label: string;
  value: string;
}

export function parsePastedPairs(text?: string | null): PastedPair[] {
  if (!text || typeof text !== 'string') return [];
  const out: PastedPair[] = [];
  for (const line of text.split(/\r?\n/)) {
    // Quita viñetas iniciales comunes al pegar (-, •, *, ·).
    const raw = line.replace(/^\s*[-•*·]\s*/, '').trim();
    if (!raw) continue;
    const m = raw.match(/^(.*?)\s*[:\t]\s*(.+)$/);
    if (m && m[1].trim()) out.push({ label: m[1].trim(), value: m[2].trim() });
    else out.push({ label: '', value: raw });
  }
  return out;
}
