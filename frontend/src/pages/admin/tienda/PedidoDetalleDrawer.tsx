import { Icon } from '@iconify/react';
import type { PedidoTiendaAdmin } from '@/features/admin/tienda/usePedidosViewModel';

const money = (v: number) => `S/ ${v.toFixed(2)}`;

interface Props {
    open: boolean;
    pedido: PedidoTiendaAdmin | null;
    onClose: () => void;
}

export function PedidoDetalleDrawer({ open, pedido, onClose }: Props) {
    return (
        <>
            <div
                onClick={onClose}
                className={`fixed inset-0 top-[-30px] z-40 bg-black/40 transition-opacity duration-300 ${open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
            />
            <div className={`fixed top-[-30px] right-0 z-50 h-full w-full max-w-lg bg-white dark:bg-[#0F1117] shadow-2xl flex flex-col transition-transform duration-300 ${open ? 'translate-x-0' : 'translate-x-full'}`}>
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-slate-800 flex-shrink-0">
                    <div>
                        <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                            {pedido?.codigoSeguimiento ?? '—'}
                        </h2>
                        <p className="text-xs text-gray-400 mt-0.5">
                            {pedido?.clienteNombre} · {pedido?.clienteTelefono}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
                    >
                        <Icon icon="solar:close-circle-bold-duotone" width={22} className="text-gray-400" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-5">
                    {!pedido ? (
                        <p className="text-center text-gray-400 py-10">Sin datos</p>
                    ) : (
                        <>
                            {/* KPIs */}
                            <div className="grid grid-cols-3 gap-3">
                                {[
                                    { label: 'Total', value: money(pedido.total), icon: 'solar:dollar-minimalistic-bold-duotone', color: 'blue' },
                                    { label: 'Pagado', value: money(pedido.montoPagado), icon: 'solar:wallet-money-bold-duotone', color: 'emerald' },
                                    { label: 'Por cobrar', value: money(pedido.saldoPendiente), icon: 'solar:bill-list-bold-duotone', color: pedido.saldoPendiente > 0 ? 'amber' : 'slate' },
                                ].map(k => (
                                    <div key={k.label} className={`rounded-xl border border-${k.color}-100 dark:border-${k.color}-900/30 bg-gradient-to-br from-${k.color}-50 to-${k.color}-100/50 dark:from-${k.color}-900/20 dark:to-${k.color}-900/10 p-3 text-center`}>
                                        <Icon icon={k.icon} className={`text-2xl text-${k.color}-500 mx-auto mb-1`} />
                                        <p className="text-xs text-gray-500 dark:text-gray-400">{k.label}</p>
                                        <p className="text-sm font-semibold text-gray-900 dark:text-white mt-0.5">{k.value}</p>
                                    </div>
                                ))}
                            </div>

                            {/* Info */}
                            <div className="rounded-xl border border-gray-100 dark:border-slate-800 divide-y divide-gray-50 dark:divide-slate-800">
                                {[
                                    { label: 'Vendedor', value: pedido.vendedorNombre },
                                    { label: 'Método de pago', value: pedido.medioPago },
                                    { label: 'Tipo entrega', value: pedido.tipoEntrega === 'ENVIO' ? 'Envío a domicilio' : 'Recojo en tienda' },
                                    { label: 'Dirección', value: pedido.clienteDireccion || '—' },
                                    { label: 'Referencia', value: pedido.clienteReferencia || '—' },
                                    { label: 'Observaciones', value: pedido.observaciones || '—' },
                                    { label: 'Notas internas', value: pedido.notasInternas || '—' },
                                ].map(row => (
                                    <div key={row.label} className="flex justify-between items-start px-4 py-2.5 gap-4">
                                        <span className="text-xs text-gray-400 whitespace-nowrap">{row.label}</span>
                                        <span className="text-xs text-gray-700 dark:text-gray-200 text-right">{row.value}</span>
                                    </div>
                                ))}
                            </div>

                            {/* Productos */}
                            <div>
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
                                    Productos ({pedido.items.length})
                                </p>
                                <div className="space-y-2">
                                    {pedido.items.map(item => (
                                        <div key={item.id} className="flex items-center gap-3 rounded-xl border border-gray-100 dark:border-transparent bg-gray-50 dark:bg-slate-900 p-3">
                                            {item.producto?.imagenUrl ? (
                                                <img src={item.producto.imagenUrl} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                                            ) : (
                                                <div className="w-10 h-10 rounded-lg bg-gray-200 dark:bg-slate-700 flex items-center justify-center flex-shrink-0">
                                                    <Icon icon="solar:box-linear" className="text-gray-400 text-base" />
                                                </div>
                                            )}
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs text-gray-700 dark:text-gray-200 uppercase truncate">
                                                    {item.producto?.descripcion || 'Producto'}
                                                </p>
                                                <p className="text-[11px] text-gray-400 mt-0.5">
                                                    {item.cantidad} × {money(item.precioUnit)}
                                                </p>
                                            </div>
                                            <p className="text-xs text-gray-700 dark:text-gray-200 flex-shrink-0">
                                                {money(item.subtotal)}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Totales */}
                            <div className="rounded-xl border border-gray-100 dark:border-slate-800 p-4 space-y-2">
                                <div className="flex justify-between text-xs text-gray-500">
                                    <span>Subtotal</span>
                                    <span>{money(pedido.total - pedido.costoEnvio)}</span>
                                </div>
                                {pedido.costoEnvio > 0 && (
                                    <div className="flex justify-between text-xs text-gray-500">
                                        <span>Costo envío</span>
                                        <span>{money(pedido.costoEnvio)}</span>
                                    </div>
                                )}
                                <div className="flex justify-between text-sm font-semibold text-gray-900 dark:text-white pt-2 border-t border-gray-100 dark:border-slate-800">
                                    <span>Total</span>
                                    <span>{money(pedido.total)}</span>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </>
    );
}
