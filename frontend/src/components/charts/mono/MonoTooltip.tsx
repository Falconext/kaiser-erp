import { chartTheme } from './tokens';

type TooltipEntry = {
  name?: string;
  value?: number | string;
  color?: string;
  dataKey?: string | number;
  payload?: any;
};

type MonoTooltipProps = {
  active?: boolean;
  label?: string | number;
  payload?: TooltipEntry[];
  valueFormatter?: (v: number) => string;
  /** Oculta el nombre de la serie cuando solo hay una. */
  hideSeriesName?: boolean;
  labelFormatter?: (label: any) => string;
};

/**
 * Tooltip premium para Recharts: tarjeta redondeada con sombra, punto de color por
 * serie, valor formateado. Tema claro/oscuro.
 */
export default function MonoTooltip({
  active,
  label,
  payload,
  valueFormatter = (v) => `${v}`,
  hideSeriesName = false,
  labelFormatter,
}: MonoTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const t = chartTheme();
  const shownLabel = labelFormatter ? labelFormatter(label) : label;

  return (
    <div
      className="min-w-[132px] rounded-xl px-3 py-2 backdrop-blur-md"
      style={{
        background: t.tooltipBg,
        border: `1px solid ${t.tooltipBorder}`,
        boxShadow: '0 8px 28px -8px rgba(15,23,42,0.28)',
      }}
    >
      {shownLabel != null && shownLabel !== '' && (
        <div
          className="mb-1.5 text-[11px] font-bold tracking-tight"
          style={{ color: t.tooltipInk }}
        >
          {String(shownLabel)}
        </div>
      )}
      <div className="flex flex-col gap-1">
        {payload.map((entry, i) => (
          <div key={i} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5">
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{ backgroundColor: entry.color || '#7551FF' }}
              />
              {!hideSeriesName && (
                <span
                  className="text-[11px] font-medium"
                  style={{ color: t.tooltipMuted }}
                >
                  {entry.name}
                </span>
              )}
            </span>
            <span
              className="text-[12px] font-bold tabular-nums"
              style={{ color: t.tooltipInk }}
            >
              {valueFormatter(Number(entry.value))}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
