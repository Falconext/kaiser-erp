import { Icon } from '@iconify/react';
import { useMemo } from 'react';
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
    MESES_FULL,
    MetodoPagoGrupo,
    formatSoles,
    methodColor,
    methodIcon,
} from './MetodosPagoModel';
import { useMetodosPagoViewModel } from './useMetodosPagoViewModel';
import { KpiMini, DarkTooltip } from '../shared/dashboardWidgets';
import { useThemeStore, SIDEBAR_COLOR_HEX } from '@/zustand/theme';

// Estilo de tarjeta unificado con el dashboard principal
const CARD = 'rounded-3xl bg-white dark:bg-[#111827] shadow-[0_2px_20px_rgba(15,23,42,0.05)] dark:shadow-none border border-slate-100 dark:border-slate-800';

function Skeleton() {
    return (
        <div className="space-y-4">
            <div className="h-40 rounded-3xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="h-80 rounded-3xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
                <div className="h-80 rounded-3xl bg-slate-100 dark:bg-slate-800 animate-pulse lg:col-span-2" />
            </div>
            <div className="space-y-2.5">
                {[...Array(4)].map((_, i) => <div key={i} className="h-16 bg-slate-100 dark:bg-slate-800 rounded-2xl animate-pulse" />)}
            </div>
        </div>
    );
}

function formatDate(value?: string | null) {
    if (!value) return '-';
    const [y, m, d] = value.split('-');
    return `${d}/${m}/${y}`;
}

