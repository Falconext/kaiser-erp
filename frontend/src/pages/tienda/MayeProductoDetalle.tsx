import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Icon } from '@iconify/react';
import axios from 'axios';
import { motion } from 'framer-motion';
import MayeHeader from '@/components/tienda/MayeHeader';
import MayeFooter from '@/components/tienda/MayeFooter';
import MayeCartModal from '@/components/tienda/MayeCartModal';
import ProductCardMaye from '@/components/tienda/ProductCardMaye';
import TiendaFloatingButtons from '@/components/tienda/TiendaFloatingButtons';
import { onTiendaCartCleared } from '@/utils/tiendaCart';
import { buildStorePurchaseWhatsappUrl } from '@/utils/storeWhatsapp';
import { getProductPricing, withPricing, withPricingList } from '@/templates/shared/pricing';
import { mayeCard, mayePage, mayeSection, mayeStagger, mayeTap, mayeViewport } from '@/lib/motion/maye';
import { useFavoritosStore } from '@/zustand/favoritos';

type MayeTab = 'description' | 'specifications' | 'reviews';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4001/api';

const QUILL_PROSE = [
  'text-sm text-gray-600 leading-relaxed overflow-hidden w-full [&_*]:!whitespace-pre-wrap [&_*]:!break-words [&_*]:!max-w-full',
  '[&_h1]:text-2xl [&_h1]:font-black [&_h1]:text-gray-950 [&_h1]:mb-3 [&_h1]:mt-5',
  '[&_h2]:text-xl [&_h2]:font-black [&_h2]:text-gray-950 [&_h2]:mb-2 [&_h2]:mt-4',
  '[&_h3]:text-base [&_h3]:font-bold [&_h3]:text-gray-900 [&_h3]:mb-2 [&_h3]:mt-3',
  '[&_p]:mb-3 [&_p]:leading-relaxed [&_p]:break-words',
  '[&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-3 [&_ul]:space-y-1',
  '[&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:mb-3 [&_ol]:space-y-1',
  '[&_li]:text-gray-600',
  '[&_strong]:font-black [&_strong]:text-gray-950',
  '[&_a]:underline [&_a]:text-blue-600',
  '[&_table]:w-full [&_table]:text-xs [&_table]:border-collapse [&_table]:mb-4',
  '[&_td]:border [&_td]:border-gray-200 [&_td]:px-3 [&_td]:py-2',
  '[&_th]:border [&_th]:border-gray-200 [&_th]:px-3 [&_th]:py-2 [&_th]:bg-gray-50 [&_th]:font-black [&_th]:text-gray-950',
].join(' ');

const openExternal = (url?: string | null) => {
  if (!url) return;
  window.open(url, '_blank', 'noopener,noreferrer');
};

