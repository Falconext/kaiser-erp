import React from 'react';
import { Icon } from '@iconify/react';
import { useNavigate } from 'react-router-dom';

interface AutopartesHeroProps {
  cp: string;
  slug: string;
  diseno?: any;
  productos?: any[];
}

export default function AutopartesHero({ cp, slug, diseno, productos }: AutopartesHeroProps) {
  const navigate = useNavigate();

  const heroTitle = diseno?.heroTitle || "Frenos de Motor\nAlta Calidad";
  const heroSubtitle = diseno?.heroSubtitle || "Instalación de repuestos en los servicios de nuestros socios. Por tiempo limitado para clientes nuevos, obtén envío gratis en tus pedidos.";
  const heroImage = diseno?.autopartesHeroImageUrl || '/assets/templates/autopartes/banner1.png';
  const sideTopImage = diseno?.autopartesSideTopImageUrl || '/assets/templates/autopartes/banner2.png';
  const sideBottomImage = diseno?.autopartesSideBottomImageUrl || '/assets/templates/autopartes/banner3.png';
  const vehicleImage = diseno?.autopartesVehicleImageUrl || '/assets/templates/autopartes/banner4.png';

  return (
    <div className="w-full flex flex-col gap-6">
      
      {/* 3-Pane Banner Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
        
        {/* Left Large Banner */}
        <div className="lg:col-span-2 relative bg-black rounded-2xl overflow-hidden min-h-[400px] flex items-center">
          {/* Abstract red glow effect */}
          <div className="absolute -left-32 -top-32 w-96 h-96 rounded-full blur-3xl opacity-20" style={{ backgroundColor: cp }}></div>
          
          <div className="relative z-10 px-8 md:px-12 w-full md:w-2/3 py-12">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-4 h-4 rounded-full flex items-center justify-center border-2 border-[#1A1A1A]" style={{ backgroundColor: cp }}>
                <div className="w-1.5 h-1.5 bg-black rounded-full"></div>
              </div>
              <span className="text-sm font-bold" style={{ color: cp }}>Piezas Más Vendidas de la Semana</span>
            </div>
            
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-black text-white leading-tight mb-4 tracking-tight whitespace-pre-line">
              {heroTitle}
            </h2>
            
            <p className="text-gray-400 text-sm md:text-base leading-relaxed mb-8 max-w-md">
              {heroSubtitle}
            </p>
            
            <div className="flex items-center gap-6">
              <button 
                onClick={() => slug === "preview" ? window.dispatchEvent(new CustomEvent("preview-nav", { detail: "catalogo" })) : navigate(`/tienda/${slug}/catalogo`)}
                className="px-8 py-3.5 text-white font-bold rounded-md hover:opacity-90 transition-opacity"

                style={{ backgroundColor: cp }}
              >
                Ver catálogo
              </button>
              <div className="flex flex-col">
                <span className="text-gray-500 text-sm line-through font-bold">$95.00</span>
                <span className="text-xl font-black" style={{ color: cp }}>$55.00</span>
              </div>
            </div>
          </div>
          
          {/* Image background for left banner */}
          <div className="absolute inset-0 w-full h-full pointer-events-none z-0">
            <img src={heroImage} alt="Repuestos para Motor" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent"></div>
          </div>

          {/* Pagination dots */}
          <div className="absolute bottom-6 right-6 flex items-center gap-2 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 z-20">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: cp }}></div>
            <div className="w-2 h-2 rounded-full bg-white/30"></div>
            <div className="w-2 h-2 rounded-full bg-white/30"></div>
          </div>
        </div>

        {/* Right Banners Column */}
        <div className="flex flex-col gap-4 lg:gap-6">
          
          {/* Top Right Banner */}
          <div className="flex-1 bg-black rounded-2xl overflow-hidden relative min-h-[190px] p-6 flex flex-col justify-center border border-gray-800">
            <div className="absolute inset-0 w-full h-full pointer-events-none z-0">
              <img src={sideTopImage} alt="Fluids" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-r from-black/80 to-transparent"></div>
            </div>
            
            <div className="absolute top-4 left-4 bg-white/10 backdrop-blur-sm px-3 py-1 rounded text-xs font-bold text-white border border-white/20 z-10">
              Ahorra 12%
            </div>
            <div className="mt-6 z-10 relative max-w-[65%]">
              <span className="text-sm font-bold text-[#F5B01D] mb-1 block">Fluidos y Lubricantes</span>
              <h3 className="text-2xl md:text-3xl font-black text-white leading-tight mb-4">
                ¡Colecciones!
              </h3>
              <button 
                onClick={() => slug === "preview" ? window.dispatchEvent(new CustomEvent("preview-nav", { detail: "catalogo" })) : navigate(`/tienda/${slug}/catalogo?q=Fluids`)}
                className="text-sm font-bold text-white hover:text-[#F5B01D] flex items-center gap-1 group"
              >
                Ver Ahora 
                <Icon icon="solar:arrow-right-up-linear" className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </button>
            </div>
          </div>

          {/* Bottom Right Banner */}
          <div className="flex-1 bg-black rounded-2xl overflow-hidden relative min-h-[190px] p-6 flex flex-col justify-center border border-gray-800">
             <div className="absolute inset-0 w-full h-full pointer-events-none z-0">
              <img src={sideBottomImage} alt="Suspension" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-r from-black/80 to-transparent"></div>
            </div>
             <div className="absolute top-4 left-4 bg-white/10 backdrop-blur-sm px-3 py-1 rounded text-xs font-bold text-yellow-500 border border-white/10 z-10">
              Ahorra 12%
            </div>
            <div className="mt-6 z-10 relative max-w-[65%]">
              <h3 className="text-2xl md:text-3xl font-black text-white leading-tight mb-4">
                Piezas de<br/>Suspensión
              </h3>
              <button 
                onClick={() => slug === "preview" ? window.dispatchEvent(new CustomEvent("preview-nav", { detail: "catalogo" })) : navigate(`/tienda/${slug}/catalogo?q=Suspension`)}
                className="px-6 py-2.5 text-sm font-bold text-black bg-[#F5B01D] rounded hover:bg-yellow-400 transition-colors inline-block"
              >
                Comprar Ahora
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* Vehicle Selector Area */}
      <div className="bg-black rounded-2xl w-full p-8 md:p-10 flex flex-col xl:flex-row items-center gap-8 justify-between mt-8 relative overflow-hidden border border-gray-800">
        
        {/* Background Image Banner 4 */}
        <div className="absolute inset-0 w-full h-full pointer-events-none z-0">
          <img src={vehicleImage} alt="Vehicle Background" className="w-full h-full object-cover opacity-60 mix-blend-luminosity" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/70 to-black/40"></div>
        </div>
        
        <div className="w-full relative z-20">
          <h3 className="text-2xl md:text-3xl font-black text-white mb-2">
            Selecciona las Piezas de tu Vehículo
          </h3>
          <p className="text-gray-400 text-sm">
            Colección de más de <span style={{ color: cp }} className="font-bold">40,000+ partes de Autos y Camiones</span>
          </p>
        </div>

        <div className="w-full flex flex-col sm:flex-row items-end gap-4 relative z-20 flex-wrap lg:flex-nowrap max-w-5xl">
          {/* Select Year */}
          <div className="flex flex-col w-full sm:w-auto flex-1">
            <span className="text-[11px] text-gray-400 font-bold ml-1 mb-1.5">Año</span>
            <div className="bg-[#1A1A1A] border border-gray-800 rounded-md px-4 py-3.5 flex items-center justify-between min-w-[160px] cursor-pointer hover:border-gray-600 transition-colors">
              <span className="text-sm font-bold text-gray-300">Seleccionar Año</span>
              <Icon icon="solar:alt-arrow-down-linear" className="text-gray-500" />
            </div>
          </div>
          
          {/* Select Make */}
          <div className="flex flex-col w-full sm:w-auto flex-1">
            <span className="text-[11px] text-gray-400 font-bold ml-1 mb-1.5">Marca</span>
            <div className="bg-[#1A1A1A] border border-gray-800 rounded-md px-4 py-3.5 flex items-center justify-between min-w-[160px] cursor-pointer hover:border-gray-600 transition-colors">
              <span className="text-sm font-bold text-gray-300">Seleccionar Marca</span>
              <Icon icon="solar:alt-arrow-down-linear" className="text-gray-500" />
            </div>
          </div>

          {/* Select Model */}
          <div className="flex flex-col w-full sm:w-auto flex-1">
            <span className="text-[11px] text-gray-400 font-bold ml-1 mb-1.5">Modelo</span>
            <div className="bg-[#1A1A1A] border border-gray-800 rounded-md px-4 py-3.5 flex items-center justify-between min-w-[160px] cursor-pointer hover:border-gray-600 transition-colors">
              <span className="text-sm font-bold text-gray-300">Seleccionar Modelo</span>
              <Icon icon="solar:alt-arrow-down-linear" className="text-gray-500" />
            </div>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto mt-2 sm:mt-0 lg:ml-2">
            <button 
              onClick={() => slug === "preview" ? window.dispatchEvent(new CustomEvent("preview-nav", { detail: "catalogo" })) : navigate(`/tienda/${slug}/catalogo`)}
              className="flex-1 sm:flex-none px-8 py-3.5 flex items-center justify-center gap-2 text-white font-bold rounded-md hover:opacity-90 transition-opacity h-[50px]"
              style={{ backgroundColor: cp }}
            >
              <Icon icon="solar:magnifer-linear" width={18} />
              Buscar
            </button>
            <button className="px-6 py-3.5 bg-[#1A1A1A] text-gray-400 font-bold rounded-md hover:bg-gray-800 transition-colors h-[50px]">
              Limpiar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
