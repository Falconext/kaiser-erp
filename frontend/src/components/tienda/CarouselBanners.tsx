import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Icon } from '@iconify/react';
import { SLIDER_MAX_COUNT } from './resolveTemplate';

interface CarouselBannersProps {
  tienda: any;
  diseno: any;
}

const SLIDE_INTERVAL = 4000;

export default function CarouselBanners({ tienda, diseno }: CarouselBannersProps) {
  const navigate = useNavigate();
  const { slug } = useParams();
  const [current, setCurrent] = useState(0);
  const [imgLoaded, setImgLoaded] = useState<Record<number, boolean>>({});
  const [isPaused, setIsPaused] = useState(false);
  const touchStartX = useRef(0);
  const cp = diseno?.colorPrimario || '#FF9500';

  const slides = (tienda?.banners || [])
    .filter((b: any) => b.orden < SLIDER_MAX_COUNT && b.activo !== false)
    .sort((a: any, b: any) => a.orden - b.orden);

  useEffect(() => {
    if (slides.length <= 1 || isPaused) return;
    const timer = setInterval(() => {
      setCurrent(prev => (prev + 1) % slides.length);
    }, SLIDE_INTERVAL);
    return () => clearInterval(timer);
  }, [slides.length, isPaused]);

  const handleClick = (url?: string) => {
    if (!url) return;
    if (url.startsWith('http') || url.startsWith('//')) { window.location.href = url; return; }
    if (url.startsWith('/tienda') || url.startsWith('tienda')) {
      navigate(url.startsWith('/') ? url : `/${url}`); return;
    }
    navigate(`/tienda/${slug}/${url.startsWith('/') ? url.substring(1) : url}`);
  };

  const prev = () => setCurrent(p => (p - 1 + slides.length) % slides.length);
  const next = () => setCurrent(p => (p + 1) % slides.length);

  const onTouchStart = (e: React.TouchEvent) => { touchStartX.current = e.touches[0].clientX; };
  const onTouchEnd = (e: React.TouchEvent) => {
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) diff > 0 ? next() : prev();
  };

  if (slides.length === 0) return null;

  return (
    <div className="max-w-screen-xl mx-auto px-5 md:px-8 mb-10">
      <div
        className="relative rounded-3xl overflow-hidden h-[300px] md:h-[460px] cursor-pointer"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {slides.map((slide: any, i: number) => {
          const isSoloImagen = !slide.titulo && !slide.subtitulo;
          return (
            <div
              key={slide.id}
              className={`absolute inset-0 transition-opacity duration-700 ${i === current ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}
              style={{ background: cp }}
              onClick={() => handleClick(slide.linkUrl)}
            >
              {!isSoloImagen && (
                <div className="absolute right-[28%] top-1/2 -translate-y-1/2 w-72 h-72 rounded-full bg-[#FFB347] opacity-60 pointer-events-none" />
              )}
              {!isSoloImagen && (
                <div className="absolute left-0 top-0 bottom-0 w-full md:w-[45%] p-8 md:p-12 flex flex-col justify-center z-10">
                  <h2 className="text-3xl md:text-5xl font-black text-white leading-[1.1] mb-4">{slide.titulo}</h2>
                  {slide.subtitulo && (
                    <p className="text-white/85 text-sm md:text-base leading-relaxed mb-8 max-w-xs">{slide.subtitulo}</p>
                  )}
                  {slide.boton && (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleClick(slide.linkUrl); }}
                      className="w-fit flex items-center gap-2 bg-white text-[#1A1A1A] text-sm font-bold px-6 py-3 rounded-full hover:bg-[#FFF3E0] transition-colors shadow-sm"
                    >
                      {slide.boton}
                      <Icon icon="solar:alt-arrow-right-bold" width={14} />
                    </button>
                  )}
                </div>
              )}
              {slide.imagenUrl && (
                <div className={`absolute right-0 bottom-0 top-0 ${isSoloImagen ? 'w-full' : 'w-[55%] hidden md:block'}`}>
                  <img
                    src={slide.imagenUrl}
                    alt={slide.titulo || `Slide ${i + 1}`}
                    className={`w-full h-full ${isSoloImagen ? 'object-cover' : 'object-contain object-bottom'} transition-opacity duration-700 ${imgLoaded[i] ? 'opacity-100' : 'opacity-0'}`}
                    onLoad={() => setImgLoaded(p => ({ ...p, [i]: true }))}
                  />
                </div>
              )}
            </div>
          );
        })}

        {slides.length > 1 && (
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
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2">
              {slides.map((_: any, i: number) => (
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
    </div>
  );
}
