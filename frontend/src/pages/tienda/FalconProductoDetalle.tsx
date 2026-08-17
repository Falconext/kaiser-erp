import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Icon } from '@iconify/react';
import { AnimatePresence, motion } from 'framer-motion';
import axios from 'axios';
import { getProductPricing, withPricing, withPricingList } from '@/templates/shared/pricing';
import { onTiendaCartCleared } from '@/utils/tiendaCart';
import {
  GREEN, resolveFalconGreen, getName, money, getImg, catOf, storeNameOf, editable, withPreviewQuery, FALCON_DEFAULT_IMAGES,
  FalconHeader, FalconFooter, FalconBenefits, FalconProductCard,
  FalconCartDrawer, FalconWishlistDrawer, FalconCompareModal, FalconQuickView,
  falconFadeUp, falconHoverLift, falconScaleIn, falconStagger, falconTap,
} from '@/templates/falcon/FalconShared';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4001/api';

const COLOR_MAP: Record<string, string> = {
  verde: '#1a8d4e', green: '#1a8d4e', beige: '#e8e4c9', blanco: '#ffffff', white: '#ffffff',
  negro: '#111111', black: '#111111', azul: '#2563eb', rojo: '#e11d48', gris: '#9ca3af',
};

// Convierte HTML (con entidades como &nbsp;) a texto plano legible.
const htmlToText = (html: string): string => {
  const raw = String(html || '');
  if (typeof document === 'undefined') {
    return raw.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/gi, ' ').replace(/&amp;/gi, '&').replace(/\s+/g, ' ').trim();
  }
  const el = document.createElement('div');
  el.innerHTML = raw;
  return (el.textContent || '').replace(/ /g, ' ').replace(/\s+/g, ' ').trim();
};

const hasHtmlMarkup = (value: string): boolean => /<[a-z][\s\S]*>/i.test(String(value || ''));

// Normaliza HTML pegado: reemplaza los &nbsp; (que suelen venir entre cada palabra
// e impiden el salto de línea, causando desbordamiento horizontal) por espacios.
const normalizeHtml = (html: string): string =>
  String(html || '').replace(/&nbsp;/gi, ' ').replace(/\u00a0/g, ' ');

