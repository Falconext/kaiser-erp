
import { useState } from 'react';
import { useAuthStore } from '@/zustand/auth';
import apiClient from '@/utils/apiClient';
// import Button from '@/components/Button';
// import InputPro from '@/components/InputPro';
import { Icon } from '@iconify/react';
import useAlertStore from '@/zustand/alert';
import DataTable from '@/components/Datatable';

interface GeneradorProductosProps {
    onImport: (selectedProducts: any[]) => void;
    onCancel: () => void;
}

export default function GeneradorProductos({ onImport, onCancel }: GeneradorProductosProps) {
    const { auth } = useAuthStore();
    const [query, setQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const [generatedProducts, setGeneratedProducts] = useState<any[]>([]);
    const [selectedIndexes, setSelectedIndexes] = useState<number[]>([]);

    const handleGenerate = async () => {
        if (!query.trim() || !auth?.empresa?.rubroId) return;

        setLoading(true);
        setGeneratedProducts([]);
        setSelectedIndexes([]);

        try {
            const { data } = await apiClient.post('/plantillas/generar-ia', {
                query,
                rubroId: auth.empresa.rubroId
            });

            // Map data to handle potential wrapper { code, message, data: [...] }
            // If the backend returns the array directly, utilize it.
            const responseBody = data;
            const products = Array.isArray(responseBody)
                ? responseBody
                : (Array.isArray(responseBody?.data) ? responseBody.data : []);

            setGeneratedProducts(products);

            // Do not auto-select all
            setSelectedIndexes([]);

        } catch (error: any) {
            console.error(error);
            useAlertStore.getState().alert(
                error.response?.data?.message || 'Error generando productos con IA',
                'error'
            );
        } finally {
            setLoading(false);
        }
    };

    const toggleSelect = (index: number) => {
        setSelectedIndexes(prev =>
            prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
        );
    };

    const handleImportClick = () => {
        const selected = generatedProducts.filter((_, i) => selectedIndexes.includes(i));
        onImport(selected);
    };

    // Table Config
    const headerColumns = ['#', 'Imagen', 'Nombre', 'Descripción', 'Precio Sug.', 'Categoría', 'U. Medida'];
    const bodyData = generatedProducts.map((p, index) => ({
        '#': (
            <div className="flex items-center justify-center">
                <input
                    type="checkbox"
                    checked={selectedIndexes.includes(index)}
                    onChange={() => toggleSelect(index)}
                    className="w-4 h-4 text-purple-600 rounded border-gray-300 dark:border-slate-700 focus:ring-purple-500 cursor-pointer"
                />
            </div>
        ),
        'Imagen': (
            <div className="flex items-center justify-center h-12 w-12 bg-gray-100 dark:bg-slate-800 rounded overflow-hidden border border-gray-200 dark:border-slate-700">
                {p.imagenUrl ? (
                    <img
                        src={p.imagenUrl}
                        alt={p.nombre}
                        className="w-full h-full object-cover hover:scale-150 transition-transform cursor-zoom-in"
                        title={p.nombre}
                    />
                ) : (
                    <Icon icon="mdi:image-off-outline" className="text-gray-400" width={24} />
                )}
            </div>
        ),
        'Nombre': p.nombre,
        'Descripción': p.descripcion,
        'Precio Sug.': `S/ ${Number(p.precioSugerido).toFixed(2)}`,
        'Categoría': p.categoria || '-',
        'U. Medida': p.unidadConteo || 'NIU'
    }));

    return (
        <div className="flex flex-col h-full bg-gray-50/50 dark:bg-[#0A0D14]">
            {/* Search Bar & Header - COMPACT VERSION */}
            <div className="px-6 py-5 bg-white dark:bg-[#111827] border-b border-gray-100 dark:border-slate-800 shadow-sm dark:shadow-none z-10 shrink-0">
                <div className="flex items-center gap-6  mx-auto">
                    {/* Left: Input & Title */}
                    <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="inline-flex items-center justify-center p-1.5 bg-fuchsia-100 dark:bg-fuchsia-900/20 rounded-lg text-fuchsia-600 dark:text-fuchsia-400">
                                <Icon icon="solar:magic-stick-3-bold-duotone" className="text-lg" />
                            </div>
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                                Generador de Productos con IA
                            </h2>
                        </div>

                        <div className="relative group max-w-2xl">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Icon icon="solar:magnifer-linear" className="text-gray-400 text-lg group-focus-within:text-fuchsia-500 transition-colors" />
                            </div>
                            <input
                                name="query"
                                placeholder="Ej: Bodega pequeña, Ferretería industrial..."
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
                                className="w-full pl-10 pr-4 h-[42px] bg-gray-50 dark:bg-slate-900 border-0 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-fuchsia-100 dark:focus:ring-fuchsia-900/30 focus:bg-white dark:focus:bg-slate-900 transition-all placeholder:text-gray-400 outline-none text-sm font-medium"
                                autoComplete="off"
                            />
                            <button
                                onClick={handleGenerate}
                                disabled={loading || !query.trim()}
                                className="absolute right-1 top-1 h-[34px] px-4 bg-gray-900 hover:bg-black text-white rounded-lg text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                {loading ? (
                                    <Icon icon="svg-spinners:180-ring-with-bg" />
                                ) : (
                                    <>Generar <Icon icon="solar:stars-minimalistic-bold-duotone" /></>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Right: Compact Disclaimer */}
                    <div className="shrink-0 max-w-[640px] relative">
                        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-900/30 rounded-xl p-3 flex gap-3 h-full items-center">
                            <Icon icon="solar:info-circle-bold-duotone" className="text-2xl text-amber-500 shrink-0" />
                            <div>
                                <h4 className="font-bold text-amber-800 dark:text-amber-300 text-md mb-0.5">Uso Inteligente</h4>
                                <p className="text-[13px] text-amber-700/90 dark:text-amber-300/90 leading-tight">
                                    Estimado usuario estas consultas son limitadas, los precios que vera son referenciales y tal vez no van acorde al mercado esta es una ayuda para poder generar un catálogo de productos.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Results Area */}
            <div className="flex-1 p-6 overflow-hidden flex flex-col max-w-7xl mx-auto w-full">
                <div className="bg-white dark:bg-[#111827] rounded-3xl shadow-xl shadow-gray-100/50 dark:shadow-none border border-gray-100 dark:border-slate-800 flex-1 overflow-hidden relative flex flex-col">
                    {loading && (
                        <div className="absolute inset-0 bg-white/80 dark:bg-[#111827]/80   z-20 flex flex-col items-center justify-center">
                            <div className="relative">
                                <div className="w-20 h-20 border-4 border-fuchsia-100 border-t-fuchsia-600 rounded-full animate-spin"></div>
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <Icon icon="solar:magic-stick-3-bold-duotone" className="text-2xl text-fuchsia-600 animate-pulse" />
                                </div>
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white mt-6 mb-2">Creando catálogo...</h3>
                            <p className="text-gray-500 dark:text-gray-400 font-medium">Esto puede tomar unos segundos</p>
                        </div>
                    )}

                    <div className="h-full overflow-auto custom-scrollbar">
                        {generatedProducts.length > 0 ? (
                            <DataTable
                                headerColumns={headerColumns}
                                bodyData={bodyData}
                            />
                        ) : (
                            !loading && (
                                <div className="flex flex-col items-center justify-center h-full text-center p-8">
                                    <div className="w-24 h-24 bg-gray-50 dark:bg-slate-800 rounded-full flex items-center justify-center mb-6">
                                        <Icon icon="solar:box-minimalistic-bold-duotone" className="text-4xl text-gray-300" />
                                    </div>
                                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Tu catálogo aparecerá aquí</h3>
                                    <p className="text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
                                        Ingresa una descripción arriba y deja que la IA haga el trabajo pesado por ti.
                                    </p>
                                </div>
                            )
                        )}
                    </div>
                </div>
            </div>

            {/* Footer Actions */}
            <div className="px-8 py-5 bg-white dark:bg-[#111827] border-t border-gray-100 dark:border-slate-800 flex justify-between items-center z-10">
                <div className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    <span className="text-gray-900 dark:text-white font-bold">{selectedIndexes.length}</span> productos seleccionados
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={onCancel}
                        className="px-6 py-2.5 text-gray-600 dark:text-gray-300 font-semibold hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-slate-800 rounded-xl transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleImportClick}
                        disabled={selectedIndexes.length === 0}
                        className="px-8 py-2.5 bg-fuchsia-600 hover:bg-fuchsia-700 text-white rounded-xl font-semibold shadow-lg shadow-fuchsia-200 hover:shadow-fuchsia-300 dark:shadow-none dark:hover:shadow-none transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 active:scale-95"
                    >
                        <Icon icon="solar:file-download-bold-duotone" className="text-xl" />
                        Importar Selección
                    </button>
                </div>
            </div>
        </div>
    );
}
