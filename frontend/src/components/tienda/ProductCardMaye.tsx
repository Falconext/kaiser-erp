import { Icon } from '@iconify/react';
import { useState, type MouseEvent } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { useCompareStore } from '@/zustand/compare';
import { useFavoritosStore } from '@/zustand/favoritos';
import { mayeCard, mayeHover, mayeTap } from '@/lib/motion/maye';

interface ProductCardProps {
    producto: any;
    slug: string;
    diseno: any;
    onAddToCart: (producto: any) => void;
    onClick?: () => void;
}

const parseOfferDate = (value: string | Date | null | undefined, endOfDay = false) => {
    if (!value) return null;
    if (value instanceof Date) return value;
    const raw = String(value);
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
        const [year, month, day] = raw.split('-').map(Number);
        return new Date(year, month - 1, day, endOfDay ? 23 : 0, endOfDay ? 59 : 0, endOfDay ? 59 : 0, endOfDay ? 999 : 0);
    }
    const date = new Date(raw);
    return Number.isNaN(date.getTime()) ? null : date;
};

export default function ProductCardMaye({ producto, slug, diseno, onAddToCart, onClick }: ProductCardProps) {
    const [imageLoaded, setImageLoaded] = useState(false);
    const [isHovered, setIsHovered] = useState(false);
    const [hoveredAction, setHoveredAction] = useState<string | null>(null);
    const [isAddHovered, setIsAddHovered] = useState(false);
    const [zoomOpen, setZoomOpen] = useState(false);
    const isOutOfStock = Number(producto.stock) <= 0;
    const { toggleFavorito, isFavorito } = useFavoritosStore();
    const { toggle: toggleCompare, isInCompare } = useCompareStore();
    
    const cp = diseno?.colorPrimario || '#e11d48';
    const accentSoft = `${cp}14`;
    const productId = Number(producto.id);
    const wished = isFavorito(productId, slug);
    const inCompare = isInCompare(productId, slug);
    const catName = typeof producto.categoria === 'object' ? producto.categoria?.nombre : producto.categoria;
    const marcaName = typeof producto.marca === 'object' ? producto.marca?.nombre : producto.marca;
    const now = new Date();
    const offerStart = parseOfferDate(producto.fechaInicioOferta);
    const offerEnd = parseOfferDate(producto.fechaFinOferta, true);
    const regularPrice = Number(producto.precioRegular ?? producto.precioOriginal ?? producto.precioUnitario ?? producto.precioVenta ?? producto.precio ?? 0);
    const offerPrice = Number(producto.precioOferta || 0);
    const hasActiveOffer =
        offerPrice > 0 &&
        regularPrice > 0 &&
        offerPrice < regularPrice &&
        (!offerStart || offerStart <= now) &&
        (!offerEnd || offerEnd >= now);
    const displayPrice = hasActiveOffer ? offerPrice : Number(producto.precioUnitario ?? producto.precioVenta ?? producto.precio ?? regularPrice ?? 0);
    const discountPercent = hasActiveOffer ? Math.round((1 - offerPrice / regularPrice) * 100) : 0;
    const ratingCount = Number(producto.ratingCount ?? producto.reviewsCount ?? producto.resenasCount ?? producto.reviewCount ?? 0);
    const ratingAvg = ratingCount > 0 ? Number(producto.ratingAvg || 0) : 0;
    const roundedRating = Math.round(ratingAvg);
    const pricedProduct = {
        ...producto,
        precioOriginal: hasActiveOffer ? regularPrice : producto.precioOriginal,
        precioUnitario: displayPrice,
    };

    const handleWishlist = (e: MouseEvent) => {
        e.stopPropagation();
        toggleFavorito({
            id: productId,
            descripcion: producto.descripcion,
            precioUnitario: displayPrice,
            imagenUrl: producto.imagenUrl,
            slug,
        });
    };

    const handleZoom = (e: MouseEvent) => {
        e.stopPropagation();
        if (producto.imagenUrl) setZoomOpen(true);
    };

    const handleCompare = (e: MouseEvent) => {
        e.stopPropagation();
        toggleCompare({
            id: productId,
            descripcion: producto.descripcion,
            precioUnitario: displayPrice,
            imagenUrl: producto.imagenUrl,
            categoria: catName || undefined,
            marca: marcaName || undefined,
            stock: producto.stock,
            ratingAvg: producto.ratingAvg,
            slug,
        });
    };

    return (
        <>
        <motion.article
            variants={mayeCard}
            whileHover={mayeHover}
            whileTap={mayeTap}
            layout
            className="group relative flex flex-col h-full bg-white rounded-xl p-4 transition-all hover:shadow-xl hover:shadow-gray-200/50 cursor-pointer border"
            style={{ borderColor: isHovered ? cp : 'transparent' }}
            onClick={onClick}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => {
                setIsHovered(false);
                setHoveredAction(null);
                setIsAddHovered(false);
            }}
        >
            {hasActiveOffer && (
                <div className="absolute top-4 left-4 z-10">
                    <span className="text-white text-[10px] font-bold px-2.5 py-1 rounded-sm uppercase tracking-wide" style={{ backgroundColor: cp }}>
                        En Oferta
                    </span>
                </div>
            )}

            {/* Image Container */}
            <div className="relative w-full aspect-square mb-4 bg-gray-50/50 rounded-lg overflow-hidden flex items-center justify-center p-4">
                {producto.imagenUrl ? (
                    <motion.img
                        src={producto.imagenUrl}
                        alt={producto.descripcion}
                        onLoad={() => setImageLoaded(true)}
                        className={`max-w-full max-h-full object-contain mix-blend-multiply transition-transform duration-500 group-hover:scale-105 ${imageLoaded ? 'opacity-100' : 'opacity-0'} ${isOutOfStock ? 'grayscale opacity-70' : ''}`}
                        loading="lazy"
                        initial={{ opacity: 0, scale: 0.94 }}
                        animate={{ opacity: imageLoaded ? 1 : 0, scale: imageLoaded ? 1 : 0.94 }}
                        transition={{ duration: 0.28, ease: [0.25, 0.46, 0.45, 0.94] }}
                    />
                ) : (
                    <Icon icon="solar:box-linear" className="text-gray-300 w-16 h-16" />
                )}
                
                {/* Action Hover Buttons (appear on hover) */}
                <div className="absolute bottom-4 right-4 flex opacity-0 group-hover:opacity-100 transition-opacity duration-300 gap-1.5 z-20">
                    <motion.button
                        type="button"
                        title={wished ? 'Quitar de favoritos' : 'Agregar a favoritos'}
                        onClick={handleWishlist}
                        whileHover={{ y: -2, scale: 1.08 }}
                        whileTap={{ scale: 0.94 }}
                        onMouseEnter={() => setHoveredAction('heart')}
                        onMouseLeave={() => setHoveredAction(null)}
                        className="w-8 h-8 rounded bg-white shadow-sm flex items-center justify-center transition-colors border border-gray-100"
                        style={wished || hoveredAction === 'heart' ? { backgroundColor: cp, color: '#fff', borderColor: cp } : { color: '#6b7280' }}
                    >
                        <Icon icon={wished ? 'solar:heart-bold' : 'solar:heart-linear'} width={18} />
                    </motion.button>
                    <motion.button
                        type="button"
                        title="Ver imagen"
                        onClick={handleZoom}
                        whileHover={{ y: -2, scale: 1.08 }}
                        whileTap={{ scale: 0.94 }}
                        onMouseEnter={() => setHoveredAction('eye')}
                        onMouseLeave={() => setHoveredAction(null)}
                        className="w-8 h-8 rounded bg-white shadow-sm flex items-center justify-center transition-colors border border-gray-100"
                        style={hoveredAction === 'eye' ? { backgroundColor: accentSoft, color: cp, borderColor: cp } : { color: '#6b7280' }}
                    >
                        <Icon icon="solar:eye-linear" width={18} />
                    </motion.button>
                    <motion.button
                        type="button"
                        title={inCompare ? 'Quitar de comparación' : 'Comparar'}
                        onClick={handleCompare}
                        whileHover={{ y: -2, scale: 1.08 }}
                        whileTap={{ scale: 0.94 }}
                        onMouseEnter={() => setHoveredAction('compare')}
                        onMouseLeave={() => setHoveredAction(null)}
                        className="w-8 h-8 rounded bg-white shadow-sm flex items-center justify-center transition-colors border border-gray-100"
                        style={inCompare || hoveredAction === 'compare' ? { backgroundColor: accentSoft, color: cp, borderColor: cp } : { color: '#6b7280' }}
                    >
                        <Icon icon="solar:refresh-linear" width={18} />
                    </motion.button>
                </div>
            </div>

            {/* Info */}
            <div className="flex flex-col flex-1">
                <span className="text-[10px] font-bold mb-1 tracking-wider" style={{ color: cp }}>
                    {producto.marca?.nombre || 'Laptops y PCs'}
                </span>
                
                <h3 className="font-bold text-sm leading-tight mb-2 line-clamp-2 min-h-[2.5em] transition-colors" style={{ color: isHovered ? cp : '#111827' }} title={producto.descripcion}>
                    {producto.descripcion}
                </h3>

                <div className="flex items-center gap-1.5 mb-3">
                    {ratingCount > 0 && (
                        <div className="flex text-[#F5B01D] text-[10px]">
                            {Array.from({ length: 5 }).map((_, index) => (
                                <Icon key={index} icon={index < roundedRating ? 'solar:star-bold' : 'solar:star-linear'} />
                            ))}
                        </div>
                    )}
                    <span className="text-[10px] text-gray-400 font-medium">
                        {ratingCount > 0 ? `${ratingAvg.toFixed(1)} (${ratingCount} reseñas)` : 'Sin reseñas'}
                    </span>
                </div>

                <div className="mt-auto flex items-baseline gap-2 mb-4">
                    {hasActiveOffer ? (
                        <>
                            <span className="text-sm text-gray-400 line-through font-medium">
                                S/ {regularPrice.toFixed(2)}
                            </span>
                            <span className="text-lg font-black" style={{ color: cp }}>
                                S/ {displayPrice.toFixed(2)}
                            </span>
                            {discountPercent > 0 && (
                                <span className="text-[10px] font-black text-white rounded px-1.5 py-0.5" style={{ backgroundColor: cp }}>
                                    -{discountPercent}%
                                </span>
                            )}
                        </>
                    ) : (
                        <span className="text-lg font-black" style={{ color: cp }}>
                            S/ {displayPrice.toFixed(2)}
                        </span>
                    )}
                </div>

                <motion.button
                    disabled={isOutOfStock}
                    onClick={(e) => { e.stopPropagation(); if(!isOutOfStock) onAddToCart(pricedProduct); }}
                    onMouseEnter={() => setIsAddHovered(true)}
                    onMouseLeave={() => setIsAddHovered(false)}
                    whileHover={isOutOfStock ? undefined : { y: -1, scale: 1.03 }}
                    whileTap={isOutOfStock ? undefined : { scale: 0.97 }}
                    className="w-28 py-1.5 text-xs font-bold border rounded transition-colors z-10"
                    style={isAddHovered && !isOutOfStock ? { backgroundColor: cp, borderColor: cp, color: '#fff' } : { backgroundColor: '#fff', borderColor: '#d1d5db', color: '#111827' }}
                >
                    Añadir al Carrito
                </motion.button>
            </div>
        </motion.article>
        {zoomOpen && producto.imagenUrl && createPortal(
            <div
                className="fixed inset-0 bg-black/90 flex items-center justify-center"
                style={{ zIndex: 99999 }}
                onClick={() => setZoomOpen(false)}
            >
                <button
                    type="button"
                    className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-lg hover:bg-gray-100 transition-colors"
                    style={{ zIndex: 100000 }}
                    onClick={(e) => { e.stopPropagation(); setZoomOpen(false); }}
                    aria-label="Cerrar imagen"
                >
                    <Icon icon="solar:close-circle-bold" width={22} />
                </button>
                <img
                    src={producto.imagenUrl}
                    alt={producto.descripcion}
                    className="max-w-[90vw] max-h-[90vh] object-contain rounded-2xl"
                    onClick={(e) => e.stopPropagation()}
                />
            </div>,
            document.body
        )}
        </>
    );
}
