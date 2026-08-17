import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Icon } from '@iconify/react';
import axios from 'axios';
import XtraHeader from '@/components/tienda/XtraHeader';
import ProductCardXtra from '@/components/tienda/ProductCardXtra';
import Footer from '@/components/tienda/Footer';
import GadgetsCartModal from '@/components/tienda/GadgetsCartModal';
import ProductModifiersSelector from '@/components/tienda/ProductModifiersSelector';
import ReviewFeedbackModal from '@/components/tienda/ReviewFeedbackModal';
import { useFavoritosStore } from '@/zustand/favoritos';
import { useCompareStore } from '@/zustand/compare';
import { onTiendaCartCleared } from '@/utils/tiendaCart';
import { withPricing, withPricingList } from '@/templates/shared/pricing';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4001/api';

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
  '[&_a]:underline [&_a]:text-blue-600',
  '[&_table]:w-full [&_table]:text-xs [&_table]:border-collapse [&_table]:mb-4',
  '[&_td]:border [&_td]:border-gray-200 [&_td]:px-3 [&_td]:py-2',
  '[&_th]:border [&_th]:border-gray-200 [&_th]:px-3 [&_th]:py-2 [&_th]:bg-gray-50 [&_th]:font-bold',
].join(' ');

function GadgetsDescripcion({ descripcionLarga, cp: _cp }: { descripcionLarga: string; cp: string }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="mt-10 rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
      {/* Header — mismo estilo que ficha técnica */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-white hover:bg-gray-50 transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-900 text-white">
            <Icon icon="solar:document-text-bold-duotone" width={16} />
          </div>
          <span className="text-xs font-bold uppercase tracking-widest text-gray-500">Descripción completa</span>
        </div>
        <Icon
          icon="solar:alt-arrow-down-bold"
          width={15}
          className="text-gray-400 transition-transform duration-200 shrink-0"
          style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
        />
      </button>
      {open && (
        <div className={`px-6 py-5 ${QUILL_PROSE}`} dangerouslySetInnerHTML={{ __html: descripcionLarga }} />
      )}
    </div>
  );
}

function useVisible() {
  const [v, setV] = useState(() => window.innerWidth < 640 ? 1 : window.innerWidth < 1024 ? 2 : 3);
  useEffect(() => {
    const fn = () => setV(window.innerWidth < 640 ? 1 : window.innerWidth < 1024 ? 2 : 3);
    window.addEventListener('resize', fn);
    return () => window.removeEventListener('resize', fn);
  }, []);
  return v;
}

