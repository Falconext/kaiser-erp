import { useEffect, useState } from 'react';
import { Icon } from '@iconify/react';
import { get, post, patch, del } from '@/utils/fetch';
import useAlertStore from '@/zustand/alert';
import Button from '@/components/Button';
import InputPro from '@/components/InputPro';
import Modal from '@/components/Modal';
import ModalConfirm from '@/components/ModalConfirm';
import TableSkeleton from '@/components/Skeletons/table';
import { useThemeStore, SIDEBAR_COLOR_HEX } from '@/zustand/theme';

interface Rubro {
    id: number;
    nombre: string;
    features?: Record<string, boolean>;
    _count?: { empresas: number };
}

const RUBRO_FEATURES = [
    { key: 'controlStock', label: 'Stock', group: 'Inventario' },
    { key: 'usaCodigoBarras', label: 'Código barras', group: 'Inventario' },
    { key: 'gestionLotes', label: 'Lotes', group: 'Inventario' },
    { key: 'requiereVencimientos', label: 'Vencimientos', group: 'Inventario' },
    { key: 'permiteFraccionamiento', label: 'Fraccionamiento', group: 'Ventas' },
    { key: 'gestionOfertas', label: 'Ofertas', group: 'Ventas' },
    { key: 'fichaTecnicaComputo', label: 'Ficha cómputo', group: 'Cómputo' },
    { key: 'controlSeriesGarantia', label: 'Series/garantía', group: 'Cómputo' },
    { key: 'usaVariantes', label: 'Variantes', group: 'Inventario' },
];

