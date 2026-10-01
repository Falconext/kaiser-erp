import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { MONO_SERIES, chartTheme, fmtCompact } from './tokens';
import MonoTooltip from './MonoTooltip';

type MonoLineChartProps = {
  data: any[];
  index: string;
  categories: string[];
  colors?: string[];
  valueFormatter?: (v: number) => string;
  height?: number;
  showYAxis?: boolean;
  showGrid?: boolean;
  xTickFormatter?: (v: any) => string;
  className?: string;
};

/** Línea spline premium monocromática, fina (2px), con dots al hover y animación de dibujo. */
export default function MonoLineChart({
  data,
  index,
  categories,
  colors = MONO_SERIES,
  valueFormatter = (v) => fmtCompact(v),
  height = 260,
  showYAxis = true,
  showGrid = true,
  xTickFormatter,
  className = '',
}: MonoLineChartProps) {
  const t = chartTheme();
  const single = categories.length === 1;

  return (
    <div className={className} style={{ width: '100%', height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 10, left: showYAxis ? -8 : 6, bottom: 0 }}>
          {showGrid && (
            <CartesianGrid vertical={false} stroke={t.grid} strokeDasharray="3 6" />
          )}
          <XAxis
            dataKey={index}
            tickLine={false}
            axisLine={false}
            tick={{ fill: t.tick, fontSize: 11, fontWeight: 500 }}
            tickMargin={10}
            minTickGap={20}
            tickFormatter={xTickFormatter}
          />
          {showYAxis && (
            <YAxis
              tickLine={false}
              axisLine={false}
              width={52}
              tick={{ fill: t.tick, fontSize: 11, fontWeight: 500 }}
              tickFormatter={(v) => fmtCompact(Number(v))}
            />
          )}
          <Tooltip
            cursor={{ stroke: colors[0], strokeWidth: 1, strokeDasharray: '4 4', strokeOpacity: 0.5 }}
            content={<MonoTooltip valueFormatter={valueFormatter} hideSeriesName={single} />}
          />
          {categories.map((cat, i) => {
            const c = colors[i % colors.length];
            return (
              <Line
                key={cat}
                type="monotone"
                dataKey={cat}
                name={cat}
                stroke={c}
                strokeWidth={2.25}
                dot={data.length <= 1 ? ({ r: 4.5, strokeWidth: 2, stroke: t.surface, fill: c } as any) : false}
                activeDot={{ r: 4.5, strokeWidth: 2, stroke: t.surface, fill: c }}
                animationDuration={950}
                animationBegin={i * 120}
              />
            );
          })}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
