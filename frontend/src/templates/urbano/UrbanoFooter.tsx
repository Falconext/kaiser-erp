import { Link } from 'react-router-dom';
import { buildStorePurchaseWhatsappUrl, normalizeStoreWhatsapp } from '@/utils/storeWhatsapp';

interface UrbanoFooterProps {
  diseno?: any;
  tienda: any;
  slug?: string;
  categories?: Array<{ nombre?: string; name?: string; descripcion?: string } | string>;
}

const clean = (value: any) => String(value || '').trim();
const categoryName = (item: any) =>
  typeof item === 'string' ? item : clean(item?.nombre || item?.name || item?.descripcion);
const normalizeUrl = (url: string) => /^https?:\/\//i.test(url) ? url : `https://${url}`;
export default function UrbanoFooter({ tienda, diseno, slug, categories = [] }: UrbanoFooterProps) {
  const cfg = diseno || tienda?.diseno || {};
  const storeName = cfg.urbanoStoreName || tienda?.nombreComercial || tienda?.razonSocial || tienda?.nombre || 'BLNK';
  const logoUrl = cfg.logo || tienda?.logoUrl;
  const storeSlug = slug || tienda?.slugTienda || tienda?.slug || '';

  const realCategories = Array.from(new Set(categories.map(categoryName).filter(Boolean)))
    .filter((name) => name.toLowerCase() !== 'todos')
    .slice(0, 4);
  const configuredCategories = [
    clean(cfg.urbanoCat1Text),
    clean(cfg.urbanoCat2Text),
    clean(cfg.urbanoCat3Text),
    clean(cfg.urbanoCat4Text),
  ].filter(Boolean).slice(0, 4);
  const footerCategories = realCategories.length ? realCategories : configuredCategories;

  const isPreview = storeSlug === 'preview';
  const route = (path = '') => {
    if (isPreview) {
      const page = path.includes('checkout') || path.includes('seguimiento')
        ? 'checkout'
        : path.includes('catalogo')
          ? 'catalogo'
          : 'home';
      return `/diseno-preview?plantillaId=urbano&page=${page}`;
    }
    return storeSlug ? `/tienda/${storeSlug}${path}` : '/';
  };
  const phone = normalizeStoreWhatsapp(tienda?.whatsappTienda ?? tienda?.diseno?.whatsappTienda ?? diseno?.whatsappTienda);
  const email = clean(cfg.urbanoFooterEmail || tienda?.email || tienda?.correo || tienda?.correoPrincipal);
  const whatsapp = phone;
  const contactHref = buildStorePurchaseWhatsappUrl(phone, `Hola, vengo de ${storeName} y quisiera información.`);
  const socialLinks = [
    { label: 'Instagram', url: clean(cfg.instagramUrl || cfg.urbanoInstagramUrl || tienda?.instagramUrl) },
    { label: 'TikTok', url: clean(cfg.tiktokUrl || cfg.urbanoTiktokUrl || tienda?.tiktokUrl) },
    { label: 'Facebook', url: clean(cfg.facebookUrl || cfg.urbanoFacebookUrl || tienda?.facebookUrl) },
    { label: 'X', url: clean(cfg.twitterUrl || cfg.urbanoTwitterUrl || tienda?.twitterUrl) },
  ].filter((item) => item.url);

  return (
    <footer className="w-full bg-[#1A1A1A] text-white py-16 px-4 md:px-8">
      <div className="max-w-[1600px] mx-auto grid grid-cols-1 md:grid-cols-4 gap-12">
        <div>
          {logoUrl ? (
             <img src={logoUrl} alt={storeName} className="h-10 object-contain mb-6" />
          ) : (
            <h2
              className="text-2xl font-black tracking-tighter uppercase mb-6"
              style={{ fontFamily: '"Impact", "Arial Black", sans-serif' }}
            >
              {storeName}
            </h2>
          )}
          <p className="text-[11px] text-gray-400 leading-loose">
            {(diseno || tienda?.diseno)?.urbanoSlogan || tienda?.slogan || 'Moda urbana minimalista para vestir tu día con estilo.'}
          </p>
        </div>

        <div>
          <h4 className="text-[11px] font-bold tracking-[0.2em] uppercase mb-6">Tienda</h4>
          <ul className="space-y-4 text-[11px] text-gray-400">
            <li><Link to={route()} className="hover:text-white transition-colors">Inicio</Link></li>
            <li><Link to={route('/catalogo')} className="hover:text-white transition-colors">Catálogo</Link></li>
            {footerCategories.map((name) => (
              <li key={name}>
                <Link to={`${route('/catalogo')}?category=${encodeURIComponent(name)}`} className="hover:text-white transition-colors">
                  {name}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="text-[11px] font-bold tracking-[0.2em] uppercase mb-6">Ayuda</h4>
          <ul className="space-y-4 text-[11px] text-gray-400">
            <li><Link to={route('/seguimiento')} className="hover:text-white transition-colors">Ver mi pedido</Link></li>
            <li><Link to={route('/checkout')} className="hover:text-white transition-colors">Finalizar compra</Link></li>
            {contactHref && (
              <li>
                <a href={contactHref} target={whatsapp ? '_blank' : undefined} rel={whatsapp ? 'noopener noreferrer' : undefined} className="hover:text-white transition-colors">
                  Contáctanos
                </a>
              </li>
            )}
            {email && <li><a href={`mailto:${email}`} className="hover:text-white transition-colors">{email}</a></li>}
          </ul>
        </div>

        <div>
          <h4 className="text-[11px] font-bold tracking-[0.2em] uppercase mb-6">
            {cfg.urbanoFooterTitle || 'Atención'}
          </h4>
          <p className="text-[11px] text-gray-400 mb-5 leading-loose">
            {cfg.urbanoFooterHelpText || 'Compra desde la tienda oficial y coordina entrega, recojo o seguimiento directamente con el negocio.'}
          </p>
          {contactHref ? (
            <a
              href={contactHref}
              target={whatsapp ? '_blank' : undefined}
              rel={whatsapp ? 'noopener noreferrer' : undefined}
              className="inline-flex border border-gray-700 px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-white hover:bg-white hover:text-black transition-colors"
            >
              Contactar
            </a>
          ) : (
            <Link to={route('/seguimiento')} className="inline-flex border border-gray-700 px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-white hover:bg-white hover:text-black transition-colors">
              Seguimiento
            </Link>
          )}
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto mt-16 pt-8 border-t border-gray-800 flex flex-col md:flex-row items-center justify-between gap-4 text-[10px] text-gray-500 uppercase tracking-widest">
        <p>&copy; {new Date().getFullYear()} {storeName}. Todos los derechos reservados.</p>
        <div className="flex gap-6">
          {socialLinks.length ? socialLinks.map((item) => (
            <a key={item.label} href={normalizeUrl(item.url)} target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
              {item.label}
            </a>
          )) : (
            <Link to={route('/catalogo')} className="hover:text-white transition-colors">Ver catálogo</Link>
          )}
        </div>
      </div>
    </footer>
  );
}
