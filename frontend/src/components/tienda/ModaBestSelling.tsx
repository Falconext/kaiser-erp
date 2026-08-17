import { Icon } from '@iconify/react';
import { useNavigate } from 'react-router-dom';

interface ModaBestSellingProps {
  diseno?: any;
  slug: string;
  cp: string;
  productos: any[];
  genero?: 'hombre' | 'mujer';
  titulo?: string;
  offset?: number;
}

const hombreFallback: Array<[string, string, number, number, string]> = [
  ['Camisa corset lace-up', 'PLM', 66.8, 76.9, 'https://images.unsplash.com/photo-1507680434567-5739c80be1ac?auto=format&fit=crop&q=90&w=900'],
  ['Conjunto saco y pantalon arena', 'ARGUE CULTURE', 81.8, 99.8, 'https://images.unsplash.com/photo-1516257984-b1b4d707412e?auto=format&fit=crop&q=90&w=900'],
  ['Camisa satinada soft glow', 'PLM', 64.8, 73.9, 'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&q=90&w=900'],
  ['Pantalon wide-leg con franja', 'ISIETS', 52.8, 60.9, 'https://images.unsplash.com/photo-1552374196-1ab2a1c593e8?auto=format&fit=crop&q=90&w=900'],
  ['Botin chunky suela alta', 'HXS', 64.9, 72.9, 'https://images.unsplash.com/photo-1608231387042-66d1773070a5?auto=format&fit=crop&q=90&w=900'],
  ['Camisa cafe relaxed fit', 'DARK MODE', 79.9, 111, 'https://images.unsplash.com/photo-1542327897-d73f4005b533?auto=format&fit=crop&q=90&w=900'],
  ['Pantalon negro recto', 'STUDIO 91', 69.9, 81.46, 'https://images.unsplash.com/photo-1506629905607-d405b7a30db9?auto=format&fit=crop&q=90&w=900'],
  ['Camisa nocturna oversize', 'NOCHE', 89.9, 107.3, 'https://images.unsplash.com/photo-1520975682031-a9c3f8e4f69a?auto=format&fit=crop&q=90&w=900'],
  ['Pantalon sastre negro', 'ATELIER', 74.9, 81.9, 'https://images.unsplash.com/photo-1516826957135-700dedea698c?auto=format&fit=crop&q=90&w=900'],
  ['Casaca urbana minimal', 'VENDIFY', 129, 138, 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?auto=format&fit=crop&q=90&w=900'],
];

const mujerFallback: Array<[string, string, number, number, string]> = [
  ['Vestido slip etereo', 'JNYLON STUDIOS', 86.8, 96.8, 'https://images.unsplash.com/photo-1496747611176-843222e1e57c?auto=format&fit=crop&q=90&w=900'],
  ['Poleron high neck loose fit', 'CHICLARA', 54.8, 71.24, 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&q=90&w=900'],
  ['Abrigo funnel wool frost', 'SRYS', 159.9, 175.9, 'https://images.unsplash.com/photo-1485968579580-b6d095142e6e?auto=format&fit=crop&q=90&w=900'],
  ['Casaca denim militar dark', 'FLOWERS BIRDS MARKET', 155.8, 227, 'https://images.unsplash.com/photo-1520975954732-35dd22299614?auto=format&fit=crop&q=90&w=900'],
  ['Chaqueta leather retro color', 'DIDDI MODA', 159.9, 170.9, 'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&q=90&w=900'],
  ['Mini falda cuadros urbano', 'NUEVA LINEA', 48.9, 62.9, 'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?auto=format&fit=crop&q=90&w=900'],
  ['Beanie mostaza street', 'CHIC', 35.9, 53.87, 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=90&w=900'],
  ['Abrigo negro estructurado', 'ATELIER', 149, 171.9, 'https://images.unsplash.com/photo-1512316609839-ce289d3eba0a?auto=format&fit=crop&q=90&w=900'],
  ['Top negro con textura', 'NOIR', 69.9, 81.9, 'https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?auto=format&fit=crop&q=90&w=900'],
  ['Vestido largo noche', 'VENDIFY', 179, 198.1, 'https://images.unsplash.com/photo-1469334031218-e382a71b716b?auto=format&fit=crop&q=90&w=900'],
];

const generoKeywords = {
  hombre: ['hombre', 'caballero', 'varon', 'varón', 'men', 'masculino'],
  mujer: ['mujer', 'dama', 'women', 'femenino', 'vestido', 'falda', 'blusa'],
};

function buildFallback(genero: 'hombre' | 'mujer') {
  const source = genero === 'hombre' ? hombreFallback : mujerFallback;
  return source.map(([descripcion, marca, precioOferta, precioUnitario, imagenUrl], index) => ({
    id: `moda-${genero}-demo-${index + 1}`,
    descripcion,
    marca,
    precioOferta,
    precioUnitario,
    imagenUrl,
    coloresDisponibles: (index % 4) + 1,
  }));
}

function money(value: number | string | null | undefined) {
  const parsed = Number(value || 0);
  return `S/ ${parsed.toFixed(2)}`;
}

function getPrice(product: any) {
  return Number(product?.precioOferta || product?.precioVenta || product?.precioUnitario || product?.precio || 0);
}

function getOriginalPrice(product: any) {
  return Number(product?.precioRegular ?? product?.precioOriginal ?? product?.precioVenta ?? product?.precioUnitario ?? product?.precio ?? getPrice(product));
}

function getTitle(product: any) {
  return product?.descripcion || product?.nombre || 'Producto de moda';
}

function getBrand(product: any) {
  const brand = product?.marca || product?.brand;
  if (typeof brand === 'string') return brand;
  if (brand?.nombre) return brand.nombre;
  return 'VENDIFY';
}

function isPlaceholderImage(url: unknown) {
  const value = String(url || '').toLowerCase();
  return !value || value.includes('placehold.co') || value.includes('placeholder') || value.includes('dummyimage') || value.includes('text=');
}

function getModaImage(product: any, fallback: string) {
  const image = product?.imagenUrl || product?.imagen || product?.imageUrl;
  return isPlaceholderImage(image) ? fallback : image;
}

function normalizeText(value: unknown) {
  return String(value || '').toLowerCase();
}

function matchesGender(product: any, genero: 'hombre' | 'mujer') {
  const text = normalizeText([
    product?.descripcion,
    product?.nombre,
    product?.categoria,
    product?.categoriaNombre,
    product?.rubro,
    product?.marca,
  ].join(' '));
  return generoKeywords[genero].some((keyword) => text.includes(keyword));
}

function getSectionProducts(productos: any[], genero: 'hombre' | 'mujer', offset: number) {
  const fallback = buildFallback(genero);
  const matches = productos?.filter((product) => matchesGender(product, genero)) || [];
  const base = matches.length >= 5 ? matches : (productos || []).slice(offset, offset + 10);
  const selected = [...base, ...fallback].slice(0, 10);
  return selected;
}

function getSaving(product: any, index: number) {
  const price = getPrice(product);
  const original = getOriginalPrice(product);
  const saving = original > price ? original - price : [10, 16.44, 16, 71.2, 11, 14, 17.97, 22.9, 12, 19.1][index] || 9;
  return `SAVE $${saving.toFixed(2)}`;
}

export default function ModaBestSelling({ slug,
  productos,
  genero = 'hombre',
  titulo,
  offset = 0, diseno }: ModaBestSellingProps) {
  const navigate = useNavigate();
  const displayProducts = getSectionProducts(productos, genero, offset);
  const sectionTitle = titulo || (genero === 'hombre' ? 'Más vendidos hombre' : 'Más vendidos mujer');

  const goCatalog = () => {
    const query = genero === 'hombre' ? 'hombre' : 'mujer';
    if (slug === 'preview') {
      window.dispatchEvent(new CustomEvent('preview-nav', { detail: 'catalogo' }));
      return;
    }
    navigate(`/tienda/${slug}/catalogo?search=${encodeURIComponent(query)}`);
  };

  const goProduct = (product: any) => {
    if (slug === 'preview') {
      window.dispatchEvent(new CustomEvent('preview-nav', { detail: 'catalogo' }));
      return;
    }
    if (String(product?.id || '').includes('demo')) {
      goCatalog();
      return;
    }
    navigate(`/tienda/${slug}/producto/${product.id}`);
  };

  return (
    <section className="w-full bg-white px-5 py-8 text-black md:px-10 lg:px-16 lg:py-10">
      <div className="mx-auto max-w-[1800px]">
        <h2 className="text-[25px] font-black uppercase leading-none tracking-[-0.035em] md:text-[33px]">
          {sectionTitle}
        </h2>
        <div className="mt-7 h-px w-full bg-black" />

        <div className="mt-8 grid grid-cols-2 gap-x-5 gap-y-16 md:grid-cols-3 lg:grid-cols-5 lg:gap-x-10 lg:gap-y-20">
          {displayProducts.map((product, index) => {
            const title = getTitle(product);
            const brand = getBrand(product);
            const price = getPrice(product);
            const original = getOriginalPrice(product);
            const image = getModaImage(product, buildFallback(genero)[index % 10].imagenUrl);
            const colors = Number(product?.coloresDisponibles || product?.variantes?.length || ((index % 4) + 1));

            return (
              <article key={`${genero}-${product?.id || index}`} className="relative group text-center">
                <button
                  type="button"
                  onClick={() => goProduct(product)}
                  className="relative block w-full bg-white text-left"
                >
                  <span className="absolute left-3 top-[-10px] z-50 rounded-[2px] bg-black px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.08em] text-white">
                    {getSaving(product, index)}
                  </span>
                  <div className="relative aspect-[0.74] w-full overflow-hidden">
                    <span className="absolute inset-x-4 bottom-0 z-10 flex h-14 translate-y-5 items-center justify-center border border-black/10 bg-white text-[14px] font-medium opacity-0 shadow-sm transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
                      Vista rápida
                    </span>
                    <img
                      src={image}
                      alt={title}
                      className="h-full w-full object-cover object-top transition-transform duration-700 group-hover:scale-[1.025]"
                    />
                  </div>
                </button>

                <button type="button" onClick={() => goProduct(product)} className="mt-8 block w-full text-center">
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-black">{brand}</p>
                  <h3 className="mx-auto mt-3 line-clamp-2 max-w-[280px] text-[14px] font-medium leading-[1.35] text-[#161616]">
                    {title}
                  </h3>
                  <div className="mt-2 flex items-center justify-center gap-3 text-[14px] font-medium">
                    <span>{money(price)}</span>
                    {original > price && <span className="text-gray-400 line-through">{money(original)}</span>}
                  </div>
                  <p className="mt-5 text-[14px] text-neutral-500">
                    {colors} {colors === 1 ? 'color disponible' : 'colores disponibles'}
                  </p>
                </button>
              </article>
            );
          })}
        </div>

        <div className="mt-14 flex justify-center">
          <button
            type="button"
            onClick={goCatalog}
            className="h-12 min-w-[168px] bg-black px-9 text-[13px] font-black uppercase tracking-[0.12em] text-white transition-colors hover:bg-neutral-800"
          >
            Ver más
          </button>
        </div>
      </div>
    </section>
  );
}
