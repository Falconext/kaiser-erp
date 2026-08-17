import React from 'react';
import { Icon } from '@iconify/react';
import { motion, AnimatePresence } from 'framer-motion';
import { mayeCard, mayeOverlay, mayeSheet, mayeStagger } from '@/lib/motion/maye';
import { buildStorePurchaseWhatsappUrl } from '@/utils/storeWhatsapp';

interface MayeCartModalProps {
  isOpen: boolean;
  onClose: () => void;
  carrito: any[];
  setCarrito: (c: any[]) => void;
  actualizarCantidad: (id: number | string, cantidad: number) => void;
  onCheckout: () => void;
  cp: string;
  tienda?: any;
}

export default function MayeCartModal({
  isOpen,
  onClose,
  carrito,
  actualizarCantidad,
  onCheckout,
  cp,
  tienda,
}: MayeCartModalProps) {
  const total = carrito.reduce((acc, curr) => acc + Number(curr.precioUnitario || 0) * Number(curr.cantidad || 1), 0);
  const itemCount = carrito.reduce((acc, curr) => acc + Number(curr.cantidad || 1), 0);
  const getCartId = (item: any) => item.cartId || item.productoId || item.id;
  const money = (value: number) => `S/ ${value.toFixed(2)}`;

  const cotizarPorWhatsApp = () => {
    if (!carrito.length) return;
    const nombreTienda = tienda?.nombreComercial || tienda?.nombre || 'Tienda';
    const lineas = carrito
      .map((item) => `• ${Number(item.cantidad || 1)}x ${item.descripcion} — ${money(Number(item.precioUnitario || 0) * Number(item.cantidad || 1))}`)
      .join('\n');
    const mensaje =
      `*SOLICITUD DE COTIZACIÓN — ${nombreTienda}*\n\n` +
      `${lineas}\n\n` +
      `*Total estimado: ${money(total)}*\n\n` +
      `Hola, quisiera cotizar estos productos. ¿Me confirman precio y disponibilidad?`;
    const url = buildStorePurchaseWhatsappUrl(tienda?.whatsappTienda ?? tienda?.diseno?.whatsappTienda, mensaje);
    if (url) window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            variants={mayeOverlay}
            initial="initial"
            animate="animate"
            exit="exit"
            onClick={onClose}
            className="fixed inset-0 z-[99980] bg-black/55 backdrop-blur-md"
          />
          <motion.div
            variants={mayeSheet}
            initial="initial"
            animate="animate"
            exit="exit"
            className="fixed inset-y-0 right-0 z-[99990] flex w-full max-w-[520px] flex-col overflow-hidden border-l border-slate-200 bg-[#F4F7FB] text-slate-950 shadow-2xl"
          >
            <div className="bg-[#070A0F] px-5 py-5 text-white md:px-6">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5">
                  <Icon icon="solar:bag-3-bold" width={22} style={{ color: cp }} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-black uppercase tracking-[0.28em] text-white/45">Checkout tech</p>
                  <h2 className="mt-0.5 text-2xl font-black tracking-tight">Mi carrito</h2>
                  <p className="mt-0.5 text-xs font-semibold text-white/55">
                    {itemCount} {itemCount === 1 ? 'producto seleccionado' : 'productos seleccionados'}
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-white/10 text-white/60 transition-colors hover:bg-white/15 hover:text-white"
                  aria-label="Cerrar carrito"
                >
                  <Icon icon="solar:close-circle-bold" width={24} />
                </button>
              </div>

              {carrito.length > 0 && (
                <motion.div className="mt-5 grid grid-cols-3 gap-2" variants={mayeStagger} initial="initial" animate="animate">
                  {[
                    { icon: 'solar:shield-check-bold', label: 'Compra segura' },
                    { icon: 'solar:delivery-bold', label: 'Entrega flexible' },
                    { icon: 'solar:cpu-bold', label: 'Soporte tech' },
                  ].map(item => (
                    <motion.div key={item.label} className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2.5" variants={mayeCard}>
                      <Icon icon={item.icon} width={17} style={{ color: cp }} />
                      <p className="mt-1 text-[10px] font-black leading-tight text-white/70">{item.label}</p>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-5 md:px-5">
              {carrito.length === 0 ? (
                <div className="flex h-full min-h-[420px] flex-col items-center justify-center rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
                  <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-slate-100">
                    <Icon icon="solar:cart-large-minimalistic-linear" width={42} className="text-slate-400" />
                  </div>
                  <p className="mt-5 text-xl font-black text-slate-950">Tu carrito está vacío</p>
                  <p className="mt-2 max-w-xs text-sm leading-relaxed text-slate-500">
                    Agrega laptops, componentes o accesorios para preparar tu compra.
                  </p>
                  <button
                    onClick={onClose}
                    className="mt-6 rounded-2xl px-5 py-3 text-sm font-black text-white shadow-lg transition-transform hover:scale-[1.02]"
                    style={{ backgroundColor: cp }}
                  >
                    Seguir comprando
                  </button>
                </div>
              ) : (
                <motion.div className="space-y-3" variants={mayeStagger} initial="initial" animate="animate">
                  {carrito.map((item) => {
                    const id = getCartId(item);
                    const price = Number(item.precioUnitario || 0);
                    const qty = Number(item.cantidad || 1);
                    const regular = Number(item.precioRegular || item.precioOriginal || 0);
                    const hasDiscount = regular > price;
                    return (
                      <motion.div key={id} className="group rounded-3xl border border-slate-200 bg-white p-3 shadow-sm transition-all hover:border-slate-300 hover:shadow-md" variants={mayeCard} layout>
                        <div className="flex gap-3">
                          <div className="flex h-24 w-24 flex-shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-slate-100 bg-slate-50 p-2">
                            {item.imagenUrl ? (
                              <img src={item.imagenUrl} alt={item.descripcion} className="h-full w-full object-contain mix-blend-multiply" />
                            ) : (
                              <Icon icon="solar:box-linear" className="h-9 w-9 text-slate-300" />
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-start gap-2">
                              <div className="min-w-0 flex-1">
                                <h3 className="line-clamp-2 text-sm font-black leading-snug text-slate-950">
                                  {item.descripcion}
                                </h3>
                                {(item.partNumber || item.codigo) && (
                                  <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                    SKU {item.partNumber || item.codigo}
                                  </p>
                                )}
                              </div>
                              <button
                                onClick={() => actualizarCantidad(id, 0)}
                                className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-slate-300 transition-colors"
                                onMouseEnter={e => {
                                  e.currentTarget.style.backgroundColor = `${cp}12`;
                                  e.currentTarget.style.color = cp;
                                }}
                                onMouseLeave={e => {
                                  e.currentTarget.style.backgroundColor = '';
                                  e.currentTarget.style.color = '';
                                }}
                                aria-label="Eliminar producto"
                              >
                                <Icon icon="solar:trash-bin-trash-bold" width={16} />
                              </button>
                            </div>

                            <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
                              <div>
                                <div className="flex items-baseline gap-2">
                                  <span className="text-xl font-black text-slate-950">{money(price)}</span>
                                  {hasDiscount && (
                                    <span className="text-xs font-bold text-slate-400 line-through">{money(regular)}</span>
                                  )}
                                </div>
                                <p className="mt-0.5 text-[11px] font-semibold text-slate-400">
                                  Total linea: <span className="text-slate-700">{money(price * qty)}</span>
                                </p>
                              </div>

                              <div className="flex h-10 items-center overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                                <button
                                  onClick={() => actualizarCantidad(id, qty - 1)}
                                  className="flex h-full w-10 items-center justify-center text-slate-500 transition-colors hover:bg-white hover:text-slate-950"
                                  aria-label="Reducir cantidad"
                                >
                                  <Icon icon="solar:minus-linear" width={16} />
                                </button>
                                <span className="w-10 text-center text-sm font-black text-slate-950">{qty}</span>
                                <button
                                  onClick={() => actualizarCantidad(id, qty + 1)}
                                  className="flex h-full w-10 items-center justify-center text-slate-500 transition-colors hover:bg-white hover:text-slate-950"
                                  aria-label="Aumentar cantidad"
                                >
                                  <Icon icon="solar:add-linear" width={16} />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </motion.div>
              )}
            </div>

            {carrito.length > 0 && (
              <div className="border-t border-slate-200 bg-white px-5 pb-5 pt-4 shadow-[0_-12px_30px_rgba(15,23,42,0.06)]">
                <div className="mb-4 rounded-3xl border border-slate-100 bg-slate-50 p-4">
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span className="font-bold text-slate-500">Subtotal</span>
                    <span className="font-black text-slate-950">{money(total)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-bold text-slate-500">Envio</span>
                    <span className="font-bold text-slate-400">Se calcula en checkout</span>
                  </div>
                  <div className="mt-4 flex items-end justify-between border-t border-slate-200 pt-4">
                    <span className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Total estimado</span>
                    <span className="text-3xl font-black text-slate-950">{money(total)}</span>
                  </div>
                </div>

                <button
                  onClick={() => {
                    onClose();
                    onCheckout();
                  }}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-4 text-base font-black text-white shadow-lg transition-transform hover:scale-[1.01] active:scale-[0.99]"
                  style={{ backgroundColor: cp }}
                >
                  Ir al checkout
                  <Icon icon="solar:alt-arrow-right-bold" width={18} />
                </button>
                <button
                  onClick={cotizarPorWhatsApp}
                  className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-3.5 text-sm font-black text-emerald-700 transition-colors hover:bg-emerald-100"
                >
                  <Icon icon="ic:baseline-whatsapp" width={19} className="text-emerald-600" />
                  Cotizar por WhatsApp
                </button>
                <button
                  onClick={onClose}
                  className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-950"
                >
                  <Icon icon="solar:shop-bold" width={17} />
                  Seguir comprando
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
