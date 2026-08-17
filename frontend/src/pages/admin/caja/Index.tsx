import React, { useState } from 'react';
import { Icon } from '@iconify/react';
import CajaControl from './components/CajaControl';
import CajaHistorial from './components/CajaHistorial';

// ── Gestión de Caja — estilo CRM claro (Brix UI) ──────────────────────────────
const ACCENT = 'var(--accent, #7551FF)';

const TABS = [
    { key: 'CONTROL', label: 'Control de Caja', icon: 'solar:shop-2-bold-duotone' },
    { key: 'HISTORIAL', label: 'Historial de Turnos', icon: 'solar:history-bold-duotone' },
] as const;

const CajaIndex: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'CONTROL' | 'HISTORIAL'>('CONTROL');

    return (
        <div className="min-h-screen -m-5 p-5 bg-[#F7F8FB] dark:bg-[#0A0D14] font-jakarta">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm text-slate-400 dark:text-gray-400 mb-5">
                <Icon icon="solar:home-smile-linear" className="text-base" />
                <span>Panel</span>
                <Icon icon="solar:alt-arrow-right-linear" className="text-xs" />
                <span>Finanzas</span>
                <Icon icon="solar:alt-arrow-right-linear" className="text-xs" />
                <span className="font-semibold" style={{ color: ACCENT }}>Caja</span>
            </div>

            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-5">
                <div className="flex items-center gap-3 min-w-0">
                    <div className="h-11 w-11 grid place-items-center rounded-2xl bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400 shrink-0">
                        <Icon icon="solar:cash-out-bold-duotone" className="text-2xl" />
                    </div>
                    <div className="min-w-0">
                        <h1 className="text-[22px] font-extrabold text-slate-800 dark:text-white tracking-tight truncate">Gestión de Caja</h1>
                        <p className="text-sm text-slate-400 dark:text-gray-400 mt-0.5">Control de turnos, apertura, cierre y reportes de caja.</p>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex flex-wrap gap-2 mb-5">
                {TABS.map((t) => {
                    const active = activeTab === t.key;
                    return (
                        <button
                            key={t.key}
                            onClick={() => setActiveTab(t.key)}
                            className={`flex items-center gap-2 h-11 px-4 rounded-2xl text-sm font-bold transition-all ${active
                                ? 'text-white shadow-lg shadow-violet-500/30'
                                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-gray-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
                                }`}
                            style={active ? { background: ACCENT } : undefined}
                        >
                            <Icon icon={t.icon} className="text-lg" />
                            {t.label}
                        </button>
                    );
                })}
            </div>

            {/* Content */}
            <div>
                {activeTab === 'CONTROL' && <CajaControl />}
                {activeTab === 'HISTORIAL' && <CajaHistorial />}
            </div>
        </div>
    );
};

export default CajaIndex;
