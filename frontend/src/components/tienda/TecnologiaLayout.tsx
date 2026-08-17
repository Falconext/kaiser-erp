import React, { useMemo, useState } from 'react';
import { Icon } from '@iconify/react';
import { useNavigate } from 'react-router-dom';
import TecnologiaHeader from './TecnologiaHeader';
import TecnologiaHero from './TecnologiaHero';
import ProductCardXtra from './ProductCardXtra';
import TecnologiaCartModal from './TecnologiaCartModal';
import TecnologiaFooter from './TecnologiaFooter';
import { motion } from 'framer-motion';
import { useCompareStore } from '@/zustand/compare';
import { getStoreLinkAction, runStoreLinkAction } from './storeLinkActions';

interface TecnologiaLayoutProps {
  tienda: any;
  slug: string;
  productos: any[];
  allCategories: (string | { nombre: string; imagenUrl?: string })[];
  cp: string;
  diseno: any;
  carrito: any[];
  setCarrito: (c: any[]) => void;
  mostrarCarrito: boolean;
  setMostrarCarrito: (v: boolean) => void;
  agregarAlCarrito: (p: any) => void;
  actualizarCantidad: (id: number | string, cantidad: number) => void;
  loading: boolean;
}

const stagger = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

const item = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.28 } },
};

