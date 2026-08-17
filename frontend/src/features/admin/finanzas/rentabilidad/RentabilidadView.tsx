import { useMemo, useState } from 'react';
import { Icon } from '@iconify/react';
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis } from 'recharts';
import { useThemeStore, SIDEBAR_COLOR_HEX } from '@/zustand/theme';
import { RadialGauge, KpiMini, DarkTooltip } from '../shared/dashboardWidgets';
import {
    PnlResponse,
    GastoOperativo,
    EvolucionPoint,
    formatCurrency,
    formatDate,
    formatPercent,
    getMesFullLabel,
    getMesLabel,
    GastoFormData,
    IngresoManual,
    IngresoFormData,
} from './RentabilidadModel';
import PnlTable from './components/PnlTable';
import GastosPanel from './components/GastosPanel';
import IngresosPanel from './components/IngresosPanel';
import GastoFormModal from './components/GastoFormModal';
import IngresoFormModal from './components/IngresoFormModal';
import HistorialFinancieroDrawer from './components/HistorialFinancieroDrawer';

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

interface RentabilidadViewProps {
    mesActual: number;
    anioActual: number;
    pnl: PnlResponse | null;
    evolucion: EvolucionPoint[];
    gastos: GastoOperativo[];
    ingresos: IngresoManual[];
    isLoading: boolean;
    isModalOpen: boolean;
    gastoEditando: GastoOperativo | null;
    isSaving: boolean;
    isIngresoModalOpen: boolean;
    ingresoEditando: IngresoManual | null;
    isSavingIngreso: boolean;
    isCurrentOrFuture: boolean;
    navegarMes: (delta: -1 | 1) => void;
    crearGasto: (data: GastoFormData) => Promise<boolean>;
    actualizarGasto: (id: number, data: Partial<GastoFormData>) => Promise<boolean>;
    eliminarGasto: (id: number) => Promise<boolean>;
    abrirModalCrear: () => void;
    abrirModalEditar: (gasto: GastoOperativo) => void;
    cerrarModal: () => void;
    crearIngreso: (data: IngresoFormData) => Promise<boolean>;
    actualizarIngreso: (id: number, data: Partial<IngresoFormData>) => Promise<boolean>;
    eliminarIngreso: (id: number) => Promise<boolean>;
    abrirModalCrearIngreso: () => void;
    abrirModalEditarIngreso: (ingreso: IngresoManual) => void;
    cerrarModalIngreso: () => void;
}

// ─── Trend badge (para la columna de Utilidad neta) ───────────────────────────

