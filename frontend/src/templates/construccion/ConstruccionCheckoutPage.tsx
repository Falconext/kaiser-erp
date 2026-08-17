import { Icon } from '@iconify/react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import ConfirmOrderModal from '@/components/tienda/ConfirmOrderModal';
import PaymentConfirmationModal from '@/components/tienda/PaymentConfirmationModal';
import { BancoLogo } from '@/components/shared/BancoLogo';
import type { TemplateCheckoutPageProps } from '@/templates/shared/types';

type MedioPago = 'YAPE' | 'PLIN' | 'EFECTIVO' | 'TRANSFERENCIA' | 'TARJETA';

const PAYMENT_META: Record<MedioPago, { label: string; icon: string }> = {
  YAPE: { label: 'Yape', icon: 'solar:smartphone-bold' },
  PLIN: { label: 'Plin', icon: 'solar:wallet-money-bold' },
  EFECTIVO: { label: 'Efectivo', icon: 'solar:banknote-2-bold' },
  TRANSFERENCIA: { label: 'Transferencia', icon: 'solar:card-transfer-bold' },
  TARJETA: { label: 'Tarjeta', icon: 'solar:card-2-bold' },
};

const money = (value: number) => `S/ ${Number(value || 0).toFixed(2)}`;
const editable = (value: any, fallback: string) => String(value || '').trim() || fallback;

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } },
};

function HammerLogo({ storeName, subtitle, accent = '#ffb400' }: { storeName: string; subtitle: string; accent?: string }) {
  const label = storeName?.trim() ? storeName.trim().split(/\s+/)[0] : 'HAMMER';
  const clean = label.replace(/[^a-zA-Z0-9]/g, '') || 'HAMMER';
  const start = clean.slice(0, Math.max(2, clean.length - 3)).toUpperCase();
  const end = clean.slice(Math.max(2, clean.length - 3)).toUpperCase();

  return (
    <div className="leading-none">
      <div className="flex items-end text-[28px] font-black uppercase tracking-[0.08em] text-white md:text-[34px]">
        <span>{start}</span>
        <span style={{ color: accent }}>{end}</span>
      </div>
      <p className="mt-1 text-[12px] font-semibold tracking-wide text-white/35">{subtitle}</p>
    </div>
  );
}

function SectionTitle({ icon, children, cp }: { icon: string; children: string; cp: string }) {
  return (
    <div className="mb-5 flex items-center gap-3">
      <span className="flex h-10 w-10 items-center justify-center rounded-md text-[#111]" style={{ background: cp }}>
        <Icon icon={icon} width={20} />
      </span>
      <div>
        <p className="text-[11px] font-black uppercase tracking-[0.18em] text-gray-400">Checkout</p>
        <h2 className="text-xl font-black text-[#151515]">{children}</h2>
      </div>
    </div>
  );
}

function inputCls(field: string, errors: Record<string, string>) {
  const base = 'h-12 w-full rounded-md border bg-white px-4 text-sm font-semibold text-gray-900 outline-none transition-colors placeholder:text-gray-400 focus:border-[#111]';
  return errors?.[field] ? `${base} border-red-500` : `${base} border-gray-200`;
}

