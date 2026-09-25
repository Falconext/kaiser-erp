import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '@iconify/react';
import moment from 'moment';
import { get } from '@/utils/fetch';
import { useDebounce } from '@/hooks/useDebounce';
import Modal from '@/components/Modal';
import InputPro from '@/components/InputPro';
import Select from '@/components/Select';
import { Calendar } from '@/components/Date';
import { tipoCambioService } from '@/services/tipoCambio.service';
import { useSolicitudDetalleViewModel, type INuevaCotizacionPayload } from './useSolicitudDetalleViewModel';
import {
    ESTADO_SOLICITUD_LABEL,
    ESTADO_SOLICITUD_STYLE,
    ESTADO_STEPS,
    type ICotizacionItem,
    type ICotizacionProveedor,
    type ISolicitudCompra,
} from './SolicitudesModel';

const inputCls =
    'w-full px-3 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 text-sm text-gray-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-300';
const lblCls = 'block text-[11px] font-black uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1';

export default function SolicitudDetalleView() {
    const vm = useSolicitudDetalleViewModel();

    if (vm.loading && !vm.solicitud) {
        return <div className="flex min-h-[50vh] items-center justify-center"><Icon icon="svg-spinners:180-ring" className="text-4xl text-gray-300" /></div>;
    }
    if (!vm.solicitud) {
        return <div className="p-8 text-center text-gray-400">Solicitud no encontrada.</div>;
    }

    const s = vm.solicitud;

    return (
        <div className="min-h-screen px-2 pb-10">
            <div className="mb-3 pt-4">
                <Link to="/administrador/compras/solicitudes" className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                    <Icon icon="solar:arrow-left-linear" /> Solicitudes de compra
                </Link>
            </div>

            <HeaderSolicitud solicitud={s} />

            <ItemsSolicitados solicitud={s} />

            <CotizacionesProveedores
                solicitud={s}
                onAgregar={() => vm.setIsCotizacionModalOpen(true)}
                onEliminar={vm.eliminarCotizacion}
            />

            {vm.comparativo && s.cotizaciones.length > 0 && (
                <Comparativo
                    comparativo={vm.comparativo}
                    onSeleccionar={(cotId) => vm.setSeleccionCotizacionId(cotId)}
                    disabled={s.estado === 'CONVERTIDA' || s.estado === 'ANULADA'}
                />
            )}

            {s.ordenesCompra && s.ordenesCompra.length > 0 && (
                <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 dark:border-emerald-900/40 dark:bg-emerald-950/20">
                    <p className="text-sm font-bold text-emerald-700 dark:text-emerald-300">
                        Orden de compra generada: {s.ordenesCompra.map((o) => o.numeroFormato).join(', ')}
                    </p>
                    <Link to="/administrador/compras/ordenes" className="mt-1 inline-flex items-center gap-1 text-xs font-bold text-emerald-600 hover:underline dark:text-emerald-300">
                        Ver en Órdenes de Compra <Icon icon="solar:arrow-right-linear" />
                    </Link>
                </div>
            )}

            {vm.isCotizacionModalOpen && (
                <ModalCotizacion
                    solicitud={s}
                    guardando={vm.guardandoCotizacion}
                    onClose={() => vm.setIsCotizacionModalOpen(false)}
                    onGuardar={vm.agregarCotizacion}
                />
            )}

            {vm.seleccionCotizacionId != null && (
                <ModalConfirmarSeleccion
                    cotizacion={s.cotizaciones.find((c) => c.id === vm.seleccionCotizacionId) || null}
                    guardando={vm.seleccionando}
                    onClose={() => vm.setSeleccionCotizacionId(null)}
                    onConfirmar={async (extra) => {
                        await vm.seleccionarCotizacion(vm.seleccionCotizacionId!, extra);
                    }}
                />
            )}
        </div>
    );
}

