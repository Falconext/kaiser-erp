import { Icon } from '@iconify/react';
import {
    Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart,
    ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';

// Paleta para el estado de stock: normal / crítico / sin stock
const STOCK_COLORS = ['#1baf7a', '#eda100', '#e0567a'];

interface StockSlice { name: string; value: number; color?: string }
interface Vendido { name: string; codigo?: string; cantidad: number; total: number }
interface Rentable { name: string; codigo?: string; ganancia: number }

interface Props {
    pieData: StockSlice[];
    topVendidos: Vendido[];
    topRentables: Rentable[];
    accent?: string;
}

const fMoney = (n: number) =>
    `S/ ${Number(n || 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fShort = (n: number) => {
    const abs = Math.abs(Number(n) || 0);
    if (abs >= 1000) return `S/ ${(Number(n) / 1000).toFixed(1)}K`;
    return `S/ ${Number(n || 0).toFixed(0)}`;
};
const truncate = (s: string, n = 16) => (s && s.length > n ? `${s.slice(0, n - 1)}…` : s);

// Tooltip oscuro/premium reutilizable
const ChartTooltip = ({ active, payload, unit }: any) => {
    if (!active || !payload?.length) return null;
    const row = payload[0]?.payload ?? {};
    return (
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white/95 dark:bg-slate-800/95 backdrop-blur px-3 py-2 shadow-lg">
            <p className="text-xs font-bold text-slate-700 dark:text-slate-100 mb-1 max-w-[220px] truncate">
                {row.name ?? ''}
            </p>
            {payload.map((p: any, i: number) => (
                <p key={i} className="text-[11px] font-semibold" style={{ color: p.color }}>
                    {p.name}:{' '}
                    {unit === 'money'
                        ? fMoney(p.value)
                        : `${Number(p.value).toLocaleString('es-PE')}${unit === 'u' ? ' u.' : ''}`}
                </p>
            ))}
        </div>
    );
};

const CardHeader = ({ icon, iconBg, iconColor, title, subtitle }: any) => (
    <div className="flex items-center gap-3 mb-4">
        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${iconBg}`}>
            <Icon icon={icon} className={`text-lg ${iconColor}`} />
        </div>
        <div className="min-w-0">
            <h3 className="font-extrabold text-slate-800 dark:text-white text-[15px] leading-tight truncate">{title}</h3>
            <p className="text-[11px] text-slate-400 font-medium">{subtitle}</p>
        </div>
    </div>
);

const EmptyState = ({ text }: { text: string }) => (
    <div className="flex flex-col items-center justify-center h-full py-10 text-center">
        <Icon icon="solar:chart-2-linear" className="text-4xl text-slate-200 dark:text-slate-700 mb-2" />
        <p className="text-sm text-slate-400">{text}</p>
    </div>
);

const CARD = 'bg-white dark:bg-[#111827] rounded-3xl p-6 shadow-[0_2px_20px_rgba(15,23,42,0.05)] border border-slate-100 dark:border-slate-800';

