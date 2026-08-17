import React from 'react';
import { Icon } from '@iconify/react';
import DataTable from '@/components/Datatable';
import Pagination from '@/components/Pagination';
import ModalConfirm from '@/components/ModalConfirm';
import TableActionMenu from '@/components/TableActionMenu';
import { useClientsViewModel } from './useClientsViewModel';
import ModalClient from './shared/ModalClient';
import DoctorsView from '@/features/admin/doctors/DoctorsView';
import type { GrupoFarmacia } from './ClientsModel';

const ACCENT = 'var(--accent, #7551FF)';

const GRUPO_TABS: { id: GrupoFarmacia; label: string; icon: string }[] = [
    { id: 'pacientes', label: 'Pacientes', icon: 'solar:user-heart-bold-duotone' },
    { id: 'empresas',  label: 'Empresas',  icon: 'solar:buildings-bold-duotone' },
    { id: 'medicos',   label: 'Médicos',   icon: 'solar:stethoscope-bold-duotone' },
];

export default function ClientsView() {
    const vm = useClientsViewModel();
    const { actions, clients, clientsTable, totalClients, isFarmacia } = vm;

    const [showOptionsDropdown, setShowOptionsDropdown] = React.useState(false);
    const [clienteEliminar, setClienteEliminar] = React.useState<any>(null);
    const [eliminando, setEliminando] = React.useState(false);
    const dropdownRef = React.useRef<HTMLDivElement>(null);
    React.useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setShowOptionsDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const grupoActivo = vm.grupoFarmacia;
    const isMedicos = isFarmacia && grupoActivo === 'medicos';

    const headerInfo = isFarmacia
        ? grupoActivo === 'pacientes'
            ? { title: 'Pacientes',  sub: 'Registro de pacientes de la farmacia' }
            : grupoActivo === 'empresas'
            ? { title: 'Empresas',   sub: 'Distribuidoras y empresas farmacéuticas' }
            : { title: 'Médicos',    sub: 'Directorio de médicos prescriptores' }
        : { title: 'Clientes', sub: 'Gestiona tu cartera de clientes' };

    const nuevoLabel = isFarmacia && grupoActivo === 'pacientes' ? 'Nuevo paciente'
        : isFarmacia && grupoActivo === 'empresas' ? 'Nueva empresa'
        : 'Nuevo cliente';

    return (
        <div className="min-h-screen -m-5 p-5 bg-[#F7F8FB] dark:bg-[#0A0D14] font-jakarta">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm text-slate-400 dark:text-gray-500 mb-5">
                <Icon icon="solar:home-smile-linear" className="text-base" />
                <span>Panel</span>
                <Icon icon="solar:alt-arrow-right-linear" className="text-xs" />
                <span>Contactos</span>
                <Icon icon="solar:alt-arrow-right-linear" className="text-xs" />
                <span className="font-semibold" style={{ color: ACCENT }}>{headerInfo.title}</span>
            </div>

            {/* Header — siempre visible */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-5">
                <div className="min-w-0">
                    <h1 className="text-[22px] font-extrabold text-slate-800 dark:text-white tracking-tight">{headerInfo.title}</h1>
                    <p className="text-sm text-slate-400 dark:text-gray-500 mt-0.5">{headerInfo.sub}</p>
                </div>
                {/* Botón nuevo — Médicos tiene su propio botón en la toolbar */}
                {!isMedicos && (
                    <button
                        onClick={actions.openNewModal}
                        className="h-11 px-4 rounded-2xl text-white text-sm font-bold flex items-center gap-1.5 shadow-lg shadow-violet-500/30 hover:brightness-105 transition-all shrink-0"
                        style={{ background: ACCENT }}
                    >
                        <Icon icon="solar:add-circle-bold" className="text-lg" />
                        {nuevoLabel}
                    </button>
                )}
            </div>

            {/* Tabs farmacia */}
            {isFarmacia && (
                <div className="flex flex-wrap gap-2 mb-5">
                    {GRUPO_TABS.map(tab => {
                        const active = grupoActivo === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => actions.setGrupoFarmacia(tab.id)}
                                className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-sm font-semibold transition-all ${
                                    active
                                        ? 'text-white shadow-lg shadow-violet-500/30'
                                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
                                }`}
                                style={active ? { background: ACCENT } : undefined}
                            >
                                <Icon icon={tab.icon} width={18} />
                                {tab.label}
                            </button>
                        );
                    })}
                </div>
            )}

            {/* Tab Médicos — misma card que Pacientes/Empresas */}
            {isMedicos && (
                <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-[0_2px_20px_rgba(15,23,42,0.05)] dark:shadow-none overflow-hidden">
                    <DoctorsView embedded />
                </div>
            )}

            {/* Main Content Card — Pacientes / Empresas / todos */}
            {!isMedicos && <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-[0_2px_20px_rgba(15,23,42,0.05)] dark:shadow-none overflow-hidden">
                {/* Search and Actions Toolbar */}
                <div className="flex flex-wrap items-center gap-2.5 p-4 border-b border-slate-100 dark:border-slate-700 relative z-50">
                    <div className="relative flex-1 min-w-[220px]">
                        <Icon icon="solar:magnifer-linear" className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-gray-500" />
                        <input
                            name="cliente"
                            value={vm.searchClient}
                            onChange={actions.handleSearchChange}
                            placeholder="Buscar por cliente y RUC…"
                            className="w-full h-11 pl-10 pr-4 rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-700 dark:text-white placeholder:text-slate-400 dark:placeholder:text-gray-500 focus:outline-none focus:border-[var(--accent)] transition-colors"
                        />
                    </div>

                    <span className="text-sm text-slate-400 dark:text-gray-500 font-medium px-1 hidden sm:inline">
                        {Number(totalClients ?? 0).toLocaleString('es-PE')} resultados
                    </span>

                    <div className="ml-auto flex flex-wrap gap-2 items-center">
                        <div className="relative inline-block" ref={dropdownRef}>
                            <button
                                onClick={() => setShowOptionsDropdown(!showOptionsDropdown)}
                                className="h-9 px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1.5 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                            >
                                <Icon icon="solar:file-bold-duotone" width={16} className="text-emerald-500" />
                                Excel / CSV
                                <Icon icon={showOptionsDropdown ? 'solar:alt-arrow-up-linear' : 'solar:alt-arrow-down-linear'} width={14} />
                            </button>

                            {showOptionsDropdown && (
                                <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl shadow-xl dark:shadow-none z-50 overflow-hidden py-1.5">
                                    <input
                                        type="file"
                                        accept=".xlsx, .xls"
                                        ref={vm.fileInputRef}
                                        onChange={(e) => {
                                            actions.handleImportExcel(e);
                                            setShowOptionsDropdown(false);
                                        }}
                                        className="hidden"
                                    />
                                    <button
                                        onClick={() => { actions.exportClients(); setShowOptionsDropdown(false); }}
                                        className="w-full flex items-center gap-2 px-4 py-2.5 text-[13px] font-medium text-slate-600 dark:text-slate-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors"
                                    >
                                        <Icon icon="solar:export-bold" className="text-emerald-500" width={18} />
                                        Exportar Clientes
                                    </button>
                                    <button
                                        onClick={() => { vm.fileInputRef.current?.click(); }}
                                        className="w-full flex items-center gap-2 px-4 py-2.5 text-[13px] font-medium text-slate-600 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-700 dark:hover:text-blue-400 transition-colors"
                                    >
                                        <Icon icon="solar:import-bold" className="text-blue-500" width={18} />
                                        Importar desde Excel
                                    </button>
                                    <div className="mx-4 my-1 border-t border-slate-100 dark:border-slate-700"></div>
                                    <a
                                        href="/formatos/plantilla_clientes.xlsx"
                                        target="_blank"
                                        download
                                        onClick={() => setShowOptionsDropdown(false)}
                                        className="w-full flex items-center gap-2 px-4 py-2.5 text-[13px] font-medium text-slate-600 dark:text-slate-300 hover:bg-amber-50 dark:hover:bg-amber-900/20 hover:text-amber-700 dark:hover:text-amber-400 transition-colors"
                                    >
                                        <Icon icon="solar:file-download-bold" className="text-amber-500" width={18} />
                                        Descargar Modelo (Guía)
                                    </a>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Table */}
                <div className="p-4">
                    {clientsTable && clientsTable.length > 0 ? (
                        <>
                            <div className="min-h-[450px]">
                                <DataTable
                                    bodyData={clientsTable.map((row: any) => ({
                                        ...row,
                                        'Estado': row['Estado'] ? (
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                                                row['Estado'] === 'ACTIVO'
                                                    ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400'
                                                    : 'bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400'
                                            }`}>
                                                <span className={`w-1.5 h-1.5 rounded-full ${row['Estado'] === 'ACTIVO' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                                                {row['Estado'] === 'ACTIVO' ? 'Activo' : 'Inactivo'}
                                            </span>
                                        ) : null,
                                        'Acciones': (
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
                                                    className="h-8 w-8 grid place-items-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-500 dark:text-gray-400 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                                                >
                                                    <Icon icon="mdi:dots-vertical" width={18} height={18} />
                                                </button>
                                            </div>
                                        ),
                                    }))}
                                    headerColumns={vm.visibleColumns}
                                />
                            </div>
                            <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
                                <Pagination
                                    data={clientsTable}
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
                            <Icon icon="solar:users-group-rounded-linear" className="text-5xl text-slate-200 dark:text-slate-700 mx-auto mb-3" />
                            <p className="text-slate-500 dark:text-gray-400 text-sm font-medium">No se encontraron clientes</p>
                            <p className="text-sm text-slate-400 dark:text-gray-500 mt-1">Intenta con otros términos de búsqueda</p>
                        </div>
                    )}
                </div>
            </div>}

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
                                onClick={() => { setClienteEliminar(rowBase); actions.closeMenu(); }}
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
                <ModalClient
                    setErrors={actions.setErrors}
                    errors={vm.errors}
                    formValues={vm.formValues}
                    setFormValues={actions.setFormValues}
                    isEdit={vm.isEdit}
                    isOpenModal={vm.isOpenModal}
                    setIsOpenModal={(v: boolean) => !v && actions.closeModal()}
                    closeModal={actions.closeModal}
                    grupoFarmacia={isFarmacia ? grupoActivo : undefined}
                />
            )}
            {vm.isOpenModalConfirm && (
                <ModalConfirm
                    confirmSubmit={actions.confirmToggleState}
                    isOpenModal={vm.isOpenModalConfirm}
                    setIsOpenModal={actions.setIsOpenModalConfirm}
                    title="Confirmación"
                    information="¿Estás seguro que deseas cambiar el estado del cliente?"
                />
            )}
            {clienteEliminar && (
                <ModalConfirm
                    isOpenModal={!!clienteEliminar}
                    setIsOpenModal={(v: boolean) => { if (!v) setClienteEliminar(null); }}
                    confirmSubmit={async () => {
                        setEliminando(true);
                        try { await actions.deleteClient(Number(clienteEliminar.id)); setClienteEliminar(null); }
                        finally { setEliminando(false); }
                    }}
                    title="Eliminar registro"
                    information={`¿Eliminar definitivamente a "${clienteEliminar.nombre || 'este registro'}"? Solo se puede si no tiene compras, comprobantes ni vehículos asociados; de lo contrario usa Desactivar.`}
                    confirmText="Eliminar"
                    confirmLoading={eliminando}
                />
            )}
        </div>
    );
}
