import React, { useState } from 'react';
import { Icon } from '@iconify/react';
import { useNavigate } from 'react-router-dom';
import MayeHeader from './MayeHeader';
import MayeHero from './MayeHero';
import ProductCardMaye from './ProductCardMaye';
import MayeCartModal from './MayeCartModal';
import MayeFeaturedCategories from './MayeFeaturedCategories';
import MayePromoBanners from './MayePromoBanners';
import MayeTrendingProducts from './MayeTrendingProducts';
import MayeDealsOfTheWeek from './MayeDealsOfTheWeek';
import MayeBrands from './MayeBrands';
import MayeTopSelling from './MayeTopSelling';
import MayeFooter from './MayeFooter';
import { AnimatePresence, motion } from 'framer-motion';
import { useCompareStore } from '@/zustand/compare';
import { mayeCard, mayeFloating, mayeModal, mayeOverlay, mayePage, mayeSection, mayeStagger, mayeTap, mayeViewport } from '@/lib/motion/maye';

interface MayeLayoutProps {
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

const ALL_VALUE = '__all__';

const getProductCategoryName = (product: any) => {
  const raw =
    product?.categoria ||
    product?.categoriaNombre ||
    product?.categoryName ||
    product?.category;
  if (typeof raw === 'string') return raw;
  return raw?.nombre || raw?.name || raw?.descripcion || '';
};

const getProductSubcategoryName = (product: any) => {
  const raw =
    product?.subcategoria ||
    product?.subCategoria ||
    product?.categoriaSecundaria ||
    product?.subCategory ||
    product?.tipoProducto ||
    product?.tipo;
  if (typeof raw === 'string') return raw;
  return raw?.nombre || raw?.name || raw?.descripcion || '';
};

const uniqueClean = (values: string[]) => Array.from(new Set(values.map(v => String(v || '').trim()).filter(Boolean)));
const normalizeFilterValue = (value: string) => String(value || '').trim().toLowerCase();
const getCategoryOptionName = (category: string | { nombre?: string; name?: string; descripcion?: string }) => {
  if (typeof category === 'string') return category;
  return category?.nombre || category?.name || category?.descripcion || '';
};

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

const hasActiveOffer = (product: any, now = new Date()) => {
  const regular = Number(product?.precioRegular ?? product?.precioOriginal ?? product?.precioUnitario ?? product?.precioVenta ?? product?.precio ?? 0);
  const offer = Number(product?.precioOferta || 0);
  const start = parseOfferDate(product?.fechaInicioOferta);
  const end = parseOfferDate(product?.fechaFinOferta, true);
  return offer > 0 && regular > 0 && offer < regular && (!start || start <= now) && (!end || end >= now);
};

export default function MayeLayout({
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
}: MayeLayoutProps) {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [showCompareModal, setShowCompareModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(ALL_VALUE);
  const [selectedSubcategory, setSelectedSubcategory] = useState(ALL_VALUE);
  const { getBySlug, clear: clearCompare } = useCompareStore();
  const carritoTotal = carrito.reduce((total, item) => total + Number(item.precioUnitario || 0) * Number(item.cantidad || 1), 0);

  // Slicing for homepage grids
  const featuredOverride = Array.isArray(diseno?.mayeFeaturedProducts) ? diseno.mayeFeaturedProducts : [];
  const trendingOverride = Array.isArray(diseno?.mayeTrendingProducts) ? diseno.mayeTrendingProducts : [];
  const dealsOverride = Array.isArray(diseno?.mayeDealsProducts) ? diseno.mayeDealsProducts : [];
  const topSellingOverride = Array.isArray(diseno?.mayeTopSellingProducts) ? diseno.mayeTopSellingProducts : [];
  const activeOfferProducts = productos.filter(product => hasActiveOffer(product));
  const realTopSellingProducts = [...productos]
    .filter(product => Number(product?.ventas ?? product?.vendidos ?? 0) > 0)
    .sort((a, b) => Number(b?.ventas ?? b?.vendidos ?? 0) - Number(a?.ventas ?? a?.vendidos ?? 0));
  const featuredSource = productos;
  const hasFeaturedFilter = selectedCategory !== ALL_VALUE || selectedSubcategory !== ALL_VALUE;
  const featured = hasFeaturedFilter
    ? featuredSource.filter((product: any) => {
      const productCategory = normalizeFilterValue(getProductCategoryName(product));
      const productSubcategory = normalizeFilterValue(getProductSubcategoryName(product));
      const categoryMatches = selectedCategory === ALL_VALUE || productCategory === normalizeFilterValue(selectedCategory);
      const subcategoryMatches = selectedSubcategory === ALL_VALUE || productSubcategory === normalizeFilterValue(selectedSubcategory);
      return categoryMatches && subcategoryMatches;
    })
    : (featuredOverride.length > 0 ? featuredOverride : productos.slice(0, 8));
  const productCategoryOptions = uniqueClean(productos.map(getProductCategoryName));
  const categoryOptions = productCategoryOptions.length > 0
    ? productCategoryOptions
    : uniqueClean(allCategories.map(getCategoryOptionName));
  const subcategoryOptions = uniqueClean(
    productos
      .filter((product: any) => selectedCategory === ALL_VALUE || normalizeFilterValue(getProductCategoryName(product)) === normalizeFilterValue(selectedCategory))
      .map(getProductSubcategoryName)
  );
  const trendingProducts = trendingOverride.length > 0 ? trendingOverride : [...productos].reverse();
  const dealProducts = dealsOverride.length > 0 ? dealsOverride : activeOfferProducts;
  const topSellingProducts = topSellingOverride.length > 0 ? topSellingOverride : realTopSellingProducts.slice(0, 12);

  const isPreview = slug === 'preview';
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
      slug === "preview" ? window.dispatchEvent(new CustomEvent("preview-nav", { detail: "catalogo" })) : navigate(`/tienda/${slug}/catalogo?search=${encodeURIComponent(q.trim())}`);
    }
  };

