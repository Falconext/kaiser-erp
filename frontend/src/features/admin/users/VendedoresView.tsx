import { Icon } from '@iconify/react';
import moment from 'moment';
import { Calendar } from '@/components/Date';
import { useVendedoresViewModel } from './useVendedoresViewModel';
import { VendedorDetalleDrawer } from './components/VendedorDetalleDrawer';
import { MEDALLAS } from './VendedoresModel';

const ACCENT = 'var(--accent, #7551FF)';

function CrecimientoBadge({ pct }: { pct: number | null }) {
    if (pct === null) return <span className="text-xs text-slate-300 dark:text-slate-600">—</span>;
    const positivo = pct >= 0;
    return (
        <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full ${positivo ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${positivo ? 'bg-emerald-500' : 'bg-rose-500'}`} />
            {positivo ? '+' : '−'}{Math.abs(pct).toFixed(1)}%
        </span>
    );
}

export default function VendedoresView() {
    const vm = useVendedoresViewModel();

    const topVendedor = vm.rankingTotal[0];
    const maxVentas = topVendedor?.totalVentas ?? 1;

    // Podio usa el ranking sin filtrar por vendedor (solo sede+fecha)
    const podioData = vm.rankingTotal.slice(0, 3);
    const hayFiltroVendedor = vm.vendedorSearch.trim().length > 0;

    return (
        <div className="min-h-screen -m-5 p-5 bg-[#F7F8FB] font-jakarta">

            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm text-slate-400 mb-5">
                <Icon icon="solar:home-smile-linear" className="text-base" />
                <span>Panel</span>
                <Icon icon="solar:alt-arrow-right-linear" className="text-xs" />
                <span>Equipo</span>
                <Icon icon="solar:alt-arrow-right-linear" className="text-xs" />
                <span className="font-semibold" style={{ color: ACCENT }}>Ranking Vendedores</span>
            </div>

            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-5">
                <div className="min-w-0">
                    <h1 className="text-[22px] font-extrabold text-slate-800 tracking-tight">Ranking Vendedores</h1>
                    <p className="text-sm text-slate-400 mt-0.5">Desempeño de tu equipo de ventas</p>
                </div>

                {/* Buscador vendedor */}
                <div className="relative flex-1 lg:w-80 lg:flex-none">
                    <Icon icon="solar:magnifer-linear" className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        value={vm.vendedorSearch}
                        onChange={(e) => vm.setVendedorSearch(e.target.value)}
                        placeholder="Buscar por nombre o email…"
                        className="w-full h-11 pl-10 pr-9 rounded-2xl border-2 border-slate-200 bg-white text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-[var(--accent)] transition-colors"
                    />
                    {vm.vendedorSearch && (
                        <button
                            onClick={() => vm.setVendedorSearch('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500"
                        >
                            <Icon icon="solar:close-circle-bold" />
                        </button>
                    )}
                </div>
            </div>

            {/* Card de filtros */}
            <div className="bg-white rounded-3xl shadow-[0_2px_20px_rgba(15,23,42,0.05)] p-4 mb-5">
                <div className="flex flex-wrap gap-3 items-end">

                    {/* Fechas */}
                    <div className="flex items-end gap-2 flex-wrap">
                        <Calendar
                            text="Desde"
                            name="fechaInicio"
                            value={moment(vm.fechaInicio).format('DD/MM/YYYY')}
                            onChange={vm.handleDateChange}
                        />
                        <Calendar
                            text="Hasta"
                            name="fechaFin"
                            value={moment(vm.fechaFin).format('DD/MM/YYYY')}
                            onChange={vm.handleDateChange}
                        />
                        <button
                            onClick={vm.handleAplicarFiltro}
                            className="h-9 px-3.5 rounded-xl text-white text-sm font-bold flex items-center gap-1.5 shadow-lg shadow-violet-500/30 hover:brightness-105 transition-all"
                            style={{ background: ACCENT }}
                            title="Actualizar ranking"
                        >
                            <Icon icon="solar:refresh-linear" className={vm.isLoadingRanking ? 'animate-spin' : ''} />
                            <span className="hidden sm:inline">Actualizar</span>
                        </button>
                    </div>

                    {/* Divisor vertical */}
                    {vm.sedes.length > 1 && (
                        <div className="hidden md:block w-px h-10 bg-slate-100 self-end mb-1" />
                    )}

                    {/* Filtro sede */}
                    {vm.sedes.length > 1 && (
                        <div className="flex flex-col gap-1.5 min-w-[180px]">
                            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">
                                Sede
                            </label>
                            <div className="flex items-center gap-1.5 flex-wrap">
                                <button
                                    onClick={() => vm.handleSelectSede(null)}
                                    className={`h-9 px-3.5 rounded-xl text-xs font-semibold border transition-colors ${
                                        vm.selectedSedeId === null
                                            ? 'text-white border-transparent'
                                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                                    }`}
                                    style={vm.selectedSedeId === null ? { background: ACCENT } : undefined}
                                >
                                    Todas
                                </button>
                                {vm.sedes.map((sede) => (
                                    <button
                                        key={sede.id}
                                        onClick={() => vm.handleSelectSede(sede.id)}
                                        className={`h-9 px-3.5 rounded-xl text-xs font-semibold border transition-colors flex items-center gap-1.5 ${
                                            vm.selectedSedeId === sede.id
                                                ? 'text-white border-transparent'
                                                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                                        }`}
                                        style={vm.selectedSedeId === sede.id ? { background: ACCENT } : undefined}
                                    >
                                        {sede.esPrincipal && (
                                            <Icon icon="solar:buildings-bold-duotone" width={12} className={vm.selectedSedeId === sede.id ? 'text-white' : 'text-amber-500'} />
                                        )}
                                        {sede.nombre}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Badge resumen de filtros activos */}
                {(vm.selectedSedeId !== null || vm.vendedorSearch) && (
                    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100 flex-wrap">
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Filtros activos:</span>
                        {vm.selectedSedeId !== null && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 text-blue-600 rounded-full text-xs font-semibold">
                                <Icon icon="solar:buildings-3-bold-duotone" width={12} />
                                {vm.sedes.find((s) => s.id === vm.selectedSedeId)?.nombre ?? 'Sede'}
                                <button onClick={() => vm.handleSelectSede(null)} className="ml-0.5 hover:text-blue-800">×</button>
                            </span>
                        )}
                        {vm.vendedorSearch && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-violet-50 text-violet-600 rounded-full text-xs font-semibold">
                                <Icon icon="solar:user-bold-duotone" width={12} />
                                "{vm.vendedorSearch}"
                                <button onClick={() => vm.setVendedorSearch('')} className="ml-0.5 hover:text-violet-800">×</button>
                            </span>
                        )}
                        <span className="text-xs text-slate-400">
                            {vm.ranking.length} / {vm.rankingTotal.length} vendedor{vm.rankingTotal.length !== 1 ? 'es' : ''}
                        </span>
                    </div>
                )}
            </div>

            {/* Podio top 3 (sin filtrar por vendedor) */}
            {!vm.isLoadingRanking && podioData.length >= 3 && !hayFiltroVendedor && (
                <div className="grid grid-cols-3 gap-3 mb-5">
                    {[podioData[1], podioData[0], podioData[2]].map((v, i) => {
                        if (!v) return null;
                        const realPos = i === 1 ? 0 : i === 0 ? 1 : 2;
                        const heights = ['h-28', 'h-36', 'h-24'];
                        const bgColors = [
                            'from-slate-50 to-slate-100',
                            'from-amber-50 to-yellow-100',
                            'from-orange-50 to-orange-100',
                        ];
                        return (
                            <button
                                key={v.usuario?.id}
                                onClick={() => v.usuario && vm.handleVerDetalle(v.usuario.id)}
                                className={`flex flex-col items-center justify-end pt-4 pb-3 px-2 rounded-3xl bg-gradient-to-b ${bgColors[realPos]} ${heights[i]} shadow-[0_2px_20px_rgba(15,23,42,0.05)] transition-all hover:scale-[1.02] hover:shadow-md cursor-pointer`}
                            >
                                <span className="text-2xl mb-1">{MEDALLAS[realPos]}</span>
                                <p className="text-xs font-bold text-slate-800 text-center leading-tight truncate w-full">
                                    {v.usuario?.nombre?.split(' ')[0] ?? '—'}
                                </p>
                                <p className="text-[11px] font-extrabold mt-0.5" style={{ color: ACCENT }}>
                                    S/ {v.totalVentas.toFixed(0)}
                                </p>
                            </button>
                        );
                    })}
                </div>
            )}

            {/* Card contenedora — Tabla ranking */}
            <div className="bg-white rounded-3xl shadow-[0_2px_20px_rgba(15,23,42,0.05)] overflow-hidden">
                {vm.isLoadingRanking ? (
                    <div className="p-4">
                        {Array.from({ length: 8 }).map((_, i) => (
                            <div key={i} className="h-10 rounded-lg bg-slate-100 animate-pulse mb-2" />
                        ))}
                    </div>
                ) : vm.ranking.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 gap-3">
                        <Icon icon="solar:users-group-two-rounded-linear" width={44} className="text-slate-200" />
                        <p className="text-sm text-slate-400">
                            {hayFiltroVendedor
                                ? `Sin resultados para "${vm.vendedorSearch}"`
                                : 'Sin ventas en este período'}
                        </p>
                        {hayFiltroVendedor && (
                            <button
                                onClick={() => vm.setVendedorSearch('')}
                                className="text-xs font-semibold underline"
                                style={{ color: ACCENT }}
                            >
                                Limpiar búsqueda
                            </button>
                        )}
                    </div>
                ) : (
                    <>
                        {/* Encabezado con conteo */}
                        {hayFiltroVendedor && (
                            <div className="px-5 py-2.5 border-b border-slate-100 bg-violet-50/50 flex items-center gap-2">
                                <Icon icon="solar:magnifer-bold-duotone" className="text-violet-500" width={14} />
                                <span className="text-xs text-violet-600 font-medium">
                                    Mostrando {vm.ranking.length} de {vm.rankingTotal.length} vendedores · Búsqueda: <strong>"{vm.vendedorSearch}"</strong>
                                </span>
                            </div>
                        )}
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse min-w-[720px]">
                                <thead>
                                    <tr className="text-[11px] font-bold uppercase tracking-wide text-slate-400 border-b border-slate-100">
                                        <th className="py-3 pl-5 pr-2 w-12">#</th>
                                        <th className="py-3 px-3">Vendedor</th>
                                        <th className="py-3 px-3 text-right">Total vendido</th>
                                        <th className="py-3 px-3 text-right hidden sm:table-cell">Comprobantes</th>
                                        <th className="py-3 px-3 text-right hidden md:table-cell">Ticket prom.</th>
                                        <th className="py-3 px-3 text-center hidden md:table-cell">vs anterior</th>
                                        <th className="py-3 px-3 pr-5 w-10" />
                                    </tr>
                                </thead>
                                <tbody>
                                    {vm.ranking.map((v) => {
                                        const isResaltado = hayFiltroVendedor;
                                        return (
                                            <tr
                                                key={v.usuario?.id ?? v.posicion}
                                                onClick={() => v.usuario && vm.handleVerDetalle(v.usuario.id)}
                                                className={`border-b border-slate-50 hover:bg-slate-50/60 cursor-pointer transition-colors group ${isResaltado ? 'bg-violet-50/30' : ''}`}
                                            >
                                                <td className="py-3.5 pl-5 pr-2">
                                                    <span className="text-base">
                                                        {v.posicion <= 3
                                                            ? MEDALLAS[v.posicion - 1]
                                                            : <span className="text-sm font-bold text-slate-400">{v.posicion}</span>
                                                        }
                                                    </span>
                                                </td>
                                                <td className="py-3.5 px-3">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-400 to-indigo-500 grid place-items-center text-white text-xs font-bold shrink-0">
                                                            {v.usuario?.nombre?.charAt(0).toUpperCase() ?? '?'}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="text-sm font-semibold text-slate-700 leading-tight truncate">{v.usuario?.nombre ?? '—'}</p>
                                                            <p className="text-xs text-slate-400 truncate">{v.usuario?.email}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="py-3.5 px-3 text-right">
                                                    <p className="text-sm font-bold text-slate-800">S/ {v.totalVentas.toFixed(2)}</p>
                                                    <div className="w-24 h-1 bg-slate-100 rounded-full mt-1 ml-auto">
                                                        <div
                                                            className="h-1 rounded-full"
                                                            style={{ width: `${Math.min(100, (v.totalVentas / maxVentas) * 100)}%`, background: ACCENT }}
                                                        />
                                                    </div>
                                                </td>
                                                <td className="py-3.5 px-3 text-right text-sm text-slate-500 hidden sm:table-cell">
                                                    {v.numComprobantes}
                                                </td>
                                                <td className="py-3.5 px-3 text-right text-sm text-slate-500 hidden md:table-cell">
                                                    S/ {v.ticketPromedio.toFixed(2)}
                                                </td>
                                                <td className="py-3.5 px-3 text-center hidden md:table-cell">
                                                    <CrecimientoBadge pct={v.crecimientoPct} />
                                                </td>
                                                <td className="py-3.5 px-3 pr-5">
                                                    <Icon icon="solar:alt-arrow-right-linear" width={16} className="text-slate-300 group-hover:text-[var(--accent)] transition-colors" />
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}
            </div>

            {/* Drawer detalle */}
            <VendedorDetalleDrawer
                open={vm.drawerOpen}
                detalle={vm.detalle}
                isLoading={vm.isLoadingDetalle}
                fechaInicio={vm.fechaInicio}
                fechaFin={vm.fechaFin}
                onClose={vm.handleCerrarDrawer}
            />
        </div>
    );
}
