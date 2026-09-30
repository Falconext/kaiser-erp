/**
 * Formatos de impresión de comprobantes.
 *
 * Kaiser cotiza a empresas industriales, así que el formato natural es A4 —a
 * diferencia de un negocio de mostrador, donde manda el ticket de 80mm—. Aun así
 * los tres existen: A5 se usa para guías y el ticket para caja.
 */
export type FormatoImpresion = 'TICKET' | 'A4' | 'A5';

export const FORMATOS_IMPRESION: FormatoImpresion[] = ['A4', 'A5', 'TICKET'];

/** Metadatos de cada formato, para pintar los selectores sin repetirlos. */
export const FORMATOS_IMPRESION_INFO: Array<{
  value: FormatoImpresion;
  label: string;
  sub: string;
  icon: string;
}> = [
  { value: 'A4', label: 'A4', sub: '210×297mm', icon: 'solar:document-bold-duotone' },
  { value: 'A5', label: 'A5', sub: '148×210mm', icon: 'solar:file-bold-duotone' },
  { value: 'TICKET', label: 'Ticket', sub: '80mm', icon: 'solar:receipt-bold-duotone' },
];

/** Ancho real del papel en px a 96dpi, y cuánto encoger para que quepa en el panel. */
export const PREVIEW_DIMS: Record<FormatoImpresion, { width: number; scale: number }> = {
  A4: { width: 794, scale: 0.62 },
  A5: { width: 559, scale: 0.85 },
  TICKET: { width: 302, scale: 1 },
};

/** Milímetros de cada formato, para la ventana de impresión. */
export const MM_POR_FORMATO: Record<FormatoImpresion, { width: number; height: number }> = {
  A4: { width: 210, height: 297 },
  A5: { width: 148, height: 210 },
  TICKET: { width: 80, height: 330 },
};

export const esFormatoImpresion = (v: unknown): v is FormatoImpresion =>
  v === 'A4' || v === 'A5' || v === 'TICKET';