function ProductSlider3({
  products, slug, diseno, cp, onAddToCart, onClickProduct,
}: {
  products: any[]; slug: string; diseno: any; cp: string;
  onAddToCart: (p: any) => void; onClickProduct: (p: any) => void;
}) {
  const VISIBLE = useVisible();
  const items = products.slice(0, 12);
  const N = items.length;
  const totalPages = Math.max(1, Math.ceil(N / VISIBLE));
  const [page, setPage] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => { setPage(0); }, [VISIBLE]);

  useEffect(() => {
    if (paused || N <= VISIBLE) return;
    const t = setInterval(() => setPage(p => (p + 1) % totalPages), 3500);
    return () => clearInterval(t);
  }, [paused, totalPages, N, VISIBLE]);

  if (N === 0) return null;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-black text-gray-900">Productos similares</h2>
        <div className="flex items-center gap-2">
          {totalPages > 1 && (
            <div className="flex items-center gap-1.5 mr-1">
              {Array.from({ length: totalPages }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => setPage(i)}
                  className="rounded-full transition-all duration-300"
                  style={{ width: i === page ? 18 : 6, height: 6, background: i === page ? cp : '#D1D5DB' }}
                />
              ))}
            </div>
          )}
          <button
            onClick={() => setPage(p => (p - 1 + totalPages) % totalPages)}
            className="w-9 h-9 rounded-full border-2 border-gray-200 bg-white flex items-center justify-center hover:border-gray-400 transition-colors"
          >
            <Icon icon="solar:alt-arrow-left-bold" width={14} className="text-gray-500" />
          </button>
          <button
            onClick={() => setPage(p => (p + 1) % totalPages)}
            className="w-9 h-9 rounded-full border-2 flex items-center justify-center text-white transition-colors"
            style={{ background: cp, borderColor: cp }}
          >
            <Icon icon="solar:alt-arrow-right-bold" width={14} />
          </button>
        </div>
      </div>

      {/* Track */}
      <div
        className="overflow-hidden"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        <div
          className="flex transition-transform duration-500 ease-in-out"
          style={{
            width: `${(N / VISIBLE) * 100}%`,
            transform: `translateX(-${page * (VISIBLE / N) * 100}%)`,
          }}
        >
          {items.map(p => (
            <div key={p.id} className="px-2" style={{ width: `${100 / N}%` }}>
              <ProductCardXtra
                producto={p}
                slug={slug}
                diseno={diseno}
                onAddToCart={() => onAddToCart(p)}
                onClick={() => onClickProduct(p)}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ReviewStars({ rating, size = 16 }: { rating: number; size?: number }) {
  return (
    <div className="flex items-center gap-0.5 text-[#FFB020]">
      {Array.from({ length: 5 }).map((_, index) => (
        <Icon
          key={index}
          icon={index < Math.round(rating) ? 'solar:star-bold' : 'solar:star-line-duotone'}
          width={size}
          height={size}
        />
      ))}
    </div>
  );
}

export default function GadgetsProductoDetalle() {
  const { slug, id } = useParams();
  const navigate = useNavigate();

  const [producto, setProducto] = useState<any>(null);
  const [tienda, setTienda] = useState<any>(null);
  const [relatedProducts, setRelatedProducts] = useState<any[]>([]);
  const [searchProducts, setSearchProducts] = useState<any[]>([]);
  const [allCategories, setAllCategories] = useState<any[]>([]);
  const [modificadoresProducto, setModificadoresProducto] = useState<any[]>([]);
  const [selecciones, setSelecciones] = useState<Record<number, number[]>>({});
  const [loading, setLoading] = useState(true);
  const [cantidad, setCantidad] = useState(1);
  const [carrito, setCarrito] = useState<any[]>([]);
  const [selectedImage, setSelectedImage] = useState('');
  const [mostrarCarrito, setMostrarCarrito] = useState(false);
  const [search, setSearch] = useState('');
  const [zoomOpen, setZoomOpen] = useState(false);
  const [showCompareModal, setShowCompareModal] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [showReviewSuccess, setShowReviewSuccess] = useState(false);
  const [reviews, setReviews] = useState<any[]>([]);
  const [reviewSummary, setReviewSummary] = useState({ ratingAvg: 0, ratingCount: 0 });
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
  const { toggle: toggleCompare, isInCompare, getBySlug, clear: clearCompare } = useCompareStore();
  const adminMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (adminMenuRef.current && !adminMenuRef.current.contains(e.target as Node)) setIsAdminOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    const cargar = async () => {
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
        if (prod.imagenUrl) setSelectedImage(prod.imagenUrl);

        try {
          const reviewsRes = await axios.get(`${BASE_URL}/public/store/${slug}/products/${prod.id}/reviews`);
          const payload = reviewsRes.data.data || reviewsRes.data;
          setReviews(Array.isArray(payload?.reviews) ? payload.reviews : []);
          setReviewSummary({
            ratingAvg: Number(payload?.ratingAvg || 0),
            ratingCount: Number(payload?.ratingCount || 0),
          });
        } catch {
          setReviews([]);
          setReviewSummary({ ratingAvg: 0, ratingCount: 0 });
        }

        try {
          const modsRes = await axios.get(`${BASE_URL}/public/store/${slug}/products/${prod.id}/modifiers`);
          const mods = modsRes.data.data || modsRes.data || [];
          setModificadoresProducto(mods);
          const defaults: Record<number, number[]> = {};
          mods.forEach((grupo: any) => {
            const defs = grupo.opciones.filter((op: any) => op.esDefault).map((op: any) => op.id);
            if (grupo.esObligatorio && grupo.seleccionMax === 1 && defs.length === 0 && grupo.opciones.length > 0) {
              defaults[grupo.id] = [grupo.opciones[0].id];
            } else {
              defaults[grupo.id] = defs;
            }
          });
          setSelecciones(defaults);
        } catch { }

        try {
          const catsRes = await axios.get(`${BASE_URL}/public/store/${slug}/categories`);
          const cats = catsRes.data?.data || [];
          setAllCategories(Array.isArray(cats) ? cats : []);
        } catch { }

        try {
          const productsRes = await axios.get(`${BASE_URL}/public/store/${slug}/products`, { params: { limit: 60 } });
          const products = productsRes.data?.data || productsRes.data || [];
          setSearchProducts(Array.isArray(products) ? withPricingList(products) : []);
        } catch { }

        try {
          const relRes = await axios.get(`${BASE_URL}/public/store/${slug}/products/${id}/related`);
          const rel = relRes.data.data || relRes.data;
          setRelatedProducts(Array.isArray(rel) ? withPricingList(rel) : []);
        } catch { }
      } catch (e) {
        console.error('Error cargando producto gadgets:', e);
      } finally {
        setLoading(false);
      }
    };
    if (slug && id) cargar();

    try {
      const saved = localStorage.getItem(`tienda:${slug}:carrito`);
      if (saved) setCarrito(JSON.parse(saved));
    } catch { }
  }, [slug, id]);

  useEffect(() => {
    if (!slug) return;
    return onTiendaCartCleared(slug, () => {
      setCarrito([]);
      setMostrarCarrito(false);
    });
  }, [slug]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('review') !== '1') return;

    setReviewForm((prev) => ({
      ...prev,
      clienteNombre: params.get('nombre') || prev.clienteNombre,
      clienteTelefono: params.get('telefono') || prev.clienteTelefono,
      codigoSeguimiento: params.get('codigo') || prev.codigoSeguimiento,
    }));

    window.setTimeout(() => {
      document.getElementById('producto-review-form')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 450);
  }, [id]);

  const precioExtra = modificadoresProducto.reduce((total, grupo) => {
    return total + grupo.opciones
      .filter((op: any) => (selecciones[grupo.id] || []).includes(op.id))
      .reduce((s: number, op: any) => s + Number(op.precioExtra || 0), 0);
  }, 0);

  const agregarAlCarritoDirecto = (prodToAdd: any, qty: number, modificadores?: any[]) => {
    const itemEsServicio = String(prodToAdd?.atributosTecnicos?.tipoProducto || '').toUpperCase() === 'SERVICIO';
    const q = itemEsServicio ? Math.max(1, Number(qty) || 1) : Math.max(1, Math.min(Number(qty) || 1, prodToAdd?.stock || 1));
    const pExtra = modificadores?.reduce((s: number, m: any) => s + Number(m.precioExtra || 0), 0) || 0;
    const itemId = modificadores?.length ? `${prodToAdd.id}-${Date.now()}` : prodToAdd.id;
    const item = { ...prodToAdd, id: itemId, productoId: prodToAdd.id, cantidad: q, precioBase: prodToAdd.precioUnitario, precioUnitario: Number(prodToAdd.precioUnitario) + pExtra, modificadores: modificadores || [] };

    let current: any[] = [];
    try { const s = localStorage.getItem(`tienda:${slug}:carrito`); if (s) current = JSON.parse(s) || []; } catch { }

    if (!modificadores?.length) {
      const existe = current.find((i) => i.productoId === item.productoId && !i.modificadores?.length);
      if (existe) {
        const updated = current.map((i) => i.productoId === item.productoId && !i.modificadores?.length ? { ...i, cantidad: i.cantidad + q } : i);
        setCarrito(updated);
        try { localStorage.setItem(`tienda:${slug}:carrito`, JSON.stringify(updated)); } catch { }
        setMostrarCarrito(true);
        return;
      }
    }
    const updated = [...current, item];
    setCarrito(updated);
    try { localStorage.setItem(`tienda:${slug}:carrito`, JSON.stringify(updated)); } catch { }
    setMostrarCarrito(true);
  };

  const handleAgregarProducto = () => {
    if (!producto) return;
    for (const grupo of modificadoresProducto) {
      if (grupo.esObligatorio && (selecciones[grupo.id] || []).length < (grupo.seleccionMin || 1)) {
        alert(`Por favor selecciona una opción para "${grupo.nombre}"`);
        return;
      }
    }
    const mods: any[] = [];
    modificadoresProducto.forEach((grupo) => {
      (selecciones[grupo.id] || []).forEach((opId: number) => {
        const op = grupo.opciones.find((o: any) => o.id === opId);
        if (op) mods.push({ grupoId: grupo.id, grupoNombre: grupo.nombre, opcionId: op.id, opcionNombre: op.nombre, precioExtra: op.precioExtra });
      });
    });
    agregarAlCarritoDirecto(producto, cantidad, mods);
  };

  const actualizarCantidad = (productoId: number | string, cant: number) => {
    const updated = cant <= 0
      ? carrito.filter((i) => i.id !== productoId)
      : carrito.map((i) => i.id === productoId ? { ...i, cantidad: cant } : i);
    setCarrito(updated);
    try { localStorage.setItem(`tienda:${slug}:carrito`, JSON.stringify(updated)); } catch { }
  };

  const irACheckout = () => {
    let current = carrito;
    try { const s = localStorage.getItem(`tienda:${slug}:carrito`); if (s) current = JSON.parse(s); } catch { }
    const inCart = current.find((i: any) => i.productoId === producto?.id || i.id === producto?.id);
    if (inCart) {
      navigate(`/tienda/${slug}/checkout`, { state: { carrito: current, tienda } });
    } else {
      handleAgregarProducto();
      navigate(`/tienda/${slug}/checkout`, { state: { carrito, tienda } });
    }
  };

  const enviarReview = async () => {
    if (!slug || !producto?.id || reviewSending) return;

    if (!reviewForm.clienteNombre.trim() || !reviewForm.comentario.trim()) {
      alert('Completa tu nombre y comentario para enviar la reseña.');
      return;
    }

    setReviewSending(true);
    try {
      await axios.post(`${BASE_URL}/public/store/${slug}/products/${producto.id}/reviews`, reviewForm);
      setReviewForm({
        clienteNombre: '',
        clienteTelefono: '',
        clienteEmail: '',
        codigoSeguimiento: '',
        rating: 5,
        comentario: '',
      });
      setShowReviewSuccess(true);
    } catch (error: any) {
      alert(error?.response?.data?.message || 'No se pudo enviar la reseña.');
    } finally {
      setReviewSending(false);
    }
  };

  const diseno = tienda?.diseno || {};
  const cp = diseno.colorPrimario || '#6A6CFF';

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        {/* Header Skeleton */}
        <div className="h-20 border-b border-gray-100 flex items-center justify-between px-8 bg-white">
          <div className="animate-pulse bg-gray-100 rounded-lg w-32 h-8" />
          <div className="flex gap-4">
            <div className="animate-pulse bg-gray-100 rounded-full w-10 h-10" />
            <div className="animate-pulse bg-gray-100 rounded-full w-10 h-10" />
          </div>
        </div>
        <main className="pt-8 pb-16 max-w-screen-xl mx-auto px-5 md:px-8">
          {/* Breadcrumb Skeleton */}
          <div className="flex items-center gap-2 mb-8">
            <div className="animate-pulse bg-gray-100 rounded w-16 h-4" />
            <div className="animate-pulse bg-gray-100 rounded w-4 h-4" />
            <div className="animate-pulse bg-gray-100 rounded w-20 h-4" />
            <div className="animate-pulse bg-gray-100 rounded w-4 h-4" />
            <div className="animate-pulse bg-gray-100 rounded w-32 h-4" />
          </div>

          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 rounded-[2rem] border border-gray-100 bg-white p-4 md:p-6 lg:p-8 shadow-sm">
            {/* Image Skeleton */}
            <div className="flex flex-col gap-4">
              <div className="animate-pulse bg-gray-50 rounded-[2rem] aspect-square flex items-center justify-center border border-gray-100">
                <Icon icon="solar:gallery-bold-duotone" className="text-gray-200 text-6xl" />
              </div>
              <div className="flex gap-3 justify-center">
                <div className="animate-pulse bg-gray-50 rounded-xl w-16 h-16 border border-gray-100" />
                <div className="animate-pulse bg-gray-50 rounded-xl w-16 h-16 border border-gray-100" />
                <div className="animate-pulse bg-gray-50 rounded-xl w-16 h-16 border border-gray-100" />
              </div>
            </div>

            {/* Info Skeleton */}
            <div className="flex flex-col pt-4">
              <div className="flex items-center gap-2 mb-4">
                <div className="animate-pulse bg-gray-100 rounded-full w-24 h-6" />
                <div className="animate-pulse bg-gray-100 rounded-full w-16 h-6" />
              </div>
              <div className="animate-pulse bg-gray-100 rounded-2xl w-3/4 h-12 mb-4" />
              <div className="animate-pulse bg-gray-100 rounded-2xl w-1/2 h-12 mb-6" />
              <div className="flex gap-2 mb-6">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="animate-pulse bg-gray-100 rounded-full w-5 h-5" />
                ))}
              </div>
              <div className="animate-pulse bg-gray-100 rounded-xl w-1/3 h-10 mb-8" />
              <div className="animate-pulse bg-gray-50 rounded-xl w-full h-24 mb-8 border border-gray-100" />
              
              <div className="flex gap-4 mb-6">
                <div className="animate-pulse bg-gray-100 rounded-xl w-32 h-14" />
                <div className="animate-pulse bg-gray-100 rounded-xl flex-1 h-14" />
              </div>

              <div className="grid grid-cols-2 gap-3 mt-auto pt-6 border-t border-gray-100">
                <div className="animate-pulse bg-gray-50 rounded-xl h-16 border border-gray-100" />
                <div className="animate-pulse bg-gray-50 rounded-xl h-16 border border-gray-100" />
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!producto || !tienda) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Icon icon="mdi:alert-circle-outline" className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Producto no encontrado</h2>
          <button onClick={() => navigate(`/tienda/${slug}`)} className="text-blue-600 hover:underline">Volver a la tienda</button>
        </div>
      </div>
    );
  }

  const price = Number(producto.precioUnitario || 0);
  const originalPrice = Number(producto.precioOriginal || 0);
  const hasDiscount = !!(originalPrice && originalPrice > price);
  const discountPct = hasDiscount ? Math.round((1 - price / originalPrice) * 100) : 0;
  const finalPrice = price + precioExtra;
  const isOutOfStock = Number(producto?.stock || 0) <= 0;
  const esServicio = String(producto?.atributosTecnicos?.tipoProducto || '').toUpperCase() === 'SERVICIO';
  const ratingCount = reviewSummary.ratingCount || Number(producto.ratingCount || 0);
  const starRating = ratingCount > 0 ? Number(reviewSummary.ratingAvg || producto.ratingAvg || 0) : 0;
  const fullStars = Math.floor(starRating);
  const hasHalf = starRating % 1 !== 0;
  const fontFamily = diseno.tipografia || 'Inter';
  const fichaTecnica = producto?.fichaTecnica;
  const tieneFichaTecnica =
    fichaTecnica &&
    ((Array.isArray(fichaTecnica.destacados) && fichaTecnica.destacados.length > 0) ||
      (Array.isArray(fichaTecnica.grupos) && fichaTecnica.grupos.length > 0));

  return (
    <div className="min-h-screen bg-white overflow-x-hidden" style={{ fontFamily: `'${fontFamily}', sans-serif` }}>
      <XtraHeader
        tienda={tienda}
        slug={slug || ''}
        carritoCount={carrito.length}
        onToggleCart={() => setMostrarCarrito(!mostrarCarrito)}
        isAdminOpen={isAdminOpen}
        setIsAdminOpen={setIsAdminOpen}
        adminMenuRef={adminMenuRef}
        search={search}
        setSearch={setSearch}
        categories={allCategories}
        onSelectCategory={(category) => navigate(category ? `/tienda/${slug}/catalogo?category=${encodeURIComponent(category)}` : `/tienda/${slug}/catalogo`)}
        onSearch={() => {
          const term = search.trim();
          if (term) navigate(`/tienda/${slug}/catalogo?search=${encodeURIComponent(term)}`);
        }}
        recommendedProducts={searchProducts}
        cp={cp}
      />

      <main className="pt-20 pb-16">
        <div className="max-w-screen-xl mx-auto px-5 md:px-8 py-5">

          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-xs text-gray-400 mb-8">
            <button onClick={() => navigate(`/tienda/${slug}`)} className="hover:text-gray-700 transition-colors">Inicio</button>
            <Icon icon="solar:alt-arrow-right-linear" width={12} />
            <button onClick={() => navigate(`/tienda/${slug}/catalogo`)} className="hover:text-gray-700 transition-colors">Catálogo</button>
            <Icon icon="solar:alt-arrow-right-linear" width={12} />
            <span className="font-semibold text-gray-700 truncate max-w-[40vw]">{producto.descripcion}</span>
          </nav>

          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 rounded-[2rem] border border-gray-100 bg-white p-4 shadow-sm md:p-6 lg:p-8">

            {/* Image */}
            <div className="relative">
              {/* Action buttons */}
              <div className="absolute top-3 right-3 z-10 flex flex-col gap-2">
                <button
                  onClick={() => toggleFavorito({ id: producto.id, descripcion: producto.descripcion, precioUnitario: finalPrice, imagenUrl: producto.imagenUrl, slug: slug || '' })}
                  className="w-10 h-10 rounded-full bg-white/90 backdrop-blur-sm shadow-lg flex items-center justify-center transition-all hover:scale-110"
                  title={isFavorito(producto.id, slug || '') ? 'Quitar de favoritos' : 'Agregar a favoritos'}
                >
                  <Icon
                    icon={isFavorito(producto.id, slug || '') ? 'solar:heart-bold' : 'solar:heart-linear'}
                    width={20}
                    className={isFavorito(producto.id, slug || '') ? 'text-red-500' : 'text-gray-600'}
                  />
                </button>
                <button
                  onClick={() => setZoomOpen(true)}
                  className="w-10 h-10 rounded-full bg-white/90 backdrop-blur-sm shadow-lg flex items-center justify-center transition-all hover:scale-110"
                  title="Ver imagen ampliada"
                >
                  <Icon icon="solar:magnifer-zoom-in-bold" width={20} className="text-gray-600" />
                </button>
                <button
                  onClick={() => {
                    const compareItem = {
                      id: producto.id, descripcion: producto.descripcion, precioUnitario: finalPrice,
                      imagenUrl: producto.imagenUrl,
                      categoria: typeof producto.categoria === 'object' ? producto.categoria?.nombre : producto.categoria,
                      marca: typeof producto.marca === 'object' ? producto.marca?.nombre : producto.marca,
                      stock: producto.stock, ratingAvg: starRating, slug: slug || '',
                    };
                    toggleCompare(compareItem);
                  }}
                  className="w-10 h-10 rounded-full bg-white/90 backdrop-blur-sm shadow-lg flex items-center justify-center transition-all hover:scale-110"
                  title={isInCompare(producto.id, slug || '') ? 'Quitar de comparación' : 'Comparar producto'}
                >
                  <Icon
                    icon="solar:refresh-square-bold-duotone"
                    width={20}
                    style={{ color: isInCompare(producto.id, slug || '') ? cp : '#6b7280' }}
                  />
                </button>
              </div>
              <div
                className="mb-4 flex aspect-square cursor-zoom-in items-center justify-center overflow-hidden rounded-3xl border border-gray-100 bg-white"
                onClick={() => setZoomOpen(true)}
              >
                {selectedImage || producto.imagenUrl ? (
                  <img src={selectedImage || producto.imagenUrl} alt={producto.descripcion} className="w-full h-full object-contain p-4 md:p-10 hover:scale-105 transition-transform duration-500" />
                ) : (
                  <Icon icon="solar:box-linear" className="text-gray-300 text-6xl" />
                )}
              </div>
              <div className="flex gap-3 justify-center">
                {[producto.imagenUrl, ...(producto.imagenes || [])].filter(Boolean).slice(0, 4).map((img: string, i: number) => (
                  <button
                    key={i}
                    onClick={() => setSelectedImage(img)}
                    className="w-16 h-16 rounded-xl overflow-hidden border-2 transition-all"
                    style={{ borderColor: selectedImage === img || (!selectedImage && i === 0) ? cp : '#e5e7eb' }}
                  >
                    <img src={img} alt="" className="w-full h-full object-contain p-1 bg-gray-50" />
                  </button>
                ))}
              </div>
            </div>

            {/* Info */}
            <div className="flex flex-col">
              <div className="flex items-center gap-2 mb-3 flex-wrap">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest">{tienda.nombreComercial}</span>
                {hasDiscount && (
                  <span className="text-[10px] font-black text-white px-2 py-0.5 rounded-full" style={{ background: cp }}>
                    -{discountPct}% OFF
                  </span>
                )}
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border" style={{ color: esServicio ? '#7C3AED' : '#22C55E', borderColor: esServicio ? '#7C3AED' : '#22C55E' }}>
                  {esServicio ? 'Servicio técnico' : `En Stock: ${producto.stock ?? 0}`}
                </span>
              </div>

              <h1 className="text-xl sm:text-3xl lg:text-4xl font-black text-gray-900 leading-tight mb-4">{producto.descripcion}</h1>

              <div className="flex items-center gap-1.5 mb-5">
                {Array.from({ length: 5 }, (_, i) => {
                  const n = i + 1;
                  return (
                    <Icon
                      key={n}
                      icon={n <= fullStars ? 'solar:star-bold' : hasHalf && n === fullStars + 1 ? 'solar:star-half-bold' : 'solar:star-linear'}
                      className={`text-lg ${n <= fullStars || (hasHalf && n === fullStars + 1) ? 'text-amber-400' : 'text-gray-200'}`}
                    />
                  );
                })}
                <span className="text-xs text-gray-400 ml-1">
                  {ratingCount > 0 ? `${starRating.toFixed(1)} · ${ratingCount} reseñas` : 'Sin reseñas'}
                </span>
              </div>

              <div className="flex items-baseline gap-3 mb-6">
                <span className="text-3xl md:text-4xl font-black text-gray-900">S/ {finalPrice.toFixed(2)}</span>
                {hasDiscount && <span className="text-base md:text-lg text-gray-400 line-through">S/ {originalPrice.toFixed(2)}</span>}
              </div>

              {producto.descripcion && !producto.descripcionLarga && (
                <p className="text-sm text-gray-500 leading-relaxed mb-6 border-t border-gray-100 pt-5">
                  {producto.descripcion}
                </p>
              )}

              <ProductModifiersSelector modifiers={modificadoresProducto} selections={selecciones} onChange={setSelecciones} />

              <div className="flex items-center gap-3 mb-4">
                <div className="flex items-center gap-3 bg-gray-100 rounded-xl px-4 py-2.5">
                  <button onClick={() => setCantidad(Math.max(1, cantidad - 1))} className="text-gray-500 hover:text-gray-900 font-bold text-lg w-6 h-6 flex items-center justify-center">−</button>
                  <span className="font-bold text-gray-900 w-6 text-center">{cantidad}</span>
                  <button onClick={() => setCantidad(esServicio ? cantidad + 1 : Math.min(producto.stock || 99, cantidad + 1))} className="text-gray-500 hover:text-gray-900 font-bold text-lg w-6 h-6 flex items-center justify-center">+</button>
                </div>
                <button
                  disabled={isOutOfStock}
                  onClick={handleAgregarProducto}
                  className={`flex-1 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-opacity ${isOutOfStock ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'text-white hover:opacity-90'}`}
                  style={isOutOfStock ? undefined : { background: cp }}
                >
                  <Icon icon={isOutOfStock ? "solar:close-circle-bold" : "solar:cart-large-2-bold"} width={18} />
                  {isOutOfStock ? 'Agotado' : 'Agregar al carrito'}
                </button>
              </div>

              {!isOutOfStock && (
                <button
                  onClick={irACheckout}
                  className="w-full py-3 rounded-xl font-bold text-sm text-white bg-gray-900 hover:bg-black flex items-center justify-center gap-2 transition-colors mb-6"
                >
                  <Icon icon="solar:lightning-bolt-bold" width={16} />
                  Comprar ahora
                </button>
              )}

              <div className="grid grid-cols-2 gap-3 mb-6">
                {[
                  { icon: 'solar:truck-bold-duotone', color: cp, title: 'Entrega rápida', sub: 'Coordinada con la tienda' },
                  { icon: 'solar:shield-check-bold-duotone', color: '#22C55E', title: 'Compra segura', sub: 'Atención por WhatsApp' },
                ].map(({ icon, color, title, sub }) => (
                  <div key={title} className="flex items-center gap-3 bg-gray-50 rounded-xl p-3 border border-gray-100">
                    <Icon icon={icon} width={24} style={{ color }} className="flex-shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-gray-900">{title}</p>
                      <p className="text-[11px] text-gray-500">{sub}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="text-xs text-gray-400 space-y-1 border-t border-gray-100 pt-4">
                <p><span className="font-semibold text-gray-600">SKU:</span> {producto.codigo || 'N/A'}</p>
                <p><span className="font-semibold text-gray-600">Categoría:</span> {typeof producto.categoria === 'object' ? producto.categoria?.nombre : producto.categoria || 'General'}</p>
                {producto.marca && <p><span className="font-semibold text-gray-600">Marca:</span> {typeof producto.marca === 'object' ? producto.marca?.nombre : producto.marca}</p>}
              </div>
            </div>
          </div>

          {/* Descripción rica / Ficha técnica */}
          {producto.descripcionLarga && (
            <GadgetsDescripcion descripcionLarga={producto.descripcionLarga} cp={cp} />
          )}

          {tieneFichaTecnica && (
            <section className="mt-10 rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
              {/* Header */}
              <div className="flex items-center gap-3 border-b border-gray-100 px-6 py-4">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-900 text-white">
                  <Icon icon="solar:list-check-bold-duotone" width={16} />
                </div>
                <h2 className="text-xs font-bold uppercase tracking-widest text-gray-500">
                  Especificaciones técnicas
                </h2>
              </div>

              <div className="p-5 md:p-6">
                {/* Destacados — chips compactos */}
                {fichaTecnica.destacados?.length > 0 && (
                  <div className="mb-6 flex flex-wrap gap-2">
                    {fichaTecnica.destacados.map((item: any) => (
                      <div key={item.key} className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-gray-50 px-3 py-1.5">
                        <Icon icon="solar:check-circle-bold" width={13} className="text-emerald-500 shrink-0" />
                        <span className="text-xs text-gray-500">{item.label}:</span>
                        <span className="text-xs font-bold text-gray-800">{item.value}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Grupos */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                  {fichaTecnica.grupos.map((group: any) => (
                    <div key={group.nombre} className="rounded-xl border border-gray-100 overflow-hidden">
                      <div className="bg-gray-50 px-4 py-2.5 border-b border-gray-100">
                        <span className="text-[11px] font-bold uppercase tracking-widest text-gray-400">{group.nombre}</span>
                      </div>
                      <div className="divide-y divide-gray-50">
                        {group.items.map((item: any) => (
                          <div key={item.key} className="flex items-center justify-between gap-4 px-4 py-2.5">
                            <span className="text-xs font-semibold text-gray-500 shrink-0">{item.label}</span>
                            <span className="text-xs font-bold text-gray-900 text-right">{item.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}

          <section id="producto-review-form" className="mt-10 grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm md:p-6">
              <div className="mb-5 flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-black text-gray-900">Opiniones de clientes</h2>
                  <p className="text-sm text-gray-500">Comentarios aprobados por la tienda.</p>
                </div>
                <div className="shrink-0 text-right">
                  <ReviewStars rating={reviewSummary.ratingAvg} size={16} />
                  <p className="mt-1 text-xs font-semibold text-gray-500">
                    {reviewSummary.ratingCount > 0 ? `${reviewSummary.ratingAvg.toFixed(1)} / 5` : 'Sin reseñas'}
                  </p>
                </div>
              </div>

              {reviews.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-6 text-center">
                  <Icon icon="solar:chat-round-like-bold-duotone" width={34} className="mx-auto mb-3 text-gray-300" />
                  <p className="text-sm font-bold text-gray-700">Este producto aún no tiene reseñas.</p>
                  <p className="mt-1 text-xs text-gray-500">Sé el primero en contar tu experiencia.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {reviews.map((review) => (
                    <article key={review.id} className="rounded-2xl border border-gray-100 p-4">
                      <div className="mb-2 flex items-start justify-between gap-3">
                        <div>
                          <p className="font-bold text-gray-900">{review.clienteNombre}</p>
                          <div className="mt-1 flex flex-wrap items-center gap-2">
                            <ReviewStars rating={Number(review.rating || 0)} size={14} />
                            {review.compraVerificada && (
                              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700">
                                Compra verificada
                              </span>
                            )}
                          </div>
                        </div>
                        <span className="text-xs text-gray-400">
                          {review.creadoEn ? new Date(review.creadoEn).toLocaleDateString('es-PE') : ''}
                        </span>
                      </div>
                      <p className="text-sm leading-6 text-gray-600">{review.comentario}</p>
                    </article>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm md:p-6">
              <div className="mb-5">
                <h2 className="text-lg font-black text-gray-900">Escribe tu reseña</h2>
                <p className="text-sm text-gray-500">No necesitas cuenta. Si vienes desde el link del pedido, se completa solo.</p>
              </div>

              <div className="space-y-3">
                <input
                  value={reviewForm.clienteNombre}
                  onChange={(e) => setReviewForm((prev) => ({ ...prev, clienteNombre: e.target.value }))}
                  placeholder="Tu nombre"
                  className="h-11 w-full rounded-xl border border-gray-200 px-4 text-sm outline-none transition-colors focus:border-gray-900"
                />

                <div className="grid gap-3 sm:grid-cols-2">
                  <input
                    value={reviewForm.clienteTelefono}
                    onChange={(e) => setReviewForm((prev) => ({ ...prev, clienteTelefono: e.target.value }))}
                    placeholder="Celular"
                    className="h-11 w-full rounded-xl border border-gray-200 px-4 text-sm outline-none transition-colors focus:border-gray-900"
                  />
                  <input
                    value={reviewForm.clienteEmail}
                    onChange={(e) => setReviewForm((prev) => ({ ...prev, clienteEmail: e.target.value }))}
                    placeholder="Email opcional"
                    className="h-11 w-full rounded-xl border border-gray-200 px-4 text-sm outline-none transition-colors focus:border-gray-900"
                  />
                </div>

                <input
                  value={reviewForm.codigoSeguimiento}
                  onChange={(e) => setReviewForm((prev) => ({ ...prev, codigoSeguimiento: e.target.value }))}
                  placeholder="Código de pedido opcional"
                  className="h-11 w-full rounded-xl border border-gray-200 px-4 text-sm outline-none transition-colors focus:border-gray-900"
                />

                <div>
                  <p className="mb-2 text-xs font-bold uppercase tracking-widest text-gray-400">Calificación</p>
                  <div className="flex gap-1">
                    {Array.from({ length: 5 }).map((_, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => setReviewForm((prev) => ({ ...prev, rating: index + 1 }))}
                        className="rounded-lg p-1 text-[#FFB020] transition hover:bg-amber-50"
                      >
                        <Icon icon={index < reviewForm.rating ? 'solar:star-bold' : 'solar:star-line-duotone'} width={28} />
                      </button>
                    ))}
                  </div>
                </div>

                <textarea
                  value={reviewForm.comentario}
                  onChange={(e) => setReviewForm((prev) => ({ ...prev, comentario: e.target.value }))}
                  placeholder="Cuéntanos cómo te fue con el producto..."
                  rows={4}
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none transition-colors focus:border-gray-900"
                />

                <button
                  type="button"
                  onClick={enviarReview}
                  disabled={reviewSending}
                  className="flex h-11 w-full items-center justify-center gap-2 rounded-xl text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
                  style={{ background: cp }}
                >
                  {reviewSending ? <Icon icon="eos-icons:loading" /> : <Icon icon="solar:chat-round-like-bold" />}
                  Enviar reseña
                </button>
              </div>
            </div>
          </section>

          {/* Related — auto-slider 3 cards */}
          {relatedProducts.length > 0 && (
            <div className="mt-16 border-t border-gray-100 pt-12">
              <ProductSlider3
                products={relatedProducts}
                slug={slug || ''}
                diseno={diseno}
                cp={cp}
                onAddToCart={(p) => agregarAlCarritoDirecto(p, 1)}
                onClickProduct={(p) => { navigate(`/tienda/${slug}/producto/${p.id}`); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
              />
            </div>
          )}
        </div>
      </main>

      <Footer tienda={tienda} diseno={diseno} />

      {/* Zoom lightbox */}
      {zoomOpen && (
        <div
          className="fixed inset-0 z-[999] bg-black/90 flex items-center justify-center"
          onClick={() => setZoomOpen(false)}
        >
          <button
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white hover:bg-white/30 transition-colors"
            onClick={() => setZoomOpen(false)}
          >
            <svg width="14" height="14" viewBox="0 0 12 12" fill="none"><path d="M1 1L11 11M11 1L1 11" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round"/></svg>
          </button>
          <img
            src={selectedImage || producto.imagenUrl}
            alt={producto.descripcion}
            className="max-w-[90vw] max-h-[90vh] object-contain rounded-2xl"
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}

      {/* Compare modal */}
      {showCompareModal && (() => {
        const compareItems = getBySlug(slug || '');
        return (
          <div
            className="fixed inset-0 z-[998] bg-black/60 flex items-center justify-center p-4"
            onClick={() => setShowCompareModal(false)}
          >
            <div
              className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-auto max-h-[90vh]"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-5 border-b border-gray-100">
                <h3 className="font-black text-gray-900 text-lg">Comparar productos</h3>
                <div className="flex items-center gap-3">
                  <button onClick={() => clearCompare(slug || '')} className="text-xs text-red-500 hover:text-red-700">Limpiar</button>
                  <button onClick={() => setShowCompareModal(false)} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M1 1L11 11M11 1L1 11" stroke="#374151" strokeWidth="2" strokeLinecap="round"/></svg>
                  </button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <td className="p-4 font-semibold text-gray-500 text-xs uppercase">Detalle</td>
                      {compareItems.map(item => (
                        <td key={item.id} className="p-4 text-center">
                          <div className="flex flex-col items-center gap-2">
                            {item.imagenUrl && <img src={item.imagenUrl} alt={item.descripcion} className="w-16 h-16 object-contain" />}
                            <span className="text-xs font-bold text-gray-800 line-clamp-2 text-center">{item.descripcion}</span>
                            <button
                              onClick={() => { setShowCompareModal(false); navigate(`/tienda/${slug}/producto/${item.id}`); }}
                              className="text-[11px] font-bold text-white px-3 py-1 rounded-full"
                              style={{ background: cp }}
                            >
                              Ver producto
                            </button>
                          </div>
                        </td>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { label: 'Precio', fn: (i: any) => `S/ ${Number(i.precioUnitario).toFixed(2)}` },
                      { label: 'Categoría', fn: (i: any) => i.categoria || '—' },
                      { label: 'Marca', fn: (i: any) => i.marca || '—' },
                      { label: 'Stock', fn: (i: any) => i.stock ?? '—' },
                      { label: 'Valoración', fn: (i: any) => i.ratingAvg ? `${Number(i.ratingAvg).toFixed(1)} ★` : '—' },
                    ].map(({ label, fn }) => (
                      <tr key={label} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                        <td className="p-4 text-xs font-semibold text-gray-500">{label}</td>
                        {compareItems.map(item => (
                          <td key={item.id} className="p-4 text-center text-sm text-gray-700">{fn(item)}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Floating compare bar */}
      {getBySlug(slug || '').length > 0 && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 pointer-events-auto">
          <div className="bg-gray-900 text-white rounded-2xl shadow-2xl px-5 py-3 flex items-center gap-4">
            <div className="flex -space-x-2">
              {getBySlug(slug || '').map(item => (
                <div key={item.id} className="w-8 h-8 rounded-full border-2 border-gray-800 overflow-hidden bg-white">
                  {item.imagenUrl
                    ? <img src={item.imagenUrl} alt="" className="w-full h-full object-contain" />
                    : <div className="w-full h-full bg-gray-200" />
                  }
                </div>
              ))}
            </div>
            <span className="text-sm font-semibold">{getBySlug(slug || '').length} producto{getBySlug(slug || '').length > 1 ? 's' : ''}</span>
            <button
              onClick={() => setShowCompareModal(true)}
              className="px-4 py-1.5 rounded-xl font-bold text-sm text-white"
              style={{ background: cp }}
            >
              Comparar
            </button>
            <button onClick={() => clearCompare(slug || '')} className="text-gray-400 hover:text-white transition-colors">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M1 1L11 11M11 1L1 11" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round"/></svg>
            </button>
          </div>
        </div>
      )}

      <GadgetsCartModal
        isOpen={mostrarCarrito}
        onClose={() => setMostrarCarrito(false)}
        carrito={carrito}
        tienda={tienda}
        actualizarCantidad={actualizarCantidad}
        onCheckout={irACheckout}
        slug={slug}
        setCarrito={setCarrito}
        cp={cp}
      />

      <ReviewFeedbackModal
        isOpen={showReviewSuccess}
        onClose={() => setShowReviewSuccess(false)}
        color={cp}
      />
    </div>
  );
}
