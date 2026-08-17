import React from 'react';
import { Icon } from '@iconify/react';
import { useProductModalViewModel } from '../useProductModalViewModel';

type ViewProps = ReturnType<typeof useProductModalViewModel>;

export const ProductFinancialAnalysis: React.FC<{ vm: ViewProps }> = ({ vm }) => {
    const { isRestaurante, isFarmacia, formValues, isEdit, tipoAjusteStock, cantidadAjuste, stockOriginal } = vm;

    if (isRestaurante || isFarmacia) {
        return null;
    }

    const precioUnitario = Number(formValues?.precioUnitario || 0);
    const costoUnitario = Number(formValues?.costoUnitario || 0);
    // Símbolo según la moneda del producto (soles o dólares).
    const simbolo = (formValues as any)?.moneda === 'USD' ? '$' : 'S/';
    // El precio de venta se digita CON IGV, pero el IGV no es ganancia (va a
    // SUNAT): la rentabilidad se calcula sobre el valor de venta SIN IGV.
    // Solo los productos gravados (afectación 10) llevan 18%.
    const esGravado = String(formValues?.tipoAfectacionIGV ?? '10') === '10';
    const precioSinIgv = esGravado ? precioUnitario / 1.18 : precioUnitario;
    const ganancia = precioSinIgv - costoUnitario;
    const margen = precioSinIgv > 0 && costoUnitario > 0 ? (ganancia / precioSinIgv) * 100 : 0;

    const stockParaProyeccion = isEdit && tipoAjusteStock !== 'ninguno'
        ? (tipoAjusteStock === 'reemplazar' ? cantidadAjuste
            : tipoAjusteStock === 'sumar' ? stockOriginal + cantidadAjuste
                : tipoAjusteStock === 'restar' ? Math.max(0, stockOriginal - cantidadAjuste)
                    : stockOriginal)
        : Number(formValues?.stock || 0);

    const margenColor = margen > 30
        ? 'text-emerald-600 dark:text-emerald-400'
        : margen > 10
            ? 'text-amber-500 dark:text-amber-400'
            : 'text-red-500 dark:text-red-400';

    const margenBg = margen > 30
        ? 'bg-emerald-50 dark:bg-emerald-900/20'
        : margen > 10
            ? 'bg-amber-50 dark:bg-amber-900/20'
            : 'bg-red-50 dark:bg-red-900/20';

    const gananciaPositiva = ganancia > 0;

    return (
        <div className="h-full flex flex-col justify-between rounded-xl border border-gray-100 dark:border-white/10 bg-gradient-to-br from-white to-gray-50/30 dark:from-slate-800/60 dark:to-slate-900/40 p-4 space-y-3">
            <div>
                {/* Header */}
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-sm shrink-0">
                        <Icon icon="solar:chart-bold-duotone" className="text-white" width={16} />
                    </div>
                    <div>
                        <h5 className="text-sm font-bold text-gray-900 dark:text-white leading-tight">Resumen de Margen</h5>
                        <p className="text-[10px] text-gray-500 dark:text-gray-400">Rentabilidad por unidad</p>
                    </div>
                </div>

                {/* Métricas principales */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
                    {/* Precio con IGV (solo, ocupa las dos columnas arriba) */}
                    <div className="sm:col-span-2 bg-gray-50 dark:bg-slate-700/50 rounded-lg p-2 text-center flex flex-col justify-center">
                        <div className="w-6 h-6 rounded-md bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center mx-auto mb-1">
                            <Icon icon="solar:tag-price-bold" className="text-blue-600 dark:text-blue-400" width={12} />
                        </div>
                        <p className="text-base font-bold text-gray-900 dark:text-white leading-none">{simbolo} {precioUnitario.toFixed(2)}</p>
                        <p className="text-[9px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mt-1">{esGravado ? 'Precio con IGV' : 'Precio'}</p>
                    </div>

                    {/* Precio sin IGV (primera celda de la fila de dos) */}
                    {esGravado && (
                        <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-2 text-center flex flex-col justify-center">
                            <div className="w-6 h-6 rounded-md bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center mx-auto mb-1">
                                <Icon icon="solar:tag-price-bold" className="text-blue-600 dark:text-blue-400" width={12} />
                            </div>
                            <p className="text-sm font-bold text-gray-900 dark:text-white leading-none">{simbolo} {precioSinIgv.toFixed(2)}</p>
                            <p className="text-[9px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mt-1">Precio sin IGV</p>
                        </div>
                    )}

                    {/* Costo */}
                    <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-2 text-center flex flex-col justify-center">
                        <div className="w-6 h-6 rounded-md bg-slate-100 dark:bg-slate-700 flex items-center justify-center mx-auto mb-1">
                            <Icon icon="solar:box-bold" className="text-slate-500 dark:text-slate-400" width={12} />
                        </div>
                        <p className="text-sm font-bold text-gray-900 dark:text-white leading-none">{simbolo} {costoUnitario.toFixed(2)}</p>
                        <p className="text-[9px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mt-1">Costo</p>
                    </div>

                    {/* Ganancia */}
                    <div className={`rounded-lg p-2 text-center flex flex-col justify-center ${gananciaPositiva ? 'bg-emerald-50/80 dark:bg-emerald-900/20' : 'bg-red-50/80 dark:bg-red-900/20'}`}>
                        <div className={`w-6 h-6 rounded-md flex items-center justify-center mx-auto mb-1 ${gananciaPositiva ? 'bg-emerald-100 dark:bg-emerald-900/40' : 'bg-red-100 dark:bg-red-900/40'}`}>
                            <Icon icon={gananciaPositiva ? 'solar:arrow-up-bold' : 'solar:arrow-down-bold'} className={gananciaPositiva ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'} width={12} />
                        </div>
                        <p className={`text-sm font-bold leading-none ${gananciaPositiva ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>
                            {gananciaPositiva ? '+' : ''}{simbolo} {ganancia.toFixed(2)}
                        </p>
                        <p className="text-[9px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mt-1">Ganancia</p>
                    </div>

                    {/* Margen */}
                    <div className={`rounded-lg p-2 text-center flex flex-col justify-center ${margenBg}`}>
                        <div className="w-6 h-6 rounded-md bg-white/60 dark:bg-slate-700/60 flex items-center justify-center mx-auto mb-1">
                            <Icon icon="solar:pie-chart-bold" className={margenColor} width={12} />
                        </div>
                        <p className={`text-sm font-bold leading-none ${margenColor}`}>{margen.toFixed(1)}%</p>
                        <p className="text-[9px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mt-1">Margen</p>
                    </div>
                </div>
            </div>

            {/* Proyección con stock */}
            {stockParaProyeccion > 0 && precioSinIgv > 0 && costoUnitario > 0 && (
                <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-3 mt-auto">
                    <p className="text-[9px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                        <Icon icon="solar:layers-bold" width={10} />
                        Proyección stock {isEdit && tipoAjusteStock !== 'ninguno' ? 'resultante' : 'actual'} ({stockParaProyeccion})
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <div className="text-center">
                            <p className="text-xs font-bold text-gray-700 dark:text-gray-200">{simbolo} {(precioSinIgv * stockParaProyeccion).toFixed(2)}</p>
                            <p className="text-[8px] text-gray-400 dark:text-gray-500 mt-0.5">Venta (sin IGV)</p>
                        </div>
                        <div className="text-center border-x border-blue-100/50 dark:border-blue-900/30">
                            <p className="text-xs font-bold text-red-500 dark:text-red-400">{simbolo} {(costoUnitario * stockParaProyeccion).toFixed(2)}</p>
                            <p className="text-[8px] text-gray-400 dark:text-gray-500 mt-0.5">Inversión</p>
                        </div>
                        <div className="text-center">
                            <p className={`text-xs font-bold ${gananciaPositiva ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>
                                {simbolo} {(ganancia * stockParaProyeccion).toFixed(2)}
                            </p>
                            <p className="text-[8px] text-gray-400 dark:text-gray-500 mt-0.5">Ganancia</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
