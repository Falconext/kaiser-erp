import { motion } from 'framer-motion';
import { Icon } from '@iconify/react';
import type { TemplateCheckoutPageProps } from '@/templates/shared/types';
import ConfirmOrderModal from '@/components/tienda/ConfirmOrderModal';
import PaymentConfirmationModal from '@/components/tienda/PaymentConfirmationModal';
import { APICULTURA_BANNER, ApiculturaFooter, ApiculturaHeader, ApiculturaProductCard } from './ApiculturaParts';
import { honeyCard, honeyHover, honeyPage, honeySection, honeyStagger, honeyTap, honeyViewport } from './motion';

const honeyPattern = {
  backgroundImage:
    'linear-gradient(30deg, rgba(0,0,0,.045) 12%, transparent 12.5%, transparent 87%, rgba(0,0,0,.045) 87.5%, rgba(0,0,0,.045)), linear-gradient(150deg, rgba(0,0,0,.045) 12%, transparent 12.5%, transparent 87%, rgba(0,0,0,.045) 87.5%, rgba(0,0,0,.045))',
  backgroundSize: '68px 40px',
};

function inputClass(hasError?: boolean) {
  return `mt-3 h-[52px] w-full border bg-white px-4 text-sm font-bold text-black outline-none transition-colors focus:border-black ${
    hasError ? 'border-red-400' : 'border-gray-200'
  }`;
}

function textareaClass() {
  return 'mt-3 w-full resize-none border border-gray-200 bg-white px-4 py-4 text-sm font-bold text-black outline-none transition-colors focus:border-black';
}

function money(value: number) {
  return `S/ ${Number(value || 0).toFixed(2)}`;
}

