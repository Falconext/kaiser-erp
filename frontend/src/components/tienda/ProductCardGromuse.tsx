import { Icon } from '@iconify/react';
import { useState } from 'react';
import ProductCardActions from '@/components/tienda/ProductCardActions';

interface ProductCardProps {
    producto: any;
    slug: string;
    diseno: any;
    onAddToCart: (producto: any) => void;
    onClick?: () => void;
}

export default function ProductCardGromuse({ producto, slug, diseno, onAddToCart, onClick }: ProductCardProps) {
    const [imageLoaded, setImageLoaded] = useState(false);
    const isOutOfStock = Number(producto.stock) <= 0;

    // Parse price to separate integer and decimal for styling
    const priceStr = Number(producto.precioUnitario || 0).toFixed(2);
    const [intPart, decPart] = priceStr.split('.');

    const colorPrimario = diseno?.colorPrimario || '#1E1B4B';

    return (
        <div
            className="group relative flex flex-col h-full bg-white border border-gray-200 rounded-xl p-4 hover:shadow-xl transition-all duration-300 cursor-pointer"
            onClick={onClick}
        >
            {/* Image Container */}
            <div className="relative w-full aspect-[4/3] mb-4 overflow-hidden flex items-center justify-center">
                {/* Action buttons */}
                <div className="absolute top-0 right-0 z-10">
                    <ProductCardActions producto={producto} slug={slug} cp={colorPrimario} />
                </div>
                {producto.imagenUrl ? (
                    <>
                        <img
                            src={producto.imagenUrl}
                            alt={producto.descripcion}
                            onLoad={() => setImageLoaded(true)}
                            className={`max-w-full max-h-full object-contain transition-transform duration-500 group-hover:scale-105 ${imageLoaded ? 'opacity-100' : 'opacity-0'} ${isOutOfStock ? 'grayscale opacity-70' : ''}`}
                            loading="lazy"
                        />
                        {isOutOfStock && (
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                <span className="bg-red-500/90 text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider shadow-sm">
                                    Agotado
                                </span>
                            </div>
                        )}
                    </>
                ) : (
                    <div className="relative w-full h-full flex items-center justify-center">
                        <Icon icon="solar:box-linear" className="text-gray-300 w-16 h-16" />
                        {isOutOfStock && (
                            <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-red-500/90 text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider shadow-sm">
                                Agotado
                            </span>
                        )}
                    </div>
                )}
            </div>

            {/* Info - Left Aligned */}
            <div className="flex flex-col flex-1 gap-1">
                {/* Brand / Unit (Optional) */}
                <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                    {producto.marca?.nombre ? (
                        <>
                            <Icon icon="solar:tag-horizontal-linear" />
                            <span>{producto.marca.nombre}</span>
                        </>
                    ) : (
                        <span className="text-gray-400">
                            {typeof producto.unidadMedida === 'object'
                                ? (producto.unidadMedida.nombre || producto.unidadMedida.codigo || 'Unidad')
                                : (producto.unidadMedida || 'Unidad')}
                        </span>
                    )}
                </div>

                <h3 className="text-gray-800 font-bold text-base leading-snug line-clamp-2 min-h-[2.5em] group-hover:text-blue-600 transition-colors" title={producto.descripcion}>
                    {producto.descripcion}
                </h3>

                {/* Price */}
                <div className="mt-auto pt-2 flex items-baseline gap-2">
                    <span className="text-lg font-bold text-gray-900">
                        S/ {Number(producto.precioUnitario).toFixed(2)}
                    </span>
                    {producto.precioOriginal && Number(producto.precioOriginal) > Number(producto.precioUnitario) && (
                        <span className="text-sm text-gray-400 line-through">
                            S/ {Number(producto.precioOriginal).toFixed(2)}
                        </span>
                    )}
                </div>

                {/* Add Button */}
                <button
                    disabled={isOutOfStock}
                    onClick={(e) => { e.stopPropagation(); if (!isOutOfStock) onAddToCart(producto); }}
                    className={`mt-4 w-full py-2.5 rounded-full flex items-center justify-center gap-2 text-sm font-bold shadow-sm transition-all ${isOutOfStock ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'text-white hover:brightness-90 hover:shadow-md'}`}
                    style={isOutOfStock ? undefined : { backgroundColor: colorPrimario }}
                >
                    <Icon icon={isOutOfStock ? "solar:close-circle-bold" : "solar:cart-plus-bold"} width={18} />
                    {isOutOfStock ? 'Agotado' : 'Añadir al Carrito'}
                </button>
            </div>
        </div>
    );
}
