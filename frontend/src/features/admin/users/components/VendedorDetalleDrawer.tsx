import React from 'react';
import { Icon } from '@iconify/react';
import { AreaChart } from '@tremor/react';
import { VendedorDetalle } from '@/zustand/vendedores';
import { TIPO_DOC_LABEL } from '../VendedoresModel';

interface Props {
    open: boolean;
    detalle: VendedorDetalle | null;
    isLoading: boolean;
    fechaInicio: string;
    fechaFin: string;
    onClose: () => void;
}

export function VendedorDetalleDrawer({ open, detalle, isLoading, fechaInicio, fechaFin, onClose }: Props) {
    const totalVentas = detalle?.comprobantes.reduce((s, c) => s + c.total, 0) ?? 0;
    const numComp = detalle?.comprobantes.length ?? 0;
    const ticketProm = numComp > 0 ? totalVentas / numComp : 0;

    const chartData = (detalle?.chartData ?? []).map((p) => ({
        date: p.fecha,
        'Ventas (S/)': p.total,
    }));

    return (
        <>
            {/* Overlay */}
            <div
                onClick={onClose}
                className={`fixed inset-0 top-[-30px] z-40 bg-black/40 transition-opacity duration-300 ${open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
            />

            {/* Drawer */}
            <div className={`fixed top-[-30px] right-0 z-50 h-full w-full max-w-xl bg-white dark:bg-[#0F1117] shadow-2xl flex flex-col transition-transform duration-300 ${open ? 'translate-x-0' : 'translate-x-full'}`}>
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-slate-800">
                    <div>
                        <h2 className="text-base font-bold text-gray-900 dark:text-white">
                            {detalle?.usuario?.nombre ?? 'Vendedor'}
                        </h2>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{fechaInicio} → {fechaFin}</p>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors">
                        <Icon icon="solar:close-circle-bold-duotone" width={22} className="text-gray-400" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {isLoading ? (
                        <div className="flex items-center justify-center h-40">
                            <Icon icon="mdi:loading" className="animate-spin text-3xl text-blue-500" />
                        </div>
                    ) : !detalle ? (
                        <p className="text-center text-gray-400 py-10">Sin datos</p>
                    ) : (
                        <>
                            {/* KPIs */}
                            <div className="grid grid-cols-3 gap-3">
                                <div className="rounded-xl border border-gray-100 dark:border-transparent bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-900/20 dark:to-blue-900/10 p-3 text-center">
                                    <p className="text-[10px] uppercase tracking-wide text-blue-600 dark:text-blue-400 font-semibold">Total vendido</p>
                                    <p className="text-lg font-bold text-blue-700 dark:text-blue-300 mt-1">S/ {totalVentas.toFixed(2)}</p>
                                </div>
                                <div className="rounded-xl border border-gray-100 dark:border-transparent bg-gradient-to-br from-violet-50 to-violet-100/50 dark:from-violet-900/20 dark:to-violet-900/10 p-3 text-center">
                                    <p className="text-[10px] uppercase tracking-wide text-violet-600 dark:text-violet-400 font-semibold">Comprobantes</p>
                                    <p className="text-lg font-bold text-violet-700 dark:text-violet-300 mt-1">{numComp}</p>
                                </div>
                                <div className="rounded-xl border border-gray-100 dark:border-transparent bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-900/20 dark:to-emerald-900/10 p-3 text-center">
                                    <p className="text-[10px] uppercase tracking-wide text-emerald-600 dark:text-emerald-400 font-semibold">Ticket prom.</p>
                                    <p className="text-lg font-bold text-emerald-700 dark:text-emerald-300 mt-1">S/ {ticketProm.toFixed(2)}</p>
                                </div>
                            </div>

                            {/* Gráfico evolución */}
                            {chartData.length > 0 && (
                                <div className="rounded-xl border border-gray-100 dark:border-transparent bg-white dark:bg-slate-900/40 p-4">
                                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                                        <Icon icon="solar:chart-2-bold-duotone" width={16} className="text-blue-500" />
                                        Evolución de ventas
                                    </h3>
                                    <AreaChart
                                        data={chartData}
                                        index="date"
                                        categories={['Ventas (S/)']}
                                        colors={['blue']}
                                        valueFormatter={(v) => `S/ ${v.toFixed(2)}`}
                                        showLegend={false}
                                        showGridLines={false}
                                        className="h-40"
                                    />
                                </div>
                            )}

                            {/* Productos vendidos por este vendedor */}
                            <div>
                                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                                    <Icon icon="solar:bag-smile-bold-duotone" width={16} className="text-amber-500" />
                                    Productos vendidos
                                </h3>
                                <div className="overflow-x-auto rounded-xl border border-gray-100 dark:border-slate-800">
                                    <table className="w-full text-xs" style={{ fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif' }}>
                                        <thead className="bg-gray-50 dark:bg-slate-800/60">
                                            <tr>
                                                <th className="px-3 py-2 text-left font-semibold text-gray-500 dark:text-gray-400 tracking-wide">Producto</th>
                                                <th className="px-3 py-2 text-right font-semibold text-gray-500 dark:text-gray-400 tracking-wide">Cantidad</th>
                                                <th className="px-3 py-2 text-right font-semibold text-gray-500 dark:text-gray-400 tracking-wide">Monto</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-50 dark:divide-slate-800">
                                            {(detalle.productos ?? []).map((p, idx) => (
                                                <tr key={p.productoId ?? `d-${idx}`} className="hover:bg-gray-50 dark:hover:bg-slate-800/40 transition-colors">
                                                    <td className="px-3 py-2 text-gray-700 dark:text-gray-300 max-w-[220px] truncate">{p.descripcion}</td>
                                                    <td className="px-3 py-2 text-right font-bold text-gray-800 dark:text-gray-200 whitespace-nowrap">{p.cantidad}</td>
                                                    <td className="px-3 py-2 text-right font-semibold text-gray-600 dark:text-gray-400 whitespace-nowrap">S/ {p.monto.toFixed(2)}</td>
                                                </tr>
                                            ))}
                                            {(detalle.productos ?? []).length === 0 && (
                                                <tr>
                                                    <td colSpan={3} className="px-3 py-6 text-center text-gray-400">Sin productos vendidos en este período</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Tabla de comprobantes */}
                            <div>
                                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                                    <Icon icon="solar:document-bold-duotone" width={16} className="text-violet-500" />
                                    Comprobantes del período
                                </h3>
                                <div className="overflow-x-auto rounded-xl border border-gray-100 dark:border-slate-800">
                                    <table className="w-full text-xs" style={{ fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif' }}>
                                        <thead className="bg-gray-50 dark:bg-slate-800/60">
                                            <tr>
                                                <th className="px-3 py-2 text-left font-semibold text-gray-500 dark:text-gray-400 tracking-wide">Nº</th>
                                                <th className="px-3 py-2 text-left font-semibold text-gray-500 dark:text-gray-400 tracking-wide">Cliente</th>
                                                <th className="px-3 py-2 text-left font-semibold text-gray-500 dark:text-gray-400 tracking-wide">Fecha</th>
                                                <th className="px-3 py-2 text-right font-semibold text-gray-500 dark:text-gray-400 tracking-wide">Total</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-50 dark:divide-slate-800">
                                            {detalle.comprobantes.map((c) => (
                                                <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/40 transition-colors">
                                                    <td className="px-3 py-2 text-gray-600 dark:text-gray-400 whitespace-nowrap">
                                                        {TIPO_DOC_LABEL[c.tipoDoc] ?? c.tipoDoc} {c.serie}-{String(c.correlativo).padStart(8, '0')}
                                                    </td>
                                                    <td className="px-3 py-2 text-gray-700 dark:text-gray-300 max-w-[120px] truncate">{c.clienteNombre}</td>
                                                    <td className="px-3 py-2 text-gray-500 dark:text-gray-400 whitespace-nowrap">
                                                        {new Date(c.fechaEmision).toLocaleDateString('es-PE')}
                                                    </td>
                                                    <td className="px-3 py-2 text-right font-semibold text-gray-800 dark:text-gray-200 whitespace-nowrap">
                                                        S/ {c.total.toFixed(2)}
                                                    </td>
                                                </tr>
                                            ))}
                                            {detalle.comprobantes.length === 0 && (
                                                <tr>
                                                    <td colSpan={4} className="px-3 py-6 text-center text-gray-400">Sin comprobantes en este período</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </>
    );
}
