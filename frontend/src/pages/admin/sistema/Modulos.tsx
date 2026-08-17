import { Fragment } from 'react';
import { useModulosViewModel } from '@/features/admin/sistema/useModulosViewModel';
import Button from '@/components/Button';
import InputPro from '@/components/InputPro';
import Modal from '@/components/Modal';
import ModalConfirm from '@/components/ModalConfirm';
import { Icon } from '@iconify/react';
import { ISubModulo } from '@/zustand/modulos';

const ACCENT = 'var(--accent, #7551FF)';

const Toggle = ({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) => (
    <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800 last:border-0">
        <span className="text-sm text-slate-700 dark:text-slate-200">{label}</span>
        <button
            type="button"
            onClick={() => onChange(!value)}
            className="relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none"
            style={{ background: value ? ACCENT : '#E2E8F0' }}
        >
            <span aria-hidden="true" className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${value ? 'translate-x-5' : 'translate-x-0'}`} />
        </button>
    </div>
);

const ProductoBadge = ({ producto }: { producto?: string }) =>
    producto === 'hotel' ? (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400">
            <Icon icon="solar:bed-bold-duotone" width={11} />
            Hotel
        </span>
    ) : (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400">
            <Icon icon="solar:bill-list-bold-duotone" width={11} />
            Facturación
        </span>
    );

const EstadoPill = ({ activo }: { activo: boolean }) =>
    activo ? (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Activo
        </span>
    ) : (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" /> Inactivo
        </span>
    );

const ModulosPage = () => {
    const vm = useModulosViewModel();

    const stats = [
        { label: 'Total módulos', value: vm.modulos.length, icon: 'solar:widget-bold-duotone', chip: 'bg-violet-50 text-violet-600 dark:bg-violet-900/20 dark:text-violet-400' },
        { label: 'Activos', value: vm.modulos.filter(m => m.activo).length, icon: 'solar:check-circle-bold-duotone', chip: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400' },
        { label: 'Facturación', value: vm.modulos.filter(m => m.producto !== 'hotel' && m.producto !== 'restaurante').length, icon: 'solar:bill-list-bold-duotone', chip: 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400' },
        { label: 'Hotel', value: vm.modulos.filter(m => m.producto === 'hotel').length, icon: 'solar:bed-bold-duotone', chip: 'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400' },
        { label: 'Restaurante', value: vm.modulos.filter(m => m.producto === 'restaurante').length, icon: 'solar:cup-hot-bold-duotone', chip: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400' },
    ];

    return (
        <div className="min-h-screen -m-5 p-5 bg-[#F7F8FB] dark:bg-slate-950 font-jakarta">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm text-slate-400 mb-5">
                <Icon icon="solar:home-smile-linear" className="text-base" />
                <span>Panel</span>
                <Icon icon="solar:alt-arrow-right-linear" className="text-xs" />
                <span>Sistema</span>
                <Icon icon="solar:alt-arrow-right-linear" className="text-xs" />
                <span className="font-semibold" style={{ color: ACCENT }}>Módulos</span>
            </div>

            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-5">
                <div className="min-w-0">
                    <h1 className="text-[22px] font-extrabold text-slate-800 dark:text-white tracking-tight">Módulos del Sistema</h1>
                    <p className="text-sm text-slate-400 mt-0.5">Gestiona los módulos y submódulos disponibles para cada producto y plan</p>
                </div>
                <div className="flex items-center gap-2.5">
                    {!vm.productoScope && (
                        <div className="flex items-center rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-1 gap-0.5">
                            {([
                                { id: '' as const, label: 'Todos', icon: 'solar:layers-bold-duotone' },
                                { id: 'facturacion' as const, label: 'Facturación', icon: 'solar:bill-list-bold-duotone' },
                                { id: 'hotel' as const, label: 'Hotel', icon: 'solar:bed-bold-duotone' },
                                { id: 'restaurante' as const, label: 'Restaurante', icon: 'solar:cup-hot-bold-duotone' },
                            ]).map((item) => {
                                const active = vm.productoFiltro === item.id;
                                return (
                                    <button
                                        key={item.id || 'all'}
                                        type="button"
                                        onClick={() => vm.setProductoFiltro(item.id)}
                                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl transition-all ${active ? 'text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                                        style={active ? { background: ACCENT } : undefined}
                                    >
                                        <Icon icon={item.icon} width={13} />
                                        {item.label}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                    <button
                        onClick={vm.handleOpenCreate}
                        className="h-11 px-4 rounded-2xl text-white text-sm font-bold flex items-center gap-1.5 shadow-lg shadow-violet-500/30 hover:brightness-105 transition-all shrink-0"
                        style={{ background: ACCENT }}
                    >
                        <Icon icon="solar:add-circle-bold" className="text-lg" />
                        <span className="hidden sm:inline">Nuevo Módulo</span>
                    </button>
                </div>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
                {stats.map(stat => (
                    <div key={stat.label} className="bg-white dark:bg-[#111827] rounded-3xl shadow-[0_2px_20px_rgba(15,23,42,0.05)] px-4 py-3.5 flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${stat.chip}`}>
                            <Icon icon={stat.icon} width={20} />
                        </div>
                        <div>
                            <p className="text-2xl font-extrabold text-slate-800 dark:text-white leading-none">{stat.value}</p>
                            <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400 mt-1">{stat.label}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Table card */}
            <div className="bg-white dark:bg-[#111827] rounded-3xl shadow-[0_2px_20px_rgba(15,23,42,0.05)] overflow-hidden">
                <div className="overflow-x-auto">
                    {vm.modulos.length > 0 ? (
                        <table className="w-full text-left border-collapse min-w-[900px]">
                            <thead>
                                <tr className="text-[11px] font-bold uppercase tracking-wide text-slate-400 border-b border-slate-100 dark:border-slate-800">
                                    <th className="py-3 pl-5 pr-2 w-10 text-center">#</th>
                                    <th className="py-3 px-2 w-12 text-center">Icono</th>
                                    <th className="py-3 px-3">Código</th>
                                    <th className="py-3 px-3">Nombre</th>
                                    <th className="py-3 px-3">Descripción</th>
                                    <th className="py-3 px-3 text-center">Producto</th>
                                    <th className="py-3 px-3 text-center">Estado</th>
                                    <th className="py-3 px-3 text-center">Submódulos</th>
                                    <th className="py-3 px-3 pr-5 text-center">Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {vm.modulos.map(modulo => {
                                    const isExpanded = vm.expandedModulos.has(modulo.id);
                                    const subCount = modulo.subModulos?.length || 0;
                                    return (
                                        <Fragment key={modulo.id}>
                                            {/* ── Módulo row ── */}
                                            <tr className="border-b border-slate-50 dark:border-slate-800 hover:bg-slate-50/60 dark:hover:bg-slate-800/60 transition-colors group">
                                                <td className="py-3 pl-5 pr-2 text-center">
                                                    <span className="text-xs text-slate-400 font-mono">{modulo.orden}</span>
                                                </td>
                                                <td className="py-3 px-2 text-center">
                                                    <div className="w-9 h-9 rounded-2xl bg-violet-50 text-violet-600 dark:bg-violet-900/20 dark:text-violet-400 flex items-center justify-center mx-auto">
                                                        <Icon icon={modulo.icono || 'solar:widget-bold-duotone'} width={18} />
                                                    </div>
                                                </td>
                                                <td className="py-3 px-3">
                                                    <span className="text-[11px] font-bold bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400 px-2 py-0.5 rounded-md">
                                                        {modulo.codigo}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-3">
                                                    <span className="font-semibold text-slate-700 dark:text-slate-200 text-sm">{modulo.nombre}</span>
                                                </td>
                                                <td className="py-3 px-3">
                                                    <span className="text-slate-400 text-xs max-w-xs truncate block" title={modulo.descripcion}>
                                                        {modulo.descripcion || '—'}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-3 text-center">
                                                    <ProductoBadge producto={modulo.producto} />
                                                </td>
                                                <td className="py-3 px-3 text-center">
                                                    <EstadoPill activo={modulo.activo} />
                                                </td>
                                                <td className="py-3 px-3 text-center">
                                                    <button
                                                        onClick={() => vm.toggleExpanded(modulo.id)}
                                                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold transition-colors ${
                                                            subCount > 0
                                                                ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/30'
                                                                : 'bg-slate-100 text-slate-400 dark:bg-slate-800'
                                                        }`}
                                                    >
                                                        {subCount}
                                                        {subCount > 0 && (
                                                            <Icon icon={isExpanded ? 'solar:alt-arrow-up-bold' : 'solar:alt-arrow-down-bold'} width={10} />
                                                        )}
                                                    </button>
                                                </td>
                                                <td className="py-3 px-3 pr-5">
                                                    <div className="flex items-center justify-center gap-1.5">
                                                        <button
                                                            onClick={() => vm.toggleExpanded(modulo.id)}
                                                            title={isExpanded ? 'Ocultar' : 'Ver submódulos'}
                                                            className="w-8 h-8 rounded-xl flex items-center justify-center bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 transition-all"
                                                        >
                                                            <Icon icon={isExpanded ? 'solar:alt-arrow-up-bold' : 'solar:alt-arrow-down-bold'} width={14} />
                                                        </button>
                                                        <button
                                                            onClick={() => vm.handleOpenCreateSub(modulo.id)}
                                                            title="Agregar submódulo"
                                                            className="w-8 h-8 rounded-xl flex items-center justify-center bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-all"
                                                        >
                                                            <Icon icon="solar:add-circle-bold" width={15} />
                                                        </button>
                                                        <button
                                                            onClick={() => vm.handleOpenEdit(modulo)}
                                                            title="Editar"
                                                            className="w-8 h-8 rounded-xl flex items-center justify-center bg-violet-50 text-violet-600 dark:bg-violet-900/20 dark:text-violet-400 hover:bg-violet-100 dark:hover:bg-violet-900/30 transition-all"
                                                        >
                                                            <Icon icon="solar:pen-bold" width={14} />
                                                        </button>
                                                        <button
                                                            onClick={() => vm.confirmDelete(modulo.id)}
                                                            title="Eliminar"
                                                            className="w-8 h-8 rounded-xl flex items-center justify-center bg-rose-50 text-rose-500 dark:bg-rose-900/20 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/30 transition-all"
                                                        >
                                                            <Icon icon="solar:trash-bin-trash-bold" width={14} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>

                                            {/* ── Submódulos expandibles ── */}
                                            {isExpanded && (
                                                subCount === 0 ? (
                                                    <tr className="bg-slate-50/40 dark:bg-slate-800/40">
                                                        <td colSpan={9}>
                                                            <div className="flex items-center gap-2 pl-16 py-2.5 text-xs text-slate-400">
                                                                <Icon icon="solar:info-circle-linear" width={14} className="text-slate-300 dark:text-slate-600" />
                                                                Sin submódulos. Usa el botón
                                                                <Icon icon="solar:add-circle-bold" className="text-emerald-500" width={14} />
                                                                para agregar.
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ) : (
                                                    modulo.subModulos.map((sub: ISubModulo) => (
                                                        <tr key={`sub-${sub.id}`} className="bg-slate-50/40 dark:bg-slate-800/40 border-b border-slate-50 dark:border-slate-800">
                                                            <td className="py-2.5 pl-5 pr-2 text-center">
                                                                <span className="text-[10px] text-slate-300 dark:text-slate-600 font-mono">{sub.orden}</span>
                                                            </td>
                                                            <td className="py-2.5 px-2 text-center">
                                                                <Icon icon="solar:arrow-right-down-linear" width={14} className="text-slate-300 dark:text-slate-600 mx-auto" />
                                                            </td>
                                                            <td className="py-2.5 px-3">
                                                                <span className="text-[11px] font-bold bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400 px-2 py-0.5 rounded-md">
                                                                    {sub.codigo}
                                                                </span>
                                                            </td>
                                                            <td className="py-2.5 px-3">
                                                                <span className="text-sm text-slate-600 dark:text-slate-300">{sub.nombre}</span>
                                                            </td>
                                                            <td className="py-2.5 px-3">
                                                                <span className="text-xs text-slate-400 max-w-xs truncate block" title={sub.descripcion}>
                                                                    {sub.descripcion || '—'}
                                                                </span>
                                                            </td>
                                                            <td className="py-2.5 px-3" />
                                                            <td className="py-2.5 px-3 text-center">
                                                                <EstadoPill activo={sub.activo} />
                                                            </td>
                                                            <td className="py-2.5 px-3" />
                                                            <td className="py-2.5 px-3 pr-5">
                                                                <div className="flex items-center justify-center gap-1.5">
                                                                    <button
                                                                        onClick={() => vm.handleOpenEditSub(sub)}
                                                                        title="Editar"
                                                                        className="w-8 h-8 rounded-xl flex items-center justify-center bg-violet-50 text-violet-600 dark:bg-violet-900/20 dark:text-violet-400 hover:bg-violet-100 dark:hover:bg-violet-900/30 transition-all"
                                                                    >
                                                                        <Icon icon="solar:pen-bold" width={14} />
                                                                    </button>
                                                                    <button
                                                                        onClick={() => vm.confirmDeleteSub(sub.id)}
                                                                        title="Eliminar"
                                                                        className="w-8 h-8 rounded-xl flex items-center justify-center bg-rose-50 text-rose-500 dark:bg-rose-900/20 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/30 transition-all"
                                                                    >
                                                                        <Icon icon="solar:trash-bin-trash-bold" width={14} />
                                                                    </button>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ))
                                                )
                                            )}
                                        </Fragment>
                                    );
                                })}
                            </tbody>
                        </table>
                    ) : vm.loading ? (
                        <table className="w-full border-collapse min-w-[900px]">
                            <tbody>
                                {Array.from({ length: 8 }).map((_, i) => (
                                    <tr key={i} className="border-b border-slate-50 dark:border-slate-800">
                                        <td className="py-3.5 px-5">
                                            <div className="h-6 rounded-lg bg-slate-100 dark:bg-slate-800 animate-pulse" />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-20">
                            <Icon icon="solar:widget-linear" className="text-6xl text-slate-200 dark:text-slate-700 mb-3" />
                            <h3 className="text-base font-semibold text-slate-500 dark:text-slate-400 mb-1">No hay módulos registrados</h3>
                            <p className="text-sm text-slate-400 text-center">
                                {vm.productoFiltro ? `No hay módulos para "${vm.productoFiltro}"` : 'Crea el primer módulo del sistema'}
                            </p>
                            <button
                                onClick={vm.handleOpenCreate}
                                className="mt-4 inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl text-white text-sm font-bold shadow-lg shadow-violet-500/30 hover:brightness-105 transition-all"
                                style={{ background: ACCENT }}
                            >
                                <Icon icon="solar:add-circle-bold" />
                                Crear Módulo
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* ── Modal Módulo ── */}
            <Modal isOpenModal={vm.isModalOpen} closeModal={() => vm.setIsModalOpen(false)} title={vm.isEdit ? 'Editar Módulo' : 'Nuevo Módulo'}>
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="col-span-2 md:col-span-1">
                        <InputPro isLabel label="Código (Identificador)" name="codigo" value={vm.form.codigo} onChange={(e) => vm.setForm({ ...vm.form, codigo: e.target.value })} placeholder="Ej. kardex, ventas..." disabled={vm.isEdit} />
                    </div>
                    <div className="col-span-2 md:col-span-1">
                        <InputPro isLabel label="Nombre Visible" name="nombre" value={vm.form.nombre} onChange={(e) => vm.setForm({ ...vm.form, nombre: e.target.value })} placeholder="Ej. Inventario" />
                    </div>
                    {!vm.productoScope && (
                        <div className="col-span-2">
                            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">Producto</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {([
                                    { id: 'facturacion', label: 'Facturación', icon: 'solar:bill-list-bold-duotone', color: '#0EA5E9' },
                                    { id: 'hotel', label: 'Hotel', icon: 'solar:bed-bold-duotone', color: '#F59E0B' },
                                    { id: 'restaurante', label: 'Restaurante', icon: 'solar:cup-hot-bold-duotone', color: '#10B981' },
                                ] as const).map((product) => {
                                    const selected = (vm.form.producto || 'facturacion') === product.id;
                                    return (
                                        <button
                                            key={product.id}
                                            type="button"
                                            onClick={() => vm.setForm({ ...vm.form, producto: product.id })}
                                            className={`flex items-center gap-3 px-4 py-3 rounded-2xl border-2 transition-all ${selected ? 'border-sky-500 bg-sky-50 dark:bg-sky-900/20 shadow-sm' : 'border-slate-200 dark:border-slate-700 hover:border-sky-300 bg-white dark:bg-slate-800'}`}
                                        >
                                            <Icon icon={product.icon} width={20} style={{ color: selected ? product.color : '#9CA3AF' }} />
                                            <span className={`font-semibold text-sm ${selected ? 'text-slate-800 dark:text-slate-100' : 'text-slate-500 dark:text-slate-400'}`}>{product.label}</span>
                                            {selected && <Icon icon="solar:check-circle-bold" width={16} className="ml-auto text-sky-500" />}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                    <div className="col-span-2">
                        <InputPro isLabel label="Descripción" name="descripcion" value={vm.form.descripcion} onChange={(e) => vm.setForm({ ...vm.form, descripcion: e.target.value })} />
                    </div>
                    <div className="col-span-2 md:col-span-1">
                        <InputPro isLabel label="Icono (Iconify)" name="icono" value={vm.form.icono} onChange={(e) => vm.setForm({ ...vm.form, icono: e.target.value })} placeholder="Ej. solar:box-bold-duotone" />
                    </div>
                    <div className="col-span-2 md:col-span-1">
                        <InputPro isLabel label="Orden" name="orden" type="number" value={vm.form.orden} onChange={(e) => vm.setForm({ ...vm.form, orden: Number(e.target.value) })} />
                    </div>
                    <div className="col-span-2">
                        <InputPro isLabel label="Ruta (sidebar)" name="ruta" value={vm.form.ruta || ''} onChange={(e) => vm.setForm({ ...vm.form, ruta: e.target.value })} placeholder="Ej. /administrador/ventas" />
                        <p className="text-xs text-slate-400 mt-1">Ruta de navegación que abre este módulo en el sidebar.</p>
                    </div>
                    <div className="col-span-2 mt-2">
                        <Toggle label="Módulo Activo" value={vm.form.activo || false} onChange={v => vm.setForm({ ...vm.form, activo: v })} />
                        <p className="text-xs text-slate-400 mt-1">Si se desactiva, no aparecerá disponible para asignar a nuevos planes.</p>
                    </div>
                    {vm.form.icono && (
                        <div className="col-span-2 mt-1 bg-violet-50 dark:bg-violet-900/20 border border-violet-100 dark:border-violet-900/30 p-3 rounded-2xl text-sm text-violet-700 dark:text-violet-300 flex items-center gap-3">
                            <Icon icon="solar:eye-bold-duotone" width={16} />
                            <span>Preview:</span>
                            <Icon icon={vm.form.icono || 'mdi:help-circle'} className="text-2xl" />
                        </div>
                    )}
                </div>
                <div className="flex justify-end gap-2 p-4 pt-0">
                    <Button onClick={() => vm.setIsModalOpen(false)} color="secondary" outline>Cancelar</Button>
                    <Button onClick={vm.handleSubmit} color="primary" disabled={vm.loading}>{vm.loading ? 'Guardando...' : 'Guardar'}</Button>
                </div>
            </Modal>

            {/* ── Modal SubMódulo ── */}
            <Modal isOpenModal={vm.isSubModalOpen} closeModal={() => vm.setIsSubModalOpen(false)} title={vm.isSubEdit ? 'Editar Submódulo' : 'Nuevo Submódulo'}>
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                    {!vm.isSubEdit && (
                        <div className="col-span-2 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-900/30 rounded-2xl px-4 py-2 text-sm text-indigo-700 dark:text-indigo-300 flex items-center gap-2">
                            <Icon icon="solar:info-circle-bold-duotone" width={16} />
                            Submódulo de: <strong>{vm.modulos.find(m => m.id === vm.subForm.moduloId)?.nombre}</strong>
                        </div>
                    )}
                    <div className="col-span-2 md:col-span-1">
                        <InputPro isLabel label="Código" name="codigo" value={vm.subForm.codigo} onChange={(e) => vm.setSubForm({ ...vm.subForm, codigo: e.target.value })} placeholder="Ej. comprobantes:emitir" disabled={vm.isSubEdit} />
                    </div>
                    <div className="col-span-2 md:col-span-1">
                        <InputPro isLabel label="Nombre Visible" name="nombre" value={vm.subForm.nombre} onChange={(e) => vm.setSubForm({ ...vm.subForm, nombre: e.target.value })} placeholder="Ej. Emitir comprobante" />
                    </div>
                    <div className="col-span-2">
                        <InputPro isLabel label="Descripción" name="descripcion" value={vm.subForm.descripcion} onChange={(e) => vm.setSubForm({ ...vm.subForm, descripcion: e.target.value })} />
                    </div>
                    <div className="col-span-2 md:col-span-1">
                        <InputPro isLabel label="Orden" name="orden" type="number" value={vm.subForm.orden} onChange={(e) => vm.setSubForm({ ...vm.subForm, orden: Number(e.target.value) })} />
                    </div>
                    <div className="col-span-2">
                        <InputPro isLabel label="Ruta (sidebar)" name="ruta" value={vm.subForm.ruta || ''} onChange={(e) => vm.setSubForm({ ...vm.subForm, ruta: e.target.value })} placeholder="Ej. /administrador/ventas/panel" />
                        <p className="text-xs text-slate-400 mt-1">Ruta de navegación que abre este submódulo en el sidebar.</p>
                    </div>
                    <div className="col-span-2 mt-2">
                        <Toggle label="Submódulo Activo" value={vm.subForm.activo} onChange={v => vm.setSubForm({ ...vm.subForm, activo: v })} />
                    </div>
                </div>
                <div className="flex justify-end gap-2 p-4 pt-0">
                    <Button onClick={() => vm.setIsSubModalOpen(false)} color="secondary" outline>Cancelar</Button>
                    <Button onClick={vm.handleSubmitSub} color="primary" disabled={vm.loading}>{vm.loading ? 'Guardando...' : 'Guardar'}</Button>
                </div>
            </Modal>

            <ModalConfirm
                isOpenModal={vm.modalConfirmOpen}
                setIsOpenModal={vm.setModalConfirmOpen}
                confirmSubmit={vm.handleDelete}
                title="¿Eliminar Módulo?"
                information="Esta acción eliminará el módulo y todos sus submódulos. Los planes que lo usen perderán acceso a él."
            />
            <ModalConfirm
                isOpenModal={vm.modalConfirmSubOpen}
                setIsOpenModal={vm.setModalConfirmSubOpen}
                confirmSubmit={vm.handleDeleteSub}
                title="¿Eliminar Submódulo?"
                information="Se eliminará el submódulo y se revocarán los permisos de todos los usuarios que lo tenían asignado."
            />
        </div>
    );
};

export default ModulosPage;
