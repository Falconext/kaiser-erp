import ModaHeader from '@/components/tienda/ModaHeader';
import ModaFooter from '@/components/tienda/ModaFooter';
import ModaPaymentConfirmationModal from '@/components/tienda/ModaPaymentConfirmationModal';
import ModaConfirmOrderModal from '@/components/tienda/ModaConfirmOrderModal';
import { Icon } from '@iconify/react';
import { useNavigate } from 'react-router-dom';
import type { TemplateCheckoutPageProps } from '@/templates/shared/types';
import { BancoLogo } from '@/components/shared/BancoLogo';

type MedioPago = 'YAPE' | 'PLIN' | 'EFECTIVO' | 'TRANSFERENCIA' | 'TARJETA';

const PAYMENT_META: Record<MedioPago, { label: string; icon: string }> = {
  YAPE:          { label: 'Yape',          icon: 'solar:smartphone-line-duotone' },
  PLIN:          { label: 'Plin',          icon: 'solar:wallet-money-line-duotone' },
  EFECTIVO:      { label: 'Efectivo',      icon: 'solar:banknote-2-line-duotone' },
  TRANSFERENCIA: { label: 'Transferencia', icon: 'solar:card-transfer-line-duotone' },
  TARJETA:       { label: 'Tarjeta',       icon: 'solar:card-2-line-duotone' },
};

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-sm font-bold text-gray-900 tracking-wide uppercase mb-6">{children}</h2>
  );
}

function inputCls(field: string, errors: Record<string, string>) {
  const base = `w-full bg-[#FAFAFA] text-gray-900 px-4 py-3.5 text-sm border-b transition-colors focus:outline-none placeholder-gray-400`;
  if (errors[field]) return `${base} border-red-500 bg-red-50/50`;
  return `${base} border-gray-200 focus:border-gray-900 focus:bg-white`;
}

