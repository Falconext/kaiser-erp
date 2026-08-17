import React from 'react';
import { BRAND } from '@/lib/branding';
import { Icon } from '@iconify/react';
import { Link } from 'react-router-dom';
import { buildStorePurchaseWhatsappUrl, normalizeStoreWhatsapp } from '@/utils/storeWhatsapp';

interface Props {
  tienda: any;
  slug: string;
  diseno: any;
}

export default function MayeFooter({ tienda, slug, diseno }: Props) {
  const currentYear = new Date().getFullYear();
  const cp = diseno?.colorPrimario || '#D92D20';
  const accentShadow = `${cp}4D`;
  const helpTitle = diseno?.mayeFooterHelpTitle || 'Información de Ayuda';
  const helpText = diseno?.mayeFooterHelpText || 'Encuentra productos disponibles, soporte de compra y atención directa desde nuestra tienda virtual.';
  const phone = normalizeStoreWhatsapp(tienda?.whatsappTienda ?? tienda?.diseno?.whatsappTienda ?? diseno?.whatsappTienda);
  const email = diseno?.mayeFooterEmail || tienda?.email || tienda?.correo || '';
  const whatsappUrl = buildStorePurchaseWhatsappUrl(phone, `Hola, vengo de ${tienda?.nombreComercial || 'la tienda'} y quisiera información.`) ?? undefined;
  const socialLinks = [
    { url: tienda?.twitterUrl || diseno?.twitterUrl, icon: 'mdi:twitter', label: 'Twitter' },
    { url: tienda?.facebookUrl || diseno?.facebookUrl, icon: 'mdi:facebook', label: 'Facebook' },
    { url: tienda?.instagramUrl || diseno?.instagramUrl, icon: 'mdi:instagram', label: 'Instagram' },
    { url: tienda?.tiktokUrl || diseno?.tiktokUrl || diseno?.tiktokLiveUrl, icon: 'ic:baseline-tiktok', label: 'TikTok' },
  ].filter(item => Boolean(item.url));
  const storeLinks = [
    { label: 'Inicio', to: `/tienda/${slug}` },
    { label: 'Catálogo', to: `/tienda/${slug}/catalogo` },
    { label: 'Carrito y checkout', to: `/tienda/${slug}/checkout` },
    { label: 'Seguir pedido', to: `/tienda/${slug}/seguimiento` },
  ];
  const accentIconStyle = {
    backgroundColor: cp,
    boxShadow: `0 18px 30px -14px ${accentShadow}`,
  };
  const featureItems = [
    {
      icon: 'mdi:truck-fast',
      title: diseno?.mayeFooterFeature1Title || 'Despacho coordinado',
      text: diseno?.mayeFooterFeature1Text || 'Envios o recojo segun la configuracion disponible de la tienda.',
    },
    {
      icon: 'solar:card-bold',
      title: diseno?.mayeFooterFeature2Title || 'Pagos confiables',
      text: diseno?.mayeFooterFeature2Text || 'Medios de pago configurados por el negocio para cada pedido.',
    },
    {
      icon: 'solar:refresh-circle-bold',
      title: diseno?.mayeFooterFeature3Title || 'Atención postventa',
      text: diseno?.mayeFooterFeature3Text || 'Consulta cambios, garantia o seguimiento directamente con la tienda.',
    },
    {
      icon: 'solar:headphones-round-bold',
      title: diseno?.mayeFooterFeature4Title || 'Soporte de compra',
      text: diseno?.mayeFooterFeature4Text || 'Contacta al negocio antes o despues de confirmar tu pedido.',
    },
  ];

  return (
    <footer className="w-full">
      {/* Top Features Strip */}
      <div className="w-full bg-white border-t border-gray-100 relative z-20">
        <div className="w-full max-w-7xl mx-auto px-4 xl:px-8 py-10 md:py-14">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-4 divide-y md:divide-y-0 md:divide-x divide-gray-100">
            
            {featureItems.map((item, index) => (
              <div key={item.title} className={`flex flex-col items-center text-center px-4 ${index === 0 ? 'pt-4 md:pt-0' : 'pt-8 md:pt-0'}`}>
                <div className="w-14 h-14 text-white rounded-full flex items-center justify-center mb-4 shadow-lg" style={accentIconStyle}>
                  <Icon icon={item.icon} width={28} />
                </div>
                <h4 className="text-sm font-bold text-gray-900 mb-2">{item.title}</h4>
                <p className="text-[11px] text-gray-500 leading-relaxed max-w-[200px]">{item.text}</p>
              </div>
            ))}

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
                {helpTitle}
                <div className="absolute bottom-0 left-0 w-8 h-0.5" style={{ backgroundColor: cp }}></div>
              </h4>
              <p className="text-gray-400 text-xs leading-relaxed mb-8">
                {helpText}
              </p>
              
              <div className="flex flex-col gap-4 mb-8">
                {phone && (
                  <a href={whatsappUrl} target="_blank" rel="noreferrer" className="flex items-center gap-3 text-gray-300 hover:text-white transition-colors">
                    <Icon icon="solar:phone-calling-linear" className="text-xl" />
                    <span className="text-sm">{phone}</span>
                  </a>
                )}
                {email && (
                  <a href={`mailto:${email}`} className="flex items-center gap-3 text-gray-300 hover:text-white transition-colors">
                    <Icon icon="solar:letter-linear" className="text-xl" />
                    <span className="text-sm">{email}</span>
                  </a>
                )}
              </div>

              {socialLinks.length > 0 && (
                <div className="flex items-center gap-3">
                  {socialLinks.map((item, index) => (
                    <a
                      key={item.label}
                      href={item.url}
                      target="_blank"
                      rel="noreferrer"
                      className={`w-8 h-8 rounded-full flex items-center justify-center transition-opacity hover:opacity-90 ${index === 0 ? 'text-white' : 'bg-[#1A1A1A] border border-gray-800 text-gray-400'}`}
                      style={index === 0 ? { backgroundColor: cp } : undefined}
                      aria-label={item.label}
                    >
                      <Icon icon={item.icon} />
                    </a>
                  ))}
                </div>
              )}
            </div>

            {/* More About Us */}
            <div>
              <h4 className="text-white font-bold text-base mb-6 relative w-max pb-3">
                Más Sobre Nosotros
                <div className="absolute bottom-0 left-0 w-8 h-0.5" style={{ backgroundColor: cp }}></div>
              </h4>
              <ul className="flex flex-col gap-3">
                <li><Link to={`/tienda/${slug}`} className="text-xs text-gray-400 hover:text-white transition-colors">Inicio</Link></li>
                <li><Link to={`/tienda/${slug}/catalogo`} className="text-xs text-gray-400 hover:text-white transition-colors">Catálogo completo</Link></li>
                <li><Link to={`/tienda/${slug}/catalogo?sort=novedades`} className="text-xs text-gray-400 hover:text-white transition-colors">Novedades</Link></li>
              </ul>
            </div>

            {/* Customer Services */}
            <div>
              <h4 className="text-white font-bold text-base mb-6 relative w-max pb-3">
                Servicio al Cliente
                <div className="absolute bottom-0 left-0 w-8 h-0.5" style={{ backgroundColor: cp }}></div>
              </h4>
              <ul className="flex flex-col gap-3">
                <li><Link to={`/tienda/${slug}/seguimiento`} className="text-xs text-gray-400 hover:text-white transition-colors">Rastrear pedido</Link></li>
                <li><Link to={`/tienda/${slug}/checkout`} className="text-xs text-gray-400 hover:text-white transition-colors">Finalizar compra</Link></li>
                {phone && <li><a href={whatsappUrl} target="_blank" rel="noreferrer" className="text-xs text-gray-400 hover:text-white transition-colors">Contactar tienda</a></li>}
              </ul>
            </div>

            {/* Store Navigation */}
            <div>
              <h4 className="text-white font-bold text-base mb-6 relative w-max pb-3">
                Navegación
                <div className="absolute bottom-0 left-0 w-8 h-0.5" style={{ backgroundColor: cp }}></div>
              </h4>
              <ul className="flex flex-col gap-3">
                {storeLinks.map(item => (
                  <li key={item.label}><Link to={item.to} className="text-xs text-gray-400 hover:text-white transition-colors">{item.label}</Link></li>
                ))}
              </ul>
            </div>

            {/* Policies & Legal */}
            <div>
              <h4 className="text-white font-bold text-base mb-6 relative w-max pb-3">
                Políticas y Legales
                <div className="absolute bottom-0 left-0 w-8 h-0.5" style={{ backgroundColor: cp }}></div>
              </h4>
              <ul className="flex flex-col gap-3">
                <li><Link to={`/tienda/${slug}/catalogo`} className="text-xs text-gray-400 hover:text-white transition-colors">Productos disponibles</Link></li>
                <li><Link to={`/tienda/${slug}/seguimiento`} className="text-xs text-gray-400 hover:text-white transition-colors">Estado del pedido</Link></li>
                {email && <li><a href={`mailto:${email}`} className="text-xs text-gray-400 hover:text-white transition-colors">Soporte por correo</a></li>}
              </ul>
            </div>

          </div>

          <div className="mt-16 pt-8 border-t border-gray-800 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-[11px] text-gray-500">
              ©copyright {currentYear} . Diseñado Por <span className="text-white font-bold">{BRAND.name}</span>
            </p>
            <div className="flex items-center gap-6">
              <Link to={`/tienda/${slug}/catalogo`} className="text-[11px] text-gray-400 hover:text-white transition-colors">Catálogo</Link>
              <Link to={`/tienda/${slug}/seguimiento`} className="text-[11px] text-gray-400 hover:text-white transition-colors">Seguimiento</Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
