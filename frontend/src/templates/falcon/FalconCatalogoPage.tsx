import { useMemo, useState } from 'react';
import { Icon } from '@iconify/react';
import { AnimatePresence, motion } from 'framer-motion';
import type { TemplateCatalogoPageProps } from '@/templates/shared/types';
import {
  GREEN, resolveFalconGreen, getName, money, getImg, catOf, storeNameOf, editable, withPreviewQuery, FALCON_DEFAULT_IMAGES,
  FalconHeader, FalconFooter, FalconProductCard,
  FalconCartDrawer, FalconWishlistDrawer, FalconCompareModal, FalconQuickView,
  falconFadeUp, falconScaleIn, falconStagger, falconTap,
} from './FalconShared';

const SORT_OPTIONS: [string, string][] = [
  ['relevance', 'Relevancia'],
  ['name-asc', 'Alfabético, A-Z'],
  ['price-asc', 'Precio: menor a mayor'],
  ['price-desc', 'Precio: mayor a menor'],
];

export default function FalconCatalogoPage({
  tienda, slug, diseno, cp, navigate,
  productos, sortedProductos, allProductos, loading,
  allCategorías, selectedCategorías, toggleCategory,
  priceRange, setPriceRange, minPrice, maxPrice,
  sortBy, setSortBy,
  search, setSearch,
  carrito, actualizarCantidad, mostrarCarrito, setMostrarCarrito,
  irACheckout, handleAgregarProducto,
}: TemplateCatalogoPageProps) {
  const green = resolveFalconGreen(diseno, cp);
  const storeName = storeNameOf(tienda);
  // Lista completa para categorías/mega-menú (no se ve afectada por el filtro activo).
  const catalogProducts = Array.isArray(allProductos) && allProductos.length ? allProductos : productos;
  const banner = diseno?.falconCatalogBannerUrl || diseno?.falconDetailBannerUrl || FALCON_DEFAULT_IMAGES.catalog;

  const [view, setView] = useState<'2' | '3' | '4' | 'list'>('4');
  const [avail, setAvail] = useState<{ in: boolean; out: boolean }>({ in: false, out: false });
  const [quickView, setQuickView] = useState<any | null>(null);
  const [wishlist, setWishlist] = useState<any[]>([]);
  const [showWishlist, setShowWishlist] = useState(false);
  const [compare, setCompare] = useState<any[]>([]);
  const [showCompare, setShowCompare] = useState(false);
  const wishlistIds = useMemo(() => new Set(wishlist.map((w) => w.id)), [wishlist]);
  const toggleWishlist = (p: any) => { setWishlist((prev) => (prev.some((x) => x.id === p.id) ? prev.filter((x) => x.id !== p.id) : [...prev, p])); setShowWishlist(true); };
  const addCompare = (p: any) => { setCompare((prev) => (prev.some((x) => x.id === p.id) ? prev : [...prev, p].slice(-4))); setShowCompare(true); };

  const cartCount = carrito.reduce((s, i) => s + Number(i?.cantidad || 1), 0);
  const cartTotal = carrito.reduce((s, i) => s + Number(i?.precioUnitario || 0) * Number(i?.cantidad || 1), 0);
  const openProduct = (p: any) => navigate(withPreviewQuery(`/tienda/${slug}/producto/${p.id}`, diseno));
  const goCatalog = (extra = '') => navigate(withPreviewQuery(`/tienda/${slug}/catalogo${extra}`, diseno));
  const goCheckout = () => navigate(withPreviewQuery(`/tienda/${slug}/checkout`, diseno), { state: { carrito, tienda } });

  const categoryCircles = useMemo(() => allCategorías
    .map((c) => {
      const name = getName(c);
      const inCat = catalogProducts.filter((p) => catOf(p).toLowerCase() === name.toLowerCase());
      const img = (typeof c === 'object' && c?.imagenUrl) || getImg(inCat[0]) || '';
      return { name, img, count: inCat.length };
    })
    .filter((c) => c.name).slice(0, 8), [allCategorías, catalogProducts]);
  const categoryNames = useMemo(() => categoryCircles.map((c) => c.name), [categoryCircles]);

  // Categorías reales con la cantidad de productos en cada una (para el sidebar).
  // Usa la lista completa para que siempre aparezcan todas, aun con un filtro activo.
  const categoryCounts = useMemo(() => categoryNames
    .map((name) => ({ name, count: catalogProducts.filter((p) => catOf(p).toLowerCase() === name.toLowerCase()).length }))
    .filter((c) => c.count > 0), [categoryNames, catalogProducts]);

  const inStockCount = productos.filter((p) => Number(p?.stock ?? 1) > 0).length;
  const outStockCount = productos.filter((p) => Number(p?.stock ?? 1) <= 0).length;

  const displayed = useMemo(() => {
    let list = sortedProductos;
    if (avail.in && !avail.out) list = list.filter((p) => Number(p?.stock ?? 1) > 0);
    else if (avail.out && !avail.in) list = list.filter((p) => Number(p?.stock ?? 1) <= 0);
    return list;
  }, [sortedProductos, avail]);

  const gridCls = view === 'list' ? 'grid-cols-1' : view === '2' ? 'grid-cols-1 sm:grid-cols-2' : view === '3' ? 'grid-cols-2 lg:grid-cols-3' : 'grid-cols-2 lg:grid-cols-4';

  const SidebarSection = ({ title, onReset, children }: { title: string; onReset?: () => void; children: React.ReactNode }) => (
    <div className="border-t border-gray-100 pt-6">
      <div className="mb-4 flex items-center justify-between">
        <p className="inline-flex items-center gap-2 text-base font-black text-[#151515]"><span className="text-gray-400">−</span> {title}</p>
        {onReset && <button type="button" onClick={onReset} className="text-xs font-bold text-gray-400 hover:text-[#151515]">Restablecer</button>}
      </div>
      {children}
    </div>
  );

  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: `'${diseno?.tipografia || 'Inter'}', sans-serif` }}>
      <FalconHeader tienda={tienda} slug={slug} green={green} cartCount={cartCount} cartTotal={cartTotal} onOpenCart={() => setMostrarCarrito(true)} diseno={diseno} categories={allCategorías} products={catalogProducts} />

      {/* Banner */}
      <motion.div initial="hidden" animate="show" variants={falconFadeUp} className="relative flex min-h-[220px] items-center justify-center overflow-hidden bg-[#151515] px-4">
        {banner && (<><img src={banner} alt="" className="absolute inset-0 h-full w-full object-cover" /><div className="absolute inset-0 bg-black/25" /></>)}
        <h1 className="relative z-10 text-center text-4xl font-black text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.7)] md:text-5xl">{editable(diseno?.falconCatalogTitle, 'Productos')}</h1>
      </motion.div>

      {/* Category circles */}
      {categoryCircles.length > 0 && (
        <div className="mx-auto max-w-[1400px] px-4 py-10 lg:px-6">
          <motion.div initial="hidden" whileInView="show" viewport={{ once: true, margin: '-80px' }} variants={falconStagger} className="grid grid-cols-3 gap-y-8 sm:grid-cols-4 lg:grid-cols-8">
            {categoryCircles.map((c) => (
              <motion.button key={c.name} type="button" onClick={() => goCatalog(`?category=${encodeURIComponent(c.name)}`)} variants={falconFadeUp} whileHover={{ y: -4 }} whileTap={falconTap} className="group flex flex-col items-center gap-3">
                <span className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full bg-[#eeeeee] transition-transform group-hover:scale-105">{c.img ? <img src={c.img} alt={c.name} className="h-full w-full object-cover" loading="lazy" /> : <Icon icon="solar:box-bold-duotone" width={40} className="text-gray-400" />}</span>
                <span className="text-center"><span className="block text-sm font-bold text-[#151515]">{c.name}</span><span className="block text-xs font-semibold text-gray-400">{c.count >= 10 ? '10 + items' : c.count > 0 ? `${c.count} items` : '+ items'}</span></span>
              </motion.button>
            ))}
          </motion.div>
        </div>
      )}

      {/* Gray zone: filters + grid */}
      <div className="bg-[#ececec]">
        <div className="mx-auto grid max-w-[1400px] gap-6 px-4 py-10 lg:grid-cols-[300px_1fr] lg:px-6">
          {/* Sidebar */}
          <motion.aside initial="hidden" animate="show" variants={falconScaleIn} className="h-fit rounded-2xl bg-white p-6 lg:sticky lg:top-24">
            <div className="relative">
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={editable(diseno?.falconCatalogSearchPlaceholder, 'Buscar aquí')} className="h-12 w-full rounded-md border border-gray-200 pl-4 pr-11 text-sm outline-none placeholder:text-gray-400 focus:border-[#151515]" />
              <Icon icon="solar:magnifer-linear" width={20} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" />
            </div>

            <div className="mt-6">
              <div className="mb-4 flex items-center justify-between">
                <p className="text-base font-black text-[#151515]">{editable(diseno?.falconCatalogCategoriesTitle, 'Categorías de producto')}</p>
                {selectedCategorías.length > 0 && (
                  <button type="button" onClick={() => selectedCategorías.forEach((c: string) => toggleCategory(c))} className="text-xs font-bold text-gray-400 hover:text-[#151515]">Restablecer</button>
                )}
              </div>
              <div className="space-y-3 text-sm">
                {categoryCounts.length > 0 ? categoryCounts.map(({ name, count }) => (
                  <button key={name} type="button" onClick={() => toggleCategory(name)} className="flex w-full items-center justify-between text-left transition-colors" style={selectedCategorías.includes(name) ? { color: green } : undefined}>
                    <span className="inline-flex items-center gap-2 hover:opacity-70">
                      <span className="h-2 w-2 rounded-full" style={{ background: selectedCategorías.includes(name) ? green : '#d1d5db' }} />
                      {name}
                    </span>
                    <span className="text-gray-400">({count})</span>
                  </button>
                )) : <p className="text-gray-400">Sin categorías.</p>}
              </div>
            </div>

            <SidebarSection title={editable(diseno?.falconCatalogAvailabilityTitle, 'Disponibilidad')} onReset={() => setAvail({ in: false, out: false })}>
              <label className="mb-3 flex cursor-pointer items-center gap-3 text-sm">
                <input type="checkbox" checked={avail.in} onChange={(e) => setAvail((a) => ({ ...a, in: e.target.checked }))} className="h-4 w-4 rounded border-gray-300" style={{ accentColor: green }} />
                En stock ({inStockCount})
              </label>
              <label className="flex cursor-pointer items-center gap-3 text-sm">
                <input type="checkbox" checked={avail.out} onChange={(e) => setAvail((a) => ({ ...a, out: e.target.checked }))} className="h-4 w-4 rounded border-gray-300" style={{ accentColor: green }} />
                Agotado ({outStockCount})
              </label>
            </SidebarSection>

            <SidebarSection title={editable(diseno?.falconCatalogPriceTitle, 'Precio')} onReset={() => setPriceRange([minPrice, maxPrice])}>
              <p className="mb-3 text-sm text-gray-500">El precio más alto es <span className="font-bold text-[#151515]">{money(maxPrice)}</span></p>
              <input type="range" min={minPrice} max={maxPrice} value={priceRange[1]} onChange={(e) => setPriceRange([priceRange[0], Number(e.target.value)])} className="w-full" style={{ accentColor: green }} />
              <div className="mt-4 flex items-center gap-2">
                <span className="text-sm font-bold text-gray-400">S/</span>
                <input type="number" value={priceRange[0]} onChange={(e) => setPriceRange([Number(e.target.value), priceRange[1]])} placeholder="Desde" className="h-11 w-full rounded-md border border-gray-200 px-3 text-sm outline-none focus:border-[#151515]" />
                <input type="number" value={priceRange[1]} onChange={(e) => setPriceRange([priceRange[0], Number(e.target.value)])} placeholder="Hasta" className="h-11 w-full rounded-md border border-gray-200 px-3 text-sm outline-none focus:border-[#151515]" />
              </div>
            </SidebarSection>

            {categoryNames.length > 0 && (
              <SidebarSection title={editable(diseno?.falconCatalogTypeTitle, 'Tipo de producto')}>
                <div className="space-y-3 text-sm">
                  {categoryNames.map((nm) => {
                    const count = productos.filter((p) => catOf(p).toLowerCase() === nm.toLowerCase()).length;
                    return (
                      <label key={nm} className="flex cursor-pointer items-center gap-3">
                        <input type="checkbox" checked={selectedCategorías.includes(nm)} onChange={() => toggleCategory(nm)} className="h-4 w-4 rounded border-gray-300" style={{ accentColor: green }} />
                        {nm} ({count})
                      </label>
                    );
                  })}
                </div>
              </SidebarSection>
            )}
          </motion.aside>

          {/* Grid */}
          <div>
            {/* Toolbar */}
            <motion.div initial="hidden" animate="show" variants={falconFadeUp} className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-white px-6 py-4 shadow-sm">
              <div className="flex items-center gap-5">
                <div className="hidden items-center gap-3 text-gray-400 sm:flex">
                  {([['2', 'solar:widget-2-linear'], ['3', 'solar:widget-4-linear'], ['4', 'solar:widget-6-linear'], ['list', 'solar:list-linear']] as const).map(([v, ic]) => (
                    <button key={v} type="button" onClick={() => setView(v)} className="transition-colors" style={view === v ? { color: green } : undefined}><Icon icon={ic} width={22} /></button>
                  ))}
                </div>
                <span className="text-sm font-semibold text-gray-500">{displayed.length} productos</span>
              </div>
              <label className="flex items-center gap-2 text-sm text-gray-500">
                {editable(diseno?.falconCatalogSortLabel, 'Ordenar por:')}
                <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="rounded-md border border-gray-200 px-3 py-2 text-sm font-semibold text-[#151515] outline-none">
                  {SORT_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </label>
            </motion.div>

            {loading ? (
              <div className={`grid gap-5 ${gridCls}`}>{Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-[440px] animate-pulse rounded-2xl bg-gray-100" />)}</div>
            ) : displayed.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 rounded-2xl bg-white py-24 text-gray-400">
                <Icon icon="solar:box-linear" width={72} /><p className="text-sm font-semibold">{editable(diseno?.falconCatalogEmptyText, 'No se encontraron productos.')}</p>
              </div>
            ) : (
              <motion.div layout initial="hidden" animate="show" variants={falconStagger} className={`grid gap-5 ${gridCls}`}>
                {displayed.map((p, i) => (
                  <FalconProductCard key={`${p.id || p.descripcion}-${i}`} producto={p} green={green} diseno={diseno} onOpen={() => openProduct(p)} onAdd={() => handleAgregarProducto(p)} onQuickView={() => setQuickView(p)} onWishlist={() => toggleWishlist(p)} onCompare={() => addCompare(p)} inWishlist={wishlistIds.has(p.id)} />
                ))}
              </motion.div>
            )}
          </div>
        </div>
      </div>

      <FalconFooter tienda={tienda} slug={slug} green={green} categories={categoryNames} diseno={diseno} />

      <FalconCartDrawer isOpen={mostrarCarrito} onClose={() => setMostrarCarrito(false)} carrito={carrito} actualizarCantidad={actualizarCantidad} onCheckout={() => { setMostrarCarrito(false); if (diseno?.__previewPlantillaId) goCheckout(); else irACheckout(); }} onViewCart={() => { setMostrarCarrito(false); goCatalog(); }} green={green} diseno={diseno} tienda={tienda} />
      <FalconWishlistDrawer isOpen={showWishlist} onClose={() => setShowWishlist(false)} items={wishlist} onRemove={(id) => setWishlist((prev) => prev.filter((x) => x.id !== id))} onViewAll={() => setShowWishlist(false)} green={green} />
      <FalconCompareModal isOpen={showCompare} onClose={() => setShowCompare(false)} items={compare} onRemove={(id) => setCompare((prev) => prev.filter((x) => x.id !== id))} onRemoveAll={() => { setCompare([]); setShowCompare(false); }} onAdd={(p) => { handleAgregarProducto(p); setShowCompare(false); setMostrarCarrito(true); }} green={green} />
      <AnimatePresence>
        {quickView && <FalconQuickView producto={quickView} green={green} onClose={() => setQuickView(null)} onAdd={() => { handleAgregarProducto(quickView); setQuickView(null); setMostrarCarrito(true); }} onOpen={() => { const p = quickView; setQuickView(null); openProduct(p); }} />}
      </AnimatePresence>
    </div>
  );
}
