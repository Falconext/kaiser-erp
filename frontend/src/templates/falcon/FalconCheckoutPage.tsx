import { useNavigate } from 'react-router-dom';
import { Icon } from '@iconify/react';
import { motion } from 'framer-motion';
import ConfirmOrderModal from '@/components/tienda/ConfirmOrderModal';
import PaymentConfirmationModal from '@/components/tienda/PaymentConfirmationModal';
import { BancoLogo } from '@/components/shared/BancoLogo';
import type { TemplateCheckoutPageProps } from '@/templates/shared/types';
import { GREEN, resolveFalconGreen, money, getImg, editable, withPreviewQuery, FalconHeader, FalconFooter, falconFadeUp, falconScaleIn, falconStagger, falconTap } from './FalconShared';

type MedioPago = 'YAPE' | 'PLIN' | 'EFECTIVO' | 'TRANSFERENCIA' | 'TARJETA';

const PAYMENT_META: Record<MedioPago, { label: string; icon: string }> = {
  YAPE: { label: 'Yape', icon: 'solar:smartphone-bold' },
  PLIN: { label: 'Plin', icon: 'solar:wallet-money-bold' },
  EFECTIVO: { label: 'Efectivo', icon: 'solar:banknote-2-bold' },
  TRANSFERENCIA: { label: 'Transferencia', icon: 'solar:card-transfer-bold' },
  TARJETA: { label: 'Tarjeta', icon: 'solar:card-2-bold' },
};

const inputCls = (field: string, errors: Record<string, string>) => {
  const base = 'h-12 w-full rounded-md border bg-white px-4 text-sm font-semibold text-gray-900 outline-none transition-colors placeholder:text-gray-400';
  return errors?.[field] ? `${base} border-red-500` : `${base} border-gray-200 focus:border-[#151515]`;
};

