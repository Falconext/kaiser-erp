import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '@iconify/react';
import UrbanoHeader from './UrbanoHeader';
import UrbanoFooter from './UrbanoFooter';
import UrbanoProductCard from './UrbanoProductCard';
import { getUrbanoTemplateCategories, getUrbanoTemplateProducts, isUrbanoTemplateProduct } from './urbanoTemplateProducts';

const IMPACT = '"Impact", "Arial Black", sans-serif';

const SORT_OPTIONS = [
    { value: 'relevance', label: 'Relevantes' },
    { value: 'price-asc', label: 'Precio: menor a mayor' },
    { value: 'price-desc', label: 'Precio: mayor a menor' },
    { value: 'name-asc', label: 'Nombre A-Z' },
];

const nameOf = (item: any) => (typeof item === 'string' ? item : item?.nombre || '');
const productImage = (product: any) =>
    product?.imagenUrl || product?.imagenesExtra?.[0] || product?.variantes?.find((variant: any) => variant?.imagenUrl)?.imagenUrl || '';
const productCategoryName = (product: any) =>
    typeof product?.categoria === 'object' ? product.categoria?.nombre : product?.categoria;

interface UrbanoCatalogPageProps {
    slug: string;
    tienda: any;
    cp: string;
    productos: any[];
    total: number;
    loading: boolean;
    allCategorias: any[];
    allMarcas: any[];
    selectedCategorias: string[];
    setSelectedCategorias: (v: string[]) => void;
    selectedMarcas: string[];
    setSelectedMarcas: (v: string[]) => void;
    priceRange: [number, number];
    setPriceRange: (v: [number, number]) => void;
    minPrice: number;
    maxPrice: number;
    sortBy: string;
    setSortBy: (v: string) => void;
    search: string;
    setSearch: (v: string) => void;
    hasActiveFilters: boolean;
    carritoSize: number;
    onOpenCart: () => void;
    onAddToCart: (p: any) => void;
    onProduct: (p: any) => void;
}

