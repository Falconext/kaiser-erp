import Select from "@/components/Select";
import InputPro from "@/components/InputPro";
import { Icon } from "@iconify/react";
import { useState } from "react";
import { EnvioModal } from "./EnvioModal";
import { Calendar } from "@/components/Date";
import moment from "moment";

const COURIER_LABELS: Record<string, string> = {
    SHALOM_PRO: 'Shalom PRO', SHALOM_COD: 'Shalom COD', OLVA: 'Olva',
    URBANO: 'Urbano', CRUZ_SUR: 'Cruz del Sur', PROPIOS: 'Propio', OTRO: 'Otro',
};

function EnvioTrigger({ vm }: { vm: any }) {
    const { envioActivo, setEnvioActivo, envioData } = vm;
    const [open, setOpen] = useState(false);
    const courier = COURIER_LABELS[envioData?.transportista] ?? '';

    return (
        <>
            <button
                type="button"
                onClick={() => setOpen(true)}
                className={`mt-2 w-full flex items-center justify-between px-3 py-2 rounded-2xl border transition-all ${
                    envioActivo
                        ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-700'
                        : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-600'
                }`}
            >
                <span className="flex items-center gap-2">
                    <Icon icon="solar:delivery-bold-duotone" className={`text-base ${envioActivo ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-400'}`} />
                    <span className={`text-sm font-semibold ${envioActivo ? 'text-indigo-700 dark:text-indigo-300' : 'text-gray-500 dark:text-gray-400'}`}>
                        Coordinación de Envío
                    </span>
                    {envioActivo && (
                        <span className="text-[10px] bg-indigo-600 text-white px-2 py-0.5 rounded-full font-black">ACTIVO</span>
                    )}
                </span>
                <div className="flex items-center gap-2">
                    {envioActivo && courier && (
                        <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400">{courier}</span>
                    )}
                    {envioActivo ? (
                        <button
                            type="button"
                            onClick={e => { e.stopPropagation(); setEnvioActivo(false); }}
                            className="text-[10px] text-red-500 hover:text-red-700 font-black px-1.5 rounded hover:bg-red-50 transition-colors"
                        >
                            Quitar
                        </button>
                    ) : (
                        <Icon icon="solar:alt-arrow-right-linear" className="text-gray-400 text-sm" />
                    )}
                </div>
            </button>
            {open && <EnvioModal vm={vm} onClose={() => setOpen(false)} />}
        </>
    );
}