export default function SistemaRubros() {
    const { alert, load } = useAlertStore();
    const sidebarColor = useThemeStore((s) => s.sidebarColor);
    const ACCENT = SIDEBAR_COLOR_HEX[sidebarColor] ?? '#7551FF';

    const [rubros, setRubros] = useState<Rubro[]>([]);
    const [loading, setLocalLoading] = useState(false);
    const [search, setSearch] = useState('');

    const [modalOpen, setModalOpen] = useState(false);
    const [isEdit, setIsEdit] = useState(false);
    const [editId, setEditId] = useState<number | null>(null);
    const [nombre, setNombre] = useState('');
    const [saving, setSaving] = useState(false);

    const [confirmOpen, setConfirmOpen] = useState(false);
    const [deleteId, setDeleteId] = useState<number | null>(null);
    const [savingFeature, setSavingFeature] = useState<string | null>(null);

    const cargar = async () => {
        setLocalLoading(true);
        try {
            const res = await get<any>('/rubro');
            const lista = Array.isArray(res.data) ? res.data : Array.isArray(res) ? res : [];
            setRubros(lista);
        } catch {
            alert('No se pudo cargar los rubros', 'error');
        } finally {
            setLocalLoading(false);
        }
    };

    useEffect(() => { cargar(); }, []);

    const handleOpenCreate = () => {
        setIsEdit(false);
        setEditId(null);
        setNombre('');
        setModalOpen(true);
    };

    const handleOpenEdit = (r: Rubro) => {
        setIsEdit(true);
        setEditId(r.id);
        setNombre(r.nombre);
        setModalOpen(true);
    };

    const handleSubmit = async () => {
        if (!nombre.trim()) return alert('El nombre es obligatorio', 'warning');
        setSaving(true);
        try {
            if (isEdit && editId) {
                await patch(`/rubro/${editId}`, { nombre: nombre.trim() });
                alert('Rubro actualizado', 'success');
            } else {
                await post('/rubro', { nombre: nombre.trim() });
                alert('Rubro creado', 'success');
            }
            setModalOpen(false);
            cargar();
        } catch (e: any) {
            alert(e?.response?.data?.message || 'Error al guardar', 'error');
        } finally {
            setSaving(false);
        }
    };

    const confirmDelete = (id: number) => {
        setDeleteId(id);
        setConfirmOpen(true);
    };

    const handleDelete = async () => {
        if (!deleteId) return;
        load(true);
        try {
            await del(`/rubro/${deleteId}`);
            alert('Rubro eliminado', 'success');
            cargar();
        } catch (e: any) {
            alert(e?.response?.data?.message || 'No se pudo eliminar', 'error');
        } finally {
            load(false);
        }
    };

    const toggleFeature = async (rubro: Rubro, featureKey: string) => {
        const nextFeatures = {
            ...(rubro.features ?? {}),
            [featureKey]: !Boolean(rubro.features?.[featureKey]),
        };
        setSavingFeature(`${rubro.id}:${featureKey}`);
        setRubros((prev) => prev.map((item) => item.id === rubro.id ? { ...item, features: nextFeatures } : item));
        try {
            const res = await patch<any>(`/rubro/${rubro.id}/features`, { features: nextFeatures });
            const updated = res.data ?? res;
            setRubros((prev) => prev.map((item) => item.id === rubro.id ? { ...item, ...(updated || {}), features: updated?.features ?? nextFeatures } : item));
        } catch (e: any) {
            alert(e?.response?.data?.message || 'No se pudo actualizar la característica', 'error');
            cargar();
        } finally {
            setSavingFeature(null);
        }
    };

    const filtered = rubros.filter(r =>
        r.nombre.toLowerCase().includes(search.toLowerCase())
    );

    const conEmpresas = rubros.filter(r => (r._count?.empresas ?? 0) > 0).length;
    const sinUsar = rubros.filter(r => (r._count?.empresas ?? 0) === 0).length;

    if (loading && rubros.length === 0) return <TableSkeleton />;

    return (
        <div className="min-h-screen -m-5 p-5 bg-[#F7F8FB] dark:bg-[#0A0D14] font-jakarta">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm text-slate-400 dark:text-gray-400 mb-5">
                <Icon icon="solar:home-smile-linear" className="text-base" />
                <span>Panel</span>
                <Icon icon="solar:alt-arrow-right-linear" className="text-xs" />
                <span>Sistema</span>
                <Icon icon="solar:alt-arrow-right-linear" className="text-xs" />
                <span className="font-semibold" style={{ color: ACCENT }}>Rubros de negocio</span>
            </div>

            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-5">
                <div className="min-w-0">
                    <h1 className="text-[22px] font-extrabold text-slate-800 dark:text-white tracking-tight">Rubros de Negocio</h1>
                    <p className="text-sm text-slate-400 dark:text-gray-400 mt-0.5">
                        Tipos de negocio que pueden tener las empresas registradas en el sistema
                    </p>
                </div>
                <div className="flex items-center gap-2.5">
                    <div className="relative flex-1 lg:w-72">
                        <Icon icon="solar:magnifer-linear" className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-gray-400" />
                        <input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Buscar rubro…"
                            className="w-full h-11 pl-10 pr-9 rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-700 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-gray-500 focus:outline-none focus:border-[var(--accent)] transition-colors"
                        />
                        {search && (
                            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 dark:text-gray-600 hover:text-slate-500 dark:hover:text-gray-400">
                                <Icon icon="solar:close-circle-bold" />
                            </button>
                        )}
                    </div>
                    <button
                        onClick={handleOpenCreate}
                        className="h-11 px-4 rounded-2xl text-white text-sm font-bold flex items-center gap-1.5 shadow-lg shadow-violet-500/30 hover:brightness-105 transition-all shrink-0"
                        style={{ background: ACCENT }}
                    >
                        <Icon icon="solar:add-circle-bold" className="text-lg" /> <span className="hidden sm:inline">Nuevo Rubro</span>
                    </button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-5">
                {[
                    { label: 'Total rubros', value: rubros.length, icon: 'solar:buildings-3-bold-duotone', chip: 'bg-violet-50 text-violet-600 dark:bg-violet-900/20 dark:text-violet-400' },
                    { label: 'Con empresas', value: conEmpresas, icon: 'solar:check-circle-bold-duotone', chip: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400' },
                    { label: 'Sin usar', value: sinUsar, icon: 'solar:archive-bold-duotone', chip: 'bg-slate-100 text-slate-400 dark:bg-slate-700 dark:text-slate-300' },
                ].map(stat => (
                    <div key={stat.label} className="bg-white dark:bg-slate-800 rounded-3xl shadow-[0_2px_20px_rgba(15,23,42,0.05)] dark:shadow-none px-5 py-4 flex items-center gap-3.5">
                        <div className={`w-11 h-11 rounded-2xl flex items-center justify-center ${stat.chip}`}>
                            <Icon icon={stat.icon} width={22} />
                        </div>
                        <div>
                            <p className="text-2xl font-extrabold text-slate-800 dark:text-white leading-none">{stat.value}</p>
                            <p className="text-xs text-slate-400 dark:text-gray-400 uppercase tracking-wide mt-1.5">{stat.label}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Card contenedora */}
            <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-[0_2px_20px_rgba(15,23,42,0.05)] dark:shadow-none overflow-hidden">
                {/* Toolbar */}
                <div className="flex flex-wrap items-center gap-2.5 p-4 border-b border-slate-100 dark:border-slate-700">
                    <button onClick={cargar} className="h-9 px-3.5 rounded-xl border-2 text-sm font-bold flex items-center gap-1.5 transition-colors"
                        style={{ borderColor: `${ACCENT}55`, color: ACCENT }}>
                        <Icon icon="solar:refresh-linear" className={loading ? 'animate-spin' : ''} /> Actualizar
                    </button>
                    <span className="text-sm text-slate-400 dark:text-gray-400 font-medium px-1">{filtered.length.toLocaleString('es-PE')} resultados</span>
                </div>

                {/* Tabla */}
                {filtered.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse min-w-[860px]">
                            <thead>
                                <tr className="text-[11px] font-bold uppercase tracking-wide text-slate-400 dark:text-gray-400 border-b border-slate-100 dark:border-slate-700">
                                    <th className="py-3 pl-5 pr-2 w-12 text-center">#</th>
                                    <th className="py-3 px-3">Nombre del Rubro</th>
                                    <th className="py-3 px-3 text-center">Empresas</th>
                                    <th className="py-3 px-3">Características por defecto</th>
                                    <th className="py-3 px-3 pr-5 text-center">Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map((r, i) => (
                                    <tr key={r.id} className="border-b border-slate-50 dark:border-slate-800 hover:bg-slate-50/60 dark:hover:bg-slate-800/50 transition-colors group">
                                        <td className="py-3 pl-5 pr-2 text-center">
                                            <span className="text-xs text-slate-400 dark:text-gray-400 font-mono">{i + 1}</span>
                                        </td>
                                        <td className="py-3 px-3">
                                            <div className="flex items-center gap-2.5">
                                                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-violet-400 to-indigo-500 text-white grid place-items-center shrink-0">
                                                    <Icon icon="solar:buildings-3-bold" width={15} />
                                                </div>
                                                <span className="font-semibold text-slate-700 dark:text-slate-200 text-sm">{r.nombre}</span>
                                            </div>
                                        </td>
                                        <td className="py-3 px-3 text-center">
                                            {(r._count?.empresas ?? 0) > 0 ? (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                                    {r._count?.empresas} empresa{(r._count?.empresas ?? 0) !== 1 ? 's' : ''}
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-300">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                                                    Sin usar
                                                </span>
                                            )}
                                        </td>
                                        <td className="py-3 px-3">
                                            <div className="flex flex-wrap gap-1.5 max-w-[520px]">
                                                {RUBRO_FEATURES.map((feature) => {
                                                    const active = Boolean(r.features?.[feature.key]);
                                                    const savingThis = savingFeature === `${r.id}:${feature.key}`;
                                                    return (
                                                        <button
                                                            key={feature.key}
                                                            type="button"
                                                            onClick={() => toggleFeature(r, feature.key)}
                                                            disabled={Boolean(savingFeature)}
                                                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold transition-all ${active
                                                                ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400'
                                                                : 'bg-slate-50 text-slate-400 dark:bg-slate-800 dark:text-gray-500'
                                                                } ${savingThis ? 'opacity-60' : ''}`}
                                                            title={feature.group}
                                                        >
                                                            <Icon icon={active ? 'solar:check-circle-bold' : 'solar:circle-linear'} width={12} />
                                                            {feature.label}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </td>
                                        <td className="py-3 px-3 pr-5">
                                            <div className="flex items-center justify-center gap-1.5">
                                                <button
                                                    onClick={() => handleOpenEdit(r)}
                                                    className="w-8 h-8 rounded-xl flex items-center justify-center bg-violet-50 text-violet-600 dark:bg-violet-900/20 dark:text-violet-400 hover:bg-violet-100 dark:hover:bg-violet-900/30 transition-all"
                                                    title="Editar"
                                                >
                                                    <Icon icon="solar:pen-bold" width={14} />
                                                </button>
                                                <button
                                                    onClick={() => confirmDelete(r.id)}
                                                    className="w-8 h-8 rounded-xl flex items-center justify-center bg-rose-50 text-rose-500 dark:bg-rose-900/20 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                                                    disabled={(r._count?.empresas ?? 0) > 0}
                                                    title={(r._count?.empresas ?? 0) > 0 ? 'Tiene empresas asignadas' : 'Eliminar'}
                                                >
                                                    <Icon icon="solar:trash-bin-trash-bold" width={14} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-20 text-slate-400 dark:text-gray-400">
                        <Icon icon="solar:buildings-3-linear" className="text-6xl text-slate-200 dark:text-gray-700 mb-3" />
                        <h3 className="text-base font-semibold text-slate-500 dark:text-gray-400 mb-1">
                            {search ? 'Sin resultados' : 'No hay rubros registrados'}
                        </h3>
                        <p className="text-sm text-slate-400 dark:text-gray-400 text-center">
                            {search ? `No se encontró "${search}"` : 'Crea el primer rubro del sistema'}
                        </p>
                        {!search && (
                            <button
                                onClick={handleOpenCreate}
                                className="mt-4 inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl text-white text-sm font-bold shadow-lg shadow-violet-500/30 hover:brightness-105 transition-all"
                                style={{ background: ACCENT }}
                            >
                                <Icon icon="solar:add-circle-bold" />
                                Crear Rubro
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* Modal crear/editar */}
            <Modal
                isOpenModal={modalOpen}
                closeModal={() => setModalOpen(false)}
                title={isEdit ? 'Editar Rubro' : 'Nuevo Rubro'}
            >
                <div className="p-6">
                    <InputPro
                        isLabel
                        label="Nombre del Rubro"
                        name="nombre"
                        value={nombre}
                        onChange={e => setNombre(e.target.value)}
                        placeholder="Ej. Farmacia, Restaurante, Bodega..."
                        onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                        autoFocus
                    />
                    <p className="text-xs text-slate-400 dark:text-gray-400 mt-2">
                        El nombre debe ser descriptivo del tipo de negocio. Se usa para activar funciones específicas en el sistema.
                    </p>
                </div>
                <div className="flex justify-end gap-2 p-4 pt-0">
                    <Button onClick={() => setModalOpen(false)} color="secondary" outline>Cancelar</Button>
                    <Button onClick={handleSubmit} color="primary" disabled={saving}>
                        {saving ? 'Guardando...' : 'Guardar'}
                    </Button>
                </div>
            </Modal>

            <ModalConfirm
                isOpenModal={confirmOpen}
                setIsOpenModal={setConfirmOpen}
                confirmSubmit={handleDelete}
                title="¿Eliminar Rubro?"
                information="Se eliminará permanentemente este rubro. Solo se puede eliminar si no tiene empresas asignadas."
            />
        </div>
    );
}
