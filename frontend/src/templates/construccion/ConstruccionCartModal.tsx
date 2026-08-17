import { Icon } from '@iconify/react';
import { AnimatePresence, motion } from 'framer-motion';
import { buildStorePurchaseWhatsappUrl } from '@/utils/storeWhatsapp';

interface ConstruccionCartModalProps {
  isOpen: boolean;
  onClose: () => void;
  carrito: any[];
  setCarrito: (c: any[]) => void;
  actualizarCantidad: (id: number | string, cantidad: number) => void;
  onCheckout: () => void;
  cp: string;
  tienda?: any;
}

const money = (value: number) => `S/ ${Number(value || 0).toFixed(2)}`;
const editable = (value: any, fallback: string) => String(value || '').trim() || fallback;

export default function ConstruccionCartModal({
  isOpen,
  onClose,
  carrito,
  actualizarCantidad,
  onCheckout,
  cp,
  tienda,
}: ConstruccionCartModalProps) {
  const total = carrito.reduce((acc, item) => acc + Number(item.precioUnitario || 0) * Number(item.cantidad || 1), 0);
  const storeName = tienda?.nombreComercial || tienda?.nombre || tienda?.razonSocial || 'Ferretería';
  const diseno = tienda?.diseno || {};

  const cotizarPorWhatsApp = () => {
    if (!carrito.length) return;
    const detail = carrito
      .map((item) => `• ${Number(item.cantidad || 1)} x ${item.descripcion} - ${money(Number(item.precioUnitario || 0) * Number(item.cantidad || 1))}`)
      .join('\n');
    const message = `Hola, quiero cotizar estos productos en ${storeName}:\n\n${detail}\n\nTotal estimado: ${money(total)}\n¿Me confirman stock y tiempo de entrega?`;
    const url = buildStorePurchaseWhatsappUrl(tienda?.whatsappTienda ?? diseno?.whatsappTienda, message);
    if (url) window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.button
            type="button"
            aria-label="Cerrar carrito"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/65 backdrop-blur-[2px]"
          />
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 230 }}
            className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[460px] flex-col bg-white shadow-2xl"
          >
            <header className="bg-[#111111] px-6 py-5 text-white">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.18em]" style={{ color: cp }}>{editable(diseno?.construccionCartEyebrow, 'Carrito de compra')}</p>
                  <h2 className="mt-1 text-2xl font-black leading-tight">{editable(diseno?.construccionCartTitle, 'Mi carrito')}</h2>
                  <p className="mt-1 text-sm font-semibold text-white/55">
                    {carrito.length} {carrito.length === 1 ? 'artículo' : 'artículos'} en {storeName}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="flex h-10 w-10 items-center justify-center rounded-md bg-white/10 text-white transition-colors hover:bg-white/20"
                >
                  <Icon icon="solar:close-circle-bold" width={24} />
                </button>
              </div>
            </header>

            <div className="flex-1 overflow-y-auto bg-[#f5f5f5] px-5 py-5">
              {carrito.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center rounded-md border border-dashed border-gray-300 bg-white px-8 text-center">
                  <span className="flex h-20 w-20 items-center justify-center rounded-full bg-[#111111] text-white">
                    <Icon icon="solar:cart-large-minimalistic-linear" width={42} />
                  </span>
                  <h3 className="mt-6 text-xl font-black text-[#151515]">{editable(diseno?.construccionCartEmptyTitle, 'Tu carrito está vacío')}</h3>
                  <p className="mt-2 text-sm font-semibold leading-6 text-gray-500">{editable(diseno?.construccionCartEmptyText, 'Agrega herramientas, materiales o accesorios para continuar con tu pedido.')}</p>
                  <button type="button" onClick={onClose} className="mt-7 rounded-md px-6 py-3 text-sm font-black text-[#111]" style={{ background: cp }}>
                    {editable(diseno?.construccionCartContinueLabel, 'Seguir comprando')}
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {carrito.map((item) => {
                    const itemId = item.cartId || item.id;
                    const qty = Number(item.cantidad || 1);
                    const price = Number(item.precioUnitario || 0);
                    const regular = Number(item.precioRegular || item.precioOriginal || 0);
                    return (
                      <article key={itemId} className="group relative grid grid-cols-[92px_1fr] gap-4 rounded-md border border-gray-200 bg-white p-4 shadow-sm">
                        <button
                          type="button"
                          onClick={() => actualizarCantidad(itemId, 0)}
                          className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-md bg-gray-100 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500"
                        >
                          <Icon icon="solar:trash-bin-trash-bold" width={16} />
                        </button>
                        <div className="flex h-[92px] items-center justify-center rounded-md border border-gray-100 bg-gray-50 p-2">
                          {item.imagenUrl ? (
                            <img src={item.imagenUrl} alt={item.descripcion} className="h-full w-full object-contain" />
                          ) : (
                            <Icon icon="solar:box-bold-duotone" width={42} className="text-gray-300" />
                          )}
                        </div>
                        <div className="min-w-0 pr-8">
                          <h3 className="line-clamp-2 text-sm font-black leading-snug text-[#151515]">{item.descripcion}</h3>
                          {item.partNumber && <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-gray-400">PN: {item.partNumber}</p>}
                          <div className="mt-3 flex items-center gap-2">
                            <span className="text-lg font-black text-[#151515]">{money(price)}</span>
                            {regular > price && <span className="text-xs font-bold text-gray-400 line-through">{money(regular)}</span>}
                          </div>
                          <div className="mt-3 flex items-center justify-between gap-3">
                            <div className="flex h-10 overflow-hidden rounded-md border border-gray-200 bg-white">
                              <button type="button" onClick={() => actualizarCantidad(itemId, qty - 1)} className="flex w-10 items-center justify-center text-lg font-black text-gray-600 hover:bg-gray-100">-</button>
                              <span className="flex w-11 items-center justify-center border-x border-gray-200 text-sm font-black text-[#111]">{qty}</span>
                              <button type="button" onClick={() => actualizarCantidad(itemId, qty + 1)} className="flex w-10 items-center justify-center text-lg font-black text-gray-600 hover:bg-gray-100">+</button>
                            </div>
                            <span className="text-sm font-black text-gray-900">{money(price * qty)}</span>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </div>

            {carrito.length > 0 && (
              <footer className="border-t border-gray-200 bg-white px-6 py-5">
                <div className="mb-4 space-y-2">
                  <div className="flex items-center justify-between text-sm font-semibold text-gray-500">
                    <span>Subtotal</span>
                    <span className="text-lg font-black text-[#151515]">{money(total)}</span>
                  </div>
                  <p className="rounded-md bg-gray-50 px-3 py-2 text-[11px] font-semibold text-gray-500">
                    {editable(diseno?.construccionCartShippingNote, 'El costo de envío se calcula o coordina en el checkout según la configuración de la tienda.')}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onCheckout();
                  }}
                  className="flex w-full items-center justify-center gap-2 rounded-md px-5 py-4 text-sm font-black uppercase tracking-wide text-[#111] shadow-lg shadow-black/10 transition-transform hover:scale-[1.01]"
                  style={{ background: cp }}
                >
                  {editable(diseno?.construccionCartCheckoutLabel, 'Ir a pagar')} <Icon icon="solar:arrow-right-bold" width={18} />
                </button>
                <button
                  type="button"
                  onClick={cotizarPorWhatsApp}
                  className="mt-3 flex w-full items-center justify-center gap-2 rounded-md border border-gray-200 bg-white px-5 py-3 text-sm font-black text-gray-700 transition-colors hover:bg-gray-50"
                >
                  <Icon icon="ic:baseline-whatsapp" width={20} className="text-[#25D366]" />
                  {editable(diseno?.construccionCartWhatsappLabel, 'Cotizar por WhatsApp')}
                </button>
              </footer>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
