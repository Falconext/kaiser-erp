import { FormEvent } from "react";
import { useCatalogoGlobalViewModel } from "@/features/admin/sistema/useCatalogoGlobalViewModel";
import Button from "@/components/Button";
import { Icon } from "@iconify/react";
import Pagination from "@/components/Pagination";
import ModalConfirm from "@/components/ModalConfirm";
import Modal from "@/components/Modal";
import Select from "@/components/Select";
import { useThemeStore, SIDEBAR_COLOR_HEX } from "@/zustand/theme";

type CatalogoPlantilla = {
    id: number;
    nombre: string;
    descripcion?: string;
    marca?: string;
    categoria?: string;
    imagenUrl?: string;
    precioSugerido?: number | string;
    rubro?: { nombre?: string };
};

type RubroOption = {
    id: number;
    nombre: string;
};

type EmpresaOption = {
    id: number;
    ruc?: string;
    razonSocial?: string;
};

const inputClass =
    "h-11 w-full rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 text-sm font-medium text-slate-800 dark:text-white outline-none transition placeholder:text-slate-400 dark:placeholder:text-gray-500 focus:border-violet-500";

const labelClass = "mb-2 block text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400 dark:text-gray-400";

const textareaClass = `${inputClass} h-24 resize-none py-3`;

