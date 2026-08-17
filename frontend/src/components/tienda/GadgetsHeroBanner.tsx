import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Icon } from '@iconify/react';

interface Props {
  tienda: any;
  diseno: any;
}

const INTERVAL = 5000;

export default function GadgetsHeroBanner({ tienda, diseno }: Props) {
  const navigate = useNavigate();
  const { slug } = useParams();
  const [current, setCurrent] = useState(0);
  const [loaded, setLoaded] = useState<Record<number, boolean>>({});
  const [paused, setPaused] = useState(false);
  const touchX = useRef(0);
  const cp = diseno?.colorPrimario || '#FF9500';

  const banners = (tienda?.banners || [])
    .filter((b: any) => b.activo !== false)
    .sort((a: any, b: any) => a.orden - b.orden);

  useEffect(() => {
    if (banners.length <= 1 || paused) return;
    const t = setInterval(() => setCurrent(p => (p + 1) % banners.length), INTERVAL);
    return () => clearInterval(t);
  }, [banners.length, paused]);

  const handleClick = (url?: string) => {
    if (!url) return;
    if (url.startsWith('http') || url.startsWith('//')) { window.location.href = url; return; }
    navigate(url.startsWith('/tienda') ? url : `/tienda/${slug}/${url.replace(/^\//, '')}`);
  };

  const prev = () => setCurrent(p => (p - 1 + banners.length) % banners.length);
  const next = () => setCurrent(p => (p + 1) % banners.length);

  if (banners.length === 0) return null;

  return (
    <div
      className="relative mx-4 lg:mx-8 my-4 rounded-3xl h-[420px] md:h-[540px] overflow-hidden"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={(e) => { touchX.current = e.touches[0].clientX; }}
      onTouchEnd={(e) => {
        const diff = touchX.current - e.changedTouches[0].clientX;
        if (Math.abs(diff) > 50) diff > 0 ? next() : prev();
      }}
    >
      {banners.map((b: any, i: number) => (
        <div
          key={b.id}
          className={`absolute inset-0 transition-opacity duration-700 cursor-pointer ${i === current ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}
          onClick={() => handleClick(b.linkUrl)}
        >
          {b.imagenUrl ? (
            <img
              src={b.imagenUrl}
              alt={b.titulo || `Banner ${i + 1}`}
              className={`w-full h-full object-fill transition-opacity duration-700 ${loaded[i] ? 'opacity-100' : 'opacity-0'}`}
              onLoad={() => setLoaded(p => ({ ...p, [i]: true }))}
            />
          ) : (
            <div className="w-full h-full bg-[#0B1340]" />
          )}

          {/* Text content */}
          {(b.titulo || b.subtitulo) && (
            <div className="absolute inset-y-0 left-0 flex flex-col justify-center px-8 md:px-16 max-w-2xl z-10">
              <h2 className="text-3xl md:text-5xl font-black text-white leading-[1.1] mb-4">
                {b.titulo}
              </h2>
              {b.subtitulo && (
                <p className="text-white/85 text-sm md:text-base leading-relaxed mb-8 max-w-sm">
                  {b.subtitulo}
                </p>
              )}
              {b.linkUrl && (
                <button
                  onClick={(e) => { e.stopPropagation(); handleClick(b.linkUrl); }}
                  className="w-fit flex items-center gap-2 text-white text-sm font-bold px-6 py-3 rounded-full transition-all hover:opacity-90 shadow-xl"
                  style={{ background: cp }}
                >
                  Ver más
                  <Icon icon="solar:alt-arrow-right-bold" width={14} />
                </button>
              )}
            </div>
          )}
        </div>
      ))}

      {banners.length > 1 && (
        <>
          <button
            onClick={(e) => { e.stopPropagation(); prev(); }}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-white/20 hover:bg-white/40 backdrop-blur-sm flex items-center justify-center transition-colors"
          >
            <Icon icon="solar:alt-arrow-left-bold" className="text-white" width={18} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); next(); }}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-white/20 hover:bg-white/40 backdrop-blur-sm flex items-center justify-center transition-colors"
          >
            <Icon icon="solar:alt-arrow-right-bold" className="text-white" width={18} />
          </button>
          <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2">
            {banners.map((_: any, i: number) => (
              <button
                key={i}
                onClick={(e) => { e.stopPropagation(); setCurrent(i); }}
                className={`rounded-full transition-all duration-300 ${i === current ? 'w-6 h-2 bg-white' : 'w-2 h-2 bg-white/50 hover:bg-white/75'}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
