import { Icon } from '@iconify/react';
import { AnimatePresence, motion } from 'framer-motion';
import type { ReactNode } from 'react';
import type { TemplateCatalogoPageProps } from '@/templates/shared/types';
import ProductCustomizationModal from '@/components/tienda/ProductCustomizationModal';
import { getProductPricing } from '@/templates/shared/pricing';
import HammerCatalogCard from './HammerCatalogCard';
import { ConstruccionFooter } from './ConstruccionHomePage';
import ConstruccionCartModal from './ConstruccionCartModal';

const getName = (item: any) => (typeof item === 'string' ? item : item?.nombre || item?.name || '');
const fmt = (value: number) => `S/ ${Number(value || 0).toFixed(2)}`;
const editable = (value: any, fallback: string) => String(value || '').trim() || fallback;

function HammerLogo({ storeName, subtitle = 'Herramientas y accesorios', accent = '#ffb400' }: { storeName: string; subtitle?: string; accent?: string }) {
  const label = storeName?.trim() ? storeName.trim().split(/\s+/)[0] : 'HAMMER';
  const clean = label.replace(/[^a-zA-Z0-9]/g, '') || 'HAMMER';
  const start = clean.slice(0, Math.max(2, clean.length - 3)).toUpperCase();
  const end = clean.slice(Math.max(2, clean.length - 3)).toUpperCase();

  return (
    <div className="leading-none">
      <div className="flex items-end text-[30px] font-black uppercase tracking-[0.08em] text-white md:text-[36px]">
        <span>{start}</span>
        <span style={{ color: accent }}>{end}</span>
      </div>
      <p className="mt-1 text-[13px] font-semibold tracking-wide text-white/35">{subtitle}</p>
    </div>
  );
}

