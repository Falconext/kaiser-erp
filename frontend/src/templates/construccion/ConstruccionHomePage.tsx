import { useMemo, useState } from 'react';
import { BRAND } from '@/lib/branding';
import { useNavigate } from 'react-router-dom';
import { Icon } from '@iconify/react';
import { motion } from 'framer-motion';
import type { TemplateHomePageProps } from '@/templates/shared/types';
import ProductCardActions from '@/components/tienda/ProductCardActions';
import HammerCatalogCard from './HammerCatalogCard';
import { getProductPricing } from '@/templates/shared/pricing';
import { getStoreLinkAction, runStoreLinkAction } from '@/components/tienda/storeLinkActions';
import ConstruccionCartModal from './ConstruccionCartModal';

const fadeUp = {
  hidden: { opacity: 0, y: 26 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] } },
};

const getName = (item: any) => (typeof item === 'string' ? item : item?.nombre || item?.name || '');
const editable = (value: any, fallback: string) => String(value || '').trim() || fallback;
const pickProducts = (custom: any, fallback: any[]) => (Array.isArray(custom) && custom.length > 0 ? custom : fallback);

const getPrice = (producto: any) => getProductPricing(producto).precioFinal;
const getRegularPrice = (producto: any) => getProductPricing(producto).precioRegular;
const formatPrice = (value: number) => `S/ ${Number(value || 0).toFixed(2)}`;
const hasOffer = (producto: any) => getProductPricing(producto).enOferta;
const discount = (producto: any) => getProductPricing(producto).porcentajeDescuento;

const getOfferTimeParts = (producto: any) => {
  const end = producto?.fechaFinOferta ? new Date(producto.fechaFinOferta) : null;
  if (!end || Number.isNaN(end.getTime())) return null;
  const seconds = Math.max(0, Math.floor((end.getTime() - Date.now()) / 1000));
  if (seconds <= 0) return null;
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return [
    [String(days).padStart(2, '0'), 'DÍAS'],
    [String(hours).padStart(2, '0'), 'HRS'],
    [String(minutes).padStart(2, '0'), 'MIN'],
    [String(secs).padStart(2, '0'), 'SEG'],
  ];
};

function ToolPromoGraphic({ type }: { type: 'battery' | 'power' | 'pack' }) {
  if (type === 'pack') {
    return (
      <div className="absolute bottom-0 right-4 h-[86%] w-[48%]">
        <div className="absolute bottom-0 right-0 h-32 w-36 rounded-t-3xl bg-[#1f2937] shadow-2xl" />
        <div className="absolute bottom-16 right-16 h-36 w-6 -rotate-[28deg] rounded-full bg-slate-300 shadow-xl" />
        <div className="absolute bottom-[112px] right-[72px] h-14 w-16 -rotate-[28deg] rounded-t-full bg-slate-200" />
        <div className="absolute bottom-7 right-28 h-40 w-5 rotate-[16deg] rounded-full bg-slate-100" />
        <div className="absolute bottom-0 right-9 h-24 w-24 rounded-2xl bg-[#ff7a1a]" />
        <div className="absolute bottom-5 right-16 h-5 w-20 rounded-full bg-black/40" />
      </div>
    );
  }

  return (
    <div className="absolute bottom-2 right-2 h-[88%] w-[54%]">
      <div className={`absolute right-3 top-8 h-20 w-56 rounded-r-[42px] rounded-l-xl bg-[#1398c8] shadow-2xl ${type === 'power' ? 'rotate-[18deg]' : ''}`}>
        <div className="absolute left-6 top-5 h-3 w-24 rounded-full bg-black/30" />
        <div className="absolute right-4 top-5 h-5 w-12 rounded bg-[#0f172a]" />
      </div>
      <div className={`absolute right-10 top-24 h-28 w-16 rounded-b-2xl bg-[#0f6c8f] ${type === 'power' ? 'rotate-[18deg]' : ''}`} />
      <div className={`absolute right-1 top-[46px] h-5 w-24 rounded-full bg-slate-200 ${type === 'power' ? 'rotate-[18deg]' : ''}`} />
      <div className="absolute bottom-2 right-14 h-9 w-28 rounded-md bg-[#0f172a]" />
    </div>
  );
}

function HammerPromoCard({
  tone,
  badge,
  eyebrow,
  title,
  type,
  imageUrl,
  buttonLabel = 'Comprar ahora',
  onClick,
}: {
  tone: 'yellow' | 'blue' | 'orange';
  badge?: string;
  eyebrow: string;
  title: string;
  type: 'battery' | 'power' | 'pack';
  imageUrl?: string;
  buttonLabel?: string;
  onClick: () => void;
}) {
  const styles = {
    yellow: 'bg-[#ffbd18] text-[#111111]',
    blue: 'bg-[#d9edf8] text-[#111111]',
    orange: 'bg-[#ff6017] text-white',
  };

  return (
    <motion.article
      variants={fadeUp}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.35 }}
      className={`relative min-h-[210px] overflow-hidden rounded-md p-7 shadow-sm ${styles[tone]}`}
    >
      <div className={`relative z-10 max-w-[58%] ${imageUrl ? 'text-white' : ''}`}>
        {badge && (
          <span className="mb-3 inline-flex rounded-md bg-[#ff5a1f] px-4 py-2 text-sm font-black text-white">
            {badge}
          </span>
        )}
        <p className="text-xl font-black">{eyebrow}</p>
        <h3 className="mt-2 text-3xl font-black leading-tight">{title}</h3>
        <button
          type="button"
          onClick={onClick}
          className="mt-7 rounded-md bg-white px-7 py-3 text-base font-black text-[#111111] shadow-sm transition-transform hover:scale-[1.03]"
        >
          {buttonLabel}
        </button>
      </div>
      {imageUrl ? (
        <>
          <img src={imageUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/55 via-black/25 to-transparent" />
        </>
      ) : (
        <ToolPromoGraphic type={type} />
      )}
    </motion.article>
  );
}

