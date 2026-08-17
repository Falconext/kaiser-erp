import { useState, useEffect } from "react";
import { format } from "date-fns";
import moment from "moment";
import { Icon } from "@iconify/react";
import Modal from "@/components/Modal";
import InputPro from "@/components/InputPro";
import { Calendar } from "@/components/Date";


import Select from "@/components/Select";
import Button from "@/components/Button";
import SelectUbigeo from "@/components/Select/SelectUbigeo";
import TrasladoTypeSelect from "@/components/Select/TrasladoTypeSelect";
import DataTable from "@/components/Datatable";
import { useGuiaRemisionStore, IGuiaRemision, IDetalleGuiaRemision } from "@/zustand/guia-remision";
import { useExtentionsStore } from "@/zustand/extentions";
import { useAuthStore } from "@/zustand/auth";
import { useClientsStore } from "@/zustand/clients";
import { useProductsStore } from "@/zustand/products";
import useAlertStore from "@/zustand/alert";
import ComprobanteSearchModal from "./ComprobanteSearchModal";

const MODO_TRANSPORTE_OPTIONS = [
    { id: "01", value: "TRANSPORTE PÚBLICO" },
    { id: "02", value: "TRANSPORTE PRIVADO" },
];

const UNIDAD_PESO_OPTIONS = [
    { id: "KGM", value: "KILOGRAMOS" },
    { id: "TNE", value: "TONELADAS" },
];

const TIPO_DOC_OPTIONS = [
    { id: "6", value: "RUC" },
    { id: "1", value: "DNI" },
    { id: "4", value: "CARNET EXTRANJERÍA" },
    { id: "7", value: "PASAPORTE" },
];

interface ModalGuiaRemisionProps {
    isOpen: boolean;
    /** Comprobante (Factura/Boleta) desde el que se genera la guía: se importa
     *  automáticamente al abrir (destinatario, dirección de llegada y bienes). */
    prefillComprobante?: { id: number; serie?: string; correlativo?: number } | null;
    onClose: () => void;
    onSuccess?: () => void;
    guiaToEdit?: any;
}

const TIPO_GUIA_OPTIONS = [
    { id: "REMITENTE", value: "GUÍA DE REMISIÓN REMITENTE" },
    { id: "TRANSPORTISTA", value: "GUÍA DE REMISIÓN TRANSPORTISTA" },
];

const MOTIVO_HELP: Record<string, { title: string; description: string; tip: string }> = {
    "01": {
        title: "Venta",
        description: "Usa este motivo cuando entregas bienes por una venta realizada.",
        tip: "Verifica que el destinatario y la dirección de llegada correspondan al cliente receptor.",
    },
    "02": {
        title: "Compra",
        description: "Usa este motivo cuando trasladas bienes comprados a un proveedor.",
        tip: "Registra al proveedor en destinatario y recuerda que SUNAT considera destinatario final a tu empresa.",
    },
    "04": {
        title: "Traslado entre establecimientos",
        description: "Usa este motivo para mover stock entre sedes de la misma empresa.",
        tip: "Completa códigos de establecimiento en partida y llegada para evitar observaciones.",
    },
    "05": {
        title: "Consignación",
        description: "Usa este motivo cuando entregas bienes en consignación (el cliente aún no los compra).",
        tip: "El destinatario es el consignatario; la venta se sustenta después con su comprobante.",
    },
    "14": {
        title: "Venta sujeta a confirmación",
        description: "Usa este motivo cuando la venta será confirmada por el comprador.",
        tip: "Verifica destinatario, dirección de llegada y transportista antes de enviar.",
    },
    "18": {
        title: "Emisor itinerante CP",
        description: "Usa este motivo para operaciones con emisión itinerante.",
        tip: "Este caso no envía código de establecimiento en partida ni llegada.",
    },
    "13": {
        title: "Otros",
        description: "Usa este motivo cuando no aplica una causal específica del catálogo.",
        tip: "Detalla claramente la razón del traslado en observaciones.",
    },
};

const MODO_HELP: Record<string, { title: string; required: string[]; tip: string }> = {
    "01": {
        title: "Transporte público",
        required: ["RUC transportista", "Razón social transportista"],
        tip: "Si la guía es tipo TRANSPORTISTA también debes registrar el número MTC.",
    },
    "02": {
        title: "Transporte privado",
        required: ["Placa de vehículo", "Documento del conductor"],
        tip: "Completa también nombre y licencia del conductor para reducir rechazos.",
    },
};