export default function MayeProductoDetalle() {
  const { slug, id } = useParams();
  const navigate = useNavigate();

  const [tienda, setTienda] = useState<any>(null);
  const [carrito, setCarrito] = useState<any[]>([]);
  const [mostrarCarrito, setMostrarCarrito] = useState(false);
  const [allCategories, setAllCategories] = useState<any[]>([]);
  const [producto, setProducto] = useState<any>(null);
  const [related, setRelated] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [qty, setQty] = useState(1);
  const [activeImage, setActiveImage] = useState(0);
  const [activeTab, setActiveTab] = useState<MayeTab>('specifications');
  const [reviews, setReviews] = useState<any[]>([]);
  const [reviewSummary, setReviewSummary] = useState({ ratingAvg: 0, ratingCount: 0 });
  const { toggleFavorito, isFavorito } = useFavoritosStore();

  const diseno = tienda?.diseno || {};
  const cp = diseno?.colorPrimario || '#D92D20';
  const storeDisplayName = tienda?.nombreComercial || tienda?.razonSocial || tienda?.nombre || slug || '';

  useEffect(() => {
    if (!slug) return;

    const loadTienda = async () => {
      try {
        const res = await axios.get(`${BASE_URL}/public/store/${slug}`);
        const data = res.data.data || res.data;
        setTienda(data);

        const catRes = await axios.get(`${BASE_URL}/public/store/${slug}/categories`);
        setAllCategories(Array.isArray(catRes.data?.data) ? catRes.data.data : []);
      } catch (e) {
        console.error(e);
      }
    };

    loadTienda();

    try {
      const saved = localStorage.getItem(`tienda:${slug}:carrito`);
      if (saved) setCarrito(JSON.parse(saved));
    } catch {}
  }, [slug]);

  useEffect(() => {
    if (carrito.length > 0) localStorage.setItem(`tienda:${slug}:carrito`, JSON.stringify(carrito));
  }, [carrito, slug]);

  useEffect(() => {
    if (!slug || !id) return;
    cargarProducto();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, id]);

  useEffect(() => {
    if (!slug) return;
    return onTiendaCartCleared(slug, () => {
      setCarrito([]);
      setMostrarCarrito(false);
    });
  }, [slug]);

  const cargarProducto = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(`${BASE_URL}/public/store/${slug}/products/${id}`);
      const loadedProduct = withPricing(data.data || data);
      setProducto(loadedProduct);
      setReviewSummary({
        ratingAvg: Number(loadedProduct?.ratingAvg || 0),
        ratingCount: Number(loadedProduct?.ratingCount ?? loadedProduct?.reviewsCount ?? 0),
      });

      try {
        const reviewsRes = await axios.get(`${BASE_URL}/public/store/${slug}/products/${loadedProduct.id}/reviews`);
        const payload = reviewsRes.data.data || reviewsRes.data;
        const loadedReviews = Array.isArray(payload?.reviews) ? payload.reviews : [];
        setReviews(loadedReviews);
        setReviewSummary({
          ratingAvg: Number(payload?.ratingAvg || 0),
          ratingCount: Number(payload?.ratingCount || 0),
        });
      } catch {
        setReviews([]);
      }

      const category = loadedProduct?.categoria;
      const categoryName = typeof category === 'object' ? category?.nombre : category;
      if (categoryName) {
        const res = await axios.get(`${BASE_URL}/public/store/${slug}/products`, {
          params: { category: categoryName, limit: 5 },
        });
        const arr = Array.isArray(res.data?.data?.data) ? res.data.data.data : Array.isArray(res.data?.data) ? res.data.data : [];
        setRelated(withPricingList(arr.filter((p: any) => p.id !== Number(id)).slice(0, 4)));
      }
    } catch {
      navigate(`/tienda/${slug}`);
    } finally {
      setLoading(false);
    }
  };

  const agregarAlCarrito = (item: any) => {
    const exist = carrito.find(i => i.productoId === item.productoId || i.id === item.id);
    const nextCart = exist
      ? carrito.map(i => (i.productoId === item.productoId || i.id === item.id) ? { ...i, cantidad: Number(i.cantidad || 1) + Number(item.cantidad || 1) } : i)
      : [...carrito, { ...item, id: item.id || item.productoId, productoId: item.productoId || item.id }];

    setCarrito(nextCart);
    localStorage.setItem(`tienda:${slug}:carrito`, JSON.stringify(nextCart));
  };

  const actualizarCantidad = (productoId: number | string, cantidad: number) => {
    const nextCart = cantidad <= 0
      ? carrito.filter(item => item.id !== productoId)
      : carrito.map(item => item.id === productoId ? { ...item, cantidad } : item);
    setCarrito(nextCart);
    localStorage.setItem(`tienda:${slug}:carrito`, JSON.stringify(nextCart));
  };

  const handleAddToCart = () => {
    if (!producto) return;
    agregarAlCarrito({ ...producto, cantidad: qty });
    setMostrarCarrito(true);
  };

  const images = useMemo(() => {
    const extra = Array.isArray(producto?.imagenesExtra) ? producto.imagenesExtra : [];
    return [producto?.imagenUrl, ...extra].filter(Boolean);
  }, [producto]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#101010]">
        <Icon icon="solar:laptop-minimalistic-bold" className="h-12 w-12 animate-pulse text-white/40" />
      </div>
    );
  }

  if (!producto) return null;

  const categoryName = typeof producto.categoria === 'object' ? producto.categoria?.nombre : producto.categoria;
  const brandName = typeof producto.marca === 'object' ? producto.marca?.nombre : producto.marca;
  const pricing = getProductPricing(producto);
  const priceValue = pricing.precioFinal;
  const comparePrice = pricing.enOferta ? pricing.precioRegular : 0;
  const hasDiscount = pricing.enOferta;
  const discount = pricing.porcentajeDescuento;
  const isOutOfStock = Number(producto.stock ?? 0) <= 0;
  const fichaTecnica = producto?.fichaTecnica;
  // Una sola lista plana con TODO (base + características + ficha técnica), sin secciones sueltas.
  const rawSpecs: { label: string; value: any; pill?: boolean }[] = [
    { label: 'Código', value: producto.codigo || producto.partNumber, pill: true },
    { label: 'Marca', value: brandName },
    { label: 'Categoría', value: categoryName },
    { label: 'Stock', value: `${Number(producto.stock || 0)} unidades` },
    ...(Array.isArray(producto.caracteristicas) ? producto.caracteristicas.map((item: any) => ({ label: item.nombre, value: item.valor })) : []),
    ...(fichaTecnica && Array.isArray(fichaTecnica.destacados) ? fichaTecnica.destacados.map((it: any) => ({ label: it.label, value: it.value })) : []),
    ...(fichaTecnica && Array.isArray(fichaTecnica.grupos)
      ? fichaTecnica.grupos.flatMap((g: any) => Array.isArray(g.items) ? g.items.map((it: any) => ({ label: it.label, value: it.value })) : [])
      : []),
  ];
  const seenSpecs = new Set<string>();
  const specs = rawSpecs.filter(s => {
    if (s.value == null || s.value === '') return false;
    const key = String(s.label || '').trim().toLowerCase();
    if (!key || seenSpecs.has(key)) return false;
    seenSpecs.add(key);
    return true;
  });
  const specPairs: { label: string; value: any; pill?: boolean }[][] = [];
  for (let i = 0; i < specs.length; i += 2) specPairs.push(specs.slice(i, i + 2));
  const whatsappText = `Hola, quiero asesoría sobre ${producto.descripcion}`;
  const whatsappUrl = buildStorePurchaseWhatsappUrl(
    tienda?.whatsappTienda ?? tienda?.diseno?.whatsappTienda ?? diseno?.whatsappTienda,
    whatsappText,
  );
  const googleReviewsUrl = diseno?.googleReviewsUrl
    || diseno?.googleOpinionesUrl
    || (storeDisplayName ? `https://www.google.com/search?q=${encodeURIComponent(`${storeDisplayName} opiniones Google`)}` : '');
  const tiktokProductUrl = diseno?.tiktokLiveUrl || tienda?.tiktokUrl || '';
  const shalomUrl = diseno?.shalomUrl || 'https://www.shalom.pe/agencias';
  const pickupRaw = diseno?.ubicacionUrl || diseno?.ubicacionDireccion || tienda?.direccion || '';
  const pickupUrl = pickupRaw
    ? (String(pickupRaw).startsWith('http') ? pickupRaw : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(pickupRaw)}`)
    : '';
  const techSheetPdfUrl = producto?.fichaTecnicaPdfUrl || producto?.fichaPdfUrl || producto?.manualUrl || '';
  const shortDesc = String(producto.descripcionCorta || producto.subtitulo || producto.resumen || '').trim();

  const ratingAvg = Number(reviewSummary.ratingAvg || producto.ratingAvg || 0);
  const ratingCount = Number(reviewSummary.ratingCount || producto.ratingCount || producto.reviewsCount || 0);
  const checklist: string[] = Array.isArray(producto.caracteristicas)
    ? producto.caracteristicas.map((c: any) => c?.nombre).filter(Boolean).slice(0, 8)
    : [];
  const wished = isFavorito(producto.id, slug || '');
  const toggleWishlist = () => toggleFavorito({
    id: producto.id,
    descripcion: producto.descripcion,
    precioUnitario: priceValue,
    imagenUrl: producto.imagenUrl,
    slug: slug || '',
  });
  const quickActions = [
    googleReviewsUrl && { icon: 'solar:star-bold', label: 'Opiniones en Google', sub: 'Reseñas verificadas', tint: 'bg-indigo-50', fg: 'text-indigo-600', onClick: () => openExternal(googleReviewsUrl) },
    { icon: 'solar:box-bold', label: 'Agencias Shalom', sub: 'Envíos a todo el país', tint: 'bg-amber-50', fg: 'text-amber-600', onClick: () => openExternal(shalomUrl) },
    pickupUrl && { icon: 'solar:map-point-bold', label: 'Local de recojo', sub: 'Ubícanos en el mapa', tint: 'bg-emerald-50', fg: 'text-emerald-600', onClick: () => openExternal(pickupUrl) },
  ].filter(Boolean) as { icon: string; label: string; sub: string; tint: string; fg: string; onClick: () => void }[];

  const renderStars = (size = 16) => {
    const filled = Math.round(ratingAvg);
    return (
      <div className="flex" style={{ color: '#F5B01D' }}>
        {Array.from({ length: 5 }).map((_, i) => (
          <Icon key={i} icon={i < filled ? 'solar:star-bold' : 'solar:star-linear'} width={size} />
        ))}
      </div>
    );
  };

  const tabs: { key: MayeTab; label: string }[] = [
    { key: 'description', label: 'Descripción' },
    { key: 'specifications', label: 'Especificaciones' },
    { key: 'reviews', label: `Reseñas${ratingCount ? ` (${ratingCount})` : ''}` },
  ];

  return (
    <motion.div className="min-h-screen bg-white" style={{ fontFamily: `'${diseno?.tipografia || 'Inter'}', sans-serif` }} variants={mayePage} initial="initial" animate="animate" exit="exit">
      <MayeHeader
        tienda={tienda}
        slug={slug || ''}
        cp={cp}
        carritoSize={carrito.length}
        carritoTotal={carrito.reduce((total, item) => total + Number(item.precioUnitario || 0) * Number(item.cantidad || 1), 0)}
        onOpenCart={() => setMostrarCarrito(!mostrarCarrito)}
        searchQuery={search}
        setSearchQuery={setSearch}
        onSearchSubmit={(e, value) => {
          e.preventDefault();
          if (value?.trim()) navigate(`/tienda/${slug}/catalogo?search=${encodeURIComponent(value.trim())}`);
        }}
        allCategories={allCategories}
        diseno={diseno}
      />

      <motion.main className="w-full max-w-7xl mx-auto px-4 xl:px-8 py-8 md:py-10" variants={mayeStagger}>
        <motion.div className="mb-7 flex flex-wrap items-center gap-2 text-xs font-black uppercase tracking-wider text-gray-400" variants={mayeCard}>
          <button onClick={() => navigate(`/tienda/${slug}`)} className="hover:text-gray-950">Inicio</button>
          <Icon icon="solar:alt-arrow-right-linear" />
          <button onClick={() => navigate(`/tienda/${slug}/catalogo`)} className="hover:text-gray-950">Catálogo</button>
          {categoryName && (
            <>
              <Icon icon="solar:alt-arrow-right-linear" />
              <button onClick={() => navigate(`/tienda/${slug}/catalogo?category=${encodeURIComponent(categoryName)}`)} className="hover:text-gray-950">{categoryName}</button>
            </>
          )}
        </motion.div>

        <motion.section className="grid gap-8 lg:grid-cols-[minmax(0,1.03fr)_minmax(360px,0.97fr)]" variants={mayeSection}>
          <div>
            <div className="relative overflow-hidden rounded-3xl bg-[#F4F5F6] p-5">
              <div className="absolute left-5 top-5 z-10 flex gap-2">
                {hasDiscount && <span className="rounded-md px-2.5 py-1 text-[11px] font-black uppercase tracking-wider text-white" style={{ backgroundColor: cp }}>Ahorra {discount}%</span>}
              </div>
              <div className="aspect-square rounded-2xl flex items-center justify-center">
                {images.length > 0 ? (
                    <motion.img src={images[activeImage] || images[0]} alt={producto.descripcion} className="h-full w-full object-contain mix-blend-multiply" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.28, ease: [0.25, 0.46, 0.45, 0.94] }} />
                ) : (
                  <Icon icon="solar:box-linear" className="h-32 w-32 text-gray-200" />
                )}
              </div>
            </div>

            {images.length > 1 && (
              <div className="mt-4 flex gap-3 overflow-x-auto pb-2">
                {images.map((img: string, i: number) => (
                  <button
                    key={`${img}-${i}`}
                    onClick={() => setActiveImage(i)}
                    className={`h-20 w-20 flex-shrink-0 rounded-2xl border-2 bg-white p-2 transition-colors ${activeImage === i ? 'shadow-sm' : 'border-transparent hover:border-gray-200'}`}
                    style={activeImage === i ? { borderColor: cp } : undefined}
                  >
                    <img src={img} alt="" className="h-full w-full object-contain mix-blend-multiply" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="min-w-0">
            <div className="lg:pl-4">
              <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${isOutOfStock ? 'bg-gray-100 text-gray-500' : 'bg-emerald-50 text-emerald-600'}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${isOutOfStock ? 'bg-gray-400' : 'bg-emerald-500'}`} />
                {isOutOfStock ? 'Sin stock' : 'En stock'}
              </span>

              <h1 className="mt-4 text-3xl font-black leading-[1.1] tracking-tight text-gray-950 md:text-[2.75rem]">{producto.descripcion}</h1>

              <button onClick={() => setActiveTab('reviews')} className="mt-4 flex flex-wrap items-center gap-2">
                {renderStars(18)}
                <span className="text-sm font-bold text-gray-700">{ratingAvg.toFixed(1)}</span>
                <span className="text-sm text-gray-400">({ratingCount || 0} reseñas)</span>
              </button>

              <div className="mt-6 flex flex-wrap items-end gap-3">
                <span className="text-4xl font-black tracking-tight text-gray-950 md:text-[2.75rem]">S/ {priceValue.toFixed(2)}</span>
                {hasDiscount && <span className="mb-1.5 text-xl font-semibold text-gray-400 line-through">S/ {comparePrice.toFixed(2)}</span>}
                {hasDiscount && <span className="mb-2 rounded-md px-2 py-0.5 text-xs font-bold text-white" style={{ backgroundColor: cp }}>-{discount}%</span>}
              </div>

              {shortDesc && (
                <p className="mt-5 border-t border-gray-100 pt-5 text-[15px] leading-relaxed text-gray-500">{shortDesc}</p>
              )}

              <div className="mt-6">
                <p className="mb-3 text-xs font-black uppercase tracking-wider text-gray-400">Cantidad</p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-[156px_minmax(0,1fr)]">
                  <div className="flex min-h-[56px] w-full items-center justify-between rounded-2xl border border-gray-200 bg-white px-1">
                    <button type="button" onClick={() => setQty(Math.max(1, qty - 1))} className="flex h-12 w-12 items-center justify-center rounded-xl text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-950"><Icon icon="solar:minus-linear" /></button>
                    <span className="min-w-12 text-center text-lg font-black text-gray-950">{qty}</span>
                    <button type="button" onClick={() => setQty(qty + 1)} className="flex h-12 w-12 items-center justify-center rounded-xl text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-950"><Icon icon="solar:add-linear" /></button>
                  </div>
                  <button
                    type="button"
                    disabled={isOutOfStock}
                    onClick={handleAddToCart}
                    className="inline-flex min-h-[56px] w-full items-center justify-center gap-2 rounded-2xl px-5 text-[15px] font-black leading-none text-white shadow-lg transition-transform hover:scale-[1.01] disabled:opacity-50 disabled:hover:scale-100"
                    style={{ backgroundColor: isOutOfStock ? '#9CA3AF' : cp, boxShadow: isOutOfStock ? undefined : `0 16px 30px -18px ${cp}` }}
                  >
                    <Icon icon={isOutOfStock ? 'solar:close-circle-bold' : 'solar:cart-large-minimalistic-bold'} width={21} className="shrink-0" />
                    <span className="whitespace-nowrap">{isOutOfStock ? 'Sin stock' : 'Agregar al carrito'}</span>
                  </button>
                </div>
                <button
                  type="button"
                  onClick={toggleWishlist}
                  className={`mt-3 flex min-h-[54px] w-full items-center justify-center gap-2 rounded-2xl border px-4 text-sm font-bold transition-colors ${wished ? '' : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'}`}
                  style={wished ? { borderColor: `${cp}33`, backgroundColor: `${cp}10`, color: cp } : undefined}
                >
                  <Icon icon={wished ? 'solar:heart-bold' : 'solar:heart-linear'} width={20} />
                  {wished ? 'En tu lista de deseos' : 'Agregar a lista de deseos'}
                </button>
              </div>

              <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
                {quickActions.map(a => (
                  <button
                    key={a.label}
                    onClick={a.onClick}
                    className="flex items-start gap-3 rounded-2xl border border-gray-100 bg-gray-50 p-3.5 text-left transition-colors hover:bg-gray-100"
                  >
                    <span className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl ${a.tint}`}>
                      <Icon icon={a.icon} width={20} className={a.fg} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-black leading-tight text-gray-950">{a.label}</p>
                      <p className="mt-0.5 text-[11px] leading-tight text-gray-500">{a.sub}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </motion.section>

        <motion.section id="maye-ficha-tecnica" className="mt-12 scroll-mt-24" variants={mayeSection} initial="initial" whileInView="animate" viewport={mayeViewport}>
          <div className="flex flex-wrap gap-6 border-b border-gray-200">
            {tabs.map(t => (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className={`relative -mb-px pb-3 text-sm font-bold transition-colors ${activeTab === t.key ? '' : 'text-gray-400 hover:text-gray-700'}`}
                style={activeTab === t.key ? { color: cp } : undefined}
              >
                {t.label}
                {activeTab === t.key && <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full" style={{ backgroundColor: cp }} />}
              </button>
            ))}
          </div>

          <div className="mt-8">
            {activeTab === 'description' && (
              <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
                <div>
                  {producto.descripcionLarga ? (
                    <div className={QUILL_PROSE} dangerouslySetInnerHTML={{ __html: producto.descripcionLarga }} />
                  ) : (
                    <p className="text-sm leading-relaxed text-gray-500">Aún no hay descripción extendida para este producto.</p>
                  )}
                  {checklist.length > 0 && (
                    <div className="mt-8 grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2">
                      {checklist.map((feat, i) => (
                        <div key={i} className="flex items-center gap-2.5">
                          <Icon icon="solar:check-circle-bold" width={20} className="flex-shrink-0 text-emerald-500" />
                          <span className="text-sm text-gray-600">{feat}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {specs.length > 0 && (
                  <aside className="h-fit rounded-3xl bg-gray-50 p-6">
                    <h3 className="mb-4 text-lg font-black text-gray-950">Destacados</h3>
                    <div className="divide-y divide-gray-200">
                      {specs.slice(0, 6).map((spec: any) => (
                        <div key={`${spec.label}-${spec.value}`} className="flex items-center justify-between gap-4 py-3">
                          <span className="text-sm text-gray-500">{spec.label}</span>
                          <span className="text-right text-sm font-black text-gray-950">{spec.value}</span>
                        </div>
                      ))}
                    </div>
                  </aside>
                )}
              </div>
            )}

            {activeTab === 'specifications' && (
              specs.length > 0 ? (
                <div className="overflow-hidden rounded-xl border border-gray-200">
                  {specPairs.map((pair, i) => (
                    <div
                      key={i}
                      className={`grid grid-cols-1 md:grid-cols-2 ${i !== specPairs.length - 1 ? 'border-b border-gray-100' : ''} ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/60'}`}
                    >
                      {pair.map((spec, j) => (
                        <div key={`${spec.label}-${j}`} className={`flex items-start gap-4 px-5 py-3 ${j === 0 ? 'md:border-r md:border-gray-100' : ''}`}>
                          <span className="w-[34%] flex-shrink-0 text-[11px] font-medium uppercase tracking-wide text-gray-500">{spec.label}</span>
                          {spec.pill ? (
                            <span className="w-fit rounded-md bg-gray-900 px-2.5 py-0.5 text-[11px] font-bold tracking-wide text-white">{spec.value}</span>
                          ) : (
                            <span className="flex-1 text-[13px] leading-snug text-gray-800">{spec.value}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="rounded-xl border border-gray-200 px-6 py-6 text-sm text-gray-500">No hay especificaciones registradas.</p>
              )
            )}

            {activeTab === 'reviews' && (
              <div className="grid gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
                <div className="h-fit rounded-3xl bg-gray-50 p-8 text-center">
                  <p className="text-5xl font-black text-gray-950">{ratingCount > 0 ? ratingAvg.toFixed(1) : '0.0'}</p>
                  <div className="mt-2 flex justify-center">{renderStars(18)}</div>
                  <p className="mt-1 text-xs text-gray-500">{ratingCount || 0} reseñas aprobadas</p>
                  {googleReviewsUrl && (
                    <button onClick={() => openExternal(googleReviewsUrl)} className="mt-5 inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-black text-white" style={{ backgroundColor: cp }}>
                      <Icon icon="solar:star-bold" width={16} /> Opiniones en Google
                    </button>
                  )}
                </div>

                <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
                  <div className="mb-5">
                    <h3 className="text-lg font-black text-gray-950">Opiniones de clientes</h3>
                    <p className="mt-1 text-sm text-gray-500">Comentarios aprobados por la tienda.</p>
                  </div>

                  {reviews.length === 0 ? (
                    <div className="rounded-2xl bg-gray-50 p-6 text-center text-sm text-gray-500">
                      Aún no hay comentarios publicados para este producto.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {reviews.map((review) => (
                        <article key={review.id} className="rounded-2xl border border-gray-100 p-4">
                          <div className="mb-2 flex items-start justify-between gap-3">
                            <div>
                              <p className="font-bold text-gray-900">{review.clienteNombre}</p>
                              <div className="mt-1 flex items-center gap-2">
                                <div className="flex" style={{ color: '#F5B01D' }}>
                                  {Array.from({ length: 5 }).map((_, index) => (
                                    <Icon key={index} icon={index < Number(review.rating || 0) ? 'solar:star-bold' : 'solar:star-linear'} width={14} />
                                  ))}
                                </div>
                                {review.compraVerificada && (
                                  <span className="rounded-full px-2 py-0.5 text-[11px] font-bold" style={{ backgroundColor: `${cp}12`, color: cp }}>
                                    Compra verificada
                                  </span>
                                )}
                              </div>
                            </div>
                            {review.creadoEn && (
                              <span className="text-xs text-gray-400">
                                {new Date(review.creadoEn).toLocaleDateString('es-PE')}
                              </span>
                            )}
                          </div>
                          <p className="text-sm leading-6 text-gray-600">{review.comentario}</p>
                        </article>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </motion.section>

        {related.length > 0 && (
          <motion.section className="mt-14" variants={mayeSection} initial="initial" whileInView="animate" viewport={mayeViewport}>
            <div className="mb-7 flex items-end justify-between gap-4">
              <div>
                <div className="mb-1.5 flex items-center gap-2">
                  <div className="flex gap-[3px]">
                    <span className="h-0.5 w-4 -skew-x-[30deg]" style={{ backgroundColor: cp }} />
                    <span className="h-0.5 w-4 -skew-x-[30deg]" style={{ backgroundColor: cp }} />
                  </div>
                  <span className="text-sm font-bold" style={{ color: cp }}>También recomendado</span>
                </div>
                <h2 className="text-3xl font-black tracking-tight text-gray-950">Completa tu setup</h2>
              </div>
              <motion.button onClick={() => navigate(`/tienda/${slug}/catalogo`)} className="hidden rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-black text-gray-700 hover:bg-gray-50 md:inline-flex" whileHover={{ y: -2, scale: 1.03 }} whileTap={mayeTap}>
                Ver catálogo
              </motion.button>
            </div>
            <motion.div className="grid grid-cols-2 gap-4 md:gap-6 lg:grid-cols-4" variants={mayeStagger}>
              {related.map((p: any) => (
                <ProductCardMaye
                  key={p.id}
                  producto={p}
                  slug={slug || ''}
                  diseno={diseno}
                  onAddToCart={() => agregarAlCarrito({ ...p, cantidad: 1 })}
                  onClick={() => navigate(`/tienda/${slug}/producto/${p.id}`)}
                />
              ))}
            </motion.div>
          </motion.section>
        )}
      </motion.main>

      <MayeFooter tienda={tienda} slug={slug || ''} diseno={diseno} />
      <TiendaFloatingButtons tienda={tienda} diseno={diseno} />

      <MayeCartModal
        isOpen={mostrarCarrito}
        onClose={() => setMostrarCarrito(false)}
        carrito={carrito}
        setCarrito={setCarrito}
        actualizarCantidad={actualizarCantidad}
        onCheckout={() => navigate(`/tienda/${slug}/checkout`)}
        cp={cp}
        tienda={tienda}
      />
    </motion.div>
  );
}
