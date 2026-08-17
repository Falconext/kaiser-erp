import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useResellerDashboardViewModel } from '@/features/reseller/useResellerViewModel';
import { useResellerPanelStore } from '@/zustand/reseller-panel';
import { Icon } from '@iconify/react';
import moment from 'moment';
import { BRAND } from '@/lib/branding';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { THEAD_TR, BODY_TR, EntityCell, EstadoPill } from './resellerTableUi';
import { useThemeStore, SIDEBAR_COLOR_HEX } from '@/zustand/theme';

const SERIES = ['#7551FF', '#a855f7', '#10b981', '#f59e0b', '#ec4899'];

// Mini-visualización decorativa para tarjetas KPI (SVG puro, sigue el acento).
// Réplica del dashboard del negocio para que el panel reseller comparta el mismo estilo.
const KpiMini = ({ type, accent }: { type: 'bars' | 'line' | 'donut' | 'wave'; accent: string }) => {
    const w = 60, h = 34;
    if (type === 'donut') {
        const R = 14, C = 2 * Math.PI * R;
        return (
            <svg viewBox="0 0 40 40" className="h-9 w-9">
                <circle cx={20} cy={20} r={R} fill="none" strokeWidth={6} className="stroke-slate-100 dark:stroke-slate-800" />
                <circle cx={20} cy={20} r={R} fill="none" strokeWidth={6} stroke={accent} strokeLinecap="round" strokeDasharray={`${C * 0.62} ${C}`} transform="rotate(-90 20 20)" />
            </svg>
        );
    }
    if (type === 'line') {
        const pts = [3, 5, 4, 7, 6, 9, 8];
        const max = Math.max(...pts, 1), min = Math.min(...pts, 0);
        const span = max - min || 1;
        const d = pts.map((v, i) => `${(i / (pts.length - 1)) * w},${h - 4 - ((v - min) / span) * (h - 8)}`).join(' L ');
        return (
            <svg viewBox={`0 0 ${w} ${h}`} className="h-8 w-16">
                <path d={`M ${d}`} fill="none" stroke={accent} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
            </svg>
        );
    }
    const bars = type === 'wave' ? [8, 14, 10, 20, 12, 24, 16] : [14, 24, 18];
    const bmax = Math.max(...bars);
    const bw = w / (bars.length * 1.7);
    return (
        <svg viewBox={`0 0 ${w} ${h}`} className="h-8 w-16">
            {bars.map((v, i) => {
                const bh = (v / bmax) * (h - 6);
                return <rect key={i} x={i * (bw * 1.7) + 2} y={h - bh} width={bw} height={bh} rx={bw / 2} fill={accent} opacity={0.35 + 0.65 * (i / (bars.length - 1))} />;
            })}
        </svg>
    );
};

// Referencia de precios reseller Vendify (ajustable).
const VENDIFY_PLANES_REFERENCIA = [
    { plan: 'Emprendedor', precioPublico: 19.90, resellerMensual: 15, gananciaPublico: 4.90, resellerAnual: 150, gananciaAnual: 88.80 },
    { plan: 'Negocio',     precioPublico: 49.90, resellerMensual: 30, gananciaPublico: 19.90, resellerAnual: 300, gananciaAnual: 298.80 },
    { plan: 'Corporativo', precioPublico: 89.90, resellerMensual: 45, gananciaPublico: 44.90, resellerAnual: 450, gananciaAnual: 628.80 },
];

const VENDIFY_VOLUME_TIERS = [
    { label: '1 a 5 clientes',   emprendedor: 15, negocio: 30, corporativo: 45, start: 1 },
    { label: '6 a 15 clientes',  emprendedor: 14, negocio: 29, corporativo: 44, start: 6 },
    { label: '16 a 30 clientes', emprendedor: 13, negocio: 28, corporativo: 43, start: 16 },
    { label: '31+ clientes',     emprendedor: 12, negocio: 27, corporativo: 42, start: 31 },
];

// Simulador estilo partners: una tarjeta por plan con costo por volumen (tramos),
// precio de venta editable, margen y clientes por plan.
const SIM_PLANS = [
    { key: 'Emprendedor', desc: 'Tienda online + boletas', publico: 19.90, defaultPrice: 39, defaultClients: 35, icon: 'solar:rocket-bold-duotone',
      tiers: [{ min: 1, cost: 15 }, { min: 6, cost: 14 }, { min: 16, cost: 13 }, { min: 31, cost: 12 }] },
    { key: 'Negocio', desc: 'Facturas + multi-sede', publico: 49.90, defaultPrice: 69, defaultClients: 34, icon: 'solar:shop-bold-duotone',
      tiers: [{ min: 1, cost: 30 }, { min: 6, cost: 29 }, { min: 16, cost: 28 }, { min: 31, cost: 27 }] },
    { key: 'Corporativo', desc: 'Reportes + API + prioridad', publico: 89.90, defaultPrice: 99, defaultClients: 31, icon: 'solar:buildings-3-bold-duotone',
      tiers: [{ min: 1, cost: 45 }, { min: 6, cost: 44 }, { min: 16, cost: 43 }, { min: 31, cost: 42 }] },
];

const costFor = (tiers: { min: number; cost: number }[], clients: number) => {
    let c = tiers[0].cost;
    for (const t of tiers) if (clients >= t.min) c = t.cost;
    return c;
};
const tierLabel = (tiers: { min: number }[], i: number) => {
    const min = tiers[i].min;
    const next = tiers[i + 1];
    return next ? `${min}–${next.min - 1}` : `${min}+`;
};

