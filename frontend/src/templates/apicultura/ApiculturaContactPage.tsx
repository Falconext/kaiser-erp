import { useState } from 'react';
import { motion } from 'framer-motion';
import { Icon } from '@iconify/react';
import TecnologiaCartModal from '@/components/tienda/TecnologiaCartModal';
import { ApiculturaFooter, ApiculturaHeader } from './ApiculturaParts';
import { honeyCard, honeyHover, honeyPage, honeySection, honeyStagger, honeyTap, honeyViewport } from './motion';

const honeyPattern = {
  backgroundImage:
    'linear-gradient(30deg, rgba(0,0,0,.045) 12%, transparent 12.5%, transparent 87%, rgba(0,0,0,.045) 87.5%, rgba(0,0,0,.045)), linear-gradient(150deg, rgba(0,0,0,.045) 12%, transparent 12.5%, transparent 87%, rgba(0,0,0,.045) 87.5%, rgba(0,0,0,.045))',
  backgroundSize: '68px 40px',
};

function pickContact(tienda: any, diseno: any) {
  return {
    address: diseno?.apiculturaContactAddress || tienda?.direccionTienda || tienda?.direccionFiscal || tienda?.direccion || '',
    phone: diseno?.apiculturaContactPhone || tienda?.whatsappTienda || tienda?.telefono || tienda?.celular || '',
    email: diseno?.apiculturaContactEmail || tienda?.email || tienda?.correo || '',
    hours: diseno?.apiculturaContactHours || tienda?.horarioAtencion || '',
  };
}

