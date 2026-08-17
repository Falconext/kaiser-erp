import { useState, useEffect, useMemo, type ComponentType } from 'react';
import { BRAND } from '@/lib/branding';
import { Icon } from '@iconify/react';
import ProductCardXtra from '@/components/tienda/ProductCardXtra';
import ProductCardCatalog from '@/components/tienda/ProductCardCatalog';
import AutopartesHeader from '@/components/tienda/AutopartesHeader';
import AutopartesHero from '@/components/tienda/AutopartesHero';
import AutopartesFeaturedCategories from '@/components/tienda/AutopartesFeaturedCategories';
import AutopartesPromoBanners from '@/components/tienda/AutopartesPromoBanners';
import ProductCardAutopartes from '@/components/tienda/ProductCardAutopartes';
import ProductCardGromuse from '@/components/tienda/ProductCardGromuse';
import AutopartesTrendingProducts from '@/components/tienda/AutopartesTrendingProducts';
import AutopartesDealsOfTheWeek from '@/components/tienda/AutopartesDealsOfTheWeek';
import AutopartesBrands from '@/components/tienda/AutopartesBrands';
import AutopartesTopSelling from '@/components/tienda/AutopartesTopSelling';
import AutopartesFooter from '@/components/tienda/AutopartesFooter';
import AutopartesCatalog from '@/components/tienda/AutopartesCatalog';
import AutopartesCartModal from '@/components/tienda/AutopartesCartModal';
import ModaCartModal from '@/components/tienda/ModaCartModal';
import UrbanoCartModal from '@/components/tienda/UrbanoCartModal';
import ModaCheckoutPage from '@/templates/moda/ModaCheckoutPage';
import UrbanoCheckoutPage from '@/templates/urbano/UrbanoCheckoutPage';
import { UrbanoProductoPreviewPage } from '@/pages/tienda/UrbanoProductoPreviewPage';
import UrbanoHomePage from '@/templates/urbano/UrbanoHomePage';
import UrbanoCatalogoPage from '@/templates/urbano/UrbanoCatalogoPage';
import UrbanoCatalogPage from '@/templates/urbano/UrbanoCatalogPage';
import AutopartesCheckout from '@/pages/tienda/AutopartesCheckout';
import ModaHeader from '@/components/tienda/ModaHeader';
import ModaHero from '@/components/tienda/ModaHero';
import ModaBestSelling from '@/components/tienda/ModaBestSelling';
import ModaHomeSections from '@/components/tienda/ModaHomeSections';
import ModaFooter from '@/components/tienda/ModaFooter';
import TecnologiaLayout from '@/components/tienda/TecnologiaLayout';
import TecnologiaHeader from '@/components/tienda/TecnologiaHeader';
import TecnologiaFooter from '@/components/tienda/TecnologiaFooter';
import TecnologiaCartModal from '@/components/tienda/TecnologiaCartModal';
import MayeLayout from '@/components/tienda/MayeLayout';
import TecnologiaCatalogoPage from '@/templates/tecnologia/TecnologiaCatalogoPage';
import MayeCatalogoPage from '@/templates/maye/MayeCatalogoPage';
import TecnologiaCheckoutPage from '@/templates/tecnologia/TecnologiaCheckoutPage';
import MayeCheckoutPage from '@/templates/maye/MayeCheckoutPage';
import { MayeProductoPreviewPage } from '@/pages/tienda/MayeProductoPreviewPage';
import ApiculturaHomePage from '@/templates/apicultura/ApiculturaHomePage';
import ApiculturaCatalogoPage from '@/templates/apicultura/ApiculturaCatalogoPage';
import ApiculturaCheckoutPage from '@/templates/apicultura/ApiculturaCheckoutPage';
import ApiculturaContactPage from '@/templates/apicultura/ApiculturaContactPage';
import { ApiculturaProductoPreviewPage } from '@/pages/tienda/ApiculturaProductoPreviewPage';
import ConstruccionHomePage from '@/templates/construccion/ConstruccionHomePage';
import ConstruccionCatalogoPage from '@/templates/construccion/ConstruccionCatalogoPage';
import ConstruccionCheckoutPage from '@/templates/construccion/ConstruccionCheckoutPage';
import ConstruccionContactPage from '@/templates/construccion/ConstruccionContactPage';
import { ConstruccionProductoDetalleView } from '@/pages/tienda/ConstruccionProductoDetalle';
import FalconHomePage from '@/templates/falcon/FalconHomePage';
import { FalconProductoDetalleView } from '@/pages/tienda/FalconProductoDetalle';
import { FalconBlogView } from '@/pages/tienda/FalconBlog';
import FalconCheckoutPage from '@/templates/falcon/FalconCheckoutPage';
import FalconCatalogoPage from '@/templates/falcon/FalconCatalogoPage';
import { getRubroDemo, type DemoProduct, type RubroDemo } from '@/data/rubroDemo';
import ProductCardPio from '@/components/tienda/ProductCardPio';
import ProductCardEmox from '@/components/tienda/ProductCardEmox';
import ProductCardGlamora from '@/components/tienda/ProductCardGlamora';
import { resolveTemplate } from '@/components/tienda/resolveTemplate';

// Mapa de cards igual al de la tienda real ([slug].tsx) para que el preview
// de las plantillas genéricas respete el cardComponent de cada plantilla.
const PREVIEW_CARD_MAP: Record<string, ComponentType<any>> = {
  ProductCardPio,
  ProductCardEmox,
  ProductCardGlamora,
  ProductCardGromuse,
  ProductCardXtra,
};

interface PreviewConfig {
  plantillaId?: string;
  colorPrimario?: string;
  colorSecundario?: string;
  colorAccento?: string;
  tipografia?: string;
  rubroNombre?: string;
}

type PreviewPage = 'home' | 'catalogo' | 'producto' | 'checkout' | 'contacto' | 'blog';

const isPreviewPage = (value: string | null): value is PreviewPage =>
  value === 'home' || value === 'catalogo' || value === 'producto' || value === 'checkout' || value === 'contacto' || value === 'blog';

const getPreviewPageFromPath = (): PreviewPage | null => {
  const segments = window.location.pathname.split('/').filter(Boolean);
  const value = segments[segments.length - 1] ?? null;
  return isPreviewPage(value) ? value : null;
};

const URBANO_PREVIEW_ASSETS = [
  '/assets/templates/urbano/coleccion1.png',
  '/assets/templates/urbano/coleccion2.png',
  '/assets/templates/urbano/coleccion3.png',
  '/assets/templates/urbano/coleccion4.png',
  '/assets/templates/urbano/coleccion5.png',
  '/assets/templates/urbano/coleccion6.png',
  '/assets/templates/urbano/coleccion7.png',
  '/assets/templates/urbano/coleccion8.png',
  '/assets/templates/urbano/coleccion9.png',
  '/assets/templates/urbano/coleccion10.png',
];

