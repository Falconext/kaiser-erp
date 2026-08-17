import React from 'react';
import { Icon } from '@iconify/react';
import { useNavigate } from 'react-router-dom';

interface TecnologiaFeaturedCategoriesProps {
  cp: string;
  slug: string;
  diseno?: any;
}

export default function TecnologiaFeaturedCategories({ cp, slug, diseno }: TecnologiaFeaturedCategoriesProps) {
  const navigate = useNavigate();
  const categoryImage = diseno?.tecnologiaCategoryImageUrl || '/assets/templates/tecnologia/producto.png';

  const categories = [
    {
      title: 'Motor y Rendimiento',
      image: categoryImage,
      items: [
        'Aceite de Motor',
        'Componentes y Ensamblaje',
        'Rendimiento del Motor',
        'Filtros de Aire',
        'Sistemas de Escape'
      ]
    },
    {
      title: 'Llantas y Ruedas',
      image: categoryImage,
      items: [
        'Rodamientos de Rueda',
        'Llantas por Velocidad',
        'Llantas por Clima',
        'Por Tamaños de Llanta',
        'Accesorios para Ruedas'
      ]
    },
    {
      title: 'Frenos y Suspensión',
      image: categoryImage,
      items: [
        'Eje de Transmisión y Junta CV',
        'Bujes y Relacionados',
        'Componentes de Suspensión',
        'Por Tamaños de Llanta',
        'Discos de Freno y Pastillas'
      ]
    }
  ];

  return (
    <div className="w-full py-16 relative">
      <div className="text-center max-w-2xl mx-auto mb-12">
        <h2 className="text-3xl md:text-4xl font-black text-[#0B1340] mb-4 tracking-tight">
          Categorías Destacadas
        </h2>
        <p className="text-gray-500 text-sm md:text-base leading-relaxed">
          Encuentra las mejores piezas para tu vehículo con la garantía de nuestros socios. Contamos con todo lo que necesitas para el mantenimiento y rendimiento de tu auto.
        </p>
      </div>

      <div className="relative">
        {/* Left Arrow */}
        <button className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 z-10 w-12 h-12 rounded-full bg-[#1A1A1A] text-white flex items-center justify-center hover:bg-black transition-colors shadow-xl hidden md:flex">
          <Icon icon="solar:arrow-left-linear" width={24} />
        </button>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-0">
          {categories.map((cat, idx) => (
            <div key={idx} className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 flex flex-col items-center text-center transition-transform hover:-translate-y-1 hover:shadow-md">
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
                <button 
                  onClick={() => slug === "preview" ? window.dispatchEvent(new CustomEvent("preview-nav", { detail: "catalogo" })) : navigate(`/tienda/${slug}/catalogo`)}
                  className="text-sm font-bold flex items-center gap-2 transition-colors"
                  style={{ color: cp }}
                >
                  Explorar Más <Icon icon="solar:arrow-right-linear" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Right Arrow */}
        <button 
          className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 z-10 w-12 h-12 rounded-full text-white flex items-center justify-center hover:opacity-90 transition-colors shadow-xl hidden md:flex"
          style={{ backgroundColor: cp }}
        >
          <Icon icon="solar:arrow-right-up-linear" width={24} />
        </button>
      </div>

      <div className="flex justify-center mt-12">
        <button 
          onClick={() => slug === "preview" ? window.dispatchEvent(new CustomEvent("preview-nav", { detail: "catalogo" })) : navigate(`/tienda/${slug}/catalogo`)}
          className="px-8 py-3.5 text-white font-bold rounded-md hover:opacity-90 transition-opacity shadow-lg shadow-red-500/20"
          style={{ backgroundColor: cp }}
        >
          Todas las Categorías
        </button>
      </div>
    </div>
  );
}
