import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@iconify/react";
import { AnimatePresence, motion } from "framer-motion";
import { useCuentasBancariasStore } from "@/zustand/cuentasBancarias";
import EmitidoContent from "@/pages/admin/facturacion/modalResponseInvoice/EmitidoContent";
import type { PaymentLine } from "../useFacturacionViewModel";

const METODOS = ['Efectivo', 'Yape', 'Plin', 'Transferencia', 'Tarjeta'];

const METODO_LOGOS: Record<string, string> = {
    Efectivo: '/assets/pagos/efectivo.png',
    Yape: '/assets/pagos/yape.png',
    Plin: '/assets/pagos/plin.png',
    Transferencia: '/assets/pagos/transferencia.png',
    Tarjeta: '/assets/pagos/tarjeta.png',
};

export const POSCalculations = ({ vm, printFn, handleOpenNewTab }: { vm: any, printFn: any, handleOpenNewTab: any }) => {
    const total: number = vm.totalAdjusted ?? 0;
    const { cuentas, listar } = useCuentasBancariasStore();
    const cuentasActivas = cuentas.filter((cuenta) => cuenta.activo !== false);
    // Modal "Continuar pago": tipos de pago (izq) + preview del comprobante (der)
    const [showPago, setShowPago] = useState(false);

    useEffect(() => {
        listar();
    }, [listar]);

    // Farmacia: ítems con receta pendiente
    const recetasPendientes = vm.isFarmaciaRetail
        ? (vm.productsInvoice || []).filter((p: any) => p.pendienteReceta).length
        : 0;
    const hayRecetasPendientes = recetasPendientes > 0;
    const hayProductos = Array.isArray(vm.productsInvoice) && vm.productsInvoice.length > 0;

    // Split payment helpers
    const splitTotal = (vm.splitPayments as PaymentLine[])
        .reduce((s, p) => s + (Number(p.amount) || 0), 0);
    const splitRemaining = Math.max(0, total - splitTotal);
    const splitExcess = Math.max(0, splitTotal - total);
    const splitCashTotal = (vm.splitPayments as PaymentLine[])
        .filter((p) => String(p.method).trim().toUpperCase() === 'EFECTIVO')
        .reduce((s, p) => s + (Number(p.amount) || 0), 0);
    const splitValid = Math.abs(splitTotal - total) < 0.01 || (splitExcess > 0 && splitCashTotal + 0.01 >= splitExcess);
    const splitChange = splitValid ? Number(splitExcess.toFixed(2)) : 0;

    const updateSplitAmount = (idx: number, value: number) => {
        vm.setSplitPayments((curr: PaymentLine[]) => {
            const next = [...curr];
            next[idx] = { ...next[idx], amount: value };
            return next;
        });
    };

    const updateSplitMethod = (idx: number, method: string) => {
        vm.setSplitPayments((curr: PaymentLine[]) => {
            const next = [...curr];
            const cuentaId = method === 'Transferencia' ? (cuentasActivas[0]?.id || null) : null;
            next[idx] = { ...next[idx], method, referencia: '', cuentaBancariaId: cuentaId, cuentaBancariaLabel: accountLabel(cuentaId), tarjetaMarca: '', tarjetaTipo: method === 'Tarjeta' ? 'Débito' : '', tarjetaUltimos4: '' };
            return next;
        });
    };

    const updateSplitDetail = (idx: number, patch: Partial<PaymentLine>) => {
        vm.setSplitPayments((curr: PaymentLine[]) => {
            const next = [...curr];
            next[idx] = { ...next[idx], ...patch };
            return next;
        });
    };

    const addSplitRow = () => {
        vm.setSplitPayments((curr: PaymentLine[]) => {
            if (curr.length >= 5) return curr;
            const usedMethods = curr.map((p) => p.method);
            const nextMethod = METODOS.find(m => !usedMethods.includes(m)) ?? 'Efectivo';
            return [...curr, { method: nextMethod, amount: 0 }];
        });
    };

    const removeSplitRow = (idx: number) => {
        vm.setSplitPayments((curr: PaymentLine[]) => {
            if (curr.length <= 2) return curr;
            return curr.filter((_: any, i: number) => i !== idx);
        });
    };

    const handleFillRemaining = (idx: number) => {
        vm.setSplitPayments((curr: PaymentLine[]) => {
            const otherTotal = curr.reduce((s, p, i) => i === idx ? s : s + (Number(p.amount) || 0), 0);
            const fill = parseFloat(Math.max(0, total - otherTotal).toFixed(2));
            const next = [...curr];
            next[idx] = { ...next[idx], amount: fill };
            return next;
        });
    };

    const needsReference = (method?: string) => ['TRANSFERENCIA', 'TARJETA'].includes(String(method || '').toUpperCase());
    const needsBankAccount = (method?: string) => String(method || '').toUpperCase() === 'TRANSFERENCIA';
    const accountLabel = (id?: number | null) => {
        const cuenta = cuentasActivas.find((item) => item.id === Number(id));
        if (!cuenta) return '';
        return `${cuenta.alias || cuenta.banco} ${cuenta.numeroCuenta?.slice(-4) || ''}`.trim();
    };
    const selectedCuentaId = vm.paymentDetail?.cuentaBancariaId || (needsBankAccount(vm.paymentMethod) ? cuentasActivas[0]?.id : null);

    useEffect(() => {
        if (needsBankAccount(vm.paymentMethod) && !vm.paymentDetail?.cuentaBancariaId && cuentasActivas[0]?.id) {
            vm.setPaymentDetail((curr: PaymentLine) => ({ ...curr, cuentaBancariaId: cuentasActivas[0].id, cuentaBancariaLabel: accountLabel(cuentasActivas[0].id) }));
        }
    }, [vm.paymentMethod, cuentasActivas[0]?.id]);

    const renderPaymentTraceFields = (
        line: PaymentLine,
        onChange: (patch: Partial<PaymentLine>) => void,
        dense = false,
    ) => {
        if (!needsReference(line.method)) return null;
        const inputClass = `${dense ? 'py-1.5 text-[11px]' : 'py-2 text-xs'} w-full rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 font-semibold text-gray-800 dark:text-white outline-none focus:ring-1 focus:ring-emerald-400`;
        return (
            <div className={`${dense ? 'grid grid-cols-2 gap-1.5' : 'grid grid-cols-2 gap-2'} ${dense ? 'mt-1' : ''}`}>
                {needsBankAccount(line.method) && (
                    <select
                        value={line.cuentaBancariaId || selectedCuentaId || ''}
                        onChange={(e) => {
                            const id = Number(e.target.value) || null;
                            onChange({ cuentaBancariaId: id, cuentaBancariaLabel: accountLabel(id) });
                        }}
                        className={inputClass}
                    >
                        <option value="">Cuenta destino</option>
                        {cuentasActivas.map((cuenta) => (
                            <option key={cuenta.id} value={cuenta.id}>
                                {(cuenta.alias || cuenta.banco)} {cuenta.numeroCuenta?.slice(-4)}
                            </option>
                        ))}
                    </select>
                )}
                {String(line.method || '').toUpperCase() === 'TARJETA' && (
                    <select
                        value={line.tarjetaTipo || 'Débito'}
                        onChange={(e) => onChange({ tarjetaTipo: e.target.value })}
                        className={inputClass}
                    >
                        <option value="Débito">Débito</option>
                        <option value="Crédito">Crédito</option>
                    </select>
                )}
                <input
                    value={line.referencia || ''}
                    onChange={(e) => onChange({ referencia: e.target.value })}
                    placeholder={line.method?.toUpperCase() === 'TARJETA' ? 'N° voucher / operación' : 'N° operación'}
                    className={inputClass}
                />
                {String(line.method || '').toUpperCase() === 'TARJETA' && (
                    <input
                        value={line.tarjetaUltimos4 || ''}
                        onChange={(e) => onChange({ tarjetaUltimos4: e.target.value.replace(/\D/g, '').slice(0, 4) })}
                        placeholder="Últimos 4"
                        className={inputClass}
                    />
                )}
            </div>
        );
    };

    // ── Valores para la vista previa (mismo formato que el ticket impreso) ──
    const empresaPreview = vm.auth?.empresa;
    const clientePreview = vm.selectedClient;
    const isCreditoPreview = vm.formValues?.medioPago === 'Crédito';
    const comprobanteRawPreview = String(vm.formValues?.comprobante || '').toUpperCase()
        || (vm.formValues?.tipoComprobante === '01' ? 'FACTURA' : 'BOLETA');
    const tipoComprobantePreview =
        comprobanteRawPreview === 'COTIZACIÓN' || comprobanteRawPreview === 'COTIZACION'
            ? 'COTIZACIÓN'
            : comprobanteRawPreview === 'ORDEN DE PAGO'
                ? 'ORDEN DE PAGO'
                : comprobanteRawPreview.includes('VENTA') || comprobanteRawPreview.includes('NOTA') || comprobanteRawPreview.includes('ORDEN') || comprobanteRawPreview.includes('RECIBO')
                    ? comprobanteRawPreview
                    : `${comprobanteRawPreview} DE VENTA ELECTRÓNICA`;
    const clientePreviewNombre = clientePreview?.nombre || vm.formValuesClient?.nombre || 'CLIENTE VARIOS';
    const clientePreviewDoc = clientePreview?.nroDoc || vm.formValuesClient?.nroDoc || '';
    const clientePreviewDireccion = (clientePreview?.direccion || vm.formValuesClient?.direccion || '').toString().trim();
    const seriePreview = vm.serie || vm.formValues?.serie || '';
    const correlativoPreview = vm.correlative || vm.formValues?.correlativo || '';
    const fechaPreview = vm.formValues?.fechaEmision || '';
    // Pago inicial (adelanto) en una venta a crédito: mixto = suma de líneas; simple = campo adelanto.
    const inicialCreditoPreview = isCreditoPreview
        ? (vm.isMixedPayment ? splitTotal : Number(vm.adelanto || 0))
        : 0;
    const metodoPreviewLabel = vm.isMixedPayment ? 'MIXTO' : (isCreditoPreview ? (inicialCreditoPreview > 0 ? String(vm.adelantoMetodo || 'EFECTIVO').toUpperCase() : 'CRÉDITO') : String(vm.paymentMethod || 'EFECTIVO').toUpperCase());
    const condicionPreview = isCreditoPreview ? 'CRÉDITO' : 'CONTADO';
    const vueltoPreview = isCreditoPreview ? 0 : (vm.isMixedPayment ? splitChange : (vm.isCashPayment ? (vm.vueltoCalculado || 0) : 0));
    const montoMedioPreview = isCreditoPreview ? inicialCreditoPreview : total;
    const pagadoPreview = isCreditoPreview ? inicialCreditoPreview : total + vueltoPreview;
    const creditoMensaje = inicialCreditoPreview > 0
        ? `Venta a crédito con pago inicial de S/ ${inicialCreditoPreview.toFixed(2)} (${metodoPreviewLabel}). El resto queda a crédito.`
        : 'Venta a crédito — no requiere método de pago (o configura un pago inicial en “Configurar venta”).';
    // Preferir el vendedor de campo elegido; si no hay, el emisor.
    const vendedorCampoNombrePreview = vm.vendedorCampoId
        ? (vm.vendedoresCampo?.find((u: any) => u.id === vm.vendedorCampoId)?.nombre)
        : null;
    const vendedorPreview = (vendedorCampoNombrePreview || vm.auth?.nombre || vm.auth?.usuario?.nombre || vm.formValues?.vendedor || 'ADMIN').toString().toUpperCase();
    const empresaCelularPreview = (empresaPreview?.celular || empresaPreview?.telefono || '').toString().trim();
    const empresaEmailPreview = (empresaPreview?.email || empresaPreview?.correo || '').toString().trim();
    const empresaWebPreview = (empresaPreview?.paginaWeb || '').toString().trim();
    const previewLogo = (() => {
        const raw = empresaPreview?.logo;
        if (!raw) return undefined;
        const t = String(raw).trim();
        if (t.startsWith('data:')) return t;
        if (/^https?:\/\//i.test(t) || t.startsWith('/')) return t;
        return `data:${t.startsWith('/9j/') ? 'image/jpeg' : 'image/png'};base64,${t}`;
    })();
    const simboloPreview = vm.monedaSimbolo || 'S/';

    // ── Transición del modal: pago → procesando → emitido (dentro del mismo modal) ──
    const emitStep: 'pago' | 'procesando' | 'emitido' = vm.IsOpenModalSuccessInvoice
        ? (vm.isLoading ? 'procesando' : 'emitido')
        : 'pago';
    const isEmitPhase = vm.IsOpenModalSuccessInvoice;
    const closeEmitido = () => { vm.closeModalResponse?.(); setShowPago(false); };
    const handleModalOverlay = () => {
        if (emitStep === 'pago') setShowPago(false);
        else if (emitStep === 'emitido') closeEmitido();
        // en 'procesando' no se cierra
    };

    return (
        <div className="p-3 pt-2 md:p-5 md:pb-8 bg-white dark:bg-[#111827] border-t border-gray-100 dark:border-slate-800">
            <div className="space-y-1 md:space-y-2 mb-3 md:mb-4">
                <div className="flex justify-between text-sm text-gray-700 dark:text-white font-medium">
                    <span>Op. Gravada</span>
                    <span>{vm.monedaSimbolo} {vm.opGravadaAdjusted.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm text-gray-700 dark:text-white font-medium">
                    <span>IGV (18%)</span>
                    <span>{vm.monedaSimbolo} {vm.igvAdjusted.toFixed(2)}</span>
                </div>
                {vm.opExoneradaAdjusted > 0 && (
                    <div className="flex justify-between text-sm text-gray-700 dark:text-white font-medium">
                        <span>Op. Exonerada</span>
                        <span>{vm.monedaSimbolo} {vm.opExoneradaAdjusted.toFixed(2)}</span>
                    </div>
                )}
                {vm.opInafectaAdjusted > 0 && (
                    <div className="flex justify-between text-sm text-gray-700 dark:text-white font-medium">
                        <span>Op. Inafecta</span>
                        <span>{vm.monedaSimbolo} {vm.opInafectaAdjusted.toFixed(2)}</span>
                    </div>
                )}
                {vm.finalDiscount > 0 && (
                    <div className="flex justify-between text-sm text-green-600 font-medium">
                        <span>Descuento</span>
                        <span>- {vm.monedaSimbolo} {vm.finalDiscount.toFixed(2)}</span>
                    </div>
                )}
                <div className="flex justify-between text-xl font-black text-gray-800 dark:text-white pt-2 border-t border-gray-200 dark:border-slate-800">
                    <span>TOTAL</span>
                    <span>{vm.monedaSimbolo} {total.toFixed(2)}</span>
                </div>

                {/* Adelanto field for NP and OT */}
                {(vm.formValues.tipoDoc === 'NP' || vm.formValues.tipoDoc === 'OT') && !vm.isQuotationRoute && (
                    <div className="mt-3 pt-3 border-t border-gray-200 dark:border-slate-800">
                        <label className="text-xs font-medium text-gray-700 dark:text-gray-300 block mb-1">
                            Adelanto (opcional)
                        </label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">S/</span>
                            <input
                                type="number"
                                value={vm.adelanto || ''}
                                onChange={(e) => vm.setAdelanto(Number(e.target.value) || 0)}
                                placeholder="0.00"
                                step="0.01"
                                max={total}
                                className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-lg text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-gray-900 focus:border-gray-900"
                            />
                        </div>
                        {vm.adelanto > 0 && (
                            <div className="mt-2 p-2 bg-gray-100 dark:bg-slate-800 rounded-lg">
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-600 dark:text-gray-400">Saldo pendiente:</span>
                                    <span className="font-bold text-orange-600 dark:text-orange-400">
                                        S/ {Math.max(0, total - vm.adelanto).toFixed(2)}
                                    </span>
                                </div>
                            </div>
                        )}

                        {/* Descontar stock: solo para Nota de Pedido */}
                        {vm.formValues.tipoDoc === 'NP' && (
                            <label className="mt-3 flex items-start gap-2 cursor-pointer select-none">
                                <input
                                    type="checkbox"
                                    checked={vm.descontarStockNP}
                                    onChange={(e) => vm.setDescontarStockNP(e.target.checked)}
                                    className="mt-0.5 h-4 w-4 rounded border-gray-300 dark:border-slate-700 text-gray-900 focus:ring-gray-900"
                                />
                                <span className="text-xs text-gray-700 dark:text-gray-300">
                                    Descontar del stock ahora
                                    <span className="block text-[11px] text-gray-500 dark:text-gray-400">
                                        Si lo dejas sin marcar, el stock recién baja al convertir el pedido en boleta/factura.
                                    </span>
                                </span>
                            </label>
                        )}
                    </div>
                )}
            </div>

            {/* Quotation-specific fields */}
            {vm.isQuotationRoute && (
                <div className="border-t">
                    <button
                        onClick={() => vm.setIsQuotationConfigModalOpen(true)}
                        className="w-full flex items-center justify-between py-2 px-1 hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors"
                    >
                        <span className="text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1">
                            <Icon icon="solar:settings-bold-duotone" className="text-gray-900" />
                            Configuración Cotización
                        </span>
                    </button>
                </div>
            )}

            {/* Farmacia: indicador de recetas pendientes */}
            {hayRecetasPendientes && (
                <div className="w-full mb-2 px-1">
                    <div className="flex items-center justify-between bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-3 py-1.5 text-xs">
                        <span className="text-red-700 dark:text-red-300 font-semibold">
                            📋 {recetasPendientes} producto(s) requieren receta
                        </span>
                    </div>
                </div>
            )}
            <div className="flex gap-3">
                {vm.isQuotationRoute && (
                    <button
                        onClick={() => printFn()}
                        className="flex-1 py-3.5 px-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-bold hover:from-green-700 hover:to-emerald-700 transition-all flex items-center justify-center gap-2"
                    >
                        <Icon icon="solar:download-bold" className="text-xl" />
                        Exportar PDF
                    </button>
                )}
                <button
                    onClick={() => {
                        if (!hayProductos) return;
                        if (vm.isQuotationRoute) {
                            vm.addInvoiceReceipt();
                        } else {
                            // Incluye la EDICIÓN de una nota de venta: pasa por el paso de
                            // pago para poder registrar/actualizar el cobro (parcial/mixto).
                            setShowPago(true);
                        }
                    }}
                    disabled={hayRecetasPendientes || !hayProductos}
                    className={`flex-1 py-3 md:py-3.5 text-white rounded-xl font-bold hover:opacity-90 transition-all flex items-center justify-center gap-2 text-sm ${hayRecetasPendientes
                        ? 'bg-gray-400 cursor-not-allowed'
                        : !hayProductos
                            ? 'bg-gray-400 cursor-not-allowed'
                        : 'btn-accent shadow-sm border border-violet-700'
                        }`}
                    title={!hayProductos ? 'Agrega productos antes de continuar' : undefined}
                >
                    <Icon icon={vm.isQuotationRoute ? (vm.isEditMode ? "solar:pen-bold" : "solar:diskette-bold") : "solar:card-send-bold"} className="text-lg text-white" />
                    <span className="text-white">{vm.isQuotationRoute ? (vm.isEditMode ? "ACTUALIZAR" : "GUARDAR") : vm.isEditNotaVenta ? "ACTUALIZAR PAGO" : "CONTINUAR PAGO"}</span>
                </button>
            </div>

            {/* ── MODAL CONTINUAR PAGO → transición a EMITIDO dentro del mismo modal ── */}
            {(showPago || vm.IsOpenModalSuccessInvoice) && createPortal(
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[100000] flex items-center justify-center bg-black/50 backdrop-blur-sm p-3 sm:p-6 font-jakarta"
                    onClick={handleModalOverlay}
                >
                    <motion.div
                        layout
                        transition={{ type: 'spring', stiffness: 260, damping: 28 }}
                        className={`w-full ${isEmitPhase ? 'max-w-md' : 'max-w-4xl'} max-h-[92vh] overflow-hidden rounded-2xl bg-white dark:bg-[#0f1535] shadow-2xl flex flex-col`}
                        onClick={(e) => e.stopPropagation()}
                    >
                    <AnimatePresence mode="wait" initial={false}>
                    {emitStep === 'pago' ? (
                    <motion.div
                        key="pago"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -32, scale: 0.985 }}
                        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                        className="flex flex-col flex-1 min-h-0"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 dark:border-white/10 shrink-0">
                            <div className="flex items-center gap-2">
                                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-violet-500/30">
                                    <Icon icon="solar:card-send-bold" width={18} />
                                </div>
                                <div>
                                    <h3 className="text-base font-extrabold text-gray-900 dark:text-white leading-none">Continuar pago</h3>
                                    <p className="text-xs text-gray-400">{vm.formValues?.medioPago === 'Crédito' ? 'Revisa y confirma el comprobante a crédito' : 'Elige el método de pago y confirma'}</p>
                                </div>
                            </div>
                            <button onClick={() => setShowPago(false)} className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors">
                                <Icon icon="solar:close-circle-bold" width={22} />
                            </button>
                        </div>

                        {/* Body: split. En venta a crédito no hay método de pago, así que
                            se usa una sola columna centrada (solo la vista previa). */}
                        <div className={`grid grid-cols-1 ${vm.formValues?.medioPago === 'Crédito' ? '' : 'md:grid-cols-2'} gap-0 overflow-y-auto flex-1 min-h-0`}>
                            {/* IZQUIERDA: métodos de pago (oculto en crédito) */}
                            <div className={`p-5 border-b md:border-b-0 md:border-r border-gray-100 dark:border-white/10 ${vm.formValues?.medioPago === 'Crédito' ? 'hidden' : ''}`}>
                                <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Método de pago</h4>
                                {vm.formValues?.medioPago === 'Crédito' ? (
                                    <div className="rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-4 text-sm text-amber-700 dark:text-amber-300">
                                        {creditoMensaje}
                                    </div>
                                ) : (
                <div className="mb-1">
                    {/* Toggle simple / mixto */}
                    <div className="flex items-center justify-end mb-2">
                        <button
                            type="button"
                            onClick={() => vm.setIsMixedPayment(!vm.isMixedPayment)}
                            className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold transition-all border ${vm.isMixedPayment
                                ? 'bg-violet-500 text-white border-violet-500'
                                : 'bg-white dark:bg-slate-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-slate-700 hover:border-violet-400'
                                }`}
                        >
                            <Icon icon="solar:card-2-bold-duotone" width={13} />
                            Pago Mixto
                        </button>
                    </div>

                    {!vm.isMixedPayment ? (
                        /* Modo simple — un solo método */
                        <div className="space-y-2">
                            <div className="grid grid-cols-3 gap-2.5">
                                {METODOS.map((m) => (
                                    <button
                                        key={m}
                                        onClick={() => {
                                            vm.setPaymentMethod(m);
                                            vm.setPaymentDetail((curr: PaymentLine) => ({
                                                ...curr,
                                                method: m,
                                                cuentaBancariaId: m === 'Transferencia' ? (curr.cuentaBancariaId || cuentasActivas[0]?.id || null) : null,
                                                cuentaBancariaLabel: m === 'Transferencia' ? accountLabel(curr.cuentaBancariaId || cuentasActivas[0]?.id) : '',
                                                referencia: '',
                                                tarjetaTipo: m === 'Tarjeta' ? (curr.tarjetaTipo || 'Débito') : '',
                                                tarjetaUltimos4: '',
                                            }));
                                        }}
                                        className={`flex flex-col items-center justify-center gap-2 p-4 aspect-square rounded-2xl text-xs md:text-sm font-bold transition-all border ${vm.paymentMethod === m
                                            ? '!bg-emerald-500 text-white border-none shadow-md shadow-emerald-200/50'
                                            : 'bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700'
                                            }`}
                                    >
                                        <img src={METODO_LOGOS[m]} alt={m} className="h-11 w-11 object-contain" />
                                        <span>{m}</span>
                                    </button>
                                ))}
                            </div>

                            {vm.isCashPayment && (
                                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
                                    <div className="relative">
                                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-gray-400">S/</span>
                                        <input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            value={vm.pay || ''}
                                            onChange={(e) => vm.setPay(Number(e.target.value) || 0)}
                                            placeholder={`Recibido ${total.toFixed(2)}`}
                                            className="w-full pl-7 pr-16 py-1.5 rounded-lg border border-emerald-200 dark:border-emerald-800 bg-white dark:bg-slate-800 text-xs font-bold text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-300"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => vm.setPay(Number(total.toFixed(2)))}
                                            className="absolute right-1 top-1/2 -translate-y-1/2 px-2 py-1 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-[9px] font-black text-emerald-700 dark:text-emerald-300"
                                        >
                                            Exacto
                                        </button>
                                    </div>
                                    <div className={`min-w-[88px] rounded-lg px-2.5 py-1.5 text-right ${vm.vueltoCalculado > 0 ? 'bg-emerald-50 dark:bg-emerald-950/30' : 'bg-gray-50 dark:bg-slate-800'}`}>
                                        <p className="text-[9px] font-black uppercase text-gray-400">Vuelto</p>
                                        <p className={`text-xs font-black ${vm.vueltoCalculado > 0 ? 'text-emerald-600 dark:text-emerald-300' : 'text-gray-400'}`}>
                                            S/ {vm.vueltoCalculado.toFixed(2)}
                                        </p>
                                    </div>
                                </div>
                            )}

                            {renderPaymentTraceFields(
                                { ...vm.paymentDetail, method: vm.paymentMethod, amount: total },
                                (patch) => vm.setPaymentDetail((curr: PaymentLine) => ({ ...curr, ...patch })),
                            )}
                        </div>
                    ) : (
                        /* Modo mixto — múltiples métodos con montos */
                        <div className="space-y-2">
                            {(vm.splitPayments as PaymentLine[]).map((sp, idx) => (
                                <div key={idx} className="rounded-xl border border-gray-100 dark:border-slate-800 p-1.5">
                                    <div className="flex items-center gap-1.5">
                                        <select
                                            value={sp.method}
                                            onChange={(e) => updateSplitMethod(idx, e.target.value)}
                                            className="flex-1 min-w-0 text-xs py-1.5 px-2 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-violet-400"
                                        >
                                            {METODOS.map(m => <option key={m} value={m}>{m}</option>)}
                                        </select>
                                        <div className="relative w-24">
                                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">S/</span>
                                            <input
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                value={sp.amount || ''}
                                                onChange={(e) => updateSplitAmount(idx, parseFloat(e.target.value) || 0)}
                                                placeholder="0.00"
                                                className="w-full pl-7 pr-2 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-violet-400"
                                            />
                                        </div>
                                        <button
                                            type="button"
                                            title="Completar con el resto"
                                            onClick={() => handleFillRemaining(idx)}
                                            className="p-1.5 rounded-lg bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400 hover:bg-violet-100 transition-colors"
                                        >
                                            <Icon icon="solar:arrow-down-bold-duotone" width={13} />
                                        </button>
                                        {vm.splitPayments.length > 2 && (
                                            <button
                                                type="button"
                                                onClick={() => removeSplitRow(idx)}
                                                className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                            >
                                                <Icon icon="solar:close-circle-bold" width={13} />
                                            </button>
                                        )}
                                    </div>
                                    {renderPaymentTraceFields(sp, (patch) => updateSplitDetail(idx, patch), true)}
                                </div>
                            ))}

                            {/* Resumen y agregar fila */}
                            <div className="flex items-center justify-between pt-1">
                                <button
                                    type="button"
                                    onClick={addSplitRow}
                                    disabled={vm.splitPayments.length >= 5}
                                    className="text-[10px] text-violet-600 dark:text-violet-400 hover:underline disabled:opacity-40 flex items-center gap-1"
                                >
                                    <Icon icon="solar:add-circle-bold" width={12} />
                                    Agregar método
                                </button>
                                <div className={`text-[11px] font-bold ${splitValid ? 'text-emerald-600' : splitRemaining > 0 ? 'text-orange-500' : 'text-red-500'}`}>
                                    {splitValid
                                        ? splitChange > 0 ? `Vuelto S/ ${splitChange.toFixed(2)}` : '✓ Completo'
                                        : splitRemaining > 0
                                            ? `Falta S/ ${splitRemaining.toFixed(2)}`
                                            : `Excede S/ ${splitExcess.toFixed(2)} sin efectivo para vuelto`}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
                                )}
                            </div>{/* /IZQUIERDA métodos de pago */}

                            {/* DERECHA: preview del comprobante — mismo formato que el ticket impreso */}
                            <div className="p-5 bg-gray-50 dark:bg-[#0b1030]">
                                {vm.formValues?.medioPago === 'Crédito' && (
                                    <div className="mx-auto mb-3 flex max-w-[300px] items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
                                        <Icon icon="solar:hand-money-bold-duotone" width={16} />
                                        {creditoMensaje}
                                    </div>
                                )}
                                <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Vista previa del comprobante</h4>
                                <div className="mx-auto w-full max-w-[300px] rounded-xl bg-white text-gray-900 border border-gray-200 shadow-inner p-4 font-mono text-[10px] leading-relaxed">
                                    {/* Encabezado empresa */}
                                    <div className="text-center">
                                        {previewLogo && <img src={previewLogo} alt="logo" className="mx-auto mb-2 h-14 w-14 object-contain" />}
                                        <p className="font-bold text-sm uppercase">{empresaPreview?.nombreComercial || empresaPreview?.razonSocial || 'MI EMPRESA'}</p>
                                        {empresaPreview?.razonSocial && <p className="text-[9px] text-gray-600 uppercase">RAZON SOCIAL: {empresaPreview.razonSocial}</p>}
                                        {empresaPreview?.direccion && <p className="text-[9px] text-gray-600 uppercase">DIRECCION: {empresaPreview.direccion}</p>}
                                        {empresaCelularPreview && <p className="text-[9px] text-gray-600">CELULAR: {empresaCelularPreview}</p>}
                                        {empresaEmailPreview && <p className="text-[9px] text-gray-600 lowercase">CORREO: {empresaEmailPreview}</p>}
                                        {empresaWebPreview && <p className="text-[9px] text-gray-600">WEB: {empresaWebPreview}</p>}
                                        <p className="text-[9px] text-gray-600">RUC: {empresaPreview?.ruc || empresaPreview?.nroDoc || '—'}</p>
                                    </div>
                                    <div className="my-2 border-t border-dashed border-gray-300" />
                                    {/* Tipo de comprobante + serie */}
                                    <div className="text-center font-bold">
                                        <p>{tipoComprobantePreview}</p>
                                        <p>{seriePreview}{correlativoPreview ? `-${correlativoPreview}` : ''}</p>
                                    </div>
                                    <div className="my-2 border-t border-dashed border-gray-300" />
                                    {/* Datos generales */}
                                    <div className="space-y-0.5">
                                        {fechaPreview && (
                                            <div className="flex justify-between gap-2"><span className="text-gray-500">FECHA Y HORA:</span><span className="text-right">{fechaPreview}</span></div>
                                        )}
                                        <div className="flex justify-between gap-2"><span className="text-gray-500">RAZON SOCIAL:</span><span className="text-right uppercase">{clientePreviewNombre}</span></div>
                                        {clientePreviewDoc && (
                                            <div className="flex justify-between gap-2"><span className="text-gray-500">N° DOCUMENTO:</span><span className="text-right">{clientePreviewDoc}</span></div>
                                        )}
                                        {clientePreviewDireccion && (
                                            <div className="flex justify-between gap-2"><span className="text-gray-500">DIRECCION:</span><span className="text-right uppercase">{clientePreviewDireccion}</span></div>
                                        )}
                                    </div>
                                    <div className="my-2 border-t border-dashed border-gray-300" />
                                    {/* Tabla de items */}
                                    <div className="flex font-bold text-[9px] text-gray-500">
                                        <span className="w-6 text-center">CANT.</span>
                                        <span className="w-7 text-center">U.M.</span>
                                        <span className="flex-1 px-1 text-left">DESCRIPCION</span>
                                        <span className="w-10 text-right">P.U.</span>
                                        <span className="w-12 text-right">IMP.</span>
                                    </div>
                                    <div className="my-1 border-t border-dashed border-gray-200" />
                                    <div className="space-y-1 max-h-52 overflow-y-auto">
                                        {(vm.productsInvoice || []).length === 0 && <p className="text-center text-gray-400 py-2">Sin productos</p>}
                                        {(vm.productsInvoice || []).map((p: any, i: number) => (
                                            <div key={i} className="flex">
                                                <span className="w-6 text-center">{p.cantidad}</span>
                                                <span className="w-7 text-center uppercase">{(p.unidad || p.unidadMedida || 'NIU').toString().toUpperCase().slice(0, 3)}</span>
                                                <span className="flex-1 px-1 uppercase break-words">{p.descripcion || p.nombre || 'Producto'}</span>
                                                <span className="w-10 text-right">{Number(p.precioUnitario ?? p.mtoPrecioUnitario ?? 0).toFixed(2)}</span>
                                                <span className="w-12 text-right">{Number(p.total ?? 0).toFixed(2)}</span>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="my-2 border-t border-dashed border-gray-300" />
                                    {/* Forma / medio de pago */}
                                    <div className="space-y-0.5">
                                        <div className="flex justify-between"><span className="text-gray-500">FORMA PAGO:</span><span>{condicionPreview}</span></div>
                                        <div className="flex justify-between gap-2"><span className="text-gray-500">MEDIO PAGO:</span><span className="text-right">{metodoPreviewLabel} {simboloPreview} {montoMedioPreview.toFixed(2)}</span></div>
                                        {!isCreditoPreview && (
                                            <>
                                                <div className="flex justify-between"><span className="text-gray-500">VUELTO:</span><span>{simboloPreview} {vueltoPreview.toFixed(2)}</span></div>
                                                <div className="flex justify-between"><span className="text-gray-500">PAGADO:</span><span>{simboloPreview} {pagadoPreview.toFixed(2)}</span></div>
                                            </>
                                        )}
                                        <div className="flex justify-between"><span className="text-gray-500">VENDEDOR:</span><span className="uppercase">{vendedorPreview}</span></div>
                                    </div>
                                    <div className="my-2 border-t border-dashed border-gray-300" />
                                    {/* Totales */}
                                    <div className="space-y-0.5">
                                        <div className="flex justify-between"><span>OP. GRAVADA</span><span>{simboloPreview} {Number(vm.opGravadaAdjusted ?? 0).toFixed(2)}</span></div>
                                        {vm.opExoneradaAdjusted > 0 && (
                                            <div className="flex justify-between"><span>OP. EXONERADA</span><span>{simboloPreview} {Number(vm.opExoneradaAdjusted).toFixed(2)}</span></div>
                                        )}
                                        {vm.opInafectaAdjusted > 0 && (
                                            <div className="flex justify-between"><span>OP. INAFECTA</span><span>{simboloPreview} {Number(vm.opInafectaAdjusted).toFixed(2)}</span></div>
                                        )}
                                        <div className="flex justify-between"><span>IGV (18%)</span><span>{simboloPreview} {Number(vm.igvAdjusted ?? 0).toFixed(2)}</span></div>
                                        {vm.finalDiscount > 0 && (
                                            <div className="flex justify-between text-green-600"><span>DESCUENTO</span><span>- {simboloPreview} {Number(vm.finalDiscount).toFixed(2)}</span></div>
                                        )}
                                        <div className="mt-1 flex justify-between font-bold text-sm"><span>IMPORTE TOTAL</span><span>{simboloPreview} {Number(total).toFixed(2)}</span></div>
                                    </div>
                                    <div className="my-2 border-t border-dashed border-gray-300" />
                                    <p className="text-center text-[8px] text-gray-500 leading-snug">Representación impresa del Comprobante de Pago Electrónico.</p>
                                </div>
                            </div>
                        </div>{/* /body split */}

                        {/* Footer: emitir */}
                        <div className="flex items-center justify-end gap-3 px-5 py-3.5 border-t border-gray-100 dark:border-white/10">
                            <button onClick={() => setShowPago(false)} className="px-4 py-2.5 rounded-xl text-sm font-bold text-gray-500 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors">
                                Cancelar
                            </button>
                            <button
                                onClick={() => vm.addInvoiceReceipt()}
                                disabled={!isCreditoPreview && vm.isMixedPayment && !splitValid}
                                className={`px-6 py-2.5 rounded-xl text-sm font-bold text-white flex items-center gap-2 transition-all ${(!isCreditoPreview && vm.isMixedPayment && !splitValid) ? 'bg-gray-400 cursor-not-allowed' : 'btn-accent shadow-lg shadow-black/20'}`}
                            >
                                <Icon icon={vm.isEditMode ? "solar:pen-bold" : "solar:printer-minimalistic-bold"} width={18} />
                                {vm.isEditMode ? 'ACTUALIZAR' : 'EMITIR'}
                            </button>
                        </div>
                    </motion.div>
                    ) : (
                    <motion.div
                        key="emitido"
                        initial={{ opacity: 0, x: 28, scale: 0.98 }}
                        animate={{ opacity: 1, x: 0, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.98 }}
                        transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
                    >
                        <EmitidoContent
                            isLoading={vm.isLoading}
                            comprobante={vm.formValues?.comprobante}
                            auth={vm.auth}
                            serie={vm.serie}
                            correlative={vm.correlative}
                            dataReceipt={vm.dataReceipt}
                            client={vm.snapshotClient ?? vm.selectedClient}
                            company={vm.authWithBranding}
                            productsInvoice={vm.productsInvoice}
                            formValues={{ ...vm.formValues, mtoImpVenta: vm.totalAdjusted }}
                            observation={vm.formValues?.observaciones}
                            isPendiente={vm.isComprobantePendiente}
                            isUpdate={vm.isEditMode}
                            hasDespacho={vm.despachoCreado}
                            handleOpenNewTab={handleOpenNewTab}
                            closeModal={closeEmitido}
                        />
                    </motion.div>
                    )}
                    </AnimatePresence>
                    </motion.div>
                </motion.div>,
                document.body,
            )}
        </div>
    );
};
