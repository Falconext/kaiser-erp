import React, { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';
import { Link, useNavigate } from 'react-router-dom';
import { useFavoritosStore } from '@/zustand/favoritos';

interface AutopartesHeaderProps {
  tienda: any;
  slug: string;
  cp: string;
  carritoSize: number;
  carritoTotal?: number;
  onOpenCart: () => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  onSearchSubmit: (e: React.FormEvent, value: string) => void;
  allCategories?: any[];
}

export default function AutopartesHeader({
  tienda,
  slug,
  cp,
  carritoSize,
  carritoTotal = 0,
  onOpenCart,
  searchQuery,
  setSearchQuery,
  onSearchSubmit,
  allCategories = []
}: AutopartesHeaderProps) {
  const navigate = useNavigate();
  const [isCategoryMenuOpen, setIsCategoryMenuOpen] = useState(false);
  const [isFavoritesOpen, setIsFavoritesOpen] = useState(false);
  const { getFavoritosBySlug, removeFavorito } = useFavoritosStore();
  const favoritos = getFavoritosBySlug(slug);

  const [localSearch, setLocalSearch] = useState(searchQuery);

  useEffect(() => {
    setLocalSearch(searchQuery);
  }, [searchQuery]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchQuery(localSearch);
    onSearchSubmit(e, localSearch);
  };

  const goTracking = () => {
    if (slug === 'preview') {
      window.dispatchEvent(new CustomEvent('preview-nav', { detail: 'checkout' }));
      return;
    }
    navigate(`/tienda/${slug}/seguimiento`);
  };

  // Fallback links if categories are few
  const quickLinks = ['Tienda de Llantas', 'Fluidos y Lubricantes', 'Baterías', 'Herramientas', 'Camiones', 'Motocicletas', 'Zona Eléctrica'];

  return (
    <header className="w-full bg-white border-b border-gray-100 flex flex-col">
      {/* Top Bar */}
      <div className="w-full max-w-7xl mx-auto px-4 xl:px-8 py-4 flex items-center justify-between gap-6">
        {/* Logo */}
        <Link to={`/tienda/${slug}`} className="flex items-center gap-2 flex-shrink-0">
          {tienda?.logo ? (
            <img src={tienda.logo} alt={tienda.nombre} className="h-10 w-auto object-contain" />
          ) : (
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-white" style={{ backgroundColor: cp }}>
                <Icon icon="solar:wheel-bold" width={24} />
              </div>
              <span className="text-2xl font-black text-gray-900 tracking-tight hidden sm:block">
                {tienda?.nombre || 'Tu Tienda'}
              </span>
            </div>
          )}
        </Link>

        {/* Search Bar (Center) */}
        <div className="flex-1 max-w-2xl hidden md:block">
          <form onSubmit={handleSubmit} className="flex items-center w-full bg-[#F3F4F6] rounded-md overflow-hidden border border-gray-200">
            <div className="pl-4 text-gray-400">
              <Icon icon="solar:magnifer-linear" width={20} />
            </div>
            <input
              type="text"
              placeholder="Buscar producto..."
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              className="w-full bg-transparent border-none outline-none px-3 py-3 text-sm text-gray-800"
            />
            <button type="submit" className="px-6 py-3 font-bold text-white transition-opacity hover:opacity-90" style={{ backgroundColor: '#0B1120' }}>
              Buscar
            </button>
          </form>
        </div>

        {/* Icons Right */}
        <div className="flex items-center gap-4 sm:gap-6 flex-shrink-0">
          <button
            type="button"
            onClick={goTracking}
            className="relative text-gray-600 hover:text-gray-900 transition-colors hidden sm:block"
            title="Rastrear mi pedido"
            aria-label="Rastrear mi pedido"
          >
            <Icon icon="solar:box-minimalistic-bold-duotone" width={24} />
          </button>
          <button
            type="button"
            onClick={() => setIsFavoritesOpen(true)}
            className="relative text-gray-600 hover:text-gray-900 transition-colors hidden sm:block"
            title="Mis favoritos"
          >
            <Icon icon={favoritos.length > 0 ? 'solar:heart-bold' : 'solar:heart-linear'} width={24} />
            {favoritos.length > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-4 h-4 text-white text-[10px] font-bold flex items-center justify-center rounded-full" style={{ backgroundColor: cp }}>
                {favoritos.length > 9 ? '9+' : favoritos.length}
              </span>
            )}
          </button>
          <button 
            onClick={onOpenCart}
            className="relative flex items-center gap-2 group cursor-pointer"
          >
            <div className="relative">
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-red-500 group-hover:bg-red-50 transition-colors">
                <Icon icon="solar:bag-3-bold" width={26} />
              </div>
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[11px] font-bold flex items-center justify-center rounded-full border-2 border-white shadow-sm">
                {carritoSize}
              </span>
            </div>
            <div className="hidden lg:flex flex-col items-start leading-tight">
              <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">Artículos</span>
              <span className="text-sm font-black text-gray-900">S/ {carritoTotal.toFixed(2)} <Icon icon="solar:alt-arrow-down-linear" className="inline ml-0.5" /></span>
            </div>
          </button>
          <div className="hidden lg:flex items-center gap-3 pl-4 border-l border-gray-200">
            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden">
              <Icon icon="solar:user-bold" width={24} className="text-gray-400 mt-2" />
            </div>
            <div className="flex flex-col leading-tight">
              <span className="text-[11px] text-gray-500">¡Hola!</span>
              <span className="text-sm font-bold text-gray-900">Usuario</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Nav Bar (Contained) */}
      <div className="w-full bg-white text-white pb-4">
        <div className="w-full max-w-7xl mx-auto px-4 xl:px-8 flex items-stretch">
          {/* Categories Dropdown Button */}
          <div className="relative z-50">
            <button 
              onClick={() => setIsCategoryMenuOpen(!isCategoryMenuOpen)}
              className="flex items-center justify-between gap-6 px-6 h-14 w-64 text-white font-bold transition-opacity hover:opacity-95 rounded-l-md"
              style={{ backgroundColor: cp }}
            >
              <div className="flex items-center gap-3">
                <Icon icon="solar:hamburger-menu-linear" width={22} />
                <span>Categorías</span>
              </div>
              <Icon icon={isCategoryMenuOpen ? "solar:alt-arrow-up-linear" : "solar:alt-arrow-down-linear"} width={20} />
            </button>
            
            {/* Dropdown Menu */}
            {isCategoryMenuOpen && (
              <div className="absolute top-full left-0 w-full bg-white border border-gray-200 shadow-xl rounded-b-lg overflow-hidden py-2 z-50">
                {allCategories.length > 0 ? (
                  allCategories.map((cat: any) => {
                    const name = typeof cat === 'string' ? cat : cat.nombre;
                    return (
                      <button 
                        key={name}
                        onClick={() => {
                          setSearchQuery(name);
                          setIsCategoryMenuOpen(false);
                          // We trigger a search by navigating to catalog
                          slug === "preview" ? window.dispatchEvent(new CustomEvent("preview-nav", { detail: "catalogo" })) : navigate(`/tienda/${slug}/catalogo?q=${encodeURIComponent(name)}`);
                        }}
                        className="w-full text-left px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-red-600 transition-colors"
                      >
                        {name}
                      </button>
                    )
                  })
                ) : (
                  quickLinks.map(link => (
                    <button 
                      key={link}
                      onClick={() => {
                        setSearchQuery(link);
                        setIsCategoryMenuOpen(false);
                        slug === "preview" ? window.dispatchEvent(new CustomEvent("preview-nav", { detail: "catalogo" })) : navigate(`/tienda/${slug}/catalogo?q=${encodeURIComponent(link)}`);
                      }}
                      className="w-full text-left px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-red-600 transition-colors"
                    >
                      {link}
                    </button>
                  ))
                )}
                <button
                  onClick={() => { setIsCategoryMenuOpen(false); goTracking(); }}
                  className="mt-1 flex w-full items-center gap-2 border-t border-gray-100 px-5 py-3 text-sm font-bold text-gray-800 hover:bg-gray-50 transition-colors"
                >
                  <Icon icon="solar:box-minimalistic-bold-duotone" width={18} style={{ color: cp }} />
                  Rastrear mi pedido
                </button>
              </div>
            )}
          </div>

          {/* Quick Links (Desktop) inside dark bar */}
          <div className="hidden lg:flex items-center flex-1 overflow-x-auto no-scrollbar bg-[#1A1A1A] rounded-r-md px-2">
            {quickLinks.map((link) => (
              <button 
                key={link} 
                onClick={() => {
                  setSearchQuery(link);
                  slug === "preview" ? window.dispatchEvent(new CustomEvent("preview-nav", { detail: "catalogo" })) : navigate(`/tienda/${slug}/catalogo?q=${encodeURIComponent(link)}`);
                }}
                className="px-5 h-full flex items-center text-sm font-bold text-gray-300 hover:text-white whitespace-nowrap transition-colors border-b-2 border-transparent hover:border-white"
              >
                {link}
              </button>
            ))}
          </div>
        </div>
      </div>

      {isFavoritesOpen && (
        <>
          <div className="fixed inset-0 z-[110] bg-black/40" onClick={() => setIsFavoritesOpen(false)} />
          <aside className="fixed top-0 right-0 z-[120] h-full w-full max-w-sm bg-white shadow-2xl flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Icon icon="solar:heart-bold" width={20} style={{ color: cp }} />
                <span className="font-black text-gray-900">Mis favoritos</span>
                {favoritos.length > 0 && (
                  <span className="text-white text-[10px] font-black px-2 py-0.5 rounded-full" style={{ backgroundColor: cp }}>
                    {favoritos.length}
                  </span>
                )}
              </div>
              <button type="button" onClick={() => setIsFavoritesOpen(false)} className="p-2 rounded-full hover:bg-gray-100 transition-colors">
                <Icon icon="solar:close-circle-bold" width={22} className="text-gray-400" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {favoritos.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center gap-3">
                  <Icon icon="solar:heart-linear" width={58} className="text-gray-200" />
                  <p className="text-sm font-bold text-gray-500">Aún no tienes favoritos</p>
                  <p className="text-xs text-gray-400">Guarda repuestos con el corazón para volver rápido.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {favoritos.map((item) => (
                    <div key={`${item.slug}-${item.id}`} className="group flex items-center gap-3 rounded-2xl p-3 hover:bg-gray-50 transition-colors">
                      <button
                        type="button"
                        onClick={() => { navigate(`/tienda/${slug}/producto/${item.id}`); setIsFavoritesOpen(false); }}
                        className="w-14 h-14 rounded-xl bg-gray-100 flex items-center justify-center overflow-hidden flex-shrink-0"
                      >
                        {item.imagenUrl ? (
                          <img src={item.imagenUrl} alt={item.descripcion} className="w-full h-full object-contain p-1" />
                        ) : (
                          <Icon icon="solar:box-linear" width={28} className="text-gray-300" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => { navigate(`/tienda/${slug}/producto/${item.id}`); setIsFavoritesOpen(false); }}
                        className="min-w-0 flex-1 text-left"
                      >
                        <p className="line-clamp-2 text-xs font-bold text-gray-900">{item.descripcion}</p>
                        <p className="mt-1 text-sm font-black" style={{ color: cp }}>S/ {Number(item.precioUnitario || 0).toFixed(2)}</p>
                      </button>
                      <button
                        type="button"
                        onClick={() => removeFavorito(item.id, slug)}
                        className="p-2 rounded-full text-red-400 hover:bg-red-50 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all"
                        title="Quitar"
                      >
                        <Icon icon="solar:trash-bin-minimalistic-bold" width={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </aside>
        </>
      )}
    </header>
  );
}
