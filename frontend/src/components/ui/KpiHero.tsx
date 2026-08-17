import { useNavigate } from 'react-router-dom'
import { Icon } from '@iconify/react'
import { useThemeStore, SIDEBAR_COLOR_HEX } from '@/zustand/theme'

// Mini-visualización decorativa para tarjetas KPI (SVG puro, sigue el acento).
// Réplica del dashboard (pages/admin/Index.tsx) para reuso en reportes/ventas.
const KpiMini = ({ type, accent, data }: { type: 'bars' | 'line' | 'donut' | 'wave'; accent: string; data?: number[] }) => {
  const w = 60, h = 34
  if (type === 'donut') {
    const R = 14, C = 2 * Math.PI * R
    return (
      <svg viewBox="0 0 40 40" className="h-9 w-9">
        <circle cx={20} cy={20} r={R} fill="none" strokeWidth={6} className="stroke-slate-100 dark:stroke-slate-800" />
        <circle cx={20} cy={20} r={R} fill="none" strokeWidth={6} stroke={accent} strokeLinecap="round" strokeDasharray={`${C * 0.62} ${C}`} transform="rotate(-90 20 20)" />
      </svg>
    )
  }
  if (type === 'line') {
    const pts = (data && data.length > 1 ? data : [3, 5, 4, 7, 6, 9, 8])
    const max = Math.max(...pts, 1), min = Math.min(...pts, 0)
    const span = max - min || 1
    const d = pts.map((v, i) => `${(i / (pts.length - 1)) * w},${h - 4 - ((v - min) / span) * (h - 8)}`).join(' L ')
    return (
      <svg viewBox={`0 0 ${w} ${h}`} className="h-8 w-16">
        <path d={`M ${d}`} fill="none" stroke={accent} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  }
  const bars = type === 'wave' ? [8, 14, 10, 20, 12, 24, 16] : [14, 24, 18]
  const bmax = Math.max(...bars)
  const bw = w / (bars.length * 1.7)
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-8 w-16">
      {bars.map((v, i) => {
        const bh = (v / bmax) * (h - 6)
        return <rect key={i} x={i * (bw * 1.7) + 2} y={h - bh} width={bw} height={bh} rx={bw / 2} fill={accent} opacity={0.35 + 0.65 * (i / (bars.length - 1))} />
      })}
    </svg>
  )
}

const Trend = ({ trend }: { trend: number }) => {
  const pos = (trend ?? 0) >= 0
  return (
    <span className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-bold ${pos ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400' : 'bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400'}`}>
      <Icon icon={pos ? 'solar:alt-arrow-up-bold' : 'solar:alt-arrow-down-bold'} />
      {Math.abs(trend ?? 0).toFixed(1)}%
    </span>
  )
}

export interface KpiHeroCard {
  label: string
  value: string
  mini?: 'bars' | 'line' | 'donut' | 'wave'
  /** Si se define, muestra "compareLabel" + badge de tendencia. */
  trend?: number
  compareLabel?: string
  /** Texto secundario alternativo (cuando no hay trend). */
  detail?: string
  /** Ruta para el botón "Ver detalle" (opcional). */
  to?: string
  /** Datos para el mini-gráfico de línea. */
  spark?: number[]
}

const DEFAULT_MINIS = ['line', 'wave', 'donut', 'bars'] as const

// Tarjeta unificada de KPIs con el mismo diseño del dashboard.
export default function KpiHero({ cards, loading, className }: { cards: KpiHeroCard[]; loading?: boolean; className?: string }) {
  const navigate = useNavigate()
  const sidebarColor = useThemeStore((s) => s.sidebarColor)
  const accent = SIDEBAR_COLOR_HEX[sidebarColor] ?? '#7551FF'

  const lgCols = cards.length >= 4 ? 'lg:grid-cols-4' : cards.length === 3 ? 'lg:grid-cols-3' : 'lg:grid-cols-2'
  const smCols = cards.length >= 2 ? 'grid-cols-2' : 'grid-cols-1'

  return (
    <div className={`rounded-3xl bg-white dark:bg-[#111827] shadow-[0_2px_20px_rgba(15,23,42,0.05)] dark:shadow-none border border-slate-100 dark:border-slate-800 overflow-hidden ${className ?? ''}`}>
      <div className={`grid ${smCols} ${lgCols}`}>
        {cards.map((c, idx) => (
          <div
            key={c.label}
            className={`flex flex-col border-slate-100 dark:border-slate-800 lg:border-t-0 ${idx % 2 === 1 ? 'border-l' : ''} ${idx >= 2 ? 'border-t' : ''} ${idx > 0 ? 'lg:border-l' : ''}`}
          >
            <div className="p-5 flex-1">
              <div className="flex items-center gap-1.5 text-slate-400 dark:text-gray-400">
                <span className="text-[11px] font-black uppercase tracking-wide">{c.label}</span>
              </div>
              <div className="mt-2.5 flex items-start justify-between gap-2">
                <div className="min-w-0">
                  {loading ? (
                    <div className="h-8 w-24 rounded-lg bg-slate-100 dark:bg-slate-800 animate-pulse" />
                  ) : (
                    <p className="text-2xl font-extrabold text-slate-800 dark:text-white truncate">{c.value}</p>
                  )}
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    {typeof c.trend === 'number' ? (
                      <>
                        <span className="text-xs text-slate-400 dark:text-gray-400">{c.compareLabel ?? 'vs período anterior'}</span>
                        {!loading && <Trend trend={c.trend} />}
                      </>
                    ) : c.detail ? (
                      <span className="text-xs text-slate-400 dark:text-gray-400">{c.detail}</span>
                    ) : null}
                  </div>
                </div>
                <div className="shrink-0 pt-0.5">
                  <KpiMini type={c.mini ?? DEFAULT_MINIS[idx % 4]} accent={accent} data={c.spark} />
                </div>
              </div>
            </div>
            {c.to && (
              <button
                onClick={() => navigate(c.to!)}
                className="group w-full flex items-center justify-center gap-1.5 border-t border-slate-100 dark:border-slate-800 py-3 text-[13px] font-bold text-slate-600 dark:text-gray-300 hover:text-[var(--accent)] transition-colors"
              >
                Ver detalle <Icon icon="solar:arrow-right-linear" className="transition-transform group-hover:translate-x-0.5" />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
