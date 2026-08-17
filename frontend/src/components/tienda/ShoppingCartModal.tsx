import { Icon } from '@iconify/react';
import { useNavigate } from 'react-router-dom';

interface ShoppingCartModalProps {
    isOpen: boolean;
    onClose: () => void;
    carrito: any[];
    tienda: any;
    actualizarCantidad: (id: number | string, cantidad: number) => void;
    onCheckout: () => void;
    // Prop opcional para override del router si es necesario
    navigateOverride?: (path: string) => void;
    slug?: string;
    setCarrito?: (carrito: any[]) => void;
}

export default function ShoppingCartModal({
    isOpen,
    onClose,
    carrito,
    tienda,
    actualizarCantidad,
    onCheckout,
    slug,
    setCarrito
}: ShoppingCartModalProps) {
    const navigate = useNavigate();

    if (!isOpen) return null;

    const calcularSubtotal = () => {
        return carrito.reduce((sum, item) => sum + Number(item.precioUnitario) * Number(item.cantidad || 1), 0);
    };

    return (
        <div className="fixed inset-0 z-[999999] flex justify-end">
            <div className="absolute inset-0 bg-black/35   transition-opacity" onClick={onClose} />
            <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col transform transition-transform duration-300 animate-in slide-in-from-right border-l border-gray-100">
                {/* Header */}
                <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-b from-white to-[#FBFBFB]">
                    <div>
                        <h2 className="text-[11px] font-black uppercase tracking-[0.14em] text-gray-500">Tu bolsa</h2>
                        <p className="text-base font-bold text-[#1A1A1A] mt-0.5">{carrito.length} producto{carrito.length === 1 ? '' : 's'}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 hover:bg-gray-100 rounded-full transition-colors flex items-center justify-center"
                    >
                        <Icon icon="mdi:close" className="w-5 h-5 text-gray-600" />
                    </button>
                </div>

                {/* Products List */}
                <div className="flex-1 overflow-y-auto px-4 py-4">
                    {carrito.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
                            <div className="w-20 h-20 rounded-2xl bg-[#FFF3E0] flex items-center justify-center">
                                <Icon icon="solar:bag-linear" className="w-10 h-10 text-[#FF9500]" />
                            </div>
                            <p className="text-gray-500 text-sm">Tu bolsa está vacía</p>
                            <button
                                onClick={onClose}
                                className="text-[#FF9500] underline text-sm font-semibold hover:text-[#E08500] transition-colors"
                            >
                                Continuar comprando
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-2.5">
                            {carrito.map((item) => (
                                <div key={item.id} className="flex gap-3 p-3 rounded-2xl border border-gray-100 bg-white">
                                    {/* Product Image */}
                                    <div className="relative w-[68px] h-[68px] bg-[#FAFBFC] rounded-xl flex-shrink-0 overflow-hidden border border-gray-100">
                                        <button
                                            onClick={() => {
                                                if (setCarrito) {
                                                    setCarrito(carrito.filter((i) => i.id !== item.id));
                                                } else {
                                                    actualizarCantidad(item.id, 0);
                                                }
                                            }}
                                            className="absolute -top-1.5 -left-1.5 bg-white rounded-full p-0.5 shadow-sm border border-gray-200 hover:bg-red-50 hover:border-red-200 text-gray-500 hover:text-red-600 z-10 transition-all"
                                        >
                                            <Icon icon="mdi:close" width={12} />
                                        </button>
                                        {item.imagenUrl ? (
                                            <img src={item.imagenUrl} className="w-full h-full object-contain p-1" alt={item.descripcion} />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center">
                                                <Icon icon="mdi:image-off" className="text-gray-300 w-8 h-8" />
                                            </div>
                                        )}
                                    </div>

                                    {/* Product Info */}
                                    <div className="flex-1 flex flex-col justify-between min-w-0">
                                        <div className="mb-2">
                                            <h3 className="text-[13px] font-bold text-[#1A1A1A] line-clamp-2 leading-tight mb-0.5 uppercase">
                                                {item.descripcion}
                                            </h3>
                                            {/* Display modifiers if any */}
                                            {item.modificadores && item.modificadores.length > 0 && !(['ferreteria', 'ventas de materiales de construccion', 'farmacia', 'botica'].some(r => tienda?.rubro?.nombre?.toLowerCase().includes(r))) && (
                                                <p className="text-xs text-gray-500 line-clamp-1">
                                                    + {item.modificadores.length} extras
                                                </p>
                                            )}

                                            {/* For detail view which has different modifier structure */}
                                            {item.modificadores && item.modificadores.length > 0 && item.modificadores[0]?.opcionNombre && (
                                                <p className="text-xs text-gray-500 line-clamp-1">
                                                    {item.modificadores.filter((m: any) => m && m.opcionNombre).map((m: any) => m.opcionNombre).join(', ')}
                                                </p>
                                            )}
                                        </div>

                                        {/* Quantity Controls & Price */}
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-1.5 bg-[#F5F6F8] rounded-lg px-1.5 py-1">
                                                <button
                                                    onClick={() => actualizarCantidad(item.id!, (item.cantidad || 1) - 1)}
                                                    className="w-6 h-6 rounded-md border border-gray-200 bg-white flex items-center justify-center hover:bg-gray-50 transition-colors text-gray-600 hover:text-gray-900"
                                                >
                                                    <Icon icon="mdi:minus" width={12} />
                                                </button>
                                                <span className="text-xs w-5 text-center font-bold text-gray-900">{item.cantidad || 1}</span>
                                                <button
                                                    onClick={() => actualizarCantidad(item.id!, (item.cantidad || 1) + 1)}
                                                    className="w-6 h-6 rounded-md border border-gray-200 bg-white flex items-center justify-center hover:bg-gray-50 transition-colors text-gray-600 hover:text-gray-900"
                                                >
                                                    <Icon icon="mdi:plus" width={12} />
                                                </button>
                                            </div>
                                            <div className="text-sm font-black text-[#1A1A1A] flex items-baseline gap-1.5">
                                                S/ {(Number(item.precioUnitario) * (item.cantidad || 1)).toFixed(2)}
                                                {item.enOferta && Number(item.precioRegular) > Number(item.precioUnitario) && (
                                                    <span className="text-[11px] font-medium text-gray-400 line-through">S/ {(Number(item.precioRegular) * (item.cantidad || 1)).toFixed(2)}</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                {carrito.length > 0 && (
                    <div className="p-4 border-t border-gray-100 bg-white">
                        <div className="rounded-2xl border border-gray-100 bg-[#FAFBFC] p-4 mb-3">
                            <div className="flex justify-between items-center">
                                <span className="text-gray-600 font-medium text-sm">Subtotal</span>
                                <span className="font-black text-2xl text-[#1A1A1A] leading-none">S/ {calcularSubtotal().toFixed(2)}</span>
                            </div>
                        </div>
                        <button
                            onClick={onCheckout}
                            className="w-full bg-[#FF9903] text-white py-3 font-bold text-sm hover:bg-[#E08500] transition-all shadow-sm hover:shadow-md rounded-xl flex items-center justify-center gap-2 group"
                        >
                            <span>Ir a Pagar</span>
                            <Icon icon="solar:arrow-right-linear" className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                        </button>
                        <p className="text-center text-[11px] text-gray-500 mt-2.5">
                            Impuestos y envío calculados al finalizar
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
