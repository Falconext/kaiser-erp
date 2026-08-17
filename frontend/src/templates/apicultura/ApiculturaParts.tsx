import type React from 'react';
import { BRAND } from '@/lib/branding';
import { motion } from 'framer-motion';
import { Icon } from '@iconify/react';
import { getProductPricing } from '@/templates/shared/pricing';
import { honeyCard, honeyEase, honeyHover, honeySection, honeyTap, honeyViewport } from './motion';

export const APICULTURA_BANNER = '/assets/templates/apicultura/banner.png';

export function honeyAction(action: any, slug: string, navigate: (to: string) => void, fallback = `/tienda/${slug}/catalogo`) {
  if (!action || typeof action !== 'object') {
    navigate(fallback);
    return;
  }
  if (action.type === 'url' && action.url) {
    window.open(action.url, '_blank');
    return;
  }
  if (action.type === 'product' && action.productId) {
    navigate(`/tienda/${slug}/producto/${action.productId}`);
    return;
  }
  if (action.type === 'category' && action.categoryName) {
    navigate(`/tienda/${slug}/catalogo?category=${encodeURIComponent(action.categoryName)}`);
    return;
  }
  if (action.type === 'search' && action.search) {
    navigate(`/tienda/${slug}/catalogo?search=${encodeURIComponent(action.search)}`);
    return;
  }
  if (action.type === 'none') return;
  navigate(fallback);
}

function storeName(tienda: any, diseno: any) {
  return diseno?.apiculturaLogoText || tienda?.nombreComercial || tienda?.razonSocial || tienda?.nombre || 'Miel Dorada';
}

export function ApiculturaHeader({
  tienda,
  slug,
  cp,
  diseno,
  carritoSize,
  onOpenCart,
  searchQuery,
  setSearchQuery,
  onSearchSubmit,
  allCategories = [],
  overlay = false,
}: {
  tienda: any;
  slug: string;
  cp: string;
  diseno?: any;
  carritoSize: number;
  onOpenCart: () => void;
  searchQuery?: string;
  setSearchQuery?: (value: string) => void;
  onSearchSubmit?: (e: React.FormEvent, value?: string) => void;
  allCategories?: any[];
  overlay?: boolean;
}) {
  const name = storeName(tienda, diseno);
  const categories = allCategories.map((cat) => typeof cat === 'string' ? cat : cat?.nombre).filter(Boolean).slice(0, 5);

  return (
    <motion.header
      initial={{ opacity: 0, y: -18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, ease: honeyEase }}
      className={overlay ? 'relative z-30 bg-transparent' : 'relative z-40 bg-[#FFD72E]'}
      style={overlay ? undefined : { backgroundImage: 'linear-gradient(30deg, rgba(0,0,0,.045) 12%, transparent 12.5%, transparent 87%, rgba(0,0,0,.045) 87.5%, rgba(0,0,0,.045)), linear-gradient(150deg, rgba(0,0,0,.045) 12%, transparent 12.5%, transparent 87%, rgba(0,0,0,.045) 87.5%, rgba(0,0,0,.045))', backgroundSize: '64px 36px' }}
    >
      <div className="mx-auto max-w-7xl px-4 pb-5 pt-6 md:pt-7">
        <motion.nav
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.08, ease: honeyEase }}
          className="flex min-h-[64px] items-center gap-1 rounded-[2rem] bg-white py-2 pl-2 pr-2 shadow-xl shadow-yellow-900/10 md:min-h-[70px] md:gap-2 md:py-2.5 md:pl-2.5 md:pr-7"
        >
          <button
            type="button"
            onClick={() => window.location.href = `/tienda/${slug}`}
            title={name}
            className="group relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white shadow-md ring-2 transition-transform hover:scale-105 md:h-[52px] md:w-[52px]"
            style={{ '--tw-ring-color': cp } as React.CSSProperties}
          >
            {tienda?.logo ? (
              <img src={tienda.logo} alt={name} className="h-full w-full object-cover" />
            ) : (
              <span className="font-serif text-lg font-black italic text-black md:text-2xl">{name.charAt(0).toUpperCase()}</span>
            )}
          </button>
          <a href={`/tienda/${slug}`} className="rounded-full px-3 py-2.5 text-xs font-black text-black md:px-5 md:py-3 md:text-sm" style={{ backgroundColor: cp }}>Inicio</a>
          <a href={`/tienda/${slug}/catalogo`} className="rounded-full px-3 py-2.5 text-xs font-black text-black hover:bg-yellow-100 md:px-4 md:py-3 md:text-sm">Tienda</a>
          <a href={`/tienda/${slug}/contacto`} className="rounded-full px-3 py-2.5 text-xs font-black text-black hover:bg-yellow-100 md:px-4 md:py-3 md:text-sm">Contacto</a>
          <div className="hidden items-center gap-2 lg:flex">
            {categories.slice(0, 4).map((category) => (
              <a key={category} href={`/tienda/${slug}/catalogo?category=${encodeURIComponent(category)}`} className="rounded-full px-4 py-3 text-sm font-black text-black hover:bg-yellow-100">
                {category}
              </a>
            ))}
          </div>
          {/* Buscador (escritorio): input con botón de lupa integrado */}
          <form
            onSubmit={(e) => onSearchSubmit?.(e, searchQuery)}
            className="ml-auto hidden min-w-[240px] max-w-sm flex-1 items-center gap-2 rounded-full bg-gray-100 py-1.5 pl-5 pr-1.5 transition-all focus-within:bg-white focus-within:ring-2 focus-within:ring-amber-300 md:flex"
          >
            <input
              value={searchQuery || ''}
              onChange={(e) => setSearchQuery?.(e.target.value)}
              placeholder={diseno?.apiculturaSearchPlaceholder || 'Buscar miel, propóleo...'}
              className="w-full appearance-none border-0 bg-transparent p-0 text-sm font-semibold text-black shadow-none outline-none ring-0 focus:border-0 focus:outline-none focus:ring-0 placeholder:text-gray-400"
            />
            <button
              type="submit"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-black transition-transform hover:scale-105 active:scale-95"
              style={{ backgroundColor: cp }}
              title="Buscar"
            >
              <Icon icon="solar:magnifer-linear" width={17} />
            </button>
          </form>
          {/* Buscador (móvil): lleva al catálogo */}
          <button
            type="button"
            onClick={() => { window.location.href = `/tienda/${slug}/catalogo`; }}
            className="ml-auto rounded-full p-2 text-black hover:bg-yellow-100 md:hidden md:p-3"
            title="Buscar"
          >
            <Icon icon="solar:magnifer-linear" width={22} />
          </button>
          <button type="button" onClick={onOpenCart} className="relative shrink-0 rounded-full p-2 text-black hover:bg-yellow-100 md:p-3" title="Carrito">
            <Icon icon="solar:bag-4-linear" width={24} />
            {carritoSize > 0 && (
              <span className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black text-[10px] font-black text-white">{carritoSize}</span>
            )}
          </button>
        </motion.nav>
      </div>
    </motion.header>
  );
}

