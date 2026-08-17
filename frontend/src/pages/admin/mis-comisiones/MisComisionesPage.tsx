import { useState, useEffect, useCallback, useMemo } from 'react';
import { Icon } from '@iconify/react';
import { motion, AnimatePresence } from 'framer-motion';
import { get } from '@/utils/fetch';
import { fadeUp, interactiveHover, listItemFadeUp, listItemHidden, listStagger } from '@/lib/motion/presets';
import { Calendar } from '@/components/Date';
import { useThemeStore, SIDEBAR_COLOR_HEX } from '@/zustand/theme';
import { useAuthStore } from '@/zustand/auth';
import ComisionesView from '@/features/admin/finanzas/comisiones/ComisionesView';
import KpiHero from '@/components/ui/KpiHero';

interface Comision {
    id: number;
    comprobante: { tipoDoc: string; serie: string; correlativo: number; fechaEmision: string };
    descripcion: string | null;
    motivo: string | null;
    cantidad: number;
    montoComision: number;
    estado: 'PENDIENTE' | 'PAGADO';
}

interface MisComisionesData {
    mes: number;
    anio: number;
    totalComision: number;
    totalPagado: number;
    totalPendiente: number;
    comisiones: Comision[];
}

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const MESES_CORTO = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

type Preset = 'mes' | 'q1' | 'q2' | 'hoy';

const PRESETS: { key: Preset; label: string; icon: string }[] = [
    { key: 'mes', label: 'Mes completo',  icon: 'solar:calendar-bold-duotone' },
    { key: 'q1',  label: '1ra Quincena',  icon: 'solar:calendar-date-bold-duotone' },
    { key: 'q2',  label: '2da Quincena',  icon: 'solar:calendar-date-bold-duotone' },
    { key: 'hoy', label: 'Hoy',           icon: 'solar:sun-bold-duotone' },
];

function toNum(v: unknown): number {
    return parseFloat(String(v ?? 0)) || 0;
}

function fmt(n: unknown) {
    return `S/ ${toNum(n).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function toISODate(d: Date) {
    return d.toISOString().slice(0, 10);
}

function firstDay(m: number, a: number) {
    return toISODate(new Date(a, m - 1, 1));
}

function lastDay(m: number, a: number) {
    return toISODate(new Date(a, m, 0));
}

function isoToDisplayDate(date: string) {
    if (!date) return '';
    const [year, month, day] = date.split('-');
    return year && month && day ? `${day}/${month}/${year}` : '';
}

function displayToISODate(date: string) {
    if (!date) return '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) return date;
    const [day, month, year] = date.split('/');
    if (!day || !month || !year) return '';
    return `${year.padStart(4, '0')}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}

function EstadoPill({ estado }: { estado: 'PENDIENTE' | 'PAGADO' }) {
    if (estado === 'PAGADO') {
        return (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Cobrado
            </span>
        );
    }
    return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> Pendiente
        </span>
    );
}

