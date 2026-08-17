import { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Icon } from '@iconify/react';
import axios from 'axios';
import StoreHeader from '@/components/tienda/StoreHeader';
import XtraHeader from '@/components/tienda/XtraHeader';
import Footer from '@/components/tienda/Footer';
import ProductCardPio from '@/components/tienda/ProductCardPio';
import ProductCardEmox from '@/components/tienda/ProductCardEmox';
import ProductCardGlamora from '@/components/tienda/ProductCardGlamora';
import ProductCardGromuse from '@/components/tienda/ProductCardGromuse';
import ProductCardCatalog from '@/components/tienda/ProductCardCatalog';
import { resolveTemplate, resolveTemplateId } from '@/components/tienda/resolveTemplate';
import StoreWhatsAppButton from '@/components/tienda/StoreWhatsAppButton';
import ProductCustomizationModal from '@/components/tienda/ProductCustomizationModal';
import ShoppingCartModal from '@/components/tienda/ShoppingCartModal';
import GadgetsCartModal from '@/components/tienda/GadgetsCartModal';
import AutopartesHeader from '@/components/tienda/AutopartesHeader';
import AutopartesCartModal from '@/components/tienda/AutopartesCartModal';
import { useCompareStore } from '@/zustand/compare';
import { onTiendaCartCleared, persistTiendaCart, tiendaCartKey } from '@/utils/tiendaCart';
import { withPricingList } from '@/templates/shared/pricing';
import { useStorePreviewNavigation } from '@/utils/useStorePreviewNavigation';

import { getRubroDemo } from '@/data/rubroDemo';
import AutopartesCatalog from '@/components/tienda/AutopartesCatalog';
import AutopartesFooter from '@/components/tienda/AutopartesFooter';
import ModaHeader from '@/components/tienda/ModaHeader';
import UrbanoCatalogoPage from '@/templates/urbano/UrbanoCatalogoPage';
import UrbanoCatalogPage from '@/templates/urbano/UrbanoCatalogPage';
import UrbanoCartModal from '@/components/tienda/UrbanoCartModal';
import ModaFooter from '@/components/tienda/ModaFooter';
import ModaCartModal from '@/components/tienda/ModaCartModal';
import MayeCatalogoPage from '@/templates/maye/MayeCatalogoPage';
import { templateRegistry } from '@/templates/registry';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4001/api';

