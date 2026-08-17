import { ChangeEvent, useCallback, useEffect, useRef, useState } from "react";
import Input from "@/components/Input";
import DataTable from "@/components/Datatable";
import { Icon } from "@iconify/react/dist/iconify.js";
import Pagination from "@/components/Pagination";
import useAlertStore from "@/zustand/alert";
import TableSkeleton from "@/components/Skeletons/table";
import { IInvoicesState, useInvoiceStore } from "@/zustand/invoices";
import { IInvoices } from "@/interfaces/invoices";
import moment from "moment";
import PrintPDF from "./print";
import { pdf } from "@react-pdf/renderer";
import { numberToWords } from "@/utils/numberToLetters";
import { useAuthStore } from "@/zustand/auth";
import QRCode from 'qrcode'
import { Calendar } from "@/components/Date";
import Select from "@/components/Select";
import ModalConfirm from "@/components/ModalConfirm";
import { useDebounce } from "@/hooks/useDebounce";
import ModalPagoParcial from "@/components/ModalPagoParcial";
import ComprobantePrintPage from "./comprobanteImprimir";
import { useReactToPrint } from "react-to-print";
import { usePaymentFlow, PaymentType } from "@/hooks/usePaymentFlow";
import ModalPaymentUnified from "@/components/ModalPaymentUnified";
import PaymentReceipt from "@/components/PaymentReceipt";
import ModalEnviarWhatsApp from "./ModalEnviarWhatsApp";
import Modal from "@/components/Modal";
import { useSedesStore } from "@/zustand/sedes";
import { useNavigate } from "react-router-dom";
import { useUsersStore } from "@/zustand/users";
import TableActionMenu from "@/components/TableActionMenu";
import { buildComprobantePrintPageStyle } from "@/utils/printStyles";
import ModalDetalleComprobante from "./ModalDetalleComprobante";
import { mapDetalleToInvoiceProduct } from "@/features/admin/facturacion/utils/comprobanteProductMapper";
import ModalImportarNotaVentaLote from "./ModalImportarNotaVentaLote";
import ModalConfigCotizacion from "@/features/admin/cotizaciones/ModalConfigCotizacion";
import apiClient from "@/utils/apiClient";

const ACCENT = 'var(--accent, #7551FF)';

