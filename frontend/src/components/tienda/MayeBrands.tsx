import React from 'react';
import { Icon } from '@iconify/react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { mayeCard, mayeHover, mayeSection, mayeStagger, mayeTap, mayeViewport } from '@/lib/motion/maye';
import { getStoreLinkAction, runStoreLinkAction } from '@/components/tienda/storeLinkActions';

interface Props {
  cp: string;
  slug: string;
  diseno?: any;
  productos?: any[];
}

const getBrandName = (product: any) => {
  const raw = product?.marca || product?.brand || product?.marcaNombre;
  if (typeof raw === 'string') return raw;
  return raw?.nombre || raw?.name || raw?.descripcion || '';
};

const getBrandLogo = (product: any) => {
  const raw = product?.marca || product?.brand;
  if (raw && typeof raw === 'object') return raw.logoUrl || raw.imagenUrl || raw.logo || '';
  return '';
};

export default function MayeBrands({ cp, slug, diseno, productos = [] }: Props) {
  const navigate = useNavigate();
  const brandsImage = diseno?.mayeBrandsImageUrl || '/assets/templates/maye/marcastec.png';
  const flashLabel = diseno?.mayeBrandsFlashLabel || 'Selección destacada';
  const flashTitle = diseno?.mayeBrandsFlashTitle || 'Accesorios\npara Reparación\nde Equipos';
  const brandsLabel = diseno?.mayeBrandsLabel || 'Nuestras Marcas';
  const brandsTitle = diseno?.mayeBrandsTitle || 'Comprar por Marcas';
  const goAction = (key: string) => {
    runStoreLinkAction(getStoreLinkAction(diseno, key, { defaultType: 'catalog' }), { slug, navigate });
  };

  const brandMap = new Map<string, { name: string; logo: string }>();
  productos.forEach(product => {
    const name = getBrandName(product).trim();
    if (!name || brandMap.has(name.toLowerCase())) return;
    brandMap.set(name.toLowerCase(), { name, logo: getBrandLogo(product) });
  });
  const brands = Array.from(brandMap.values()).slice(0, 15);

  if (brands.length === 0 && slug !== 'preview') return null;
  const previewBrands = brands.length > 0
    ? brands
    : ['Asus', 'Lenovo', 'HP', 'MSI', 'Kingston', 'Samsung', 'Intel', 'AMD', 'LG', 'Logitech'].map(name => ({ name, logo: '' }));

  return (
    <motion.section className="w-full max-w-7xl mx-auto px-4 xl:px-8 py-16" variants={mayeSection} initial="initial" whileInView="animate" viewport={mayeViewport}>
      <motion.div className="flex flex-col lg:flex-row gap-8" variants={mayeStagger}>
        
        {/* Left: Flash Sales Banner */}
        <motion.div className="w-full lg:w-[320px] bg-[#1A1A1A] rounded-2xl overflow-hidden relative flex flex-col pt-10 px-8 pb-10 text-white shadow-xl min-h-[480px]" variants={mayeCard} whileHover={mayeHover}>
          
          {/* Background Image */}
          <div className="absolute inset-0 w-full h-full pointer-events-none z-0">
            <img src={brandsImage} alt="Mecánico" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-b from-black/90 via-black/40 to-black/90 z-10"></div>
          </div>
          
          <div className="flex items-center gap-2 mb-4 z-10 text-xs relative">
            <span className="font-bold text-white">{flashLabel}</span>
            <div className="h-px bg-white/30 flex-1"></div>
          </div>
          <h3 className="text-3xl font-black leading-tight mb-6 z-10 relative">
            <span className="whitespace-pre-line">{flashTitle}</span>
          </h3>
          <motion.button
            onClick={() => goAction('mayeBrandsFlashAction')}
            className="px-4 py-1.5 border border-[#F5B01D] text-[#F5B01D] rounded flex items-center justify-between w-max gap-3 hover:bg-[#F5B01D] hover:text-black transition-colors z-10 font-bold text-xs relative"
            whileHover={{ y: -2, scale: 1.04 }}
            whileTap={mayeTap}
          >
            Ver Ahora
            <div className="w-4 h-4 bg-[#F5B01D] text-black rounded-full flex items-center justify-center">
              <Icon icon="solar:arrow-right-up-linear" width={10} />
            </div>
          </motion.button>

          <div className="mt-auto relative z-10 flex justify-center pt-8">
          </div>
        </motion.div>

        {/* Right: Brands Grid */}
        <motion.div className="flex-1 bg-white rounded-2xl p-8 border border-gray-100 shadow-sm" variants={mayeCard}>
          <div className="flex items-center gap-2 mb-1.5">
            <div className="flex gap-[3px]">
              <div className="w-3 h-0.5 transform -skew-x-[30deg]" style={{ backgroundColor: cp }}></div>
              <div className="w-3 h-0.5 transform -skew-x-[30deg]" style={{ backgroundColor: cp }}></div>
            </div>
            <span className="text-sm font-bold" style={{ color: cp }}>{brandsLabel}</span>
          </div>

          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
            <h2 className="text-3xl md:text-4xl font-black text-gray-900 tracking-tight">
              {brandsTitle}
            </h2>
            
            <motion.button
              onClick={() => goAction('mayeBrandsMoreAction')}
              className="px-5 py-2.5 border rounded text-sm font-bold flex items-center gap-2 transition-colors"
              style={{ borderColor: cp, color: cp }}
              onMouseEnter={e => { e.currentTarget.style.backgroundColor = `${cp}10`; }}
              onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; }}
              whileHover={{ y: -2, scale: 1.03 }}
              whileTap={mayeTap}
            >
              Más Marcas
              <Icon icon="solar:arrow-right-up-linear" className="text-white rounded-full w-4 h-4 p-0.5" style={{ backgroundColor: cp }} />
            </motion.button>
          </div>

          <motion.div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4" variants={mayeStagger}>
            {previewBrands.map((brand, idx) => (
              <motion.button
                key={`${brand.name}-${idx}`}
                type="button"
                onClick={() => slug === 'preview'
                  ? window.dispatchEvent(new CustomEvent('preview-nav', { detail: 'catalogo' }))
                  : navigate(`/tienda/${slug}/catalogo?brand=${encodeURIComponent(brand.name)}`)}
                className="flex flex-col items-center justify-center p-4 rounded-xl border border-transparent hover:border-gray-200 hover:shadow-lg transition-all cursor-pointer bg-white group"
                variants={mayeCard}
                whileHover={{ y: -4, scale: 1.035 }}
              >
                <div className="h-12 w-full flex items-center justify-center mb-3 grayscale group-hover:grayscale-0 transition-all opacity-60 group-hover:opacity-100">
                  {brand.logo ? (
                    <img src={brand.logo} alt={brand.name} className="max-h-10 max-w-full object-contain" />
                  ) : (
                    <div className="text-2xl font-black tracking-widest text-gray-800">{brand.name.toUpperCase().substring(0,4)}</div>
                  )}
                </div>
                <span
                  className="text-xs font-bold text-gray-600 transition-colors"
                  onMouseEnter={e => { e.currentTarget.style.color = cp; }}
                  onMouseLeave={e => { e.currentTarget.style.color = ''; }}
                >
                  {brand.name}
                </span>
              </motion.button>
            ))}
          </motion.div>
        </motion.div>

      </motion.div>
    </motion.section>
  );
}
