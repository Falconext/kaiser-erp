import React from 'react';
import { Icon } from '@iconify/react';

interface Props {
  cp: string;
  diseno?: any;
}

export default function TecnologiaTopSelling({ cp, diseno }: Props) {
  const productImage = diseno?.tecnologiaProductImageUrl || '/assets/templates/tecnologia/producto.png';
  const categories = [
    {
      title: 'Motor y Rendimiento',
      items: [
        { name: 'Aceites de Motor Racing & Motorsport', img: productImage },
        { name: 'Motores Turboalimentados', img: productImage },
        { name: 'Motores de Aspiración Natural', img: productImage },
        { name: 'Sensor de Presión de Sobrealimentación', img: productImage }
      ]
    },
    {
      title: 'Llantas y Ruedas',
      items: [
        { name: 'Llantas de Verano', img: productImage },
        { name: 'Llantas de Pista', img: productImage },
        { name: 'Llantas de Motocicleta', img: productImage },
        { name: 'Llantas para Camión Ligero', img: productImage }
      ]
    },
    {
      title: 'Sistema Eléctrico y Electrónica',
      items: [
        { name: 'Reguladores de Voltaje', img: productImage },
        { name: 'Relés de Gestión de Batería', img: productImage },
        { name: 'Bujías de Precalentamiento', img: productImage },
        { name: 'Sensores de Temperatura', img: productImage }
      ]
    }
  ];

  return (
    <div className="w-full max-w-7xl mx-auto relative z-10 mb-20">
      <div className="flex flex-col items-center justify-center text-center mb-10">
        <div className="flex items-center gap-2 mb-2">
          <div className="flex gap-[3px]">
            <div className="w-3 h-0.5 transform -skew-x-[30deg]" style={{ backgroundColor: cp }}></div>
            <div className="w-3 h-0.5 transform -skew-x-[30deg]" style={{ backgroundColor: cp }}></div>
          </div>
          <span className="text-sm font-bold" style={{ color: cp }}>Top Ventas</span>
          <div className="flex gap-[3px]">
            <div className="w-3 h-0.5 transform -skew-x-[30deg]" style={{ backgroundColor: cp }}></div>
            <div className="w-3 h-0.5 transform -skew-x-[30deg]" style={{ backgroundColor: cp }}></div>
          </div>
        </div>
        
        <h2 className="text-3xl md:text-4xl font-black text-gray-900 tracking-tight mb-3">
          Productos Más Vendidos
        </h2>
        <p className="text-sm text-gray-500 max-w-xl">
          Explora nuestros productos más populares. ¡Equipa tu vehículo con los favoritos!
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 justify-center max-w-6xl mx-auto">
        {categories.map((cat, idx) => (
          <div key={idx} className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm flex flex-col">
            <h3 className="text-lg font-black text-gray-900 mb-6 min-h-[56px]">{cat.title}</h3>
            
            <div className="flex flex-col">
              {cat.items.map((item, i) => (
                <div key={i} className={`flex items-center gap-4 py-4 ${i !== 3 ? 'border-b border-gray-100' : ''}`}>
                  <div className="w-20 h-20 rounded bg-gray-50 flex items-center justify-center shrink-0 border border-gray-100 p-2">
                    <img src={item.img} alt="thumb" className="w-full h-full object-contain mix-blend-multiply opacity-80" />
                  </div>
                  <div className="flex flex-col flex-1">
                    <div className="flex text-[#F5B01D] text-[10px] mb-1">
                      <Icon icon="solar:star-bold" /><Icon icon="solar:star-bold" /><Icon icon="solar:star-bold" /><Icon icon="solar:star-bold" /><Icon icon="solar:star-bold" />
                    </div>
                    <h4 className="text-sm font-bold text-gray-900 leading-tight mb-2 line-clamp-2">
                      {item.name}
                    </h4>
                    <div className="flex items-baseline gap-2">
                      <span className="text-xs font-bold text-gray-400 line-through">S/ 55.00</span>
                      <span className="text-sm font-black text-red-600">S/ 55.00</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

    </div>
  );
}