/* ─── Header + stepper ───────────────────────────────────────────────── */
function HeaderSolicitud({ solicitud }: { solicitud: ISolicitudCompra }) {
    const stepIdx = Math.max(0, ESTADO_STEPS.findIndex((st) => st.key === solicitud.estado));
    const anulada = solicitud.estado === 'ANULADA';

    return (
        <div className="mb-5 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-[#111827]">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                <div>
                    <div className="flex items-center gap-2">
                        <h1 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-2xl">{solicitud.numero}</h1>
                        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-bold ${ESTADO_SOLICITUD_STYLE[solicitud.estado]}`}>
                            {ESTADO_SOLICITUD_LABEL[solicitud.estado]}
                        </span>
                    </div>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{solicitud.motivo}</p>
                    <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
                        <span><b className="text-gray-700 dark:text-gray-200">Área:</b> {solicitud.area || '—'}</span>
                        <span><b className="text-gray-700 dark:text-gray-200">Solicitante:</b> {solicitud.solicitante?.nombre || '—'}</span>
                        <span><b className="text-gray-700 dark:text-gray-200">Fecha requerida:</b> {solicitud.fechaRequerida ? moment(solicitud.fechaRequerida).format('DD/MM/YYYY') : '—'}</span>
                    </div>
                </div>
            </div>

            {!anulada && (
                <div className="mt-5 flex items-center">
                    {ESTADO_STEPS.map((step, i) => (
                        <div key={step.key} className="flex flex-1 items-center last:flex-initial">
                            <div className="flex flex-col items-center">
                                <div
                                    className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-black ${
                                        i <= stepIdx
                                            ? 'bg-blue-600 text-white'
                                            : 'bg-gray-100 text-gray-400 dark:bg-slate-800 dark:text-gray-500'
                                    }`}
                                >
                                    {i < stepIdx ? <Icon icon="solar:check-circle-bold" /> : i + 1}
                                </div>
                                <span className={`mt-1 text-[10px] font-bold uppercase tracking-wide ${i <= stepIdx ? 'text-blue-600' : 'text-gray-400'}`}>{step.label}</span>
                            </div>
                            {i < ESTADO_STEPS.length - 1 && (
                                <div className={`mx-2 mb-4 h-0.5 flex-1 ${i < stepIdx ? 'bg-blue-600' : 'bg-gray-100 dark:bg-slate-800'}`} />
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

/* ─── Ítems solicitados ───────────────────────────────────────────────── */
function ItemsSolicitados({ solicitud }: { solicitud: ISolicitudCompra }) {
    return (
        <div className="mb-5 overflow-x-auto rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-slate-800 dark:bg-[#111827]">
            <div className="border-b border-gray-100 px-4 py-3 dark:border-slate-800">
                <p className="text-xs font-black uppercase tracking-wide text-gray-500 dark:text-gray-400">Ítems solicitados</p>
            </div>
            <table className="w-full min-w-[600px] text-sm">
                <thead>
                    <tr className="text-left text-[10px] font-black uppercase tracking-wide text-gray-400">
                        <th className="px-4 py-2">Descripción</th>
                        <th className="px-4 py-2 text-right">Cantidad</th>
                        <th className="px-4 py-2">Unidad</th>
                        <th className="px-4 py-2 text-right">Stock actual</th>
                        <th className="px-4 py-2 text-right">Costo promedio</th>
                    </tr>
                </thead>
                <tbody>
                    {solicitud.items.map((it) => (
                        <tr key={it.id} className="border-t border-gray-50 dark:border-slate-800">
                            <td className="px-4 py-2.5 font-semibold text-gray-800 dark:text-gray-100">
                                {it.producto?.codigo ? <span className="mr-1.5 text-xs text-gray-400">{it.producto.codigo}</span> : null}
                                {it.descripcion}
                            </td>
                            <td className="px-4 py-2.5 text-right">{Number(it.cantidad)}</td>
                            <td className="px-4 py-2.5 text-gray-500">{it.unidad}</td>
                            <td className="px-4 py-2.5 text-right text-gray-500">{it.producto ? Number(it.producto.stock) : '—'}</td>
                            <td className="px-4 py-2.5 text-right text-gray-500">{it.producto ? `S/ ${Number(it.producto.costoPromedio).toFixed(2)}` : '—'}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

/* ─── Cotizaciones de proveedores ────────────────────────────────────── */
function CotizacionesProveedores({
    solicitud,
    onAgregar,
    onEliminar,
}: {
    solicitud: ISolicitudCompra;
    onAgregar: () => void;
    onEliminar: (cotId: number) => void;
}) {
    const puedeEditar = solicitud.estado === 'PENDIENTE' || solicitud.estado === 'EN_COTIZACION';
    const mon = (c: ICotizacionProveedor) => (c.moneda === 'USD' ? 'US$' : 'S/');

    return (
        <div className="mb-5">
            <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-black uppercase tracking-wide text-gray-500 dark:text-gray-400">Cotizaciones de proveedores</p>
                {puedeEditar && (
                    <button onClick={onAgregar} className="inline-flex items-center gap-1.5 rounded-xl btn-accent px-3.5 py-2 text-xs font-black">
                        <Icon icon="solar:add-circle-bold" /> Agregar cotización
                    </button>
                )}
            </div>

            {solicitud.cotizaciones.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-8 text-center text-sm text-gray-400 dark:border-slate-700 dark:bg-[#111827]">
                    Aún no hay cotizaciones. Agrega al menos dos para comparar precios.
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {solicitud.cotizaciones.map((c) => (
                        <div key={c.id} className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-[#111827]">
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="font-black text-gray-900 dark:text-white">{c.proveedor?.nombre}</p>
                                    <p className="text-[11px] text-gray-400">{c.proveedor?.nroDoc}</p>
                                </div>
                                {c.estado === 'SELECCIONADA' && (
                                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300">Seleccionada</span>
                                )}
                                {c.estado === 'DESCARTADA' && (
                                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-bold text-gray-500 dark:bg-slate-800 dark:text-gray-400">Descartada</span>
                                )}
                            </div>
                            <p className="mt-2 text-2xl font-black text-gray-900 dark:text-white">{mon(c)} {Number(c.total).toFixed(2)}</p>
                            {c.moneda === 'USD' && <p className="text-[11px] text-gray-400">≈ S/ {Number(c.totalPen).toFixed(2)} (TC {Number(c.tipoCambio)})</p>}
                            <div className="mt-2 space-y-0.5 text-xs text-gray-500 dark:text-gray-400">
                                <p>Plazo entrega: <b className="text-gray-700 dark:text-gray-200">{c.plazoEntregaDias ?? '—'} días</b></p>
                                <p>Condiciones: <b className="text-gray-700 dark:text-gray-200">{c.condicionesPago || '—'}</b></p>
                                {c.referencia && <p>Ref: {c.referencia}</p>}
                            </div>
                            {puedeEditar && c.estado === 'RECIBIDA' && (
                                <button
                                    onClick={() => onEliminar(c.id)}
                                    className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-gray-400 hover:text-rose-500"
                                >
                                    <Icon icon="solar:trash-bin-trash-bold" /> Eliminar
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

/* ─── Comparativo ─────────────────────────────────────────────────────── */
function Comparativo({
    comparativo,
    onSeleccionar,
    disabled,
}: {
    comparativo: NonNullable<ReturnType<typeof useSolicitudDetalleViewModel>['comparativo']>;
    onSeleccionar: (cotizacionId: number) => void;
    disabled: boolean;
}) {
    return (
        <div className="mb-5">
            <p className="mb-2 text-xs font-black uppercase tracking-wide text-gray-500 dark:text-gray-400">Comparativo</p>

            <div className="mb-3 rounded-2xl border border-blue-100 bg-blue-50/60 p-4 text-sm font-semibold text-blue-800 dark:border-blue-900/40 dark:bg-blue-950/20 dark:text-blue-200">
                <Icon icon="solar:lightbulb-bold" className="mr-1.5 inline-block align-[-3px] text-lg" />
                {comparativo.resumen.recomendacion}
            </div>

            <div className="overflow-x-auto rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-slate-800 dark:bg-[#111827]">
                <table className="w-full min-w-[720px] text-sm">
                    <thead>
                        <tr className="border-b border-gray-100 text-left text-[10px] font-black uppercase tracking-wide text-gray-400 dark:border-slate-800">
                            <th className="px-4 py-2.5">Ítem</th>
                            <th className="px-4 py-2.5 text-right">Cant.</th>
                            {comparativo.proveedores.map((p) => (
                                <th key={p.cotizacionId} className="px-4 py-2.5 text-right">
                                    {p.proveedor.nombre}
                                    {p.esMejorTotal && <Icon icon="solar:crown-bold" className="ml-1 inline text-amber-400" />}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {comparativo.filas.map((f) => (
                            <tr key={f.solicitudItemId} className="border-t border-gray-50 dark:border-slate-800">
                                <td className="px-4 py-2.5 font-semibold text-gray-800 dark:text-gray-100">{f.descripcion}</td>
                                <td className="px-4 py-2.5 text-right text-gray-500">{f.cantidad} {f.unidad}</td>
                                {f.precios.map((pr) => (
                                    <td
                                        key={pr.cotizacionId}
                                        className={`px-4 py-2.5 text-right ${pr.esMejor ? 'bg-emerald-50 font-black text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300' : 'text-gray-600 dark:text-gray-300'}`}
                                    >
                                        {pr.precioUnitario != null ? `S/ ${pr.precioUnitarioPen!.toFixed(2)}` : '—'}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                    <tfoot>
                        <tr className="border-t-2 border-gray-100 dark:border-slate-800">
                            <td className="px-4 py-3 font-black text-gray-900 dark:text-white" colSpan={2}>Total (S/)</td>
                            {comparativo.proveedores.map((p) => (
                                <td key={p.cotizacionId} className={`px-4 py-3 text-right font-black ${p.esMejorTotal ? 'text-emerald-600' : 'text-gray-900 dark:text-white'}`}>
                                    S/ {p.totalPen.toFixed(2)}
                                </td>
                            ))}
                        </tr>
                        <tr>
                            <td className="px-4 py-2 text-xs font-bold text-gray-400" colSpan={2}>Plazo / Condiciones</td>
                            {comparativo.proveedores.map((p) => (
                                <td key={p.cotizacionId} className="px-4 py-2 text-right text-xs text-gray-500">
                                    {p.plazoEntregaDias ?? '—'} días · {p.condicionesPago || '—'}
                                </td>
                            ))}
                        </tr>
                        {!disabled && (
                            <tr>
                                <td className="px-4 py-3" colSpan={2} />
                                {comparativo.proveedores.map((p) => (
                                    <td key={p.cotizacionId} className="px-4 py-3 text-right">
                                        <button
                                            onClick={() => onSeleccionar(p.cotizacionId)}
                                            className="rounded-xl btn-accent px-3.5 py-2 text-xs font-black"
                                        >
                                            Seleccionar y generar OC
                                        </button>
                                    </td>
                                ))}
                            </tr>
                        )}
                    </tfoot>
                </table>
            </div>
        </div>
    );
}

/* ─── Modal: agregar cotización ──────────────────────────────────────── */
function ModalCotizacion({
    solicitud,
    onClose,
    onGuardar,
    guardando,
}: {
    solicitud: ISolicitudCompra;
    onClose: () => void;
    onGuardar: (payload: INuevaCotizacionPayload) => Promise<boolean>;
    guardando: boolean;
}) {
    const [proveedorQuery, setProveedorQuery] = useState('');
    const [proveedorId, setProveedorId] = useState<number | null>(null);
    const [proveedorOpts, setProveedorOpts] = useState<any[]>([]);
    const debouncedProv = useDebounce(proveedorQuery, 400);
    const provBoxRef = useRef<HTMLDivElement>(null);

    const [referencia, setReferencia] = useState('');
    const [fecha, setFecha] = useState(moment().format('YYYY-MM-DD'));
    const [moneda, setMoneda] = useState('PEN');
    const [tipoCambio, setTipoCambio] = useState('1');
    const [buscandoTc, setBuscandoTc] = useState(false);
    const [plazoEntregaDias, setPlazoEntregaDias] = useState('');
    const [condicionesPago, setCondicionesPago] = useState('');
    const [validezDias, setValidezDias] = useState('');
    const [incluyeIgv, setIncluyeIgv] = useState(false);
    const [observaciones, setObservaciones] = useState('');

    const [precios, setPrecios] = useState<Record<number, { precioUnitario: string; marca: string }>>(
        Object.fromEntries(solicitud.items.map((it) => [it.id, { precioUnitario: '', marca: '' }])),
    );

    useEffect(() => {
        if (!debouncedProv.trim()) { setProveedorOpts([]); return; }
        (async () => {
            const resp: any = await get(`clientes?search=${encodeURIComponent(debouncedProv)}&persona=PROVEEDOR&limit=8`);
            const arr = resp?.data?.clientes ?? resp?.data?.data ?? [];
            setProveedorOpts(Array.isArray(arr) ? arr : []);
        })();
    }, [debouncedProv]);

    useEffect(() => {
        if (moneda !== 'USD') { setTipoCambio('1'); return; }
        (async () => {
            setBuscandoTc(true);
            try {
                const tc = await tipoCambioService.consultar();
                setTipoCambio(String(tc.venta ?? 3.75));
            } catch {
                setTipoCambio('3.75');
            } finally {
                setBuscandoTc(false);
            }
        })();
    }, [moneda]);

    const totalPreview = useMemo(() => {
        const base = solicitud.items.reduce((s, it) => {
            const p = Number(precios[it.id]?.precioUnitario || 0);
            return s + p * Number(it.cantidad);
        }, 0);
        const total = incluyeIgv ? base : base * 1.18;
        return total * Number(tipoCambio || 1);
    }, [precios, incluyeIgv, tipoCambio, solicitud.items]);

    const guardar = async () => {
        const items: ICotizacionItem[] = solicitud.items
            .filter((it) => Number(precios[it.id]?.precioUnitario) > 0)
            .map((it) => ({
                solicitudItemId: it.id,
                precioUnitario: Number(precios[it.id].precioUnitario),
                marca: precios[it.id].marca || undefined,
            }));
        if (!proveedorId) return;
        await onGuardar({
            proveedorId,
            referencia: referencia || undefined,
            fecha,
            moneda,
            tipoCambio: Number(tipoCambio) || 1,
            plazoEntregaDias: plazoEntregaDias ? Number(plazoEntregaDias) : undefined,
            condicionesPago: condicionesPago || undefined,
            validezDias: validezDias ? Number(validezDias) : undefined,
            incluyeIgv,
            observaciones: observaciones || undefined,
            items,
        });
    };

    return (
        <Modal isOpenModal closeModal={onClose} title="Agregar Cotización de Proveedor" icon="solar:bill-list-bold-duotone" width="820px" position="right">
            <div className="space-y-4 p-4">
                <div ref={provBoxRef} className="relative">
                    <label className={lblCls}>Proveedor *</label>
                    <input
                        value={proveedorQuery}
                        onChange={(e) => { setProveedorQuery(e.target.value); setProveedorId(null); }}
                        placeholder="Busca por nombre o RUC..."
                        className={inputCls}
                    />
                    {proveedorId && <Icon icon="solar:check-circle-bold" className="absolute right-3 top-9 text-lg text-emerald-500" />}
                    {proveedorOpts.length > 0 && !proveedorId && (
                        <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900">
                            {proveedorOpts.map((p) => (
                                <button
                                    key={p.id}
                                    type="button"
                                    onClick={() => { setProveedorId(p.id); setProveedorQuery(p.nombre); setProveedorOpts([]); }}
                                    className="block w-full px-4 py-2.5 text-left text-sm hover:bg-blue-50 dark:hover:bg-slate-800"
                                >
                                    <span className="font-semibold text-gray-800 dark:text-gray-100">{p.nombre}</span>
                                    <span className="ml-2 text-xs text-gray-400">{p.nroDoc}</span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <div>
                        <InputPro name="referencia" label="N° referencia" isLabel value={referencia} onChange={(e: any) => setReferencia(e.target.value)} />
                    </div>
                    <div>
                        <Calendar
                            text="Fecha"
                            name="fecha"
                            value={fecha ? moment(fecha, 'YYYY-MM-DD').format('DD/MM/YYYY') : ''}
                            onChange={(date: string) => { if (moment(date, 'DD/MM/YYYY', true).isValid()) setFecha(moment(date, 'DD/MM/YYYY').format('YYYY-MM-DD')); }}
                            portal
                        />
                    </div>
                    <div>
                        <Select
                            name="moneda"
                            label="Moneda"
                            error={() => { }}
                            withLabel
                            value={moneda}
                            options={[{ id: 'PEN', value: 'Soles (S/)' }, { id: 'USD', value: 'Dólares (US$)' }]}
                            onChange={(id: any) => setMoneda(String(id))}
                        />
                    </div>
                    <div>
                        <InputPro
                            name="tipoCambio"
                            label={buscandoTc ? 'TC (cargando...)' : 'Tipo de cambio'}
                            isLabel
                            type="number"
                            disabled={moneda !== 'USD'}
                            value={tipoCambio}
                            onChange={(e: any) => setTipoCambio(e.target.value)}
                        />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    <div>
                        <InputPro name="plazo" label="Plazo de entrega (días)" isLabel type="number" value={plazoEntregaDias} onChange={(e: any) => setPlazoEntregaDias(e.target.value)} />
                    </div>
                    <div>
                        <InputPro name="condiciones" label="Condiciones de pago" isLabel value={condicionesPago} onChange={(e: any) => setCondicionesPago(e.target.value)} />
                    </div>
                    <div>
                        <InputPro name="validez" label="Validez (días)" isLabel type="number" value={validezDias} onChange={(e: any) => setValidezDias(e.target.value)} />
                    </div>
                </div>

                <label className="flex items-center gap-2 text-sm font-semibold text-gray-600 dark:text-gray-300">
                    <input type="checkbox" checked={incluyeIgv} onChange={(e) => setIncluyeIgv(e.target.checked)} className="h-4 w-4 rounded" />
                    El precio unitario ya incluye IGV
                </label>

                <div className="rounded-2xl border border-gray-100 p-3 dark:border-slate-800">
                    <p className="mb-2 text-xs font-black uppercase tracking-wide text-gray-500 dark:text-gray-400">Precios cotizados por ítem</p>
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="text-left text-[10px] font-black uppercase tracking-wide text-gray-400">
                                <th className="py-1.5">Ítem</th>
                                <th className="w-24 py-1.5 text-right">Cant.</th>
                                <th className="w-32 py-1.5">P. Unitario</th>
                                <th className="w-32 py-1.5">Marca</th>
                            </tr>
                        </thead>
                        <tbody>
                            {solicitud.items.map((it) => (
                                <tr key={it.id} className="border-t border-gray-50 dark:border-slate-800">
                                    <td className="py-2 pr-2 font-semibold text-gray-800 dark:text-gray-100">{it.descripcion}</td>
                                    <td className="py-2 pr-2 text-right text-gray-500">{Number(it.cantidad)} {it.unidad}</td>
                                    <td className="py-2 pr-2">
                                        <input
                                            type="number" min="0" step="0.01"
                                            value={precios[it.id]?.precioUnitario ?? ''}
                                            onChange={(e) => setPrecios((prev) => ({ ...prev, [it.id]: { ...prev[it.id], precioUnitario: e.target.value } }))}
                                            className={`${inputCls} !py-1.5`}
                                        />
                                    </td>
                                    <td className="py-2">
                                        <input
                                            value={precios[it.id]?.marca ?? ''}
                                            onChange={(e) => setPrecios((prev) => ({ ...prev, [it.id]: { ...prev[it.id], marca: e.target.value } }))}
                                            className={`${inputCls} !py-1.5`}
                                        />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    <div className="mt-2 text-right text-sm font-black text-gray-800 dark:text-gray-100">Total estimado: S/ {totalPreview.toFixed(2)}</div>
                </div>

                <div>
                    <label className={lblCls}>Observaciones</label>
                    <textarea value={observaciones} onChange={(e) => setObservaciones(e.target.value)} rows={2} className={inputCls} />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                    <button onClick={onClose} className="rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-bold text-gray-600 dark:border-slate-700 dark:text-gray-300">Cancelar</button>
                    <button
                        onClick={guardar}
                        disabled={guardando || !proveedorId}
                        className="rounded-xl btn-accent px-5 py-2.5 text-sm font-black disabled:opacity-50"
                    >
                        {guardando ? 'Guardando...' : 'Guardar Cotización'}
                    </button>
                </div>
            </div>
        </Modal>
    );
}

/* ─── Modal: confirmar selección → generar OC ────────────────────────── */
function ModalConfirmarSeleccion({
    cotizacion,
    onClose,
    onConfirmar,
    guardando,
}: {
    cotizacion: ICotizacionProveedor | null;
    onClose: () => void;
    onConfirmar: (extra: { fechaEntrega?: string; lugarEntrega?: string }) => Promise<void>;
    guardando: boolean;
}) {
    const [fechaEntrega, setFechaEntrega] = useState('');
    const [lugarEntrega, setLugarEntrega] = useState('');

    if (!cotizacion) return null;

    return (
        <Modal isOpenModal closeModal={onClose} title="Confirmar selección de proveedor" icon="solar:check-circle-bold-duotone" width="480px">
            <div className="space-y-4 p-4">
                <p className="text-sm text-gray-600 dark:text-gray-300">
                    Se generará una <b>Orden de Compra</b> con <b>{cotizacion.proveedor?.nombre}</b> por un total de{' '}
                    <b>{cotizacion.moneda === 'USD' ? 'US$' : 'S/'} {Number(cotizacion.total).toFixed(2)}</b>. Las demás cotizaciones quedarán descartadas.
                </p>
                <div>
                    <Calendar
                        text="Fecha de entrega (opcional)"
                        name="fechaEntrega"
                        value={fechaEntrega ? moment(fechaEntrega, 'YYYY-MM-DD').format('DD/MM/YYYY') : ''}
                        onChange={(date: string) => { if (moment(date, 'DD/MM/YYYY', true).isValid()) setFechaEntrega(moment(date, 'DD/MM/YYYY').format('YYYY-MM-DD')); }}
                        portal
                    />
                </div>
                <div>
                    <InputPro name="lugarEntrega" label="Lugar de entrega (opcional)" isLabel value={lugarEntrega} onChange={(e: any) => setLugarEntrega(e.target.value)} />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                    <button onClick={onClose} className="rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-bold text-gray-600 dark:border-slate-700 dark:text-gray-300">Cancelar</button>
                    <button
                        onClick={() => onConfirmar({ fechaEntrega: fechaEntrega || undefined, lugarEntrega: lugarEntrega || undefined })}
                        disabled={guardando}
                        className="rounded-xl btn-accent px-5 py-2.5 text-sm font-black disabled:opacity-50"
                    >
                        {guardando ? 'Generando OC...' : 'Confirmar y generar OC'}
                    </button>
                </div>
            </div>
        </Modal>
    );
}
