import React from 'react';
import { Icon } from '@iconify/react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { mayeCard, mayeHeroMedia, mayeHeroText, mayeHover, mayeSection, mayeStagger, mayeTap, mayeViewport } from '@/lib/motion/maye';
import { getStoreLinkAction, runStoreLinkAction } from '@/components/tienda/storeLinkActions';

interface MayePromoBannersProps {
  cp: string;
  slug: string;
  diseno?: any;
}

export default function MayePromoBanners({ cp, slug, diseno }: MayePromoBannersProps) {
  const navigate = useNavigate();
  const promoLeftImage = diseno?.mayePromoLeftImageUrl || '/assets/templates/maye/coleccion.png';
  const promoRightImage = diseno?.mayePromoRightImageUrl || '/assets/templates/maye/rgb.png';
  const goAction = (key: string) => {
    runStoreLinkAction(getStoreLinkAction(diseno, key, { defaultType: 'catalog' }), { slug, navigate });
  };

  return (
    <motion.section className="w-full grid grid-cols-1 lg:grid-cols-2 gap-6" variants={mayeStagger} initial="initial" whileInView="animate" viewport={mayeViewport}>
      
      {/* Left Banner */}
      <motion.div className="bg-black rounded-2xl overflow-hidden relative min-h-[360px] flex items-center p-8 md:p-12 border border-gray-800" variants={mayeSection} whileHover={mayeHover}>
        <motion.div className="absolute inset-0 w-full h-full pointer-events-none z-0" variants={mayeHeroMedia}>
          <img src={promoLeftImage} alt="Setup gamer con luces" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/20 to-transparent z-10"></div>
        </motion.div>
        
        <motion.div className="relative z-20 max-w-sm" variants={mayeHeroText}>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-px" style={{ backgroundColor: '#F5B01D' }}></div>
            <span className="text-sm font-bold" style={{ color: '#F5B01D' }}>{diseno?.mayePromoLeftLabel || 'Colección destacada'}</span>
          </div>
          
          <h3 className="text-4xl md:text-5xl font-black text-white leading-tight mb-8">
            <span className="whitespace-pre-line">{diseno?.mayePromoLeftTitle || 'Colección de\nComponentes de PC'}</span>
          </h3>
          
          <motion.button
            onClick={() => goAction('mayePromoLeftAction')}
            className="px-6 py-2.5 text-white font-bold rounded flex items-center gap-2 hover:opacity-90 transition-opacity"
            style={{ backgroundColor: cp }}
            whileHover={{ y: -2, scale: 1.04 }}
            whileTap={mayeTap}
          >
            {diseno?.mayePromoLeftButton || 'Ver Ahora'}
            <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center">
              <Icon icon="solar:arrow-right-up-linear" width={12} />
            </div>
          </motion.button>
        </motion.div>
      </motion.div>

      {/* Right Banner */}
      <motion.div className="bg-black rounded-2xl overflow-hidden relative min-h-[360px] flex items-center p-8 md:p-12 border border-gray-800" variants={mayeSection} whileHover={mayeHover}>
        <motion.div className="absolute inset-0 w-full h-full pointer-events-none z-0" variants={mayeHeroMedia}>
          <img src={promoRightImage} alt="Periféricos RGB" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/20 to-transparent z-10"></div>
        </motion.div>
        
        <motion.div className="relative z-20 max-w-sm" variants={mayeHeroText}>
          <div className="inline-block px-3 py-1 bg-[#00C4B5] text-white text-xs font-bold rounded mb-4">
            {diseno?.mayePromoRightLabel || 'Mejores Marcas'}
          </div>
          
          <h3 className="text-xl md:text-2xl text-gray-300 mb-1">{diseno?.mayePromoRightSubtitle || 'Periféricos RGB'}</h3>
          <h2 className="text-4xl md:text-5xl font-black mb-8" style={{ color: '#F5B01D' }}>
            {diseno?.mayePromoRightTitle || 'Mega Oferta'}
          </h2>
          
          <motion.button
            onClick={() => goAction('mayePromoRightAction')}
            className="px-8 py-3 bg-white text-black font-bold rounded hover:bg-gray-100 transition-colors"
            whileHover={{ y: -2, scale: 1.04 }}
            whileTap={mayeTap}
          >
            {diseno?.mayePromoRightButton || 'Comprar Ahora'}
          </motion.button>
        </motion.div>
      </motion.div>

    </motion.section>
  );
}
