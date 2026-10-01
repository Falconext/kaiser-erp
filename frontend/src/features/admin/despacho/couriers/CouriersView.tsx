import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Icon } from '@iconify/react';
import moment from 'moment';
import Select from '@/components/Select';
import ShalomTrackingModal from '@/components/ShalomTrackingModal';
import OlvaTrackingModal from '@/components/OlvaTrackingModal';
import { MonoBarChart, MonoGauge } from '@/components/charts/mono';
import { useSedeFinanzas } from '@/features/admin/finanzas/useSedeFinanzas';
import { MESES_FULL, formatFecha, formatPct, formatSoles } from './formatos';
import { CourierResumen, ETAPAS_COURIER, EnvioCourierItem, courierStyle, formatHoras } from './CouriersModel';
import { useCouriersViewModel } from './useCouriersViewModel';
import DestinosMap from './DestinosMap';

function Skeleton() {
    return (
        <div className="animate-pulse space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {[...Array(5)].map((_, i) => <div key={i} className="h-28 bg-gray-200 dark:bg-slate-800 rounded-3xl" />)}
            </div>
            <div className="grid lg:grid-cols-3 gap-4">
                {[...Array(3)].map((_, i) => <div key={i} className="h-64 bg-gray-200 dark:bg-slate-800 rounded-3xl" />)}
            </div>
            <div className="h-72 bg-gray-200 dark:bg-slate-800 rounded-3xl" />
        </div>
    );
}

function Kpi({ icon, label, value, sub, tone, alerta }: { icon: string; label: string; value: string; sub?: string; tone: string; alerta?: boolean }) {
    return (
        <div className={`bg-white dark:bg-[#111827] rounded-3xl p-5 shadow-sm border ${alerta ? 'border-rose-200 dark:border-rose-900/50' : 'border-gray-100/50 dark:border-slate-800'}`}>
            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center mb-4 ${tone}`}>
                <Icon icon={icon} className="text-xl" />
            </div>
            <p className="text-gray-500 dark:text-gray-400 text-sm font-medium mb-1">{label}</p>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">{value}</h3>
            {sub && <p className={`text-xs mt-1 truncate ${alerta ? 'text-rose-500 font-semibold' : 'text-gray-400'}`}>{sub}</p>}
        </div>
    );
}

function SegmentedButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
    return (
        <button
            onClick={onClick}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${active ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800'}`}
        >
            {children}
        </button>
    );
}

function Card({ title, subtitle, icon, children, right, className = '' }: { title: string; subtitle?: string; icon: string; children: React.ReactNode; right?: React.ReactNode; className?: string }) {
    return (
        <div className={`bg-white dark:bg-[#111827] rounded-3xl p-5 sm:p-6 shadow-sm border border-gray-100/50 dark:border-slate-800 ${className}`}>
            <div className="flex items-start justify-between gap-3 mb-4 flex-wrap">
                <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-2xl bg-gray-100 dark:bg-slate-800 flex items-center justify-center text-gray-700 dark:text-gray-200 shrink-0">
                        <Icon icon={icon} className="text-lg" />
                    </div>
                    <div className="min-w-0">
                        <h3 className="font-bold text-gray-900 dark:text-white truncate">{title}</h3>
                        {subtitle && <p className="text-xs text-gray-400 truncate">{subtitle}</p>}
                    </div>
                </div>
                {right}
            </div>
            {children}
        </div>
    );
}

function CourierBadge({ courier, small }: { courier: string; small?: boolean }) {
    const st = courierStyle(courier);
    return (
        <span className={`inline-flex items-center gap-1.5 rounded-full border ${st.ring} ${st.bg} ${st.text} font-black ${small ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs'}`}>
            <Icon icon={st.icon} width={small ? 12 : 14} />
            {courier}
        </span>
    );
}

