import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Icon } from '@iconify/react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { feature } from 'topojson-client'
import { geoContains } from 'd3-geo'
import landTopo from 'world-atlas/land-110m.json'
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
import apiClient from '@/utils/apiClient'
import { useAuthStore } from '@/zustand/auth'
import { useThemeStore } from '@/zustand/theme'
import { BRAND } from '@/lib/branding'

// Posiciones de los puntos del globo (continentes) — se calculan UNA sola vez
// y se cachean a nivel de módulo para no recalcular en cada montaje/tema.
let cachedGlobePositions: Float32Array | null = null
function getGlobePositions(): Float32Array {
  if (cachedGlobePositions) return cachedGlobePositions
  const land: any = feature(landTopo as any, (landTopo as any).objects.land)
  const R = 100
  const N = 13000
  const golden = Math.PI * (3 - Math.sqrt(5))
  const pos: number[] = []
  for (let i = 0; i < N; i++) {
    const y = 1 - (i / (N - 1)) * 2
    const rad = Math.sqrt(1 - y * y)
    const theta = i * golden
    const x = Math.cos(theta) * rad
    const z = Math.sin(theta) * rad
    const lat = (Math.asin(y) * 180) / Math.PI
    const lon = (Math.atan2(z, x) * 180) / Math.PI
    if (geoContains(land, [lon, lat])) pos.push(x * R, y * R, z * R)
  }
  cachedGlobePositions = new Float32Array(pos)
  return cachedGlobePositions
}

/**
 * Dashboard del Superadmin (ADMIN_SISTEMA) — estilo Vision UI.
 * Un banner en degradado hace de fondo del que "emergen" las stat cards,
 * los gráficos y la tabla de empresas. Datos reales desde el módulo
 * sistema-finanzas (MRR/ARR, empresas activas, distribución de planes,
 * tendencia mensual). Ruta: /administrador/sistema/dashboard
 */

const PLAN_COLORS = ['#7551ff', '#3b82f6', '#01b574', '#f59e0b', '#ec4899', '#22d3ee']