function HammerHeader({ tienda, slug, cp, carritoSize, search, setSearch, onOpenCart, navigate, allCategories, diseno }: any) {
  const storeName = tienda?.nombreComercial || tienda?.nombre || tienda?.razonSocial || 'HAMMER';
  const firstCategory = allCategories?.map(getName).filter(Boolean)[0] || 'Nuestra tienda';

  return (
    <header className="bg-[#111111] text-white">
      <div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-6 lg:flex-row lg:items-center lg:px-6">
        <button type="button" onClick={() => navigate(`/tienda/${slug}`)} className="text-left">
          <HammerLogo storeName={storeName} subtitle={editable(diseno?.construccionLogoSubtitle, 'Herramientas y accesorios')} accent={cp} />
        </button>
        <form
          className="flex min-h-[48px] flex-1 overflow-hidden rounded-md bg-white text-[13px] text-[#111] shadow-xl lg:mx-10"
          onSubmit={(event) => {
            event.preventDefault();
            navigate(`/tienda/${slug}/catalogo?search=${encodeURIComponent(search)}`);
          }}
        >
          <button type="button" className="hidden min-w-[190px] items-center justify-between border-r border-gray-200 px-5 text-[13px] font-bold text-gray-500 md:flex">
            {firstCategory}
            <Icon icon="solar:alt-arrow-down-linear" width={18} />
          </button>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={editable(diseno?.construccionSearchPlaceholder, 'Buscar...')}
            className="min-w-0 flex-1 px-5 text-[13px] font-semibold text-gray-700 outline-none"
          />
          <button type="submit" className="px-4 text-[13px] font-black text-[#111] sm:px-7" style={{ background: cp }}>
            Buscar
          </button>
        </form>
        <div className="hidden items-center gap-8 lg:flex">
          <div className="flex items-center gap-3">
            <span className="flex h-14 w-14 items-center justify-center rounded-md bg-white/10">
              <Icon icon="solar:phone-calling-bold" width={28} />
            </span>
            <div>
              <p className="text-[13px] font-black text-white/80">{editable(diseno?.construccionCallLabel, 'Llámanos:')}</p>
              <p className="text-[13px] font-black" style={{ color: cp }}>{tienda?.whatsappTienda || tienda?.telefono || '(+51) 999-999-999'}</p>
            </div>
          </div>
          <Icon icon="solar:user-linear" width={30} className="text-white" />
        </div>
      </div>
      <div style={{ background: cp }}>
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 lg:px-6">
          <button type="button" onClick={() => navigate(`/tienda/${slug}/catalogo`)} className="inline-flex h-12 min-w-0 flex-1 items-center gap-3 rounded-md bg-white px-4 text-[13px] font-black text-[#151515] shadow-sm sm:flex-none sm:px-5 sm:text-[14px] md:min-w-[230px]">
            <Icon icon="solar:hamburger-menu-linear" width={28} />
            {editable(diseno?.construccionHeaderCategoryLabel, 'Comprar por categorías')}
          </button>
          <nav className="hidden flex-1 items-center justify-center gap-8 text-[14px] font-black text-[#151515] lg:flex">
            <button type="button" onClick={() => navigate(`/tienda/${slug}`)}>{editable(diseno?.construccionNavHome, 'Inicio')}</button>
            <button type="button" onClick={() => navigate(`/tienda/${slug}/catalogo`)} className="inline-flex items-center gap-1">{editable(diseno?.construccionNavStore, 'Tienda')} <Icon icon="solar:alt-arrow-down-linear" /></button>
            <button type="button" onClick={() => navigate(`/tienda/${slug}/catalogo`)} className="inline-flex items-center gap-2">
              {editable(diseno?.construccionNavCategories, 'Categorías')} <span className="rounded px-1.5 py-0.5 text-[10px] font-black text-white" style={{ background: '#13a084' }}>OFERTA</span>
            </button>
            <button type="button" onClick={() => navigate(`/tienda/${slug}/catalogo`)} className="inline-flex items-center gap-2">
              {editable(diseno?.construccionNavProducts, 'Productos')} <span className="rounded px-1.5 py-0.5 text-[10px] font-black text-white" style={{ background: '#e93473' }}>TOP</span>
            </button>
            <button type="button" onClick={() => navigate(`/tienda/${slug}/catalogo`)}>{editable(diseno?.construccionNavOffers, 'Ofertas destacadas')}</button>
            <button type="button" onClick={() => navigate(`/tienda/${slug}/catalogo`)}>{editable(diseno?.construccionNavCatalog, 'Catálogo')}</button>
          </nav>
          <button type="button" onClick={onOpenCart} className="inline-flex items-center gap-2 text-[14px] font-black text-[#151515]">
            <Icon icon="solar:cart-large-2-linear" width={34} />
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-xs">{carritoSize}</span>
            <span className="hidden sm:inline">{editable(diseno?.construccionCartLabel, 'Mi carrito')}</span>
          </button>
        </div>
      </div>
    </header>
  );
}

function renderStars(rating: number) {
  return (
    <div className="flex text-[#ff9d00]">
      {Array.from({ length: 5 }).map((_, index) => (
        <Icon key={index} icon={index < Math.round(rating || 5) ? 'solar:star-bold' : 'solar:star-linear'} width={17} />
      ))}
    </div>
  );
}

function Countdown({ seed }: { seed: number }) {
  const days = 80 + (seed % 70);
  return (
    <div className="flex gap-1.5">
      {[
        [days, 'DAYS'],
        [String((seed * 3) % 24).padStart(2, '0'), 'HRS'],
        [String((seed * 7) % 60).padStart(2, '0'), 'MIN'],
        [String((seed * 11) % 60).padStart(2, '0'), 'SEC'],
      ].map(([value, label]) => (
        <span key={label} className="rounded-md bg-red-50 px-2 py-1 text-center text-[11px] font-black leading-tight text-red-500">
          {value}<br />{label}
        </span>
      ))}
    </div>
  );
}

