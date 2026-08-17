import { Icon } from '@iconify/react';
import { BRAND } from '@/lib/branding';
import { useLibroControlViewModel } from './useLibroControlViewModel';
import { Calendar } from '@/components/Date';
import Select from '@/components/Select';
import moment from 'moment';

const ACCENT = 'var(--accent, #7551FF)';

export default function LibroControlView() {
    const vm = useLibroControlViewModel();
    const empresa = (vm.auth?.empresa as any);

    const medicamentoOptions = [
        { id: '', value: 'Todos los controlados' },
        ...vm.productosControlados.map(p => ({
            id: p.id,
            value: `${p.descripcion}${p.concentracion ? ` ${p.concentracion}` : ''}`
        }))
    ];
    const selectedMedicamentoValue = vm.productoId === ''
        ? 'Todos los controlados'
        : (medicamentoOptions.find(o => o.id === vm.productoId)?.value || 'Todos los controlados');

    const entradas = vm.movimientos.filter(m => m.tipo === 'ENTRADA').length;
    const salidas = vm.movimientos.filter(m => m.tipo === 'SALIDA').length;

    return (
        <div
            className="min-h-screen -m-5 p-5 bg-[#F7F8FB] dark:bg-[#0A0D14] font-jakarta print:m-0 print:p-4 print:bg-white dark:print:bg-white"
        >
            <style>{`
                @media print {
                    @page { size: A4 landscape; margin: 10mm; }
                    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                    table { page-break-inside: auto; }
                    tr { page-break-inside: avoid; page-break-after: auto; }
                }
            `}</style>

            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm text-slate-400 mb-5 print:hidden">
                <Icon icon="solar:home-smile-linear" className="text-base" />
                <span>Panel</span>
                <Icon icon="solar:alt-arrow-right-linear" className="text-xs" />
                <span>Kardex</span>
                <Icon icon="solar:alt-arrow-right-linear" className="text-xs" />
                <span className="font-semibold" style={{ color: ACCENT }}>Libro de Control</span>
            </div>

            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-5 print:hidden">
                <div className="min-w-0">
                    <h1 className="text-[22px] font-extrabold text-slate-800 dark:text-white tracking-tight">Libro de Control</h1>
                    <p className="text-sm text-slate-400 mt-0.5">
                        Psicotrópicos y Estupefacientes · DS 023-2001-SA
                    </p>
                </div>
                <div className="flex items-center gap-2.5 shrink-0">
                    <button
                        onClick={vm.exportarCSV}
                        className="h-11 px-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/50 text-sm font-bold text-slate-600 dark:text-slate-200 flex items-center gap-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                    >
                        <Icon icon="solar:file-download-linear" className="text-lg" />
                        <span className="hidden sm:inline">Exportar CSV</span>
                    </button>
                    <button
                        onClick={() => window.print()}
                        className="h-11 px-4 rounded-2xl text-white text-sm font-bold flex items-center gap-1.5 shadow-lg shadow-violet-500/30 hover:brightness-105 transition-all"
                        style={{ background: ACCENT }}
                    >
                        <Icon icon="solar:printer-bold" className="text-lg" />
                        <span className="hidden sm:inline">Imprimir</span>
                    </button>
                </div>
            </div>

            {/* Cabecera impresión */}
            <div className="hidden print:block border-b border-black pb-2 mb-2">
                <h2 className="text-xl font-bold text-center text-black">LIBRO DE CONTROL DE PSICOTRÓPICOS Y ESTUPEFACIENTES</h2>
                <p className="text-center text-sm text-black">(DS 023-2001-SA)</p>
                <div className="flex justify-between items-end mt-2 text-xs text-black">
                    <div className="space-y-1">
                        <p><strong>Establecimiento:</strong> {empresa?.razonSocial ?? empresa?.nombre}</p>
                        <p><strong>Dirección:</strong> {empresa?.direccion}</p>
                        <p><strong>Período:</strong> {vm.fechaInicio} al {vm.fechaFin}</p>
                    </div>
                    <div className="space-y-1 text-right">
                        <p><strong>RUC:</strong> {empresa?.ruc ?? empresa?.nroDoc}</p>
                        <p><strong>Director Técnico Q.F.:</strong> {empresa?.directorTecnico ?? '_______________'}</p>
                    </div>
                </div>
            </div>

            {/* Filtros */}
            <div className="bg-white dark:bg-[#111827] rounded-3xl shadow-[0_2px_20px_rgba(15,23,42,0.05)] dark:shadow-none p-4 mb-5 print:hidden">
                <div className="flex flex-wrap gap-3 items-center">
                    <div className="w-40 z-10">
                        <Calendar
                            text="Desde"
                            name="fechaInicio"
                            withOutFormat={true}
                            portal={true}
                            onChange={(date) => vm.setFechaInicio(date)}
                            value={vm.fechaInicio ? moment(vm.fechaInicio).format('DD/MM/YYYY') : ''}
                        />
                    </div>
                    <div className="w-40 z-10">
                        <Calendar
                            text="Hasta"
                            name="fechaFin"
                            withOutFormat={true}
                            portal={true}
                            onChange={(date) => vm.setFechaFin(date)}
                            value={vm.fechaFin ? moment(vm.fechaFin).format('DD/MM/YYYY') : ''}
                        />
                    </div>
                    <div className="w-64 z-20">
                        <Select
                            label="Medicamento"
                            name="productoId"
                            options={medicamentoOptions}
                            value={selectedMedicamentoValue}
                            onChange={(id) => vm.setProductoId(id ? Number(id) : '')}
                            error={null}
                            isSearch={true}
                        />
                    </div>
                </div>
            </div>

            {/* Info legal */}
            <div className="bg-amber-50 dark:bg-amber-900/15 border border-amber-100 dark:border-amber-800/40 rounded-2xl px-4 py-3 flex items-start gap-2.5 mb-5 print:hidden">
                <div className="h-8 w-8 rounded-xl bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 grid place-items-center shrink-0">
                    <Icon icon="solar:info-circle-bold" className="text-lg" />
                </div>
                <p className="text-xs text-amber-700 dark:text-amber-300 leading-relaxed pt-0.5">
                    Este libro incluye solo productos marcados como <strong>Medicamento Controlado</strong> en la ficha del producto. Solo registra movimientos desde el uso de {BRAND.name} — el saldo inicial es 0 (no incluye histórico previo).
                </p>
            </div>

            {/* Tabla */}
            <div className="bg-white dark:bg-[#111827] dark:print:bg-white rounded-3xl shadow-[0_2px_20px_rgba(15,23,42,0.05)] dark:shadow-none overflow-hidden print:shadow-none print:rounded-none">
                {vm.loading ? (
                    <div className="p-4 print:hidden">
                        {Array.from({ length: 6 }).map((_, i) => (
                            <div key={i} className="h-9 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse mb-2 last:mb-0" />
                        ))}
                    </div>
                ) : vm.movimientos.length === 0 ? (
                    <div className="text-center py-16 text-slate-400 print:hidden">
                        <Icon icon="solar:document-medicine-linear" width={48} className="mx-auto mb-3 text-slate-200 dark:text-slate-700" />
                        <p className="font-semibold text-slate-500 dark:text-slate-400">Sin movimientos de medicamentos controlados</p>
                        <p className="text-sm mt-1">Verifica que los productos estén marcados como "Controlado" en su ficha</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto print:overflow-visible">
                        <table className="w-full text-xs print:border-collapse print:border print:border-black">
                            <thead className="print:text-[7px]">
                                <tr className="border-b border-slate-100 dark:border-slate-800 print:bg-transparent">
                                    {['N°', 'Fecha', 'Tipo', 'Proveedor / Paciente', 'DNI / RUC', 'N° Receta / Comprobante', 'Médico', 'Medicamento', 'Conc.', 'F. Farm.', 'Lote', 'Entrada', 'Salida', 'Saldo'].map(h => (
                                        <th key={h} className={`text-left text-[11px] print:text-[7px] font-bold text-slate-400 print:text-black uppercase tracking-wide px-3 py-3 print:px-1 print:py-1 print:border print:border-black first:pl-5 last:pr-5 print:first:pl-1 print:last:pr-1 whitespace-nowrap ${h === 'N°' ? 'print:hidden' : ''}`}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="print:text-[7px]">
                                {vm.movimientos.map((m, i) => (
                                    <tr key={i} className="border-b border-slate-50 dark:border-slate-800/60 hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors print:bg-transparent">
                                        <td className="px-3 py-2.5 print:hidden pl-5 text-slate-400 font-mono">{i + 1}</td>
                                        <td className="px-3 py-2.5 print:px-1 print:py-1 print:border print:border-black whitespace-nowrap text-slate-600 dark:text-slate-300 print:text-black dark:print:text-black print:pl-1">
                                            {new Date(m.fecha).toLocaleDateString('es-PE')}
                                        </td>
                                        <td className="px-3 py-2.5 print:px-1 print:py-1 print:border print:border-black text-center">
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] print:text-[7px] font-semibold print:font-normal print:bg-transparent dark:print:bg-transparent print:p-0 print:text-black dark:print:text-black ${m.tipo === 'ENTRADA' ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400' : 'bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400'}`}>
                                                <span className={`w-1.5 h-1.5 rounded-full print:hidden ${m.tipo === 'ENTRADA' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                                                {m.tipo}
                                            </span>
                                        </td>
                                        <td className="px-3 py-2.5 print:px-1 print:py-1 print:border print:border-black max-w-[150px] print:max-w-[100px]">
                                            <p className="font-semibold text-slate-700 dark:text-slate-200 print:text-black dark:print:text-black truncate print:whitespace-normal">
                                                {m.tipo === 'ENTRADA' ? m.proveedor : m.paciente}
                                            </p>
                                        </td>
                                        <td className="px-3 py-2.5 print:px-1 print:py-1 print:border print:border-black font-mono text-slate-500 dark:text-slate-400 print:text-black dark:print:text-black print:whitespace-normal print:break-all print:max-w-[50px]">
                                            {m.tipo === 'ENTRADA' ? m.proveedorDoc : m.dniPaciente}
                                        </td>
                                        <td className="px-3 py-2.5 print:px-1 print:py-1 print:border print:border-black font-mono text-slate-500 dark:text-slate-400 print:text-black dark:print:text-black print:whitespace-normal print:break-all print:max-w-[60px]">
                                            {m.tipo === 'ENTRADA' ? m.documento : m.numeroReceta}
                                        </td>
                                        <td className="px-3 py-2.5 print:px-1 print:py-1 print:border print:border-black max-w-[120px] print:max-w-[80px]">
                                            <p className="text-slate-500 dark:text-slate-400 print:text-black dark:print:text-black truncate print:whitespace-normal">{m.medico}</p>
                                        </td>
                                        <td className="px-3 py-2.5 print:px-1 print:py-1 print:border print:border-black max-w-[160px] print:max-w-[100px]">
                                            <p className="font-semibold text-slate-700 dark:text-slate-200 print:text-black dark:print:text-black truncate print:whitespace-normal">{m.productoNombre}</p>
                                        </td>
                                        <td className="px-3 py-2.5 print:px-1 print:py-1 print:border print:border-black text-slate-500 dark:text-slate-400 print:text-black dark:print:text-black print:whitespace-normal print:max-w-[40px]">{m.concentracion}</td>
                                        <td className="px-3 py-2.5 print:px-1 print:py-1 print:border print:border-black text-slate-500 dark:text-slate-400 print:text-black dark:print:text-black print:whitespace-normal print:max-w-[40px]">{m.formaFarmaceutica}</td>
                                        <td className="px-3 py-2.5 print:px-1 print:py-1 print:border print:border-black font-mono text-slate-500 dark:text-slate-400 print:text-black dark:print:text-black print:whitespace-normal print:max-w-[40px]">{m.lote}</td>
                                        <td className="px-3 py-2.5 print:px-1 print:py-1 print:border print:border-black font-bold text-emerald-600 dark:text-emerald-400 print:text-black dark:print:text-black text-right print:font-normal">
                                            {m.tipo === 'ENTRADA' ? m.cantidad : ''}
                                        </td>
                                        <td className="px-3 py-2.5 print:px-1 print:py-1 print:border print:border-black font-bold text-rose-600 dark:text-rose-400 print:text-black dark:print:text-black text-right print:font-normal">
                                            {m.tipo === 'SALIDA' ? m.cantidad : ''}
                                        </td>
                                        <td className="px-3 py-2.5 print:px-1 print:py-1 print:border print:border-black pr-5 print:pr-1 font-bold text-slate-800 dark:text-white print:text-black dark:print:text-black text-right print:font-bold">{m.saldo}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Pie de tabla */}
                {vm.movimientos.length > 0 && (
                    <div className="px-5 py-3.5 border-t border-slate-100 flex items-center justify-between gap-3 flex-wrap">
                        <div className="flex items-center gap-2 text-xs">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-semibold bg-emerald-50 text-emerald-600">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> {entradas} entradas
                            </span>
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-semibold bg-rose-50 text-rose-600">
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-500" /> {salidas} salidas
                            </span>
                        </div>
                        <p className="text-xs text-slate-400 print:hidden">
                            Generado: {new Date().toLocaleDateString('es-PE')}
                        </p>
                    </div>
                )}
            </div>

            {/* Firma impresión */}
            <div className="hidden print:grid grid-cols-2 gap-8 mt-16">
                <div className="text-center border-t border-black pt-2">
                    <p className="text-sm font-bold">Director Técnico Q.F.</p>
                    <p className="text-xs">{empresa?.directorTecnico ?? '_______________________'}</p>
                </div>
                <div className="text-center border-t border-black pt-2">
                    <p className="text-sm font-bold">Representante Legal</p>
                    <p className="text-xs">RUC: {empresa?.ruc ?? empresa?.nroDoc ?? '_______________________'}</p>
                </div>
            </div>
        </div>
    );
}
