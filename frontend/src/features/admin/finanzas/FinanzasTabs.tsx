import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Icon } from '@iconify/react';
import { useRentabilidadViewModel } from './rentabilidad/useRentabilidadViewModel';
import RentabilidadView from './rentabilidad/RentabilidadView';
import FinanceDashboardView from './FinanceDashboardView';
import ComisionesView from './comisiones/ComisionesView';
import CategoriasView from './categorias/CategoriasView';
import MetodosPagoView from './metodos-pago/MetodosPagoView';
import ConciliacionView from './conciliacion/ConciliacionView';

type TabId = 'rentabilidad' | 'flujo' | 'comisiones' | 'categorias' | 'metodosPago' | 'conciliacion';

interface Tab {
    id: TabId;
    label: string;
    icon: string;
    description: string;
}

const TABS: Tab[] = [
    {
        id: 'rentabilidad',
        label: 'Rentabilidad',
        icon: 'solar:chart-2-bold-duotone',
        description: 'P&L — Análisis de ganancias y pérdidas',
    },
    {
        id: 'flujo',
        label: 'Flujo de Caja',
        icon: 'solar:wallet-money-bold-duotone',
        description: 'Ingresos y egresos del período',
    },
    {
        id: 'comisiones',
        label: 'Comisiones',
        icon: 'solar:users-group-rounded-bold-duotone',
        description: 'Comisiones por vendedor',
    },
    {
        id: 'categorias',
        label: 'Categorías',
        icon: 'solar:tag-bold-duotone',
        description: 'Ganancia por categoría de producto',
    },
    {
        id: 'metodosPago',
        label: 'Métodos de pago',
        icon: 'solar:card-2-bold-duotone',
        description: 'Cobros por método, voucher y cuenta',
    },
    {
        id: 'conciliacion',
        label: 'Conciliación bancaria',
        icon: 'solar:bill-check-bold-duotone',
        description: 'Cruza el Excel del banco con ventas y compras',
    },
];

export default function FinanzasTabs() {
    const [searchParams] = useSearchParams();
    const tabParam = searchParams.get('tab') as TabId | null;
    const initialTab: TabId = tabParam && TABS.some((t) => t.id === tabParam) ? tabParam : 'rentabilidad';
    const [activeTab, setActiveTab] = useState<TabId>(initialTab);
    const vm = useRentabilidadViewModel();

    return (
        <div className="min-h-full -m-5 w-[calc(100%+40px)] overflow-x-hidden bg-[#F8F9FB] font-jakarta dark:bg-[#0A0D14]">
            {/* ── Header + Tab bar area ── */}
            <div className="px-5 pt-5">
                {/* Page Header */}
                <div className="mb-5 sm:mb-6">
                    <div className="mb-1 flex min-w-0 items-center gap-2 text-sm font-medium text-gray-400">
                        <span>Finanzas</span>
                        <Icon icon="solar:alt-arrow-right-linear" className="shrink-0" />
                        <span className="truncate text-[var(--accent)]">
                            {TABS.find(t => t.id === activeTab)?.label}
                        </span>
                    </div>
                    <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
                        Análisis Financiero
                    </h1>
                </div>

                {/* Tab Switcher */}
                <div className="mb-6 max-w-full overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    <div className="inline-flex min-w-max items-center gap-1.5 rounded-2xl border border-gray-100/50 bg-white p-1.5 shadow-sm dark:border-transparent dark:bg-[#111827] sm:gap-2">
                        {TABS.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                style={activeTab === tab.id ? { background: 'var(--accent)', boxShadow: '0 4px 14px -4px var(--accent-soft)' } : undefined}
                                className={`flex min-w-[92px] flex-col items-center justify-center gap-1 rounded-xl px-3 py-2.5 text-xs font-semibold transition-all sm:min-w-0 sm:flex-row sm:gap-2 sm:px-5 sm:text-sm ${
                                    activeTab === tab.id
                                        ? 'text-white shadow-sm'
                                        : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-slate-800 dark:hover:text-gray-200'
                                }`}
                            >
                                <Icon icon={tab.icon} className="text-base flex-shrink-0" />
                                <span className="leading-tight">{tab.label}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* ── Tab Content ── */}
            {activeTab === 'rentabilidad' && (
                <div className="px-5 pb-5">
                    <RentabilidadView
                        mesActual={vm.mesActual}
                        anioActual={vm.anioActual}
                        pnl={vm.pnl}
                        evolucion={vm.evolucion}
                        gastos={vm.gastos}
                        ingresos={vm.ingresos}
                        isLoading={vm.isLoading}
                        isModalOpen={vm.isModalOpen}
                        gastoEditando={vm.gastoEditando}
                        isSaving={vm.isSaving}
                        isIngresoModalOpen={vm.isIngresoModalOpen}
                        ingresoEditando={vm.ingresoEditando}
                        isSavingIngreso={vm.isSavingIngreso}
                        isCurrentOrFuture={vm.isCurrentOrFuture}
                        navegarMes={vm.navegarMes}
                        crearGasto={vm.crearGasto}
                        actualizarGasto={vm.actualizarGasto}
                        eliminarGasto={vm.eliminarGasto}
                        abrirModalCrear={vm.abrirModalCrear}
                        abrirModalEditar={vm.abrirModalEditar}
                        cerrarModal={vm.cerrarModal}
                        crearIngreso={vm.crearIngreso}
                        actualizarIngreso={vm.actualizarIngreso}
                        eliminarIngreso={vm.eliminarIngreso}
                        abrirModalCrearIngreso={vm.abrirModalCrearIngreso}
                        abrirModalEditarIngreso={vm.abrirModalEditarIngreso}
                        cerrarModalIngreso={vm.cerrarModalIngreso}
                    />
                </div>
            )}

            {activeTab === 'flujo' && (
                <div className="px-5 pb-5">
                    <FinanceDashboardView />
                </div>
            )}

            {activeTab === 'comisiones' && (
                <div className="px-5 pb-5">
                    <ComisionesView />
                </div>
            )}

            {activeTab === 'categorias' && (
                <div className="px-5 pb-5">
                    <CategoriasView />
                </div>
            )}

            {activeTab === 'metodosPago' && (
                <div className="px-5 pb-5">
                    <MetodosPagoView />
                </div>
            )}

            {activeTab === 'conciliacion' && (
                <div className="px-5 pb-5">
                    <ConciliacionView />
                </div>
            )}
        </div>
    );
}
