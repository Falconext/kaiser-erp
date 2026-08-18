import { ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import moment from "moment";
import QRCode from 'qrcode';
import { useReactToPrint } from "react-to-print";

import { IInvoicesState, useInvoiceStore } from "@/zustand/invoices";
import { IInvoices } from "@/interfaces/invoices";
import useAlertStore from "@/zustand/alert";
import { useAuthStore } from "@/zustand/auth";
import { usePaymentFlow, PaymentType } from "@/hooks/usePaymentFlow";
import { useDebounce } from "@/hooks/useDebounce";
import { del, post } from "@/utils/fetch";
import { buildComprobantePrintPageStyle } from "@/utils/printStyles";

import { IComprobanteWhatsApp, IEstadoInvoiceOption, IPrintFormatOption, PrintFormatSize } from "./CotizacionesModel";

export function useCotizacionesViewModel() {
    const navigate = useNavigate();
    const { auth } = useAuthStore();
    const { getAllInvoices, totalInvoices, invoices, getInvoice, invoice, resetInvoice, cancelInvoice, completePay }: IInvoicesState = useInvoiceStore();
    const { success } = useAlertStore();

    const [currentPage, setcurrentPage] = useState(1);
    const [itemsPerPage, setitemsPerPage] = useState(50);
    const [searchClient, setSearchClient] = useState<string>("");
    const [formValues, setFormValues] = useState<any>({});

    // Modals
    const [isOpenModal, setIsOpenModal] = useState(false);
    const [isOpenModalConfirm, setIsOpenModalConfirm] = useState(false);
    const [isOpenModalConfirmPayment, setIsOpenModalConfirmPayment] = useState(false);
    const [isOpenModalWhatsApp, setIsOpenModalWhatsApp] = useState(false);
    const [modalDefaultTab, setModalDefaultTab] = useState<'whatsapp' | 'email'>('whatsapp');
    const [isOpenModalPagoParcial, setIsOpenModalPagoParcial] = useState(false);
    const [isOpenModalPdf, setIsOpenModalPdf] = useState(false);
    const [isOpenModalDelete, setIsOpenModalDelete] = useState(false);
    const [isOpenModalClean, setIsOpenModalClean] = useState(false);

    // States
    const [comprobante, setComprobante] = useState<string>("");
    const [fechaInicio, setFechaInicio] = useState<string>(moment(new Date()).format("YYYY-MM-DD"));
    const [fechaFin, setFechaFin] = useState<string>(moment(new Date()).format("YYYY-MM-DD"));
    const [paymentMethod, setPaymentMethod] = useState<string>("Efectivo");
    const [comprobanteWhatsApp, setComprobanteWhatsApp] = useState<IComprobanteWhatsApp | null>(null);
    const [openAccionesId, setOpenAccionesId] = useState<number | null>(null);
    const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
    const [pdfUrl, setPdfUrl] = useState<string>("");
    const [pdfName, setPdfName] = useState<string>("comprobante.pdf");
    const [shouldPrint, setShouldPrint] = useState(false);
    const [deleteCandidate, setDeleteCandidate] = useState<any>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Print Size & Dimensions
    const [printSize, setPrintSize] = useState<string>('A4');

    const paymentFlow = usePaymentFlow();
    const debounce = useDebounce(searchClient, 1000);

    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const pages = [];
    for (let i = 1; i <= Math.ceil(totalInvoices / itemsPerPage); i++) {
        pages.push(i);
    }

    // Effect for Alert store
    useEffect(() => {
        if (success) {
            setIsOpenModal(false);
        }
    }, [success]);

    // Limpiar el comprobante cargado al entrar/salir de esta página
    useEffect(() => {
        resetInvoice();
        return () => {
            resetInvoice();
        };
    }, []);

    // Cerrar menú de acciones al hacer click fuera — listener estable, sin re-registro por estado
    useEffect(() => {
        const handleClickOutside = () => {
            setOpenAccionesId(null);
            setAnchorEl(null);
        };

        document.addEventListener('click', handleClickOutside);
        return () => {
            document.removeEventListener('click', handleClickOutside);
        };
    }, []);

    // Dimensions derivadas de printSize — sin estado extra ni efecto
    const dimensions = useMemo(() => {
        switch (printSize) {
            case 'TICKET': return { width: 80, height: 330 };
            case 'A5': return { width: 148, height: 210 };
            case 'A4': return { width: 210, height: 297 };
            default: return { width: 210, height: 297 };
        }
    }, [printSize]);

    const reloadCotizaciones = useCallback(() => {
        getAllInvoices({
            tipoComprobante: "COTIZACION",
            page: currentPage,
            limit: itemsPerPage,
            search: debounce,
            fechaInicio,
            fechaFin,
            estado: ""
        });
    }, [currentPage, debounce, fechaFin, fechaInicio, getAllInvoices, itemsPerPage]);

    // Fetch invoices on change
    useEffect(() => {
        reloadCotizaciones();
    }, [reloadCotizaciones]);

    // Generate QR Code
    const ruc = "204812192919";
    const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
    useEffect(() => {
        const generateQR = async () => {
            try {
                const dataUrl = await QRCode.toDataURL(ruc, {
                    width: 90,
                    margin: 1,
                    color: {
                        dark: '#000000',
                        light: '#ffffff',
                    },
                    errorCorrectionLevel: 'H',
                });
                setQrCodeDataUrl(dataUrl);
            } catch (err) {
                console.error("Error al generar el QR:", err);
            }
        };
        generateQR();
    }, []);

    // Print feature setup
    const componentRef = useRef(null);
    const printFn = useReactToPrint({
        // @ts-ignore
        contentRef: componentRef,
        pageStyle: buildComprobantePrintPageStyle(dimensions),
        // Nombre sugerido al "Guardar como PDF": serie-correlativo de la cotización
        documentTitle: (invoice as any)?.serie ? `${(invoice as any).serie}-${(invoice as any).correlativo}` : undefined,
    });

    useEffect(() => {
        if (!shouldPrint || !invoice || !invoice.detalles) return;

        const timer = setTimeout(() => {
            if (componentRef?.current) {
                printFn();
            } else {
                console.error("No se encontró contenido imprimible");
            }
            setShouldPrint(false);
            resetInvoice();
        }, 500);

        return () => clearTimeout(timer);
    }, [invoice, shouldPrint, printFn, resetInvoice]);

    // Action Handlers
    const handleGetReceipt = async (data: any) => {
        setComprobante(data.comprobante);
        setShouldPrint(true);
        await getInvoice(data.id);
    };

    const handleEnviarWhatsApp = (data: any, tab: 'whatsapp' | 'email' = 'whatsapp') => {
        const comprobanteData = invoices.find((inv: IInvoices) => inv.id === data.id);
        if (comprobanteData) {
            setComprobanteWhatsApp({
                id: comprobanteData.id as number,
                serie: comprobanteData.serie as string,
                correlativo: Number(comprobanteData.correlativo),
                comprobante: comprobanteData.comprobante as string,
                total: comprobanteData.mtoImpVenta as number,
                clienteNombre: comprobanteData.cliente?.nombre || 'Cliente',
                clienteCelular: (comprobanteData as any).cliente?.telefono || '',
                clienteEmail: (comprobanteData as any).cliente?.email || '',
                pdfUrl: comprobanteData.s3PdfUrl || undefined,
            });
            setModalDefaultTab(tab);
            setIsOpenModalWhatsApp(true);
        }
    };

    const handleVerPdf = async (data: any) => {
        const corr = String(data.correlativo || '').padStart(8, '0');
        setPdfName(`${data.serie}-${corr}.pdf`);
        setPdfUrl('');
        setIsOpenModalPdf(true);
        try {
            const res: any = await post(`comprobante/${data.id}/generar-pdf`, {});
            const url = res?.data?.pdfUrl || res?.pdfUrl;
            if (url) setPdfUrl(url);
        } catch {
            useAlertStore.getState().alert('No se pudo generar el PDF', 'error');
            setIsOpenModalPdf(false);
        }
    };

    const handleConvertirAFactura = (data: any) => {
        const cotizacion = invoices.find((inv: IInvoices) => inv.id === data.id);
        if (!cotizacion) return;

        navigate('/administrador/facturacion/nuevo', {
            state: {
                fromQuotation: true,
                defaultType: 'FACTURA',
                quotationData: {
                    cliente: cotizacion.cliente,
                    productos: cotizacion.detalles,
                    observaciones: cotizacion.observaciones,
                }
            }
        });
    };

    const handleConvertirABoleta = (data: any) => {
        const cotizacion = invoices.find((inv: IInvoices) => inv.id === data.id);
        if (!cotizacion) return;

        navigate('/administrador/facturacion/nuevo', {
            state: {
                fromQuotation: true,
                defaultType: 'BOLETA',
                quotationData: {
                    cliente: cotizacion.cliente,
                    productos: cotizacion.detalles,
                    observaciones: cotizacion.observaciones,
                }
            }
        });
    };

    const handleConvertirANotaVenta = (data: any) => {
        const cotizacion = invoices.find((inv: IInvoices) => inv.id === data.id);
        if (!cotizacion) return;

        navigate('/administrador/facturacion/nuevo', {
            state: {
                fromQuotation: true,
                defaultType: 'NV',
                quotationData: {
                    cliente: cotizacion.cliente,
                    productos: cotizacion.detalles,
                    observaciones: cotizacion.observaciones,
                }
            }
        });
    };

    const handleEditCotizacion = (data: any) => {
        const cotizacion = invoices.find((inv: IInvoices) => inv.id === data.id);
        if (!cotizacion) return;

        const c = cotizacion as any;
        navigate('/administrador/cotizaciones/nuevo', {
            state: {
                fromQuotation: true,
                isEdit: true,
                quotationId: cotizacion.id,
                quotationData: {
                    cliente: cotizacion.cliente,
                    productos: cotizacion.detalles,
                    observaciones: cotizacion.observaciones,
                    cotizIncluirImagenes: c.cotizIncluirImagenes,
                    cotizDescuento: c.cotizDescuento,
                    cotizVigencia: c.cotizVigencia,
                    cotizFirmante: c.cotizFirmante,
                    cotizTerminos: c.cotizTerminos,
                    cotizTipoPago: c.cotizTipoPago,
                    cotizAdelanto: c.cotizAdelanto,
                    cotizMoneda: c.cotizMoneda,
                }
            }
        });
    };

    const handleRequestDeleteCotizacion = (data: any) => {
        setDeleteCandidate(data);
        setIsOpenModalDelete(true);
    };

    const handleConfirmDeleteCotizacion = async () => {
        if (!deleteCandidate?.id) return;
        setIsDeleting(true);
        try {
            const res = await del<any>(`comprobante/cotizaciones/${deleteCandidate.id}`);
            if (!res.success) throw new Error(res.error || 'No se pudo eliminar la cotización');
            useAlertStore.getState().alert('Cotización eliminada correctamente', 'success');
            setIsOpenModalDelete(false);
            setDeleteCandidate(null);
            reloadCotizaciones();
        } catch (error: any) {
            useAlertStore.getState().alert(error?.message || 'No se pudo eliminar la cotización', 'error');
        } finally {
            setIsDeleting(false);
        }
    };

    const handleConfirmCleanCotizaciones = async () => {
        setIsDeleting(true);
        try {
            const res: any = await post('comprobante/cotizaciones/limpiar-pruebas', {
                confirmar: true,
                fechaInicio,
                fechaFin,
                search: debounce,
            });
            if (!res.success) throw new Error(res.error || 'No se pudieron limpiar las cotizaciones');
            const eliminados = res?.data?.eliminados ?? res?.eliminados ?? 0;
            useAlertStore.getState().alert(`${eliminados} cotización(es) eliminada(s)`, 'success');
            setIsOpenModalClean(false);
            reloadCotizaciones();
        } catch (error: any) {
            useAlertStore.getState().alert(error?.message || 'No se pudieron limpiar las cotizaciones', 'error');
        } finally {
            setIsDeleting(false);
        }
    };

    const handlePartialPayment = async (data: any) => {
        setFormValues(data);
        const comprobanteData = invoices.find((inv: IInvoices) => inv.id === data.id);
        if (!comprobanteData) return;
        const totalComprobante = comprobanteData.mtoImpVenta || 0;
        const saldoPendiente = (comprobanteData as any).saldo ?? totalComprobante;

        await paymentFlow.initiatePayment('PAGO_PARCIAL', {
            id: comprobanteData.id,
            serie: comprobanteData.serie,
            correlativo: comprobanteData.correlativo,
            cliente: { nombre: comprobanteData.cliente?.nombre || 'Cliente' },
            mtoImpVenta: totalComprobante,
            saldo: saldoPendiente,
        }, saldoPendiente);
        setIsOpenModalPagoParcial(true);
    };

    const handleConfirmPago = async (monto: number, medioPago: string, observacion?: string, referencia?: string, cuentaBancariaId?: number) => {
        const payment = {
            tipo: 'PAGO_PARCIAL' as PaymentType,
            monto,
            medioPago: medioPago as any,
            observacion,
            referencia,
            cuentaBancariaId,
        };

        const pagoData: any = {
            id: formValues.id,
            serie: formValues.serie,
            correlativo: formValues.correlativo,
            client: formValues.client,
            cuentaBancariaId,
        };

        const result = await paymentFlow.processPayment(
            payment,
            {
                id: formValues.id,
                serie: formValues.serie,
                correlativo: formValues.correlativo,
                cliente: { nombre: formValues.client },
                mtoImpVenta: parseFloat((formValues?.total || '').toString().replace('S/ ', '') || '0'),
                saldo: parseFloat((formValues?.saldo || '').toString().replace('S/ ', '') || '0') || undefined,
            },
            async (_comprobante: any, _medioPago: string, _monto: number, _observacion?: string, _referencia?: string, _cuentaBancariaId?: number) => {
                return await completePay(pagoData, medioPago, monto);
            }
        );

        if (result.success) {
            setIsOpenModalPagoParcial(false);
            setTimeout(() => {
                getAllInvoices({
                    tipoComprobante: "COTIZACION",
                    page: currentPage,
                    limit: itemsPerPage,
                    search: debounce,
                    fechaInicio,
                    fechaFin,
                    estado: ""
                });
            }, 300);
        }
    };

    const handleCloseReceipt = () => {
        paymentFlow.closeReceipt();
    };

    const handleDate = (date: string, name: string) => {
        if (!moment(date, 'DD/MM/YYYY', true).isValid()) {
            return;
        }
        if (name === "fechaInicio") {
            setFechaInicio(moment(date, 'DD/MM/YYYY').format('YYYY-MM-DD'));
        } else if (name === "fechaFin") {
            setFechaFin(moment(date, 'DD/MM/YYYY').format('YYYY-MM-DD'));
        }
    };



    const confirmCancelInvoice = () => {
        cancelInvoice(formValues?.id);
        setIsOpenModalConfirm(false);
    };

    const confirmCompleteInvoice = () => {
        setIsOpenModalConfirmPayment(false);
        completePay(formValues, paymentMethod);
    };

    const handleChangeSearch = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | any>) => {
        setSearchClient(e.target.value);
    };

    const handleSelectPrint = (value: any) => {
        setPrintSize(value);
    };

    const printOptions: IPrintFormatOption[] = [
        { id: 'TICKET', value: 'TICKET' },
        { id: 'A4', value: 'A4' },
        { id: 'A5', value: 'A5' },
    ];

    return {
        // Data & Store
        auth,
        invoices,
        invoice,
        totalInvoices,

        // Pagination
        currentPage,
        setcurrentPage,
        itemsPerPage,
        setitemsPerPage,
        pages,
        indexOfFirstItem,
        indexOfLastItem,

        // Filters
        fechaInicio,
        fechaFin,
        printSize,
        printOptions,

        // Action Menu state
        openAccionesId,
        setOpenAccionesId,
        anchorEl,
        setAnchorEl,

        // Modals state
        isOpenModalConfirm,
        setIsOpenModalConfirm,
        isOpenModalConfirmPayment,
        setIsOpenModalConfirmPayment,
        isOpenModalWhatsApp,
        setIsOpenModalWhatsApp,
        modalDefaultTab,
        isOpenModalPagoParcial,
        setIsOpenModalPagoParcial,
        isOpenModalPdf,
        setIsOpenModalPdf,
        isOpenModalDelete,
        setIsOpenModalDelete,
        isOpenModalClean,
        setIsOpenModalClean,

        // Print and Files state
        pdfUrl,
        setPdfUrl,
        pdfName,
        setPdfName,
        componentRef,
        qrCodeDataUrl,
        comprobante,
        comprobanteWhatsApp,
        deleteCandidate,
        isDeleting,

        // Payment state
        paymentMethod,
        setPaymentMethod,
        paymentFlow,
        formValues,

        // Handlers
        handleDate,
        handleSelectPrint,
        handleChangeSearch,

        handleGetReceipt,
        handleVerPdf,
        handleConvertirAFactura,
        handleConvertirABoleta,
        handleConvertirANotaVenta,
        handleEditCotizacion,
        handleRequestDeleteCotizacion,
        handleConfirmDeleteCotizacion,
        handleConfirmCleanCotizaciones,
        handleEnviarWhatsApp,
        handlePartialPayment,
        handleConfirmPago,
        handleCloseReceipt,
        confirmCancelInvoice,
        confirmCompleteInvoice,
    };
}
