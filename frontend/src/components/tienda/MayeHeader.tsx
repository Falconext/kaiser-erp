import React, { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';
import { Link, useNavigate } from 'react-router-dom';
import { useFavoritosStore } from '@/zustand/favoritos';

interface MayeHeaderProps {
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
  diseno?: any;
  onCategorySelect?: (name: string) => void;
}

export default function MayeHeader({
  tienda,
  slug,
  cp,
  carritoSize,
  carritoTotal = 0,
  onOpenCart,
  searchQuery,
  setSearchQuery,
  onSearchSubmit,
  allCategories = [],
  diseno,
  onCategorySelect,
}: MayeHeaderProps) {
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

  const goCategory = (name: string) => {
    const categoryName = resolveCategoryName(name);
    setSearchQuery('');
    setLocalSearch('');
    setIsCategoryMenuOpen(false);
    onCategorySelect?.(categoryName);
    slug === "preview"
      ? window.dispatchEvent(new CustomEvent("preview-nav", { detail: "catalogo" }))
      : navigate(`/tienda/${slug}/catalogo?category=${encodeURIComponent(categoryName)}`);
  };
  const goProduct = (item: any) => {
    setIsFavoritesOpen(false);
    if (slug === 'preview') {
      window.dispatchEvent(new CustomEvent('preview-product', { detail: item }));
      return;
    }
    navigate(`/tienda/${slug}/producto/${item.id}`);
  };

  const goTracking = () => {
    if (slug === 'preview') {
      window.dispatchEvent(new CustomEvent('preview-nav', { detail: 'checkout' }));
      return;
    }
    navigate(`/tienda/${slug}/seguimiento`);
  };

  const categoryNames = Array.from(new Set(
    allCategories
      .map((cat: any) => typeof cat === 'string' ? cat : cat?.nombre || cat?.name || cat?.descripcion)
      .filter(Boolean)
      .map(String)
  ));

  const fallbackQuickLinks = [
    diseno?.mayeQuickLink1 || 'Laptops y PCs',
    diseno?.mayeQuickLink2 || 'Procesadores y RAM',
    diseno?.mayeQuickLink3 || 'Almacenamiento',
    diseno?.mayeQuickLink4 || 'Tarjetas Gráficas',
    'Monitores',
    'Periféricos',
    'Sillas Gamer',
  ].filter(Boolean);
  const quickLinks = categoryNames.length > 0 ? categoryNames.slice(0, 8) : fallbackQuickLinks;
  const normalizeCategory = (value: string) => value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
  const resolveCategoryName = (value: string) => {
    const normalized = normalizeCategory(value);
    return categoryNames.find(name => normalizeCategory(name) === normalized)
      || categoryNames.find(name => {
        const current = normalizeCategory(name);
        return current.includes(normalized) || normalized.includes(current);
      })
      || value;
  };

  return (
    <header className="w-full bg-white border-b border-gray-100 flex flex-col">
      {/* Top Bar */}
      <div className="w-full max-w-7xl mx-auto px-4 xl:px-8 py-3 md:py-4 flex items-center justify-between gap-4 md:gap-6">
        {/* Logo */}
        <Link to={`/tienda/${slug}`} className="flex items-center gap-2 flex-shrink-0">
          {tienda?.logo ? (
            <img src={tienda.logo} alt={tienda.nombre} className="h-9 w-auto object-contain md:h-10" />
          ) : (
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-full flex items-center justify-center text-white md:h-10 md:w-10" style={{ backgroundColor: cp }}>
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
          <form onSubmit={handleSubmit} className="flex items-center w-full bg-[#F3F4F6] rounded-2xl overflow-hidden border border-gray-200 focus-within:border-transparent focus-within:ring-2 transition-all" style={{ ['--tw-ring-color' as any]: `${cp}55` }}>
            <div className="pl-4 text-gray-400">
              <Icon icon="solar:magnifer-linear" width={20} />
            </div>
            <input
              type="text"
              placeholder={diseno?.mayeSearchPlaceholder || 'Buscar producto...'}
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              className="w-full appearance-none border-0 bg-transparent px-3 py-3 text-sm font-semibold text-gray-800 shadow-none outline-none placeholder:text-gray-400 focus:border-transparent focus:outline-none focus:ring-0"
            />
            <button type="submit" className="mx-1.5 rounded-xl px-5 py-2.5 font-bold text-white transition-opacity hover:opacity-90" style={{ backgroundColor: cp }}>
              Buscar
            </button>
          </form>
        </div>

        {/* Icons Right */}
        <div className="flex items-center gap-3 sm:gap-6 flex-shrink-0">
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
              <div className="w-10 h-10 rounded-full flex items-center justify-center transition-colors" style={{ color: cp }}>
                <Icon icon="solar:bag-3-bold" width={26} />
              </div>
              <span className="absolute -top-1 -right-1 w-5 h-5 text-white text-[11px] font-bold flex items-center justify-center rounded-full border-2 border-white shadow-sm" style={{ backgroundColor: cp }}>
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
              <span className="text-sm font-bold text-gray-900">Cliente</span>
            </div>
          </div>
        </div>
      </div>

      <div className="w-full max-w-7xl mx-auto px-4 pb-3 md:hidden">
        <form
          onSubmit={handleSubmit}
          className="flex h-12 items-center gap-2 rounded-[18px] border border-gray-100 bg-white px-2.5 shadow-sm transition-all focus-within:border-transparent focus-within:ring-2"
          style={{ ['--tw-ring-color' as any]: `${cp}45` }}
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: `${cp}12`, color: cp }}>
            <Icon icon="solar:magnifer-linear" width={18} />
          </span>
          <input
            type="text"
            placeholder={diseno?.mayeSearchPlaceholder || 'Buscar producto...'}
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            className="min-w-0 flex-1 appearance-none border-0 bg-transparent px-0 text-sm font-bold text-gray-800 shadow-none outline-none placeholder:font-semibold placeholder:text-gray-400 focus:border-transparent focus:outline-none focus:ring-0"
          />
          <button type="submit" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white shadow-md" style={{ backgroundColor: cp, boxShadow: `0 10px 20px -14px ${cp}` }} aria-label="Buscar">
            <Icon icon="solar:arrow-right-linear" width={17} />
          </button>
        </form>
      </div>

      {/* Bottom Nav Bar (Contained) */}
      <div className="w-full bg-white text-white pb-4">
        <div className="w-full max-w-7xl mx-auto px-4 xl:px-8 flex flex-col gap-3 md:flex-row md:items-stretch">
          {/* Categories Dropdown Button */}
          <div className="relative z-50 w-full md:w-auto">
            <button 
              onClick={() => setIsCategoryMenuOpen(!isCategoryMenuOpen)}
              className="flex h-12 w-full items-center justify-between gap-4 rounded-2xl px-4 text-sm font-black text-white shadow-lg transition-transform hover:scale-[1.01] md:h-14 md:w-64 md:rounded-2xl md:px-6 md:text-base"
              style={{ backgroundColor: cp, boxShadow: `0 16px 32px -22px ${cp}` }}
            >
              <div className="flex items-center gap-3">
                <Icon icon="solar:hamburger-menu-linear" width={22} />
                <span>{diseno?.mayeHeaderCategoryLabel || 'Categorías'}</span>
              </div>
              <Icon icon={isCategoryMenuOpen ? "solar:alt-arrow-up-linear" : "solar:alt-arrow-down-linear"} width={20} />
            </button>
            
            {/* Dropdown Menu */}
            {isCategoryMenuOpen && (
              <div className="absolute top-full left-0 mt-2 w-full bg-white border border-gray-100 shadow-2xl rounded-2xl overflow-hidden py-2 z-50 md:mt-0 md:rounded-b-lg md:border-gray-200">
                {categoryNames.length > 0 ? (
                  categoryNames.map((name: string) => {
                    return (
                      <button 
                        key={name}
                        onClick={() => goCategory(name)}
                        className="w-full text-left px-5 py-2.5 text-sm font-bold text-gray-700 hover:bg-gray-50 transition-colors"
                        style={{ ['--maye-hover' as any]: cp }}
                      >
                        {name}
                      </button>
                    )
                  })
                ) : (
                  fallbackQuickLinks.map(link => (
                    <button
                      key={link}
                      onClick={() => goCategory(link)}
                      className="w-full text-left px-5 py-2.5 text-sm font-bold text-gray-700 hover:bg-gray-50 transition-colors"
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

          <div className="flex gap-2 overflow-x-auto pb-1 md:hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {quickLinks.slice(0, 5).map((link) => (
              <button
                key={link}
                onClick={() => goCategory(link)}
                className="shrink-0 rounded-full border border-gray-100 bg-gray-50 px-3.5 py-2 text-xs font-black text-gray-700 shadow-sm"
              >
                {link}
              </button>
            ))}
          </div>

          {/* Quick Links (Desktop) */}
          <div className="relative hidden min-w-0 flex-1 overflow-hidden rounded-2xl border border-white/10 bg-[#15181E] shadow-[0_18px_40px_-30px_rgba(2,6,23,0.7)] lg:block">
            <div className="flex h-14 items-center gap-2 overflow-x-auto px-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {quickLinks.map((link) => (
                <button
                  key={link}
                  onClick={() => goCategory(link)}
                  className="group flex h-10 shrink-0 items-center gap-2 rounded-xl px-4 text-sm font-black text-gray-200 transition-all hover:bg-white hover:text-gray-950"
                >
                  <span className="h-1.5 w-1.5 rounded-full opacity-0 transition-opacity group-hover:opacity-100" style={{ backgroundColor: cp }} />
                  {link}
                </button>
              ))}
            </div>
            <div className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-[#15181E] to-transparent" />
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
                  <p className="text-xs text-gray-400">Guarda equipos con el corazón para volver rápido.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {favoritos.map((item) => (
                    <div key={`${item.slug}-${item.id}`} className="group flex items-center gap-3 rounded-2xl p-3 hover:bg-gray-50 transition-colors">
                      <button
                        type="button"
                        onClick={() => goProduct(item)}
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
                        onClick={() => goProduct(item)}
                        className="min-w-0 flex-1 text-left"
                      >
                        <p className="line-clamp-2 text-xs font-bold text-gray-900">{item.descripcion}</p>
                        <p className="mt-1 text-sm font-black" style={{ color: cp }}>S/ {Number(item.precioUnitario || 0).toFixed(2)}</p>
                      </button>
                      <button
                        type="button"
                        onClick={() => removeFavorito(item.id, slug)}
                        className="p-2 rounded-full opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all"
                        style={{ color: cp }}
                        onMouseEnter={e => { e.currentTarget.style.backgroundColor = `${cp}10`; }}
                        onMouseLeave={e => { e.currentTarget.style.backgroundColor = ''; }}
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
