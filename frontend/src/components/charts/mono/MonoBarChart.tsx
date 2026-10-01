import { useId } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { MONO_SERIES, chartTheme, fmtCompact } from './tokens';
import MonoTooltip from './MonoTooltip';

type MonoBarChartProps = {
  data: any[];
  index: string;
  categories: string[];
  colors?: string[];
  valueFormatter?: (v: number) => string;
  height?: number;
  /** 'columns' = barras verticales; 'bars' = barras horizontales (top-N). */
  orientation?: 'columns' | 'bars';
  showGrid?: boolean;
  className?: string;
  /** Ancho del eje de categorías en modo 'bars'. */
  categoryWidth?: number;
  xTickFormatter?: (v: any) => string;
};

/**
 * Barras premium monocromáticas: degradado vertical, extremos redondeados (radius),
 * grilla recesiva, animación de crecimiento, tooltip premium. Soporta columnas
 * (verticales) y barras horizontales (rankings top-N).
 */
export default function MonoBarChart({
  data,
  index,
  categories,
  colors = MONO_SERIES,
  valueFormatter = (v) => fmtCompact(v),
  height = 260,
  orientation = 'columns',
  showGrid = true,
  className = '',
  categoryWidth = 120,
  xTickFormatter,
}: MonoBarChartProps) {
  const t = chartTheme();
  const uid = useId().replace(/[:]/g, '');
  const isBars = orientation === 'bars';
  const single = categories.length === 1;

  return (
    <div className={className} style={{ width: '100%', height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout={isBars ? 'vertical' : 'horizontal'}
          margin={{ top: 8, right: isBars ? 12 : 6, left: isBars ? 0 : -8, bottom: 0 }}
          barCategoryGap={isBars ? '22%' : '28%'}
        >
          <defs>
            {categories.map((cat, i) => {
              const c = colors[i % colors.length];
              return (
                <linearGradient
                  key={cat}
                  id={`bar-${uid}-${i}`}
                  x1={isBars ? '0' : '0'}
                  y1={isBars ? '0' : '0'}
                  x2={isBars ? '1' : '0'}
                  y2={isBars ? '0' : '1'}
                >
                  <stop offset="0%" stopColor={c} stopOpacity={isBars ? 0.55 : 0.95} />
                  <stop offset="100%" stopColor={c} stopOpacity={isBars ? 1 : 0.55} />
                </linearGradient>
              );
            })}
          </defs>
          {showGrid && (
            <CartesianGrid
              horizontal={!isBars}
              vertical={isBars}
              stroke={t.grid}
              strokeDasharray="3 6"
            />
          )}
          {isBars ? (
            <>
              <XAxis
                type="number"
                hide
              />
              <YAxis
                type="category"
                dataKey={index}
                tickLine={false}
                axisLine={false}
                width={categoryWidth}
                tick={{ fill: t.tick, fontSize: 11, fontWeight: 600 }}
                tickFormatter={xTickFormatter}
              />
            </>
          ) : (
            <>
              <XAxis
                dataKey={index}
                tickLine={false}
                axisLine={false}
                tick={{ fill: t.tick, fontSize: 11, fontWeight: 500 }}
                tickMargin={8}
                interval="preserveStartEnd"
                tickFormatter={xTickFormatter}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                width={48}
                tick={{ fill: t.tick, fontSize: 11, fontWeight: 500 }}
                tickFormatter={(v) => fmtCompact(Number(v))}
              />
            </>
          )}
          <Tooltip
            cursor={{ fill: colors[0], fillOpacity: 0.06 }}
            content={<MonoTooltip valueFormatter={valueFormatter} hideSeriesName={single} />}
          />
          {categories.map((cat, i) => (
            <Bar
              key={cat}
              dataKey={cat}
              name={cat}
              fill={`url(#bar-${uid}-${i})`}
              radius={isBars ? [0, 6, 6, 0] : [6, 6, 0, 0]}
              maxBarSize={isBars ? 22 : 46}
              animationDuration={850}
              animationBegin={i * 100}
            >
              {/* permite color por celda si el dato trae `color` (una sola serie) */}
              {single &&
                data.map((d, di) => (
                  <Cell key={di} fill={d?.color ? d.color : `url(#bar-${uid}-${i})`} />
                ))}
            </Bar>
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