export default function MisComisionesPage() {
    const sidebarColor = useThemeStore((s) => s.sidebarColor);
    const ACCENT = SIDEBAR_COLOR_HEX[sidebarColor] ?? '#7551FF';
    const { auth } = useAuthStore();
    const isAdmin = auth?.rol === 'ADMIN_EMPRESA';
    const [vista, setVista] = useState<'mias' | 'equipo'>('mias');
    const now = new Date();
    const [mes, setMes] = useState(now.getMonth() + 1);
    const [anio, setAnio] = useState(now.getFullYear());
    const [data, setData] = useState<MisComisionesData | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    // ── Filtros ───────────────────────────────────────────────────────────────
    const [preset, setPreset] = useState<Preset>('mes');
    const [desde, setDesde] = useState(() => firstDay(now.getMonth() + 1, now.getFullYear()));
    const [hasta, setHasta] = useState(() => lastDay(now.getMonth() + 1, now.getFullYear()));

    function applyPreset(p: Preset, m = mes, a = anio) {
        setPreset(p);
        const today = toISODate(now);
        const pad = (n: number) => String(n).padStart(2, '0');
        switch (p) {
            case 'mes': setDesde(firstDay(m, a)); setHasta(lastDay(m, a)); break;
            case 'q1':  setDesde(`${a}-${pad(m)}-01`); setHasta(`${a}-${pad(m)}-15`); break;
            case 'q2':  setDesde(`${a}-${pad(m)}-16`); setHasta(lastDay(m, a)); break;
            case 'hoy': setDesde(today); setHasta(today); break;
        }
    }

    // ── Navegación mes ────────────────────────────────────────────────────────
    const esMesActual = mes === now.getMonth() + 1 && anio === now.getFullYear();

    const navegarMes = (delta: number) => {
        let m = mes + delta;
        let a = anio;
        if (m > 12) { m = 1; a++; }
        if (m < 1) { m = 12; a--; }
        setMes(m);
        setAnio(a);
        applyPreset('mes', m, a);
    };

    // ── Fetch ─────────────────────────────────────────────────────────────────
    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const res = await get<MisComisionesData>(`/comisiones/mis-comisiones?mes=${mes}&anio=${anio}`);
            setData(res.data ?? null);
        } catch {
            setData(null);
        } finally {
            setIsLoading(false);
        }
    }, [mes, anio]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleDateChange = useCallback((date: string, name: string) => {
        const isoDate = displayToISODate(date);
        if (!isoDate) return;

        setPreset('mes');
        if (name === 'desde') {
            setDesde(isoDate > hasta ? hasta : isoDate);
            return;
        }

        if (name === 'hasta') {
            setHasta(isoDate < desde ? desde : isoDate);
        }
    }, [desde, hasta]);

    // ── Datos filtrados ───────────────────────────────────────────────────────
    const comisionesFiltradas = useMemo(() => {
        if (!data?.comisiones) return [];
        return data.comisiones.filter(c => {
            const fecha = c.comprobante.fechaEmision.slice(0, 10);
            return fecha >= desde && fecha <= hasta;
        });
    }, [data, desde, hasta]);

    const totalFiltrado    = useMemo(() => comisionesFiltradas.reduce((s, c) => s + toNum(c.montoComision), 0), [comisionesFiltradas]);
    const pagadoFiltrado   = useMemo(() => comisionesFiltradas.filter(c => c.estado === 'PAGADO').reduce((s, c) => s + toNum(c.montoComision), 0), [comisionesFiltradas]);
    const pendienteFiltrado = useMemo(() => comisionesFiltradas.filter(c => c.estado === 'PENDIENTE').reduce((s, c) => s + toNum(c.montoComision), 0), [comisionesFiltradas]);

    const hayFiltros = preset !== 'mes';

    // Paginación (client-side) de la tabla de comisiones.
    const PAGE_SIZE = 15;
    const [page, setPage] = useState(1);
    useEffect(() => { setPage(1); }, [desde, hasta, mes, anio]);
    const totalPages = Math.max(1, Math.ceil(comisionesFiltradas.length / PAGE_SIZE));
    const comisionesPagina = useMemo(() => comisionesFiltradas.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [comisionesFiltradas, page]);

    const kpis = [
        {
            label: 'Total Comisión',
            value: fmt(totalFiltrado),
            icon: 'solar:hand-money-bold-duotone',
            iconBg: 'bg-violet-50 dark:bg-violet-900/20',
            iconColor: 'text-violet-600 dark:text-violet-400',
        },
        {
            label: 'Ya Cobrado',
            value: fmt(pagadoFiltrado),
            icon: 'solar:check-circle-bold-duotone',
            iconBg: 'bg-emerald-50 dark:bg-emerald-900/20',
            iconColor: 'text-emerald-600 dark:text-emerald-400',
        },
        {
            label: 'Pendiente de Cobro',
            value: fmt(pendienteFiltrado),
            icon: 'solar:clock-circle-bold-duotone',
            iconBg: 'bg-amber-50 dark:bg-amber-900/20',
            iconColor: 'text-amber-600 dark:text-amber-400',
        },
    ];

    return (
        <div className="min-h-screen -m-5 p-5 bg-[#F7F8FB] dark:bg-[#0A0D14] font-jakarta">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm text-slate-400 dark:text-gray-400 mb-5">
                <Icon icon="solar:home-smile-linear" className="text-base" />
                <span>Panel</span>
                <Icon icon="solar:alt-arrow-right-linear" className="text-xs" />
                <span>Finanzas</span>
                <Icon icon="solar:alt-arrow-right-linear" className="text-xs" />
                <span className="font-semibold" style={{ color: ACCENT }}>Comisiones</span>
            </div>

            {/* Pestañas — el admin ve además 'Del equipo' */}
            {isAdmin && (
                <div className="flex items-center gap-1 mb-5 bg-white dark:bg-slate-800 rounded-2xl p-1 w-fit shadow-[0_2px_20px_rgba(15,23,42,0.05)] dark:shadow-none">
                    {([['mias', 'Mis comisiones', 'solar:hand-money-bold-duotone'], ['equipo', 'Del equipo', 'solar:users-group-rounded-bold-duotone']] as const).map(([id, label, icon]) => (
                        <button
                            key={id}
                            onClick={() => setVista(id)}
                            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold transition-colors ${vista === id ? 'text-white' : 'text-slate-500 dark:text-gray-400 hover:text-slate-700 dark:hover:text-white'}`}
                            style={vista === id ? { background: ACCENT } : undefined}
                        >
                            <Icon icon={icon} className="text-base" />
                            {label}
                        </button>
                    ))}
                </div>
            )}

            {vista === 'equipo' ? (
                <ComisionesView />
            ) : (
            <>

            {/* Header */}
            <motion.div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-5" variants={fadeUp} initial="initial" animate="animate">
                <div className="min-w-0">
                    <h1 className="text-[22px] font-extrabold text-slate-800 dark:text-white tracking-tight">Mis Comisiones</h1>
                    <p className="text-sm text-slate-400 dark:text-gray-400 mt-0.5">Tus comisiones generadas en {MESES[mes - 1]} {anio}.</p>
                </div>

                <div className="flex items-center gap-1 bg-white dark:bg-slate-800 rounded-2xl px-2 py-2 shadow-[0_2px_20px_rgba(15,23,42,0.05)] dark:shadow-none">
                    <button
                        onClick={() => navegarMes(-1)}
                        className="h-8 w-8 grid place-items-center rounded-xl text-slate-400 dark:text-gray-400 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-slate-600 dark:hover:text-white transition-colors"
                    >
                        <Icon icon="solar:alt-arrow-left-linear" className="text-base" />
                    </button>
                    <span className="text-sm font-bold text-slate-800 dark:text-white px-3 min-w-[110px] text-center">
                        {MESES_CORTO[mes - 1]} {anio}
                    </span>
                    <button
                        onClick={() => navegarMes(1)}
                        disabled={esMesActual}
                        className="h-8 w-8 grid place-items-center rounded-xl text-slate-400 dark:text-gray-400 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-slate-600 dark:hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                        <Icon icon="solar:alt-arrow-right-linear" className="text-base" />
                    </button>
                </div>
            </motion.div>

            {/* ── Panel de filtros ── */}
            <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-[0_2px_20px_rgba(15,23,42,0.05)] dark:shadow-none px-4 py-3 mb-5">
                <div className="flex flex-wrap items-center gap-2">
                    {PRESETS.map((p) => {
                        const active = preset === p.key;
                        return (
                            <button
                                key={p.key}
                                onClick={() => applyPreset(p.key)}
                                className={`inline-flex items-center gap-1.5 h-9 px-3.5 rounded-xl text-xs font-bold transition-all ${active ? 'text-white shadow-lg shadow-violet-500/30' : 'border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-gray-400 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                                style={active ? { background: ACCENT } : undefined}
                            >
                                <Icon icon={p.icon} width={13} />
                                {p.label}
                            </button>
                        );
                    })}

                    <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto sm:ml-auto">
                        <div className="min-w-[168px] flex-1 sm:flex-none">
                            <Calendar
                                text="Desde"
                                name="desde"
                                value={isoToDisplayDate(desde)}
                                onChange={handleDateChange}
                                className="admin-date-filter admin-date-filter--compact"
                                portal
                            />
                        </div>
                        <div className="min-w-[168px] flex-1 sm:flex-none">
                            <Calendar
                                text="Hasta"
                                name="hasta"
                                value={isoToDisplayDate(hasta)}
                                onChange={handleDateChange}
                                className="admin-date-filter admin-date-filter--compact"
                                portal
                            />
                        </div>
                        {hayFiltros && (
                            <button
                                onClick={() => applyPreset('mes')}
                                className="inline-flex items-center gap-1 h-9 px-2.5 rounded-xl text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                                style={{ color: ACCENT }}
                            >
                                <Icon icon="solar:restart-linear" width={13} />
                                Limpiar
                            </button>
                        )}
                    </div>
                </div>

                <AnimatePresence>
                    {hayFiltros && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-700 flex items-center gap-1.5"
                        >
                            <Icon icon="solar:calendar-search-bold-duotone" className="text-sm" style={{ color: ACCENT }} />
                            <span className="text-xs text-slate-400 dark:text-gray-400">
                                Mostrando <strong className="text-slate-700 dark:text-slate-200">{comisionesFiltradas.length}</strong> registro{comisionesFiltradas.length !== 1 ? 's' : ''} del período <strong style={{ color: ACCENT }}>{desde === hasta ? desde : `${desde} → ${hasta}`}</strong>
                            </span>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* KPI Cards — diseño hero del dashboard */}
            <KpiHero
                className="mb-5"
                loading={isLoading}
                cards={kpis.map((kpi) => ({ label: kpi.label, value: kpi.value }))}
            />

            {/* Card contenedora de la tabla */}
            <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-[0_2px_20px_rgba(15,23,42,0.05)] dark:shadow-none overflow-hidden">
                {/* Toolbar */}
                <div className="flex flex-wrap items-center gap-2.5 p-4 border-b border-slate-100 dark:border-slate-700">
                    <button onClick={fetchData} className="h-9 px-3.5 rounded-xl border-2 text-sm font-bold flex items-center gap-1.5 transition-colors"
                        style={{ borderColor: `${ACCENT}55`, color: ACCENT }}>
                        <Icon icon="solar:refresh-linear" className={isLoading ? 'animate-spin' : ''} /> Actualizar
                    </button>
                    <span className="text-sm text-slate-400 dark:text-gray-400 font-medium px-1">
                        {comisionesFiltradas.length.toLocaleString('es-PE')} registro{comisionesFiltradas.length !== 1 ? 's' : ''}
                    </span>
                </div>

                {/* Tabla */}
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[720px]">
                        <thead>
                            <tr className="text-[11px] font-bold uppercase tracking-wide text-slate-400 dark:text-gray-400 border-b border-slate-100 dark:border-slate-700">
                                <th className="py-3 pl-5 pr-3">Comprobante</th>
                                <th className="py-3 px-3">Fecha</th>
                                <th className="py-3 px-3">Producto</th>
                                <th className="py-3 px-3">Motivo</th>
                                <th className="py-3 px-3">Cant.</th>
                                <th className="py-3 px-3">Comisión</th>
                                <th className="py-3 px-3 pr-5">Estado</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                Array.from({ length: 6 }).map((_, i) => (
                                    <tr key={i} className="border-b border-slate-50 dark:border-slate-700">
                                        <td colSpan={6} className="py-3.5 px-5">
                                            <div className="h-6 rounded-lg bg-slate-100 dark:bg-slate-700 animate-pulse" />
                                        </td>
                                    </tr>
                                ))
                            ) : comisionesFiltradas.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="py-16 text-center">
                                        <Icon icon="solar:hand-money-linear" className="text-5xl text-slate-200 dark:text-gray-600 mx-auto mb-3" />
                                        <p className="text-sm font-semibold text-slate-500 dark:text-gray-400">
                                            {hayFiltros ? 'Sin resultados para el período seleccionado' : `Sin comisiones para ${MESES[mes - 1]} ${anio}`}
                                        </p>
                                        <p className="text-xs text-slate-400 dark:text-gray-400 mt-1">
                                            {hayFiltros ? 'Prueba con otro rango de fechas' : 'Las comisiones se generan automáticamente al registrar ventas'}
                                        </p>
                                    </td>
                                </tr>
                            ) : comisionesPagina.map((c) => (
                                <tr key={c.id} className="border-b border-slate-50 dark:border-slate-700 hover:bg-slate-50/60 dark:hover:bg-slate-800/50 transition-colors">
                                    <td className="py-3 pl-5 pr-3">
                                        <span className="font-mono text-sm text-slate-600 dark:text-gray-400">
                                            {c.comprobante.serie}-{String(c.comprobante.correlativo).padStart(8, '0')}
                                        </span>
                                    </td>
                                    <td className="py-3 px-3 text-sm text-slate-500 dark:text-gray-400">
                                        {new Date(c.comprobante.fechaEmision).toLocaleDateString('es-PE')}
                                    </td>
                                    <td className="py-3 px-3 text-sm text-slate-600 dark:text-gray-400 truncate max-w-[240px]">
                                        {c.descripcion ?? '—'}
                                    </td>
                                    <td className="py-3 px-3 text-sm text-slate-500 dark:text-gray-400 max-w-[280px]">
                                        {c.motivo ?? '—'}
                                    </td>
                                    <td className="py-3 px-3">
                                        <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400">{c.cantidad}</span>
                                    </td>
                                    <td className="py-3 px-3 font-bold text-slate-800 dark:text-white text-sm">{fmt(c.montoComision)}</td>
                                    <td className="py-3 px-3 pr-5"><EstadoPill estado={c.estado} /></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Paginación */}
                {!isLoading && comisionesFiltradas.length > PAGE_SIZE && (
                    <div className="flex items-center justify-between gap-3 px-4 py-3 border-t border-slate-100 dark:border-slate-700 text-xs">
                        <span className="text-slate-500 dark:text-slate-400">
                            {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, comisionesFiltradas.length)} de {comisionesFiltradas.length}
                        </span>
                        <div className="flex items-center gap-1.5">
                            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 font-semibold text-slate-600 dark:text-slate-300 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">Anterior</button>
                            <span className="px-2 text-slate-500 dark:text-slate-400">{page} / {totalPages}</span>
                            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 font-semibold text-slate-600 dark:text-slate-300 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">Siguiente</button>
                        </div>
                    </div>
                )}

                {/* Footer total */}
                {!isLoading && comisionesFiltradas.length > 0 && (
                    <div className="flex items-center justify-between gap-3 p-4 border-t border-slate-100 dark:border-slate-700">
                        <span className="text-sm text-slate-400 dark:text-gray-400 font-medium">
                            {comisionesFiltradas.length} registro{comisionesFiltradas.length !== 1 ? 's' : ''}
                        </span>
                        <span className="text-sm font-extrabold" style={{ color: ACCENT }}>
                            Total: {fmt(totalFiltrado)}
                        </span>
                    </div>
                )}
            </div>
            </>
            )}
        </div>
    );
}
