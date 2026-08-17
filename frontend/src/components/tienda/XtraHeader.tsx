import { useState, useRef, useEffect } from 'react';
import { Icon } from '@iconify/react';
import { useNavigate } from 'react-router-dom';
import useEscapeKey from '@/hooks/useEscapeKey';
import { useFavoritosStore } from '@/zustand/favoritos';
import axios from 'axios';
import { withPricingList } from '@/templates/shared/pricing';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4001/api';


interface XtraHeaderProps {
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
  onSearch?: () => void;
  cp: string;
}

export default function XtraHeader({
  tienda,
  slug,
  carritoCount,
  onToggleCart,
  isAdminOpen,
  setIsAdminOpen,
  adminMenuRef,
  search,
  setSearch,
  categories,
  onSelectCategory,
  recommendedProducts = [],
  hideCart = false,
  onSearch,
  cp,
}: XtraHeaderProps) {
  const navigate = useNavigate();
  const isLoggedIn = (() => { try { return !!localStorage.getItem('ACCESS_TOKEN'); } catch { return false; } })();
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const [isFavoritosOpen, setIsFavoritosOpen] = useState(false);
  const { getFavoritosBySlug, removeFavorito } = useFavoritosStore();
  const favoritos = getFavoritosBySlug(slug);

  useEscapeKey(() => setIsSearchFocused(false), isSearchFocused);
  useEscapeKey(() => setIsCategoryOpen(false), isCategoryOpen);
  useEscapeKey(() => setIsAdminOpen(false), isAdminOpen);
  useEscapeKey(() => setIsFavoritosOpen(false), isFavoritosOpen);

  const storeName = tienda.nombreComercial || 'Mi Tienda';
  const initials = storeName.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();
  const wordFirst = storeName.split(' ')[0];
  const wordRest = storeName.split(' ').slice(1).join(' ');
  const categoryNames = categories.map((cat) => typeof cat === 'string' ? cat : cat.nombre).filter(Boolean);
  const searchTerm = search.trim().toLowerCase();
  
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

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-[100] bg-white border-b border-gray-100 font-sans shadow-sm">
        <div className="max-w-screen-xl mx-auto px-5 md:px-8 h-16 flex items-center gap-5">

          {/* Logo */}
          <div
            className="flex items-center gap-2.5 flex-shrink-0 cursor-pointer"
            onClick={() => navigate(`/tienda/${slug}`)}
          >
            {tienda.logo ? (
              <img src={tienda.logo} alt={storeName} className="w-9 h-9 object-contain" />
            ) : (
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-sm flex-shrink-0"
                style={{ background: cp }}
              >
                {initials}
              </div>
            )}
            <div className="leading-tight hidden md:block">
              <p className="text-[10px] text-gray-400 uppercase tracking-widest leading-none">{wordFirst}</p>
              <p className="font-black text-gray-900 text-sm leading-tight">
                {wordRest || wordFirst}
                <span style={{ color: cp }}>.</span>
              </p>
            </div>
          </div>

          {/* Category dropdown */}
          {categoryNames.length > 0 && (
            <div className="relative hidden lg:block flex-shrink-0">
              <button
                type="button"
                onClick={() => setIsCategoryOpen((open) => !open)}
                className="h-11 inline-flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 text-sm font-black text-gray-800 shadow-sm hover:border-gray-300 hover:shadow-md transition-all"
              >
                <span className="h-7 w-7 rounded-xl flex items-center justify-center text-white" style={{ background: cp }}>
                  <Icon icon="solar:widget-5-bold-duotone" width={16} />
                </span>
                Categorías
                <Icon icon="solar:alt-arrow-down-bold" width={14} className={`transition-transform ${isCategoryOpen ? 'rotate-180' : ''}`} />
              </button>

              {isCategoryOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsCategoryOpen(false)} />
                  <div className="absolute left-0 top-[calc(100%+10px)] z-50 w-80 overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-2xl">
                    <div className="border-b border-gray-100 px-5 py-4">
                      <p className="text-[11px] font-black uppercase tracking-[0.18em] text-gray-400">Explorar categorías</p>
                      <p className="mt-1 text-sm font-bold text-gray-900">Encuentra productos por familia</p>
                    </div>
                    <div className="max-h-80 overflow-y-auto p-2">
                      <button
                        type="button"
                        onClick={() => { onSelectCategory(''); setIsCategoryOpen(false); }}
                        className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm font-bold text-gray-800 hover:bg-gray-50"
                      >
                        <span className="h-9 w-9 rounded-xl bg-gray-100 flex items-center justify-center"><Icon icon="solar:widget-bold" width={18} /></span>
                        Todos los productos
                      </button>
                      {categoryNames.map((name) => (
                        <button
                          key={name}
                          type="button"
                          onClick={() => { onSelectCategory(name); setIsCategoryOpen(false); }}
                          className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm font-bold text-gray-800 hover:bg-gray-50"
                        >
                          <span className="h-9 w-9 rounded-xl flex items-center justify-center" style={{ background: `${cp}14`, color: cp }}><Icon icon="solar:tag-bold-duotone" width={18} /></span>
                          <span className="min-w-0 flex-1 truncate">{name}</span>
                          <Icon icon="solar:alt-arrow-right-linear" width={14} className="text-gray-300" />
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Search */}
          <div className="flex-1 relative">
            <div className="h-11 flex items-center gap-3 rounded-2xl bg-gray-50/90 px-4 shadow-sm transition-all focus-within:bg-white focus-within:shadow-md">
              <Icon icon="solar:magnifer-linear" className="text-gray-400 text-sm flex-shrink-0" />
              <input
                type="text"
                value={search}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && onSearch?.()}
                placeholder="Buscar..."
                className="min-w-0 flex-1 appearance-none border-0 bg-transparent text-sm font-semibold text-gray-800 shadow-none outline-none ring-0 placeholder-gray-400 focus:border-0 focus:outline-none focus:ring-0"
              />
            </div>

            {/* Search dropdown */}
            {isSearchFocused && searchTerm && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setIsSearchFocused(false)} />
                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-gray-100 z-[60] p-4 min-w-[280px]">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Resultados de búsqueda</p>
                    <button
                      type="button"
                      onClick={() => { onSearch?.(); setIsSearchFocused(false); }}
                      className="text-[11px] font-black hover:opacity-80"
                      style={{ color: cp }}
                    >
                      Ver todos
                    </button>
                  </div>
                  {isSearching ? (
                    <div className="py-8 flex justify-center">
                      <Icon icon="eos-icons:loading" className="text-gray-300 text-2xl" />
                    </div>
                  ) : liveResults.length > 0 ? (
                    <div className="grid grid-cols-1 gap-1">
                      {liveResults.map((item: any) => (
                      <button
                        key={item.id}
                        onClick={() => { navigate(`/tienda/${slug}/producto/${item.id}`); setIsSearchFocused(false); }}
                        className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-xl text-left"
                      >
                        <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0">
                          <img src={item.imagenUrl || ''} className="w-full h-full object-contain rounded-xl p-1" alt="" />
                        </div>
                        <span className="text-xs font-semibold text-gray-800 truncate">{item.descripcion}</span>
                      </button>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-xl bg-gray-50 px-4 py-5 text-center">
                      <p className="text-xs font-bold text-gray-600">No encontramos productos con “{search.trim()}”.</p>
                      <p className="mt-1 text-[11px] text-gray-400">Prueba con otra marca, categoría o código.</p>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-2 flex-shrink-0">

            {/* Favoritos */}
            <button
              onClick={() => setIsFavoritosOpen(o => !o)}
              className="relative p-2.5 rounded-xl border border-gray-200 text-gray-600 hover:border-gray-300 transition-colors"
              title="Mis favoritos"
            >
              <Icon icon={favoritos.length > 0 ? 'solar:heart-bold' : 'solar:heart-linear'} className="text-xl" style={{ color: favoritos.length > 0 ? cp : undefined }} />
              {favoritos.length > 0 && (
                <span
                  className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full text-white text-[9px] flex items-center justify-center font-bold"
                  style={{ background: cp }}
                >
                  {favoritos.length > 9 ? '9+' : favoritos.length}
                </span>
              )}
            </button>

            {/* Cart */}
            {!hideCart && (
              <button
                onClick={onToggleCart}
                className="relative p-2.5 rounded-xl border border-gray-200 text-gray-600 hover:border-gray-300 transition-colors"
              >
                <Icon icon="solar:bag-2-linear" className="text-xl" />
                {carritoCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] flex items-center justify-center font-bold">
                    {carritoCount > 9 ? '9+' : carritoCount}
                  </span>
                )}
              </button>
            )}

            {/* Track order */}
            <button
              onClick={() => navigate(`/tienda/${slug}/seguimiento`)}
              className="p-2.5 rounded-xl border border-gray-200 text-gray-600 hover:border-gray-300 transition-colors hidden md:flex"
              title="Rastrear pedido"
            >
              <Icon icon="solar:delivery-linear" className="text-xl" />
            </button>

            {/* Admin */}
            {isLoggedIn && (
              <div className="relative" onClick={() => setIsAdminOpen(!isAdminOpen)} ref={adminMenuRef}>
                <button className="p-2.5 rounded-xl border border-gray-200 text-gray-600 hover:border-gray-300 transition-colors">
                  <Icon icon="solar:user-circle-linear" className="text-xl" />
                </button>
                {isAdminOpen && (
                  <div
                    className="fixed top-[72px] right-4 md:right-8 w-60 bg-white border border-gray-100 shadow-2xl z-[70] py-2 rounded-2xl animate-in slide-in-from-top-2"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="px-4 py-2 border-b border-gray-100">
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Administración</span>
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
                            className="w-full text-left px-4 py-2.5 hover:bg-gray-50 flex items-center gap-3 text-sm"
                          >
                            <Icon icon={icon} width={16} style={{ color }} />
                            <span className="text-gray-800 font-medium">{label}</span>
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

      </header>

      {/* Favoritos Drawer */}
      {isFavoritosOpen && (
        <>
          <div className="fixed inset-0 z-[110] bg-black/30" onClick={() => setIsFavoritosOpen(false)} />
          <div className="fixed top-0 right-0 h-full w-full max-w-sm z-[120] bg-white shadow-2xl flex flex-col animate-in slide-in-from-right-4 duration-200">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Icon icon="solar:heart-bold" width={20} style={{ color: cp }} />
                <span className="font-bold text-gray-900">Mis Favoritos</span>
                {favoritos.length > 0 && (
                  <span className="text-white text-[10px] font-black px-2 py-0.5 rounded-full" style={{ background: cp }}>
                    {favoritos.length}
                  </span>
                )}
              </div>
              <button onClick={() => setIsFavoritosOpen(false)} className="p-1.5 rounded-full hover:bg-gray-100">
                <Icon icon="solar:close-circle-bold" width={22} className="text-gray-400" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-3">
              {favoritos.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-4 text-center py-16">
                  <Icon icon="solar:heart-linear" width={56} className="text-gray-200" />
                  <p className="text-sm font-semibold text-gray-400">Aún no tienes favoritos</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {favoritos.map((item) => (
                    <div key={item.id} className="flex items-center gap-3 p-3 rounded-2xl hover:bg-gray-50 transition-colors group">
                      <div
                        className="w-14 h-14 rounded-xl bg-gray-50 flex items-center justify-center flex-shrink-0 overflow-hidden cursor-pointer"
                        onClick={() => { navigate(`/tienda/${slug}/producto/${item.id}`); setIsFavoritosOpen(false); }}
                      >
                        {item.imagenUrl
                          ? <img src={item.imagenUrl} alt={item.descripcion} className="w-full h-full object-contain p-1" />
                          : <Icon icon="solar:box-linear" width={28} className="text-gray-300" />}
                      </div>
                      <div className="flex-1 min-w-0 cursor-pointer" onClick={() => { navigate(`/tienda/${slug}/producto/${item.id}`); setIsFavoritosOpen(false); }}>
                        <p className="text-xs font-semibold text-gray-900 leading-tight line-clamp-2">{item.descripcion}</p>
                        <p className="text-sm font-black mt-1" style={{ color: cp }}>S/ {Number(item.precioUnitario).toFixed(2)}</p>
                      </div>
                      <button
                        onClick={() => removeFavorito(item.id, slug)}
                        className="p-1.5 rounded-full opacity-0 group-hover:opacity-100 hover:bg-red-50 transition-all flex-shrink-0"
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
