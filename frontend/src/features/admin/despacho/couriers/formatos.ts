/**
 * Helpers de formato del panel de couriers.
 *
 * En falconext-mype estos cuatro salían de
 * `features/admin/finanzas/productos/ProductosModel`, un módulo que Kaiser no
 * tiene (es la pantalla de productos vendidos del análisis financiero). Viven
 * aquí, junto a quien los usa, en vez de arrastrar ese módulo entero por cuatro
 * funciones de formato.
 */

export const MESES_FULL = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

export function formatSoles(value: number): string {
  return `S/ ${(value ?? 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatPct(value: number): string {
  return `${(value ?? 0).toFixed(1)}%`;
}

export function formatFecha(value?: string | null): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('es-PE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'America/Lima',
  });
}
