import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '@iconify/react';
import { AnimatePresence, motion, type Variants } from 'framer-motion';
import { getProductPricing } from '@/templates/shared/pricing';
import { buildStorePurchaseWhatsappUrl } from '@/utils/storeWhatsapp';

export const GREEN = '#1a8d4e';

// True si el color es muy claro (poco contraste sobre fondo blanco).
export const isLightColor = (hex: string): boolean => {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || '').trim());
  if (!m) return false;
  const n = parseInt(m[1], 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  return (0.299 * r + 0.587 * g + 0.114 * b) > 205;
};

// Resuelve el color de acento de la tienda de forma robusta: toma el primer
// color configurado que sea legible sobre blanco (ignora los casi-blancos que
// dejarían botones/íconos invisibles) y, en último caso, usa el verde de marca.
export const resolveFalconGreen = (diseno?: any, cp?: string): string => {
  const candidates = [diseno?.falconAccent, diseno?.colorAccento, cp, diseno?.colorPrimario];
  const usable = candidates.find((c) => typeof c === 'string' && c.trim() && !isLightColor(c));
  return usable || GREEN;
};

// Imágenes por defecto de la plantilla (usadas también como fallback en el editor "Personalizar tienda")
export const FALCON_DEFAULT_IMAGES = {
  hero: '/assets/templates/falcon/banner1.png',
  sideOne: '/assets/templates/falcon/banner2.png',
  sideTwo: '/assets/templates/falcon/banner3.png',
  special: '/assets/templates/falcon/silla.png',
  promo: '/assets/templates/falcon/ahorros.png',
  countdown: '/assets/templates/falcon/apurate.png',
  catalog: '/assets/templates/falcon/catalogo.png',
} as const;

export const getName = (item: any) => (typeof item === 'string' ? item : item?.nombre || item?.name || item?.codigo || '');
export const editable = (value: any, fallback: string) => String(value || '').trim() || fallback;
export const money = (value: number) => `S/ ${Number(value || 0).toFixed(2)}`;
export const getImg = (p: any) => p?.imagenUrl || p?.imagen || p?.imageUrl || p?.foto || '';
export const catOf = (p: any) => (typeof p?.categoria === 'object' ? p?.categoria?.nombre : p?.categoria) || '';
export const storeNameOf = (tienda: any) => tienda?.nombreComercial || tienda?.nombre || tienda?.razonSocial || 'Falcon';

// Convierte HTML (con etiquetas/entidades como &nbsp;) a texto plano legible,
// para usarlo en descripciones cortas de cards/modales sin mostrar el markup.
export const plainText = (value: string): string => {
  const raw = String(value || '');
  if (!raw) return '';
  if (!/[<&]/.test(raw)) return raw;
  let text = raw;
  if (typeof document !== 'undefined') {
    const el = document.createElement('div');
    el.innerHTML = raw;
    text = el.textContent || (el as any).innerText || '';
  } else {
    text = raw.replace(/<[^>]+>/g, ' ');
  }
  return text.replace(/&nbsp;/gi, ' ').replace(/ /g, ' ').replace(/&amp;/gi, '&').replace(/\s+/g, ' ').trim();
};
export const getPreviewQuery = (diseno?: any) => {
  const raw = diseno?.__previewQuery || (diseno?.__previewPlantillaId ? `previewPlantilla=${encodeURIComponent(diseno.__previewPlantillaId)}&previewOrigen=template` : '');
  return String(raw || '').replace(/^\?/, '');
};
export const withPreviewQuery = (path: string, diseno?: any) => {
  const query = getPreviewQuery(diseno);
  if (!query) return path;
  return `${path}${path.includes('?') ? '&' : '?'}${query}`;
};

export const falconFadeUp: Variants = {
  hidden: { opacity: 0, y: 22 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: 'easeOut' } },
};

export const falconScaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.96, y: 14 },
  show: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.42, ease: 'easeOut' } },
};

export const falconStagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.055, delayChildren: 0.04 } },
};

export const falconTap = { scale: 0.985 };
export const falconHoverLift = { y: -5, transition: { duration: 0.22, ease: 'easeOut' } };

// ─────────────────────────────────────────────────────────────────────────────
// Blog posts — shared source used by home + blog page
// ─────────────────────────────────────────────────────────────────────────────
export interface FalconBlogPost {
  id: string;
  image: string;
  date: string;
  title: string;
  excerpt: string;
  /** Plain-text paragraphs (legacy / fallback). */
  body?: string[];
  /** Rich HTML content (from the editor). Takes precedence over `body` when present. */
  bodyHtml?: string;
  author?: string;
  category?: string;
  tags?: string[];
}

const DEFAULT_BLOG_BODY = [
  'Lorem ipsum dolor sit amet consectetur. Molestie cras volutpat fringilla pellentesque lobortis tempor id. Purus dolor in augue habitant. Natoque ornare proin egestas porttitor sed. Nunc egestas est augue cursus ac tincidunt dui. Nunc enim integer faucibus et amet dolor. Diam volutpat ultricies quam et metus turpis ultricies.',
  'Habitant nulla pellentesque tortor amet volutpat scelerisque. Vitae nulla euismod sed nam nulla fermentum vel adipiscing velit pellentesque libero suspendisse vitae. Fringilla nisi massa gravida mi posuere vestibulum at. Sem nisl in odio dictum.',
];

/** Build safe HTML from plain paragraphs when a post has no rich `bodyHtml`. */
export function blogBodyToHtml(body?: string[]): string {
  const paras = Array.isArray(body) && body.length ? body : DEFAULT_BLOG_BODY;
  return paras.map((p) => `<p>${String(p)}</p>`).join('');
}

