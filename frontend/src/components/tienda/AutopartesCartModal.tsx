import React from 'react';
import { Icon } from '@iconify/react';
import { motion, AnimatePresence } from 'framer-motion';
import { buildStorePurchaseWhatsappUrl, normalizeStoreWhatsapp } from '@/utils/storeWhatsapp';

interface AutopartesCartModalProps {
  isOpen: boolean;
  onClose: () => void;
  carrito: any[];
  setCarrito: (c: any[]) => void;
  actualizarCantidad: (id: number | string, cantidad: number) => void;
  onCheckout: () => void;
  cp: string;
  tienda?: any;
}

export default function AutopartesCartModal({
  isOpen,
  onClose,
  carrito,
  setCarrito,
  actualizarCantidad,
  onCheckout,
  cp,
  tienda,
}: AutopartesCartModalProps) {
  const total = carrito.reduce((acc, curr) => acc + Number(curr.precioUnitario) * curr.cantidad, 0);

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
      `*Total estimado: S/ ${total.toFixed(2)}*\n\n` +
      `Hola, quisiera cotizar estos productos. ¿Me confirman precio y disponibilidad?`;
    const url = buildStorePurchaseWhatsappUrl(whatsappNumero, mensaje);
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
            className="fixed inset-y-0 right-0 w-full max-w-md bg-[#1A1A1A] text-white shadow-2xl z-50 flex flex-col border-l border-gray-800"
          >
            {/* Header */}
            <div className="px-6 py-5 border-b border-gray-800 flex items-center justify-between bg-black">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center bg-gray-900 border border-gray-800">
                   <Icon icon="solar:bag-3-bold" width={20} style={{ color: cp }} />
                </div>
                <div>
                  <h2 className="text-xl font-black tracking-tight">Mi Carrito</h2>
                  <p className="text-xs text-gray-500 font-medium">{carrito.length} {carrito.length === 1 ? 'artículo' : 'artículos'}</p>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-gray-900 flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
              >
                <Icon icon="solar:close-circle-bold" width={24} />
              </button>
            </div>

            {/* Items List */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 no-scrollbar">
              {carrito.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center opacity-50">
                  <Icon icon="solar:cart-large-minimalistic-linear" width={64} className="mb-4" />
                  <p className="text-lg font-bold">Tu carrito está vacío</p>
                  <p className="text-sm mt-1">Agrega repuestos automotrices para comenzar.</p>
                </div>
              ) : (
                carrito.map((item) => (
                  <div key={item.cartId || item.id} className="flex gap-4 bg-black p-4 rounded-xl border border-gray-800 relative group">
                    <button 
                      onClick={() => actualizarCantidad(item.cartId || item.id, 0)}
                      className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10 shadow-lg"
                    >
                      <Icon icon="solar:trash-bin-trash-bold" width={14} />
                    </button>
                    
                    <div className="w-20 h-20 rounded-lg bg-white overflow-hidden flex-shrink-0 flex items-center justify-center border border-gray-200 p-1">
                      {item.imagenUrl ? (
                        <img src={item.imagenUrl} alt={item.descripcion} className="w-full h-full object-contain" />
                      ) : (
                        <Icon icon="solar:box-linear" className="text-gray-300 w-8 h-8" />
                      )}
                    </div>
                    
                    <div className="flex-1 flex flex-col justify-between">
                      <h3 className="text-sm font-bold leading-tight line-clamp-2 text-gray-200">
                        {item.descripcion}
                      </h3>
                      
                      {item.partNumber && (
                         <p className="text-[10px] text-gray-500 font-mono mt-1">PN: {item.partNumber}</p>
                      )}

                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-baseline gap-2">
                          <span className="font-black text-white text-lg">S/ {Number(item.precioUnitario).toFixed(2)}</span>
                          {item.enOferta && Number(item.precioRegular) > Number(item.precioUnitario) && (
                            <span className="text-xs font-bold text-gray-500 line-through">S/ {Number(item.precioRegular).toFixed(2)}</span>
                          )}
                        </div>

                        {/* Quantity Controls */}
                        <div className="flex items-center bg-gray-900 rounded-lg border border-gray-800 overflow-hidden">
                          <button 
                            onClick={() => actualizarCantidad(item.cartId || item.id, item.cantidad - 1)}
                            className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
                          >
                            <Icon icon="solar:minus-linear" width={16} />
                          </button>
                          <span className="w-8 text-center text-sm font-bold text-white">
                            {item.cantidad}
                          </span>
                          <button 
                            onClick={() => actualizarCantidad(item.cartId || item.id, item.cantidad + 1)}
                            className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
                          >
                            <Icon icon="solar:add-linear" width={16} />
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
              <div className="p-6 bg-black border-t border-gray-800">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-gray-400 font-medium">Subtotal</span>
                  <span className="text-2xl font-black text-white">S/ {total.toFixed(2)}</span>
                </div>
                <button
                  onClick={() => {
                    onClose();
                    onCheckout();
                  }}
                  className="w-full py-4 rounded-xl flex items-center justify-center gap-2 text-white font-black text-lg transition-transform hover:scale-[1.02]"
                  style={{ backgroundColor: cp }}
                >
                  Finalizar compra <Icon icon="solar:alt-arrow-right-bold" />
                </button>
                {puedeCotizarWhatsapp && (
                  <button
                    onClick={cotizarPorWhatsApp}
                    className="mt-3 w-full py-3.5 rounded-xl flex items-center justify-center gap-2 font-black text-base border border-gray-700 bg-gray-900 text-gray-100 transition-colors hover:border-gray-500 hover:bg-gray-800"
                  >
                    <Icon icon="ic:baseline-whatsapp" width={20} className="text-emerald-400" />
                    Cotizar por WhatsApp
                  </button>
                )}
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
