import { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';
import { get } from '@/utils/fetch';
import { useContratosVehicularesStore } from '@/zustand/contratosVehiculares';
import { useAuthStore } from '@/zustand/auth';
import useAlertStore from '@/zustand/alert';
import { useDebounce } from '@/hooks/useDebounce';
import DataTable from '@/components/Datatable';
import InputPro from '@/components/InputPro';
import Select from '@/components/Select';
import ModalConfirm from '@/components/ModalConfirm';
import type {
    IContratoVehicular, IVehiculo, EstadoContrato,
} from '@/interfaces/vehiculo';
import { buildStorePurchaseWhatsappUrl } from '@/utils/storeWhatsapp';
import { printContrato } from './contratoPrint';
import { useThemeStore, SIDEBAR_COLOR_HEX } from '@/zustand/theme';

// ─── Estilo CRM claro (Brix UI) ────────────────────────────────────────────────

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (v: string) =>
    new Intl.DateTimeFormat('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(v));
const diasRestantes = (fechaFin: string): number =>
    Math.ceil((new Date(fechaFin).getTime() - Date.now()) / 86400000);

// Pills de estado — punto de color + fondo pastel, estilo CRM.
const estadoPill: Record<EstadoContrato, { dot: string; text: string; bg: string }> = {
    VIGENTE: { dot: 'bg-emerald-500', text: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
    POR_VENCER: { dot: 'bg-amber-500', text: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/20' },
    VENCIDO: { dot: 'bg-rose-500', text: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-50 dark:bg-rose-900/20' },
    CANCELADO: { dot: 'bg-slate-400', text: 'text-slate-500 dark:text-slate-300', bg: 'bg-slate-100 dark:bg-slate-700' },
};
const estadoLabel: Record<EstadoContrato, string> = {
    VIGENTE: 'Vigente', POR_VENCER: 'Por vencer', VENCIDO: 'Vencido', CANCELADO: 'Cancelado',
};
const diasColor = (dias: number) => (dias < 0 ? 'text-rose-600 dark:text-rose-400 font-bold' : dias <= 30 ? 'text-amber-600 dark:text-amber-400 font-semibold' : 'text-emerald-600 dark:text-emerald-400 font-medium');

const ESTADO_OPTS = [
    { id: 'TODOS', value: 'Todos los estados' },
    { id: 'VIGENTE', value: 'Vigentes' },
    { id: 'POR_VENCER', value: 'Por vencer' },
    { id: 'VENCIDO', value: 'Vencidos' },
    { id: 'CANCELADO', value: 'Cancelados' },
];
const DURACION_OPTS = [{ id: 6, value: '6 meses' }, { id: 12, value: '12 meses' }, { id: 24, value: '24 meses' }];

const mesesEntre = (inicio: string, fin: string) => {
    const a = new Date(inicio); const b = new Date(fin);
    const m = (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());
    return m > 0 ? m : 12;
};

// Una unidad (vehículo) dentro del formulario de contrato.
interface UnidadForm { vehiculoId: number; placa: string; desc: string; montoAnual: string }

// Deriva las unidades iniciales de un contrato para el modo edición.
const unidadesDeContrato = (c?: IContratoVehicular | null): UnidadForm[] => {
    if (!c) return [];
    if (c.unidades?.length) {
        return c.unidades.map((u) => ({
            vehiculoId: u.vehiculoId,
            placa: u.vehiculo?.placa || '',
            desc: `${u.vehiculo?.marca || ''} ${u.vehiculo?.modelo || ''}`.trim(),
            montoAnual: u.montoAnual != null ? String(u.montoAnual) : '',
        }));
    }
    // Contrato legacy (sin unidades): usa el vehículo principal.
    return [{
        vehiculoId: c.vehiculoId,
        placa: c.vehiculo?.placa || '',
        desc: `${c.vehiculo?.marca || ''} ${c.vehiculo?.modelo || ''}`.trim(),
        montoAnual: c.montoAnual != null ? String(c.montoAnual) : '',
    }];
};

// ─── Modal Crear / Editar Contrato (multi-vehículo) ───────────────────────────
function ContratoModal({ contrato, onClose, onSaved }: { contrato?: IContratoVehicular | null; onClose: () => void; onSaved: () => void }) {
    const sidebarColor = useThemeStore((s) => s.sidebarColor);
    const ACCENT = SIDEBAR_COLOR_HEX[sidebarColor] ?? '#7551FF';
    const { alert } = useAlertStore();
    const addContrato = useContratosVehicularesStore((s) => s.addContrato);
    const updateContrato = useContratosVehicularesStore((s) => s.updateContrato);
    const esEdicion = !!contrato;
    const [loading, setLoading] = useState(false);
    const [vehiculos, setVehiculos] = useState<IVehiculo[]>([]);
    const [productos, setProductos] = useState<{ id: number; descripcion: string; precioUnitario?: number }[]>([]);
    // Vehículos incluidos en el contrato (multi-vehículo).
    const [unidades, setUnidades] = useState<UnidadForm[]>(() => unidadesDeContrato(contrato));
    const [vehiculoPick, setVehiculoPick] = useState('');
    const [form, setForm] = useState({
        fechaInicio: contrato ? new Date(contrato.fechaInicio).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        duracionMeses: contrato ? String(mesesEntre(contrato.fechaInicio, contrato.fechaFin)) : '12',
        productoId: contrato?.producto?.id ? String(contrato.producto.id) : '',
        montoAnual: contrato?.montoAnual != null ? String(contrato.montoAnual) : '', // solo edición (total)
        observaciones: contrato?.observaciones ?? '',
    });

    useEffect(() => { get('vehiculos?limit=200').then((resp: any) => setVehiculos(resp.data?.data ?? [])); }, []);
    useEffect(() => {
        get('productos?limit=200&soloVendibles=true')
            .then((resp: any) => setProductos(resp.data?.productos ?? []))
            .catch(() => { /* silencioso: el selector de servicio queda vacío */ });
    }, []);

    // Vehículos disponibles = catálogo menos los ya agregados.
    const vehiculoOpts = vehiculos
        .filter((v) => !unidades.some((u) => u.vehiculoId === v.id))
        .map((v) => ({ id: v.id, value: `${v.placa} — ${v.marca} ${v.modelo || ''}${v.cliente ? ` (${v.cliente.nombre})` : ''}` }));
    const vehiculoPickLabel = vehiculoOpts.find((o) => String(o.id) === vehiculoPick)?.value || '';
    const productoOpts = productos.map((p) => ({ id: p.id, value: p.descripcion }));
    const productoSel = productoOpts.find((o) => String(o.id) === form.productoId)?.value || '';
    // La duración editada puede no estar en el catálogo base; la añadimos si falta.
    const duracionOpts = DURACION_OPTS.some((o) => String(o.id) === form.duracionMeses)
        ? DURACION_OPTS
        : [...DURACION_OPTS, { id: parseInt(form.duracionMeses), value: `${form.duracionMeses} meses` }];
    const duracionSel = duracionOpts.find((o) => String(o.id) === form.duracionMeses)?.value || '';

    const totalUnidades = unidades.reduce((acc, u) => acc + (parseFloat(u.montoAnual) || 0), 0);

    const agregarVehiculo = (id: number) => {
        if (unidades.some((u) => u.vehiculoId === id)) { setVehiculoPick(''); return; }
        const v = vehiculos.find((x) => x.id === id);
        if (!v) return;
        const prod = productos.find((p) => String(p.id) === form.productoId);
        setUnidades((prev) => [...prev, {
            vehiculoId: id,
            placa: v.placa,
            desc: `${v.marca} ${v.modelo || ''}`.trim(),
            montoAnual: prod?.precioUnitario != null ? String(prod.precioUnitario) : '',
        }]);
        setVehiculoPick('');
    };
    const quitarVehiculo = (id: number) => setUnidades((prev) => prev.filter((u) => u.vehiculoId !== id));
    const setUnidadMonto = (id: number, monto: string) =>
        setUnidades((prev) => prev.map((u) => (u.vehiculoId === id ? { ...u, montoAnual: monto } : u)));

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (unidades.length === 0) { alert('Agrega al menos un vehículo', 'warning'); return; }
        setLoading(true);
        try {
            const base: any = {
                fechaInicio: form.fechaInicio,
                duracionMeses: parseInt(form.duracionMeses),
                productoId: form.productoId ? parseInt(form.productoId) : undefined,
                observaciones: form.observaciones || undefined,
                // El set de vehículos ahora es editable también en edición: se envían las
                // unidades y el backend las sincroniza (agrega/quita/actualiza montos).
                vehiculos: unidades.map((u) => ({
                    vehiculoId: u.vehiculoId,
                    montoAnual: u.montoAnual ? parseFloat(u.montoAnual) : undefined,
                })),
            };
            const ok = esEdicion
                ? await updateContrato(contrato!.id, base)
                : await addContrato(base);
            if (ok) onSaved(); // el store ya mostró el toast (éxito o error)
        } finally { setLoading(false); }
    };

    const fechaFinPreview = (() => {
        if (!form.fechaInicio || !form.duracionMeses) return null;
        const d = new Date(form.fechaInicio); d.setMonth(d.getMonth() + parseInt(form.duracionMeses));
        return fmt(d.toISOString());
    })();

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm font-jakarta">
            <div className="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-3xl bg-white dark:bg-slate-800 shadow-2xl">
                <div className="flex flex-shrink-0 items-center justify-between px-6 py-5" style={{ background: ACCENT }}>
                    <div className="flex items-center gap-3">
                        <div className="rounded-2xl bg-white/15 p-2.5"><Icon icon={esEdicion ? 'solar:pen-2-bold-duotone' : 'solar:document-add-bold-duotone'} className="text-2xl text-white" /></div>
                        <div><h2 className="text-lg font-bold text-white">{esEdicion ? 'Editar contrato' : 'Nuevo contrato'}</h2><p className="text-xs text-white/70">Suscripción vehicular</p></div>
                    </div>
                    <button onClick={onClose} className="text-white/70 transition hover:text-white"><Icon icon="solar:close-circle-bold" className="text-2xl" /></button>
                </div>
                <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
                    <div className="flex-1 space-y-4 overflow-y-auto p-6">
                        {/* Servicio primero: al agregar vehículos, autocompleta su monto con el precio del servicio */}
                        <Select
                            name="productoId"
                            label="Servicio"
                            options={productoOpts}
                            value={productoSel}
                            isSearch
                            onChange={(id: any) => setForm((f) => ({ ...f, productoId: String(id) }))}
                            placeholder="— Servicio (GPS, monitoreo, alarma...) —"
                            error={null}
                        />

                        {/* Selector de vehículos (multi-vehículo) — disponible al crear y al editar */}
                        <div>
                            <Select
                                name="vehiculoPick"
                                label="Agregar vehículo(s) *"
                                options={vehiculoOpts}
                                value={vehiculoPickLabel}
                                isSearch
                                onChange={(id: any) => { setVehiculoPick(String(id)); agregarVehiculo(Number(id)); }}
                                placeholder="— Buscar y agregar vehículo —"
                                error={null}
                            />
                            <p className="mt-1 text-xs text-slate-400 dark:text-gray-400">Puedes agregar, quitar o cambiar los vehículos del contrato.</p>
                        </div>

                        {/* Lista de vehículos del contrato */}
                        {unidades.length > 0 && (
                            <div className="rounded-2xl border border-slate-200 dark:border-slate-700">
                                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 px-4 py-2">
                                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-gray-400">Vehículos ({unidades.length})</span>
                                </div>
                                <div className="divide-y divide-slate-100 dark:divide-slate-700">
                                    {unidades.map((u) => (
                                        <div key={u.vehiculoId} className="flex items-center gap-3 px-4 py-2.5">
                                            <span className="rounded-lg bg-slate-100 dark:bg-slate-700 px-2 py-0.5 font-mono text-sm font-bold tracking-widest text-slate-800 dark:text-white">{u.placa}</span>
                                            <span className="flex-1 truncate text-sm text-slate-600 dark:text-slate-300">{u.desc}</span>
                                            <div className="w-28">
                                                <InputPro
                                                    name={`monto-${u.vehiculoId}`}
                                                    type="number"
                                                    value={u.montoAnual}
                                                    onChange={(e) => setUnidadMonto(u.vehiculoId, e.target.value)}
                                                    isLabel={false}
                                                    placeholder="Monto S/"
                                                    error={null}
                                                />
                                            </div>
                                            <button type="button" onClick={() => quitarVehiculo(u.vehiculoId)} aria-label="Quitar" className="text-slate-400 dark:text-gray-400 transition hover:text-rose-500 dark:hover:text-rose-400">
                                                <Icon icon="solar:trash-bin-trash-bold" width={18} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                                {totalUnidades > 0 && (
                                    <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-700 px-4 py-2.5">
                                        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-gray-400">Total anual</span>
                                        <span className="text-sm font-bold text-slate-800 dark:text-white">S/ {totalUnidades.toFixed(2)}</span>
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-4">
                            <InputPro name="fechaInicio" type="date" value={form.fechaInicio} onChange={(e) => setForm((f) => ({ ...f, fechaInicio: e.target.value }))} isLabel label="Fecha de inicio *" error={null} />
                            <Select name="duracionMeses" label="Duración" options={duracionOpts} value={duracionSel} onChange={(id: any) => setForm((f) => ({ ...f, duracionMeses: String(id) }))} error={null} />
                        </div>
                        {fechaFinPreview && (
                            <div className="flex items-center gap-2 rounded-2xl border border-violet-100 dark:border-violet-900/40 bg-violet-50 dark:bg-violet-900/20 px-4 py-3">
                                <Icon icon="solar:calendar-mark-bold" className="text-lg text-violet-500" />
                                <span className="text-sm text-violet-700 dark:text-violet-300">Vence el <strong>{fechaFinPreview}</strong></span>
                            </div>
                        )}
                        {/* El monto total es la suma de los montos por vehículo (ver "Total anual"). */}
                        <InputPro name="observaciones" type="textarea" rows={3} value={form.observaciones} onChange={(e) => setForm((f) => ({ ...f, observaciones: e.target.value }))} isLabel label="Observaciones" placeholder="GPS marca X instalado, alarma modelo Y..." error={null} />
                    </div>
                    <div className="flex flex-shrink-0 gap-3 border-t border-slate-100 dark:border-slate-700 p-4">
                        <button type="button" onClick={onClose} className="flex-1 rounded-2xl border border-slate-200 dark:border-slate-700 py-2.5 text-sm font-semibold text-slate-600 dark:text-slate-300 transition hover:bg-slate-50 dark:hover:bg-slate-800">Cancelar</button>
                        <button type="submit" disabled={loading} className="flex flex-1 items-center justify-center gap-2 rounded-2xl py-2.5 text-sm font-bold text-white shadow-lg shadow-violet-500/30 transition hover:brightness-105 disabled:opacity-60" style={{ background: ACCENT }}>
                            {loading ? <Icon icon="eos-icons:loading" /> : <Icon icon="solar:check-circle-bold" />}{esEdicion ? 'Guardar cambios' : 'Crear contrato'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ─── Página Principal ─────────────────────────────────────────────────────────
export default function ContratosVehicularesPage() {
    const sidebarColor = useThemeStore((s) => s.sidebarColor);
    const ACCENT = SIDEBAR_COLOR_HEX[sidebarColor] ?? '#7551FF';
    const { alert } = useAlertStore();
    const auth = useAuthStore((s) => s.auth);
    // Estado de la lista desde el store (se actualiza reactivamente en cada CRUD).
    const data = useContratosVehicularesStore((s) => s.contratos);
    const alertas = useContratosVehicularesStore((s) => s.alertas);
    const total = useContratosVehicularesStore((s) => s.totalContratos);
    const loading = useContratosVehicularesStore((s) => s.loadingContratos);
    const getContratos = useContratosVehicularesStore((s) => s.getContratos);
    const renovarContrato = useContratosVehicularesStore((s) => s.renovarContrato);
    const cancelarContrato = useContratosVehicularesStore((s) => s.cancelarContrato);
    const deleteContrato = useContratosVehicularesStore((s) => s.deleteContrato);

    const [estadoFilter, setEstadoFilter] = useState<EstadoContrato | 'TODOS'>('TODOS');
    const [search, setSearch] = useState('');
    const debouncedSearch = useDebounce(search, 350);

    const [modalNuevo, setModalNuevo] = useState(false);
    const [contratoEditar, setContratoEditar] = useState<IContratoVehicular | null>(null);
    const [renovando, setRenovando] = useState<number | null>(null);
    const [contratoRenovar, setContratoRenovar] = useState<IContratoVehicular | null>(null);
    const [contratoCancelar, setContratoCancelar] = useState<IContratoVehicular | null>(null);
    const [cancelando, setCancelando] = useState(false);
    const [contratoEliminar, setContratoEliminar] = useState<IContratoVehicular | null>(null);
    const [eliminando, setEliminando] = useState(false);

    useEffect(() => {
        getContratos({ estado: estadoFilter, search: debouncedSearch });
    }, [estadoFilter, debouncedSearch, getContratos]);

    const cargar = () => getContratos({ estado: estadoFilter, search: debouncedSearch });

    // Renovar pasa siempre por confirmación para evitar renovaciones por error.
    const confirmarRenovar = async () => {
        if (!contratoRenovar) return;
        const contrato = contratoRenovar;
        setRenovando(contrato.id);
        setContratoRenovar(null);
        await renovarContrato(contrato.id);
        setRenovando(null);
    };

    const handleCancelar = async () => {
        if (!contratoCancelar) return;
        setCancelando(true);
        const ok = await cancelarContrato(contratoCancelar.id);
        if (ok) setContratoCancelar(null);
        setCancelando(false);
    };

    const handleEliminar = async () => {
        if (!contratoEliminar) return;
        setEliminando(true);
        const ok = await deleteContrato(contratoEliminar.id);
        if (ok) setContratoEliminar(null);
        setEliminando(false);
    };

    // Placas del contrato (todas las unidades; respaldo al vehículo principal).
    const placasDeContrato = (c: IContratoVehicular): string[] => {
        if (c.unidades?.length) return c.unidades.map((u) => u.vehiculo?.placa || '').filter(Boolean);
        return c.vehiculo?.placa ? [c.vehiculo.placa] : [];
    };

    // Abre WhatsApp con un recordatorio de vencimiento prellenado para el propietario.
    const recordarWhatsApp = (c: IContratoVehicular) => {
        const tel = c.vehiculo?.cliente?.telefono;
        if (!tel) { alert('Este propietario no tiene teléfono registrado', 'warning'); return; }
        const dias = diasRestantes(c.fechaFin);
        const nombre = c.vehiculo?.cliente?.nombre || 'estimado(a) cliente';
        const servicio = c.producto?.descripcion ? ` (${c.producto.descripcion})` : '';
        const placas = placasDeContrato(c);
        const vehiculosTxt = placas.length > 1
            ? `sus vehículos ${placas.join(', ')}`
            : `su vehículo ${placas[0] || ''}`;
        const estadoTxt = dias < 0
            ? `venció hace ${Math.abs(dias)} día${Math.abs(dias) === 1 ? '' : 's'}`
            : dias === 0 ? 'vence hoy'
                : `vence en ${dias} día${dias === 1 ? '' : 's'}`;
        const mensaje =
            `Hola ${nombre}, le recordamos que el contrato/suscripción de ${vehiculosTxt}${servicio} ${estadoTxt} (${fmt(c.fechaFin)}). ` +
            `Le invitamos a renovarlo para mantener su servicio activo. ¡Gracias!`;
        const url = buildStorePurchaseWhatsappUrl(tel, mensaje);
        if (!url) { alert('No se pudo generar el enlace de WhatsApp', 'warning'); return; }
        window.open(url, '_blank', 'noopener,noreferrer');
    };

    // Genera el PDF/impresión del contrato con la lista completa de vehículos.
    const imprimirContrato = (c: IContratoVehicular) => {
        const vehiculos = c.unidades?.length
            ? c.unidades.map((u) => ({
                placa: u.vehiculo?.placa || '',
                marca: u.vehiculo?.marca, modelo: u.vehiculo?.modelo,
                color: u.vehiculo?.color, anio: u.vehiculo?.anio,
                montoAnual: u.montoAnual,
            }))
            : [{
                placa: c.vehiculo?.placa || '',
                marca: c.vehiculo?.marca, modelo: c.vehiculo?.modelo,
                color: c.vehiculo?.color, anio: undefined,
                montoAnual: c.montoAnual,
            }];
        printContrato({
            numero: c.id,
            estado: estadoLabel[c.estado],
            servicio: c.producto?.descripcion,
            fechaInicio: c.fechaInicio,
            fechaFin: c.fechaFin,
            montoTotalAnual: c.montoAnual,
            observaciones: c.observaciones,
            cliente: c.vehiculo?.cliente,
            vehiculos,
            empresa: (auth as any)?.empresa,
        });
    };

    const bodyData = data.map((c) => {
        const dias = diasRestantes(c.fechaFin);
        const pill = estadoPill[c.estado];
        const placas = placasDeContrato(c);
        const extra = placas.length - 1;
        return {
            id: c.id,
            Vehículo: (
                <div className="flex items-center gap-2.5">
                    <div className="h-8 w-8 shrink-0 rounded-xl bg-violet-50 text-violet-600 dark:bg-violet-900/20 dark:text-violet-400 grid place-items-center">
                        <Icon icon="solar:card-2-linear" className="text-lg" />
                    </div>
                    <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                            <span className="font-mono text-sm font-bold tracking-wide text-slate-800 dark:text-white">{c.vehiculo?.placa}</span>
                            {extra > 0 && (
                                <span className="rounded-md bg-violet-100 dark:bg-violet-900/30 px-1.5 py-0.5 text-[11px] font-semibold text-violet-700 dark:text-violet-400" title={placas.join(', ')}>+{extra}</span>
                            )}
                        </div>
                        <p className="mt-0.5 text-xs text-slate-400 dark:text-gray-400 truncate">{extra > 0 ? `${placas.length} vehículos` : `${c.vehiculo?.marca || ''} ${c.vehiculo?.modelo || ''}`}</p>
                    </div>
                </div>
            ),
            Propietario: (
                <div className="flex items-center gap-2.5 min-w-0">
                    <div className="h-7 w-7 shrink-0 rounded-full bg-gradient-to-br from-violet-400 to-indigo-500 text-white grid place-items-center text-[11px] font-bold">
                        {(c.vehiculo?.cliente?.nombre || '—').charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 truncate max-w-[160px]">{c.vehiculo?.cliente?.nombre || '—'}</p>
                        {c.vehiculo?.cliente?.email && <p className="text-xs text-slate-400 dark:text-gray-400 truncate max-w-[160px]">{c.vehiculo.cliente.email}</p>}
                    </div>
                </div>
            ),
            Servicio: c.producto?.descripcion ? <span className="text-sm text-slate-600 dark:text-slate-300">{c.producto.descripcion}</span> : <span className="text-slate-300 dark:text-gray-600">—</span>,
            Inicio: <span className="text-sm text-slate-500 dark:text-gray-400">{fmt(c.fechaInicio)}</span>,
            Vencimiento: (
                <div><p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{fmt(c.fechaFin)}</p><p className={`mt-0.5 text-xs ${diasColor(dias)}`}>{dias < 0 ? `Venció hace ${Math.abs(dias)}d` : `${dias} días`}</p></div>
            ),
            Estado: (
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${pill.bg} ${pill.text}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${pill.dot}`} /> {estadoLabel[c.estado]}
                </span>
            ),
            Acciones: (
                <div className="flex items-center gap-1">
                    <button title="Editar contrato" onClick={() => setContratoEditar(c)} className="rounded-lg p-2 text-slate-500 dark:text-gray-400 transition hover:bg-slate-100 dark:hover:bg-slate-800"><Icon icon="solar:pen-bold" className="text-lg" /></button>
                    <button title="Imprimir / PDF" onClick={() => imprimirContrato(c)} className="rounded-lg p-2 text-slate-500 dark:text-gray-400 transition hover:bg-slate-100 dark:hover:bg-slate-800"><Icon icon="solar:printer-bold" className="text-lg" /></button>
                    {c.vehiculo?.cliente?.telefono && (
                        <button title="Recordar por WhatsApp" onClick={() => recordarWhatsApp(c)} className="rounded-lg p-2 text-emerald-500 dark:text-emerald-400 transition hover:bg-emerald-50 dark:hover:bg-emerald-900/20"><Icon icon="mdi:whatsapp" className="text-lg" /></button>
                    )}
                    {c.estado !== 'CANCELADO' && (
                        <button title="Renovar +12 meses" onClick={() => setContratoRenovar(c)} disabled={renovando === c.id} className="rounded-lg p-2 text-violet-500 dark:text-violet-400 transition hover:bg-violet-50 dark:hover:bg-violet-900/20 disabled:opacity-50">
                            {renovando === c.id ? <Icon icon="eos-icons:loading" className="text-lg" /> : <Icon icon="solar:refresh-circle-bold" className="text-lg" />}
                        </button>
                    )}
                    {c.estado !== 'CANCELADO' && c.estado !== 'VENCIDO' && (
                        <button title="Cancelar contrato" onClick={() => setContratoCancelar(c)} className="rounded-lg p-2 text-amber-500 dark:text-amber-400 transition hover:bg-amber-50 dark:hover:bg-amber-900/20"><Icon icon="solar:close-circle-bold" className="text-lg" /></button>
                    )}
                    <button title="Eliminar contrato" onClick={() => setContratoEliminar(c)} className="rounded-lg p-2 text-rose-400 dark:text-rose-400 transition hover:bg-rose-50 dark:hover:bg-rose-900/20"><Icon icon="solar:trash-bin-trash-bold" className="text-lg" /></button>
                </div>
            ),
        };
    });

    return (
        <div className="min-h-screen -m-5 p-5 bg-[#F7F8FB] dark:bg-[#0A0D14] font-jakarta">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm text-slate-400 dark:text-gray-400 mb-5">
                <Icon icon="solar:home-smile-linear" className="text-base" />
                <span>Panel</span>
                <Icon icon="solar:alt-arrow-right-linear" className="text-xs" />
                <span>Vehículos</span>
                <Icon icon="solar:alt-arrow-right-linear" className="text-xs" />
                <span className="font-semibold" style={{ color: ACCENT }}>Contratos</span>
            </div>

            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-5">
                <div className="flex items-center gap-3 min-w-0">
                    <div className="h-11 w-11 grid place-items-center rounded-2xl bg-violet-50 text-violet-600 dark:bg-violet-900/20 dark:text-violet-400 shrink-0">
                        <Icon icon="solar:document-bold-duotone" className="text-2xl" />
                    </div>
                    <div className="min-w-0">
                        <h1 className="text-[22px] font-extrabold text-slate-800 dark:text-white tracking-tight truncate">Contratos y suscripciones</h1>
                        <p className="text-sm text-slate-400 dark:text-gray-400 mt-0.5">Trazabilidad vehicular · {total} contrato{total !== 1 ? 's' : ''}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2.5">
                    <div className="relative flex-1 lg:w-72">
                        <Icon icon="solar:magnifer-linear" className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-gray-400" />
                        <input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Buscar por placa o propietario…"
                            className="w-full h-11 pl-10 pr-9 rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-700 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-gray-500 focus:outline-none focus:border-[var(--accent)] transition-colors"
                        />
                        {search && (
                            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 dark:text-gray-600 hover:text-slate-500 dark:hover:text-gray-400">
                                <Icon icon="solar:close-circle-bold" />
                            </button>
                        )}
                    </div>
                    <button onClick={() => setModalNuevo(true)}
                        className="h-11 px-4 rounded-2xl text-white text-sm font-bold flex items-center gap-1.5 shadow-lg shadow-violet-500/30 hover:brightness-105 transition-all shrink-0"
                        style={{ background: ACCENT }}>
                        <Icon icon="solar:add-circle-bold" className="text-lg" /> <span className="hidden sm:inline">Nuevo contrato</span>
                    </button>
                </div>
            </div>

            {/* Alertas por vencer */}
            {alertas.length > 0 && (
                <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-[0_2px_20px_rgba(15,23,42,0.05)] dark:shadow-none p-5 mb-5">
                    <div className="mb-3 flex items-center gap-2.5">
                        <div className="h-8 w-8 grid place-items-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400 shrink-0"><Icon icon="solar:danger-triangle-bold" className="text-lg" /></div>
                        <h3 className="text-sm font-bold text-slate-800 dark:text-white">{alertas.length} contrato{alertas.length !== 1 ? 's' : ''} por vencer en los próximos 30 días</h3>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {alertas.slice(0, 8).map((c) => {
                            const dias = diasRestantes(c.fechaFin);
                            return (
                                <div key={c.id} className="flex items-center gap-2 rounded-2xl border border-slate-100 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/50 px-3 py-2">
                                    <span className="font-mono text-sm font-bold text-slate-800 dark:text-white">{c.vehiculo?.placa}</span>
                                    <span className={`text-xs ${diasColor(dias)}`}>{dias < 0 ? 'Vencido' : `${dias}d`}</span>
                                    {c.vehiculo?.cliente?.telefono && (
                                        <button onClick={() => recordarWhatsApp(c)} title="Avisar al cliente por WhatsApp" className="flex items-center justify-center rounded-lg bg-emerald-500 p-1.5 text-white transition hover:bg-emerald-600">
                                            <Icon icon="mdi:whatsapp" width={15} height={15} />
                                        </button>
                                    )}
                                    <button onClick={() => setContratoRenovar(c)} disabled={renovando === c.id} className="rounded-lg px-2.5 py-1 text-xs font-bold text-white transition hover:brightness-105 disabled:opacity-60" style={{ background: ACCENT }}>{renovando === c.id ? '...' : 'Renovar'}</button>
                                </div>
                            );
                        })}
                        {alertas.length > 8 && <span className="self-center text-xs font-semibold text-amber-600 dark:text-amber-400">+{alertas.length - 8} más</span>}
                    </div>
                </div>
            )}

            {/* Card contenedora */}
            <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-[0_2px_20px_rgba(15,23,42,0.05)] dark:shadow-none overflow-hidden">
                {/* Toolbar */}
                <div className="flex flex-wrap items-center gap-2 p-4 border-b border-slate-100 dark:border-slate-700">
                    <button onClick={cargar} className="h-9 px-3.5 rounded-xl border-2 text-sm font-bold flex items-center gap-1.5 transition-colors"
                        style={{ borderColor: `${ACCENT}55`, color: ACCENT }}>
                        <Icon icon="solar:refresh-linear" className={loading ? 'animate-spin' : ''} /> Actualizar
                    </button>
                    {ESTADO_OPTS.map((o) => {
                        const active = estadoFilter === o.id;
                        return (
                            <button key={o.id} onClick={() => setEstadoFilter(o.id as any)}
                                className={`h-9 px-3.5 rounded-xl text-sm font-semibold transition-colors ${active ? 'text-white' : 'border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                                style={active ? { background: ACCENT } : undefined}>
                                {o.value}
                            </button>
                        );
                    })}
                    <span className="ml-auto text-sm text-slate-400 dark:text-gray-400 font-medium px-1">{total.toLocaleString('es-PE')} resultados</span>
                </div>

                {/* Tabla */}
                {loading ? (
                    <div className="p-4 space-y-2.5">
                        {Array.from({ length: 8 }).map((_, i) => (
                            <div key={i} className="h-10 rounded-xl bg-slate-100 dark:bg-slate-700 animate-pulse" />
                        ))}
                    </div>
                ) : data.length === 0 ? (
                    <div className="py-16 text-center">
                        <Icon icon="solar:document-linear" className="mx-auto mb-2 text-5xl text-slate-200 dark:text-gray-700" />
                        <p className="text-sm text-slate-400 dark:text-gray-400">No hay contratos registrados</p>
                    </div>
                ) : (
                    <DataTable headerColumns={['Vehículo', 'Propietario', 'Servicio', 'Inicio', 'Vencimiento', 'Estado', 'Acciones']} bodyData={bodyData} pageSize={15} />
                )}
            </div>

            {(modalNuevo || contratoEditar) && (
                <ContratoModal
                    contrato={contratoEditar}
                    onClose={() => { setModalNuevo(false); setContratoEditar(null); }}
                    onSaved={() => { setModalNuevo(false); setContratoEditar(null); }}
                />
            )}
            {contratoRenovar && (
                <ModalConfirm
                    isOpenModal={!!contratoRenovar}
                    setIsOpenModal={(v) => { if (!v) setContratoRenovar(null); }}
                    confirmSubmit={confirmarRenovar}
                    title="Renovar contrato"
                    information={`¿Renovar el contrato del vehículo ${contratoRenovar.vehiculo?.placa} por 12 meses más?`}
                    confirmText="Renovar"
                />
            )}
            {contratoCancelar && (
                <ModalConfirm
                    isOpenModal={!!contratoCancelar}
                    setIsOpenModal={(v) => { if (!v) setContratoCancelar(null); }}
                    confirmSubmit={handleCancelar}
                    title="Cancelar contrato"
                    information={`¿Cancelar el contrato del vehículo ${contratoCancelar.vehiculo?.placa}? El contrato queda inactivo pero conserva su historial.`}
                    confirmText="Cancelar contrato"
                    confirmLoading={cancelando}
                />
            )}
            {contratoEliminar && (
                <ModalConfirm
                    isOpenModal={!!contratoEliminar}
                    setIsOpenModal={(v) => { if (!v) setContratoEliminar(null); }}
                    confirmSubmit={handleEliminar}
                    title="Eliminar contrato"
                    information={`¿Eliminar definitivamente el contrato del vehículo ${contratoEliminar.vehiculo?.placa}? Esta acción no se puede deshacer.`}
                    confirmText="Eliminar"
                    confirmLoading={eliminando}
                />
            )}
        </div>
    );
}
