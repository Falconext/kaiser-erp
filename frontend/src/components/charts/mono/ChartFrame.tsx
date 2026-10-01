import { motion } from 'framer-motion';
import { ReactNode } from 'react';
import { cardMotion } from './tokens';

type LegendItem = { label: string; color: string };

type ChartFrameProps = {
  title?: ReactNode;
  subtitle?: ReactNode;
  /** Valor "hero" opcional (arriba a la derecha o bajo el título). */
  value?: ReactNode;
  /** Badge de variación (ej. "+12.5%"). */
  delta?: { text: string; positive?: boolean } | null;
  legend?: LegendItem[];
  right?: ReactNode;
  children: ReactNode;
  className?: string;
  /** Índice para escalonar la animación de entrada. */
  index?: number;
  padded?: boolean;
};

/**
 * Tarjeta premium que envuelve cada chart: borde sutil, sombra suave, header con
 * título/valor/leyenda y animación de entrada (fade + slide-up). Tema claro/oscuro.
 */
export default function ChartFrame({
  title,
  subtitle,
  value,
  delta,
  legend,
  right,
  children,
  className = '',
  index = 0,
  padded = true,
}: ChartFrameProps) {
  return (
    <motion.div
      initial={cardMotion.initial}
      animate={cardMotion.animate}
      transition={{ ...cardMotion.transition, delay: index * 0.06 }}
      className={
        'group relative overflow-hidden rounded-2xl border border-slate-200/70 bg-white ' +
        'shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-12px_rgba(15,23,42,0.12)] ' +
        'dark:border-white/5 dark:bg-[#0E1119] dark:shadow-[0_1px_2px_rgba(0,0,0,0.4),0_12px_32px_-16px_rgba(0,0,0,0.6)] ' +
        'transition-shadow duration-300 hover:shadow-[0_1px_2px_rgba(15,23,42,0.05),0_16px_40px_-16px_rgba(117,81,255,0.22)] ' +
        (padded ? 'p-5 ' : '') +
        className
      }
    >
      {/* halo sutil violeta en la esquina */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full opacity-[0.06] blur-2xl"
        style={{ background: 'radial-gradient(circle, #7551FF 0%, transparent 70%)' }}
      />
      {(title || value || right || legend) && (
        <div className={'relative flex items-start justify-between gap-3 ' + (padded ? 'mb-4' : 'p-5 pb-3')}>
          <div className="min-w-0">
            {title && (
              <h3 className="truncate text-[13px] font-bold tracking-tight text-slate-800 dark:text-slate-100">
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="mt-0.5 truncate text-[11px] font-medium text-slate-400 dark:text-slate-500">
                {subtitle}
              </p>
            )}
            {(value || delta) && (
              <div className="mt-2 flex items-baseline gap-2">
                {value && (
                  <span className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                    {value}
                  </span>
                )}
                {delta && (
                  <span
                    className={
                      'rounded-full px-1.5 py-0.5 text-[10px] font-bold ' +
                      (delta.positive
                        ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400'
                        : 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400')
                    }
                  >
                    {delta.text}
                  </span>
                )}
              </div>
            )}
          </div>
          <div className="flex shrink-0 flex-col items-end gap-2">
            {right}
            {legend && legend.length > 0 && (
              <div className="flex flex-wrap items-center justify-end gap-x-3 gap-y-1">
                {legend.map((l) => (
                  <span key={l.label} className="flex items-center gap-1.5">
                    <span
                      className="inline-block h-2 w-2 rounded-full"
                      style={{ backgroundColor: l.color }}
                    />
                    <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                      {l.label}
                    </span>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
      <div className="relative">{children}</div>
    </motion.div>
  );
}
