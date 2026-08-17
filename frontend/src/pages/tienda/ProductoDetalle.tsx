import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Icon } from '@iconify/react';
import axios from 'axios';
import ProductCardPio from '@/components/tienda/ProductCardPio';
import Footer from '@/components/tienda/Footer';
import StoreHeader from '@/components/tienda/StoreHeader';
import { useFavoritosStore } from '@/zustand/favoritos';
import { useCompareStore } from '@/zustand/compare';
import ReviewFeedbackModal from '@/components/tienda/ReviewFeedbackModal';
import { onTiendaCartCleared } from '@/utils/tiendaCart';
import { withPricing, withPricingList } from '@/templates/shared/pricing';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4001/api';
import ProductModifiersSelector from '@/components/tienda/ProductModifiersSelector';
import ShoppingCartModal from '@/components/tienda/ShoppingCartModal';
import ProductVariantsShopify from '@/components/tienda/ProductVariantsShopify';

const PROSE_CLASSES = [
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

function ClassicDescripcion({ descripcionLarga }: { descripcionLarga: string }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="rounded-2xl border border-gray-100 bg-white overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-6 py-4 bg-[#F6F6F6] hover:bg-gray-100 transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          <Icon icon="solar:document-text-bold-duotone" width={18} className="text-[#FF9500]" />
          <span className="text-sm font-bold text-gray-900">Descripción completa</span>
        </div>
        <Icon
          icon="solar:alt-arrow-down-bold"
          width={16}
          className="text-gray-400 transition-transform duration-200"
          style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
        />
      </button>
      {open && (
        <div className={`px-6 py-6 ${PROSE_CLASSES}`} dangerouslySetInnerHTML={{ __html: descripcionLarga }} />
      )}
    </div>
  );
}

function RelatedSlider({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(true);

  const updateArrows = () => {
    const el = ref.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 4);
    setCanRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4);
  };

  const scroll = (dir: 'left' | 'right') => {
    const el = ref.current;
    if (!el) return;
    const cardWidth = (el.firstElementChild as HTMLElement)?.offsetWidth ?? 200;
    el.scrollBy({ left: dir === 'right' ? cardWidth * 2 : -cardWidth * 2, behavior: 'smooth' });
    setTimeout(updateArrows, 350);
  };

  return (
    <div className="relative group">
      {/* Left arrow */}
      {canLeft && (
        <button
          type="button"
          onClick={() => scroll('left')}
          className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 z-10 w-10 h-10 rounded-full bg-white border border-gray-200 shadow-md flex items-center justify-center hover:shadow-lg hover:scale-105 transition-all"
        >
          <Icon icon="solar:alt-arrow-left-bold" width={18} className="text-gray-700" />
        </button>
      )}
      {/* Track */}
      <div
        ref={ref}
        onScroll={updateArrows}
        className="flex gap-3 md:gap-4 overflow-x-auto pb-2 scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {children}
      </div>
      {/* Right arrow */}
      {canRight && (
        <button
          type="button"
          onClick={() => scroll('right')}
          className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 z-10 w-10 h-10 rounded-full bg-white border border-gray-200 shadow-md flex items-center justify-center hover:shadow-lg hover:scale-105 transition-all"
        >
          <Icon icon="solar:alt-arrow-right-bold" width={18} className="text-gray-700" />
        </button>
      )}
    </div>
  );
}