export default function UrbanoCatalogPage(props: UrbanoCatalogPageProps) {
    const {
        slug, tienda, cp, productos, total, loading,
        allCategorias, allMarcas,
        selectedCategorias, setSelectedCategorias,
        selectedMarcas, setSelectedMarcas,
        priceRange, setPriceRange, minPrice, maxPrice,
        sortBy, setSortBy, search, setSearch,
        hasActiveFilters, carritoSize, onOpenCart, onAddToCart, onProduct,
    } = props;

    const navigate = useNavigate();
    const [showMobileFilters, setShowMobileFilters] = useState(false);
    const diseno = tienda?.diseno || {};
    const storeLooksEmpty = !loading && productos.length === 0 && total === 0 && allCategorias.length === 0 && allMarcas.length === 0;
    const displayProducts = storeLooksEmpty ? getUrbanoTemplateProducts(diseno) : productos;
    const displayTotal = storeLooksEmpty ? displayProducts.length : total;
    const fallbackCategories = getUrbanoTemplateCategories(diseno);
    const imageForCategory = (name: string, fallback?: string) => {
        const product = displayProducts.find((item) => String(productCategoryName(item) || '').toLowerCase() === String(name).toLowerCase());
        return productImage(product) || fallback || '/assets/templates/urbano/coleccion1.png';
    };
    const headerCategories = (allCategorias.length > 0
        ? allCategorias.map((cat, index) => {
            const name = nameOf(cat);
            return name ? { nombre: name, imagenUrl: cat?.imagenUrl || imageForCategory(name, fallbackCategories[index]?.imagenUrl) } : null;
        }).filter(Boolean)
        : Array.from(new Set(displayProducts.map(productCategoryName).filter(Boolean))).map((name: any, index) => ({
            nombre: String(name),
            imagenUrl: imageForCategory(String(name), fallbackCategories[index]?.imagenUrl),
        }))
    ) as Array<{ nombre: string; imagenUrl?: string }>;
    const menuCategories = headerCategories.length ? headerCategories : fallbackCategories;

    const toggle = (list: string[], setList: (v: string[]) => void, name: string) => {
        setList(list.includes(name) ? list.filter((n) => n !== name) : [...list, name]);
    };

    const limpiarFiltros = () => {
        setSelectedCategorias([]);
        setSelectedMarcas([]);
        setPriceRange([minPrice, maxPrice]);
        setSearch('');
    };

    const Filtros = () => (
        <div className="space-y-10">
            {/* Categories */}
            {allCategorias.length > 0 && (
                <div>
                    <h4 className="text-[11px] font-bold tracking-[0.2em] uppercase text-black mb-4 border-b-2 border-black pb-2">Categorías</h4>
                    <div className="space-y-2.5">
                        {allCategorias.map((cat, i) => {
                            const name = nameOf(cat);
                            if (!name) return null;
                            const active = selectedCategorias.includes(name);
                            return (
                                <button
                                    key={`${name}-${i}`}
                                    onClick={() => toggle(selectedCategorias, setSelectedCategorias, name)}
                                    className="flex items-center gap-3 group w-full text-left"
                                >
                                    <span className={`w-4 h-4 border-2 border-black flex items-center justify-center flex-shrink-0 transition-colors ${active ? 'bg-black' : 'bg-white'}`}>
                                        {active && <Icon icon="mdi:check" className="text-white" width={12} />}
                                    </span>
                                    <span className={`text-[12px] uppercase tracking-wide font-bold transition-colors ${active ? 'text-black' : 'text-gray-500 group-hover:text-black'}`}>
                                        {name}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Price */}
            <div>
                <h4 className="text-[11px] font-bold tracking-[0.2em] uppercase text-black mb-4 border-b-2 border-black pb-2">Precio</h4>
                <div className="flex items-center gap-3">
                    <div className="relative flex-1">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-bold">S/</span>
                        <input
                            type="number"
                            min={minPrice}
                            value={priceRange[0]}
                            onChange={(e) => setPriceRange([Number(e.target.value), priceRange[1]])}
                            className="w-full border-2 border-gray-200 focus:border-black pl-7 pr-2 py-2 text-sm outline-none"
                        />
                    </div>
                    <span className="text-gray-400">—</span>
                    <div className="relative flex-1">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-bold">S/</span>
                        <input
                            type="number"
                            max={maxPrice}
                            value={priceRange[1]}
                            onChange={(e) => setPriceRange([priceRange[0], Number(e.target.value)])}
                            className="w-full border-2 border-gray-200 focus:border-black pl-7 pr-2 py-2 text-sm outline-none"
                        />
                    </div>
                </div>
            </div>

            {/* Brands */}
            {allMarcas.length > 0 && (
                <div>
                    <h4 className="text-[11px] font-bold tracking-[0.2em] uppercase text-black mb-4 border-b-2 border-black pb-2">Marcas</h4>
                    <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                        {allMarcas.map((brand, i) => {
                            const name = nameOf(brand);
                            if (!name) return null;
                            const active = selectedMarcas.includes(name);
                            return (
                                <button
                                    key={`${name}-${i}`}
                                    onClick={() => toggle(selectedMarcas, setSelectedMarcas, name)}
                                    className="flex items-center gap-3 group w-full text-left"
                                >
                                    <span className={`w-4 h-4 border-2 border-black flex items-center justify-center flex-shrink-0 transition-colors ${active ? 'bg-black' : 'bg-white'}`}>
                                        {active && <Icon icon="mdi:check" className="text-white" width={12} />}
                                    </span>
                                    <span className={`text-[12px] uppercase tracking-wide font-bold transition-colors ${active ? 'text-black' : 'text-gray-500 group-hover:text-black'}`}>
                                        {name}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {hasActiveFilters && (
                <button
                    onClick={limpiarFiltros}
                    className="w-full border-2 border-black py-3 text-[11px] font-bold tracking-[0.15em] uppercase hover:bg-black hover:text-white transition-colors"
                >
                    Limpiar filtros
                </button>
            )}
        </div>
    );

    return (
        <div className="bg-white min-h-screen text-black overflow-x-hidden" style={{ fontFamily: '"Inter", sans-serif' }}>
            <UrbanoHeader
                tienda={tienda}
                slug={slug}
                cp={cp}
                carritoSize={carritoSize}
                onOpenCart={onOpenCart}
                searchQuery={search}
                setSearchQuery={setSearch}
                onSearchSubmit={(e: any, value: string) => { e.preventDefault(); setSearch(value); }}
                categories={menuCategories}
                onCategorySelect={(category) => {
                    setSelectedCategorias([category]);
                    setShowMobileFilters(false);
                    if (slug !== 'preview') {
                        navigate(`/tienda/${slug}/catalogo?category=${encodeURIComponent(category)}`);
                    }
                }}
            />

            <div className="max-w-[1600px] mx-auto px-4 md:px-8 pt-8 pb-20">

                {/* Title */}
                <div className="border-b-2 border-black pb-6 mb-8">
                    <p className="text-[11px] font-bold tracking-[0.25em] uppercase text-gray-400 mb-3">Tienda</p>
                    <h1 className="text-4xl md:text-6xl font-black tracking-tighter uppercase text-black leading-none" style={{ fontFamily: IMPACT }}>
                        {selectedCategorias[0] || 'Catálogo'}
                    </h1>
                </div>

                {/* Toolbar */}
                <div className="flex items-center justify-between gap-3 mb-8">
                    <p className="text-[11px] font-bold tracking-[0.15em] uppercase text-gray-500 shrink-0">
                        {loading ? 'Cargando…' : `${displayTotal} ${displayTotal === 1 ? 'producto' : 'productos'}`}
                    </p>
                    <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                        <button
                            onClick={() => setShowMobileFilters(true)}
                            className="lg:hidden flex items-center gap-1.5 border-2 border-black px-3 sm:px-4 py-2 text-[11px] font-bold tracking-[0.15em] uppercase shrink-0"
                        >
                            Filtros <Icon icon="solar:filter-linear" width={15} />
                        </button>
                        {/* Ancho fijo: evita que el <select> nativo se ensanche a la opción
                            más larga ("Precio: menor a mayor") y desborde en mobile. */}
                        <div className="relative w-[9.5rem] sm:w-44 shrink-0">
                            <select
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value)}
                                className="w-full appearance-none truncate border-2 border-black bg-white pl-3 sm:pl-4 pr-9 py-2 text-[11px] font-bold tracking-[0.1em] uppercase outline-none cursor-pointer hover:bg-black hover:text-white transition-colors"
                            >
                                {SORT_OPTIONS.map((o) => (
                                    <option key={o.value} value={o.value} className="text-black normal-case">{o.label}</option>
                                ))}
                            </select>
                            <Icon icon="solar:alt-arrow-down-linear" width={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                        </div>
                    </div>
                </div>

                {/* Active filter chips */}
                {hasActiveFilters && (
                    <div className="flex flex-wrap items-center gap-2 mb-8">
                        {[...selectedCategorias, ...selectedMarcas].map((name) => (
                            <button
                                key={name}
                                onClick={() => {
                                    if (selectedCategorias.includes(name)) toggle(selectedCategorias, setSelectedCategorias, name);
                                    else toggle(selectedMarcas, setSelectedMarcas, name);
                                }}
                                className="flex items-center gap-1.5 border border-black px-3 py-1.5 text-[10px] font-bold tracking-[0.1em] uppercase hover:bg-black hover:text-white transition-colors"
                            >
                                {name} <Icon icon="mdi:close" width={13} />
                            </button>
                        ))}
                        <button
                            onClick={limpiarFiltros}
                            className="text-[10px] font-bold tracking-[0.1em] uppercase text-gray-400 hover:text-black underline underline-offset-4 ml-1"
                        >
                            Limpiar todo
                        </button>
                    </div>
                )}

                <div className="flex gap-10">
                    {/* Sidebar (desktop) */}
                    <aside className="hidden lg:block w-60 flex-shrink-0">
                        <div className="sticky top-28">
                            <Filtros />
                        </div>
                    </aside>

                    {/* Grid */}
                    <div className="flex-1 min-w-0">
                        {loading ? (
                            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-x-4 gap-y-10">
                                {Array.from({ length: 8 }).map((_, i) => (
                                    <div key={i} className="animate-pulse">
                                        <div className="w-full aspect-[4/5] bg-[#F4F5F6] mb-4" />
                                        <div className="h-3 bg-gray-100 w-3/4 mb-2" />
                                        <div className="h-3 bg-gray-100 w-1/3" />
                                    </div>
                                ))}
                            </div>
                        ) : displayProducts.length > 0 ? (
                            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-x-4 gap-y-10">
                                {displayProducts.map((producto) => (
                                    <UrbanoProductCard
                                        key={producto.id}
                                        producto={producto}
                                        slug={slug}
                                        onClick={() => {
                                            if (isUrbanoTemplateProduct(producto)) return;
                                            window.scrollTo(0, 0);
                                            onProduct(producto);
                                        }}
                                        onAddToCart={() => {
                                            if (!isUrbanoTemplateProduct(producto)) onAddToCart(producto);
                                        }}
                                    />
                                ))}
                            </div>
                        ) : (
                            <div className="w-full py-32 flex flex-col items-center justify-center text-center">
                                <Icon icon="solar:bag-cross-linear" className="text-6xl text-gray-300 mb-4" />
                                <h3 className="text-lg font-black uppercase tracking-tighter text-black mb-2" style={{ fontFamily: IMPACT }}>
                                    No encontramos productos
                                </h3>
                                <p className="text-sm text-gray-500 mb-6">Prueba ajustando los filtros o la búsqueda.</p>
                                {hasActiveFilters && (
                                    <button
                                        onClick={limpiarFiltros}
                                        className="border-2 border-black px-6 py-3 text-[11px] font-bold tracking-[0.15em] uppercase hover:bg-black hover:text-white transition-colors"
                                    >
                                        Limpiar filtros
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Mobile filters drawer */}
            {showMobileFilters && (
                <div className="fixed inset-0 z-[999999] flex lg:hidden" style={{ fontFamily: '"Inter", sans-serif' }}>
                    <div className="absolute inset-0 bg-black/50" onClick={() => setShowMobileFilters(false)} />
                    <div className="relative w-full max-w-[340px] bg-white h-full shadow-2xl flex flex-col border-r-2 border-black animate-in slide-in-from-left duration-300">
                        <div className="px-6 py-5 border-b-2 border-black flex items-center justify-between">
                            <h2 className="text-xl font-black tracking-tighter uppercase" style={{ fontFamily: IMPACT }}>Filtros</h2>
                            <button
                                onClick={() => setShowMobileFilters(false)}
                                className="w-9 h-9 border-2 border-black flex items-center justify-center hover:bg-black hover:text-white transition-colors"
                            >
                                <Icon icon="mdi:close" width={18} />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto px-6 py-6">
                            <Filtros />
                        </div>
                        <div className="p-6 border-t-2 border-black">
                            <button
                                onClick={() => setShowMobileFilters(false)}
                                className="w-full bg-black text-white py-3.5 text-[11px] font-bold tracking-[0.2em] uppercase border-2 border-black hover:bg-white hover:text-black transition-colors"
                            >
                                Ver {displayTotal} resultados
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <UrbanoFooter tienda={tienda} diseno={diseno} slug={slug} categories={headerCategories} />
        </div>
    );
}
