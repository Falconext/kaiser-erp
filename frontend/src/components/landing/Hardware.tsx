import React from 'react';
import { motion } from 'framer-motion';
import { Printer, Wifi, Battery, MonitorSmartphone } from 'lucide-react';

const hardwareList = [
  {
    name: "Falcon 1 Todo-en-Uno",
    description: "La solución POS definitiva. Pantalla amplia, impresora térmica integrada de 80mm y control total en un solo equipo.",
    image: "/src/assets/bannermype.png", // Usando un asset existente como placeholder visual
    specs: [
      { icon: <MonitorSmartphone size={16} />, text: "Pantalla táctil HD 10.1\"" },
      { icon: <Printer size={16} />, text: "Impresora Seiko 80mm" },
      { icon: <Wifi size={16} />, text: "Wi-Fi & Bluetooth 5.0" }
    ],
    price: "S/ 1,995.00"
  },
  {
    name: "Swift 2 Portátil",
    description: "Lleva tu punto de venta a cualquier lugar. Ideal para ferias, restaurantes y venta en ruta con batería de larga duración.",
    image: "/src/assets/demo.webp", // Usando un asset existente como placeholder visual
    specs: [
      { icon: <Battery size={16} />, text: "Batería 10 horas" },
      { icon: <Printer size={16} />, text: "Impresora térmica 58mm" },
      { icon: <Wifi size={16} />, text: "Conectividad 4G LTE" }
    ],
    price: "S/ 850.00"
  }
];

const Hardware = () => {
  return (
    <section className="py-24 bg-[#0A0D14] relative border-t border-white/5" id="equipos">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          
          <motion.div 
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Equipa tu negocio con la <span className="text-blue-500">mejor tecnología</span>
            </h2>
            <p className="text-gray-400 text-lg mb-8 leading-relaxed">
              Descubre nuestra línea de terminales POS diseñados para máxima eficiencia. Equipos robustos, rápidos y con el sistema Vendify preinstalado listos para usar.
            </p>

            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-500 shrink-0">
                  <Printer size={24} />
                </div>
                <div>
                  <h4 className="text-white font-bold text-lg">Impresión Inmediata</h4>
                  <p className="text-gray-400 text-sm">Entrega comprobantes físicos en milisegundos con tecnología térmica sin tinta.</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-purple-500/10 flex items-center justify-center text-purple-500 shrink-0">
                  <Battery size={24} />
                </div>
                <div>
                  <h4 className="text-white font-bold text-lg">Batería de Larga Duración</h4>
                  <p className="text-gray-400 text-sm">Mantén tus operaciones sin interrupciones durante toda la jornada laboral.</p>
                </div>
              </div>
            </div>

            <button className="mt-10 px-8 py-4 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-2xl font-bold transition-all flex items-center gap-2">
              Ver Catálogo Completo
            </button>
          </motion.div>

          <div className="grid gap-8">
            {hardwareList.map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.2 }}
                className="bg-[#111622] rounded-3xl p-6 border border-white/5 flex flex-col sm:flex-row gap-6 items-center group hover:border-blue-500/30 transition-all duration-300"
              >
                <div className="w-40 h-40 bg-black/40 rounded-2xl overflow-hidden shrink-0 flex items-center justify-center p-4 group-hover:scale-105 transition-transform duration-500">
                  <img src={item.image} alt={item.name} className="w-full h-full object-contain opacity-80" />
                </div>
                
                <div className="flex-1 text-center sm:text-left">
                  <h3 className="text-xl font-bold text-white mb-2">{item.name}</h3>
                  <p className="text-gray-400 text-sm mb-4 line-clamp-2">{item.description}</p>
                  
                  <div className="flex flex-wrap gap-3 mb-4 justify-center sm:justify-start">
                    {item.specs.map((spec, i) => (
                      <span key={i} className="flex items-center gap-1.5 text-xs font-medium text-gray-300 bg-white/5 px-2.5 py-1 rounded-md">
                        <span className="text-blue-400">{spec.icon}</span>
                        {spec.text}
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center justify-between mt-auto">
                    <span className="text-xl font-bold text-white">{item.price}</span>
                    <button className="text-sm font-bold text-blue-400 hover:text-blue-300 px-4 py-2 bg-blue-500/10 hover:bg-blue-500/20 rounded-lg transition-colors">
                      Comprar
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

        </div>
      </div>
    </section>
  );
};

export default Hardware;
