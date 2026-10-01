import { useId } from 'react';
import { Area, AreaChart, ResponsiveContainer } from 'recharts';
import { ACCENT } from './tokens';

type MonoSparklineProps = {
  data: any[];
  /** Clave numérica a graficar. */
  category: string;
  color?: string;
  height?: number;
  className?: string;
};

/** Sparkline minimalista para tarjetas KPI: área con degradado, sin ejes ni grilla. */
export default function MonoSparkline({
  data,
  category,
  color = ACCENT,
  height = 48,
  className = '',
}: MonoSparklineProps) {
  const uid = useId().replace(/[:]/g, '');
  return (
    <div className={className} style={{ width: '100%', height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={`spark-${uid}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.35} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey={category}
            stroke={color}
            strokeWidth={2}
            fill={`url(#spark-${uid})`}
            dot={false}
            animationDuration={800}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
