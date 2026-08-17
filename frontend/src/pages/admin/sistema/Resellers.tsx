import { useResellersViewModel } from '@/features/admin/sistema/useResellersViewModel';
import { Icon } from '@iconify/react';
import { useMemo, useState, useEffect } from 'react';
import Modal from '@/components/Modal';
import InputPro from '@/components/InputPro';
import Button from '@/components/Button';
import apiClient from '@/utils/apiClient';

const ACCENT = 'var(--accent, #7551FF)';

// Chequeo en vivo de disponibilidad del dominio/subdominio del reseller.
function DominioDisponibilidad({ dominio, excludeId }: { dominio?: string; excludeId?: number }) {
    const [estado, setEstado] = useState<{ disponible?: boolean; motivo?: string; loading?: boolean } | null>(null);
    useEffect(() => {
        const d = String(dominio || '').trim();
        if (!d) { setEstado(null); return; }
        let cancel = false;
        setEstado({ loading: true });
        const t = setTimeout(async () => {
            try {
                const params = new URLSearchParams({ dominio: d });
                if (excludeId) params.set('excludeId', String(excludeId));
                const { data } = await apiClient.get(`/resellers/dominio/check?${params.toString()}`);
                const r = data?.data ?? data;
                if (!cancel) setEstado({ disponible: r?.disponible, motivo: r?.motivo });
            } catch {
                if (!cancel) setEstado({ disponible: false, motivo: 'No se pudo verificar el dominio.' });
            }
        }, 500);
        return () => { cancel = true; clearTimeout(t); };
    }, [dominio, excludeId]);

    if (!estado) return null;
    if (estado.loading) return <p className="mt-1 text-xs text-gray-400 flex items-center gap-1"><Icon icon="eos-icons:loading" className="animate-spin" /> Verificando…</p>;
    if (estado.disponible) return <p className="mt-1 text-xs text-emerald-600 font-medium flex items-center gap-1"><Icon icon="solar:check-circle-bold" /> Dominio disponible</p>;
    return <p className="mt-1 text-xs text-red-500 font-medium flex items-center gap-1"><Icon icon="solar:danger-circle-bold" /> {estado.motivo}</p>;
}

