
import { ChangeEvent, useCallback, useEffect, useRef, useState } from "react";
import Input from "@/components/Input";
import DataTable from "@/components/Datatable";
import { Icon } from "@iconify/react/dist/iconify.js";
import Pagination from "@/components/Pagination";
import useAlertStore from "@/zustand/alert";
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
import { get, post } from "@/utils/fetch";
import ModalConfirm from "@/components/ModalConfirm";
import { useNavigate } from "react-router-dom";
import { useDebounce } from "@/hooks/useDebounce";
import InputPro from "@/components/InputPro";
import ComprobantePrintPage from "./comprobanteImprimir";
import { useReactToPrint } from "react-to-print";
import ModalEnviarWhatsApp from "./ModalEnviarWhatsApp";
import { usePaymentFlow, PaymentType } from "@/hooks/usePaymentFlow";
import ModalPaymentUnified from "@/components/ModalPaymentUnified";
import PaymentReceipt from "@/components/PaymentReceipt";
import Modal from "@/components/Modal";
import TableActionMenu from "@/components/TableActionMenu";
import { useSedesStore } from "@/zustand/sedes";
import ModalDetalleComprobante from "./ModalDetalleComprobante";
import { useUsersStore } from "@/zustand/users";
import { buildComprobantePrintPageStyle } from "@/utils/printStyles";

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4001/api';

const normalizeSunatEstado = (invoice: any) => {
    const rawEstado = String(invoice?.estadoEnvioSunat ?? '').toUpperCase();
    const qpseCode = String(
        invoice?.qpseCode ??
        invoice?.sunatCode ??
        invoice?.sunatCdrResponse?.code ??
        ''
    );

    const rawResponse = typeof invoice?.sunatCdrResponse === 'string'
        ? (() => {
            try {
                return JSON.parse(invoice.sunatCdrResponse);
            } catch {
                return null;
            }
        })()
        : invoice?.sunatCdrResponse;

    const responseCode = String(rawResponse?.code ?? qpseCode ?? '');
    const responseLabel = String(rawResponse?.state_label ?? rawResponse?.estado ?? rawEstado).toUpperCase();

    let estadoEnvioSunat = rawEstado;

    if (rawEstado === 'ANULADO' || rawEstado === 'NO_APLICA' || rawEstado === 'PENDIENTE_CONCILIACION') {
        estadoEnvioSunat = rawEstado;
    } else if (responseCode === '0' || responseLabel === 'ACEPTADO' || responseLabel === 'OBSERVADO' || rawEstado === 'EMITIDO') {
        estadoEnvioSunat = 'ACEPTADO';
    } else if (responseCode === '98' || responseLabel === 'PENDIENTE' || responseLabel === 'EN_PROCESO' || responseLabel === 'INDETERMINADO' || rawEstado === 'FALLIDO_ENVIO') {
        estadoEnvioSunat = 'PENDIENTE';
    } else if (rawEstado === 'RECHAZADO') {
        estadoEnvioSunat = rawEstado;
    } else if (!estadoEnvioSunat) {
        estadoEnvioSunat = responseCode === '0' ? 'ACEPTADO' : responseCode === '98' ? 'PENDIENTE' : 'RECHAZADO';
    }

    return {
        ...invoice,
        estadoEnvioSunat,
        estadoSunatRaw: rawEstado,
    };
};