const MODA_CATALOG_PREVIEW = [
  ['Camisa corset con lazo', 'PLM', 66.8, 76.9, 'https://images.unsplash.com/photo-1507680434567-5739c80be1ac?auto=format&fit=crop&q=90&w=900', 2],
  ['Conjunto saco y pantalon arena', 'ARGUE CULTURE', 81.8, 99.8, 'https://images.unsplash.com/photo-1516257984-b1b4d707412e?auto=format&fit=crop&q=90&w=900', 4],
  ['Pantalon drapeado grafito', 'BLAEXIT', 58.9, 67.9, 'https://images.unsplash.com/photo-1506629905607-d405b7a30db9?auto=format&fit=crop&q=90&w=900', 3],
  ['Traje negro oversize wide-leg', 'ARGUE CULTURE', 91.9, 99.9, 'https://images.unsplash.com/photo-1552374196-1ab2a1c593e8?auto=format&fit=crop&q=90&w=900', 2],
  ['Camisa blanca de lino con lazo', 'ORO', 50.9, 50.9, 'https://images.unsplash.com/photo-1542327897-d73f4005b533?auto=format&fit=crop&q=90&w=900', 2],
  ['Camisa floral pastel boton-up', 'PLM', 72.9, 83.9, 'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&q=90&w=900', 3],
  ['Pantalon cargo denim fruncido', 'GRACE RUB', 64.9, 74.9, 'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?auto=format&fit=crop&q=90&w=900', 2],
  ['Pantalon acid wash stacked', 'ASTT STUDIO', 82.9, 96.9, 'https://images.unsplash.com/photo-1516826957135-700dedea698c?auto=format&fit=crop&q=90&w=900', 1],
  ['Traje wide-leg con cuello scarf', 'ARGUE CULTURE', 73.8, 89.9, 'https://images.unsplash.com/photo-1520975682031-a9c3f8e4f69a?auto=format&fit=crop&q=90&w=900', 6],
  ['Loafers negros de cuero patente', 'JCAESAR', 149.6, 194.48, 'https://images.unsplash.com/photo-1614252369475-531eba835eb1?auto=format&fit=crop&q=90&w=900', 1],
  ['Camisa poplin boxy oversize', 'CLP', 95.9, 109.9, 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&q=90&w=900', 3],
  ['Casaca negra hooded oversize', 'GY', 44.9, 69.9, 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?auto=format&fit=crop&q=90&w=900', 3],
] as const;

const MODA_FILTER_GROUPS = [
  { label: 'Género', key: 'genero', options: ['Hombre', 'Mujer', 'Unisex'] },
  { label: 'Color', key: 'color', options: ['Negro', 'Blanco', 'Arena', 'Azul', 'Denim'] },
  { label: 'Marca', key: 'marca', options: ['PLM', 'ARGUE CULTURE', 'BLAEXIT', 'ORO', 'JCAESAR', 'GY'] },
  { label: 'Tipo de producto', key: 'tipo', options: ['Camisas', 'Pantalones', 'Casacas', 'Calzado'] },
  { label: 'Precio', key: 'precio', options: ['Hasta S/ 70', 'S/ 70 - S/ 100', 'Más de S/ 100'] },
  { label: 'Ocasión', key: 'ocasion', options: ['Diario', 'Oficina', 'Noche', 'Fin de semana'] },
  { label: 'Estilo', key: 'estilo', options: ['Minimal', 'Urbano', 'Elegante', 'Street'] },
] as const;

function modaPreviewProducts(products: DemoProduct[]) {
  return MODA_CATALOG_PREVIEW.map(([descripcion, marca, precioUnitario, precioOriginal, imagenUrl, coloresDisponibles], index) => ({
    ...(products[index] || {}),
    id: products[index]?.id || `moda-preview-catalog-${index + 1}`,
    descripcion,
    marca,
    precioUnitario,
    precioOriginal,
    imagenUrl,
    coloresDisponibles,
    genero: ['Hombre', 'Hombre', 'Unisex', 'Hombre', 'Hombre', 'Mujer', 'Unisex', 'Hombre', 'Mujer', 'Unisex', 'Hombre', 'Mujer'][index] || 'Unisex',
    color: ['Blanco', 'Arena', 'Negro', 'Negro', 'Blanco', 'Azul', 'Denim', 'Negro', 'Negro', 'Negro', 'Blanco', 'Negro'][index] || 'Negro',
    tipo: ['Camisas', 'Pantalones', 'Pantalones', 'Casacas', 'Camisas', 'Camisas', 'Pantalones', 'Pantalones', 'Casacas', 'Calzado', 'Camisas', 'Casacas'][index] || 'Camisas',
    ocasion: ['Noche', 'Oficina', 'Diario', 'Noche', 'Diario', 'Fin de semana', 'Diario', 'Oficina', 'Noche', 'Diario', 'Fin de semana', 'Diario'][index] || 'Diario',
    estilo: ['Elegante', 'Minimal', 'Urbano', 'Elegante', 'Minimal', 'Street', 'Urbano', 'Street', 'Elegante', 'Minimal', 'Urbano', 'Street'][index] || 'Urbano',
  }));
}

function modaFilterMatches(product: any, filters: Record<string, string>) {
  return Object.entries(filters).every(([key, value]) => {
    if (!value) return true;
    if (key === 'precio') {
      const price = Number(product.precioUnitario || 0);
      if (value === 'Hasta S/ 70') return price <= 70;
      if (value === 'S/ 70 - S/ 100') return price > 70 && price <= 100;
      if (value === 'Más de S/ 100') return price > 100;
    }
    return String(product[key] || '').toLowerCase() === value.toLowerCase();
  });
}

function sortModaProducts(products: any[], sort: string) {
  const list = [...products];
  if (sort === 'precio-asc') return list.sort((a, b) => Number(a.precioUnitario || 0) - Number(b.precioUnitario || 0));
  if (sort === 'precio-desc') return list.sort((a, b) => Number(b.precioUnitario || 0) - Number(a.precioUnitario || 0));
  if (sort === 'nombre') return list.sort((a, b) => String(a.descripcion || '').localeCompare(String(b.descripcion || '')));
  return list;
}

// ─── Shared Header ─────────────────────────────────────────────────────────────
function PreviewHeader({
  demo,
  cp,
  cartCount,
  currentPage,
  onNav,
  activeCategory,
  onSelectCategory,
}: {
  demo: RubroDemo;
  cp: string;
  cartCount: number;
  currentPage: PreviewPage;
  onNav: (page: PreviewPage) => void;
  activeCategory: string;
  onSelectCategory: (category: string) => void;
}) {
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const initials = demo.storeName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const wordFirst = demo.storeName.split(' ')[0];
  const wordRest = demo.storeName.split(' ').slice(1).join(' ');
  const categories = demo.categories.filter(c => c !== 'Todos');

  const selectCategory = (category: string) => {
    onSelectCategory(category);
    setIsCategoryOpen(false);
    onNav('catalogo');
  };

  return (
    <header className="sticky z-40 bg-white border-b border-gray-100 shadow-sm" style={{ top: 36 }}>
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center gap-5">
        <div className="flex items-center gap-2.5 flex-shrink-0 cursor-pointer" onClick={() => onNav('home')}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-sm" style={{ background: cp }}>
            {initials}
          </div>
        </div>

        <div className="relative hidden lg:block flex-shrink-0">
          <button
            type="button"
            onClick={() => setIsCategoryOpen((open) => !open)}
            className="h-11 inline-flex items-center gap-2 rounded-2xl bg-gray-50 px-4 text-sm font-black text-gray-800 transition-colors hover:bg-gray-100"
          >
            <span className="h-7 w-7 rounded-xl flex items-center justify-center text-white" style={{ background: cp }}>
              <Icon icon="solar:widget-5-bold-duotone" width={16} />
            </span>
            Categorías
            <Icon icon="solar:alt-arrow-down-bold" width={14} className={`transition-transform ${isCategoryOpen ? 'rotate-180' : ''}`} />
          </button>

          {isCategoryOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setIsCategoryOpen(false)} />
              <div className="absolute left-0 top-[calc(100%+10px)] z-50 w-80 overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-2xl">
                <div className="border-b border-gray-100 px-5 py-4">
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-gray-400">Explorar categorías</p>
                  <p className="mt-1 text-sm font-bold text-gray-900">Selecciona una familia</p>
                </div>
                <div className="max-h-80 overflow-y-auto p-2">
                  <button type="button" onClick={() => selectCategory('Todos')} className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm font-bold text-gray-800 hover:bg-gray-50">
                    <span className="h-9 w-9 rounded-xl bg-gray-100 flex items-center justify-center"><Icon icon="solar:widget-bold" width={18} /></span>
                    Todos los productos
                  </button>
                  {categories.map((name) => (
                    <button key={name} type="button" onClick={() => selectCategory(name)} className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm font-bold text-gray-800 hover:bg-gray-50">
                      <span className="h-9 w-9 rounded-xl flex items-center justify-center" style={{ background: `${cp}14`, color: cp }}><Icon icon="solar:tag-bold-duotone" width={18} /></span>
                      <span className="min-w-0 flex-1 truncate">{name}</span>
                      {activeCategory === name && <Icon icon="solar:check-circle-bold" width={16} style={{ color: cp }} />}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        <div className="flex-1 relative">
          <div className="h-11 hidden md:flex items-center gap-3 rounded-2xl bg-gray-50 px-4 transition-colors">
            <Icon icon="solar:magnifer-linear" className="text-gray-400 text-sm flex-shrink-0" />
            <span className="text-sm font-semibold text-gray-400">Buscar productos, marcas o códigos...</span>
          </div>
        </div>

        <div className="flex items-center gap-3 ml-auto flex-shrink-0">
          <button className="relative p-2.5 rounded-xl border border-gray-200 text-gray-600 bg-white">
            <Icon icon="solar:heart-linear" className="text-xl" />
          </button>
          <button className="relative p-2.5 rounded-xl border border-gray-200 text-gray-600 bg-white">
            <Icon icon="solar:bag-2-linear" className="text-xl" />
            {cartCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] flex items-center justify-center font-bold">{cartCount}</span>
            )}
          </button>
          <button className="p-2.5 rounded-xl border border-gray-200 text-gray-600 bg-white hidden md:flex">
            <Icon icon="solar:delivery-linear" className="text-xl" />
          </button>
        </div>
      </div>
    </header>
  );
}

// ─── Prose classes (sin @tailwindcss/typography) ──────────────────────────────
const PROSE = [
  'text-sm text-gray-600 leading-relaxed overflow-hidden w-full [&_*]:!whitespace-pre-wrap [&_*]:!break-words [&_*]:!max-w-full',
  '[&_h2]:text-base [&_h2]:font-bold [&_h2]:text-gray-900 [&_h2]:mb-2 [&_h2]:mt-4',
  '[&_h3]:text-sm [&_h3]:font-bold [&_h3]:text-gray-800 [&_h3]:mb-2 [&_h3]:mt-3',
  '[&_p]:mb-3 [&_p]:leading-relaxed',
  '[&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-3 [&_ul]:space-y-1',
  '[&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:mb-3 [&_ol]:space-y-1',
  '[&_li]:text-gray-600',
  '[&_strong]:font-bold [&_strong]:text-gray-800',
  '[&_table]:w-full [&_table]:text-xs [&_table]:border-collapse [&_table]:mb-4',
  '[&_td]:border [&_td]:border-gray-200 [&_td]:px-3 [&_td]:py-2',
  '[&_th]:border [&_th]:border-gray-200 [&_th]:px-3 [&_th]:py-2 [&_th]:bg-gray-50 [&_th]:font-bold',
].join(' ');

function buildDemoHtml(producto: DemoProduct): string {
  return `
<h2>Descripción del producto</h2>
<p>${producto.descripcion} — ideal para uso profesional y doméstico. Fabricado con materiales de alta calidad para garantizar rendimiento y durabilidad.</p>
<h2>Características principales</h2>
<ul>
  <li><strong>Marca:</strong> ${producto.marca.nombre}</li>
  <li><strong>Categoría:</strong> ${producto.categoria.nombre}</li>
  <li><strong>Stock disponible:</strong> ${producto.stock} unidades</li>
  <li><strong>Garantía:</strong> 12 meses con el fabricante</li>
  <li><strong>Origen:</strong> Importado, certificado de calidad</li>
</ul>
<h2>Especificaciones técnicas</h2>
<table>
  <thead><tr><th>Especificación</th><th>Detalle</th></tr></thead>
  <tbody>
    <tr><td>Modelo</td><td>${producto.descripcion.split(' ').slice(0, 3).join(' ')}</td></tr>
    <tr><td>Marca</td><td>${producto.marca.nombre}</td></tr>
    <tr><td>Categoría</td><td>${producto.categoria.nombre}</td></tr>
    <tr><td>Garantía</td><td>12 meses</td></tr>
    <tr><td>Condición</td><td>Nuevo, sellado de fábrica</td></tr>
  </tbody>
</table>
<h2>¿Qué incluye?</h2>
<ol>
  <li>1x ${producto.descripcion}</li>
  <li>Manual de usuario en español</li>
  <li>Certificado de garantía</li>
  <li>Accesorios de instalación</li>
</ol>
<p><strong>Nota:</strong> Las imágenes son referenciales. Para consultas sobre compatibilidad contáctanos por WhatsApp.</p>
  `.trim();
}

function PreviewDescripcion({ cp, producto }: { cp: string; producto: DemoProduct }) {
  const [open, setOpen] = useState(true);
  const html = buildDemoHtml(producto);
  return (
    <div className="mt-10 rounded-2xl border border-gray-100 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-6 py-4 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: `${cp}15` }}>
            <Icon icon="solar:document-text-bold-duotone" width={18} style={{ color: cp }} />
          </div>
          <div>
            <span className="text-sm font-bold text-gray-900">Descripción completa</span>
            <span className="ml-2 text-[10px] font-bold px-2 py-0.5 rounded-full text-white" style={{ background: cp }}>
              Demo
            </span>
          </div>
        </div>
        <Icon
          icon="solar:alt-arrow-down-bold"
          width={16}
          className="text-gray-400 transition-transform duration-200"
          style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
        />
      </button>
      {open && (
        <div className={`px-6 py-6 bg-white ${PROSE}`} dangerouslySetInnerHTML={{ __html: html }} />
      )}
    </div>
  );
}

// ─── Filter sidebar ─────────────────────────────────────────────────────────────
function FilterSidebar({ categories, cp, activeCategory, onSelectCategory }: { categories: string[]; cp: string; activeCategory: string; onSelectCategory: (c: string) => void }) {
  const [priceMin, setPriceMin] = useState(100);
  return (
    <aside className="w-52 flex-shrink-0 space-y-6 text-sm">
      <h3 className="font-bold text-gray-900 text-base">Filtros</h3>
      <div>
        <p className="font-semibold text-gray-700 mb-2.5">Categorías</p>
        <div className="space-y-2">
          {categories.filter(c => c !== 'Todos').slice(0, 5).map(cat => (
            <label key={cat} className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={activeCategory === cat || activeCategory === 'Todos'} onChange={() => onSelectCategory(activeCategory === cat ? 'Todos' : cat)} className="rounded border-gray-300" style={{ accentColor: cp }} />
              <span className="text-gray-600 text-xs">{cat}</span>
            </label>
          ))}
        </div>
      </div>
      <div>
        <p className="font-semibold text-gray-700 mb-2.5">Condición</p>
        <div className="space-y-2">
          {['Nuevo', 'Segunda mano'].map(c => (
            <label key={c} className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" className="rounded border-gray-300" style={{ accentColor: cp }} />
              <span className="text-gray-600 text-xs">{c}</span>
            </label>
          ))}
        </div>
      </div>
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="font-semibold text-gray-700">Precio mínimo</p>
          <span className="text-[11px] font-bold text-white px-1.5 py-0.5 rounded" style={{ background: cp }}>S/ {priceMin}</span>
        </div>
        <input type="range" min={0} max={500} value={priceMin} onChange={e => setPriceMin(Number(e.target.value))} className="w-full h-1.5 rounded-full appearance-none cursor-pointer" style={{ accentColor: cp }} />
        <div className="flex justify-between text-[10px] text-gray-400 mt-1"><span>S/ 0</span><span>S/ 500</span></div>
      </div>
      <div>
        <p className="font-semibold text-gray-700 mb-2">Precio exacto</p>
        <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
          <span className="px-2.5 py-2 bg-gray-50 text-gray-400 text-xs border-r border-gray-200">S/</span>
          <input type="number" defaultValue={100} className="flex-1 px-2.5 py-2 text-xs text-gray-700 outline-none" />
        </div>
      </div>
    </aside>
  );
}

// ─── PAGE: HOME ────────────────────────────────────────────────────────────────
function HomePage({ demo, cp, diseno, onNav, onProduct, onAddToCart }: { demo: RubroDemo; cp: string; diseno: any; onNav: (p: PreviewPage) => void; onProduct: (p: DemoProduct) => void; onAddToCart: () => void }) {
  const [headlinePre, ...headlineRest] = demo.heroKeyword.split(' ');
  const offset = Math.ceil(demo.products.length / 2);
  const related = [...demo.products.slice(offset), ...demo.products.slice(0, offset)];

  // Respetar el diseño de la plantilla seleccionada: card y grilla reales (como [slug].tsx)
  const tpl = resolveTemplate(diseno?.plantillaId);
  const CardComponent = PREVIEW_CARD_MAP[tpl.cardComponent] ?? ProductCardPio;
  const gridClass = tpl.gridCols;

  return (
    <div>
      {/* Hero */}
      <section className="mx-4 lg:mx-8 my-4 rounded-3xl overflow-hidden relative" style={{ background: '#0B1340', minHeight: 520 }}>
        <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: 'repeating-linear-gradient(-45deg, transparent, transparent 22px, rgba(255,255,255,0.025) 22px, rgba(255,255,255,0.025) 23px)' }} />
        <div className="relative grid grid-cols-1 lg:grid-cols-2 items-center min-h-[520px]">
          <div className="px-8 lg:px-16 py-14 lg:py-20">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold text-white mb-6" style={{ background: `${cp}30`, border: `1px solid ${cp}50` }}>
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: cp }} />
              Nuevos productos disponibles
            </div>
            <h1 className="text-4xl lg:text-5xl font-black text-white leading-tight mb-5">
              Obtén{' '}
              <span style={{ color: cp }}>{headlinePre}</span>
              {headlineRest.length > 0 && <> <span style={{ color: cp }}>{headlineRest.join(' ')}</span></>}
              <br />Al Mejor Precio.
            </h1>
            <p className="text-gray-400 text-sm leading-relaxed mb-8 max-w-md">{demo.heroDesc}</p>
            <div className="flex items-center gap-4 flex-wrap">
              <button onClick={() => onNav('catalogo')} className="flex items-center gap-3 px-6 py-3 rounded-full text-white font-bold text-sm shadow-lg hover:opacity-90 transition-opacity" style={{ background: cp }}>
                Explorar Ahora
                <span className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center"><Icon icon="solar:arrow-right-bold" className="text-sm" /></span>
              </button>
              <button className="flex items-center gap-3 text-white text-sm font-medium hover:opacity-80 transition-opacity">
                <span className="w-10 h-10 rounded-full border border-white/30 flex items-center justify-center bg-white/10">
                  <Icon icon="solar:play-bold" className="text-sm" />
                </span>
                Ver Promoción
              </button>
            </div>
          </div>
          <div className="relative flex items-center justify-center h-64 lg:h-auto lg:min-h-[520px] px-8 lg:px-12 pb-8 lg:pb-0">
            <div className="absolute w-64 h-64 rounded-full blur-3xl opacity-25 pointer-events-none" style={{ background: cp, right: '5%', top: '15%' }} />
            <div className="absolute w-52 h-52 rounded-full blur-2xl opacity-35 pointer-events-none" style={{ background: 'radial-gradient(circle, #e879f9 0%, #f97316 100%)', right: '20%', top: '20%' }} />
            <div className="relative z-10">
              <img src={demo.products[0].imagenUrl} alt={demo.products[0].descripcion} className="w-72 h-72 lg:w-80 lg:h-80 object-cover rounded-2xl drop-shadow-2xl cursor-pointer hover:scale-105 transition-transform duration-300" onClick={() => onProduct(demo.products[0])} style={{ filter: 'drop-shadow(0 25px 50px rgba(0,0,0,0.5))' }} />
              <div className="absolute bottom-2 -right-4 lg:-right-8 z-20 bg-white rounded-2xl shadow-2xl p-3 flex items-center gap-3 cursor-pointer" style={{ minWidth: 200 }} onClick={() => onProduct(demo.products[1])}>
                <img src={demo.products[1].imagenUrl} alt="" className="w-11 h-11 rounded-xl object-cover flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs font-bold text-gray-900 line-clamp-1 leading-tight">{demo.products[1].descripcion}</p>
                  <p className="text-xs text-gray-400 mt-0.5">S/ <span className="font-semibold" style={{ color: cp }}>{demo.products[1].precioUnitario.toFixed(2)}</span></p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Popular */}
      <section className="max-w-7xl mx-auto px-4 lg:px-6 pb-12">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="font-bold text-xl text-gray-900">Productos Populares</h2>
            <p className="text-xs text-gray-400 mt-0.5">{demo.products.length} productos</p>
          </div>
          <button onClick={() => onNav('catalogo')} className="text-sm font-semibold flex items-center gap-1 hover:opacity-80 transition-opacity" style={{ color: cp }}>
            Ver todo <Icon icon="solar:alt-arrow-right-bold" className="text-sm" />
          </button>
        </div>
        <div className={`grid ${gridClass} gap-4`}>
          {demo.products.slice(0, 8).map(p => (
            <CardComponent key={p.id} producto={p} slug="preview" diseno={diseno} onAddToCart={onAddToCart} onClick={() => onProduct(p)} />
          ))}
        </div>
      </section>

      {/* Related */}
      <section className="bg-gray-50/60 py-12">
        <div className="max-w-7xl mx-auto px-4 lg:px-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="font-bold text-xl text-gray-900">Productos que te podrían interesar</h2>
              <p className="text-xs text-gray-400 mt-0.5">{related.length} productos</p>
            </div>
            <button onClick={() => onNav('catalogo')} className="text-sm font-semibold flex items-center gap-1 hover:opacity-80 transition-opacity" style={{ color: cp }}>
              Ver todo <Icon icon="solar:alt-arrow-right-bold" className="text-sm" />
            </button>
          </div>
          <div className={`grid ${gridClass} gap-4`}>
            {related.slice(0, 8).map((p, i) => (
              <CardComponent key={`${p.id}-r${i}`} producto={p} slug="preview" diseno={diseno} onAddToCart={onAddToCart} onClick={() => onProduct(p)} />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

// ─── PAGE: CATÁLOGO ────────────────────────────────────────────────────────────
function CatalogoPage({ demo, cp, onProduct, onAddToCart }: { demo: RubroDemo; cp: string; onProduct: (p: DemoProduct) => void; onAddToCart: () => void }) {
  const [activeCategory, setActiveCategory] = useState('Todos');
  const filtered = activeCategory === 'Todos' ? demo.products : demo.products.filter(p => p.categoria.nombre === activeCategory);

  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-6 py-8">
      {/* Results header */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm text-gray-600">
          1 – {filtered.length} de <span className="font-medium">{demo.products.length * 71}</span> resultados para{' '}
          <span className="font-semibold" style={{ color: cp }}>"{activeCategory === 'Todos' ? demo.storeName : activeCategory}"</span>
        </p>
        <div className="flex items-center gap-1 text-sm text-gray-600 cursor-pointer">
          Ordenar por <Icon icon="solar:alt-arrow-down-bold" className="text-sm ml-0.5" />
        </div>
      </div>

      {/* Filter chips */}
      <div className="flex items-center gap-2 mb-6 flex-wrap">
        {demo.categories.filter(c => c !== 'Todos').slice(0, 2).map(cat => (
          <span key={cat} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-100 text-xs font-medium text-gray-600 cursor-pointer hover:bg-gray-200 transition-colors">
            {cat}
            <Icon icon="solar:close-circle-bold" className="text-sm text-gray-400" />
          </span>
        ))}
      </div>

      {/* Sidebar + Grid */}
      <div className="flex gap-8 items-start">
        <FilterSidebar categories={demo.categories} cp={cp} activeCategory={activeCategory} onSelectCategory={setActiveCategory} />
        <div className="flex-1">
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map(p => (
              <div key={p.id} className="cursor-pointer" onClick={() => onProduct(p)}>
                <ProductCardCatalog producto={p} slug="" cp={cp} onAddToCart={onAddToCart} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── PAGE: MODA PRODUCTO DETALLE ──────────────────────────────────────────────
function ModaProductoPreviewPage({ producto, demo, cp, diseno, onNav, onProduct, onAddToCart }: { producto: DemoProduct; demo: RubroDemo; cp: string; diseno: any; onNav: (p: PreviewPage) => void; onProduct: (p: DemoProduct) => void; onAddToCart: () => void }) {
  const [cantidad, setCantidad] = useState(1);
  const [selectedImage, setSelectedImage] = useState(producto.imagenUrl);
  const price = Number(producto.precioUnitario || 0);
  const originalPrice = Number(producto.precioOriginal || 0);
  const hasDiscount = !!(originalPrice && originalPrice > price);
  const discountPct = hasDiscount ? Math.round((1 - price / originalPrice) * 100) : 0;
  const starRating = [4, 4.5, 5, 4, 4.5][producto.id % 5];
  const fullStars = Math.floor(starRating);
  const hasHalf = starRating % 1 !== 0;
  const related = demo.products.filter(p => p.id !== producto.id).slice(0, 4);
  const demoImages = [producto.imagenUrl, ...demo.products.slice(0, 3).map(p => p.imagenUrl)];
  const demoColors = ['#B58863', '#1A1A1A', '#C0392B', '#3498DB'];
  const demoSizes = ['XS', 'S', 'M', 'L', 'XL'];
  const [selectedColor, setSelectedColor] = useState(0);
  const [selectedSize, setSelectedSize] = useState(2);

  return (
    <div className="pb-16 bg-[#FAF9F6]">
      <div className="w-full max-w-7xl mx-auto px-4 xl:px-8 py-8">

        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-xs text-gray-400 mb-8">
          <button onClick={() => onNav('home')} className="hover:text-gray-700 transition-colors font-medium">Inicio</button>
          <Icon icon="solar:alt-arrow-right-linear" width={12} />
          <button onClick={() => onNav('catalogo')} className="hover:text-gray-700 transition-colors font-medium">Catálogo</button>
          <Icon icon="solar:alt-arrow-right-linear" width={12} />
          <span className="font-semibold text-gray-700 truncate max-w-[160px]">{producto.descripcion}</span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16">

          {/* Images */}
          <div className="flex flex-col gap-4">
            <div className="relative overflow-hidden rounded-3xl bg-[#F5F0EB] aspect-[4/5]">
              <img src={selectedImage} alt={producto.descripcion} className="w-full h-full object-cover hover:scale-105 transition-transform duration-700" />
              {hasDiscount && (
                <span className="absolute top-4 left-4 text-[10px] font-black text-white px-3 py-1.5 rounded-full tracking-wider" style={{ backgroundColor: '#1A1A1A' }}>
                  -{discountPct}% OFF
                </span>
              )}
              <button className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/90 backdrop-blur-sm shadow flex items-center justify-center hover:scale-110 transition-transform">
                <Icon icon="solar:heart-linear" width={20} className="text-gray-600" />
              </button>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-1">
              {demoImages.slice(0, 4).map((img, i) => (
                <button key={i} onClick={() => setSelectedImage(img)}
                  className="flex-shrink-0 w-20 h-20 rounded-2xl overflow-hidden border-2 transition-all"
                  style={{ borderColor: selectedImage === img ? '#1A1A1A' : '#E5E7EB' }}>
                  <img src={img} alt="" className="w-full h-full object-cover bg-[#F5F0EB]" />
                </button>
              ))}
            </div>
          </div>

          {/* Info */}
          <div className="flex flex-col pt-1">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-gray-400 mb-2">{demo.storeName}</p>
            <h1 className="text-2xl sm:text-3xl font-black text-gray-900 leading-tight mb-3">{producto.descripcion}</h1>

            {/* Stars */}
            <div className="flex items-center gap-2 mb-4">
              <div className="flex items-center gap-0.5">
                {Array.from({ length: 5 }, (_, i) => {
                  const n = i + 1;
                  const icon = n <= fullStars ? 'solar:star-bold' : hasHalf && n === fullStars + 1 ? 'solar:star-half-bold' : 'solar:star-outline';
                  const color = n <= fullStars || (hasHalf && n === fullStars + 1) ? '#1A1A1A' : '#D1D5DB';
                  return <Icon key={i} icon={icon} width={14} style={{ color }} />;
                })}
              </div>
              <span className="text-xs text-gray-500 font-medium">{starRating.toFixed(1)} ({((producto.id * 23 + 7) % 90) + 3} reseñas)</span>
            </div>

            {/* Price */}
            <div className="flex items-baseline gap-3 mb-5">
              <span className="text-3xl font-black text-gray-900">S/ {price.toFixed(2)}</span>
              {hasDiscount && (
                <>
                  <span className="text-lg text-gray-400 line-through font-medium">S/ {originalPrice.toFixed(2)}</span>
                  <span className="text-xs font-black text-white px-2 py-0.5 rounded-full bg-gray-900">-{discountPct}%</span>
                </>
              )}
            </div>

            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-full mb-5 w-fit">
              <Icon icon="solar:check-circle-bold" width={14} /> En Stock ({producto.stock})
            </span>

            {/* Color selector */}
            <div className="mb-5">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-bold uppercase tracking-widest text-gray-500">Color disponible</p>
                <p className="text-xs font-semibold text-gray-700">{['Camel', 'Negro', 'Rojo', 'Azul'][selectedColor]}</p>
              </div>
              <div className="flex gap-2.5">
                {demoColors.map((color, i) => (
                  <button key={i} onClick={() => setSelectedColor(i)}
                    className="w-8 h-8 rounded-full border-2 transition-all hover:scale-110"
                    style={{
                      backgroundColor: color,
                      borderColor: selectedColor === i ? '#1A1A1A' : 'transparent',
                      boxShadow: selectedColor === i ? '0 0 0 2px #fff, 0 0 0 4px #1A1A1A' : 'none',
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Size selector */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-bold uppercase tracking-widest text-gray-500">Talla</p>
                <button className="text-xs font-semibold text-gray-500 underline underline-offset-2">Ver guía de tallas</button>
              </div>
              <div className="flex flex-wrap gap-2">
                {demoSizes.map((size, i) => (
                  <button key={i} onClick={() => setSelectedSize(i)}
                    className="min-w-[2.75rem] h-10 px-3 rounded-xl border-2 text-sm font-bold transition-all"
                    style={{
                      borderColor: selectedSize === i ? '#1A1A1A' : '#E5E7EB',
                      backgroundColor: selectedSize === i ? '#1A1A1A' : '#fff',
                      color: selectedSize === i ? '#fff' : '#374151',
                    }}>
                    {size}
                  </button>
                ))}
              </div>
            </div>

            {/* Qty + Bag + Favorite */}
            <div className="flex items-center gap-3 mb-4">
              <div className="flex items-center bg-gray-100 rounded-xl px-1 py-1 gap-1 border border-gray-200">
                <button onClick={() => setCantidad(Math.max(1, cantidad - 1))} className="w-9 h-9 rounded-lg flex items-center justify-center text-gray-500 hover:bg-white hover:text-gray-900 transition-all font-bold text-lg">−</button>
                <span className="w-9 text-center font-black text-gray-900 text-sm">{cantidad}</span>
                <button onClick={() => setCantidad(cantidad + 1)} className="w-9 h-9 rounded-lg flex items-center justify-center text-gray-500 hover:bg-white hover:text-gray-900 transition-all font-bold text-lg">+</button>
              </div>
              <button className="w-12 h-12 rounded-xl border-2 border-gray-200 flex items-center justify-center hover:border-gray-900 transition-all">
                <Icon icon="solar:heart-linear" width={20} className="text-gray-600" />
              </button>
              <button onClick={onAddToCart} className="flex-1 h-12 rounded-xl font-bold text-sm flex items-center justify-center gap-2 bg-gray-900 text-white hover:opacity-90 active:scale-95 transition-all">
                <Icon icon="solar:bag-3-bold" width={18} /> Añadir a la bolsa
              </button>
            </div>

            {/* Buy now */}
            <button className="w-full h-12 rounded-xl border-2 border-gray-900 text-gray-900 font-bold text-sm flex items-center justify-center gap-2 hover:bg-gray-900 hover:text-white transition-all mb-6 active:scale-95">
              <Icon icon="solar:lightning-bolt-bold" width={16} /> Comprar ahora
            </button>

            {/* Info cards */}
            <div className="space-y-2 mb-5">
              {[
                { icon: 'solar:delivery-bold-duotone', title: 'Entrega rápida', desc: 'Coordinada directamente con la tienda' },
                { icon: 'solar:refresh-bold-duotone', title: 'Cambios y devoluciones', desc: 'Devoluciones fáciles dentro de 7 días' },
                { icon: 'solar:shield-check-bold-duotone', title: 'Pago seguro', desc: 'Atención y soporte vía WhatsApp' },
              ].map(({ icon, title, desc }) => (
                <div key={title} className="flex items-center gap-3 bg-white rounded-2xl p-3.5 border border-gray-100">
                  <div className="w-9 h-9 rounded-xl bg-gray-50 flex items-center justify-center flex-shrink-0">
                    <Icon icon={icon} width={20} className="text-gray-700" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-900">{title}</p>
                    <p className="text-[11px] text-gray-500">{desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="text-xs text-gray-400 border-t border-gray-100 pt-4">
              <p><span className="font-semibold text-gray-500">Categoría:</span> {typeof producto.categoria === 'object' ? (producto.categoria as any)?.nombre : producto.categoria}</p>
              <p className="mt-1"><span className="font-semibold text-gray-500">Marca:</span> {typeof producto.marca === 'object' ? (producto.marca as any)?.nombre : producto.marca}</p>
            </div>
          </div>
        </div>

        {/* You may also like */}
        {related.length > 0 && (
          <section className="mt-16">
            <h2 className="text-2xl font-black text-gray-900 mb-2">También te puede gustar</h2>
            <p className="text-sm text-gray-400 mb-8">Estilos curados, piezas premium y tendencias de moda para expresar tu estilo único.</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
              {related.map(p => {
                const rPrice = Number(p.precioUnitario || 0);
                const rOrig = Number(p.precioOriginal || 0);
                const rDisc = rOrig > 0 && rOrig > rPrice;
                return (
                  <button key={p.id} onClick={() => { onProduct(p); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="text-left group w-full">
                    <div className="relative overflow-hidden rounded-2xl bg-[#F5F0EB] aspect-[3/4] mb-3">
                      <img src={p.imagenUrl} alt={p.descripcion} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.06]" />
                      {rDisc && (
                        <span className="absolute top-3 left-3 text-[10px] font-black text-white px-2.5 py-1 rounded-full bg-gray-900">
                          -{Math.round((1 - rPrice / rOrig) * 100)}%
                        </span>
                      )}
                    </div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1 truncate">{typeof p.categoria === 'object' ? (p.categoria as any)?.nombre : p.categoria}</p>
                    <p className="text-sm font-bold text-gray-900 leading-snug line-clamp-2 mb-2">{p.descripcion}</p>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-black text-gray-900">S/ {rPrice.toFixed(2)}</span>
                      {rDisc && <span className="text-xs text-gray-400 line-through">S/ {rOrig.toFixed(2)}</span>}
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

// ─── PAGE: PRODUCTO DETALLE ────────────────────────────────────────────────────
function ProductoPage({ producto, demo, cp, diseno, onNav, onProduct, onAddToCart }: { producto: DemoProduct; demo: RubroDemo; cp: string; diseno: any; onNav: (p: PreviewPage) => void; onProduct: (p: DemoProduct) => void; onAddToCart: () => void }) {
  const [cantidad, setCantidad] = useState(1);
  const price = Number(producto.precioUnitario || 0);
  const originalPrice = Number(producto.precioOriginal || 0);
  const hasDiscount = !!(originalPrice && originalPrice > price);
  const discountPct = hasDiscount ? Math.round((1 - price / originalPrice) * 100) : 0;
  const starRating = [4, 4.5, 5, 4, 4.5][producto.id % 5];
  const fullStars = Math.floor(starRating);
  const hasHalf = starRating % 1 !== 0;
  const related = demo.products.filter(p => p.id !== producto.id).slice(0, 8);

  return (
    <div className="pb-16">
      <div className="max-w-screen-xl mx-auto px-5 md:px-8 py-6">

        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-xs text-gray-400 mb-8">
          <button onClick={() => onNav('home')} className="hover:text-gray-700 transition-colors">Inicio</button>
          <Icon icon="solar:alt-arrow-right-linear" width={12} />
          <button onClick={() => onNav('catalogo')} className="hover:text-gray-700 transition-colors">Catálogo</button>
          <Icon icon="solar:alt-arrow-right-linear" width={12} />
          <span className="font-semibold text-gray-700 truncate max-w-[40vw]">{producto.descripcion}</span>
        </nav>

        <div className="grid lg:grid-cols-2 gap-10 lg:gap-16">
          {/* Image */}
          <div>
            <div className="rounded-3xl flex items-center justify-center aspect-square overflow-hidden mb-4" style={{ background: '#F4F6FF' }}>
              <img src={producto.imagenUrl} alt={producto.descripcion} className="w-full h-full object-contain p-10 hover:scale-105 transition-transform duration-500" />
            </div>
            <div className="flex gap-3 justify-center">
              {[producto.imagenUrl, ...demo.products.slice(0, 3).map(p => p.imagenUrl)].slice(0, 4).map((img, i) => (
                <div key={i} className="w-16 h-16 rounded-xl overflow-hidden border-2" style={{ borderColor: i === 0 ? cp : '#e5e7eb' }}>
                  <img src={img} alt="" className="w-full h-full object-contain p-1 bg-gray-50" />
                </div>
              ))}
            </div>
          </div>

          {/* Info */}
          <div className="flex flex-col">
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest">{demo.storeName}</span>
              {hasDiscount && (
                <span className="text-[10px] font-black text-white px-2 py-0.5 rounded-full" style={{ background: cp }}>-{discountPct}% OFF</span>
              )}
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border" style={{ color: '#22C55E', borderColor: '#22C55E' }}>
                En Stock: {producto.stock}
              </span>
            </div>

            <h1 className="text-3xl lg:text-4xl font-black text-gray-900 leading-tight mb-4">{producto.descripcion}</h1>

            <div className="flex items-center gap-1.5 mb-5">
              {Array.from({ length: 5 }, (_, i) => {
                const n = i + 1;
                return (
                  <Icon key={n} icon={n <= fullStars ? 'solar:star-bold' : hasHalf && n === fullStars + 1 ? 'solar:star-half-bold' : 'solar:star-linear'} className={`text-lg ${n <= fullStars || (hasHalf && n === fullStars + 1) ? 'text-amber-400' : 'text-gray-200'}`} />
                );
              })}
              <span className="text-xs text-gray-400 ml-1">{starRating} · {((producto.id * 23 + 7) % 90) + 3} reseñas</span>
            </div>

            <div className="flex items-baseline gap-3 mb-6">
              <span className="text-4xl font-black text-gray-900">S/ {price.toFixed(2)}</span>
              {hasDiscount && <span className="text-lg text-gray-400 line-through">S/ {originalPrice.toFixed(2)}</span>}
            </div>

            <p className="text-sm text-gray-500 leading-relaxed mb-6 border-t border-gray-100 pt-5">
              {demo.heroDesc}
            </p>

            <div className="flex items-center gap-3 mb-4">
              <div className="flex items-center gap-3 bg-gray-100 rounded-xl px-4 py-2.5">
                <button onClick={() => setCantidad(Math.max(1, cantidad - 1))} className="text-gray-500 hover:text-gray-900 font-bold text-lg w-6 h-6 flex items-center justify-center">−</button>
                <span className="font-bold text-gray-900 w-6 text-center">{cantidad}</span>
                <button onClick={() => setCantidad(Math.min(producto.stock, cantidad + 1))} className="text-gray-500 hover:text-gray-900 font-bold text-lg w-6 h-6 flex items-center justify-center">+</button>
              </div>
              <button onClick={onAddToCart} className="flex-1 py-3 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2 hover:opacity-90 transition-opacity" style={{ background: cp }}>
                <Icon icon="solar:cart-large-2-bold" width={18} />
                Agregar al carrito
              </button>
            </div>

            <button className="w-full py-3 rounded-xl font-bold text-sm text-white bg-gray-900 hover:bg-black flex items-center justify-center gap-2 transition-colors mb-6">
              <Icon icon="solar:lightning-bolt-bold" width={16} />
              Comprar ahora
            </button>

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
              <p><span className="font-semibold text-gray-600">Categoría:</span> {producto.categoria.nombre}</p>
              <p><span className="font-semibold text-gray-600">Marca:</span> {producto.marca.nombre}</p>
            </div>
          </div>
        </div>

        {/* Descripción rica — demo */}
        <PreviewDescripcion cp={cp} producto={producto} />

        {/* Related */}
        {related.length > 0 && (
          <div className="mt-10 border-t border-gray-100 pt-12">
            <h2 className="text-2xl font-black text-gray-900 mb-6">Productos similares</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {related.map(rp => (
                <ProductCardXtra key={rp.id} producto={rp} slug="preview" diseno={diseno} onAddToCart={onAddToCart} onClick={() => { onProduct(rp); window.scrollTo({ top: 0, behavior: 'smooth' }); }} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="mt-12 py-10 border-t border-gray-100" style={{ background: '#fafafa' }}>
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white font-black text-xs" style={{ background: cp }}>
              {demo.storeName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
            </div>
            <div>
              <p className="font-black text-gray-900 text-sm">{demo.storeName}<span style={{ color: cp }}>.</span></p>
              <p className="text-[11px] text-gray-400">{demo.slogan}</p>
            </div>
          </div>
          <p className="text-xs text-gray-400">© {new Date().getFullYear()} {demo.storeName} · Powered by <strong className="text-gray-600">{BRAND.name}</strong></p>
        </div>
      </footer>
    </div>
  );
}

function TecnologiaProductoPreviewPage({
  producto,
  demo,
  cp,
  diseno,
  carrito,
  setCarrito,
  mostrarCarrito,
  setMostrarCarrito,
  actualizarCantidad,
  onNav,
  onProduct,
  onAddToCart,
}: {
  producto: DemoProduct;
  demo: RubroDemo;
  cp: string;
  diseno: any;
  carrito: any[];
  setCarrito: (items: any[]) => void;
  mostrarCarrito: boolean;
  setMostrarCarrito: (value: boolean) => void;
  actualizarCantidad: (id: number | string, cantidad: number) => void;
  onNav: (p: PreviewPage) => void;
  onProduct: (p: DemoProduct) => void;
  onAddToCart: (producto: DemoProduct) => void;
}) {
  const [cantidad, setCantidad] = useState(1);
  const [activeImage, setActiveImage] = useState(0);
  const price = Number(producto.precioUnitario || 0);
  const originalPrice = Number(producto.precioOriginal || 0);
  const hasDiscount = originalPrice > price;
  const discountPct = hasDiscount ? Math.round((1 - price / originalPrice) * 100) : 0;
  const productExtraImages = Array.isArray((producto as any).imagenesExtra) ? (producto as any).imagenesExtra : [];
  const images = [producto.imagenUrl, ...productExtraImages].filter(Boolean);
  const related = demo.products.filter(p => p.id !== producto.id).slice(0, 4);
  const tienda = {
    nombre: demo.storeName,
    nombreComercial: demo.storeName,
    razonSocial: demo.storeName,
    logo: '',
    diseno,
  };
  const carritoSize = carrito.reduce((sum, item) => sum + Number(item.cantidad || 1), 0);
  const stock = Number(producto.stock || 0);
  const isOutOfStock = stock <= 0;
  const ratingCount = Number((producto as any).ratingCount || (producto as any).reviewsCount || 0);
  const ratingAvg = ratingCount > 0 ? Number((producto as any).ratingAvg || (producto as any).ratingPromedio || 0) : 0;

  const addQuantity = () => {
    if (isOutOfStock) return;
    onAddToCart({ ...producto, cantidad });
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA]" style={{ fontFamily: `'${diseno.tipografia || 'Inter'}', sans-serif` }}>
      <TecnologiaHeader
        tienda={tienda}
        slug="preview"
        cp={cp}
        carritoSize={carritoSize}
        onOpenCart={() => setMostrarCarrito(!mostrarCarrito)}
        searchQuery=""
        setSearchQuery={() => { }}
        onSearchSubmit={(event: any) => {
          event.preventDefault();
          onNav('catalogo');
        }}
        allCategories={demo.categories.filter(category => category !== 'Todos')}
      />

      <main className="mx-auto w-full max-w-7xl px-4 py-8 xl:px-8 xl:py-10">
        <nav className="mb-8 flex items-center gap-2 text-xs font-semibold text-gray-400">
          <button onClick={() => onNav('home')} className="transition-colors hover:text-gray-900">Inicio</button>
          <Icon icon="solar:alt-arrow-right-linear" width={12} />
          <button onClick={() => onNav('catalogo')} className="transition-colors hover:text-gray-900">Catálogo</button>
          <Icon icon="solar:alt-arrow-right-linear" width={12} />
          <span className="max-w-[48vw] truncate text-gray-700">{producto.descripcion}</span>
        </nav>

        <section className="grid gap-10 lg:grid-cols-[minmax(0,1.04fr)_minmax(420px,0.96fr)] lg:gap-14">
          <div>
            <div className="relative overflow-hidden rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
              {hasDiscount && (
                <span className="absolute left-5 top-5 z-10 rounded-md px-3 py-1.5 text-[11px] font-black uppercase tracking-wider text-white" style={{ background: cp }}>
                  -{discountPct}%
                </span>
              )}
              <div className="flex aspect-square items-center justify-center rounded-2xl bg-gray-50">
                <img
                  src={images[activeImage] || producto.imagenUrl}
                  alt={producto.descripcion}
                  className="h-full w-full object-contain p-6 transition-transform duration-700 hover:scale-[1.03]"
                />
              </div>
            </div>

            <div className="mt-4 grid grid-cols-4 gap-3">
              {images.slice(0, 4).map((image, index) => (
                <button
                  key={`${image}-${index}`}
                  type="button"
                  onClick={() => setActiveImage(index)}
                  className="aspect-square rounded-2xl border bg-white p-2 transition"
                  style={{ borderColor: activeImage === index ? cp : '#E5E7EB' }}
                >
                  <img src={image} alt="" className="h-full w-full object-contain" />
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-black text-emerald-600">
                {isOutOfStock ? 'Agotado' : `En stock (${stock})`}
              </span>
              <span className="rounded-full bg-gray-900 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-white">
                {producto.marca?.nombre || producto.marca || 'Tech'}
              </span>
            </div>

            <h1 className="text-3xl font-black leading-tight tracking-tight text-gray-950 md:text-4xl lg:text-5xl">
              {producto.descripcion}
            </h1>

            <div className="mt-5 flex items-center gap-2">
              <div className="flex text-[#F5B01D]">
                {Array.from({ length: 5 }).map((_, index) => (
                  <Icon key={index} icon={index < Math.round(ratingAvg) ? 'solar:star-bold' : 'solar:star-linear'} width={18} />
                ))}
              </div>
              <span className="text-sm font-semibold text-gray-500">
                {ratingCount > 0 ? `${ratingAvg.toFixed(1)} (${ratingCount} reseñas)` : 'Sin reseñas publicadas'}
              </span>
            </div>

            <div className="mt-7 flex flex-wrap items-end gap-3">
              <span className="text-4xl font-black tracking-tight text-gray-950 md:text-5xl">S/ {price.toFixed(2)}</span>
              {hasDiscount && (
                <>
                  <span className="pb-1 text-lg font-bold text-gray-400 line-through">S/ {originalPrice.toFixed(2)}</span>
                  <span className="mb-2 rounded-md bg-red-500 px-2.5 py-1 text-xs font-black text-white">-{discountPct}%</span>
                </>
              )}
            </div>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <div className="flex h-[54px] items-center justify-between rounded-xl border border-gray-200 bg-white px-4 sm:w-36">
                <button onClick={() => setCantidad(Math.max(1, cantidad - 1))} className="text-xl font-black text-gray-500 hover:text-gray-900">-</button>
                <span className="text-sm font-black text-gray-900">{cantidad}</span>
                <button onClick={() => setCantidad(isOutOfStock ? cantidad : Math.min(stock, cantidad + 1))} className="text-xl font-black text-gray-500 hover:text-gray-900">+</button>
              </div>
              <button
                disabled={isOutOfStock}
                onClick={addQuantity}
                className="flex h-[54px] flex-1 items-center justify-center gap-2 rounded-xl text-sm font-black text-white shadow-lg transition hover:brightness-95 disabled:bg-gray-300 disabled:shadow-none"
                style={isOutOfStock ? undefined : { background: cp, boxShadow: `0 18px 36px ${cp}28` }}
              >
                <Icon icon={isOutOfStock ? 'solar:close-circle-bold' : 'solar:cart-large-minimalistic-bold'} width={20} />
                {isOutOfStock ? 'Agotado' : 'Agregar al carrito'}
              </button>
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {[
                ['solar:shield-check-bold-duotone', 'Garantía real', 'Comprobante y soporte'],
                ['solar:delivery-bold-duotone', 'Despacho seguro', 'Envío o recojo'],
                ['solar:card-2-bold-duotone', 'Pagos confiables', 'Yape, Plin y más'],
              ].map(([icon, title, text]) => (
                <div key={title} className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                  <Icon icon={icon} width={24} style={{ color: cp }} />
                  <p className="mt-3 text-sm font-black text-gray-900">{title}</p>
                  <p className="mt-1 text-xs leading-relaxed text-gray-500">{text}</p>
                </div>
              ))}
            </div>

            <div className="mt-8 rounded-2xl bg-[#0B1120] p-6 text-white">
              <h2 className="text-sm font-black uppercase tracking-widest text-white/80">Ficha técnica</h2>
              <div className="mt-5 grid gap-3 text-sm">
                <div className="flex justify-between border-b border-white/10 pb-3">
                  <span className="text-white/45">Categoría</span>
                  <span className="font-bold">{producto.categoria?.nombre || producto.categoria || 'Tecnología'}</span>
                </div>
                <div className="flex justify-between border-b border-white/10 pb-3">
                  <span className="text-white/45">Marca</span>
                  <span className="font-bold">{producto.marca?.nombre || producto.marca || 'Tech'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/45">Disponibilidad</span>
                  <span className="font-bold">{isOutOfStock ? 'Sin stock' : `${stock} unidades`}</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {related.length > 0 && (
          <section className="mt-16 border-t border-gray-200 pt-12">
            <div className="mb-7 flex items-end justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.25em]" style={{ color: cp }}>También te puede interesar</p>
                <h2 className="mt-2 text-2xl font-black text-gray-950">Productos relacionados</h2>
              </div>
              <button onClick={() => onNav('catalogo')} className="hidden text-sm font-black text-gray-500 hover:text-gray-900 sm:inline-flex">
                Ver catálogo
              </button>
            </div>
            <div className="flex gap-4 md:gap-6 overflow-x-auto pb-6 pt-2 snap-x snap-mandatory scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {related.map(product => (
                <div key={product.id} className="w-[180px] sm:w-[240px] md:w-[260px] shrink-0 snap-start">
                  <ProductCardXtra
                    producto={product}
                    slug="preview"
                    diseno={{ ...diseno, colorPrimario: cp }}
                    onAddToCart={() => onAddToCart(product)}
                    onClick={() => {
                      onProduct(product);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                  />
                </div>
              ))}
            </div>
          </section>
        )}
      </main>

      <TecnologiaFooter tienda={tienda} slug="preview" diseno={diseno} categories={demo.categories.filter(category => category !== 'Todos')} />

      <TecnologiaCartModal
        isOpen={mostrarCarrito}
        onClose={() => setMostrarCarrito(false)}
        carrito={carrito}
        setCarrito={setCarrito}
        actualizarCantidad={actualizarCantidad}
        onCheckout={() => {
          setMostrarCarrito(false);
          onNav('checkout');
        }}
        cp={cp}
      />
    </div>
  );
}

// ─── MAIN ──────────────────────────────────────────────────────────────────────
export default function StorePreviewPage() {
  const [config, setConfig] = useState<PreviewConfig>({});
  const [demo, setDemo] = useState<RubroDemo>(getRubroDemo(''));
  const [page, setPage] = useState<PreviewPage>('home');
  const [selectedProduct, setSelectedProduct] = useState<DemoProduct | null>(null);
  const [carrito, setCarrito] = useState<any[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState('Todos');
  const [showFilters, setShowFilters] = useState(false);
  const [modaOpenFilter, setModaOpenFilter] = useState<string | null>('genero');
  const [modaFilters, setModaFilters] = useState<Record<string, string>>({});
  const [modaSort, setModaSort] = useState('relevancia');
  const [catalogSearch, setCatalogSearch] = useState('');
  const [catalogSelectedCategories, setCatalogSelectedCategories] = useState<string[]>([]);
  const [catalogSelectedBrands, setCatalogSelectedBrands] = useState<string[]>([]);
  const [catalogPriceRange, setCatalogPriceRange] = useState<[number, number]>([0, 10000]);
  const [catalogSortBy, setCatalogSortBy] = useState('relevance');
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [showPersonalizarModal, setShowPersonalizarModal] = useState(false);
  const [productoAPersonalizar, setProductoAPersonalizar] = useState<any>(null);

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const pageFromRequest = params.get('page') ?? getPreviewPageFromPath();
      const fromUrl: PreviewConfig = {
        plantillaId: params.get('plantillaId') || undefined,
        colorPrimario: params.get('colorPrimario') || undefined,
        colorSecundario: params.get('colorSecundario') || undefined,
        colorAccento: params.get('colorAccento') || undefined,
        tipografia: params.get('tipografia') || undefined,
        rubroNombre: params.get('rubroNombre') || undefined,
      };
      if (Object.values(fromUrl).some(Boolean)) {
        setConfig(fromUrl);
        setDemo(getRubroDemo(fromUrl.rubroNombre ?? ''));
        if (isPreviewPage(pageFromRequest)) setPage(pageFromRequest);
        setActiveCategory('Todos');
        sessionStorage.setItem('store-preview-config', JSON.stringify(fromUrl));
        return;
      }
      const raw = sessionStorage.getItem('store-preview-config');
      if (raw) {
        const parsed: PreviewConfig = JSON.parse(raw);
        setConfig(parsed);
        setDemo(getRubroDemo(parsed.rubroNombre ?? ''));
        if (isPreviewPage(pageFromRequest)) setPage(pageFromRequest);
        setActiveCategory('Todos');
        return;
      }
      if (isPreviewPage(pageFromRequest)) setPage(pageFromRequest);
    } catch { }
  }, []);

  useEffect(() => {
    const handleNav = (e: Event) => {
      const targetPage = (e as CustomEvent).detail;
      setPage(targetPage);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };
    const handleProduct = (e: Event) => {
      const detail = (e as CustomEvent<any>).detail;
      const product = detail?.descripcion
        ? detail
        : demo.products.find(item => String(item.id) === String(detail?.id ?? detail));
      if (product) {
        setSelectedProduct(product);
        setPage('producto');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    };
    window.addEventListener('preview-nav', handleNav);
    window.addEventListener('preview-product', handleProduct);
    return () => {
      window.removeEventListener('preview-nav', handleNav);
      window.removeEventListener('preview-product', handleProduct);
    };
  }, [demo.products]);

  useEffect(() => {
    if (page === 'producto' && !selectedProduct && demo.products[0]) {
      setSelectedProduct(demo.products[0]);
    }
  }, [demo.products, page, selectedProduct]);

  const cp = config.colorPrimario ?? demo.colorDefault ?? '#6A6CFF';
  const cs = config.colorSecundario ?? '#ffffff';
  const ca = config.colorAccento ?? '#FF6B6B';
  const tf = config.tipografia ?? 'Poppins';
  const previewFont = config.plantillaId === 'moda' ? 'Poppins' : tf;
  const urbanoPreviewProducts = demo.products.map((product, index) => ({
    ...product,
    imagenUrl: URBANO_PREVIEW_ASSETS[index % URBANO_PREVIEW_ASSETS.length],
  }));
  const catalogMaxPrice = useMemo(() => {
    const max = Math.max(...demo.products.map(product => Number(product.precioOriginal || product.precioUnitario || 0)), 0);
    return Math.max(100, Math.ceil(max / 100) * 100);
  }, [demo.products]);
  useEffect(() => {
    setCatalogPriceRange([0, catalogMaxPrice]);
    setCatalogSelectedCategories([]);
    setCatalogSelectedBrands([]);
    setCatalogSearch('');
    setCatalogSortBy('relevance');
  }, [catalogMaxPrice, demo.storeName]);
  const urbanoPreviewCategories = demo.categories
    .filter((category) => category !== 'Todos')
    .map((category, index) => ({
      nombre: category,
      imagenUrl: URBANO_PREVIEW_ASSETS[(index + 4) % URBANO_PREVIEW_ASSETS.length],
    }));
  const modaCatalogProducts = useMemo(() => modaPreviewProducts(demo.products), [demo.products]);
  const modaVisibleProducts = useMemo(() => {
    return sortModaProducts(modaCatalogProducts.filter((product) => modaFilterMatches(product, modaFilters)), modaSort);
  }, [modaCatalogProducts, modaFilters, modaSort]);
  const toggleModaFilter = (key: string, value: string) => {
    setModaFilters((current) => ({
      ...current,
      [key]: current[key] === value ? '' : value,
    }));
  };
  const diseno = {
    ...config,
    colorPrimario: cp,
    colorSecundario: cs,
    colorAccento: ca,
    tipografia: tf,
    ...(config.plantillaId === 'urbano'
      ? {
        urbanoHeroImg: '/assets/templates/urbano/banner.png',
        urbanoBottomBannerImg: '/assets/templates/urbano/wear.png',
        urbanoShopTheLookImg: '/assets/templates/urbano/shoplook.png',
        urbanoFeatureModelImg: '/assets/templates/urbano/jacket.png',
        urbanoGallery1: '/assets/templates/urbano/coleccion2.png',
        urbanoGallery2: '/assets/templates/urbano/coleccion3.png',
        urbanoGallery3: '/assets/templates/urbano/coleccion4.png',
        urbanoGallery4: '/assets/templates/urbano/coleccion5.png',
        urbanoGallery5: '/assets/templates/urbano/coleccion6.png',
      }
      : {}),
    ...(config.plantillaId === 'falcon'
      ? {
        falconHeroBannerUrl: '/assets/templates/falcon/banner1.png',
        falconSideOneBannerUrl: '/assets/templates/falcon/banner2.png',
        falconSideTwoBannerUrl: '/assets/templates/falcon/banner3.png',
        falconSpecialBannerUrl: '/assets/templates/falcon/silla.png',
        falconSpecialTitle: 'Silla Gamer RGB Reclinable',
        falconBannerImageUrl: '/assets/templates/falcon/ahorros.png',
        falconCountdownBannerUrl: '/assets/templates/falcon/apurate.png',
      }
      : {}),
  };
  const previewTemplateOwnsShell =
    config.plantillaId === 'urbano' ||
    config.plantillaId === 'tecnologia' ||
    config.plantillaId === 'maye' ||
    config.plantillaId === 'apicultura' ||
    config.plantillaId === 'construccion' ||
    config.plantillaId === 'falcon';
  const previewStore = {
    nombre: demo.storeName,
    nombreComercial: demo.storeName,
    razonSocial: demo.storeName,
    slogan: demo.slogan,
    logo: '',
    diseno,
  };
  const previewCategories = demo.categories
    .filter(category => category !== 'Todos')
    .map(nombre => ({ nombre }));
  const catalogBrands = useMemo(() => {
    const names = demo.products
      .map(product => typeof product.marca === 'string' ? product.marca : product.marca?.nombre)
      .filter(Boolean)
      .map(String);
    return Array.from(new Set(names)).map(nombre => ({ nombre }));
  }, [demo.products]);
  const catalogSortedProducts = useMemo(() => {
    const query = catalogSearch.trim().toLowerCase();
    const filtered = demo.products.filter(product => {
      const category = typeof product.categoria === 'string' ? product.categoria : product.categoria?.nombre || '';
      const brand = typeof product.marca === 'string' ? product.marca : product.marca?.nombre || '';
      const price = Number(product.precioUnitario || 0);
      const matchesCategory = catalogSelectedCategories.length === 0 || catalogSelectedCategories.includes(category);
      const matchesBrand = catalogSelectedBrands.length === 0 || catalogSelectedBrands.includes(brand);
      const matchesPrice = price >= catalogPriceRange[0] && price <= catalogPriceRange[1];
      const matchesSearch = !query || `${product.descripcion} ${category} ${brand}`.toLowerCase().includes(query);
      return matchesCategory && matchesBrand && matchesPrice && matchesSearch;
    });
    if (catalogSortBy === 'price-asc') return filtered.sort((a, b) => Number(a.precioUnitario || 0) - Number(b.precioUnitario || 0));
    if (catalogSortBy === 'price-desc') return filtered.sort((a, b) => Number(b.precioUnitario || 0) - Number(a.precioUnitario || 0));
    if (catalogSortBy === 'name-asc') return filtered.sort((a, b) => String(a.descripcion || '').localeCompare(String(b.descripcion || '')));
    return filtered;
  }, [catalogPriceRange, catalogSearch, catalogSelectedBrands, catalogSelectedCategories, catalogSortBy, demo.products]);
  const hasCatalogFilters =
    !!catalogSearch ||
    catalogSelectedCategories.length > 0 ||
    catalogSelectedBrands.length > 0 ||
    catalogPriceRange[0] > 0 ||
    catalogPriceRange[1] < catalogMaxPrice;
  const toggleCatalogCategory = (name: string) => {
    setCatalogSelectedCategories(current => current.includes(name) ? current.filter(item => item !== name) : [...current, name]);
  };
  const toggleCatalogBrand = (name: string) => {
    setCatalogSelectedBrands(current => current.includes(name) ? current.filter(item => item !== name) : [...current, name]);
  };

  const goToProduct = (p: DemoProduct) => {
    setSelectedProduct(p);
    setPage('producto');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const goToPage = (p: PreviewPage) => {
    setPage(p);
    try {
      const params = new URLSearchParams(window.location.search);
      params.set('page', p);
      window.history.replaceState(null, '', `${window.location.pathname}?${params.toString()}`);
    } catch { }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const goToFirstProduct = () => {
    const product = selectedProduct || demo.products[0];
    if (product) goToProduct(product);
  };
  const previewNavigate = (to: string) => {
    const target = String(to || '');
    const productId = target.match(/\/producto\/([^/?#]+)/)?.[1];
    if (productId) {
      const product = demo.products.find(item => String(item.id) === String(productId));
      if (product) goToProduct(product);
      return;
    }
    if (target.includes('/checkout')) {
      goToPage('checkout');
      return;
    }
    if (target.includes('/contacto') || target.includes('/contact')) {
      goToPage('contacto');
      return;
    }
    if (target.includes('/catalogo')) {
      goToPage('catalogo');
      return;
    }
    goToPage('home');
  };

  const addToCart = (p: DemoProduct) => {
    setCarrito(prev => {
      const existing = prev.find(item => item.id === p.id);
      if (existing) {
        return prev.map(item => item.id === p.id ? { ...item, cantidad: item.cantidad + 1 } : item);
      }
      return [...prev, { ...p, cantidad: 1 }];
    });
    setIsCartOpen(true);
  };

  const actualizarCantidad = (id: number | string, cantidad: number) => {
    if (cantidad <= 0) {
      setCarrito(prev => prev.filter(item => item.id !== id));
    } else {
      setCarrito(prev => prev.map(item => item.id === id ? { ...item, cantidad } : item));
    }
  };
  const goToPreviewCheckout = () => {
    setIsCartOpen(false);
    goToPage('checkout');
  };

  return (
    <div className="overflow-x-clip" style={{ fontFamily: `'${previewFont}', sans-serif`, background: cs, minHeight: '100vh', color: '#111' }}>

      {/* Admin preview bar */}
      <div className="fixed left-0 right-0 top-0 z-50 flex items-center justify-between gap-2 px-3 py-2 text-xs font-semibold text-white sm:px-5" style={{ background: '#0d1117' }}>
        <div className="flex min-w-0 items-center gap-2">
          <Icon icon="solar:eye-bold" className="text-sm" />
          <span className="shrink-0">MODO PREVIEW</span>
          <span className="opacity-30">·</span>
          <span className="truncate opacity-60">{config.rubroNombre ?? 'Tienda Demo'}</span>
          <span className="hidden opacity-30 sm:inline">·</span>
          <span className="hidden opacity-40 sm:inline">Plantilla: {config.plantillaId ?? 'gadgets'}</span>
          <span className="hidden opacity-30 sm:inline">·</span>
          <span className="shrink-0 rounded bg-white/10 px-2 py-0.5 text-white/80">
            {page === 'home' ? 'Inicio' : page === 'catalogo' ? 'Catálogo' : page === 'checkout' ? 'Checkout' : page === 'contacto' ? 'Contacto' : page === 'blog' ? 'Blog' : 'Detalle de Producto'}
          </span>
          <div className="ml-2 hidden items-center gap-1 md:flex">
            {([
              ['home', 'Inicio'],
              ['catalogo', 'Catálogo'],
              ['producto', 'Detalle'],
              ...(config.plantillaId === 'falcon' ? [['blog', 'Blog'] as const] : []),
              ['checkout', 'Checkout'],
              ['contacto', 'Contacto'],
            ] as const).map(([target, label]) => (
              <button
                key={target}
                type="button"
                onClick={() => target === 'producto' ? goToFirstProduct() : goToPage(target)}
                className={`rounded-md px-2 py-0.5 transition-colors ${page === target ? 'bg-white text-[#0d1117]' : 'bg-white/10 text-white/70 hover:bg-white/20 hover:text-white'}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          {page !== 'home' && (
            <button onClick={() => goToPage(page === 'producto' ? 'catalogo' : 'home')} className="flex items-center gap-1.5 rounded-lg bg-white/10 px-2 py-1 transition-colors hover:bg-white/20 sm:px-3">
              <Icon icon="solar:alt-arrow-left-bold" />
              <span className="hidden sm:inline">Volver</span>
            </button>
          )}
          <button onClick={() => window.close()} className="flex items-center gap-1.5 rounded-lg bg-white/10 px-2 py-1 transition-colors hover:bg-white/20 sm:px-3">
            <Icon icon="solar:close-circle-bold" />
            <span className="hidden sm:inline">Cerrar</span>
          </button>
        </div>
      </div>

      <div style={{ paddingTop: 36 }}>
        {config.plantillaId === 'autopartes' ? (
          page !== 'checkout' ? (
            <AutopartesHeader
              tienda={{ nombre: demo.storeName, logo: '' }}
              slug="preview"
              cp={cp}
              carritoSize={carrito.reduce((sum, item) => sum + item.cantidad, 0)}
              onOpenCart={() => setIsCartOpen(true)}
              searchQuery=""
              setSearchQuery={() => { }}
              onSearchSubmit={(e, value) => { e.preventDefault(); goToPage('catalogo'); }}
              allCategories={demo.categories.filter(c => c !== 'Todos')}
            />
          ) : null
        ) : config.plantillaId === 'moda' ? (
          page !== 'checkout' ? (
            <ModaHeader
              tienda={{ nombre: demo.storeName, logo: '' }}
              slug="preview"
              cp={cp}
              carritoSize={carrito.reduce((sum, item) => sum + item.cantidad, 0)}
              onOpenCart={() => setIsCartOpen(true)}
              searchQuery=""
              setSearchQuery={() => { }}
              onSearchSubmit={(e) => { e.preventDefault(); goToPage('catalogo'); }}
              allCategories={demo.categories.filter(c => c !== 'Todos')}
            />
          ) : null
        ) : previewTemplateOwnsShell ? (
          null // These templates render their own header/footer shell.
        ) : (
          <PreviewHeader demo={demo} cp={cp} cartCount={carrito.reduce((sum, item) => sum + item.cantidad, 0)} currentPage={page} onNav={goToPage} activeCategory={activeCategory} onSelectCategory={setActiveCategory} />
        )}

        {isCartOpen && (
          config.plantillaId === 'tecnologia' || config.plantillaId === 'maye' || config.plantillaId === 'apicultura' || config.plantillaId === 'construccion' || config.plantillaId === 'falcon' || (config.plantillaId === 'urbano' && page === 'home') ? (
            null
          ) : config.plantillaId === 'moda' ? (
            <ModaCartModal
              isOpen={isCartOpen}
              carrito={carrito}
              tienda={{ nombre: demo.storeName }}
              setCarrito={setCarrito}
              onClose={() => setIsCartOpen(false)}
              actualizarCantidad={actualizarCantidad}
              onCheckout={() => { setIsCartOpen(false); goToPage('checkout'); }}
            />
          ) : config.plantillaId === 'urbano' ? (
            <UrbanoCartModal
              isOpen={isCartOpen}
              carrito={carrito}
              tienda={{ nombre: demo.storeName }}
              setCarrito={setCarrito}
              onClose={() => setIsCartOpen(false)}
              actualizarCantidad={actualizarCantidad}
              onCheckout={() => { setIsCartOpen(false); goToPage('checkout'); }}
            />
          ) : (
            <AutopartesCartModal
              isOpen={isCartOpen}
              cp={cp}
              carrito={carrito}
              setCarrito={setCarrito}
              onClose={() => setIsCartOpen(false)}
              actualizarCantidad={actualizarCantidad}
              onCheckout={() => { setIsCartOpen(false); goToPage('checkout'); }}
            />
          )
        )}

        {page === 'home' && config.plantillaId === 'autopartes' ? (
          <div className="bg-[#FAF5F5]">
            <div className="w-full max-w-7xl mx-auto px-4 xl:px-8 py-8 md:py-10">
              <AutopartesHero cp={cp} slug="preview" diseno={diseno} productos={demo.products.slice(0, 3)} />
              <AutopartesFeaturedCategories cp={cp} slug="preview" />
              <div className="mt-8 mb-16">
                <AutopartesPromoBanners cp={cp} slug="preview" />
              </div>
            </div>
            <section className="w-full max-w-7xl mx-auto px-4 xl:px-8 py-16">
              <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-6">
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className="flex gap-[3px]">
                      <div className="w-4 h-0.5 transform -skew-x-[30deg]" style={{ backgroundColor: cp }}></div>
                      <div className="w-4 h-0.5 transform -skew-x-[30deg]" style={{ backgroundColor: cp }}></div>
                    </div>
                    <span className="text-sm font-bold" style={{ color: cp }}>Producto Destacado</span>
                  </div>
                  <h2 className="text-3xl md:text-4xl font-black text-gray-900 tracking-tight">
                    Productos por Categoría
                  </h2>
                </div>

                <div className="flex flex-wrap md:flex-nowrap items-center gap-3">
                  <div className="flex flex-col flex-1 min-w-[160px]">
                    <span className="text-[10px] text-gray-500 font-bold mb-1 ml-1">Categoría Principal</span>
                    <div className="bg-white border border-gray-200 rounded px-3 py-2 flex items-center justify-between cursor-pointer hover:border-gray-300 transition-colors">
                      <span className="text-xs font-bold text-gray-700">Motor y Rendimiento</span>
                      <Icon icon="solar:alt-arrow-down-linear" className="text-gray-400" />
                    </div>
                  </div>
                  <div className="flex flex-col flex-1 min-w-[140px]">
                    <span className="text-[10px] text-gray-500 font-bold mb-1 ml-1">Sub Categoría</span>
                    <div className="bg-white border border-gray-200 rounded px-3 py-2 flex items-center justify-between cursor-pointer hover:border-gray-300 transition-colors">
                      <span className="text-xs font-bold text-gray-700">Todas las Piezas</span>
                      <Icon icon="solar:alt-arrow-down-linear" className="text-gray-400" />
                    </div>
                  </div>
                  <div className="flex flex-col justify-end mt-2 md:mt-0 md:h-[50px] w-full md:w-auto">
                    <button className="h-[34px] bg-[#1A1A1A] text-white px-5 rounded text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-black transition-colors md:mt-auto">
                      <Icon icon="solar:magnifer-linear" />
                      Buscar
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {demo.products.slice(0, 8).map(product => (
                  <ProductCardAutopartes
                    key={product.id}
                    producto={product}
                    slug="preview"
                    diseno={diseno}
                    onAddToCart={() => {
                      addToCart(product);
                    }}
                  />
                ))}
              </div>
            </section>

            <section className="w-full max-w-7xl mx-auto px-4 xl:px-8 pb-16">
              <AutopartesTrendingProducts
                cp={cp}
                slug="preview"
                productos={[...demo.products].reverse()}
                diseno={diseno}
                onAddToCart={(p) => {
                  addToCart(p);
                }}
              />
            </section>

            <AutopartesDealsOfTheWeek cp={cp} slug="preview" productos={demo.products} />
            <AutopartesBrands cp={cp} slug="preview" />

            <div className="bg-[#FAF5F5]">
              <AutopartesTopSelling cp={cp} />
            </div>
          </div>
        ) : page === 'home' && config.plantillaId === 'moda' ? (
          <div className="w-full bg-[#FAF9F6] text-[14px]">
            <ModaHero cp={cp} slug="preview" diseno={diseno} productos={demo.products.slice(0, 3)} />
            <ModaBestSelling slug="preview" cp={cp} productos={demo.products} genero="hombre" titulo="Más vendidos hombre" />
            <ModaBestSelling slug="preview" cp={cp} productos={demo.products} genero="mujer" titulo="Más vendidos mujer" offset={10} />
            <ModaHomeSections slug="preview" productos={demo.products} />
          </div>
        ) : page === 'home' && config.plantillaId === 'urbano' ? (
          <UrbanoHomePage
            slug="preview"
            tienda={previewStore}
            productos={urbanoPreviewProducts}
            allCategories={urbanoPreviewCategories}
            cp={cp}
            diseno={diseno}
            carrito={carrito}
            setCarrito={setCarrito}
            mostrarCarrito={isCartOpen}
            setMostrarCarrito={setIsCartOpen}
            agregarAlCarrito={addToCart}
            actualizarCantidad={actualizarCantidad}
            loading={false}
          />
        ) : page === 'home' && config.plantillaId === 'tecnologia' ? (
          <TecnologiaLayout
            tienda={previewStore}
            slug="preview"
            productos={demo.products}
            allCategories={previewCategories}
            cp={cp}
            diseno={diseno}
            carrito={carrito}
            setCarrito={setCarrito}
            mostrarCarrito={isCartOpen}
            setMostrarCarrito={setIsCartOpen}
            agregarAlCarrito={addToCart}
            actualizarCantidad={actualizarCantidad}
            loading={false}
          />
        ) : page === 'home' && config.plantillaId === 'maye' ? (
          <MayeLayout
            tienda={previewStore}
            slug="preview"
            productos={demo.products}
            allCategories={previewCategories}
            cp={cp}
            diseno={diseno}
            carrito={carrito}
            setCarrito={setCarrito}
            mostrarCarrito={isCartOpen}
            setMostrarCarrito={setIsCartOpen}
            agregarAlCarrito={addToCart}
            actualizarCantidad={actualizarCantidad}
            loading={false}
          />
        ) : page === 'home' && config.plantillaId === 'apicultura' ? (
          <ApiculturaHomePage
            tienda={previewStore}
            slug="preview"
            productos={demo.products}
            allCategories={previewCategories}
            cp={cp}
            diseno={diseno}
            carrito={carrito}
            setCarrito={setCarrito}
            mostrarCarrito={isCartOpen}
            setMostrarCarrito={setIsCartOpen}
            agregarAlCarrito={addToCart}
            actualizarCantidad={actualizarCantidad}
            loading={false}
          />
        ) : page === 'home' && config.plantillaId === 'construccion' ? (
          <ConstruccionHomePage
            tienda={previewStore}
            slug="preview"
            productos={demo.products}
            allCategories={previewCategories}
            cp={cp}
            diseno={diseno}
            carrito={carrito}
            setCarrito={setCarrito}
            mostrarCarrito={isCartOpen}
            setMostrarCarrito={setIsCartOpen}
            agregarAlCarrito={addToCart}
            actualizarCantidad={actualizarCantidad}
            loading={false}
          />
        ) : page === 'home' && config.plantillaId === 'falcon' ? (
          <FalconHomePage
            tienda={previewStore}
            slug="preview"
            productos={demo.products}
            allCategories={previewCategories}
            cp={cp}
            diseno={diseno}
            carrito={carrito}
            setCarrito={setCarrito}
            mostrarCarrito={isCartOpen}
            setMostrarCarrito={setIsCartOpen}
            agregarAlCarrito={addToCart}
            actualizarCantidad={actualizarCantidad}
            loading={false}
          />
        ) : page === 'home' ? (
          <HomePage demo={demo} cp={cp} diseno={diseno} onNav={goToPage} onProduct={goToProduct} onAddToCart={() => addToCart(demo.products[0])} />
        ) : null}
        {page === 'blog' && config.plantillaId === 'falcon' && (
          <FalconBlogView
            tienda={previewStore}
            slug="preview"
            carrito={carrito}
            mostrarCarrito={isCartOpen}
            setMostrarCarrito={setIsCartOpen}
            actualizarCantidad={actualizarCantidad}
            allCategories={previewCategories}
            previewMode
            onNavigate={goToPage}
          />
        )}
        {page === 'catalogo' && (
          config.plantillaId === 'autopartes' ? (
            <AutopartesCatalog demo={demo} cp={cp} onProduct={goToProduct} onAddToCart={addToCart} />
          ) : config.plantillaId === 'moda' ? (
            <div className="w-full min-h-screen bg-white pb-16 text-black">
              <div className="mx-auto max-w-[1720px] px-5 pb-10 pt-6 md:px-10 lg:px-16">
                <nav className="mb-12 text-[11px] text-neutral-500">
                  <button onClick={() => goToPage('home')} className="hover:text-black">Inicio</button>
                  <span className="mx-2">/</span>
                  <span>Más vendidos hombre</span>
                </nav>

                <header className="mx-auto mb-14 max-w-[760px] text-center">
                  <h1 className="text-[36px] font-medium lowercase leading-none tracking-[-0.055em] md:text-[54px]">
                    más vendidos hombre
                  </h1>
                  <p className="mt-8 text-[14px] leading-6 text-black">
                    Explora nuestras prendas favoritas: camisas destacadas, pantalones wide-leg, casacas y esenciales urbanos para todos los días.
                  </p>
                </header>

                <div className="grid gap-8 lg:grid-cols-[255px_1fr] lg:gap-10">
                  <aside className="hidden lg:block">
                    <div className="sticky top-[180px]">
                      <h2 className="mb-5 text-[24px] font-normal lowercase tracking-[-0.04em]">filtros</h2>
                      <div className="border-t border-neutral-300">
                        {MODA_FILTER_GROUPS.map((filter) => (
                          <div key={filter.key} className="border-b border-neutral-300">
                            <button
                              type="button"
                              onClick={() => setModaOpenFilter(modaOpenFilter === filter.key ? null : filter.key)}
                              className="flex h-[64px] w-full items-center justify-between text-left text-[13px] font-semibold"
                            >
                              {filter.label}
                              <Icon icon={modaOpenFilter === filter.key ? 'solar:alt-arrow-up-linear' : 'solar:alt-arrow-down-linear'} width={16} />
                            </button>
                            {modaOpenFilter === filter.key && (
                              <div className="space-y-3 pb-5 text-[13px]">
                                {filter.options.map((option) => (
                                  <button
                                    key={option}
                                    type="button"
                                    onClick={() => toggleModaFilter(filter.key, option)}
                                    className={`block text-left ${modaFilters[filter.key] === option ? 'font-black text-black' : 'text-neutral-600 hover:text-black'}`}
                                  >
                                    {option}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                      {Object.values(modaFilters).some(Boolean) && (
                        <button onClick={() => setModaFilters({})} className="mt-6 text-[12px] font-semibold underline underline-offset-4">
                          Limpiar filtros
                        </button>
                      )}
                    </div>
                  </aside>

                  <section className="min-w-0">
                    <div className="mb-9 flex items-center justify-between gap-4">
                      <button
                        onClick={() => setShowFilters(true)}
                        className="inline-flex items-center gap-2 border border-neutral-300 px-4 py-2 text-[13px] font-medium lg:hidden"
                      >
                        filtros
                        <Icon icon="solar:filter-linear" width={16} />
                      </button>
                      <p className="hidden text-[12px] text-black lg:block">{modaVisibleProducts.length} productos</p>
                      <label className="ml-auto inline-flex items-center gap-2 text-[12px]">
                        <span className="text-neutral-500">Ordenar por</span>
                        <select value={modaSort} onChange={(event) => setModaSort(event.target.value)} className="bg-transparent pr-5 text-[12px] font-medium outline-none">
                          <option value="relevancia">Más relevante</option>
                          <option value="precio-asc">Precio menor a mayor</option>
                          <option value="precio-desc">Precio mayor a menor</option>
                          <option value="nombre">Nombre A-Z</option>
                        </select>
                      </label>
                    </div>

                    <div className="grid grid-cols-2 gap-x-7 gap-y-16 md:grid-cols-3 xl:grid-cols-4 xl:gap-x-9 xl:gap-y-20">
                      {modaVisibleProducts.map((product, index) => {
                        const price = Number(product.precioUnitario || 0);
                        const original = Number(product.precioOriginal || product.precioUnitario || 0);
                        const saving = original > price ? original - price : [10.1, 18, 9, 8, 16.1, 44.88, 14, 25][index % 8];
                        return (
                          <article key={product.id} className="group text-center">
                            <button type="button" onClick={() => goToProduct(product)} className="relative block w-full text-left">
                              <span className="absolute left-2 top-0 z-10 rounded-[2px] bg-black px-2 py-1 text-[11px] font-black uppercase leading-none tracking-[0.06em] text-white">
                                AHORRA S/ {saving.toFixed(2)}
                              </span>
                              <div className="aspect-[0.82] w-full overflow-hidden bg-white">
                                <img
                                  src={product.imagenUrl}
                                  alt={product.descripcion}
                                  className="h-full w-full object-cover object-top transition-transform duration-700 group-hover:scale-[1.025]"
                                />
                              </div>
                            </button>
                            <button type="button" onClick={() => goToProduct(product)} className="mt-9 block w-full text-center">
                              <p className="text-[10px] font-black uppercase tracking-[0.22em]">{product.marca || 'VENDIFY'}</p>
                              <h3 className="mx-auto mt-3 line-clamp-1 max-w-[270px] text-[14px] font-normal leading-6 text-black">
                                {product.descripcion}
                              </h3>
                              <div className="mt-1 flex items-center justify-center gap-2 text-[14px] font-normal">
                                <span>S/ {price.toFixed(2)}</span>
                                {original > price && <span className="text-neutral-400 line-through">S/ {original.toFixed(2)}</span>}
                              </div>
                              <p className="mt-4 text-[13px] text-neutral-500">
                                {product.coloresDisponibles || 1} {(product.coloresDisponibles || 1) === 1 ? 'color disponible' : 'colores disponibles'}
                              </p>
                            </button>
                          </article>
                        );
                      })}
                    </div>
                    {modaVisibleProducts.length === 0 && (
                      <div className="py-20 text-center">
                        <p className="text-[18px] font-semibold">No hay productos con esos filtros.</p>
                        <button onClick={() => setModaFilters({})} className="mt-4 h-11 bg-black px-8 text-[13px] font-semibold text-white">
                          Limpiar filtros
                        </button>
                      </div>
                    )}
                  </section>
                </div>

                {showFilters && (
                  <div className="fixed inset-0 z-[200] lg:hidden">
                    <div className="absolute inset-0 bg-black/40" onClick={() => setShowFilters(false)} />
                    <div className="absolute bottom-0 left-0 right-0 bg-white p-5 shadow-2xl">
                      <div className="mb-5 flex items-center justify-between">
                        <span className="text-[24px] font-medium lowercase">filtros</span>
                        <button onClick={() => setShowFilters(false)}>
                          <Icon icon="solar:close-circle-linear" width={28} />
                        </button>
                      </div>
                      <div className="border-t border-neutral-300">
                        {MODA_FILTER_GROUPS.map((filter) => (
                          <div key={filter.key} className="border-b border-neutral-300">
                            <button
                              type="button"
                              onClick={() => setModaOpenFilter(modaOpenFilter === filter.key ? null : filter.key)}
                              className="flex h-[58px] w-full items-center justify-between text-[13px] font-semibold"
                            >
                              {filter.label}
                              <Icon icon={modaOpenFilter === filter.key ? 'solar:alt-arrow-up-linear' : 'solar:alt-arrow-down-linear'} width={16} />
                            </button>
                            {modaOpenFilter === filter.key && (
                              <div className="space-y-3 pb-5">
                                {filter.options.map((option) => (
                                  <button
                                    key={option}
                                    type="button"
                                    onClick={() => toggleModaFilter(filter.key, option)}
                                    className={`block text-left text-[13px] ${modaFilters[filter.key] === option ? 'font-black text-black' : 'text-neutral-600'}`}
                                  >
                                    {option}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                      <button onClick={() => setShowFilters(false)} className="mt-6 h-11 w-full bg-black text-[13px] font-semibold text-white">
                        Ver {modaVisibleProducts.length} productos
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : config.plantillaId === 'urbano' ? (
            <UrbanoCatalogPage
              slug="preview"
              tienda={previewStore}
              cp={cp}
              productos={catalogSortedProducts}
              total={catalogSortedProducts.length}
              loading={false}
              allCategorias={urbanoPreviewCategories}
              allMarcas={catalogBrands}
              selectedCategorias={catalogSelectedCategories}
              setSelectedCategorias={setCatalogSelectedCategories}
              selectedMarcas={catalogSelectedBrands}
              setSelectedMarcas={setCatalogSelectedBrands}
              priceRange={catalogPriceRange}
              setPriceRange={setCatalogPriceRange}
              minPrice={0}
              maxPrice={catalogMaxPrice}
              sortBy={catalogSortBy}
              setSortBy={setCatalogSortBy}
              search={catalogSearch}
              setSearch={setCatalogSearch}
              hasActiveFilters={hasCatalogFilters}
              carritoSize={carrito.reduce((sum, item) => sum + Number(item.cantidad || 1), 0)}
              onOpenCart={() => setIsCartOpen(true)}
              onAddToCart={addToCart}
              onProduct={goToProduct}
            />
          ) : config.plantillaId === 'tecnologia' ? (
            <TecnologiaCatalogoPage
              tienda={previewStore}
              slug="preview"
              diseno={diseno}
              cp={cp}
              navigate={previewNavigate}
              productos={demo.products}
              sortedProductos={catalogSortedProducts}
              loading={false}
              total={demo.products.length}
              page={1}
              cargarProductos={() => { }}
              allCategorías={previewCategories}
              allMarcas={catalogBrands}
              filteredMarcas={catalogBrands}
              selectedCategorías={catalogSelectedCategories}
              setSelectedCategorías={setCatalogSelectedCategories}
              selectedMarcas={catalogSelectedBrands}
              setSelectedMarcas={setCatalogSelectedBrands}
              priceRange={catalogPriceRange}
              setPriceRange={setCatalogPriceRange}
              minPrice={0}
              maxPrice={catalogMaxPrice}
              sortBy={catalogSortBy}
              setSortBy={setCatalogSortBy}
              hasActiveFilters={hasCatalogFilters}
              toggleCategory={toggleCatalogCategory}
              toggleBrand={toggleCatalogBrand}
              search={catalogSearch}
              setSearch={setCatalogSearch}
              carrito={carrito}
              setCarrito={setCarrito}
              mostrarCarrito={isCartOpen}
              setMostrarCarrito={setIsCartOpen}
              actualizarCantidad={actualizarCantidad}
              irACheckout={goToPreviewCheckout}
              handleAgregarProducto={addToCart}
              agregarAlCarritoDirecto={(producto) => addToCart(producto)}
              showMobileFilters={showMobileFilters}
              setShowMobileFilters={setShowMobileFilters}
              showPersonalizarModal={showPersonalizarModal}
              setShowPersonalizarModal={setShowPersonalizarModal}
              productoAPersonalizar={productoAPersonalizar}
              setProductoAPersonalizar={setProductoAPersonalizar}
              modificadoresProducto={[]}
            />
          ) : config.plantillaId === 'maye' ? (
            <MayeCatalogoPage
              tienda={previewStore}
              slug="preview"
              diseno={diseno}
              cp={cp}
              navigate={previewNavigate}
              productos={demo.products}
              sortedProductos={catalogSortedProducts}
              loading={false}
              total={demo.products.length}
              page={1}
              cargarProductos={() => { }}
              allCategorías={previewCategories}
              allMarcas={catalogBrands}
              filteredMarcas={catalogBrands}
              selectedCategorías={catalogSelectedCategories}
              setSelectedCategorías={setCatalogSelectedCategories}
              selectedMarcas={catalogSelectedBrands}
              setSelectedMarcas={setCatalogSelectedBrands}
              priceRange={catalogPriceRange}
              setPriceRange={setCatalogPriceRange}
              minPrice={0}
              maxPrice={catalogMaxPrice}
              sortBy={catalogSortBy}
              setSortBy={setCatalogSortBy}
              hasActiveFilters={hasCatalogFilters}
              toggleCategory={toggleCatalogCategory}
              toggleBrand={toggleCatalogBrand}
              search={catalogSearch}
              setSearch={setCatalogSearch}
              carrito={carrito}
              setCarrito={setCarrito}
              mostrarCarrito={isCartOpen}
              setMostrarCarrito={setIsCartOpen}
              actualizarCantidad={actualizarCantidad}
              irACheckout={goToPreviewCheckout}
              handleAgregarProducto={addToCart}
              agregarAlCarritoDirecto={(producto) => addToCart(producto)}
              showMobileFilters={showMobileFilters}
              setShowMobileFilters={setShowMobileFilters}
              showPersonalizarModal={showPersonalizarModal}
              setShowPersonalizarModal={setShowPersonalizarModal}
              productoAPersonalizar={productoAPersonalizar}
              setProductoAPersonalizar={setProductoAPersonalizar}
              modificadoresProducto={[]}
            />
          ) : config.plantillaId === 'apicultura' ? (
            <ApiculturaCatalogoPage
              tienda={previewStore}
              slug="preview"
              diseno={diseno}
              cp={cp}
              navigate={previewNavigate}
              productos={demo.products}
              sortedProductos={catalogSortedProducts}
              loading={false}
              total={demo.products.length}
              page={1}
              cargarProductos={() => { }}
              allCategorías={previewCategories}
              allMarcas={catalogBrands}
              filteredMarcas={catalogBrands}
              selectedCategorías={catalogSelectedCategories}
              setSelectedCategorías={setCatalogSelectedCategories}
              selectedMarcas={catalogSelectedBrands}
              setSelectedMarcas={setCatalogSelectedBrands}
              priceRange={catalogPriceRange}
              setPriceRange={setCatalogPriceRange}
              minPrice={0}
              maxPrice={catalogMaxPrice}
              sortBy={catalogSortBy}
              setSortBy={setCatalogSortBy}
              hasActiveFilters={hasCatalogFilters}
              toggleCategory={toggleCatalogCategory}
              toggleBrand={toggleCatalogBrand}
              search={catalogSearch}
              setSearch={setCatalogSearch}
              carrito={carrito}
              setCarrito={setCarrito}
              mostrarCarrito={isCartOpen}
              setMostrarCarrito={setIsCartOpen}
              actualizarCantidad={actualizarCantidad}
              irACheckout={goToPreviewCheckout}
              handleAgregarProducto={addToCart}
              agregarAlCarritoDirecto={(producto) => addToCart(producto)}
              showMobileFilters={showMobileFilters}
              setShowMobileFilters={setShowMobileFilters}
              showPersonalizarModal={showPersonalizarModal}
              setShowPersonalizarModal={setShowPersonalizarModal}
              productoAPersonalizar={productoAPersonalizar}
              setProductoAPersonalizar={setProductoAPersonalizar}
              modificadoresProducto={[]}
            />
          ) : config.plantillaId === 'construccion' ? (
            <ConstruccionCatalogoPage
              tienda={previewStore}
              slug="preview"
              diseno={diseno}
              cp={cp}
              navigate={previewNavigate}
              productos={demo.products}
              sortedProductos={catalogSortedProducts}
              loading={false}
              total={demo.products.length}
              page={1}
              cargarProductos={() => { }}
              allCategorías={previewCategories}
              allMarcas={catalogBrands}
              filteredMarcas={catalogBrands}
              selectedCategorías={catalogSelectedCategories}
              setSelectedCategorías={setCatalogSelectedCategories}
              selectedMarcas={catalogSelectedBrands}
              setSelectedMarcas={setCatalogSelectedBrands}
              priceRange={catalogPriceRange}
              setPriceRange={setCatalogPriceRange}
              minPrice={0}
              maxPrice={catalogMaxPrice}
              sortBy={catalogSortBy}
              setSortBy={setCatalogSortBy}
              hasActiveFilters={hasCatalogFilters}
              toggleCategory={toggleCatalogCategory}
              toggleBrand={toggleCatalogBrand}
              search={catalogSearch}
              setSearch={setCatalogSearch}
              carrito={carrito}
              setCarrito={setCarrito}
              mostrarCarrito={isCartOpen}
              setMostrarCarrito={setIsCartOpen}
              actualizarCantidad={actualizarCantidad}
              irACheckout={goToPreviewCheckout}
              handleAgregarProducto={addToCart}
              agregarAlCarritoDirecto={(producto) => addToCart(producto)}
              showMobileFilters={showMobileFilters}
              setShowMobileFilters={setShowMobileFilters}
              showPersonalizarModal={showPersonalizarModal}
              setShowPersonalizarModal={setShowPersonalizarModal}
              productoAPersonalizar={productoAPersonalizar}
              setProductoAPersonalizar={setProductoAPersonalizar}
              modificadoresProducto={[]}
            />
          ) : config.plantillaId === 'falcon' ? (
            <FalconCatalogoPage
              tienda={previewStore}
              slug="preview"
              diseno={diseno}
              cp={cp}
              navigate={previewNavigate}
              productos={demo.products}
              sortedProductos={catalogSortedProducts}
              loading={false}
              total={demo.products.length}
              page={1}
              cargarProductos={() => { }}
              allCategorías={previewCategories}
              allMarcas={catalogBrands}
              filteredMarcas={catalogBrands}
              selectedCategorías={catalogSelectedCategories}
              setSelectedCategorías={setCatalogSelectedCategories}
              selectedMarcas={catalogSelectedBrands}
              setSelectedMarcas={setCatalogSelectedBrands}
              priceRange={catalogPriceRange}
              setPriceRange={setCatalogPriceRange}
              minPrice={0}
              maxPrice={catalogMaxPrice}
              sortBy={catalogSortBy}
              setSortBy={setCatalogSortBy}
              hasActiveFilters={hasCatalogFilters}
              toggleCategory={toggleCatalogCategory}
              toggleBrand={toggleCatalogBrand}
              search={catalogSearch}
              setSearch={setCatalogSearch}
              carrito={carrito}
              setCarrito={setCarrito}
              mostrarCarrito={isCartOpen}
              setMostrarCarrito={setIsCartOpen}
              actualizarCantidad={actualizarCantidad}
              irACheckout={goToPreviewCheckout}
              handleAgregarProducto={addToCart}
              agregarAlCarritoDirecto={(producto) => addToCart(producto)}
              showMobileFilters={showMobileFilters}
              setShowMobileFilters={setShowMobileFilters}
              showPersonalizarModal={showPersonalizarModal}
              setShowPersonalizarModal={setShowPersonalizarModal}
              productoAPersonalizar={productoAPersonalizar}
              setProductoAPersonalizar={setProductoAPersonalizar}
              modificadoresProducto={[]}
            />
          ) : (
            <CatalogoPage demo={demo} cp={cp} onProduct={goToProduct} onAddToCart={() => { }} />
          )
        )}

        {page === 'contacto' && (
          config.plantillaId === 'apicultura' ? (
            <ApiculturaContactPage
              tienda={previewStore}
              slug="preview"
              diseno={diseno}
              cp={cp}
              allCategories={previewCategories}
              carrito={carrito}
              setCarrito={setCarrito}
              mostrarCarrito={isCartOpen}
              setMostrarCarrito={setIsCartOpen}
              actualizarCantidad={actualizarCantidad}
              onNavigate={goToPage}
            />
          ) : config.plantillaId === 'construccion' ? (
            <ConstruccionContactPage
              tienda={previewStore}
              slug="preview"
              diseno={diseno}
              cp={cp}
              allCategories={previewCategories}
              carrito={carrito}
              setCarrito={setCarrito}
              mostrarCarrito={isCartOpen}
              setMostrarCarrito={setIsCartOpen}
              actualizarCantidad={actualizarCantidad}
              onNavigate={goToPage}
            />
          ) : (
            <div className="mx-auto max-w-4xl px-6 py-24 text-center">
              <h1 className="text-4xl font-black text-gray-950">Contacto</h1>
              <p className="mt-3 text-sm font-semibold text-gray-500">Vista de contacto disponible para esta plantilla.</p>
            </div>
          )
        )}

        {page === 'producto' && selectedProduct && (
          config.plantillaId === 'urbano' ? (
            <UrbanoProductoPreviewPage producto={selectedProduct} demo={demo} cp={cp} diseno={diseno} onNav={goToPage} onProduct={goToProduct} onAddToCart={() => addToCart(selectedProduct)} />
          ) : config.plantillaId === 'tecnologia' ? (
            <TecnologiaProductoPreviewPage
              producto={selectedProduct}
              demo={demo}
              cp={cp}
              diseno={diseno}
              carrito={carrito}
              setCarrito={setCarrito}
              mostrarCarrito={isCartOpen}
              setMostrarCarrito={setIsCartOpen}
              actualizarCantidad={actualizarCantidad}
              onNav={goToPage}
              onProduct={goToProduct}
              onAddToCart={addToCart}
            />
          ) : config.plantillaId === 'maye' ? (
            <MayeProductoPreviewPage
              producto={selectedProduct}
              demo={demo}
              cp={cp}
              diseno={diseno}
              carrito={carrito}
              setCarrito={setCarrito}
              mostrarCarrito={isCartOpen}
              setMostrarCarrito={setIsCartOpen}
              actualizarCantidad={actualizarCantidad}
              onNav={goToPage}
              onProduct={goToProduct}
              onAddToCart={addToCart}
            />
          ) : config.plantillaId === 'apicultura' ? (
            <ApiculturaProductoPreviewPage
              producto={selectedProduct}
              demo={demo}
              cp={cp}
              diseno={diseno}
              carrito={carrito}
              setCarrito={setCarrito}
              mostrarCarrito={isCartOpen}
              setMostrarCarrito={setIsCartOpen}
              actualizarCantidad={actualizarCantidad}
              onNav={goToPage}
              onProduct={goToProduct}
              onAddToCart={addToCart}
            />
          ) : config.plantillaId === 'construccion' ? (
            <ConstruccionProductoDetalleView
              tienda={previewStore}
              slug="preview"
              producto={selectedProduct}
              related={demo.products.filter((item) => item.id !== selectedProduct.id).slice(0, 4)}
              allCategories={previewCategories}
              carrito={carrito}
              setCarrito={setCarrito}
              mostrarCarrito={isCartOpen}
              setMostrarCarrito={setIsCartOpen}
              actualizarCantidad={actualizarCantidad}
              onNavigate={goToPage}
              onAddToCart={addToCart}
            />
          ) : config.plantillaId === 'falcon' ? (
            <FalconProductoDetalleView
              tienda={previewStore}
              slug="preview"
              producto={selectedProduct}
              related={demo.products.filter((item) => item.id !== selectedProduct.id).slice(0, 5)}
              allCategories={previewCategories}
              carrito={carrito}
              setCarrito={setCarrito}
              mostrarCarrito={isCartOpen}
              setMostrarCarrito={setIsCartOpen}
              actualizarCantidad={actualizarCantidad}
              onNavigate={goToPage}
              onAddToCart={addToCart}
            />
          ) : config.plantillaId === 'moda' ? (
            <ModaProductoPreviewPage producto={selectedProduct} demo={demo} cp={cp} diseno={diseno} onNav={goToPage} onProduct={goToProduct} onAddToCart={() => addToCart(selectedProduct)} />
          ) : (
            <ProductoPage producto={selectedProduct} demo={demo} cp={cp} diseno={diseno} onNav={goToPage} onProduct={goToProduct} onAddToCart={() => addToCart(selectedProduct)} />
          )
        )}
        {page === 'checkout' && (
          config.plantillaId === 'moda' ? (
            <ModaCheckoutPage
              slug="preview"
              tienda={{ nombre: demo.storeName, diseno }}
              diseno={diseno}
              cp={cp}
              pedidoCreado={null}
              carritoState={carrito}
              setCarritoState={setCarrito}
              formData={{}}
              erroresForm={{}}
              handleChange={() => { }}
              configPago={{ aceptaEfectivo: true, aceptaTarjeta: true, culqiPublicKey: 'pk_test' }}
              configEnvio={{ aceptaEnvio: true, costoEnvio: 15 }}
              enviando={false}
              search=""
              setSearch={() => { }}
              searchResults={[]}
              suggestedProducts={[]}
              updateQuantity={actualizarCantidad}
              removeItem={(id) => actualizarCantidad(id, 0)}
              calcularSubtotal={() => carrito.reduce((sum, item) => sum + item.precioUnitario * item.cantidad, 0)}
              calcularCostoEnvio={() => 15}
              calcularTotal={() => carrito.reduce((sum, item) => sum + item.precioUnitario * item.cantidad, 0) + 15}
              onSubmit={() => alert('¡Compra completada en modo demo!')}
              onAddToCart={addToCart}
              freeDeliveryThreshold={0}
              freeDeliveryRemaining={0}
              freeDeliveryProgress={0}
              showConfirmModal={false}
              setShowConfirmModal={() => { }}
              showPaymentModal={false}
              setShowPaymentModal={() => { }}
              enviarPedido={async () => { alert('Pedido Enviado Demo'); }}
            />
          ) : config.plantillaId === 'autopartes' ? (
            <AutopartesCheckout
              slug="preview"
              tienda={{ nombre: demo.storeName, diseno }}
              carrito={carrito}
              formData={{}}
              erroresForm={{}}
              configPago={{ aceptaEfectivo: true, aceptaTarjeta: true, culqiPublicKey: 'pk_test' }}
              configEnvio={{ aceptaEnvio: true, costoEnvio: 15 }}
              enviando={false}
              search=""
              setSearch={() => { }}
              searchResults={[]}
              suggestedProducts={[]}
              handleChange={() => { }}
              updateQuantity={actualizarCantidad}
              removeItem={(id) => actualizarCantidad(id, 0)}
              calcularSubtotal={() => carrito.reduce((sum, item) => sum + item.precioUnitario * item.cantidad, 0)}
              calcularCostoEnvio={() => 15}
              calcularTotal={() => carrito.reduce((sum, item) => sum + item.precioUnitario * item.cantidad, 0) + 15}
              onSubmit={() => alert('¡Compra completada en modo demo!')}
              onAddToCart={addToCart}
              freeDeliveryThreshold={0}
              freeDeliveryRemaining={0}
              freeDeliveryProgress={0}
            />
          ) : config.plantillaId === 'urbano' ? (
            <UrbanoCheckoutPage
              slug="preview"
              tienda={{ nombre: demo.storeName, diseno }}
              diseno={diseno}
              cp={cp}
              pedidoCreado={null}
              carritoState={carrito}
              setCarritoState={setCarrito}
              formData={{}}
              erroresForm={{}}
              handleChange={() => { }}
              configPago={{ aceptaEfectivo: true, aceptaTarjeta: true, culqiPublicKey: 'pk_test' }}
              configEnvio={{ aceptaEnvio: true, costoEnvio: 15 }}
              enviando={false}
              search=""
              setSearch={() => { }}
              searchResults={[]}
              suggestedProducts={[]}
              updateQuantity={actualizarCantidad}
              removeItem={(id) => actualizarCantidad(id, 0)}
              calcularSubtotal={() => carrito.reduce((sum, item) => sum + item.precioUnitario * item.cantidad, 0)}
              calcularCostoEnvio={() => 15}
              calcularTotal={() => carrito.reduce((sum, item) => sum + item.precioUnitario * item.cantidad, 0) + 15}
              onSubmit={() => alert('¡Compra completada en modo demo!')}
              onAddToCart={addToCart}
              freeDeliveryThreshold={0}
              freeDeliveryRemaining={0}
              freeDeliveryProgress={0}
              showConfirmModal={false}
              setShowConfirmModal={() => { }}
              showPaymentModal={false}
              setShowPaymentModal={() => { }}
              enviarPedido={async () => { alert('Pedido Enviado Demo'); }}
            />
          ) : config.plantillaId === 'tecnologia' ? (
            <TecnologiaCheckoutPage
              slug="preview"
              tienda={previewStore}
              diseno={diseno}
              cp={cp}
              pedidoCreado={null}
              carritoState={carrito}
              setCarritoState={setCarrito}
              formData={{}}
              erroresForm={{}}
              handleChange={() => { }}
              configPago={{ aceptaEfectivo: true, aceptaTarjeta: true, culqiPublicKey: 'pk_test' }}
              configEnvio={{ aceptaEnvio: true, costoEnvio: 15 }}
              enviando={false}
              search=""
              setSearch={() => { }}
              searchResults={[]}
              suggestedProducts={demo.products.slice(0, 4)}
              updateQuantity={actualizarCantidad}
              removeItem={(id) => actualizarCantidad(id, 0)}
              calcularSubtotal={() => carrito.reduce((sum, item) => sum + item.precioUnitario * item.cantidad, 0)}
              calcularCostoEnvio={() => 15}
              calcularTotal={() => carrito.reduce((sum, item) => sum + item.precioUnitario * item.cantidad, 0) + 15}
              onSubmit={() => alert('¡Compra completada en modo demo!')}
              onAddToCart={addToCart}
              freeDeliveryThreshold={0}
              freeDeliveryRemaining={0}
              freeDeliveryProgress={0}
              showConfirmModal={false}
              setShowConfirmModal={() => { }}
              showPaymentModal={false}
              setShowPaymentModal={() => { }}
              enviarPedido={async () => { alert('Pedido Enviado Demo'); }}
            />
          ) : config.plantillaId === 'maye' ? (
            <MayeCheckoutPage
              slug="preview"
              tienda={previewStore}
              diseno={diseno}
              cp={cp}
              pedidoCreado={null}
              carritoState={carrito}
              setCarritoState={setCarrito}
              formData={{}}
              erroresForm={{}}
              handleChange={() => { }}
              configPago={{ aceptaEfectivo: true, aceptaTarjeta: true, culqiPublicKey: 'pk_test' }}
              configEnvio={{ aceptaEnvio: true, costoEnvio: 15 }}
              enviando={false}
              search=""
              setSearch={() => { }}
              searchResults={[]}
              suggestedProducts={demo.products.slice(0, 4)}
              updateQuantity={actualizarCantidad}
              removeItem={(id) => actualizarCantidad(id, 0)}
              calcularSubtotal={() => carrito.reduce((sum, item) => sum + item.precioUnitario * item.cantidad, 0)}
              calcularCostoEnvio={() => 15}
              calcularTotal={() => carrito.reduce((sum, item) => sum + item.precioUnitario * item.cantidad, 0) + 15}
              onSubmit={() => alert('¡Compra completada en modo demo!')}
              onAddToCart={addToCart}
              freeDeliveryThreshold={0}
              freeDeliveryRemaining={0}
              freeDeliveryProgress={0}
              showConfirmModal={false}
              setShowConfirmModal={() => { }}
              showPaymentModal={false}
              setShowPaymentModal={() => { }}
              enviarPedido={async () => { alert('Pedido Enviado Demo'); }}
            />
          ) : config.plantillaId === 'apicultura' ? (
            <ApiculturaCheckoutPage
              slug="preview"
              tienda={previewStore}
              diseno={diseno}
              cp={cp}
              pedidoCreado={null}
              carritoState={carrito}
              setCarritoState={setCarrito}
              formData={{}}
              erroresForm={{}}
              handleChange={() => { }}
              configPago={{ aceptaEfectivo: true, aceptaTarjeta: true, aceptaYape: true, aceptaPlin: true, culqiPublicKey: 'pk_test' }}
              configEnvio={{ aceptaEnvio: true, aceptaRecojo: true, costoEnvio: 15 }}
              enviando={false}
              search=""
              setSearch={() => { }}
              searchResults={[]}
              suggestedProducts={demo.products.slice(0, 4)}
              updateQuantity={actualizarCantidad}
              removeItem={(id) => actualizarCantidad(id, 0)}
              calcularSubtotal={() => carrito.reduce((sum, item) => sum + item.precioUnitario * item.cantidad, 0)}
              calcularCostoEnvio={() => 15}
              calcularTotal={() => carrito.reduce((sum, item) => sum + item.precioUnitario * item.cantidad, 0) + 15}
              onSubmit={() => alert('¡Compra completada en modo demo!')}
              onAddToCart={addToCart}
              freeDeliveryThreshold={0}
              freeDeliveryRemaining={0}
              freeDeliveryProgress={0}
              showConfirmModal={false}
              setShowConfirmModal={() => { }}
              showPaymentModal={false}
              setShowPaymentModal={() => { }}
              enviarPedido={async () => { alert('Pedido Enviado Demo'); }}
            />
          ) : config.plantillaId === 'construccion' ? (
            <ConstruccionCheckoutPage
              slug="preview"
              tienda={previewStore}
              diseno={diseno}
              cp={cp}
              pedidoCreado={null}
              carritoState={carrito}
              setCarritoState={setCarrito}
              formData={{}}
              erroresForm={{}}
              handleChange={() => { }}
              configPago={{ aceptaEfectivo: true, aceptaTarjeta: true, aceptaYape: true, aceptaPlin: true, culqiPublicKey: 'pk_test' }}
              configEnvio={{ aceptaEnvio: true, aceptaRecojo: true, costoEnvio: 15 }}
              enviando={false}
              search=""
              setSearch={() => { }}
              searchResults={[]}
              suggestedProducts={demo.products.slice(0, 4)}
              updateQuantity={actualizarCantidad}
              removeItem={(id) => actualizarCantidad(id, 0)}
              calcularSubtotal={() => carrito.reduce((sum, item) => sum + item.precioUnitario * item.cantidad, 0)}
              calcularCostoEnvio={() => 15}
              calcularTotal={() => carrito.reduce((sum, item) => sum + item.precioUnitario * item.cantidad, 0) + 15}
              onSubmit={() => alert('¡Compra completada en modo demo!')}
              onAddToCart={addToCart}
              freeDeliveryThreshold={0}
              freeDeliveryRemaining={0}
              freeDeliveryProgress={0}
              showConfirmModal={false}
              setShowConfirmModal={() => { }}
              showPaymentModal={false}
              setShowPaymentModal={() => { }}
              enviarPedido={async () => { alert('Pedido Enviado Demo'); }}
            />
          ) : config.plantillaId === 'falcon' ? (
            <FalconCheckoutPage
              slug="preview"
              tienda={previewStore}
              diseno={diseno}
              cp={cp}
              pedidoCreado={null}
              carritoState={carrito}
              setCarritoState={setCarrito}
              formData={{ tipoEntrega: 'ENVIO', medioPago: 'YAPE', clienteNombre: '', clienteTelefono: '', clienteEmail: '', clienteDireccion: '', clienteReferencia: '', observaciones: '' }}
              erroresForm={{}}
              handleChange={() => { }}
              configPago={{ aceptaEfectivo: true, aceptaTarjeta: true, yapeNumero: '999999999', plinNumero: '999999999', culqiPublicKey: 'pk_test' }}
              configEnvio={{ aceptaEnvio: true, aceptaRecojo: true, costoEnvio: 15 }}
              enviando={false}
              search=""
              setSearch={() => { }}
              searchResults={[]}
              suggestedProducts={demo.products.slice(0, 4)}
              updateQuantity={actualizarCantidad}
              removeItem={(id) => actualizarCantidad(id, 0)}
              calcularSubtotal={() => carrito.reduce((sum, item) => sum + item.precioUnitario * item.cantidad, 0)}
              calcularCostoEnvio={() => 15}
              calcularTotal={() => carrito.reduce((sum, item) => sum + item.precioUnitario * item.cantidad, 0) + 15}
              onSubmit={() => alert('¡Compra completada en modo demo!')}
              onAddToCart={addToCart}
              freeDeliveryThreshold={0}
              freeDeliveryRemaining={0}
              freeDeliveryProgress={0}
              showConfirmModal={false}
              setShowConfirmModal={() => { }}
              showPaymentModal={false}
              setShowPaymentModal={() => { }}
              enviarPedido={async () => { alert('Pedido Enviado Demo'); }}
            />
          ) : (
            <div className="py-20 text-center font-bold text-gray-500">Checkout Preview (Generic)</div>
          )
        )}

        {/* Footer on home/catalogo pages */}
        {config.plantillaId === 'autopartes' ? (
          page !== 'checkout' && <AutopartesFooter tienda={null} slug="preview" diseno={diseno} />
        ) : config.plantillaId === 'moda' ? (
          page !== 'checkout' && <ModaFooter tiendaNombre={demo.storeName} />
        ) : previewTemplateOwnsShell ? (
          null // These templates render their own footer.
        ) : page !== 'producto' && (
          <footer className="py-10 border-t border-gray-100" style={{ background: '#fafafa' }}>
            <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white font-black text-xs" style={{ background: cp }}>
                  {demo.storeName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <p className="font-black text-gray-900 text-sm">{demo.storeName}<span style={{ color: cp }}>.</span></p>
                  <p className="text-[11px] text-gray-400">{demo.slogan}</p>
                </div>
              </div>
              <p className="text-xs text-gray-400">© {new Date().getFullYear()} {demo.storeName} · Powered by <strong className="text-gray-600">{BRAND.name}</strong></p>
            </div>
          </footer>
        )}
      </div>
    </div>
  );
}
