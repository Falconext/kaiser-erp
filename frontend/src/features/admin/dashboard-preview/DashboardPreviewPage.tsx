import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Icon } from '@iconify/react'
import moment from 'moment'
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useDashboardStore, type IDashboardState } from '@/zustand/dashboard'
import { useAuthStore } from '@/zustand/auth'
import { BRAND } from '@/lib/branding'

/**
 * Dashboard piloto — adaptación del estilo de referencia (header azul marino +
 * navbar horizontal morado + tarjetas limpias). Página autocontenida: trae su
 * propio "shell", así que NO se renderiza dentro de AdminLayout. Ruta: /dashboard-nuevo
 *
 * Chrome (header/navbar/acentos) usa el color de marca (BRAND.primaryColor).
 * Las series de datos usan la paleta validada CVD-safe de la skill dataviz;
 * el área de "Ventas" es serie única → usa el violeta de marca.
 */

// Paleta validada (dataviz) — categórica, modo claro. Refuerzo por labels directos.
const SERIES = ['#2a78d6', '#1baf7a', '#eda100', '#008300']
const HEADER_BG = '#0f1120' // azul marino del header, fijo (independiente del acento)

const formatMoney = (val: number) =>
  `S/ ${(val ?? 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const formatShort = (val: number) => {
  if (Math.abs(val) >= 1000) return `S/ ${(val / 1000).toFixed(1)}K`
  return `S/ ${(val ?? 0).toFixed(0)}`
}

const NAV_TABS = [
  { key: 'dashboard', label: 'Dashboard', icon: 'solar:widget-5-bold', to: '/dashboard-nuevo' },
  { key: 'productos', label: 'Productos', icon: 'solar:box-bold', to: '/administrador/kardex/productos' },
  { key: 'ventas', label: 'Ventas', icon: 'solar:cart-large-2-bold', to: '/administrador/ventas' },
  { key: 'compras', label: 'Compras', icon: 'solar:bag-smile-bold', to: '/administrador/compras' },
  { key: 'clientes', label: 'Clientes', icon: 'solar:users-group-rounded-bold', to: '/administrador/clientes' },
  { key: 'reportes', label: 'Reportes', icon: 'solar:chart-2-bold', to: '/administrador/facturacion/comprobantes' },
]

const Trend = ({ trend }: { trend: number }) => {
  const pos = (trend ?? 0) >= 0
  return (
    <span
      className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-bold ${
        pos ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400' : 'bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400'
      }`}
    >
      <Icon icon={pos ? 'solar:alt-arrow-up-bold' : 'solar:alt-arrow-down-bold'} />
      {Math.abs(trend ?? 0).toFixed(1)}%
    </span>
  )
}

const AreaTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs shadow-lg dark:border-slate-700 dark:bg-slate-800">
      <p className="mb-0.5 font-semibold text-gray-500 dark:text-gray-400">{label}</p>
      <p className="font-bold text-gray-900 dark:text-white">{formatMoney(payload[0].value)}</p>
    </div>
  )
}

