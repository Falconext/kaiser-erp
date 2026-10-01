import { ReactNode } from 'react';
import { PolarAngleAxis, RadialBar, RadialBarChart, ResponsiveContainer } from 'recharts';
import { ACCENT, chartTheme } from './tokens';

type MonoGaugeProps = {
  /** Valor 0-100. */
  value: number;
  /** 'ring' = círculo completo; 'arc' = semicírculo (velocímetro). */
  variant?: 'ring' | 'arc';
  color?: string;
  height?: number;
  centerLabel?: ReactNode;
  /** Contenido grande del centro (default: `${value}%`). */
  centerValue?: ReactNode;
  className?: string;
};

/**
 * Medidor radial premium monocromático: pista recesiva + arco de acento con
 * extremos redondeados, valor central. Animado.
 */
export default function MonoGauge({
  value,
  variant = 'ring',
  color = ACCENT,
  height = 200,
  centerLabel,
  centerValue,
  className = '',
}: MonoGaugeProps) {
  const t = chartTheme();
  const v = Math.max(0, Math.min(100, Number(value) || 0));
  const isArc = variant === 'arc';
  const startAngle = isArc ? 180 : 90;
  const endAngle = isArc ? 0 : -270;

  return (
    <div className={'relative ' + className} style={{ width: '100%', height }}>
      <ResponsiveContainer width="100%" height="100%">
        <RadialBarChart
          innerRadius="72%"
          outerRadius="100%"
          startAngle={startAngle}
          endAngle={endAngle}
          data={[{ value: v }]}
          barSize={12}
        >
          <defs>
            <linearGradient id="gauge-grad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.7} />
              <stop offset="100%" stopColor={color} stopOpacity={1} />
            </linearGradient>
          </defs>
          <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
          <RadialBar
            dataKey="value"
            cornerRadius={12}
            fill="url(#gauge-grad)"
            background={{ fill: t.grid } as any}
            animationDuration={900}
          />
        </RadialBarChart>
      </ResponsiveContainer>
      <div
        className={
          'pointer-events-none absolute inset-0 flex flex-col items-center ' +
          (isArc ? 'justify-end pb-2' : 'justify-center')
        }
      >
        <span className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
          {centerValue != null ? centerValue : `${Math.round(v)}%`}
        </span>
        {centerLabel && (
          <span className="mt-0.5 text-[11px] font-semibold text-slate-400 dark:text-slate-500">
            {centerLabel}
          </span>
        )}
      </div>
    </div>
  );
}