export function FalconProductoDetalleView({
  tienda,
  slug,
  producto,
  related = [],
  allCategories = [],
  carrito,
  mostrarCarrito,
  setMostrarCarrito,
  actualizarCantidad,
  onNavigate,
  onAddToCart,
}: {
  tienda: any;
  slug: string;
  producto: any;
  related?: any[];
  allCategories?: any[];
  carrito: any[];
  setCarrito?: (items: any[]) => void;
  mostrarCarrito: boolean;
  setMostrarCarrito: (value: boolean) => void;
  actualizarCantidad: (productoId: number | string, cantidad: number) => void;
  onNavigate?: (page: 'home' | 'catalogo' | 'producto' | 'checkout') => void;
  onAddToCart?: (producto: any) => void;
}) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const previewPlantillaId = searchParams.get('previewPlantilla');
  const diseno = previewPlantillaId ? {
    ...(tienda?.diseno || {}),
    plantillaId: previewPlantillaId,
    __previewPlantillaId: previewPlantillaId,
    __previewQuery: `previewPlantilla=${encodeURIComponent(previewPlantillaId)}&previewOrigen=template`,
  } : (tienda?.diseno || {});
  const green = resolveFalconGreen(diseno);
  const storeName = storeNameOf(tienda);
  const pricing = getProductPricing(producto);

  const [qty, setQty] = useState(1);
  const [activeTab, setActiveTab] = useState<'desc' | 'info' | 'reviews'>('desc');
  const [showStickyBar, setShowStickyBar] = useState(false);
  const [quickView, setQuickView] = useState<any | null>(null);
  const [wishlist, setWishlist] = useState<any[]>([]);
  const [showWishlist, setShowWishlist] = useState(false);
  const [compare, setCompare] = useState<any[]>([]);
  const [showCompare, setShowCompare] = useState(false);
  const wishlistIds = useMemo(() => new Set(wishlist.map((w) => w.id)), [wishlist]);

  const extraImages = Array.isArray(producto?.imagenesExtra) ? producto.imagenesExtra : [];
  const gallery = [getImg(producto), ...extraImages, ...related.map(getImg)].filter(Boolean).slice(0, 6);
  const [activeImage, setActiveImage] = useState(0);
  const activeSrc = gallery[activeImage] || getImg(producto);
  const [zoom, setZoom] = useState({ x: 50, y: 50, active: false });

  const stock = Number(producto?.stock ?? 10);
  const outOfStock = stock <= 0;
  const name = producto?.descripcion || producto?.nombre || 'Producto';
  const rawLarga = String(producto?.descripcionLarga || '');
  const descHasHtml = hasHtmlMarkup(rawLarga);
  const desc = producto?.detalle || (rawLarga ? htmlToText(rawLarga) : '') || producto?.descripcionCorta ||
    'Lorem ipsum dolor sit amet consectetur. Est morbi cum bibendum id eleifend ultrices enim nec. Vitae morbi mus imperdiet tincidunt ultrices hendrerit. Lobortis donec massa fermentum aliquet sapien. Magna risus donec aliquam diam aliquet consectetur. Etiam accumsan ipsum augue sed vitae.';
  const reviews = Number(producto?.numReviews || producto?.reviews || 1);
  const sold = Number(producto?.vendidos || 18);
  const categoria = catOf(producto) || 'Accesorios';
  const tags = Array.isArray(producto?.tags) && producto.tags.length ? producto.tags : ['accesorios', 'audio', 'electrónica'];

  const colors = useMemo(() => {
    const raw = Array.isArray(producto?.colores) && producto.colores.length ? producto.colores : ['Verde', 'Beige', 'Blanco'];
    return raw.map((c: string) => ({ name: c, hex: COLOR_MAP[String(c).toLowerCase()] || c }));
  }, [producto]);
  const [color, setColor] = useState(colors[0]?.name || 'Verde');

  const cartCount = carrito.reduce((s, i) => s + Number(i?.cantidad || 1), 0);
  const cartTotal = carrito.reduce((s, i) => s + Number(i?.precioUnitario || 0) * Number(i?.cantidad || 1), 0);

  const go = (url: string, page?: 'home' | 'catalogo' | 'producto' | 'checkout') => { if (onNavigate && page) onNavigate(page); else navigate(withPreviewQuery(url, diseno)); };
  const openProduct = (p: any) => go(`/tienda/${slug}/producto/${p.id}`, 'producto');
  const goCatalog = () => go(`/tienda/${slug}/catalogo`, 'catalogo');

  const add = (n = qty) => {
    const item = { ...producto, ...pricing, precioUnitario: pricing.precioFinal, cantidad: n, id: producto.id, productoId: producto.id, colorSeleccionado: color };
    if (onAddToCart) onAddToCart(item);
    else actualizarCantidad(producto.id, (carrito.find((c) => c.id === producto.id)?.cantidad || 0) + n) as any;
    setMostrarCarrito(true);
  };
  const buyNow = () => { add(qty); go(`/tienda/${slug}/checkout`, 'checkout'); };
  const toggleWishlist = (p: any) => { setWishlist((prev) => (prev.some((x) => x.id === p.id) ? prev.filter((x) => x.id !== p.id) : [...prev, p])); setShowWishlist(true); };
  const addCompare = (p: any) => { setCompare((prev) => (prev.some((x) => x.id === p.id) ? prev : [...prev, p].slice(-4))); setShowCompare(true); };

  useEffect(() => {
    const onScroll = () => setShowStickyBar(window.scrollY > 520);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const categoryNames = useMemo(() => allCategories.map(getName).filter(Boolean), [allCategories]);
  const stockPct = Math.min(100, Math.max(6, (stock / 20) * 100));

  const detailBanner = diseno?.falconDetailBannerUrl || diseno?.falconCatalogBannerUrl || FALCON_DEFAULT_IMAGES.catalog;

  return (
    <div className="min-h-screen bg-white pb-24" style={{ fontFamily: `'${diseno?.tipografia || 'Inter'}', sans-serif` }}>
      <style>{`
        .falcon-prod-prose { overflow-wrap: anywhere; word-break: break-word; }
        .falcon-prod-prose * { max-width: 100%; white-space: normal !important; overflow-wrap: anywhere; }
        .falcon-prod-prose > * + * { margin-top: 1rem; }
        .falcon-prod-prose h1, .falcon-prod-prose h2, .falcon-prod-prose h3 { color: #151515; font-weight: 800; line-height: 1.3; }
        .falcon-prod-prose h2 { font-size: 1.2rem; }
        .falcon-prod-prose h3 { font-size: 1.05rem; }
        .falcon-prod-prose p { margin-top: 0.9rem; }
        .falcon-prod-prose strong { color: #151515; font-weight: 700; }
        .falcon-prod-prose a { color: ${green}; text-decoration: underline; }
        .falcon-prod-prose ul, .falcon-prod-prose ol { margin-top: 0.9rem; padding-left: 1.4rem; }
        .falcon-prod-prose ul { list-style: disc; }
        .falcon-prod-prose ol { list-style: decimal; }
        .falcon-prod-prose li { margin-top: 0.35rem; }
        .falcon-prod-prose img { border-radius: 0.5rem; max-width: 100%; }
        .falcon-prod-prose table { width: 100%; border-collapse: collapse; }
        .falcon-prod-prose td, .falcon-prod-prose th { border: 1px solid #e5e7eb; padding: 0.5rem 0.75rem; }
      `}</style>
      <FalconHeader tienda={tienda} slug={slug} green={green} cartCount={cartCount} cartTotal={cartTotal} onOpenCart={() => setMostrarCarrito(true)} diseno={diseno} categories={allCategories} products={related} />

      {/* Breadcrumb banner */}
      <motion.div initial="hidden" animate="show" variants={falconFadeUp} className="relative flex min-h-[220px] items-center justify-center overflow-hidden bg-[#151515] px-4">
        {detailBanner && (
          <>
            <img src={detailBanner} alt="" className="absolute inset-0 h-full w-full object-cover" />
            <div className="absolute inset-0 bg-black/25" />
          </>
        )}
        <h1 className="relative z-10 text-center text-4xl font-black text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.7)] md:text-5xl">{name}</h1>
      </motion.div>

      <div className="bg-[#ececec] pt-8">
        {/* Product main */}
        <motion.section initial="hidden" animate="show" variants={falconStagger} className="mx-auto grid max-w-[1400px] gap-6 px-4 lg:grid-cols-2 lg:px-6">
          {/* Gallery (sticky on scroll) */}
          <motion.div variants={falconScaleIn} className="h-fit rounded-2xl bg-white p-6 lg:sticky lg:top-24 lg:self-start">
            <div
              className="relative flex h-[420px] items-center justify-center overflow-hidden"
              onMouseEnter={() => setZoom((z) => ({ ...z, active: true }))}
              onMouseLeave={() => setZoom((z) => ({ ...z, active: false }))}
              onMouseMove={(e) => { const r = e.currentTarget.getBoundingClientRect(); setZoom({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100, active: true }); }}
            >
              <motion.button type="button" whileHover={{ scale: 1.06 }} whileTap={falconTap} className="absolute right-2 top-2 z-10 flex h-11 w-11 items-center justify-center rounded-full border border-gray-200 bg-white shadow-sm text-gray-500 hover:text-[#151515]"><Icon icon="solar:maximize-square-3-linear" width={20} /></motion.button>
              {activeSrc ? (
                <img
                  src={activeSrc}
                  alt={name}
                  className="max-h-full max-w-full object-contain transition-transform duration-200 ease-out"
                  style={{ transformOrigin: `${zoom.x}% ${zoom.y}%`, transform: zoom.active ? 'scale(2.2)' : 'scale(1)', cursor: 'zoom-in' }}
                />
              ) : <Icon icon="solar:box-bold-duotone" width={140} className="text-gray-200" />}
            </div>
            {gallery.length > 1 && (
              <div className="mt-6 flex flex-wrap gap-3">
                {gallery.map((src, i) => (
                  <motion.button key={i} type="button" onClick={() => setActiveImage(i)} whileHover={{ y: -2 }} whileTap={falconTap} className={`flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border-2 bg-[#f5f5f7] transition-colors ${i === activeImage ? '' : 'border-transparent'}`} style={i === activeImage ? { borderColor: green } : undefined}>
                    <img src={src} alt="" className="h-full w-full object-contain p-1" />
                  </motion.button>
                ))}
              </div>
            )}
          </motion.div>

          {/* Info */}
          <motion.div variants={falconFadeUp} className="rounded-2xl bg-white p-8">
            <h2 className="text-3xl font-black text-[#151515]">{name}</h2>
            <div className="mt-3 flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-1.5"><div className="flex text-[#e11d48]">{Array.from({ length: 5 }).map((_, i) => <Icon key={i} icon="solar:star-bold" width={16} />)}</div><span className="text-sm text-gray-400">( {reviews} {reviews === 1 ? 'review' : 'reviews'} )</span></div>
              <span className="inline-flex items-center gap-1.5 text-sm text-gray-500"><Icon icon="solar:fire-bold" width={16} className="text-[#e11d48]" /> {sold} vendidos en las últimas 24 horas</span>
            </div>

            <div className="mt-5 flex items-center gap-3">
              <span className="text-3xl font-black text-[#151515]">{money(pricing.precioFinal)}</span>
              {pricing.enOferta && <span className="text-xl font-semibold text-gray-400 line-through">{money(pricing.precioRegular)}</span>}
            </div>
            {pricing.enOferta && <p className="mt-1 text-sm text-gray-500">Descuento: {money(pricing.precioRegular - pricing.precioFinal)} ({pricing.porcentajeDescuento}%)</p>}

            <p className="mt-5 text-sm leading-relaxed text-gray-500 line-clamp-4">{desc}</p>

            {/* Colors */}
            <div className="mt-6">
              <p className="text-base font-black text-[#151515]">Color : <span className="font-semibold text-gray-400">{color}</span></p>
              <div className="mt-3 flex gap-3">
                {colors.map((c: { name: string; hex: string }) => (
                  <motion.button key={c.name} type="button" onClick={() => setColor(c.name)} whileHover={{ scale: 1.08 }} whileTap={falconTap} className={`h-10 w-10 rounded-full border-2 ${color === c.name ? 'ring-2 ring-offset-2' : ''}`} style={{ background: c.hex, borderColor: c.hex === '#ffffff' ? '#e5e7eb' : c.hex, boxShadow: color === c.name ? `0 0 0 2px #fff, 0 0 0 4px ${green}` : undefined }} />
                ))}
              </div>
            </div>

            {/* Stock */}
            {!outOfStock && stock <= 20 && (
              <div className="mt-6">
                <p className="text-sm font-semibold text-[#151515]">¡Apúrate! Solo quedan <span style={{ color: green }}>{stock}</span> en stock.</p>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-gray-100"><div className="h-full rounded-full bg-[#e11d48]" style={{ width: `${stockPct}%` }} /></div>
              </div>
            )}

            <div className="mt-6 space-y-2 text-sm">
              <p className="flex items-center gap-2"><span className="font-black text-[#151515]">Disponibilidad:</span> {outOfStock ? <span className="rounded bg-[#e11d48] px-2.5 py-1 text-xs font-bold text-white">Agotado</span> : <span className="rounded px-2.5 py-1 text-xs font-bold text-white" style={{ background: green }}>En stock</span>}</p>
              <p><span className="font-black text-[#151515]">Categorías:</span> <span className="text-gray-500">{categoria}, Inicio</span></p>
              <p><span className="font-black text-[#151515]">Tags:</span> <span className="text-gray-500">{tags.join(' , ')}</span></p>
            </div>

            {/* Actions */}
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <div className="inline-flex items-center rounded-md border border-gray-200">
                <button type="button" onClick={() => setQty(Math.max(1, qty - 1))} className="px-3 py-3 text-gray-500 hover:text-[#151515]"><Icon icon="solar:minus-square-linear" width={20} /></button>
                <span className="min-w-[40px] text-center text-sm font-bold">{qty}</span>
                <button type="button" onClick={() => setQty(qty + 1)} className="px-3 py-3 text-gray-500 hover:text-[#151515]"><Icon icon="solar:add-square-linear" width={20} /></button>
              </div>
              <motion.button type="button" disabled={outOfStock} onClick={() => add()} whileHover={outOfStock ? undefined : { y: -2 }} whileTap={falconTap} className="flex-1 rounded-md border-2 py-3.5 text-sm font-bold transition-colors disabled:cursor-not-allowed disabled:border-gray-200 disabled:text-gray-400" style={outOfStock ? undefined : { borderColor: green, color: green }} onMouseEnter={(e) => { if (!outOfStock) { e.currentTarget.style.background = green; e.currentTarget.style.color = '#fff'; } }} onMouseLeave={(e) => { if (!outOfStock) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = green; } }}>{editable(diseno?.falconProductAddLabel, 'Agregar al carrito')}</motion.button>
              <motion.button type="button" onClick={() => toggleWishlist(producto)} whileHover={{ y: -2 }} whileTap={falconTap} className="flex h-12 w-12 items-center justify-center rounded-md border border-gray-200 text-gray-500 hover:text-[#e11d48]"><Icon icon={wishlistIds.has(producto.id) ? 'solar:heart-bold' : 'solar:heart-linear'} width={22} /></motion.button>
              <motion.button type="button" onClick={() => addCompare(producto)} whileHover={{ y: -2 }} whileTap={falconTap} className="flex h-12 w-12 items-center justify-center rounded-md border border-gray-200 text-gray-500 hover:text-[#151515]"><Icon icon="solar:refresh-square-linear" width={22} /></motion.button>
            </div>
            <motion.button type="button" disabled={outOfStock} onClick={buyNow} whileHover={outOfStock ? undefined : { y: -2 }} whileTap={falconTap} className="mt-3 w-full rounded-md py-3.5 text-sm font-black text-white disabled:cursor-not-allowed disabled:bg-gray-300" style={outOfStock ? undefined : { background: green }}>{editable(diseno?.falconProductBuyLabel, 'Comprar ahora')}</motion.button>

            <div className="mt-6 space-y-3 border-t border-gray-100 pt-6 text-sm text-gray-500">
              <p className="flex items-center gap-3"><Icon icon="solar:delivery-linear" width={20} /> Entrega estimada: <span className="font-bold text-[#151515]">4 a 7 días hábiles</span></p>
              <p className="flex items-center gap-3"><Icon icon="solar:refresh-linear" width={20} /> Devoluciones dentro de <span className="font-bold text-[#151515]">90 días</span>. Impuestos no reembolsables.</p>
            </div>

            <div className="mt-6 flex items-center gap-3 border-t border-gray-100 pt-6">
              <span className="inline-flex items-center gap-2 text-sm font-black text-[#151515]"><Icon icon="solar:share-linear" width={18} /> Compartir:</span>
              {['ri:facebook-fill', 'ri:twitter-x-fill', 'ri:instagram-line', 'ri:tiktok-fill'].map((ic) => (
                <a key={ic} href="#" className="flex h-9 w-9 items-center justify-center rounded-md border border-gray-200 transition-colors" style={{ color: green }} onMouseEnter={(e) => { e.currentTarget.style.background = green; e.currentTarget.style.color = '#fff'; }} onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = green; }}><Icon icon={ic} width={17} /></a>
              ))}
            </div>
          </motion.div>
        </motion.section>

        {/* Tabs */}
        <section className="mx-auto mt-8 max-w-[1400px] px-4 lg:px-6">
          <motion.div initial="hidden" whileInView="show" viewport={{ once: true, margin: '-80px' }} variants={falconFadeUp} className="rounded-2xl bg-white p-8">
            <div className="flex justify-center gap-8 border-b border-gray-200">
              {([['desc', 'Descripción'], ['info', 'Información adicional'], ['reviews', 'Reseñas']] as const).map(([key, label]) => (
                <button key={key} type="button" onClick={() => setActiveTab(key)} className="border-b-2 pb-4 text-sm font-bold transition-colors" style={{ borderColor: activeTab === key ? green : 'transparent', color: activeTab === key ? green : '#6b7280' }}>{label}</button>
              ))}
            </div>
            <div className="pt-8">
              {activeTab === 'desc' && (
                <>
                  <h3 className="text-xl font-black text-[#151515]">Descripción</h3>
                  {descHasHtml
                    ? <div className="falcon-prod-prose mt-4 max-w-full break-words text-sm leading-7 text-gray-500" dangerouslySetInnerHTML={{ __html: normalizeHtml(rawLarga) }} />
                    : <p className="mt-4 whitespace-pre-line break-words text-sm leading-7 text-gray-500">{desc}</p>}
                </>
              )}
              {activeTab === 'info' && (
                <div className="grid gap-3 text-sm sm:grid-cols-2">
                  <p><span className="font-black text-[#151515]">Categoría:</span> <span className="text-gray-500">{categoria}</span></p>
                  <p><span className="font-black text-[#151515]">SKU:</span> <span className="text-gray-500">{producto?.codigo || producto?.sku || '—'}</span></p>
                  <p><span className="font-black text-[#151515]">Disponibilidad:</span> <span className="text-gray-500">{outOfStock ? 'Agotado' : `${stock} unidades`}</span></p>
                  <p><span className="font-black text-[#151515]">Proveedor:</span> <span className="text-gray-500">{producto?.marca?.nombre || producto?.marca || storeName}</span></p>
                </div>
              )}
              {activeTab === 'reviews' && <p className="text-sm text-gray-500">Aún no hay reseñas para este producto. ¡Sé el primero en opinar!</p>}
            </div>
          </motion.div>
        </section>

        {/* Recommended */}
        {related.length > 0 && (
          <section className="mx-auto max-w-[1400px] px-4 py-12 lg:px-6">
            <div className="mb-5 flex items-center justify-between rounded-2xl bg-white px-6 py-4 shadow-sm">
              <h2 className="text-xl font-black text-[#151515]">{editable(diseno?.falconRecommendedTitle, 'Productos recomendados')}</h2>
            </div>
            <motion.div initial="hidden" whileInView="show" viewport={{ once: true, margin: '-80px' }} variants={falconStagger} className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-5">
              {related.slice(0, 5).map((p, i) => (
                <FalconProductCard key={`rel-${p.id || i}`} producto={p} green={green} diseno={diseno} onOpen={() => openProduct(p)} onAdd={() => add(1)} onQuickView={() => setQuickView(p)} onWishlist={() => toggleWishlist(p)} onCompare={() => addCompare(p)} inWishlist={wishlistIds.has(p.id)} />
              ))}
            </motion.div>
          </section>
        )}
      </div>

      <FalconBenefits green={green} diseno={diseno} />
      <FalconFooter tienda={tienda} slug={slug} green={green} categories={categoryNames} diseno={diseno} />

      {/* Sticky add-to-cart bar */}
      <div className={`fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white shadow-[0_-10px_30px_rgba(0,0,0,.08)] transition-transform duration-300 ${showStickyBar ? 'translate-y-0' : 'translate-y-full'}`}>
        <div className="mx-auto flex max-w-[1400px] items-center gap-4 px-4 py-3 lg:px-6">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[#f5f5f7]">{getImg(producto) ? <img src={getImg(producto)} alt="" className="h-full w-full object-contain p-1" /> : <Icon icon="solar:box-bold-duotone" width={24} className="text-gray-300" />}</div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-[#151515]">{name}</p>
            <p className="text-sm"><span className="font-black text-[#151515]">{money(pricing.precioFinal)}</span>{pricing.enOferta && <span className="ml-2 text-gray-400 line-through">{money(pricing.precioRegular)}</span>}</p>
          </div>
          <select value={color} onChange={(e) => setColor(e.target.value)} className="hidden rounded-md border border-gray-200 px-3 py-2 text-sm outline-none sm:block">
            {colors.map((c: { name: string }) => <option key={c.name} value={c.name}>{c.name}</option>)}
          </select>
          <div className="hidden items-center rounded-md border border-gray-200 sm:inline-flex">
            <button type="button" onClick={() => setQty(Math.max(1, qty - 1))} className="px-3 py-2 text-gray-500"><Icon icon="solar:minus-square-linear" width={18} /></button>
            <span className="min-w-[36px] text-center text-sm font-bold">{String(qty).padStart(2, '0')}</span>
            <button type="button" onClick={() => setQty(qty + 1)} className="px-3 py-2 text-gray-500"><Icon icon="solar:add-square-linear" width={18} /></button>
          </div>
          <button type="button" disabled={outOfStock} onClick={() => add()} className="rounded-md px-6 py-3 text-xs font-black uppercase tracking-wide text-white disabled:bg-gray-300 sm:text-sm" style={outOfStock ? undefined : { background: green }}>{editable(diseno?.falconProductAddLabel, 'Agregar al carrito')}</button>
        </div>
      </div>

      <FalconCartDrawer isOpen={mostrarCarrito} onClose={() => setMostrarCarrito(false)} carrito={carrito} actualizarCantidad={actualizarCantidad} onCheckout={() => { setMostrarCarrito(false); go(`/tienda/${slug}/checkout`, 'checkout'); }} onViewCart={() => { setMostrarCarrito(false); goCatalog(); }} green={green} diseno={diseno} tienda={tienda} />
      <FalconWishlistDrawer isOpen={showWishlist} onClose={() => setShowWishlist(false)} items={wishlist} onRemove={(id) => setWishlist((prev) => prev.filter((x) => x.id !== id))} onViewAll={() => { setShowWishlist(false); goCatalog(); }} green={green} />
      <FalconCompareModal isOpen={showCompare} onClose={() => setShowCompare(false)} items={compare} onRemove={(id) => setCompare((prev) => prev.filter((x) => x.id !== id))} onRemoveAll={() => { setCompare([]); setShowCompare(false); }} onAdd={(p) => { addCompare(p); setShowCompare(false); }} green={green} />
      <AnimatePresence>
        {quickView && <FalconQuickView producto={quickView} green={green} onClose={() => setQuickView(null)} onAdd={() => { setQuickView(null); }} onOpen={() => { const p = quickView; setQuickView(null); openProduct(p); }} />}
      </AnimatePresence>
    </div>
  );
}