function OfferCountdown({ parts }: { parts: string[][] }) {
  return (
    <div className="mt-2 flex gap-1.5">
      {parts.map(([value, label]) => (
        <span key={label} className="rounded bg-red-50 px-2 py-1 text-center text-[10px] font-black text-red-500">
          <span className="block text-sm leading-none">{value}</span>
          {label}
        </span>
      ))}
    </div>
  );
}

function HammerProductCard({
  producto,
  slug,
  onOpen,
  onAddToCart,
}: {
  producto: any;
  slug: string;
  onOpen: () => void;
  onAddToCart: (producto: any) => void;
}) {
  const price = getPrice(producto);
  const regular = getRegularPrice(producto);
  const offered = hasOffer(producto);
  const offerParts = offered ? getOfferTimeParts(producto) : null;
  const isOutOfStock = Number(producto?.stock ?? 1) <= 0;
  const img = producto?.imagenUrl || producto?.imagen || producto?.imageUrl;
  const name = producto?.descripcion || producto?.nombre || 'Producto';
  const hasVariants = Array.isArray(producto?.variantes) && producto.variantes.length > 0;

  return (
    <article
      className="group relative cursor-pointer bg-white"
      onClick={onOpen}
    >
      <div className="relative flex h-[240px] items-center justify-center overflow-visible rounded-md bg-white p-5">
        {offered && (
          <span className="absolute left-2 top-2 z-10 rounded-md px-2 py-1 text-[11px] font-black text-[#111111]" style={{ background: '#ffb400' }}>
            -{discount(producto)}%
          </span>
        )}

        <div className="absolute right-2 top-5 z-20 hidden flex-col gap-2 group-hover:flex">
          <ProductCardActions producto={producto} slug={slug} cp="#ffb400" />
        </div>

        {img ? (
          <img src={img} alt={name} className="max-h-full max-w-full object-contain transition-transform duration-500 group-hover:scale-105" loading="lazy" />
        ) : (
          <Icon icon="solar:box-bold-duotone" width={82} className="text-gray-200" />
        )}

        {offerParts && <div className="absolute bottom-1 left-5"><OfferCountdown parts={offerParts} /></div>}
      </div>

      <div className="pt-5">
        <h3 className="min-h-[48px] text-base font-black leading-snug text-[#151515] line-clamp-2">{name}</h3>
        <div className="mt-3 flex text-[#ff9d00]">
          {Array.from({ length: 5 }).map((_, index) => (
            <Icon key={index} icon="solar:star-bold" width={18} />
          ))}
        </div>
        <div className="mt-3 flex items-center gap-2 text-lg font-black text-[#151515]">
          {offered && <span className="font-semibold text-gray-400 line-through">{formatPrice(regular)}</span>}
          <span>{formatPrice(price)}</span>
        </div>
        <button
          type="button"
          disabled={isOutOfStock}
          onClick={(event) => {
            event.stopPropagation();
            if (isOutOfStock) return;
            if (hasVariants) {
              onOpen();
              return;
            }
            onAddToCart(producto);
          }}
          className="mt-4 rounded-md px-5 py-3 text-sm font-black text-[#111111] transition-transform hover:scale-[1.02] disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400"
          style={isOutOfStock ? undefined : { background: '#ffb400' }}
        >
          {isOutOfStock ? 'Sin stock' : hasVariants ? 'Ver opciones' : offered ? 'Agregar al carrito' : 'Ver productos'}
        </button>
      </div>
    </article>
  );
}