const CatalogoGlobal = () => {
    const vm = useCatalogoGlobalViewModel();
    const sidebarColor = useThemeStore((s) => s.sidebarColor);
    const ACCENT = SIDEBAR_COLOR_HEX[sidebarColor] ?? "#7551FF";
    const plantillas = (vm.plantillas || []) as CatalogoPlantilla[];
    const rubros = (vm.rubros || []) as RubroOption[];
    const empresas = (vm.empresas || []) as EmpresaOption[];
    const totalSinImagen = plantillas.filter((p) => !p.imagenUrl).length;

    const selectedRubro = rubros.find((r) => r.id === vm.rubroId)?.nombre || "Todos";

    const renderImage = (plantilla: CatalogoPlantilla) => {
        if (plantilla.imagenUrl) {
            return (
                <a
                    href={plantilla.imagenUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-1 shadow-sm dark:shadow-none"
                >
                    <img
                        src={plantilla.imagenUrl}
                        alt={plantilla.nombre}
                        referrerPolicy="no-referrer"
                        className="h-full w-full object-contain"
                    />
                </a>
            );
        }

        if (vm.processingId === plantilla.id) {
            return (
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-violet-200 dark:border-violet-900/40 bg-violet-50 dark:bg-violet-900/20">
                    <Icon icon="mdi:loading" className="h-6 w-6 animate-spin text-violet-500" />
                </div>
            );
        }

        return (
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-300 dark:text-gray-600">
                <Icon icon="solar:gallery-linear" className="h-6 w-6" />
            </div>
        );
    };

    const stats = [
        { label: "Plantillas", value: vm.total, icon: "solar:box-bold-duotone", chip: "bg-violet-50 text-violet-600 dark:bg-violet-900/20 dark:text-violet-400" },
        { label: "Página actual", value: plantillas.length, icon: "solar:documents-bold-duotone", chip: "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400" },
        { label: "Sin imagen", value: totalSinImagen, icon: "solar:gallery-remove-bold-duotone", chip: "bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400" },
    ];

    return (
        <div className="min-h-screen -m-5 p-5 bg-[#F7F8FB] dark:bg-[#0A0D14] font-jakarta" style={{ ["--accent" as any]: ACCENT }}>
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm text-slate-400 dark:text-gray-400 mb-5">
                <Icon icon="solar:home-smile-linear" className="text-base" />
                <span>Panel</span>
                <Icon icon="solar:alt-arrow-right-linear" className="text-xs" />
                <span>Sistema</span>
                <Icon icon="solar:alt-arrow-right-linear" className="text-xs" />
                <span className="font-semibold" style={{ color: ACCENT }}>Catálogo Global</span>
            </div>

            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-5">
                <div className="min-w-0">
                    <h1 className="text-[22px] font-extrabold text-slate-800 dark:text-white tracking-tight">Catálogo Global</h1>
                    <p className="text-sm text-slate-400 dark:text-gray-400 mt-0.5">
                        Biblioteca maestra para importar productos por rubro, imagen y categoría.
                    </p>
                </div>

                <div className="flex items-center gap-2.5">
                    <div className="relative flex-1 lg:w-72">
                        <Icon icon="solar:magnifer-linear" className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-gray-400" />
                        <input
                            value={vm.search}
                            onChange={(event) => vm.setSearch(event.target.value)}
                            placeholder="Nombre, marca, descripción…"
                            className="w-full h-11 pl-10 pr-9 rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-700 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-gray-500 focus:outline-none focus:border-[var(--accent)] transition-colors"
                        />
                        {vm.search && (
                            <button onClick={() => vm.setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 dark:text-gray-600 hover:text-slate-500 dark:hover:text-gray-400">
                                <Icon icon="solar:close-circle-bold" />
                            </button>
                        )}
                    </div>
                    <button
                        onClick={vm.openNew}
                        className="h-11 px-4 rounded-2xl text-white text-sm font-bold flex items-center gap-1.5 shadow-lg shadow-violet-500/30 hover:brightness-105 transition-all shrink-0"
                        style={{ background: ACCENT }}
                    >
                        <Icon icon="solar:add-circle-bold" className="text-lg" />
                        <span className="hidden sm:inline">Nueva plantilla</span>
                    </button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 mb-5">
                {stats.map((s) => (
                    <div key={s.label} className="bg-white dark:bg-slate-800 rounded-3xl shadow-[0_2px_20px_rgba(15,23,42,0.05)] dark:shadow-none p-5 flex items-center gap-4">
                        <div className={`h-11 w-11 rounded-2xl grid place-items-center ${s.chip}`}>
                            <Icon icon={s.icon} className="text-xl" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-slate-400 dark:text-gray-400 uppercase tracking-wide text-xs font-bold">{s.label}</p>
                            <p className="text-2xl font-extrabold text-slate-800 dark:text-white leading-tight">{s.value}</p>
                        </div>
                    </div>
                ))}
                <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-[0_2px_20px_rgba(15,23,42,0.05)] dark:shadow-none p-5 flex items-center gap-4">
                    <div className="h-11 w-11 rounded-2xl grid place-items-center bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400">
                        <Icon icon="solar:filter-bold-duotone" className="text-xl" />
                    </div>
                    <div className="min-w-0">
                        <p className="text-slate-400 dark:text-gray-400 uppercase tracking-wide text-xs font-bold">Filtro rubro</p>
                        <p className="text-sm font-extrabold text-slate-800 dark:text-white truncate">{selectedRubro}</p>
                    </div>
                </div>
            </div>

            {/* Card contenedora */}
            <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-[0_2px_20px_rgba(15,23,42,0.05)] dark:shadow-none overflow-hidden">
                {/* Toolbar */}
                <div className="flex flex-wrap items-center gap-2.5 p-4 border-b border-slate-100 dark:border-slate-700">
                    <div className="w-56">
                        <Select
                            label=""
                            name="rubroFilter"
                            error=""
                            options={[
                                { id: "", value: "Todos los rubros" },
                                ...rubros.map((rubro) => ({ id: rubro.id, value: rubro.nombre })),
                            ]}
                            value={vm.rubroId ? (rubros.find((r) => r.id === vm.rubroId)?.nombre || "Todos los rubros") : "Todos los rubros"}
                            onChange={(id) => vm.setRubroId(id ? Number(id) : undefined)}
                        />
                    </div>

                    {vm.selectedIds.length > 0 ? (
                        <>
                            <span className="h-9 px-3.5 rounded-xl bg-violet-50 dark:bg-violet-900/20 text-sm font-bold flex items-center gap-1.5" style={{ color: ACCENT }}>
                                {vm.selectedIds.length} seleccionado{vm.selectedIds.length > 1 ? "s" : ""}
                            </span>
                            <button onClick={vm.handleBulkDeleteImages} disabled={vm.actionLoading}
                                className="h-9 px-3.5 rounded-xl border border-amber-200 dark:border-amber-900/40 bg-amber-50 dark:bg-amber-900/20 text-sm font-semibold text-amber-700 dark:text-amber-400 flex items-center gap-1.5 hover:bg-amber-100 dark:hover:bg-amber-900/30 disabled:opacity-50">
                                <Icon icon="solar:gallery-remove-linear" /> Borrar imágenes
                            </button>
                            <button onClick={vm.handleBulkDelete} disabled={vm.actionLoading}
                                className="h-9 px-3.5 rounded-xl border border-rose-200 dark:border-rose-900/40 bg-rose-50 dark:bg-rose-900/20 text-sm font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-1.5 hover:bg-rose-100 dark:hover:bg-rose-900/30 disabled:opacity-50">
                                <Icon icon="solar:trash-bin-trash-broken" /> Eliminar
                            </button>
                            <button onClick={vm.clearSelection}
                                className="h-9 px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1.5 hover:bg-slate-50 dark:hover:bg-slate-800">
                                Cancelar
                            </button>
                        </>
                    ) : (
                        <>
                            <button onClick={vm.toggleSelectAll} disabled={plantillas.length === 0}
                                className="h-9 px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50">
                                <Icon icon="solar:checklist-minimalistic-linear" /> Seleccionar
                            </button>
                            <button onClick={vm.handleBuscarImagenesFaltantes} disabled={vm.categorizando || vm.buscandoImagenes}
                                className="h-9 px-3.5 rounded-xl border border-cyan-200 dark:border-cyan-900/40 bg-cyan-50 dark:bg-cyan-900/20 text-sm font-semibold text-cyan-700 dark:text-cyan-400 flex items-center gap-1.5 hover:bg-cyan-100 dark:hover:bg-cyan-900/30 disabled:opacity-50">
                                {vm.buscandoImagenes ? (
                                    <><Icon icon="mdi:loading" className="animate-spin" /> Buscando</>
                                ) : (
                                    <><Icon icon="solar:gallery-add-linear" /> Auto-imágenes</>
                                )}
                            </button>
                            <button onClick={vm.handleCategorizarIA} disabled={vm.categorizando || vm.buscandoImagenes}
                                className="h-9 px-3.5 rounded-xl border border-fuchsia-200 dark:border-fuchsia-900/40 bg-fuchsia-50 dark:bg-fuchsia-900/20 text-sm font-semibold text-fuchsia-700 dark:text-fuchsia-400 flex items-center gap-1.5 hover:bg-fuchsia-100 dark:hover:bg-fuchsia-900/30 disabled:opacity-50">
                                {vm.categorizando ? (
                                    <><Icon icon="mdi:loading" className="animate-spin" /> Categorizando</>
                                ) : (
                                    <><Icon icon="solar:magic-stick-3-linear" /> Auto-categoría</>
                                )}
                            </button>
                            <button onClick={() => vm.setIsModalImportOpen(true)}
                                className="h-9 px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1.5 hover:bg-slate-50 dark:hover:bg-slate-800">
                                <Icon icon="solar:download-minimalistic-linear" /> Importar
                            </button>
                        </>
                    )}

                    <span className="ml-auto text-sm text-slate-400 dark:text-gray-400 font-medium px-1">{Number(vm.total).toLocaleString("es-PE")} resultados</span>
                </div>

                {/* Tabla */}
                {vm.loading ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse min-w-[1120px]">
                            <tbody>
                                {Array.from({ length: 8 }).map((_, i) => (
                                    <tr key={i} className="border-b border-slate-50 dark:border-slate-800">
                                        <td className="py-3.5 px-5">
                                            <div className="h-8 rounded-lg bg-slate-100 dark:bg-slate-700 animate-pulse" />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse min-w-[1120px]">
                            <thead>
                                <tr className="text-[11px] font-bold uppercase tracking-wide text-slate-400 dark:text-gray-400 border-b border-slate-100 dark:border-slate-700">
                                    <th className="py-3 pl-5 pr-2 w-10">
                                        <input
                                            type="checkbox"
                                            checked={plantillas.length > 0 && vm.selectedIds.length === plantillas.length}
                                            onChange={vm.toggleSelectAll}
                                            className="h-4 w-4 rounded accent-violet-600 align-middle"
                                        />
                                    </th>
                                    <th className="py-3 px-3">Imagen</th>
                                    <th className="py-3 px-3">Producto</th>
                                    <th className="py-3 px-3">Marca</th>
                                    <th className="py-3 px-3">Categoría</th>
                                    <th className="py-3 px-3">Rubro</th>
                                    <th className="py-3 px-3 text-right">Precio sug.</th>
                                    <th className="py-3 px-3 pr-5 text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {plantillas.map((plantilla) => (
                                    <tr key={plantilla.id} className="border-b border-slate-50 dark:border-slate-800 hover:bg-slate-50/60 dark:hover:bg-slate-800/50 transition-colors">
                                        <td className="py-3 pl-5 pr-2">
                                            <input
                                                type="checkbox"
                                                checked={vm.selectedIds.includes(plantilla.id)}
                                                onChange={() => vm.toggleSelect(plantilla.id)}
                                                className="h-4 w-4 rounded accent-violet-600 align-middle"
                                            />
                                        </td>
                                        <td className="py-3 px-3">{renderImage(plantilla)}</td>
                                        <td className="max-w-[360px] py-3 px-3">
                                            <p className="font-semibold text-slate-800 dark:text-white text-sm">{plantilla.nombre}</p>
                                            <p className="mt-0.5 line-clamp-2 text-xs text-slate-400 dark:text-gray-400">{plantilla.descripcion || "Sin descripción"}</p>
                                        </td>
                                        <td className="py-3 px-3">
                                            {plantilla.marca ? (
                                                <span className="inline-flex px-2 py-0.5 rounded-md text-[11px] font-bold bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400">
                                                    {plantilla.marca}
                                                </span>
                                            ) : (
                                                <span className="text-xs italic text-slate-300 dark:text-gray-600">Sin marca</span>
                                            )}
                                        </td>
                                        <td className="py-3 px-3">
                                            {plantilla.categoria ? (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-violet-50 text-violet-600 dark:bg-violet-900/20 dark:text-violet-400">
                                                    <Icon icon="solar:tag-linear" width={12} />
                                                    {plantilla.categoria}
                                                </span>
                                            ) : (
                                                <span className="text-slate-300 dark:text-gray-600">-</span>
                                            )}
                                        </td>
                                        <td className="py-3 px-3 text-sm text-slate-600 dark:text-slate-300">{plantilla.rubro?.nombre || "-"}</td>
                                        <td className="py-3 px-3 text-right font-bold text-slate-800 dark:text-white text-sm">
                                            S/ {Number(plantilla.precioSugerido || 0).toFixed(2)}
                                        </td>
                                        <td className="py-3 px-3 pr-5">
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => vm.openEdit(plantilla)}
                                                    className="flex h-9 w-9 items-center justify-center rounded-xl border border-blue-100 dark:border-blue-900/40 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 transition hover:bg-blue-100 dark:hover:bg-blue-900/30"
                                                    title="Editar"
                                                >
                                                    <Icon icon="solar:pen-new-square-linear" width={18} />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => vm.openDelete(plantilla.id)}
                                                    className="flex h-9 w-9 items-center justify-center rounded-xl border border-rose-100 dark:border-rose-900/40 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 transition hover:bg-rose-100 dark:hover:bg-rose-900/30"
                                                    title="Eliminar"
                                                >
                                                    <Icon icon="solar:trash-bin-trash-broken" width={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {plantillas.length === 0 && (
                                    <tr>
                                        <td colSpan={8} className="py-16 text-center">
                                            <Icon icon="solar:box-minimalistic-linear" className="mx-auto mb-2 text-5xl text-slate-200 dark:text-gray-700" />
                                            <p className="font-semibold text-slate-600 dark:text-slate-300">No hay plantillas para mostrar</p>
                                            <p className="mt-1 text-sm text-slate-400 dark:text-gray-400">Ajusta los filtros o crea una nueva plantilla global.</p>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Paginación */}
                <div className="border-t border-slate-100 dark:border-slate-700 px-4 py-3">
                    <Pagination
                        data={plantillas}
                        total={vm.total}
                        currentPage={vm.page}
                        setcurrentPage={vm.setPage}
                        setitemsPerPage={vm.setLimit}
                        indexOfFirstItem={(vm.page - 1) * vm.limit}
                        indexOfLastItem={Math.min(vm.page * vm.limit, vm.total)}
                        pages={Array.from({ length: Math.ceil(vm.total / vm.limit) }, (_, i) => i + 1)}
                    />
                </div>
            </div>

            <Modal isOpenModal={vm.isModalOpen} closeModal={() => vm.setIsModalOpen(false)} title={vm.isEdit ? "Editar plantilla" : "Nueva plantilla"} width="640px">
                <form onSubmit={(event: FormEvent) => vm.handleSubmit(event)} className="space-y-4 p-6">
                    <label className="block">
                        <span className={labelClass}>Nombre del producto *</span>
                        <input value={vm.form.nombre || ""} onChange={(event) => vm.setForm({ ...vm.form, nombre: event.target.value })} className={inputClass} placeholder="Ej. Coca Cola 3L" />
                    </label>
                    <label className="block">
                        <span className={labelClass}>Descripción</span>
                        <textarea value={vm.form.descripcion || ""} onChange={(event) => vm.setForm({ ...vm.form, descripcion: event.target.value })} className={textareaClass} placeholder="Detalles del producto" />
                    </label>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <label className="block">
                            <span className={labelClass}>Marca</span>
                            <input value={vm.form.marca || ""} onChange={(event) => vm.setForm({ ...vm.form, marca: event.target.value })} className={inputClass} placeholder="Ej. Gloria" />
                        </label>
                        <label className="block">
                            <span className={labelClass}>Categoría</span>
                            <input value={vm.form.categoria || ""} onChange={(event) => vm.setForm({ ...vm.form, categoria: event.target.value })} className={inputClass} placeholder="Ej. Bebidas" />
                        </label>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <label className="block">
                            <span className={labelClass}>Precio sugerido (S/)</span>
                            <input
                                type="number"
                                value={vm.form.precioSugerido || 0}
                                onChange={(event) => vm.setForm({ ...vm.form, precioSugerido: Number(event.target.value) })}
                                className={inputClass}
                                placeholder="0.00"
                            />
                        </label>
                        <div className="block">
                            <Select
                                label="Rubro *"
                                name="formRubroId"
                                error=""
                                options={[
                                    { id: "", value: "Seleccione rubro" },
                                    ...rubros.map((rubro) => ({ id: rubro.id, value: rubro.nombre })),
                                ]}
                                value={vm.form.rubroId ? (rubros.find((r) => r.id === vm.form.rubroId)?.nombre || "Seleccione rubro") : "Seleccione rubro"}
                                onChange={(id) => vm.setForm({ ...vm.form, rubroId: Number(id) })}
                            />
                        </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 p-4">
                        <div className="mb-3 flex items-center justify-between">
                            <div>
                                <p className="text-sm font-bold text-slate-800 dark:text-white">Imagen del producto</p>
                                <p className="text-xs text-slate-400 dark:text-gray-400">JPG, PNG o WebP para la plantilla global.</p>
                            </div>
                            <Icon icon="solar:gallery-wide-bold-duotone" className="h-7 w-7 text-violet-500" />
                        </div>
                        <input
                            type="file"
                            accept="image/*"
                            className="block w-full text-sm text-slate-500 dark:text-gray-400 file:mr-4 file:rounded-xl file:border-0 file:bg-violet-600 file:px-4 file:py-2 file:text-sm file:font-bold file:text-white hover:file:bg-violet-500"
                            onChange={(event) => vm.setSelectedFile(event.target.files ? event.target.files[0] : null)}
                        />
                        {(vm.selectedFile || vm.form.imagenUrl) ? (
                            <div className="relative mt-4 flex h-56 items-center justify-center overflow-hidden rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-900">
                                <img
                                    src={vm.selectedFile ? URL.createObjectURL(vm.selectedFile) : vm.form.imagenUrl}
                                    alt="Previsualización"
                                    className="max-h-full max-w-full object-contain p-3"
                                />
                                <span className="absolute bottom-3 right-3 rounded-lg bg-black/70 px-2 py-1 text-xs font-semibold text-white">Vista previa</span>
                            </div>
                        ) : (
                            <div className="mt-4 flex h-32 items-center justify-center rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-900 text-sm text-slate-400 dark:text-gray-400">
                                Sin imagen seleccionada
                            </div>
                        )}
                    </div>

                    <div className="flex justify-end gap-2 border-t border-slate-200 dark:border-slate-700 pt-4">
                        <Button type="button" onClick={() => vm.setIsModalOpen(false)} color="secondary" outline>
                            Cancelar
                        </Button>
                        <Button type="submit" color="primary">
                            Guardar
                        </Button>
                    </div>
                </form>
            </Modal>

            <ModalConfirm
                isOpenModal={vm.modalConfirmOpen}
                setIsOpenModal={vm.setModalConfirmOpen}
                confirmSubmit={vm.handleDelete}
                title="Eliminar plantilla"
                information="¿Estás seguro? Esto no afectará a los productos ya importados por las empresas."
            />

            <Modal isOpenModal={vm.isModalImportOpen} closeModal={() => vm.setIsModalImportOpen(false)} title="Importar desde empresa" width="520px">
                <div className="space-y-4 p-6">
                    <p className="text-sm text-slate-500 dark:text-gray-400">Copia productos de una empresa hacia el catálogo global y asígnalos a un rubro maestro.</p>
                    <div className="block">
                        <Select
                            label="Empresa de origen"
                            name="empresaIdToImport"
                            error=""
                            options={[
                                { id: "", value: "Seleccione empresa" },
                                ...empresas.map((empresa) => ({ id: empresa.id, value: `${empresa.ruc} - ${empresa.razonSocial}` })),
                            ]}
                            value={(() => {
                                const e = empresas.find((emp) => emp.id === vm.empresaIdToImport);
                                return e ? `${e.ruc} - ${e.razonSocial}` : "Seleccione empresa";
                            })()}
                            onChange={(id) => vm.setEmpresaIdToImport(Number(id))}
                        />
                    </div>
                    <div className="block">
                        <Select
                            label="Rubro destino *"
                            name="rubroIdToImport"
                            error=""
                            options={[
                                { id: "", value: "Seleccione rubro" },
                                ...rubros.map((rubro) => ({ id: rubro.id, value: rubro.nombre })),
                            ]}
                            value={vm.rubroIdToImport ? (rubros.find((r) => r.id === vm.rubroIdToImport)?.nombre || "Seleccione rubro") : "Seleccione rubro"}
                            onChange={(id) => vm.setRubroIdToImport(Number(id))}
                        />
                    </div>
                    <div className="flex justify-end gap-2 border-t border-slate-200 dark:border-slate-700 pt-4">
                        <Button type="button" onClick={() => vm.setIsModalImportOpen(false)} color="secondary" outline>
                            Cancelar
                        </Button>
                        <Button onClick={vm.handleImportFromCompany} color="primary" disabled={vm.loading || !vm.empresaIdToImport || !vm.rubroIdToImport}>
                            {vm.loading ? "Importando..." : "Importar productos"}
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default CatalogoGlobal;
