import { Icon } from '@iconify/react';
import {
    Bar,
    BarChart,
    Cell,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
} from 'recharts';
import {
    CategoriaRentabilidad,
    CategoriasResponse,
    formatSoles,
    formatPct,
    catColor,
    CAT_COLORS,
} from './CategoriasModel';
import { useCategoriasViewModel } from './useCategoriasViewModel';
import { KpiMini, DarkTooltip } from '../shared/dashboardWidgets';
import { useThemeStore, SIDEBAR_COLOR_HEX } from '@/zustand/theme';

// Estilo de tarjeta unificado (mismo lenguaje visual del Dashboard principal)
const CARD =
    'rounded-3xl bg-white dark:bg-[#111827] shadow-[0_2px_20px_rgba(15,23,42,0.05)] dark:shadow-none border border-slate-100 dark:border-slate-800';

// Formato compacto para el centro del donut (evita overflow)
function formatSolesShort(v: number): string {
    if (Math.abs(v) >= 1_000_000) return `S/ ${(v / 1_000_000).toFixed(1)}M`;
    if (Math.abs(v) >= 1_000) return `S/ ${(v / 1_000).toFixed(1)}k`;
    return `S/ ${v.toFixed(0)}`;
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton() {
    return (
        <div className="space-y-4">
            <div className="h-32 bg-slate-100 dark:bg-slate-800 animate-pulse rounded-3xl" />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="h-80 bg-slate-100 dark:bg-slate-800 animate-pulse rounded-3xl" />
                <div className="h-80 bg-slate-100 dark:bg-slate-800 animate-pulse rounded-3xl lg:col-span-2" />
            </div>
            {[...Array(3)].map((_, i) => (
                <div key={i} className="h-16 bg-slate-100 dark:bg-slate-800 animate-pulse rounded-2xl" />
            ))}
        </div>
    );
}

// ─── Margin Badge ─────────────────────────────────────────────────────────────

function MarginBadge({ value }: { value: number }) {
    const good = value >= 30;
    const mid = value >= 10;
    const cls = good
        ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400'
        : mid
            ? 'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400'
            : 'bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400';
    const dot = good ? 'bg-emerald-500' : mid ? 'bg-amber-500' : 'bg-rose-500';
    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${cls}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
            {formatPct(value)}
        </span>
    );
}

// ─── KPI Row (tarjeta unificada estilo Dashboard) ──────────────────────────────

