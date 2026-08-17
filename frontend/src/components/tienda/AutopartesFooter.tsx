import React from 'react';
import { BRAND } from '@/lib/branding';
import { Icon } from '@iconify/react';
import { Link } from 'react-router-dom';

interface Props {
  tienda: any;
  slug: string;
  diseno: any;
}

export default function AutopartesFooter({ tienda, slug, diseno }: Props) {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="w-full">
      {/* Top Features Strip */}
      <div className="w-full bg-white border-t border-gray-100 relative z-20">
        <div className="w-full max-w-7xl mx-auto px-4 xl:px-8 py-10 md:py-14">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-4 divide-y md:divide-y-0 md:divide-x divide-gray-100">
            
            {/* Feature 1 */}
            <div className="flex flex-col items-center text-center px-4 pt-4 md:pt-0">
              <div className="w-14 h-14 bg-red-600 text-white rounded-full flex items-center justify-center mb-4 shadow-lg shadow-red-600/30">
                <Icon icon="mdi:truck-fast" width={28} />
              </div>
              <h4 className="text-sm font-bold text-gray-900 mb-2">Envío a Todo el Mundo</h4>
              <p className="text-[11px] text-gray-500 leading-relaxed max-w-[200px]">
                Con nuestros socios estratégicos, aseguramos la entrega más rápida a más de 120 destinos mundiales.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="flex flex-col items-center text-center px-4 pt-8 md:pt-0">
              <div className="w-14 h-14 bg-red-600 text-white rounded-full flex items-center justify-center mb-4 shadow-lg shadow-red-600/30">
                <Icon icon="solar:card-bold" width={28} />
              </div>
              <h4 className="text-sm font-bold text-gray-900 mb-2">Compra Segura</h4>
              <p className="text-[11px] text-gray-500 leading-relaxed max-w-[200px]">
                Compra con confianza gracias a nuestros protocolos de seguridad y encriptación de última generación.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="flex flex-col items-center text-center px-4 pt-8 md:pt-0">
              <div className="w-14 h-14 bg-red-600 text-white rounded-full flex items-center justify-center mb-4 shadow-lg shadow-red-600/30">
                <Icon icon="solar:refresh-circle-bold" width={28} />
              </div>
              <h4 className="text-sm font-bold text-gray-900 mb-2">Devoluciones Gratis</h4>
              <p className="text-[11px] text-gray-500 leading-relaxed max-w-[200px]">
                Nuestra política de devolución flexible garantiza la satisfacción del cliente.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="flex flex-col items-center text-center px-4 pt-8 md:pt-0">
              <div className="w-14 h-14 bg-red-600 text-white rounded-full flex items-center justify-center mb-4 shadow-lg shadow-red-600/30">
                <Icon icon="solar:headphones-round-bold" width={28} />
              </div>
              <h4 className="text-sm font-bold text-gray-900 mb-2">Centro de Ayuda 24/7</h4>
              <p className="text-[11px] text-gray-500 leading-relaxed max-w-[200px]">
                Nuestro equipo profesional de representantes de ventas está siempre feliz de ayudar.
              </p>
            </div>

          </div>
        </div>
      </div>

      {/* Main Dark Footer Area */}
      <div className="w-full bg-[#111111] text-white pt-20 pb-10 relative overflow-hidden">
        {/* Background dark geometric pattern */}
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-20 z-0">
          <div className="absolute left-[-20%] top-0 w-[50%] h-[150%] bg-[#1A1A1A] transform rotate-45 mix-blend-screen"></div>
          <div className="absolute right-[-10%] bottom-[-50%] w-[40%] h-[150%] bg-[#1A1A1A] transform -rotate-12 mix-blend-screen"></div>
        </div>

        <div className="w-full max-w-7xl mx-auto px-4 xl:px-8 relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-10">
            
            {/* Help Information */}
            <div className="lg:col-span-2 pr-4">
              <h4 className="text-white font-bold text-base mb-6 relative w-max pb-3">
                Información de Ayuda
                <div className="absolute bottom-0 left-0 w-8 h-0.5 bg-red-600"></div>
              </h4>
              <p className="text-gray-400 text-xs leading-relaxed mb-8">
                Muestra de manera destacada la lista de los más vendidos en la página de inicio de tu sitio web de múltiples vendedores. Esto será lo primero que vean los visitantes.
              </p>
              
              <div className="flex flex-col gap-4 mb-8">
                <a href="#" className="flex items-center gap-3 text-gray-300 hover:text-white transition-colors">
                  <Icon icon="solar:phone-calling-linear" className="text-xl" />
                  <span className="text-sm">+900 1175 423 512</span>
                </a>
                <a href="#" className="flex items-center gap-3 text-gray-300 hover:text-white transition-colors">
                  <Icon icon="solar:letter-linear" className="text-xl" />
                  <span className="text-sm">contacto@tutienda.com</span>
                </a>
              </div>

              <div className="flex items-center gap-3">
                <a href="#" className="w-8 h-8 rounded-full bg-red-600 text-white flex items-center justify-center hover:bg-red-700 transition-colors">
                  <Icon icon="mdi:twitter" />
                </a>
                <a href="#" className="w-8 h-8 rounded-full bg-[#1A1A1A] border border-gray-800 text-gray-400 flex items-center justify-center hover:bg-gray-800 transition-colors">
                  <Icon icon="mdi:facebook" />
                </a>
                <a href="#" className="w-8 h-8 rounded-full bg-[#1A1A1A] border border-gray-800 text-gray-400 flex items-center justify-center hover:bg-gray-800 transition-colors">
                  <Icon icon="mdi:web" />
                </a>
                <a href="#" className="w-8 h-8 rounded-full bg-[#1A1A1A] border border-gray-800 text-gray-400 flex items-center justify-center hover:bg-gray-800 transition-colors">
                  <Icon icon="mdi:behance" />
                </a>
              </div>
            </div>

            {/* More About Us */}
            <div>
              <h4 className="text-white font-bold text-base mb-6 relative w-max pb-3">
                Más Sobre Nosotros
                <div className="absolute bottom-0 left-0 w-8 h-0.5 bg-red-600"></div>
              </h4>
              <ul className="flex flex-col gap-3">
                <li><Link to="#" className="text-xs text-gray-400 hover:text-white transition-colors">Nuestra Historia Corporativa</Link></li>
                <li><Link to="#" className="text-xs text-gray-400 hover:text-white transition-colors">Marcas & Socios</Link></li>
                <li><Link to="#" className="text-xs text-gray-400 hover:text-white transition-colors">Nuestras Apps</Link></li>
                <li><Link to="#" className="text-xs text-gray-400 hover:text-white transition-colors">Campaña RSC</Link></li>
                <li><Link to="#" className="text-xs text-gray-400 hover:text-white transition-colors">Clima Para el Cambio</Link></li>
                <li><Link to="#" className="text-xs text-gray-400 hover:text-white transition-colors">Próximos Esfuerzos</Link></li>
                <li><Link to="#" className="text-xs text-gray-400 hover:text-white transition-colors">Blog</Link></li>
              </ul>
            </div>

            {/* Customer Services */}
            <div>
              <h4 className="text-white font-bold text-base mb-6 relative w-max pb-3">
                Servicio al Cliente
                <div className="absolute bottom-0 left-0 w-8 h-0.5 bg-red-600"></div>
              </h4>
              <ul className="flex flex-col gap-3">
                <li><Link to="#" className="text-xs text-gray-400 hover:text-white transition-colors">Mi Cuenta</Link></li>
                <li><Link to="#" className="text-xs text-gray-400 hover:text-white transition-colors">Rastrear Tu Pedido</Link></li>
                <li><Link to="#" className="text-xs text-gray-400 hover:text-white transition-colors">Programa de Lealtad</Link></li>
                <li><Link to="#" className="text-xs text-gray-400 hover:text-white transition-colors">Centro de Ayuda</Link></li>
                <li><Link to="#" className="text-xs text-gray-400 hover:text-white transition-colors">Contáctanos</Link></li>
                <li><Link to="#" className="text-xs text-gray-400 hover:text-white transition-colors">Preguntas Frecuentes</Link></li>
              </ul>
            </div>

            {/* Store Navigation */}
            <div>
              <h4 className="text-white font-bold text-base mb-6 relative w-max pb-3">
                Navegación
                <div className="absolute bottom-0 left-0 w-8 h-0.5 bg-red-600"></div>
              </h4>
              <ul className="flex flex-col gap-3">
                <li><Link to="#" className="text-xs text-gray-400 hover:text-white transition-colors">Catálogo de Autos</Link></li>
                <li><Link to="#" className="text-xs text-gray-400 hover:text-white transition-colors">Tienda de Llantas</Link></li>
                <li><Link to="#" className="text-xs text-gray-400 hover:text-white transition-colors">Fluidos y Lubricantes</Link></li>
                <li><Link to="#" className="text-xs text-gray-400 hover:text-white transition-colors">Baterías</Link></li>
                <li><Link to="#" className="text-xs text-gray-400 hover:text-white transition-colors">Herramientas</Link></li>
                <li><Link to="#" className="text-xs text-gray-400 hover:text-white transition-colors">Camiones</Link></li>
                <li><Link to="#" className="text-xs text-gray-400 hover:text-white transition-colors">Motocicletas</Link></li>
                <li><Link to="#" className="text-xs text-gray-400 hover:text-white transition-colors">Bahía de Eléctricos</Link></li>
              </ul>
            </div>

            {/* Policies & Legal */}
            <div>
              <h4 className="text-white font-bold text-base mb-6 relative w-max pb-3">
                Políticas y Legales
                <div className="absolute bottom-0 left-0 w-8 h-0.5 bg-red-600"></div>
              </h4>
              <ul className="flex flex-col gap-3">
                <li><Link to="#" className="text-xs text-gray-400 hover:text-white transition-colors">Términos y Condiciones</Link></li>
                <li><Link to="#" className="text-xs text-gray-400 hover:text-white transition-colors">Política de Envío</Link></li>
                <li><Link to="#" className="text-xs text-gray-400 hover:text-white transition-colors">Política de Privacidad</Link></li>
                <li><Link to="#" className="text-xs text-gray-400 hover:text-white transition-colors">Política de Seguridad</Link></li>
                <li><Link to="#" className="text-xs text-gray-400 hover:text-white transition-colors">Política de Cookies</Link></li>
                <li><Link to="#" className="text-xs text-gray-400 hover:text-white transition-colors">Devoluciones y Reembolsos</Link></li>
              </ul>
            </div>

          </div>

          <div className="mt-16 pt-8 border-t border-gray-800 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-[11px] text-gray-500">
              ©copyright {currentYear} . Diseñado Por <span className="text-white font-bold">{BRAND.name}</span>
            </p>
            <div className="flex items-center gap-6">
              <Link to="#" className="text-[11px] text-gray-400 hover:text-white transition-colors">Política de Privacidad</Link>
              <Link to="#" className="text-[11px] text-gray-400 hover:text-white transition-colors">Términos de Uso</Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
