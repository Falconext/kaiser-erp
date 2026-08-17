import { useState } from 'react';
import { Icon } from '@iconify/react';
import { motion } from 'framer-motion';
import { ConstruccionFooter } from './ConstruccionHomePage';
import ConstruccionCartModal from './ConstruccionCartModal';

const editable = (value: any, fallback: string) => String(value || '').trim() || fallback;

const fadeUp = {
  hidden: { opacity: 0, y: 22 },
  show: { opacity: 1, y: 0, transition: { duration: 0.48, ease: [0.22, 1, 0.36, 1] } },
};

function HammerLogo({ storeName, subtitle = 'Herramientas y accesorios', accent = '#ffb400' }: { storeName: string; subtitle?: string; accent?: string }) {
  const label = storeName?.trim() ? storeName.trim().split(/\s+/)[0] : 'HAMMER';
  const clean = label.replace(/[^a-zA-Z0-9]/g, '') || 'HAMMER';
  const start = clean.slice(0, Math.max(2, clean.length - 3)).toUpperCase();
  const end = clean.slice(Math.max(2, clean.length - 3)).toUpperCase();

  return (
    <div className="leading-none">
      <div className="flex items-end text-[30px] font-black uppercase tracking-[0.08em] text-white md:text-[36px]">
        <span>{start}</span>
        <span style={{ color: accent }}>{end}</span>
      </div>
      <p className="mt-1 text-[13px] font-semibold tracking-wide text-white/35">{subtitle}</p>
    </div>
  );
}

function HammerHeader({ tienda, slug, cp, carritoSize, onOpenCart, onNavigate }: any) {
  const [search, setSearch] = useState('');
  const storeName = tienda?.nombreComercial || tienda?.nombre || tienda?.razonSocial || 'HAMMER';
  const go = (page: 'home' | 'catalogo' | 'checkout' | 'contacto') => {
    if (onNavigate) return onNavigate(page);
    if (page === 'home') window.location.href = `/tienda/${slug}`;
    if (page === 'catalogo') window.location.href = `/tienda/${slug}/catalogo`;
    if (page === 'checkout') window.location.href = `/tienda/${slug}/checkout`;
    if (page === 'contacto') window.location.href = `/tienda/${slug}/contacto`;
  };

  return (
    <header className="bg-[#111111] text-white">
      <div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-6 lg:flex-row lg:items-center lg:px-6">
        <button type="button" onClick={() => go('home')} className="text-left">
          <HammerLogo storeName={storeName} subtitle={editable(tienda?.diseno?.construccionLogoSubtitle, 'Herramientas y accesorios')} accent={cp} />
        </button>
        <form
          className="flex min-h-[48px] flex-1 overflow-hidden rounded-md bg-white text-[13px] text-[#111] shadow-xl lg:mx-10"
          onSubmit={(event) => {
            event.preventDefault();
            const term = search.trim();
            if (term) window.location.href = `/tienda/${slug}/catalogo?search=${encodeURIComponent(term)}`;
            else go('catalogo');
          }}
        >
          <button type="button" className="hidden min-w-[190px] items-center justify-between border-r border-gray-200 px-5 text-[13px] font-bold text-gray-500 md:flex">
            Todas las categorías
            <Icon icon="solar:alt-arrow-down-linear" width={18} />
          </button>
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={editable(tienda?.diseno?.construccionSearchPlaceholder, 'Buscar...')} className="min-w-0 flex-1 px-5 text-[13px] font-semibold text-gray-700 outline-none" />
          <button type="submit" className="px-4 text-[13px] font-black text-[#111] sm:px-7" style={{ background: cp }}>
            Buscar
          </button>
        </form>
        <div className="hidden items-center gap-8 lg:flex">
          <div className="flex items-center gap-3">
            <span className="flex h-14 w-14 items-center justify-center rounded-md bg-white/10">
              <Icon icon="solar:phone-calling-bold" width={28} />
            </span>
            <div>
              <p className="text-[13px] font-black text-white/80">{editable(tienda?.diseno?.construccionCallLabel, 'Llámanos:')}</p>
              <p className="text-[13px] font-black" style={{ color: cp }}>{tienda?.whatsappTienda || tienda?.telefono || '(+51) 999-999-999'}</p>
            </div>
          </div>
          <Icon icon="solar:user-linear" width={30} className="text-white" />
        </div>
      </div>
      <div style={{ background: cp }}>
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 lg:px-6">
          <button type="button" onClick={() => go('catalogo')} className="inline-flex h-12 min-w-0 flex-1 items-center gap-3 rounded-md bg-white px-4 text-[13px] font-black text-[#151515] shadow-sm sm:flex-none sm:px-5 sm:text-[14px] md:min-w-[230px]">
            <Icon icon="solar:hamburger-menu-linear" width={28} />
            {editable(tienda?.diseno?.construccionHeaderCategoryLabel, 'Comprar por categorías')}
          </button>
          <nav className="hidden flex-1 items-center justify-center gap-8 text-[14px] font-black text-[#151515] lg:flex">
            <button type="button" onClick={() => go('home')}>{editable(tienda?.diseno?.construccionNavHome, 'Inicio')}</button>
            <button type="button" onClick={() => go('catalogo')} className="inline-flex items-center gap-1">{editable(tienda?.diseno?.construccionNavStore, 'Tienda')} <Icon icon="solar:alt-arrow-down-linear" /></button>
            <button type="button" onClick={() => go('catalogo')} className="inline-flex items-center gap-2">{editable(tienda?.diseno?.construccionNavCategories, 'Categorías')} <span className="rounded px-1.5 py-0.5 text-[10px] font-black text-white" style={{ background: '#13a084' }}>OFERTA</span></button>
            <button type="button" onClick={() => go('catalogo')} className="inline-flex items-center gap-2">{editable(tienda?.diseno?.construccionNavProducts, 'Productos')} <span className="rounded px-1.5 py-0.5 text-[10px] font-black text-white" style={{ background: '#e93473' }}>TOP</span></button>
            <button type="button" onClick={() => go('catalogo')}>{editable(tienda?.diseno?.construccionNavOffers, 'Ofertas destacadas')}</button>
            <button type="button" onClick={() => go('contacto')}>Contacto</button>
          </nav>
          <button type="button" onClick={onOpenCart} className="inline-flex items-center gap-2 text-[14px] font-black text-[#151515]">
            <Icon icon="solar:cart-large-2-linear" width={34} />
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-xs">{carritoSize}</span>
            <span className="hidden sm:inline">{editable(tienda?.diseno?.construccionCartLabel, 'Mi carrito')}</span>
          </button>
        </div>
      </div>
    </header>
  );
}

