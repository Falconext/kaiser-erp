import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Icon } from '@iconify/react';
import { motion } from 'framer-motion';
import axios from 'axios';
import TiendaFloatingButtons from '@/components/tienda/TiendaFloatingButtons';
import { onTiendaCartCleared } from '@/utils/tiendaCart';
import { getProductPricing, withPricing, withPricingList } from '@/templates/shared/pricing';
import ConstruccionCartModal from '@/templates/construccion/ConstruccionCartModal';
import { ConstruccionFooter } from '@/templates/construccion/ConstruccionHomePage';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4001/api';

const getName = (item: any) => (typeof item === 'string' ? item : item?.nombre || item?.name || '');
const editable = (value: any, fallback: string) => String(value || '').trim() || fallback;
const fmt = (value: number) => `S/ ${Number(value || 0).toFixed(2)}`;

const fadeUp = {
  hidden: { opacity: 0, y: 22 },
  show: { opacity: 1, y: 0, transition: { duration: 0.48, ease: [0.22, 1, 0.36, 1] } },
};

function HammerLogo({ storeName, subtitle = 'Herramientas y accesorios', accent = '#ffb400' }: { storeName: string; subtitle?: string; accent?: string }) {
  const label = storeName?.trim() ? storeName.trim().split(/\s+/)[0] : 'HAMMER';
  const clean = label.replace(/[^a-zA-Z0-9]/g, '') || 'HAMMER';
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

function HammerHeader({
  tienda,
  slug,
  cp,
  categories,
  cartCount,
  onOpenCart,
  onSearch,
}: {
  tienda: any;
  slug: string;
  cp: string;
  categories: any[];
  cartCount: number;
  onOpenCart: () => void;
  onSearch: (value: string) => void;
}) {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const storeName = tienda?.nombreComercial || tienda?.nombre || tienda?.razonSocial || 'HAMMER';
  const diseno = tienda?.diseno || {};

  return (
    <header className="bg-[#111111] text-white">
      <div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-6 lg:flex-row lg:items-center lg:px-6">
        <button type="button" onClick={() => navigate(`/tienda/${slug}`)} className="text-left">
          <HammerLogo storeName={storeName} subtitle={editable(diseno?.construccionLogoSubtitle, 'Herramientas y accesorios')} accent={cp} />
        </button>
        <form
          className="flex min-h-[48px] flex-1 overflow-hidden rounded-md bg-white text-[13px] text-[#111] shadow-xl lg:mx-10"
          onSubmit={(event) => {
            event.preventDefault();
            onSearch(search);
          }}
        >
          <button type="button" className="hidden min-w-[210px] items-center justify-between border-r border-gray-200 px-5 text-[13px] font-bold text-gray-500 md:flex">
            Todas las categorías
            <Icon icon="solar:alt-arrow-down-linear" width={20} />
          </button>
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={editable(diseno?.construccionSearchPlaceholder, 'Buscar...')} className="min-w-0 flex-1 px-5 text-[13px] font-semibold text-gray-700 outline-none" />
          <button type="submit" className="px-4 text-[13px] font-black text-[#111] sm:px-8" style={{ background: cp }}>
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
              <p className="text-[13px] font-black" style={{ color: cp }}>{tienda?.whatsappTienda || tienda?.telefono || '(+51) 999-999-999'}</p>
            </div>
          </div>
          <Icon icon="solar:user-linear" width={30} className="text-white" />
        </div>
      </div>
      <div style={{ background: cp }}>
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 lg:px-6">
          <button type="button" onClick={() => navigate(`/tienda/${slug}/catalogo`)} className="inline-flex h-12 min-w-0 flex-1 items-center gap-3 rounded-md bg-white px-4 text-[13px] font-black text-[#151515] shadow-sm sm:flex-none sm:px-6 sm:text-[14px] md:min-w-[250px]">
            <Icon icon="solar:hamburger-menu-linear" width={30} />
            {editable(diseno?.construccionHeaderCategoryLabel, 'Comprar por categorías')}
          </button>
          <nav className="hidden flex-1 items-center justify-center gap-8 text-[14px] font-black text-[#151515] lg:flex">
            <button type="button" onClick={() => navigate(`/tienda/${slug}`)}>{editable(diseno?.construccionNavHome, 'Inicio')}</button>
            <button type="button" onClick={() => navigate(`/tienda/${slug}/catalogo`)} className="inline-flex items-center gap-1">{editable(diseno?.construccionNavStore, 'Tienda')} <Icon icon="solar:alt-arrow-down-linear" /></button>
            <button type="button" onClick={() => navigate(`/tienda/${slug}/catalogo`)} className="inline-flex items-center gap-2">{editable(diseno?.construccionNavCategories, 'Categorías')} <span className="rounded px-1.5 py-0.5 text-[10px] font-black text-white" style={{ background: '#13a084' }}>OFERTA</span></button>
            <button type="button" onClick={() => navigate(`/tienda/${slug}/catalogo`)} className="inline-flex items-center gap-2">{editable(diseno?.construccionNavProducts, 'Productos')} <span className="rounded px-1.5 py-0.5 text-[10px] font-black text-white" style={{ background: '#e93473' }}>TOP</span></button>
            <button type="button" onClick={() => navigate(`/tienda/${slug}/catalogo`)}>{editable(diseno?.construccionNavOffers, 'Ofertas destacadas')}</button>
            <button type="button" onClick={() => navigate(`/tienda/${slug}/catalogo`)}>{editable(diseno?.construccionNavCatalog, 'Catálogo')}</button>
          </nav>
          <button type="button" onClick={onOpenCart} className="inline-flex items-center gap-2 text-[14px] font-black text-[#151515]">
            <Icon icon="solar:cart-large-2-linear" width={34} />
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-xs">{cartCount}</span>
            <span className="hidden sm:inline">{editable(diseno?.construccionCartLabel, 'Mi carrito')}</span>
          </button>
        </div>
      </div>
    </header>
  );
}

function renderStars(rating: number, size = 18) {
  return (
    <div className="flex text-[#ff9d00]">
      {Array.from({ length: 5 }).map((_, index) => (
        <Icon key={index} icon={index < Math.round(rating || 0) ? 'solar:star-bold' : 'solar:star-linear'} width={size} />
      ))}
    </div>
  );
}

function RelatedHammerCard({ product, cp, onOpen, onAddToCart }: { product: any; cp: string; onOpen: () => void; onAddToCart: () => void }) {
  const pricing = getProductPricing(product);
  return (
    <motion.article
      variants={fadeUp}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.25 }}
      whileHover={{ y: -4 }}
      className="group cursor-pointer bg-white"
      onClick={onOpen}
    >
      <div className="relative flex h-48 items-center justify-center p-4">
        {pricing.enOferta && <span className="absolute left-2 top-2 rounded-md px-2 py-1 text-[10px] font-black text-[#111]" style={{ background: cp }}>-{pricing.porcentajeDescuento}%</span>}
        {product.imagenUrl ? <img src={product.imagenUrl} alt={product.descripcion} className="max-h-full max-w-full object-contain transition-transform group-hover:scale-105" /> : <Icon icon="solar:box-bold-duotone" width={72} className="text-gray-200" />}
      </div>
      <h3 className="min-h-[44px] text-base font-black leading-snug text-[#151515] line-clamp-2">{product.descripcion}</h3>
      <div className="mt-2">{renderStars(Number(product.ratingAvg || 0), 16)}</div>
      <div className="mt-2 flex items-center gap-2 text-lg font-black text-[#151515]">
        {pricing.enOferta && <span className="text-base font-semibold text-gray-400 line-through">{fmt(pricing.precioRegular)}</span>}
        <span>{fmt(pricing.precioFinal)}</span>
      </div>
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onAddToCart();
        }}
        className="mt-4 rounded-md px-5 py-3 text-sm font-black text-[#111] transition-transform hover:scale-[1.02]"
        style={{ background: cp }}
      >
        Agregar al carrito
      </button>
    </motion.article>
  );
}