export default function Catalogo() {
    const { slug } = useParams();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const previewPlantillaId = searchParams.get('previewPlantilla');
    useStorePreviewNavigation(previewPlantillaId);

    const [tienda, setTienda] = useState<any>(null);
    const [productos, setProductos] = useState<any[]>([]);
    // Lista completa (sin filtros) para círculos de categoría y mega-menú del header,
    // que deben mostrar TODAS las categorías aunque haya un filtro activo.
    const [allProductos, setAllProductos] = useState<any[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    // true cuando la carga de productos FALLA (red/API/caché). Se distingue de
    // "0 resultados": un fallo no debe disfrazarse de catálogo vacío.
    const [cargaError, setCargaError] = useState(false);
    const [page, setPage] = useState(1);
    const limit = 30;

    const [carrito, setCarrito] = useState<any[]>([]);
    const [isCartLoaded, setIsCartLoaded] = useState(false);
    const [mostrarCarrito, setMostrarCarrito] = useState(false);

    const [search, setSearch] = useState(searchParams.get('search') || '');
    const [isAdminOpen, setIsAdminOpen] = useState(false);
    const adminMenuRef = useRef<HTMLDivElement | null>(null);

    const [allMarcas, setAllMarcas] = useState<any[]>([]);
    const [allCategorías, setAllCategorías] = useState<any[]>([]);
    const [selectedMarcas, setSelectedMarcas] = useState<string[]>(() => {
        const b = searchParams.get('brand');
        return b ? [b] : [];
    });
    const [selectedCategorías, setSelectedCategorías] = useState<string[]>(() => {
        const c = searchParams.get('category');
        return c ? [c] : [];
    });
    const [priceRange, setPriceRange] = useState<[number, number]>([0, 1000]);
    const [minPrice, setMinPrice] = useState(0);
    const [maxPrice, setMaxPrice] = useState(1000);
    const [sortBy, setSortBy] = useState(searchParams.get('sort') || 'relevance');
    const [wholesaleOnly, setWholesaleOnly] = useState(searchParams.get('wholesale') === 'true');
    const [brandSearch, setBrandSearch] = useState('');
    const [openSections, setOpenSections] = useState({ categories: true, price: true, brands: true });
    const [showMobileFilters, setShowMobileFilters] = useState(false);

    const [showPersonalizarModal, setShowPersonalizarModal] = useState(false);
    const [productoAPersonalizar, setProductoAPersonalizar] = useState<any>(null);
    const [modificadoresProducto, setModificadoresProducto] = useState<any[]>([]);

    useEffect(() => {
        cargarTienda();
        cargarMarcas();
        cargarCategorias();
        cargarRangoPrecios();
        cargarTodosProductos();
        try {
            const saved = localStorage.getItem(tiendaCartKey(slug || ''));
            if (saved) setCarrito(JSON.parse(saved));
        } catch { }
        setIsCartLoaded(true);
    }, [slug]);

    useEffect(() => {
        if (!isCartLoaded) return;
        persistTiendaCart(slug || '', carrito);
    }, [carrito, isCartLoaded, slug]);

    useEffect(() => {
        if (!slug) return;
        return onTiendaCartCleared(slug, () => {
            setCarrito([]);
            setMostrarCarrito(false);
        });
    }, [slug]);

    useEffect(() => {
        const t = setTimeout(() => {
            setLoading(true);
            setProductos([]);
            setPage(1);
            setTotal(0);
            cargarProductos(1, true);
        }, 350);
        return () => clearTimeout(t);
    }, [search, selectedMarcas, selectedCategorías, priceRange, wholesaleOnly]);

    // Sincroniza el parámetro ?category de la URL con el filtro seleccionado.
    // Así los círculos de categoría (que solo navegan a ?category=X) y los enlaces
    // directos filtran en vivo, no solo al montar la página.
    useEffect(() => {
        const c = searchParams.get('category');
        const next = c ? c.split(',').map(s => s.trim()).filter(Boolean) : [];
        setSelectedCategorías(prev => (prev.join('||') === next.join('||') ? prev : next));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchParams.get('category')]);

    useEffect(() => {
        const params = new URLSearchParams();
        const normalizedSearch = search.trim();

        if (normalizedSearch) params.set('search', normalizedSearch);
        if (selectedMarcas.length > 0) params.set('brand', selectedMarcas.join(','));
        if (selectedCategorías.length > 0) params.set('category', selectedCategorías.join(','));
        if (priceRange[0] !== minPrice) params.set('minPrice', String(priceRange[0]));
        if (priceRange[1] !== maxPrice) params.set('maxPrice', String(priceRange[1]));
        if (sortBy !== 'relevance') params.set('sort', sortBy);

        setSearchParams(params, { replace: true });
    }, [search, selectedMarcas, selectedCategorías, priceRange, minPrice, maxPrice, sortBy, setSearchParams]);

    const cargarTienda = async () => {
        try {
            const { data } = await axios.get(`${BASE_URL}/public/store/${slug}`);
            setTienda(data.data || data);
        } catch { }
    };

    const cargarMarcas = async () => {
        try {
            const { data } = await axios.get(`${BASE_URL}/public/store/${slug}/brands`);
            setAllMarcas(Array.isArray(data?.data) ? data.data : []);
        } catch { }
    };

    const cargarCategorias = async () => {
        try {
            const { data } = await axios.get(`${BASE_URL}/public/store/${slug}/categories`);
            setAllCategorías(Array.isArray(data?.data) ? data.data : []);
        } catch { }
    };

    const cargarRangoPrecios = async () => {
        try {
            const { data } = await axios.get(`${BASE_URL}/public/store/${slug}/price-range`);
            const pd = data?.data || { min: 0, max: 1000 };
            setMinPrice(pd.min); setMaxPrice(pd.max); setPriceRange([pd.min, pd.max]);
        } catch { setMinPrice(0); setMaxPrice(1000); setPriceRange([0, 1000]); }
    };

    // Carga todos los productos (sin filtros) una sola vez, para poblar los
    // círculos de categoría y el mega-menú del header con todas las categorías.
    const cargarTodosProductos = async () => {
        try {
            const { data } = await axios.get(`${BASE_URL}/public/store/${slug}/products`, { params: { page: 1, limit: 200 } });
            const items = Array.isArray(data?.data?.data) ? data.data.data : Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
            setAllProductos(withPricingList(items));
        } catch { }
    };

    const cargarProductos = async (p = 1, reset = false) => {
        try {
            const { data } = await axios.get(`${BASE_URL}/public/store/${slug}/products`, {
                params: {
                    page: p, limit,
                    search: search.trim() || undefined,
                    brand: selectedMarcas.length > 0 ? selectedMarcas.join(',') : undefined,
                    category: selectedCategorías.length > 0 ? selectedCategorías.join(',') : undefined,
                    minPrice: priceRange[0] !== minPrice ? priceRange[0] : undefined,
                    maxPrice: priceRange[1] !== maxPrice ? priceRange[1] : undefined,
                    wholesale: wholesaleOnly ? 'true' : undefined,
                },
            });
            let items: any[] = [];
            let totalItems = 0;
            let currentPage = p;
            if (Array.isArray(data?.data?.data)) { items = data.data.data; totalItems = data.data.total ?? items.length; currentPage = data.data.page ?? p; }
            else if (Array.isArray(data?.data)) { items = data.data; totalItems = data.total ?? items.length; currentPage = data.page ?? p; }
            else if (Array.isArray(data)) { items = data; totalItems = data.length; }
            items = withPricingList(items);
            setTotal(totalItems); setPage(currentPage);
            if (reset) setProductos(items); else setProductos(prev => [...prev, ...items]);
            setCargaError(false);
        } catch {
            // No tragar el error en silencio: marcarlo para mostrar un estado
            // de "no se pudo cargar / reintentar" en vez de un catálogo vacío.
            if (reset) setCargaError(true);
        }
        finally { setLoading(false); }
    };

    const cargarModificadores = async (productoId: number) => {
        try {
            const { data } = await axios.get(`${BASE_URL}/public/store/${slug}/products/${productoId}/modifiers`);
            return data.data || data || [];
        } catch { return []; }
    };

    const handleAgregarProducto = async (producto: any) => {
        const mods = await cargarModificadores(producto.id);
        if (mods.length > 0) {
            setProductoAPersonalizar(producto); setModificadoresProducto(mods); setShowPersonalizarModal(true);
        } else { agregarAlCarritoDirecto(producto); }
    };

    const agregarAlCarritoDirecto = (producto: any, modificadores?: any[]) => {
        const itemId = modificadores?.length ? `${producto.id}-${Date.now()}` : producto.id;
        const precioExtra = modificadores?.reduce((sum, mod) => sum + Number(mod.precioExtra || 0), 0) || 0;
        const nuevoItem = { ...producto, id: itemId, productoId: producto.id, cantidad: 1, precioBase: producto.precioUnitario, precioUnitario: Number(producto.precioUnitario) + precioExtra, modificadores: modificadores || [] };
        if (!modificadores?.length) {
            const existe = carrito.find(item => item.id === producto.id && !item.modificadores?.length);
            if (existe) { setCarrito(carrito.map(item => item.id === producto.id && !item.modificadores?.length ? { ...item, cantidad: item.cantidad + 1 } : item)); return; }
        }
        setCarrito([...carrito, nuevoItem]);
    };

    const actualizarCantidad = (productoId: any, cantidad: number) => {
        if (cantidad <= 0) setCarrito(carrito.filter(item => item.id !== productoId));
        else setCarrito(carrito.map(item => item.id === productoId ? { ...item, cantidad } : item));
    };

    const irACheckout = () => navigate(`/tienda/${slug}/checkout`, { state: { carrito, tienda } });

    const toggleSection = (section: keyof typeof openSections) => setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
    const toggleBrand = (name: string) => setSelectedMarcas(prev => prev.includes(name) ? prev.filter(b => b !== name) : [...prev, name]);
    const toggleCategory = (name: string) => setSelectedCategorías(prev => prev.includes(name) ? prev.filter(c => c !== name) : [...prev, name]);

    const filteredMarcas = allMarcas.filter(b => {
        const name = typeof b === 'string' ? b : b.nombre;
        return !brandSearch || name.toLowerCase().includes(brandSearch.toLowerCase());
    });

    const sortedProductos = useMemo(() => {
        const list = [...productos];

        if (sortBy === 'price-asc') {
            return list.sort((a, b) => Number(a.precioUnitario || 0) - Number(b.precioUnitario || 0));
        }

        if (sortBy === 'price-desc') {
            return list.sort((a, b) => Number(b.precioUnitario || 0) - Number(a.precioUnitario || 0));
        }

        if (sortBy === 'name-asc') {
            return list.sort((a, b) => String(a.descripcion || '').localeCompare(String(b.descripcion || '')));
        }

        return list;
    }, [productos, sortBy]);

    const hasActiveFilters = selectedMarcas.length > 0 || selectedCategorías.length > 0 || priceRange[0] !== minPrice || priceRange[1] !== maxPrice;
    const pageTitle = selectedCategorías[0] || selectedMarcas[0] || 'Todos los productos';
    const disenoBase = tienda?.diseno || {};
    const diseno = previewPlantillaId ? {
        ...disenoBase,
        plantillaId: previewPlantillaId,
        __previewPlantillaId: previewPlantillaId,
        __previewQuery: `previewPlantilla=${encodeURIComponent(previewPlantillaId)}&previewOrigen=template`,
    } : disenoBase;
    const cp = diseno.colorPrimario || '#6A6CFF';
    const { getBySlug, clear: clearCompare } = useCompareStore();
    const [showCompareModal, setShowCompareModal] = useState(false);
    const template = resolveTemplate(diseno?.plantillaId);
    const CARD_MAP: Record<string, React.ComponentType<any>> = {
      ProductCardPio,
      ProductCardEmox,
      ProductCardGlamora,
      ProductCardGromuse,
    };
    const ProductCard = CARD_MAP[template.cardComponent] ?? ProductCardPio;

    if (slug === 'preview') {
        const rawConfig = sessionStorage.getItem('store-preview-config');
        if (rawConfig) {
            const config = JSON.parse(rawConfig);
            const demo = getRubroDemo(config.rubroNombre || '');
            const cp = config.colorPrimario || demo.colorDefault || '#6A6CFF';
            
            if (config.plantillaId === 'autopartes') {
                return (
                    <div className="bg-[#FAF5F5] min-h-screen">
                        <AutopartesHeader tienda={{ nombre: demo.storeName, slogan: demo.slogan, diseno: config }} cp={cp} slug="preview" onOpenCart={() => {}} carritoSize={0} searchQuery="" setSearchQuery={() => {}} onSearchSubmit={() => {}} allCategories={[]} />
                        <AutopartesCatalog demo={demo} cp={cp} onProduct={() => {}} onAddToCart={() => {}} />
                        <AutopartesFooter tienda={null} slug="preview" diseno={{ colorPrimario: cp }} />
                    </div>
                );
            }

            if (config.plantillaId === 'urbano') {
                return (
                    <UrbanoCatalogoPage
                        slug="preview"
                        tienda={{ nombre: demo.storeName, slogan: demo.slogan, diseno: config }}
                        productos={demo.products || []}
                        allCategories={demo.categories || []}
                        cp={cp}
                        carritoSize={0}
                        onOpenCart={() => {}}
                        onAddToCart={() => {}}
                        searchQuery=""
                        setSearchQuery={() => {}}
                        onSearchSubmit={() => {}}
                    />
                );
            }
        }
    }

    if (!tienda && loading) {
        return (
            <div className="flex items-center justify-center h-screen bg-white">
                <Icon icon="eos-icons:loading" className="w-12 h-12 text-[#FF9500]" />
            </div>
        );
    }

    // Fallo de carga (sin productos por un error, no por filtros): mostrar un estado
    // claro con "Reintentar" en vez de un catálogo mudo/vacío. Evita que un problema
    // transitorio de red o de caché del navegador se vea como "la tienda no tiene productos".
    if (cargaError && productos.length === 0 && !loading) {
        return (
            <div className="flex flex-col items-center justify-center h-screen bg-white px-6 text-center">
                <Icon icon="solar:wifi-router-minimalistic-broken" className="w-16 h-16 text-gray-300 mb-4" />
                <h2 className="text-lg font-black text-gray-900 mb-1">No pudimos cargar el catálogo</h2>
                <p className="text-sm text-gray-500 mb-6 max-w-sm">
                    Revisa tu conexión a internet e inténtalo de nuevo. Si el problema
                    persiste, recarga la página desde cero.
                </p>
                <button
                    type="button"
                    onClick={() => { setCargaError(false); setLoading(true); cargarProductos(1, true); }}
                    className="rounded-xl px-6 py-3 text-sm font-black text-white"
                    style={{ backgroundColor: cp }}
                >
                    Reintentar
                </button>
            </div>
        );
    }

    const templateId = resolveTemplateId(diseno.plantillaId);
    const templateCatalogoProps = {
        tienda: tienda || {},
        slug: slug || '',
        diseno,
        cp,
        allProductos,
        navigate,
        productos,
        sortedProductos,
        loading,
        total,
        page,
        cargarProductos: (nextPage: number) => cargarProductos(nextPage),
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
        showMobileFilters,
        setShowMobileFilters,
        showPersonalizarModal,
        setShowPersonalizarModal,
        productoAPersonalizar,
        setProductoAPersonalizar,
        modificadoresProducto,
    };

    if (templateId !== 'urbano') {
        const TemplateCatalogo = templateRegistry[templateId]?.CatalogoPage;
        if (TemplateCatalogo) {
            return (
                <>
                    <TemplateCatalogo {...templateCatalogoProps} />
                    <StoreWhatsAppButton tienda={tienda} />
                </>
            );
        }
    }

    if (diseno.plantillaId === 'maye') {
        return (
            <MayeCatalogoPage
                tienda={tienda || {}}
                slug={slug || ''}
                diseno={diseno}
                cp={cp}
                navigate={navigate}
                productos={productos}
                sortedProductos={sortedProductos}
                loading={loading}
                total={total}
                page={page}
                cargarProductos={(nextPage) => cargarProductos(nextPage)}
                allCategorías={allCategorías}
                allMarcas={allMarcas}
                filteredMarcas={filteredMarcas}
                selectedCategorías={selectedCategorías}
                setSelectedCategorías={setSelectedCategorías}
                selectedMarcas={selectedMarcas}
                setSelectedMarcas={setSelectedMarcas}
                priceRange={priceRange}
                setPriceRange={setPriceRange}
                minPrice={minPrice}
                maxPrice={maxPrice}
                sortBy={sortBy}
                setSortBy={setSortBy}
                hasActiveFilters={hasActiveFilters}
                toggleCategory={toggleCategory}
                toggleBrand={toggleBrand}
                search={search}
                setSearch={setSearch}
                carrito={carrito}
                setCarrito={setCarrito}
                mostrarCarrito={mostrarCarrito}
                setMostrarCarrito={setMostrarCarrito}
                actualizarCantidad={actualizarCantidad}
                irACheckout={irACheckout}
                handleAgregarProducto={handleAgregarProducto}
                agregarAlCarritoDirecto={agregarAlCarritoDirecto}
                showMobileFilters={showMobileFilters}
                setShowMobileFilters={setShowMobileFilters}
                showPersonalizarModal={showPersonalizarModal}
                setShowPersonalizarModal={setShowPersonalizarModal}
                productoAPersonalizar={productoAPersonalizar}
                setProductoAPersonalizar={setProductoAPersonalizar}
                modificadoresProducto={modificadoresProducto}
            />
        );
    }

    const FilterSidebar = () => (
        <div className="bg-white rounded-2xl p-4 space-y-1">
            {/* Categorías */}
            {allCategorías.length > 0 && (
                <div className="border-b border-gray-100 pb-4 mb-1">
                    <button onClick={() => toggleSection('categories')} className="w-full flex items-center justify-between py-2 text-sm font-bold text-[#1A1A1A]">
                        Categorías
                        <Icon icon="solar:alt-arrow-down-linear" width={14} className={`transition-transform ${openSections.categories ? 'rotate-180' : ''}`} />
                    </button>
                    {openSections.categories && (
                        <div className="mt-2 space-y-2.5">
                            {allCategorías.map((cat, i) => {
                                const name = typeof cat === 'string' ? cat : cat.nombre;
                                return (
                                    <label key={i} className="flex items-center gap-3 cursor-pointer group" onClick={() => toggleCategory(name)}>
                                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${selectedCategorías.includes(name) ? 'border-[#FF9500]' : 'border-gray-300 group-hover:border-[#FF9500]'}`}>
                                            {selectedCategorías.includes(name) && <div className="w-2 h-2 rounded-full bg-[#FF9500]" />}
                                        </div>
                                        <span className="text-sm text-[#1A1A1A]">{name}</span>
                                    </label>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* Price */}
            <div className="border-b border-gray-100 pb-4 mb-1">
                <button onClick={() => toggleSection('price')} className="w-full flex items-center justify-between py-2 text-sm font-bold text-[#1A1A1A]">
                    Precio
                    <Icon icon="solar:alt-arrow-down-linear" width={14} className={`transition-transform ${openSections.price ? 'rotate-180' : ''}`} />
                </button>
                {openSections.price && (
                    <div className="mt-3 space-y-3">
                        <div className="flex gap-2">
                            <input
                                type="number"
                                placeholder="Desde"
                                value={priceRange[0]}
                                onChange={e => setPriceRange([Number(e.target.value), priceRange[1]])}
                                className="w-1/2 bg-[#F5F5F5] rounded-lg px-3 py-2 text-xs border-none focus:outline-none focus:ring-1 focus:ring-[#FF9500]"
                            />
                            <input
                                type="number"
                                placeholder="Hasta"
                                value={priceRange[1]}
                                onChange={e => setPriceRange([priceRange[0], Number(e.target.value)])}
                                className="w-1/2 bg-[#F5F5F5] rounded-lg px-3 py-2 text-xs border-none focus:outline-none focus:ring-1 focus:ring-[#FF9500]"
                            />
                        </div>
                        <input
                            type="range"
                            min={minPrice} max={maxPrice}
                            value={priceRange[1]}
                            onChange={e => setPriceRange([priceRange[0], Number(e.target.value)])}
                            className="w-full accent-[#FF9500]"
                        />
                    </div>
                )}
            </div>

            {/* Marcas */}
            {allMarcas.length > 0 && (
                <div className="pb-2">
                    <button onClick={() => toggleSection('brands')} className="w-full flex items-center justify-between py-2 text-sm font-bold text-[#1A1A1A]">
                        Marcas
                        <Icon icon="solar:alt-arrow-down-linear" width={14} className={`transition-transform ${openSections.brands ? 'rotate-180' : ''}`} />
                    </button>
                    {openSections.brands && (
                        <div className="mt-2 space-y-3">
                            <div className="flex items-center gap-2 bg-[#F5F5F5] rounded-lg px-3 py-2">
                                <Icon icon="solar:magnifer-linear" className="text-gray-400" width={14} />
                                <input
                                    type="text"
                                    placeholder="Buscar"
                                    value={brandSearch}
                                    onChange={e => setBrandSearch(e.target.value)}
                                    className="bg-transparent text-xs border-none focus:outline-none w-full"
                                />
                            </div>
                            <div className="space-y-2.5 max-h-52 overflow-y-auto pr-1">
                                {filteredMarcas.map((brand, i) => {
                                    const name = typeof brand === 'string' ? brand : brand.nombre;
                                    return (
                                        <label key={i} className="flex items-center gap-3 cursor-pointer group" onClick={() => toggleBrand(name)}>
                                            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${selectedMarcas.includes(name) ? 'border-[#FF9500]' : 'border-gray-300 group-hover:border-[#FF9500]'}`}>
                                                {selectedMarcas.includes(name) && <div className="w-2 h-2 rounded-full bg-[#FF9500]" />}
                                            </div>
                                            <span className="text-sm text-[#1A1A1A]">{name}</span>
                                        </label>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {hasActiveFilters && (
                <button
                    onClick={() => { setSelectedMarcas([]); setSelectedCategorías([]); setPriceRange([minPrice, maxPrice]); }}
                    className="w-full mt-3 py-2 text-xs font-bold text-[#FF9500] border border-[#FF9500] rounded-full hover:bg-[#FF9500] hover:text-white transition-colors"
                >
                    Limpiar filtros
                </button>
            )}
        </div>
    );

    // ── Gadgets catalog layout ────────────────────────────────────────────────
    if (diseno.plantillaId === 'gadgets') {
        const [priceMin, setPriceMin] = [priceRange[0], (v: number) => setPriceRange([v, priceRange[1]])];

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
                                        <input
                                            type="checkbox"
                                            checked={selectedCategorías.includes(name)}
                                            onChange={() => toggleCategory(name)}
                                            className="rounded border-gray-300"
                                            style={{ accentColor: cp }}
                                        />
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
                                        <input
                                            type="checkbox"
                                            checked={selectedMarcas.includes(name)}
                                            onChange={() => toggleBrand(name)}
                                            className="rounded border-gray-300"
                                            style={{ accentColor: cp }}
                                        />
                                        <span className="text-gray-600 text-xs">{name}</span>
                                    </label>
                                );
                            })}
                        </div>
                    </div>
                )}

                <div>
                    <p className="font-semibold text-gray-700 mb-2.5">Condición</p>
                    <div className="space-y-2">
                        {['Nuevo', 'Segunda mano'].map(c => (
                            <label key={c} className="flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" className="rounded border-gray-300" style={{ accentColor: cp }} />
                                <span className="text-gray-600 text-xs">{c}</span>
                            </label>
                        ))}
                    </div>
                </div>

                <div>
                    <div className="flex items-center justify-between mb-2">
                        <p className="font-semibold text-gray-700">Precio mínimo</p>
                        <span className="text-[11px] font-bold text-white px-1.5 py-0.5 rounded" style={{ background: cp }}>
                            S/ {priceMin}
                        </span>
                    </div>
                    <input
                        type="range" min={minPrice} max={maxPrice} value={priceRange[0]}
                        onChange={e => setPriceMin(Number(e.target.value))}
                        className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
                        style={{ accentColor: cp }}
                    />
                    <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                        <span>S/ {minPrice}</span><span>S/ {maxPrice}</span>
                    </div>
                </div>

                {hasActiveFilters && (
                    <button
                        onClick={() => { setSelectedMarcas([]); setSelectedCategorías([]); setPriceRange([minPrice, maxPrice]); }}
                        className="w-full py-2 text-xs font-bold rounded-full border transition-all"
                        style={{ color: cp, borderColor: cp }}
                    >
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
                    onSelectCategory={(cat) => {
                        if (cat === '') setSelectedCategorías([]);
                        else setSelectedCategorías([cat]);
                    }}
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
                                {(selectedCategorías[0] || selectedMarcas[0] || search) && (
                                    <span className="font-semibold hidden sm:inline" style={{ color: cp }}>
                                        {' "}' + (selectedCategorías[0] || selectedMarcas[0] || search) + '"'}
                                    </span>
                                )}
                            </p>
                            <div className="flex items-center gap-2 flex-shrink-0">
                                {/* Mobile filter button */}
                                <button
                                    onClick={() => setShowMobileFilters(true)}
                                    className="lg:hidden flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 bg-white"
                                >
                                    <Icon icon="solar:filter-bold" width={14} />
                                    Filtros
                                    {hasActiveFilters && <span className="w-1.5 h-1.5 rounded-full" style={{ background: cp }} />}
                                </button>
                                <select
                                    value={sortBy}
                                    onChange={e => setSortBy(e.target.value)}
                                    className="text-xs sm:text-sm text-gray-600 border border-gray-200 rounded-lg px-2 sm:px-3 py-2 bg-white cursor-pointer focus:outline-none"
                                >
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
                                        <div className="flex items-center gap-2">
                                            <Icon icon="solar:filter-bold" width={18} style={{ color: cp }} />
                                            <span className="font-black text-gray-900">Filtros</span>
                                            {hasActiveFilters && (
                                                <span className="text-[10px] font-black text-white px-2 py-0.5 rounded-full" style={{ background: cp }}>
                                                    {selectedCategorías.length + selectedMarcas.length}
                                                </span>
                                            )}
                                        </div>
                                        <button onClick={() => setShowMobileFilters(false)} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                                            <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M1 1L11 11M11 1L1 11" stroke="#374151" strokeWidth="2" strokeLinecap="round"/></svg>
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
                                        {filteredMarcas.length > 0 && (
                                            <div>
                                                <p className="font-bold text-gray-800 mb-2.5 text-sm">Marcas</p>
                                                <div className="flex flex-wrap gap-2">
                                                    {filteredMarcas.map((brand, i) => {
                                                        const name = typeof brand === 'string' ? brand : brand.nombre;
                                                        const active = selectedMarcas.includes(name);
                                                        return (
                                                            <button key={i} onClick={() => toggleBrand(name)}
                                                                className="px-3 py-1.5 rounded-full text-xs font-bold border-2 transition-all"
                                                                style={active ? { background: cp, borderColor: cp, color: 'white' } : { borderColor: '#E5E7EB', color: '#6B7280' }}>
                                                                {name}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}
                                        <div>
                                            <div className="flex items-center justify-between mb-2">
                                                <p className="font-bold text-gray-800 text-sm">Precio mínimo</p>
                                                <span className="text-xs font-black text-white px-2 py-0.5 rounded" style={{ background: cp }}>S/ {priceRange[0]}</span>
                                            </div>
                                            <input type="range" min={minPrice} max={maxPrice} value={priceRange[0]}
                                                onChange={e => setPriceRange([Number(e.target.value), priceRange[1]])}
                                                className="w-full h-1.5 rounded-full appearance-none cursor-pointer" style={{ accentColor: cp }} />
                                            <div className="flex justify-between text-[11px] text-gray-400 mt-1"><span>S/ {minPrice}</span><span>S/ {maxPrice}</span></div>
                                        </div>
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

                        {/* Active filter chips */}
                        {(selectedCategorías.length > 0 || selectedMarcas.length > 0) && (
                            <div className="flex items-center gap-2 mb-5 flex-wrap">
                                {[...selectedCategorías, ...selectedMarcas].map(chip => (
                                    <span
                                        key={chip}
                                        onClick={() => { toggleCategory(chip); toggleBrand(chip); }}
                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-100 text-xs font-medium text-gray-600 cursor-pointer hover:bg-gray-200 transition-colors"
                                    >
                                        {chip}
                                        <Icon icon="solar:close-circle-bold" className="text-sm text-gray-400" />
                                    </span>
                                ))}
                            </div>
                        )}

                        <div className="flex gap-6 items-start">
                            <GadgetsFilterSidebar />

                            <div className="flex-1 min-w-0">
                                {loading ? (
                                    <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
                                        {Array.from({ length: 12 }).map((_, i) => (
                                            <div key={i} className="animate-pulse bg-gray-100 rounded-2xl h-64" />
                                        ))}
                                    </div>
                                ) : sortedProductos.length === 0 ? (
                                    <div className="py-24 text-center">
                                        <Icon icon="solar:box-linear" className="text-5xl mx-auto mb-3 text-gray-300" />
                                        <h3 className="font-bold text-gray-800 mb-2">Sin resultados</h3>
                                        <p className="text-sm text-gray-500 mb-4">Intenta ajustar los filtros.</p>
                                        <button
                                            onClick={() => { setSearch(''); setSelectedMarcas([]); setSelectedCategorías([]); setPriceRange([minPrice, maxPrice]); }}
                                            className="text-sm font-bold px-5 py-2 rounded-full border transition-all"
                                            style={{ color: cp, borderColor: cp }}
                                        >
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
                                                <button
                                                    onClick={() => { const next = page + 1; setPage(next); cargarProductos(next); }}
                                                    className="px-8 py-3 rounded-full font-bold text-sm border-2 transition-colors"
                                                    style={{ color: cp, borderColor: cp }}
                                                >
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
                                    <div className="flex items-center gap-3">
                                        <button onClick={() => clearCompare(slug || '')} className="text-xs text-red-500 hover:text-red-700">Limpiar</button>
                                        <button onClick={() => setShowCompareModal(false)} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center"><svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M1 1L11 11M11 1L1 11" stroke="#374151" strokeWidth="2" strokeLinecap="round"/></svg></button>
                                    </div>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead><tr className="border-b border-gray-100">
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
                                                    {compareItems.map(item => (<td key={item.id} className="p-4 text-center text-sm text-gray-700">{fn(item)}</td>))}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    );
                })()}

                {/* Floating compare bar */}
                {getBySlug(slug || '').length > 0 && (
                    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 pointer-events-auto">
                        <div className="bg-gray-900 text-white rounded-2xl shadow-2xl px-5 py-3 flex items-center gap-4">
                            <span className="text-sm font-semibold">{getBySlug(slug || '').length} producto{getBySlug(slug || '').length > 1 ? 's' : ''} a comparar</span>
                            <div className="w-px h-6 bg-gray-700" />
                            <button onClick={() => setShowCompareModal(true)} className="px-4 py-1.5 rounded-xl font-bold text-sm text-white" style={{ background: cp }}>Comparar</button>
                            <button onClick={() => clearCompare(slug || '')} className="text-gray-400 hover:text-white transition-colors"><Icon icon="solar:close-circle-bold" width={18} /></button>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // ── Moda catalog layout ───────────────────────────────────────────────────
    if (diseno.plantillaId === 'moda') {
        return (
            <div className="min-h-screen bg-[#FAF9F6]" style={{ fontFamily: `'${diseno.tipografia || 'Inter'}', sans-serif` }}>
                <ModaHeader
                    tienda={tienda || {}}
                    slug={slug || ''}
                    cp={cp}
                    carritoSize={carrito.reduce((s: number, i: any) => s + Number(i.cantidad || 1), 0)}
                    onOpenCart={() => setMostrarCarrito(!mostrarCarrito)}
                    searchQuery={search}
                    setSearchQuery={setSearch}
                    onSearchSubmit={e => {
                        e.preventDefault();
                        const q = search.trim();
                        if (q) setSearch(q);
                    }}
                    allCategories={allCategorías}
                />

                <main className="w-full max-w-7xl mx-auto px-4 xl:px-8 py-16">

                    {/* Header text */}
                    <div className="text-center max-w-2xl mx-auto mb-16">
                        <h1 className="text-3xl md:text-[2.5rem] font-bold text-gray-900 tracking-tight mb-4" style={{ fontFamily: '"Inter", sans-serif' }}>
                            Donde la moda te encuentra
                        </h1>
                        <p className="text-sm md:text-[15px] text-gray-500 leading-relaxed">
                            Explora estilos seleccionados, piezas de lujo y tendencias modernas diseñadas para expresar tu confianza única.
                        </p>
                    </div>

                    {/* Filter & Sort Bar */}
                    <div className="flex items-center justify-between mb-8 pb-4">
                        <button 
                            onClick={() => setShowMobileFilters(true)}
                            className="flex items-center gap-2 text-sm font-bold text-gray-900 hover:text-gray-600 transition-colors"
                        >
                            <Icon icon="solar:filter-bold" width={18} />
                            Filtrar y Ordenar
                            {hasActiveFilters && <span className="w-2 h-2 rounded-full bg-gray-900" />}
                        </button>
                        <div className="flex items-center gap-4">
                            <span className="text-sm font-bold text-gray-500 hidden sm:inline">{sortedProductos.length} Productos</span>
                            <select
                                value={sortBy}
                                onChange={e => setSortBy(e.target.value)}
                                className="text-sm font-semibold text-gray-700 bg-transparent border-none focus:outline-none focus:ring-0 cursor-pointer appearance-none pr-4"
                            >
                                <option value="relevance">Más Relevante</option>
                                <option value="price-asc">Precio: Menor a Mayor</option>
                                <option value="price-desc">Precio: Mayor a Menor</option>
                                <option value="name-asc">Nombre A-Z</option>
                            </select>
                        </div>
                    </div>

                    {/* Active filter chips */}
                    {(selectedCategorías.length > 0 || selectedMarcas.length > 0) && (
                        <div className="flex items-center gap-2 mb-6 flex-wrap">
                            {[...selectedCategorías, ...selectedMarcas].map(chip => (
                                <span
                                    key={chip}
                                    onClick={() => { toggleCategory(chip); toggleBrand(chip); }}
                                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-gray-900 text-white text-xs font-bold cursor-pointer hover:bg-gray-700 transition-colors"
                                >
                                    {chip}
                                    <Icon icon="solar:close-circle-bold" className="text-gray-400" width={14} />
                                </span>
                            ))}
                            <button
                                onClick={() => { setSelectedMarcas([]); setSelectedCategorías([]); setPriceRange([minPrice, maxPrice]); }}
                                className="text-xs font-semibold text-gray-400 hover:text-gray-700 underline underline-offset-2"
                            >
                                Limpiar todo
                            </button>
                        </div>
                    )}

                    {/* Grid */}
                    {loading ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6 mb-20">
                            {Array.from({ length: 8 }).map((_, i) => (
                                <div key={i} className="animate-pulse bg-white rounded-[1.5rem] p-4 border border-gray-50">
                                    <div className="bg-gray-100 rounded-xl aspect-square mb-4" />
                                    <div className="bg-gray-100 rounded h-3 w-3/4 mb-2" />
                                    <div className="bg-gray-100 rounded h-4 w-1/2" />
                                </div>
                            ))}
                        </div>
                    ) : sortedProductos.length === 0 ? (
                        <div className="py-24 text-center mb-20">
                            <Icon icon="solar:box-linear" className="text-6xl mx-auto mb-4 text-gray-200" />
                            <h3 className="text-lg font-black text-gray-900 mb-2">No se encontraron resultados</h3>
                            <p className="text-sm text-gray-500 mb-6">Intenta ajustar tus filtros o busca otra cosa.</p>
                            <button
                                onClick={() => { setSearch(''); setSelectedMarcas([]); setSelectedCategorías([]); setPriceRange([minPrice, maxPrice]); }}
                                className="text-sm font-bold px-6 py-3 rounded-full border-2 border-gray-900 text-gray-900 hover:bg-gray-900 hover:text-white transition-all"
                            >
                                Limpiar filtros
                            </button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6 mb-20">
                            {sortedProductos.map(producto => {
                                const price = Number(producto.precioUnitario || 0);
                                const original = Number(producto.precioOriginal || 0);
                                const hasDisc = original > 0 && original > price;
                                return (
                                    <button
                                        key={producto.id}
                                        onClick={() => navigate(`/tienda/${slug}/producto/${producto.id}`)}
                                        className="text-left group w-full bg-white rounded-[1.5rem] p-4 shadow-[0_2px_10px_rgba(0,0,0,0.02)] border border-gray-50 hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)] transition-all flex flex-col relative"
                                    >
                                        <div className="relative w-full aspect-square bg-white rounded-xl mb-4 overflow-hidden flex items-center justify-center p-2">
                                            {producto.imagenUrl ? (
                                                <img src={producto.imagenUrl} alt={producto.descripcion} className="w-full h-full object-contain transition-transform duration-700 group-hover:scale-[1.05]" />
                                            ) : (
                                                <Icon icon="solar:box-linear" className="text-gray-200 text-5xl" />
                                            )}
                                            {hasDisc && (
                                                <span className="absolute top-2 left-2 text-[10px] font-black text-white px-2 py-1 rounded-md tracking-wider bg-gray-900 z-10">
                                                    -{Math.round((1 - price / original) * 100)}%
                                                </span>
                                            )}
                                            <div 
                                                onClick={e => { e.stopPropagation(); handleAgregarProducto(producto); }}
                                                className="absolute bottom-2 left-1/2 -translate-x-1/2 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0 duration-200 bg-white text-gray-900 text-xs font-bold px-4 py-2 rounded-full shadow-[0_4px_12px_rgba(0,0,0,0.1)] hover:bg-gray-900 hover:text-white z-20"
                                            >
                                                Añadir a la bolsa
                                            </div>
                                        </div>
                                        <p className="text-[13px] font-bold text-gray-900 leading-snug line-clamp-2 mb-1.5 px-1">{producto.descripcion}</p>
                                        <div className="flex items-center gap-2 mt-auto px-1">
                                            <p className="text-[13px] font-bold text-gray-600">S/ {price.toFixed(2)}</p>
                                            {hasDisc && <span className="text-[11px] text-gray-400 line-through">S/ {original.toFixed(2)}</span>}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    )}

                    {productos.length < total && !loading && (
                        <div className="flex justify-center mb-20">
                            <button
                                onClick={() => { const next = page + 1; setPage(next); cargarProductos(next); }}
                                className="px-8 py-3.5 rounded-full font-bold text-sm border-2 border-gray-900 text-gray-900 hover:bg-gray-900 hover:text-white transition-all"
                            >
                                Cargar más
                            </button>
                        </div>
                    )}

                    {/* Bottom Banners Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-[1.1fr_1fr] gap-4 md:gap-6 items-stretch">
                        <div className="bg-white rounded-[2rem] p-8 md:p-10 border border-gray-100 shadow-sm relative overflow-hidden flex flex-col justify-center min-h-[340px]">
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 select-none pointer-events-none w-full text-center">
                                <span className="text-[10rem] sm:text-[14rem] font-black text-gray-50 opacity-50 tracking-tighter whitespace-nowrap">Comf</span>
                            </div>
                            
                            <div className="relative z-10 max-w-[55%]">
                                <h3 className="text-3xl lg:text-4xl font-bold text-gray-900 leading-tight mb-2 tracking-tight">
                                    ¡Tu evolución
                                </h3>
                                <h3 className="text-3xl lg:text-4xl text-gray-900 leading-tight mb-4" style={{ fontFamily: '"Playfair Display", serif', fontStyle: 'italic' }}>
                                    comienza aquí!
                                </h3>
                                <p className="text-xs text-gray-500 leading-relaxed mb-6">
                                    Estilos seleccionados, telas lujosas y elegancia natural en un solo lugar. Vístete como sueñas.
                                </p>
                                <button 
                                    onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                                    className="px-6 py-2.5 bg-[#2D2D2D] text-white text-xs sm:text-sm font-semibold rounded-full hover:bg-black transition-colors inline-flex items-center gap-2"
                                >
                                    Empezar a comprar <Icon icon="solar:arrow-up-linear" width={16} />
                                </button>
                            </div>

                            <div className="absolute bottom-0 right-0 w-[45%] h-[95%] z-0 flex items-end justify-center">
                                <img 
                                    src="https://images.unsplash.com/photo-1549439602-43ebca2327af?auto=format&fit=crop&q=80&w=800" 
                                    alt="Model" 
                                    className="w-full h-full object-cover object-top mix-blend-multiply opacity-90 scale-110 origin-bottom filter grayscale"
                                />
                            </div>
                        </div>

                        <div className="bg-[#B58863] rounded-[2rem] overflow-hidden min-h-[300px] lg:min-h-[340px] relative">
                            <img 
                                src="https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&q=80&w=1200" 
                                alt="Girls laughing" 
                                className="absolute inset-0 w-full h-full object-cover object-top"
                            />
                        </div>
                    </div>

                    {/* Mobile filter drawer (kept as overlay) */}
                    {showMobileFilters && (
                        <div className="fixed inset-0 z-[200]">
                            <div className="absolute inset-0 bg-black/40" onClick={() => setShowMobileFilters(false)} />
                            <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-2xl max-h-[85vh] flex flex-col">
                                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                                    <span className="font-black text-gray-900">Filtrar y Ordenar</span>
                                    <button onClick={() => setShowMobileFilters(false)} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                                        <Icon icon="solar:close-circle-bold" width={18} className="text-gray-600" />
                                    </button>
                                </div>
                                <div className="overflow-y-auto flex-1 px-5 py-4 space-y-5">
                                    {allCategorías.length > 0 && (
                                        <div>
                                            <p className="font-bold text-gray-800 mb-3 text-sm">Categorías</p>
                                            <div className="flex flex-wrap gap-2">
                                                {allCategorías.map((cat, i) => {
                                                    const name = typeof cat === 'string' ? cat : cat.nombre;
                                                    const active = selectedCategorías.includes(name);
                                                    return (
                                                        <button key={i} onClick={() => toggleCategory(name)}
                                                            className="px-4 py-2 rounded-full text-xs font-bold border-2 transition-all"
                                                            style={active ? { background: '#1A1A1A', borderColor: '#1A1A1A', color: 'white' } : { borderColor: '#E5E7EB', color: '#6B7280' }}>
                                                            {name}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
                                    {allMarcas.length > 0 && (
                                        <div>
                                            <p className="font-bold text-gray-800 mb-3 text-sm">Marcas</p>
                                            <div className="flex flex-wrap gap-2">
                                                {filteredMarcas.map((brand, i) => {
                                                    const name = typeof brand === 'string' ? brand : brand.nombre;
                                                    const active = selectedMarcas.includes(name);
                                                    return (
                                                        <button key={i} onClick={() => toggleBrand(name)}
                                                            className="px-4 py-2 rounded-full text-xs font-bold border-2 transition-all"
                                                            style={active ? { background: '#1A1A1A', borderColor: '#1A1A1A', color: 'white' } : { borderColor: '#E5E7EB', color: '#6B7280' }}>
                                                            {name}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
                                    <div>
                                        <p className="font-bold text-gray-800 mb-3 text-sm">Precio</p>
                                        <input
                                            type="range"
                                            min={minPrice} max={maxPrice}
                                            value={priceRange[1]}
                                            onChange={e => setPriceRange([priceRange[0], Number(e.target.value)])}
                                            className="w-full accent-gray-900"
                                        />
                                        <div className="flex justify-between text-[11px] text-gray-500 font-semibold">
                                            <span>S/ {minPrice}</span><span>S/ {priceRange[1]}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="px-5 py-4 border-t border-gray-100 flex gap-3">
                                    {hasActiveFilters && (
                                        <button onClick={() => { setSelectedMarcas([]); setSelectedCategorías([]); setPriceRange([minPrice, maxPrice]); }}
                                            className="flex-1 py-3 rounded-full text-sm font-bold border-2 border-gray-900 text-gray-900">
                                            Limpiar
                                        </button>
                                    )}
                                    <button onClick={() => setShowMobileFilters(false)}
                                        className="flex-1 py-3 rounded-full text-sm font-bold text-white bg-gray-900">
                                        Ver {sortedProductos.length} Resultados
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </main>

                <ModaFooter tiendaNombre={tienda?.nombreComercial || tienda?.nombre || 'Styliq'} />

                <ModaCartModal
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
                        onConfirm={(p: any, mods: any[]) => {
                            agregarAlCarritoDirecto(p, mods);
                            setShowPersonalizarModal(false);
                            setProductoAPersonalizar(null);
                        }}
                        modifiers={modificadoresProducto}
                    />
                )}
            </div>
        );
    }

    // ── Hombre Urbano catalog layout ──────────────────────────────────────────
    if (templateId === 'urbano') {
        return (
            <>
                <UrbanoCatalogPage
                    slug={slug || ''}
                    tienda={tienda || {}}
                    cp={cp}
                    productos={sortedProductos}
                    total={total}
                    loading={loading}
                    allCategorias={allCategorías}
                    allMarcas={allMarcas}
                    selectedCategorias={selectedCategorías}
                    setSelectedCategorias={setSelectedCategorías}
                    selectedMarcas={selectedMarcas}
                    setSelectedMarcas={setSelectedMarcas}
                    priceRange={priceRange}
                    setPriceRange={setPriceRange}
                    minPrice={minPrice}
                    maxPrice={maxPrice}
                    sortBy={sortBy}
                    setSortBy={setSortBy}
                    search={search}
                    setSearch={setSearch}
                    hasActiveFilters={hasActiveFilters}
                    carritoSize={carrito.length}
                    onOpenCart={() => setMostrarCarrito(!mostrarCarrito)}
                    onAddToCart={(p) => agregarAlCarritoDirecto(p, [])}
                    onProduct={(p) => navigate(`/tienda/${slug}/producto/${p.id}`)}
                />
                <UrbanoCartModal
                    isOpen={mostrarCarrito}
                    onClose={() => setMostrarCarrito(false)}
                    carrito={carrito}
                    tienda={tienda || {}}
                    actualizarCantidad={actualizarCantidad}
                    onCheckout={irACheckout}
                    slug={slug || ''}
                    setCarrito={setCarrito}
                />
            </>
        );
    }

    // ── Autopartes catalog layout ─────────────────────────────────────────────
    if (diseno.plantillaId === 'autopartes') {
        const [priceMin, setPriceMin] = [priceRange[0], (v: number) => setPriceRange([v, priceRange[1]])];

        const AutopartesFilterSidebar = () => (
            <aside className="w-64 flex-shrink-0 space-y-6 text-sm hidden lg:block bg-white rounded-xl border border-gray-100 p-5 h-fit sticky top-24 shadow-sm">
                <h3 className="font-black text-gray-900 text-lg tracking-wide uppercase border-b border-gray-100 pb-3 mb-4">Filtros</h3>
                
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
                                        <input
                                            type="checkbox"
                                            checked={selectedCategorías.includes(name)}
                                            onChange={() => toggleCategory(name)}
                                            className="hidden"
                                        />
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
                                        <input
                                            type="checkbox"
                                            checked={selectedMarcas.includes(name)}
                                            onChange={() => toggleBrand(name)}
                                            className="hidden"
                                        />
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
                        <span className="text-xs font-black text-white px-2 py-1 rounded bg-gray-100 border border-gray-200">
                            S/ {priceMin}
                        </span>
                    </div>
                    <input
                        type="range" min={minPrice} max={maxPrice} value={priceRange[0]}
                        onChange={e => setPriceMin(Number(e.target.value))}
                        className="w-full h-1.5 rounded-full appearance-none cursor-pointer bg-gray-200"
                        style={{ accentColor: cp }}
                    />
                    <div className="flex justify-between text-[10px] text-gray-500 mt-2 font-mono">
                        <span>S/ {minPrice}</span><span>S/ {maxPrice}</span>
                    </div>
                </div>

                {hasActiveFilters && (
                    <button
                        onClick={() => { setSelectedMarcas([]); setSelectedCategorías([]); setPriceRange([minPrice, maxPrice]); }}
                        className="w-full mt-6 py-2.5 text-xs font-bold rounded-md bg-[#1A1A1A] text-gray-300 hover:text-white hover:bg-gray-200 transition-colors border border-gray-700"
                    >
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
                    onSearchSubmit={(e, value) => { 
                        e.preventDefault(); 
                        setSearch(value);
                        setSelectedCategorías([]);
                        setSelectedMarcas([]);
                        setPriceRange([minPrice, maxPrice]);
                    }}
                    allCategories={allCategorías}
                />

                <main className="w-full max-w-7xl mx-auto px-4 xl:px-8 py-8">
                    {/* Header info */}
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
                            <select
                                value={sortBy}
                                onChange={e => setSortBy(e.target.value)}
                                className="text-sm font-bold text-gray-700 border-2 border-gray-200 rounded-md px-4 py-2 bg-white cursor-pointer focus:outline-none hover:border-gray-300 transition-colors"
                            >
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
                                            <button
                                                onClick={() => { const next = page + 1; setPage(next); cargarProductos(next); }}
                                                className="px-8 py-3.5 rounded-md font-black text-sm text-white transition-transform hover:scale-[1.02] shadow-md"
                                                style={{ backgroundColor: cp }}
                                            >
                                                Cargar más
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

    return (
        <div className="min-h-screen bg-[#F6F6F6]" style={{ fontFamily: '"Mona Sans", Inter, sans-serif' }}>
            <StoreHeader
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
                onSelectCategory={(cat) => {
                    if (cat === '') setSelectedCategorías([]);
                    else setSelectedCategorías([cat]);
                }}
                recommendedProducts={productos.slice(0, 10)}
                onSearch={() => { }}
            />

            <main className="pt-[116px] pb-16">
                <div className="max-w-screen-xl mx-auto px-5 md:px-8 py-6">

                    {/* Breadcrumb */}
                    <nav className="flex items-center gap-1.5 text-sm text-gray-500 mb-3 flex-wrap">
                        <button onClick={() => navigate(`/tienda/${slug}`)} className="flex items-center gap-1 hover:text-[#FF9500] transition-colors">
                            <Icon icon="solar:alt-arrow-left-linear" width={16} />
                            Inicio
                        </button>
                        {selectedCategorías.map((c, i) => (
                            <span key={i} className="flex items-center gap-1.5">
                                <span className="text-gray-300">/</span>
                                <span className="text-[#1A1A1A] font-medium">{c}</span>
                            </span>
                        ))}
                        {selectedMarcas.map((b, i) => (
                            <span key={i} className="flex items-center gap-1.5">
                                <span className="text-gray-300">/</span>
                                <span className="text-[#1A1A1A] font-medium">{b}</span>
                            </span>
                        ))}
                    </nav>

                    <div className="flex items-center justify-between mb-5">
                        <h1 className="text-2xl md:text-3xl font-black text-[#1A1A1A]">{pageTitle}</h1>
                        <div className="flex items-center gap-2 md:gap-3">
                            <div className="hidden md:flex items-center gap-2 bg-white border border-gray-200 rounded-full px-3 py-2">
                                <Icon icon="solar:sort-bold" width={15} className="text-[#FF9500]" />
                                <select
                                    value={sortBy}
                                    onChange={(e) => setSortBy(e.target.value)}
                                    className="bg-transparent text-sm font-medium text-[#1A1A1A] border-none focus:outline-none"
                                >
                                    <option value="relevance">Más relevantes</option>
                                    <option value="price-asc">Precio: menor a mayor</option>
                                    <option value="price-desc">Precio: mayor a menor</option>
                                    <option value="name-asc">Nombre A-Z</option>
                                </select>
                            </div>

                            {/* Mobile filter toggle */}
                            <button
                                onClick={() => setShowMobileFilters(!showMobileFilters)}
                                className="md:hidden flex items-center gap-2 bg-white rounded-full px-4 py-2 text-sm font-bold border border-gray-200"
                            >
                                <Icon icon="solar:filter-bold" width={16} className="text-[#FF9500]" />
                                Filtros
                                {hasActiveFilters && <span className="w-2 h-2 rounded-full bg-[#FF9500]" />}
                            </button>
                        </div>
                    </div>

                    <div className="md:hidden mb-4">
                        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2">
                            <Icon icon="solar:sort-bold" width={15} className="text-[#FF9500]" />
                            <select
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value)}
                                className="w-full bg-transparent text-sm font-medium text-[#1A1A1A] border-none focus:outline-none"
                            >
                                <option value="relevance">Más relevantes</option>
                                <option value="price-asc">Precio: menor a mayor</option>
                                <option value="price-desc">Precio: mayor a menor</option>
                                <option value="name-asc">Nombre A-Z</option>
                            </select>
                        </div>
                    </div>

                    {/* Mobile filters drawer */}
                    {showMobileFilters && (
                        <div className="md:hidden mb-4">
                            <FilterSidebar />
                        </div>
                    )}

                    <div className="flex gap-6">
                        {/* Left Sidebar */}
                        <aside className="w-60 flex-shrink-0 hidden md:block">
                            <div className="sticky top-28">
                                <FilterSidebar />
                            </div>
                        </aside>

                        {/* Product Grid */}
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-4">
                                <p className="text-sm text-gray-500">
                                    {loading ? 'Cargando...' : `${total} producto${total !== 1 ? 's' : ''} encontrado${total !== 1 ? 's' : ''}`}
                                </p>
                            </div>

                            {loading ? (
                                <div className={`grid ${template.gridCols} gap-3 md:gap-4`}>
                                    {Array.from({ length: 12 }).map((_, i) => (
                                        <div key={i} className="animate-pulse bg-white rounded-2xl overflow-hidden">
                                            <div className={`bg-[#FAF6F1] ${template.imageAspect} w-full`} />
                                            <div className="p-3 space-y-2">
                                                <div className="h-4 bg-gray-100 w-1/2 rounded" />
                                                <div className="h-3 bg-gray-100 w-3/4 rounded" />
                                                <div className="h-8 bg-[#FEF0DC] w-full rounded mt-3" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : productos.length === 0 ? (
                                <div className="py-24 text-center">
                                    <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4">
                                        <Icon icon="solar:box-linear" className="text-gray-300 text-3xl" />
                                    </div>
                                    <h3 className="font-black text-[#1A1A1A] mb-2">Sin resultados</h3>
                                    <p className="text-sm text-gray-500 mb-4">Intenta ajustar tus filtros.</p>
                                    <button
                                        onClick={() => { setSearch(''); setSelectedMarcas([]); setSelectedCategorías([]); setPriceRange([minPrice, maxPrice]); }}
                                        className="text-sm font-bold text-[#FF9500] border border-[#FF9500] px-5 py-2 rounded-full hover:bg-[#FF9500] hover:text-white transition-all"
                                    >
                                        Limpiar Filtros
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <div className={`grid ${template.gridCols} gap-3 md:gap-4`}>
                                        {sortedProductos.map((producto) => (
                                            <ProductCard
                                                key={producto.id}
                                                producto={producto}
                                                slug={slug || ''}
                                                diseno={diseno}
                                                onAddToCart={handleAgregarProducto}
                                                onClick={() => navigate(`/tienda/${slug}/producto/${producto.id}`)}
                                            />
                                        ))}
                                    </div>

                                    {productos.length < total && (
                                        <div className="mt-8 flex justify-center">
                                            <button
                                                onClick={() => {
                                                    const next = page + 1;
                                                    setPage(next);
                                                    cargarProductos(next);
                                                }}
                                                className="px-8 py-3 rounded-full font-bold text-sm border-2 border-[#FF9500] text-[#FF9500] hover:bg-[#FF9500] hover:text-white transition-colors"
                                            >
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

            {tienda && mostrarCarrito && (
                <ShoppingCartModal
                    isOpen={mostrarCarrito}
                    onClose={() => setMostrarCarrito(false)}
                    carrito={carrito}
                    tienda={tienda}
                    actualizarCantidad={actualizarCantidad}
                    onCheckout={irACheckout}
                />
            )}

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
                                <div className="flex items-center gap-3">
                                    <button onClick={() => clearCompare(slug || '')} className="text-xs text-red-500 hover:text-red-700">Limpiar</button>
                                    <button onClick={() => setShowCompareModal(false)} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center"><svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M1 1L11 11M11 1L1 11" stroke="#374151" strokeWidth="2" strokeLinecap="round"/></svg></button>
                                </div>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead><tr className="border-b border-gray-100">
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
                                                {compareItems.map(item => (<td key={item.id} className="p-4 text-center text-sm text-gray-700">{fn(item)}</td>))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                );
            })()}

            {/* Floating compare bar */}
            {getBySlug(slug || '').length > 0 && (
                <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 pointer-events-auto">
                    <div className="bg-gray-900 text-white rounded-2xl shadow-2xl px-5 py-3 flex items-center gap-4">
                        <div className="flex -space-x-2">
                            {getBySlug(slug || '').map(item => (
                                <div key={item.id} className="w-8 h-8 rounded-full border-2 border-gray-800 overflow-hidden bg-white">
                                    {item.imagenUrl ? <img src={item.imagenUrl} alt="" className="w-full h-full object-contain" /> : <div className="w-full h-full bg-gray-200" />}
                                </div>
                            ))}
                        </div>
                        <span className="text-sm font-semibold">{getBySlug(slug || '').length} producto{getBySlug(slug || '').length > 1 ? 's' : ''}</span>
                        <button onClick={() => setShowCompareModal(true)} className="px-4 py-1.5 rounded-xl font-bold text-sm text-white" style={{ background: cp }}>Comparar</button>
                        <button onClick={() => clearCompare(slug || '')} className="text-gray-400 hover:text-white transition-colors"><svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M1 1L11 11M11 1L1 11" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round"/></svg></button>
                    </div>
                </div>
            )}
        </div>
    );
}