function KpiRow({ data }: { data: CategoriasResponse }) {
    const sidebarColor = useThemeStore((s) => s.sidebarColor);
    const ACCENT = SIDEBAR_COLOR_HEX[sidebarColor] ?? '#7551FF';

    const kpis: {
        label: string; value: string; sub: string; mini: 'line' | 'wave' | 'donut' | 'bars';
    }[] = [
        { label: 'Ingresos totales', value: formatSoles(data.ingresoTotal), sub: 'ventas del período', mini: 'line' },
        { label: 'Ganancia total', value: formatSoles(data.gananciaTotal), sub: `margen ${formatPct(data.margenPromedio)}`, mini: 'donut' },
        { label: 'Categorías activas', value: String(data.totalCategorias), sub: 'con ventas este mes', mini: 'bars' },
        { label: 'Mejor categoría', value: data.mejorCategoria ?? '—', sub: 'mayor ganancia', mini: 'wave' },
    ];

    return (
        <div className={`${CARD} overflow-hidden`}>
            <div className="grid grid-cols-2 lg:grid-cols-4">
                {kpis.map((c, idx) => (
                    <div
                        key={c.label}
                        className={`p-5 border-slate-100 dark:border-slate-800 ${idx % 2 === 1 ? 'border-l' : ''} ${idx >= 2 ? 'border-t' : ''} ${idx > 0 ? 'lg:border-l lg:border-t-0' : ''}`}
                    >
                        <div className="flex items-center gap-1.5 text-slate-400 dark:text-gray-400">
                            <span className="text-[11px] font-black uppercase tracking-wide">{c.label}</span>
                        </div>
                        <div className="mt-2.5 flex items-start justify-between gap-2">
                            <div className="min-w-0">
                                <p className="text-2xl font-extrabold text-slate-800 dark:text-white truncate">{c.value}</p>
                                <p className="mt-1.5 text-xs text-slate-400 dark:text-gray-400">{c.sub}</p>
                            </div>
                            <div className="shrink-0 pt-0.5">
                                <KpiMini type={c.mini} accent={ACCENT} />
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ─── Donut: ganancia por categoría + leyenda ───────────────────────────────────

function GananciaDonut({ data }: { data: CategoriasResponse }) {
    const cats = data.categorias;
    const donutData = cats.map((c, i) => ({
        name: c.nombre,
        value: Math.max(0, c.gananciaTotal),
        color: catColor(i),
    }));
    const totalGanancia = cats.reduce((a, c) => a + Math.max(0, c.gananciaTotal), 0);

    return (
        <div className={`${CARD} p-5`}>
            <div className="flex items-center gap-1.5">
                <h3 className="text-sm font-extrabold text-slate-800 dark:text-white">Ganancia por categoría</h3>
                <Icon icon="solar:info-circle-linear" className="text-[13px] text-slate-400" />
            </div>
            <p className="mb-2 text-xs text-slate-400 dark:text-gray-400">Reparto de la utilidad del período</p>
            <div className="relative mx-auto h-36 w-36">
                {totalGanancia > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie data={donutData} dataKey="value" nameKey="name" innerRadius={48} outerRadius={68} paddingAngle={2} stroke="none">
                                {donutData.map((d, i) => <Cell key={i} fill={d.color} />)}
                            </Pie>
                            <Tooltip formatter={(v: any, n: any) => [formatSoles(Number(v)), n]} contentStyle={{ fontSize: 12, borderRadius: 8, borderColor: '#e5e7eb' }} />
                        </PieChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="flex h-full items-center justify-center text-center text-sm text-slate-300 dark:text-slate-600">Sin datos</div>
                )}
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-base font-extrabold text-slate-800 dark:text-white">{formatSolesShort(totalGanancia)}</span>
                    <span className="text-[10px] font-medium text-slate-400 dark:text-gray-400">ganancia</span>
                </div>
            </div>
            <div className="mt-4 space-y-2 max-h-52 overflow-y-auto pr-1">
                {cats.map((c, i) => {
                    const pct = totalGanancia > 0 ? (Math.max(0, c.gananciaTotal) / totalGanancia) * 100 : 0;
                    return (
                        <div key={c.nombre} className="flex items-center justify-between gap-2 text-sm">
                            <span className="flex min-w-0 items-center gap-2">
                                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: catColor(i) }} />
                                <span className="truncate font-medium text-slate-600 dark:text-gray-300">{c.nombre}</span>
                            </span>
                            <span className="shrink-0 font-bold text-slate-500 dark:text-gray-400">{pct.toFixed(0)}%</span>
                        </div>
                    );
                })}
                {cats.length === 0 && <p className="text-center text-xs text-slate-400 dark:text-gray-400 py-2">Sin categorías</p>}
            </div>
        </div>
    );
}

// ─── Bar chart: ingresos vs ganancia (recharts + DarkTooltip) ──────────────────

function GananciasChart({ data }: { data: CategoriasResponse }) {
    const sidebarColor = useThemeStore((s) => s.sidebarColor);
    const ACCENT = SIDEBAR_COLOR_HEX[sidebarColor] ?? '#7551FF';
    const GAIN = '#1baf7a';

    const chartData = data.categorias.slice(0, 10).map((c) => ({
        name: c.nombre.length > 16 ? c.nombre.slice(0, 14) + '…' : c.nombre,
        Ingresos: c.ingresoTotal,
        Ganancia: c.gananciaTotal,
    }));

    return (
        <div className={`${CARD} p-5 lg:col-span-2`}>
            <div className="mb-4 flex items-start justify-between gap-2">
                <div>
                    <div className="flex items-center gap-1.5">
                        <h3 className="text-sm font-extrabold text-slate-800 dark:text-white">Ingresos vs ganancia por categoría</h3>
                        <Icon icon="solar:info-circle-linear" className="text-[13px] text-slate-400" />
                    </div>
                    <p className="mt-0.5 text-xs text-slate-400 dark:text-gray-400">Top {chartData.length} categorías del período</p>
                </div>
                <div className="flex gap-2">
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-gray-400 bg-slate-50 dark:bg-slate-800 px-2.5 py-1 rounded-full">
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: ACCENT }} /> Ingresos
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-gray-400 bg-slate-50 dark:bg-slate-800 px-2.5 py-1 rounded-full">
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: GAIN }} /> Ganancia
                    </span>
                </div>
            </div>
            <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 8, right: 4, left: -12, bottom: 0 }} barCategoryGap="24%">
                        <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} interval={0} angle={-18} textAnchor="end" height={48} />
                        <Tooltip cursor={{ fill: 'transparent' }} content={DarkTooltip(formatSoles, (l) => String(l ?? ''))} />
                        <Bar dataKey="Ingresos" name="Ingresos" fill={ACCENT} radius={[999, 999, 999, 999]} maxBarSize={18} />
                        <Bar dataKey="Ganancia" name="Ganancia" fill={GAIN} radius={[999, 999, 999, 999]} maxBarSize={18} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}