  const handleFeaturedFilter = () => undefined;

  const handleCategoryChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const nextCategory = event.target.value;
    setSelectedCategory(nextCategory);
    setSelectedSubcategory(ALL_VALUE);
  };

  return (
    <motion.div className="min-h-screen bg-white" style={{ fontFamily: `'${diseno.tipografia || 'Inter'}', sans-serif` }} variants={mayePage} initial="initial" animate="animate" exit="exit">
      {/* Header */}
      <MayeHeader 
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
        diseno={diseno}
      />

      <main className="w-full max-w-7xl mx-auto px-4 xl:px-8 py-8 md:py-10">
        
        {/* Hero Section */}
        <motion.div className="mb-4" variants={mayeSection}>
          <MayeHero cp={cp} slug={slug} diseno={diseno} productos={productos} allCategories={allCategories} />
        </motion.div>

        {/* Featured Categories Area */}
        <MayeFeaturedCategories cp={cp} slug={slug} diseno={diseno} />

        {/* Promo Banners Area */}
        <motion.div className="mt-8 mb-16" variants={mayeSection} initial="initial" whileInView="animate" viewport={mayeViewport}>
          <MayePromoBanners cp={cp} slug={slug} diseno={diseno} />
        </motion.div>

        {/* Featured Products */}
        {featuredSource.length > 0 && (
          <motion.section className="mb-16" variants={mayeSection} initial="initial" whileInView="animate" viewport={mayeViewport}>
            <motion.div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-6" variants={mayeCard}>
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="flex gap-[3px]">
                    <div className="w-4 h-0.5 transform -skew-x-[30deg]" style={{ backgroundColor: cp }}></div>
                    <div className="w-4 h-0.5 transform -skew-x-[30deg]" style={{ backgroundColor: cp }}></div>
                  </div>
                  <span className="text-sm font-bold" style={{ color: cp }}>{diseno?.mayeFeaturedProductsLabel || 'Producto Destacado'}</span>
                </div>
                <h2 className="text-3xl md:text-4xl font-black text-gray-900 tracking-tight">
                  {diseno?.mayeFeaturedProductsTitle || 'Productos por Categoría'}
                </h2>
              </div>
              
              <div className="flex flex-wrap md:flex-nowrap items-center gap-3">
                <div className="flex flex-col flex-1 min-w-[160px]">
                  <span className="text-[10px] text-gray-500 font-bold mb-1 ml-1">Categoría Principal</span>
                  <select
                    value={selectedCategory}
                    onChange={handleCategoryChange}
                    className="h-[38px] min-w-[180px] rounded border border-gray-200 bg-white px-3 text-xs font-bold text-gray-700 outline-none transition-colors hover:border-gray-300 focus:border-gray-400"
                  >
                    <option value={ALL_VALUE}>Todas las categorías</option>
                    {categoryOptions.map(category => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col flex-1 min-w-[140px]">
                  <span className="text-[10px] text-gray-500 font-bold mb-1 ml-1">Sub Categoría</span>
                  <select
                    value={selectedSubcategory}
                    onChange={(event) => setSelectedSubcategory(event.target.value)}
                    className="h-[38px] min-w-[170px] rounded border border-gray-200 bg-white px-3 text-xs font-bold text-gray-700 outline-none transition-colors hover:border-gray-300 focus:border-gray-400 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400"
                    disabled={subcategoryOptions.length === 0}
                  >
                    <option value={ALL_VALUE}>{subcategoryOptions.length > 0 ? 'Todas las subcategorías' : 'Sin subcategorías'}</option>
                    {subcategoryOptions.map(subcategory => (
                      <option key={subcategory} value={subcategory}>{subcategory}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col justify-end mt-2 md:mt-0 md:h-[50px] w-full md:w-auto">
                   <button
                    type="button"
                    onClick={handleFeaturedFilter}
                    className="h-[34px] bg-[#1A1A1A] text-white px-5 rounded text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-black transition-colors md:mt-auto"
                   >
                     <Icon icon="solar:magnifer-linear" />
                     Buscar
                   </button>
                </div>
              </div>
            </motion.div>

            {loading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
                 {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="animate-pulse bg-white rounded-xl h-[340px]"></div>
                ))}
              </div>
            ) : (
              featured.length > 0 ? (
                <motion.div
                  className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6"
                  variants={mayeStagger}
                  initial="initial"
                  animate="animate"
                >
                  {featured.map((p: any) => (
                    <motion.div key={p.id} variants={mayeCard}>
                      <ProductCardMaye
                        producto={p}
                        slug={slug}
                        diseno={diseno}
                        onAddToCart={agregarAlCarrito}
                        onClick={() => goProduct(p)}
                      />
                    </motion.div>
                  ))}
                </motion.div>
              ) : (
                <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-6 py-12 text-center">
                  <Icon icon="solar:box-minimalistic-linear" className="mx-auto mb-3 text-4xl text-gray-300" />
                  <p className="text-sm font-bold text-gray-700">No hay productos para ese filtro</p>
                  <p className="mt-1 text-xs text-gray-400">Prueba con otra categoría o subcategoría.</p>
                </div>
              )
            )}
          </motion.section>
        )}

        {/* Trending Searches Products Area */}
        {productos.length > 0 && (
          <MayeTrendingProducts 
            cp={cp} 
            slug={slug} 
            productos={trendingProducts} 
            diseno={diseno} 
            onAddToCart={agregarAlCarrito} 
          />
        )}

      </main>

      {/* Full width deals section */}
      {dealProducts.length > 0 && (
        <MayeDealsOfTheWeek
          cp={cp}
          slug={slug}
          productos={dealProducts}
          diseno={diseno}
          onAddToCart={agregarAlCarrito}
        />
      )}

      {/* Brands Banner */}
      <MayeBrands cp={cp} slug={slug} diseno={diseno} productos={productos} />

      {/* Top Selling section */}
      {topSellingProducts.length > 0 && (
        <div className="bg-white">
          <MayeTopSelling cp={cp} slug={slug} diseno={diseno} productos={topSellingProducts} />
        </div>
      )}

      <MayeFooter tienda={tienda} slug={slug} diseno={diseno} />

      <AnimatePresence>
      {getBySlug(slug).length > 0 && (
        <motion.div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 pointer-events-auto w-max max-w-[95vw]" variants={mayeFloating} initial="initial" animate="animate" exit="exit">
          <div className="bg-gray-900 text-white rounded-2xl shadow-2xl px-3 sm:px-5 py-2.5 sm:py-3 flex items-center gap-2 sm:gap-4">
            <div className="flex -space-x-2 flex-shrink-0">
              {getBySlug(slug).slice(0, 3).map(item => (
                <div key={item.id} className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border-2 border-gray-800 overflow-hidden bg-white">
                  {item.imagenUrl ? <img src={item.imagenUrl} alt="" className="w-full h-full object-contain" /> : <div className="w-full h-full bg-gray-200" />}
                </div>
              ))}
            </div>
            <span className="text-xs sm:text-sm font-semibold whitespace-nowrap">{getBySlug(slug).length} para comparar</span>
            <motion.button onClick={() => setShowCompareModal(true)} className="px-3 sm:px-4 py-1.5 rounded-xl font-bold text-xs sm:text-sm text-white whitespace-nowrap" style={{ background: cp }} whileHover={{ y: -1, scale: 1.04 }} whileTap={mayeTap}>Ver</motion.button>
            <button onClick={() => clearCompare(slug)} className="text-gray-400 hover:text-white transition-colors flex-shrink-0" aria-label="Limpiar comparación">
              <Icon icon="solar:close-circle-bold" width={16} />
            </button>
          </div>
        </motion.div>
      )}
      </AnimatePresence>

      <AnimatePresence>
      {showCompareModal && (() => {
        const compareItems = getBySlug(slug);
        return (
          <motion.div className="fixed inset-0 z-[998] bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => setShowCompareModal(false)} variants={mayeOverlay} initial="initial" animate="animate" exit="exit">
            <motion.div className="bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl w-full max-w-3xl overflow-auto max-h-[90vh]" onClick={e => e.stopPropagation()} variants={mayeModal}>
              <div className="flex items-center justify-between p-4 sm:p-5 border-b border-gray-100">
                <h3 className="font-black text-gray-900 text-base sm:text-lg">Comparar productos</h3>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => clearCompare(slug)}
                    className="text-xs transition-opacity hover:opacity-80"
                    style={{ color: cp }}
                  >
                    Limpiar
                  </button>
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
                            <button onClick={() => { setShowCompareModal(false); goProduct(item); }} className="text-[11px] font-bold text-white px-3 py-1 rounded-full" style={{ background: cp }}>Ver producto</button>
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
            </motion.div>
          </motion.div>
        );
      })()}
      </AnimatePresence>

      {/* Slide-out Cart */}
      <MayeCartModal
        isOpen={mostrarCarrito}
        onClose={() => setMostrarCarrito(false)}
        carrito={carrito}
        setCarrito={setCarrito}
        actualizarCantidad={actualizarCantidad}
        onCheckout={irACheckout}
        cp={cp}
        tienda={tienda}
      />
    </motion.div>
  );
}
