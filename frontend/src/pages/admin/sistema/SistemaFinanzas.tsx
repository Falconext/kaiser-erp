import React from 'react';
import { Icon } from '@iconify/react';
import {
    AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell,
} from 'recharts';
import {
    useSistemaFinanzasViewModel,
    CATEGORIAS_GASTO,
    CATEGORIAS_INGRESO,
} from '@/features/admin/sistema/useSistemaFinanzasViewModel';
import { Calendar } from '@/components/Date';
import Select from '@/components/Select';
import { useThemeStore, SIDEBAR_COLOR_HEX } from '@/zustand/theme';

// ── helpers ────────────────────────────────────────────────────────────────────

const toDisplay = (iso: string) => {
    if (!iso) return '';
    const [y, m, d] = iso.split('-');
    if (!y || !m || !d) return '';
    return `${d}/${m}/${y}`;
};

const toISO = (display: string) => {
    if (!display || display.length < 10) return '';
    const parts = display.split('/');
    if (parts.length !== 3) return '';
    const [d, m, y] = parts;
    return `${y}-${m}-${d}`;
};

const PERIODICIDAD_OPS = [
    { id: 'MENSUAL', value: 'Mensual' },
    { id: 'ANUAL', value: 'Anual' },
];

const fmt = (n: number) =>
    `S/ ${Number(n || 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const pct = (n: number) => `${Number(n || 0).toFixed(1)}%`;

const catInfo = (value: string) =>
    CATEGORIAS_GASTO.find((c) => c.value === value) ?? CATEGORIAS_GASTO[CATEGORIAS_GASTO.length - 1];

const tipoInfo = (value: string) =>
    CATEGORIAS_INGRESO.find((c) => c.value === value) ?? CATEGORIAS_INGRESO[CATEGORIAS_INGRESO.length - 1];

// ── KPI card ───────────────────────────────────────────────────────────────────

function KpiCard({
    label, value, sub, icon, color, trend, trendLabel,
}: {
    label: string; value: string; sub?: string;
    icon: string; color: string; trend?: number; trendLabel?: string;
}) {
    const up = (trend ?? 0) >= 0;
    return (
        <div className="bg-white dark:bg-[#111827] rounded-3xl border border-slate-100 dark:border-slate-800 p-5 shadow-[0_2px_20px_rgba(15,23,42,0.05)] dark:shadow-none">
            <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">{label}</span>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: color + '20' }}>
                    <Icon icon={icon} width={20} style={{ color }} />
                </div>
            </div>
            <p className="text-2xl font-extrabold text-slate-800 dark:text-white leading-none mb-1">{value}</p>
            {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
            {trend !== undefined && (
                <div className={`flex items-center gap-1 mt-2 text-xs font-semibold ${up ? 'text-emerald-600' : 'text-rose-500'}`}>
                    <Icon icon={up ? 'solar:arrow-up-bold' : 'solar:arrow-down-bold'} width={12} />
                    {pct(Math.abs(trend))} {trendLabel}
                </div>
            )}
        </div>
    );
}

// ── Tooltip personalizado ─────────────────────────────────────────────────────

function CustomTooltip({ active, payload, label }: any) {
    if (!active || !payload?.length) return null;
    return (
        <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl shadow-xl p-3 text-[13px] font-inter min-w-[160px]">
            <p className="font-bold text-slate-700 dark:text-slate-200 mb-2">{label}</p>
            {payload.map((p: any) => (
                <div key={p.name} className="flex items-center justify-between gap-4">
                    <span style={{ color: p.color }} className="font-semibold">{p.name}</span>
                    <span className="font-bold text-slate-800 dark:text-white">{fmt(p.value)}</span>
                </div>
            ))}
        </div>
    );
}

// ── Modal Gasto ────────────────────────────────────────────────────────────────

function ModalGasto({ vm }: { vm: ReturnType<typeof useSistemaFinanzasViewModel> }) {
    const sidebarColor = useThemeStore((s) => s.sidebarColor);
    const ACCENT = SIDEBAR_COLOR_HEX[sidebarColor] ?? '#7551FF';
    if (!vm.showModal) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/40" onClick={() => vm.setShowModal(false)} />
            <div className="relative bg-white dark:bg-[#111827] rounded-3xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
                    <h3 className="text-base font-bold text-slate-800 dark:text-white">
                        {vm.editingId ? 'Editar gasto' : 'Registrar gasto'}
                    </h3>
                    <button onClick={() => vm.setShowModal(false)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400">
                        <Icon icon="solar:close-bold" width={18} />
                    </button>
                </div>
                <div className="p-6 space-y-4">
                    {/* Concepto */}
                    <div>
                        <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1 block">Concepto *</label>
                        <input
                            type="text"
                            value={vm.form.concepto}
                            onChange={(e) => vm.setFormField('concepto', e.target.value)}
                            placeholder="ej. Servidor AWS, Dominio, etc."
                            className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/40"
                        />
                    </div>

                    {/* Categoría + Monto */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <Select
                            label="Categoría *"
                            name="categoria"
                            options={CATEGORIAS_GASTO.map((c) => ({ id: c.value, value: c.label }))}
                            value={CATEGORIAS_GASTO.find((c) => c.value === vm.form.categoria)?.label ?? ''}
                            onChange={(id: any) => vm.setFormField('categoria', id)}
                            error=""
                            readOnly
                        />
                        <div>
                            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1 block">Monto (S/) *</label>
                            <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={vm.form.monto}
                                onChange={(e) => vm.setFormField('monto', e.target.value)}
                                placeholder="0.00"
                                className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/40"
                            />
                        </div>
                    </div>

                    {/* Fecha */}
                    <Calendar
                        text="Fecha *"
                        name="fecha"
                        value={toDisplay(vm.form.fecha)}
                        onChange={(v: string) => vm.setFormField('fecha', toISO(v))}
                    />

                    {/* Recurrente */}
                    <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                        <button
                            type="button"
                            onClick={() => vm.setFormField('recurrente', !vm.form.recurrente)}
                            className={`w-11 h-6 rounded-full transition-colors relative flex-shrink-0 ${vm.form.recurrente ? 'bg-[var(--accent)]' : 'bg-slate-300 dark:bg-slate-600'}`}
                        >
                            <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${vm.form.recurrente ? 'translate-x-5' : 'translate-x-0.5'}`} />
                        </button>
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Gasto recurrente</span>
                        {vm.form.recurrente && (
                            <div className="ml-auto w-40">
                                <Select
                                    label="Periodicidad"
                                    name="periodicidad"
                                    options={PERIODICIDAD_OPS}
                                    value={PERIODICIDAD_OPS.find((o) => o.id === vm.form.periodicidad)?.value ?? ''}
                                    onChange={(id: any) => vm.setFormField('periodicidad', id)}
                                    error=""
                                    readOnly
                                />
                            </div>
                        )}
                    </div>

                    {/* Descripción */}
                    <div>
                        <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1 block">Descripción (opcional)</label>
                        <textarea
                            value={vm.form.descripcion}
                            onChange={(e) => vm.setFormField('descripcion', e.target.value)}
                            rows={2}
                            placeholder="Notas adicionales..."
                            className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/40 resize-none"
                        />
                    </div>
                </div>
                <div className="flex justify-end gap-2 px-6 py-4 border-t border-slate-100 dark:border-slate-800">
                    <button onClick={() => vm.setShowModal(false)} className="px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                        Cancelar
                    </button>
                    <button
                        onClick={vm.guardarGasto}
                        disabled={vm.guardando}
                        className="px-5 py-2 text-sm font-bold text-white rounded-xl hover:brightness-105 transition-all disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-violet-500/30"
                        style={{ background: ACCENT }}
                    >
                        {vm.guardando && <Icon icon="eos-icons:loading" width={16} />}
                        {vm.editingId ? 'Actualizar' : 'Registrar'}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ── Modal Ingreso ─────────────────────────────────────────────────────────────

