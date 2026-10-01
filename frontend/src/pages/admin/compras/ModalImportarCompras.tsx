import { useMemo, useRef, useState } from 'react';
import Modal from '@/components/Modal';
import Button from '@/components/Button';
import { Icon } from '@iconify/react/dist/iconify.js';
import useAlertStore from '@/zustand/alert';
import apiClient from '@/utils/apiClient';

/**
 * Importar compras desde Excel (Compras → Importar Excel).
 *
 * Flujo en 3 pasos: (1) descargar la plantilla precargada con el catálogo y el
 * stock por sede, llenarla y subirla con las opciones; (2) VISTA PREVIA: el
 * backend agrupa las filas en compras (proveedor + documento + sede) y marca
 * cada línea OK / aviso / error sin grabar nada; (3) confirmar → se crean las
 * compras válidas (kardex, costo promedio, cuentas por pagar) y se muestra el
 * resultado. Mismo endpoint de parseo para la vista previa y la importación.
 */

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: () => void;
}

type EstadoLinea = 'OK' | 'AVISO' | 'ERROR';

interface LineaImport {
    fila: number;
    sedeId: number | null;
    sedeNombre: string;
    codigo: string;
    descripcion: string;
    productoId: number | null;
    productoNombre: string | null;
    productoNuevo: boolean;
    cantidad: number;
    costoUnitario: number;
    incluyeIgv: boolean;
    lote?: string;
    fechaVencimiento?: string;
    subtotal: number;
    total: number;
    estado: EstadoLinea;
    mensajes: string[];
}

interface CompraImport {
    clave: string;
    sedeId: number | null;
    sedeNombre: string;
    sedesNombres?: string[];
    proveedorRuc: string;
    proveedorNombre: string;
    proveedorExiste: boolean;
    tipoDoc: string;
    serie: string;
    numero: string;
    sinComprobante: boolean;
    fechaEmision: string;
    moneda: string;
    lineas: LineaImport[];
    subtotal: number;
    igv: number;
    total: number;
    estado: EstadoLinea;
    errores: string[];
}

interface PreviewImport {
    resumen: {
        filasLeidas: number;
        filasConCantidad: number;
        lineasOk: number;
        lineasAviso: number;
        lineasError: number;
        compras: number;
        comprasOk: number;
        comprasError: number;
        productosNuevos: number;
        totalGeneral: number;
    };
    sedes: { id: number; nombre: string }[];
    compras: CompraImport[];
    erroresGlobales: string[];
}

interface ResultadoImport extends PreviewImport {
    importadas: { compraId: number; serie: string; numero: string; sedeNombre: string; total: number; avisosStock?: string[]; pendienteAprobacion?: boolean }[];
    fallidas: { clave: string; serie: string; numero: string; motivo: string }[];
}