function FilterBox({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-md border border-gray-200 bg-white p-2">
      <div className="flex items-center justify-between rounded bg-gray-50 px-4 py-3">
        <h3 className="text-[18px] font-black text-[#151515]">{title}</h3>
        <span className="text-xl font-black">-</span>
      </div>
      <div className="px-4 py-4">{children}</div>
    </section>
  );
}

function FilterPanel({
  allCategorías,
  selectedCategorías,
  toggleCategory,
  priceRange,
  setPriceRange,
  minPrice,
  maxPrice,
  cp,
  hasActiveFilters,
  clear,
  diseno,
}: any) {
  const categories = ['Nuestra tienda', ...allCategorías.map(getName).filter(Boolean)].slice(0, 7);
  const activeFirst = selectedCategorías.length === 0;

  return (
    <div className="space-y-6">
      <FilterBox title={editable(diseno?.construccionFilterCategoriesTitle, 'Comprar por categorías')}>
        <div className="space-y-3">
          {categories.map((name: string, index: number) => {
            const active = index === 0 ? activeFirst : selectedCategorías.includes(name);
            return (
              <button
                key={`${name}-${index}`}
                type="button"
                onClick={() => index === 0 ? clear() : toggleCategory(name)}
                className="flex w-full items-center gap-4 text-left text-[15px] font-black text-gray-500 transition-colors"
                style={active ? { color: cp } : undefined}
              >
                <span className="flex h-4 w-4 items-center justify-center border border-gray-200 bg-white text-[#111]">
                  {active && <Icon icon="solar:check-linear" width={18} />}
                </span>
                {name}
              </button>
            );
          })}
        </div>
      </FilterBox>

      <FilterBox title={editable(diseno?.construccionFilterHighlightsTitle, 'Destacados')}>
        <div className="space-y-3 text-[15px] font-black text-gray-500">
          {['Todos los productos', 'Más vendidos', 'Novedades', 'Ofertas', 'Productos top'].map((item, index) => (
            <button key={item} type="button" onClick={index === 0 ? clear : undefined} className="block transition-colors hover:text-[#111]" style={index === 0 ? { color: cp } : undefined}>
              {item}
            </button>
          ))}
        </div>
      </FilterBox>

      <FilterBox title="Filtrar por color">
        <div className="flex flex-wrap gap-3">
          {['#000000', '#2677ba', '#777777', '#e03131', '#858585', '#f1f219'].map((color) => (
            <button key={color} type="button" className="h-8 w-8 rounded border border-gray-200" style={{ background: color }} aria-label={color} />
          ))}
        </div>
      </FilterBox>

      <FilterBox title="Filtrar por medida">
        <div className="flex flex-wrap gap-2">
          {['225/65R17', '235/55R17', 'D1S D1R D1C', 'D3S D3R D3C', 'D5S', 'DC12V'].map((size) => (
            <button key={size} type="button" className="rounded-md border border-gray-200 px-3 py-2 text-[13px] font-black text-gray-500">
              {size}
            </button>
          ))}
        </div>
      </FilterBox>

      <FilterBox title={editable(diseno?.construccionFilterPriceTitle, 'Filtrar por precio')}>
        <div className="space-y-3 text-[15px] font-black text-gray-500">
          <button type="button" onClick={clear} className="block" style={{ color: cp }}>Todos</button>
          {['$0-$100', '$100-$200', '$200-$300', '$300-$400', '$400-$500'].map((range) => (
            <button key={range} type="button" className="block transition-colors hover:text-[#111]">{range}</button>
          ))}
        </div>
        <input
          type="range"
          min={minPrice}
          max={maxPrice}
          value={priceRange[0]}
          onChange={(event) => setPriceRange([Number(event.target.value), priceRange[1]])}
          className="mt-4 w-full"
          style={{ accentColor: cp }}
        />
      </FilterBox>

      {hasActiveFilters && (
        <button type="button" onClick={clear} className="w-full rounded-md px-4 py-3 text-[13px] font-black text-[#111]" style={{ background: cp }}>
          Limpiar filtros
        </button>
      )}
    </div>
  );
}

