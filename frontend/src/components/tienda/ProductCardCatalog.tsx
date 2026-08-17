import { Icon } from '@iconify/react';
import ProductCardActions from '@/components/tienda/ProductCardActions';

interface Props {
  producto: {
    id: number;
    descripcion: string;
    precioUnitario: number;
    precioOriginal?: number;
    imagenUrl: string;
    stock: number;
    categoria: { nombre: string };
    marca: { nombre: string };
    ratingAvg?: number;
    ratingCount?: number;
  };
  slug: string;
  cp: string;
  onAddToCart?: () => void;
  onClick?: () => void;
}

export default function ProductCardCatalog({ producto, slug, cp, onAddToCart, onClick }: Props) {
  const price = Number(producto.precioUnitario || 0);
  const originalPrice = Number(producto.precioOriginal || 0);
  const hasDiscount = !!(originalPrice && originalPrice > price);
  const ratingCount = Number(producto.ratingCount || 0);
  const ratingAvg = ratingCount > 0 ? Number(producto.ratingAvg || 0) : 0;
  const isOutOfStock = Number(producto.stock) <= 0;

  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden hover:shadow-md transition-all duration-200 cursor-pointer group" onClick={onClick}>
      {/* Image */}
      <div className="relative bg-white flex items-center justify-center h-44 p-4">
        <div className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
          <ProductCardActions producto={producto} slug={slug} cp={cp} />
        </div>
        {producto.imagenUrl ? (
          <>
            <img
              src={producto.imagenUrl}
              alt={producto.descripcion}
              className={`max-h-full max-w-full object-contain group-hover:scale-105 transition-transform duration-200 ${isOutOfStock ? 'grayscale opacity-70' : ''}`}
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

      {/* Info */}
      <div className="p-3">
        {/* Price */}
        <div className="flex items-baseline gap-2 mb-1.5">
          <span className="font-bold text-gray-900 text-[15px]">
            S/ {price.toFixed(2)}
          </span>
          {hasDiscount && (
            <span className="text-xs text-gray-400 line-through">
              S/ {originalPrice.toFixed(2)}
            </span>
          )}
        </div>

        {/* Name */}
        <p className="text-xs text-gray-500 leading-snug line-clamp-2 mb-3">
          {producto.descripcion} · {producto.marca?.nombre}
        </p>

        {/* Footer row: rating | cart */}
        <div className="flex items-center gap-2">
          {ratingCount > 0 ? (
            <span
              className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold text-white flex-shrink-0"
              style={{ background: cp }}
            >
              ★ {ratingAvg.toFixed(1)}
              <span className="opacity-75">({ratingCount})</span>
            </span>
          ) : (
            <span className="text-[10px] text-gray-400 flex-shrink-0">Sin reseñas</span>
          )}
          <button
            disabled={isOutOfStock}
            className={`ml-auto w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 transition-opacity ${isOutOfStock ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'text-white hover:opacity-80'}`}
            style={isOutOfStock ? undefined : { background: cp }}
            onClick={e => { e.stopPropagation(); if (!isOutOfStock) onAddToCart?.(); }}
          >
            <Icon icon={isOutOfStock ? "solar:close-circle-bold" : "solar:bag-2-bold"} className="text-xs" />
          </button>
        </div>
      </div>
    </div>
  );
}