const money = (n: number, moneda = 'PEN') =>
    `${moneda === 'USD' ? 'US$' : 'S/'} ${Number(n || 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const ESTADO_STYLE: Record<EstadoLinea, { chip: string; icon: string; label: string }> = {
    OK: { chip: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400', icon: 'solar:check-circle-bold', label: 'OK' },
    AVISO: { chip: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400', icon: 'solar:danger-triangle-bold', label: 'Aviso' },
    ERROR: { chip: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400', icon: 'solar:close-circle-bold', label: 'Error' },
};

const Toggle = ({ value, onChange, label, hint }: { value: boolean; onChange: (v: boolean) => void; label: string; hint?: string }) => (
    <button
        type="button"
        onClick={() => onChange(!value)}
        className={`flex items-start gap-2.5 p-2.5 rounded-lg border text-left transition-all ${value ? 'border-violet-300 dark:border-violet-700 bg-violet-50 dark:bg-violet-900/20' : 'border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50'}`}
    >
        <div className={`mt-0.5 w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${value ? 'bg-violet-600 border-violet-600' : 'border-gray-300 dark:border-slate-500'}`}>
            {value && <Icon icon="mdi:check" width={11} className="text-white" />}
        </div>
        <div>
            <span className="block text-xs font-semibold text-gray-700 dark:text-gray-200">{label}</span>
            {hint && <span className="block text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">{hint}</span>}
        </div>
    </button>
);

const ModalImportarCompras = ({ isOpen, onClose, onSuccess }: Props) => {
    const { alert } = useAlertStore();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [file, setFile] = useState<File | null>(null);
    const [incluyeIgvDefault, setIncluyeIgvDefault] = useState(true);
    const [crearProductos, setCrearProductos] = useState(false);
    const [marcarPagado, setMarcarPagado] = useState(false);
    const [metodoPago, setMetodoPago] = useState('EFECTIVO');
    const [descargando, setDescargando] = useState(false);
    const [cargando, setCargando] = useState(false);
    const [preview, setPreview] = useState<PreviewImport | null>(null);
    const [resultado, setResultado] = useState<ResultadoImport | null>(null);
    const [abiertas, setAbiertas] = useState<Record<string, boolean>>({});

    const reset = () => {
        setFile(null);
        setPreview(null);
        setResultado(null);
        setAbiertas({});
        setCargando(false);
    };
    const handleClose = () => {
        reset();
        onClose();
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selected = e.target.files?.[0] || null;
        e.target.value = '';
        setFile(selected);
        setPreview(null);
        setResultado(null);
    };

    const descargarPlantilla = async () => {
        setDescargando(true);
        try {
            const res = await apiClient.get('/compras/importar/plantilla', { responseType: 'blob', timeout: 120000 });
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', 'plantilla_importar_compras.xlsx');
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch {
            alert('No se pudo descargar la plantilla.', 'error');
        } finally {
            setDescargando(false);
        }
    };

    const buildForm = () => {
        const fd = new FormData();
        fd.append('file', file as File);
        fd.append('incluyeIgvDefault', String(incluyeIgvDefault));
        fd.append('crearProductos', String(crearProductos));
        fd.append('marcarPagado', String(marcarPagado));
        fd.append('metodoPago', metodoPago);
        return fd;
    };

    const previsualizar = async () => {
        if (!file) {
            alert('Selecciona el archivo Excel.', 'error');
            return;
        }
        setCargando(true);
        setResultado(null);
        try {
            const res = await apiClient.post('/compras/importar/previsualizar', buildForm(), {
                headers: { 'Content-Type': 'multipart/form-data' },
                timeout: 180000,
            });
            const data: PreviewImport = res.data?.data ?? res.data;
            setPreview(data);
            // Compras con error abiertas por defecto para que se vea el motivo.
            const ab: Record<string, boolean> = {};
            data.compras.forEach((c) => { ab[c.clave] = c.estado === 'ERROR' || data.compras.length === 1; });
            setAbiertas(ab);
            if (data.resumen.filasConCantidad === 0) {
                alert('El archivo no tiene filas con CANTIDAD. Llena la cantidad de los productos comprados.', 'warning');
            }
        } catch (err: any) {
            alert(err?.response?.data?.message || 'No se pudo leer el archivo.', 'error');
        } finally {
            setCargando(false);
        }
    };

    const importar = async () => {
        if (!file || !preview) return;
        setCargando(true);
        try {
            const res = await apiClient.post('/compras/importar', buildForm(), {
                headers: { 'Content-Type': 'multipart/form-data' },
                timeout: 300000,
            });
            const data: ResultadoImport = res.data?.data ?? res.data;
            setResultado(data);
            if (data.importadas.length > 0) {
                alert(
                    `${data.importadas.length} compra(s) importada(s)${data.fallidas.length ? `, ${data.fallidas.length} con error` : ''}.`,
                    data.fallidas.length ? 'warning' : 'success',
                );
                onSuccess?.();
            } else {
                alert('No se importó ninguna compra. Revisa los errores.', 'error');
            }
        } catch (err: any) {
            alert(err?.response?.data?.message || 'Error al importar las compras.', 'error');
        } finally {
            setCargando(false);
        }
    };

    const comprasOk = useMemo(() => preview?.compras.filter((c) => c.estado !== 'ERROR') ?? [], [preview]);

    return (
        <Modal
            isOpenModal={isOpen}
            closeModal={handleClose}
            title="Importar compras desde Excel"
            icon="solar:import-bold-duotone"
            width="1040px"
            position="right"
        >
            <div className="px-4 pb-4 space-y-5 pt-5">
                {/* Paso 1: plantilla + archivo + opciones */}
                {!resultado && (
                    <>
                        <div className="p-4 rounded-xl border border-violet-200 dark:border-violet-800/50 bg-violet-50/60 dark:bg-violet-900/10">
                            <div className="flex items-start gap-2.5">
                                <Icon icon="solar:info-circle-bold-duotone" width={22} className="text-violet-500 shrink-0 mt-0.5" />
                                <div className="text-xs text-violet-900 dark:text-violet-200 space-y-1">
                                    <p className="font-semibold">La plantilla ya trae tu catálogo con el stock de cada sede.</p>
                                    <p>Escribe la cantidad comprada debajo de la columna de <b>cada sede</b> (<b>CANT. SEDE…</b>) y el <b>COSTO UNITARIO</b>; si un producto va a varias sedes, llena varias columnas en la misma fila. Las filas sin cantidad se ignoran. Los datos del comprobante (proveedor, serie, número, fecha) son opcionales: si los pones, las filas del mismo documento forman <b>una compra</b> con el stock repartido por sede; si no, se crea una compra <b>SIN COMPROBANTE</b> por sede.</p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={descargarPlantilla}
                                disabled={descargando}
                                className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-violet-700 dark:text-violet-300 hover:underline disabled:opacity-60"
                            >
                                {descargando ? <Icon icon="svg-spinners:270-ring-with-bg" width={15} /> : <Icon icon="solar:download-minimalistic-bold" width={15} />}
                                Descargar plantilla con mi inventario (.xlsx)
                            </button>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
                            <div className="lg:col-span-2 p-4 rounded-xl border border-gray-200 dark:border-slate-800">
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="w-full h-full min-h-[150px] flex flex-col items-center justify-center gap-2 py-6 rounded-xl border-2 border-dashed border-violet-200 dark:border-violet-800/50 bg-violet-50/40 dark:bg-violet-900/10 hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-colors"
                                >
                                    <Icon icon="solar:upload-minimalistic-bold-duotone" width={34} className="text-violet-500" />
                                    <span className="text-sm font-semibold text-violet-700 dark:text-violet-300">{file ? 'Cambiar archivo' : 'Selecciona el Excel'}</span>
                                    <span className="text-xs text-gray-400">.xlsx, .xls o .csv</span>
                                </button>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
                                    className="hidden"
                                    onChange={handleFileSelect}
                                />
                                {file && (
                                    <div className="mt-3 flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-gray-50 dark:bg-slate-800/60 border border-gray-100 dark:border-slate-700">
                                        <span className="flex items-center gap-2 text-xs text-gray-700 dark:text-gray-200 truncate">
                                            <Icon icon="solar:file-text-bold-duotone" width={16} className="text-violet-500 shrink-0" />
                                            <span className="truncate">{file.name}</span>
                                        </span>
                                        <button type="button" onClick={() => { setFile(null); setPreview(null); }} className="text-gray-400 hover:text-red-500 shrink-0">
                                            <Icon icon="solar:close-circle-bold" width={16} />
                                        </button>
                                    </div>
                                )}
                            </div>

                            <div className="lg:col-span-3 p-4 rounded-xl border border-gray-200 dark:border-slate-800 space-y-2.5">
                                <p className="text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide">Opciones</p>
                                <Toggle
                                    value={incluyeIgvDefault}
                                    onChange={setIncluyeIgvDefault}
                                    label="Los costos del Excel incluyen IGV"
                                    hint="Se usa cuando la columna INCLUYE IGV está vacía. El costo promedio siempre se guarda sin IGV."
                                />
                                <Toggle
                                    value={crearProductos}
                                    onChange={setCrearProductos}
                                    label="Crear los productos que no existan en mi catálogo"
                                    hint="Necesitan DESCRIPCIÓN. Se crean con stock 0 y precio de venta provisional (costo + 30%) para ajustarlo luego."
                                />
                                <Toggle
                                    value={marcarPagado}
                                    onChange={setMarcarPagado}
                                    label="Registrar las compras como pagadas"
                                    hint="Desmarcado: quedan pendientes de pago (cuentas por pagar)."
                                />
                                {marcarPagado && (
                                    <div className="flex items-center gap-2 pl-1">
                                        <span className="text-xs text-gray-500 dark:text-gray-400">Método de pago</span>
                                        <select
                                            value={metodoPago}
                                            onChange={(e) => setMetodoPago(e.target.value)}
                                            className="text-xs rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1 text-gray-700 dark:text-gray-200"
                                        >
                                            {['EFECTIVO', 'TRANSFERENCIA', 'YAPE', 'PLIN', 'TARJETA', 'OTRO'].map((m) => (
                                                <option key={m} value={m}>{m}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                            </div>
                        </div>
                    </>
                )}

                {/* Paso 2: vista previa */}
                {preview && !resultado && (
                    <div className="space-y-3">
                        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
                            <span className="px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                                {preview.resumen.filasConCantidad} línea(s) · {preview.resumen.compras} compra(s)
                            </span>
                            <span className="px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400">OK: {preview.resumen.lineasOk}</span>
                            {preview.resumen.lineasAviso > 0 && (
                                <span className="px-2.5 py-1 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">Avisos: {preview.resumen.lineasAviso}</span>
                            )}
                            {preview.resumen.lineasError > 0 && (
                                <span className="px-2.5 py-1 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400">Errores: {preview.resumen.lineasError}</span>
                            )}
                            {preview.resumen.productosNuevos > 0 && (
                                <span className="px-2.5 py-1 rounded-full bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400">Productos nuevos: {preview.resumen.productosNuevos}</span>
                            )}
                            <span className="ml-auto text-sm text-gray-800 dark:text-gray-100">
                                Total a importar: <b>{money(preview.resumen.totalGeneral)}</b>
                            </span>
                        </div>

                        {preview.erroresGlobales.map((e, i) => (
                            <p key={i} className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
                                <Icon icon="solar:close-circle-bold" width={14} /> {e}
                            </p>
                        ))}

                        {preview.resumen.comprasError > 0 && (
                            <p className="text-xs text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 rounded-lg px-3 py-2">
                                Las compras con <b>error</b> no se importan; corrige el Excel y vuelve a subirlo, o importa solo las {preview.resumen.comprasOk} compra(s) válida(s).
                            </p>
                        )}

                        <div className="space-y-2">
                            {preview.compras.map((c) => {
                                const st = ESTADO_STYLE[c.estado];
                                const open = !!abiertas[c.clave];
                                return (
                                    <div key={c.clave} className={`rounded-xl border ${c.estado === 'ERROR' ? 'border-red-200 dark:border-red-900/50' : 'border-gray-200 dark:border-slate-800'} overflow-hidden`}>
                                        <button
                                            type="button"
                                            onClick={() => setAbiertas((a) => ({ ...a, [c.clave]: !open }))}
                                            className="w-full flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2.5 text-left bg-gray-50/70 dark:bg-slate-800/40 hover:bg-gray-100/70 dark:hover:bg-slate-800/70"
                                        >
                                            <Icon icon={open ? 'solar:alt-arrow-down-bold' : 'solar:alt-arrow-right-bold'} width={14} className="text-gray-400" />
                                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${st.chip}`}>
                                                <Icon icon={st.icon} width={12} /> {st.label}
                                            </span>
                                            <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                                                {c.tipoDoc} {c.serie}-{c.numero}
                                                {c.sinComprobante && <span className="ml-1 text-[11px] font-normal text-gray-400">(número automático)</span>}
                                            </span>
                                            <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                                                <Icon icon="solar:shop-bold-duotone" width={13} />
                                                {(c.sedesNombres?.length ?? 0) > 1 ? `${c.sedesNombres!.length} sedes: ${c.sedesNombres!.join(' / ')}` : c.sedeNombre}
                                            </span>
                                            <span className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                                {c.proveedorNombre || c.proveedorRuc}
                                                {!c.proveedorExiste && <span className="ml-1 text-violet-500">(nuevo)</span>}
                                            </span>
                                            <span className="text-xs text-gray-500 dark:text-gray-400">{c.fechaEmision}</span>
                                            <span className="ml-auto text-xs text-gray-500 dark:text-gray-400">{c.lineas.length} línea(s)</span>
                                            <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">{money(c.total, c.moneda)}</span>
                                        </button>
                                        {c.errores.length > 0 && (
                                            <div className="px-3 py-2 text-xs text-red-600 dark:text-red-400 border-t border-red-100 dark:border-red-900/40 space-y-0.5">
                                                {c.errores.map((e, i) => <p key={i}>• {e}</p>)}
                                            </div>
                                        )}
                                        {open && (
                                            <div className="border-t border-gray-100 dark:border-slate-800 overflow-x-auto">
                                                <table className="w-full min-w-[720px] text-xs text-left">
                                                    <thead className="bg-white dark:bg-slate-900 text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-slate-800">
                                                        <tr>
                                                            <th className="px-3 py-1.5 w-12">Fila</th>
                                                            <th className="px-3 py-1.5 w-20">Estado</th>
                                                            <th className="px-3 py-1.5">Producto</th>
                                                            <th className="px-3 py-1.5 text-right">Cant.</th>
                                                            <th className="px-3 py-1.5 text-right">Costo unit.</th>
                                                            <th className="px-3 py-1.5 text-center">IGV</th>
                                                            <th className="px-3 py-1.5 text-right">Total</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                                                        {c.lineas.map((l) => {
                                                            const ls = ESTADO_STYLE[l.estado];
                                                            return (
                                                                <tr key={l.fila} className={l.estado === 'ERROR' ? 'bg-red-50/40 dark:bg-red-900/10' : ''}>
                                                                    <td className="px-3 py-1.5 text-gray-400">{l.fila}</td>
                                                                    <td className="px-3 py-1.5">
                                                                        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${ls.chip}`}>
                                                                            <Icon icon={ls.icon} width={11} /> {ls.label}
                                                                        </span>
                                                                    </td>
                                                                    <td className="px-3 py-1.5">
                                                                        <div className="text-gray-800 dark:text-gray-100">
                                                                            {l.codigo && <span className="font-mono text-[11px] text-gray-500 mr-1.5">{l.codigo}</span>}
                                                                            {l.productoNombre || l.descripcion || '—'}
                                                                            {l.productoNuevo && <span className="ml-1 text-[10px] text-violet-600 dark:text-violet-400 font-semibold">NUEVO</span>}
                                                                        </div>
                                                                        {(c.sedesNombres?.length ?? 0) > 1 && (
                                                                            <span className="inline-flex items-center gap-1 ml-1 text-[10px] font-semibold text-blue-700 bg-blue-50 border border-blue-200 dark:text-blue-300 dark:bg-blue-900/20 dark:border-blue-800/40 px-1.5 py-0.5 rounded">
                                                                                <Icon icon="solar:shop-bold-duotone" width={10} /> {l.sedeNombre}
                                                                            </span>
                                                                        )}
                                                                        {(l.lote || l.fechaVencimiento) && (
                                                                            <div className="text-[10px] text-gray-400">Lote {l.lote || '—'} · Venc. {l.fechaVencimiento || '—'}</div>
                                                                        )}
                                                                        {l.mensajes.map((m, i) => (
                                                                            <div key={i} className={`text-[11px] mt-0.5 ${l.estado === 'ERROR' ? 'text-red-600 dark:text-red-400' : 'text-amber-700 dark:text-amber-400'}`}>{m}</div>
                                                                        ))}
                                                                    </td>
                                                                    <td className="px-3 py-1.5 text-right tabular-nums text-gray-800 dark:text-gray-100">{l.cantidad}</td>
                                                                    <td className="px-3 py-1.5 text-right tabular-nums text-gray-800 dark:text-gray-100">{money(l.costoUnitario, c.moneda)}</td>
                                                                    <td className="px-3 py-1.5 text-center text-gray-500">{l.incluyeIgv ? 'incl.' : '+18%'}</td>
                                                                    <td className="px-3 py-1.5 text-right tabular-nums font-semibold text-gray-800 dark:text-gray-100">{money(l.total, c.moneda)}</td>
                                                                </tr>
                                                            );
                                                        })}
                                                    </tbody>
                                                    <tfoot className="bg-gray-50/70 dark:bg-slate-800/40 text-[11px] text-gray-600 dark:text-gray-300">
                                                        <tr>
                                                            <td colSpan={6} className="px-3 py-1.5 text-right">Subtotal {money(c.subtotal, c.moneda)} · IGV {money(c.igv, c.moneda)}</td>
                                                            <td className="px-3 py-1.5 text-right font-semibold text-gray-800 dark:text-gray-100">{money(c.total, c.moneda)}</td>
                                                        </tr>
                                                    </tfoot>
                                                </table>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Paso 3: resultado */}
                {resultado && (
                    <div className="space-y-3">
                        <div className="flex flex-wrap gap-2 text-xs font-semibold">
                            <span className="px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400">Importadas: {resultado.importadas.length}</span>
                            {resultado.fallidas.length > 0 && (
                                <span className="px-2.5 py-1 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400">Con error: {resultado.fallidas.length}</span>
                            )}
                            {resultado.resumen.comprasError > 0 && (
                                <span className="px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">No importadas (con errores en el Excel): {resultado.resumen.comprasError}</span>
                            )}
                        </div>
                        <div className="border border-gray-100 dark:border-slate-800 rounded-xl overflow-x-auto">
                            <table className="w-full min-w-[560px] text-sm text-left">
                                <thead className="bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-300 font-medium border-b border-gray-200 dark:border-slate-700">
                                    <tr>
                                        <th className="px-3 py-2">Compra</th>
                                        <th className="px-3 py-2">Sede</th>
                                        <th className="px-3 py-2 text-right">Total</th>
                                        <th className="px-3 py-2">Estado</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                                    {resultado.importadas.map((d) => (
                                        <tr key={`ok-${d.compraId}`}>
                                            <td className="px-3 py-2 text-gray-700 dark:text-gray-200">{d.serie}-{d.numero}</td>
                                            <td className="px-3 py-2 text-gray-600 dark:text-gray-300">{d.sedeNombre}</td>
                                            <td className="px-3 py-2 text-right tabular-nums text-gray-700 dark:text-gray-200">{money(d.total)}</td>
                                            <td className="px-3 py-2">
                                                {d.pendienteAprobacion ? (
                                                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600 dark:text-amber-400">
                                                        <Icon icon="solar:clock-circle-bold" width={14} /> Pendiente de aprobación (el stock entra al aprobar)
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                                                        <Icon icon="solar:check-circle-bold" width={14} /> Importada
                                                    </span>
                                                )}
                                                {d.avisosStock?.map((a, i) => (
                                                    <div key={i} className="text-[11px] text-amber-700 dark:text-amber-400 mt-0.5">{a}</div>
                                                ))}
                                            </td>
                                        </tr>
                                    ))}
                                    {resultado.fallidas.map((d, idx) => (
                                        <tr key={`err-${idx}`}>
                                            <td className="px-3 py-2 text-gray-600 dark:text-gray-300">{d.serie}-{d.numero}</td>
                                            <td className="px-3 py-2" />
                                            <td className="px-3 py-2" />
                                            <td className="px-3 py-2">
                                                <span className="inline-flex items-start gap-1 text-xs font-semibold text-red-500 dark:text-red-400">
                                                    <Icon icon="solar:close-circle-bold" width={14} className="mt-0.5 shrink-0" />
                                                    <span>{d.motivo}</span>
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                    {resultado.compras.filter((c) => c.estado === 'ERROR').map((c) => (
                                        <tr key={`skip-${c.clave}`} className="opacity-70">
                                            <td className="px-3 py-2 text-gray-600 dark:text-gray-300">{c.serie}-{c.numero}</td>
                                            <td className="px-3 py-2 text-gray-500">{c.sedeNombre}</td>
                                            <td className="px-3 py-2 text-right tabular-nums text-gray-500">{money(c.total, c.moneda)}</td>
                                            <td className="px-3 py-2 text-xs text-gray-500">No importada: tenía errores en el Excel</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Acciones */}
                <div className="flex flex-wrap gap-3 justify-end pt-4 border-t border-gray-200 dark:border-slate-800">
                    <Button color="gray" onClick={handleClose} type="button">{resultado ? 'Cerrar' : 'Cancelar'}</Button>
                    {resultado ? (
                        <Button outline color="black" onClick={reset} className="!bg-violet-600 !text-white !border-none shadow-md hover:opacity-90">
                            <Icon icon="solar:upload-bold" width={16} className="mr-1" /> Importar otro archivo
                        </Button>
                    ) : !preview ? (
                        <Button outline color="black" onClick={previsualizar} disabled={cargando || !file} className="!bg-violet-600 !text-white !border-none shadow-md hover:opacity-90">
                            {cargando ? <Icon icon="svg-spinners:270-ring-with-bg" width={16} className="mr-1" /> : <Icon icon="solar:eye-bold" width={16} className="mr-1" />}
                            {cargando ? 'Leyendo…' : 'Ver vista previa'}
                        </Button>
                    ) : (
                        <>
                            <Button color="gray" onClick={previsualizar} disabled={cargando} type="button">
                                <Icon icon="solar:refresh-bold" width={16} className="mr-1" /> Volver a leer
                            </Button>
                            <Button outline color="black" onClick={importar} disabled={cargando || comprasOk.length === 0} className="!bg-emerald-600 !text-white !border-none shadow-md hover:opacity-90">
                                {cargando ? <Icon icon="svg-spinners:270-ring-with-bg" width={16} className="mr-1" /> : <Icon icon="solar:check-circle-bold" width={16} className="mr-1" />}
                                {cargando ? 'Importando…' : `Importar ${comprasOk.length} compra(s)`}
                            </Button>
                        </>
                    )}
                </div>
            </div>
        </Modal>
    );
};

export default ModalImportarCompras;
