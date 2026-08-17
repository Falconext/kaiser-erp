import React from 'react';
import { Icon } from '@iconify/react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { mayeCard, mayeHover, mayeSection, mayeStagger, mayeTap, mayeViewport } from '@/lib/motion/maye';
import { getStoreLinkAction, runStoreLinkAction } from '@/components/tienda/storeLinkActions';

interface MayeFeaturedCategoriesProps {
  cp: string;
  slug: string;
  diseno?: any;
}

export default function MayeFeaturedCategories({ cp, slug, diseno }: MayeFeaturedCategoriesProps) {
  const navigate = useNavigate();

  const categories = [
    {
      actionKey: 'mayeCategory1Action',
      title: diseno?.mayeCategory1Title || 'Laptops y PCs',
      image: diseno?.mayeCategory1ImageUrl || '/assets/templates/maye/catlaptopspc.png',
      items: [
        'Laptops Gamers',
        'Componentes y Ensamblaje',
        'PCs de Escritorio',
        'Filtros de Aire',
        'Sistemas de Escape'
      ]
    },
    {
      actionKey: 'mayeCategory2Action',
      title: diseno?.mayeCategory2Title || 'Componentes de PC',
      image: diseno?.mayeCategory2ImageUrl || '/assets/templates/maye/componentes.png',
      items: [
        'Rodamientos de Rueda',
        'Tarjetas Gráficas',
        'Procesadores',
        'Placas Madre',
        'Accesorios para Ruedas'
      ]
    },
    {
      actionKey: 'mayeCategory3Action',
      title: diseno?.mayeCategory3Title || 'Periféricos',
      image: diseno?.mayeCategory3ImageUrl || '/assets/templates/maye/perifericos.png',
      items: [
        'Eje de Transmisión y Junta CV',
        'Bujes y Relacionados',
        'Componentes de Suspensión',
        'Placas Madre',
        'Teclados y Mouses'
      ]
    }
  ];

  const goAction = (key: string, fallbackValue?: string) => {
    runStoreLinkAction(
      getStoreLinkAction(diseno, key, { defaultType: 'category', fallbackValue }),
      { slug, navigate }
    );
  };

  return (
    <motion.section className="w-full py-16 relative" variants={mayeSection} initial="initial" whileInView="animate" viewport={mayeViewport}>
      <motion.div className="text-center max-w-2xl mx-auto mb-12" variants={mayeCard}>
        <h2 className="text-3xl md:text-4xl font-black text-[#0B1340] mb-4 tracking-tight">
          {diseno?.mayeFeaturedCategoriesTitle || 'Categorías Destacadas'}
        </h2>
        <p className="text-gray-500 text-sm md:text-base leading-relaxed">
          {diseno?.mayeFeaturedCategoriesText || 'Encuentra los mejores equipos tecnológicos con la garantía de nuestras marcas asociadas. Contamos con todo lo que necesitas para tu setup.'}
        </p>
      </motion.div>

      <div className="relative">
        {/* Left Arrow */}
        <button className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 z-10 w-12 h-12 rounded-full bg-[#1A1A1A] text-white flex items-center justify-center hover:bg-black transition-colors shadow-xl hidden md:flex">
          <Icon icon="solar:arrow-left-linear" width={24} />
        </button>

        <motion.div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-0" variants={mayeStagger}>
          {categories.map((cat, idx) => (
            <motion.div key={idx} className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 flex flex-col items-center text-center transition-transform hover:shadow-md" variants={mayeCard} whileHover={mayeHover}>
              <h3 className="text-xl font-black text-gray-900 mb-8">{cat.title}</h3>
              
              <div className="flex flex-col sm:flex-row items-center gap-6 w-full text-left">
                <div className="w-28 h-28 flex-shrink-0 bg-gray-50 rounded-full flex items-center justify-center p-2 border border-gray-100 overflow-hidden">
                  <img src={cat.image} alt={cat.title} className="w-full h-full object-cover rounded-full mix-blend-multiply" />
                </div>
                
                <ul className="flex-1 space-y-2">
                  {cat.items.map((item, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-gray-600 font-medium">
                      <div className={`w-1.5 h-1.5 rounded-full ${i === 1 ? 'bg-red-600' : 'bg-gray-300'}`} style={i === 1 ? { backgroundColor: cp } : {}}></div>
                      <span className={i === 1 ? 'text-gray-900 font-bold' : ''}>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="w-full flex justify-end mt-8 border-t border-gray-50 pt-4">
                <motion.button
                  onClick={() => goAction(cat.actionKey, cat.title)}
                  className="text-sm font-bold flex items-center gap-2 transition-colors"
                  style={{ color: cp }}
                  whileHover={{ x: 3 }}
                  whileTap={mayeTap}
                >
                  Explorar Más <Icon icon="solar:arrow-right-linear" />
                </motion.button>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Right Arrow */}
        <button 
          className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 z-10 w-12 h-12 rounded-full text-white flex items-center justify-center hover:opacity-90 transition-colors shadow-xl hidden md:flex"
          style={{ backgroundColor: cp }}
        >
          <Icon icon="solar:arrow-right-up-linear" width={24} />
        </button>
      </div>

      <div className="flex justify-center mt-12">
        <motion.button
          onClick={() => runStoreLinkAction(getStoreLinkAction(diseno, 'mayeAllCategoriesAction', { defaultType: 'catalog' }), { slug, navigate })}
          className="px-8 py-3.5 text-white font-bold rounded-md hover:opacity-90 transition-opacity shadow-lg"
          style={{ backgroundColor: cp, boxShadow: `0 18px 30px -14px ${cp}66` }}
          whileHover={{ y: -2, scale: 1.04 }}
          whileTap={mayeTap}
        >
          Todas las Categorías
        </motion.button>
      </div>
    </motion.section>
  );
}
