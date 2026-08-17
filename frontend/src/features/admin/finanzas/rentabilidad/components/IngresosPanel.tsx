import { Icon } from '@iconify/react';
import { IngresoManual, TIPOS_INGRESO, formatCurrency, esFinanciamiento } from '../RentabilidadModel';

interface IngresosPanelProps {
    ingresos: IngresoManual[];
    onAgregar: () => void;
    onEditar: (ingreso: IngresoManual) => void;
    onEliminar: (id: number) => void;
}

export default function IngresosPanel({ ingresos, onAgregar, onEditar, onEliminar }: IngresosPanelProps) {
    return (
        <div className="bg-white dark:bg-[#111827] rounded-3xl p-6 shadow-sm border border-gray-100/50 dark:border-transparent max-h-[360px] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center">
                        <Icon icon="solar:wallet-money-bold-duotone" className="text-emerald-600 dark:text-emerald-400 text-xl" />
                    </div>
                    <div>
                        <h3 className="font-bold text-gray-900 dark:text-white text-base">Ingresos Manuales</h3>
                        <p className="text-xs text-gray-400 dark:text-gray-500">{ingresos.length} registros</p>
                    </div>
                </div>
                <button
                    onClick={onAgregar}
                    className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-semibold px-3 py-2 rounded-xl transition-colors shadow-sm shadow-emerald-200 dark:shadow-emerald-900/20"
                >
                    <Icon icon="solar:add-circle-bold" className="text-base" />
                    Agregar ingreso
                </button>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto space-y-2 min-h-0 pr-1">
                {ingresos.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                        <div className="w-16 h-16 rounded-3xl bg-gray-50 dark:bg-slate-800 flex items-center justify-center mb-4">
                            <Icon icon="solar:wallet-money-bold-duotone" className="text-3xl text-gray-300 dark:text-slate-600" />
                        </div>
                        <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">Sin ingresos registrados</p>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Agrega ingresos manuales de este mes</p>
                        <button
                            onClick={onAgregar}
                            className="mt-4 flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 text-sm font-semibold transition-colors"
                        >
                            <Icon icon="solar:add-circle-bold" />
                            Registrar primer ingreso
                        </button>
                    </div>
                ) : (
                    ingresos.map(ingreso => (
                        <div
                            key={ingreso.id}
                            className="group flex items-center gap-3 p-3 rounded-2xl bg-gray-50 dark:bg-slate-800/50 hover:bg-emerald-50 dark:hover:bg-emerald-900/10 transition-colors"
                        >
                            <div className="w-9 h-9 rounded-xl bg-white dark:bg-slate-700 flex items-center justify-center flex-shrink-0 shadow-sm group-hover:scale-110 transition-transform">
                                <Icon icon="solar:arrow-down-bold-duotone" className="text-base text-emerald-500 dark:text-emerald-400" />
                            </div>

                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{ingreso.concepto}</p>
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className={`text-xs font-medium ${esFinanciamiento(ingreso.tipo) ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                                        {TIPOS_INGRESO.find(t => t.key === ingreso.tipo)?.label ?? ingreso.tipo}
                                    </span>
                                    {ingreso.fecha && (
                                        <span className="text-xs text-gray-400 dark:text-gray-500">
                                            {new Date(ingreso.fecha).toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', timeZone: 'UTC' })}
                                        </span>
                                    )}
                                    {esFinanciamiento(ingreso.tipo) && (
                                        <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/30 px-1.5 py-0.5 rounded-full">
                                            <Icon icon="solar:info-circle-bold" className="text-[10px]" />
                                            No entra al P&L
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div className="flex-shrink-0 text-right">
                                <span className={`text-sm font-bold tabular-nums ${esFinanciamiento(ingreso.tipo) ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                                    {formatCurrency(Number(ingreso.monto))}
                                </span>
                            </div>

                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                                <button
                                    onClick={() => onEditar(ingreso)}
                                    className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"
                                    title="Editar"
                                >
                                    <Icon icon="solar:pen-bold" className="text-sm" />
                                </button>
                                <button
                                    onClick={() => onEliminar(ingreso.id)}
                                    className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors"
                                    title="Eliminar"
                                >
                                    <Icon icon="solar:trash-bin-trash-bold" className="text-sm" />
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {ingresos.length > 0 && (() => {
                const operacional = ingresos.filter(i => !esFinanciamiento(i.tipo)).reduce((s, i) => s + Number(i.monto), 0);
                const financiamiento = ingresos.filter(i => esFinanciamiento(i.tipo)).reduce((s, i) => s + Number(i.monto), 0);
                return (
                    <div className="mt-4 pt-4 border-t border-gray-100 dark:border-slate-800 space-y-1.5">
                        {financiamiento > 0 && (
                            <div className="flex justify-between items-center">
                                <span className="text-xs text-amber-500 dark:text-amber-400 font-medium flex items-center gap-1">
                                    <Icon icon="solar:info-circle-bold" className="text-xs" />
                                    Financiamiento (no P&L)
                                </span>
                                <span className="text-sm font-semibold text-amber-500 dark:text-amber-400 tabular-nums">
                                    {formatCurrency(financiamiento)}
                                </span>
                            </div>
                        )}
                        {operacional > 0 && (
                            <div className="flex justify-between items-center">
                                <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                                    <Icon icon="solar:check-circle-bold" className="text-xs" />
                                    Operacional (en P&L)
                                </span>
                                <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">
                                    {formatCurrency(operacional)}
                                </span>
                            </div>
                        )}
                        <div className="flex justify-between items-center pt-1 border-t border-gray-100 dark:border-slate-800">
                            <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">Total registrado</span>
                            <span className="text-base font-bold text-gray-900 dark:text-white tabular-nums">
                                {formatCurrency(ingresos.reduce((s, i) => s + Number(i.monto), 0))}
                            </span>
                        </div>
                    </div>
                );
            })()}
        </div>
    );
}
