import { useState, useRef } from 'react';
import { Icon } from '@iconify/react';
import { useNavigate } from 'react-router-dom';
import XtraHeader from './XtraHeader';
import XtraHero from './XtraHero';
import GadgetsHeroBanner from './GadgetsHeroBanner';
import ProductCardXtra from './ProductCardXtra';
import Footer from './Footer';
import GadgetsCartModal from './GadgetsCartModal';
import { useCompareStore } from '@/zustand/compare';
import { motion } from 'framer-motion';

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
};

function SectionHeader({ title, count, cp, onMore }: { title: string; count?: number; cp: string; onMore?: () => void }) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div>
        <h2 className="font-bold text-xl text-gray-900">{title}</h2>
        {count != null && <p className="text-xs text-gray-400 mt-0.5">{count} productos</p>}
      </div>
      <div className="flex items-center gap-2">
        {onMore && (
          <button onClick={onMore} className="text-sm font-semibold flex items-center gap-1 hover:opacity-80 transition-opacity" style={{ color: cp }}>
            Ver todo <Icon icon="solar:alt-arrow-right-bold" className="text-sm" />
          </button>
        )}
      </div>
    </div>
  );
}

interface GadgetsLayoutProps {
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

export default function GadgetsLayout({
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
}: GadgetsLayoutProps) {
  const navigate = useNavigate();
  const adminMenuRef = useRef<HTMLDivElement>(null);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [showCompareModal, setShowCompareModal] = useState(false);
  const { getBySlug, clear: clearCompare } = useCompareStore();

  const popular = productos.slice(0, 8);
  const related = [...productos.slice(4), ...productos.slice(0, 4)].slice(0, 8);
  const hasBanners = (tienda?.banners?.length ?? 0) > 0;

  const irACheckout = () => navigate(`/tienda/${slug}/checkout`, { state: { carrito, tienda } });

  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: `'${diseno.tipografia || 'Inter'}', sans-serif` }}>

      <XtraHeader
        tienda={tienda}
        slug={slug}
        carritoCount={carrito.length}
        onToggleCart={() => setMostrarCarrito(!mostrarCarrito)}
        isAdminOpen={isAdminOpen}
        setIsAdminOpen={setIsAdminOpen}
        adminMenuRef={adminMenuRef}
        search={search}
        setSearch={setSearch}
        categories={allCategories}
        onSelectCategory={(cat) => navigate(cat ? `/tienda/${slug}/catalogo?category=${encodeURIComponent(cat)}` : `/tienda/${slug}/catalogo`)}
        recommendedProducts={productos}
        onSearch={() => {
          const term = search.trim();
          if (term) navigate(`/tienda/${slug}/catalogo?search=${encodeURIComponent(term)}`);
        }}
        cp={cp}
      />

      <main className="pt-20 pb-16 max-w-screen-xl mx-auto">

        {loading ? (
          <section className="mx-4 lg:mx-8 my-4 rounded-3xl overflow-hidden relative" style={{ background: '#0B1340', minHeight: 480 }}>
            <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: 'repeating-linear-gradient(-45deg, transparent, transparent 22px, rgba(255,255,255,0.025) 22px, rgba(255,255,255,0.025) 23px)' }} />
            <div className="relative grid grid-cols-1 lg:grid-cols-2 items-center min-h-[480px]">
              <div className="px-8 lg:px-16 py-12 lg:py-20 flex flex-col justify-center">
                <div className="w-48 h-6 rounded-full bg-white/10 animate-pulse mb-6" />
                <div className="w-full max-w-md h-16 rounded-xl bg-white/10 animate-pulse mb-3" />
                <div className="w-3/4 max-w-sm h-16 rounded-xl bg-white/10 animate-pulse mb-6" />
                <div className="w-full max-w-sm h-4 rounded bg-white/10 animate-pulse mb-3" />
                <div className="w-2/3 max-w-xs h-4 rounded bg-white/10 animate-pulse mb-8" />
                <div className="flex gap-4">
                  <div className="w-40 h-12 rounded-full bg-white/10 animate-pulse" />
                  <div className="w-40 h-12 rounded-full bg-white/10 animate-pulse" />
                </div>
              </div>
              <div className="relative flex items-center justify-center h-64 lg:h-auto lg:min-h-[480px] px-8 lg:px-12 pb-8 lg:pb-0">
                <div className="absolute w-64 h-64 rounded-full blur-3xl opacity-10 pointer-events-none animate-pulse" style={{ background: cp, right: '5%', top: '15%' }} />
                <div className="absolute w-52 h-52 rounded-full blur-2xl opacity-10 pointer-events-none animate-pulse" style={{ background: 'radial-gradient(circle, #e879f9 0%, #f97316 100%)', right: '20%', top: '20%' }} />
                <div className="w-64 h-64 lg:w-80 lg:h-80 rounded-2xl bg-white/5 animate-pulse border border-white/10" />
                <div className="absolute bottom-10 -right-4 lg:-right-0 w-48 h-16 bg-white/10 rounded-2xl animate-pulse backdrop-blur-md border border-white/20" />
              </div>
            </div>
          </section>
        ) : hasBanners ? (
          <GadgetsHeroBanner tienda={tienda} diseno={diseno} />
        ) : (
          <XtraHero 
            tienda={tienda}
            diseno={diseno}
            productos={productos}
            cp={cp}
            onExplore={() => document.getElementById('g-populares')?.scrollIntoView({ behavior: 'smooth' })}
          />
        )}

        {/* Productos Populares */}
        <section id="g-populares" className="max-w-screen-xl mx-auto px-5 md:px-8 pb-10 scroll-mt-32">
          <SectionHeader
            title="Productos Populares"
            count={popular.length}
            cp={cp}
            onMore={() => navigate(`/tienda/${slug}/catalogo`)}
          />
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="bg-white rounded-[1.5rem] border border-gray-100 p-4 h-[340px] flex flex-col shadow-sm">
                  <div className="animate-pulse bg-gray-100 rounded-xl w-full h-48 mb-4" />
                  <div className="animate-pulse bg-gray-100 rounded w-3/4 h-4 mb-2" />
                  <div className="animate-pulse bg-gray-100 rounded w-1/2 h-3 mb-4" />
                  <div className="mt-auto flex justify-between items-end">
                    <div className="animate-pulse bg-gray-100 rounded w-1/3 h-6" />
                    <div className="animate-pulse bg-gray-100 rounded-full w-9 h-9" />
                  </div>
                </div>
              ))}
            </div>
          ) : popular.length === 0 ? (
            <div className="py-20 text-center text-gray-400">
              <Icon icon="solar:box-linear" className="text-5xl mx-auto mb-3" />
              <p className="text-sm">Sin productos en esta categoría</p>
            </div>
          ) : (
            <motion.div 
              variants={containerVariants}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: "-50px" }}
              className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4"
            >
              {popular.map(p => (
                <motion.div key={p.id} variants={itemVariants}>
                  <ProductCardXtra
                    producto={p}
                    slug={slug}
                    diseno={diseno}
                    onAddToCart={() => agregarAlCarrito(p)}
                    onClick={() => navigate(`/tienda/${slug}/producto/${p.id}`)}
                  />
                </motion.div>
              ))}
            </motion.div>
          )}
        </section>

        {/* Productos que te podrían interesar */}
        {related.length > 0 && (
          <section className="bg-gray-50/60 py-10">
            <div className="max-w-screen-xl mx-auto px-5 md:px-8">
              <SectionHeader
                title="Productos que te podrían interesar"
                count={related.length}
                cp={cp}
                onMore={() => navigate(`/tienda/${slug}/catalogo`)}
              />
              <motion.div 
                variants={containerVariants}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, margin: "-50px" }}
                className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4"
              >
                {related.map((p, i) => (
                  <motion.div key={`${p.id}-rel-${i}`} variants={itemVariants}>
                    <ProductCardXtra
                      producto={p}
                      slug={slug}
                      diseno={diseno}
                      onAddToCart={() => agregarAlCarrito(p)}
                      onClick={() => navigate(`/tienda/${slug}/producto/${p.id}`)}
                    />
                  </motion.div>
                ))}
              </motion.div>
            </div>
          </section>
        )}

      </main>

      <Footer tienda={tienda} diseno={diseno} />

      {/* Floating compare bar */}
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
            <button onClick={() => clearCompare(slug)} className="text-gray-400 hover:text-white transition-colors flex-shrink-0">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M1 1L11 11M11 1L1 11" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round"/></svg>
            </button>
          </div>
        </div>
      )}

      {/* Compare modal */}
      {showCompareModal && (() => {
        const compareItems = getBySlug(slug);
        return (
          <div className="fixed inset-0 z-[998] bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => setShowCompareModal(false)}>
            <div className="bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl w-full max-w-3xl overflow-auto max-h-[90vh]" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between p-4 sm:p-5 border-b border-gray-100">
                <h3 className="font-black text-gray-900 text-base sm:text-lg">Comparar productos</h3>
                <div className="flex items-center gap-3">
                  <button onClick={() => clearCompare(slug)} className="text-xs text-red-500 hover:text-red-700">Limpiar</button>
                  <button onClick={() => setShowCompareModal(false)} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors">
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M1 1L11 11M11 1L1 11" stroke="#374151" strokeWidth="2" strokeLinecap="round"/></svg>
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
                      { label: 'Categoría', fn: (i: any) => i.categoria || '—' },
                      { label: 'Marca', fn: (i: any) => i.marca || '—' },
                      { label: 'Stock', fn: (i: any) => i.stock ?? '—' },
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

      <GadgetsCartModal
        isOpen={mostrarCarrito}
        onClose={() => setMostrarCarrito(false)}
        carrito={carrito}
        tienda={tienda}
        actualizarCantidad={actualizarCantidad}
        onCheckout={irACheckout}
        slug={slug}
        setCarrito={setCarrito}
        cp={cp}
      />
    </div>
  );
}
