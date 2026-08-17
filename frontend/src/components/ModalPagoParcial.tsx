import { useState, useEffect, useCallback } from "react";
import InputPro from "./InputPro";
import Button from "./Button";
import { Icon } from "@iconify/react";
import useEscapeKey from "@/hooks/useEscapeKey";

interface ModalPagoParcialProps {
    isOpen: boolean;
    isLoading?: boolean;
    saldoPendiente: number;
    comprobanteInfo: {
        id: number;
        serie: string;
        correlativo: number;
        cliente: string;
        total: number;
    };
    onConfirm: (monto: number, medioPago: string) => void;
    onCancel: () => void;
}

const ModalPagoParcial = ({
    isOpen,
    isLoading = false,
    saldoPendiente,
    comprobanteInfo,
    onConfirm,
    onCancel
}: ModalPagoParcialProps) => {
    const [monto, setMonto] = useState<number>(saldoPendiente);
    const [medioPago, setMedioPago] = useState<string>("Efectivo");
    const [error, setError] = useState<string>("");
    const [vuelto, setVuelto] = useState<number>(0);

    useEffect(() => {
        // Resetear cuando se abre el modal
        if (isOpen) {
            setMonto(saldoPendiente);
            setMedioPago("Efectivo");
            setError("");
            setVuelto(0);
        }
    }, [isOpen, saldoPendiente]);

    const handleMontoChange = (value: string) => {
        const numValue = parseFloat(value) || 0;
        setMonto(numValue);
        setVuelto(Math.max(0, numValue - saldoPendiente));
        
        // Validación
        if (numValue <= 0) {
            setError("El monto debe ser mayor a 0");
        } else if (numValue > saldoPendiente) {
            setError(`No puede exceder el saldo pendiente (S/ ${saldoPendiente.toFixed(2)})`);
        } else {
            setError("");
        }
    };

    const handleConfirm = () => {
        if (monto <= 0) {
            setError("El monto debe ser mayor a 0");
            return;
        }
        if (monto > saldoPendiente) {
            setError(`No puede exceder el saldo pendiente (S/ ${saldoPendiente.toFixed(2)})`);
            return;
        }
        onConfirm(monto, medioPago);
    };

    const handleClose = useCallback(() => {
        if (isOpen) {
            onCancel();
        }
    }, [isOpen, onCancel]);

    useEscapeKey(() => handleClose(), isOpen);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/20 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg dark:shadow-none max-w-md w-full p-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-200 dark:border-slate-700">
                    <h2 className="text-lg font-bold text-gray-800 dark:text-white">Registrar Pago Parcial</h2>
                    <button
                        onClick={onCancel}
                        className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
                    >
                        <Icon icon="tabler:x" width="24" height="24" />
                    </button>
                </div>

                {/* Información del Comprobante */}
                <div className="bg-gray-50 dark:bg-slate-900 p-3 rounded-lg mb-4 text-sm">
                    <p className="text-gray-600 dark:text-gray-400">
                        <span className="font-semibold">Comprobante:</span> {comprobanteInfo.serie}-{comprobanteInfo.correlativo}
                    </p>
                    <p className="text-gray-600 dark:text-gray-400">
                        <span className="font-semibold">Cliente:</span> {comprobanteInfo.cliente}
                    </p>
                    <p className="text-gray-600 dark:text-gray-400">
                        <span className="font-semibold">Total:</span> S/ {comprobanteInfo.total.toFixed(2)}
                    </p>
                    <p className="text-gray-800 dark:text-white font-semibold mt-2">
                        <span className="text-orange-600">Saldo Pendiente:</span> S/ {saldoPendiente.toFixed(2)}
                    </p>
                </div>

                {/* Monto a Pagar */}
                <div className="mb-4">
                    <InputPro
                        type="number"
                        label="Monto a Pagar"
                        name="monto"
                        value={monto}
                        onChange={(e: any) => handleMontoChange(e.target.value)}
                        error={error}
                        isLabel
                        placeholder="0.00"
                    />
                </div>

                {/* Vuelto (si paga más) */}
                {vuelto > 0 && (
                    <div className="mb-4 p-3 bg-green-50 dark:bg-emerald-900/20 border border-green-200 dark:border-emerald-900/30 rounded-lg">
                        <p className="text-sm text-green-800 dark:text-emerald-400">
                            <span className="font-semibold">Vuelto:</span> S/ {vuelto.toFixed(2)}
                        </p>
                    </div>
                )}

                {/* Método de Pago */}
                <div className="mb-4">
                    <label className="block text-sm font-semibold text-gray-700 dark:text-slate-200 mb-2">
                        Método de Pago
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                        {[
                            { key: "Efectivo", icon: "💰" },
                            { key: "Yape", icon: "📱" },
                            { key: "Plin", icon: "📱" },
                            { key: "Transferencia", icon: "🏦" },
                            { key: "Tarjeta", icon: "💳" },
                            { key: "Otro", icon: "🔄" }
                        ].map(({ key, icon }) => (
                            <button
                                key={key}
                                type="button"
                                onClick={() => setMedioPago(key)}
                                className={`p-2 rounded-lg border-2 text-center text-xs font-semibold transition-all ${
                                    medioPago === key
                                        ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400"
                                        : "border-gray-200 dark:border-slate-700 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-slate-600"
                                }`}
                            >
                                <span className="block text-lg mb-1">{icon}</span>
                                {key}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Resumen */}
                <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg mb-4 border border-blue-200 dark:border-blue-900/30">
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Resumen de Pago:</p>
                    <div className="flex justify-between text-sm font-semibold">
                        <span>Antes de pagar:</span>
                        <span className="text-orange-600">S/ {saldoPendiente.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm font-semibold mt-1">
                        <span>Pagar:</span>
                        <span className="text-green-600">S/ {monto.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm font-semibold mt-1 pt-1 border-t border-blue-200 dark:border-blue-900/30">
                        <span>Saldo después:</span>
                        <span className={(saldoPendiente - monto) > 0 ? "text-orange-600" : "text-green-600"}>
                            S/ {Math.max(0, saldoPendiente - monto).toFixed(2)}
                        </span>
                    </div>
                </div>

                {/* Acciones */}
                <div className="flex gap-3">
                    <Button
                        onClick={onCancel}
                        color="danger"
                        disabled={isLoading}
                        className="flex-1"
                    >
                        Cancelar
                    </Button>
                    <Button
                        onClick={handleConfirm}
                        color="primary"
                        disabled={isLoading || error !== "" || monto <= 0}
                        className="flex-1"
                    >
                        {isLoading ? "Procesando..." : "Confirmar Pago"}
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default ModalPagoParcial;
