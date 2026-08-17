import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LogIn, ShoppingCart, Phone } from 'lucide-react';

const Header = () => {
  return (
    <motion.header 
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="fixed top-0 left-0 right-0 z-50 bg-[#0A0D14]/80 backdrop-blur-xl border-b border-white/5"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          {/* Logo */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center gap-2">
              <img src="/src/assets/logo.png" alt="Vendify Logo" className="h-10 w-auto" />
              <span className="text-white font-bold text-xl tracking-tight">VENDIFY</span>
            </Link>
          </div>

          {/* Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            <Link to="#" className="text-gray-400 hover:text-white transition-colors text-sm font-medium">Negocios</Link>
            <Link to="#" className="text-gray-400 hover:text-white transition-colors text-sm font-medium">Restaurantes</Link>
            <Link to="#" className="text-gray-400 hover:text-white transition-colors text-sm font-medium">Corporativo</Link>
            <Link to="#" className="text-gray-400 hover:text-white transition-colors text-sm font-medium flex items-center gap-1">
              Sistemas de Facturación
              <span className="bg-blue-500/20 text-blue-400 text-[10px] px-1.5 py-0.5 rounded uppercase">Nuevo</span>
            </Link>
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-4">
            <a href="tel:+5116804448" className="hidden lg:flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
              <Phone size={18} />
              <span className="text-sm font-medium">Llámanos</span>
            </a>
            
            <Link 
              to="/login" 
              className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-5 py-2.5 rounded-full transition-all border border-white/10 text-sm font-semibold"
            >
              <LogIn size={18} />
              Ingresar
            </Link>

            <Link 
              to="#" 
              className="relative p-2.5 text-gray-400 hover:text-white transition-colors"
            >
              <ShoppingCart size={22} />
              <span className="absolute top-0 right-0 w-4 h-4 bg-blue-600 text-white text-[10px] flex items-center justify-center rounded-full border-2 border-[#0A0D14]">0</span>
            </Link>
          </div>
        </div>
      </div>
    </motion.header>
  );
};

export default Header;
