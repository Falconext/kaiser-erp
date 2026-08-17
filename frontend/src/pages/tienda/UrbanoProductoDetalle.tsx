import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion, type PanInfo } from 'framer-motion';
import { Icon } from '@iconify/react';
import axios from 'axios';
import { useFavoritosStore } from '@/zustand/favoritos';
import { onTiendaCartCleared, tiendaCartKey } from '@/utils/tiendaCart';
import { withPricing, withPricingList } from '@/templates/shared/pricing';
import UrbanoCartModal from '@/components/tienda/UrbanoCartModal';
import ProductModifiersSelector from '@/components/tienda/ProductModifiersSelector';
import UrbanoHeader from '@/templates/urbano/UrbanoHeader';
import UrbanoProductCard from '@/templates/urbano/UrbanoProductCard';
import UrbanoFooter from '@/templates/urbano/UrbanoFooter';
import {
  findFashionVariant,
  getDefaultVariantSelection,
  getFashionColorGallery,
  getFashionColorImage,
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

function LoadingSkeleton() {
  return (
    <div className="min-h-screen bg-white animate-pulse">
      <div className="h-28 bg-gray-100" />
      <div className="flex flex-col lg:flex-row min-h-screen">
        <div className="w-full lg:w-[55%] bg-[#F4F5F6]" />
        <div className="w-full lg:w-[45%] p-10 lg:p-20 space-y-6">
          <div className="h-10 w-3/4 bg-gray-100" />
          <div className="h-6 w-32 bg-gray-100" />
          <div className="h-12 w-full bg-gray-100" />
          <div className="h-52 w-full bg-gray-50" />
        </div>
      </div>
    </div>
  );
}

export default function UrbanoProductoDetalle() {
  const { slug, id } = useParams();
  const navigate = useNavigate();

  const [producto, setProducto] = useState<any>(null);
  const [tienda, setTienda] = useState<any>(null);
  const [categorias, setCategorias] = useState<any[]>([]);
  const [related, setRelated] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [reviewSummary, setReviewSummary] = useState({ ratingAvg: 0, ratingCount: 0 });
  const [modificadoresProducto, setModificadoresProducto] = useState<any[]>([]);
  const [selecciones, setSelecciones] = useState<Record<number, number[]>>({});
  const [loading, setLoading] = useState(true);
  const [cantidad] = useState(1);
  const [selectedImage, setSelectedImage] = useState('');
  const [carrito, setCarrito] = useState<any[]>([]);
  const [mostrarCarrito, setMostrarCarrito] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [varianteSelecciones, setVarianteSelecciones] = useState<Record<string, string>>({});
  const [varianteActiva, setVarianteActiva] = useState<any>(null);
  const [openAccordion, setOpenAccordion] = useState<string | null>('DESCRIPCION');
  const [imgDirection, setImgDirection] = useState(0);
  const imageColumnRef = useRef<HTMLDivElement>(null);
  const { toggleFavorito, isFavorito } = useFavoritosStore();

  useEffect(() => {
    if (!slug) return;
    return onTiendaCartCleared(slug, () => {
      setCarrito([]);
      setMostrarCarrito(false);
    });
  }, [slug]);

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 150);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (!slug || !id) return;

    const load = async () => {
      try {
        setLoading(true);
        window.scrollTo(0, 0);

        const [prodRes, tiendaRes] = await Promise.all([
          axios.get(`${BASE_URL}/public/store/${slug}/products/${id}`),
          axios.get(`${BASE_URL}/public/store/${slug}`),
        ]);

        const prod = withPricing(prodRes.data.data || prodRes.data);
        const tiendaData = tiendaRes.data.data || tiendaRes.data;
        setProducto(prod);
        setTienda(tiendaData);
        setReviews([]);
        setReviewSummary({
          ratingAvg: Number(prod.ratingAvg || prod.ratingPromedio || prod.promedioRating || 0),
          ratingCount: Number(prod.ratingCount || prod.totalReviews || prod.reviewsCount || 0),
        });
        const defaultVariantSelection = getDefaultVariantSelection(prod);
        const defaultVariant = findFashionVariant(prod, defaultVariantSelection);
        const defaultColor = defaultVariantSelection[getVariantOptionNames(prod).color];
        const defaultGallery = defaultColor ? getFashionColorGallery(prod, defaultColor) : [];
        setSelectedImage(defaultGallery[0] || defaultVariant?.imagenUrl || prod.imagenUrl || '');
        setVarianteSelecciones(defaultVariantSelection);
        setVarianteActiva(defaultVariant);


        try {
          const catRes = await axios.get(`${BASE_URL}/public/store/${slug}/categories`);
          setCategorias(Array.isArray(catRes.data?.data) ? catRes.data.data : []);
        } catch {
          setCategorias([]);
        }

        try {
          const modsRes = await axios.get(`${BASE_URL}/public/store/${slug}/products/${prod.id}/modifiers`);
          const mods = modsRes.data.data || modsRes.data || [];
          setModificadoresProducto(mods);
          const defaults: Record<number, number[]> = {};
          mods.forEach((g: any) => {
            const defs = g.opciones.filter((op: any) => op.esDefault).map((op: any) => op.id);
            defaults[g.id] = g.esObligatorio && g.seleccionMax === 1 && defs.length === 0 && g.opciones.length > 0 ? [g.opciones[0].id] : defs;
          });
          setSelecciones(defaults);
        } catch {
          setModificadoresProducto([]);
        }

        try {
          const relRes = await axios.get(`${BASE_URL}/public/store/${slug}/products/${id}/related`);
          const rel = relRes.data.data || relRes.data;
          setRelated(Array.isArray(rel) ? withPricingList(rel.slice(0, 10)) : []);
        } catch {
          setRelated([]);
        }

        try {
          const reviewsRes = await axios.get(`${BASE_URL}/public/store/${slug}/products/${prod.id}/reviews`);
          const payload = reviewsRes.data?.data || reviewsRes.data || {};
          const reviewItems = Array.isArray(payload.reviews) ? payload.reviews : [];
          setReviews(reviewItems);
          setReviewSummary({
            ratingAvg: Number(payload.ratingAvg || payload.promedio || 0),
            ratingCount: Number(payload.ratingCount || reviewItems.length || 0),
          });
        } catch {
          setReviews([]);
        }

        try {
          const saved = localStorage.getItem(tiendaCartKey(slug));
          if (saved) setCarrito(JSON.parse(saved));
        } catch {}
      } catch {
        navigate(`/tienda/${slug}`);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [slug, id, navigate]);

  const precioExtra = modificadoresProducto.reduce((total, grupo) => {
    return total + grupo.opciones
      .filter((op: any) => (selecciones[grupo.id] || []).includes(op.id))
      .reduce((sum: number, op: any) => sum + Number(op.precioExtra || 0), 0);
  }, 0);

  const handleVariantChange = (optionName: string, value: string) => {
    let nextSelection = { ...varianteSelecciones, [optionName]: value };
    let match = findFashionVariant(producto, nextSelection);

    // Si la combinación color+talla actual no existe, auto-seleccionar primera talla disponible
    if (!match && Array.isArray(producto?.variantes)) {
      const fallback = producto.variantes.find((v: any) => {
        const vals = variantValues(v);
        return vals[optionName] === value && Number(v?.stock ?? 0) > 0;
      });
      if (fallback) {
        nextSelection = variantValues(fallback);
        match = fallback;
      }
    }

    setVarianteSelecciones(nextSelection);
    setVarianteActiva(match);

    // La imagen es por color: usar la representativa del color seleccionado
    const selectedColor = nextSelection[getVariantOptionNames(producto).color];
    const colorGallery = selectedColor ? getFashionColorGallery(producto, selectedColor) : [];
    const colorImage = selectedColor ? getFashionColorImage(producto, selectedColor) : null;
    if (colorGallery[0]) setSelectedImage(colorGallery[0]);
    else if (colorImage) setSelectedImage(colorImage);
    else if (match?.imagenUrl) setSelectedImage(match.imagenUrl);
  };

  const addToCart = () => {
    if (!producto || !slug) return;
    if (Array.isArray(producto.variantes) && producto.variantes.length > 0 && !varianteActiva) {
      alert('Selecciona una combinación disponible de color y talla.');
      return;
    }

    for (const grupo of modificadoresProducto) {
      if (grupo.esObligatorio && (selecciones[grupo.id] || []).length < (grupo.seleccionMin || 1)) {
        alert(`Por favor selecciona una opción para "${grupo.nombre}"`);
        return;
      }
    }

    const mods: any[] = [];
    modificadoresProducto.forEach((grupo) => {
      (selecciones[grupo.id] || []).forEach((opId: number) => {
        const op = grupo.opciones.find((item: any) => item.id === opId);
        if (op) mods.push({ grupoId: grupo.id, grupoNombre: grupo.nombre, opcionId: op.id, opcionNombre: op.nombre, precioExtra: op.precioExtra });
      });
    });

    Object.entries(varianteSelecciones).forEach(([grupoNombre, opcionNombre]) => {
      if (opcionNombre) {
        mods.push({
          grupoId: `variante-${grupoNombre}`,
          grupoNombre,
          opcionId: opcionNombre,
          opcionNombre,
          precioExtra: 0,
        });
      }
    });

    const extra = mods.reduce((sum, mod) => sum + Number(mod.precioExtra || 0), 0);
    const itemId = mods.length ? `${producto.id}-${Date.now()}` : producto.id;
    const precioBase = Number(varianteActiva?.precioUnitario ?? producto.precioUnitario ?? 0);
    const item = {
      ...producto,
      id: itemId,
      productoId: producto.id,
      varianteId: varianteActiva?.id,
      descripcion: varianteActiva?.descripcion || producto.descripcion,
      imagenUrl: varianteActiva?.imagenUrl || selectedImage || producto.imagenUrl,
      cantidad,
      precioBase,
      precioUnitario: precioBase + extra,
      modificadores: mods,
    };

    let current: any[] = [];
    try {
      const saved = localStorage.getItem(tiendaCartKey(slug));
      if (saved) current = JSON.parse(saved) || [];
    } catch {}

    if (!mods.length && !varianteActiva) {
      const exists = current.find((cartItem) => cartItem.productoId === item.productoId && !cartItem.modificadores?.length);
      if (exists) {
        const updated = current.map((cartItem) => cartItem.productoId === item.productoId && !cartItem.modificadores?.length
          ? { ...cartItem, cantidad: cartItem.cantidad + cantidad }
          : cartItem);
        setCarrito(updated);
        try { localStorage.setItem(tiendaCartKey(slug), JSON.stringify(updated)); } catch {}
        setMostrarCarrito(true);
        return;
      }
    }

    const updated = [...current, item];
    setCarrito(updated);
    try { localStorage.setItem(tiendaCartKey(slug), JSON.stringify(updated)); } catch {}
    setMostrarCarrito(true);
  };

  const actualizarCantidad = (productoId: number | string, qty: number) => {
    const updated = qty <= 0
      ? carrito.filter((item) => item.id !== productoId)
      : carrito.map((item) => item.id === productoId ? { ...item, cantidad: qty } : item);
    setCarrito(updated);
    if (slug) {
      try { localStorage.setItem(tiendaCartKey(slug), JSON.stringify(updated)); } catch {}
    }
  };

  const irACheckout = () => navigate(`/tienda/${slug}/checkout`, { state: { carrito, tienda } });

  if (loading) return <LoadingSkeleton />;
  if (!producto || !tienda) return null;

  const diseno = tienda?.diseno || {};
  const cp = diseno.colorPrimario || '#111111';
  const variantPrice = Number(varianteActiva?.precioUnitario ?? producto.precioUnitario ?? 0);
  const finalPrice = variantPrice + precioExtra;
  const currentStock = Number(varianteActiva?.stock ?? producto?.stock ?? 0);
  const isUnavailableVariant = Array.isArray(producto.variantes) && producto.variantes.length > 0 && !varianteActiva;
  const isOutOfStock = isUnavailableVariant || currentStock <= 0;
  const cartCount = carrito.reduce((sum, item) => sum + Number(item.cantidad || 1), 0);
  const extraImages = Array.isArray(producto.imagenes)
    ? producto.imagenes
    : Array.isArray(producto.imagenesExtra)
      ? producto.imagenesExtra
      : [];

  // Deduplica por pathname para ignorar tokens de firma S3 distintos sobre la misma imagen
  const urlPath = (url: string) => { try { return new URL(url).pathname; } catch { return url; } };
  const variantOptionNames = getVariantOptionNames(producto);
  // Una imagen por color (cada talla guarda su propio archivo, pero la foto es por color).
  // Si hay imágenes por color, los thumbnails son los colores (uno por color); si no,
  // se usa la imagen principal del producto + extras.
  const selectedColor = varianteSelecciones[variantOptionNames.color];
  const selectedColorGallery = selectedColor ? getFashionColorGallery(producto, selectedColor) : [];
  const colorThumbs = getFashionColors(producto)
    .flatMap((color) => getFashionColorGallery(producto, color.name).length ? getFashionColorGallery(producto, color.name) : [color.image])
    .filter(Boolean) as string[];
  const productImages = (() => {
    const seen = new Set<string>();
    const source = selectedColorGallery.length > 0
      ? [...selectedColorGallery, ...colorThumbs, producto.imagenUrl, ...extraImages]
      : colorThumbs.length > 0
      ? [producto.imagenUrl, ...colorThumbs, ...extraImages]
      : [producto.imagenUrl, ...extraImages];
    return source
      .filter(Boolean)
      .filter((url: string) => {
        const key = urlPath(url);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
  })();
  const mainImage = selectedImage || productImages[0] || diseno.urbanoProductMainImg || '/assets/templates/urbano/coleccion1.png';

  const isColorGroup = (grupo: any) => /color|colour/i.test(grupo.nombre) && grupo.opciones.some((op: any) => op.colorHex);
  const isSizeGroup = (grupo: any) => /talla|size|tamaño/i.test(grupo.nombre);
  const colorGroups = modificadoresProducto.filter(isColorGroup);
  const sizeGroups = modificadoresProducto.filter(isSizeGroup);
  const otherGroups = modificadoresProducto.filter((grupo) => !isColorGroup(grupo) && !isSizeGroup(grupo));
  const variantColors = colorGroups.length ? [] : getFashionColors(producto);
  const variantSizes = sizeGroups.length ? [] : getFashionSizes(producto);

  // Al clickear un thumbnail, sincroniza el color seleccionado con la imagen de esa variante
  const handleThumbnailClick = (image: string) => {
    const matched = Array.isArray(producto?.variantes)
      ? producto.variantes.find((v: any) => v.imagenUrl && urlPath(v.imagenUrl) === urlPath(image))
      : null;
    const color = matched ? variantValues(matched)[variantOptionNames.color] : null;
    if (color) {
      handleVariantChange(variantOptionNames.color, color);
    } else {
      setSelectedImage(image);
    }
  };

  // --- Galería como slide (swipe en mobile) ---
  const currentImageIndex = Math.max(
    0,
    productImages.findIndex((img: string) => urlPath(img) === urlPath(mainImage)),
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

  // En mobile, al elegir un color llevamos la vista al tope de la imagen para
  // que se vea el cambio (los swatches están debajo de la foto).
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

  const selectModifierColor = (grupoId: number, opId: number) => {
    setSelecciones((prev) => ({ ...prev, [grupoId]: [opId] }));
    scrollToImageTop();
  };

  const AccordionItem = ({ title, id: itemId, children }: { title: string; id: string; children: React.ReactNode }) => (
    <div className="border-b border-gray-200">
      <button
        className="w-full flex justify-between items-center py-5 text-xs font-bold uppercase tracking-wider transition-colors hover:text-gray-600"
        onClick={() => setOpenAccordion(openAccordion === itemId ? null : itemId)}
      >
        <span>{title}</span>
        <span className="text-lg leading-none font-normal">{openAccordion === itemId ? '-' : '+'}</span>
      </button>
      <div className={`overflow-hidden transition-all duration-300 ease-in-out ${openAccordion === itemId ? 'max-h-[1500px] opacity-100 pb-5' : 'max-h-0 opacity-0'}`}>
        {children}
      </div>
    </div>
  );
  const renderStars = (rating: number, size = 14) => (
    <span className="inline-flex items-center gap-0.5 text-[#F59E0B]">
      {Array.from({ length: 5 }).map((_, index) => (
        <Icon key={index} icon={index < Math.round(rating || 0) ? 'solar:star-bold' : 'solar:star-linear'} width={size} />
      ))}
    </span>
  );

  return (
    <div className="relative bg-white text-black font-sans w-full selection:bg-black selection:text-white" style={{ fontFamily: '"Inter", sans-serif' }}>
      <div className={`fixed top-0 left-0 w-full bg-white border-b border-gray-200 z-[80] flex items-center justify-between px-4 md:px-8 py-3 transition-transform duration-300 ${isScrolled ? 'translate-y-0' : '-translate-y-full'}`}>
        <span className="font-bold text-[13px] tracking-tight line-clamp-1">{producto.descripcion}</span>
        <button
          disabled={isOutOfStock}
          onClick={addToCart}
          className="bg-black text-white px-6 md:px-8 py-3 text-[10px] md:text-xs font-bold uppercase tracking-widest hover:bg-gray-800 disabled:opacity-50 transition-colors"
        >
          {isOutOfStock ? 'SIN STOCK' : 'AGREGAR AL CARRITO'}
        </button>
      </div>

      <UrbanoHeader
        tienda={tienda}
        slug={slug || ''}
        cp={cp}
        carritoSize={cartCount}
        onOpenCart={() => setMostrarCarrito(true)}
        categories={categorias}
      />

      <main className="w-full flex flex-col">
        <section className="flex flex-col lg:flex-row w-full min-h-[calc(100vh-108px)]">
          <div ref={imageColumnRef} className="w-full lg:w-[55%] bg-[#F4F5F6] flex items-center justify-center min-h-[62vh] lg:min-h-[calc(100vh-108px)] relative overflow-hidden group">
            <AnimatePresence initial={false} custom={imgDirection} mode="popLayout">
              <motion.img
                key={mainImage}
                src={mainImage}
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
                className="absolute top-6 left-0 right-0 bottom-0 w-full h-[calc(100%-24px)] object-contain select-none touch-pan-y lg:touch-auto"
              />
            </AnimatePresence>

            {productImages.length > 1 && (
              <div className="absolute z-10 left-4 right-4 top-4 flex flex-row overflow-x-auto no-scrollbar gap-2 lg:right-auto lg:flex-col lg:overflow-visible">
                {productImages.slice(0, 6).map((image: string) => (
                  <motion.button
                    key={image}
                    onClick={() => handleThumbnailClick(image)}
                    whileTap={{ scale: 0.92 }}
                    className={`h-16 w-12 shrink-0 overflow-hidden bg-white border-2 transition-colors ${urlPath(selectedImage) === urlPath(image) ? 'border-black' : 'border-white'}`}
                  >
                    <img src={image} alt="" className="h-full w-full object-cover" draggable={false} />
                  </motion.button>
                ))}
              </div>
            )}

            {productImages.length > 1 && (
              <div className="absolute bottom-4 left-0 right-0 z-10 flex justify-center gap-1.5 lg:hidden">
                {productImages.slice(0, 6).map((image: string, i: number) => (
                  <button
                    key={image}
                    onClick={() => goToImage(i)}
                    aria-label={`Ver imagen ${i + 1}`}
                    className="p-1.5"
                  >
                    <motion.span
                      animate={{
                        width: urlPath(selectedImage) === urlPath(image) ? 20 : 6,
                        opacity: urlPath(selectedImage) === urlPath(image) ? 1 : 0.35,
                      }}
                      transition={{ duration: 0.3 }}
                      className="block h-1.5 rounded-full bg-black"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="w-full lg:w-[45%] bg-white relative">
            <div className="lg:sticky lg:top-[108px] w-full h-full lg:h-[calc(100vh-108px)] p-8 lg:p-16 xl:p-24 flex flex-col items-start overflow-y-auto no-scrollbar">
              <div className="w-full max-w-md pt-8 lg:pt-16">
                <button onClick={() => navigate(`/tienda/${slug}`)} className="mb-8 text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400 hover:text-black">
                  Volver a la tienda
                </button>

                <h1 className="text-3xl lg:text-[2.5rem] font-bold tracking-tighter mb-4 leading-none">
                  {producto.descripcion}
                </h1>
                {reviewSummary.ratingCount > 0 && (
                  <button
                    type="button"
                    onClick={() => setOpenAccordion('RESENAS')}
                    className="mb-5 inline-flex items-center gap-2 text-[11px] font-bold text-gray-500 hover:text-black transition-colors"
                  >
                    {renderStars(reviewSummary.ratingAvg)}
                    <span>{reviewSummary.ratingAvg.toFixed(1)} ({reviewSummary.ratingCount} reseñas)</span>
                  </button>
                )}
                <div className="flex items-center gap-3 mb-10">
                  <p className="text-lg font-bold text-gray-900">
                    S/. {finalPrice.toFixed(2)}
                  </p>
                  {producto.enOferta && Number(producto.precioRegular) > variantPrice && (
                    <>
                      <span className="text-base font-medium text-gray-400 line-through">
                        S/. {(Number(producto.precioRegular) + precioExtra).toFixed(2)}
                      </span>
                      <span className="bg-black text-white text-[10px] font-bold uppercase tracking-wider px-2 py-1">
                        -{producto.descuentoOferta}%
                      </span>
                    </>
                  )}
                </div>

                {colorGroups.length > 0 ? colorGroups.map((grupo) => (
                  <div key={grupo.id} className="mb-10">
                    <p className="text-[11px] font-bold uppercase tracking-wider mb-4">
                      COLOR: {grupo.opciones.find((op: any) => selecciones[grupo.id]?.includes(op.id))?.nombre || 'Selecciona'}
                    </p>
                    <div className="flex flex-wrap gap-2.5">
                      {grupo.opciones.map((op: any) => {
                        const selected = (selecciones[grupo.id] || []).includes(op.id);
                        return (
                          <motion.button
                            key={op.id}
                            onClick={() => selectModifierColor(grupo.id, op.id)}
                            whileTap={{ scale: 0.9 }}
                            animate={{ scale: selected ? 1.06 : 1 }}
                            transition={{ type: 'spring', stiffness: 400, damping: 22 }}
                            className="relative w-[50px] h-[60px] rounded border p-1"
                            style={{ borderColor: selected ? '#000' : '#E5E7EB' }}
                            title={op.nombre}
                          >
                            <div className="w-full h-full rounded-[2px]" style={{ backgroundColor: op.colorHex || '#DDD' }} />
                          </motion.button>
                        );
                      })}
                    </div>
                  </div>
                )) : variantColors.length > 0 ? (
                  <div className="mb-10">
                    <p className="text-[11px] font-bold uppercase tracking-wider mb-4">
                      COLOR: {varianteSelecciones[variantOptionNames.color] || 'Selecciona'}
                    </p>
                    <div className="flex flex-wrap gap-2.5">
                      {variantColors.map((color) => {
                        const available = isFashionVariantAvailable(producto, {
                          [variantOptionNames.color]: color.name,
                        });
                        return (
                          <motion.button
                            key={color.name}
                            onClick={() => selectVariantColor(color.name)}
                            disabled={!available}
                            whileTap={{ scale: 0.9 }}
                            animate={{ scale: varianteSelecciones[variantOptionNames.color] === color.name ? 1.06 : 1 }}
                            transition={{ type: 'spring', stiffness: 400, damping: 22 }}
                            className="relative w-[50px] h-[60px] rounded border p-1 disabled:cursor-not-allowed disabled:opacity-35"
                            style={{ borderColor: varianteSelecciones[variantOptionNames.color] === color.name ? '#000' : '#E5E7EB' }}
                            title={color.name}
                          >
                            <div className="w-full h-full rounded-[2px]" style={{ backgroundColor: color.hex }} />
                          </motion.button>
                        );
                      })}
                    </div>
                  </div>
                ) : null}

                {sizeGroups.length > 0 ? sizeGroups.map((grupo) => (
                  <div key={grupo.id} className="w-full mb-10">
                    <div className="flex justify-between items-end mb-4">
                      <span className="text-[11px] font-bold uppercase tracking-wider">
                        {grupo.nombre}: {grupo.opciones.find((op: any) => selecciones[grupo.id]?.includes(op.id))?.nombre || 'Selecciona'}
                      </span>
                      <button className="text-[11px] font-bold uppercase tracking-wider border-b border-black">GUÍA DE TALLAS</button>
                    </div>
                    <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 mb-4">
                      {grupo.opciones.map((op: any) => {
                        const selected = (selecciones[grupo.id] || []).includes(op.id);
                        return (
                          <button
                            key={op.id}
                            onClick={() => setSelecciones((prev) => ({ ...prev, [grupo.id]: [op.id] }))}
                            className={`h-[42px] text-[11px] font-bold tracking-widest uppercase border rounded transition-colors ${selected ? 'bg-black text-white border-black' : 'bg-white text-black border-gray-200 hover:border-black'}`}
                          >
                            {op.nombre}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )) : variantSizes.length > 0 ? (
                  <div className="w-full mb-10">
                    <div className="flex justify-between items-end mb-4">
                      <span className="text-[11px] font-bold uppercase tracking-wider">
                        TALLA: {varianteSelecciones[variantOptionNames.size] || 'Selecciona'}
                      </span>
                      <button className="text-[11px] font-bold uppercase tracking-wider border-b border-black">GUÍA DE TALLAS</button>
                    </div>
                    <div className="grid grid-cols-6 gap-2 mb-4">
                      {variantSizes.map((size) => {
                        const available = isFashionVariantAvailable(producto, {
                          ...varianteSelecciones,
                          [variantOptionNames.size]: size,
                        });
                        return (
                          <button
                            key={size}
                            onClick={() => handleVariantChange(variantOptionNames.size, size)}
                            disabled={!available}
                            className={`h-[42px] text-[11px] font-bold tracking-widest uppercase border rounded transition-colors disabled:cursor-not-allowed disabled:border-gray-100 disabled:bg-gray-50 disabled:text-gray-300 ${varianteSelecciones[variantOptionNames.size] === size ? 'bg-black text-white border-black' : 'bg-white text-black border-gray-200 hover:border-black'}`}
                          >
                            {size}
                          </button>
                        );
                      })}
                    </div>
                    <div className="flex justify-between items-center text-[11px] font-bold tracking-wide">
                      <span className="text-gray-600">Elige tu talla habitual</span>
                      <span className="text-[#3b8c6a]">{isOutOfStock ? 'AGOTADO' : 'DISPONIBLE'}</span>
                    </div>
                  </div>
                ) : null}

                {otherGroups.length > 0 && (
                  <div className="mb-10">
                    <ProductModifiersSelector modifiers={otherGroups} selections={selecciones} onChange={setSelecciones} />
                  </div>
                )}

                <div className="flex gap-3 w-full mb-12">
                  <button
                    disabled={isOutOfStock}
                    onClick={addToCart}
                    className="flex-1 bg-black text-white h-[52px] rounded font-bold text-[11px] tracking-[0.2em] uppercase hover:bg-gray-800 disabled:opacity-50 transition-colors"
                  >
                    {isOutOfStock ? 'SIN STOCK' : 'AGREGAR AL CARRITO'}
                  </button>
                  <button
                    onClick={() => toggleFavorito({ id: producto.id, descripcion: producto.descripcion, precioUnitario: finalPrice, imagenUrl: producto.imagenUrl, slug: slug || '' })}
                    className="w-[52px] h-[52px] flex items-center justify-center border border-gray-200 rounded hover:border-black transition-colors text-gray-500 hover:text-black"
                  >
                    <Icon icon={isFavorito(producto.id, slug || '') ? 'solar:heart-bold' : 'solar:heart-linear'} className={`text-xl ${isFavorito(producto.id, slug || '') ? 'text-red-500' : ''}`} />
                  </button>
                </div>

                <div className="flex flex-col gap-5 text-[11px] font-medium text-black">
                  <div className="flex gap-4 items-center"><Icon icon="solar:box-linear" className="text-xl flex-shrink-0 text-gray-400" /><span>{isOutOfStock ? 'Producto sin stock disponible' : `Stock disponible: ${currentStock} unidades`}</span></div>
                  <div className="flex gap-4 items-center"><Icon icon="solar:tag-price-linear" className="text-xl flex-shrink-0 text-gray-400" /><span>{producto.marca?.nombre || producto.marca ? `Marca: ${producto.marca?.nombre || producto.marca}` : 'Producto publicado por la tienda'}</span></div>
                  <div className="flex gap-4 items-center"><Icon icon="solar:shield-check-linear" className="text-xl flex-shrink-0 text-gray-400" /><span>Compra protegida con seguimiento de pedido</span></div>
                  <div className="flex gap-4 items-center"><Icon icon="solar:delivery-linear" className="text-xl flex-shrink-0 text-gray-400" /><span>Entrega coordinada según la configuración del negocio</span></div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="flex flex-col-reverse lg:flex-row w-full border-t border-gray-200">
          <div className="w-full lg:w-[50%] min-w-0 p-8 lg:p-16 xl:p-24 flex flex-col justify-center bg-white">
            <div className="w-full min-w-0 max-w-lg mx-auto lg:mx-auto lg:mr-16">
              <AccordionItem title="DESCRIPCIÓN" id="DESCRIPCION">
                {producto.descripcionLarga ? (
                  <div
                    className="text-[13px] leading-relaxed text-black font-medium pr-4 space-y-3 break-words [overflow-wrap:anywhere] whitespace-normal [&_p]:whitespace-normal [&_p]:break-words [&_h1]:text-base [&_h1]:font-black [&_h1]:uppercase [&_h2]:text-sm [&_h2]:font-black [&_h2]:uppercase [&_h2]:tracking-tight [&_h3]:font-bold [&_h3]:uppercase [&_p]:mb-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:text-gray-700 [&_strong]:font-bold [&_a]:underline"
                    dangerouslySetInnerHTML={{ __html: producto.descripcionLarga }}
                  />
                ) : (
                  <div className="text-[13px] leading-relaxed text-black font-medium pr-4 break-words [overflow-wrap:anywhere] whitespace-normal">
                    {`Prenda seleccionada para una tienda urbana. ${producto.descripcion} mantiene una presentación editorial y lista para venta online.`}
                  </div>
                )}
              </AccordionItem>
              <AccordionItem title="DETALLES" id="DETALLES">
                <ul className="text-[13px] leading-relaxed text-gray-600 list-disc pl-4 space-y-2">
                  <li>Stock actual: {currentStock ?? '-'}</li>
                  <li>Categoría: {producto.categoria?.nombre || producto.categoria || '-'}</li>
                  <li>Marca: {producto.marca?.nombre || producto.marca || '-'}</li>
                </ul>
              </AccordionItem>
              <AccordionItem title="ENTREGA Y CAMBIOS" id="ENTREGA">
                <div className="text-[13px] leading-relaxed text-gray-600">
                  Coordina entrega, recojo o envío desde la tienda virtual. Los tiempos dependen de la configuración del negocio.
                </div>
              </AccordionItem>
              <AccordionItem title="RESEÑAS" id="RESENAS">
                {reviewSummary.ratingCount > 0 ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 text-[13px] font-bold text-black">
                      {renderStars(reviewSummary.ratingAvg, 15)}
                      <span>{reviewSummary.ratingAvg.toFixed(1)} de 5</span>
                      <span className="text-gray-400">({reviewSummary.ratingCount})</span>
                    </div>
                    <div className="space-y-3">
                      {reviews.slice(0, 6).map((review) => (
                        <div key={review.id || `${review.clienteNombre}-${review.creadoEn}`} className="border border-gray-100 p-4">
                          <div className="flex items-center justify-between gap-3 mb-2">
                            <div>
                              <p className="text-[12px] font-bold text-black">{review.clienteNombre || 'Cliente verificado'}</p>
                              {review.compraVerificada && (
                                <p className="text-[10px] font-bold uppercase tracking-widest text-[#3b8c6a]">Compra verificada</p>
                              )}
                            </div>
                            {renderStars(Number(review.rating || 0), 12)}
                          </div>
                          {review.comentario && <p className="text-[12px] leading-relaxed text-gray-600">{review.comentario}</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-[13px] leading-relaxed text-gray-600">
                    Aún no hay reseñas publicadas para este producto.
                  </div>
                )}
              </AccordionItem>
            </div>
          </div>

          <div className="w-full lg:w-[50%] h-[50vh] lg:h-auto overflow-hidden bg-[#F4F5F6]">
            <img
              src={diseno.urbanoProductMacroImg || productImages[1] || mainImage}
              alt="Detalle del producto"
              className="w-full h-full object-cover mix-blend-multiply opacity-90 hover:scale-105 transition-transform duration-1000"
            />
          </div>
        </section>

        {related.length > 0 && (
          <section className="w-full py-16 lg:py-24 bg-white border-t border-gray-100">
            <div className="max-w-[1600px] mx-auto px-4 md:px-8 mb-10 flex justify-between items-center">
              <h2 className="text-2xl md:text-[2rem] font-black tracking-tighter uppercase" style={{ fontFamily: '"Impact", "Arial Black", sans-serif' }}>LA COLECCIÓN</h2>
              <button onClick={() => navigate(`/tienda/${slug}/catalogo`)} className="hidden md:flex text-[10px] font-bold uppercase tracking-widest text-gray-400 hover:text-black">
                Ver catálogo
              </button>
            </div>
            <div className="max-w-[1600px] mx-auto px-4 md:px-8 grid grid-cols-2 md:grid-cols-4 gap-6">
              {related.slice(0, 4).map((item) => (
                <UrbanoProductCard
                  key={item.id}
                  producto={item}
                  slug={slug || ''}
                  onClick={() => navigate(`/tienda/${slug}/producto/${item.id}`)}
                  onAddToCart={() => {}}
                />
              ))}
            </div>
          </section>
        )}

        <UrbanoFooter tienda={tienda} diseno={diseno} slug={slug || ''} categories={categorias} />
      </main>

      <UrbanoCartModal
        isOpen={mostrarCarrito}
        onClose={() => setMostrarCarrito(false)}
        carrito={carrito}
        tienda={tienda}
        actualizarCantidad={actualizarCantidad}
        onCheckout={irACheckout}
        slug={slug || ''}
        setCarrito={setCarrito}
      />
    </div>
  );
}
