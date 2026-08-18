import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { Icon } from "@iconify/react";
import InputPro from "@/components/InputPro";
import Select from "@/components/Select";
import Button from "@/components/Button";
import SelectUbigeo from "@/components/Select/SelectUbigeo";
import TrasladoTypeSelect from "@/components/Select/TrasladoTypeSelect";
import { useGuiaRemisionStore, IGuiaRemision, IDetalleGuiaRemision } from "@/zustand/guia-remision";
import { get } from "@/utils/fetch";
import { useExtentionsStore } from "@/zustand/extentions";
import { useAuthStore } from "@/zustand/auth";
import ClientSearchModal from "./ClientSearchModal";
import ProductSearchModal from "./ProductSearchModal";
import useAlertStore from "@/zustand/alert";

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

const FormGuiaRemision = () => {
    const navigate = useNavigate();
    const { auth } = useAuthStore();
    const { createGuiaRemision, getSiguienteCorrelativo, siguienteCorrelativo } = useGuiaRemisionStore();
    const { getUbigeos, ubigeos } = useExtentionsStore();

    const [isClientModalOpen, setIsClientModalOpen] = useState(false);
    const [isCompradorModalOpen, setIsCompradorModalOpen] = useState(false);
    const [isProductModalOpen, setIsProductModalOpen] = useState(false);
    // Sedes/direcciones del cliente destinatario (para elegir el punto de llegada).
    const [dirCliente, setDirCliente] = useState<Array<{ id: number; alias?: string; direccion: string; distrito?: string; ubigeo?: string; esPrincipal?: boolean }>>([]);

    // Initial state matching IGuiaRemision
    const [formValues, setFormValues] = useState<IGuiaRemision>({
        tipoGuia: "REMITENTE",
        serie: "T001",
        correlativo: 0,
        fechaEmision: format(new Date(), "yyyy-MM-dd"),
        horaEmision: format(new Date(), "HH:mm:ss"),
        tipoDocumento: "09", // Guía de Remisión Remitente
        remitenteRuc: auth?.empresa?.ruc || "",
        remitenteRazonSocial: auth?.empresa?.razonSocial || "",
        remitenteDireccion: auth?.empresa?.direccion || "",
        destinatarioTipoDoc: "6",
        destinatarioNumDoc: "",
        destinatarioRazonSocial: "",
        tipoTraslado: "01", // Venta
        modoTransporte: "02", // Privado por defecto
        pesoTotal: 0,
        unidadPeso: "KGM",
        partidaUbigeo: auth?.empresa?.ubicacion?.codigo || "",
        partidaDireccion: auth?.empresa?.direccion || "",
        llegadaUbigeo: "",
        llegadaDireccion: "",
        compradorTipoDoc: "6",
        compradorNumDoc: "",
        compradorRazonSocial: "",
        fechaInicioTraslado: format(new Date(), "yyyy-MM-dd"),
        retornoVehiculoVacio: false,
        retornoEnvasesVacios: false,
        transbordoProgramado: false,
        trasladoTotal: false,
        vehiculoM1oL: false,
        datosTransportista: false,
        conductorApellidos: "",
        vehiculoAutorizacion: "",
        detalles: []
    });

    const [newItem, setNewItem] = useState<Partial<IDetalleGuiaRemision>>({
        cantidad: 1,
        unidadMedida: "NIU"
    });

    useEffect(() => {
        getUbigeos();
        // Obtener siguiente correlativo al cargar
        getSiguienteCorrelativo(formValues.serie);
    }, []);

    useEffect(() => {
        if (siguienteCorrelativo) {
            setFormValues(prev => ({ ...prev, correlativo: siguienteCorrelativo }));
        }
    }, [siguienteCorrelativo]);

    useEffect(() => {
        const { tipoTraslado } = formValues;
        // Forzar transporte público en motivos que lo requieren
        if (["03", "06", "18"].includes(tipoTraslado)) {
            setFormValues(prev => ({ ...prev, modoTransporte: "01" }));
        }
        // Destinatario = misma empresa en motivos 02 y 04
        if ((tipoTraslado === "02" || tipoTraslado === "04") && auth?.empresa?.ruc) {
            setFormValues(prev => ({
                ...prev,
                destinatarioTipoDoc: "6",
                destinatarioNumDoc: auth.empresa!.ruc,
                destinatarioRazonSocial: auth.empresa!.razonSocial || "",
            }));
        }
    }, [formValues.tipoTraslado, auth?.empresa]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        const val = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
        setFormValues(prev => ({ ...prev, [name]: val }));
    };

    const handleSelectChange = (_idValue: any, value: any, name: any, id: any) => {
        // Handle Ubigeo or generic Select changes
        // SelectUbigeo passes: code, "Dept/Prov/Dist", name, id
        // Generic Select passes: id, value, name, id

        if (name === 'partidaUbigeo' || name === 'llegadaUbigeo') {
            // Ubigeo returns code as first arg
            setFormValues(prev => ({ ...prev, [name]: _idValue }));
        } else {
            setFormValues(prev => ({ ...prev, [name]: _idValue }));
        }
    };

    const handleClientSelect = (client: any) => {
        setFormValues(prev => ({
            ...prev,
            destinatarioTipoDoc: client.tipoDocumentoId === "6" ? "6" : "1", // Simplificado
            destinatarioNumDoc: client.nroDoc,
            destinatarioRazonSocial: client.nombre || client.razonSocial,
            clienteId: client.id,
            llegadaDireccion: client.direccion || "",
            llegadaUbigeo: client.ubigeo || ""
        }));
        // Cargar las sedes del cliente; si tiene, precargar la principal como punto de llegada.
        setDirCliente([]);
        if (client?.id) {
            get<any[]>(`clientes/${client.id}/direcciones`)
                .then((r) => {
                    const dirs = (r?.data as any[]) ?? [];
                    setDirCliente(dirs);
                    const principal = dirs.find((d) => d.esPrincipal) || dirs[0];
                    if (principal) {
                        setFormValues(prev => ({
                            ...prev,
                            llegadaDireccion: principal.direccion || prev.llegadaDireccion,
                            llegadaUbigeo: principal.ubigeo || prev.llegadaUbigeo,
                        }));
                    }
                })
                .catch(() => setDirCliente([]));
        }
    };

    // Al elegir una sede del selector, rellena la dirección/ubigeo de llegada.
    const handleSedeSelect = (_id: any, value: any) => {
        const sede = dirCliente.find((d) => String(d.id) === String(_id) || d.direccion === value);
        if (sede) {
            setFormValues(prev => ({
                ...prev,
                llegadaDireccion: sede.direccion,
                llegadaUbigeo: sede.ubigeo || prev.llegadaUbigeo,
            }));
        }
    };

    const handleCompradorSelect = (client: any) => {
        setFormValues(prev => ({
            ...prev,
            compradorTipoDoc: client.tipoDocumentoId === "6" ? "6" : "1",
            compradorNumDoc: client.nroDoc,
            compradorRazonSocial: client.nombre || client.razonSocial,
        }));
    };

    const handleProductSelect = (product: any) => {
        setNewItem({
            productoId: product.id,
            codigoProducto: product.codigo,
            descripcion: product.descripcion,
            unidadMedida: product.unidadMedida?.nombre || "NIU",
            cantidad: 1
        });
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
    };

    const removeItem = (index: number) => {
        setFormValues(prev => ({
            ...prev,
            detalles: prev.detalles.filter((_, i) => i !== index)
        }));
    };

    const handleSubmit = async () => {
        if (formValues.detalles.length === 0) {
            useAlertStore.getState().alert("Debe agregar al menos un ítem", "warning");
            return;
        }

        if (!formValues.destinatarioNumDoc || !formValues.destinatarioRazonSocial) {
            useAlertStore.getState().alert("Datos del destinatario incompletos", "warning");
            return;
        }

        // Validaciones por Motivo de Traslado
        if ((formValues.tipoTraslado === "02" || formValues.tipoTraslado === "04") &&
            formValues.destinatarioNumDoc.trim() !== auth?.empresa?.ruc) {
            useAlertStore.getState().alert("Para este motivo de traslado, el destinatario debe ser tu misma empresa.", "warning");
            return;
        }

        if (formValues.tipoTraslado === "06" && formValues.destinatarioNumDoc.trim() === auth?.empresa?.ruc) {
            useAlertStore.getState().alert("En traslado por Devolución, el destinatario no debe ser igual al remitente.", "warning");
            return;
        }

        if (formValues.tipoTraslado === "03" && (!formValues.compradorNumDoc || !formValues.compradorRazonSocial)) {
            useAlertStore.getState().alert("Datos del Comprador incompletos para Venta a Terceros.", "warning");
            return;
        }

        // Configuración de Establecimientos
        const payload = { ...formValues };
        if (payload.tipoTraslado === "04") {
            payload.partidaCodigoEstablecimiento = "0700";
            payload.llegadaCodigoEstablecimiento = "0700";
        }

        // Validaciones por modo de transporte
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
            const cleanPlaca = formValues.vehiculoPlaca.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
            if (cleanPlaca.length < 6 || cleanPlaca.length > 8) {
                useAlertStore.getState().alert("La placa debe tener entre 6 y 8 caracteres alfanuméricos (sin guiones).", "warning");
                return;
            }
            const cleanLicencia = (formValues.conductorLicencia || "").replace(/[^A-Za-z0-9]/g, "").toUpperCase();
            if (cleanLicencia && (cleanLicencia.length < 9 || cleanLicencia.length > 10)) {
                useAlertStore.getState().alert("La licencia del conductor debe tener entre 9 y 10 caracteres alfanuméricos.", "warning");
                return;
            }
        }

        const res = await createGuiaRemision(payload);
        if (res.success) {
            navigate("/admin/guia-remision");
        }
    };

    return (
        <div className="bg-white dark:bg-[#111827] p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-transparent">
            <h2 className="text-xl font-bold mb-6 text-gray-900 dark:text-white border-b border-gray-100 dark:border-slate-800 pb-3 flex items-center gap-2">
                <Icon icon="solar:delivery-bold-duotone" className="text-blue-600 dark:text-blue-400" />
                Nueva Guía de Remisión
            </h2>

            {/* Cabecera */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <InputPro label="Serie" name="serie" value={formValues.serie} onChange={handleChange} isLabel disabled />
                <InputPro label="Correlativo" name="correlativo" value={formValues.correlativo} onChange={() => { }} isLabel disabled />
                <InputPro type="date" label="Fecha Emisión" name="fechaEmision" value={formValues.fechaEmision} onChange={handleChange} isLabel />
                <InputPro type="date" label="Fecha Inicio Traslado" name="fechaInicioTraslado" value={formValues.fechaInicioTraslado} onChange={handleChange} isLabel />
            </div>

            <div className="mb-6 border border-gray-100 dark:border-transparent p-5 rounded-2xl relative bg-gray-50/30 dark:bg-slate-900/10">
                <h3 className="font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2 uppercase tracking-wider text-xs">
                    <Icon icon="solar:user-bold-duotone" className="text-blue-600 dark:text-blue-400" />
                    {formValues.tipoTraslado === '02' ? 'Datos del Proveedor (Origen)' : 'Datos del Destinatario'}
                </h3>
                {formValues.tipoTraslado === '02' && (
                    <div className="mb-4 bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg flex items-start gap-3 border border-blue-100 dark:border-blue-800/30">
                        <Icon icon="solar:info-circle-bold-duotone" className="text-blue-500 mt-0.5" width="20" />
                        <p className="text-sm text-blue-800 dark:text-blue-300">
                            Al ser un traslado por Compra, el destinatario final es tu empresa. Aquí debes ingresar los datos de tu <strong>Proveedor</strong>.
                        </p>
                    </div>
                )}
                <div className="absolute top-4 right-4">
                    <Button size="sm" onClick={() => setIsClientModalOpen(true)} outline color="black">Buscar Cliente</Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Select
                        label="Tipo Doc."
                        options={TIPO_DOC_OPTIONS}
                        name="destinatarioTipoDoc"
                        id="destinatarioTipoDoc"
                        value={TIPO_DOC_OPTIONS.find(o => o.id === formValues.destinatarioTipoDoc)?.value || ""}
                        defaultValue={formValues.destinatarioTipoDoc}
                        onChange={handleSelectChange}
                        error=""
                    />
                    <InputPro label="Número Documento" name="destinatarioNumDoc" value={formValues.destinatarioNumDoc} onChange={handleChange} isLabel />
                    <InputPro label="Razón Social / Nombre" name="destinatarioRazonSocial" value={formValues.destinatarioRazonSocial} onChange={handleChange} isLabel />
                </div>
            </div>

            {formValues.tipoTraslado === '03' && (
                <div className="mb-6 border border-gray-100 dark:border-transparent p-5 rounded-2xl relative bg-blue-50/20 dark:bg-blue-900/10">
                    <h3 className="font-bold text-blue-800 dark:text-blue-400 mb-4 flex items-center gap-2 uppercase tracking-wider text-xs">
                        <Icon icon="solar:cart-bold-duotone" className="text-blue-600 dark:text-blue-400" />
                        Datos del Comprador
                    </h3>
                    <div className="absolute top-4 right-4">
                        <Button size="sm" onClick={() => setIsCompradorModalOpen(true)} outline color="black">Buscar Cliente</Button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Select
                            label="Tipo Doc."
                            options={TIPO_DOC_OPTIONS}
                            name="compradorTipoDoc"
                            id="compradorTipoDoc"
                            value={TIPO_DOC_OPTIONS.find(o => o.id === formValues.compradorTipoDoc)?.value || ""}
                            defaultValue={formValues.compradorTipoDoc || "6"}
                            onChange={handleSelectChange}
                            error=""
                        />
                        <InputPro label="Número Documento" name="compradorNumDoc" value={formValues.compradorNumDoc || ""} onChange={handleChange} isLabel />
                        <InputPro label="Razón Social / Nombre" name="compradorRazonSocial" value={formValues.compradorRazonSocial || ""} onChange={handleChange} isLabel />
                    </div>
                </div>
            )}

            <div className="mb-6 border border-gray-100 dark:border-transparent p-5 rounded-2xl bg-gray-50/30 dark:bg-slate-900/10">
                <h3 className="font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2 uppercase tracking-wider text-xs">
                    <Icon icon="solar:route-bold-duotone" className="text-blue-600 dark:text-blue-400" />
                    Datos del Traslado
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <TrasladoTypeSelect
                        value={formValues.tipoTraslado}
                        name="tipoTraslado"
                        onChange={handleSelectChange}
                        label="Motivo de Traslado"
                    />
                    <Select
                        label="Modo Transporte"
                        options={MODO_TRANSPORTE_OPTIONS}
                        name="modoTransporte"
                        id="modoTransporte"
                        value={MODO_TRANSPORTE_OPTIONS.find(o => o.id === formValues.modoTransporte)?.value || ""}
                        defaultValue={formValues.modoTransporte}
                        onChange={handleSelectChange}
                        error=""
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex gap-2">
                        <InputPro label="Peso Total" name="pesoTotal" type="number" value={formValues.pesoTotal} onChange={handleChange} isLabel />
                        <Select
                            label="Unidad"
                            options={UNIDAD_PESO_OPTIONS}
                            name="unidadPeso"
                            id="unidadPeso"
                            value={UNIDAD_PESO_OPTIONS.find(o => o.id === formValues.unidadPeso)?.value || ""}
                            defaultValue={formValues.unidadPeso}
                            onChange={handleSelectChange}
                            error=""
                        />
                    </div>
                </div>

                <div className="mt-5 grid grid-cols-2 md:grid-cols-4 gap-3 p-3 bg-white dark:bg-slate-900/30 rounded-xl border border-gray-100 dark:border-transparent">
                    <label className="flex items-center space-x-2 text-sm cursor-pointer group">
                        <input type="checkbox" name="retornoVehiculoVacio" checked={formValues.retornoVehiculoVacio} onChange={handleChange} className="rounded border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700" />
                        <span className="text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">Retorno Vehículo Vacío</span>
                    </label>
                    <label className="flex items-center space-x-2 text-sm cursor-pointer group">
                        <input type="checkbox" name="transbordoProgramado" checked={formValues.transbordoProgramado} onChange={handleChange} className="rounded border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700" />
                        <span className="text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">Transbordo Programado</span>
                    </label>
                    <label className="flex items-center space-x-2 text-sm cursor-pointer group">
                        <input type="checkbox" name="retornoEnvasesVacios" checked={formValues.retornoEnvasesVacios} onChange={handleChange} className="rounded border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700" />
                        <span className="text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">Retorno Envases Vacíos</span>
                    </label>
                    <label className="flex items-center space-x-2 text-sm cursor-pointer group">
                        <input type="checkbox" name="trasladoTotal" checked={formValues.trasladoTotal} onChange={handleChange} className="rounded border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700" />
                        <span className="text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">Traslado Total (DAM/DS)</span>
                    </label>
                </div>
            </div>

            {/* Datos del Transporte (Condicional) */}
            {formValues.modoTransporte === "01" && (
                <div className="mb-6 border border-gray-100 dark:border-transparent p-5 rounded-2xl bg-blue-50/30 dark:bg-blue-900/10">
                    <h3 className="font-bold text-blue-900 dark:text-blue-400 mb-4 flex items-center gap-2 uppercase tracking-wider text-xs">
                        <Icon icon="solar:delivery-bold-duotone" />
                        Transporte Público
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <InputPro label="RUC Transportista" name="transportistaRuc" value={formValues.transportistaRuc || ""} onChange={handleChange} isLabel />
                        <InputPro label="Razón Social Transp." name="transportistaRazonSocial" value={formValues.transportistaRazonSocial || ""} onChange={handleChange} isLabel />
                        <InputPro label="Registro MTC" name="transportistaMTC" value={formValues.transportistaMTC || ""} onChange={handleChange} isLabel />
                    </div>
                </div>
            )}

            {formValues.modoTransporte === "02" && (
                <div className="mb-6 border border-gray-100 dark:border-transparent p-5 rounded-2xl bg-emerald-50/30 dark:bg-emerald-900/10">
                    <h3 className="font-bold text-emerald-900 dark:text-emerald-400 mb-4 flex items-center gap-2 uppercase tracking-wider text-xs">
                        <Icon icon="solar:bus-bold-duotone" />
                        Transporte Privado
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                        <InputPro label="Placa Vehículo" name="vehiculoPlaca" value={formValues.vehiculoPlaca || ""} onChange={handleChange} isLabel />
                        <InputPro label="DNI/Licencia Conductor" name="conductorNumDoc" value={formValues.conductorNumDoc || ""} onChange={handleChange} isLabel />
                        <InputPro label="Nombre Conductor" name="conductorNombre" value={formValues.conductorNombre || ""} onChange={handleChange} isLabel />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <InputPro label="Licencia" name="conductorLicencia" value={formValues.conductorLicencia || ""} onChange={handleChange} isLabel />
                    </div>
                </div>
            )}

            {/* Puntos de Partida y Llegada */}
            <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="border dark:border-slate-800 p-4 rounded-lg">
                    <h3 className="font-semibold text-gray-700 dark:text-gray-300 mb-3">Punto de Partida</h3>
                    <div className="mb-3">
                        <SelectUbigeo
                            label="Ubigeo Partida"
                            name="partidaUbigeo"
                            id="partidaUbigeo"
                            options={ubigeos}
                            onChange={handleSelectChange}
                            value={""}
                            defaultValue={formValues.partidaUbigeo}
                            isSearch
                        />
                    </div>
                    <InputPro label="Dirección Partida" name="partidaDireccion" value={formValues.partidaDireccion} onChange={handleChange} isLabel />
                </div>
                <div className="border dark:border-slate-800 p-4 rounded-lg">
                    <h3 className="font-semibold text-gray-700 dark:text-gray-300 mb-3">Punto de Llegada</h3>
                    {/* Selector de sede del cliente (si tiene varias direcciones registradas) */}
                    {dirCliente.length > 1 && (
                        <div className="mb-3">
                            <Select
                                label="Sede del cliente"
                                name="sedeCliente"
                                value=""
                                options={dirCliente.map((d) => ({ id: d.id, value: `${d.alias ? d.alias + ' — ' : ''}${d.direccion}` }))}
                                onChange={handleSedeSelect}
                                error=""
                            />
                            <p className="text-[11px] text-slate-400 mt-1">Elige a qué sucursal se entrega; rellena la dirección de llegada.</p>
                        </div>
                    )}
                    <div className="mb-3">
                        <SelectUbigeo
                            label="Ubigeo Llegada"
                            name="llegadaUbigeo"
                            id="llegadaUbigeo"
                            options={ubigeos}
                            onChange={handleSelectChange}
                            value=""
                            defaultValue={formValues.llegadaUbigeo}
                            isSearch
                        />
                    </div>
                    <InputPro label="Dirección Llegada" name="llegadaDireccion" value={formValues.llegadaDireccion} onChange={handleChange} isLabel />
                </div>
            </div>

            {/* Ítems */}
            <div className="mb-6 border dark:border-slate-800 p-4 rounded-lg">
                <h3 className="font-semibold text-gray-700 dark:text-gray-300 mb-3">Bienes a Trasladar</h3>
                {/* Formulario Agregar Ítem */}
                <div className="flex flex-wrap gap-4 items-end mb-4 bg-gray-50 dark:bg-slate-800/50 p-3 rounded">
                    <Button size="sm" onClick={() => setIsProductModalOpen(true)} color="secondary">Buscar Producto</Button>
                    <div className="w-32">
                        <InputPro label="Código" name="newItem.codigoProducto" value={newItem.codigoProducto || ""} onChange={(e) => setNewItem({ ...newItem, codigoProducto: e.target.value })} isLabel />
                    </div>
                    <div className="flex-1">
                        <InputPro label="Descripción" name="newItem.descripcion" value={newItem.descripcion || ""} onChange={(e) => setNewItem({ ...newItem, descripcion: e.target.value })} isLabel />
                    </div>
                    <div className="w-24">
                        <InputPro type="number" label="Cant." name="newItem.cantidad" value={newItem.cantidad} onChange={(e) => setNewItem({ ...newItem, cantidad: Number(e.target.value) })} isLabel />
                    </div>
                    <div className="w-24">
                        <InputPro label="Und." name="newItem.unidadMedida" value={newItem.unidadMedida || ""} onChange={(e) => setNewItem({ ...newItem, unidadMedida: e.target.value })} isLabel />
                    </div>
                    <Button size="md" onClick={addItem} color="primary" className="mb-1">
                        <Icon icon="heroicons:plus" />
                    </Button>
                </div>

                {/* Tabla de Ítems */}
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left border dark:border-slate-800 rounded-lg">
                        <thead className="bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-200">
                            <tr>
                                <th className="p-3">#</th>
                                <th className="p-3">Código</th>
                                <th className="p-3">Descripción</th>
                                <th className="p-3 text-center">Unidad</th>
                                <th className="p-3 text-right">Cantidad</th>
                                <th className="p-3 text-center">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {formValues.detalles.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="p-4 text-center text-gray-500 dark:text-gray-400">No hay ítems agregados</td>
                                </tr>
                            ) : (
                                formValues.detalles.map((item, index) => (
                                    <tr key={index} className="border-b dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors text-gray-900 dark:text-gray-200">
                                        <td className="p-3">{index + 1}</td>
                                        <td className="p-3">{item.codigoProducto}</td>
                                        <td className="p-3">{item.descripcion}</td>
                                        <td className="p-3 text-center">{item.unidadMedida}</td>
                                        <td className="p-3 text-right">{item.cantidad}</td>
                                        <td className="p-3 text-center">
                                            <button onClick={() => removeItem(index)} className="text-red-500 hover:text-red-700">
                                                <Icon icon="heroicons:trash" width="20" />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="mb-4">
                <InputPro label="Observaciones" name="observaciones" value={formValues.observaciones || ""} onChange={handleChange} isLabel />
            </div>

            <div className="flex justify-end gap-4 mt-8">
                <Button color="gray" onClick={() => navigate("/admin/guia-remision")}>Cancelar</Button>
                <Button color="primary" onClick={handleSubmit} className="px-8">Generar Guía</Button>
            </div>

            {/* Modales */}
            <ClientSearchModal
                isOpen={isClientModalOpen}
                onClose={() => setIsClientModalOpen(false)}
                onSelect={handleClientSelect}
            />
            <ClientSearchModal
                isOpen={isCompradorModalOpen}
                onClose={() => setIsCompradorModalOpen(false)}
                onSelect={handleCompradorSelect}
            />
            <ProductSearchModal
                isOpen={isProductModalOpen}
                onClose={() => setIsProductModalOpen(false)}
                onSelect={handleProductSelect}
            />
        </div>
    );
};

export default FormGuiaRemision;