export function ApiculturaFooter({ tienda, slug, diseno, cp, categories = [] }: { tienda: any; slug: string; diseno?: any; cp: string; categories?: any[] }) {
  const name = storeName(tienda, diseno);
  const cats = categories.map((cat) => typeof cat === 'string' ? cat : cat?.nombre).filter(Boolean).slice(0, 5);
  return (
    <motion.footer
      initial="hidden"
      whileInView="show"
      viewport={honeyViewport}
      variants={honeySection}
      className="bg-white text-black"
    >
      <div className="mx-auto grid max-w-7xl gap-10 px-5 py-16 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <h3 className="font-serif text-3xl font-black italic">{name}</h3>
          <p className="mt-5 max-w-sm text-sm font-semibold leading-7 text-gray-500">
            {diseno?.apiculturaFooterText || tienda?.descripcionTienda || 'Productos naturales, miel pura, polen, propóleo y derivados apícolas con atención directa de la tienda.'}
          </p>
        </div>
        <div>
          <h4 className="mb-4 text-sm font-black uppercase tracking-[0.16em]" style={{ color: cp }}>Categorías</h4>
          <div className="space-y-3 text-sm font-semibold text-gray-500">
            {cats.map((cat) => <a key={cat} href={`/tienda/${slug}/catalogo?category=${encodeURIComponent(cat)}`} className="block hover:text-black">{cat}</a>)}
          </div>
        </div>
        <div>
          <h4 className="mb-4 text-sm font-black uppercase tracking-[0.16em]" style={{ color: cp }}>Ayuda</h4>
          <div className="space-y-3 text-sm font-semibold text-gray-500">
            <a href={`/tienda/${slug}/seguimiento`} className="block hover:text-black">Ver pedido</a>
            <a href={`/tienda/${slug}/catalogo`} className="block hover:text-black">Catálogo</a>
            <a href={`/tienda/${slug}/contacto`} className="block hover:text-black">Contacto</a>
            <span className="block">Cambios y entregas</span>
          </div>
        </div>
        <div>
          <h4 className="mb-4 text-sm font-black uppercase tracking-[0.16em]" style={{ color: cp }}>Contacto</h4>
          <p className="text-sm font-semibold text-gray-500">{diseno?.apiculturaFooterPhone || tienda?.whatsappTienda || tienda?.telefono || '+51 999 999 999'}</p>
          <p className="mt-3 text-sm font-semibold text-gray-500">{diseno?.apiculturaFooterEmail || tienda?.email || tienda?.correo || 'contacto@tutienda.com'}</p>
        </div>
      </div>
      <div className="border-t border-gray-100 px-5 py-5 text-center text-xs font-semibold text-gray-400">
        © 2026 {name}. Powered by {BRAND.name}.
      </div>
    </motion.footer>
  );
}

