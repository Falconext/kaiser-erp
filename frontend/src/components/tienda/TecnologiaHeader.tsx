import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from '@iconify/react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useFavoritosStore } from '@/zustand/favoritos';
import useOutsideClick from '@/hooks/useOutsideClick';
import { withPricingList } from '@/templates/shared/pricing';
import FavoritesDrawer from './FavoritesDrawer';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4001/api';

interface TecnologiaHeaderProps {
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

const getCategoryName = (category: any) => {
  if (typeof category === 'string') return category;
  return category?.nombre || category?.name || '';
};

export default function TecnologiaHeader({
  tienda,
  slug,
  cp,
  carritoSize,
  onOpenCart,
  searchQuery,
  setSearchQuery,
  onSearchSubmit,
  allCategories = [],
}: TecnologiaHeaderProps) {
  const navigate = useNavigate();
  const [localSearch, setLocalSearch] = useState(searchQuery);
  const [isCategoryOpen, setIsCategoryOpen, categoryRef] = useOutsideClick(false);
  const [isFavoritosOpen, setIsFavoritosOpen] = useState(false);

  // Búsqueda en vivo (autocompletado con imágenes)
  const [liveResults, setLiveResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const searchWrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const term = localSearch.trim();
    if (term.length < 2) {
      setLiveResults([]);
      setIsSearching(false);
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const { data } = await axios.get(`${BASE_URL}/public/store/${slug}/products`, {
          params: { search: term, limit: 6 },
        });
        const items = Array.isArray(data) ? data : data?.data?.data || data?.data || [];
        setLiveResults(withPricingList(items));
      } catch {
        setLiveResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [localSearch, slug]);

  // Cerrar dropdown al hacer clic fuera
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchWrapRef.current && !searchWrapRef.current.contains(e.target as Node)) {
        setIsSearchFocused(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const irAProducto = (id: number | string) => {
    setIsSearchFocused(false);
    if (slug === 'preview') {
      window.dispatchEvent(new CustomEvent('preview-product', { detail: { id } }));
      return;
    }
    navigate(`/tienda/${slug}/producto/${id}`);
  };
  const { getFavoritosBySlug, removeFavorito } = useFavoritosStore();
  const favoritos = getFavoritosBySlug(slug);

  const categories = useMemo(
    () => allCategories.map(getCategoryName).filter(Boolean),
    [allCategories],
  );

  const storeName = tienda?.nombreComercial || tienda?.nombre || tienda?.razonSocial || 'TechStore Peru';
  const initials = storeName
    .split(' ')
    .map((word: string) => word[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  const [firstWord, ...restWords] = storeName.split(' ');

  useEffect(() => {
    setLocalSearch(searchQuery);
  }, [searchQuery]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchQuery(localSearch);
    onSearchSubmit(e, localSearch);
  };

  const selectCategory = (category: string) => {
    setIsCategoryOpen(false);
    if (slug === 'preview') {
      window.dispatchEvent(new CustomEvent('preview-nav', { detail: 'catalogo' }));
      return;
    }
    navigate(`/tienda/${slug}/catalogo?category=${encodeURIComponent(category)}`);
  };
  const goProduct = (item: any) => {
    setIsFavoritosOpen(false);
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
  const goHome = () => {
    if (slug === 'preview') {
      window.dispatchEvent(new CustomEvent('preview-nav', { detail: 'home' }));
      return;
    }
    navigate(`/tienda/${slug}`);
  };

  return (
    <header className="sticky top-0 z-40 border-b border-gray-100 bg-white/95 shadow-sm backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 lg:px-6">
        <button type="button" onClick={goHome} className="flex shrink-0 items-center gap-2.5 text-left">
          {tienda?.logo ? (
            <img src={tienda.logo} alt={storeName} className="h-10 w-auto object-contain" />
          ) : (
            <span className="flex h-10 w-10 items-center justify-center rounded-xl text-sm font-black text-white" style={{ background: cp }}>
              {initials || 'TP'}
            </span>
          )}
        </button>

        <div ref={categoryRef} className="relative hidden shrink-0 lg:block">
          <button
            type="button"
            onClick={() => setIsCategoryOpen(!isCategoryOpen)}
            className="inline-flex h-11 items-center gap-2 rounded-2xl bg-gray-50 px-4 text-sm font-black text-gray-800 transition-colors hover:bg-gray-100"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-xl text-white" style={{ background: cp }}>
              <Icon icon="solar:widget-5-bold-duotone" width={16} />
            </span>
            Categorías
            <Icon icon="solar:alt-arrow-down-bold" width={14} className={`transition-transform ${isCategoryOpen ? 'rotate-180' : ''}`} />
          </button>

          {isCategoryOpen && (
            <>
              <div className="absolute left-0 top-[calc(100%+10px)] z-50 w-80 overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-2xl">
                <div className="border-b border-gray-100 px-5 py-4">
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-gray-400">Explorar categorías</p>
                  <p className="mt-1 text-sm font-bold text-gray-900">Selecciona una familia</p>
                </div>
                <div className="max-h-80 overflow-y-auto p-2">
                  <button type="button" onClick={() => selectCategory('')} className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm font-bold text-gray-800 hover:bg-gray-50">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gray-100"><Icon icon="solar:widget-bold" width={18} /></span>
                    Todos los productos
                  </button>
                  {categories.map(name => (
                    <button key={name} type="button" onClick={() => selectCategory(name)} className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm font-bold text-gray-800 hover:bg-gray-50">
                      <span className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: `${cp}14`, color: cp }}>
                        <Icon icon="solar:tag-bold-duotone" width={18} />
                      </span>
                      <span className="min-w-0 flex-1 truncate">{name}</span>
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        <div ref={searchWrapRef} className="relative hidden min-w-0 flex-1 md:block">
          <form onSubmit={(e) => { setIsSearchFocused(false); handleSubmit(e); }} className="relative">
            <div className="flex h-11 items-center gap-2 rounded-2xl bg-gray-50 pl-4 pr-1.5 transition-colors focus-within:bg-gray-100 border-none outline-none">
              <Icon icon="solar:magnifer-linear" className="shrink-0 text-sm text-gray-400" />
              <input
                type="search"
                value={localSearch}
                onChange={event => setLocalSearch(event.target.value)}
                onFocus={() => setIsSearchFocused(true)}
                placeholder="Buscar productos, marcas o códigos..."
                className="h-full min-w-0 flex-1 bg-transparent text-sm font-semibold text-gray-700 outline-none border-none focus:ring-0 focus:border-transparent focus:outline-none placeholder:text-gray-400"
              />
              <button
                type="submit"
                aria-label="Buscar"
                className="flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-xl px-3 text-xs font-bold text-white transition-opacity hover:opacity-90"
                style={{ background: cp }}
              >
                <Icon icon="solar:magnifer-bold" width={15} />
                <span className="hidden lg:inline">Buscar</span>
              </button>
            </div>
          </form>

          {/* Recomendaciones en vivo */}
          {isSearchFocused && localSearch.trim().length >= 2 && (
            <div className="absolute left-0 right-0 top-[calc(100%+10px)] z-50 overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3">
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-gray-400">Resultados</p>
                {isSearching && <Icon icon="eos-icons:loading" className="text-base text-gray-300" />}
              </div>

              {isSearching && liveResults.length === 0 ? (
                <div className="px-5 py-8 text-center">
                  <Icon icon="eos-icons:loading" className="mx-auto text-2xl text-gray-300" />
                </div>
              ) : liveResults.length > 0 ? (
                <>
                  <div className="max-h-[360px] overflow-y-auto p-2">
                    {liveResults.map((item: any) => {
                      const precio = Number(item.precioUnitario || 0);
                      const enOferta = item.enOferta && Number(item.precioRegular) > precio;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => irAProducto(item.id)}
                          className="flex w-full items-center gap-3 rounded-2xl p-2.5 text-left transition-colors hover:bg-gray-50"
                        >
                          <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl border border-gray-100 bg-gray-50">
                            {item.imagenUrl ? (
                              <img src={item.imagenUrl} alt={item.descripcion} className="h-full w-full object-contain p-1 mix-blend-multiply" />
                            ) : (
                              <Icon icon="solar:box-linear" className="text-xl text-gray-300" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-bold text-gray-800">{item.descripcion}</p>
                            {(item.marca?.nombre || item.codigo) && (
                              <p className="truncate text-[11px] text-gray-400">{item.marca?.nombre || item.codigo}</p>
                            )}
                            <div className="mt-0.5 flex items-baseline gap-2">
                              <span className="text-sm font-black" style={{ color: cp }}>S/ {precio.toFixed(2)}</span>
                              {enOferta && (
                                <span className="text-[11px] font-bold text-gray-400 line-through">S/ {Number(item.precioRegular).toFixed(2)}</span>
                              )}
                            </div>
                          </div>
                          <Icon icon="solar:alt-arrow-right-linear" className="shrink-0 text-gray-300" />
                        </button>
                      );
                    })}
                  </div>
                  <button
                    type="button"
                    onClick={(e) => { setIsSearchFocused(false); handleSubmit(e as any); }}
                    className="flex w-full items-center justify-center gap-2 border-t border-gray-100 px-5 py-3 text-xs font-black text-white transition-opacity hover:opacity-90"
                    style={{ background: cp }}
                  >
                    Ver todos los resultados de “{localSearch.trim()}”
                    <Icon icon="solar:arrow-right-bold" width={14} />
                  </button>
                </>
              ) : (
                <div className="px-5 py-8 text-center">
                  <Icon icon="solar:box-minimalistic-broken" className="mx-auto mb-2 text-3xl text-gray-300" />
                  <p className="text-sm font-bold text-gray-700">Sin resultados para “{localSearch.trim()}”.</p>
                  <p className="mt-1 text-[11px] text-gray-400">Prueba con otra marca, categoría o código.</p>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
          <button type="button" onClick={() => setIsFavoritosOpen(true)} className="relative rounded-xl border border-gray-200 bg-white p-2.5 text-gray-600 transition-colors hover:text-gray-900">
            <Icon icon={favoritos.length > 0 ? 'solar:heart-bold' : 'solar:heart-linear'} className="text-xl" />
            {favoritos.length > 0 && (
              <span className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
                {favoritos.length > 9 ? '9+' : favoritos.length}
              </span>
            )}
          </button>
          <button type="button" onClick={onOpenCart} className="relative rounded-xl border border-gray-200 bg-white p-2.5 text-gray-600 transition-colors hover:text-gray-900">
            <Icon icon="solar:bag-2-linear" className="text-xl" />
            {carritoSize > 0 && (
              <span className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
                {carritoSize > 9 ? '9+' : carritoSize}
              </span>
            )}
          </button>
          <button type="button" onClick={goTracking} className="hidden rounded-xl border border-gray-200 bg-white p-2.5 text-gray-600 transition-colors hover:text-gray-900 md:flex" title="Rastrear pedido">
            <Icon icon="solar:delivery-linear" className="text-xl" />
          </button>
        </div>
      </div>

      <FavoritesDrawer
        open={isFavoritosOpen}
        slug={slug}
        cp={cp}
        favoritos={favoritos}
        onClose={() => setIsFavoritosOpen(false)}
        onProduct={goProduct}
        onRemove={removeFavorito}
      />
    </header>
  );
}
