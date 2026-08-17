import { useMemo, useState } from 'react';
import { Icon } from '@iconify/react';
import moment from 'moment';
import { THEAD_TR, BODY_TR, EntityCell } from './resellerTableUi';
import { PageHead, KpiHero, type KpiHeroItem } from './resellerUi';
import { useResellerGananciasViewModel } from '@/features/reseller/useResellerViewModel';

const fmt = (v: number) => `S/ ${Number(v || 0).toFixed(2)}`;
const fmtShort = (v: number) => (Math.abs(v) >= 1000 ? `S/ ${(v / 1000).toFixed(1)}K` : fmt(v));

function diasBadge(dias: number, vencida: boolean) {
    if (vencida) return { text: 'Vencida', cls: 'bg-red-50 dark:bg-rose-900/20 text-red-600 dark:text-rose-400' };
    if (dias <= 3) return { text: `${dias}d`, cls: 'bg-red-50 dark:bg-rose-900/20 text-red-600 dark:text-rose-400' };
    if (dias <= 7) return { text: `${dias}d`, cls: 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400' };
    return { text: `${dias}d`, cls: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400' };
}

export default function ResellerGanancias() {
    const { auth, proyeccion } = useResellerGananciasViewModel();
    const [tab, setTab] = useState<'clientes' | 'renovaciones'>('clientes');
    const [search, setSearch] = useState('');
    const [soloEstimados, setSoloEstimados] = useState(false);

    const r = proyeccion?.resumen;
    const clientes = proyeccion?.clientes ?? [];
    const renovaciones = proyeccion?.proximasRenovaciones ?? [];

    // Concentración: cuánto pesan tus mejores clientes.
    const totalGanancia = useMemo(() => clientes.reduce((a, c) => a + c.ganancia, 0), [clientes]);
    const topPorGanancia = useMemo(() => [...clientes].sort((a, b) => b.ganancia - a.ganancia), [clientes]);
    const top3Share = totalGanancia > 0 ? (topPorGanancia.slice(0, 3).reduce((a, c) => a + c.ganancia, 0) / totalGanancia) * 100 : 0;
    const maxGanancia = topPorGanancia[0]?.ganancia || 1;

    // Proyección anual + potencial por cliente.
    const anualProyectada = (r?.gananciaProyectadaProximoMes ?? 0) * 12;
    const gananciaPromedioCliente = (r?.clientesActivos ?? 0) > 0 ? (r!.gananciaMensual / r!.clientesActivos) : 0;

    // Tabla filtrada (orden por defecto: mayor ganancia).
    const clientesView = useMemo(() => {
        let arr = [...clientes].sort((a, b) => b.ganancia - a.ganancia);
        if (soloEstimados) arr = arr.filter((c) => c.ingresoEsEstimado);
        const q = search.trim().toLowerCase();
        if (q) arr = arr.filter((c) => c.razonSocial?.toLowerCase().includes(q) || c.plan?.toLowerCase().includes(q));
        return arr;
    }, [clientes, search, soloEstimados]);

    const exportCSV = () => {
        const head = ['Cliente', 'Plan', 'Cobras', 'Pagas', 'Ganas', 'Precio'];
        const lines = clientesView.map((c) => [c.razonSocial, c.plan, c.ingreso, c.costo, c.ganancia, c.ingresoEsEstimado ? 'Estimado' : 'Definido']
            .map((x) => `"${String(x).replace(/"/g, '""')}"`).join(','));
        const blob = new Blob([[head.join(','), ...lines].join('\n')], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `ganancias_${moment().format('YYYYMMDD')}.csv`; a.click();
        URL.revokeObjectURL(url);
    };

    if (!proyeccion) {
        return (
            <div className="flex flex-col items-center justify-center py-24 text-slate-400 dark:text-gray-500">
                <Icon icon="eos-icons:loading" className="text-4xl animate-spin mb-3" />
                <p>Calculando tus ganancias…</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <PageHead
                title="Ganancias y Proyección"
                subtitle={`Hola ${auth?.nombre ?? ''}, lo que ganas con tu cartera este mes`}
            />

            {/* Hero: ganancia proyectada próximo mes + KPIs */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="lg:col-span-1 rounded-3xl p-6 text-white shadow-lg shadow-emerald-500/30 bg-gradient-to-br from-emerald-500 to-teal-600 flex flex-col justify-between">
                    <div className="flex items-center gap-2 text-emerald-50 text-sm font-semibold">
                        <Icon icon="solar:graph-up-bold-duotone" width="20" /> Ganancia proyectada · próximo mes
                    </div>
                    <div className="mt-4">
                        <h2 className="text-4xl font-black tracking-tight">{fmt(r!.gananciaProyectadaProximoMes)}</h2>
                        <p className="text-emerald-50/90 text-sm mt-1">
                            Ingreso {fmt(r!.ingresoProyectadoProximoMes)} − Costo {fmt(r!.costoProyectadoProximoMes)}
                        </p>
                        <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-sm font-bold">
                            <Icon icon="solar:calendar-bold-duotone" width="16" /> ≈ {fmtShort(anualProyectada)} al año
                        </div>
                    </div>
                    <p className="text-xs text-emerald-50/70 mt-4">
                        Asume que tu cartera activa de {r!.clientesActivos} cliente{r!.clientesActivos !== 1 ? 's' : ''} se mantiene y renueva.
                    </p>
                </div>

                <div className="lg:col-span-2">
                    <KpiHero items={([
                        { label: 'Ingreso mensual', value: fmt(r!.ingresoMensual), mini: 'line', sub: `${r!.clientesConPrecio} con precio · ${r!.clientesEstimados} estimados` },
                        { label: 'Costo plataforma', value: fmt(r!.costoMensual), mini: 'wave', warn: true, sub: 'Lo que pagas por tus clientes' },
                        { label: 'Ganancia mensual', value: fmt(r!.gananciaMensual), mini: 'bars', sub: `Margen ${r!.margenPct.toFixed(1)}%` },
                        { label: 'Renuevan en 30 días', value: String(r!.clientesPorRenovar), mini: 'donut', sub: `Costo estimado ${fmt(r!.costoRenovacionesProximas)}` },
                    ] as KpiHeroItem[])} />
                </div>
            </div>

            {/* Aviso de clientes estimados */}
            {r!.clientesEstimados > 0 && (
                <div className="flex items-start gap-3 rounded-2xl border border-amber-200 dark:border-amber-900/40 bg-amber-50 dark:bg-amber-900/20 px-4 py-3 text-sm text-amber-800 dark:text-amber-300">
                    <Icon icon="solar:info-circle-bold-duotone" width="20" className="flex-shrink-0 mt-0.5" />
                    <p>
                        <b>{r!.clientesEstimados} cliente{r!.clientesEstimados !== 1 ? 's' : ''}</b> no tiene{r!.clientesEstimados !== 1 ? 'n' : ''} un precio de venta definido — se usa el precio de lista del plan como estimado.
                        Define el precio real en <b>Mis Clientes → editar</b> para una ganancia exacta.
                    </p>
                </div>
            )}

            {/* Distribución white-label */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-[0_2px_20px_rgba(15,23,42,0.05)] dark:shadow-none border border-slate-100 dark:border-slate-700 p-6 flex items-center gap-4">
                    <div className="p-4 bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400 rounded-2xl"><Icon icon="solar:crown-star-bold-duotone" width="30" /></div>
                    <div>
                        <p className="text-sm font-medium text-slate-400 dark:text-gray-500">Clientes marca blanca</p>
                        <h3 className="text-2xl font-bold text-slate-800 dark:text-white">{r!.clientesWhiteLabel}</h3>
                    </div>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-[0_2px_20px_rgba(15,23,42,0.05)] dark:shadow-none border border-slate-100 dark:border-slate-700 p-6 flex items-center gap-4">
                    <div className="p-4 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-gray-400 rounded-2xl"><Icon icon="solar:buildings-2-bold-duotone" width="30" /></div>
                    <div>
                        <p className="text-sm font-medium text-slate-400 dark:text-gray-500">Clientes estándar</p>
                        <h3 className="text-2xl font-bold text-slate-800 dark:text-white">{r!.clientesEstandar}</h3>
                    </div>
                </div>
            </div>

            {/* Visualización: top clientes + composición */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-3xl shadow-[0_2px_20px_rgba(15,23,42,0.05)] dark:shadow-none border border-slate-100 dark:border-slate-700 p-6">
                    <h3 className="text-sm font-extrabold text-slate-700 dark:text-slate-200 mb-4 flex items-center gap-2"><Icon icon="solar:ranking-bold-duotone" className="text-indigo-500" width="18" /> Top clientes por ganancia</h3>
                    {topPorGanancia.length === 0 ? (
                        <p className="py-8 text-center text-sm text-slate-400 dark:text-gray-500">Aún no tienes clientes activos.</p>
                    ) : (
                        <div className="space-y-3">
                            {topPorGanancia.slice(0, 6).map((c, i) => (
                                <div key={c.empresaId} className="flex items-center gap-3">
                                    <span className="h-7 w-7 shrink-0 grid place-items-center rounded-lg text-xs font-bold text-white" style={{ background: '#7551FF' }}>{i + 1}</span>
                                    <div className="min-w-0 flex-1">
                                        <div className="mb-1 flex items-baseline justify-between gap-2">
                                            <span className="truncate text-[13px] font-semibold text-slate-800 dark:text-white">{c.razonSocial}{c.esWhiteLabel && <Icon icon="solar:crown-star-bold" className="inline ml-1 text-violet-500" width="12" />}</span>
                                            <span className="shrink-0 text-[13px] font-bold text-emerald-600 dark:text-emerald-400">{fmt(c.ganancia)}</span>
                                        </div>
                                        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
                                            <div className="h-full rounded-full bg-indigo-500" style={{ width: `${Math.max(4, (c.ganancia / maxGanancia) * 100)}%` }} />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                    {clientes.length >= 3 && (
                        <p className="mt-4 text-xs text-slate-500 dark:text-gray-400 flex items-center gap-1.5 rounded-xl bg-slate-50 dark:bg-slate-700 px-3 py-2">
                            <Icon icon="solar:pie-chart-2-bold-duotone" className="text-violet-400" width="15" />
                            Tus <b className="mx-0.5">3</b> mejores clientes concentran el <b className="mx-0.5 text-violet-600 dark:text-violet-400">{top3Share.toFixed(0)}%</b> de tu ganancia mensual.
                        </p>
                    )}
                </div>

                <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-[0_2px_20px_rgba(15,23,42,0.05)] dark:shadow-none border border-slate-100 dark:border-slate-700 p-6 flex flex-col">
                    <h3 className="text-sm font-extrabold text-slate-700 dark:text-slate-200 mb-3 flex items-center gap-2"><Icon icon="solar:chart-square-bold-duotone" className="text-emerald-500" width="18" /> Composición del ingreso</h3>
                    {(() => {
                        const gananciaPct = r!.ingresoMensual > 0 ? (r!.gananciaMensual / r!.ingresoMensual) * 100 : 0;
                        return (
                            <>
                                <div className="h-4 w-full rounded-full overflow-hidden flex bg-slate-100 dark:bg-slate-700">
                                    <div className="bg-emerald-500 h-full" style={{ width: `${Math.max(0, gananciaPct)}%` }} />
                                    <div className="bg-rose-400 h-full" style={{ width: `${Math.max(0, 100 - gananciaPct)}%` }} />
                                </div>
                                <div className="mt-3 space-y-1.5 text-sm">
                                    <div className="flex items-center justify-between"><span className="flex items-center gap-1.5 text-slate-600 dark:text-gray-400"><span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> Ganancia</span><span className="font-bold text-emerald-600 dark:text-emerald-400">{fmt(r!.gananciaMensual)}</span></div>
                                    <div className="flex items-center justify-between"><span className="flex items-center gap-1.5 text-slate-600 dark:text-gray-400"><span className="h-2.5 w-2.5 rounded-full bg-rose-400" /> Costo plataforma</span><span className="font-bold text-rose-500 dark:text-rose-400">{fmt(r!.costoMensual)}</span></div>
                                    <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-700 pt-1.5"><span className="text-slate-500 dark:text-gray-400">Margen</span><span className="font-extrabold text-slate-800 dark:text-white">{r!.margenPct.toFixed(1)}%</span></div>
                                </div>
                            </>
                        );
                    })()}
                    <div className="mt-auto pt-4">
                        <div className="rounded-2xl bg-violet-50 dark:bg-violet-900/20 border border-violet-100 dark:border-violet-900/40 p-3">
                            <p className="text-xs font-semibold text-violet-700 dark:text-violet-400 flex items-center gap-1.5"><Icon icon="solar:rocket-2-bold-duotone" width="15" /> Cada cliente nuevo suma</p>
                            <p className="text-lg font-extrabold text-violet-700 dark:text-violet-400">≈ {fmt(gananciaPromedioCliente)}<span className="text-xs font-bold text-violet-400 dark:text-violet-300">/mes · {fmtShort(gananciaPromedioCliente * 12)}/año</span></p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tabla */}
            <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-[0_2px_20px_rgba(15,23,42,0.05)] dark:shadow-none border border-slate-100 dark:border-slate-700 p-6">
                <div className="flex items-center gap-2 mb-5 border-b border-slate-100 dark:border-slate-700">
                    <TabBtn active={tab === 'clientes'} onClick={() => setTab('clientes')} icon="solar:users-group-rounded-bold-duotone">
                        Ganancia por cliente
                    </TabBtn>
                    <TabBtn active={tab === 'renovaciones'} onClick={() => setTab('renovaciones')} icon="solar:calendar-mark-bold-duotone">
                        Próximas renovaciones ({renovaciones.length})
                    </TabBtn>
                </div>

                {tab === 'clientes' ? (
                    <div>
                        {/* Toolbar: buscar + filtro estimados + exportar */}
                        <div className="flex flex-wrap items-center gap-2 mb-4">
                            <div className="relative flex-1 min-w-[180px] max-w-xs">
                                <Icon icon="solar:magnifer-linear" className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-gray-500 text-sm" />
                                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar cliente o plan…" className="w-full h-9 pl-9 pr-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-700 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-gray-500 focus:outline-none focus:border-violet-400" />
                            </div>
                            <button onClick={() => setSoloEstimados((v) => !v)} className={`h-9 px-3 rounded-xl text-xs font-bold border transition-colors ${soloEstimados ? 'bg-amber-500 text-white border-amber-500' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-gray-400 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>
                                <Icon icon="solar:tag-price-bold-duotone" className="inline mr-1" width="14" /> Sin precio definido
                            </button>
                            <button onClick={exportCSV} className="ml-auto h-9 px-3 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-gray-400 hover:bg-slate-50 dark:hover:bg-slate-700">
                                <Icon icon="solar:upload-minimalistic-linear" className="inline mr-1" width="14" /> Exportar
                            </button>
                        </div>
                        <div className="overflow-x-auto font-inter">
                            {clientesView.length === 0 ? (
                                <p className="py-10 text-center text-sm text-slate-400 dark:text-gray-500">{search || soloEstimados ? 'Ningún cliente coincide con el filtro.' : 'Aún no tienes clientes activos.'}</p>
                            ) : (
                                <table className="w-full text-left border-collapse min-w-[640px]">
                                    <thead><tr className={THEAD_TR}>
                                        <th className="py-3 pl-2 pr-3">Cliente</th>
                                        <th className="py-3 px-3">Plan</th>
                                        <th className="py-3 px-3">Tipo</th>
                                        <th className="py-3 px-3 text-right">Cobras</th>
                                        <th className="py-3 px-3 text-right">Pagas</th>
                                        <th className="py-3 px-3 pr-2 text-right">Ganas</th>
                                    </tr></thead>
                                    <tbody>
                                        {clientesView.map((c) => (
                                            <tr key={c.empresaId} className={BODY_TR}>
                                                <td className="py-3 pl-2 pr-3"><EntityCell name={c.razonSocial} /></td>
                                                <td className="py-3 px-3 text-sm text-slate-500 dark:text-gray-400 truncate max-w-[150px]">{c.plan}</td>
                                                <td className="py-3 px-3">
                                                    {c.esWhiteLabel
                                                        ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400 whitespace-nowrap"><Icon icon="solar:crown-star-bold" width={12} /> Marca blanca</span>
                                                        : <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-gray-400">Estándar</span>}
                                                </td>
                                                <td className="py-3 px-3 text-right tabular-nums text-sm text-slate-700 dark:text-slate-200 whitespace-nowrap">{fmt(c.ingreso)}{c.ingresoEsEstimado && <span className="ml-1 text-[10px] text-amber-500 dark:text-amber-400 font-sans">est.</span>}</td>
                                                <td className="py-3 px-3 text-right tabular-nums text-sm text-rose-500 dark:text-rose-400 whitespace-nowrap">{fmt(c.costo)}</td>
                                                <td className={`py-3 px-3 pr-2 text-right tabular-nums text-sm font-bold whitespace-nowrap ${c.ganancia >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>{fmt(c.ganancia)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="overflow-x-auto font-inter">
                        {renovaciones.length === 0 ? (
                            <p className="py-10 text-center text-sm text-slate-400 dark:text-gray-500">Sin renovaciones en los próximos 30 días.</p>
                        ) : (
                            <table className="w-full text-left border-collapse min-w-[560px]">
                                <thead><tr className={THEAD_TR}>
                                    <th className="py-3 pl-2 pr-3">Cliente</th>
                                    <th className="py-3 px-3">Vence</th>
                                    <th className="py-3 px-3">Restan</th>
                                    <th className="py-3 px-3 text-right">Costo renovación</th>
                                    <th className="py-3 px-3 pr-2 text-right">Ganancia</th>
                                </tr></thead>
                                <tbody>
                                    {renovaciones.map((c) => {
                                        const b = diasBadge(c.diasRestantes, c.vencida);
                                        return (
                                            <tr key={c.empresaId} className={BODY_TR}>
                                                <td className="py-3 pl-2 pr-3"><EntityCell name={c.razonSocial} /></td>
                                                <td className="py-3 px-3 text-sm text-slate-500 dark:text-gray-400 whitespace-nowrap">{new Date(c.fechaExpiracion).toLocaleDateString('es-PE')}</td>
                                                <td className="py-3 px-3"><span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-bold ${b.cls}`}>{b.text}</span></td>
                                                <td className="py-3 px-3 text-right tabular-nums text-sm text-rose-500 dark:text-rose-400 whitespace-nowrap">{fmt(c.costo)}</td>
                                                <td className={`py-3 px-3 pr-2 text-right tabular-nums text-sm font-bold whitespace-nowrap ${c.ganancia >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>{fmt(c.ganancia)}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

function TabBtn({ active, onClick, icon, children }: { active: boolean; onClick: () => void; icon: string; children: React.ReactNode }) {
    return (
        <button
            onClick={onClick}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors ${active ? 'border-indigo-500 text-violet-600 dark:text-violet-400' : 'border-transparent text-slate-400 dark:text-gray-500 hover:text-slate-600 dark:hover:text-gray-300'}`}
        >
            <Icon icon={icon} width="18" /> {children}
        </button>
    );
}
