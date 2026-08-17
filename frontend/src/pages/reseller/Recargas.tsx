import { useResellerRecargasViewModel } from '@/features/reseller/useResellerViewModel';
import { Icon } from '@iconify/react';
import moment from 'moment';
import { useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { BRAND } from '@/lib/branding';
import { THEAD_TR, BODY_TR, EntityCell, EstadoPill } from './resellerTableUi';
import { PageHead, KpiHero, type KpiHeroItem } from './resellerUi';

const ACCENT = 'var(--accent, #7551FF)';
const money = (v: number) => `S/ ${Number(v ?? 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function ResellerRecargas() {
    const { recargas, stats, renovaciones, renovacionesResumen, getRenovaciones, auth } = useResellerRecargasViewModel();
    const [estadoFiltro, setEstadoFiltro] = useState<'' | 'APLICADO' | 'PENDIENTE' | 'RECHAZADO'>('');

    const aplicarFiltro = async (estado: '' | 'APLICADO' | 'PENDIENTE' | 'RECHAZADO') => {
        setEstadoFiltro(estado);
        if (auth?.resellerId) await getRenovaciones(auth.resellerId, estado);
    };

    const saldo = Number(stats.saldo ?? 0);
    const consumoMensual = Number(stats.costoMensual ?? 0);
    const totalRecargado = useMemo(() => recargas.reduce((a: number, r: any) => a + Number(r.monto || 0), 0), [recargas]);

    // Runway: cuántos meses dura el saldo al ritmo de consumo actual.
    const runwayMeses = consumoMensual > 0 ? saldo / consumoMensual : null;
    const saldoBajo = runwayMeses !== null && runwayMeses < 1;
    const runwayLabel = runwayMeses === null
        ? 'Sin consumo aún'
        : runwayMeses >= 12
            ? '12+ meses'
            : runwayMeses >= 1
                ? `~${runwayMeses.toFixed(1)} meses`
                : `~${Math.max(0, Math.round(runwayMeses * 30))} días`;

    // Flujo del mes: recargado (entra) vs consumido en renovaciones (sale).
    const inicioMes = moment().startOf('month');
    const recargadoMes = useMemo(() => recargas.filter((r: any) => moment(r.fecha).isSameOrAfter(inicioMes)).reduce((a: number, r: any) => a + Number(r.monto || 0), 0), [recargas]);
    // Los movimientos MENSUALIDAD se guardan con monto NEGATIVO (cobro). Aquí el
    // "consumido" es una magnitud (sale), por eso tomamos el valor absoluto para
    // que el widget muestre "-S/ 202" (no "-S/ -202") y el neto reste correctamente.
    const consumidoMes = useMemo(() => renovaciones.filter((m: any) => String(m.estado).toUpperCase() === 'APLICADO' && moment(m.fecha).isSameOrAfter(inicioMes)).reduce((a: number, m: any) => a + Math.abs(Number(m.monto || 0)), 0), [renovaciones]);
    const netoMes = recargadoMes - consumidoMes;

    // Recargas por mes (últimos 6) para el gráfico de barras.
    const recargasPorMes = useMemo(() => {
        const map = new Map<string, number>();
        recargas.forEach((r: any) => {
            const k = moment(r.fecha).format('YYYY-MM');
            map.set(k, (map.get(k) || 0) + Number(r.monto || 0));
        });
        return Array.from(map.entries())
            .sort((a, b) => a[0].localeCompare(b[0]))
            .slice(-6)
            .map(([k, v]) => ({ mes: moment(`${k}-01`).format('MMM'), total: Number(v.toFixed(2)) }));
    }, [recargas]);

    const openSupportChat = () => {
        const msg = encodeURIComponent(`Hola ${BRAND.name}, necesito recargar saldo como reseller`);
        window.open(`https://wa.me/51991065217?text=${msg}`, '_blank');
    };

    const recargasTable = useMemo(
        () => recargas.map((recarga: any) => ({
            id: `#${recarga.id}`,
            fecha: moment(recarga.fecha).format('DD MMM YYYY, hh:mm A'),
            monto: `+S/ ${Number(recarga.monto).toFixed(2)}`,
            medioPago: recarga.medioPago || 'Transferencia',
            referencia: recarga.referencia || '-',
            estado: 'Completado',
        })),
        [recargas],
    );

    const renovacionesTable = useMemo(
        () => renovaciones.map((mov: any) => ({
            fecha: moment(mov.fecha).format('DD MMM YYYY, hh:mm A'),
            cliente: mov.empresa?.razonSocial || 'Cliente eliminado',
            ruc: mov.empresa?.ruc || '-',
            monto: `S/ ${Number(mov.monto).toFixed(2)}`,
            intento: `#${mov.intento || 1}`,
            estado: mov.estado || 'APLICADO',
            detalle: mov.descripcion || '-',
        })),
        [renovaciones],
    );

    const kpis: KpiHeroItem[] = [
        { label: 'Saldo disponible', value: money(saldo), mini: 'donut', warn: saldoBajo, sub: saldoBajo ? 'Saldo bajo — recarga' : 'Disponible' },
        { label: 'Consumo mensual', value: money(consumoMensual), mini: 'wave', sub: 'En renovaciones de clientes' },
        { label: 'Te alcanza para', value: runwayLabel, mini: 'line', warn: saldoBajo, sub: 'Al ritmo de consumo actual' },
        { label: 'Total recargado', value: money(totalRecargado), mini: 'bars', sub: `${recargas.length} recarga${recargas.length !== 1 ? 's' : ''}` },
    ];

    return (
        <div className="space-y-6 animate-in fade-in zoom-in duration-300">
            {/* Header */}
            <PageHead title="Mis recargas" subtitle="Tu saldo, recargas y renovaciones de clientes">
                <button onClick={openSupportChat} className="h-11 px-4 rounded-2xl text-white text-sm font-bold flex items-center gap-1.5 shadow-lg shadow-violet-500/30 hover:brightness-105 transition-all" style={{ background: ACCENT }}>
                    <Icon icon="solar:add-circle-bold" className="text-lg" /> Recargar saldo
                </button>
            </PageHead>

            {/* Alerta de saldo bajo */}
            {saldoBajo && (
                <div className="flex items-center gap-3 rounded-2xl border border-rose-200 dark:border-rose-900/40 bg-rose-50 dark:bg-rose-900/20 px-4 py-3">
                    <Icon icon="solar:danger-triangle-bold-duotone" className="text-rose-500 text-2xl shrink-0" />
                    <p className="text-sm text-rose-700 dark:text-rose-400 font-semibold">Tu saldo alcanza para {runwayLabel}. Recarga pronto para evitar que se suspendan tus clientes.</p>
                    <button onClick={openSupportChat} className="ml-auto shrink-0 px-3 py-1.5 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-700">Recargar</button>
                </div>
            )}

            {/* KPIs */}
            <KpiHero items={kpis} />

            {/* Flujo del mes */}
            <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-[0_2px_20px_rgba(15,23,42,0.05)] dark:shadow-none border border-slate-100 dark:border-slate-700 p-5">
                <div className="flex items-center gap-2 mb-3">
                    <Icon icon="solar:round-transfer-vertical-bold-duotone" className="text-indigo-500 text-lg" />
                    <h3 className="text-sm font-extrabold text-slate-700 dark:text-slate-200">Flujo de este mes · {moment().format('MMMM')}</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-slate-100 dark:divide-slate-700">
                    <div className="px-2 sm:px-5 py-2">
                        <p className="text-[11px] font-bold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">Recargado (entra)</p>
                        <p className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400">+{money(recargadoMes)}</p>
                    </div>
                    <div className="px-2 sm:px-5 py-2">
                        <p className="text-[11px] font-bold uppercase tracking-wide text-amber-600 dark:text-amber-400">Consumido (sale)</p>
                        <p className="text-xl font-extrabold text-amber-600 dark:text-amber-400">-{money(consumidoMes)}</p>
                    </div>
                    <div className="px-2 sm:px-5 py-2">
                        <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-gray-400">Neto del mes</p>
                        <p className={`text-xl font-extrabold ${netoMes >= 0 ? 'text-slate-800 dark:text-white' : 'text-rose-600 dark:text-rose-400'}`}>{netoMes >= 0 ? '+' : ''}{money(netoMes)}</p>
                    </div>
                </div>
            </div>

            {/* Gráfico recargas por mes + cómo recargar */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-3xl shadow-[0_2px_20px_rgba(15,23,42,0.05)] dark:shadow-none border border-slate-100 dark:border-slate-700 p-5">
                    <h3 className="text-sm font-extrabold text-slate-700 dark:text-slate-200 mb-1">Recargas por mes</h3>
                    <p className="text-xs text-slate-400 dark:text-gray-500 mb-3">Últimos 6 meses</p>
                    <div className="h-52">
                        {recargasPorMes.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={recargasPorMes} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                                    <CartesianGrid vertical={false} stroke="#eef0f5" />
                                    <XAxis dataKey="mes" tick={{ fontSize: 11, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
                                    <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} tickLine={false} axisLine={false} width={48} tickFormatter={(v) => (v >= 1000 ? `${v / 1000}K` : `${v}`)} />
                                    <Tooltip formatter={(v: any) => [money(v), 'Recargado']} contentStyle={{ fontSize: 12, borderRadius: 10, borderColor: '#e5e7eb' }} cursor={{ fill: 'rgba(99,102,241,0.06)' }} />
                                    <Bar dataKey="total" fill={ACCENT} radius={[6, 6, 0, 0]} maxBarSize={44} isAnimationActive={false} />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex h-full flex-col items-center justify-center text-slate-300 dark:text-slate-600">
                                <Icon icon="solar:chart-2-linear" className="text-5xl mb-2" />
                                <p className="text-sm text-slate-400 dark:text-gray-500">Aún no has hecho recargas</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Cómo recargar */}
                <div className="bg-gradient-to-br from-violet-600 to-purple-700 rounded-3xl p-6 text-white shadow-lg shadow-violet-500/30 flex flex-col">
                    <h3 className="text-lg font-bold mb-3">¿Cómo recargar?</h3>
                    <ol className="space-y-3 text-sm text-violet-50">
                        {[
                            'Solicita los datos de transferencia a soporte.',
                            'Transfiere el monto que deseas recargar.',
                            'Envía el comprobante por WhatsApp.',
                            'Validamos y acreditamos tu saldo.',
                        ].map((step, i) => (
                            <li key={i} className="flex gap-2.5">
                                <span className="h-5 w-5 shrink-0 grid place-items-center rounded-full bg-white/20 text-[11px] font-bold">{i + 1}</span>
                                <span>{step}</span>
                            </li>
                        ))}
                    </ol>
                    <div className="mt-auto pt-5 space-y-2">
                        <button onClick={openSupportChat} className="w-full py-3 bg-white text-violet-700 font-bold rounded-xl shadow-sm hover:shadow-md transition-all active:scale-95 flex items-center justify-center gap-2">
                            <Icon icon="mdi:whatsapp" className="text-xl" /> Contactar soporte
                        </button>
                        <p className="text-xs text-center opacity-70">WhatsApp 991 065 217</p>
                    </div>
                </div>
            </div>

            {/* Historial de recargas */}
            <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-[0_2px_20px_rgba(15,23,42,0.05)] dark:shadow-none border border-slate-100 dark:border-slate-700 overflow-hidden">
                <div className="p-5 border-b border-slate-100 dark:border-slate-700">
                    <h3 className="font-bold text-slate-800 dark:text-white">Historial de recargas</h3>
                </div>
                <div className="p-4 relative z-0">
                    <div className="overflow-x-auto font-inter">
                        {recargasTable.length === 0 ? (
                            <div className="py-12 text-center text-slate-400 dark:text-gray-500">
                                <Icon icon="solar:wallet-linear" className="text-5xl mx-auto mb-2 opacity-60" />
                                <p className="text-sm">Aún no has realizado recargas.</p>
                            </div>
                        ) : (
                            <table className="w-full text-left border-collapse min-w-[640px]">
                                <thead><tr className={THEAD_TR}>
                                    <th className="py-3 pl-5 pr-3">ID</th>
                                    <th className="py-3 px-3">Fecha</th>
                                    <th className="py-3 px-3">Monto</th>
                                    <th className="py-3 px-3">Medio de pago</th>
                                    <th className="py-3 px-3">Referencia</th>
                                    <th className="py-3 px-3 pr-5">Estado</th>
                                </tr></thead>
                                <tbody>
                                    {recargasTable.map((r: any, i: number) => (
                                        <tr key={i} className={BODY_TR}>
                                            <td className="py-3 pl-5 pr-3 font-mono text-sm text-slate-500 dark:text-gray-400">{r.id}</td>
                                            <td className="py-3 px-3 text-sm text-slate-500 dark:text-gray-400 whitespace-nowrap">{r.fecha}</td>
                                            <td className="py-3 px-3 font-bold text-emerald-600 dark:text-emerald-400 text-sm whitespace-nowrap">{r.monto}</td>
                                            <td className="py-3 px-3 text-sm text-slate-600 dark:text-gray-400">{r.medioPago}</td>
                                            <td className="py-3 px-3 text-sm text-slate-500 dark:text-gray-400 truncate max-w-[160px]">{r.referencia}</td>
                                            <td className="py-3 px-3 pr-5"><EstadoPill estado={r.estado} /></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            </div>

            {/* Renovaciones de clientes */}
            <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-[0_2px_20px_rgba(15,23,42,0.05)] dark:shadow-none border border-slate-100 dark:border-slate-700 overflow-hidden">
                <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h3 className="font-bold text-slate-800 dark:text-white">Renovaciones de clientes</h3>
                        <p className="text-xs text-slate-500 dark:text-gray-400">Seguimiento de cobros mensuales, intentos y suspensiones</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {[
                            { label: 'Todos', value: '' as const },
                            { label: 'Aplicados', value: 'APLICADO' as const },
                            { label: 'Pendientes', value: 'PENDIENTE' as const },
                            { label: 'Rechazados', value: 'RECHAZADO' as const },
                        ].map((item) => (
                            <button
                                key={item.label}
                                onClick={() => aplicarFiltro(item.value)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${estadoFiltro === item.value ? 'bg-violet-600 text-white border-violet-600' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-gray-400 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                            >
                                {item.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50/40 dark:bg-slate-900/40">
                    <div className="rounded-xl border border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 p-3">
                        <p className="text-[11px] uppercase font-semibold text-slate-500 dark:text-gray-400">Total</p>
                        <p className="text-xl font-bold text-slate-800 dark:text-white">{renovacionesResumen.total || 0}</p>
                    </div>
                    <div className="rounded-xl border border-emerald-100 dark:border-emerald-900/40 bg-emerald-50/50 dark:bg-emerald-900/20 p-3">
                        <p className="text-[11px] uppercase font-semibold text-emerald-600 dark:text-emerald-400">Aplicados</p>
                        <p className="text-xl font-bold text-emerald-700 dark:text-emerald-400">{renovacionesResumen.aplicados || 0}</p>
                    </div>
                    <div className="rounded-xl border border-amber-100 dark:border-amber-900/40 bg-amber-50/50 dark:bg-amber-900/20 p-3">
                        <p className="text-[11px] uppercase font-semibold text-amber-600 dark:text-amber-400">Pendientes</p>
                        <p className="text-xl font-bold text-amber-700 dark:text-amber-400">{renovacionesResumen.pendientes || 0}</p>
                    </div>
                    <div className="rounded-xl border border-red-100 dark:border-rose-900/40 bg-red-50/50 dark:bg-rose-900/20 p-3">
                        <p className="text-[11px] uppercase font-semibold text-red-600 dark:text-rose-400">Rechazados</p>
                        <p className="text-xl font-bold text-red-700 dark:text-rose-400">{renovacionesResumen.rechazados || 0}</p>
                    </div>
                </div>

                <div className="p-4 relative z-0">
                    <div className="overflow-x-auto font-inter">
                        {renovacionesTable.length === 0 ? (
                            <div className="py-12 text-center text-slate-400 dark:text-gray-500">
                                <Icon icon="solar:refresh-circle-linear" className="text-5xl mx-auto mb-2 opacity-60" />
                                <p className="text-sm">No hay renovaciones para este filtro.</p>
                            </div>
                        ) : (
                            <table className="w-full text-left border-collapse min-w-[820px]">
                                <thead><tr className={THEAD_TR}>
                                    <th className="py-3 pl-5 pr-3">Cliente</th>
                                    <th className="py-3 px-3">Fecha</th>
                                    <th className="py-3 px-3">Monto</th>
                                    <th className="py-3 px-3">Intento</th>
                                    <th className="py-3 px-3">Estado</th>
                                    <th className="py-3 px-3 pr-5">Detalle</th>
                                </tr></thead>
                                <tbody>
                                    {renovacionesTable.map((m: any, i: number) => (
                                        <tr key={i} className={BODY_TR}>
                                            <td className="py-3 pl-5 pr-3"><EntityCell name={m.cliente} sub={m.ruc} /></td>
                                            <td className="py-3 px-3 text-sm text-slate-500 dark:text-gray-400 whitespace-nowrap">{m.fecha}</td>
                                            <td className="py-3 px-3 font-bold text-slate-800 dark:text-white text-sm whitespace-nowrap">{m.monto}</td>
                                            <td className="py-3 px-3 text-sm text-slate-500 dark:text-gray-400">{m.intento}</td>
                                            <td className="py-3 px-3"><EstadoPill estado={m.estado} /></td>
                                            <td className="py-3 px-3 pr-5 text-sm text-slate-500 dark:text-gray-400 truncate max-w-[220px]">{m.detalle}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
