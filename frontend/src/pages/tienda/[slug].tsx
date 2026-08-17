import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Icon } from '@iconify/react';
import axios from 'axios';
import SliderBanners from '@/components/tienda/SliderBanners';
import CarouselBanners from '@/components/tienda/CarouselBanners';
import Footer from '@/components/tienda/Footer';
import { TEMPLATES, resolveTemplate, resolveTemplateId } from '@/components/tienda/resolveTemplate';
import StoreHeader from '@/components/tienda/StoreHeader';
import CategoryCircles from '@/components/tienda/CategoryCircles';
import ComboCard from '@/components/tienda/ComboCard';
import ProductCardPio from '@/components/tienda/ProductCardPio';
import ProductCardEmox from '@/components/tienda/ProductCardEmox';
import ProductCardGlamora from '@/components/tienda/ProductCardGlamora';
import ProductCardGromuse from '@/components/tienda/ProductCardGromuse';
import ProductCardXtra from '@/components/tienda/ProductCardXtra';
import XtraHero from '@/components/tienda/XtraHero';
import XtraHeader from '@/components/tienda/XtraHeader';
import { templateRegistry } from '@/templates/registry';
import { useAuthStore } from '@/zustand/auth';
import StoreLiveEditorDrawer from '@/components/tienda/StoreLiveEditorDrawer';
import StoreWhatsAppButton from '@/components/tienda/StoreWhatsAppButton';

import StoreSidebar from '@/components/tienda/StoreSidebar';
import ProductCustomizationModal from '@/components/tienda/ProductCustomizationModal';
import ShoppingCartModal from '@/components/tienda/ShoppingCartModal';
import PromoBanners from '@/components/tienda/PromoBanners';
import MembershipBanner from '@/components/tienda/MembershipBanner';
import { useCompareStore } from '@/zustand/compare';
import { useFavoritosStore } from '@/zustand/favoritos';
import { onTiendaCartCleared, persistTiendaCart, tiendaCartKey } from '@/utils/tiendaCart';
import { withPricing, withPricingList } from '@/templates/shared/pricing';
import { withStorePurchaseWhatsapp } from '@/utils/storeWhatsapp';
import { useStorePreviewNavigation } from '@/utils/useStorePreviewNavigation';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4001/api';

