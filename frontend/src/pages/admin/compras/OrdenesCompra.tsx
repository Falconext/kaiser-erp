import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from '@iconify/react';
import moment from 'moment';
import { get, post, put, patch } from '@/utils/fetch';
import apiClient from '@/utils/apiClient';
import useAlertStore from '@/zustand/alert';
import { useDebounce } from '@/hooks/useDebounce';
import Modal from '@/components/Modal';
import ModalConfirm from '@/components/ModalConfirm';
import TableSkeleton from '@/components/Skeletons/table';
import InputPro from '@/components/InputPro';
import Select from '@/components/Select';
import { Calendar } from '@/components/Date';

interface DetalleOC {
    productoId?: number;
    descripcion: string;
    cantidad: number;
    precioUnitario: number;
}

interface OrdenCompra {
    id: number;
    numero: number;
    numeroFormato: string;
    fechaEmision: string;
    fechaEntrega?: string | null;
    moneda: string;
    subtotal: any;
    igv: any;
    total: any;
    estado: 'BORRADOR' | 'EMITIDA' | 'RECIBIDA' | 'ANULADA';
    observaciones?: string | null;
    condicionesPago?: string | null;
    lugarEntrega?: string | null;
    proveedorId?: number;
    proveedor?: { nombre: string; nroDoc?: string };
    usuario?: { nombre: string };
    compra?: { id: number; serie: string; numero: string } | null;
    detalles?: any[];
    _count?: { detalles: number };
}

const ESTADO_STYLE: Record<string, string> = {
    BORRADOR: 'bg-gray-100 text-gray-600 dark:bg-slate-700/60 dark:text-gray-300',
    EMITIDA: 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300',
    RECIBIDA: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300',
    ANULADA: 'bg-rose-50 text-rose-500 dark:bg-rose-900/30 dark:text-rose-300',
};

const ESTADO_LABEL: Record<string, string> = {
    BORRADOR: 'Borrador',
    EMITIDA: 'Emitida',
    RECIBIDA: 'Recibida',
    ANULADA: 'Anulada',
};

const inputCls =
    'w-full px-3 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 text-sm text-gray-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-300';
const lblCls = 'block text-[11px] font-black uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1';

