import { Icon } from '@iconify/react';
import { buildStorePurchaseWhatsappUrl, normalizeStoreWhatsapp } from '@/utils/storeWhatsapp';

interface UrbanoCartModalProps {
    isOpen: boolean;
    onClose: () => void;
    carrito: any[];
    tienda?: any;
    actualizarCantidad: (id: number | string, cantidad: number) => void;
    onCheckout: () => void;
    slug?: string;
    cp?: string;
    setCarrito?: (carrito: any[]) => void;
}

export default function UrbanoCartModal({
    isOpen,
    onClose,
    carrito,
    tienda,
    actualizarCantidad,
    onCheckout,
    setCarrito,
}: UrbanoCartModalProps) {
    if (!isOpen) return null;

    const whatsappNumero = tienda?.whatsappTienda ?? tienda?.diseno?.whatsappTienda;
    const tieneWhatsapp = !!normalizeStoreWhatsapp(whatsappNumero);

    const calcularSubtotal = () =>
        carrito.reduce((sum, item) => sum + Number(item.precioUnitario) * Number(item.cantidad || 1), 0);

    const cotizarPorWhatsApp = () => {
        if (!carrito.length) return;
        const nombreTienda = tienda?.nombreComercial || tienda?.nombre || 'Tienda';
        const lineas = carrito
            .map((item) => `• ${Number(item.cantidad || 1)}x ${item.descripcion} — S/ ${(Number(item.precioUnitario || 0) * Number(item.cantidad || 1)).toFixed(2)}`)
            .join('\n');
        const mensaje =
            `*SOLICITUD DE COTIZACIÓN — ${nombreTienda}*\n\n` +
            `${lineas}\n\n` +
            `*Total estimado: S/ ${calcularSubtotal().toFixed(2)}*\n\n` +
            `Hola, quisiera cotizar estos productos. ¿Me confirman precio y disponibilidad?`;
        const url = buildStorePurchaseWhatsappUrl(whatsappNumero, mensaje);
        if (url) window.open(url, '_blank', 'noopener,noreferrer');
    };

    const eliminarItem = (item: any) => {
        // Always route through actualizarCantidad so localStorage is updated too.
        // Using setCarrito directly skips the localStorage write, causing deleted items
        // to re-appear on the next addToCart (which re-reads from localStorage).
        actualizarCantidad(item.id, 0);
    };

    return (
        <div className="fixed inset-0 z-[999999] flex justify-end" style={{ fontFamily: '"Inter", sans-serif' }}>
            <div className="absolute inset-0 bg-black/50 transition-opacity" onClick={onClose} />

            <div className="relative w-full max-w-[420px] bg-white h-full shadow-2xl flex flex-col border-l-2 border-black animate-in slide-in-from-right duration-300">

                {/* Header */}
                <div className="px-6 py-5 border-b-2 border-black flex items-center justify-between">
                    <h2
                        className="text-xl font-black tracking-tighter uppercase text-black"
                        style={{ fontFamily: '"Impact", "Arial Black", sans-serif' }}
                    >
                        Tu Bolsa
                        <span className="ml-2 text-sm font-bold align-middle text-gray-400">({carrito.length})</span>
                    </h2>
                    <button
                        onClick={onClose}
                        className="w-9 h-9 border-2 border-black flex items-center justify-center hover:bg-black hover:text-white transition-colors"
                    >
                        <Icon icon="mdi:close" width={18} />
                    </button>
                </div>

                {/* Products List */}
                <div className="flex-1 overflow-y-auto px-6 py-6">
                    {carrito.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-center gap-4">
                            <Icon icon="solar:bag-3-linear" className="w-16 h-16 text-gray-300" />
                            <h3 className="text-base font-black uppercase tracking-tighter text-black" style={{ fontFamily: '"Impact", "Arial Black", sans-serif' }}>
                                Tu bolsa está vacía
                            </h3>
                            <button
                                onClick={onClose}
                                className="mt-2 border-2 border-black px-6 py-3 text-[11px] font-bold tracking-[0.15em] uppercase hover:bg-black hover:text-white transition-colors"
                            >
                                Seguir comprando
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {carrito.map((item) => (
                                <div key={item.id} className="flex gap-4">
                                    {/* Product Image */}
                                    <div className="relative w-[88px] h-[110px] bg-[#F4F5F6] flex-shrink-0 overflow-hidden border border-gray-200">
                                        {item.imagenUrl ? (
                                            <img src={item.imagenUrl} className="w-full h-full object-cover" alt={item.descripcion} />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center">
                                                <Icon icon="solar:box-linear" className="text-gray-300 w-8 h-8" />
                                            </div>
                                        )}
                                    </div>

                                    {/* Product Info */}
                                    <div className="flex-1 flex flex-col min-w-0">
                                        <div className="flex justify-between items-start mb-1">
                                            <h3 className="text-[13px] font-bold uppercase text-black line-clamp-2 leading-snug pr-3">
                                                {item.descripcion}
                                            </h3>
                                            <button
                                                onClick={() => eliminarItem(item)}
                                                className="text-gray-300 hover:text-black transition-colors mt-0.5"
                                            >
                                                <Icon icon="solar:trash-bin-trash-linear" width={16} />
                                            </button>
                                        </div>

                                        <p className="text-[12px] font-bold text-gray-500 mb-auto flex items-baseline gap-2">
                                            <span className={item.enOferta ? 'text-gray-900' : ''}>S/ {Number(item.precioUnitario).toFixed(2)}</span>
                                            {item.enOferta && Number(item.precioRegular) > Number(item.precioUnitario) && (
                                                <span className="text-[10px] font-medium text-gray-400 line-through">S/ {Number(item.precioRegular).toFixed(2)}</span>
                                            )}
                                        </p>

                                        {item.modificadores && item.modificadores.length > 0 && item.modificadores[0]?.opcionNombre && (
                                            <p className="text-[10px] text-gray-400 mb-2 uppercase tracking-widest">
                                                {item.modificadores.filter((m: any) => m && m.opcionNombre).map((m: any) => m.opcionNombre).join(' / ')}
                                            </p>
                                        )}

                                        {/* Quantity Controls */}
                                        <div className="flex items-center border-2 border-black w-fit mt-2">
                                            <button
                                                onClick={() => actualizarCantidad(item.id!, Math.max(1, (item.cantidad || 1) - 1))}
                                                className="w-7 h-7 flex items-center justify-center hover:bg-black hover:text-white transition-colors"
                                            >
                                                <Icon icon="mdi:minus" width={13} />
                                            </button>
                                            <span className="text-xs w-7 text-center font-bold text-black">{item.cantidad || 1}</span>
                                            <button
                                                onClick={() => actualizarCantidad(item.id!, (item.cantidad || 1) + 1)}
                                                className="w-7 h-7 flex items-center justify-center hover:bg-black hover:text-white transition-colors"
                                            >
                                                <Icon icon="mdi:plus" width={13} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                {carrito.length > 0 && (
                    <div className="p-6 border-t-2 border-black">
                        <div className="flex justify-between items-baseline mb-5">
                            <span className="text-[11px] font-bold tracking-[0.2em] uppercase text-gray-500">Subtotal</span>
                            <span
                                className="font-black text-2xl text-black tracking-tighter"
                                style={{ fontFamily: '"Impact", "Arial Black", sans-serif' }}
                            >
                                S/ {calcularSubtotal().toFixed(2)}
                            </span>
                        </div>
                        <button
                            onClick={onCheckout}
                            className="group w-full bg-black text-white py-4 font-bold text-[11px] tracking-[0.2em] uppercase border-2 border-black hover:bg-white hover:text-black transition-all duration-300 flex items-center justify-center gap-2"
                        >
                            <span className="opacity-0 group-hover:opacity-100 transition-opacity">[</span>
                            Ir a pagar
                            <span className="opacity-0 group-hover:opacity-100 transition-opacity">]</span>
                        </button>
                        {tieneWhatsapp && (
                            <button
                                onClick={cotizarPorWhatsApp}
                                className="mt-3 w-full bg-white text-black py-4 font-bold text-[11px] tracking-[0.2em] uppercase border-2 border-black hover:bg-black hover:text-white transition-all duration-300 flex items-center justify-center gap-2"
                            >
                                <Icon icon="ic:baseline-whatsapp" width={16} />
                                Cotizar por WhatsApp
                            </button>
                        )}
                        <p className="text-center text-[10px] text-gray-400 mt-4 uppercase tracking-[0.15em]">
                            Impuestos y envíos calculados al finalizar
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