function ModalIngreso({ vm }: { vm: ReturnType<typeof useSistemaFinanzasViewModel> }) {
    if (!vm.showModalIngreso) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/40" onClick={() => vm.setShowModalIngreso(false)} />
            <div className="relative bg-white dark:bg-[#111827] rounded-3xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
                    <h3 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2">
                        <Icon icon="solar:wallet-money-bold-duotone" width={20} className="text-emerald-500" />
                        {vm.editingIdIngreso ? 'Editar ingreso' : 'Registrar ingreso'}
                    </h3>
                    <button onClick={() => vm.setShowModalIngreso(false)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400">
                        <Icon icon="solar:close-bold" width={18} />
                    </button>
                </div>
                <div className="p-6 space-y-4">
                    {/* Concepto */}
                    <div>
                        <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1 block">Concepto *</label>
                        <input
                            type="text"
                            value={vm.formIngreso.concepto}
                            onChange={(e) => vm.setFormIngresoField('concepto', e.target.value)}
                            placeholder="ej. Pago mensualidad Empresa X, Activación plan Pro..."
                            className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                        />
                    </div>

                    {/* Tipo + Monto */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <Select
                            label="Tipo *"
                            name="tipo"
                            options={CATEGORIAS_INGRESO.map((c) => ({ id: c.value, value: c.label }))}
                            value={CATEGORIAS_INGRESO.find((c) => c.value === vm.formIngreso.tipo)?.label ?? ''}
                            onChange={(id: any) => vm.setFormIngresoField('tipo', id)}
                            error=""
                            readOnly
                        />
                        <div>
                            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1 block">Monto (S/) *</label>
                            <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={vm.formIngreso.monto}
                                onChange={(e) => vm.setFormIngresoField('monto', e.target.value)}
                                placeholder="0.00"
                                className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                            />
                        </div>
                    </div>

                    {/* Fecha */}
                    <Calendar
                        text="Fecha *"
                        name="fechaIngreso"
                        value={toDisplay(vm.formIngreso.fecha)}
                        onChange={(v: string) => vm.setFormIngresoField('fecha', toISO(v))}
                    />

                    {/* Descripción */}
                    <div>
                        <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1 block">Descripción (opcional)</label>
                        <textarea
                            value={vm.formIngreso.descripcion}
                            onChange={(e) => vm.setFormIngresoField('descripcion', e.target.value)}
                            rows={2}
                            placeholder="Notas adicionales..."
                            className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/40 resize-none"
                        />
                    </div>
                </div>
                <div className="flex justify-end gap-2 px-6 py-4 border-t border-slate-100 dark:border-slate-800">
                    <button onClick={() => vm.setShowModalIngreso(false)} className="px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                        Cancelar
                    </button>
                    <button
                        onClick={vm.guardarIngreso}
                        disabled={vm.guardando}
                        className="px-5 py-2 text-sm font-bold text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 transition-colors disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-emerald-500/30"
                    >
                        {vm.guardando && <Icon icon="eos-icons:loading" width={16} />}
                        {vm.editingIdIngreso ? 'Actualizar' : 'Registrar'}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ── Tab: Dashboard ─────────────────────────────────────────────────────────────

function TabDashboard({ vm }: { vm: ReturnType<typeof useSistemaFinanzasViewModel> }) {
    const sidebarColor = useThemeStore((s) => s.sidebarColor);
    const ACCENT = SIDEBAR_COLOR_HEX[sidebarColor] ?? '#7551FF';
    const d = vm.dashboard;
    if (vm.loadingDash || !d) {
        return (
            <div className="flex items-center justify-center h-64">
                <Icon icon="eos-icons:loading" className="w-10 h-10" style={{ color: ACCENT }} />
            </div>
        );
    }

    const pieData = (d.distribucionPlanes ?? []).map((p: any) => ({ name: p.nombre, value: p.count }));
    const COLORS = ['#7551FF', '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

    const gananciaPositiva = d.gananciaNetaMes >= 0;

    return (
        <div className="space-y-6">
            {/* KPIs row 1 */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <KpiCard
                    label="MRR (Ingreso Mensual Recurrente)"
                    value={fmt(d.mrr)}
                    sub={`ARR: ${fmt(d.arr)}`}
                    icon="solar:chart-2-bold-duotone"
                    color={ACCENT}
                />
                <KpiCard
                    label="Ingresos este mes"
                    value={fmt(d.ingMes)}
                    sub={`Año: ${fmt(d.ingAnio)}`}
                    icon="solar:wallet-money-bold-duotone"
                    color="#10B981"
                    trend={d.ingMes > 0 ? ((d.ingMes - d.mrr) / d.mrr) * 100 : undefined}
                    trendLabel="vs MRR objetivo"
                />
                <KpiCard
                    label="Gastos este mes"
                    value={fmt(d.gastMes)}
                    sub={`Año: ${fmt(d.gastAnio)}`}
                    icon="solar:card-bold-duotone"
                    color="#EF4444"
                />
                <KpiCard
                    label="Ganancia neta"
                    value={fmt(d.gananciaNetaMes)}
                    sub={`Margen: ${pct(d.margenMes)}`}
                    icon={gananciaPositiva ? 'solar:arrow-up-bold-duotone' : 'solar:arrow-down-bold-duotone'}
                    color={gananciaPositiva ? '#10B981' : '#EF4444'}
                />
            </div>

            {/* KPIs row 2 */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <KpiCard
                    label="Empresas activas"
                    value={String(d.totalActivos ?? 0)}
                    sub={`${d.totalInactivos ?? 0} inactivas`}
                    icon="solar:buildings-2-bold-duotone"
                    color="#3B82F6"
                />
                <KpiCard
                    label="Nuevas este mes"
                    value={String(d.nuevosEsteMes ?? 0)}
                    sub={`Mes anterior: ${d.nuevosMesAnterior ?? 0}`}
                    icon="solar:user-plus-bold-duotone"
                    color="#10B981"
                    trend={d.crecimientoClientes}
                    trendLabel="vs mes ant."
                />
                <KpiCard
                    label="Vencen en 7 días"
                    value={String(d.proximasVencer ?? 0)}
                    sub="Requieren renovación"
                    icon="solar:calendar-bold-duotone"
                    color="#F59E0B"
                />
                <KpiCard
                    label="Cobros fallidos"
                    value={String(d.rechazadosMes?.count ?? 0)}
                    sub={fmt(d.rechazadosMes?.monto ?? 0)}
                    icon="solar:close-circle-bold-duotone"
                    color="#EF4444"
                />
            </div>

            {/* Charts row */}
            <div className="grid lg:grid-cols-3 gap-5">
                {/* Area chart ingresos vs gastos */}
                <div className="lg:col-span-2 bg-white dark:bg-[#111827] rounded-3xl border border-slate-100 dark:border-slate-800 p-5 shadow-[0_2px_20px_rgba(15,23,42,0.05)] dark:shadow-none">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-bold text-slate-800 dark:text-white">Ingresos vs Gastos</h3>
                        <div className="flex gap-1">
                            {[6, 12].map((m) => (
                                <button
                                    key={m}
                                    onClick={() => vm.setMesesTendencia(m)}
                                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${vm.mesesTendencia === m ? 'text-white' : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                                    style={vm.mesesTendencia === m ? { background: ACCENT } : undefined}
                                >
                                    {m}M
                                </button>
                            ))}
                        </div>
                    </div>
                    <ResponsiveContainer width="100%" height={240}>
                        <AreaChart data={vm.tendencia} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                            <defs>
                                <linearGradient id="gIng" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={ACCENT} stopOpacity={0.3} />
                                    <stop offset="95%" stopColor={ACCENT} stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="gGas" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#EF4444" stopOpacity={0.2} />
                                    <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                            <XAxis dataKey="mes" tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} tickFormatter={(v) => `S/${(v / 1000).toFixed(0)}k`} />
                            <Tooltip content={<CustomTooltip />} />
                            <Legend wrapperStyle={{ fontSize: 12 }} />
                            <Area type="monotone" dataKey="ingresos" name="Ingresos" stroke={ACCENT} strokeWidth={2.5} fill="url(#gIng)" />
                            <Area type="monotone" dataKey="gastos" name="Gastos" stroke="#EF4444" strokeWidth={2} strokeDasharray="4 3" fill="url(#gGas)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>

                {/* Pie distribución planes */}
                <div className="bg-white dark:bg-[#111827] rounded-3xl border border-slate-100 dark:border-slate-800 p-5 shadow-[0_2px_20px_rgba(15,23,42,0.05)] dark:shadow-none">
                    <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-4">Clientes por plan</h3>
                    {pieData.length > 0 ? (
                        <>
                            <ResponsiveContainer width="100%" height={160}>
                                <PieChart>
                                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={72} paddingAngle={3} dataKey="value">
                                        {pieData.map((_: any, i: number) => (
                                            <Cell key={i} fill={COLORS[i % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip formatter={(v: number) => [`${v} empresas`, '']} />
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="space-y-1.5 mt-2">
                                {pieData.map((p: any, i: number) => (
                                    <div key={p.name} className="flex items-center gap-2">
                                        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                                        <span className="text-xs text-slate-500 flex-1 truncate">{p.name}</span>
                                        <span className="text-xs font-bold text-slate-800 dark:text-white">{p.value}</span>
                                    </div>
                                ))}
                            </div>
                        </>
                    ) : (
                        <div className="flex items-center justify-center h-40 text-slate-400 text-sm">Sin datos</div>
                    )}
                </div>
            </div>

            {/* Ganancia neta mensual bar */}
            <div className="bg-white dark:bg-[#111827] rounded-3xl border border-slate-100 dark:border-slate-800 p-5 shadow-[0_2px_20px_rgba(15,23,42,0.05)] dark:shadow-none">
                <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-4">Ganancia neta mensual</h3>
                <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={vm.tendencia} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                        <XAxis dataKey="mes" tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} tickFormatter={(v) => `S/${(v / 1000).toFixed(0)}k`} />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="ganancia" name="Ganancia" radius={[6, 6, 0, 0]}>
                            {vm.tendencia.map((entry: any, i: number) => (
                                <Cell key={i} fill={entry.ganancia >= 0 ? '#10B981' : '#EF4444'} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}

// ── Tab: Movimientos (tabla ingresos arriba, tabla gastos abajo) ───────────────

function TabMovimientos({ vm }: { vm: ReturnType<typeof useSistemaFinanzasViewModel> }) {
    const sidebarColor = useThemeStore((s) => s.sidebarColor);
    const ACCENT = SIDEBAR_COLOR_HEX[sidebarColor] ?? '#7551FF';
    const balance = vm.totalIngresos - vm.totalGastos;

    return (
        <div className="space-y-6">

            {/* ── Filtros compartidos ── */}
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center bg-white dark:bg-[#111827] rounded-3xl border border-slate-100 dark:border-slate-800 px-4 py-3 shadow-[0_2px_20px_rgba(15,23,42,0.05)] dark:shadow-none">
                <div className="flex items-center gap-2 flex-1 flex-wrap">
                    <div className="w-40">
                        <Calendar
                            text="Desde"
                            name="filtroDesde"
                            value={toDisplay(vm.filtroDesde)}
                            onChange={(v: string) => vm.setFiltroDesde(toISO(v))}
                        />
                    </div>
                    <span className="text-slate-400 text-sm">—</span>
                    <div className="w-40">
                        <Calendar
                            text="Hasta"
                            name="filtroHasta"
                            value={toDisplay(vm.filtroHasta)}
                            onChange={(v: string) => vm.setFiltroHasta(toISO(v))}
                        />
                    </div>
                    <button
                        onClick={() => { vm.cargarIngresos(); vm.cargarGastos(); }}
                        className="h-9 px-3.5 rounded-xl border-2 text-sm font-bold flex items-center gap-1.5 transition-colors"
                        style={{ borderColor: `${ACCENT}55`, color: ACCENT }}
                        title="Actualizar"
                    >
                        <Icon icon="solar:refresh-linear" width={16} /> Actualizar
                    </button>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={vm.abrirNuevoIngreso}
                        className="flex items-center gap-2 h-11 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-sm font-bold shadow-lg shadow-emerald-500/30 transition-colors"
                    >
                        <Icon icon="solar:add-circle-bold" width={18} />
                        Registrar ingreso
                    </button>
                    <button
                        onClick={vm.abrirNuevo}
                        className="flex items-center gap-2 h-11 px-4 text-white rounded-2xl text-sm font-bold shadow-lg shadow-violet-500/30 hover:brightness-105 transition-all"
                        style={{ background: ACCENT }}
                    >
                        <Icon icon="solar:add-circle-bold" width={18} />
                        Registrar gasto
                    </button>
                </div>
            </div>

            {/* ── Tarjetas resumen ── */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="flex items-center justify-between px-4 py-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl border border-emerald-100 dark:border-emerald-900/40">
                    <span className="text-sm font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
                        <Icon icon="solar:wallet-money-bold-duotone" width={18} /> Total ingresos
                    </span>
                    <span className="text-lg font-extrabold text-emerald-700 dark:text-emerald-300">{fmt(vm.totalIngresos)}</span>
                </div>
                <div className="flex items-center justify-between px-4 py-3 bg-rose-50 dark:bg-rose-900/20 rounded-2xl border border-rose-100 dark:border-rose-900/40">
                    <span className="text-sm font-bold text-rose-600 dark:text-rose-300 flex items-center gap-2">
                        <Icon icon="solar:card-bold-duotone" width={18} /> Total gastos
                    </span>
                    <span className="text-lg font-extrabold text-rose-600 dark:text-rose-300">{fmt(vm.totalGastos)}</span>
                </div>
                <div className={`flex items-center justify-between px-4 py-3 rounded-2xl border ${balance >= 0 ? 'bg-blue-50 border-blue-100 dark:bg-blue-900/20 dark:border-blue-900/40' : 'bg-amber-50 border-amber-100 dark:bg-amber-900/20 dark:border-amber-900/40'}`}>
                    <span className={`text-sm font-bold flex items-center gap-2 ${balance >= 0 ? 'text-blue-700 dark:text-blue-300' : 'text-amber-700 dark:text-amber-300'}`}>
                        <Icon icon={balance >= 0 ? 'solar:graph-up-bold-duotone' : 'solar:graph-down-bold-duotone'} width={18} /> Balance neto
                    </span>
                    <span className={`text-lg font-extrabold ${balance >= 0 ? 'text-blue-700 dark:text-blue-300' : 'text-amber-700 dark:text-amber-300'}`}>{fmt(balance)}</span>
                </div>
            </div>

            {/* ── Tabla Ingresos ── */}
            <div className="bg-white dark:bg-[#111827] rounded-3xl border border-slate-100 dark:border-slate-800 shadow-[0_2px_20px_rgba(15,23,42,0.05)] dark:shadow-none overflow-hidden">
                <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 bg-emerald-50/50">
                    <h3 className="text-sm font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
                        <Icon icon="solar:wallet-money-bold-duotone" width={17} /> Ingresos
                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-extrabold">{vm.ingresos.length}</span>
                    </h3>
                    <Select
                        label=""
                        name="filtroTipo"
                        options={[{ id: '', value: 'Todos los tipos' }, ...CATEGORIAS_INGRESO.map((c) => ({ id: c.value, value: c.label }))]}
                        value={vm.filtroTipoIngreso ? (CATEGORIAS_INGRESO.find((c) => c.value === vm.filtroTipoIngreso)?.label ?? '') : 'Todos los tipos'}
                        onChange={(id: any) => vm.setFiltroTipoIngreso(id)}
                        error=""
                        readOnly
                    />
                </div>
                {vm.loadingIngresos ? (
                    <div className="p-4 space-y-2">
                        {Array.from({ length: 4 }).map((_, i) => (
                            <div key={i} className="h-10 rounded-lg bg-slate-100 animate-pulse" />
                        ))}
                    </div>
                ) : vm.ingresos.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-slate-400">
                        <Icon icon="solar:wallet-money-linear" width={44} className="mb-2 text-slate-200" />
                        <p className="text-sm font-semibold">No hay ingresos en este período</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left border-collapse">
                            <thead>
                                <tr className="text-[11px] font-bold uppercase tracking-wide text-slate-400 border-b border-slate-100">
                                    <th className="text-left px-5 py-3">Fecha</th>
                                    <th className="text-left px-5 py-3">Concepto</th>
                                    <th className="text-left px-5 py-3">Tipo</th>
                                    <th className="text-right px-5 py-3">Monto</th>
                                    <th className="px-5 py-3" />
                                </tr>
                            </thead>
                            <tbody>
                                {vm.ingresos.map((ing) => {
                                    const tipo = tipoInfo(ing.tipo);
                                    return (
                                        <tr key={ing.id} className="border-b border-slate-50 hover:bg-slate-50/60 transition-colors">
                                            <td className="px-5 py-3.5 text-slate-500 whitespace-nowrap">{new Date(ing.fecha).toLocaleDateString('es-PE')}</td>
                                            <td className="px-5 py-3.5">
                                                <p className="font-semibold text-slate-700">{ing.concepto}</p>
                                                {ing.descripcion && <p className="text-xs text-slate-400 mt-0.5">{ing.descripcion}</p>}
                                            </td>
                                            <td className="px-5 py-3.5">
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold" style={{ backgroundColor: tipo.color + '18', color: tipo.color }}>
                                                    <Icon icon={tipo.icon} width={12} />{tipo.label}
                                                </span>
                                            </td>
                                            <td className="px-5 py-3.5 text-right font-bold text-emerald-600 whitespace-nowrap">{fmt(ing.monto)}</td>
                                            <td className="px-5 py-3.5">
                                                <div className="flex items-center gap-1 justify-end">
                                                    <button onClick={() => vm.abrirEditarIngreso(ing)} className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-500 transition-colors"><Icon icon="solar:pen-bold" width={15} /></button>
                                                    <button onClick={() => vm.eliminarIngreso(ing.id)} className="p-1.5 rounded-lg hover:bg-rose-50 text-rose-500 transition-colors"><Icon icon="solar:trash-bin-trash-bold" width={15} /></button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* ── Tabla Gastos ── */}
            <div className="bg-white dark:bg-[#111827] rounded-3xl border border-slate-100 dark:border-slate-800 shadow-[0_2px_20px_rgba(15,23,42,0.05)] dark:shadow-none overflow-hidden">
                <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 bg-violet-50/50">
                    <h3 className="text-sm font-bold text-violet-700 flex items-center gap-2">
                        <Icon icon="solar:card-bold-duotone" width={17} /> Gastos
                        <span className="px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 text-xs font-extrabold">{vm.gastos.length}</span>
                    </h3>
                    <Select
                        label=""
                        name="filtroCategoria"
                        options={[{ id: '', value: 'Todas las categorías' }, ...CATEGORIAS_GASTO.map((c) => ({ id: c.value, value: c.label }))]}
                        value={vm.filtroCategoria ? (CATEGORIAS_GASTO.find((c) => c.value === vm.filtroCategoria)?.label ?? '') : 'Todas las categorías'}
                        onChange={(id: any) => vm.setFiltroCategoria(id)}
                        error=""
                        readOnly
                    />
                </div>
                {vm.loadingGastos ? (
                    <div className="p-4 space-y-2">
                        {Array.from({ length: 4 }).map((_, i) => (
                            <div key={i} className="h-10 rounded-lg bg-slate-100 animate-pulse" />
                        ))}
                    </div>
                ) : vm.gastos.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-slate-400">
                        <Icon icon="solar:card-search-linear" width={44} className="mb-2 text-slate-200" />
                        <p className="text-sm font-semibold">No hay gastos en este período</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left border-collapse">
                            <thead>
                                <tr className="text-[11px] font-bold uppercase tracking-wide text-slate-400 border-b border-slate-100">
                                    <th className="text-left px-5 py-3">Fecha</th>
                                    <th className="text-left px-5 py-3">Concepto</th>
                                    <th className="text-left px-5 py-3">Categoría</th>
                                    <th className="text-right px-5 py-3">Monto</th>
                                    <th className="text-center px-5 py-3">Recurrente</th>
                                    <th className="px-5 py-3" />
                                </tr>
                            </thead>
                            <tbody>
                                {vm.gastos.map((g) => {
                                    const cat = catInfo(g.categoria);
                                    return (
                                        <tr key={g.id} className="border-b border-slate-50 hover:bg-slate-50/60 transition-colors">
                                            <td className="px-5 py-3.5 text-slate-500 whitespace-nowrap">{new Date(g.fecha).toLocaleDateString('es-PE')}</td>
                                            <td className="px-5 py-3.5">
                                                <p className="font-semibold text-slate-700">{g.concepto}</p>
                                                {g.descripcion && <p className="text-xs text-slate-400 mt-0.5">{g.descripcion}</p>}
                                            </td>
                                            <td className="px-5 py-3.5">
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold" style={{ backgroundColor: cat.color + '18', color: cat.color }}>
                                                    <Icon icon={cat.icon} width={12} />{cat.label}
                                                </span>
                                            </td>
                                            <td className="px-5 py-3.5 text-right font-bold text-rose-600 whitespace-nowrap">{fmt(g.monto)}</td>
                                            <td className="px-5 py-3.5 text-center">
                                                {g.recurrente ? (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-violet-50 text-violet-600">
                                                        <Icon icon="solar:refresh-circle-bold" width={12} />{g.periodicidad ?? 'Mensual'}
                                                    </span>
                                                ) : <span className="text-xs text-slate-300">—</span>}
                                            </td>
                                            <td className="px-5 py-3.5">
                                                <div className="flex items-center gap-1 justify-end">
                                                    <button onClick={() => vm.abrirEditar(g)} className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-500 transition-colors"><Icon icon="solar:pen-bold" width={15} /></button>
                                                    <button onClick={() => vm.eliminarGasto(g.id)} className="p-1.5 rounded-lg hover:bg-rose-50 text-rose-500 transition-colors"><Icon icon="solar:trash-bin-trash-bold" width={15} /></button>
                                                </div>
                                            </td>
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

// ── Tab: Clientes ──────────────────────────────────────────────────────────────

function TabClientes({ vm }: { vm: ReturnType<typeof useSistemaFinanzasViewModel> }) {
    const sidebarColor = useThemeStore((s) => s.sidebarColor);
    const ACCENT = SIDEBAR_COLOR_HEX[sidebarColor] ?? '#7551FF';
    if (vm.loadingDash || !vm.dashboard) {
        return <div className="flex items-center justify-center h-64"><Icon icon="eos-icons:loading" className="w-10 h-10" style={{ color: ACCENT }} /></div>;
    }

    const hoy = new Date();
    const en7Dias = new Date(); en7Dias.setDate(en7Dias.getDate() + 7);

    return (
        <div className="space-y-6">
            {/* KPIs clientes */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <KpiCard label="Empresas activas" value={String(vm.dashboard.totalActivos ?? 0)} icon="solar:buildings-2-bold-duotone" color="#3B82F6" />
                <KpiCard label="Inactivas / Churn" value={String(vm.dashboard.totalInactivos ?? 0)} icon="solar:user-minus-bold-duotone" color="#EF4444" />
                <KpiCard label="Nuevas este mes" value={String(vm.dashboard.nuevosEsteMes ?? 0)} trend={vm.dashboard.crecimientoClientes} trendLabel="vs mes ant." icon="solar:user-plus-bold-duotone" color="#10B981" />
                <KpiCard label="Vencen en 7 días" value={String(vm.dashboard.proximasVencer ?? 0)} sub="Requieren renovación" icon="solar:calendar-bold-duotone" color="#F59E0B" />
            </div>

            {/* Buscador + lista de empresas */}
            <div className="bg-white dark:bg-[#111827] rounded-3xl border border-slate-100 dark:border-slate-800 shadow-[0_2px_20px_rgba(15,23,42,0.05)] dark:shadow-none overflow-hidden">
                <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100">
                    <h3 className="text-sm font-bold text-slate-800 dark:text-white flex-1">
                        Empresas activas
                        <span className="ml-2 px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-bold">
                            {vm.empresasFiltradas.length}
                        </span>
                    </h3>
                    <div className="relative w-64">
                        <Icon icon="solar:magnifer-linear" className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                        <input
                            type="text"
                            placeholder="Buscar empresa..."
                            value={vm.busquedaEmpresa}
                            onChange={(e) => vm.setBusquedaEmpresa(e.target.value)}
                            className="w-full h-11 pl-9 pr-3 text-sm rounded-2xl border-2 border-slate-200 bg-white text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-[var(--accent)] transition-colors"
                        />
                    </div>
                </div>

                {vm.empresasFiltradas.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-14 text-slate-400">
                        <Icon icon="solar:buildings-2-linear" width={44} className="mb-2 text-slate-200" />
                        <p className="text-sm font-semibold">{vm.busquedaEmpresa ? 'Sin resultados' : 'No hay empresas activas'}</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left border-collapse">
                            <thead>
                                <tr className="text-[11px] font-bold uppercase tracking-wide text-slate-400 border-b border-slate-100">
                                    <th className="text-left px-5 py-3">Empresa</th>
                                    <th className="text-left px-5 py-3">RUC</th>
                                    <th className="text-left px-5 py-3">Plan</th>
                                    <th className="text-left px-5 py-3">Admin principal</th>
                                    <th className="text-left px-5 py-3">Vence</th>
                                    <th className="text-right px-5 py-3">S/ mensual</th>
                                </tr>
                            </thead>
                            <tbody>
                                {vm.empresasFiltradas.map((e: any) => {
                                    const exp = e.fechaExpiracion ? new Date(e.fechaExpiracion) : null;
                                    const venceProximo = exp && exp <= en7Dias && exp >= hoy;
                                    const vencido = exp && exp < hoy;
                                    return (
                                        <tr key={e.id} className="border-b border-slate-50 hover:bg-slate-50/60 transition-colors">
                                            <td className="px-5 py-3.5">
                                                <div className="flex items-center gap-2.5">
                                                    {e.logo ? (
                                                        <img src={e.logo} alt="" className="w-8 h-8 rounded-lg object-contain border border-slate-100" />
                                                    ) : (
                                                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-400 to-indigo-500 flex items-center justify-center text-white text-xs font-bold">
                                                            {(e.nombre ?? '?')[0].toUpperCase()}
                                                        </div>
                                                    )}
                                                    <span className="font-semibold text-slate-700">{e.nombre}</span>
                                                </div>
                                            </td>
                                            <td className="px-5 py-3.5 text-slate-500 font-mono text-xs">{e.ruc}</td>
                                            <td className="px-5 py-3.5">
                                                <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-indigo-50 text-indigo-600">
                                                    {e.plan}
                                                </span>
                                            </td>
                                            <td className="px-5 py-3.5">
                                                {e.adminEmail ? (
                                                    <div>
                                                        <p className="text-sm text-slate-700 font-medium">{e.admin.split(' (')[0]}</p>
                                                        <p className="text-xs text-slate-400">{e.adminEmail}</p>
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-amber-600 flex items-center gap-1">
                                                        <Icon icon="solar:danger-triangle-bold" width={12} />
                                                        Sin admin asignado
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-5 py-3.5">
                                                {exp ? (
                                                    <span className={`text-xs font-semibold ${vencido ? 'text-rose-600' : venceProximo ? 'text-amber-600' : 'text-slate-500'}`}>
                                                        {vencido && <Icon icon="solar:close-circle-bold" className="inline mr-1" width={12} />}
                                                        {venceProximo && <Icon icon="solar:danger-triangle-bold" className="inline mr-1" width={12} />}
                                                        {exp.toLocaleDateString('es-PE')}
                                                    </span>
                                                ) : <span className="text-xs text-slate-300">—</span>}
                                            </td>
                                            <td className="px-5 py-3.5 text-right font-bold text-slate-800">
                                                {fmt(e.costoMensual)}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Chart nuevos vs bajas */}
            <div className="bg-white dark:bg-[#111827] rounded-3xl border border-slate-100 dark:border-slate-800 p-5 shadow-[0_2px_20px_rgba(15,23,42,0.05)] dark:shadow-none">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-bold text-slate-800 dark:text-white">Adquisición vs Bajas (histórico)</h3>
                    <div className="flex gap-1">
                        {[6, 12].map((m) => (
                            <button key={m} onClick={() => vm.setMesesTendencia(m)} className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${vm.mesesTendencia === m ? 'text-white' : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`} style={vm.mesesTendencia === m ? { background: ACCENT } : undefined}>{m}M</button>
                        ))}
                    </div>
                </div>
                <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={vm.tendencia} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                        <XAxis dataKey="mes" tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                        <Tooltip />
                        <Legend wrapperStyle={{ fontSize: 12 }} />
                        <Bar dataKey="nuevosClientes" name="Nuevas empresas" fill="#10B981" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="bajasClientes" name="Bajas" fill="#EF4444" radius={[4, 4, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}

// ── Página principal ───────────────────────────────────────────────────────────

const TABS = [
    { key: 'dashboard', label: 'Dashboard', icon: 'solar:chart-2-bold-duotone' },
    { key: 'movimientos', label: 'Ingresos y Gastos', icon: 'solar:wallet-money-bold-duotone' },
    { key: 'clientes', label: 'Clientes', icon: 'solar:buildings-2-bold-duotone' },
] as const;

export default function SistemaFinanzas() {
    const vm = useSistemaFinanzasViewModel();
    const sidebarColor = useThemeStore((s) => s.sidebarColor);
    const ACCENT = SIDEBAR_COLOR_HEX[sidebarColor] ?? '#7551FF';

    return (
        <div className="min-h-screen -m-5 p-5 bg-[#F7F8FB] font-jakarta">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm text-slate-400 mb-5">
                <Icon icon="solar:home-smile-linear" className="text-base" />
                <span>Panel</span>
                <Icon icon="solar:alt-arrow-right-linear" className="text-xs" />
                <span>Sistema</span>
                <Icon icon="solar:alt-arrow-right-linear" className="text-xs" />
                <span className="font-semibold" style={{ color: ACCENT }}>Finanzas del Sistema</span>
            </div>

            {/* Header */}
            <div className="flex items-start gap-4 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-violet-700 flex items-center justify-center shadow-lg shadow-violet-500/25 flex-shrink-0">
                    <Icon icon="solar:chart-square-bold-duotone" className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                    <h1 className="text-[22px] font-extrabold text-slate-800 dark:text-white tracking-tight">Finanzas del Sistema</h1>
                    <p className="text-sm text-slate-400 mt-0.5">Panel financiero exclusivo para los socios — ingresos, gastos, caja y crecimiento de clientes</p>
                </div>
                <button
                    onClick={() => vm.cargarGastos()}
                    className="h-11 w-11 grid place-items-center rounded-2xl bg-white border border-slate-200 text-slate-400 hover:text-slate-600 shadow-sm transition-colors flex-shrink-0"
                    title="Actualizar"
                >
                    <Icon icon="solar:refresh-linear" width={18} />
                </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 mb-6 bg-white dark:bg-[#111827] p-1 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-[0_2px_20px_rgba(15,23,42,0.05)] dark:shadow-none w-fit">
                {TABS.map((t) => (
                    <button
                        key={t.key}
                        onClick={() => vm.setTab(t.key)}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${vm.tab === t.key
                            ? 'text-white shadow-md shadow-violet-500/25'
                            : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
                            }`}
                        style={vm.tab === t.key ? { background: ACCENT } : undefined}
                    >
                        <Icon icon={t.icon} width={17} />
                        {t.label}
                    </button>
                ))}
            </div>

            {/* Tab content */}
            {vm.tab === 'dashboard' && <TabDashboard vm={vm} />}
            {vm.tab === 'movimientos' && <TabMovimientos vm={vm} />}
            {vm.tab === 'clientes' && <TabClientes vm={vm} />}

            {/* Modals */}
            <ModalGasto vm={vm} />
            <ModalIngreso vm={vm} />
        </div>
    );
}
