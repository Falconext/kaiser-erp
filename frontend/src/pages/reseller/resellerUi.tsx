import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '@iconify/react';
import moment from 'moment';
import { useThemeStore, SIDEBAR_COLOR_HEX } from '@/zustand/theme';

// ── UI compartida del panel reseller ──────────────────────────────────────────
// Replica el estilo del dashboard del negocio (src/pages/admin/Index.tsx) para que
// todas las páginas del panel compartan el mismo header y la tarjeta KPI unificada.

/** Acento en hex (para SVG), reactivo al color del tema — igual que el dashboard. */
export function useAccent() {
    const sidebarColor = useThemeStore((s) => s.sidebarColor);
    return SIDEBAR_COLOR_HEX[sidebarColor] ?? '#7551FF';
}

/** Mini-visualización decorativa para tarjetas KPI (SVG puro, sigue el acento). */
export const KpiMini = ({ type, accent }: { type: 'bars' | 'line' | 'donut' | 'wave'; accent: string }) => {
    const w = 60, h = 34;
    if (type === 'donut') {
        const R = 14, C = 2 * Math.PI * R;
        return (
            <svg viewBox="0 0 40 40" className="h-9 w-9">
                <circle cx={20} cy={20} r={R} fill="none" strokeWidth={6} className="stroke-slate-100 dark:stroke-slate-800" />
                <circle cx={20} cy={20} r={R} fill="none" strokeWidth={6} stroke={accent} strokeLinecap="round" strokeDasharray={`${C * 0.62} ${C}`} transform="rotate(-90 20 20)" />
            </svg>
        );
    }
    if (type === 'line') {
        const pts = [3, 5, 4, 7, 6, 9, 8];
        const max = Math.max(...pts, 1), min = Math.min(...pts, 0);
        const span = max - min || 1;
        const d = pts.map((v, i) => `${(i / (pts.length - 1)) * w},${h - 4 - ((v - min) / span) * (h - 8)}`).join(' L ');
        return (
            <svg viewBox={`0 0 ${w} ${h}`} className="h-8 w-16">
                <path d={`M ${d}`} fill="none" stroke={accent} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
            </svg>
        );
    }
    const bars = type === 'wave' ? [8, 14, 10, 20, 12, 24, 16] : [14, 24, 18];
    const bmax = Math.max(...bars);
    const bw = w / (bars.length * 1.7);
    return (
        <svg viewBox={`0 0 ${w} ${h}`} className="h-8 w-16">
            {bars.map((v, i) => {
                const bh = (v / bmax) * (h - 6);
                return <rect key={i} x={i * (bw * 1.7) + 2} y={h - bh} width={bw} height={bh} rx={bw / 2} fill={accent} opacity={0.35 + 0.65 * (i / (bars.length - 1))} />;
            })}
        </svg>
    );
};

/** Encabezado estándar: título + pill "En vivo" + fecha, con acciones a la derecha. */
export function PageHead({ title, subtitle, live = true, children }: { title: ReactNode; subtitle?: ReactNode; live?: boolean; children?: ReactNode }) {
    const accent = useAccent();
    return (
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="min-w-0">
                <div className="flex items-center gap-2.5">
                    <h1 className="text-[22px] font-extrabold text-slate-800 dark:text-white tracking-tight truncate">{title}</h1>
                    {live && <span className="text-[11px] font-bold px-2.5 py-1 rounded-full text-white shrink-0" style={{ background: accent }}>En vivo</span>}
                </div>
                {subtitle && (
                    <p className="text-sm text-slate-400 dark:text-gray-400 mt-0.5">
                        {subtitle} · <span className="capitalize">{moment().format('dddd, D [de] MMMM')}</span>
                    </p>
                )}
            </div>
            {children && <div className="flex items-center gap-2.5 shrink-0">{children}</div>}
        </div>
    );
}

export type KpiHeroItem = {
    label: string;
    value: string;
    sub?: string;
    mini: 'line' | 'wave' | 'donut' | 'bars';
    /** Muestra un pie "Ver detalle →" que navega a esta ruta. */
    to?: string;
    /** Hace clickeable toda la celda (para filtros); muestra anillo si `active`. */
    onClick?: () => void;
    active?: boolean;
    warn?: boolean;
};

/** Tarjeta KPI unificada con columnas divididas — idéntica a la del dashboard. */
export function KpiHero({ items }: { items: KpiHeroItem[] }) {
    const navigate = useNavigate();
    const accent = useAccent();
    const lgCols = items.length === 5 ? 'lg:grid-cols-5' : items.length === 3 ? 'lg:grid-cols-3' : 'lg:grid-cols-4';
    return (
        <div className="rounded-3xl border border-slate-100 dark:border-slate-800 overflow-hidden shadow-[0_2px_20px_rgba(15,23,42,0.05)] dark:shadow-none">
            <div className={`grid grid-cols-2 ${lgCols} gap-px bg-slate-100 dark:bg-slate-800`}>
                {items.map((c) => {
                    const clickable = !!c.onClick;
                    const Wrapper: any = clickable ? 'button' : 'div';
                    return (
                        <Wrapper
                            key={c.label}
                            onClick={c.onClick}
                            className={`group relative text-left flex flex-col transition-colors ${c.active ? 'bg-slate-50 dark:bg-slate-800/50' : 'bg-white dark:bg-[#111827]'} ${clickable && !c.active ? 'hover:bg-slate-50/60 dark:hover:bg-slate-800/40' : ''}`}
                        >
                            {c.active && <span className="absolute inset-x-0 top-0 h-[3px]" style={{ background: accent }} />}
                            <div className="p-5 flex-1">
                                <div className={`flex items-center gap-1.5 ${c.active ? '' : 'text-slate-400 dark:text-gray-400'}`} style={c.active ? { color: accent } : undefined}>
                                    <span className="text-[11px] font-black uppercase tracking-wide">{c.label}</span>
                                    <Icon icon="solar:info-circle-linear" className="text-[13px]" />
                                </div>
                                <div className="mt-2.5 flex items-start justify-between gap-2">
                                    <div className="min-w-0">
                                        <p className={`text-2xl font-extrabold truncate ${c.warn ? 'text-rose-600 dark:text-rose-400' : 'text-slate-800 dark:text-white'}`}>{c.value}</p>
                                        {c.sub && <p className="mt-1.5 text-xs text-slate-400 dark:text-gray-400 truncate">{c.sub}</p>}
                                    </div>
                                    <div className="shrink-0 pt-0.5">
                                        <KpiMini type={c.mini} accent={c.warn ? '#f43f5e' : accent} />
                                    </div>
                                </div>
                            </div>
                            {c.to && (
                                <button onClick={() => navigate(c.to!)} className="group w-full flex items-center justify-center gap-1.5 border-t border-slate-100 dark:border-slate-800 py-3 text-[13px] font-bold text-slate-600 dark:text-gray-300 hover:text-[var(--accent)] transition-colors">
                                    Ver detalle <Icon icon="solar:arrow-right-linear" className="transition-transform group-hover:translate-x-0.5" />
                                </button>
                            )}
                        </Wrapper>
                    );
                })}
            </div>
        </div>
    );
}