function EtapaBadge({ e }: { e: EnvioCourierItem }) {
    const tone = e.entregado
        ? 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20'
        : e.devuelto
            ? 'bg-rose-50 text-rose-700 border-rose-100 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20'
            : e.retrasado
                ? 'bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20'
                : 'bg-sky-50 text-sky-700 border-sky-100 dark:bg-sky-500/10 dark:text-sky-300 dark:border-sky-500/20';
    return <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${tone}`}>{e.etapaLabel}</span>;
}

/** Tarjeta por courier: volumen, tasa de entrega, tiempos, flete y embudo de etapas en curso. */
function CourierCard({ c }: { c: CourierResumen }) {
    const st = courierStyle(c.courier);
    // Etapas conocidas del courier + cualquier otra que traiga el dato (p. ej. envíos
    // antiguos sin rastreo, que quedan con el estado del panel: Preparando / En camino).
    const OTRAS: Record<string, string> = { PREPARANDO: 'Preparando', EN_CAMINO: 'En camino', EN_AGENCIA: 'En agencia', EN_DESTINO: 'En destino' };
    const base = ETAPAS_COURIER[c.courier] ?? [];
    const etapas = [
        ...base,
        ...Object.keys(c.etapas).filter(k => !base.some(b => b.key === k)).map(k => ({ key: k, label: OTRAS[k] ?? k })),
    ];
    const maxEtapa = Math.max(...etapas.map(e => c.etapas[e.key] ?? 0), 1);
    return (
        <div className={`bg-white dark:bg-[#111827] rounded-3xl p-5 shadow-sm border ${st.ring}`}>
            <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black ${st.bg} ${st.text}`}>
                        <Icon icon={st.icon} className="text-2xl" />
                    </div>
                    <div className="min-w-0">
                        <h3 className="text-lg font-black text-gray-900 dark:text-white leading-tight">{c.courier}</h3>
                        <p className="text-xs text-gray-400">{c.envios} envío{c.envios === 1 ? '' : 's'} · {formatSoles(c.ingreso)} en ventas</p>
                    </div>
                </div>
                <MonoGauge value={c.tasaEntrega} variant="ring" height={84} color={st.color} centerValue={<span className="text-sm font-black">{formatPct(c.tasaEntrega)}</span>} />
            </div>

            <div className="grid grid-cols-3 gap-2 mt-4">
                <div className="rounded-2xl bg-gray-50 dark:bg-slate-800/50 p-3">
                    <p className="text-[10px] uppercase font-bold text-gray-400">Entregados</p>
                    <p className="text-lg font-black text-emerald-600 dark:text-emerald-400">{c.entregados}</p>
                </div>
                <div className="rounded-2xl bg-gray-50 dark:bg-slate-800/50 p-3">
                    <p className="text-[10px] uppercase font-bold text-gray-400">En curso</p>
                    <p className="text-lg font-black text-sky-600 dark:text-sky-400">{c.enCurso}</p>
                </div>
                <div className="rounded-2xl bg-gray-50 dark:bg-slate-800/50 p-3">
                    <p className="text-[10px] uppercase font-bold text-gray-400">Devueltos</p>
                    <p className="text-lg font-black text-rose-600 dark:text-rose-400">{c.devueltos}</p>
                </div>
            </div>

            <div className="grid grid-cols-3 gap-2 mt-2 text-center">
                <div>
                    <p className="text-[10px] uppercase font-bold text-gray-400">Entrega prom.</p>
                    <p className="text-sm font-bold text-gray-800 dark:text-gray-100">{formatHoras(c.horasPromedioEntrega)}</p>
                </div>
                <div>
                    <p className="text-[10px] uppercase font-bold text-gray-400">Flete prom.</p>
                    <p className="text-sm font-bold text-gray-800 dark:text-gray-100">{formatSoles(c.costoPromedio)}</p>
                </div>
                <div>
                    <p className="text-[10px] uppercase font-bold text-gray-400">Contra entrega</p>
                    <p className="text-sm font-bold text-gray-800 dark:text-gray-100">{c.montoCOD > 0 ? formatSoles(c.montoCOD) : '—'}</p>
                </div>
            </div>

            {/* Embudo de etapas en curso */}
            <div className="mt-4 space-y-1.5">
                <p className="text-[10px] uppercase font-bold text-gray-400">En curso por etapa</p>
                {c.enCurso === 0 ? (
                    <p className="text-xs text-gray-400">Nada pendiente: todo entregado o cerrado.</p>
                ) : etapas.map(et => {
                    const n = c.etapas[et.key] ?? 0;
                    return (
                        <div key={et.key} className="flex items-center gap-2">
                            <span className="w-24 text-[11px] font-semibold text-gray-600 dark:text-gray-300 truncate">{et.label}</span>
                            <div className="flex-1 h-2 rounded-full bg-gray-100 dark:bg-slate-800 overflow-hidden">
                                <div className="h-full rounded-full" style={{ width: `${Math.max(n ? 6 : 0, (n / maxEtapa) * 100)}%`, backgroundColor: st.color }} />
                            </div>
                            <span className="w-6 text-right text-xs font-black text-gray-800 dark:text-gray-100">{n}</span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

function TablaEnvios({ items, vacio, onRastrear, mostrarEstado }: { items: EnvioCourierItem[]; vacio: string; onRastrear: (e: EnvioCourierItem) => void; mostrarEstado?: boolean }) {
    if (items.length === 0) return <p className="py-10 text-center text-sm text-gray-400">{vacio}</p>;
    return (
        <div className="overflow-x-auto -mx-2">
            <table className="w-full min-w-[900px] text-sm">
                <thead>
                    <tr className="text-[10px] uppercase tracking-wider text-gray-400">
                        <th className="text-left px-2 py-2">Documento</th>
                        <th className="text-left px-2 py-2">Cliente</th>
                        <th className="text-left px-2 py-2">Courier</th>
                        <th className="text-left px-2 py-2">Destino</th>
                        <th className="text-left px-2 py-2">N° guía</th>
                        <th className="text-left px-2 py-2">Etapa</th>
                        <th className="text-right px-2 py-2">{mostrarEstado ? 'Fecha' : 'En camino'}</th>
                        <th className="text-right px-2 py-2">Flete</th>
                        <th className="text-right px-2 py-2"></th>
                    </tr>
                </thead>
                <tbody>
                    {items.map(e => {
                        const rastreable = (e.courier === 'Shalom' && e.nroOrden && e.claveOrden) || (e.courier === 'Olva' && e.nroOrden);
                        return (
                            <tr key={e.envioId} className={`border-t border-gray-50 dark:border-slate-800/60 ${e.retrasado ? 'bg-amber-50/40 dark:bg-amber-900/10' : ''}`}>
                                <td className="px-2 py-2.5">
                                    <p className="font-mono text-xs font-bold text-gray-800 dark:text-gray-100">{e.documento}</p>
                                    <p className="text-[11px] text-gray-400">{moment(e.fecha).format('DD/MM/YYYY')}</p>
                                </td>
                                <td className="px-2 py-2.5">
                                    <p className="font-semibold text-gray-800 dark:text-gray-100 truncate max-w-[220px]">{e.cliente}</p>
                                    <p className="text-[11px] text-gray-400">{e.telefono || (e.repartidor ? `Repartidor: ${e.repartidor}` : '')}</p>
                                </td>
                                <td className="px-2 py-2.5"><CourierBadge courier={e.courier} small /></td>
                                <td className="px-2 py-2.5">
                                    <p className="text-gray-700 dark:text-gray-200 truncate max-w-[200px]">{e.destino}</p>
                                    {e.departamento && e.departamento !== e.destino && <p className="text-[11px] text-gray-400">{e.departamento}</p>}
                                </td>
                                <td className="px-2 py-2.5 font-mono text-xs text-gray-600 dark:text-gray-300">
                                    {e.nroOrden || '—'}{e.claveOrden ? <span className="text-gray-400"> · {e.claveOrden}</span> : null}
                                </td>
                                <td className="px-2 py-2.5"><EtapaBadge e={e} /></td>
                                <td className="px-2 py-2.5 text-right">
                                    {mostrarEstado ? (
                                        <span className="text-xs text-gray-600 dark:text-gray-300">{moment(e.ultimaActualizacion ?? e.fecha).format('DD/MM HH:mm')}</span>
                                    ) : (
                                        <span className={`text-xs font-bold ${e.retrasado ? 'text-rose-600 dark:text-rose-400' : 'text-gray-700 dark:text-gray-200'}`}>
                                            {e.diasEnCamino === 0 ? 'Hoy' : `${e.diasEnCamino} d`}{e.retrasado ? ' · retraso' : ''}
                                        </span>
                                    )}
                                </td>
                                <td className="px-2 py-2.5 text-right text-gray-600 dark:text-gray-300">{formatSoles(e.costoEnvio)}</td>
                                <td className="px-2 py-2.5 text-right">
                                    {rastreable ? (
                                        <button onClick={() => onRastrear(e)} className="inline-flex items-center gap-1 rounded-lg border border-gray-200 dark:border-slate-700 px-2.5 py-1 text-[11px] font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-800">
                                            <Icon icon="solar:map-arrow-square-bold-duotone" width={14} /> Rastrear
                                        </button>
                                    ) : null}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}

type TabId = 'resumen' | 'envios';
const TABS: { id: TabId; label: string; icon: string; description: string }[] = [
    { id: 'resumen', label: 'Resumen', icon: 'solar:chart-square-bold-duotone', description: 'Volumen, tasa de entrega, tiempos, flete y destinos por courier' },
    { id: 'envios', label: 'Envíos', icon: 'solar:routing-2-bold-duotone', description: 'Envíos en curso con rastreo y últimos movimientos' },
];

export default function CouriersView() {
    const sede = useSedeFinanzas();
    const vm = useCouriersViewModel(sede.sedeId);
    const data = vm.data;
    const [searchParams, setSearchParams] = useSearchParams();
    const tabParam = searchParams.get('tab') as TabId | null;
    const [activeTab, setActiveTab] = useState<TabId>(tabParam && TABS.some(t => t.id === tabParam) ? tabParam : 'resumen');
    const cambiarTab = (id: TabId) => {
        setActiveTab(id);
        setSearchParams(prev => { const n = new URLSearchParams(prev); n.set('tab', id); return n; }, { replace: true });
    };
    const pendientes = data?.resumen.enCurso ?? 0;
    const retrasados = data?.resumen.retrasados ?? 0;
    const [destinoActivo, setDestinoActivo] = useState<string | null>(null);

    return (
        <div className="min-h-screen overflow-x-hidden bg-[#F8F9FB] dark:bg-[#0A0D14]">
            <div className="px-3 pt-5 pb-6 sm:px-6 sm:pt-6 space-y-5">
                {/* ── Header ── */}
                <div>
                    <div className="mb-1 flex min-w-0 items-center gap-2 text-sm font-medium text-gray-400">
                        <span>Ventas</span>
                        <Icon icon="solar:alt-arrow-right-linear" className="shrink-0" />
                        <span>Couriers</span>
                        <Icon icon="solar:alt-arrow-right-linear" className="shrink-0" />
                        <span className="truncate text-indigo-600 dark:text-indigo-400">{TABS.find(t => t.id === activeTab)?.label}</span>
                    </div>
                    <div className="flex flex-wrap items-end justify-between gap-3">
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl">Despacho por courier</h1>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Shalom, Olva y reparto propio: cuánto sale, cuánto llega, cuánto demora y qué está atascado.</p>
                        </div>
                        {sede.puedeElegirSede && (
                            <div className="w-full sm:w-[220px]">
                                <Select onChange={sede.handleSelectSede} label="Sede" name="sedeId" options={sede.sedesOptions} error="" defaultValue="Todas las sedes" />
                            </div>
                        )}
                    </div>
                </div>

                {/* ── Tabs principales: Resumen (analítica) · Envíos (operación) ── */}
                <div className="max-w-full overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    <div className="inline-flex min-w-max items-center gap-1.5 rounded-2xl border border-gray-100/50 bg-white p-1.5 shadow-sm dark:border-slate-800 dark:bg-[#111827] sm:gap-2">
                        {TABS.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => cambiarTab(tab.id)}
                                title={tab.description}
                                className={`flex min-w-[110px] items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold transition-all sm:px-5 sm:text-sm ${
                                    activeTab === tab.id
                                        ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-200 dark:shadow-indigo-900/30'
                                        : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-slate-800 dark:hover:text-gray-200'
                                }`}
                            >
                                <Icon icon={tab.icon} className="text-base flex-shrink-0" />
                                <span className="leading-tight">{tab.label}</span>
                                {tab.id === 'envios' && pendientes > 0 && (
                                    <span className={`ml-1 rounded-full px-1.5 py-0.5 text-[10px] font-black ${activeTab === 'envios' ? 'bg-white/20 text-white' : retrasados > 0 ? 'bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400' : 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300'}`}>
                                        {pendientes}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                {/* ── Barra de período ── */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div>
                        <p className="text-xs text-gray-400 font-medium uppercase tracking-widest mb-0.5">Período</p>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                            {vm.periodo === 'dia' ? formatFecha(vm.dia) : vm.periodo === 'rango' ? `${formatFecha(vm.fechaInicio)} - ${formatFecha(vm.fechaFin)}` : vm.periodo === 'historico' ? 'Todo el historial' : `${MESES_FULL[vm.mesActual - 1]} ${vm.anioActual}`}
                            {((vm.periodo === 'mes' && vm.isCurrentOrFuture) || (vm.periodo === 'dia' && vm.esHoy)) && (
                                <span className="ml-2 text-xs font-normal bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400 px-2 py-0.5 rounded-full">{vm.periodo === 'dia' ? 'Hoy' : 'En curso'}</span>
                            )}
                        </h2>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <div className="flex bg-gray-100 dark:bg-slate-800/60 rounded-xl p-1 gap-1">
                            <SegmentedButton active={vm.periodo === 'dia'} onClick={() => vm.setPeriodo('dia')}>Día</SegmentedButton>
                            <SegmentedButton active={vm.periodo === 'mes'} onClick={() => vm.setPeriodo('mes')}>Mes</SegmentedButton>
                            <SegmentedButton active={vm.periodo === 'rango'} onClick={() => vm.setPeriodo('rango')}>Rango</SegmentedButton>
                            <SegmentedButton active={vm.periodo === 'historico'} onClick={() => vm.setPeriodo('historico')}>Histórico</SegmentedButton>
                        </div>
                        {vm.periodo === 'rango' && (
                            <>
                                <input type="date" value={vm.fechaInicio} onChange={(e) => vm.setFechaInicio(e.target.value)} className="h-10 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-[#111827] px-3 text-sm" />
                                <input type="date" value={vm.fechaFin} onChange={(e) => vm.setFechaFin(e.target.value)} className="h-10 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-[#111827] px-3 text-sm" />
                            </>
                        )}
                        {vm.periodo === 'dia' && (
                            <>
                                <button onClick={() => vm.navegarDia(-1)} className="w-10 h-10 flex items-center justify-center rounded-xl border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800"><Icon icon="solar:alt-arrow-left-bold" className="text-gray-600 dark:text-gray-400" /></button>
                                <input type="date" value={vm.dia} max={vm.hoy} onChange={(e) => vm.setDia(e.target.value)} className="h-10 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-[#111827] px-3 text-sm" />
                                <button onClick={() => vm.navegarDia(1)} disabled={vm.esHoy} className="w-10 h-10 flex items-center justify-center rounded-xl border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800 disabled:opacity-30"><Icon icon="solar:alt-arrow-right-bold" className="text-gray-600 dark:text-gray-400" /></button>
                            </>
                        )}
                        {vm.periodo === 'mes' && (
                            <>
                                <button onClick={() => vm.navegarMes(-1)} className="w-10 h-10 flex items-center justify-center rounded-xl border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800"><Icon icon="solar:alt-arrow-left-bold" className="text-gray-600 dark:text-gray-400" /></button>
                                <button onClick={() => vm.navegarMes(1)} disabled={vm.isCurrentOrFuture} className="w-10 h-10 flex items-center justify-center rounded-xl border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800 disabled:opacity-30"><Icon icon="solar:alt-arrow-right-bold" className="text-gray-600 dark:text-gray-400" /></button>
                            </>
                        )}
                        <button onClick={vm.refreshData} className="w-10 h-10 flex items-center justify-center rounded-xl bg-gray-900 text-white hover:bg-gray-800"><Icon icon="solar:refresh-bold" /></button>
                    </div>
                </div>

                {vm.error && (
                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-rose-200 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-900/10 px-4 py-3">
                        <p className="text-sm text-rose-700 dark:text-rose-300 flex items-center gap-2"><Icon icon="solar:danger-triangle-bold" /> {vm.error}{data ? ' · se muestra la última información cargada.' : ''}</p>
                        <button onClick={vm.refreshData} className="h-9 px-4 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-700">Reintentar</button>
                    </div>
                )}
                {vm.isLoading && !data ? <Skeleton /> : data && activeTab === 'resumen' && (
                    <>
                        {/* ── KPIs ── */}
                        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
                            <Kpi icon="solar:box-bold-duotone" label="Envíos" value={String(data.resumen.envios)} sub={`${formatSoles(data.resumen.ingresoMovido)} en mercadería`} tone="bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400" />
                            <Kpi icon="solar:check-circle-bold-duotone" label="Entregados" value={String(data.resumen.entregados)} sub={`${formatPct(data.resumen.tasaEntrega)} de entrega · ${data.resumen.devueltos} devueltos`} tone="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400" />
                            <Kpi icon="solar:routing-2-bold-duotone" label="En curso" value={String(data.resumen.enCurso)} sub={data.resumen.retrasados > 0 ? `${data.resumen.retrasados} con retraso` : 'Sin retrasos'} alerta={data.resumen.retrasados > 0} tone="bg-sky-100 text-sky-600 dark:bg-sky-900/30 dark:text-sky-400" />
                            <Kpi icon="solar:clock-circle-bold-duotone" label="Tiempo de entrega" value={formatHoras(data.resumen.horasPromedioEntrega)} sub="promedio desde la venta" tone="bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400" />
                            <Kpi icon="solar:wallet-money-bold-duotone" label="Flete del período" value={formatSoles(data.resumen.costoEnvioTotal)} sub={data.resumen.montoCOD > 0 ? `${formatSoles(data.resumen.montoCOD)} contra entrega` : 'sin cobros contra entrega'} tone="bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400" />
                        </div>

                        {/* ── Tarjetas por courier ── */}
                        {data.couriers.length === 0 ? (
                            <div className="bg-white dark:bg-[#111827] rounded-3xl p-10 text-center border border-dashed border-gray-200 dark:border-slate-800">
                                <Icon icon="solar:box-minimalistic-bold-duotone" className="text-4xl text-gray-300 mx-auto mb-2" />
                                <p className="text-sm text-gray-500">Sin envíos en este período. Registra un despacho desde el Panel de ventas.</p>
                            </div>
                        ) : (
                            <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
                                {data.couriers.map(c => <CourierCard key={c.courier} c={c} />)}
                            </div>
                        )}

                        {/* ── Mapa de destinos + ranking ── */}
                        <div className="grid lg:grid-cols-5 gap-5">
                            <Card className="lg:col-span-3" icon="solar:map-bold-duotone" title="Mapa de destinos" subtitle="Dónde llegan tus envíos · tamaño por volumen, color por courier principal">
                                <DestinosMap destinos={data.destinos} seleccionado={destinoActivo} onSeleccionar={setDestinoActivo} height={440} />
                            </Card>
                            <Card className="lg:col-span-2" icon="solar:map-point-wave-bold-duotone" title="Destinos más frecuentes" subtitle="Agencia / ciudad de entrega · clic para ver en el mapa">
                                {data.destinos.length === 0 ? <p className="py-10 text-center text-sm text-gray-400">Sin destinos.</p> : (
                                    <div className="space-y-1.5 max-h-[440px] overflow-y-auto pr-1">
                                        {data.destinos.slice(0, 12).map((d, i) => {
                                            const max = data.destinos[0].envios || 1;
                                            const activo = destinoActivo === d.destino;
                                            return (
                                                <button
                                                    type="button"
                                                    key={`${d.destino}-${i}`}
                                                    onClick={() => setDestinoActivo(activo ? null : d.destino)}
                                                    className={`w-full text-left flex items-center gap-3 rounded-xl px-2 py-1.5 transition-colors ${activo ? 'bg-indigo-50 dark:bg-indigo-900/20' : 'hover:bg-gray-50 dark:hover:bg-slate-800/60'}`}
                                                >
                                                    <span className="w-5 text-xs font-black text-gray-400">{i + 1}</span>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center justify-between gap-2">
                                                            <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">{d.destino}{d.departamento && d.departamento !== d.destino ? <span className="text-gray-400 font-normal"> · {d.departamento}</span> : null}</p>
                                                            <p className="text-sm font-bold text-gray-900 dark:text-white shrink-0">{d.envios}</p>
                                                        </div>
                                                        <div className="flex items-center justify-between gap-2 mt-0.5">
                                                            <p className="text-[11px] text-gray-400">{d.entregados} entregados · flete {formatSoles(d.costoEnvio)}</p>
                                                            <CourierBadge courier={d.courierPrincipal} small />
                                                        </div>
                                                        <div className="mt-1 h-1.5 rounded-full bg-gray-100 dark:bg-slate-800 overflow-hidden"><div className="h-full rounded-full" style={{ width: `${Math.max(4, (d.envios / max) * 100)}%`, backgroundColor: courierStyle(d.courierPrincipal).color }} /></div>
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </Card>
                        </div>

                        {/* ── Evolución ── */}
                        <Card icon="solar:chart-square-bold-duotone" title="Envíos por courier" subtitle={vm.serieChart.length > 0 ? (data.serieDiaria.length > 45 ? 'Por semana' : 'Por día') : undefined}>
                            {vm.serieChart.length === 0 ? <p className="py-10 text-center text-sm text-gray-400">Sin datos.</p> : (
                                <MonoBarChart data={vm.serieChart} index="label" categories={vm.nombresCouriers} colors={vm.nombresCouriers.map(n => courierStyle(n).color)} height={260} valueFormatter={(v) => `${v} envío${v === 1 ? '' : 's'}`} />
                            )}
                            <div className="flex flex-wrap gap-3 mt-3">
                                {vm.nombresCouriers.map(n => (
                                    <span key={n} className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-600 dark:text-gray-300">
                                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: courierStyle(n).color }} />{n}
                                    </span>
                                ))}
                            </div>
                        </Card>
                    </>
                )}

                {data && activeTab === 'envios' && (
                    <>
                        {/* ── Resumen operativo compacto ── */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <Kpi icon="solar:routing-2-bold-duotone" label="En curso" value={String(data.resumen.enCurso)} sub="pendientes de entrega" tone="bg-sky-100 text-sky-600 dark:bg-sky-900/30 dark:text-sky-400" />
                            <Kpi icon="solar:danger-triangle-bold-duotone" label="Con retraso" value={String(data.resumen.retrasados)} sub="pasaron la fecha estimada o > 7 días" alerta={data.resumen.retrasados > 0} tone="bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400" />
                            <Kpi icon="solar:check-circle-bold-duotone" label="Entregados" value={String(data.resumen.entregados)} sub={`${formatPct(data.resumen.tasaEntrega)} del período`} tone="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400" />
                            <Kpi icon="solar:undo-left-round-bold-duotone" label="Devueltos" value={String(data.resumen.devueltos)} sub="cerrados sin entrega" tone="bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400" />
                        </div>

                        {/* ── Envíos en curso ── */}
                        <Card
                            icon="solar:routing-2-bold-duotone"
                            title="Envíos en curso"
                            subtitle={`${vm.enCursoFiltrados.length} pendiente${vm.enCursoFiltrados.length === 1 ? '' : 's'} de entrega · los retrasados primero`}
                            right={
                                <div className="flex flex-wrap items-center gap-2">
                                    <div className="flex bg-gray-100 dark:bg-slate-800/60 rounded-xl p-1 gap-1">
                                        <SegmentedButton active={vm.filtroCourier === 'TODOS'} onClick={() => vm.setFiltroCourier('TODOS')}>Todos</SegmentedButton>
                                        {vm.nombresCouriers.map(n => <SegmentedButton key={n} active={vm.filtroCourier === n} onClick={() => vm.setFiltroCourier(n)}>{n}</SegmentedButton>)}
                                    </div>
                                    <button onClick={vm.toggleSoloRetrasados} className={`h-9 px-3 rounded-xl text-xs font-bold border transition-colors ${vm.soloRetrasados ? 'bg-rose-600 text-white border-rose-600' : 'border-gray-200 dark:border-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800'}`}>
                                        Solo retrasados
                                    </button>
                                    <div className="relative">
                                        <Icon icon="solar:magnifer-linear" className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                        <input value={vm.busqueda} onChange={(e) => vm.setBusqueda(e.target.value)} placeholder="Cliente, documento, guía o destino" className="w-[240px] h-9 pl-9 pr-3 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-[#0F1219] text-sm" />
                                    </div>
                                </div>
                            }
                        >
                            <TablaEnvios items={vm.enCursoFiltrados} vacio="Nada en camino con esos filtros." onRastrear={vm.abrirRastreo} />
                        </Card>

                        {/* ── Últimos movimientos ── */}
                        <Card icon="solar:history-bold-duotone" title="Últimos envíos" subtitle="Los 40 más recientes del período, en cualquier estado">
                            <TablaEnvios items={vm.recientesFiltrados} vacio="Sin envíos recientes." onRastrear={vm.abrirRastreo} mostrarEstado />
                        </Card>
                    </>
                )}
            </div>

            {/* ── Rastreo (mismos modales que el Panel de ventas) ── */}
            {vm.rastreo?.courier === 'Shalom' && vm.rastreo.nroOrden && vm.rastreo.claveOrden && (
                <ShalomTrackingModal orderNumber={vm.rastreo.nroOrden} orderCode={vm.rastreo.claveOrden} onClose={() => vm.abrirRastreo(null)} />
            )}
            {vm.rastreo?.courier === 'Olva' && vm.rastreo.nroOrden && (
                <OlvaTrackingModal trackingNumber={vm.rastreo.nroOrden} onClose={() => vm.abrirRastreo(null)} />
            )}
        </div>
    );
}
