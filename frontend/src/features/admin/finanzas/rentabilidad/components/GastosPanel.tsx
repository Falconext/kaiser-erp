import { Icon } from '@iconify/react';
import { GastoOperativo, formatCurrency, formatMonto, formatDate, getCategoriaLabel, getCategoriaIcon, MEDIOS_PAGO_GASTO } from '../RentabilidadModel';

/** Convierte un gasto a soles: si es USD usa su tipo de cambio; si no, el monto tal cual. */
function gastoEnSoles(gasto: GastoOperativo): number {
    if (gasto.moneda === 'USD' && gasto.tipoCambio) {
        return Number(gasto.monto) * Number(gasto.tipoCambio);
    }
    return Number(gasto.monto);
}

function medioPagoLabel(key?: string | null): string | null {
    if (!key) return null;
    return MEDIOS_PAGO_GASTO.find(m => m.key === key)?.label ?? key;
}

interface GastosPanelProps {
    gastos: GastoOperativo[];
    onAgregar: () => void;
    onEditar: (gasto: GastoOperativo) => void;
    onEliminar: (id: number) => void;
}

export default function GastosPanel({ gastos, onAgregar, onEditar, onEliminar }: GastosPanelProps) {
    return (
        <div className="bg-white dark:bg-[#111827] rounded-3xl p-6 shadow-sm border border-gray-100/50 dark:border-transparent max-h-[360px] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center">
                        <Icon icon="solar:bill-list-bold-duotone" className="text-amber-600 dark:text-amber-400 text-xl" />
                    </div>
                    <div>
                        <h3 className="font-bold text-gray-900 dark:text-white text-base">Gastos Operativos</h3>
                        <p className="text-xs text-gray-400 dark:text-gray-500">{gastos.length} registros</p>
                    </div>
                </div>
                <button
                    onClick={onAgregar}
                    className="flex items-center gap-1.5 btn-accent text-xs font-semibold px-3 py-2 rounded-xl transition-colors shadow-sm shadow-black/20"
                >
                    <Icon icon="solar:add-circle-bold" className="text-base" />
                    Agregar gasto
                </button>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto space-y-2 min-h-0 pr-1">
                {gastos.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                        <div className="w-16 h-16 rounded-3xl bg-gray-50 dark:bg-slate-800 flex items-center justify-center mb-4">
                            <Icon icon="solar:bill-list-bold-duotone" className="text-3xl text-gray-300 dark:text-slate-600" />
                        </div>
                        <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">Sin gastos registrados</p>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Agrega tus gastos operativos de este mes</p>
                        <button
                            onClick={onAgregar}
                            className="mt-4 flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 text-sm font-semibold transition-colors"
                        >
                            <Icon icon="solar:add-circle-bold" />
                            Registrar primer gasto
                        </button>
                    </div>
                ) : (
                    gastos.map(gasto => (
                        <div
                            key={gasto.id}
                            className="group flex items-center gap-3 p-3 rounded-2xl bg-gray-50 dark:bg-slate-800/50 hover:bg-indigo-50 dark:hover:bg-indigo-900/10 transition-colors"
                        >
                            {/* Category icon */}
                            <div className="w-9 h-9 rounded-xl bg-white dark:bg-slate-700 flex items-center justify-center flex-shrink-0 shadow-sm group-hover:scale-110 transition-transform">
                                <Icon
                                    icon={getCategoriaIcon(gasto.categoria)}
                                    className="text-base text-amber-500 dark:text-amber-400"
                                />
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                                    {gasto.etiqueta
                                        ? gasto.etiqueta
                                        : getCategoriaLabel(gasto.categoria)
                                    }
                                </p>
                                <div className="flex items-center gap-2 flex-wrap">
                                    {gasto.etiqueta && (
                                        <span className="text-xs text-indigo-500 dark:text-indigo-400 font-medium">
                                            {getCategoriaLabel(gasto.categoria)}
                                        </span>
                                    )}
                                    {(gasto.fecha || gasto.fechaInicio) && (
                                        <span className="text-xs text-gray-400 dark:text-gray-500 font-medium">
                                            {gasto.recurrenteDiario
                                                ? `Desde ${formatDate(gasto.fechaInicio ?? gasto.fecha ?? '')}`
                                                : formatDate(gasto.fecha ?? '')}
                                        </span>
                                    )}
                                    {gasto.recurrenteDiario && (
                                        <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300">
                                            Diario
                                        </span>
                                    )}
                                    {gasto.recurrenteDiario && gasto.fechaFin && (
                                        <span className="text-xs text-gray-400 dark:text-gray-500">
                                            hasta {formatDate(gasto.fechaFin)}
                                        </span>
                                    )}
                                    {medioPagoLabel(gasto.medioPago) && (
                                        <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                                            {medioPagoLabel(gasto.medioPago)}
                                        </span>
                                    )}
                                    {gasto.descripcion && (
                                        <span className="text-xs text-gray-400 dark:text-gray-500 truncate max-w-[120px]">
                                            {gasto.descripcion}
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Amount */}
                            <div className="flex-shrink-0 text-right">
                                <span className="text-sm font-bold text-gray-900 dark:text-white tabular-nums">
                                    {formatMonto(Number(gasto.monto), gasto.moneda)}
                                </span>
                                {gasto.moneda === 'USD' && gasto.tipoCambio && (
                                    <p className="text-[10px] font-medium text-gray-400 dark:text-gray-500 tabular-nums">
                                        ≈ {formatCurrency(gastoEnSoles(gasto))}
                                    </p>
                                )}
                                {gasto.recurrenteDiario && (
                                    <p className="text-[10px] font-bold text-indigo-500 dark:text-indigo-300">por día</p>
                                )}
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                                <button
                                    onClick={() => onEditar(gasto)}
                                    className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"
                                    title="Editar"
                                >
                                    <Icon icon="solar:pen-bold" className="text-sm" />
                                </button>
                                <button
                                    onClick={() => onEliminar(gasto.id)}
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

            {/* Footer total */}
            {gastos.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-100 dark:border-slate-800 flex justify-between items-center">
                    <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">Monto configurado</span>
                    <span className="text-base font-bold text-gray-900 dark:text-white tabular-nums">
                        {formatCurrency(gastos.reduce((sum, g) => sum + gastoEnSoles(g), 0))}
                    </span>
                </div>
            )}
        </div>
    );
}
