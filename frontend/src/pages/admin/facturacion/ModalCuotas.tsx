import { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';
import Button from '@/components/Button';
import useAlertStore from '@/zustand/alert';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onSave: (cuotas: Array<{ monto: number; fechaVencimiento: string }>) => void;
    initialCuotas: Array<{ monto: number; fechaVencimiento: string }>;
    totalFactura: number;
}

const ModalCuotas = ({ isOpen, onClose, onSave, initialCuotas, totalFactura }: Props) => {
    const [cuotas, setCuotas] = useState<Array<{ monto: number; fechaVencimiento: string }>>([]);

    useEffect(() => {
        if (isOpen) {
            const init = initialCuotas || [];
            // Cuota única: siempre refleja el total a financiar (evita montos obsoletos
            // cuando cambia el pago inicial). Múltiples cuotas se respetan tal cual.
            if (init.length <= 1) {
                setCuotas([{ monto: Number((totalFactura || 0).toFixed(2)), fechaVencimiento: init[0]?.fechaVencimiento || '' }]);
            } else {
                setCuotas(init);
            }
        }
    }, [initialCuotas, isOpen, totalFactura]);

    const agregarCuota = () => {
        setCuotas(prev => [...prev, { monto: 0, fechaVencimiento: '' }]);
    };

    const eliminarCuota = (index: number) => {
        setCuotas(prev => prev.filter((_, i) => i !== index));
    };

    const actualizarCuota = (index: number, field: 'monto' | 'fechaVencimiento', value: any) => {
        setCuotas(prev => prev.map((c, i) => i === index ? { ...c, [field]: field === 'monto' ? parseFloat(value) || 0 : value } : c));
    };

    const handleGuardar = () => {
        if (cuotas.length > 0) {
            const sumaCuotas = cuotas.reduce((sum, c) => sum + (c.monto || 0), 0);

            if (Math.abs(sumaCuotas - totalFactura) > 0.01) {
                useAlertStore.getState().alert(`La suma de cuotas (S/ ${sumaCuotas.toFixed(2)}) debe ser igual al monto total a crédito (S/ ${totalFactura.toFixed(2)})`, 'error');
                return;
            }

            const cuotasInvalidas = cuotas.filter(c => !c.fechaVencimiento || c.monto <= 0);
            if (cuotasInvalidas.length > 0) {
                useAlertStore.getState().alert('Todas las cuotas deben tener monto y fecha válidos', 'error');
                return;
            }
        }

        onSave(cuotas);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[210] flex items-center justify-center bg-black/60 p-4">
            <div className="bg-white dark:bg-[#111827] rounded-2xl shadow-2xl w-full max-w-lg animate-in fade-in zoom-in duration-200 border dark:border-transparent">
                <div className="p-6 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center bg-gradient-to-r from-indigo-50 to-violet-50 dark:from-slate-800 dark:to-slate-900">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-500 rounded-lg">
                            <Icon icon="solar:calendar-bold" className="text-white" width={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-800 dark:text-white">Configurar Cuotas</h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Venta al crédito en múltiples partes</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/50 dark:hover:bg-slate-800 rounded-full transition-colors">
                        <Icon icon="solar:close-circle-bold" className="text-gray-400" width={24} />
                    </button>
                </div>

                <div className="p-6 space-y-4">
                    <div className="flex justify-between items-center bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-xl border border-indigo-100 dark:border-indigo-800/30">
                        <span className="text-sm font-semibold text-indigo-900 dark:text-indigo-300">Total a Financiar:</span>
                        <span className="text-lg font-bold text-indigo-700 dark:text-indigo-400">S/ {totalFactura.toFixed(2)}</span>
                    </div>

                    <div className="space-y-2">
                        <div className="flex items-center justify-between mb-3">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Cronograma de Pagos</label>
                            <button
                                type="button"
                                onClick={agregarCuota}
                                className="flex items-center gap-1 text-xs px-3 py-1.5 btn-accent rounded-lg transition-colors"
                            >
                                <Icon icon="solar:add-circle-bold" width={16} />
                                Agregar Cuota
                            </button>
                        </div>

                        <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                            {cuotas.length === 0 ? (
                                <p className="text-center text-sm text-gray-400 py-4 border border-dashed border-gray-300 dark:border-slate-700 rounded-lg">No hay cuotas configuradas.</p>
                            ) : (
                                cuotas.map((cuota, index) => (
                                    <div key={index} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-center bg-white dark:bg-slate-800 p-2 rounded-lg border border-gray-200 dark:border-slate-700 shadow-sm">
                                        <div className="flex flex-col gap-1">
                                            <span className="text-[10px] text-gray-500 ml-1">Monto (S/)</span>
                                            <input
                                                type="number"
                                                value={cuota.monto || ''}
                                                onChange={(e) => actualizarCuota(index, 'monto', e.target.value)}
                                                placeholder="Monto"
                                                className="px-2 py-1.5 text-sm border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
                                            />
                                        </div>
                                        <div className="flex flex-col gap-1">
                                            <span className="text-[10px] text-gray-500 ml-1">Vencimiento</span>
                                            <input
                                                type="date"
                                                value={cuota.fechaVencimiento || ''}
                                                onChange={(e) => actualizarCuota(index, 'fechaVencimiento', e.target.value)}
                                                className="px-2 py-1.5 text-sm border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
                                            />
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => eliminarCuota(index)}
                                            className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors mt-4"
                                        >
                                            <Icon icon="solar:trash-bin-trash-bold" width={20} />
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>

                        {cuotas.length > 0 && (
                            <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-slate-800/50 rounded-lg border border-gray-200 dark:border-slate-700 mt-2">
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Suma total de cuotas:</span>
                                <span className={`font-bold ${Math.abs(cuotas.reduce((sum, c) => sum + (c.monto || 0), 0) - totalFactura) < 0.01 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                    S/ {(cuotas.reduce((sum, c) => sum + (c.monto || 0), 0)).toFixed(2)}
                                </span>
                            </div>
                        )}
                    </div>
                </div>

                <div className="p-6 border-t border-gray-100 dark:border-slate-800 flex gap-3 justify-end bg-gray-50 dark:bg-slate-800/30 rounded-b-2xl">
                    <Button color="lila" onClick={onClose} outline>Cancelar</Button>
                    <Button color="primary" onClick={handleGuardar} className="shadow-lg shadow-black/20">
                        <Icon icon="solar:check-circle-bold" className="mr-2" width={18} />
                        Guardar Cuotas
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default ModalCuotas;
