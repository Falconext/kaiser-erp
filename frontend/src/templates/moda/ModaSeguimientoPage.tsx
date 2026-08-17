import { useNavigate } from 'react-router-dom';
import { Icon } from '@iconify/react';
import ModaHeader from '@/components/tienda/ModaHeader';
import ModaFooter from '@/components/tienda/ModaFooter';
import LineaTiempoEstados from '@/components/LineaTiempoEstados';
import type { TemplateSeguimientoPageProps } from '@/templates/shared/types';
import { buildStorePurchaseWhatsappUrl } from '@/utils/storeWhatsapp';

export default function ModaSeguimientoPage({
  slug, tienda, diseno, cp,
  codigo, setCodigo, pedido, loading, error, buscarPedido, handleSubmit, compartirSeguimiento, copiedLink, getEstadoSeguimiento, getEstadoColor, getEstadoLabel, lastUpdated, TERMINAL_STATES
}: TemplateSeguimientoPageProps) {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: "'Poppins', sans-serif" }}>
      <ModaHeader
        tienda={tienda || {}}
        slug={slug || ''}
        cp={cp}
        carritoSize={0}
        onOpenCart={() => navigate(`/tienda/${slug}/checkout`)}
        searchQuery={""}
        setSearchQuery={() => {}}
        onSearchSubmit={(e) => { e.preventDefault(); }}
        allCategories={[]}
      />

      <div className="max-w-[1200px] mx-auto px-6 lg:px-12 py-12 lg:py-20">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 tracking-tight mb-4">
            Estado de tu pedido
          </h1>
          <p className="text-sm text-gray-500">
            Ingresa tu código para hacer seguimiento en tiempo real.
          </p>
        </div>

        <div className="max-w-3xl mx-auto">
          {/* Formulario */}
          <div className="bg-gray-50 p-6 md:p-8 border border-gray-100 mb-10">
            <form onSubmit={handleSubmit} className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 flex items-center bg-white border border-gray-200 px-4 py-3.5 focus-within:border-gray-900 transition-colors">
                <Icon icon="solar:box-linear" className="text-gray-400 mr-3" width={20} />
                <input
                  type="text"
                  value={codigo}
                  onChange={(e) => setCodigo(e.target.value.toUpperCase())}
                  placeholder="Ej. PED-ABC123-XYZ"
                  className="w-full bg-transparent text-sm focus:outline-none text-gray-900 placeholder-gray-400"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="px-8 py-3.5 bg-gray-900 text-white text-sm font-bold tracking-wide hover:bg-black transition-colors disabled:opacity-50"
              >
                {loading ? 'Buscando...' : 'Buscar'}
              </button>
            </form>

            {error && (
              <div className="mt-4 p-4 bg-red-50 text-red-700 text-sm flex items-center gap-2 border border-red-100">
                <Icon icon="mdi:alert-circle" width={20} />
                {error}
              </div>
            )}
          </div>

          {/* Resultado del Pedido */}
          {pedido && (() => {
            const estadoSeguimiento = getEstadoSeguimiento(pedido);
            const whatsappUrl = buildStorePurchaseWhatsappUrl(
              tienda?.whatsappTienda ?? tienda?.diseno?.whatsappTienda ?? diseno?.whatsappTienda,
              `Hola, necesito ayuda con mi pedido ${pedido.codigoSeguimiento || ''}.`,
            );

            return (
              <div className="space-y-8">
                {/* Cabecera Estado */}
                <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-gray-100 gap-4">
                  <div>
                    <p className="text-xs font-bold tracking-widest text-gray-400 uppercase mb-1">Pedido #{pedido.codigoSeguimiento}</p>
                    <div className="flex items-center gap-3">
                      <span className={`px-3 py-1 text-xs font-bold ${getEstadoColor(estadoSeguimiento)}`}>
                        {getEstadoLabel(estadoSeguimiento)}
                      </span>
                      {!TERMINAL_STATES.includes(estadoSeguimiento) && lastUpdated && (
                        <span className="text-xs text-gray-500 flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                          Actualizado {lastUpdated.toLocaleTimeString('es-PE', { hour: 'numeric', minute: '2-digit' })}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <button
                      onClick={compartirSeguimiento}
                      className="px-4 py-2 text-xs font-bold border border-gray-200 text-gray-600 hover:bg-gray-50 flex items-center gap-2 transition-colors"
                    >
                      <Icon icon={copiedLink ? 'mdi:check' : 'mdi:share-variant'} width={16} />
                      {copiedLink ? 'Copiado' : 'Compartir'}
                    </button>
                  </div>
                </div>

                {/* Línea de tiempo */}
                <div className="py-4">
                  {pedido.historialEstados && pedido.historialEstados.length > 0 ? (
                    <LineaTiempoEstados historial={pedido.historialEstados} estadoActual={estadoSeguimiento} />
                  ) : (
                    <p className="text-sm text-gray-500 italic">No hay historial de estados disponible aún.</p>
                  )}
                </div>

                {/* Detalle items */}
                <div className="bg-gray-50 p-6 md:p-8 border border-gray-100">
                  <h3 className="text-sm font-bold text-gray-900 tracking-wide uppercase mb-6">Detalle de tu orden</h3>
                  <div className="space-y-4 mb-6">
                    {pedido.items.map((item: any) => (
                      <div key={item.id} className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-4 min-w-0">
                          {item.producto?.imagenUrl ? (
                            <img src={item.producto.imagenUrl} alt={item.producto.descripcion} className="w-16 h-16 object-cover bg-white border border-gray-200" />
                          ) : (
                            <div className="w-16 h-16 bg-white border border-gray-200 flex items-center justify-center text-gray-300">
                              <Icon icon="solar:t-shirt-linear" width={24} />
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-sm text-gray-900">{item.producto.descripcion}</p>
                            <p className="text-xs text-gray-500 mt-0.5">Cant: {item.cantidad}</p>
                          </div>
                        </div>
                        <div className="text-sm font-bold text-gray-900">S/ {item.subtotal.toFixed(2)}</div>
                      </div>
                    ))}
                  </div>

                  <div className="border-t border-gray-200 pt-4 space-y-2 text-sm text-gray-600">
                    <div className="flex justify-between">
                      <span>Subtotal</span>
                      <span>S/ {Number(pedido.subtotal).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Envío</span>
                      <span>{pedido.costoEnvio > 0 ? `S/ ${pedido.costoEnvio.toFixed(2)}` : 'Gratis'}</span>
                    </div>
                    <div className="flex justify-between font-bold text-gray-900 text-base pt-2 mt-2 border-t border-gray-200">
                      <span>Total</span>
                      <span>S/ {(Number(pedido.subtotal) + Number(pedido.costoEnvio)).toFixed(2)}</span>
                    </div>
                  </div>
                </div>
                
                {/* Botón WhatsApp si está disponible */}
                {whatsappUrl && (
                  <div className="pt-4">
                    <a
                      href={whatsappUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full flex items-center justify-center gap-2 py-4 bg-green-600 text-white font-bold text-sm tracking-wide hover:bg-green-700 transition-colors"
                    >
                      <Icon icon="mdi:whatsapp" width={20} />
                      ¿Tienes un problema? Contáctanos
                    </a>
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      </div>

      <ModaFooter diseno={diseno} tiendaNombre={tienda?.nombreComercial || tienda?.razonSocial || 'Tienda'} />
    </div>
  );
}
