import UrbanoHeader from './UrbanoHeader';
import UrbanoFooter from './UrbanoFooter';
import PaymentConfirmationModal from '@/components/tienda/PaymentConfirmationModal';
import ConfirmOrderModal from '@/components/tienda/ConfirmOrderModal';
import { Icon } from '@iconify/react';
import { useNavigate } from 'react-router-dom';
import type { TemplateCheckoutPageProps } from '@/templates/shared/types';
import { BancoLogo } from '@/components/shared/BancoLogo';
import { buildStorePurchaseWhatsappUrl, normalizeStoreWhatsapp } from '@/utils/storeWhatsapp';

type MedioPago = 'YAPE' | 'PLIN' | 'EFECTIVO' | 'TRANSFERENCIA' | 'TARJETA';

const PAYMENT_META: Record<MedioPago, { label: string; icon: string }> = {
  YAPE:          { label: 'Yape',          icon: 'solar:smartphone-line-duotone' },
  PLIN:          { label: 'Plin',          icon: 'solar:wallet-money-line-duotone' },
  EFECTIVO:      { label: 'Efectivo',      icon: 'solar:banknote-2-line-duotone' },
  TRANSFERENCIA: { label: 'Transferencia', icon: 'solar:card-transfer-line-duotone' },
  TARJETA:       { label: 'Tarjeta',       icon: 'solar:card-2-line-duotone' },
};

const IMPACT = '"Impact", "Arial Black", sans-serif';

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-lg font-black tracking-tighter uppercase text-black mb-6" style={{ fontFamily: IMPACT }}>
      {children}
    </h2>
  );
}

function inputCls(field: string, errors: Record<string, string>) {
  const base = `w-full bg-white text-black px-4 py-3.5 text-sm border-2 transition-colors focus:outline-none placeholder-gray-400`;
  if (errors[field]) return `${base} border-red-500 bg-red-50/40`;
  return `${base} border-gray-200 focus:border-black`;
}