export default function ConstruccionCatalogoPage({
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
  allMarcas: _allMarcas,
  filteredMarcas: _filteredMarcas,
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
  toggleBrand: _toggleBrand,
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
  showMobileFilters,
  setShowMobileFilters,
  showPersonalizarModal,
  setShowPersonalizarModal,
  productoAPersonalizar,
  setProductoAPersonalizar,
  modificadoresProducto,
}: TemplateCatalogoPageProps) {
  const clearFilters = () => {
    setSelectedCategorías([]);
    setSelectedMarcas([]);
    setPriceRange([minPrice, maxPrice]);
    setSearch('');
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-white" style={{ fontFamily: `'${diseno?.tipografia || 'Inter'}', sans-serif` }}>
      <HammerHeader
        tienda={tienda || {}}
        slug={slug}
        cp={cp}
        carritoSize={carrito.length}
        onOpenCart={() => setMostrarCarrito(true)}
        search={search}
        setSearch={setSearch}
        navigate={navigate}
        allCategories={allCategorías}
        diseno={diseno}
      />

      <section className="bg-[#f4f4f4]">
        <div className="mx-auto max-w-7xl px-4 py-10 text-center lg:px-6">
          <p className="text-[13px] font-bold tracking-wide text-[#151515]">
            <button type="button" onClick={() => navigate(`/tienda/${slug}`)}>Inicio</button>
            <span className="mx-2">/</span>
            <button type="button" onClick={() => navigate(`/tienda/${slug}/catalogo`)}>Tienda</button>
            <span className="mx-2">/</span>
            <span>Nuestra tienda</span>
          </p>
          <h1 className="mt-4 text-[30px] font-medium text-[#111] sm:text-[32px]">{editable(diseno?.construccionCatalogTitle, 'Nuestra tienda')}</h1>
        </div>
      </section>

      <main className="mx-auto grid max-w-7xl gap-10 px-4 py-12 lg:grid-cols-[280px_1fr] lg:px-6">
        <aside className="hidden lg:block">
          <FilterPanel
            allCategorías={allCategorías}
            selectedCategorías={selectedCategorías}
            toggleCategory={toggleCategory}
            priceRange={priceRange}
            setPriceRange={setPriceRange}
            minPrice={minPrice}
            maxPrice={maxPrice}
            cp={cp}
            hasActiveFilters={hasActiveFilters}
            clear={clearFilters}
            diseno={diseno}
          />
        </aside>

        <section>
          <div className="mb-10 flex flex-wrap items-center justify-between gap-4">
            <p className="text-[13px] font-semibold text-gray-500">{editable(diseno?.construccionCatalogShowingLabel, 'Mostrando')} 1-{sortedProductos.length} de {total} resultados</p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowMobileFilters(true)}
                className="inline-flex h-10 items-center gap-2 rounded-md border border-gray-200 bg-white px-4 text-[13px] font-black text-gray-800 lg:hidden"
              >
                <Icon icon="solar:filter-bold" width={16} />
                {editable(diseno?.construccionCatalogFilterButton, 'Filtros')}
              </button>
              <select
                value={sortBy}
                onChange={(event) => setSortBy(event.target.value)}
                className="h-10 min-w-[180px] border-0 border-b border-gray-200 bg-white px-3 text-[13px] font-bold text-gray-500 outline-none"
              >
                <option value="relevance">{editable(diseno?.construccionCatalogSortLabel, 'Orden predeterminado')}</option>
                <option value="price-asc">Precio: menor a mayor</option>
                <option value="price-desc">Precio: mayor a menor</option>
                <option value="name-asc">A-Z</option>
              </select>
              <span className="flex h-9 w-9 items-center justify-center rounded-md text-[#111]" style={{ background: cp }}>
                <Icon icon="solar:widget-5-bold" width={18} />
              </span>
              <span className="flex h-9 w-9 items-center justify-center rounded-md bg-gray-100 text-gray-500">
                <Icon icon="solar:list-bold" width={18} />
              </span>
            </div>
          </div>

          {loading ? (
            <div className="grid gap-x-12 gap-y-20 md:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 9 }).map((_, index) => <div key={index} className="h-96 animate-pulse bg-gray-50" />)}
            </div>
          ) : sortedProductos.length === 0 ? (
            <div className="bg-gray-50 px-6 py-20 text-center">
              <Icon icon="solar:box-linear" className="mx-auto mb-4 text-6xl text-gray-300" />
              <h3 className="text-xl font-black text-gray-950">{editable(diseno?.construccionCatalogEmptyTitle, 'Sin productos')}</h3>
              <p className="mt-2 text-sm font-semibold text-gray-500">{editable(diseno?.construccionCatalogEmptyText, 'Prueba limpiando los filtros o cambiando la búsqueda.')}</p>
              <button type="button" onClick={clearFilters} className="mt-6 rounded-md px-5 py-3 text-[13px] font-black text-[#111]" style={{ background: cp }}>
                Limpiar filtros
              </button>
            </div>
          ) : (
            <>
              <div className="grid gap-x-12 gap-y-20 md:grid-cols-2 xl:grid-cols-3">
                {sortedProductos.map((producto) => (
                  <HammerCatalogCard
                    key={producto.id}
                    producto={producto}
                    cp={cp}
                    onOpen={() => navigate(`/tienda/${slug}/producto/${producto.id}`)}
                    onAdd={() => handleAgregarProducto(producto)}
                  />
                ))}
              </div>
              {productos.length < total && (
                <div className="mt-12 flex justify-center">
                  <button type="button" onClick={() => cargarProductos(page + 1)} className="rounded-md px-7 py-3 text-[13px] font-black text-[#111]" style={{ background: cp }}>
                    Cargar más
                  </button>
                </div>
              )}
            </>
          )}
        </section>
      </main>

      <AnimatePresence>
        {showMobileFilters && (
        <motion.div className="fixed inset-0 z-[200] lg:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <button type="button" className="absolute inset-0 bg-black/45 backdrop-blur-[2px]" onClick={() => setShowMobileFilters(false)} />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 260, damping: 30 }}
            className="absolute bottom-0 left-0 right-0 max-h-[86vh] overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl"
          >
            <div className="mb-5 flex items-center justify-between">
              <p className="text-lg font-black text-gray-950">{editable(diseno?.construccionCatalogFilterButton, 'Filtros')}</p>
              <button type="button" onClick={() => setShowMobileFilters(false)} className="rounded-full bg-gray-100 p-2">
                <Icon icon="solar:close-circle-bold" width={20} />
              </button>
            </div>
            <FilterPanel
              allCategorías={allCategorías}
              selectedCategorías={selectedCategorías}
              toggleCategory={toggleCategory}
              priceRange={priceRange}
              setPriceRange={setPriceRange}
              minPrice={minPrice}
              maxPrice={maxPrice}
              cp={cp}
              hasActiveFilters={hasActiveFilters}
              clear={clearFilters}
              diseno={diseno}
            />
            <button type="button" onClick={() => setShowMobileFilters(false)} className="mt-5 w-full rounded-md px-5 py-3 text-[13px] font-black text-[#111]" style={{ background: cp }}>
              Ver resultados
            </button>
          </motion.div>
        </motion.div>
        )}
      </AnimatePresence>

      <ConstruccionFooter tienda={tienda} slug={slug} cp={cp} categories={allCategorías || []} diseno={diseno} />

      <ConstruccionCartModal
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
          onClose={() => {
            setShowPersonalizarModal(false);
            setProductoAPersonalizar(null);
          }}
          product={productoAPersonalizar}
          modifiers={modificadoresProducto}
          onConfirm={(producto, mods) => {
            agregarAlCarritoDirecto(producto, mods);
            setShowPersonalizarModal(false);
            setProductoAPersonalizar(null);
          }}
        />
      )}
    </div>
  );
}
