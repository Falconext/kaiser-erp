/**
 * AutopartesCatalogoPage
 * Catálogo del template Autopartes extraído de Catalogo.tsx.
 */
import { Icon } from '@iconify/react';
import AutopartesHeader from '@/components/tienda/AutopartesHeader';
import Footer from '@/components/tienda/Footer';
import ProductCardGromuse from '@/components/tienda/ProductCardGromuse';
import AutopartesCartModal from '@/components/tienda/AutopartesCartModal';
import ProductCustomizationModal from '@/components/tienda/ProductCustomizationModal';
import type { TemplateCatalogoPageProps } from '@/templates/shared/types';

export default function AutopartesCatalogoPage({
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
  showPersonalizarModal, setShowPersonalizarModal,
  productoAPersonalizar, setProductoAPersonalizar, modificadoresProducto,
}: TemplateCatalogoPageProps) {
  const priceMin = priceRange[0];
  const setPriceMin = (v: number) => setPriceRange([v, priceRange[1]]);

  const AutopartesFilterSidebar = () => (
    <aside className="w-64 flex-shrink-0 space-y-6 text-sm hidden lg:block bg-white rounded-xl border border-gray-100 p-5 h-fit sticky top-24 shadow-sm">
      <h3 className="font-black text-gray-900 text-lg tracking-wide uppercase border-b border-gray-100 pb-3 mb-4">Filters</h3>
      
      {allCategorías.length > 0 && (
        <div className="mb-6">
          <p className="font-bold text-gray-400 mb-3 text-xs uppercase tracking-wider">Categorías</p>
          <div className="space-y-3">
            {allCategorías.map((cat, i) => {
              const name = typeof cat === 'string' ? cat : cat.nombre;
              return (
                <label key={i} className="flex items-center gap-3 cursor-pointer group">
                  <div className={`w-4 h-4 rounded-sm border flex items-center justify-center flex-shrink-0 transition-colors ${selectedCategorías.includes(name) ? 'border-red-500 bg-red-500' : 'border-gray-600 bg-[#1A1A1A] group-hover:border-gray-400'}`}>
                    {selectedCategorías.includes(name) && <Icon icon="mdi:check" width={12} className="text-white" />}
                  </div>
                  <input type="checkbox" checked={selectedCategorías.includes(name)} onChange={() => toggleCategory(name)} className="hidden" />
                  <span className={`text-sm ${selectedCategorías.includes(name) ? 'text-gray-900 font-bold' : 'text-gray-500 group-hover:text-gray-800'}`}>{name}</span>
                </label>
              );
            })}
          </div>
        </div>
      )}

      {allMarcas.length > 0 && (
        <div className="mb-6">
          <p className="font-bold text-gray-400 mb-3 text-xs uppercase tracking-wider">Marcas</p>
          <div className="space-y-3 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
            {filteredMarcas.map((brand, i) => {
              const name = typeof brand === 'string' ? brand : brand.nombre;
              return (
                <label key={i} className="flex items-center gap-3 cursor-pointer group">
                  <div className={`w-4 h-4 rounded-sm border flex items-center justify-center flex-shrink-0 transition-colors ${selectedMarcas.includes(name) ? 'border-red-500 bg-red-500' : 'border-gray-600 bg-[#1A1A1A] group-hover:border-gray-400'}`}>
                    {selectedMarcas.includes(name) && <Icon icon="mdi:check" width={12} className="text-white" />}
                  </div>
                  <input type="checkbox" checked={selectedMarcas.includes(name)} onChange={() => toggleBrand(name)} className="hidden" />
                  <span className={`text-sm ${selectedMarcas.includes(name) ? 'text-gray-900 font-bold' : 'text-gray-500 group-hover:text-gray-800'}`}>{name}</span>
                </label>
              );
            })}
          </div>
        </div>
      )}

      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="font-bold text-gray-400 text-xs uppercase tracking-wider">Precio Mínimo</p>
          <span className="text-xs font-black text-gray-900 px-2 py-1 rounded bg-gray-100 border border-gray-200">S/ {priceMin}</span>
        </div>
        <input type="range" min={minPrice} max={maxPrice} value={priceRange[0]}
          onChange={e => setPriceMin(Number(e.target.value))}
          className="w-full h-1.5 rounded-full appearance-none cursor-pointer bg-gray-200" style={{ accentColor: cp }} />
        <div className="flex justify-between text-[10px] text-gray-500 mt-2 font-mono">
          <span>S/ {minPrice}</span><span>S/ {maxPrice}</span>
        </div>
      </div>

      {hasActiveFilters && (
        <button onClick={() => { setSelectedMarcas([]); setSelectedCategorías([]); setPriceRange([minPrice, maxPrice]); }}
          className="w-full mt-6 py-2.5 text-xs font-bold rounded-md bg-[#1A1A1A] text-gray-300 hover:text-white hover:bg-black transition-colors border border-gray-700">
          Limpiar Filtros
        </button>
      )}
    </aside>
  );

  return (
    <div className="min-h-screen bg-[#F8F9FA]" style={{ fontFamily: `'${diseno.tipografia || 'Inter'}', sans-serif` }}>
      <AutopartesHeader 
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
        allCategories={allCategorías}
      />

      <main className="w-full max-w-7xl mx-auto px-4 xl:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-black text-gray-900 mb-1">Catálogo</h1>
            <p className="text-sm text-gray-500">
              Mostrando <span className="font-bold text-gray-900">{sortedProductos.length}</span> de {total} resultados
              {(selectedCategorías[0] || selectedMarcas[0] || search) && (
                <span> for "{selectedCategorías[0] || selectedMarcas[0] || search}"</span>
              )}
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <select value={sortBy} onChange={e => setSortBy(e.target.value)}
              className="text-sm font-bold text-gray-700 border-2 border-gray-200 rounded-md px-4 py-2 bg-white cursor-pointer focus:outline-none hover:border-gray-300 transition-colors">
              <option value="relevance">Ordenar por Relevancia</option>
              <option value="price-asc">Precio (Menor a Mayor)</option>
              <option value="price-desc">Precio (Mayor a Menor)</option>
              <option value="name-asc">Alfabético (A-Z)</option>
            </select>
          </div>
        </div>

        <div className="flex gap-6 items-start">
          <AutopartesFilterSidebar />

          <div className="flex-1 min-w-0">
            {loading ? (
              <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div key={i} className="animate-pulse bg-white rounded-xl h-[340px] border border-gray-100" />
                ))}
              </div>
            ) : sortedProductos.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-100 p-16 text-center shadow-sm">
                <Icon icon="solar:box-minimalistic-broken" className="text-6xl mx-auto mb-4 text-gray-300" />
                <h3 className="font-black text-gray-900 text-xl mb-2">No se encontraron productos</h3>
                <p className="text-gray-500 mb-6">Intenta ajustar los filtros o el término de búsqueda.</p>
                <button
                  onClick={() => { setSearch(''); setSelectedMarcas([]); setSelectedCategorías([]); setPriceRange([minPrice, maxPrice]); }}
                  className="text-sm font-bold px-6 py-3 rounded-md text-white transition-colors hover:opacity-90"
                  style={{ backgroundColor: cp }}
                >
                  Limpiar Filtros
                </button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
                  {sortedProductos.map(producto => (
                    <ProductCardGromuse
                      key={producto.id}
                      producto={producto}
                      slug={slug || ''}
                      diseno={diseno}
                      onAddToCart={() => handleAgregarProducto(producto)}
                      onClick={() => navigate(`/tienda/${slug}/producto/${producto.id}`)}
                    />
                  ))}
                </div>
                {productos.length < total && (
                  <div className="mt-12 flex justify-center">
                    <button onClick={() => { const next = page + 1; cargarProductos(next); }}
                      className="px-8 py-3.5 rounded-md font-black text-sm text-white transition-transform hover:scale-[1.02] shadow-md"
                      style={{ backgroundColor: cp }}>
                      Load More Parts
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </main>

      <Footer tienda={tienda || {}} diseno={diseno} />

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
