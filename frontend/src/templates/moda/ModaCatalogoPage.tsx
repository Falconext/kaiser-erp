import { Icon } from '@iconify/react';
import { useMemo, useState } from 'react';
import ModaHeader from '@/components/tienda/ModaHeader';
import ModaFooter from '@/components/tienda/ModaFooter';
import ShoppingCartModal from '@/components/tienda/ShoppingCartModal';
import ProductCustomizationModal from '@/components/tienda/ProductCustomizationModal';
import type { TemplateCatalogoPageProps } from '@/templates/shared/types';

type CatalogFallbackSeed = [string, string, number, number, string, number];

const fallbackProducts: CatalogFallbackSeed[] = [
  ['Camisa corset lace-up', 'PLM', 66.8, 76.9, 'https://images.unsplash.com/photo-1507680434567-5739c80be1ac?auto=format&fit=crop&q=90&w=900', 2],
  ['Conjunto saco y pantalon arena', 'ARGUE CULTURE', 81.8, 99.8, 'https://images.unsplash.com/photo-1516257984-b1b4d707412e?auto=format&fit=crop&q=90&w=900', 4],
  ['Pantalon graphite drape luxe', 'BLAEXIT', 58.9, 67.9, 'https://images.unsplash.com/photo-1506629905607-d405b7a30db9?auto=format&fit=crop&q=90&w=900', 3],
  ['Traje wide-leg negro oversize', 'ARGUE CULTURE', 91.9, 99.9, 'https://images.unsplash.com/photo-1552374196-1ab2a1c593e8?auto=format&fit=crop&q=90&w=900', 2],
  ['Camisa lino blanca henley', 'ORO', 50.9, 50.9, 'https://images.unsplash.com/photo-1542327897-d73f4005b533?auto=format&fit=crop&q=90&w=900', 2],
  ['Camisa pastel floral boton-up', 'PLM', 72.9, 83.9, 'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&q=90&w=900', 3],
  ['Cargo denim harness ruched', 'GRACE RUB', 64.9, 74.9, 'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?auto=format&fit=crop&q=90&w=900', 2],
  ['Pantalon acid wash stacked', 'ASTT STUDIO', 82.9, 96.9, 'https://images.unsplash.com/photo-1516826957135-700dedea698c?auto=format&fit=crop&q=90&w=900', 1],
  ['Scarf collar wide-leg suit', 'ARGUE CULTURE', 73.8, 89.9, 'https://images.unsplash.com/photo-1520975682031-a9c3f8e4f69a?auto=format&fit=crop&q=90&w=900', 6],
  ['Loafers negros cuero patente', 'JCAESAR', 149.6, 194.48, 'https://images.unsplash.com/photo-1614252369475-531eba835eb1?auto=format&fit=crop&q=90&w=900', 1],
  ['Camisa boxy oversized poplin', 'CLP', 95.9, 109.9, 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&q=90&w=900', 3],
  ['Casaca hooded woolen negra', 'GY', 44.9, 69.9, 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?auto=format&fit=crop&q=90&w=900', 3],
  ['Pantalon high-waist wide-leg', 'ISIETS', 57.99, 75.39, 'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?auto=format&fit=crop&q=90&w=900', 2],
  ['Top sparkle henley sheer', 'PLM', 59.8, 66.8, 'https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?auto=format&fit=crop&q=90&w=900', 4],
  ['Botin chunky black platform', 'HXS', 57.8, 69.36, 'https://images.unsplash.com/photo-1608231387042-66d1773070a5?auto=format&fit=crop&q=90&w=900', 1],
  ['Chaqueta espresso toggle', 'ORO', 109.8, 140.9, 'https://images.unsplash.com/photo-1512316609839-ce289d3eba0a?auto=format&fit=crop&q=90&w=900', 2],
];

const filterGroups = ['Genero', 'Color', 'Marca', 'Tipo de producto', 'Precio', 'Ocasion', 'Estilo'];

function money(value: number | string | null | undefined, currency = 'S/') {
  return `${currency} ${Number(value || 0).toFixed(2)}`;
}

function getPrice(product: any) {
  return Number(product?.precioOferta || product?.precioVenta || product?.precioUnitario || product?.precio || 0);
}

function getOriginalPrice(product: any) {
  return Number(product?.precioOriginal || product?.precioVenta || product?.precioUnitario || product?.precio || getPrice(product));
}

function getTitle(product: any) {
  return product?.descripcion || product?.nombre || 'Producto de moda';
}

function getBrand(product: any) {
  const brand = product?.marca || product?.brand;
  if (typeof brand === 'string') return brand;
  if (brand?.nombre) return brand.nombre;
  return 'VENDIFY';
}

function isPlaceholderImage(url: unknown) {
  const value = String(url || '').toLowerCase();
  return !value || value.includes('placehold.co') || value.includes('placeholder') || value.includes('dummyimage') || value.includes('text=');
}

function getModaImage(product: any, fallback: string) {
  const image = product?.imagenUrl || product?.imagen || product?.imageUrl;
  return isPlaceholderImage(image) ? fallback : image;
}

function buildFallbackProducts() {
  return fallbackProducts.map(([descripcion, marca, precioOferta, precioUnitario, imagenUrl, coloresDisponibles], index) => ({
    id: `moda-catalog-demo-${index + 1}`,
    descripcion,
    marca,
    precioOferta,
    precioUnitario,
    imagenUrl,
    coloresDisponibles,
  }));
}

function catalogTitle(search: string, selectedCategories: string[]) {
  if (selectedCategories[0]) return selectedCategories[0].toLowerCase();
  if (search?.trim()) return search.trim().toLowerCase();
  return "men's best sellers";
}

export default function ModaCatalogoPage({ tienda, slug, cp, navigate,
  productos, sortedProductos, loading, total, page, cargarProductos,
  allCategorías, filteredMarcas,
  selectedCategorías, setSelectedCategorías, selectedMarcas, setSelectedMarcas,
  priceRange, setPriceRange, minPrice, maxPrice,
  sortBy, setSortBy, hasActiveFilters,
  toggleCategory, toggleBrand,
  search, setSearch,
  carrito, setCarrito, mostrarCarrito, setMostrarCarrito,
  actualizarCantidad, irACheckout, agregarAlCarritoDirecto,
  showMobileFilters, setShowMobileFilters,
  showPersonalizarModal, setShowPersonalizarModal,
  productoAPersonalizar, setProductoAPersonalizar, modificadoresProducto, diseno }: TemplateCatalogoPageProps) {
  const [openFilter, setOpenFilter] = useState<string | null>(null);
  const fallback = useMemo(() => buildFallbackProducts(), []);
  const productSource = sortedProductos.length > 0 ? sortedProductos : fallback;
  const displayProducts = productSource.slice(0, sortedProductos.length > 0 ? productSource.length : 16);
  const title = catalogTitle(search, selectedCategorías);
  const realTotal = sortedProductos.length > 0 ? total || sortedProductos.length : fallback.length;

  const clearFilters = () => {
    setSearch('');
    setSelectedMarcas([]);
    setSelectedCategorías([]);
    setPriceRange([minPrice, maxPrice]);
  };

  const goHome = () => navigate(`/tienda/${slug}`);

  return (
    <div className="min-h-screen bg-white text-black" style={{ fontFamily: "'Poppins', sans-serif", fontSize: 14 }}>
      <ModaHeader
        tienda={tienda || {}}
        slug={slug || ''}
        cp={cp}
        carritoSize={carrito.reduce((s: number, i: any) => s + Number(i.cantidad || 1), 0)}
        onOpenCart={() => setMostrarCarrito(!mostrarCarrito)}
        searchQuery={search}
        setSearchQuery={setSearch}
        onSearchSubmit={e => { e.preventDefault(); }}
        allCategories={allCategorías}
      />

      <main className="bg-white">
        <section className="mx-auto max-w-[1720px] px-5 pb-10 pt-6 md:px-10 lg:px-16">
          <nav className="mb-12 text-[11px] text-neutral-500">
            <button onClick={goHome} className="hover:text-black">Inicio</button>
            <span className="mx-2">/</span>
            <span>{title}</span>
          </nav>

          <header className="mx-auto mb-14 max-w-[760px] text-center">
            <h1 className="text-[36px] font-medium lowercase leading-none tracking-[-0.055em] md:text-[54px]">
              {title}
            </h1>
            <p className="mt-8 text-[14px] leading-6 text-black">
              Explora nuestra seleccion de prendas destacadas, calzado y esenciales urbanos listos para vender.
            </p>
          </header>

          <div className="grid gap-8 lg:grid-cols-[255px_1fr] lg:gap-10">
            <aside className="hidden lg:block">
              <div className="sticky top-[180px]">
                <h2 className="mb-5 text-[24px] font-normal lowercase tracking-[-0.04em]">filters</h2>
                <div className="border-t border-neutral-300">
                  {filterGroups.map((group) => (
                    <FilterBlock
                      key={group}
                      group={group}
                      open={openFilter === group}
                      onToggle={() => setOpenFilter(openFilter === group ? null : group)}
                      categories={allCategorías}
                      brands={filteredMarcas}
                      selectedCategories={selectedCategorías}
                      selectedBrands={selectedMarcas}
                      priceRange={priceRange}
                      minPrice={minPrice}
                      maxPrice={maxPrice}
                      setPriceRange={setPriceRange}
                      toggleCategory={toggleCategory}
                      toggleBrand={toggleBrand}
                    />
                  ))}
                </div>
                {hasActiveFilters && (
                  <button onClick={clearFilters} className="mt-6 text-[12px] font-semibold underline underline-offset-4">
                    Limpiar filtros
                  </button>
                )}
              </div>
            </aside>

            <section className="min-w-0">
              <div className="mb-9 flex items-center justify-between gap-4">
                <button
                  onClick={() => setShowMobileFilters(true)}
                  className="inline-flex items-center gap-2 border border-neutral-300 px-4 py-2 text-[13px] font-medium lg:hidden"
                >
                  Filtros
                  <Icon icon="solar:filter-linear" width={16} />
                </button>
                <p className="hidden text-[12px] text-black lg:block">{realTotal} productos</p>
                <label className="ml-auto inline-flex items-center gap-2 text-[12px]">
                  <span className="text-neutral-500">Ordenar por</span>
                  <select
                    value={sortBy}
                    onChange={(event) => setSortBy(event.target.value)}
                    className="bg-transparent pr-5 text-[12px] font-medium outline-none"
                  >
                    <option value="relevance">Mas relevante</option>
                    <option value="price-asc">Precio menor</option>
                    <option value="price-desc">Precio mayor</option>
                    <option value="name-asc">Nombre A-Z</option>
                  </select>
                </label>
              </div>

              {loading ? (
                <div className="grid grid-cols-2 gap-x-7 gap-y-16 md:grid-cols-3 xl:grid-cols-4 xl:gap-x-9">
                  {Array.from({ length: 8 }).map((_, index) => (
                    <div key={index} className="animate-pulse">
                      <div className="aspect-[0.78] bg-neutral-100" />
                      <div className="mx-auto mt-8 h-3 w-20 bg-neutral-100" />
                      <div className="mx-auto mt-4 h-4 w-48 bg-neutral-100" />
                    </div>
                  ))}
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-x-7 gap-y-16 md:grid-cols-3 xl:grid-cols-4 xl:gap-x-9 xl:gap-y-20">
                    {displayProducts.map((producto, index) => (
                      <CatalogProductCard
                        key={producto?.id || index}
                        product={producto}
                        fallback={fallback[index % fallback.length].imagenUrl}
                        index={index}
                        onOpen={() => {
                          if (String(producto?.id || '').includes('demo')) return;
                          navigate(`/tienda/${slug}/producto/${producto.id}`);
                        }}
                      />
                    ))}
                  </div>

                  {sortedProductos.length === 0 && (
                    <div className="mt-16 text-center text-[13px] text-neutral-500">
                      Estos productos son referenciales hasta que agregues inventario real.
                    </div>
                  )}

                  {sortedProductos.length > 0 && productos.length < total && (
                    <div className="mt-16 flex justify-center">
                      <button
                        onClick={() => cargarProductos(page + 1)}
                        className="h-12 min-w-[160px] bg-black px-8 text-[13px] font-black uppercase tracking-[0.16em] text-white hover:bg-neutral-800"
                      >
                        Ver mas
                      </button>
                    </div>
                  )}
                </>
              )}
            </section>
          </div>
        </section>

        {showMobileFilters && (
          <div className="fixed inset-0 z-[200] lg:hidden">
            <div className="absolute inset-0 bg-black/40" onClick={() => setShowMobileFilters(false)} />
            <div className="absolute bottom-0 left-0 right-0 max-h-[85vh] overflow-y-auto bg-white p-5 shadow-2xl">
              <div className="mb-5 flex items-center justify-between">
                <h2 className="text-[24px] font-medium lowercase">filters</h2>
                <button onClick={() => setShowMobileFilters(false)} aria-label="Cerrar filtros">
                  <Icon icon="solar:close-circle-linear" width={28} />
                </button>
              </div>
              <div className="border-t border-neutral-300">
                {filterGroups.map((group) => (
                  <FilterBlock
                    key={group}
                    group={group}
                    open={openFilter === group}
                    onToggle={() => setOpenFilter(openFilter === group ? null : group)}
                    categories={allCategorías}
                    brands={filteredMarcas}
                    selectedCategories={selectedCategorías}
                    selectedBrands={selectedMarcas}
                    priceRange={priceRange}
                    minPrice={minPrice}
                    maxPrice={maxPrice}
                    setPriceRange={setPriceRange}
                    toggleCategory={toggleCategory}
                    toggleBrand={toggleBrand}
                  />
                ))}
              </div>
              <button onClick={() => setShowMobileFilters(false)} className="mt-6 h-12 w-full bg-black text-[13px] font-black uppercase tracking-[0.14em] text-white">
                Ver productos
              </button>
            </div>
          </div>
        )}
      </main>

      <ModaFooter tiendaNombre={tienda?.nombreComercial || tienda?.nombre || 'chiclara'} />

      <ShoppingCartModal
        isOpen={mostrarCarrito}
        onClose={() => setMostrarCarrito(false)}
        carrito={carrito}
        tienda={tienda || {}}
        actualizarCantidad={actualizarCantidad}
        onCheckout={irACheckout}
        slug={slug || ''}
        setCarrito={setCarrito}
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
    </div>
  );
}

function CatalogProductCard({
  product,
  fallback,
  index,
  onOpen,
}: {
  product: any;
  fallback: string;
  index: number;
  onOpen: () => void;
}) {
  const title = getTitle(product);
  const brand = getBrand(product);
  const price = getPrice(product);
  const original = getOriginalPrice(product);
  const saving = original > price ? original - price : [10.1, 18, 9, 8, 16.1, 44.88, 14, 25, 17.4, 10][index % 10] || 9;
  const colors = Number(product?.coloresDisponibles || product?.variantes?.length || ((index % 4) + 1));

  return (
    <article className="group text-center">
      <button type="button" onClick={onOpen} className="relative block w-full text-left">
        <span className="absolute left-2 top-0 z-10 rounded-[2px] bg-black px-2 py-1 text-[11px] font-black uppercase leading-none tracking-[0.06em] text-white">
          SAVE ${saving.toFixed(2)}
        </span>
        <div className="aspect-[0.82] w-full overflow-hidden bg-white">
          <img
            src={getModaImage(product, fallback)}
            alt={title}
            className="h-full w-full object-cover object-top transition-transform duration-700 group-hover:scale-[1.025]"
          />
        </div>
      </button>
      <button type="button" onClick={onOpen} className="mt-9 block w-full text-center">
        <p className="text-[10px] font-black uppercase tracking-[0.22em]">{brand}</p>
        <h3 className="mx-auto mt-3 line-clamp-1 max-w-[270px] text-[14px] font-normal leading-6 text-black">
          {title}
        </h3>
        <div className="mt-1 flex items-center justify-center gap-2 text-[14px] font-normal">
          <span>{money(price)}</span>
          {original > price && <span className="text-neutral-400 line-through">{money(original)}</span>}
        </div>
        <p className="mt-4 text-[13px] text-neutral-500">
          {colors} {colors === 1 ? 'color disponible' : 'colores disponibles'}
        </p>
      </button>
    </article>
  );
}

function FilterBlock({
  group,
  open,
  onToggle,
  categories,
  brands,
  selectedCategories,
  selectedBrands,
  priceRange,
  minPrice,
  maxPrice,
  setPriceRange,
  toggleCategory,
  toggleBrand,
}: {
  group: string;
  open: boolean;
  onToggle: () => void;
  categories: any[];
  brands: any[];
  selectedCategories: string[];
  selectedBrands: string[];
  priceRange: [number, number];
  minPrice: number;
  maxPrice: number;
  setPriceRange: (range: [number, number]) => void;
  toggleCategory: (name: string) => void;
  toggleBrand: (name: string) => void;
}) {
  const categoryNames = categories.map((category) => (typeof category === 'string' ? category : category?.nombre)).filter(Boolean).slice(0, 10);
  const brandNames = brands.map((brand) => (typeof brand === 'string' ? brand : brand?.nombre)).filter(Boolean).slice(0, 10);

  return (
    <div className="border-b border-neutral-300">
      <button type="button" onClick={onToggle} className="flex h-[64px] w-full items-center justify-between text-left text-[13px] font-semibold">
        {group}
        <Icon icon={open ? 'solar:alt-arrow-up-linear' : 'solar:alt-arrow-down-linear'} width={16} />
      </button>
      {open && (
        <div className="pb-5">
          {group === 'Genero' && (
            <div className="space-y-3 text-[13px]">
              {['Hombre', 'Mujer', 'Unisex'].map((item) => (
                <button key={item} type="button" onClick={() => toggleCategory(item)} className="block text-neutral-600 hover:text-black">
                  {item}
                </button>
              ))}
            </div>
          )}

          {group === 'Marca' && (
            <div className="space-y-3 text-[13px]">
              {brandNames.length > 0 ? brandNames.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => toggleBrand(item)}
                  className={`block ${selectedBrands.includes(item) ? 'font-black text-black' : 'text-neutral-600 hover:text-black'}`}
                >
                  {item}
                </button>
              )) : <p className="text-[12px] text-neutral-400">Sin marcas registradas</p>}
            </div>
          )}

          {group === 'Tipo de producto' && (
            <div className="space-y-3 text-[13px]">
              {categoryNames.length > 0 ? categoryNames.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => toggleCategory(item)}
                  className={`block ${selectedCategories.includes(item) ? 'font-black text-black' : 'text-neutral-600 hover:text-black'}`}
                >
                  {item}
                </button>
              )) : <p className="text-[12px] text-neutral-400">Sin categorias registradas</p>}
            </div>
          )}

          {group === 'Precio' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="number"
                  value={priceRange[0]}
                  onChange={(event) => setPriceRange([Number(event.target.value), priceRange[1]])}
                  className="h-10 border border-neutral-300 px-3 text-[12px] outline-none focus:border-black"
                />
                <input
                  type="number"
                  value={priceRange[1]}
                  onChange={(event) => setPriceRange([priceRange[0], Number(event.target.value)])}
                  className="h-10 border border-neutral-300 px-3 text-[12px] outline-none focus:border-black"
                />
              </div>
              <input
                type="range"
                min={minPrice}
                max={maxPrice}
                value={priceRange[1]}
                onChange={(event) => setPriceRange([priceRange[0], Number(event.target.value)])}
                className="w-full accent-black"
              />
            </div>
          )}

          {!['Genero', 'Marca', 'Tipo de producto', 'Precio'].includes(group) && (
            <div className="space-y-3 text-[13px]">
              {['Negro', 'Blanco', 'Denim', 'Urbano', 'Casual'].map((item) => (
                <button key={item} type="button" onClick={() => toggleCategory(item)} className="block text-neutral-600 hover:text-black">
                  {item}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