// Pills de estado (CRM light) — punto de color + texto, fondos pastel.
const estadoPill = (estado?: string) => {
    const e = String(estado ?? '').toUpperCase();
    if (['COMPLETADO', 'PAGADO', 'ACEPTADO', 'APROBADO'].includes(e))
        return { label: 'Completado', dot: 'bg-emerald-500', text: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20' };
    if (['PENDIENTE_PAGO', 'PENDIENTE', 'ENVIANDO', 'EN_PROCESO', 'PROCESANDO'].includes(e))
        return { label: e === 'PENDIENTE_PAGO' ? 'Pend. pago' : 'En proceso', dot: 'bg-amber-500', text: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/20' };
    if (['ANULADO', 'BAJA'].includes(e))
        return { label: 'Anulado', dot: 'bg-slate-400', text: 'text-slate-500 dark:text-slate-400', bg: 'bg-slate-100 dark:bg-slate-800' };
    if (['RECHAZADO', 'FALLIDO_ENVIO', 'ERROR', 'OBSERVADO'].includes(e))
        return { label: 'Rechazado', dot: 'bg-rose-500', text: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-50 dark:bg-rose-900/20' };
    return { label: e ? e.charAt(0) + e.slice(1).toLowerCase() : 'Emitido', dot: 'bg-violet-500', text: 'text-violet-600 dark:text-violet-400', bg: 'bg-violet-50 dark:bg-violet-900/20' };
};

const hasDespachoCompleto = (item: IInvoices) => {
    const despacho = item.envioDespacho;
    if (!despacho?.id) return false;
    const celular = String(despacho.celularDest ?? '').replace(/\D/g, '');
    return Boolean(
        despacho.transportista &&
        despacho.tipoEnvio &&
        (despacho.agenciaDestino || despacho.direccionDestino) &&
        celular.length >= 9 &&
        Number(despacho.nroPaquetes ?? 1) >= 1
    );
};

const ComprobantesInformales = () => {
    const navigate = useNavigate();
    const { auth, sedeActiva } = useAuthStore();
    const { sedes, listarSedes } = useSedesStore();
    const { usuarios, getAllUsers } = useUsersStore();
    const { getAllInvoices, totalInvoices, invoices, getInvoice, invoice, resetInvoice, cancelInvoice, discardInvoice, completePay }: IInvoicesState = useInvoiceStore();
    const { success } = useAlertStore();
    const paymentFlow = usePaymentFlow();

    const [currentPage, setcurrentPage] = useState(1);
    const [itemsPerPage, setitemsPerPage] = useState(50);
    const [searchClient, setSearchClient] = useState<string>("");
    const [formValues, setFormValues] = useState<any>({});
    const [isOpenModal, setIsOpenModal] = useState(false);
    const [isOpenModalConfirm, setIsOpenModalConfirm] = useState(false);
    const [isOpenModalDelete, setIsOpenModalDelete] = useState(false);
    const [deletingInvoice, setDeletingInvoice] = useState(false);
    const [isOpenModalPagoParcial, setIsOpenModalPagoParcial] = useState(false);
    const [fechaInicio, setFechaInicio] = useState<string>(moment().startOf('month').format("YYYY-MM-DD"));
    const [fechaFin, setFechaFin] = useState<string>(moment().endOf('month').format("YYYY-MM-DD"));
    const [stateInvoice, setStateInvoice] = useState<string>("TODOS");
    const [selectedSedeId, setSelectedSedeId] = useState<number | null>(null);
    const [selectedUsuarioId, setSelectedUsuarioId] = useState<number | null>(null);
    const [isOpenModalImportarNV, setIsOpenModalImportarNV] = useState(false);
    const [isOpenConfigFormato, setIsOpenConfigFormato] = useState(false);
    const [isOpenModalWhatsApp, setIsOpenModalWhatsApp] = useState(false);
    const [comprobanteWhatsApp, setComprobanteWhatsApp] = useState<any>(null);
    const [modalDefaultTab, setModalDefaultTab] = useState<'whatsapp' | 'email'>('whatsapp');
    const [comprobante, setComprobante] = useState<string>("");
    const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
    const [selectedMenuRow, setSelectedMenuRow] = useState<any>(null);
    const [isOpenModalPdf, setIsOpenModalPdf] = useState(false);
    const [pdfUrl, setPdfUrl] = useState<string>("");
    const [pdfName, setPdfName] = useState<string>("comprobante.pdf");
    const [detalleComprobanteId, setDetalleComprobanteId] = useState<number | null>(null);
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const pages = [];
    for (let i = 1; i <= Math.ceil(totalInvoices / itemsPerPage); i++) {
        pages.push(i);
    }

    const debounce = useDebounce(searchClient, 1000);

    const canFilterBySede = (auth?.rol === 'ADMIN_SISTEMA' || auth?.rol === 'ADMIN_EMPRESA') && Boolean(sedeActiva?.esPrincipal);
    const effectiveSedeId = canFilterBySede ? selectedSedeId : (sedeActiva?.id ?? null);
    const canFilterByUsuario = auth?.rol === 'ADMIN_EMPRESA' || auth?.rol === 'ADMIN_SISTEMA';


    useEffect(() => {
        if (success === true) {
            setIsOpenModal(false);
            // setIsEdit(false);
        }
    }, [success]);

    useEffect(() => {
        if (canFilterBySede) {
            listarSedes();
        }
    }, [canFilterBySede, listarSedes]);

    useEffect(() => {
        if (canFilterByUsuario) {
            getAllUsers({ page: 1, limit: 200 });
        }
    }, [canFilterByUsuario, getAllUsers]);

    useEffect(() => {
        if (auth?.rol === 'ADMIN_SISTEMA' && sedeActiva?.esPrincipal && sedeActiva?.id) {
            setSelectedSedeId(sedeActiva.id);
        }
    }, [auth?.rol, sedeActiva?.id, sedeActiva?.esPrincipal]);

    useEffect(() => {
        if (!canFilterBySede) {
            setSelectedSedeId(null);
        }
    }, [canFilterBySede]);

    const productsTable = invoices?.map((item: IInvoices) => {
        const despachoCompleto = item.comprobante === 'NOTA DE VENTA' && hasDespachoCompleto(item);
        const despachoFecha = item.envioDespacho?.creadoEn
            ? moment(item.envioDespacho.creadoEn).format('YYYY-MM-DD')
            : moment(item.fechaEmision).format('YYYY-MM-DD');

        const estadoValue = ["BOLETA", "FACTURA", "NOTA DE CREDITO", "NOTA DE DEBITO"].includes(item.comprobante)
            ? item.estadoEnvioSunat
            : item.estadoPago;
        const saldoStr = `S/ ${item?.saldo?.toFixed(2) || (0).toFixed(2)}`;
        const estadoPillCfg = estadoPill(estadoValue);
        const rowBase: any = {
            id: item?.id,
            fechaEmisión: moment(item?.fechaEmision).format('DD/MM/YYYY HH:mm:ss'),
            sede: item?.sede?.nombre || '-',
            serie: item.serie,
            correlativo: item.correlativo,
            comprobante: item.comprobante,
            comprobanteBadge: (
                <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 whitespace-nowrap">{item.comprobante}</span>
            ),
            documentoAfiliado: item?.numDocAfectado || item.numeroOrdenTrabajo,
            document: item?.cliente?.nroDoc,
            client: item?.cliente?.nombre,
            clientBadge: (
                <div className="flex items-center gap-2.5 min-w-0">
                    <div className="h-8 w-8 rounded-full bg-gradient-to-br from-violet-400 to-indigo-500 text-white grid place-items-center text-xs font-bold shrink-0">
                        {(item?.cliente?.nombre || 'C').charAt(0).toUpperCase()}
                    </div>
                    <span className="font-semibold text-slate-700 dark:text-slate-200 text-sm truncate max-w-[160px]">{item?.cliente?.nombre || 'Cliente varios'}</span>
                </div>
            ),
            // Cobranza en campo: prioriza el vendedor de campo atribuido.
            vendedor: item?.vendedorCampoNombre || item?.usuario?.nombre || '-',
            s3PdfUrl: item?.s3PdfUrl,
            total: `S/ ${item.mtoImpVenta.toFixed(2)}`,
            saldo: saldoStr,
            saldoBadge: <span className="font-bold text-amber-600 dark:text-amber-500 text-sm whitespace-nowrap">{saldoStr}</span>,
            estado: estadoValue,
            estadoBadge: (
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${estadoPillCfg.bg} ${estadoPillCfg.text}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${estadoPillCfg.dot}`} /> {estadoPillCfg.label}
                </span>
            ),
            estadoEnvioSunat: item.estadoEnvioSunat,
            despachoCompleto,
            despachoFecha,
            _item: item,
        };

        const acciones = (
            <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setMenuAnchor(e.currentTarget); setSelectedMenuRow({ ...rowBase, _item: item, despachoCompleto, despachoFecha }); }}
                className="px-2 py-1 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center gap-1 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
                <Icon icon="mdi:dots-vertical" width={18} height={18} />
            </button>
        );
        return {
            ...rowBase,
            acciones,
        };
    });

    useEffect(() => {
        resetInvoice();
        return () => {
            resetInvoice();
        };
    }, [])

    const [shouldPrint, setShouldPrint] = useState(false);

    const handleGetReceipt = async (data: any) => {
        console.log(data);
        setComprobante(data.comprobante);
        setShouldPrint(true);
        await getInvoice(data.id);
    };

    const handleCloseMenu = () => { setMenuAnchor(null); setSelectedMenuRow(null); };

    const handleAbrirModal = (data: any, tab: 'whatsapp' | 'email') => {
        const comprobanteData = invoices.find((inv: IInvoices) => inv.id === data.id);
        if (comprobanteData) {
            setComprobanteWhatsApp({
                id: comprobanteData.id,
                serie: comprobanteData.serie,
                correlativo: comprobanteData.correlativo,
                comprobante: comprobanteData.comprobante,
                total: comprobanteData.mtoImpVenta,
                clienteNombre: comprobanteData.cliente?.nombre || 'Cliente',
                clienteCelular: (comprobanteData as any).cliente?.telefono || '',
                clienteEmail: (comprobanteData as any).cliente?.email || '',
                pdfUrl: comprobanteData.s3PdfUrl || undefined,
            });
            setModalDefaultTab(tab);
            setIsOpenModalWhatsApp(true);
        }
    };

    const handleAnular = (data: any) => {
        setFormValues(data);
        setIsOpenModalConfirm(true);
    }

    // Eliminar (hard-delete): borra el comprobante y libera su correlativo,
    // a diferencia de "Anular" que lo deja en estado ANULADO ocupando el número.
    const handleEliminar = (data: any) => {
        setFormValues(data);
        setIsOpenModalDelete(true);
    }
    const confirmDeleteInvoice = async () => {
        if (deletingInvoice) return;
        setDeletingInvoice(true);
        try {
            await discardInvoice(formValues?.id);
        } finally {
            setDeletingInvoice(false);
            setIsOpenModalDelete(false);
        }
    }

    const handleCompletePay = async (data: any) => {
        setFormValues(data);
        const saldoPendiente = parseFloat(data?.saldo?.replace('S/ ', '') || '0');
        const totalComprobante = parseFloat(data?.total?.replace('S/ ', '') || '0');

        // Usar el hook para iniciar el pago
        await paymentFlow.initiatePayment('PAGO_PARCIAL', {
            id: data.id,
            serie: data.serie,
            correlativo: data.correlativo,
            cliente: { nombre: data.client },
            mtoImpVenta: totalComprobante,
            saldo: saldoPendiente
        }, saldoPendiente);

        setIsOpenModalPagoParcial(true);
    }

    const handleConfirmPago = async (monto: number, medioPago: string, observacion?: string, referencia?: string, cuentaBancariaId?: number) => {
        const payment = {
            tipo: 'PAGO_PARCIAL' as PaymentType,
            monto,
            medioPago: medioPago as any,
            observacion,
            referencia,
            cuentaBancariaId,
        };

        const comprobante = {
            id: formValues.id,
            serie: formValues.serie,
            correlativo: formValues.correlativo,
            cliente: { nombre: formValues.client },
            mtoImpVenta: parseFloat(formValues?.total?.replace('S/ ', '') || '0'),
            saldo: parseFloat(formValues?.saldo?.replace('S/ ', '') || '0')
        };

        // Usar el hook para procesar el pago
        const result = await paymentFlow.processPayment(
            payment,
            comprobante,
            async (comprobante: any, medioPago: string, monto: number, observacion?: string, referencia?: string, cbId?: number) => {
                const pagoData = {
                    ...formValues,
                    observacion: observacion || '',
                    referencia: referencia || '',
                    cuentaBancariaId: cbId ?? cuentaBancariaId,
                };
                return await completePay(pagoData, medioPago, monto);
            }
        );

        if (result.success) {
            setIsOpenModalPagoParcial(false);
            // El hook ya maneja el showReceipt automáticamente
        }
    }

    const handleCloseReceipt = () => {
        paymentFlow.closeReceipt();

        // Recargar tabla
        setTimeout(() => {
            getAllInvoices({
                tipoComprobante: "INFORMAL",
                page: currentPage,
                limit: itemsPerPage,
                search: debounce,
                fechaInicio: fechaInicio,
                fechaFin: fechaFin,
                estadoPago: stateInvoice !== "TODOS" ? stateInvoice : "",
                ...(canFilterByUsuario && selectedUsuarioId ? { usuarioId: selectedUsuarioId } : {}),
                ...(effectiveSedeId ? { sedeId: effectiveSedeId } : {})
            });
        }, 300);
    }

    // Recarga la tabla con los filtros actuales. Reutilizable desde el efecto de
    // filtros y desde callbacks (p. ej. tras editar el vendedor de campo en el detalle).
    const recargarLista = useCallback(() => {
        const params: any = {
            tipoComprobante: "INFORMAL",
            page: currentPage,
            limit: itemsPerPage,
            search: debounce,
            fechaInicio: fechaInicio,
            fechaFin: fechaFin,
            ...(canFilterByUsuario && selectedUsuarioId ? { usuarioId: selectedUsuarioId } : {}),
            ...(effectiveSedeId ? { sedeId: effectiveSedeId } : {}),
        };
        if (stateInvoice !== "TODOS") {
            params.estadoPago = stateInvoice;
        }
        getAllInvoices(params);
    }, [debounce, currentPage, itemsPerPage, fechaInicio, fechaFin, stateInvoice, effectiveSedeId, selectedUsuarioId, canFilterByUsuario, getAllInvoices]);

    useEffect(() => {
        recargarLista();
    }, [recargarLista]);

    // Exporta el listado filtrado (rango de fechas/estado/sede/vendedor) en PDF o Excel
    const [exportando, setExportando] = useState<'pdf' | 'excel' | null>(null);
    const handleExportarResumen = async (formato: 'pdf' | 'excel') => {
        if (exportando) return;
        setExportando(formato);
        try {
            const params = new URLSearchParams({
                tipoComprobante: 'INFORMAL',
                fechaInicio,
                fechaFin,
                formato,
            });
            if (stateInvoice !== 'TODOS') params.set('estadoPago', stateInvoice);
            if (effectiveSedeId) params.set('sedeId', String(effectiveSedeId));
            if (canFilterByUsuario && selectedUsuarioId) params.set('usuarioId', String(selectedUsuarioId));

            const resp = await apiClient.get(`/comprobante/exportar-resumen?${params.toString()}`, {
                responseType: 'blob',
            });
            const url = window.URL.createObjectURL(new Blob([resp.data]));
            const link = document.createElement('a');
            link.href = url;
            link.download = `notas_de_venta_${fechaInicio}_a_${fechaFin}.${formato === 'pdf' ? 'pdf' : 'xlsx'}`;
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (e: any) {
            useAlertStore.getState().alert('No se pudo exportar: verifica que existan ventas en el rango seleccionado', 'error');
        } finally {
            setExportando(null);
        }
    };

    const ruc = "204812192919";
    const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');

    useEffect(() => {
        const generateQR = async () => {
            try {
                const dataUrl = await QRCode.toDataURL(ruc, {
                    width: 90,
                    margin: 1,
                    color: {
                        dark: '#000000', // Color oscuro del QR
                        light: '#ffffff', // Color claro (fondo)
                    },
                    errorCorrectionLevel: 'H', // Alta corrección de errores
                });
                setQrCodeDataUrl(dataUrl);
            } catch (err) {
                console.error("Error al generar el QR:", err);
            }
        };
        generateQR();
    }, []);

    const [printSize, setPrintSize] = useState('TICKET');

    const print = [
        { id: "TICKET", value: "TICKET" },
        { id: "A5", value: "A5" },
        { id: "A4", value: "A4" }
    ]

    const handleSelectPrint = (value: any) => {
        setPrintSize(value)
    }

    const [dimensions, setDimensions] = useState(() => {
        switch (printSize) {
            case 'TICKET': return { width: 80, height: 330 };
            case 'A5': return { width: 148, height: 210 }; // A5 standard size
            case 'A4': return { width: 210, height: 297 }; // A4 standard size
            default: return { width: 210, height: 297 };
        }
    });

    useEffect(() => {
        console.log("hello")
        setDimensions(() => {
            switch (printSize) {
                case 'TICKET': return { width: 80, height: 330 };
                case 'A5': return { width: 148, height: 210 };
                case 'A4': return { width: 210, height: 297 };
                default: return { width: 210, height: 297 };
            }
        });

        console.log('Dimensions updated:', dimensions, 'for printSize:', printSize);
    }, [printSize]);

    const componentRef = useRef(null);
    const printFn = useReactToPrint({
        // @ts-ignore
        contentRef: componentRef,
        pageStyle: buildComprobantePrintPageStyle(dimensions),
        // Nombre sugerido al "Guardar como PDF": serie-correlativo del comprobante
        documentTitle: invoice?.serie ? `${invoice.serie}-${invoice.correlativo}` : undefined,
    });

    useEffect(() => {
        if (!shouldPrint || !invoice) return;

        const doPrint = () => {
            if (componentRef?.current) printFn();
            setShouldPrint(false);
            resetInvoice();
        };

        // Esperar a que la imagen del logo esté cargada antes de imprimir
        const logoImg = (componentRef.current as HTMLElement | null)?.querySelector('img[alt="logo"]') as HTMLImageElement | null;
        if (logoImg && !logoImg.complete) {
            const fallback = setTimeout(doPrint, 2500);
            logoImg.onload = () => { clearTimeout(fallback); doPrint(); };
            logoImg.onerror = () => { clearTimeout(fallback); doPrint(); };
            return () => { clearTimeout(fallback); logoImg.onload = null; logoImg.onerror = null; };
        }

        const timer = setTimeout(doPrint, 500);
        return () => clearTimeout(timer);
    }, [invoice, shouldPrint, resetInvoice]);

    const handleDate = (date: string, name: string) => {
        if (!moment(date, 'DD/MM/YYYY', true).isValid()) {
            console.error(`Fecha inválida: ${date} para ${name}`);
            return;
        }
        if (name === "fechaInicio") {
            setFechaInicio(moment(date, 'DD/MM/YYYY').format('YYYY-MM-DD'));
        } else if (name === "fechaFin") {
            setFechaFin(moment(date, 'DD/MM/YYYY').format('YYYY-MM-DD'));
        }
    };

    const handleSelectState = (id: string) => {
        // `id` es el valor real del backend (TODOS, COMPLETADO, PAGO_PARCIAL, ...).
        setStateInvoice(id || "TODOS")
    }

    const handleSelectSede = (idValue: any) => {
        if (idValue === 0 || idValue === '0' || idValue === '' || idValue == null) {
            setSelectedSedeId(null);
            return;
        }
        setSelectedSedeId(Number(idValue));
    }

    const handleSelectUsuario = (event: ChangeEvent<HTMLSelectElement>) => {
        const value = event.target.value;
        setcurrentPage(1);
        setSelectedUsuarioId(value ? Number(value) : null);
    }

    // El `id` es el valor real que espera el backend (estadoPago); el `value` es la
    // etiqueta amigable que ve el usuario (nada de códigos crudos tipo PENDIENTE_PAGO).
    const estadosInvoice = [
        { id: "TODOS", value: "Todos" },
        { id: "COMPLETADO", value: "Pagado" },
        { id: "PAGO_PARCIAL", value: "Pago parcial" },
        { id: "PENDIENTE_PAGO", value: "Pendiente de pago" },
        { id: "ANULADO", value: "Anulado" },
    ]
    // Etiqueta amigable del estado actualmente seleccionado (para mostrar en el Select).
    const estadoLabelActual = estadosInvoice.find((o) => o.id === stateInvoice)?.value ?? "Todos"
    const sedesOptions = [
        { id: 0, value: 'Todas las sedes' },
        ...sedes.map((s: any) => ({ id: s.id, value: s.nombre }))
    ]
    const vendedoresOptions = usuarios.filter((u) => u.estado === 'ACTIVO');

    const confirmCancelInvoice = () => {
        cancelInvoice(formValues?.id)
        setIsOpenModalConfirm(false)
    }

    const handleChangeSearch = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | any>) => {
        setSearchClient(e.target.value)
    }

    return (
        <div className="min-h-screen -m-5 p-5 bg-[#F7F8FB] dark:bg-[#0B1120] font-jakarta">
            <ComprobantePrintPage
                company={auth}
                componentRef={componentRef}
                formValues={{
                    ...invoice,
                    fechaVencimientoCredito: invoice?.fechaVencimientoCredito || invoice?.fechaVencimiento || (invoice?.cuotas?.length > 0 ? invoice.cuotas[0].fechaVencimiento : null)
                }}
                size={printSize}
                serie={invoice?.serie}
                correlative={invoice?.correlativo}
                productsInvoice={invoice?.detalles}
                total={Number(invoice?.mtoImpVenta).toFixed(2)}
                mode="off"

                qrCodeDataUrl={qrCodeDataUrl}
                discount={invoice?.discount}
                receipt={comprobante || invoice?.comprobante}
                selectedClient={invoice?.cliente}
                totalInWords={numberToWords(parseFloat(invoice?.mtoImpVenta)) + " SOLES"}
                observation={invoice?.observaciones}
            />

            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm text-slate-400 mb-5">
                <Icon icon="solar:home-smile-linear" className="text-base" />
                <span>Panel</span>
                <Icon icon="solar:alt-arrow-right-linear" className="text-xs" />
                <span>Facturación</span>
                <Icon icon="solar:alt-arrow-right-linear" className="text-xs" />
                <span className="font-semibold" style={{ color: ACCENT }}>Notas de venta</span>
            </div>

            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-5">
                <div className="min-w-0">
                    <h1 className="text-[22px] font-extrabold text-slate-800 dark:text-white tracking-tight">Notas de venta</h1>
                    <p className="text-sm text-slate-400 mt-0.5">Historial de notas de pedido</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 shrink-0">
                    <button
                        type="button"
                        onClick={() => handleExportarResumen('pdf')}
                        disabled={exportando !== null}
                        className="h-11 px-4 rounded-2xl border border-rose-200 dark:border-rose-900/50 bg-white dark:bg-slate-800 text-sm font-bold text-rose-500 dark:text-rose-400 flex items-center justify-center gap-1.5 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-all disabled:opacity-50"
                    >
                        <Icon icon={exportando === 'pdf' ? 'svg-spinners:180-ring' : 'solar:file-text-bold-duotone'} className="text-lg" />
                        Exportar PDF
                    </button>
                    <button
                        type="button"
                        onClick={() => handleExportarResumen('excel')}
                        disabled={exportando !== null}
                        className="h-11 px-4 rounded-2xl border border-emerald-200 dark:border-emerald-900/50 bg-white dark:bg-slate-800 text-sm font-bold text-emerald-600 dark:text-emerald-400 flex items-center justify-center gap-1.5 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-all disabled:opacity-50"
                    >
                        <Icon icon={exportando === 'excel' ? 'svg-spinners:180-ring' : 'solar:document-add-bold-duotone'} className="text-lg" />
                        Exportar Excel
                    </button>
                    <button
                        type="button"
                        onClick={() => setIsOpenModalImportarNV(true)}
                        className="h-11 px-4 rounded-2xl border border-violet-200 dark:border-violet-900/50 bg-white dark:bg-slate-800 text-sm font-bold flex items-center justify-center gap-1.5 hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-all"
                        style={{ color: ACCENT }}
                    >
                        <Icon icon="solar:import-bold-duotone" className="text-lg" />
                        Importar histórico (Excel)
                    </button>
                    <button
                        type="button"
                        onClick={() => setIsOpenConfigFormato(true)}
                        className="h-11 px-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-bold text-slate-600 dark:text-slate-300 flex items-center justify-center gap-1.5 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all"
                    >
                        <Icon icon="solar:tuning-square-bold-duotone" className="text-lg" />
                        Configurar formato
                    </button>
                    <button
                        type="button"
                        onClick={() => navigate('/administrador/facturacion/nuevo', { state: { defaultType: 'NV', defaultClient: 'CLIENTES_VARIOS' } })}
                        className="h-11 px-4 rounded-2xl text-white text-sm font-bold flex items-center justify-center gap-1.5 shadow-lg shadow-violet-500/30 hover:brightness-105 transition-all"
                        style={{ background: ACCENT }}
                    >
                        <Icon icon="solar:add-circle-bold" className="text-lg" />
                        Nueva venta
                    </button>
                </div>
            </div>

            {/* Card contenedora */}
            <div className="bg-white dark:bg-[#111827] rounded-3xl shadow-[0_2px_20px_rgba(15,23,42,0.05)] overflow-hidden">
                {/* Filtros */}
                <div className="border-b border-slate-100 dark:border-slate-800 p-4 sm:p-5">
                    <div className="space-y-3">
                        {/* Fila 1: título + búsqueda inline + formato impresión */}
                        <div className="flex flex-wrap items-center gap-2.5">
                            <h3 className="shrink-0 pr-1 text-base font-extrabold text-slate-800 dark:text-white">Notas de venta</h3>
                            <div className="relative min-w-[200px] flex-1 sm:max-w-md">
                                <Icon icon="solar:magnifer-linear" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400 dark:text-gray-400" />
                                <input onChange={handleChangeSearch} placeholder="Buscar serie, cliente, correlativo" className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-700 outline-none transition-colors placeholder:text-slate-400 focus:border-[var(--accent)] dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder:text-gray-500" />
                            </div>
                        </div>
                        {/* Fila 2: filtros (fechas, estado, sede, vendedor, formato) */}
                        <div className="flex flex-wrap items-end gap-2.5">
                            <div className="w-full sm:w-40">
                                <Calendar text="Desde" name="fechaInicio" value={moment(fechaInicio).format('DD/MM/YYYY')} onChange={handleDate} className="admin-date-filter" portal />
                            </div>
                            <div className="w-full sm:w-40">
                                <Calendar text="Hasta" name="fechaFin" value={moment(fechaFin).format('DD/MM/YYYY')} onChange={handleDate} className="admin-date-filter" portal />
                            </div>
                            <div className="w-full sm:w-56">
                                <Select onChange={handleSelectState} withLabel={false} label="" name="" options={estadosInvoice} defaultValue={estadoLabelActual} value={estadoLabelActual} error="" />
                            </div>
                            {canFilterBySede && (
                                <div className="w-full sm:w-44">
                                    <Select
                                        onChange={handleSelectSede}
                                        withLabel={false}
                                        label=""
                                        name="sede"
                                        options={sedesOptions}
                                        defaultValue={selectedSedeId
                                            ? (sedes.find((s: any) => s.id === selectedSedeId)?.nombre || '')
                                            : 'Todas las sedes'}
                                        value={selectedSedeId
                                            ? (sedes.find((s: any) => s.id === selectedSedeId)?.nombre || '')
                                            : 'Todas las sedes'}
                                        error=""
                                    />
                                </div>
                            )}
                            {canFilterByUsuario && (
                                <div className="w-full sm:w-44">
                                    <Select
                                        onChange={(id: any) => { setcurrentPage(1); setSelectedUsuarioId(id ? Number(id) : null); }}
                                        withLabel={false}
                                        label=""
                                        name="vendedor"
                                        options={[{ id: 0, value: 'Todos los vendedores' }, ...vendedoresOptions.map((u: any) => ({ id: u.id, value: u.nombre }))]}
                                        defaultValue="Todos los vendedores"
                                        value={selectedUsuarioId ? (vendedoresOptions.find((u: any) => u.id === selectedUsuarioId)?.nombre || 'Todos los vendedores') : 'Todos los vendedores'}
                                        error=""
                                    />
                                </div>
                            )}
                            <div className="w-full sm:w-48">
                                <Select onChange={handleSelectPrint} withLabel={false} label="" name="" defaultValue={printSize} options={print} error="" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Contenido */}
                {productsTable?.length > 0 ? (
                    <>
                        {/* Mobile cards */}
                        <div className="space-y-3 p-4 md:hidden">
                            {productsTable.map((row: any) => {
                                const pill = estadoPill(row.estado);
                                return (
                                    <article key={row.id} className="rounded-3xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-[#111827] p-4 shadow-[0_2px_20px_rgba(15,23,42,0.05)]">
                                        <div className="mb-3 flex items-start justify-between gap-3">
                                            <div className="min-w-0">
                                                <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">{row.sede}</p>
                                                <div className="mt-1 flex items-center gap-1.5">
                                                    <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400">{row.comprobante}</span>
                                                    <span className="font-mono text-sm font-bold text-slate-800 dark:text-white">{row.serie}-{row.correlativo}</span>
                                                </div>
                                                <p className="text-xs font-medium text-slate-400 mt-0.5">{row.fechaEmisión}</p>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={(e) => { e.stopPropagation(); setMenuAnchor(e.currentTarget); setSelectedMenuRow(row); }}
                                                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 transition hover:bg-slate-50 dark:hover:bg-slate-700"
                                            >
                                                <Icon icon="mdi:dots-vertical" width={20} height={20} />
                                            </button>
                                        </div>

                                        <div className="mb-3 flex items-center gap-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 p-3">
                                            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-violet-400 to-indigo-500 text-white grid place-items-center text-xs font-bold shrink-0">
                                                {(row.client || 'C').charAt(0).toUpperCase()}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="truncate text-sm font-bold text-slate-800 dark:text-white">{row.client || 'Cliente no registrado'}</p>
                                                <p className="truncate text-xs text-slate-400">{row.document || '-'} · {row.vendedor || 'Sin vendedor'}</p>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-3 gap-2 rounded-2xl bg-slate-50 dark:bg-slate-800/50 p-3">
                                            <div>
                                                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Importe</p>
                                                <p className="text-sm font-extrabold text-slate-800 dark:text-white">{row.total}</p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Saldo</p>
                                                <p className="text-sm font-extrabold text-amber-600">{row.saldo}</p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Estado</p>
                                                <span className={`mt-0.5 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold ${pill.bg} ${pill.text}`}>
                                                    <span className={`w-1.5 h-1.5 rounded-full ${pill.dot}`} /> {pill.label}
                                                </span>
                                            </div>
                                        </div>
                                    </article>
                                );
                            })}
                        </div>

                        {/* Desktop table */}
                        <div className="hidden overflow-x-auto md:block">
                            <DataTable
                                bodyData={productsTable}
                                headerColumns={[
                                    'Fecha',
                                    'Serie',
                                    'Nro.',
                                    { label: 'Comprobante', key: 'comprobanteBadge' },
                                    { label: 'Cliente', key: 'clientBadge' },
                                    'Importe',
                                    { label: 'Saldo', key: 'saldoBadge' },
                                    'Num doc',
                                    'Vendedor',
                                    'Sede',
                                    'Doc. Afiliado',
                                    { label: 'Estado', key: 'estadoBadge' },
                                    'Acciones',
                                ]}
                            />
                        </div>

                        <div className="border-t border-slate-100 dark:border-slate-800 p-4">
                            <Pagination
                                data={productsTable}
                                optionSelect
                                currentPage={currentPage}
                                indexOfFirstItem={indexOfFirstItem}
                                indexOfLastItem={indexOfLastItem}
                                setcurrentPage={setcurrentPage}
                                setitemsPerPage={setitemsPerPage}
                                pages={pages}
                                total={totalInvoices}
                            />
                        </div>
                    </>
                ) : (
                    <div className="py-16 text-center">
                        <Icon icon="solar:document-text-linear" className="text-5xl text-slate-200 dark:text-slate-700 mx-auto mb-3" />
                        <p className="text-slate-500 dark:text-slate-400 text-sm font-semibold">No se encontraron comprobantes</p>
                        <p className="text-sm text-slate-400 mt-1">Ajusta los filtros o selecciona un rango de fechas diferente</p>
                    </div>
                )}
            </div>

            {isOpenModalConfirm && <ModalConfirm confirmSubmit={confirmCancelInvoice} information="¿Estás seguro que deseas anular este comprobante?" isOpenModal setIsOpenModal={() => setIsOpenModalConfirm(false)} title="Anular comprobante" />}
            {isOpenModalDelete && <ModalConfirm confirmSubmit={confirmDeleteInvoice} confirmLoading={deletingInvoice} confirmText="Eliminar" information={`¿Eliminar la nota de venta ${formValues?.serie ?? ''}-${formValues?.correlativo ?? ''}? Se borrará de forma permanente y su correlativo quedará disponible para volver a usarse. Esta acción no se puede deshacer.`} isOpenModal setIsOpenModal={() => setIsOpenModalDelete(false)} title="Eliminar nota de venta" />}

            {(isOpenModalPagoParcial && paymentFlow.payment) && (
                <ModalPaymentUnified
                    isOpen={isOpenModalPagoParcial}
                    isLoading={paymentFlow.isLoading}
                    paymentType={paymentFlow.payment.tipo}
                    saldoPendiente={parseFloat(formValues?.saldo?.replace('S/ ', '') || '0')}
                    totalComprobante={parseFloat(formValues?.total?.replace('S/ ', '') || '0')}
                    comprobanteInfo={{
                        id: formValues.id,
                        serie: formValues.serie,
                        correlativo: formValues.correlativo,
                        cliente: formValues.client,
                        total: parseFloat(formValues?.total?.replace('S/ ', '') || '0')
                    }}
                    onConfirm={handleConfirmPago}
                    onCancel={() => {
                        setIsOpenModalPagoParcial(false);
                        paymentFlow.reset();
                    }}
                    error={paymentFlow.error || ''}
                />
            )}
            {isOpenModalWhatsApp && comprobanteWhatsApp && (
                <ModalEnviarWhatsApp
                    isOpen={isOpenModalWhatsApp}
                    defaultTab={modalDefaultTab}
                    onClose={() => {
                        setIsOpenModalWhatsApp(false);
                        setComprobanteWhatsApp(null);
                    }}
                    comprobante={comprobanteWhatsApp}
                />
            )}
            <Modal
                isOpenModal={isOpenModalPdf}
                closeModal={() => setIsOpenModalPdf(false)}
                title="Vista previa del PDF"
                width="980px"
            >
                <div className="p-3 space-y-3">
                    <div className="flex justify-end">
                        <a
                            href={pdfUrl || '#'}
                            target="_blank"
                            rel="noreferrer"
                            className="px-3.5 py-1.5 text-xs font-bold rounded-xl text-white shadow-lg shadow-violet-500/30 hover:brightness-105 transition-all"
                            style={{ background: ACCENT }}
                        >
                            Descargar
                        </a>
                    </div>
                    <div className="h-[80vh]">
                        {pdfUrl ? (
                            <iframe src={pdfUrl} className="w-full h-full rounded-lg border dark:border-slate-700" />
                        ) : (
                            <div className="text-center text-gray-500 dark:text-gray-400 text-sm">No hay PDF disponible</div>
                        )}
                    </div>
                </div>
            </Modal>
            {paymentFlow.showReceipt && paymentFlow.receiptData && (
                <PaymentReceipt
                    comprobante={paymentFlow.receiptData.comprobante}
                    saldo={formValues?.saldo}
                    payment={paymentFlow.receiptData.payment}
                    numeroRecibo={paymentFlow.receiptData.numeroRecibo}
                    nuevoSaldo={paymentFlow.receiptData.nuevoSaldo}
                    detalles={paymentFlow.receiptData.detalles}
                    cliente={paymentFlow.receiptData.cliente}
                    pagosHistorial={paymentFlow.receiptData.pagosHistorial}
                    totalPagado={paymentFlow.receiptData.totalPagado}
                    company={auth}
                    onClose={handleCloseReceipt}
                />
            )}

            <ModalDetalleComprobante
                comprobanteId={detalleComprobanteId}
                isOpen={detalleComprobanteId !== null}
                onClose={() => setDetalleComprobanteId(null)}
                onUpdated={recargarLista}
            />

            {/* ── Dropdown de acciones (TableActionMenu) ── */}
            <TableActionMenu
                isOpen={Boolean(menuAnchor)}
                anchorEl={menuAnchor}
                onClose={handleCloseMenu}
                className="w-44"
            >
                {selectedMenuRow && (() => {
                    const row = selectedMenuRow;
                    const item: IInvoices = row._item;
                    return (
                        <>
                            <button type="button" onClick={() => { setDetalleComprobanteId(row.id); handleCloseMenu(); }}
                                className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20">
                                <Icon icon="solar:document-text-bold-duotone" width={16} height={16} />
                                <span>Ver detalle</span>
                            </button>
                            <button type="button" onClick={() => { handleGetReceipt(row); handleCloseMenu(); }}
                                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800">
                                <Icon icon="mingcute:print-line" width={16} height={16} />
                                <span>Imprimir</span>
                            </button>
                            <button type="button" disabled={!row.s3PdfUrl}
                                onClick={() => { if (row.s3PdfUrl) { setPdfUrl(row.s3PdfUrl); setPdfName(`${row.serie}-${String(row.correlativo || '').padStart(8, '0')}.pdf`); setIsOpenModalPdf(true); } handleCloseMenu(); }}
                                className={`w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-slate-50 dark:hover:bg-slate-800 ${row.s3PdfUrl ? 'text-slate-600 dark:text-slate-300' : 'text-slate-300 dark:text-slate-600 cursor-not-allowed'}`}>
                                <Icon icon="mdi:file-pdf-box" width={16} height={16} />
                                <span>Ver PDF</span>
                            </button>
                            <button type="button" onClick={() => { handleAbrirModal(row, 'email'); handleCloseMenu(); }}
                                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800">
                                <Icon icon="solar:letter-bold" width={16} height={16} />
                                <span>Enviar Email</span>
                            </button>
                            <button type="button" onClick={() => { handleAbrirModal(row, 'whatsapp'); handleCloseMenu(); }}
                                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20">
                                <Icon icon="mdi:whatsapp" width={16} height={16} />
                                <span>Enviar WhatsApp</span>
                            </button>
                            {row.despachoCompleto && (
                                <button type="button" onClick={() => { navigate(`/administrador/ventas?fecha=${row.despachoFecha}&comprobanteId=${row.id}`); handleCloseMenu(); }}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20">
                                    <Icon icon="solar:delivery-bold-duotone" width={16} height={16} />
                                    <span>Ver despacho</span>
                                </button>
                            )}
                            <>
                                <div className="border-t border-slate-100 dark:border-slate-800 my-1" />
                                {row.estadoEnvioSunat !== 'ANULADO' && (
                                    <button type="button" onClick={() => { handleAnular(row); handleCloseMenu(); }}
                                        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20">
                                        <Icon icon="mdi:cancel" width={16} height={16} />
                                        <span>Anular</span>
                                    </button>
                                )}
                                <button type="button" onClick={() => { handleEliminar(row); handleCloseMenu(); }}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20">
                                    <Icon icon="solar:trash-bin-trash-bold" width={16} height={16} />
                                    <span>Eliminar</span>
                                </button>
                            </>
                            {/* Editar cualquier comprobante informal editable (NV, TICKET, NP, OT, RH, CP).
                                Reutiliza el mismo flujo de edición in-place de la Nota de Venta. */}
                            {['NV', 'TICKET', 'NP', 'OT', 'RH', 'CP'].includes(String(item?.tipoDoc)) && row.estadoEnvioSunat !== 'ANULADO' && (
                                <>
                                    <div className="border-t border-slate-100 dark:border-slate-800 my-1" />
                                    <button type="button" onClick={() => {
                                        navigate('/administrador/facturacion/nuevo', { state: { defaultType: String(item.tipoDoc), fromNotaDeVenta: true, isEditNV: true, notaVentaId: item.id, notaDeVentaData: { cliente: item.cliente, clienteId: item.clienteId, observaciones: item.observaciones, vendedorCampoId: item.vendedorCampoId, vendedorCampoNombre: item.vendedorCampoNombre, medioPago: (item as any).medioPago, paymentDetails: (item as any).paymentDetails, saldo: (item as any).saldo, mtoImpVenta: (item as any).mtoImpVenta, estadoPago: (item as any).estadoPago, mtoDescuentoGlobal: (item as any).mtoDescuentoGlobal, formaPagoTipo: (item as any).formaPagoTipo, fechaVencimientoCredito: (item as any).fechaVencimientoCredito, cuotas: (item as any).cuotas, productos: (item.detalles || []).map(mapDetalleToInvoiceProduct) } } });
                                        handleCloseMenu();
                                    }} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20">
                                        <Icon icon="mdi:pencil-outline" width={16} height={16} />
                                        <span>Editar comprobante</span>
                                    </button>
                                </>
                            )}
                            {item?.comprobante === 'NOTA DE VENTA' && (
                                <>
                                    <div className="border-t border-slate-100 dark:border-slate-800 my-1" />
                                    <button type="button" onClick={() => {
                                        const esRuc = item.cliente?.nroDoc?.length === 11;
                                        navigate('/administrador/facturacion/nuevo', { state: { defaultType: 'FACTURA', fromNotaDeVenta: true, notaDeVentaData: { origenComprobanteId: item.id, cliente: esRuc ? item.cliente : null, clienteId: esRuc ? item.clienteId : null, observaciones: item.observaciones, productos: (item.detalles || []).map(mapDetalleToInvoiceProduct) } } });
                                        handleCloseMenu();
                                    }} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20">
                                        <Icon icon="mdi:file-document-edit-outline" width={16} height={16} />
                                        <span>Convertir a Factura</span>
                                    </button>
                                    <button type="button" onClick={() => {
                                        navigate('/administrador/facturacion/nuevo', { state: { defaultType: 'BOLETA', fromNotaDeVenta: true, notaDeVentaData: { origenComprobanteId: item.id, cliente: item.cliente, clienteId: item.clienteId, observaciones: item.observaciones, productos: (item.detalles || []).map(mapDetalleToInvoiceProduct) } } });
                                        handleCloseMenu();
                                    }} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20">
                                        <Icon icon="mdi:receipt-outline" width={16} height={16} />
                                        <span>Hacer Boleta</span>
                                    </button>
                                </>
                            )}
                        </>
                    );
                })()}
            </TableActionMenu>

            <ModalImportarNotaVentaLote
                isOpen={isOpenModalImportarNV}
                onClose={() => setIsOpenModalImportarNV(false)}
                onSuccess={() => {
                    const params: any = {
                        tipoComprobante: "INFORMAL",
                        page: currentPage,
                        limit: itemsPerPage,
                        search: debounce,
                        fechaInicio: fechaInicio,
                        fechaFin: fechaFin,
                        ...(canFilterByUsuario && selectedUsuarioId ? { usuarioId: selectedUsuarioId } : {}),
                        ...(effectiveSedeId ? { sedeId: effectiveSedeId } : {}),
                    };
                    if (stateInvoice !== "TODOS") {
                        params.estadoPago = stateInvoice;
                    }
                    getAllInvoices(params);
                }}
            />

            <ModalConfigCotizacion
                isOpen={isOpenConfigFormato}
                onClose={() => setIsOpenConfigFormato(false)}
                auth={auth}
                configKey="notaVentaFormatoConfig"
                previewReceipt="NOTA DE VENTA"
                title="Configurar formato de nota de venta"
                savedMsg="Formato de nota de venta guardado"
            />
        </div>
    );

};

export default ComprobantesInformales;
