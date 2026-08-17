import React from 'react';
import { Icon } from '@iconify/react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { mayeCard, mayeHover, mayeSection, mayeStagger, mayeViewport } from '@/lib/motion/maye';

interface Props {
  cp: string;
  slug: string;
  diseno?: any;
  productos?: any[];
}

const parseOfferDate = (value: string | Date | null | undefined, endOfDay = false) => {
  if (!value) return null;
  if (value instanceof Date) return value;
  const raw = String(value);
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const [year, month, day] = raw.split('-').map(Number);
    return new Date(year, month - 1, day, endOfDay ? 23 : 0, endOfDay ? 59 : 0, endOfDay ? 59 : 0, endOfDay ? 999 : 0);
  }
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
};

const getPricing = (item: any) => {
  const now = new Date();
  const regular = Number(item.precioRegular ?? item.precioOriginal ?? item.precioUnitario ?? item.precioVenta ?? item.precio ?? 0);
  const offer = Number(item.precioOferta || 0);
  const start = parseOfferDate(item.fechaInicioOferta);
  const end = parseOfferDate(item.fechaFinOferta, true);
  const hasActiveOffer = offer > 0 && regular > 0 && offer < regular && (!start || start <= now) && (!end || end >= now);
  return {
    price: hasActiveOffer ? offer : Number(item.precioUnitario ?? item.precioVenta ?? item.precio ?? regular ?? 0),
    oldPrice: hasActiveOffer ? regular : 0,
  };
};

export default function MayeTopSelling({ cp, slug, diseno, productos = [] }: Props) {
  const navigate = useNavigate();
  const productImage = diseno?.mayeProductImageUrl || '/assets/templates/maye/componentes.png';
  const selectedProducts = Array.isArray(diseno?.mayeTopSellingProducts) ? diseno.mayeTopSellingProducts : productos;
  const productCategories = selectedProducts.length > 0
    ? [
      { title: diseno?.mayeCategory1Title || 'Top selección', items: selectedProducts.slice(0, 4) },
      { title: diseno?.mayeCategory2Title || 'Más vendidos', items: selectedProducts.slice(4, 8) },
      { title: diseno?.mayeCategory3Title || 'Recomendados', items: selectedProducts.slice(8, 12) },
    ].filter(cat => cat.items.length > 0)
    : [];
  const categories = productCategories.map(cat => ({
      title: cat.title,
      items: cat.items.map((item: any) => ({
        id: item.id,
        name: item.descripcion || item.nombre || 'Producto destacado',
        img: item.imagenUrl || productImage,
        ...getPricing(item),
        ratingAvg: Number(item.ratingAvg || 0),
        ratingCount: Number(item.ratingCount ?? item.reviewsCount ?? item.resenasCount ?? item.reviewCount ?? 0),
      })),
    }));

  if (categories.length === 0) return null;

  return (
    <motion.section className="w-full max-w-7xl mx-auto relative z-10 mb-20" variants={mayeSection} initial="initial" whileInView="animate" viewport={mayeViewport}>
      <motion.div className="flex flex-col items-center justify-center text-center mb-10" variants={mayeCard}>
        <div className="flex items-center gap-2 mb-2">
          <div className="flex gap-[3px]">
            <div className="w-3 h-0.5 transform -skew-x-[30deg]" style={{ backgroundColor: cp }}></div>
            <div className="w-3 h-0.5 transform -skew-x-[30deg]" style={{ backgroundColor: cp }}></div>
          </div>
          <span className="text-sm font-bold" style={{ color: cp }}>{diseno?.mayeTopSellingLabel || 'Top Ventas'}</span>
          <div className="flex gap-[3px]">
            <div className="w-3 h-0.5 transform -skew-x-[30deg]" style={{ backgroundColor: cp }}></div>
            <div className="w-3 h-0.5 transform -skew-x-[30deg]" style={{ backgroundColor: cp }}></div>
          </div>
        </div>
        
        <h2 className="text-3xl md:text-4xl font-black text-gray-900 tracking-tight mb-3">
          {diseno?.mayeTopSellingTitle || 'Productos Más Vendidos'}
        </h2>
        <p className="text-sm text-gray-500 max-w-xl">
          {diseno?.mayeTopSellingText || 'Explora nuestros productos más populares. ¡Equipa Tu Equipo con los favoritos!'}
        </p>
      </motion.div>

      <motion.div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 justify-center max-w-6xl mx-auto" variants={mayeStagger}>
        {categories.map((cat, idx) => (
          <motion.div key={idx} className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm flex flex-col" variants={mayeCard} whileHover={mayeHover}>
            <h3 className="text-lg font-black text-gray-900 mb-6 min-h-[56px]">{cat.title}</h3>
            
            <motion.div className="flex flex-col" variants={mayeStagger}>
              {cat.items.map((item: any, i: number) => {
                const oldPrice = Number((item as any).oldPrice || 0);
                const price = Number((item as any).price || 0);
                const ratingCount = Number((item as any).ratingCount || 0);
                const ratingAvg = ratingCount > 0 ? Number((item as any).ratingAvg || 0) : 0;
                const roundedRating = Math.round(ratingAvg);
                const isClickable = Boolean(item.id);
                const handleOpenProduct = () => {
                  if (!item.id) return;
                  slug === 'preview'
                    ? window.dispatchEvent(new CustomEvent('preview-nav', { detail: 'catalogo' }))
                    : navigate(`/tienda/${slug}/producto/${item.id}`);
                };

                return (
                <motion.div
                  key={item.id || i}
                  role={isClickable ? 'button' : undefined}
                  tabIndex={isClickable ? 0 : undefined}
                  onClick={handleOpenProduct}
                  onKeyDown={(event) => {
                    if (!isClickable) return;
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      handleOpenProduct();
                    }
                  }}
                  className={`flex items-center gap-4 py-4 ${isClickable ? 'cursor-pointer' : ''} ${i !== 3 ? 'border-b border-gray-100' : ''}`}
                  variants={mayeCard}
                  whileHover={isClickable ? { x: 4 } : undefined}
                >
                  <div className="w-20 h-20 rounded bg-gray-50 flex items-center justify-center shrink-0 border border-gray-100 p-2">
                    <img src={item.img} alt="thumb" className="w-full h-full object-contain mix-blend-multiply opacity-80" />
                  </div>
                  <div className="flex flex-col flex-1">
                    <div className="flex items-center gap-1 text-[10px] mb-1">
                      {ratingCount > 0 ? (
                        <>
                          <span className="flex text-[#F5B01D]">
                            {Array.from({ length: 5 }).map((_, index) => (
                              <Icon key={index} icon={index < roundedRating ? 'solar:star-bold' : 'solar:star-linear'} />
                            ))}
                          </span>
                          <span className="text-gray-400">({ratingCount})</span>
                        </>
                      ) : (
                        <span className="text-gray-400">Sin reseñas</span>
                      )}
                    </div>
                    <h4 className="text-sm font-bold text-gray-900 leading-tight mb-2 line-clamp-2">
                      {item.name}
                    </h4>
                    <div className="flex items-baseline gap-2">
                      {oldPrice > price && <span className="text-xs font-bold text-gray-400 line-through">S/ {oldPrice.toFixed(2)}</span>}
                      <span className="text-sm font-black" style={{ color: cp }}>S/ {price.toFixed(2)}</span>
                    </div>
                  </div>
                </motion.div>
              )})}
            </motion.div>
          </motion.div>
        ))}
      </motion.div>

    </motion.section>
  );
}
