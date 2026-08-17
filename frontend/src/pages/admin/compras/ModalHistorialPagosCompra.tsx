import { useEffect, useState } from 'react';
import { Icon } from '@iconify/react';
import moment from 'moment';
import { useComprasStore } from '@/zustand/compras';
import Modal from '@/components/Modal';

interface ModalHistorialPagosCompraProps {
    isOpen: boolean;
    compra: any; // ICompra
    onClose: () => void;
}

const ModalHistorialPagosCompra = ({ isOpen, compra, onClose }: ModalHistorialPagosCompraProps) => {
    const { getHistorialPagos } = useComprasStore();
    const [pagos, setPagos] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [totalPagado, setTotalPagado] = useState(0);
    const [localCompra, setLocalCompra] = useState<any>(null);

    // Sync local state to preserve data during closing animation
    useEffect(() => {
        if (isOpen && compra) {
            setLocalCompra(compra);
        }
    }, [isOpen, compra]);

    useEffect(() => {
        const fetchPagos = async () => {
            if (!localCompra?.id) return;
            try {
                setLoading(true);
                const result: any = await getHistorialPagos(localCompra.id);
                if (result.success || Array.isArray(result)) {
                    let pagosList = result.pagos || (Array.isArray(result) ? result : []);
                    if (!Array.isArray(pagosList)) pagosList = [];
                    setPagos(pagosList);

                    const total = result.totalPagado ?? pagosList.reduce((sum: number, p: any) => sum + Number(p.monto), 0);
                    setTotalPagado(total);
                }
            } catch (error) {
                console.error('Error fetching pagos:', error);
            } finally {
                setLoading(false);
            }
        };

        if (isOpen && localCompra?.id) {
            fetchPagos();
        }
    }, [isOpen, localCompra?.id, getHistorialPagos]);

    const totalCompra = Number(localCompra?.total || 0);
    const saldoPendiente = Number(localCompra?.saldo || 0);

    return (
        <Modal
            isOpenModal={isOpen}
            closeModal={onClose}
            title={localCompra ? `Historial de Pagos: ${localCompra.serie}-${localCompra.numero}` : 'Historial de Pagos'}
            width="700px"
            icon="solar:history-bold-duotone"
            iconClass="bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400"
        >
            <div className="flex flex-col max-h-[85vh]">
                {/* Info de la Compra */}
                <div className="p-4 border-b border-gray-100 dark:border-slate-800">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                            <p className="text-gray-500 dark:text-gray-400 text-xs mb-1 uppercase tracking-wider">Proveedor</p>
                            <p className="font-bold text-gray-900 dark:text-white truncate">{localCompra?.proveedor?.nombre || 'Sin nombre'}</p>
                        </div>
                        <div>
                            <p className="text-gray-500 dark:text-gray-400 text-xs mb-1 uppercase tracking-wider">Emisión</p>
                            <p className="font-medium text-gray-900 dark:text-white">{localCompra?.fechaEmision ? moment(localCompra.fechaEmision).format('DD/MM/YYYY') : '-'}</p>
                        </div>
                        <div>
                            <p className="text-gray-500 dark:text-gray-400 text-xs mb-1 uppercase tracking-wider">Total</p>
                            <p className="font-bold text-gray-900 dark:text-white">S/ {totalCompra.toFixed(2)}</p>
                        </div>
                        <div>
                            <p className="text-gray-500 dark:text-gray-400 text-xs mb-1 uppercase tracking-wider">Saldo</p>
                            <p className={`font-extrabold ${saldoPendiente > 0 ? 'text-orange-600 dark:text-orange-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                                S/ {saldoPendiente.toFixed(2)}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Resumen de Pagos */}
                <div className="p-4 border-b border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-900/30">
                    <div className="grid grid-cols-3 gap-4">
                        <div className="bg-white dark:bg-slate-800 border border-gray-100 dark:border-transparent rounded-xl p-3 text-center shadow-sm">
                            <p className="text-[10px] text-gray-500 uppercase font-bold mb-1">Total Compra</p>
                            <p className="text-lg font-extrabold text-gray-900 dark:text-white">S/ {totalCompra.toFixed(2)}</p>
                        </div>
                        <div className="bg-white dark:bg-slate-800 border border-gray-100 dark:border-transparent rounded-xl p-3 text-center shadow-sm">
                            <p className="text-[10px] text-emerald-600 uppercase font-bold mb-1">Total Pagado</p>
                            <p className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400">S/ {totalPagado.toFixed(2)}</p>
                        </div>
                        <div className={`bg-white dark:bg-slate-800 border border-gray-100 dark:border-transparent rounded-xl p-3 text-center shadow-sm`}>
                            <p className="text-[10px] text-gray-500 uppercase font-bold mb-1">Saldo Final</p>
                            <p className={`text-lg font-extrabold ${saldoPendiente > 0 ? 'text-rose-500' : 'text-emerald-600'}`}>
                                S/ {saldoPendiente.toFixed(2)}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Lista de Pagos */}
                <div className="flex-1 overflow-auto p-4 min-h-[300px]">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-12 gap-3">
                            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-violet-600"></div>
                            <p className="text-sm text-gray-500 font-medium">Cargando historial...</p>
                        </div>
                    ) : pagos.length === 0 ? (
                        <div className="text-center py-12">
                            <div className="w-16 h-16 bg-gray-50 dark:bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-gray-100 dark:border-slate-700">
                                <Icon icon="solar:wallet-money-linear" className="text-4xl text-gray-300" />
                            </div>
                            <p className="text-gray-900 dark:text-white font-bold">Sin pagos registrados</p>
                            <p className="text-sm text-gray-400 mt-1 max-w-[200px] mx-auto">Esta compra aún no cuenta con abonos realizados.</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {pagos.map((pago: any, index: number) => (
                                <div
                                    key={pago.id || index}
                                    className="bg-white dark:bg-slate-800/50 border border-gray-200 dark:border-transparent rounded-xl p-4 hover:border-violet-200 dark:hover:border-violet-500/30 transition-all group shadow-sm hover:shadow-md"
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-emerald-50 dark:bg-emerald-500/10 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                                                <Icon icon="solar:check-circle-bold" className="text-emerald-600 dark:text-emerald-400 text-xl" />
                                            </div>
                                            <div>
                                                <p className="font-bold text-gray-900 dark:text-white">Abono #{pagos.length - index}</p>
                                                <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                                                    <Icon icon="solar:calendar-linear" />
                                                    {moment(pago.fecha).format('DD/MM/YYYY HH:mm')}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-lg font-black text-gray-900 dark:text-white">S/ {Number(pago.monto).toFixed(2)}</p>
                                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-100 dark:border-violet-500/20 uppercase tracking-tighter">
                                                {pago.medioPago}
                                            </span>
                                        </div>
                                    </div>
                                    {(pago.referencia || pago.observacion) && (
                                        <div className="mt-3 pt-3 border-t border-gray-100 dark:border-slate-800/50 grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            {pago.referencia && (
                                                <div className="bg-gray-50 dark:bg-slate-900/50 p-2 rounded-lg border border-gray-100 dark:border-transparent">
                                                    <p className="text-[10px] text-gray-400 font-bold uppercase mb-0.5">Referencia</p>
                                                    <p className="text-xs text-gray-700 dark:text-gray-300 font-medium truncate">{pago.referencia}</p>
                                                </div>
                                            )}
                                            {pago.observacion && (
                                                <div className="bg-gray-50 dark:bg-slate-900/50 p-2 rounded-lg border border-gray-100 dark:border-transparent">
                                                    <p className="text-[10px] text-gray-400 font-bold uppercase mb-0.5">Observación</p>
                                                    <p className="text-xs text-gray-700 dark:text-gray-300 font-medium">{pago.observacion}</p>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-100 dark:border-slate-800 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-6 py-2.5 bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-200 dark:hover:bg-slate-700 transition-all font-bold text-sm shadow-sm"
                    >
                        Cerrar Historial
                    </button>
                </div>
            </div>
        </Modal>
    );
};

export default ModalHistorialPagosCompra;
