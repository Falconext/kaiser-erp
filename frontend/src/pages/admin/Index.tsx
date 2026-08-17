import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/zustand/auth'
import { useDashboardStore, type IDashboardState } from '@/zustand/dashboard'
import { Icon } from '@iconify/react'
import moment from 'moment'
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from 'recharts'
import { get } from '@/utils/fetch'
import { useDebounce } from '@/hooks/useDebounce'
import { WelcomeModal, TourSpotlight, useWelcomeTour } from '@/components/WelcomeTour'
import Select from '@/components/Select'
import {
  esFarmaciaRetailRubro,
  esDrogueriaRubro,
  esRubroFabricacion,
  esRubroComputo,
} from '@/utils/rubro-features'
import { useThemeStore, SIDEBAR_COLOR_HEX } from '@/zustand/theme'

// ── Dashboard del negocio — resumen accionable + tabla de comprobantes ────────
// Responde en 5 segundos: ¿cuánto vendí? ¿qué requiere mi atención? ¿qué/cómo se vende?
// Adaptativo por rubro (bodega, farmacia, restaurante, fabricación, cómputo, vehicular…).
// Paleta CVD-safe (dataviz) para series categóricas.
const SERIES = ['#7551FF', '#1baf7a', '#eda100', '#2a78d6', '#e0567a']

type Invoice = {
  id: number
  tipoDoc: string
  serie: string
  correlativo: number
  fechaEmision: string
  mtoImpVenta: number
  tipoMoneda?: string
  estadoEnvioSunat?: string
  estadoPago?: string
  cliente?: { nombre?: string; numDoc?: string }
  clienteNombre?: string
  sede?: { nombre?: string }
}

