import { useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Icon } from '@iconify/react';
import type { TemplateCatalogoPageProps } from '@/templates/shared/types';
import TecnologiaCartModal from '@/components/tienda/TecnologiaCartModal';
import ProductCustomizationModal from '@/components/tienda/ProductCustomizationModal';
import { getProductPricing } from '@/templates/shared/pricing';
import { APICULTURA_BANNER, ApiculturaFooter, ApiculturaHeader, ApiculturaProductCard } from './ApiculturaParts';
import { honeyCard, honeyHover, honeyPage, honeySection, honeyStagger, honeyTap, honeyViewport } from './motion';

const honeyPattern = {
  backgroundImage:
    'linear-gradient(30deg, rgba(0,0,0,.045) 12%, transparent 12.5%, transparent 87%, rgba(0,0,0,.045) 87.5%, rgba(0,0,0,.045)), linear-gradient(150deg, rgba(0,0,0,.045) 12%, transparent 12.5%, transparent 87%, rgba(0,0,0,.045) 87.5%, rgba(0,0,0,.045))',
  backgroundSize: '68px 40px',
};

function getName(item: any) {
  return typeof item === 'string' ? item : item?.nombre;
}

function filterCount(products: any[], key: 'categoria' | 'marca', name: string) {
  return products.filter((product) => {
    const value = product?.[key];
    const current = typeof value === 'object' ? value?.nombre : value;
    return String(current || '').toLowerCase() === String(name || '').toLowerCase();
  }).length;
}

function SidebarBox({ title, children }: { title: string; children: ReactNode }) {
  return (
    <motion.div
      variants={honeyCard}
      initial="hidden"
      whileInView="show"
      viewport={honeyViewport}
      className="bg-[#F6F6F6] p-6"
    >
      <div className="mb-5 flex items-center justify-between border-b border-gray-200 pb-4">
        <h3 className="text-xl font-black text-black">{title}</h3>
        <Icon icon="solar:minus-linear" className="text-gray-500" />
      </div>
      {children}
    </motion.div>
  );
}

function ApiculturaProductListItem({
  producto,
  cp,
  onAddToCart,
  onClick,
}: {
  producto: any;
  cp: string;
  onAddToCart?: (producto: any) => void;
  onClick?: () => void;
}) {
  const pricing = getProductPricing(producto);
  const ratingCount = Number(producto?.ratingCount || producto?.totalReviews || producto?.reviewsCount || 0);
  const ratingAvg = Number(producto?.ratingAvg || producto?.ratingPromedio || producto?.promedioRating || 0);
  const stars = Math.max(1, Math.min(5, Math.round(ratingAvg || 5)));
  const img = producto?.imagenUrl || APICULTURA_BANNER;
  const description =
    producto?.descripcionCorta ||
    producto?.resumen ||
    producto?.detalle ||
    producto?.observacion ||
    'Producto disponible en tienda. Consulta disponibilidad y presentación antes de finalizar tu compra.';

  return (
    <motion.article
      variants={honeyCard}
      initial="hidden"
      animate="show"
      exit={{ opacity: 0, y: 12, scale: 0.98, transition: { duration: 0.18 } }}
      whileHover={honeyHover}
      layout
      className="grid gap-6 rounded-md border border-gray-100 bg-white p-5 shadow-sm transition-shadow hover:shadow-xl hover:shadow-yellow-900/10 md:grid-cols-[250px_1fr]"
    >
      <button type="button" onClick={onClick} className="relative overflow-hidden rounded bg-white">
        {pricing.enOferta && (
          <span className="absolute left-4 top-4 z-10 flex h-12 w-12 items-center justify-center rounded-full bg-black text-xs font-black text-white">
            -{pricing.porcentajeDescuento}%
          </span>
        )}
        <img src={img} alt={producto?.descripcion || 'Producto'} className="aspect-square w-full object-contain p-7 transition-transform duration-500 hover:scale-105" />
      </button>
      <div className="flex min-w-0 flex-col justify-center py-2">
        <button type="button" onClick={onClick} className="text-left">
          <h3 className="text-xl font-black leading-snug text-black md:text-2xl">{producto?.descripcion}</h3>
        </button>
        <div className="mt-3 flex min-h-[22px] items-center gap-2 text-sm">
          {ratingCount > 0 ? (
            <>
              <span className="tracking-wide text-amber-400">{'★'.repeat(stars)}{'☆'.repeat(5 - stars)}</span>
              <span className="text-xs font-semibold text-gray-400">({ratingCount} reseñas)</span>
            </>
          ) : (
            <span className="text-xs font-semibold text-gray-400">Sin reseñas</span>
          )}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {pricing.enOferta && <span className="text-base font-bold text-gray-400 line-through">S/ {pricing.precioRegular.toFixed(2)}</span>}
          <span className="text-2xl font-black text-black">S/ {pricing.precioFinal.toFixed(2)}</span>
        </div>
        <p className="mt-3 line-clamp-3 max-w-3xl text-sm font-semibold leading-6 text-gray-500">{description}</p>
        <div className="mt-5">
          <motion.button
            type="button"
            onClick={() => onAddToCart?.({ ...producto, precioUnitario: pricing.precioFinal, precioRegular: pricing.precioRegular, enOferta: pricing.enOferta })}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-full px-8 text-xs font-black uppercase tracking-wide text-black transition-transform hover:scale-[1.03]"
            style={{ backgroundColor: cp }}
            whileHover={{ scale: 1.04 }}
            whileTap={honeyTap}
          >
            <Icon icon="solar:cart-large-2-bold" width={18} />
            Agregar al carrito
          </motion.button>
        </div>
      </div>
    </motion.article>
  );
}