export default function UrbanoCheckoutPage({
  slug, tienda, diseno, cp,
  carritoState, updateQuantity, removeItem,
  formData, erroresForm, handleChange,
  configPago, configEnvio, enviando,
  search, setSearch,
  suggestedProducts, onAddToCart,
  calcularSubtotal, calcularCostoEnvio, calcularTotal,
  freeDeliveryThreshold, freeDeliveryRemaining, freeDeliveryProgress,
  onSubmit,
  showConfirmModal, setShowConfirmModal,
  showPaymentModal, setShowPaymentModal, pedidoCreado, enviarPedido,
}: TemplateCheckoutPageProps) {
  const navigate = useNavigate();
  const isPreview = slug === 'preview';
  const storeWhatsappNumber = configPago?.whatsappTienda ?? tienda?.whatsappTienda ?? tienda?.diseno?.whatsappTienda ?? diseno?.whatsappTienda;
  const safeFormData = {
    clienteNombre: '',
    clienteTelefono: '',
    clienteEmail: '',
    clienteDireccion: '',
    clienteReferencia: '',
    medioPago: 'EFECTIVO',
    observaciones: '',
    tipoEntrega: 'RECOJO',
    ...(formData || {}),
  };
  const safeErrores = erroresForm || {};
  const cartItems = Array.isArray(carritoState) ? carritoState : [];
  const subtotal = calcularSubtotal();
  const envio = calcularCostoEnvio();
  const total = calcularTotal();
  const headerCategories = Array.from(new Set((suggestedProducts || [])
    .map((product: any) => typeof product?.categoria === 'object' ? product.categoria?.nombre : product?.categoria)
    .filter(Boolean)))
    .map((nombre) => ({ nombre: String(nombre) }));

  const goStore = () => {
    if (isPreview) {
      window.dispatchEvent(new CustomEvent('preview-nav', { detail: 'home' }));
      return;
    }
    navigate(`/tienda/${slug}`);
  };

  const goCatalog = (query?: string) => {
    if (isPreview) {
      window.dispatchEvent(new CustomEvent('preview-nav', { detail: 'catalogo' }));
      return;
    }
    navigate(`/tienda/${slug}/catalogo${query ? `?search=${encodeURIComponent(query)}` : ''}`);
  };

  const goProduct = (product: any) => {
    window.scrollTo(0, 0);
    if (isPreview) {
      window.dispatchEvent(new CustomEvent('preview-product', { detail: product }));
      return;
    }
    navigate(`/tienda/${slug}/producto/${product.id}`);
  };

  const cotizarPorWhatsApp = () => {
    const nombreTienda = tienda?.nombreComercial || tienda?.nombre || 'Tienda';
    const lineas = cartItems.map((item: any) =>
      `• ${item.cantidad}x ${item.descripcion} — S/ ${(Number(item.precioUnitario) * item.cantidad).toFixed(2)}`
    ).join('\n');
    const mensaje =
      `*COTIZACIÓN — ${nombreTienda}*\n` +
      (safeFormData.clienteNombre ? `Cliente: ${safeFormData.clienteNombre}\n` : '') +
      `\n${lineas}\n\n` +
      `Subtotal: S/ ${subtotal.toFixed(2)}\n` +
      `Envío: ${envio === 0 ? 'Gratis' : `S/ ${envio.toFixed(2)}`}\n` +
      `*Total: S/ ${total.toFixed(2)}*\n\n` +
      `Cotización generada desde la tienda online.`;
    const url = buildStorePurchaseWhatsappUrl(storeWhatsappNumber, mensaje);
    if (url) window.open(url, '_blank');
  };

  return (
    <div className="min-h-screen bg-white text-black" style={{ fontFamily: '"Inter", sans-serif' }}>
      {/* ── Header ── */}
      <UrbanoHeader
        tienda={tienda || {}}
        slug={slug || ''}
        cp={cp}
        carritoSize={carritoState.reduce((s: number, i: any) => s + Number(i.cantidad || 1), 0)}
        onOpenCart={goStore}
        searchQuery={search}
        setSearchQuery={setSearch}
        onSearchSubmit={(e: any, value?: string) => {
          e.preventDefault();
          const term = String(value || search || '').trim();
          goCatalog(term);
        }}
        categories={headerCategories}
      />

      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-12 pt-6 pb-12 lg:pb-20">

        {/* Title */}
        <div className="mb-8 sm:mb-14 border-b-2 border-black pb-6">
          <p className="text-[11px] font-bold tracking-[0.25em] uppercase text-gray-400 mb-3">Compra</p>
          <h1 className="text-3xl sm:text-4xl md:text-6xl font-black tracking-tighter uppercase text-black leading-none" style={{ fontFamily: IMPACT }}>
            Finalizar Compra
          </h1>
        </div>

        <div className="flex flex-col lg:flex-row gap-8 lg:gap-12 items-start">

          {/* Left Column (Forms) */}
          <div className="flex-1 min-w-0 space-y-12">

            {/* Delivery Method */}
            {configEnvio && (configEnvio.aceptaEnvio || configEnvio.aceptaRecojo) && (
              <section>
                <SectionTitle>Entrega</SectionTitle>
                <div className="flex flex-col sm:flex-row gap-4">
                  {configEnvio.aceptaEnvio && (
                    <label
                      className={`flex-1 flex flex-col items-center justify-center gap-2 py-6 cursor-pointer border-2 transition-all ${
                        safeFormData.tipoEntrega === 'ENVIO'
                          ? 'border-black bg-black text-white'
                          : 'border-gray-200 text-gray-600 hover:border-black'
                      }`}
                    >
                      <input type="radio" className="hidden" name="tipoEntrega" value="ENVIO" checked={safeFormData.tipoEntrega === 'ENVIO'} onChange={handleChange} />
                      <Icon icon="solar:delivery-linear" width={24} />
                      <span className="text-[11px] font-bold tracking-[0.15em] uppercase">Envío a domicilio</span>
                    </label>
                  )}
                  {configEnvio.aceptaRecojo && (
                    <label
                      className={`flex-1 flex flex-col items-center justify-center gap-2 py-6 cursor-pointer border-2 transition-all ${
                        safeFormData.tipoEntrega === 'RECOJO'
                          ? 'border-black bg-black text-white'
                          : 'border-gray-200 text-gray-600 hover:border-black'
                      }`}
                    >
                      <input type="radio" className="hidden" name="tipoEntrega" value="RECOJO" checked={safeFormData.tipoEntrega === 'RECOJO'} onChange={handleChange} />
                      <Icon icon="solar:shop-linear" width={24} />
                      <span className="text-[11px] font-bold tracking-[0.15em] uppercase">Recojo en tienda</span>
                    </label>
                  )}
                </div>

                {safeFormData.tipoEntrega === 'RECOJO' && configEnvio.direccionRecojo && (
                  <div className="mt-4 flex items-start gap-3 bg-[#F4F5F6] p-4 border-l-2 border-black text-sm">
                    <Icon icon="solar:map-point-bold" width={18} className="text-black flex-shrink-0 mt-0.5" />
                    <span className="text-gray-600 leading-relaxed">
                      Dirección de recojo: <strong className="text-black font-bold block mt-1">{configEnvio.direccionRecojo}</strong>
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
                      value={safeFormData.clienteNombre}
                      onChange={handleChange}
                      className={inputCls('clienteNombre', safeErrores)}
                    />
                    {safeErrores.clienteNombre && <p className="text-red-500 text-xs mt-1.5 font-medium">{safeErrores.clienteNombre}</p>}
                  </div>
                  <div>
                    <input
                      type="tel"
                      name="clienteTelefono"
                      placeholder="Teléfono *"
                      value={safeFormData.clienteTelefono}
                      onChange={handleChange}
                      className={inputCls('clienteTelefono', safeErrores)}
                    />
                    {safeErrores.clienteTelefono && <p className="text-red-500 text-xs mt-1.5 font-medium">{safeErrores.clienteTelefono}</p>}
                  </div>
                </div>
                <div>
                  <input
                    type="email"
                    name="clienteEmail"
                    placeholder="Correo electrónico (opcional)"
                    value={safeFormData.clienteEmail}
                    onChange={handleChange}
                    className={inputCls('clienteEmail', safeErrores)}
                  />
                  {safeErrores.clienteEmail && <p className="text-red-500 text-xs mt-1.5 font-medium">{safeErrores.clienteEmail}</p>}
                </div>

                {safeFormData.tipoEntrega === 'ENVIO' && (
                  <>
                    <div>
                      <input
                        type="text"
                        name="clienteDireccion"
                        placeholder="Dirección de envío *"
                        value={safeFormData.clienteDireccion}
                        onChange={handleChange}
                        className={inputCls('clienteDireccion', safeErrores)}
                      />
                      {safeErrores.clienteDireccion && <p className="text-red-500 text-xs mt-1.5 font-medium">{safeErrores.clienteDireccion}</p>}
                    </div>
                    <div>
                      <input
                        type="text"
                        name="clienteReferencia"
                        placeholder="Referencia (ej: casa blanca, frente a parque)"
                        value={safeFormData.clienteReferencia}
                        onChange={handleChange}
                        className="w-full bg-white text-black px-4 py-3.5 text-sm border-2 border-gray-200 focus:border-black transition-colors focus:outline-none placeholder-gray-400"
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
                    : method === 'YAPE' ? Boolean(configPago?.yapeQR || configPago?.yapeQrUrl || configPago?.yapeNumero)
                    : method === 'PLIN' ? Boolean(configPago?.plinQR || configPago?.plinQrUrl || configPago?.plinNumero)
                    : false;
                  if (!show) return null;
                  const active = safeFormData.medioPago === method;
                  return (
                    <label
                      key={method}
                      className={`flex flex-col items-center justify-center gap-2 py-4 border-2 cursor-pointer transition-all ${
                        active ? 'border-black bg-black text-white' : 'border-gray-200 text-gray-500 hover:border-black'
                      }`}
                    >
                      <input type="radio" className="hidden" name="medioPago" value={method} checked={active} onChange={handleChange} />
                      <Icon icon={meta.icon} width={20} className={active ? 'text-white' : 'text-gray-400'} />
                      <span className="text-[11px] font-bold tracking-[0.1em] uppercase">{meta.label}</span>
                    </label>
                  );
                })}
              </div>

              {safeFormData.medioPago === 'TRANSFERENCIA' && configPago?.cuentasBancarias?.length > 0 && (
                <div className="mt-6">
                  <p className="text-[11px] text-gray-400 uppercase tracking-[0.2em] mb-3">Cuentas Disponibles</p>
                  <div className="grid grid-cols-1 gap-3">
                    {configPago.cuentasBancarias.map((cuenta: any) => (
                      <div key={cuenta.id} className="bg-white border-2 border-gray-200 p-4 flex gap-4 items-center">
                        <BancoLogo banco={cuenta.banco} size={40} />
                        <div className="flex flex-col flex-1">
                          <span className="text-sm font-bold text-black tracking-tight">{cuenta.numeroCuenta}</span>
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
                value={safeFormData.observaciones}
                onChange={handleChange}
                rows={3}
                className="w-full bg-white text-black px-4 py-3.5 text-sm border-2 border-gray-200 focus:border-black transition-colors focus:outline-none placeholder-gray-400 resize-none"
              />
            </section>
          </div>

          {/* Right Column (Order Summary) */}
          <div className="w-full lg:w-[380px] lg:flex-shrink-0 lg:sticky lg:top-28">
            <div className="border-2 border-black p-6 lg:p-8">
              <h2 className="font-black text-black text-xl mb-6 tracking-tighter uppercase" style={{ fontFamily: IMPACT }}>
                Tu pedido
              </h2>

              <div className="space-y-4 mb-6">
                {cartItems.map((item: any) => (
                  <div key={item.id} className="flex gap-3 sm:gap-4">
                    <div className="relative w-16 h-20 bg-[#F4F5F6] border border-gray-200 flex-shrink-0 flex items-center justify-center overflow-hidden">
                      {item.imagenUrl
                        ? <img src={item.imagenUrl} className="w-full h-full object-cover" alt="" />
                        : <Icon icon="solar:box-linear" className="text-gray-300 w-6 h-6" />
                      }
                      <span className="absolute -top-2 -right-2 w-5 h-5 bg-black text-[10px] font-bold text-white flex items-center justify-center">
                        {item.cantidad}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-bold uppercase text-black leading-snug line-clamp-2 pr-2">{item.descripcion}</p>
                      {item.modificadores && item.modificadores.length > 0 && item.modificadores[0]?.opcionNombre && (
                        <p className="text-[10px] text-gray-400 mt-1 uppercase tracking-widest">
                          {item.modificadores.filter((m: any) => m && m.opcionNombre).map((m: any) => m.opcionNombre).join(' / ')}
                        </p>
                      )}
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center border-2 border-black w-fit">
                          <button
                            onClick={() => updateQuantity(item.id, Math.max(1, (item.cantidad || 1) - 1))}
                            className="w-6 h-6 flex items-center justify-center hover:bg-black hover:text-white transition-colors"
                          >
                            <Icon icon="mdi:minus" width={12} />
                          </button>
                          <span className="text-[11px] w-6 text-center font-bold">{item.cantidad}</span>
                          <button
                            onClick={() => updateQuantity(item.id, (item.cantidad || 1) + 1)}
                            className="w-6 h-6 flex items-center justify-center hover:bg-black hover:text-white transition-colors"
                          >
                            <Icon icon="mdi:plus" width={12} />
                          </button>
                        </div>
                        <span className="text-[13px] font-bold text-black flex items-baseline gap-1.5">
                          S/ {(Number(item.precioUnitario) * item.cantidad).toFixed(2)}
                          {item.enOferta && Number(item.precioRegular) > Number(item.precioUnitario) && (
                            <span className="text-[10px] font-medium text-gray-400 line-through">S/ {(Number(item.precioRegular) * item.cantidad).toFixed(2)}</span>
                          )}
                        </span>
                      </div>
                    </div>
                    <button onClick={() => removeItem(item.id)} className="text-gray-300 hover:text-black transition-colors self-start">
                      <Icon icon="solar:trash-bin-trash-linear" width={16} />
                    </button>
                  </div>
                ))}
              </div>

              <div className="pt-6 border-t-2 border-black space-y-3">
                <div className="flex justify-between text-sm text-gray-500">
                  <span className="uppercase tracking-wider text-xs font-bold">Subtotal</span>
                  <span className="font-bold text-black">S/ {subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm text-gray-500">
                  <span className="uppercase tracking-wider text-xs font-bold">Envío</span>
                  <span className="font-bold text-black">
                    {envio === 0
                      ? <span className="uppercase tracking-wider text-xs">Gratis</span>
                      : `S/ ${envio.toFixed(2)}`}
                  </span>
                </div>

                {freeDeliveryThreshold > 0 && freeDeliveryRemaining > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <p className="text-[11px] text-gray-500 mb-2 uppercase tracking-wide text-center">
                      ¡Estás a S/ {freeDeliveryRemaining.toFixed(2)} del envío gratis!
                    </p>
                    <div className="h-1.5 bg-gray-200 overflow-hidden">
                      <div
                        className="h-full bg-black transition-all"
                        style={{ width: `${freeDeliveryProgress}%` }}
                      />
                    </div>
                  </div>
                )}

                {safeErrores._minimo && (
                  <p className="text-red-500 text-xs font-medium text-center mt-4">{safeErrores._minimo}</p>
                )}

                <div className="flex justify-between items-baseline pt-6 border-t-2 border-black mt-4">
                  <span className="font-bold text-black uppercase tracking-wider text-sm">Total</span>
                  <span className="text-3xl font-black text-black tracking-tighter" style={{ fontFamily: IMPACT }}>
                    S/ {total.toFixed(2)}
                  </span>
                </div>

                <button
                  onClick={onSubmit}
                  disabled={enviando || cartItems.length === 0}
                  className="group w-full py-4 mt-6 bg-black text-white font-bold text-[11px] tracking-[0.2em] uppercase border-2 border-black transition-all hover:bg-white hover:text-black disabled:opacity-40 disabled:hover:bg-black disabled:hover:text-white disabled:cursor-not-allowed flex justify-center items-center gap-2"
                >
                  {enviando
                    ? <><Icon icon="solar:refresh-linear" className="animate-spin" width={18} /> Procesando</>
                    : <>
                        <span className="opacity-0 group-hover:opacity-100 transition-opacity">[</span>
                        Pagar ahora
                        <span className="opacity-0 group-hover:opacity-100 transition-opacity">]</span>
                      </>
                  }
                </button>

                {!!normalizeStoreWhatsapp(storeWhatsappNumber) && (
                  <>
                    <button
                      onClick={cotizarPorWhatsApp}
                      disabled={cartItems.length === 0}
                      className="w-full py-4 mt-3 bg-white text-black font-bold text-[11px] tracking-[0.2em] uppercase border-2 border-black transition-all hover:bg-[#25D366] hover:border-[#25D366] hover:text-white disabled:opacity-40 disabled:cursor-not-allowed flex justify-center items-center gap-2"
                    >
                      <Icon icon="ic:baseline-whatsapp" width={18} />
                      Cotizar por WhatsApp
                    </button>
                    <p className="text-center text-[10px] text-gray-400 mt-3 uppercase tracking-[0.15em]">
                      Te enviamos la cotización a tu WhatsApp
                    </p>
                  </>
                )}
              </div>
            </div>

            <button
              onClick={goStore}
              className="w-full text-center mt-6 text-[11px] font-bold tracking-[0.15em] uppercase text-gray-400 hover:text-black transition-colors underline underline-offset-4"
            >
              Volver a la tienda
            </button>
          </div>
        </div>
      </div>

      {/* Productos que te podrían interesar */}
      {suggestedProducts && suggestedProducts.length > 0 && (
        <section className="border-t-2 border-black">
          <div className="max-w-[1200px] mx-auto px-6 lg:px-12 py-14 lg:py-20">
            <h2 className="text-2xl sm:text-3xl font-black tracking-tighter uppercase text-black mb-10" style={{ fontFamily: IMPACT }}>
              También te puede interesar
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8">
              {suggestedProducts.slice(0, 4).map((p: any) => (
                <div key={p.id} className="flex flex-col group">
                  <div
                    className="w-full aspect-[4/5] bg-[#F4F5F6] overflow-hidden mb-4 cursor-pointer relative"
                    onClick={() => goProduct(p)}
                  >
                    {p.imagenUrl ? (
                      <img
                        src={p.imagenUrl}
                        alt={p.descripcion}
                        className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Icon icon="solar:box-linear" className="text-gray-300 w-8 h-8" />
                      </div>
                    )}
                  </div>
                  <h3
                    className="text-xs sm:text-[13px] font-bold uppercase text-black truncate pr-2 mb-1 cursor-pointer"
                    onClick={() => goProduct(p)}
                  >
                    {p.descripcion}
                  </h3>
                  <p className="text-[11px] font-bold text-gray-500 mb-3">
                    S/ {Number(p.precioUnitario || 0).toFixed(2)}
                  </p>
                  <button
                    onClick={() => onAddToCart(p)}
                    className="mt-auto w-full border-2 border-black py-2.5 text-[10px] font-bold tracking-[0.15em] uppercase hover:bg-black hover:text-white transition-colors"
                  >
                    Añadir
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      <UrbanoFooter tienda={tienda} diseno={diseno} slug={slug} categories={headerCategories} />

      {pedidoCreado && (
        <PaymentConfirmationModal
          isOpen={showPaymentModal}
          onClose={() => { setShowPaymentModal(false); window.location.href = `/tienda/${slug}/seguimiento?codigo=${pedidoCreado.codigoSeguimiento}`; }}
          orderData={{ id: pedidoCreado.id, codigoSeguimiento: pedidoCreado.codigoSeguimiento, total: pedidoCreado.total || calcularTotal(), medioPago: safeFormData.medioPago, tipoEntrega: safeFormData.tipoEntrega, clienteNombre: safeFormData.clienteNombre }}
          paymentConfig={configPago ? { yapeQR: configPago.yapeQR || configPago.yapeQrUrl || undefined, plinQR: configPago.plinQR || configPago.plinQrUrl || undefined, yapeNumero: configPago.yapeNumero || undefined, plinNumero: configPago.plinNumero || undefined, whatsappTienda: configPago?.whatsappTienda ?? tienda?.whatsappTienda ?? tienda?.diseno?.whatsappTienda } : undefined}
          storeSlug={slug || ''}
        />
      )}
      <ConfirmOrderModal isOpen={showConfirmModal} onClose={() => setShowConfirmModal(false)} onConfirm={enviarPedido} total={calcularTotal()} loading={enviando} tiendaColor={cp || '#111111'} />
    </div>
  );
}
