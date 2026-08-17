import { useMemo, useState } from 'react';
import { Icon } from '@iconify/react';
import moment from 'moment';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { THEAD_TR, BODY_TR, EntityCell, EstadoPill } from './resellerTableUi';
import Select from '@/components/Select';
import { Calendar } from '@/components/Date';
import { useResellerEstadoCuentaViewModel } from '@/features/reseller/useResellerViewModel';
import type { ResellerEstadoCuentaMovimiento } from '@/zustand/reseller-panel';
import { PageHead, KpiHero, type KpiHeroItem } from './resellerUi';

const money = (v: number) => `S/ ${Number(v ?? 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const TIPO_OPTS = [
    { id: '', value: 'Todos los tipos' },
    { id: 'RECARGA', value: 'Recarga' },
    { id: 'ACTIVACION', value: 'Activación' },
    { id: 'MENSUALIDAD', value: 'Mensualidad' },
    { id: 'DEVOLUCION', value: 'Devolución' },
];
const ESTADO_OPTS = [
    { id: '', value: 'Todos los estados' },
    { id: 'APLICADO', value: 'Aplicado' },
    { id: 'PENDIENTE', value: 'Pendiente' },
    { id: 'RECHAZADO', value: 'Rechazado' },
];

type EstadoFilter = '' | 'APLICADO' | 'PENDIENTE' | 'RECHAZADO';
type TipoFilter = '' | 'RECARGA' | 'ACTIVACION' | 'MENSUALIDAD' | 'DEVOLUCION';

export default function ResellerEstadoCuenta() {
    const { auth, estadoCuenta, getEstadoCuenta } = useResellerEstadoCuentaViewModel();
    const [desde, setDesde] = useState(moment().startOf('month').format('YYYY-MM-DD'));
    const [hasta, setHasta] = useState(moment().format('YYYY-MM-DD'));
    const [estado, setEstado] = useState<EstadoFilter>('');
    const [tipo, setTipo] = useState<TipoFilter>('');
    const [periodo, setPeriodo] = useState<'mes' | 'mesPasado' | '30' | '90' | ''>('mes');

    const onFiltrar = async () => {
        if (!auth?.resellerId) return;
        await getEstadoCuenta(auth.resellerId, { desde, hasta, estado, tipo, page: 1, limit: 100 });
    };

    const aplicarPeriodo = async (key: 'mes' | 'mesPasado' | '30' | '90') => {
        setPeriodo(key);
        let d = desde;
        let h = moment().format('YYYY-MM-DD');
        if (key === 'mes') d = moment().startOf('month').format('YYYY-MM-DD');
        else if (key === 'mesPasado') { d = moment().subtract(1, 'month').startOf('month').format('YYYY-MM-DD'); h = moment().subtract(1, 'month').endOf('month').format('YYYY-MM-DD'); }
        else if (key === '30') d = moment().subtract(29, 'days').format('YYYY-MM-DD');
        else if (key === '90') d = moment().subtract(89, 'days').format('YYYY-MM-DD');
        setDesde(d); setHasta(h);
        if (auth?.resellerId) await getEstadoCuenta(auth.resellerId, { desde: d, hasta: h, estado, tipo, page: 1, limit: 100 });
    };

    const rows = useMemo(
        () =>
            (estadoCuenta?.movimientos || []).map((mov: ResellerEstadoCuentaMovimiento) => ({
                fecha: moment(mov.fecha).format('DD/MM/YYYY HH:mm'),
                tipo: mov.tipo,
                cliente: mov.empresa?.razonSocial || '-',
                ruc: mov.empresa?.ruc || '-',
                monto: `${mov.monto >= 0 ? '+' : '-'}S/ ${Math.abs(Number(mov.monto || 0)).toFixed(2)}`,
                estado: mov.estado || '-',
                intento: mov.intento || 1,
                detalle: mov.descripcion || '-',
            })),
        [estadoCuenta?.movimientos],
    );

    const exportarCSV = () => {
        const data = estadoCuenta?.movimientos || [];
        if (!data.length) return;

        const headers = ['FECHA', 'TIPO', 'CLIENTE', 'RUC', 'MONTO', 'ESTADO', 'INTENTO', 'DETALLE'];
        const lines = data.map((mov) => [
            moment(mov.fecha).format('YYYY-MM-DD HH:mm:ss'),
            mov.tipo,
            mov.empresa?.razonSocial || '',
            mov.empresa?.ruc || '',
            Number(mov.monto || 0).toFixed(2),
            mov.estado || '',
            String(mov.intento || 1),
            (mov.descripcion || '').replace(/"/g, "'"),
        ]);

        const csv = [headers, ...lines].map((row) => row.map((value) => `"${value}"`).join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `estado-cuenta-${moment().format('YYYYMMDD-HHmm')}.csv`;
        link.click();
        URL.revokeObjectURL(url);
    };

    const resumen = estadoCuenta?.resumen;

    return (
        <div className="space-y-6 animate-in fade-in zoom-in duration-300">
            <PageHead title="Estado de Cuenta" subtitle="Control de recargas, activaciones y renovaciones de tus clientes">
                <button
                    onClick={exportarCSV}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors text-sm font-semibold"
                >
                    <Icon icon="solar:download-minimalistic-linear" width="18" />
                    Exportar CSV
                </button>
            </PageHead>

            {/* Periodo rápido */}
            <div className="flex flex-wrap gap-2">
                {[
                    { key: 'mes' as const, label: 'Este mes' },
                    { key: 'mesPasado' as const, label: 'Mes pasado' },
                    { key: '30' as const, label: 'Últimos 30 días' },
                    { key: '90' as const, label: 'Últimos 90 días' },
                ].map((p) => (
                    <button
                        key={p.key}
                        onClick={() => aplicarPeriodo(p.key)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors ${periodo === p.key ? 'bg-violet-600 text-white border-violet-600' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-gray-400 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                    >
                        {p.label}
                    </button>
                ))}
            </div>

            <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl p-4 grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
                <Calendar
                    text="Desde"
                    name="desde"
                    portal
                    withOutFormat
                    value={desde ? moment(desde, 'YYYY-MM-DD').format('DD/MM/YYYY') : ''}
                    onChange={(val) => { setDesde(val); setPeriodo(''); }}
                />
                <Calendar
                    text="Hasta"
                    name="hasta"
                    portal
                    withOutFormat
                    value={hasta ? moment(hasta, 'YYYY-MM-DD').format('DD/MM/YYYY') : ''}
                    onChange={(val) => { setHasta(val); setPeriodo(''); }}
                />
                <Select
                    name="tipo"
                    label="Tipo"
                    error=""
                    options={TIPO_OPTS}
                    value={TIPO_OPTS.find((o) => o.id === tipo)?.value ?? ''}
                    onChange={(id) => setTipo(String(id) as TipoFilter)}
                />
                <Select
                    name="estado"
                    label="Estado"
                    error=""
                    options={ESTADO_OPTS}
                    value={ESTADO_OPTS.find((o) => o.id === estado)?.value ?? ''}
                    onChange={(id) => setEstado(String(id) as EstadoFilter)}
                />
                <button
                    onClick={onFiltrar}
                    className="h-11 rounded-xl btn-accent font-semibold transition-colors text-sm"
                >
                    Filtrar
                </button>
            </div>

            <KpiHero items={([
                { label: 'Saldo Actual', value: money(estadoCuenta?.reseller?.saldoActual || 0), mini: 'donut', sub: 'Saldo disponible' },
                { label: 'Total Recargado', value: money(resumen?.recargas.total || 0), mini: 'bars', sub: 'Entradas del periodo' },
                { label: 'Total Cobrado', value: money(resumen?.totalCobrado || 0), mini: 'wave', sub: 'Salidas del periodo' },
                { label: 'Flujo Neto Periodo', value: money(resumen?.flujoNeto || 0), mini: 'line', warn: Number(resumen?.flujoNeto || 0) < 0, sub: 'Entradas − salidas' },
            ] as KpiHeroItem[])} />

            {/* Desglose de flujo + cobros + salud de mensualidades */}
            {resumen && (() => {
                const entradas = Number(resumen.recargas.total || 0) + Number(resumen.devoluciones.total || 0);
                const cobros = [
                    { name: 'Activaciones', value: Number(resumen.activaciones.cobrado || 0), cantidad: resumen.activaciones.cantidad },
                    { name: 'Mensualidades', value: Number(resumen.mensualidades.cobrado || 0), cantidad: resumen.mensualidades.aplicadas },
                ].filter((x) => x.value > 0);
                const totalCobros = cobros.reduce((a, c) => a + c.value, 0);
                const mens = resumen.mensualidades;
                return (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                        {/* Entradas vs salidas */}
                        <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-3xl shadow-[0_2px_20px_rgba(15,23,42,0.05)] dark:shadow-none border border-slate-100 dark:border-slate-700 p-5">
                            <h3 className="text-sm font-extrabold text-slate-700 dark:text-slate-200 mb-3 flex items-center gap-2"><Icon icon="solar:round-transfer-vertical-bold-duotone" className="text-indigo-500" width="18" /> Desglose del periodo</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div className="rounded-2xl border border-emerald-100 dark:border-emerald-900/40 bg-emerald-50/40 dark:bg-emerald-900/20 p-3">
                                    <p className="text-[11px] font-bold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">Entradas</p>
                                    <p className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400">+{money(entradas)}</p>
                                    <div className="mt-2 space-y-1 text-xs text-slate-600 dark:text-gray-400">
                                        <div className="flex justify-between"><span>Recargas ({resumen.recargas.cantidad})</span><span className="font-semibold">{money(resumen.recargas.total)}</span></div>
                                        <div className="flex justify-between"><span>Devoluciones ({resumen.devoluciones.cantidad})</span><span className="font-semibold">{money(resumen.devoluciones.total)}</span></div>
                                    </div>
                                </div>
                                <div className="rounded-2xl border border-rose-100 dark:border-rose-900/40 bg-rose-50/40 dark:bg-rose-900/20 p-3">
                                    <p className="text-[11px] font-bold uppercase tracking-wide text-rose-600 dark:text-rose-400">Salidas (cobros)</p>
                                    <p className="text-xl font-extrabold text-rose-600 dark:text-rose-400">-{money(totalCobros)}</p>
                                    <div className="mt-2 space-y-1 text-xs text-slate-600 dark:text-gray-400">
                                        <div className="flex justify-between"><span>Activaciones ({resumen.activaciones.cantidad})</span><span className="font-semibold">{money(resumen.activaciones.cobrado)}</span></div>
                                        <div className="flex justify-between"><span>Mensualidades ({mens.aplicadas})</span><span className="font-semibold">{money(mens.cobrado)}</span></div>
                                    </div>
                                </div>
                            </div>
                            <div className="mt-3 flex items-center justify-between rounded-2xl bg-slate-50 dark:bg-slate-900/40 px-4 py-2.5">
                                <span className="text-sm font-bold text-slate-600 dark:text-gray-400">Flujo neto del periodo</span>
                                <span className={`text-lg font-extrabold ${Number(resumen.flujoNeto || 0) >= 0 ? 'text-slate-800 dark:text-white' : 'text-rose-600 dark:text-rose-400'}`}>{Number(resumen.flujoNeto || 0) >= 0 ? '+' : ''}{money(resumen.flujoNeto)}</span>
                            </div>
                            {/* Salud de mensualidades */}
                            <div className="mt-3 grid grid-cols-3 gap-2">
                                <div className="rounded-xl border border-emerald-100 dark:border-emerald-900/40 bg-emerald-50/40 dark:bg-emerald-900/20 p-2.5 text-center"><p className="text-[10px] font-bold uppercase text-emerald-600 dark:text-emerald-400">Aplicadas</p><p className="text-lg font-extrabold text-emerald-700 dark:text-emerald-400">{mens.aplicadas}</p></div>
                                <div className="rounded-xl border border-amber-100 dark:border-amber-900/40 bg-amber-50/40 dark:bg-amber-900/20 p-2.5 text-center"><p className="text-[10px] font-bold uppercase text-amber-600 dark:text-amber-400">Pendientes</p><p className="text-lg font-extrabold text-amber-700 dark:text-amber-400">{mens.pendientes}</p></div>
                                <div className="rounded-xl border border-rose-100 dark:border-rose-900/40 bg-rose-50/40 dark:bg-rose-900/20 p-2.5 text-center"><p className="text-[10px] font-bold uppercase text-rose-600 dark:text-rose-400">Rechazadas</p><p className="text-lg font-extrabold text-rose-700 dark:text-rose-400">{mens.rechazadas}</p></div>
                            </div>
                            {mens.rechazadas > 0 && (
                                <p className="mt-2 text-xs text-rose-600 dark:text-rose-400 font-semibold flex items-center gap-1"><Icon icon="solar:danger-triangle-bold-duotone" width="14" /> {mens.rechazadas} cobro{mens.rechazadas !== 1 ? 's' : ''} rechazado{mens.rechazadas !== 1 ? 's' : ''} — revisa tu saldo para evitar suspensiones.</p>
                            )}
                        </div>

                        {/* Donut ¿en qué se cobró? */}
                        <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-[0_2px_20px_rgba(15,23,42,0.05)] dark:shadow-none border border-slate-100 dark:border-slate-700 p-5">
                            <h3 className="text-sm font-extrabold text-slate-700 dark:text-slate-200 mb-1 flex items-center gap-2"><Icon icon="solar:pie-chart-2-bold-duotone" className="text-rose-500" width="18" /> ¿En qué se cobró?</h3>
                            <div className="relative mx-auto h-36 w-36 mt-2">
                                {totalCobros > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie data={cobros} dataKey="value" nameKey="name" innerRadius={44} outerRadius={64} paddingAngle={2} stroke="none">
                                                {cobros.map((_, i) => <Cell key={i} fill={['#f43f5e', '#f59e0b'][i % 2]} />)}
                                            </Pie>
                                            <Tooltip formatter={(v: any, n: any) => [money(v), n]} contentStyle={{ fontSize: 12, borderRadius: 8, borderColor: '#e5e7eb' }} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="flex h-full items-center justify-center text-center text-sm text-slate-300 dark:text-slate-600">Sin cobros</div>
                                )}
                                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                                    <span className="text-base font-extrabold text-slate-800 dark:text-white">{money(totalCobros).replace('S/ ', 'S/')}</span>
                                    <span className="text-[10px] text-slate-400 dark:text-gray-500">cobrado</span>
                                </div>
                            </div>
                            <div className="mt-4 space-y-1.5">
                                {cobros.map((c, i) => (
                                    <div key={c.name} className="flex items-center justify-between text-sm">
                                        <span className="flex items-center gap-1.5 text-slate-600 dark:text-gray-400"><span className="h-2.5 w-2.5 rounded-full" style={{ background: ['#f43f5e', '#f59e0b'][i % 2] }} /> {c.name}</span>
                                        <span className="font-bold text-slate-500 dark:text-gray-400">{totalCobros > 0 ? ((c.value / totalCobros) * 100).toFixed(0) : 0}%</span>
                                    </div>
                                ))}
                                {cobros.length === 0 && <p className="text-center text-xs text-slate-400 dark:text-gray-500 py-2">Sin cobros en el periodo</p>}
                            </div>
                        </div>
                    </div>
                );
            })()}

            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-4">
                <h3 className="font-bold text-slate-800 dark:text-white mb-1">Movimientos del periodo</h3>
                <p className="text-xs text-slate-500 dark:text-gray-400 mb-4">
                    Desde {moment(estadoCuenta?.periodo?.desde || desde).format('DD/MM/YYYY')} hasta {moment(estadoCuenta?.periodo?.hasta || hasta).format('DD/MM/YYYY')}
                </p>
                {rows.length === 0 ? (
                    <p className="py-12 text-center text-sm text-slate-400 dark:text-gray-500">No hay movimientos en este periodo.</p>
                ) : (
                    <div className="overflow-x-auto font-inter">
                        <table className="w-full text-left border-collapse min-w-[880px]">
                            <thead><tr className={THEAD_TR}>
                                <th className="py-3 pl-2 pr-3">Cliente</th>
                                <th className="py-3 px-3">Fecha</th>
                                <th className="py-3 px-3">Tipo</th>
                                <th className="py-3 px-3">Monto</th>
                                <th className="py-3 px-3">Estado</th>
                                <th className="py-3 px-3">Intento</th>
                                <th className="py-3 px-3 pr-2">Detalle</th>
                            </tr></thead>
                            <tbody>
                                {rows.map((m: any, i: number) => {
                                    const montoCls = String(m.monto).trim().startsWith('+') ? 'text-emerald-600 dark:text-emerald-400' : String(m.monto).trim().startsWith('-') ? 'text-rose-500 dark:text-rose-400' : 'text-slate-800 dark:text-white';
                                    return (
                                        <tr key={i} className={BODY_TR}>
                                            <td className="py-3 pl-2 pr-3">
                                                {m.cliente && m.cliente !== '-'
                                                    ? <EntityCell name={m.cliente} sub={m.ruc !== '-' ? m.ruc : undefined} />
                                                    : <span className="text-sm text-slate-400 dark:text-gray-500">Movimiento de saldo</span>}
                                            </td>
                                            <td className="py-3 px-3 text-sm text-slate-500 dark:text-gray-400 whitespace-nowrap">{m.fecha}</td>
                                            <td className="py-3 px-3"><span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400 whitespace-nowrap">{m.tipo}</span></td>
                                            <td className={`py-3 px-3 font-bold text-sm whitespace-nowrap ${montoCls}`}>{m.monto}</td>
                                            <td className="py-3 px-3"><EstadoPill estado={m.estado} /></td>
                                            <td className="py-3 px-3 text-sm text-slate-500 dark:text-gray-400">{m.intento}</td>
                                            <td className="py-3 px-3 pr-2 text-sm text-slate-500 dark:text-gray-400 truncate max-w-[220px]">{m.detalle}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
