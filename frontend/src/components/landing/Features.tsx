import React from 'react';
import { motion } from 'framer-motion';
import { FileText, Package, Users, BarChart3, Cloud, ShieldCheck } from 'lucide-react';

const features = [
  {
    title: "Facturación Ilimitada",
    description: "Emite boletas, facturas y notas de venta sin restricciones. Conexión directa con SUNAT garantizada.",
    icon: <FileText className="text-blue-500" size={24} />,
    color: "blue"
  },
  {
    title: "Control de Inventario",
    description: "Gestiona tu stock en tiempo real, alertas de stock bajo y movimientos de Kardex automatizados.",
    icon: <Package className="text-purple-500" size={24} />,
    color: "purple"
  },
  {
    title: "Multi-usuario & Roles",
    description: "Licencias separadas para administración, ventas, logística y contabilidad para un control total.",
    icon: <Users className="text-green-500" size={24} />,
    color: "green"
  },
  {
    title: "Reportes Inteligentes",
    description: "Visualiza tus ventas, utilidades y flujo de caja con dashboards interactivos y reportes exportables.",
    icon: <BarChart3 className="text-orange-500" size={24} />,
    color: "orange"
  },
  {
    title: "Sincronización Cloud",
    description: "Accede a tu información desde cualquier lugar, dispositivo o país. Tu negocio siempre contigo.",
    icon: <Cloud className="text-cyan-500" size={24} />,
    color: "cyan"
  },
  {
    title: "Seguridad Bancaria",
    description: "Tus datos están protegidos con encriptación de grado militar y respaldos automáticos diarios.",
    icon: <ShieldCheck className="text-indigo-500" size={24} />,
    color: "indigo"
  }
];

const Features = () => {
  return (
    <section className="py-24 bg-[#0A0D14] relative overflow-hidden" id="features">
      {/* Background patterns */}
      <div className="absolute top-1/2 left-0 -translate-y-1/2 w-[30rem] h-[30rem] bg-blue-600/5 blur-[120px] rounded-full -z-10" />
      <div className="absolute bottom-0 right-0 w-[30rem] h-[30rem] bg-purple-600/5 blur-[120px] rounded-full -z-10" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center mb-20">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-4xl md:text-5xl font-bold text-white mb-6"
          >
            Todo lo que necesitas para <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">crecer</span>
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-gray-400 max-w-2xl mx-auto text-lg"
          >
            Nuestra plataforma está diseñada para simplificar la gestión de tu negocio, permitiéndote enfocarte en lo que realmente importa: vender y expandirte.
          </motion.p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="p-8 rounded-3xl bg-white/5 border border-white/5 hover:border-blue-500/30 hover:bg-white/10 transition-all duration-300 group hover:shadow-2xl hover:shadow-blue-500/5"
            >
              <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-blue-500/10 group-hover:border-blue-500/20 transition-all duration-300">
                {feature.icon}
              </div>
              <h3 className="text-xl font-bold text-white mb-3 group-hover:text-blue-400 transition-colors">
                {feature.title}
              </h3>
              <p className="text-gray-400 leading-relaxed text-sm">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;
