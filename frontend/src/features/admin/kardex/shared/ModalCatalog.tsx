
import { useEffect, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import Button from "@/components/Button";
import { useAuthStore } from "@/zustand/auth";
import apiClient from "@/utils/apiClient";
import { Icon } from "@iconify/react";
import useAlertStore from "@/zustand/alert";
import DataTable from "@/components/Datatable";
import InputPro from "@/components/InputPro";
import Pagination from "@/components/Pagination";
import ModalConfirm from "@/components/ModalConfirm";
import GeneradorProductos from "./GeneradorProductos";
import useEscapeKey from "@/hooks/useEscapeKey";

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export default function ModalCatalog({ isOpen, onClose, onSuccess }: Props) {
    const { auth } = useAuthStore();
    const [plantillas, setPlantillas] = useState<any[]>([]);
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [loading, setLoading] = useState(false);
    const [importing, setImporting] = useState(false);

    // Pagination & Search
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(50);
    const [total, setTotal] = useState(0);
    const [search, setSearch] = useState("");

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            if (isOpen) {
                setPage(1); // Reset page on search
                loadPlantillas();
            }
        }, 500);
        return () => clearTimeout(timer);
    }, [search, isOpen]); // Listen to search change

    // Listen to page change
    useEffect(() => {
        if (isOpen) {
            loadPlantillas();
        }
    }, [page, isOpen]);

    // Reset when modal opens
    useEffect(() => {
        if (isOpen) {
            setPage(1);
            setSearch("");
            setSelectedIds([]);
            loadPlantillas();
        }
    }, [isOpen]);

    const loadPlantillas = async () => {
        if (!auth?.empresa?.rubroId) return;
        try {
            setLoading(true);
            const { data } = await apiClient.get('/plantillas', {
                params: {
                    page,
                    limit,
                    search,
                    rubroId: auth.empresa.rubroId
                }
            });
            const body = data?.data || data; // Handle potential wrapper
            const list = Array.isArray(body?.data) ? body.data : (Array.isArray(body) ? body : []);
            setPlantillas(list);
            setTotal(body?.total || 0);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const toggleSelect = (id: number) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    const toggleSelectAll = () => {
        if (selectedIds.length === plantillas.length && plantillas.length > 0) {
            setSelectedIds([]);
        } else {
            setSelectedIds(plantillas.map(p => p.id));
        }
    };

    const [isConfirmOpen, setIsConfirmOpen] = useState(false);

    const handleImport = async () => {
        if (selectedIds.length === 0) return;
        try {
            setImporting(true);
            await apiClient.post('/plantillas/importar', { plantillasIds: selectedIds });
            useAlertStore.getState().alert(`${selectedIds.length} productos importados correctamente`, "success");
            onSuccess();
            onClose();
            setSelectedIds([]);
        } catch (error: any) {
            useAlertStore.getState().alert(error.response?.data?.message || "Error al importar", "error");
        } finally {
            setImporting(false);
        }
    };

    const handleImportAllClick = () => {
        setIsConfirmOpen(true);
    };

    const executeImportAll = async () => {
        try {
            setImporting(true);
            setIsConfirmOpen(false);
            const { data } = await apiClient.post('/plantillas/importar-todo');
            const resp = data?.data || data;
            const imported = resp.imported || 0;
            const updated = resp.updated || 0;
            const msg = `${resp.message}. Se agregaron ${imported} productos nuevos y se actualizaron ${updated}.`;
            useAlertStore.getState().alert(msg, "success");
            onSuccess();
            onClose();
        } catch (error: any) {
            useAlertStore.getState().alert(error.response?.data?.message || "Error al importar todo", "error");
        } finally {
            setImporting(false);
        }
    };

    if (!isOpen) return null;

    const [activeTab, setActiveTab] = useState<'catalogo' | 'generador'>('catalogo');

    const handleImportAI = async (products: any[]) => {
        try {
            setImporting(true);
            const { data } = await apiClient.post('/plantillas/importar-data', { productos: products });
            useAlertStore.getState().alert(`${data.imported} productos generados e importados correctamente`, "success");
            onSuccess();
            onClose();
        } catch (error: any) {
            useAlertStore.getState().alert(error.response?.data?.message || "Error al importar productos IA", "error");
        } finally {
            setImporting(false);
        }
    };

    if (!isOpen) return null;

    // Prepare DataTable props
    const headerColumns = ['#', 'Imagen', 'Nombre', 'Descripción', 'Precio', 'Categoría', 'U. Medida'];

    const bodyData = plantillas.map((p) => ({
        '#': (
            <div className="flex items-center justify-center">
                <input
                    type="checkbox"
                    checked={selectedIds.includes(p.id)}
                    onChange={() => toggleSelect(p.id)}
                    className="w-4 h-4 text-blue-600 rounded border-gray-300 dark:border-slate-700 dark:bg-slate-900 focus:ring-blue-500 cursor-pointer"
                />
            </div>
        ),
        'Imagen': (
            <div className="flex items-center justify-center h-10 w-10 bg-gray-100 dark:bg-slate-800 rounded overflow-hidden border border-gray-200 dark:border-slate-700">
                {p.imagenUrl ? (
                    <img
                        src={p.imagenUrl}
                        alt={p.nombre}
                        className="w-full h-full object-cover hover:scale-150 transition-transform cursor-zoom-in"
                        title="Clic para ampliar"
                        onClick={() => setPreviewImage(p.imagenUrl)}
                    />
                ) : (
                    <Icon icon="mdi:image-off-outline" className="text-gray-400" width={20} />
                )}
            </div>
        ),
        'Nombre': <span className="text-xs font-medium text-gray-900 dark:text-white">{p.nombre}</span>,
        'Descripción': <span className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1" title={p.descripcion}>{p.descripcion}</span>,
        'Precio': <span className="font-semibold text-gray-900 dark:text-white text-xs">S/ {Number(p.precioSugerido).toFixed(2)}</span>,
        'Categoría': <span className="text-xs px-2 py-1 bg-gray-100 dark:bg-slate-800 rounded-full text-gray-600 dark:text-gray-300">{p.categoria || 'Sin Categoría'}</span>,
        'U. Medida': <span className="text-xs text-gray-500 dark:text-gray-400">{p.unidadConteo || 'NIU'}</span>
    }));

    // Image Preview State
    const [previewImage, setPreviewImage] = useState<string | null>(null);

    const handleClose = useCallback(() => {
        if (isOpen) {
            onClose();
        }
    }, [isOpen, onClose]);

    useEscapeKey(() => handleClose(), isOpen);

    const modalContent = (
        <div className="fixed inset-0 z-[1000000] flex items-center justify-center bg-black bg-opacity-50 p-4">
            <div className="bg-white dark:bg-[#111827] rounded-none md:rounded-lg shadow-xl w-full h-full md:max-w-7xl md:h-[90vh] flex flex-col overflow-hidden relative">
                {/* Header with Tabs */}
                <div className="bg-gray-50 dark:bg-slate-800/50 border-b dark:border-slate-700">
                    <div className="flex justify-between items-center p-4 pb-0">
                        <div>
                            <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200">
                                Catálogo de Productos
                            </h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">Gestiona tu inventario de {auth?.empresa?.rubro?.nombre}</p>
                        </div>
                        <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 mb-3">
                            <Icon icon="mdi:close" width={28} />
                        </button>
                    </div>

                    {/* Tabs */}
                    <div className="flex px-4 gap-6">
                        <button
                            onClick={() => setActiveTab('catalogo')}
                            className={`pb-3 px-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'catalogo'
                                ? 'border-blue-600 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                                }`}
                        >
                            <Icon icon="solar:box-bold" className="inline mr-2" />
                            Catálogo Global
                        </button>
                        <button
                            onClick={() => setActiveTab('generador')}
                            className={`pb-3 px-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'generador'
                                ? 'border-purple-600 text-purple-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                                }`}
                        >
                            <Icon icon="solar:magic-stick-3-bold" className="inline mr-2" />
                            Generador con IA <span className="text-xs bg-purple-100 dark:bg-purple-900/20 text-purple-600 dark:text-purple-300 px-1.5 py-0.5 rounded ml-1">Beta</span>
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-hidden bg-gray-50 dark:bg-slate-900">
                    {activeTab === 'catalogo' ? (
                        <div className="flex flex-col h-full">
                            {/* Filters */}
                            <div className="p-4 border-b dark:border-slate-700 bg-white dark:bg-slate-800 flex flex-col md:flex-row gap-4 items-center justify-between">
                                <div className="w-full md:w-1/3 mb-3 md:mb-0">
                                    <InputPro
                                        name="search"
                                        label="Buscar producto"
                                        placeholder="Nombre, código o descripción..."
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                    />
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-sm text-gray-600 dark:text-gray-300 font-medium">
                                        {selectedIds.length} seleccionados
                                    </span>
                                    {selectedIds.length > 0 && (
                                        <button
                                            onClick={() => setSelectedIds([])}
                                            className="text-xs text-red-500 hover:text-red-700 underline"
                                        >
                                            Limpiar selección
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Table */}
                            <div className="flex-1 overflow-hidden p-4">
                                <div className="bg-white dark:bg-slate-800 rounded-lg border dark:border-slate-700 shadow-sm h-full overflow-hidden relative flex flex-col">
                                    {loading && (
                                        <div className="absolute inset-0 bg-white/80 dark:bg-slate-900/80 z-10 flex items-center justify-center">
                                            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
                                        </div>
                                    )}

                                    <div className="flex-1 overflow-auto">
                                        {plantillas.length > 0 ? (
                                            <DataTable
                                                headerColumns={headerColumns}
                                                bodyData={bodyData}
                                            />
                                        ) : (
                                            !loading && (
                                                <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400">
                                                    <Icon icon="mdi:package-variant-closed" width={48} className="mb-2 opacity-50" />
                                                    <p>No se encontraron productos en el catálogo</p>
                                                </div>
                                            )
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Pagination */}
                            {total > limit && (
                                <div className="p-2 bg-white dark:bg-slate-800 border-t dark:border-slate-700 flex justify-center">
                                    <Pagination
                                        pages={Array.from({ length: Math.ceil(total / limit) }, (_, i) => i + 1)}
                                        currentPage={page}
                                        setcurrentPage={setPage}
                                        indexOfFirstItem={(page - 1) * limit}
                                        indexOfLastItem={Math.min(page * limit, total)}
                                        total={total}
                                    />
                                </div>
                            )}

                            {/* Footer Actions */}
                            <div className="p-4 border-t dark:border-slate-700 flex flex-col md:flex-row justify-between gap-3 bg-white dark:bg-slate-800">
                                <div>
                                    <Button
                                        onClick={handleImportAllClick}
                                        color="secondary"
                                        disabled={importing || plantillas.length === 0}
                                        className="bg-indigo-900 text-[#fff] border-indigo-200"
                                    >
                                        {importing ? '...' : (
                                            <>
                                                <Icon icon="mdi:database-arrow-down-outline" className="mr-2" />
                                                Importar TODO el catálogo
                                            </>
                                        )}
                                    </Button>
                                </div>
                                <div className="flex gap-2">
                                    <Button onClick={onClose} color="secondary" outline>
                                        Cancelar
                                    </Button>
                                    <Button
                                        onClick={handleImport}
                                        color="primary"
                                        disabled={selectedIds.length === 0 || importing}
                                    >
                                        {importing ? (
                                            <><span className="animate-spin mr-2">⏳</span> Importando...</>
                                        ) : (
                                            <>
                                                <Icon icon="mdi:import" className="mr-2" />
                                                Importar ({selectedIds.length})
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <GeneradorProductos
                            onImport={handleImportAI}
                            onCancel={() => setActiveTab('catalogo')}
                        />
                    )}
                </div>
            </div>

            <ModalConfirm
                isOpenModal={isConfirmOpen}
                setIsOpenModal={setIsConfirmOpen}
                confirmSubmit={executeImportAll}
                title="¿Importar TODO el catálogo?"
                information="Esta acción importará todos los productos disponibles para tu rubro."
            >
                <ul className="list-disc pl-5 mt-2 space-y-1 text-sm text-gray-600 dark:text-gray-300">
                    <li>Se omitirán los productos ya registrados (por código).</li>
                    <li>Se actualizarán imágenes faltantes.</li>
                    <li>Solo se agregarán nuevos productos.</li>
                </ul>
            </ModalConfirm>

            {/* Image Preview Modal */}
            {previewImage && (
                <div
                    className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90   p-4 animate-in fade-in duration-200"
                    onClick={() => setPreviewImage(null)}
                >
                    <div className="relative max-w-4xl max-h-[90vh] bg-transparent rounded-2xl overflow-hidden shadow-2xl">
                        <button
                            onClick={() => setPreviewImage(null)}
                            className="absolute top-4 right-4 text-white hover:text-gray-300 bg-black/50 hover:bg-black/70 rounded-full p-2 transition-colors z-20 backdrop-blur-md"
                        >
                            <Icon icon="solar:close-circle-bold" width={32} />
                        </button>
                        <img
                            src={previewImage}
                            alt="Vista previa"
                            className="w-full h-full object-contain max-h-[85vh] rounded-lg"
                            onClick={(e) => e.stopPropagation()} // Prevent closing when clicking image
                        />
                    </div>
                </div>
            )}
        </div>
    );

    return createPortal(modalContent, document.body);
}