export default function ConstruccionCheckoutPage(props: TemplateCheckoutPageProps) {
  const {
    slug,
    tienda,
    diseno,
    cp,
    carritoState,
    updateQuantity,
    removeItem,
    formData,
    erroresForm,
    handleChange,
    configPago,
    configEnvio,
    enviando,
    calcularSubtotal,
    calcularCostoEnvio,
    calcularTotal,
    freeDeliveryThreshold,
    freeDeliveryRemaining,
    freeDeliveryProgress,
    onSubmit,
  } = props;

  const navigate = useNavigate();
  const accent = cp || diseno?.colorPrimario || '#ffb400';
  const storeName = tienda?.nombreComercial || tienda?.nombre || tienda?.razonSocial || 'Ferretería';
  const subtotal = calcularSubtotal();
  const envio = calcularCostoEnvio();
  const total = calcularTotal();
  const hasBankAccounts = Array.isArray(configPago?.cuentasBancarias) && configPago.cuentasBancarias.length > 0;
  const acceptedPaymentMethods = ([
    configPago?.yapeQR || configPago?.yapeQrUrl || configPago?.yapeNumero ? 'YAPE' : null,
    configPago?.plinQR || configPago?.plinQrUrl || configPago?.plinNumero ? 'PLIN' : null,
    configPago?.aceptaEfectivo ? 'EFECTIVO' : null,
    hasBankAccounts ? 'TRANSFERENCIA' : null,
    configPago?.aceptaTarjeta && configPago?.culqiPublicKey ? 'TARJETA' : null,
  ].filter(Boolean) as MedioPago[]);

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#f4f4f4]" style={{ fontFamily: `'${diseno?.tipografia || 'Inter'}', sans-serif` }}>
      <header className="bg-[#111111] text-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-6 lg:flex-row lg:items-center lg:justify-between lg:px-6">
          <button type="button" onClick={() => navigate(`/tienda/${slug}`)} className="text-left">
            <HammerLogo storeName={storeName} subtitle={editable(diseno?.construccionLogoSubtitle, 'Herramientas y accesorios')} accent={accent} />
          </button>
          <div className="flex flex-wrap items-center gap-3 text-sm font-bold text-white/60">
            <button type="button" onClick={() => navigate(`/tienda/${slug}`)} className="hover:text-white">Inicio</button>
            <Icon icon="solar:alt-arrow-right-linear" width={14} />
            <button type="button" onClick={() => navigate(`/tienda/${slug}/catalogo`)} className="hover:text-white">Tienda</button>
            <Icon icon="solar:alt-arrow-right-linear" width={14} />
            <span style={{ color: accent }}>Checkout</span>
          </div>
        </div>
        <div style={{ background: accent }}>
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 text-[#151515] lg:px-6">
            <div className="flex items-center gap-3 text-sm font-black">
              <Icon icon="solar:shield-check-bold" width={22} />
              {editable(diseno?.construccionCheckoutSecureText, 'Compra segura y pedido directo a tienda')}
            </div>
            <button type="button" onClick={() => navigate(`/tienda/${slug}/catalogo`)} className="hidden rounded-md bg-white px-5 py-2 text-sm font-black shadow-sm md:inline-flex">
              {editable(diseno?.construccionCheckoutContinueLabel, 'Seguir comprando')}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-10 md:flex-row md:items-start lg:px-6">
        <section className="min-w-0 flex-1 space-y-6">
          {carritoState.length === 0 ? (
            <motion.div variants={fadeUp} initial="hidden" animate="show" className="rounded-md border border-dashed border-gray-300 bg-white px-8 py-16 text-center">
              <Icon icon="solar:cart-large-minimalistic-linear" width={72} className="mx-auto text-gray-300" />
              <h1 className="mt-5 text-2xl font-black text-[#151515]">Tu carrito está vacío</h1>
              <p className="mt-2 text-sm font-semibold text-gray-500">Agrega productos para iniciar el checkout.</p>
              <button type="button" onClick={() => navigate(`/tienda/${slug}/catalogo`)} className="mt-7 rounded-md px-6 py-3 text-sm font-black text-[#111]" style={{ background: accent }}>
                Ver catálogo
              </button>
            </motion.div>
          ) : (
            <>
              <motion.div variants={fadeUp} initial="hidden" animate="show" className="rounded-md border border-gray-200 bg-white p-5 shadow-sm">
                <SectionTitle icon="solar:cart-large-2-bold" cp={accent}>{editable(diseno?.construccionCheckoutProductsTitle, 'Productos del pedido')}</SectionTitle>
                <div className="space-y-3">
                  {carritoState.map((item) => {
                    const itemId = item.cartId || item.id;
                    const qty = Number(item.cantidad || 1);
                    const price = Number(item.precioUnitario || 0);
                    return (
                      <motion.article key={itemId} variants={fadeUp} initial="hidden" animate="show" whileHover={{ y: -2 }} className="flex flex-col gap-4 rounded-md border border-gray-100 bg-white p-4 shadow-sm sm:flex-row sm:items-center">
                        <div className="flex h-24 w-full shrink-0 items-center justify-center rounded-md border border-gray-100 bg-gray-50 p-2 sm:w-24">
                          {item.imagenUrl ? <img src={item.imagenUrl} alt={item.descripcion} className="h-full w-full object-contain" /> : <Icon icon="solar:box-bold-duotone" width={44} className="text-gray-300" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="text-base font-black leading-snug text-[#151515]">{item.descripcion}</h3>
                          {item.partNumber && <p className="mt-1 text-[11px] font-bold uppercase tracking-wide text-gray-400">PN: {item.partNumber}</p>}
                          <button type="button" onClick={() => removeItem(itemId)} className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-red-500">
                            <Icon icon="solar:trash-bin-trash-linear" width={14} />
                            Quitar
                          </button>
                        </div>
                        <div className="flex shrink-0 items-center justify-between gap-4 sm:min-w-[156px] sm:flex-col sm:items-end">
                          <div className="flex h-10 overflow-hidden rounded-md border border-gray-200 bg-white">
                            <button type="button" onClick={() => updateQuantity(itemId, qty - 1)} className="flex w-10 items-center justify-center text-lg font-black hover:bg-gray-100">-</button>
                            <span className="flex w-11 items-center justify-center border-x border-gray-200 text-sm font-black">{qty}</span>
                            <button type="button" onClick={() => updateQuantity(itemId, qty + 1)} className="flex w-10 items-center justify-center text-lg font-black hover:bg-gray-100">+</button>
                          </div>
                          <span className="text-lg font-black text-[#151515]">{money(price * qty)}</span>
                        </div>
                      </motion.article>
                    );
                  })}
                </div>
              </motion.div>

              {configEnvio && (configEnvio.aceptaEnvio || configEnvio.aceptaRecojo) && (
                <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.25 }} className="rounded-md border border-gray-200 bg-white p-5 shadow-sm">
                  <SectionTitle icon="solar:delivery-bold" cp={accent}>{editable(diseno?.construccionCheckoutDeliveryTitle, 'Método de entrega')}</SectionTitle>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {configEnvio.aceptaEnvio && (
                      <label className="flex cursor-pointer items-center gap-3 rounded-md border-2 px-4 py-4 text-sm font-black transition-colors" style={formData.tipoEntrega === 'ENVIO' ? { borderColor: accent, background: `${accent}14`, color: '#111' } : { borderColor: '#E5E7EB', color: '#6B7280' }}>
                        <input type="radio" className="hidden" name="tipoEntrega" value="ENVIO" checked={formData.tipoEntrega === 'ENVIO'} onChange={handleChange} />
                        <Icon icon="solar:delivery-bold" width={22} />
                        Envío a domicilio
                        {configEnvio.costoEnvio > 0 && <span className="ml-auto text-xs">{money(Number(configEnvio.costoEnvio))}</span>}
                      </label>
                    )}
                    {configEnvio.aceptaRecojo && (
                      <label className="flex cursor-pointer items-center gap-3 rounded-md border-2 px-4 py-4 text-sm font-black transition-colors" style={formData.tipoEntrega === 'RECOJO' ? { borderColor: accent, background: `${accent}14`, color: '#111' } : { borderColor: '#E5E7EB', color: '#6B7280' }}>
                        <input type="radio" className="hidden" name="tipoEntrega" value="RECOJO" checked={formData.tipoEntrega === 'RECOJO'} onChange={handleChange} />
                        <Icon icon="solar:shop-bold" width={22} />
                        Recojo en tienda
                      </label>
                    )}
                  </div>
                  {formData.tipoEntrega === 'RECOJO' && configEnvio.direccionRecojo && (
                    <div className="mt-4 flex items-start gap-3 rounded-md bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-600">
                      <Icon icon="solar:map-point-bold" width={18} style={{ color: accent }} className="mt-0.5 shrink-0" />
                      <span>Recojo en: <strong className="text-[#151515]">{configEnvio.direccionRecojo}</strong></span>
                    </div>
                  )}
                </motion.div>
              )}

              <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.25 }} className="rounded-md border border-gray-200 bg-white p-5 shadow-sm">
                <SectionTitle icon="solar:user-bold" cp={accent}>{editable(diseno?.construccionCheckoutCustomerTitle, 'Datos del cliente')}</SectionTitle>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <input type="text" name="clienteNombre" placeholder="Nombre completo *" value={formData.clienteNombre} onChange={handleChange} className={inputCls('clienteNombre', erroresForm)} />
                    {erroresForm.clienteNombre && <p className="mt-1 text-xs text-red-500">{erroresForm.clienteNombre}</p>}
                  </div>
                  <div>
                    <input type="tel" name="clienteTelefono" placeholder="Teléfono *" value={formData.clienteTelefono} onChange={handleChange} className={inputCls('clienteTelefono', erroresForm)} />
                    {erroresForm.clienteTelefono && <p className="mt-1 text-xs text-red-500">{erroresForm.clienteTelefono}</p>}
                  </div>
                  <div className="sm:col-span-2">
                    <input type="email" name="clienteEmail" placeholder="Correo electrónico (opcional)" value={formData.clienteEmail} onChange={handleChange} className={inputCls('clienteEmail', erroresForm)} />
                    {erroresForm.clienteEmail && <p className="mt-1 text-xs text-red-500">{erroresForm.clienteEmail}</p>}
                  </div>
                  {formData.tipoEntrega === 'ENVIO' && (
                    <>
                      <div className="sm:col-span-2">
                        <input type="text" name="clienteDireccion" placeholder="Dirección de entrega *" value={formData.clienteDireccion} onChange={handleChange} className={inputCls('clienteDireccion', erroresForm)} />
                        {erroresForm.clienteDireccion && <p className="mt-1 text-xs text-red-500">{erroresForm.clienteDireccion}</p>}
                      </div>
                      <input type="text" name="clienteReferencia" placeholder="Referencia (opcional)" value={formData.clienteReferencia} onChange={handleChange} className="h-12 rounded-md border border-gray-200 bg-white px-4 text-sm font-semibold outline-none placeholder:text-gray-400 focus:border-[#111] sm:col-span-2" />
                    </>
                  )}
                </div>
              </motion.div>

              <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.25 }} className="rounded-md border border-gray-200 bg-white p-5 shadow-sm">
                <SectionTitle icon="solar:wallet-money-bold" cp={accent}>{editable(diseno?.construccionCheckoutPaymentTitle, 'Método de pago')}</SectionTitle>
                <div className="grid gap-3 sm:grid-cols-3">
                  {(['YAPE', 'PLIN', 'EFECTIVO', 'TRANSFERENCIA', 'TARJETA'] as MedioPago[]).map((method) => {
                    const show =
                      method === 'EFECTIVO' ? Boolean(configPago?.aceptaEfectivo)
                      : method === 'TRANSFERENCIA' ? Boolean(configPago?.cuentasBancarias?.length > 0)
                      : method === 'TARJETA' ? Boolean(configPago?.aceptaTarjeta && configPago?.culqiPublicKey)
                      : true;
                    if (!show) return null;
                    const meta = PAYMENT_META[method];
                    const active = formData.medioPago === method;
                    return (
                      <label key={method} className="flex cursor-pointer items-center gap-2 rounded-md border-2 px-4 py-3 text-sm font-black transition-colors" style={active ? { borderColor: accent, background: `${accent}14`, color: '#111' } : { borderColor: '#E5E7EB', color: '#6B7280' }}>
                        <input type="radio" className="hidden" name="medioPago" value={method} checked={active} onChange={handleChange} />
                        <Icon icon={meta.icon} width={18} />
                        {meta.label}
                      </label>
                    );
                  })}
                </div>
                {formData.medioPago === 'TRANSFERENCIA' && configPago?.cuentasBancarias?.length > 0 && (
                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    {configPago.cuentasBancarias.map((cuenta: any) => (
                      <div key={cuenta.id} className="flex items-center gap-4 rounded-md border border-gray-200 bg-gray-50 p-4">
                        <BancoLogo banco={cuenta.banco} size={44} />
                        <div className="min-w-0">
                          <p className="font-mono text-sm font-black text-[#151515]">{cuenta.numeroCuenta}</p>
                          {cuenta.cci && <p className="text-xs font-semibold text-gray-500">CCI: {cuenta.cci}</p>}
                          {cuenta.titular && <p className="text-xs font-semibold text-gray-600">Titular: {cuenta.titular}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>

              <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.25 }} className="rounded-md border border-gray-200 bg-white p-5 shadow-sm">
                <SectionTitle icon="solar:notes-bold" cp={accent}>{editable(diseno?.construccionCheckoutNoteTitle, 'Nota del pedido')}</SectionTitle>
                <textarea name="observaciones" placeholder="Indicación especial, horario de entrega, detalle de instalación, etc. (opcional)" value={formData.observaciones} onChange={handleChange} rows={4} className="w-full resize-none rounded-md border border-gray-200 bg-white p-4 text-sm font-semibold outline-none placeholder:text-gray-400 focus:border-[#111]" />
              </motion.div>
            </>
          )}
        </section>

        <aside className="w-full shrink-0 md:sticky md:top-6 md:w-[360px] lg:w-[390px]">
          <motion.div variants={fadeUp} initial="hidden" animate="show" className="overflow-hidden rounded-md border border-gray-200 bg-white shadow-sm">
            <div className="bg-[#111111] px-6 py-5 text-white">
              <p className="text-[11px] font-black uppercase tracking-[0.18em]" style={{ color: accent }}>Resumen</p>
              <h2 className="mt-1 text-2xl font-black">{editable(diseno?.construccionCheckoutSummaryTitle, 'Pedido')}</h2>
            </div>
            <div className="max-h-72 space-y-3 overflow-y-auto border-b border-gray-100 px-5 py-4">
              {carritoState.length === 0 ? (
                <p className="py-8 text-center text-sm font-semibold text-gray-400">Sin productos en el carrito.</p>
              ) : carritoState.map((item) => (
                <div key={item.cartId || item.id} className="grid grid-cols-[48px_1fr_auto] items-center gap-3">
                  <div className="relative">
                    <div className="flex h-12 w-12 items-center justify-center rounded-md border border-gray-100 bg-gray-50 p-1">
                      {item.imagenUrl ? <img src={item.imagenUrl} alt="" className="h-full w-full object-contain" /> : <Icon icon="solar:box-linear" className="text-gray-300" />}
                    </div>
                    <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-black text-[#111]" style={{ background: accent }}>{item.cantidad}</span>
                  </div>
                  <p className="line-clamp-2 text-xs font-bold leading-snug text-gray-600">{item.descripcion}</p>
                  <span className="text-xs font-black text-[#151515]">{money(Number(item.precioUnitario || 0) * Number(item.cantidad || 1))}</span>
                </div>
              ))}
            </div>
            <div className="space-y-3 px-6 py-5">
              <div className="flex justify-between text-sm font-semibold text-gray-500"><span>Subtotal</span><span className="font-black text-[#151515]">{money(subtotal)}</span></div>
              <div className="flex justify-between text-sm font-semibold text-gray-500"><span>Envío</span><span className="font-black text-[#151515]">{envio === 0 ? 'Gratis' : money(envio)}</span></div>
              {freeDeliveryThreshold > 0 && freeDeliveryRemaining > 0 && (
                <div className="rounded-md border border-emerald-100 bg-emerald-50 px-3 py-2">
                  <p className="text-xs font-bold text-emerald-700">Agrega {money(freeDeliveryRemaining)} para envío gratis</p>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-emerald-100">
                    <div className="h-full rounded-full bg-emerald-600" style={{ width: `${freeDeliveryProgress}%` }} />
                  </div>
                </div>
              )}
              {erroresForm._minimo && <p className="rounded-md bg-red-50 px-3 py-2 text-xs font-bold text-red-500">{erroresForm._minimo}</p>}
              <div className="flex items-center justify-between border-t border-gray-100 pt-4">
                <span className="text-sm font-black uppercase tracking-wide text-[#151515]">Total</span>
                <span className="text-3xl font-black text-[#151515]">{money(total)}</span>
              </div>
              <button type="button" onClick={onSubmit} disabled={enviando || carritoState.length === 0} className="flex w-full items-center justify-center gap-2 rounded-md px-5 py-4 text-sm font-black uppercase tracking-wide text-[#111] shadow-lg transition-transform hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-50" style={{ background: accent }}>
                {enviando ? <><Icon icon="solar:refresh-bold" className="animate-spin" width={16} />Procesando...</> : <>{editable(diseno?.construccionCheckoutConfirmLabel, 'Confirmar pedido')} <Icon icon="solar:arrow-right-bold" width={18} /></>}
              </button>
              <div className="flex flex-wrap justify-center gap-3 pt-1 text-[11px] font-bold text-gray-400">
                {(acceptedPaymentMethods.length ? acceptedPaymentMethods : (['EFECTIVO'] as MedioPago[])).map((method) => (
                  <span key={method} className="inline-flex items-center gap-1"><Icon icon={PAYMENT_META[method].icon} width={13} />{PAYMENT_META[method].label}</span>
                ))}
              </div>
            </div>
          </motion.div>
        </aside>
      </main>

      {props.pedidoCreado && (
        <PaymentConfirmationModal
          isOpen={props.showPaymentModal}
          onClose={() => {
            props.setShowPaymentModal(false);
            window.location.href = `/tienda/${props.slug}/seguimiento?codigo=${props.pedidoCreado.codigoSeguimiento}`;
          }}
          orderData={{
            id: props.pedidoCreado.id,
            codigoSeguimiento: props.pedidoCreado.codigoSeguimiento,
            total: props.pedidoCreado.total || props.calcularTotal(),
            medioPago: props.formData.medioPago,
            tipoEntrega: props.formData.tipoEntrega,
            clienteNombre: props.formData.clienteNombre,
          }}
          paymentConfig={
            props.configPago
              ? {
                  yapeQR: props.configPago.yapeQR || props.configPago.yapeQrUrl || undefined,
                  plinQR: props.configPago.plinQR || props.configPago.plinQrUrl || undefined,
                  yapeNumero: props.configPago.yapeNumero || undefined,
                  plinNumero: props.configPago.plinNumero || undefined,
                  whatsappTienda: props.configPago?.whatsappTienda ?? props.tienda?.whatsappTienda ?? props.tienda?.diseno?.whatsappTienda,
                  cuentasBancarias: props.configPago.cuentasBancarias || undefined,
                }
              : undefined
          }
          storeSlug={props.slug || ''}
        />
      )}
      <ConfirmOrderModal
        isOpen={props.showConfirmModal}
        onClose={() => props.setShowConfirmModal(false)}
        onConfirm={props.enviarPedido}
        total={props.calcularTotal()}
        loading={props.enviando}
        tiendaColor={accent}
      />
    </div>
  );
}
