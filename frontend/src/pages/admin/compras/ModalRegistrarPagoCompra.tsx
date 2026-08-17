import { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';
import { useComprasStore } from '@/zustand/compras';
import Select from '@/components/Select';
import Modal from '@/components/Modal';

interface ModalRegistrarPagoCompraProps {
    isOpen: boolean;
    compra: any;
    onClose: () => void;
    onSuccess: () => void;
}

const ModalRegistrarPagoCompra = ({ isOpen, compra, onClose, onSuccess }: ModalRegistrarPagoCompraProps) => {
    const { registrarPagoCompra, loading } = useComprasStore();
    const [monto, setMonto] = useState('');
    const [medioPago, setMedioPago] = useState('EFECTIVO');
    const [observacion, setObservacion] = useState('');
    const [referencia, setReferencia] = useState('');
    const [localCompra, setLocalCompra] = useState<any>(null);

    // Sync local state to preserve data during closing animation
    useEffect(() => {
        if (isOpen && compra) {
            setLocalCompra(compra);
        }
    }, [isOpen, compra]);

    const saldoActual = Number(localCompra?.saldo || 0);
    const montoNum = Number(monto) || 0;
    const nuevoSaldo = Math.max(0, saldoActual - montoNum);

    const handleSubmit = async () => {
        if (montoNum <= 0) return;
        if (montoNum > saldoActual) return;
        if (!localCompra?.id) return;

        const result = await registrarPagoCompra(localCompra.id, {
            monto: montoNum,
            medioPago,
            observacion: observacion || undefined,
            referencia: referencia || undefined,
        });

        if (result && result.success) {
            onSuccess();
        }
    };

    const handlePagarTodo = () => {
        setMonto(saldoActual.toFixed(2));
    };

    return (
        <Modal
            isOpenModal={isOpen}
            closeModal={onClose}
            title={localCompra ? `Registrar Pago: ${localCompra.serie}-${localCompra.numero}` : 'Registrar Pago'}
            width="550px"
            icon="solar:hand-money-bold-duotone"
            iconClass="bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
        >
            <div className="flex flex-col">
                {/* Info de la Compra */}
                <div className="p-5 border-b border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-900/30">
                    <div className="grid grid-cols-2 gap-6 text-sm">
                        <div className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-gray-100 dark:border-transparent shadow-sm">
                            <p className="text-[10px] text-gray-400 font-bold uppercase mb-1">Proveedor</p>
                            <p className="font-bold text-gray-900 dark:text-white truncate">{localCompra?.proveedor?.nombre || 'Sin nombre'}</p>
                            <p className="text-xs text-gray-500">{localCompra?.proveedor?.nroDoc || '-'}</p>
                        </div>
                        <div className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-gray-100 dark:border-transparent shadow-sm">
                            <p className="text-[10px] text-rose-500 font-bold uppercase mb-1">Saldo Pendiente</p>
                            <p className="text-xl font-black text-rose-600 dark:text-rose-400">S/ {saldoActual.toFixed(2)}</p>
                        </div>
                    </div>
                </div>

                {/* Form */}
                <div className="p-6 space-y-5">
                    <div className="flex items-end gap-3">
                        <div className="flex-1">
                            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2 tracking-wider">Monto a Abonar</label>
                            <div className="relative group">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-1.5 border-r border-gray-200 dark:border-slate-700 pr-3 pointer-events-none group-focus-within:border-violet-500 transition-colors">
                                    <span className="text-gray-400 font-bold">S/</span>
                                </div>
                                <input
                                    type="number"
                                    value={monto}
                                    onChange={(e) => setMonto(e.target.value)}
                                    placeholder="0.00"
                                    step="0.01"
                                    max={saldoActual}
                                    className="w-full pl-14 pr-4 py-3 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all outline-none text-lg font-black"
                                />
                            </div>
                        </div>
                        <button
                            onClick={handlePagarTodo}
                            className="h-[52px] px-4 bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400 rounded-xl hover:bg-violet-100 dark:hover:bg-violet-500/20 transition-all text-xs font-black uppercase tracking-wider shadow-sm"
                        >
                            Pagar Todo
                        </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <Select
                            error=""
                            label="Medio de Pago"
                            name="medioPago"
                            defaultValue="EFECTIVO"
                            onChange={(id: any, value: string) => setMedioPago(value)}
                            options={[
                                { value: 'EFECTIVO', label: 'Efectivo' },
                                { value: 'YAPE', label: 'Yape' },
                                { value: 'PLIN', label: 'Plin' },
                                { value: 'TRANSFERENCIA', label: 'Transferencia' },
                                { value: 'TARJETA', label: 'Tarjeta' },
                            ]}
                        />
                        <div>
                            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2 tracking-wider">Referencia (opcional)</label>
                            <input
                                type="text"
                                value={referencia}
                                onChange={(e) => setReferencia(e.target.value)}
                                placeholder="Nro. operación"
                                className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all outline-none"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2 tracking-wider">Observación (opcional)</label>
                        <textarea
                            value={observacion}
                            onChange={(e) => setObservacion(e.target.value)}
                            placeholder="Notas adicionales..."
                            rows={2}
                            className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all outline-none resize-none"
                        />
                    </div>

                    {montoNum > 0 && (
                        <div className="bg-emerald-50 dark:bg-emerald-500/10 rounded-2xl p-4 border border-emerald-100 dark:border-emerald-500/20 flex items-center justify-between shadow-sm">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-emerald-500 text-white rounded-full flex items-center justify-center shadow-md shadow-emerald-200 dark:shadow-none">
                                    <Icon icon="solar:double-alt-arrow-right-bold" />
                                </div>
                                <span className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Saldo Resultante:</span>
                            </div>
                            <span className={`text-xl font-black ${nuevoSaldo > 0 ? 'text-orange-600' : 'text-emerald-600'}`}>
                                S/ {nuevoSaldo.toFixed(2)}
                            </span>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-5 border-t border-gray-100 dark:border-slate-800 flex gap-3 justify-end">
                    <button
                        onClick={onClose}
                        className="px-6 py-3 text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-slate-900 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-800 transition-all font-bold text-sm"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={loading || montoNum <= 0 || montoNum > saldoActual}
                        className="px-8 py-3 btn-accent rounded-xl transition-all font-bold text-sm shadow-lg shadow-black/20 dark:shadow-none flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed group"
                    >
                        {loading ? (
                            <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                Procesando...
                            </>
                        ) : (
                            <>
                                <Icon icon="solar:check-circle-bold" className="text-lg group-hover:scale-125 transition-transform" />
                                Confirmar Pago
                            </>
                        )}
                    </button>
                </div>
            </div>
        </Modal>
    );
};

export default ModalRegistrarPagoCompra;
