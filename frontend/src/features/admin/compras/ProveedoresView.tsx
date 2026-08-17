import React from 'react';
import { Icon } from '@iconify/react';
import Pagination from '@/components/Pagination';
import ModalConfirm from '@/components/ModalConfirm';
import TableActionMenu from '@/components/TableActionMenu';
import { useProveedoresViewModel } from './useProveedoresViewModel';
import ModalProveedor from '@/pages/admin/compras/ModalProveedor';

const ACCENT = 'var(--accent, #7551FF)';

export default function ProveedoresView() {
    const vm = useProveedoresViewModel();
    const { actions, clients, proveedoresTable, totalClients } = vm;

    const [proveedorEliminar, setProveedorEliminar] = React.useState<any>(null);
    const [eliminando, setEliminando] = React.useState(false);

    const hasRows = proveedoresTable && proveedoresTable.length > 0;

    return (
        <div className="min-h-screen -m-5 p-5 bg-[#F7F8FB] dark:bg-[#0A0D14] font-jakarta">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm text-slate-400 dark:text-gray-400 mb-5">
                <Icon icon="solar:home-smile-linear" className="text-base" />
                <span>Panel</span>
                <Icon icon="solar:alt-arrow-right-linear" className="text-xs" />
                <span>Compras</span>
                <Icon icon="solar:alt-arrow-right-linear" className="text-xs" />
                <span className="font-semibold" style={{ color: ACCENT }}>Proveedores</span>
            </div>

            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-5">
                <div className="min-w-0">
                    <h1 className="text-[22px] font-extrabold text-slate-800 dark:text-white tracking-tight truncate">Proveedores</h1>
                    <p className="text-sm text-slate-400 dark:text-gray-400 mt-0.5">Gestión de proveedores para compras</p>
                </div>
                <div className="flex items-center gap-2.5">
                    <div className="relative flex-1 lg:w-72">
                        <Icon icon="solar:magnifer-linear" className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-gray-400" />
                        <input
                            name="cliente"
                            value={vm.searchClient}
                            onChange={actions.handleSearchChange}
                            placeholder="Buscar proveedor…"
                            className="w-full h-11 pl-10 pr-9 rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-700 dark:text-white placeholder:text-slate-400 dark:placeholder:text-gray-500 focus:outline-none focus:border-[var(--accent)] transition-colors"
                        />
                        {vm.searchClient && (
                            <button
                                type="button"
                                onClick={() => actions.handleSearchChange({ target: { value: '' } } as any)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 dark:text-gray-600 hover:text-slate-500 dark:hover:text-gray-400"
                            >
                                <Icon icon="solar:close-circle-bold" />
                            </button>
                        )}
                    </div>
                    <button
                        onClick={actions.openNewModal}
                        className="h-11 px-4 rounded-2xl text-white text-sm font-bold flex items-center gap-1.5 shadow-lg shadow-violet-500/30 hover:brightness-105 transition-all shrink-0"
                        style={{ background: ACCENT }}
                    >
                        <Icon icon="solar:add-circle-bold" className="text-lg" /> <span className="hidden sm:inline">Nuevo Proveedor</span>
                    </button>
                </div>
            </div>

            {/* Card contenedora */}
            <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-[0_2px_20px_rgba(15,23,42,0.05)] dark:shadow-none overflow-hidden">
                {/* Toolbar */}
                <div className="flex flex-wrap items-center gap-2.5 p-4 border-b border-slate-100 dark:border-slate-700">
                    <span className="h-9 px-3.5 rounded-xl bg-violet-50 dark:bg-violet-900/20 text-sm font-bold flex items-center gap-1.5" style={{ color: ACCENT }}>
                        <Icon icon="solar:users-group-rounded-linear" /> Proveedores
                    </span>
                    <span className="text-sm text-slate-400 dark:text-gray-400 font-medium px-1">{Number(totalClients ?? 0).toLocaleString('es-PE')} resultados</span>
                </div>

                {hasRows ? (
                    <>
                        {/* Tabla */}
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse min-w-[860px]">
                                <thead>
                                    <tr className="text-[11px] font-bold uppercase tracking-wide text-slate-400 dark:text-gray-400 border-b border-slate-100 dark:border-slate-700">
                                        <th className="py-3 pl-5 pr-3">Razón Social / Nombre</th>
                                        <th className="py-3 px-3">Documento</th>
                                        <th className="py-3 px-3">Nro. Doc</th>
                                        <th className="py-3 px-3">Celular</th>
                                        <th className="py-3 px-3">Dirección</th>
                                        <th className="py-3 px-3">Estado</th>
                                        <th className="py-3 px-3 pr-5 text-right">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {proveedoresTable.map((row: any) => {
                                        const nombre = String(row['Razón Social / Nombre'] ?? '');
                                        const activo = row['Estado'] === 'ACTIVO';
                                        return (
                                            <tr key={row.id} className="border-b border-slate-50 dark:border-slate-700 hover:bg-slate-50/60 dark:hover:bg-slate-800/50 transition-colors">
                                                <td className="py-3 pl-5 pr-3">
                                                    <div className="flex items-center gap-2.5 min-w-0">
                                                        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-violet-400 to-indigo-500 text-white grid place-items-center text-xs font-bold shrink-0">
                                                            {(nombre.charAt(0) || '?').toUpperCase()}
                                                        </div>
                                                        <span className="font-semibold text-slate-700 dark:text-slate-200 text-sm truncate max-w-[220px]">{nombre || '—'}</span>
                                                    </div>
                                                </td>
                                                <td className="py-3 px-3">
                                                    {row['Documento'] ? (
                                                        <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400">{row['Documento']}</span>
                                                    ) : <span className="text-slate-300 dark:text-gray-600">—</span>}
                                                </td>
                                                <td className="py-3 px-3 font-mono text-sm text-slate-600 dark:text-gray-400">{row['Nro. Doc'] || '—'}</td>
                                                <td className="py-3 px-3 text-sm text-slate-500 dark:text-gray-400">{row['Celular'] || '—'}</td>
                                                <td className="py-3 px-3 text-sm text-slate-500 dark:text-gray-400 truncate max-w-[220px]">{row['Dirección'] || '—'}</td>
                                                <td className="py-3 px-3">
                                                    {row['Estado'] ? (
                                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${activo ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400' : 'bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400'}`}>
                                                            <span className={`w-1.5 h-1.5 rounded-full ${activo ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                                                            {activo ? 'Activo' : 'Inactivo'}
                                                        </span>
                                                    ) : <span className="text-slate-300 dark:text-gray-600">—</span>}
                                                </td>
                                                <td className="py-3 px-3 pr-5">
                                                    <div className="flex justify-end">
                                                        <div className="relative inline-block" onClick={(e) => e.stopPropagation()}>
                                                            <button
                                                                type="button"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    if (vm.openAccionesId === row.id) {
                                                                        actions.setOpenAccionesId(null);
                                                                        actions.setAnchorEl(null);
                                                                    } else {
                                                                        actions.setOpenAccionesId(row.id);
                                                                        actions.setAnchorEl(e.currentTarget);
                                                                    }
                                                                }}
                                                                className="h-8 w-8 grid place-items-center rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-gray-400 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-slate-700 dark:hover:text-white transition-colors"
                                                            >
                                                                <Icon icon="mdi:dots-vertical" width={18} height={18} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* Paginación */}
                        <div className="p-4 border-t border-slate-100 dark:border-slate-700">
                            <Pagination
                                data={proveedoresTable}
                                optionSelect
                                currentPage={vm.currentPage}
                                indexOfFirstItem={vm.indexOfFirstItem}
                                indexOfLastItem={vm.indexOfLastItem}
                                setcurrentPage={actions.setcurrentPage}
                                setitemsPerPage={actions.setitemsPerPage}
                                pages={vm.pages}
                                total={totalClients}
                            />
                        </div>
                    </>
                ) : (
                    <div className="py-16 text-center">
                        <Icon icon="solar:users-group-rounded-linear" className="text-5xl text-slate-200 dark:text-gray-600 mx-auto mb-2" />
                        <p className="text-slate-400 dark:text-gray-400 text-sm">No se encontraron proveedores</p>
                    </div>
                )}
            </div>

            {/* Actions Dropdown Menu */}
            <TableActionMenu
                isOpen={!!vm.openAccionesId && !!vm.anchorEl}
                anchorEl={vm.anchorEl}
                onClose={() => { actions.setOpenAccionesId(null); actions.setAnchorEl(null); }}
            >
                {vm.openAccionesId && (() => {
                    const rowBase = clients?.find((c: any) => c.id === vm.openAccionesId);
                    if (!rowBase) return null;
                    return (
                        <>
                            <button
                                type="button"
                                onClick={() => actions.openEditModal(rowBase)}
                                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
                            >
                                <Icon icon="material-symbols:edit" width={16} height={16} />
                                <span>Editar</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => actions.openConfirmToggle(rowBase)}
                                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
                            >
                                <Icon icon="mdi:power" width={16} height={16} />
                                <span>{rowBase.estado === 'INACTIVO' ? 'Activar' : 'Desactivar'}</span>
                            </button>
                            <div className="my-1 border-t border-slate-100 dark:border-slate-700" />
                            <button
                                type="button"
                                onClick={() => { setProveedorEliminar(rowBase); actions.closeMenu(); }}
                                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20"
                            >
                                <Icon icon="solar:trash-bin-trash-bold" width={16} height={16} />
                                <span>Eliminar</span>
                            </button>
                        </>
                    );
                })()}
            </TableActionMenu>

            {/* Modals */}
            {vm.isOpenModal && (
                <ModalProveedor
                    setErrors={actions.setErrors}
                    errors={vm.errors}
                    formValues={vm.formValues}
                    setFormValues={actions.setFormValues}
                    isEdit={vm.isEdit}
                    isOpenModal={vm.isOpenModal}
                    setIsOpenModal={(v: boolean) => !v && actions.closeModal()}
                    closeModal={actions.closeModal}
                />
            )}
            {vm.isOpenModalConfirm && (
                <ModalConfirm
                    confirmSubmit={actions.confirmToggleState}
                    isOpenModal={vm.isOpenModalConfirm}
                    setIsOpenModal={actions.setIsOpenModalConfirm}
                    title="Confirmación"
                    information="¿Estás seguro que deseas cambiar el estado del proveedor?"
                />
            )}
            {proveedorEliminar && (
                <ModalConfirm
                    isOpenModal={!!proveedorEliminar}
                    setIsOpenModal={(v: boolean) => { if (!v) setProveedorEliminar(null); }}
                    confirmSubmit={async () => {
                        setEliminando(true);
                        try { await actions.deleteClient(Number(proveedorEliminar.id)); setProveedorEliminar(null); }
                        finally { setEliminando(false); }
                    }}
                    title="Eliminar proveedor"
                    information={`¿Eliminar definitivamente a "${proveedorEliminar.nombre || 'este proveedor'}"? Solo se puede si no tiene compras ni comprobantes asociados; de lo contrario usa Desactivar.`}
                    confirmText="Eliminar"
                    confirmLoading={eliminando}
                />
            )}
        </div>
    );
}
