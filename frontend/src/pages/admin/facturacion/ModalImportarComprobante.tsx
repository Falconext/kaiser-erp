import { useState, useEffect, useRef } from "react";
import Modal from "@/components/Modal";
import Button from "@/components/Button";
import InputPro from "@/components/InputPro";
import Select from "@/components/Select";
import { Calendar } from "@/components/Date";
import { Icon } from "@iconify/react/dist/iconify.js";
import moment from "moment";
import useAlertStore from "@/zustand/alert";
import { useProductsStore } from "@/zustand/products";
import { useClientsStore } from "@/zustand/clients";
import { post } from "@/utils/fetch";
import apiClient from "@/utils/apiClient";
import ModalImportarLote from "./ModalImportarLote";

interface ModalImportarComprobanteProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: () => void;
}

interface ImportItem {
    productoId: number | null;
    productoLabel?: string;
    descripcion: string;
    cantidad: number;
    nuevoValorUnitario: number; // precio unitario INCLUYE IGV
    unidadVenta: string;
    tipoAfectacionIGV: string; // '10' gravado | '20' exonerado | '30' inafecto
}

interface ParsedTotales {
    valorVenta: number;
    mtoIGV: number;
    mtoImpVenta: number;
}

const AFECTACION_OPTIONS = [
    { id: '10', value: 'Gravado (IGV)' },
    { id: '20', value: 'Exonerado' },
    { id: '30', value: 'Inafecto' },
];

const emptyItem = (): ImportItem => ({
    productoId: null,
    descripcion: '',
    cantidad: 1,
    nuevoValorUnitario: 0,
    unidadVenta: 'NIU',
    tipoAfectacionIGV: '10',
});

