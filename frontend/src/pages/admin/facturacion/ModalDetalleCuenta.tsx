import { Icon } from '@iconify/react';
import moment from 'moment';
import { createPortal } from 'react-dom';

interface ModalDetalleCuentaProps {
    comprobante: any;
    onClose: () => void;
}

const estadoLabel = (estado: string) => {
    if (estado === 'PENDIENTE_PAGO') return 'Pendiente';
    if (estado === 'PAGO_PARCIAL') return 'Pago Parcial';
    if (estado === 'COMPLETADO') return 'Pagado';
    if (estado === 'ANULADO') return 'Anulado';
    return estado || '-';
};

const ModalDetalleCuenta = ({ comprobante, onClose }: ModalDetalleCuentaProps) => {
    if (!comprobante) return null;

    const tieneRetencion = comprobante.montoDetraccion > 0 && comprobante.porcentajeDetraccion === 3;
    const tieneDetraccion = comprobante.montoDetraccion > 0 && comprobante.porcentajeDetraccion !== 3;
    const cuotas = comprobante.cuotas || [];
    const totalComprobante = Number(comprobante.mtoImpVenta || 0);
    const montoDescuento = Number(comprobante.montoDetraccion || 0);
    const saldoNeto = totalComprobante - montoDescuento;
    const saldoPendiente = Number(comprobante.saldo || 0);
    const estado = comprobante.estadoPago;

    const content = (
        <div className="fixed inset-0 bg-black/60 z-[999999] flex items-center justify-center p-4">
            <div className="bg-white dark:bg-[#111827] rounded-2xl shadow-xl max-w-md w-full overflow-hidden max-h-[90vh] flex flex-col border dark:border-transparent">

                {/* Header */}
                <div className="p-5 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-400">
                            <Icon icon="solar:document-text-bold-duotone" className="text-xl" />
                        </div>
                        <div>
                            <h3 className="font-bold text-gray-900 dark:text-white">Detalle de Cuenta</h3>
                            <p className="text-xs text-gray-400 dark:text-gray-500">
                                {comprobante.serie}-{String(comprobante.correlativo).padStart(8, '0')}
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors">
                        <Icon icon="mdi:close" className="text-xl" />
                    </button>
                </div>

                <div className="overflow-y-auto flex-1">
                    {/* Info del cliente */}
                    <div className="p-5 space-y-3 border-b border-gray-100 dark:border-slate-800">
                        <Row label="Cliente" value={comprobante.cliente?.nombre || 'Sin cliente'} />
                        <Row label="RUC / DNI" value={comprobante.cliente?.nroDoc || '-'} />
                        <Row label="Fecha emisión" value={moment(comprobante.fechaEmision).format('DD/MM/YYYY')} />
                        <Row label="Forma de pago" value={comprobante.formaPagoTipo || '-'} />
                        {comprobante.fechaVencimientoCredito && (
                            <Row
                                label="Fecha de vencimiento"
                                value={moment(comprobante.fechaVencimientoCredito).format('DD/MM/YYYY')}
                            />
                        )}
                    </div>

                    {/* Montos */}
                    <div className="p-5 space-y-3 border-b border-gray-100 dark:border-slate-800">
                        <Row label="Total comprobante" value={`S/ ${totalComprobante.toFixed(2)}`} />
                        {(tieneRetencion || tieneDetraccion) && (
                            <Row
                                label={tieneRetencion ? 'Retención 3% IGV' : `Detracción ${comprobante.porcentajeDetraccion}%`}
                                value={`- S/ ${montoDescuento.toFixed(2)}`}
                            />
                        )}
                        {(tieneRetencion || tieneDetraccion) && (
                            <Row label="Neto a cobrar" value={`S/ ${saldoNeto.toFixed(2)}`} bold />
                        )}
                    </div>

                    {/* Estado actual */}
                    <div className="p-5 border-b border-gray-100 dark:border-slate-800">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs text-gray-400 dark:text-gray-500 mb-0.5">Saldo pendiente</p>
                                <p className="text-2xl font-black text-gray-900 dark:text-white">S/ {saldoPendiente.toFixed(2)}</p>
                            </div>
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                estado === 'COMPLETADO' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' :
                                estado === 'PAGO_PARCIAL' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' :
                                estado === 'ANULADO' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' :
                                'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                            }`}>
                                {estadoLabel(estado)}
                            </span>
                        </div>
                    </div>

                    {/* Cuotas */}
                    {cuotas.length > 0 && (
                        <div className="p-5">
                            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
                                Plan de cuotas ({cuotas.length})
                            </p>
                            <div className="space-y-2">
                                {cuotas.map((cuota: any, index: number) => {
                                    const fechaVenc = moment(cuota.fechaVencimiento);
                                    const vencida = fechaVenc.isBefore(moment(), 'day');
                                    const hoy = fechaVenc.isSame(moment(), 'day');
                                    return (
                                        <div key={index} className="flex items-center justify-between py-2.5 border-b border-gray-50 dark:border-slate-800/50 last:border-0">
                                            <div className="flex items-center gap-3">
                                                <span className="w-6 h-6 rounded-full bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-400 text-xs font-bold flex items-center justify-center">
                                                    {index + 1}
                                                </span>
                                                <div>
                                                    <p className="text-sm text-gray-700 dark:text-gray-300">Cuota {String(index + 1).padStart(2, '0')}</p>
                                                    <p className={`text-xs ${vencida ? 'text-red-500' : hoy ? 'text-amber-500' : 'text-gray-400 dark:text-gray-500'}`}>
                                                        {fechaVenc.format('DD/MM/YYYY')}
                                                        {vencida && ' · Vencida'}
                                                        {hoy && ' · Hoy'}
                                                    </p>
                                                </div>
                                            </div>
                                            <span className="text-sm font-semibold text-gray-800 dark:text-white">S/ {Number(cuota.monto).toFixed(2)}</span>
                                        </div>
                                    );
                                })}
                            </div>
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
        </div>
    );

    if (typeof document === 'undefined') return content;
    return createPortal(content, document.body);
};

const Row = ({ label, value, bold }: { label: string; value: string; bold?: boolean }) => (
    <div className="flex justify-between items-center text-sm">
        <span className="text-gray-400 dark:text-gray-500">{label}</span>
        <span className={`${bold ? 'font-bold text-gray-900 dark:text-white' : 'font-medium text-gray-700 dark:text-gray-300'}`}>{value}</span>
    </div>
);

export default ModalDetalleCuenta;