export default function DashboardPreviewPage() {
  const navigate = useNavigate()
  const { auth } = useAuthStore()
  const { overviewData, getOverview }: IDashboardState = useDashboardStore()

  const [fechaInicio] = useState(moment().subtract(89, 'days').format('YYYY-MM-DD'))
  const [fechaFin] = useState(moment().format('YYYY-MM-DD'))

  useEffect(() => {
    getOverview(fechaInicio, fechaFin, null)
  }, [fechaInicio, fechaFin, getOverview])

  const brand = BRAND.primaryColor

  // Datos reales con defaults para que el piloto siempre renderice.
  const kpis = overviewData?.kpis ?? {
    ventas: { value: 0, trend: 0 },
    pedidos: { value: 0, trend: 0 },
    clientes: { value: 0, trend: 0 },
    conversion: { value: 0, trend: 0 },
  }
  const financiero = overviewData?.financiero ?? {
    ingresos: { value: 0, trend: 0 },
    gastos: { value: 0, trend: 0 },
    ganancias: { value: 0, trend: 0 },
    margen: 0,
  }
  const chartVentas: Array<{ date: string; total: number }> = overviewData?.chartVentas ?? []
  const chartCanales: Array<{ name: string; value: number; percentage: number }> =
    overviewData?.chartCanales ?? []
  const topProductos: any[] = overviewData?.topProductos ?? []
  const alertas = overviewData?.alertas ?? {}

  const canalTotal = useMemo(
    () => chartCanales.reduce((acc, c) => acc + (c.value || 0), 0),
    [chartCanales],
  )

  const initials = (auth?.nombre || 'Usuario')
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <div className="min-h-screen bg-[#eef0f5] font-inter text-gray-900 dark:bg-slate-950 dark:text-white">
      {/* ===== Header azul marino ===== */}
      <header style={{ background: HEADER_BG }} className="text-white">
        <div className="mx-auto flex h-14 max-w-[1200px] items-center gap-4 px-5">
          <button onClick={() => navigate('/administrador')} className="flex items-center gap-2.5">
            <span
              className="flex h-8 w-8 items-center justify-center rounded-lg text-white"
              style={{ background: brand }}
            >
              <Icon icon="solar:bolt-bold" className="text-lg" />
            </span>
            <span className="text-[15px] font-bold tracking-tight">{BRAND.name}</span>
          </button>

          <div className="ml-2 hidden flex-1 items-center gap-2 rounded-lg bg-white/5 px-3 py-1.5 text-sm text-white/50 md:flex">
            <Icon icon="solar:magnifer-linear" />
            <input
              placeholder="Buscar aquí…"
              className="w-full bg-transparent text-white placeholder:text-white/40 focus:outline-none"
            />
          </div>

          <nav className="ml-auto flex items-center gap-5 text-sm text-white/80">
            <button className="hidden items-center gap-1.5 hover:text-white sm:flex">
              <Icon icon="solar:question-circle-linear" /> Soporte
            </button>
            <button className="hidden items-center gap-1.5 hover:text-white sm:flex">
              <Icon icon="solar:settings-linear" /> Configuración
            </button>
            <button className="relative hover:text-white">
              <Icon icon="solar:bell-linear" className="text-lg" />
              <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-rose-500" />
            </button>
            <div className="flex items-center gap-2 pl-1">
              <span
                className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white"
                style={{ background: brand }}
              >
                {initials}
              </span>
              <span className="hidden text-white lg:inline">{auth?.nombre?.split(' ')[0]}</span>
              <Icon icon="solar:alt-arrow-down-linear" className="text-white/60" />
            </div>
          </nav>
        </div>
      </header>

      {/* ===== Navbar morado ===== */}
      <div style={{ background: brand }} className="text-white/90">
        <div className="mx-auto flex max-w-[1200px] items-center gap-1 px-3">
          {NAV_TABS.map((t) => {
            const active = t.key === 'dashboard'
            return (
              <button
                key={t.key}
                onClick={() => navigate(t.to)}
                className={`relative flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
                  active ? 'text-white' : 'text-white/70 hover:text-white'
                }`}
              >
                <Icon icon={t.icon} className="text-base" />
                {t.label}
                {active && (
                  <span className="absolute inset-x-3 -bottom-px h-[3px] rounded-t bg-white" />
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* ===== Contenido ===== */}
      <main className="mx-auto max-w-[1200px] px-5 py-6">
        {/* Título + filtros */}
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <h1 className="text-2xl font-extrabold tracking-tight">Dashboard</h1>
          <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
            <span className="flex items-center gap-1 font-medium">
              Todas las sedes <Icon icon="solar:alt-arrow-down-linear" />
            </span>
            <span className="flex items-center gap-1 font-medium text-gray-700 dark:text-gray-200">
              Últimos 90 días:{' '}
              <span className="text-gray-500 dark:text-gray-400">
                {moment(fechaInicio).format('D MMM')} – {moment(fechaFin).format('D MMM YYYY')}
              </span>
              <Icon icon="solar:alt-arrow-down-linear" />
            </span>
          </div>
        </div>

        {/* Fila 1: Ventas (área) + Donut canales */}
        <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-[#111827] dark:shadow-none lg:col-span-2">
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h3 className="text-sm font-bold text-gray-900 dark:text-white">Ventas totales</h3>
                <p className="text-xs text-gray-400">Últimos 90 días</p>
              </div>
              <div className="flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-gray-400">
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full" style={{ background: brand }} /> Ventas netas
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-3xl font-extrabold tracking-tight" style={{ color: brand }}>
                {formatShort(kpis.ventas.value)}
              </span>
              <Trend trend={kpis.ventas.trend} />
            </div>
            <p className="mt-1 text-xs font-medium text-gray-400">
              {formatMoney(kpis.ventas.value)} en el periodo
            </p>

            <div className="mt-3 h-48">
              {chartVentas.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartVentas} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="ventasFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={brand} stopOpacity={0.28} />
                        <stop offset="100%" stopColor={brand} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid vertical={false} stroke="#e1e0d9" strokeDasharray="0" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 11, fill: '#898781' }}
                      tickLine={false}
                      axisLine={false}
                      minTickGap={24}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: '#898781' }}
                      tickLine={false}
                      axisLine={false}
                      width={48}
                      tickFormatter={(v) => (v >= 1000 ? `${v / 1000}K` : `${v}`)}
                    />
                    <Tooltip content={<AreaTooltip />} cursor={{ stroke: brand, strokeWidth: 1 }} />
                    <Area
                      type="monotone"
                      dataKey="total"
                      stroke={brand}
                      strokeWidth={2}
                      fill="url(#ventasFill)"
                      dot={false}
                      activeDot={{ r: 4, fill: brand }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-gray-400">
                  Sin ventas en este periodo
                </div>
              )}
            </div>
          </div>

          {/* Donut canales */}
          <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-[#111827] dark:shadow-none">
            <h3 className="mb-1 text-sm font-bold text-gray-900 dark:text-white">Ventas por canal</h3>
            <p className="mb-2 text-xs text-gray-400">Distribución del periodo</p>
            <div className="relative mx-auto h-40 w-40">
              {chartCanales.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartCanales}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={52}
                      outerRadius={72}
                      paddingAngle={2}
                      stroke="none"
                    >
                      {chartCanales.map((_, i) => (
                        <Cell key={i} fill={SERIES[i % SERIES.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(v: any, n: any) => [formatMoney(v), n]}
                      contentStyle={{ fontSize: 12, borderRadius: 8, borderColor: '#e5e7eb' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-center text-sm text-gray-400">
                  Sin datos
                </div>
              )}
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-lg font-extrabold text-gray-900 dark:text-white">{formatShort(canalTotal)}</span>
                <span className="text-[10px] font-medium text-gray-400">total</span>
              </div>
            </div>
            {/* Leyenda con labels directos (refuerzo CVD) */}
            <div className="mt-4 space-y-2">
              {chartCanales.map((c, i) => (
                <div key={c.name} className="flex items-center justify-between gap-2 text-sm">
                  <span className="flex min-w-0 items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ background: SERIES[i % SERIES.length] }}
                    />
                    <span className="truncate font-medium text-gray-600 dark:text-gray-300">{c.name}</span>
                  </span>
                  <span className="shrink-0 font-bold text-gray-500 dark:text-gray-400">
                    {(c.percentage ?? 0).toFixed(1)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Fila 2: Strip de stats */}
        <div className="mb-4 grid grid-cols-2 divide-gray-100 rounded-xl border border-gray-100 bg-white shadow-sm dark:divide-slate-800 dark:border-slate-800 dark:bg-[#111827] dark:shadow-none md:grid-cols-4 md:divide-x">
          {[
            { label: 'COMPROBANTES', value: kpis.pedidos.value.toLocaleString() },
            { label: 'TICKET PROMEDIO', value: formatMoney(kpis.conversion.value), accent: true },
            { label: 'CLIENTES NUEVOS', value: kpis.clientes.value.toLocaleString() },
            {
              label: 'POR COBRAR',
              value: formatMoney(alertas?.cuentasCobrar?.total ?? 0),
              accent: true,
            },
          ].map((s) => (
            <div key={s.label} className="px-5 py-4">
              <p className="text-[11px] font-bold tracking-wide text-gray-400">{s.label}</p>
              <p
                className="mt-1 text-xl font-extrabold"
                style={{ color: s.accent ? brand : '#111827' }}
              >
                {s.value}
              </p>
            </div>
          ))}
        </div>

        {/* Fila 3: Ingresos / Utilidad / Clientes */}
        <div className="mb-4 grid grid-cols-1 gap-4 rounded-xl border border-gray-100 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-[#111827] dark:shadow-none md:grid-cols-3 md:divide-x md:divide-gray-100 md:dark:divide-slate-800">
          <div className="md:pr-5">
            <p className="text-sm font-bold text-gray-500 dark:text-gray-400">Ingresos totales</p>
            <p className="text-xs text-gray-400">Últimos 90 días</p>
            <div className="mt-2 flex items-center gap-2">
              <span className="text-2xl font-extrabold text-gray-900 dark:text-white">
                {formatShort(financiero.ingresos.value)}
              </span>
              <Trend trend={financiero.ingresos.trend} />
            </div>
          </div>
          <div className="md:px-5">
            <p className="text-sm font-bold text-gray-500 dark:text-gray-400">Utilidad</p>
            <p className="text-xs text-gray-400">Margen {financiero.margen?.toFixed(0)}%</p>
            <div className="mt-2 flex items-center gap-2">
              <span className="text-2xl font-extrabold text-gray-900 dark:text-white">
                {formatShort(financiero.ganancias.value)}
              </span>
              <Trend trend={financiero.ganancias.trend} />
            </div>
          </div>
          <div className="md:pl-5">
            <p className="text-sm font-bold text-gray-500 dark:text-gray-400">Clientes nuevos</p>
            <p className="text-xs text-gray-400">Últimos 90 días</p>
            <div className="mt-2 flex items-center gap-2">
              <span className="text-2xl font-extrabold text-gray-900 dark:text-white">
                {kpis.clientes.value.toLocaleString()}
              </span>
              <Trend trend={kpis.clientes.trend} />
            </div>
          </div>
        </div>

        {/* Fila 4: Top productos (barras) */}
        <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-[#111827] dark:shadow-none">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">Productos más vendidos</h3>
            <span className="text-xs text-gray-400">Últimos 90 días</span>
          </div>
          <div className="space-y-4">
            {topProductos.length > 0 ? (
              topProductos.slice(0, 5).map((p, i) => {
                const max = topProductos[0]?.total || 1
                const pct = ((p.total || 0) / max) * 100
                const color = SERIES[i % SERIES.length]
                return (
                  <div key={p.productoId || i} className="flex items-center gap-3">
                    <span
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white"
                      style={{ background: color }}
                    >
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex items-baseline justify-between gap-2">
                        <span className="truncate text-[13px] font-semibold text-gray-800 dark:text-gray-200">
                          {p.producto?.descripcion || 'Producto sin nombre'}
                        </span>
                        <span className="shrink-0 text-[13px] font-bold text-gray-700 dark:text-gray-200">
                          {formatMoney(p.total)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100 dark:bg-slate-800">
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${pct}%`, background: color }}
                          />
                        </div>
                        <span className="w-14 shrink-0 text-right text-[11px] font-medium text-gray-400">
                          {p.cantidad ?? 0} u.
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })
            ) : (
              <p className="py-6 text-center text-sm text-gray-400">Sin productos vendidos</p>
            )}
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-gray-400">
          Vista piloto · <button onClick={() => navigate('/administrador')} className="font-semibold underline">volver al panel actual</button>
        </p>
      </main>
    </div>
  )
}
