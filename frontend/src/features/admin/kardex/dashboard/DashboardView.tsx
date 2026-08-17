import { Icon } from '@iconify/react';
import { useNavigate } from 'react-router-dom';
import DataTable from '@/components/Datatable';
import { useDashboardViewModel } from './useDashboardViewModel';
import { useThemeStore, SIDEBAR_COLOR_HEX } from '@/zustand/theme';
import KardexPremiumCharts from './KardexPremiumCharts';

export default function DashboardView() {
    const vm = useDashboardViewModel();
    const { dashboardData, loading, error, charts, helpers, actions } = vm;
    const navigate = useNavigate();
    const sidebarColor = useThemeStore((s) => s.sidebarColor);
    const ACCENT = SIDEBAR_COLOR_HEX[sidebarColor] ?? '#7551FF';

    return (
        <div className="min-h-screen -m-5 p-5 bg-[#F7F8FB] dark:bg-[#0A0D14] font-jakarta">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm text-slate-400 mb-5">
                <Icon icon="solar:home-smile-linear" className="text-base" />
                <span>Panel</span>
                <Icon icon="solar:alt-arrow-right-linear" className="text-xs" />
                <span>Kardex</span>
                <Icon icon="solar:alt-arrow-right-linear" className="text-xs" />
                <span className="font-semibold" style={{ color: ACCENT }}>Dashboard</span>
            </div>

            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
                <div className="min-w-0">
                    <h1 className="text-[22px] font-extrabold text-slate-800 dark:text-white tracking-tight">Dashboard de Inventario</h1>
                    <p className="text-sm text-slate-400 mt-0.5">Resumen general del estado de tu inventario</p>
                </div>
                <button
                    onClick={actions.fetchDashboardData}
                    className="h-11 px-4 rounded-2xl border-2 text-sm font-bold flex items-center gap-1.5 transition-colors shrink-0 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700"
                    style={{ borderColor: `${ACCENT}55`, color: ACCENT }}
                >
                    <Icon icon="solar:refresh-linear" className={loading ? 'animate-spin' : ''} />
                    Actualizar
                </button>
            </div>

            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="bg-white dark:bg-[#111827] rounded-3xl p-5 shadow-[0_2px_20px_rgba(15,23,42,0.05)] dark:shadow-none border border-slate-100 dark:border-slate-800">
                            <div className="h-10 w-10 rounded-2xl bg-slate-100 dark:bg-slate-800 animate-pulse mb-4" />
                            <div className="h-7 w-24 rounded-lg bg-slate-100 dark:bg-slate-800 animate-pulse mb-2" />
                            <div className="h-3 w-32 rounded bg-slate-100 dark:bg-slate-800 animate-pulse" />
                        </div>
                    ))}
                </div>
            ) : error || !dashboardData ? (
                <div className="bg-white dark:bg-[#111827] rounded-3xl shadow-[0_2px_20px_rgba(15,23,42,0.05)] dark:shadow-none border border-slate-100 dark:border-slate-800 p-6">
                    <div className="text-center py-12">
                        <Icon icon="solar:danger-triangle-linear" width={48} height={48} className="text-rose-400 mx-auto mb-4" />
                        <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2">
                            {error || 'Error al cargar dashboard'}
                        </h3>
                        <p className="text-slate-400">
                            No se pudo cargar la información del inventario.
                        </p>
                        <button
                            onClick={actions.fetchDashboardData}
                            className="mt-5 h-11 px-5 rounded-2xl text-white text-sm font-bold shadow-lg shadow-violet-500/30 hover:brightness-105 transition-all"
                            style={{ background: ACCENT }}
                        >
                            Reintentar
                        </button>
                    </div>
                </div>
            ) : (
                <>
                {/* Métricas principales — tarjeta unificada con columnas divididas (estilo dashboard) */}
                {(() => {
                    const kpiCards = [
                        { label: 'Total Productos', value: dashboardData.resumenGeneral.totalProductos.toLocaleString(), sub: 'productos registrados', icon: 'solar:box-bold', tone: 'blue', to: '/administrador/kardex/productos' },
                        { label: 'Valor Inventario', value: helpers.formatCurrency(dashboardData.resumenGeneral.valorTotalInventario), sub: 'valor total en stock', icon: 'solar:wallet-money-bold', tone: 'emerald', to: '/administrador/kardex/productos' },
                        { label: 'Stock Crítico', value: dashboardData.resumenGeneral.productosStockCritico.toLocaleString(), sub: 'productos bajo mínimo', icon: 'solar:danger-triangle-bold', tone: 'amber', to: '/administrador/kardex/productos?soloStockBajo=true' },
                        { label: 'Sin Stock', value: dashboardData.resumenGeneral.productosStockCero.toLocaleString(), sub: 'productos agotados', icon: 'solar:close-circle-bold', tone: 'rose', to: '/administrador/kardex/productos' },
                    ];
                    const toneCls: Record<string, string> = {
                        blue: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400',
                        emerald: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400',
                        amber: 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400',
                        rose: 'bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400',
                    };
                    return (
                        <div className="rounded-3xl bg-white dark:bg-[#111827] shadow-[0_2px_20px_rgba(15,23,42,0.05)] dark:shadow-none border border-slate-100 dark:border-slate-800 overflow-hidden mb-6">
                            <div className="grid grid-cols-2 lg:grid-cols-4">
                                {kpiCards.map((c, idx) => (
                                    <div
                                        key={c.label}
                                        className={`flex flex-col border-slate-100 dark:border-slate-800 lg:border-t-0 ${idx % 2 === 1 ? 'border-l' : ''} ${idx >= 2 ? 'border-t' : ''} ${idx > 0 ? 'lg:border-l' : ''}`}
                                    >
                                        <div className="p-5 flex-1">
                                            <div className="flex items-center gap-1.5 text-slate-400">
                                                <span className="text-[11px] font-black uppercase tracking-wide">{c.label}</span>
                                                <Icon icon="solar:info-circle-linear" className="text-[13px]" />
                                            </div>
                                            <div className="mt-2.5 flex items-start justify-between gap-2">
                                                <div className="min-w-0">
                                                    <p className="text-2xl font-extrabold text-slate-800 dark:text-white truncate">{c.value}</p>
                                                    <p className="mt-1.5 text-xs font-medium text-slate-400">{c.sub}</p>
                                                </div>
                                                <div className={`shrink-0 w-11 h-11 rounded-2xl flex items-center justify-center ${toneCls[c.tone]}`}>
                                                    <Icon icon={c.icon} className="text-xl" />
                                                </div>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => navigate(c.to)}
                                            className="group w-full flex items-center justify-center gap-1.5 border-t border-slate-100 dark:border-slate-800 py-3 text-[13px] font-bold text-slate-600 dark:text-gray-300 hover:text-[var(--accent)] transition-colors"
                                        >
                                            Ver detalle <Icon icon="solar:arrow-right-linear" className="transition-transform group-hover:translate-x-0.5" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })()}

                {/* Gráficos premium: estado de stock, top 10 vendidos, top 5 rentables */}
                <KardexPremiumCharts
                    pieData={charts.pieData}
                    topVendidos={charts.topVendidos}
                    topRentables={charts.topRentables}
                    accent={ACCENT}
                />

                {/* Alertas y productos críticos */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
                    {/* Productos con stock crítico */}
                    <div className="bg-white dark:bg-[#111827] rounded-3xl p-6 shadow-[0_2px_20px_rgba(15,23,42,0.05)] dark:shadow-none border border-slate-100 dark:border-slate-800">
                        <div className="flex items-center gap-3 mb-5">
                            <div className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                                <Icon icon="solar:danger-triangle-bold-duotone" className="text-lg" />
                            </div>
                            <h3 className="font-extrabold text-slate-800 dark:text-white text-lg">Stock Crítico</h3>
                        </div>
                        {dashboardData.topProductos.stockCritico.length > 0 ? (
                            <div className="space-y-4">
                                {dashboardData.topProductos.stockCritico.map((producto) => (
                                    <div key={producto.id} className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center shrink-0">
                                            <Icon icon="solar:box-bold" className="text-amber-500 text-xl" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-baseline mb-0.5">
                                                <p className="text-[13px] font-bold text-slate-800 dark:text-white truncate pr-2">{producto.descripcion}</p>
                                                <p className="text-[13px] font-bold text-slate-600 dark:text-slate-300 shrink-0">{helpers.formatCurrency(producto.valorTotal)}</p>
                                            </div>
                                            <div className="flex items-center gap-1 mb-1.5">
                                                <span className="text-xs text-slate-400">{producto.codigo}</span>
                                                <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">· Stock: {producto.stock} / Mín: {producto.stockMinimo}</span>
                                            </div>
                                            <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5">
                                                <div className="h-1.5 rounded-full bg-amber-400" style={{ width: `${Math.min((producto.stock / Math.max(producto.stockMinimo, 1)) * 100, 100)}%` }}></div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-8">
                                <Icon icon="solar:check-circle-linear" className="text-4xl text-emerald-400 mx-auto mb-2" />
                                <p className="text-sm text-slate-400">No hay productos con stock crítico</p>
                            </div>
                        )}
                    </div>

                    {/* Productos obsoletos */}
                    <div className="bg-white dark:bg-[#111827] rounded-3xl p-6 shadow-[0_2px_20px_rgba(15,23,42,0.05)] dark:shadow-none border border-slate-100 dark:border-slate-800">
                        <div className="flex items-center gap-3 mb-5">
                            <div className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 flex items-center justify-center shrink-0">
                                <Icon icon="solar:clock-circle-bold-duotone" className="text-lg" />
                            </div>
                            <h3 className="font-extrabold text-slate-800 dark:text-white text-lg">Productos Obsoletos</h3>
                        </div>
                        {dashboardData.topProductos.obsoletos.length > 0 ? (
                            <div className="space-y-4">
                                {dashboardData.topProductos.obsoletos.map((producto) => (
                                    <div key={producto.id} className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center shrink-0">
                                            <Icon icon="solar:box-bold" className="text-slate-400 text-xl" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-baseline mb-0.5">
                                                <p className="text-[13px] font-bold text-slate-800 dark:text-white truncate pr-2">{producto.descripcion}</p>
                                                <p className="text-[13px] font-bold text-slate-600 dark:text-slate-300 shrink-0">{helpers.formatCurrency(producto.valorInmovilizado)}</p>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <span className="text-xs text-slate-400">{producto.codigo}</span>
                                                <span className="text-xs text-slate-500 dark:text-slate-400">· {producto.diasSinMovimiento} días sin movimiento</span>
                                                <span className="text-xs text-slate-400">· {producto.stock} uds</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-8">
                                <Icon icon="solar:check-circle-linear" className="text-4xl text-emerald-400 mx-auto mb-2" />
                                <p className="text-sm text-slate-400">No hay productos obsoletos detectados</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Movimientos recientes */}
                <div className="bg-white dark:bg-[#111827] rounded-3xl shadow-[0_2px_20px_rgba(15,23,42,0.05)] dark:shadow-none border border-slate-100 dark:border-slate-800 overflow-hidden">
                    <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400 flex items-center justify-center shrink-0">
                            <Icon icon="solar:history-bold-duotone" className="text-lg" />
                        </div>
                        <h3 className="font-extrabold text-slate-800 dark:text-white text-lg">Movimientos Recientes</h3>
                    </div>
                    <div className="p-4">
                        {dashboardData.movimientosRecientes.length > 0 ? (
                            <div className="overflow-x-auto">
                            <DataTable actions={[]} bodyData={dashboardData.movimientosRecientes.map((movimiento) => ({
                                fecha: helpers.formatDate(movimiento.fecha),
                                producto: `${movimiento.producto?.codigo || ''} - ${movimiento.producto?.descripcion || 'Sin descripción'}`.toUpperCase(),
                                concepto: movimiento.concepto,
                                cantidad: movimiento.cantidad,
                            }))}
                                headerColumns={[
                                    { label: 'Fecha', key: 'fecha' },
                                    { label: 'Producto', key: 'producto' },
                                    { label: 'Concepto', key: 'concepto' },
                                    { label: 'Cantidad', key: 'cantidad' },
                                ]} />
                            </div>
                        ) : (
                            <div className="text-center py-8">
                                <Icon icon="solar:inbox-linear" className="text-4xl text-slate-200 dark:text-slate-700 mx-auto mb-2" />
                                <p className="text-sm text-slate-400">No hay movimientos recientes</p>
                            </div>
                        )}
                    </div>
                </div>
                </>
            )}

            {/* ── Sección Farmacéutica ──────────────────────────────── */}
            {!loading && dashboardData?.farmacia && (
                <div className="mt-8">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 bg-violet-50 dark:bg-violet-900/20 rounded-2xl flex items-center justify-center">
                            <Icon icon="solar:medical-kit-bold-duotone" className="text-violet-600 dark:text-violet-400 text-lg" />
                        </div>
                        <h2 className="text-lg font-extrabold text-slate-800 dark:text-white">Control Farmacéutico</h2>
                    </div>

                    {/* KPIs farmacia */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-6">
                        {[
                            {
                                label: 'Lotes vencidos con stock',
                                value: dashboardData.farmacia.lotesVencidos,
                                icon: 'solar:danger-circle-bold-duotone',
                                color: 'rose',
                                action: dashboardData.farmacia.lotesVencidos > 0 ? '⚠️ Requieren acción' : '✅ Sin vencidos',
                            },
                            {
                                label: 'Lotes por vencer <30d',
                                value: dashboardData.farmacia.lotesPorVencer30d,
                                icon: 'solar:clock-circle-bold-duotone',
                                color: 'amber',
                                action: dashboardData.farmacia.lotesPorVencer30d > 0 ? 'Revisar pronto' : '✅ Sin alertas',
                            },
                            {
                                label: 'Valor inmovilizado (vencidos)',
                                value: `S/ ${Number(dashboardData.farmacia.valorLotesVencidos).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                                icon: 'solar:wallet-money-bold-duotone',
                                color: dashboardData.farmacia.valorLotesVencidos > 0 ? 'rose' : 'emerald',
                                action: dashboardData.farmacia.valorLotesVencidos > 0 ? 'Dar de baja o devolver' : '✅ Sin valor inmovilizado',
                            },
                        ].map((kpi) => (
                            <div key={kpi.label} className="bg-white dark:bg-[#111827] rounded-3xl p-5 shadow-[0_2px_20px_rgba(15,23,42,0.05)] dark:shadow-none border border-slate-100 dark:border-slate-800">
                                <div className={`w-11 h-11 rounded-2xl flex items-center justify-center mb-3 ${kpi.color === 'rose' ? 'bg-rose-50 dark:bg-rose-900/20' : kpi.color === 'amber' ? 'bg-amber-50 dark:bg-amber-900/20' : 'bg-emerald-50 dark:bg-emerald-900/20'}`}>
                                    <Icon icon={kpi.icon} className={`text-xl ${kpi.color === 'rose' ? 'text-rose-600 dark:text-rose-400' : kpi.color === 'amber' ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`} />
                                </div>
                                <p className="text-2xl font-extrabold text-slate-800 dark:text-white">{kpi.value}</p>
                                <p className="text-xs text-slate-400 mt-0.5 font-medium">{kpi.label}</p>
                                <p className={`text-xs font-semibold mt-1.5 ${kpi.color === 'rose' && String(kpi.value) !== '0' && kpi.value !== 0 ? 'text-rose-500' : kpi.color === 'amber' && String(kpi.value) !== '0' && kpi.value !== 0 ? 'text-amber-500' : 'text-emerald-500'}`}>{kpi.action}</p>
                            </div>
                        ))}
                    </div>

                    {/* Tablas top lotes */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                        {/* Por vencer */}
                        <div className="bg-white dark:bg-[#111827] rounded-3xl shadow-[0_2px_20px_rgba(15,23,42,0.05)] dark:shadow-none border border-slate-100 dark:border-slate-800 overflow-hidden">
                            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
                                <h3 className="font-extrabold text-sm text-slate-700 dark:text-slate-200 flex items-center gap-2">
                                    <Icon icon="solar:clock-circle-bold" className="text-amber-500" />
                                    Próximos a vencer
                                </h3>
                                <a href="/administrador/kardex/lotes" className="text-xs font-semibold hover:underline" style={{ color: ACCENT }}>Ver todos →</a>
                            </div>
                            {dashboardData.farmacia.top5PorVencer.length === 0 ? (
                                <div className="text-center py-8 text-slate-400 text-sm">Sin lotes por vencer en 30 días ✅</div>
                            ) : (
                                <div className="divide-y divide-slate-50 dark:divide-slate-800">
                                    {dashboardData.farmacia.top5PorVencer.map((l: any) => (
                                        <div key={l.id} className="flex items-center justify-between px-5 py-3 hover:bg-slate-50/60 dark:hover:bg-slate-800/60 transition-colors">
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-semibold text-slate-800 dark:text-white truncate">{l.producto.descripcion}</p>
                                                <p className="text-xs text-slate-400 font-mono">{l.lote} · Stock: {l.stockActual}</p>
                                            </div>
                                            <span className="ml-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 flex-shrink-0">
                                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> {l.diasAlVencimiento}d
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Vencidos con stock */}
                        <div className="bg-white dark:bg-[#111827] rounded-3xl shadow-[0_2px_20px_rgba(15,23,42,0.05)] dark:shadow-none border border-slate-100 dark:border-slate-800 overflow-hidden">
                            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
                                <h3 className="font-extrabold text-sm text-slate-700 dark:text-slate-200 flex items-center gap-2">
                                    <Icon icon="solar:danger-circle-bold" className="text-rose-500" />
                                    Vencidos con stock
                                </h3>
                                <a href="/administrador/kardex/lotes" className="text-xs font-semibold hover:underline" style={{ color: ACCENT }}>Ver todos →</a>
                            </div>
                            {dashboardData.farmacia.top5Vencidos.length === 0 ? (
                                <div className="text-center py-8 text-slate-400 text-sm">Sin lotes vencidos con stock ✅</div>
                            ) : (
                                <div className="divide-y divide-slate-50 dark:divide-slate-800">
                                    {dashboardData.farmacia.top5Vencidos.map((l: any) => (
                                        <div key={l.id} className="flex items-center justify-between px-5 py-3 hover:bg-slate-50/60 dark:hover:bg-slate-800/60 transition-colors">
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-semibold text-slate-800 dark:text-white truncate">{l.producto.descripcion}</p>
                                                <p className="text-xs text-slate-400 font-mono">{l.lote} · Stock: {l.stockActual}</p>
                                            </div>
                                            <span className="ml-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 flex-shrink-0">
                                                <span className="w-1.5 h-1.5 rounded-full bg-rose-500" /> Vencido
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
