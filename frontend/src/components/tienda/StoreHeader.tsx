import { Icon } from '@iconify/react';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useEscapeKey from '@/hooks/useEscapeKey';
import { useFavoritosStore } from '@/zustand/favoritos';
import axios from 'axios';
import { withPricingList } from '@/templates/shared/pricing';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4001/api';

interface StoreHeaderProps {
    tienda: any;
    slug: string;
    carritoCount: number;
    onToggleCart: () => void;
    isAdminOpen: boolean;
    setIsAdminOpen: (open: boolean) => void;
    adminMenuRef: any;
    search: string;
    setSearch: (s: string) => void;
    categories: (string | { nombre: string; imagenUrl?: string })[];
    onSelectCategory: (cat: string) => void;
    recommendedProducts?: any[];
    hideCart?: boolean;
}

export default function StoreHeader({
    tienda,
    slug,
    carritoCount,
    onToggleCart,
    isAdminOpen,
    setIsAdminOpen,
    adminMenuRef,
    search,
    setSearch,
    categories = [],
    onSelectCategory,
    recommendedProducts = [],
    onSearch,
    hideCart = false
}: StoreHeaderProps & { onSearch?: () => void }) {
    const navigate = useNavigate();
    const isLoggedIn = (() => { try { return !!localStorage.getItem('ACCESS_TOKEN'); } catch { return false; } })();
    const [isCatDropdownOpen, setIsCatDropdownOpen] = useState(false);
    const [isSearchFocused, setIsSearchFocused] = useState(false);
    const [isFavoritosOpen, setIsFavoritosOpen] = useState(false);
    const { getFavoritosBySlug, removeFavorito } = useFavoritosStore();
    const favoritos = getFavoritosBySlug(slug);

    useEscapeKey(() => setIsSearchFocused(false), isSearchFocused);
    useEscapeKey(() => setIsCatDropdownOpen(false), isCatDropdownOpen);
    useEscapeKey(() => setIsAdminOpen(false), isAdminOpen);
    useEscapeKey(() => setIsFavoritosOpen(false), isFavoritosOpen);

    const cp = tienda?.diseno?.colorPrimario || '#FF9500';

    const [liveResults, setLiveResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    // Búsqueda en vivo al backend
    useEffect(() => {
        const term = search.trim();
        if (!term) {
            setLiveResults([]);
            return;
        }
        const timer = setTimeout(async () => {
            setIsSearching(true);
            try {
                const { data } = await axios.get(`${BASE_URL}/public/store/${slug}/products`, {
                    params: { search: term, limit: 8 }
                });
                const items = Array.isArray(data) ? data : data?.data?.data || data?.data || [];
                setLiveResults(withPricingList(items));
            } catch (e) {
                console.error('Error fetching live search', e);
            } finally {
                setIsSearching(false);
            }
        }, 350);
        return () => clearTimeout(timer);
    }, [search, slug]);

    const handleSearchTrigger = () => { if (onSearch) onSearch(); };

    return (
        <>
        <header className="fixed top-0 left-0 right-0 z-[100] font-sans bg-white shadow-sm">

            {/* ── Main Row ── */}
            <div className="max-w-screen-xl mx-auto px-5 md:px-8 py-3 flex items-center gap-4">

                {/* Logo */}
                <div
                    className="flex-shrink-0 cursor-pointer flex items-center gap-2"
                    onClick={() => navigate(`/tienda/${slug}`)}
                >
                    {tienda.logo ? (
                        <img src={tienda.logo} alt={tienda.nombreComercial} className="w-9 h-9 object-contain" />
                    ) : (
                        <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: cp }}>
                            <Icon icon="solar:shop-bold" className="text-white" width={20} />
                        </div>
                    )}
                    <span className="text-lg font-black text-[#1A1A1A] tracking-tight hidden md:block">
                        {tienda.nombreComercial || 'Mi Tienda'}
                    </span>
                </div>

                {/* Deals Pill */}
                <button
                    onClick={() => document.getElementById('productos-populares')?.scrollIntoView({ behavior: 'smooth' })}
                    className="hidden md:flex items-center gap-1.5 text-white text-sm font-bold px-4 py-2 rounded-full flex-shrink-0 transition-colors"
                    style={{ background: cp }}
                >
                    <Icon icon="solar:tag-bold" width={16} />
                    Ofertas
                </button>

                {/* Search Bar */}
                <div className="flex-1 relative">
                    <div className="flex items-center focus:outline-none gap-2 bg-[#F5F5F5] rounded-full px-4 border border-transparent transition-colors">
                        <Icon icon="solar:magnifer-linear" className="text-[#999] flex-shrink-0" width={18} />
                        <input
                            type="text"
                            value={search}
                            onFocus={() => setIsSearchFocused(true)}
                            onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
                            onChange={(e) => setSearch(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSearchTrigger()}
                            placeholder="Buscar producto..."
                            className="flex-1 bg-transparent focus:outline-none text-sm text-[#1A1A1A] border-none placeholder-[#999]"
                        />
                    </div>

                    {/* Search Dropdown */}
                    {isSearchFocused && search.trim() && (
                        <>
                            <div className="fixed inset-0 z-30" onClick={() => setIsSearchFocused(false)} />
                            <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-gray-100 z-[60] p-4">
                                <div className="flex justify-between items-center mb-3">
                                    <p className="text-[10px] font-bold text-[#999] uppercase tracking-widest">Resultados de búsqueda</p>
                                    <button onClick={handleSearchTrigger} className="text-[11px] font-black text-gray-800 hover:opacity-80">Ver todos</button>
                                </div>
                                {isSearching ? (
                                    <div className="py-8 flex justify-center">
                                        <Icon icon="eos-icons:loading" className="text-gray-300 text-2xl" />
                                    </div>
                                ) : liveResults.length > 0 ? (
                                    <div className="grid grid-cols-2 gap-2">
                                        {liveResults.map((item, i) => (
                                            <a
                                                href={`/tienda/${slug}/producto/${item.id}`}
                                                key={i}
                                                className="flex items-center gap-3 p-2 hover:bg-[#FAF6F1] rounded-xl group"
                                            >
                                                <div className="w-10 h-10 rounded-xl bg-[#FAF6F1] flex items-center justify-center flex-shrink-0">
                                                    <img src={item.imagenUrl || ''} className="w-full h-full object-contain rounded-xl p-1" alt="" />
                                                </div>
                                                <span className="text-xs font-semibold text-[#1A1A1A] truncate transition-colors">
                                                    {item.descripcion}
                                                </span>
                                            </a>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="rounded-xl bg-gray-50 px-4 py-5 text-center">
                                        <p className="text-xs font-bold text-gray-600">No encontramos productos con "{search.trim()}"</p>
                                    </div>
                                )}
                            </div>
                        </>
                    )}

                </div>

                {/* Right Icons */}
                <div className="flex items-center gap-3 flex-shrink-0">
                    {/* Favorites */}
                    <button
                        onClick={() => setIsFavoritosOpen(o => !o)}
                        className="relative p-2 hover:bg-black/5 rounded-full transition-colors"
                        style={{ color: cp }}
                        title="Mis favoritos"
                    >
                        <Icon icon={favoritos.length > 0 ? 'solar:heart-bold' : 'solar:heart-linear'} width={24} />
                        {favoritos.length > 0 && (
                            <span className="absolute top-0 right-0 text-white text-[9px] font-black w-[18px] h-[18px] flex items-center justify-center rounded-full border-2 border-white" style={{ background: cp }}>
                                {favoritos.length > 9 ? '9+' : favoritos.length}
                            </span>
                        )}
                    </button>

                    {/* Cart */}
                    {!hideCart && (
                        <button
                            onClick={onToggleCart}
                            className="relative p-2 hover:bg-black/5 rounded-full transition-colors"
                            style={{ color: cp }}
                        >
                            <Icon icon="solar:cart-large-2-linear" width={24} />
                            {carritoCount > 0 && (
                                <span className="absolute top-0 right-0 text-white text-[9px] font-black w-4.5 h-4.5 w-[18px] h-[18px] flex items-center justify-center rounded-full border-2 border-white" style={{ background: cp }}>
                                    {carritoCount > 9 ? '9+' : carritoCount}
                                </span>
                            )}
                        </button>
                    )}

                    {/* Track Order */}
                    <button
                        onClick={() => navigate(`/tienda/${slug}/seguimiento`)}
                        className="p-2 hover:bg-black/5 rounded-full transition-colors hidden md:block"
                        style={{ color: cp }}
                        title="Rastrear pedido"
                    >
                        <Icon icon="solar:delivery-linear" width={24} />
                    </button>

                    {/* Admin */}
                    {isLoggedIn && (
                        <div className="relative" onClick={() => setIsAdminOpen(!isAdminOpen)} ref={adminMenuRef}>
                            <button className="p-2 hover:bg-black/5 rounded-full transition-colors" style={{ color: cp }}>
                                <Icon icon="solar:user-circle-linear" width={24} />
                            </button>
                            {isAdminOpen && (
                                <div
                                    className="fixed top-[110px] right-4 md:right-8 w-60 bg-white border border-gray-100 shadow-2xl z-[70] py-2 rounded-2xl animate-in slide-in-from-top-2"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <div className="px-4 py-2 border-b border-gray-100">
                                        <span className="text-[10px] font-black text-[#999] uppercase tracking-widest">Administración</span>
                                    </div>
                                    <ul className="py-1">
                                        {[
                                            { icon: 'solar:bag-check-bold', label: 'Ver Pedidos', color: cp, path: '/administrador/tienda/pedidos' },
                                            { icon: 'solar:shop-bold', label: 'Config. Tienda', color: '#22C55E', path: '/administrador/tienda/configuracion' },
                                            { icon: 'solar:palette-round-bold', label: 'Diseño Template', color: '#7C3AED', path: '/administrador/tienda/template' },
                                            { icon: 'solar:box-bold', label: 'Productos', color: '#7C3AED', path: '/administrador/kardex/productos' },
                                            { icon: 'solar:bill-list-bold', label: 'Facturación', color: '#2563EB', path: '/administrador' },
                                        ].map(({ icon, label, color, path }) => (
                                            <li key={path}>
                                                <button
                                                    onClick={() => { navigate(path); setTimeout(() => setIsAdminOpen(false), 150); }}
                                                    className="w-full text-left px-4 py-2.5 hover:bg-[#FAF6F1] flex items-center gap-3 text-sm"
                                                >
                                                    <Icon icon={icon} width={16} style={{ color }} />
                                                    <span className="text-[#1A1A1A] font-medium">{label}</span>
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* ── Category Nav Row ── */}
            <div className="border-t border-gray-100">
                <div className="max-w-screen-xl mx-auto px-5 md:px-8 py-2.5 flex items-center gap-2 overflow-x-auto no-scrollbar">

                    {/* All Categories Dropdown */}
                    <div className="relative flex-shrink-0">
                        <button
                            onClick={() => setIsCatDropdownOpen(!isCatDropdownOpen)}
                            className="flex items-center gap-1.5 bg-[#2D2D2D] text-white text-xs font-bold px-4 py-2 rounded-full hover:bg-black transition-colors whitespace-nowrap"
                        >
                            <Icon icon="solar:hamburger-menu-bold" width={14} />
                            Categorías
                            <Icon icon="solar:alt-arrow-down-linear" width={10} className={`transition-transform ${isCatDropdownOpen ? 'rotate-180' : ''}`} />
                        </button>
                    </div>

                    {/* Category Pills */}
                    {categories.slice(0, 8).map((cat, idx) => {
                        const name = typeof cat === 'string' ? cat : cat.nombre;
                        return (
                            <button
                                key={idx}
                                onClick={() => onSelectCategory(name)}
                                className="flex items-center gap-1.5 bg-[#2D2D2D] text-white text-xs font-bold px-4 py-2 rounded-full hover:bg-black transition-colors whitespace-nowrap flex-shrink-0"
                            >
                                <Icon icon="solar:tag-bold" width={12} />
                                {name}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Categories Full Dropdown */}
            {isCatDropdownOpen && (
                <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsCatDropdownOpen(false)} />
                    <div className="fixed top-[125px] left-0 right-0 z-50 pointer-events-none flex justify-center">
                        <div className="w-full max-w-screen-xl px-5 md:px-8 relative pointer-events-none">
                            <div className="absolute left-5 md:left-8 top-0 w-64 bg-white border border-gray-100 shadow-2xl py-2 rounded-2xl animate-in slide-in-from-top-2 pointer-events-auto">
                                <div className="px-4 py-2 border-b border-gray-100">
                                    <span className="text-[10px] font-black text-[#999] uppercase tracking-widest">Todas las Categorías</span>
                                </div>
                                <ul className="max-h-64 overflow-y-auto py-1">
                                    <li>
                                        <button
                                            onClick={() => { onSelectCategory(''); setIsCatDropdownOpen(false); }}
                                            className="w-full text-left px-4 py-2.5 hover:bg-[#FAF6F1] flex items-center gap-2.5 text-sm text-[#1A1A1A] font-medium"
                                        >
                                            <Icon icon="solar:widget-bold" width={16} style={{ color: cp }} />
                                            Todos los productos
                                        </button>
                                    </li>
                                    {categories.map((cat, idx) => {
                                        const name = typeof cat === 'string' ? cat : cat.nombre;
                                        return (
                                            <li key={idx}>
                                                <button
                                                    onClick={() => { onSelectCategory(name); setIsCatDropdownOpen(false); }}
                                                    className="w-full text-left px-4 py-2.5 hover:bg-[#FAF6F1] flex items-center gap-2.5 text-sm text-[#1A1A1A] font-medium"
                                                >
                                                    <Icon icon="solar:tag-bold" width={16} style={{ color: cp }} />
                                                    {name}
                                                </button>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </header>

        {/* Favorites Drawer */}
        {isFavoritosOpen && (
            <>
                <div className="fixed inset-0 z-[110] bg-black/30" onClick={() => setIsFavoritosOpen(false)} />
                <div className="fixed top-0 right-0 h-full w-full max-w-sm z-[120] bg-white shadow-2xl flex flex-col animate-in slide-in-from-right-4 duration-200">
                    {/* Header */}
                    <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                        <div className="flex items-center gap-2">
                            <Icon icon="solar:heart-bold" width={20} style={{ color: cp }} />
                            <span className="font-bold text-[#1A1A1A]">Mis Favoritos</span>
                            {favoritos.length > 0 && (
                                <span className="text-white text-[10px] font-black px-2 py-0.5 rounded-full" style={{ background: cp }}>{favoritos.length}</span>
                            )}
                        </div>
                        <button onClick={() => setIsFavoritosOpen(false)} className="p-1.5 rounded-full hover:bg-gray-100 transition-colors">
                            <Icon icon="solar:close-circle-bold" width={22} className="text-gray-400" />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto px-4 py-3">
                        {favoritos.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full gap-4 text-center py-16">
                                <Icon icon="solar:heart-linear" width={56} className="text-gray-200" />
                                <p className="text-sm font-semibold text-gray-400">Aún no tienes favoritos</p>
                                <p className="text-xs text-gray-300">Toca el corazón en cualquier producto para guardarlo aquí</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {favoritos.map((item) => (
                                    <div key={item.id} className="flex items-center gap-3 p-3 rounded-2xl hover:bg-[#FAF6F1] transition-colors group">
                                        <div
                                            className="w-14 h-14 rounded-xl bg-[#FAF6F1] flex items-center justify-center flex-shrink-0 overflow-hidden cursor-pointer"
                                            onClick={() => { navigate(`/tienda/${slug}/producto/${item.id}`); setIsFavoritosOpen(false); }}
                                        >
                                            {item.imagenUrl ? (
                                                <img src={item.imagenUrl} alt={item.descripcion} className="w-full h-full object-contain p-1" />
                                            ) : (
                                                <Icon icon="solar:box-linear" width={28} className="text-gray-300" />
                                            )}
                                        </div>
                                        <div
                                            className="flex-1 min-w-0 cursor-pointer"
                                            onClick={() => { navigate(`/tienda/${slug}/producto/${item.id}`); setIsFavoritosOpen(false); }}
                                        >
                                            <p className="text-xs font-semibold text-[#1A1A1A] leading-tight line-clamp-2">{item.descripcion}</p>
                                            <p className="text-sm font-black mt-1" style={{ color: cp }}>S/ {Number(item.precioUnitario).toFixed(2)}</p>
                                        </div>
                                        <button
                                            onClick={() => removeFavorito(item.id, slug)}
                                            className="p-1.5 rounded-full opacity-0 group-hover:opacity-100 hover:bg-red-50 transition-all flex-shrink-0"
                                            title="Quitar de favoritos"
                                        >
                                            <Icon icon="solar:trash-bin-minimalistic-bold" width={16} className="text-red-400" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </>
        )}
    </>
    );
}
