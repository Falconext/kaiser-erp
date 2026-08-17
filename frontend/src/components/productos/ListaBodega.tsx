import { Icon } from "@iconify/react";
import { IProduct } from "@/interfaces/products";

interface ListaBodegaProps {
    products: IProduct[];
    onEdit: (product: any) => void;
    onDelete: (product: any) => void;
    onToggleState: (product: any) => void;
}

const ListaBodega = ({ products, onEdit, onDelete, onToggleState }: ListaBodegaProps) => {
    return (
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 overflow-hidden">
            <div className="divide-y divide-gray-100 dark:divide-slate-700">
                {products.map((product) => {
                    const precio = Number(product.precioUnitario || 0);

                    return (
                        <div key={product.id} className="p-3 hover:bg-gray-50 dark:hover:bg-slate-700 flex items-center gap-4 transition-colors">
                            {/* Imagen pequeña */}
                            <div className="w-12 h-12 flex-shrink-0 bg-gray-100 dark:bg-slate-700 rounded-md overflow-hidden">
                                {(product as any).imagenUrl ? (
                                    <img
                                        src={(product as any).imagenUrl}
                                        alt={product.descripcion}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-gray-400 dark:text-gray-500">
                                        <Icon icon="mdi:image-off-outline" width={20} height={20} />
                                    </div>
                                )}
                            </div>

                            {/* Info principal */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <h4 className="font-medium text-gray-900 dark:text-white truncate">{product.descripcion}</h4>
                                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${product.estado === 'ACTIVO' ? 'bg-green-100 dark:bg-emerald-900/20 text-green-700 dark:text-emerald-400' : 'bg-red-100 dark:bg-rose-900/20 text-red-700 dark:text-rose-400'
                                        }`}>
                                        {product.estado}
                                    </span>
                                </div>
                                <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                                    <span>{product.categoria?.nombre}</span>
                                    <span>•</span>
                                    <span>Stock: {product.stock}</span>
                                </div>
                            </div>

                            {/* Precio */}
                            <div className="text-right">
                                <div className="font-bold text-gray-900 dark:text-white">S/ {precio.toFixed(2)}</div>
                                <div className="text-xs text-gray-500 dark:text-gray-400">{product.unidadMedida?.nombre}</div>
                            </div>

                            {/* Acciones rápidas */}
                            <div className="flex items-center gap-1 pl-2 border-l border-gray-100 dark:border-slate-700 ml-2">
                                <button
                                    onClick={() => onEdit(product)}
                                    className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
                                >
                                    <Icon icon="material-symbols:edit" width={18} height={18} />
                                </button>
                                <button
                                    onClick={() => onToggleState(product)}
                                    className={`p-1.5 hover:bg-gray-100 dark:hover:bg-slate-700 rounded ${product.estado === 'ACTIVO' ? 'text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-rose-400' : 'text-green-500 dark:text-emerald-400'}`}
                                >
                                    <Icon icon="mdi:power" width={18} height={18} />
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default ListaBodega;