export default function FalconProductoDetalle() {
  const { slug = '', id = '' } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const previewPlantillaId = searchParams.get('previewPlantilla');
  const previewDiseno = useMemo(() => previewPlantillaId ? {
    __previewPlantillaId: previewPlantillaId,
    __previewQuery: `previewPlantilla=${encodeURIComponent(previewPlantillaId)}&previewOrigen=template`,
  } : undefined, [previewPlantillaId]);
  const [tienda, setTienda] = useState<any>(null);
  const [producto, setProducto] = useState<any>(null);
  const [related, setRelated] = useState<any[]>([]);
  const [allCategories, setAllCategories] = useState<any[]>([]);
  const [carrito, setCarrito] = useState<any[]>([]);
  const [mostrarCarrito, setMostrarCarrito] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    try { const saved = localStorage.getItem(`tienda:${slug}:carrito`); if (saved) setCarrito(JSON.parse(saved)); } catch {}
    return onTiendaCartCleared(slug, () => { setCarrito([]); setMostrarCarrito(false); });
  }, [slug]);

  useEffect(() => {
    if (carrito.length > 0) localStorage.setItem(`tienda:${slug}:carrito`, JSON.stringify(carrito));
  }, [carrito, slug]);

  useEffect(() => {
    if (!slug || !id) return;
    const load = async () => {
      setLoading(true);
      try {
        const [storeRes, catRes, productRes] = await Promise.all([
          axios.get(`${BASE_URL}/public/store/${slug}`),
          axios.get(`${BASE_URL}/public/store/${slug}/categories`),
          axios.get(`${BASE_URL}/public/store/${slug}/products/${id}`),
        ]);
        const store = storeRes.data.data || storeRes.data;
        const product = withPricing(productRes.data.data || productRes.data);
        setTienda(store);
        setAllCategories(Array.isArray(catRes.data?.data) ? catRes.data.data : []);
        setProducto(product);
        const category = product.categoria?.nombre || product.categoria;
        if (category) {
          const relatedRes = await axios.get(`${BASE_URL}/public/store/${slug}/products`, { params: { category, limit: 6 } });
          const arr = Array.isArray(relatedRes.data?.data?.data) ? relatedRes.data.data.data : Array.isArray(relatedRes.data?.data) ? relatedRes.data.data : [];
          setRelated(withPricingList(arr.filter((item: any) => Number(item.id) !== Number(id)).slice(0, 5)));
        }
      } catch {
        navigate(withPreviewQuery(`/tienda/${slug}`, previewDiseno));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [slug, id, navigate, previewDiseno]);

  const actualizarCantidad = (productoId: number | string, cantidad: number) => {
    const exists = carrito.some((item) => item.id === productoId || item.productoId === productoId);
    const next = cantidad <= 0
      ? carrito.filter((item) => item.id !== productoId && item.productoId !== productoId)
      : exists
        ? carrito.map((item) => (item.id === productoId || item.productoId === productoId) ? { ...item, cantidad } : item)
        : (producto ? [...carrito, { ...producto, ...getProductPricing(producto), precioUnitario: getProductPricing(producto).precioFinal, cantidad, id: producto.id, productoId: producto.id }] : carrito);
    setCarrito(next);
    localStorage.setItem(`tienda:${slug}:carrito`, JSON.stringify(next));
  };

  const memoStore = useMemo(() => tienda || {}, [tienda]);

  if (loading) return <div className="flex min-h-screen items-center justify-center bg-white"><Icon icon="solar:refresh-bold" className="h-12 w-12 animate-spin text-gray-300" /></div>;
  if (!producto) return null;

  return (
    <FalconProductoDetalleView
      tienda={memoStore}
      slug={slug}
      producto={producto}
      related={related}
      allCategories={allCategories}
      carrito={carrito}
      setCarrito={setCarrito}
      mostrarCarrito={mostrarCarrito}
      setMostrarCarrito={setMostrarCarrito}
      actualizarCantidad={actualizarCantidad}
    />
  );
}
