import { useEffect, useState } from 'react';
import { Icon } from '@iconify/react';
import InputPro from '@/components/InputPro';
import DataTable from '@/components/Datatable';
import Pagination from '@/components/Pagination';
import Select from '@/components/Select';
import { Calendar } from '@/components/Date';
import { useComprasViewModel } from './useComprasViewModel';
import { useAuthStore } from '@/zustand/auth';
import { useSedesStore } from '@/zustand/sedes';
import ModalDetalleCompra from '@/pages/admin/compras/ModalDetalleCompra';
import ModalRegistrarPagoCompra from '@/pages/admin/compras/ModalRegistrarPagoCompra';
import ModalHistorialPagosCompra from '@/pages/admin/compras/ModalHistorialPagosCompra';
import ModalNuevaCompra from '@/pages/admin/compras/ModalNuevaCompra';
import ModalConfirm from '@/components/ModalConfirm';
import KpiHero from '@/components/ui/KpiHero';

const ACCENT = 'var(--accent, #7551FF)';

export default function ComprasView() {
    const vm = useComprasViewModel();
    const { actions, tableData, totalCompras, totalPorPagar, totalVencidos } = vm;
    const { auth } = useAuthStore();
    const { sedes, listarSedes } = useSedesStore();
    const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);

    const isAdmin = auth?.rol === 'ADMIN_EMPRESA' || auth?.rol === 'ADMIN_SISTEMA';

    const sedesOptions = [
        { id: 0, value: "Todas las sedes" },
        ...sedes.map(s => ({ id: s.id, value: s.esPrincipal ? `${s.nombre}` : s.nombre }))
    ];

    useEffect(() => {
        if (isAdmin) listarSedes();
    }, [isAdmin]); // eslint-disable-line react-hooks/exhaustive-deps

    // Fetch on mount and filter changes
    useEffect(() => {
        vm.actions.refresh();
    }, [vm.currentPage, vm.itemsPerPage, vm.debounce, vm.filters.estadoPago, vm.filters.fechaInicio, vm.filters.fechaFin, vm.filters.sedeId]); // eslint-disable-line react-hooks/exhaustive-deps

    const tableActions = [
        {
            icon: <Icon icon="solar:history-bold-duotone" width="20" height="20" color="#6366f1" />,
            tooltip: 'Ver Historial',
            className: 'history',
            onClick: (row: any) => actions.openHistorial(row._raw),
        },
        {
            icon: <Icon icon="solar:hand-money-bold-duotone" width="20" height="20" color="#10b981" />,
            tooltip: 'Registrar Pago',
            className: 'payment',
            onClick: (row: any) => actions.openPago(row._raw),
            hide: (row: any) => Number(row._raw?.saldo || 0) <= 0.01 || row._raw?.estadoPago === 'COMPLETADO',
        },
        {
            icon: <Icon icon="solar:eye-bold" />,
            tooltip: 'Ver detalle',
            className: 'edit',
            onClick: (row: any) => actions.openDetalle(row.id),
        },
        {
            icon: <Icon icon="solar:pen-2-bold-duotone" width="20" height="20" color="#0ea5e9" />,
            tooltip: 'Editar compra',
            className: 'edit',
            onClick: (row: any) => actions.openEditar(row._raw),
        },
        {
            icon: <Icon icon="solar:trash-bin-trash-bold-duotone" width="20" height="20" color="#ef4444" />,
            tooltip: 'Anular compra',
            className: 'delete',
            onClick: (row: any) => actions.openAnular(row._raw),
        },
    ];

    const activeFilterCount = [
        vm.filters.search.trim(),
        vm.filters.fechaInicio,
        vm.filters.fechaFin,
        vm.filters.estadoPago !== 'TODOS' ? vm.filters.estadoPago : '',
        vm.filters.sedeId,
    ].filter(Boolean).length;

    return (
        <div className="min-h-screen -m-5 p-5 bg-[#F7F8FB] dark:bg-[#0A0D14] font-jakarta">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm text-slate-400 dark:text-gray-400 mb-5">
                <Icon icon="solar:home-smile-linear" className="text-base" />
                <span>Panel</span>
                <Icon icon="solar:alt-arrow-right-linear" className="text-xs" />
                <span>Finanzas</span>
                <Icon icon="solar:alt-arrow-right-linear" className="text-xs" />
                <span className="font-semibold" style={{ color: ACCENT }}>Compras</span>
            </div>

            {/* Header */}
            <div className="mb-5 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
                <div className="min-w-0">
                    <h1 className="text-[22px] font-extrabold tracking-tight text-slate-800 dark:text-white">Cuentas por Pagar / Compras</h1>
                    <p className="mt-0.5 text-sm text-slate-400 dark:text-gray-400">Gestión de compras y pagos a proveedores</p>
                </div>
                <button
                    onClick={actions.openNuevaCompra}
                    className="flex h-11 w-full items-center justify-center gap-1.5 rounded-2xl px-4 text-sm font-bold text-white shadow-lg shadow-violet-500/30 transition-all hover:brightness-105 sm:w-auto"
                    style={{ background: ACCENT }}
                >
                    <Icon icon="solar:cart-plus-bold" className="text-lg" />
                    Nueva Compra
                </button>
            </div>

            {/* Stats — diseño hero del dashboard */}
            <KpiHero
                className="mb-5"
                cards={[
                    { label: 'Facturas (Vista)', value: String(totalCompras || 0), mini: 'line' },
                    { label: 'Saldo por Pagar', value: `S/ ${totalPorPagar.toFixed(2)}`, detail: '(Página actual)', mini: 'wave' },
                    { label: 'Vencidos (+1 día)', value: String(totalVencidos), mini: 'bars' },
                ]}
            />

            {/* Card contenedora */}
            <div className="rounded-3xl bg-white dark:bg-slate-800 shadow-[0_2px_20px_rgba(15,23,42,0.05)] dark:shadow-none">
                {/* Filters */}
                <div className="border-b border-slate-100 dark:border-slate-700 p-4 sm:p-5">
                    <div className="mb-4 flex items-center justify-between gap-3 sm:hidden">
                        <div className="flex min-w-0 items-center gap-2">
                            <div className="grid h-9 w-9 place-items-center rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400">
                                <Icon icon="solar:filter-bold-duotone" className="text-lg" />
                            </div>
                            <div className="min-w-0">
                                <h3 className="font-semibold text-slate-800 dark:text-white">Filtros</h3>
                                <p className="truncate text-xs text-slate-400 dark:text-gray-400">{activeFilterCount} activos</p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={() => setIsMobileFiltersOpen((value) => !value)}
                            className="inline-flex h-10 items-center gap-2 rounded-xl px-3 text-xs font-bold text-white shadow-lg shadow-violet-500/30"
                            style={{ background: ACCENT }}
                        >
                            {isMobileFiltersOpen ? 'Ocultar' : 'Ver filtros'}
                            <Icon icon={isMobileFiltersOpen ? 'solar:alt-arrow-up-linear' : 'solar:alt-arrow-down-linear'} className="text-base" />
                        </button>
                    </div>
                    <div className={`${isMobileFiltersOpen ? 'grid' : 'hidden'} grid-cols-1 gap-4 sm:grid sm:grid-cols-2 xl:grid-cols-4`}>
                        <div className="sm:col-span-2 xl:col-span-1">
                            <InputPro
                                name="search"
                                value={vm.filters.search}
                                onChange={(e) => actions.setSearch(e.target.value)}
                                label="Buscar por documento o proveedor"
                                isLabel
                            />
                        </div>
                        <div>
                            <Calendar text="Desde" name="fechaInicio" onChange={actions.handleDate} className="admin-date-filter" portal />
                        </div>
                        <div>
                            <Calendar text="Hasta" name="fechaFin" onChange={actions.handleDate} className="admin-date-filter" portal />
                        </div>
                        <div>
                            <Select
                                error=""
                                label="Estado Pago"
                                name="estadoPago"
                                defaultValue="TODOS"
                                onChange={(_id: any, value: string) => actions.setEstadoPago(value)}
                                options={vm.ESTADO_PAGO_OPTIONS}
                            />
                        </div>
                        {isAdmin && (
                            <div>
                                <Select
                                    error=""
                                    label="Sede"
                                    name="sedeId"
                                    defaultValue="Todas las sedes"
                                    onChange={(id: any, _value: string) => actions.setSedeId(id === 0 ? null : Number(id))}
                                    options={sedesOptions}
                                />
                            </div>
                        )}
                    </div>
                </div>

                {/* Table */}
                <div className="p-3 sm:p-4">
                    {tableData && tableData.length > 0 ? (
                        <>
                            <div className="space-y-3 md:hidden">
                                {tableData.map((row: any) => {
                                    const compra = row._raw;
                                    const puedePagar = Number(compra?.saldo || 0) > 0.01 && compra?.estadoPago !== 'COMPLETADO';

                                    return (
                                        <article
                                            key={row.id}
                                            className="rounded-2xl border border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 shadow-[0_2px_20px_rgba(15,23,42,0.05)] dark:shadow-none"
                                        >
                                            <div className="mb-3 flex items-start justify-between gap-3">
                                                <div className="min-w-0">
                                                    <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400 dark:text-gray-400">{row.Fecha}</p>
                                                    <h3 className="mt-1 truncate text-base font-bold text-slate-800 dark:text-white">{row.Proveedor}</h3>
                                                    <p className="text-xs font-semibold text-slate-500 dark:text-gray-400">{row.Comprobante}</p>
                                                </div>
                                                {row.Pago}
                                            </div>

                                            <div className="grid grid-cols-3 gap-2 rounded-2xl bg-slate-50 dark:bg-slate-800/50 p-3">
                                                <div>
                                                    <p className="text-[10px] font-bold uppercase text-slate-400 dark:text-gray-400">Total</p>
                                                    <p className="text-sm font-bold text-slate-800 dark:text-white">{row.Total}</p>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-bold uppercase text-slate-400 dark:text-gray-400">Saldo</p>
                                                    <p className="text-sm font-bold text-rose-600 dark:text-rose-400">{row.Saldo}</p>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-bold uppercase text-slate-400 dark:text-gray-400">Venc.</p>
                                                    <p className="text-sm font-bold text-slate-800 dark:text-white">{row['Días Venc.']} días</p>
                                                </div>
                                            </div>

                                            <div className="mt-3 grid grid-cols-2 gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => actions.openDetalle(row.id)}
                                                    className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 transition hover:bg-slate-200 dark:hover:bg-slate-600"
                                                >
                                                    <Icon icon="solar:eye-bold" className="text-base" />
                                                    Detalle
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => actions.openHistorial(compra)}
                                                    className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 text-xs font-bold text-indigo-600 dark:text-indigo-400 transition hover:bg-indigo-100 dark:hover:bg-indigo-900/30"
                                                >
                                                    <Icon icon="solar:history-bold-duotone" className="text-base" />
                                                    Historial
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => actions.openEditar(compra)}
                                                    className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-sky-50 dark:bg-sky-900/20 text-xs font-bold text-sky-600 dark:text-sky-400 transition hover:bg-sky-100 dark:hover:bg-sky-900/30"
                                                >
                                                    <Icon icon="solar:pen-2-bold-duotone" className="text-base" />
                                                    Editar
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => actions.openAnular(compra)}
                                                    className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-rose-50 dark:bg-rose-900/20 text-xs font-bold text-rose-600 dark:text-rose-400 transition hover:bg-rose-100 dark:hover:bg-rose-900/30"
                                                >
                                                    <Icon icon="solar:trash-bin-trash-bold-duotone" className="text-base" />
                                                    Anular
                                                </button>
                                                {puedePagar && (
                                                    <button
                                                        type="button"
                                                        onClick={() => actions.openPago(compra)}
                                                        className="col-span-2 inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-emerald-600 text-xs font-bold text-white shadow-lg shadow-emerald-200 transition hover:bg-emerald-700"
                                                    >
                                                        <Icon icon="solar:hand-money-bold-duotone" className="text-base" />
                                                        Registrar pago
                                                    </button>
                                                )}
                                            </div>
                                        </article>
                                    );
                                })}
                            </div>
                            <div className="hidden overflow-hidden overflow-x-auto md:block">
                                <DataTable
                                    bodyData={tableData}
                                    headerColumns={vm.VISIBLE_COMPRAS_COLUMNS}
                                    actions={tableActions}
                                />
                            </div>
                             <div className="mt-4 border-t border-slate-100 dark:border-slate-700 pt-4">
                                <Pagination
                                    data={tableData}
                                    optionSelect
                                    currentPage={vm.currentPage}
                                    indexOfFirstItem={vm.indexOfFirstItem}
                                    indexOfLastItem={vm.indexOfLastItem}
                                    setcurrentPage={actions.setcurrentPage}
                                    setitemsPerPage={actions.setitemsPerPage}
                                    pages={vm.pages}
                                    total={totalCompras}
                                />
                            </div>
                        </>
                    ) : (
                        <div className="py-16 text-center">
                            <Icon icon="solar:cart-large-minimalistic-linear" className="mx-auto mb-2 text-5xl text-slate-200 dark:text-gray-600" />
                            <p className="text-sm text-slate-400 dark:text-gray-400">No se encontraron compras</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Modals */}
            <ModalDetalleCompra
                isOpen={vm.isOpenDetalle}
                onClose={actions.closeDetalle}
                compraId={vm.selectedCompraId}
            />

            <ModalRegistrarPagoCompra
                isOpen={!!vm.showPaymentModal}
                compra={vm.selectedCompra}
                onClose={actions.closePago}
                onSuccess={actions.handlePaymentSuccess}
            />

            <ModalHistorialPagosCompra
                isOpen={!!vm.showHistorialModal}
                compra={vm.selectedCompra}
                onClose={actions.closeHistorial}
            />

            <ModalNuevaCompra
                isOpen={vm.showNuevaCompraModal}
                onClose={actions.closeNuevaCompra}
                onSuccess={actions.handleNuevaCompraSuccess}
            />

            <ModalNuevaCompra
                isOpen={vm.showEditarModal}
                compra={vm.compraEditar}
                onClose={actions.closeEditar}
                onSuccess={actions.handleEditarSuccess}
            />

            <ModalConfirm
                isOpenModal={vm.showAnularConfirm}
                setIsOpenModal={(v: boolean) => { if (!v) actions.closeAnular(); }}
                confirmSubmit={actions.confirmAnular}
                title="Anular compra"
                information={`¿Seguro que deseas anular la compra ${vm.compraAnular?.serie || ''}-${vm.compraAnular?.numero || ''}? Se revertirá el stock ingresado. Esta acción no se puede deshacer.`}
                confirmText="Anular"
            />
        </div>
    );
}
