import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '@iconify/react';
import { AnimatePresence, motion } from 'framer-motion';
import type { TemplateHomePageProps } from '@/templates/shared/types';
import { getProductPricing } from '@/templates/shared/pricing';
import { getStoreLinkAction, runStoreLinkAction } from '@/components/tienda/storeLinkActions';
import {
  GREEN, resolveFalconGreen, getName, editable, money, getImg, catOf, storeNameOf, getFalconBlogPosts, FALCON_DEFAULT_IMAGES,
  withPreviewQuery, getPreviewQuery,
  FalconHeader, FalconFooter, FalconBenefits, FalconTabs, FalconProductCard,
  FalconCartDrawer, FalconWishlistDrawer, FalconCompareModal, FalconQuickView,
  falconFadeUp, falconHoverLift, falconScaleIn, falconStagger, falconTap,
} from './FalconShared';

export default function FalconHomePage({
  tienda,
  slug,
  productos,
  allCategories,
  cp,
  diseno,
  carrito,
  mostrarCarrito,
  setMostrarCarrito,
  agregarAlCarrito,
  actualizarCantidad,
  loading,
}: TemplateHomePageProps) {
  const navigate = useNavigate();
  const [quickView, setQuickView] = useState<any | null>(null);
  const [wishlist, setWishlist] = useState<any[]>([]);
  const [showWishlist, setShowWishlist] = useState(false);
  const [compare, setCompare] = useState<any[]>([]);
  const [showCompare, setShowCompare] = useState(false);
  const wishlistIds = useMemo(() => new Set(wishlist.map((w) => w.id)), [wishlist]);
  const toggleWishlist = (p: any) => {
    setWishlist((prev) => (prev.some((x) => x.id === p.id) ? prev.filter((x) => x.id !== p.id) : [...prev, p]));
    setShowWishlist(true);
  };
  const addCompare = (p: any) => {
    setCompare((prev) => (prev.some((x) => x.id === p.id) ? prev : [...prev, p].slice(-4)));
    setShowCompare(true);
  };
  const green = resolveFalconGreen(diseno, cp);
  const storeName = storeNameOf(tienda);
  const cartCount = carrito.reduce((s: number, i: any) => s + Number(i?.cantidad || 1), 0);
  const cartTotal = carrito.reduce((s: number, i: any) => s + Number(i?.precioUnitario || 0) * Number(i?.cantidad || 1), 0);
  const irACheckout = () => navigate(withPreviewQuery(`/tienda/${slug}/checkout`, diseno), { state: { carrito, tienda } });
  const goCatalog = (extra = '') => navigate(withPreviewQuery(`/tienda/${slug}/catalogo${extra}`, diseno));
  const goBlog = (id?: string) => navigate(withPreviewQuery(`/tienda/${slug}/blog${id ? `/${id}` : ''}`, diseno));
  const openProduct = (p: any) => navigate(withPreviewQuery(`/tienda/${slug}/producto/${p.id}`, diseno));
  const runAction = (key: string) => runStoreLinkAction(getStoreLinkAction(diseno, key, { defaultType: 'catalog' }), { slug, navigate, previewQuery: getPreviewQuery(diseno) });

  const categoryCircles = useMemo(() => {
    return allCategories
      .map((c) => {
        const name = getName(c);
        const inCat = productos.filter((p) => catOf(p).toLowerCase() === name.toLowerCase());
        const img = (typeof c === 'object' && c?.imagenUrl) || getImg(inCat[0]) || '';
        return { name, img, count: inCat.length };
      })
      .filter((c) => c.name)
      .slice(0, 8);
  }, [allCategories, productos]);
  const categoryNames = useMemo(() => categoryCircles.map((c) => c.name), [categoryCircles]);

  const filterTabs = useMemo(() => ['Todos', ...categoryCircles.map((c) => c.name).slice(0, 4)], [categoryCircles]);
  const [featureTab, setFeatureTab] = useState('Todos');
  const [popularTab, setPopularTab] = useState('Todos');
  const filterBy = (tab: string, list: any[]) =>
    tab === 'Todos' ? list : list.filter((p) => catOf(p).toLowerCase().includes(tab.toLowerCase()));
  const pickProducts = (custom: any, fallback: any[]) => (Array.isArray(custom) && custom.length ? custom : fallback);
  const featureProducts = useMemo(() => pickProducts(diseno?.falconFeaturedProducts, filterBy(featureTab, productos).slice(0, 6)), [featureTab, productos, diseno?.falconFeaturedProducts]);
  const popularProducts = useMemo(() => pickProducts(diseno?.falconPopularProducts, filterBy(popularTab, [...productos].reverse()).slice(0, 5)), [popularTab, productos, diseno?.falconPopularProducts]);
  const recommended = useMemo(() => pickProducts(diseno?.falconRecommendedProducts, [...productos].slice(2, 7)), [productos, diseno?.falconRecommendedProducts]);

  const heroBanner = diseno?.falconHeroBannerUrl || diseno?.falconHeroImageUrl || FALCON_DEFAULT_IMAGES.hero;
  const heroImg = heroBanner;
  const sideOneBanner = diseno?.falconSideOneBannerUrl || diseno?.falconSideOneImageUrl || FALCON_DEFAULT_IMAGES.sideOne;
  const sideTwoBanner = diseno?.falconSideTwoBannerUrl || diseno?.falconSideTwoImageUrl || FALCON_DEFAULT_IMAGES.sideTwo;
  const sideOneImg = sideOneBanner;
  const sideTwoImg = sideTwoBanner;
  const specialProduct = productos[productos.length - 1];
  const specialBanner = diseno?.falconSpecialBannerUrl || diseno?.falconSpecialImageUrl || FALCON_DEFAULT_IMAGES.special;
  const specialImg = specialBanner;
  const specialName = editable(diseno?.falconSpecialTitle, specialProduct?.descripcion || specialProduct?.nombre || 'Aero Control Pro');
  const specialPrice = money(getProductPricing(specialProduct || {}).precioFinal);
  const bannerPromo = diseno?.falconBannerImageUrl || diseno?.falconPromoImageUrl || FALCON_DEFAULT_IMAGES.promo;
  const promoImg = bannerPromo;
  const countdownBanner = diseno?.falconCountdownBannerUrl || diseno?.falconCountdownImageUrl || FALCON_DEFAULT_IMAGES.countdown;

  const brands = useMemo<string[]>(
    () => {
      const raw = diseno?.falconBrands;
      const list = Array.isArray(raw)
        ? raw
        : String(raw || '').split(',').map((b) => b.trim()).filter(Boolean);
      return list.length ? list : ['Infinix', 'OPPO', 'VIVO', 'SAMSUNG', 'ONEPLUS'];
    },
    [diseno],
  );

  const blogPosts = useMemo(() => getFalconBlogPosts(diseno).slice(0, 4), [diseno]);

  const offerEnd = useMemo(() => {
    const raw = diseno?.falconOfferEnd ? new Date(diseno.falconOfferEnd) : null;
    return raw && !Number.isNaN(raw.getTime()) ? raw : new Date(Date.now() + 178 * 86400000 + 8 * 3600000);
  }, [diseno]);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const remaining = Math.max(0, Math.floor((offerEnd.getTime() - now) / 1000));
  const countdown: [string, string][] = [
    [String(Math.floor(remaining / 86400)).padStart(2, '0'), editable(diseno?.falconCountdownDaysLabel, 'Días')],
    [String(Math.floor((remaining % 86400) / 3600)).padStart(2, '0'), editable(diseno?.falconCountdownHoursLabel, 'Hrs')],
    [String(Math.floor((remaining % 3600) / 60)).padStart(2, '0'), editable(diseno?.falconCountdownMinutesLabel, 'Min')],
    [String(remaining % 60).padStart(2, '0'), editable(diseno?.falconCountdownSecondsLabel, 'Seg')],
  ];

  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: `'${diseno?.tipografia || 'Inter'}', sans-serif` }}>
      <FalconHeader tienda={tienda} slug={slug} green={green} cartCount={cartCount} cartTotal={cartTotal} onOpenCart={() => setMostrarCarrito(true)} diseno={diseno} categories={allCategories} products={productos} />

      {/* White zone: hero + category circles */}
      <div className="mx-auto max-w-[1400px] px-4 py-6 lg:px-6">
        {/* Hero */}
        <motion.section initial="hidden" animate="show" variants={falconStagger} className="grid gap-5 lg:grid-cols-[1.9fr_1fr]">
          <motion.div variants={falconScaleIn} className="relative flex min-h-[340px] overflow-hidden rounded-2xl p-8 md:min-h-[460px] md:p-12" style={{ background: 'linear-gradient(120deg, #7a0f2b 0%, #5a1140 45%, #3d1a63 100%)' }}>
            <div className="relative z-10 flex max-w-[58%] flex-col justify-center text-white md:max-w-[52%]">
              <p className="text-sm font-black uppercase tracking-[0.2em] text-[#ffc94d]">{editable(diseno?.falconHeroEyebrow, 'Nuevos ingresos')}</p>
              <h1 className="mt-4 text-3xl font-black leading-[1.04] sm:text-4xl md:text-6xl">
                <span className="text-[#ffc94d]">{editable(diseno?.falconHeroHighlight, '4K')}</span> {editable(diseno?.falconHeroTitleTop, 'LCD')}
                <br />{editable(diseno?.falconHeroTitle, 'Quantum Vision LCD')}
              </h1>
              <p className="mt-5 text-sm font-semibold text-white/80 md:text-base">{editable(diseno?.falconHeroSubtitle, 'Tiempo limitado: solo en línea.')}</p>
              <button type="button" onClick={() => runAction('falconHeroAction')} className="mt-8 w-fit whitespace-nowrap rounded-md bg-white px-6 py-3.5 text-sm font-black text-[#151515] shadow-xl transition-transform hover:scale-[1.03] sm:px-8">{editable(diseno?.falconHeroButton, 'Comprar ahora')}</button>
            </div>
            {heroImg && (
              heroBanner
                ? <div className="pointer-events-none absolute inset-0"><img src={heroImg} alt="" className="h-full w-full object-cover" /><div className="absolute inset-0" style={{ background: 'linear-gradient(90deg, rgba(90,17,64,0.94) 0%, rgba(90,17,64,0.6) 34%, rgba(90,17,64,0.15) 62%, transparent 82%)' }} /></div>
                : <div className="pointer-events-none absolute inset-y-0 right-0 flex w-[40%] items-center justify-center p-3 md:w-[52%] md:p-6"><img src={heroImg} alt="" className="max-h-full max-w-full object-contain drop-shadow-2xl" /></div>
            )}
            <div className="absolute bottom-5 left-1/2 flex -translate-x-1/2 gap-2"><span className="h-1.5 w-8 rounded-full bg-white" /><span className="h-1.5 w-8 rounded-full bg-white/40" /><span className="h-1.5 w-8 rounded-full bg-white/40" /></div>
          </motion.div>

          <div className="grid grid-rows-2 gap-5">
            {[
              { img: sideOneImg, banner: !!sideOneBanner, eyebrow: editable(diseno?.falconSideOneEyebrow, 'Móviles'), title: editable(diseno?.falconSideOneTitle, 'Nexus Mobile Pro 256GB') },
              { img: sideTwoImg, banner: !!sideTwoBanner, eyebrow: editable(diseno?.falconSideTwoEyebrow, 'iPad Mini'), title: editable(diseno?.falconSideTwoTitle, '10 Inch iPad Mini Pro') },
            ].map((b, i) => (
              <motion.button key={i} type="button" onClick={() => runAction(i === 0 ? 'falconSideOneAction' : 'falconSideTwoAction')} variants={falconFadeUp} whileHover={falconHoverLift} whileTap={falconTap} className="relative flex min-h-[210px] overflow-hidden rounded-2xl p-7 text-left" style={{ background: 'linear-gradient(120deg, #6e1226 0%, #4a0f1e 100%)' }}>
                <div className="relative z-10 flex max-w-[58%] flex-col justify-center text-white">
                  <p className="text-lg font-black">{b.eyebrow}</p>
                  <h3 className="mt-1 text-xl font-black leading-tight">{b.title}</h3>
                  <p className="mt-4 text-xs font-semibold text-white/70">{editable(diseno?.falconSideNote, 'Tiempo limitado: solo en línea.')}</p>
                </div>
                {b.img && (
                  b.banner
                    ? <div className="pointer-events-none absolute inset-0"><img src={b.img} alt="" className="h-full w-full object-cover" /><div className="absolute inset-0" style={{ background: 'linear-gradient(90deg, rgba(110,18,38,0.94) 0%, rgba(110,18,38,0.6) 40%, rgba(110,18,38,0.15) 68%, transparent 88%)' }} /></div>
                    : <div className="pointer-events-none absolute inset-y-0 right-0 flex w-[46%] items-center justify-center p-4"><img src={b.img} alt="" className="max-h-full max-w-full object-contain drop-shadow-xl" /></div>
                )}
              </motion.button>
            ))}
          </div>
        </motion.section>

        {/* Category circles */}
        {categoryCircles.length > 0 && (
          <section className="py-10">
            <motion.div initial="hidden" whileInView="show" viewport={{ once: true, margin: '-80px' }} variants={falconStagger} className="grid grid-cols-3 gap-y-8 sm:grid-cols-4 lg:grid-cols-8">
              {categoryCircles.map((c) => (
                <motion.button key={c.name} type="button" onClick={() => goCatalog(`?category=${encodeURIComponent(c.name)}`)} variants={falconFadeUp} whileHover={{ y: -4 }} whileTap={falconTap} className="group flex flex-col items-center gap-3">
                  <span className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full bg-[#eeeeee] transition-transform group-hover:scale-105">
                    {c.img ? <img src={c.img} alt={c.name} className="h-full w-full object-cover" loading="lazy" /> : <Icon icon="solar:box-bold-duotone" width={40} className="text-gray-400" />}
                  </span>
                  <span className="text-center">
                    <span className="block text-sm font-bold text-[#151515]">{c.name}</span>
                    <span className="block text-xs font-semibold text-gray-400">{c.count >= 10 ? '10 + items' : c.count > 0 ? `${c.count} items` : '+ items'}</span>
                  </span>
                </motion.button>
              ))}
            </motion.div>
          </section>
        )}
      </div>

      {/* Gray zone: products + promo */}
      <div className="bg-[#ececec]">
        <main className="mx-auto max-w-[1400px] px-4 py-12 lg:px-6">
          {/* Feature products + special offer */}
          <section className="pb-12">
            <motion.div initial="hidden" whileInView="show" viewport={{ once: true, margin: '-80px' }} variants={falconStagger} className="grid gap-6 lg:grid-cols-[320px_1fr]">
              <motion.div variants={falconScaleIn} className="relative flex min-h-[520px] flex-col items-center overflow-hidden rounded-2xl p-8 text-center text-white" style={{ background: 'radial-gradient(circle at 50% 38%, #0f7a3d 0%, #06341c 62%, #041f11 100%)' }}>
                {specialBanner && (
                  <>
                    <img src={specialImg} alt={specialName} className="pointer-events-none absolute inset-0 h-full w-full object-cover" />
                    <div className="pointer-events-none absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(4,31,17,0.72) 0%, rgba(4,31,17,0.15) 32%, rgba(4,31,17,0.25) 62%, rgba(4,31,17,0.92) 100%)' }} />
                  </>
                )}
                <p className="relative z-10 text-2xl font-black drop-shadow">{editable(diseno?.falconSpecialEyebrow, 'Oferta especial')}</p>
                {!specialBanner && <div className="flex flex-1 items-center justify-center py-6">{specialImg ? <img src={specialImg} alt={specialName} className="max-h-[280px] max-w-full object-contain drop-shadow-2xl" /> : <Icon icon="solar:gamepad-bold" width={120} className="text-white/80" />}</div>}
                {specialBanner && <div className="flex-1" />}
                <div className="relative z-10"><p className="text-xl font-bold leading-tight drop-shadow">{specialName}</p><p className="mt-2 text-2xl font-black drop-shadow" style={{ color: '#ffc94d' }}>{specialPrice}</p></div>
              </motion.div>
              <div>
                <div className="mb-5 flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-white px-6 py-4 shadow-sm">
                  <h2 className="text-xl font-black text-[#151515]">{editable(diseno?.falconFeatureTitle, 'Productos destacados')}</h2>
                  <FalconTabs tabs={filterTabs} active={featureTab} onChange={setFeatureTab} green={green} />
                </div>
                {loading ? (
                  <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-[440px] animate-pulse rounded-2xl bg-gray-100" />)}</div>
                ) : (
                  <motion.div initial="hidden" animate="show" variants={falconStagger} className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                    {featureProducts.slice(0, 3).map((p, i) => (
                      <FalconProductCard key={`f-${p.id || p.descripcion}-${i}`} producto={p} green={green} diseno={diseno} onOpen={() => openProduct(p)} onAdd={() => agregarAlCarrito(p)} onQuickView={() => setQuickView(p)} onWishlist={() => toggleWishlist(p)} onCompare={() => addCompare(p)} inWishlist={wishlistIds.has(p.id)} />
                    ))}
                  </motion.div>
                )}
              </div>
            </motion.div>
          </section>

          {/* Popular products */}
          <section className="pb-12">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-white px-6 py-4 shadow-sm">
              <h2 className="text-xl font-black text-[#151515]">{editable(diseno?.falconPopularTitle, 'Productos populares')}</h2>
              <FalconTabs tabs={filterTabs} active={popularTab} onChange={setPopularTab} green={green} />
            </div>
            {loading ? (
              <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-5">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-[440px] animate-pulse rounded-2xl bg-gray-100" />)}</div>
            ) : (
              <motion.div initial="hidden" animate="show" variants={{ show: { transition: { staggerChildren: 0.05 } } }} className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-5">
                {popularProducts.map((p, i) => (
                  <motion.div key={`p-${p.id || p.descripcion}-${i}`} variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }}>
                    <FalconProductCard producto={p} green={green} diseno={diseno} onOpen={() => openProduct(p)} onAdd={() => agregarAlCarrito(p)} onQuickView={() => setQuickView(p)} onWishlist={() => toggleWishlist(p)} onCompare={() => addCompare(p)} inWishlist={wishlistIds.has(p.id)} />
                  </motion.div>
                ))}
              </motion.div>
            )}
          </section>

          {/* Big savings banner */}
          <section className="pb-12">
            <motion.div initial="hidden" whileInView="show" viewport={{ once: true, margin: '-80px' }} variants={falconScaleIn} className="relative overflow-hidden rounded-2xl" style={{ background: 'linear-gradient(90deg, #0f7a3d 0%, #0c5e30 100%)' }}>
              {bannerPromo && (
                <>
                  <img src={bannerPromo} alt="" className="pointer-events-none absolute inset-0 h-full w-full object-cover" />
                  <div className="pointer-events-none absolute inset-0" style={{ background: 'linear-gradient(90deg, rgba(12,94,48,0.94) 0%, rgba(12,94,48,0.6) 38%, rgba(12,94,48,0.15) 66%, transparent 88%)' }} />
                </>
              )}
              <div className="relative z-10 grid items-center gap-6 px-8 py-10 md:grid-cols-[1.1fr_.9fr] md:px-12">
                <div className="text-white">
                  <h3 className="text-3xl font-black leading-tight drop-shadow md:text-4xl">{editable(diseno?.falconBannerTitle, '¡Grandes ahorros te esperan!')}</h3>
                  <p className="mt-2 text-3xl font-black leading-tight drop-shadow md:text-4xl"><span style={{ color: '#ffc94d' }}>{editable(diseno?.falconBannerHighlight, 'Compra ya')}</span> {editable(diseno?.falconBannerSubtitle, 'ofertas imperdibles')}</p>
                  <button type="button" onClick={() => runAction('falconBannerAction')} className="mt-6 rounded-md bg-white px-8 py-3 text-sm font-black text-[#0f7a3d] shadow-lg transition-transform hover:scale-[1.03]">{editable(diseno?.falconBannerButton, 'Comprar ahora')}</button>
                </div>
                {!bannerPromo && (
                  <div className="flex items-center justify-end gap-6">
                    {promoImg && <img src={promoImg} alt="" className="max-h-[180px] object-contain drop-shadow-2xl" />}
                    <div className="text-right leading-none text-white"><p className="text-lg font-black">HASTA</p><p className="text-5xl font-black md:text-6xl" style={{ color: '#ffc94d' }}>50%</p><span className="mt-1 inline-block rounded bg-[#e11d48] px-3 py-1 text-xs font-black">FLASH SALE</span></div>
                  </div>
                )}
              </div>
            </motion.div>
          </section>

          {/* Recommended products */}
          <section className="pb-4">
            <div className="mb-5 flex items-center justify-between rounded-2xl bg-white px-6 py-4 shadow-sm">
              <h2 className="text-xl font-black text-[#151515]">{editable(diseno?.falconRecommendedTitle, 'Productos recomendados')}</h2>
              <button type="button" onClick={() => goCatalog()} className="inline-flex items-center gap-2 text-sm font-bold text-[#151515] hover:opacity-70">{editable(diseno?.falconBlogViewAllLabel, 'Ver todo')} <Icon icon="solar:arrow-right-linear" width={18} /></button>
            </div>
            <motion.div initial="hidden" whileInView="show" viewport={{ once: true, margin: '-80px' }} variants={falconStagger} className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-5">
              {recommended.map((p, i) => (
                <FalconProductCard key={`r-${p.id || p.descripcion}-${i}`} producto={p} green={green} diseno={diseno} onOpen={() => openProduct(p)} onAdd={() => agregarAlCarrito(p)} onQuickView={() => setQuickView(p)} onWishlist={() => toggleWishlist(p)} onCompare={() => addCompare(p)} inWishlist={wishlistIds.has(p.id)} />
              ))}
            </motion.div>
          </section>
        </main>
      </div>

      {/* Brand logos */}
      <div className="bg-white">
        <div className="mx-auto max-w-[1400px] px-4 py-12 lg:px-6">
          <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-5">
            {brands.map((b) => <div key={b} className="flex h-24 items-center justify-center rounded-xl border border-gray-200 text-xl font-black uppercase tracking-wide text-gray-400 transition-colors hover:text-gray-600">{b}</div>)}
          </div>
        </div>
      </div>

      {/* Latest blogs */}
      <div className="bg-[#ececec]">
        <div className="mx-auto max-w-[1400px] px-4 py-12 lg:px-6">
          <div className="mb-6 flex items-center justify-between rounded-2xl bg-white px-6 py-4 shadow-sm">
            <h2 className="text-xl font-black text-[#151515]">{editable(diseno?.falconBlogTitle, 'Últimos artículos')}</h2>
            <button type="button" onClick={() => goBlog()} className="inline-flex items-center gap-2 text-sm font-bold text-[#151515] hover:opacity-70">{editable(diseno?.falconBlogViewAllLabel, 'Ver todo')} <Icon icon="solar:arrow-right-linear" width={18} /></button>
          </div>
          <motion.div initial="hidden" whileInView="show" viewport={{ once: true, margin: '-80px' }} variants={falconStagger} className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {blogPosts.map((post: any, i: number) => (
              <motion.article key={i} variants={falconFadeUp} whileHover={falconHoverLift} whileTap={falconTap} onClick={() => goBlog(post.id || String(i + 1))} className="flex cursor-pointer flex-col overflow-hidden rounded-2xl bg-white shadow-sm transition-shadow hover:shadow-md">
                <div className="h-48 overflow-hidden bg-gray-100">{post.image && <img src={post.image} alt={post.title} className="h-full w-full object-cover transition-transform duration-500 hover:scale-105" loading="lazy" />}</div>
                <div className="flex flex-1 flex-col p-5">
                  <p className="inline-flex items-center gap-2 text-xs font-bold text-gray-500"><Icon icon="solar:calendar-linear" width={16} style={{ color: green }} /> {post.date}</p>
                  <h3 className="mt-3 line-clamp-2 text-base font-black text-[#151515]">{post.title}</h3>
                  <p className="mt-2 line-clamp-3 text-sm text-gray-400">{post.excerpt}</p>
                  <span className="mt-4 inline-flex items-center gap-2 self-start text-sm font-bold" style={{ color: green }}>{editable(diseno?.falconBlogReadMoreLabel, 'Leer más')} <Icon icon="solar:arrow-right-linear" width={16} /></span>
                </div>
              </motion.article>
            ))}
          </motion.div>
        </div>
      </div>

      {/* Countdown banner */}
      <div className="bg-white">
        <div className="mx-auto max-w-[1400px] px-4 py-12 lg:px-6">
          <motion.div initial="hidden" whileInView="show" viewport={{ once: true, margin: '-80px' }} variants={falconScaleIn} className={`relative flex flex-col items-start gap-6 overflow-hidden rounded-2xl px-8 py-10 md:px-12 ${countdownBanner ? 'min-h-[320px] justify-center md:min-h-[380px]' : ''}`} style={{ background: 'linear-gradient(90deg, #0f7a3d 0%, #0c5e30 100%)' }}>
            {countdownBanner && (
              <>
                <img src={countdownBanner} alt="" className="pointer-events-none absolute inset-0 h-full w-full object-cover" />
                <div className="pointer-events-none absolute inset-0" style={{ background: 'linear-gradient(90deg, rgba(12,94,48,0.94) 0%, rgba(12,94,48,0.62) 42%, rgba(12,94,48,0.2) 70%, transparent 92%)' }} />
              </>
            )}
            {!countdownBanner && (diseno?.falconCountdownImageUrl || getImg(productos[3])) && <img src={diseno?.falconCountdownImageUrl || getImg(productos[3])} alt="" className="pointer-events-none absolute right-8 top-1/2 hidden max-h-[220px] -translate-y-1/2 object-contain drop-shadow-2xl lg:block" />}
            <div className="relative z-10 text-white">
              <h3 className="text-3xl font-black drop-shadow md:text-4xl"><span style={{ color: '#ffc94d' }}>{editable(diseno?.falconCountdownIntro, '¡Apúrate!')}</span> {editable(diseno?.falconCountdownTitle, 'La oferta termina en')}</h3>
              <div className="mt-6 flex flex-wrap gap-3">
                {countdown.map(([value, label]) => <motion.div key={label} whileHover={{ y: -3 }} className="flex h-[92px] w-[84px] flex-col items-center justify-center rounded-lg bg-white shadow-lg"><span className="text-3xl font-black text-[#151515]">{value}</span><span className="mt-1 text-xs font-bold text-gray-400">{label}</span></motion.div>)}
              </div>
              <button type="button" onClick={() => runAction('falconCountdownAction')} className="mt-6 rounded-md bg-[#151515] px-8 py-3 text-sm font-black text-white shadow-lg transition-transform hover:scale-[1.03]">{editable(diseno?.falconCountdownButton, 'Comprar ahora')}</button>
            </div>
          </motion.div>
        </div>
      </div>

      <FalconBenefits green={green} diseno={diseno} />
      <FalconFooter tienda={tienda} slug={slug} green={green} categories={categoryNames} diseno={diseno} />

      <FalconCartDrawer isOpen={mostrarCarrito} onClose={() => setMostrarCarrito(false)} carrito={carrito} actualizarCantidad={actualizarCantidad} onCheckout={() => { setMostrarCarrito(false); irACheckout(); }} onViewCart={() => { setMostrarCarrito(false); goCatalog(); }} green={green} diseno={diseno} tienda={tienda} />
      <FalconWishlistDrawer isOpen={showWishlist} onClose={() => setShowWishlist(false)} items={wishlist} onRemove={(id) => setWishlist((prev) => prev.filter((x) => x.id !== id))} onViewAll={() => { setShowWishlist(false); goCatalog(); }} green={green} />
      <FalconCompareModal isOpen={showCompare} onClose={() => setShowCompare(false)} items={compare} onRemove={(id) => setCompare((prev) => prev.filter((x) => x.id !== id))} onRemoveAll={() => { setCompare([]); setShowCompare(false); }} onAdd={(p) => { agregarAlCarrito(p); setShowCompare(false); setMostrarCarrito(true); }} green={green} />

      <AnimatePresence>
        {quickView && (
          <FalconQuickView producto={quickView} green={green} onClose={() => setQuickView(null)} onAdd={() => { agregarAlCarrito(quickView); setQuickView(null); setMostrarCarrito(true); }} onOpen={() => { const p = quickView; setQuickView(null); openProduct(p); }} />
        )}
      </AnimatePresence>
    </div>
  );
}