function TrendBadge({ variacion }: { variacion: number | null }) {
    if (variacion === null) return null;
    const isPositive = variacion >= 0;
    return (
        <span
            className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full ${
                isPositive
                    ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400'
                    : 'bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400'
            }`}
        >
            <Icon icon={isPositive ? 'solar:arrow-up-bold' : 'solar:arrow-down-bold'} className="text-[11px]" />
            {formatPercent(variacion)} vs mes ant.
        </span>
    );
}

function DailyProfitCard({ pnl }: { pnl: PnlResponse }) {
    const topDays = pnl.resumenDiario.slice(0, 7);

    return (
        <div className="bg-white dark:bg-[#111827] rounded-3xl p-6 shadow-[0_2px_20px_rgba(15,23,42,0.05)] border border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center">
                        <Icon icon="solar:calendar-mark-bold-duotone" className="text-emerald-600 dark:text-emerald-400 text-xl" />
                    </div>
                    <div>
                        <h3 className="font-extrabold text-slate-800 dark:text-white text-base">Ganancia diaria real</h3>
                        <p className="text-xs text-slate-400">Ventas menos productos, publicidad y gastos diarios</p>
                    </div>
                </div>
                <span className="text-xs font-bold px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-gray-400">
                    Últimos {topDays.length || 0} días
                </span>
            </div>

            {topDays.length === 0 ? (
                <div className="py-10 text-center">
                    <Icon icon="solar:calendar-linear" className="text-4xl text-slate-200 dark:text-slate-700 mx-auto mb-2" />
                    <p className="text-sm text-slate-400">Aún no hay ventas con productos para este período.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                    {topDays.map((day) => {
                        const positive = day.gananciaNeta >= 0;
                        return (
                            <div
                                key={day.fecha}
                                className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 p-4"
                            >
                                <div className="flex items-center justify-between mb-3">
                                    <span className="text-sm font-bold text-slate-800 dark:text-white">{formatDate(day.fecha)}</span>
                                    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${
                                        positive
                                            ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400'
                                            : 'bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400'
                                    }`}>
                                        <span className={`w-1.5 h-1.5 rounded-full ${positive ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                                        Neto {formatPercent(day.margenNeto)}
                                    </span>
                                </div>
                                <div className="space-y-1 text-xs">
                                    <div className="flex justify-between text-slate-500 dark:text-gray-400">
                                        <span>Ventas</span>
                                        <span className="font-semibold text-slate-600 dark:text-gray-300">{formatCurrency(day.ventasNetas)}</span>
                                    </div>
                                    <div className="flex justify-between text-slate-500 dark:text-gray-400">
                                        <span>Costo real</span>
                                        <span className="font-semibold text-slate-600 dark:text-gray-300">{formatCurrency(day.costoMercaderia)}</span>
                                    </div>
                                    <div className="flex justify-between text-slate-500 dark:text-gray-400">
                                        <span>Publicidad</span>
                                        <span className="font-semibold text-slate-600 dark:text-gray-300">{formatCurrency(day.publicidad)}</span>
                                    </div>
                                    <div className="flex justify-between text-slate-500 dark:text-gray-400">
                                        <span>ROAS</span>
                                        <span className="font-semibold text-slate-600 dark:text-gray-300">{day.roas === null ? '-' : `${day.roas.toFixed(2)}x`}</span>
                                    </div>
                                    <div className="flex justify-between text-slate-500 dark:text-gray-400">
                                        <span>Pedidos / costo pub.</span>
                                        <span className="font-semibold text-slate-600 dark:text-gray-300">
                                            {day.pedidos} / {day.costoPublicidadPorPedido === null ? '-' : formatCurrency(day.costoPublicidadPorPedido)}
                                        </span>
                                    </div>
                                    <div className="flex justify-between pt-2 mt-2 border-t border-slate-200 dark:border-slate-700">
                                        <span className="font-bold text-slate-700 dark:text-gray-200">Ganancia neta</span>
                                        <span className={`font-extrabold ${positive ? 'text-emerald-600' : 'text-rose-500'}`}>
                                            {formatCurrency(day.gananciaNeta)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

// ─── Main View ────────────────────────────────────────────────────────────────

export default function RentabilidadView(props: RentabilidadViewProps) {
    const {
        mesActual, anioActual, pnl, evolucion, gastos, ingresos,
        isLoading, isModalOpen, gastoEditando, isSaving, isCurrentOrFuture,
        isIngresoModalOpen, ingresoEditando, isSavingIngreso,
        navegarMes, crearGasto, actualizarGasto, eliminarGasto,
        abrirModalCrear, abrirModalEditar, cerrarModal,
        crearIngreso, actualizarIngreso, eliminarIngreso,
        abrirModalCrearIngreso, abrirModalEditarIngreso, cerrarModalIngreso,
    } = props;

    const isNeta = (pnl?.gananciaNeta ?? 0) >= 0;
    const [isHistorialOpen, setIsHistorialOpen] = useState(false);

    // Acento + tema (mismo lenguaje visual que el dashboard principal)
    const sidebarColor = useThemeStore((s) => s.sidebarColor);
    const ACCENT = SIDEBAR_COLOR_HEX[sidebarColor] ?? '#7551FF';
    const isDarkMode = useThemeStore((s) => s.isDarkMode);
    const mutedBar = isDarkMode ? '#1e293b' : '#eef1f6';

    // Series para las mini-visualizaciones de las tarjetas KPI
    const ventasSpark = useMemo(() => evolucion.map((p) => p.ventasNetas), [evolucion]);
    const netaSpark = useMemo(() => evolucion.map((p) => p.gananciaNeta), [evolucion]);

    // Datos del gráfico de barras (evolución de la ganancia neta)
    const chartData = useMemo(
        () =>
            evolucion.map((p) => ({
                label: `${getMesLabel(p.mes)} ${String(p.anio).slice(-2)}`,
                ganancia: p.gananciaNeta,
            })),
        [evolucion],
    );

    // Rendimiento: margen neto en 0..100 para el medidor
    const margenNeto = pnl?.margenNeto ?? 0;
    const margenGauge = clamp(margenNeto, 0, 100);
    const margenMsg = useMemo(() => {
        if (margenNeto >= 30) return { title: '¡Excelente rentabilidad! ✨', hint: 'Tu margen neto es muy alto. Mantén el control de costos y gastos.' };
        if (margenNeto >= 15) return { title: 'Buen margen 👍', hint: 'Vas por buen camino. Optimiza costos para elevar la utilidad neta.' };
        if (margenNeto > 0) return { title: 'Margen ajustado', hint: 'Reduce gastos operativos o mejora precios para ganar más margen.' };
        return { title: 'Sin utilidad neta', hint: 'Costos y gastos igualan o superan tus ventas en este período.' };
    }, [margenNeto]);

    // Tarjetas KPI unificadas (columnas divididas, estilo dashboard)
    const netaPositiva = (pnl?.gananciaNeta ?? 0) >= 0;
    const kpiCards: {
        label: string;
        value: string;
        mini: 'line' | 'wave' | 'donut' | 'bars';
        data?: number[];
        sub?: string;
        negative?: boolean;
        trend?: number | null;
    }[] = [
        {
            label: 'Ingresos',
            value: formatCurrency(pnl?.ventasNetas ?? 0),
            mini: 'line',
            data: ventasSpark,
            sub: (pnl?.otrosIngresos ?? 0) > 0 ? `+ ${formatCurrency(pnl!.otrosIngresos)} manuales` : 'ventas netas del mes',
        },
        {
            label: 'Costo de mercadería',
            value: formatCurrency(pnl?.costoMercaderia ?? 0),
            mini: 'wave',
            sub: pnl ? `Bruta ${formatCurrency(pnl.gananciaBruta)} · ${formatPercent(pnl.margenBruto)}` : 'sin costo',
        },
        {
            label: 'Gastos op.',
            value: formatCurrency(pnl?.gastosTotales ?? 0),
            mini: 'bars',
            sub: pnl ? `Publicidad ${formatCurrency(pnl.gastoPublicidad)}` : 'sin gastos',
        },
        {
            label: 'Utilidad neta',
            value: formatCurrency(pnl?.gananciaNeta ?? 0),
            mini: 'donut',
            data: netaSpark,
            sub: pnl ? `Margen ${formatPercent(pnl.margenNeto)}` : 'sin resultado',
            negative: !netaPositiva,
            trend: pnl?.comparacion.variacionPorcentaje ?? null,
        },
    ];

    return (
        <div className="space-y-6 font-jakarta">
            {/* ── Month Navigator ── */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-[22px] font-extrabold text-slate-800 dark:text-white tracking-tight">Rentabilidad P&amp;L</h2>
                    <div className="flex items-center gap-3 mt-1">
                        <p className="text-sm text-slate-400">
                            Análisis detallado de ganancias y pérdidas
                        </p>
                        <button onClick={() => setIsHistorialOpen(true)} className="flex items-center gap-1.5 px-3 py-1 bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-300 text-xs font-semibold rounded-xl hover:bg-violet-100 dark:hover:bg-violet-900/30 transition-colors border border-violet-100 dark:border-violet-900/40">
                            <Icon icon="solar:history-bold-duotone" />
                            Ver historial completo
                        </button>
                    </div>
                </div>

                <div className="flex items-center gap-2 bg-white dark:bg-[#111827] border border-slate-100 dark:border-slate-800 rounded-2xl p-1.5 shadow-[0_2px_20px_rgba(15,23,42,0.05)]">
                    <button
                        onClick={() => navegarMes(-1)}
                        className="flex items-center gap-1 px-3 py-2 rounded-xl text-sm font-semibold text-slate-600 dark:text-gray-300 hover:text-[var(--accent)] hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-colors"
                    >
                        <Icon icon="solar:arrow-left-bold" className="text-base" />
                        <span className="hidden sm:inline">Anterior</span>
                    </button>

                    <div className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-violet-50 dark:bg-violet-900/20">
                        <Icon icon="solar:calendar-date-bold-duotone" className="text-[var(--accent)] text-base" />
                        <span className="text-sm font-bold text-violet-700 dark:text-violet-300 whitespace-nowrap">
                            {getMesFullLabel(mesActual)} {anioActual}
                        </span>
                    </div>

                    <button
                        onClick={() => navegarMes(1)}
                        disabled={isCurrentOrFuture}
                        className="flex items-center gap-1 px-3 py-2 rounded-xl text-sm font-semibold text-slate-600 dark:text-gray-300 hover:text-[var(--accent)] hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:text-slate-600 disabled:hover:bg-transparent"
                    >
                        <span className="hidden sm:inline">Siguiente</span>
                        <Icon icon="solar:arrow-right-bold" className="text-base" />
                    </button>
                </div>
            </div>

            {/* ── Loading ── */}
            {isLoading && (
                <>
                    <div className="h-40 rounded-3xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="h-72 rounded-3xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
                        <div className="lg:col-span-2 h-72 rounded-3xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                        <div className="lg:col-span-3 h-72 rounded-3xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
                        <div className="lg:col-span-2 h-72 rounded-3xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
                    </div>
                </>
            )}

            {!isLoading && (
                <>
                    {/* ── Row 1: KPI unificado (tarjeta única con columnas divididas) ── */}
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
                                                <p className={`text-2xl font-extrabold truncate ${c.negative ? 'text-rose-600 dark:text-rose-400' : 'text-slate-800 dark:text-white'}`}>
                                                    {c.value}
                                                </p>
                                                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                                                    {c.trend !== undefined && <TrendBadge variacion={c.trend ?? null} />}
                                                    {c.sub && <span className="text-xs text-slate-400 dark:text-gray-400">{c.sub}</span>}
                                                </div>
                                            </div>
                                            <div className="shrink-0 pt-0.5">
                                                <KpiMini type={c.mini} accent={ACCENT} data={c.data} />
                                            </div>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setIsHistorialOpen(true)}
                                        className="group w-full flex items-center justify-center gap-1.5 border-t border-slate-100 dark:border-slate-800 py-3 text-[13px] font-bold text-slate-600 dark:text-gray-300 hover:text-[var(--accent)] transition-colors"
                                    >
                                        Ver detalle <Icon icon="solar:arrow-right-linear" className="transition-transform group-hover:translate-x-0.5" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* ── Row 2: Rendimiento (medidor) + evolución (barras) ── */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Medidor de margen neto */}
                        <div className="rounded-3xl bg-white dark:bg-[#111827] p-5 shadow-[0_2px_20px_rgba(15,23,42,0.05)] dark:shadow-none border border-slate-100 dark:border-slate-800 flex flex-col">
                            <div className="flex items-center gap-1.5">
                                <h3 className="text-sm font-extrabold text-slate-800 dark:text-white">Rendimiento</h3>
                                <Icon icon="solar:info-circle-linear" className="text-[13px] text-slate-400" />
                            </div>
                            <div className="relative mx-auto mt-3 w-full max-w-[240px]">
                                <div className="h-[128px]"><RadialGauge value={margenGauge} accent={ACCENT} /></div>
                                <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col items-center">
                                    <span className={`text-4xl font-extrabold leading-none ${isNeta ? 'text-slate-800 dark:text-white' : 'text-rose-600 dark:text-rose-400'}`}>
                                        {margenNeto.toFixed(1)}
                                    </span>
                                    <span className="mt-1 text-xs font-medium text-slate-400 dark:text-gray-400">% margen neto</span>
                                </div>
                            </div>
                            <div className="mt-5 border-t border-slate-100 dark:border-slate-800 pt-4">
                                <p className="text-sm font-bold text-slate-700 dark:text-gray-200">{margenMsg.title}</p>
                                <p className="mt-1 text-xs text-slate-400 dark:text-gray-400 leading-relaxed">{margenMsg.hint}</p>
                            </div>
                            <button
                                onClick={() => setIsHistorialOpen(true)}
                                className="group mt-4 flex items-center gap-1.5 text-[13px] font-bold text-slate-700 dark:text-gray-200 hover:text-[var(--accent)] transition-colors"
                            >
                                Ver historial completo <Icon icon="solar:arrow-right-linear" className="transition-transform group-hover:translate-x-0.5" />
                            </button>
                        </div>

                        {/* Barras: evolución de la ganancia neta con tooltip oscuro */}
                        <div className="rounded-3xl bg-white dark:bg-[#111827] p-5 shadow-[0_2px_20px_rgba(15,23,42,0.05)] dark:shadow-none border border-slate-100 dark:border-slate-800 lg:col-span-2">
                            <div className="mb-4 flex items-start justify-between gap-2">
                                <div>
                                    <div className="flex items-center gap-1.5">
                                        <h3 className="text-sm font-extrabold text-slate-800 dark:text-white">Evolución de la ganancia neta</h3>
                                        <Icon icon="solar:info-circle-linear" className="text-[13px] text-slate-400" />
                                    </div>
                                    <p className="mt-0.5 text-xs text-slate-400 dark:text-gray-400">Últimos {chartData.length || 6} meses</p>
                                </div>
                                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-gray-400 bg-slate-50 dark:bg-slate-800 px-2.5 py-1 rounded-full">
                                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: ACCENT }} /> Ganancia neta
                                </span>
                            </div>
                            <div className="h-64">
                                {chartData.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={chartData} margin={{ top: 8, right: 4, left: -12, bottom: 0 }} barCategoryGap="26%">
                                            <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} interval="preserveStartEnd" minTickGap={8} />
                                            <Tooltip cursor={{ fill: 'transparent' }} content={DarkTooltip(formatCurrency)} />
                                            <Bar dataKey="ganancia" name="Ganancia neta" radius={[8, 8, 8, 8]} maxBarSize={38}>
                                                {chartData.map((_, i) => (
                                                    <Cell key={i} fill={i === chartData.length - 1 ? ACCENT : mutedBar} />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="flex h-full flex-col items-center justify-center text-slate-300 dark:text-slate-600">
                                        <Icon icon="solar:chart-2-linear" className="text-5xl mb-2" />
                                        <p className="text-sm text-slate-400 dark:text-gray-400">Sin datos de evolución disponibles</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* ── Row 3: PnlTable + Panels ── */}
                    {pnl ? (
                        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                            {/* P&L Table — 60% */}
                            <div className="lg:col-span-3">
                                <PnlTable pnl={pnl} />
                            </div>
                            {/* Right panels — 40%: Gastos + Ingresos stacked */}
                            <div className="lg:col-span-2 flex flex-col gap-6">
                                <GastosPanel
                                    gastos={gastos}
                                    onAgregar={abrirModalCrear}
                                    onEditar={abrirModalEditar}
                                    onEliminar={eliminarGasto}
                                />
                                <IngresosPanel
                                    ingresos={ingresos}
                                    onAgregar={abrirModalCrearIngreso}
                                    onEditar={abrirModalEditarIngreso}
                                    onEliminar={eliminarIngreso}
                                />
                            </div>
                        </div>
                    ) : (
                        <div className="bg-white dark:bg-[#111827] rounded-3xl p-12 border border-slate-100 dark:border-slate-800 shadow-[0_2px_20px_rgba(15,23,42,0.05)] text-center">
                            <div className="w-16 h-16 rounded-3xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4">
                                <Icon icon="solar:chart-2-linear" className="text-3xl text-slate-300 dark:text-slate-600" />
                            </div>
                            <p className="text-slate-600 dark:text-gray-300 font-semibold">Sin datos para {getMesFullLabel(mesActual)} {anioActual}</p>
                            <p className="text-sm text-slate-400 mt-1">Aún no hay ventas registradas en este período</p>
                        </div>
                    )}

                    {pnl && <DailyProfitCard pnl={pnl} />}
                </>
            )}

            {/* ── Gasto Form Modal ── */}
            <GastoFormModal
                isOpen={isModalOpen}
                mesActual={mesActual}
                anioActual={anioActual}
                gastoEditando={gastoEditando}
                isSaving={isSaving}
                onClose={cerrarModal}
                onCrear={crearGasto}
                onActualizar={actualizarGasto}
            />

            {/* ── Ingreso Form Modal ── */}
            <IngresoFormModal
                isOpen={isIngresoModalOpen}
                mesActual={mesActual}
                anioActual={anioActual}
                ingresoEditando={ingresoEditando}
                isSaving={isSavingIngreso}
                onClose={cerrarModalIngreso}
                onCrear={crearIngreso}
                onActualizar={actualizarIngreso}
            />

            <HistorialFinancieroDrawer
                isOpen={isHistorialOpen}
                onClose={() => setIsHistorialOpen(false)}
                onEditarGasto={abrirModalEditar}
                onEliminarGasto={eliminarGasto}
                onEditarIngreso={abrirModalEditarIngreso}
                onEliminarIngreso={eliminarIngreso}
            />
        </div>
    );
}
