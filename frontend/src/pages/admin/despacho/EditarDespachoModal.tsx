import { Icon } from "@iconify/react";
import { useState, useEffect } from "react";
import { Calendar } from "@/components/Date";
import Select from "@/components/Select";
import moment from "moment";
import apiClient from "@/utils/apiClient";
import useAlertStore from "@/zustand/alert";
import { useRepartidoresStore } from "@/zustand/repartidores";
import { ShalomAgenciaSelect } from "@/components/ShalomAgenciaSelect";
import { EstablecimientoCombobox } from "@/components/EstablecimientoCombobox";

export const COURIERS = [
    { value: 'SHALOM_PRO', label: 'Shalom PRO' },
    { value: 'SHALOM_COD', label: 'Shalom COD' },
    { value: 'OLVA', label: 'Olva Courier' },
    { value: 'URBANO', label: 'Urbano Express' },
    { value: 'CRUZ_SUR', label: 'Cruz del Sur' },
    { value: 'PROPIOS', label: 'Reparto propio' },
    { value: 'OTRO', label: 'Otro' },
];

export const TURNOS = [
    { value: 'MANANA', label: 'Mañana' },
    { value: 'TARDE', label: 'Tarde' },
    { value: 'NOCHE', label: 'Noche' },
];

const SHALOM_COURIERS = new Set(['SHALOM_PRO', 'SHALOM_COD']);

const inp = "w-full h-10 px-3 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-indigo-400/30 focus:border-indigo-400 transition-all placeholder:text-slate-400";
const lbl = "block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5";

function PasswordField({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
    const [show, setShow] = useState(false);
    return (
        <div className="relative">
            <input
                type={show ? 'text' : 'password'}
                value={value}
                onChange={e => onChange(e.target.value)}
                placeholder={placeholder}
                className={inp + ' pr-10'}
            />
            <button
                type="button"
                onClick={() => setShow(v => !v)}
                className="absolute inset-y-0 right-2.5 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
            >
                <Icon icon={show ? 'solar:eye-bold' : 'solar:eye-closed-bold'} className="text-base" />
            </button>
        </div>
    );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div>
            <label className={lbl}>{label}</label>
            {children}
        </div>
    );
}

