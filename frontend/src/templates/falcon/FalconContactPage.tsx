import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '@iconify/react';
import { motion } from 'framer-motion';
import {
  resolveFalconGreen, storeNameOf, editable, withPreviewQuery, FALCON_DEFAULT_IMAGES,
  FalconHeader, FalconFooter, FalconBenefits, FalconCartDrawer,
  falconFadeUp, falconScaleIn, falconStagger, falconTap,
} from './FalconShared';

function pickContact(tienda: any, diseno: any) {
  return {
    address: editable(diseno?.falconContactAddress, tienda?.direccion || tienda?.direccionTienda || tienda?.direccionFiscal || 'Av. Principal 123, Lima, Perú'),
    phone: editable(diseno?.falconContactPhone, tienda?.whatsappTienda || tienda?.telefono || tienda?.celular || '+51 999 999 999'),
    email: editable(diseno?.falconContactEmail, tienda?.correo || tienda?.email || 'contacto@tutienda.com'),
    hours: editable(diseno?.falconContactHours, tienda?.horarioAtencion || 'Lun a Sáb: 9:00 a.m. – 7:00 p.m.'),
  };
}

export default function FalconContactPage({
  tienda, slug, diseno, cp,
  allCategories = [],
  carrito = [],
  setCarrito,
  mostrarCarrito = false,
  setMostrarCarrito,
  actualizarCantidad,
}: {
  tienda: any; slug: string; diseno: any; cp?: string;
  allCategories?: any[];
  carrito?: any[];
  setCarrito?: (items: any[]) => void;
  mostrarCarrito?: boolean;
  setMostrarCarrito?: (value: boolean) => void;
  actualizarCantidad?: (id: any, cantidad: number) => void;
}) {
  const navigate = useNavigate();
  const green = resolveFalconGreen(diseno, cp);
  const storeName = storeNameOf(tienda);
  const contact = pickContact(tienda, diseno);
  const banner = diseno?.falconCatalogBannerUrl || diseno?.falconDetailBannerUrl || FALCON_DEFAULT_IMAGES.catalog;
  const [sent, setSent] = useState(false);

  const cartCount = carrito.reduce((s, i) => s + Number(i?.cantidad || 1), 0);
  const cartTotal = carrito.reduce((s, i) => s + Number(i?.precioUnitario || 0) * Number(i?.cantidad || 1), 0);
  const go = (path: string) => navigate(withPreviewQuery(path, diseno));
  const categoryNames = useMemo(
    () => (Array.isArray(allCategories) ? allCategories.map((c: any) => (typeof c === 'string' ? c : c?.nombre)).filter(Boolean) : []),
    [allCategories],
  );
  const mapQuery = encodeURIComponent(contact.address || storeName || 'Peru');

  const infoCards: [string, string, string][] = [
    ['solar:map-point-bold', editable(diseno?.falconContactAddressTitle, 'Dirección'), contact.address],
    ['solar:phone-calling-bold', editable(diseno?.falconContactPhoneTitle, 'Teléfono'), contact.phone],
    ['solar:letter-bold', editable(diseno?.falconContactEmailTitle, 'Correo'), contact.email],
    ['solar:clock-circle-bold', editable(diseno?.falconContactHoursTitle, 'Horario'), contact.hours],
  ];

  return (
    <div className="min-h-screen overflow-x-hidden bg-white" style={{ fontFamily: `'${diseno?.tipografia || 'Inter'}', sans-serif` }}>
      <FalconHeader
        tienda={tienda}
        slug={slug}
        green={green}
        cartCount={cartCount}
        cartTotal={cartTotal}
        onOpenCart={() => setMostrarCarrito?.(true)}
        diseno={diseno}
        categories={allCategories}
        products={[]}
      />

      {/* Banner */}
      <motion.div initial="hidden" animate="show" variants={falconFadeUp} className="relative flex min-h-[220px] items-center justify-center overflow-hidden bg-[#151515] px-4">
        {banner && (<><img src={banner} alt="" className="absolute inset-0 h-full w-full object-cover" /><div className="absolute inset-0 bg-black/25" /></>)}
        <div className="relative z-10 text-center">
          <h1 className="text-4xl font-black text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.7)] md:text-5xl">{editable(diseno?.falconContactTitle, 'Contáctanos')}</h1>
          <p className="mt-3 flex items-center justify-center gap-2 text-sm font-semibold text-white/90 drop-shadow">
            <button type="button" onClick={() => go(`/tienda/${slug}`)} className="hover:text-white">{editable(diseno?.falconNavHome, 'Inicio')}</button>
            <Icon icon="solar:alt-arrow-right-linear" width={14} />
            <span>{editable(diseno?.falconNavContact, 'Contacto')}</span>
          </p>
        </div>
      </motion.div>

      <main className="mx-auto max-w-[1400px] px-4 py-14 lg:px-6">
        <motion.section initial="hidden" whileInView="show" viewport={{ once: true, margin: '-80px' }} variants={falconStagger} className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
          {/* Form */}
          <motion.form
            variants={falconScaleIn}
            className="min-w-0 rounded-2xl bg-[#ececec] p-8 md:p-10"
            onSubmit={(e) => { e.preventDefault(); setSent(true); }}
          >
            <h2 className="text-2xl font-black leading-tight text-[#151515] md:text-3xl">{editable(diseno?.falconContactFormTitle, 'Ponte en contacto con nosotros')}</h2>
            <p className="mt-3 max-w-md text-sm font-semibold leading-6 text-gray-500">{editable(diseno?.falconContactFormText, 'Completa el formulario y nuestro equipo te responderá lo antes posible.')}</p>

            <div className="mt-8 space-y-4">
              <input required placeholder={editable(diseno?.falconContactNamePlaceholder, 'Tu nombre *')} className="h-12 w-full rounded-md border border-gray-200 bg-white px-4 text-sm font-semibold outline-none transition-colors focus:border-[#151515]" />
              <div className="grid gap-4 sm:grid-cols-2">
                <input required type="email" placeholder={editable(diseno?.falconContactEmailPlaceholder, 'Tu correo *')} className="h-12 w-full rounded-md border border-gray-200 bg-white px-4 text-sm font-semibold outline-none transition-colors focus:border-[#151515]" />
                <input placeholder={editable(diseno?.falconContactPhonePlaceholder, 'Tu teléfono')} className="h-12 w-full rounded-md border border-gray-200 bg-white px-4 text-sm font-semibold outline-none transition-colors focus:border-[#151515]" />
              </div>
              <textarea rows={6} placeholder={editable(diseno?.falconContactMessagePlaceholder, 'Tu mensaje')} className="w-full resize-none rounded-md border border-gray-200 bg-white p-4 text-sm font-semibold outline-none transition-colors focus:border-[#151515]" />
            </div>

            {sent && (
              <p className="mt-4 flex items-center gap-2 rounded-md bg-white px-4 py-3 text-sm font-bold text-emerald-700">
                <Icon icon="solar:check-circle-bold" width={20} /> {editable(diseno?.falconContactSuccessText, '¡Gracias! Tu mensaje ha sido registrado.')}
              </p>
            )}

            <motion.button whileTap={falconTap} type="submit" className="mt-7 w-full rounded-md py-4 text-sm font-black uppercase tracking-wide text-white transition-transform hover:scale-[1.01]" style={{ background: green }}>
              {editable(diseno?.falconContactSubmitLabel, 'Enviar mensaje')}
            </motion.button>
          </motion.form>

          {/* Map */}
          <motion.div variants={falconScaleIn} className="min-h-[360px] min-w-0 overflow-hidden rounded-2xl bg-gray-100 lg:min-h-full">
            <iframe
              title="Mapa de contacto"
              src={`https://www.google.com/maps?q=${mapQuery}&output=embed`}
              className="h-full min-h-[360px] w-full border-0"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </motion.div>
        </motion.section>

        {/* Info cards */}
        <motion.section initial="hidden" whileInView="show" viewport={{ once: true, margin: '-80px' }} variants={falconStagger} className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {infoCards.map(([icon, title, text]) => (
            <motion.div key={title} variants={falconFadeUp} whileHover={{ y: -4 }} className="flex items-start gap-4 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-white" style={{ background: green }}>
                <Icon icon={icon} width={24} />
              </span>
              <div className="min-w-0">
                <p className="text-base font-black text-[#151515]">{title}</p>
                <p className="mt-1 break-words text-sm font-semibold leading-6 text-gray-500">{text}</p>
              </div>
            </motion.div>
          ))}
        </motion.section>
      </main>

      <FalconBenefits green={green} diseno={diseno} />
      <FalconFooter tienda={tienda} slug={slug} green={green} categories={categoryNames} diseno={diseno} />

      {setCarrito && actualizarCantidad && (
        <FalconCartDrawer
          isOpen={mostrarCarrito}
          onClose={() => setMostrarCarrito?.(false)}
          carrito={carrito}
          actualizarCantidad={actualizarCantidad}
          onCheckout={() => { setMostrarCarrito?.(false); go(`/tienda/${slug}/checkout`); }}
          onViewCart={() => { setMostrarCarrito?.(false); go(`/tienda/${slug}/catalogo`); }}
          green={green}
          diseno={diseno}
          tienda={tienda}
        />
      )}
    </div>
  );
}
