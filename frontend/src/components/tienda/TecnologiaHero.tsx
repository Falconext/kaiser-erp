import { Icon } from '@iconify/react';
import { useNavigate } from 'react-router-dom';
import { getStoreLinkAction, runStoreLinkAction, isLinkActionConfigured } from './storeLinkActions';

interface TecnologiaHeroProps {
  cp: string;
  slug: string;
  diseno?: any;
  productos?: any[];
}

export default function TecnologiaHero({ cp, slug, diseno, productos = [] }: TecnologiaHeroProps) {
  const navigate = useNavigate();
  const heroImage = diseno?.tecnologiaHeroImageUrl || '/assets/templates/tecnologia/banner.png';
  const heroTitle = diseno?.tecnologiaHeroTitle || 'Obtén Los Mejores\nDispositivos\nAl Mejor Precio.';
  const heroSubtitle = diseno?.tecnologiaHeroSubtitle || 'Laptops, celulares, accesorios y gaming al mejor precio del mercado. Stock disponible con garantía y soporte técnico.';

  // "Ver Promoción" solo se muestra si el empresario lo configuró (producto/categoría/url).
  const promoConfigurado = isLinkActionConfigured(diseno, 'tecnologiaHeroPromoAction');

  const goAction = (key: string, defaultType: 'catalog' | 'none' = 'catalog') => {
    if (slug === 'preview') {
      window.dispatchEvent(new CustomEvent('preview-nav', { detail: 'catalogo' }));
      return;
    }
    runStoreLinkAction(getStoreLinkAction(diseno, key, { defaultType }), { slug, navigate });
  };

  return (
    <section className="relative mx-0 overflow-hidden rounded-3xl bg-[#0B1340] min-h-[520px]">
      {/* Background Image */}
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${heroImage})` }}
      />

      <div className="relative z-10 flex min-h-[520px] items-center">
        <div className="w-full lg:w-2/3 px-8 py-14 lg:px-16 lg:py-20">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold text-white" style={{ background: `${cp}30`, border: `1px solid ${cp}50` }}>
            <span className="h-1.5 w-1.5 animate-pulse rounded-full" style={{ background: cp }} />
            {diseno?.tecnologiaHeroLabel || 'Nuevos productos disponibles'}
          </div>

          <h1 className="mb-5 whitespace-pre-line text-4xl font-black leading-tight text-white lg:text-5xl">
            {heroTitle}
          </h1>

          <p className="mb-8 max-w-md text-sm leading-relaxed text-gray-200">
            {heroSubtitle}
          </p>

          <div className="flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={() => goAction('tecnologiaHeroAction')}
              className="flex items-center gap-3 rounded-full px-6 py-3 text-sm font-bold text-white shadow-lg transition-opacity hover:opacity-90"
              style={{ background: cp }}
            >
              {diseno?.tecnologiaHeroButton || 'Explorar Ahora'}
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/20">
                <Icon icon="solar:arrow-right-bold" className="text-sm" />
              </span>
            </button>
            {(promoConfigurado || slug === 'preview') && (
              <button type="button" onClick={() => goAction('tecnologiaHeroPromoAction', 'none')} className="flex items-center gap-3 text-sm font-medium text-white transition-opacity hover:opacity-80">
                <span className="flex h-10 w-10 items-center justify-center rounded-full border border-white/30 bg-white/10">
                  <Icon icon="solar:play-bold" className="text-sm" />
                </span>
                {diseno?.tecnologiaHeroPromoButton || 'Ver Promoción'}
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
