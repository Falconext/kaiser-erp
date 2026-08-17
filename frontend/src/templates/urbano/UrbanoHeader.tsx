import { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useFavoritosStore } from '@/zustand/favoritos';
import UrbanoFavoritesDrawer from '@/components/tienda/UrbanoFavoritesDrawer';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4001/api';

interface UrbanoHeaderProps {
  diseno?: any;
    tienda: any;
    slug: string;
    cp: string;
    carritoSize: number;
    onOpenCart: () => void;
    categories?: Array<{ nombre: string; imagenUrl?: string } | string>;
    onCategorySelect?: (category: string) => void;
    searchQuery?: string;
    setSearchQuery?: (s: string) => void;
    onSearchSubmit?: (e: any, value: string) => void;
}

export default function UrbanoHeader({
    tienda,
    slug,
    carritoSize,
    onOpenCart,
    categories = [],
    onCategorySelect,
    searchQuery = '',
    setSearchQuery,
    onSearchSubmit, diseno }: UrbanoHeaderProps) {
    const navigate = useNavigate();
    const [isShopHovered, setIsShopHovered] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [localSearch, setLocalSearch] = useState(searchQuery);
    const [favOpen, setFavOpen] = useState(false);
    const [hoveredMegaIndex, setHoveredMegaIndex] = useState(0);
    const favoritosCount = useFavoritosStore((s) => s.getFavoritosBySlug(slug).length);

    // Búsqueda global (autocontenida, no afecta la página actual)
    const [searchOpen, setSearchOpen] = useState(false);
    const [globalQuery, setGlobalQuery] = useState('');
    const [globalResults, setGlobalResults] = useState<any[]>([]);
    const [globalLoading, setGlobalLoading] = useState(false);
    const isPreview = slug === 'preview';

    useEffect(() => {
        const term = globalQuery.trim();
        if (term.length < 2) { setGlobalResults([]); setGlobalLoading(false); return; }
        setGlobalLoading(true);
        const timer = setTimeout(async () => {
            try {
                const { data } = await axios.get(`${BASE_URL}/public/store/${slug}/products`, { params: { search: term, limit: 8 } });
                const items = Array.isArray(data) ? data : data?.data?.data || data?.data || [];
                setGlobalResults(Array.isArray(items) ? items : []);
            } catch { setGlobalResults([]); } finally { setGlobalLoading(false); }
        }, 350);
        return () => clearTimeout(timer);
    }, [globalQuery, slug]);

    const closeSearch = () => { setSearchOpen(false); setGlobalQuery(''); setGlobalResults([]); };
    const goHome = () => {
        if (isPreview) {
            window.dispatchEvent(new CustomEvent('preview-nav', { detail: 'home' }));
            return;
        }
        navigate(`/tienda/${slug}`);
    };
    const goCatalog = () => {
        if (isPreview) {
            window.dispatchEvent(new CustomEvent('preview-nav', { detail: 'catalogo' }));
            return;
        }
        navigate(`/tienda/${slug}/catalogo`);
    };
    const goTracking = () => {
        if (isPreview) {
            window.dispatchEvent(new CustomEvent('preview-nav', { detail: 'checkout' }));
            return;
        }
        navigate(`/tienda/${slug}/seguimiento`);
    };
    const irAProducto = (id: number) => {
        closeSearch();
        window.scrollTo(0, 0);
        if (isPreview) {
            window.dispatchEvent(new CustomEvent('preview-product', { detail: { id } }));
            return;
        }
        navigate(`/tienda/${slug}/producto/${id}`);
    };
    const buscarTodo = () => {
        const term = globalQuery.trim();
        closeSearch();
        if (isPreview) {
            onSearchSubmit?.({ preventDefault: () => {} }, term);
            window.dispatchEvent(new CustomEvent('preview-nav', { detail: 'catalogo' }));
            return;
        }
        navigate(`/tienda/${slug}/catalogo${term ? `?search=${encodeURIComponent(term)}` : ''}`);
    };

    const cfg = diseno || tienda?.diseno || {};
    const storeName = cfg.urbanoStoreName || tienda?.nombreComercial || tienda?.razonSocial || tienda?.nombre || 'BLNK';
    const logoUrl = cfg.logo || tienda?.logoUrl;
    const clean = (value: any) => String(value || '').trim();
    const configuredFallbackCategories = [
        { nombre: clean(cfg.urbanoCat1Text), imagenUrl: cfg.urbanoCat1Img },
        { nombre: clean(cfg.urbanoCat2Text), imagenUrl: cfg.urbanoCat2Img },
        { nombre: clean(cfg.urbanoCat3Text), imagenUrl: cfg.urbanoCat3Img },
        { nombre: clean(cfg.urbanoCat4Text), imagenUrl: cfg.urbanoCat4Img },
    ].filter((cat) => cat.nombre);
    const previewFallbackCategories = [
        { nombre: clean(cfg.urbanoCat1Text) || 'Poleras', imagenUrl: cfg.urbanoCat1Img },
        { nombre: clean(cfg.urbanoCat2Text) || 'Pantalones', imagenUrl: cfg.urbanoCat2Img },
        { nombre: clean(cfg.urbanoCat3Text) || 'Polos', imagenUrl: cfg.urbanoCat3Img },
        { nombre: clean(cfg.urbanoCat4Text) || 'Casacas', imagenUrl: cfg.urbanoCat4Img },
    ];
    const fallbackCategories = isPreview ? previewFallbackCategories : configuredFallbackCategories;
    const megaMenuCategories = (categories.length > 0
        ? categories.map((cat) => typeof cat === 'string' ? { nombre: cat } : cat).filter((cat) => cat.nombre)
        : fallbackCategories
    ).filter((cat) => cat.nombre.toLowerCase() !== 'todos');
    const featuredCategories = megaMenuCategories.length > 0
        ? Array.from({ length: Math.min(3, megaMenuCategories.length) }, (_, offset) => (
            megaMenuCategories[(hoveredMegaIndex + offset) % megaMenuCategories.length]
        )).filter(Boolean)
        : [];

    const selectCategory = (category: string) => {
        setIsShopHovered(false);
        setIsMobileMenuOpen(false);
        if (onCategorySelect) {
            onCategorySelect(category);
            return;
        }
        if (isPreview) {
            window.dispatchEvent(new CustomEvent('preview-nav', { detail: 'catalogo' }));
            return;
        }
        navigate(`/tienda/${slug}/catalogo?category=${encodeURIComponent(category)}`);
    };

    return (
        <div className="relative w-full z-50 bg-white" style={{ fontFamily: '"Inter", sans-serif' }}>
            {/* Top Announcement Bar */}
            <div className="w-full bg-black text-white text-[10px] sm:text-[11px] font-bold tracking-[0.2em] py-2.5 flex items-center justify-between px-4">
                <button className="text-gray-400 hover:text-white transition-colors">
                    <Icon icon="solar:alt-arrow-left-linear" width={14} />
                </button>
                <p className="uppercase text-center flex-1">
                    {cfg.urbanoAnnouncementText || '[ VER COLECCIÓN ]'}
                </p>
                <button className="text-gray-400 hover:text-white transition-colors">
                    <Icon icon="solar:alt-arrow-right-linear" width={14} />
                </button>
            </div>

            {/* Main Header */}
            <header className="w-full border-b border-gray-100 bg-white relative z-40">
                <div className="max-w-[1600px] mx-auto px-4 md:px-8 h-[72px] sm:h-20 flex items-center justify-between">
                    
                    {/* Left: Navigation (Desktop) */}
                    <nav className="hidden lg:flex items-center gap-8 text-[11px] font-bold uppercase tracking-[0.15em] text-gray-500 w-1/3">
                        <button onClick={goHome} className="hover:text-black transition-colors">Inicio</button>
                        
                        <div
                            className="h-full flex items-center py-8 cursor-pointer relative"
                            onMouseEnter={() => setIsShopHovered(true)}
                            onMouseLeave={() => setIsShopHovered(false)}
                            onClick={goCatalog}
                        >
                            <span className="hover:text-black transition-colors flex items-center gap-1.5 text-black">
                                Tienda <Icon icon="solar:alt-arrow-down-linear" width={14} />
                            </span>
                        </div>

                        <button onClick={goCatalog} className="hover:text-black transition-colors">Colecciones</button>
                    </nav>

                    {/* Left: Hamburger (Mobile) */}
                    <div className="lg:hidden flex items-center gap-4 w-1/3">
                        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="text-black">
                            <Icon icon="solar:hamburger-menu-linear" width={26} />
                        </button>
                    </div>

                    {/* Center: Logo */}
                    <div className="flex justify-center w-1/3">
                        <div onClick={goHome} className="cursor-pointer flex items-center justify-center">
                            {logoUrl ? (
                                <img src={logoUrl} alt={storeName} className="h-8 sm:h-10 object-contain" />
                            ) : (
                                <h1 
                                    className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tighter uppercase leading-none text-black"
                                    style={{ fontFamily: '"Impact", "Arial Black", sans-serif' }}
                                >
                                    {storeName}
                                </h1>
                            )}
                        </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center justify-end gap-5 w-1/3">
                        <button onClick={() => setSearchOpen(true)} aria-label="Buscar" className="text-black hover:text-gray-500 transition-colors">
                            <Icon icon="solar:magnifer-linear" width={20} />
                        </button>
                        <button
                            onClick={goTracking}
                            aria-label="Ver mi pedido"
                            className="text-black hover:text-gray-500 transition-colors"
                            title="Ver mi pedido"
                        >
                            <Icon icon="solar:delivery-linear" width={20} />
                        </button>
                        <button onClick={() => setFavOpen(true)} aria-label="Favoritos" className="text-black hover:text-gray-500 transition-colors relative">
                            <Icon icon="solar:heart-linear" width={20} />
                            {favoritosCount > 0 && (
                                <span className="absolute -top-1.5 -right-2 bg-black text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                                    {favoritosCount}
                                </span>
                            )}
                        </button>
                        <button onClick={onOpenCart} className="text-black hover:text-gray-500 transition-colors relative">
                            <Icon icon="solar:bag-3-linear" width={20} />
                            {carritoSize > 0 && (
                                <span className="absolute -top-1.5 -right-2 bg-black text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                                    {carritoSize}
                                </span>
                            )}
                        </button>
                    </div>
                </div>
            </header>

            {/* Mega Menu Dropdown */}
            <div 
                className={`absolute top-full left-0 w-full bg-white border-b border-gray-100 transition-all duration-300 origin-top overflow-hidden z-30 ${isShopHovered ? 'opacity-100 max-h-[500px]' : 'opacity-0 max-h-0'}`}
                onMouseEnter={() => setIsShopHovered(true)}
                onMouseLeave={() => setIsShopHovered(false)}
            >
                <div className="max-w-[1600px] mx-auto px-8 py-10 flex">
                    {/* Categories List */}
                    <div className="w-1/3 flex flex-col gap-4">
                        {megaMenuCategories.map((cat, idx) => (
                            <button
                                key={`${cat.nombre}-${idx}`}
                                onMouseEnter={() => setHoveredMegaIndex(idx)}
                                onFocus={() => setHoveredMegaIndex(idx)}
                                onClick={() => selectCategory(cat.nombre)}
                                className={`text-left text-[11px] font-bold uppercase tracking-[0.15em] transition-colors w-max ${
                                    idx === hoveredMegaIndex ? 'text-black' : 'text-gray-500 hover:text-black'
                                }`}
                            >
                                {cat.nombre}
                            </button>
                        ))}
                    </div>

                    {/* Featured Images */}
                    <div className="w-2/3 flex gap-6">
                        {featuredCategories.map((cat, idx) => (
                            <button
                                key={`${cat.nombre}-feature-${hoveredMegaIndex}-${idx}`}
                                onClick={() => selectCategory(cat.nombre)}
                                className={`flex-1 relative aspect-[4/5] bg-[#F4F5F6] overflow-hidden group cursor-pointer ${idx === 2 ? 'hidden md:block' : ''}`}
                            >
                                <img
                                    src={cat.imagenUrl || fallbackCategories[idx]?.imagenUrl || `/assets/templates/urbano/coleccion${idx + 5}.png`}
                                    alt={cat.nombre}
                                    className="w-full h-full object-cover mix-blend-luminosity opacity-90 transition-all duration-500 group-hover:scale-105 group-hover:opacity-100"
                                />
                                <div className="absolute bottom-4 left-4 text-white text-[10px] font-bold uppercase tracking-[0.2em] mix-blend-difference">
                                    {cat.nombre}
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Mobile Menu */}
            <div className={`lg:hidden fixed inset-0 bg-black/50 z-[100] transition-opacity duration-300 ${isMobileMenuOpen ? 'opacity-100 visible' : 'opacity-0 invisible'}`}>
                <div className={`absolute top-0 left-0 w-[80%] max-w-[300px] h-full bg-white transition-transform duration-300 flex flex-col ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                    <div className="p-5 flex justify-between items-center border-b border-gray-100">
                        <h2 className="text-xl font-black tracking-tighter uppercase" style={{ fontFamily: '"Impact", "Arial Black", sans-serif' }}>{storeName}</h2>
                        <button onClick={() => setIsMobileMenuOpen(false)} className="text-gray-500 p-2">
                            <Icon icon="mdi:close" width={24} />
                        </button>
                    </div>
                    <div className="flex flex-col p-6 gap-6">
                        <button onClick={() => { setIsMobileMenuOpen(false); goHome(); }} className="text-left text-xs font-bold uppercase tracking-[0.15em] text-gray-900">Inicio</button>
                        <div className="flex flex-col gap-4 pl-4 border-l-2 border-gray-100">
                            {megaMenuCategories.map((cat, idx) => (
                                <button
                                    key={`${cat.nombre}-mobile-${idx}`}
                                    onClick={() => selectCategory(cat.nombre)}
                                    className="text-left text-[11px] font-bold uppercase tracking-[0.15em] text-gray-500 hover:text-black"
                                >
                                    {cat.nombre}
                                </button>
                            ))}
                        </div>
                        <button onClick={() => { setIsMobileMenuOpen(false); goCatalog(); }} className="text-left text-xs font-bold uppercase tracking-[0.15em] text-gray-900 mt-2">Colecciones</button>
                    </div>
                </div>
            </div>

            {/* Global Search Overlay */}
            {searchOpen && (
                <div className="fixed inset-0 z-[999999]" style={{ fontFamily: '"Inter", sans-serif' }}>
                    <div className="absolute inset-0 bg-black/50" onClick={closeSearch} />
                    <div className="relative bg-white border-b-2 border-black animate-in slide-in-from-top duration-300">
                        <div className="max-w-[1100px] mx-auto px-4 md:px-8 py-6">
                            {/* Input */}
                            <div className="flex items-center gap-3 border-b-2 border-black pb-3">
                                <Icon icon="solar:magnifer-linear" width={22} className="text-black flex-shrink-0" />
                                <input
                                    autoFocus
                                    type="text"
                                    value={globalQuery}
                                    onChange={(e) => setGlobalQuery(e.target.value)}
                                    onKeyDown={(e) => { if (e.key === 'Enter') buscarTodo(); if (e.key === 'Escape') closeSearch(); }}
                                    placeholder="Buscar productos..."
                                    className="flex-1 bg-transparent text-lg md:text-xl font-bold uppercase tracking-tight outline-none placeholder-gray-300"
                                />
                                <button onClick={closeSearch} className="w-9 h-9 border-2 border-black flex items-center justify-center hover:bg-black hover:text-white transition-colors flex-shrink-0">
                                    <Icon icon="mdi:close" width={18} />
                                </button>
                            </div>

                            {/* Results */}
                            <div className="mt-5 max-h-[60vh] overflow-y-auto">
                                {globalQuery.trim().length < 2 ? (
                                    <p className="text-[11px] font-bold tracking-[0.2em] uppercase text-gray-400 py-6 text-center">
                                        Escribe para buscar en toda la tienda
                                    </p>
                                ) : globalLoading ? (
                                    <div className="flex items-center justify-center py-10 text-gray-400">
                                        <Icon icon="eos-icons:loading" width={28} />
                                    </div>
                                ) : globalResults.length === 0 ? (
                                    <p className="text-[11px] font-bold tracking-[0.2em] uppercase text-gray-400 py-6 text-center">
                                        Sin resultados para "{globalQuery}"
                                    </p>
                                ) : (
                                    <>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                            {globalResults.map((p: any) => (
                                                <button
                                                    key={p.id}
                                                    onClick={() => irAProducto(p.id)}
                                                    className="flex items-center gap-4 p-2 border-2 border-transparent hover:border-black transition-colors text-left"
                                                >
                                                    <div className="w-14 h-16 bg-[#F4F5F6] flex-shrink-0 overflow-hidden border border-gray-200">
                                                        {p.imagenUrl
                                                            ? <img src={p.imagenUrl} alt={p.descripcion} className="w-full h-full object-cover" />
                                                            : <div className="w-full h-full flex items-center justify-center"><Icon icon="solar:box-linear" className="text-gray-300" width={20} /></div>}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-[12px] font-bold uppercase text-black truncate">{p.descripcion}</p>
                                                        <p className="text-[12px] font-bold text-gray-500 mt-0.5">S/ {Number(p.precioUnitario || 0).toFixed(2)}</p>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                        <button
                                            onClick={buscarTodo}
                                            className="w-full mt-4 border-2 border-black py-3 text-[11px] font-bold tracking-[0.2em] uppercase hover:bg-black hover:text-white transition-colors"
                                        >
                                            Ver todos los resultados
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Favorites Drawer */}
            <UrbanoFavoritesDrawer isOpen={favOpen} onClose={() => setFavOpen(false)} slug={slug} />

        </div>
    );
}
