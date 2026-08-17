import React, { useState, useRef } from 'react';
import { Icon } from '@iconify/react';
import { useNavigate } from 'react-router-dom';
import AutopartesHeader from './AutopartesHeader';
import AutopartesHero from './AutopartesHero';
import ProductCardAutopartes from './ProductCardAutopartes';
import AutopartesCartModal from './AutopartesCartModal';
import AutopartesFeaturedCategories from './AutopartesFeaturedCategories';
import AutopartesPromoBanners from './AutopartesPromoBanners';
import AutopartesTrendingProducts from './AutopartesTrendingProducts';
import AutopartesDealsOfTheWeek from './AutopartesDealsOfTheWeek';
import AutopartesBrands from './AutopartesBrands';
import AutopartesTopSelling from './AutopartesTopSelling';
import AutopartesFooter from './AutopartesFooter';
import { motion, type Variants } from 'framer-motion';
import { useCompareStore } from '@/zustand/compare';

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08
    }
  }
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 30 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
};

interface AutopartesLayoutProps {
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

export default function AutopartesLayout({
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
}: AutopartesLayoutProps) {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [showCompareModal, setShowCompareModal] = useState(false);
  const { getBySlug, clear: clearCompare } = useCompareStore();
  const carritoTotal = carrito.reduce((total, item) => total + Number(item.precioUnitario || 0) * Number(item.cantidad || 1), 0);

  // Slicing for homepage grids
  const featured = productos.slice(0, 8);
  const newArrivals = [...productos].reverse().slice(0, 8);

  const irACheckout = () => navigate(`/tienda/${slug}/checkout`, { state: { carrito, tienda } });

  const handleSearchSubmit = (e: React.FormEvent, value?: string) => {
    e.preventDefault();
    const q = value || search;
    if (q.trim()) {
      slug === "preview" ? window.dispatchEvent(new CustomEvent("preview-nav", { detail: "catalogo" })) : navigate(`/tienda/${slug}/catalogo?search=${encodeURIComponent(q.trim())}`);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF5F5]" style={{ fontFamily: `'${diseno.tipografia || 'Inter'}', sans-serif` }}>
      {/* Header */}
      <AutopartesHeader 
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

      <main className="w-full max-w-7xl mx-auto px-4 xl:px-8 py-8 md:py-10">
        
        {/* Hero Section */}
        <div className="mb-4">
          <AutopartesHero cp={cp} slug={slug} diseno={diseno} productos={productos} />
        </div>

        {/* Featured Categories Area */}
        <AutopartesFeaturedCategories cp={cp} slug={slug} diseno={diseno} />

        {/* Promo Banners Area */}
        <div className="mt-8 mb-16">
          <AutopartesPromoBanners cp={cp} slug={slug} diseno={diseno} />
        </div>

        {/* Featured Products */}
        {featured.length > 0 && (
          <div className="mb-16">
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-6">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="flex gap-[3px]">
                    <div className="w-4 h-0.5 transform -skew-x-[30deg]" style={{ backgroundColor: cp }}></div>
                    <div className="w-4 h-0.5 transform -skew-x-[30deg]" style={{ backgroundColor: cp }}></div>
                  </div>
                  <span className="text-sm font-bold" style={{ color: cp }}>Producto Destacado</span>
                </div>
                <h2 className="text-3xl md:text-4xl font-black text-gray-900 tracking-tight">
                  Productos por Categoría
                </h2>
              </div>
              
              <div className="flex flex-wrap md:flex-nowrap items-center gap-3">
                <div className="flex flex-col flex-1 min-w-[160px]">
                  <span className="text-[10px] text-gray-500 font-bold mb-1 ml-1">Categoría Principal</span>
                  <div className="bg-white border border-gray-200 rounded px-3 py-2 flex items-center justify-between cursor-pointer hover:border-gray-300 transition-colors">
                    <span className="text-xs font-bold text-gray-700">Motor y Rendimiento</span>
                    <Icon icon="solar:alt-arrow-down-linear" className="text-gray-400" />
                  </div>
                </div>
                <div className="flex flex-col flex-1 min-w-[140px]">
                  <span className="text-[10px] text-gray-500 font-bold mb-1 ml-1">Sub Categoría</span>
                  <div className="bg-white border border-gray-200 rounded px-3 py-2 flex items-center justify-between cursor-pointer hover:border-gray-300 transition-colors">
                    <span className="text-xs font-bold text-gray-700">Todas las Piezas</span>
                    <Icon icon="solar:alt-arrow-down-linear" className="text-gray-400" />
                  </div>
                </div>
                <div className="flex flex-col justify-end mt-2 md:mt-0 md:h-[50px] w-full md:w-auto">
                   <button className="h-[34px] bg-[#1A1A1A] text-white px-5 rounded text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-black transition-colors md:mt-auto">
                     <Icon icon="solar:magnifer-linear" />
                     Buscar
                   </button>
                </div>
              </div>
            </div>

            {loading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
                 {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="animate-pulse bg-white rounded-xl h-[340px]"></div>
                ))}
              </div>
            ) : (
              <motion.div 
                className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6"
                variants={containerVariants}
                initial="hidden"
                animate="show"
              >
                {featured.map((p) => (
                  <motion.div key={p.id} variants={itemVariants}>
                    <ProductCardAutopartes 
                      producto={p} 
                      slug={slug} 
                      diseno={diseno} 
                      onAddToCart={agregarAlCarrito}
                      onClick={() => navigate(`/tienda/${slug}/producto/${p.id}`)}
                    />
                  </motion.div>
                ))}
              </motion.div>
            )}
          </div>
        )}

        {/* Trending Searches Products Area */}
        {productos.length > 0 && (
          <AutopartesTrendingProducts 
            cp={cp} 
            slug={slug} 
            productos={[...productos].reverse()} 
            diseno={diseno} 
            onAddToCart={agregarAlCarrito} 
          />
        )}

      </main>

      {/* Full width deals section */}
      <AutopartesDealsOfTheWeek
        cp={cp}
        slug={slug}
        productos={productos}
        diseno={diseno}
        onAddToCart={agregarAlCarrito}
      />

      {/* Brands Banner */}
      <AutopartesBrands cp={cp} slug={slug} diseno={diseno} />

      {/* Top Selling section */}
      <div className="bg-[#FAF5F5]">
        <AutopartesTopSelling cp={cp} diseno={diseno} />
      </div>

      <AutopartesFooter tienda={tienda} slug={slug} diseno={diseno} />

      {getBySlug(slug).length > 0 && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 pointer-events-auto w-max max-w-[95vw]">
          <div className="bg-gray-900 text-white rounded-2xl shadow-2xl px-3 sm:px-5 py-2.5 sm:py-3 flex items-center gap-2 sm:gap-4">
            <div className="flex -space-x-2 flex-shrink-0">
              {getBySlug(slug).slice(0, 3).map(item => (
                <div key={item.id} className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border-2 border-gray-800 overflow-hidden bg-white">
                  {item.imagenUrl ? <img src={item.imagenUrl} alt="" className="w-full h-full object-contain" /> : <div className="w-full h-full bg-gray-200" />}
                </div>
              ))}
            </div>
            <span className="text-xs sm:text-sm font-semibold whitespace-nowrap">{getBySlug(slug).length} para comparar</span>
            <button onClick={() => setShowCompareModal(true)} className="px-3 sm:px-4 py-1.5 rounded-xl font-bold text-xs sm:text-sm text-white whitespace-nowrap" style={{ background: cp }}>Ver</button>
            <button onClick={() => clearCompare(slug)} className="text-gray-400 hover:text-white transition-colors flex-shrink-0" aria-label="Limpiar comparación">
              <Icon icon="solar:close-circle-bold" width={16} />
            </button>
          </div>
        </div>
      )}

      {showCompareModal && (() => {
        const compareItems = getBySlug(slug);
        return (
          <div className="fixed inset-0 z-[998] bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => setShowCompareModal(false)}>
            <div className="bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl w-full max-w-3xl overflow-auto max-h-[90vh]" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between p-4 sm:p-5 border-b border-gray-100">
                <h3 className="font-black text-gray-900 text-base sm:text-lg">Comparar productos</h3>
                <div className="flex items-center gap-3">
                  <button onClick={() => clearCompare(slug)} className="text-xs text-red-500 hover:text-red-700">Limpiar</button>
                  <button onClick={() => setShowCompareModal(false)} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors" aria-label="Cerrar comparación">
                    <Icon icon="solar:close-circle-bold" width={18} />
                  </button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <td className="p-4 font-semibold text-gray-500 text-xs uppercase">Detalle</td>
                      {compareItems.map(item => (
                        <td key={item.id} className="p-4 text-center">
                          <div className="flex flex-col items-center gap-2">
                            {item.imagenUrl && <img src={item.imagenUrl} alt={item.descripcion} className="w-16 h-16 object-contain" />}
                            <span className="text-xs font-bold text-gray-800 line-clamp-2 text-center">{item.descripcion}</span>
                            <button onClick={() => { setShowCompareModal(false); navigate(`/tienda/${slug}/producto/${item.id}`); }} className="text-[11px] font-bold text-white px-3 py-1 rounded-full" style={{ background: cp }}>Ver producto</button>
                          </div>
                        </td>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { label: 'Precio', fn: (i: any) => `S/ ${Number(i.precioUnitario).toFixed(2)}` },
                      { label: 'Categoría', fn: (i: any) => i.categoria || '-' },
                      { label: 'Marca', fn: (i: any) => i.marca || '-' },
                      { label: 'Stock', fn: (i: any) => i.stock ?? '-' },
                    ].map(({ label, fn }) => (
                      <tr key={label} className="border-b border-gray-50 hover:bg-gray-50">
                        <td className="p-4 text-xs font-semibold text-gray-500">{label}</td>
                        {compareItems.map(item => (
                          <td key={item.id} className="p-4 text-center text-sm text-gray-700">{fn(item)}</td>
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

      {/* Slide-out Cart */}
      <AutopartesCartModal 
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
