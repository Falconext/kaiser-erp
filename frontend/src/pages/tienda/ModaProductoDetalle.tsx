import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion, type PanInfo } from 'framer-motion';
import { Icon } from '@iconify/react';
import axios from 'axios';
import ModaHeader from '@/components/tienda/ModaHeader';
import ModaFooter from '@/components/tienda/ModaFooter';
import ModaCartModal from '@/components/tienda/ModaCartModal';
import ProductModifiersSelector from '@/components/tienda/ProductModifiersSelector';
import ReviewFeedbackModal from '@/components/tienda/ReviewFeedbackModal';
import { useFavoritosStore } from '@/zustand/favoritos';
import { onTiendaCartCleared } from '@/utils/tiendaCart';
import { withPricing, withPricingList } from '@/templates/shared/pricing';
import {
  findFashionVariant,
  getDefaultVariantSelection,
  getFashionColorGallery,
  getFashionColors,
  getFashionSizes,
  getVariantOptionNames,
  isFashionVariantAvailable,
  variantValues,
} from '@/templates/urbano/fashionVariants';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4001/api';

// Animación de deslizamiento (slide) de la imagen principal en mobile/desktop.
const imageSlideVariants = {
  enter: (dir: number) => ({ opacity: 0, x: dir > 0 ? 48 : -48 }),
  center: { opacity: 1, x: 0 },
  exit: (dir: number) => ({ opacity: 0, x: dir > 0 ? -48 : 48 }),
};

const QUILL_PROSE = [
  'text-sm text-gray-600 leading-relaxed break-words overflow-hidden w-full',
  '[&_h1]:text-xl [&_h1]:font-black [&_h1]:text-gray-900 [&_h1]:mb-3 [&_h1]:mt-5',
  '[&_h2]:text-base [&_h2]:font-bold [&_h2]:text-gray-900 [&_h2]:mb-2 [&_h2]:mt-4',
  '[&_h3]:text-sm [&_h3]:font-bold [&_h3]:text-gray-800 [&_h3]:mb-2 [&_h3]:mt-3',
  '[&_p]:mb-3 [&_p]:leading-relaxed [&_p]:break-words',
  '[&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-3 [&_ul]:space-y-1',
  '[&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:mb-3 [&_ol]:space-y-1',
  '[&_li]:text-gray-600',
  '[&_strong]:font-bold [&_strong]:text-gray-800',
  '[&_em]:italic',
  '[&_a]:underline [&_a]:text-gray-900',
].join(' ');

/* ── Reusable star display ── */
function Stars({ rating, size = 14 }: { rating: number; size?: number }) {
  const full = Math.floor(rating);
  const hasHalf = rating % 1 >= 0.5;
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }, (_, i) => {
        const n = i + 1;
        const icon =
          n <= full
            ? 'solar:star-bold'
            : hasHalf && n === full + 1
            ? 'solar:star-half-bold'
            : 'solar:star-outline';
        const color = n <= full || (hasHalf && n === full + 1) ? '#1A1A1A' : '#D1D5DB';
        return <Icon key={i} icon={icon} width={size} style={{ color }} />;
      })}
    </div>
  );
}