function WorkshopBanner({
  layout = 'wide',
  title,
  eyebrow,
  imageUrl,
  buttonLabel = 'Comprar ahora',
  onClick,
}: {
  layout?: 'wide' | 'half';
  title: string;
  eyebrow: string;
  imageUrl?: string;
  buttonLabel?: string;
  onClick: () => void;
}) {
  return (
    <motion.article
      variants={fadeUp}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.3 }}
      className={`relative overflow-hidden rounded-md bg-[#111111] text-center text-white shadow-sm ${layout === 'wide' ? 'min-h-[220px]' : 'min-h-[190px]'}`}
    >
      {imageUrl ? (
        <>
          <img src={imageUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/45 to-black/25" />
        </>
      ) : (
        <>
          <div
            className="absolute inset-0 opacity-65"
            style={{
              background:
                'radial-gradient(circle at 18% 30%, rgba(255,255,255,.16), transparent 18%), radial-gradient(circle at 72% 35%, rgba(255,180,0,.16), transparent 18%), linear-gradient(120deg, #090909 0%, #2b2117 46%, #050505 100%)',
            }}
          />
          <div className="absolute left-4 top-6 h-20 w-64 -rotate-6 rounded-full bg-[#1188bd]/45 blur-xl" />
          <div className="absolute right-8 top-5 h-36 w-20 rotate-12 rounded-2xl bg-[#0e8fc8] shadow-2xl" />
          <div className="absolute right-16 bottom-7 h-6 w-52 rotate-12 rounded-full bg-slate-200/70" />
        </>
      )}
      <div className="relative z-10 flex min-h-[inherit] flex-col items-center justify-center px-6 py-9">
        <p className="text-xl font-semibold tracking-wide text-white md:text-2xl">{eyebrow}</p>
        <h3 className="mt-2 text-3xl font-black leading-tight md:text-5xl" style={{ color: '#ffb400' }}>
          {title}
        </h3>
        <button type="button" onClick={onClick} className="mt-6 rounded-md bg-white px-8 py-3 text-base font-black text-[#151515] shadow-sm transition-transform hover:scale-[1.03]">
          {buttonLabel}
        </button>
      </div>
    </motion.article>
  );
}

function HammerSectionHeader({
  title,
  tabs,
  active,
  onChange,
  cp,
}: {
  title: string;
  tabs?: string[];
  active?: string;
  onChange?: (tab: string) => void;
  cp: string;
}) {
  return (
    <div className="flex flex-col gap-5 border-b-4 md:flex-row md:items-end md:justify-between" style={{ borderColor: cp }}>
      <h2 className="pb-4 text-2xl font-black text-[#151515] sm:text-3xl">{title}</h2>
      <div className="flex items-end gap-2 overflow-x-auto pb-1">
        {tabs?.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => onChange?.(tab)}
            className={`shrink-0 px-4 py-3 text-sm font-black transition-colors sm:px-6 sm:py-4 sm:text-base ${active === tab ? 'text-[#111111]' : 'text-[#151515] hover:bg-gray-50'}`}
            style={active === tab ? { background: cp } : undefined}
          >
            {tab}
          </button>
        ))}
        <div className="flex gap-2 pb-4 pl-4 text-gray-400">
          <button type="button" className="transition-colors hover:text-[#111111]">
            <Icon icon="solar:alt-arrow-left-linear" width={26} />
          </button>
          <button type="button" className="transition-colors hover:text-[#111111]">
            <Icon icon="solar:alt-arrow-right-linear" width={26} />
          </button>
        </div>
      </div>
    </div>
  );
}

function HammerLogo({ storeName, subtitle = 'Herramientas y accesorios', accent = '#ffb400' }: { storeName: string; subtitle?: string; accent?: string }) {
  const label = storeName?.trim() ? storeName.trim().split(/\s+/)[0] : 'Hammer';
  const clean = label.replace(/[^a-zA-Z0-9]/g, '') || 'Hammer';
  const start = clean.slice(0, Math.max(2, clean.length - 3)).toUpperCase();
  const end = clean.slice(Math.max(2, clean.length - 3)).toUpperCase();

  return (
    <div className="leading-none">
      <div className="flex items-end text-[30px] font-black uppercase tracking-[0.08em] text-white md:text-[36px]">
        <span>{start}</span>
        <span style={{ color: accent }}>{end}</span>
      </div>
      <p className="mt-1 text-[13px] font-semibold tracking-wide text-white/35">{subtitle}</p>
    </div>
  );
}

