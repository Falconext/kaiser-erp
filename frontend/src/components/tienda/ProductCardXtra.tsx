import { Icon } from '@iconify/react';
import ProductCardActions from '@/components/tienda/ProductCardActions';
import { motion } from 'framer-motion';

interface Props {
  producto: {
    id: number;
    descripcion: string;
    precioUnitario: number;
    precioOriginal?: number;
    precioRegular?: number;
    enOferta?: boolean;
    imagenUrl: string;
    stock: number;
    ratingAvg?: number;
    ratingCount?: number;
    atributosTecnicos?: Record<string, any>;
    categoria: { nombre: string } | null;
    marca: { nombre: string } | null;
  };
  slug: string;
  diseno: { colorPrimario: string; colorAccento?: string };
  onAddToCart: (producto?: any) => void;
  onClick?: () => void;
}

export default function ProductCardXtra({ producto, slug, diseno, onClick, onAddToCart }: Props) {
  const cp = diseno?.colorPrimario ?? '#2563EB';
  const price = Number(producto.precioUnitario || 0);
  const originalPrice = Number(producto.precioOriginal || producto.precioRegular || 0);
  const hasDiscount = Boolean(producto.enOferta) && !!(originalPrice && originalPrice > price);
  const discountPct = hasDiscount
    ? Math.round((1 - price / originalPrice) * 100)
    : 0;

  const ratingCount = Number(producto.ratingCount || 0);
  const esServicio = String(producto.atributosTecnicos?.tipoProducto || '').toUpperCase() === 'SERVICIO';
  const rating = ratingCount > 0 ? Number(producto.ratingAvg || 0) : 0;
  const fullStars = Math.floor(rating);
  const hasHalf = rating % 1 !== 0;
  const isOutOfStock = Number(producto.stock) <= 0;

  return (
    <>
      <div
        className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden cursor-pointer hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 group"
        onClick={onClick}
      >
        {/* ── Image area ── */}
        <div className="relative bg-white" style={{ minHeight: 220 }}>

          {/* Badge de oferta — arriba izquierda */}
          {hasDiscount && (
            <div className="absolute top-3 left-3 z-10">
              <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-rose-500 to-red-500 px-2.5 py-1 text-[11px] font-black text-white shadow-md shadow-red-500/25">
                <Icon icon="solar:tag-price-bold" width={12} />
                -{discountPct}%
              </span>
            </div>
          )}

          {/* Action icons — top right */}
          <div className="absolute top-3 right-3 z-10">
            <ProductCardActions producto={producto} slug={slug} cp={cp} />
          </div>

          {/* Product image */}
          <img
            src={producto.imagenUrl}
            alt={producto.descripcion}
            className={`w-full h-52 object-contain p-5 group-hover:scale-105 transition-transform duration-300 ${isOutOfStock ? 'grayscale opacity-70' : ''}`}
          />
          {isOutOfStock && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <span className="bg-red-500/90 text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider shadow-sm">
                Agotado
              </span>
            </div>
          )}

          {/* Banner de oferta en español */}
          {hasDiscount && (
            <div className="absolute bottom-2 left-2 right-2 z-10">
              <div className="flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-rose-500 to-red-500 px-3 py-1.5 text-[11px] font-black uppercase tracking-wide text-white shadow-lg shadow-red-500/25">
                <Icon icon="solar:fire-bold" width={13} />
                ¡Oferta! Ahorra {discountPct}%
              </div>
            </div>
          )}
        </div>

        {/* ── Info area ── */}
        <div className="px-4 pt-3.5 pb-4">
          <p className="font-bold text-gray-900 text-sm leading-snug line-clamp-1 mb-0.5">
            {producto.descripcion}
          </p>
          <div className="mb-2.5 flex items-center gap-2">
            <p className="text-xs text-gray-400">{producto.categoria?.nombre ?? ''}</p>
            {esServicio && (
              <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-violet-600">
                Servicio
              </span>
            )}
          </div>

          {/* Stars */}
          <div className="flex items-center gap-0.5 mb-2.5">
            {Array.from({ length: 5 }, (_, i) => {
              const n = i + 1;
              return (
                <Icon
                  key={n}
                  icon={n <= fullStars ? 'solar:star-bold' : hasHalf && n === fullStars + 1 ? 'solar:star-half-bold' : 'solar:star-linear'}
                  className={`text-sm ${n <= fullStars || (hasHalf && n === fullStars + 1) ? 'text-amber-400' : 'text-gray-200'}`}
                />
              );
            })}
            <span className="ml-1 text-[11px] font-semibold text-gray-400">
              {ratingCount > 0 ? `${rating.toFixed(1)}` : 'Sin reseñas'}
            </span>
          </div>

          {/* Price & Add */}
          <div className="flex items-center justify-between mt-1">
            <div className="flex flex-col">
              {hasDiscount && (
                <span className="text-[11px] text-gray-400 line-through leading-tight">
                  S/ {originalPrice.toFixed(2)}
                </span>
              )}
              <span className="font-bold text-gray-900 text-base leading-tight">
                S/ {price.toFixed(2)}
              </span>
            </div>
            
            <motion.button
              whileTap={isOutOfStock ? undefined : { scale: 0.85 }}
              disabled={isOutOfStock}
              onClick={(e: any) => { e.stopPropagation(); if (!isOutOfStock) onAddToCart(producto); }}
              className={`w-8 h-8 flex items-center justify-center rounded-full transition-all ${isOutOfStock ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-gray-900 text-white hover:bg-black hover:scale-105 shadow-sm'}`}
              title={isOutOfStock ? 'Agotado' : 'Agregar al carrito'}
              style={isOutOfStock ? undefined : { background: cp }}
            >
              <Icon icon={isOutOfStock ? "solar:close-circle-bold" : "solar:cart-plus-bold"} width={16} />
            </motion.button>
          </div>
        </div>
      </div>
    </>
  );
}