/* ── Related product card (fashion style) ── */
function ModaRelatedCard({
  product,
  slug,
  cp,
  onNavigate,
}: {
  product: any;
  slug: string;
  cp: string;
  onNavigate: () => void;
}) {
  const [hover, setHover] = useState(false);
  const price = Number(product.precioUnitario || 0);
  const original = Number(product.precioOriginal || 0);
  const hasDiscount = original > 0 && original > price;

  return (
    <button
      onClick={onNavigate}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className="text-left group w-full"
    >
      <div className="relative overflow-hidden rounded-2xl bg-[#F5F0EB] aspect-[3/4] mb-3">
        {product.imagenUrl ? (
          <img
            src={product.imagenUrl}
            alt={product.descripcion}
            className="w-full h-full object-cover transition-transform duration-500"
            style={{ transform: hover ? 'scale(1.06)' : 'scale(1)' }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Icon icon="solar:box-linear" className="text-gray-300 text-5xl" />
          </div>
        )}
        {hasDiscount && (
          <span
            className="absolute top-3 left-3 text-[10px] font-black text-white px-2.5 py-1 rounded-full tracking-wider"
            style={{ backgroundColor: cp }}
          >
            -{Math.round((1 - price / original) * 100)}%
          </span>
        )}
        <div
          className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors duration-300"
        />
      </div>
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1 truncate">
        {typeof product.categoria === 'object' ? product.categoria?.nombre : product.categoria || 'Moda'}
      </p>
      <p className="text-sm font-bold text-gray-900 leading-snug line-clamp-2 mb-2">
        {product.descripcion}
      </p>
      <div className="flex items-center gap-2">
        <span className="text-sm font-black text-gray-900">
          S/ {price.toFixed(2)}
        </span>
        {hasDiscount && (
          <span className="text-xs text-gray-400 line-through">S/ {original.toFixed(2)}</span>
        )}
      </div>
    </button>
  );
}

/* ── Loading skeleton ── */
function LoadingSkeleton() {
  return (
    <div className="min-h-screen bg-[#FAF9F6]">
      <div className="h-16 border-b border-gray-100 bg-[#FAF9F6]" />
      <main className="w-full max-w-7xl mx-auto px-4 xl:px-8 py-8">
        <div className="flex items-center gap-2 mb-8">
          {[80, 14, 64, 14, 140].map((w, i) => (
            <div key={i} className="animate-pulse bg-gray-200 rounded" style={{ width: w, height: 12 }} />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16">
          <div className="space-y-3">
            <div className="animate-pulse bg-gray-100 rounded-3xl w-full aspect-square" />
            <div className="flex gap-3">
              {[0, 1, 2].map(i => (
                <div key={i} className="animate-pulse bg-gray-100 rounded-xl w-24 h-24" />
              ))}
            </div>
          </div>
          <div className="space-y-4 pt-4">
            <div className="animate-pulse bg-gray-200 rounded h-8 w-3/4" />
            <div className="animate-pulse bg-gray-100 rounded h-5 w-1/2" />
            <div className="animate-pulse bg-gray-200 rounded h-10 w-1/3" />
            <div className="animate-pulse bg-gray-100 rounded h-24 w-full mt-4" />
            <div className="animate-pulse bg-gray-100 rounded-2xl h-14 w-full mt-4" />
          </div>
        </div>
      </main>
    </div>
  );
}

export default function ModaProductoDetalle() {
  const { slug, id } = useParams();
  const navigate = useNavigate();

  /* ── State ── */
  const [producto, setProducto] = useState<any>(null);
  const [tienda, setTienda] = useState<any>(null);
  const [related, setRelated] = useState<any[]>([]);
  const [allProducts, setAllProducts] = useState<any[]>([]);
  const [allCategories, setAllCategories] = useState<any[]>([]);
  const [modificadoresProducto, setModificadoresProducto] = useState<any[]>([]);
  const [selecciones, setSelecciones] = useState<Record<number, number[]>>({});
  const [loading, setLoading] = useState(true);
  const [cantidad, setCantidad] = useState(1);
  const [selectedImage, setSelectedImage] = useState('');
  const [varianteSelecciones, setVarianteSelecciones] = useState<Record<string, string>>({});
  const [varianteActiva, setVarianteActiva] = useState<any>(null);
  const [imgDirection, setImgDirection] = useState(0);
  const imageColumnRef = useRef<HTMLDivElement>(null);
  const [carrito, setCarrito] = useState<any[]>([]);
  const [mostrarCarrito, setMostrarCarrito] = useState(false);
  const [search, setSearch] = useState('');
  const [reviews, setReviews] = useState<any[]>([]);
  const [reviewSummary, setReviewSummary] = useState({ ratingAvg: 0, ratingCount: 0 });
  const [showReviewSuccess, setShowReviewSuccess] = useState(false);
  const [reviewForm, setReviewForm] = useState({
    clienteNombre: '',
    clienteTelefono: '',
    clienteEmail: '',
    codigoSeguimiento: '',
    rating: 5,
    comentario: '',
  });
  const [reviewSending, setReviewSending] = useState(false);

  const { toggleFavorito, isFavorito } = useFavoritosStore();

  /* ── Cart persistence ── */
  useEffect(() => {
    if (!slug) return;
    return onTiendaCartCleared(slug, () => {
      setCarrito([]);
      setMostrarCarrito(false);
    });
  }, [slug]);

  /* ── Load product + store ── */
  useEffect(() => {
    if (!slug || !id) return;
    const load = async () => {
      try {
        setLoading(true);
        const [prodRes, tiendaRes] = await Promise.all([
          axios.get(`${BASE_URL}/public/store/${slug}/products/${id}`),
          axios.get(`${BASE_URL}/public/store/${slug}`),
        ]);
        const prod = withPricing(prodRes.data.data || prodRes.data);
        const tiendaData = tiendaRes.data.data || tiendaRes.data;
        setProducto(prod);
        setTienda(tiendaData);
        const defaultVariantSelection = getDefaultVariantSelection(prod);
        const defaultVariant = findFashionVariant(prod, defaultVariantSelection);
        const defaultColor = defaultVariantSelection[getVariantOptionNames(prod).color];
        const gallery = defaultColor ? getFashionColorGallery(prod, defaultColor) : [];
        setVarianteSelecciones(defaultVariantSelection);
        setVarianteActiva(defaultVariant);
        setSelectedImage(gallery[0] || defaultVariant?.imagenUrl || prod.imagenUrl || '');

        // Reviews
        try {
          const revRes = await axios.get(
            `${BASE_URL}/public/store/${slug}/products/${prod.id}/reviews`
          );
          const payload = revRes.data.data || revRes.data;
          setReviews(Array.isArray(payload?.reviews) ? payload.reviews : []);
          setReviewSummary({
            ratingAvg: Number(payload?.ratingAvg || 0),
            ratingCount: Number(payload?.ratingCount || 0),
          });
        } catch {
          setReviews([]);
        }

        // Modifiers
        try {
          const modsRes = await axios.get(
            `${BASE_URL}/public/store/${slug}/products/${prod.id}/modifiers`
          );
          const mods = modsRes.data.data || modsRes.data || [];
          setModificadoresProducto(mods);
          const defaults: Record<number, number[]> = {};
          mods.forEach((g: any) => {
            const defs = g.opciones.filter((op: any) => op.esDefault).map((op: any) => op.id);
            defaults[g.id] =
              g.esObligatorio && g.seleccionMax === 1 && defs.length === 0 && g.opciones.length > 0
                ? [g.opciones[0].id]
                : defs;
          });
          setSelecciones(defaults);
        } catch {}

        // Categories
        try {
          const catRes = await axios.get(`${BASE_URL}/public/store/${slug}/categories`);
          setAllCategories(Array.isArray(catRes.data?.data) ? catRes.data.data : []);
        } catch {}

        // Related
        try {
          const relRes = await axios.get(
            `${BASE_URL}/public/store/${slug}/products/${id}/related`
          );
          const rel = relRes.data.data || relRes.data;
          setRelated(Array.isArray(rel) ? withPricingList(rel.slice(0, 4)) : []);
        } catch {}

        // All products for header search
        try {
          const allRes = await axios.get(`${BASE_URL}/public/store/${slug}/products`, {
            params: { limit: 30 },
          });
          const items = allRes.data?.data?.data || allRes.data?.data || [];
          setAllProducts(Array.isArray(items) ? withPricingList(items) : []);
        } catch {}

        // Restore cart
        try {
          const saved = localStorage.getItem(`tienda:${slug}:carrito`);
          if (saved) setCarrito(JSON.parse(saved));
        } catch {}
      } catch {
        navigate(`/tienda/${slug}`);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [slug, id]);

  /* ── Review prefill from URL (order confirmation flow) ── */
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('review') !== '1') return;
    setReviewForm(prev => ({
      ...prev,
      clienteNombre: params.get('nombre') || prev.clienteNombre,
      clienteTelefono: params.get('telefono') || prev.clienteTelefono,
      codigoSeguimiento: params.get('codigo') || prev.codigoSeguimiento,
    }));
    window.setTimeout(() => {
      document.getElementById('review-form')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 450);
  }, [id]);

  /* ── Cart helpers ── */
  const precioExtra = modificadoresProducto.reduce((total, grupo) => {
    return (
      total +
      grupo.opciones
        .filter((op: any) => (selecciones[grupo.id] || []).includes(op.id))
        .reduce((s: number, op: any) => s + Number(op.precioExtra || 0), 0)
    );
  }, 0);

  const handleVariantChange = (optionName: string, value: string) => {
    if (!producto) return;
    let nextSelection = { ...varianteSelecciones, [optionName]: value };
    let match = findFashionVariant(producto, nextSelection);

    if (!match && Array.isArray(producto?.variantes)) {
      const fallback = producto.variantes.find((variant: any) => {
        const values = variantValues(variant);
        return values[optionName] === value && Number(variant?.stock ?? 0) > 0;
      }) || producto.variantes.find((variant: any) => variantValues(variant)[optionName] === value);
      if (fallback) {
        nextSelection = variantValues(fallback);
        match = fallback;
      }
    }

    setVarianteSelecciones(nextSelection);
    setVarianteActiva(match);
    const selectedColor = nextSelection[getVariantOptionNames(producto).color];
    const gallery = selectedColor ? getFashionColorGallery(producto, selectedColor) : [];
    setSelectedImage(gallery[0] || match?.imagenUrl || producto.imagenUrl || '');
  };

  const addToCart = () => {
    if (!producto) return;
    for (const g of modificadoresProducto) {
      if (g.esObligatorio && (selecciones[g.id] || []).length < (g.seleccionMin || 1)) {
        alert(`Por favor selecciona una opción para "${g.nombre}"`);
        return;
      }
    }
    const mods: any[] = [];
    modificadoresProducto.forEach(g => {
      (selecciones[g.id] || []).forEach((opId: number) => {
        const op = g.opciones.find((o: any) => o.id === opId);
        if (op)
          mods.push({
            grupoId: g.id,
            grupoNombre: g.nombre,
            opcionId: op.id,
            opcionNombre: op.nombre,
            precioExtra: op.precioExtra,
          });
      });
    });

    if (Array.isArray(producto.variantes) && producto.variantes.length > 0 && !varianteActiva) {
      alert('Selecciona una combinación disponible de color y talla.');
      return;
    }

    const pExtra = mods.reduce((s, m) => s + Number(m.precioExtra || 0), 0);
    const itemId = mods.length || varianteActiva ? `${producto.id}-${varianteActiva?.id || 'base'}-${Date.now()}` : producto.id;
    const item = {
      ...producto,
      id: itemId,
      productoId: producto.id,
      varianteId: varianteActiva?.id,
      valoresAtributos: varianteActiva?.valoresAtributos || varianteSelecciones,
      cantidad,
      precioBase: varianteActiva?.precioUnitario ?? producto.precioUnitario,
      precioUnitario: Number(varianteActiva?.precioUnitario ?? producto.precioUnitario) + pExtra,
      stock: varianteActiva?.stock ?? producto.stock,
      codigo: varianteActiva?.codigo || producto.codigo,
      imagenUrl: selectedImage || varianteActiva?.imagenUrl || producto.imagenUrl,
      modificadores: mods,
    };

    let current: any[] = [];
    try {
      const s = localStorage.getItem(`tienda:${slug}:carrito`);
      if (s) current = JSON.parse(s) || [];
    } catch {}

    if (!mods.length && !varianteActiva) {
      const existe = current.find(i => i.productoId === item.productoId && !i.modificadores?.length);
      if (existe) {
        const updated = current.map(i =>
          i.productoId === item.productoId && !i.modificadores?.length
            ? { ...i, cantidad: i.cantidad + cantidad }
            : i
        );
        setCarrito(updated);
        try { localStorage.setItem(`tienda:${slug}:carrito`, JSON.stringify(updated)); } catch {}
        setMostrarCarrito(true);
        return;
      }
    }

    const updated = [...current, item];
    setCarrito(updated);
    try { localStorage.setItem(`tienda:${slug}:carrito`, JSON.stringify(updated)); } catch {}
    setMostrarCarrito(true);
  };

  const actualizarCantidad = (productoId: number | string, cant: number) => {
    const updated =
      cant <= 0
        ? carrito.filter(i => i.id !== productoId)
        : carrito.map(i => (i.id === productoId ? { ...i, cantidad: cant } : i));
    setCarrito(updated);
    try { localStorage.setItem(`tienda:${slug}:carrito`, JSON.stringify(updated)); } catch {}
  };

  const irACheckout = () => {
    navigate(`/tienda/${slug}/checkout`, { state: { carrito, tienda } });
  };

  const enviarReview = async () => {
    if (!slug || !producto?.id || reviewSending) return;
    if (!reviewForm.clienteNombre.trim() || !reviewForm.comentario.trim()) {
      alert('Completa tu nombre y comentario para enviar la reseña.');
      return;
    }
    setReviewSending(true);
    try {
      await axios.post(
        `${BASE_URL}/public/store/${slug}/products/${producto.id}/reviews`,
        reviewForm
      );
      setReviewForm({
        clienteNombre: '',
        clienteTelefono: '',
        clienteEmail: '',
        codigoSeguimiento: '',
        rating: 5,
        comentario: '',
      });
      setShowReviewSuccess(true);
    } catch (err: any) {
      alert(err?.response?.data?.message || 'No se pudo enviar la reseña.');
    } finally {
      setReviewSending(false);
    }
  };

  /* ── Derived values ── */
  const diseno = tienda?.diseno || {};
  const cp = diseno.colorPrimario || '#1A1A1A';
  const fontFamily = 'Poppins';
  const tiendaNombre = tienda?.nombreComercial || tienda?.nombre || 'Styliq';

  /* ── Loading state ── */
  if (loading) return <LoadingSkeleton />;

  if (!producto || !tienda) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAF9F6]">
        <div className="text-center">
          <Icon icon="mdi:alert-circle-outline" className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Producto no encontrado</h2>
          <button onClick={() => navigate(`/tienda/${slug}`)} className="text-gray-600 hover:underline">
            Volver a la tienda
          </button>
        </div>
      </div>
    );
  }

  const variantOptionNames = getVariantOptionNames(producto);
  const variantColors = getFashionColors(producto);
  const variantSizes = getFashionSizes(producto);
  const selectedColor = varianteSelecciones[variantOptionNames.color] || variantColors[0]?.name || '';
  const selectedColorGallery = selectedColor ? getFashionColorGallery(producto, selectedColor) : [];
  const price = Number(varianteActiva?.precioUnitario ?? producto.precioUnitario ?? 0);
  const originalPrice = Number(producto.precioOriginal || 0);
  const hasDiscount = originalPrice > 0 && originalPrice > price;
  const discountPct = hasDiscount ? Math.round((1 - price / originalPrice) * 100) : 0;
  const finalPrice = price + precioExtra;
  const currentStock = Number(varianteActiva?.stock ?? producto?.stock ?? 0);
  const isUnavailableVariant = Array.isArray(producto.variantes) && producto.variantes.length > 0 && !varianteActiva;
  const isOutOfStock = isUnavailableVariant || currentStock <= 0;
  const esServicio = String(producto?.atributosTecnicos?.tipoProducto || '').toUpperCase() === 'SERVICIO';
  const ratingCount = reviewSummary.ratingCount || Number(producto.ratingCount || 0);
  const starRating = ratingCount > 0 ? Number(reviewSummary.ratingAvg || producto.ratingAvg || 0) : 0;
  const productImages = (() => {
    const urls = [
      ...selectedColorGallery,
      producto.imagenUrl,
      ...(Array.isArray(producto.imagenes) ? producto.imagenes : []),
      ...(Array.isArray(producto.imagenesExtra) ? producto.imagenesExtra : []),
    ].filter(Boolean);
    const seen = new Set<string>();
    return urls.filter((url: string) => {
      const key = (() => {
        try { return new URL(url).pathname; } catch { return url; }
      })();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  })();
  const cartCount = carrito.reduce((s, i) => s + Number(i.cantidad || 1), 0);

  /* ── Color modifier helper ── */
  const isColorGroup = (g: any) =>
    /color|colour|color/i.test(g.nombre) && g.opciones.some((op: any) => op.colorHex);

  /* ── Size modifier helper ── */
  const isSizeGroup = (g: any) =>
    /talla|size|tamaño/i.test(g.nombre);

  /* ── Galería como slide (swipe en mobile) + scroll al elegir color ── */
  const urlPath = (url: string) => {
    try { return new URL(url).pathname; } catch { return url; }
  };

  const handleThumbnailClick = (image: string) => {
    const matched = Array.isArray(producto?.variantes)
      ? producto.variantes.find((v: any) => v.imagenUrl && urlPath(v.imagenUrl) === urlPath(image))
      : null;
    const color = matched ? variantValues(matched)[variantOptionNames.color] : null;
    if (color) handleVariantChange(variantOptionNames.color, color);
    else setSelectedImage(image);
  };

  const currentImageIndex = Math.max(
    0,
    productImages.findIndex((img: string) => urlPath(img) === urlPath(selectedImage)),
  );

  const goToImage = (index: number) => {
    if (productImages.length < 2) return;
    const total = productImages.length;
    const next = ((index % total) + total) % total;
    setImgDirection(index >= currentImageIndex ? 1 : -1);
    handleThumbnailClick(productImages[next]);
  };

  const handleImageDragEnd = (_e: unknown, info: PanInfo) => {
    const threshold = 60;
    if (info.offset.x < -threshold) goToImage(currentImageIndex + 1);
    else if (info.offset.x > threshold) goToImage(currentImageIndex - 1);
  };

  const scrollToImageTop = () => {
    if (typeof window === 'undefined' || window.innerWidth >= 1024) return;
    requestAnimationFrame(() => {
      const el = imageColumnRef.current;
      const top = el ? el.getBoundingClientRect().top + window.scrollY - 8 : 0;
      window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
    });
  };

  const selectVariantColor = (colorName: string) => {
    handleVariantChange(variantOptionNames.color, colorName);
    scrollToImageTop();
  };

  return (
    <div
      className="min-h-screen bg-[#FAF9F6] text-gray-900"
      style={{ fontFamily: `'${fontFamily}', sans-serif` }}
    >
      {/* ── Header ── */}
      <ModaHeader
        tienda={tienda}
        slug={slug || ''}
        cp={cp}
        carritoSize={cartCount}
        onOpenCart={() => setMostrarCarrito(!mostrarCarrito)}
        searchQuery={search}
        setSearchQuery={setSearch}
        onSearchSubmit={e => {
          e.preventDefault();
          const q = search.trim();
          if (q) navigate(`/tienda/${slug}/catalogo?search=${encodeURIComponent(q)}`);
        }}
        allCategories={allCategories}
      />

      <main className="w-full max-w-7xl mx-auto px-4 xl:px-8 py-8">

        {/* ── Breadcrumb ── */}
        <nav className="flex items-center gap-1.5 text-xs text-gray-400 mb-8">
          <button
            onClick={() => navigate(`/tienda/${slug}`)}
            className="hover:text-gray-700 transition-colors font-medium"
          >
            Inicio
          </button>
          <Icon icon="solar:alt-arrow-right-linear" width={12} />
          <button
            onClick={() => navigate(`/tienda/${slug}/catalogo`)}
            className="hover:text-gray-700 transition-colors font-medium"
          >
            Catálogo
          </button>
          <Icon icon="solar:alt-arrow-right-linear" width={12} />
          <span className="font-semibold text-gray-700 truncate max-w-[160px]">
            {producto.descripcion}
          </span>
        </nav>

        {/* ── Main Product Grid ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16">

          {/* ── LEFT: Images ── */}
          <div className="flex flex-col gap-4">
            {/* Main image */}
            <div ref={imageColumnRef} className="relative overflow-hidden rounded-3xl bg-[#F5F0EB] aspect-[4/5]">
              {selectedImage ? (
                <AnimatePresence initial={false} custom={imgDirection} mode="popLayout">
                  <motion.img
                    key={selectedImage}
                    src={selectedImage}
                    alt={producto.descripcion}
                    custom={imgDirection}
                    variants={imageSlideVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                    drag={productImages.length > 1 ? 'x' : false}
                    dragConstraints={{ left: 0, right: 0 }}
                    dragElastic={0.18}
                    onDragEnd={handleImageDragEnd}
                    draggable={false}
                    className="absolute inset-0 w-full h-full object-cover select-none touch-pan-y lg:touch-auto"
                  />
                </AnimatePresence>
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Icon icon="solar:box-linear" className="text-gray-300 text-7xl" />
                </div>
              )}
              {productImages.length > 1 && (
                <div className="absolute bottom-3 left-0 right-0 z-10 flex justify-center gap-1.5 lg:hidden">
                  {productImages.slice(0, 5).map((img: string, i: number) => (
                    <button
                      key={i}
                      onClick={() => goToImage(i)}
                      aria-label={`Ver imagen ${i + 1}`}
                      className="p-1.5"
                    >
                      <motion.span
                        animate={{
                          width: urlPath(selectedImage) === urlPath(img) ? 20 : 6,
                          opacity: urlPath(selectedImage) === urlPath(img) ? 1 : 0.4,
                        }}
                        transition={{ duration: 0.3 }}
                        className="block h-1.5 rounded-full bg-gray-900"
                      />
                    </button>
                  ))}
                </div>
              )}
              {hasDiscount && (
                <span
                  className="absolute top-4 left-4 text-[10px] font-black text-white px-3 py-1.5 rounded-full tracking-wider"
                  style={{ backgroundColor: cp }}
                >
                  -{discountPct}% OFF
                </span>
              )}
              {/* Favorite button */}
              <button
                onClick={() =>
                  toggleFavorito({
                    id: producto.id,
                    descripcion: producto.descripcion,
                    precioUnitario: finalPrice,
                    imagenUrl: producto.imagenUrl,
                    slug: slug || '',
                  })
                }
                className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/90 backdrop-blur-sm shadow flex items-center justify-center hover:scale-110 transition-transform"
                title={isFavorito(producto.id, slug || '') ? 'Quitar de favoritos' : 'Añadir a favoritos'}
              >
                <Icon
                  icon={isFavorito(producto.id, slug || '') ? 'solar:heart-bold' : 'solar:heart-linear'}
                  width={20}
                  className={isFavorito(producto.id, slug || '') ? 'text-red-500' : 'text-gray-600'}
                />
              </button>
            </div>

            {/* Thumbnails */}
            {productImages.length > 1 && (
              <div className="flex gap-3 overflow-x-auto pb-1">
                {productImages.slice(0, 5).map((img: string, i: number) => (
                  <motion.button
                    key={i}
                    onClick={() => handleThumbnailClick(img)}
                    whileTap={{ scale: 0.92 }}
                    className="flex-shrink-0 w-20 h-20 rounded-2xl overflow-hidden border-2 transition-all"
                    style={{
                      borderColor:
                        urlPath(selectedImage) === urlPath(img) || (!selectedImage && i === 0)
                          ? '#1A1A1A'
                          : '#E5E7EB',
                    }}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover bg-[#F5F0EB]" draggable={false} />
                  </motion.button>
                ))}
              </div>
            )}
          </div>

          {/* ── RIGHT: Product Info ── */}
          <div className="flex flex-col pt-1">

            {/* Brand / Store tag */}
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-gray-400 mb-2">
              {tiendaNombre}
            </p>

            {/* Title */}
            <h1 className="text-2xl sm:text-3xl font-black text-gray-900 leading-tight mb-3">
              {producto.descripcion}
            </h1>

            {/* Ratings row */}
            {ratingCount > 0 && (
              <div className="flex items-center gap-2 mb-4">
                <Stars rating={starRating} size={16} />
                <span className="text-xs text-gray-500 font-medium">
                  {starRating.toFixed(1)} ({ratingCount} reseñas)
                </span>
              </div>
            )}

            {/* Price */}
            <div className="flex items-baseline gap-3 mb-5">
              <span className="text-3xl font-black text-gray-900">
                S/ {finalPrice.toFixed(2)}
              </span>
              {hasDiscount && (
                <>
                  <span className="text-lg text-gray-400 line-through font-medium">
                    S/ {originalPrice.toFixed(2)}
                  </span>
                  <span
                    className="text-xs font-black text-white px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: cp }}
                  >
                    -{discountPct}%
                  </span>
                </>
              )}
            </div>

            {/* Stock badge */}
            <div className="flex items-center gap-2 mb-6">
              {isOutOfStock ? (
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-red-500 bg-red-50 px-3 py-1.5 rounded-full">
                  <Icon icon="solar:close-circle-bold" width={14} /> Agotado
                </span>
              ) : esServicio ? (
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-violet-600 bg-violet-50 px-3 py-1.5 rounded-full">
                  <Icon icon="solar:shield-check-bold" width={14} /> Disponible
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-full">
                  <Icon icon="solar:check-circle-bold" width={14} /> En Stock ({currentStock})
                </span>
              )}
            </div>

            {variantColors.length > 0 && (
              <div className="mb-5">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-xs font-bold uppercase tracking-widest text-gray-500">Color</p>
                  <p className="text-xs font-semibold text-gray-700">{selectedColor}</p>
                </div>
                <div className="flex flex-wrap gap-2.5">
                  {variantColors.map((color) => {
                    const isSelected = selectedColor === color.name;
                    const colorPreview = color.image || getFashionColorGallery(producto, color.name)[0];
                    return (
                      <motion.button
                        key={color.name}
                        type="button"
                        title={color.name}
                        onClick={() => selectVariantColor(color.name)}
                        whileTap={{ scale: 0.9 }}
                        animate={{ scale: isSelected ? 1.06 : 1 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 22 }}
                        className="h-14 w-14 overflow-hidden rounded-xl border-2 bg-white"
                        style={{
                          borderColor: isSelected ? '#1A1A1A' : '#E5E7EB',
                          boxShadow: isSelected ? '0 0 0 2px #fff, 0 0 0 4px #1A1A1A' : 'none',
                        }}
                      >
                        {colorPreview ? (
                          <img src={colorPreview} alt={color.name} className="h-full w-full object-cover" draggable={false} />
                        ) : (
                          <span className="block h-full w-full" style={{ backgroundColor: color.hex }} />
                        )}
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            )}

            {variantSizes.length > 0 && (
              <div className="mb-5">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-xs font-bold uppercase tracking-widest text-gray-500">
                    Talla: {varianteSelecciones[variantOptionNames.size] || ''}
                  </p>
                  <button className="text-xs font-semibold text-gray-500 underline underline-offset-2 hover:text-gray-900 transition-colors">
                    Ver guía de tallas
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {variantSizes.map((size) => {
                    const isSelected = varianteSelecciones[variantOptionNames.size] === size;
                    const isAvailable = isFashionVariantAvailable(producto, {
                      ...varianteSelecciones,
                      [variantOptionNames.size]: size,
                    });
                    return (
                      <button
                        key={size}
                        type="button"
                        disabled={!isAvailable}
                        onClick={() => handleVariantChange(variantOptionNames.size, size)}
                        className="min-w-[2.75rem] h-10 px-3 rounded-xl border-2 text-sm font-bold transition-all hover:border-gray-900 disabled:cursor-not-allowed disabled:opacity-35"
                        style={{
                          borderColor: isSelected ? '#1A1A1A' : '#E5E7EB',
                          backgroundColor: isSelected ? '#1A1A1A' : '#fff',
                          color: isSelected ? '#fff' : '#374151',
                        }}
                      >
                        {size}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Color modifiers — custom swatch UI */}
            {modificadoresProducto.filter(isColorGroup).map(grupo => (
              <div key={grupo.id} className="mb-5">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-bold uppercase tracking-widest text-gray-500">
                    {grupo.nombre}
                  </p>
                  {(selecciones[grupo.id] || []).length > 0 && (
                    <p className="text-xs font-semibold text-gray-700">
                      {grupo.opciones.find((op: any) => selecciones[grupo.id]?.includes(op.id))?.nombre}
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap gap-2.5">
                  {grupo.opciones.map((op: any) => {
                    const isSelected = (selecciones[grupo.id] || []).includes(op.id);
                    return (
                      <motion.button
                        key={op.id}
                        title={op.nombre}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => {
                          setSelecciones(prev => ({
                            ...prev,
                            [grupo.id]:
                              grupo.seleccionMax === 1
                                ? [op.id]
                                : isSelected
                                ? (prev[grupo.id] || []).filter((x: number) => x !== op.id)
                                : [...(prev[grupo.id] || []), op.id],
                          }));
                          scrollToImageTop();
                        }}
                        className="relative w-8 h-8 rounded-full border-2 transition-all hover:scale-110 focus:outline-none"
                        style={{
                          backgroundColor: op.colorHex || '#E5E7EB',
                          borderColor: isSelected ? '#1A1A1A' : 'transparent',
                          boxShadow: isSelected ? '0 0 0 2px #fff, 0 0 0 4px #1A1A1A' : 'none',
                        }}
                      >
                        {isSelected && (
                          <Icon
                            icon="mdi:check"
                            width={12}
                            className="absolute inset-0 m-auto text-white drop-shadow"
                          />
                        )}
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* Size modifiers — pill buttons */}
            {modificadoresProducto.filter(isSizeGroup).map(grupo => (
              <div key={grupo.id} className="mb-5">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-bold uppercase tracking-widest text-gray-500">
                    {grupo.nombre}
                  </p>
                  <button className="text-xs font-semibold text-gray-500 underline underline-offset-2 hover:text-gray-900 transition-colors">
                    Ver guía de tallas
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {grupo.opciones.map((op: any) => {
                    const isSelected = (selecciones[grupo.id] || []).includes(op.id);
                    return (
                      <button
                        key={op.id}
                        onClick={() =>
                          setSelecciones(prev => ({
                            ...prev,
                            [grupo.id]:
                              grupo.seleccionMax === 1
                                ? [op.id]
                                : isSelected
                                ? (prev[grupo.id] || []).filter((x: number) => x !== op.id)
                                : [...(prev[grupo.id] || []), op.id],
                          }))
                        }
                        className="min-w-[2.75rem] h-10 px-3 rounded-xl border-2 text-sm font-bold transition-all hover:border-gray-900"
                        style={{
                          borderColor: isSelected ? '#1A1A1A' : '#E5E7EB',
                          backgroundColor: isSelected ? '#1A1A1A' : '#fff',
                          color: isSelected ? '#fff' : '#374151',
                        }}
                      >
                        {op.nombre}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* Other modifiers via standard component */}
            {modificadoresProducto.filter(g => !isColorGroup(g) && !isSizeGroup(g)).length > 0 && (
              <div className="mb-5">
                <ProductModifiersSelector
                  modifiers={modificadoresProducto.filter(g => !isColorGroup(g) && !isSizeGroup(g))}
                  selections={selecciones}
                  onChange={setSelecciones}
                />
              </div>
            )}

            {/* Quantity + Add to bag */}
            <div className="flex items-center gap-3 mb-4">
              {/* Quantity */}
              <div className="flex items-center bg-gray-100 rounded-xl px-1 py-1 gap-1 border border-gray-200">
                <button
                  onClick={() => setCantidad(Math.max(1, cantidad - 1))}
                  className="w-9 h-9 rounded-lg flex items-center justify-center text-gray-500 hover:bg-white hover:text-gray-900 transition-all font-bold text-lg"
                >
                  −
                </button>
                <span className="w-9 text-center font-black text-gray-900 text-sm">{cantidad}</span>
                <button
                  onClick={() =>
                    setCantidad(esServicio ? cantidad + 1 : Math.min(currentStock || 99, cantidad + 1))
                  }
                  className="w-9 h-9 rounded-lg flex items-center justify-center text-gray-500 hover:bg-white hover:text-gray-900 transition-all font-bold text-lg"
                >
                  +
                </button>
              </div>

              {/* Favorite shortcut */}
              <button
                onClick={() =>
                  toggleFavorito({
                    id: producto.id,
                    descripcion: producto.descripcion,
                    precioUnitario: finalPrice,
                    imagenUrl: producto.imagenUrl,
                    slug: slug || '',
                  })
                }
                className="w-12 h-12 rounded-xl border-2 border-gray-200 flex items-center justify-center hover:border-gray-900 transition-all"
              >
                <Icon
                  icon={isFavorito(producto.id, slug || '') ? 'solar:heart-bold' : 'solar:heart-linear'}
                  width={20}
                  className={isFavorito(producto.id, slug || '') ? 'text-red-500' : 'text-gray-600'}
                />
              </button>

              {/* Add to bag button */}
              <button
                disabled={isOutOfStock}
                onClick={addToCart}
                className="flex-1 h-12 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all hover:opacity-90 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                style={
                  isOutOfStock
                    ? { backgroundColor: '#E5E7EB', color: '#9CA3AF' }
                    : { backgroundColor: '#1A1A1A', color: '#fff' }
                }
              >
                <Icon
                  icon={isOutOfStock ? 'solar:close-circle-bold' : 'solar:bag-3-bold'}
                  width={18}
                />
                {isOutOfStock ? 'Agotado' : 'Añadir a la bolsa'}
              </button>
            </div>

            {/* Buy now */}
            {!isOutOfStock && (
              <button
                onClick={() => {
                  addToCart();
                  setTimeout(() => irACheckout(), 100);
                }}
                className="w-full h-12 rounded-xl border-2 border-gray-900 text-gray-900 font-bold text-sm flex items-center justify-center gap-2 hover:bg-gray-900 hover:text-white transition-all mb-6 active:scale-95"
              >
                <Icon icon="solar:lightning-bolt-bold" width={16} />
                Comprar ahora
              </button>
            )}

            {/* Delivery info cards */}
            <div className="space-y-2 mb-5">
              <div className="flex items-center gap-3 bg-white rounded-2xl p-3.5 border border-gray-100">
                <div className="w-9 h-9 rounded-xl bg-gray-50 flex items-center justify-center flex-shrink-0">
                  <Icon icon="solar:delivery-bold-duotone" width={20} className="text-gray-700" />
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-900">Entrega rápida</p>
                  <p className="text-[11px] text-gray-500">Coordinada directamente con la tienda</p>
                </div>
              </div>
              <div className="flex items-center gap-3 bg-white rounded-2xl p-3.5 border border-gray-100">
                <div className="w-9 h-9 rounded-xl bg-gray-50 flex items-center justify-center flex-shrink-0">
                  <Icon icon="solar:refresh-bold-duotone" width={20} className="text-gray-700" />
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-900">Cambios y devoluciones</p>
                  <p className="text-[11px] text-gray-500">Devoluciones fáciles dentro de 7 días</p>
                </div>
              </div>
              <div className="flex items-center gap-3 bg-white rounded-2xl p-3.5 border border-gray-100">
                <div className="w-9 h-9 rounded-xl bg-gray-50 flex items-center justify-center flex-shrink-0">
                  <Icon icon="solar:shield-check-bold-duotone" width={20} className="text-gray-700" />
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-900">Pago seguro</p>
                  <p className="text-[11px] text-gray-500">Atención y soporte vía WhatsApp</p>
                </div>
              </div>
            </div>

            {/* Meta info */}
            <div className="text-xs text-gray-400 space-y-1 border-t border-gray-100 pt-4">
              {producto.codigo && (
                <p><span className="font-semibold text-gray-500">SKU:</span> {producto.codigo}</p>
              )}
              {producto.categoria && (
                <p>
                  <span className="font-semibold text-gray-500">Categoría:</span>{' '}
                  {typeof producto.categoria === 'object' ? producto.categoria?.nombre : producto.categoria}
                </p>
              )}
              {producto.marca && (
                <p>
                  <span className="font-semibold text-gray-500">Marca:</span>{' '}
                  {typeof producto.marca === 'object' ? producto.marca?.nombre : producto.marca}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* ── Description ── */}
        {producto.descripcionLarga && (
          <section className="mt-14 rounded-3xl border border-gray-100 bg-white overflow-hidden shadow-sm">
            <div className="flex items-center gap-3 px-6 py-5 border-b border-gray-100">
              <div className="w-8 h-8 rounded-xl bg-gray-900 text-white flex items-center justify-center">
                <Icon icon="solar:document-text-bold-duotone" width={15} />
              </div>
              <h2 className="text-xs font-bold uppercase tracking-widest text-gray-500">
                Descripción del producto
              </h2>
            </div>
            <div
              className={`px-6 py-6 ${QUILL_PROSE}`}
              dangerouslySetInnerHTML={{ __html: producto.descripcionLarga }}
            />
          </section>
        )}

        {/* ── Reviews section ── */}
        <section id="review-form" className="mt-10 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          {/* Reviews list */}
          <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-black text-gray-900">Opiniones de clientes</h2>
                <p className="text-sm text-gray-400 mt-0.5">Solo comentarios verificados</p>
              </div>
              {ratingCount > 0 && (
                <div className="text-right shrink-0">
                  <Stars rating={starRating} size={17} />
                  <p className="text-xs font-semibold text-gray-500 mt-1">
                    {starRating.toFixed(1)} / 5 · {ratingCount} reseñas
                  </p>
                </div>
              )}
            </div>

            {reviews.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-8 text-center">
                <Icon icon="solar:chat-round-like-bold-duotone" width={36} className="mx-auto mb-3 text-gray-300" />
                <p className="text-sm font-bold text-gray-700">Sin reseñas aún.</p>
                <p className="text-xs text-gray-500 mt-1">Sé el primero en compartir tu experiencia.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {reviews.map(review => (
                  <article key={review.id} className="rounded-2xl border border-gray-100 p-4">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div>
                        <p className="font-bold text-gray-900 text-sm">{review.clienteNombre}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Stars rating={Number(review.rating || 0)} size={13} />
                          {review.compraVerificada && (
                            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                              Verificada
                            </span>
                          )}
                        </div>
                      </div>
                      {review.createdAt && (
                        <span className="text-[11px] text-gray-400 shrink-0">
                          {new Date(review.createdAt).toLocaleDateString('es-PE', {
                            day: 'numeric', month: 'short', year: 'numeric',
                          })}
                        </span>
                      )}
                    </div>
                    {review.comentario && (
                      <p className="text-sm text-gray-600 leading-relaxed">{review.comentario}</p>
                    )}
                  </article>
                ))}
              </div>
            )}
          </div>

          {/* Review form */}
          <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm h-fit">
            <h3 className="text-base font-black text-gray-900 mb-1">Deja tu reseña</h3>
            <p className="text-xs text-gray-400 mb-5">
              Tu opinión ayuda a otros compradores
            </p>

            {/* Star selector */}
            <div className="mb-4">
              <p className="text-xs font-bold text-gray-500 mb-2 uppercase tracking-widest">Puntuación</p>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map(s => (
                  <button
                    key={s}
                    onClick={() => setReviewForm(prev => ({ ...prev, rating: s }))}
                    className="transition-transform hover:scale-110"
                  >
                    <Icon
                      icon={s <= reviewForm.rating ? 'solar:star-bold' : 'solar:star-outline'}
                      width={28}
                      style={{ color: s <= reviewForm.rating ? '#1A1A1A' : '#D1D5DB' }}
                    />
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Nombre *</label>
                <input
                  type="text"
                  value={reviewForm.clienteNombre}
                  onChange={e => setReviewForm(prev => ({ ...prev, clienteNombre: e.target.value }))}
                  placeholder="Tu nombre"
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm focus:outline-none focus:border-gray-900 focus:bg-white transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Comentario *</label>
                <textarea
                  value={reviewForm.comentario}
                  onChange={e => setReviewForm(prev => ({ ...prev, comentario: e.target.value }))}
                  placeholder="¿Qué te pareció el producto?"
                  rows={4}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm focus:outline-none focus:border-gray-900 focus:bg-white transition-colors resize-none"
                />
              </div>
              <button
                disabled={reviewSending}
                onClick={enviarReview}
                className="w-full h-11 rounded-xl text-white text-sm font-bold transition-all hover:opacity-90 active:scale-95 disabled:opacity-50"
                style={{ backgroundColor: '#1A1A1A' }}
              >
                {reviewSending ? (
                  <span className="flex items-center justify-center gap-2">
                    <Icon icon="eos-icons:loading" width={16} className="animate-spin" />
                    Enviando...
                  </span>
                ) : (
                  'Publicar reseña'
                )}
              </button>
            </div>
          </div>
        </section>

        {/* ── You May Also Like ── */}
        {related.length > 0 && (
          <section className="mt-16">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-2xl font-black text-gray-900">También te puede gustar</h2>
              <button
                onClick={() => navigate(`/tienda/${slug}/catalogo`)}
                className="text-sm font-bold flex items-center gap-1 hover:gap-2 transition-all text-gray-600 hover:text-gray-900"
              >
                Ver todo <Icon icon="solar:arrow-right-linear" width={14} />
              </button>
            </div>
            <p className="text-sm text-gray-400 mb-8">
              Estilos curados, piezas premium y tendencias de moda para expresar tu estilo único.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
              {related.map(p => (
                <ModaRelatedCard
                  key={p.id}
                  product={p}
                  slug={slug || ''}
                  cp={cp}
                  onNavigate={() => navigate(`/tienda/${slug}/producto/${p.id}`)}
                />
              ))}
            </div>
          </section>
        )}
      </main>

      {/* ── Footer ── */}
      <ModaFooter tiendaNombre={tiendaNombre} />

      {/* ── Cart ── */}
      <ModaCartModal
        isOpen={mostrarCarrito}
        onClose={() => setMostrarCarrito(false)}
        carrito={carrito}
        tienda={tienda || {}}
        actualizarCantidad={actualizarCantidad}
        onCheckout={irACheckout}
        slug={slug || ''}
        setCarrito={setCarrito}
      />

      {/* Review success modal */}
      <ReviewFeedbackModal
        isOpen={showReviewSuccess}
        onClose={() => setShowReviewSuccess(false)}
      />
    </div>
  );
}
