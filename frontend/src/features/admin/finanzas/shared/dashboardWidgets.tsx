// Widgets de visualización compartidos — mismo lenguaje visual que el Dashboard
// principal (pages/admin/Index.tsx). Reutilizados por los tabs de Finanzas.
const polar = (cx: number, cy: number, r: number, deg: number) => {
    const rad = (deg * Math.PI) / 180;
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
};
const arc = (cx: number, cy: number, r: number, a0: number, a1: number) => {
    const s = polar(cx, cy, r, a0);
    const e = polar(cx, cy, r, a1);
    const large = Math.abs(a1 - a0) > 180 ? 1 : 0;
    return `M ${s.x} ${s.y} A ${r} ${r} 0 ${large} 1 ${e.x} ${e.y}`;
};

// Medidor semicircular con marcas tipo regla. `value`/`max` en 0..100.
export const RadialGauge = ({ value, max = 100, accent }: { value: number; max?: number; accent: string }) => {
    const frac = Math.max(0, Math.min(1, (value ?? 0) / (max || 100)));
    const cx = 100, cy = 100, r = 82;
    const ticks = 44;
    return (
        <svg viewBox="0 0 200 108" className="w-full h-full">
            <path d={arc(cx, cy, r, 180, 360)} fill="none" className="stroke-slate-100 dark:stroke-slate-800" strokeWidth={12} strokeLinecap="round" />
            <path d={arc(cx, cy, r, 180, 180 + 180 * frac)} fill="none" stroke={accent} strokeWidth={12} strokeLinecap="round" />
            {Array.from({ length: ticks + 1 }).map((_, i) => {
                const a = 180 + (180 * i) / ticks;
                const on = i / ticks <= frac;
                const p1 = polar(cx, cy, r - 15, a);
                const p2 = polar(cx, cy, r - 22, a);
                return <line key={i} x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} strokeWidth={1.5} strokeLinecap="round" stroke={on ? accent : 'currentColor'} className={on ? '' : 'text-slate-200 dark:text-slate-700'} strokeOpacity={on ? 0.55 : 1} />;
            })}
        </svg>
    );
};

// Mini-visualización decorativa para tarjetas KPI (SVG puro, sigue el acento).
export const KpiMini = ({ type, accent, data }: { type: 'bars' | 'line' | 'donut' | 'wave'; accent: string; data?: number[] }) => {
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
        const pts = (data && data.length > 1 ? data : [3, 5, 4, 7, 6, 9, 8]);
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

// Tooltip oscuro estilo dashboard para gráficos recharts. Itera sobre las
// series del payload (soporta 1..N series). `labelFmt` formatea el título.
export const DarkTooltip =
    (fmt: (v: number) => string, labelFmt?: (l: any) => string) =>
    ({ active, payload, label }: any) => {
        if (!active || !payload?.length) return null;
        return (
            <div className="rounded-xl bg-slate-900 text-white px-3.5 py-2.5 shadow-xl">
                <p className="text-[11px] font-semibold text-slate-300 mb-1">{labelFmt ? labelFmt(label) : String(label ?? '')}</p>
                <div className="space-y-1">
                    {payload.map((p: any, i: number) => (
                        <div key={i} className="flex items-center justify-between gap-6">
                            <span className="flex items-center gap-1.5 text-xs text-slate-400">
                                <span className="h-2 w-2 rounded-full" style={{ background: p.color || p.fill || '#94a3b8' }} />
                                {p.name}
                            </span>
                            <span className="text-sm font-bold">{fmt(p.value)}</span>
                        </div>
                    ))}
                </div>
            </div>
        );
    };
