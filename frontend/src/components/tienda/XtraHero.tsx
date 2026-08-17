import { Icon } from '@iconify/react';

interface XtraHeroProps {
  tienda: any;
  productos: any[];
  cp: string;
  onExplore?: () => void;
}

export default function XtraHero({ tienda, productos, cp, onExplore }: XtraHeroProps) {
  const storeName = tienda.nombreComercial || 'Mi Tienda';
  const rubroNombre = tienda.empresa?.rubro?.nombre ?? tienda.rubro?.nombre ?? '';

  // Derive hero keyword from rubro or store name
  const heroKeyword = rubroNombre
    ? rubroNombre.split(' ').slice(0, 2).join(' ')
    : storeName.split(' ')[0];

  const heroDesc =
    tienda.descripcion ||
    `Descubre los mejores productos de ${storeName}. Calidad garantizada y los mejores precios del mercado.`;

  const featured = productos[0];
  const floating = productos[1] ?? productos[0];

  return (
    <section
      className="mx-4 lg:mx-8 my-4 rounded-3xl overflow-hidden relative"
      style={{ background: '#0B1340', minHeight: 480 }}
    >
      {/* Diagonal grid lines */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            'repeating-linear-gradient(-45deg, transparent, transparent 22px, rgba(255,255,255,0.025) 22px, rgba(255,255,255,0.025) 23px)',
        }}
      />

      <div className="relative grid grid-cols-1 lg:grid-cols-2 items-center min-h-[480px]">

        {/* ── Left: text ── */}
        <div className="px-8 lg:px-16 py-12 lg:py-20">
          {/* Eyebrow pill */}
          <div
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold text-white mb-6"
            style={{ background: `${cp}30`, border: `1px solid ${cp}50` }}
          >
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: cp }} />
            Nuevos productos disponibles
          </div>

          {/* Headline */}
          <h1 className="text-4xl lg:text-5xl font-black text-white leading-tight mb-5">
            Obtén{' '}
            <span style={{ color: cp }}>{heroKeyword}</span>
            <br />
            Al Mejor Precio.
          </h1>

          {/* Description */}
          <p className="text-gray-400 text-sm leading-relaxed mb-8 max-w-md">
            {heroDesc}
          </p>

          {/* CTAs */}
          <div className="flex items-center gap-4 flex-wrap">
            <button
              onClick={onExplore}
              className="flex items-center gap-3 px-6 py-3 rounded-full text-white font-bold text-sm shadow-lg transition-opacity hover:opacity-90"
              style={{ background: cp }}
            >
              Explorar Ahora
              <span className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center">
                <Icon icon="solar:arrow-right-bold" className="text-sm" />
              </span>
            </button>
            <button className="flex items-center gap-3 text-white text-sm font-medium hover:opacity-80 transition-opacity">
              <span className="w-10 h-10 rounded-full border border-white/30 flex items-center justify-center bg-white/10">
                <Icon icon="solar:play-bold" className="text-sm" />
              </span>
              Ver Promoción
            </button>
          </div>
        </div>

        {/* ── Right: product showcase ── */}
        <div className="relative flex items-center justify-center h-64 lg:h-auto lg:min-h-[480px] px-8 lg:px-12 pb-8 lg:pb-0">
          {/* Color blobs */}
          <div
            className="absolute w-64 h-64 rounded-full blur-3xl opacity-25 pointer-events-none"
            style={{ background: cp, right: '5%', top: '15%' }}
          />
          <div
            className="absolute w-52 h-52 rounded-full blur-2xl opacity-35 pointer-events-none"
            style={{
              background: 'radial-gradient(circle, #e879f9 0%, #f97316 100%)',
              right: '20%',
              top: '20%',
            }}
          />

          {featured && (
            <div className="relative z-10">
              {/* Featured product image */}
              <img
                src={featured.imagenUrl}
                alt={featured.descripcion}
                className="w-64 h-64 lg:w-80 lg:h-80 object-contain rounded-2xl"
                style={{ filter: 'drop-shadow(0 25px 50px rgba(0,0,0,0.5))' }}
              />

              {/* Floating mini card */}
              {floating && (
                <div
                  className="absolute bottom-2 -right-4 lg:-right-8 z-20 bg-white rounded-2xl shadow-2xl p-3 flex items-center gap-3"
                  style={{ minWidth: 190 }}
                >
                  <img
                    src={floating.imagenUrl}
                    alt=""
                    className="w-11 h-11 rounded-xl object-contain flex-shrink-0 bg-gray-50"
                  />
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-gray-900 line-clamp-1 leading-tight">
                      {floating.descripcion}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Precio:{' '}
                      <span className="font-semibold" style={{ color: cp }}>
                        S/ {Number(floating.precioUnitario).toFixed(2)}
                      </span>
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Placeholder when no products yet */}
          {!featured && (
            <div className="w-64 h-64 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
              <Icon icon="solar:box-linear" className="text-white/20 text-6xl" />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
