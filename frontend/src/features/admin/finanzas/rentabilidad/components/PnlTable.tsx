import { Icon } from '@iconify/react';
import { PnlResponse, OtroIngreso, formatCurrency, formatPercent, getCategoriaLabel, getCategoriaIcon, TIPOS_INGRESO } from '../RentabilidadModel';

interface PnlTableProps {
    pnl: PnlResponse;
}

interface PnlRowProps {
    label: string;
    icon?: string;
    value: number;
    reference: number;
    indent?: boolean;
    isSeparator?: boolean;
    isResult?: boolean;
    margin?: number;
    colorClass?: string;
    barColor?: string;
}

function PnlRow({ label, icon, value, reference, indent, isResult, margin, colorClass, barColor }: PnlRowProps) {
    const barWidth = reference > 0 ? Math.min(100, (Math.abs(value) / reference) * 100) : 0;
    const effectiveBarColor = barColor ?? 'bg-indigo-400';

    return (
        <div className={`flex items-center gap-3 py-2.5 px-3 rounded-xl transition-colors ${isResult ? (colorClass ?? '') : 'hover:bg-gray-50 dark:hover:bg-slate-800/50'} ${isResult ? 'mt-1' : ''}`}>
            {/* Icon or indent */}
            <div className="w-6 flex justify-center flex-shrink-0">
                {icon ? (
                    <Icon icon={icon} className={`text-base ${isResult ? 'text-white' : 'text-gray-400 dark:text-gray-500'}`} />
                ) : indent ? (
                    <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-slate-600 inline-block mt-0.5" />
                ) : null}
            </div>

            {/* Label */}
            <div className="flex-1 min-w-0">
                <span className={`text-sm font-medium truncate block ${isResult ? 'text-white font-semibold' : 'text-gray-700 dark:text-gray-300'}`}>
                    {label}
                </span>
            </div>

            {/* Progress bar */}
            <div className="w-28 hidden sm:block flex-shrink-0">
                <div className="h-1.5 w-full bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div
                        className={`h-full rounded-full transition-all duration-500 ${isResult ? 'bg-white/40' : effectiveBarColor}`}
                        style={{ width: `${barWidth}%` }}
                    />
                </div>
            </div>

            {/* Margin % if applicable */}
            <div className="w-14 text-right flex-shrink-0">
                {margin !== undefined ? (
                    <span className={`text-xs font-semibold ${isResult ? 'text-white/80' : 'text-gray-400 dark:text-gray-500'}`}>
                        {formatPercent(margin)}
                    </span>
                ) : (
                    <span className="text-xs text-transparent select-none">0.0%</span>
                )}
            </div>

            {/* Amount */}
            <div className="w-28 text-right flex-shrink-0">
                <span className={`text-sm font-semibold tabular-nums ${isResult ? 'text-white' : 'text-gray-900 dark:text-white'}`}>
                    {formatCurrency(value)}
                </span>
            </div>
        </div>
    );
}

function Divider() {
    return <div className="my-1 border-t border-dashed border-gray-200 dark:border-slate-700" />;
}

function getTipoIngresoIcon(tipo: string): string {
    return TIPOS_INGRESO.find(t => t.key === tipo)?.icon ?? 'solar:wallet-money-bold-duotone';
}

function getTipoIngresoLabel(tipo: string): string {
    return TIPOS_INGRESO.find(t => t.key === tipo)?.label ?? tipo;
}

