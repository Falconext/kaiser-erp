import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useNavigate, useParams } from 'react-router-dom';
import { Icon } from '@iconify/react';
import axios from 'axios';
import TecnologiaCartModal from '@/components/tienda/TecnologiaCartModal';
import TiendaFloatingButtons from '@/components/tienda/TiendaFloatingButtons';
import { onTiendaCartCleared } from '@/utils/tiendaCart';
import { getProductPricing, withPricing, withPricingList } from '@/templates/shared/pricing';
import { APICULTURA_BANNER, ApiculturaFooter, ApiculturaHeader, ApiculturaProductCard } from '@/templates/apicultura/ApiculturaParts';
import ApiculturaVariantSelector from '@/templates/apicultura/ApiculturaVariantSelector';
import { buildVariantCartItem, findApiculturaVariant, getApiculturaVariantData } from '@/templates/apicultura/variantUtils';
import { honeyCard, honeyEase, honeyHover, honeyPage, honeySection, honeyStagger, honeyTap, honeyViewport } from '@/templates/apicultura/motion';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4001/api';
const honeyPattern = {
  backgroundImage:
    'linear-gradient(30deg, rgba(0,0,0,.045) 12%, transparent 12.5%, transparent 87%, rgba(0,0,0,.045) 87.5%, rgba(0,0,0,.045)), linear-gradient(150deg, rgba(0,0,0,.045) 12%, transparent 12.5%, transparent 87%, rgba(0,0,0,.045) 87.5%, rgba(0,0,0,.045))',
  backgroundSize: '68px 40px',
};

function normalizeImage(value: any) {
  if (!value) return '';
  if (typeof value === 'string') return value;
  return value.url || value.imagenUrl || value.path || value.src || '';
}

