import React from 'react';
import { Icon } from '@iconify/react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { mayeCard, mayeHeroMedia, mayeHeroText, mayeHover, mayeSection, mayeStagger, mayeSubtleHover, mayeTap, mayeViewport } from '@/lib/motion/maye';
import { getStoreLinkAction, runStoreLinkAction } from '@/components/tienda/storeLinkActions';

interface MayeHeroProps {
  cp: string;
  slug: string;
  diseno?: any;
  productos?: any[];
  allCategories?: any[];
}

const getCategoryName = (category: any) => {
  if (typeof category === 'string') return category;
  return category?.nombre || category?.name || category?.descripcion || '';
};

const getProductCategoryName = (product: any) => {
  const raw = product?.categoria || product?.categoriaNombre || product?.categoryName || product?.category;
  return getCategoryName(raw);
};

export default function MayeHero({ cp, slug, diseno, productos = [], allCategories = [] }: MayeHeroProps) {
  const navigate = useNavigate();

  const heroTitle = diseno?.heroTitle || "Laptops y PCs\nAlta Gama";
  const heroSubtitle = diseno?.heroSubtitle || "Equipos y accesorios de última generación. Por tiempo limitado para clientes nuevos, obtén envío gratis en tus pedidos.";
  const heroEyebrow = diseno?.mayeHeroEyebrow || 'Selección destacada';
  const heroButton = diseno?.mayeHeroButton || 'Ver catálogo';
  const realCategoryNames = Array.from(new Set([
    ...allCategories.map(getCategoryName),
    ...productos.map(getProductCategoryName),
  ].map(value => String(value || '').trim()).filter(Boolean)));
  const previewFallbackCategories = slug === 'preview'
    ? ['Laptops', 'Monitores', 'Periféricos', 'RAM', 'Almacenamiento', 'GPU', 'Procesadores', 'Accesorios']
    : [];
  const quickCategories = (realCategoryNames.length > 0 ? realCategoryNames : previewFallbackCategories).slice(0, 8);
  const iconSet = [
    'solar:laptop-bold',
    'solar:monitor-bold',
    'solar:keyboard-bold',
    'solar:server-square-bold',
    'solar:database-bold',
    'solar:cpu-bolt-bold',
    'solar:cpu-bold',
    'solar:headphones-round-bold',
  ];
  const sideTopLabel = diseno?.mayeSideTopLabel || realCategoryNames[0] || 'Categoría destacada';
  const sideTopBadge = String(diseno?.mayeSideTopBadge || '').trim();
  const sideTopTitle = diseno?.mayeSideTopTitle || '¡Colecciones!';
  const sideTopButton = diseno?.mayeSideTopButton || 'Ver Ahora';
  const sideBottomBadge = String(diseno?.mayeSideBottomBadge || '').trim();
  const sideBottomTitle = diseno?.mayeSideBottomTitle || 'Tarjetas\nGráficas';
  const sideBottomButton = diseno?.mayeSideBottomButton || 'Comprar Ahora';
  const finderTitle = diseno?.mayeFinderTitle || 'Busca tu Equipo Ideal';
  const finderText = diseno?.mayeFinderText || `Colección de ${Number(productos?.length || 0).toLocaleString('es-PE')} productos disponibles`;
  const heroImage = diseno?.mayeHeroImageUrl || '/assets/templates/maye/laptoppc.png';
  const sideTopImage = diseno?.mayeSideTopImageUrl || '/assets/templates/maye/colecciones.png';
  const sideBottomImage = diseno?.mayeSideBottomImageUrl || '/assets/templates/maye/tarjetas.png';
  const vehicleImage = diseno?.mayeVehicleImageUrl || '/assets/templates/maye/filtradocategorias.png';
  const goAction = (key: string, defaultType: 'catalog' | 'category', fallbackValue?: string) => {
    runStoreLinkAction(
      getStoreLinkAction(diseno, key, { defaultType, fallbackValue }),
      { slug, navigate }
    );
  };

  return (
    <motion.div className="w-full flex flex-col gap-6" variants={mayeStagger} initial="initial" animate="animate">
      
      {/* 3-Pane Banner Area */}
      <motion.div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6" variants={mayeStagger}>
        
        {/* Left Large Banner */}
        <motion.div className="lg:col-span-2 relative bg-black rounded-2xl overflow-hidden min-h-[400px] flex items-center" variants={mayeCard} whileHover={mayeSubtleHover}>
          {/* Abstract red glow effect */}
          <div className="absolute -left-32 -top-32 w-96 h-96 rounded-full blur-3xl opacity-20" style={{ backgroundColor: cp }}></div>
          
          <motion.div className="relative z-10 px-8 md:px-12 w-full md:w-2/3 py-12" variants={mayeHeroText}>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-4 h-4 rounded-full flex items-center justify-center border-2 border-[#1A1A1A]" style={{ backgroundColor: cp }}>
                <div className="w-1.5 h-1.5 bg-black rounded-full"></div>
              </div>
              <span className="text-sm font-bold text-white">{heroEyebrow}</span>
            </div>
            
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-black text-white leading-tight mb-4 tracking-tight whitespace-pre-line">
              {heroTitle}
            </h2>
            
            <p className="text-gray-400 text-sm md:text-base leading-relaxed mb-8 max-w-md">
              {heroSubtitle}
            </p>
            
            <div className="flex items-center gap-6">
              <motion.button
                onClick={() => goAction('mayeHeroAction', 'catalog')}
                className="px-8 py-3.5 text-white font-bold rounded-md hover:opacity-90 transition-opacity"
                style={{ backgroundColor: cp }}
                whileHover={{ y: -2, scale: 1.04 }}
                whileTap={mayeTap}
              >
                {heroButton}
              </motion.button>
            </div>
          </motion.div>
          
          {/* Image background for left banner */}
          <motion.div className="absolute inset-0 w-full h-full pointer-events-none z-0" variants={mayeHeroMedia}>
            <img src={heroImage} alt="Equipos de Alta Gama" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/30 to-transparent"></div>
          </motion.div>

          {/* Pagination dots */}
          <div className="absolute bottom-6 right-6 flex items-center gap-2 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 z-20">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: cp }}></div>
            <div className="w-2 h-2 rounded-full bg-white/30"></div>
            <div className="w-2 h-2 rounded-full bg-white/30"></div>
          </div>
        </motion.div>

        {/* Right Banners Column */}
        <motion.div className="flex flex-col gap-4 lg:gap-6" variants={mayeStagger}>
          
          {/* Top Right Banner */}
          <motion.div className="flex-1 bg-black rounded-2xl overflow-hidden relative min-h-[190px] p-6 flex flex-col justify-center border border-gray-800" variants={mayeCard} whileHover={mayeHover}>
            <div className="absolute inset-0 w-full h-full pointer-events-none z-0">
              <img src={sideTopImage} alt="Colecciones" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-r from-black/60 to-transparent"></div>
            </div>
            
            {sideTopBadge && (
              <div className="absolute top-4 left-4 bg-white/10 backdrop-blur-sm px-3 py-1 rounded text-xs font-bold text-white border border-white/20 z-10">
                {sideTopBadge}
              </div>
            )}
            <div className="mt-6 z-10 relative max-w-[65%]">
              <span className="text-sm font-bold text-[#F5B01D] mb-1 block">{sideTopLabel}</span>
              <h3 className="text-2xl md:text-3xl font-black text-white leading-tight mb-4">
                {sideTopTitle}
              </h3>
              <motion.button
                onClick={() => goAction('mayeSideTopAction', 'category', sideTopLabel)}
                className="text-sm font-bold text-white hover:text-[#F5B01D] flex items-center gap-1 group"
                whileTap={mayeTap}
              >
                {sideTopButton}
                <Icon icon="solar:arrow-right-up-linear" className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </motion.button>
            </div>
          </motion.div>

          {/* Bottom Right Banner */}
          <motion.div className="flex-1 bg-black rounded-2xl overflow-hidden relative min-h-[190px] p-6 flex flex-col justify-center border border-gray-800" variants={mayeCard} whileHover={mayeHover}>
              <div className="absolute inset-0 w-full h-full pointer-events-none z-0">
              <img src={sideBottomImage} alt="Tarjetas Gráficas" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-r from-black/50 to-transparent"></div>
            </div>
             {sideBottomBadge && (
               <div className="absolute top-4 left-4 bg-white/10 backdrop-blur-sm px-3 py-1 rounded text-xs font-bold text-yellow-500 border border-white/10 z-10">
                {sideBottomBadge}
              </div>
             )}
            <div className="mt-6 z-10 relative max-w-[65%]">
              <h3 className="text-2xl md:text-3xl font-black text-white leading-tight mb-4">
                <span className="whitespace-pre-line">{sideBottomTitle}</span>
              </h3>
              <motion.button
                onClick={() => goAction('mayeSideBottomAction', 'category', sideBottomTitle.replace(/\s+/g, ' ').trim())}
                className="px-6 py-2.5 text-sm font-bold text-black bg-[#F5B01D] rounded hover:bg-yellow-400 transition-colors inline-block"
                whileHover={{ y: -2, scale: 1.04 }}
                whileTap={mayeTap}
              >
                {sideBottomButton}
              </motion.button>
            </div>
          </motion.div>

        </motion.div>
      </motion.div>

      {/* Quick Tech Categories */}
      <motion.div className="relative mt-8 w-full overflow-hidden rounded-2xl border border-gray-800 bg-black p-6 md:p-8" variants={mayeSection} initial="initial" whileInView="animate" viewport={mayeViewport}>
        <div className="absolute inset-0 pointer-events-none z-0">
          <img src={vehicleImage} alt="" className="h-full w-full object-cover opacity-70" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-black/20" />
        </div>
        <div className="relative z-10 mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-[11px] font-bold tracking-widest text-gray-500 uppercase mb-1">Explora por categoría</p>
            <h3 className="text-2xl font-black leading-tight text-white sm:text-xl md:text-2xl">{finderTitle}</h3>
            <p className="mt-1 text-sm leading-relaxed text-gray-300 sm:text-xs">{finderText}</p>
          </div>
          <motion.button
            onClick={() => goAction('mayeFinderAction', 'catalog')}
            className="hidden sm:flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-md border-2 hover:text-white transition-colors"
            style={{ borderColor: cp, color: cp }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = cp; (e.currentTarget as HTMLButtonElement).style.color = '#fff'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent'; (e.currentTarget as HTMLButtonElement).style.color = cp; }}
            whileHover={{ y: -2, scale: 1.03 }}
            whileTap={mayeTap}
          >
            Ver todo el catálogo
            <Icon icon="solar:arrow-right-linear" width={14} />
          </motion.button>
        </div>

        {quickCategories.length > 0 && (
        <motion.div className="relative z-10 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-8" variants={mayeStagger} initial="initial" whileInView="animate" viewport={mayeViewport}>
          {quickCategories.map((label, index) => (
            <motion.button
              key={label}
              onClick={() => slug === "preview" ? window.dispatchEvent(new CustomEvent("preview-nav", { detail: "catalogo" })) : navigate(`/tienda/${slug}/catalogo?category=${encodeURIComponent(label)}`)}
              className="group flex min-h-[126px] w-full flex-col items-center justify-center gap-3 rounded-2xl border-2 border-gray-100 bg-white px-3 py-4 text-center shadow-sm transition-all duration-200 hover:border-transparent hover:shadow-md sm:min-h-[120px]"
              style={{ ['--hover-bg' as any]: cp }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = cp; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#f3f4f6'; }}
              variants={mayeCard}
              whileHover={{ y: -4, scale: 1.04 }}
              whileTap={mayeTap}
            >
              <div
                className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl transition-colors"
                style={{ backgroundColor: `${cp}18` }}
              >
                <Icon icon={iconSet[index % iconSet.length]} width={24} style={{ color: cp }} />
              </div>
              <span className="block max-w-full break-words text-center text-[13px] font-black leading-tight text-gray-600 transition-colors group-hover:text-gray-900 [overflow-wrap:anywhere]">
                {label}
              </span>
            </motion.button>
          ))}
        </motion.div>
        )}
      </motion.div>
    </motion.div>
  );
}
