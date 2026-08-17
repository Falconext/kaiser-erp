import { Icon } from '@iconify/react';
import { useLotesViewModel } from './useLotesViewModel';
import { ESTADO_LOTE_OPTIONS, type ILoteGestion } from './LotesModel';
import { Calendar } from '@/components/Date';
import moment from 'moment';
import { useEffect } from 'react';
import { useClientsStore } from '@/zustand/clients';

const ACCENT = 'var(--accent, #7551FF)';

const getBadgeDias = (dias: number) => {
    if (dias < 0) return { label: 'VENCIDO', dot: 'bg-rose-500', cls: 'bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400' };
    if (dias <= 30) return { label: `${dias}d`, dot: 'bg-amber-500', cls: 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400' };
    return { label: 'VIGENTE', dot: 'bg-emerald-500', cls: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400' };
};

export default function LotesView() {
    const vm = useLotesViewModel();
    const { clients: proveedores, getAllClients } = useClientsStore();

    useEffect(() => {
        getAllClients({ limit: 1000, persona: 'PROVEEDOR' });
    }, [getAllClients]);

    return (
        <div className="min-h-screen -m-5 p-5 bg-[#F7F8FB] dark:bg-[#0A0D14] font-jakarta">

            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm text-slate-400 dark:text-gray-500 mb-5">
                <Icon icon="solar:home-smile-linear" className="text-base" />
                <span>Panel</span>
                <Icon icon="solar:alt-arrow-right-linear" className="text-xs" />
                <span>Kardex</span>
                <Icon icon="solar:alt-arrow-right-linear" className="text-xs" />
                <span className="font-semibold" style={{ color: ACCENT }}>Gestión de Lotes</span>
            </div>

            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-5">
                <div className="min-w-0">
                    <h1 className="text-[22px] font-extrabold text-slate-800 dark:text-white tracking-tight">Gestión de Lotes</h1>
                    <p className="text-sm text-slate-400 dark:text-gray-500 mt-0.5">Control FEFO · vencimientos · trazabilidad</p>
                </div>
                <button
                    onClick={vm.exportarExcel}
                    className="h-11 px-4 rounded-2xl text-white text-sm font-bold flex items-center gap-1.5 shadow-lg shadow-violet-500/30 hover:brightness-105 transition-all shrink-0"
                    style={{ background: ACCENT }}
                >
                    <Icon icon="solar:file-download-bold" className="text-lg" />
                    Exportar CSV
                </button>
            </div>

            {/* Banner vencidos */}
            {vm.kpis.vencidosConStock > 0 && (
                <div className="flex items-center gap-3 bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-900/30 rounded-2xl px-5 py-3 mb-5">
                    <Icon icon="solar:danger-triangle-bold" className="text-rose-500 text-2xl flex-shrink-0" />
                    <p className="text-sm font-semibold text-rose-600 dark:text-rose-400">
                        Tienes <strong>{vm.kpis.vencidosConStock} lote{vm.kpis.vencidosConStock !== 1 ? 's' : ''} vencido{vm.kpis.vencidosConStock !== 1 ? 's' : ''}</strong> con stock disponible — requieren acción inmediata.
                    </p>
                    <button onClick={() => vm.setEstado('VENCIDO')} className="ml-auto text-xs font-bold text-rose-600 dark:text-rose-400 underline underline-offset-2 hover:no-underline flex-shrink-0">
                        Ver vencidos
                    </button>
                </div>
            )}

            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
                {[
                    { label: 'Lotes activos', value: vm.kpis.totalActivos, icon: 'solar:box-bold-duotone', color: 'blue' },
                    { label: 'Próximos a vencer', value: vm.kpis.porVencer30d, icon: 'solar:clock-circle-bold-duotone', color: 'amber' },
                    { label: 'Vencidos con stock', value: vm.kpis.vencidosConStock, icon: 'solar:danger-circle-bold-duotone', color: 'rose' },
                    { label: 'Valor en inventario', value: `S/ ${vm.kpis.valorTotalInventario.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, icon: 'solar:wallet-money-bold-duotone', color: 'emerald' },
                ].map((kpi) => (
                    <div key={kpi.label} className="bg-white dark:bg-slate-800 rounded-3xl p-4 shadow-[0_2px_20px_rgba(15,23,42,0.05)] dark:shadow-none">
                        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center mb-3 ${
                            kpi.color === 'blue' ? 'bg-blue-50 dark:bg-blue-900/20' :
                            kpi.color === 'amber' ? 'bg-amber-50 dark:bg-amber-900/20' :
                            kpi.color === 'rose' ? 'bg-rose-50 dark:bg-rose-900/20' :
                            'bg-emerald-50 dark:bg-emerald-900/20'
                        }`}>
                            <Icon icon={kpi.icon} className={`text-xl ${
                                kpi.color === 'blue' ? 'text-blue-600 dark:text-blue-400' :
                                kpi.color === 'amber' ? 'text-amber-600 dark:text-amber-400' :
                                kpi.color === 'rose' ? 'text-rose-600 dark:text-rose-400' :
                                'text-emerald-600 dark:text-emerald-400'
                            }`} />
                        </div>
                        <p className="text-2xl font-extrabold text-slate-800 dark:text-white">{kpi.value}</p>
                        <p className="text-xs text-slate-400 dark:text-gray-500 mt-0.5 font-semibold uppercase tracking-wide">{kpi.label}</p>
                    </div>
                ))}
            </div>

            {/* Filtros */}
            <div className="flex flex-col sm:flex-row gap-3 mb-5">
                <div className="relative flex-1">
                    <Icon icon="solar:magnifer-linear" className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-gray-500 text-lg" />
                    <input
                        type="text"
                        value={vm.search}
                        onChange={(e) => vm.setSearch(e.target.value)}
                        placeholder="Buscar por producto o código de lote..."
                        className="w-full h-11 pl-10 pr-4 rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-700 dark:text-white placeholder:text-slate-400 dark:placeholder:text-gray-500 focus:outline-none focus:border-[var(--accent)] transition-colors"
                    />
                </div>
                <div className="flex gap-2">
                    {ESTADO_LOTE_OPTIONS.map((opt) => (
                        <button
                            key={opt.value}
                            onClick={() => vm.setEstado(opt.value)}
                            className={`h-11 px-3.5 rounded-xl text-xs font-bold transition-colors ${
                                vm.estado === opt.value
                                    ? 'text-white'
                                    : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
                            }`}
                            style={vm.estado === opt.value ? { background: ACCENT } : undefined}
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Tabla */}
            <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-[0_2px_20px_rgba(15,23,42,0.05)] dark:shadow-none overflow-hidden">
                {vm.loading ? (
                    <div className="p-4 space-y-3">
                        {Array.from({ length: 8 }).map((_, i) => (
                            <div key={i} className="h-10 rounded-lg bg-slate-100 dark:bg-slate-700 animate-pulse" />
                        ))}
                    </div>
                ) : vm.lotes.length === 0 ? (
                    <div className="text-center py-16 text-slate-400 dark:text-gray-500">
                        <Icon icon="solar:box-minimalistic-linear" width={48} className="mx-auto mb-3 text-slate-200 dark:text-slate-700" />
                        <p className="font-medium text-slate-500 dark:text-gray-400">No se encontraron lotes</p>
                        <p className="text-sm mt-1">Prueba cambiando el filtro o la búsqueda</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse min-w-[900px]">
                            <thead>
                                <tr className="text-[11px] font-bold uppercase tracking-wide text-slate-400 dark:text-gray-500 border-b border-slate-100 dark:border-slate-700">
                                    {['Producto', 'Lote', 'Vencimiento', 'Stock', 'Costo U.', 'Valor total', 'Ventas', 'Estado', 'Acciones'].map((h) => (
                                        <th key={h} className="px-3 py-3 first:pl-5 last:pr-5">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {vm.lotes.map((lote) => {
                                    const badge = getBadgeDias(lote.diasAlVencimiento);
                                    return (
                                        <tr key={lote.id} className="border-b border-slate-50 dark:border-slate-700/50 hover:bg-slate-50/60 dark:hover:bg-slate-800/50 transition-colors">
                                            <td className="px-3 py-3 pl-5">
                                                <div className="flex items-center gap-2.5 min-w-0">
                                                    <div className="h-8 w-8 rounded-full bg-gradient-to-br from-violet-400 to-indigo-500 text-white grid place-items-center text-xs font-bold shrink-0">
                                                        {(lote.producto.descripcion || '?').charAt(0).toUpperCase()}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="font-semibold text-slate-700 dark:text-slate-200 text-[13px] line-clamp-1">{lote.producto.descripcion}</p>
                                                        <p className="text-[11px] text-slate-400 dark:text-gray-500">{lote.producto.codigo}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-3 py-3 font-mono text-[12px] font-bold text-slate-600 dark:text-slate-300">{lote.lote}</td>
                                            <td className="px-3 py-3">
                                                <p className="text-[12px] text-slate-600 dark:text-slate-300">{moment(lote.fechaVencimiento).format('DD/MM/YYYY')}</p>
                                                <p className={`text-[10px] font-bold mt-0.5 ${lote.diasAlVencimiento < 0 ? 'text-rose-500' : lote.diasAlVencimiento <= 30 ? 'text-amber-500' : 'text-slate-400 dark:text-gray-500'}`}>
                                                    {lote.diasAlVencimiento < 0 ? `Vencido hace ${Math.abs(lote.diasAlVencimiento)}d` : `${lote.diasAlVencimiento}d restantes`}
                                                </p>
                                            </td>
                                            <td className="px-3 py-3 font-bold text-slate-800 dark:text-white">{lote.stockActual}</td>
                                            <td className="px-3 py-3 text-slate-500 dark:text-gray-400">
                                                {lote.costoUnitario != null ? `S/ ${Number(lote.costoUnitario).toFixed(2)}` : '—'}
                                            </td>
                                            <td className="px-3 py-3 font-bold text-slate-800 dark:text-white">
                                                {lote.valorEnStock > 0 ? `S/ ${lote.valorEnStock.toFixed(2)}` : '—'}
                                            </td>
                                            <td className="px-3 py-3">
                                                <button onClick={() => vm.abrirKardex(lote)} className="inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-600 dark:text-slate-300 hover:text-violet-600 dark:hover:text-violet-400 transition-colors bg-slate-100 dark:bg-slate-700 hover:bg-violet-50 dark:hover:bg-violet-900/20 px-2 py-1 rounded-md">
                                                    <Icon icon="solar:cart-check-bold" className="text-[14px]" />
                                                    {lote.totalVentas}
                                                </button>
                                            </td>
                                            <td className="px-3 py-3">
                                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${badge.cls}`}>
                                                    <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                                                    {badge.label}
                                                </span>
                                            </td>
                                            <td className="px-3 py-3 pr-5">
                                                <div className="flex items-center gap-1">
                                                    <button onClick={() => vm.abrirAjuste(lote)} title="Ajustar stock" className="p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-500 dark:text-blue-400 transition-colors">
                                                        <Icon icon="solar:tuning-2-bold" width={15} />
                                                    </button>
                                                    <button onClick={() => vm.abrirEdicion(lote)} title="Editar" className="p-1.5 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/20 text-indigo-500 dark:text-indigo-400 transition-colors">
                                                        <Icon icon="solar:pen-bold" width={15} />
                                                    </button>
                                                    <button onClick={() => vm.setDesactivarModal({ lote, open: true })} title="Desactivar" className="p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-900/20 text-rose-400 transition-colors">
                                                        <Icon icon="solar:trash-bin-trash-bold" width={15} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Paginación */}
                {vm.pages > 1 && (
                    <div className="flex items-center justify-between px-5 py-4 border-t border-slate-100 dark:border-slate-700">
                        <p className="text-sm text-slate-400 dark:text-gray-500">
                            {((vm.page - 1) * vm.limit) + 1}-{Math.min(vm.page * vm.limit, vm.total)} de {vm.total}
                        </p>
                        <div className="flex items-center gap-1">
                            <button onClick={() => vm.setPage(p => Math.max(1, p - 1))} disabled={vm.page === 1}
                                className="h-8 w-8 grid place-items-center rounded-lg text-slate-400 dark:text-gray-500 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 transition-colors">
                                <Icon icon="solar:alt-arrow-left-linear" />
                            </button>
                            <span className="h-8 min-w-8 px-2 grid place-items-center rounded-lg text-sm font-semibold text-white" style={{ background: ACCENT }}>{vm.page}</span>
                            <span className="text-sm text-slate-400 dark:text-gray-500 px-1">de {vm.pages}</span>
                            <button onClick={() => vm.setPage(p => Math.min(vm.pages, p + 1))} disabled={vm.page === vm.pages}
                                className="h-8 w-8 grid place-items-center rounded-lg text-slate-400 dark:text-gray-500 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 transition-colors">
                                <Icon icon="solar:alt-arrow-right-linear" />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* ── Modal Ajustar Stock ── */}
            {vm.ajusteModal.open && vm.ajusteModal.lote && (
                <ModalOverlay onClose={() => vm.setAjusteModal({ lote: null, open: false })}>
                    <ModalHeader icon="solar:tuning-2-bold" title="Ajustar Stock" subtitle={`Lote ${vm.ajusteModal.lote.lote} · Stock actual: ${vm.ajusteModal.lote.stockActual}`} onClose={() => vm.setAjusteModal({ lote: null, open: false })} />
                    <div className="space-y-4 p-6 pt-0">
                        <div className="flex gap-2">
                            {(['INCREMENTO', 'DECREMENTO'] as const).map((t) => (
                                <button key={t} onClick={() => vm.setAjusteForm(f => ({ ...f, tipo: t }))}
                                    className={`flex-1 py-2 rounded-xl text-sm font-bold transition-colors ${vm.ajusteForm.tipo === t ? (t === 'INCREMENTO' ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white') : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}>
                                    {t === 'INCREMENTO' ? '+ Ingreso' : '− Salida'}
                                </button>
                            ))}
                        </div>
                        <FormField label="Cantidad *">
                            <input type="number" min="1" value={vm.ajusteForm.cantidad}
                                onChange={e => vm.setAjusteForm(f => ({ ...f, cantidad: e.target.value }))}
                                className={inputCls} placeholder="0" />
                        </FormField>
                        <FormField label="Motivo (opcional)">
                            <input type="text" value={vm.ajusteForm.motivo}
                                onChange={e => vm.setAjusteForm(f => ({ ...f, motivo: e.target.value }))}
                                className={inputCls} placeholder="Ej: Ajuste por inventario físico" />
                        </FormField>
                        <ModalActions loading={vm.actionLoading} onCancel={() => vm.setAjusteModal({ lote: null, open: false })} onConfirm={vm.guardarAjuste} label="Guardar ajuste" />
                    </div>
                </ModalOverlay>
            )}

            {/* ── Modal Editar Metadatos ── */}
            {vm.editModal.open && vm.editModal.lote && (
                <ModalOverlay onClose={() => vm.setEditModal({ lote: null, open: false })}>
                    <ModalHeader icon="solar:pen-bold" title="Editar Lote" subtitle={vm.editModal.lote.producto.descripcion} onClose={() => vm.setEditModal({ lote: null, open: false })} />
                    <div className="space-y-4 p-6 pt-0">
                        <FormField label="Código de lote">
                            <input type="text" value={vm.editForm.lote} onChange={e => vm.setEditForm(f => ({ ...f, lote: e.target.value }))} className={inputCls} />
                        </FormField>
                        <FormField label="Fecha de vencimiento">
                            <Calendar text="" value={vm.editForm.fechaVencimiento ? moment(vm.editForm.fechaVencimiento).format('DD/MM/YYYY') : ''}
                                onChange={(date: string) => {
                                    const [d, m, y] = date.split('/');
                                    vm.setEditForm(f => ({ ...f, fechaVencimiento: `${y}-${m}-${d}` }));
                                }} name="editFechaVenc" />
                        </FormField>
                        <div className="grid grid-cols-2 gap-3">
                            <FormField label="Costo unitario">
                                <input type="number" step="0.01" value={vm.editForm.costoUnitario} onChange={e => vm.setEditForm(f => ({ ...f, costoUnitario: e.target.value }))} className={inputCls} placeholder="0.00" />
                            </FormField>
                            <FormField label="Proveedor">
                                <select
                                    value={vm.editForm.proveedor}
                                    onChange={e => vm.setEditForm(f => ({ ...f, proveedor: e.target.value }))}
                                    className={inputCls}
                                >
                                    <option value="">-- Seleccionar --</option>
                                    {proveedores.map(p => (
                                        <option key={p.id} value={p.nombre}>{p.nombre}</option>
                                    ))}
                                </select>
                            </FormField>
                        </div>
                        <ModalActions loading={vm.actionLoading} onCancel={() => vm.setEditModal({ lote: null, open: false })} onConfirm={vm.guardarEdicion} label="Guardar cambios" />
                    </div>
                </ModalOverlay>
            )}

            {/* ── Modal Desactivar ── */}
            {vm.desactivarModal.open && vm.desactivarModal.lote && (
                <ModalOverlay onClose={() => vm.setDesactivarModal({ lote: null, open: false })}>
                    <ModalHeader icon="solar:trash-bin-trash-bold" title="Desactivar Lote" subtitle={`Lote ${vm.desactivarModal.lote.lote}`} onClose={() => vm.setDesactivarModal({ lote: null, open: false })} />
                    <div className="p-6 pt-2 space-y-4">
                        <p className="text-sm text-slate-500 dark:text-gray-400">
                            {vm.desactivarModal.lote.stockActual > 0
                                ? <>Este lote tiene <strong>{vm.desactivarModal.lote.stockActual}</strong> unidades en stock. Al desactivarlo se registrará una salida en el kardex.</>
                                : '¿Estás seguro de desactivar este lote? Ya no aparecerá en las opciones de venta.'}
                        </p>
                        <ModalActions loading={vm.actionLoading} onCancel={() => vm.setDesactivarModal({ lote: null, open: false })} onConfirm={vm.guardarDesactivar} label="Sí, desactivar" danger />
                    </div>
                </ModalOverlay>
            )}

            {/* ── Modal Kardex / Ventas ── */}
            {vm.kardexModal.open && vm.kardexModal.lote && (
                <ModalOverlay onClose={() => vm.setKardexModal({ lote: null, open: false })}>
                    <ModalHeader icon="solar:cart-check-bold" title="Historial y Ventas" subtitle={`Lote ${vm.kardexModal.lote.lote} · ${vm.kardexModal.lote.producto.descripcion}`} onClose={() => vm.setKardexModal({ lote: null, open: false })} />
                    <div className="p-6 pt-2 space-y-4 max-h-[60vh] overflow-y-auto custom-scrollbar">
                        {vm.kardexLoading ? (
                            <div className="flex items-center justify-center py-10 text-slate-400 dark:text-gray-500">
                                <Icon icon="solar:spinner-bold" className="text-3xl animate-spin" />
                            </div>
                        ) : vm.kardexData.length === 0 ? (
                            <div className="text-center py-10 text-slate-400 dark:text-gray-500">
                                <p className="font-medium">No hay movimientos registrados.</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {vm.kardexData.map((mov, i) => (
                                    <div key={i} className="flex justify-between items-center bg-slate-50 dark:bg-slate-700/50 p-3 rounded-xl border border-slate-100 dark:border-slate-700">
                                        <div>
                                            <p className="text-[12px] font-bold text-slate-700 dark:text-slate-200">{mov.movimiento.concepto}</p>
                                            <p className="text-[10px] text-slate-400 dark:text-gray-500">{moment(mov.movimiento.fecha).format('DD/MM/YYYY HH:mm')} · {mov.movimiento.usuario?.nombre || 'Sistema'}</p>
                                        </div>
                                        <div>
                                            <span className={`px-2 py-1 text-[11px] font-black rounded-lg ${mov.movimiento.tipoMovimiento === 'INGRESO' ? 'bg-emerald-100 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400' : 'bg-rose-100 dark:bg-rose-900/20 text-rose-700 dark:text-rose-400'}`}>
                                                {mov.movimiento.tipoMovimiento === 'INGRESO' ? '+' : '-'} {mov.cantidad}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </ModalOverlay>
            )}
        </div>
    );
}

// ── Componentes auxiliares locales ──────────────────────────────

const inputCls = "w-full px-3 py-2 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-white focus:ring-2 focus:ring-violet-500 outline-none";

function ModalOverlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
    return (
        <div className="fixed inset-0 top-[-30px] z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50  " onClick={onClose} />
            <div className="relative bg-white dark:bg-slate-800 rounded-3xl shadow-2xl dark:shadow-none w-full max-w-md z-10 font-jakarta">
                {children}
            </div>
        </div>
    );
}

function ModalHeader({ icon, title, subtitle, onClose }: { icon: string; title: string; subtitle: string; onClose: () => void }) {
    return (
        <div className="flex items-center justify-between p-6 pb-4">
            <div className="flex items-center gap-3 flex-1 min-w-0 pr-4">
                <div className="w-9 h-9 bg-violet-50 dark:bg-violet-900/20 rounded-xl flex items-center justify-center shrink-0">
                    <Icon icon={icon} className="text-violet-600 dark:text-violet-400 text-lg" />
                </div>
                <div className="flex-1 min-w-0">
                    <h3 className="font-extrabold text-slate-800 dark:text-white text-base truncate">{title}</h3>
                    <p className="text-xs text-slate-400 dark:text-gray-500 truncate">{subtitle}</p>
                </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors shrink-0">
                <Icon icon="solar:close-circle-linear" className="text-slate-400 dark:text-gray-500 text-xl" />
            </button>
        </div>
    );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">{label}</label>
            {children}
        </div>
    );
}

function ModalActions({ loading, onCancel, onConfirm, label, danger }: { loading: boolean; onCancel: () => void; onConfirm: () => void; label: string; danger?: boolean }) {
    return (
        <div className="flex gap-3">
            <button onClick={onCancel} className="flex-1 py-2.5 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-xl font-bold text-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                Cancelar
            </button>
            <button onClick={onConfirm} disabled={loading}
                className={`flex-1 py-2.5 text-white rounded-xl font-bold text-sm transition-colors disabled:opacity-60 ${danger ? 'bg-rose-600 hover:bg-rose-700' : 'btn-accent'}`}>
                {loading ? 'Guardando...' : label}
            </button>
        </div>
    );
}