function MetodoRow({ metodo, maxTotal, expanded, onToggle }: {
    metodo: MetodoPagoGrupo;
    maxTotal: number;
    expanded: boolean;
    onToggle: () => void;
}) {
    const color = methodColor(metodo.metodo);
    const pct = maxTotal > 0 ? Math.max(6, Math.round((metodo.total / maxTotal) * 100)) : 0;

    return (
        <div className="bg-white dark:bg-[#111827] rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden">
            <button
                onClick={onToggle}
                className="w-full flex items-center gap-4 px-5 py-4 hover:bg-slate-50/60 dark:hover:bg-slate-800/60 transition-colors text-left"
            >
                <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-white shrink-0" style={{ backgroundColor: color }}>
                    <Icon icon={methodIcon(metodo.metodo)} className="text-xl" />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-800 dark:text-white text-sm">{metodo.metodo}</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                        {metodo.cantidad} pago(s) · {metodo.referencias} con operación/voucher
                    </p>
                    <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mt-2 max-w-md">
                        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
                    </div>
                </div>
                <div className="text-right">
                    <p className="text-slate-400 uppercase tracking-wide text-[11px] font-semibold">Total</p>
                    <p className="text-lg font-extrabold text-slate-800 dark:text-white">{formatSoles(metodo.total)}</p>
                </div>
                <Icon icon={expanded ? 'solar:alt-arrow-up-linear' : 'solar:alt-arrow-down-linear'} className="text-slate-400 shrink-0" />
            </button>

            {expanded && (
                <div className="border-t border-slate-100 dark:border-slate-800 overflow-x-auto">
                    <table className="w-full text-xs min-w-[720px]">
                        <thead>
                            <tr className="text-[11px] font-bold uppercase tracking-wide text-slate-400 border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/50">
                                <th className="text-left px-5 py-2.5">Fecha</th>
                                <th className="text-left px-4 py-2.5">Comprobante</th>
                                <th className="text-left px-4 py-2.5">Cliente</th>
                                <th className="text-left px-4 py-2.5">Referencia</th>
                                <th className="text-left px-4 py-2.5">Cuenta</th>
                                <th className="text-right px-5 py-2.5">Monto</th>
                            </tr>
                        </thead>
                        <tbody>
                            {metodo.items.map((item) => (
                                <tr key={item.id} className="border-b border-slate-50 dark:border-slate-800 hover:bg-slate-50/60 dark:hover:bg-slate-800/60 transition-colors">
                                    <td className="px-5 py-3 text-slate-500 dark:text-slate-400">{formatDate(item.fecha)}</td>
                                    <td className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-200">{item.documento}</td>
                                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{item.cliente}</td>
                                    <td className="px-4 py-3 text-slate-400">{item.referencia || '-'}</td>
                                    <td className="px-4 py-3 text-slate-400">{item.cuenta || '-'}</td>
                                    <td className="px-5 py-3 text-right font-bold text-slate-800 dark:text-white">{formatSoles(item.monto)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

export default function MetodosPagoView() {
    const vm = useMetodosPagoViewModel();
    const sidebarColor = useThemeStore((s) => s.sidebarColor);
    const ACCENT = SIDEBAR_COLOR_HEX[sidebarColor] ?? '#7551FF';
    const isDarkMode = useThemeStore((s) => s.isDarkMode);
    const mutedBar = isDarkMode ? '#1e293b' : '#eef1f6';
    const data = vm.data;
    const maxTotal = Math.max(...(data?.metodos ?? []).map((m) => m.total), 1);

    // Distribución por método para donut + barras (mismo lenguaje visual del dashboard)
    const distribucion = useMemo(() => {
        const metodos = data?.metodos ?? [];
        const totalCobrado = Number(data?.resumen?.totalCobrado || 0);
        return metodos.map((m) => ({
            name: m.metodo,
            value: Number(m.total || 0),
            cantidad: m.cantidad,
            color: methodColor(m.metodo),
            pct: totalCobrado > 0 ? (Number(m.total || 0) / totalCobrado) * 100 : 0,
        }));
    }, [data?.metodos, data?.resumen?.totalCobrado]);

    return (
        <div className="min-h-0 -m-5 p-5 bg-[#F7F8FB] dark:bg-[#0A0D14] font-jakarta">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm text-slate-400 mb-5">
                <Icon icon="solar:home-smile-linear" className="text-base" />
                <span>Panel</span>
                <Icon icon="solar:alt-arrow-right-linear" className="text-xs" />
                <span>Finanzas</span>
                <Icon icon="solar:alt-arrow-right-linear" className="text-xs" />
                <span className="font-semibold" style={{ color: ACCENT }}>Métodos de pago</span>
            </div>

            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-5">
                <div className="min-w-0">
                    <div className="flex items-center gap-2.5 flex-wrap">
                        <h1 className="text-[22px] font-extrabold text-slate-800 dark:text-white tracking-tight">Métodos de pago</h1>
                        {!vm.usarRango && vm.isCurrentOrFuture && (
                            <span className="text-[11px] font-bold px-2.5 py-1 rounded-full text-white" style={{ background: ACCENT }}>En curso</span>
                        )}
                    </div>
                    <p className="text-sm text-slate-400 mt-0.5">
                        {vm.usarRango ? `${formatDate(vm.fechaInicio)} - ${formatDate(vm.fechaFin)}` : `${MESES_FULL[vm.mesActual - 1]} ${vm.anioActual}`}
                        {' · '}pagos de ventas conciliados por canal
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                    <button
                        onClick={() => vm.setUsarRango(!vm.usarRango)}
                        className={`h-9 px-3.5 rounded-xl text-sm font-semibold border transition-colors flex items-center gap-1.5 ${vm.usarRango ? 'text-white border-transparent' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                        style={vm.usarRango ? { background: ACCENT } : undefined}
                    >
                        <Icon icon="solar:calendar-linear" /> {vm.usarRango ? 'Rango de fechas' : 'Mes completo'}
                    </button>
                    {vm.usarRango ? (
                        <>
                            <input type="date" value={vm.fechaInicio} onChange={(e) => vm.setFechaInicio(e.target.value)} className="h-9 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:border-[var(--accent)]" />
                            <input type="date" value={vm.fechaFin} onChange={(e) => vm.setFechaFin(e.target.value)} className="h-9 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:border-[var(--accent)]" />
                        </>
                    ) : (
                        <>
                            <button onClick={() => vm.navegarMes(-1)} className="h-9 w-9 grid place-items-center rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700">
                                <Icon icon="solar:alt-arrow-left-linear" />
                            </button>
                            <button onClick={() => vm.navegarMes(1)} disabled={vm.isCurrentOrFuture} className="h-9 w-9 grid place-items-center rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-30">
                                <Icon icon="solar:alt-arrow-right-linear" />
                            </button>
                        </>
                    )}
                    <button onClick={vm.refreshData} className="h-9 px-3.5 rounded-xl border-2 text-sm font-bold flex items-center gap-1.5 transition-colors"
                        style={{ borderColor: `${ACCENT}55`, color: ACCENT }}>
                        <Icon icon="solar:refresh-linear" className={vm.isLoading ? 'animate-spin' : ''} /> Actualizar
                    </button>
                    <button
                        onClick={vm.handleExportPDF}
                        disabled={vm.isGeneratingPDF || !data}
                        className="h-9 px-4 rounded-xl text-white text-sm font-bold flex items-center gap-1.5 shadow-lg shadow-violet-500/30 hover:brightness-105 transition-all disabled:opacity-50"
                        style={{ background: ACCENT }}
                    >
                        <Icon icon={vm.isGeneratingPDF ? 'line-md:loading-twotone-loop' : 'solar:file-download-bold'} />
                        PDF
                    </button>
                </div>
            </div>

            {vm.isLoading ? <Skeleton /> : !data || data.metodos.length === 0 ? (
                <div className={`${CARD} flex flex-col items-center justify-center py-20 text-center`}>
                    <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center mb-4">
                        <Icon icon="solar:card-2-linear" className="text-3xl text-slate-300 dark:text-slate-600" />
                    </div>
                    <p className="font-semibold text-slate-700 dark:text-slate-200">Sin pagos registrados</p>
                    <p className="text-sm text-slate-400 mt-1">No hay pagos de venta para este período.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {/* ── KPIs hero (tarjeta unificada con columnas divididas, estilo dashboard) ── */}
                    <div className={`${CARD} overflow-hidden`}>
                        <div className="grid grid-cols-2 lg:grid-cols-4">
                            {[
                                { label: 'Total cobrado', value: formatSoles(data.resumen.totalCobrado), sub: 'pagos de ventas', mini: 'line' as const },
                                { label: 'Métodos usados', value: String(data.resumen.totalMetodos), sub: 'canales de cobro', mini: 'donut' as const },
                                { label: 'Con voucher/op.', value: `${data.resumen.totalConReferencia}/${data.resumen.totalPagos}`, sub: 'respaldo registrado', mini: 'bars' as const },
                                { label: 'Respaldo legacy', value: String(data.resumen.totalRespaldo), sub: 'sin pago separado', mini: 'wave' as const },
                            ].map((c, idx) => (
                                <div
                                    key={c.label}
                                    className={`flex flex-col p-5 border-slate-100 dark:border-slate-800 ${idx % 2 === 1 ? 'border-l' : ''} ${idx >= 2 ? 'border-t' : ''} lg:border-t-0 ${idx > 0 ? 'lg:border-l' : ''}`}
                                >
                                    <div className="flex items-center gap-1.5 text-slate-400 dark:text-gray-400">
                                        <span className="text-[11px] font-black uppercase tracking-wide">{c.label}</span>
                                        <Icon icon="solar:info-circle-linear" className="text-[13px]" />
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

                    {/* ── Distribución por método: donut + leyenda + barras (estilo "Cómo te pagan") ── */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                        {/* Donut + leyenda */}
                        <div className={`${CARD} p-5`}>
                            <div className="flex items-center gap-1.5">
                                <h3 className="text-sm font-extrabold text-slate-800 dark:text-white">Cómo te pagan</h3>
                                <Icon icon="solar:info-circle-linear" className="text-[13px] text-slate-400" />
                            </div>
                            <p className="mb-2 text-xs text-slate-400 dark:text-gray-400">Reparto del total cobrado</p>
                            <div className="relative mx-auto h-36 w-36">
                                {distribucion.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie data={distribucion} dataKey="value" nameKey="name" innerRadius={48} outerRadius={68} paddingAngle={2} stroke="none">
                                                {distribucion.map((d, i) => <Cell key={i} fill={d.color} />)}
                                            </Pie>
                                            <Tooltip formatter={(v: any, n: any) => [formatSoles(Number(v)), n]} contentStyle={{ fontSize: 12, borderRadius: 8, borderColor: '#e5e7eb' }} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="flex h-full items-center justify-center text-center text-sm text-slate-300 dark:text-slate-600">Sin datos</div>
                                )}
                                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                                    <span className="text-base font-extrabold text-slate-800 dark:text-white">{formatSoles(data.resumen.totalCobrado)}</span>
                                    <span className="text-[10px] font-medium text-slate-400 dark:text-gray-400">total</span>
                                </div>
                            </div>
                            <div className="mt-4 space-y-2">
                                {distribucion.map((c) => (
                                    <div key={c.name} className="flex items-center justify-between gap-2 text-sm">
                                        <span className="flex min-w-0 items-center gap-2">
                                            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: c.color }} />
                                            <span className="truncate font-medium text-slate-600 dark:text-gray-300">{c.name}</span>
                                        </span>
                                        <span className="flex shrink-0 items-center gap-2">
                                            <span className="font-bold text-slate-700 dark:text-gray-200">{formatSoles(c.value)}</span>
                                            <span className="w-10 text-right font-bold text-slate-400 dark:text-gray-400">{c.pct.toFixed(0)}%</span>
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Barras por método (acento) */}
                        <div className={`${CARD} p-5 lg:col-span-2`}>
                            <div className="mb-4 flex items-center gap-1.5">
                                <h3 className="text-sm font-extrabold text-slate-800 dark:text-white">Total cobrado por método</h3>
                                <Icon icon="solar:info-circle-linear" className="text-[13px] text-slate-400" />
                            </div>
                            <div className="h-64">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={distribucion} margin={{ top: 8, right: 4, left: -12, bottom: 0 }} barCategoryGap="26%">
                                        <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} interval={0} />
                                        <Tooltip cursor={{ fill: 'transparent' }} content={DarkTooltip(formatSoles, (l) => String(l ?? ''))} />
                                        <Bar dataKey="value" name="Total" radius={[999, 999, 999, 999]} maxBarSize={40}>
                                            {distribucion.map((d, i) => (
                                                <Cell key={i} fill={d.value >= maxTotal ? ACCENT : mutedBar} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2.5">
                        {data.metodos.map((metodo) => (
                            <MetodoRow
                                key={metodo.metodo}
                                metodo={metodo}
                                maxTotal={maxTotal}
                                expanded={vm.expandedMethod === metodo.metodo}
                                onToggle={() => vm.toggleMethod(metodo.metodo)}
                            />
                        ))}
                    </div>

                    <div className={`${CARD} px-5 py-4 flex flex-col md:flex-row md:items-center gap-4`}>
                        <div className="w-11 h-11 rounded-2xl bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400 flex items-center justify-center shrink-0">
                            <Icon icon="solar:shield-check-bold-duotone" className="text-xl" />
                        </div>
                        <div className="flex-1">
                            <p className="text-slate-400 uppercase tracking-wide text-xs font-semibold">Control del período</p>
                            <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">Cada método se calcula desde pagos reales; los comprobantes antiguos sin pago separado entran como respaldo para no perder montos.</p>
                        </div>
                        <div className="text-right shrink-0">
                            <p className="text-slate-400 uppercase tracking-wide text-[11px] font-semibold">Total conciliado</p>
                            <p className="font-extrabold text-slate-800 dark:text-white text-lg">{formatSoles(data.resumen.totalCobrado)}</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