export default function ApiculturaProductoDetalle() {
  const { slug, id } = useParams();
  const navigate = useNavigate();
  const [tienda, setTienda] = useState<any>(null);
  const [allCategories, setAllCategories] = useState<any[]>([]);
  const [producto, setProducto] = useState<any>(null);
  const [related, setRelated] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [reviewSummary, setReviewSummary] = useState({ ratingAvg: 0, ratingCount: 0 });
  const [carrito, setCarrito] = useState<any[]>([]);
  const [mostrarCarrito, setMostrarCarrito] = useState(false);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [qty, setQty] = useState(1);
  const [activeImage, setActiveImage] = useState(0);
  const [selectedVariantAttrs, setSelectedVariantAttrs] = useState<Record<string, string>>({});

  const diseno = tienda?.diseno || {};
  const cp = diseno?.colorPrimario || '#FFD72E';

  useEffect(() => {
    if (!slug) return;
    const loadBase = async () => {
      try {
        const storeRes = await axios.get(`${BASE_URL}/public/store/${slug}`);
        setTienda(storeRes.data?.data || storeRes.data);
        const catRes = await axios.get(`${BASE_URL}/public/store/${slug}/categories`);
        setAllCategories(Array.isArray(catRes.data?.data) ? catRes.data.data : []);
      } catch (error) {
        console.error(error);
      }
    };
    loadBase();
    try {
      const saved = localStorage.getItem(`tienda:${slug}:carrito`);
      if (saved) setCarrito(JSON.parse(saved));
    } catch {}
  }, [slug]);

  useEffect(() => {
    if (!slug || !id) return;
    const loadProduct = async () => {
      setLoading(true);
      try {
        const { data } = await axios.get(`${BASE_URL}/public/store/${slug}/products/${id}`);
        const loaded = withPricing(data?.data || data);
        setProducto(loaded);
        setReviewSummary({
          ratingAvg: Number(loaded.ratingAvg || loaded.ratingPromedio || loaded.promedioRating || 0),
          ratingCount: Number(loaded.ratingCount || loaded.totalReviews || loaded.reviewsCount || 0),
        });

        const category = typeof loaded.categoria === 'object' ? loaded.categoria?.nombre : loaded.categoria;
        if (category) {
          const relatedRes = await axios.get(`${BASE_URL}/public/store/${slug}/products`, { params: { category, limit: 5 } });
          const arr = Array.isArray(relatedRes.data?.data?.data)
            ? relatedRes.data.data.data
            : Array.isArray(relatedRes.data?.data)
              ? relatedRes.data.data
              : [];
          setRelated(withPricingList(arr.filter((item: any) => String(item.id) !== String(id)).slice(0, 4)));
        }

        try {
          const reviewsRes = await axios.get(`${BASE_URL}/public/store/${slug}/products/${loaded.id}/reviews`);
          const payload = reviewsRes.data?.data || reviewsRes.data || {};
          const items = Array.isArray(payload.reviews) ? payload.reviews : [];
          setReviews(items);
          setReviewSummary({
            ratingAvg: Number(payload.ratingAvg || payload.promedio || 0),
            ratingCount: Number(payload.ratingCount || items.length || 0),
          });
        } catch {
          setReviews([]);
        }
      } catch {
        navigate(`/tienda/${slug}`);
      } finally {
        setLoading(false);
      }
    };
    loadProduct();
  }, [slug, id, navigate]);

  useEffect(() => {
    if (!slug) return;
    if (carrito.length > 0) localStorage.setItem(`tienda:${slug}:carrito`, JSON.stringify(carrito));
  }, [carrito, slug]);

  useEffect(() => {
    if (!slug) return;
    return onTiendaCartCleared(slug, () => {
      setCarrito([]);
      setMostrarCarrito(false);
    });
  }, [slug]);

  const addToCart = (item: any) => {
    const pricing = getProductPricing(item);
    const cartItem = {
      ...item,
      id: item.id || item.productoId,
      productoId: item.productoId || item.id,
      cantidad: Number(item.cantidad || 1),
      precioUnitario: pricing.precioFinal,
      precioRegular: pricing.precioRegular,
      enOferta: pricing.enOferta,
    };
    setCarrito((current) => {
      const exists = current.find((row) => String(row.cartId || row.id) === String(cartItem.id));
      const next = exists
        ? current.map((row) => String(row.cartId || row.id) === String(cartItem.id) ? { ...row, cantidad: Number(row.cantidad || 1) + cartItem.cantidad } : row)
        : [...current, cartItem];
      localStorage.setItem(`tienda:${slug}:carrito`, JSON.stringify(next));
      return next;
    });
  };

  const updateQuantity = (itemId: number | string, cantidad: number) => {
    setCarrito((current) => {
      const next = cantidad <= 0
        ? current.filter((item) => String(item.cartId || item.id) !== String(itemId))
        : current.map((item) => String(item.cartId || item.id) === String(itemId) ? { ...item, cantidad } : item);
      localStorage.setItem(`tienda:${slug}:carrito`, JSON.stringify(next));
      return next;
    });
  };

  const images = useMemo(() => {
    const gallery = [
      producto?.imagenUrl,
      ...(Array.isArray(producto?.imagenes) ? producto.imagenes : []),
      ...(Array.isArray(producto?.imagenesExtra) ? producto.imagenesExtra : []),
      ...(Array.isArray(producto?.galeria) ? producto.galeria : []),
      ...(Array.isArray(producto?.variantes) ? producto.variantes.map((variant: any) => variant?.imagenUrlDisplay || variant?.imagenUrl || variant?.imagen) : []),
    ]
      .map(normalizeImage)
      .filter(Boolean);
    const unique = Array.from(new Set(gallery));
    return unique.length > 0 ? unique : [APICULTURA_BANNER];
  }, [producto]);

  const variantData = useMemo(() => getApiculturaVariantData(producto), [producto]);
  const selectedVariant = useMemo(
    () => findApiculturaVariant(variantData.choices, selectedVariantAttrs),
    [selectedVariantAttrs, variantData.choices],
  );

  useEffect(() => {
    setSelectedVariantAttrs(variantData.defaultSelection);
    setQty(1);
    setActiveImage(0);
  }, [producto?.id, variantData.signature]);

  useEffect(() => {
    if (!selectedVariant?.image) return;
    const index = images.findIndex((image) => image === selectedVariant.image);
    if (index >= 0) setActiveImage(index);
  }, [images, selectedVariant?.image]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FFF9E6]">
        <Icon icon="solar:jar-of-pills-bold" className="h-12 w-12 animate-pulse text-yellow-400" />
      </div>
    );
  }

  if (!producto) return null;

  const pricing = getProductPricing(producto);
  const activePricing = selectedVariant
    ? {
        precioFinal: selectedVariant.precioFinal,
        precioRegular: selectedVariant.precioRegular,
        enOferta: selectedVariant.enOferta,
        porcentajeDescuento: selectedVariant.porcentajeDescuento,
      }
    : pricing;
  const categoryName = typeof producto.categoria === 'object' ? producto.categoria?.nombre : producto.categoria;
  const brandName = typeof producto.marca === 'object' ? producto.marca?.nombre : producto.marca;
  const stock = selectedVariant ? selectedVariant.stock : Number(producto.stock || 0);
  const ratingCount = Number(reviewSummary.ratingCount || 0);
  const ratingAvg = Number(reviewSummary.ratingAvg || 0);
  const stars = Math.max(1, Math.min(5, Math.round(ratingAvg || 5)));
  const shortDescription = producto.descripcionCorta || producto.resumen || producto.detalle || producto.observacion || 'Producto disponible en tienda. Stock y precio actualizados.';

  return (
    <motion.div initial="hidden" animate="show" variants={honeyPage} className="min-h-screen bg-white" style={{ fontFamily: `'${diseno?.tipografia || 'Inter'}', sans-serif` }}>
      <ApiculturaHeader
        tienda={tienda}
        slug={slug || ''}
        cp={cp}
        diseno={diseno}
        carritoSize={carrito.reduce((sum, item) => sum + Number(item.cantidad || 1), 0)}
        onOpenCart={() => setMostrarCarrito(true)}
        searchQuery={search}
        setSearchQuery={setSearch}
        allCategories={allCategories}
        onSearchSubmit={(event, value) => {
          event.preventDefault();
          if (value?.trim()) navigate(`/tienda/${slug}/catalogo?search=${encodeURIComponent(value.trim())}`);
        }}
      />

      <motion.section variants={honeySection} className="bg-[#FFD72E] px-5 pb-16 pt-8 text-center" style={honeyPattern}>
        <nav className="mx-auto flex max-w-5xl flex-wrap items-center justify-center gap-2 text-xs font-black text-black/70 md:text-sm">
          <button type="button" onClick={() => navigate(`/tienda/${slug}`)} className="hover:text-black">Inicio</button>
          <span>/</span>
          <button type="button" onClick={() => navigate(`/tienda/${slug}/catalogo`)} className="hover:text-black">Tienda</button>
          {categoryName && <><span>/</span><span>{categoryName}</span></>}
          <span>/</span>
          <span className="line-clamp-1 max-w-xl text-black">{producto.descripcion}</span>
        </nav>
      </motion.section>

      <motion.main variants={honeySection} className="mx-auto max-w-7xl px-5 py-12">
        <motion.section variants={honeyStagger} className="grid gap-8 lg:grid-cols-[110px_minmax(0,1fr)_0.92fr]">
          <motion.div variants={honeyCard} className="order-2 flex gap-3 overflow-x-auto lg:order-1 lg:block lg:space-y-4 lg:overflow-visible">
            <button type="button" onClick={() => setActiveImage(Math.max(0, activeImage - 1))} className="hidden h-9 w-full items-center justify-center bg-[#F5F5F5] text-black lg:flex">
              <Icon icon="solar:alt-arrow-up-linear" />
            </button>
            {images.slice(0, 5).map((image, index) => (
              <motion.button
                key={`${image}-${index}`}
                type="button"
                onClick={() => setActiveImage(index)}
                className="h-24 w-24 shrink-0 border bg-white p-2 transition-all lg:h-28 lg:w-full"
                style={{ borderColor: activeImage === index ? cp : '#EFEFEF' }}
                whileHover={{ y: -3, scale: 1.03 }}
                whileTap={honeyTap}
                layout
              >
                <img src={image} alt="" className="h-full w-full object-contain" />
              </motion.button>
            ))}
            <button type="button" onClick={() => setActiveImage(Math.min(images.length - 1, activeImage + 1))} className="hidden h-9 w-full items-center justify-center bg-[#F5F5F5] text-black lg:flex">
              <Icon icon="solar:alt-arrow-down-linear" />
            </button>
          </motion.div>

          <motion.div variants={honeyCard} className="order-1 lg:order-2">
            <div className="relative flex min-h-[420px] items-center justify-center border border-gray-100 bg-white p-8 md:min-h-[610px]">
              {activePricing.enOferta && <span className="absolute left-5 top-5 z-10 rounded-full bg-black px-3 py-2 text-xs font-black text-white">-{activePricing.porcentajeDescuento}%</span>}
              <AnimatePresence mode="wait">
                <motion.img
                  key={images[activeImage]}
                  src={images[activeImage]}
                  alt={producto.descripcion}
                  className="max-h-[520px] w-full object-contain"
                  initial={{ opacity: 0, scale: 0.94, rotate: -1 }}
                  animate={{ opacity: 1, scale: 1, rotate: 0 }}
                  exit={{ opacity: 0, scale: 0.96, rotate: 1 }}
                  transition={{ duration: 0.38, ease: honeyEase }}
                />
              </AnimatePresence>
            </div>
            <div className="mt-7 grid overflow-hidden border border-gray-100 bg-white text-center text-sm font-black text-gray-600 sm:grid-cols-3">
              <div className="flex items-center justify-center gap-2 border-b border-gray-100 px-4 py-5 sm:border-b-0 sm:border-r">
                <Icon icon="solar:shield-check-bold" width={22} className="text-slate-700" /> Original
              </div>
              <div className="flex items-center justify-center gap-2 border-b border-gray-100 px-4 py-5 sm:border-b-0 sm:border-r">
                <Icon icon="solar:tag-price-bold" width={22} className="text-slate-700" /> Precio real
              </div>
              <div className="flex items-center justify-center gap-2 px-4 py-5">
                <Icon icon="solar:delivery-bold" width={22} className="text-slate-700" /> Envío disponible
              </div>
            </div>
          </motion.div>

          <motion.div variants={honeyCard} className="order-3 self-start lg:pl-2">
            {brandName && <p className="text-sm font-bold text-gray-600">Marca: <span className="text-black">{brandName}</span></p>}
            <h1 className="mt-2 text-3xl font-black leading-tight text-black md:text-4xl">{producto.descripcion}</h1>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1 text-amber-400">
                {ratingCount > 0 ? `${'★'.repeat(stars)}${'☆'.repeat(5 - stars)}` : '☆☆☆☆☆'}
              </div>
              <span className="text-sm font-semibold text-gray-500">{ratingCount > 0 ? `(${ratingCount} reseñas)` : 'Sin reseñas'}</span>
            </div>
            <div className="mt-4 flex flex-wrap items-end gap-3">
              {activePricing.enOferta && <span className="text-lg font-bold text-gray-400 line-through">S/ {activePricing.precioRegular.toFixed(2)}</span>}
              <span className="text-3xl font-black text-black">S/ {activePricing.precioFinal.toFixed(2)}</span>
            </div>
            <p className="mt-6 text-sm font-semibold leading-7 text-gray-600">
              {shortDescription}
            </p>

            <ApiculturaVariantSelector
              data={variantData}
              selection={selectedVariantAttrs}
              onChange={setSelectedVariantAttrs}
              cp={cp}
            />

            <div className="mt-7">
              <p className={`inline-flex px-3 py-2 text-sm font-black ${stock > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
                {stock > 0 ? `${stock} en stock` : 'Agotado'}
              </p>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-[110px_1fr]">
              <div className="flex h-12 items-center justify-between bg-[#F5F5F5] px-3">
                <button type="button" onClick={() => setQty(Math.max(1, qty - 1))} className="text-lg font-black">-</button>
                <span className="font-black">{qty}</span>
                <button type="button" onClick={() => setQty(qty + 1)} className="text-lg font-black">+</button>
              </div>
              <motion.button type="button" disabled={stock <= 0} onClick={() => { addToCart(buildVariantCartItem(producto, selectedVariant, qty)); setMostrarCarrito(true); }} className="flex h-12 items-center justify-center gap-2 rounded-full text-sm font-black uppercase text-black disabled:opacity-50" style={{ backgroundColor: cp }} whileHover={stock > 0 ? { scale: 1.025, y: -2 } : undefined} whileTap={stock > 0 ? honeyTap : undefined}>
                <Icon icon="solar:cart-large-2-bold" width={20} /> Agregar al carrito
              </motion.button>
            </div>
            <motion.button type="button" disabled={stock <= 0} onClick={() => { addToCart(buildVariantCartItem(producto, selectedVariant, qty)); navigate(`/tienda/${slug}/checkout`); }} className="mt-3 flex h-12 w-full items-center justify-center rounded-full bg-black text-sm font-black uppercase text-white disabled:opacity-50" whileHover={stock > 0 ? { scale: 1.02, y: -2 } : undefined} whileTap={stock > 0 ? honeyTap : undefined}>
              Comprar ahora
            </motion.button>

            <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-3 border-b border-gray-100 pb-5 text-xs font-black uppercase text-gray-700">
              <button type="button" className="flex items-center gap-1 hover:text-black"><Icon icon="solar:chart-bold" /> Comparar</button>
              <button type="button" className="flex items-center gap-1 hover:text-black"><Icon icon="solar:heart-linear" /> Favoritos</button>
              <button type="button" className="flex items-center gap-1 hover:text-black"><Icon icon="solar:question-circle-bold" /> Consultar</button>
              <button type="button" className="flex items-center gap-1 hover:text-black"><Icon icon="solar:share-bold" /> Compartir</button>
            </div>

            <div className="mt-5 space-y-3 text-sm font-semibold text-gray-500">
              <p className="flex items-center gap-2"><Icon icon="solar:eye-linear" className="text-gray-700" /> Stock y disponibilidad actualizados por la tienda.</p>
              <p className="flex items-center gap-2"><Icon icon="solar:map-point-linear" className="text-gray-700" /> Entrega según configuración del comercio.</p>
              <p className="flex items-center gap-2"><Icon icon="solar:shield-check-linear" className="text-gray-700" /> Compra segura con comprobante.</p>
            </div>

            <div className="mt-6 bg-[#F6F6F6] p-5 text-center">
              <p className="mb-3 text-xs font-black uppercase tracking-wide text-gray-600">Pago seguro configurado por tienda</p>
              <div className="flex flex-wrap justify-center gap-2 text-xs font-black text-gray-500">
                {['Yape', 'Plin', 'Transferencia', 'Efectivo'].map((method) => <span key={method} className="bg-white px-3 py-2">{method}</span>)}
              </div>
            </div>
          </motion.div>
        </motion.section>

        <motion.section initial="hidden" whileInView="show" viewport={honeyViewport} variants={honeySection} className="mt-16 border border-gray-100 bg-white">
          <div className="flex flex-wrap justify-center gap-0 border-b border-gray-100 text-sm font-black">
            {['Descripción', 'Información adicional', `Reseñas(${ratingCount})`, 'Envíos y devoluciones'].map((tab, index) => (
              <span key={tab} className={`px-5 py-5 ${index === 0 ? 'border-b-2 border-black text-black' : 'text-gray-500'}`}>{tab}</span>
            ))}
          </div>
          <div className="p-6 md:p-8">
            <h2 className="text-xl font-black text-black">Sobre este producto</h2>
            <p className="mt-4 text-sm font-semibold leading-7 text-gray-600">{shortDescription}</p>
            <div className="mt-7 grid gap-4 text-sm font-bold md:grid-cols-3">
              {categoryName && <div className="bg-[#F8F8F8] p-4"><span className="block text-gray-400">Categoría</span><span className="text-black">{categoryName}</span></div>}
              {brandName && <div className="bg-[#F8F8F8] p-4"><span className="block text-gray-400">Marca</span><span className="text-black">{brandName}</span></div>}
              {selectedVariant?.label && <div className="bg-[#F8F8F8] p-4"><span className="block text-gray-400">Variante</span><span className="text-black">{selectedVariant.label}</span></div>}
              <div className="bg-[#F8F8F8] p-4"><span className="block text-gray-400">Disponibilidad</span><span className="text-black">{stock} unidades</span></div>
            </div>
          </div>
        </motion.section>

        {related.length > 0 && (
          <motion.section initial="hidden" whileInView="show" viewport={honeyViewport} variants={honeySection} className="mt-16 border-t border-yellow-100 pt-12">
            <div className="mb-7 flex items-end justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-amber-700">También te puede gustar</p>
                <h2 className="mt-2 text-3xl font-black text-black">Productos relacionados</h2>
              </div>
              <button type="button" onClick={() => navigate(`/tienda/${slug}/catalogo`)} className="text-sm font-black text-amber-700">Ver catálogo</button>
            </div>
            <motion.div variants={honeyStagger} className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {related.map((item) => (
                <ApiculturaProductCard key={item.id} producto={item} slug={slug || ''} cp={cp} onAddToCart={addToCart} onClick={() => navigate(`/tienda/${slug}/producto/${item.id}`)} />
              ))}
            </motion.div>
          </motion.section>
        )}

        {reviews.length > 0 && (
          <motion.section initial="hidden" whileInView="show" viewport={honeyViewport} variants={honeySection} className="mt-12 rounded-[1.5rem] bg-white p-6 shadow-sm">
            <h2 className="text-xl font-black text-black">Reseñas verificadas</h2>
            <motion.div variants={honeyStagger} className="mt-5 grid gap-4 md:grid-cols-2">
              {reviews.slice(0, 4).map((review: any, index) => (
                <motion.div key={review.id || index} variants={honeyCard} whileHover={honeyHover} className="rounded-2xl border border-yellow-100 p-4">
                  <p className="font-black text-black">{review.nombre || review.clienteNombre || 'Cliente'}</p>
                  <p className="mt-2 text-sm font-semibold leading-6 text-gray-600">{review.comentario || review.descripcion}</p>
                </motion.div>
              ))}
            </motion.div>
          </motion.section>
        )}
      </motion.main>

      <ApiculturaFooter tienda={tienda} slug={slug || ''} diseno={diseno} cp={cp} categories={allCategories} />
      <TecnologiaCartModal
        isOpen={mostrarCarrito}
        onClose={() => setMostrarCarrito(false)}
        carrito={carrito}
        setCarrito={setCarrito}
        actualizarCantidad={updateQuantity}
        onCheckout={() => navigate(`/tienda/${slug}/checkout`)}
        cp={cp}
        tienda={tienda}
      />
      <TiendaFloatingButtons tienda={tienda} diseno={diseno} />
    </motion.div>
  );
}
