import { useNavigate } from 'react-router-dom';
import type { ReactNode } from 'react';

interface ModaHomeSectionsProps {
  slug: string;
  productos: any[];
  diseno?: any;
}

type ProductSeed = [string, string, number, number, string];
type CollectionSeed = [string, string];

const trendCards: CollectionSeed[] = [
  ['Tops', 'https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?auto=format&fit=crop&q=90&w=900'],
  ['Jeans', 'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?auto=format&fit=crop&q=90&w=900'],
  ['Joggers', 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&q=90&w=900'],
  ['Hoodies', 'https://images.unsplash.com/photo-1552374196-1ab2a1c593e8?auto=format&fit=crop&q=90&w=900'],
];

const styleCards: CollectionSeed[] = [
  ['Acubi', 'https://images.unsplash.com/photo-1496747611176-843222e1e57c?auto=format&fit=crop&q=90&w=900'],
  ['Goth', 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&q=90&w=900'],
  ['Distressed', 'https://images.unsplash.com/photo-1520975954732-35dd22299614?auto=format&fit=crop&q=90&w=900'],
  ['Básicos', 'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&q=90&w=900'],
  ['Wide-leg', 'https://images.unsplash.com/photo-1552374196-1ab2a1c593e8?auto=format&fit=crop&q=90&w=900'],
];

const collectionCards: CollectionSeed[] = [
  ['Vestidos', 'https://images.unsplash.com/photo-1469334031218-e382a71b716b?auto=format&fit=crop&q=90&w=900'],
  ['Pantalones', 'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?auto=format&fit=crop&q=90&w=900'],
  ['Tops', 'https://images.unsplash.com/photo-1485968579580-b6d095142e6e?auto=format&fit=crop&q=90&w=900'],
  ['Sets', 'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?auto=format&fit=crop&q=90&w=900'],
  ['Polos', 'https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?auto=format&fit=crop&q=90&w=900'],
  ['Abrigos', 'https://images.unsplash.com/photo-1512316609839-ce289d3eba0a?auto=format&fit=crop&q=90&w=900'],
  ['Cardigans', 'https://images.unsplash.com/photo-1520975682031-a9c3f8e4f69a?auto=format&fit=crop&q=90&w=900'],
  ['Bolsos', 'https://images.unsplash.com/photo-1523170335258-f5ed11844a49?auto=format&fit=crop&q=90&w=900'],
];

const newArrivalFallback: ProductSeed[] = [
  ['Pantalon drapeado wide-leg', 'CURRI AND', 115.9, 138, 'https://images.unsplash.com/photo-1496747611176-843222e1e57c?auto=format&fit=crop&q=90&w=900'],
  ['Polera cropped con faux fur', 'BIGGOLD', 82.9, 82.9, 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&q=90&w=900'],
  ['Zapatillas low-top estrella', 'RIPSTAR', 198.9, 210, 'https://images.unsplash.com/photo-1608231387042-66d1773070a5?auto=format&fit=crop&q=90&w=900'],
  ['Zapatillas retro azul', 'RIPSTAR', 198.9, 210, 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&q=90&w=900'],
  ['Zapatilla plataforma blanca', 'FYSPR', 109.9, 130.28, 'https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?auto=format&fit=crop&q=90&w=900'],
  ['Chaqueta asimétrica negra', 'NOIR', 129.9, 151.1, 'https://images.unsplash.com/photo-1520975954732-35dd22299614?auto=format&fit=crop&q=90&w=900'],
  ['Hoodie tejido oscuro', 'VENDIFY', 89.9, 101, 'https://images.unsplash.com/photo-1552374196-1ab2a1c593e8?auto=format&fit=crop&q=90&w=900'],
  ['Falda satinada gris', 'ATELIER', 79.9, 92.9, 'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?auto=format&fit=crop&q=90&w=900'],
  ['Hoodie negro textured', 'DARK MODE', 98.9, 118.9, 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&q=90&w=900'],
  ['Trench coat urbano', 'VENDIFY', 189, 219, 'https://images.unsplash.com/photo-1512316609839-ce289d3eba0a?auto=format&fit=crop&q=90&w=900'],
];

function money(value: number | string | null | undefined) {
  return `S/ ${Number(value || 0).toFixed(2)}`;
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

function fallbackProducts() {
  return newArrivalFallback.map(([descripcion, marca, precioOferta, precioUnitario, imagenUrl], index) => ({
    id: `moda-new-demo-${index + 1}`,
    descripcion,
    marca,
    precioOferta,
    precioUnitario,
    imagenUrl,
    coloresDisponibles: (index % 3) + 1,
  }));
}

function useModaNavigation(slug: string) {
  const navigate = useNavigate();

  const goCatalog = (query?: string) => {
    if (slug === 'preview') {
      window.dispatchEvent(new CustomEvent('preview-nav', { detail: 'catalogo' }));
      return;
    }
    navigate(query ? `/tienda/${slug}/catalogo?search=${encodeURIComponent(query)}` : `/tienda/${slug}/catalogo`);
  };

  const goProduct = (product: any) => {
    if (slug === 'preview') {
      window.dispatchEvent(new CustomEvent('preview-nav', { detail: 'catalogo' }));
      return;
    }
    if (String(product?.id || '').includes('demo')) {
      goCatalog('nuevos ingresos');
      return;
    }
    navigate(`/tienda/${slug}/producto/${product.id}`);
  };

  return { goCatalog, goProduct };
}

export default function ModaHomeSections({ slug, productos, diseno }: ModaHomeSectionsProps) {
  const { goCatalog, goProduct } = useModaNavigation(slug);
  const newProducts = [...(productos || []).slice(10, 20), ...fallbackProducts()].slice(0, 10);

  const activeTrendCards = trendCards.map(([title, image], i) => [
    diseno?.[`modaTrend${i + 1}Text`] || title,
    diseno?.[`modaTrend${i + 1}Image`] || image,
  ]);

  const activeStyleCards = styleCards.map(([title, image], i) => [
    diseno?.[`modaStyle${i + 1}Text`] || title,
    diseno?.[`modaStyle${i + 1}Image`] || image,
  ]);

  const activeCollectionCards = collectionCards.map(([title, image], i) => [
    diseno?.[`modaCollection${i + 1}Text`] || title,
    diseno?.[`modaCollection${i + 1}Image`] || image,
  ]);

  return (
    <div className="bg-white text-black">
      <ModaSectionShell title={diseno?.modaTrendsTitle || "En tendencia"}>
        <div className="grid grid-cols-1 gap-7 sm:grid-cols-2 lg:grid-cols-4">
          {activeTrendCards.map(([title, image]) => (
            <button
              type="button"
              key={title}
              onClick={() => goCatalog(title)}
              className="group relative aspect-[0.8] overflow-hidden rounded-[4px] bg-neutral-100 text-white"
            >
              <img src={image} alt={title} className="h-full w-full object-cover object-top transition-transform duration-700 group-hover:scale-[1.035]" />
              <span className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-black/5" />
              <span className="absolute inset-x-4 bottom-12 text-center text-[34px] font-black uppercase leading-none tracking-[-0.04em] md:text-[40px]">
                {title}
              </span>
            </button>
          ))}
        </div>
      </ModaSectionShell>

      <ModaProductGrid
        title="Nuevos ingresos"
        products={newProducts}
        onProduct={goProduct}
        onViewMore={() => goCatalog('nuevos ingresos')}
      />

      <section className="px-5 py-12 md:px-10 lg:px-16">
        <div className="mx-auto max-w-[1800px]">
          <div className="mb-9 flex justify-center">
            <button
              type="button"
              onClick={() => goCatalog('nuevos ingresos')}
              className="h-[54px] min-w-[215px] bg-black px-10 text-[14px] font-black uppercase tracking-[0.18em] text-white transition-colors hover:bg-neutral-800"
            >
              Nuevos ingresos
            </button>
          </div>
          <h2 className="text-[25px] font-black uppercase leading-none tracking-[-0.035em] md:text-[33px]">
            {diseno?.modaStylesTitle || "Elige tu estilo"}
          </h2>
          <div className="mt-8 grid grid-cols-2 gap-7 md:grid-cols-3 lg:grid-cols-5">
            {activeStyleCards.map(([title, image]) => (
              <button
                type="button"
                key={title}
                onClick={() => goCatalog(title)}
                className="group relative aspect-[0.78] overflow-hidden rounded-[7px] bg-neutral-100 text-white"
              >
                <img src={image} alt={title} className="h-full w-full object-cover object-top transition-transform duration-700 group-hover:scale-[1.035]" />
                <span className="absolute inset-0 bg-gradient-to-t from-black/42 via-black/5 to-transparent" />
                <span className="absolute inset-x-3 bottom-9 text-center text-[30px] font-black uppercase leading-none tracking-[-0.04em] md:text-[38px]">
                  {title}
                </span>
              </button>
            ))}
          </div>
        </div>
      </section>

      <ModaSectionShell title={diseno?.modaCollectionsTitle || "Colecciones destacadas"}>
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {activeCollectionCards.map(([title, image]) => (
            <button
              type="button"
              key={title}
              onClick={() => goCatalog(title)}
              className="group relative aspect-[0.78] overflow-hidden rounded-[4px] bg-neutral-100 text-white"
            >
              <img src={image} alt={title} className="h-full w-full object-cover object-top transition-transform duration-700 group-hover:scale-[1.035]" />
              <span className="absolute inset-0 bg-black/18 transition-colors group-hover:bg-black/28" />
              <span className="absolute inset-x-3 bottom-16 text-center text-[34px] font-light lowercase leading-none tracking-[-0.04em] md:text-[42px]">
                {title}
              </span>
              <span className="absolute inset-x-3 bottom-10 text-center text-[12px] font-black uppercase tracking-[0.18em]">
                Explorar
              </span>
            </button>
          ))}
        </div>
      </ModaSectionShell>
    </div>
  );
}

function ModaSectionShell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="px-5 py-10 md:px-10 lg:px-16">
      <div className="mx-auto max-w-[1800px]">
        <h2 className="text-[25px] font-black uppercase leading-none tracking-[-0.035em] md:text-[33px]">
          {title}
        </h2>
        <div className="mt-7 h-px w-full bg-black" />
        <div className="mt-8">{children}</div>
      </div>
    </section>
  );
}

function ModaProductGrid({
  title,
  products,
  onProduct,
  onViewMore,
}: {
  title: string;
  products: any[];
  onProduct: (product: any) => void;
  onViewMore: () => void;
}) {
  return (
    <section className="px-5 py-10 md:px-10 lg:px-16">
      <div className="mx-auto max-w-[1800px]">
        <h2 className="text-[25px] font-black uppercase leading-none tracking-[-0.035em] md:text-[33px]">
          {title}
        </h2>
        <div className="mt-7 h-px w-full bg-black" />
        <div className="mt-8 grid grid-cols-2 gap-x-5 gap-y-16 md:grid-cols-3 lg:grid-cols-5 lg:gap-x-10 lg:gap-y-20">
          {products.map((product, index) => {
            const titleText = getTitle(product);
            const price = getPrice(product);
            const original = getOriginalPrice(product);
            const saving = original > price ? original - price : [22.1, 11.1, 11.1, 20.38, 13, 9.9, 18, 12.5, 7.5, 14][index] || 10;
            const colors = Number(product?.coloresDisponibles || product?.variantes?.length || ((index % 3) + 1));

            return (
              <article key={product?.id || index} className="relative group text-center">
                <button
                  type="button"
                  onClick={() => onProduct(product)}
                  className="relative block w-full bg-white text-left"
                >
                  <span className="absolute left-3 top-[-10px] z-50 rounded-[2px] bg-black px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.08em] text-white">
                    SAVE ${saving.toFixed(2)}
                  </span>
                  <div className="relative aspect-[0.74] w-full overflow-hidden">
                    <span className="absolute inset-x-4 bottom-0 z-10 flex h-14 translate-y-5 items-center justify-center border border-black/10 bg-white text-[14px] font-medium opacity-0 shadow-sm transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
                      Vista rápida
                    </span>
                    <img
                      src={getModaImage(product, fallbackProducts()[index % 10].imagenUrl)}
                      alt={titleText}
                      className="h-full w-full object-cover object-top transition-transform duration-700 group-hover:scale-[1.025]"
                    />
                  </div>
                </button>

                <button type="button" onClick={() => onProduct(product)} className="mt-8 block w-full text-center">
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-black">{getBrand(product)}</p>
                  <h3 className="mx-auto mt-3 line-clamp-2 max-w-[280px] text-[14px] font-medium leading-[1.35] text-[#161616]">
                    {titleText}
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
            onClick={onViewMore}
            className="h-12 min-w-[168px] bg-black px-9 text-[13px] font-black uppercase tracking-[0.12em] text-white transition-colors hover:bg-neutral-800"
          >
            Ver más
          </button>
        </div>
      </div>
    </section>
  );
}
