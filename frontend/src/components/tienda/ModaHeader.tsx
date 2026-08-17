import React, { useMemo, useState } from 'react';
import { Icon } from '@iconify/react';
import { Link, useNavigate } from 'react-router-dom';

interface ModaHeaderProps {
  diseno?: any;
  tienda: any;
  slug: string;
  cp: string;
  carritoSize: number;
  onOpenCart: () => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  onSearchSubmit: (e: React.FormEvent) => void;
  allCategories?: any[];
}

type MenuKey = 'women' | 'men' | 'accessories' | 'style' | null;

const menuBase = {
  women: {
    label: 'Mujer',
    groups: [
      { title: 'Vestidos', items: ['Vestidos maxi', 'Vestidos midi', 'Vestidos mini'] },
      { title: 'Faldas', items: ['Faldas maxi', 'Faldas midi', 'Faldas mini'] },
      { title: 'Tops', items: ['Tops basicos', 'Blusas', 'Polos', 'Poleras y hoodies', 'Enterizos'] },
      { title: 'Prendas inferiores', items: ['Pantalones', 'Jeans', 'Shorts', 'Pantalones flare', 'Pantalones wide-leg'] },
      { title: 'Abrigos', items: ['Casacas y abrigos', 'Casacas puffer', 'Chalecos', 'Blazers'] },
      { title: 'Tejidos', items: ['Cardigans', 'Chompas'] },
    ],
  },
  men: {
    label: 'Hombre',
    groups: [
      { title: 'Camisas', items: ['Camisas manga larga', 'Camisas manga corta', 'Sobrecamisas'] },
      { title: 'Polos', items: ['Polos basicos', 'Polos estampados', 'Polos boxy'] },
      { title: 'Pantalones', items: ['Jeans', 'Cargo', 'Joggers', 'Wide-leg'] },
      { title: 'Casacas', items: ['Denim', 'Bomber', 'Puffer', 'Blazers'] },
      { title: 'Calzado', items: ['Zapatillas', 'Botines', 'Zapatos'] },
      { title: 'Tendencias', items: ['Nuevos ingresos', 'Más vendidos', 'Ofertas'] },
    ],
  },
  accessories: {
    label: 'Accesorios',
    groups: [
      { title: 'Bolsos', items: ['Carteras', 'Billeteras', 'Mochilas'] },
      { title: 'Complementos', items: ['Lentes', 'Correas', 'Gorras', 'Joyeria'] },
      { title: 'Calzado', items: ['Zapatillas', 'Botines', 'Sandalias'] },
      { title: 'Edicion', items: ['Nuevos', 'Más vendidos', 'Ofertas'] },
    ],
  },
  style: {
    label: 'Estilo',
    groups: [
      { title: 'Editorial', items: ['Looks de temporada', 'Guia denim', 'Capsula minimal', 'Outfits de oficina'] },
      { title: 'Colecciones', items: ['Recien llegado', 'Esenciales', 'Urbano', 'Minimal'] },
      { title: 'Comprar por ocasion', items: ['Diario', 'Trabajo', 'Noche', 'Fin de semana'] },
      { title: 'Inspiracion', items: ['Como combinar', 'Colores neutros', 'Layering'] },
    ],
  },
};

