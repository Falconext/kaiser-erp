import { Icon } from "@iconify/react";
import { IProduct } from "@/interfaces/products";
import { useState } from "react";

interface CardRestauranteProps {
    products: IProduct[];
    onEdit: (product: any) => void;
    onDelete: (product: any) => void;
    onToggleState: (product: any) => void;
    onUploadImage: (product: any) => void;
    loading?: boolean;
    skeletonCount?: number;
}

const CardRestaurante = ({ products, onEdit, onDelete, onToggleState, onUploadImage, loading, skeletonCount = 8 }: CardRestauranteProps) => {
    const [loaded, setLoaded] = useState<Record<number, boolean>>({});

    if (loading) {
        return (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 p-4">
                {Array.from({ length: skeletonCount }).map((_, i) => (
                    <div key={i} className="bg-white dark:bg-slate-800 rounded-xl shadow-sm overflow-hidden border border-gray-100 dark:border-transparent">
                        <div className="h-48 bg-gray-200 dark:bg-slate-700 animate-pulse" />
                        <div className="p-4 space-y-3">
                            <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-3/4 animate-pulse" />
                            <div className="h-3 bg-gray-200 dark:bg-slate-700 rounded w-1/2 animate-pulse" />
                            <div className="mt-4 grid grid-cols-2 gap-3">
                                <div className="h-3 bg-gray-200 dark:bg-slate-700 rounded animate-pulse" />
                                <div className="h-3 bg-gray-200 dark:bg-slate-700 rounded animate-pulse" />
                            </div>
                            <div className="mt-4 h-9 bg-gray-200 dark:bg-slate-700 rounded-lg animate-pulse" />
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 p-4">
            {products.map((product) => {
                const costo = Number(product.costoUnitario > 0 ? product.costoUnitario : product.costoPromedio || 0);
                const precio = Number(product.precioUnitario || 0);
                const margen = precio > 0 && costo > 0 ? ((precio - costo) / precio * 100) : 0;
                const ganancia = precio - costo;

                return (
                    <div key={product.id} className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow duration-300 overflow-hidden border border-gray-100 flex flex-col">
                        {/* Imagen */}
                        <div className="relative h-[50px] w-[50px] bg-gray-100 group">
                            {(product as any).imagenUrl ? (
                                <>
                                    {!loaded[product.id] && <div className="absolute inset-0 bg-gray-200 animate-pulse" />}
                                    <img
                                        src={(product as any).imagenUrl}
                                        alt={product.descripcion}
                                        loading="lazy"
                                        decoding="async"
                                        onLoad={() => setLoaded((prev) => ({ ...prev, [product.id]: true }))}
                                        className={`w-[50px] h-[50px] object-contain transition-opacity duration-500 ${loaded[product.id] ? 'opacity-100' : 'opacity-0'}`}
                                    />
                                </>
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-400">
                                    <Icon icon="mdi:image-off-outline" width={48} height={48} />
                                </div>
                            )}

                            {/* Overlay con acciones rápidas */}
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                                <button
                                    onClick={() => onUploadImage(product)}
                                    className="p-2 bg-white rounded-full hover:bg-gray-100 text-gray-700"
                                    title="Subir imagen"
                                >
                                    <Icon icon="mdi:image-edit" width={20} height={20} />
                                </button>
                                <button
                                    onClick={() => onEdit(product)}
                                    className="p-2 bg-white rounded-full hover:bg-gray-100 text-blue-600"
                                    title="Editar"
                                >
                                    <Icon icon="material-symbols:edit" width={20} height={20} />
                                </button>
                            </div>

                            {/* Badge de estado */}
                            <div className={`absolute top-2 right-2 px-2 py-1 rounded-full text-xs font-medium ${product.estado === 'ACTIVO' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                }`}>
                                {product.estado}
                            </div>
                        </div>

                        {/* Contenido */}
                        <div className="p-4 flex-1 flex flex-col">
                            <div className="flex justify-between items-start mb-2">
                                <div>
                                    <h3 className="font-semibold text-gray-800 line-clamp-2" title={product.descripcion}>
                                        {product.descripcion}
                                    </h3>
                                    <p className="text-xs text-gray-500 mt-1">{product.categoria?.nombre || 'Sin categoría'}</p>
                                </div>
                            </div>

                            <div className="mt-auto pt-4 border-t border-gray-50 space-y-2">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-gray-500">Precio:</span>
                                    <span className="font-bold text-lg text-indigo-600">S/ {precio.toFixed(2)}</span>
                                </div>

                                <div className="grid grid-cols-2 gap-2 text-xs text-gray-500">
                                    <div className="flex justify-between">
                                        <span>Stock:</span>
                                        <span className={`font-medium ${product.stock <= (product.stockMinimo || 0) ? 'text-red-500' : 'text-gray-700'}`}>
                                            {product.stock} {product.unidadMedida?.nombre}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Margen:</span>
                                        <span className="text-green-600">{margen.toFixed(0)}%</span>
                                    </div>
                                </div>
                            </div>

                            {/* Acciones footer */}
                            <div className="mt-4 flex justify-end gap-2 pt-2 border-t border-gray-50">
                                <button
                                    onClick={() => onToggleState(product)}
                                    className={`p-1.5 rounded hover:bg-gray-100 ${product.estado === 'ACTIVO' ? 'text-red-500' : 'text-green-500'}`}
                                    title={product.estado === 'ACTIVO' ? 'Desactivar' : 'Activar'}
                                >
                                    <Icon icon="mdi:power" width={20} height={20} />
                                </button>
                                <button
                                    onClick={() => onDelete(product)}
                                    className="p-1.5 rounded hover:bg-red-50 text-red-500"
                                    title="Eliminar"
                                >
                                    <Icon icon="mdi:trash-outline" width={20} height={20} />
                                </button>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default CardRestaurante;
