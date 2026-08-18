import { ChangeEvent, useEffect, useState, useMemo, useRef } from "react";
import { IInvoicesState, useInvoiceStore } from "@/zustand/invoices";
import { IExtentionsState, useExtentionsStore } from "@/zustand/extentions";
import { IClientsState, useClientsStore } from "@/zustand/clients";
import { IProductsState, useProductsStore } from "@/zustand/products";
import { ICategoriesState, useCategoriesStore } from "@/zustand/categories";
import { useCombosStore } from "@/zustand/combos";
import { IFormInvoice } from "@/interfaces/invoices";
import { numberToWords } from "@/utils/numberToLetters";
import { calculateTotals } from "@/utils/calculateTotals";
import useAlertStore from "@/zustand/alert";
import { useAuthStore } from "@/zustand/auth";
import { useEmpresasStore } from "@/zustand/empresas";
import { useUsersStore } from "@/zustand/users";
import { IFormClient } from "@/interfaces/clients";
import { IFormProduct } from "@/interfaces/products";
import { formatISO, parse } from 'date-fns';
import { useDebounce } from "@/hooks/useDebounce";
import { useNavigate, useLocation } from "react-router-dom";
import { get, patch } from "@/utils/fetch";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useThemeStore } from "@/zustand/theme";
import QRCode from 'qrcode';
import { DetraccionData } from "@/pages/admin/facturacion/ModalDetraccion";
import { QuotationConfig } from "@/pages/admin/facturacion/ModalConfiguracionCotizacion";

import {
    tiposComprobanteFormales,
    tiposComprobantesInformales,
    tiposCotizacion,
    metodosContado,
    metodosCredito,
    type ICatalogoFarmaciaItem,
    type IDatosReceta,
} from "./FacturacionModel";
import { COURIERS } from "./components/EnvioModal";
import { mapDetalleToInvoiceProduct } from "./utils/comprobanteProductMapper";
import { tipoCambioService } from "@/services/tipoCambio.service";

type EnvioDespachoFormData = {
    transportista?: string;
    tipoEnvio?: string;
    agenciaDestino?: string;
    celularDest?: string;
    nroPaquetes?: number | string;
    turnoEnvio?: string;
    tipoMercaderia?: string;
    claveEnvio?: string;
    nroOrden?: string;
    claveOrden?: string;
    establecimiento?: string;
    repartidor?: string;
    repartidorId?: number | null;
    empaquetador?: string;
    observaciones?: string;
    fechaEstimada?: string;
    costoEnvio?: number;
    pagarFlete?: 'CLIENTE' | 'NEGOCIO';
    aplicacionMontoCliente?: 'ITEM_ENVIO' | 'ADELANTO' | 'NEGOCIO';
    nombreDestinatario?: string;
    dniDestinatario?: string;
    contenidoPaquete?: string;
    montoCOD?: number;
};

export type PaymentLine = {
    method: string;
    amount: number;
    referencia?: string;
    cuentaBancariaId?: number | null;
    cuentaBancariaLabel?: string;
    tarjetaMarca?: string;
    tarjetaTipo?: string;
    tarjetaUltimos4?: string;
};

const cleanText = (value?: string) => String(value ?? '').trim();

const esServicioTecnico = (item: any) =>
    String(item?.atributosTecnicos?.tipoProducto || '').toUpperCase() === 'SERVICIO';

const crearEstadoItemLibre = () => ({
    descripcion: '',
    cantidad: '1',
    precioUnitario: '',
    tipo: 'SERVICIO' as 'SERVICIO' | 'PRODUCTO',
    // Afectación IGV (Catálogo 07): '10' gravado, '20' exonerado, '30' inafecto,
    // '40' exportación, y gratuitas (11-16 gravado, 21 exonerado, 31-37 inafecto).
    afectacion: '10' as string,
});

// Nombre legible por código de afectación (Catálogo 07) para mostrar en el ticket.
const NOMBRE_AFECTACION: Record<string, string> = {
    '10': 'Gravado – Operación Onerosa',
    '20': 'Exonerado',
    '30': 'Inafecto',
    '40': 'Exportación',
    '11': 'Gravado – Gratuito (premio)',
    '12': 'Gravado – Gratuito (donación)',
    '13': 'Gravado – Gratuito (retiro)',
    '14': 'Gravado – Gratuito (publicidad)',
    '15': 'Gravado – Bonificación',
    '16': 'Gravado – Gratuito (a trabajadores)',
    '21': 'Exonerado – Transferencia gratuita',
    '31': 'Inafecto – Gratuito (bonificación)',
    '32': 'Inafecto – Gratuito (retiro)',
    '33': 'Inafecto – Gratuito',
    '34': 'Inafecto – Gratuito',
    '35': 'Inafecto – Gratuito',
    '36': 'Inafecto – Gratuito',
    '37': 'Inafecto – Gratuito',
};

// Afectaciones gratuitas (Catálogo 07): no suman al importe a pagar (son sin costo).
const esAfectacionGratuita = (codigo: any): boolean => {
    const n = Number(codigo);
    return (n >= 11 && n <= 16) || n === 21 || (n >= 31 && n <= 37);
};

const isCompleteEnvioDespacho = (data: EnvioDespachoFormData) => {
    const celular = cleanText(data.celularDest).replace(/\D/g, '');
    return Boolean(
        cleanText(data.transportista) &&
        ['AGENCIA', 'DOMICILIO'].includes(cleanText(data.tipoEnvio)) &&
        cleanText(data.agenciaDestino) &&
        celular.length >= 9 &&
        Number(data.nroPaquetes) >= 1 &&
        ['MANANA', 'TARDE', 'NOCHE'].includes(cleanText(data.turnoEnvio))
    );
};

const buildEnvioDespachoPayload = (data: EnvioDespachoFormData) => {
    const tipoEnvio = cleanText(data.tipoEnvio) || 'AGENCIA';
    const destino = cleanText(data.agenciaDestino);
    const fecha = cleanText(data.fechaEstimada);
    const fechaEstimada = fecha && !Number.isNaN(new Date(`${fecha}T00:00:00-05:00`).getTime())
        ? new Date(`${fecha}T00:00:00-05:00`).toISOString()
        : undefined;

    return {
        estado: 'PREPARANDO',
        transportista: cleanText(data.transportista),
        tipoEnvio,
        agenciaDestino: destino,
        direccionDestino: tipoEnvio === 'DOMICILIO' ? destino : undefined,
        celularDest: cleanText(data.celularDest).replace(/\D/g, ''),
        nroPaquetes: Number(data.nroPaquetes) || 1,
        turnoEnvio: cleanText(data.turnoEnvio) || 'MANANA',
        tipoMercaderia: cleanText(data.tipoMercaderia),
        claveEnvio: cleanText(data.claveEnvio),
        nroOrden: cleanText(data.nroOrden),
        claveOrden: cleanText(data.claveOrden),
        establecimiento: cleanText(data.establecimiento),
        repartidor: data.repartidorId ? undefined : cleanText(data.repartidor),
        repartidorId: data.repartidorId || undefined,
        empaquetador: cleanText(data.empaquetador),
        observaciones: cleanText(data.observaciones),
        ...(fechaEstimada ? { fechaEstimada } : {}),
        nombreDestinatario: cleanText(data.nombreDestinatario),
        dniDestinatario: cleanText(data.dniDestinatario),
        contenidoPaquete: cleanText(data.contenidoPaquete),
        costoEnvio: Number(data.costoEnvio) || 0,
        pagarFlete: data.aplicacionMontoCliente === 'NEGOCIO' ? 'NEGOCIO' : 'CLIENTE',
        aplicacionMontoCliente: data.aplicacionMontoCliente ?? ((Number(data.costoEnvio) > 0 && data.pagarFlete === 'CLIENTE') ? 'ITEM_ENVIO' : 'NEGOCIO'),
        ...(Number(data.montoCOD) > 0 ? { montoCOD: Number(data.montoCOD) } : {}),
    };
};