const Comprobantes = () => {
    const navigate = useNavigate();
    const { auth, sedeActiva } = useAuthStore();
    const { sedes, listarSedes } = useSedesStore();
    const { usuarios, getAllUsers } = useUsersStore();
    const { getInvoice, invoice, resetInvoice, cancelInvoice, completePay, discardInvoice, conciliarInvoice }: IInvoicesState = useInvoiceStore();
    const { success } = useAlertStore();
    const [invoicesList, setInvoicesList] = useState<IInvoices[]>([]);
    const [totalInvoicesList, setTotalInvoicesList] = useState(0);
    const [invoicesLoading, setInvoicesLoading] = useState(false);
    const requestIdRef = useRef(0);

    const [currentPage, setcurrentPage] = useState(1);
    const [itemsPerPage, setitemsPerPage] = useState(50);
    const [searchClient, setSearchClient] = useState<string>("");
    const [formValues, setFormValues] = useState<any>({});
    const [isOpenModal, setIsOpenModal] = useState(false);
    const [comprobante, setComprobante] = useState<string>("");
    const [isOpenModalConfirm, setIsOpenModalConfirm] = useState(false);
    const [isOpenModalConfirmPayment, setIsOpenModalConfirmPayment] = useState(false)
    const [fechaInicio, setFechaInicio] = useState<string>(moment().startOf('month').format("YYYY-MM-DD"));
    const [fechaFin, setFechaFin] = useState<string>(moment().endOf('month').format("YYYY-MM-DD"));
    const [stateInvoice, setStateInvoice] = useState<string>("TODOS");
    const [selectedSedeId, setSelectedSedeId] = useState<number | null>(null);
    const [selectedUsuarioId, setSelectedUsuarioId] = useState<number | null>(null);
    const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState<string>("Efectivo");
    const [isOpenModalWhatsApp, setIsOpenModalWhatsApp] = useState(false);
    const [comprobanteWhatsApp, setComprobanteWhatsApp] = useState<any>(null);
    const [modalDefaultTab, setModalDefaultTab] = useState<'whatsapp' | 'email'>('whatsapp');
    const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
    const [selectedMenuRow, setSelectedMenuRow] = useState<any>(null);
    const [isOpenModalConfirmDescartar, setIsOpenModalConfirmDescartar] = useState(false);
    const [detalleComprobanteId, setDetalleComprobanteId] = useState<number | null>(null);
    const [errorSunatModal, setErrorSunatModal] = useState<{ titulo: string; mensaje: string } | null>(null);
    const [soloPendientesSunat, setSoloPendientesSunat] = useState(() => {
        const searchParams = new URLSearchParams(window.location.search);
        return searchParams.get('soloPendientesSunat') === 'true';
    });

    const handleOpenMenu = (event: React.MouseEvent<HTMLElement>, row: any) => {
        setMenuAnchor(event.currentTarget);
        setSelectedMenuRow(row);
    };

    const handleCloseMenu = () => {
        setMenuAnchor(null);
        setSelectedMenuRow(null);
    };
    const paymentFlow = usePaymentFlow();
    const [isOpenModalPagoParcial, setIsOpenModalPagoParcial] = useState(false);
    const [isOpenModalPdf, setIsOpenModalPdf] = useState(false);
    const [pdfUrl, setPdfUrl] = useState<string>("");
    const [pdfName, setPdfName] = useState<string>("comprobante.pdf");
    const [pdfLoading, setPdfLoading] = useState(false);
    const [shouldPrint, setShouldPrint] = useState(false);

    const handleVerPdf = async (row: any) => {
        handleCloseMenu();
        const corr = String(row.correlativo || '').padStart(8, '0');
        setPdfName(`${row.serie}-${corr}.pdf`);
        setPdfUrl(row.s3PdfUrl || '');
        setPdfLoading(!row.s3PdfUrl);
        setIsOpenModalPdf(true);

        if (row.s3PdfUrl) return;

        try {
            const res: any = await post(`comprobante/${row.id}/generar-pdf`, {});
            if (res?.error) {
                useAlertStore.getState().alert(res.error, 'error');
                return;
            }

            const url = res?.data?.pdfUrl || res?.pdfUrl;
            if (url) {
                setPdfUrl(url);
                setInvoicesList(prev => prev.map(invoice => (
                    invoice.id === row.id ? { ...invoice, s3PdfUrl: url } : invoice
                )));
                return;
            }

            useAlertStore.getState().alert('No se pudo obtener el enlace del PDF', 'error');
        } catch (error: any) {
            useAlertStore.getState().alert(error.message || 'No se pudo generar el PDF', 'error');
        } finally {
            setPdfLoading(false);
        }
    };

    const handleDownloadAsset = async (url?: string, fallbackName: string = 'archivo') => {
        if (!url) return;

        try {
            const isProtectedAsset = url.startsWith(API_URL);
            const headers: HeadersInit = {};
            if (isProtectedAsset) {
                const token = localStorage.getItem('ACCESS_TOKEN');
                if (token) headers['Authorization'] = `Bearer ${token}`;
            }

            const response = await fetch(url, { headers });

            if (!response.ok) {
                throw new Error('No se pudo descargar el archivo');
            }

            const blob = await response.blob();
            const objectUrl = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = objectUrl;
            link.download = fallbackName;
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(objectUrl);
        } catch (error: any) {
            useAlertStore.getState().alert(error.message || 'No se pudo descargar el archivo', 'error');
        }
    };

    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const pages = [];
    for (let i = 1; i <= Math.ceil(totalInvoicesList / itemsPerPage); i++) {
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

    // Limpiar el comprobante cargado al entrar/salir de esta página
    useEffect(() => {
        resetInvoice();
        return () => {
            resetInvoice();
        };
    }, []);

    const fetchFormalInvoices = useCallback(async () => {
        setInvoicesLoading(true);
        const requestId = ++requestIdRef.current;
        try {
            const filteredParams = Object.entries({
                tipoComprobante: "FORMAL",
                page: currentPage,
                limit: itemsPerPage,
                search: debounce,
                // Con el filtro de pendientes en SUNAT se ignora el rango de fechas
                // (el conteo del dashboard no está acotado por mes): así aparecen
                // los pendientes de cualquier mes, no solo el actual.
                ...(soloPendientesSunat ? {} : { fechaInicio, fechaFin }),
                estado: stateInvoice === "TODOS" ? "" : stateInvoice,
                ...(soloPendientesSunat ? { soloPendientesSunat: 'true' } : {}),
                ...(canFilterByUsuario && selectedUsuarioId ? { usuarioId: selectedUsuarioId } : {}),
                ...(effectiveSedeId ? { sedeId: effectiveSedeId } : {})
            })
                .filter(([, value]) => value !== undefined)
                .reduce((obj, [key, value]) => ({ ...obj, [key]: value }), {});

            const query = new URLSearchParams(filteredParams as Record<string, string>).toString();
            const resp: any = await get(`comprobante/listar?${query}`);

            if (requestId !== requestIdRef.current) return;

            if (resp?.code === 1) {
                const nextInvoices = Array.isArray(resp?.data?.comprobantes)
                    ? resp.data.comprobantes.map(normalizeSunatEstado)
                    : [];
                setInvoicesList(nextInvoices);
                setTotalInvoicesList(typeof resp?.data?.total === 'number' ? resp.data.total : nextInvoices.length);
            } else {
                setInvoicesList([]);
                setTotalInvoicesList(0);
            }
        } catch {
            if (requestId !== requestIdRef.current) return;
            setInvoicesList([]);
            setTotalInvoicesList(0);
        } finally {
            if (requestId === requestIdRef.current) {
                setInvoicesLoading(false);
            }
        }
    }, [currentPage, itemsPerPage, debounce, fechaInicio, fechaFin, stateInvoice, soloPendientesSunat, effectiveSedeId, selectedUsuarioId, canFilterByUsuario]);

    useEffect(() => {
        fetchFormalInvoices();
    }, [fetchFormalInvoices]);



    const productsTable = invoicesList?.map((item: IInvoices) => {
        const xmlDownloadUrl = item.s3XmlUrl || (item.sunatXml ? `${API_URL}/comprobante/${item.id}/xml` : '');
        const cdrDownloadUrl = item.s3CdrUrl || (item.sunatCdrZip ? `${API_URL}/comprobante/${item.id}/cdr` : '');
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
            documentoAfiliado: item?.numDocAfectado ? String(item?.numDocAfectado).toUpperCase() : "",
            document: item?.cliente?.nroDoc,
            s3PdfUrl: item?.s3PdfUrl,
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
            total: `S/ ${item.mtoImpVenta.toFixed(2)}`,
            estado: ["BOLETA", "FACTURA", "NOTA DE CREDITO", "NOTA DE DEBITO"].includes(item.comprobante)
                ? item.estadoEnvioSunat
                : item.estadoPago,
            xmlSunat: xmlDownloadUrl,
            cdrSunat: cdrDownloadUrl,
            xmlFileName: `${item.serie}-${String(item.correlativo).padStart(8, '0')}.xml`,
            cdrFileName: `${item.serie}-${String(item.correlativo).padStart(8, '0')}-CDR.xml`,
            estadoSunatRaw: (item as any).estadoSunatRaw,
            sunatRetriesCount: (item as any).sunatRetriesCount ?? 0,
            sunatErrorMsg: item.sunatErrorMsg ?? null,
            documentoId: (item as any).documentoId,
        };

        const canEmitirSunat = ["BOLETA", "FACTURA", "NOTA DE CREDITO", "NOTA DE DEBITO"].includes(rowBase.comprobante);

        const acciones = (
            <button
                type="button"
                onClick={(e) => handleOpenMenu(e, { ...rowBase, tipoDoc: item.tipoDoc, cotizIncluirImagenes: (item as any).cotizIncluirImagenes })}
                className="px-2 py-1 text-xs rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-200 flex items-center gap-1 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
            >
                <Icon icon="mdi:dots-vertical" width={18} height={18} />
            </button>
        );

        return {
            ...rowBase,
            acciones,
        };
    });

    const renderEstadoBadge = (estado?: string) => {
        const value = String(estado || 'SIN ESTADO').toUpperCase();
        const tone = value.includes('ACEPTADO') || value.includes('EMITIDO') || value.includes('PAGADO')
            ? 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20'
            : value.includes('CONCILIACION')
                ? 'bg-sky-50 text-sky-700 border-sky-100 dark:bg-sky-500/10 dark:text-sky-300 dark:border-sky-500/20'
            : value.includes('PENDIENTE')
                ? 'bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20'
                : value.includes('ANULADO') || value.includes('RECHAZADO') || value.includes('FALLIDO')
                    ? 'bg-rose-50 text-rose-700 border-rose-100 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20'
                    : 'bg-slate-50 text-slate-600 border-slate-100 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';

        return (
            <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${tone}`}>
                {value === 'PENDIENTE_CONCILIACION' ? 'Conciliación SUNAT' : value}
            </span>
        );
    };


    const handleGetReceipt = async (data: any) => {
        console.log(data);
        setComprobante(data.comprobante);
        setShouldPrint(true);
        await getInvoice(data.id);
    };

    const handleAbrirModal = async (data: any, tab: 'whatsapp' | 'email') => {
        try {
            const response: any = await get(`comprobante/${data.id}`);
            const freshComprobante = response.data || response;

            if (!freshComprobante || !freshComprobante.id) {
                throw new Error("Datos de comprobante inválidos");
            }

            const tipoDocMap: Record<string, string> = { '01': 'FACTURA', '03': 'BOLETA', '07': 'NOTA DE CREDITO', '08': 'NOTA DE DEBITO' };
            setComprobanteWhatsApp({
                id: freshComprobante.id,
                serie: freshComprobante.serie,
                correlativo: freshComprobante.correlativo,
                comprobante: freshComprobante.comprobante || tipoDocMap[freshComprobante.tipoDoc] || 'COMPROBANTE',
                total: Number(freshComprobante.mtoImpVenta || 0),
                clienteNombre: freshComprobante.cliente?.nombre || 'Cliente',
                clienteCelular: freshComprobante.cliente?.telefono || '',
                clienteEmail: freshComprobante.cliente?.email || '',
                pdfUrl: freshComprobante.s3PdfUrl,
            });
            setModalDefaultTab(tab);
            setIsOpenModalWhatsApp(true);
        } catch (error) {
            console.error('Error al cargar datos del comprobante:', error);
            useAlertStore.getState().alert('Error al cargar datos del comprobante', 'error');
        }
    };

    const handleConvertirAFactura = (data: any) => {
        const cotizacion = invoicesList.find((inv: IInvoices) => inv.id === data.id);
        if (!cotizacion) return;

        navigate('/administrador/facturacion/nuevo', {
            state: {
                fromQuotation: true,
                quotationData: {
                    cliente: cotizacion.cliente,
                    productos: cotizacion.detalles,
                    observaciones: cotizacion.observaciones,
                }
            }
        });
    };

    // Inicio de flujo de pago parcial (unificado)
    const handlePartialPayment = async (data: any) => {
        // Guardamos datos mínimos del row para el modal
        setFormValues(data);
        const comprobanteData = invoicesList.find((inv: IInvoices) => inv.id === data.id);
        if (!comprobanteData) return;
        const totalComprobante = comprobanteData.mtoImpVenta || 0;
        const saldoPendiente = (comprobanteData as any).saldo ?? totalComprobante; // si no hay saldo, asumir total

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

        // Tomamos datos del comprobante desde formValues (seleccionado del row)
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
                // Reutiliza completePay del store (acepta monto opcional)
                return await completePay(pagoData, medioPago, monto);
            }
        );

        if (result.success) {
            setIsOpenModalPagoParcial(false);
            // refrescar tabla luego de cerrar recibo
            setTimeout(() => {
                fetchFormalInvoices();
            }, 300);
        }
    };

    const handleCloseReceipt = () => {
        paymentFlow.closeReceipt();
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

    const handleSelectState = (_id: string, value: string) => {
        setStateInvoice(value)
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

    const estadosInvoice = [{ id: 1, value: "TODOS" }, { id: 2, value: "EMITIDO" }, { id: 3, value: "PENDIENTE" }, { id: 4, value: "PENDIENTE_CONCILIACION" }, { id: 5, value: "ANULADO" }, { id: 6, value: "RECHAZADO" }]
    const sedesOptions = [
        { id: 0, value: 'Todas las sedes' },
        ...sedes.map((s: any) => ({ id: s.id, value: s.nombre }))
    ]
    const vendedoresOptions = usuarios.filter((u) => u.estado === 'ACTIVO');

    const confirmCancelInvoice = () => {
        cancelInvoice(formValues?.id)
        setIsOpenModalConfirm(false)
    }

    const confirmCompleteInvoice = () => {
        setIsOpenModalConfirmPayment(false)
        completePay(formValues, paymentMethod)

    }

    const handleChangeSearch = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | any>) => {
        setSearchClient(e.target.value)
    }

    const [printSize, setPrintSize] = useState('TICKET');
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
    }, [invoice, shouldPrint, printFn, resetInvoice])

    const handleSelectPrint = (value: any) => {
        setPrintSize(value)
    }

    const print = [
        {
            id: 'TICKET',
            value: 'TICKET'
        },
        {
            id: 'A4',
            value: 'A4'
        },
        {
            id: 'A5',
            value: 'A5'
        },
    ]

    const activeFilterCount = [
        searchClient.trim(),
        fechaInicio,
        fechaFin,
        stateInvoice !== 'TODOS' ? stateInvoice : '',
        selectedSedeId,
        selectedUsuarioId,
    ].filter(Boolean).length;

    return (
        <>
            <div style={{ position: 'fixed', left: '-9999px', top: '-9999px', visibility: 'hidden', pointerEvents: 'none', zIndex: -1 }}>
            <ComprobantePrintPage
                company={auth}
                componentRef={componentRef}
                formValues={invoice}
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
                // Parámetros de cotización guardados
                includeProductImages={invoice?.cotizIncluirImagenes || false}
                quotationDiscount={invoice?.cotizDescuento || 0}
                quotationValidity={invoice?.cotizVigencia || 7}
                quotationSignature={invoice?.cotizFirmante || ''}
                quotationTerms={invoice?.cotizTerminos || ''}
                quotationPaymentType={invoice?.cotizTipoPago || 'CONTADO'}
                quotationAdvance={invoice?.cotizAdelanto || 0}
            />
            </div>

        <div className="min-h-screen px-3 sm:px-4 pb-6 bg-gray-50 dark:bg-[#0A0D14]">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-5 sm:mb-6 pt-4">
                <div className="min-w-0">
                    <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
                        Comprobantes de la SUNAT
                    </h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Historial de boletas, facturas y notas de crédito</p>
                </div>
                <button
                    type="button"
                    onClick={() => navigate('/administrador/facturacion/nuevo', { state: { defaultType: 'FACTURA' } })}
                    className="inline-flex w-full sm:w-auto items-center justify-center gap-2 px-5 py-3 sm:py-2.5 rounded-xl btn-accent text-sm font-bold transition-all shadow-lg shadow-black/20 active:scale-95"
                >
                    <Icon icon="solar:add-circle-bold" className="text-lg" />
                    Nuevo comprobante
                </button>
            </div>

            {soloPendientesSunat && (
                <div className="mb-4 flex items-center gap-2 px-4 py-2.5 bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-900/40 rounded-xl max-w-fit">
                    <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-amber-600 dark:text-amber-400">
                        <Icon icon="solar:document-add-bold-duotone" width={18} />
                    </div>
                    <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">Mostrando comprobantes pendientes en SUNAT de cualquier fecha</p>
                    <button
                        type="button"
                        onClick={() => { setSoloPendientesSunat(false); setcurrentPage(1); navigate('/administrador/facturacion/comprobantes', { replace: true }); }}
                        className="ml-1 inline-flex items-center gap-1 text-xs font-bold text-amber-700 dark:text-amber-400 hover:text-amber-900 dark:hover:text-amber-300"
                    >
                        <Icon icon="solar:close-circle-bold" width={16} /> Quitar filtro
                    </button>
                </div>
            )}

            <div className="bg-white dark:bg-[#111827] rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 overflow-hidden">
                {/* Filters Section */}
                <div className="p-4 sm:p-5 border-b border-gray-100 dark:border-slate-800">
                    <div className="space-y-3">
                        {/* Fila 1: título + búsqueda + formato (patrón productos) */}
                        <div className="flex flex-wrap items-center gap-2.5">
                            <h3 className="shrink-0 pr-1 text-base font-extrabold text-slate-800 dark:text-white">Comprobantes</h3>
                            <div className="relative min-w-[200px] flex-1 sm:max-w-md">
                                <Icon icon="solar:magnifer-linear" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400 dark:text-gray-400" />
                                <input
                                    onChange={handleChangeSearch}
                                    placeholder="Buscar serie, cliente, correlativo"
                                    className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-700 outline-none transition-colors placeholder:text-slate-400 focus:border-[var(--accent)] dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder:text-gray-500"
                                />
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
                                <Select onChange={handleSelectState} withLabel={false} label="" name="" options={estadosInvoice} defaultValue={stateInvoice} value={stateInvoice} error="" />
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
                                <div className="w-full sm:w-48">
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

                {/* Table Content */}
                <div className="p-3 sm:p-4 pt-0">
                    {invoicesLoading ? (
                        <div className="py-16 flex flex-col items-center justify-center gap-3 text-gray-500 dark:text-gray-400">
                            <Icon icon="line-md:loading-twotone-loop" className="text-4xl text-blue-500" />
                            <span className="text-sm">Cargando comprobantes...</span>
                        </div>
                    ) : productsTable?.length > 0 ? (
                        <>
                            <div className="hidden md:block overflow-x-auto">
                                <DataTable bodyData={productsTable}
                                    headerColumns={[
                                        'Fecha',
                                        'Serie',
                                        'Nro.',
                                        { label: 'Comprobante', key: 'comprobanteBadge' },
                                        { label: 'Cliente', key: 'clientBadge' },
                                        'Importe',
                                        'Num doc',
                                        'Vendedor',
                                        'Sede',
                                        'Doc. Afiliado',
                                        'Estado',
                                        'Acciones'
                                    ]} />
                            </div>
                            <div className="md:hidden space-y-3">
                                {productsTable.map((row: any) => (
                                    <article key={row.id} className="rounded-2xl border border-gray-100 dark:border-slate-800 bg-white dark:bg-[#0F1623] p-4 shadow-sm">
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0">
                                                <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400 dark:text-slate-500">{row.fechaEmisión}</p>
                                                <h3 className="mt-1 text-base font-black text-gray-900 dark:text-white truncate">
                                                    {row.serie}-{String(row.correlativo).padStart(8, '0')}
                                                </h3>
                                                <p className="mt-0.5 text-xs font-bold text-blue-600 dark:text-blue-400">{row.comprobante}</p>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={(e) => handleOpenMenu(e, row)}
                                                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-gray-700 dark:text-gray-200"
                                                aria-label="Acciones"
                                            >
                                                <Icon icon="mdi:dots-vertical" width={20} height={20} />
                                            </button>
                                        </div>

                                        <div className="mt-3 flex items-center justify-between gap-3">
                                            {renderEstadoBadge(row.estado)}
                                            <p className="text-lg font-black text-gray-950 dark:text-white">{row.total}</p>
                                        </div>

                                        <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                                            <div className="rounded-xl bg-gray-50 dark:bg-slate-800/70 p-3">
                                                <p className="font-bold uppercase tracking-wide text-gray-400 dark:text-slate-500">Cliente</p>
                                                <p className="mt-1 font-bold text-gray-700 dark:text-gray-200 line-clamp-2">{row.client || '-'}</p>
                                            </div>
                                            <div className="rounded-xl bg-gray-50 dark:bg-slate-800/70 p-3">
                                                <p className="font-bold uppercase tracking-wide text-gray-400 dark:text-slate-500">Doc.</p>
                                                <p className="mt-1 font-bold text-gray-700 dark:text-gray-200 truncate">{row.document || '-'}</p>
                                            </div>
                                            <div className="rounded-xl bg-gray-50 dark:bg-slate-800/70 p-3">
                                                <p className="font-bold uppercase tracking-wide text-gray-400 dark:text-slate-500">Sede</p>
                                                <p className="mt-1 font-bold text-gray-700 dark:text-gray-200 truncate">{row.sede || '-'}</p>
                                            </div>
                                            <div className="rounded-xl bg-gray-50 dark:bg-slate-800/70 p-3">
                                                <p className="font-bold uppercase tracking-wide text-gray-400 dark:text-slate-500">Vendedor</p>
                                                <p className="mt-1 font-bold text-gray-700 dark:text-gray-200 truncate">{row.vendedor || '-'}</p>
                                            </div>
                                        </div>
                                    </article>
                                ))}
                            </div>
                            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-slate-800">
                                <Pagination
                                    data={productsTable}
                                    optionSelect
                                    currentPage={currentPage}
                                    indexOfFirstItem={indexOfFirstItem}
                                    indexOfLastItem={indexOfLastItem}
                                    setcurrentPage={setcurrentPage}
                                    setitemsPerPage={setitemsPerPage}
                                    pages={pages}
                                    total={totalInvoicesList}
                                />
                            </div>
                        </>
                    ) : (
                        <div className="py-12 text-center">
                            <Icon icon="solar:document-text-linear" className="text-5xl text-gray-300 dark:text-slate-600 mx-auto mb-3" />
                            <p className="text-gray-500 dark:text-gray-400">No se encontraron comprobantes</p>
                            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Ajusta los filtros o selecciona un rango de fechas diferente</p>
                        </div>
                    )}
                </div>
            </div>

            {isOpenModalConfirmDescartar && (
                <ModalConfirm
                    confirmSubmit={async () => {
                        await discardInvoice(formValues?.id);
                        setInvoicesList(prev => prev.filter(inv => inv.id !== formValues?.id));
                        setTotalInvoicesList(prev => Math.max(0, prev - 1));
                        setIsOpenModalConfirmDescartar(false);
                    }}
                    information="¿Eliminar este comprobante? Se borrará permanentemente de la lista y se revertirá el stock. Esta acción no se puede deshacer."
                    isOpenModal
                    setIsOpenModal={() => setIsOpenModalConfirmDescartar(false)}
                    title="Eliminar comprobante"
                />
            )}
            {isOpenModalConfirm && <ModalConfirm confirmSubmit={confirmCancelInvoice} information={`¿Estás seguro que deseas anular este comprobante del cliente ${formValues?.client || 'Desconocido'} por un importe de ${formValues?.total || 'S/ 0.00'}?`} isOpenModal setIsOpenModal={() => setIsOpenModalConfirm(false)} title="Anular comprobante" />}
            {isOpenModalConfirmPayment && <ModalConfirm confirmSubmit={confirmCompleteInvoice} information="¿Cuál de estos metodos de pago se completo el pago?" isOpenModal setIsOpenModal={() => setIsOpenModalConfirmPayment(false)} title="Completar pago">
                <div className="grid grid-cols-3 gap-4 sm:gap-10 col-start-1 col-end-2 mb-5 mt-5">
                    {[
                        { key: 'Efectivo', src: 'https://img.freepik.com/vector-premium/efectivo-mano-logotipo-empresario-blanco_269543-105.jpg' },
                        { key: 'Yape', src: 'https://marketing-peru.beglobal.biz/wp-content/uploads/2025/01/logo-yape-bolivia.jpeg' },
                        { key: 'Plin', src: 'https://logosenvector.com/logo/img/plin-interbank-4391.png' },
                    ].map(({ key, src }) => (
                        <button
                            key={key}
                            type="button"
                            onClick={() => setPaymentMethod(key as any)}
                            className={`p-1 justify-center rounded-lg flex border-2 ${paymentMethod === key
                                ? 'border-blue-500 bg-blue-100'
                                : 'border-transparent hover:border-gray-300'
                                }`}
                        >
                            <img src={src} alt={key} className="w-14 object-cover" />
                        </button>
                    ))}
                </div>

            </ModalConfirm>}
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
                closeModal={() => { setIsOpenModalPdf(false); setPdfUrl(''); setPdfLoading(false); }}
                title="VISTA PREVIA DEL PDF"
                width="980px"
            >
                <div className="p-3 space-y-3">
                    <div className="flex justify-end">
                        {pdfUrl && (
                            <a
                                href={pdfUrl}
                                download={pdfName}
                                target="_blank"
                                rel="noreferrer"
                                className="px-3 py-1.5 text-xs rounded-md bg-[#6A6CFF] text-white hover:opacity-90"
                            >
                                Descargar
                            </a>
                        )}
                    </div>
                    <div className="h-[80vh] flex items-center justify-center">
                        {pdfLoading ? (
                            <div className="flex flex-col items-center gap-3 text-gray-400">
                                <Icon icon="solar:refresh-bold" className="animate-spin text-violet-500" width={36} />
                                <span className="text-sm">Generando PDF...</span>
                            </div>
                        ) : pdfUrl ? (
                            <iframe src={pdfUrl} className="w-full h-full rounded-lg border" />
                        ) : (
                            <div className="text-center text-gray-500 text-sm">No hay PDF disponible</div>
                        )}
                    </div>
                </div>
            </Modal>
            {(isOpenModalPagoParcial && paymentFlow.payment) && (
                <ModalPaymentUnified
                    isOpen={isOpenModalPagoParcial}
                    isLoading={paymentFlow.isLoading}
                    paymentType={paymentFlow.payment.tipo}
                    saldoPendiente={parseFloat((formValues?.saldo || '').toString().replace('S/ ', '') || '0') || parseFloat((formValues?.total || '').toString().replace('S/ ', '') || '0')}
                    totalComprobante={parseFloat((formValues?.total || '').toString().replace('S/ ', '') || '0')}
                    comprobanteInfo={{
                        id: formValues.id,
                        serie: formValues.serie,
                        correlativo: formValues.correlativo,
                        cliente: formValues.client,
                        total: parseFloat((formValues?.total || '').toString().replace('S/ ', '') || '0')
                    }}
                    onConfirm={handleConfirmPago}
                    onCancel={() => {
                        setIsOpenModalPagoParcial(false);
                        paymentFlow.reset();
                    }}
                    error={paymentFlow.error || ''}
                />
            )}
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
                onUpdated={fetchFormalInvoices}
            />

            {/* Modal error SUNAT */}
            {errorSunatModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50  ">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-lg border border-orange-200 dark:border-orange-800/40">
                        <div className="flex items-center gap-3 p-5 border-b border-gray-100 dark:border-slate-800">
                            <div className="w-9 h-9 rounded-xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center flex-shrink-0">
                                <Icon icon="solar:danger-triangle-bold-duotone" className="text-orange-500" width={20} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{errorSunatModal.titulo}</p>
                                <p className="text-xs text-gray-500 dark:text-slate-400">Error reportado por SUNAT</p>
                            </div>
                            <button onClick={() => setErrorSunatModal(null)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-400 dark:text-slate-500">
                                <Icon icon="solar:close-circle-bold-duotone" width={20} />
                            </button>
                        </div>
                        <div className="p-5">
                            <div className="rounded-xl bg-orange-50 dark:bg-orange-900/10 border border-orange-100 dark:border-orange-800/30 p-4">
                                <p className="text-xs font-mono text-orange-800 dark:text-orange-300 whitespace-pre-wrap break-words leading-relaxed">
                                    {errorSunatModal.mensaje}
                                </p>
                            </div>
                            <p className="text-xs text-gray-500 dark:text-slate-400 mt-3">
                                Este error proviene directamente de los servidores de SUNAT. Corrige los datos del comprobante y vuelve a emitirlo.
                            </p>
                        </div>
                        <div className="flex justify-end px-5 pb-5">
                            <button
                                onClick={() => setErrorSunatModal(null)}
                                className="px-4 py-2 rounded-xl bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 text-sm font-medium hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors"
                            >
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Menu de Acciones Flotante con Portal */}
            <TableActionMenu
                isOpen={Boolean(menuAnchor)}
                anchorEl={menuAnchor}
                onClose={handleCloseMenu}
                className="w-60"
            >
                {selectedMenuRow && (() => {
                    const rowBase = selectedMenuRow;
                    const canEmitirSunat = ["BOLETA", "FACTURA", "NOTA DE CREDITO", "NOTA DE DEBITO"].includes(rowBase.comprobante);

                    const canNC = ['FACTURA', 'BOLETA'].includes(rowBase.comprobante) && rowBase.estado !== 'ANULADO' && rowBase.estado !== 'RECHAZADO' && rowBase.estado !== 'PENDIENTE';
                    const canBaja = rowBase.estado !== 'ANULADO' && rowBase.estado !== 'RECHAZADO' && rowBase.estado !== 'PENDIENTE';

                    return (
                        <>
                            {/* ── Acciones principales ── */}
                            <button
                                type="button"
                                onClick={() => { setDetalleComprobanteId(rowBase.id); handleCloseMenu(); }}
                                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700"
                            >
                                <Icon icon="solar:document-text-bold-duotone" width={16} height={16} />
                                <span>Ver detalle</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => { handleGetReceipt(rowBase); handleCloseMenu(); }}
                                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700"
                            >
                                <Icon icon="mingcute:print-line" width={16} height={16} />
                                <span>Imprimir</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => handleVerPdf(rowBase)}
                                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700"
                            >
                                <Icon icon="mdi:file-pdf-box" width={16} height={16} />
                                <span>Ver PDF</span>
                            </button>
                            <button
                                type="button"
                                disabled={!rowBase.xmlSunat}
                                onClick={() => { if (rowBase.xmlSunat) { handleDownloadAsset(rowBase.xmlSunat, rowBase.xmlFileName); } handleCloseMenu(); }}
                                className={`w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-gray-100 dark:hover:bg-slate-700 ${rowBase.xmlSunat ? 'text-gray-700 dark:text-gray-300' : 'text-gray-400 cursor-not-allowed'}`}
                            >
                                <Icon icon="hugeicons:xml-02" width={16} height={16} />
                                <span>Descargar XML</span>
                            </button>
                            <button
                                type="button"
                                disabled={!rowBase.cdrSunat}
                                onClick={() => { if (rowBase.cdrSunat) { handleDownloadAsset(rowBase.cdrSunat, rowBase.cdrFileName); } handleCloseMenu(); }}
                                className={`w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-gray-100 dark:hover:bg-slate-700 ${rowBase.cdrSunat ? 'text-gray-700 dark:text-gray-300' : 'text-gray-400 cursor-not-allowed'}`}
                            >
                                <Icon icon="mdi:zip-box-outline" width={16} height={16} />
                                <span>Descargar CDR</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => { handleAbrirModal(rowBase, 'email'); handleCloseMenu(); }}
                                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700"
                            >
                                <Icon icon="solar:letter-bold" width={16} height={16} />
                                <span>Enviar Email</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => { handleAbrirModal(rowBase, 'whatsapp'); handleCloseMenu(); }}
                                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-green-600 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-950/30"
                            >
                                <Icon icon="mdi:whatsapp" width={16} height={16} />
                                <span>Enviar WhatsApp</span>
                            </button>

                            {/* Conciliar: la boleta ya está registrada en SUNAT (error 1033) pero
                                el CDR no es recuperable vía QPSE. Marca el comprobante como aceptado. */}
                            {rowBase.estadoSunatRaw === 'PENDIENTE_CONCILIACION' && (
                                <>
                                    <div className="border-t border-gray-100 dark:border-slate-700 my-1" />
                                    <button
                                        type="button"
                                        onClick={async () => {
                                            handleCloseMenu();
                                            const res = await conciliarInvoice(rowBase.id);
                                            if (res?.success) {
                                                // Refleja EMITIDO/Aceptado al instante (invoicesList es estado local).
                                                setInvoicesList((prev) => prev.map((inv: any) =>
                                                    inv.id === rowBase.id
                                                        ? { ...inv, estadoEnvioSunat: 'ACEPTADO', estadoSunatRaw: 'EMITIDO' }
                                                        : inv
                                                ));
                                            }
                                        }}
                                        className="w-full flex items-center gap-2 px-3 py-2 text-xs whitespace-nowrap text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/30"
                                    >
                                        <Icon icon="solar:check-circle-bold-duotone" width={16} height={16} />
                                        <span>Marcar como conciliado</span>
                                    </button>
                                </>
                            )}

                            {/* ── Sección: acciones especiales ── */}
                            {(rowBase.comprobante?.includes('COTIZACI') || rowBase.tipoDoc === 'COT') && (
                                <>
                                    <div className="border-t border-gray-100 dark:border-slate-700 my-1" />
                                    <button
                                        type="button"
                                        onClick={() => { handleConvertirAFactura(rowBase); handleCloseMenu(); }}
                                        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/30"
                                    >
                                        <Icon icon="solar:document-add-bold-duotone" width={16} height={16} />
                                        <span>Convertir a Factura</span>
                                    </button>
                                </>
                            )}

                            {!canEmitirSunat && (
                                <>
                                    <div className="border-t border-gray-100 dark:border-slate-700 my-1" />
                                    <button
                                        type="button"
                                        disabled={!canBaja}
                                        onClick={() => { if (canBaja) { setFormValues(rowBase); setIsOpenModalConfirm(true); } handleCloseMenu(); }}
                                        className={`w-full flex items-center gap-2 px-3 py-2 text-xs ${canBaja ? 'text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/30' : 'text-gray-400 cursor-not-allowed'}`}
                                    >
                                        <Icon icon="solar:close-circle-bold-duotone" width={16} height={16} />
                                        <span>Dar de Baja</span>
                                    </button>
                                </>
                            )}

                            <>
                                <div className="border-t border-gray-100 dark:border-slate-700 my-1" />
                                <button
                                    type="button"
                                    disabled={!canNC}
                                    onClick={() => {
                                        if (canNC) {
                                            navigate('/administrador/facturacion/nuevo', {
                                                state: { fromCreditNote: true, creditNoteData: { comprobanteReemplazar: rowBase.comprobante, serieReemplazar: rowBase.serie, correlativoReemplazar: rowBase.correlativo } }
                                            });
                                        }
                                        handleCloseMenu();
                                    }}
                                    className={`w-full flex items-center gap-2 px-3 py-2 text-xs whitespace-nowrap ${canNC ? 'text-amber-600 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-950/30' : 'text-gray-400 cursor-not-allowed'}`}
                                >
                                    <Icon icon="solar:document-medicine-bold-duotone" width={16} height={16} />
                                    <span>Generar NC (Anular)</span>
                                </button>
                            </>

                            {rowBase.sunatErrorMsg && (
                                <>
                                    <div className="border-t border-gray-100 dark:border-slate-700 my-1" />
                                    <button
                                        type="button"
                                        onClick={() => { setErrorSunatModal({ titulo: `Error SUNAT — ${rowBase.serie}-${String(rowBase.correlativo).padStart(8, '0')}`, mensaje: rowBase.sunatErrorMsg }); handleCloseMenu(); }}
                                        className="w-full flex items-center gap-2 px-3 py-2 text-xs whitespace-nowrap text-orange-600 hover:bg-orange-50 dark:text-orange-400 dark:hover:bg-orange-950/30"
                                    >
                                        <Icon icon="solar:danger-triangle-bold-duotone" width={16} height={16} />
                                        <span>Ver error SUNAT</span>
                                    </button>
                                </>
                            )}

                            {canEmitirSunat && rowBase.estadoSunatRaw !== 'EMITIDO' && rowBase.estadoSunatRaw !== 'ANULADO' && rowBase.estadoSunatRaw !== 'NO_APLICA' && (
                                <>
                                    <div className="border-t border-gray-100 dark:border-slate-700 my-1" />
                                    <button
                                        type="button"
                                        onClick={() => { setFormValues(rowBase); setIsOpenModalConfirmDescartar(true); handleCloseMenu(); }}
                                        className="w-full flex items-center gap-2 px-3 py-2 text-xs whitespace-nowrap text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
                                    >
                                        <Icon icon="solar:trash-bin-trash-bold-duotone" width={16} height={16} />
                                        <span>Eliminar comprobante</span>
                                    </button>
                                </>
                            )}
                        </>
                    );
                })()}
            </TableActionMenu>
            </div>
        </>
    );

};

export default Comprobantes;
