import { useEffect, useState } from 'react';
import { Icon } from '@iconify/react';
import moment from 'moment';
import { createPortal } from 'react-dom';
import { usePagosStore } from '@/zustand/pagos';

interface ModalHistorialPagosProps {
    comprobante: any;
    onClose: () => void;
}

const medioPagoIcon: Record<string, string> = {
    EFECTIVO: 'solar:banknote-bold-duotone',
    YAPE: 'solar:smartphone-bold-duotone',
    PLIN: 'solar:smartphone-bold-duotone',
    TRANSFERENCIA: 'solar:transfer-horizontal-bold-duotone',
    TARJETA: 'solar:card-bold-duotone',
};

const DIRIGIDO_LABEL: Record<string, string> = {
    ADMINISTRADOR: 'Administrador',
    EMPRESA: 'Empresa',
    VENDEDOR: 'Vendedor',
};

const ModalHistorialPagos = ({ comprobante, onClose }: ModalHistorialPagosProps) => {
    const { getHistorialPagos, editarReferenciaPago } = usePagosStore();
    const [pagos, setPagos] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [totalPagado, setTotalPagado] = useState(0);
    const [imgPreview, setImgPreview] = useState<string>('');
    // Edición del N° de operación de un pago
    const [editandoId, setEditandoId] = useState<number | null>(null);
    const [refEdit, setRefEdit] = useState('');
    const [guardandoRef, setGuardandoRef] = useState(false);

    useEffect(() => {
        const fetchPagos = async () => {
            try {
                setLoading(true);
                const result = await getHistorialPagos(comprobante.id);
                if (result.success) {
                    setPagos(result.pagos || []);
                    setTotalPagado(result.totalPagado || 0);
                }
            } finally {
                setLoading(false);
            }
        };
        if (comprobante?.id) fetchPagos();
    }, [comprobante?.id, getHistorialPagos]);

    const iniciarEdicion = (pago: any) => {
        setEditandoId(pago.id);
        setRefEdit(pago.referencia || '');
    };

    const guardarReferencia = async (pagoId: number) => {
        setGuardandoRef(true);
        try {
            const res = await editarReferenciaPago(pagoId, { referencia: refEdit.trim() || null });
            if (res.success) {
                setPagos((prev) => prev.map((p) => (p.id === pagoId ? { ...p, referencia: refEdit.trim() || null } : p)));
                setEditandoId(null);
            }
        } finally {
            setGuardandoRef(false);
        }
    };

    const totalComprobante = Number(comprobante?.mtoImpVenta || 0);
    // comprobante.saldo viene del panel y ya descuenta adelanto + pagos anteriores.
    // totalPagado viene de los Pago records fetched ahora.
    // Math.min asegura que si el adelanto no generó un Pago record,
    // el saldo del panel (que sí lo descuenta) sea el techo correcto.
    const saldoPendiente = Math.min(
        Number(comprobante?.saldo ?? 0),
        Math.max(0, totalComprobante - totalPagado),
    );

    const content = (
        <div className="fixed inset-0 bg-black/60 z-[999999] flex items-center justify-center p-4">
            <div className="bg-white dark:bg-[#111827] rounded-2xl shadow-xl max-w-md w-full overflow-hidden max-h-[85vh] flex flex-col border dark:border-transparent">

                {/* Header */}
                <div className="p-5 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-400">
                            <Icon icon="solar:history-bold-duotone" className="text-xl" />
                        </div>
                        <div>
                            <h3 className="font-bold text-gray-900 dark:text-white">Historial de Pagos</h3>
                            <p className="text-xs text-gray-400 dark:text-gray-500">
                                {comprobante?.serie}-{String(comprobante?.correlativo).padStart(8, '0')}
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors">
                        <Icon icon="mdi:close" className="text-xl" />
                    </button>
                </div>

                {/* Resumen */}
                <div className="px-5 py-4 border-b border-gray-100 dark:border-slate-800 space-y-2.5">
                    <div className="flex justify-between text-sm">
                        <span className="text-gray-400 dark:text-gray-500">Cliente</span>
                        <span className="font-medium text-gray-700 dark:text-gray-300">{comprobante?.cliente?.nombre || 'Sin cliente'}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-gray-400 dark:text-gray-500">Total comprobante</span>
                        <span className="font-medium text-gray-700 dark:text-gray-300">S/ {totalComprobante.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-gray-400 dark:text-gray-500">Total pagado</span>
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400">S/ {totalPagado.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-400 dark:text-gray-500">Saldo pendiente</span>
                        <span className={`text-lg font-black ${saldoPendiente > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                            S/ {saldoPendiente.toFixed(2)}
                        </span>
                    </div>
                </div>

                {/* Lista de pagos */}
                <div className="flex-1 overflow-y-auto px-5 py-4">
                    {loading ? (
                        <div className="flex items-center justify-center py-10">
                            <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-gray-300" />
                        </div>
                    ) : pagos.length === 0 ? (
                        <div className="text-center py-10">
                            <Icon icon="solar:wallet-money-linear" className="text-4xl text-gray-200 mx-auto mb-2" />
                            <p className="text-sm text-gray-400">Sin pagos registrados</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {pagos.map((pago: any, index: number) => (
                                <div key={pago.id} className="flex items-center justify-between py-3 border-b border-gray-50 dark:border-slate-800/50 last:border-0">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-slate-800 flex items-center justify-center">
                                            <Icon
                                                icon={medioPagoIcon[pago.medioPago] || 'solar:card-bold-duotone'}
                                                className="text-gray-500 dark:text-gray-400 text-sm"
                                            />
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                                                Pago #{pagos.length - index}
                                                <span className="ml-2 text-xs font-normal text-gray-400 dark:text-gray-500">{pago.medioPago}</span>
                                            </p>
                                            <p className="text-xs text-gray-400 dark:text-gray-500">{moment(pago.fecha).format('DD/MM/YYYY HH:mm')}</p>
                                            {editandoId === pago.id ? (
                                                <div className="mt-1 flex items-center gap-1.5">
                                                    <input
                                                        autoFocus
                                                        value={refEdit}
                                                        onChange={(e) => setRefEdit(e.target.value)}
                                                        onKeyDown={(e) => { if (e.key === 'Enter') guardarReferencia(pago.id); if (e.key === 'Escape') setEditandoId(null); }}
                                                        placeholder="N° de operación"
                                                        className="w-36 rounded-md border border-gray-200 bg-white px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-900 dark:text-gray-200"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => guardarReferencia(pago.id)}
                                                        disabled={guardandoRef}
                                                        className="rounded-md bg-emerald-500 p-1 text-white hover:bg-emerald-600 disabled:opacity-50"
                                                        title="Guardar"
                                                    >
                                                        <Icon icon={guardandoRef ? 'svg-spinners:180-ring' : 'mdi:check'} className="text-sm" />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setEditandoId(null)}
                                                        className="rounded-md bg-gray-100 p-1 text-gray-500 hover:bg-gray-200 dark:bg-slate-800 dark:text-gray-400"
                                                        title="Cancelar"
                                                    >
                                                        <Icon icon="mdi:close" className="text-sm" />
                                                    </button>
                                                </div>
                                            ) : (
                                                <button
                                                    type="button"
                                                    onClick={() => iniciarEdicion(pago)}
                                                    className="mt-0.5 flex items-center gap-1 text-xs text-gray-400 hover:text-violet-600 dark:text-gray-500 dark:hover:text-violet-400"
                                                    title="Editar N° de operación"
                                                >
                                                    Ref: {pago.referencia ? pago.referencia.toUpperCase() : '—'}
                                                    <Icon icon="solar:pen-2-linear" className="text-[12px]" />
                                                </button>
                                            )}
                                            {pago.observacion && (
                                                <p className="text-xs text-gray-400 dark:text-gray-500">{pago.observacion}</p>
                                            )}
                                            {(pago.vendedorNombre || pago.dirigidoA) && (
                                                <div className="flex flex-wrap gap-1 mt-1">
                                                    {pago.vendedorNombre && (
                                                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400 text-[11px] font-medium">
                                                            <Icon icon="solar:user-bold-duotone" className="text-[12px]" />
                                                            Vendedor: {pago.vendedorNombre}
                                                        </span>
                                                    )}
                                                    {pago.dirigidoA && (
                                                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-[11px] font-medium">
                                                            <Icon icon="solar:hand-money-bold-duotone" className="text-[12px]" />
                                                            Dirigido a: {DIRIGIDO_LABEL[pago.dirigidoA] || pago.dirigidoA}
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                            {pago.comprobanteUrl && (
                                                <button
                                                    type="button"
                                                    onClick={() => setImgPreview(pago.comprobanteUrl)}
                                                    className="mt-1.5 flex items-center gap-1.5 group"
                                                >
                                                    <img src={pago.comprobanteUrl} alt="Comprobante" className="h-11 w-11 object-cover rounded-md border border-gray-200 dark:border-slate-700 group-hover:ring-2 group-hover:ring-blue-400 transition" />
                                                    <span className="text-[11px] font-medium text-blue-600 dark:text-blue-400">Ver comprobante</span>
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                    <span className="text-sm font-bold text-gray-800 dark:text-white">S/ {Number(pago.monto).toFixed(2)}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-100 dark:border-slate-800">
                    <button
                        onClick={onClose}
                        className="w-full px-4 py-2.5 bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors font-medium text-sm"
                    >
                        Cerrar
                    </button>
                </div>
            </div>

            {/* Lightbox del comprobante */}
            {imgPreview && (
                <div
                    className="fixed inset-0 z-[9999999] bg-black/80 flex items-center justify-center p-4"
                    onClick={() => setImgPreview('')}
                >
                    <img src={imgPreview} alt="Comprobante" className="max-h-[90vh] max-w-full rounded-lg shadow-2xl" />
                    <button
                        onClick={() => setImgPreview('')}
                        className="absolute top-4 right-4 text-white/80 hover:text-white"
                    >
                        <Icon icon="mdi:close" className="text-3xl" />
                    </button>
                </div>
            )}
        </div>
    );

    if (typeof document === 'undefined') return content;
    return createPortal(content, document.body);
};

export default ModalHistorialPagos;
