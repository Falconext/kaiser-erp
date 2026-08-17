import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { useReactToPrint } from "react-to-print";
import { Icon } from "@iconify/react";
import { useLocation } from "react-router-dom";
import { useFacturacionViewModel } from "../useFacturacionViewModel";
import { POSCatalogLayout } from "./POSCatalogLayout";
import { POSCartLayout } from "./POSCartLayout";
import { POSOptionsForm } from "./POSOptionsForm";
import { POSCalculations } from "./POSCalculations";

import ModalProduct from "@/pages/admin/inventario/modal-productos";
import Select from "@/components/Select";
import ModalClient from "@/features/admin/clients/shared/ModalClient";
import ModalConfirm from "@/components/ModalConfirm";
import ComprobantePrintPage from "@/pages/admin/facturacion/comprobanteImprimir";
import ModalEditLineItem from "@/pages/admin/facturacion/ModalEditLineItem";
import ModalDetraccion from "@/pages/admin/facturacion/ModalDetraccion";
import ModalConfiguracionCotizacion from "@/pages/admin/facturacion/ModalConfiguracionCotizacion";
import ModalSeleccionVariante from "@/features/admin/facturacion/components/ModalSeleccionVariante";
import { ModalRecetaMedica } from "@/pages/admin/facturacion/ModalRecetaMedica";
import ModalCuotas from "@/pages/admin/facturacion/ModalCuotas";
import { buildComprobantePrintPageStyle } from "@/utils/printStyles";