export function ConstruccionProductoDetalleView({
  tienda,
  slug,
  producto,
  related = [],
  allCategories = [],
  carrito,
  setCarrito,
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
  setCarrito: (items: any[]) => void;
  mostrarCarrito: boolean;
  setMostrarCarrito: (value: boolean) => void;
  actualizarCantidad: (productoId: number | string, cantidad: number) => void;
  onNavigate?: (page: 'home' | 'catalogo' | 'producto' | 'checkout') => void;
  onAddToCart?: (producto: any) => void;
}) {
  const navigate = useNavigate();
  const [qty, setQty] = useState(1);
  const [activeImage, setActiveImage] = useState(0);
  const [activeTab, setActiveTab] = useState('Descripción');
  const [showStickyBar, setShowStickyBar] = useState(false);
  const cp = tienda?.diseno?.colorPrimario || '#ffb400';
  const pricing = getProductPricing(producto);
  const extraImages = Array.isArray(producto?.imagenesExtra) ? producto.imagenesExtra : [];
  const images = [producto?.imagenUrl, ...extraImages].filter(Boolean);
  const activeSrc = images[activeImage] || producto?.imagenUrl;
  const stock = Number(producto?.stock || 0);
  const isOutOfStock = stock <= 0;
  const marca = producto?.marca?.nombre || producto?.marca || 'Marca propia';
  const categoria = producto?.categoria?.nombre || producto?.categoria || 'Accesorios';
  const rating = Number(producto?.ratingAvg || producto?.ratingPromedio || producto?.promedioRating || 0);
  const ratingCount = Number(producto?.ratingCount || producto?.reviewsCount || producto?.totalReviews || 0);
  const go = (url: string, page?: 'home' | 'catalogo' | 'producto' | 'checkout') => {
    if (onNavigate && page) onNavigate(page);
    else navigate(url);
  };
  const add = () => {
    const item = { ...producto, ...pricing, precioUnitario: pricing.precioFinal, cantidad: qty, id: producto.id, productoId: producto.id };
    if (onAddToCart) onAddToCart(item);
    else {
      const exists = carrito.find((cartItem) => cartItem.id === producto.id || cartItem.productoId === producto.id);
      const next = exists
        ? carrito.map((cartItem) => (cartItem.id === producto.id || cartItem.productoId === producto.id) ? { ...cartItem, cantidad: Number(cartItem.cantidad || 1) + qty } : cartItem)
        : [...carrito, item];
      setCarrito(next);
      localStorage.setItem(`tienda:${slug}:carrito`, JSON.stringify(next));
    }
    setMostrarCarrito(true);
  };

  useEffect(() => {
    const onScroll = () => setShowStickyBar(window.scrollY > 480);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="min-h-screen overflow-x-hidden bg-white pb-24" style={{ fontFamily: `'${tienda?.diseno?.tipografia || 'Inter'}', sans-serif` }}>
      <HammerHeader
        tienda={tienda}
        slug={slug}
        cp={cp}
        categories={allCategories}
        cartCount={carrito.reduce((sum, item) => sum + Number(item.cantidad || 1), 0)}
        onOpenCart={() => setMostrarCarrito(true)}
        onSearch={(value) => go(`/tienda/${slug}/catalogo?search=${encodeURIComponent(value)}`, 'catalogo')}
      />

      <section className="bg-[#f4f4f4]">
        <div className="mx-auto max-w-7xl px-4 py-9 text-center text-[13px] font-bold tracking-wide text-[#151515] lg:px-6">
          <button type="button" onClick={() => go(`/tienda/${slug}`, 'home')}>Inicio</button>
          <span className="mx-2">/</span>
          <button type="button" onClick={() => go(`/tienda/${slug}/catalogo`, 'catalogo')}>Tienda</button>
          <span className="mx-2">/</span>
          <span>{categoria}</span>
          <span className="mx-2">/</span>
          <span className="text-gray-600">{producto.descripcion}</span>
        </div>
      </section>

      <main className="mx-auto max-w-7xl px-4 py-16 lg:px-6">
        <section className="grid gap-10 lg:grid-cols-[minmax(0,620px)_1fr] lg:gap-12">
          <motion.div variants={fadeUp} initial="hidden" animate="show">
            <div className="grid gap-7 md:grid-cols-[110px_1fr]">
              <div className="hidden flex-col items-center gap-4 md:flex">
                <Icon icon="solar:alt-arrow-up-linear" width={28} className="mb-3 text-[#111]" />
                {(images.length ? images : [null]).slice(0, 5).map((image, index) => (
                  <button
                    key={`${image || 'empty'}-${index}`}
                    type="button"
                    onClick={() => setActiveImage(index)}
                    className="flex h-[104px] w-[104px] items-center justify-center border bg-white p-3 transition"
                    style={{ borderColor: activeImage === index ? cp : '#E5E7EB' }}
                  >
                    {image ? <img src={image} alt="" className="h-full w-full object-contain" /> : <Icon icon="solar:box-bold-duotone" width={44} className="text-gray-200" />}
                  </button>
                ))}
                <Icon icon="solar:alt-arrow-down-linear" width={28} className="mt-3 text-[#111]" />
              </div>
              <div className="flex min-h-[340px] items-center justify-center border border-gray-200 bg-white p-5 sm:min-h-[460px] md:p-8 lg:min-h-[620px]">
                {activeSrc ? <img src={activeSrc} alt={producto.descripcion} className="max-h-[300px] max-w-full object-contain sm:max-h-[400px] lg:max-h-[540px]" /> : <Icon icon="solar:box-bold-duotone" width={120} className="text-gray-200" />}
              </div>
            </div>
            <div className="mt-8 grid overflow-hidden rounded-md border border-[#dfe4f4] bg-[#f7f8ff] text-[#55577d] sm:grid-cols-3">
              {[
                ['solar:shield-check-bold', editable(tienda?.diseno?.construccionProductTrustOne, '100% original')],
                ['solar:coins-bold', editable(tienda?.diseno?.construccionProductTrustTwo, 'Mejor precio')],
                ['solar:delivery-bold', editable(tienda?.diseno?.construccionProductTrustThree, 'Envío gratis')],
              ].map(([icon, label]) => (
                <div key={label} className="flex items-center justify-center gap-3 border-b border-[#dfe4f4] px-4 py-4 text-base font-black last:border-b-0 sm:border-b-0 sm:border-r sm:py-5 sm:text-lg sm:last:border-r-0">
                  <Icon icon={icon} width={26} />
                  <span>{label}</span>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div variants={fadeUp} initial="hidden" animate="show" transition={{ delay: 0.08 }} className="pt-1">
            <p className="text-[13px] font-bold text-gray-500">Marca: <span style={{ color: cp }}>{marca}</span></p>
            <h1 className="mt-2 text-[22px] font-black leading-tight text-[#111]">{producto.descripcion}</h1>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <span className="text-[22px] font-black text-[#111]">{fmt(pricing.precioFinal)}</span>
              {pricing.enOferta && <span className="text-[13px] font-bold text-gray-400 line-through">{fmt(pricing.precioRegular)}</span>}
              {renderStars(rating || 5, 16)}
              <span className="text-[13px] font-semibold" style={{ color: cp }}>({ratingCount || 0} reseña{ratingCount === 1 ? '' : 's'})</span>
            </div>
            <p className="mt-7 flex items-center gap-3 text-[13px] font-semibold text-red-500">
              <Icon icon="solar:fire-bold" width={22} />
              {editable(tienda?.diseno?.construccionProductFastSellingText, 'Se está vendiendo rápido')}: {Math.max(1, Math.min(9, stock || 5))} personas lo tienen en su carrito
            </p>
            <ul className="mt-6 space-y-2 text-[13px] font-semibold leading-6 text-gray-500">
              <li>• Stock disponible y precio actualizado en la tienda.</li>
              <li>• Producto listo para compra directa o pedido por carrito.</li>
              <li>• Soporte de la tienda antes y después de la compra.</li>
            </ul>
            <div className="mt-6 flex flex-col gap-4 sm:flex-row">
              <div className="flex h-12 w-32 items-center justify-between rounded-md bg-gray-50 px-4 text-[13px] font-black">
                <button type="button" onClick={() => setQty(Math.max(1, qty - 1))}>−</button>
                <span>{qty}</span>
                <button type="button" onClick={() => setQty(isOutOfStock ? qty : stock > 0 ? Math.min(stock, qty + 1) : qty + 1)}>+</button>
              </div>
              <button type="button" disabled={isOutOfStock} onClick={add} className="h-12 flex-1 rounded-md text-[13px] font-black text-[#111] disabled:bg-gray-200 disabled:text-gray-400" style={isOutOfStock ? undefined : { background: cp }}>
                {isOutOfStock ? 'Sin stock' : editable(tienda?.diseno?.construccionProductAddLabel, 'Agregar al carrito')}
              </button>
            </div>
            <button type="button" disabled={isOutOfStock} onClick={add} className="mt-5 h-12 w-full rounded-md text-[13px] font-black text-[#111] disabled:bg-gray-200 disabled:text-gray-400" style={isOutOfStock ? undefined : { background: cp }}>
              {editable(tienda?.diseno?.construccionProductBuyLabel, 'Comprar ahora')}
            </button>
            <div className="mt-6 flex flex-wrap gap-6 border-b border-gray-200 pb-6 text-[13px] font-black text-[#222]">
              {[
                ['solar:chart-2-linear', 'Comparar'],
                ['solar:heart-linear', 'Favoritos'],
                ['solar:question-circle-linear', 'Consultar'],
                ['solar:share-linear', 'Compartir'],
              ].map(([icon, label]) => (
                <button key={label} type="button" className="inline-flex items-center gap-2 transition-colors hover:text-[#ffb400]">
                  <Icon icon={icon} width={26} />
                  {label}
                </button>
              ))}
            </div>
            <div className="mt-6 space-y-4 text-[13px] font-semibold text-gray-500">
              <p className="flex items-center gap-3 text-[13px] text-[#222]"><Icon icon="solar:eye-linear" width={24} className="text-gray-400" /> {20 + Math.max(1, Number(producto.id || 1) % 10)} personas están viendo este producto ahora</p>
              <p className="flex items-center gap-3"><Icon icon="solar:shield-check-bold" width={20} /> Entrega estimada: hasta 4 días hábiles</p>
              <p className="flex items-center gap-3"><Icon icon="solar:shield-check-bold" width={20} /> Envío y devoluciones gratis en compras mayores a S/ 200</p>
            </div>
            <div className="mt-8 rounded-md bg-gray-50 px-6 py-5 text-center">
              <p className="text-[13px] font-black uppercase tracking-widest text-[#222]">{editable(tienda?.diseno?.construccionProductSecureTitle, 'Pago seguro garantizado')}</p>
              <p className="mt-3 text-[13px] font-black text-gray-500">{editable(tienda?.diseno?.construccionProductSecureMethods, 'VISA · Mastercard · Yape · Plin')}</p>
            </div>
          </motion.div>
        </section>

        <section className="mt-16 overflow-hidden rounded-md border border-gray-200 bg-white">
          <div className="flex flex-wrap justify-center gap-8 border-b border-gray-200 px-6 pt-6">
            {['Descripción', 'Reseñas (1)', 'Tabla de medidas', 'Imágenes', 'Envío y devoluciones'].map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className="border-b-4 px-2 pb-5 text-[13px] font-black transition-colors"
                style={{ borderColor: activeTab === tab ? cp : 'transparent', color: activeTab === tab ? '#111' : '#777' }}
              >
                {tab}
              </button>
            ))}
          </div>
          <div className="p-8 md:p-10">
            <p className="text-[13px] font-semibold leading-7 text-gray-500">
              {producto.descripcionLarga
                ? producto.descripcionLarga.replace(/<[^>]+>/g, ' ')
                : `${producto.descripcion} cuenta con disponibilidad actualizada, soporte de compra y despacho según la configuración de la tienda.`}
            </p>
            {activeSrc && (
              <div className="mt-8 flex max-h-[520px] items-center justify-center overflow-hidden bg-gray-100">
                <img src={activeSrc} alt={producto.descripcion} className="max-h-[520px] w-full object-contain" />
              </div>
            )}
            <h2 className="mt-8 text-[22px] font-black text-[#111]">Sobre este producto</h2>
            <p className="mt-5 text-[13px] font-semibold leading-7 text-gray-500">
              Categoría: {categoria}. Marca: {marca}. Stock: {isOutOfStock ? 'sin stock' : `${stock} unidades`}. Precio vigente: {fmt(pricing.precioFinal)}.
            </p>
          </div>
        </section>

        {related.length > 0 && (
          <motion.section variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.25 }} className="mt-16">
            <div className="mb-7 flex items-end justify-between border-b-4 pb-4" style={{ borderColor: cp }}>
              <h2 className="text-3xl font-black text-[#151515]">{editable(tienda?.diseno?.construccionRelatedTitle, 'Productos relacionados')}</h2>
              <div className="flex gap-2 text-gray-400">
                <Icon icon="solar:alt-arrow-left-linear" width={26} />
                <Icon icon="solar:alt-arrow-right-linear" width={26} />
              </div>
            </div>
            <div className="grid gap-x-10 gap-y-16 sm:grid-cols-2 lg:grid-cols-4">
              {related.slice(0, 4).map((item) => (
                <RelatedHammerCard
                  key={item.id}
                  product={item}
                  cp={cp}
                  onOpen={() => navigate(`/tienda/${slug}/producto/${item.id}`)}
                  onAddToCart={() => setCarrito([...carrito, { ...item, cantidad: 1, productoId: item.id }])}
                />
              ))}
            </div>
          </motion.section>
        )}
      </main>

      <ConstruccionFooter tienda={tienda} slug={slug} cp={cp} categories={allCategories} diseno={tienda?.diseno} />

      <div className={`fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white/95 px-4 py-3 shadow-[0_-10px_30px_rgba(0,0,0,.08)] backdrop-blur transition-transform duration-300 ${showStickyBar ? 'translate-y-0' : 'translate-y-full'}`}>
        <div className="mx-auto flex max-w-7xl items-center gap-3 sm:gap-4">
          {producto.imagenUrl && <img src={producto.imagenUrl} alt="" className="hidden h-10 w-10 object-contain sm:block" />}
          <p className="min-w-0 flex-1 truncate text-[13px] font-black text-[#111]">{producto.descripcion}</p>
          <span className="hidden text-[13px] font-black text-[#111] sm:inline">{fmt(pricing.precioFinal)}</span>
          <div className="hidden h-11 w-28 items-center justify-between rounded-md bg-gray-50 px-4 text-[13px] font-black sm:flex">
            <button type="button" onClick={() => setQty(Math.max(1, qty - 1))}>−</button>
            <span>{qty}</span>
            <button type="button" onClick={() => setQty(isOutOfStock ? qty : stock > 0 ? Math.min(stock, qty + 1) : qty + 1)}>+</button>
          </div>
          <button type="button" disabled={isOutOfStock} onClick={add} className="h-11 rounded-md px-4 text-[12px] font-black text-[#111] disabled:bg-gray-200 disabled:text-gray-400 sm:px-5 sm:text-[13px]" style={isOutOfStock ? undefined : { background: cp }}>
            {editable(tienda?.diseno?.construccionProductAddLabel, 'Agregar al carrito')}
          </button>
          <button type="button" disabled={isOutOfStock} onClick={add} className="hidden h-11 rounded-md px-5 text-[13px] font-black text-[#111] disabled:bg-gray-200 disabled:text-gray-400 sm:block" style={isOutOfStock ? undefined : { background: cp }}>
            {editable(tienda?.diseno?.construccionProductBuyLabel, 'Comprar ahora')}
          </button>
        </div>
      </div>

      <TiendaFloatingButtons diseno={tienda?.diseno} tienda={tienda} />
      <ConstruccionCartModal
        isOpen={mostrarCarrito}
        onClose={() => setMostrarCarrito(false)}
        carrito={carrito}
        setCarrito={setCarrito}
        actualizarCantidad={actualizarCantidad}
        onCheckout={() => go(`/tienda/${slug}/checkout`, 'checkout')}
        cp={cp}
        tienda={tienda}
      />
    </div>
  );
}

