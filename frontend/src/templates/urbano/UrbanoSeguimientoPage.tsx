import { useNavigate } from 'react-router-dom';
import { Icon } from '@iconify/react';
import UrbanoHeader from './UrbanoHeader';
import UrbanoFooter from './UrbanoFooter';
import LineaTiempoEstados from '@/components/LineaTiempoEstados';
import type { TemplateSeguimientoPageProps } from '@/templates/shared/types';
import { buildStorePurchaseWhatsappUrl } from '@/utils/storeWhatsapp';

const IMPACT = '"Impact", "Arial Black", sans-serif';

const ESTADO_META: Record<string, { icon: string; label: string; color: string }> = {
  PENDIENTE:            { icon: 'solar:clock-circle-bold',    label: 'Pendiente',             color: '#F59E0B' },
  CONFIRMADO:           { icon: 'solar:check-circle-bold',    label: 'Confirmado',            color: '#3B82F6' },
  EN_PREPARACION:       { icon: 'solar:box-bold',             label: 'En Preparación',        color: '#8B5CF6' },
  EN_TRANSITO:          { icon: 'solar:delivery-bold',        label: 'En Tránsito',           color: '#6366F1' },
  REPROGRAMADO:         { icon: 'solar:calendar-bold',        label: 'Reprogramado',          color: '#F97316' },
  LISTO:                { icon: 'solar:bag-check-bold',       label: 'Listo para recoger',    color: '#10B981' },
  ENTREGADO:            { icon: 'solar:home-check-bold',      label: 'Entregado',             color: '#111' },
  ENTREGADO_COMPLETADO: { icon: 'solar:home-check-bold',      label: 'Entregado',             color: '#111' },
  CANCELADO:            { icon: 'solar:close-circle-bold',    label: 'Cancelado',             color: '#EF4444' },
  CANCELADO_INTERNO:    { icon: 'solar:close-circle-bold',    label: 'Cancelado',             color: '#EF4444' },
  CANCELADO_CLIENTE:    { icon: 'solar:close-circle-bold',    label: 'Cancelado por cliente', color: '#EF4444' },
};

function StatusBadge({ estado }: { estado: string }) {
  const meta = ESTADO_META[estado] || { icon: 'solar:box-bold', label: estado, color: '#111' };
  return (
    <span
      className="inline-flex items-center gap-2 px-4 py-1.5 text-[11px] font-black uppercase tracking-[0.15em]"
      style={{ backgroundColor: `${meta.color}18`, color: meta.color, border: `1.5px solid ${meta.color}30` }}
    >
      <Icon icon={meta.icon} width={14} />
      {meta.label}
    </span>
  );
}

