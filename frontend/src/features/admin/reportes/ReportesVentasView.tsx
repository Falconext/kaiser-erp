import { Icon } from '@iconify/react';
import moment from 'moment';
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Calendar } from '@/components/Date';
import { DarkTooltip } from '@/features/admin/finanzas/shared/dashboardWidgets';
import { useReportesVentasViewModel } from './useReportesVentasViewModel';
import { ReporteDetalleDrawer } from './components/ReporteDetalleDrawer';
import { DIMENSIONES, formatCompacto, formatNumero, formatSoles } from './ReportesVentasModel';

const ACCENT = 'var(--accent, #7551FF)';
const BAR_COLORS = ['#7551FF', '#8B6CFF', '#9F87FF', '#B3A2FF', '#C7BDFF', '#D3CBFF', '#DDD7FF', '#E5E0FF', '#ECE9FF', '#F1EFFF'];

const KPI_STYLE = {
    ventas: { bg: 'from-violet-50 to-violet-100/50', text: 'text-violet-500', icon: 'solar:wallet-money-bold-duotone' },
    docs: { bg: 'from-blue-50 to-blue-100/50', text: 'text-blue-500', icon: 'solar:bill-list-bold-duotone' },
    ticket: { bg: 'from-emerald-50 to-emerald-100/50', text: 'text-emerald-500', icon: 'solar:chart-2-bold-duotone' },
};

function KpiCard({ label, value, hint, style }: { label: string; value: string; hint?: string; style: (typeof KPI_STYLE)[keyof typeof KPI_STYLE] }) {
    return (
        <div className={`rounded-3xl bg-gradient-to-br ${style.bg} p-5 shadow-[0_2px_20px_rgba(15,23,42,0.05)] flex items-center gap-4`}>
            <div className="w-11 h-11 rounded-2xl bg-white/80 grid place-items-center shrink-0">
                <Icon icon={style.icon} width={24} className={style.text} />
            </div>
            <div className="min-w-0">
                <p className={`text-[11px] font-bold uppercase tracking-wide ${style.text}`}>{label}</p>
                <p className="text-xl font-extrabold text-slate-800 truncate">{value}</p>
                {hint && <p className="text-xs text-slate-400">{hint}</p>}
            </div>
        </div>
    );
}

function truncar(s: string, n = 28) {
    return s.length > n ? `${s.slice(0, n - 1)}…` : s;
}

