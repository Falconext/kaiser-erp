import { Icon } from '@iconify/react';
import { motion, AnimatePresence } from 'framer-motion';
import { buildStorePurchaseWhatsappUrl, normalizeStoreWhatsapp } from '@/utils/storeWhatsapp';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  carrito: any[];
  tienda: any;
  actualizarCantidad: (id: number | string, cantidad: number) => void;
  onCheckout: () => void;
  slug?: string;
  setCarrito?: (carrito: any[]) => void;
  cp: string;
}

export default function GadgetsCartModal({
  isOpen, onClose, carrito, tienda, actualizarCantidad, onCheckout, slug, setCarrito, cp,
}: Props) {
  const subtotal = carrito.reduce((sum, item) => sum + Number(item.precioUnitario) * Number(item.cantidad || 1), 0);

  const whatsappNumero = tienda?.whatsappTienda ?? tienda?.diseno?.whatsappTienda;
  const puedeCotizarWhatsapp = !!normalizeStoreWhatsapp(whatsappNumero);

  const cotizarPorWhatsApp = () => {
    if (!carrito.length) return;
    const nombreTienda = tienda?.nombreComercial || tienda?.nombre || 'Tienda';
    const lineas = carrito
      .map((item) => `• ${Number(item.cantidad || 1)}x ${item.descripcion} — S/ ${(Number(item.precioUnitario || 0) * Number(item.cantidad || 1)).toFixed(2)}`)
      .join('\n');
    const mensaje =
      `*SOLICITUD DE COTIZACIÓN — ${nombreTienda}*\n\n` +
      `${lineas}\n\n` +
      `*Total estimado: S/ ${subtotal.toFixed(2)}*\n\n` +
      `Hola, quisiera cotizar estos productos. ¿Me confirman precio y disponibilidad?`;
    const url = buildStorePurchaseWhatsappUrl(whatsappNumero, mensaje);
    if (url) window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[999999] flex justify-end">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/35" 
            onClick={onClose} 
          />

          <motion.div 
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col border-l border-gray-100"
          >

            {/* Header */}
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-b from-white to-[#FBFBFB]">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.14em] text-gray-500">Tu bolsa</p>
            <p className="text-base font-bold text-[#1A1A1A] mt-0.5">
              {carrito.length} producto{carrito.length !== 1 ? 's' : ''}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 hover:bg-gray-100 rounded-full transition-colors flex items-center justify-center"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M1 1L11 11M11 1L1 11" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {carrito.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
              <div className="w-20 h-20 rounded-2xl flex items-center justify-center" style={{ background: `${cp}15` }}>
                <Icon icon="solar:bag-linear" className="w-10 h-10" style={{ color: cp }} />
              </div>
              <p className="text-gray-500 text-sm">Tu bolsa está vacía</p>
              <button onClick={onClose} className="text-sm font-semibold hover:opacity-80 transition-opacity" style={{ color: cp }}>
                Continuar comprando
              </button>
            </div>
          ) : (
            <div className="space-y-2.5">
              <AnimatePresence initial={false}>
                {carrito.map((item) => (
                  <motion.div 
                    layout
                    initial={{ opacity: 0, x: 50, height: 0, scale: 0.9 }}
                    animate={{ opacity: 1, x: 0, height: 'auto', scale: 1 }}
                    exit={{ opacity: 0, x: -50, height: 0, scale: 0.9, overflow: 'hidden' }}
                    transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                    key={item.id} 
                    className="flex gap-3 p-3 rounded-2xl border border-gray-100 bg-white"
                  >
                    {/* Image */}
                    <div className="relative w-[68px] h-[68px] bg-[#FAFBFC] rounded-xl flex-shrink-0 overflow-hidden border border-gray-100">
                      <button
                        onClick={() => {
                          if (setCarrito) setCarrito(carrito.filter(i => i.id !== item.id));
                          else actualizarCantidad(item.id, 0);
                        }}
                        className="absolute -top-1.5 -left-1.5 bg-white rounded-full p-0.5 shadow-sm border border-gray-200 hover:bg-red-50 hover:border-red-200 text-gray-500 hover:text-red-600 z-10 transition-all"
                      >
                        <Icon icon="mdi:close" width={12} />
                      </button>
                      {item.imagenUrl
                        ? <img src={item.imagenUrl} className="w-full h-full object-contain p-1" alt={item.descripcion} />
                        : <div className="w-full h-full flex items-center justify-center"><Icon icon="mdi:image-off" className="text-gray-300 w-8 h-8" /></div>
                      }
                    </div>

                    {/* Info */}
                    <div className="flex-1 flex flex-col justify-between min-w-0">
                      <h3 className="text-[13px] font-bold text-[#1A1A1A] line-clamp-2 leading-tight mb-0.5 uppercase">
                        {item.descripcion}
                      </h3>
                      {item.modificadores?.length > 0 && item.modificadores[0]?.opcionNombre && (
                        <p className="text-xs text-gray-500 line-clamp-1">
                          {item.modificadores.filter((m: any) => m?.opcionNombre).map((m: any) => m.opcionNombre).join(', ')}
                        </p>
                      )}
                      <div className="flex items-center justify-between mt-1">
                        <div className="flex items-center gap-1.5 bg-[#F5F6F8] rounded-lg px-1.5 py-1">
                          <button
                            onClick={() => actualizarCantidad(item.id, (item.cantidad || 1) - 1)}
                            className="w-6 h-6 rounded-md border border-gray-200 bg-white flex items-center justify-center hover:bg-gray-50 transition-colors text-gray-600"
                          >
                            <Icon icon="mdi:minus" width={12} />
                          </button>
                          <span className="text-xs w-5 text-center font-bold text-gray-900">{item.cantidad || 1}</span>
                          <button
                            onClick={() => actualizarCantidad(item.id, (item.cantidad || 1) + 1)}
                            className="w-6 h-6 rounded-md border border-gray-200 bg-white flex items-center justify-center hover:bg-gray-50 transition-colors text-gray-600"
                          >
                            <Icon icon="mdi:plus" width={12} />
                          </button>
                        </div>
                        <span className="text-sm font-black text-[#1A1A1A] flex items-baseline gap-1.5">
                          S/ {(Number(item.precioUnitario) * (item.cantidad || 1)).toFixed(2)}
                          {item.enOferta && Number(item.precioRegular) > Number(item.precioUnitario) && (
                            <span className="text-[11px] font-medium text-gray-400 line-through">S/ {(Number(item.precioRegular) * (item.cantidad || 1)).toFixed(2)}</span>
                          )}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Footer */}
        {carrito.length > 0 && (
          <div className="p-4 border-t border-gray-100 bg-white">
            <div className="rounded-2xl border border-gray-100 bg-[#FAFBFC] p-4 mb-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600 font-medium text-sm">Subtotal</span>
                <span className="font-black text-2xl text-[#1A1A1A] leading-none">S/ {subtotal.toFixed(2)}</span>
              </div>
            </div>
            <button
              onClick={onCheckout}
              className="w-full py-3 font-bold text-sm text-white rounded-xl flex items-center justify-center gap-2 transition-all hover:opacity-90 shadow-sm group"
              style={{ background: cp }}
            >
              Ir a Pagar
              <Icon icon="solar:arrow-right-linear" className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
            {puedeCotizarWhatsapp && (
              <button
                onClick={cotizarPorWhatsApp}
                className="mt-2.5 w-full py-3 font-bold text-sm rounded-xl flex items-center justify-center gap-2 border border-emerald-200 bg-emerald-50 text-emerald-700 transition-colors hover:bg-emerald-100"
              >
                <Icon icon="ic:baseline-whatsapp" width={18} className="text-emerald-600" />
                Cotizar por WhatsApp
              </button>
            )}
            <p className="text-center text-[11px] text-gray-500 mt-2.5">
              Impuestos y envío calculados al finalizar
            </p>
          </div>
        )}
      </motion.div>
      </div>
      )}
    </AnimatePresence>
  );
}
