import { Icon } from "@iconify/react/dist/iconify.js";
import moment from "moment";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import DataTable from "@/components/Datatable";
import Pagination from "@/components/Pagination";
import { numberToWords } from "@/utils/numberToLetters";
import { Calendar } from "@/components/Date";
import Select from "@/components/Select";
import ModalConfirm from "@/components/ModalConfirm";
import ComprobantePrintPage from "../../../pages/admin/facturacion/comprobanteImprimir";
import ModalEnviarWhatsApp from "../../../pages/admin/facturacion/ModalEnviarWhatsApp";
import ModalPaymentUnified from "@/components/ModalPaymentUnified";
import PaymentReceipt from "@/components/PaymentReceipt";
import Modal from "@/components/Modal";
import TableActionMenu from "@/components/TableActionMenu";

import { useCotizacionesViewModel } from "./useCotizacionesViewModel";
import ModalConfigCotizacion from "./ModalConfigCotizacion";
import { IInvoices } from "@/interfaces/invoices";

const ACCENT = 'var(--accent, #7551FF)';

export default function CotizacionesView() {
    const vm = useCotizacionesViewModel();
    const [configFormatoOpen, setConfigFormatoOpen] = useState(false);
    const navigate = useNavigate();

    const productsTable = vm.invoices?.map((item: IInvoices) => {
        const rowBase: any = {
            id: item?.id,
            fechaEmisión: moment(item?.fechaEmision).format('DD/MM/YYYY HH:mm:ss'),
            serie: item.serie,
            correlativo: item.correlativo,
            comprobante: item.comprobante,
            documentoAfiliado: item?.numDocAfectado,
            document: item?.cliente?.nroDoc,
            s3PdfUrl: item?.s3PdfUrl,
            client: item?.cliente?.nombre,
            total: `${String((item as any).cotizMoneda || item.tipoMoneda || 'PEN').toUpperCase() === 'USD' ? '$' : 'S/'} ${item.mtoImpVenta.toFixed(2)}`,
            estado: ["BOLETA", "FACTURA", "NOTA DE CREDITO", "NOTA DE DEBITO"].includes(item.comprobante)
                ? item.estadoEnvioSunat
                : item.estadoPago,
            xmlSunat: item.sunatXml,
            cdrSunat: item.sunatCdrZip,
        };

        const canEmitirSunat = ["BOLETA", "FACTURA", "NOTA DE CREDITO", "NOTA DE DEBITO"].includes(rowBase.comprobante);

        const acciones = (
            <div className="relative inline-block" onClick={(e) => e.stopPropagation()}>
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        if (vm.openAccionesId === rowBase.id) {
                            vm.setOpenAccionesId(null);
                            vm.setAnchorEl(null);
                        } else {
                            vm.setOpenAccionesId(rowBase.id);
                            vm.setAnchorEl(e.currentTarget);
                        }
                    }}
                    className="h-8 w-8 grid place-items-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200 transition-colors"
                >
                    <Icon icon="mdi:dots-vertical" width={18} height={18} />
                </button>
            </div>
        );

        return {
            ...rowBase,
            acciones,
        };
    });

    return (
        <>
            <div style={{ position: 'fixed', left: '-9999px', top: '-9999px', visibility: 'hidden', pointerEvents: 'none', zIndex: -1 }}>
            {vm.invoice && vm.invoice.detalles && (
                <ComprobantePrintPage
                    company={vm.auth}
                    componentRef={vm.componentRef}
                    formValues={vm.invoice}
                    size={vm.printSize}
                    serie={vm.invoice?.serie}
                    correlative={vm.invoice?.correlativo}
                    productsInvoice={(() => {
                        const mapped = vm.invoice?.detalles?.map((det: any) => ({
                            ...det,
                            imagenUrl: det.producto?.imagenUrl || det.imagenUrl,
                        }));
                        return mapped;
                    })()}
                    total={Number(vm.invoice?.mtoImpVenta).toFixed(2)}
                    mode="off"
                    qrCodeDataUrl={vm.qrCodeDataUrl}
                    discount={vm.invoice?.discount}
                    receipt={vm.comprobante || vm.invoice?.comprobante}
                    selectedClient={vm.invoice?.cliente}
                    totalInWords={numberToWords(parseFloat(vm.invoice?.mtoImpVenta as any)) + (String((vm.invoice as any)?.cotizMoneda || 'PEN').toUpperCase() === 'USD' ? " DÓLARES" : " SOLES")}
                    observation={vm.invoice?.observaciones}
                    includeProductImages={vm.invoice?.cotizIncluirImagenes || false}
                    quotationDiscount={vm.invoice?.cotizDescuento || 0}
                    quotationValidity={vm.invoice?.cotizVigencia || 7}
                    quotationSignature={vm.invoice?.cotizFirmante || ''}
                    quotationTerms={vm.invoice?.cotizTerminos || ''}
                    quotationPaymentType={vm.invoice?.cotizTipoPago || 'CONTADO'}
                    quotationAdvance={vm.invoice?.cotizAdelanto || 0}
                    quotationCurrency={vm.invoice?.cotizMoneda || 'PEN'}
                />
            )}
            </div>

            <div className="min-h-screen -m-5 p-5 bg-[#F7F8FB] dark:bg-[#0A0D14] font-jakarta">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm text-slate-400 dark:text-gray-400 mb-5">
                <Icon icon="solar:home-smile-linear" className="text-base" />
                <span>Panel</span>
                <Icon icon="solar:alt-arrow-right-linear" className="text-xs" />
                <span>Ventas</span>
                <Icon icon="solar:alt-arrow-right-linear" className="text-xs" />
                <span className="font-semibold" style={{ color: ACCENT }}>Cotizaciones</span>
            </div>

            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-5">
                <div className="flex items-center gap-3 min-w-0">
                    <div className="h-11 w-11 grid place-items-center rounded-2xl bg-violet-50 text-violet-600 dark:bg-violet-900/20 dark:text-violet-400 shrink-0">
                        <Icon icon="solar:document-text-bold-duotone" className="text-2xl" />
                    </div>
                    <div className="min-w-0">
                        <h1 className="text-[22px] font-extrabold text-slate-800 dark:text-white tracking-tight truncate">Cotizaciones</h1>
                        <p className="text-sm text-slate-400 dark:text-gray-400 mt-0.5">Gestiona y convierte tus cotizaciones en facturas</p>
                    </div>
                </div>
                <div className="grid w-full grid-cols-1 gap-2.5 sm:w-auto sm:grid-cols-3">
                    <button
                        type="button"
                        onClick={() => setConfigFormatoOpen(true)}
                        className="h-11 px-4 rounded-2xl border border-slate-200 bg-white text-sm font-bold text-slate-600 flex items-center justify-center gap-1.5 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors"
                    >
                        <Icon icon="solar:tuning-square-bold-duotone" className="text-lg" />
                        Configurar formato
                    </button>
                    <button
                        type="button"
                        onClick={() => vm.setIsOpenModalClean(true)}
                        className="h-11 px-4 rounded-2xl border border-rose-200 bg-white text-sm font-bold text-rose-600 flex items-center justify-center gap-1.5 hover:bg-rose-50 dark:border-rose-900/40 dark:bg-slate-800 dark:text-rose-400 dark:hover:bg-rose-900/20 transition-colors"
                    >
                        <Icon icon="solar:trash-bin-trash-bold-duotone" className="text-lg" />
                        Limpiar pruebas
                    </button>
                    <button
                        type="button"
                        onClick={() => navigate('/administrador/cotizaciones/nuevo')}
                        className="h-11 px-4 rounded-2xl text-white text-sm font-bold flex items-center justify-center gap-1.5 shadow-lg shadow-violet-500/30 hover:brightness-105 transition-all"
                        style={{ background: ACCENT }}
                    >
                        <Icon icon="solar:add-circle-bold" className="text-lg" />
                        Nueva Cotización
                    </button>
                </div>
            </div>

            {/* Main Content Card */}
            <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-[0_2px_20px_rgba(15,23,42,0.05)] dark:shadow-none border border-slate-100 dark:border-slate-700 overflow-hidden">
                {/* Filters Section */}
                <div className="border-b border-slate-100 dark:border-slate-700 p-4 sm:p-5">
                    <div className="space-y-3">
                        {/* Fila 1: título + búsqueda inline */}
                        <div className="flex flex-wrap items-center gap-2.5">
                            <h3 className="shrink-0 pr-1 text-base font-extrabold text-slate-800 dark:text-white">Cotizaciones</h3>
                            <div className="relative min-w-[200px] flex-1 sm:max-w-md">
                                <Icon icon="solar:magnifer-linear" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400 dark:text-gray-400" />
                                <input
                                    name="searchClient"
                                    onChange={vm.handleChangeSearch}
                                    placeholder="Buscar serie, cliente, correlativo"
                                    className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-700 outline-none transition-colors placeholder:text-slate-400 focus:border-[var(--accent)] dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder:text-gray-500"
                                />
                            </div>
                        </div>
                        {/* Fila 2: filtros (fechas, formato) */}
                        <div className="flex flex-wrap items-end gap-2.5">
                            <div className="w-full sm:w-40">
                                <Calendar text="Desde" name="fechaInicio" value={moment(vm.fechaInicio).format('DD/MM/YYYY')} onChange={vm.handleDate} className="admin-date-filter" portal />
                            </div>
                            <div className="w-full sm:w-40">
                                <Calendar text="Hasta" name="fechaFin" value={moment(vm.fechaFin).format('DD/MM/YYYY')} onChange={vm.handleDate} className="admin-date-filter" portal />
                            </div>
                            <div className="w-full sm:w-44">
                                <Select onChange={vm.handleSelectPrint} withLabel={false} label="" name="printSize" defaultValue={vm.printSize} options={vm.printOptions} error="" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Table Content */}
                <div className="p-4">
                    {productsTable?.length > 0 ? (
                        <>
                            <div className="overflow-x-auto">
                                <DataTable bodyData={productsTable}
                                    headerColumns={[
                                        'Fecha',
                                        'Serie',
                                        'Nro.',
                                        'Comprobante',
                                        'Doc. Afiliado',
                                        'Num doc',
                                        'Cliente',
                                        'Importe',
                                        'Estado',
                                        'Acciones'
                                    ]} />
                            </div>
                            <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
                                <Pagination
                                    data={productsTable}
                                    optionSelect
                                    currentPage={vm.currentPage}
                                    indexOfFirstItem={vm.indexOfFirstItem}
                                    indexOfLastItem={vm.indexOfLastItem}
                                    setcurrentPage={vm.setcurrentPage}
                                    setitemsPerPage={vm.setitemsPerPage}
                                    pages={vm.pages}
                                    total={vm.totalInvoices}
                                />
                            </div>
                        </>
                    ) : (
                        <div className="py-16 text-center">
                            <Icon icon="solar:document-text-linear" className="text-5xl text-slate-200 dark:text-slate-700 mx-auto mb-3" />
                            <p className="text-slate-500 dark:text-gray-400 font-semibold">No se encontraron comprobantes</p>
                            <p className="text-sm text-slate-400 dark:text-gray-500 mt-1">Ajusta los filtros o selecciona un rango de fechas diferente</p>
                        </div>
                    )}
                </div>
            </div>

            {vm.isOpenModalConfirm && (
                <ModalConfirm
                    confirmSubmit={vm.confirmCancelInvoice}
                    information="¿Estás seguro que deseas anular este comprobante?"
                    isOpenModal
                    setIsOpenModal={() => vm.setIsOpenModalConfirm(false)}
                    title="Anular comprobante"
                />
            )}

            {vm.isOpenModalConfirmPayment && (
                <ModalConfirm
                    confirmSubmit={vm.confirmCompleteInvoice}
                    information="¿Cuál de estos metodos de pago se completo el pago?"
                    isOpenModal
                    setIsOpenModal={() => vm.setIsOpenModalConfirmPayment(false)}
                    title="Completar pago"
                >
                    <div className="grid grid-cols-3 gap-4 sm:gap-10 col-start-1 col-end-2 mb-5 mt-5">
                        {[
                            { key: 'Efectivo', src: 'https://img.freepik.com/vector-premium/efectivo-mano-logotipo-empresario-blanco_269543-105.jpg' },
                            { key: 'Yape', src: 'https://marketing-peru.beglobal.biz/wp-content/uploads/2025/01/logo-yape-bolivia.jpeg' },
                            { key: 'Plin', src: 'https://logosenvector.com/logo/img/plin-interbank-4391.png' },
                        ].map(({ key, src }) => (
                            <button
                                key={key}
                                type="button"
                                onClick={() => vm.setPaymentMethod(key)}
                                className={`p-1 justify-center rounded-lg flex border-2 ${vm.paymentMethod === key
                                    ? 'border-blue-500 bg-blue-100 dark:bg-blue-900/30'
                                    : 'border-transparent hover:border-gray-300 dark:hover:border-slate-600'
                                    }`}
                            >
                                <img src={src} alt={key} className="w-14 object-cover" />
                            </button>
                        ))}
                    </div>
                </ModalConfirm>
            )}

            {vm.isOpenModalDelete && (
                <ModalConfirm
                    confirmSubmit={vm.handleConfirmDeleteCotizacion}
                    information={`Se eliminará definitivamente ${vm.deleteCandidate?.serie || ''}-${String(vm.deleteCandidate?.correlativo || '').padStart(8, '0')}. No se puede deshacer.`}
                    isOpenModal
                    setIsOpenModal={() => vm.setIsOpenModalDelete(false)}
                    title="Eliminar cotización"
                    confirmText="Eliminar cotización"
                    confirmLoading={vm.isDeleting}
                />
            )}

            {vm.isOpenModalClean && (
                <ModalConfirm
                    confirmSubmit={vm.handleConfirmCleanCotizaciones}
                    information="Se eliminarán definitivamente las cotizaciones encontradas con los filtros actuales de fecha y búsqueda. Las cotizaciones convertidas no se eliminan."
                    isOpenModal
                    setIsOpenModal={() => vm.setIsOpenModalClean(false)}
                    title="Limpiar cotizaciones de prueba"
                    confirmText="Limpiar cotizaciones"
                    confirmLoading={vm.isDeleting}
                />
            )}

            {vm.isOpenModalWhatsApp && vm.comprobanteWhatsApp && (
                <ModalEnviarWhatsApp
                    isOpen={vm.isOpenModalWhatsApp}
                    defaultTab={vm.modalDefaultTab}
                    onClose={() => {
                        vm.setIsOpenModalWhatsApp(false);
                    }}
                    comprobante={vm.comprobanteWhatsApp}
                />
            )}

            <Modal
                isOpenModal={vm.isOpenModalPdf}
                closeModal={() => vm.setIsOpenModalPdf(false)}
                title="Vista previa del PDF"
                width="980px"
            >
                <div className="p-3 space-y-3">
                    <div className="flex justify-end">
                        {vm.pdfUrl && (
                            <a
                                href={vm.pdfUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="px-3 py-1.5 text-xs rounded-md bg-[#6A6CFF] text-white hover:opacity-90"
                            >
                                Descargar
                            </a>
                        )}
                    </div>
                    <div className="h-[80vh] flex items-center justify-center">
                        {!vm.pdfUrl ? (
                            <div className="flex flex-col items-center gap-3 text-gray-400 dark:text-gray-500">
                                <Icon icon="solar:refresh-bold" className="animate-spin text-violet-500" width={36} />
                                <span className="text-sm">Generando PDF...</span>
                            </div>
                        ) : (
                            <iframe src={vm.pdfUrl} className="w-full h-full rounded-lg border dark:border-slate-700" />
                        )}
                    </div>
                </div>
            </Modal>

            {(vm.isOpenModalPagoParcial && vm.paymentFlow.payment) && (
                <ModalPaymentUnified
                    isOpen={vm.isOpenModalPagoParcial}
                    isLoading={vm.paymentFlow.isLoading}
                    paymentType={vm.paymentFlow.payment.tipo}
                    saldoPendiente={parseFloat((vm.formValues?.saldo || '').toString().replace('S/ ', '') || '0') || parseFloat((vm.formValues?.total || '').toString().replace('S/ ', '') || '0')}
                    totalComprobante={parseFloat((vm.formValues?.total || '').toString().replace('S/ ', '') || '0')}
                    comprobanteInfo={{
                        id: vm.formValues.id,
                        serie: vm.formValues.serie,
                        correlativo: vm.formValues.correlativo,
                        cliente: vm.formValues.client,
                        total: parseFloat((vm.formValues?.total || '').toString().replace('S/ ', '') || '0')
                    }}
                    onConfirm={vm.handleConfirmPago}
                    onCancel={() => {
                        vm.setIsOpenModalPagoParcial(false);
                        vm.paymentFlow.reset();
                    }}
                    error={vm.paymentFlow.error || ''}
                />
            )}

            {vm.paymentFlow.showReceipt && vm.paymentFlow.receiptData && (
                <PaymentReceipt
                    comprobante={vm.paymentFlow.receiptData.comprobante}
                    saldo={vm.formValues?.saldo}
                    payment={vm.paymentFlow.receiptData.payment}
                    numeroRecibo={vm.paymentFlow.receiptData.numeroRecibo}
                    nuevoSaldo={vm.paymentFlow.receiptData.nuevoSaldo}
                    detalles={vm.paymentFlow.receiptData.detalles}
                    cliente={vm.paymentFlow.receiptData.cliente}
                    pagosHistorial={vm.paymentFlow.receiptData.pagosHistorial}
                    totalPagado={vm.paymentFlow.receiptData.totalPagado}
                    company={vm.auth}
                    onClose={vm.handleCloseReceipt}
                />
            )}

            <TableActionMenu
                isOpen={!!vm.openAccionesId && !!vm.anchorEl}
                anchorEl={vm.anchorEl}
                onClose={() => {
                    vm.setOpenAccionesId(null);
                    vm.setAnchorEl(null);
                }}
            >
                {vm.openAccionesId && (() => {
                    const rowData = productsTable.find((r: any) => r.id === vm.openAccionesId);
                    if (!rowData) return null;

                    const canEmitirSunat = ["BOLETA", "FACTURA", "NOTA DE CREDITO", "NOTA DE DEBITO"].includes(rowData.comprobante);

                    return (
                        <>
                            <button
                                type="button"
                                onClick={() => {
                                    vm.handleGetReceipt(rowData);
                                    vm.setOpenAccionesId(null);
                                    vm.setAnchorEl(null);
                                }}
                                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700"
                            >
                                <Icon icon="mingcute:print-line" width={16} height={16} />
                                <span>Imprimir</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    vm.handleVerPdf(rowData);
                                    vm.setOpenAccionesId(null);
                                    vm.setAnchorEl(null);
                                }}
                                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700"
                            >
                                <Icon icon="mdi:file-pdf-box" width={16} height={16} />
                                <span>Ver PDF</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    vm.handleEditCotizacion(rowData);
                                    vm.setOpenAccionesId(null);
                                    vm.setAnchorEl(null);
                                }}
                                className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-700 dark:text-blue-400 border-t border-gray-100 dark:border-slate-800"
                            >
                                <Icon icon="solar:pen-bold-duotone" width={16} height={16} />
                                <span className="font-medium">Editar</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    vm.handleConvertirAFactura(rowData);
                                    vm.setOpenAccionesId(null);
                                    vm.setAnchorEl(null);
                                }}
                                className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-emerald-50 dark:hover:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400"
                            >
                                <Icon icon="solar:document-add-bold-duotone" width={16} height={16} />
                                <span className="font-medium">Convertir a Factura</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    vm.handleConvertirABoleta(rowData);
                                    vm.setOpenAccionesId(null);
                                    vm.setAnchorEl(null);
                                }}
                                className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-teal-50 dark:hover:bg-teal-900/20 text-teal-700 dark:text-teal-400"
                            >
                                <Icon icon="solar:document-text-bold-duotone" width={16} height={16} />
                                <span className="font-medium">Convertir a Boleta</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    vm.handleEnviarWhatsApp(rowData, 'email');
                                    vm.setOpenAccionesId(null);
                                    vm.setAnchorEl(null);
                                }}
                                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/10 border-t border-gray-100 dark:border-slate-800"
                            >
                                <Icon icon="mdi:email-outline" width={16} height={16} />
                                <span className="font-medium">Enviar por Email</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    vm.handleEnviarWhatsApp(rowData, 'whatsapp');
                                    vm.setOpenAccionesId(null);
                                    vm.setAnchorEl(null);
                                }}
                                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/10"
                            >
                                <Icon icon="mdi:whatsapp" width={16} height={16} />
                                <span className="font-medium">Enviar WhatsApp</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    vm.handleRequestDeleteCotizacion(rowData);
                                    vm.setOpenAccionesId(null);
                                    vm.setAnchorEl(null);
                                }}
                                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10 border-t border-gray-100 dark:border-slate-800"
                            >
                                <Icon icon="solar:trash-bin-trash-bold-duotone" width={16} height={16} />
                                <span className="font-medium">Eliminar</span>
                            </button>
                        </>
                    );
                })()}
            </TableActionMenu>
            </div>

            <ModalConfigCotizacion
                isOpen={configFormatoOpen}
                onClose={() => setConfigFormatoOpen(false)}
                auth={vm.auth}
            />
        </>
    );
}