export default function AdminResellers() {
    const vm = useResellersViewModel();
    const [activeTab, setActiveTab] = useState<'general' | 'whitelabel'>('general');

    useEffect(() => {
        if (vm.isCreateModalOpen) setActiveTab('general');
    }, [vm.isCreateModalOpen]);

    // ── Simulador de ganancia de la PLATAFORMA ──
    // Ingreso de la plataforma = precio mayorista (con tramos por volumen de
    // clientes) que el reseller paga. Costo plataforma por cliente configurable.
    const PLAT_PLANS = useMemo(() => [
        { key: 'Emprendedor', icon: 'solar:rocket-bold-duotone', defaultClients: 20, tiers: [{ min: 1, cost: 15 }, { min: 6, cost: 14 }, { min: 16, cost: 13 }, { min: 31, cost: 12 }] },
        { key: 'Negocio', icon: 'solar:shop-bold-duotone', defaultClients: 15, tiers: [{ min: 1, cost: 30 }, { min: 6, cost: 29 }, { min: 16, cost: 28 }, { min: 31, cost: 27 }] },
        { key: 'Corporativo', icon: 'solar:buildings-3-bold-duotone', defaultClients: 10, tiers: [{ min: 1, cost: 45 }, { min: 6, cost: 44 }, { min: 16, cost: 43 }, { min: 31, cost: 42 }] },
    ], []);
    const costForTier = (tiers: { min: number; cost: number }[], clients: number) => {
        let c = tiers[0].cost;
        for (const t of tiers) if (clients >= t.min) c = t.cost;
        return c;
    };
    const tierRange = (tiers: { min: number }[], i: number) => {
        const min = tiers[i].min; const next = tiers[i + 1];
        return next ? `${min}–${next.min - 1}` : `${min}+`;
    };
    const [platClients, setPlatClients] = useState<number[]>(PLAT_PLANS.map((p) => p.defaultClients));
    const [costoPlataforma, setCostoPlataforma] = useState(0); // costo de la plataforma por cliente/mes (QPSE/infra)
    const setPlatClient = (i: number, v: number) => setPlatClients((rs) => rs.map((r, j) => (j === i ? Math.max(0, v) : r)));
    const platIngresoMes = PLAT_PLANS.reduce((s, p, i) => s + costForTier(p.tiers, platClients[i] || 0) * (platClients[i] || 0), 0);
    const platTotalClientes = platClients.reduce((a, b) => a + (b || 0), 0);
    const platCostoMes = costoPlataforma * platTotalClientes;
    const platNetoMes = platIngresoMes - platCostoMes;
    const money = (v: number) => `S/ ${Number(v || 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    const exportSimulatorCsv = () => {
        const header = ['Plan', 'Clientes', 'CostoPorCliente(mayorista)', 'IngresoPlataformaMes'];
        const lines = PLAT_PLANS.map((p, i) => {
            const c = platClients[i] || 0; const tier = costForTier(p.tiers, c);
            return [p.key, c, tier.toFixed(2), (tier * c).toFixed(2)];
        });
        const csv = [header.join(','), ...lines.map((l) => l.join(',')), `TOTAL,${platTotalClientes},,${platIngresoMes.toFixed(2)}`].join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url; link.download = 'simulador-ganancia-plataforma.csv'; link.click();
        URL.revokeObjectURL(url);
    };

    // ── Panel de control (KPIs + riesgo + filtros) ──
    const [search, setSearch] = useState('');
    const [estadoFilter, setEstadoFilter] = useState<'todos' | 'activos' | 'inactivos'>('todos');
    const [soloRiesgo, setSoloRiesgo] = useState(false);
    const [sortBy, setSortBy] = useState<'mrr' | 'clientes' | 'churn' | 'saldo'>('mrr');

    // En riesgo: activo pero su saldo no cubre ni un mes de su costo (MRR) → sus
    // clientes podrían suspenderse en la próxima renovación.
    const esRiesgo = (r: any) => {
        const m = vm.getRentabilidadByReseller(r.id);
        return r.activo && Number(r.saldo || 0) < Number(m?.mrrBruto || 0);
    };

    const kpis = useMemo(() => {
        let mrr = 0, margen = 0, saldo = 0, clientes = 0, activos = 0, riesgo = 0;
        vm.resellers.forEach((r: any) => {
            const m = vm.getRentabilidadByReseller(r.id);
            mrr += Number(m?.mrrBruto || 0); margen += Number(m?.margenMensual || 0);
            saldo += Number(r.saldo || 0); clientes += Number(r._count?.empresas || 0);
            if (r.activo) activos++;
            if (esRiesgo(r)) riesgo++;
        });
        return { total: vm.resellers.length, activos, mrr, margen, saldo, clientes, riesgo };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [vm.resellers, vm.rentabilidad]);

    const filteredResellers = useMemo(() => {
        let arr = [...vm.resellers];
        const q = search.trim().toLowerCase();
        if (q) arr = arr.filter((r: any) => [r.nombre, r.codigo, r.email, r.representante].some((x) => String(x || '').toLowerCase().includes(q)));
        if (estadoFilter === 'activos') arr = arr.filter((r: any) => r.activo);
        else if (estadoFilter === 'inactivos') arr = arr.filter((r: any) => !r.activo);
        if (soloRiesgo) arr = arr.filter(esRiesgo);
        arr.sort((a: any, b: any) => {
            const ma = vm.getRentabilidadByReseller(a.id), mb = vm.getRentabilidadByReseller(b.id);
            if (sortBy === 'mrr') return Number(mb?.mrrBruto || 0) - Number(ma?.mrrBruto || 0);
            if (sortBy === 'clientes') return Number(b._count?.empresas || 0) - Number(a._count?.empresas || 0);
            if (sortBy === 'churn') return Number(mb?.churn30dPct || 0) - Number(ma?.churn30dPct || 0);
            return Number(b.saldo || 0) - Number(a.saldo || 0);
        });
        return arr;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [vm.resellers, vm.rentabilidad, search, estadoFilter, soloRiesgo, sortBy]);

    return (
        <div className="min-h-screen -m-5 p-5 bg-[#F7F8FB] dark:bg-[#0A0D14] font-jakarta space-y-6">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm text-slate-400">
                <Icon icon="solar:home-smile-linear" className="text-base" />
                <span>Panel</span>
                <Icon icon="solar:alt-arrow-right-linear" className="text-xs" />
                <span>Sistema</span>
                <Icon icon="solar:alt-arrow-right-linear" className="text-xs" />
                <span className="font-semibold" style={{ color: ACCENT }}>Distribuidores</span>
            </div>

            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="min-w-0">
                    <h1 className="text-[22px] font-extrabold text-slate-800 dark:text-white tracking-tight">Distribuidores</h1>
                    <p className="text-sm text-slate-400 mt-0.5">Gestiona los socios comerciales, sus saldos y rentabilidad.</p>
                </div>
                <button onClick={vm.openCreateModal}
                    className="h-11 px-4 rounded-2xl text-white text-sm font-bold flex items-center justify-center gap-1.5 shadow-lg shadow-violet-500/30 hover:brightness-105 transition-all shrink-0 w-full lg:w-auto"
                    style={{ background: ACCENT }}>
                    <Icon icon="solar:user-plus-bold" className="text-lg" /> <span>Nuevo Distribuidor</span>
                </button>
            </div>

            {/* KPIs de control */}
            <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
                {[
                    { label: 'Distribuidores', value: String(kpis.total), sub: `${kpis.activos} activos`, icon: 'solar:users-group-two-rounded-bold-duotone', tone: 'slate' },
                    { label: 'MRR plataforma', value: money(kpis.mrr), sub: 'ingreso mayorista/mes', icon: 'solar:chart-2-bold-duotone', tone: 'violet' },
                    { label: 'Margen plataforma', value: money(kpis.margen), sub: 'después de costo/mes', icon: 'solar:wallet-money-bold-duotone', tone: 'emerald' },
                    { label: 'Saldo en circulación', value: money(kpis.saldo), sub: 'prepago de resellers', icon: 'solar:card-bold-duotone', tone: 'slate' },
                    { label: 'Clientes totales', value: String(kpis.clientes), sub: 'bajo tus resellers', icon: 'solar:buildings-2-bold-duotone', tone: 'slate' },
                    { label: 'En riesgo', value: String(kpis.riesgo), sub: 'saldo no cubre 1 mes', icon: 'solar:danger-triangle-bold-duotone', tone: kpis.riesgo > 0 ? 'rose' : 'slate' },
                ].map((c) => {
                    const tones: Record<string, string> = {
                        slate: 'bg-slate-50 text-slate-500 dark:bg-slate-800 dark:text-slate-300', violet: 'bg-[#7551FF]/10 text-[#7551FF]',
                        emerald: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400', rose: 'bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400',
                    };
                    return (
                        <div key={c.label} className={`rounded-2xl bg-white dark:bg-[#111827] p-4 shadow-sm dark:shadow-none border ${c.tone === 'rose' ? 'border-rose-200 dark:border-rose-800' : 'border-slate-100 dark:border-slate-800'}`}>
                            <div className={`h-9 w-9 grid place-items-center rounded-xl ${tones[c.tone]}`}><Icon icon={c.icon} width="20" /></div>
                            <p className="mt-2.5 text-[10px] font-black uppercase tracking-wide text-slate-400">{c.label}</p>
                            <p className={`mt-0.5 text-xl font-extrabold tabular-nums ${c.tone === 'rose' && kpis.riesgo > 0 ? 'text-rose-600 dark:text-rose-400' : c.tone === 'violet' ? 'text-[#7551FF]' : 'text-slate-800 dark:text-white'}`}>{c.value}</p>
                            <p className="text-[11px] text-slate-400 truncate">{c.sub}</p>
                        </div>
                    );
                })}
            </div>

            {/* Aviso de riesgo */}
            {kpis.riesgo > 0 && (
                <button onClick={() => { setSoloRiesgo(true); setEstadoFilter('todos'); }}
                    className="w-full flex items-center gap-2.5 rounded-2xl border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-900/20 px-4 py-3 text-sm text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/30 transition-colors text-left">
                    <Icon icon="solar:danger-triangle-bold-duotone" width="20" className="shrink-0 text-rose-500" />
                    <span><b>{kpis.riesgo} distribuidor{kpis.riesgo !== 1 ? 'es' : ''}</b> con saldo insuficiente para su próxima renovación — sus clientes podrían suspenderse. <span className="underline font-semibold">Ver solo estos</span></span>
                </button>
            )}

            {/* Card tabla */}
            <div className="bg-white dark:bg-[#111827] rounded-3xl shadow-[0_2px_20px_rgba(15,23,42,0.05)] dark:shadow-none overflow-hidden">
                <div className="flex flex-wrap items-center gap-2.5 p-4 border-b border-slate-100 dark:border-slate-800">
                    <div className="relative flex-1 min-w-[200px] max-w-xs">
                        <Icon icon="solar:magnifer-linear" className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por nombre, código o email…"
                            className="w-full h-10 pl-10 pr-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-700 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-[#7551FF]" />
                    </div>
                    {/* Filtro estado */}
                    <div className="flex items-center gap-1 rounded-xl bg-slate-100 dark:bg-slate-800 p-1">
                        {([['todos', 'Todos'], ['activos', 'Activos'], ['inactivos', 'Inactivos']] as const).map(([k, l]) => (
                            <button key={k} onClick={() => setEstadoFilter(k)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${estadoFilter === k ? 'bg-white dark:bg-slate-700 text-[#7551FF] shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}>{l}</button>
                        ))}
                    </div>
                    {/* Solo en riesgo */}
                    <button onClick={() => setSoloRiesgo((v) => !v)}
                        className={`h-9 px-3 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-colors ${soloRiesgo ? 'border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400' : 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                        <Icon icon="solar:danger-triangle-bold-duotone" width="15" /> En riesgo {kpis.riesgo > 0 && <span className="h-4 min-w-4 px-1 grid place-items-center rounded-full bg-rose-500 text-white text-[10px]">{kpis.riesgo}</span>}
                    </button>
                    {/* Orden */}
                    <div className="ml-auto flex items-center gap-1.5 text-xs text-slate-400">
                        <span className="hidden sm:inline">Ordenar:</span>
                        <select value={sortBy} onChange={(e) => setSortBy(e.target.value as any)}
                            className="h-9 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 pl-2.5 pr-7 text-xs font-semibold text-slate-600 dark:text-slate-300 focus:outline-none focus:border-[#7551FF]">
                            <option value="mrr">MRR ↓</option>
                            <option value="clientes">Clientes ↓</option>
                            <option value="churn">Churn ↓</option>
                            <option value="saldo">Saldo ↓</option>
                        </select>
                        <span className="font-medium text-slate-400 whitespace-nowrap">{filteredResellers.length} de {vm.resellers.length}</span>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[1000px]">
                        <thead>
                            <tr className="text-[11px] font-bold uppercase tracking-wide text-slate-400 border-b border-slate-100 dark:border-slate-800">
                                <th className="py-3 pl-5 pr-3">Distribuidor</th>
                                <th className="py-3 px-3">Representante</th>
                                <th className="py-3 px-3">Contacto</th>
                                <th className="py-3 px-3 text-right">Saldo</th>
                                <th className="py-3 px-3 text-right">MRR Bruto</th>
                                <th className="py-3 px-3 text-right">Margen</th>
                                <th className="py-3 px-3 text-right">Churn 30d</th>
                                <th className="py-3 px-3 text-center">Clientes</th>
                                <th className="py-3 px-3 text-center">Estado</th>
                                <th className="py-3 px-3 pr-5 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredResellers.length === 0 ? (
                                <tr>
                                    <td colSpan={10} className="py-16 text-center">
                                        <Icon icon="solar:users-group-two-rounded-linear" className="text-5xl text-slate-200 dark:text-slate-700 mx-auto mb-2" />
                                        <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">{vm.resellers.length === 0 ? 'No hay distribuidores registrados' : 'Ningún distribuidor coincide con el filtro'}</p>
                                        {vm.resellers.length === 0 && (
                                            <button onClick={vm.openCreateModal} className="mt-4 inline-flex items-center gap-1.5 h-9 px-4 rounded-xl text-white text-sm font-bold shadow-lg shadow-violet-500/30 hover:brightness-105 transition-all" style={{ background: ACCENT }}>
                                                <Icon icon="solar:user-plus-bold" /> Crear primer distribuidor
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ) : (
                                filteredResellers.map((reseller: any) => {
                                    const metric = vm.getRentabilidadByReseller(reseller.id);
                                    const riesgo = esRiesgo(reseller);
                                    return (
                                        <tr key={reseller.id} className="border-b border-slate-50 dark:border-slate-800 hover:bg-slate-50/60 dark:hover:bg-slate-800/60 transition-colors">
                                            <td className="py-3 pl-5 pr-3">
                                                <div className="flex items-center gap-2.5 min-w-0">
                                                    <div className="h-9 w-9 rounded-full bg-gradient-to-br from-violet-400 to-indigo-500 text-white grid place-items-center text-xs font-bold shrink-0 uppercase">
                                                        {String(reseller.nombre || 'D').charAt(0)}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="font-semibold text-slate-700 dark:text-slate-200 text-sm truncate max-w-[200px]">{reseller.nombre}</p>
                                                        <span className="font-mono text-[11px] text-[#7551FF]">{reseller.codigo}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-3 px-3 text-sm text-slate-500 dark:text-slate-400 truncate max-w-[140px]">{reseller.representante || '—'}</td>
                                            <td className="py-3 px-3">
                                                <div className="flex flex-col text-xs text-slate-500 dark:text-slate-400 gap-1">
                                                    {reseller.email && <div className="flex items-center gap-1.5 truncate max-w-[180px]"><Icon icon="solar:letter-linear" width="14" className="shrink-0 text-slate-400" />{reseller.email}</div>}
                                                    {reseller.telefono && <div className="flex items-center gap-1.5"><Icon icon="solar:phone-linear" width="14" className="shrink-0 text-slate-400" />{reseller.telefono}</div>}
                                                </div>
                                            </td>
                                            <td className={`py-3 px-3 text-right text-sm font-semibold tabular-nums ${riesgo ? 'text-rose-600 dark:text-rose-400' : 'text-slate-700 dark:text-slate-200'}`}>
                                                <span className="inline-flex items-center gap-1 justify-end">{riesgo && <Icon icon="solar:danger-triangle-bold" width="13" className="text-rose-500" />}S/ {Number(reseller.saldo).toFixed(2)}</span>
                                            </td>
                                            <td className="py-3 px-3 text-right text-sm text-slate-600 dark:text-slate-300 tabular-nums">S/ {Number(metric?.mrrBruto || 0).toFixed(2)}</td>
                                            <td className="py-3 px-3 text-right">
                                                <div className="text-sm text-slate-700 dark:text-slate-200 tabular-nums">S/ {Number(metric?.margenMensual || 0).toFixed(2)}</div>
                                                <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold tabular-nums">{Number(metric?.margenPct || 0).toFixed(1)}%</div>
                                            </td>
                                            <td className="py-3 px-3 text-right">
                                                <div className="text-sm font-semibold text-slate-700 dark:text-slate-200 tabular-nums">{Number(metric?.churn30dPct || 0).toFixed(1)}%</div>
                                                <div className="text-[11px] text-slate-400">{metric?.clientesPerdidos30d || 0} perdidos</div>
                                            </td>
                                            <td className="py-3 px-3 text-center">
                                                <span className="inline-flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2.5 py-1 rounded-full text-xs font-bold tabular-nums">{reseller._count?.empresas || 0}</span>
                                            </td>
                                            <td className="py-3 px-3 text-center">
                                                <div className="flex flex-col items-center gap-1">
                                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${reseller.activo ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400' : 'bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400'}`}>
                                                        <span className={`w-1.5 h-1.5 rounded-full ${reseller.activo ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                                                        {reseller.activo ? 'Activo' : 'Inactivo'}
                                                    </span>
                                                    {riesgo && <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-600 dark:text-rose-400"><Icon icon="solar:danger-triangle-bold" width="11" /> Riesgo saldo</span>}
                                                </div>
                                            </td>
                                            <td className="py-3 px-3 pr-5">
                                                <div className="flex items-center justify-end gap-1">
                                                    <button onClick={() => vm.openRechargeModal(reseller)} title="Recargar saldo" className="h-8 w-8 grid place-items-center rounded-lg text-[#7551FF] hover:bg-[#7551FF]/10 transition-colors"><Icon icon="solar:wallet-money-bold-duotone" width="18" /></button>
                                                    <button onClick={() => vm.openEditModal(reseller)} title="Editar" className="h-8 w-8 grid place-items-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"><Icon icon="solar:pen-bold-duotone" width="18" /></button>
                                                    <button onClick={() => vm.handleToggleEstado(reseller)} title={reseller.activo ? 'Desactivar' : 'Activar'} className={`h-8 w-8 grid place-items-center rounded-lg transition-colors ${reseller.activo ? 'text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20' : 'text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20'}`}><Icon icon={reseller.activo ? 'solar:forbidden-circle-bold-duotone' : 'solar:check-circle-bold-duotone'} width="18" /></button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="bg-white dark:bg-[#111827] rounded-3xl shadow-[0_2px_20px_rgba(15,23,42,0.05)] dark:shadow-none overflow-hidden">
                <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-center gap-3">
                        <div className="grid h-10 w-10 place-items-center rounded-2xl bg-[#7551FF]/10 text-[#7551FF]">
                            <Icon icon="solar:calculator-bold-duotone" width="22" />
                        </div>
                        <div>
                            <h3 className="font-extrabold text-slate-800 dark:text-white">Simulador · ¿Cuánto gana la plataforma?</h3>
                            <p className="text-sm text-slate-400">Ingreso mayorista según los tramos de descuento por cantidad de clientes.</p>
                        </div>
                    </div>
                    <div className="flex items-end gap-3">
                        <div>
                            <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Tu costo por cliente/mes</label>
                            <div className="relative mt-1">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">S/</span>
                                <input type="number" min="0" step="0.10" value={costoPlataforma}
                                    onChange={(e) => setCostoPlataforma(Math.max(0, Number(e.target.value) || 0))}
                                    className="w-40 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 pl-9 pr-3 py-2 text-sm font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#7551FF]/20 focus:border-[#7551FF]" />
                            </div>
                            <p className="text-[10px] text-slate-400 mt-1">QPSE/SUNAT + infra. Déjalo en 0 para ver el ingreso bruto.</p>
                        </div>
                        <button onClick={exportSimulatorCsv} className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-[#7551FF]/30 bg-[#7551FF]/[0.06] text-sm font-bold text-[#7551FF] hover:bg-[#7551FF]/10 transition-colors">
                            <Icon icon="solar:file-download-bold-duotone" width="18" /> CSV
                        </button>
                    </div>
                </div>

                <div className="p-5">
                    {/* Una tarjeta por plan */}
                    <div className="grid gap-4 lg:grid-cols-3">
                        {PLAT_PLANS.map((p, i) => {
                            const clients = platClients[i] || 0;
                            const tier = costForTier(p.tiers, clients);
                            const ingreso = tier * clients;
                            const margen = Math.max(0, tier - costoPlataforma);
                            return (
                                <div key={p.key} className="flex flex-col rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                                    <div className="flex items-center gap-2">
                                        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#7551FF]/10 text-[#7551FF]"><Icon icon={p.icon} width="18" /></div>
                                        <p className="text-sm font-extrabold text-slate-800">{p.key}</p>
                                    </div>

                                    <p className="mt-4 text-[10px] font-bold uppercase tracking-wide text-slate-400">Cobras al reseller (por volumen)</p>
                                    <div className="mt-1.5 grid grid-cols-4 gap-1">
                                        {p.tiers.map((t, ti) => (
                                            <div key={t.min} className={`rounded-lg border px-1 py-1 text-center ${t.cost === tier ? 'border-[#7551FF] bg-[#7551FF]/[0.06]' : 'border-slate-100 bg-slate-50'}`}>
                                                <div className="text-[9px] font-bold text-slate-400">{tierRange(p.tiers, ti)}</div>
                                                <div className={`text-[11px] font-black tabular-nums ${t.cost === tier ? 'text-[#7551FF]' : 'text-slate-600'}`}>{t.cost}</div>
                                            </div>
                                        ))}
                                    </div>
                                    <p className="mt-1.5 text-[11px] text-slate-500">Con <b className="tabular-nums">{clients}</b> cobras <b className="tabular-nums">{money(tier)}</b> c/u · margen <b className="tabular-nums text-emerald-600">{money(margen)}</b></p>

                                    <label className="mt-3 block text-[11px] font-bold text-slate-600">Clientes en este plan</label>
                                    <div className="mt-1 flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-1">
                                        <button type="button" onClick={() => setPlatClient(i, clients - 1)} className="grid h-8 w-8 place-items-center rounded-lg bg-white text-slate-600 shadow-sm hover:text-[#7551FF]"><Icon icon="solar:minus-square-linear" width="18" /></button>
                                        <input type="number" min={0} value={clients} onChange={(e) => setPlatClient(i, Number(e.target.value) || 0)} onFocus={(e) => e.target.select()}
                                            className="w-14 appearance-none border-0 bg-transparent text-center text-lg font-black text-slate-800 outline-none focus:outline-none tabular-nums [&::-webkit-inner-spin-button]:appearance-none" />
                                        <button type="button" onClick={() => setPlatClient(i, clients + 1)} className="grid h-8 w-8 place-items-center rounded-lg bg-white text-slate-600 shadow-sm hover:text-[#7551FF]"><Icon icon="solar:add-square-linear" width="18" /></button>
                                    </div>

                                    <div className="mt-auto pt-3">
                                        <div className="rounded-xl bg-[#7551FF]/[0.06] px-3 py-2 text-center">
                                            <span className="text-xs font-semibold text-[#7551FF]/80">Ingreso </span>
                                            <span className="text-lg font-black tabular-nums text-[#7551FF]">{money(ingreso)}</span>
                                            <span className="text-xs font-semibold text-[#7551FF]/80">/mes</span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Total plataforma */}
                    <div className="mt-4 grid gap-4 rounded-2xl bg-gradient-to-br from-[#7551FF] to-purple-700 p-5 text-white shadow-lg shadow-violet-500/25 sm:grid-cols-[auto_1fr] sm:items-center">
                        <div>
                            <p className="text-[11px] font-black uppercase tracking-wide text-violet-200">Ingreso de la plataforma</p>
                            <p className="mt-1 text-4xl font-black leading-none tabular-nums">{money(platIngresoMes)}<span className="ml-1 text-base font-bold text-violet-100">/mes</span></p>
                            <p className="mt-1.5 text-lg font-extrabold text-violet-50">≈ <span className="tabular-nums">{money(platIngresoMes * 12)}</span> al año</p>
                        </div>
                        <div className="text-sm leading-relaxed text-violet-50 sm:border-l sm:border-white/20 sm:pl-5">
                            <p><b className="tabular-nums">{platTotalClientes}</b> clientes en {PLAT_PLANS.length} planes.</p>
                            {costoPlataforma > 0 && (
                                <p className="mt-1">Costo plataforma <b className="tabular-nums">{money(platCostoMes)}</b>/mes → <b>margen neto</b> <b className="tabular-nums text-emerald-200">{money(platNetoMes)}</b>/mes (<span className="tabular-nums">{money(platNetoMes * 12)}</span>/año).</p>
                            )}
                            <p className="mt-1 text-violet-200 text-xs">A más clientes por reseller, más barato le sale cada plan (baja tu ingreso por cliente) — pero el volumen total crece.</p>
                        </div>
                    </div>
                </div>
            </div>

            <Modal
                isOpenModal={vm.isCreateModalOpen}
                closeModal={() => vm.setIsCreateModalOpen(false)}
                title={vm.isEditMode ? 'Editar Distribuidor' : 'Nuevo Distribuidor'}
                icon="solar:users-group-two-rounded-bold-duotone"
                iconClass="bg-[#7551FF]/10 text-[#7551FF]"
                width="660px"
                height="auto"
            >
                <form onSubmit={vm.handleCreateSubmit}>
                    <div className="flex border-b border-gray-100">
                        <button
                            type="button"
                            onClick={() => setActiveTab('general')}
                            className={`flex items-center gap-1.5 px-5 py-3 text-xs font-semibold uppercase tracking-wide border-b-2 transition-colors ${activeTab === 'general' ? 'border-[#7551FF] text-[#7551FF]' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                        >
                            <Icon icon="solar:user-id-bold" width="14" />General
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab('whitelabel')}
                            className={`flex items-center gap-1.5 px-5 py-3 text-xs font-semibold uppercase tracking-wide border-b-2 transition-colors ${activeTab === 'whitelabel' ? 'border-[#7551FF] text-[#7551FF]' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                        >
                            <Icon icon="solar:palette-bold" width="14" />White Label
                        </button>
                    </div>

                    <div className="p-5">
                        {activeTab === 'general' && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div className="col-span-2">
                                    <InputPro isLabel label="Nombre Comercial" name="nombre" value={vm.formData.nombre} onChange={vm.handleCreateChange as any} placeholder="Ej. Distribuciones Lima Norte" />
                                </div>
                                <InputPro isLabel label="Código Único" name="codigo" value={vm.formData.codigo} onChange={vm.handleCreateChange as any} placeholder="Ej. RES-001" />
                                <InputPro isLabel label="Teléfono" name="telefono" value={vm.formData.telefono} onChange={vm.handleCreateChange as any} placeholder="999 999 999" />
                                <div className="col-span-2">
                                    <InputPro isLabel label="Email (Usuario)" name="email" type="email" value={vm.formData.email} onChange={vm.handleCreateChange as any} placeholder="contacto@distribuidor.com" />
                                </div>
                                <InputPro isLabel label="Representante Legal" name="representante" value={vm.formData.representante} onChange={vm.handleCreateChange as any} placeholder="Nombre completo" />
                                <div>
                                    <InputPro isLabel label="Dominio White Label" name="dominioPersonalizado" value={vm.formData.dominioPersonalizado} onChange={vm.handleCreateChange as any} placeholder="micliente.vendify.pe o dominio propio" />
                                    <DominioDisponibilidad dominio={vm.formData.dominioPersonalizado} excludeId={(vm.formData as any)?.id} />
                                    <p className="mt-1 text-[11px] text-gray-400">Subdominio de Vendify (ej: <b>micliente.vendify.pe</b>) o un dominio propio (ej: <b>misistema.com</b>).</p>
                                </div>
                            </div>
                        )}

                        {activeTab === 'whitelabel' && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div className="col-span-2">
                                    <InputPro isLabel label="Nombre de Marca" name="whiteLabelNombre" value={vm.formData.whiteLabelNombre} onChange={vm.handleCreateChange as any} placeholder="Jamble" />
                                </div>
                                <div className="flex items-end gap-2">
                                    <div className="flex-1">
                                        <InputPro isLabel label="Color Primario" name="whiteLabelColorPrimario" value={vm.formData.whiteLabelColorPrimario} onChange={vm.handleCreateChange as any} placeholder="#0F172A" />
                                    </div>
                                    {vm.formData.whiteLabelColorPrimario && (
                                        <div className="w-9 h-9 rounded-lg border border-gray-200 mb-0.5 flex-shrink-0" style={{ backgroundColor: vm.formData.whiteLabelColorPrimario }} />
                                    )}
                                </div>
                                <div className="flex items-end gap-2">
                                    <div className="flex-1">
                                        <InputPro isLabel label="Color Secundario" name="whiteLabelColorSecundario" value={vm.formData.whiteLabelColorSecundario} onChange={vm.handleCreateChange as any} placeholder="#334155" />
                                    </div>
                                    {vm.formData.whiteLabelColorSecundario && (
                                        <div className="w-9 h-9 rounded-lg border border-gray-200 mb-0.5 flex-shrink-0" style={{ backgroundColor: vm.formData.whiteLabelColorSecundario }} />
                                    )}
                                </div>
                                <div className="col-span-2">
                                    <InputPro isLabel label="Logo URL" name="whiteLabelLogoUrl" value={vm.formData.whiteLabelLogoUrl} onChange={vm.handleCreateChange as any} placeholder="https://.../logo.png" />
                                </div>
                                <InputPro isLabel label="Logo Blanco URL" name="whiteLabelLogoWhiteUrl" value={vm.formData.whiteLabelLogoWhiteUrl} onChange={vm.handleCreateChange as any} placeholder="https://.../logo-white.png" />
                                <InputPro isLabel label="Favicon URL" name="whiteLabelFaviconUrl" value={vm.formData.whiteLabelFaviconUrl} onChange={vm.handleCreateChange as any} placeholder="https://.../favicon.ico" />
                                <InputPro isLabel label="Website" name="whiteLabelWebsite" value={vm.formData.whiteLabelWebsite} onChange={vm.handleCreateChange as any} placeholder="https://jamble.pe" />
                                <InputPro isLabel label="Email Comercial" name="whiteLabelEmail" value={vm.formData.whiteLabelEmail} onChange={vm.handleCreateChange as any} placeholder="ventas@jamble.pe" />
                                <InputPro isLabel label="Teléfono Marca" name="whiteLabelTelefono" value={vm.formData.whiteLabelTelefono} onChange={vm.handleCreateChange as any} placeholder="+51 ..." />
                                <InputPro isLabel label="WhatsApp Marca" name="whiteLabelWhatsapp" value={vm.formData.whiteLabelWhatsapp} onChange={vm.handleCreateChange as any} placeholder="51999..." />
                            </div>
                        )}
                    </div>

                    <div className="flex gap-3 px-5 pb-5">
                        <Button type="button" onClick={() => vm.setIsCreateModalOpen(false)} color="default" className="flex-1">Cancelar</Button>
                        <Button type="submit" color="primary" className="flex-1">{vm.isEditMode ? 'Guardar Cambios' : 'Crear Distribuidor'}</Button>
                    </div>
                </form>
            </Modal>

            <Modal
                isOpenModal={vm.isRechargeModalOpen && !!vm.selectedReseller}
                closeModal={() => vm.setIsRechargeModalOpen(false)}
                title="Saldo del distribuidor"
                icon="solar:wallet-money-bold-duotone"
                iconClass="bg-emerald-50 text-emerald-600"
                width="400px"
                height="auto"
            >
                {vm.selectedReseller && (
                    <div>
                        <div className="px-5 pt-4 pb-3 text-center border-b border-slate-100">
                            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{vm.selectedReseller.nombre}</p>
                            <p className="text-sm text-slate-400 mt-0.5">Saldo actual: <span className="text-slate-800 font-bold tabular-nums">S/ {Number(vm.selectedReseller.saldo).toFixed(2)}</span></p>
                        </div>

                        {/* Modo: recargar (sumar) vs corregir (fijar) */}
                        <div className="flex gap-1 rounded-2xl bg-slate-100 p-1 mx-5 mt-4">
                            {([['recargar', 'Recargar', 'solar:add-circle-bold-duotone'], ['ajustar', 'Corregir saldo', 'solar:pen-2-bold-duotone']] as const).map(([k, l, ic]) => (
                                <button key={k} type="button" onClick={() => vm.setSaldoMode(k)}
                                    className={`flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-bold transition-colors ${vm.saldoMode === k ? 'bg-white dark:bg-slate-700 text-[#7551FF] shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}>
                                    <Icon icon={ic} width="15" /> {l}
                                </button>
                            ))}
                        </div>

                        {vm.saldoMode === 'recargar' ? (
                            <form onSubmit={vm.handleRechargeSubmit}>
                                <div className="p-5 space-y-3">
                                    <InputPro isLabel label="Monto a Recargar (S/)" name="monto" type="number" value={vm.rechargeData.monto} onChange={vm.handleRechargeChange as any} placeholder="0.00" autoFocus step="0.01" />
                                    <InputPro isLabel label="Referencia (Opcional)" name="referencia" value={vm.rechargeData.referencia} onChange={vm.handleRechargeChange as any} placeholder="Ej. Transferencia BCP #1234" />
                                    <p className="text-[11px] text-slate-400">Suma este monto al saldo actual.</p>
                                </div>
                                <div className="flex gap-3 px-5 pb-5">
                                    <Button type="button" onClick={() => vm.setIsRechargeModalOpen(false)} color="default" className="flex-1">Cancelar</Button>
                                    <Button type="submit" color="success" className="flex-1">Recargar</Button>
                                </div>
                            </form>
                        ) : (
                            <form onSubmit={vm.handleAjustarSubmit}>
                                <div className="p-5 space-y-3">
                                    <InputPro isLabel label="Nuevo saldo exacto (S/)" name="nuevoSaldo" type="number" value={vm.ajusteData.nuevoSaldo} onChange={vm.handleAjusteChange as any} placeholder="0.00" autoFocus step="0.01" />
                                    {(() => {
                                        const nuevo = parseFloat(vm.ajusteData.nuevoSaldo);
                                        const actual = Number(vm.selectedReseller.saldo);
                                        if (isNaN(nuevo)) return null;
                                        const delta = Math.round((nuevo - actual) * 100) / 100;
                                        return (
                                            <div className={`rounded-xl px-3 py-2 text-xs font-semibold ${delta === 0 ? 'bg-slate-50 text-slate-500' : delta > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                                                Cambio: <span className="tabular-nums">{delta >= 0 ? '+' : ''}S/ {delta.toFixed(2)}</span> {delta > 0 ? '(sube)' : delta < 0 ? '(baja)' : '(sin cambio)'}
                                            </div>
                                        );
                                    })()}
                                    <InputPro isLabel label="Motivo del ajuste" name="motivo" value={vm.ajusteData.motivo} onChange={vm.handleAjusteChange as any} placeholder="Ej. Corrección de recarga duplicada" />
                                    <p className="text-[11px] text-slate-400">Fija el saldo a este valor exacto. Queda registrado como movimiento de auditoría.</p>
                                </div>
                                <div className="flex gap-3 px-5 pb-5">
                                    <Button type="button" onClick={() => vm.setIsRechargeModalOpen(false)} color="default" className="flex-1">Cancelar</Button>
                                    <Button type="submit" color="primary" className="flex-1" disabled={!vm.ajusteData.motivo.trim() || isNaN(parseFloat(vm.ajusteData.nuevoSaldo))}>Guardar saldo</Button>
                                </div>
                            </form>
                        )}
                    </div>
                )}
            </Modal>
        </div>
    );
}