function pickContact(tienda: any, diseno: any) {
  return {
    address: diseno?.construccionContactAddress || tienda?.direccionTienda || tienda?.direccionFiscal || tienda?.direccion || 'Dirección no configurada',
    phone: diseno?.construccionContactPhone || tienda?.whatsappTienda || tienda?.telefono || tienda?.celular || 'Teléfono no configurado',
    email: diseno?.construccionContactEmail || tienda?.email || tienda?.correo || 'Correo no configurado',
    hours: diseno?.construccionContactHours || tienda?.horarioAtencion || 'Horario no configurado',
  };
}

export default function ConstruccionContactPage({
  tienda,
  slug,
  diseno,
  cp,
  carrito = [],
  setCarrito,
  mostrarCarrito = false,
  setMostrarCarrito,
  actualizarCantidad,
  onNavigate,
  allCategories = [],
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

  const goCheckout = () => {
    if (onNavigate) onNavigate('checkout');
    else window.location.href = `/tienda/${slug}/checkout`;
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-white text-[#151515]" style={{ fontFamily: `'${diseno?.tipografia || 'Inter'}', sans-serif` }}>
      <HammerHeader
        tienda={{ ...tienda, diseno }}
        slug={slug}
        cp={cp}
        carritoSize={carrito.reduce((sum, item) => sum + Number(item.cantidad || 1), 0)}
        onOpenCart={() => setMostrarCarrito?.(true)}
        onNavigate={onNavigate}
      />

      <section className="bg-[#f4f4f4]">
        <div className="mx-auto max-w-7xl px-4 py-10 text-center lg:px-6">
          <p className="text-[13px] font-bold tracking-wide text-[#151515]">
            <button type="button" onClick={() => onNavigate ? onNavigate('home') : (window.location.href = `/tienda/${slug}`)}>Inicio</button>
            <span className="mx-2">/</span>
            <span>Contáctanos</span>
          </p>
          <h1 className="mt-4 text-[32px] font-medium text-[#111]">Contáctanos</h1>
        </div>
      </section>

      <main className="mx-auto max-w-7xl px-4 py-14 lg:px-6">
        <section className="grid gap-8 lg:grid-cols-[1.55fr_0.88fr]">
          <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.25 }} className="min-h-[320px] overflow-hidden bg-gray-100 md:min-h-[520px]">
            <iframe
              title="Mapa de contacto"
              src={`https://www.google.com/maps?q=${mapQuery}&output=embed`}
              className="h-full min-h-[320px] w-full border-0 md:min-h-[520px]"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </motion.div>

          <motion.form
            variants={fadeUp}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.25 }}
            className="bg-[#f4f4f4] p-8 md:p-10"
            onSubmit={(event) => {
              event.preventDefault();
              setSent(true);
            }}
          >
            <h2 className="text-[28px] font-black leading-tight text-[#151515]">{editable(diseno?.construccionContactTitle, 'Ponte en contacto con nosotros')}</h2>
            <p className="mt-4 max-w-sm text-[13px] font-semibold leading-6 text-gray-500">
              {editable(diseno?.construccionContactText, 'Completa el formulario y te responderemos lo antes posible.')}
            </p>

            <label className="mt-8 block text-[13px] font-bold text-gray-500">
              Tu nombre
              <input required className="mt-2 h-11 w-full rounded border border-gray-200 bg-white px-4 text-[13px] font-semibold outline-none focus:border-[#111]" />
            </label>
            <label className="mt-8 block text-[13px] font-bold text-gray-500">
              Tu correo
              <input required type="email" className="mt-2 h-11 w-full rounded border border-gray-200 bg-white px-4 text-[13px] font-semibold outline-none focus:border-[#111]" />
            </label>
            <label className="mt-8 block text-[13px] font-bold text-gray-500">
              Tu mensaje (opcional)
              <textarea rows={11} className="mt-2 w-full resize-none rounded border border-gray-200 bg-white p-4 text-[13px] font-semibold outline-none focus:border-[#111]" />
            </label>
            {sent && <p className="mt-4 rounded bg-white px-4 py-3 text-[13px] font-bold text-emerald-700">Mensaje registrado correctamente.</p>}
            <button type="submit" className="mt-7 rounded-md px-7 py-3 text-[13px] font-black uppercase text-[#111]" style={{ background: cp }}>
              {editable(diseno?.construccionContactSubmitLabel, 'Enviar')}
            </button>
          </motion.form>
        </section>

        <motion.section variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.3 }} className="mt-12 grid bg-[#f4f4f4] md:grid-cols-4">
          {[
            ['solar:map-point-bold', contact.address],
            ['solar:phone-bold', contact.phone],
            ['solar:letter-bold', contact.email],
            ['solar:clock-circle-bold', contact.hours],
          ].map(([icon, text], index) => (
            <div key={`${icon}-${index}`} className="flex items-center gap-5 border-b border-white px-7 py-7 md:border-b-0 md:border-r last:md:border-r-0">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-gray-300 bg-white text-[#151515]">
                <Icon icon={icon} width={22} />
              </span>
              <p className="text-[13px] font-bold leading-6 text-gray-500">{text}</p>
            </div>
          ))}
        </motion.section>
      </main>

      <ConstruccionFooter tienda={tienda} slug={slug} cp={cp} categories={allCategories || []} diseno={diseno} />

      {setCarrito && actualizarCantidad && (
        <ConstruccionCartModal
          isOpen={mostrarCarrito}
          onClose={() => setMostrarCarrito?.(false)}
          carrito={carrito}
          setCarrito={setCarrito}
          actualizarCantidad={actualizarCantidad}
          onCheckout={goCheckout}
          cp={cp}
          tienda={tienda}
        />
      )}
    </div>
  );
}