function OperacionFiscalTrigger({ vm }: { vm: any }) {
    const [open, setOpen] = useState(false);

    const tipoActual = vm.tiposOperacion?.find((op: any) => Number(op.id) === Number(vm.formValues?.tipoOperacionId));
    const esDetraccion = tipoActual?.codigo === '0112';
    const esDefault = tipoActual?.codigo === '0101' || !tipoActual;
    const tieneDetraccion = esDetraccion && vm.tipoDetraccionId;
    const tieneRetencion = !!vm.retencionData;
    const mostrarRetencion = !esDetraccion && vm.totalAdjusted >= 700 && vm.auth?.empresa?.esAgenteRetencion;
    const activo = tieneDetraccion || tieneRetencion;

    return (
        <>
            <button
                type="button"
                onClick={() => setOpen(true)}
                className={`mt-2 w-full flex items-center justify-between px-3 py-2 rounded-2xl border transition-all ${
                    activo
                        ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-700'
                        : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 hover:border-orange-300 dark:hover:border-orange-700'
                }`}
            >
                <span className="flex items-center gap-2">
                    <Icon
                        icon="solar:calculator-bold-duotone"
                        className={`text-base ${activo ? 'text-orange-600 dark:text-orange-400' : 'text-gray-400'}`}
                    />
                    <span className={`text-sm font-semibold ${activo ? 'text-orange-700 dark:text-orange-300' : 'text-gray-500 dark:text-gray-400'}`}>
                        Operación Fiscal
                    </span>
                    {activo && (
                        <span className="text-[10px] bg-orange-600 text-white px-2 py-0.5 rounded-full font-black">
                            {tieneDetraccion ? 'DETRACCIÓN' : 'RETENCIÓN'}
                        </span>
                    )}
                    {!activo && !esDefault && (
                        <span className="text-[10px] text-orange-600 dark:text-orange-400 font-semibold truncate max-w-[120px]">
                            {tipoActual?.descripcion}
                        </span>
                    )}
                </span>
                <Icon icon="solar:alt-arrow-right-linear" className="text-gray-400 text-sm flex-shrink-0" />
            </button>

            {/* Modal overlay — se oculta cuando el modal de detracción está abierto */}
            {open && !vm.isModalDetraccionOpen && (
                <div className="fixed inset-0 z-[200] flex items-end md:items-center justify-center">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setOpen(false)} />
                    <div className="relative w-full md:w-[420px] bg-white dark:bg-[#1E2435] rounded-t-3xl md:rounded-3xl shadow-2xl p-6 space-y-4 max-h-[85vh] overflow-y-auto">
                        {/* Header */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                                <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-xl">
                                    <Icon icon="solar:calculator-bold-duotone" className="text-orange-600 dark:text-orange-400 text-xl" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900 dark:text-white text-base">Operación Fiscal</h3>
                                    <p className="text-[11px] text-gray-500 dark:text-gray-400">Tipo de operación, detracción y retención</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setOpen(false)}
                                className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-400 transition-colors"
                            >
                                <Icon icon="solar:close-circle-bold" className="text-xl" />
                            </button>
                        </div>

                        {/* Tipo de Operación */}
                        <div>
                            <Select
                                value={tipoActual?.descripcion || ''}
                                options={vm.tiposOperacion?.map((op: any) => ({ id: op.id, value: op.descripcion })) || []}
                                label="Tipo de Operación"
                                id="tipoOperacionId"
                                name="tipoOperacion"
                                onChange={(idVal) => {
                                    const newId = Number(idVal);
                                    const updatedForm = { ...vm.formValues, tipoOperacionId: newId };
                                    const selectedOp = vm.tiposOperacion?.find((op: any) => Number(op.id) === newId);
                                    if (selectedOp?.codigo !== '0112') {
                                        vm.setTipoDetraccionId(undefined);
                                        vm.setMedioPagoDetraccionId(undefined);
                                        vm.setPorcentajeDetraccion(0);
                                        vm.setCuentaBancoNacion('');
                                    } else {
                                        vm.setIsModalDetraccionOpen(true);
                                    }
                                    vm.setRetencionData(null);
                                    vm.setFormValues(updatedForm);
                                }}
                                error=""
                                isIcon
                                icon="solar:bill-list-linear"
                                isSearch
                            />
                        </div>

                        {/* Detracción */}
                        {esDetraccion && (
                            <div className="space-y-2">
                                <button
                                    type="button"
                                    onClick={() => vm.setIsModalDetraccionOpen(true)}
                                    className="w-full p-3 bg-gray-50 dark:bg-slate-800 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-xl border border-gray-200 dark:border-slate-700 flex items-center justify-between group transition-all"
                                >
                                    <div className="flex items-center gap-2">
                                        <Icon icon="solar:settings-bold" className="text-gray-600 dark:text-gray-400" width={16} />
                                        <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">Configurar Detracción</span>
                                    </div>
                                    <Icon icon="solar:alt-arrow-right-linear" className="text-gray-400 group-hover:translate-x-1 transition-transform" width={16} />
                                </button>
                                {tieneDetraccion && (
                                    <div className="flex items-center justify-between bg-green-50 dark:bg-green-900/20 p-2.5 rounded-xl border border-green-200 dark:border-green-800/40">
                                        <div className="flex items-center gap-2">
                                            <Icon icon="solar:check-circle-bold" className="text-green-600" width={16} />
                                            <span className="text-xs font-medium text-green-700 dark:text-green-400 truncate max-w-[180px]">
                                                {vm.tiposDetraccion?.find((t: any) => t.id === vm.tipoDetraccionId)?.descripcion || 'Configurado'}
                                            </span>
                                        </div>
                                        <span className="text-xs font-bold text-green-800 dark:text-green-300 flex-shrink-0">S/ {vm.montoDetraccion?.toFixed(2)}</span>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Retención 3% */}
                        {mostrarRetencion && (
                            <div className="space-y-2">
                                <button
                                    type="button"
                                    onClick={() => vm.setIsModalRetencionOpen(true)}
                                    className="w-full p-3 bg-gray-50 dark:bg-slate-800 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-xl border border-gray-200 dark:border-slate-700 flex items-center justify-between group transition-all"
                                >
                                    <div className="flex items-center gap-2">
                                        <Icon icon="solar:percent-circle-bold" className="text-gray-600 dark:text-gray-400" width={16} />
                                        <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">Configurar Retención 3%</span>
                                    </div>
                                    <Icon icon="solar:alt-arrow-right-linear" className="text-gray-400 group-hover:translate-x-1 transition-transform" width={16} />
                                </button>
                                {tieneRetencion && (
                                    <div className="flex items-center justify-between bg-gray-100 dark:bg-slate-700 p-2.5 rounded-xl border border-gray-200 dark:border-slate-600">
                                        <div className="flex items-center gap-2">
                                            <Icon icon="solar:check-circle-bold" className="text-gray-700 dark:text-gray-300" width={16} />
                                            <span className="text-xs font-medium text-gray-800 dark:text-gray-200">Ret. IGV (3%)</span>
                                        </div>
                                        <span className="text-xs font-bold text-gray-800 dark:text-gray-200">S/ {vm.retencionData?.montoDetraccion?.toFixed(2)}</span>
                                    </div>
                                )}
                            </div>
                        )}

                        <button
                            onClick={() => setOpen(false)}
                            className="w-full py-2.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-2xl font-bold text-sm hover:opacity-90 transition-opacity"
                        >
                            Listo
                        </button>
                    </div>
                </div>
            )}
        </>
    );
}

export const POSOptionsForm = ({ vm, onOpenComprobanteModal }: { vm: any; onOpenComprobanteModal?: () => void }) => {
    return (
        <div className="p-4 md:p-5 bg-white dark:bg-[#111827]">
            <div className="mb-4 rounded-2xl border border-slate-100 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/40">
                <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                        <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">Comprobante</p>
                        <p className="truncate text-sm font-extrabold text-slate-800 dark:text-slate-100">{vm.formValues?.comprobante || 'Seleccionar comprobante'}</p>
                    </div>
                    {onOpenComprobanteModal && (
                        <button
                            type="button"
                            onClick={onOpenComprobanteModal}
                            className="shrink-0 rounded-xl bg-white px-3 py-1.5 text-xs font-bold text-violet-600 shadow-sm ring-1 ring-slate-200 transition hover:bg-violet-50 dark:bg-slate-800 dark:ring-slate-700"
                        >
                            Cambiar
                        </button>
                    )}
                </div>
            </div>

            {/* Cotización: incluir imágenes */}
            {vm.isQuotationRoute && (
                <div className="mt-2 flex items-center gap-2">
                    <input
                        type="checkbox"
                        id="includeImages"
                        checked={vm.includeProductImages}
                        onChange={(e) => vm.setIncludeProductImages(e.target.checked)}
                        className="w-4 h-4 text-gray-900 dark:text-white bg-gray-100 dark:bg-slate-800 border-gray-300 dark:border-slate-700 rounded focus:ring-gray-900"
                        style={{ accentColor: '#1C1C24' }}
                    />
                    <label htmlFor="includeImages" className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer select-none flex items-center gap-1">
                        <Icon icon="solar:gallery-bold-duotone" className="text-gray-900 dark:text-gray-100" />
                        Incluir imágenes del producto
                    </label>
                </div>
            )}

            {/* Fecha de Emisión retroactiva */}
            {vm.fechaEmisionDiasAtras > 0 && !vm.isQuotationRoute && (
                <div className="mt-2">
                    <div className="flex items-center justify-between mb-1.5">
                        <label className="flex items-center gap-1.5 text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            <Icon icon="solar:calendar-bold-duotone" width={13} className="text-violet-500" />
                            Fecha de Emisión
                        </label>
                        <span className="text-[10px] text-gray-400 dark:text-slate-500 font-medium">
                            Hasta {vm.fechaEmisionDiasAtras} días atrás (SUNAT)
                        </span>
                    </div>
                    <Calendar
                        value={vm.fechaEmisionManual ? moment(vm.fechaEmisionManual, 'YYYY-MM-DD').format('DD/MM/YYYY') : ''}
                        withOutFormat={true}
                        onChange={(val) => {
                            if (val >= vm.fechaEmisionMinDate && val <= vm.fechaEmisionMaxDate) {
                                vm.setFechaEmisionManual(val);
                            }
                        }}
                        portal={true}
                        className="w-full"
                    />
                    {vm.fechaEmisionManual !== vm.fechaEmisionMaxDate && (
                        <div className="mt-1.5 flex items-center gap-1.5 px-2.5 py-1.5 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40 rounded-xl">
                            <Icon icon="solar:clock-circle-bold-duotone" width={13} className="text-amber-500 flex-shrink-0" />
                            <p className="text-[10px] text-amber-700 dark:text-amber-400 font-semibold">Emitiendo con fecha retroactiva</p>
                        </div>
                    )}
                </div>
            )}

            {/* Operación Fiscal — trigger modal (Tipo de Operación + Detracción + Retención) */}
            {(vm.formValues?.comprobante === "FACTURA" || vm.isQuotationRoute) && (
                <OperacionFiscalTrigger vm={vm} />
            )}

            {/* Coordinación de Envío */}
            {vm.formValues?.comprobante !== "NOTA DE CREDITO" && vm.formValues?.comprobante !== "NOTA DE DEBITO" && (
                <div className={vm.esInformal ? 'mt-3 rounded-2xl border-2 border-indigo-200 dark:border-indigo-700 bg-indigo-50/50 dark:bg-indigo-900/20 p-1' : ''}>
                    {vm.esInformal && (
                        <p className="text-[10px] font-black text-indigo-500 dark:text-indigo-400 uppercase tracking-wider px-2 pt-1.5 pb-0.5">
                            Datos de envío
                        </p>
                    )}
                    <EnvioTrigger vm={vm} />
                </div>
            )}

            {/* Moneda del documento (cotización o comprobante) — S/ o US$ (facturas de exportación en USD) */}
            {(vm.isQuotationRoute || vm.esFacturaOBoleta) && (
                <div className="mt-3">
                    <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Moneda{vm.isQuotationRoute ? '' : ' del comprobante'}</label>
                    <div className="flex rounded-xl overflow-hidden border border-gray-200 dark:border-slate-700 h-9">
                        {([['PEN', 'Soles (S/)'], ['USD', 'Dólares (US$)']] as const).map(([code, label]) => (
                            <button
                                key={code}
                                type="button"
                                onClick={() => vm.handleChangeQuotationCurrency(code)}
                                className={`flex-1 text-xs font-bold transition-colors ${
                                    String(vm.quotationCurrency).toUpperCase() === code
                                        ? 'bg-violet-600 text-white'
                                        : 'bg-white dark:bg-slate-800 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-700'
                                }`}
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Descuento global — % / S/ / $ para todos los comprobantes (boleta, factura e informales) */}
            {!vm.isQuotationRoute && !['NP', '07', '08'].includes(vm.formValues?.tipoDoc) && (
                <div className="mt-2 space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <div className="flex items-center justify-between mb-1">
                                <label className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Descuento</label>
                                <div className="flex rounded-lg overflow-hidden border border-gray-200 dark:border-slate-700 h-5">
                                    {(['PCT', 'SOLES'] as const).map(modo => (
                                        <button
                                            key={modo}
                                            type="button"
                                            onClick={() => {
                                                vm.setDescuentoModoNV(modo);
                                                vm.setDescuentoPctNV(0);
                                                vm.setDescuentoSolesNV(0);
                                            }}
                                            className={`px-2 text-[10px] font-bold transition-colors ${
                                                vm.descuentoModoNV === modo
                                                    ? 'bg-violet-600 text-white'
                                                    : 'bg-white dark:bg-slate-800 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-700'
                                            }`}
                                        >
                                            {modo === 'PCT' ? '%' : vm.monedaSimbolo}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="relative">
                                {vm.descuentoModoNV === 'PCT' ? (
                                    <>
                                        <input
                                            type="number"
                                            min={0} max={100} step={0.5}
                                            value={vm.descuentoPctNV || ''}
                                            onChange={e => vm.setDescuentoPctNV(Math.min(100, Math.max(0, Number(e.target.value))))}
                                            placeholder="0"
                                            className="w-full h-9 pl-3 pr-7 text-sm rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-800 dark:text-white outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-400/20 transition-all"
                                        />
                                        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-bold">%</span>
                                    </>
                                ) : (
                                    <>
                                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-bold">{vm.monedaSimbolo}</span>
                                        <input
                                            type="number"
                                            min={0} step={0.01}
                                            value={vm.descuentoSolesNV || ''}
                                            onChange={e => vm.setDescuentoSolesNV(Math.max(0, Number(e.target.value)))}
                                            placeholder="0.00"
                                            className={`w-full h-9 ${vm.monedaSimbolo?.length > 2 ? 'pl-10' : 'pl-7'} pr-3 text-sm rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-800 dark:text-white outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-400/20 transition-all`}
                                        />
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Condición de Pago (aplica para documentos de venta, incluidos informales) */}
            {vm.formValues?.comprobante !== "NOTA DE CREDITO" && vm.formValues?.comprobante !== "NOTA DE DEBITO" && vm.formValues?.tipoDoc !== 'COT' && (
                <div className="mt-3 space-y-2">
                    <div>
                        <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Condición de Pago</label>
                        <div className="flex gap-1.5">
                            {['Contado', 'Crédito'].map(c => (
                                <button
                                    key={c}
                                    type="button"
                                    onClick={() => {
                                        vm.setFormValues({ ...vm.formValues, medioPago: c });
                                        if (c === 'Contado') vm.setFechaVencimientoCredito('');
                                    }}
                                    className={`flex-1 h-9 rounded-xl text-xs font-bold border transition-all ${
                                        (vm.formValues?.medioPago === c || (!vm.formValues?.medioPago && c === 'Contado'))
                                            ? 'bg-violet-600 text-white border-violet-600 shadow-sm'
                                            : 'bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-slate-700 hover:border-violet-400'
                                    }`}
                                >
                                    {c}
                                </button>
                            ))}
                        </div>
                    </div>
                    {vm.formValues?.medioPago === 'Crédito' && (
                        <div>
                            <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Fecha de Vencimiento / Cuota única</label>
                            <Calendar
                                value={vm.fechaVencimientoCredito ? moment(vm.fechaVencimientoCredito, 'YYYY-MM-DD').format('DD/MM/YYYY') : ''}
                                withOutFormat={true}
                                onChange={(val) => vm.setFechaVencimientoCredito(val)}
                                portal={true}
                                className="w-full"
                            />
                            {vm.formValues?.tipoDoc !== 'COT' && (
                                <>
                                    {/* Pago inicial (adelanto) del crédito */}
                                    <div className="mt-3">
                                        <div className="flex items-center justify-between mb-1">
                                            <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Pago inicial (opcional)</label>
                                            <button
                                                type="button"
                                                onClick={() => vm.setIsMixedPayment(!vm.isMixedPayment)}
                                                className={`flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all border ${vm.isMixedPayment ? 'bg-violet-500 text-white border-violet-500' : 'bg-white dark:bg-slate-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-slate-700 hover:border-violet-400'}`}
                                            >
                                                <Icon icon="solar:card-2-bold-duotone" width={12} />
                                                Mixto
                                            </button>
                                        </div>
                                        {!vm.isMixedPayment ? (
                                            <div className="flex gap-2">
                                                <input
                                                    type="number"
                                                    min="0"
                                                    step="0.01"
                                                    placeholder="S/ 0.00"
                                                    value={vm.adelanto || ''}
                                                    onChange={(e) => vm.setAdelanto(Number(e.target.value) || 0)}
                                                    className="flex-1 px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-gray-800 dark:text-gray-100 focus:outline-none focus:border-violet-500"
                                                />
                                                <select
                                                    value={vm.adelantoMetodo}
                                                    onChange={(e) => vm.setAdelantoMetodo(e.target.value)}
                                                    className="px-2 py-2 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-gray-800 dark:text-gray-100 focus:outline-none focus:border-violet-500"
                                                >
                                                    {['Efectivo', 'Yape', 'Plin', 'Transferencia', 'Tarjeta'].map(m => (
                                                        <option key={m} value={m}>{m}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        ) : (
                                            <div className="space-y-2">
                                                {(vm.splitPayments || []).map((line: any, idx: number) => (
                                                    <div key={idx} className="flex gap-2">
                                                        <select
                                                            value={line.method}
                                                            onChange={(e) => vm.setSplitPayments((curr: any[]) => curr.map((l, i) => i === idx ? { ...l, method: e.target.value } : l))}
                                                            className="px-2 py-2 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-gray-800 dark:text-gray-100 focus:outline-none focus:border-violet-500"
                                                        >
                                                            {['Efectivo', 'Yape', 'Plin', 'Transferencia', 'Tarjeta'].map(m => (
                                                                <option key={m} value={m}>{m}</option>
                                                            ))}
                                                        </select>
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            step="0.01"
                                                            placeholder="S/ 0.00"
                                                            value={line.amount || ''}
                                                            onChange={(e) => vm.setSplitPayments((curr: any[]) => curr.map((l, i) => i === idx ? { ...l, amount: Number(e.target.value) || 0 } : l))}
                                                            className="flex-1 px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-gray-800 dark:text-gray-100 focus:outline-none focus:border-violet-500"
                                                        />
                                                        {(vm.splitPayments || []).length > 1 && (
                                                            <button type="button" onClick={() => vm.setSplitPayments((curr: any[]) => curr.filter((_, i) => i !== idx))} className="px-2 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20">
                                                                <Icon icon="solar:trash-bin-trash-bold" width={16} />
                                                            </button>
                                                        )}
                                                    </div>
                                                ))}
                                                <button type="button" onClick={() => vm.setSplitPayments((curr: any[]) => [...curr, { method: 'Efectivo', amount: 0 }])} className="text-[11px] font-bold text-violet-600 dark:text-violet-400 hover:underline">
                                                    + Agregar método
                                                </button>
                                                <div className="text-[10px] text-gray-500 dark:text-gray-400">Inicial total: S/ {(vm.splitPayments || []).reduce((s: number, l: any) => s + (Number(l.amount) || 0), 0).toFixed(2)}</div>
                                            </div>
                                        )}
                                        <p className="mt-1 text-[10px] text-gray-400">Si el cliente abona una parte ahora; el resto queda a crédito.</p>
                                    </div>
                                    <div className="mt-3">
                                        <button
                                            type="button"
                                            onClick={() => vm.setIsModalCuotasOpen(true)}
                                            className="w-full p-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 rounded-lg border border-indigo-200 dark:border-indigo-800/30 text-xs font-bold hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors flex items-center justify-center gap-1.5"
                                        >
                                            <Icon icon="solar:list-bold" width={16} />
                                            Configurar Múltiples Cuotas {vm.cuotas?.length > 0 ? `(${vm.cuotas.length})` : ''}
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Nota de Crédito / Débito */}
            {(vm.formValues?.comprobante === "NOTA DE CREDITO" || vm.formValues?.comprobante === "NOTA DE DEBITO") && (
                <div className="mt-4 p-4 bg-white dark:bg-[#1E2435] rounded-2xl border border-gray-100 dark:border-transparent shadow-sm space-y-4">
                    <div className="flex items-center gap-2 mb-2 pb-2 border-b border-gray-50 dark:border-slate-800">
                        <div className="p-1.5 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                            <Icon icon="solar:file-check-bold-duotone" className="text-amber-600 dark:text-amber-400" width={18} />
                        </div>
                        <h4 className="font-bold text-gray-700 dark:text-white text-sm">Documento a Modificar</h4>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="col-span-1">
                            <Select
                                label="Tipo Documento"
                                value={vm.receiptsToNote.find((r: any) => r.id === vm.receiptNoteId)?.value || ""}
                                options={vm.receiptsToNote.map((r: any) => ({ id: r.id, value: r.value }))}
                                id="receiptNoteId" name="receiptNoteId"
                                onChange={(id: any) => vm.setReceiptNoteId(id)}
                                error="" isIcon icon="solar:file-text-linear"
                            />
                        </div>
                        <div className="col-span-1">
                            <Select
                                label="Motivo / Operación"
                                value={((vm.typesOperation as any[])?.find((op: any) => op.id === Number(vm.formValues.motivoId))?.descripcion) || ""}
                                options={(vm.typesOperation as any[])?.map((item: any) => ({ id: item.id, value: item.descripcion })) || []}
                                id="motivoId" name="motivo"
                                onChange={(idValue) => {
                                    const selectedId = Number(idValue);
                                    const selected: any = vm.typesOperation?.find((op: any) => op.id === selectedId);
                                    if (selected) vm.handleChangeSelect(selectedId, selected.descripcion, 'motivo', 'motivoId');
                                }}
                                error="" isSearch isIcon icon="solar:list-check-linear" left
                            />
                        </div>
                        <div className="col-span-1">
                            <InputPro
                                label="Serie" value={vm.serie}
                                onChange={(e) => vm.setSerie(e.target.value.toUpperCase())}
                                name="serie" placeholder="F001" isLabel uppercase className="uppercase"
                            />
                        </div>
                        <div className="col-span-1 relative flex gap-2">
                            <div className="flex-1">
                                <InputPro
                                    label="Correlativo" value={vm.correlative}
                                    onChange={(e) => vm.setCorrelative(e.target.value)}
                                    name="correlative" placeholder="00000001" isLabel type="number"
                                />
                            </div>
                            <button
                                onClick={() => vm.getInvoiceBySerieCorrelative(vm.serie.toUpperCase(), vm.correlative, vm.formValues.motivoId)}
                                className="absolute right-0 bottom-0 h-[46px] w-[46px] flex items-center justify-center bg-gray-900 hover:bg-black text-white rounded-xl transition-all active:scale-95"
                                title="Buscar Documento"
                            >
                                <Icon icon="solar:magnifer-bold" className="text-xl" />
                            </button>
                        </div>
                    </div>
                    {vm.invoiceData && (
                        <div className="flex items-center justify-between bg-emerald-50 border border-emerald-100 rounded-xl p-3 animate-in fade-in zoom-in-95 duration-200">
                            <div className="flex items-center gap-3">
                                <div className="h-8 w-8 rounded-full bg-emerald-100 flex items-center justify-center">
                                    <Icon icon="solar:check-circle-bold" className="text-emerald-500" width={18} />
                                </div>
                                <div>
                                    <div className="font-bold text-gray-700 text-sm">{vm.invoiceData?.serie}-{String(vm.invoiceData?.correlativo).padStart(8, '0')}</div>
                                    <div className="text-[11px] text-emerald-600 font-medium truncate max-w-[150px]">{vm.invoiceData?.cliente?.nombre}</div>
                                </div>
                            </div>
                            <div className="text-right">
                                <span className="text-gray-400 text-[10px] uppercase font-bold tracking-wider">Total</span>
                                <div className="font-black text-gray-800 text-lg leading-none">S/ {Number(vm.invoiceData?.mtoImpVenta || 0).toFixed(2)}</div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Observaciones */}
            <div className="mt-2">
                <label className="flex items-center gap-1.5 text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
                    <Icon icon="solar:notes-bold-duotone" width={13} className="text-amber-500" />
                    Observaciones
                </label>
                <textarea
                    rows={2}
                    value={vm.formValues?.observaciones || ''}
                    onChange={(e) => vm.setFormValues({ ...vm.formValues, observaciones: e.target.value })}
                    placeholder="Notas adicionales que aparecerán en el ticket..."
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-400/30 focus:border-amber-400 resize-none transition-colors"
                />
            </div>
        </div>
    );
};
