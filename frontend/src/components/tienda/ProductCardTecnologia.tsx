import { Icon } from '@iconify/react';
import { useState } from 'react';

interface ProductCardProps {
    producto: any;
    slug: string;
    diseno: any;
    onAddToCart: (producto: any) => void;
    onClick?: () => void;
}

export default function ProductCardTecnologia({ producto, slug, diseno, onAddToCart, onClick }: ProductCardProps) {
    const [imageLoaded, setImageLoaded] = useState(false);
    const isOutOfStock = Number(producto.stock) <= 0;
    const cp = diseno?.colorPrimario || '#e11d48';
    const price = Number(producto.precioUnitario || 0);
    const originalPrice = Number(producto.precioOriginal || producto.precioRegular || 0);
    const hasDiscount = Boolean(producto.enOferta) && originalPrice > price;
    const ratingCount = Number(producto.ratingCount || producto.totalReviews || producto.reviewsCount || 0);
    const rating = ratingCount > 0 ? Number(producto.ratingAvg || producto.ratingPromedio || 0) : 0;
    const fullStars = Math.floor(rating);
    const hasHalf = rating % 1 !== 0;

    return (
        <div 
            className="group relative flex flex-col h-full bg-white rounded-xl p-4 transition-shadow hover:shadow-xl hover:shadow-gray-200/50 cursor-pointer border border-transparent hover:border-gray-100"
            onClick={onClick}
        >
            {/* Tag */}
            {hasDiscount && (
                <div className="absolute top-4 left-4 z-10">
                    <span className="text-white text-[10px] font-bold px-2.5 py-1 rounded-sm uppercase tracking-wide" style={{ background: cp }}>
                        En oferta
                    </span>
                </div>
            )}

            {/* Image Container */}
            <div className="relative w-full aspect-square mb-4 bg-gray-50/50 rounded-lg overflow-hidden flex items-center justify-center p-4">
                {producto.imagenUrl ? (
                    <img
                        src={producto.imagenUrl}
                        alt={producto.descripcion}
                        onLoad={() => setImageLoaded(true)}
                        className={`max-w-full max-h-full object-contain mix-blend-multiply transition-transform duration-500 group-hover:scale-105 ${imageLoaded ? 'opacity-100' : 'opacity-0'} ${isOutOfStock ? 'grayscale opacity-70' : ''}`}
                        loading="lazy"
                    />
                ) : (
                    <Icon icon="solar:box-linear" className="text-gray-300 w-16 h-16" />
                )}
                
                {/* Action Hover Buttons (appear on hover) */}
                <div className="absolute bottom-4 right-4 flex opacity-0 group-hover:opacity-100 transition-opacity duration-300 gap-1.5 z-20">
                    <button className="w-8 h-8 rounded bg-white shadow-sm flex items-center justify-center text-gray-500 hover:text-white hover:bg-red-500 transition-colors border border-gray-100">
                        <Icon icon="solar:heart-linear" width={18} />
                    </button>
                    <button className="w-8 h-8 rounded bg-white shadow-sm flex items-center justify-center text-gray-500 hover:text-blue-500 transition-colors border border-gray-100">
                        <Icon icon="solar:eye-linear" width={18} />
                    </button>
                    <button className="w-8 h-8 rounded bg-white shadow-sm flex items-center justify-center text-gray-500 hover:text-green-500 transition-colors border border-gray-100">
                        <Icon icon="solar:refresh-linear" width={18} />
                    </button>
                </div>
            </div>

            {/* Info */}
            <div className="flex flex-col flex-1">
                <span className="text-[10px] font-bold text-red-500 mb-1 tracking-wider">
                    {producto.marca?.nombre || 'Motor y Rendimiento'}
                </span>
                
                <h3 className="text-gray-900 font-bold text-sm leading-tight mb-2 line-clamp-2 min-h-[2.5em] group-hover:text-red-600 transition-colors" title={producto.descripcion}>
                    {producto.descripcion}
                </h3>

                <div className="flex items-center gap-1.5 mb-3">
                    <div className="flex text-[#F5B01D] text-[10px]">
                        {Array.from({ length: 5 }).map((_, index) => {
                            const n = index + 1;
                            return (
                                <Icon
                                    key={n}
                                    icon={n <= fullStars ? 'solar:star-bold' : hasHalf && n === fullStars + 1 ? 'solar:star-half-bold' : 'solar:star-linear'}
                                    className={ratingCount > 0 && (n <= fullStars || (hasHalf && n === fullStars + 1)) ? 'text-[#F5B01D]' : 'text-gray-200'}
                                />
                            );
                        })}
                    </div>
                    <span className="text-[10px] text-gray-400 font-medium">
                        {ratingCount > 0 ? `${rating.toFixed(1)} (${ratingCount} reseñas)` : 'Sin reseñas'}
                    </span>
                </div>

                <div className="mt-auto flex items-baseline gap-2 mb-4">
                    {hasDiscount ? (
                        <>
                            <span className="text-sm text-gray-400 line-through font-medium">
                                S/ {originalPrice.toFixed(2)}
                            </span>
                            <span className="text-lg font-black" style={{ color: cp }}>
                                S/ {price.toFixed(2)}
                            </span>
                        </>
                    ) : (
                        <span className="text-lg font-black" style={{ color: cp }}>
                            S/ {price.toFixed(2)}
                        </span>
                    )}
                </div>

                <button 
                    disabled={isOutOfStock}
                    onClick={(e) => { e.stopPropagation(); if(!isOutOfStock) onAddToCart(producto); }}
                    className="w-28 py-1.5 text-xs font-bold text-gray-900 border border-gray-300 rounded hover:bg-gray-50 hover:border-gray-400 transition-colors bg-white z-10"
                >
                    Añadir al Carrito
                </button>
            </div>
        </div>
    );
}
