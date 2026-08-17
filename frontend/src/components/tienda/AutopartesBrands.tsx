import React from 'react';
import { Icon } from '@iconify/react';
import { useNavigate } from 'react-router-dom';

interface Props {
  cp: string;
  slug: string;
  diseno?: any;
}

export default function AutopartesBrands({ cp, slug, diseno }: Props) {
  const navigate = useNavigate();
  const brandsImage = diseno?.autopartesBrandsImageUrl || '/assets/templates/autopartes/marcas.png';

  const brands = [
    { name: 'AYD', logo: '/assets/templates/autopartes/producto.png' },
    { name: 'Rolex', logo: '/assets/templates/autopartes/producto.png' },
    { name: 'Xenery', logo: '/assets/templates/autopartes/producto.png' },
    { name: 'Aqua Plus', logo: '/assets/templates/autopartes/producto.png' },
    { name: 'APC', logo: '/assets/templates/autopartes/producto.png' },
    { name: 'Ariete', logo: '/assets/templates/autopartes/producto.png' },
    { name: 'Arnott', logo: '/assets/templates/autopartes/producto.png' },
    { name: 'As Catalizadores', logo: '/assets/templates/autopartes/producto.png' },
    { name: 'Apple', logo: '/assets/templates/autopartes/producto.png' },
    { name: 'Ashika', logo: '/assets/templates/autopartes/producto.png' },
    { name: 'Asmet', logo: '/assets/templates/autopartes/producto.png' },
    { name: 'Axpock', logo: '/assets/templates/autopartes/producto.png' },
    { name: 'Aster', logo: '/assets/templates/autopartes/producto.png' },
    { name: 'Autoteile', logo: '/assets/templates/autopartes/producto.png' },
    { name: 'Auger', logo: '/assets/templates/autopartes/producto.png' },
  ];

  return (
    <div className="w-full max-w-7xl mx-auto px-4 xl:px-8 py-16">
      <div className="flex flex-col lg:flex-row gap-8">
        
        {/* Left: Flash Sales Banner */}
        <div className="w-full lg:w-[320px] bg-[#1A1A1A] rounded-2xl overflow-hidden relative flex flex-col pt-10 px-8 pb-10 text-white shadow-xl min-h-[480px]">
          
          {/* Background Image */}
          <div className="absolute inset-0 w-full h-full pointer-events-none z-0">
            <img src={brandsImage} alt="Mecánico" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-b from-black/90 via-black/40 to-black/90 z-10"></div>
          </div>
          
          <div className="flex items-center gap-2 mb-4 z-10 text-xs relative">
            <span className="font-bold text-white">Ventas Flash (15%)</span>
            <div className="h-px bg-white/30 flex-1"></div>
          </div>
          <h3 className="text-3xl font-black leading-tight mb-6 z-10 relative">
            Accesorios<br/>
            para Reparación<br/>
            de Autos
          </h3>
          <button 
            onClick={() => slug === "preview" ? window.dispatchEvent(new CustomEvent("preview-nav", { detail: "catalogo" })) : navigate(`/tienda/${slug}/catalogo`)}
            className="px-4 py-1.5 border border-[#F5B01D] text-[#F5B01D] rounded flex items-center justify-between w-max gap-3 hover:bg-[#F5B01D] hover:text-black transition-colors z-10 font-bold text-xs relative"
          >
            Ver Ahora
            <div className="w-4 h-4 bg-[#F5B01D] text-black rounded-full flex items-center justify-center">
              <Icon icon="solar:arrow-right-up-linear" width={10} />
            </div>
          </button>

          <div className="mt-auto relative z-10 flex justify-center pt-8">
          </div>
        </div>

        {/* Right: Brands Grid */}
        <div className="flex-1 bg-white rounded-2xl p-8 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-2 mb-1.5">
            <div className="flex gap-[3px]">
              <div className="w-3 h-0.5 transform -skew-x-[30deg]" style={{ backgroundColor: cp }}></div>
              <div className="w-3 h-0.5 transform -skew-x-[30deg]" style={{ backgroundColor: cp }}></div>
            </div>
            <span className="text-sm font-bold" style={{ color: cp }}>Nuestras Marcas</span>
          </div>

          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
            <h2 className="text-3xl md:text-4xl font-black text-gray-900 tracking-tight">
              Comprar por Marcas
            </h2>
            
            <button className="px-5 py-2.5 border border-red-600 text-red-600 rounded text-sm font-bold flex items-center gap-2 hover:bg-red-50 transition-colors">
              Más Marcas
              <Icon icon="solar:arrow-right-up-linear" className="bg-red-600 text-white rounded-full w-4 h-4 p-0.5" />
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
            {brands.map((brand, idx) => (
              <div key={idx} className="flex flex-col items-center justify-center p-4 rounded-xl border border-transparent hover:border-gray-200 hover:shadow-lg transition-all cursor-pointer bg-white group">
                <div className="h-12 w-full flex items-center justify-center mb-3 grayscale group-hover:grayscale-0 transition-all opacity-60 group-hover:opacity-100">
                  <div className="text-2xl font-black tracking-widest text-gray-800">{brand.name.toUpperCase().substring(0,4)}</div>
                </div>
                <span className="text-xs font-bold text-gray-600 group-hover:text-red-600 transition-colors">{brand.name}</span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