export function ApiculturaProductCard({ producto, slug, cp, onAddToCart, onClick }: { producto: any; slug: string; cp: string; onAddToCart?: (producto: any) => void; onClick?: () => void }) {
  const pricing = getProductPricing(producto);
  const ratingCount = Number(producto?.ratingCount || producto?.totalReviews || producto?.reviewsCount || 0);
  const ratingAvg = Number(producto?.ratingAvg || producto?.ratingPromedio || producto?.promedioRating || 0);
  const img = producto?.imagenUrl || APICULTURA_BANNER;
  return (
    <motion.article
      variants={honeyCard}
      initial="hidden"
      whileInView="show"
      viewport={honeyViewport}
      whileHover={honeyHover}
      whileTap={honeyTap}
      layout
      className="group rounded-md border border-gray-100 bg-white p-2.5 text-center shadow-sm transition-shadow hover:shadow-xl hover:shadow-yellow-900/10"
    >
      <button type="button" onClick={onClick} className="relative block w-full overflow-hidden rounded bg-white">
        {pricing.enOferta && (
          <span className="absolute left-3 top-3 z-10 flex h-12 w-12 items-center justify-center rounded-full bg-black text-xs font-black text-white">-{pricing.porcentajeDescuento}%</span>
        )}
        <motion.img
          src={img}
          alt={producto?.descripcion || 'Producto'}
          className="aspect-square w-full object-contain p-7"
          whileHover={{ scale: 1.06, rotate: -1.2 }}
          transition={{ duration: 0.5, ease: honeyEase }}
        />
      </button>
      <button type="button" onClick={onClick} className="mt-5 block w-full px-3">
        <h3 className="mx-auto line-clamp-2 min-h-[48px] max-w-[280px] text-base font-black leading-snug text-black">{producto?.descripcion}</h3>
      </button>
      <div className="mt-3 flex min-h-[20px] items-center justify-center gap-1 text-sm">
        {ratingCount > 0 ? (
          <>
            <span className="text-amber-400">{'★'.repeat(Math.max(1, Math.round(ratingAvg || 5)))}</span>
            <span className="text-xs font-semibold text-gray-400">({ratingCount} reseñas)</span>
          </>
        ) : (
          <span className="text-xs font-semibold text-gray-400">Sin reseñas</span>
        )}
      </div>
      <div className="mt-3 flex items-center justify-center gap-2">
        {pricing.enOferta && <span className="text-sm font-bold text-gray-400 line-through">S/ {pricing.precioRegular.toFixed(2)}</span>}
        <span className="text-xl font-black text-black">S/ {pricing.precioFinal.toFixed(2)}</span>
      </div>
      <motion.button
        type="button"
        onClick={() => onAddToCart?.({ ...producto, precioUnitario: pricing.precioFinal, precioRegular: pricing.precioRegular, enOferta: pricing.enOferta })}
        className="mb-4 mt-4 inline-flex h-11 items-center justify-center gap-2 rounded-full px-7 text-xs font-black uppercase tracking-wide text-black transition-transform hover:scale-[1.03]"
        style={{ backgroundColor: cp }}
        whileHover={{ scale: 1.04 }}
        whileTap={honeyTap}
      >
        <Icon icon="solar:cart-large-2-bold" width={18} />
        Agregar al carrito
      </motion.button>
    </motion.article>
  );
}