// ─── Category Row ─────────────────────────────────────────────────────────────

function CategoriaRow({
    cat, idx, isExpanded, totalGanancia, onToggle,
}: {
    cat: CategoriaRentabilidad;
    idx: number;
    isExpanded: boolean;
    totalGanancia: number;
    onToggle: () => void;
}) {
    const color = catColor(idx);
    const pct = totalGanancia > 0 ? (cat.gananciaTotal / totalGanancia) * 100 : 0;

    return (
        <div className={`${CARD} overflow-hidden`}>
            {/* Header row */}
            <button
                onClick={onToggle}
                className="w-full flex items-center gap-4 px-5 py-4 hover:bg-slate-50/60 dark:hover:bg-slate-800 transition-colors text-left"
            >
                {/* Color dot */}
                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />

                {/* Category name */}
                <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-800 dark:text-white text-sm truncate">{cat.nombre}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{cat.cantidadProductos} producto{cat.cantidadProductos !== 1 ? 's' : ''} · {Math.round(cat.unidadesVendidas)} uds</p>
                </div>

                {/* Share bar */}
                <div className="hidden md:flex flex-col items-end w-32">
                    <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">{formatPct(pct)} del total</p>
                </div>

                {/* Margen */}
                <div className="hidden md:block text-center w-20">
                    <MarginBadge value={cat.margenPromedio} />
                    <p className="text-[10px] text-slate-400 mt-1">margen</p>
                </div>

                {/* Ingreso */}
                <div className="text-right w-28 hidden md:block">
                    <p className="text-xs text-slate-400">Ingresos</p>
                    <p className="font-bold text-sm text-slate-700 dark:text-gray-200">{formatSoles(cat.ingresoTotal)}</p>
                </div>

                {/* Ganancia */}
                <div className="text-right w-28">
                    <p className="text-xs text-slate-400">Ganancia</p>
                    <p className="font-bold text-sm text-emerald-600">{formatSoles(cat.gananciaTotal)}</p>
                </div>

                {/* Chevron */}
                <Icon
                    icon={isExpanded ? 'solar:alt-arrow-up-linear' : 'solar:alt-arrow-down-linear'}
                    className="text-slate-400 flex-shrink-0 text-base"
                />
            </button>

            {/* Expanded: products table */}
            {isExpanded && (
                <div className="border-t border-slate-100 dark:border-slate-800 overflow-x-auto">
                    <table className="w-full text-xs">
                        <thead>
                            <tr className="text-[11px] font-bold uppercase tracking-wide text-slate-400 border-b border-slate-100 dark:border-slate-800">
                                <th className="text-left px-5 py-2.5">Producto</th>
                                <th className="text-right px-4 py-2.5">P. Venta</th>
                                <th className="text-right px-4 py-2.5">Costo</th>
                                <th className="text-right px-4 py-2.5">Margen</th>
                                <th className="text-right px-4 py-2.5">Uds</th>
                                <th className="text-right px-5 py-2.5">Ganancia Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            {cat.productos.map((prod, pi) => (
                                <tr
                                    key={pi}
                                    className="border-b border-slate-50 dark:border-slate-800 hover:bg-slate-50/60 dark:hover:bg-slate-800 transition-colors"
                                >
                                    <td className="px-5 py-3 font-semibold text-slate-700 dark:text-gray-200 max-w-[200px] truncate">
                                        {prod.nombre}
                                    </td>
                                    <td className="px-4 py-3 text-right text-slate-600 dark:text-gray-300">
                                        {formatSoles(prod.precioUnitario)}
                                    </td>
                                    <td className="px-4 py-3 text-right text-slate-400">
                                        {formatSoles(prod.costoUnitario)}
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <MarginBadge value={prod.margen} />
                                    </td>
                                    <td className="px-4 py-3 text-right text-slate-600 dark:text-gray-300">
                                        {prod.unidadesVendidas % 1 === 0
                                            ? prod.unidadesVendidas
                                            : prod.unidadesVendidas.toFixed(2)}
                                    </td>
                                    <td className="px-5 py-3 text-right font-bold text-emerald-600">
                                        {formatSoles(prod.gananciaTotal)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ mes, anio }: { mes: number; anio: number }) {
    const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Jul','Ago','Sep','Oct','Nov','Dic'];
    return (
        <div className={`flex flex-col items-center justify-center py-20 text-center ${CARD}`}>
            <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center mb-4">
                <Icon icon="solar:tag-linear" className="text-3xl text-slate-300 dark:text-slate-600" />
            </div>
            <p className="font-bold text-slate-700 dark:text-gray-200">Sin ventas en {MESES[mes - 1]} {anio}</p>
            <p className="text-sm text-slate-400 mt-1">No hay comprobantes registrados en este período.</p>
        </div>
    );
}

// ─── Main View ────────────────────────────────────────────────────────────────

const MESES_FULL = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

export default function CategoriasView() {
    const vm = useCategoriasViewModel();
    const { data, isLoading, mesActual, anioActual, expandedCat, isCurrentOrFuture } = vm;
    const sidebarColor = useThemeStore((s) => s.sidebarColor);
    const ACCENT = SIDEBAR_COLOR_HEX[sidebarColor] ?? '#7551FF';

    return (
        <div className="space-y-5 font-jakarta">
            {/* Period navigator */}
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide mb-0.5">Período</p>
                    <h2 className="text-[22px] font-extrabold text-slate-800 dark:text-white tracking-tight flex items-center">
                        {MESES_FULL[mesActual - 1]} {anioActual}
                        {isCurrentOrFuture && (
                            <span className="ml-2.5 text-[11px] font-bold px-2.5 py-1 rounded-full text-white" style={{ background: ACCENT }}>
                                En curso
                            </span>
                        )}
                    </h2>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={vm.handleExportPDF}
                        disabled={vm.isGeneratingPDF || !data}
                        className="h-9 px-4 rounded-xl bg-rose-600 text-white text-sm font-bold hover:bg-rose-700 disabled:opacity-50 flex items-center gap-1.5 transition-colors"
                    >
                        <Icon icon={vm.isGeneratingPDF ? 'line-md:loading-twotone-loop' : 'solar:file-download-linear'} />
                        PDF
                    </button>
                    <button
                        onClick={() => vm.navegarMes(-1)}
                        className="w-9 h-9 flex items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                    >
                        <Icon icon="solar:alt-arrow-left-linear" />
                    </button>
                    <button
                        onClick={() => vm.navegarMes(1)}
                        disabled={isCurrentOrFuture}
                        className="w-9 h-9 flex items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-30"
                    >
                        <Icon icon="solar:alt-arrow-right-linear" />
                    </button>
                </div>
            </div>

            {isLoading ? <Skeleton /> : !data || data.categorias.length === 0 ? (
                <EmptyState mes={mesActual} anio={anioActual} />
            ) : (
                <>
                    {/* KPI unified row */}
                    <KpiRow data={data} />

                    {/* Donut + bar chart */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                        <GananciaDonut data={data} />
                        <GananciasChart data={data} />
                    </div>

                    {/* Category legend chips */}
                    <div className="flex flex-wrap gap-2">
                        {data.categorias.map((c, i) => (
                            <div key={c.nombre} className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs ${CARD}`}>
                                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: CAT_COLORS[i % CAT_COLORS.length] }} />
                                <span className="text-slate-600 dark:text-gray-300 font-semibold">{c.nombre}</span>
                            </div>
                        ))}
                    </div>

                    {/* Category rows */}
                    <div className="space-y-2">
                        {data.categorias.map((cat, idx) => (
                            <CategoriaRow
                                key={cat.nombre}
                                cat={cat}
                                idx={idx}
                                isExpanded={expandedCat === cat.nombre}
                                totalGanancia={data.gananciaTotal}
                                onToggle={() => vm.toggleCat(cat.nombre)}
                            />
                        ))}
                    </div>

                    {/* Footer totals */}
                    <div className={`${CARD} px-5 py-4 flex flex-col md:flex-row md:items-center gap-4`}>
                        <div className="flex-1">
                            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide">Resumen del mes</p>
                        </div>
                        <div className="flex gap-8">
                            <div className="text-right">
                                <p className="text-xs text-slate-400">Ingresos</p>
                                <p className="font-bold text-slate-800 dark:text-white">{formatSoles(data.ingresoTotal)}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-xs text-slate-400">Costo mercadería</p>
                                <p className="font-bold text-slate-800 dark:text-white">{formatSoles(data.ingresoTotal - data.gananciaTotal)}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-xs text-slate-400">Ganancia bruta</p>
                                <p className="font-bold text-emerald-600">{formatSoles(data.gananciaTotal)}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-xs text-slate-400">Margen</p>
                                <p className="font-bold text-slate-800 dark:text-white">{formatPct(data.margenPromedio)}</p>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
