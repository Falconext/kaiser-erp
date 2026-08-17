import { Icon } from '@iconify/react';
import { BRAND } from '@/lib/branding';
import { Link } from 'react-router-dom';
import { buildStorePurchaseWhatsappUrl, normalizeStoreWhatsapp } from '@/utils/storeWhatsapp';

interface Props {
  tienda: any;
  slug: string;
  diseno: any;
  categories?: Array<{ nombre?: string; name?: string; descripcion?: string } | string>;
}

const clean = (value: any) => String(value || '').trim();
const categoryName = (item: any) =>
  typeof item === 'string' ? item : clean(item?.nombre || item?.name || item?.descripcion);
const normalizeUrl = (url: string) => /^https?:\/\//i.test(url) ? url : `https://${url}`;

export default function TecnologiaFooter({ tienda, slug, diseno, categories = [] }: Props) {
  const year = new Date().getFullYear();
  const cp = diseno?.colorPrimario || '#2563EB';
  const storeName = tienda?.nombreComercial || tienda?.nombre || tienda?.razonSocial || 'TechStore Peru';
  const isConstruccion = diseno?.plantillaId === 'construccion';
  const phone = normalizeStoreWhatsapp(tienda?.whatsappTienda ?? tienda?.diseno?.whatsappTienda ?? diseno?.whatsappTienda);
  const email = clean(diseno?.tecnologiaFooterEmail || tienda?.email || tienda?.correo || tienda?.correoPrincipal);
  const footerText = diseno?.tecnologiaFooterText || (
    isConstruccion
      ? 'Materiales, herramientas y soluciones para obra con atención rápida, stock actualizado y experiencia de compra optimizada.'
      : 'Equipos, componentes y accesorios tecnológicos con atención rápida, stock actualizado y experiencia de compra optimizada.'
  );
  const isPreview = slug === 'preview';
  const route = (path = '') => {
    if (isPreview) {
      const page = path.includes('checkout') ? 'checkout' : path.includes('catalogo') ? 'catalogo' : 'home';
      return `/diseno-preview?plantillaId=${isConstruccion ? 'construccion' : 'tecnologia'}&page=${page}`;
    }
    return slug ? `/tienda/${slug}${path}` : '/';
  };
  const whatsapp = phone;
  const contactHref = buildStorePurchaseWhatsappUrl(phone, `Hola, vengo de ${storeName} y quisiera información.`);
  const realCategories = Array.from(new Set(categories.map(categoryName).filter(Boolean)))
    .filter((name) => name.toLowerCase() !== 'todos')
    .slice(0, 4);
  const socialLinks = [
    { label: 'Instagram', url: clean(diseno?.tecnologiaInstagramUrl || tienda?.instagramUrl) },
    { label: 'Facebook', url: clean(diseno?.tecnologiaFacebookUrl || tienda?.facebookUrl) },
    { label: 'TikTok', url: clean(diseno?.tecnologiaTiktokUrl || tienda?.tiktokUrl) },
    { label: 'X', url: clean(diseno?.tecnologiaTwitterUrl || tienda?.twitterUrl) },
  ].filter((item) => item.url);

  const columns = [
    {
      title: 'Comprar',
      links: [
        ['Inicio', route()],
        ['Catálogo', route('/catalogo')],
        ...realCategories.map((name) => [name, `${route('/catalogo')}?category=${encodeURIComponent(name)}`]),
      ],
    },
    {
      title: 'Soporte',
      links: [
        ['Rastrear pedido', route('/seguimiento')],
        ['Finalizar compra', route('/checkout')],
        ['Ver catálogo', route('/catalogo')],
      ],
    },
  ];

  return (
    <footer className="w-full bg-[#0B1120] text-white">
      <div className="border-y border-white/10 bg-white">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-4 py-8 sm:grid-cols-2 lg:grid-cols-4 lg:px-6">
          {[
            ['solar:delivery-bold-duotone', 'Envíos seguros', 'Despachos a domicilio y agencias con seguimiento.'],
            ['solar:shield-check-bold-duotone', 'Garantía real', 'Productos con respaldo técnico y comprobante.'],
            ['solar:card-2-bold-duotone', 'Pagos confiables', 'Yape, Plin, efectivo y medios configurados por tienda.'],
            ['solar:headphones-round-bold-duotone', 'Soporte técnico', 'Acompañamiento antes y después de tu compra.'],
          ].map(([icon, title, text]) => (
            <div key={title} className="flex items-start gap-4">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-white shadow-lg" style={{ background: cp, boxShadow: `0 12px 28px ${cp}30` }}>
                <Icon icon={icon} width={22} />
              </span>
              <span>
                <span className="block text-sm font-black text-gray-900">{title}</span>
                <span className="mt-1 block text-xs leading-relaxed text-gray-500">{text}</span>
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-12 lg:px-6">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1.4fr_repeat(3,1fr)]">
          <div>
            <div className="mb-5 flex items-center gap-3">
              {tienda?.logo ? (
                <img src={tienda.logo} alt={storeName} className="h-10 w-auto rounded bg-white object-contain p-1" />
              ) : (
                <span className="flex h-10 w-10 items-center justify-center rounded-xl text-sm font-black text-white" style={{ background: cp }}>
                  {storeName.split(' ').map((word: string) => word[0]).join('').slice(0, 2).toUpperCase() || 'TP'}
                </span>
              )}
              <div>
                <p className="text-sm font-black">{storeName}</p>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/40">
                  {isConstruccion ? 'Construcción y ferretería' : 'Tecnología y cómputo'}
                </p>
              </div>
            </div>
            <p className="max-w-sm text-sm leading-relaxed text-white/55">
              {footerText}
            </p>
            {(phone || email) && (
              <div className="mt-6 space-y-3 text-sm text-white/65">
                {phone && (
                  <a href={contactHref ?? undefined} target="_blank" rel="noreferrer" className="flex items-center gap-3 hover:text-white">
                    <Icon icon="solar:phone-calling-linear" width={18} style={{ color: cp }} />
                    {phone}
                  </a>
                )}
                {email && (
                  <a href={`mailto:${email}`} className="flex items-center gap-3 hover:text-white">
                    <Icon icon="solar:letter-linear" width={18} style={{ color: cp }} />
                    {email}
                  </a>
                )}
              </div>
            )}
          </div>

          {columns.map(column => (
            <div key={column.title}>
              <h4 className="mb-4 text-sm font-black">{column.title}</h4>
              <ul className="space-y-3">
                {column.links.map(([label, href]) => (
                  <li key={label}>
                    <Link to={href} className="text-xs font-semibold text-white/50 transition-colors hover:text-white">
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div>
            <h4 className="mb-4 text-sm font-black">Contacto</h4>
            <div className="space-y-3">
              {contactHref ? (
                <a href={contactHref} target={whatsapp ? '_blank' : undefined} rel={whatsapp ? 'noreferrer' : undefined} className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-black text-white transition hover:brightness-110" style={{ background: cp }}>
                  <Icon icon="solar:chat-round-call-bold-duotone" width={16} />
                  Contactar
                </a>
              ) : (
                <Link to={route('/seguimiento')} className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-black text-white transition hover:brightness-110" style={{ background: cp }}>
                  <Icon icon="solar:delivery-bold-duotone" width={16} />
                  Seguimiento
                </Link>
              )}
              {socialLinks.length > 0 && (
                <div className="flex flex-wrap gap-3 pt-2">
                  {socialLinks.map((item) => (
                    <a key={item.label} href={normalizeUrl(item.url)} target="_blank" rel="noreferrer" className="text-xs font-semibold text-white/50 hover:text-white">
                      {item.label}
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-4 border-t border-white/10 pt-6 text-xs text-white/40 md:flex-row md:items-center md:justify-between">
          <p>© {year} {storeName}. Diseñado por <span className="font-bold text-white">{BRAND.name}</span></p>
          <div className="flex items-center gap-4">
            <Link to={route('/catalogo')} className="hover:text-white">Catálogo</Link>
            <Link to={route('/checkout')} className="hover:text-white">Pedido</Link>
            <Link to={route('/seguimiento')} className="hover:text-white">Rastrear pedido</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