function getCurrentTierIndex(clientesActivos: number): number {
    if (clientesActivos <= 5) return 0;
    if (clientesActivos <= 15) return 1;
    if (clientesActivos <= 30) return 2;
    return 3;
}

const isFlagship = ['default', 'vendify'].includes(String(BRAND.key || '').toLowerCase());
const money = (v: number) => `S/ ${Number(v ?? 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const moneyShort = (v: number) => (Math.abs(v) >= 1000 ? `S/ ${(v / 1000).toFixed(1)}K` : money(v));

export default function ResellerDashboard() {
    const navigate = useNavigate();
    const { auth, stats, clientes, proyeccion } = useResellerDashboardViewModel();
    // Acento en hex (para los mini-gráficos SVG), reactivo al tema — igual que el dashboard del negocio.
    const sidebarColor = useThemeStore((s) => s.sidebarColor);
    const ACCENT = SIDEBAR_COLOR_HEX[sidebarColor] ?? '#7551FF';

    const latestClientes = useMemo(() => clientes.slice(0, 5), [clientes]);
    const activos = stats.clientesActivos || 0;
    // El tramo de volumen / descuento se calcula SOLO con clientes en producción
    // (las cuentas demo no pagan y no deben mover el tier). Fallback a activos por
    // compatibilidad si el backend aún no envía clientesProduccion.
    const clientesTier = stats.clientesProduccion ?? activos;
    const currentTierIndex = getCurrentTierIndex(clientesTier);
    const currentTier = VENDIFY_VOLUME_TIERS[currentTierIndex];
    const nextTier = currentTierIndex < 3 ? VENDIFY_VOLUME_TIERS[currentTierIndex + 1] : null;

    const ganancia = Number(stats.gananciaMensual ?? 0);
    const ingreso = Number(stats.ingresoMensual ?? 0);
    const margen = Number(stats.margenPct ?? 0);
    const saldo = Number(stats.saldo ?? 0);

    // Proyección / renovaciones (inteligencia del backend)
    const res = proyeccion?.resumen;
    const renovaciones = proyeccion?.proximasRenovaciones ?? [];
    const gananciaProxMes = Number(res?.gananciaProyectadaProximoMes ?? 0);
    const costoRenovaciones = Number(res?.costoRenovacionesProximas ?? 0);
    const clientesPorRenovar = Number(res?.clientesPorRenovar ?? renovaciones.length);
    const urgentes = renovaciones.filter((r) => r.diasRestantes <= 7 || r.vencida);
    // El RUC no viene en proximasRenovaciones → se cruza con la lista de clientes por empresaId.
    const rucByEmpresa = useMemo(() => new Map((clientes || []).map((c: any) => [c.id, c.ruc])), [clientes]);

    // Progreso al siguiente nivel de volumen (gamificación, solo flagship)
    const bandStart = currentTier.start;
    const nextStart = nextTier?.start ?? clientesTier;
    const faltanParaSiguiente = nextTier ? Math.max(0, nextStart - clientesTier) : 0;
    const tierProgress = nextTier ? Math.min(100, Math.max(0, ((clientesTier - bandStart) / (nextStart - bandStart)) * 100)) : 100;

    // Ganancia promedio por cliente → cuánto suma cada cliente nuevo
    const gananciaPorCliente = clientesTier > 0 ? ganancia / clientesTier : 15;

    // ── Simulador de ganancias estilo partners (una tarjeta por plan) ──
    const { updatePreciosPlan } = useResellerPanelStore();
    const [savingPrecios, setSavingPrecios] = useState(false);
    const [simRows, setSimRows] = useState<{ price: number; clients: number }[]>(
        SIM_PLANS.map((p) => ({ price: p.defaultPrice ?? p.publico, clients: p.defaultClients }))
    );
    // Inicializa/actualiza los precios desde lo configurado por el reseller.
    useEffect(() => {
        setSimRows(SIM_PLANS.map((p) => ({
            price: Number((stats.preciosPlan || {})[p.key] ?? p.defaultPrice ?? p.publico),
            clients: p.defaultClients,
        })));
    }, [stats.preciosPlan]);

    const preciosConfigurados = !!(stats.preciosPlan && Object.keys(stats.preciosPlan).length > 0);
    const updateRow = (i: number, patch: Partial<{ price: number; clients: number }>) =>
        setSimRows((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch } : r)));
    const simGross = SIM_PLANS.reduce((s, p, i) => {
        const r = simRows[i]; if (!r) return s;
        return s + Math.max(0, r.price - costFor(p.tiers, r.clients)) * r.clients;
    }, 0);
    const simTotalClients = simRows.reduce((s, r) => s + (r?.clients || 0), 0);
    const simYear = simGross * 12;

    const handleGuardarPrecios = async () => {
        if (!auth?.resellerId) return;
        setSavingPrecios(true);
        const precios: Record<string, number> = {};
        SIM_PLANS.forEach((p, i) => { precios[p.key] = simRows[i]?.price || p.publico; });
        await updatePreciosPlan(auth.resellerId, precios);
        setSavingPrecios(false);
    };

    // Distribución de clientes por plan (donut)
    const clientesPorPlan = useMemo(() => {
        const src = proyeccion?.clientes ?? [];
        if (src.length === 0) {
            const wl = Number(stats.clientesWhiteLabel ?? 0);
            const std = Number(stats.clientesEstandar ?? 0);
            const arr = [];
            if (std > 0) arr.push({ name: 'Estándar', value: std });
            if (wl > 0) arr.push({ name: 'Marca propia', value: wl });
            return arr;
        }
        const map = new Map<string, number>();
        src.forEach((c) => map.set(c.plan || 'Sin plan', (map.get(c.plan || 'Sin plan') || 0) + 1));
        return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
    }, [proyeccion, stats.clientesWhiteLabel, stats.clientesEstandar]);
    const totalPlan = clientesPorPlan.reduce((a, c) => a + c.value, 0);

    const saldoBajo = saldo < Math.max(50, costoRenovaciones);

    const openSupportChat = () => {
        const msg = encodeURIComponent(`Hola ${BRAND.name}, necesito recargar saldo como reseller`);
        window.open(`https://wa.me/51991065217?text=${msg}`, '_blank');
    };

    // Tarjetas "Requiere tu atención"
    const atencion: { key: string; icon: string; label: string; value: string; hint: string; tone: string; onClick: () => void }[] = [];
    if (clientesPorRenovar > 0) atencion.push({ key: 'renov', icon: 'solar:calendar-mark-bold-duotone', label: 'Renovaciones próximas', value: String(clientesPorRenovar), hint: `${money(costoRenovaciones)} por asegurar`, tone: 'amber', onClick: () => navigate('/reseller/ganancias') });
    if ((stats.clientesSuspendidos || 0) > 0) atencion.push({ key: 'susp', icon: 'solar:user-block-bold-duotone', label: 'Clientes suspendidos', value: String(stats.clientesSuspendidos), hint: `Recupéralos: +${money(gananciaPorCliente * (stats.clientesSuspendidos || 0))}/mes`, tone: 'rose', onClick: () => navigate('/reseller/clientes') });
    if (saldoBajo) atencion.push({ key: 'saldo', icon: 'solar:wallet-money-bold-duotone', label: 'Saldo bajo', value: money(saldo), hint: 'Recarga para no suspender clientes', tone: 'violet', onClick: openSupportChat });

    const toneMap: Record<string, { bg: string; text: string; ring: string }> = {
        amber: { bg: 'bg-amber-50 dark:bg-amber-900/20', text: 'text-amber-600 dark:text-amber-400', ring: 'ring-amber-100' },
        rose: { bg: 'bg-rose-50 dark:bg-rose-900/20', text: 'text-rose-600 dark:text-rose-400', ring: 'ring-rose-100' },
        violet: { bg: 'bg-violet-50 dark:bg-violet-900/20', text: 'text-violet-600 dark:text-violet-400', ring: 'ring-violet-100' },
    };

    const kpis: { label: string; value: string; sub: string; mini: 'line' | 'wave' | 'donut' | 'bars'; to: string; warn?: boolean }[] = [
        { label: 'Ganancia mensual', value: moneyShort(ganancia), sub: `Margen ${margen.toFixed(0)}%`, mini: 'wave', to: '/reseller/ganancias' },
        { label: 'Ingreso recurrente (MRR)', value: moneyShort(ingreso), sub: `${activos} clientes activos`, mini: 'line', to: '/reseller/ganancias' },
        { label: 'Clientes activos', value: String(activos), sub: `${stats.totalClientes || 0} en total`, mini: 'bars', to: '/reseller/clientes' },
        { label: 'Saldo disponible', value: money(saldo), sub: saldoBajo ? 'Saldo bajo — recarga' : 'Disponible', mini: 'donut', to: '/reseller/estado-cuenta', warn: saldoBajo },
    ];

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* ── Header ── */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="min-w-0">
                    <div className="flex items-center gap-2.5">
                        <h1 className="text-[22px] font-extrabold text-slate-800 dark:text-white tracking-tight truncate">Hola, {auth?.nombre} 👋</h1>
                        <span className="text-[11px] font-bold px-2.5 py-1 rounded-full text-white shrink-0" style={{ background: ACCENT }}>En vivo</span>
                    </div>
                    <p className="text-sm text-slate-400 dark:text-gray-400 mt-0.5">
                        Tu negocio como Distribuidor {BRAND.name} · <span className="capitalize">{moment().format('dddd, D [de] MMMM')}</span>
                    </p>
                </div>
                <div className="flex items-center gap-2.5">
                    <button onClick={openSupportChat} className="h-11 px-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-bold text-slate-600 dark:text-gray-400 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-1.5 shrink-0">
                        <Icon icon="solar:wallet-money-bold-duotone" className="text-lg text-indigo-500" /> <span className="hidden sm:inline">Recargar saldo</span>
                    </button>
                    <button onClick={() => navigate('/reseller/clientes')} className="h-11 px-4 rounded-2xl text-white text-sm font-bold flex items-center gap-1.5 shadow-lg shadow-violet-500/30 hover:brightness-105 transition-all shrink-0" style={{ background: ACCENT }}>
                        <Icon icon="solar:user-plus-bold" className="text-lg" /> <span className="hidden sm:inline">Registrar cliente</span>
                    </button>
                </div>
            </div>

            {/* ── KPIs hero (tarjeta unificada con columnas divididas) ── */}
            <div className="rounded-3xl bg-white dark:bg-[#111827] shadow-[0_2px_20px_rgba(15,23,42,0.05)] dark:shadow-none border border-slate-100 dark:border-slate-800 overflow-hidden">
                <div className="grid grid-cols-2 lg:grid-cols-4">
                    {kpis.map((c, idx) => (
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
                                        <p className={`text-2xl font-extrabold truncate ${c.warn ? 'text-rose-600 dark:text-rose-400' : 'text-slate-800 dark:text-white'}`}>{c.value}</p>
                                        <p className="mt-1.5 text-xs text-slate-400 dark:text-gray-400 truncate">{c.sub}</p>
                                    </div>
                                    <div className="shrink-0 pt-0.5">
                                        <KpiMini type={c.mini} accent={c.warn ? '#f43f5e' : ACCENT} />
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

            {/* ── Crece tu negocio ── */}
            <div>
                <div className="flex items-center gap-2 mb-2.5">
                    <Icon icon="solar:rocket-2-bold-duotone" className="text-indigo-500 text-lg" />
                    <h2 className="text-sm font-extrabold text-slate-700 dark:text-slate-200">Crece tu negocio</h2>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    {/* Progreso al siguiente nivel (flagship) o potencial por cliente */}
                    {isFlagship && nextTier ? (
                        <div className="rounded-3xl bg-gradient-to-br from-violet-600 to-purple-700 p-5 text-white shadow-lg shadow-violet-500/25">
                            <div className="flex items-center gap-2 text-sm font-bold"><Icon icon="solar:chart-square-bold-duotone" /> Siguiente nivel de volumen</div>
                            <p className="mt-2 text-3xl font-extrabold">Te faltan {faltanParaSiguiente} cliente{faltanParaSiguiente !== 1 ? 's' : ''}</p>
                            <p className="text-sm text-violet-100 mt-1">para bajar tu costo por cliente y ganar más margen.</p>
                            <div className="mt-4 h-2.5 w-full rounded-full bg-white/25 overflow-hidden">
                                <div className="h-full rounded-full bg-white" style={{ width: `${tierProgress}%` }} />
                            </div>
                            <div className="mt-2 flex justify-between text-xs text-violet-100">
                                <span>Ahora: {money(currentTier.negocio)}/cliente</span>
                                <span>Meta: {money(nextTier.negocio)}/cliente</span>
                            </div>
                        </div>
                    ) : (
                        <div className="rounded-3xl bg-gradient-to-br from-violet-600 to-purple-700 p-5 text-white shadow-lg shadow-violet-500/25">
                            <div className="flex items-center gap-2 text-sm font-bold"><Icon icon="solar:tag-price-bold-duotone" /> Cada cliente suma</div>
                            <p className="mt-2 text-3xl font-extrabold">+{money(gananciaPorCliente)}<span className="text-lg font-bold text-violet-100">/mes</span></p>
                            <p className="text-sm text-violet-100 mt-1">es tu ganancia promedio por cliente activo. Suma más y crece tu ingreso recurrente.</p>
                            <button onClick={() => navigate('/reseller/clientes')} className="mt-4 w-full py-2.5 bg-white text-violet-700 font-bold rounded-xl hover:shadow-md transition-all active:scale-95">
                                Registrar un cliente
                            </button>
                        </div>
                    )}

                    {/* Proyección próximo mes */}
                    <div className="rounded-3xl bg-white dark:bg-slate-800 p-5 shadow-sm dark:shadow-none border border-slate-100 dark:border-slate-700">
                        <div className="flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-200"><Icon icon="solar:graph-up-bold-duotone" className="text-emerald-500" /> Proyección próximo mes</div>
                        <p className="mt-2 text-3xl font-extrabold text-slate-800 dark:text-white">{moneyShort(gananciaProxMes || ganancia)}</p>
                        <p className="text-sm text-slate-400 dark:text-gray-500 mt-1">ganancia proyectada si mantienes tus clientes activos.</p>
                        {gananciaProxMes > ganancia && (
                            <p className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 rounded-full px-2.5 py-1">
                                <Icon icon="solar:alt-arrow-up-bold" /> +{money(gananciaProxMes - ganancia)} vs este mes
                            </p>
                        )}
                    </div>

                    {/* Distribución por plan */}
                    <div className="rounded-3xl bg-white dark:bg-slate-800 p-5 shadow-sm dark:shadow-none border border-slate-100 dark:border-slate-700">
                        <div className="flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-200 mb-1"><Icon icon="solar:pie-chart-2-bold-duotone" className="text-indigo-500" /> Clientes por plan</div>
                        {totalPlan > 0 ? (
                            <div className="flex items-center gap-3">
                                <div className="relative h-28 w-28 shrink-0">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie data={clientesPorPlan} dataKey="value" nameKey="name" innerRadius={38} outerRadius={54} paddingAngle={2} stroke="none">
                                                {clientesPorPlan.map((_, i) => <Cell key={i} fill={SERIES[i % SERIES.length]} />)}
                                            </Pie>
                                            <Tooltip formatter={(v: any, n: any) => [`${v} clientes`, n]} contentStyle={{ fontSize: 12, borderRadius: 8, borderColor: '#e5e7eb' }} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                                        <span className="text-lg font-extrabold text-slate-800 dark:text-white">{totalPlan}</span>
                                        <span className="text-[10px] text-slate-400 dark:text-gray-500">clientes</span>
                                    </div>
                                </div>
                                <div className="flex-1 space-y-1.5">
                                    {clientesPorPlan.map((c, i) => (
                                        <div key={c.name} className="flex items-center justify-between text-xs">
                                            <span className="flex items-center gap-1.5 min-w-0"><span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: SERIES[i % SERIES.length] }} /><span className="truncate text-slate-600 dark:text-gray-400 font-medium">{c.name}</span></span>
                                            <span className="font-bold text-slate-500 dark:text-gray-400">{c.value}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <p className="py-8 text-center text-sm text-slate-400 dark:text-gray-500">Aún no tienes clientes activos</p>
                        )}
                    </div>
                </div>
            </div>

            {/* ── Simulador de ganancias + precios de venta ── */}
            <div className="overflow-hidden rounded-3xl border border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-[0_2px_20px_rgba(15,23,42,0.05)] dark:shadow-none">
                {/* Header */}
                <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-700 p-5">
                    <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-[#7551FF] to-[#9f7bff] text-white shadow-md shadow-violet-500/25">
                        <Icon icon="solar:calculator-minimalistic-bold-duotone" width="22" />
                    </div>
                    <div>
                        <h3 className="text-[15px] font-extrabold text-slate-800 dark:text-white">Simulador · ¿Cuánto puedes ganar?</h3>
                        <p className="text-xs text-slate-400 dark:text-gray-500">Define cuánto cobras por plan y proyecta tu ganancia real.</p>
                    </div>
                </div>

                <div className="p-5">
                    {!preciosConfigurados && (
                        <div className="mb-5 flex items-start gap-2.5 rounded-2xl border border-amber-200 dark:border-amber-900/40 bg-amber-50 dark:bg-amber-900/20 px-4 py-3 text-sm text-amber-800 dark:text-amber-300">
                            <Icon icon="solar:danger-triangle-bold-duotone" width="20" className="mt-0.5 shrink-0 text-amber-500" />
                            <p>Ajusta tu precio de venta por plan y guarda. Se usa para simular tu ganancia real y como precio por defecto al registrar clientes.</p>
                        </div>
                    )}

                    {/* Una tarjeta por plan (estilo partners) */}
                    <div className="grid gap-4 lg:grid-cols-3">
                        {SIM_PLANS.map((p, i) => {
                            const row = simRows[i] || { price: p.publico, clients: p.defaultClients };
                            const cost = costFor(p.tiers, row.clients);
                            const margin = Math.max(0, row.price - cost);
                            const negative = row.price > 0 && row.price - cost <= 0;
                            const earn = margin * row.clients;
                            return (
                                <div key={p.key} className="flex flex-col rounded-2xl border border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 shadow-sm dark:shadow-none">
                                    <div className="flex items-center gap-2">
                                        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#7551FF]/10 text-[#7551FF]"><Icon icon={p.icon} width="18" /></div>
                                        <div className="min-w-0">
                                            <p className="text-sm font-extrabold text-slate-800 dark:text-white">{p.key}</p>
                                            <p className="truncate text-[11px] text-slate-400 dark:text-gray-500">{p.desc}</p>
                                        </div>
                                    </div>

                                    {/* Costo por volumen */}
                                    <p className="mt-4 text-[10px] font-bold uppercase tracking-wide text-slate-400 dark:text-gray-500">Costo por volumen</p>
                                    <div className="mt-1.5 grid grid-cols-4 gap-1">
                                        {p.tiers.map((t, ti) => (
                                            <div key={t.min} className={`rounded-lg border px-1 py-1 text-center ${t.cost === cost ? 'border-[#7551FF] bg-[#7551FF]/[0.06]' : 'border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-700'}`}>
                                                <div className="text-[9px] font-bold text-slate-400 dark:text-gray-500">{tierLabel(p.tiers, ti)}</div>
                                                <div className={`text-[11px] font-black tabular-nums ${t.cost === cost ? 'text-[#7551FF]' : 'text-slate-600 dark:text-gray-400'}`}>{t.cost}</div>
                                            </div>
                                        ))}
                                    </div>
                                    <p className="mt-1.5 text-[11px] text-slate-500 dark:text-gray-400">Con <b className="tabular-nums">{row.clients}</b> te cuesta <b className="tabular-nums">{money(cost)}</b> c/u</p>

                                    {/* Precio de venta */}
                                    <label className="mt-3 block text-[11px] font-bold text-slate-600 dark:text-gray-400">Tu precio de venta</label>
                                    <div className="mt-1 flex items-center rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus-within:border-[#7551FF] focus-within:ring-2 focus-within:ring-[#7551FF]/20">
                                        <span className="pl-3 text-sm font-bold text-[#7551FF]">S/</span>
                                        <input
                                            type="number" min={0} step="0.10"
                                            value={row.price}
                                            onChange={(e) => updateRow(i, { price: Math.max(0, Number(e.target.value) || 0) })}
                                            className="h-10 w-full appearance-none border-0 bg-transparent px-2 text-sm font-bold text-slate-800 dark:text-white outline-none focus:outline-none focus:ring-0 tabular-nums [&::-webkit-inner-spin-button]:appearance-none"
                                        />
                                        <span className="pr-3 text-xs text-slate-400 dark:text-gray-500">/mes</span>
                                    </div>
                                    <p className="mt-1 text-[10px] text-slate-400 dark:text-gray-500">Ref. público S/ {p.publico.toFixed(2)}/mes</p>

                                    {/* Margen */}
                                    <div className={`mt-2 rounded-lg px-2.5 py-1.5 text-xs font-bold ${negative ? 'bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400' : 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400'}`}>
                                        {negative ? 'Sube tu precio · margen ' : 'Margen '}<span className="tabular-nums">{money(margin)}</span> por cliente
                                    </div>

                                    {/* Stepper clientes */}
                                    <label className="mt-3 block text-[11px] font-bold text-slate-600 dark:text-gray-400">Clientes en este plan</label>
                                    <div className="mt-1 flex items-center justify-between rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700 p-1">
                                        <button type="button" onClick={() => updateRow(i, { clients: Math.max(0, row.clients - 1) })} className="grid h-8 w-8 place-items-center rounded-lg bg-white dark:bg-slate-800 text-slate-600 dark:text-gray-400 shadow-sm dark:shadow-none hover:text-[#7551FF]"><Icon icon="solar:minus-square-linear" width="18" /></button>
                                        <input
                                            type="number" min={0} value={row.clients}
                                            onChange={(e) => updateRow(i, { clients: Math.max(0, Number(e.target.value) || 0) })}
                                            onFocus={(e) => e.target.select()}
                                            className="w-14 appearance-none border-0 bg-transparent text-center text-lg font-black text-slate-800 dark:text-white outline-none focus:outline-none focus:ring-0 tabular-nums [&::-webkit-inner-spin-button]:appearance-none"
                                        />
                                        <button type="button" onClick={() => updateRow(i, { clients: row.clients + 1 })} className="grid h-8 w-8 place-items-center rounded-lg bg-white dark:bg-slate-800 text-slate-600 dark:text-gray-400 shadow-sm dark:shadow-none hover:text-[#7551FF]"><Icon icon="solar:add-square-linear" width="18" /></button>
                                    </div>

                                    {/* Ganas */}
                                    <div className="mt-auto pt-3">
                                        <div className="rounded-xl bg-emerald-50 dark:bg-emerald-900/20 px-3 py-2 text-center">
                                            <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">Ganas </span>
                                            <span className="text-lg font-black tabular-nums text-emerald-600 dark:text-emerald-400">{money(earn)}</span>
                                            <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">/mes</span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Total */}
                    <div className="mt-4 grid gap-4 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 p-5 text-white shadow-lg shadow-emerald-500/25 sm:grid-cols-[auto_1fr] sm:items-center">
                        <div>
                            <p className="text-[11px] font-black uppercase tracking-wide text-emerald-100">Tu ganancia recurrente</p>
                            <p className="mt-1 text-4xl font-black leading-none tabular-nums">{money(simGross)}<span className="ml-1 text-base font-bold text-emerald-100">/mes</span></p>
                            <p className="mt-1.5 text-lg font-extrabold text-emerald-50">≈ <span className="tabular-nums">{money(simYear)}</span> al año, y creciendo</p>
                        </div>
                        <p className="text-sm leading-relaxed text-emerald-50 sm:border-l sm:border-white/20 sm:pl-5">
                            Con <b className="tabular-nums">{simTotalClients}</b> clientes en {SIM_PLANS.length} planes. Tu ganancia es el <b>margen</b> (tu precio − costo) por cada cliente, cada mes. Y mientras <b>más clientes</b> tengas, <b>menos te cuesta</b> cada plan — tu margen crece solo.
                        </p>
                    </div>

                    {/* Acciones */}
                    <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <button
                            onClick={handleGuardarPrecios}
                            disabled={savingPrecios}
                            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-[#7551FF]/30 bg-[#7551FF]/[0.06] px-5 py-2.5 text-sm font-black text-[#7551FF] transition-all hover:bg-[#7551FF]/10 active:scale-95 disabled:opacity-60"
                        >
                            <Icon icon={savingPrecios ? 'svg-spinners:ring-resize' : 'solar:diskette-bold-duotone'} width="18" /> Guardar mis precios
                        </button>
                        <button
                            onClick={() => navigate('/reseller/clientes')}
                            className="inline-flex items-center justify-center gap-1.5 rounded-xl btn-accent px-5 py-2.5 text-sm font-black shadow-lg shadow-black/20 transition-all active:scale-95"
                        >
                            <Icon icon="solar:user-plus-bold" width="18" /> Registrar clientes ahora
                        </button>
                    </div>
                </div>
            </div>

            {/* ── Requiere tu atención ── */}
            {atencion.length > 0 && (
                <div>
                    <div className="flex items-center gap-2 mb-2.5">
                        <Icon icon="solar:danger-triangle-bold-duotone" className="text-amber-500 text-lg" />
                        <h2 className="text-sm font-extrabold text-slate-700 dark:text-slate-200">Requiere tu atención</h2>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {atencion.map((a) => {
                            const t = toneMap[a.tone];
                            return (
                                <button key={a.key} onClick={a.onClick} className={`group flex items-center gap-3 rounded-2xl bg-white dark:bg-slate-800 p-4 text-left shadow-sm dark:shadow-none border border-slate-100 dark:border-slate-700 ring-1 ${t.ring} hover:shadow-md transition-all`}>
                                    <div className={`h-11 w-11 shrink-0 grid place-items-center rounded-xl ${t.bg} ${t.text}`}><Icon icon={a.icon} className="text-2xl" /></div>
                                    <div className="min-w-0 flex-1">
                                        <p className={`text-lg font-extrabold ${t.text}`}>{a.value}</p>
                                        <p className="text-xs font-semibold text-slate-600 dark:text-gray-400 leading-tight">{a.label}</p>
                                        <p className="text-[11px] text-slate-400 dark:text-gray-500 leading-tight">{a.hint}</p>
                                    </div>
                                    <Icon icon="solar:alt-arrow-right-linear" className="text-slate-300 dark:text-slate-600 group-hover:text-slate-500 dark:group-hover:text-slate-400 transition-colors" />
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* ── Próximas renovaciones + recargar ── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-3xl shadow-[0_2px_20px_rgba(15,23,42,0.05)] dark:shadow-none border border-slate-100 dark:border-slate-700 p-6">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-bold text-slate-800 dark:text-white">Próximas renovaciones</h3>
                        <button onClick={() => navigate('/reseller/ganancias')} className="text-sm text-violet-600 dark:text-violet-400 font-semibold hover:underline">Ver todas</button>
                    </div>
                    <div className="overflow-x-auto font-inter">
                        {renovaciones.length === 0 ? (
                            <p className="py-8 text-center text-sm text-slate-400 dark:text-gray-500">No hay renovaciones próximas. ¡Todo al día!</p>
                        ) : (
                            <table className="w-full text-left border-collapse min-w-[600px]">
                                <thead><tr className={THEAD_TR}>
                                    <th className="py-3.5 pl-5 pr-3">Empresa</th>
                                    <th className="py-3.5 px-3">Plan</th>
                                    <th className="py-3.5 px-3">Vence</th>
                                    <th className="py-3.5 px-3 text-right">Te cuesta</th>
                                    <th className="py-3.5 px-3 pr-5 text-right">Tu ganancia</th>
                                </tr></thead>
                                <tbody>
                                    {renovaciones.slice(0, 6).map((rn) => {
                                        const urgente = rn.diasRestantes <= 7 || rn.vencida;
                                        return (
                                            <tr key={rn.empresaId} className={BODY_TR}>
                                                <td className="py-3.5 pl-5 pr-3"><EntityCell name={rn.razonSocial} sub={rucByEmpresa.get(rn.empresaId)} /></td>
                                                <td className="py-3.5 px-3 text-sm text-slate-500 dark:text-gray-400 truncate max-w-[160px]">{rn.plan}</td>
                                                <td className="py-3.5 px-3"><span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${rn.vencida ? 'bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400' : urgente ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400' : 'bg-slate-50 dark:bg-slate-700 text-slate-500 dark:text-gray-400'}`}>{rn.vencida ? 'Vencida' : `${rn.diasRestantes}d`}</span></td>
                                                <td className="py-3.5 px-3 text-right font-semibold text-rose-500 dark:text-rose-400 whitespace-nowrap">{money(rn.costo)}</td>
                                                <td className="py-3.5 px-3 pr-5 text-right font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">{money(rn.ganancia)}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        )}
                    </div>
                    {urgentes.length > 0 && (
                        <p className="mt-3 text-xs text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1">
                            <Icon icon="solar:bell-bing-bold-duotone" /> {urgentes.length} vencen esta semana — contáctalos para asegurar la renovación.
                        </p>
                    )}
                </div>
                <div className="bg-gradient-to-br from-violet-600 to-purple-700 rounded-3xl p-6 text-white shadow-lg shadow-violet-500/30 flex flex-col">
                    <h3 className="text-xl font-bold mb-2">Recargar saldo</h3>
                    <p className="text-violet-100 text-sm mb-6">Mantén tu saldo positivo para que tus clientes nunca se suspendan.</p>
                    <div className="mt-auto space-y-4">
                        <div className="rounded-2xl bg-white/10 p-3 text-center">
                            <p className="text-xs text-violet-100">Saldo actual</p>
                            <p className="text-2xl font-extrabold">{money(saldo)}</p>
                        </div>
                        <button className="w-full py-3 bg-white text-violet-700 font-bold rounded-xl shadow-sm hover:shadow-md transition-all active:scale-95" onClick={openSupportChat}>
                            Contactar soporte
                        </button>
                        <p className="text-xs text-center opacity-70">Recargas vía transferencia · WhatsApp 991 065 217</p>
                    </div>
                </div>
            </div>

            {/* ── Últimos clientes ── */}
            <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-[0_2px_20px_rgba(15,23,42,0.05)] dark:shadow-none border border-slate-100 dark:border-slate-700 p-6">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white">Últimos clientes registrados</h3>
                    <button onClick={() => navigate('/reseller/clientes')} className="text-sm text-violet-600 dark:text-violet-400 font-semibold hover:underline">Ver todos</button>
                </div>
                <div className="overflow-x-auto font-inter">
                    {latestClientes.length === 0 ? (
                        <p className="py-8 text-center text-sm text-slate-400 dark:text-gray-500">Aún no has registrado clientes. ¡Registra el primero!</p>
                    ) : (
                        <table className="w-full text-left border-collapse min-w-[560px]">
                            <thead><tr className={THEAD_TR}>
                                <th className="py-3.5 pl-5 pr-3">Empresa</th>
                                <th className="py-3.5 px-3">Plan</th>
                                <th className="py-3.5 px-3">Costo reseller</th>
                                <th className="py-3.5 px-3 pr-5">Estado</th>
                            </tr></thead>
                            <tbody>
                                {latestClientes.map((c: any) => (
                                    <tr key={c.id} className={BODY_TR}>
                                        <td className="py-3.5 pl-5 pr-3"><EntityCell name={c.razonSocial} sub={c.ruc} /></td>
                                        <td className="py-3.5 px-3 text-sm text-slate-500 dark:text-gray-400 truncate max-w-[160px]">{c?.plan?.nombre || `Plan ID ${c.planId}`}</td>
                                        <td className="py-3.5 px-3 font-bold text-slate-800 dark:text-white text-sm whitespace-nowrap">{money(Number(c.costoActivacionReseller ?? c?.plan?.costo ?? 0))}</td>
                                        <td className="py-3.5 px-3 pr-5"><EstadoPill estado={c.estado} /></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {/* ── Estructura de precios (flagship) ── */}
            {isFlagship && (
                <div className="space-y-6">
                    <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-[0_2px_20px_rgba(15,23,42,0.05)] dark:shadow-none border border-slate-100 dark:border-slate-700 p-6">
                        <div className="flex flex-col gap-1 mb-5">
                            <div className="flex items-center gap-2 text-violet-600 dark:text-violet-400 text-sm font-semibold"><Icon icon="solar:tag-price-bold-duotone" width="20" /> Estructura de precios</div>
                            <p className="text-sm text-slate-500 dark:text-gray-400">Referencia de precios públicos vs. lo que tú pagas. Tú defines cuánto cobras a tu cliente.</p>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse text-sm">
                                <thead className="bg-slate-50/60 dark:bg-slate-900/40 text-slate-500 dark:text-gray-400 text-xs uppercase">
                                    <tr>
                                        <th className="px-4 py-3 font-semibold">Plan</th>
                                        <th className="px-4 py-3 font-semibold">Precio público</th>
                                        <th className="px-4 py-3 font-semibold">Tu precio (mensual)</th>
                                        <th className="px-4 py-3 font-semibold text-emerald-600 dark:text-emerald-400">Ganancia si cobras público</th>
                                        <th className="px-4 py-3 font-semibold">Tu precio (anual)</th>
                                        <th className="px-4 py-3 font-semibold text-emerald-600 dark:text-emerald-400">Ganancia anual</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                    {VENDIFY_PLANES_REFERENCIA.map((row) => (
                                        <tr key={row.plan} className="hover:bg-slate-50/40 dark:hover:bg-slate-800/50">
                                            <td className="px-4 py-3.5 font-semibold text-slate-800 dark:text-white">{row.plan}</td>
                                            <td className="px-4 py-3.5 tabular-nums text-slate-500 dark:text-gray-400">{money(row.precioPublico)}</td>
                                            <td className="px-4 py-3.5 tabular-nums font-semibold text-violet-700 dark:text-violet-400">{money(row.resellerMensual)}</td>
                                            <td className="px-4 py-3.5 tabular-nums font-semibold text-emerald-600 dark:text-emerald-400">+{money(row.gananciaPublico)}</td>
                                            <td className="px-4 py-3.5 tabular-nums font-semibold text-violet-700 dark:text-violet-400">{money(row.resellerAnual)}</td>
                                            <td className="px-4 py-3.5 tabular-nums font-semibold text-emerald-600 dark:text-emerald-400">+{money(row.gananciaAnual)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-[0_2px_20px_rgba(15,23,42,0.05)] dark:shadow-none border border-slate-100 dark:border-slate-700 p-6">
                        <div className="flex flex-col gap-1 mb-5">
                            <div className="flex items-center gap-2 text-violet-600 dark:text-violet-400 text-sm font-semibold"><Icon icon="solar:layers-minimalistic-bold-duotone" width="20" /> Tu costo según volumen de clientes</div>
                            <p className="text-sm text-slate-500 dark:text-gray-400">Mientras más clientes activos tienes, menos pagas por cada uno. Tu nivel actual está resaltado.</p>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse text-sm">
                                <thead className="bg-slate-50/60 dark:bg-slate-900/40 text-slate-500 dark:text-gray-400 text-xs uppercase">
                                    <tr>
                                        <th className="px-4 py-3 font-semibold">Clientes activos</th>
                                        <th className="px-4 py-3 font-semibold">Emprendedor</th>
                                        <th className="px-4 py-3 font-semibold">Negocio</th>
                                        <th className="px-4 py-3 font-semibold">Corporativo</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                    {VENDIFY_VOLUME_TIERS.map((tier, idx) => {
                                        const isCurrentTier = idx === currentTierIndex;
                                        return (
                                            <tr key={tier.label} className={isCurrentTier ? 'bg-violet-50 dark:bg-violet-900/20 border-l-4 border-l-indigo-500' : 'hover:bg-slate-50/40 dark:hover:bg-slate-800/50'}>
                                                <td className={`px-4 py-3.5 font-semibold ${isCurrentTier ? 'text-violet-700 dark:text-violet-400' : 'text-slate-700 dark:text-slate-200'}`}>
                                                    {tier.label}
                                                    {isCurrentTier && <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-violet-600 text-white">TU NIVEL</span>}
                                                </td>
                                                <td className={`px-4 py-3.5 tabular-nums font-semibold ${isCurrentTier ? 'text-violet-700 dark:text-violet-400' : 'text-slate-700 dark:text-slate-200'}`}>{money(tier.emprendedor)}</td>
                                                <td className={`px-4 py-3.5 tabular-nums font-semibold ${isCurrentTier ? 'text-violet-700 dark:text-violet-400' : 'text-slate-700 dark:text-slate-200'}`}>{money(tier.negocio)}</td>
                                                <td className={`px-4 py-3.5 tabular-nums font-semibold ${isCurrentTier ? 'text-violet-700 dark:text-violet-400' : 'text-slate-700 dark:text-slate-200'}`}>{money(tier.corporativo)}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
