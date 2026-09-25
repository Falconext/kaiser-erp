import { Icon } from '@iconify/react';
import {
    TIPO_DOC_LABEL,
    formatSoles,
    formatNumero,
    type ComprobanteDetalle,
    type DimensionMeta,
    type FilaReporte,
} from '../ReportesVentasModel';

interface Props {
    fila: FilaReporte | null;
    dimension: DimensionMeta;
    detalle: ComprobanteDetalle[];
    isLoading: boolean;
    fechaInicio: string;
    fechaFin: string;
    onClose: () => void;
}

const ESTADO_STYLE: Record<string, string> = {
    ACEPTADO: 'bg-emerald-50 text-emerald-600',
    EMITIDO: 'bg-blue-50 text-blue-600',
    PENDIENTE: 'bg-amber-50 text-amber-600',
    RECHAZADO: 'bg-rose-50 text-rose-600',
};

/** Drawer lateral con los comprobantes que componen una fila del reporte (drill-down). */
export function ReporteDetalleDrawer({ fila, dimension, detalle, isLoading, fechaInicio, fechaFin, onClose }: Props) {
    const open = fila !== null;
    const totalPEN = detalle.reduce((s, c) => s + c.totalPEN, 0);

    return (
        <>
            <div
                onClick={onClose}
                className={`fixed inset-0 top-[-30px] z-40 bg-black/40 transition-opacity duration-300 ${open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
            />
            <div
                className={`fixed top-[-30px] right-0 z-50 h-full w-full max-w-2xl bg-white dark:bg-[#0F1117] shadow-2xl flex flex-col transition-transform duration-300 ${open ? 'translate-x-0' : 'translate-x-full'}`}
                role="dialog"
                aria-modal="true"
                aria-label="Detalle de comprobantes"
            >
                {/* Header */}
                <div className="flex items-start justify-between gap-3 px-6 py-4 border-b border-gray-100 dark:border-slate-800">
                    <div className="min-w-0">
                        <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">{dimension.label}</p>
                        <h2 className="text-base font-bold text-gray-900 dark:text-white truncate">{fila?.nombre ?? '—'}</h2>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{fechaInicio} → {fechaFin}</p>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors shrink-0" aria-label="Cerrar">
                        <Icon icon="solar:close-circle-bold-duotone" width={22} className="text-gray-400" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-5">
                    {/* KPIs */}
                    <div className="grid grid-cols-3 gap-3">
                        <div className="rounded-xl bg-gradient-to-br from-violet-50 to-violet-100/50 dark:from-violet-900/20 dark:to-violet-900/10 p-3 text-center">
                            <p className="text-[10px] font-bold uppercase tracking-wide text-violet-500">Ventas</p>
                            <p className="text-sm font-extrabold text-slate-800 dark:text-white mt-0.5">{formatSoles(fila?.ventas ?? totalPEN)}</p>
                        </div>
                        <div className="rounded-xl bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-900/20 dark:to-blue-900/10 p-3 text-center">
                            <p className="text-[10px] font-bold uppercase tracking-wide text-blue-500">Documentos</p>
                            <p className="text-sm font-extrabold text-slate-800 dark:text-white mt-0.5">{formatNumero(fila?.documentos ?? detalle.length)}</p>
                        </div>
                        <div className="rounded-xl bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-900/20 dark:to-emerald-900/10 p-3 text-center">
                            <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-500">
                                {dimension.key === 'producto' ? 'Unidades' : 'Participación'}
                            </p>
                            <p className="text-sm font-extrabold text-slate-800 dark:text-white mt-0.5">
                                {dimension.key === 'producto'
                                    ? formatNumero(fila?.unidades ?? 0, 2)
                                    : `${formatNumero(fila?.participacion ?? 0, 2)} %`}
                            </p>
                        </div>
                    </div>

                    {/* Tabla comprobantes */}
                    {isLoading ? (
                        <div className="space-y-2">
                            {Array.from({ length: 6 }).map((_, i) => (
                                <div key={i} className="h-10 rounded-lg bg-slate-100 dark:bg-slate-800 animate-pulse" />
                            ))}
                        </div>
                    ) : detalle.length === 0 ? (
                        <p className="text-center text-sm text-gray-400 py-10">Sin comprobantes en este periodo</p>
                    ) : (
                        <div className="overflow-x-auto rounded-xl border border-slate-100 dark:border-slate-800">
                            <table className="w-full text-left border-collapse min-w-[560px]">
                                <thead>
                                    <tr className="text-[11px] font-bold uppercase tracking-wide text-slate-400 bg-slate-50/70 dark:bg-slate-900/40">
                                        <th className="py-2.5 px-3">Fecha</th>
                                        <th className="py-2.5 px-3">Comprobante</th>
                                        <th className="py-2.5 px-3">{dimension.key === 'cliente' ? 'Vendedor' : 'Cliente'}</th>
                                        <th className="py-2.5 px-3 text-right">Total S/</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {detalle.map((c) => (
                                        <tr key={c.id} className="border-t border-slate-50 dark:border-slate-800 text-sm">
                                            <td className="py-2.5 px-3 text-slate-500 whitespace-nowrap">{c.fecha}</td>
                                            <td className="py-2.5 px-3">
                                                <p className="font-semibold text-slate-700 dark:text-slate-200 whitespace-nowrap">{c.numero}</p>
                                                <div className="flex items-center gap-1.5 mt-0.5">
                                                    <span className="text-[11px] text-slate-400">{TIPO_DOC_LABEL[c.tipoDoc] ?? c.tipoDoc}</span>
                                                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${ESTADO_STYLE[c.estado] ?? 'bg-slate-100 text-slate-500'}`}>
                                                        {c.estado}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300">
                                                <p className="truncate max-w-[220px]">{dimension.key === 'cliente' ? c.vendedor : c.cliente}</p>
                                            </td>
                                            <td className="py-2.5 px-3 text-right whitespace-nowrap">
                                                <p className={`font-bold ${c.totalPEN < 0 ? 'text-rose-600' : 'text-slate-800 dark:text-white'}`}>{formatSoles(c.totalPEN)}</p>
                                                {c.moneda !== 'PEN' && (
                                                    <p className="text-[11px] text-slate-400">{c.moneda} {formatNumero(c.total, 2)}</p>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot>
                                    <tr className="border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/40 text-sm">
                                        <td className="py-2.5 px-3 font-bold text-slate-500" colSpan={3}>Total ({detalle.length} doc.)</td>
                                        <td className="py-2.5 px-3 text-right font-extrabold text-slate-800 dark:text-white">{formatSoles(totalPEN)}</td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