const money = (v: number, moneda = 'PEN') =>
  `${moneda === 'USD' ? '$' : 'S/'} ${Number(v ?? 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const formatMoney = (v: number) =>
  `S/ ${Number(v ?? 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const formatShort = (v: number) => {
  if (Math.abs(v) >= 1000) return `S/ ${(v / 1000).toFixed(1)}K`
  return `S/ ${Number(v ?? 0).toFixed(0)}`
}

const TIPO_DOC_LABEL: Record<string, string> = {
  '01': 'Factura',
  '03': 'Boleta',
  '07': 'N. Crédito',
  '08': 'N. Débito',
  NV: 'N. Venta',
}

function estadoPill(estado?: string) {
  const e = String(estado ?? '').toUpperCase()
  if (['ACEPTADO', 'APROBADO'].includes(e)) return { label: 'Aceptado', dot: 'bg-emerald-500', text: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20' }
  if (['PENDIENTE', 'ENVIANDO', 'EN_PROCESO', 'PROCESANDO'].includes(e)) return { label: 'En proceso', dot: 'bg-amber-500', text: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/20' }
  if (['RECHAZADO', 'FALLIDO_ENVIO', 'ERROR', 'OBSERVADO'].includes(e)) return { label: 'Rechazado', dot: 'bg-rose-500', text: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-50 dark:bg-rose-900/20' }
  if (['ANULADO', 'BAJA'].includes(e)) return { label: 'Anulado', dot: 'bg-slate-400', text: 'text-slate-500 dark:text-gray-400', bg: 'bg-slate-100 dark:bg-slate-800' }
  return { label: e ? e.charAt(0) + e.slice(1).toLowerCase() : 'Emitido', dot: 'bg-violet-500', text: 'text-violet-600 dark:text-violet-400', bg: 'bg-violet-50 dark:bg-violet-900/20' }
}

const SORTS = [
  { key: 'fecha_desc', label: 'Más recientes' },
  { key: 'fecha_asc', label: 'Más antiguos' },
  { key: 'total_desc', label: 'Mayor monto' },
  { key: 'total_asc', label: 'Menor monto' },
]
const ESTADOS = [
  { key: '', label: 'Todos' },
  { key: 'ACEPTADO', label: 'Aceptado' },
  { key: 'PENDIENTE', label: 'En proceso' },
  { key: 'RECHAZADO', label: 'Rechazado' },
]
const PER_PAGE = [10, 20, 50]

const PERIODS = [
  { key: 'hoy', label: 'Hoy' },
  { key: '7d', label: '7 días' },
  { key: 'mes', label: 'Este mes' },
]

// ── Configuración por rubro ───────────────────────────────────────────────────
type RubroUI = {
  key: string
  ventaCta: string
  productosLabel: string
  quickActions: { label: string; icon: string; to: string; primary?: boolean }[]
  focus?: { label: string; hint: string; icon: string; to: string; tone: 'amber' | 'sky' | 'violet' }
}

function resolveRubroUI(nombreRaw?: string | null): RubroUI {
  const nombre = (nombreRaw || '').toLowerCase()
  const nueva = { label: 'Nueva venta', icon: 'solar:add-circle-bold', to: '/administrador/facturacion/nuevo', primary: true }
  const reportes = { label: 'Reportes', icon: 'solar:chart-2-bold-duotone', to: '/administrador/finanzas/dashboard' }
  const productos = { label: 'Productos', icon: 'solar:box-bold-duotone', to: '/administrador/kardex/productos' }
  const clientes = { label: 'Clientes', icon: 'solar:users-group-rounded-bold-duotone', to: '/administrador/clientes' }

  const esBodega = ['bodega', 'supermarket', 'supermercado', 'minimarket', 'abarrotes'].some((x) => nombre.includes(x))
  const esRestaurante = nombre.includes('restaurante')
  const esAlimentos = esRestaurante || ['panaderia', 'panadería', 'pasteleria', 'pastelería', 'cafeteria', 'cafetería'].some((x) => nombre.includes(x))
  const esVehicular = ['vehicular', 'vehiculo', 'vehículo', 'alarma', 'gps', 'rastreo', 'monitoreo'].some((x) => nombre.includes(x))

  if (esFarmaciaRetailRubro(nombre) || esDrogueriaRubro(nombre)) {
    return {
      key: 'farmacia',
      ventaCta: 'Nueva venta',
      productosLabel: 'Productos más vendidos',
      quickActions: [nueva, { label: 'Lotes y vencimientos', icon: 'solar:calendar-mark-bold-duotone', to: '/administrador/kardex/lotes' }, productos, reportes],
      focus: { label: 'Revisar lotes por vencer', hint: 'Controla el FEFO antes de que caduquen', icon: 'solar:calendar-mark-bold-duotone', to: '/administrador/kardex/lotes', tone: 'amber' },
    }
  }
  if (esRubroFabricacion(nombre)) {
    return {
      key: 'fabricacion',
      ventaCta: 'Nueva venta',
      productosLabel: 'Productos más vendidos',
      quickActions: [nueva, { label: 'Órdenes de producción', icon: 'solar:widget-add-bold-duotone', to: '/administrador/produccion/ordenes' }, productos, reportes],
      focus: { label: 'Órdenes de producción', hint: 'Revisa el avance de fabricación', icon: 'solar:widget-add-bold-duotone', to: '/administrador/produccion/ordenes', tone: 'sky' },
    }
  }
  if (esRubroComputo(nombre)) {
    return {
      key: 'computo',
      ventaCta: 'Nueva venta',
      productosLabel: 'Productos más vendidos',
      quickActions: [nueva, { label: 'Series y garantías', icon: 'solar:shield-check-bold-duotone', to: '/administrador/kardex/series-garantias' }, productos, reportes],
      focus: { label: 'Series y garantías', hint: 'Controla los equipos por número de serie', icon: 'solar:shield-check-bold-duotone', to: '/administrador/kardex/series-garantias', tone: 'sky' },
    }
  }
  if (esAlimentos) {
    return {
      key: 'alimentos',
      ventaCta: esRestaurante ? 'Nueva comanda' : 'Nueva venta',
      productosLabel: esRestaurante ? 'Platos más vendidos' : 'Productos más vendidos',
      quickActions: [{ ...nueva, label: esRestaurante ? 'Nueva comanda' : 'Nueva venta' }, productos, clientes, reportes],
    }
  }
  if (esBodega) {
    return {
      key: 'bodega',
      ventaCta: 'Nueva venta',
      productosLabel: 'Productos más vendidos',
      quickActions: [nueva, { label: 'Reponer stock', icon: 'solar:bag-check-bold-duotone', to: '/administrador/compras' }, productos, reportes],
    }
  }
  if (esVehicular) {
    return {
      key: 'vehicular',
      ventaCta: 'Nueva venta',
      productosLabel: 'Servicios más vendidos',
      quickActions: [nueva, { label: 'Clientes y contratos', icon: 'solar:file-check-bold-duotone', to: '/administrador/clientes' }, productos, reportes],
      focus: { label: 'Contratos y renovaciones', hint: 'Da seguimiento a los contratos por vencer', icon: 'solar:file-check-bold-duotone', to: '/administrador/clientes', tone: 'violet' },
    }
  }
  return {
    key: 'generico',
    ventaCta: 'Nueva venta',
    productosLabel: 'Productos más vendidos',
    quickActions: [nueva, productos, clientes, reportes],
  }
}

const Trend = ({ trend }: { trend: number }) => {
  const pos = (trend ?? 0) >= 0
  return (
    <span className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-bold ${pos ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400' : 'bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400'}`}>
      <Icon icon={pos ? 'solar:alt-arrow-up-bold' : 'solar:alt-arrow-down-bold'} />
      {Math.abs(trend ?? 0).toFixed(1)}%
    </span>
  )
}

// ── Helpers de visualización (estilo dashboard moderno) ───────────────────────
const polar = (cx: number, cy: number, r: number, deg: number) => {
  const rad = (deg * Math.PI) / 180
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
}
const arc = (cx: number, cy: number, r: number, a0: number, a1: number) => {
  const s = polar(cx, cy, r, a0)
  const e = polar(cx, cy, r, a1)
  const large = Math.abs(a1 - a0) > 180 ? 1 : 0
  return `M ${s.x} ${s.y} A ${r} ${r} 0 ${large} 1 ${e.x} ${e.y}`
}

// Medidor semicircular con marcas tipo regla. `value`/`max` en 0..100.
const RadialGauge = ({ value, max = 100, accent }: { value: number; max?: number; accent: string }) => {
  const frac = Math.max(0, Math.min(1, (value ?? 0) / (max || 100)))
  const cx = 100, cy = 100, r = 82
  const ticks = 44
  return (
    <svg viewBox="0 0 200 108" className="w-full h-full">
      <path d={arc(cx, cy, r, 180, 360)} fill="none" className="stroke-slate-100 dark:stroke-slate-800" strokeWidth={12} strokeLinecap="round" />
      <path d={arc(cx, cy, r, 180, 180 + 180 * frac)} fill="none" stroke={accent} strokeWidth={12} strokeLinecap="round" />
      {Array.from({ length: ticks + 1 }).map((_, i) => {
        const a = 180 + (180 * i) / ticks
        const on = i / ticks <= frac
        const p1 = polar(cx, cy, r - 15, a)
        const p2 = polar(cx, cy, r - 22, a)
        return <line key={i} x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} strokeWidth={1.5} strokeLinecap="round" stroke={on ? accent : 'currentColor'} className={on ? '' : 'text-slate-200 dark:text-slate-700'} strokeOpacity={on ? 0.55 : 1} />
      })}
    </svg>
  )
}

// Mini-visualización decorativa para tarjetas KPI (SVG puro, sigue el acento).
const KpiMini = ({ type, accent, data }: { type: 'bars' | 'line' | 'donut' | 'wave'; accent: string; data?: number[] }) => {
  const w = 60, h = 34
  if (type === 'donut') {
    const R = 14, C = 2 * Math.PI * R
    return (
      <svg viewBox="0 0 40 40" className="h-9 w-9">
        <circle cx={20} cy={20} r={R} fill="none" strokeWidth={6} className="stroke-slate-100 dark:stroke-slate-800" />
        <circle cx={20} cy={20} r={R} fill="none" strokeWidth={6} stroke={accent} strokeLinecap="round" strokeDasharray={`${C * 0.62} ${C}`} transform="rotate(-90 20 20)" />
      </svg>
    )
  }
  if (type === 'line') {
    const pts = (data && data.length > 1 ? data : [3, 5, 4, 7, 6, 9, 8])
    const max = Math.max(...pts, 1), min = Math.min(...pts, 0)
    const span = max - min || 1
    const d = pts.map((v, i) => `${(i / (pts.length - 1)) * w},${h - 4 - ((v - min) / span) * (h - 8)}`).join(' L ')
    return (
      <svg viewBox={`0 0 ${w} ${h}`} className="h-8 w-16">
        <path d={`M ${d}`} fill="none" stroke={accent} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  }
  const bars = type === 'wave' ? [8, 14, 10, 20, 12, 24, 16] : [14, 24, 18]
  const bmax = Math.max(...bars)
  const bw = w / (bars.length * 1.7)
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-8 w-16">
      {bars.map((v, i) => {
        const bh = (v / bmax) * (h - 6)
        return <rect key={i} x={i * (bw * 1.7) + 2} y={h - bh} width={bw} height={bh} rx={bw / 2} fill={accent} opacity={0.35 + 0.65 * (i / (bars.length - 1))} />
      })}
    </svg>
  )
}

// Tooltip oscuro estilo mockup para el gráfico de barras.
const DarkTooltip =
  (fmt: (v: number) => string) =>
  ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null
    return (
      <div className="rounded-xl bg-slate-900 text-white px-3.5 py-2.5 shadow-xl">
        <p className="text-[11px] font-semibold text-slate-300 mb-1">{moment(label).format('DD MMM YYYY')}</p>
        <div className="flex items-center justify-between gap-6">
          <span className="text-xs text-slate-400">Ventas</span>
          <span className="text-sm font-bold">{fmt(payload[0].value)}</span>
        </div>
      </div>
    )
  }

export default function AdminIndex() {
  const navigate = useNavigate()
  const { auth, sedeActiva } = useAuthStore()
  const { overviewData, getOverview, topPorCategoria, getTopPorCategoria }: IDashboardState = useDashboardStore()
  const { showModal, tourStep, startTour, skipTour, nextStep, prevStep, endTour } = useWelcomeTour(auth)
  const sidebarColor = useThemeStore((s) => s.sidebarColor)
  const isDarkMode = useThemeStore((s) => s.isDarkMode)
  const ACCENT = SIDEBAR_COLOR_HEX[sidebarColor] ?? '#7551FF'
  const mutedBar = isDarkMode ? '#1e293b' : '#eef1f6'

  const rubroUI = useMemo(() => resolveRubroUI(auth?.empresa?.rubro?.nombre), [auth?.empresa?.rubro?.nombre])

  // ── Periodo del resumen ──
  const [period, setPeriod] = useState('mes')
  const { fechaInicio, fechaFin, periodLabel } = useMemo(() => {
    const fin = moment().format('YYYY-MM-DD')
    if (period === 'hoy') return { fechaInicio: fin, fechaFin: fin, periodLabel: 'Hoy' }
    if (period === '7d') return { fechaInicio: moment().subtract(6, 'days').format('YYYY-MM-DD'), fechaFin: fin, periodLabel: 'Últimos 7 días' }
    // "Este mes" abarca el mes en curso completo: del día 1 al último día del mes.
    return { fechaInicio: moment().startOf('month').format('YYYY-MM-DD'), fechaFin: moment().endOf('month').format('YYYY-MM-DD'), periodLabel: 'Este mes' }
  }, [period])

  const effectiveSedeId = sedeActiva?.id ?? null
  const [ovLoading, setOvLoading] = useState(true)

  // "Productos Más Vendidos por Categoría" — segmento moneda + selector de categoría
  const [catMoneda, setCatMoneda] = useState<'PEN' | 'USD'>('PEN')
  const [catSelId, setCatSelId] = useState<number | null>(null)

  useEffect(() => {
    let alive = true
    setOvLoading(true)
    ;(async () => {
      await (getOverview(fechaInicio, fechaFin, effectiveSedeId) as unknown as Promise<void>)
      if (alive) setOvLoading(false)
    })()
    return () => { alive = false }
  }, [fechaInicio, fechaFin, effectiveSedeId, getOverview])

  useEffect(() => {
    getTopPorCategoria(fechaInicio, fechaFin, {
      sedeId: effectiveSedeId,
      moneda: catMoneda,
      categoriaId: catSelId,
      limit: 5,
    })
  }, [fechaInicio, fechaFin, effectiveSedeId, catMoneda, catSelId, getTopPorCategoria])

  const kpis = overviewData?.kpis ?? { ventas: { value: 0, trend: 0 }, pedidos: { value: 0, trend: 0 }, clientes: { value: 0, trend: 0 }, conversion: { value: 0, trend: 0 } }
  const financiero = overviewData?.financiero ?? { ingresos: { value: 0, trend: 0 }, gastos: { value: 0, trend: 0 }, ganancias: { value: 0, trend: 0 }, margen: 0 }
  const chartVentas: Array<{ date: string; total: number }> = overviewData?.chartVentas ?? []
  const chartCanales: Array<{ name: string; value: number; percentage: number }> = overviewData?.chartCanales ?? []
  const topProductos: any[] = overviewData?.topProductos ?? []
  const alertas = overviewData?.alertas ?? {}
  const canalTotal = useMemo(() => chartCanales.reduce((a, c) => a + (c.value || 0), 0), [chartCanales])

  // ── Tarjetas "Requiere tu atención" ──
  const atencion = useMemo(() => {
    const items: { key: string; icon: string; label: string; value: string; to: string; tone: string }[] = []
    const stockN = alertas?.stockBajo?.length ?? 0
    const sunatN = alertas?.sunatPendientes?.count ?? 0
    const cobrar = alertas?.cuentasCobrar?.total ?? 0
    const pedidos = alertas?.pedidosTiendaPendientes ?? 0
    if (stockN > 0) items.push({ key: 'stock', icon: 'solar:box-minimalistic-bold-duotone', label: 'Productos con stock bajo', value: String(stockN), to: '/administrador/kardex/productos?soloStockBajo=true', tone: 'rose' })
    if (sunatN > 0) items.push({ key: 'sunat', icon: 'solar:document-add-bold-duotone', label: 'Comprobantes pendientes en SUNAT', value: String(sunatN), to: '/administrador/facturacion/comprobantes?soloPendientesSunat=true', tone: 'amber' })
    if (cobrar > 0) items.push({ key: 'cobrar', icon: 'solar:wallet-money-bold-duotone', label: `Por cobrar${alertas?.cuentasCobrar?.cantidad ? ` (${alertas.cuentasCobrar.cantidad})` : ''}`, value: formatShort(cobrar), to: '/administrador/ventas/pagos/cuentas-cobrar?soloPendientesCobro=true', tone: 'violet' })
    if (pedidos > 0) items.push({ key: 'pedidos', icon: 'solar:cart-large-2-bold-duotone', label: 'Pedidos de tienda por atender', value: String(pedidos), to: '/administrador/tienda/pedidos?soloPendientesAtencion=true', tone: 'sky' })
    // Rubro reordena: farmacia/droguería priorizan el stock (ya va primero).
    return items
  }, [alertas])

  const toneMap: Record<string, { bg: string; text: string; ring: string }> = {
    rose: { bg: 'bg-rose-50 dark:bg-rose-900/20', text: 'text-rose-600 dark:text-rose-400', ring: 'ring-rose-100 dark:ring-rose-900/40' },
    amber: { bg: 'bg-amber-50 dark:bg-amber-900/20', text: 'text-amber-600 dark:text-amber-400', ring: 'ring-amber-100 dark:ring-amber-900/40' },
    violet: { bg: 'bg-violet-50 dark:bg-violet-900/20', text: 'text-violet-600 dark:text-violet-400', ring: 'ring-violet-100 dark:ring-violet-900/40' },
    sky: { bg: 'bg-sky-50 dark:bg-sky-900/20', text: 'text-sky-600 dark:text-sky-400', ring: 'ring-sky-100 dark:ring-sky-900/40' },
    emerald: { bg: 'bg-emerald-50 dark:bg-emerald-900/20', text: 'text-emerald-600 dark:text-emerald-400', ring: 'ring-emerald-100 dark:ring-emerald-900/40' },
  }

  // ── Tabla de comprobantes (sección inferior) ──
  const [rows, setRows] = useState<Invoice[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)
  const [search, setSearch] = useState('')
  const [estado, setEstado] = useState('')
  const [sort, setSort] = useState('fecha_desc')
  const [showFilter, setShowFilter] = useState(false)
  const [showSort, setShowSort] = useState(false)
  const [copied, setCopied] = useState<number | null>(null)
  const debounced = useDebounce(search, 500)
  const reqRef = useRef(0)

  const fetchData = async () => {
    const reqId = ++reqRef.current
    setLoading(true)
    try {
      const params = Object.entries({
        tipoComprobante: 'FORMAL', page, limit, search: debounced, estado,
        ...(effectiveSedeId ? { sedeId: effectiveSedeId } : {}),
      }).filter(([, v]) => v !== undefined && v !== '').reduce((o, [k, v]) => ({ ...o, [k]: String(v) }), {} as Record<string, string>)
      const query = new URLSearchParams(params).toString()
      const resp: any = await get(`comprobante/listar?${query}`)
      if (reqId !== reqRef.current) return
      if (resp?.code === 1) {
        setRows(Array.isArray(resp.data?.comprobantes) ? resp.data.comprobantes : [])
        setTotal(typeof resp.data?.total === 'number' ? resp.data.total : (resp.data?.comprobantes?.length ?? 0))
      } else { setRows([]); setTotal(0) }
    } catch {
      if (reqId === reqRef.current) { setRows([]); setTotal(0) }
    } finally {
      if (reqId === reqRef.current) setLoading(false)
    }
  }

  useEffect(() => { fetchData() /* eslint-disable-next-line */ }, [page, limit, debounced, estado, effectiveSedeId])
  useEffect(() => { setPage(1) }, [debounced, estado, limit])

  const sortedRows = useMemo(() => {
    const arr = [...rows]
    switch (sort) {
      case 'fecha_asc': return arr.sort((a, b) => +new Date(a.fechaEmision) - +new Date(b.fechaEmision))
      case 'total_desc': return arr.sort((a, b) => (b.mtoImpVenta || 0) - (a.mtoImpVenta || 0))
      case 'total_asc': return arr.sort((a, b) => (a.mtoImpVenta || 0) - (b.mtoImpVenta || 0))
      default: return arr.sort((a, b) => +new Date(b.fechaEmision) - +new Date(a.fechaEmision))
    }
  }, [rows, sort])

  const totalPages = Math.max(1, Math.ceil(total / limit))
  const fromRow = total === 0 ? 0 : (page - 1) * limit + 1
  const toRow = Math.min(page * limit, total)

  const copyDoc = (inv: Invoice) => {
    navigator.clipboard?.writeText(`${inv.serie}-${String(inv.correlativo).padStart(8, '0')}`)
    setCopied(inv.id); setTimeout(() => setCopied((c) => (c === inv.id ? null : c)), 1200)
  }

  const exportCSV = () => {
    const head = ['Cliente', 'Documento', 'Total', 'Sede', 'Estado', 'Fecha', 'Tipo']
    const lines = sortedRows.map((r) => [
      r.cliente?.nombre || r.clienteNombre || '',
      `${r.serie}-${String(r.correlativo).padStart(8, '0')}`,
      r.mtoImpVenta ?? 0, r.sede?.nombre || '', estadoPill(r.estadoEnvioSunat).label,
      moment(r.fechaEmision).format('DD/MM/YYYY'), TIPO_DOC_LABEL[r.tipoDoc] || r.tipoDoc,
    ].map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
    const blob = new Blob([[head.join(','), ...lines].join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = `comprobantes_${moment().format('YYYYMMDD')}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  const pageNumbers = useMemo(() => {
    const nums: number[] = []; const win = 2
    for (let i = Math.max(1, page - win); i <= Math.min(totalPages, page + win); i++) nums.push(i)
    if (!nums.includes(1)) nums.unshift(1)
    if (!nums.includes(totalPages)) nums.push(totalPages)
    return [...new Set(nums)].sort((a, b) => a - b)
  }, [page, totalPages])

  const nombre = auth?.nombre?.split(' ')[0] || 'Administrador'
  const sparkVals = useMemo(() => chartVentas.map((d) => d.total || 0), [chartVentas])
  const ventasMax = useMemo(() => Math.max(0, ...chartVentas.map((d) => d.total || 0)), [chartVentas])
  const margenMsg = useMemo(() => {
    const m = Number(financiero.margen ?? 0)
    if (m >= 40) return { title: '¡Excelente margen! ✨', hint: 'Tu rentabilidad está muy por encima del promedio. Mantén el control de costos.' }
    if (m >= 20) return { title: 'Buen margen 👍', hint: 'Vas por buen camino. Revisa precios y compras para mejorarlo aún más.' }
    if (m > 0) return { title: 'Margen ajustado', hint: 'Considera revisar tus costos de compra y tus precios de venta.' }
    return { title: 'Sin margen todavía', hint: 'Registra tus ventas y compras para calcular tu rentabilidad.' }
  }, [financiero.margen])
  const kpiCards: { label: string; value: string; trend: number; mini: 'line' | 'wave' | 'donut' | 'bars'; to: string }[] = [
    { label: 'Ventas netas', value: formatShort(kpis.ventas.value), trend: kpis.ventas.trend, mini: 'line', to: '/administrador/finanzas/dashboard' },
    { label: 'Total neto', value: formatShort(financiero.ganancias.value), trend: financiero.ganancias.trend, mini: 'wave', to: '/administrador/finanzas/dashboard' },
    { label: 'Ticket promedio', value: formatMoney(kpis.conversion.value), trend: kpis.conversion.trend, mini: 'donut', to: '/administrador/facturacion/comprobantes' },
    { label: 'Clientes nuevos', value: kpis.clientes.value.toLocaleString('es-PE'), trend: kpis.clientes.trend, mini: 'bars', to: '/administrador/clientes' },
  ]

  return (
    <div className="min-h-screen -m-5 p-5 bg-[#F7F8FB] dark:bg-transparent font-jakarta">
      {/* ── Header ── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-5">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5">
            <h1 className="text-[22px] font-extrabold text-slate-800 dark:text-white tracking-tight truncate">Hola, {nombre} 👋</h1>
            <span className="text-[11px] font-bold px-2.5 py-1 rounded-full text-white shrink-0" style={{ background: ACCENT }}>En vivo</span>
          </div>
          <p className="text-sm text-slate-400 dark:text-gray-400 mt-0.5">
            Resumen de tu negocio · <span className="capitalize">{moment().format('dddd, D [de] MMMM')}</span>
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          {/* Selector de periodo */}
          <div className="flex items-center gap-1 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-1">
            {PERIODS.map((p) => (
              <button key={p.key} onClick={() => setPeriod(p.key)}
                className={`px-3 py-1.5 rounded-xl text-sm font-bold transition-colors ${period === p.key ? 'text-white' : 'text-slate-500 hover:bg-slate-50 dark:text-gray-300 dark:hover:bg-slate-700'}`}
                style={period === p.key ? { background: ACCENT } : undefined}>
                {p.label}
              </button>
            ))}
          </div>
          <button onClick={() => navigate('/administrador/facturacion/nuevo')}
            className="h-11 px-4 rounded-2xl text-white text-sm font-bold flex items-center gap-1.5 shadow-lg shadow-violet-500/30 hover:brightness-105 transition-all shrink-0"
            style={{ background: ACCENT }}>
            <Icon icon="solar:add-circle-bold" className="text-lg" /> <span className="hidden sm:inline">{rubroUI.ventaCta}</span>
          </button>
        </div>
      </div>

      {/* ── KPIs hero (tarjeta unificada con columnas divididas) ── */}
      <div className="rounded-3xl bg-white dark:bg-[#111827] shadow-[0_2px_20px_rgba(15,23,42,0.05)] dark:shadow-none border border-slate-100 dark:border-slate-800 overflow-hidden mb-4">
        <div className="grid grid-cols-2 lg:grid-cols-4">
          {kpiCards.map((c, idx) => (
            <div
              key={c.label}
              className={`flex flex-col border-slate-100 dark:border-slate-800 lg:border-t-0 ${idx % 2 === 1 ? 'border-l' : ''} ${idx >= 2 ? 'border-t' : ''} ${idx > 0 ? 'lg:border-l' : ''}`}
            >
              <div className="p-5 flex-1">
                <div className="flex items-center gap-1.5 text-slate-400 dark:text-gray-400">
                  <span className="text-[11px] font-black uppercase tracking-wide">{c.label}</span>
                  <Icon icon="solar:info-circle-linear" className="text-[13px]" />
                </div>
                <div className="mt-2.5 flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    {ovLoading ? (
                      <div className="h-8 w-24 rounded-lg bg-slate-100 dark:bg-slate-800 animate-pulse" />
                    ) : (
                      <p className="text-2xl font-extrabold text-slate-800 dark:text-white truncate">{c.value}</p>
                    )}
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      <span className="text-xs text-slate-400 dark:text-gray-400">vs mes anterior</span>
                      {!ovLoading && <Trend trend={c.trend} />}
                    </div>
                  </div>
                  <div className="shrink-0 pt-0.5">
                    <KpiMini type={c.mini} accent={ACCENT} data={c.mini === 'line' ? sparkVals : undefined} />
                  </div>
                </div>
              </div>
              <button onClick={() => navigate(c.to)} className="group w-full flex items-center justify-center gap-1.5 border-t border-slate-100 dark:border-slate-800 py-3 text-[13px] font-bold text-slate-600 dark:text-gray-300 hover:text-[var(--accent)] transition-colors">
                Ver detalle <Icon icon="solar:arrow-right-linear" className="transition-transform group-hover:translate-x-0.5" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* ── Requiere tu atención ── */}
      {(atencion.length > 0 || rubroUI.focus) && (
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2.5">
            <Icon icon="solar:danger-triangle-bold-duotone" className="text-amber-500 text-lg" />
            <h2 className="text-sm font-extrabold text-slate-700 dark:text-gray-200">Requiere tu atención</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {atencion.map((a) => {
              const t = toneMap[a.tone]
              return (
                <button key={a.key} onClick={() => navigate(a.to)}
                  className={`group flex items-center gap-3 rounded-2xl bg-white dark:bg-[#111827] p-4 text-left shadow-[0_2px_14px_rgba(15,23,42,0.05)] dark:shadow-none border border-slate-100 dark:border-slate-800 ring-1 ${t.ring} hover:shadow-md transition-all`}>
                  <div className={`h-11 w-11 shrink-0 grid place-items-center rounded-xl ${t.bg} ${t.text}`}>
                    <Icon icon={a.icon} className="text-2xl" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={`text-lg font-extrabold ${t.text}`}>{a.value}</p>
                    <p className="text-xs font-semibold text-slate-500 dark:text-gray-400 leading-tight">{a.label}</p>
                  </div>
                  <Icon icon="solar:alt-arrow-right-linear" className="text-slate-300 dark:text-slate-600 group-hover:text-slate-500 dark:group-hover:text-slate-400 transition-colors" />
                </button>
              )
            })}
            {rubroUI.focus && (() => {
              const t = toneMap[rubroUI.focus.tone]
              return (
                <button onClick={() => navigate(rubroUI.focus!.to)}
                  className={`group flex items-center gap-3 rounded-2xl bg-white dark:bg-[#111827] p-4 text-left shadow-[0_2px_14px_rgba(15,23,42,0.05)] dark:shadow-none border border-slate-100 dark:border-slate-800 ring-1 ${t.ring} hover:shadow-md transition-all`}>
                  <div className={`h-11 w-11 shrink-0 grid place-items-center rounded-xl ${t.bg} ${t.text}`}>
                    <Icon icon={rubroUI.focus.icon} className="text-2xl" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-extrabold text-slate-700 dark:text-gray-200 leading-tight">{rubroUI.focus.label}</p>
                    <p className="text-xs font-medium text-slate-400 dark:text-gray-400 leading-tight">{rubroUI.focus.hint}</p>
                  </div>
                  <Icon icon="solar:alt-arrow-right-linear" className="text-slate-300 dark:text-slate-600 group-hover:text-slate-500 dark:group-hover:text-slate-400 transition-colors" />
                </button>
              )
            })()}
          </div>
        </div>
      )}

      {/* ── Accesos rápidos por rubro ── */}
      <div className="flex flex-wrap gap-2 mb-4">
        {rubroUI.quickActions.map((q) => (
          <button key={q.label} onClick={() => navigate(q.to)}
            className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-bold transition-all border ${q.primary ? 'text-white border-transparent shadow-md shadow-violet-500/25 hover:brightness-105' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:text-violet-600 dark:bg-slate-800 dark:text-gray-300 dark:border-slate-700 dark:hover:bg-slate-700 dark:hover:text-violet-300'}`}
            style={q.primary ? { background: ACCENT } : undefined}>
            <Icon icon={q.icon} className="text-lg" /> {q.label}
          </button>
        ))}
      </div>

      {/* ── Rendimiento (gauge) + ventas del periodo (barras) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        {/* Gauge de margen (estilo Sales Performance) */}
        <div className="rounded-3xl bg-white dark:bg-[#111827] p-5 shadow-[0_2px_20px_rgba(15,23,42,0.05)] dark:shadow-none border border-slate-100 dark:border-slate-800 flex flex-col">
          <div className="flex items-center gap-1.5">
            <h3 className="text-sm font-extrabold text-slate-800 dark:text-white">Rendimiento</h3>
            <Icon icon="solar:info-circle-linear" className="text-[13px] text-slate-400" />
          </div>
          <div className="relative mx-auto mt-3 w-full max-w-[240px]">
            <div className="h-[128px]"><RadialGauge value={Number(financiero.margen ?? 0)} accent={ACCENT} /></div>
            <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col items-center">
              <span className="text-4xl font-extrabold leading-none text-slate-800 dark:text-white">{Number(financiero.margen ?? 0).toFixed(0)}</span>
              <span className="mt-1 text-xs font-medium text-slate-400 dark:text-gray-400">% de margen</span>
            </div>
          </div>
          <div className="mt-5 border-t border-slate-100 dark:border-slate-800 pt-4">
            <p className="text-sm font-bold text-slate-700 dark:text-gray-200">{margenMsg.title}</p>
            <p className="mt-1 text-xs text-slate-400 dark:text-gray-400 leading-relaxed">{margenMsg.hint}</p>
          </div>
          <button onClick={() => navigate('/administrador/finanzas/dashboard')} className="group mt-4 flex items-center gap-1.5 text-[13px] font-bold text-slate-700 dark:text-gray-200 hover:text-[var(--accent)] transition-colors">
            Mejorar mi margen <Icon icon="solar:arrow-right-linear" className="transition-transform group-hover:translate-x-0.5" />
          </button>
        </div>

        {/* Barras: ventas del periodo con barra destacada + tooltip oscuro */}
        <div className="rounded-3xl bg-white dark:bg-[#111827] p-5 shadow-[0_2px_20px_rgba(15,23,42,0.05)] dark:shadow-none border border-slate-100 dark:border-slate-800 lg:col-span-2">
          <div className="mb-4 flex items-start justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <h3 className="text-sm font-extrabold text-slate-800 dark:text-white">Ventas del periodo</h3>
              <Icon icon="solar:info-circle-linear" className="text-[13px] text-slate-400" />
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-xs font-bold text-slate-500 dark:text-gray-300">
              <Icon icon="solar:calendar-linear" /> {periodLabel}
            </span>
          </div>
          <div className="h-64">
            {chartVentas.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartVentas} margin={{ top: 8, right: 4, left: -12, bottom: 0 }} barCategoryGap="26%">
                  <XAxis dataKey="date" tickFormatter={(l) => moment(l).format('DD')} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} interval="preserveStartEnd" minTickGap={12} />
                  <Tooltip cursor={{ fill: 'transparent' }} content={DarkTooltip(formatMoney)} />
                  <Bar dataKey="total" radius={[999, 999, 999, 999]} maxBarSize={22}>
                    {chartVentas.map((d, i) => (
                      <Cell key={i} fill={ventasMax > 0 && d.total >= ventasMax ? ACCENT : mutedBar} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full flex-col items-center justify-center text-slate-300 dark:text-slate-600">
                <Icon icon="solar:chart-2-linear" className="text-5xl mb-2" />
                <p className="text-sm text-slate-400 dark:text-gray-400">Sin ventas en este periodo</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Cómo te pagan (donut) + top productos ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        {/* Donut canales */}
        <div className="rounded-3xl bg-white dark:bg-[#111827] p-5 shadow-[0_2px_20px_rgba(15,23,42,0.05)] dark:shadow-none border border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-1.5">
            <h3 className="text-sm font-extrabold text-slate-800 dark:text-white">Cómo te pagan</h3>
            <Icon icon="solar:info-circle-linear" className="text-[13px] text-slate-400" />
          </div>
          <p className="mb-2 text-xs text-slate-400 dark:text-gray-400">Canales del periodo</p>
          <div className="relative mx-auto h-36 w-36">
            {chartCanales.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={chartCanales} dataKey="value" nameKey="name" innerRadius={48} outerRadius={68} paddingAngle={2} stroke="none">
                    {chartCanales.map((_, i) => <Cell key={i} fill={SERIES[i % SERIES.length]} />)}
                  </Pie>
                  <Tooltip formatter={(_v: any, n: any, item: any) => [`${(item?.payload?.percentage ?? 0).toFixed(0)}%`, n]} contentStyle={{ fontSize: 12, borderRadius: 8, borderColor: '#e5e7eb' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-center text-sm text-slate-300 dark:text-slate-600">Sin datos</div>
            )}
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-base font-extrabold text-slate-800 dark:text-white">{formatShort(canalTotal)}</span>
              <span className="text-[10px] font-medium text-slate-400 dark:text-gray-400">total</span>
            </div>
          </div>
          <div className="mt-4 space-y-2">
            {chartCanales.map((c, i) => (
              <div key={c.name} className="flex items-center justify-between gap-2 text-sm">
                <span className="flex min-w-0 items-center gap-2">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: SERIES[i % SERIES.length] }} />
                  <span className="truncate font-medium text-slate-600 dark:text-gray-300">{c.name}</span>
                </span>
                <span className="shrink-0 font-bold text-slate-500 dark:text-gray-400">{formatMoney(c.value)}</span>
              </div>
            ))}
            {chartCanales.length === 0 && <p className="text-center text-xs text-slate-400 dark:text-gray-400 py-2">Aún no hay pagos registrados</p>}
          </div>
        </div>

        {/* Top productos */}
        <div className="rounded-3xl bg-white dark:bg-[#111827] p-5 shadow-[0_2px_20px_rgba(15,23,42,0.05)] dark:shadow-none border border-slate-100 dark:border-slate-800 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-extrabold text-slate-800 dark:text-white">{rubroUI.productosLabel}</h3>
            <button onClick={() => navigate('/administrador/kardex/productos')} className="text-xs font-bold hover:underline text-[var(--accent)]">Ver todos</button>
          </div>
          <div className="space-y-4">
            {topProductos.length > 0 ? topProductos.slice(0, 5).map((p, i) => {
              const max = topProductos[0]?.total || 1
              const pct = ((p.total || 0) / max) * 100
              const color = SERIES[i % SERIES.length]
              return (
                <div key={p.productoId || i} className="flex items-center gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white" style={{ background: color }}>{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex items-baseline justify-between gap-2">
                      <span className="truncate text-[13px] font-semibold text-slate-800 dark:text-white">{p.producto?.descripcion || 'Producto sin nombre'}</span>
                      <span className="shrink-0 text-[13px] font-bold text-slate-700 dark:text-gray-200">{formatMoney(p.total)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
                      </div>
                      <span className="w-14 shrink-0 text-right text-[11px] font-medium text-slate-400 dark:text-gray-400">{p.cantidad ?? 0} u.</span>
                    </div>
                  </div>
                </div>
              )
            }) : (
              <p className="py-6 text-center text-sm text-slate-400 dark:text-gray-400">Sin productos vendidos en este periodo</p>
            )}
          </div>
        </div>
      </div>

      {/* ── Resumen financiero ── */}
      <div className="rounded-3xl bg-white dark:bg-[#111827] p-5 shadow-[0_2px_20px_rgba(15,23,42,0.05)] dark:shadow-none border border-slate-100 dark:border-slate-800 mb-4">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-extrabold text-slate-800 dark:text-white">Resumen financiero</h3>
          <span className="text-xs text-slate-400 dark:text-gray-400">{periodLabel}</span>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { key: 'ingresos', label: 'Ingresos', value: financiero.ingresos?.value ?? 0, trend: financiero.ingresos?.trend ?? 0, icon: 'solar:wallet-money-bold-duotone', tone: 'violet', invert: false },
            { key: 'compras', label: 'Compras', value: financiero.compras?.value ?? 0, trend: financiero.compras?.trend ?? 0, icon: 'solar:cart-large-2-bold-duotone', tone: 'amber', invert: true },
            { key: 'gastos', label: 'Gastos', value: financiero.gastos?.value ?? 0, trend: financiero.gastos?.trend ?? 0, icon: 'solar:bill-list-bold-duotone', tone: 'rose', invert: true },
            { key: 'ganancias', label: 'Total neto', value: financiero.ganancias?.value ?? 0, trend: financiero.ganancias?.trend ?? 0, icon: 'solar:chart-square-bold-duotone', tone: 'emerald', invert: false },
          ].map((f) => {
            const t = toneMap[f.tone] ?? toneMap.violet
            return (
              <div key={f.key} className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 p-4">
                <div className="flex items-center justify-between">
                  <div className={`h-9 w-9 grid place-items-center rounded-xl ${t.bg} ${t.text}`}>
                    <Icon icon={f.icon} className="text-lg" />
                  </div>
                  {!ovLoading && <Trend trend={f.invert ? -f.trend : f.trend} />}
                </div>
                <p className="mt-3 text-[11px] font-black uppercase tracking-wide text-slate-400 dark:text-gray-400">{f.label}</p>
                <p className="mt-0.5 text-lg font-extrabold text-slate-800 dark:text-white truncate">{formatMoney(f.value)}</p>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Productos más vendidos por categoría ── */}
      <div className="rounded-3xl bg-white dark:bg-[#111827] p-5 shadow-[0_2px_20px_rgba(15,23,42,0.05)] dark:shadow-none border border-slate-100 dark:border-slate-800 mb-4">
        <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h3 className="text-sm font-extrabold text-slate-800 dark:text-white">Productos más vendidos por categoría</h3>
          <div className="flex items-center gap-2.5">
            {/* Segmento moneda: General (S/) vs Exportación (US$) */}
            <div className="inline-flex items-center gap-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-1">
              <button onClick={() => setCatMoneda('PEN')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${catMoneda === 'PEN' ? 'text-white' : 'text-slate-500 hover:bg-slate-50 dark:text-gray-300 dark:hover:bg-slate-700'}`}
                style={catMoneda === 'PEN' ? { background: ACCENT } : undefined}>
                General (S/)
              </button>
              <button onClick={() => setCatMoneda('USD')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${catMoneda === 'USD' ? 'text-white' : 'text-slate-500 hover:bg-slate-50 dark:text-gray-300 dark:hover:bg-slate-700'}`}
                style={catMoneda === 'USD' ? { background: ACCENT } : undefined}>
                Exportación (US$)
              </button>
            </div>
            {/* Selector de categoría */}
            <select value={catSelId ?? 0} onChange={(e) => setCatSelId(Number(e.target.value) || null)}
              className="h-9 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-xs font-semibold text-slate-600 dark:text-gray-300 focus:outline-none focus:border-[var(--accent)]">
              <option value={0}>Todas las categorías</option>
              {(topPorCategoria?.categorias ?? []).map((c: any) => (
                <option key={c.id} value={c.id}>{c.nombre}</option>
              ))}
            </select>
          </div>
        </div>

        {(!topPorCategoria || (topPorCategoria.grupos ?? []).length === 0) ? (
          <p className="py-8 text-center text-sm text-slate-400 dark:text-gray-400">
            No hay productos vendidos en {catMoneda === 'USD' ? 'Exportación (US$)' : 'General (S/)'} para este periodo
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {(topPorCategoria.grupos ?? []).map((g: any) => {
              const maxVal = g.productos[0]?.total || 1
              return (
                <div key={g.categoriaId} className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 p-4">
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <h4 className="truncate text-sm font-bold text-slate-800 dark:text-white pr-2">{g.categoriaNombre}</h4>
                    <span className="shrink-0 text-xs font-bold text-slate-500 dark:text-gray-400">{money(g.total, topPorCategoria.moneda)}</span>
                  </div>
                  <div className="space-y-3">
                    {g.productos.map((p: any, i: number) => {
                      const pct = ((p.total || 0) / maxVal) * 100
                      const color = SERIES[i % SERIES.length]
                      return (
                        <div key={p.productoId || i}>
                          <div className="mb-1 flex items-baseline justify-between gap-2">
                            <span className="truncate text-[13px] font-semibold text-slate-700 dark:text-gray-200 pr-2">{p.producto?.descripcion || 'Producto sin nombre'}</span>
                            <span className="shrink-0 text-[13px] font-bold text-slate-600 dark:text-gray-300">{money(p.total, topPorCategoria.moneda)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
                              <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
                            </div>
                            <span className="w-14 shrink-0 text-right text-[11px] font-medium text-slate-400 dark:text-gray-400">{p.cantidad ?? 0} u.</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Comprobantes recientes (tabla) ── */}
      <div className="bg-white dark:bg-[#111827] rounded-3xl shadow-[0_2px_20px_rgba(15,23,42,0.05)] dark:shadow-none overflow-hidden">
        <div className="flex flex-wrap items-center gap-2.5 p-4 border-b border-slate-100 dark:border-slate-800">
          <h3 className="text-sm font-extrabold text-slate-800 dark:text-white mr-1">Comprobantes recientes</h3>
          <div className="relative flex-1 min-w-[180px] lg:max-w-xs">
            <Icon icon="solar:magnifer-linear" className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-gray-400 text-sm" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar cliente o documento…"
              className="w-full h-9 pl-9 pr-8 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-700 dark:text-white placeholder:text-slate-400 dark:placeholder:text-gray-500 focus:outline-none focus:border-[var(--accent)] transition-colors" />
            {search && <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-300 dark:text-slate-600 hover:text-slate-500 dark:hover:text-slate-400"><Icon icon="solar:close-circle-bold" /></button>}
          </div>
          {/* Filtro */}
          <div className="relative">
            <button onClick={() => { setShowFilter((v) => !v); setShowSort(false) }} className="h-9 px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-600 dark:text-gray-300 flex items-center gap-1.5 hover:bg-slate-50 dark:hover:bg-slate-700">
              <Icon icon="solar:filter-linear" /> Filtro {estado && <span className="ml-0.5 h-5 min-w-5 px-1 grid place-items-center rounded-full text-white text-[11px]" style={{ background: ACCENT }}>1</span>}
            </button>
            {showFilter && (
              <div className="absolute z-20 mt-2 w-44 rounded-2xl border border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-xl dark:shadow-none p-1.5">
                {ESTADOS.map((e) => (
                  <button key={e.key} onClick={() => { setEstado(e.key); setShowFilter(false) }}
                    className={`w-full text-left px-3 py-2 rounded-xl text-sm font-medium flex items-center justify-between ${estado === e.key ? 'bg-violet-50 text-violet-700 dark:bg-violet-900/20 dark:text-violet-300' : 'text-slate-600 hover:bg-slate-50 dark:text-gray-300 dark:hover:bg-slate-700'}`}>
                    {e.label} {estado === e.key && <Icon icon="solar:check-circle-bold" style={{ color: ACCENT }} />}
                  </button>
                ))}
              </div>
            )}
          </div>
          {/* Orden */}
          <div className="relative">
            <button onClick={() => { setShowSort((v) => !v); setShowFilter(false) }} className="h-9 px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-600 dark:text-gray-300 flex items-center gap-1.5 hover:bg-slate-50 dark:hover:bg-slate-700">
              <Icon icon="solar:sort-vertical-linear" /> {SORTS.find((s) => s.key === sort)?.label}
            </button>
            {showSort && (
              <div className="absolute z-20 mt-2 w-44 rounded-2xl border border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-xl dark:shadow-none p-1.5">
                {SORTS.map((s) => (
                  <button key={s.key} onClick={() => { setSort(s.key); setShowSort(false) }}
                    className={`w-full text-left px-3 py-2 rounded-xl text-sm font-medium flex items-center justify-between ${sort === s.key ? 'bg-violet-50 text-violet-700 dark:bg-violet-900/20 dark:text-violet-300' : 'text-slate-600 hover:bg-slate-50 dark:text-gray-300 dark:hover:bg-slate-700'}`}>
                    {s.label} {sort === s.key && <Icon icon="solar:check-circle-bold" style={{ color: ACCENT }} />}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="ml-auto flex items-center gap-2.5">
            <button onClick={exportCSV} className="h-9 px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-600 dark:text-gray-300 flex items-center gap-1.5 hover:bg-slate-50 dark:hover:bg-slate-700">
              <Icon icon="solar:upload-minimalistic-linear" /> <span className="hidden sm:inline">Exportar</span>
            </button>
            <button onClick={() => navigate('/administrador/facturacion/comprobantes')} className="h-9 px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-600 dark:text-gray-300 flex items-center gap-1.5 hover:bg-slate-50 dark:hover:bg-slate-700">
              <Icon icon="solar:eye-linear" /> <span className="hidden sm:inline">Ver todo</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[820px]">
            <thead>
              <tr className="text-[11px] font-bold uppercase tracking-wide text-slate-400 dark:text-gray-400 border-b border-slate-100 dark:border-slate-800">
                <th className="py-3 pl-5 px-3">Cliente</th>
                <th className="py-3 px-3">Documento</th>
                <th className="py-3 px-3">Total</th>
                <th className="py-3 px-3">Sede</th>
                <th className="py-3 px-3">Estado</th>
                <th className="py-3 px-3">Fecha</th>
                <th className="py-3 px-3 pr-5">Tipo</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="border-b border-slate-50 dark:border-slate-800"><td colSpan={7} className="py-3.5 px-5"><div className="h-6 rounded-lg bg-slate-100 dark:bg-slate-800 animate-pulse" /></td></tr>
                ))
              ) : sortedRows.length === 0 ? (
                <tr><td colSpan={7} className="py-16 text-center">
                  <Icon icon="solar:inbox-linear" className="text-5xl text-slate-200 dark:text-slate-700 mx-auto mb-2" />
                  <p className="text-slate-400 dark:text-gray-400 text-sm">No hay comprobantes para mostrar.</p>
                </td></tr>
              ) : sortedRows.map((inv) => {
                const pill = estadoPill(inv.estadoEnvioSunat)
                const sunatNorm = String(inv.estadoEnvioSunat ?? '').toUpperCase()
                // No tiene sentido mostrar estado de pago si SUNAT rechazó/anuló el comprobante:
                // no es una venta válida hasta corregirlo/reemitirlo.
                const comprobanteInvalido = ['RECHAZADO', 'FALLIDO_ENVIO', 'ERROR', 'OBSERVADO', 'ANULADO', 'BAJA'].includes(sunatNorm)
                const estadoPagoNorm = String(inv.estadoPago ?? '').toUpperCase()
                const pagoCfg =
                  estadoPagoNorm === 'COMPLETADO'
                    ? { label: 'Pagado', cls: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400' }
                    : estadoPagoNorm === 'PAGO_PARCIAL'
                      ? { label: 'Parcial', cls: 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400' }
                      : estadoPagoNorm === 'ANULADO'
                        ? { label: 'Anulado', cls: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400' }
                        : { label: 'Por cobrar', cls: 'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400' }
                const cliente = inv.cliente?.nombre || inv.clienteNombre || 'Cliente varios'
                return (
                  <tr key={inv.id} className="border-b border-slate-50 dark:border-slate-800 hover:bg-slate-50/60 dark:hover:bg-slate-800/50 transition-colors group">
                    <td className="py-3 pl-5 px-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-violet-400 to-indigo-500 text-white grid place-items-center text-xs font-bold shrink-0">{cliente.charAt(0).toUpperCase()}</div>
                        <span className="font-semibold text-slate-700 dark:text-gray-200 text-sm truncate max-w-[180px]">{cliente}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-sm text-slate-600 dark:text-gray-300">{inv.serie}-{String(inv.correlativo).padStart(8, '0')}</span>
                        <button onClick={() => copyDoc(inv)} className="opacity-0 group-hover:opacity-100 text-slate-300 dark:text-slate-600 hover:text-slate-600 dark:hover:text-slate-300 transition-opacity">
                          <Icon icon={copied === inv.id ? 'solar:check-read-linear' : 'solar:copy-linear'} className={copied === inv.id ? 'text-emerald-500' : ''} />
                        </button>
                      </div>
                    </td>
                    <td className="py-3 px-3 font-bold text-slate-800 dark:text-white text-sm">{money(inv.mtoImpVenta, inv.tipoMoneda)}</td>
                    <td className="py-3 px-3 text-sm text-slate-500 dark:text-gray-400 truncate max-w-[160px]">{inv.sede?.nombre || '—'}</td>
                    <td className="py-3 px-3">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${pill.bg} ${pill.text}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${pill.dot}`} /> {pill.label}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-sm text-slate-500 dark:text-gray-400">{moment(inv.fechaEmision).format('DD/MM/YYYY')}</td>
                    <td className="py-3 px-3 pr-5">
                      <div className="flex items-center gap-1.5">
                        <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400">{TIPO_DOC_LABEL[inv.tipoDoc] || inv.tipoDoc}</span>
                        {!comprobanteInvalido && (
                          <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${pagoCfg.cls}`}>{pagoCfg.label}</span>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 p-4 border-t border-slate-100 dark:border-slate-800">
          <span className="text-sm text-slate-400 dark:text-gray-400">{fromRow}-{toRow} de {total.toLocaleString('es-PE')}</span>
          <div className="flex items-center gap-1">
            <button disabled={page <= 1} onClick={() => setPage(1)} className="h-8 w-8 grid place-items-center rounded-lg text-slate-400 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30"><Icon icon="solar:double-alt-arrow-left-linear" /></button>
            <button disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="h-8 w-8 grid place-items-center rounded-lg text-slate-400 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30"><Icon icon="solar:alt-arrow-left-linear" /></button>
            {pageNumbers.map((n, i) => {
              const prev = pageNumbers[i - 1]; const gap = prev && n - prev > 1
              return (
                <span key={n} className="flex items-center">
                  {gap && <span className="px-1 text-slate-300 dark:text-slate-600">…</span>}
                  <button onClick={() => setPage(n)} className={`h-8 min-w-8 px-2 grid place-items-center rounded-lg text-sm font-semibold transition-colors ${n === page ? 'text-white' : 'text-slate-500 hover:bg-slate-100 dark:text-gray-400 dark:hover:bg-slate-800'}`} style={n === page ? { background: ACCENT } : undefined}>{n}</button>
                </span>
              )
            })}
            <button disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} className="h-8 w-8 grid place-items-center rounded-lg text-slate-400 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30"><Icon icon="solar:alt-arrow-right-linear" /></button>
            <button disabled={page >= totalPages} onClick={() => setPage(totalPages)} className="h-8 w-8 grid place-items-center rounded-lg text-slate-400 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30"><Icon icon="solar:double-alt-arrow-right-linear" /></button>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-400 dark:text-gray-400">
            <span>Filas/pág</span>
            <Select label="" name="limit" error="" options={PER_PAGE.map((n) => ({ id: n, value: String(n) }))} value={String(limit)} onChange={(id) => setLimit(Number(id))} />
          </div>
        </div>
      </div>

      {/* Tour de bienvenida — solo primer login */}
      {showModal && auth && <WelcomeModal user={auth} onStartTour={startTour} onSkip={skipTour} />}
      {tourStep !== null && <TourSpotlight step={tourStep} onNext={nextStep} onPrev={prevStep} onEnd={endTour} />}
    </div>
  )
}