export const FacturacionNuevoView = () => {
    const vm = useFacturacionViewModel();
    const location = useLocation();
    const componentRef = useRef(null);

    const [localPrintSize, setLocalPrintSize] = useState<string>(vm.printSize ?? 'TICKET');
    const [pendingPrint, setPendingPrint] = useState(false);
    const routeState = location.state as any;
    const shouldAskDocumentType = !vm.isQuotationRoute && !routeState?.fromCreditNote && !routeState?.fromNotaVenta && !routeState?.defaultType;
    const [isComprobanteModalOpen, setIsComprobanteModalOpen] = useState(shouldAskDocumentType);
    const [isSaleConfigOpen, setIsSaleConfigOpen] = useState(false);
    // Diseño del POS elegido por el usuario: CATALOGO (cards) o CAJA (carrito prioritario)
    const [posLayout, setPosLayout] = useState<'CATALOGO' | 'CAJA'>(() =>
        (localStorage.getItem('POS_LAYOUT') as 'CATALOGO' | 'CAJA') || 'CATALOGO',
    );
    const cambiarLayout = (l: 'CATALOGO' | 'CAJA') => {
        setPosLayout(l);
        localStorage.setItem('POS_LAYOUT', l);
    };
    const documentLabel = vm.formValues?.comprobante || 'Seleccionar comprobante';
    const selectedClientLabel = vm.selectedClient?.nombre || vm.formValues?.clienteNombre || 'Cliente por definir';
    const [clienteSearchTerm, setClienteSearchTerm] = useState('');
    const [clienteSearchOpen, setClienteSearchOpen] = useState(false);
    const lastSelectedClientIdRef = useRef<number | null>(null);
    const normalizeSearch = (value: string) =>
        String(value || '')
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .trim();
    const clienteSearchResults = useMemo(() => {
        const query = normalizeSearch(clienteSearchTerm);
        if (query.length < 3) return [];
        const compactQuery = query.replace(/[^a-z0-9]/g, '');
        const items = Array.isArray(vm.clients) ? vm.clients : [];
        return items.filter((client: any) => {
            const fullName = normalizeSearch([
                client?.nombre,
                client?.apellidoPaterno,
                client?.apellidoMaterno,
                client?.razonSocial,
            ].filter(Boolean).join(' '));
            const doc = String(client?.nroDoc || '').replace(/\D/g, '');
            return (
                fullName.includes(query)
                || doc.includes(compactQuery)
                || normalizeSearch(client?.nroDoc).includes(query)
            );
        }).slice(0, 6);
    }, [clienteSearchTerm, vm.clients]);
    useEffect(() => {
        if (!clienteSearchOpen) {
            setClienteSearchTerm(selectedClientLabel);
        }
    }, [clienteSearchOpen, selectedClientLabel]);
    useEffect(() => {
        const currentId = vm.selectedClient?.id ? Number(vm.selectedClient.id) : null;
        if (!currentId || currentId === lastSelectedClientIdRef.current) return;
        lastSelectedClientIdRef.current = currentId;
        setClienteSearchOpen(false);
        setClienteSearchTerm(selectedClientLabel);
    }, [selectedClientLabel, vm.selectedClient?.id]);
    const handleSelectClienteSuggestion = (client: any) => {
        if (!client) return;
        vm.handleClienteCreado(client);
        setClienteSearchTerm(`${client.nroDoc}-${client.nombre}`);
        setClienteSearchOpen(false);
    };
    const submitClienteDoc = async () => {
        const query = clienteSearchTerm.trim();
        if (!query || vm.clienteDocLookupLoading) return;
        const ok = await vm.handleClienteDocLookup(query);
        if (ok) {
            setClienteSearchOpen(false);
        }
    };
    const handleClienteSearchKeyDown = async (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key !== 'Enter') return;
        e.preventDefault();
        const raw = normalizeSearch(clienteSearchTerm);
        const digits = raw.replace(/\D/g, '');
        if (digits.length === 8 || digits.length === 11) {
            await submitClienteDoc();
            return;
        }
        if (clienteSearchResults.length === 1) {
            handleSelectClienteSuggestion(clienteSearchResults[0]);
            return;
        }
        if (clienteSearchResults.length > 1) {
            handleSelectClienteSuggestion(clienteSearchResults[0]);
        }
    };
    const printSizes = useMemo(() => new Set(['A4', 'A5', 'TICKET']), []);

    const localDimensions = useMemo(() => {
        switch (localPrintSize) {
            case 'A4': return { width: 210, height: 297 };
            case 'A5': return { width: 148, height: 210 };
            default:   return { width: 80,  height: 330 };
        }
    }, [localPrintSize]);

    const printFn = useReactToPrint({
        // @ts-ignore
        contentRef: componentRef,
        pageStyle: buildComprobantePrintPageStyle(localDimensions),
        // Nombre sugerido al "Guardar como PDF": serie-correlativo del comprobante
        documentTitle: vm.dataReceipt?.serie ? `${vm.dataReceipt.serie}-${vm.dataReceipt.correlativo}` : undefined,
    });

    useEffect(() => {
        if (!pendingPrint) return;
        const timer = window.setTimeout(() => {
            printFn();
            setPendingPrint(false);
        }, 0);
        return () => window.clearTimeout(timer);
    }, [pendingPrint, printFn, localPrintSize]);

    const handleOpenNewTab = (size?: string) => {
        const nextSize = size && printSizes.has(size) ? size : (vm.printSize ?? localPrintSize);
        setLocalPrintSize(nextSize);
        setPendingPrint(true);
    };

    const handleSelectComprobante = (option: any) => {
        if (!option) return;
        vm.handleChangeSelect(option.id, option.value, 'comprobante', 'tipoDoc');
        setIsComprobanteModalOpen(false);
    };

    const isCreditSale = String(vm.formValues?.medioPago || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim()
        .toUpperCase() === 'CREDITO';
    const printMedioPago = isCreditSale
        ? 'Crédito'
        : (vm.formValues?.comprobante === "NOTA DE PEDIDO" ? "" : (vm.isMixedPayment ? 'MIXTO' : vm.paymentMethod));
    const printCuotas = isCreditSale
        ? (Array.isArray(vm.cuotas) && vm.cuotas.length > 0
            ? vm.cuotas
            : (vm.fechaVencimientoCredito
                ? [{ fechaVencimiento: vm.fechaVencimientoCredito, monto: vm.totalAdjusted }]
                : []))
        : [];
    const printFormValues = {
        ...vm.formValues,
        formaPagoTipo: isCreditSale ? 'Credito' : 'Contado',
        fechaVencimientoCredito: vm.fechaVencimientoCredito,
        cuotas: printCuotas,
        vuelto: isCreditSale ? 0 : vm.vueltoCalculado,
        // Cobranza en campo: el ticket de emisión también muestra el vendedor de
        // campo elegido (no el usuario que registra), igual que el panel/reimpresión.
        vendedor: (vm.cobranzaCampo && vm.vendedorCampoId
            ? vm.vendedoresCampo?.find((u: any) => u.id === vm.vendedorCampoId)?.nombre
            : null) || vm.auth?.nombre,
        serie: vm.dataReceipt?.serie,
        correlativo: vm.dataReceipt?.correlativo,
        numDocAfectado: `${vm.serie}-${vm.correlative}`,
        medioPago: printMedioPago,
        splitPayments: vm.isMixedPayment && !isCreditSale ? vm.splitPayments : undefined,
        paymentDetails: isCreditSale ? { mode: 'CREDITO', method: 'Crédito', amount: 0 } : vm.buildPaymentDetails?.(),
        mtoOperGravadas: vm.opGravadaAdjusted,
        mtoOperExoneradas: vm.opExoneradaAdjusted,
        mtoOperInafectas: vm.opInafectaAdjusted,
        mtoIGV: vm.igvAdjusted,
        mtoImpVenta: vm.totalAdjusted,
        mtoDescuentoGlobal: vm.finalDiscount,
        totalDescuentos: vm.finalDiscount,
        subTotal: vm.opGravadaAdjusted,
        ...(vm.tipoDetraccionId ? {
            tipoDetraccion: vm.tiposDetraccion.find((t: any) => t.id === vm.tipoDetraccionId),
            montoDetraccion: vm.montoDetraccion,
            cuentaBancoNacion: vm.cuentaBancoNacion,
            medioPagoDetraccion: vm.mediosPagoDetraccion.find((m: any) => m.id === vm.medioPagoDetraccionId),
            cuotas: printCuotas
        } : {})
    };

    return (
        <div className={`flex flex-col md:flex-row min-h-screen md:min-h-0 md:overflow-hidden pb-8 gap-4 md:gap-6 font-inter text-gray-800 dark:text-gray-200 transition-all duration-300 ${!vm.showMobileCart && vm.isMobile ? 'pb-24' : 'pb-0'}`}
            style={{ height: !vm.isMobile ? (vm.zoomLevel > 0 ? 'calc(125vh - 100px)' : 'calc(100vh - 85px)') : 'auto' }}
        >
            {/* Hidden Print Component - Off-screen but with real dimensions for print engine */}
            <div style={{ position: 'fixed', left: '-9999px', top: '-9999px', visibility: 'hidden', pointerEvents: 'none', zIndex: -1 }}>
                <ComprobantePrintPage
                    id="print-root"
                    company={vm.authWithBranding}
                    qrCodeDataUrl={vm.qrCodeDataUrl}
                    productsInvoice={vm.productsInvoice}
                    total={vm.totalAdjusted}
                    mode={"vista previa"}
                    componentRef={componentRef}
                    size={localPrintSize}
                    includeProductImages={vm.includeProductImages}
                    quotationDiscount={vm.quotationDiscount}
                    quotationValidity={vm.quotationValidity}
                    quotationSignature={vm.quotationSignature}
                    quotationTerms={vm.quotationTerms}
                    quotationPaymentType={vm.quotationPaymentType}
                    quotationAdvance={vm.quotationAdvance}
                    quotationCurrency={vm.quotationCurrency}
                    formValues={printFormValues}
                    serie={vm.serie}
                    correlative={vm.correlative}
                    discount={vm.finalDiscount.toString()}
                    receipt={vm.formValues?.comprobante}
                    selectedClient={vm.snapshotClient ?? vm.selectedClient}
                    totalInWords={vm.totalInWords}
                    observation={vm.formValues?.observaciones || vm.formValues?.motivo}
                    retencionData={vm.retencionData}
                />
            </div>

            {/* LEFT PANEL */}
            <POSCatalogLayout vm={vm} layout={posLayout} />

            {/* Floating Mobile Cart Toggle */}
            {vm.isMobile && !vm.showMobileCart && vm.productsInvoice.length > 0 && (
                <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-[#111827] border-t border-gray-200 dark:border-slate-800 p-4 z-[50] shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] flex items-center justify-between pb-8">
                    <div className="flex flex-col">
                        <span className="text-gray-500 dark:text-gray-400 text-xs font-semibold">{vm.productsInvoice.length} Items</span>
                        <span className="text-xl font-bold text-gray-900 dark:text-white">{vm.monedaSimbolo} {vm.totalAdjusted.toFixed(2)}</span>
                    </div>
                    <button
                        onClick={() => vm.setShowMobileCart(true)}
                        className="bg-gray-900 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-black transition-colors"
                    >
                        <Icon icon="solar:cart-large-minimalistic-bold" className="text-xl" />
                        Ver Pedido
                    </button>
                </div>
            )}

            {/* RIGHT PANEL: CART / INVOICE */}
            <div className={`w-full ${posLayout === 'CAJA' ? 'md:w-[55%]' : 'md:w-[35%]'} flex-col h-auto md:h-full overflow-hidden bg-white dark:bg-[#111827] rounded-[24px] shadow-[0_18px_55px_rgba(15,23,42,0.08)] border border-slate-100 dark:border-transparent ${vm.isMobile ? (vm.showMobileCart ? 'fixed inset-0 z-[60] flex' : 'hidden') : 'flex'} md:flex`}>
                <div className="flex-shrink-0 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-[#111827] p-4">
                    <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                            <div className="flex items-center gap-2">
                                {vm.isMobile && (
                                    <button
                                        onClick={() => vm.setShowMobileCart(false)}
                                        className="-ml-2 rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-white"
                                    >
                                        <Icon icon="solar:arrow-left-linear" className="text-xl" />
                                    </button>
                                )}
                                <div className="grid h-9 w-9 place-items-center rounded-2xl bg-violet-50 text-violet-600 dark:bg-violet-900/20 dark:text-violet-300">
                                    <Icon icon="solar:cart-large-minimalistic-bold-duotone" className="text-lg" />
                                </div>
                                <div className="min-w-0">
                                    <h2 className="truncate text-base font-extrabold text-slate-900 dark:text-white">Detalle de venta</h2>
                                    <p className="truncate text-xs font-medium text-slate-400">Revisa los ítems y emite el comprobante</p>
                                </div>
                            </div>
                        </div>

                        <div className="flex shrink-0 items-center gap-1.5">
                            {/* Selector de diseño del POS (se recuerda por equipo) */}
                            <div className="hidden md:flex items-center rounded-xl border border-slate-200 bg-white p-0.5 dark:border-slate-700 dark:bg-slate-800" title="Diseño de la vista de venta">
                                <button
                                    type="button"
                                    onClick={() => cambiarLayout('CATALOGO')}
                                    title="Diseño Catálogo: cards de productos grandes"
                                    className={`grid h-8 w-8 place-items-center rounded-lg transition ${posLayout === 'CATALOGO' ? 'bg-violet-600 text-white shadow-sm' : 'text-slate-400 hover:text-violet-600'}`}
                                >
                                    <Icon icon="solar:widget-4-linear" className="text-sm" />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => cambiarLayout('CAJA')}
                                    title="Diseño Caja rápida: prioridad al carrito, productos en lista"
                                    className={`grid h-8 w-8 place-items-center rounded-lg transition ${posLayout === 'CAJA' ? 'bg-violet-600 text-white shadow-sm' : 'text-slate-400 hover:text-violet-600'}`}
                                >
                                    <Icon icon="solar:cart-check-linear" className="text-sm" />
                                </button>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsSaleConfigOpen(true)}
                                className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-600 transition hover:bg-slate-50 hover:text-violet-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                            >
                                <Icon icon="solar:settings-linear" className="text-sm" />
                                Configurar
                            </button>
                        </div>
                    </div>

                    <div className="mt-3 grid grid-cols-1 gap-2">
                        {/* Cliente — DNI/RUC + Enter lo busca en la empresa o lo crea desde el padrón */}
                        <div className="flex items-center justify-between gap-2 rounded-2xl border border-slate-100 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-900/50">
                            <div className="flex min-w-0 flex-1 items-center gap-2">
                                <div className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-violet-50 text-violet-600 dark:bg-violet-900/20 dark:text-violet-300">
                                    <Icon icon={vm.clienteDocLookupLoading ? 'svg-spinners:180-ring' : 'solar:user-linear'} className="text-base" />
                                </div>
                                <div className="min-w-0 flex-1 relative">
                                    <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">Cliente</p>
                                    <input
                                        value={clienteSearchOpen ? clienteSearchTerm : selectedClientLabel}
                                        onFocus={() => {
                                            setClienteSearchOpen(true);
                                            if (clienteSearchTerm === selectedClientLabel) {
                                                setClienteSearchTerm('');
                                            }
                                        }}
                                        onBlur={() => {
                                            window.setTimeout(() => setClienteSearchOpen(false), 120);
                                        }}
                                        onChange={(e) => {
                                            const next = e.target.value;
                                            setClienteSearchTerm(next);
                                            setClienteSearchOpen(true);
                                            if (next.trim().length >= 3) {
                                                vm.handleGetDataClient(next.trim(), () => {});
                                            }
                                        }}
                                        onKeyDown={handleClienteSearchKeyDown}
                                        inputMode="search"
                                        disabled={vm.clienteDocLookupLoading}
                                        placeholder="DNI, RUC o nombre"
                                        className="w-full bg-transparent text-sm font-extrabold text-slate-800 outline-none placeholder:font-semibold placeholder:text-slate-400 dark:text-slate-100"
                                    />
                                    {clienteSearchOpen && clienteSearchTerm.trim().length >= 3 && clienteSearchResults.length > 0 && (
                                        <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-30 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
                                            {clienteSearchResults.map((client: any) => (
                                                <button
                                                    key={client.id}
                                                    type="button"
                                                    onMouseDown={(e) => e.preventDefault()}
                                                    onClick={() => handleSelectClienteSuggestion(client)}
                                                    className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left hover:bg-violet-50 dark:hover:bg-violet-950/30"
                                                >
                                                    <div className="min-w-0">
                                                        <p className="truncate text-sm font-bold text-slate-900 dark:text-white">
                                                            {client?.nombre || client?.razonSocial || 'Cliente'}
                                                        </p>
                                                        <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">
                                                            {client?.nroDoc || '-'}
                                                        </p>
                                                    </div>
                                                    <span className="shrink-0 text-[10px] font-black uppercase text-violet-600 dark:text-violet-400">
                                                        Elegir
                                                    </span>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="flex shrink-0 items-center gap-1.5">
                                <button
                                    type="button"
                                    onMouseDown={(e) => e.preventDefault()}
                                    onClick={() => vm.openClientModal()}
                                    title="Agregar cliente"
                                    className="grid h-7 w-7 place-items-center rounded-xl bg-white text-slate-400 shadow-sm ring-1 ring-slate-200 transition hover:text-violet-600 dark:bg-slate-800 dark:ring-slate-700"
                                >
                                    <Icon icon="solar:user-plus-bold" className="text-sm" />
                                </button>
                            </div>
                        </div>
                        {/* Comprobante */}
                        <div className="flex items-center justify-between gap-2 rounded-2xl border border-slate-100 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-900/50">
                            <div className="flex min-w-0 items-center gap-2">
                                <div className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-violet-50 text-violet-600 dark:bg-violet-900/20 dark:text-violet-300">
                                    <Icon icon="solar:document-text-linear" className="text-base" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">Comprobante</p>
                                    <p className="truncate text-sm font-extrabold text-slate-800 dark:text-slate-100">{documentLabel}</p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsComprobanteModalOpen(true)}
                                className="shrink-0 rounded-xl bg-white px-3 py-1.5 text-xs font-bold text-violet-600 shadow-sm ring-1 ring-slate-200 transition hover:bg-violet-50 dark:bg-slate-800 dark:ring-slate-700"
                            >
                                Cambiar
                            </button>
                        </div>
                        {/* Cobranza en campo: vendedor de campo atribuido a la venta.
                            Solo si la empresa activó "Cobranza con vendedores de campo". */}
                        {vm.cobranzaCampo && !vm.isQuotationRoute && (
                            <div className="rounded-2xl border border-slate-100 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-900/50">
                                <p className="mb-1 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wide text-slate-400">
                                    <Icon icon="solar:user-hand-up-bold-duotone" width={12} className="text-violet-500" />
                                    Vendedor de campo
                                </p>
                                <Select
                                    error=""
                                    label=""
                                    name="vendedorCampo"
                                    value={vm.vendedoresCampo?.find((u: any) => u.id === vm.vendedorCampoId)?.nombre || ''}
                                    options={(vm.vendedoresCampo || []).map((u: any) => ({ id: u.id, value: u.nombre || u.email || `Usuario ${u.id}` }))}
                                    onChange={(id: any) => vm.setVendedorCampoId(Number(id) || null)}
                                />
                            </div>
                        )}
                    </div>
                </div>
                <POSCartLayout vm={vm} />
                <POSCalculations vm={vm} printFn={printFn} handleOpenNewTab={handleOpenNewTab} />
            </div>

            {isSaleConfigOpen && (
                <div className="fixed inset-0 z-[180] flex items-end justify-center md:items-center">
                    <div className="absolute inset-0 bg-slate-950/35 backdrop-blur-sm" onClick={() => setIsSaleConfigOpen(false)} />
                    <div className="relative max-h-[90vh] w-full overflow-hidden rounded-t-[28px] bg-white shadow-2xl dark:bg-[#111827] md:w-[520px] md:rounded-[28px]">
                        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800">
                            <div>
                                <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">Configurar venta</h3>
                                <p className="text-xs font-medium text-slate-400">Cliente, pago, envío y datos fiscales.</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsSaleConfigOpen(false)}
                                className="grid h-9 w-9 place-items-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-white"
                            >
                                <Icon icon="solar:close-circle-linear" className="text-xl" />
                            </button>
                        </div>
                        <div className="max-h-[calc(90vh-76px)] overflow-y-auto">
                            <POSOptionsForm
                                vm={vm}
                                onOpenComprobanteModal={() => setIsComprobanteModalOpen(true)}
                            />
                        </div>
                    </div>
                </div>
            )}

            {isComprobanteModalOpen && (
                <ComprobanteTypeModal
                    options={vm.comprobantesGenerar}
                    selected={vm.formValues?.comprobante}
                    onSelect={handleSelectComprobante}
                    onClose={() => setIsComprobanteModalOpen(false)}
                />
            )}

            {/* Modals */}
            {/* El modal de "comprobante emitido" ahora se muestra como transición
                dentro del modal "Continuar pago" (ver POSCalculations / EmitidoContent). */}

            {vm.isOpenModalProduct && (
                <ModalProduct
                    setSelectProduct={vm.setSelectProduct}
                    isInvoice
                    initialForm={vm.initialFormProduct}
                    setErrors={vm.setErrorsProduct}
                    setFormValues={vm.setFormValuesProduct}
                    isOpenModal={vm.isOpenModalProduct}
                    errors={vm.errorsProduct}
                    formValues={vm.formValuesProduct}
                    isEdit={false}
                    setIsOpenModal={vm.setIsOpenModalProduct}
                    closeModal={vm.closeModal}
                />
            )}

            {vm.isOpenModalClient && (
                <ModalClient
                    isOpenModal={vm.isOpenModalClient}
                    errors={vm.errorsClient}
                    setErrors={vm.setErrorsClient}
                    formValues={vm.formValuesClient}
                    setFormValues={vm.setFormValuesClient}
                    isEdit={false}
                    setIsOpenModal={vm.setIsOpenModalClient}
                    closeModal={vm.closeModal}
                    onCreated={vm.handleClienteCreado}
                />
            )}

            {vm.isOpenClientLookupConfirm && vm.pendingClientLookup && (
                <ModalConfirm
                    isOpenModal={vm.isOpenClientLookupConfirm}
                    setIsOpenModal={(open) => {
                        if (!open) vm.handleCancelPendingClientLookup();
                    }}
                    confirmSubmit={vm.handleConfirmPendingClientLookup}
                    title="Cliente no encontrado"
                    information={`No encontramos ${vm.pendingClientLookup.nroDoc} en el sistema. ¿Quieres agregarlo ahora para usarlo en este comprobante y guardarlo para después?`}
                    confirmText="Agregar cliente"
                    confirmLoading={vm.clientLookupConfirmLoading}
                >
                    <div className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                        <p className="font-semibold text-slate-900 dark:text-white">{vm.pendingClientLookup.nombre}</p>
                        <p>{vm.pendingClientLookup.nroDoc}</p>
                    </div>
                </ModalConfirm>
            )}

            {vm.editingIndex !== -1 && (
                <ModalEditLineItem
                    isOpen={vm.editingIndex !== -1}
                    onClose={() => vm.setEditingIndex(-1)}
                    item={vm.productsInvoice[vm.editingIndex]}
                    onSave={vm.handleSaveEdit}
                />
            )}

            <ModalDetraccion
                isOpen={vm.isModalDetraccionOpen}
                onClose={() => vm.setIsModalDetraccionOpen(false)}
                onSave={vm.handleSaveDetraccion}
                initialData={vm.tipoDetraccionId ? {
                    tipoDetraccionId: vm.tipoDetraccionId || 0,
                    medioPagoDetraccionId: vm.medioPagoDetraccionId || 0,
                    cuentaBancoNacion: vm.cuentaBancoNacion || '',
                    porcentajeDetraccion: vm.porcentajeDetraccion || 0,
                    montoDetraccion: vm.montoDetraccion || 0,
                    formaPago: vm.formValues.medioPago as 'Contado' | 'Credito' || 'Contado',
                    cuotas: vm.cuotas || [],
                } : null}
                totalFactura={vm.total || 0}
                tiposDetraccion={vm.tiposDetraccion}
                mediosPagoDetraccion={vm.mediosPagoDetraccion}
                defaultCuentaBancoNacion={(vm.auth as any)?.empresa?.cuentaDetraccionBN || ''}
            />
            <ModalDetraccion
                isOpen={vm.isModalRetencionOpen}
                onClose={() => vm.setIsModalRetencionOpen(false)}
                onSave={vm.handleSaveRetencion}
                totalFactura={vm.totalAdjusted}
                tiposDetraccion={vm.tiposDetraccion}
                mediosPagoDetraccion={vm.mediosPagoDetraccion}
                initialData={vm.retencionData}
                mode="RETENCION"
            />
            <ModalCuotas
                isOpen={vm.isModalCuotasOpen}
                onClose={() => vm.setIsModalCuotasOpen(false)}
                onSave={(cuotas) => vm.setCuotas(cuotas)}
                initialCuotas={vm.cuotas || []}
                totalFactura={vm.totalCredito ?? vm.totalAdjusted}
            />
            <ModalSeleccionVariante
                isOpen={!!vm.varianteModalProduct}
                onClose={() => vm.setVarianteModalProduct(null)}
                product={vm.varianteModalProduct}
                onSelect={vm.handleSelectVariante}
            />
            <ModalConfiguracionCotizacion
                isOpen={vm.isQuotationConfigModalOpen}
                onClose={() => vm.setIsQuotationConfigModalOpen(false)}
                onSave={vm.handleSaveQuotationConfig}
                initialConfig={{
                    includeProductImages: vm.includeProductImages,
                    quotationDiscount: vm.quotationDiscount,
                    quotationValidity: vm.quotationValidity,
                    quotationSignature: vm.quotationSignature,
                    quotationTerms: vm.quotationTerms,
                    quotationPaymentType: vm.quotationPaymentType,
                    quotationAdvance: vm.quotationAdvance,
                    quotationCurrency: vm.quotationCurrency,
                    observaciones: vm.formValues.observaciones
                }}
            />
            {/* Farmacia: modal de receta médica */}
            <ModalRecetaMedica
                isOpen={vm.isRecetaModalOpen}
                item={vm.recetaModalItemIndex !== null ? vm.productsInvoice[vm.recetaModalItemIndex] : null}
                onConfirmar={(datos) => vm.recetaModalItemIndex !== null && vm.handleConfirmarReceta(vm.recetaModalItemIndex, datos)}
                onCerrar={() => vm.setIsRecetaModalOpen(false)}
            />
        </div>
    );
};
export default FacturacionNuevoView;

function ComprobanteTypeModal({
    options,
    selected,
    onSelect,
    onClose,
}: {
    options: any[];
    selected?: string;
    onSelect: (option: any) => void;
    onClose: () => void;
}) {
    const optionMeta = (label: string) => {
        const key = String(label || '').toUpperCase();
        if (key.includes('FACTURA')) return { icon: 'solar:document-add-bold-duotone', tone: 'bg-violet-50 text-violet-600', help: 'Venta formal con RUC.' };
        if (key.includes('BOLETA')) return { icon: 'solar:bill-list-bold-duotone', tone: 'bg-blue-50 text-blue-600', help: 'Venta formal para consumidor.' };
        if (key.includes('NOTA DE VENTA')) return { icon: 'solar:shop-bold-duotone', tone: 'bg-emerald-50 text-emerald-600', help: 'Venta interna rápida.' };
        if (key.includes('PEDIDO')) return { icon: 'solar:clipboard-list-bold-duotone', tone: 'bg-amber-50 text-amber-600', help: 'Reserva o pedido pendiente.' };
        if (key.includes('COT')) return { icon: 'solar:document-text-bold-duotone', tone: 'bg-sky-50 text-sky-600', help: 'Propuesta comercial.' };
        return { icon: 'solar:file-text-bold-duotone', tone: 'bg-slate-100 text-slate-600', help: 'Documento de venta.' };
    };

    return (
        <div className="fixed inset-0 z-[190] flex items-end justify-center md:items-center">
            <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm" onClick={onClose} />
            <div className="relative w-full overflow-hidden rounded-t-[30px] bg-white shadow-2xl dark:bg-[#111827] md:w-[560px] md:rounded-[30px]">
                <div className="border-b border-slate-100 px-6 py-5 dark:border-slate-800">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <p className="text-xs font-bold uppercase tracking-[0.18em] text-violet-500">Nuevo comprobante</p>
                            <h3 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 dark:text-white">¿Qué comprobante crearás?</h3>
                            <p className="mt-1 text-sm font-normal text-slate-400">Elige el tipo y luego agrega los productos de la venta.</p>
                        </div>
                        <button
                            type="button"
                            onClick={onClose}
                            className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-white"
                        >
                            <Icon icon="solar:close-circle-linear" className="text-2xl" />
                        </button>
                    </div>
                </div>

                <div className="grid max-h-[60vh] gap-2 overflow-y-auto p-4 sm:grid-cols-2">
                    {(options || []).map((option) => {
                        const meta = optionMeta(option.value);
                        const active = selected === option.value;
                        return (
                            <button
                                key={`${option.id}-${option.value}`}
                                type="button"
                                onClick={() => onSelect(option)}
                                className={`group flex items-start gap-3 rounded-2xl border p-4 text-left transition-all ${
                                    active
                                        ? 'border-violet-400 bg-violet-100 shadow-[0_14px_35px_rgba(117,81,255,0.18)] ring-1 ring-violet-300/70 dark:border-violet-400/70 dark:bg-violet-500/15 dark:shadow-[0_18px_40px_rgba(99,102,241,0.22)] dark:ring-violet-400/30'
                                        : 'border-slate-100 bg-white hover:border-violet-200 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900/40 dark:hover:bg-slate-900'
                                }`}
                            >
                                <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl transition-colors ${
                                    active
                                        ? 'bg-white text-violet-700 dark:bg-violet-400/20 dark:text-violet-100'
                                        : meta.tone
                                }`}>
                                    <Icon icon={meta.icon} className="text-xl" />
                                </span>
                                <span className="min-w-0">
                                    <span className={`block text-sm font-extrabold ${active ? 'text-violet-950 dark:text-white' : 'text-slate-900 dark:text-white'}`}>{option.value}</span>
                                    <span className={`mt-0.5 block text-xs font-medium ${active ? 'text-violet-700/80 dark:text-violet-100/80' : 'text-slate-400'}`}>{meta.help}</span>
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