export default function FalconCheckoutPage(props: TemplateCheckoutPageProps) {
  const {
    slug, tienda, diseno, cp,
    carritoState, updateQuantity, removeItem,
    formData, erroresForm, handleChange,
    configPago, configEnvio, enviando,
    calcularSubtotal, calcularCostoEnvio, calcularTotal,
    freeDeliveryThreshold, freeDeliveryRemaining, freeDeliveryProgress,
    onSubmit,
  } = props;

  const navigate = useNavigate();
  const green = resolveFalconGreen(diseno, cp);
  const subtotal = calcularSubtotal();
  const envio = calcularCostoEnvio();
  const total = calcularTotal();
  const cartCount = carritoState.reduce((s, i) => s + Number(i?.cantidad || 1), 0);
  const go = (path: string) => navigate(withPreviewQuery(path, diseno));

  const hasBankAccounts = Array.isArray(configPago?.cuentasBancarias) && configPago.cuentasBancarias.length > 0;
  const acceptedPaymentMethods = ([
    configPago?.yapeQR || configPago?.yapeQrUrl || configPago?.yapeNumero ? 'YAPE' : null,
    configPago?.plinQR || configPago?.plinQrUrl || configPago?.plinNumero ? 'PLIN' : null,
    configPago?.aceptaEfectivo ? 'EFECTIVO' : null,
    hasBankAccounts ? 'TRANSFERENCIA' : null,
    configPago?.aceptaTarjeta && configPago?.culqiPublicKey ? 'TARJETA' : null,
  ].filter(Boolean) as MedioPago[]);
  const paymentMethods = acceptedPaymentMethods.length ? acceptedPaymentMethods : (['YAPE', 'EFECTIVO'] as MedioPago[]);

  const Section = ({ icon, step, title, children }: { icon: string; step: number; title: string; children: React.ReactNode }) => (
    <motion.section variants={falconFadeUp} whileHover={{ y: -2 }} className="rounded-2xl bg-white p-6 shadow-sm md:p-8">
      <div className="mb-5 flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-black text-white" style={{ background: green }}>{step}</span>
        <div className="flex items-center gap-2">
          <Icon icon={icon} width={22} style={{ color: green }} />
          <h2 className="text-lg font-black text-[#151515]">{title}</h2>
        </div>
      </div>
      {children}
    </motion.section>
  );

  return (
    <div className="min-h-screen bg-[#ececec]" style={{ fontFamily: `'${diseno?.tipografia || 'Inter'}', sans-serif` }}>
      <FalconHeader tienda={tienda} slug={slug} green={green} cartCount={cartCount} cartTotal={subtotal} onOpenCart={() => go(`/tienda/${slug}/catalogo`)} diseno={diseno} />

      {/* Title */}
      <motion.div initial="hidden" animate="show" variants={falconFadeUp} className="flex min-h-[160px] items-center justify-center bg-[#ececec]">
        <div className="text-center">
          <h1 className="text-3xl font-black text-[#151515] md:text-4xl">{editable(diseno?.falconCheckoutTitle, 'Finalizar compra')}</h1>
          <p className="mt-2 flex items-center justify-center gap-2 text-sm font-semibold text-gray-500">
            <button type="button" onClick={() => go(`/tienda/${slug}`)} className="hover:text-[#151515]">Inicio</button>
            <Icon icon="solar:alt-arrow-right-linear" width={14} />
            <button type="button" onClick={() => go(`/tienda/${slug}/catalogo`)} className="hover:text-[#151515]">Tienda</button>
            <Icon icon="solar:alt-arrow-right-linear" width={14} />
            <span style={{ color: green }}>{editable(diseno?.falconCheckoutTitle, 'Checkout')}</span>
          </p>
        </div>
      </motion.div>

      <div className="mx-auto grid max-w-[1200px] gap-6 px-4 pb-16 lg:grid-cols-[1.6fr_1fr] lg:px-6">
        {/* Form */}
        <motion.div initial="hidden" animate="show" variants={falconStagger} className="space-y-6">
          {/* Delivery */}
          {configEnvio && (configEnvio.aceptaEnvio || configEnvio.aceptaRecojo) && (
            <Section icon="solar:delivery-bold" step={1} title={editable(diseno?.falconCheckoutDeliveryTitle, 'Método de entrega')}>
              <div className="grid gap-3 sm:grid-cols-2">
                {configEnvio.aceptaEnvio && (
                  <motion.label whileHover={{ y: -2 }} whileTap={falconTap} className="flex cursor-pointer items-center gap-3 rounded-md border-2 px-4 py-4 text-sm font-black transition-colors" style={formData.tipoEntrega === 'ENVIO' ? { borderColor: green, background: `${green}14`, color: '#111' } : { borderColor: '#E5E7EB', color: '#6B7280' }}>
                    <input type="radio" className="hidden" name="tipoEntrega" value="ENVIO" checked={formData.tipoEntrega === 'ENVIO'} onChange={handleChange} />
                    <Icon icon="solar:delivery-bold" width={22} /> Envío a domicilio
                    {configEnvio.costoEnvio > 0 && <span className="ml-auto text-xs">{money(Number(configEnvio.costoEnvio))}</span>}
                  </motion.label>
                )}
                {configEnvio.aceptaRecojo && (
                  <motion.label whileHover={{ y: -2 }} whileTap={falconTap} className="flex cursor-pointer items-center gap-3 rounded-md border-2 px-4 py-4 text-sm font-black transition-colors" style={formData.tipoEntrega === 'RECOJO' ? { borderColor: green, background: `${green}14`, color: '#111' } : { borderColor: '#E5E7EB', color: '#6B7280' }}>
                    <input type="radio" className="hidden" name="tipoEntrega" value="RECOJO" checked={formData.tipoEntrega === 'RECOJO'} onChange={handleChange} />
                    <Icon icon="solar:shop-bold" width={22} /> Recojo en tienda
                  </motion.label>
                )}
              </div>
              {formData.tipoEntrega === 'RECOJO' && configEnvio.direccionRecojo && (
                <p className="mt-3 flex items-center gap-2 text-sm text-gray-500"><Icon icon="solar:map-point-linear" width={18} style={{ color: green }} /> Recojo en: <strong className="text-[#151515]">{configEnvio.direccionRecojo}</strong></p>
              )}
            </Section>
          )}

          {/* Customer */}
          <Section icon="solar:user-bold" step={2} title={editable(diseno?.falconCheckoutCustomerTitle, 'Datos del cliente')}>
            <div className="grid gap-4 sm:grid-cols-2">
              <input type="text" name="clienteNombre" placeholder="Nombre completo *" value={formData.clienteNombre} onChange={handleChange} className={inputCls('clienteNombre', erroresForm)} />
              <input type="tel" name="clienteTelefono" placeholder="Teléfono *" value={formData.clienteTelefono} onChange={handleChange} className={inputCls('clienteTelefono', erroresForm)} />
              <input type="email" name="clienteEmail" placeholder="Correo electrónico (opcional)" value={formData.clienteEmail} onChange={handleChange} className={`${inputCls('clienteEmail', erroresForm)} sm:col-span-2`} />
              {formData.tipoEntrega === 'ENVIO' && (
                <>
                  <input type="text" name="clienteDireccion" placeholder="Dirección de entrega *" value={formData.clienteDireccion} onChange={handleChange} className={`${inputCls('clienteDireccion', erroresForm)} sm:col-span-2`} />
                  <input type="text" name="clienteReferencia" placeholder="Referencia (opcional)" value={formData.clienteReferencia} onChange={handleChange} className={`${inputCls('clienteReferencia', erroresForm)} sm:col-span-2`} />
                </>
              )}
            </div>
          </Section>

          {/* Payment */}
          <Section icon="solar:card-bold" step={3} title={editable(diseno?.falconCheckoutPaymentTitle, 'Método de pago')}>
            <div className="grid gap-3 sm:grid-cols-2">
              {paymentMethods.map((method) => {
                const meta = PAYMENT_META[method];
                const active = formData.medioPago === method;
                return (
                  <motion.label key={method} whileHover={{ y: -2 }} whileTap={falconTap} className="flex cursor-pointer items-center gap-3 rounded-md border-2 px-4 py-4 text-sm font-black transition-colors" style={active ? { borderColor: green, background: `${green}14`, color: '#111' } : { borderColor: '#E5E7EB', color: '#6B7280' }}>
                    <input type="radio" className="hidden" name="medioPago" value={method} checked={active} onChange={handleChange} />
                    <Icon icon={meta.icon} width={22} /> {meta.label}
                  </motion.label>
                );
              })}
            </div>
            {formData.medioPago === 'TRANSFERENCIA' && hasBankAccounts && (
              <div className="mt-4 space-y-3">
                {configPago.cuentasBancarias.map((cuenta: any, i: number) => (
                  <div key={i} className="flex items-center gap-3 rounded-md border border-gray-200 bg-gray-50 px-4 py-3">
                    <BancoLogo banco={cuenta.banco} size={32} />
                    <div className="text-sm">
                      <p className="font-black text-[#151515]">{cuenta.banco} {cuenta.tipoCuenta ? `· ${cuenta.tipoCuenta}` : ''}</p>
                      <p className="font-semibold text-gray-500">{cuenta.numeroCuenta}{cuenta.cci ? ` · CCI ${cuenta.cci}` : ''}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Section>

          {/* Notes */}
          <Section icon="solar:notes-bold" step={4} title={editable(diseno?.falconCheckoutNotesTitle, 'Indicaciones (opcional)')}>
            <textarea name="observaciones" placeholder="Horario de entrega, referencia adicional, etc." value={formData.observaciones} onChange={handleChange} rows={4} className="w-full resize-none rounded-md border border-gray-200 bg-white p-4 text-sm font-semibold outline-none placeholder:text-gray-400 focus:border-[#151515]" />
          </Section>
        </motion.div>

        {/* Summary */}
        <motion.aside initial="hidden" animate="show" variants={falconScaleIn} className="h-fit rounded-2xl bg-white p-6 shadow-sm lg:sticky lg:top-24">
          <h2 className="text-lg font-black text-[#151515]">{editable(diseno?.falconCheckoutSummaryTitle, 'Resumen del pedido')}</h2>

          <div className="mt-5 max-h-[320px] space-y-4 overflow-y-auto">
            {carritoState.length === 0 ? (
              <p className="py-8 text-center text-sm font-semibold text-gray-400">Tu carrito está vacío.</p>
            ) : carritoState.map((item, i) => {
              const itemId = item.id ?? item.productoId ?? i;
              const qty = Number(item.cantidad || 1);
              const precio = Number(item.precioUnitario || item.precio || 0);
              return (
                <div key={itemId} className="flex gap-3">
                  <div className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[#f5f5f7]">
                    {getImg(item) ? <img src={getImg(item)} alt="" className="h-full w-full object-contain p-1" /> : <Icon icon="solar:box-bold-duotone" width={26} className="text-gray-300" />}
                    <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-black text-white" style={{ background: green }}>{qty}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-[#151515]">{item.descripcion || item.nombre}</p>
                    <div className="mt-1 flex items-center gap-2">
                      <button type="button" onClick={() => updateQuantity(itemId, qty - 1)} className="flex h-6 w-6 items-center justify-center rounded border border-gray-200 text-gray-500 hover:text-[#151515]">−</button>
                      <span className="text-xs font-bold">{qty}</span>
                      <button type="button" onClick={() => updateQuantity(itemId, qty + 1)} className="flex h-6 w-6 items-center justify-center rounded border border-gray-200 text-gray-500 hover:text-[#151515]">+</button>
                      <button type="button" onClick={() => removeItem(itemId)} className="ml-auto text-gray-400 hover:text-[#e11d48]"><Icon icon="solar:trash-bin-trash-linear" width={16} /></button>
                    </div>
                  </div>
                  <span className="text-sm font-black text-[#151515]">{money(precio * qty)}</span>
                </div>
              );
            })}
          </div>

          {freeDeliveryThreshold > 0 && freeDeliveryRemaining > 0 && (
            <div className="mt-5 rounded-md bg-[#f5f5f7] p-4">
              <p className="text-xs font-bold" style={{ color: green }}>Agrega {money(freeDeliveryRemaining)} para envío gratis</p>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-200"><div className="h-full rounded-full" style={{ width: `${freeDeliveryProgress}%`, background: green }} /></div>
            </div>
          )}

          <div className="mt-5 space-y-2 border-t border-gray-100 pt-5 text-sm">
            <div className="flex justify-between text-gray-500"><span>Subtotal</span><span className="font-bold text-[#151515]">{money(subtotal)}</span></div>
            <div className="flex justify-between text-gray-500"><span>Envío</span><span className="font-bold text-[#151515]">{envio > 0 ? money(envio) : 'Gratis'}</span></div>
            <div className="flex justify-between border-t border-gray-100 pt-3 text-base"><span className="font-black text-[#151515]">Total</span><span className="font-black" style={{ color: green }}>{money(total)}</span></div>
          </div>

          <motion.button type="button" onClick={onSubmit} disabled={enviando || carritoState.length === 0} whileHover={enviando || carritoState.length === 0 ? undefined : { y: -2 }} whileTap={falconTap} className="mt-5 flex w-full items-center justify-center gap-2 rounded-md py-4 text-sm font-black uppercase tracking-wide text-white shadow-lg transition-transform disabled:cursor-not-allowed disabled:bg-gray-300" style={enviando || carritoState.length === 0 ? undefined : { background: green }}>
            {enviando ? <><Icon icon="solar:refresh-bold" className="animate-spin" width={16} /> Procesando...</> : <>{editable(diseno?.falconCheckoutConfirmLabel, 'Confirmar pedido')} <Icon icon="solar:arrow-right-bold" width={18} /></>}
          </motion.button>
          <p className="mt-3 flex items-center justify-center gap-2 text-xs text-gray-400"><Icon icon="solar:shield-check-bold" width={16} style={{ color: green }} /> Pago 100% seguro y protegido</p>
        </motion.aside>
      </div>

      <FalconFooter tienda={tienda} slug={slug} green={green} diseno={diseno} />

      {props.showPaymentModal && props.pedidoCreado && (
        <PaymentConfirmationModal
          isOpen={props.showPaymentModal}
          onClose={() => { props.setShowPaymentModal(false); window.location.href = withPreviewQuery(`/tienda/${props.slug}/seguimiento?codigo=${props.pedidoCreado.codigoSeguimiento}`, diseno); }}
          orderData={{
            id: props.pedidoCreado.id,
            codigoSeguimiento: props.pedidoCreado.codigoSeguimiento,
            total: props.pedidoCreado.total || props.calcularTotal(),
            medioPago: props.formData.medioPago,
            tipoEntrega: props.formData.tipoEntrega,
            clienteNombre: props.formData.clienteNombre,
          }}
          paymentConfig={props.configPago ? {
            yapeQR: props.configPago.yapeQR || props.configPago.yapeQrUrl || undefined,
            plinQR: props.configPago.plinQR || props.configPago.plinQrUrl || undefined,
            yapeNumero: props.configPago.yapeNumero || undefined,
            plinNumero: props.configPago.plinNumero || undefined,
            whatsappTienda: props.configPago?.whatsappTienda ?? props.tienda?.whatsappTienda ?? props.tienda?.diseno?.whatsappTienda,
            cuentasBancarias: props.configPago.cuentasBancarias || undefined,
          } : undefined}
          storeSlug={props.slug || ''}
        />
      )}
      <ConfirmOrderModal
        isOpen={props.showConfirmModal}
        onClose={() => props.setShowConfirmModal(false)}
        onConfirm={props.enviarPedido}
        total={props.calcularTotal()}
        loading={props.enviando}
        tiendaColor={green}
      />
    </div>
  );
}
