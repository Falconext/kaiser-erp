import { Icon } from '@iconify/react';
import { Link } from 'react-router-dom';

interface ModaFooterProps {
  diseno?: any;
  tiendaNombre: string;
}

const columns = [
  {
    title: 'Información',
    links: ['Sobre nosotros', 'Política de privacidad', 'Términos del servicio', 'Términos y condiciones', 'Blog'],
  },
  {
    title: 'Ayuda y soporte',
    links: ['Cambios y devoluciones', 'Política de envíos', 'Métodos de pago', 'Cómo elegir tu talla', 'Mapa del sitio'],
  },
  {
    title: 'Atención al cliente',
    links: ['Preguntas frecuentes', 'Contáctanos', 'Rastrea tu pedido', 'Programa de afiliados'],
  },
];

const socials = [
  { icon: 'ri:facebook-fill', label: 'Facebook' },
  { icon: 'ri:instagram-line', label: 'Instagram' },
  { icon: 'ri:pinterest-fill', label: 'Pinterest' },
  { icon: 'ic:baseline-tiktok', label: 'TikTok' },
];

const payments = ['VISA', 'MC', 'DISC', 'PP', 'DIN', 'JCB', 'AMEX', 'Klarna', 'Pay', 'GPay'];

export default function ModaFooter({ tiendaNombre, diseno }: ModaFooterProps) {
  const year = new Date().getFullYear();
  const emailName = tiendaNombre
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '')
    .slice(0, 18) || 'tienda';

  return (
    <footer className="w-full bg-black px-5 py-16 text-[14px] text-[#D7D7D7] md:px-10 lg:px-16 lg:py-20">
      <div className="mx-auto max-w-[1800px]">
        <div className="grid gap-12 lg:grid-cols-[1fr_1.15fr_1fr_1.1fr_1.45fr]">
          {columns.map((column) => (
            <div key={column.title}>
              <h3 className="mb-6 text-[14px] font-black uppercase tracking-[0.16em] text-white">
                {column.title}
              </h3>
              <ul className="space-y-4">
                {column.links.map((link) => (
                  <li key={link}>
                    <Link to="#" className="underline decoration-white/35 underline-offset-4 transition-colors hover:text-white">
                      {link}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div>
            <h3 className="mb-6 text-[14px] font-black uppercase tracking-[0.16em] text-white">
              Síguenos
            </h3>
            <p className="max-w-[330px] leading-7">
              Únete a nuestra comunidad y síguenos en redes para conocer novedades, lanzamientos y tendencias.
            </p>
            <div className="mt-7 grid w-fit grid-cols-4 border border-white/15">
              {socials.map((social) => (
                <Link
                  key={social.label}
                  to="#"
                  aria-label={social.label}
                  className="flex h-[54px] w-[54px] items-center justify-center border-r border-white/15 text-white transition-colors last:border-r-0 hover:bg-white hover:text-black"
                >
                  <Icon icon={social.icon} width={22} />
                </Link>
              ))}
            </div>
          </div>

          <div>
            <h3 className="mb-6 text-[14px] font-black uppercase tracking-[0.16em] text-white">
              Sobre nuestra tienda
            </h3>
            <div className="space-y-6 leading-7">
              <p>
                <strong className="font-black text-white">Email:</strong>{' '}
                <Link to="#" className="underline decoration-white/35 underline-offset-4 hover:text-white">
                  info@{emailName}.com
                </Link>
              </p>
              <div>
                <p className="mb-4 text-[20px] font-black text-white">Dirección:</p>
                <p>Av. Principal 185, Centro Comercial</p>
                <p>Lima, Perú</p>
              </div>
              <p>
                <strong className="font-black text-white">Soporte:</strong>{' '}
                <Link to="#" className="underline decoration-white/35 underline-offset-4 hover:text-white">
                  +51 999 999 999
                </Link>
              </p>
            </div>
          </div>
        </div>

        <div className="mt-16 flex flex-col gap-8 lg:mt-20 lg:flex-row lg:items-center lg:justify-between">
          <p>© {tiendaNombre} Todos los derechos reservados {year}.</p>

          <div className="flex flex-wrap items-center gap-3">
            <span className="mr-2 text-white/60">Aceptamos</span>
            {payments.map((payment) => (
              <span
                key={payment}
                className="flex h-7 min-w-[44px] items-center justify-center rounded-[3px] bg-white px-2 text-[10px] font-black text-black"
              >
                {payment}
              </span>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
