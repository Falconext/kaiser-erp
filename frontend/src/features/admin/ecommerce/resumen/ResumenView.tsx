import { Icon } from '@iconify/react';
import { useResumenViewModel } from './useResumenViewModel';
import { ProductoResumen, fmt } from './ResumenModel';
import Select from '@/components/Select';
import { Calendar } from '@/components/Date';
import { useAuthStore } from '@/zustand/auth';
import moment from 'moment';
import KpiHero from '@/components/ui/KpiHero';

// ── Resumen del Negocio — estilo dashboard (Brix UI, tema claro) ──────────────
const ACCENT = 'var(--accent, #7551FF)';

const ESTADO_CONFIG = {
  bien:    { icon: '✅', label: 'Ganando bien',     color: 'text-emerald-600 dark:text-emerald-400' },
  alerta:  { icon: '⚠️', label: 'Poco margen',      color: 'text-amber-600 dark:text-amber-400' },
  perdida: { icon: '❌', label: 'Perdiendo dinero', color: 'text-rose-500 dark:text-rose-400' },
};

// Chips pastel de estado por producto — mismo lenguaje visual que el dashboard.
const ESTADO_PILL: Record<'bien' | 'alerta' | 'perdida', { bg: string; text: string; dot: string }> = {
  bien:    { bg: 'bg-emerald-50 dark:bg-emerald-900/20', text: 'text-emerald-600 dark:text-emerald-400', dot: 'bg-emerald-500' },
  alerta:  { bg: 'bg-amber-50 dark:bg-amber-900/20',   text: 'text-amber-600 dark:text-amber-400',   dot: 'bg-amber-500' },
  perdida: { bg: 'bg-rose-50 dark:bg-rose-900/20',    text: 'text-rose-500 dark:text-rose-400',    dot: 'bg-rose-500' },
};

function FilaWaterfall({ label, valor, esTotal = false, esNegativo = false, icon }: {
  label: string; valor: number; esTotal?: boolean; esNegativo?: boolean; icon?: string;
}) {
  if (!esTotal && valor === 0) return null;
  return (
    <div className={`flex items-center justify-between py-2.5 ${esTotal ? 'border-t-2 border-slate-200 dark:border-slate-700 mt-1 pt-4' : ''}`}>
      <div className="flex items-center gap-3">
        {icon && (
          <div className={`h-9 w-9 rounded-xl grid place-items-center shrink-0 ${
            esNegativo
              ? 'bg-rose-50 dark:bg-rose-900/20 text-rose-500 dark:text-rose-400'
              : esTotal
                ? (valor >= 0 ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400' : 'bg-rose-50 dark:bg-rose-900/20 text-rose-500 dark:text-rose-400')
                : 'bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400'
          }`}>
            <Icon icon={icon} className="text-lg" />
          </div>
        )}
        <span className={`${esTotal ? 'text-base font-bold text-slate-800 dark:text-white' : 'text-sm font-medium text-slate-600 dark:text-slate-300'}`}>
          {esNegativo && !esTotal ? <span className="text-slate-400 dark:text-gray-500 mr-1">−</span> : null}
          {label}
        </span>
      </div>
      <span className={`font-extrabold tabular-nums ${
        esTotal
          ? valor >= 0 ? 'text-emerald-600 dark:text-emerald-400 text-lg' : 'text-rose-500 dark:text-rose-400 text-lg'
          : esNegativo ? 'text-rose-500 dark:text-rose-400 text-sm' : 'text-slate-800 dark:text-white text-sm'
      }`}>
        {esNegativo && !esTotal ? `(${fmt(valor)})` : fmt(valor)}
      </span>
    </div>
  );
}

