/**
 * MayeCatalogoPage
 * Catálogo profesional para rubro tecnología.
 */
import { Icon } from '@iconify/react';
import { AnimatePresence, motion } from 'framer-motion';
import MayeHeader from '@/components/tienda/MayeHeader';
import MayeFooter from '@/components/tienda/MayeFooter';
import MayeCartModal from '@/components/tienda/MayeCartModal';
import ProductCardMaye from '@/components/tienda/ProductCardMaye';
import ProductCustomizationModal from '@/components/tienda/ProductCustomizationModal';
import type { TemplateCatalogoPageProps } from '@/templates/shared/types';
import { mayeCard, mayeModal, mayeOverlay, mayePage, mayeSection, mayeStagger, mayeTap } from '@/lib/motion/maye';

export default function MayeCatalogoPage({
  tienda, slug, diseno, cp, navigate,
  productos, sortedProductos, loading, total, page, cargarProductos,
  allCategorías, allMarcas, filteredMarcas,
  selectedCategorías, setSelectedCategorías, selectedMarcas, setSelectedMarcas,
  priceRange, setPriceRange, minPrice, maxPrice,
  sortBy, setSortBy, hasActiveFilters,
  toggleCategory, toggleBrand,
  search, setSearch,
  carrito, setCarrito, mostrarCarrito, setMostrarCarrito,
  actualizarCantidad, irACheckout, handleAgregarProducto, agregarAlCarritoDirecto,
  showMobileFilters, setShowMobileFilters,
  showPersonalizarModal, setShowPersonalizarModal,
  productoAPersonalizar, setProductoAPersonalizar, modificadoresProducto,
}: TemplateCatalogoPageProps) {
  const clearFilters = () => {
    setSearch('');
    setSelectedMarcas([]);
    setSelectedCategorías([]);
    setPriceRange([minPrice, maxPrice]);
  };

  const activeLabel = selectedCategorías[0] || selectedMarcas[0] || search;
  const stockCount = sortedProductos.filter((p: any) => Number(p.stock ?? 0) > 0).length;
  const offerCount = sortedProductos.filter((p: any) => Boolean(p.enOferta) || Number(p.precioOferta || 0) > 0).length;

  const FilterSidebar = ({ mobile = false }: { mobile?: boolean }) => (
    <aside className={`${mobile ? 'block w-full' : 'hidden lg:block w-72 flex-shrink-0 sticky top-24'} h-fit`}>
      <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <div className="mb-5 flex items-center justify-between border-b border-gray-100 pb-4">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.22em]" style={{ color: cp }}>Filtros</p>
            <h3 className="text-lg font-black text-gray-950">Refina tu setup</h3>
          </div>
          {mobile && (
            <button onClick={() => setShowMobileFilters(false)} className="rounded-full bg-gray-100 p-2 text-gray-500">
              <Icon icon="solar:close-circle-bold" width={20} />
            </button>
          )}
        </div>

        {allCategorías.length > 0 && (
          <div className="mb-6">
            <p className="mb-3 text-xs font-black uppercase tracking-wider text-gray-400">Categorías</p>
            <div className="space-y-2.5">
              {allCategorías.map((cat: any, i: number) => {
                const name = typeof cat === 'string' ? cat : cat.nombre;
                const checked = selectedCategorías.includes(name);
                return (
                  <label key={`${name}-${i}`} className="group flex cursor-pointer items-center gap-3 rounded-xl px-2 py-1.5 hover:bg-gray-50">
                    <span className={`flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border transition-colors ${checked ? 'border-transparent text-white' : 'border-gray-300 bg-white'}`} style={checked ? { backgroundColor: cp } : undefined}>
                      {checked && <Icon icon="mdi:check" width={12} />}
                    </span>
                    <input type="checkbox" checked={checked} onChange={() => toggleCategory(name)} className="hidden" />
                    <span className={`text-sm ${checked ? 'font-black text-gray-950' : 'font-semibold text-gray-500 group-hover:text-gray-900'}`}>{name}</span>
                  </label>
                );
              })}
            </div>
          </div>
        )}

        {allMarcas.length > 0 && (
          <div className="mb-6">
            <p className="mb-3 text-xs font-black uppercase tracking-wider text-gray-400">Marcas</p>
            <div className="max-h-56 space-y-2.5 overflow-y-auto pr-1">
              {filteredMarcas.map((brand: any, i: number) => {
                const name = typeof brand === 'string' ? brand : brand.nombre;
                const checked = selectedMarcas.includes(name);
                return (
                  <label key={`${name}-${i}`} className="group flex cursor-pointer items-center gap-3 rounded-xl px-2 py-1.5 hover:bg-gray-50">
                    <span className={`flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border transition-colors ${checked ? 'border-transparent text-white' : 'border-gray-300 bg-white'}`} style={checked ? { backgroundColor: cp } : undefined}>
                      {checked && <Icon icon="mdi:check" width={12} />}
                    </span>
                    <input type="checkbox" checked={checked} onChange={() => toggleBrand(name)} className="hidden" />
                    <span className={`text-sm ${checked ? 'font-black text-gray-950' : 'font-semibold text-gray-500 group-hover:text-gray-900'}`}>{name}</span>
                  </label>
                );
              })}
            </div>
          </div>
        )}

        <div className="rounded-2xl bg-gray-50 p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs font-black uppercase tracking-wider text-gray-400">Precio mínimo</p>
            <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-gray-950 shadow-sm">S/ {priceRange[0]}</span>
          </div>
          <input
            type="range"
            min={minPrice}
            max={maxPrice}
            value={priceRange[0]}
            onChange={e => setPriceRange([Number(e.target.value), priceRange[1]])}
            className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-gray-200"
            style={{ accentColor: cp }}
          />
          <div className="mt-2 flex justify-between text-[10px] font-bold text-gray-400">
            <span>S/ {minPrice}</span>
            <span>S/ {maxPrice}</span>
          </div>
        </div>

        {hasActiveFilters && (
          <button onClick={clearFilters} className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-gray-950 px-4 py-3 text-xs font-black uppercase tracking-wider text-white transition-transform hover:scale-[1.01]">
            <Icon icon="solar:restart-bold" width={16} />
            Limpiar filtros
          </button>
        )}
      </div>
    </aside>
  );

  return (
    <motion.div className="min-h-screen bg-[#FAF5F5]" style={{ fontFamily: `'${diseno.tipografia || 'Inter'}', sans-serif` }} variants={mayePage} initial="initial" animate="animate" exit="exit">
      <MayeHeader
        tienda={tienda || {}}
        slug={slug || ''}
        cp={cp}
        carritoSize={carrito.length}
        onOpenCart={() => setMostrarCarrito(!mostrarCarrito)}
        searchQuery={search}
        setSearchQuery={setSearch}
        onSearchSubmit={(e: any, value: string) => {
          e.preventDefault();
          setSearch(value);
          setSelectedCategorías([]);
          setSelectedMarcas([]);
          setPriceRange([minPrice, maxPrice]);
        }}
        onCategorySelect={(name: string) => {
          setSearch('');
          setSelectedCategorías([name]);
          setSelectedMarcas([]);
          setPriceRange([minPrice, maxPrice]);
        }}
        allCategories={allCategorías}
        diseno={diseno}
      />

      <main className="w-full max-w-7xl mx-auto px-4 xl:px-8 py-8 md:py-10">
        <motion.section className="relative mb-8 overflow-hidden rounded-3xl bg-[#101010] px-6 py-8 text-white md:px-10 md:py-10" variants={mayeSection}>
          <div className="absolute inset-0 opacity-70">
            <img src={diseno?.mayeCatalogBannerUrl || '/assets/templates/maye/catalogo.png'} alt="" className="h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/60 to-black/20" />
          </div>
          <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <div className="mb-3 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: cp }} />
                <span className="text-xs font-black uppercase tracking-[0.24em]" style={{ color: cp }}>Catálogo tech</span>
              </div>
              <h1 className="text-3xl font-black tracking-tight md:text-5xl">Equipos, componentes y accesorios de alto rendimiento</h1>
              <p className="mt-3 max-w-xl text-sm leading-relaxed text-gray-300">
                Encuentra laptops, PCs, periféricos y repuestos con stock real, marcas verificadas y atención especializada.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-3 rounded-2xl border border-white/10 bg-white/10 p-3 backdrop-blur">
              <div className="text-center">
                <p className="text-2xl font-black">{total}</p>
                <p className="text-[10px] font-bold uppercase text-gray-300">Productos</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-black">{stockCount}</p>
                <p className="text-[10px] font-bold uppercase text-gray-300">En stock</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-black">{offerCount}</p>
                <p className="text-[10px] font-bold uppercase text-gray-300">Ofertas</p>
              </div>
            </div>
          </div>
        </motion.section>

        <motion.div className="mb-6 flex flex-col gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm md:flex-row md:items-center md:justify-between" variants={mayeCard}>
          <div>
            <p className="text-sm text-gray-500">
              Mostrando <span className="font-black text-gray-950">{sortedProductos.length}</span> de {total} resultados
              {activeLabel && <span> para <span className="font-black text-gray-950">"{activeLabel}"</span></span>}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {selectedCategorías.map((item: string) => <span key={item} className="rounded-full bg-gray-100 px-3 py-1 text-[11px] font-black text-gray-600">{item}</span>)}
              {selectedMarcas.map((item: string) => <span key={item} className="rounded-full bg-gray-100 px-3 py-1 text-[11px] font-black text-gray-600">{item}</span>)}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button onClick={() => setShowMobileFilters(true)} className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-black text-gray-700 lg:hidden">
              <Icon icon="solar:filter-bold" width={18} />
              Filtros
            </button>
            <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-black text-gray-700 outline-none focus:border-gray-400">
              <option value="relevance">Relevancia</option>
              <option value="price-asc">Precio menor</option>
              <option value="price-desc">Precio mayor</option>
              <option value="name-asc">Nombre A-Z</option>
            </select>
          </div>
        </motion.div>

        <motion.div className="flex items-start gap-6" variants={mayeSection} initial="initial" animate="animate">
          <FilterSidebar />

          <div className="min-w-0 flex-1">
            {loading ? (
              <div className="grid grid-cols-2 gap-4 md:gap-6 lg:grid-cols-3 xl:grid-cols-4">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div key={i} className="h-[340px] animate-pulse rounded-xl border border-gray-100 bg-white" />
                ))}
              </div>
            ) : sortedProductos.length === 0 ? (
              <div className="rounded-3xl border border-gray-100 bg-white p-12 text-center shadow-sm md:p-16">
                <Icon icon="solar:laptop-minimalistic-broken" className="mx-auto mb-4 text-6xl text-gray-300" />
                <h3 className="mb-2 text-xl font-black text-gray-950">No encontramos equipos con esos filtros</h3>
                <p className="mb-6 text-sm text-gray-500">Prueba otra categoría, marca o rango de precio.</p>
                <button onClick={clearFilters} className="rounded-xl px-6 py-3 text-sm font-black text-white" style={{ backgroundColor: cp }}>
                  Ver todo el catálogo
                </button>
              </div>
            ) : (
              <>
                <motion.div className="grid grid-cols-2 gap-4 md:gap-6 lg:grid-cols-3 xl:grid-cols-4" variants={mayeStagger} initial="initial" animate="animate">
                  {sortedProductos.map((producto: any) => (
                    <ProductCardMaye
                      key={producto.id}
                      producto={producto}
                      slug={slug || ''}
                      diseno={diseno}
                      onAddToCart={() => handleAgregarProducto(producto)}
                      onClick={() => navigate(`/tienda/${slug}/producto/${producto.id}`)}
                    />
                  ))}
                </motion.div>

                {productos.length < total && (
                  <div className="mt-12 flex justify-center">
                    <motion.button onClick={() => cargarProductos(page + 1)} className="rounded-xl px-8 py-3.5 text-sm font-black text-white shadow-lg transition-transform hover:scale-[1.02]" style={{ backgroundColor: cp }} whileHover={{ y: -2, scale: 1.04 }} whileTap={mayeTap}>
                      Cargar más productos
                    </motion.button>
                  </div>
                )}
              </>
            )}
          </div>
        </motion.div>
      </main>

      <AnimatePresence>
      {showMobileFilters && (
        <motion.div className="fixed inset-0 z-[999] bg-black/50 p-4 lg:hidden" onClick={() => setShowMobileFilters(false)} variants={mayeOverlay} initial="initial" animate="animate" exit="exit">
          <motion.div onClick={e => e.stopPropagation()} className="max-h-[92vh] overflow-y-auto rounded-3xl" variants={mayeModal}>
            <FilterSidebar mobile />
          </motion.div>
        </motion.div>
      )}
      </AnimatePresence>

      <MayeFooter tienda={tienda || {}} slug={slug || ''} diseno={diseno} />

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

      {showPersonalizarModal && productoAPersonalizar && (
        <ProductCustomizationModal
          isOpen={showPersonalizarModal}
          onClose={() => { setShowPersonalizarModal(false); setProductoAPersonalizar(null); }}
          product={productoAPersonalizar}
          modifiers={modificadoresProducto}
          onConfirm={(producto, mods) => { agregarAlCarritoDirecto(producto, mods); setShowPersonalizarModal(false); setProductoAPersonalizar(null); }}
        />
      )}
    </motion.div>
  );
}