export default function KardexPremiumCharts({ pieData, topVendidos, topRentables, accent = '#7551FF' }: Props) {
    const totalStock = (pieData ?? []).reduce((acc, s) => acc + Number(s.value || 0), 0);
    const gridStroke = 'rgba(148,163,184,0.18)';
    const axisTick = { fontSize: 11, fill: '#94a3b8', fontWeight: 500 } as const;

    return (
        <>
            {/* Fila 1: Estado de stock (donut) + Top 10 más vendidos (barras) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">
                {/* Estado de stock */}
                <div className={CARD}>
                    <CardHeader
                        icon="solar:pie-chart-2-bold-duotone"
                        iconBg="bg-emerald-50 dark:bg-emerald-900/20"
                        iconColor="text-emerald-600 dark:text-emerald-400"
                        title="Estado del stock"
                        subtitle="Distribución del inventario"
                    />
                    {totalStock > 0 ? (
                        <>
                            <div className="relative h-52">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={pieData as any}
                                            dataKey="value"
                                            nameKey="name"
                                            innerRadius={58}
                                            outerRadius={82}
                                            paddingAngle={3}
                                            stroke="none"
                                        >
                                            {pieData.map((_, i) => (
                                                <Cell key={i} fill={STOCK_COLORS[i % STOCK_COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip content={<ChartTooltip unit="u" />} />
                                    </PieChart>
                                </ResponsiveContainer>
                                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                                    <span className="text-2xl font-extrabold text-slate-800 dark:text-white leading-none">
                                        {totalStock.toLocaleString('es-PE')}
                                    </span>
                                    <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mt-0.5">productos</span>
                                </div>
                            </div>
                            <div className="mt-3 space-y-1.5">
                                {pieData.map((s, i) => (
                                    <div key={s.name} className="flex items-center justify-between text-sm">
                                        <span className="flex items-center gap-2 min-w-0">
                                            <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: STOCK_COLORS[i % STOCK_COLORS.length] }} />
                                            <span className="truncate font-medium text-slate-600 dark:text-gray-300">{s.name}</span>
                                        </span>
                                        <span className="font-bold text-slate-700 dark:text-gray-200 shrink-0">{Number(s.value).toLocaleString('es-PE')}</span>
                                    </div>
                                ))}
                            </div>
                        </>
                    ) : (
                        <EmptyState text="Sin productos en inventario" />
                    )}
                </div>

                {/* Top 10 más vendidos */}
                <div className={`${CARD} lg:col-span-2`}>
                    <CardHeader
                        icon="solar:ranking-bold-duotone"
                        iconBg="bg-blue-50 dark:bg-blue-900/20"
                        iconColor="text-blue-600 dark:text-blue-400"
                        title="Top 10 más vendidos"
                        subtitle="Por unidades vendidas"
                    />
                    {topVendidos.length > 0 ? (
                        <div className="h-80">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={topVendidos} layout="vertical" margin={{ left: 8, right: 20, top: 4, bottom: 4 }}>
                                    <defs>
                                        <linearGradient id="kdxBarGrad" x1="0" y1="0" x2="1" y2="0">
                                            <stop offset="0%" stopColor={accent} stopOpacity={0.6} />
                                            <stop offset="100%" stopColor={accent} stopOpacity={1} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid horizontal={false} stroke={gridStroke} />
                                    <XAxis type="number" tick={axisTick} axisLine={false} tickLine={false} allowDecimals={false} />
                                    <YAxis
                                        type="category"
                                        dataKey="name"
                                        width={120}
                                        tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }}
                                        axisLine={false}
                                        tickLine={false}
                                        tickFormatter={(v: string) => truncate(v, 16)}
                                    />
                                    <Tooltip content={<ChartTooltip unit="u" />} cursor={{ fill: 'rgba(148,163,184,0.08)' }} />
                                    <Bar dataKey="cantidad" name="Unidades" fill="url(#kdxBarGrad)" radius={[0, 8, 8, 0]} barSize={16} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    ) : (
                        <div className="h-80"><EmptyState text="Aún no hay ventas registradas" /></div>
                    )}
                </div>
            </div>

            {/* Fila 2: Top 5 más rentables (línea) */}
            <div className={`${CARD} mb-6`}>
                <CardHeader
                    icon="solar:graph-up-bold-duotone"
                    iconBg="bg-violet-50 dark:bg-violet-900/20"
                    iconColor="text-violet-600 dark:text-violet-400"
                    title="Top 5 más rentables"
                    subtitle="Mayor ganancia entre los 10 más vendidos"
                />
                {topRentables.length > 0 ? (
                    <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={topRentables} margin={{ left: 8, right: 28, top: 12, bottom: 4 }}>
                                <CartesianGrid vertical={false} stroke={gridStroke} />
                                <XAxis
                                    dataKey="name"
                                    tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }}
                                    axisLine={false}
                                    tickLine={false}
                                    tickFormatter={(v: string) => truncate(v, 12)}
                                    interval={0}
                                />
                                <YAxis tick={axisTick} axisLine={false} tickLine={false} width={66} tickFormatter={fShort} />
                                <Tooltip content={<ChartTooltip unit="money" />} />
                                <Line
                                    type="monotone"
                                    dataKey="ganancia"
                                    name="Ganancia"
                                    stroke={accent}
                                    strokeWidth={3}
                                    dot={{ r: 5, fill: accent, stroke: '#fff', strokeWidth: 2 }}
                                    activeDot={{ r: 7 }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                ) : (
                    <div className="h-72"><EmptyState text="Sin datos de rentabilidad todavía" /></div>
                )}
            </div>
        </>
    );
}
