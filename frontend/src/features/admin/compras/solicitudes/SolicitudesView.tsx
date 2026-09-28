import { useEffect, useState } from 'react';
import { Icon } from '@iconify/react';
import moment from 'moment';
import { get } from '@/utils/fetch';
import { useDebounce } from '@/hooks/useDebounce';
import Modal from '@/components/Modal';
import TableSkeleton from '@/components/Skeletons/table';
import InputPro from '@/components/InputPro';
import Select from '@/components/Select';
import { Calendar } from '@/components/Date';
import { useSolicitudesViewModel } from './useSolicitudesViewModel';
import { AREAS, ESTADO_SOLICITUD_LABEL, ESTADO_SOLICITUD_STYLE, type INuevoItem } from './SolicitudesModel';
import { usePuedeEscribir } from '@/hooks/usePuedeEscribir';

const inputCls =
    'w-full px-3 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 text-sm text-gray-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-300';
const lblCls = 'block text-[11px] font-black uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1';

export default function SolicitudesCompraView() {
    const vm = useSolicitudesViewModel();

    const puedeEscribir = usePuedeEscribir('compras:escribir');

    return (
        <div className="min-h-screen px-2 pb-6">
            <div className="mb-5 flex flex-col items-start justify-between gap-3 pt-4 sm:flex-row sm:items-center">
                <div>
                    <h1 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-2xl">Solicitudes de Compra</h1>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        Requerimiento interno → cotizaciones de proveedores → comparativo → orden de compra.
                    </p>
                </div>
                {puedeEscribir && (
                    <button
                        onClick={() => vm.setIsModalOpen(true)}
                        className="inline-flex items-center gap-2 rounded-xl btn-accent px-5 py-2.5 text-sm font-black shadow-lg shadow-black/20 transition-all active:scale-95"
                    >
                        <Icon icon="solar:add-circle-bold" className="text-lg" />
                        Nueva Solicitud
                    </button>
                )}
            </div>

            <div className="mb-5 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-[#111827]">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
                    <div className="flex-1">
                        <InputPro
                            name="search"
                            label="Buscar por número, área o motivo"
                            isLabel
                            value={vm.search}
                            onChange={(e: any) => vm.setSearch(e.target.value)}
                        />
                    </div>
                    <div className="lg:w-52">
                        <Select
                            name="estado"
                            label="Estado"
                            error={() => { }}
                            withLabel
                            value={vm.estado}
                            options={[
                                { id: 'TODOS', value: 'Todos los estados' },
                                { id: 'PENDIENTE', value: 'Pendiente' },
                                { id: 'EN_COTIZACION', value: 'En cotización' },
                                { id: 'CONVERTIDA', value: 'Convertida en OC' },
                                { id: 'ANULADA', value: 'Anulada' },
                            ]}
                            onChange={(id: any) => vm.setEstado(String(id))}
                        />
                    </div>
                </div>
            </div>

            {vm.loading && vm.solicitudes.length === 0 ? (
                <TableSkeleton />
            ) : vm.solicitudes.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-14 text-center dark:border-slate-700 dark:bg-[#111827]">
                    <Icon icon="solar:document-add-bold-duotone" className="mx-auto text-5xl text-gray-300 dark:text-slate-600" />
                    <p className="mt-3 font-bold text-gray-700 dark:text-gray-200">Aún no hay solicitudes de compra</p>
                    <p className="mt-1 text-sm text-gray-400">Registra un requerimiento y pide cotizaciones a tus proveedores.</p>
                </div>
            ) : (
                <div className="overflow-x-auto rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-slate-800 dark:bg-[#111827]">
                    <table className="w-full min-w-[860px] text-sm">
                        <thead>
                            <tr className="border-b border-gray-100 text-left text-[11px] font-black uppercase tracking-wide text-gray-500 dark:border-slate-700 dark:text-gray-400">
                                <th className="px-4 py-3">N°</th>
                                <th className="px-4 py-3">Fecha</th>
                                <th className="px-4 py-3">Área</th>
                                <th className="px-4 py-3">Solicitante</th>
                                <th className="px-4 py-3 text-center">Ítems</th>
                                <th className="px-4 py-3 text-center">Cotizaciones</th>
                                <th className="px-4 py-3 text-right">Mejor total</th>
                                <th className="px-4 py-3">Estado</th>
                                <th className="px-4 py-3 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {vm.solicitudes.map((s) => (
                                <tr
                                    key={s.id}
                                    className="cursor-pointer border-b border-gray-50 last:border-0 hover:bg-gray-50/60 dark:border-slate-800 dark:hover:bg-slate-800/40"
                                    onClick={() => vm.irADetalle(s.id)}
                                >
                                    <td className="px-4 py-3 font-black text-gray-900 dark:text-white">{s.numero}</td>
                                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{moment(s.creadoEn).format('DD/MM/YYYY')}</td>
                                    <td className="px-4 py-3 text-gray-700 dark:text-gray-200">{s.area || '—'}</td>
                                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{s.solicitante?.nombre || '—'}</td>
                                    <td className="px-4 py-3 text-center text-gray-600 dark:text-gray-300">{s.nItems ?? s.items?.length ?? 0}</td>
                                    <td className="px-4 py-3 text-center text-gray-600 dark:text-gray-300">{s.nCotizaciones ?? s.cotizaciones?.length ?? 0}</td>
                                    <td className="px-4 py-3 text-right font-black text-gray-900 dark:text-white">
                                        {s.mejorTotal != null ? `S/ ${Number(s.mejorTotal).toFixed(2)}` : '—'}
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-bold ${ESTADO_SOLICITUD_STYLE[s.estado]}`}>
                                            {ESTADO_SOLICITUD_LABEL[s.estado]}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <Icon icon="solar:alt-arrow-right-bold" className="ml-auto text-lg text-gray-300" />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    <div className="border-t border-gray-100 px-4 py-3 text-xs font-semibold text-gray-400 dark:border-slate-800">{vm.solicitudes.length} solicitud(es)</div>
                </div>
            )}

            {vm.isModalOpen && (
                <ModalNuevaSolicitud
                    guardando={vm.guardando}
                    onClose={() => vm.setIsModalOpen(false)}
                    onGuardar={vm.crearSolicitud}
                />
            )}
        </div>
    );
}

function ModalNuevaSolicitud({
    onClose,
    onGuardar,
    guardando,
}: {
    onClose: () => void;
    onGuardar: (payload: { area: string; motivo: string; fechaRequerida: string; observaciones?: string; items: INuevoItem[] }) => Promise<boolean>;
    guardando: boolean;
}) {
    const [area, setArea] = useState(AREAS[0]);
    const [motivo, setMotivo] = useState('');
    const [fechaRequerida, setFechaRequerida] = useState('');
    const [observaciones, setObservaciones] = useState('');
    const [items, setItems] = useState<INuevoItem[]>([]);

    const [prodQuery, setProdQuery] = useState('');
    const [prodOpts, setProdOpts] = useState<any[]>([]);
    const debouncedProd = useDebounce(prodQuery, 400);
    const [libreDesc, setLibreDesc] = useState('');
    const [libreCant, setLibreCant] = useState('1');
    const [libreUnidad, setLibreUnidad] = useState('UND');

    // Búsqueda de productos (debounced)
    useEffect(() => {
        if (!debouncedProd.trim()) { setProdOpts([]); return; }
        (async () => {
            const resp: any = await get(`productos?search=${encodeURIComponent(debouncedProd)}&limit=8`);
            const arr = resp?.data?.productos ?? resp?.data?.data ?? [];
            setProdOpts(Array.isArray(arr) ? arr : []);
        })();
    }, [debouncedProd]);

    const agregarProducto = (p: any) => {
        setItems((prev) => [...prev, { productoId: p.id, descripcion: p.descripcion, cantidad: 1, unidad: p.unidadMedida || 'UND' }]);
        setProdQuery('');
        setProdOpts([]);
    };

    const agregarLibre = () => {
        if (!libreDesc.trim()) return;
        setItems((prev) => [...prev, { descripcion: libreDesc.trim().toUpperCase(), cantidad: Number(libreCant) || 1, unidad: libreUnidad || 'UND' }]);
        setLibreDesc(''); setLibreCant('1');
    };

    const actualizarCantidad = (i: number, valor: string) => {
        setItems((prev) => prev.map((it, j) => (j === i ? { ...it, cantidad: Number(valor) || 0 } : it)));
    };

    const guardar = async () => {
        await onGuardar({
            area,
            motivo,
            fechaRequerida,
            observaciones: observaciones || undefined,
            items,
        });
    };

    return (
        <Modal isOpenModal closeModal={onClose} title="Nueva Solicitud de Compra" icon="solar:document-add-bold-duotone" width="760px" position="right">
            <div className="space-y-4 p-4">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                        <Select
                            name="area"
                            label="Área solicitante"
                            error={() => { }}
                            withLabel
                            value={area}
                            options={AREAS.map((a) => ({ id: a, value: a }))}
                            onChange={(id: any) => setArea(String(id))}
                        />
                    </div>
                    <div>
                        <Calendar
                            text="Fecha requerida"
                            name="fechaRequerida"
                            value={fechaRequerida ? moment(fechaRequerida, 'YYYY-MM-DD').format('DD/MM/YYYY') : ''}
                            onChange={(date: string) => { if (moment(date, 'DD/MM/YYYY', true).isValid()) setFechaRequerida(moment(date, 'DD/MM/YYYY').format('YYYY-MM-DD')); }}
                            portal
                        />
                    </div>
                </div>
                <div>
                    <InputPro name="motivo" label="Motivo" isLabel value={motivo} onChange={(e: any) => setMotivo(e.target.value)} />
                </div>
                <div>
                    <label className={lblCls}>Observaciones</label>
                    <textarea
                        value={observaciones}
                        onChange={(e) => setObservaciones(e.target.value)}
                        rows={2}
                        className={inputCls}
                    />
                </div>

                <div className="rounded-2xl border border-gray-100 p-3 dark:border-slate-800">
                    <p className="mb-2 text-xs font-black uppercase tracking-wide text-gray-500 dark:text-gray-400">Ítems solicitados</p>

                    <div className="relative">
                        <input
                            value={prodQuery}
                            onChange={(e) => setProdQuery(e.target.value)}
                            placeholder="🔍 Buscar producto del catálogo..."
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
                        <input value={libreDesc} onChange={(e) => setLibreDesc(e.target.value)} placeholder="Ítem libre: descripción" className={`${inputCls} flex-1`} />
                        <input type="number" min="0.001" value={libreCant} onChange={(e) => setLibreCant(e.target.value)} placeholder="Cant." className={`${inputCls} lg:w-24`} />
                        <input value={libreUnidad} onChange={(e) => setLibreUnidad(e.target.value)} placeholder="Unidad" className={`${inputCls} lg:w-24`} />
                        <button type="button" onClick={agregarLibre} className="rounded-xl btn-accent px-4 py-2.5 text-sm font-black">Agregar</button>
                    </div>

                    {items.length > 0 && (
                        <table className="mt-3 w-full text-sm">
                            <thead>
                                <tr className="text-left text-[10px] font-black uppercase tracking-wide text-gray-400">
                                    <th className="py-1.5">Descripción</th>
                                    <th className="w-24 py-1.5">Cant.</th>
                                    <th className="w-20 py-1.5">Unidad</th>
                                    <th className="w-10" />
                                </tr>
                            </thead>
                            <tbody>
                                {items.map((it, i) => (
                                    <tr key={i} className="border-t border-gray-50 dark:border-slate-800">
                                        <td className="py-2 pr-2 font-semibold text-gray-800 dark:text-gray-100">
                                            {it.descripcion}
                                            {!it.productoId && <span className="ml-2 rounded bg-indigo-100 px-1.5 py-0.5 text-[10px] font-bold text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-300">libre</span>}
                                        </td>
                                        <td className="py-2 pr-2">
                                            <input type="number" min="0.001" value={it.cantidad} onChange={(e) => actualizarCantidad(i, e.target.value)} className={`${inputCls} !py-1.5`} />
                                        </td>
                                        <td className="py-2 pr-2 text-gray-500">{it.unidad}</td>
                                        <td className="py-2 text-right">
                                            <button type="button" onClick={() => setItems((prev) => prev.filter((_, j) => j !== i))} className="text-gray-300 transition hover:text-rose-500">
                                                <Icon icon="solar:trash-bin-trash-bold" className="text-base" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                <div className="flex justify-end gap-2 pt-2">
                    <button onClick={onClose} className="rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-bold text-gray-600 dark:border-slate-700 dark:text-gray-300">Cancelar</button>
                    <button
                        onClick={guardar}
                        disabled={guardando || !motivo.trim() || items.length === 0}
                        className="rounded-xl btn-accent px-5 py-2.5 text-sm font-black disabled:opacity-50"
                    >
                        {guardando ? 'Guardando...' : 'Crear Solicitud'}
                    </button>
                </div>
            </div>
        </Modal>
    );
}