const ModalImportarComprobante = ({ isOpen, onClose, onSuccess }: ModalImportarComprobanteProps) => {
    const { alert } = useAlertStore();
    const { getAllProducts, products } = useProductsStore();
    const { clients, getAllClients, getClientFromDoc, addClients } = useClientsStore();
    const [buscandoCliente, setBuscandoCliente] = useState(false);

    const xmlInputRef = useRef<HTMLInputElement>(null);
    const [isParsingXml, setIsParsingXml] = useState(false);
    const [saving, setSaving] = useState(false);
    const [showLote, setShowLote] = useState(false);
    const [calendarKey, setCalendarKey] = useState(0);
    const [productSelectKey, setProductSelectKey] = useState(0);

    const [header, setHeader] = useState({
        tipoDoc: '01',
        serie: 'F001',
        correlativo: '',
        fechaEmision: moment().format('YYYY-MM-DD'),
        tipoMoneda: 'PEN',
        clienteName: '',
        clienteNumDoc: '',
        clienteId: null as number | null,
        documentoId: '',
    });

    const [items, setItems] = useState<ImportItem[]>([emptyItem()]);
    const [afectarStock, setAfectarStock] = useState(true);
    const [afectarCaja, setAfectarCaja] = useState(true);
    const [parsedTotales, setParsedTotales] = useState<ParsedTotales | null>(null);
    const [productOptions, setProductOptions] = useState<any[]>([]);

    useEffect(() => {
        if (isOpen) {
            setHeader({
                tipoDoc: '01',
                serie: 'F001',
                correlativo: '',
                fechaEmision: moment().format('YYYY-MM-DD'),
                tipoMoneda: 'PEN',
                clienteName: '',
                clienteNumDoc: '',
                clienteId: null,
                documentoId: '',
            });
            setItems([emptyItem()]);
            setAfectarStock(true);
            setAfectarCaja(true);
            setParsedTotales(null);
            setShowLote(false);
            setCalendarKey(k => k + 1);
            setProductSelectKey(k => k + 1);
        }
    }, [isOpen]);

    useEffect(() => {
        setProductOptions((products || []).map((p: any) => ({ id: p.id, value: `${p.codigo} - ${p.descripcion}` })));
    }, [products]);

    const handleProductSearch = (query: string, cb: () => void) => {
        getAllProducts({ search: query, limit: 20 }, cb);
    };

    const updateItem = (idx: number, field: keyof ImportItem, value: any) => {
        setItems(prev => prev.map((it, i) => i === idx ? { ...it, [field]: value } : it));
    };

    const onProductLink = (idx: number, id: any) => {
        const nid = Number(id);
        if (!nid) {
            updateItem(idx, 'productoId', null);
            return;
        }
        const prod: any = (products || []).find((p: any) => Number(p.id) === nid);
        setItems(prev => prev.map((it, i) => i === idx
            ? {
                ...it,
                productoId: nid,
                productoLabel: prod ? `${prod.codigo} - ${prod.descripcion}` : it.productoLabel,
                descripcion: it.descripcion || prod?.descripcion || '',
            }
            : it));
    };

    const addItem = () => setItems(prev => [...prev, emptyItem()]);
    const removeItem = (idx: number) => setItems(prev => prev.length === 1 ? prev : prev.filter((_, i) => i !== idx));

    const handleXmlFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        e.target.value = '';
        setIsParsingXml(true);
        try {
            const formData = new FormData();
            formData.append('file', file);
            const res = await apiClient.post('/comprobante/importar/parse-xml', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            const data = res.data?.data ?? res.data;

            setHeader(h => ({
                ...h,
                tipoDoc: data.tipoDoc || h.tipoDoc,
                serie: data.serie || h.serie,
                correlativo: data.correlativo != null ? String(data.correlativo) : h.correlativo,
                fechaEmision: data.fechaEmision || h.fechaEmision,
                tipoMoneda: data.tipoMoneda || h.tipoMoneda,
                clienteName: data.clienteName || data.cliente?.nombre || h.clienteName,
                clienteNumDoc: data.cliente?.numDoc || h.clienteNumDoc,
                clienteId: data.cliente?.clienteId ?? null,
            }));

            const importedItems: ImportItem[] = (data.detalles || []).map((d: any) => ({
                productoId: d.productoId ?? null,
                productoLabel: d.productoDescripcion || undefined,
                descripcion: d.productoDescripcion || d.descripcion || '',
                cantidad: Number(d.cantidad) || 1,
                nuevoValorUnitario: Number(d.nuevoValorUnitario) || 0,
                unidadVenta: d.unidadVenta || 'NIU',
                tipoAfectacionIGV: d.tipoAfectacionIGV || '10',
            }));
            setItems(importedItems.length > 0 ? importedItems : [emptyItem()]);
            setParsedTotales(data.totales || null);
            setCalendarKey(k => k + 1);
            setProductSelectKey(k => k + 1);

            const vinculados = importedItems.filter(i => i.productoId).length;
            alert(`XML importado: ${vinculados}/${importedItems.length} líneas vinculadas a productos.`, 'success');
        } catch (err: any) {
            alert(err?.response?.data?.message || 'Error al procesar el XML. Verifica que sea un comprobante SUNAT válido.', 'error');
        } finally {
            setIsParsingXml(false);
        }
    };

    // Totales calculados a partir de los ítems (nuevoValorUnitario incluye IGV)
    const totales = items.reduce((acc, it) => {
        const lineTotal = (Number(it.cantidad) || 0) * (Number(it.nuevoValorUnitario) || 0);
        if (it.tipoAfectacionIGV === '10') {
            const base = lineTotal / 1.18;
            acc.valorVenta += base;
            acc.mtoIGV += lineTotal - base;
        } else {
            acc.valorVenta += lineTotal;
        }
        acc.mtoImpVenta += lineTotal;
        return acc;
    }, { valorVenta: 0, mtoIGV: 0, mtoImpVenta: 0 });

    const monedaSymbol = header.tipoMoneda === 'USD' ? '$' : 'S/';

    const seleccionarCliente = (c: any) => {
        if (!c) return;
        setHeader(h => ({ ...h, clienteId: c.id ?? null, clienteName: c.nombre || '', clienteNumDoc: c.nroDoc || '' }));
    };

    const usarClientesVarios = () => {
        setHeader(h => ({ ...h, clienteId: null, clienteName: 'CLIENTES VARIOS', clienteNumDoc: '' }));
    };

    // Busca el cliente por DNI/RUC: primero entre los registrados; si no existe,
    // lo consulta en RENIEC/SUNAT y lo registra, dejándolo vinculado (con su id).
    const buscarClientePorDoc = async () => {
        const doc = header.clienteNumDoc.trim();
        if (!doc) { alert('Ingresa el DNI (8 dígitos) o RUC (11 dígitos) del cliente.', 'error'); return; }
        if (doc.length !== 8 && doc.length !== 11) {
            alert('El documento debe tener 8 dígitos (DNI) u 11 dígitos (RUC).', 'error');
            return;
        }
        setBuscandoCliente(true);
        try {
            // 1) ¿ya está registrado?
            await getAllClients({ search: doc });
            const yaRegistrado = useClientsStore.getState().clients.find((c: any) => String(c.nroDoc) === doc);
            if (yaRegistrado) {
                seleccionarCliente(yaRegistrado);
                alert(`Cliente encontrado: ${yaRegistrado.nombre}`, 'success');
                return;
            }
            // 2) no registrado -> consultar RENIEC/SUNAT y crear
            const tipo = doc.length === 11 ? 'RUC' : 'DNI';
            const info: any = await getClientFromDoc(doc, tipo);
            if (!info) return; // getClientFromDoc ya mostró el error
            const nombre = info.nombre_completo || info.nombre_o_razon_social || info.nombre || '';
            await addClients({
                nombre,
                tipoDoc: tipo,
                nroDoc: doc,
                direccion: info.direccion || info.direccion_completa || '-',
                departamento: info.departamento || '',
                provincia: info.provincia || '',
                distrito: info.distrito || '',
                ubigeo: info.ubigeo_sunat || info.ubigeo || '',
                persona: tipo === 'RUC' ? 'EMPRESA' : 'CLIENTE',
                estado: 'ACTIVO',
            } as any);
            const creado = useClientsStore.getState().clients.find((c: any) => String(c.nroDoc) === doc);
            if (creado) seleccionarCliente(creado);
            else setHeader(h => ({ ...h, clienteName: nombre }));
        } finally {
            setBuscandoCliente(false);
        }
    };

    const validar = (): string | null => {
        if (!header.serie.trim()) return 'Ingresa la serie.';
        if (!header.correlativo.trim() || isNaN(Number(header.correlativo))) return 'Ingresa un correlativo válido.';
        if (!header.fechaEmision) return 'Ingresa la fecha de emisión.';
        if (!header.clienteId && header.clienteName.trim().toUpperCase() !== 'CLIENTES VARIOS') {
            return 'Selecciona un cliente: búscalo por DNI/RUC o usa "Clientes varios".';
        }
        const validItems = items.filter(it => Number(it.cantidad) > 0 && (it.productoId || it.descripcion.trim()));
        if (validItems.length === 0) return 'Agrega al menos una línea con descripción o producto.';
        for (const it of items) {
            if (!it.productoId && !it.descripcion.trim()) return 'Las líneas sin producto requieren una descripción.';
            if (Number(it.cantidad) <= 0) return 'La cantidad de cada línea debe ser mayor a 0.';
        }
        return null;
    };

    const handleSubmit = async () => {
        const error = validar();
        if (error) {
            alert(error, 'error');
            return;
        }
        setSaving(true);
        try {
            const payload = {
                serie: header.serie.trim().toUpperCase(),
                correlativo: Number(header.correlativo),
                tipoDoc: header.tipoDoc,
                fechaEmision: header.fechaEmision,
                formaPagoTipo: 'CONTADO',
                formaPagoMoneda: header.tipoMoneda,
                tipoMoneda: header.tipoMoneda,
                clienteName: header.clienteName.trim(),
                clienteId: header.clienteId || undefined,
                documentoId: header.documentoId.trim() || undefined,
                afectarStock,
                afectarCaja,
                detalles: items.map(it => ({
                    productoId: it.productoId || null,
                    descripcion: it.descripcion.trim() || undefined,
                    cantidad: Number(it.cantidad),
                    nuevoValorUnitario: Number(it.nuevoValorUnitario),
                    unidadVenta: it.unidadVenta || undefined,
                    tipoAfectacionIGV: it.tipoAfectacionIGV || '10',
                })),
            };
            const resp: any = await post('/comprobante/importar', payload);
            if (resp.success && resp.code !== 0) {
                const d = resp.data || {};
                alert(`Comprobante ${d.serie || header.serie}-${d.correlativo ?? header.correlativo} importado correctamente.`, 'success');
                if (onSuccess) onSuccess();
                onClose();
            } else {
                alert(resp.error || 'Error al importar el comprobante.', 'error');
            }
        } catch (err: any) {
            alert(err?.response?.data?.message || err?.message || 'Error al importar el comprobante.', 'error');
        } finally {
            setSaving(false);
        }
    };

    return (
        <>
            <Modal
                isOpenModal={isOpen}
                closeModal={onClose}
                title="Importar comprobante emitido"
                icon="solar:import-bold-duotone"
                width="1100px"
                position="right"
            >
                <div className="px-4 pb-4 space-y-5 pt-5">
                    {/* Barra superior: XML + carga masiva */}
                    <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between p-3 rounded-xl border border-indigo-100 dark:border-indigo-900/40 bg-indigo-50/40 dark:bg-indigo-900/10">
                        <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                            <Icon icon="solar:info-circle-bold-duotone" width={16} className="text-indigo-500" />
                            Registra una Factura o Boleta ya emitida sin reenviarla a SUNAT.
                        </p>
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={() => xmlInputRef.current?.click()}
                                disabled={isParsingXml}
                                className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 disabled:opacity-50 bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-800 px-3 py-1.5 rounded-lg"
                            >
                                <Icon icon={isParsingXml ? "svg-spinners:270-ring-with-bg" : "solar:upload-minimalistic-bold-duotone"} width={14} />
                                {isParsingXml ? 'Procesando...' : 'Cargar XML'}
                            </button>
                            <button
                                type="button"
                                onClick={() => setShowLote(true)}
                                className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 dark:text-gray-300 hover:text-gray-900 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 px-3 py-1.5 rounded-lg"
                            >
                                <Icon icon="solar:documents-bold-duotone" width={14} />
                                Importar en lote
                            </button>
                        </div>
                    </div>
                    <input
                        ref={xmlInputRef}
                        type="file"
                        accept=".xml,application/xml,text/xml"
                        className="hidden"
                        onChange={handleXmlFileSelect}
                    />

                    {/* Datos del comprobante */}
                    <div className="p-4 rounded-xl border border-gray-200 dark:border-slate-800">
                        <h3 className="text-sm font-bold text-gray-800 dark:text-white mb-3 uppercase tracking-wide">Datos del comprobante</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <Select
                                label="Tipo"
                                name="tipoDoc"
                                options={[{ id: '01', value: 'Factura' }, { id: '03', value: 'Boleta' }]}
                                onChange={(id) => setHeader(h => ({ ...h, tipoDoc: String(id) }))}
                                value={header.tipoDoc === '01' ? 'Factura' : 'Boleta'}
                                withLabel
                                error={null}
                            />
                            <InputPro autocomplete="off" label="Serie" name="serie" value={header.serie} onChange={(e) => setHeader(h => ({ ...h, serie: e.target.value.toUpperCase() }))} isLabel />
                            <InputPro autocomplete="off" type="number" label="Correlativo" name="correlativo" value={header.correlativo} onChange={(e) => setHeader(h => ({ ...h, correlativo: e.target.value }))} isLabel />
                            <Calendar
                                key={`fecha-${calendarKey}`}
                                text="Fecha emisión"
                                name="fechaEmision"
                                value={moment(header.fechaEmision).format('DD/MM/YYYY')}
                                onChange={(date: string) => {
                                    if (moment(date, 'DD/MM/YYYY', true).isValid()) {
                                        setHeader(h => ({ ...h, fechaEmision: moment(date, 'DD/MM/YYYY').format('YYYY-MM-DD') }));
                                    }
                                }}
                            />
                            <Select
                                label="Moneda"
                                name="tipoMoneda"
                                options={[{ id: 'PEN', value: 'Soles (PEN)' }, { id: 'USD', value: 'Dólares (USD)' }]}
                                onChange={(id) => setHeader(h => ({ ...h, tipoMoneda: String(id) }))}
                                value={header.tipoMoneda === 'USD' ? 'Dólares (USD)' : 'Soles (PEN)'}
                                withLabel
                                error={null}
                            />
                            <InputPro autocomplete="off" label="ID documento (opcional)" name="documentoId" value={header.documentoId} onChange={(e) => setHeader(h => ({ ...h, documentoId: e.target.value }))} isLabel />

                            {/* Cliente: búsqueda por DNI/RUC (registra vía RENIEC/SUNAT si no existe) o selección de un registrado */}
                            <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                                <div className="md:col-span-4">
                                    <InputPro
                                        autocomplete="off"
                                        label={header.tipoDoc === '01' ? 'RUC del cliente' : 'DNI / RUC del cliente'}
                                        name="clienteNumDoc"
                                        value={header.clienteNumDoc}
                                        onChange={(e) => setHeader(h => ({ ...h, clienteNumDoc: e.target.value.replace(/\D/g, ''), clienteId: null }))}
                                        onKeyDown={(e: any) => { if (e.key === 'Enter') { e.preventDefault(); buscarClientePorDoc(); } }}
                                        isLabel
                                    />
                                </div>
                                <div className="md:col-span-2">
                                    <button
                                        type="button"
                                        onClick={buscarClientePorDoc}
                                        disabled={buscandoCliente}
                                        className="w-full h-[42px] flex items-center justify-center gap-1.5 text-xs font-bold btn-accent rounded-lg disabled:opacity-60"
                                    >
                                        <Icon icon={buscandoCliente ? 'eos-icons:loading' : 'solar:magnifer-linear'} width={16} />
                                        Buscar
                                    </button>
                                </div>
                                <div className="md:col-span-6">
                                    <Select
                                        label="Cliente (o busca uno registrado)"
                                        name="clienteName"
                                        id="clienteId"
                                        isSearch
                                        handleGetData={(query: string, cb: any) => { if ((query || '').length > 2) getAllClients({ search: query }, cb, true); else cb && cb(); }}
                                        options={clients?.map((c: any) => ({ id: c.id, value: `${c.nroDoc || 's/d'} - ${c.nombre}` }))}
                                        value={header.clienteName}
                                        onChange={(id: any) => {
                                            const c = useClientsStore.getState().clients.find((x: any) => String(x.id) === String(id));
                                            if (c) seleccionarCliente(c);
                                        }}
                                        withLabel
                                        error={null}
                                    />
                                </div>
                                <div className="md:col-span-12 flex flex-wrap items-center gap-3">
                                    {header.clienteId ? (
                                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/30 px-2.5 py-1 rounded-full">
                                            <Icon icon="solar:check-circle-bold" width={13} />
                                            {header.clienteName}{header.clienteNumDoc ? ` (${header.clienteNumDoc})` : ''}
                                        </span>
                                    ) : header.clienteName.trim().toUpperCase() === 'CLIENTES VARIOS' ? (
                                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-slate-800 px-2.5 py-1 rounded-full">
                                            <Icon icon="solar:users-group-rounded-bold" width={13} /> Clientes varios
                                        </span>
                                    ) : (
                                        <span className="text-[11px] text-amber-600 dark:text-amber-400">Sin cliente seleccionado — búscalo por DNI/RUC o usa “Clientes varios”.</span>
                                    )}
                                    <button type="button" onClick={usarClientesVarios} className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline">
                                        Usar “Clientes varios”
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Detalle */}
                    <div className="p-4 rounded-xl border border-gray-200 dark:border-slate-800">
                        <div className="flex justify-between items-center mb-3">
                            <h3 className="text-sm font-bold text-gray-800 dark:text-white uppercase tracking-wide">Detalle</h3>
                            <button
                                type="button"
                                onClick={addItem}
                                className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 bg-indigo-50 dark:bg-indigo-900/30 px-3 py-1.5 rounded-lg"
                            >
                                <Icon icon="solar:add-circle-bold" width={14} />
                                Agregar línea
                            </button>
                        </div>

                        <div className="space-y-3">
                            {items.map((item, idx) => (
                                <div key={idx} className="p-3 rounded-xl border border-gray-100 dark:border-slate-800">
                                    <div className="grid grid-cols-12 gap-3 items-end">
                                        <div className="col-span-12 md:col-span-4">
                                            <InputPro autocomplete="off" label="Descripción" name={`descripcion_${idx}`} value={item.descripcion} onChange={(e) => updateItem(idx, 'descripcion', e.target.value)} isLabel />
                                        </div>
                                        <div className="col-span-4 md:col-span-2">
                                            <InputPro autocomplete="off" type="number" label="Cantidad" name={`cantidad_${idx}`} value={item.cantidad} onChange={(e) => updateItem(idx, 'cantidad', Number(e.target.value))} isLabel />
                                        </div>
                                        <div className="col-span-4 md:col-span-2">
                                            <InputPro autocomplete="off" type="number" label="P. Unit. (c/IGV)" name={`precio_${idx}`} value={item.nuevoValorUnitario} onChange={(e) => updateItem(idx, 'nuevoValorUnitario', Number(e.target.value))} isLabel />
                                        </div>
                                        <div className="col-span-4 md:col-span-2">
                                            <Select
                                                label="Afectación"
                                                name={`afectacion_${idx}`}
                                                options={AFECTACION_OPTIONS}
                                                onChange={(id) => updateItem(idx, 'tipoAfectacionIGV', String(id))}
                                                value={AFECTACION_OPTIONS.find(o => o.id === item.tipoAfectacionIGV)?.value || 'Gravado (IGV)'}
                                                withLabel
                                                error={null}
                                            />
                                        </div>
                                        <div className="col-span-12 md:col-span-2 flex items-end justify-between gap-2">
                                            <span className="text-sm font-semibold text-gray-700 dark:text-gray-200 whitespace-nowrap">
                                                {monedaSymbol} {((Number(item.cantidad) || 0) * (Number(item.nuevoValorUnitario) || 0)).toFixed(2)}
                                            </span>
                                            <button type="button" onClick={() => removeItem(idx)} disabled={items.length === 1} className="text-red-400 hover:text-red-600 disabled:opacity-30 p-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20">
                                                <Icon icon="solar:trash-bin-trash-bold" width={16} />
                                            </button>
                                        </div>
                                    </div>
                                    {/* Vínculo con producto (opcional) */}
                                    <div className="mt-2 flex flex-col sm:flex-row sm:items-center gap-2">
                                        <div className="flex-1 min-w-[220px]">
                                            <Select
                                                key={`prod-${idx}-${productSelectKey}`}
                                                label="Vincular producto (opcional)"
                                                name={`producto_${idx}`}
                                                options={productOptions}
                                                onChange={(id) => onProductLink(idx, id)}
                                                isSearch
                                                handleGetData={handleProductSearch}
                                                withLabel
                                                error={null}
                                                placeholder="Buscar producto del inventario..."
                                                value={item.productoLabel || ''}
                                            />
                                        </div>
                                        {item.productoId ? (
                                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-1 rounded self-start sm:self-end">
                                                <Icon icon="solar:link-bold" width={12} /> Vinculado (afecta stock)
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded self-start sm:self-end">
                                                Línea libre (no afecta stock)
                                            </span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Totales + opciones */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-4 rounded-xl border border-gray-200 dark:border-slate-800 space-y-2">
                            <h3 className="text-sm font-bold text-gray-800 dark:text-white uppercase tracking-wide mb-2">Totales (calculados)</h3>
                            <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                                <span>Valor de venta</span>
                                <span>{monedaSymbol} {totales.valorVenta.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                                <span>IGV (18%)</span>
                                <span>{monedaSymbol} {totales.mtoIGV.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-lg font-bold text-gray-900 dark:text-white border-t border-gray-200 dark:border-slate-700 pt-2">
                                <span>Total</span>
                                <span>{monedaSymbol} {totales.mtoImpVenta.toFixed(2)}</span>
                            </div>
                            {parsedTotales && (
                                <div className="mt-2 p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-[11px] text-slate-500 dark:text-slate-400">
                                    <span className="font-semibold">Total del XML:</span> {monedaSymbol} {Number(parsedTotales.mtoImpVenta).toFixed(2)}
                                    {Math.abs(Number(parsedTotales.mtoImpVenta) - totales.mtoImpVenta) > 0.05 && (
                                        <span className="block text-amber-600 dark:text-amber-400 mt-0.5">⚠️ El total calculado no coincide con el XML. Verifica los importes.</span>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="p-4 rounded-xl border border-gray-200 dark:border-slate-800 space-y-3">
                            <h3 className="text-sm font-bold text-gray-800 dark:text-white uppercase tracking-wide">Opciones</h3>
                            <button
                                type="button"
                                onClick={() => setAfectarStock(v => !v)}
                                className={`w-full flex items-center gap-2.5 p-2.5 rounded-lg border text-left transition-all ${afectarStock ? 'border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/20' : 'border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50'}`}
                            >
                                <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${afectarStock ? 'bg-emerald-500 border-emerald-500' : 'border-gray-300 dark:border-slate-500'}`}>
                                    {afectarStock && <Icon icon="mdi:check" width={11} className="text-white" />}
                                </div>
                                <div>
                                    <p className="text-xs font-semibold text-gray-700 dark:text-gray-200 leading-none">Afectar inventario (stock)</p>
                                    <p className="text-[10px] text-gray-400 mt-0.5">Descuenta el stock de las líneas vinculadas a un producto.</p>
                                </div>
                            </button>
                            <button
                                type="button"
                                onClick={() => setAfectarCaja(v => !v)}
                                className={`w-full flex items-center gap-2.5 p-2.5 rounded-lg border text-left transition-all ${afectarCaja ? 'border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/20' : 'border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50'}`}
                            >
                                <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${afectarCaja ? 'bg-emerald-500 border-emerald-500' : 'border-gray-300 dark:border-slate-500'}`}>
                                    {afectarCaja && <Icon icon="mdi:check" width={11} className="text-white" />}
                                </div>
                                <div>
                                    <p className="text-xs font-semibold text-gray-700 dark:text-gray-200 leading-none">Registrar cobro en caja</p>
                                    <p className="text-[10px] text-gray-400 mt-0.5">Genera el movimiento de cobro del comprobante.</p>
                                </div>
                            </button>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 justify-end pt-4 border-t border-gray-200 dark:border-slate-800">
                        <Button color="gray" onClick={onClose} type="button">Cancelar</Button>
                        <Button
                            outline
                            color="black"
                            onClick={handleSubmit}
                            disabled={saving}
                            className="!bg-emerald-500 !text-white !border-none shadow-md shadow-emerald-200 dark:shadow-emerald-900/20 hover:opacity-90"
                        >
                            {saving ? <Icon icon="svg-spinners:270-ring-with-bg" width={16} className="mr-1" /> : <Icon icon="solar:check-circle-bold" width={16} className="mr-1" />}
                            {saving ? 'Importando...' : 'Importar comprobante'}
                        </Button>
                    </div>
                </div>
            </Modal>

            <ModalImportarLote
                isOpen={showLote}
                onClose={() => setShowLote(false)}
                onSuccess={() => { if (onSuccess) onSuccess(); }}
            />
        </>
    );
};

export default ModalImportarComprobante;
