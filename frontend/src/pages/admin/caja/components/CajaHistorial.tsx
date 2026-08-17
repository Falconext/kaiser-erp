import React, { useEffect, useMemo, useState } from 'react';
import { useCajaStore, MovimientoCaja } from '../../../../zustand/caja';
import { Icon } from '@iconify/react';
import ModalEditarGasto from './ModalEditarGasto';
import ModalConfirm from '@/components/ModalConfirm';
import { Calendar } from '@/components/Date';
import Select from '@/components/Select';
import moment from 'moment';
import { useAuthStore } from '@/zustand/auth';
import { useSedesStore } from '@/zustand/sedes';

const ACCENT = 'var(--accent, #7551FF)';

// Config visual de cada tipo de movimiento (pill con punto de color + icono).
const tipoConfig = (tipo?: string) => {
    switch (tipo) {
        case 'APERTURA':
            return { label: 'Apertura', dot: 'bg-emerald-500', text: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20', icon: 'solar:play-circle-bold' };
        case 'CIERRE':
            return { label: 'Cierre', dot: 'bg-rose-500', text: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-50 dark:bg-rose-900/20', icon: 'solar:stop-circle-bold' };
        case 'INGRESO':
            return { label: 'Ingreso', dot: 'bg-blue-500', text: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/20', icon: 'solar:arrow-right-up-bold' };
        default:
            return { label: 'Egreso', dot: 'bg-amber-500', text: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/20', icon: 'solar:arrow-left-down-bold' };
    }
};

const CajaHistorial: React.FC = () => {
    const {
        historialCaja,
        loading,
        pagination,
        filters,
        obtenerHistorialCaja,
        exportarArqueo,
        eliminarEgreso,
        setFilters,
        clearFilters,
    } = useCajaStore();

    const [egresoEditar, setEgresoEditar] = useState<MovimientoCaja | null>(null);
    const [egresoEliminarId, setEgresoEliminarId] = useState<number | null>(null);
    const [loadingEliminar, setLoadingEliminar] = useState(false);

    const { auth, sedeActiva } = useAuthStore();
    const { sedes, listarSedes } = useSedesStore();

    const isAdmin = auth?.rol === 'ADMIN_EMPRESA' || auth?.rol === 'ADMIN_SISTEMA';
    const esPrincipal = !sedeActiva || sedeActiva.esPrincipal === true;

    const sedesOptions = [
        { id: 0, value: "Todas las sedes" },
        ...sedes.map(s => ({ id: s.id, value: s.esPrincipal ? `${s.nombre}` : s.nombre }))
    ];

    const [localFilters, setLocalFilters] = useState(filters);
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(50);
    const [exporting, setExporting] = useState(false);

    useEffect(() => {
        if (isAdmin && esPrincipal) listarSedes();
    }, [isAdmin, esPrincipal]);

    // Cuando la sede activa cambia y no es principal, aplicar filtro automáticamente
    useEffect(() => {
        if (!esPrincipal && sedeActiva?.id) {
            setFilters({ ...filters, sedeId: sedeActiva.id });
        }
    }, [sedeActiva, esPrincipal]);

    useEffect(() => {
        obtenerHistorialCaja(page, limit);
    }, [page, limit, filters, obtenerHistorialCaja]);

    useEffect(() => {
        setLocalFilters(filters);
    }, [filters]);


    const handleDate = (date: string, name: string) => {
        if (!moment(date, 'DD/MM/YYYY', true).isValid()) return;
        const formatted = moment(date, 'DD/MM/YYYY').format('YYYY-MM-DD');
        setLocalFilters(prev => ({ ...prev, [name]: formatted }));
    };

    const applyFilters = () => {
        setFilters(localFilters);
        setPage(1);
    };

    const handleExport = async () => {
        setExporting(true);
        try {
            await exportarArqueo(localFilters.fechaInicio, localFilters.fechaFin);
        } catch (error) {
            console.error("Error exporting:", error);
        } finally {
            setExporting(false);
        }
    };

    const resetFilters = () => {
        clearFilters();
        const today = moment().format('YYYY-MM-DD');
        setLocalFilters({ fechaInicio: today, fechaFin: today, sedeId: null });
        setPage(1);
    };

    const formatCurrency = (amount: any) => {
        const num = Number(amount) || 0;
        return new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(num);
    };

    const movimientos: any[] = Array.isArray(historialCaja) ? historialCaja : [];

    const total = pagination?.total ?? movimientos.length;
    const totalPages = pagination?.totalPages ?? 1;
    const fromRow = total === 0 ? 0 : (page - 1) * limit + 1;
    const toRow = Math.min(page * limit, total);

    const pageNumbers = useMemo(() => {
        const nums: number[] = [];
        const win = 2;
        for (let i = Math.max(1, page - win); i <= Math.min(totalPages, page + win); i++) nums.push(i);
        if (!nums.includes(1)) nums.unshift(1);
        if (!nums.includes(totalPages)) nums.push(totalPages);
        return [...new Set(nums)].sort((a, b) => a - b);
    }, [page, totalPages]);

    return (
        <div className="animate-in fade-in">
            <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-[0_2px_20px_rgba(15,23,42,0.05)] dark:shadow-none overflow-hidden">
                {/* Sección de filtros */}
                <div className="p-5 border-b border-slate-100 dark:border-slate-700">
                    <div className="flex items-center gap-2.5 mb-4">
                        <div className="h-9 w-9 grid place-items-center rounded-xl bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400 shrink-0">
                            <Icon icon="solar:filter-bold-duotone" className="text-lg" />
                        </div>
                        <h3 className="text-[11px] font-bold uppercase tracking-wide text-slate-400 dark:text-gray-400">Filtros de búsqueda</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-end">
                        <div>
                            <Calendar
                                name="fechaInicio"
                                onChange={handleDate}
                                text="Fecha Inicio"
                                value={localFilters.fechaInicio ? moment(localFilters.fechaInicio).format('DD/MM/YYYY') : ''}
                            />
                        </div>
                        <div>
                            <Calendar
                                name="fechaFin"
                                onChange={handleDate}
                                text="Fecha Fin"
                                value={localFilters.fechaFin ? moment(localFilters.fechaFin).format('DD/MM/YYYY') : ''}
                            />
                        </div>
                        {isAdmin && esPrincipal && (
                            <div>
                                <Select
                                    error=""
                                    label="Sede"
                                    name="sedeId"
                                    defaultValue="Todas las sedes"
                                    onChange={(id: any, _value: string) =>
                                        setLocalFilters(prev => ({ ...prev, sedeId: id === 0 ? null : Number(id) }))
                                    }
                                    options={sedesOptions}
                                />
                            </div>
                        )}
                    </div>
                    <div className="flex flex-wrap gap-2.5 mt-4 justify-end">
                        <button
                            onClick={applyFilters}
                            className="h-10 px-4 rounded-xl text-white text-sm font-bold flex items-center gap-1.5 shadow-lg shadow-violet-500/30 hover:brightness-105 transition-all"
                            style={{ background: ACCENT }}
                        >
                            <Icon icon="solar:filter-bold-duotone" className="text-lg" />
                            Filtrar
                        </button>
                        <button
                            onClick={resetFilters}
                            className="h-10 px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-600 dark:text-gray-400 flex items-center gap-1.5 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                        >
                            <Icon icon="solar:restart-bold-duotone" className="text-lg" />
                            Limpiar
                        </button>
                        <button
                            onClick={handleExport}
                            disabled={exporting}
                            className="h-10 px-4 rounded-xl text-sm font-bold flex items-center gap-1.5 bg-emerald-500 text-white shadow-lg shadow-emerald-500/30 hover:brightness-105 transition-all disabled:opacity-60"
                        >
                            {exporting
                                ? <Icon icon="eos-icons:loading" className="text-lg" />
                                : <Icon icon="solar:file-download-bold-duotone" className="text-lg" />
                            }
                            {exporting ? 'Exportando...' : 'Exportar Excel'}
                        </button>
                    </div>
                </div>

                {/* Tabla */}
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[820px]">
                        <thead>
                            <tr className="text-[11px] font-bold uppercase tracking-wide text-slate-400 dark:text-gray-400 border-b border-slate-100 dark:border-slate-700">
                                <th className="py-3 pl-5 pr-3">Tipo</th>
                                <th className="py-3 px-3">Fecha</th>
                                <th className="py-3 px-3">Usuario</th>
                                <th className="py-3 px-3">Monto</th>
                                <th className="py-3 px-3">Categoría</th>
                                <th className="py-3 px-3">Detalle</th>
                                <th className="py-3 px-3 pr-5 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                Array.from({ length: 8 }).map((_, i) => (
                                    <tr key={i} className="border-b border-slate-50 dark:border-slate-700">
                                        <td colSpan={7} className="py-3.5 px-5">
                                            <div className="h-6 rounded-lg bg-slate-100 dark:bg-slate-700 animate-pulse" />
                                        </td>
                                    </tr>
                                ))
                            ) : movimientos.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="py-16 text-center">
                                        <Icon icon="solar:inbox-linear" className="text-5xl text-slate-200 dark:text-gray-600 mx-auto mb-2" />
                                        <p className="text-slate-400 dark:text-gray-400 text-sm">No hay movimientos para mostrar.</p>
                                    </td>
                                </tr>
                            ) : movimientos.map((mov: any) => {
                                const cfg = tipoConfig(mov.tipoMovimiento);
                                const usuario = mov.usuario?.nombre || mov.usuario?.email || 'Sistema';
                                const detalle = mov.descripcionGasto || mov.observaciones || '';
                                return (
                                    <tr key={mov.id} className="border-b border-slate-50 dark:border-slate-700 hover:bg-slate-50/60 dark:hover:bg-slate-800/50 transition-colors">
                                        <td className="py-3 pl-5 pr-3">
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${cfg.bg} ${cfg.text}`}>
                                                <Icon icon={cfg.icon} className="text-sm" />
                                                {cfg.label}
                                            </span>
                                        </td>
                                        <td className="py-3 px-3 text-sm text-slate-500 dark:text-gray-400 whitespace-nowrap">
                                            {new Date(mov.fecha).toLocaleString('es-PE')}
                                        </td>
                                        <td className="py-3 px-3">
                                            <div className="flex items-center gap-2.5 min-w-0">
                                                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-violet-400 to-indigo-500 text-white grid place-items-center text-xs font-bold shrink-0">
                                                    {usuario.charAt(0).toUpperCase()}
                                                </div>
                                                <span className="font-semibold text-slate-700 dark:text-slate-200 text-sm truncate max-w-[160px]">{usuario}</span>
                                            </div>
                                        </td>
                                        <td className="py-3 px-3 font-bold text-slate-800 dark:text-white text-sm whitespace-nowrap">
                                            {formatCurrency(mov.monto ?? mov.montoInicial ?? mov.montoFinal ?? 0)}
                                        </td>
                                        <td className="py-3 px-3">
                                            {mov.categoriaGasto ? (
                                                <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 whitespace-nowrap">
                                                    {mov.categoriaGasto}
                                                </span>
                                            ) : (
                                                <span className="text-slate-300 dark:text-gray-600">—</span>
                                            )}
                                        </td>
                                        <td className="py-3 px-3">
                                            <span className="text-sm text-slate-500 dark:text-gray-400 max-w-[220px] truncate block">
                                                {detalle || '—'}
                                            </span>
                                        </td>
                                        <td className="py-3 px-3 pr-5">
                                            {mov.tipoMovimiento === 'EGRESO' ? (
                                                <div className="flex items-center justify-end gap-1.5">
                                                    <button
                                                        onClick={() => setEgresoEditar(mov)}
                                                        className="h-8 w-8 grid place-items-center rounded-lg text-slate-400 dark:text-gray-400 hover:bg-violet-50 dark:hover:bg-violet-900/20 hover:text-violet-600 dark:hover:text-violet-400 transition-colors"
                                                        title="Editar gasto"
                                                    >
                                                        <Icon icon="solar:pen-bold" className="text-base" />
                                                    </button>
                                                    <button
                                                        onClick={() => setEgresoEliminarId(mov.id)}
                                                        className="h-8 w-8 grid place-items-center rounded-lg text-slate-400 dark:text-gray-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 hover:text-rose-500 dark:hover:text-rose-400 transition-colors"
                                                        title="Eliminar gasto"
                                                    >
                                                        <Icon icon="solar:trash-bin-trash-bold" className="text-base" />
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="flex justify-end">
                                                    <span className="text-slate-300 dark:text-gray-600">—</span>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {/* Paginación */}
                {pagination && (
                    <div className="flex flex-wrap items-center justify-between gap-3 p-4 border-t border-slate-100 dark:border-slate-700">
                        <span className="text-sm text-slate-400 dark:text-gray-400">{fromRow}-{toRow} de {total.toLocaleString('es-PE')}</span>
                        <div className="flex items-center gap-1">
                            <button disabled={page <= 1} onClick={() => setPage(1)} className="h-8 w-8 grid place-items-center rounded-lg text-slate-400 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30"><Icon icon="solar:double-alt-arrow-left-linear" /></button>
                            <button disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="h-8 w-8 grid place-items-center rounded-lg text-slate-400 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30"><Icon icon="solar:alt-arrow-left-linear" /></button>
                            {pageNumbers.map((n, i) => {
                                const prev = pageNumbers[i - 1];
                                const gap = prev && n - prev > 1;
                                return (
                                    <span key={n} className="flex items-center">
                                        {gap && <span className="px-1 text-slate-300 dark:text-gray-600">…</span>}
                                        <button onClick={() => setPage(n)}
                                            className={`h-8 min-w-8 px-2 grid place-items-center rounded-lg text-sm font-semibold transition-colors ${n === page ? 'text-white' : 'text-slate-500 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
                                            style={n === page ? { background: ACCENT } : undefined}>
                                            {n}
                                        </button>
                                    </span>
                                );
                            })}
                            <button disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} className="h-8 w-8 grid place-items-center rounded-lg text-slate-400 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30"><Icon icon="solar:alt-arrow-right-linear" /></button>
                            <button disabled={page >= totalPages} onClick={() => setPage(totalPages)} className="h-8 w-8 grid place-items-center rounded-lg text-slate-400 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30"><Icon icon="solar:double-alt-arrow-right-linear" /></button>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-slate-400 dark:text-gray-400">
                            <span>Filas/pág</span>
                            <Select
                                label=""
                                name="limit"
                                error=""
                                options={[20, 50, 100].map((n) => ({ id: n, value: String(n) }))}
                                value={String(limit)}
                                onChange={(id) => { setLimit(Number(id)); setPage(1); }}
                            />
                        </div>
                    </div>
                )}
            </div>

            <ModalEditarGasto
                egreso={egresoEditar}
                isOpen={!!egresoEditar}
                onClose={() => setEgresoEditar(null)}
                onSuccess={() => obtenerHistorialCaja(page, limit)}
            />

            <ModalConfirm
                isOpenModal={!!egresoEliminarId}
                setIsOpenModal={(v) => { if (!v) setEgresoEliminarId(null); }}
                title="Eliminar gasto"
                information="¿Seguro que quieres eliminar este gasto? Esta acción no se puede deshacer."
                confirmText="Eliminar"
                confirmLoading={loadingEliminar}
                confirmSubmit={async () => {
                    if (!egresoEliminarId) return;
                    setLoadingEliminar(true);
                    await eliminarEgreso(egresoEliminarId);
                    setLoadingEliminar(false);
                    setEgresoEliminarId(null);
                    obtenerHistorialCaja(page, limit);
                }}
            />
        </div>
    );
};

export default CajaHistorial;
