import { useState, useEffect, useCallback, useMemo } from 'react';
import { Icon } from '@iconify/react';
import { BarChart, Bar, Cell, XAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { get, patch } from '@/utils/fetch';
import useAlertStore from '@/zustand/alert';
import { KpiMini, DarkTooltip } from '../shared/dashboardWidgets';
import { useThemeStore, SIDEBAR_COLOR_HEX } from '@/zustand/theme';

interface ComisionDetalle {
    id: number;
    comprobante: { tipoDoc: string; serie: string; correlativo: number; fechaEmision: string; mtoImpVenta: number };
    descripcion: string | null;
    motivo: string | null;
    cantidad: number;
    montoComision: number;
    estado: 'PENDIENTE' | 'PAGADO';
}

interface VendedorComision {
    vendedor: { id: number; nombre: string; rol: string; dni: string };
    totalComision: number;
    totalPagado: number;
    totalPendiente: number;
    cantidadVentas: number;
    comisiones: ComisionDetalle[];
}

interface ResumenMensual {
    mes: number;
    anio: number;
    vendedores: VendedorComision[];
}

const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

function formatCurrency(n: number | string) {
    return `S/ ${parseFloat(String(n || 0)).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function toISODate(d: Date) {
    return d.toISOString().slice(0, 10);
}

function firstDayOfMonth(mes: number, anio: number) {
    return toISODate(new Date(anio, mes - 1, 1));
}

function lastDayOfMonth(mes: number, anio: number) {
    return toISODate(new Date(anio, mes, 0));
}

type Preset = 'mes' | 'q1' | 'q2' | 'hoy';

export default function ComisionesView() {
    const now = new Date();
    const [mes, setMes] = useState(now.getMonth() + 1);
    const [anio, setAnio] = useState(now.getFullYear());
    const [data, setData] = useState<ResumenMensual | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [expandedId, setExpandedId] = useState<number | null>(null);
    const [detallePage, setDetallePage] = useState(1);
    const DETALLE_PAGE_SIZE = 15;
    const [pagandoId, setPagandoId] = useState<number | null>(null);
    const alertFn = useAlertStore(s => s.alert);

    // ── Tema / acento (mismo lenguaje visual del dashboard) ─────────────────────
    const sidebarColor = useThemeStore((s) => s.sidebarColor);
    const ACCENT = SIDEBAR_COLOR_HEX[sidebarColor] ?? '#7551FF';
    const isDarkMode = useThemeStore((s) => s.isDarkMode);
    const mutedBar = isDarkMode ? '#1e293b' : '#eef1f6';

    // ── Filtros ───────────────────────────────────────────────────────────────
    const [filtroVendedor, setFiltroVendedor] = useState<number | null>(null);
    const [desde, setDesde] = useState(() => firstDayOfMonth(now.getMonth() + 1, now.getFullYear()));
    const [hasta, setHasta] = useState(() => lastDayOfMonth(now.getMonth() + 1, now.getFullYear()));
    const [preset, setPreset] = useState<Preset>('mes');

    // Sincroniza rango cuando cambia mes/año
    useEffect(() => {
        applyPreset(preset, mes, anio);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mes, anio]);

    function applyPreset(p: Preset, m = mes, a = anio) {
        setPreset(p);
        const lastDay = new Date(a, m, 0).getDate();
        const today = toISODate(now);
        switch (p) {
            case 'mes': setDesde(firstDayOfMonth(m, a)); setHasta(lastDayOfMonth(m, a)); break;
            case 'q1':  setDesde(`${a}-${String(m).padStart(2,'0')}-01`); setHasta(`${a}-${String(m).padStart(2,'0')}-15`); break;
            case 'q2':  setDesde(`${a}-${String(m).padStart(2,'0')}-16`); setHasta(lastDayOfMonth(m, a)); break;
            case 'hoy': setDesde(today); setHasta(today); break;
        }
    }

    // ── Fetch ─────────────────────────────────────────────────────────────────
    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const res = await get<ResumenMensual>(`/comisiones/resumen?mes=${mes}&anio=${anio}`);
            setData(res.data ?? null);
        } catch {
            setData({ mes, anio, vendedores: [] });
        } finally {
            setIsLoading(false);
        }
    }, [mes, anio]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const navegarMes = (delta: number) => {
        let m = mes + delta;
        let a = anio;
        if (m > 12) { m = 1; a++; }
        if (m < 1) { m = 12; a--; }
        setMes(m);
        setAnio(a);
        setExpandedId(null);
        setFiltroVendedor(null);
    };

    // ── Datos filtrados ───────────────────────────────────────────────────────
    const vendedoresFiltrados = useMemo<VendedorComision[]>(() => {
        if (!data?.vendedores) return [];

        return data.vendedores
            .filter(v => filtroVendedor === null || v.vendedor.id === filtroVendedor)
            .map(v => {
                const comisionesFiltradas = v.comisiones.filter(c => {
                    const fechaStr = c.comprobante.fechaEmision.slice(0, 10);
                    return fechaStr >= desde && fechaStr <= hasta;
                });

                const totalComision  = comisionesFiltradas.reduce((s, c) => s + parseFloat(String(c.montoComision || 0)), 0);
                const totalPagado    = comisionesFiltradas.filter(c => c.estado === 'PAGADO').reduce((s, c) => s + parseFloat(String(c.montoComision || 0)), 0);
                const totalPendiente = comisionesFiltradas.filter(c => c.estado === 'PENDIENTE').reduce((s, c) => s + parseFloat(String(c.montoComision || 0)), 0);

                return {
                    ...v,
                    comisiones: comisionesFiltradas,
                    totalComision,
                    totalPagado,
                    totalPendiente,
                    cantidadVentas: new Set(comisionesFiltradas.map(c => `${c.comprobante.serie}-${c.comprobante.correlativo}`)).size,
                };
            })
            .filter(v => v.comisiones.length > 0);
    }, [data, filtroVendedor, desde, hasta]);

    const totalGeneral   = useMemo(() => vendedoresFiltrados.reduce((s, v) => s + v.totalComision, 0), [vendedoresFiltrados]);
    const totalPendiente = useMemo(() => vendedoresFiltrados.reduce((s, v) => s + v.totalPendiente, 0), [vendedoresFiltrados]);
    const totalPagado    = useMemo(() => vendedoresFiltrados.reduce((s, v) => s + v.totalPagado, 0), [vendedoresFiltrados]);

    // Distribución de comisiones por vendedor (top) para el gráfico de barras
    const topVendedores = useMemo(
        () => vendedoresFiltrados
            .map(v => ({ nombre: v.vendedor.nombre, total: v.totalComision }))
            .sort((a, b) => b.total - a.total)
            .slice(0, 8),
        [vendedoresFiltrados],
    );

    // Tarjetas KPI unificadas (mismo lenguaje visual del dashboard)
    const kpiCards: { label: string; value: string; sub: string; mini: 'line' | 'wave' | 'donut' | 'bars' }[] = [
        { label: 'Total Comisiones', value: formatCurrency(totalGeneral),  sub: 'generado en el periodo', mini: 'line' },
        { label: 'Pagado',           value: formatCurrency(totalPagado),    sub: 'ya liquidado',           mini: 'donut' },
        { label: 'Pendiente',        value: formatCurrency(totalPendiente), sub: 'por liquidar',           mini: 'wave' },
        { label: 'Vendedores',       value: String(vendedoresFiltrados.length), sub: 'con comisiones',     mini: 'bars' },
    ];

    // ── Acciones ─────────────────────────────────────────────────────────────
    const marcarPagado = async (vendedorId: number) => {
        setPagandoId(vendedorId);
        try {
            await patch(`/comisiones/pagar/${vendedorId}?mes=${mes}&anio=${anio}`, {});
            alertFn('Comisiones marcadas como PAGADO', 'success');
            fetchData();
        } catch {
            alertFn('Error al marcar comisiones', 'error');
        } finally {
            setPagandoId(null);
        }
    };

    const exportarCSV = async () => {
        try {
            const res = await get<any[]>(`/comisiones/exportar?mes=${mes}&anio=${anio}`);
            const rows = (res.data ?? []).filter((r: any) => {
                const fecha = (r.fechaVenta ?? '').slice(0, 10);
                const matchVendedor = filtroVendedor === null || r.vendedorId === filtroVendedor;
                return matchVendedor && fecha >= desde && fecha <= hasta;
            });
            if (!rows.length) { alertFn('Sin datos para exportar con los filtros actuales', 'warning'); return; }
            const headers = ['Vendedor', 'DNI', 'Comprobante', 'Tipo', 'Fecha', 'Total Venta', 'Producto', 'Cantidad', 'Comisión', 'Estado'];
            const csvRows = [
                headers.join(','),
                ...rows.map((r: any) => [
                    `"${r.vendedor}"`, r.dniVendedor, r.comprobante, r.tipoDoc, r.fechaVenta,
                    r.totalVenta, `"${r.producto}"`, r.cantidad, r.montoComision, r.estado,
                ].join(','))
            ];
            const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Comisiones_${desde}_${hasta}.csv`;
            a.click();
            URL.revokeObjectURL(url);
        } catch {
            alertFn('Error al exportar', 'error');
        }
    };

    const todosLosVendedores = data?.vendedores ?? [];
    const hayFiltrosActivos = filtroVendedor !== null || desde !== firstDayOfMonth(mes, anio) || hasta !== lastDayOfMonth(mes, anio);

    return (
        <div className="min-h-0 -m-5 p-5 bg-[#F7F8FB] dark:bg-[#0A0D14] font-jakarta">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm text-slate-400 mb-5">
                <Icon icon="solar:home-smile-linear" className="text-base" />
                <span>Panel</span>
                <Icon icon="solar:alt-arrow-right-linear" className="text-xs" />
                <span>Finanzas</span>
                <Icon icon="solar:alt-arrow-right-linear" className="text-xs" />
                <span className="font-semibold" style={{ color: ACCENT }}>Comisiones</span>
            </div>

            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-5">
                <div className="min-w-0">
                    <h1 className="text-[22px] font-extrabold text-slate-800 dark:text-white tracking-tight">Comisiones de vendedores</h1>
                    <p className="text-sm text-slate-400 mt-0.5">Liquida y controla las comisiones generadas por tus ventas.</p>
                </div>
                <div className="flex items-center gap-2.5">
                    {/* Navegación de mes */}
                    <div className="flex items-center gap-1 h-11 rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2">
                        <button onClick={() => navegarMes(-1)} className="h-8 w-8 grid place-items-center rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                            <Icon icon="solar:alt-arrow-left-linear" />
                        </button>
                        <span className="text-sm font-bold text-slate-700 dark:text-slate-200 px-2 min-w-[100px] text-center">
                            {MESES[mes - 1]} {anio}
                        </span>
                        <button
                            onClick={() => navegarMes(1)}
                            disabled={mes === now.getMonth() + 1 && anio === now.getFullYear()}
                            className="h-8 w-8 grid place-items-center rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-30"
                        >
                            <Icon icon="solar:alt-arrow-right-linear" />
                        </button>
                    </div>

                    <button
                        onClick={exportarCSV}
                        className="h-11 px-4 rounded-2xl text-white text-sm font-bold flex items-center gap-1.5 shadow-lg shadow-violet-500/30 hover:brightness-105 transition-all shrink-0"
                        style={{ background: ACCENT }}
                    >
                        <Icon icon="solar:upload-minimalistic-bold" className="text-lg" />
                        <span className="hidden sm:inline">Exportar CSV</span>
                    </button>
                </div>
            </div>

            {/* ── KPIs hero (tarjeta unificada con columnas divididas) ── */}
            <div className="rounded-3xl bg-white dark:bg-[#111827] shadow-[0_2px_20px_rgba(15,23,42,0.05)] dark:shadow-none border border-slate-100 dark:border-slate-800 overflow-hidden mb-5">
                <div className="grid grid-cols-2 lg:grid-cols-4">
                    {kpiCards.map((c, idx) => (
                        <div
                            key={c.label}
                            className={`flex flex-col border-slate-100 dark:border-slate-800 lg:border-t-0 ${idx % 2 === 1 ? 'border-l' : ''} ${idx >= 2 ? 'border-t' : ''} ${idx > 0 ? 'lg:border-l' : ''}`}
                        >
                            <div className="p-5">
                                <div className="flex items-center gap-1.5 text-slate-400 dark:text-gray-400">
                                    <span className="text-[11px] font-black uppercase tracking-wide">{c.label}</span>
                                </div>
                                <div className="mt-2.5 flex items-start justify-between gap-2">
                                    <div className="min-w-0">
                                        <p className="text-2xl font-extrabold text-slate-800 dark:text-white truncate">{c.value}</p>
                                        <span className="mt-1.5 block text-xs text-slate-400 dark:text-gray-400">{c.sub}</span>
                                    </div>
                                    <div className="shrink-0 pt-0.5">
                                        <KpiMini type={c.mini} accent={ACCENT} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* ── Comisiones por vendedor (distribución) ── */}
            {topVendedores.length > 0 && (
                <div className="rounded-3xl bg-white dark:bg-[#111827] p-5 shadow-[0_2px_20px_rgba(15,23,42,0.05)] dark:shadow-none border border-slate-100 dark:border-slate-800 mb-5">
                    <div className="mb-4 flex items-center gap-1.5">
                        <h3 className="text-sm font-extrabold text-slate-800 dark:text-white">Comisiones por vendedor</h3>
                        <Icon icon="solar:info-circle-linear" className="text-[13px] text-slate-400" />
                    </div>
                    <div className="h-56">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={topVendedores} margin={{ top: 8, right: 4, left: -12, bottom: 0 }} barCategoryGap="26%">
                                <XAxis
                                    dataKey="nombre"
                                    tickFormatter={(l) => String(l).split(' ')[0]}
                                    tick={{ fontSize: 11, fill: '#94a3b8' }}
                                    axisLine={false}
                                    tickLine={false}
                                    interval={0}
                                />
                                <Tooltip cursor={{ fill: 'transparent' }} content={DarkTooltip(formatCurrency, (l) => String(l))} />
                                <Bar dataKey="total" name="Comisión" radius={[999, 999, 999, 999]} maxBarSize={40} background={{ fill: mutedBar } as any}>
                                    {topVendedores.map((_, i) => (
                                        <Cell key={i} fill={ACCENT} fillOpacity={1 - i * 0.08} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}

            {/* ── Filtros ── */}
            <div className="bg-white dark:bg-[#111827] rounded-3xl shadow-[0_2px_20px_rgba(15,23,42,0.05)] dark:shadow-none border border-slate-100 dark:border-slate-800 p-4 mb-5">
                <div className="flex items-center gap-2 mb-3">
                    <div className="w-7 h-7 rounded-xl bg-violet-50 dark:bg-violet-900/20 flex items-center justify-center">
                        <Icon icon="solar:filter-bold-duotone" className="text-violet-600 dark:text-violet-400 text-sm" />
                    </div>
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wide">Filtros</span>
                    {hayFiltrosActivos && (
                        <button
                            onClick={() => { setFiltroVendedor(null); applyPreset('mes'); }}
                            className="ml-auto flex items-center gap-1 text-[11px] font-semibold hover:opacity-80 transition-opacity"
                            style={{ color: ACCENT }}
                        >
                            <Icon icon="solar:restart-bold" className="text-xs" />
                            Limpiar filtros
                        </button>
                    )}
                </div>

                <div className="flex flex-wrap gap-3 items-end">
                    {/* Presets de período */}
                    <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1.5">Período rápido</p>
                        <div className="flex flex-wrap gap-1.5">
                            {([
                                { key: 'mes', label: 'Mes completo', icon: 'solar:calendar-bold-duotone' },
                                { key: 'q1',  label: '1ra quincena', icon: 'solar:calendar-minimalistic-bold-duotone' },
                                { key: 'q2',  label: '2da quincena', icon: 'solar:calendar-minimalistic-bold-duotone' },
                                { key: 'hoy', label: 'Hoy',          icon: 'solar:sun-bold-duotone' },
                            ] as { key: Preset; label: string; icon: string }[]).map(p => (
                                <button
                                    key={p.key}
                                    onClick={() => applyPreset(p.key)}
                                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-bold transition-all whitespace-nowrap ${
                                        preset === p.key
                                            ? 'text-white shadow-sm'
                                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                                    }`}
                                    style={preset === p.key ? { background: ACCENT } : undefined}
                                >
                                    <Icon icon={p.icon} className="text-xs" />
                                    {p.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Rango manual */}
                    <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1.5">Rango personalizado</p>
                        <div className="flex items-center gap-2">
                            <input
                                type="date"
                                value={desde}
                                min={firstDayOfMonth(mes, anio)}
                                max={hasta}
                                onChange={e => { setDesde(e.target.value); setPreset('mes'); }}
                                className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-700 dark:text-slate-200 focus:outline-none focus:border-[var(--accent)] transition-colors"
                            />
                            <Icon icon="solar:arrow-right-linear" className="text-slate-400 text-sm flex-shrink-0" />
                            <input
                                type="date"
                                value={hasta}
                                min={desde}
                                max={lastDayOfMonth(mes, anio)}
                                onChange={e => { setHasta(e.target.value); setPreset('mes'); }}
                                className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-700 dark:text-slate-200 focus:outline-none focus:border-[var(--accent)] transition-colors"
                            />
                        </div>
                    </div>

                    {/* Filtro por vendedor */}
                    {todosLosVendedores.length > 1 && (
                        <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1.5">Vendedor</p>
                            <select
                                value={filtroVendedor ?? ''}
                                onChange={e => setFiltroVendedor(e.target.value ? Number(e.target.value) : null)}
                                className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-700 dark:text-slate-200 focus:outline-none focus:border-[var(--accent)] transition-colors min-w-[160px]"
                            >
                                <option value="">Todos los vendedores</option>
                                {todosLosVendedores.map(v => (
                                    <option key={v.vendedor.id} value={v.vendedor.id}>{v.vendedor.nombre}</option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>

                {/* Resumen del período activo */}
                {hayFiltrosActivos && (
                    <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                        <Icon icon="solar:calendar-search-bold-duotone" className="text-violet-400 text-base flex-shrink-0" />
                        <span>
                            Mostrando <strong className="text-slate-700 dark:text-slate-200">{desde === hasta ? desde : `${desde} → ${hasta}`}</strong>
                            {filtroVendedor !== null && (
                                <> · vendedor: <strong style={{ color: ACCENT }}>
                                    {todosLosVendedores.find(v => v.vendedor.id === filtroVendedor)?.vendedor.nombre}
                                </strong></>
                            )}
                        </span>
                    </div>
                )}
            </div>

            {/* ── Lista vendedores ── */}
            {isLoading ? (
                <div className="space-y-3">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="bg-white dark:bg-[#111827] rounded-3xl shadow-[0_2px_20px_rgba(15,23,42,0.05)] dark:shadow-none border border-slate-100 dark:border-slate-800 p-4">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 animate-pulse flex-shrink-0" />
                                <div className="flex-1 space-y-2">
                                    <div className="h-4 w-40 rounded-lg bg-slate-100 dark:bg-slate-800 animate-pulse" />
                                    <div className="h-3 w-24 rounded-lg bg-slate-100 dark:bg-slate-800 animate-pulse" />
                                </div>
                                <div className="h-8 w-24 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
                            </div>
                        </div>
                    ))}
                </div>
            ) : !vendedoresFiltrados.length ? (
                <div className="bg-white dark:bg-[#111827] rounded-3xl p-12 shadow-[0_2px_20px_rgba(15,23,42,0.05)] dark:shadow-none border border-slate-100 dark:border-slate-800 text-center">
                    <Icon icon="solar:hand-money-linear" className="text-5xl text-slate-200 dark:text-slate-700 mx-auto mb-3" />
                    <p className="text-sm text-slate-400">
                        {hayFiltrosActivos
                            ? 'Sin comisiones para los filtros seleccionados'
                            : `Sin comisiones registradas para ${MESES[mes - 1]} ${anio}`}
                    </p>
                    {!hayFiltrosActivos && (
                        <p className="text-xs text-slate-400 mt-1">
                            Asigna comisiones por producto en Kardex → Productos → campo "Comisión por vendedor"
                        </p>
                    )}
                </div>
            ) : (
                <div className="space-y-3">
                    {vendedoresFiltrados.map((v) => {
                        const isExpanded = expandedId === v.vendedor.id;
                        const allPaid = v.totalPendiente === 0;
                        return (
                            <div key={v.vendedor.id} className="bg-white dark:bg-[#111827] rounded-3xl shadow-[0_2px_20px_rgba(15,23,42,0.05)] dark:shadow-none border border-slate-100 dark:border-slate-800 overflow-hidden">
                                {/* Vendedor row */}
                                <div className="flex items-center gap-4 p-4">
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-400 to-indigo-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                                        {v.vendedor.nombre.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-slate-700 dark:text-slate-200 truncate">{v.vendedor.nombre}</p>
                                        <p className="text-xs text-slate-400">DNI {v.vendedor.dni} · {v.cantidadVentas} ventas</p>
                                        {/* Montos visibles en móvil */}
                                        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] sm:hidden">
                                            <span className="font-bold text-slate-800 dark:text-white">{formatCurrency(v.totalComision)}</span>
                                            <span className="text-emerald-600 dark:text-emerald-400">Pag. {formatCurrency(v.totalPagado)}</span>
                                            <span className={v.totalPendiente > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400'}>Pend. {formatCurrency(v.totalPendiente)}</span>
                                        </div>
                                    </div>

                                    <div className="hidden sm:flex items-center gap-6 text-right">
                                        <div>
                                            <p className="text-[10px] text-slate-400 uppercase tracking-wide">Total</p>
                                            <p className="text-sm font-bold text-slate-800 dark:text-white">{formatCurrency(v.totalComision)}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] text-slate-400 uppercase tracking-wide">Pagado</p>
                                            <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(v.totalPagado)}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] text-slate-400 uppercase tracking-wide">Pendiente</p>
                                            <p className={`text-sm font-bold ${v.totalPendiente > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400'}`}>
                                                {formatCurrency(v.totalPendiente)}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 ml-2">
                                        {!allPaid && (
                                            <button
                                                onClick={() => marcarPagado(v.vendedor.id)}
                                                disabled={pagandoId === v.vendedor.id}
                                                className="px-3 py-1.5 text-xs font-bold rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white transition-colors disabled:opacity-50 flex items-center gap-1 shadow-sm shadow-emerald-500/30"
                                            >
                                                {pagandoId === v.vendedor.id
                                                    ? <Icon icon="mdi:loading" className="animate-spin" />
                                                    : <Icon icon="solar:check-circle-bold" />}
                                                Liquidar
                                            </button>
                                        )}
                                        {allPaid && (
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400">
                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                                Pagado
                                            </span>
                                        )}
                                        <button
                                            onClick={() => { setExpandedId(isExpanded ? null : v.vendedor.id); setDetallePage(1); }}
                                            className="h-8 w-8 grid place-items-center rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                                        >
                                            <Icon
                                                icon="solar:alt-arrow-down-linear"
                                                className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                                            />
                                        </button>
                                    </div>
                                </div>

                                {/* Detalle comisiones */}
                                {isExpanded && (
                                    <div className="border-t border-slate-100 dark:border-slate-800">
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left border-collapse">
                                                <thead>
                                                    <tr className="text-[11px] font-bold uppercase tracking-wide text-slate-400 border-b border-slate-100">
                                                        <th className="py-3 px-4 text-left">Comprobante</th>
                                                        <th className="py-3 px-4 text-left">Producto</th>
                                                        <th className="py-3 px-4 text-left">Motivo</th>
                                                        <th className="py-3 px-4 text-right">Cant.</th>
                                                        <th className="py-3 px-4 text-right">Total comprobante</th>
                                                        <th className="py-3 px-4 text-right">Comisión</th>
                                                        <th className="py-3 px-4 text-center">Estado</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {v.comisiones.slice((detallePage - 1) * DETALLE_PAGE_SIZE, detallePage * DETALLE_PAGE_SIZE).map((c) => (
                                                        <tr key={c.id} className="border-b border-slate-50 dark:border-slate-800 hover:bg-slate-50/60 dark:hover:bg-slate-800/60 transition-colors">
                                                            <td className="py-3 px-4 text-sm text-slate-600 dark:text-slate-300 font-mono">
                                                                {c.comprobante.serie}-{String(c.comprobante.correlativo).padStart(8, '0')}
                                                                <span className="text-slate-400 ml-1">
                                                                    · {new Date(c.comprobante.fechaEmision).toLocaleDateString('es-PE')}
                                                                </span>
                                                            </td>
                                                            <td className="py-3 px-4 text-sm text-slate-700 dark:text-slate-200 max-w-[200px] truncate">
                                                                {c.descripcion ?? '—'}
                                                            </td>
                                                            <td className="py-3 px-4 text-sm text-slate-500 dark:text-slate-400 max-w-[280px]">
                                                                {c.motivo ?? '—'}
                                                            </td>
                                                            <td className="py-3 px-4 text-right text-sm text-slate-600 dark:text-slate-300">{c.cantidad}</td>
                                                            <td className="py-3 px-4 text-right text-sm text-slate-600 dark:text-slate-300">
                                                                {formatCurrency(c.comprobante.mtoImpVenta)}
                                                            </td>
                                                            <td className="py-3 px-4 text-right font-bold text-slate-800 dark:text-white text-sm">
                                                                {formatCurrency(c.montoComision)}
                                                            </td>
                                                            <td className="py-3 px-4 text-center">
                                                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                                                                    c.estado === 'PAGADO'
                                                                        ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400'
                                                                        : 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400'
                                                                }`}>
                                                                    <span className={`w-1.5 h-1.5 rounded-full ${c.estado === 'PAGADO' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                                                                    {c.estado === 'PAGADO' ? 'Pagado' : 'Pendiente'}
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                        {v.comisiones.length > DETALLE_PAGE_SIZE && (() => {
                                            const totalPag = Math.ceil(v.comisiones.length / DETALLE_PAGE_SIZE);
                                            const ini = (detallePage - 1) * DETALLE_PAGE_SIZE + 1;
                                            const fin = Math.min(detallePage * DETALLE_PAGE_SIZE, v.comisiones.length);
                                            return (
                                                <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 dark:border-slate-800 text-xs">
                                                    <span className="text-slate-500 dark:text-slate-400">{ini}–{fin} de {v.comisiones.length}</span>
                                                    <div className="flex items-center gap-1.5">
                                                        <button onClick={() => setDetallePage(p => Math.max(1, p - 1))} disabled={detallePage === 1} className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 font-semibold text-slate-600 dark:text-slate-300 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">Anterior</button>
                                                        <span className="px-2 text-slate-500 dark:text-slate-400">{detallePage} / {totalPag}</span>
                                                        <button onClick={() => setDetallePage(p => Math.min(totalPag, p + 1))} disabled={detallePage === totalPag} className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 font-semibold text-slate-600 dark:text-slate-300 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">Siguiente</button>
                                                    </div>
                                                </div>
                                            );
                                        })()}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
