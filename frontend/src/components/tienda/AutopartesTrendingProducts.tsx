import React from 'react';
import { Icon } from '@iconify/react';
import { useNavigate } from 'react-router-dom';
import ProductCardAutopartes from './ProductCardAutopartes';

interface Props {
  cp: string;
  slug: string;
  productos: any[];
  diseno: any;
  onAddToCart: (p: any) => void;
}

export default function AutopartesTrendingProducts({ cp, slug, productos, diseno, onAddToCart }: Props) {
  const navigate = useNavigate();
  // Ensure we show exactly 6 products (or as many as available up to 6)
  const displayProducts = productos.slice(0, 6);

  const comunidadTitle = diseno?.comunidadTitle || "Sé parte de nuestra\nComunidad Automotriz";
  const comunidadText = diseno?.comunidadText || "Únete al Club";
  const comunidadImage = diseno?.autopartesCommunityImageUrl || '/assets/templates/autopartes/comunidad.png';
  const supportImage = diseno?.autopartesSupportImageUrl || '/assets/templates/autopartes/asistencia.png';

  return (
    <div className="w-full flex flex-col lg:flex-row gap-6 mb-16">
      
      {/* Left Banners Column (1/4 width on desktop) */}
      <div className="w-full lg:w-1/4 flex flex-col gap-6">
        {/* Red Banner */}
        <div className="flex-1 bg-red-600 rounded-2xl p-8 relative overflow-hidden text-white flex flex-col group">
          <div className="absolute inset-0 w-full h-full transition-transform duration-500 group-hover:scale-110 pointer-events-none z-0">
            <img src={comunidadImage} className="absolute inset-0 w-full h-full object-cover" alt="Comunidad" />
            <div className="absolute inset-0 bg-gradient-to-b from-red-800/90 via-red-800/40 to-transparent"></div>
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
          
          <button 
            onClick={() => slug === "preview" ? window.dispatchEvent(new CustomEvent("preview-nav", { detail: "catalogo" })) : navigate(`/tienda/${slug}/catalogo`)}
            className="px-4 py-2 border border-white/50 rounded flex items-center justify-between w-max gap-3 hover:bg-white hover:text-red-600 transition-colors z-10 font-bold text-xs relative mt-auto"
          >
            Unirse Ahora
            <div className="w-4 h-4 bg-white text-red-600 rounded-full flex items-center justify-center">
              <Icon icon="solar:arrow-right-up-linear" width={10} />
            </div>
          </button>
        </div>

        {/* Black Banner */}
        <div className="flex-1 bg-black rounded-2xl p-8 relative overflow-hidden text-white flex flex-col border border-gray-800 group">
          <div className="absolute inset-0 w-full h-full transition-transform duration-500 group-hover:scale-110 pointer-events-none z-0">
            <img src={supportImage} className="absolute inset-0 w-full h-full object-cover" alt="Asistencia" />
            <div className="absolute inset-0 bg-gradient-to-b from-black/90 via-black/40 to-transparent"></div>
          </div>

          <div className="flex items-center gap-2 mb-2 z-10">
            <div className="flex gap-[3px]">
              <div className="w-3 h-0.5 bg-[#F5B01D] transform -skew-x-[30deg]"></div>
              <div className="w-3 h-0.5 bg-[#F5B01D] transform -skew-x-[30deg]"></div>
            </div>
            <span className="text-[10px] font-bold tracking-widest uppercase text-[#F5B01D]">Soporte al Cliente</span>
          </div>
          
          <h3 className="text-2xl xl:text-3xl font-black leading-tight mb-6 z-10">
            Asistencia Experta 24h Soporte
          </h3>
          
          <button 
            onClick={() => slug === "preview" ? window.dispatchEvent(new CustomEvent("preview-nav", { detail: "catalogo" })) : navigate(`/tienda/${slug}/catalogo`)}
            className="text-xs font-bold text-red-500 hover:text-red-400 flex items-center gap-1.5 z-10 transition-colors w-max"
          >
            Empezar <Icon icon="solar:arrow-right-up-linear" className="bg-red-500 text-black rounded-full w-4 h-4 p-0.5" />
          </button>
        </div>
      </div>

      {/* Right Products Column (3/4 width on desktop) */}
      <div className="w-full lg:w-3/4 flex flex-col">
        <h2 className="text-3xl md:text-4xl font-black text-gray-900 tracking-tight mb-8 pt-2">
          Productos Más Buscados
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {displayProducts.map((p) => (
            <ProductCardAutopartes 
              key={p.id}
              producto={p}
              slug={slug}
              diseno={diseno}
              onAddToCart={onAddToCart}
              onClick={() => navigate(`/tienda/${slug}/producto/${p.id}`)}
            />
          ))}
        </div>
      </div>

    </div>
  );
}
