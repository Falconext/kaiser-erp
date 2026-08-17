import React, { useEffect, useState } from "react";
import { Icon } from '@iconify/react';
import Modal from "@/components/Modal";
import InputPro from "@/components/InputPro";
import { useComprasStore } from "@/zustand/compras";
import moment from "moment";

type Props = {
    isOpen: boolean;
    onClose: () => void;
    compraId: number | null;
};

const ModalDetalleCompra = ({ isOpen, onClose, compraId }: Props) => {
    const { obtenerCompra, compraDetalle } = useComprasStore();
    const [localCompra, setLocalCompra] = useState<any>(null);
    const [isInitialLoading, setIsInitialLoading] = useState(true);

    useEffect(() => {
        const fetch = async () => {
            if (isOpen && compraId) {
                setIsInitialLoading(true);
                await obtenerCompra(compraId);
                setIsInitialLoading(false);
            }
        };
        fetch();
    }, [isOpen, compraId, obtenerCompra]);

    // Sync local state to prevent stale data flash
    useEffect(() => {
        if (isOpen && compraDetalle && compraDetalle.id === compraId) {
            setLocalCompra(compraDetalle);
        }
    }, [isOpen, compraDetalle, compraId]);

    const isLoading = isInitialLoading || !localCompra || localCompra.id !== compraId;

    // Safety check for calculations
    const total = localCompra ? Number(localCompra.total) : 0;
    const subtotal = total / 1.18;
    const igv = total - subtotal;

    const SkeletonBlock = ({ className = "" }) => (
        <div className={`animate-pulse bg-gray-200 dark:bg-slate-800 rounded-lg ${className}`}></div>
    );

    return (
        <Modal
            isOpenModal={isOpen}
            closeModal={onClose}
            title={localCompra ? `Detalle de Compra: ${localCompra.serie}-${localCompra.numero}` : "Detalle de Compra"}
            width="900px"
            icon="solar:bill-list-bold-duotone"
            iconClass="bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400"
        >
            <div className="p-4 space-y-6 bg-white dark:bg-[#111827] min-h-[500px]">
                {/* Header Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-5 rounded-2xl border border-gray-100 dark:border-transparent bg-gray-50/30 dark:bg-slate-900/20">
                    {isLoading ? (
                        <>
                            {[1, 2, 3, 4, 5, 6].map(i => (
                                <div key={i} className="space-y-2">
                                    <SkeletonBlock className="h-3 w-16" />
                                    <SkeletonBlock className="h-10 w-full" />
                                </div>
                            ))}
                        </>
                    ) : (
                        <>
                            <div className="flex flex-col">
                                <label className="text-[10px] text-gray-400 font-bold uppercase mb-1.5 ml-1">Proveedor</label>
                                <div className="p-3 bg-white dark:bg-slate-800 rounded-xl text-sm font-bold text-gray-700 dark:text-gray-200 border border-gray-200/60 dark:border-slate-700 shadow-sm truncate">
                                    {localCompra?.proveedor?.nombre || localCompra?.proveedor?.nroDoc || '-'}
                                </div>
                            </div>
                            <InputPro label="Serie" name="serie" value={localCompra?.serie} disabled isLabel />
                            <InputPro label="Número" name="numero" value={localCompra?.numero} disabled isLabel />
                            <InputPro label="Fecha Emisión" name="fechaEmision" value={moment(localCompra?.fechaEmision).format('DD/MM/YYYY')} disabled isLabel />
                            <InputPro
                                label="Fecha Vencimiento"
                                name="fechaVencimiento"
                                value={localCompra?.fechaVencimiento ? moment(localCompra?.fechaVencimiento).format('DD/MM/YYYY') : '-'}
                                disabled
                                isLabel
                            />
                            <div className="col-span-1 md:col-span-2 lg:col-span-1 flex flex-col">
                                <label className="text-[10px] text-gray-400 font-bold uppercase mb-1.5 ml-1">Estados</label>
                                <div className="flex gap-2">
                                    <span className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider ${localCompra?.estado === 'ACTIVO' ? 'bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-500/20' : 'bg-rose-100 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-200/50 dark:border-rose-500/20'}`}>
                                        {localCompra?.estado}
                                    </span>
                                    <span className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider ${localCompra?.estadoPago === 'PAGADO' || localCompra?.estadoPago === 'COMPLETADO' ? 'bg-blue-100 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-200/50 dark:border-blue-500/20' : 'bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-200/50 dark:border-amber-500/20'}`}>
                                        {localCompra?.estadoPago === 'COMPLETADO' ? 'PAGADO' : localCompra?.estadoPago}
                                    </span>
                                </div>
                            </div>
                        </>
                    )}
                </div>

                {/* Items Table */}
                <div className="space-y-3">
                    <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2 ml-1">
                        <Icon icon="solar:box-bold-duotone" className="text-violet-500" />
                        Productos Comprados
                    </h3>
                    <div className="overflow-x-auto border border-gray-100 dark:border-transparent rounded-2xl shadow-sm">
                        <table className="w-full min-w-[640px] text-sm text-left">
                            <thead className="bg-gray-50/50 dark:bg-slate-900/50 text-gray-500 dark:text-gray-400 font-bold border-b border-gray-100 dark:border-slate-800">
                                <tr>
                                    <th className="px-4 py-3 uppercase text-[10px] tracking-wider">Descripción</th>
                                    <th className="px-4 py-3 text-center uppercase text-[10px] tracking-wider">Cant.</th>
                                    <th className="px-4 py-3 text-right uppercase text-[10px] tracking-wider">Costo Unit.</th>
                                    <th className="px-4 py-3 text-right uppercase text-[10px] tracking-wider">Subtotal</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50 dark:divide-slate-800/50">
                                {isLoading ? (
                                    [1, 2, 3].map(i => (
                                        <tr key={i}>
                                            <td className="px-4 py-4"><SkeletonBlock className="h-4 w-48" /></td>
                                            <td className="px-4 py-4"><SkeletonBlock className="h-4 w-12 mx-auto" /></td>
                                            <td className="px-4 py-4"><SkeletonBlock className="h-4 w-20 ml-auto" /></td>
                                            <td className="px-4 py-4"><SkeletonBlock className="h-4 w-24 ml-auto" /></td>
                                        </tr>
                                    ))
                                ) : (!localCompra?.detalles || localCompra.detalles.length === 0) ? (
                                    <tr>
                                        <td colSpan={4} className="px-4 py-12 text-center text-gray-400 italic">
                                            No hay productos registrados en esta compra
                                        </td>
                                    </tr>
                                ) : localCompra.detalles.map((item: any, idx: number) => (
                                    <tr key={idx} className="hover:bg-gray-50/50 dark:hover:bg-slate-800/30 transition-colors">
                                        <td className="px-4 py-4">
                                            <div className="font-bold text-gray-800 dark:text-gray-200">{item.descripcion || item.producto?.descripcion}</div>
                                            {(item.lote || item.fechaVencimiento) && (
                                                <div className="flex gap-3 mt-1">
                                                    {item.lote && <span className="text-[10px] bg-gray-100 dark:bg-slate-800 px-1.5 py-0.5 rounded font-medium text-gray-500">Lote: {item.lote}</span>}
                                                    {item.fechaVencimiento && <span className="text-[10px] bg-gray-100 dark:bg-slate-800 px-1.5 py-0.5 rounded font-medium text-gray-500">Vence: {moment(item.fechaVencimiento).format('DD/MM/YYYY')}</span>}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-4 py-4 text-center font-medium text-gray-600 dark:text-gray-400">{item.cantidad}</td>
                                        <td className="px-4 py-4 text-right font-medium text-gray-600 dark:text-gray-400">S/ {Number(item.precioUnitario).toFixed(2)}</td>
                                        <td className="px-4 py-4 text-right font-black text-gray-900 dark:text-white">S/ {Number(item.total || (item.cantidad * item.precioUnitario)).toFixed(2)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Footer Totals */}
                <div className="flex justify-end pt-2">
                    <div className="w-full md:w-72 space-y-3 p-5 rounded-2xl border border-gray-100 dark:border-transparent bg-gray-50/30 dark:bg-slate-900/20 shadow-sm">
                        {isLoading ? (
                            <>
                                <SkeletonBlock className="h-4 w-full" />
                                <SkeletonBlock className="h-4 w-full" />
                                <SkeletonBlock className="h-8 w-full mt-4" />
                            </>
                        ) : (
                            <>
                                <div className="flex justify-between text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    <span>Op. Gravada</span>
                                    <span className="text-gray-700 dark:text-gray-200">S/ {subtotal.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    <span>IGV (18%)</span>
                                    <span className="text-gray-700 dark:text-gray-200">S/ {igv.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-xl font-black text-gray-900 dark:text-white border-t border-gray-200 dark:border-slate-700 pt-3 mt-3">
                                    <span className="text-sm uppercase tracking-tighter self-center">Total Final</span>
                                    <span className="text-violet-600 dark:text-violet-400">S/ {total.toFixed(2)}</span>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </Modal>
    );
};

export default ModalDetalleCompra;
