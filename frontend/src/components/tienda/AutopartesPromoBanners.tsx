import React from 'react';
import { Icon } from '@iconify/react';
import { useNavigate } from 'react-router-dom';

interface AutopartesPromoBannersProps {
  cp: string;
  slug: string;
  diseno?: any;
}

export default function AutopartesPromoBanners({ cp, slug, diseno }: AutopartesPromoBannersProps) {
  const navigate = useNavigate();
  const promoLeftImage = diseno?.autopartesPromoLeftImageUrl || '/assets/templates/autopartes/llantas.png';
  const promoRightImage = diseno?.autopartesPromoRightImageUrl || '/assets/templates/autopartes/luces.png';

  return (
    <div className="w-full grid grid-cols-1 lg:grid-cols-2 gap-6">
      
      {/* Left Banner */}
      <div className="bg-black rounded-2xl overflow-hidden relative min-h-[360px] flex items-center p-8 md:p-12 border border-gray-800">
        <div className="absolute inset-0 w-full h-full pointer-events-none z-0">
          <img src={promoLeftImage} alt="Mecánico cambiando llanta" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/40 to-transparent z-10"></div>
        </div>
        
        <div className="relative z-20 max-w-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-px" style={{ backgroundColor: '#F5B01D' }}></div>
            <span className="text-sm font-bold" style={{ color: '#F5B01D' }}>Oferta Black Friday 20%</span>
          </div>
          
          <h3 className="text-4xl md:text-5xl font-black text-white leading-tight mb-8">
            Colección de <br/>
            Llantas y Ruedas
          </h3>
          
          <button 
            onClick={() => slug === "preview" ? window.dispatchEvent(new CustomEvent("preview-nav", { detail: "catalogo" })) : navigate(`/tienda/${slug}/catalogo`)}
            className="px-6 py-2.5 text-white font-bold rounded flex items-center gap-2 hover:opacity-90 transition-opacity"
            style={{ backgroundColor: cp }}
          >
            Ver Ahora 
            <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center">
              <Icon icon="solar:arrow-right-up-linear" width={12} />
            </div>
          </button>
        </div>
      </div>

      {/* Right Banner */}
      <div className="bg-black rounded-2xl overflow-hidden relative min-h-[360px] flex items-center p-8 md:p-12 border border-gray-800">
        <div className="absolute inset-0 w-full h-full pointer-events-none z-0">
          <img src={promoRightImage} alt="Luces de auto" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/40 to-transparent z-10"></div>
        </div>
        
        <div className="relative z-20 max-w-sm">
          <div className="inline-block px-3 py-1 bg-[#00C4B5] text-white text-xs font-bold rounded mb-4">
            Mejores Marcas
          </div>
          
          <h3 className="text-xl md:text-2xl text-gray-300 mb-1">Luces y Faros</h3>
          <h2 className="text-4xl md:text-5xl font-black mb-8" style={{ color: '#F5B01D' }}>
            Mega Oferta
          </h2>
          
          <button 
            onClick={() => slug === "preview" ? window.dispatchEvent(new CustomEvent("preview-nav", { detail: "catalogo" })) : navigate(`/tienda/${slug}/catalogo`)}
            className="px-8 py-3 bg-white text-black font-bold rounded hover:bg-gray-100 transition-colors"
          >
            Comprar Ahora
          </button>
        </div>
      </div>

    </div>
  );
}
