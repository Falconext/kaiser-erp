import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '@iconify/react';
import UrbanoHeader from './UrbanoHeader';
import UrbanoHero from './UrbanoHero';
import UrbanoProductCard from './UrbanoProductCard';
import UrbanoFooter from './UrbanoFooter';
import { getUrbanoTemplateCategories, getUrbanoTemplateProducts, isUrbanoTemplateProduct } from './urbanoTemplateProducts';

interface UrbanoCatalogoPageProps {
  diseno?: any;
  slug: string;
  tienda: any;
  productos: any[];
  allCategories?: any[];
  cp: string;
  carritoSize: number;
  onOpenCart: () => void;
  onAddToCart: (p: any) => void;
  onProduct?: (p: any) => void;
  searchQuery: string;
  setSearchQuery: (s: string) => void;
  onSearchSubmit: (e: any, value: string) => void;
}

const PRODUCT_PLACEHOLDER = '/assets/templates/urbano/coleccion1.png';

const productImage = (product: any) =>
  product?.imagenUrl || product?.imagenesExtra?.[0] || product?.variantes?.find((variant: any) => variant?.imagenUrl)?.imagenUrl || '';

export default function UrbanoCatalogoPage({
  slug,
  tienda,
  productos,
  allCategories = [],
  cp,
  carritoSize,
  onOpenCart,
  onProduct,
  searchQuery,
  setSearchQuery,
  onSearchSubmit,
  diseno,
}: UrbanoCatalogoPageProps) {
  const navigate = useNavigate();
  const [hoveredCategory, setHoveredCategory] = useState(0);
  const sliderRef = useRef<HTMLDivElement>(null);
  const activeDiseno = diseno || tienda?.diseno || {};

  const realProducts = productos || [];
  const templateProducts = getUrbanoTemplateProducts(activeDiseno);
  const displayProducts = realProducts.length ? realProducts : templateProducts;
  const fallbackCategories = getUrbanoTemplateCategories(diseno);
  const categoryNameFromProduct = (product: any) =>
    typeof product?.categoria === 'object' ? product.categoria?.nombre : product?.categoria;
  const imageForCategory = (name: string, fallback?: string) => {
    const product = displayProducts.find((item) => String(categoryNameFromProduct(item) || '').toLowerCase() === String(name).toLowerCase());
    return productImage(product) || fallback || PRODUCT_PLACEHOLDER;
  };
  const categoriesFromApi = allCategories
    .map((cat) => typeof cat === 'string' ? { nombre: cat } : { nombre: cat?.nombre || cat?.name || cat?.descripcion, imagenUrl: cat?.imagenUrl })
    .filter((cat) => cat.nombre)
    .filter((cat) => String(cat.nombre).toLowerCase() !== 'todos')
    .map((cat, index) => ({
      nombre: cat.nombre,
      imagenUrl: cat.imagenUrl || imageForCategory(cat.nombre, fallbackCategories[index]?.imagenUrl),
    }));
  const categoriesFromProducts = Array.from(new Set(displayProducts.map(categoryNameFromProduct).filter(Boolean)))
    .filter((name: any) => String(name).toLowerCase() !== 'todos')
    .map((name: any, index) => ({
      nombre: String(name),
      imagenUrl: imageForCategory(String(name), fallbackCategories[index]?.imagenUrl),
    }));
  const displayCategories = (categoriesFromApi.length ? categoriesFromApi : categoriesFromProducts.length ? categoriesFromProducts : fallbackCategories).slice(0, 8);

  // Override manual desde el Live Editor: si el dueño define Categoría N (texto/imagen),
  // esa reemplaza la tile correspondiente; si la deja vacía, usa la categoría real.
  // El clic siempre navega a la categoría REAL (`nombre`) para no romper el filtro del catálogo.
  const splitOverrides = [
    { text: activeDiseno.urbanoCat1Text, img: activeDiseno.urbanoCat1Img },
    { text: activeDiseno.urbanoCat2Text, img: activeDiseno.urbanoCat2Img },
    { text: activeDiseno.urbanoCat3Text, img: activeDiseno.urbanoCat3Img },
    { text: activeDiseno.urbanoCat4Text, img: activeDiseno.urbanoCat4Img },
  ];
  const catImageByName = new Map(displayCategories.map((c) => [String(c.nombre).toLowerCase(), c.imagenUrl]));
  const baseSplit = displayCategories.slice(0, 4);
  const splitCategories = Array.from({ length: 4 }, (_, i) => {
    const base = baseSplit[i];
    const ov = splitOverrides[i] || {};
    const ovText = typeof ov.text === 'string' && ov.text.trim() ? ov.text.trim() : '';
    const ovImg = typeof ov.img === 'string' && ov.img.trim() ? ov.img : '';
    // Si el dueño eligió una categoría, navegamos y etiquetamos con ESA categoría.
    const nombre = ovText || base?.nombre || '';
    const selectedImg = ovText ? catImageByName.get(ovText.toLowerCase()) : '';
    const imagenUrl = ovImg || selectedImg || base?.imagenUrl || fallbackCategories[i]?.imagenUrl || PRODUCT_PLACEHOLDER;
    return nombre ? { label: nombre, nombre, imagenUrl } : null;
  }).filter(Boolean) as { label: string; nombre: string; imagenUrl: string }[];

  const collectionProducts = displayProducts.slice(0, 12);
  
  const shopTheLookSelected = Array.isArray(diseno.urbanoShopTheLookProducts) ? diseno.urbanoShopTheLookProducts : [];
  const lookProducts = shopTheLookSelected.length > 0 
    ? shopTheLookSelected.map((s: any) => displayProducts.find((p: any) => p.id === s.id) || s).slice(0, 2)
    : displayProducts.slice(0, 2);

  const featureSelected = Array.isArray(diseno.urbanoFeatureProducts) ? diseno.urbanoFeatureProducts : [];
  const featureProducts = featureSelected.length > 0
    ? featureSelected.map((s: any) => displayProducts.find((p: any) => p.id === s.id) || s).slice(0, 2)
    : displayProducts.slice(2, 4);
  const galleryImages = displayProducts.map(productImage).filter(Boolean).slice(0, 5);

  const openProduct = (product: any) => {
    if (!product) return;
    if (isUrbanoTemplateProduct(product)) return;
    window.scrollTo(0, 0);
    if (onProduct) onProduct(product);
    else navigate(`/tienda/${slug}/producto/${product.id}`);
  };

  const openCategory = (category: string) => {
    if (slug === 'preview') {
      window.dispatchEvent(new CustomEvent('preview-nav', { detail: 'catalogo' }));
      return;
    }
    navigate(`/tienda/${slug}/catalogo?category=${encodeURIComponent(category)}`);
  };
  const openCatalog = () => {
    if (slug === 'preview') {
      window.dispatchEvent(new CustomEvent('preview-nav', { detail: 'catalogo' }));
      return;
    }
    navigate(`/tienda/${slug}/catalogo`);
  };

  const scrollSlider = (dir: 1 | -1) => {
    const el = sliderRef.current;
    if (!el) return;
    const children = el.children;
    const step = children.length >= 2
      ? (children[1] as HTMLElement).offsetLeft - (children[0] as HTMLElement).offsetLeft
      : ((children[0] as HTMLElement)?.offsetWidth ?? el.clientWidth);
    const maxScroll = el.scrollWidth - el.clientWidth;
    let target = el.scrollLeft + dir * step;
    if (dir === 1 && el.scrollLeft >= maxScroll - 4) target = 0;
    if (dir === -1 && el.scrollLeft <= 4) target = maxScroll;
    el.scrollTo({ left: target, behavior: 'smooth' });
  };

  useEffect(() => {
    if (!collectionProducts.length) return;
    const interval = setInterval(() => scrollSlider(1), 4000);
    return () => clearInterval(interval);
  }, [collectionProducts.length]);

  return (
    <div className="min-h-screen bg-white text-black" style={{ fontFamily: '"Inter", sans-serif' }}>
      <UrbanoHeader diseno={activeDiseno}
        tienda={tienda}
        slug={slug}
        cp={cp}
        carritoSize={carritoSize}
        onOpenCart={onOpenCart}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onSearchSubmit={onSearchSubmit}
        categories={displayCategories}
        onCategorySelect={openCategory}
      />

      <UrbanoHero diseno={activeDiseno} slug={slug} tienda={tienda} />

      <main id="product-grid" className="mx-auto w-full max-w-[1600px] px-4 py-16 md:px-8 md:py-24">
        <div className="mb-12 flex flex-col items-center justify-between gap-6 md:flex-row">
          <h2 className="text-2xl font-black uppercase tracking-tighter sm:text-3xl" style={{ fontFamily: '"Impact", "Arial Black", sans-serif' }}>
            La colección
          </h2>

          <div className="flex items-center gap-4 text-xs font-bold uppercase tracking-widest text-gray-500">
            <button className="flex items-center gap-1.5 transition-colors hover:text-black">
              Filtrar <Icon icon="solar:filter-linear" width={16} />
            </button>
            <span className="h-4 w-px bg-gray-200" />
            <button className="flex items-center gap-1.5 transition-colors hover:text-black">
              Ordenar <Icon icon="solar:sort-linear" width={16} />
            </button>
          </div>
        </div>

        {collectionProducts.length > 0 ? (
          <div className="group/slider relative w-full py-8">
            <button
              type="button"
              aria-label="Anterior"
              onClick={() => scrollSlider(-1)}
              className="absolute left-2 top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center border-2 border-black bg-white text-black transition-all duration-300 hover:bg-black hover:text-white md:left-6 md:h-12 md:w-12"
            >
              <Icon icon="solar:alt-arrow-left-linear" width={22} />
            </button>

            <button
              type="button"
              aria-label="Siguiente"
              onClick={() => scrollSlider(1)}
              className="absolute right-2 top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center border-2 border-black bg-white text-black transition-all duration-300 hover:bg-black hover:text-white md:right-6 md:h-12 md:w-12"
            >
              <Icon icon="solar:alt-arrow-right-linear" width={22} />
            </button>

            <div
              ref={sliderRef}
              className="flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth md:gap-8 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              {collectionProducts.map((product: any) => (
                <div key={product.id} className="w-[70vw] flex-shrink-0 snap-start sm:w-[40vw] md:w-[30vw] xl:w-[22vw]">
                  <UrbanoProductCard
                    producto={product}
                    slug={slug}
                    onClick={() => openProduct(product)}
                    onAddToCart={() => {}}
                  />
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {collectionProducts.length > 0 && (
          <div className="mt-20 flex w-full justify-center">
            <button
              onClick={openCatalog}
              className="border border-gray-200 bg-transparent px-10 py-3.5 text-[11px] font-bold uppercase tracking-[0.15em] text-gray-900 transition-all duration-300 hover:border-black hover:bg-black hover:text-white"
            >
              Ver más
            </button>
          </div>
        )}
      </main>

      <div className="flex w-full items-center overflow-hidden whitespace-nowrap border-y border-gray-100 bg-white py-6">
        <div className="animate-marquee inline-block" style={{ animation: 'marquee 30s linear infinite' }}>
          <span className="mx-4 text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400 md:text-[11px]">
            {Array(4).fill(diseno.urbanoMarqueeText || 'MODA URBANA / NUEVA COLECCIÓN / PRENDAS CON ESTILO / LISTO PARA SALIR').join(' / ')}
          </span>
          <span className="mx-4 text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400 md:text-[11px]">
            {Array(4).fill(diseno.urbanoMarqueeText || 'MODA URBANA / NUEVA COLECCIÓN / PRENDAS CON ESTILO / LISTO PARA SALIR').join(' / ')}
          </span>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee {
          white-space: nowrap;
          will-change: transform;
        }
      ` }} />

      <section className="flex min-h-[70vh] w-full flex-col bg-white md:flex-row">
        <div className="flex w-full items-center justify-center p-12 md:w-1/2 lg:p-24">
          <div className="flex w-full max-w-sm flex-col items-end gap-4 text-right">
            {splitCategories.map((category, idx) => (
              <button
                key={`${category.label}-${idx}`}
                onMouseEnter={() => setHoveredCategory(idx)}
                onClick={() => openCategory(category.nombre)}
                className={`text-4xl font-black uppercase tracking-tighter transition-colors duration-300 sm:text-5xl lg:text-6xl ${hoveredCategory === idx ? 'text-gray-900' : 'text-gray-300 hover:text-gray-400'}`}
              >
                {category.label}
              </button>
            ))}
          </div>
        </div>

        <div className="relative flex min-h-[50vh] w-full items-center justify-center overflow-hidden bg-[#F4F5F6] p-8 md:w-1/2 lg:p-16">
          {splitCategories.map((category, idx) => (
            <div
              key={`${category.label}-image-${idx}`}
              className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${hoveredCategory === idx ? 'z-10 opacity-100' : 'z-0 opacity-0'}`}
            >
              <img src={category.imagenUrl} alt={category.label} className="h-full w-full object-cover opacity-90 mix-blend-multiply" />
            </div>
          ))}
        </div>
      </section>

      <section className="relative flex h-[60vh] w-full flex-col items-center justify-end overflow-hidden bg-[#EAEBEC] pb-16 md:h-[80vh] md:pb-24">
        <div className="absolute inset-0 z-0">
          <img
            src={diseno.urbanoBottomBannerImg || productImage(displayProducts[0]) || '/assets/templates/urbano/wear.png'}
            alt="Viste tu estilo"
            className="h-full w-full object-cover opacity-80"
          />
        </div>

        <div className="pointer-events-none absolute left-0 top-1/2 z-10 w-full -translate-y-1/2 overflow-hidden whitespace-nowrap">
          <div className="animate-marquee inline-block" style={{ animation: 'marquee 20s linear infinite' }}>
            <span className="mx-4 text-3xl font-bold uppercase tracking-tighter text-white/90 sm:text-5xl md:mx-8 md:text-6xl lg:text-7xl">
              {Array(5).fill(diseno.urbanoBottomBannerText || 'VISTE A TU MANERA.').join(' ')}
            </span>
          </div>
        </div>

        <button
          onClick={() => document.getElementById('product-grid')?.scrollIntoView({ behavior: 'smooth' })}
          className="relative z-20 border-2 border-white/80 bg-white/10 px-8 py-3.5 text-[10px] font-bold uppercase tracking-[0.2em] text-white backdrop-blur-sm transition-all duration-300 hover:bg-white hover:text-black md:px-12 md:text-xs"
        >
          {diseno.urbanoBottomBannerBtn || '[ VER COLECCIÓN ]'}
        </button>
      </section>

      {lookProducts.length > 0 && (
        <section className="flex w-full flex-col bg-white">
          <div className="flex min-h-[70vh] w-full flex-col md:flex-row">
            <div className="flex w-full items-stretch bg-white md:w-1/2">
              <img
                src={diseno.urbanoShopTheLookImg || productImage(lookProducts[0]) || PRODUCT_PLACEHOLDER}
                alt="Look destacado"
                className="h-auto w-full object-contain"
              />
            </div>
            <div className="flex w-full flex-col justify-center p-8 md:w-1/2 lg:p-16">
              <h3 className="mb-10 text-2xl font-black uppercase tracking-tighter sm:text-3xl">
                {diseno.urbanoShopTheLookTitle || 'Compra el look'}
              </h3>
              <div className="grid max-w-lg grid-cols-2 gap-4 md:gap-8">
                {lookProducts.map((product: any) => (
                  <UrbanoProductCard
                    key={product.id}
                    producto={product}
                    slug={slug}
                    onClick={() => openProduct(product)}
                    onAddToCart={() => {}}
                  />
                ))}
              </div>
            </div>
          </div>

          {featureProducts.length > 0 && (
            <div className="flex min-h-[70vh] w-full flex-col border-t border-gray-100 md:flex-row-reverse">
              <div className="flex w-full items-stretch bg-white md:w-1/2">
                <img
                  src={diseno.urbanoFeatureModelImg || productImage(featureProducts[0]) || PRODUCT_PLACEHOLDER}
                  alt="Prendas destacadas"
                  className="h-auto w-full object-contain"
                />
              </div>
              <div className="flex w-full flex-col justify-center p-8 md:w-1/2 lg:p-16">
                <h3 className="mb-10 text-2xl font-black uppercase tracking-tighter sm:text-3xl">
                  {diseno.urbanoFeatureTitle || 'Completa el look'}
                </h3>
                <div className="grid max-w-lg grid-cols-2 gap-4 md:gap-8">
                  {featureProducts.map((product: any) => (
                    <UrbanoProductCard
                      key={product.id}
                      producto={product}
                      slug={slug}
                      onClick={() => openProduct(product)}
                      onAddToCart={() => {}}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
        </section>
      )}

      <section className="grid w-full grid-cols-2 bg-[#F4F5F6] md:grid-cols-4 lg:grid-cols-5">
        {(galleryImages.length ? galleryImages : [
          diseno.urbanoGallery1 || '/assets/templates/urbano/coleccion2.png',
          diseno.urbanoGallery2 || '/assets/templates/urbano/coleccion3.png',
          diseno.urbanoGallery3 || '/assets/templates/urbano/coleccion4.png',
          diseno.urbanoGallery4 || '/assets/templates/urbano/coleccion5.png',
          diseno.urbanoGallery5 || '/assets/templates/urbano/coleccion6.png',
        ]).slice(0, 5).map((image, index) => (
          <div key={`${image}-${index}`} className={`${index > 1 ? 'hidden md:block' : ''} ${index > 3 ? 'hidden lg:block' : ''} aspect-[4/5] overflow-hidden`}>
            <img src={image} alt={`Galería ${index + 1}`} className="h-full w-full object-cover transition-transform duration-700 hover:scale-105" />
          </div>
        ))}
      </section>

      <UrbanoFooter diseno={activeDiseno} tienda={tienda} slug={slug} categories={displayCategories} />
    </div>
  );
}