export const useFacturacionViewModel = () => {
    const { receipt, importReference, addInformalInvoice, addProductsInvoice, updateProductInvoice, productsInvoice, getInvoiceBySerieCorrelative, resetProductInvoice, invoiceData, deleteProductInvoice, deleteProductInvoiceByIndex, addInvoice, dataReceipt, resetInvoice, getSerieAndCorrelativeByReceipt, updateQuotation, updateNotaVenta }: IInvoicesState = useInvoiceStore();
    const { zoomLevel } = useThemeStore();
    const { auth, sedeActiva } = useAuthStore();
    const { categories, getAllCategories }: ICategoriesState = useCategoriesStore();
    const { getAllClients, clients, getClientFromDoc, addClients }: IClientsState = useClientsStore();
    const { getAllProducts, products, totalProducts }: IProductsState = useProductsStore();
    const { combos, fetchCombos } = useCombosStore();
    const { getCreditDebitNoteTypes, getCurrencies, creditDebitNoteTypes, getDocumentTypes }: IExtentionsState = useExtentionsStore();

    const location = useLocation();
    const navigate = useNavigate();
    const isMobile = useIsMobile();
    const isQuotationRoute = location.pathname.includes('/cotizaciones/nuevo');
    const tiposInformales = ['TICKET', 'NV', 'RH', 'CP', 'NP', 'OT', 'COT'];
    // Comprobante labels que usan "Clientes Varios" por defecto (todos los informales excepto FACTURA/NC/ND)
    const LABELS_CLIENTES_VARIOS = ["BOLETA", "TICKET", "NOTA DE VENTA", "NOTA DE PEDIDO", "ORDEN DE TRABAJO", "COMPROBANTE DE PAGO", "RECIBO POR HONORARIO"];
    const tipoEmpresa = auth?.empresa?.tipoEmpresa || "";

    // Detección de rubros farmacéuticos
    const rubroNombre = ((auth?.empresa as any)?.rubro?.nombre ?? '').toLowerCase();
    const isFarmaciaRetail = rubroNombre.includes('farmacia') || rubroNombre.includes('botica') || rubroNombre.includes('medicament');
    const esDrogueria = rubroNombre.includes('drogueria') || rubroNombre.includes('droguería');
    const usaLotesFarmacia = isFarmaciaRetail || esDrogueria;
    // Receta médica / controlados: farmacia, botica y droguería (DIGEMID exige
    // trazar receta de psicotrópicos/estupefacientes también a nivel mayorista)
    const habilitaRecetaMedica = isFarmaciaRetail || esDrogueria;
    const usarPrecioLoteFefo = Boolean((auth?.empresa as any)?.usarPrecioLoteFefo);
    // Sobreventa: si la empresa lo habilitó, el POS permite agregar/vender productos
    // aunque el stock sea 0 o insuficiente (solo se muestra una advertencia).
    const permitirVentaSinStock = Boolean((auth?.empresa as any)?.permitirVentaSinStock);

    // Cobranza en campo: si la empresa la activó, al crear la venta se puede
    // atribuir a un "vendedor de campo" (un usuario de la empresa) que se
    // mostrará como vendedor en panel/notas/comprobante en vez de quien registra.
    const cobranzaCampo = Boolean((auth?.empresa as any)?.cobranzaCampo);
    const { usuarios, getAllUsers } = useUsersStore();
    const [vendedorCampoId, setVendedorCampoId] = useState<number | null>(null);
    useEffect(() => {
        if (cobranzaCampo) getAllUsers({ page: 1, limit: 100 });
    }, [cobranzaCampo]); // eslint-disable-line react-hooks/exhaustive-deps

    const [togglingPrecioLote, setTogglingPrecioLote] = useState(false);
    // Toggle rápido (solo rubros con lotes) — persiste el flag de empresa y actualiza el estado
    const togglePrecioLoteFefo = async () => {
        const next = !usarPrecioLoteFefo;
        setTogglingPrecioLote(true);
        try {
            await useEmpresasStore.getState().actualizarMiEmpresa({ usarPrecioLoteFefo: next });
            useAuthStore.setState((state: any) =>
                state.auth
                    ? { auth: { ...state.auth, empresa: { ...state.auth.empresa, usarPrecioLoteFefo: next } } }
                    : state,
            );
            useAlertStore.getState().alert(
                next ? 'Activado: el precio se tomará del lote (FEFO)' : 'Desactivado: se usa el precio de venta',
                'success',
            );
        } catch {
            useAlertStore.getState().alert('No se pudo cambiar la configuración', 'error');
        } finally {
            setTogglingPrecioLote(false);
        }
    };

    const [resellerBranding, setResellerBranding] = useState<{ nombre: string | null; whiteLabelNombre: string | null; whiteLabelWebsite: string | null } | null>(null);
    useEffect(() => {
        get('auth/me').then((resp: any) => {
            const r = resp?.data?.empresa?.reseller;
            if (r?.whiteLabelNombre || r?.whiteLabelWebsite) setResellerBranding(r);
        }).catch(() => {});
    }, []);

    // POS STATES
    const [selectedCategoryId, setSelectedCategoryId] = useState<number>(0);
    const [searchTerm, setSearchTerm] = useState<string>("");

    // Fraccionamiento: modo por producto (CAJA = unidadCompra, UNIDAD = unidadVenta)
    const [modoFraccionPorProducto, setModoFraccionPorProducto] = useState<Record<number, 'CAJA' | 'UNIDAD'>>({});

    const setModoFraccionProducto = (productId: number, modo: 'CAJA' | 'UNIDAD') => {
        setModoFraccionPorProducto(prev => ({ ...prev, [productId]: modo }));
    };

    // Farmacia: catálogo con lotes FEFO y datos de receta
    const [farmaciaProductos, setFarmaciaProductos] = useState<ICatalogoFarmaciaItem[]>([]);
    const [farmaciaTotal, setFarmaciaTotal] = useState(0);
    const [farmaciaLoading, setFarmaciaLoading] = useState(false);
    const [isRecetaModalOpen, setIsRecetaModalOpen] = useState(false);
    const [recetaModalItemIndex, setRecetaModalItemIndex] = useState<number | null>(null);

    // Barcode scanner state
    const [barcodeInput, setBarcodeInput] = useState('');
    const [barcodeLoading, setBarcodeLoading] = useState(false);
    const [barcodeError, setBarcodeError] = useState(false);
    const barcodeRef = useRef<HTMLInputElement>(null);
    const processedGuiaRef = useRef<string | null>(null);
    const processedPedidoTiendaRef = useRef<string | null>(null);
    // Tracks the comprobante type that was pre-filled from a Nota de Venta conversion.
    // Prevents the auto-reset effect from overwriting the NV client while on that comprobante type.
    const fromNVComprobanteRef = useRef<string | null>(null);
    const clientsRef = useRef(clients);
    useEffect(() => { clientsRef.current = clients; }, [clients]);

    const _stateDefaultType = (location.state as any)?.defaultType as string | undefined;
    const _tipoDocInitMap: Record<string, string> = {
        'FACTURA': '01', 'BOLETA': '03',
        'TICKET': 'TICKET', 'NP': 'NP', 'OT': 'OT',
        'NV': 'NV', 'RH': 'RH', 'CP': 'CP',
        'NOTA DE PEDIDO': 'NP',
    };
    const _comprobanteLabelInitMap: Record<string, string> = { NP: 'NOTA DE PEDIDO', NV: 'NOTA DE VENTA' };

    const initialDocumentType = isQuotationRoute
        ? "COTIZACIÓN"
        : (_stateDefaultType
            ? (_comprobanteLabelInitMap[_stateDefaultType] ?? _stateDefaultType)
            : (receipt === ""
                ? (tipoEmpresa === "INFORMAL" ? "TICKET" : "FACTURA")
                : receipt.toUpperCase()));

    const [paymentMethod, setPaymentMethod] = useState<string>('Efectivo');
    const [isMixedPayment, setIsMixedPayment] = useState<boolean>(false);
    const [paymentDetail, setPaymentDetail] = useState<PaymentLine>({
        method: 'Efectivo',
        amount: 0,
        referencia: '',
        cuentaBancariaId: null,
        tarjetaMarca: '',
        tarjetaTipo: 'Débito',
        tarjetaUltimos4: '',
    });
    const [splitPayments, setSplitPayments] = useState<PaymentLine[]>([
        { method: 'Efectivo', amount: 0 },
        { method: 'Yape', amount: 0 },
    ]);
    const [adelanto, setAdelanto] = useState<number>(0);
    // Método del pago inicial cuando la venta es a crédito con adelanto.
    const [adelantoMetodo, setAdelantoMetodo] = useState<string>('Efectivo');
    const [fechaRecojo, setFechaRecojo] = useState<string>('');
    // Nota de Pedido: si el usuario marca esto, la NP descuenta stock al emitirse.
    // Por defecto false → la NP no toca stock hasta convertirse en comprobante formal.
    const [descontarStockNP, setDescontarStockNP] = useState<boolean>(false);
    const [adelantoError, _setAdelantoError] = useState<string>('');

    // ID del comprobante informal de origen (cuando se convierte NV/Ticket → Formal)
    // Cuando está presente, el backend NO descuenta el stock (ya fue descontado por el informal)
    const [origenComprobanteId, setOrigenComprobanteId] = useState<number | null>(null);

    // Fecha de emisión manual (backdating SUNAT): YYYY-MM-DD, default hoy
    const todayStr = (() => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    })();
    const [fechaEmisionManual, setFechaEmisionManual] = useState<string>(todayStr);

    const initFormValues: IFormInvoice = {
        clienteId: 0,
        currencyCode: "PEN",
        clienteNombre: "",
        comprobante: initialDocumentType,
        tipoDoc: isQuotationRoute ? "COT" : (_stateDefaultType ? (_tipoDocInitMap[_stateDefaultType] ?? '01') : (tipoEmpresa === "INFORMAL" && initialDocumentType === "TICKET" ? "TICKET" : initialDocumentType === "NOTA DE CREDITO" ? "07" : initialDocumentType === "NOTA DE DEBITO" ? "08" : initialDocumentType === "BOLETA" ? "03" : "01")),
        tipoOperacionId: 0,
        detalles: [],
        discount: 0,
        motivo: "",
        relatedInvoiceId: "",
        vuelto: 0,
        tipDocAfectado: "",
        motivoId: 0,
        medioPago: "",
        numDocAfectado: "",
        observaciones: ""
    }

    const initialFormClient: IFormClient = {
        id: 0, nombre: "", nroDoc: "", direccion: "", departamento: "", distrito: "", provincia: "", persona: "CLIENTE", ubigeo: "", email: "", telefono: "", tipoDoc: "", estado: "", tipoDocumentoId: 0, empresaId: 0, tipoDocumento: { codigo: "", descripcion: "", id: 0 }
    }

    const initialFormProduct: IFormProduct = {
        productoId: 0, descripcion: "", categoriaId: 0, precioUnitario: 0, categoriaNombre: "", afectacionNombre: "Gravado – Operación Onerosa", tipoAfectacionIGV: "10", stock: 50, codigo: "", unidadMedidaId: 1, unidadMedidaNombre: "UNIDAD", estado: "", codigoBarras: "", disponibleParaVenta: true
    }

    const [formValuesProduct, setFormValuesProduct] = useState<IFormProduct>(initialFormProduct);
    const [formValuesClient, setFormValuesClient] = useState<IFormClient>(initialFormClient);
    const [formValues, setFormValues] = useState<IFormInvoice>(initFormValues);

    const [selectedProduct, setSelectProduct] = useState<any>(null);
    const [selectedClient, setSelectedClient] = useState<any>(null);
    const [receiptNoteId, setReceiptNoteId] = useState<string>("01")
    const [pay, setPay] = useState<number>(0);
    const [_change, setChange] = useState<number>(0);
    const [receiptNote, setReceiptNote] = useState<string>("FACTURA")
    const [serie, setSerie] = useState<string>("");
    const [IsOpenModalSuccessInvoice, setIsOpenModalSuccessInvoice] = useState<boolean>(false);
    const [isComprobantePendiente, setIsComprobantePendiente] = useState<boolean>(false);
    const [despachoCreado, setDespachoCreado] = useState<boolean>(false);
    const [emittedDataReceipt, setEmittedDataReceipt] = useState<any>(null);
    const [snapshotClient, setSnapshotClient] = useState<any>(null);

    // Coordinación de envío nacional
    const [envioActivo, setEnvioActivo] = useState(false);
    const [envioData, setEnvioData] = useState({
        transportista: '',
        tipoEnvio: 'AGENCIA',
        agenciaDestino: '',
        celularDest: '',
        nroPaquetes: 1,
        turnoEnvio: 'MANANA',
        tipoMercaderia: '',
        claveEnvio: '',
        nroOrden: '',
        claveOrden: '',
        establecimiento: '',
        repartidor: '',
        repartidorId: null as number | null,
        empaquetador: auth?.nombre ?? '',
        observaciones: '',
        fechaEstimada: '',
        costoEnvio: 0,
        pagarFlete: 'CLIENTE' as 'CLIENTE' | 'NEGOCIO',
        aplicacionMontoCliente: 'ADELANTO' as 'ITEM_ENVIO' | 'ADELANTO' | 'NEGOCIO',
        nombreDestinatario: '',
        dniDestinatario: '',
        contenidoPaquete: '',
        montoCOD: 0,
    });
    const [correlative, setCorrelative] = useState<string>("");
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [descountGlobal, _setDescountGlobal] = useState<number>(0)
    const [descuentoPctNV, setDescuentoPctNV] = useState<number>(0)
    const [descuentoSolesNV, setDescuentoSolesNV] = useState<number>(0)
    const [descuentoModoNV, setDescuentoModoNV] = useState<'PCT' | 'SOLES'>('SOLES')
    const [fechaVencimientoCredito, setFechaVencimientoCredito] = useState<string>('')
    const [errors, setErrors] = useState({ observaciones: "" });
    const [errorsProduct, setErrorsProduct] = useState({ codigo: "", descripcion: "", categoriaId: 0, description: "", precioUnitario: "", stock: "", unidadMedida: "" });
    const initialErrorsClient = { nombre: "", nroDoc: "", direccion: "", departamento: "", distrito: "", provincia: "", ubigeo: "", email: "", telefono: "", estado: "", tipoDocumentoId: 0, empresaId: 0 };
    const [errorsClient, setErrorsClient] = useState(initialErrorsClient);

    // DETRACCION STATES
    const [tiposOperacion, setTiposOperacion] = useState<any[]>([]);
    const [tiposDetraccion, setTiposDetraccion] = useState<any[]>([]);
    const [mediosPagoDetraccion, setMediosPagoDetraccion] = useState<any[]>([]);
    const [tipoDetraccionId, setTipoDetraccionId] = useState<number | undefined>(undefined);
    const [medioPagoDetraccionId, setMedioPagoDetraccionId] = useState<number | undefined>(undefined);
    const [cuentaBancoNacion, setCuentaBancoNacion] = useState<string>('');
    const [porcentajeDetraccion, setPorcentajeDetraccion] = useState<number>(0);
    const [montoDetraccion, setMontoDetraccion] = useState<number>(0);
    const [isModalDetraccionOpen, setIsModalDetraccionOpen] = useState<boolean>(false);
    const [isModalCuotasOpen, setIsModalCuotasOpen] = useState<boolean>(false);
    const [cuotas, setCuotas] = useState<Array<{ monto: number; fechaVencimiento: string }>>([]);

    // Retención 3%
    const [isModalRetencionOpen, setIsModalRetencionOpen] = useState(false);
    const [retencionData, setRetencionData] = useState<any>(null);

    const [isOpenModalClient, setIsOpenModalClient] = useState<boolean>(false);
    const [isOpenClientLookupConfirm, setIsOpenClientLookupConfirm] = useState(false);
    const [pendingClientLookup, setPendingClientLookup] = useState<any>(null);
    const [clientLookupConfirmLoading, setClientLookupConfirmLoading] = useState(false);
    const [isOpenModalProduct, setIsOpenModalProduct] = useState<boolean>(false);
    const [editingIndex, setEditingIndex] = useState<number>(-1);

    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(20);

    const [printSize, setPrintSize] = useState(isQuotationRoute ? "A4" : "TICKET");
    const [includeProductImages, setIncludeProductImages] = useState(isQuotationRoute);

    // Quotation-specific states
    const [quotationDiscount, setQuotationDiscount] = useState(0);
    const [quotationValidity, setQuotationValidity] = useState(7);
    const [quotationSignature, setQuotationSignature] = useState('');
    const [quotationTerms, setQuotationTerms] = useState('');
    const [quotationPaymentType, setQuotationPaymentType] = useState('CONTADO');
    const [quotationAdvance, setQuotationAdvance] = useState(0);
    const [quotationCurrency, setQuotationCurrency] = useState('PEN');
    // Producto padre cuyo selector de variantes (talla/color) está abierto en el POS
    const [varianteModalProduct, setVarianteModalProduct] = useState<any>(null);
    const [isQuotationConfigModalOpen, setIsQuotationConfigModalOpen] = useState(false);
    const [hasOpenedConfigModal, setHasOpenedConfigModal] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [editQuotationId, setEditQuotationId] = useState<number | null>(null);
    const [editNotaVentaId, setEditNotaVentaId] = useState<number | null>(null);
    const [showFreeQuoteItemForm, setShowFreeQuoteItemForm] = useState(false);
    const [freeQuoteItem, setFreeQuoteItem] = useState(crearEstadoItemLibre);
    // Anticipos previos a regularizar/descontar en esta factura (referencia a
    // comprobantes de anticipo ya emitidos). Se envían en el payload como `anticipos[]`
    // y el backend genera el UBL de regularización (PrepaidPayment + descuento 04/05/06).
    const [anticipos, setAnticipos] = useState<Array<{ tipoDoc: string; serie: string; numero: string; monto: number; fecha?: string }>>([]);
    const agregarAnticipo = (a: { tipoDoc: string; serie: string; numero: string; monto: number; fecha?: string }) => {
        const serie = cleanText(a.serie).toUpperCase();
        const numero = cleanText(a.numero);
        const monto = Number(a.monto);
        if (!serie || !numero) return useAlertStore.getState().alert("Serie y número del anticipo son obligatorios", "warning");
        if (!Number.isFinite(monto) || monto <= 0) return useAlertStore.getState().alert("El monto del anticipo debe ser mayor a cero", "warning");
        setAnticipos((prev) => [...prev, { tipoDoc: a.tipoDoc || '01', serie, numero, monto, ...(a.fecha ? { fecha: a.fecha } : {}) }]);
    };
    const eliminarAnticipo = (index: number) => setAnticipos((prev) => prev.filter((_, i) => i !== index));
    const totalAnticipos = anticipos.reduce((sum, a) => sum + Number(a.monto || 0), 0);

    const debounceSerie = useDebounce(serie, 200);
    const debounceCorrelative = useDebounce(correlative, 200);
    const debouncedSearchTerm = useDebounce(searchTerm, 300);

    // Load Masters
    useEffect(() => {
        const loadMasters = async () => {
            try {
                const [rOps, rDet, rMed]: any[] = await Promise.all([
                    get('comprobante/tipo-operacion'),
                    get('comprobante/tipos-detraccion'),
                    get('comprobante/medios-pago-detraccion'),
                ]);
                const opsData = (rOps && Array.isArray(rOps)) ? rOps : (rOps?.data || []);
                if (Array.isArray(opsData)) {
                    setTiposOperacion(opsData);
                    if ((formValues.tipoOperacionId ?? 0) === 0 && !["NOTA DE CREDITO", "NOTA DE DEBITO"].includes(formValues.comprobante)) {
                        const ventaInterna = opsData.find((op: any) => op.codigo === '0101');
                        if (ventaInterna) setFormValues(prev => ({ ...prev, tipoOperacionId: ventaInterna.id }));
                    }
                }
                setTiposDetraccion((rDet && Array.isArray(rDet)) ? rDet : (rDet?.data || []));
                setMediosPagoDetraccion((rMed && Array.isArray(rMed)) ? rMed : (rMed?.data || []));
            } catch (e) { console.error(e); }
        };
        loadMasters();
    }, [formValues.comprobante]);

    useEffect(() => {
        setDescuentoPctNV(0);
        setDescuentoSolesNV(0);
        setDescuentoModoNV('SOLES');
    }, [formValues.tipoDoc]);

    // Pagination calculations
    const totalPages = Math.ceil((totalProducts || 0) / limit);
    const pages = [];
    for (let i = 1; i <= totalPages; i++) pages.push(i);
    const indexOfLastItem = page * limit;
    const indexOfFirstItem = indexOfLastItem - limit;

    useEffect(() => { setPage(1) }, [selectedCategoryId, debouncedSearchTerm]);

    // Server Fetch Logic
    useEffect(() => {
        const params: any = { page, limit, soloVendibles: true, usarPrecioSede: true };
        if (debouncedSearchTerm) params.search = debouncedSearchTerm;
        if (selectedCategoryId !== 0) params.categoriaId = selectedCategoryId;
        if (sedeActiva?.id) params.sedeId = sedeActiva.id;

        if (!usaLotesFarmacia) {
            getAllProducts(params, () => { }, true);
        }
    }, [page, limit, debouncedSearchTerm, selectedCategoryId, sedeActiva?.id, usaLotesFarmacia]);

    // Farmacia: catálogo con FEFO (reemplaza getAllProducts para rubros regulados)
    useEffect(() => {
        if (!usaLotesFarmacia) return;
        let cancelled = false;
        setFarmaciaLoading(true);
        const params = new URLSearchParams({ page: String(page), limit: String(limit) });
        if (sedeActiva?.id) params.set('sedeId', String(sedeActiva.id));
        if (debouncedSearchTerm) params.set('search', debouncedSearchTerm);
        if (selectedCategoryId !== 0) params.set('categoriaId', String(selectedCategoryId));
        get(`productos/catalogo-farmacia?${params.toString()}`)
            .then((resp: any) => {
                if (cancelled) return;
                setFarmaciaProductos(resp?.data?.productos ?? []);
                setFarmaciaTotal(resp?.data?.total ?? 0);
            })
            .catch(() => {})
            .finally(() => { if (!cancelled) setFarmaciaLoading(false); });
        return () => { cancelled = true; };
    }, [page, limit, debouncedSearchTerm, selectedCategoryId, sedeActiva?.id, usaLotesFarmacia]);

    const filteredCombos = useMemo(() => {
        const search = String(debouncedSearchTerm || '').trim().toLowerCase();

        return (combos || []).filter((combo: any) => {
            if (!combo?.activo) return false;

            const matchesSearch = !search
                || String(combo?.nombre || '').toLowerCase().includes(search)
                || String(combo?.descripcion || '').toLowerCase().includes(search)
                || (combo?.items || []).some((item: any) =>
                    String(item?.producto?.descripcion || '').toLowerCase().includes(search),
                );

            if (!matchesSearch) return false;

            if (selectedCategoryId === 0) return true;

            return (combo?.items || []).some((item: any) => Number(item?.producto?.categoria?.id || 0) === Number(selectedCategoryId));
        });
    }, [combos, debouncedSearchTerm, selectedCategoryId]);

    const catalogItems = useMemo(() => {
        const sourceProductos = usaLotesFarmacia ? farmaciaProductos : products;
        const itemsProductos = (sourceProductos || []).map((product: any) => ({ ...product, __catalogType: 'PRODUCTO' }));
        const itemsCombos = filteredCombos.map((combo: any) => ({ ...combo, __catalogType: 'COMBO' }));
        return [...itemsCombos, ...itemsProductos];
    }, [products, farmaciaProductos, filteredCombos, usaLotesFarmacia]);

    // Initial Data Fetching for POS
    useEffect(() => {
        getAllCategories({});
        fetchCombos(false);
        getCreditDebitNoteTypes();
        getCurrencies();
        getDocumentTypes();

        if (receipt === undefined) {
            resetInvoice();
        }
    }, [])

    useEffect(() => {
        const state = location.state as any;
        const defaultType = state?.defaultType as string | undefined;
        const defaultClient = state?.defaultClient as string | undefined;

        if (defaultType && !isQuotationRoute) {
            const tipoDocMap: Record<string, string> = {
                'FACTURA': '01', 'BOLETA': '03',
                'TICKET': 'TICKET', 'NP': 'NP', 'OT': 'OT',
                'NV': 'NV', 'RH': 'RH', 'CP': 'CP',
                'NOTA DE PEDIDO': 'NP',
            };

            const comprobanteLabelMap: Record<string, string> = {
                NP: 'NOTA DE PEDIDO',
                NV: 'NOTA DE VENTA',
                TICKET: 'TICKET',
                OT: 'ORDEN DE TRABAJO',
                RH: 'RECIBO POR HONORARIO',
                CP: 'COMPROBANTE DE PAGO',
            };

            const resolvedComprobante = comprobanteLabelMap[defaultType] ?? defaultType;

            setFormValues(prev => ({
                ...prev,
                comprobante: resolvedComprobante,
                tipoDoc: tipoDocMap[defaultType] ?? '01',
            }));

            if (defaultClient === 'CLIENTES_VARIOS') {
                const clientSelect: any = clients?.find((item: any) => "10000000" === item.nroDoc);
                if (clientSelect) {
                    setSelectedClient(clientSelect);
                    setFormValues(prev => ({
                        ...prev,
                        clienteId: Number(clientSelect.id) || 0,
                        clienteNombre: "CLIENTES VARIOS"
                    }));
                } else {
                    setSelectedClient({ nroDoc: "10000000", nombre: "CLIENTES VARIOS" });
                    setFormValues(prev => ({
                        ...prev,
                        clienteId: 0,
                        clienteNombre: "CLIENTES VARIOS"
                    }));
                }
            }
            return;
        }

        const newComprobante = isQuotationRoute
            ? "COTIZACIÓN"
            : (tipoEmpresa === "INFORMAL" ? "TICKET" : "FACTURA");

        const newTipoDoc = isQuotationRoute
            ? "COT"
            : (tipoEmpresa === "INFORMAL" ? "TICKET" : "01");

        setFormValues(prev => ({
            ...prev,
            comprobante: newComprobante,
            tipoDoc: newTipoDoc
        }));
    }, [isQuotationRoute, tipoEmpresa]);

    useEffect(() => {
        if (isQuotationRoute) {
            setPrintSize("A4");
        } else {
            setPrintSize("TICKET");
        }
    }, [isQuotationRoute]);

    // Loading from Quotation Convert / Edit
    useEffect(() => {
        const state = location.state as any;
        if (state?.fromQuotation && state?.quotationData) {
            const { cliente, productos, observaciones, ...cotizConfig } = state.quotationData;

            if (cliente) {
                // Set inmediato con lo que trae la cotización (parcial).
                setSelectedClient(cliente);
                setFormValues(prev => ({
                    ...prev,
                    clienteId: cliente.id,
                    clienteNombre: `${cliente.nroDoc}-${cliente.nombre}`
                }));
                // Recargar el cliente COMPLETO por su id para traer tipoDocumento
                // (RUC/DNI), dirección y ubigeo — el listado de cotizaciones no los incluye.
                if (cliente.id) {
                    get(`clientes/${cliente.id}`).then((resp: any) => {
                        const full = resp?.data;
                        if (full) {
                            setSelectedClient(full);
                            setFormValues(prev => ({
                                ...prev,
                                clienteId: full.id,
                                clienteNombre: `${full.nroDoc}-${full.nombre}`,
                            }));
                        }
                    }).catch(() => { /* se queda con el parcial */ });
                }
            }
            if (productos && Array.isArray(productos)) {
                const productosConvertidos = productos.map((det: any) => {
                    const prodId = det.producto?.id || det.productoId;
                    const productoEnCatalogo = products && Array.isArray(products)
                        ? products.find((p: any) => p.id === prodId)
                        : null;
                    const mapped = mapDetalleToInvoiceProduct({
                        ...det,
                        producto: det.producto || productoEnCatalogo,
                    });

                    return {
                        ...mapped,
                        id: prodId || mapped.productoId,
                        productoId: prodId || mapped.productoId,
                        descripcion: det.descripcion || mapped.descripcion,
                        cantidad: det.cantidad,
                        precioUnitario: det.mtoPrecioUnitario || mapped.precioUnitario,
                        descuento: 0,
                        unidad: det.unidad || mapped.unidad,
                        imagenUrl: mapped.imagenUrl || productoEnCatalogo?.imagenUrl || null,
                    };
                });
                resetProductInvoice();
                productosConvertidos.forEach(prod => addProductsInvoice(prod));
            }

            if (observaciones) {
                setFormValues(prev => ({ ...prev, observaciones }));
            }

            if (state.isEdit && state.quotationId) {
                setIsEditMode(true);
                setEditQuotationId(state.quotationId);
                setHasOpenedConfigModal(true); // evita que el modal de config se abra automáticamente
                if (cotizConfig.cotizIncluirImagenes !== undefined) setIncludeProductImages(cotizConfig.cotizIncluirImagenes);
                if (cotizConfig.cotizDescuento !== undefined) setQuotationDiscount(cotizConfig.cotizDescuento);
                if (cotizConfig.cotizVigencia !== undefined) setQuotationValidity(cotizConfig.cotizVigencia);
                if (cotizConfig.cotizFirmante !== undefined) setQuotationSignature(cotizConfig.cotizFirmante);
                if (cotizConfig.cotizTerminos !== undefined) setQuotationTerms(cotizConfig.cotizTerminos);
                if (cotizConfig.cotizTipoPago !== undefined) setQuotationPaymentType(cotizConfig.cotizTipoPago);
                if (cotizConfig.cotizAdelanto !== undefined) setQuotationAdvance(cotizConfig.cotizAdelanto);
                if (cotizConfig.cotizMoneda !== undefined) setQuotationCurrency(cotizConfig.cotizMoneda);
            }

            window.history.replaceState({}, document.title);
        } else if (state?.fromCreditNote && state?.creditNoteData) {
            const { comprobanteReemplazar, serieReemplazar, correlativoReemplazar } = state.creditNoteData;

            // Setear la Nota de Crédito directamente
            setFormValues(prev => ({
                ...prev,
                comprobante: "NOTA DE CREDITO",
                tipoDoc: "07",
                motivoId: 1 // 1: Anulación de la operación
            }));

            // Preelegir si afecta a Factura o Boleta
            setReceiptNoteId(comprobanteReemplazar === 'FACTURA' ? '01' : '03');

            // Prellenar serie y correlativo a buscar con timeout para evitar el reset por useEffect
            setTimeout(() => {
                setSerie(serieReemplazar);
                setCorrelative(correlativoReemplazar);
                // Llamar automáticamente a la búsqueda del documento
                getInvoiceBySerieCorrelative(serieReemplazar, correlativoReemplazar, 1);
            }, 500);

            window.history.replaceState({}, document.title);
        } else if (state?.guiaRemision) {
            const { guiaRemision } = state;
            const guiaKey = `${guiaRemision.serie}-${guiaRemision.correlativo}`;

            if (processedGuiaRef.current !== guiaKey) {
                processedGuiaRef.current = guiaKey;

                // 1. Cliente
                const newClient = {
                    id: guiaRemision.clienteId || 0,
                    nombre: guiaRemision.destinatarioRazonSocial,
                    nroDoc: guiaRemision.destinatarioNumDoc,
                    direccion: guiaRemision.llegadaDireccion || "",
                    departamento: "", distrito: "", provincia: "", persona: "CLIENTE",
                    ubigeo: guiaRemision.llegadaUbigeo || "",
                    email: "", telefono: "", tipoDoc: guiaRemision.destinatarioTipoDoc,
                    estado: "ACTIVO", tipoDocumentoId: parseInt(guiaRemision.destinatarioTipoDoc) || 6,
                    empresaId: auth?.empresa?.id || 0,
                    tipoDocumento: { codigo: guiaRemision.destinatarioTipoDoc, descripcion: "", id: parseInt(guiaRemision.destinatarioTipoDoc) || 6 }
                };
                setSelectedClient(newClient);
                setFormValuesClient(newClient as any);
                setFormValues(prev => ({
                    ...prev,
                    clienteId: newClient.id,
                    clienteNombre: `${newClient.nroDoc}-${newClient.nombre}`
                }));

                // 2. Observaciones (Referencia a la guía)
                const refText = `Guía de Remisión relacionada: ${guiaRemision.serie}-${guiaRemision.correlativo}`;
                setFormValues(prev => ({
                    ...prev,
                    observaciones: prev.observaciones ? `${prev.observaciones}\n${refText}` : refText
                }));

                // 3. Productos (Detalles)
                if (guiaRemision.detalles && Array.isArray(guiaRemision.detalles)) {
                    resetProductInvoice();
                    guiaRemision.detalles.forEach((d: any) => {
                        addProductsInvoice({
                            productoId: d.productoId || 0,
                            descripcion: d.descripcion,
                            categoriaId: 1,
                            precioUnitario: 0,
                            categoriaNombre: "General",
                            afectacionNombre: "Gravado – Operación Onerosa",
                            tipoAfectacionIGV: "10",
                            stock: 999,
                            codigo: d.codigoProducto,
                            unidadMedidaId: 1,
                            unidadMedidaNombre: d.unidadMedida || "NIU",
                            estado: "ACTIVO",
                            codigoBarras: "",
                            cantidadToInvoice: d.cantidad,
                            discount: 0,
                            cantidad: d.cantidad,
                            precioBase: 0,
                            atributosTecnicos: d.producto?.atributosTecnicos || undefined,
                        } as any);
                    });

                    setTimeout(() => {
                        useAlertStore.getState().alert("Guía cargada. Por favor, asigne los precios unitarios a los productos.", "info");
                    }, 500);
                }
            }

            window.history.replaceState({}, document.title);
        } else if (state?.fromPedidoTienda && state?.pedidoTiendaData) {
            const pedido = state.pedidoTiendaData;
            const pedidoKey = `pedido-tienda-${pedido.id}-${state.defaultType || ''}`;

            if (processedPedidoTiendaRef.current !== pedidoKey) {
                processedPedidoTiendaRef.current = pedidoKey;

                const clienteVarios = clients?.find((item: any) => item.nroDoc === '10000000');
                const cliente = clienteVarios || {
                    id: 0,
                    nombre: pedido.clienteNombre || 'CLIENTES VARIOS',
                    nroDoc: '10000000',
                    direccion: pedido.clienteDireccion || '',
                    telefono: pedido.clienteTelefono || '',
                    tipoDoc: '1',
                    tipoDocumentoId: 1,
                    estado: 'ACTIVO',
                };

                setSelectedClient(cliente);
                setFormValuesClient(cliente as any);
                setFormValues(prev => ({
                    ...prev,
                    clienteId: Number(cliente.id) || 0,
                    clienteNombre: `${cliente.nroDoc}-${cliente.nombre}`,
                    observaciones: [
                        prev.observaciones,
                        `Pedido tienda: ${pedido.codigoSeguimiento}`,
                        pedido.tipoEntrega === 'ENVIO' ? `Entrega: ${pedido.clienteDireccion || 'por coordinar'}` : 'Recojo en tienda',
                    ].filter(Boolean).join('\n'),
                }));

                if (Array.isArray(pedido.items) && pedido.items.length > 0) {
                    resetProductInvoice();
                    pedido.items.forEach((item: any) => {
                        addProductsInvoice({
                            productoId: item.productoId || item.producto?.id || 0,
                            id: item.productoId || item.producto?.id || 0,
                            descripcion: item.producto?.descripcion || item.descripcion || 'Producto',
                            codigo: item.producto?.codigo || '',
                            cantidad: Number(item.cantidad || 1),
                            cantidadToInvoice: Number(item.cantidad || 1),
                            precioUnitario: Number(item.precioUnit || item.precioUnitario || 0),
                            descuento: 0,
                            unidadMedidaId: 1,
                            unidadMedidaNombre: 'NIU',
                            afectacionNombre: 'Gravado – Operación Onerosa',
                            tipoAfectacionIGV: '10',
                            stock: 999,
                            estado: 'ACTIVO',
                            atributosTecnicos: item.producto?.atributosTecnicos || undefined,
                        } as any);
                    });
                }
            }

            window.history.replaceState({}, document.title);
        } else if (state?.fromNotaDeVenta && state?.notaDeVentaData) {
            const { cliente, clienteId, productos, observaciones, origenComprobanteId } = state.notaDeVentaData;
            if (origenComprobanteId) setOrigenComprobanteId(Number(origenComprobanteId));

            // Modo EDICIÓN de una NV existente (in-place): guardamos el id a editar
            // y precargamos el vendedor de campo para que no se pierda al editar
            // (se muestra seleccionado si la empresa usa "cobranza en campo").
            if (state.isEditNV && state.notaVentaId) {
                setIsEditMode(true);
                setEditNotaVentaId(Number(state.notaVentaId));
                const nvData = state.notaDeVentaData || {};
                const vcId = nvData.vendedorCampoId;
                if (vcId != null) setVendedorCampoId(Number(vcId));

                // Precargar el PAGO que tenía la nota: método (o Pago Mixto) y el monto
                // ya pagado, para que el modal de pago aparezca con lo mismo seleccionado.
                const METODOS_LABEL: Record<string, string> = {
                    EFECTIVO: 'Efectivo', YAPE: 'Yape', PLIN: 'Plin',
                    TRANSFERENCIA: 'Transferencia', TARJETA: 'Tarjeta',
                };
                const normMetodo = (m?: string) => METODOS_LABEL[String(m || '').toUpperCase()] || 'Efectivo';
                let pd = nvData.paymentDetails;
                if (typeof pd === 'string') { try { pd = JSON.parse(pd); } catch { pd = null; } }
                const pagado = Math.max(0, Number(nvData.mtoImpVenta || 0) - Number(nvData.saldo || 0));

                if (pd && (pd.mode === 'MIXTO' || Array.isArray(pd.splitPayments))) {
                    const lineas = (pd.splitPayments || [])
                        .filter((l: any) => Number(l?.amount || 0) > 0)
                        .map((l: any) => ({
                            method: normMetodo(l.method),
                            amount: Number(l.amount || 0),
                            referencia: l.referencia || undefined,
                            cuentaBancariaId: l.cuentaBancariaId ?? null,
                        }));
                    if (lineas.length > 0) {
                        setIsMixedPayment(true);
                        setSplitPayments(lineas);
                    }
                } else {
                    setIsMixedPayment(false);
                    setPaymentMethod(normMetodo(nvData.medioPago));
                    if (pagado > 0) setPay(pagado);
                }

                // Descuento global (S/) que tenía la nota.
                const descNota = Number(nvData.mtoDescuentoGlobal || 0);
                if (descNota > 0) {
                    setDescuentoModoNV('SOLES');
                    setDescuentoSolesNV(descNota);
                    setDescuentoPctNV(0);
                }

                // Condición de pago: si fue a CRÉDITO, seleccionar Crédito y precargar
                // la fecha de vencimiento, las cuotas y el pago inicial (si hubo).
                if (String(nvData.formaPagoTipo || '').toUpperCase() === 'CREDITO') {
                    setFormValues(prev => ({ ...prev, medioPago: 'Crédito' }));
                    if (nvData.fechaVencimientoCredito) {
                        setFechaVencimientoCredito(String(nvData.fechaVencimientoCredito).slice(0, 10));
                    }
                    let cuotasNota = nvData.cuotas;
                    if (typeof cuotasNota === 'string') { try { cuotasNota = JSON.parse(cuotasNota); } catch { cuotasNota = null; } }
                    if (Array.isArray(cuotasNota) && cuotasNota.length > 0) {
                        setCuotas(cuotasNota.map((c: any) => ({
                            monto: Number(c.monto || 0),
                            fechaVencimiento: String(c.fechaVencimiento || '').slice(0, 10),
                        })));
                    }
                    // Pago inicial ya abonado en un crédito (parcial).
                    if (pagado > 0) {
                        setAdelanto(pagado);
                        setAdelantoMetodo(normMetodo(nvData.medioPago));
                    }
                }
            }

            if (cliente) {
                // Importante: el ref debe apuntar al comprobante DESTINO (FACTURA/BOLETA
                // vía state.defaultType), no a formValues.comprobante — que todavía tiene
                // el valor previo del render (setFormValues del defaultType aún no se
                // aplicó). Si se usa el valor stale, el effect de reset lo interpreta como
                // "cambió de comprobante" y borra el cliente recién seteado.
                // defaultType para conversión de NV es 'FACTURA' o 'BOLETA' (labels que
                // coinciden con el comprobante final), así que se usa directo.
                fromNVComprobanteRef.current = (state?.defaultType as string) || formValues.comprobante;
                setSelectedClient(cliente);
                setFormValuesClient(cliente as any);
                setFormValues(prev => ({
                    ...prev,
                    clienteId: clienteId || cliente.id || 0,
                    clienteNombre: `${cliente.nroDoc}-${cliente.nombre}`
                }));
            }

            if (productos && Array.isArray(productos) && productos.length > 0) {
                resetProductInvoice();
                productos.forEach((d: any) => {
                    const mapped = mapDetalleToInvoiceProduct(d);
                    addProductsInvoice({
                        ...mapped,
                        productoId: d.productoId || mapped.productoId || 0,
                        descripcion: d.descripcion || mapped.descripcion,
                        cantidadInicial: d.cantidad || mapped.cantidad,
                        precioUnitario: d.precioUnitario || mapped.precioUnitario,
                        descuento: 0,
                        unidadMedidaNombre: d.unidad || mapped.unidadMedidaNombre || 'NIU',
                        afectacionNombre: 'Gravado – Operación Onerosa',
                        tipoAfectacionIGV: '10',
                        stock: mapped.stock || 999,
                        estado: 'ACTIVO',
                        atributosTecnicos: mapped.atributosTecnicos || d.producto?.atributosTecnicos || undefined,
                    });
                });
            }

            if (observaciones) {
                setFormValues(prev => ({ ...prev, observaciones }));
            }

            window.history.replaceState({}, document.title);
        }
    }, [location]);

    useEffect(() => {
        if (["NOTA DE CREDITO", "NOTA DE DEBITO"].includes(formValues?.comprobante)) {
            getSerieAndCorrelativeByReceipt(auth?.empresa?.id, formValues?.tipoDoc, receiptNoteId);
        } else {
            setSerie("");
            setCorrelative("");
            getSerieAndCorrelativeByReceipt(auth?.empresa?.id, formValues?.tipoDoc);

            const ventaInterna = tiposOperacion.find((op: any) => op.codigo === '0101');
            if (ventaInterna && (formValues.comprobante === "BOLETA" || formValues.comprobante === "NOTA DE PEDIDO")) {
                setFormValues(prev => ({ ...prev, tipoOperacionId: ventaInterna.id }));
            }

            if (fromNVComprobanteRef.current !== null) {
                if (fromNVComprobanteRef.current !== formValues.comprobante) {
                    // User switched comprobante away from the NV one — clear flag and allow normal reset
                    fromNVComprobanteRef.current = null;
                } else {
                    // Still on the same comprobante that came from NV — preserve client, skip reset
                }
            }

            if (fromNVComprobanteRef.current === null) {
                if (LABELS_CLIENTES_VARIOS.includes(formValues?.comprobante)) {
                    const clienteActual = formValues.clienteNombre?.trim() ?? "";
                    const tieneClienteEspecifico = clienteActual !== "" && clienteActual !== "CLIENTES VARIOS";
                    if (!tieneClienteEspecifico) {
                        const clientSelect: any = clientsRef.current?.find((item: any) => "10000000" === item.nroDoc);
                        if (clientSelect) {
                            setSelectedClient(clientSelect)
                            setFormValues(prev => ({ ...prev, clienteId: Number(clientSelect.id) || 0, clienteNombre: "CLIENTES VARIOS" }))
                        } else {
                            setSelectedClient({ nroDoc: "10000000", nombre: "CLIENTES VARIOS" })
                            setFormValues(prev => ({ ...prev, clienteId: 0, clienteNombre: "CLIENTES VARIOS" }))
                        }
                    }
                } else if (formValues?.comprobante === "FACTURA") {
                    setFormValues(prev => ({ ...prev, clienteId: 0, clienteNombre: "" }))
                    setSelectedClient(null);
                }
            }
        }
    }, [formValues.comprobante, receiptNoteId, tiposOperacion]);

    let comprobantesGenerar = isQuotationRoute
        ? tiposCotizacion
        : (tipoEmpresa === "INFORMAL" ? tiposComprobantesInformales : tipoEmpresa === "FORMAL" ? tiposComprobanteFormales : tiposComprobanteFormales.concat(tiposComprobantesInformales))

    useEffect(() => {
        if (!formValues.currencyCode) setFormValues({ ...formValues, currencyCode: "PEN" })
    }, [])

    useEffect(() => {
        if (isQuotationRoute && !hasOpenedConfigModal) {
            setIsQuotationConfigModalOpen(true);
            setHasOpenedConfigModal(true);
        }
    }, [isQuotationRoute, hasOpenedConfigModal]);

    // Product Adding logic

    const normalizeWholesaleUnitPrice = (basePrice: number, rule: { cantidadMinima: number; precio: number }) => {
        const minQty = Number(rule.cantidadMinima);
        const rulePrice = Number(rule.precio);

        if (!Number.isFinite(rulePrice) || rulePrice <= 0) return basePrice;
        if (Number.isFinite(basePrice) && basePrice > 0 && minQty > 1 && rulePrice > basePrice) {
            return Number((rulePrice / minQty).toFixed(6));
        }
        return rulePrice;
    };

    // Tipo de cambio del día (venta). Se usa para convertir a soles los productos en dólares
    // al agregarlos al carrito. El comprobante siempre se emite en soles (PEN).
    const [tcVenta, setTcVenta] = useState<number | null>(null);
    useEffect(() => {
        tipoCambioService
            .consultar()
            .then((tc) => setTcVenta(Number(tc?.venta) || null))
            .catch(() => setTcVenta(null));
    }, []);

    const getApplicablePrice = (item: any, qty: number): number => {
        const base = Number(item.precioBase ?? item.precioUnitario ?? 0);
        if (!Number.isFinite(base) || base <= 0) return 0;

        const parsedQty = Number(qty);
        if (!Number.isFinite(parsedQty) || parsedQty <= 0) return base;

        const rules = (item.preciosMayorista ?? [])
            .map((r: { cantidadMinima: number; precio: number }) => ({
                cantidadMinima: Number(r.cantidadMinima),
                precioUnitario: normalizeWholesaleUnitPrice(base, r),
            }))
            .filter((r: { cantidadMinima: number; precioUnitario: number }) =>
                Number.isFinite(r.cantidadMinima) &&
                r.cantidadMinima > 0 &&
                Number.isFinite(r.precioUnitario) &&
                r.precioUnitario > 0,
            );

        if (!rules.length) return base;

        const applicable = rules
            .filter((r: { cantidadMinima: number; precioUnitario: number }) => parsedQty >= r.cantidadMinima)
            .sort((a: { cantidadMinima: number }, b: { cantidadMinima: number }) => b.cantidadMinima - a.cantidadMinima)[0];

        return applicable ? applicable.precioUnitario : base;
    };

    const calculateLineItem = (item: any, newQuantity: number) => {
        const price = getApplicablePrice(item, newQuantity);
        const subtotal = price * newQuantity;
        return {
            cantidad: newQuantity,
            cantidadOriginal: newQuantity,
            precioUnitario: price,
            total: subtotal.toFixed(2),
            sale: (subtotal / 1.18).toFixed(2),
            igv: (subtotal - subtotal / 1.18).toFixed(2)
        };
    };

    const getCartQtyByProductId = (productoId: number) =>
        productsInvoice
            .filter((item: any) => Number(item?.productoId || item?.id) === productoId)
            .reduce((acc: number, item: any) => acc + Number(item?.cantidad || 0), 0);

    const mergeOrAddProductToCart = (product: any, quantityToAdd: number, unitPrice: number, origin: string) => {
        const existingIndex = productsInvoice.findIndex((p: any) => Number(p?.productoId || p?.id) === Number(product.id));

        if (existingIndex >= 0) {
            const currentItem = productsInvoice[existingIndex];
            const currentQty = Number(currentItem?.cantidad || 0);
            const newQty = currentQty + quantityToAdd;
            const weightedUnitPrice = Number((((Number(currentItem?.precioUnitario || 0) * currentQty) + (unitPrice * quantityToAdd)) / newQty).toFixed(6));
            const subtotal = weightedUnitPrice * newQty;

            updateProductInvoice(existingIndex, {
                cantidad: newQty,
                cantidadOriginal: newQty,
                precioUnitario: weightedUnitPrice,
                precioBase: weightedUnitPrice,
                preciosMayorista: [],
                precioOrigen: origin,
                total: subtotal.toFixed(2),
                sale: (subtotal / 1.18).toFixed(2),
                igv: (subtotal - subtotal / 1.18).toFixed(2),
            });
            return;
        }

        addProductsInvoice({
            ...product,
            productoId: product.id,
            precioBase: unitPrice,
            precioUnitario: unitPrice,
            precioOrigen: origin,
            preciosMayorista: [],
            cantidadInicial: quantityToAdd,
            unidadMedida: product?.unidadMedida?.nombre || product?.unidadMedida || 'NIU',
        });
    };

    const distribuirPrecioCombo = (combo: any) => {
        const comboItems = Array.isArray(combo?.items) ? combo.items : [];
        const totalCombo = Number(combo?.precioCombo || 0);
        const totalBase = comboItems.reduce((sum: number, item: any) => {
            const base = Number(item?.producto?.precioUnitario || 0);
            const qty = Number(item?.cantidad || 0);
            return sum + (base * qty);
        }, 0);

        let acumulado = 0;
        return comboItems.map((item: any, index: number) => {
            const qty = Number(item?.cantidad || 0);
            const producto = item?.producto;
            const valorBaseLinea = Number(producto?.precioUnitario || 0) * qty;

            let targetLineTotal = 0;
            if (index === comboItems.length - 1) {
                targetLineTotal = Number((totalCombo - acumulado).toFixed(2));
            } else if (totalBase > 0) {
                targetLineTotal = Number(((valorBaseLinea / totalBase) * totalCombo).toFixed(2));
                acumulado += targetLineTotal;
            } else {
                targetLineTotal = Number((totalCombo / Math.max(comboItems.length, 1)).toFixed(2));
                acumulado += targetLineTotal;
            }

            const unitPrice = qty > 0 ? Number((targetLineTotal / qty).toFixed(6)) : 0;
            return { producto, qty, unitPrice };
        });
    };

    const handleComboClick = (combo: any) => {
        if (!combo?.items?.length) {
            return useAlertStore.getState().alert("El kit no tiene productos configurados", "warning");
        }

        for (const comboItem of combo.items) {
            const producto = comboItem?.producto;
            const qtyRequerida = Number(comboItem?.cantidad || 0);
            if (!producto || qtyRequerida <= 0) {
                return useAlertStore.getState().alert("El kit tiene productos inválidos", "warning");
            }

            const qtyActualEnCarrito = getCartQtyByProductId(Number(producto.id));
            const stockDisponible = Number(producto?.stock || 0);
            // Los servicios no tienen stock: solo se valida stock para productos físicos.
            if (!permitirVentaSinStock && !esServicioTecnico(producto) && qtyActualEnCarrito + qtyRequerida > stockDisponible) {
                return useAlertStore.getState().alert(
                    `Stock insuficiente para ${String(producto.descripcion || "producto").toUpperCase()} al agregar el kit`,
                    "warning",
                );
            }
        }

        const lineasDistribuidas = distribuirPrecioCombo(combo);
        lineasDistribuidas.forEach((linea: any) => {
            mergeOrAddProductToCart(
                linea.producto,
                Number(linea.qty),
                Number(linea.unitPrice),
                `KIT:${String(combo?.nombre || "").toUpperCase()}`,
            );
        });

        useAlertStore.getState().alert(`Kit "${String(combo?.nombre || "").toUpperCase()}" agregado al comprobante`, "success");
    };

    const handleProductClick = (product: any) => {
        // ── Variantes (talla/color) ───────────────────────────────────────────
        // Si el producto tiene variantes activas y aún no se eligió una, abrir el
        // selector. Al elegir, handleSelectVariante re-inyecta la variante (que es
        // un producto real) por este mismo flujo, reutilizando toda la lógica.
        if (
            !product?.__esVariante &&
            Array.isArray(product?.variantes) &&
            product.variantes.some(
                (v: any) => String(v?.estado || 'ACTIVO').toUpperCase() === 'ACTIVO',
            )
        ) {
            setVarianteModalProduct(product);
            return;
        }

        const esServicio = esServicioTecnico(product);
        // Farmacia: el stock siempre viene de lotes activos (FEFO/trazabilidad)
        if (!esServicio && usaLotesFarmacia) {
            const loteFefo = product?.loteFefo;
            if (!loteFefo) {
                if (product?.tieneLotesVencidos) {
                    return useAlertStore.getState().alert(
                        `${String(product?.descripcion || 'Este producto').toUpperCase()} solo tiene lotes VENCIDOS. No se puede vender medicación vencida — registra un lote vigente en Kardex.`,
                        "error",
                    );
                }
                return useAlertStore.getState().alert("Este producto no tiene lotes registrados. Ingresa un lote en Kardex antes de vender.", "warning");
            }
            if (loteFefo.diasAlVencimiento !== null && loteFefo.diasAlVencimiento < 0) {
                return useAlertStore.getState().alert(`El lote ${loteFefo.loteNumero} está vencido`, "error");
            }
        }

        // Fraccionamiento
        const factorConversion = Number(product?.factorConversion ?? 1);
        const tieneFraccionamiento = isFarmaciaRetail && factorConversion > 1;
        const modoActual = tieneFraccionamiento
            ? (modoFraccionPorProducto[product.id] ?? 'CAJA')
            : 'CAJA';
        const vendePorUnidad = tieneFraccionamiento && modoActual === 'UNIDAD';

        const fraccionExtra = tieneFraccionamiento
            ? {
                unidadSeleccionada: modoActual,
                unidadVentaNombre: vendePorUnidad
                    ? (product?.unidadVenta || 'UNIDAD')
                    : (product?.unidadCompra || product?.unidadMedida?.nombre || 'UNIDAD'),
                factorConversion,
            }
            : {};
        const unidadMedidaNombre = (fraccionExtra as any).unidadVentaNombre ?? (product?.unidadMedida?.nombre ?? product?.unidadCodigo);

        // ── Multi-lote FEFO: una línea de carrito por lote ─────────────────────
        // Cuando usarPrecioLoteFefo está activo y el producto tiene lotes con costoUnitario,
        // cada lote genera su propia línea en el comprobante con su precio real.
        if (!esServicio && usarPrecioLoteFefo && (product?.lotesDisponibles?.length ?? 0) > 0) {
            type LoteDisponible = { loteId: number; loteNumero: string; stockActual: number; costoUnitario: number | null; fechaVencimiento: string };
            const lotesActivos = [...(product.lotesDisponibles as LoteDisponible[])]
                .filter((l) => l.stockActual > 0)
                .sort((a, b) => new Date(a.fechaVencimiento).getTime() - new Date(b.fechaVencimiento).getTime());

            if (!lotesActivos.length) {
                return useAlertStore.getState().alert("Sin stock en lotes activos", "warning");
            }

            for (const lote of lotesActivos) {
                const existingLoteIdx = productsInvoice.findIndex(
                    (p: any) => Number(p?.productoId || p?.id) === product.id && p.loteId === lote.loteId,
                );

                if (existingLoteIdx >= 0) {
                    const currentItem = productsInvoice[existingLoteIdx];
                    const currentQty = Number(currentItem.cantidad);
                    if (currentQty < lote.stockActual) {
                        updateProductInvoice(existingLoteIdx, calculateLineItem(currentItem, currentQty + 1));
                        return;
                    }
                    continue; // este lote está lleno, intentar el siguiente
                }

                // Nueva línea para este lote
                const costoBase = lote.costoUnitario ?? Number(product?.precioUnitario ?? 0);
                const lotPrice = vendePorUnidad ? costoBase / factorConversion : costoBase;
                addProductsInvoice({
                    ...product,
                    descripcion: `${String(product.descripcion || '')} [${lote.loteNumero}]`,
                    precioBase: lotPrice,
                    precioUnitario: lotPrice,
                    precioOrigen: 'FEFO',
                    stock: lote.stockActual,
                    unidadMedida: unidadMedidaNombre,
                    lotesDisponibles: product?.lotesDisponibles ?? [],
                    loteId: lote.loteId,
                    loteNumero: lote.loteNumero,
                    pendienteReceta: habilitaRecetaMedica && (product.requiereReceta || product.controlado),
                    requiereReceta: product.requiereReceta ?? false,
                    controlado: product.controlado ?? false,
                    refrigerado: product.refrigerado ?? false,
                    ...fraccionExtra,
                });
                return;
            }

            return useAlertStore.getState().alert("Stock insuficiente en todos los lotes activos", "warning");
        }
        // ── Fin multi-lote ──────────────────────────────────────────────────────

        // Moneda del producto vs. moneda del documento.
        // Solo convertimos un producto en USD a soles cuando el documento NO es en dólares
        // (facturación, o cotización en soles). Si la cotización es en dólares, el producto
        // en USD conserva su precio original ($472 sigue siendo $472, sin multiplicar por TC).
        const esUSD = String(product?.moneda || 'PEN').toUpperCase() === 'USD';
        const docEnDolares = String(quotationCurrency).toUpperCase() === 'USD';
        const convertirUSD = esUSD && !docEnDolares;
        const tc = convertirUSD ? Number(tcVenta) : 1;
        if (convertirUSD && (!Number.isFinite(tc) || tc <= 0)) {
            // Aún no cargó el tipo de cambio: lo pedimos y avisamos que reintente.
            tipoCambioService
                .consultar()
                .then((r) => setTcVenta(Number(r?.venta) || null))
                .catch(() => setTcVenta(null));
            return useAlertStore.getState().alert(
                "Obteniendo el tipo de cambio del día para el producto en dólares. Intenta agregarlo de nuevo en un momento.",
                "warning",
            );
        }
        const preciosMayoristaConv = convertirUSD && Array.isArray(product?.preciosMayorista)
            ? product.preciosMayorista.map((r: any) => ({
                ...r,
                precio: Number(r?.precio ?? 0) * tc,
            }))
            : product?.preciosMayorista;

        const precioDesdeLoteFefo = Number(product?.loteFefoCostoUnitario ?? 0);
        const precioBaseProducto = Number(product?.precioUnitario ?? 0) * tc;
        const precioBaseCaja = usarPrecioLoteFefo && precioDesdeLoteFefo > 0
            ? precioDesdeLoteFefo
            : precioBaseProducto;
        const precioBaseSeleccionado = vendePorUnidad ? precioBaseCaja / factorConversion : precioBaseCaja;
        const origenPrecio = vendePorUnidad ? "UNIDAD" : usarPrecioLoteFefo && precioDesdeLoteFefo > 0 ? "FEFO" : "LISTA";
        const existingIndex = productsInvoice.findIndex((p: any) => p.id === product.id);

        const farmaciaExtra = usaLotesFarmacia && product?.loteFefo
            ? {
                loteId: product.loteFefo.loteId,
                loteNumero: product.loteFefo.loteNumero,
                pendienteReceta: habilitaRecetaMedica && (product.requiereReceta || product.controlado),
                requiereReceta: product.requiereReceta ?? false,
                controlado: product.controlado ?? false,
                refrigerado: product.refrigerado ?? false,
            }
            : {};

        if (existingIndex >= 0) {
            const currentItem = productsInvoice[existingIndex];
            const newQty = Number(currentItem.cantidad) + 1;
            const stockDisponible = usaLotesFarmacia
                ? (product?.loteFefo?.stockDisponibleVenta ?? 0)
                : product.stock;
            if (!permitirVentaSinStock && !esServicio && stockDisponible < newQty) {
                return useAlertStore.getState().alert("Stock insuficiente", "warning");
            }
            // Sobreventa activa: se agrega sin advertencia (el empresario ya la habilitó a propósito).
            updateProductInvoice(existingIndex, calculateLineItem(currentItem, newQty));
        } else {
            const stockDisponible = usaLotesFarmacia
                ? (product?.loteFefo?.stockDisponibleVenta ?? 0)
                : product.stock;
            if (!permitirVentaSinStock && !esServicio && stockDisponible < 1) {
                return useAlertStore.getState().alert("Sin stock", "warning");
            }
            // Sobreventa activa: se agrega sin advertencia (el empresario ya la habilitó a propósito).
            const base = precioBaseSeleccionado;
            addProductsInvoice({
                ...product,
                // Precio ya convertido a soles (si era USD). El carrito trabaja en soles.
                moneda: 'PEN',
                preciosMayorista: preciosMayoristaConv,
                precioBase: base,
                precioUnitario: getApplicablePrice({ precioBase: base, preciosMayorista: preciosMayoristaConv }, 1),
                precioOrigen: origenPrecio,
                unidadMedida: unidadMedidaNombre,
                // Trazabilidad del precio original en dólares. tipoCambio = 1 cuando el
                // producto se agrega a una cotización en dólares (no se convirtió); = TC del
                // día cuando se convirtió a soles. Permite reconvertir al cambiar de moneda.
                ...(esUSD ? { monedaOriginal: 'USD', precioOriginalUSD: Number(product?.precioUnitario ?? 0), tipoCambio: tc } : {}),
                ...farmaciaExtra,
                ...fraccionExtra,
            });
        }
    }

    // Se elige una variante en el modal: se fusiona con el padre (unidad, categoría,
    // afectación vienen del padre; id, código, precio, stock, moneda de la variante)
    // y se re-inyecta al flujo normal de agregar producto.
    const handleSelectVariante = (padre: any, variante: any) => {
        setVarianteModalProduct(null);
        const valores = variante?.valoresAtributos && typeof variante.valoresAtributos === 'object'
            ? Object.values(variante.valoresAtributos).filter(Boolean).join(' / ')
            : '';
        handleProductClick({
            ...padre,
            ...variante,
            id: variante.id,
            codigo: variante.codigo ?? padre.codigo,
            descripcion: `${padre.descripcion}${valores ? ' - ' + valores : ''}`,
            variantes: undefined,
            __esVariante: true,
        });
    };

    const handleAddFreeQuoteItem = () => {
        const descripcion = cleanText(freeQuoteItem.descripcion);
        const cantidad = Number(freeQuoteItem.cantidad);
        const precioUnitario = Number(freeQuoteItem.precioUnitario);

        if (!descripcion) {
            return useAlertStore.getState().alert("Describe el producto o servicio a cotizar", "warning");
        }
        if (!Number.isFinite(cantidad) || cantidad <= 0) {
            return useAlertStore.getState().alert("La cantidad debe ser mayor a cero", "warning");
        }
        if (!Number.isFinite(precioUnitario) || precioUnitario < 0) {
            return useAlertStore.getState().alert("El precio debe ser válido", "warning");
        }

        addProductsInvoice({
            productoId: null,
            id: null,
            descripcion,
            cantidadInicial: cantidad,
            precioUnitario,
            precioBase: precioUnitario,
            descuento: 0,
            stock: 999999,
            unidadMedida: freeQuoteItem.tipo === 'SERVICIO' ? 'SERVICIO' : 'UNIDAD',
            unidadMedidaNombre: freeQuoteItem.tipo === 'SERVICIO' ? 'SERVICIO' : 'UNIDAD',
            unidadMedidaCodigo: freeQuoteItem.tipo === 'SERVICIO' ? 'ZZ' : 'NIU',
            tipoAfectacionIGV: freeQuoteItem.afectacion || '10',
            afectacionNombre: NOMBRE_AFECTACION[freeQuoteItem.afectacion] || 'Gravado – Operación Onerosa',
            estado: 'ACTIVO',
            esItemLibre: true,
            atributosTecnicos: { tipoProducto: freeQuoteItem.tipo },
        } as any);

        setFreeQuoteItem(crearEstadoItemLibre());
    };

    // Farmacia: confirmar datos de receta para un ítem del carrito
    const handleConfirmarReceta = (itemIndex: number, datos: IDatosReceta) => {
        const item = productsInvoice[itemIndex];
        if (!item) return;
        updateProductInvoice(itemIndex, { ...item, pendienteReceta: false, datosReceta: datos });
        setIsRecetaModalOpen(false);
        setRecetaModalItemIndex(null);
    };

    const handleAbrirRecetaModal = (itemIndex: number) => {
        setRecetaModalItemIndex(itemIndex);
        setIsRecetaModalOpen(true);
    };

    const handleBarcodeScan = async (codigo: string) => {
        const trimmed = codigo.trim();
        if (!trimmed) return;
        
        setBarcodeLoading(true);
        setBarcodeError(false);
        
        try {
            const queryParams = sedeActiva?.id ? `?sedeId=${sedeActiva.id}` : '';
            const resp: any = await get(`productos/barcode/${encodeURIComponent(trimmed)}${queryParams}`);
            const producto = resp?.data ?? resp;
            if (producto?.id) {
                handleProductClick(producto);
                setBarcodeInput('');
            } else {
                handleBarcodeNotFound(trimmed);
            }
        } catch (error: any) {
            console.error('Error scanning barcode:', error);
            handleBarcodeNotFound(trimmed);
        } finally {
            setBarcodeLoading(false);
            setTimeout(() => barcodeRef.current?.focus(), 50);
        }
    };

    const handleBarcodeNotFound = (barcode: string) => {
        setBarcodeError(true);
        setBarcodeInput('');
        
        // Alerta con opción de creación rápida
        useAlertStore.getState().alert(
            `Código ${barcode} no encontrado. ¿Deseas crear el producto?`, 
            'warning'
        );
        
        // Pre-configurar el formulario de producto con el código escaneado
        setFormValuesProduct({
            ...initialFormProduct,
            codigoBarras: barcode,
            // Intentar generar un código correlativo para el SKU
            codigo: "" 
        });

        // Opcional: Podríamos abrir el modal automáticamente después de un delay
        // o dejar que el usuario haga clic en el botón de "Producto"
        // Por ahora, lo dejaremos listo en el formValuesProduct.
        
        setTimeout(() => setBarcodeError(false), 2000);
    };

    const handleSelectWholesaleTier = (index: number, tier: { cantidadMinima: number; precio: number } | null) => {
        const item = productsInvoice[index];
        const qty = Number(item.cantidad);
        const price = tier ? Number(tier.precio) : Number(item.precioBase ?? item.precioUnitario);
        const subtotal = price * qty;
        updateProductInvoice(index, {
            precioUnitario: price,
            total: subtotal.toFixed(2),
            sale: (subtotal / 1.18).toFixed(2),
            igv: (subtotal - subtotal / 1.18).toFixed(2),
            _tierOverride: tier ? tier.cantidadMinima : null,
        });
    };

    const handleSaveEdit = (newItem: any) => {
        if (editingIndex === -1) return;
        const qty = Number(newItem.cantidad);
        const price = Number(newItem.precioUnitario);
        const subtotal = price * qty;
        const descuento = Number(newItem.descuento || 0);
        const totalConDescuento = subtotal * (1 - descuento / 100);

        updateProductInvoice(editingIndex, {
            ...newItem,
            precioUnitario: price,
            total: totalConDescuento.toFixed(2),
            sale: (totalConDescuento / 1.18).toFixed(2),
            igv: (totalConDescuento - totalConDescuento / 1.18).toFixed(2)
        });
        setEditingIndex(-1);
    };

    const handleSaveRetencion = (data: any) => {
        setRetencionData(data);
        const formaPagoUpper = data.formaPago?.toUpperCase() || 'CONTADO';
        setFormValues(prev => ({
            ...prev,
            medioPago: formaPagoUpper,
            cuotas: data.cuotas ? data.cuotas.map((c: any) => ({
                monto: c.monto,
                fechaVencimiento: c.fechaVencimiento
            })) : []
        }));
    };

    const handleSaveDetraccion = (data: DetraccionData) => {
        setTipoDetraccionId(data.tipoDetraccionId);
        setMedioPagoDetraccionId(data.medioPagoDetraccionId);
        setCuentaBancoNacion(data.cuentaBancoNacion);
        setPorcentajeDetraccion(data.porcentajeDetraccion);
        setMontoDetraccion(data.montoDetraccion);
        setCuotas(data.cuotas || []);
        if (data.formaPago) {
            setFormValues(prev => ({ ...prev, medioPago: data.formaPago || 'Contado' }));
        }
    };

    const handleSaveQuotationConfig = (config: QuotationConfig) => {
        setIncludeProductImages(config.includeProductImages);
        setQuotationDiscount(config.quotationDiscount);
        setQuotationValidity(config.quotationValidity);
        setQuotationSignature(config.quotationSignature);
        setQuotationTerms(config.quotationTerms);
        setQuotationPaymentType(config.quotationPaymentType);
        setQuotationAdvance(config.quotationAdvance);
        handleChangeQuotationCurrency(config.quotationCurrency);
        setFormValues(prev => ({
            ...prev,
            observaciones: config.observaciones
        }));
    };

    // Reconvierte los ítems del carrito con origen USD al cambiar la moneda de la cotización.
    // Los productos en soles no se tocan; solo los USD-origen: al pasar a dólares vuelven a su
    // precio original ($472) y al pasar a soles se multiplican por el tipo de cambio del día.
    const convertirCarritoAMoneda = (targetUSD: boolean) => {
        const tc = Number(tcVenta);
        productsInvoice.forEach((it: any, idx: number) => {
            if (String(it?.monedaOriginal || '').toUpperCase() !== 'USD') return;
            const factor = targetUSD ? 1 : (Number.isFinite(tc) && tc > 0 ? tc : Number(it.tipoCambio) || 1);
            const currentFactor = Number(it.tipoCambio) || 1;
            if (factor === currentFactor) return;
            const ratio = factor / currentFactor;
            const nuevoBase = Number(it.precioBase ?? it.precioUnitario ?? 0) * ratio;
            const nuevosMayorista = Array.isArray(it.preciosMayorista)
                ? it.preciosMayorista.map((r: any) => ({ ...r, precio: Number(r?.precio ?? 0) * ratio }))
                : it.preciosMayorista;
            const patched = { ...it, precioBase: nuevoBase, preciosMayorista: nuevosMayorista, tipoCambio: factor };
            updateProductInvoice(idx, { ...patched, ...calculateLineItem(patched, Number(it.cantidad) || 1) });
        });
    };

    const handleChangeQuotationCurrency = (next: string) => {
        const nxt = String(next).toUpperCase();
        const cur = String(quotationCurrency).toUpperCase();
        if (nxt === cur) return;
        const targetUSD = nxt === 'USD';
        const hayUSDOrigen = productsInvoice.some(
            (it: any) => String(it?.monedaOriginal || '').toUpperCase() === 'USD',
        );
        const tc = Number(tcVenta);
        // Solo necesitamos el tipo de cambio si hay ítems USD-origen que reconvertir.
        if (hayUSDOrigen && (!Number.isFinite(tc) || tc <= 0)) {
            tipoCambioService
                .consultar()
                .then((r) => setTcVenta(Number(r?.venta) || null))
                .catch(() => setTcVenta(null));
            useAlertStore.getState().alert(
                "Obteniendo el tipo de cambio del día. Vuelve a cambiar la moneda en un momento.",
                "warning",
            );
            return;
        }
        convertirCarritoAMoneda(targetUSD);
        // Reiniciamos el descuento manual para evitar montos ambiguos entre monedas.
        setDescuentoSolesNV(0);
        setDescuentoPctNV(0);
        setQuotationCurrency(nxt);
    };

    const handleChangeSelect = (idValue: any, value: any, name: any, id: any) => {
        const clientSelect = clients?.find((item: any) => value.split("-")[0] === item.nroDoc);
        if (clientSelect !== undefined) {
            setSelectedClient(clientSelect);
        }

        const updatedFormValues: any = {
            ...formValues,
            [name]: value,
            [id]: idValue
        };

        if (id === 'motivoId' || name === 'motivo') {
            const motivo: any = tiposOperacion.find((item: any) => Number(item.id) === Number(idValue));
            updatedFormValues.motivoId = motivo?.id;
        }

        if (name === 'comprobante') {
            setFechaVencimientoCredito('');
        }

        setFormValues(updatedFormValues);
    };

    useEffect(() => {
        if (selectedProduct !== null && selectedProduct !== undefined) {
            addProductsInvoice({
                ...selectedProduct,
                unidadMedida: selectedProduct?.unidadMedida?.nombre
            })
            setSelectProduct(null);
        }
    }, [selectedProduct]);

    const handleGetDataClient = (query: string, callback: Function) => {
        if (query.length > 2) {
            getAllClients({ search: query }, callback, true)
        }
    };

    // Búsqueda directa por documento en el POS: escribe DNI/RUC + Enter y el
    // cliente queda seteado. Si no existe en la empresa, se consulta el padrón
    // (RENIEC/SUNAT) y se crea automáticamente.
    const [clienteDocLookupLoading, setClienteDocLookupLoading] = useState(false);
    const handleClienteDocLookup = async (docRaw: string): Promise<boolean> => {
        const doc = String(docRaw || '').replace(/\D/g, '');
        if (doc.length !== 8 && doc.length !== 11) {
            useAlertStore.getState().alert('Ingresa un DNI (8 dígitos) o un RUC (11 dígitos)', 'warning');
            return false;
        }
        const tipo = doc.length === 11 ? 'RUC' : 'DNI';
        setClienteDocLookupLoading(true);
        try {
            // 1) ¿Ya está registrado en la empresa?
            const resp: any = await get(`clientes?search=${doc}&limit=5`);
            const lista = (resp as any)?.data?.clientes ?? (resp as any)?.data?.data ?? [];
            const existente = Array.isArray(lista) ? lista.find((c: any) => String(c.nroDoc) === doc) : null;
            if (existente) {
                handleClienteCreado(existente);
                useAlertStore.getState().alert(`Cliente: ${existente.nombre}`, 'success');
                return true;
            }
            // 2) Consultar padrón y crear automáticamente
            const info: any = await getClientFromDoc(doc, tipo);
            if (!info) {
                useAlertStore.getState().alert('No encontramos información para ese documento', 'warning');
                return false;
            }
            const nombre = info.nombre_completo || info.nombre_o_razon_social || '';
            if (!nombre) {
                useAlertStore.getState().alert('El padrón no devolvió el nombre; regístralo manualmente', 'warning');
                return false;
            }
            setPendingClientLookup({
                tipoDoc: tipo,
                nroDoc: doc,
                nombre,
                direccion: info.direccion || info.direccion_completa || '',
                departamento: info.departamento || '',
                provincia: info.provincia || '',
                distrito: info.distrito || '',
                ubigeo: info.ubigeo_sunat || '',
                persona: 'CLIENTE',
                estado: 'ACTIVO',
            } as any);
            setIsOpenClientLookupConfirm(true);
            return false;
        } finally {
            setClienteDocLookupLoading(false);
        }
    };

    // Al crear un cliente nuevo desde "Configurar venta", queda auto-seleccionado
    // (sin tener que buscarlo). Funciona igual para DNI o RUC.
    const openClientModal = () => {
        setFormValuesClient({ ...initialFormClient });
        setErrorsClient({ ...initialErrorsClient });
        setIsOpenModalClient(true);
    };
    const handleClienteCreado = (client: any) => {
        if (!client) return;
        setSelectedClient(client);
        setFormValuesClient(client as any);
        setFormValues((prev: any) => ({
            ...prev,
            clienteId: Number(client.id) || 0,
            clienteNombre: `${client.nroDoc}-${client.nombre}`,
        }));
    };

    const handleConfirmPendingClientLookup = async () => {
        if (!pendingClientLookup || clientLookupConfirmLoading) return false;
        setClientLookupConfirmLoading(true);
        try {
            const creado: any = await addClients({
                ...pendingClientLookup,
                estado: 'ACTIVO',
            } as any);
            if (creado) {
                handleClienteCreado({ ...creado, ...pendingClientLookup });
                setPendingClientLookup(null);
                setIsOpenClientLookupConfirm(false);
                return true;
            }
            useAlertStore.getState().alert('No se pudo guardar el cliente', 'error');
            return false;
        } finally {
            setClientLookupConfirmLoading(false);
        }
    };

    const handleCancelPendingClientLookup = () => {
        setPendingClientLookup(null);
        setIsOpenClientLookupConfirm(false);
    };

    const handleDeleteProduct = (row: any) => {
        deleteProductInvoice(row);
    };

    // Borra la línea exacta por índice (evita el bug de borrar por descripción).
    const handleDeleteProductByIndex = (index: number) => {
        deleteProductInvoiceByIndex(index);
    };

    const { total, discount: productDiscount, hasDiscount } = useMemo(() => calculateTotals(productsInvoice), [productsInvoice]);
    const esInformal = tiposInformales.includes(formValues.tipoDoc);
    // Símbolo de moneda del documento (cotización, factura o boleta): US$ cuando se emite
    // en dólares (p. ej. factura de exportación); S/ en caso contrario.
    const monedaSimbolo =
        String(quotationCurrency).toUpperCase() === 'USD' ? 'US$' : 'S/';
    // Factura (01) o Boleta (03): habilita el toggle de moneda del comprobante y el envío
    // de tipoMoneda/tipoCambio en dólares (requerido para facturas de exportación).
    const esFacturaOBoleta = formValues.tipoDoc === '01' || formValues.tipoDoc === '03';
    const isDiscountGlobalApplicable = formValues.motivoId === 6;
    // Las líneas gratuitas no se cobran: se excluyen del total a pagar (el backend también
    // las excluye del importe del comprobante; aquí se refleja en el preview del POS).
    const totalGratuitas = productsInvoice.reduce(
        (s: number, p: any) => (esAfectacionGratuita(p.tipoAfectacionIGV) ? s + (parseFloat(p.total) || 0) : s),
        0,
    );
    const totalOriginal = Math.max(0, Number(total) - totalGratuitas);
    // Descuento global (%, S/ o $): aplica a todos los comprobantes (formales e informales).
    const montoDescuentoNV = descuentoModoNV === 'SOLES'
        ? Math.min(descuentoSolesNV, totalOriginal)
        : descuentoPctNV > 0
            ? parseFloat((totalOriginal * descuentoPctNV / 100).toFixed(2))
            : 0;
    const totalAdjusted = isDiscountGlobalApplicable
        ? Math.max(totalOriginal - descountGlobal, 0)
        : Math.max(totalOriginal - montoDescuentoNV, 0);
    const normalizePaymentMethod = (value?: string) => String(value ?? '').trim().toUpperCase();
    const isCashPayment = normalizePaymentMethod(paymentMethod) === 'EFECTIVO';
    const splitPaymentTotal = splitPayments.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
    const montoRecibido = isMixedPayment
        ? Number(splitPaymentTotal.toFixed(2))
        : isCashPayment && pay > 0
            ? Number(pay.toFixed(2))
            : Number(totalAdjusted.toFixed(2));
    const vueltoCalculado = Number(Math.max(0, montoRecibido - totalAdjusted).toFixed(2));
    const esCreditoNV = formValues.medioPago === 'Crédito';
    // Pago inicial del crédito: si es mixto, la suma de las líneas; si es simple, el campo adelanto.
    const inicialCreditoMonto = esCreditoNV
        ? (isMixedPayment ? Number(splitPaymentTotal.toFixed(2)) : Number(adelanto))
        : 0;
    const adelantoBruto = esCreditoNV
        ? inicialCreditoMonto
        : (esInformal && (formValues.tipoDoc === "NP" || formValues.tipoDoc === "OT") ? Number(adelanto) : 0);
    const adelantoCreditoCalculado = adelantoBruto > 0 ? Math.min(adelantoBruto, totalAdjusted) : 0;
    const totalCredito = Number(Math.max(0, totalAdjusted - adelantoCreditoCalculado).toFixed(2));
    const buildPaymentDetails = () => {
        const normalizeLine = (line: PaymentLine): PaymentLine => {
            const method = normalizePaymentMethod(line.method);
            const isTarjeta = method === 'TARJETA';
            return {
                method,
                amount: Number(line.amount || 0),
                referencia: cleanText(line.referencia) || undefined,
                cuentaBancariaId: line.cuentaBancariaId ? Number(line.cuentaBancariaId) : null,
                cuentaBancariaLabel: cleanText(line.cuentaBancariaLabel) || undefined,
                tarjetaMarca: isTarjeta ? (cleanText(line.tarjetaMarca) || undefined) : undefined,
                tarjetaTipo: isTarjeta ? (cleanText(line.tarjetaTipo) || undefined) : undefined,
                tarjetaUltimos4: isTarjeta ? (cleanText(line.tarjetaUltimos4).replace(/\D/g, '').slice(-4) || undefined) : undefined,
            };
        };

        if (isMixedPayment) {
            return {
                mode: 'MIXTO',
                splitPayments: splitPayments
                    .map(normalizeLine)
                    .filter((line) => Number(line.amount || 0) > 0),
            };
        }

        return {
            mode: 'SIMPLE',
            ...normalizeLine({
                ...paymentDetail,
                method: paymentMethod,
                amount: montoRecibido,
            }),
        };
    };

    const validatePaymentDetails = () => {
        if (isQuotationRoute || formValues.medioPago === 'Crédito') return true;
        // El N° de operación/voucher es opcional: no bloquea la emisión (se puede
        // registrar después). Solo se exige la cuenta bancaria para transferencias.
        const requiresAccount = (method?: string) => normalizePaymentMethod(method) === 'TRANSFERENCIA';
        const details = buildPaymentDetails();
        const lines: PaymentLine[] = details.mode === 'MIXTO' ? (details.splitPayments ?? []) : [details as PaymentLine];

        for (const line of lines) {
            if (Number(line.amount || 0) <= 0) continue;
            if (requiresAccount(line.method) && !line.cuentaBancariaId) {
                useAlertStore.getState().alert("Selecciona la cuenta bancaria donde ingresó la transferencia.", "error");
                return false;
            }
        }
        return true;
    };

    useEffect(() => {
        if (porcentajeDetraccion > 0 && totalAdjusted > 0) {
            setMontoDetraccion(Number((totalAdjusted * porcentajeDetraccion / 100).toFixed(2)));
        } else {
            setMontoDetraccion(0);
        }
    }, [porcentajeDetraccion, totalAdjusted]);

    const igvRate = 0.18;

    // Operación de exportación (Catálogo 51): fuerza todas las líneas a exportación
    // (afectación 40, sin IGV). Debe coincidir con la detección del backend
    // (comprobante.service → esExportacion) para que el preview cuadre con el XML.
    const operacionActual = tiposOperacion.find((op: any) => op.id === formValues.tipoOperacionId);
    const esOperacionExportacion = !!operacionActual?.codigo && (
        String(operacionActual.codigo).startsWith('02') ||
        operacionActual.codigo === '0102' ||
        operacionActual.codigo === '0113'
    );

    let sumGravadas = 0;
    let sumExoneradas = 0;
    let sumInafectas = 0;
    let sumExportacion = 0;

    productsInvoice.forEach((p: any) => {
        // Gratuitas: no forman parte de la base gravable ni del importe a pagar.
        if (esAfectacionGratuita(p.tipoAfectacionIGV)) return;
        const lineTotal = parseFloat(p.total) || 0;
        const type = esOperacionExportacion ? '40' : String(p.tipoAfectacionIGV || '10');
        if (type.startsWith('4')) sumExportacion += lineTotal;
        else if (type.startsWith('2')) sumExoneradas += lineTotal;
        else if (type.startsWith('3')) sumInafectas += lineTotal;
        else sumGravadas += lineTotal;
    });

    const sumTotalLines = sumGravadas + sumExoneradas + sumInafectas + sumExportacion;
    const discountRatio = (sumTotalLines > 0 && totalAdjusted < sumTotalLines) 
        ? totalAdjusted / sumTotalLines 
        : 1;

    const opGravadaAdjusted = (sumGravadas * discountRatio) / (1 + igvRate);
    const igvAdjusted = (sumGravadas * discountRatio) - opGravadaAdjusted;
    const opExoneradaAdjusted = sumExoneradas * discountRatio;
    const opInafectaAdjusted = sumInafectas * discountRatio;
    const finalDiscount = isDiscountGlobalApplicable
        ? Number(productDiscount) + descountGlobal
        : Number(productDiscount) + montoDescuentoNV;

    const totalDescount = productsInvoice.length > 0 && formValues.motivoId === 4 && productsInvoice
        ?.map((d: any) => d?.precioUnitario)
        ?.reduce((sum: any, x: any) => sum + x);

    const totalInteres = productsInvoice.length > 0 && (formValues.motivoId === 8 || formValues.motivoId === 10) && productsInvoice
        ?.map((d: any) => d?.precioUnitario)
        ?.reduce((sum: any, x: any) => sum + x);

    const monedaLeyenda = String(quotationCurrency).toUpperCase() === 'USD' ? 'DÓLARES AMERICANOS' : 'SOLES';
    const totalInWords = numberToWords(parseFloat(totalAdjusted.toFixed(2))) + " " + monedaLeyenda;

    useEffect(() => {
        setFormValues((prev) => ({
            ...prev,
            vuelto: vueltoCalculado,
        }));
    }, [vueltoCalculado]);

    const validateForm = () => {
        const newErrors: any = {
            observaciones: formValues.motivoId === 2 ? (formValues.observaciones.trim() !== "" ? "" : "Escriba la observación") : "",
        };
        setErrors(newErrors);
        return Object.values(newErrors).every((error) => !error);
    };

    const addInvoiceReceipt = async () => {
        if (!validateForm()) return;
        const selectedOperacion = tiposOperacion.find(op => op.id === formValues.tipoOperacionId);
        // Operaciones de exportación (Catálogo 51: 0102/0200/0201/0202…): el receptor es NO
        // domiciliado (pasaporte/otros), así que NO se exige RUC de 11 dígitos.
        if (formValues?.comprobante === "FACTURA" && selectedClient?.nroDoc?.length !== 11 && !esOperacionExportacion) {
            return useAlertStore.getState().alert("El cliente debe tener RUC (11 dígitos) para generar una factura. Para exportación a no domiciliados, elige un Tipo de operación de exportación (0102/0200/0201/0202).", "error");
        }
        if ((serie === "" || correlative === "") && formValues?.comprobante === "NOTA DE CREDITO") {
            return useAlertStore.getState().alert("Serie y correlativo son obligatorios para nota de credito", "error")
        }
        if (formValues?.clienteNombre === "") {
            return useAlertStore.getState().alert("El cliente es obligatorio", "error")
        }
        if (productsInvoice.length === 0) {
            return useAlertStore.getState().alert("Debe agregar al menos un producto", "error")
        }
        if (!validatePaymentDetails()) return;

        // Farmacia/droguería: bloquear emisión si hay ítems con receta pendiente
        if (habilitaRecetaMedica) {
            const pendientes = productsInvoice.filter((p: any) => p.pendienteReceta);
            if (pendientes.length > 0) {
                return useAlertStore.getState().alert(
                    `Hay ${pendientes.length} producto(s) que requieren datos de receta médica antes de cobrar.`,
                    "error"
                );
            }
        }

        // Series y garantía: validar que cada ítem con controlSeries tenga las series ingresadas
        const itemsConSerieFaltante = productsInvoice.filter((item: any) => {
            const attrs = item?.atributosTecnicos || {};
            const control = String(attrs.controlSeries ?? attrs.requiereSerie ?? '').toLowerCase();
            const requiere = attrs.controlSeries === true || attrs.requiereSerie === true || ['true', 'si', 'sí', '1'].includes(control);
            if (!requiere) return false;
            const cantidad = Number(item.cantidad || 1);
            const series = String(item.numerosSerie || '').split(/[\n,]+/).map((s: string) => s.trim()).filter(Boolean);
            return series.length < cantidad;
        });
        if (itemsConSerieFaltante.length > 0) {
            const nombres = itemsConSerieFaltante.map((i: any) => i.descripcion).join(', ');
            return useAlertStore.getState().alert(
                `Debes ingresar los números de serie para: ${nombres}. Se requiere una serie por unidad.`,
                "error"
            );
        }

        // Fecha de emisión: usar la fecha seleccionada por el usuario (con hora Lima actual)
        const [fyear, fmonth, fday] = fechaEmisionManual.split('-').map(Number);
        const fechaEmisionDate = new Date(fyear, fmonth - 1, fday, new Date().getHours(), new Date().getMinutes(), new Date().getSeconds());
        const fechaEmision = formatISO(fechaEmisionDate, { representation: 'complete' });

        if (selectedOperacion?.codigo === '0112') {
            if (!tipoDetraccionId || !cuentaBancoNacion || !porcentajeDetraccion || !montoDetraccion) {
                return useAlertStore.getState().alert("Para operación sujeta a detracción, DEBE configurar la detracción (Cuenta, % y Monto).", "error");
            }
            if (totalAdjusted < 700) {
                return useAlertStore.getState().alert("La detracción solo aplica para montos mayores a S/ 700.00", "error");
            }
        }

        if (retencionData) {
            if (!retencionData.montoDetraccion || retencionData.montoDetraccion <= 0) {
                return useAlertStore.getState().alert("Para operación sujeta a retención, DEBE configurar el monto de retención.", "error");
            }
        }

        if ((formValues.tipoDoc === "NP" || formValues.tipoDoc === "OT") && adelanto > totalAdjusted) {
            return useAlertStore.getState().alert("El adelanto no puede ser mayor al total", "error");
        }

        let fechaRecojoFinal = null;
        if (formValues.tipoDoc === "NP" && fechaRecojo) {
            try {
                const parsed = parse(fechaRecojo, 'dd/MM/yyyy', new Date());
                fechaRecojoFinal = formatISO(parsed, { representation: 'complete' });
            } catch (e) {
                console.error('Error parseando fechaRecojo:', e);
            }
        }

        let observacionesFinal = formValues?.observaciones || formValues?.motivo;
        if (retencionData) {
            observacionesFinal = `${observacionesFinal} | Operación sujeta a Retención del 3% del IGV`.replace(/^ \| /, '');
        }

        const effectiveMedioPago = isMixedPayment
            ? 'MIXTO'
            : paymentMethod;
        const paymentDetails = buildPaymentDetails();
        const esPagoCredito = formValues.medioPago === 'Crédito';
        const esDocumentoInformal = esInformal;
        // Crédito con pago inicial: el inicial se registra con su método real y el
        // resto queda a crédito. Para el resto de casos, se usan los valores normales.
        const creditoConInicial = esPagoCredito && adelantoCreditoCalculado > 0;
        const medioPagoFinal = creditoConInicial
            ? (isMixedPayment ? 'MIXTO' : adelantoMetodo)
            : effectiveMedioPago;
        const paymentDetailsFinal = creditoConInicial
            ? (isMixedPayment
                ? paymentDetails
                : { mode: 'SIMPLE', method: normalizePaymentMethod(adelantoMetodo), amount: adelantoCreditoCalculado })
            : paymentDetails;
        // Cuota única (0 o 1 cuota): su monto SIEMPRE es el total a financiar, para que
        // no quede obsoleto al cambiar el pago inicial. Con 2+ cuotas, se respeta el
        // cronograma configurado por el usuario (debe sumar el total a crédito).
        const cuotasCredito = esPagoCredito
            ? (cuotas.length > 1
                ? cuotas
                : ((fechaVencimientoCredito || cuotas[0]?.fechaVencimiento)
                    ? [{ monto: totalCredito, fechaVencimiento: cuotas[0]?.fechaVencimiento || fechaVencimientoCredito }]
                    : []))
            : [];

        if (esPagoCredito && totalCredito > 0) {
            if (cuotasCredito.length === 0) {
                return useAlertStore.getState().alert("Configura la fecha de vencimiento o el cronograma de cuotas para la venta al crédito.", "error");
            }
            const sumaCuotas = cuotasCredito.reduce((sum, cuota) => sum + Number(cuota.monto || 0), 0);
            if (Math.abs(sumaCuotas - totalCredito) > 0.01) {
                return useAlertStore.getState().alert(`La suma de cuotas (S/ ${sumaCuotas.toFixed(2)}) debe ser igual al monto a crédito (S/ ${totalCredito.toFixed(2)}).`, "error");
            }
        }

        const aplicacionMontoEnvio =
            envioData.aplicacionMontoCliente === 'ADELANTO' && !esDocumentoInformal
                ? 'ITEM_ENVIO'
                : (envioData.aplicacionMontoCliente ?? (esDocumentoInformal ? 'ADELANTO' : 'ITEM_ENVIO'));

        // Descuento global en comprobantes FORMALES: se prorratea en las líneas de producto
        // (el backend recalcula desde nuevoValorUnitario) para que el neto enviado a SUNAT
        // coincida con el total mostrado. En informales se envía como montoDescuentoGlobal.
        const aplicarDescuentoProrrateado = !esInformal && montoDescuentoNV > 0 && totalOriginal > 0;
        const ratioDescuentoGlobal = aplicarDescuentoProrrateado ? (totalAdjusted / totalOriginal) : 1;

        const baseData = {
            tipoOperacionId: formValues.tipoOperacionId || 1,
            fechaEmision,
            medioPago: medioPagoFinal,
            paymentDetails: paymentDetailsFinal,
            splitPayments: isMixedPayment ? paymentDetails.splitPayments : undefined,
            ...(origenComprobanteId != null ? { comprobanteOrigenId: origenComprobanteId } : {}),
            vuelto: vueltoCalculado,
            clienteId: Number(formValues?.clienteId) || invoiceData?.cliente?.id,
            clienteName: selectedClient?.nombre,
            tipoDoc: formValues?.tipoDoc,
            // Cobranza en campo: atribuir la venta al vendedor de campo elegido.
            ...(cobranzaCampo && vendedorCampoId
                ? {
                    vendedorCampoId,
                    vendedorCampoNombre: usuarios.find((u: any) => u.id === vendedorCampoId)?.nombre,
                }
                : {}),
            detalles: [
                ...(productsInvoice?.map((item: any) => ({
                    productoId: Number(item?.productoId || item?.id) || null,
                    descripcion: item.descripcion,
                    cantidad: Number(item.cantidad),
                    // Afectación IGV por línea (Catálogo 07). Necesario para ítems libres
                    // como "ANTICIPO/ADELANTO DEL PEDIDO" que van sin IGV (exportación/exonerado).
                    ...(item.tipoAfectacionIGV ? { tipoAfectacionIGV: String(item.tipoAfectacionIGV) } : {}),
                    // El backend recalcula base/IGV/total desde nuevoValorUnitario y NO lee el
                    // campo `descuento` por línea, por lo que el descuento por ítem debe quedar
                    // plegado dentro del precio unitario (igual que el descuento global vía
                    // ratioDescuentoGlobal). Así la lista y la reimpresión persisten el total
                    // con descuento y no el precio de lista.
                    nuevoValorUnitario: Number((
                        Number(item.precioUnitario) *
                        (1 - Number(item.descuento || 0) / 100) *
                        ratioDescuentoGlobal
                    ).toFixed(6)),
                    descuento: Number(item.descuento ?? 0),
                    // Precio de lista (sin descuento) para que el ticket guardado muestre el
                    // precio original y el ahorro, igual que el ticket de creación.
                    precioUnitarioOriginal: Number(item.precioUnitario),
                    // Farmacia: trazabilidad de lote y receta médica
                    ...(item.loteId != null ? { loteId: item.loteId } : {}),
                    ...(item.datosReceta?.numeroReceta ? { numeroReceta: item.datosReceta.numeroReceta } : {}),
                    ...(item.datosReceta?.dniPaciente ? { dniPaciente: item.datosReceta.dniPaciente } : {}),
                    ...(item.datosReceta?.nombrePaciente ? { nombrePaciente: item.datosReceta.nombrePaciente } : {}),
                    ...(item.datosReceta?.medicoNombre ? { medicoNombre: item.datosReceta.medicoNombre } : {}),
                    ...(item.numerosSerie ? { numerosSerie: item.numerosSerie } : {}),
                    // Fraccionamiento: unidad de venta cuando difiere de la unidad base
                    ...(item.unidadSeleccionada === 'UNIDAD' && item.unidadVentaNombre ? { unidadVenta: item.unidadVentaNombre } : {}),
                    ...(item.esItemLibre && item.unidadMedidaCodigo ? { unidadVenta: item.unidadMedidaCodigo } : {}),
                })) ?? []),
                // Monto cobrado como item de envío: aumenta el total del comprobante.
                ...(envioActivo && Number(envioData.costoEnvio) > 0 && aplicacionMontoEnvio === 'ITEM_ENVIO' ? [{
                    productoId: null,
                    descripcion: `Servicio de envío${envioData.transportista ? ` (${COURIERS.find((c) => c.value === envioData.transportista)?.label ?? envioData.transportista})` : ''}`,
                    cantidad: 1,
                    nuevoValorUnitario: Number(envioData.costoEnvio),
                    descuento: 0,
                }] : []),
            ],
            formaPagoTipo: esPagoCredito ? 'Credito' : (formValues.medioPago || 'Contado'),
            // Moneda del comprobante (PEN por defecto; USD si se eligió el toggle de moneda,
            // p. ej. en facturas de exportación). tipoCambio = TC del día cuando es USD.
            formaPagoMoneda: String(quotationCurrency).toUpperCase() === 'USD' ? 'USD' : 'PEN',
            tipoMoneda: String(quotationCurrency).toUpperCase() === 'USD' ? 'USD' : 'PEN',
            tipoCambio: String(quotationCurrency).toUpperCase() === 'USD' ? (Number(tcVenta) || undefined) : 1,
            descuento: finalDiscount,
            ...(esInformal && montoDescuentoNV > 0 ? { montoDescuentoGlobal: montoDescuentoNV } : {}),
            // Anticipos previos a regularizar (solo facturas): el backend arma el UBL de
            // regularización (AdditionalDocumentReference + PrepaidPayment + descuento).
            ...(anticipos.length > 0 && formValues?.comprobante === "FACTURA" ? { anticipos } : {}),
            leyenda: totalInWords,
            observaciones: observacionesFinal,
            ...(esPagoCredito && fechaVencimientoCredito ? { fechaVencimientoCredito } : {}),
            ...(esPagoCredito && cuotasCredito.length > 0 ? { cuotas: cuotasCredito } : {}),
            adelanto: (() => {
                const envioAdelanto = esDocumentoInformal && envioActivo && Number(envioData.costoEnvio) > 0 && aplicacionMontoEnvio === 'ADELANTO'
                    ? Number(envioData.costoEnvio)
                    : 0;
                if (esPagoCredito) return adelantoCreditoCalculado > 0 ? adelantoCreditoCalculado : undefined;
                const manualAdelanto = (formValues.tipoDoc === "NP" || formValues.tipoDoc === "OT") && adelanto > 0 ? adelanto : 0;
                const adelantoFinal = envioAdelanto > 0 ? envioAdelanto : manualAdelanto;
                return adelantoFinal > 0 ? adelantoFinal : undefined;
            })(),
            fechaRecojo: (formValues.tipoDoc === "NP" || formValues.tipoDoc === "OT") && fechaRecojoFinal ? fechaRecojoFinal : undefined,
            descontarStock: formValues.tipoDoc === "NP" ? descontarStockNP : undefined,
            cotizIncluirImagenes: isQuotationRoute ? includeProductImages : undefined,
            cotizDescuento: isQuotationRoute ? quotationDiscount : undefined,
            cotizVigencia: isQuotationRoute ? quotationValidity : undefined,
            cotizFirmante: isQuotationRoute ? quotationSignature : undefined,
            cotizTerminos: isQuotationRoute ? quotationTerms : undefined,
            cotizTipoPago: isQuotationRoute ? quotationPaymentType : undefined,
            cotizAdelanto: isQuotationRoute ? quotationAdvance : undefined,
            cotizMoneda: isQuotationRoute ? quotationCurrency : undefined,
            ...(selectedOperacion?.codigo === '0112' && !retencionData ? {
                tipoDetraccionId: tipoDetraccionId || undefined,
                medioPagoDetraccionId: medioPagoDetraccionId || undefined,
                cuentaBancoNacion: cuentaBancoNacion || undefined,
                porcentajeDetraccion: porcentajeDetraccion > 0 ? porcentajeDetraccion : undefined,
                montoDetraccion: montoDetraccion > 0 ? montoDetraccion : undefined,
                cuotas: cuotasCredito.length > 0 ? cuotasCredito : undefined,
            } : {}),
            ...(retencionData ? {
                retencionMonto: retencionData.montoDetraccion,
                retencionPorcentaje: retencionData.porcentajeDetraccion,
                cuotas: cuotasCredito.length > 0 ? cuotasCredito : undefined,
            } : {}),
        };

        const finalData: any =
            formValues.comprobante === "NOTA DE CREDITO" || formValues.comprobante === "NOTA DE DEBITO"
                ? {
                    ...baseData,
                    motivoId: formValues.motivoId,
                    tipDocAfectado: receiptNoteId,
                    numDocAfectado: `${serie.toUpperCase()}-${correlative}`,
                    montoDescuentoGlobal: Number(totalDescount),
                    montoInteresMora: Number(totalInteres)
                }
                : baseData;

        setSnapshotClient(selectedClient ? { ...selectedClient } : null);
        setDespachoCreado(false);
        setIsOpenModalSuccessInvoice(true);
        setIsLoading(true);

        let result: { success: boolean; error?: string };
        if (isEditMode && editNotaVentaId) {
            result = await updateNotaVenta(editNotaVentaId, finalData);
        } else if (isEditMode && editQuotationId) {
            result = await updateQuotation(editQuotationId, finalData);
        } else if (tiposInformales.includes(formValues.tipoDoc)) {
            result = await addInformalInvoice(finalData);
        } else {
            result = await addInvoice(finalData);
        }

        if (result.success === true) {
            setIsComprobantePendiente(!!(result as any).pendiente);
            const r = result as any;
            if (r.serie != null && r.correlativo != null) {
                setEmittedDataReceipt({ ...dataReceipt, serie: r.serie, correlativo: r.correlativo, id: r.id ?? dataReceipt?.id ?? null, total: r.mtoImpVenta ?? totalAdjusted });
            }
            // Auto-crear despacho si se completó la coordinación de envío.
            const comprobanteId = r.id ?? dataReceipt?.id ?? null;
            if (envioActivo && comprobanteId) {
                if (isCompleteEnvioDespacho(envioData)) {
                    const despachoResult = await patch(
                        `envio-despacho/comprobante/${comprobanteId}/upsert`,
                        buildEnvioDespachoPayload({ ...envioData, aplicacionMontoCliente: aplicacionMontoEnvio }),
                    );
                    if (despachoResult.success === false || despachoResult.error) {
                        useAlertStore.getState().alert(
                            `La venta se guardó, pero no se pudo crear el despacho: ${despachoResult.error || 'verifique los datos de envío'}`,
                            'warning',
                        );
                    } else {
                        setDespachoCreado(true);
                    }
                } else {
                    useAlertStore.getState().alert(
                        'La venta se guardó, pero el despacho no se creó porque faltan courier, destino, celular o turno de envío.',
                        'warning',
                    );
                }
            }
            setIsLoading(false);
        } else {
            setIsOpenModalSuccessInvoice(false);
            setIsLoading(false);
        }
    };

    const receiptsToNote = [{ id: "01", value: "FACTURA" }, { id: "03", value: "BOLETA" }];
    let replaceToFilter = formValues?.comprobante?.replace("NOTA DE ", "");
    const typesOperation = creditDebitNoteTypes?.filter((item: any) => item?.tipo === replaceToFilter);

    useEffect(() => {
        if (invoiceData !== null) {
            setSelectedClient({
                nombre: invoiceData?.cliente?.nombre,
                direccion: invoiceData?.cliente?.direccion,
                nroDoc: invoiceData?.cliente?.nroDoc
            })
            setFormValues({
                ...formValues,
                clienteNombre: `${invoiceData?.cliente?.nroDoc}-${invoiceData?.cliente?.nombre}`
            })
        }
    }, [invoiceData])

    // Hotel: si el producto de la empresa es HOTEL y el cliente no es RUC, sugerir 0202 (Hospedaje no domiciliados)
    useEffect(() => {
        if (formValues.comprobante !== "FACTURA") return;
        const productoEmpresa = String(auth?.empresa?.producto ?? '').toLowerCase();
        if (productoEmpresa !== 'hotel') return;

        const cliTipoDoc = String((selectedClient as any)?.tipoDocumento?.codigo ?? '').trim();
        if (!cliTipoDoc || cliTipoDoc === '6') return;

        const op0202 = tiposOperacion.find((op: any) => op.codigo === '0202');
        if (!op0202) return;

        const currentOp = tiposOperacion.find((op: any) => op.id === formValues.tipoOperacionId);
        if (!currentOp || currentOp.codigo === '0101') {
            setFormValues(prev => ({ ...prev, tipoOperacionId: op0202.id }));
        }
    }, [auth?.empresa?.producto, formValues.comprobante, formValues.tipoOperacionId, selectedClient, tiposOperacion]);

    const getDocumentInvoice = async () => {
        const motivoIdForNotes = ["NOTA DE CREDITO", "NOTA DE DEBITO"].includes(formValues.comprobante) ? formValues.motivoId : undefined;
        const result = await getInvoiceBySerieCorrelative(debounceSerie.toUpperCase(), debounceCorrelative, motivoIdForNotes);
        if (result.error) return useAlertStore.getState().alert(`${result.error}`, 'error');
    }

    const closeModal = () => {
        setIsOpenModalClient(false);
        setIsOpenModalProduct(false)
    }

    const ruc = auth?.empresa?.ruc || auth?.empresa?.nroDoc || "";
    const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');

    useEffect(() => {
        if (!ruc) return;
        const generateQR = async () => {
            try {
                const dataUrl = await QRCode.toDataURL(ruc);
                setQrCodeDataUrl(dataUrl);
            } catch (e) { }
        };
        generateQR();
    }, [ruc]);

    const [dimensions, setDimensions] = useState({ width: 80, height: 297 });

    useEffect(() => {
        switch (printSize) {
            case 'TICKET': setDimensions({ width: 80, height: 297 }); break;
            case 'A5': setDimensions({ width: 148, height: 210 }); break;
            case 'A4': setDimensions({ width: 210, height: 297 }); break;
        }
    }, [printSize]);

    const selectOperation = tiposOperacion.find(op => op.id === formValues.tipoOperacionId);

    useEffect(() => {
        if (totalAdjusted < 700 && retencionData) {
            setRetencionData(null);
            return;
        }
        if (totalAdjusted >= 700 && auth?.empresa?.esAgenteRetencion && selectOperation?.codigo !== "0112" && !retencionData) {
            const monto = Number((totalAdjusted * 0.03).toFixed(2));
            setRetencionData({
                montoDetraccion: monto,
                porcentajeDetraccion: 3
            });
        }
    }, [totalAdjusted, retencionData, auth?.empresa?.esAgenteRetencion, selectOperation?.codigo]);

    const [showMobileCart, setShowMobileCart] = useState(false);

    const closeModalResponse = () => {
        setIsOpenModalSuccessInvoice(false);
        setEmittedDataReceipt(null);
        setSnapshotClient(null);
        setDespachoCreado(false);
        const ventaInterna = tiposOperacion.find((op: any) => op.codigo === '0101');
        setFormValues({
            ...initFormValues,
            comprobante: formValues?.comprobante,
            tipoDoc: formValues.tipoDoc,
            vuelto: 0,
            tipoOperacionId: ventaInterna ? ventaInterna.id : initFormValues.tipoOperacionId
        });
        setPay(0);
        setChange(0);
        setPaymentMethod('Efectivo');
        setIsMixedPayment(false);
        setSplitPayments([{ method: 'Efectivo', amount: 0 }, { method: 'Yape', amount: 0 }]);
        resetInvoice();
        resetProductInvoice();
        if (LABELS_CLIENTES_VARIOS.includes(formValues?.comprobante)) {
            const clientSelect: any = clients?.find((item: any) => "10000000" === item.nroDoc);
            setSelectedClient(clientSelect ? clientSelect : { nroDoc: "10000000", nombre: "CLIENTES VARIOS" });
            setFormValues(prev => ({ ...prev, clienteNombre: "CLIENTES VARIOS", clienteId: clientSelect ? Number(clientSelect.id) || 0 : 0 }));
        } else {
            setSelectedClient(null);
        }
        setSelectProduct(null);
        setSerie("");
        setCorrelative("");
        setRetencionData(null);
        setTipoDetraccionId(undefined);
        setMedioPagoDetraccionId(undefined);
        setCuentaBancoNacion('');
        setPorcentajeDetraccion(0);
        setMontoDetraccion(0);
        setCuotas([]);
        setTimeout(() => getSerieAndCorrelativeByReceipt(auth?.empresa?.id, formValues?.tipoDoc), 1000);
        // Re-fetch products so the POS catalog reflects the updated stock after the sale
        const refreshParams: any = { page, limit };
        if (sedeActiva?.id) refreshParams.sedeId = sedeActiva.id;
        getAllProducts(refreshParams, () => {}, true);
    };

    const componentRef = null; // Will be bound at view layer by useReactToPrint

    const authWithBranding = useMemo(() => {
        if (!auth?.empresa || !resellerBranding) return auth;
        return { ...auth, empresa: { ...auth.empresa, reseller: resellerBranding } };
    }, [auth, resellerBranding]);

    return {
        // Core State
        auth,
        authWithBranding,
        resellerBranding,
        isMobile,
        zoomLevel,
        isQuotationRoute,
        productsInvoice,
        showFreeQuoteItemForm, setShowFreeQuoteItemForm,
        freeQuoteItem, setFreeQuoteItem,
        anticipos, agregarAnticipo, eliminarAnticipo, totalAnticipos,

        // Cobranza en campo: vendedor de campo atribuido a la venta
        cobranzaCampo,
        vendedoresCampo: usuarios,
        vendedorCampoId, setVendedorCampoId,

        // Form & Selections
        formValues, setFormValues,
        paymentMethod, setPaymentMethod,
        paymentDetail, setPaymentDetail,
        buildPaymentDetails,
        isMixedPayment, setIsMixedPayment,
        splitPayments, setSplitPayments,
        adelanto, setAdelanto,
        adelantoMetodo, setAdelantoMetodo,
        fechaRecojo, setFechaRecojo,
        descontarStockNP, setDescontarStockNP,
        fechaEmisionManual, setFechaEmisionManual,
        fechaEmisionMinDate: (() => {
            const tipoDoc = (formValues as any)?.tipoDoc;
            const diasAtras = tipoDoc === '01' ? 3 : tipoDoc === '03' ? 5 : 0;
            const d = new Date();
            d.setDate(d.getDate() - diasAtras);
            return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        })(),
        fechaEmisionMaxDate: todayStr,
        fechaEmisionDiasAtras: (formValues as any)?.tipoDoc === '01' ? 3 : (formValues as any)?.tipoDoc === '03' ? 5 : 0,
        selectedClient, setSelectedClient,
        snapshotClient,
        selectedProduct, setSelectProduct,

        // Masters
        tiposOperacion, typesOperation,
        tiposDetraccion, mediosPagoDetraccion,
        comprobantesGenerar, receiptsToNote,
        categories, clients,
        filteredProducts: usaLotesFarmacia ? farmaciaProductos : products,
        filteredCombos,
        catalogItems,
        totalProducts: usaLotesFarmacia ? farmaciaTotal : totalProducts,
        farmaciaLoading,

        // Farmacia flags
        isFarmaciaRetail,
        esDrogueria,
        habilitaRecetaMedica,
        usaLotesFarmacia,
        usarPrecioLoteFefo,
        togglePrecioLoteFefo,
        togglingPrecioLote,

        // Fraccionamiento
        modoFraccionPorProducto,
        setModoFraccionProducto,

        // Modal triggers
        isOpenModalClient, setIsOpenModalClient,
        openClientModal,
        isOpenClientLookupConfirm,
        pendingClientLookup,
        clientLookupConfirmLoading,
        handleConfirmPendingClientLookup,
        handleCancelPendingClientLookup,
        isOpenModalProduct, setIsOpenModalProduct,
        isModalDetraccionOpen, setIsModalDetraccionOpen,
        isModalCuotasOpen, setIsModalCuotasOpen,
        isModalRetencionOpen, setIsModalRetencionOpen,
        isQuotationConfigModalOpen, setIsQuotationConfigModalOpen,
        IsOpenModalSuccessInvoice, setIsOpenModalSuccessInvoice,
        isComprobantePendiente,
        despachoCreado,
        showMobileCart, setShowMobileCart,
        editingIndex, setEditingIndex,

        // Barcode scanner
        barcodeInput, setBarcodeInput,
        barcodeLoading, barcodeRef,
        handleBarcodeScan,

        // Envío nacional
        envioActivo, setEnvioActivo,
        envioData, setEnvioData,
        // Descuento % y condición de pago para informales
        descuentoPctNV, setDescuentoPctNV,
        descuentoSolesNV, setDescuentoSolesNV,
        descuentoModoNV, setDescuentoModoNV,
        fechaVencimientoCredito, setFechaVencimientoCredito,
        esInformal,
        esFacturaOBoleta,

        // Farmacia: receta modal
        isRecetaModalOpen, setIsRecetaModalOpen,
        recetaModalItemIndex,
        handleConfirmarReceta,
        handleAbrirRecetaModal,

        // Handlers
        handleProductClick,
        varianteModalProduct, setVarianteModalProduct, handleSelectVariante,
        handleAddFreeQuoteItem,
        handleComboClick,
        handleDeleteProduct,
        handleDeleteProductByIndex,
        handleSaveEdit,
        handleSelectWholesaleTier,
        getApplicablePrice,
        updateProductInvoice,
        handleChangeSelect,
        handleGetDataClient,
        handleClienteCreado,
        handleClienteDocLookup,
        clienteDocLookupLoading,
        addInvoiceReceipt,
        closeModal,
        closeModalResponse,
        calculateLineItem,
        handleSaveDetraccion,
        handleSaveRetencion,
        handleSaveQuotationConfig,
        getDocumentInvoice,
        getInvoiceBySerieCorrelative,

        // Search & Pagination
        searchTerm, setSearchTerm,
        selectedCategoryId, setSelectedCategoryId,
        page, setPage,
        limit, setLimit,
        pages, indexOfFirstItem, indexOfLastItem,

        // Derived Logic
        totalAdjusted, totalCredito, total, productDiscount, hasDiscount,
        opGravadaAdjusted, igvAdjusted, opExoneradaAdjusted, opInafectaAdjusted, finalDiscount, totalInWords,
        montoRecibido, vueltoCalculado, isCashPayment,

        // References & Inputs
        serie, setSerie,
        correlative, setCorrelative,
        receiptNoteId, setReceiptNoteId,
        dataReceipt: emittedDataReceipt ?? dataReceipt, invoiceData,
        pay, setPay,
        qrCodeDataUrl,

        // Note/Quotation Fields
        includeProductImages, setIncludeProductImages,
        quotationDiscount, quotationValidity,
        quotationSignature, quotationTerms, setQuotationTerms,
        quotationPaymentType, quotationAdvance,
        quotationCurrency, setQuotationCurrency, handleChangeQuotationCurrency,
        monedaSimbolo,

        // Sub-states
        tipoDetraccionId, montoDetraccion, cuentaBancoNacion, cuotas, retencionData,
        medioPagoDetraccionId, setMedioPagoDetraccionId,
        setTipoDetraccionId, setMontoDetraccion, setCuentaBancoNacion, setCuotas, setRetencionData,
        porcentajeDetraccion, setPorcentajeDetraccion,

        // Printing (ref and sizes extracted partially to view)
        printSize, setPrintSize, dimensions,

        // Global Errors & others
        errors, errorsProduct, errorsClient,
        setErrorsProduct, setErrorsClient,
        formValuesProduct, setFormValuesProduct,
        formValuesClient, setFormValuesClient,
        initialFormProduct, initialFormClient,
        isLoading,
        isEditMode,
        isEditNotaVenta: editNotaVentaId != null,
    };
};
