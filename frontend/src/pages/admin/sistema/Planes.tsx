import { usePlanesViewModel } from '@/features/admin/sistema/usePlanesViewModel';
import Button from "@/components/Button";
import Modal from "@/components/Modal";
import ModalConfirm from "@/components/ModalConfirm";
import InputPro from "@/components/InputPro";
import { Icon } from "@iconify/react";
import ModuloSelector from "@/components/ModuloSelector";
import { useAuthStore } from '@/zustand/auth';

// ── Planes de suscripción — estilo CRM claro (Brix UI) ────────────────────────
const ACCENT = 'var(--accent, #7551FF)';

const Toggle = ({ label, value, onChange }: { label: string, value: boolean, onChange: (v: boolean) => void }) => (
    <div className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-slate-700 last:border-0 hover:bg-gray-50 dark:hover:bg-slate-800 px-2 rounded -mx-2 transition-colors">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</span>
        <button type="button" onClick={() => onChange(!value)} className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${value ? 'bg-blue-600' : 'bg-gray-200 dark:bg-slate-600'}`}>
            <span aria-hidden="true" className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${value ? 'translate-x-5' : 'translate-x-0'}`} />
        </button>
    </div>
);

const LimitToggle = ({
    label,
    checked,
    onChange,
}: {
    label: string;
    checked: boolean;
    onChange: (value: boolean) => void;
}) => (
    <div className="flex items-center justify-between rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50 px-3 py-2">
        <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">{label}</span>
        <button
            type="button"
            onClick={() => onChange(!checked)}
            className={`relative inline-flex h-5 w-10 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${checked ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-slate-600'}`}
        >
            <span
                aria-hidden="true"
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition ${checked ? 'translate-x-5' : 'translate-x-0'}`}
            />
        </button>
    </div>
);

const Planes = () => {
    const vm = usePlanesViewModel();
    const { auth } = useAuthStore();
    const hasProductoScope = auth?.rol === 'ADMIN_SISTEMA' && !!auth?.sistemaProducto;

    const formatMaxComprobantes = (value: number | null | undefined) => {
        if (value === null || value === undefined || Number(value) === 0) {
            return 'Ilimitado';
        }
        return Number(value).toString();
    };

    const formatMaxSedes = (value: number | null | undefined) => {
        if (value === null || value === undefined || Number(value) === 0) {
            return 'Ilimitado';
        }
        const n = Number(value);
        return `${n} sede${n !== 1 ? 's' : ''}`;
    };

    const formatMaxUsuarios = (value: number | null | undefined) => {
        if (value === null || value === undefined || Number(value) === 0) {
            return 'Ilimitado';
        }
        const n = Number(value);
        return `${n} usuar.`;
    };

    return (
        <div className="min-h-screen -m-5 p-5 bg-[#F7F8FB] font-jakarta">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm text-slate-400 mb-5">
                <Icon icon="solar:home-smile-linear" className="text-base" />
                <span>Sistema</span>
                <Icon icon="solar:alt-arrow-right-linear" className="text-xs" />
                <span>Configuración</span>
                <Icon icon="solar:alt-arrow-right-linear" className="text-xs" />
                <span className="font-semibold" style={{ color: ACCENT }}>Planes</span>
            </div>

            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-5">
                <div className="min-w-0">
                    <h1 className="text-[22px] font-extrabold text-slate-800 tracking-tight">Planes de Suscripción</h1>
                    <p className="text-sm text-slate-400 mt-0.5">Gestiona los planes disponibles para las empresas</p>
                </div>
                <div className="flex items-center gap-2.5">
                    {!hasProductoScope && (
                        <div className="flex items-center rounded-2xl border border-slate-200 bg-white p-1">
                            {([
                                { id: '', label: 'Todos' },
                                { id: 'facturacion', label: 'Facturación' },
                                { id: 'hotel', label: 'Hotel' },
                                { id: 'restaurante', label: 'Restaurante' },
                            ] as const).map((item) => {
                                const active = vm.productoFiltro === item.id;
                                return (
                                    <button
                                        key={item.id || 'all'}
                                        type="button"
                                        onClick={() => vm.setProductoFiltro(item.id)}
                                        className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-colors ${active ? 'text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}
                                        style={active ? { background: ACCENT } : undefined}
                                    >
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
                        <Icon icon="solar:add-circle-bold" className="text-lg" /> <span className="hidden sm:inline">Nuevo Plan</span>
                    </button>
                </div>
            </div>

            {/* Card contenedora */}
            <div className="bg-white rounded-3xl shadow-[0_2px_20px_rgba(15,23,42,0.05)] overflow-hidden">
                {/* Toolbar */}
                <div className="flex flex-wrap items-center gap-2.5 p-4 border-b border-slate-100">
                    <div className="h-9 w-9 grid place-items-center rounded-xl bg-violet-50 text-violet-600">
                        <Icon icon="solar:tag-price-bold-duotone" className="text-lg" />
                    </div>
                    <span className="text-sm font-bold text-slate-700">Planes registrados</span>
                    <span className="text-sm text-slate-400 font-medium px-1">{vm.planes.length.toLocaleString('es-PE')} resultados</span>
                </div>

                {/* Tabla */}
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[1100px]">
                        <thead>
                            <tr className="text-[11px] font-bold uppercase tracking-wide text-slate-400 border-b border-slate-100">
                                <th className="py-3 pl-5 pr-3">Nombre</th>
                                <th className="py-3 px-3">Producto</th>
                                <th className="py-3 px-3">Costo</th>
                                <th className="py-3 px-3">Duración</th>
                                <th className="py-3 px-3">Anual</th>
                                <th className="py-3 px-3">Max Compr.</th>
                                <th className="py-3 px-3">Max Sedes</th>
                                <th className="py-3 px-3">Max Usuarios</th>
                                <th className="py-3 px-3">Empresas</th>
                                <th className="py-3 px-3">Estado</th>
                                <th className="py-3 px-3 text-center">Tienda</th>
                                <th className="py-3 px-3 text-center">Ticketera</th>
                                <th className="py-3 px-3 pr-5 text-center">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {vm.loading ? (
                                Array.from({ length: 6 }).map((_, i) => (
                                    <tr key={i} className="border-b border-slate-50">
                                        <td colSpan={13} className="py-3.5 px-5">
                                            <div className="h-6 rounded-lg bg-slate-100 animate-pulse" />
                                        </td>
                                    </tr>
                                ))
                            ) : vm.planes.length === 0 ? (
                                <tr>
                                    <td colSpan={13} className="py-16 text-center">
                                        <Icon icon="solar:tag-price-linear" className="text-5xl text-slate-200 mx-auto mb-2" />
                                        <p className="text-slate-400 text-sm">No hay planes registrados</p>
                                    </td>
                                </tr>
                            ) : vm.planes.map((p) => (
                                <tr key={p.id} className="border-b border-slate-50 hover:bg-slate-50/60 transition-colors">
                                    <td className="py-3 pl-5 pr-3">
                                        <div className="flex items-center gap-2.5 min-w-0">
                                            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-violet-400 to-indigo-500 text-white grid place-items-center text-xs font-bold shrink-0">
                                                {(p.nombre || '?').charAt(0).toUpperCase()}
                                            </div>
                                            <div className="min-w-0">
                                                <div className="font-semibold text-slate-700 text-sm truncate max-w-[200px]">{p.nombre}</div>
                                                {p.descripcion && <div className="text-xs text-slate-400 truncate max-w-[200px]">{p.descripcion}</div>}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="py-3 px-3">
                                        {p.producto === 'hotel'
                                            ? <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-50 text-amber-600">Hotel</span>
                                            : p.producto === 'restaurante'
                                            ? <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-50 text-emerald-600">Restaurante</span>
                                            : <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-blue-50 text-blue-600">Facturación</span>}
                                    </td>
                                    <td className="py-3 px-3 font-bold text-slate-800 text-sm">S/ {Number(p.costo).toFixed(2)}</td>
                                    <td className="py-3 px-3 text-sm text-slate-500">{p.duracionDias} días</td>
                                    <td className="py-3 px-3">
                                        {p.duracionDias >= 360
                                            ? <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-violet-50 text-violet-600">Anual</span>
                                            : <span className="text-xs text-slate-400 font-medium">Mensual</span>}
                                    </td>
                                    <td className="py-3 px-3">
                                        <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-indigo-50 text-indigo-600">{formatMaxComprobantes(p.maxComprobantes)}</span>
                                    </td>
                                    <td className="py-3 px-3">
                                        <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-50 text-emerald-600">{formatMaxSedes(p.maxSedes)}</span>
                                    </td>
                                    <td className="py-3 px-3">
                                        <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-purple-50 text-purple-600">{formatMaxUsuarios(p.limiteUsuarios)}</span>
                                    </td>
                                    <td className="py-3 px-3">
                                        <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-slate-100 text-slate-500">{p._count?.empresas || 0} asignadas</span>
                                    </td>
                                    <td className="py-3 px-3">
                                        {p.esPrueba
                                            ? <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-600"><span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> Prueba</span>
                                            : <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-600"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Comercial</span>}
                                    </td>
                                    <td className="py-3 px-3 text-center">
                                        {p.tieneTienda
                                            ? <Icon icon="solar:check-circle-bold" className="text-emerald-500 inline" width={20} />
                                            : <Icon icon="solar:close-circle-linear" className="text-slate-300 inline" width={20} />}
                                    </td>
                                    <td className="py-3 px-3 text-center">
                                        {p.tieneTicketera
                                            ? <Icon icon="solar:printer-bold" className="text-blue-500 inline" width={20} />
                                            : <Icon icon="solar:close-circle-linear" className="text-slate-300 inline" width={20} />}
                                    </td>
                                    <td className="py-3 px-3 pr-5">
                                        <div className="flex items-center justify-center gap-1.5">
                                            <button type="button" onClick={() => vm.handleOpenEdit(p)} className="h-8 w-8 grid place-items-center rounded-lg text-slate-400 hover:bg-violet-50 hover:text-violet-600 transition-colors" title="Editar">
                                                <Icon icon="solar:pen-linear" width={18} />
                                            </button>
                                            <button type="button" onClick={() => vm.confirmDelete(p.id)} className="h-8 w-8 grid place-items-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors" title="Eliminar">
                                                <Icon icon="solar:trash-bin-trash-linear" width={18} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>



            <Modal isOpenModal={vm.isModalOpen} closeModal={() => vm.setIsModalOpen(false)} title={vm.isEdit ? 'Editar Plan' : 'Nuevo Plan'} position="right" width="600px">
                <div className="p-6 space-y-5">
                    <div className="rounded-lg">
                        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4 uppercase tracking-wider">Información Básica</h4>
                        <div className="space-y-4">
                            <InputPro isLabel label="Nombre del Plan" name="nombre" value={vm.form.nombre} onChange={(e) => vm.setForm({ ...vm.form, nombre: e.target.value })} placeholder="Ej. Plan Emprendedor" />
                            <InputPro isLabel label="Descripción Corta" name="descripcion" value={vm.form.descripcion} onChange={(e) => vm.setForm({ ...vm.form, descripcion: e.target.value })} placeholder="Breve descripción..." />
                            {!hasProductoScope && (
                                <div>
                                    <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wider">Producto del plan</p>
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
                                                    onClick={() => vm.setForm((prev) => ({ ...prev, producto: product.id, moduloIds: [], subModuloIds: [] }))}
                                                    className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all ${selected ? 'border-sky-500 bg-sky-50 dark:bg-sky-900/30 dark:border-sky-400 shadow-sm' : 'border-gray-200 dark:border-slate-600 hover:border-sky-300 dark:hover:border-sky-400 bg-white dark:bg-slate-800/50'}`}
                                                >
                                                    <Icon icon={product.icon} width={20} style={{ color: selected ? product.color : '#9CA3AF' }} />
                                                    <span className={`font-semibold text-sm ${selected ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}>{product.label}</span>
                                                    {selected && <Icon icon="solar:check-circle-bold" width={16} className="ml-auto text-sky-500" />}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                            {/* Selector de plataforma del plan (plataforma múltiple) eliminado:
                                sistema unificado, el plan usa la marca neutra 'default'. */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <InputPro isLabel label="Costo (S/)" name="costo" type="number" value={vm.form.costo} onChange={(e) => vm.setForm({ ...vm.form, costo: Number(e.target.value) })} />
                                <InputPro isLabel label="Duración (Días)" name="duracionDias" type="number" value={vm.form.duracionDias} onChange={(e) => vm.setForm({ ...vm.form, duracionDias: Number(e.target.value) })} />
                            </div>
                        </div>
                    </div>
                    <div className="border-t border-gray-100 dark:border-slate-700 my-4"></div>
                    <div className="rounded-lg">
                        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4 uppercase tracking-wider">Límites</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <InputPro
                                    isLabel
                                    label="Límite Usuarios"
                                    name="limiteUsuarios"
                                    type="number"
                                    value={vm.form.limiteUsuarios}
                                    disabled={Number(vm.form.limiteUsuarios ?? 0) === 0}
                                    onChange={(e) => vm.setForm({ ...vm.form, limiteUsuarios: Number(e.target.value) })}
                                />
                                <LimitToggle
                                    label="Ilimitado"
                                    checked={Number(vm.form.limiteUsuarios ?? 0) === 0}
                                    onChange={(checked) =>
                                        vm.setForm({ ...vm.form, limiteUsuarios: checked ? 0 : 1 })
                                    }
                                />
                            </div>
                            <div className="space-y-2">
                                <InputPro
                                    isLabel
                                    label="Máx. Sedes"
                                    name="maxSedes"
                                    type="number"
                                    value={(vm.form as any).maxSedes ?? 1}
                                    disabled={Number((vm.form as any).maxSedes ?? 0) === 0}
                                    onChange={(e) => vm.setForm({ ...vm.form, maxSedes: Number(e.target.value) } as any)}
                                />
                                <LimitToggle
                                    label="Ilimitado"
                                    checked={Number((vm.form as any).maxSedes ?? 0) === 0}
                                    onChange={(checked) =>
                                        vm.setForm({ ...vm.form, maxSedes: checked ? 0 : 1 } as any)
                                    }
                                />
                            </div>
                            <div className="space-y-2">
                                <InputPro
                                    isLabel
                                    label="Máx. Comprobantes"
                                    name="maxComprobantes"
                                    type="number"
                                    value={vm.form.maxComprobantes}
                                    disabled={Number(vm.form.maxComprobantes ?? 0) === 0}
                                    onChange={(e) => vm.setForm({ ...vm.form, maxComprobantes: Number(e.target.value) })}
                                />
                                <LimitToggle
                                    label="Ilimitado"
                                    checked={Number(vm.form.maxComprobantes ?? 0) === 0}
                                    onChange={(checked) =>
                                        vm.setForm({ ...vm.form, maxComprobantes: checked ? 0 : 100 })
                                    }
                                />
                            </div>
                        </div>
                        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                            Usa <span className="font-semibold">0</span> para dejar el límite como <span className="font-semibold">Ilimitado</span>.
                        </p>
                    </div>
                    <div className="border-t border-gray-100 dark:border-slate-700 my-4"></div>
                    <div className="space-y-3">
                        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Configuración Avanzada</h4>
                        <button type="button" onClick={() => vm.setShowFeaturesModal(true)} className="w-full flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors group">
                            <div className="flex items-center gap-3"><div className="p-2 bg-blue-100 text-blue-600 rounded-lg"><Icon icon="solar:stars-minimalistic-bold-duotone" width={24} /></div><div className="text-left"><div className="font-semibold text-gray-800 dark:text-white">Características</div><div className="text-xs text-gray-500 dark:text-gray-400">Tienda, delivery, imágenes, etc.</div></div></div>
                            <Icon icon="solar:alt-arrow-right-linear" className="text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-300" width={20} />
                        </button>
                        <button type="button" onClick={() => vm.setShowModulesModal(true)} className="w-full flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors group">
                            <div className="flex items-center gap-3"><div className="p-2 bg-purple-100 text-purple-600 rounded-lg"><Icon icon="solar:widget-bold-duotone" width={24} /></div><div className="text-left"><div className="font-semibold text-gray-800 dark:text-white">Módulos y Submódulos</div><div className="text-xs text-gray-500 dark:text-gray-400">Acceso a secciones del sistema</div></div></div>
                            <div className="flex items-center gap-2">
                                {(vm.form.moduloIds?.length || 0) > 0 && <span className="bg-purple-600 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">{vm.form.moduloIds?.length} mód.</span>}
                                {(vm.form.subModuloIds?.length || 0) > 0 && <span className="bg-indigo-500 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">{vm.form.subModuloIds?.length} sub.</span>}
                                <Icon icon="solar:alt-arrow-right-linear" className="text-gray-400" width={20} />
                            </div>
                        </button>
                    </div>
                </div>
                <div className="flex justify-end gap-2 p-6 border-t border-gray-100 dark:border-slate-800 bg-white dark:bg-[#111827] sticky bottom-0 z-10">
                    <Button onClick={() => vm.setIsModalOpen(false)} color="secondary" outline>Cancelar</Button>
                    <Button onClick={vm.handleSubmit} color="primary" disabled={vm.loading}>{vm.loading ? 'Guardando...' : 'Guardar Plan'}</Button>
                </div>
            </Modal>
            <Modal isOpenModal={vm.showFeaturesModal} closeModal={() => vm.setShowFeaturesModal(false)} title="Características del Plan" position="right" width="500px" backdropClassName="bg-black/20">
                <div className="p-6">
                    <div className="space-y-1 dark:bg-transparent">
                        {(vm.featureCatalog.length ? vm.featureCatalog : [
                            { key: 'esPrueba', label: 'Plan de Prueba (Gratuito)' },
                            { key: 'tieneTienda', label: 'Tienda Virtual' },
                            { key: 'tieneBanners', label: 'Banners Publicitarios', dependsOn: 'tieneTienda' },
                            { key: 'tieneGaleria', label: 'Galería de Imágenes', dependsOn: 'tieneTienda' },
                            { key: 'tieneCulqi', label: 'Pasarela Pagos (Culqi)', dependsOn: 'tieneTienda' },
                            { key: 'tieneDeliveryGPS', label: 'Delivery GPS Tracker' },
                            { key: 'tieneTicketera', label: 'Ticketera (Impresión Térmica)' },
                            { key: 'tieneGestionLotes', label: 'Gestión de Lotes' },
                            { key: 'tieneGestionProvisiones', label: 'Gestión de Provisiones' },
                        ] as any[]).map((feature: any) => {
                            const disabled = feature.dependsOn && !Boolean((vm.form as any)[feature.dependsOn]);
                            const value = Boolean((vm.form as any)[feature.key]);

                            return (
                                <div key={feature.key} className={disabled ? 'opacity-50 pointer-events-none' : ''}>
                                    <Toggle
                                        label={feature.label}
                                        value={value}
                                        onChange={v => vm.setForm({ ...vm.form, [feature.key]: v })}
                                    />
                                    {feature.description && (
                                        <p className="text-[11px] text-gray-400 dark:text-slate-500 -mt-2 mb-2 px-1">{feature.description}</p>
                                    )}
                                    {value && Array.isArray(feature.limits) && feature.limits.length > 0 && (
                                        <div className="ml-4 pl-4 border-l-2 border-gray-100 dark:border-slate-700 mb-2 space-y-2 bg-gray-50 dark:bg-slate-800/30 p-3 rounded-r-lg">
                                            <h5 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Límites de {feature.label}</h5>
                                            {feature.limits.map((limit: any) => (
                                                <InputPro
                                                    key={limit.key}
                                                    isLabel
                                                    label={limit.label}
                                                    name={limit.key}
                                                    type="number"
                                                    value={(vm.form as any)[limit.key]}
                                                    onChange={(e) => vm.setForm({ ...vm.form, [limit.key]: Number(e.target.value) })}
                                                />
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                    <div className="mt-6 pt-4 border-t border-gray-100 dark:border-slate-700 flex justify-end"><Button onClick={() => vm.setShowFeaturesModal(false)} color="black">Listo</Button></div>
                </div>
            </Modal>
            <Modal isOpenModal={vm.showModulesModal} closeModal={() => vm.setShowModulesModal(false)} title="Módulos y Submódulos del Plan" position="right" width="900px" backdropClassName="bg-black/20">
                <div className="p-6">
                    <div className="mb-6 bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg border border-purple-100 dark:border-purple-800">
                        <h4 className="text-sm font-bold text-purple-800 dark:text-purple-300 mb-1">Control de Acceso por Plan</h4>
                        <p className="text-sm text-purple-700 dark:text-purple-400">Selecciona los <strong>módulos</strong> que incluye este plan. Para cada módulo seleccionado, haz clic en <strong>▼</strong> para elegir qué <strong>submódulos</strong> estarán disponibles. Si no configuras submódulos, la empresa tendrá acceso a todos los del módulo.</p>
                    </div>
                    <ModuloSelector
                        producto={(vm.form.producto || 'facturacion') as 'facturacion' | 'hotel' | 'restaurante'}
                        selectedModulos={vm.form.moduloIds || []}
                        onModulosChange={(modulos) => vm.setForm(prev => ({ ...prev, moduloIds: modulos }))}
                        selectedSubModulos={vm.form.subModuloIds || []}
                        onSubModulosChange={(subs) => vm.setForm(prev => ({ ...prev, subModuloIds: subs }))}
                    />
                    <div className="mt-8 pt-4 border-t border-gray-100 dark:border-slate-700 flex justify-end">
                        <Button onClick={() => vm.setShowModulesModal(false)} color="black">Guardar Selección</Button>
                    </div>
                </div>
            </Modal>
            <ModalConfirm isOpenModal={vm.modalConfirmOpen} setIsOpenModal={vm.setModalConfirmOpen} confirmSubmit={vm.handleDelete} title="¿Eliminar Plan?" information="Esta acción eliminará el plan permanentemente. No se puede deshacer.">
                <p className="text-red-500 text-sm mt-2">Nota: No podrás eliminar planes que ya tengan empresas asignadas.</p>
            </ModalConfirm>
        </div>
    );
};

export default Planes;
