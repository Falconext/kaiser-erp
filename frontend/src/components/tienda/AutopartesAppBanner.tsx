import React from 'react';
import { Icon } from '@iconify/react';

interface Props {
  cp: string;
}

export default function AutopartesAppBanner({ cp }: Props) {
  return (
    <div className="w-full max-w-7xl mx-auto px-4 xl:px-8 py-8 mb-16 font-sans">
      <div className="w-full rounded-2xl overflow-hidden relative flex flex-col items-center justify-center py-20 text-center shadow-2xl border border-gray-800 bg-[#0B0B0B]">
        
        {/* Background Image */}
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-black/70 z-10"></div>
          <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black opacity-80 z-10"></div>
          <img src="https://images.unsplash.com/photo-1542282088-fe8426682b8f?q=80&w=1600&auto=format&fit=crop" alt="Car" className="w-full h-full object-cover grayscale opacity-50" />
        </div>

        <div className="relative z-20 max-w-3xl px-6">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="flex gap-[3px]">
              <div className="w-4 h-0.5 transform -skew-x-[30deg]" style={{ backgroundColor: cp }}></div>
              <div className="w-4 h-0.5 transform -skew-x-[30deg]" style={{ backgroundColor: cp }}></div>
            </div>
            <span className="text-sm font-bold" style={{ color: cp }}>Nuestras Apps</span>
          </div>
          
          <h2 className="text-4xl md:text-5xl font-black text-white leading-tight mb-6">
            Nuestra App Está Disponible Gratis<br/>
            Compremos Juntos
          </h2>
          
          <p className="text-gray-400 text-sm md:text-base mb-10 max-w-2xl mx-auto">
            Descarga nuestra aplicación móvil y disfruta de beneficios exclusivos. Encuentra repuestos, haz seguimiento de tus pedidos y recibe asesoría en tiempo real directamente desde tu celular.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button className="flex items-center gap-3 bg-[#DB4437] text-white px-6 py-3 rounded hover:bg-red-700 transition-colors">
              <Icon icon="logos:google-play-icon" width={24} />
              <div className="flex flex-col items-start">
                <span className="text-[10px] leading-none uppercase">Consíguelo en</span>
                <span className="text-sm font-bold leading-none mt-1">Google Play</span>
              </div>
            </button>
            <button className="flex items-center gap-3 bg-white text-black px-6 py-3 rounded hover:bg-gray-100 transition-colors">
              <Icon icon="ic:baseline-apple" width={28} />
              <div className="flex flex-col items-start">
                <span className="text-[10px] leading-none uppercase text-gray-600">Consíguelo en</span>
                <span className="text-sm font-bold leading-none mt-1">App Store</span>
              </div>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
