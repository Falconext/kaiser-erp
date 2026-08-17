import { useState, useEffect, useCallback, useMemo, type ChangeEvent } from 'react';
import { Icon } from '@iconify/react';
import { get, post } from '@/utils/fetch';
import { useVehiculosStore } from '@/zustand/vehiculos';
import { useAuthStore } from '@/zustand/auth';
import useAlertStore from '@/zustand/alert';
import { useDebounce } from '@/hooks/useDebounce';
import InputPro from '@/components/InputPro';
import Select from '@/components/Select';
import ModalConfirm from '@/components/ModalConfirm';
import type {
    IVehiculo, EstadoContrato, TipoActa, NivelCombustible,
} from '@/interfaces/vehiculo';
import ChecklistPicker, { type ChecklistState, checklistToPayload } from './ChecklistPicker';
import { printActa } from './actaPrint';
import { useThemeStore, SIDEBAR_COLOR_HEX } from '@/zustand/theme';

// ─── Estilo CRM claro (ver src/pages/admin/Index.tsx) ──────────────────────────

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (v: string) =>
    new Intl.DateTimeFormat('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(v));

const diasRestantes = (fechaFin: string): number =>
    Math.ceil((new Date(fechaFin).getTime() - Date.now()) / 86400000);

const estadoBadge: Record<EstadoContrato, string> = {
    VIGENTE: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400',
    POR_VENCER: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-400',
    VENCIDO: 'bg-red-50 text-red-700 ring-1 ring-red-200 dark:bg-red-500/10 dark:text-red-400',
    CANCELADO: 'bg-gray-100 text-gray-500 ring-1 ring-gray-200 dark:bg-slate-700 dark:text-slate-400',
};
const estadoLabel: Record<EstadoContrato, string> = {
    VIGENTE: 'Vigente', POR_VENCER: 'Por vencer', VENCIDO: 'Vencido', CANCELADO: 'Cancelado',
};
// Pills de estado estilo CRM — punto de color + fondo pastel.
const estadoPillCfg: Record<EstadoContrato, { dot: string; text: string; bg: string }> = {
    VIGENTE: { dot: 'bg-emerald-500', text: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
    POR_VENCER: { dot: 'bg-amber-500', text: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/20' },
    VENCIDO: { dot: 'bg-rose-500', text: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-50 dark:bg-rose-900/20' },
    CANCELADO: { dot: 'bg-slate-400', text: 'text-slate-500 dark:text-slate-400', bg: 'bg-slate-100 dark:bg-slate-800' },
};
const NIVEL_OPTS = (['LLENO', '3/4', '1/2', '1/4', 'VACIO'] as NivelCombustible[]).map((n) => ({ id: n, value: n }));

// ─── Modal Vehículo (CRUD) ────────────────────────────────────────────────────
function VehiculoModal({ vehiculo, onClose, onSaved }: { vehiculo?: IVehiculo | null; onClose: () => void; onSaved: () => void }) {
    const { alert } = useAlertStore();
    const addVehiculo = useVehiculosStore((s) => s.addVehiculo);
    const updateVehiculo = useVehiculosStore((s) => s.updateVehiculo);
    const [loading, setLoading] = useState(false);
    const [form, setForm] = useState({
        placa: vehiculo?.placa ?? '', marca: vehiculo?.marca ?? '', modelo: vehiculo?.modelo ?? '',
        color: vehiculo?.color ?? '', anio: vehiculo?.anio?.toString() ?? '', observaciones: vehiculo?.observaciones ?? '',
        kilometraje: vehiculo?.kilometraje?.toString() ?? '', nivelCombustible: vehiculo?.nivelCombustible ?? '',
    });
    // Checklist de inspección inicial: solo al registrar un vehículo nuevo.
    const [checks, setChecks] = useState<ChecklistState>({});
    const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setForm((f) => ({ ...f, [name]: name === 'placa' ? value.toUpperCase() : value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.placa.trim() || !form.marca.trim()) { alert('Placa y marca son requeridos', 'warning'); return; }
        setLoading(true);
        try {
            const payload = {
                placa: form.placa.toUpperCase().trim(), marca: form.marca.trim(),
                modelo: form.modelo.trim() || undefined, color: form.color.trim() || undefined,
                anio: form.anio ? parseInt(form.anio) : undefined, observaciones: form.observaciones.trim() || undefined,
                kilometraje: form.kilometraje ? parseInt(form.kilometraje) : undefined,
                nivelCombustible: form.nivelCombustible || undefined,
            };
            if (vehiculo) {
                const ok = await updateVehiculo(vehiculo.id, payload);
                if (!ok) return; // el store ya mostró el error
            } else {
                const creado = await addVehiculo(payload);
                if (!creado) return; // el store ya mostró el error
                // Registra un acta de INGRESO inicial con la inspección hecha al registrar.
                const checklist = checklistToPayload(checks);
                if (creado.id && checklist.length) {
                    await post(`vehiculos/${creado.id}/acta`, {
                        tipo: 'INGRESO',
                        observaciones: 'Inspección inicial al registrar el vehículo.',
                        fotos: [],
                        checklist,
                    });
                }
            }
            onSaved();
        } catch (err: any) {
            alert(err?.response?.data?.message || 'Error al guardar', 'error');
        } finally { setLoading(false); }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
            <div className={`flex max-h-[92vh] w-full flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-slate-900 ${vehiculo ? 'max-w-lg' : 'max-w-3xl'}`}>
                <div className="flex flex-shrink-0 items-center justify-between bg-gradient-to-r from-slate-800 to-slate-700 px-6 py-4">
                    <div className="flex items-center gap-3">
                        <div className="rounded-xl bg-white/10 p-2"><Icon icon="solar:car-bold-duotone" className="text-2xl text-white" /></div>
                        <div>
                            <h2 className="text-lg font-semibold text-white">{vehiculo ? 'Editar Vehículo' : 'Registrar Vehículo'}</h2>
                            <p className="text-xs text-slate-400">Seguridad Electrónica Vehicular</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-slate-400 transition-colors hover:text-white"><Icon icon="solar:close-circle-bold" className="text-2xl" /></button>
                </div>
                <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
                    <div className="flex-1 space-y-4 overflow-y-auto p-6">
                        <div className="grid grid-cols-2 gap-4">
                            <InputPro name="placa" value={form.placa} onChange={handleChange} isLabel label="Placa *" placeholder="ABC-123" error={null} />
                            <InputPro name="marca" value={form.marca} onChange={handleChange} isLabel label="Marca *" placeholder="Toyota, Hyundai..." error={null} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <InputPro name="modelo" value={form.modelo} onChange={handleChange} isLabel label="Modelo" placeholder="Corolla, Accent..." error={null} />
                            <InputPro name="color" value={form.color} onChange={handleChange} isLabel label="Color" placeholder="Blanco, Negro..." error={null} />
                        </div>
                        <InputPro name="anio" type="number" value={form.anio} onChange={handleChange} isLabel label="Año" placeholder="2024" error={null} />
                        <div className="grid grid-cols-2 gap-4">
                            <InputPro name="kilometraje" type="number" value={form.kilometraje} onChange={handleChange} isLabel label="Kilometraje" placeholder="0" error={null} />
                            <Select name="nivelCombustible" label="Nivel de combustible" options={NIVEL_OPTS} value={form.nivelCombustible} onChange={(id: any) => setForm((f) => ({ ...f, nivelCombustible: String(id) as NivelCombustible }))} placeholder="— Seleccionar —" error={null} />
                        </div>
                        {/* Checklist de inspección inicial — solo al registrar un vehículo nuevo */}
                        {!vehiculo && (
                            <div className="border-t border-slate-100 pt-4 dark:border-slate-800">
                                <ChecklistPicker checks={checks} onChange={setChecks} />
                            </div>
                        )}
                        <InputPro name="observaciones" type="textarea" rows={3} value={form.observaciones} onChange={handleChange} isLabel label="Observaciones" placeholder="Estado general, accesorios instalados..." error={null} />
                    </div>
                    <div className="flex flex-shrink-0 gap-3 border-t border-slate-100 p-4 dark:border-slate-800">
                        <button type="button" onClick={onClose} className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">Cancelar</button>
                        <button type="submit" disabled={loading} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-slate-800 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:opacity-60">
                            {loading ? <Icon icon="eos-icons:loading" /> : <Icon icon="solar:check-circle-bold" />}{vehiculo ? 'Actualizar' : 'Registrar'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ─── Modal Acta de Inspección ─────────────────────────────────────────────────
function ActaModal({ vehiculo, onClose, onSaved }: { vehiculo: IVehiculo; onClose: () => void; onSaved: () => void }) {
    const { alert } = useAlertStore();
    const auth = useAuthStore((s) => s.auth);
    const [loading, setLoading] = useState(false);
    const [tipo, setTipo] = useState<TipoActa>('INGRESO');
    const [km, setKm] = useState('');
    const [nivelCombustible, setNivelCombustible] = useState<NivelCombustible | ''>('');
    const [observaciones, setObservaciones] = useState('');
    // Checklist: solo se guardan los ítems marcados con novedad.
    const [checks, setChecks] = useState<ChecklistState>({});

    // Genera el acta imprimible / PDF con lo capturado, para que el cliente la firme.
    const handleImprimir = () => {
        printActa({
            tipo,
            km: km ? parseInt(km) : null,
            nivelCombustible: nivelCombustible || null,
            observaciones: observaciones.trim() || null,
            checklist: checklistToPayload(checks),
            usuarioNombre: (auth as any)?.nombre,
            vehiculo: {
                placa: vehiculo.placa, marca: vehiculo.marca, modelo: vehiculo.modelo,
                color: vehiculo.color, anio: vehiculo.anio, cliente: vehiculo.cliente,
            },
            empresa: (auth as any)?.empresa,
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const checklist = checklistToPayload(checks);
            await post(`vehiculos/${vehiculo.id}/acta`, {
                tipo, km: km ? parseInt(km) : undefined,
                nivelCombustible: nivelCombustible || undefined,
                observaciones: observaciones.trim() || undefined, fotos: [],
                checklist: checklist.length ? checklist : undefined,
            });
            alert(`Acta de ${tipo === 'INGRESO' ? 'ingreso' : 'retiro'} registrada`, 'success');
            onSaved();
        } catch (err: any) {
            alert(err?.response?.data?.message || 'Error al registrar acta', 'error');
        } finally { setLoading(false); }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
            <div className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-slate-900">
                <div className={`flex flex-shrink-0 items-center justify-between bg-gradient-to-r px-6 py-4 ${tipo === 'INGRESO' ? 'from-blue-600 to-blue-500' : 'from-orange-600 to-orange-500'}`}>
                    <div className="flex items-center gap-3">
                        <div className="rounded-xl bg-white/10 p-2"><Icon icon={tipo === 'INGRESO' ? 'solar:arrow-right-down-bold' : 'solar:arrow-left-up-bold'} className="text-2xl text-white" /></div>
                        <div>
                            <h2 className="text-lg font-semibold text-white">Acta de inspección</h2>
                            <p className="font-mono text-xs text-white/70">{vehiculo.placa} — {vehiculo.marca} {vehiculo.modelo}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-white/70 transition hover:text-white"><Icon icon="solar:close-circle-bold" className="text-2xl" /></button>
                </div>

                <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
                    <div className="flex-1 space-y-5 overflow-y-auto p-6">
                        <div>
                            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Tipo de acta</label>
                            <div className="grid grid-cols-2 gap-3">
                                {(['INGRESO', 'RETIRO'] as TipoActa[]).map((t) => (
                                    <button key={t} type="button" onClick={() => setTipo(t)}
                                        className={`flex items-center justify-center gap-2 rounded-xl border-2 py-3 text-sm font-semibold transition ${tipo === t ? (t === 'INGRESO' ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-500/10' : 'border-orange-500 bg-orange-50 text-orange-700 dark:bg-orange-500/10') : 'border-slate-200 text-slate-400 hover:border-slate-300 dark:border-slate-700'}`}>
                                        <Icon icon={t === 'INGRESO' ? 'solar:arrow-right-down-bold' : 'solar:arrow-left-up-bold'} />{t === 'INGRESO' ? 'Ingreso' : 'Retiro'}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <InputPro name="km" type="number" value={km} onChange={(e) => setKm(e.target.value)} isLabel label="Kilometraje" placeholder="85000" error={null} />
                            <Select name="nivelCombustible" label="Nivel de combustible" options={NIVEL_OPTS} value={nivelCombustible} onChange={(id: any) => setNivelCombustible(id as NivelCombustible)} placeholder="— Seleccionar —" error={null} />
                        </div>

                        {/* Checklist de inspección */}
                        <ChecklistPicker checks={checks} onChange={setChecks} />

                        <InputPro name="observaciones" type="textarea" rows={3} value={observaciones} onChange={(e) => setObservaciones(e.target.value)} isLabel label="Observaciones adicionales" placeholder="Cualquier detalle extra no cubierto por el checklist..." error={null} />
                    </div>

                    <div className="flex flex-shrink-0 flex-col-reverse gap-3 border-t border-slate-100 p-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
                        <button type="button" onClick={handleImprimir} className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 py-2.5 px-4 text-sm font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">
                            <Icon icon="solar:printer-bold" />Imprimir / PDF
                        </button>
                        <div className="flex flex-col-reverse gap-3 sm:flex-row">
                            <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 py-2.5 px-4 text-sm font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">Cancelar</button>
                            <button type="submit" disabled={loading} className={`flex items-center justify-center gap-2 rounded-xl py-2.5 px-4 text-sm font-semibold text-white transition disabled:opacity-60 ${tipo === 'INGRESO' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-orange-600 hover:bg-orange-700'}`}>
                                {loading ? <Icon icon="eos-icons:loading" /> : <Icon icon="solar:clipboard-check-bold" />}Registrar acta de {tipo === 'INGRESO' ? 'ingreso' : 'retiro'}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ─── Modal Detalle Vehículo ───────────────────────────────────────────────────
function DetalleModal({ vehiculo, onClose, onNuevaActa }: { vehiculo: IVehiculo; onClose: () => void; onNuevaActa: () => void }) {
    const { alert } = useAlertStore();
    const auth = useAuthStore((s) => s.auth);
    const [detalle, setDetalle] = useState<IVehiculo | null>(null);
    const [loadingDetalle, setLoadingDetalle] = useState(true);

    // Reimprime un acta ya guardada para que el cliente la firme.
    const imprimirActa = (acta: NonNullable<IVehiculo['actas']>[number]) => {
        const v = detalle ?? vehiculo;
        printActa({
            tipo: acta.tipo,
            km: acta.km,
            nivelCombustible: acta.nivelCombustible,
            observaciones: acta.observaciones,
            checklist: acta.checklist ?? [],
            fecha: acta.creadoEn,
            usuarioNombre: acta.usuario?.nombre,
            vehiculo: {
                placa: v.placa, marca: v.marca, modelo: v.modelo,
                color: v.color, anio: v.anio, cliente: v.cliente,
            },
            empresa: (auth as any)?.empresa,
        });
    };

    const cargar = useCallback(async () => {
        setLoadingDetalle(true);
        try { const resp: any = await get(`vehiculos/${vehiculo.id}`); setDetalle(resp.data); }
        catch { alert('Error al cargar detalle', 'error'); }
        finally { setLoadingDetalle(false); }
    }, [vehiculo.id]);
    useEffect(() => { cargar(); }, [cargar]);

    // Contrato del vehículo: como principal (contratos) o como unidad de un
    // contrato multi-vehículo (contratoItems). Se toma el más reciente.
    const ultimoContrato = detalle?.contratos?.[0] ?? detalle?.contratoItems?.[0]?.contrato;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
            <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-slate-900">
                <div className="flex flex-shrink-0 items-center justify-between bg-gradient-to-r from-slate-900 to-slate-700 px-6 py-4">
                    <div className="flex items-center gap-3">
                        <div className="rounded-xl bg-white/10 p-2.5"><Icon icon="solar:car-bold-duotone" className="text-3xl text-white" /></div>
                        <div>
                            <p className="font-mono text-xl font-bold tracking-widest text-white">{vehiculo.placa}</p>
                            <p className="text-sm text-slate-400">{vehiculo.marca} {vehiculo.modelo} {vehiculo.anio ? `· ${vehiculo.anio}` : ''}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={onNuevaActa} className="flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2 text-sm text-white transition hover:bg-white/20"><Icon icon="solar:clipboard-add-bold" />Nueva acta</button>
                        <button onClick={onClose} className="text-slate-400 transition hover:text-white"><Icon icon="solar:close-circle-bold" className="text-2xl" /></button>
                    </div>
                </div>
                <div className="flex-1 space-y-6 overflow-y-auto p-6">
                    {loadingDetalle ? (
                        <div className="flex justify-center py-12"><Icon icon="eos-icons:loading" className="text-4xl text-slate-400" /></div>
                    ) : detalle ? (
                        <>
                            <div className="grid grid-cols-3 gap-3">
                                {[
                                    { label: 'Color', value: detalle.color || '—', icon: 'solar:palette-bold' },
                                    { label: 'Propietario', value: detalle.cliente?.nombre || '—', icon: 'solar:user-bold' },
                                    { label: 'Teléfono', value: detalle.cliente?.telefono || '—', icon: 'solar:phone-bold' },
                                ].map((item) => (
                                    <div key={item.label} className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800">
                                        <div className="mb-1 flex items-center gap-1.5 text-slate-400"><Icon icon={item.icon} className="text-sm" /><span className="text-xs font-medium uppercase tracking-wide">{item.label}</span></div>
                                        <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{item.value}</p>
                                    </div>
                                ))}
                            </div>
                            {ultimoContrato && (
                                <div className={`rounded-xl border p-4 ${ultimoContrato.estado === 'VIGENTE' ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-500/20 dark:bg-emerald-500/5' : ultimoContrato.estado === 'POR_VENCER' ? 'border-amber-200 bg-amber-50 dark:border-amber-500/20 dark:bg-amber-500/5' : 'border-red-200 bg-red-50 dark:border-red-500/20 dark:bg-red-500/5'}`}>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Icon icon="solar:document-bold" className="text-lg text-slate-500" />
                                            <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">Contrato</span>
                                            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${estadoBadge[ultimoContrato.estado]}`}>{estadoLabel[ultimoContrato.estado]}</span>
                                        </div>
                                        <p className="text-xs text-slate-500 dark:text-slate-400">Vence: {fmt(ultimoContrato.fechaFin)} · <span className={`font-semibold ${diasRestantes(ultimoContrato.fechaFin) < 0 ? 'text-red-600' : diasRestantes(ultimoContrato.fechaFin) <= 30 ? 'text-amber-600' : 'text-emerald-600'}`}>{diasRestantes(ultimoContrato.fechaFin) < 0 ? `Venció hace ${Math.abs(diasRestantes(ultimoContrato.fechaFin))}d` : `${diasRestantes(ultimoContrato.fechaFin)} días`}</span></p>
                                    </div>
                                    {ultimoContrato.producto && <p className="ml-6 mt-1 text-xs text-slate-600 dark:text-slate-400">{ultimoContrato.producto.descripcion}</p>}
                                </div>
                            )}
                            <div>
                                <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200"><Icon icon="solar:clipboard-list-bold" className="text-slate-500" />Historial de actas<span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-400">{detalle.actas?.length ?? 0}</span></h3>
                                {(detalle.actas?.length ?? 0) === 0 ? (
                                    <div className="rounded-xl bg-slate-50 py-8 text-center dark:bg-slate-800"><Icon icon="solar:clipboard-bold" className="mx-auto mb-2 text-4xl text-slate-300 dark:text-slate-600" /><p className="text-sm text-slate-400">Sin actas registradas</p></div>
                                ) : (
                                    <div className="space-y-2">
                                        {detalle.actas?.map((acta) => (
                                            <div key={acta.id} className={`flex items-start gap-3 rounded-xl border p-3 ${acta.tipo === 'INGRESO' ? 'border-blue-100 bg-blue-50 dark:border-blue-500/20 dark:bg-blue-500/5' : 'border-orange-100 bg-orange-50 dark:border-orange-500/20 dark:bg-orange-500/5'}`}>
                                                <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg ${acta.tipo === 'INGRESO' ? 'bg-blue-100 text-blue-600 dark:bg-blue-500/20' : 'bg-orange-100 text-orange-600 dark:bg-orange-500/20'}`}><Icon icon={acta.tipo === 'INGRESO' ? 'solar:arrow-right-down-bold' : 'solar:arrow-left-up-bold'} className="text-lg" /></div>
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-center justify-between"><span className={`text-xs font-semibold ${acta.tipo === 'INGRESO' ? 'text-blue-700 dark:text-blue-400' : 'text-orange-700 dark:text-orange-400'}`}>{acta.tipo === 'INGRESO' ? 'Ingreso' : 'Retiro'}</span><div className="flex items-center gap-1.5"><span className="text-xs text-slate-400">{fmt(acta.creadoEn)}</span><button type="button" title="Imprimir / PDF" onClick={() => imprimirActa(acta)} className="rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-700 dark:hover:text-slate-200"><Icon icon="solar:printer-bold" className="text-sm" /></button></div></div>
                                                    <div className="mt-0.5 flex gap-4 text-xs text-slate-500 dark:text-slate-400">
                                                        {acta.km != null && <span>🚗 {acta.km.toLocaleString()} km</span>}
                                                        {acta.nivelCombustible && <span>⛽ {acta.nivelCombustible}</span>}
                                                        {acta.usuario && <span>👤 {acta.usuario.nombre}</span>}
                                                    </div>
                                                    {acta.observaciones && <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-400">{acta.observaciones}</p>}
                                                    {acta.checklist && acta.checklist.length > 0 && (
                                                        <div className="mt-2">
                                                            <p className="mb-1 text-[11px] font-semibold text-amber-700 dark:text-amber-400">{acta.checklist.length} novedad{acta.checklist.length !== 1 ? 'es' : ''}:</p>
                                                            <div className="flex flex-wrap gap-1.5">
                                                                {acta.checklist.map((c, i) => (
                                                                    <span key={i} title={c.categoria} className="rounded-md bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-800 dark:bg-amber-500/10 dark:text-amber-400">
                                                                        {c.item}: {c.estado}{c.nota ? ` · ${c.nota}` : ''}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </>
                    ) : null}
                </div>
            </div>
        </div>
    );
}

// ─── Página Principal ─────────────────────────────────────────────────────────
export default function VehiculosPage() {
    const sidebarColor = useThemeStore((s) => s.sidebarColor);
    const ACCENT = SIDEBAR_COLOR_HEX[sidebarColor] ?? '#7551FF';
    // Estado de la lista desde el store (se actualiza reactivamente en cada CRUD).
    const data = useVehiculosStore((s) => s.vehiculos);
    const total = useVehiculosStore((s) => s.totalVehiculos);
    const loading = useVehiculosStore((s) => s.loadingVehiculos);
    const getVehiculos = useVehiculosStore((s) => s.getVehiculos);
    const deleteVehiculo = useVehiculosStore((s) => s.deleteVehiculo);
    const [search, setSearch] = useState('');
    const debouncedSearch = useDebounce(search, 350);

    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(15);

    const [modalCrear, setModalCrear] = useState(false);
    const [vehiculoEditar, setVehiculoEditar] = useState<IVehiculo | null>(null);
    const [vehiculoDetalle, setVehiculoDetalle] = useState<IVehiculo | null>(null);
    const [vehiculoActa, setVehiculoActa] = useState<IVehiculo | null>(null);
    const [vehiculoEliminar, setVehiculoEliminar] = useState<IVehiculo | null>(null);
    const [eliminando, setEliminando] = useState(false);

    const cargar = useCallback(() => getVehiculos({ search: debouncedSearch }), [getVehiculos, debouncedSearch]);
    useEffect(() => { cargar(); }, [cargar]);
    useEffect(() => { setPage(1); }, [debouncedSearch, data.length, limit]);

    const handleEliminar = async () => {
        if (!vehiculoEliminar) return;
        setEliminando(true);
        const ok = await deleteVehiculo(vehiculoEliminar.id);
        if (ok) setVehiculoEliminar(null);
        setEliminando(false);
    };

    // Contrato activo del vehículo: como principal (contratos) o como unidad de un
    // contrato multi-vehículo (contratoItems).
    const esActivo = (c?: { estado: EstadoContrato } | null) => !!c && (c.estado === 'VIGENTE' || c.estado === 'POR_VENCER');
    const contratoActivo = (v: IVehiculo) =>
        v.contratos?.find((c) => esActivo(c)) ??
        v.contratoItems?.map((i) => i.contrato).find((c) => esActivo(c));

    // ── Paginación client-side (la data llega en un solo lote de hasta 100) ──────
    const totalPages = Math.max(1, Math.ceil(data.length / limit));
    const fromRow = data.length === 0 ? 0 : (page - 1) * limit + 1;
    const toRow = Math.min(page * limit, data.length);
    const paginated = data.slice((page - 1) * limit, page * limit);

    const pageNumbers = useMemo(() => {
        const nums: number[] = [];
        const win = 2;
        for (let i = Math.max(1, page - win); i <= Math.min(totalPages, page + win); i++) nums.push(i);
        if (!nums.includes(1)) nums.unshift(1);
        if (!nums.includes(totalPages)) nums.push(totalPages);
        return [...new Set(nums)].sort((a, b) => a - b);
    }, [page, totalPages]);

    return (
        <div className="min-h-screen -m-5 p-5 bg-[#F7F8FB] dark:bg-slate-950 font-jakarta">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm text-slate-400 mb-5">
                <Icon icon="solar:home-smile-linear" className="text-base" />
                <span>Panel</span>
                <Icon icon="solar:alt-arrow-right-linear" className="text-xs" />
                <span>Operaciones</span>
                <Icon icon="solar:alt-arrow-right-linear" className="text-xs" />
                <span className="font-semibold" style={{ color: ACCENT }}>Vehículos</span>
            </div>

            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-5">
                <div className="min-w-0">
                    <h1 className="text-[22px] font-extrabold text-slate-800 dark:text-white tracking-tight">Vehículos</h1>
                    <p className="text-sm text-slate-400 mt-0.5">Trazabilidad vehicular · {total} vehículo{total !== 1 ? 's' : ''} registrado{total !== 1 ? 's' : ''}</p>
                </div>
                <div className="flex items-center gap-2.5">
                    <div className="relative flex-1 lg:w-72">
                        <Icon icon="solar:magnifer-linear" className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Buscar por placa, marca, propietario…"
                            className="w-full h-11 pl-10 pr-9 rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-700 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:border-[var(--accent)] transition-colors"
                        />
                        {search && (
                            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500">
                                <Icon icon="solar:close-circle-bold" />
                            </button>
                        )}
                    </div>
                    <button onClick={() => setModalCrear(true)}
                        className="h-11 px-4 rounded-2xl text-white text-sm font-bold flex items-center gap-1.5 shadow-lg shadow-violet-500/30 hover:brightness-105 transition-all shrink-0"
                        style={{ background: ACCENT }}>
                        <Icon icon="solar:add-circle-bold" className="text-lg" /> <span className="hidden sm:inline">Nuevo vehículo</span>
                    </button>
                </div>
            </div>

            {/* Card contenedora */}
            <div className="bg-white dark:bg-[#111827] rounded-3xl shadow-[0_2px_20px_rgba(15,23,42,0.05)] overflow-hidden">
                {/* Toolbar */}
                <div className="flex flex-wrap items-center gap-2.5 p-4 border-b border-slate-100 dark:border-slate-800">
                    <button onClick={cargar} className="h-9 px-3.5 rounded-xl border-2 text-sm font-bold flex items-center gap-1.5 transition-colors"
                        style={{ borderColor: `${ACCENT}55`, color: ACCENT }}>
                        <Icon icon="solar:refresh-linear" className={loading ? 'animate-spin' : ''} /> Actualizar
                    </button>
                    <span className="text-sm text-slate-400 font-medium px-1">{total.toLocaleString('es-PE')} resultados</span>
                </div>

                {/* Tabla */}
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[820px]">
                        <thead>
                            <tr className="text-[11px] font-bold uppercase tracking-wide text-slate-400 border-b border-slate-100 dark:border-slate-800">
                                <th className="py-3 pl-5 pr-3">Placa</th>
                                <th className="py-3 px-3">Vehículo</th>
                                <th className="py-3 px-3">Propietario</th>
                                <th className="py-3 px-3">Contrato</th>
                                <th className="py-3 px-3 pr-5 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                Array.from({ length: 8 }).map((_, i) => (
                                    <tr key={i} className="border-b border-slate-50 dark:border-slate-800">
                                        <td colSpan={5} className="py-3.5 px-5">
                                            <div className="h-6 rounded-lg bg-slate-100 dark:bg-slate-800 animate-pulse" />
                                        </td>
                                    </tr>
                                ))
                            ) : data.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="py-16 text-center">
                                        <Icon icon="solar:cardholder-linear" className="text-5xl text-slate-200 dark:text-slate-700 mx-auto mb-2" />
                                        <p className="text-slate-400 text-sm">No hay vehículos registrados. ¡Agrega el primero!</p>
                                    </td>
                                </tr>
                            ) : paginated.map((v) => {
                                const contrato = contratoActivo(v);
                                const dias = contrato ? diasRestantes(contrato.fechaFin) : null;
                                const pill = contrato ? estadoPillCfg[contrato.estado] : null;
                                return (
                                    <tr key={v.id} className="border-b border-slate-50 dark:border-slate-800 hover:bg-slate-50/60 dark:hover:bg-slate-800/60 transition-colors">
                                        <td className="py-3 pl-5 pr-3">
                                            <span className="inline-block rounded-lg bg-slate-100 dark:bg-slate-800 px-3 py-1 font-mono text-sm font-bold tracking-widest text-slate-800 dark:text-slate-100">{v.placa}</span>
                                        </td>
                                        <td className="py-3 px-3">
                                            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{v.marca} {v.modelo || ''}</p>
                                            <p className="text-xs text-slate-400">{v.color} {v.anio ? `· ${v.anio}` : ''}</p>
                                        </td>
                                        <td className="py-3 px-3">
                                            {v.cliente ? (
                                                <div className="flex items-center gap-2.5 min-w-0">
                                                    <div className="h-8 w-8 rounded-full bg-gradient-to-br from-violet-400 to-indigo-500 text-white grid place-items-center text-xs font-bold shrink-0">
                                                        {(v.cliente.nombre || '?').charAt(0).toUpperCase()}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 truncate max-w-[160px]">{v.cliente.nombre}</p>
                                                        {v.cliente.email && <p className="text-xs text-slate-400 truncate max-w-[160px]">{v.cliente.email}</p>}
                                                        <p className="text-xs text-slate-400">{v.cliente.telefono || '—'}</p>
                                                    </div>
                                                </div>
                                            ) : <span className="text-sm text-slate-300 dark:text-slate-600">—</span>}
                                        </td>
                                        <td className="py-3 px-3">
                                            {contrato && pill ? (
                                                <div className="flex flex-col items-start gap-1">
                                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${pill.bg} ${pill.text}`}>
                                                        <span className={`w-1.5 h-1.5 rounded-full ${pill.dot}`} /> {estadoLabel[contrato.estado]}
                                                    </span>
                                                    <span className={`text-xs font-medium ${dias !== null && dias < 0 ? 'text-rose-500' : dias !== null && dias <= 30 ? 'text-amber-500' : 'text-emerald-600'}`}>{dias !== null && dias < 0 ? `Venció hace ${Math.abs(dias)}d` : dias !== null ? `${dias} días` : ''}</span>
                                                </div>
                                            ) : <span className="text-xs text-slate-400">Sin contrato</span>}
                                        </td>
                                        <td className="py-3 px-3 pr-5">
                                            <div className="flex items-center justify-end gap-1">
                                                <button title="Ver detalle" onClick={() => setVehiculoDetalle(v)} className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 dark:text-slate-400 transition hover:bg-slate-100 dark:hover:bg-slate-800"><Icon icon="solar:eye-bold" className="text-lg" /></button>
                                                <button title="Acta de inspección" onClick={() => setVehiculoActa(v)} className="grid h-8 w-8 place-items-center rounded-lg text-blue-500 transition hover:bg-blue-50 dark:hover:bg-blue-900/20"><Icon icon="solar:clipboard-add-bold" className="text-lg" /></button>
                                                <button title="Editar" onClick={() => setVehiculoEditar(v)} className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 dark:text-slate-400 transition hover:bg-slate-100 dark:hover:bg-slate-800"><Icon icon="solar:pen-bold" className="text-lg" /></button>
                                                <button title="Eliminar" onClick={() => setVehiculoEliminar(v)} className="grid h-8 w-8 place-items-center rounded-lg text-rose-400 transition hover:bg-rose-50 dark:hover:bg-rose-900/20"><Icon icon="solar:trash-bin-trash-bold" className="text-lg" /></button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {/* Paginación */}
                {!loading && data.length > 0 && (
                    <div className="flex flex-wrap items-center justify-between gap-3 p-4 border-t border-slate-100 dark:border-slate-800">
                        <span className="text-sm text-slate-400">{fromRow}-{toRow} de {data.length.toLocaleString('es-PE')}</span>
                        <div className="flex items-center gap-1">
                            <button disabled={page <= 1} onClick={() => setPage(1)} className="h-8 w-8 grid place-items-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30"><Icon icon="solar:double-alt-arrow-left-linear" /></button>
                            <button disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="h-8 w-8 grid place-items-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30"><Icon icon="solar:alt-arrow-left-linear" /></button>
                            {pageNumbers.map((n, i) => {
                                const prev = pageNumbers[i - 1];
                                const gap = prev && n - prev > 1;
                                return (
                                    <span key={n} className="flex items-center">
                                        {gap && <span className="px-1 text-slate-300">…</span>}
                                        <button onClick={() => setPage(n)}
                                            className={`h-8 min-w-8 px-2 grid place-items-center rounded-lg text-sm font-semibold transition-colors ${n === page ? 'text-white' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                                            style={n === page ? { background: ACCENT } : undefined}>
                                            {n}
                                        </button>
                                    </span>
                                );
                            })}
                            <button disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} className="h-8 w-8 grid place-items-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30"><Icon icon="solar:alt-arrow-right-linear" /></button>
                            <button disabled={page >= totalPages} onClick={() => setPage(totalPages)} className="h-8 w-8 grid place-items-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30"><Icon icon="solar:double-alt-arrow-right-linear" /></button>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-slate-400">
                            <span>Filas/pág</span>
                            <Select
                                name="limit"
                                label=""
                                error=""
                                options={[15, 30, 50].map((n) => ({ id: n, value: String(n) }))}
                                value={String(limit)}
                                onChange={(id: any) => setLimit(Number(id))}
                            />
                        </div>
                    </div>
                )}
            </div>

            {(modalCrear || vehiculoEditar) && (
                <VehiculoModal vehiculo={vehiculoEditar} onClose={() => { setModalCrear(false); setVehiculoEditar(null); }} onSaved={() => { setModalCrear(false); setVehiculoEditar(null); cargar(); }} />
            )}
            {vehiculoDetalle && <DetalleModal vehiculo={vehiculoDetalle} onClose={() => setVehiculoDetalle(null)} onNuevaActa={() => setVehiculoActa(vehiculoDetalle)} />}
            {vehiculoActa && <ActaModal vehiculo={vehiculoActa} onClose={() => setVehiculoActa(null)} onSaved={() => { setVehiculoActa(null); cargar(); }} />}
            {vehiculoEliminar && (
                <ModalConfirm
                    isOpenModal={!!vehiculoEliminar}
                    setIsOpenModal={(v) => { if (!v) setVehiculoEliminar(null); }}
                    confirmSubmit={handleEliminar}
                    title="Eliminar vehículo"
                    information={`¿Eliminar el vehículo con placa ${vehiculoEliminar.placa}? Se eliminarán todas sus actas e historial.`}
                    confirmText="Eliminar"
                    confirmLoading={eliminando}
                />
            )}
        </div>
    );
}