const ModalGuiaRemision = ({ isOpen, onClose, onSuccess, guiaToEdit, prefillComprobante }: ModalGuiaRemisionProps) => {
    const { auth } = useAuthStore();
    const { createGuiaRemision, updateGuiaRemision, getSiguienteCorrelativo, siguienteCorrelativo, prefillDesdeComprobante, importarItemsExcel, descargarPlantillaItems } = useGuiaRemisionStore();
    const { getUbigeos, ubigeos } = useExtentionsStore();
    const { getClientFromDoc } = useClientsStore();
    const { getAllProducts, products, resetProducts } = useProductsStore();

    const [productOptions, setProductOptions] = useState<any[]>([]);

    const [formValues, setFormValues] = useState<IGuiaRemision>({
        tipoGuia: "REMITENTE",
        serie: "T001",
        correlativo: 0,
        fechaEmision: format(new Date(), "yyyy-MM-dd"),
        horaEmision: format(new Date(), "HH:mm:ss"),
        tipoDocumento: "09",
        remitenteRuc: auth?.empresa?.ruc || "",
        remitenteRazonSocial: auth?.empresa?.razonSocial || "",
        remitenteDireccion: auth?.empresa?.direccion || "",
        destinatarioTipoDoc: "6",
        destinatarioNumDoc: "",
        destinatarioRazonSocial: "",
        tipoTraslado: "01",
        modoTransporte: "02",
        pesoTotal: 0,
        unidadPeso: "KGM",
        partidaUbigeo: auth?.empresa?.ubicacion?.codigo || "",
        partidaDireccion: auth?.empresa?.direccion || "",
        partidaCodigoEstablecimiento: "0000",
        llegadaUbigeo: "",
        llegadaDireccion: "",
        llegadaCodigoEstablecimiento: "0000",
        fechaInicioTraslado: format(new Date(), "yyyy-MM-dd"),
        retornoVehiculoVacio: false,
        retornoEnvasesVacios: false,
        transbordoProgramado: false,
        trasladoTotal: false,
        vehiculoM1oL: false,
        datosTransportista: false,
        detalles: []
    });

    const isGuiaTransportista = formValues.tipoGuia === "TRANSPORTISTA";
    const isCompra = formValues.tipoTraslado === "02";
    const isTrasladoMismaEmpresa = formValues.tipoTraslado === "04";
    const selectedMotivoHelp = MOTIVO_HELP[formValues.tipoTraslado] || {
        title: "Motivo seleccionado",
        description: "Completa los datos del traslado según el motivo elegido.",
        tip: "Revisa destinatario, puntos de partida/llegada y transporte antes de guardar.",
    };
    const selectedModoHelp = MODO_HELP[formValues.modoTransporte] || {
        title: "Modo de transporte",
        required: [],
        tip: "Completa todos los datos del traslado según corresponda.",
    };
    const destinatarioDocHint =
        formValues.destinatarioTipoDoc === "6"
            ? "RUC: 11 dígitos"
            : formValues.destinatarioTipoDoc === "1"
                ? "DNI: 8 dígitos"
                : "Documento válido según tipo seleccionado";

    const [newItem, setNewItem] = useState<Partial<IDetalleGuiaRemision>>({
        cantidad: 1,
        unidadMedida: "NIU"
    });
    const [selectedProductValue, setSelectedProductValue] = useState<string>("");
    const [isComprobanteModalOpen, setIsComprobanteModalOpen] = useState(false);
    // Referencia del comprobante importado (p.ej. "F001-00000333") para feedback visual
    const [importedRef, setImportedRef] = useState<string | null>(null);

    // Flujo "desde la factura": si el modal se abre con un comprobante origen,
    // importar sus datos automáticamente (destinatario, llegada y bienes).
    useEffect(() => {
        if (isOpen && !guiaToEdit?.id && prefillComprobante?.id) {
            void handleImportComprobante(prefillComprobante);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, prefillComprobante?.id]);
    const [isEditQtyModalOpen, setIsEditQtyModalOpen] = useState(false);
    const [editingQtyIndex, setEditingQtyIndex] = useState<number | null>(null);
    const [editingQtyValue, setEditingQtyValue] = useState<number>(1);

    // Cargar datos al abrir modal
    useEffect(() => {
        if (isOpen) {
            getUbigeos();
            resetProducts();
            setCurrentStep(1);
            setImportedRef(null);

            if (guiaToEdit?.id) {
                // Modo Edición
                loadGuiaData(guiaToEdit);
            } else if (guiaToEdit) {
                const initialSerie = guiaToEdit.serie || "T001";
                getSiguienteCorrelativo(initialSerie);
                setFormValues(prev => ({
                    ...prev,
                    ...guiaToEdit,
                    serie: initialSerie,
                    correlativo: 0,
                    fechaEmision: format(new Date(), "yyyy-MM-dd"),
                    horaEmision: format(new Date(), "HH:mm:ss"),
                    remitenteRuc: auth?.empresa?.ruc || prev.remitenteRuc,
                    remitenteRazonSocial: auth?.empresa?.razonSocial || prev.remitenteRazonSocial,
                    remitenteDireccion: auth?.empresa?.direccion || prev.remitenteDireccion,
                    partidaUbigeo: auth?.empresa?.ubigeo || prev.partidaUbigeo,
                    partidaDireccion: auth?.empresa?.direccion || prev.partidaDireccion,
                    detalles: (guiaToEdit.detalles || []).map((d: any) => ({
                        ...d,
                        cantidad: Number(d.cantidad || 1),
                    })),
                }));
                setNewItem({
                    cantidad: 1,
                    unidadMedida: "NIU"
                });
                setSelectedProductValue("");
                setIsEditQtyModalOpen(false);
                setEditingQtyIndex(null);
                setEditingQtyValue(1);
            } else {
                // Modo Creación
                const initialSerie = "T001";
                getSiguienteCorrelativo(initialSerie);

                setFormValues({
                    tipoGuia: "REMITENTE",
                    serie: initialSerie,
                    correlativo: 0,
                    fechaEmision: format(new Date(), "yyyy-MM-dd"),
                    horaEmision: format(new Date(), "HH:mm:ss"),
                    tipoDocumento: "09",
                    remitenteRuc: auth?.empresa?.ruc || "",
                    remitenteRazonSocial: auth?.empresa?.razonSocial || "",
                    remitenteDireccion: auth?.empresa?.direccion || "",
                    destinatarioTipoDoc: "6",
                    destinatarioNumDoc: "",
                    destinatarioRazonSocial: "",
                    tipoTraslado: "01",
                    modoTransporte: "01",
                    pesoTotal: 0,
                    unidadPeso: "KGM",
                    // Transportista
                    transportistaRuc: "",
                    transportistaRazonSocial: "",
                    transportistaMTC: "",
                    // Remitente de bienes (solo GRE-T)
                    greTRemitenteNumDoc: "",
                    greTRemitenteRazonSocial: "",
                    // Conductor
                    conductorTipoDoc: "",
                    conductorNumDoc: "",
                    conductorNombre: "",
                    conductorApellidos: "",
                    conductorLicencia: "",
                    vehiculoPlaca: "",
                    vehiculoAutorizacion: "",
                    // Ubicaciones
                    partidaUbigeo: auth?.empresa?.ubigeo || "",
                    partidaDireccion: auth?.empresa?.direccion || "",
                    partidaCodigoEstablecimiento: "0000",
                    llegadaUbigeo: "",
                    llegadaDireccion: "",
                    llegadaCodigoEstablecimiento: "0000",
                    // Fechas
                    fechaInicioTraslado: format(new Date(), "yyyy-MM-dd"),
                    // Indicadores
                    retornoVehiculoVacio: false,
                    retornoEnvasesVacios: false,
                    transbordoProgramado: false,
                    trasladoTotal: false,
                    vehiculoM1oL: false,
                    datosTransportista: false,
                    detalles: []
                });
                setNewItem({
                    cantidad: 1,
                    unidadMedida: "NIU"
                });
                setSelectedProductValue("");
                setIsEditQtyModalOpen(false);
                setEditingQtyIndex(null);
                setEditingQtyValue(1);
            }
        }
    }, [isOpen, guiaToEdit]);

    const loadGuiaData = async (guia: any) => {
        // Obtenemos data fresca del backend para asegurar detalles completos
        const { getGuiaRemision } = useGuiaRemisionStore.getState();
        await getGuiaRemision(guia.id);
        const fullGuiaResponse = useGuiaRemisionStore.getState().guiaRemisionActual || guia;

        // Unwrap data if nested
        const fullGuia = fullGuiaResponse.data || fullGuiaResponse;

        // Mapeo seguro de datos
        const esTrasladoMismaEmpresa = fullGuia.tipoTraslado === '04';
        const empresa = auth?.empresa;

        setFormValues(prev => ({
            ...prev, // Mantener defaults
            ...fullGuia,
            // Ensure booleans and other specific fields are correctly mapped if they are missing/null in fullGuia
            pesoTotal: Number(fullGuia.pesoTotal) || 0,
            // Si es traslado entre establecimientos, forzar destinatario = empresa propia
            destinatarioTipoDoc: esTrasladoMismaEmpresa ? '6' : (fullGuia.destinatarioTipoDoc || prev.destinatarioTipoDoc),
            destinatarioNumDoc: esTrasladoMismaEmpresa ? (empresa?.ruc || '') : (fullGuia.destinatarioNumDoc || ''),
            destinatarioRazonSocial: esTrasladoMismaEmpresa ? (empresa?.razonSocial || '') : (fullGuia.destinatarioRazonSocial || ''),
            // Asegurar fechas con UTC
            fechaEmision: fullGuia.fechaEmision ? moment.utc(fullGuia.fechaEmision).format("YYYY-MM-DD") : prev.fechaEmision,
            fechaInicioTraslado: fullGuia.fechaInicioTraslado ? moment.utc(fullGuia.fechaInicioTraslado).format("YYYY-MM-DD") : prev.fechaInicioTraslado,
            partidaCodigoEstablecimiento: esTrasladoMismaEmpresa
                ? (fullGuia.partidaCodigoEstablecimiento && fullGuia.partidaCodigoEstablecimiento !== '0000' ? fullGuia.partidaCodigoEstablecimiento : '0700')
                : (fullGuia.partidaCodigoEstablecimiento || prev.partidaCodigoEstablecimiento || "0000"),
            llegadaCodigoEstablecimiento: esTrasladoMismaEmpresa
                ? (fullGuia.llegadaCodigoEstablecimiento && fullGuia.llegadaCodigoEstablecimiento !== '0000' ? fullGuia.llegadaCodigoEstablecimiento : '0700')
                : (fullGuia.llegadaCodigoEstablecimiento || prev.llegadaCodigoEstablecimiento || "0000"),
            detalles: (fullGuia.detalles || []).map((d: any) => ({
                ...d,
                cantidad: Number(d.cantidad)
            }))
        }));
    };

    useEffect(() => {
        if (siguienteCorrelativo) {
            // Parse correlativo if it's an object
            const correlativoValue = typeof siguienteCorrelativo === 'object'
                ? (siguienteCorrelativo as any).correlativo || 0
                : siguienteCorrelativo;
            setFormValues(prev => ({ ...prev, correlativo: correlativoValue }));
        }
    }, [siguienteCorrelativo]);

    // Update product options when store changes
    useEffect(() => {
        setProductOptions((products || []).map(p => ({
            id: p.id,
            value: `${p.codigo} - ${p.descripcion}`,
            data: p
        })));
    }, [products]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        const val = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
        setFormValues(prev => ({ ...prev, [name]: val }));
    };

    const handleBuscarDocumento = (tipo: 'destinatario' | 'transportista' | 'greTRemitente') => {
        const doc = tipo === 'destinatario'
            ? formValues.destinatarioNumDoc
            : tipo === 'transportista'
                ? formValues.transportistaRuc
                : formValues.greTRemitenteNumDoc;
        const cleanDoc = String(doc || '').trim();
        if (![8, 11].includes(cleanDoc.length)) {
            useAlertStore.getState().alert('Ingresa un DNI de 8 dígitos o RUC de 11 dígitos para buscar.', 'warning');
            return;
        }
        void handleReniecLookup(cleanDoc, tipo);
    };

    const handleReniecLookup = async (doc: string, tipo: 'destinatario' | 'transportista' | 'greTRemitente') => {
        const result = await getClientFromDoc(doc);
        if (result) {
            if (tipo === 'destinatario') {
                setFormValues(prev => ({
                    ...prev,
                    destinatarioRazonSocial: result.nombre_completo || result.nombre_o_razon_social || "",
                    llegadaDireccion: isCompra ? prev.llegadaDireccion : (result.direccion || prev.llegadaDireccion),
                    llegadaUbigeo: isCompra ? prev.llegadaUbigeo : (result.ubigeo_sunat || prev.llegadaUbigeo),
                    destinatarioTipoDoc: doc.length === 8 ? "1" : "6"
                }));
            } else if (tipo === 'transportista') {
                setFormValues(prev => ({
                    ...prev,
                    transportistaRazonSocial: result.nombre_completo || result.nombre_o_razon_social || ""
                }));
            } else if (tipo === 'greTRemitente') {
                setFormValues(prev => ({
                    ...prev,
                    greTRemitenteRazonSocial: result.nombre_completo || result.nombre_o_razon_social || ""
                }));
            }
        }
    };

    const handleSelectChange = (_idValue: any, value: any, name: any, id: any) => {
        if (name === 'tipoTraslado') {
            const updates: any = { tipoTraslado: _idValue };
            if (_idValue === '04') {
                updates.destinatarioTipoDoc = '6';
                updates.destinatarioNumDoc = auth?.empresa?.ruc || '';
                updates.destinatarioRazonSocial = auth?.empresa?.razonSocial || '';
                updates.partidaCodigoEstablecimiento = '0700';
                updates.llegadaCodigoEstablecimiento = '0700';
            } else if (formValues.tipoTraslado === '04') {
                updates.destinatarioNumDoc = '';
                updates.destinatarioRazonSocial = '';
                updates.partidaCodigoEstablecimiento = '0000';
                updates.llegadaCodigoEstablecimiento = '0000';
            }
            setFormValues(prev => ({ ...prev, ...updates }));
            return;
        }
        setFormValues(prev => ({ ...prev, [name]: _idValue }));
    };

    const handleTipoGuiaChange = (id: any, value: string) => {
        const tipoGuia = String(id) as "REMITENTE" | "TRANSPORTISTA";
        const nuevaSerie = tipoGuia === "REMITENTE" ? "T001" : "V001";
        setFormValues(prev => ({ 
            ...prev, 
            tipoGuia,
            serie: nuevaSerie,
            tipoDocumento: tipoGuia === "TRANSPORTISTA" ? "31" : "09",
        }));
        // Obtener nuevo correlativo para la nueva serie
        getSiguienteCorrelativo(nuevaSerie);
    };

    const handleDateChange = (value: any, name: string) => {
        // Calendar returns DD/MM/YYYY, convert to yyyy-MM-dd for state
        // Check if value is valid before formatting to avoid invalid date errors
        if (value) {
            const date = moment(value, "DD/MM/YYYY").format("YYYY-MM-DD");
            // Validar que sea una fecha válida antes de setear
            if (date !== "Invalid date") {
                setFormValues(prev => ({ ...prev, [name]: date }));
            }
        }
    };

    const handleProductSearch = (query: string, cb: () => void) => {
        getAllProducts({ search: query, limit: 20 }, cb);
    };

    const handleProductChange = (id: any, value: string) => {
        setSelectedProductValue(value || "");
        const prod = products.find(p => p.id === Number(id));
        if (prod) {
            setNewItem({
                productoId: prod.id,
                codigoProducto: prod.codigo,
                descripcion: prod.descripcion,
                unidadMedida: prod.unidadMedida?.nombre || "NIU",
                cantidad: 1
            });
        }
    };

    // ── Importar datos desde una Factura/Boleta emitida ──
    const handleImportComprobante = async (comprobante: any) => {
        if (!comprobante?.id) return;
        const res = await prefillDesdeComprobante(comprobante.id);
        if (!res.success || !res.data) return;
        const d = res.data;
        setFormValues(prev => {
            // En COMPRA/traslado misma empresa el destinatario está bloqueado a la
            // propia empresa; no lo sobre-escribimos con el cliente del comprobante.
            const bloquearDestinatario = prev.tipoTraslado === "02" || prev.tipoTraslado === "04";
            return {
                ...prev,
                ...(bloquearDestinatario ? {} : {
                    destinatarioTipoDoc: d.destinatarioTipoDoc || prev.destinatarioTipoDoc,
                    destinatarioNumDoc: d.destinatarioNumDoc || prev.destinatarioNumDoc,
                    destinatarioRazonSocial: d.destinatarioRazonSocial || prev.destinatarioRazonSocial,
                    clienteId: d.clienteId ?? prev.clienteId,
                    llegadaDireccion: d.llegadaDireccion || prev.llegadaDireccion,
                    llegadaUbigeo: d.llegadaUbigeo || prev.llegadaUbigeo,
                }),
                observaciones: d.observaciones || prev.observaciones,
                detalles: (d.detalles || []).map((it: any) => ({
                    productoId: it.productoId,
                    codigoProducto: it.codigoProducto || "",
                    descripcion: it.descripcion,
                    cantidad: Number(it.cantidad) || 1,
                    unidadMedida: it.unidadMedida || "NIU",
                })),
            };
        });
        if (comprobante.serie && comprobante.correlativo != null) {
            setImportedRef(`${comprobante.serie}-${String(comprobante.correlativo).padStart(8, '0')}`);
            useAlertStore.getState().alert(`Datos importados de ${comprobante.serie}-${comprobante.correlativo}`, "success");
        } else {
            setImportedRef('comprobante');
            useAlertStore.getState().alert('Datos del comprobante importados', 'success');
        }
    };

    // ── Importar ítems desde un archivo Excel/CSV ──
    const handleExcelImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        e.target.value = ""; // permite re-subir el mismo archivo
        if (!file) return;
        const base64: string = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result || ""));
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
        const res = await importarItemsExcel(base64);
        if (!res.success || !res.items) return;
        setFormValues(prev => ({
            ...prev,
            detalles: [...prev.detalles, ...res.items!.map((it: any) => ({
                productoId: it.productoId,
                codigoProducto: it.codigoProducto || "",
                descripcion: it.descripcion,
                cantidad: Number(it.cantidad) || 1,
                unidadMedida: it.unidadMedida || "NIU",
            }))],
        }));
        const nErr = res.errores?.length || 0;
        useAlertStore.getState().alert(
            `${res.items.length} ítem(s) importado(s)${nErr ? ` · ${nErr} fila(s) con error` : ""}`,
            nErr ? "warning" : "success",
        );
    };

    const addItem = () => {
        if (!newItem.descripcion || !newItem.cantidad) {
            useAlertStore.getState().alert("Complete los datos del producto", "warning");
            return;
        }

        setFormValues(prev => ({
            ...prev,
            detalles: [...prev.detalles, newItem as IDetalleGuiaRemision]
        }));

        setNewItem({ cantidad: 1, unidadMedida: "NIU" });
        setSelectedProductValue("");
    };

    const updateItemQuantity = (index: number, cantidad: number) => {
        if (!Number.isFinite(cantidad) || cantidad <= 0) {
            useAlertStore.getState().alert("La cantidad debe ser mayor a 0", "warning");
            return;
        }

        setFormValues(prev => ({
            ...prev,
            detalles: prev.detalles.map((detalle, i) =>
                i === index ? { ...detalle, cantidad } : detalle
            )
        }));
    };

    const handleEditCantidad = (row: any) => {
        const index = Number(row.__index);
        if (index < 0 || Number.isNaN(index)) return;
        const currentQty = Number(row.cantidad) || 1;
        setEditingQtyIndex(index);
        setEditingQtyValue(currentQty);
        setIsEditQtyModalOpen(true);
    };

    const handleSaveEditCantidad = () => {
        if (editingQtyIndex === null) return;
        updateItemQuantity(editingQtyIndex, Number(editingQtyValue));
        setIsEditQtyModalOpen(false);
        setEditingQtyIndex(null);
    };

    const removeItem = (index: number) => {
        setFormValues(prev => ({
            ...prev,
            detalles: prev.detalles.filter((_, i) => i !== index)
        }));
    };

    const detallesTableData = (formValues.detalles || []).map((item: any, index: number) => ({
        nro: index + 1,
        codigo: item.codigoProducto,
        descripcion: item.descripcion,
        unidad: item.unidadMedida,
        cantidad: item.cantidad,
        __index: index,
    }));

    const detallesTableColumns = [
        { label: '#', key: 'nro' },
        { label: 'Código', key: 'codigo' },
        { label: 'Descripción', key: 'descripcion' },
        { label: 'Unidad', key: 'unidad' },
        { label: 'Cantidad', key: 'cantidad' },
    ];

    const detallesTableActions = [
        {
            tooltip: 'Editar cantidad',
            icon: <Icon icon="solar:pen-bold" className="text-blue-500" />,
            onClick: (row: any) => handleEditCantidad(row),
        },
        {
            tooltip: 'Eliminar',
            icon: <Icon icon="solar:trash-bin-trash-bold" className="text-red-500" />,
            onClick: (row: any) => removeItem(Number(row.__index)),
        },
    ];

    const getUbigeoText = (code: string) => {
        if (!code || !ubigeos) return "";
        const targetCode = String(code).padStart(6, '0');
        const u: any = ubigeos.find((item: any) => String(item.codigo).padStart(6, '0') === targetCode);
        return u ? `${u.departamento}/${u.provincia}/${u.distrito}` : "";
    };

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [currentStep, setCurrentStep] = useState(1);
    const TOTAL_STEPS = 4;

    const handleSubmit = async () => {
        if (isSubmitting) return;

        if (formValues.detalles.length === 0) {
            useAlertStore.getState().alert("Debe agregar al menos un ítem", "warning");
            return;
        }

        const destinatarioLabel = isCompra ? "proveedor" : "destinatario";
        if (!formValues.destinatarioNumDoc || !formValues.destinatarioRazonSocial) {
            useAlertStore.getState().alert(`Datos del ${destinatarioLabel} incompletos`, "warning");
            return;
        }

        const docNum = String(formValues.destinatarioNumDoc || "").trim();
        const docTipo = String(formValues.destinatarioTipoDoc || "").trim();
        const expectedLength = docTipo === "6" ? 11 : docTipo === "1" ? 8 : null;
        if (expectedLength && docNum.length !== expectedLength) {
            useAlertStore.getState().alert(`El ${destinatarioLabel} debe tener un documento válido (${docTipo === "6" ? "RUC 11 dígitos" : "DNI 8 dígitos"})`, "warning");
            return;
        }

        if (isCompra && String(formValues.destinatarioTipoDoc) === "6" && String(formValues.destinatarioNumDoc) === String(formValues.remitenteRuc)) {
            useAlertStore.getState().alert("En COMPRA, el RUC del proveedor no puede ser igual al RUC de tu empresa", "warning");
            return;
        }

        if (isTrasladoMismaEmpresa) {
            const empresaRuc = String(auth?.empresa?.ruc || formValues.remitenteRuc || '').trim();
            if (String(formValues.destinatarioNumDoc || '').trim() !== empresaRuc) {
                useAlertStore.getState().alert("En TRASLADO ENTRE ESTABLECIMIENTOS, el destinatario debe ser tu propia empresa (mismo RUC).", "warning");
                return;
            }
        }

        // Validaciones específicas según tipo de guía
        if (formValues.tipoGuia === 'TRANSPORTISTA') {
            if (!formValues.transportistaRuc || !formValues.transportistaRazonSocial) {
                useAlertStore.getState().alert("Para GRE-T se requieren RUC y Razón Social del transportista", "warning");
                return;
            }
            if (!formValues.transportistaMTC) {
                useAlertStore.getState().alert("Para GRE-T se requiere Registro MTC del transportista", "warning");
                return;
            }
            if (!formValues.conductorNumDoc || !formValues.conductorNombre || !formValues.conductorApellidos || !formValues.conductorLicencia || !formValues.vehiculoPlaca) {
                useAlertStore.getState().alert("Para GRE-T complete conductor (doc, nombre, apellidos, licencia) y vehículo (placa)", "warning");
                return;
            }

            const licenciaNormalizada = (formValues.conductorLicencia || '').trim().toUpperCase();
            const licenciaRegex = /^[A-Z0-9]{9}$/;
            if (!licenciaRegex.test(licenciaNormalizada)) {
                useAlertStore.getState().alert("La licencia del conductor debe tener exactamente 9 caracteres alfanuméricos.", "warning");
                return;
            }

            const placaNormalizada = (formValues.vehiculoPlaca || '').trim();
            if (placaNormalizada.length < 6) {
                useAlertStore.getState().alert("La placa del vehículo debe tener al menos 6 caracteres.", "warning");
                return;
            }

            const numeroTuc = (formValues.vehiculoAutorizacion || '').trim();
            const tucRegex = /^[A-Za-z0-9]{11,13}$/;
            if (!numeroTuc) {
                useAlertStore.getState().alert("Ingrese el número correlativo de la TUC (11 a 13 caracteres alfanuméricos).", "warning");
                return;
            }

            if (!tucRegex.test(numeroTuc)) {
                useAlertStore.getState().alert("La TUC debe tener entre 11 y 13 caracteres alfanuméricos.", "warning");
                return;
            }

            // Validar remitente de bienes si fue ingresado (campo opcional)
            const greTRuc = (formValues.greTRemitenteNumDoc || '').trim();
            if (greTRuc && greTRuc.length !== 11) {
                useAlertStore.getState().alert("El RUC del remitente de bienes debe tener 11 dígitos.", "warning");
                return;
            }
        }

        // Validaciones específicas según modo de transporte
        if (formValues.modoTransporte === "01") {
            if (!formValues.transportistaRuc || !formValues.transportistaRazonSocial) {
                useAlertStore.getState().alert("Datos del transportista público requeridos", "warning");
                return;
            }
        }

        if (formValues.modoTransporte === "02") {
            if (!formValues.conductorNumDoc || !formValues.vehiculoPlaca) {
                useAlertStore.getState().alert("Datos del conductor y vehículo requeridos para transporte privado", "warning");
                return;
            }
        }

        if (!formValues.partidaUbigeo || !formValues.partidaDireccion || !formValues.llegadaUbigeo || !formValues.llegadaDireccion) {
            useAlertStore.getState().alert("Complete los datos de partida y llegada (ubigeo y dirección)", "warning");
            return;
        }

        setIsSubmitting(true);
        try {
            // Validation/Default for PesoTotal
            const peso = Number(formValues.pesoTotal);
            const finalPesoTotal = peso > 0 ? peso : 1;

            const placaNormalizada = (formValues.vehiculoPlaca || '').trim().toUpperCase();
            const numeroTucNormalizado = (formValues.vehiculoAutorizacion || '').trim().toUpperCase();
            const licenciaNormalizada = (formValues.conductorLicencia || '').trim().toUpperCase();

            // Sanitize payload before sending
            const payload = {
                ...formValues,
                tipoDocumento: formValues.tipoGuia === 'TRANSPORTISTA' ? '31' : '09',
                correlativo:
                    typeof formValues.correlativo === 'object'
                        ? (formValues.correlativo as any).data || (formValues.correlativo as any).correlativo || 0
                        : Number(formValues.correlativo),
                pesoTotal: finalPesoTotal,
                conductorLicencia: licenciaNormalizada || formValues.conductorLicencia,
                vehiculoPlaca: placaNormalizada || formValues.vehiculoPlaca,
                vehiculoAutorizacion: numeroTucNormalizado || formValues.vehiculoAutorizacion,
                partidaCodigoEstablecimiento: isTrasladoMismaEmpresa ? '0700' : formValues.partidaCodigoEstablecimiento,
                llegadaCodigoEstablecimiento: isTrasladoMismaEmpresa ? '0700' : formValues.llegadaCodigoEstablecimiento,
            };

            let res;
            if (guiaToEdit?.id) {
                res = await updateGuiaRemision(guiaToEdit.id, payload);
            } else {
                res = await createGuiaRemision(payload);
            }

            if (res.success) {
                onClose();
                onSuccess?.();
            }
        } catch (error) {
            console.error(error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const STEPS = [
        { id: 1, label: 'Datos Generales' },
        { id: 2, label: 'Participantes' },
        { id: 3, label: 'Ruta y Transporte' },
        { id: 4, label: 'Bienes' },
    ];

    const canProceedStep1 = !!(formValues.serie.trim() && formValues.fechaEmision && formValues.fechaInicioTraslado && Number(formValues.pesoTotal) > 0);
    const canProceedStep2 = !!(formValues.destinatarioNumDoc.trim() && formValues.destinatarioRazonSocial.trim());
    const canProceedStep3 = (() => {
        if (!formValues.partidaUbigeo || !formValues.partidaDireccion || !formValues.llegadaUbigeo || !formValues.llegadaDireccion) return false;
        if (formValues.modoTransporte === '01' || isGuiaTransportista) {
            if (!formValues.transportistaRuc || !formValues.transportistaRazonSocial) return false;
        }
        return true;
    })();

    const handleNext = () => {
        if (currentStep === 1 && !canProceedStep1) {
            useAlertStore.getState().alert('Completa serie, fechas y peso total (mayor a 0)', 'warning');
            return;
        }
        if (currentStep === 2 && !canProceedStep2) {
            useAlertStore.getState().alert('Completa los datos del destinatario (documento y razón social)', 'warning');
            return;
        }
        if (currentStep === 3 && !canProceedStep3) {
            useAlertStore.getState().alert('Completa los datos de ruta y transporte requeridos', 'warning');
            return;
        }
        if (currentStep < TOTAL_STEPS) {
            setCurrentStep(c => c + 1);
        } else {
            void handleSubmit();
        }
    };

    const handleBack = () => {
        if (currentStep > 1) setCurrentStep(c => c - 1);
    };

    return (
        <>
            <Modal
                isOpenModal={isOpen}
                closeModal={onClose}
                title={guiaToEdit?.id ? `Editar Guía ${guiaToEdit.serie}-${guiaToEdit.correlativo}` : "Nueva Guía de Remisión"}
                icon="solar:delivery-bold-duotone"
                width="900px"
                position="right"
            >
                <form autoComplete="off" onSubmit={(e) => e.preventDefault()}>

                    {/* ── Stepper Header ── */}
                    <div className="sticky top-0 z-10 bg-white dark:bg-[#111827] border-b border-gray-100 dark:border-slate-700 px-6 pt-4 pb-5">
                        <div className="flex items-center">
                            {STEPS.map((step, i) => (
                                <>
                                    <button
                                        key={step.id}
                                        type="button"
                                        className="flex flex-col items-center shrink-0"
                                        onClick={() => { if (currentStep > step.id) setCurrentStep(step.id); }}
                                    >
                                        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all duration-300
                                            ${currentStep === step.id
                                                ? 'border-violet-600 bg-violet-600 text-white shadow-md shadow-violet-200 dark:shadow-violet-900/40'
                                                : currentStep > step.id
                                                    ? 'border-emerald-500 bg-emerald-500 text-white'
                                                    : 'border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-gray-400'}`}>
                                            {currentStep > step.id
                                                ? <Icon icon="mdi:check" className="text-lg" />
                                                : step.id}
                                        </div>
                                        <span className={`mt-1 text-[10px] font-semibold hidden sm:block whitespace-nowrap transition-colors
                                            ${currentStep === step.id ? 'text-violet-600 dark:text-violet-400'
                                                : currentStep > step.id ? 'text-emerald-600 dark:text-emerald-400'
                                                : 'text-gray-400 dark:text-slate-500'}`}>
                                            {step.label}
                                        </span>
                                    </button>
                                    {i < STEPS.length - 1 && (
                                        <div key={`line-${i}`} className="flex-1 mx-2 mb-4 h-0.5 overflow-hidden rounded-full bg-gray-200 dark:bg-slate-700">
                                            <div className={`h-full rounded-full transition-all duration-500 ${currentStep > step.id ? 'w-full bg-emerald-400' : 'w-0'}`} />
                                        </div>
                                    )}
                                </>
                            ))}
                        </div>
                    </div>

                    <div className="px-4 pb-4 pt-5 space-y-5 min-h-[500px]">

                        {/* ── PASO 1: DATOS GENERALES ── */}
                        {currentStep === 1 && (
                            <div className="space-y-5 animate-in fade-in duration-300">
                                {!guiaToEdit?.id && (
                                    importedRef ? (
                                        <div className="flex items-center gap-2 p-3 rounded-xl border border-emerald-200 dark:border-emerald-800/40 bg-emerald-50/60 dark:bg-emerald-900/10">
                                            <Icon icon="solar:check-circle-bold-duotone" className="text-emerald-600 dark:text-emerald-400 text-xl shrink-0" />
                                            <p className="text-xs text-emerald-800 dark:text-emerald-300">
                                                <span className="font-bold">Basada en {importedRef}.</span> Destinatario, dirección de llegada y bienes precargados — solo completa los datos del traslado.
                                            </p>
                                            <button type="button" onClick={() => setIsComprobanteModalOpen(true)} className="ml-auto text-xs font-semibold text-emerald-700 dark:text-emerald-400 underline underline-offset-2 whitespace-nowrap">
                                                Cambiar
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="flex flex-wrap items-center gap-2 p-3 rounded-xl border border-dashed border-indigo-200 dark:border-indigo-800/40 bg-indigo-50/40 dark:bg-indigo-900/10">
                                            <Icon icon="solar:bill-list-bold-duotone" className="text-indigo-600 dark:text-indigo-400 text-xl shrink-0" />
                                            <p className="text-xs text-indigo-800 dark:text-indigo-300 flex-1 min-w-[200px]">
                                                <span className="font-bold">¿El traslado viene de una venta?</span> Importa la Factura/Boleta y precargamos destinatario, dirección de llegada y bienes.
                                            </p>
                                            <Button type="button" size="sm" outline color="primary" onClick={() => setIsComprobanteModalOpen(true)}>
                                                <Icon icon="solar:magnifer-linear" className="mr-1" /> Buscar comprobante
                                            </Button>
                                        </div>
                                    )
                                )}
                                <div className="flex items-center gap-3 mb-1">
                                    <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center shrink-0">
                                        <Icon icon="solar:document-text-bold-duotone" className="text-blue-600 dark:text-blue-400 text-xl" />
                                    </div>
                                    <div>
                                        <h3 className="text-base font-bold text-gray-900 dark:text-white">Datos Generales</h3>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">Tipo de guía, fechas, motivo y modo de transporte</p>
                                    </div>
                                </div>

                                <div className="p-4 rounded-xl border border-gray-100 dark:border-transparent bg-white dark:bg-[#111827]">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <Select
                                            label="Tipo de Guía"
                                            options={TIPO_GUIA_OPTIONS}
                                            name="tipoGuia"
                                            id="tipoGuia"
                                            value={TIPO_GUIA_OPTIONS.find(o => o.id === formValues.tipoGuia)?.value || ""}
                                            defaultValue={formValues.tipoGuia}
                                            onChange={handleTipoGuiaChange}
                                            withLabel
                                            error={null}
                                        />
                                        <InputPro autocomplete="off" label="Serie" name="serie" value={formValues.serie} onChange={handleChange} isLabel disabled={!!guiaToEdit} />
                                        {guiaToEdit && (
                                            <InputPro autocomplete="off" label="Correlativo" name="correlativo" value={formValues.correlativo} onChange={() => {}} isLabel disabled />
                                        )}
                                        <div className="z-20 relative">
                                            <Calendar text="Fecha Emisión" name="fechaEmision" value={formValues.fechaEmision ? moment(formValues.fechaEmision).format("DD/MM/YYYY") : ""} onChange={handleDateChange} disabled={false} />
                                        </div>
                                        <div className="z-10 relative">
                                            <Calendar text="Fecha Inicio Traslado" name="fechaInicioTraslado" value={formValues.fechaInicioTraslado ? moment(formValues.fechaInicioTraslado).format("DD/MM/YYYY") : ""} onChange={handleDateChange} disabled={false} />
                                        </div>
                                    </div>
                                </div>

                                <div className="p-4 rounded-xl border border-gray-100 dark:border-transparent bg-white dark:bg-[#111827]">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                        <TrasladoTypeSelect value={formValues.tipoTraslado} name="tipoTraslado" onChange={handleSelectChange} label="Motivo de Traslado" />
                                        <Select
                                            label="Modo Transporte"
                                            options={MODO_TRANSPORTE_OPTIONS}
                                            name="modoTransporte"
                                            id="modoTransporte"
                                            value={MODO_TRANSPORTE_OPTIONS.find(o => o.id === formValues.modoTransporte)?.value || ""}
                                            defaultValue={formValues.modoTransporte}
                                            onChange={handleSelectChange}
                                            withLabel
                                            error={null}
                                        />
                                        <InputPro autocomplete="off" label="Peso Total" name="pesoTotal" type="number" value={formValues.pesoTotal} onChange={handleChange} isLabel />
                                        <Select
                                            label="Unidad Peso"
                                            options={UNIDAD_PESO_OPTIONS}
                                            name="unidadPeso"
                                            id="unidadPeso"
                                            value={UNIDAD_PESO_OPTIONS.find(o => o.id === formValues.unidadPeso)?.value || ""}
                                            defaultValue={formValues.unidadPeso}
                                            onChange={handleSelectChange}
                                            withLabel
                                            error={null}
                                        />
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                                        <div className="rounded-lg border border-blue-100 dark:border-blue-800/30 bg-blue-50 dark:bg-blue-900/10 p-3">
                                            <p className="text-[10px] font-bold text-blue-800 dark:text-blue-400 uppercase tracking-wider mb-1">Motivo: {selectedMotivoHelp.title}</p>
                                            <p className="text-xs text-blue-700/80 dark:text-blue-300/60 leading-relaxed">{selectedMotivoHelp.description}</p>
                                            <div className="mt-2 pt-2 border-t border-blue-200/30 dark:border-blue-800/20">
                                                <p className="text-[10px] font-bold text-blue-600 uppercase">Tip</p>
                                                <p className="text-[11px] text-blue-700 dark:text-blue-300/80 italic">{selectedMotivoHelp.tip}</p>
                                            </div>
                                        </div>
                                        <div className="rounded-lg border border-emerald-100 dark:border-emerald-800/30 bg-emerald-50 dark:bg-emerald-900/10 p-3">
                                            <p className="text-[10px] font-bold text-emerald-800 dark:text-emerald-400 uppercase tracking-wider mb-1">Modo: {selectedModoHelp.title}</p>
                                            {selectedModoHelp.required.length > 0 && <p className="text-[11px] text-emerald-700/80 dark:text-emerald-300/60">Clave: {selectedModoHelp.required.join(", ")}.</p>}
                                            <div className="mt-2 pt-2 border-t border-emerald-200/30 dark:border-emerald-800/20">
                                                <p className="text-[10px] font-bold text-emerald-600 uppercase">Tip</p>
                                                <p className="text-[11px] text-emerald-700 dark:text-emerald-300/80 italic">{selectedModoHelp.tip}</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-3 bg-gray-50 dark:bg-slate-800/50 rounded-lg border dark:border-transparent">
                                        {([
                                            { name: 'retornoVehiculoVacio', label: 'Retorno Vehículo Vacío', checked: formValues.retornoVehiculoVacio },
                                            { name: 'transbordoProgramado', label: 'Transbordo Programado', checked: formValues.transbordoProgramado },
                                            { name: 'retornoEnvasesVacios', label: 'Retorno Envases Vacíos', checked: formValues.retornoEnvasesVacios },
                                            { name: 'trasladoTotal', label: 'Traslado Total (DAM/DS)', checked: formValues.trasladoTotal },
                                        ] as const).map(flag => (
                                            <label key={flag.name} className="flex items-center space-x-2 cursor-pointer group">
                                                <input type="checkbox" name={flag.name} checked={flag.checked} onChange={handleChange} className="rounded border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700" />
                                                <span className="text-xs text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">{flag.label}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                {isGuiaTransportista && (
                                    <div className="p-3 rounded-xl border border-blue-100 dark:border-blue-800/30 bg-blue-50/50 dark:bg-blue-900/10 flex items-start gap-2">
                                        <Icon icon="solar:shield-warning-bold-duotone" className="text-blue-600 dark:text-blue-400 text-lg mt-0.5 shrink-0" />
                                        <p className="text-xs text-blue-800/80 dark:text-blue-300/60">
                                            Para guía <strong>TRANSPORTISTA</strong> deberás completar datos de transportista, conductor, vehículo y TUC en el Paso 3.
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* ── PASO 2: PARTICIPANTES ── */}
                        {currentStep === 2 && (
                            <div className="space-y-5 animate-in fade-in duration-300">
                                <div className="flex items-center gap-3 mb-1">
                                    <div className="w-9 h-9 rounded-xl bg-sky-50 dark:bg-sky-900/20 flex items-center justify-center shrink-0">
                                        <Icon icon="solar:users-group-two-rounded-bold-duotone" className="text-sky-600 dark:text-sky-400 text-xl" />
                                    </div>
                                    <div>
                                        <h3 className="text-base font-bold text-gray-900 dark:text-white">Participantes</h3>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">Remitente (tu empresa), destinatario y comprador si aplica</p>
                                    </div>
                                </div>

                                <div className="p-3 rounded-xl border border-emerald-100 dark:border-emerald-800/30 bg-emerald-50/50 dark:bg-emerald-900/10">
                                    <p className="text-[10px] font-bold text-emerald-800 dark:text-emerald-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                                        <Icon icon="solar:building-bold-duotone" /> Remitente — Tu empresa
                                    </p>
                                    <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-200">{formValues.remitenteRazonSocial}</p>
                                    <p className="text-xs text-emerald-700 dark:text-emerald-400">RUC: {formValues.remitenteRuc} · {formValues.remitenteDireccion}</p>
                                </div>

                                <div className="p-4 rounded-xl border border-gray-100 dark:border-transparent bg-white dark:bg-[#111827]">
                                    <h3 className="text-sm font-bold text-gray-800 dark:text-white mb-1 flex items-center gap-2">
                                        <Icon icon="solar:user-bold-duotone" className="text-sky-600 dark:text-sky-400" />
                                        {isCompra ? "Datos del Proveedor" : "Datos del Destinatario"}
                                    </h3>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                                        {isCompra ? "En motivo COMPRA, registra al proveedor origen de los bienes."
                                            : isTrasladoMismaEmpresa ? "En traslado entre establecimientos, el destinatario es tu propia empresa."
                                            : "Ingresa el documento — la razón social se completa automáticamente (DNI 8 / RUC 11 dígitos)."}
                                    </p>

                                    {isCompra && (
                                        <div className="mb-4 p-3 rounded-lg border border-amber-200 dark:border-amber-800/30 bg-amber-50 dark:bg-amber-900/10 text-sm">
                                            <p className="font-semibold text-amber-900 dark:text-amber-300">Destinatario real (SUNAT)</p>
                                            <p className="text-amber-800 dark:text-white">{auth?.empresa?.razonSocial || formValues.remitenteRazonSocial}</p>
                                            <p className="text-amber-700 dark:text-gray-400">{auth?.empresa?.ruc || formValues.remitenteRuc}</p>
                                        </div>
                                    )}

                                    {isTrasladoMismaEmpresa && (
                                        <div className="mb-4 p-3 rounded-lg border border-blue-200 dark:border-blue-800/30 bg-blue-50 dark:bg-blue-900/10 text-sm flex items-start gap-2">
                                            <Icon icon="solar:lock-bold-duotone" className="text-blue-600 dark:text-blue-400 text-lg mt-0.5 shrink-0" />
                                            <div>
                                                <p className="font-semibold text-blue-900 dark:text-blue-300">Destinatario bloqueado — misma empresa</p>
                                                <p className="text-blue-800 dark:text-white mt-0.5">{auth?.empresa?.razonSocial} — RUC: {auth?.empresa?.ruc}</p>
                                            </div>
                                        </div>
                                    )}

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <Select
                                            label={isCompra ? "Tipo Doc. Proveedor" : "Tipo Doc."}
                                            options={TIPO_DOC_OPTIONS}
                                            name="destinatarioTipoDoc"
                                            id="destinatarioTipoDoc"
                                            value={TIPO_DOC_OPTIONS.find(o => o.id === formValues.destinatarioTipoDoc)?.value || ""}
                                            defaultValue={formValues.destinatarioTipoDoc}
                                            onChange={isTrasladoMismaEmpresa ? () => {} : handleSelectChange}
                                            withLabel
                                            error={null}
                                            disabled={isTrasladoMismaEmpresa}
                                        />
                                        <div className="flex items-end gap-2">
                                            <div className="flex-1">
                                                <InputPro autocomplete="off" label={isCompra ? "RUC/DNI Proveedor" : "Número Documento"} name="destinatarioNumDoc" value={formValues.destinatarioNumDoc} onChange={handleChange} isLabel placeholder={isCompra ? "Documento del proveedor" : "DNI o RUC"} disabled={isTrasladoMismaEmpresa} />
                                            </div>
                                            <Button
                                                onlyIcon
                                                outline
                                                color="primary"
                                                title="Buscar documento"
                                                disabled={isTrasladoMismaEmpresa}
                                                onClick={() => handleBuscarDocumento('destinatario')}
                                            >
                                                <Icon icon="solar:magnifer-bold" className="text-base" />
                                            </Button>
                                        </div>
                                        <InputPro autocomplete="off" label={isCompra ? "Razón Social Proveedor" : "Razón Social / Nombre"} name="destinatarioRazonSocial" value={formValues.destinatarioRazonSocial} onChange={handleChange} isLabel disabled={isTrasladoMismaEmpresa} />
                                    </div>
                                    {!isTrasladoMismaEmpresa && <p className="text-xs text-gray-400 mt-2">{destinatarioDocHint}</p>}
                                </div>

                                {isGuiaTransportista && (
                                    <div className="p-4 rounded-xl border border-orange-200 dark:border-orange-800/30 bg-orange-50/40 dark:bg-orange-900/10">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Icon icon="solar:box-bold-duotone" className="text-orange-600 dark:text-orange-400 text-xl" />
                                            <h3 className="text-sm font-bold text-orange-900 dark:text-orange-400 uppercase tracking-wide">Remitente de los bienes (GRE-T)</h3>
                                        </div>
                                        <p className="text-xs text-orange-800 dark:text-orange-300 mb-4">
                                            Empresa o persona que envía la carga. Puede ser diferente al transportista. Ingresa el RUC.
                                        </p>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="flex items-end gap-2">
                                                <div className="flex-1">
                                                    <InputPro autocomplete="off" label="RUC del remitente de bienes" name="greTRemitenteNumDoc" value={formValues.greTRemitenteNumDoc || ""} onChange={handleChange} isLabel placeholder="Ej: 20524076307" />
                                                </div>
                                                <Button
                                                    onlyIcon
                                                    outline
                                                    color="primary"
                                                    title="Buscar remitente"
                                                    onClick={() => handleBuscarDocumento('greTRemitente')}
                                                >
                                                    <Icon icon="solar:magnifer-bold" className="text-base" />
                                                </Button>
                                            </div>
                                            <InputPro autocomplete="off" label="Razón social del remitente" name="greTRemitenteRazonSocial" value={formValues.greTRemitenteRazonSocial || ""} onChange={handleChange} isLabel placeholder="Se completa al ingresar el RUC" />
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* ── PASO 3: RUTA Y TRANSPORTE ── */}
                        {currentStep === 3 && (
                            <div className="space-y-5 animate-in fade-in duration-300">
                                <div className="flex items-center gap-3 mb-1">
                                    <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center shrink-0">
                                        <Icon icon="solar:route-bold-duotone" className="text-emerald-600 dark:text-emerald-400 text-xl" />
                                    </div>
                                    <div>
                                        <h3 className="text-base font-bold text-gray-900 dark:text-white">Ruta y Transporte</h3>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">Puntos de partida/llegada y datos del transportista o conductor</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="p-4 rounded-xl border border-gray-100 dark:border-transparent bg-white dark:bg-[#111827]">
                                        <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                                            <Icon icon="solar:map-point-bold-duotone" className="text-blue-500 text-base" />
                                            Punto de Partida
                                        </h4>
                                        <div className="space-y-3">
                                            <SelectUbigeo label="Ubigeo Partida" name="partidaUbigeo" id="partidaUbigeo" options={ubigeos} onChange={handleSelectChange} value={getUbigeoText(formValues.partidaUbigeo)} defaultValue={getUbigeoText(formValues.partidaUbigeo)} isSearch />
                                            <InputPro autocomplete="off" label="Dirección Partida" name="partidaDireccion" value={formValues.partidaDireccion} onChange={handleChange} isLabel />
                                            <InputPro autocomplete="off" label="Cód. Establecimiento" name="partidaCodigoEstablecimiento" value={formValues.partidaCodigoEstablecimiento || ""} onChange={handleChange} isLabel />
                                        </div>
                                    </div>
                                    <div className="p-4 rounded-xl border border-gray-100 dark:border-transparent bg-white dark:bg-[#111827]">
                                        <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                                            <Icon icon="solar:map-point-wave-bold-duotone" className="text-emerald-500 text-base" />
                                            Punto de Llegada
                                        </h4>
                                        <div className="space-y-3">
                                            <SelectUbigeo label="Ubigeo Llegada" name="llegadaUbigeo" id="llegadaUbigeo" options={ubigeos} onChange={handleSelectChange} value={getUbigeoText(formValues.llegadaUbigeo)} defaultValue={getUbigeoText(formValues.llegadaUbigeo)} isSearch />
                                            <InputPro autocomplete="off" label="Dirección Llegada" name="llegadaDireccion" value={formValues.llegadaDireccion} onChange={handleChange} isLabel />
                                            <InputPro autocomplete="off" label="Cód. Establecimiento" name="llegadaCodigoEstablecimiento" value={formValues.llegadaCodigoEstablecimiento || ""} onChange={handleChange} isLabel />
                                        </div>
                                    </div>
                                </div>

                                {(formValues.modoTransporte === "01" || isGuiaTransportista) && (
                                    <div className="p-4 rounded-xl border border-blue-100 dark:border-blue-800/30 bg-blue-50/30 dark:bg-blue-900/10">
                                        <h4 className="text-sm font-bold text-blue-900 dark:text-blue-400 mb-3 flex items-center gap-2">
                                            <Icon icon="solar:delivery-bold-duotone" />
                                            Datos del Transportista
                                        </h4>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <div className="flex items-end gap-2">
                                                <div className="flex-1">
                                                    <InputPro autocomplete="off" label="RUC Transportista" name="transportistaRuc" value={formValues.transportistaRuc || ""} onChange={handleChange} isLabel />
                                                </div>
                                                <Button
                                                    onlyIcon
                                                    outline
                                                    color="primary"
                                                    title="Buscar transportista"
                                                    onClick={() => handleBuscarDocumento('transportista')}
                                                >
                                                    <Icon icon="solar:magnifer-bold" className="text-base" />
                                                </Button>
                                            </div>
                                            <InputPro autocomplete="off" label="Razón Social Transportista" name="transportistaRazonSocial" value={formValues.transportistaRazonSocial || ""} onChange={handleChange} isLabel />
                                            <InputPro autocomplete="off" label="Registro MTC (GRE-T)" name="transportistaMTC" value={formValues.transportistaMTC || ""} onChange={handleChange} isLabel />
                                        </div>
                                    </div>
                                )}

                                {(formValues.modoTransporte === "02" || isGuiaTransportista) && (
                                    <div className="p-4 rounded-xl border border-emerald-100 dark:border-emerald-800/30 bg-emerald-50/30 dark:bg-emerald-900/10">
                                        <h4 className="text-sm font-bold text-emerald-900 dark:text-emerald-400 mb-3 flex items-center gap-2">
                                            <Icon icon="solar:bus-bold-duotone" />
                                            Vehículo y Conductor
                                        </h4>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <InputPro autocomplete="off" label="Placa Vehículo" name="vehiculoPlaca" value={formValues.vehiculoPlaca || ""} onChange={handleChange} isLabel />
                                            <InputPro autocomplete="off" label="TUC / Autorización" name="vehiculoAutorizacion" value={formValues.vehiculoAutorizacion || ""} onChange={handleChange} isLabel />
                                            <InputPro autocomplete="off" label="DNI Conductor" name="conductorNumDoc" value={formValues.conductorNumDoc || ""} onChange={handleChange} isLabel />
                                            <InputPro autocomplete="off" label="Nombres Conductor" name="conductorNombre" value={formValues.conductorNombre || ""} onChange={handleChange} isLabel />
                                            <InputPro autocomplete="off" label="Apellidos Conductor" name="conductorApellidos" value={formValues.conductorApellidos || ""} onChange={handleChange} isLabel />
                                            <InputPro autocomplete="off" label="Licencia (9 caract.)" name="conductorLicencia" value={(formValues.conductorLicencia || "").toUpperCase()} onChange={handleChange} isLabel />
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* ── PASO 4: BIENES Y OBSERVACIONES ── */}
                        {currentStep === 4 && (
                            <div className="space-y-5 animate-in fade-in duration-300">
                                <div className="flex items-center gap-3 mb-1">
                                    <div className="w-9 h-9 rounded-xl bg-violet-50 dark:bg-violet-900/20 flex items-center justify-center shrink-0">
                                        <Icon icon="solar:box-bold-duotone" className="text-violet-600 dark:text-violet-400 text-xl" />
                                    </div>
                                    <div>
                                        <h3 className="text-base font-bold text-gray-900 dark:text-white">Bienes a Trasladar</h3>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">Agrega productos manualmente o impórtalos desde una factura o un Excel</p>
                                    </div>
                                </div>

                                {/* ── Importar datos (Factura / Excel) ── */}
                                <div className="flex flex-wrap items-center gap-2 p-3 rounded-xl border border-dashed border-indigo-200 dark:border-indigo-800/40 bg-indigo-50/40 dark:bg-indigo-900/10">
                                    <span className="text-xs font-semibold text-indigo-800 dark:text-indigo-300 flex items-center gap-1 mr-1">
                                        <Icon icon="solar:import-bold-duotone" /> Importar:
                                    </span>
                                    <Button type="button" size="sm" outline color="primary" onClick={() => setIsComprobanteModalOpen(true)}>
                                        <Icon icon="solar:bill-list-bold-duotone" className="mr-1" /> Desde Factura
                                    </Button>
                                    <label className="inline-flex">
                                        <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleExcelImport} />
                                        <span className="inline-flex items-center cursor-pointer text-xs font-semibold px-3 py-1.5 rounded-lg border border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors">
                                            <Icon icon="solar:file-download-bold-duotone" className="mr-1" /> Desde Excel
                                        </span>
                                    </label>
                                    <button type="button" onClick={() => void descargarPlantillaItems()} className="text-xs text-gray-500 dark:text-gray-400 underline underline-offset-2 hover:text-gray-700 dark:hover:text-gray-200">
                                        Descargar plantilla
                                    </button>
                                </div>

                                <div className="p-4 rounded-xl border border-gray-100 dark:border-transparent bg-white dark:bg-[#111827]">
                                    <div className="grid grid-cols-12 gap-3 mb-4 items-end p-3 rounded-xl border border-gray-100 dark:border-transparent bg-gray-50 dark:bg-slate-800/30">
                                        <div className="col-span-12 md:col-span-6">
                                            <Select label="Producto" name="producto" value={selectedProductValue} options={productOptions} onChange={handleProductChange} isSearch handleGetData={handleProductSearch} withLabel error={null} placeholder="Buscar producto..." />
                                        </div>
                                        <div className="col-span-6 md:col-span-2">
                                            <InputPro autocomplete="off" type="number" label="Cantidad" name="newItem.cantidad" value={newItem.cantidad} onChange={(e) => setNewItem({ ...newItem, cantidad: Number(e.target.value) })} isLabel />
                                        </div>
                                        <div className="col-span-4 md:col-span-2">
                                            <InputPro autocomplete="off" label="Unidad" name="newItem.unidadMedida" value={newItem.unidadMedida || ""} onChange={(e) => setNewItem({ ...newItem, unidadMedida: e.target.value })} isLabel disabled />
                                        </div>
                                        <div className="col-span-2 md:col-span-2">
                                            <Button type="button" outline color="black" onClick={addItem} className="w-full justify-center">
                                                Agregar <Icon icon="solar:add-circle-bold" className="ml-1" />
                                            </Button>
                                        </div>
                                    </div>

                                    {formValues.detalles.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center py-10 text-center border border-dashed border-gray-200 dark:border-slate-700 rounded-xl bg-gray-50 dark:bg-slate-800/20">
                                            <Icon icon="solar:box-outline" className="text-4xl text-gray-300 dark:text-slate-600 mb-2" />
                                            <p className="text-sm text-gray-400 dark:text-slate-500">Aún no hay productos. Usa el buscador para agregar.</p>
                                        </div>
                                    ) : (
                                        <div className="w-full overflow-x-auto border border-gray-100 dark:border-transparent rounded-xl bg-white dark:bg-[#111827]">
                                            <DataTable headerColumns={detallesTableColumns} bodyData={detallesTableData} actions={detallesTableActions} isCompact={false} />
                                        </div>
                                    )}
                                </div>

                                <div className="p-4 rounded-xl border border-gray-100 dark:border-transparent bg-white dark:bg-[#111827]">
                                    <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                                        <Icon icon="solar:notes-bold-duotone" className="text-gray-500" />
                                        Observaciones Adicionales
                                    </h4>
                                    <InputPro autocomplete="off" label="Notas" name="observaciones" value={formValues.observaciones || ""} onChange={handleChange} isLabel />
                                </div>
                            </div>
                        )}

                        {/* ── Navegación ── */}
                        <div className="flex gap-3 justify-between pt-4 border-t border-gray-100 dark:border-slate-800">
                            <div>
                                {currentStep > 1 ? (
                                    <Button color="gray" type="button" onClick={handleBack}>
                                        <Icon icon="solar:arrow-left-bold" className="mr-1" /> Anterior
                                    </Button>
                                ) : (
                                    <Button color="gray" type="button" onClick={onClose} disabled={isSubmitting}>Cancelar</Button>
                                )}
                            </div>
                            <Button color="indigo" type="button" onClick={handleNext} disabled={isSubmitting}>
                                {isSubmitting ? (
                                    <><Icon icon="svg-spinners:ring-resize" className="mr-2" />Guardando...</>
                                ) : currentStep < TOTAL_STEPS ? (
                                    <>Siguiente <Icon icon="solar:arrow-right-bold" className="ml-1" /></>
                                ) : (
                                    <><Icon icon="solar:diskette-bold" className="mr-2" />{guiaToEdit?.id ? "Actualizar Guía" : "Generar Guía"}</>
                                )}
                            </Button>
                        </div>
                    </div>
                </form>
            </Modal>

            <ComprobanteSearchModal
                isOpen={isComprobanteModalOpen}
                onClose={() => setIsComprobanteModalOpen(false)}
                onSelect={handleImportComprobante}
            />

            <Modal
                isOpenModal={isEditQtyModalOpen}
                closeModal={() => { setIsEditQtyModalOpen(false); setEditingQtyIndex(null); }}
                title="Editar cantidad"
                width="420px"
                position="center"
                icon="solar:pen-2-bold"
            >
                <div className="p-5 space-y-4 bg-white dark:bg-[#111827] rounded-b-2xl">
                    <p className="text-sm text-gray-600 dark:text-gray-400">Ajusta la cantidad del producto seleccionado. Este cambio solo actualiza la tabla y no guarda aún la guía.</p>
                    <InputPro autocomplete="off" label="Cantidad" name="editingQtyValue" type="number" value={editingQtyValue} onChange={(e) => setEditingQtyValue(Number(e.target.value))} isLabel />
                    <div className="flex justify-end gap-3 pt-2">
                        <Button color="gray" onClick={() => { setIsEditQtyModalOpen(false); setEditingQtyIndex(null); }}>Cancelar</Button>
                        <Button color="primary" onClick={handleSaveEditCantidad}>Guardar cantidad</Button>
                    </div>
                </div>
            </Modal>
        </>
    );
};

export default ModalGuiaRemision;