export default function TecnologiaLayout({
  tienda,
  slug,
  productos,
  allCategories,
  cp,
  diseno,
  carrito,
  setCarrito,
  mostrarCarrito,
  setMostrarCarrito,
  agregarAlCarrito,
  actualizarCantidad,
  loading,
}: TecnologiaLayoutProps) {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [showCompareModal, setShowCompareModal] = useState(false);
  const { getBySlug, clear: clearCompare } = useCompareStore();

  const carritoTotal = carrito.reduce((total, cartItem) => total + Number(cartItem.precioUnitario || 0) * Number(cartItem.cantidad || 1), 0);
  const popularOverride = Array.isArray(diseno?.tecnologiaPopularProducts) ? diseno.tecnologiaPopularProducts : [];
  const suggestedOverride = Array.isArray(diseno?.tecnologiaSuggestedProducts) ? diseno.tecnologiaSuggestedProducts : [];
  const populares = popularOverride.length > 0 ? popularOverride : productos.slice(0, 8);
  const sugeridos = useMemo(() => {
    if (suggestedOverride.length > 0) return suggestedOverride;
    const offset = Math.ceil(productos.length / 2);
    return [...productos.slice(offset), ...productos.slice(0, offset)].slice(0, 8);
  }, [productos, suggestedOverride]);

  const isPreview = slug === 'preview';
  const runAction = (key: string) => {
    runStoreLinkAction(getStoreLinkAction(diseno, key, { defaultType: 'catalog' }), { slug, navigate });
  };
  const goProduct = (producto: any) => {
    if (isPreview) {
      window.dispatchEvent(new CustomEvent('preview-product', { detail: producto }));
      return;
    }
    navigate(`/tienda/${slug}/producto/${producto.id}`);
  };
  const irACheckout = () => {
    if (isPreview) {
      window.dispatchEvent(new CustomEvent('preview-nav', { detail: 'checkout' }));
      return;
    }
    navigate(`/tienda/${slug}/checkout`, { state: { carrito, tienda } });
  };

  const handleSearchSubmit = (e: React.FormEvent, value?: string) => {
    e.preventDefault();
    const q = value || search;
    if (q.trim()) {
      slug === 'preview'
        ? window.dispatchEvent(new CustomEvent('preview-nav', { detail: 'catalogo' }))
        : navigate(`/tienda/${slug}/catalogo?search=${encodeURIComponent(q.trim())}`);
    }
  };

  const renderProducts = (items: any[]) => (
    <motion.div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4" variants={stagger} initial="hidden" animate="show">
      {items.map(producto => (
        <motion.div key={producto.id} variants={item}>
          <ProductCardXtra
            producto={producto}
            slug={slug}
            diseno={{ ...diseno, colorPrimario: cp }}
            onAddToCart={() => agregarAlCarrito(producto)}
            onClick={() => goProduct(producto)}
          />
        </motion.div>
      ))}
    </motion.div>
  );

  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: `'${diseno.tipografia || 'Inter'}', sans-serif` }}>
      <TecnologiaHeader
        tienda={tienda}
        slug={slug}
        cp={cp}
        carritoSize={carrito.length}
        carritoTotal={carritoTotal}
        onOpenCart={() => setMostrarCarrito(!mostrarCarrito)}
        searchQuery={search}
        setSearchQuery={setSearch}
        onSearchSubmit={handleSearchSubmit}
        allCategories={allCategories}
      />

      <main className="w-full">
        <div className="mx-auto max-w-7xl px-4 py-4 lg:px-6">
          <TecnologiaHero cp={cp} slug={slug} diseno={diseno} productos={productos} />
        </div>

        <section className="mx-auto max-w-7xl px-4 pb-12 lg:px-6">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900">{diseno?.tecnologiaPopularTitle || 'Productos Populares'}</h2>
              <p className="mt-0.5 text-xs text-gray-400">{diseno?.tecnologiaPopularText || `${productos.length} productos`}</p>
            </div>
            <button
              type="button"
              onClick={() => runAction('tecnologiaPopularAction')}
              className="flex items-center gap-1 text-sm font-semibold transition-opacity hover:opacity-80"
              style={{ color: cp }}
            >
              Ver todo <Icon icon="solar:alt-arrow-right-bold" className="text-sm" />
            </button>
          </div>

          {loading ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {Array.from({ length: 8 }).map((_, index) => (
                <div key={index} className="h-[330px] animate-pulse rounded-2xl bg-gray-100" />
              ))}
            </div>
          ) : populares.length > 0 ? (
            renderProducts(populares)
          ) : (
            <div className="rounded-3xl border border-dashed border-gray-200 bg-gray-50 px-6 py-14 text-center">
              <Icon icon="solar:box-minimalistic-linear" className="mx-auto mb-3 text-4xl text-gray-300" />
              <p className="text-sm font-bold text-gray-700">Aún no hay productos publicados</p>
            </div>
          )}
        </section>

        {sugeridos.length > 0 && (
          <section className="bg-gray-50/60 py-12">
            <div className="mx-auto max-w-7xl px-4 lg:px-6">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{diseno?.tecnologiaSuggestedTitle || 'Productos que te podrían interesar'}</h2>
                  <p className="mt-0.5 text-xs text-gray-400">{diseno?.tecnologiaSuggestedText || `${sugeridos.length} productos`}</p>
                </div>
                <button
                  type="button"
                  onClick={() => runAction('tecnologiaSuggestedAction')}
                  className="flex items-center gap-1 text-sm font-semibold transition-opacity hover:opacity-80"
                  style={{ color: cp }}
                >
                  Ver todo <Icon icon="solar:alt-arrow-right-bold" className="text-sm" />
                </button>
              </div>
              {renderProducts(sugeridos)}
            </div>
          </section>
        )}
      </main>

      <TecnologiaFooter tienda={tienda} slug={slug} diseno={diseno} categories={allCategories} />

      {getBySlug(slug).length > 0 && (
        <div className="pointer-events-auto fixed bottom-4 left-1/2 z-50 w-max max-w-[95vw] -translate-x-1/2">
          <div className="flex items-center gap-2 rounded-2xl bg-gray-900 px-3 py-2.5 text-white shadow-2xl sm:gap-4 sm:px-5 sm:py-3">
            <div className="flex shrink-0 -space-x-2">
              {getBySlug(slug).slice(0, 3).map(compareItem => (
                <div key={compareItem.id} className="h-7 w-7 overflow-hidden rounded-full border-2 border-gray-800 bg-white sm:h-8 sm:w-8">
                  {compareItem.imagenUrl ? <img src={compareItem.imagenUrl} alt="" className="h-full w-full object-contain" /> : <div className="h-full w-full bg-gray-200" />}
                </div>
              ))}
            </div>
            <span className="whitespace-nowrap text-xs font-semibold sm:text-sm">{getBySlug(slug).length} para comparar</span>
            <button onClick={() => setShowCompareModal(true)} className="whitespace-nowrap rounded-xl px-3 py-1.5 text-xs font-bold text-white sm:px-4 sm:text-sm" style={{ background: cp }}>Ver</button>
            <button onClick={() => clearCompare(slug)} className="shrink-0 text-gray-400 transition-colors hover:text-white" aria-label="Limpiar comparación">
              <Icon icon="solar:close-circle-bold" width={16} />
            </button>
          </div>
        </div>
      )}

      {showCompareModal && (() => {
        const compareItems = getBySlug(slug);
        return (
          <div className="fixed inset-0 z-[998] flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4" onClick={() => setShowCompareModal(false)}>
            <div className="max-h-[90vh] w-full max-w-3xl overflow-auto rounded-t-3xl bg-white shadow-2xl sm:rounded-2xl" onClick={event => event.stopPropagation()}>
              <div className="flex items-center justify-between border-b border-gray-100 p-4 sm:p-5">
                <h3 className="text-base font-black text-gray-900 sm:text-lg">Comparar productos</h3>
                <div className="flex items-center gap-3">
                  <button onClick={() => clearCompare(slug)} className="text-xs text-red-500 hover:text-red-700">Limpiar</button>
                  <button onClick={() => setShowCompareModal(false)} className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 transition-colors hover:bg-gray-200" aria-label="Cerrar comparación">
                    <Icon icon="solar:close-circle-bold" width={18} />
                  </button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <td className="p-4 text-xs font-semibold uppercase text-gray-500">Detalle</td>
                      {compareItems.map(compareItem => (
                        <td key={compareItem.id} className="p-4 text-center">
                          <div className="flex flex-col items-center gap-2">
                            {compareItem.imagenUrl && <img src={compareItem.imagenUrl} alt={compareItem.descripcion} className="h-16 w-16 object-contain" />}
                            <span className="line-clamp-2 text-center text-xs font-bold text-gray-800">{compareItem.descripcion}</span>
                            <button onClick={() => { setShowCompareModal(false); goProduct(compareItem); }} className="rounded-full px-3 py-1 text-[11px] font-bold text-white" style={{ background: cp }}>Ver producto</button>
                          </div>
                        </td>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { label: 'Precio', fn: (row: any) => `S/ ${Number(row.precioUnitario).toFixed(2)}` },
                      { label: 'Categoría', fn: (row: any) => row.categoria?.nombre || row.categoria || '-' },
                      { label: 'Marca', fn: (row: any) => row.marca?.nombre || row.marca || '-' },
                      { label: 'Stock', fn: (row: any) => row.stock ?? '-' },
                    ].map(({ label, fn }) => (
                      <tr key={label} className="border-b border-gray-50 hover:bg-gray-50">
                        <td className="p-4 text-xs font-semibold text-gray-500">{label}</td>
                        {compareItems.map(compareItem => (
                          <td key={compareItem.id} className="p-4 text-center text-sm text-gray-700">{fn(compareItem)}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
      })()}

      <TecnologiaCartModal
        isOpen={mostrarCarrito}
        onClose={() => setMostrarCarrito(false)}
        carrito={carrito}
        setCarrito={setCarrito}
        actualizarCantidad={actualizarCantidad}
        onCheckout={irACheckout}
        cp={cp}
        tienda={tienda}
      />
    </div>
  );
}
