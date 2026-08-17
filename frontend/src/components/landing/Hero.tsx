import React from 'react';
import { motion } from 'framer-motion';
import { ChevronRight, Play } from 'lucide-react';

const Hero = () => {
  return (
    <section className="relative pt-32 pb-20 overflow-hidden min-h-screen flex items-center">
      {/* Background Decor */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full -z-10">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/20 blur-[120px] rounded-full" />
        <div className="absolute bottom-[10%] right-[-5%] w-[30%] h-[30%] bg-purple-600/10 blur-[100px] rounded-full" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Content */}
          <motion.div
            initial={{ x: -50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.8 }}
          >
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold uppercase tracking-wider mb-6"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
              </span>
              SISTEMA POS #1 EN PERÚ
            </motion.div>
            
            <h1 className="text-5xl lg:text-7xl font-extrabold text-white leading-tight mb-6">
              Vende más. <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">
                Controla mejor.
              </span>
              <br />
              Gana tiempo.
            </h1>
            
            <p className="text-lg text-gray-400 mb-10 max-w-lg leading-relaxed">
              Vendify es el sistema inteligente que ayuda a emprendedores a escalar sus ventas con facturación electrónica sin límites y gestión total desde cualquier lugar.
            </p>

            <div className="flex flex-wrap gap-4">
              <button className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold transition-all transform hover:scale-105 flex items-center gap-2 shadow-lg shadow-blue-600/20">
                Empezar Gratis
                <ChevronRight size={20} />
              </button>
              <button className="px-8 py-4 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-2xl font-bold transition-all flex items-center gap-2  ">
                <Play size={20} fill="currentColor" />
                Ver Demo
              </button>
            </div>

            <div className="mt-12 flex items-center gap-8 border-t border-white/5 pt-8">
              <div>
                <div className="text-2xl font-bold text-white">28,000+</div>
                <div className="text-sm text-gray-500">Negocios activos</div>
              </div>
              <div className="h-8 w-px bg-white/10" />
              <div>
                <div className="text-2xl font-bold text-white">99.9%</div>
                <div className="text-sm text-gray-500">Uptime SUNAT</div>
              </div>
            </div>
          </motion.div>

          {/* Visual / Mockup */}
          <motion.div
            initial={{ x: 50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.8 }}
            className="relative"
          >
            <div className="relative z-10 rounded-3xl overflow-hidden border border-white/10 shadow-2xl shadow-blue-500/10">
              <img 
                src="/src/assets/mainproject.webp" 
                alt="Vendify Dashboard" 
                className="w-full h-auto transform hover:scale-105 transition-transform duration-700"
              />
            </div>
            
            {/* Floating elements for "Wow" factor */}
            <motion.div 
              animate={{ y: [0, -15, 0] }}
              transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
              className="absolute -top-6 -right-6 z-20 bg-[#0A0D14] p-4 rounded-2xl border border-white/10 shadow-xl backdrop-blur-xl"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center text-green-500 font-bold">
                  S/
                </div>
                <div>
                  <div className="text-[10px] text-gray-500 uppercase font-bold">Venta Reciente</div>
                  <div className="text-sm font-bold text-white">S/ 1,240.00</div>
                </div>
              </div>
            </motion.div>

            <motion.div 
              animate={{ y: [0, 15, 0] }}
              transition={{ repeat: Infinity, duration: 5, ease: "easeInOut", delay: 1 }}
              className="absolute -bottom-10 -left-10 z-20 bg-[#0A0D14] p-4 rounded-2xl border border-white/10 shadow-xl backdrop-blur-xl"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-500">
                  <ChevronRight size={20} />
                </div>
                <div>
                  <div className="text-[10px] text-gray-500 uppercase font-bold">Stock Bajo</div>
                  <div className="text-sm font-bold text-white">5 unidades</div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
