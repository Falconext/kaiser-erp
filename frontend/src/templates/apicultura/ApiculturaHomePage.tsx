import { motion } from 'framer-motion';
import { Icon } from '@iconify/react';
import type { TemplateHomePageProps } from '@/templates/shared/types';
import TecnologiaCartModal from '@/components/tienda/TecnologiaCartModal';
import { ApiculturaFooter, ApiculturaHeader, ApiculturaProductCard, honeyAction } from './ApiculturaParts';
import { honeyCard, honeyEase, honeyHover, honeyPage, honeyPop, honeySection, honeyStagger, honeyTap, honeyViewport } from './motion';

const honeyPattern = {
  backgroundImage:
    'linear-gradient(30deg, rgba(0,0,0,.045) 12%, transparent 12.5%, transparent 87%, rgba(0,0,0,.045) 87.5%, rgba(0,0,0,.045)), linear-gradient(150deg, rgba(0,0,0,.045) 12%, transparent 12.5%, transparent 87%, rgba(0,0,0,.045) 87.5%, rgba(0,0,0,.045))',
  backgroundSize: '68px 40px',
};

const pickSelectedProducts = (productos: any[], ids?: any[]) => {
  if (!Array.isArray(ids) || ids.length === 0) return productos;
  const wanted = new Set(ids.map((id) => String(id)));
  const selected = productos.filter((producto) => wanted.has(String(producto.id)));
  return selected.length ? selected : productos;
};

function SectionTitle({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <motion.div variants={honeyPop} className="mb-9 text-center">
      <p className="font-serif text-3xl italic text-black md:text-4xl">{eyebrow}</p>
      <h2 className="mt-2 text-4xl font-black tracking-tight text-black md:text-5xl">{title}</h2>
    </motion.div>
  );
}

function DecorativeBee({ className = '' }: { className?: string }) {
  return (
    <motion.div
      animate={{ y: [0, -10, 0], rotate: [-4, 5, -4] }}
      transition={{ duration: 5.5, repeat: Infinity, ease: 'easeInOut' }}
      className={`pointer-events-none absolute flex h-24 w-24 items-center justify-center rounded-full bg-white/40 text-5xl shadow-xl shadow-yellow-900/10 ${className}`}
    >
      <Icon icon="mdi:bee" />
    </motion.div>
  );
}

function PromoBanner({
  image,
  onClick,
  alt = '',
}: {
  image: string;
  onClick: () => void;
  alt?: string;
}) {
  // Solo banner (imagen), clickeable. Sin texto ni botón.
  return (
    <motion.button
      type="button"
      onClick={onClick}
      className="group relative block aspect-[16/7] w-full overflow-hidden rounded-2xl bg-[#FFD72E] shadow-sm"
      whileHover={{ y: -5, scale: 1.01 }}
      whileTap={honeyTap}
      transition={{ duration: 0.25, ease: honeyEase }}
    >
      <img
        src={image}
        alt={alt}
        className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
      />
    </motion.button>
  );
}