export default function PnlTable({ pnl }: PnlTableProps) {
    const otrosIngresos = pnl.otrosIngresos ?? 0;
    const otrosIngresosDetalle: OtroIngreso[] = pnl.otrosIngresosDetalle ?? [];
    const ingresosTotales = pnl.ventasNetas + otrosIngresos;
    const ref = ingresosTotales || 1;

    return (
        <div className="bg-white dark:bg-[#111827] rounded-3xl p-6 shadow-sm border border-gray-100/50 dark:border-transparent h-full">
            {/* Header */}
            <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center">
                    <Icon icon="solar:chart-2-bold-duotone" className="text-indigo-600 dark:text-indigo-400 text-xl" />
                </div>
                <div>
                    <h3 className="font-bold text-gray-900 dark:text-white text-base">Estado de Resultados</h3>
                    <p className="text-xs text-gray-400 dark:text-gray-500">Waterfall P&amp;L</p>
                </div>
            </div>

            {/* Column headers */}
            <div className="flex items-center gap-3 px-3 mb-1">
                <div className="w-6 flex-shrink-0" />
                <div className="flex-1 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">Concepto</div>
                <div className="w-28 hidden sm:block flex-shrink-0 text-xs text-right font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">Distribución</div>
                <div className="w-14 text-right flex-shrink-0 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">%</div>
                <div className="w-28 text-right flex-shrink-0 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">Monto</div>
            </div>

            <Divider />

            {/* Ventas netas */}
            <PnlRow
                label="Ventas Netas"
                icon="solar:cart-large-4-bold-duotone"
                value={pnl.ventasNetas}
                reference={ref}
                barColor="bg-indigo-500"
            />

            {/* Otros Ingresos (manuales operacionales) */}
            {otrosIngresos > 0 && (
                <>
                    <div className="mt-1 mb-0.5 px-3">
                        <span className="text-xs font-semibold text-emerald-500 dark:text-emerald-400 uppercase tracking-wide">Otros Ingresos</span>
                    </div>
                    {otrosIngresosDetalle.map((i, idx) => (
                        <PnlRow
                            key={idx}
                            label={`${getTipoIngresoLabel(i.tipo)} — ${i.concepto}`}
                            icon={getTipoIngresoIcon(i.tipo)}
                            value={i.monto}
                            reference={ref}
                            indent
                            barColor="bg-emerald-400"
                        />
                    ))}
                    <PnlRow
                        label="Total Ingresos"
                        icon="solar:wallet-money-bold-duotone"
                        value={ingresosTotales}
                        reference={ref}
                        isResult
                        colorClass="bg-teal-500 dark:bg-teal-600 rounded-xl"
                        barColor="bg-teal-300"
                    />
                </>
            )}

            {/* Costo de mercadería */}
            <PnlRow
                label="Costo Real de Productos"
                icon="solar:box-bold-duotone"
                value={pnl.costoMercaderia}
                reference={ref}
                indent
                barColor="bg-rose-400"
            />
            <PnlRow
                label="Costo base vendido"
                value={pnl.costoBaseProductos ?? 0}
                reference={ref}
                indent
                barColor="bg-slate-400"
            />
            <PnlRow
                label="Costos fijos (envío/empaque)"
                value={pnl.costosFijosProducto ?? 0}
                reference={ref}
                indent
                barColor="bg-amber-400"
            />

            <Divider />

            {/* Ganancia Bruta */}
            <PnlRow
                label="Ganancia Bruta"
                icon="solar:chart-bold-duotone"
                value={pnl.gananciaBruta}
                reference={ref}
                isResult
                margin={pnl.margenBruto}
                colorClass="bg-blue-500 dark:bg-blue-600 rounded-xl"
                barColor="bg-blue-300"
            />

            {/* Gastos por categoría */}
            {pnl.gastosPorCategoria.length > 0 && (
                <>
                    <div className="mt-2 mb-1 px-3">
                        <span className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">Gastos Operativos</span>
                    </div>
                    {pnl.gastosPorCategoria.map((g, i) => (
                        <PnlRow
                            key={i}
                            label={g.etiqueta ? `${getCategoriaLabel(g.categoria)} — ${g.etiqueta}` : getCategoriaLabel(g.categoria)}
                            icon={getCategoriaIcon(g.categoria)}
                            value={g.monto}
                            reference={ref}
                            indent
                            barColor="bg-amber-400"
                        />
                    ))}
                </>
            )}

            <Divider />

            {/* Ganancia Neta */}
            <PnlRow
                label="Ganancia Neta"
                icon={pnl.gananciaNeta >= 0 ? 'solar:graph-up-bold-duotone' : 'solar:graph-down-bold-duotone'}
                value={pnl.gananciaNeta}
                reference={ref}
                isResult
                margin={pnl.margenNeto}
                colorClass={pnl.gananciaNeta >= 0
                    ? 'bg-emerald-500 dark:bg-emerald-600 rounded-xl'
                    : 'bg-rose-500 dark:bg-rose-600 rounded-xl'}
                barColor={pnl.gananciaNeta >= 0 ? 'bg-emerald-300' : 'bg-rose-300'}
            />

            {/* Empty state for gastos */}
            {pnl.gastosPorCategoria.length === 0 && otrosIngresos === 0 && (
                <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-3">
                    Sin gastos operativos registrados este mes
                </p>
            )}
        </div>
    );
}