export default function TiendaPublica() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [tienda, setTienda] = useState<any>(null);
  const [productos, setProductos] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const limit = 30;
  const [carrito, setCarrito] = useState<any[]>([]);
  const [isCartLoaded, setIsCartLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [mostrarCarrito, setMostrarCarrito] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const previewPlantillaId = searchParams.get('previewPlantilla');
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const adminMenuRef = useRef<HTMLDivElement | null>(null);
  const [combos, setCombos] = useState<any[]>([]);
  const [wholesaleProducts, setWholesaleProducts] = useState<any[]>([]);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 1000]);
  const [minPrice, setMinPrice] = useState(0);
  const [maxPrice, setMaxPrice] = useState(1000);

  // Estado para modal de personalización
  const [showPersonalizarModal, setShowPersonalizarModal] = useState(false);
  const [productoAPersonalizar, setProductoAPersonalizar] = useState<any>(null);
  const [modificadoresProducto, setModificadoresProducto] = useState<any[]>([]);
  const [loadingModificadores, setLoadingModificadores] = useState(false);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [showCompareModal, setShowCompareModal] = useState(false);
  const { getBySlug, clear: clearCompare } = useCompareStore();
  const { refreshImagenes } = useFavoritosStore();
  const auth = useAuthStore(s => s.auth);
  useStorePreviewNavigation(previewPlantillaId);

  // Estado para el Live Editor (panel flotante "modo WordPress")
  const [disenoLive, setDisenoLive] = useState<any>(null);

  useEffect(() => {
    if (tienda?.diseno) {
      setDisenoLive(tienda.diseno);
    }
  }, [tienda?.diseno]);

  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      if (e.data?.type === 'UPDATE_DISENO') {
        setDisenoLive((prev: any) => ({ ...prev, ...e.data.payload }));
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);
  useEffect(() => {
    cargarTienda();
    cargarCombos();
    cargarProductosMayoristas();
    cargarCategorias(); // Fetch categories
    cargarRangoPrecios(); // Fetch price bounds
    // reset de productos al cambiar slug
    setProductos([]);
    setPage(1);
    setTotal(0);
    cargarProductos(1, true);

    // rehidratar carrito persistido
    try {
      const saved = localStorage.getItem(tiendaCartKey(slug || ''));
      if (saved) {
        const carritoGuardado = JSON.parse(saved);
        setCarrito(carritoGuardado);
        // Refrescar URLs de imágenes que podrían haber expirado
        refrescarImagenesCarrito(carritoGuardado);
      }
    } catch { }
    setIsCartLoaded(true);
  }, [slug]);

  useEffect(() => {
    if (!slug) return;
    return onTiendaCartCleared(slug, () => {
      setCarrito([]);
      setMostrarCarrito(false);
    });
  }, [slug]);


  const productIdParam = searchParams.get('product');

  useEffect(() => {
    if (productIdParam && slug) {
      const fetchAndAction = async () => {
        try {
          const { data } = await axios.get(`${BASE_URL}/public/store/${slug}/products/${productIdParam}`);
          const product = data.data ? withPricing(data.data) : data ? withPricing(data) : null;
          if (product) {
            handleAgregarProducto(product);
            // Remove param to avoid re-triggering on refresh
            navigate('.', { replace: true });
          }
        } catch (e) { console.error('Error handling banner product link:', e) }
      }
      fetchAndAction();
    }
  }, [productIdParam, slug]);

  // Función para refrescar las URLs de imágenes del carrito
  const refrescarImagenesCarrito = async (carritoActual: any[]) => {
    try {
      // Obtener IDs de productos únicos
      const productosIds = [...new Set(carritoActual
        .filter(item => !item.esCombo && item.productoId)
        .map(item => item.productoId))];

      if (productosIds.length === 0) return;

      // Solicitar datos actualizados de los productos
      const { data } = await axios.get(`${BASE_URL}/public/store/${slug}/products`, {
        params: { ids: productosIds.join(','), limit: 100 }
      });

      const productosActualizados = data?.data?.data || data?.data || [];

      // Crear mapa de IDs a URLs de imagen actualizadas
      const imagenUrlMap = new Map();
      productosActualizados.forEach((p: any) => {
        if (p.id && p.imagenUrl) {
          imagenUrlMap.set(p.id, p.imagenUrl);
        }
      });

      // Actualizar carrito con nuevas URLs
      setCarrito(prevCarrito =>
        prevCarrito.map(item => {
          if (item.esCombo || !item.productoId) return item;
          const nuevaUrl = imagenUrlMap.get(item.productoId);
          return nuevaUrl ? { ...item, imagenUrl: nuevaUrl } : item;
        })
      );
    } catch (error) {
      console.error('Error refrescando imágenes del carrito:', error);
    }
  };

  // Persistir carrito solo cuando ya se haya cargado inicialmente
  useEffect(() => {
    if (!isCartLoaded) return;
    persistTiendaCart(slug || '', carrito);
  }, [carrito, slug, isCartLoaded]);

  const cargarProductosMayoristas = async () => {
    try {
      const { data } = await axios.get(`${BASE_URL}/public/store/${slug}/products`, {
        params: {
          wholesale: 'true',
          limit: 8 // Show top 8 wholesale products
        }
      });
      setWholesaleProducts(withPricingList(data.data || []));
    } catch (e) { console.error('Error loading wholesale products:', e); }
  };

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (!adminMenuRef.current) return;
      if (!adminMenuRef.current.contains(e.target as Node)) setIsAdminOpen(false);
    };
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsAdminOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onClickOutside);
      document.removeEventListener('keydown', onEsc);
    };
  }, []);

  // Calculos de totales en el carrito (página de tienda)
  const calcularSubtotal = () => {
    return carrito.reduce((sum, item) => sum + Number(item.precioUnitario) * Number(item.cantidad || 1), 0);
  };
  const calcularCostoEnvio = () => {
    const envio = Number(tienda?.costoEnvioFijo || 0);
    return tienda?.aceptaEnvio ? envio : 0;
  };
  const calcularTotal = () => {
    return calcularSubtotal() + calcularCostoEnvio();
  };

  const cargarTienda = async () => {
    try {
      const { data } = await axios.get(`${BASE_URL}/public/store/${slug}`);
      setTienda(withStorePurchaseWhatsapp(data.data || data));
    } catch (error) {
      console.error('Error al cargar tienda:', error);
    }
  };

  const cargarCombos = async () => {
    try {
      const { data } = await axios.get(`${BASE_URL}/public/store/${slug}/combos`);
      setCombos(data.data || data || []);
    } catch (error) {
      console.error('Error al cargar combos:', error);
      setCombos([]);
    }
  };

  const [allCategories, setAllCategories] = useState<any[]>([]);

  const cargarCategorias = async () => {
    try {
      const { data } = await axios.get(`${BASE_URL}/public/store/${slug}/categories`);
      const cats = data?.data || [];
      setAllCategories(Array.isArray(cats) ? cats : []);
    } catch (error) {
      console.error('Error al cargar categorias:', error);
      setAllCategories([]);
    }
  };

  const cargarRangoPrecios = async () => {
    try {
      const { data } = await axios.get(`${BASE_URL}/public/store/${slug}/price-range`);
      const priceData = data?.data || { min: 0, max: 1000 };
      setMinPrice(priceData.min);
      setMaxPrice(priceData.max);
      setPriceRange([priceData.min, priceData.max]);
    } catch (error) {
      console.error('Error al cargar rango de precios:', error);
      setMinPrice(0);
      setMaxPrice(1000);
      setPriceRange([0, 1000]);
    }
  };

  const filteredProductos = productos; // Filtering is now done on server


  const cargarProductos = async (p = page, reset = false) => {
    try {
      const { data } = await axios.get(`${BASE_URL}/public/store/${slug}/products`, {
        params: {
          page: p,
          limit,
          search: search.trim() || undefined,
          category: selectedCategories.length > 0 ? selectedCategories.join(',') : undefined,
          minPrice: priceRange[0] !== minPrice ? priceRange[0] : undefined,
          maxPrice: priceRange[1] !== maxPrice ? priceRange[1] : undefined,
        },
      });

      // Normalizar posibles formatos de respuesta
      let items: any[] = [];
      let totalItems = 0;
      let currentPage = p;

      if (Array.isArray(data)) {
        items = data;
        totalItems = data.length;
      } else if (Array.isArray(data?.data?.data)) {
        items = data.data.data;
        totalItems = data.data.total ?? items.length;
        currentPage = data.data.page ?? p;
      } else if (Array.isArray(data?.data)) {
        items = data.data;
        totalItems = data.total ?? items.length;
        currentPage = data.page ?? p;
      }

      items = withPricingList(items || []);

      setTotal(totalItems || 0);
      setPage(currentPage || p);

      if (reset) {
        setProductos(items || []);
        // Refrescar URLs de imágenes en favoritos con datos frescos de la API
        const updates = (items || [])
          .filter((p: any) => p.id && p.imagenUrl)
          .map((p: any) => ({ id: p.id, slug: slug!, imagenUrl: p.imagenUrl }));
        if (updates.length > 0) refreshImagenes(updates);
      } else {
        setProductos((prev) => [...prev, ...(items || [])]);
      }
    } catch (error) {
      console.error('Error al cargar productos:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  // Debounce búsqueda, categorías y precios
  useEffect(() => {
    const t = setTimeout(() => {
      setLoading(true);
      setProductos([]);
      setPage(1);
      setTotal(0);
      cargarProductos(1, true);
    }, 350);
    return () => clearTimeout(t);
  }, [search, selectedCategories, priceRange]);

  // Cargar productos cuando cambia la página
  useEffect(() => {
    if (page > 1) {
      setLoading(true);
      cargarProductos(page, true);
    }
  }, [page]);

  // Cargar modificadores de un producto
  const cargarModificadoresProducto = async (productoId: number) => {
    try {
      setLoadingModificadores(true);
      const { data } = await axios.get(`${BASE_URL}/public/store/${slug}/products/${productoId}/modifiers`);
      return data.data || data || [];
    } catch (error) {
      console.error('Error al cargar modificadores:', error);
      return [];
    } finally {
      setLoadingModificadores(false);
    }
  };

  // Abrir modal de personalización o agregar directo si no tiene modificadores
  const handleAgregarProducto = async (producto: any) => {
    // Eliminada la restricción de rubros para permitir "Precios por Docena/Ciento" en ferreterías/limpieza

    const mods = await cargarModificadoresProducto(producto.id);

    if (mods.length > 0) {
      // Tiene modificadores, abrir modal
      setProductoAPersonalizar(producto);
      setModificadoresProducto(mods);
      setShowPersonalizarModal(true);
    } else {
      // Sin modificadores, agregar directo
      agregarAlCarritoDirecto(producto);
    }
  };

  const handleConfirmarPersonalizacion = (producto: any, modificadoresSeleccionados: any[]) => {
    agregarAlCarritoDirecto(producto, modificadoresSeleccionados);
    setShowPersonalizarModal(false);
    setProductoAPersonalizar(null);
    setModificadoresProducto([]);
  };

  const agregarAlCarritoDirecto = (producto: any, modificadores?: any[]) => {
    const itemId = modificadores?.length
      ? `${producto.id}-${Date.now()}` // ID único si tiene modificadores
      : producto.id;

    const precioExtra = modificadores?.reduce((sum: number, mod: any) => sum + Number(mod.precioExtra || 0), 0) || 0;

    const nuevoItem = {
      ...producto,
      id: itemId,
      productoId: producto.id,
      cantidad: 1,
      precioBase: producto.precioUnitario,
      precioUnitario: Number(producto.precioUnitario) + precioExtra,
      modificadores: modificadores || [],
    };

    if (!modificadores?.length) {
      // Sin modificadores: buscar si ya existe y sumar cantidad
      const existe = carrito.find((item) => item.id === producto.id && !item.modificadores?.length);
      if (existe) {
        setCarrito(
          carrito.map((item) =>
            item.id === producto.id && !item.modificadores?.length
              ? { ...item, cantidad: item.cantidad + 1 }
              : item
          )
        );
        return;
      }
    }

    setCarrito([...carrito, nuevoItem]);
  };

  const agregarAlCarrito = (producto: any) => {
    handleAgregarProducto(producto);
  };

  const agregarComboAlCarrito = (combo: any) => {
    const itemCombo = {
      id: `combo-${combo.id}`,
      esCombo: true,
      comboId: combo.id,
      descripcion: combo.nombre,
      imagenUrl: combo.imagenUrl,
      precioUnitario: combo.precioCombo,
      cantidad: 1,
      comboItems: combo.items,
      descuentoPorcentaje: combo.descuentoPorcentaje
    };
    setCarrito([...carrito, itemCombo]);
  };

  const actualizarCantidad = (productoId: number | string, cantidad: number) => {
    if (cantidad <= 0) {
      setCarrito(carrito.filter((item) => item.id !== productoId));
    } else {
      setCarrito(
        carrito.map((item) => (item.id === productoId ? { ...item, cantidad } : item))
      );
    }
  };

  const irACheckout = () => {
    navigate(`/tienda/${slug}/checkout`, { state: { carrito, tienda } });
  };

  if (loading && !tienda) {
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
        {/* Banner Skeleton */}
        <div className="max-w-screen-xl mx-auto px-5 md:px-8 mt-8 mb-12">
          <div className="animate-pulse bg-gray-100 rounded-[2.5rem] w-full h-[300px] md:h-[450px]" />
        </div>
        {/* Grid Skeleton */}
        <div className="max-w-screen-xl mx-auto px-5 md:px-8 pb-10">
          <div className="flex justify-between items-center mb-6">
            <div className="animate-pulse bg-gray-100 rounded-lg w-48 h-8" />
            <div className="animate-pulse bg-gray-100 rounded-lg w-24 h-5" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-white rounded-[1.5rem] border border-gray-100 p-4 h-[340px] flex flex-col shadow-sm">
                <div className="animate-pulse bg-gray-100 rounded-xl w-full h-48 mb-4" />
                <div className="animate-pulse bg-gray-100 rounded w-3/4 h-4 mb-2" />
                <div className="animate-pulse bg-gray-100 rounded w-1/2 h-3 mb-4" />
                <div className="mt-auto flex justify-between items-end">
                  <div className="animate-pulse bg-gray-100 rounded w-1/3 h-6" />
                  <div className="animate-pulse bg-gray-100 rounded-full w-9 h-9" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!tienda) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <Icon icon="mdi:store-off" className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <p className="text-xl text-gray-600">Tienda no encontrada</p>
        </div>
      </div>
    );
  }

  const disenoBase = disenoLive || tienda.diseno || {};
  const diseno = previewPlantillaId ? {
    ...disenoBase,
    plantillaId: previewPlantillaId,
    __previewPlantillaId: previewPlantillaId,
    __previewQuery: `previewPlantilla=${encodeURIComponent(previewPlantillaId)}&previewOrigen=template`,
  } : disenoBase;
  const cp = diseno.colorPrimario || '#FF9500';
  const template = resolveTemplate(diseno?.plantillaId);
  const bannerIsSlider: boolean = diseno?.bannerIsSlider ?? template.bannerIsSlider;
  const hasBanners = template.bannerSlots.length > 0;

  // Live Editor "modo WordPress": solo visible para el dueño de esta tienda.
  const isOwner = !!auth?.empresa?.slugTienda && auth.empresa.slugTienda === slug;
  const liveEditor = isOwner ? (
    <StoreLiveEditorDrawer
      slug={slug || ''}
      diseno={diseno}
      onChange={(campos) => setDisenoLive((prev: any) => ({ ...(prev || {}), ...campos }))}
      defaultOpen={searchParams.get('edit') === '1'}
    />
  ) : null;

  const CARD_MAP: Record<string, React.ComponentType<any>> = {
    ProductCardPio,
    ProductCardEmox,
    ProductCardGlamora,
    ProductCardGromuse,
    ProductCardXtra,
  };
  const ProductCard = CARD_MAP[template.cardComponent] ?? ProductCardPio;

  // Section header with brand filter pills
  const SectionHeader = ({
    title,
    onMore,
  }: {
    title: string;
    onMore?: () => void;
  }) => (
    <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
      <div className="flex items-center gap-3 flex-wrap">
        <h2 className="text-2xl md:text-3xl font-black text-[#1A1A1A]">{title}</h2>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setSelectedCategories([])}
            className="flex items-center gap-1.5 text-xs font-bold px-4 py-1.5 rounded-full transition-colors"
            style={selectedCategories.length === 0
              ? { background: cp, color: '#fff' }
              : { border: '1px solid #2D2D2D', color: '#2D2D2D' }}
          >
            <Icon icon="solar:widget-bold" width={12} />
            Todos
          </button>
          {allCategories.slice(0, 5).map((category: any) => {
            const name = typeof category === 'string' ? category : category.nombre;
            const isActive = selectedCategories.includes(name);
            return (
              <button
                key={name}
                onClick={() => {
                  if (isActive) setSelectedCategories(selectedCategories.filter(b => b !== name));
                  else setSelectedCategories([name]);
                }}
                className="flex items-center gap-1.5 text-xs font-bold px-4 py-1.5 rounded-full transition-colors"
                style={isActive
                  ? { background: cp, color: cp.toLowerCase() === '#ffffff' ? '#000' : '#fff' }
                  : { border: '1px solid #2D2D2D', color: '#2D2D2D' }}
              >
                <Icon icon="solar:tag-bold" width={12} />
                {name}
              </button>
            );
          })}
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <button className="w-7 h-7 rounded-full border border-gray-200 flex items-center justify-center transition-colors text-gray-400">
          <Icon icon="solar:alt-arrow-left-linear" width={14} />
        </button>
        <button className="w-7 h-7 rounded-full border border-gray-200 flex items-center justify-center transition-colors text-gray-400">
          <Icon icon="solar:alt-arrow-right-linear" width={14} />
        </button>
        {onMore && (
          <button onClick={onMore} className="text-sm font-bold hover:underline flex items-center gap-1" style={{ color: cp }}>
            Más <Icon icon="solar:alt-arrow-right-bold" width={14} />
          </button>
        )}
      </div>
    </div>
  );

  // Skeleton grid
  const SkeletonGrid = () => (
    <div className={`grid ${template.gridCols} gap-3 md:gap-4`}>
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} className="animate-pulse bg-white rounded-2xl overflow-hidden">
          <div className={`bg-[#FAF6F1] ${template.imageAspect} w-full`} />
          <div className="p-3 space-y-2">
            <div className="h-4 bg-gray-100 w-1/2 rounded" />
            <div className="h-3 bg-gray-100 w-3/4 rounded" />
            <div className="h-8 bg-[#FEF0DC] w-full rounded mt-3" />
          </div>
        </div>
      ))}
    </div>
  );

  // Product grid
  const ProductGrid = ({ items }: { items: any[] }) => (
    <div className={`grid ${template.gridCols} gap-3 md:gap-4`}>
      {items.map((producto: any) => (
        <ProductCard
          key={producto.id}
          producto={producto}
          slug={slug || ''}
          diseno={diseno}
          onAddToCart={agregarAlCarrito}
          onClick={() => navigate(`producto/${producto.id}`)}
        />
      ))}
    </div>
  );

  // ── Template Dispatcher ───────────────────────────────────────────────────
  const templateConfig = templateRegistry[resolveTemplateId(diseno?.plantillaId)];
  if (templateConfig?.HomePage) {
    const TemplateHome = templateConfig.HomePage;
    return (
      <>
        {liveEditor}
        <TemplateHome
          tienda={tienda} slug={slug || ''} productos={productos} allCategories={allCategories} cp={cp} diseno={diseno}
          carrito={carrito} setCarrito={setCarrito} mostrarCarrito={mostrarCarrito} setMostrarCarrito={setMostrarCarrito}
          agregarAlCarrito={agregarAlCarrito} actualizarCantidad={actualizarCantidad} loading={loading}
        />
        <StoreWhatsAppButton tienda={tienda} />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-[#F6F6F6]" style={{ fontFamily: '"Mona Sans", ' + (diseno.tipografia || 'Inter, sans-serif') }}>

      {liveEditor}
      <StoreWhatsAppButton tienda={tienda} />

      {/* Header */}
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
        categories={allCategories}
        onSelectCategory={(cat) => {
          if (cat === '') {
            setSelectedCategories([]);
            setTimeout(() => document.getElementById('productos-populares')?.scrollIntoView({ behavior: 'smooth' }), 100);
          } else {
            navigate(`/tienda/${slug}/catalogo?category=${encodeURIComponent(cat)}`);
          }
        }}
        recommendedProducts={productos.slice(0, 10)}
      />

      {/* Main */}
      <main className="pt-[116px] md:pt-[116px] pb-12">

        {/* ── Hero Banner ── */}
        {hasBanners && (
          <div className="pt-6 mb-2">
            {bannerIsSlider
              ? <CarouselBanners tienda={tienda} diseno={diseno} />
              : <SliderBanners tienda={tienda} diseno={diseno} />
            }
          </div>
        )}

        {/* ── Popular Section ── */}
        <section id="productos-populares" className="max-w-screen-xl mx-auto px-5 md:px-8 mb-10 scroll-mt-32">
          <SectionHeader title="Populares" onMore={() => navigate(`/tienda/${slug}/catalogo`)} />
          {loading ? <SkeletonGrid /> : filteredProductos.length === 0 ? (
            <div className="py-20 text-center">
              <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Icon icon="solar:box-linear" className="text-gray-300 text-3xl" />
              </div>
              <h3 className="font-black text-[#1A1A1A] mb-2">Sin resultados</h3>
              <p className="text-sm text-gray-500 mb-4">Intenta ajustar tus filtros.</p>
              <button
                onClick={() => { setSearch(''); setSelectedCategories([]); }}
                className="text-sm font-bold px-5 py-2 rounded-full transition-all"
                style={{ color: cp, borderColor: cp, border: `1px solid ${cp}` }}
              >
                Limpiar Filtros
              </button>
            </div>
          ) : (
            <>
              <ProductGrid items={productos.slice(0, 10)} />
              {/* {Math.ceil(total / limit) > 1 && (
                <div className="mt-8 flex justify-center gap-2">
                  {Array.from({ length: Math.ceil(total / limit) }).map((_, i) => (
                    <button
                      key={i + 1}
                      onClick={() => setPage(i + 1)}
                      className={`w-10 h-10 flex items-center justify-center text-sm font-bold rounded-full transition-all ${page === (i + 1) ? 'bg-[#FF9500] text-white' : 'bg-white text-gray-500 hover:border-[#FF9500] hover:text-[#FF9500] border border-gray-200'}`}
                    >
                      {i + 1}
                    </button>
                  ))}
                </div>
              )} */}
            </>
          )}
        </section>
        {/* ── Membership Banner ── */}
        {hasBanners && !bannerIsSlider && template.bannerSlots.some((s: any) => s.tipo === 'membership') && (
          <MembershipBanner tienda={tienda} />
        )}

        {productos.length > 10 && (
          <section className="max-w-screen-xl mx-auto px-5 md:px-8 mb-10">
            <SectionHeader title="También te podría interesar" onMore={() => navigate(`/tienda/${slug}/catalogo`)} />
            <ProductGrid items={productos.slice(10, 20)} />
          </section>
        )}

        {/* ── Promo Banners Row 1 ── */}
        {hasBanners && !bannerIsSlider && template.bannerSlots.some((s: any) => s.tipo === 'promo') && (
          <PromoBanners tienda={tienda} />
        )}

        {/* ── Categories Bento ── */}
        {/* <CategoryCircles
          categories={allCategories}
          selectedCats={selectedCategories}
          onSelectCategory={(cat) => {
            if (selectedCategories.includes(cat)) setSelectedCategories(selectedCategories.filter(c => c !== cat));
            else setSelectedCategories([cat]);
          }}
        /> */}

        {/* ── Special Deals (Combos) ── */}
        {template.showCombos && combos.length > 0 && (
          <section className="max-w-screen-xl mx-auto px-5 md:px-8 mb-10">
            <SectionHeader title="Ofertas Especiales" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {combos.map((combo) => (
                <ComboCard key={combo.id} combo={combo} diseno={diseno} onAddToCart={agregarComboAlCarrito} />
              ))}
            </div>
          </section>
        )}



        {/* ── Wholesale Section ── */}
        {wholesaleProducts.length > 0 && (
          <section className="max-w-screen-xl mx-auto px-5 md:px-8 mb-10">
            <SectionHeader title="Al por mayor" onMore={() => navigate(`/tienda/${slug}/catalogo?wholesale=true`)} />
            <ProductGrid items={wholesaleProducts} />
          </section>
        )}
      </main>

      <Footer tienda={tienda} diseno={diseno} />

      {/* Cart Drawer */}
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

      {/* Customization Modal */}
      <ProductCustomizationModal
        isOpen={showPersonalizarModal}
        onClose={() => setShowPersonalizarModal(false)}
        product={productoAPersonalizar}
        modifiers={modificadoresProducto}
        onConfirm={handleConfirmarPersonalizacion}
      />

      {/* Compare modal */}
      {showCompareModal && (() => {
        const compareItems = getBySlug(slug || '');
        return (
          <div className="fixed inset-0 z-[998] bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => setShowCompareModal(false)}>
            <div className="bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl w-full max-w-3xl overflow-auto max-h-[90vh]" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between p-4 sm:p-5 border-b border-gray-100">
                <h3 className="font-black text-gray-900 text-base sm:text-lg">Comparar productos</h3>
                <div className="flex items-center gap-3">
                  <button onClick={() => clearCompare(slug || '')} className="text-xs text-red-500 hover:text-red-700">Limpiar</button>
                  <button onClick={() => setShowCompareModal(false)} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors">
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
                            <button onClick={() => { setShowCompareModal(false); navigate(`/tienda/${slug}/producto/${item.id}`); }} className="text-[11px] font-bold text-white px-3 py-1 rounded-full" style={{ background: cp }}>Ver producto</button>
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
                    ].map(({ label, fn }) => (
                      <tr key={label} className="border-b border-gray-50 hover:bg-gray-50">
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
                  {item.imagenUrl ? <img src={item.imagenUrl} alt="" className="w-full h-full object-contain" /> : <div className="w-full h-full bg-gray-200" />}
                </div>
              ))}
            </div>
            <span className="text-sm font-semibold">{getBySlug(slug || '').length} producto{getBySlug(slug || '').length > 1 ? 's' : ''}</span>
            <button onClick={() => setShowCompareModal(true)} className="px-4 py-1.5 rounded-xl font-bold text-sm text-white" style={{ background: cp }}>Comparar</button>
            <button onClick={() => clearCompare(slug || '')} className="text-gray-400 hover:text-white transition-colors">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M1 1L11 11M11 1L1 11" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
            </button>
          </div>
        </div>
      )}

      {/* Mobile Filters Drawer */}
      {showMobileFilters && (
        <div className="fixed inset-0 z-[999999] lg:hidden flex">
          <div className="absolute inset-0 bg-black/40  " onClick={() => setShowMobileFilters(false)} />
          <div className="relative w-80 max-w-[85vw] bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-left">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-lg font-black">Filtros</h2>
              <button onClick={() => setShowMobileFilters(false)} className="p-2 hover:bg-gray-100 rounded-full">
                <Icon icon="mdi:close" className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <StoreSidebar
                categories={allCategories}
                selectedCats={selectedCategories}
                setSelectedCats={setSelectedCategories}
                search={search}
                setSearch={setSearch}
                diseno={diseno}
                totalProducts={total}
                priceRange={priceRange}
                setPriceRange={setPriceRange}
                minPrice={minPrice}
                maxPrice={maxPrice}
              />
            </div>
            <div className="p-4 border-t bg-gray-50">
              <button
                onClick={() => setShowMobileFilters(false)}
                className="w-full text-white py-3 font-bold rounded-full"
                style={{ background: cp }}
              >
                Ver {filteredProductos.length} Resultados
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