export default function ApiculturaCheckoutPage(props: TemplateCheckoutPageProps) {
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
    suggestedProducts,
    search,
    setSearch,
    calcularSubtotal,
    calcularCostoEnvio,
    calcularTotal,
    onSubmit,
    onAddToCart,
    freeDeliveryRemaining,
    showConfirmModal,
    setShowConfirmModal,
    showPaymentModal,
    setShowPaymentModal,
    pedidoCreado,
    enviarPedido,
  } = props;

  const cartCount = carritoState.reduce((sum, item) => sum + Number(item.cantidad || 1), 0);
  const canSubmit = !enviando && carritoState.length > 0;
  const deliveryType = formData.tipoEntrega || 'delivery';
  // El emprendedor coordina el envío internamente: oculta la línea "Envío" y no lo suma al total.
  const ocultarEnvio = Boolean(diseno?.apiculturaOcultarEnvio);

  return (
    <motion.div initial="hidden" animate="show" variants={honeyPage} className="min-h-screen bg-white text-black" style={{ fontFamily: `'${diseno?.tipografia || 'Inter'}', sans-serif` }}>
      <ApiculturaHeader
        tienda={tienda}
        slug={slug}
        cp={cp}
        diseno={diseno}
        carritoSize={cartCount}
        onOpenCart={() => undefined}
        searchQuery={search}
        setSearchQuery={setSearch}
        allCategories={[]}
        onSearchSubmit={(event, value) => {
          event.preventDefault();
          if (value?.trim()) window.location.href = `/tienda/${slug}/catalogo?search=${encodeURIComponent(value.trim())}`;
        }}
      />

      <motion.section variants={honeySection} className="bg-[#FFD72E] px-5 pb-16 pt-8 text-center" style={honeyPattern}>
        <div className="mx-auto max-w-7xl">
          <div className="text-sm font-black text-black/70">
            <a href={`/tienda/${slug}`} className="hover:text-black">Inicio</a>
            <span className="mx-1">/</span>
            <span>Finalizar compra</span>
          </div>
          <h1 className="mt-3 text-4xl font-black text-black md:text-5xl">{diseno?.apiculturaCheckoutTitle || 'Finalizar compra'}</h1>
        </div>
      </motion.section>

      <motion.main variants={honeySection} className="mx-auto max-w-7xl px-5 py-12">
        <motion.section variants={honeyStagger} className="mb-10 grid gap-4 md:grid-cols-3">
          {[
            ['solar:user-check-bold', 'Datos del cliente', 'Identificación y contacto'],
            ['solar:delivery-bold', 'Entrega', deliveryType === 'recojo' ? 'Recojo en tienda' : 'Delivery configurado'],
            ['solar:shield-check-bold', 'Pago seguro', 'Pedido validado antes de enviar'],
          ].map(([icon, title, text]) => (
            <motion.div key={title} variants={honeyCard} whileHover={honeyHover} className="flex items-center gap-4 border border-gray-100 bg-[#F7F7F7] p-5">
              <span className="flex h-12 w-12 items-center justify-center rounded-full text-black" style={{ backgroundColor: cp }}>
                <Icon icon={icon} width={23} />
              </span>
              <div>
                <p className="text-sm font-black text-black">{title}</p>
                <p className="mt-1 text-xs font-semibold text-gray-500">{text}</p>
              </div>
            </motion.div>
          ))}
        </motion.section>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_430px]">
          <section className="space-y-8">
            <motion.div initial="hidden" whileInView="show" viewport={honeyViewport} variants={honeyCard} className="border border-gray-100 bg-white p-6 shadow-sm md:p-8">
              <div className="mb-7 flex items-center gap-3">
                <span className="flex h-12 w-12 items-center justify-center rounded-full text-black" style={{ backgroundColor: cp }}>
                  <Icon icon="solar:user-rounded-bold" width={24} />
                </span>
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.22em] text-gray-400">Paso 1</p>
                  <h2 className="text-2xl font-black text-black">{diseno?.apiculturaCheckoutCustomerTitle || 'Datos del cliente'}</h2>
                </div>
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <label className="block">
                  <span className="text-xs font-black uppercase tracking-[0.15em] text-gray-500">Nombre completo</span>
                  <input name="clienteNombre" value={formData.clienteNombre || ''} onChange={handleChange} className={inputClass(erroresForm.clienteNombre)} />
                  {erroresForm.clienteNombre && <p className="mt-2 text-xs font-bold text-red-500">{erroresForm.clienteNombre}</p>}
                </label>
                <label className="block">
                  <span className="text-xs font-black uppercase tracking-[0.15em] text-gray-500">Celular</span>
                  <input name="clienteTelefono" value={formData.clienteTelefono || ''} onChange={handleChange} className={inputClass(erroresForm.clienteTelefono)} />
                  {erroresForm.clienteTelefono && <p className="mt-2 text-xs font-bold text-red-500">{erroresForm.clienteTelefono}</p>}
                </label>
                <label className="block md:col-span-2">
                  <span className="text-xs font-black uppercase tracking-[0.15em] text-gray-500">Correo</span>
                  <input name="clienteEmail" type="email" value={formData.clienteEmail || ''} onChange={handleChange} className={inputClass(erroresForm.clienteEmail)} />
                  {erroresForm.clienteEmail && <p className="mt-2 text-xs font-bold text-red-500">{erroresForm.clienteEmail}</p>}
                </label>
              </div>
            </motion.div>

            <motion.div initial="hidden" whileInView="show" viewport={honeyViewport} variants={honeyCard} className="border border-gray-100 bg-white p-6 shadow-sm md:p-8">
              <div className="mb-7 flex items-center gap-3">
                <span className="flex h-12 w-12 items-center justify-center rounded-full text-black" style={{ backgroundColor: cp }}>
                  <Icon icon="solar:delivery-bold" width={24} />
                </span>
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.22em] text-gray-400">Paso 2</p>
                  <h2 className="text-2xl font-black text-black">{diseno?.apiculturaCheckoutDeliveryTitle || 'Entrega y pago'}</h2>
                </div>
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <label className="block">
                  <span className="text-xs font-black uppercase tracking-[0.15em] text-gray-500">Tipo de entrega</span>
                  <select name="tipoEntrega" value={deliveryType} onChange={handleChange} className={inputClass(erroresForm.tipoEntrega)}>
                    {configEnvio?.aceptaRecojo !== false && <option value="recojo">Recojo en tienda</option>}
                    {configEnvio?.aceptaEnvio !== false && <option value="delivery">Entrega</option>}
                  </select>
                  {erroresForm.tipoEntrega && <p className="mt-2 text-xs font-bold text-red-500">{erroresForm.tipoEntrega}</p>}
                </label>
                <label className="block">
                  <span className="text-xs font-black uppercase tracking-[0.15em] text-gray-500">Medio de pago</span>
                  <select name="medioPago" value={formData.medioPago || 'efectivo'} onChange={handleChange} className={inputClass(erroresForm.medioPago)}>
                    {configPago?.aceptaEfectivo !== false && <option value="efectivo">Efectivo</option>}
                    {configPago?.aceptaYape !== false && <option value="yape">Yape</option>}
                    {configPago?.aceptaPlin !== false && <option value="plin">Plin</option>}
                    {configPago?.aceptaTarjeta && <option value="tarjeta">Tarjeta</option>}
                  </select>
                  {erroresForm.medioPago && <p className="mt-2 text-xs font-bold text-red-500">{erroresForm.medioPago}</p>}
                </label>
                <label className="block md:col-span-2">
                  <span className="text-xs font-black uppercase tracking-[0.15em] text-gray-500">Dirección</span>
                  <input name="direccionEntrega" value={formData.direccionEntrega || ''} onChange={handleChange} className={inputClass(erroresForm.direccionEntrega)} />
                  {erroresForm.direccionEntrega && <p className="mt-2 text-xs font-bold text-red-500">{erroresForm.direccionEntrega}</p>}
                </label>
                <label className="block md:col-span-2">
                  <span className="text-xs font-black uppercase tracking-[0.15em] text-gray-500">Nota del pedido</span>
                  <textarea name="notaPedido" value={formData.notaPedido || ''} onChange={handleChange} rows={5} className={textareaClass()} placeholder="Indicaciones, referencia o datos adicionales..." />
                </label>
              </div>
            </motion.div>

            <motion.div initial="hidden" whileInView="show" viewport={honeyViewport} variants={honeyStagger} className="grid gap-4 md:grid-cols-3">
              {[
                ['solar:shield-check-bold', 'Compra protegida', 'Tus datos quedan asociados al pedido.'],
                ['solar:box-bold', 'Stock verificado', 'El negocio confirma disponibilidad.'],
                ['solar:chat-round-dots-bold', 'Atención directa', 'Seguimiento desde la tienda.'],
              ].map(([icon, title, text]) => (
                <motion.div key={title} variants={honeyCard} whileHover={honeyHover} className="bg-[#F7F7F7] p-6">
                  <Icon icon={icon} width={28} className="text-black" />
                  <p className="mt-4 text-sm font-black text-black">{title}</p>
                  <p className="mt-2 text-xs font-semibold leading-5 text-gray-500">{text}</p>
                </motion.div>
              ))}
            </motion.div>

            {suggestedProducts.length > 0 && (
              <motion.div initial="hidden" whileInView="show" viewport={honeyViewport} variants={honeySection} className="border border-gray-100 bg-white p-6 shadow-sm md:p-8">
                <div className="mb-7 flex items-end justify-between gap-4">
                  <div>
                    <p className="font-serif text-2xl italic text-black">You may also like</p>
                    <h2 className="text-2xl font-black text-black">Productos sugeridos</h2>
                  </div>
                  <a href={`/tienda/${slug}/catalogo`} className="text-sm font-black text-black hover:opacity-70">Ver catálogo</a>
                </div>
                <motion.div variants={honeyStagger} className="grid gap-5 md:grid-cols-3">
                  {suggestedProducts.slice(0, 3).map((producto) => (
                    <ApiculturaProductCard
                      key={producto.id}
                      producto={producto}
                      slug={slug}
                      cp={cp}
                      onAddToCart={onAddToCart}
                      onClick={() => { window.location.href = `/tienda/${slug}/producto/${producto.id}`; }}
                    />
                  ))}
                </motion.div>
              </motion.div>
            )}
          </section>

          <motion.aside initial="hidden" animate="show" variants={honeyCard} className="h-fit border border-gray-100 bg-white shadow-xl shadow-yellow-900/10 lg:sticky lg:top-24">
            <div className="border-b border-gray-100 p-6">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-gray-400">Tu compra</p>
              <h2 className="mt-2 text-2xl font-black text-black">{diseno?.apiculturaCheckoutSummaryTitle || 'Resumen del pedido'}</h2>
            </div>

            <div className="max-h-[460px] space-y-0 overflow-y-auto px-6">
              {carritoState.length === 0 ? (
                <div className="my-6 bg-[#F7F7F7] p-8 text-center">
                  <Icon icon="solar:bag-cross-bold" className="mx-auto text-4xl text-gray-300" />
                  <p className="mt-3 text-sm font-bold text-gray-500">Tu carrito está vacío.</p>
                  <a href={`/tienda/${slug}/catalogo`} className="mt-5 inline-flex rounded-full bg-black px-5 py-3 text-xs font-black uppercase text-white">Ir al catálogo</a>
                </div>
              ) : (
                carritoState.map((item) => {
                  const itemId = item.cartId || item.id;
                  const qty = Number(item.cantidad || 1);
                  const price = Number(item.precioUnitario || item.precio || 0);
                  return (
                    <div key={itemId} className="flex gap-4 border-b border-gray-100 py-5">
                      <img src={item.imagenUrl || APICULTURA_BANNER} alt={item.descripcion} className="h-24 w-24 shrink-0 bg-[#F7F7F7] object-contain p-2" />
                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-2 text-sm font-black leading-5 text-black">{item.descripcion}</p>
                        <p className="mt-2 text-sm font-black text-black">{money(price * qty)}</p>
                        <div className="mt-3 flex items-center justify-between gap-3">
                          <div className="flex h-9 items-center bg-[#F5F5F5]">
                            <button type="button" onClick={() => updateQuantity(itemId, qty - 1)} className="h-9 w-9 text-sm font-black">-</button>
                            <span className="h-9 w-9 text-center text-sm font-black leading-9">{qty}</span>
                            <button type="button" onClick={() => updateQuantity(itemId, qty + 1)} className="h-9 w-9 text-sm font-black">+</button>
                          </div>
                          <button type="button" onClick={() => removeItem(itemId)} className="flex h-9 w-9 items-center justify-center rounded-full text-red-500 hover:bg-red-50">
                            <Icon icon="solar:trash-bin-trash-bold" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {!ocultarEnvio && freeDeliveryRemaining > 0 && carritoState.length > 0 && (
              <div className="mx-6 mt-5 bg-[#FFF7CC] p-4 text-xs font-bold leading-5 text-black">
                Te faltan {money(freeDeliveryRemaining)} para acceder al delivery gratis.
              </div>
            )}

            <div className="p-6">
              <div className="space-y-3 text-sm font-bold">
                <div className="flex justify-between text-gray-500"><span>Subtotal</span><span>{money(calcularSubtotal())}</span></div>
                {!ocultarEnvio && (
                  <div className="flex justify-between text-gray-500"><span>Envío</span><span>{money(calcularCostoEnvio())}</span></div>
                )}
                <div className="flex justify-between border-t border-gray-100 pt-5 text-3xl font-black text-black"><span>Total</span><span>{money(ocultarEnvio ? calcularSubtotal() : calcularTotal())}</span></div>
              </div>

              <motion.button type="button" disabled={!canSubmit} onClick={onSubmit} className="mt-6 flex h-14 w-full items-center justify-center gap-2 rounded-full bg-black text-sm font-black uppercase tracking-wide text-white transition-transform hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-50" whileHover={canSubmit ? { scale: 1.02, y: -2 } : undefined} whileTap={canSubmit ? honeyTap : undefined}>
                {enviando ? 'Enviando pedido...' : 'Confirmar pedido'}
                <Icon icon="solar:alt-arrow-right-bold" />
              </motion.button>

              <div className="mt-5 grid grid-cols-2 gap-2 text-center text-[11px] font-black uppercase tracking-wide text-gray-500">
                <span className="bg-[#F7F7F7] px-2 py-3">Pedido seguro</span>
                <span className="bg-[#F7F7F7] px-2 py-3">Datos protegidos</span>
              </div>
            </div>
          </motion.aside>
        </div>
      </motion.main>

      <motion.section initial="hidden" whileInView="show" viewport={honeyViewport} variants={honeySection} className="bg-[#FFD72E] px-5 py-12 text-center" style={honeyPattern}>
        <h2 className="text-3xl font-black text-black">{diseno?.apiculturaCheckoutThankTitle || 'Gracias por comprar en nuestra tienda'}</h2>
        <p className="mx-auto mt-3 max-w-2xl text-sm font-semibold leading-6 text-black/70">
          {diseno?.apiculturaCheckoutThankText || 'Recibirás el código de seguimiento al confirmar tu pedido.'}
        </p>
      </motion.section>

      <ApiculturaFooter tienda={tienda} slug={slug} diseno={diseno} cp={cp} categories={[]} />

      {pedidoCreado && (
        <PaymentConfirmationModal
          isOpen={showPaymentModal}
          onClose={() => {
            setShowPaymentModal(false);
            window.location.href = `/tienda/${slug}/seguimiento?codigo=${pedidoCreado.codigoSeguimiento}`;
          }}
          orderData={{
            id: pedidoCreado.id,
            codigoSeguimiento: pedidoCreado.codigoSeguimiento,
            total: pedidoCreado.total || calcularTotal(),
            medioPago: formData.medioPago,
            tipoEntrega: formData.tipoEntrega,
            clienteNombre: formData.clienteNombre,
          }}
          paymentConfig={configPago}
          storeSlug={slug}
        />
      )}

      <ConfirmOrderModal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={enviarPedido}
        total={calcularTotal()}
        loading={enviando}
        tiendaColor={cp}
      />
    </motion.div>
  );
}
