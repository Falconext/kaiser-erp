import { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';

interface TiendaFloatingButtonsProps {
  diseno?: any;
  tienda?: any;
}

/**
 * Botones flotantes para la tienda virtual:
 * - Shalom: abre la web de agencias de Shalom para recojo en agencia
 * - Ubicación: abre Google Maps con la dirección de la tienda
 * - TikTok Live: enlace al perfil/live de TikTok del negocio
 *
 * Los botones se muestran si el dueño ha configurado los campos
 * correspondientes en diseno (shalomEnabled, ubicacionEnabled, etc.)
 */
export default function TiendaFloatingButtons({ diseno, tienda }: TiendaFloatingButtonsProps) {
  const [expanded, setExpanded] = useState(false);
  const [pulse, setPulse] = useState(false);

  // Pulse animation on TikTok Live button if live is enabled
  useEffect(() => {
    if (!diseno?.tiktokLiveUrl) return;
    const t = setInterval(() => setPulse(p => !p), 1800);
    return () => clearInterval(t);
  }, [diseno?.tiktokLiveUrl]);

  const cp = diseno?.colorPrimario || '#D92D20';

  // Which buttons to show
  const showShalom = !!diseno?.shalomEnabled;
  const showUbicacion = !!(diseno?.ubicacionUrl || tienda?.direccion || diseno?.ubicacionDireccion);
  const showTikTok = !!diseno?.tiktokLiveUrl;

  const hasAnyButton = showShalom || showUbicacion || showTikTok;
  if (!hasAnyButton) return null;

  const handleShalom = () => {
    const url = diseno?.shalomUrl || 'https://www.shalom.pe/agencias';
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleUbicacion = () => {
    const direccion = diseno?.ubicacionUrl
      || tienda?.direccion
      || diseno?.ubicacionDireccion
      || '';
    if (!direccion) return;
    const googleMapsUrl = direccion.startsWith('http')
      ? direccion
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(direccion)}`;
    window.open(googleMapsUrl, '_blank', 'noopener,noreferrer');
  };

  const handleTikTok = () => {
    window.open(diseno.tiktokLiveUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="fixed bottom-6 right-5 z-[99998] flex flex-col items-end gap-2.5">

      {/* Expandable action buttons */}
      {expanded && (
        <div className="flex flex-col items-end gap-2.5 animate-in slide-in-from-bottom-3 fade-in duration-200">

          {/* TikTok Live */}
          {showTikTok && (
            <button
              onClick={handleTikTok}
              title="Ver TikTok Live"
              className="group relative flex items-center gap-3"
            >
              {/* Label */}
              <span className="bg-black text-white text-[11px] font-bold px-3 py-1.5 rounded-full shadow-lg whitespace-nowrap">
                Ver Live en TikTok
                {pulse && <span className="ml-1.5 inline-block w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />}
              </span>
              {/* Icon button */}
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center shadow-xl border-2 border-white transition-transform hover:scale-110 active:scale-95 relative"
                style={{ background: 'linear-gradient(135deg, #ff0050, #00f2ea)' }}
              >
                <Icon icon="ic:baseline-tiktok" width={22} className="text-white" />
                {pulse && (
                  <span className="absolute inset-0 rounded-full animate-ping opacity-30" style={{ background: 'linear-gradient(135deg, #ff0050, #00f2ea)' }} />
                )}
              </div>
            </button>
          )}

          {/* Ubicación / Mapa */}
          {showUbicacion && (
            <button
              onClick={handleUbicacion}
              title="Ver ubicación en mapa"
              className="group flex items-center gap-3"
            >
              <span className="bg-blue-600 text-white text-[11px] font-bold px-3 py-1.5 rounded-full shadow-lg whitespace-nowrap">
                ¿Dónde estamos?
              </span>
              <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center shadow-xl border-2 border-white transition-transform hover:scale-110 active:scale-95">
                <Icon icon="solar:map-point-bold" width={22} className="text-white" />
              </div>
            </button>
          )}

          {/* Shalom – Recojo en Agencia */}
          {showShalom && (
            <button
              onClick={handleShalom}
              title="Recojo en agencia Shalom"
              className="group flex items-center gap-3"
            >
              <span className="text-white text-[11px] font-bold px-3 py-1.5 rounded-full shadow-lg whitespace-nowrap" style={{ background: '#E31F26' }}>
                Recojo en Shalom
              </span>
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center shadow-xl border-2 border-white transition-transform hover:scale-110 active:scale-95"
                style={{ background: '#E31F26' }}
              >
                {/* Shalom truck icon */}
                <Icon icon="solar:delivery-bold" width={22} className="text-white" />
              </div>
            </button>
          )}
        </div>
      )}

      {/* Main toggle FAB */}
      <button
        onClick={() => setExpanded(e => !e)}
        title={expanded ? 'Cerrar opciones' : 'Ver más opciones'}
        className="w-14 h-14 rounded-full flex items-center justify-center shadow-2xl border-2 border-white transition-all duration-300 hover:scale-110 active:scale-95"
        style={{ backgroundColor: cp }}
      >
        <Icon
          icon={expanded ? 'solar:close-bold' : 'solar:widget-4-bold'}
          width={24}
          className={`text-white transition-transform duration-300 ${expanded ? 'rotate-90' : ''}`}
        />
      </button>
    </div>
  );
}