export default function ModaHeader({ tienda,
  slug,
  carritoSize,
  onOpenCart,
  searchQuery,
  setSearchQuery,
  onSearchSubmit,
  allCategories = [], diseno }: ModaHeaderProps) {
  const navigate = useNavigate();
  const [activeMenu, setActiveMenu] = useState<MenuKey>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const brandName = useMemo(() => {
    const name = (diseno || tienda?.diseno)?.modaBrandName || tienda?.nombre || 'chiclara';
    return String(name).replace(/\s+/g, ' ').trim();
  }, [(diseno || tienda?.diseno)?.modaBrandName, tienda?.nombre]);

  const goCatalog = (query?: string) => {
    if (slug === 'preview') {
      window.dispatchEvent(new CustomEvent('preview-nav', { detail: 'catalogo' }));
      return;
    }
    navigate(query ? `/tienda/${slug}/catalogo?search=${encodeURIComponent(query)}` : `/tienda/${slug}/catalogo`);
  };

  const goTracking = () => {
    if (slug === 'preview') {
      window.dispatchEvent(new CustomEvent('preview-nav', { detail: 'checkout' }));
      return;
    }
    navigate(`/tienda/${slug}/seguimiento`);
  };

  const menu = activeMenu ? menuBase[activeMenu] : null;

  return (
    <header className="sticky top-0 z-[80] w-full bg-white text-[#111111]" onMouseLeave={() => setActiveMenu(null)}>
      <div className="h-[72px] bg-black text-white grid grid-cols-[1fr_auto_1fr] items-center px-5 md:px-10">
        <button className="justify-self-start text-white/80 hover:text-white" onClick={() => goCatalog('nuevos ingresos')} aria-label="Promoción anterior">
          <Icon icon="solar:arrow-left-linear" width={22} />
        </button>
        <p className="text-[12px] md:text-[15px] font-black tracking-[-0.01em]">
          {(diseno || tienda?.diseno)?.modaPromoText || 'Oferta de verano: hasta 30% OFF'}
        </p>
        <button className="justify-self-end text-white/80 hover:text-white" onClick={() => goCatalog('ofertas')} aria-label="Promoción siguiente">
          <Icon icon="solar:arrow-right-linear" width={22} />
        </button>
      </div>

      <div className="h-[86px] border-b border-[#E5E5E5] bg-white grid grid-cols-[1fr_auto_1fr] items-center px-5 md:px-10 lg:px-16">
        {isSearchOpen ? (
          <div className="col-span-3 flex items-center justify-center w-full">
            <form onSubmit={(e) => { setIsSearchOpen(false); onSearchSubmit(e); }} className="relative w-full max-w-2xl flex items-center">
              <Icon icon="solar:magnifer-linear" width={20} className="absolute left-4 text-gray-400 pointer-events-none" />
              <input
                autoFocus
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                onKeyDown={(e) => { if (e.key === 'Escape') { setIsSearchOpen(false); setSearchQuery(''); } }}
                placeholder="Search for products"
                className="w-full h-[46px] pl-12 pr-12 text-[14px] bg-white border border-[#E5E5E5] outline-none focus:border-black transition-colors rounded-[3px] text-gray-800"
              />
              <button 
                type="button" 
                onClick={() => { setIsSearchOpen(false); setSearchQuery(''); }} 
                className="absolute right-4 text-gray-400 hover:text-black transition-colors" 
                aria-label="Cerrar búsqueda"
              >
                <Icon icon="solar:close-linear" width={20} />
              </button>
            </form>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-4 min-w-0">
          <button
            className="lg:hidden -ml-1"
            onClick={() => setMobileOpen((value) => !value)}
            aria-label="Abrir menu"
          >
            <Icon icon={mobileOpen ? 'solar:close-circle-linear' : 'solar:hamburger-menu-linear'} width={24} />
          </button>
          <Link to={`/tienda/${slug}`} className="flex items-center">
            {tienda?.logo ? (
              <img src={tienda.logo} alt={tienda.nombre} className="h-10 max-w-[190px] object-contain" />
            ) : (
              <span className="font-serif text-[33px] md:text-[40px] font-black leading-none tracking-[-0.06em] truncate max-w-[240px]">
                {brandName}
              </span>
            )}
          </Link>
        </div>

        <nav className="hidden lg:flex items-center gap-10 text-[14px] font-medium">
          <button onClick={() => goCatalog('nuevos ingresos')} className="leading-none hover:text-[#15243B]">
            Nuevos ingresos
          </button>
          <button onClick={() => goCatalog('más vendidos')} className="leading-none hover:text-[#15243B]">
            Más vendidos
          </button>
          {(['women', 'men', 'accessories', 'style'] as const).map((key) => (
            <button
              key={key}
              onMouseEnter={() => setActiveMenu(key)}
              onClick={() => goCatalog(key)}
              className={`inline-flex items-center gap-1.5 leading-none pb-1 border-b transition-colors ${activeMenu === key ? 'border-black' : 'border-transparent hover:border-black'}`}
            >
              {menuBase[key].label}
              <Icon icon="solar:alt-arrow-down-linear" width={14} />
            </button>
          ))}
          <button onClick={() => goCatalog('ofertas')} className="leading-none hover:text-[#15243B]">
            Ofertas
          </button>
        </nav>

        <div className="hidden lg:flex items-center justify-end gap-6 text-[14px] font-medium">
          <button onClick={() => setIsSearchOpen(true)} className="hover:opacity-60" aria-label="Buscar">
            <Icon icon="solar:magnifer-linear" width={25} />
          </button>
          <button className="hover:opacity-60" aria-label="Cuenta">
            <Icon icon="solar:user-linear" width={25} />
          </button>
          <button onClick={goTracking} className="hover:opacity-60" aria-label="Rastrear mi pedido" title="Rastrear mi pedido">
            <Icon icon="solar:box-minimalistic-linear" width={25} />
          </button>
          <button className="relative hover:opacity-60" onClick={onOpenCart} aria-label="Carrito">
            <Icon icon="solar:bag-4-linear" width={27} />
            <span className="absolute -right-3 -top-3 flex h-6 w-6 items-center justify-center rounded-full bg-black text-[11px] font-black text-white">
              {carritoSize}
            </span>
          </button>
        </div>

        <button className="lg:hidden flex items-center gap-1 text-sm font-semibold" onClick={onOpenCart}>
          <Icon icon="solar:bag-4-linear" width={20} />
          {carritoSize}
        </button>
          </>
        )}
      </div>

      {mobileOpen && (
        <div className="lg:hidden absolute top-full left-0 w-full bg-white border-b border-black p-5 shadow-xl">
          <div className="grid gap-4 text-lg font-medium">
            <button onClick={() => goCatalog('nuevos ingresos')} className="text-left">Nuevos ingresos</button>
            <button onClick={() => goCatalog('más vendidos')} className="text-left">Más vendidos</button>
            <button onClick={() => goCatalog('mujer')} className="text-left">Mujer</button>
            <button onClick={() => goCatalog('hombre')} className="text-left">Hombre</button>
            {allCategories.slice(0, 6).map((category: any) => {
              const name = typeof category === 'string' ? category : category?.nombre;
              if (!name) return null;
              return <button key={name} onClick={() => goCatalog(name)} className="text-left">{name}</button>;
            })}
            <button onClick={() => { setMobileOpen(false); goTracking(); }} className="mt-1 flex items-center gap-2 border-t border-neutral-200 pt-4 text-left">
              <Icon icon="solar:box-minimalistic-linear" width={20} />
              Rastrear mi pedido
            </button>
          </div>
        </div>
      )}

      {menu && (
        <div className="hidden lg:block absolute top-full left-0 w-full bg-white border-b border-[#D9D9D9] shadow-sm">
          <div className="mx-auto grid min-h-[325px] max-w-[1280px] grid-cols-6 gap-10 px-10 py-14">
            {menu.groups.map((group) => (
              <MenuGroup key={group.title} title={group.title} items={group.items} onItemClick={goCatalog} />
            ))}
          </div>
        </div>
      )}
    </header>
  );
}

function MenuGroup({
  title,
  items,
  onItemClick,
  className = '',
}: {
  title: string;
  items: string[];
  onItemClick: (query?: string) => void;
  className?: string;
}) {
  return (
    <div className={className}>
      <p className="text-[14px] text-gray-500 mb-2">{title}</p>
      <MenuList items={items} onItemClick={onItemClick} />
    </div>
  );
}

function MenuList({
  items,
  onItemClick,
  markNew = false,
}: {
  items: string[];
  onItemClick: (query?: string) => void;
  markNew?: boolean;
}) {
  return (
    <ul className="space-y-1.5">
      {items.map((item, index) => (
        <li key={item}>
          <button
            onClick={() => onItemClick(item)}
            className="text-left text-[15px] leading-[1.25] hover:underline underline-offset-4"
          >
            {item}
            {markNew && [0, 1, 3, 5].includes(index) && (
              <span className="ml-1 align-super text-[8px] text-slate-500 font-bold">NEW</span>
            )}
          </button>
        </li>
      ))}
    </ul>
  );
}