export default function ModaCheckoutPage({
  slug, tienda, diseno, cp,
  carritoState, setCarritoState, updateQuantity, removeItem,
  formData, erroresForm, handleChange,
  configPago, configEnvio, enviando,
  suggestedProducts, search, setSearch, searchResults,
  calcularSubtotal, calcularCostoEnvio, calcularTotal,
  freeDeliveryThreshold, freeDeliveryRemaining, freeDeliveryProgress,
  onSubmit, onAddToCart,
  showConfirmModal, setShowConfirmModal,
  showPaymentModal, setShowPaymentModal, pedidoCreado, enviarPedido,
}: TemplateCheckoutPageProps) {
  const navigate = useNavigate();
  const subtotal = calcularSubtotal();
  const envio = calcularCostoEnvio();
  const total = calcularTotal();

  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: "'Poppins', sans-serif" }}>
      {/* ── Header ── */}
      <ModaHeader
        tienda={tienda || {}}
        slug={slug || ''}
        cp={cp}
        carritoSize={carritoState.reduce((s: number, i: any) => s + Number(i.cantidad || 1), 0)}
        onOpenCart={() => {}}
        searchQuery={search}
        setSearchQuery={setSearch}
        onSearchSubmit={e => { e.preventDefault(); }}
        allCategories={[]}
      />

      <div className="max-w-[1200px] mx-auto px-6 lg:px-12 py-12 lg:py-20">
        
        {/* Title */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 tracking-tight mb-4">
            Finalizar Compra
          </h1>
          <p className="text-sm text-gray-500">
            Completa tus datos para confirmar tu pedido.
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-12 items-start">
          
          {/* Left Column (Forms) */}
          <div className="flex-1 min-w-0 space-y-12">
            
            {/* Delivery Method */}
            {configEnvio && (configEnvio.aceptaEnvio || configEnvio.aceptaRecojo) && (
              <section>
                <SectionTitle>Entrega</SectionTitle>
                <div className="flex flex-col sm:flex-row gap-4">
                  {configEnvio.aceptaEnvio && (
                    <label
                      className={`flex-1 flex flex-col items-center justify-center gap-2 py-6 cursor-pointer border transition-all ${
                        formData.tipoEntrega === 'ENVIO'
                          ? 'border-gray-900 bg-gray-900 text-white'
                          : 'border-gray-200 text-gray-600 hover:border-gray-400'
                      }`}
                    >
                      <input type="radio" className="hidden" name="tipoEntrega" value="ENVIO" checked={formData.tipoEntrega === 'ENVIO'} onChange={handleChange} />
                      <Icon icon="solar:delivery-linear" width={24} />
                      <span className="text-sm font-semibold tracking-wide">Envío a domicilio</span>
                    </label>
                  )}
                  {configEnvio.aceptaRecojo && (
                    <label
                      className={`flex-1 flex flex-col items-center justify-center gap-2 py-6 cursor-pointer border transition-all ${
                        formData.tipoEntrega === 'RECOJO'
                          ? 'border-gray-900 bg-gray-900 text-white'
                          : 'border-gray-200 text-gray-600 hover:border-gray-400'
                      }`}
                    >
                      <input type="radio" className="hidden" name="tipoEntrega" value="RECOJO" checked={formData.tipoEntrega === 'RECOJO'} onChange={handleChange} />
                      <Icon icon="solar:shop-linear" width={24} />
                      <span className="text-sm font-semibold tracking-wide">Recojo en tienda</span>
                    </label>
                  )}
                </div>

                {formData.tipoEntrega === 'RECOJO' && configEnvio.direccionRecojo && (
                  <div className="mt-4 flex items-start gap-3 bg-[#FAFAFA] p-4 border border-gray-100 text-sm">
                    <Icon icon="solar:map-point-bold" width={18} className="text-gray-900 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-600 leading-relaxed">
                      Dirección de recojo: <strong className="text-gray-900 font-semibold block mt-1">{configEnvio.direccionRecojo}</strong>
                    </span>
                  </div>
                )}
              </section>
            )}

            {/* Customer Details */}
            <section>
              <SectionTitle>Detalles</SectionTitle>
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <input
                      type="text"
                      name="clienteNombre"
                      placeholder="Nombre completo *"
                      value={formData.clienteNombre}
                      onChange={handleChange}
                      className={inputCls('clienteNombre', erroresForm)}
                    />
                    {erroresForm.clienteNombre && <p className="text-red-500 text-xs mt-1.5 font-medium">{erroresForm.clienteNombre}</p>}
                  </div>
                  <div>
                    <input
                      type="tel"
                      name="clienteTelefono"
                      placeholder="Teléfono *"
                      value={formData.clienteTelefono}
                      onChange={handleChange}
                      className={inputCls('clienteTelefono', erroresForm)}
                    />
                    {erroresForm.clienteTelefono && <p className="text-red-500 text-xs mt-1.5 font-medium">{erroresForm.clienteTelefono}</p>}
                  </div>
                </div>
                <div>
                  <input
                    type="email"
                    name="clienteEmail"
                    placeholder="Correo electrónico (opcional)"
                    value={formData.clienteEmail}
                    onChange={handleChange}
                    className={inputCls('clienteEmail', erroresForm)}
                  />
                  {erroresForm.clienteEmail && <p className="text-red-500 text-xs mt-1.5 font-medium">{erroresForm.clienteEmail}</p>}
                </div>

                {formData.tipoEntrega === 'ENVIO' && (
                  <>
                    <div>
                      <input
                        type="text"
                        name="clienteDireccion"
                        placeholder="Dirección de envío *"
                        value={formData.clienteDireccion}
                        onChange={handleChange}
                        className={inputCls('clienteDireccion', erroresForm)}
                      />
                      {erroresForm.clienteDireccion && <p className="text-red-500 text-xs mt-1.5 font-medium">{erroresForm.clienteDireccion}</p>}
                    </div>
                    <div>
                      <input
                        type="text"
                        name="clienteReferencia"
                        placeholder="Referencia (ej: casa blanca, frente a parque)"
                        value={formData.clienteReferencia}
                        onChange={handleChange}
                        className="w-full bg-[#FAFAFA] text-gray-900 px-4 py-3.5 text-sm border-b border-gray-200 focus:border-gray-900 focus:bg-white transition-colors focus:outline-none placeholder-gray-400"
                      />
                    </div>
                  </>
                )}
              </div>
            </section>

            {/* Payment Method */}
            <section>
              <SectionTitle>Pago</SectionTitle>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {(['YAPE', 'PLIN', 'EFECTIVO', 'TRANSFERENCIA', 'TARJETA'] as MedioPago[]).map(method => {
                  const meta = PAYMENT_META[method];
                  const show =
                    method === 'EFECTIVO' ? Boolean(configPago?.aceptaEfectivo)
                    : method === 'TRANSFERENCIA' ? Boolean(configPago?.cuentasBancarias?.length > 0)
                    : method === 'TARJETA' ? Boolean(configPago?.aceptaTarjeta && configPago?.culqiPublicKey)
                    : true;
                  if (!show) return null;
                  const active = formData.medioPago === method;
                  return (
                    <label
                      key={method}
                      className={`flex flex-col items-center justify-center gap-2 py-4 border cursor-pointer transition-all ${
                        active ? 'border-gray-900 bg-gray-50' : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <input type="radio" className="hidden" name="medioPago" value={method} checked={active} onChange={handleChange} />
                      <Icon icon={meta.icon} width={20} className={active ? 'text-gray-900' : 'text-gray-400'} />
                      <span className={`text-xs font-semibold ${active ? 'text-gray-900' : 'text-gray-500'}`}>{meta.label}</span>
                    </label>
                  );
                })}
              </div>

              {formData.medioPago === 'TRANSFERENCIA' && configPago?.cuentasBancarias?.length > 0 && (
                <div className="mt-6">
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">Cuentas Disponibles</p>
                  <div className="grid grid-cols-1 gap-3">
                    {configPago.cuentasBancarias.map((cuenta: any) => (
                      <div key={cuenta.id} className="bg-white border border-gray-200 p-4 flex gap-4 items-center">
                        <BancoLogo banco={cuenta.banco} size={40} />
                        <div className="flex flex-col flex-1">
                          <span className="text-sm font-semibold text-gray-900 tracking-tight">{cuenta.numeroCuenta}</span>
                          {cuenta.cci && <span className="text-xs text-gray-500 mt-0.5">CCI: {cuenta.cci}</span>}
                          {cuenta.titular && <span className="text-xs text-gray-500 mt-0.5">Titular: {cuenta.titular}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>

            {/* Notes */}
            <section>
              <SectionTitle>Notas</SectionTitle>
              <textarea
                name="observaciones"
                placeholder="Instrucciones especiales para el pedido..."
                value={formData.observaciones}
                onChange={handleChange}
                rows={3}
                className="w-full bg-[#FAFAFA] text-gray-900 px-4 py-3.5 text-sm border-b border-gray-200 focus:border-gray-900 focus:bg-white transition-colors focus:outline-none placeholder-gray-400 resize-none"
              />
            </section>
          </div>

          {/* Right Column (Order Summary) */}
          <div className="w-full lg:w-[380px] lg:flex-shrink-0 lg:sticky lg:top-28">
            <div className="bg-[#FAF9F6] p-6 lg:p-8">
              <h2 className="font-bold text-gray-900 text-lg mb-6 tracking-tight">Tu pedido</h2>
              
              <div className="space-y-4 mb-6">
                {carritoState.map((item: any) => (
                  <div key={item.id} className="flex gap-4">
                    <div className="relative w-16 h-20 bg-white border border-gray-100 flex-shrink-0 flex items-center justify-center p-1">
                      {item.imagenUrl
                        ? <img src={item.imagenUrl} className="w-full h-full object-contain" alt="" />
                        : <Icon icon="solar:box-linear" className="text-gray-300 w-6 h-6" />
                      }
                      <span className="absolute -top-2 -right-2 w-5 h-5 bg-gray-900 rounded-full text-[10px] font-bold text-white flex items-center justify-center">
                        {item.cantidad}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 leading-snug line-clamp-2 pr-2">{item.descripcion}</p>
                      {item.modificadores && item.modificadores.length > 0 && item.modificadores[0]?.opcionNombre && (
                          <p className="text-xs text-gray-500 mt-1 uppercase tracking-wider">
                              {item.modificadores.filter((m: any) => m && m.opcionNombre).map((m: any) => m.opcionNombre).join(' / ')}
                          </p>
                      )}
                      <p className="text-sm font-bold text-gray-600 mt-1 flex items-baseline gap-2">
                        <span>S/ {(Number(item.precioUnitario) * item.cantidad).toFixed(2)}</span>
                        {item.enOferta && Number(item.precioRegular) > Number(item.precioUnitario) && (
                          <span className="text-xs font-medium text-gray-400 line-through">S/ {(Number(item.precioRegular) * item.cantidad).toFixed(2)}</span>
                        )}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-6 border-t border-gray-200/60 space-y-3">
                <div className="flex justify-between text-sm text-gray-500">
                  <span>Subtotal</span>
                  <span className="font-semibold text-gray-900">S/ {subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm text-gray-500">
                  <span>Envío</span>
                  <span className="font-semibold text-gray-900">
                    {envio === 0
                      ? <span className="uppercase tracking-wider text-xs">Gratis</span>
                      : `S/ ${envio.toFixed(2)}`}
                  </span>
                </div>

                {freeDeliveryThreshold > 0 && freeDeliveryRemaining > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-200/60">
                    <p className="text-xs text-gray-500 mb-2 uppercase tracking-wide text-center">
                      ¡Estás a S/ {freeDeliveryRemaining.toFixed(2)} del envío gratis!
                    </p>
                    <div className="h-1 bg-gray-200 overflow-hidden">
                      <div
                        className="h-full bg-gray-900 transition-all"
                        style={{ width: `${freeDeliveryProgress}%` }}
                      />
                    </div>
                  </div>
                )}

                {erroresForm._minimo && (
                  <p className="text-red-500 text-xs font-medium text-center mt-4">{erroresForm._minimo}</p>
                )}

                <div className="flex justify-between items-center pt-6 border-t border-gray-200/60 mt-4">
                  <span className="font-bold text-gray-900 uppercase tracking-wider">Total</span>
                  <span className="text-2xl font-bold text-gray-900">
                    S/ {total.toFixed(2)}
                  </span>
                </div>

                <button
                  onClick={onSubmit}
                  disabled={enviando || carritoState.length === 0}
                  className="w-full py-4 mt-6 bg-[#1A1A1A] text-white font-bold text-sm tracking-wide uppercase transition-colors hover:bg-black disabled:opacity-50 disabled:bg-gray-400 disabled:cursor-not-allowed flex justify-center items-center gap-2"
                >
                  {enviando
                    ? <><Icon icon="solar:refresh-linear" className="animate-spin" width={18} /> Procesando</>
                    : <>Pagar ahora <Icon icon="solar:arrow-right-linear" width={18} /></>
                  }
                </button>
              </div>
            </div>
            
            <button
                onClick={() => navigate(`/tienda/${slug}`)}
                className="w-full text-center mt-6 text-sm text-gray-400 hover:text-gray-900 transition-colors underline underline-offset-4"
            >
                Volver a la tienda
            </button>
          </div>
        </div>
      </div>

      <ModaFooter tiendaNombre={tienda?.nombreComercial || tienda?.nombre || 'Styliq'} />

      {pedidoCreado && (
        <ModaPaymentConfirmationModal
          isOpen={showPaymentModal}
          onClose={() => { setShowPaymentModal(false); window.location.href = `/tienda/${slug}/seguimiento?codigo=${pedidoCreado.codigoSeguimiento}`; }}
          orderData={{ id: pedidoCreado.id, codigoSeguimiento: pedidoCreado.codigoSeguimiento, total: pedidoCreado.total || calcularTotal(), medioPago: formData.medioPago, tipoEntrega: formData.tipoEntrega, clienteNombre: formData.clienteNombre }}
          paymentConfig={configPago ? { yapeQR: configPago.yapeQR || configPago.yapeQrUrl || undefined, plinQR: configPago.plinQR || configPago.plinQrUrl || undefined, yapeNumero: configPago.yapeNumero || undefined, plinNumero: configPago.plinNumero || undefined, whatsappTienda: configPago?.whatsappTienda ?? tienda?.whatsappTienda ?? tienda?.diseno?.whatsappTienda } : undefined}
          storeSlug={slug || ''}
        />
      )}
      <ModaConfirmOrderModal isOpen={showConfirmModal} onClose={() => setShowConfirmModal(false)} onConfirm={enviarPedido} total={calcularTotal()} loading={enviando} />
    </div>
  );
}
