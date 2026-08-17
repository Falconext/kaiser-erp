import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '@iconify/react';
import { useFavoritosStore } from '@/zustand/favoritos';
import { useCompareStore } from '@/zustand/compare';

interface Props {
  producto: {
    id: number;
    descripcion: string;
    precioUnitario: number;
    imagenUrl?: string;
    categoria?: { nombre: string } | string | null;
    marca?: { nombre: string } | string | null;
    stock?: number;
    ratingAvg?: number;
  };
  slug: string;
  cp: string;
}

export default function ProductCardActions({ producto, slug, cp }: Props) {
  const [zoomOpen, setZoomOpen] = useState(false);

  const { toggleFavorito, isFavorito } = useFavoritosStore();
  const { toggle: toggleCompare, isInCompare } = useCompareStore();

  const wished = isFavorito(producto.id, slug);
  const inCompare = isInCompare(producto.id, slug);

  const catName = typeof producto.categoria === 'object' ? producto.categoria?.nombre : producto.categoria;
  const marcaName = typeof producto.marca === 'object' ? producto.marca?.nombre : producto.marca;

  const handleWishlist = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleFavorito({
      id: producto.id,
      descripcion: producto.descripcion,
      precioUnitario: Number(producto.precioUnitario || 0),
      imagenUrl: producto.imagenUrl,
      slug,
    });
  };

  const handleZoom = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (producto.imagenUrl) setZoomOpen(true);
  };

  const handleCompare = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleCompare({
      id: producto.id,
      descripcion: producto.descripcion,
      precioUnitario: Number(producto.precioUnitario || 0),
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
      <div className="flex flex-col gap-1.5">
        <button
          title={wished ? 'Quitar de favoritos' : 'Agregar a favoritos'}
          onClick={handleWishlist}
          className="w-8 h-8 rounded-full bg-white border border-gray-100 shadow-sm flex items-center justify-center transition-all hover:scale-110"
        >
          <Icon
            icon={wished ? 'solar:heart-bold' : 'solar:heart-linear'}
            className="text-sm"
            style={{ color: wished ? '#ef4444' : '#9ca3af' }}
          />
        </button>

        <button
          title="Ver imagen"
          onClick={handleZoom}
          className="w-8 h-8 rounded-full bg-white border border-gray-100 shadow-sm flex items-center justify-center transition-all hover:scale-110"
        >
          <Icon icon="solar:magnifer-zoom-in-linear" className="text-sm text-gray-400" />
        </button>

        <button
          title={inCompare ? 'Quitar de comparación' : 'Comparar'}
          onClick={handleCompare}
          className="w-8 h-8 rounded-full bg-white border border-gray-100 shadow-sm flex items-center justify-center transition-all hover:scale-110"
        >
          <Icon
            icon="solar:transfer-horizontal-linear"
            className="text-sm"
            style={{ color: inCompare ? cp : '#9ca3af' }}
          />
        </button>
      </div>

      {/* Zoom lightbox — portal al body para evitar stacking context de la card */}
      {zoomOpen && producto.imagenUrl && createPortal(
        <div
          className="fixed inset-0 bg-black/90 flex items-center justify-center"
          style={{ zIndex: 99999 }}
          onClick={() => setZoomOpen(false)}
        >
          <button
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-lg hover:bg-gray-100 transition-colors"
            style={{ zIndex: 100000 }}
            onClick={(e) => { e.stopPropagation(); setZoomOpen(false); }}
          >
            <svg width="14" height="14" viewBox="0 0 12 12" fill="none"><path d="M1 1L11 11M11 1L1 11" stroke="#374151" strokeWidth="2" strokeLinecap="round"/></svg>
          </button>
          <img
            src={producto.imagenUrl}
            alt={producto.descripcion}
            className="max-w-[90vw] max-h-[90vh] object-contain rounded-2xl"
            onClick={e => e.stopPropagation()}
          />
        </div>,
        document.body
      )}
    </>
  );
}
