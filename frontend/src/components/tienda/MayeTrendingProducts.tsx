import React from 'react';
import { Icon } from '@iconify/react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import ProductCardMaye from './ProductCardMaye';
import { mayeCard, mayeHover, mayeSection, mayeStagger, mayeTap, mayeViewport } from '@/lib/motion/maye';
import { getStoreLinkAction, runStoreLinkAction } from '@/components/tienda/storeLinkActions';

interface Props {
  cp: string;
  slug: string;
  productos: any[];
  diseno: any;
  onAddToCart: (p: any) => void;
}

export default function MayeTrendingProducts({ cp, slug, productos, diseno, onAddToCart }: Props) {
  const navigate = useNavigate();
  // Ensure we show exactly 6 products (or as many as available up to 6)
  const displayProducts = productos.slice(0, 6);

  const comunidadTitle = diseno?.comunidadTitle || "Sé parte de nuestra\nComunidad Tech";
  const comunidadText = diseno?.comunidadText || "Únete al Club";
  const communityButton = diseno?.mayeCommunityButton || 'Unirse Ahora';
  const supportLabel = diseno?.mayeSupportLabel || 'Soporte al Cliente';
  const supportTitle = diseno?.mayeSupportTitle || 'Asistencia Experta 24h Soporte';
  const supportButton = diseno?.mayeSupportButton || 'Empezar';
  const title = diseno?.mayeTrendingProductsTitle || 'Productos Más Buscados';
  const comunidadImage = diseno?.mayeCommunityImageUrl || '/assets/templates/maye/comunidadtec.png';
  const supportImage = diseno?.mayeSupportImageUrl || '/assets/templates/maye/24horastec.png';
  const goAction = (key: string) => {
    runStoreLinkAction(getStoreLinkAction(diseno, key, { defaultType: 'catalog' }), { slug, navigate });
  };

  return (
    <motion.section className="w-full flex flex-col lg:flex-row gap-6 mb-16" variants={mayeSection} initial="initial" whileInView="animate" viewport={mayeViewport}>
      
      {/* Left Banners Column (1/4 width on desktop) */}
      <motion.div className="w-full lg:w-1/4 flex flex-col gap-6" variants={mayeStagger}>
        {/* Red Banner */}
        <motion.div className="flex-1 rounded-2xl p-8 relative overflow-hidden text-white flex flex-col group" style={{ backgroundColor: cp }} variants={mayeCard} whileHover={mayeHover}>
          <div className="absolute inset-0 w-full h-full transition-transform duration-500 group-hover:scale-110 pointer-events-none z-0">
            <img src={comunidadImage} className="absolute inset-0 w-full h-full object-cover" alt="Comunidad" />
            <div className="absolute inset-0" style={{ background: `linear-gradient(to bottom, ${cp}e6, ${cp}66, transparent)` }}></div>
          </div>

          <div className="flex items-center gap-2 mb-2 z-10 relative">
            <div className="flex gap-[3px]">
              <div className="w-3 h-0.5 bg-white transform -skew-x-[30deg]"></div>
              <div className="w-3 h-0.5 bg-white transform -skew-x-[30deg]"></div>
            </div>
            <span className="text-[10px] font-bold tracking-widest uppercase">{comunidadText}</span>
          </div>
          
          <h3 className="text-2xl xl:text-3xl font-black leading-tight mb-6 z-10 relative whitespace-pre-line">
            {comunidadTitle}
          </h3>
          
          <motion.button
            onClick={() => goAction('mayeCommunityAction')}
            className="px-4 py-2 border border-white/50 rounded flex items-center justify-between w-max gap-3 hover:bg-white transition-colors z-10 font-bold text-xs relative mt-auto"
            onMouseEnter={e => { e.currentTarget.style.color = cp; }}
            onMouseLeave={e => { e.currentTarget.style.color = ''; }}
            whileHover={{ y: -2, scale: 1.04 }}
            whileTap={mayeTap}
          >
            {communityButton}
            <div className="w-4 h-4 bg-white rounded-full flex items-center justify-center" style={{ color: cp }}>
              <Icon icon="solar:arrow-right-up-linear" width={10} />
            </div>
          </motion.button>
        </motion.div>

        {/* Black Banner */}
        <motion.div className="flex-1 bg-black rounded-2xl p-8 relative overflow-hidden text-white flex flex-col border border-gray-800 group" variants={mayeCard} whileHover={mayeHover}>
          <div className="absolute inset-0 w-full h-full transition-transform duration-500 group-hover:scale-110 pointer-events-none z-0">
            <img src={supportImage} className="absolute inset-0 w-full h-full object-cover" alt="Asistencia" />
            <div className="absolute inset-0 bg-gradient-to-b from-black/90 via-black/40 to-transparent"></div>
          </div>

          <div className="flex items-center gap-2 mb-2 z-10">
            <div className="flex gap-[3px]">
              <div className="w-3 h-0.5 bg-[#F5B01D] transform -skew-x-[30deg]"></div>
              <div className="w-3 h-0.5 bg-[#F5B01D] transform -skew-x-[30deg]"></div>
            </div>
            <span className="text-[10px] font-bold tracking-widest uppercase text-[#F5B01D]">{supportLabel}</span>
          </div>
          
          <h3 className="text-2xl xl:text-3xl font-black leading-tight mb-6 z-10">
            {supportTitle}
          </h3>
          
          <motion.button
            onClick={() => goAction('mayeSupportAction')}
            className="text-xs font-bold flex items-center gap-1.5 z-10 transition-colors w-max"
            style={{ color: cp }}
            onMouseEnter={e => { e.currentTarget.style.opacity = '0.85'; }}
            onMouseLeave={e => { e.currentTarget.style.opacity = ''; }}
            whileHover={{ x: 3 }}
            whileTap={mayeTap}
          >
            {supportButton} <Icon icon="solar:arrow-right-up-linear" className="text-black rounded-full w-4 h-4 p-0.5" style={{ backgroundColor: cp }} />
          </motion.button>
        </motion.div>
      </motion.div>

      {/* Right Products Column (3/4 width on desktop) */}
      <motion.div className="w-full lg:w-3/4 flex flex-col" variants={mayeCard}>
        <h2 className="text-3xl md:text-4xl font-black text-gray-900 tracking-tight mb-8 pt-2">
          {title}
        </h2>
        <motion.div className="grid grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6" variants={mayeStagger}>
          {displayProducts.map((p) => (
            <ProductCardMaye 
              key={p.id}
              producto={p}
              slug={slug}
              diseno={diseno}
              onAddToCart={onAddToCart}
              onClick={() => navigate(`/tienda/${slug}/producto/${p.id}`)}
            />
          ))}
        </motion.div>
      </motion.div>

    </motion.section>
  );
}
