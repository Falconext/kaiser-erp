/**
 * Mono Charts — sistema de tokens premium (monocromático violeta).
 *
 * Inspirado en "mono-charts" (amicro): estética minimalista, monocromática y
 * animada. Un solo hue de acento (violeta #7551FF) con tintes/degradados; texto
 * en tinta neutra (slate); grillas y ejes recesivos. Data-driven sobre Recharts.
 */

export const ACCENT = '#7551FF'; // violeta Krezka
export const ACCENT_SOFT = '#9E8CFF';
export const ACCENT_DEEP = '#5B3EE8';

// Serie secundaria (para charts de 2 series): neutro grafito, distinguible del
// acento por leyenda + tono. Mantiene la lectura monocromática (violeta + neutro).
export const NEUTRAL = '#94A3B8'; // slate-400
export const NEUTRAL_DARK = '#64748B'; // slate-500

// Paleta ordenada (nunca cíclica). Acento primero; el resto son tintes/neutros
// para cuando hay varias series/segmentos manteniendo el look mono.
export const MONO_SERIES = [ACCENT, NEUTRAL, ACCENT_SOFT, NEUTRAL_DARK, '#C4B5FD'];

// Segmentos de dona/estado — tintes del acento (magnitud) o estado semántico.
export const MONO_SEGMENTS = ['#7551FF', '#9E8CFF', '#C4B5FD', '#E4DDFF', '#CBD5E1'];

export type ChartTheme = {
  grid: string;
  axis: string;
  tick: string;
  tooltipBg: string;
  tooltipBorder: string;
  tooltipInk: string;
  tooltipMuted: string;
  surface: string;
};

export const LIGHT_THEME: ChartTheme = {
  grid: 'rgba(148,163,184,0.16)',
  axis: 'rgba(148,163,184,0.28)',
  tick: '#94A3B8',
  tooltipBg: 'rgba(255,255,255,0.98)',
  tooltipBorder: 'rgba(226,232,240,0.9)',
  tooltipInk: '#0F172A',
  tooltipMuted: '#64748B',
  surface: '#FFFFFF',
};

export const DARK_THEME: ChartTheme = {
  grid: 'rgba(148,163,184,0.12)',
  axis: 'rgba(148,163,184,0.18)',
  tick: '#64748B',
  tooltipBg: 'rgba(17,20,31,0.96)',
  tooltipBorder: 'rgba(51,65,85,0.6)',
  tooltipInk: '#F1F5F9',
  tooltipMuted: '#94A3B8',
  surface: '#0B0E16',
};

/** Detecta modo oscuro leyendo la clase `dark` del <html> (Tailwind darkMode class). */
export function isDarkMode(): boolean {
  if (typeof document === 'undefined') return false;
  return document.documentElement.classList.contains('dark');
}

export function chartTheme(): ChartTheme {
  return isDarkMode() ? DARK_THEME : LIGHT_THEME;
}

/** Formateadores. */
export const fmtMoney = (n: number, currency = 'S/') =>
  `${currency} ${Number(n || 0).toLocaleString('es-PE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

export const fmtCompact = (n: number) => {
  const v = Number(n || 0);
  if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (Math.abs(v) >= 1_000) return `${(v / 1_000).toFixed(1)}k`;
  return `${v}`;
};

export const fmtInt = (n: number) =>
  Number(n || 0).toLocaleString('es-PE', { maximumFractionDigits: 0 });

/** Motion: variantes de entrada para las tarjetas de chart (fade + slide-up). */
export const cardMotion = {
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const },
};
