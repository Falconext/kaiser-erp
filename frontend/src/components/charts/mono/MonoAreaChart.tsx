import { useId } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { MONO_SERIES, chartTheme, fmtCompact } from './tokens';
import MonoTooltip from './MonoTooltip';

type MonoAreaChartProps = {
  data: any[];
  /** Clave del eje X (categoría temporal). */
  index: string;
  /** Claves de las series a graficar (1..n). */
  categories: string[];
  /** Colores por serie (default: paleta mono). */
  colors?: string[];
  valueFormatter?: (v: number) => string;
  height?: number;
  showYAxis?: boolean;
  showGrid?: boolean;
  /** Formatea la etiqueta del eje X (ej. fechas). */
  xTickFormatter?: (v: any) => string;
  curveType?: 'monotone' | 'linear' | 'natural';
  className?: string;
};

/**
 * Área premium monocromática: degradado suave bajo la curva, línea fina (2px),
 * grilla horizontal recesiva, ejes discretos, animación de dibujo, tooltip premium.
 */
export default function MonoAreaChart({
  data,
  index,
  categories,
  colors = MONO_SERIES,
  valueFormatter = (v) => fmtCompact(v),
  height = 260,
  showYAxis = true,
  showGrid = true,
  xTickFormatter,
  curveType = 'monotone',
  className = '',
}: MonoAreaChartProps) {
  const t = chartTheme();
  const uid = useId().replace(/[:]/g, '');
  const single = categories.length === 1;

  return (
    <div className={className} style={{ width: '100%', height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 6, right: 6, left: showYAxis ? -8 : 6, bottom: 0 }}>
          <defs>
            {categories.map((cat, i) => {
              const c = colors[i % colors.length];
              return (
                <linearGradient key={cat} id={`area-${uid}-${i}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={c} stopOpacity={single ? 0.32 : 0.24} />
                  <stop offset="100%" stopColor={c} stopOpacity={0.02} />
                </linearGradient>
              );
            })}
          </defs>
          {showGrid && (
            <CartesianGrid
              vertical={false}
              stroke={t.grid}
              strokeDasharray="3 6"
            />
          )}
          <XAxis
            dataKey={index}
            tickLine={false}
            axisLine={false}
            tick={{ fill: t.tick, fontSize: 11, fontWeight: 500 }}
            tickMargin={10}
            minTickGap={24}
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
              <Area
                key={cat}
                type={curveType}
                dataKey={cat}
                name={cat}
                stroke={c}
                strokeWidth={2}
                fill={`url(#area-${uid}-${i})`}
                // con 1 solo punto no hay área que dibujar: mostramos un dot para que no quede vacío
                dot={data.length <= 1 ? ({ r: 4, strokeWidth: 2, stroke: t.surface, fill: c } as any) : false}
                activeDot={{ r: 4, strokeWidth: 2, stroke: t.surface, fill: c }}
                animationDuration={900}
                animationBegin={i * 120}
              />
            );
          })}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