export default function ReportesVentasView() {
    const vm = useReportesVentasViewModel();
    const esProducto = vm.dimension === 'producto';
    const maxVentas = vm.reporte.filas[0]?.ventas || 1;
    const chartData = vm.top10.map((f) => ({ nombre: truncar(f.nombre), nombreCompleto: f.nombre, Ventas: f.ventas }));
    const chartHeight = Math.max(220, chartData.length * 36 + 40);

    return (
        <div className="min-h-screen -m-5 p-5 bg-[#F7F8FB] font-jakarta">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm text-slate-400 mb-5">
                <Icon icon="solar:home-smile-linear" className="text-base" />
                <span>Panel</span>
                <Icon icon="solar:alt-arrow-right-linear" className="text-xs" />
                <span>Finanzas</span>
                <Icon icon="solar:alt-arrow-right-linear" className="text-xs" />
                <span className="font-semibold" style={{ color: ACCENT }}>Reportes de gestión</span>
            </div>

            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-5">
                <div className="min-w-0">
                    <h1 className="text-[22px] font-extrabold text-slate-800 tracking-tight">Reportes de gestión</h1>
                    <p className="text-sm text-slate-400 mt-0.5">Ventas por vendedor, cliente, producto, sector y ubicación</p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={vm.recargar}
                        className="h-10 px-3.5 rounded-xl bg-white border border-slate-200 text-slate-600 text-sm font-semibold flex items-center gap-1.5 hover:bg-slate-50 transition-colors"
                        title="Actualizar"
                    >
                        <Icon icon="solar:refresh-linear" className={vm.isLoading ? 'animate-spin' : ''} />
                        <span className="hidden sm:inline">Actualizar</span>
                    </button>
                    <button
                        onClick={vm.handleExportar}
                        disabled={vm.isExporting || vm.reporte.filas.length === 0}
                        className="h-10 px-4 rounded-xl text-white text-sm font-bold flex items-center gap-1.5 shadow-lg shadow-violet-500/30 hover:brightness-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        style={{ background: ACCENT }}
                    >
                        <Icon icon={vm.isExporting ? 'mdi:loading' : 'solar:download-minimalistic-linear'} className={vm.isExporting ? 'animate-spin' : ''} />
                        Exportar Excel
                    </button>
                </div>
            </div>

            {/* Filtros */}
            <div className="bg-white rounded-3xl shadow-[0_2px_20px_rgba(15,23,42,0.05)] p-4 mb-5">
                <div className="flex flex-wrap gap-3 items-end">
                    <div className="flex items-end gap-2 flex-wrap">
                        <Calendar text="Desde" name="fechaInicio" value={moment(vm.fechaInicio).format('DD/MM/YYYY')} onChange={vm.handleDateChange} />
                        <Calendar text="Hasta" name="fechaFin" value={moment(vm.fechaFin).format('DD/MM/YYYY')} onChange={vm.handleDateChange} />
                    </div>

                    {vm.sedes.length > 1 && (
                        <>
                            <div className="hidden md:block w-px h-10 bg-slate-100 self-end mb-1" />
                            <div className="flex flex-col gap-1.5">
                                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Sede</label>
                                <div className="flex items-center gap-1.5 flex-wrap">
                                    <button
                                        onClick={() => vm.setSelectedSedeId(null)}
                                        className={`h-9 px-3.5 rounded-xl text-xs font-semibold border transition-colors ${vm.selectedSedeId === null ? 'text-white border-transparent' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                                        style={vm.selectedSedeId === null ? { background: ACCENT } : undefined}
                                    >
                                        Todas
                                    </button>
                                    {vm.sedes.map((sede) => (
                                        <button
                                            key={sede.id}
                                            onClick={() => vm.setSelectedSedeId(sede.id)}
                                            className={`h-9 px-3.5 rounded-xl text-xs font-semibold border transition-colors flex items-center gap-1.5 ${vm.selectedSedeId === sede.id ? 'text-white border-transparent' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                                            style={vm.selectedSedeId === sede.id ? { background: ACCENT } : undefined}
                                        >
                                            {sede.esPrincipal && <Icon icon="solar:buildings-bold-duotone" width={12} className={vm.selectedSedeId === sede.id ? 'text-white' : 'text-amber-500'} />}
                                            {sede.nombre}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </>
                    )}

                    <div className="relative flex-1 min-w-[200px] lg:max-w-xs lg:ml-auto">
                        <Icon icon="solar:magnifer-linear" className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            value={vm.busqueda}
                            onChange={(e) => vm.setBusqueda(e.target.value)}
                            placeholder={`Buscar ${vm.dimensionMeta.label.toLowerCase()}…`}
                            className="w-full h-10 pl-10 pr-9 rounded-2xl border-2 border-slate-200 bg-white text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-[var(--accent)] transition-colors"
                        />
                        {vm.busqueda && (
                            <button onClick={() => vm.setBusqueda('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500" aria-label="Limpiar búsqueda">
                                <Icon icon="solar:close-circle-bold" />
                            </button>
                        )}
                    </div>
                </div>

                {/* Dimensión — tab strip scrollable en mobile */}
                <div className="mt-4 pt-4 border-t border-slate-100 -mx-4 px-4 overflow-x-auto">
                    <div className="flex items-center gap-1.5 min-w-max" role="tablist" aria-label="Dimensión del reporte">
                        {DIMENSIONES.map((d) => {
                            const active = d.key === vm.dimension;
                            return (
                                <button
                                    key={d.key}
                                    role="tab"
                                    aria-selected={active}
                                    onClick={() => vm.setDimension(d.key)}
                                    className={`h-9 px-3.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap transition-colors ${active ? 'text-white shadow-md shadow-violet-500/20' : 'text-slate-500 hover:bg-slate-100'}`}
                                    style={active ? { background: ACCENT } : undefined}
                                >
                                    <Icon icon={d.icon} width={15} />
                                    {d.label}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
                <KpiCard label="Ventas del periodo" value={formatSoles(vm.reporte.totalVentas)} hint={`${vm.fechaInicio} → ${vm.fechaFin}`} style={KPI_STYLE.ventas} />
                <KpiCard label="Documentos" value={formatNumero(vm.reporte.totalDocumentos)} hint="Comprobantes válidos (sin anulados)" style={KPI_STYLE.docs} />
                <KpiCard label="Ticket promedio" value={formatSoles(vm.ticketPromedio)} hint="Ventas / documentos" style={KPI_STYLE.ticket} />
            </div>

            {/* Gráfico + tabla */}
            <div className="grid grid-cols-1 xl:grid-cols-5 gap-5">
                {/* Top 10 */}
                <div className="xl:col-span-2 bg-white rounded-3xl shadow-[0_2px_20px_rgba(15,23,42,0.05)] p-5">
                    <div className="flex items-center justify-between mb-3">
                        <div>
                            <h3 className="text-sm font-extrabold text-slate-800">Top 10 · {vm.dimensionMeta.label}</h3>
                            <p className="text-xs text-slate-400">Ventas en soles del periodo</p>
                        </div>
                        <Icon icon="solar:chart-square-bold-duotone" width={22} style={{ color: ACCENT }} />
                    </div>
                    {vm.isLoading ? (
                        <div className="h-56 rounded-2xl bg-slate-100 animate-pulse" />
                    ) : chartData.length === 0 ? (
                        <div className="h-56 flex flex-col items-center justify-center gap-2 text-slate-300">
                            <Icon icon="solar:chart-2-linear" width={40} />
                            <p className="text-sm text-slate-400">Sin ventas en este periodo</p>
                        </div>
                    ) : (
                        <div style={{ height: chartHeight }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={chartData} layout="vertical" margin={{ top: 4, right: 16, left: 4, bottom: 0 }} barCategoryGap="22%">
                                    <CartesianGrid horizontal={false} strokeDasharray="3 3" stroke="#eef0f4" />
                                    <XAxis type="number" tickFormatter={(v) => formatCompacto(Number(v))} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                                    <YAxis type="category" dataKey="nombre" width={130} tick={{ fontSize: 11, fill: '#475569' }} axisLine={false} tickLine={false} interval={0} />
                                    <Tooltip
                                        cursor={{ fill: 'rgba(117,81,255,0.06)' }}
                                        content={DarkTooltip(
                                            (v) => formatSoles(v),
                                            (l) => chartData.find((c) => c.nombre === l)?.nombreCompleto ?? String(l ?? ''),
                                        )}
                                    />
                                    <Bar dataKey="Ventas" name="Ventas" radius={[0, 999, 999, 0]} maxBarSize={18}>
                                        {chartData.map((_, i) => (
                                            <Cell key={i} fill={BAR_COLORS[i] ?? BAR_COLORS[BAR_COLORS.length - 1]} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </div>

                {/* Tabla */}
                <div className="xl:col-span-3 bg-white rounded-3xl shadow-[0_2px_20px_rgba(15,23,42,0.05)] overflow-hidden">
                    <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                        <div>
                            <h3 className="text-sm font-extrabold text-slate-800">Ventas por {vm.dimensionMeta.label.toLowerCase()}</h3>
                            <p className="text-xs text-slate-400">
                                {vm.filas.length} {vm.filas.length === 1 ? 'fila' : 'filas'}
                                {vm.busqueda && ` · Búsqueda: "${vm.busqueda}"`}
                            </p>
                        </div>
                    </div>

                    {vm.isLoading ? (
                        <div className="p-4">
                            {Array.from({ length: 8 }).map((_, i) => (
                                <div key={i} className="h-10 rounded-lg bg-slate-100 animate-pulse mb-2" />
                            ))}
                        </div>
                    ) : vm.filas.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 gap-3">
                            <Icon icon="solar:document-text-linear" width={44} className="text-slate-200" />
                            <p className="text-sm text-slate-400">
                                {vm.busqueda ? `Sin resultados para "${vm.busqueda}"` : 'Sin ventas en este periodo'}
                            </p>
                            {vm.busqueda && (
                                <button onClick={() => vm.setBusqueda('')} className="text-xs font-semibold underline" style={{ color: ACCENT }}>
                                    Limpiar búsqueda
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse min-w-[640px]">
                                <thead>
                                    <tr className="text-[11px] font-bold uppercase tracking-wide text-slate-400 border-b border-slate-100">
                                        <th className="py-3 pl-5 pr-2 w-12">#</th>
                                        <th className="py-3 px-3">{vm.dimensionMeta.columna}</th>
                                        <th className="py-3 px-3 text-right">Ventas S/</th>
                                        <th className="py-3 px-3 text-right">% Part.</th>
                                        <th className="py-3 px-3 text-right">Documentos</th>
                                        {esProducto && <th className="py-3 px-3 text-right">Unidades</th>}
                                        <th className="py-3 px-3 pr-5 text-right w-28" />
                                    </tr>
                                </thead>
                                <tbody>
                                    {vm.filas.map((f, idx) => {
                                        const sub = [f.extra?.nroDoc, f.extra?.codigo, f.extra?.categoria, f.extra?.departamento, f.extra?.provincia]
                                            .filter(Boolean)
                                            .join(' · ');
                                        return (
                                            <tr
                                                key={f.clave}
                                                onClick={() => vm.handleVerDetalle(f)}
                                                className="border-b border-slate-50 hover:bg-slate-50/60 cursor-pointer transition-colors group"
                                            >
                                                <td className="py-3.5 pl-5 pr-2 text-sm font-bold text-slate-400">{idx + 1}</td>
                                                <td className="py-3.5 px-3">
                                                    <p className="text-sm font-semibold text-slate-700 leading-tight">{f.nombre}</p>
                                                    {sub && <p className="text-xs text-slate-400 truncate max-w-[320px]">{sub}</p>}
                                                </td>
                                                <td className="py-3.5 px-3 text-right">
                                                    <p className={`text-sm font-bold ${f.ventas < 0 ? 'text-rose-600' : 'text-slate-800'}`}>{formatSoles(f.ventas)}</p>
                                                    <div className="w-24 h-1 bg-slate-100 rounded-full mt-1 ml-auto">
                                                        <div className="h-1 rounded-full" style={{ width: `${Math.min(100, Math.max(0, (f.ventas / maxVentas) * 100))}%`, background: ACCENT }} />
                                                    </div>
                                                </td>
                                                <td className="py-3.5 px-3 text-right text-sm font-semibold text-slate-600">{formatNumero(f.participacion, 2)} %</td>
                                                <td className="py-3.5 px-3 text-right text-sm text-slate-500">{formatNumero(f.documentos)}</td>
                                                {esProducto && <td className="py-3.5 px-3 text-right text-sm text-slate-500">{formatNumero(f.unidades ?? 0, 2)}</td>}
                                                <td className="py-3.5 px-3 pr-5 text-right">
                                                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-400 group-hover:text-[var(--accent)] transition-colors whitespace-nowrap">
                                                        Ver detalle
                                                        <Icon icon="solar:alt-arrow-right-linear" width={14} />
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                                <tfoot>
                                    <tr className="bg-slate-50/70 text-sm">
                                        <td className="py-3 pl-5 pr-2" />
                                        <td className="py-3 px-3 font-bold text-slate-500">Total del periodo</td>
                                        <td className="py-3 px-3 text-right font-extrabold text-slate-800">{formatSoles(vm.reporte.totalVentas)}</td>
                                        <td className="py-3 px-3 text-right font-semibold text-slate-500">100 %</td>
                                        <td className="py-3 px-3 text-right font-semibold text-slate-500">{formatNumero(vm.reporte.totalDocumentos)}</td>
                                        {esProducto && <td className="py-3 px-3" />}
                                        <td className="py-3 px-3 pr-5" />
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            <ReporteDetalleDrawer
                fila={vm.filaSeleccionada}
                dimension={vm.dimensionMeta}
                detalle={vm.detalle}
                isLoading={vm.isLoadingDetalle}
                fechaInicio={vm.fechaInicio}
                fechaFin={vm.fechaFin}
                onClose={vm.handleCerrarDetalle}
            />
        </div>
    );
}