export default function ProductoDetalle() {
  const { slug, id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [producto, setProducto] = useState<any>(null);
  const [relatedProducts, setRelatedProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [cantidad, setCantidad] = useState<number>(1);
  const [carrito, setCarrito] = useState<any[]>([]);
  const [tienda, setTienda] = useState<any>(null);
  const [selectedImage, setSelectedImage] = useState<string>('');
  const [mostrarCarrito, setMostrarCarrito] = useState(false);
  const [search, setSearch] = useState('');
  const [zoomOpen, setZoomOpen] = useState(false);
  const [showCompareModal, setShowCompareModal] = useState(false);
  const [showReviewSuccess, setShowReviewSuccess] = useState(false);

  const { toggleFavorito, isFavorito } = useFavoritosStore();
  const { toggle: toggleCompare, isInCompare, getBySlug, clear: clearCompare } = useCompareStore();
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

  // Estados para personalización
  const [modificadoresProducto, setModificadoresProducto] = useState<any[]>([]);
  const [selecciones, setSelecciones] = useState<Record<number, number[]>>({});

  // Estados para variantes (Shopify style)
  const [varianteSelecciones, setVarianteSelecciones] = useState<Record<string, string>>({});
  const [varianteActiva, setVarianteActiva] = useState<any>(null);

  // Admin Menu Logic
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const adminMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (!adminMenuRef.current) return;
      if (!adminMenuRef.current.contains(e.target as Node)) setIsAdminOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  useEffect(() => {
    const cargar = async () => {
      try {
        setLoading(true);
        const [prodRes, tiendaRes] = await Promise.all([
          axios.get(`${BASE_URL}/public/store/${slug}/products/${id}`),
          axios.get(`${BASE_URL}/public/store/${slug}`)
        ]);
        const prod = withPricing(prodRes.data.data || prodRes.data);
        setProducto(prod);
        setTienda(tiendaRes.data.data || tiendaRes.data);
        if (prod.imagenUrl) setSelectedImage(prod.imagenUrl);

        // Preseleccionar primera variante si existe
        if (prod.opcionesAtributos && prod.variantes && prod.variantes.length > 0) {
          const firstVariant = prod.variantes[0];
          setVarianteActiva(firstVariant);
          setVarianteSelecciones(firstVariant.valoresAtributos || {});
          if (firstVariant.imagenUrl) setSelectedImage(firstVariant.imagenUrl);
        }

        try {
          const reviewsRes = await axios.get(`${BASE_URL}/public/store/${slug}/products/${prod.id}/reviews`);
          const payload = reviewsRes.data.data || reviewsRes.data;
          setReviews(Array.isArray(payload?.reviews) ? payload.reviews : []);
          setReviewSummary({
            ratingAvg: Number(payload?.ratingAvg || 0),
            ratingCount: Number(payload?.ratingCount || 0),
          });
        } catch (err) {
          console.error('Error loading reviews', err);
          setReviews([]);
          setReviewSummary({ ratingAvg: 0, ratingCount: 0 });
        }

        // Cargar modificadores
        try {
          const modsRes = await axios.get(`${BASE_URL}/public/store/${slug}/products/${prod.id}/modifiers`);
          const mods = modsRes.data.data || modsRes.data || [];
          setModificadoresProducto(mods);

          // Inicializar selecciones por defecto
          const defaults: Record<number, number[]> = {};
          mods.forEach((grupo: any) => {
            const defaultOpciones = grupo.opciones.filter((op: any) => op.esDefault).map((op: any) => op.id);
            // Si es obligatorio y radio (max 1), y no hay default, seleccionar el primero?
            if (grupo.esObligatorio && grupo.seleccionMax === 1 && defaultOpciones.length === 0 && grupo.opciones.length > 0) {
              defaults[grupo.id] = [grupo.opciones[0].id];
            } else {
              defaults[grupo.id] = defaultOpciones;
            }
          });
          setSelecciones(defaults);

        } catch (err) {
          console.error('Error loading modifiers', err);
        }

        // Fetch Related Products
        try {
          const relatedRes = await axios.get(`${BASE_URL}/public/store/${slug}/products/${id}/related`);
          const relatedData = relatedRes.data.data || relatedRes.data;
          setRelatedProducts(Array.isArray(relatedData) ? withPricingList(relatedData) : []);
        } catch (err) { console.error('Error fetching related:', err); }

      } catch (e) {
        console.error('Error al cargar datos:', e);
      } finally {
        setLoading(false);
      }
    };
    if (slug && id) cargar();

    // Rehidratar carrito
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
    const params = new URLSearchParams(location.search);
    if (params.get('review') !== '1') return;
    setReviewForm((prev) => ({
      ...prev,
      clienteNombre: params.get('nombre') || prev.clienteNombre,
      clienteTelefono: params.get('telefono') || prev.clienteTelefono,
      codigoSeguimiento: params.get('codigo') || prev.codigoSeguimiento,
    }));
    window.setTimeout(() => {
      document.getElementById('producto-review-form')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 400);
  }, [location.search]);

  // Calcular precio extra y final
  const precioExtra = modificadoresProducto.reduce((total, grupo) => {
    const selectedIds = selecciones[grupo.id] || [];
    const grupoExtra = grupo.opciones
      .filter((op: any) => selectedIds.includes(op.id))
      .reduce((sum: number, op: any) => sum + Number(op.precioExtra || 0), 0);
    return total + grupoExtra;
  }, 0);

  const precioBaseActual = varianteActiva ? Number(varianteActiva.precioUnitario || 0) : Number(producto?.precioUnitario || 0);
  const stockActual = varianteActiva ? (varianteActiva.stock || 0) : (producto?.stock || 0);
  const isOutOfStock = stockActual <= 0;
  const precioFinal = precioBaseActual + precioExtra;

  const handleVarianteChange = (nombre: string, valor: string) => {
    const nextSelections = { ...varianteSelecciones, [nombre]: valor };
    setVarianteSelecciones(nextSelections);

    if (producto?.variantes) {
      const match = producto.variantes.find((v: any) => {
        return Object.keys(nextSelections).every(k => v.valoresAtributos && v.valoresAtributos[k] === nextSelections[k]);
      });
      if (match) {
        setVarianteActiva(match);
        if (match.imagenUrl) setSelectedImage(match.imagenUrl);
      } else {
        setVarianteActiva(null);
      }
    }
  };

  const enviarReview = async () => {
    if (!slug || !producto?.id) return;
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

  const renderStars = (rating: number, size = 18) => (
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

  const fichaTecnica = (producto as any)?.fichaTecnica;
  const tieneFichaTecnica =
    fichaTecnica &&
    ((Array.isArray(fichaTecnica.destacados) && fichaTecnica.destacados.length > 0) ||
      (Array.isArray(fichaTecnica.grupos) && fichaTecnica.grupos.length > 0));


  const handleAgregarProducto = () => {
    if (!producto) return;

    // Validar modificadores obligatorios
    for (const grupo of modificadoresProducto) {
      const seleccionadas = selecciones[grupo.id] || [];
      if (grupo.esObligatorio && seleccionadas.length < (grupo.seleccionMin || 1)) {
        // Mostrar error visual o alert
        alert(`Por favor selecciona una opción para "${grupo.nombre}"`);
        return;
      }
    }

    // Construir lista de modifiers
    const modificadoresSeleccionados: any[] = [];
    modificadoresProducto.forEach((grupo) => {
      const seleccionadas = selecciones[grupo.id] || [];
      grupo.opciones.forEach((opcion: any) => {
        if (seleccionadas.includes(opcion.id)) {
          modificadoresSeleccionados.push({
            grupoId: grupo.id,
            grupoNombre: grupo.nombre,
            opcionId: opcion.id,
            opcionNombre: opcion.nombre,
            precioExtra: opcion.precioExtra,
          });
        }
      });
    });

    agregarAlCarritoDirecto(varianteActiva || producto, cantidad, modificadoresSeleccionados);
  };

  const agregarAlCarritoDirecto = (prodToAdd: any, quantity: number, modificadores?: any[]) => {
    const qty = Math.max(1, Math.min(Number(quantity) || 1, prodToAdd?.stock || 1));

    // Si es variante, heredamos detalles del padre para el UI del carrito
    const nombreDisplay = varianteActiva ? `${producto.descripcion} - ${Object.values(varianteActiva.valoresAtributos || {}).join(' ')}` : prodToAdd.descripcion;
    const prodImg = prodToAdd.imagenUrl || producto.imagenUrl;

    // ID único si tiene modificadores
    const itemId = modificadores?.length
      ? `${prodToAdd.id}-${Date.now()}` // Simplificado para unicidad
      : prodToAdd.id;

    const pExtra = modificadores?.reduce((sum: number, mod: any) => sum + Number(mod.precioExtra || 0), 0) || 0;

    const item = {
      ...prodToAdd,
      descripcion: nombreDisplay,
      imagenUrl: prodImg,
      id: itemId,
      productoId: prodToAdd.id,
      padreId: varianteActiva ? producto.id : undefined,
      cantidad: qty,
      precioBase: prodToAdd.precioUnitario,
      precioUnitario: Number(prodToAdd.precioUnitario) + pExtra,
      modificadores: modificadores || []
    };

    let current: any[] = [];
    try {
      const saved = localStorage.getItem(`tienda:${slug}:carrito`);
      if (saved) current = JSON.parse(saved) || [];
    } catch { }

    // Si NO tiene modificadores, buscamos coincidencia
    if (!modificadores?.length) {
      const existe = current.find((i) => i.productoId === item.productoId && !i.modificadores?.length);
      if (existe) {
        const updated = current.map((i) => i.productoId === item.productoId && !i.modificadores?.length ? { ...i, cantidad: i.cantidad + qty } : i);
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

  const actualizarCantidad = (productoId: number | string, cantidad: number) => {
    if (cantidad <= 0) {
      setCarrito(carrito.filter((item) => item.id !== productoId));
      try { localStorage.setItem(`tienda:${slug}:carrito`, JSON.stringify(carrito.filter((item) => item.id !== productoId))); } catch { }
    } else {
      const updated = carrito.map((item) => (item.id === productoId ? { ...item, cantidad } : item));
      setCarrito(updated);
      try { localStorage.setItem(`tienda:${slug}:carrito`, JSON.stringify(updated)); } catch { }
    }
  };

  const calcularSubtotal = () => {
    return carrito.reduce((sum, item) => sum + Number(item.precioUnitario) * Number(item.cantidad || 1), 0);
  };

  const irACheckout = () => {
    if (!producto) return;
    let exists = false;
    let currentCarrito = carrito;

    // Check local storage for latest state just in case
    try {
      const saved = localStorage.getItem(`tienda:${slug}:carrito`);
      if (saved) currentCarrito = JSON.parse(saved);
    } catch { }

    if (modificadoresProducto.length > 0) {

    }

    const simpleMatch = currentCarrito.find(i => i.productoId === producto.id || i.id === producto.id);

    if (simpleMatch) {
      // Already in cart -> Just go
      navigate(`/tienda/${slug}/checkout`, { state: { carrito: currentCarrito, tienda } });
    } else {
      // Not in cart -> Add then go
      agregarYRedirigir();
    }
  };

  const agregarYRedirigir = () => {
    // Re-implement simplified add for redirection
    const targetProd = varianteActiva || producto;
    const qty = Math.max(1, Math.min(Number(cantidad) || 1, targetProd?.stock || 1));
    const pExtra = modificadoresProducto.reduce((total, grupo) => {
      const selectedIds = selecciones[grupo.id] || [];
      const grupoExtra = grupo.opciones
        .filter((op: any) => selectedIds.includes(op.id))
        .reduce((sum: number, op: any) => sum + Number(op.precioExtra || 0), 0);
      return total + grupoExtra;
    }, 0);

    // Build modifiers list
    const modificadoresSeleccionados: any[] = [];
    modificadoresProducto.forEach((grupo) => {
      const seleccionadas = selecciones[grupo.id] || [];
      grupo.opciones.forEach((opcion: any) => {
        if (seleccionadas.includes(opcion.id)) {
          modificadoresSeleccionados.push({
            grupoId: grupo.id,
            grupoNombre: grupo.nombre,
            opcionId: opcion.id,
            opcionNombre: opcion.nombre,
            precioExtra: opcion.precioExtra,
          });
        }
      });
    });

    const nombreDisplay = varianteActiva ? `${producto.descripcion} - ${Object.values(varianteActiva.valoresAtributos || {}).join(' ')}` : producto.descripcion;
    const prodImg = targetProd.imagenUrl || producto.imagenUrl;
    const itemId = modificadoresSeleccionados.length ? `${targetProd.id}-${Date.now()}` : targetProd.id;

    const item = {
      ...targetProd,
      descripcion: nombreDisplay,
      imagenUrl: prodImg,
      id: itemId,
      productoId: targetProd.id,
      padreId: varianteActiva ? producto.id : undefined,
      cantidad: qty,
      precioBase: targetProd.precioUnitario,
      precioUnitario: Number(targetProd.precioUnitario) + pExtra,
      modificadores: modificadoresSeleccionados
    };

    let newCart = [...carrito, item];
    // Check simple existence for non-modified again just to be safe (though irACheckout handled it)
    // If modified, we force add (as unique ID).

    setCarrito(newCart);
    localStorage.setItem(`tienda:${slug}:carrito`, JSON.stringify(newCart));
    navigate(`/tienda/${slug}/checkout`, { state: { carrito: newCart, tienda } });
  };

  const diseno = tienda?.diseno || {};
  const fontFamily = diseno.tipografia || 'Inter, sans-serif';

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Icon icon="eos-icons:loading" className="w-12 h-12 text-gray-300" />
      </div>
    );
  }

  if (!producto) {
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

  return (
    <div className="min-h-screen bg-[#F6F6F6] overflow-x-hidden" style={{ fontFamily: '"Mona Sans", ' + fontFamily }}>
      {/* Header Unificado */}
      <StoreHeader
        tienda={tienda}
        slug={slug || ''}
        carritoCount={carrito.length}
        onToggleCart={() => setMostrarCarrito(!mostrarCarrito)}
        isAdminOpen={isAdminOpen}
        setIsAdminOpen={setIsAdminOpen}
        adminMenuRef={adminMenuRef}
        search={search}
        setSearch={setSearch}
        categories={[]} // Categorías no cargadas en detalle
        onSelectCategory={() => { }}
        recommendedProducts={relatedProducts} // Usar productos relacionados para búsqueda
      />

      <main className="max-w-7xl mx-auto px-5 md:px-8 pt-28 md:pt-36 pb-10">
        {/* Carrito Lateral (Drawer) - Professional Design */}
        <ShoppingCartModal
          isOpen={mostrarCarrito}
          onClose={() => setMostrarCarrito(false)}
          carrito={carrito}
          tienda={tienda}
          actualizarCantidad={actualizarCantidad}
          onCheckout={irACheckout}
          slug={slug}
          setCarrito={setCarrito}
        />

        <nav className="mb-6 flex items-center gap-2 text-xs md:text-sm text-gray-500">
          <button onClick={() => navigate(`/tienda/${slug}`)} className="hover:text-[#FF9500] font-medium transition-colors">
            Inicio
          </button>
          <Icon icon="solar:alt-arrow-right-linear" width={14} className="text-gray-300" />
          <button onClick={() => navigate(`/tienda/${slug}/catalogo`)} className="hover:text-[#FF9500] font-medium transition-colors">
            Catálogo
          </button>
          <Icon icon="solar:alt-arrow-right-linear" width={14} className="text-gray-300" />
          <span className="font-semibold text-[#1A1A1A] truncate max-w-[50vw]">
            {typeof producto.categoria === 'object' && producto.categoria !== null ? (producto.categoria.nombre || producto.categoria.codigo || 'General') : (producto.categoria || 'General')}
          </span>
        </nav>

        {/* Zoom lightbox */}
        {zoomOpen && (
          <div className="fixed inset-0 z-[999] bg-black/90 flex items-center justify-center p-4" onClick={() => setZoomOpen(false)}>
            <button className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors" onClick={() => setZoomOpen(false)}>
              <Icon icon="solar:close-circle-bold" width={24} />
            </button>
            <img
              src={selectedImage || producto.imagenUrl}
              alt={producto.descripcion}
              className="max-w-full max-h-[90vh] object-contain rounded-xl"
              onClick={e => e.stopPropagation()}
            />
          </div>
        )}

        {/* Compare modal */}
        {showCompareModal && (() => {
          const items = getBySlug(slug || '');
          return (
            <div className="fixed inset-0 z-[998] bg-black/50 flex items-center justify-center p-4" onClick={() => setShowCompareModal(false)}>
              <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[85vh] overflow-auto shadow-2xl" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                  <h3 className="text-lg font-black text-gray-900">Comparar productos</h3>
                  <button onClick={() => setShowCompareModal(false)} className="text-gray-400 hover:text-gray-700"><Icon icon="solar:close-circle-bold" width={22} /></button>
                </div>
                {items.length < 2 ? (
                  <div className="p-10 text-center text-gray-400">
                    <Icon icon="solar:transfer-horizontal-bold-duotone" width={48} className="mx-auto mb-3 text-gray-200" />
                    <p className="font-semibold">Agrega al menos 2 productos para comparar</p>
                    <p className="text-sm mt-1">Navega por la tienda y usa el botón ⇄ en cada producto</p>
                  </div>
                ) : (
                  <div className="p-4 overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr>
                          <td className="w-32 text-xs font-bold text-gray-400 uppercase py-3 pr-4"></td>
                          {items.map(item => (
                            <th key={item.id} className="text-center pb-3 px-3 min-w-[140px]">
                              <div className="relative group">
                                <button onClick={() => { useCompareStore.getState().remove(item.id, item.slug); }} className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-100 text-red-500 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-xs font-bold">×</button>
                                <img src={item.imagenUrl || ''} alt={item.descripcion} className="w-20 h-20 object-contain mx-auto mb-2 rounded-xl bg-gray-50 p-2" />
                                <p className="text-xs font-bold text-gray-900 line-clamp-2">{item.descripcion}</p>
                              </div>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          { label: 'Precio', fn: (i: any) => `S/ ${Number(i.precioUnitario).toFixed(2)}` },
                          { label: 'Categoría', fn: (i: any) => i.categoria || '—' },
                          { label: 'Marca', fn: (i: any) => i.marca || '—' },
                          { label: 'Stock', fn: (i: any) => i.stock ?? '—' },
                          { label: 'Calificación', fn: (i: any) => i.ratingAvg ? `★ ${Number(i.ratingAvg).toFixed(1)}` : '—' },
                        ].map(row => (
                          <tr key={row.label} className="border-t border-gray-50">
                            <td className="py-3 pr-4 text-xs font-bold text-gray-500 uppercase">{row.label}</td>
                            {items.map(item => (
                              <td key={item.id} className="py-3 px-3 text-center text-sm text-gray-800 font-medium">{row.fn(item)}</td>
                            ))}
                          </tr>
                        ))}
                        <tr className="border-t border-gray-100">
                          <td className="py-3 pr-4"></td>
                          {items.map(item => (
                            <td key={item.id} className="py-3 px-3 text-center">
                              <button onClick={() => { navigate(`/tienda/${slug}/producto/${item.id}`); setShowCompareModal(false); }} className="text-xs font-bold text-white px-4 py-1.5 rounded-full bg-[#1A1A1A] hover:bg-black transition-colors">Ver producto</button>
                            </td>
                          ))}
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}
                <div className="px-6 py-4 border-t border-gray-100 flex justify-end">
                  <button onClick={() => { clearCompare(slug || ''); setShowCompareModal(false); }} className="text-xs text-red-400 hover:text-red-600 font-semibold transition-colors">Limpiar comparación</button>
                </div>
              </div>
            </div>
          );
        })()}

        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16">
          {/* Main Image Column */}
          <div className="relative">
            {/* Action buttons top-right of image */}
            {producto && (
              <div className="absolute top-3 right-3 z-10 flex flex-col gap-2">
                <button
                  onClick={() => toggleFavorito({ id: producto.id, descripcion: producto.descripcion, precioUnitario: producto.precioUnitario, imagenUrl: selectedImage || producto.imagenUrl, slug: slug || '' })}
                  title={isFavorito(producto.id, slug || '') ? 'Quitar de favoritos' : 'Agregar a favoritos'}
                  className={`w-9 h-9 rounded-full shadow-md flex items-center justify-center transition-all hover:scale-110 ${isFavorito(producto.id, slug || '') ? 'bg-red-500 text-white' : 'bg-white text-gray-400 hover:text-red-500'}`}
                >
                  <Icon icon={isFavorito(producto.id, slug || '') ? 'solar:heart-bold' : 'solar:heart-linear'} width={16} />
                </button>
                <button
                  onClick={() => setZoomOpen(true)}
                  title="Ver imagen ampliada"
                  className="w-9 h-9 rounded-full bg-white shadow-md flex items-center justify-center text-gray-400 hover:text-gray-700 transition-all hover:scale-110"
                >
                  <Icon icon="solar:magnifer-zoom-in-bold" width={16} />
                </button>
                <button
                  onClick={() => {
                    const cat = typeof producto.categoria === 'object' ? producto.categoria?.nombre : producto.categoria;
                    const marca = typeof producto.marca === 'object' ? producto.marca?.nombre : producto.marca;
                    toggleCompare({ id: producto.id, descripcion: producto.descripcion, precioUnitario: producto.precioUnitario, imagenUrl: selectedImage || producto.imagenUrl, categoria: cat, marca, stock: producto.stock, ratingAvg: producto.ratingAvg, slug: slug || '' });
                  }}
                  title={isInCompare(producto.id, slug || '') ? 'Quitar de comparación' : 'Agregar a comparar'}
                  className={`w-9 h-9 rounded-full shadow-md flex items-center justify-center transition-all hover:scale-110 ${isInCompare(producto.id, slug || '') ? 'bg-[#1A1A1A] text-white' : 'bg-white text-gray-400 hover:text-[#1A1A1A]'}`}
                >
                  <Icon icon="solar:transfer-horizontal-bold" width={16} />
                </button>
              </div>
            )}
            <div className="bg-white border border-gray-100 rounded-3xl aspect-[4/5] flex items-center justify-center p-8 relative overflow-hidden shadow-sm cursor-zoom-in" onClick={() => setZoomOpen(true)}>
              {selectedImage || producto.imagenUrl ? (
                <img src={selectedImage || producto.imagenUrl} alt={producto.descripcion} className="w-full h-full object-contain mix-blend-multiply hover:scale-105 transition-transform duration-500" />
              ) : (
                <div className="flex flex-col items-center text-gray-300">
                  <Icon icon="solar:box-linear" className="w-24 h-24 mb-2" />
                  <span className="text-sm">Sin imagen</span>
                </div>
              )}
            </div>

            {/* Miniaturas de galería (imagen principal + adicionales) */}
            {(() => {
              const extras = Array.isArray(producto.imagenesExtra) ? producto.imagenesExtra : [];
              const todas = Array.from(
                new Set([producto.imagenUrl, ...extras].filter(Boolean)),
              ) as string[];
              if (todas.length <= 1) return null;
              const actual = selectedImage || producto.imagenUrl;
              return (
                <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
                  {todas.map((img) => (
                    <button
                      key={img}
                      type="button"
                      onClick={() => setSelectedImage(img)}
                      className={`shrink-0 w-16 h-16 rounded-xl border-2 overflow-hidden bg-white transition-colors ${
                        actual === img
                          ? 'border-[#FF9500]'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <img src={img} alt="" className="w-full h-full object-contain p-1" />
                    </button>
                  ))}
                </div>
              );
            })()}
          </div>

          {/* Details Column */}
          <div className="flex flex-col pt-1 bg-white border border-gray-100 rounded-3xl p-5 md:p-7 shadow-sm">
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span className="text-[11px] uppercase tracking-wider px-2.5 py-1 rounded-full bg-[#FFF3E0] text-[#FF9500] font-bold">Disponible</span>
              <span className="text-[11px] uppercase tracking-wider px-2.5 py-1 rounded-full bg-gray-100 text-gray-600 font-bold">Stock: {stockActual}</span>
            </div>

            <p className="text-gray-500 text-sm mb-1 font-medium">{tienda?.nombreComercial || 'Mi Tienda'}</p>

            {/* Title */}
            <h1 className="text-3xl lg:text-4xl font-black text-[#1A1A1A] mb-3 leading-tight">
              {producto.descripcion}
            </h1>

            <div className="mb-4 flex items-center gap-2">
              {renderStars(reviewSummary.ratingAvg)}
              <span className="text-sm font-semibold text-gray-700">
                {reviewSummary.ratingAvg.toFixed(1)}
              </span>
              <span className="text-sm text-gray-400">
                {reviewSummary.ratingCount > 0 ? `(${reviewSummary.ratingCount} reseñas)` : '(Sin reseñas)'}
              </span>
            </div>

            <p className="text-sm text-gray-500 mb-5 leading-relaxed">
              {producto.descripcion || 'Sin descripción disponible para este producto.'}
            </p>

            <div className="flex items-end gap-2 text-[#1A1A1A] mb-6">
              <span className="text-sm font-semibold text-gray-500 pb-1">S/</span>
              <span className="text-5xl font-black tracking-tight leading-none">{precioFinal.toFixed(2)}</span>
              {producto.enOferta && Number(producto.precioRegular) > precioBaseActual && (
                <>
                  <span className="text-xl font-semibold text-gray-400 line-through pb-1">S/ {(Number(producto.precioRegular) + precioExtra).toFixed(2)}</span>
                  <span className="ml-1 rounded-md bg-red-500 px-2 py-0.5 text-xs font-bold text-white mb-1">-{producto.descuentoOferta}%</span>
                </>
              )}
            </div>

            {/* Klarna / Installments Box */}
            {/* <div className="border border-gray-100 rounded-xl p-4 flex items-center gap-4 mb-8 bg-white shadow-sm">
              <div className="bg-pink-100 px-3 py-1 rounded text-pink-600 font-bold italic">Klarna.</div>
              <div className="text-sm text-gray-600">
                Paga en 3 cuotas sin interés de <span className="font-bold text-gray-900">S/ {(Number(producto.precioUnitario) / 3).toFixed(2)}</span>
              </div>
            </div> */}

            <ProductVariantsShopify
              opciones={producto.opcionesAtributos}
              variantes={producto.variantes}
              selecciones={varianteSelecciones}
              onChange={handleVarianteChange}
            />

            <ProductModifiersSelector
              modifiers={modificadoresProducto}
              selections={selecciones}
              onChange={setSelecciones}
            />

            <div className="flex flex-col md:flex-row gap-3 md:gap-4 mb-6">
              <div className="w-full md:flex-1 flex items-center justify-between bg-[#F3F4F6] rounded-xl px-4 py-2.5 order-1 md:order-none">
                <button onClick={() => setCantidad(Math.max(1, cantidad - 1))} className="text-gray-500 hover:text-black hover:bg-white rounded-md w-7 h-7 flex items-center justify-center transition-colors font-bold">-</button>
                <span className="font-bold text-sm text-gray-900">{cantidad}</span>
                <button onClick={() => setCantidad(Math.min(stockActual || 99, cantidad + 1))} className="text-gray-500 hover:text-black hover:bg-white rounded-md w-7 h-7 flex items-center justify-center transition-colors font-bold">+</button>
              </div>

              <div className="flex gap-3 md:contents w-full order-2 md:order-none">
                <button
                  disabled={isOutOfStock}
                  onClick={handleAgregarProducto}
                  className={`flex-1 py-2.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-colors w-full md:w-auto ${isOutOfStock ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-[#1A1A1A] hover:bg-black text-white'}`}
                >
                  <Icon icon={isOutOfStock ? "solar:close-circle-bold" : "solar:cart-large-minimalistic-linear"} width={20} />
                  <span className="hidden sm:inline">{isOutOfStock ? 'Agotado' : 'Agregar'}</span>
                  <span className="sm:hidden">{isOutOfStock ? 'Agotado' : 'Agregar'}</span>
                </button>

                {!isOutOfStock && (
                  <button
                    onClick={irACheckout}
                    className="flex-1 bg-[#FF9500] hover:bg-[#E08500] text-white py-2.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-colors shadow-sm w-full md:w-auto"
                  >
                    Comprar ahora
                  </button>
                )}
              </div>
            </div>

            <div className="border-t border-gray-100 pt-6">
              <p className="text-sm text-gray-500 mb-1"><span className="font-bold text-gray-900">SKU:</span> {producto.codigo || 'N/A'}</p>
              <p className="text-sm text-gray-500 mb-1">
                <span className="font-bold text-gray-900">Categoría:</span> {typeof producto.categoria === 'object' && producto.categoria !== null ? (producto.categoria.nombre || 'General') : (producto.categoria || 'General')}
              </p>
            </div>

            <div className="flex flex-col md:flex-row gap-3 md:gap-4 mt-5">
              <div className="flex-1 bg-[#FAFBFC] rounded-xl p-4 flex items-center gap-4 border border-gray-100">
                <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-[#FF9500] shadow-sm border border-gray-100">
                  <Icon icon="solar:truck-bold-duotone" width={24} />
                </div>
                <div>
                  <h4 className="font-bold text-gray-900 text-sm">Entrega rápida</h4>
                  <p className="text-xs text-gray-500">Despacho coordinado con la tienda</p>
                </div>
              </div>
              <div className="flex-1 bg-[#FAFBFC] rounded-xl p-4 flex items-center gap-4 border border-gray-100">
                <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-[#22C55E] shadow-sm border border-gray-100">
                  <Icon icon="solar:hand-shake-bold-duotone" width={24} />
                </div>
                <div>
                  <h4 className="font-bold text-gray-900 text-sm">Compra segura</h4>
                  <p className="text-xs text-gray-500">Atención directa por WhatsApp</p>
                </div>
              </div>
            </div>

          </div>
        </div>

      </main>

      {/* Descripción rica */}
      {producto.descripcionLarga && (
        <div className="max-w-7xl mx-auto px-5 md:px-8 mb-10">
          <ClassicDescripcion descripcionLarga={producto.descripcionLarga} />
        </div>
      )}

      {tieneFichaTecnica && (
        <section className="max-w-7xl mx-auto px-5 md:px-8 mb-10">
          <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
            {/* Header */}
            <div className="flex items-center gap-3 border-b border-gray-100 px-6 py-4">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-900 text-white">
                <Icon icon="solar:list-check-bold-duotone" width={16} />
              </div>
              <h2 className="text-sm font-bold uppercase tracking-widest text-gray-500">
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
                    {/* Group header */}
                    <div className="bg-gray-50 px-4 py-2.5 border-b border-gray-100">
                      <span className="text-[11px] font-bold uppercase tracking-widest text-gray-400">{group.nombre}</span>
                    </div>
                    {/* Rows */}
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
          </div>
        </section>
      )}

      <div className="max-w-7xl mx-auto px-5 md:px-8 mb-12">
        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <section className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-black text-[#1A1A1A]">Opiniones de clientes</h3>
                <p className="text-sm text-gray-500">Comentarios aprobados por la tienda.</p>
              </div>
              <div className="text-right">
                <div className="flex justify-end">{renderStars(reviewSummary.ratingAvg, 16)}</div>
                <p className="mt-1 text-xs font-semibold text-gray-500">
                  {reviewSummary.ratingCount > 0 ? `${reviewSummary.ratingAvg.toFixed(1)} / 5` : 'Sin reseñas'}
                </p>
              </div>
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
                          {renderStars(Number(review.rating || 0), 14)}
                          {review.compraVerificada && (
                            <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-bold text-blue-700">
                              Compra verificada
                            </span>
                          )}
                        </div>
                      </div>
                      <span className="text-xs text-gray-400">
                        {new Date(review.creadoEn).toLocaleDateString('es-PE')}
                      </span>
                    </div>
                    <p className="text-sm leading-6 text-gray-600">{review.comentario}</p>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section id="producto-review-form" className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
            <h3 className="text-xl font-black text-[#1A1A1A]">Deja tu comentario</h3>
            <p className="mb-5 text-sm text-gray-500">No necesitas cuenta. Si tienes código de pedido, tu reseña puede salir como verificada.</p>
            <div className="space-y-3">
              <input
                value={reviewForm.clienteNombre}
                onChange={(e) => setReviewForm((prev) => ({ ...prev, clienteNombre: e.target.value }))}
                placeholder="Tu nombre"
                className="h-11 w-full rounded-xl border border-gray-200 px-4 text-sm outline-none focus:border-[#FF9500]"
              />
              <div className="grid gap-3 md:grid-cols-2">
                <input
                  value={reviewForm.clienteTelefono}
                  onChange={(e) => setReviewForm((prev) => ({ ...prev, clienteTelefono: e.target.value }))}
                  placeholder="Celular"
                  className="h-11 w-full rounded-xl border border-gray-200 px-4 text-sm outline-none focus:border-[#FF9500]"
                />
                <input
                  value={reviewForm.clienteEmail}
                  onChange={(e) => setReviewForm((prev) => ({ ...prev, clienteEmail: e.target.value }))}
                  placeholder="Email opcional"
                  className="h-11 w-full rounded-xl border border-gray-200 px-4 text-sm outline-none focus:border-[#FF9500]"
                />
              </div>
              <input
                value={reviewForm.codigoSeguimiento}
                onChange={(e) => setReviewForm((prev) => ({ ...prev, codigoSeguimiento: e.target.value }))}
                placeholder="Código de pedido opcional"
                className="h-11 w-full rounded-xl border border-gray-200 px-4 text-sm outline-none focus:border-[#FF9500]"
              />
              <div>
                <p className="mb-2 text-xs font-bold uppercase text-gray-500">Calificación</p>
                <div className="flex gap-1">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => setReviewForm((prev) => ({ ...prev, rating: index + 1 }))}
                      className="text-[#FFB020]"
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
                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-[#FF9500]"
              />
              <button
                onClick={enviarReview}
                disabled={reviewSending}
                className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#1A1A1A] text-sm font-bold text-white transition hover:bg-black disabled:opacity-60"
              >
                {reviewSending ? <Icon icon="eos-icons:loading" /> : <Icon icon="solar:chat-round-like-bold" />}
                Enviar comentario
              </button>
            </div>
          </section>
        </div>
      </div>

      {/* Related Products — slider con flechas */}
      {relatedProducts.length > 0 && (
        <div className="max-w-7xl mx-auto px-8 md:px-12 border-t border-gray-200 pt-10 mb-14">
          <h3 className="text-2xl font-black mb-6 text-left text-[#1A1A1A] tracking-tight">Productos similares</h3>
          <RelatedSlider>
            {relatedProducts.slice(0, 12).map((rp) => (
              <div key={rp.id} className="flex-shrink-0 w-[160px] md:w-[200px]">
                <ProductCardPio
                  producto={rp}
                  slug={slug || ''}
                  diseno={diseno}
                  onAddToCart={(p) => { agregarAlCarritoDirecto(p, 1); }}
                  onClick={() => {
                    navigate(`/tienda/${slug}/producto/${rp.id}`);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                />
              </div>
            ))}
          </RelatedSlider>
        </div>
      )}
      {/* Barra flotante de comparar */}
      {getBySlug(slug || '').length > 0 && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-[#1A1A1A] text-white rounded-2xl px-5 py-3 shadow-2xl">
          <Icon icon="solar:transfer-horizontal-bold" width={18} className="text-gray-300" />
          <span className="text-sm font-semibold">{getBySlug(slug || '').length} producto{getBySlug(slug || '').length > 1 ? 's' : ''} para comparar</span>
          <button onClick={() => setShowCompareModal(true)} className="bg-white text-[#1A1A1A] text-xs font-black px-4 py-1.5 rounded-full hover:bg-gray-100 transition-colors">Comparar</button>
          <button onClick={() => clearCompare(slug || '')} className="text-gray-400 hover:text-white transition-colors"><Icon icon="solar:close-circle-bold" width={18} /></button>
        </div>
      )}

      <Footer tienda={tienda} diseno={diseno} />

      <ReviewFeedbackModal
        isOpen={showReviewSuccess}
        onClose={() => setShowReviewSuccess(false)}
        color={diseno.colorPrimario || '#FF9500'}
      />


    </div>
  );
}