const money = (v: number) =>
  `S/ ${Number(v ?? 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const moneyShort = (v: number) => {
  const n = Number(v ?? 0)
  if (Math.abs(n) >= 1_000_000) return `S/ ${(n / 1_000_000).toFixed(1)}M`
  if (Math.abs(n) >= 1_000) return `S/ ${(n / 1_000).toFixed(1)}K`
  return `S/ ${n.toFixed(0)}`
}

function Trend({ value, invert = false }: { value: number; invert?: boolean }) {
  const pos = invert ? value <= 0 : value >= 0
  return (
    <span className={`inline-flex items-center gap-0.5 text-[13px] font-bold ${pos ? 'text-emerald-400' : 'text-rose-400'}`}>
      <Icon icon={value >= 0 ? 'solar:alt-arrow-up-bold' : 'solar:alt-arrow-down-bold'} />
      {Math.abs(value ?? 0).toFixed(1)}%
    </span>
  )
}

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border border-white/10 bg-[#0b1437]/95 px-3 py-2 shadow-xl backdrop-blur">
      <p className="mb-1 text-xs font-bold text-white">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} className="text-xs" style={{ color: p.color || p.stroke }}>
          {p.name}: <span className="font-semibold">{money(p.value)}</span>
        </p>
      ))}
    </div>
  )
}

/**
 * Globo hueco de puntos (three.js): esfera transparente con los continentes en
 * puntos (blancos en oscuro, negros en claro). Gira solo y se arrastra con el
 * mouse. El cálculo de puntos se cachea y la inicialización se difiere para no
 * bloquear la carga del dashboard.
 */
function SpinningGlobe() {
  const mountRef = useRef<HTMLDivElement>(null)
  const { isDarkMode } = useThemeStore()
  const SIZE = 460

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return

    let disposed = false
    let raf = 0
    let renderer: THREE.WebGLRenderer | null = null
    let controls: OrbitControls | null = null
    let geo: THREE.BufferGeometry | null = null
    let mat: THREE.PointsMaterial | null = null

    const init = () => {
      if (disposed || !mountRef.current) return

      geo = new THREE.BufferGeometry()
      geo.setAttribute('position', new THREE.BufferAttribute(getGlobePositions(), 3))
      mat = new THREE.PointsMaterial({
        color: isDarkMode ? 0xffffff : 0x0b1437,
        size: 1.7,
        sizeAttenuation: true,
        transparent: true,
        opacity: isDarkMode ? 0.85 : 0.9,
        depthWrite: false,
      })
      const points = new THREE.Points(geo, mat)
      points.rotation.x = 0.35

      const scene = new THREE.Scene()
      scene.add(points)

      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
      renderer.setSize(SIZE, SIZE)
      renderer.setClearColor(0x000000, 0)
      mountRef.current.appendChild(renderer.domElement)
      renderer.domElement.style.cursor = 'grab'

      const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 1000)
      camera.position.z = 235

      controls = new OrbitControls(camera, renderer.domElement)
      controls.enableZoom = false
      controls.enablePan = false
      controls.autoRotate = true
      controls.autoRotateSpeed = 0.6
      controls.rotateSpeed = 0.5
      controls.minPolarAngle = Math.PI / 3.2
      controls.maxPolarAngle = Math.PI - Math.PI / 3.2
      const rEl = renderer.domElement
      controls.addEventListener('start', () => (rEl.style.cursor = 'grabbing'))
      controls.addEventListener('end', () => (rEl.style.cursor = 'grab'))

      const animate = () => {
        if (disposed) return
        controls!.update()
        renderer!.render(scene, camera)
        raf = requestAnimationFrame(animate)
      }
      animate()
    }

    // Diferir la inicialización pesada para que las tarjetas carguen primero.
    const w = window as any
    const handle = w.requestIdleCallback
      ? w.requestIdleCallback(init, { timeout: 800 })
      : window.setTimeout(init, 80)

    return () => {
      disposed = true
      if (w.cancelIdleCallback && typeof handle === 'number') w.cancelIdleCallback(handle)
      else clearTimeout(handle)
      cancelAnimationFrame(raf)
      controls?.dispose()
      geo?.dispose()
      mat?.dispose()
      if (renderer) {
        renderer.dispose()
        if (renderer.domElement.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement)
      }
    }
  }, [isDarkMode])

  return (
    <div
      ref={mountRef}
      className="relative flex items-center justify-center"
      style={{ width: SIZE, height: SIZE, maxWidth: '100%', touchAction: 'none' }}
    />
  )
}

export default function SistemaDashboard() {
  const navigate = useNavigate()
  const { auth } = useAuthStore()
  const [dash, setDash] = useState<any>(null)
  const [tendencia, setTendencia] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    ;(async () => {
      setLoading(true)
      try {
        const [d, t] = await Promise.all([
          apiClient.get('/sistema-finanzas/dashboard'),
          apiClient.get('/sistema-finanzas/tendencia?meses=12'),
        ])
        if (!alive) return
        setDash(d.data?.data ?? d.data)
        const lista = t.data?.data ?? t.data
        setTendencia(Array.isArray(lista) ? lista : [])
      } catch {
        /* alertado por interceptor */
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [])

  const planes = useMemo(
    () =>
      (dash?.distribucionPlanes ?? []).map((p: any, i: number) => ({
        name: p.nombre,
        value: p.count,
        costo: p.costo,
        color: PLAN_COLORS[i % PLAN_COLORS.length],
      })),
    [dash],
  )
  const totalPlanes = planes.reduce((a: number, p: any) => a + p.value, 0)

  if (loading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center text-gray-400">
        <Icon icon="line-md:loading-twotone-loop" className="mr-2 text-4xl text-indigo-400" />
        Cargando panel del sistema...
      </div>
    )
  }

  const d = dash || {}

  const stats = [
    {
      label: 'MRR — Ingreso recurrente',
      value: money(d.mrr),
      icon: 'solar:refresh-circle-bold',
      grad: 'from-indigo-500 to-violet-600',
      foot: `ARR ${moneyShort(d.arr)}`,
    },
    {
      label: 'Ingresos del mes',
      value: money(d.ingMes),
      icon: 'solar:wallet-money-bold',
      grad: 'from-emerald-400 to-teal-600',
      trend: d.crecimientoClientes,
    },
    {
      label: 'Ganancia neta',
      value: money(d.gananciaNetaMes),
      icon: 'solar:chart-2-bold',
      grad: 'from-sky-400 to-blue-600',
      foot: `Margen ${Number(d.margenMes ?? 0).toFixed(0)}%`,
    },
    {
      label: 'Empresas activas',
      value: Number(d.totalActivos ?? 0).toLocaleString('es-PE'),
      icon: 'solar:buildings-2-bold',
      grad: 'from-fuchsia-500 to-purple-600',
      foot: `${d.totalInactivos ?? 0} inactivas`,
    },
  ]

  return (
    <div className="relative isolate min-h-screen px-3 pb-10 pt-2 font-inter sm:px-4">
      {/* ── HERO: 4 stat cards (izquierda) + globo giratorio (derecha) ────── */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-5 xl:items-center">
        {/* Izquierda: título + tarjetas 2x2 */}
        <div className="xl:col-span-3">
          <p className="mb-1 text-xs font-bold uppercase tracking-[0.18em] text-indigo-500 dark:text-indigo-300/80">
            {BRAND.name} · Panel del Sistema
          </p>
          <h1 className="text-2xl font-extrabold leading-tight text-gray-900 dark:text-white sm:text-[30px]">
            Estadísticas generales
          </h1>
          <p className="mb-5 mt-1 text-sm text-gray-500 dark:text-white/60">
            Hola, {auth?.nombre?.split(' ')[0] || 'Superadmin'} 👋 — resumen ejecutivo de la plataforma.
          </p>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {stats.map((s) => (
              <div
                key={s.label}
                className="rounded-2xl border border-gray-100 bg-white p-5 shadow-lg shadow-gray-200/50 dark:border-transparent dark:bg-[#0f1535]/60 dark:shadow-black/30 dark:backdrop-blur-xl"
              >
                <div className="mb-4 flex items-start justify-between gap-2">
                  <p className="text-[13px] font-bold text-gray-500 dark:text-gray-300">{s.label}</p>
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] bg-gradient-to-br ${s.grad} text-white shadow-lg shadow-indigo-500/30`}>
                    <Icon icon={s.icon} className="text-xl" />
                  </div>
                </div>
                <p className="truncate text-[24px] font-extrabold leading-none text-gray-900 dark:text-white">{s.value}</p>
                <div className="mt-2 flex items-center gap-2">
                  {typeof s.trend === 'number' ? <Trend value={s.trend} /> : null}
                  {s.foot ? <span className="text-xs font-medium text-gray-400 dark:text-gray-500">{s.foot}</span> : null}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Derecha: globo giratorio */}
        <div className="relative hidden min-h-[360px] items-center justify-center xl:col-span-2 xl:flex">
          <SpinningGlobe />
        </div>
      </div>

      {/* ── CHARTS ────────────────────────────────────────────────────────── */}
      <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Tendencia */}
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-transparent dark:bg-[#111c44]/70 dark:backdrop-blur-xl lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Tendencia (12 meses)</h3>
              <p className="text-xs text-gray-400">Ingresos vs. gastos de la plataforma</p>
            </div>
            <div className="flex items-center gap-4 text-xs font-semibold">
              <span className="flex items-center gap-1.5 text-gray-500 dark:text-gray-300"><span className="h-2.5 w-2.5 rounded-full bg-[#01b574]" />Ingresos</span>
              <span className="flex items-center gap-1.5 text-gray-500 dark:text-gray-300"><span className="h-2.5 w-2.5 rounded-full bg-[#f43f5e]" />Gastos</span>
            </div>
          </div>
          {tendencia.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={tendencia} margin={{ top: 6, right: 8, left: -12, bottom: 0 }}>
                <defs>
                  <linearGradient id="gIng" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#01b574" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#01b574" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gGas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f43f5e" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#f43f5e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)" vertical={false} />
                <XAxis dataKey="mes" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={moneyShort} width={60} />
                <Tooltip content={<ChartTooltip />} />
                <Area type="monotone" dataKey="ingresos" name="Ingresos" stroke="#01b574" strokeWidth={2.5} fill="url(#gIng)" />
                <Area type="monotone" dataKey="gastos" name="Gastos" stroke="#f43f5e" strokeWidth={2.5} fill="url(#gGas)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-[260px] items-center justify-center text-sm text-gray-400">Sin datos de tendencia</div>
          )}
        </div>

        {/* Distribución de planes */}
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-transparent dark:bg-[#111c44]/70 dark:backdrop-blur-xl">
          <h3 className="mb-4 text-lg font-bold text-gray-900 dark:text-white">Distribución de planes</h3>
          {planes.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={planes} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={52} outerRadius={80} paddingAngle={3} stroke="none">
                    {planes.map((p: any) => (
                      <Cell key={p.name} fill={p.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }: any) =>
                      active && payload?.length ? (
                        <div className="rounded-xl border border-white/10 bg-[#0b1437]/95 px-3 py-1.5 text-xs font-semibold text-white shadow-xl backdrop-blur">
                          {payload[0].name}: {payload[0].value} empresa(s)
                        </div>
                      ) : null
                    }
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-4 space-y-2.5">
                {planes.map((p: any) => (
                  <div key={p.name} className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: p.color }} />
                      <span className="truncate text-sm font-medium text-gray-600 dark:text-gray-300">{p.name}</span>
                    </div>
                    <span className="shrink-0 text-[13px] font-bold text-gray-500 dark:text-gray-400">
                      {p.value} · {totalPlanes ? ((p.value / totalPlanes) * 100).toFixed(0) : 0}%
                    </span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex h-[180px] items-center justify-center text-sm text-gray-400">Sin planes</div>
          )}
        </div>
      </div>

      {/* ── TABLA DE EMPRESAS ACTIVAS ─────────────────────────────────────── */}
      <div className="mt-6 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-transparent dark:bg-[#111c44]/70 dark:backdrop-blur-xl">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Empresas activas</h3>
            <p className="text-xs text-gray-400">
              {d.totalActivos ?? 0} activas · {d.proximasVencer ?? 0} por vencer pronto
            </p>
          </div>
          <button
            onClick={() => navigate('/administrador/empresas')}
            className="rounded-xl bg-indigo-500/10 px-3.5 py-2 text-xs font-bold text-indigo-500 transition-colors hover:bg-indigo-500/20 dark:text-indigo-300"
          >
            Ver todas <Icon icon="solar:alt-arrow-right-linear" className="ml-0.5 inline" />
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left">
            <thead>
              <tr className="border-b border-gray-100 text-[11px] font-bold uppercase tracking-wide text-gray-400 dark:border-white/10">
                <th className="pb-3 pr-4">Empresa</th>
                <th className="pb-3 pr-4">Plan</th>
                <th className="pb-3 pr-4">Mensual</th>
                <th className="pb-3 pr-4">Administrador</th>
                <th className="pb-3">Vence</th>
              </tr>
            </thead>
            <tbody>
              {(d.empresasActivas ?? []).slice(0, 8).map((e: any) => {
                const dias = e.fechaExpiracion
                  ? Math.ceil((new Date(e.fechaExpiracion).getTime() - Date.now()) / 86400000)
                  : null
                const venceColor = dias == null ? 'text-gray-400' : dias <= 7 ? 'text-rose-400' : dias <= 30 ? 'text-amber-400' : 'text-emerald-400'
                return (
                  <tr key={e.id} className="border-b border-gray-50 last:border-0 dark:border-white/5">
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-indigo-500/20 to-violet-500/20 text-indigo-400">
                          {e.logo ? <img src={e.logo} alt="" className="h-9 w-9 object-cover" /> : <Icon icon="solar:buildings-2-bold" />}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-[13px] font-bold text-gray-900 dark:text-white">{e.nombre}</p>
                          <p className="truncate text-xs text-gray-400">{e.ruc}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 pr-4">
                      <span className="rounded-lg bg-indigo-500/10 px-2 py-1 text-xs font-bold text-indigo-500 dark:text-indigo-300">{e.plan}</span>
                    </td>
                    <td className="py-3 pr-4 text-[13px] font-bold text-gray-700 dark:text-gray-200">{money(e.costoMensual)}</td>
                    <td className="py-3 pr-4">
                      <p className="truncate text-[13px] font-medium text-gray-700 dark:text-gray-200">{e.admin || '—'}</p>
                      <p className="truncate text-xs text-gray-400">{e.adminEmail || ''}</p>
                    </td>
                    <td className={`py-3 text-[13px] font-bold ${venceColor}`}>
                      {dias == null ? '—' : dias < 0 ? 'Vencida' : `${dias} días`}
                    </td>
                  </tr>
                )
              })}
              {(d.empresasActivas ?? []).length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-sm text-gray-400">
                    No hay empresas activas
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
