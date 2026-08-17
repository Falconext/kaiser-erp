import React from 'react';
import { motion } from 'framer-motion';
import { Check, Info } from 'lucide-react';

const plans = [
  {
    name: "Gratis",
    price: "0",
    period: "mes",
    description: "Ideal para emprendedores que inician. Sin costo oculto.",
    popular: false,
    features: [
      "Notas de venta ilimitadas",
      "50 comprobantes electrónicos",
      "1 licencia para gestión",
      "Hasta 500 productos",
      "Apertura y cierre de caja",
      "Certificado Digital PSE",
      "Soporte básico por correo"
    ]
  },
  {
    name: "Despegar",
    price: "49",
    period: "mes",
    description: "Para negocios con facturación regular. El más elegido.",
    popular: true,
    features: [
      "Notas de venta ilimitadas",
      "100 comprobantes electrónicos",
      "1 licencia para ventas",
      "Hasta 1,500 productos",
      "Apertura y cierre de caja",
      "Certificado Digital PSE",
      "Soporte por teléfono y chat"
    ]
  },
  {
    name: "Power",
    price: "100",
    period: "mes",
    description: "Para negocios en expansión con múltiples usuarios.",
    popular: false,
    features: [
      "Comprobantes ILIMITADOS",
      "Notas de venta ilimitadas",
      "3 licencias (Admin, Ventas, Logística)",
      "Hasta 6,000 productos",
      "Gestión de inventario avanzada",
      "Múltiples sucursales (Sedes)",
      "Soporte prioritario 24/7"
    ]
  },
  {
    name: "Full",
    price: "1416",
    period: "anual",
    description: "Todo ilimitado. La solución definitiva para grandes operaciones.",
    popular: false,
    features: [
      "Comprobantes ILIMITADOS",
      "Usuarios ILIMITADOS",
      "Productos ILIMITADOS",
      "Opción de Holding (Múltiples RUCs)",
      "Integración API contable",
      "Gestión de restaurantes/Mesas",
      "Asesor personal dedicado"
    ]
  }
];

const Pricing = () => {
  return (
    <section className="py-24 bg-[#05080E] relative overflow-hidden" id="planes">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center mb-20">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-4xl md:text-5xl font-bold text-white mb-6"
          >
            Planes diseñados para tu <span className="text-blue-500">éxito</span>
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-gray-400 max-w-2xl mx-auto text-lg"
          >
            Empieza gratis hoy y escala a medida que tu negocio crece. Sin contratos forzosos, cancela cuando quieras.
          </motion.p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {plans.map((plan, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className={`relative p-8 rounded-3xl border flex flex-col ${
                plan.popular 
                  ? 'bg-gradient-to-b from-blue-900/20 to-blue-900/5 border-blue-500 shadow-2xl shadow-blue-500/10 transform lg:-translate-y-4' 
                  : 'bg-[#0A0D14] border-white/10 hover:border-white/20'
              }`}
            >
              {plan.popular && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2">
                  <span className="bg-blue-500 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider flex items-center gap-1 shadow-lg shadow-blue-500/30">
                    <span className="w-2 h-2 rounded-full bg-white animate-pulse"></span>
                    MÁS ELEGIDO
                  </span>
                </div>
              )}

              <div className="mb-6">
                <h3 className="text-xl font-bold text-white mb-2">{plan.name}</h3>
                <p className="text-sm text-gray-400 h-10">{plan.description}</p>
              </div>

              <div className="mb-6 flex items-baseline gap-1">
                <span className="text-gray-400 font-medium">S/</span>
                <span className="text-4xl font-extrabold text-white">{plan.price}</span>
                <span className="text-gray-500 text-sm">/{plan.period}</span>
              </div>

              <div className="flex-grow space-y-4 mb-8">
                {plan.features.map((feature, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className={`mt-0.5 rounded-full p-0.5 ${plan.popular ? 'bg-blue-500/20 text-blue-400' : 'bg-white/5 text-gray-400'}`}>
                      <Check size={14} strokeWidth={3} />
                    </div>
                    <span className="text-sm text-gray-300 leading-tight">{feature}</span>
                  </div>
                ))}
              </div>

              <button 
                className={`w-full py-4 rounded-2xl font-bold transition-all ${
                  plan.popular 
                    ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/20' 
                    : 'bg-white/5 hover:bg-white/10 text-white border border-white/10'
                }`}
              >
                {plan.price === "0" ? "Comenzar Gratis" : "Adquirir Plan"}
              </button>
            </motion.div>
          ))}
        </div>

        <div className="mt-12 flex justify-center items-center gap-2 text-gray-500 text-sm">
          <Info size={16} />
          <p>Los precios no incluyen IGV. Planes sujetos a términos y condiciones.</p>
        </div>
      </div>
    </section>
  );
};

export default Pricing;