export default function ConstruccionProductoDetalle() {
  const { slug = '', id = '' } = useParams();
  const navigate = useNavigate();
  const [tienda, setTienda] = useState<any>(null);
  const [producto, setProducto] = useState<any>(null);
  const [related, setRelated] = useState<any[]>([]);
  const [allCategories, setAllCategories] = useState<any[]>([]);
  const [carrito, setCarrito] = useState<any[]>([]);
  const [mostrarCarrito, setMostrarCarrito] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    try {
      const saved = localStorage.getItem(`tienda:${slug}:carrito`);
      if (saved) setCarrito(JSON.parse(saved));
    } catch {}
    return onTiendaCartCleared(slug, () => {
      setCarrito([]);
      setMostrarCarrito(false);
    });
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
          const relatedRes = await axios.get(`${BASE_URL}/public/store/${slug}/products`, { params: { category, limit: 5 } });
          const arr = Array.isArray(relatedRes.data?.data?.data) ? relatedRes.data.data.data : Array.isArray(relatedRes.data?.data) ? relatedRes.data.data : [];
          setRelated(withPricingList(arr.filter((item: any) => Number(item.id) !== Number(id)).slice(0, 4)));
        }
      } catch {
        navigate(`/tienda/${slug}`);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [slug, id, navigate]);

  const actualizarCantidad = (productoId: number | string, cantidad: number) => {
    const next = cantidad <= 0
      ? carrito.filter((item) => item.id !== productoId && item.productoId !== productoId)
      : carrito.map((item) => (item.id === productoId || item.productoId === productoId) ? { ...item, cantidad } : item);
    setCarrito(next);
    localStorage.setItem(`tienda:${slug}:carrito`, JSON.stringify(next));
  };

  const memoStore = useMemo(() => tienda || {}, [tienda]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <Icon icon="solar:refresh-bold" className="h-12 w-12 animate-spin text-gray-300" />
      </div>
    );
  }

  if (!producto) return null;

  return (
    <ConstruccionProductoDetalleView
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