export function getFalconBlogPosts(diseno?: any): FalconBlogPost[] {
  const raw =
    Array.isArray(diseno?.storeBlogPosts) && diseno.storeBlogPosts.length ? diseno.storeBlogPosts :
    Array.isArray(diseno?.blogPosts) && diseno.blogPosts.length ? diseno.blogPosts :
    Array.isArray(diseno?.falconBlogPosts) && diseno.falconBlogPosts.length ? diseno.falconBlogPosts :
    null;
  const base: Omit<FalconBlogPost, 'id'>[] = raw || [
    { image: 'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?auto=format&fit=crop&q=80&w=800', date: '11 Dic, 2024', title: 'Los mejores accesorios para potenciar el rendimiento de tu smartphone', excerpt: 'Lorem ipsum dolor sit amet consectetur. Molestie cras volutpat fringilla pellentesque lobortis...', category: 'Guías', tags: ['Accesorios', 'Audífonos'] },
    { image: 'https://images.unsplash.com/photo-1622979135225-d2ba269cf1ac?auto=format&fit=crop&q=80&w=800', date: '11 Dic, 2024', title: 'El futuro de los accesorios electrónicos: tendencias a seguir', excerpt: 'Lorem ipsum dolor sit amet consectetur. Molestie cras volutpat fringilla pellentesque lobortis...', category: 'Tendencias', tags: ['Tendencias', 'Tecnología'] },
    { image: 'https://images.unsplash.com/photo-1593508512255-86ab42a8e620?auto=format&fit=crop&q=80&w=800', date: '11 Dic, 2024', title: 'Cómo mejorar tu experiencia de entretenimiento con realidad virtual', excerpt: 'Lorem ipsum dolor sit amet consectetur. Molestie cras volutpat fringilla pellentesque lobortis...', category: 'Guías', tags: ['VR', 'Gaming'] },
    { image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&q=80&w=800', date: '11 Dic, 2024', title: 'Esenciales para el hogar inteligente: mejora tu espacio', excerpt: 'Lorem ipsum dolor sit amet consectetur. Molestie cras volutpat fringilla pellentesque lobortis...', category: 'Novedades', tags: ['Smart Home', 'Accesorios'] },
    { image: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&q=80&w=800', date: '11 Dic, 2024', title: 'Maximiza tu productividad con estos accesorios para laptop', excerpt: 'Lorem ipsum dolor sit amet consectetur. Molestie cras volutpat fringilla pellentesque lobortis...', category: 'Guías', tags: ['Laptop', 'Productividad'] },
    { image: 'https://images.unsplash.com/photo-1592840496694-26d035b52b48?auto=format&fit=crop&q=80&w=800', date: '11 Dic, 2024', title: 'Guía definitiva de controles gaming: características y más', excerpt: 'Lorem ipsum dolor sit amet consectetur. Molestie cras volutpat fringilla pellentesque lobortis...', category: 'Tendencias', tags: ['Gaming', 'Controles'] },
  ];
  return base.map((p, i) => {
    const post: FalconBlogPost = {
      id: (p as any).id || String(i + 1),
      author: (p as any).author || 'Falcon',
      category: (p as any).category || 'Novedades',
      tags: Array.isArray((p as any).tags) && (p as any).tags.length ? (p as any).tags : ['Accesorios', 'Audífonos'],
      body: Array.isArray((p as any).body) && (p as any).body.length ? (p as any).body : DEFAULT_BLOG_BODY,
      ...p,
    } as FalconBlogPost;
    if (!post.bodyHtml || !String(post.bodyHtml).trim()) post.bodyHtml = blogBodyToHtml(post.body);
    return post;
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Brand logo — store name split into two tones (like GADGETIZE)
// ─────────────────────────────────────────────────────────────────────────────
export function FalconLogo({ storeName, green, logo }: { storeName: string; green: string; logo?: string }) {
  if (logo) {
    return <img src={logo} alt={storeName} className="h-11 w-auto max-w-[200px] object-contain md:h-12" />;
  }
  const clean = (storeName?.trim() || 'Falcon').toUpperCase();
  const cut = Math.max(2, clean.length - 3);
  return (
    <div className="flex items-center gap-2">
      <Icon icon="solar:bolt-bold" width={26} style={{ color: green }} />
      <span className="text-2xl font-black tracking-tight text-[#151515] md:text-[28px]">
        {clean.slice(0, cut)}
        <span style={{ color: green }}>{clean.slice(cut)}</span>
      </span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Product card
// ─────────────────────────────────────────────────────────────────────────────
export function FalconCardIcon({ icon, green, onClick }: { icon: string; green: string; onClick: (e: React.MouseEvent) => void }) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileHover={{ scale: 1.08 }}
      whileTap={falconTap}
      className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white shadow-sm transition-colors"
      style={{ color: green }}
      onMouseEnter={(e) => { e.currentTarget.style.background = green; e.currentTarget.style.color = '#fff'; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.color = green; }}
    >
      <Icon icon={icon} width={18} />
    </motion.button>
  );
}

export function FalconProductCard({
  producto, green, onOpen, onAdd, onQuickView, onWishlist, onCompare, inWishlist, diseno,
}: {
  producto: any; green: string; onOpen: () => void; onAdd: () => void;
  onQuickView?: () => void; onWishlist?: () => void; onCompare?: () => void; inWishlist?: boolean; diseno?: any;
}) {
  const pricing = getProductPricing(producto);
  const img = getImg(producto);
  const name = producto?.descripcion || producto?.nombre || 'Producto';
  const desc = plainText(producto?.detalle || producto?.descripcionCorta || producto?.descripcionLarga || '') ||
    'Lorem ipsum dolor sit amet consectetur. Est morbi cum bibendum id eleifend...';
  const reviews = Number(producto?.numReviews || producto?.reviews || 1);
  const outOfStock = Number(producto?.stock ?? 1) <= 0;

  return (
    <motion.article
      layout
      variants={falconFadeUp}
      whileHover={falconHoverLift}
      whileTap={falconTap}
      onClick={onOpen}
      className="group flex h-full cursor-pointer flex-col overflow-hidden rounded-2xl bg-white shadow-sm transition-shadow hover:shadow-lg"
    >
      <div className="relative flex h-[240px] items-center justify-center bg-white p-6">
        {pricing.enOferta && (
          <span className="absolute left-4 top-4 z-10 rounded bg-[#e11d48] px-2.5 py-1 text-xs font-bold text-white">-{pricing.porcentajeDescuento}%</span>
        )}
        <div className="absolute right-4 top-4 z-20 flex translate-x-3 flex-col gap-2 opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100">
          <FalconCardIcon icon={inWishlist ? 'solar:heart-bold' : 'solar:heart-linear'} green={green} onClick={(e) => { e.stopPropagation(); onWishlist?.(); }} />
          <FalconCardIcon icon="solar:eye-linear" green={green} onClick={(e) => { e.stopPropagation(); onQuickView?.(); }} />
          <FalconCardIcon icon="solar:refresh-square-linear" green={green} onClick={(e) => { e.stopPropagation(); onCompare?.(); }} />
        </div>
        {img ? (
          <img src={img} alt={name} className="max-h-full max-w-full object-contain transition-transform duration-500 group-hover:scale-105" loading="lazy" />
        ) : (
          <Icon icon="solar:box-bold-duotone" width={80} className="text-gray-200" />
        )}
      </div>
      <div className="flex flex-1 flex-col px-5 pb-5">
        <h3 className="line-clamp-1 text-lg font-bold" style={{ color: green }}>{name}</h3>
        <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-gray-400">{desc}</p>
        <div className="mt-3 flex items-center gap-2">
          <div className="flex text-[#e11d48]">{Array.from({ length: 5 }).map((_, i) => <Icon key={i} icon="solar:star-bold" width={14} />)}</div>
          <span className="text-xs text-gray-400">( {reviews} {reviews === 1 ? 'review' : 'reviews'} )</span>
        </div>
        <div className="mt-3 flex items-center gap-2">
          {pricing.enOferta && <span className="text-sm font-semibold text-gray-400 line-through">{money(pricing.precioRegular)}</span>}
          <span className="text-lg font-black text-[#151515]">{money(pricing.precioFinal)}</span>
        </div>
        <button
          type="button"
          disabled={outOfStock}
          onClick={(e) => { e.stopPropagation(); if (!outOfStock) onAdd(); }}
          className="mt-4 rounded-md border-2 py-3 text-sm font-bold transition-colors disabled:cursor-not-allowed disabled:border-gray-200 disabled:text-gray-400"
          style={outOfStock ? undefined : { borderColor: green, color: green }}
          onMouseEnter={(e) => { if (!outOfStock) { e.currentTarget.style.background = green; e.currentTarget.style.color = '#fff'; } }}
          onMouseLeave={(e) => { if (!outOfStock) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = green; } }}
        >
          {outOfStock ? 'Sin stock' : editable(diseno?.falconProductAddLabel, 'Agregar al carrito')}
        </button>
      </div>
    </motion.article>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Filter tabs
// ─────────────────────────────────────────────────────────────────────────────
export function FalconTabs({ tabs, active, onChange, green }: { tabs: string[]; active: string; onChange: (t: string) => void; green: string }) {
  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm font-semibold text-gray-400">
      {tabs.map((t) => (
        <motion.button key={t} type="button" onClick={() => onChange(t)} whileHover={{ y: -2 }} whileTap={falconTap} className="inline-flex items-center gap-2 transition-colors" style={active === t ? { color: green } : undefined}>
          <span className="h-2 w-2 rounded-full" style={{ background: active === t ? green : '#d1d5db' }} />
          {t}
        </motion.button>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Header (search row + sticky nav)
// ─────────────────────────────────────────────────────────────────────────────
export function FalconHeader({
  tienda, slug, green, cartCount, cartTotal, onOpenCart, diseno, categories = [], products = [],
}: {
  tienda: any; slug: string; green: string; cartCount: number; cartTotal: number; onOpenCart: () => void; diseno?: any; categories?: any[]; products?: any[];
}) {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [openMenu, setOpenMenu] = useState<'categorias' | 'productos' | 'blog' | null>(null);
  const storeName = storeNameOf(tienda);
  const goCatalog = (extra = '') => navigate(withPreviewQuery(`/tienda/${slug}/catalogo${extra}`, diseno));
  const doSearch = () => { const q = search.trim(); goCatalog(q ? `?search=${encodeURIComponent(q)}` : ''); };
  const goBlog = (id?: string) => navigate(withPreviewQuery(`/tienda/${slug}/blog${id ? `/${id}` : ''}`, diseno));
  const goCategory = (name: string) => { setOpenMenu(null); goCatalog(`?category=${encodeURIComponent(name)}`); };
  const openProduct = (p: any) => { setOpenMenu(null); navigate(withPreviewQuery(`/tienda/${slug}/producto/${p.id}`, diseno)); };

  // green ya llega resuelto de forma segura desde cada página.
  const accent = green;

  const catNames = useMemo(() => (Array.isArray(categories) ? categories.map(getName).filter(Boolean) : []), [categories]);
  const prods = Array.isArray(products) ? products : [];
  const prodsOf = (name: string) => prods.filter((p) => catOf(p).toLowerCase() === String(name).toLowerCase());
  const blogPosts = getFalconBlogPosts(diseno);
  const [hoverCat, setHoverCat] = useState<string>('');
  const activeCat = hoverCat || catNames[0] || '';
  const activeCatProducts = (prodsOf(activeCat).length ? prodsOf(activeCat) : prods).slice(0, 8);
  const activeCatImages = activeCatProducts.filter((p) => getImg(p)).slice(0, 2);

  return (
    <>
      <div className="h-1.5 w-full" style={{ background: green }} />
      <header className="bg-white">
        <div className="mx-auto flex max-w-[1400px] flex-col gap-4 px-4 py-4 lg:flex-row lg:items-center lg:gap-8 lg:px-6">
          <button type="button" onClick={() => navigate(withPreviewQuery(`/tienda/${slug}`, diseno))} className="shrink-0">
            <FalconLogo storeName={storeName} green={green} logo={tienda?.logo || tienda?.logoUrl} />
          </button>
          <div className="flex flex-1 items-center overflow-hidden rounded-full border border-gray-200 bg-white shadow-sm">
            <button type="button" onClick={() => goCatalog()} className="hidden items-center gap-2 border-r border-gray-200 px-5 py-3 text-sm font-semibold text-gray-600 hover:text-[#151515] md:flex">
              {editable(diseno?.falconCategoriesLabel, 'Todas las categorías')} <Icon icon="solar:alt-arrow-down-linear" width={16} />
            </button>
            <input value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && doSearch()} placeholder={editable(diseno?.falconSearchPlaceholder, 'Buscar productos...')} className="min-w-0 flex-1 border-none bg-transparent px-5 py-3 text-sm outline-none ring-0 placeholder:text-gray-400 focus:border-none focus:outline-none focus:ring-0" />
            <button type="button" onClick={doSearch} className="m-1 rounded-full px-6 py-2.5 text-sm font-bold text-white transition-transform hover:scale-[1.02]" style={{ background: green }}>{editable(diseno?.falconSearchButton, 'Buscar')}</button>
          </div>
          <div className="flex items-center gap-6">
            <button type="button" onClick={onOpenCart} className="relative flex items-center gap-2 text-[#151515]">
              <span className="relative">
                <Icon icon="solar:cart-large-2-linear" width={26} />
                <span className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-black text-white" style={{ background: green }}>{cartCount}</span>
              </span>
              <span className="hidden text-left text-xs font-semibold leading-tight sm:block">{editable(diseno?.falconCartLabel, 'Mi carrito')}<br />{money(cartTotal)}</span>
            </button>
          </div>
        </div>
      </header>

      <div className="sticky top-0 z-40 border-y border-gray-100 bg-white/95 shadow-sm backdrop-blur" onMouseLeave={() => setOpenMenu(null)}>
        <div className="relative mx-auto max-w-[1400px] px-4 lg:px-6">
          <div className="flex items-center justify-between gap-4 py-3">
            {/* Explorar categorías (mega menú) */}
            <div className="relative" onMouseEnter={() => setOpenMenu('categorias')}>
              <button type="button" onClick={() => goCatalog()} className="flex items-center gap-2 text-sm font-bold" style={{ color: accent }}>
                <Icon icon="solar:hamburger-menu-linear" width={22} /> {editable(diseno?.falconExploreLabel, 'Explorar categorías')}
              </button>
            </div>

            <nav className="hidden items-center gap-8 text-sm font-semibold text-[#151515] lg:flex">
              <button type="button" onClick={() => navigate(withPreviewQuery(`/tienda/${slug}`, diseno))} onMouseEnter={() => setOpenMenu(null)} className="transition-colors hover:opacity-70" style={{ color: accent }}>{editable(diseno?.falconNavHome, 'Inicio')}</button>
              <button type="button" onClick={() => goCatalog()} onMouseEnter={() => setOpenMenu('productos')} className="inline-flex items-center gap-1 transition-colors hover:opacity-70">{editable(diseno?.falconNavProducts, 'Productos')} <Icon icon="solar:alt-arrow-down-linear" width={14} /></button>
              <div className="relative" onMouseEnter={() => setOpenMenu('blog')}>
                <button type="button" onClick={() => goBlog()} className="inline-flex items-center gap-1 transition-colors hover:opacity-70">{editable(diseno?.falconNavBlog, 'Blog')} <Icon icon="solar:alt-arrow-down-linear" width={14} /></button>
                {openMenu === 'blog' && (
                  <div className="absolute left-1/2 top-full z-50 w-52 -translate-x-1/2 pt-3">
                    <div className="overflow-hidden rounded-xl border border-gray-100 bg-white py-2 shadow-2xl">
                      <button type="button" onClick={() => goBlog()} className="block w-full px-5 py-2.5 text-left text-sm font-semibold text-[#151515] transition-colors hover:bg-gray-50" onMouseEnter={(e) => (e.currentTarget.style.color = accent)} onMouseLeave={(e) => (e.currentTarget.style.color = '#151515')}>Lista de blog</button>
                      <button type="button" onClick={() => goBlog(blogPosts[0]?.id)} className="block w-full px-5 py-2.5 text-left text-sm font-semibold text-[#151515] transition-colors hover:bg-gray-50" onMouseEnter={(e) => (e.currentTarget.style.color = accent)} onMouseLeave={(e) => (e.currentTarget.style.color = '#151515')}>Detalle de blog</button>
                    </div>
                  </div>
                )}
              </div>
              <button type="button" onClick={() => goCatalog()} onMouseEnter={() => setOpenMenu(null)} className="transition-colors hover:opacity-70">{editable(diseno?.falconNavOffers, 'Ofertas')}</button>
              <button type="button" onClick={() => goCatalog()} onMouseEnter={() => setOpenMenu(null)} className="transition-colors hover:opacity-70">{editable(diseno?.falconNavStore, 'Tienda')}</button>
              <button type="button" onClick={() => navigate(withPreviewQuery(`/tienda/${slug}/contacto`, diseno))} onMouseEnter={() => setOpenMenu(null)} className="transition-colors hover:opacity-70">{editable(diseno?.falconNavContact, 'Contacto')}</button>
            </nav>

            <div className="hidden items-center gap-2 text-sm font-semibold text-[#151515] xl:flex">
              <Icon icon="solar:sale-linear" width={20} style={{ color: '#e11d48' }} />
              {editable(diseno?.falconSaleNote, 'Oferta: S/ 20 de descuento en tu primera compra.')}
            </div>
          </div>

          {/* Mega menú: Explorar categorías */}
          {openMenu === 'categorias' && catNames.length > 0 && (
            <div className="absolute left-4 top-full z-50 hidden pt-1 lg:block">
              <div className="grid w-[860px] max-w-[calc(100vw-2rem)] grid-cols-[260px_1fr] overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-2xl">
                <div className="border-r border-gray-100 py-3">
                  {catNames.slice(0, 11).map((c) => (
                    <button key={c} type="button" onMouseEnter={() => setHoverCat(c)} onClick={() => goCategory(c)} className="flex w-full items-center justify-between px-5 py-2.5 text-left text-sm font-bold transition-colors" style={activeCat === c ? { color: accent, background: `${accent}12` } : { color: '#151515' }}>
                      {c} <Icon icon="solar:alt-arrow-right-linear" width={15} style={{ color: activeCat === c ? accent : '#d1d5db' }} />
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-[1fr_auto] gap-4 p-6">
                  <div>
                    <button type="button" onClick={() => goCategory(activeCat)} className="text-base font-black" style={{ color: accent }}>{activeCat}</button>
                    <div className="mt-4 space-y-2.5">
                      {activeCatProducts.slice(0, 6).map((p, i) => (
                        <button key={p.id ?? i} type="button" onClick={() => openProduct(p)} className="block text-left text-sm font-semibold text-gray-600 transition-colors hover:text-[#151515]">{p.descripcion || p.nombre}</button>
                      ))}
                      {activeCatProducts.length === 0 && <p className="text-sm text-gray-400">Sin productos.</p>}
                    </div>
                  </div>
                  <div className="hidden items-center gap-4 xl:flex">
                    {(activeCatImages.length ? activeCatImages : activeCatProducts.slice(0, 2)).map((p, i) => (
                      <button key={`${activeCat}-${p.id ?? i}`} type="button" onClick={() => openProduct(p)} className="flex h-40 w-40 items-center justify-center overflow-hidden rounded-xl bg-[#f5f5f7] p-3 transition-transform hover:scale-[1.03]">
                        {getImg(p) ? <img src={getImg(p)} alt="" className="max-h-full max-w-full object-contain" /> : <Icon icon="solar:box-bold-duotone" width={54} className="text-gray-300" />}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Mega menú: Productos */}
          {openMenu === 'productos' && catNames.length > 0 && (
            <div className="absolute inset-x-4 top-full z-50 hidden pt-1 lg:block">
              <div className="grid grid-cols-[1fr_1fr_1.4fr] gap-8 overflow-hidden rounded-2xl border border-gray-100 bg-white p-8 shadow-2xl">
                {catNames.slice(0, 2).map((c, ci) => (
                  <div key={c}>
                    <button type="button" onClick={() => goCategory(c)} className="text-base font-black" style={{ color: accent }}>{c}</button>
                    <div className="mt-4 space-y-2.5">
                      {(prodsOf(c).length ? prodsOf(c) : prods.slice(ci * 6, ci * 6 + 6)).slice(0, 6).map((p, i) => (
                        <button key={p.id ?? i} type="button" onClick={() => openProduct(p)} className="block text-left text-sm font-semibold text-gray-600 transition-colors hover:text-[#151515]">{p.descripcion || p.nombre}</button>
                      ))}
                    </div>
                  </div>
                ))}
                <div className="grid grid-cols-2 gap-4">
                  {prods.slice(0, 2).map((p, i) => (
                    <button key={p.id ?? i} type="button" onClick={() => openProduct(p)} className="group flex flex-col items-center">
                      <span className="flex h-44 w-full items-center justify-center overflow-hidden rounded-xl bg-[#f5f5f7] p-4 transition-transform group-hover:scale-[1.02]">
                        {getImg(p) ? <img src={getImg(p)} alt="" className="max-h-full max-w-full object-contain" /> : <Icon icon="solar:box-bold-duotone" width={60} className="text-gray-300" />}
                      </span>
                      <span className="mt-3 line-clamp-1 text-sm font-bold text-[#151515]">{p.descripcion || p.nombre}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Benefits + Footer
// ─────────────────────────────────────────────────────────────────────────────
export function FalconBenefits({ green, diseno }: { green: string; diseno?: any }) {
  const benefits: [string, string, string][] = [
    ['solar:refresh-square-bold', editable(diseno?.falconBenefit1Title, 'Devoluciones fáciles'), editable(diseno?.falconBenefit1Text, 'De vendedores seleccionados')],
    ['solar:delivery-bold', editable(diseno?.falconBenefit2Title, 'Envío rápido'), editable(diseno?.falconBenefit2Text, 'Entrega en 24 horas máx.')],
    ['solar:card-bold', editable(diseno?.falconBenefit3Title, 'Pago seguro'), editable(diseno?.falconBenefit3Text, 'Pagos 100% protegidos')],
    ['solar:sale-bold', 'Descuentos online', 'Descuentos por volumen'],
    ['solar:question-circle-bold', '¿Necesitas ayuda?', 'Soporte 24/7 dedicado'],
    ['solar:filter-bold', 'Productos curados', 'De vendedores seleccionados'],
  ];
  return (
    <div className="border-t border-gray-100 bg-white">
      <motion.div
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: '-80px' }}
        variants={falconStagger}
        className="mx-auto grid max-w-[1400px] gap-8 px-4 py-12 sm:grid-cols-2 lg:grid-cols-6 lg:px-6"
      >
        {benefits.map(([icon, title, sub]) => (
          <motion.div key={title} variants={falconFadeUp} whileHover={{ y: -4 }} className="flex flex-col items-center gap-3 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-xl border-2" style={{ borderColor: green, color: green }}><Icon icon={icon} width={26} /></span>
            <div>
              <p className="text-sm font-black text-[#151515]">{title}</p>
              <p className="mt-1 text-xs text-gray-400">{sub}</p>
            </div>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}

export function FalconFooter({ tienda, slug, green, categories = [], diseno }: { tienda: any; slug: string; green: string; categories?: string[]; diseno?: any }) {
  const navigate = useNavigate();
  const storeName = storeNameOf(tienda);
  const goCatalog = (extra = '') => navigate(withPreviewQuery(`/tienda/${slug}/catalogo${extra}`, diseno));
  return (
    <>
      <footer className="border-t border-gray-200 bg-white text-gray-500">
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-80px' }}
          variants={falconFadeUp}
          className="mx-auto grid max-w-[1400px] gap-10 px-4 py-14 md:grid-cols-2 lg:grid-cols-5 lg:px-6"
        >
          <div className="lg:col-span-1">
            <FalconLogo storeName={storeName} green={green} logo={tienda?.logo || tienda?.logoUrl} />
            <p className="mt-4 max-w-xs text-sm leading-relaxed">{editable(diseno?.falconFooterAbout, 'Tecnología y gadgets de última generación con envío a todo el país y soporte técnico garantizado.')}</p>
            <p className="mt-6 text-sm font-black text-[#151515]">Síguenos</p>
            <div className="mt-3 flex gap-2">
              {['ri:twitter-x-fill', 'ri:facebook-fill', 'ri:pinterest-fill', 'ri:instagram-line', 'ri:tiktok-fill'].map((ic) => (
                <a key={ic} href="#" className="flex h-9 w-9 items-center justify-center rounded-md border border-gray-200 transition-colors" style={{ color: green }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = green; e.currentTarget.style.color = '#fff'; }} onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = green; }}>
                  <Icon icon={ic} width={18} />
                </a>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-4 text-base font-black text-[#151515]">{editable(diseno?.falconFooterFastTitle, 'Encuéntralo rápido')}</p>
            <div className="space-y-2.5 text-sm">
              {categories.slice(0, 6).map((c) => <button key={c} type="button" onClick={() => goCatalog(`?category=${encodeURIComponent(c)}`)} className="block hover:text-[#151515]">{c}</button>)}
            </div>
          </div>
          <div>
            <p className="mb-4 text-base font-black text-[#151515]">{editable(diseno?.falconFooterLinksTitle, 'Enlaces')}</p>
            <div className="space-y-2.5 text-sm">
              {['Inicio', 'Nosotros', 'Tienda', 'Ofertas', 'Novedades'].map((l) => <button key={l} type="button" onClick={() => goCatalog()} className="block hover:text-[#151515]">{l}</button>)}
            </div>
          </div>
          <div>
            <p className="mb-4 text-base font-black text-[#151515]">{editable(diseno?.falconFooterSupportTitle, 'Atención al cliente')}</p>
            <div className="space-y-2.5 text-sm">
              {['Mi cuenta', 'Rastrea tu pedido', 'Productos', 'Servicio al cliente', 'Cambios/Devoluciones', 'Preguntas frecuentes'].map((l) => <button key={l} type="button" onClick={() => goCatalog()} className="block hover:text-[#151515]">{l}</button>)}
            </div>
          </div>
          <div>
            <div className="flex items-start gap-3 text-sm"><Icon icon="solar:map-point-linear" width={20} style={{ color: green }} /><span>{editable(diseno?.falconFooterAddress, tienda?.direccion || 'Av. Principal 123, Lima, Perú')}</span></div>
            <div className="mt-3 flex items-center gap-3 text-sm"><Icon icon="solar:letter-linear" width={20} style={{ color: green }} /><span>{tienda?.correo || tienda?.email || 'contacto@ejemplo.com'}</span></div>
            <div className="mt-3 flex items-center gap-3 text-sm"><Icon icon="solar:phone-calling-linear" width={20} style={{ color: green }} /><span>{tienda?.whatsappTienda || tienda?.telefono || tienda?.celular || '+51 999 999 999'}</span></div>
            <button type="button" onClick={() => navigate(withPreviewQuery(`/tienda/${slug}/contacto`, diseno))} className="mt-6 inline-flex items-center gap-2 rounded-md px-6 py-3 text-sm font-black text-white transition-transform hover:scale-[1.02]" style={{ background: green }}>
              <Icon icon="solar:chat-round-dots-bold" width={18} /> {editable(diseno?.falconFooterContactButton, 'Contáctanos')}
            </button>
          </div>
        </motion.div>
        <div className="border-t border-gray-200">
          <div className="mx-auto flex max-w-[1400px] flex-col items-center justify-between gap-4 px-4 py-5 text-xs text-gray-400 md:flex-row lg:px-6">
            <p>© {new Date().getFullYear()} {storeName}. {editable(diseno?.falconFooterCopyright, 'Todos los derechos reservados.')}</p>
            <div className="flex items-center gap-3">
              <Icon icon="logos:mastercard" width={34} /><Icon icon="logos:visa" width={34} /><Icon icon="logos:paypal" width={22} /><Icon icon="logos:apple-pay" width={34} />
            </div>
          </div>
        </div>
      </footer>
      <div className="h-1.5 w-full" style={{ background: green }} />
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Quick view modal
// ─────────────────────────────────────────────────────────────────────────────
export function FalconQuickView({ producto, green, onClose, onAdd, onOpen }: { producto: any; green: string; onClose: () => void; onAdd: () => void; onOpen: () => void }) {
  const pricing = getProductPricing(producto);
  const img = getImg(producto);
  const name = producto?.descripcion || producto?.nombre || 'Producto';
  const desc = plainText(producto?.detalle || producto?.descripcionLarga || producto?.descripcionCorta || '') ||
    'Lorem ipsum dolor sit amet consectetur. Est morbi cum bibendum id eleifend ultrices enim nec. Vitae morbi mus imperdiet tincidunt ultrices hendrerit.';
  const reviews = Number(producto?.numReviews || producto?.reviews || 1);
  const sold = Number(producto?.vendidos || 21);
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/50" onClick={onClose} />
      <motion.div initial={{ opacity: 0, scale: 0.96, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96 }} className="relative z-10 grid max-h-[86vh] w-full max-w-4xl grid-cols-1 overflow-hidden rounded-2xl bg-white shadow-2xl md:grid-cols-2">
        <button type="button" onClick={onClose} className="absolute right-4 top-4 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-md transition-colors hover:bg-gray-100"><Icon icon="solar:close-circle-linear" width={22} className="text-[#151515]" /></button>
        <div className="relative flex items-center justify-center bg-[#f5f5f7] p-10">{img ? <img src={img} alt={name} className="max-h-[340px] max-w-full object-contain" /> : <Icon icon="solar:box-bold-duotone" width={120} className="text-gray-300" />}</div>
        <div className="flex flex-col overflow-y-auto p-8">
          <h2 className="text-2xl font-black text-[#151515]">{name}</h2>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5"><div className="flex text-[#e11d48]">{Array.from({ length: 5 }).map((_, i) => <Icon key={i} icon="solar:star-bold" width={15} />)}</div><span className="text-sm text-gray-400">( {reviews} {reviews === 1 ? 'review' : 'reviews'} )</span></div>
            <span className="inline-flex items-center gap-1.5 text-sm text-gray-500"><Icon icon="solar:fire-bold" width={16} className="text-[#e11d48]" /> {sold} vendidos en las últimas 24 horas</span>
          </div>
          <div className="mt-5 flex items-center gap-3"><span className="text-2xl font-black text-[#151515]">{money(pricing.precioFinal)}</span>{pricing.enOferta && <span className="text-lg font-semibold text-gray-400 line-through">{money(pricing.precioRegular)}</span>}</div>
          {pricing.enOferta && <p className="mt-1 text-sm text-gray-500">Descuento: {money(pricing.precioRegular - pricing.precioFinal)} ({pricing.porcentajeDescuento}%)</p>}
          <p className="mt-5 text-sm leading-relaxed text-gray-500">{desc}</p>
          <div className="mt-auto flex gap-3 pt-8">
            <button type="button" onClick={onAdd} className="flex-1 rounded-md py-3 text-sm font-bold text-white transition-transform hover:scale-[1.02]" style={{ background: green }}>Agregar al carrito</button>
            <button type="button" onClick={onOpen} className="rounded-md border-2 px-6 py-3 text-sm font-bold" style={{ borderColor: green, color: green }}>Ver detalle</button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Cart drawer
// ─────────────────────────────────────────────────────────────────────────────
export function FalconCartDrawer({ isOpen, onClose, carrito, actualizarCantidad, onCheckout, onViewCart, green, diseno, tienda }: {
  isOpen: boolean; onClose: () => void; carrito: any[]; actualizarCantidad: (id: any, qty: number) => void; onCheckout: () => void; onViewCart: () => void; green: string; diseno?: any; tienda?: any;
}) {
  const total = carrito.reduce((acc, it) => acc + Number(it?.precioUnitario || 0) * Number(it?.cantidad || 1), 0);
  const FREE_SHIPPING = 500;
  const progress = Math.min(100, (total / FREE_SHIPPING) * 100);

  const cotizarPorWhatsApp = () => {
    if (!carrito.length) return;
    const storeName = storeNameOf(tienda);
    const detail = carrito
      .map((item) => `• ${Number(item.cantidad || 1)} x ${item.descripcion || item.nombre} - ${money(Number(item.precioUnitario || 0) * Number(item.cantidad || 1))}`)
      .join('\n');
    const message = `Hola, quiero cotizar estos productos en ${storeName}:\n\n${detail}\n\nTotal estimado: ${money(total)}\n¿Me confirman stock y tiempo de entrega?`;
    const url = buildStorePurchaseWhatsappUrl(tienda?.whatsappTienda ?? tienda?.diseno?.whatsappTienda, message);
    if (url) window.open(url, '_blank', 'noopener,noreferrer');
  };
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[80]">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/50" onClick={onClose} />
          <motion.aside initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'tween', duration: 0.3 }} className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-5">
              <h3 className="text-lg font-black text-[#151515]">{editable(diseno?.falconCartTitle, 'Carrito de compras')}</h3>
              <button type="button" onClick={onClose}><Icon icon="solar:close-circle-linear" width={26} className="text-gray-500 hover:text-[#151515]" /></button>
            </div>
            <div className="flex-1 overflow-y-auto px-6">
              {carrito.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center gap-3 text-gray-400"><Icon icon="solar:cart-large-2-linear" width={64} /><p className="text-sm font-semibold">{editable(diseno?.falconCartEmptyText, 'Tu carrito está vacío')}</p></div>
              ) : carrito.map((item, i) => (
                <div key={item.id ?? i} className="flex gap-4 border-b border-gray-100 py-5">
                  <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[#f5f5f7]">{getImg(item) ? <img src={getImg(item)} alt="" className="h-full w-full object-contain p-1" /> : <Icon icon="solar:box-bold-duotone" width={32} className="text-gray-300" />}</div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-bold" style={{ color: green }}>{item.descripcion || item.nombre}</p>
                      <button type="button" onClick={() => actualizarCantidad(item.id, 0)}><Icon icon="solar:trash-bin-trash-linear" width={18} className="text-gray-400 hover:text-[#e11d48]" /></button>
                    </div>
                    <p className="mt-1 text-sm font-black text-[#151515]">{money(Number(item.precioUnitario || 0))}</p>
                    <div className="mt-3 inline-flex items-center rounded-md border border-gray-200">
                      <button type="button" onClick={() => actualizarCantidad(item.id, Math.max(1, Number(item.cantidad || 1) - 1))} className="px-3 py-1.5 text-gray-500 hover:text-[#151515]"><Icon icon="solar:minus-square-linear" width={18} /></button>
                      <span className="min-w-[36px] text-center text-sm font-bold">{String(Number(item.cantidad || 1)).padStart(2, '0')}</span>
                      <button type="button" onClick={() => actualizarCantidad(item.id, Number(item.cantidad || 1) + 1)} className="px-3 py-1.5 text-gray-500 hover:text-[#151515]"><Icon icon="solar:add-square-linear" width={18} /></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="border-t border-gray-100 px-6 py-5">
              <div className="relative h-2 overflow-hidden rounded-full bg-gray-100"><div className="h-full rounded-full transition-all" style={{ width: `${progress}%`, background: `repeating-linear-gradient(45deg, ${green}, ${green} 6px, #10b981 6px, #10b981 12px)` }} /></div>
              <p className="mt-3 text-sm font-semibold text-[#151515]">{progress >= 100 ? <>{editable(diseno?.falconCartFreeText, '¡Felicidades! Tienes envío gratis')}</> : <>Te faltan <span style={{ color: green }}>{money(FREE_SHIPPING - total)}</span> para envío gratis</>}</p>
              <div className="mt-4 flex items-center justify-around border-y border-gray-100 py-3 text-gray-400">{['solar:bill-list-linear', 'solar:gift-linear', 'solar:box-linear', 'solar:ticket-sale-linear'].map((ic) => <Icon key={ic} icon={ic} width={22} />)}</div>
              <div className="mt-4 flex items-center justify-between"><span className="text-sm font-black uppercase tracking-wide text-gray-500">Subtotal</span><span className="text-lg font-black text-[#151515]">{money(total)}</span></div>
              <button type="button" onClick={onViewCart} className="mt-4 w-full rounded-md bg-[#151515] py-3.5 text-sm font-black uppercase tracking-wide text-white transition-transform hover:scale-[1.01]">{editable(diseno?.falconCartViewLabel, 'Ver carrito')}</button>
              <button type="button" onClick={onCheckout} className="mt-3 w-full rounded-md py-3.5 text-sm font-black uppercase tracking-wide text-white transition-transform hover:scale-[1.01]" style={{ background: green }}>{editable(diseno?.falconCartCheckoutLabel, 'Finalizar compra')}</button>
              <button type="button" onClick={cotizarPorWhatsApp} disabled={carrito.length === 0} className="mt-3 flex w-full items-center justify-center gap-2 rounded-md bg-[#25D366] py-3.5 text-sm font-black uppercase tracking-wide text-white transition-transform hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-50"><Icon icon="ri:whatsapp-fill" width={20} /> {editable(diseno?.falconCartQuoteLabel, 'Cotizar por WhatsApp')}</button>
            </div>
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Wishlist drawer
// ─────────────────────────────────────────────────────────────────────────────
export function FalconWishlistDrawer({ isOpen, onClose, items, onRemove, onViewAll, green }: {
  isOpen: boolean; onClose: () => void; items: any[]; onRemove: (id: any) => void; onViewAll: () => void; green: string;
}) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[80]">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/50" onClick={onClose} />
          <motion.aside initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'tween', duration: 0.3 }} className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-5">
              <h3 className="text-lg font-black text-[#151515]">Mi lista de deseos</h3>
              <button type="button" onClick={onClose}><Icon icon="solar:close-circle-linear" width={26} className="text-gray-500 hover:text-[#151515]" /></button>
            </div>
            <div className="flex-1 overflow-y-auto px-6">
              {items.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center gap-3 text-gray-400"><Icon icon="solar:heart-linear" width={64} /><p className="text-sm font-semibold">Tu lista está vacía</p></div>
              ) : items.map((item, i) => {
                const pricing = getProductPricing(item);
                return (
                  <div key={item.id ?? i} className="flex items-center gap-4 border-b border-gray-100 py-5">
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[#f5f5f7]">{getImg(item) ? <img src={getImg(item)} alt="" className="h-full w-full object-contain p-1" /> : <Icon icon="solar:box-bold-duotone" width={28} className="text-gray-300" />}</div>
                    <div className="flex-1">
                      <p className="text-sm font-bold" style={{ color: green }}>{item.descripcion || item.nombre}</p>
                      <p className="mt-1 text-sm"><span className="font-black text-[#151515]">{money(pricing.precioFinal)}</span>{pricing.enOferta && <span className="ml-2 text-gray-400 line-through">{money(pricing.precioRegular)}</span>}</p>
                    </div>
                    <button type="button" onClick={() => onRemove(item.id)}><Icon icon="solar:close-square-linear" width={20} className="text-gray-400 hover:text-[#e11d48]" /></button>
                  </div>
                );
              })}
            </div>
            <div className="border-t border-gray-100 px-6 py-5"><button type="button" onClick={onViewAll} className="w-full rounded-md py-3.5 text-sm font-black uppercase tracking-wide text-white transition-transform hover:scale-[1.01]" style={{ background: green }}>Ver lista de deseos</button></div>
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Compare modal
// ─────────────────────────────────────────────────────────────────────────────
export function FalconCompareModal({ isOpen, onClose, items, onRemove, onRemoveAll, onAdd, green }: {
  isOpen: boolean; onClose: () => void; items: any[]; onRemove: (id: any) => void; onRemoveAll: () => void; onAdd: (p: any) => void; green: string;
}) {
  const rows: [string, (p: any) => React.ReactNode][] = [
    ['Descripción', (p) => <span className="text-gray-500">{(plainText(p?.detalle || p?.descripcionLarga || '') || 'Lorem ipsum dolor sit amet consectetur. Est morbi cum bibendum id eleifend ultrices enim nec. Vit...').slice(0, 110)}...</span>],
    ['Colección', (p) => catOf(p) || '—'],
    ['Disponibilidad', (p) => Number(p?.stock ?? 1) > 0 ? <span className="font-bold" style={{ color: green }}>En stock</span> : <span className="font-bold text-[#e11d48]">Agotado</span>],
    ['Tipo de producto', (p) => catOf(p) || 'Accesorios'],
    ['Proveedor', (p) => p?.marca?.nombre || p?.marca || p?.vendor || 'Falcon'],
    ['SKU', (p) => p?.codigo || p?.sku || '—'],
  ];
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/50" onClick={onClose} />
          <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }} className="relative z-10 flex max-h-[88vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 bg-[#f7f7f8] px-6 py-4"><span className="mx-auto text-sm font-black uppercase tracking-[0.2em] text-[#151515]">Comparar</span><button type="button" onClick={onClose}><Icon icon="solar:close-circle-linear" width={24} className="text-gray-500 hover:text-[#151515]" /></button></div>
            <div className="overflow-auto p-6">
              <div className="mb-6 flex justify-center"><button type="button" onClick={onRemoveAll} className="inline-flex items-center gap-2 rounded-md px-6 py-3 text-sm font-bold text-white" style={{ background: green }}><Icon icon="solar:trash-bin-trash-linear" width={18} /> Quitar todo</button></div>
              {items.length === 0 ? <p className="py-10 text-center text-sm font-semibold text-gray-400">No hay productos para comparar.</p> : (
                <div className="min-w-[640px] rounded-2xl border border-gray-100">
                  <div className="grid" style={{ gridTemplateColumns: `160px repeat(${items.length}, minmax(0,1fr))` }}>
                    <div className="flex items-center border-b border-r border-gray-100 p-5 text-sm font-bold text-[#151515]">Productos</div>
                    {items.map((p, i) => {
                      const pricing = getProductPricing(p);
                      return (
                        <div key={p.id ?? i} className="relative border-b border-gray-100 p-5 text-center">
                          <button type="button" onClick={() => onRemove(p.id)} className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full text-white shadow" style={{ background: green }}><Icon icon="solar:trash-bin-trash-linear" width={16} /></button>
                          <div className="mx-auto flex h-32 items-center justify-center">{getImg(p) ? <img src={getImg(p)} alt="" className="max-h-full max-w-full object-contain" /> : <Icon icon="solar:box-bold-duotone" width={64} className="text-gray-300" />}</div>
                          <p className="mt-3 text-sm font-bold" style={{ color: green }}>{p.descripcion || p.nombre}</p>
                          <p className="mt-1 text-sm"><span className="font-black text-[#e11d48]">{money(pricing.precioFinal)}</span>{pricing.enOferta && <span className="ml-2 text-gray-400 line-through">{money(pricing.precioRegular)}</span>}</p>
                          <button type="button" onClick={() => onAdd(p)} className="mt-3 w-full rounded-md bg-[#151515] py-2.5 text-xs font-bold text-white transition-transform hover:scale-[1.02]">Agregar al carrito</button>
                        </div>
                      );
                    })}
                  </div>
                  {rows.map(([label, render], ri) => (
                    <div key={label} className={`grid ${ri < rows.length - 1 ? 'border-b border-gray-100' : ''}`} style={{ gridTemplateColumns: `160px repeat(${items.length}, minmax(0,1fr))` }}>
                      <div className="flex items-center border-r border-gray-100 p-5 text-sm font-bold text-[#151515]">{label}</div>
                      {items.map((p, i) => <div key={p.id ?? i} className="p-5 text-center text-sm text-gray-600">{render(p)}</div>)}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
