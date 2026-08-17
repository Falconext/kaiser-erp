import { useSedesViewModel } from '@/features/admin/sedes/useSedesViewModel';
import { Icon } from '@iconify/react';
import Loading from '@/components/Loading';
import ModalConfirm from '@/components/ModalConfirm';
import SedeModal from './SedeModal';

const ACCENT = 'var(--accent, #7551FF)';

const SedesIndex = () => {
    const vm = useSedesViewModel();

    if (vm.loading && vm.sedes.length === 0) return <Loading />;

    return (
        <div className="min-h-screen -m-5 p-5 bg-[#F7F8FB] dark:bg-[#0A0D14] font-jakarta">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm text-slate-400 dark:text-gray-400 mb-5">
                <Icon icon="solar:home-smile-linear" className="text-base" />
                <span>Panel</span>
                <Icon icon="solar:alt-arrow-right-linear" className="text-xs" />
                <span>Configuración</span>
                <Icon icon="solar:alt-arrow-right-linear" className="text-xs" />
                <span className="font-semibold" style={{ color: ACCENT }}>Sedes</span>
            </div>

            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-5">
                <div className="min-w-0">
                    <h1 className="text-[22px] font-extrabold text-slate-800 dark:text-white tracking-tight truncate">Gestión de Sedes</h1>
                    <p className="text-sm text-slate-400 dark:text-gray-400 mt-0.5">Administra las sucursales y almacenes del sistema</p>
                </div>
                <button
                    onClick={vm.handleCreate}
                    className="h-11 px-4 rounded-2xl text-white text-sm font-bold flex items-center gap-1.5 shadow-lg shadow-violet-500/30 hover:brightness-105 transition-all shrink-0 self-start lg:self-auto"
                    style={{ background: ACCENT }}
                >
                    <Icon icon="solar:add-circle-bold" className="text-lg" /> Nueva Sede
                </button>
            </div>

            {/* Card contenedora */}
            <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-[0_2px_20px_rgba(15,23,42,0.05)] dark:shadow-none overflow-hidden">
                {/* Toolbar */}
                <div className="flex flex-wrap items-center gap-2.5 p-4 border-b border-slate-100 dark:border-slate-700">
                    <div className="h-9 w-9 grid place-items-center rounded-xl bg-violet-50 text-violet-600 dark:bg-violet-900/20 dark:text-violet-400 shrink-0">
                        <Icon icon="solar:city-bold-duotone" width={18} />
                    </div>
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Sucursales y almacenes</span>
                    <span className="text-sm text-slate-400 dark:text-gray-400 font-medium px-1">{vm.sedes.length.toLocaleString('es-PE')} registradas</span>
                </div>

                {/* Tabla */}
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[820px]">
                        <thead>
                            <tr className="text-[11px] font-bold uppercase tracking-wide text-slate-400 dark:text-gray-400 border-b border-slate-100 dark:border-slate-700">
                                <th className="py-3 pl-5 pr-3">Nombre</th>
                                <th className="py-3 px-3">Dirección</th>
                                <th className="py-3 px-3">Código</th>
                                <th className="py-3 px-3">Tipo</th>
                                <th className="py-3 px-3">Estado</th>
                                <th className="py-3 px-3 pr-5 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {vm.sedes.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="py-16 text-center">
                                        <Icon icon="solar:city-linear" className="text-5xl text-slate-200 dark:text-gray-700 mx-auto mb-2" />
                                        <p className="text-slate-400 dark:text-gray-400 text-sm">No hay sedes registradas.</p>
                                    </td>
                                </tr>
                            ) : vm.sedes.map((sede) => {
                                const isActivo = (sede as any).activo !== false;
                                const esAlmacen = sede.tipo === 'ALMACEN';
                                const canDelete = !sede.esPrincipal && isActivo;
                                return (
                                    <tr key={sede.id} className="border-b border-slate-50 dark:border-slate-800 hover:bg-slate-50/60 dark:hover:bg-slate-800/50 transition-colors group">
                                        <td className="py-3 pl-5 pr-3">
                                            <div className="flex items-center gap-2.5 min-w-0">
                                                <div className={`h-8 w-8 rounded-xl grid place-items-center shrink-0 ${esAlmacen ? 'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400' : 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400'}`}>
                                                    <Icon icon={esAlmacen ? 'solar:box-bold-duotone' : 'solar:shop-bold-duotone'} width={16} />
                                                </div>
                                                <span className="font-semibold text-slate-700 dark:text-slate-200 text-sm truncate max-w-[220px]">{sede.nombre}</span>
                                            </div>
                                        </td>
                                        <td className="py-3 px-3 text-sm text-slate-500 dark:text-gray-400 truncate max-w-[240px]">{sede.direccion || '—'}</td>
                                        <td className="py-3 px-3">
                                            <span className="font-mono text-sm text-slate-600 dark:text-slate-300">{sede.codigo || '—'}</span>
                                        </td>
                                        <td className="py-3 px-3">
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${esAlmacen ? 'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400' : 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400'}`}>
                                                <Icon icon={esAlmacen ? 'solar:box-bold-duotone' : 'solar:shop-bold-duotone'} width={12} />
                                                {esAlmacen ? 'Almacén' : 'Punto de Venta'}
                                                {sede.esPrincipal && !esAlmacen && (
                                                    <span className="ml-0.5 px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400 uppercase">Principal</span>
                                                )}
                                            </span>
                                        </td>
                                        <td className="py-3 px-3">
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${isActivo ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400' : 'bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400'}`}>
                                                <span className={`w-1.5 h-1.5 rounded-full ${isActivo ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                                                {isActivo ? 'Activo' : 'Inactivo'}
                                            </span>
                                        </td>
                                        <td className="py-3 px-3 pr-5">
                                            <div className="flex items-center justify-end gap-1.5">
                                                <button
                                                    onClick={() => vm.handleEdit(sede)}
                                                    title="Editar"
                                                    className="h-8 w-8 grid place-items-center rounded-lg text-slate-400 dark:text-gray-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                                                >
                                                    <Icon icon="solar:pen-bold" width={16} />
                                                </button>
                                                <button
                                                    onClick={() => vm.handleToggleActivo(sede)}
                                                    title="Activar / Desactivar"
                                                    className="h-8 w-8 grid place-items-center rounded-lg text-slate-400 dark:text-gray-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
                                                >
                                                    <Icon icon="solar:power-bold" width={16} />
                                                </button>
                                                {canDelete && (
                                                    <button
                                                        onClick={() => vm.handleDelete(sede)}
                                                        title="Eliminar"
                                                        className="h-8 w-8 grid place-items-center rounded-lg text-slate-400 dark:text-gray-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
                                                    >
                                                        <Icon icon="solar:trash-bin-trash-bold" width={16} />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {vm.showModal && <SedeModal isOpen={vm.showModal} onClose={() => vm.setShowModal(false)} sede={vm.selectedSede} isEdit={vm.isEdit} />}
            {vm.showConfirm && vm.selectedSede && (
                <ModalConfirm isOpenModal={vm.showConfirm} setIsOpenModal={vm.setShowConfirm} title="Eliminar Sede"
                    information={`¿Estás seguro de eliminar permanentemente la sede "${vm.selectedSede.nombre}"? Esto borrará su configuración y stock. Si la sede ya tiene historial de ventas o movimientos, el sistema no te permitirá eliminarla y deberás desactivarla (usando el botón de encendido) en su lugar.`}
                    confirmSubmit={vm.confirmDelete} />
            )}
        </div>
    );
};

export default SedesIndex;
