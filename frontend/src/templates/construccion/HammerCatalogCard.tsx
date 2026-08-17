import { Icon } from '@iconify/react';
import { motion } from 'framer-motion';
import { getProductPricing } from '@/templates/shared/pricing';

const fmt = (value: number) => `S/ ${Number(value || 0).toFixed(2)}`;

function renderStars(rating: number) {
  return (
    <div className="flex text-[#ff9d00]">
      {Array.from({ length: 5 }).map((_, index) => (
        <Icon key={index} icon={index < Math.round(rating || 5) ? 'solar:star-bold' : 'solar:star-linear'} width={17} />
      ))}
    </div>
  );
}

function Countdown({ seed }: { seed: number }) {
  const days = 80 + (seed % 70);
  return (
    <div className="flex gap-1.5">
      {[
        [days, 'DÍAS'],
        [String((seed * 3) % 24).padStart(2, '0'), 'HRS'],
        [String((seed * 7) % 60).padStart(2, '0'), 'MIN'],
        [String((seed * 11) % 60).padStart(2, '0'), 'SEG'],
      ].map(([value, label]) => (
        <span key={label} className="rounded-md bg-red-50 px-2 py-1 text-center text-[11px] font-black leading-tight text-red-500">
          {value}<br />{label}
        </span>
      ))}
    </div>
  );
}

/**
 * Tarjeta de producto del template Ferretería (Hammer). Compartida entre el
 * home y el catálogo para que ambos se vean iguales.
 */
export default function HammerCatalogCard({ producto, cp, onOpen, onAdd }: { producto: any; cp: string; onOpen: () => void; onAdd: () => void }) {
  const pricing = getProductPricing(producto);
  const hasVariants = Array.isArray(producto?.variantes) && producto.variantes.length > 0;
  const rating = Number(producto?.ratingAvg || producto?.ratingPromedio || producto?.promedioRating || 0);
  const idSeed = Number(producto?.id || 1);

  return (
    <motion.article
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.22 }}
      transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -4 }}
      className="group relative cursor-pointer bg-white"
      onClick={onOpen}
    >
      {pricing.enOferta && (
        <span className="absolute left-2 top-4 z-10 rounded-md px-2 py-1 text-[10px] font-black text-[#111]" style={{ background: cp }}>
          -{pricing.porcentajeDescuento}%
        </span>
      )}
      <div className="relative flex h-[285px] items-center justify-center">
        {producto.imagenUrl ? (
          <img src={producto.imagenUrl} alt={producto.descripcion} className="max-h-full max-w-full object-contain transition-transform duration-300 group-hover:scale-105" />
        ) : (
          <Icon icon="solar:box-bold-duotone" width={86} className="text-gray-200" />
        )}
        {pricing.enOferta && (
          <div className="absolute bottom-1 left-1/2 -translate-x-1/2">
            <Countdown seed={idSeed} />
          </div>
        )}
        <div className="absolute right-0 top-10 hidden flex-col overflow-hidden rounded-md bg-white shadow-lg group-hover:flex">
          {['solar:heart-linear', 'solar:chart-2-linear', 'solar:eye-linear'].map((icon) => (
            <button key={icon} type="button" onClick={(event) => event.stopPropagation()} className="flex h-10 w-10 items-center justify-center border-b border-gray-100 last:border-b-0">
              <Icon icon={icon} width={18} />
            </button>
          ))}
        </div>
      </div>
      <h3 className="min-h-[48px] text-[15px] font-black leading-snug text-[#151515] line-clamp-2">{producto.descripcion}</h3>
      <div className="mt-3">{renderStars(rating || 5)}</div>
      <div className="mt-3 flex items-center gap-2 text-[18px] font-black text-[#151515]">
        {pricing.enOferta && <span className="text-[15px] font-bold text-gray-400 line-through">{fmt(pricing.precioRegular)}</span>}
        <span>{fmt(pricing.precioFinal)}</span>
      </div>
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          hasVariants ? onOpen() : onAdd();
        }}
        className="mt-4 rounded-md px-6 py-3 text-[14px] font-black text-[#111] transition-transform hover:scale-[1.02]"
        style={{ background: cp }}
      >
        {hasVariants ? 'Ver opciones' : 'Agregar al carrito'}
      </button>
    </motion.article>
  );
}
