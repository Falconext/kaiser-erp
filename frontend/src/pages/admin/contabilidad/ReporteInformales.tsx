"use client";
import { useReporteInformalesViewModel } from '@/features/admin/contabilidad/useContabilidadReporteViewModel';
import DataTable from "@/components/Datatable";
import { Icon } from "@iconify/react";

// ── Reporte Interno — estilo CRM claro (Brix UI) ──────────────────────────────
const ACCENT = 'var(--accent, #7551FF)';

const ReportesComprobantesInformales = () => {
    const vm = useReporteInformalesViewModel();
    const r = vm.resumenReporteInformal;
    const totalRegistros = vm.reports?.length ?? 0;

    const resumenItems: Array<[string, number, string]> = r
        ? [
            ['Tickets', r.totalTickets, 'bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400'],
            ['Notas de Venta', r.totalNotasVenta, 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'],
            ['Recibos por Honorarios', r.totalRecibosHonorarios, 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400'],
            ['Comprobantes de Pago', r.totalComprobantesPago, 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400'],
            ['Notas de Pedido', r.totalNotasPedido, 'bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400'],
            ['Órdenes de Trabajo', r.totalOrdenesTrabajo, 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400'],
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
                <span className="font-semibold" style={{ color: ACCENT }}>Reporte Interno</span>
            </div>

            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-5">
                <div className="flex items-center gap-3 min-w-0">
                    <div className="h-11 w-11 grid place-items-center rounded-2xl bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400 shrink-0">
                        <Icon icon="solar:chart-square-bold-duotone" className="text-2xl" />
                    </div>
                    <div className="min-w-0">
                        <h1 className="text-[22px] font-extrabold text-slate-800 dark:text-white tracking-tight truncate">Reporte Interno</h1>
                        <p className="text-sm text-slate-400 dark:text-gray-400 mt-0.5">Ventas internas y documentos informales</p>
                    </div>
                </div>
                <button
                    type="button"
                    onClick={vm.handleExport}
                    className="h-11 px-4 rounded-2xl text-white text-sm font-bold flex items-center gap-1.5 shadow-lg shadow-violet-500/30 hover:brightness-105 transition-all shrink-0"
                    style={{ background: ACCENT }}
                >
                    <Icon icon="solar:export-bold" className="text-lg" />
                    Exportar Excel
                </button>
            </div>

            {/* Card contenedora */}
            <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-[0_2px_20px_rgba(15,23,42,0.05)] dark:shadow-none overflow-hidden">
                {vm.reports?.length > 0 ? (
                    <>
                        {/* Toolbar */}
                        <div className="flex flex-wrap items-center gap-2.5 p-4 border-b border-slate-100 dark:border-slate-700">
                            <span className="inline-flex items-center gap-2 h-9 px-3.5 rounded-xl bg-violet-50 dark:bg-violet-900/20 text-sm font-bold" style={{ color: ACCENT }}>
                                <Icon icon="solar:document-text-linear" />
                                {totalRegistros.toLocaleString('es-PE')} comprobante{totalRegistros === 1 ? '' : 's'}
                            </span>
                            <span className="text-sm text-slate-400 dark:text-gray-400 font-medium px-1 hidden sm:inline">Detalle de documentos internos</span>
                        </div>

                        {/* Tabla (componente compartido) */}
                        <div className="overflow-hidden overflow-x-scroll md:overflow-x-visible px-1 py-2">
                            <DataTable actions={[]} bodyData={vm.reports} headerColumns={[
                                { label: 'Sede', key: 'sede' },
                                { label: 'Comprobante', key: 'comprobante' },
                                { label: 'Serie', key: 'serie' },
                                { label: 'Correlativo', key: 'correlativo' },
                                { label: 'Nro. Documento', key: 'ruc' },
                                { label: 'Cliente', key: 'cliente' },
                                { label: 'Fecha', key: 'fecha' },
                                { label: 'Estado Pago', key: 'estadoPago' },
                                { label: 'Saldo', key: 'saldo' },
                                { label: 'Medio Pago', key: 'medioPago' },
                                { label: 'Estado OT', key: 'estadoOT' },
                                { label: 'Adelanto', key: 'adelanto' },
                                { label: 'Total', key: 'total' },
                            ]} />
                        </div>

                        {/* Resumen */}
                        {r !== null && (
                            <div className="flex justify-end p-4 border-t border-slate-100 dark:border-slate-700">
                                <div className="w-full sm:min-w-[320px] sm:w-auto bg-[#F7F8FB] dark:bg-slate-800/50 p-5 rounded-2xl border border-slate-100 dark:border-slate-700">
                                    <p className="text-xs font-bold uppercase tracking-wide text-slate-400 dark:text-gray-400 mb-3">Resumen del período</p>
                                    {resumenItems.map(([label, val, chip]) => (
                                        <div key={label} className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-700 last:border-0">
                                            <span className="flex items-center gap-2 text-sm text-slate-500 dark:text-gray-400">
                                                <span className={`h-6 w-6 grid place-items-center rounded-lg ${chip}`}>
                                                    <Icon icon="solar:tag-linear" className="text-xs" />
                                                </span>
                                                {label}
                                            </span>
                                            <span className="text-sm font-bold text-slate-800 dark:text-white">S/ {val.toFixed(2)}</span>
                                        </div>
                                    ))}
                                    <div className="flex items-center justify-between pt-4 mt-2 border-t-2 border-slate-200 dark:border-slate-700">
                                        <span className="text-base font-extrabold text-slate-800 dark:text-white">Total</span>
                                        <strong className="text-lg font-extrabold" style={{ color: ACCENT }}>S/ {r.totalVenta.toFixed(2)}</strong>
                                    </div>
                                </div>
                            </div>
                        )}
                    </>
                ) : (
                    <div className="py-20 text-center">
                        <Icon icon="solar:chart-2-linear" className="text-5xl text-slate-200 dark:text-gray-600 mx-auto mb-3" />
                        <p className="text-slate-500 dark:text-gray-400 text-sm font-semibold">No se encontraron comprobantes</p>
                        <p className="text-sm text-slate-400 dark:text-gray-400 mt-1">Selecciona un rango de fechas diferente</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ReportesComprobantesInformales;
