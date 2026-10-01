import { ReactNode } from 'react';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { MONO_SEGMENTS, chartTheme, fmtCompact } from './tokens';
import MonoTooltip from './MonoTooltip';

type MonoDonutChartProps = {
  data: any[];
  /** Clave numérica del valor. */
  category: string;
  /** Clave del nombre del segmento. */
  index: string;
  colors?: string[];
  valueFormatter?: (v: number) => string;
  height?: number;
  /** Texto superior del centro (ej. "Total"). */
  centerLabel?: ReactNode;
  /** Valor grande del centro (si se omite, usa la suma). */
  centerValue?: ReactNode;
  className?: string;
};

/**
 * Dona premium monocromática: tintes del acento, gap de 2px entre segmentos
 * (paddingAngle + anillo de superficie), etiqueta central, animación, tooltip.
 */
export default function MonoDonutChart({
  data,
  category,
  index,
  colors = MONO_SEGMENTS,
  valueFormatter = (v) => fmtCompact(v),
  height = 240,
  centerLabel,
  centerValue,
  className = '',
}: MonoDonutChartProps) {
  const t = chartTheme();
  const total = data.reduce((s, d) => s + Number(d?.[category] || 0), 0);
  const shownCenter =
    centerValue != null ? centerValue : valueFormatter(total);

  return (
    <div className={'relative ' + className} style={{ width: '100%', height }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Tooltip
            content={
              <MonoTooltip
                valueFormatter={valueFormatter}
                hideSeriesName={false}
              />
            }
          />
          <Pie
            data={data}
            dataKey={category}
            nameKey={index}
            innerRadius="66%"
            outerRadius="92%"
            paddingAngle={data.length > 1 ? 3 : 0}
            cornerRadius={6}
            stroke={t.surface}
            strokeWidth={2}
            startAngle={90}
            endAngle={-270}
            animationDuration={850}
          >
            {data.map((d, i) => (
              <Cell
                key={i}
                fill={d?.color ? d.color : colors[i % colors.length]}
              />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      {/* Etiqueta central */}
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        {centerLabel && (
          <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
            {centerLabel}
          </span>
        )}
        <span className="text-xl font-black tracking-tight text-slate-900 dark:text-white">
          {shownCenter}
        </span>
      </div>
    </div>
  );
}
