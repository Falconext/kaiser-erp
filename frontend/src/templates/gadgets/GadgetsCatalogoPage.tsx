/**
 * GadgetsCatalogoPage
 * Catálogo del template Gadgets extraído de Catalogo.tsx.
 * Mantiene el diseño oscuro con XtraHeader, GadgetsCartModal y ProductCardCatalog.
 */
import { Icon } from '@iconify/react';
import XtraHeader from '@/components/tienda/XtraHeader';
import Footer from '@/components/tienda/Footer';
import ProductCardCatalog from '@/components/tienda/ProductCardCatalog';
import GadgetsCartModal from '@/components/tienda/GadgetsCartModal';
import ProductCustomizationModal from '@/components/tienda/ProductCustomizationModal';
import { useRef, useState } from 'react';
import { useCompareStore } from '@/zustand/compare';
import type { TemplateCatalogoPageProps } from '@/templates/shared/types';

export default function GadgetsCatalogoPage({
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
  const adminMenuRef = useRef<HTMLDivElement | null>(null);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [showCompareModal, setShowCompareModal] = useState(false);
  const { getBySlug, clear: clearCompare } = useCompareStore();
  const priceMin = priceRange[0];
  const setPriceMin = (v: number) => setPriceRange([v, priceRange[1]]);

  const GadgetsFilterSidebar = () => (
    <aside className="w-52 flex-shrink-0 space-y-6 text-sm hidden lg:block">
      <h3 className="font-bold text-gray-900 text-base">Filtros</h3>
      {allCategorías.length > 0 && (
        <div>
          <p className="font-semibold text-gray-700 mb-2.5">Categorías</p>
          <div className="space-y-2">
            {allCategorías.map((cat, i) => {
              const name = typeof cat === 'string' ? cat : cat.nombre;
              return (
                <label key={i} className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={selectedCategorías.includes(name)} onChange={() => toggleCategory(name)} className="rounded border-gray-300" style={{ accentColor: cp }} />
                  <span className="text-gray-600 text-xs">{name}</span>
                </label>
              );
            })}
          </div>
        </div>
      )}
      {allMarcas.length > 0 && (
        <div>
          <p className="font-semibold text-gray-700 mb-2.5">Marcas</p>
          <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
            {filteredMarcas.map((brand, i) => {
              const name = typeof brand === 'string' ? brand : brand.nombre;
              return (
                <label key={i} className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={selectedMarcas.includes(name)} onChange={() => toggleBrand(name)} className="rounded border-gray-300" style={{ accentColor: cp }} />
                  <span className="text-gray-600 text-xs">{name}</span>
                </label>
              );
            })}
          </div>
        </div>
      )}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="font-semibold text-gray-700">Precio mínimo</p>
          <span className="text-[11px] font-bold text-white px-1.5 py-0.5 rounded" style={{ background: cp }}>S/ {priceMin}</span>
        </div>
        <input type="range" min={minPrice} max={maxPrice} value={priceRange[0]}
          onChange={e => setPriceMin(Number(e.target.value))}
          className="w-full h-1.5 rounded-full appearance-none cursor-pointer" style={{ accentColor: cp }} />
        <div className="flex justify-between text-[10px] text-gray-400 mt-1">
          <span>S/ {minPrice}</span><span>S/ {maxPrice}</span>
        </div>
      </div>
      {hasActiveFilters && (
        <button onClick={() => { setSelectedMarcas([]); setSelectedCategorías([]); setPriceRange([minPrice, maxPrice]); }}
          className="w-full py-2 text-xs font-bold rounded-full border transition-all"
          style={{ color: cp, borderColor: cp }}>
          Limpiar filtros
        </button>
      )}
    </aside>
  );

  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: `'${diseno.tipografia || 'Inter'}', sans-serif` }}>
      <XtraHeader
        tienda={tienda || {}}
        slug={slug || ''}
        carritoCount={carrito.length}
        onToggleCart={() => setMostrarCarrito(!mostrarCarrito)}
        isAdminOpen={isAdminOpen}
        setIsAdminOpen={setIsAdminOpen}
        adminMenuRef={adminMenuRef}
        search={search}
        setSearch={setSearch}
        categories={allCategorías}
        onSelectCategory={cat => { if (cat === '') setSelectedCategorías([]); else setSelectedCategorías([cat]); }}
        recommendedProducts={productos}
        cp={cp}
      />

      <main className="pt-20 pb-16">
        <div className="max-w-screen-xl mx-auto px-5 md:px-8 py-5">

          {/* Results header */}
          <div className="flex items-center justify-between mb-3 gap-2">
            <p className="text-xs sm:text-sm text-gray-600 min-w-0 truncate">
              <span className="font-medium">{sortedProductos.length}</span>
              {total > sortedProductos.length && <> de <span className="font-medium">{total}</span></>} resultados
            </p>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button onClick={() => setShowMobileFilters(true)}
                className="lg:hidden flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 bg-white">
                <Icon icon="solar:filter-bold" width={14} />Filtros
                {hasActiveFilters && <span className="w-1.5 h-1.5 rounded-full" style={{ background: cp }} />}
              </button>
              <select value={sortBy} onChange={e => setSortBy(e.target.value)}
                className="text-xs sm:text-sm text-gray-600 border border-gray-200 rounded-lg px-2 sm:px-3 py-2 bg-white cursor-pointer focus:outline-none">
                <option value="relevance">Relevantes</option>
                <option value="price-asc">Precio ↑</option>
                <option value="price-desc">Precio ↓</option>
                <option value="name-asc">A-Z</option>
              </select>
            </div>
          </div>

          {/* Mobile filter drawer */}
          {showMobileFilters && (
            <div className="fixed inset-0 z-[200] lg:hidden">
              <div className="absolute inset-0 bg-black/40" onClick={() => setShowMobileFilters(false)} />
              <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-2xl max-h-[85vh] flex flex-col">
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                  <span className="font-black text-gray-900">Filtros</span>
                  <button onClick={() => setShowMobileFilters(false)} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                    <Icon icon="solar:close-circle-bold" width={18} className="text-gray-600" />
                  </button>
                </div>
                <div className="overflow-y-auto flex-1 px-5 py-4 space-y-5">
                  {allCategorías.length > 0 && (
                    <div>
                      <p className="font-bold text-gray-800 mb-2.5 text-sm">Categorías</p>
                      <div className="flex flex-wrap gap-2">
                        {allCategorías.map((cat, i) => {
                          const name = typeof cat === 'string' ? cat : cat.nombre;
                          const active = selectedCategorías.includes(name);
                          return (
                            <button key={i} onClick={() => toggleCategory(name)}
                              className="px-3 py-1.5 rounded-full text-xs font-bold border-2 transition-all"
                              style={active ? { background: cp, borderColor: cp, color: 'white' } : { borderColor: '#E5E7EB', color: '#6B7280' }}>
                              {name}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
                <div className="px-5 py-4 border-t border-gray-100 flex gap-3">
                  {hasActiveFilters && (
                    <button onClick={() => { setSelectedMarcas([]); setSelectedCategorías([]); setPriceRange([minPrice, maxPrice]); }}
                      className="flex-1 py-3 rounded-2xl text-sm font-bold border-2 transition-all"
                      style={{ color: cp, borderColor: cp }}>
                      Limpiar
                    </button>
                  )}
                  <button onClick={() => setShowMobileFilters(false)}
                    className="flex-1 py-3 rounded-2xl text-sm font-bold text-white transition-all"
                    style={{ background: cp }}>
                    Ver {sortedProductos.length} resultados
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-6 items-start">
            <GadgetsFilterSidebar />
            <div className="flex-1 min-w-0">
              {loading ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
                  {Array.from({ length: 12 }).map((_, i) => <div key={i} className="animate-pulse bg-gray-100 rounded-2xl h-64" />)}
                </div>
              ) : sortedProductos.length === 0 ? (
                <div className="py-24 text-center">
                  <Icon icon="solar:box-linear" className="text-5xl mx-auto mb-3 text-gray-300" />
                  <h3 className="font-bold text-gray-800 mb-2">Sin resultados</h3>
                  <p className="text-sm text-gray-500 mb-4">Intenta ajustar los filtros.</p>
                  <button onClick={() => { setSearch(''); setSelectedMarcas([]); setSelectedCategorías([]); setPriceRange([minPrice, maxPrice]); }}
                    className="text-sm font-bold px-5 py-2 rounded-full border transition-all"
                    style={{ color: cp, borderColor: cp }}>
                    Limpiar filtros
                  </button>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
                    {sortedProductos.map(producto => (
                      <ProductCardCatalog
                        key={producto.id}
                        producto={producto}
                        slug={slug || ''}
                        cp={cp}
                        onAddToCart={() => handleAgregarProducto(producto)}
                        onClick={() => navigate(`/tienda/${slug}/producto/${producto.id}`)}
                      />
                    ))}
                  </div>
                  {productos.length < total && (
                    <div className="mt-10 flex justify-center">
                      <button onClick={() => { const next = page + 1; cargarProductos(next); }}
                        className="px-8 py-3 rounded-full font-bold text-sm border-2 transition-colors"
                        style={{ color: cp, borderColor: cp }}>
                        Cargar más productos
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </main>

      <Footer tienda={tienda || {}} diseno={diseno} />

      <GadgetsCartModal
        isOpen={mostrarCarrito}
        onClose={() => setMostrarCarrito(false)}
        carrito={carrito}
        tienda={tienda || {}}
        actualizarCantidad={actualizarCantidad}
        onCheckout={irACheckout}
        slug={slug || ''}
        setCarrito={setCarrito}
        cp={cp}
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

      {/* Compare modal */}
      {showCompareModal && (() => {
        const compareItems = getBySlug(slug || '');
        return (
          <div className="fixed inset-0 z-[998] bg-black/60 flex items-center justify-center p-4" onClick={() => setShowCompareModal(false)}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-auto max-h-[90vh]" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between p-5 border-b border-gray-100">
                <h3 className="font-black text-gray-900 text-lg">Comparar productos</h3>
                <button onClick={() => setShowCompareModal(false)} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                  <Icon icon="solar:close-circle-bold" width={18} className="text-gray-600" />
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-gray-100">
                    <td className="p-4 font-semibold text-gray-500 text-xs uppercase">Detalle</td>
                    {compareItems.map(item => (
                      <td key={item.id} className="p-4 text-center">
                        <div className="flex flex-col items-center gap-2">
                          {item.imagenUrl && <img src={item.imagenUrl} alt={item.descripcion} className="w-16 h-16 object-contain" />}
                          <span className="text-xs font-bold text-gray-800 line-clamp-2">{item.descripcion}</span>
                          <button onClick={() => { setShowCompareModal(false); navigate(`/tienda/${slug}/producto/${item.id}`); }}
                            className="text-[11px] font-bold text-white px-3 py-1 rounded-full" style={{ background: cp }}>
                            Ver producto
                          </button>
                        </div>
                      </td>
                    ))}
                  </tr></thead>
                  <tbody>
                    {[
                      { label: 'Precio', fn: (i: any) => `S/ ${Number(i.precioUnitario).toFixed(2)}` },
                      { label: 'Categoría', fn: (i: any) => i.categoria || '—' },
                      { label: 'Marca', fn: (i: any) => i.marca || '—' },
                      { label: 'Stock', fn: (i: any) => i.stock ?? '—' },
                    ].map(({ label, fn }) => (
                      <tr key={label} className="border-b border-gray-50 hover:bg-gray-50">
                        <td className="p-4 text-xs font-semibold text-gray-500">{label}</td>
                        {compareItems.map(item => <td key={item.id} className="p-4 text-center text-sm text-gray-700">{fn(item)}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
      })()}

      {getBySlug(slug || '').length > 0 && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50">
          <div className="bg-gray-900 text-white rounded-2xl shadow-2xl px-5 py-3 flex items-center gap-4">
            <span className="text-sm font-semibold">{getBySlug(slug || '').length} producto{getBySlug(slug || '').length > 1 ? 's' : ''} a comparar</span>
            <button onClick={() => setShowCompareModal(true)} className="px-4 py-1.5 rounded-xl font-bold text-sm text-white" style={{ background: cp }}>Comparar</button>
            <button onClick={() => clearCompare(slug || '')} className="text-gray-400 hover:text-white transition-colors">
              <Icon icon="solar:close-circle-bold" width={18} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