export default function UrbanoSeguimientoPage({
  slug, tienda, diseno,
  codigo, setCodigo, pedido, loading, error,
  handleSubmit, compartirSeguimiento, copiedLink,
  getEstadoSeguimiento, lastUpdated, TERMINAL_STATES,
}: TemplateSeguimientoPageProps) {
  const navigate = useNavigate();
  const storeWhatsappNumber = tienda?.whatsappTienda ?? tienda?.diseno?.whatsappTienda ?? diseno?.whatsappTienda;
  const whatsappUrl = pedido
    ? buildStorePurchaseWhatsappUrl(storeWhatsappNumber, `Hola, necesito ayuda con mi pedido ${pedido.codigoSeguimiento || ''}.`)
    : null;
  const estadoSeguimiento = pedido ? getEstadoSeguimiento(pedido) : '';
  const tiempoBase = (pedido?.empresa as any)?.tiempoPreparacionMin ?? 20;
  const estimada = pedido ? new Date(new Date(pedido.creadoEn).getTime() + tiempoBase * 60000) : null;

  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: '"Inter", sans-serif' }}>
      <UrbanoHeader
        tienda={tienda}
        slug={slug}
        cp={''}
        carritoSize={0}
        onOpenCart={() => navigate(`/tienda/${slug}/checkout`)}
        categories={[]}
        diseno={diseno}
      />

      {/* Hero strip */}
      <div className="w-full bg-black py-14 px-4 text-center relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              'repeating-linear-gradient(0deg, transparent, transparent 39px, #fff 39px, #fff 40px), repeating-linear-gradient(90deg, transparent, transparent 39px, #fff 39px, #fff 40px)',
          }}
        />
        <p className="text-[10px] font-bold tracking-[0.4em] text-gray-500 uppercase mb-3">
          Seguimiento en tiempo real
        </p>
        <h1
          className="text-4xl md:text-6xl font-black text-white tracking-tighter uppercase"
          style={{ fontFamily: IMPACT }}
        >
          Tu Pedido
        </h1>
      </div>

      <div className="max-w-[1100px] mx-auto px-4 md:px-8 py-12 md:py-16">

        {/* Search */}
        <div className="border-2 border-black p-6 md:p-8 mb-10">
          <p className="text-[10px] font-black tracking-[0.3em] uppercase text-gray-400 mb-5">
            Código de seguimiento
          </p>
          <form onSubmit={handleSubmit} className="flex flex-col md:flex-row gap-3">
            <div className="flex-1 flex items-center border-2 border-gray-200 focus-within:border-black transition-colors px-4 py-3 gap-3">
              <Icon icon="solar:delivery-linear" className="text-gray-400 flex-shrink-0" width={20} />
              <input
                type="text"
                value={codigo}
                onChange={(e) => setCodigo(e.target.value.toUpperCase())}
                placeholder="Ej: PED-ABC123-XYZ"
                className="w-full bg-transparent text-sm font-bold uppercase tracking-wide focus:outline-none text-black placeholder-gray-300"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="px-10 py-3 bg-black text-white text-[11px] font-black tracking-[0.2em] uppercase hover:bg-gray-900 transition-colors disabled:bg-gray-400 flex items-center justify-center gap-2"
            >
              {loading ? (
                <><Icon icon="eos-icons:loading" width={18} /> Buscando...</>
              ) : (
                <><Icon icon="solar:magnifer-linear" width={16} /> Buscar</>
              )}
            </button>
          </form>

          {error && (
            <div className="mt-4 flex items-center gap-3 border-l-4 border-red-500 bg-red-50 px-4 py-3">
              <Icon icon="solar:danger-triangle-bold" className="text-red-500 flex-shrink-0" width={20} />
              <p className="text-sm font-bold text-red-700">{error}</p>
            </div>
          )}
        </div>

        {/* Empty state */}
        {!pedido && !loading && !error && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-20 h-20 border-2 border-black flex items-center justify-center mb-6">
              <Icon icon="solar:box-minimalistic-linear" width={36} className="text-black" />
            </div>
            <p className="text-[11px] font-black tracking-[0.3em] uppercase text-gray-400 mb-2">
              Consulta tu pedido
            </p>
            <p className="text-sm text-gray-400 max-w-xs">
              Ingresa el código de seguimiento que recibiste por WhatsApp o correo para ver el estado de tu compra.
            </p>
          </div>
        )}

        {/* Result */}
        {pedido && (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">

            {/* Left: Estado + Timeline */}
            <div className="lg:col-span-3 flex flex-col gap-6">

              <div className="border-2 border-black p-6">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-6">
                  <div>
                    <p className="text-[10px] font-black tracking-[0.3em] text-gray-400 uppercase mb-2">
                      Pedido #{pedido.codigoSeguimiento}
                    </p>
                    <StatusBadge estado={estadoSeguimiento} />
                  </div>
                  <div className="flex items-center gap-3 flex-wrap">
                    {!TERMINAL_STATES.includes(estadoSeguimiento) && (
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                        <span className="text-[10px] font-bold tracking-widest uppercase text-gray-400">
                          En vivo{lastUpdated ? ` · ${lastUpdated.toLocaleTimeString('es-PE', { hour: 'numeric', minute: '2-digit' })}` : ''}
                        </span>
                      </div>
                    )}
                    <button
                      onClick={compartirSeguimiento}
                      className="flex items-center gap-1.5 text-[10px] font-black tracking-widest uppercase px-3 py-1.5 border-2 border-gray-200 hover:border-black transition-colors"
                    >
                      <Icon icon={copiedLink ? 'solar:check-circle-bold' : 'solar:share-bold'} width={14} />
                      {copiedLink ? '¡Copiado!' : 'Compartir'}
                    </button>
                  </div>
                </div>

                {estimada && !TERMINAL_STATES.includes(estadoSeguimiento) && (
                  <div className="flex items-center gap-4 border-t-2 border-gray-100 pt-5">
                    <div className="w-12 h-12 bg-black flex items-center justify-center flex-shrink-0">
                      <Icon icon="solar:delivery-bold" className="text-white" width={22} />
                    </div>
                    <div>
                      <p className="text-[10px] font-black tracking-[0.2em] uppercase text-gray-400">
                        Entrega estimada
                      </p>
                      <p className="text-base font-black text-black">
                        {estimada.toLocaleTimeString('es-PE', { hour: 'numeric', minute: '2-digit' })}
                        <span className="text-xs font-normal text-gray-500 ml-2">
                          ({tiempoBase}–{tiempoBase + 10} min)
                        </span>
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className="border-2 border-black p-6">
                <p className="text-[10px] font-black tracking-[0.3em] uppercase mb-6">
                  Historial de estados
                </p>
                {pedido.historialEstados && pedido.historialEstados.length > 0 ? (
                  <LineaTiempoEstados
                    historial={pedido.historialEstados}
                    estadoActual={estadoSeguimiento}
                  />
                ) : (
                  <p className="text-sm text-gray-400">Sin historial disponible aún.</p>
                )}
              </div>
            </div>

            {/* Right: Resumen orden */}
            <div className="lg:col-span-2 flex flex-col gap-6">
              <div className="border-2 border-black p-6">
                <p className="text-[10px] font-black tracking-[0.3em] uppercase mb-6">
                  Detalle de la orden
                </p>

                <div className="space-y-3 mb-6">
                  {pedido.items.map((item: any) => (
                    <div key={item.id} className="flex gap-3 border-b border-gray-100 pb-3 last:border-0 last:pb-0">
                      <div className="w-14 h-14 bg-[#F4F5F6] flex-shrink-0 overflow-hidden border border-gray-200">
                        {item.producto?.imagenUrl ? (
                          <img
                            src={item.producto.imagenUrl}
                            alt={item.producto.descripcion}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Icon icon="solar:t-shirt-linear" className="text-gray-300" width={20} />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-bold uppercase truncate">{item.producto.descripcion}</p>
                        <p className="text-[11px] text-gray-500">Cant: {item.cantidad}</p>
                      </div>
                      <p className="text-[12px] font-black flex-shrink-0">S/ {item.subtotal.toFixed(2)}</p>
                    </div>
                  ))}
                </div>

                <div className="border-t-2 border-black pt-4 space-y-2 text-[12px]">
                  <div className="flex justify-between text-gray-500">
                    <span>Subtotal</span>
                    <span>S/ {Number(pedido.subtotal).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-gray-500">
                    <span>Delivery</span>
                    <span>{pedido.costoEnvio > 0 ? `S/ ${Number(pedido.costoEnvio).toFixed(2)}` : 'Gratis'}</span>
                  </div>
                  <div className="flex justify-between font-black text-black text-sm pt-2 border-t border-gray-200 mt-2">
                    <span>Total</span>
                    <span>S/ {(Number(pedido.subtotal) + Number(pedido.costoEnvio)).toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                {whatsappUrl && (
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full flex items-center justify-center gap-2 bg-[#25D366] text-white py-4 text-[11px] font-black tracking-[0.15em] uppercase hover:bg-[#1DB954] transition-colors"
                  >
                    <Icon icon="mdi:whatsapp" width={18} />
                    Contactar al negocio
                  </a>
                )}
                <button
                  onClick={() => navigate(`/tienda/${slug}`)}
                  className="w-full py-4 border-2 border-black text-[11px] font-black tracking-[0.15em] uppercase hover:bg-black hover:text-white transition-colors"
                >
                  Volver a la tienda
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <UrbanoFooter tienda={tienda} diseno={diseno} slug={slug} />
    </div>
  );
}