function FilaProducto({ p }: { p: ProductoResumen }) {
  const cfg = ESTADO_CONFIG[p.estado];
  const pill = ESTADO_PILL[p.estado];
  return (
    <div className="flex flex-col gap-3 py-3.5 border-b border-slate-50 dark:border-slate-700/50 last:border-0 sm:flex-row sm:items-center hover:bg-slate-50/60 dark:hover:bg-slate-800/50 -mx-4 sm:-mx-5 px-4 sm:px-5 rounded-xl transition-colors">
      <span className="text-xl w-6 text-center flex-shrink-0">{cfg.icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 truncate">{p.descripcion}</p>
        <p className="text-xs text-slate-400 dark:text-gray-500 mt-0.5">
          {p.unidades} uds. vendidas
          {p.ads > 0 && <span className="ml-2 text-amber-500 dark:text-amber-400 font-medium">· S/ {p.ads.toFixed(0)} en ads</span>}
        </p>
      </div>
      <div className="grid grid-cols-3 gap-3 sm:flex sm:items-center sm:text-right sm:flex-shrink-0 sm:gap-6">
        <div>
          <p className="text-[10px] text-slate-400 dark:text-gray-500 uppercase tracking-wide font-semibold">Ingresé</p>
          <p className="text-sm font-bold text-slate-700 dark:text-slate-200 mt-0.5">{fmt(p.ingresos)}</p>
        </div>
        <div className="sm:min-w-[100px]">
          <p className="text-[10px] text-slate-400 dark:text-gray-500 uppercase tracking-wide font-semibold">Me quedó</p>
          <p className={`text-sm font-extrabold mt-0.5 ${cfg.color}`}>{fmt(p.ganancia)}</p>
        </div>
        <div className="hidden sm:flex sm:justify-end">
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold ${pill.bg} ${pill.text}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${pill.dot}`} /> {cfg.label}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function ResumenView() {
  const { fechaInicio, setFechaInicio, fechaFin, setFechaFin, sedeId, setSedeId, data, isLoading } = useResumenViewModel();
  const r = data?.resumen;
  const { auth } = useAuthStore();
  const sedesOptions = [{ id: '', value: 'Todas las sedes' }, ...(auth?.sedes || []).map((s: any) => ({ id: s.id.toString(), value: s.nombre }))];

  const handleDate = (date: string, name: string) => {
    if (!moment(date, 'DD/MM/YYYY', true).isValid()) return;
    const formatted = moment(date, 'DD/MM/YYYY').format('YYYY-MM-DD');
    if (name === 'fechaInicio') setFechaInicio(formatted);
    else if (name === 'fechaFin') setFechaFin(formatted);
  };

  const handleRangoRapido = (id: any, val: string) => {
    const today = moment();
    if (val === 'HOY') {
      setFechaInicio(today.format('YYYY-MM-DD'));
      setFechaFin(today.format('YYYY-MM-DD'));
    } else if (val === 'AYER') {
      setFechaInicio(today.clone().subtract(1, 'day').format('YYYY-MM-DD'));
      setFechaFin(today.clone().subtract(1, 'day').format('YYYY-MM-DD'));
    } else if (val === 'SEMANA') {
      setFechaInicio(today.clone().subtract(7, 'days').format('YYYY-MM-DD'));
      setFechaFin(today.format('YYYY-MM-DD'));
    } else if (val === 'MES') {
      setFechaInicio(today.clone().startOf('month').format('YYYY-MM-DD'));
      setFechaFin(today.format('YYYY-MM-DD'));
    } else if (val === 'MES_ANTERIOR') {
      setFechaInicio(today.clone().subtract(1, 'month').startOf('month').format('YYYY-MM-DD'));
      setFechaFin(today.clone().subtract(1, 'month').endOf('month').format('YYYY-MM-DD'));
    }
  };

  const tituloFechas = fechaInicio === fechaFin
    ? moment(fechaInicio).format('DD MMM YYYY')
    : `${moment(fechaInicio).format('DD MMM')} al ${moment(fechaFin).format('DD MMM YYYY')}`;

  const estadoNegocio = r
    ? r.gananciaReal < 0
      ? { ...ESTADO_CONFIG.perdida, ...ESTADO_PILL.perdida }
      : r.margen < 10
        ? { ...ESTADO_CONFIG.alerta, ...ESTADO_PILL.alerta }
        : { ...ESTADO_CONFIG.bien, ...ESTADO_PILL.bien }
    : null;

  return (
    <div className="min-h-screen -m-5 p-5 bg-[#F7F8FB] dark:bg-[#0A0D14] font-jakarta">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-400 dark:text-gray-500 mb-5">
        <Icon icon="solar:home-smile-linear" className="text-base" />
        <span>Panel</span>
        <Icon icon="solar:alt-arrow-right-linear" className="text-xs" />
        <span>Mi Negocio</span>
        <Icon icon="solar:alt-arrow-right-linear" className="text-xs" />
        <span className="font-semibold" style={{ color: ACCENT }}>Resumen</span>
      </div>

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-5">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-[22px] font-extrabold text-slate-800 dark:text-white tracking-tight">Resumen del negocio</h1>
            {estadoNegocio && (
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${estadoNegocio.bg} ${estadoNegocio.text}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${estadoNegocio.dot}`} /> {estadoNegocio.label}
              </span>
            )}
          </div>
          <p className="text-sm text-slate-400 dark:text-gray-500 mt-0.5">Cómo van tus ganancias — {tituloFechas}</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-[0_2px_20px_rgba(15,23,42,0.05)] dark:shadow-none p-5 mb-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div>
          <Select
            error=""
            label="Rango Rápido"
            name="rangoRapido"
            onChange={handleRangoRapido}
            options={[
              { value: '', label: 'Personalizado' },
              { value: 'HOY', label: 'Hoy' },
              { value: 'AYER', label: 'Ayer' },
              { value: 'SEMANA', label: 'Últimos 7 días' },
              { value: 'MES', label: 'Este mes' },
              { value: 'MES_ANTERIOR', label: 'Mes pasado' },
            ]}
          />
        </div>
        <div>
          <Calendar text="Desde" name="fechaInicio" onChange={handleDate} value={moment(fechaInicio).format('DD/MM/YYYY')} />
        </div>
        <div>
          <Calendar text="Hasta" name="fechaFin" onChange={handleDate} value={moment(fechaFin).format('DD/MM/YYYY')} />
        </div>
        <div>
          <Select
            error=""
            label="Sede"
            name="sedeId"
            onChange={(id: any) => setSedeId(id)}
            options={sedesOptions}
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Icon icon="mdi:loading" className="animate-spin text-3xl" style={{ color: ACCENT }} />
        </div>
      ) : !r ? (
        <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-[0_2px_20px_rgba(15,23,42,0.05)] dark:shadow-none p-8 sm:p-16 text-center">
          <Icon icon="solar:chart-square-bold-duotone" className="text-5xl text-slate-200 dark:text-slate-700 mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-400 dark:text-gray-500">Sin datos para este rango de fechas</p>
        </div>
      ) : (
        <div className="space-y-5">
          {/* KPIs rápidos — diseño hero del dashboard */}
          <KpiHero
            cards={[
              { label: 'Ventas realizadas', value: `${r.totalVentas}`, mini: 'line' },
              { label: 'Ticket promedio', value: fmt(r.ticketPromedio), mini: 'donut' },
              { label: 'Productos vendidos', value: `${r.productosDistintos}`, mini: 'bars' },
            ]}
          />

          {/* Waterfall principal */}
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-[0_2px_20px_rgba(15,23,42,0.05)] dark:shadow-none p-5 sm:p-6">
            <div className="flex items-center gap-2 mb-2">
              <h2 className="text-base font-bold text-slate-800 dark:text-white">Cómo se reparte tu dinero</h2>
            </div>
            <p className="text-xs text-slate-400 dark:text-gray-500 mb-4">Desde lo que vendiste hasta lo que realmente te quedó</p>
            <FilaWaterfall label="Vendí en total" valor={r.ingresos} icon="solar:wallet-bold-duotone" />
            <FilaWaterfall label="Costo de mis productos" valor={r.costoMercaderia} esNegativo icon="solar:box-bold-duotone" />
            <FilaWaterfall label="Envíos y empaque" valor={r.costoEnvios} esNegativo icon="solar:delivery-bold-duotone" />
            <FilaWaterfall label="Lo que gasté en publicidad" valor={r.gastoPublicidad} esNegativo icon="solar:target-bold-duotone" />
            <FilaWaterfall label="Comisiones a vendedores" valor={r.comisiones} esNegativo icon="solar:users-group-rounded-bold-duotone" />
            <FilaWaterfall
              label={r.gananciaReal >= 0 ? `Me quedó a mí (${r.margen}%)` : `Estoy perdiendo dinero (${r.margen}%)`}
              valor={r.gananciaReal}
              esTotal
              icon={r.gananciaReal >= 0 ? 'solar:emoji-funny-circle-bold-duotone' : 'solar:emoji-sad-circle-bold-duotone'}
            />
          </div>

          {/* Lista de productos */}
          {data!.productos.length > 0 && (
            <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-[0_2px_20px_rgba(15,23,42,0.05)] dark:shadow-none overflow-hidden">
              <div className="px-5 sm:px-6 py-4 border-b border-slate-100 dark:border-slate-700">
                <h2 className="text-base font-bold text-slate-800 dark:text-white">Mis productos vendidos</h2>
                <p className="text-xs text-slate-400 dark:text-gray-500 mt-0.5">Ordenados por lo que más vendiste en este periodo</p>
              </div>
              <div className="px-4 sm:px-5 py-1">
                {data!.productos.map(p => <FilaProducto key={p.id} p={p} />)}
              </div>

              {/* Leyenda */}
              <div className="px-4 sm:px-6 py-3.5 bg-slate-50/70 dark:bg-slate-900/40 border-t border-slate-100 dark:border-slate-700 flex gap-3 sm:gap-5 flex-wrap">
                {Object.entries(ESTADO_CONFIG).map(([k, v]) => (
                  <span key={k} className="text-xs text-slate-500 dark:text-gray-400 font-medium flex items-center gap-1.5">
                    <span>{v.icon}</span> {v.label}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