export default function ApiculturaCatalogoPage({
  tienda,
  slug,
  diseno,
  cp,
  navigate,
  productos,
  sortedProductos,
  loading,
  total,
  page,
  cargarProductos,
  allCategorías,
  allMarcas,
  filteredMarcas,
  selectedCategorías,
  setSelectedCategorías,
  selectedMarcas,
  setSelectedMarcas,
  priceRange,
  setPriceRange,
  minPrice,
  maxPrice,
  sortBy,
  setSortBy,
  hasActiveFilters,
  toggleCategory,
  toggleBrand,
  search,
  setSearch,
  carrito,
  setCarrito,
  mostrarCarrito,
  setMostrarCarrito,
  actualizarCantidad,
  irACheckout,
  handleAgregarProducto,
  agregarAlCarritoDirecto,
  showPersonalizarModal,
  setShowPersonalizarModal,
  productoAPersonalizar,
  setProductoAPersonalizar,
  modificadoresProducto,
}: TemplateCatalogoPageProps) {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const clearFilters = () => {
    setSelectedCategorías([]);
    setSelectedMarcas([]);
    setPriceRange([minPrice, maxPrice]);
    setSearch('');
  };

  const categoryList = allCategorías.filter(getName);
  const brandList = filteredMarcas.filter(getName);
  const totalLabel = total || sortedProductos.length;

  return (
    <motion.div initial="hidden" animate="show" variants={honeyPage} className="min-h-screen bg-white" style={{ fontFamily: `'${diseno?.tipografia || 'Inter'}', sans-serif` }}>
      <ApiculturaHeader
        tienda={tienda}
        slug={slug}
        cp={cp}
        diseno={diseno}
        carritoSize={carrito.reduce((sum, item) => sum + Number(item.cantidad || 1), 0)}
        onOpenCart={() => setMostrarCarrito(true)}
        searchQuery={search}
        setSearchQuery={setSearch}
        allCategories={allCategorías}
        onSearchSubmit={(event, value) => {
          event.preventDefault();
          setSearch(value || '');
          setSelectedCategorías([]);
          setSelectedMarcas([]);
        }}
      />

      <motion.section variants={honeySection} className="bg-[#FFD72E] px-5 pb-14 pt-7 text-center" style={honeyPattern}>
        <div className="mx-auto max-w-7xl">
          <div className="text-sm font-black text-black/70">
            <button type="button" onClick={() => navigate(`/tienda/${slug}`)} className="hover:text-black">Inicio</button>
            <span className="mx-1">/</span>
            <span>Tienda</span>
          </div>
          <h1 className="mt-3 text-4xl font-black text-black md:text-5xl">Catálogo</h1>
        </div>
      </motion.section>

      <motion.main variants={honeySection} className="mx-auto max-w-7xl px-5 py-12">
        <div className="grid gap-8 lg:grid-cols-[300px_1fr]">
          <aside className="space-y-7 lg:sticky lg:top-24 lg:h-fit">
            {categoryList.length > 0 && (
              <SidebarBox title="Categorías">
                <div className="space-y-4">
                  {categoryList.slice(0, 9).map((cat: any, index: number) => {
                    const name = getName(cat);
                    const checked = selectedCategorías.includes(name);
                    const count = Number(cat?.productosCount || cat?.count || filterCount(productos, 'categoria', name));
                    return (
                      <label key={`${name}-${index}`} className="flex cursor-pointer items-center gap-3 text-sm font-bold text-gray-500">
                        <span className="flex h-4 w-4 items-center justify-center border border-gray-200 bg-white">
                          {checked && <Icon icon="mdi:check" width={12} className="text-black" />}
                        </span>
                        <input type="checkbox" checked={checked} onChange={() => toggleCategory(name)} className="hidden" />
                        <span>{name}{count > 0 ? ` (${count})` : ''}</span>
                      </label>
                    );
                  })}
                </div>
              </SidebarBox>
            )}

            <SidebarBox title="Destacados">
              <div className="space-y-4 text-sm font-bold">
                <button type="button" onClick={clearFilters} className="block text-left" style={{ color: cp }}>Todos los productos</button>
                <button type="button" onClick={() => setSortBy('relevance')} className="block text-left text-gray-500 hover:text-black">Más vendidos</button>
                <button type="button" onClick={() => setSortBy('name-asc')} className="block text-left text-gray-500 hover:text-black">Novedades</button>
                <button type="button" onClick={() => setSearch('oferta')} className="block text-left text-gray-500 hover:text-black">Ofertas</button>
                <button type="button" onClick={() => setSearch('hot')} className="block text-left text-gray-500 hover:text-black">Populares</button>
              </div>
            </SidebarBox>

            <SidebarBox title="Filtrar por color">
              <div className="flex gap-3">
                {['#B45309', '#8A8A00', '#F5B01D'].map((color) => (
                  <span key={color} className="h-8 w-8 rounded-full border border-black/10" style={{ backgroundColor: color }} />
                ))}
              </div>
            </SidebarBox>

            <SidebarBox title="Filtrar por peso">
              <div className="flex flex-wrap gap-2">
                {['250g', '500g', '750g', '1kg', '2kg'].map((weight) => (
                  <button key={weight} type="button" onClick={() => setSearch(weight)} className="rounded border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-500 hover:text-black">
                    {weight}
                  </button>
                ))}
              </div>
            </SidebarBox>

            {brandList.length > 0 && (
              <SidebarBox title="Marcas">
                <div className="space-y-4">
                  {brandList.slice(0, 8).map((brand: any, index: number) => {
                    const name = getName(brand);
                    const checked = selectedMarcas.includes(name);
                    const count = Number(brand?.productosCount || brand?.count || filterCount(productos, 'marca', name));
                    return (
                      <label key={`${name}-${index}`} className="flex cursor-pointer items-center gap-3 text-sm font-bold text-gray-500">
                        <span className="flex h-4 w-4 items-center justify-center border border-gray-200 bg-white">
                          {checked && <Icon icon="mdi:check" width={12} className="text-black" />}
                        </span>
                        <input type="checkbox" checked={checked} onChange={() => toggleBrand(name)} className="hidden" />
                        <span>{name}{count > 0 ? ` (${count})` : ''}</span>
                      </label>
                    );
                  })}
                </div>
              </SidebarBox>
            )}

            <SidebarBox title="Precio">
              <div className="mb-3 flex items-center justify-between text-xs font-black text-gray-500">
                <span>S/ {priceRange[0]}</span>
                <span>S/ {maxPrice}</span>
              </div>
              <input
                type="range"
                min={minPrice}
                max={maxPrice}
                value={priceRange[0]}
                onChange={(event) => setPriceRange([Number(event.target.value), priceRange[1]])}
                className="w-full"
                style={{ accentColor: cp }}
              />
              {hasActiveFilters && (
                <button type="button" onClick={clearFilters} className="mt-5 rounded-full bg-black px-5 py-2.5 text-xs font-black uppercase tracking-wide text-white">
                  Limpiar filtros
                </button>
              )}
            </SidebarBox>
          </aside>

          <section className="min-w-0">
            <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-center">
              <p className="text-sm font-bold text-gray-500">
                Mostrando <span className="text-black">1-{sortedProductos.length}</span> de <span className="text-black">{totalLabel}</span> resultados
              </p>
              <div className="flex items-center gap-3">
                <select value={sortBy} onChange={(event) => setSortBy(event.target.value)} className="h-11 min-w-[190px] rounded border border-gray-100 bg-white px-4 text-sm font-bold text-gray-500 outline-none">
                  <option value="relevance">Orden predeterminado</option>
                  <option value="price-asc">Precio: menor a mayor</option>
                  <option value="price-desc">Precio: mayor a menor</option>
                  <option value="name-asc">Nombre A-Z</option>
                </select>
                <button
                  type="button"
                  onClick={() => setViewMode('grid')}
                  aria-label="Vista en grilla"
                  className={`flex h-10 w-10 items-center justify-center rounded transition-colors ${viewMode === 'grid' ? 'text-black' : 'bg-gray-100 text-gray-400 hover:text-black'}`}
                  style={viewMode === 'grid' ? { backgroundColor: cp } : undefined}
                >
                  <Icon icon="solar:widget-4-bold" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  aria-label="Vista en lista"
                  className={`hidden h-10 w-10 items-center justify-center rounded transition-colors md:flex ${viewMode === 'list' ? 'text-black' : 'bg-gray-100 text-gray-400 hover:text-black'}`}
                  style={viewMode === 'list' ? { backgroundColor: cp } : undefined}
                >
                  <Icon icon="solar:list-bold" />
                </button>
              </div>
            </div>

            {loading ? (
              viewMode === 'grid' ? (
                <div className="grid gap-7 sm:grid-cols-2 xl:grid-cols-3">
                  {Array.from({ length: 9 }).map((_, index) => <div key={index} className="h-[430px] animate-pulse rounded bg-gray-50" />)}
                </div>
              ) : (
                <div className="space-y-7">
                  {Array.from({ length: 4 }).map((_, index) => <div key={index} className="h-[270px] animate-pulse rounded bg-gray-50" />)}
                </div>
              )
            ) : sortedProductos.length === 0 ? (
              <motion.div variants={honeyCard} initial="hidden" animate="show" className="bg-[#F6F6F6] p-16 text-center">
                <Icon icon="solar:box-minimalistic-broken" className="mx-auto mb-4 text-6xl text-yellow-300" />
                <h3 className="text-xl font-black text-black">No encontramos productos</h3>
                <p className="mt-2 text-sm font-semibold text-gray-500">Prueba con otra categoría o limpia los filtros.</p>
                <button type="button" onClick={clearFilters} className="mt-6 rounded-full bg-black px-6 py-3 text-xs font-black uppercase tracking-wide text-white">Limpiar filtros</button>
              </motion.div>
            ) : (
              <>
                <AnimatePresence mode="wait">
                  {viewMode === 'grid' ? (
                    <motion.div
                      key="grid"
                      variants={honeyStagger}
                      initial="hidden"
                      animate="show"
                      exit={{ opacity: 0, y: 12, transition: { duration: 0.18 } }}
                      className="grid gap-7 sm:grid-cols-2 xl:grid-cols-3"
                    >
                      {sortedProductos.map((producto) => (
                        <ApiculturaProductCard
                          key={producto.id}
                          producto={producto}
                          slug={slug}
                          cp={cp}
                          onAddToCart={handleAgregarProducto}
                          onClick={() => navigate(`/tienda/${slug}/producto/${producto.id}`)}
                        />
                      ))}
                    </motion.div>
                  ) : (
                    <motion.div
                      key="list"
                      variants={honeyStagger}
                      initial="hidden"
                      animate="show"
                      exit={{ opacity: 0, y: 12, transition: { duration: 0.18 } }}
                      className="space-y-7"
                    >
                      {sortedProductos.map((producto) => (
                        <ApiculturaProductListItem
                          key={producto.id}
                          producto={producto}
                          cp={cp}
                          onAddToCart={handleAgregarProducto}
                          onClick={() => navigate(`/tienda/${slug}/producto/${producto.id}`)}
                        />
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
                {productos.length < total && (
                  <div className="mt-12 flex justify-center">
                    <button type="button" onClick={() => cargarProductos(page + 1)} className="rounded-full bg-black px-8 py-4 text-xs font-black uppercase tracking-wide text-white">
                      Cargar más
                    </button>
                  </div>
                )}
              </>
            )}
          </section>
        </div>
      </motion.main>

      <ApiculturaFooter tienda={tienda} slug={slug} diseno={diseno} cp={cp} categories={allCategorías} />
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
      {showPersonalizarModal && productoAPersonalizar && (
        <ProductCustomizationModal
          isOpen={showPersonalizarModal}
          onClose={() => { setShowPersonalizarModal(false); setProductoAPersonalizar(null); }}
          product={productoAPersonalizar}
          modifiers={modificadoresProducto}
          onConfirm={(producto, mods) => {
            agregarAlCarritoDirecto(producto, mods);
            setShowPersonalizarModal(false);
            setProductoAPersonalizar(null);
          }}
        />
      )}
    </motion.div>
  );
}
