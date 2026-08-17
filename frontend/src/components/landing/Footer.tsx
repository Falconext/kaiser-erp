import React from 'react';
import { Facebook, Instagram, Linkedin, Twitter, Mail, MapPin, Phone } from 'lucide-react';
import { Link } from 'react-router-dom';

const Footer = () => {
  return (
    <footer className="bg-[#05080E] border-t border-white/5 pt-20 pb-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
          
          {/* Brand & Info */}
          <div className="lg:col-span-1">
            <Link to="/" className="flex items-center gap-2 mb-6">
              <img src="/src/assets/logo.png" alt="Vendify Logo" className="h-10 w-auto opacity-90 grayscale contrast-200 brightness-200" />
              <span className="text-white font-bold text-xl tracking-tight">VENDIFY</span>
            </Link>
            <p className="text-gray-400 text-sm leading-relaxed mb-6">
              El sistema POS y Facturación Electrónica más completo y rápido del Perú. Diseñado para potenciar negocios de todos los tamaños.
            </p>
            <div className="flex items-center gap-4">
              <a href="#" className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-colors">
                <Facebook size={18} />
              </a>
              <a href="#" className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-colors">
                <Instagram size={18} />
              </a>
              <a href="#" className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-colors">
                <Linkedin size={18} />
              </a>
              <a href="#" className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-colors">
                <Twitter size={18} />
              </a>
            </div>
          </div>

          {/* Enlaces Rápidos */}
          <div>
            <h4 className="text-white font-bold mb-6">Enlaces Rápidos</h4>
            <ul className="space-y-4">
              <li><a href="#" className="text-gray-400 hover:text-blue-400 transition-colors text-sm">Inicio</a></li>
              <li><a href="#features" className="text-gray-400 hover:text-blue-400 transition-colors text-sm">Características</a></li>
              <li><a href="#planes" className="text-gray-400 hover:text-blue-400 transition-colors text-sm">Planes y Precios</a></li>
              <li><a href="#equipos" className="text-gray-400 hover:text-blue-400 transition-colors text-sm">Equipos POS</a></li>
              <li><a href="#" className="text-gray-400 hover:text-blue-400 transition-colors text-sm">Blog</a></li>
            </ul>
          </div>

          {/* Soluciones */}
          <div>
            <h4 className="text-white font-bold mb-6">Soluciones</h4>
            <ul className="space-y-4">
              <li><a href="#" className="text-gray-400 hover:text-blue-400 transition-colors text-sm">Para Restaurantes</a></li>
              <li><a href="#" className="text-gray-400 hover:text-blue-400 transition-colors text-sm">Para Minimarkets</a></li>
              <li><a href="#" className="text-gray-400 hover:text-blue-400 transition-colors text-sm">Para Tiendas de Ropa</a></li>
              <li><a href="#" className="text-gray-400 hover:text-blue-400 transition-colors text-sm">Para Ferreterías</a></li>
              <li><a href="#" className="text-gray-400 hover:text-blue-400 transition-colors text-sm">Plan Corporativo</a></li>
            </ul>
          </div>

          {/* Contacto */}
          <div>
            <h4 className="text-white font-bold mb-6">Contacto</h4>
            <ul className="space-y-4">
              <li className="flex items-start gap-3 text-gray-400 text-sm">
                <MapPin size={18} className="text-blue-500 shrink-0 mt-0.5" />
                <span>Av. Principal 123, San Isidro<br/>Lima, Perú</span>
              </li>
              <li className="flex items-center gap-3 text-gray-400 text-sm">
                <Phone size={18} className="text-blue-500 shrink-0" />
                <span>+51 1 680 4448</span>
              </li>
              <li className="flex items-center gap-3 text-gray-400 text-sm">
                <Mail size={18} className="text-blue-500 shrink-0" />
                <span>contacto@vendify.pe</span>
              </li>
            </ul>
          </div>

        </div>

        {/* Bottom */}
        <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-gray-500 text-sm text-center md:text-left">
            &copy; {new Date().getFullYear()} Vendify. Todos los derechos reservados.
          </p>
          <div className="flex gap-6">
            <a href="#" className="text-gray-500 hover:text-white text-sm transition-colors">Términos y Condiciones</a>
            <a href="#" className="text-gray-500 hover:text-white text-sm transition-colors">Política de Privacidad</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