export function ConstruccionFooter({ tienda, slug, cp, categories, diseno: disenoProp }: { tienda: any; slug: string; cp: string; categories: any[]; diseno?: any }) {
  const storeName = tienda?.nombreComercial || tienda?.nombre || tienda?.razonSocial || 'Ferretería';
  const diseno = disenoProp || tienda?.diseno || {};
  const links = categories.map(getName).filter(Boolean).slice(0, 5);

  return (
    <footer className="bg-[#1d1d1d] text-white">
      <section className="bg-white">
        <div className="mx-auto max-w-7xl px-4 py-12 lg:px-6">
          <div className="flex items-end justify-between border-b-4 pb-4" style={{ borderColor: cp }}>
            <h2 className="text-2xl font-black text-[#151515] sm:text-3xl">{editable(diseno?.construccionBrandsTitle, 'Marcas')}</h2>
            <div className="flex gap-2 text-gray-400">
              <Icon icon="solar:alt-arrow-left-linear" width={26} />
              <Icon icon="solar:alt-arrow-right-linear" width={26} />
            </div>
          </div>
          <div className="grid grid-cols-2 items-center gap-8 py-12 text-center text-lg font-black uppercase tracking-widest text-gray-300 sm:text-2xl md:grid-cols-5 md:py-14">
            {['Design Studio', 'Vintage', 'Showtime', 'Ben Co.', 'Abir John'].map((brand) => (
              <div key={brand} className="opacity-70 grayscale transition-opacity hover:opacity-100">
                {brand}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section style={{ background: cp }}>
        <div className="mx-auto grid max-w-7xl items-center gap-6 px-4 py-10 md:grid-cols-[1fr_1.4fr] lg:px-6">
          <div className="flex items-center gap-4 text-[#151515]">
            <Icon icon="solar:letter-unread-linear" width={44} />
            <h2 className="text-2xl font-black sm:text-3xl">{editable(diseno?.construccionNewsletterTitle, 'Suscríbete a novedades')}</h2>
          </div>
          <form className="flex min-h-[58px] flex-col overflow-hidden rounded-md bg-white sm:flex-row" onSubmit={(event) => event.preventDefault()}>
            <input className="min-w-0 flex-1 px-5 py-4 text-base font-semibold text-gray-700 outline-none sm:px-6 sm:py-0" placeholder={editable(diseno?.construccionNewsletterPlaceholder, 'Tu correo electrónico')} />
            <button type="submit" className="bg-[#111111] px-8 py-4 text-base font-black text-white sm:py-0">
              {editable(diseno?.construccionNewsletterButton, 'Suscribirme')}
            </button>
          </form>
        </div>
      </section>

      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 md:grid-cols-[1.4fr_1fr_1fr_1fr] lg:px-6">
        <div>
          <HammerLogo storeName={storeName} subtitle={editable(diseno?.construccionLogoSubtitle, 'Herramientas y accesorios')} accent={cp} />
          <p className="mt-6 text-2xl font-black" style={{ color: cp }}>{tienda?.whatsappTienda || tienda?.telefono || '(+51) 999-999-999'}</p>
          <div className="mt-7 space-y-4 text-base font-semibold text-white/75">
            <p className="flex gap-3"><Icon icon="solar:map-point-linear" width={22} /> {tienda?.direccion || 'Av. Principal 123, Lima, Perú'}</p>
            <p className="flex gap-3"><Icon icon="solar:phone-linear" width={22} /> {tienda?.telefono || '(+51) 123 456 789'}</p>
            <p className="flex gap-3"><Icon icon="solar:letter-linear" width={22} /> {tienda?.email || 'demo@example.com'}</p>
          </div>
        </div>
        <div>
          <p className="mb-7 text-2xl font-black" style={{ color: cp }}>{editable(diseno?.construccionFooterInfoTitle, 'Información')}</p>
          <div className="space-y-5 text-base font-semibold text-white/75">
            <a href={`/tienda/${slug}/contacto`} className="block hover:text-white">Contáctanos</a>
            <a href={`/tienda/${slug}`} className="block hover:text-white">Sobre nosotros</a>
            <a href={`/tienda/${slug}/catalogo`} className="block hover:text-white">Novedades</a>
            <a href={`/tienda/${slug}/seguimiento`} className="block hover:text-white">Seguimiento de pedido</a>
          </div>
        </div>
        <div>
          <p className="mb-7 text-2xl font-black" style={{ color: cp }}>{editable(diseno?.construccionFooterPoliciesTitle, 'Políticas')}</p>
          <div className="space-y-5 text-base font-semibold text-white/75">
            <a href={`/tienda/${slug}/politicas/devoluciones`} className="block hover:text-white">Cambios y devoluciones</a>
            <a href={`/tienda/${slug}/terminos`} className="block hover:text-white">Términos de uso</a>
            <a href={`/tienda/${slug}/privacidad`} className="block hover:text-white">Privacidad</a>
            <a href={`/tienda/${slug}/catalogo`} className="block hover:text-white">Mapa del sitio</a>
          </div>
        </div>
        <div>
          <p className="mb-7 text-2xl font-black" style={{ color: cp }}>{editable(diseno?.construccionFooterHelpTitle, 'Ayuda')}</p>
          <div className="space-y-5 text-base font-semibold text-white/75">
            {links.map((name) => (
              <a key={name} href={`/tienda/${slug}/catalogo?category=${encodeURIComponent(name)}`} className="block hover:text-white">
                {name}
              </a>
            ))}
          </div>
        </div>
      </div>
      <div className="border-t border-white/10 px-4 py-7">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-4 text-base font-semibold text-white/70 md:flex-row">
          <span>© {new Date().getFullYear()} {storeName}. Desarrollado por {BRAND.name}.</span>
          <span className="text-white/40">{editable(diseno?.construccionFooterPaymentsText, 'Visa · Mastercard · Yape · Plin')}</span>
        </div>
      </div>
    </footer>
  );
}

export default function ConstruccionHomePage({
  tienda,
  slug,
  productos,
  allCategories,
  cp,
  diseno,
  carrito,
  setCarrito,
  mostrarCarrito,
  setMostrarCarrito,
  agregarAlCarrito,
  actualizarCantidad,
  loading,
}: TemplateHomePageProps) {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [activeTrendingTab, setActiveTrendingTab] = useState<'featured' | 'best' | 'new'>('featured');
  const [activeTopCategory, setActiveTopCategory] = useState('');
  const storeName = tienda?.nombreComercial || tienda?.nombre || tienda?.razonSocial || 'Hammer';
  const categories = allCategories.map(getName).filter(Boolean).slice(0, 6);
  const accent = cp || '#ffb400';
  const heroImage = diseno?.construccionHeroImageUrl || diseno?.ferreteriaHeroImageUrl || diseno?.bannerHeroUrl || '/assets/templates/ferreteria/banner.png';
  const cartCount = carrito.reduce((sum: number, item: any) => sum + Number(item?.cantidad || 1), 0);
  const irACheckout = () => navigate(`/tienda/${slug}/checkout`, { state: { carrito, tienda } });
  const categoryLabel = useMemo(() => categories[0] || 'Todas las categorías', [categories]);
  const logoSubtitle = editable(diseno?.construccionLogoSubtitle, 'Herramientas y accesorios');
  const categoryButtonLabel = editable(diseno?.construccionHeaderCategoryLabel, 'Comprar por categorías');
  const searchPlaceholder = editable(diseno?.construccionSearchPlaceholder, 'Buscar...');
  const goAction = (key: string, defaultType: 'catalog' | 'category' | 'search' | 'product' | 'url' | 'none' = 'catalog') => {
    runStoreLinkAction(getStoreLinkAction(diseno, key, { defaultType }), { slug, navigate });
  };
  const trendingProducts = useMemo(() => {
    if (Array.isArray(diseno?.construccionTrendingProducts) && diseno.construccionTrendingProducts.length > 0) {
      return diseno.construccionTrendingProducts;
    }
    const base = [...productos];
    if (activeTrendingTab === 'best') {
      return base.sort((a, b) => Number(b?.vendidos ?? b?.stock ?? 0) - Number(a?.vendidos ?? a?.stock ?? 0)).slice(0, 10);
    }
    if (activeTrendingTab === 'new') {
      return base.reverse().slice(0, 10);
    }
    return base.slice(0, 10);
  }, [activeTrendingTab, productos, diseno?.construccionTrendingProducts]);
  const topCategoryTabs = useMemo(() => {
    const real = categories.slice(0, 3);
    return real.length ? real : ['Sierra circular', 'Sierra inalámbrica', 'Taladro percutor'];
  }, [categories]);
  const currentTopCategory = activeTopCategory || topCategoryTabs[0] || '';
  const topCategoryProducts = useMemo(() => {
    const selected = currentTopCategory.toLowerCase();
    const filtered = productos.filter((producto: any) => {
      const categoria = typeof producto?.categoria === 'object' ? producto?.categoria?.nombre : producto?.categoria;
      return categoria?.toLowerCase?.().includes(selected);
    });
    return pickProducts(diseno?.construccionTopCategoryProducts, (filtered.length ? filtered : productos.slice(2)).slice(0, 5));
  }, [currentTopCategory, productos, diseno?.construccionTopCategoryProducts]);
  const specialProducts = useMemo(() => {
    const offered = productos.filter((producto: any) => hasOffer(producto));
    return pickProducts(diseno?.construccionSpecialProducts, (offered.length ? offered : productos.slice(5)).slice(0, 5));
  }, [productos, diseno?.construccionSpecialProducts]);
  const specialCountdown = useMemo(() => {
    const offer = specialProducts.find((producto: any) => getOfferTimeParts(producto));
    return offer ? getOfferTimeParts(offer) : null;
  }, [specialProducts]);

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#f4f4f4]" style={{ fontFamily: `'${diseno?.tipografia || 'Inter'}', sans-serif` }}>
      <header className="relative z-20 bg-[#111111] text-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-6 lg:flex-row lg:items-center lg:px-6">
          <button type="button" onClick={() => navigate(`/tienda/${slug}`)} className="text-left">
            <HammerLogo storeName={storeName} subtitle={logoSubtitle} accent={accent} />
          </button>

          <form
            className="flex min-h-[48px] flex-1 overflow-hidden rounded-md bg-white text-[13px] text-[#111] shadow-xl lg:mx-10"
            onSubmit={(event) => {
              event.preventDefault();
              navigate(`/tienda/${slug}/catalogo?search=${encodeURIComponent(search)}`);
            }}
          >
            <button type="button" className="hidden min-w-[190px] items-center justify-between border-r border-gray-200 px-5 text-[13px] font-bold text-gray-500 md:flex">
              {categoryLabel}
              <Icon icon="solar:alt-arrow-down-linear" width={18} />
            </button>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={searchPlaceholder}
              className="min-w-0 flex-1 px-5 text-[13px] font-semibold text-gray-700 outline-none"
            />
            <button type="submit" className="px-4 text-[13px] font-black text-[#111] sm:px-7" style={{ background: accent }}>
              Buscar
            </button>
          </form>

          <div className="hidden items-center gap-8 lg:flex">
            <div className="flex items-center gap-3">
              <span className="flex h-14 w-14 items-center justify-center rounded-md bg-white/10">
                <Icon icon="solar:phone-calling-bold" width={28} />
              </span>
              <div>
              <p className="text-[13px] font-black text-white/80">{editable(diseno?.construccionCallLabel, 'Llámanos:')}</p>
                <p className="text-[13px] font-black" style={{ color: accent }}>
                  {tienda?.whatsappTienda || tienda?.telefono || '(+51) 999-999-999'}
                </p>
              </div>
            </div>
            <Icon icon="solar:user-linear" width={30} className="text-white" />
          </div>
        </div>

        <div className="bg-[#ffb400]" style={{ background: accent }}>
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 lg:px-6">
            <button
              type="button"
              onClick={() => navigate(`/tienda/${slug}/catalogo`)}
              className="inline-flex h-12 min-w-0 flex-1 items-center gap-3 rounded-md bg-white px-4 text-[13px] font-black text-[#151515] shadow-sm sm:flex-none sm:px-5 sm:text-[14px] md:min-w-[230px]"
            >
              <Icon icon="solar:hamburger-menu-linear" width={28} />
              {categoryButtonLabel}
            </button>
            <nav className="hidden flex-1 items-center justify-center gap-8 text-[14px] font-black text-[#151515] lg:flex">
              <button type="button" onClick={() => navigate(`/tienda/${slug}`)}>{editable(diseno?.construccionNavHome, 'Inicio')}</button>
              <button type="button" onClick={() => navigate(`/tienda/${slug}/catalogo`)} className="inline-flex items-center gap-1">{editable(diseno?.construccionNavStore, 'Tienda')} <Icon icon="solar:alt-arrow-down-linear" /></button>
              <button type="button" onClick={() => navigate(`/tienda/${slug}/catalogo`)} className="inline-flex items-center gap-2">
                {editable(diseno?.construccionNavCategories, 'Categorías')} <span className="rounded px-1.5 py-0.5 text-[10px] font-black text-white" style={{ background: '#13a084' }}>OFERTA</span>
              </button>
              <button type="button" onClick={() => navigate(`/tienda/${slug}/catalogo`)} className="inline-flex items-center gap-2">
                {editable(diseno?.construccionNavProducts, 'Productos')} <span className="rounded px-1.5 py-0.5 text-[10px] font-black text-white" style={{ background: '#e93473' }}>TOP</span>
              </button>
              <button type="button" onClick={() => navigate(`/tienda/${slug}/catalogo`)}>{editable(diseno?.construccionNavOffers, 'Ofertas destacadas')}</button>
              <button type="button" onClick={() => navigate(`/tienda/${slug}/catalogo`)}>{editable(diseno?.construccionNavCatalog, 'Catálogo')}</button>
            </nav>
            <button
              type="button"
              onClick={() => setMostrarCarrito(true)}
              className="inline-flex items-center gap-2 text-[14px] font-black text-[#151515]"
            >
              <Icon icon="solar:cart-large-2-linear" width={34} />
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-xs">{cartCount}</span>
              <span className="hidden sm:inline">{editable(diseno?.construccionCartLabel, 'Mi carrito')}</span>
            </button>
          </div>
        </div>
      </header>

      <main>
        <section className="relative min-h-[560px] overflow-hidden bg-[#050505] text-white md:min-h-[640px]">
          <img
            src={heroImage}
            alt={`${storeName} — herramientas de calidad para cada proyecto`}
            className="absolute inset-0 h-full w-full object-cover"
            loading="eager"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/55 to-transparent" />

          <div className="relative mx-auto grid min-h-[560px] max-w-7xl items-center gap-8 px-4 py-14 md:min-h-[640px] lg:grid-cols-[.92fr_1.08fr] lg:px-6">
            <motion.div initial="hidden" animate="show" variants={fadeUp} className="relative z-10">
              <p className="text-base font-medium uppercase tracking-[0.08em] text-white/85 sm:text-xl md:text-2xl">
                {editable(diseno?.construccionHeroEyebrow, 'Mejores descuentos de hasta 15%')}
              </p>
              <h1 className="mt-6 max-w-3xl text-4xl font-black uppercase leading-[0.95] tracking-tight text-white sm:text-5xl md:text-7xl">
                {editable(diseno?.construccionHeroTitle, 'Herramientas de alto rendimiento')}
              </h1>
              <p className="mt-7 text-2xl font-black uppercase tracking-[0.13em] md:text-4xl" style={{ color: accent }}>
                {editable(diseno?.construccionHeroSubtitle, 'Aprovecha hasta 15% de descuento')}
              </p>
              <button
                type="button"
                onClick={() => goAction('construccionHeroAction')}
                className="mt-12 rounded-md bg-white px-8 py-4 text-base font-black text-[#151515] shadow-xl transition-transform hover:scale-[1.03]"
              >
                {editable(diseno?.construccionHeroButton, 'Comprar ahora')}
              </button>
            </motion.div>
          </div>

          <div className="absolute bottom-5 left-1/2 flex -translate-x-1/2 gap-2">
            <span className="h-3 w-3 border border-white bg-white/70" />
            <span className="h-3 w-3 border border-white bg-transparent" />
          </div>
        </section>

        <section className="bg-white">
          <div className="mx-auto grid max-w-7xl gap-6 px-4 py-7 md:grid-cols-2 lg:grid-cols-4 lg:px-6">
            {[
              ['solar:delivery-bold', editable(diseno?.construccionBenefitOneTitle, 'Compra y devolución fáciles'), editable(diseno?.construccionBenefitOneText, 'Compra y gestiona devoluciones sin fricción')],
              ['solar:bag-5-bold', editable(diseno?.construccionBenefitTwoTitle, 'Pagos seguros'), editable(diseno?.construccionBenefitTwoText, 'Seguridad al 100% en tus pagos')],
              ['solar:headphones-round-sound-bold', editable(diseno?.construccionBenefitThreeTitle, 'Soporte disponible 24/7'), editable(diseno?.construccionBenefitThreeText, 'Atención todos los días')],
              ['solar:rocket-bold', editable(diseno?.construccionBenefitFourTitle, 'Compra desde la app'), editable(diseno?.construccionBenefitFourText, 'Descarga la app y recibe ofertas')],
            ].map(([icon, title, desc], index) => (
              <motion.div key={title} variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.4 }} transition={{ delay: index * 0.04 }} className="flex items-center gap-5">
                <Icon icon={icon} width={42} className="text-[#151515]" />
                <div>
                  <p className="text-base font-black text-[#151515]">{title}</p>
                  <p className="mt-1 text-sm font-semibold text-gray-500">{desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        <section className="bg-white">
          <div className="mx-auto grid max-w-7xl gap-7 px-4 py-14 md:grid-cols-3 lg:px-6">
            <HammerPromoCard
              tone="yellow"
              badge={editable(diseno?.construccionPromoOneBadge, 'Oferta')}
              eyebrow={editable(diseno?.construccionPromoOneEyebrow, 'Descubre herramientas')}
              title={editable(diseno?.construccionPromoOneTitle, 'Batería de litio')}
              type="battery"
              imageUrl={diseno?.construccionPromoOneImageUrl || '/assets/templates/ferreteria/widgetferreteria1.png'}
              buttonLabel={editable(diseno?.construccionPromoButton, 'Comprar ahora')}
              onClick={() => goAction('construccionPromoOneAction')}
            />
            <HammerPromoCard
              tone="blue"
              eyebrow={editable(diseno?.construccionPromoTwoEyebrow, '15% de descuento')}
              title={editable(diseno?.construccionPromoTwoTitle, 'Herramientas eléctricas')}
              type="power"
              imageUrl={diseno?.construccionPromoTwoImageUrl || '/assets/templates/ferreteria/widgetferreteria2.png'}
              buttonLabel={editable(diseno?.construccionPromoButton, 'Comprar ahora')}
              onClick={() => goAction('construccionPromoTwoAction')}
            />
            <HammerPromoCard
              tone="orange"
              eyebrow={editable(diseno?.construccionPromoThreeEyebrow, '15% de descuento')}
              title={editable(diseno?.construccionPromoThreeTitle, 'Pack de maquinaria')}
              type="pack"
              imageUrl={diseno?.construccionPromoThreeImageUrl || '/assets/templates/ferreteria/widgetferreteria3.png'}
              buttonLabel={editable(diseno?.construccionPromoButton, 'Comprar ahora')}
              onClick={() => goAction('construccionPromoThreeAction')}
            />
          </div>
        </section>

        <section className="bg-white pb-16">
          <div className="mx-auto max-w-7xl px-4 lg:px-6">
            <HammerSectionHeader
              title={editable(diseno?.construccionTrendingTitle, 'Productos en tendencia')}
              tabs={['Productos destacados', 'Más vendidos', 'Nuevos productos']}
              active={activeTrendingTab === 'featured' ? 'Productos destacados' : activeTrendingTab === 'best' ? 'Más vendidos' : 'Nuevos productos'}
              onChange={(tab) => setActiveTrendingTab(tab === 'Más vendidos' ? 'best' : tab === 'Nuevos productos' ? 'new' : 'featured')}
              cp={accent}
            />

            {loading ? (
              <div className="grid gap-x-10 gap-y-14 pt-12 sm:grid-cols-2 lg:grid-cols-5">
                {Array.from({ length: 10 }).map((_, index) => (
                  <div key={index} className="h-[380px] animate-pulse rounded-md bg-gray-100" />
                ))}
              </div>
            ) : (
              <div className="grid gap-x-10 gap-y-16 pt-12 sm:grid-cols-2 lg:grid-cols-5">
                {trendingProducts.map((producto, index) => (
                  <HammerCatalogCard
                    key={`${producto.id || producto.descripcion}-${index}`}
                    producto={producto}
                    cp={accent}
                    onAdd={() => agregarAlCarrito(producto)}
                    onOpen={() => navigate(`/tienda/${slug}/producto/${producto.id}`)}
                  />
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="bg-white">
          <div className="mx-auto max-w-7xl px-4 py-8 lg:px-6">
            <WorkshopBanner
              eyebrow={editable(diseno?.construccionWideBannerEyebrow, 'Oferta limitada en herramientas eléctricas')}
              title={editable(diseno?.construccionWideBannerTitle, 'Obtén S/ 10 extra en herramientas eléctricas')}
              imageUrl={diseno?.construccionWideBannerImageUrl || '/assets/templates/ferreteria/oferta.png'}
              buttonLabel={editable(diseno?.construccionBannerButton, 'Comprar ahora')}
              onClick={() => goAction('construccionWideBannerAction')}
            />
          </div>
        </section>

        <section className="bg-white pb-16">
          <div className="mx-auto max-w-7xl px-4 lg:px-6">
            <HammerSectionHeader
              title={editable(diseno?.construccionTopCategoriesTitle, 'Categorías destacadas')}
              tabs={topCategoryTabs}
              active={currentTopCategory}
              onChange={setActiveTopCategory}
              cp={accent}
            />
            {loading ? (
              <div className="grid gap-x-10 gap-y-14 pt-12 sm:grid-cols-2 lg:grid-cols-5">
                {Array.from({ length: 5 }).map((_, index) => (
                  <div key={index} className="h-[380px] animate-pulse rounded-md bg-gray-100" />
                ))}
              </div>
            ) : (
              <div className="grid gap-x-10 gap-y-16 pt-12 sm:grid-cols-2 lg:grid-cols-5">
                {topCategoryProducts.map((producto, index) => (
                  <HammerCatalogCard
                    key={`top-${producto.id || producto.descripcion}-${index}`}
                    producto={producto}
                    cp={accent}
                    onAdd={() => agregarAlCarrito(producto)}
                    onOpen={() => navigate(`/tienda/${slug}/producto/${producto.id}`)}
                  />
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="bg-white">
          <div className="mx-auto grid max-w-7xl gap-8 px-4 py-8 md:grid-cols-2 lg:px-6">
            <WorkshopBanner
              layout="half"
              eyebrow={editable(diseno?.construccionWideBannerEyebrow, 'Oferta limitada en herramientas eléctricas')}
              title={editable(diseno?.construccionHalfBannerOneTitle, '10% de descuento en herramientas eléctricas')}
              imageUrl={diseno?.construccionHalfBannerOneImageUrl || '/assets/templates/ferreteria/oferta1.png'}
              buttonLabel={editable(diseno?.construccionBannerButton, 'Comprar ahora')}
              onClick={() => goAction('construccionHalfBannerOneAction')}
            />
            <WorkshopBanner
              layout="half"
              eyebrow={editable(diseno?.construccionWideBannerEyebrow, 'Oferta limitada en herramientas eléctricas')}
              title={editable(diseno?.construccionHalfBannerTwoTitle, 'Obtén S/ 10 extra en sierras')}
              imageUrl={diseno?.construccionHalfBannerTwoImageUrl || '/assets/templates/ferreteria/oferta2.png'}
              buttonLabel={editable(diseno?.construccionBannerButton, 'Comprar ahora')}
              onClick={() => goAction('construccionHalfBannerTwoAction')}
            />
          </div>
        </section>

        <section className="bg-white pb-20">
          <div className="mx-auto max-w-7xl px-4 lg:px-6">
            <div className="flex flex-col gap-5 border-b-4 md:flex-row md:items-end md:justify-between" style={{ borderColor: accent }}>
              <h2 className="pb-4 text-2xl font-black text-[#151515] sm:text-3xl">{editable(diseno?.construccionSpecialProductsTitle, 'Productos especiales')}</h2>
              <div className="flex flex-wrap items-end gap-4 pb-3">
                {specialCountdown && (
                  <div className="flex gap-1.5">
                    {specialCountdown.map(([value, label]) => (
                      <span key={label} className="rounded-md bg-[#ff5a1f] px-3 py-2 text-center text-[11px] font-black lowercase text-white">
                        <span className="block text-base uppercase leading-none">{value}</span>
                        {label.toLowerCase()}
                      </span>
                    ))}
                  </div>
                )}
                <div className="flex gap-2 text-gray-400">
                  <Icon icon="solar:alt-arrow-left-linear" width={26} />
                  <Icon icon="solar:alt-arrow-right-linear" width={26} />
                </div>
              </div>
            </div>
            {loading ? (
              <div className="grid gap-x-10 gap-y-14 pt-12 sm:grid-cols-2 lg:grid-cols-5">
                {Array.from({ length: 5 }).map((_, index) => (
                  <div key={index} className="h-[380px] animate-pulse rounded-md bg-gray-100" />
                ))}
              </div>
            ) : (
              <div className="grid gap-x-10 gap-y-16 pt-12 sm:grid-cols-2 lg:grid-cols-5">
                {specialProducts.map((producto, index) => (
                  <HammerCatalogCard
                    key={`special-${producto.id || producto.descripcion}-${index}`}
                    producto={producto}
                    cp={accent}
                    onAdd={() => agregarAlCarrito(producto)}
                    onOpen={() => navigate(`/tienda/${slug}/producto/${producto.id}`)}
                  />
                ))}
              </div>
            )}
          </div>
        </section>
      </main>

      <ConstruccionFooter tienda={tienda} slug={slug} cp={accent} categories={allCategories} diseno={diseno} />
      <ConstruccionCartModal
        isOpen={mostrarCarrito}
        onClose={() => setMostrarCarrito(false)}
        carrito={carrito}
        setCarrito={setCarrito}
        actualizarCantidad={actualizarCantidad}
        onCheckout={irACheckout}
        cp={accent}
        tienda={tienda}
      />
    </div>
  );
}
