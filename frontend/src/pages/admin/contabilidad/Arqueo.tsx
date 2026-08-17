"use client";
import { useArqueoViewModel } from '@/features/admin/contabilidad/useArqueoViewModel';
import Button from "@/components/Button";
import DataTable from "@/components/Datatable";
import { Calendar } from "@/components/Date";
import { Icon } from "@iconify/react";
import Select from "@/components/Select";

const ACCENT = 'var(--accent, #7551FF)';

const ArqueoCaja = () => {
    const vm = useArqueoViewModel();
    const { resumen, isAdmin, esPrincipal, sedesOptions, handleSelectSede } = vm;

    const kpis = resumen
        ? [
            { label: 'Total Efectivo', value: resumen.detalleEfectivo, icon: 'solar:banknote-2-linear', chip: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400', money: true },
            { label: 'Total Digital', value: resumen.totalDigital, icon: 'solar:smartphone-linear', chip: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400', money: true },
            { label: 'Total Tarjetas', value: resumen.totalTarjetas, icon: 'solar:card-linear', chip: 'bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400', money: true },
            { label: 'Comprobantes', value: resumen.totalComprobantes, icon: 'solar:document-text-linear', chip: 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400', money: false },
            { label: 'Total Ingresos', value: resumen.totalIngresos, icon: 'solar:wallet-money-linear', chip: 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400', money: true },
        ]
        : [];

    return (
        <div className="min-h-screen -m-5 p-5 bg-[#F7F8FB] dark:bg-[#0A0D14] font-jakarta">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm text-slate-400 dark:text-gray-400 mb-5">
                <Icon icon="solar:home-smile-linear" className="text-base" />
                <span>Panel</span>
                <Icon icon="solar:alt-arrow-right-linear" className="text-xs" />
                <span>Contabilidad</span>
                <Icon icon="solar:alt-arrow-right-linear" className="text-xs" />
                <span className="font-semibold" style={{ color: ACCENT }}>Arqueo de Caja</span>
            </div>

            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-5">
                <div className="min-w-0">
                    <h1 className="text-[22px] font-extrabold text-slate-800 dark:text-white tracking-tight">Arqueo de Caja</h1>
                    <p className="text-sm text-slate-400 dark:text-gray-400 mt-0.5">Resumen de ingresos y movimientos por medio de pago.</p>
                </div>
                <Button
                    onClick={vm.handleExport}
                    className="h-11 px-4 rounded-2xl text-white text-sm font-bold inline-flex items-center gap-1.5 shadow-lg shadow-violet-500/30 hover:brightness-105 transition-all shrink-0"
                    style={{ background: ACCENT }}
                >
                    <Icon icon="solar:export-bold" className="text-lg" />
                    <span className="hidden sm:inline">Exportar Excel</span>
                </Button>
            </div>

            {/* Filtros */}
            <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-[0_2px_20px_rgba(15,23,42,0.05)] dark:shadow-none p-4 mb-5">
                <div className="flex flex-wrap items-end gap-3">
                    <Calendar name="fechaInicio" onChange={vm.handleDate} text="Fecha inicio" />
                    <Calendar name="fechaFin" onChange={vm.handleDate} text="Fecha Fin" />
                    {isAdmin && esPrincipal && (
                        <div className="min-w-[180px]">
                            <Select error="" label="Sede" name="sedeId" defaultValue="Todas las sedes" onChange={handleSelectSede} options={sedesOptions} />
                        </div>
                    )}
                </div>
            </div>

            {/* KPIs */}
            {resumen && (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-5">
                    {kpis.map((k) => (
                        <div key={k.label} className="bg-white dark:bg-slate-800 rounded-3xl shadow-[0_2px_20px_rgba(15,23,42,0.05)] dark:shadow-none p-5">
                            <div className={`h-11 w-11 rounded-2xl grid place-items-center mb-3 ${k.chip}`}>
                                <Icon icon={k.icon} className="text-xl" />
                            </div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-gray-400">{k.label}</p>
                            <p className="text-2xl font-extrabold text-slate-800 dark:text-white mt-1">
                                {k.money ? `S/ ${Number(k.value).toFixed(2)}` : Number(k.value)}
                            </p>
                        </div>
                    ))}
                </div>
            )}

            {/* Detalle por medio de pago */}
            {resumen && (
                <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-[0_2px_20px_rgba(15,23,42,0.05)] dark:shadow-none p-6 mb-5">
                    <div className="flex items-center gap-2.5 mb-4">
                        <div className="h-8 w-8 rounded-xl grid place-items-center bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400">
                            <Icon icon="solar:wallet-linear" className="text-lg" />
                        </div>
                        <h3 className="text-base font-extrabold text-slate-800 dark:text-white">Detalle por Medio de Pago</h3>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                        {[['Efectivo', resumen.detalleEfectivo], ['Yape', resumen.detalleYape], ['Plin', resumen.detallePlin], ['Transferencia', resumen.detalleTransferencia], ['Tarjeta', resumen.detalleTarjeta]].map(([label, val]) => (
                            <div key={label as string} className="text-center p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700">
                                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-gray-400">{label as string}</p>
                                <p className="text-lg font-extrabold text-slate-800 dark:text-white mt-1">S/ {(val as number).toFixed(2)}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Movimientos */}
            <div className="w-full bg-white dark:bg-slate-800 rounded-3xl shadow-[0_2px_20px_rgba(15,23,42,0.05)] dark:shadow-none p-6">
                <div className="flex items-center gap-2.5 mb-4">
                    <div className="h-8 w-8 rounded-xl grid place-items-center bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400">
                        <Icon icon="solar:sort-by-time-linear" className="text-lg" />
                    </div>
                    <h3 className="text-base font-extrabold text-slate-800 dark:text-white">Movimientos de Caja</h3>
                </div>
                {vm.movimientos?.length > 0 ? (
                    <div className="overflow-hidden overflow-x-scroll md:overflow-x-visible">
                        <DataTable actions={[]} bodyData={vm.movimientos} headerColumns={['Tipo', 'Documento', 'Cliente', 'Fecha', 'Concepto', 'Medio Pago', 'Monto', 'Referencia']} />
                    </div>
                ) : (
                    <div className="py-16 text-center">
                        <Icon icon="solar:wallet-linear" className="text-5xl text-slate-200 dark:text-gray-600 mx-auto mb-3" />
                        <p className="text-slate-500 dark:text-gray-400 font-medium">No hay movimientos de caja</p>
                        <p className="text-sm text-slate-400 dark:text-gray-400 mt-1">Selecciona un rango de fechas diferente</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ArqueoCaja;