export default function OrdenesCompraPage() {
    const { alert } = useAlertStore();
    const [ordenes, setOrdenes] = useState<OrdenCompra[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [estado, setEstado] = useState('TODOS');
    const [fechaInicio, setFechaInicio] = useState(moment().startOf('month').format('YYYY-MM-DD'));
    const [fechaFin, setFechaFin] = useState(moment().endOf('month').format('YYYY-MM-DD'));
    const debouncedSearch = useDebounce(search, 600);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [ordenEdit, setOrdenEdit] = useState<OrdenCompra | null>(null);
    const [recibirOrden, setRecibirOrden] = useState<OrdenCompra | null>(null);
    const [anularOrden, setAnularOrden] = useState<OrdenCompra | null>(null);
    const [descargandoId, setDescargandoId] = useState<number | null>(null);

    const cargar = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({ estado, limit: '50' });
            if (debouncedSearch) params.set('search', debouncedSearch);
            if (fechaInicio) params.set('fechaInicio', fechaInicio);
            if (fechaFin) params.set('fechaFin', fechaFin);
            const resp: any = await get(`compras/ordenes?${params.toString()}`);
            setOrdenes(resp?.data?.data ?? []);
            setTotal(resp?.data?.total ?? 0);
        } catch {
            alert('No se pudieron cargar las órdenes de compra', 'error');
        } finally {
            setLoading(false);
        }
    }, [debouncedSearch, estado, fechaInicio, fechaFin, alert]);

    useEffect(() => { cargar(); }, [cargar]);

    const descargarPdf = async (orden: OrdenCompra) => {
        setDescargandoId(orden.id);
        try {
            const resp = await apiClient.get(`/compras/ordenes/${orden.id}/pdf`, { responseType: 'blob', timeout: 60_000 });
            const url = window.URL.createObjectURL(new Blob([resp.data as any]));
            const link = document.createElement('a');
            link.href = url;
            link.download = `${orden.numeroFormato}.pdf`;
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch {
            alert('No se pudo generar el PDF', 'error');
        } finally {
            setDescargandoId(null);
        }
    };

    const confirmarAnular = async () => {
        if (!anularOrden) return;
        const resp: any = await patch(`compras/ordenes/${anularOrden.id}/anular`, {});
        if (resp.success) {
            alert(`Orden ${anularOrden.numeroFormato} anulada`, 'success');
            setAnularOrden(null);
            cargar();
        } else {
            alert(resp.error || 'No se pudo anular', 'error');
        }
    };

    const abrirEditar = async (orden: OrdenCompra) => {
        const resp: any = await get(`compras/ordenes/${orden.id}`);
        if (resp.success) {
            setOrdenEdit(resp.data);
            setIsModalOpen(true);
        }
    };

    const monedaFmt = (o: OrdenCompra) => (o.moneda === 'USD' ? 'US$' : 'S/');

    return (
        <div className="min-h-screen px-2 pb-6">
            {/* Header */}
            <div className="mb-5 flex flex-col items-start justify-between gap-3 pt-4 sm:flex-row sm:items-center">
                <div>
                    <h1 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-2xl">Órdenes de Compra</h1>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        Pide mercadería a tus proveedores y conviértela en compra al recibirla.
                    </p>
                </div>
                <button
                    onClick={() => { setOrdenEdit(null); setIsModalOpen(true); }}
                    className="inline-flex items-center gap-2 rounded-xl btn-accent px-5 py-2.5 text-sm font-black shadow-lg shadow-black/20 transition-all active:scale-95"
                >
                    <Icon icon="solar:add-circle-bold" className="text-lg" />
                    Nueva Orden
                </button>
            </div>

            {/* Filtros */}
            <div className="mb-5 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-[#111827]">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
                    <div className="flex-1">
                        <InputPro
                            name="search"
                            label="Buscar por proveedor, RUC o N° de orden"
                            isLabel
                            value={search}
                            onChange={(e: any) => setSearch(e.target.value)}
                        />
                    </div>
                    <div className="lg:w-44">
                        <Calendar
                            text="Fecha inicio"
                            name="fechaInicio"
                            value={fechaInicio ? moment(fechaInicio, 'YYYY-MM-DD').format('DD/MM/YYYY') : ''}
                            onChange={(date: string) => { if (moment(date, 'DD/MM/YYYY', true).isValid()) setFechaInicio(moment(date, 'DD/MM/YYYY').format('YYYY-MM-DD')); }}
                            portal
                        />
                    </div>
                    <div className="lg:w-44">
                        <Calendar
                            text="Fecha fin"
                            name="fechaFin"
                            value={fechaFin ? moment(fechaFin, 'YYYY-MM-DD').format('DD/MM/YYYY') : ''}
                            onChange={(date: string) => { if (moment(date, 'DD/MM/YYYY', true).isValid()) setFechaFin(moment(date, 'DD/MM/YYYY').format('YYYY-MM-DD')); }}
                            portal
                        />
                    </div>
                    <div className="lg:w-44">
                        <Select
                            name="estado"
                            label="Estado"
                            error={() => { }}
                            withLabel
                            value={estado}
                            options={[
                                { id: 'TODOS', value: 'Todos los estados' },
                                { id: 'BORRADOR', value: 'Borrador' },
                                { id: 'EMITIDA', value: 'Emitida' },
                                { id: 'RECIBIDA', value: 'Recibida' },
                                { id: 'ANULADA', value: 'Anulada' },
                            ]}
                            onChange={(id: any) => setEstado(String(id))}
                        />
                    </div>
                </div>
            </div>

            {/* Tabla */}
            {loading && ordenes.length === 0 ? (
                <TableSkeleton />
            ) : ordenes.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-14 text-center dark:border-slate-700 dark:bg-[#111827]">
                    <Icon icon="solar:clipboard-list-bold-duotone" className="mx-auto text-5xl text-gray-300 dark:text-slate-600" />
                    <p className="mt-3 font-bold text-gray-700 dark:text-gray-200">Aún no hay órdenes de compra</p>
                    <p className="mt-1 text-sm text-gray-400">Crea tu primera orden y envíasela a tu proveedor en PDF.</p>
                </div>
            ) : (
                <div className="overflow-x-auto rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-slate-800 dark:bg-[#111827]">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-gray-100 text-left text-[11px] font-black uppercase tracking-wide text-gray-500 dark:border-slate-700 dark:text-gray-400">
                                <th className="px-4 py-3">N°</th>
                                <th className="px-4 py-3">Emisión</th>
                                <th className="px-4 py-3">Proveedor</th>
                                <th className="px-4 py-3">Entrega</th>
                                <th className="px-4 py-3">Ítems</th>
                                <th className="px-4 py-3 text-right">Total</th>
                                <th className="px-4 py-3">Estado</th>
                                <th className="px-4 py-3">Compra</th>
                                <th className="px-4 py-3 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {ordenes.map((o) => (
                                <tr key={o.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60 dark:border-slate-800 dark:hover:bg-slate-800/40">
                                    <td className="px-4 py-3 font-black text-gray-900 dark:text-white">{o.numeroFormato}</td>
                                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{moment(o.fechaEmision).format('DD/MM/YYYY')}</td>
                                    <td className="px-4 py-3">
                                        <p className="font-semibold text-gray-800 dark:text-gray-100">{o.proveedor?.nombre}</p>
                                        <p className="text-xs text-gray-400">{o.proveedor?.nroDoc}</p>
                                    </td>
                                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{o.fechaEntrega ? moment(o.fechaEntrega).format('DD/MM/YYYY') : '—'}</td>
                                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{o._count?.detalles ?? o.detalles?.length ?? 0}</td>
                                    <td className="px-4 py-3 text-right font-black text-gray-900 dark:text-white">{monedaFmt(o)} {Number(o.total).toFixed(2)}</td>
                                    <td className="px-4 py-3">
                                        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-bold ${ESTADO_STYLE[o.estado]}`}>{ESTADO_LABEL[o.estado]}</span>
                                    </td>
                                    <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">
                                        {o.compra ? `${o.compra.serie}-${o.compra.numero}` : '—'}
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center justify-end gap-1.5">
                                            <button
                                                onClick={() => descargarPdf(o)}
                                                title="Descargar PDF para el proveedor"
                                                className="rounded-lg border border-gray-200 p-2 text-gray-500 transition hover:bg-rose-50 hover:text-rose-500 dark:border-slate-700 dark:text-gray-300 dark:hover:bg-slate-700"
                                            >
                                                <Icon icon={descargandoId === o.id ? 'svg-spinners:180-ring' : 'solar:file-text-bold-duotone'} className="text-base" />
                                            </button>
                                            {(o.estado === 'BORRADOR' || o.estado === 'EMITIDA') && (
                                                <>
                                                    <button
                                                        onClick={() => abrirEditar(o)}
                                                        title="Editar orden"
                                                        className="rounded-lg border border-gray-200 p-2 text-gray-500 transition hover:bg-blue-50 hover:text-blue-500 dark:border-slate-700 dark:text-gray-300 dark:hover:bg-slate-700"
                                                    >
                                                        <Icon icon="solar:pen-2-bold-duotone" className="text-base" />
                                                    </button>
                                                    <button
                                                        onClick={() => setRecibirOrden(o)}
                                                        title="Recibir mercadería (crear compra)"
                                                        className="rounded-lg border border-emerald-200 bg-emerald-50 p-2 text-emerald-600 transition hover:bg-emerald-100 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-300"
                                                    >
                                                        <Icon icon="solar:box-bold-duotone" className="text-base" />
                                                    </button>
                                                    <button
                                                        onClick={() => setAnularOrden(o)}
                                                        title="Anular orden"
                                                        className="rounded-lg border border-gray-200 p-2 text-gray-500 transition hover:bg-rose-50 hover:text-rose-500 dark:border-slate-700 dark:text-gray-300 dark:hover:bg-slate-700"
                                                    >
                                                        <Icon icon="solar:close-circle-bold-duotone" className="text-base" />
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    <div className="border-t border-gray-100 px-4 py-3 text-xs font-semibold text-gray-400 dark:border-slate-800">{total} orden(es)</div>
                </div>
            )}

            {isModalOpen && (
                <ModalOrdenCompra
                    orden={ordenEdit}
                    onClose={() => { setIsModalOpen(false); setOrdenEdit(null); }}
                    onSaved={() => { setIsModalOpen(false); setOrdenEdit(null); cargar(); }}
                />
            )}

            {recibirOrden && (
                <ModalRecibirOrden
                    orden={recibirOrden}
                    onClose={() => setRecibirOrden(null)}
                    onSaved={() => { setRecibirOrden(null); cargar(); }}
                />
            )}

            <ModalConfirm
                isOpenModal={Boolean(anularOrden)}
                setIsOpenModal={(v: boolean) => { if (!v) setAnularOrden(null); }}
                title="Anular Orden de Compra"
                information={`¿Seguro que deseas anular la orden ${anularOrden?.numeroFormato}? Esta acción no se puede deshacer.`}
                confirmSubmit={confirmarAnular}
            />
        </div>
    );
}

/* ─── Modal Crear/Editar ─────────────────────────────────────────────────── */
function ModalOrdenCompra({ orden, onClose, onSaved }: { orden: OrdenCompra | null; onClose: () => void; onSaved: () => void }) {
    const { alert } = useAlertStore();
    const esEdicion = Boolean(orden?.id);

    const [proveedorQuery, setProveedorQuery] = useState(orden?.proveedor?.nombre ?? '');
    const [proveedorId, setProveedorId] = useState<number | null>(orden?.proveedorId ?? null);
    const [proveedorOpts, setProveedorOpts] = useState<any[]>([]);
    const [showProvOpts, setShowProvOpts] = useState(false);
    const [buscandoDoc, setBuscandoDoc] = useState(false);

    // RUC/DNI + Enter: busca el proveedor en la empresa; si no existe, lo
    // consulta en SUNAT/RENIEC y lo crea como PROVEEDOR automáticamente.
    const buscarProveedorPorDoc = async () => {
        const doc = proveedorQuery.replace(/\D/g, '');
        if (doc.length !== 8 && doc.length !== 11) {
            alert('Escribe un RUC (11 dígitos) o DNI (8) y presiona Enter, o busca por nombre', 'warning');
            return;
        }
        const tipo = doc.length === 11 ? 'RUC' : 'DNI';
        setBuscandoDoc(true);
        try {
            // 1) ¿Ya existe en la empresa?
            const respBusq: any = await get(`clientes?search=${doc}&limit=5`);
            const lista = respBusq?.data?.clientes ?? respBusq?.data?.data ?? [];
            const existente = Array.isArray(lista) ? lista.find((c: any) => String(c.nroDoc) === doc) : null;
            if (existente) {
                setProveedorId(existente.id);
                setProveedorQuery(existente.nombre);
                setShowProvOpts(false);
                alert(`Proveedor: ${existente.nombre}`, 'success');
                return;
            }
            // 2) Consultar padrón y crear como PROVEEDOR
            const respDoc: any = await get(`clientes/consultar/${tipo}/${doc}`);
            const info = respDoc?.data;
            const nombre = info?.nombre_o_razon_social || info?.nombre_completo || '';
            if (!nombre) {
                alert('No se encontraron datos en SUNAT/RENIEC para ese documento', 'error');
                return;
            }
            const respCrear: any = await post('clientes', {
                tipoDoc: tipo,
                nroDoc: doc,
                nombre,
                direccion: info?.direccion || info?.direccion_completa || '',
                departamento: info?.departamento || '',
                provincia: info?.provincia || '',
                distrito: info?.distrito || '',
                ubigeo: info?.ubigeo_sunat || '',
                persona: 'PROVEEDOR',
                estado: 'ACTIVO',
            });
            if (respCrear.success) {
                const creado = respCrear.data ?? {};
                setProveedorId(Number(creado.id));
                setProveedorQuery(nombre);
                setShowProvOpts(false);
                alert(`Proveedor creado y seleccionado: ${nombre}`, 'success');
            } else {
                alert(respCrear.error || 'No se pudo registrar el proveedor', 'error');
            }
        } finally {
            setBuscandoDoc(false);
        }
    };
    const provBoxRef = useRef<HTMLDivElement>(null);
    const debouncedProv = useDebounce(proveedorQuery, 500);

    const [fechaEntrega, setFechaEntrega] = useState(orden?.fechaEntrega ? moment(orden.fechaEntrega).format('YYYY-MM-DD') : '');
    const [condicionesPago, setCondicionesPago] = useState(orden?.condicionesPago ?? '');
    const [lugarEntrega, setLugarEntrega] = useState(orden?.lugarEntrega ?? '');
    const [observaciones, setObservaciones] = useState(orden?.observaciones ?? '');
    const [moneda, setMoneda] = useState(orden?.moneda ?? 'PEN');
    const [aplicaIgv, setAplicaIgv] = useState(orden ? Number(orden.igv) > 0 : true);

    const [detalles, setDetalles] = useState<DetalleOC[]>(
        (orden?.detalles ?? []).map((d: any) => ({
            productoId: d.productoId ?? undefined,
            descripcion: d.descripcion,
            cantidad: Number(d.cantidad),
            precioUnitario: Number(d.precioUnitario),
        })),
    );

    // Buscador de productos del catálogo
    const [prodQuery, setProdQuery] = useState('');
    const [prodOpts, setProdOpts] = useState<any[]>([]);
    const debouncedProd = useDebounce(prodQuery, 500);
    // Ítem libre
    const [libreDesc, setLibreDesc] = useState('');
    const [libreCant, setLibreCant] = useState('1');
    const [librePrecio, setLibrePrecio] = useState('');
    const [guardando, setGuardando] = useState(false);

    useEffect(() => {
        if (!debouncedProv.trim() || debouncedProv === orden?.proveedor?.nombre) { setProveedorOpts([]); return; }
        (async () => {
            const resp: any = await get(`clientes?search=${encodeURIComponent(debouncedProv)}&persona=PROVEEDOR&limit=8`);
            const arr = resp?.data?.clientes ?? resp?.data?.data ?? [];
            setProveedorOpts(Array.isArray(arr) ? arr : []);
            setShowProvOpts(true);
        })();
    }, [debouncedProv, orden?.proveedor?.nombre]);

    useEffect(() => {
        if (!debouncedProd.trim()) { setProdOpts([]); return; }
        (async () => {
            const resp: any = await get(`productos?search=${encodeURIComponent(debouncedProd)}&limit=8`);
            const arr = resp?.data?.productos ?? resp?.data?.data ?? [];
            setProdOpts(Array.isArray(arr) ? arr : []);
        })();
    }, [debouncedProd]);

    const agregarProducto = (p: any) => {
        setDetalles((prev) => [...prev, {
            productoId: p.id,
            descripcion: p.descripcion,
            cantidad: 1,
            precioUnitario: Number(p.costoPromedio ?? 0) || 0,
        }]);
        setProdQuery('');
        setProdOpts([]);
    };

    const agregarLibre = () => {
        if (!libreDesc.trim()) { alert('Escribe la descripción del ítem', 'warning'); return; }
        setDetalles((prev) => [...prev, {
            descripcion: libreDesc.trim().toUpperCase(),
            cantidad: Number(libreCant) || 1,
            precioUnitario: Number(librePrecio) || 0,
        }]);
        setLibreDesc(''); setLibreCant('1'); setLibrePrecio('');
    };

    const actualizarDetalle = (i: number, campo: 'cantidad' | 'precioUnitario', valor: string) => {
        setDetalles((prev) => prev.map((d, j) => (j === i ? { ...d, [campo]: Number(valor) || 0 } : d)));
    };

    const subtotal = useMemo(() => detalles.reduce((s, d) => s + d.cantidad * d.precioUnitario, 0), [detalles]);
    const igv = aplicaIgv ? subtotal * 0.18 : 0;
    const mon = moneda === 'USD' ? 'US$' : 'S/';

    const guardar = async (estadoFinal: 'BORRADOR' | 'EMITIDA') => {
        if (!proveedorId) { alert('Selecciona un proveedor', 'warning'); return; }
        if (detalles.length === 0) { alert('Agrega al menos un ítem', 'warning'); return; }
        setGuardando(true);
        try {
            const payload = {
                proveedorId,
                fechaEntrega: fechaEntrega || undefined,
                condicionesPago: condicionesPago || undefined,
                lugarEntrega: lugarEntrega || undefined,
                observaciones: observaciones || undefined,
                moneda,
                aplicaIgv,
                estado: estadoFinal,
                detalles,
            };
            const resp: any = esEdicion
                ? await put(`compras/ordenes/${orden!.id}`, payload)
                : await post('compras/ordenes', payload);
            if (resp.success) {
                alert(esEdicion ? 'Orden actualizada' : `Orden creada correctamente`, 'success');
                onSaved();
            } else {
                alert(resp.error || 'No se pudo guardar la orden', 'error');
            }
        } finally {
            setGuardando(false);
        }
    };

    return (
        <Modal isOpenModal closeModal={onClose} title={esEdicion ? `Editar ${orden?.numeroFormato}` : 'Nueva Orden de Compra'} icon="solar:clipboard-list-bold-duotone" width="860px" position="right">
            <div className="space-y-4 p-4">
                {/* Proveedor */}
                <div ref={provBoxRef} className="relative">
                    <label className={lblCls}>Proveedor *</label>
                    <input
                        value={proveedorQuery}
                        onChange={(e) => { setProveedorQuery(e.target.value); setProveedorId(null); }}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && /^\d{8}$|^\d{11}$/.test(proveedorQuery.replace(/\D/g, ''))) {
                                e.preventDefault();
                                void buscarProveedorPorDoc();
                            }
                        }}
                        disabled={buscandoDoc}
                        placeholder="Busca por nombre, o escribe el RUC/DNI y presiona Enter para traerlo de SUNAT..."
                        className={inputCls}
                    />
                    {buscandoDoc && <Icon icon="svg-spinners:180-ring" className="absolute right-3 top-9 text-lg text-violet-500" />}
                    {!buscandoDoc && proveedorId && <Icon icon="solar:check-circle-bold" className="absolute right-3 top-9 text-lg text-emerald-500" />}
                    {showProvOpts && proveedorOpts.length > 0 && !proveedorId && (
                        <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900">
                            {proveedorOpts.map((p) => (
                                <button
                                    key={p.id}
                                    type="button"
                                    onClick={() => { setProveedorId(p.id); setProveedorQuery(p.nombre); setShowProvOpts(false); }}
                                    className="block w-full px-4 py-2.5 text-left text-sm hover:bg-blue-50 dark:hover:bg-slate-800"
                                >
                                    <span className="font-semibold text-gray-800 dark:text-gray-100">{p.nombre}</span>
                                    <span className="ml-2 text-xs text-gray-400">{p.nroDoc}</span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div>
                        <Calendar
                            text="Fecha de entrega"
                            name="fechaEntrega"
                            value={fechaEntrega ? moment(fechaEntrega, 'YYYY-MM-DD').format('DD/MM/YYYY') : ''}
                            onChange={(date: string) => { if (moment(date, 'DD/MM/YYYY', true).isValid()) setFechaEntrega(moment(date, 'DD/MM/YYYY').format('YYYY-MM-DD')); }}
                            portal
                        />
                    </div>
                    <div>
                        <InputPro
                            name="condicionesPago"
                            label="Condiciones de pago (Ej: Crédito 30 días)"
                            isLabel
                            value={condicionesPago}
                            onChange={(e: any) => setCondicionesPago(e.target.value)}
                        />
                    </div>
                    <div>
                        <Select
                            name="moneda"
                            label="Moneda"
                            error={() => { }}
                            withLabel
                            value={moneda}
                            options={[
                                { id: 'PEN', value: 'Soles (S/)' },
                                { id: 'USD', value: 'Dólares (US$)' },
                            ]}
                            onChange={(id: any) => setMoneda(String(id))}
                        />
                    </div>
                </div>
                <div>
                    <InputPro
                        name="lugarEntrega"
                        label="Lugar de entrega (dirección o sede donde debe entregar el proveedor)"
                        isLabel
                        value={lugarEntrega}
                        onChange={(e: any) => setLugarEntrega(e.target.value)}
                    />
                </div>

                {/* Ítems */}
                <div className="rounded-2xl border border-gray-100 p-3 dark:border-slate-800">
                    <p className="mb-2 text-xs font-black uppercase tracking-wide text-gray-500 dark:text-gray-400">Ítems del pedido</p>

                    <div className="relative">
                        <input
                            value={prodQuery}
                            onChange={(e) => setProdQuery(e.target.value)}
                            placeholder="🔍 Buscar producto del catálogo para pedir..."
                            className={inputCls}
                        />
                        {prodOpts.length > 0 && (
                            <div className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900">
                                {prodOpts.map((p) => (
                                    <button
                                        key={p.id}
                                        type="button"
                                        onClick={() => agregarProducto(p)}
                                        className="flex w-full items-center justify-between px-4 py-2.5 text-left text-sm hover:bg-blue-50 dark:hover:bg-slate-800"
                                    >
                                        <span className="font-semibold text-gray-800 dark:text-gray-100">{p.descripcion}</span>
                                        <span className="text-xs text-gray-400">Stock: {Number(p.stock ?? 0)}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="mt-2 flex flex-col gap-2 rounded-xl border border-dashed border-indigo-200 bg-indigo-50/40 p-2 dark:border-indigo-900/40 dark:bg-indigo-950/10 lg:flex-row">
                        <input value={libreDesc} onChange={(e) => setLibreDesc(e.target.value)} placeholder="Ítem libre: descripción (flete, servicio, producto nuevo...)" className={`${inputCls} flex-1`} />
                        <input type="number" min="0.001" value={libreCant} onChange={(e) => setLibreCant(e.target.value)} placeholder="Cant." className={`${inputCls} lg:w-24`} />
                        <input type="number" min="0" step="0.01" value={librePrecio} onChange={(e) => setLibrePrecio(e.target.value)} placeholder="P. Unit." className={`${inputCls} lg:w-28`} />
                        <button type="button" onClick={agregarLibre} className="rounded-xl btn-accent px-4 py-2.5 text-sm font-black">
                            Agregar
                        </button>
                    </div>

                    {detalles.length > 0 && (
                        <table className="mt-3 w-full text-sm">
                            <thead>
                                <tr className="text-left text-[10px] font-black uppercase tracking-wide text-gray-400">
                                    <th className="py-1.5">Descripción</th>
                                    <th className="w-24 py-1.5">Cant.</th>
                                    <th className="w-28 py-1.5">P. Unit.</th>
                                    <th className="w-24 py-1.5 text-right">Subtotal</th>
                                    <th className="w-10" />
                                </tr>
                            </thead>
                            <tbody>
                                {detalles.map((d, i) => (
                                    <tr key={i} className="border-t border-gray-50 dark:border-slate-800">
                                        <td className="py-2 pr-2 font-semibold text-gray-800 dark:text-gray-100">
                                            {d.descripcion}
                                            {!d.productoId && <span className="ml-2 rounded bg-indigo-100 px-1.5 py-0.5 text-[10px] font-bold text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-300">libre</span>}
                                        </td>
                                        <td className="py-2 pr-2">
                                            <input type="number" min="0.001" value={d.cantidad} onChange={(e) => actualizarDetalle(i, 'cantidad', e.target.value)} className={`${inputCls} !py-1.5`} />
                                        </td>
                                        <td className="py-2 pr-2">
                                            <input type="number" min="0" step="0.01" value={d.precioUnitario} onChange={(e) => actualizarDetalle(i, 'precioUnitario', e.target.value)} className={`${inputCls} !py-1.5`} />
                                        </td>
                                        <td className="py-2 text-right font-bold text-gray-900 dark:text-white">{mon} {(d.cantidad * d.precioUnitario).toFixed(2)}</td>
                                        <td className="py-2 text-right">
                                            <button type="button" onClick={() => setDetalles((prev) => prev.filter((_, j) => j !== i))} className="text-gray-300 transition hover:text-rose-500">
                                                <Icon icon="solar:trash-bin-trash-bold" className="text-base" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                <div>
                    <label className={lblCls}>Observaciones para el proveedor</label>
                    <textarea value={observaciones} onChange={(e) => setObservaciones(e.target.value)} rows={2} className={inputCls} />
                </div>

                {/* Totales + acciones */}
                <div className="flex flex-col items-end gap-3 border-t border-gray-100 pt-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
                    <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-gray-600 dark:text-gray-300">
                        <input type="checkbox" checked={aplicaIgv} onChange={(e) => setAplicaIgv(e.target.checked)} className="h-4 w-4 rounded accent-blue-600" />
                        Aplicar IGV (18%)
                    </label>
                    <div className="text-right">
                        <p className="text-xs text-gray-400">Subtotal {mon} {subtotal.toFixed(2)} · IGV {mon} {igv.toFixed(2)}</p>
                        <p className="text-xl font-black text-gray-900 dark:text-white">TOTAL {mon} {(subtotal + igv).toFixed(2)}</p>
                    </div>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                    <button type="button" onClick={() => guardar('BORRADOR')} disabled={guardando} className="rounded-xl border border-gray-200 px-5 py-3 text-sm font-black text-gray-600 transition hover:bg-gray-50 disabled:opacity-50 dark:border-slate-700 dark:text-gray-300 dark:hover:bg-slate-800">
                        Guardar borrador
                    </button>
                    <button type="button" onClick={() => guardar('EMITIDA')} disabled={guardando} className="inline-flex items-center justify-center gap-2 rounded-xl btn-accent px-6 py-3 text-sm font-black shadow-lg shadow-black/20 transition disabled:opacity-50">
                        <Icon icon={guardando ? 'svg-spinners:180-ring' : 'solar:clipboard-check-bold'} className="text-lg" />
                        {esEdicion ? 'Guardar cambios' : 'Emitir orden'}
                    </button>
                </div>
            </div>
        </Modal>
    );
}

/* ─── Modal Recibir (crea la Compra) ─────────────────────────────────────── */
function ModalRecibirOrden({ orden, onClose, onSaved }: { orden: OrdenCompra; onClose: () => void; onSaved: () => void }) {
    const { alert } = useAlertStore();
    const [tipoDoc, setTipoDoc] = useState('FACTURA');
    const [serie, setSerie] = useState('');
    const [numero, setNumero] = useState('');
    const [fechaEmision, setFechaEmision] = useState(moment().format('YYYY-MM-DD'));
    const [formaPago, setFormaPago] = useState('CONTADO');
    const [fechaVencimiento, setFechaVencimiento] = useState('');
    const [guardando, setGuardando] = useState(false);

    const recibir = async () => {
        if (!serie.trim() || !numero.trim()) { alert('Ingresa la serie y número del documento del proveedor', 'warning'); return; }
        setGuardando(true);
        try {
            const resp: any = await post(`compras/ordenes/${orden.id}/recibir`, {
                tipoDoc,
                serie: serie.trim().toUpperCase(),
                numero: numero.trim(),
                fechaEmision,
                formaPago,
                fechaVencimiento: formaPago === 'CREDITO' && fechaVencimiento ? fechaVencimiento : undefined,
            });
            if (resp.success) {
                alert(`Mercadería recibida: se registró la compra y el stock ingresó al almacén`, 'success');
                onSaved();
            } else {
                alert(resp.error || 'No se pudo registrar la recepción', 'error');
            }
        } finally {
            setGuardando(false);
        }
    };

    return (
        <Modal isOpenModal closeModal={onClose} title={`Recibir mercadería — ${orden.numeroFormato}`} icon="solar:box-bold-duotone" width="480px" position="center">
            <div className="space-y-4 p-4">
                <div className="rounded-xl bg-emerald-50 p-3 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300">
                    Se creará la compra con los {orden._count?.detalles ?? ''} ítems de la orden: el stock ingresará al almacén y quedará en tus cuentas por pagar.
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <Select
                            name="tipoDoc"
                            label="Documento"
                            error={() => { }}
                            withLabel
                            value={tipoDoc}
                            options={[
                                { id: 'FACTURA', value: 'Factura' },
                                { id: 'BOLETA', value: 'Boleta' },
                                { id: 'GUIA', value: 'Guía' },
                                { id: 'OTRO', value: 'Otro' },
                            ]}
                            onChange={(id: any) => setTipoDoc(String(id))}
                        />
                    </div>
                    <div>
                        <Calendar
                            text="Fecha emisión"
                            name="fechaEmision"
                            value={fechaEmision ? moment(fechaEmision, 'YYYY-MM-DD').format('DD/MM/YYYY') : ''}
                            onChange={(date: string) => { if (moment(date, 'DD/MM/YYYY', true).isValid()) setFechaEmision(moment(date, 'DD/MM/YYYY').format('YYYY-MM-DD')); }}
                            portal
                        />
                    </div>
                    <div>
                        <InputPro name="serie" label="Serie *" isLabel uppercase value={serie} onChange={(e: any) => setSerie(e.target.value)} />
                    </div>
                    <div>
                        <InputPro name="numero" label="Número *" isLabel value={numero} onChange={(e: any) => setNumero(e.target.value)} />
                    </div>
                    <div>
                        <Select
                            name="formaPago"
                            label="Forma de pago"
                            error={() => { }}
                            withLabel
                            value={formaPago}
                            options={[
                                { id: 'CONTADO', value: 'Contado' },
                                { id: 'CREDITO', value: 'Crédito' },
                            ]}
                            onChange={(id: any) => setFormaPago(String(id))}
                        />
                    </div>
                    {formaPago === 'CREDITO' && (
                        <div>
                            <Calendar
                                text="Vence el"
                                name="fechaVencimiento"
                                value={fechaVencimiento ? moment(fechaVencimiento, 'YYYY-MM-DD').format('DD/MM/YYYY') : ''}
                                onChange={(date: string) => { if (moment(date, 'DD/MM/YYYY', true).isValid()) setFechaVencimiento(moment(date, 'DD/MM/YYYY').format('YYYY-MM-DD')); }}
                                portal
                            />
                        </div>
                    )}
                </div>
                <button
                    type="button"
                    onClick={recibir}
                    disabled={guardando}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-sm font-black text-white shadow-lg shadow-emerald-500/20 transition hover:bg-emerald-700 disabled:opacity-50"
                >
                    <Icon icon={guardando ? 'svg-spinners:180-ring' : 'solar:box-bold'} className="text-lg" />
                    Registrar recepción y crear compra
                </button>
            </div>
        </Modal>
    );
}
