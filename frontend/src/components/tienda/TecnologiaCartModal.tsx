import React from 'react';
import { Icon } from '@iconify/react';
import { motion, AnimatePresence } from 'framer-motion';
import { buildStorePurchaseWhatsappUrl } from '@/utils/storeWhatsapp';

interface TecnologiaCartModalProps {
  isOpen: boolean;
  onClose: () => void;
  carrito: any[];
  setCarrito: (c: any[]) => void;
  actualizarCantidad: (id: number | string, cantidad: number) => void;
  onCheckout: () => void;
  cp: string;
  tienda?: any;
}

export default function TecnologiaCartModal({
  isOpen,
  onClose,
  carrito,
  setCarrito,
  actualizarCantidad,
  onCheckout,
  cp,
  tienda,
}: TecnologiaCartModalProps) {
  const total = carrito.reduce((acc, curr) => acc + Number(curr.precioUnitario) * curr.cantidad, 0);

  const cotizarPorWhatsApp = () => {
    if (!carrito.length) return;
    const nombreTienda = tienda?.nombreComercial || tienda?.nombre || 'Tienda';
    const lineas = carrito
      .map((item) => `• ${item.cantidad}x ${item.descripcion} — S/ ${(Number(item.precioUnitario) * Number(item.cantidad || 1)).toFixed(2)}`)
      .join('\n');
    const mensaje =
      `*SOLICITUD DE COTIZACIÓN — ${nombreTienda}*\n\n` +
      `${lineas}\n\n` +
      `*Total estimado: S/ ${total.toFixed(2)}*\n\n` +
      `Hola, quisiera cotizar estos productos. ¿Me confirman precio y disponibilidad?`;
    const url = buildStorePurchaseWhatsappUrl(tienda?.whatsappTienda ?? tienda?.diseno?.whatsappTienda, mensaje);
    if (url) window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-y-0 right-0 w-full max-w-md bg-white text-gray-900 shadow-2xl z-50 flex flex-col border-l border-gray-200"
          >
            {/* Header */}
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center border border-gray-100" style={{ backgroundColor: `${cp}15` }}>
                   <Icon icon="solar:bag-3-bold" width={20} style={{ color: cp }} />
                </div>
                <div>
                  <h2 className="text-xl font-black tracking-tight text-gray-900">Mi Carrito</h2>
                  <p className="text-xs text-gray-500 font-medium">{carrito.length} {carrito.length === 1 ? 'artículo' : 'artículos'}</p>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-900 hover:bg-gray-100 transition-colors"
              >
                <Icon icon="solar:close-circle-bold" width={24} />
              </button>
            </div>

            {/* Items List */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 no-scrollbar">
              {carrito.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center opacity-60">
                  <Icon icon="solar:cart-large-minimalistic-linear" width={64} className="mb-4 text-gray-300" />
                  <p className="text-lg font-bold text-gray-700">Tu carrito está vacío</p>
                  <p className="text-sm mt-1 text-gray-500">Agrega algunos productos para comenzar.</p>
                </div>
              ) : (
                carrito.map((item) => (
                  <div key={item.cartId || item.id} className="flex gap-4 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm relative group hover:border-gray-200 hover:shadow-md transition-all">
                    <button 
                      onClick={() => actualizarCantidad(item.cartId || item.id, 0)}
                      className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-50 text-red-500 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10 shadow-sm border border-red-100 hover:bg-red-500 hover:text-white"
                    >
                      <Icon icon="solar:trash-bin-trash-bold" width={14} />
                    </button>
                    
                    <div className="w-20 h-20 rounded-xl bg-gray-50 overflow-hidden flex-shrink-0 flex items-center justify-center border border-gray-100 p-1">
                      {item.imagenUrl ? (
                        <img src={item.imagenUrl} alt={item.descripcion} className="w-full h-full object-contain mix-blend-multiply" />
                      ) : (
                        <Icon icon="solar:box-linear" className="text-gray-300 w-8 h-8" />
                      )}
                    </div>
                    
                    <div className="flex-1 flex flex-col justify-between">
                      <h3 className="text-sm font-bold leading-tight line-clamp-2 text-gray-800">
                        {item.descripcion}
                      </h3>
                      
                      {item.partNumber && (
                         <p className="text-[10px] text-gray-400 font-mono mt-1">PN: {item.partNumber}</p>
                      )}

                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-baseline gap-2">
                          <span className="font-black text-gray-900 text-lg">S/ {Number(item.precioUnitario).toFixed(2)}</span>
                          {item.enOferta && Number(item.precioRegular) > Number(item.precioUnitario) && (
                            <span className="text-xs font-bold text-gray-400 line-through">S/ {Number(item.precioRegular).toFixed(2)}</span>
                          )}
                        </div>

                        {/* Quantity Controls */}
                        <div className="flex items-center bg-gray-50 rounded-lg border border-gray-200 overflow-hidden shadow-sm">
                          <button 
                            onClick={() => actualizarCantidad(item.cartId || item.id, item.cantidad - 1)}
                            className="w-8 h-8 flex items-center justify-center text-lg font-black text-gray-600 hover:text-gray-900 hover:bg-gray-200 transition-colors"
                          >
                            -
                          </button>
                          <span className="w-8 text-center text-sm font-black text-gray-900 bg-white border-x border-gray-200 h-8 flex items-center justify-center">
                            {item.cantidad}
                          </span>
                          <button 
                            onClick={() => actualizarCantidad(item.cartId || item.id, item.cantidad + 1)}
                            className="w-8 h-8 flex items-center justify-center text-lg font-black text-gray-600 hover:text-gray-900 hover:bg-gray-200 transition-colors"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer / Summary */}
            {carrito.length > 0 && (
              <div className="p-6 bg-white border-t border-gray-100 shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.05)]">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-gray-500 font-medium">Subtotal</span>
                  <span className="text-2xl font-black text-gray-900">S/ {total.toFixed(2)}</span>
                </div>
                <button
                  onClick={() => {
                    onClose();
                    onCheckout();
                  }}
                  className="w-full py-4 rounded-xl flex items-center justify-center gap-2 text-white font-black text-lg shadow-lg shadow-black/5 transition-transform hover:scale-[1.02] hover:-translate-y-0.5"
                  style={{ backgroundColor: cp }}
                >
                  Finalizar compra <Icon icon="solar:alt-arrow-right-bold" />
                </button>

                <button
                  onClick={cotizarPorWhatsApp}
                  className="mt-3 w-full py-3.5 rounded-xl flex items-center justify-center gap-2 font-black text-sm border border-gray-200 bg-gray-50 text-gray-700 transition-colors hover:border-gray-300 hover:bg-gray-100 hover:text-gray-900"
                >
                  <Icon icon="ic:baseline-whatsapp" width={20} className="text-[#25D366]" />
                  Cotizar por WhatsApp
                </button>
                <p className="mt-3 text-center text-[11px] text-gray-400 font-medium">
                  Te enviamos la lista de productos para confirmar precio y stock.
                </p>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
