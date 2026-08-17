import { Icon } from '@iconify/react';
import { useNavigate } from 'react-router-dom';

interface ModaFeaturedCollectionsProps {
  diseno?: any;
  slug: string;
  productos?: any[];
  onAddToCart?: (producto: any) => void;
}

const fallbackProducts = [
  {
    id: 'moda-demo-1',
    descripcion: 'Loafer Ananas Black',
    precioUnitario: 1540,
    imagenUrl: 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?auto=format&fit=crop&q=85&w=900',
  },
  {
    id: 'moda-demo-2',
    descripcion: 'Loafer Bonsai Black',
    precioUnitario: 1540,
    imagenUrl: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?auto=format&fit=crop&q=85&w=900',
  },
  {
    id: 'moda-demo-3',
    descripcion: 'Longsleeve Film Set Antique White',
    precioUnitario: 435,
    imagenUrl: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&q=85&w=900',
  },
  {
    id: 'moda-demo-4',
    descripcion: 'Longsleeve Film Set Black',
    precioUnitario: 435,
    imagenUrl: 'https://images.unsplash.com/photo-1576566588028-4147f3842f27?auto=format&fit=crop&q=85&w=900',
  },
  {
    id: 'moda-demo-5',
    descripcion: 'Longsleeve Film Set Celestial Blue',
    precioUnitario: 435,
    imagenUrl: 'https://images.unsplash.com/photo-1562157873-818bc0726f68?auto=format&fit=crop&q=85&w=900',
  },
];

const badges = ['BESTSELLER', 'POPULAR', 'NEW', 'NEW', 'NEW'];

export default function ModaFeaturedCollections({ slug,
  productos = [],
  onAddToCart, diseno }: ModaFeaturedCollectionsProps) {
  const navigate = useNavigate();
  const items = (productos.length ? productos : fallbackProducts).slice(0, 5);

  const goProduct = (producto: any) => {
    if (slug === 'preview') {
      window.dispatchEvent(new CustomEvent('preview-nav', { detail: 'catalogo' }));
      return;
    }
    navigate(`/tienda/${slug}/producto/${producto.id}`);
  };

  const goCatalog = () => {
    if (slug === 'preview') {
      window.dispatchEvent(new CustomEvent('preview-nav', { detail: 'catalogo' }));
      return;
    }
    navigate(`/tienda/${slug}/catalogo?sort=new`);
  };

  return (
    <section className="w-full bg-white text-black" style={{ fontFamily: '"Inter", sans-serif' }}>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 border-t border-gray-200">
        {items.map((producto, index) => (
          <article key={producto.id} className="group border-r border-gray-200 last:border-r-0">
            <div className="relative h-[360px] md:h-[458px] bg-[#F2F2F2] overflow-hidden">
              <span className="absolute left-5 top-5 z-20 rounded-md bg-white px-2 py-1 text-[12px] font-medium uppercase shadow-sm">
                {badges[index] || 'NEW'}
              </span>

              <button
                className="absolute right-5 top-5 z-20 h-8 w-8 rounded-md bg-white flex items-center justify-center shadow-sm hover:bg-black hover:text-white transition-colors"
                aria-label="Agregar a favoritos"
              >
                <Icon icon="solar:heart-linear" width={18} />
              </button>

              <button onClick={() => goProduct(producto)} className="h-full w-full">
                {producto.imagenUrl ? (
                  <img
                    src={producto.imagenUrl}
                    alt={producto.descripcion}
                    className="h-full w-full object-contain p-10 transition-transform duration-700 group-hover:scale-[1.04]"
                  />
                ) : (
                  <div className="h-full w-full flex items-center justify-center text-xs font-bold uppercase tracking-widest text-gray-400">
                    Imagen
                  </div>
                )}
              </button>

              <div className="absolute left-5 right-5 bottom-5 z-20 translate-y-4 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100 flex gap-2">
                <button
                  onClick={() => goProduct(producto)}
                  className="h-10 flex-1 rounded-md bg-white text-black text-[12px] font-bold uppercase shadow-lg hover:bg-black hover:text-white transition-colors"
                >
                  Vista rápida
                </button>
                <button
                  onClick={() => onAddToCart?.(producto)}
                  className="h-10 w-11 rounded-md bg-black text-white flex items-center justify-center shadow-lg hover:bg-white hover:text-black transition-colors"
                  aria-label="Agregar al carrito"
                >
                  <Icon icon="solar:bag-4-linear" width={18} />
                </button>
              </div>
            </div>

            <button
              onClick={() => goProduct(producto)}
              className="w-full min-h-[92px] px-5 py-4 text-center hover:bg-gray-50 transition-colors"
            >
              <p className="text-[12px] font-medium uppercase leading-tight line-clamp-2">
                {producto.descripcion}
              </p>
              <p className="mt-1 text-[12px] font-medium">S/. {Number(producto.precioUnitario || 0).toLocaleString('es-PE')}</p>
            </button>
          </article>
        ))}
      </div>

      <div className="flex justify-center py-10">
        <button
          onClick={goCatalog}
          className="h-12 min-w-[232px] rounded-md bg-black px-8 text-[16px] font-bold text-white hover:bg-neutral-800 transition-colors"
        >
          SHOP NEW ARRIVALS
        </button>
      </div>
    </section>
  );
}