export default function ApiculturaHomePage({
  tienda,
  slug,
  productos,
  allCategories,
  cp,
  diseno,
  carrito,
  setCarrito,
  mostrarCarrito,
  setMostrarCarrito,
  agregarAlCarrito,
  actualizarCantidad,
  loading,
}: TemplateHomePageProps) {
  const heroVideo = diseno?.apiculturaHeroVideoUrl || '/assets/templates/apicultura/video/video.mp4';
  const heroBackground = diseno?.apiculturaHeroBackgroundUrl || diseno?.apiculturaHeroImageUrl || '/assets/templates/apicultura/bannerapicultura.png';
  const latestPool = pickSelectedProducts(productos, diseno?.apiculturaLatestProducts);
  const featuredPool = pickSelectedProducts(productos, diseno?.apiculturaFeaturedProducts);
  const latestProducts = latestPool.slice(0, 4);
  const featuredProducts = featuredPool.slice(0, 4);
  const categoryItems = allCategories.slice(0, 4);
  const navigate = (to: string) => { window.location.href = to; };

  return (
    <motion.div initial="hidden" animate="show" variants={honeyPage} className="min-h-screen bg-white" style={{ fontFamily: `'${diseno?.tipografia || 'Inter'}', sans-serif` }}>
      <main>
        <motion.section variants={honeySection} className="relative isolate overflow-hidden bg-black">
          {/* Video de fondo a pantalla completa */}
          <video
            src={heroVideo}
            poster={heroBackground}
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            className="absolute inset-0 z-0 h-full w-full object-cover"
          />
          {/* Oscurecido general para contraste del texto */}
          <div className="absolute inset-0 z-0 bg-black/45" aria-hidden />
          {/* Degradado oscuro difuminado en la parte inferior */}
          <div className="absolute inset-x-0 bottom-0 z-0 h-2/5 bg-gradient-to-t from-black via-black/70 to-transparent" aria-hidden />

          {/* Header superpuesto sobre el banner */}
          <ApiculturaHeader
            tienda={tienda}
            slug={slug}
            cp={cp}
            diseno={diseno}
            carritoSize={carrito.reduce((sum, item) => sum + Number(item.cantidad || 1), 0)}
            onOpenCart={() => setMostrarCarrito(true)}
            allCategories={allCategories}
            onSearchSubmit={(event, value) => {
              event.preventDefault();
              navigate(`/tienda/${slug}/catalogo${value ? `?search=${encodeURIComponent(value)}` : ''}`);
            }}
            overlay
          />
          <button type="button" className="absolute left-6 top-1/2 z-20 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/35 text-white md:flex">
            <Icon icon="solar:alt-arrow-left-bold" />
          </button>
          <button type="button" className="absolute right-6 top-1/2 z-20 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/35 text-white md:flex">
            <Icon icon="solar:alt-arrow-right-bold" />
          </button>

          <div className="relative z-10 mx-auto flex min-h-[560px] max-w-7xl items-center px-5 pb-28 pt-16 md:min-h-[680px]">
            <motion.div initial={{ opacity: 0, x: -32 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }} className="max-w-2xl">
              <p className="font-serif text-4xl italic text-white/90 drop-shadow md:text-5xl">
                {diseno?.apiculturaHeroEyebrow || 'Lo mejor del sabor natural'}
              </p>
              <h1 className="mt-6 text-5xl font-black leading-[1.08] tracking-tight text-white drop-shadow-lg md:text-7xl">
                {diseno?.apiculturaHeroTitle || 'Miel cremada artesanal'}
              </h1>
              <motion.button
                type="button"
                onClick={() => honeyAction(diseno?.apiculturaHeroAction, slug, navigate)}
                className="mt-10 inline-flex h-12 items-center justify-center rounded-full px-8 text-sm font-black uppercase tracking-wide text-black shadow-lg transition-transform hover:scale-[1.03]"
                style={{ backgroundColor: cp }}
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={honeyTap}
              >
                {diseno?.apiculturaHeroButton || 'Comprar ahora'}
              </motion.button>
            </motion.div>
          </div>
        </motion.section>

        <motion.section variants={honeySection} initial="hidden" whileInView="show" viewport={honeyViewport} className="mx-auto max-w-7xl px-5 py-20">
          <SectionTitle eyebrow={diseno?.apiculturaFeaturesEyebrow || 'Nuestra distinción'} title={diseno?.apiculturaFeaturesTitle || 'Ofrecemos la mejor calidad'} />
          <motion.div variants={honeyStagger} className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {(categoryItems.length ? categoryItems : ['Miel Orgánica', 'Miel de Bosque', 'Miel de Granja', 'Miel Cremada']).map((category: any, index) => {
              const name = typeof category === 'string' ? category : category?.nombre;
              const icons = [
                '/assets/templates/apicultura/svg/icono1.svg',
                '/assets/templates/apicultura/svg/icono2.svg',
                '/assets/templates/apicultura/svg/icono3.svg',
              ];
              return (
                <motion.a key={`${name}-${index}`} variants={honeyCard} whileHover={honeyHover} href={`/tienda/${slug}/catalogo?category=${encodeURIComponent(name)}`} className="group rounded-md border border-gray-100 bg-white px-8 py-10 text-center transition-shadow hover:shadow-xl hover:shadow-yellow-900/10">
                  <img src={icons[index % icons.length]} alt={name} className="mx-auto h-20 w-20 object-contain transition-transform group-hover:scale-110" />
                  <h3 className="mt-5 text-lg font-black text-black">{name}</h3>
                  <p className="mt-3 text-sm font-semibold leading-6 text-gray-500">Explora productos seleccionados de esta categoría.</p>
                </motion.a>
              );
            })}
          </motion.div>
        </motion.section>

        <motion.section variants={honeySection} initial="hidden" whileInView="show" viewport={honeyViewport} className="mx-auto grid max-w-7xl gap-7 px-5 pb-20 md:grid-cols-2">
          <PromoBanner
            image={diseno?.apiculturaPromoLeftImageUrl || '/assets/templates/apicultura/widget1.png'}
            alt="Banner promocional"
            onClick={() => honeyAction(diseno?.apiculturaPromoLeftAction, slug, navigate)}
          />
          <PromoBanner
            image={diseno?.apiculturaPromoRightImageUrl || '/assets/templates/apicultura/widget2.png'}
            alt="Banner promocional"
            onClick={() => honeyAction(diseno?.apiculturaPromoRightAction, slug, navigate)}
          />
        </motion.section>

        <motion.section variants={honeySection} initial="hidden" whileInView="show" viewport={honeyViewport} className="mx-auto max-w-7xl px-5 pb-24">
          <SectionTitle eyebrow={diseno?.apiculturaLatestEyebrow || 'Novedades'} title={diseno?.apiculturaLatestTitle || 'Últimos productos'} />
          {loading ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, index) => <div key={index} className="h-[360px] animate-pulse rounded-md bg-yellow-50" />)}
            </div>
          ) : (
            <motion.div variants={honeyStagger} className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {latestProducts.map((producto) => (
                <ApiculturaProductCard
                  key={producto.id}
                  producto={producto}
                  slug={slug}
                  cp={cp}
                  onAddToCart={agregarAlCarrito}
                  onClick={() => navigate(`/tienda/${slug}/producto/${producto.id}`)}
                />
              ))}
            </motion.div>
          )}
        </motion.section>

        <motion.section variants={honeySection} initial="hidden" whileInView="show" viewport={honeyViewport} className="relative isolate overflow-hidden bg-[#FFD72E] px-5 py-20">
          {/* Banner de fondo de la sección */}
          <img src={diseno?.apiculturaWhyBannerUrl || '/assets/templates/apicultura/elijeproducto.png'} alt="" aria-hidden className="absolute inset-0 z-0 h-full w-full object-cover" />
          <div className="relative z-10 mx-auto max-w-7xl">
            <SectionTitle eyebrow={diseno?.apiculturaWhyEyebrow || 'Por qué elegirnos'} title={diseno?.apiculturaWhyTitle || 'Por qué elegir nuestros productos'} />
            <div className="grid items-center gap-10 lg:grid-cols-[1fr_420px_1fr]">
              <div className="space-y-16 text-center">
                <motion.div variants={honeyCard}>
                  <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-white text-4xl text-amber-500"><Icon icon="mdi:bee" /></div>
                  <h3 className="text-lg font-black text-black">{diseno?.apiculturaWhyOneTitle || 'Producción de miel'}</h3>
                  <p className="mt-2 text-sm font-semibold leading-6 text-black/70">{diseno?.apiculturaWhyOneText || 'Procesos cuidados y productos listos para tu tienda.'}</p>
                </motion.div>
                <motion.div variants={honeyCard}>
                  <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-white text-4xl text-amber-500"><Icon icon="solar:bottle-bold" /></div>
                  <h3 className="text-lg font-black text-black">{diseno?.apiculturaWhyTwoTitle || 'Dulzura natural'}</h3>
                  <p className="mt-2 text-sm font-semibold leading-6 text-black/70">{diseno?.apiculturaWhyTwoText || 'Ingredientes naturales y presentación clara.'}</p>
                </motion.div>
              </div>
              <div className="relative">
                <motion.div animate={{ y: [0, -12, 0] }} transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }} className="mx-auto flex aspect-square max-w-[420px] items-center justify-center rounded-full bg-white/35 p-8">
                  <motion.img
                    src={diseno?.apiculturaWhyImageUrl || '/assets/templates/apicultura/productobase.png'}
                    alt=""
                    className="h-full w-full object-contain drop-shadow-2xl"
                    whileHover={{ scale: 1.035, rotate: 1.5 }}
                    transition={{ duration: 0.35, ease: honeyEase }}
                  />
                </motion.div>
              </div>
              <div className="space-y-16 text-center">
                <motion.div variants={honeyCard}>
                  <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-white text-4xl text-amber-500"><Icon icon="solar:shop-bold" /></div>
                  <h3 className="text-lg font-black text-black">{diseno?.apiculturaWhyThreeTitle || 'Despacho confiable'}</h3>
                  <p className="mt-2 text-sm font-semibold leading-6 text-black/70">{diseno?.apiculturaWhyThreeText || 'Entrega o recojo según configuración de tienda.'}</p>
                </motion.div>
                <motion.div variants={honeyCard}>
                  <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-white text-4xl text-amber-500"><Icon icon="solar:shield-check-bold" /></div>
                  <h3 className="text-lg font-black text-black">{diseno?.apiculturaWhyFourTitle || '100% Natural'}</h3>
                  <p className="mt-2 text-sm font-semibold leading-6 text-black/70">{diseno?.apiculturaWhyFourText || 'Comunicación transparente para el comprador.'}</p>
                </motion.div>
              </div>
            </div>
          </div>
        </motion.section>

        <motion.section variants={honeySection} initial="hidden" whileInView="show" viewport={honeyViewport} className="mx-auto max-w-7xl px-5 py-20">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div className="overflow-hidden rounded-2xl bg-[#FFD72E] shadow-lg shadow-yellow-900/10">
              <img
                src={diseno?.apiculturaAboutImageUrl || '/assets/templates/apicultura/nosotros.png'}
                alt="Nosotros"
                className="h-[360px] w-full object-cover md:h-[440px]"
              />
            </div>
            <div>
              <p className="font-serif text-4xl italic text-black">{diseno?.apiculturaAboutEyebrow || 'Nosotros'}</p>
              <h2 className="mt-3 text-4xl font-black leading-tight text-black">{diseno?.apiculturaAboutTitle || 'Miel natural para tu día a día'}</h2>
              <p className="mt-5 text-base font-semibold leading-8 text-gray-500">
                {diseno?.apiculturaAboutText || tienda?.descripcionTienda || 'Presenta tu marca con una experiencia cálida, clara y enfocada en productos naturales.'}
              </p>
              <motion.button
                type="button"
                onClick={() => honeyAction(diseno?.apiculturaAboutAction, slug, navigate)}
                className="mt-8 inline-flex h-12 items-center justify-center rounded-full bg-black px-8 text-sm font-black uppercase text-white"
                whileHover={{ scale: 1.04, y: -2 }}
                whileTap={honeyTap}
              >
                {diseno?.apiculturaAboutButton || 'Comprar ahora'}
              </motion.button>
            </div>
          </div>
        </motion.section>

        <motion.section variants={honeySection} initial="hidden" whileInView="show" viewport={honeyViewport} className="mx-auto max-w-7xl px-5 pb-24">
          <SectionTitle eyebrow={diseno?.apiculturaFeaturedEyebrow || 'Productos populares'} title={diseno?.apiculturaFeaturedTitle || 'Productos destacados'} />
          <motion.div variants={honeyStagger} className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {featuredProducts.map((producto) => (
              <ApiculturaProductCard
                key={producto.id}
                producto={producto}
                slug={slug}
                cp={cp}
                onAddToCart={agregarAlCarrito}
                onClick={() => navigate(`/tienda/${slug}/producto/${producto.id}`)}
              />
            ))}
          </motion.div>
        </motion.section>
      </main>

      <ApiculturaFooter tienda={tienda} slug={slug} diseno={diseno} cp={cp} categories={allCategories} />
      <TecnologiaCartModal
        isOpen={mostrarCarrito}
        onClose={() => setMostrarCarrito(false)}
        carrito={carrito}
        setCarrito={setCarrito}
        actualizarCantidad={actualizarCantidad}
        onCheckout={() => { window.location.href = `/tienda/${slug}/checkout`; }}
        cp={cp}
        tienda={tienda}
      />
    </motion.div>
  );
}
