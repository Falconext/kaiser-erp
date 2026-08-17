
import { Icon } from '@iconify/react';

interface ConfirmOrderModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    total: number;
    loading?: boolean;
    tiendaColor?: string;
}

export default function ConfirmOrderModal({
    isOpen,
    onClose,
    onConfirm,
    total,
    loading = false,
    tiendaColor = '#1E1B4B'
}: ConfirmOrderModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/60   transition-all animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full border border-gray-100 p-6 relative overflow-hidden">

                {/* Decorative background circle */}
                <div className="absolute -top-10 -right-10 w-32 h-32 bg-gray-50 rounded-full z-0 opacity-50" />
                <div className="absolute -bottom-10 -left-10 w-24 h-24 bg-gray-50 rounded-full z-0 opacity-50" />

                <div className="relative z-10">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-blue-50 flex items-center justify-center">
                        <Icon icon="solar:cart-large-4-bold-duotone" className="w-8 h-8 text-blue-600" />
                    </div>

                    <h3 className="text-xl font-bold text-center text-gray-900 mb-2">
                        ¿Confirmar Pedido?
                    </h3>

                    <p className="text-center text-gray-500 text-sm mb-6 leading-relaxed">
                        Estás a punto de completar tu compra por un total de:
                        <br />
                        <span className="text-xl font-black text-gray-900 mt-2 block">
                            S/ {total.toFixed(2)}
                        </span>
                    </p>

                    <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-3 mb-6 flex gap-3 items-start">
                        <Icon icon="solar:info-circle-bold" className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
                        <p className="text-xs text-blue-700">
                            Al confirmar, tu pedido será enviado a la tienda para su preparación.
                        </p>
                    </div>

                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            disabled={loading}
                            className="flex-1 py-3 px-4 rounded-xl font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors text-sm disabled:opacity-50"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={onConfirm}
                            disabled={loading}
                            className="flex-1 py-3 px-4 rounded-xl font-bold text-white transition-all shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] text-sm disabled:opacity-50 flex items-center justify-center gap-2"
                            style={{ backgroundColor: tiendaColor }}
                        >
                            {loading ? (
                                <>
                                    <Icon icon="line-md:loading-loop" className="w-5 h-5" />
                                    <span>Procesando...</span>
                                </>
                            ) : (
                                <span>Sí, Confirmar</span>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
