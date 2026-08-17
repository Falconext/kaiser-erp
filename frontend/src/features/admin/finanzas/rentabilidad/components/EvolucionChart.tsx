import { AreaChart } from '@tremor/react';
import { Icon } from '@iconify/react';
import { EvolucionPoint, formatCurrency, getMesLabel } from '../RentabilidadModel';

interface EvolucionChartProps {
    evolucion: EvolucionPoint[];
}

export default function EvolucionChart({ evolucion }: EvolucionChartProps) {
    // Determine if last point is negative to color Ganancia Neta series
    const lastPoint = evolucion[evolucion.length - 1];
    const lastNeta = lastPoint?.gananciaNeta ?? 0;
    const netaColor = lastNeta >= 0 ? 'emerald' : 'rose';

    const chartData = evolucion.map(p => ({
        mes: `${getMesLabel(p.mes)} ${String(p.anio).slice(-2)}`,
        'Ventas Netas': p.ventasNetas,
        'Ganancia Bruta': p.gananciaBruta,
        'Ganancia Neta': p.gananciaNeta,
    }));

    const valueFormatter = (v: number) => formatCurrency(v);

    return (
        <div className="bg-white dark:bg-[#111827] rounded-3xl p-6 shadow-sm border border-gray-100/50 dark:border-transparent">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center">
                        <Icon icon="solar:graph-up-bold-duotone" className="text-emerald-600 dark:text-emerald-400 text-xl" />
                    </div>
                    <div>
                        <h3 className="font-bold text-gray-900 dark:text-white text-base">Evolución Financiera</h3>
                        <p className="text-xs text-gray-400 dark:text-gray-500">Últimos 6 meses</p>
                    </div>
                </div>

                {/* Legend */}
                <div className="flex items-center gap-3 flex-wrap">
                    <LegendDot color="bg-indigo-500" label="Ventas Netas" />
                    <LegendDot color="bg-blue-500" label="Ganancia Bruta" />
                    <LegendDot
                        color={lastNeta >= 0 ? 'bg-emerald-500' : 'bg-rose-500'}
                        label="Ganancia Neta"
                    />
                </div>
            </div>

            {/* Chart */}
            {chartData.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 text-center">
                    <Icon icon="solar:chart-2-bold-duotone" className="text-4xl text-gray-200 dark:text-slate-700 mb-3" />
                    <p className="text-sm text-gray-400 dark:text-gray-500">Sin datos de evolución disponibles</p>
                </div>
            ) : (
                <AreaChart
                    className="h-64 mt-2"
                    data={chartData}
                    index="mes"
                    categories={['Ventas Netas', 'Ganancia Bruta', 'Ganancia Neta']}
                    colors={['indigo', 'blue', netaColor]}
                    curveType="monotone"
                    showLegend={false}
                    showGridLines={false}
                    showAnimation
                    yAxisWidth={72}
                    valueFormatter={valueFormatter}
                />
            )}
        </div>
    );
}

function LegendDot({ color, label }: { color: string; label: string }) {
    return (
        <span className="flex items-center gap-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-slate-800 px-2.5 py-1 rounded-lg">
            <span className={`w-2 h-2 rounded-full ${color} flex-shrink-0`} />
            {label}
        </span>
    );
}