export default function ApiculturaContactPage({
  tienda,
  slug,
  diseno,
  cp,
  allCategories = [],
  carrito = [],
  setCarrito,
  mostrarCarrito = false,
  setMostrarCarrito,
  actualizarCantidad,
  onNavigate,
}: {
  tienda: any;
  slug: string;
  diseno: any;
  cp: string;
  allCategories?: any[];
  carrito?: any[];
  setCarrito?: (items: any[]) => void;
  mostrarCarrito?: boolean;
  setMostrarCarrito?: (value: boolean) => void;
  actualizarCantidad?: (id: any, cantidad: number) => void;
  onNavigate?: (page: 'home' | 'catalogo' | 'producto' | 'checkout' | 'contacto') => void;
}) {
  const [sent, setSent] = useState(false);
  const contact = pickContact(tienda, diseno);
  const mapQuery = encodeURIComponent(contact.address || tienda?.nombreComercial || tienda?.razonSocial || 'Peru');
  const displayAddress = contact.address || 'Dirección no configurada';
  const displayPhone = contact.phone || 'Teléfono no configurado';
  const displayEmail = contact.email || 'Correo no configurado';
  const displayHours = contact.hours || 'Horario no configurado';

  const go = (page: 'home' | 'catalogo' | 'checkout' | 'contacto') => {
    if (onNavigate) {
      onNavigate(page);
      return;
    }
    if (page === 'home') window.location.href = `/tienda/${slug}`;
    if (page === 'catalogo') window.location.href = `/tienda/${slug}/catalogo`;
    if (page === 'checkout') window.location.href = `/tienda/${slug}/checkout`;
    if (page === 'contacto') window.location.href = `/tienda/${slug}/contacto`;
  };

  return (
    <motion.div initial="hidden" animate="show" variants={honeyPage} className="min-h-screen bg-white text-black" style={{ fontFamily: `'${diseno?.tipografia || 'Inter'}', sans-serif` }}>
      <ApiculturaHeader
        tienda={tienda}
        slug={slug}
        cp={cp}
        diseno={diseno}
        carritoSize={carrito.reduce((sum, item) => sum + Number(item.cantidad || 1), 0)}
        onOpenCart={() => setMostrarCarrito?.(true)}
        allCategories={allCategories}
        onSearchSubmit={(event, value) => {
          event.preventDefault();
          const term = value?.trim();
          if (term) window.location.href = `/tienda/${slug}/catalogo?search=${encodeURIComponent(term)}`;
        }}
      />

      <motion.section variants={honeySection} className="bg-[#FFD72E] px-5 pb-16 pt-8 text-center" style={honeyPattern}>
        <div className="mx-auto max-w-7xl">
          <div className="text-sm font-black text-black/70">
            <button type="button" onClick={() => go('home')} className="hover:text-black">Inicio</button>
            <span className="mx-1">/</span>
            <span>Contáctanos</span>
          </div>
          <h1 className="mt-3 text-4xl font-black text-black md:text-5xl">Contáctanos</h1>
        </div>
      </motion.section>

      <motion.main variants={honeySection} className="mx-auto max-w-7xl px-5 py-14">
        <motion.section variants={honeyStagger} className="grid gap-8 lg:grid-cols-[1.45fr_0.85fr]">
          <motion.div variants={honeyCard} whileHover={{ scale: 1.005 }} className="min-h-[420px] overflow-hidden bg-[#F5F5F5] md:min-h-[600px]">
            <iframe
              title="Mapa de contacto"
              src={`https://www.google.com/maps?q=${mapQuery}&output=embed`}
              className="h-full min-h-[420px] w-full border-0 md:min-h-[600px]"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </motion.div>

          <motion.form
            variants={honeyCard}
            className="bg-[#F5F5F5] p-7 md:p-10"
            onSubmit={(event) => {
              event.preventDefault();
              setSent(true);
            }}
          >
            <h2 className="text-3xl font-black text-black">{diseno?.apiculturaContactTitle || 'Ponte en contacto con nosotros'}</h2>
            <p className="mt-3 max-w-sm text-sm font-semibold leading-6 text-gray-500">
              {diseno?.apiculturaContactText || 'Si deseas comunicarte directamente con la tienda, completa el formulario o usa los canales configurados.'}
            </p>

            <label className="mt-7 block text-sm font-bold text-gray-600">
              Tu nombre
              <input required className="mt-3 h-12 w-full border-0 bg-white px-4 text-sm font-semibold outline-none focus:ring-2" style={{ '--tw-ring-color': cp } as any} />
            </label>
            <label className="mt-6 block text-sm font-bold text-gray-600">
              Tu correo
              <input required type="email" className="mt-3 h-12 w-full border-0 bg-white px-4 text-sm font-semibold outline-none focus:ring-2" style={{ '--tw-ring-color': cp } as any} />
            </label>
            <label className="mt-6 block text-sm font-bold text-gray-600">
              Tu mensaje (opcional)
              <textarea rows={9} className="mt-3 w-full resize-none border-0 bg-white p-4 text-sm font-semibold outline-none focus:ring-2" style={{ '--tw-ring-color': cp } as any} />
            </label>
            {sent && (
              <p className="mt-4 rounded bg-white px-4 py-3 text-sm font-bold text-emerald-700">
                Mensaje registrado en esta vista. Para recepción real, configura el canal de contacto de la tienda.
              </p>
            )}
            <motion.button type="submit" className="mt-7 rounded-full px-8 py-4 text-xs font-black uppercase tracking-wide text-black transition-transform hover:scale-[1.03]" style={{ backgroundColor: cp }} whileHover={{ scale: 1.04, y: -2 }} whileTap={honeyTap}>
              {diseno?.apiculturaContactSubmitLabel || 'Enviar'}
            </motion.button>
          </motion.form>
        </motion.section>

        <motion.section initial="hidden" whileInView="show" viewport={honeyViewport} variants={honeyStagger} className="mt-12 grid bg-[#F5F5F5] md:grid-cols-4">
          {[
            ['solar:map-point-bold', displayAddress],
            ['solar:phone-bold', displayPhone],
            ['solar:letter-bold', displayEmail],
            ['solar:clock-circle-bold', displayHours],
          ].map(([icon, text], index) => (
            <motion.div key={`${icon}-${index}`} variants={honeyCard} whileHover={honeyHover} className="flex items-center gap-5 border-b border-white px-7 py-8 md:border-b-0 md:border-r last:md:border-r-0">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-2 border-black/20 bg-white text-black">
                <Icon icon={icon} width={24} />
              </span>
              <p className="text-sm font-bold leading-6 text-gray-600">{text}</p>
            </motion.div>
          ))}
        </motion.section>
      </motion.main>

      <ApiculturaFooter tienda={tienda} slug={slug} diseno={diseno} cp={cp} categories={allCategories} />

      {setCarrito && actualizarCantidad && (
        <TecnologiaCartModal
          isOpen={mostrarCarrito}
          onClose={() => setMostrarCarrito?.(false)}
          carrito={carrito}
          setCarrito={setCarrito}
          actualizarCantidad={actualizarCantidad}
          onCheckout={() => go('checkout')}
          cp={cp}
          tienda={tienda}
        />
      )}
    </motion.div>
  );
}
