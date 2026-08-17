import { Icon } from '@iconify/react';
import moment from 'moment';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Bar,
    BarChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
} from 'recharts';
import { Calendar } from '@/components/Date';
import Select from '@/components/Select';
import { useFinanceDashboardViewModel } from './useFinanceDashboardViewModel';
import { useThemeStore, SIDEBAR_COLOR_HEX } from '@/zustand/theme';

// ── Helpers de visualización (mismo lenguaje visual del dashboard principal) ───
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
const RadialGauge = ({ value, max = 100, accent }: { value: number; max?: number; accent: string }) => {
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
const KpiMini = ({ type, accent, data }: { type: 'bars' | 'line' | 'donut' | 'wave'; accent: string; data?: number[] }) => {
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

// Tooltip oscuro estilo mockup para el gráfico de barras de flujo de caja.
const DarkTooltip =
    (fmt: (v: number) => string) =>
    ({ active, payload, label }: any) => {
        if (!active || !payload?.length) return null;
        return (
            <div className="rounded-xl bg-slate-900 text-white px-3.5 py-2.5 shadow-xl">
                <p className="text-[11px] font-semibold text-slate-300 mb-1.5">{moment(label).format('DD MMM YYYY')}</p>
                <div className="space-y-1">
                    {payload.map((p: any) => (
                        <div key={p.dataKey} className="flex items-center justify-between gap-6">
                            <span className="flex items-center gap-1.5 text-xs text-slate-400">
                                <span className="h-2 w-2 rounded-full" style={{ background: p.color || p.fill }} />
                                {p.name}
                            </span>
                            <span className="text-sm font-bold">{fmt(p.value)}</span>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

export default function FinanceDashboardView() {
    const vm = useFinanceDashboardViewModel();
    const navigate = useNavigate();
    const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);
    const sidebarColor = useThemeStore((s) => s.sidebarColor);
    const ACCENT = SIDEBAR_COLOR_HEX[sidebarColor] ?? '#7551FF';

    // Estilo CRM claro (mismo lenguaje visual del dashboard principal)
    const cardClass =
        'bg-white dark:bg-[#111827] rounded-3xl shadow-[0_2px_20px_rgba(15,23,42,0.05)] dark:shadow-none border border-slate-100 dark:border-slate-800 p-6 transition-all hover:shadow-[0_4px_28px_rgba(15,23,42,0.08)]';
    const iconChip = 'w-12 h-12 rounded-2xl flex items-center justify-center text-xl';

    // Serie de ingresos para el mini-gráfico de línea del primer KPI
    const ingresosSpark = useMemo(
        () => (vm.formattedChartData || []).map((d: any) => Number(d.Ingresos || 0)),
        [vm.formattedChartData],
    );

    // Rendimiento: balance como % de ingresos (0..100)
    const rendimiento = useMemo(() => {
        const ing = Number(vm.kpis?.ingresosPeriodo || 0);
        const bal = Number(vm.kpis?.balancePeriodo || 0);
        return ing > 0 ? clamp((bal / ing) * 100, 0, 100) : 0;
    }, [vm.kpis?.ingresosPeriodo, vm.kpis?.balancePeriodo]);

    const rendimientoMsg = useMemo(() => {
        if (rendimiento >= 40) return { title: '¡Excelente rentabilidad! ✨', hint: 'Tu balance representa una gran parte de los ingresos. Mantén el control de egresos.' };
        if (rendimiento >= 20) return { title: 'Buen desempeño 👍', hint: 'Vas por buen camino. Revisa tus egresos para mejorar el balance del periodo.' };
        if (rendimiento > 0) return { title: 'Balance ajustado', hint: 'Considera reducir egresos o impulsar ingresos para mejorar tu utilidad.' };
        return { title: 'Sin balance positivo', hint: 'Los egresos igualan o superan tus ingresos en este periodo.' };
    }, [rendimiento]);

    const hasChart = (vm.formattedChartData || []).length > 0;

    // Tarjetas KPI unificadas (columnas divididas, estilo dashboard)
    const kpiCards: { label: string; value: string; mini: 'line' | 'wave' | 'donut' | 'bars'; to: string; data?: number[] }[] = [
        { label: 'Ingresos', value: vm.valueFormatter(vm.kpis?.ingresosPeriodo || 0), mini: 'line', to: '/administrador/facturacion/comprobantes', data: ingresosSpark },
        { label: 'Egresos', value: vm.valueFormatter(vm.kpis?.egresosPeriodo || 0), mini: 'wave', to: '/administrador/compras' },
        { label: 'Balance', value: vm.valueFormatter(vm.kpis?.balancePeriodo || 0), mini: 'donut', to: '/administrador/finanzas/dashboard' },
        { label: 'Por cobrar', value: vm.valueFormatter(vm.kpis?.porCobrar || 0), mini: 'bars', to: '/administrador/ventas/pagos/cuentas-cobrar' },
    ];

    return (
        <div className="w-full overflow-x-hidden font-jakarta">
            {/* Header */}
            <div className="mb-6 space-y-5">
                <div className="mb-5 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
                    <div>
                        <h2 className="text-[22px] font-extrabold text-slate-800 dark:text-white tracking-tight">Flujo de Caja</h2>
                        <p className="mt-1 text-sm text-slate-400 dark:text-gray-400">Ingresos, egresos y conciliación del periodo.</p>
                    </div>

                    <button
                        type="button"
                        onClick={() => setIsMobileFiltersOpen((value) => !value)}
                        className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl px-4 text-sm font-bold text-white shadow-lg hover:brightness-105 transition-all sm:w-auto md:hidden"
                        style={{ background: ACCENT, boxShadow: `0 10px 25px -6px ${ACCENT}59` }}
                    >
                        <Icon icon="solar:filter-bold-duotone" className="text-lg" />
                        {isMobileFiltersOpen ? 'Ocultar filtros' : 'Ver filtros'}
                    </button>
                </div>
                <div
                    className={`${isMobileFiltersOpen ? 'flex' : 'hidden'} flex-col gap-4 rounded-3xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-[#111827] p-4 shadow-[0_2px_20px_rgba(15,23,42,0.05)] dark:shadow-none md:flex md:flex-row md:flex-wrap md:items-end`}
                >
                    {vm.isAdmin && vm.esPrincipal && (
                        <div className="w-full md:min-w-[200px] md:flex-1 md:basis-[200px]">
                            <Select
                                onChange={vm.handleSelectSede}
                                label="Sede"
                                name="sedeId"
                                options={vm.sedesOptions}
                                error=""
                                defaultValue="Todas las sedes"
                            />
                        </div>
                    )}
                    {vm.isAdmin && (
                        <div className="w-full md:min-w-[200px] md:flex-1 md:basis-[200px]">
                            <Select
                                onChange={vm.handleSelectUsuario}
                                label="Vendedor"
                                name="usuarioId"
                                options={vm.usuariosOptions}
                                error=""
                                defaultValue="Todos los vendedores"
                            />
                        </div>
                    )}
                    <div className="w-full md:min-w-[170px] md:flex-1 md:basis-[180px]">
                        <Calendar
                            text="Fecha Inicio"
                            name="fechaInicio"
                            value={moment(vm.fechaInicio).format('DD/MM/YYYY')}
                            onChange={vm.handleDateChange}
                            className="admin-date-filter"
                            portal
                        />
                    </div>
                    <div className="w-full md:min-w-[170px] md:flex-1 md:basis-[180px]">
                        <Calendar
                            text="Fecha Fin"
                            name="fechaFin"
                            value={moment(vm.fechaFin).format('DD/MM/YYYY')}
                            onChange={vm.handleDateChange}
                            className="admin-date-filter"
                            portal
                        />
                    </div>
                    <div className="flex gap-3 md:ml-auto">
                        <button
                            onClick={vm.refreshData}
                            className="flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-2xl border-2 transition-colors hover:bg-[color-mix(in_srgb,var(--accent)_10%,transparent)]"
                            style={{ borderColor: `${ACCENT}55`, color: ACCENT }}
                        >
                            <Icon icon="solar:refresh-bold" />
                        </button>
                        <button
                            onClick={vm.handleExportPDF}
                            disabled={vm.isGeneratingPDF || !vm.kpis}
                            className="flex h-[46px] flex-1 items-center justify-center gap-2 rounded-2xl bg-rose-500 px-4 text-sm font-bold text-white shadow-lg shadow-rose-500/25 transition-colors hover:bg-rose-600 disabled:cursor-not-allowed disabled:opacity-50 md:flex-none"
                        >
                            <Icon icon={vm.isGeneratingPDF ? 'line-md:loading-twotone-loop' : 'solar:file-download-bold-duotone'} className="text-lg" />
                            {vm.isGeneratingPDF ? 'Generando...' : 'PDF'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Aviso: al filtrar por vendedor, los egresos son del negocio */}
            {vm.isAdmin && vm.selectedUsuarioId && (
                <div className="mb-5 flex items-start gap-2 rounded-2xl border border-amber-100 dark:border-amber-900/30 bg-amber-50 dark:bg-amber-900/20 px-4 py-3 text-xs font-medium text-amber-700 dark:text-amber-400">
                    <Icon icon="solar:info-circle-bold-duotone" className="mt-0.5 shrink-0 text-base" />
                    <span>Estás viendo las <strong>ventas/ingresos del vendedor seleccionado</strong>. Los egresos (gastos y compras) corresponden al negocio completo, no se atribuyen a un vendedor.</span>
                </div>
            )}

            {/* Contenido */}
            {vm.isLoading ? (
                <div className="space-y-4">
                    <div className="h-40 rounded-3xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                        <div className="h-80 rounded-3xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
                        <div className="h-80 rounded-3xl bg-slate-100 dark:bg-slate-800 animate-pulse lg:col-span-2" />
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                        <div className="h-96 rounded-3xl bg-slate-100 dark:bg-slate-800 animate-pulse lg:col-span-2" />
                        <div className="h-96 rounded-3xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
                    </div>
                </div>
            ) : (
                <div className="space-y-4">
                    {/* ── KPIs hero (tarjeta unificada con columnas divididas) ── */}
                    <div className="rounded-3xl bg-white dark:bg-[#111827] shadow-[0_2px_20px_rgba(15,23,42,0.05)] dark:shadow-none border border-slate-100 dark:border-slate-800 overflow-hidden">
                        <div className="grid grid-cols-2 lg:grid-cols-4">
                            {kpiCards.map((c, idx) => (
                                <div
                                    key={c.label}
                                    className={`flex flex-col border-slate-100 dark:border-slate-800 lg:border-t-0 ${idx % 2 === 1 ? 'border-l' : ''} ${idx >= 2 ? 'border-t' : ''} ${idx > 0 ? 'lg:border-l' : ''}`}
                                >
                                    <div className="p-5 flex-1">
                                        <div className="flex items-center gap-1.5 text-slate-400 dark:text-gray-400">
                                            <span className="text-[11px] font-black uppercase tracking-wide">{c.label}</span>
                                            <Icon icon="solar:info-circle-linear" className="text-[13px]" />
                                        </div>
                                        <div className="mt-2.5 flex items-start justify-between gap-2">
                                            <div className="min-w-0">
                                                <p className="text-2xl font-extrabold text-slate-800 dark:text-white truncate">{c.value}</p>
                                                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                                                    <span className="text-xs text-slate-400 dark:text-gray-400">en el periodo</span>
                                                </div>
                                            </div>
                                            <div className="shrink-0 pt-0.5">
                                                <KpiMini type={c.mini} accent={ACCENT} data={c.data} />
                                            </div>
                                        </div>
                                    </div>
                                    <button onClick={() => navigate(c.to)} className="group w-full flex items-center justify-center gap-1.5 border-t border-slate-100 dark:border-slate-800 py-3 text-[13px] font-bold text-slate-600 dark:text-gray-300 hover:text-[var(--accent)] transition-colors">
                                        Ver detalle <Icon icon="solar:arrow-right-linear" className="transition-transform group-hover:translate-x-0.5" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* ── Rendimiento (gauge) + flujo de caja (barras) ── */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                        {/* Gauge de rendimiento */}
                        <div className="rounded-3xl bg-white dark:bg-[#111827] p-5 shadow-[0_2px_20px_rgba(15,23,42,0.05)] dark:shadow-none border border-slate-100 dark:border-slate-800 flex flex-col">
                            <div className="flex items-center gap-1.5">
                                <h3 className="text-sm font-extrabold text-slate-800 dark:text-white">Rendimiento</h3>
                                <Icon icon="solar:info-circle-linear" className="text-[13px] text-slate-400" />
                            </div>
                            <div className="relative mx-auto mt-3 w-full max-w-[240px]">
                                <div className="h-[128px]"><RadialGauge value={rendimiento} accent={ACCENT} /></div>
                                <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col items-center">
                                    <span className="text-4xl font-extrabold leading-none text-slate-800 dark:text-white">{rendimiento.toFixed(0)}</span>
                                    <span className="mt-1 text-xs font-medium text-slate-400 dark:text-gray-400">% balance / ingresos</span>
                                </div>
                            </div>
                            <div className="mt-5 border-t border-slate-100 dark:border-slate-800 pt-4">
                                <p className="text-sm font-bold text-slate-700 dark:text-gray-200">{rendimientoMsg.title}</p>
                                <p className="mt-1 text-xs text-slate-400 dark:text-gray-400 leading-relaxed">{rendimientoMsg.hint}</p>
                            </div>
                            <button onClick={vm.handleExportPDF} disabled={vm.isGeneratingPDF} className="group mt-4 flex items-center gap-1.5 text-[13px] font-bold text-slate-700 dark:text-gray-200 hover:text-[var(--accent)] transition-colors disabled:opacity-60">
                                Ver reporte detallado <Icon icon="solar:arrow-right-linear" className="transition-transform group-hover:translate-x-0.5" />
                            </button>
                        </div>

                        {/* Barras: flujo de caja (ingresos vs egresos) con tooltip oscuro */}
                        <div className="rounded-3xl bg-white dark:bg-[#111827] p-5 shadow-[0_2px_20px_rgba(15,23,42,0.05)] dark:shadow-none border border-slate-100 dark:border-slate-800 lg:col-span-2">
                            <div className="mb-4 flex items-start justify-between gap-2">
                                <div className="flex items-center gap-1.5">
                                    <h3 className="text-sm font-extrabold text-slate-800 dark:text-white">Flujo de caja</h3>
                                    <Icon icon="solar:info-circle-linear" className="text-[13px] text-slate-400" />
                                </div>
                                <div className="flex gap-2">
                                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-gray-400 bg-slate-50 dark:bg-slate-800 px-2.5 py-1 rounded-full">
                                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: ACCENT }} /> Ingresos
                                    </span>
                                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-gray-400 bg-slate-50 dark:bg-slate-800 px-2.5 py-1 rounded-full">
                                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500" /> Egresos
                                    </span>
                                </div>
                            </div>
                            <div className="h-64">
                                {hasChart ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={vm.formattedChartData} margin={{ top: 8, right: 4, left: -12, bottom: 0 }} barCategoryGap="26%">
                                            <XAxis dataKey="date" tickFormatter={(l) => moment(l).format('DD')} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} interval="preserveStartEnd" minTickGap={12} />
                                            <Tooltip cursor={{ fill: 'transparent' }} content={DarkTooltip(vm.valueFormatter)} />
                                            <Bar dataKey="Ingresos" name="Ingresos" fill={ACCENT} radius={[999, 999, 999, 999]} maxBarSize={16} />
                                            <Bar dataKey="Egresos" name="Egresos" fill="#f43f5e" radius={[999, 999, 999, 999]} maxBarSize={16} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="flex h-full flex-col items-center justify-center text-slate-300 dark:text-slate-600">
                                        <Icon icon="solar:chart-2-linear" className="text-5xl mb-2" />
                                        <p className="text-sm text-slate-400 dark:text-gray-400">Sin movimientos en este periodo</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* ── Método de pago + resumen ── */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                        {/* Ingresos por método de pago */}
                        <div className={`${cardClass} lg:col-span-2`}>
                            <div className="flex items-start justify-between gap-4 mb-5">
                                <div>
                                    <h2 className="text-lg font-extrabold text-slate-800 dark:text-white">Ingresos por método de pago</h2>
                                    <p className="text-sm text-slate-400 dark:text-gray-400 mt-0.5">
                                        Total cobrado según pagos reales del periodo.
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[11px] uppercase tracking-wide font-bold text-slate-400 dark:text-gray-400">Conciliado</p>
                                    <p className="text-lg font-extrabold text-slate-800 dark:text-white">{vm.valueFormatter(vm.conciliacion?.totalPorMetodo || 0)}</p>
                                </div>
                            </div>

                            <div className="space-y-3">
                                {(vm.metodosPago || []).length === 0 ? (
                                    <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/50 p-6 text-center text-sm text-slate-400 dark:text-gray-400">
                                        <Icon icon="solar:wallet-linear" className="text-3xl text-slate-200 dark:text-gray-600 mx-auto mb-1.5" />
                                        Aún no hay pagos registrados en este rango.
                                    </div>
                                ) : (
                                    vm.metodosPago.map((item: any) => {
                                        const maxTotal = Math.max(...vm.metodosPago.map((m: any) => Number(m.total || 0)), 1);
                                        const width = Math.max(8, Math.round((Number(item.total || 0) / maxTotal) * 100));
                                        const colorByMethod: Record<string, string> = {
                                            EFECTIVO: 'bg-emerald-500',
                                            YAPE: 'bg-violet-500',
                                            PLIN: 'bg-sky-500',
                                            TRANSFERENCIA: 'bg-blue-600',
                                            TARJETA: 'bg-amber-500',
                                        };
                                        return (
                                            <div key={item.metodo} className="rounded-2xl border border-slate-100 dark:border-slate-800 p-4">
                                                <div className="flex items-start justify-between gap-3">
                                                    <div>
                                                        <p className="text-sm font-bold text-slate-800 dark:text-white">{item.metodo}</p>
                                                        <p className="text-xs text-slate-400 dark:text-gray-400 mt-0.5">{item.explicacion}</p>
                                                    </div>
                                                    <div className="text-right shrink-0">
                                                        <p className="text-sm font-extrabold text-slate-800 dark:text-white">{vm.valueFormatter(item.total)}</p>
                                                        <p className="text-[11px] text-slate-400 dark:text-gray-400">{item.cantidad} pago(s)</p>
                                                    </div>
                                                </div>
                                                <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full mt-3 overflow-hidden">
                                                    <div className={`h-full rounded-full ${colorByMethod[item.metodo] || 'bg-slate-400'}`} style={{ width: `${width}%` }} />
                                                </div>
                                                {['TRANSFERENCIA', 'TARJETA'].includes(item.metodo) && (
                                                    <p className="text-[11px] font-semibold text-slate-500 dark:text-gray-400 mt-2">
                                                        {item.referencias}/{item.cantidad} con operación o voucher registrado.
                                                    </p>
                                                )}
                                            </div>
                                        );
                                    })
                                )}
                            </div>

                            {(vm.conciliacion?.comprobantesRespaldo ?? 0) > 0 && (
                                <div className="mt-4 rounded-2xl bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-900/30 p-3 text-xs font-semibold text-amber-700 dark:text-amber-400">
                                    Incluye {vm.conciliacion?.comprobantesRespaldo} comprobante(s) antiguo(s) sin pago separado para no perder el monto en el reporte.
                                </div>
                            )}
                        </div>

                        {/* Columna derecha: tarjetas resumen */}
                        <div className="space-y-6">
                            <div
                                className="rounded-3xl p-6 shadow-lg text-white transition-all"
                                style={{ background: ACCENT, boxShadow: `0 12px 30px -8px ${ACCENT}59` }}
                            >
                                <div className="flex justify-between items-start mb-4">
                                    <div className="p-2 bg-white/20 rounded-2xl">
                                        <Icon icon="solar:wallet-money-bold-duotone" className="text-2xl" />
                                    </div>
                                    <span className="text-white/90 text-xs font-semibold bg-white/20 px-2.5 py-1 rounded-full">Este periodo</span>
                                </div>
                                <p className="text-white/80 font-medium mb-1">Ingresos Totales</p>
                                <h3 className="text-3xl font-extrabold mb-4">{vm.valueFormatter(vm.kpis?.ingresosPeriodo || 0)}</h3>
                                <div className="flex items-center gap-2 text-white/80 text-sm">
                                    <Icon icon="solar:hand-money-bold-duotone" />
                                    <span>Por cobrar: {vm.valueFormatter(vm.kpis?.porCobrar || 0)}</span>
                                </div>
                            </div>

                            <div className={cardClass}>
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="font-extrabold text-slate-800 dark:text-white">Resumen Rápido</h3>
                                    <button className="text-slate-300 dark:text-gray-600 hover:text-slate-500 dark:hover:text-gray-400">
                                        <Icon icon="solar:menu-dots-bold" />
                                    </button>
                                </div>

                                <div className="space-y-3">
                                    <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 hover:bg-[color-mix(in_srgb,var(--accent)_10%,transparent)] dark:hover:bg-slate-800 transition-colors group">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 flex items-center justify-center shadow-sm dark:shadow-none group-hover:scale-110 transition-transform" style={{ color: ACCENT }}>
                                                <Icon icon="solar:card-send-bold-duotone" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-slate-800 dark:text-white">Egresos</p>
                                                <p className="text-xs text-slate-400 dark:text-gray-400">Gastos operativos</p>
                                            </div>
                                        </div>
                                        <span className="text-sm font-extrabold text-slate-800 dark:text-white">{vm.valueFormatter(vm.kpis?.egresosPeriodo || 0)}</span>
                                    </div>

                                    <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 hover:bg-emerald-50 dark:hover:bg-slate-800 transition-colors group">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-sm dark:shadow-none group-hover:scale-110 transition-transform">
                                                <Icon icon="solar:scale-bold-duotone" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-slate-800 dark:text-white">Balance</p>
                                                <p className="text-xs text-slate-400 dark:text-gray-400">Utilidad neta</p>
                                            </div>
                                        </div>
                                        <span className={`text-sm font-extrabold ${(vm.kpis?.balancePeriodo || 0) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                            {vm.valueFormatter(vm.kpis?.balancePeriodo || 0)}
                                        </span>
                                    </div>

                                    <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 hover:bg-amber-50 dark:hover:bg-slate-800 transition-colors group">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 text-amber-600 dark:text-amber-400 flex items-center justify-center shadow-sm dark:shadow-none group-hover:scale-110 transition-transform">
                                                <Icon icon="solar:bill-check-bold-duotone" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-slate-800 dark:text-white">Por pagar</p>
                                                <p className="text-xs text-slate-400 dark:text-gray-400">A proveedores</p>
                                            </div>
                                        </div>
                                        <span className="text-sm font-extrabold text-slate-800 dark:text-white">{vm.valueFormatter(vm.kpis?.porPagar || 0)}</span>
                                    </div>
                                </div>

                                <button
                                    onClick={vm.handleExportPDF}
                                    disabled={vm.isGeneratingPDF}
                                    className="w-full mt-6 py-3 text-white rounded-2xl font-bold hover:brightness-105 transition-all flex items-center justify-center gap-2 shadow-lg disabled:opacity-60 disabled:cursor-not-allowed"
                                    style={{ background: ACCENT, boxShadow: `0 10px 25px -6px ${ACCENT}59` }}
                                >
                                    {vm.isGeneratingPDF ? (
                                        <>
                                            <Icon icon="solar:loading-bold" className="animate-spin" />
                                            <span>Generando PDF...</span>
                                        </>
                                    ) : (
                                        <>
                                            <span>Ver Reporte Detallado</span>
                                            <Icon icon="solar:arrow-right-linear" />
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
