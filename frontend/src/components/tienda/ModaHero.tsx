import { useNavigate } from 'react-router-dom';
import { getStoreLinkAction, runStoreLinkAction } from './storeLinkActions';

interface ModaHeroProps {
  cp: string;
  slug: string;
  diseno?: any;
  productos?: any[];
}

export default function ModaHero({ slug, diseno }: ModaHeroProps) {
  const navigate = useNavigate();

  const heroTitle = diseno?.modaHeroTitle || diseno?.heroTitle || 'Banner de la tienda';

  const heroImageDesktop =
    diseno?.modaHeroImg ||
    diseno?.modaHeroImage ||
    diseno?.heroImageUrl ||
    diseno?.heroImage ||
    '/assets/templates/moda/banner.webp';

  // Banner móvil propio; si no se configura, usa el banner móvil por defecto.
  const heroImageMobile = diseno?.modaHeroImgMobile || '/assets/templates/moda/bannermobile.webp';

  const goHeroLink = () => {
    if (slug === 'preview') {
      window.dispatchEvent(new CustomEvent('preview-nav', { detail: 'catalogo' }));
      return;
    }
    runStoreLinkAction(getStoreLinkAction(diseno, 'modaHeroAction', { defaultType: 'catalog' }), { slug, navigate });
  };

  return (
    <section
      onClick={goHeroLink}
      className="relative cursor-pointer overflow-hidden bg-[#D9D9D4]"
    >
      {/* Banner móvil — proporción natural, sin recorte */}
      <img
        src={heroImageMobile}
        alt={heroTitle}
        className="block h-auto w-full md:hidden"
      />
      {/* Banner escritorio — proporción natural, sin recorte */}
      <img
        src={heroImageDesktop}
        alt={heroTitle}
        className="hidden h-auto w-full md:block"
      />
    </section>
  );
}