export function EditarDespachoModal({ comprobanteId, onClose, onSuccess }: { comprobanteId: number; onClose: () => void; onSuccess: () => void }) {
    const [envioData, setEnvioData] = useState<any>({
        transportista: '',
        codigoGuia: '',
        observaciones: '',
        tipoEnvio: 'DOMICILIO',
        agenciaDestino: '',
        celularDest: '',
        nroPaquetes: 1,
        turnoEnvio: '',
        tipoMercaderia: '',
        claveEnvio: '',
        nroOrden: '',
        claveOrden: '',
        establecimiento: '',
        repartidorId: '',
        repartidor: '',
        empaquetador: '',
        fechaEstimada: '',
        costoEnvio: 0,
        pagarFlete: 'CLIENTE' as 'CLIENTE' | 'NEGOCIO',
        aplicacionMontoCliente: 'ADELANTO' as 'ITEM_ENVIO' | 'ADELANTO' | 'NEGOCIO',
        montoCOD: 0,
    });
    const [esNV, setEsNV] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const { alert } = useAlertStore();
    const { repartidores, fetchRepartidores } = useRepartidoresStore();

    useEffect(() => {
        const fetchDespacho = async () => {
            try {
                const [, despachoResp, comprobanteResp] = await Promise.all([
                    fetchRepartidores(),
                    apiClient.get<any>(`/envio-despacho/comprobante/${comprobanteId}`),
                    apiClient.get<any>(`/comprobante/${comprobanteId}`).catch(() => null),
                ]);
                const data = despachoResp.data;
                const payload = data?.data ?? data;
                const comprobantePayload = comprobanteResp?.data?.data ?? comprobanteResp?.data ?? null;
                const vendedorNombre = comprobantePayload?.usuario?.nombre ?? '';
                const tipoComp = comprobantePayload?.tipoDoc ?? comprobantePayload?.tipoComprobante ?? comprobantePayload?.tipo ?? '';
                const FORMALES = ['01', '03', '07', '08'];
                setEsNV(!FORMALES.includes(tipoComp) || tipoComp === '');
                const adelantoComprobante = Number(comprobantePayload?.adelanto ?? 0);
                if (payload) {
                    setEnvioData({
                        transportista: payload.transportista || '',
                        codigoGuia: payload.codigoGuia || '',
                        observaciones: payload.observaciones || '',
                        tipoEnvio: payload.tipoEnvio || 'DOMICILIO',
                        agenciaDestino: payload.agenciaDestino || '',
                        celularDest: payload.celularDest || '',
                        nroPaquetes: payload.nroPaquetes || 1,
                        turnoEnvio: payload.turnoEnvio || '',
                        tipoMercaderia: payload.tipoMercaderia || '',
                        claveEnvio: payload.claveEnvio || '',
                        nroOrden: payload.nroOrden || '',
                        claveOrden: payload.claveOrden || '',
                        establecimiento: payload.establecimiento || '',
                        repartidorId: payload.repartidorId ? String(payload.repartidorId) : '',
                        repartidor: payload.repartidor || '',
                        empaquetador: payload.empaquetador || vendedorNombre || '',
                        fechaEstimada: payload.fechaEstimada ? moment(payload.fechaEstimada).format('YYYY-MM-DD') : '',
                        costoEnvio: payload.costoEnvio ?? adelantoComprobante ?? 0,
                        pagarFlete: payload.pagarFlete ?? (adelantoComprobante > 0 ? 'CLIENTE' : 'NEGOCIO'),
                        aplicacionMontoCliente: payload.aplicacionMontoCliente ?? (adelantoComprobante > 0 ? 'ADELANTO' : 'NEGOCIO'),
                        montoCOD: payload.montoCOD ?? 0,
                    });
                }
            } catch (error) {
                alert('No se pudo cargar el despacho', 'error');
                onClose();
            } finally {
                setLoading(false);
            }
        };
        fetchDespacho();
    }, [comprobanteId, alert, fetchRepartidores, onClose]);

    const set = (field: string, value: any) =>
        setEnvioData((prev: any) => ({ ...prev, [field]: value }));

    const selectedCourier = COURIERS.find(c => c.value === envioData.transportista);
    const esShalom = SHALOM_COURIERS.has(envioData.transportista);
    const esPropio = envioData.transportista === 'PROPIOS';

    const handleConfirmar = async () => {
        setSaving(true);
        try {
            const payload = {
                ...envioData,
                pagarFlete: envioData.aplicacionMontoCliente === 'NEGOCIO' ? 'NEGOCIO' : 'CLIENTE',
                repartidorId: envioData.repartidorId ? Number(envioData.repartidorId) : undefined,
                repartidor: envioData.repartidorId ? undefined : envioData.repartidor,
            };
            await apiClient.put(`/envio-despacho/comprobante/${comprobanteId}`, payload);
            alert('Despacho actualizado correctamente', 'success');
            onSuccess();
        } catch (error) {
            alert('Error al actualizar el despacho', 'error');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return null;

    return (
        <div className="fixed inset-0 z-[9999] top-[-30px] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50  " onClick={onClose} />
            <div className="relative w-full max-w-2xl bg-white dark:bg-[#111827] rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">

                {/* Header */}
                <div className="bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-5 flex-shrink-0">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center">
                                <Icon icon="solar:pen-bold-duotone" className="text-white text-xl" />
                            </div>
                            <div>
                                <h2 className="text-white font-black text-lg leading-none">Editar Despacho</h2>
                                <p className="text-indigo-200 text-xs mt-0.5">Actualizar datos de envío o agregar número de guía</p>
                            </div>
                        </div>
                        <button type="button" onClick={onClose}
                            className="w-8 h-8 rounded-xl bg-white/15 hover:bg-white/25 flex items-center justify-center text-white transition-colors">
                            <Icon icon="solar:close-circle-bold" className="text-lg" />
                        </button>
                    </div>

                    {/* Courier chips */}
                    <div className="mt-4 flex flex-wrap gap-2">
                        {COURIERS.map(c => (
                            <button key={c.value} type="button" onClick={() => set('transportista', c.value)}
                                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${envioData.transportista === c.value
                                        ? 'bg-white text-indigo-700 shadow-lg shadow-indigo-900/20'
                                        : 'bg-white/15 text-white/80 hover:bg-white/25'
                                    }`}>
                                {c.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Body — scrollable */}
                <div className="overflow-y-auto p-6 space-y-4 flex-1">

                    {/* Código de Guía (Importante para la vista de edición) */}
                    <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                            <Icon icon="mdi:barcode-scan" className="text-indigo-400" />
                            Rastreo
                        </p>
                        <div className="grid grid-cols-1 gap-3">
                            <Field label="Código de Guía / Rastreo">
                                <input type="text" value={envioData.codigoGuia}
                                    onChange={e => set('codigoGuia', e.target.value)}
                                    placeholder="Nro de guía de remisión o courier" className={inp} />
                            </Field>
                        </div>
                    </div>

                    {/* SECCIÓN 1: Origen del despacho */}
                    <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                            <Icon icon="solar:shop-bold-duotone" className="text-indigo-400" />
                            Origen del despacho
                        </p>
                        <Field label="Establecimiento">
                            <EstablecimientoCombobox
                                value={envioData.establecimiento}
                                onChange={v => set('establecimiento', v)}
                            />
                        </Field>
                    </div>

                    {/* SECCIÓN SHALOM — visible solo con Shalom PRO o COD */}
                    {esShalom && (
                        <div className="rounded-2xl border border-red-200 dark:border-red-900/50">
                            <div className="flex items-center justify-between px-4 py-2.5 bg-gradient-to-r from-red-600 to-red-500">
                                <div className="flex items-center gap-2">
                                    <Icon icon="solar:box-bold-duotone" className="text-white text-base" />
                                    <span className="text-white text-xs font-black tracking-wide">Datos de envío Shalom</span>
                                </div>
                                <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                                    envioData.transportista === 'SHALOM_COD'
                                        ? 'bg-amber-100 text-amber-700'
                                        : 'bg-white/20 text-white'
                                }`}>
                                    {envioData.transportista === 'SHALOM_COD' ? 'COD · Cobro en destino' : 'PRO · Pago cancelado'}
                                </span>
                            </div>
                            <div className="p-4 bg-red-50/30 dark:bg-red-950/10 space-y-3">
                                {/* Credenciales */}
                                <div className="grid grid-cols-2 gap-3">
                                    <Field label="Clave de envío">
                                        <input
                                            type="text"
                                            value={envioData.claveEnvio}
                                            onChange={e => set('claveEnvio', e.target.value)}
                                            placeholder="Clave envío Shalom"
                                            autoComplete="off"
                                            className={inp}
                                        />
                                    </Field>
                                    <Field label="Clave de orden">
                                        <input
                                            type="text"
                                            value={envioData.claveOrden}
                                            onChange={e => set('claveOrden', e.target.value)}
                                            placeholder="Clave orden Shalom"
                                            autoComplete="off"
                                            className={inp}
                                        />
                                    </Field>
                                </div>
                                {/* N° Orden + Tipo paquetería */}
                                <div className="grid grid-cols-2 gap-3">
                                    <Field label="N° Orden courier">
                                        <input type="text" value={envioData.nroOrden}
                                            onChange={e => set('nroOrden', e.target.value)}
                                            placeholder="Ej: 78560415" className={inp} />
                                    </Field>
                                    <Field label="Tipo de paquetería">
                                        <input type="text" value={envioData.tipoMercaderia}
                                            onChange={e => set('tipoMercaderia', e.target.value)}
                                            placeholder="Ej: Caja, Sobre, Frágil..." className={inp} />
                                    </Field>
                                </div>
                                {/* Fecha + monto COD */}
                                <div className={`grid gap-3 ${envioData.transportista === 'SHALOM_COD' ? 'grid-cols-2' : 'grid-cols-1'}`}>
                                    <Calendar
                                        text="Fecha estimada de despacho"
                                        name="fechaEstimada"
                                        value={envioData.fechaEstimada ? moment(envioData.fechaEstimada).format('DD/MM/YYYY') : ''}
                                        onChange={(date) => {
                                            if (!date) { set('fechaEstimada', ''); return; }
                                            const parsed = moment(date, 'DD/MM/YYYY');
                                            set('fechaEstimada', parsed.isValid() ? parsed.format('YYYY-MM-DD') : '');
                                        }}
                                    />
                                    {envioData.transportista === 'SHALOM_COD' && (
                                        <Field label="Monto a cobrar en destino S/">
                                            <div className="relative">
                                                <span className="absolute inset-y-0 left-3 flex items-center text-xs font-bold text-slate-400 pointer-events-none">S/</span>
                                                <input
                                                    type="number"
                                                    min={0}
                                                    step={0.01}
                                                    value={envioData.montoCOD || ''}
                                                    onChange={e => set('montoCOD', Number(e.target.value) || 0)}
                                                    placeholder="0.00"
                                                    className={`${inp} pl-9`}
                                                />
                                            </div>
                                        </Field>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* SECCIÓN 2: Tipo envío + Agencia destino */}
                    <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                            <Icon icon="solar:map-point-bold-duotone" className="text-indigo-400" />
                            Datos de entrega
                        </p>
                       <div className="mt-4 mb-4">
                       <Field label="Agencia de destino / Dirección">
                            {esShalom && envioData.tipoEnvio === 'AGENCIA' ? (
                                <ShalomAgenciaSelect
                                    value={envioData.agenciaDestino}
                                    onChange={v => set('agenciaDestino', v)}
                                    placeholder="Buscar agencia Shalom por nombre, provincia o departamento..."
                                />
                            ) : (
                                <input type="text" value={envioData.agenciaDestino}
                                    onChange={e => set('agenciaDestino', e.target.value)}
                                    placeholder={envioData.tipoEnvio === 'AGENCIA' ? 'Ej: Olva Cusco Centro' : 'Dirección de entrega'}
                                    className={inp} />
                            )}
                        </Field>
                       </div>
                        <div className="grid grid-cols-2 gap-3">

                            <Field label="Tipo de envío">
                                <div className="flex gap-2 w-full">
                                    {[
                                        { value: 'AGENCIA', label: 'Para agencia', icon: 'solar:buildings-2-bold-duotone' },
                                        { value: 'DOMICILIO', label: 'A domicilio', icon: 'solar:home-2-bold-duotone' },
                                    ].map(t => (
                                        <button key={t.value} type="button" onClick={() => set('tipoEnvio', t.value)}
                                            className={`flex-1 flex flex-col items-center gap-1 py-2 rounded-xl border-2 text-xs font-bold transition-all ${envioData.tipoEnvio === t.value
                                                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                                                    : 'border-slate-200 dark:border-slate-700 text-slate-500 hover:border-slate-300'
                                                }`}>
                                            <Icon icon={t.icon} className="text-lg" />
                                            {t.label}
                                        </button>
                                    ))}
                                </div>
                            </Field>

                        </div>
                    </div>

                    {/* SECCIÓN 3: Celular + Paquetes + Turno (+ Fecha y N° Orden para no-Shalom) */}
                    <div className="grid grid-cols-3 gap-3">
                        <Field label="Celular destinatario">
                            <input type="text" value={envioData.celularDest}
                                onChange={e => set('celularDest', e.target.value)}
                                placeholder="9XXXXXXXX" className={inp} />
                        </Field>
                        <Field label="N° Paquetes">
                            <input type="number" min={1} value={envioData.nroPaquetes}
                                onChange={e => set('nroPaquetes', Number(e.target.value))} className={inp} />
                        </Field>
                        <Field label="Turno">
                            <Select
                                label=""
                                name="turnoEnvio"
                                error=""
                                value={TURNOS.find(t => t.value === envioData.turnoEnvio)?.label ?? ''}
                                options={TURNOS.map(t => ({ id: t.value, value: t.label }))}
                                onChange={(id) => set('turnoEnvio', String(id))}
                            />
                        </Field>

                        {/* Fecha y N° Orden solo para couriers no-Shalom (para Shalom van en su propio card) */}
                        {!esShalom && (<>
                            <Calendar
                                text="Fecha"
                                name="fechaEstimada"
                                value={envioData.fechaEstimada ? moment(envioData.fechaEstimada).format('DD/MM/YYYY') : ''}
                                onChange={(date) => {
                                    if (!date) { set('fechaEstimada', ''); return; }
                                    const parsed = moment(date, 'DD/MM/YYYY');
                                    set('fechaEstimada', parsed.isValid() ? parsed.format('YYYY-MM-DD') : '');
                                }}
                            />
                            <Field label="N° Orden courier">
                                <input type="text" value={envioData.nroOrden}
                                    onChange={e => set('nroOrden', e.target.value)}
                                    placeholder="Número de orden" className={inp} />
                            </Field>
                        </>)}
                    </div>

                    {/* SECCIÓN 4: Personal */}
                    <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                            <Icon icon="solar:users-group-rounded-bold-duotone" className="text-indigo-400" />
                            Personal asignado
                        </p>
                        <div className="grid grid-cols-2 gap-3">
                            {esPropio && (
                                <Field label="Repartidor">
                                    {repartidores.length > 0 ? (
                                        <select
                                            value={envioData.repartidorId}
                                            onChange={e => {
                                                set('repartidorId', e.target.value);
                                                const selected = repartidores.find(r => String(r.id) === e.target.value);
                                                set('repartidor', selected?.nombre ?? '');
                                            }}
                                            className={inp}
                                        >
                                            <option value="">Seleccionar repartidor</option>
                                            {repartidores.map(r => (
                                                <option key={r.id} value={r.id}>
                                                    {r.nombre}{r.celular ? ` · ${r.celular}` : ''}{r.sede?.nombre ? ` · ${r.sede.nombre}` : ''}
                                                </option>
                                            ))}
                                        </select>
                                    ) : (
                                        <input type="text" value={envioData.repartidor}
                                            onChange={e => set('repartidor', e.target.value)}
                                            placeholder="Nombre del repartidor" className={inp} />
                                    )}
                                </Field>
                            )}
                            <Field label="Empaquetador">
                                <input type="text" value={envioData.empaquetador}
                                    onChange={e => set('empaquetador', e.target.value)}
                                    placeholder="Nombre del empaquetador" className={inp} />
                            </Field>
                        </div>
                    </div>

                    {/* Observaciones */}
                    <Field label="Observaciones">
                        <input type="text" value={envioData.observaciones}
                            onChange={e => set('observaciones', e.target.value)}
                            placeholder="Instrucciones especiales de embalaje o entrega..." className={inp} />
                    </Field>

                    {/* Monto cobrado al cliente — solo editable en NV (informales) */}
                    {esNV && (
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                                <Icon icon="solar:wallet-money-bold-duotone" className="text-indigo-400" />
                                Monto cobrado al cliente
                            </p>
                            <div className={`grid gap-3 ${Number(envioData.costoEnvio) > 0 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                                <Field label="Monto cobrado / adelanto (S/)">
                                    <input
                                        type="number"
                                        min={0}
                                        step={0.01}
                                        value={envioData.costoEnvio ?? 0}
                                        onChange={e => set('costoEnvio', Number(e.target.value) || 0)}
                                        placeholder="0.00 — dejar en 0 si no aplica"
                                        className={inp}
                                    />
                                </Field>
                                {Number(envioData.costoEnvio) > 0 && (
                                    <Field label="Aplicar como">
                                        <div className="flex gap-2 w-full">
                                            {[
                                                { value: 'ADELANTO', label: 'Adelanto' },
                                                { value: 'ITEM_ENVIO', label: 'Item envío' },
                                                { value: 'NEGOCIO', label: 'Negocio absorbe' },
                                            ].map(opt => (
                                                <button key={opt.value} type="button"
                                                    onClick={() => {
                                                        set('aplicacionMontoCliente', opt.value);
                                                        set('pagarFlete', opt.value === 'NEGOCIO' ? 'NEGOCIO' : 'CLIENTE');
                                                    }}
                                                    className={`flex-1 py-2.5 rounded-xl border-2 text-xs font-bold transition-all ${(envioData.aplicacionMontoCliente ?? 'ADELANTO') === opt.value
                                                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                                                        : 'border-slate-200 dark:border-slate-700 text-slate-500 hover:border-slate-300 dark:hover:border-slate-600'
                                                    }`}>
                                                    {opt.label}
                                                </button>
                                            ))}
                                        </div>
                                    </Field>
                                )}
                            </div>
                            {Number(envioData.costoEnvio) > 0 && (envioData.aplicacionMontoCliente ?? 'ADELANTO') === 'ADELANTO' && (
                                <p className="mt-2 text-[11px] font-semibold text-blue-600 dark:text-blue-300 flex items-center gap-1">
                                    <Icon icon="solar:card-recive-bold-duotone" className="text-base" />
                                    Se registrará como adelanto y el panel mostrará el saldo pendiente.
                                </p>
                            )}
                            {Number(envioData.costoEnvio) > 0 && envioData.aplicacionMontoCliente === 'ITEM_ENVIO' && (
                                <p className="mt-2 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                    <Icon icon="solar:bill-check-bold-duotone" className="text-base" />
                                    Este monto queda como cobro de envío, no como pago adelantado.
                                </p>
                            )}
                        </div>
                    )}

                    {/* Resumen */}
                    {(selectedCourier || envioData.agenciaDestino) && (
                        <div className="flex items-center gap-3 px-4 py-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl border border-indigo-100 dark:border-indigo-800/40">
                            <Icon icon="solar:info-circle-bold-duotone" className="text-indigo-500 text-lg flex-shrink-0" />
                            <p className="text-xs text-indigo-700 dark:text-indigo-300 font-semibold">
                                {selectedCourier?.label ?? '—'}
                                {' · '}{envioData.tipoEnvio === 'AGENCIA' ? 'Para agencia' : 'A domicilio'}
                                {envioData.agenciaDestino ? ` · ${envioData.agenciaDestino}` : ''}
                                {envioData.nroPaquetes > 1 ? ` · ${envioData.nroPaquetes} paquetes` : ''}
                                {envioData.establecimiento ? ` · ${envioData.establecimiento}` : ''}
                            </p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 pb-6 pt-3 flex gap-3 flex-shrink-0 border-t border-slate-100 dark:border-slate-800">
                    <button type="button" onClick={onClose} disabled={saving}
                        className="flex-1 h-11 rounded-2xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                        Cancelar
                    </button>
                    <button type="button" onClick={handleConfirmar} disabled={saving}
                        className="flex-[2] h-11 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-black text-sm shadow-lg shadow-indigo-500/25 hover:opacity-90 transition-opacity flex items-center justify-center gap-2">
                        {saving ? (
                            <Icon icon="eos-icons:loading" className="text-lg" />
                        ) : (
                            <Icon icon="solar:check-circle-bold" className="text-lg" />
                        )}
                        Guardar cambios
                    </button>
                </div>
            </div>
        </div>
    );
}
