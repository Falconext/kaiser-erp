import { Icon } from "@iconify/react";
import { useState, useEffect } from "react";
import { Calendar } from "@/components/Date";
import Select from "@/components/Select";
import moment from "moment";
import { useRepartidoresStore } from "@/zustand/repartidores";
import useAlertStore from "@/zustand/alert";
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
const invalidInp = "border-red-400 dark:border-red-500 focus:border-red-500 focus:ring-red-400/20";

type EnvioValidationErrors = Partial<Record<
    'transportista' | 'establecimiento' | 'agenciaDestino' |
    'tipoEnvio' | 'celularDest' | 'nroPaquetes' | 'turnoEnvio' | 'fechaEstimada' |
    'repartidor' | 'empaquetador' | 'montoCOD',
    string
>>;

const text = (value: unknown) => String(value ?? '').trim();
const onlyDigits = (value: unknown) => text(value).replace(/\D/g, '');

function PasswordField({ value, onChange, placeholder, invalid }: { value: string; onChange: (v: string) => void; placeholder?: string; invalid?: boolean }) {
    const [show, setShow] = useState(false);
    return (
        <div className="relative">
            <input
                type={show ? 'text' : 'password'}
                value={value}
                onChange={e => onChange(e.target.value)}
                placeholder={placeholder}
                className={`${inp} pr-10 ${invalid ? invalidInp : ''}`}
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

function Field({ label, children, error, required }: { label: string; children: React.ReactNode; error?: string; required?: boolean }) {
    return (
        <div>
            <label className={lbl}>{label}{required ? <span className="text-red-400"> *</span> : null}</label>
            {children}
            {error ? <p className="mt-1 text-[11px] font-semibold text-red-500">{error}</p> : null}
        </div>
    );
}

export function EnvioModal({ vm, onClose }: { vm: any; onClose: () => void }) {
    const { setEnvioActivo, envioData, setEnvioData } = vm;
    const [errors, setErrors] = useState<EnvioValidationErrors>({});
    const { alert } = useAlertStore();

    const set = (field: string, value: any) => {
        setErrors(prev => {
            if (!(field in prev)) return prev;
            const next = { ...prev };
            delete next[field as keyof EnvioValidationErrors];
            return next;
        });
        setEnvioData((prev: any) => ({ ...prev, [field]: value }));
    };

    const { repartidores, fetchRepartidores } = useRepartidoresStore();

    useEffect(() => { void fetchRepartidores(); }, [fetchRepartidores]);

    const selectedCourier = COURIERS.find(c => c.value === envioData.transportista);
    const esShalom = SHALOM_COURIERS.has(envioData.transportista);
    const esPropio = envioData.transportista === 'PROPIOS';
    const inputClass = (field: keyof EnvioValidationErrors) => `${inp} ${errors[field] ? invalidInp : ''}`;
    const esInformal = Boolean(vm.esInformal);
    const opcionesMontoCliente = esInformal
        ? [
            { value: 'ADELANTO', label: 'Adelanto' },
            { value: 'ITEM_ENVIO', label: 'Item envío' },
            { value: 'NEGOCIO', label: 'Negocio absorbe' },
        ]
        : [
            { value: 'ITEM_ENVIO', label: 'Item envío' },
            { value: 'NEGOCIO', label: 'Negocio absorbe' },
        ];
    const aplicacionMontoCliente =
        !esInformal && envioData.aplicacionMontoCliente === 'ADELANTO'
            ? 'ITEM_ENVIO'
            : (envioData.aplicacionMontoCliente ?? (esInformal ? 'ADELANTO' : 'ITEM_ENVIO'));

    const validate = () => {
        const next: EnvioValidationErrors = {};
        const celular = onlyDigits(envioData.celularDest);
        const paquetes = Number(envioData.nroPaquetes);
        const fecha = text(envioData.fechaEstimada);
        const fechaValida = fecha ? moment(fecha, 'YYYY-MM-DD', true).isValid() : false;

        if (!text(envioData.transportista)) next.transportista = 'Selecciona un courier o tipo de reparto.';
        if (!text(envioData.establecimiento)) next.establecimiento = 'Indica desde qué local saldrá el despacho.';
        if (!text(envioData.agenciaDestino)) {
            next.agenciaDestino = envioData.tipoEnvio === 'DOMICILIO'
                ? 'Ingresa la dirección de entrega.'
                : 'Ingresa la agencia de destino.';
        }
        if (!['AGENCIA', 'DOMICILIO'].includes(text(envioData.tipoEnvio))) next.tipoEnvio = 'Selecciona el tipo de envío.';
        if (celular.length !== 9 || !celular.startsWith('9')) next.celularDest = 'Ingresa un celular peruano válido de 9 dígitos.';
        if (!Number.isFinite(paquetes) || paquetes < 1) next.nroPaquetes = 'Debe ser 1 paquete como mínimo.';
        if (!['MANANA', 'TARDE', 'NOCHE'].includes(text(envioData.turnoEnvio))) next.turnoEnvio = 'Selecciona un turno.';
        if (!fechaValida) next.fechaEstimada = 'Selecciona una fecha válida de despacho.';
        if (!text(envioData.empaquetador)) next.empaquetador = 'Indica quién prepara el pedido.';

        if (esPropio && !text(envioData.repartidor)) next.repartidor = 'Selecciona o ingresa un repartidor.';
        if (envioData.transportista === 'SHALOM_COD' && Number(envioData.montoCOD) <= 0)
            next.montoCOD = 'Ingresa el monto a cobrar en destino (COD).';

        setErrors(next);
        return next;
    };

    const handleConfirmar = () => {
        const nextErrors = validate();
        if (Object.keys(nextErrors).length > 0) {
            alert('Completa los datos obligatorios del despacho antes de confirmar el envío.', 'warning');
            return;
        }
        setEnvioActivo(true);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50  " onClick={onClose} />
            <div className="relative w-full max-w-2xl bg-white dark:bg-[#111827] rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">

                {/* Header */}
                <div className="bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-5 flex-shrink-0">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center">
                                <Icon icon="solar:delivery-bold-duotone" className="text-white text-xl" />
                            </div>
                            <div>
                                <h2 className="text-white font-black text-lg leading-none">Coordinación de Envío</h2>
                                <p className="text-indigo-200 text-xs mt-0.5">Courier · Datos de despacho y entrega</p>
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
                                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${errors.transportista ? 'ring-2 ring-red-300/70' : ''} ${envioData.transportista === c.value
                                        ? 'bg-white text-indigo-700 shadow-lg shadow-indigo-900/20'
                                        : 'bg-white/15 text-white/80 hover:bg-white/25'
                                    }`}>
                                {c.label}
                            </button>
                        ))}
                    </div>
                    {errors.transportista ? <p className="mt-2 text-xs font-semibold text-red-100">{errors.transportista}</p> : null}
                </div>

                {/* Body — scrollable */}
                <div className="overflow-y-auto p-6 space-y-4 flex-1">

                    {/* SECCIÓN 1: Origen del despacho */}
                    <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                            <Icon icon="solar:shop-bold-duotone" className="text-indigo-400" />
                            Origen del despacho
                        </p>
                        <Field label="Establecimiento" required error={errors.establecimiento}>
                            <EstablecimientoCombobox
                                value={envioData.establecimiento}
                                onChange={v => set('establecimiento', v)}
                                invalid={Boolean(errors.establecimiento)}
                            />
                        </Field>
                    </div>

                    {/* SECCIÓN SHALOM — visible solo con Shalom PRO o COD */}
                    {esShalom && (
                        <div className="rounded-2xl border border-red-200 dark:border-red-900/50">
                            {/* Header */}
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

                            {/* Body */}
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
                                    <Field label="Código Shalom">
                                        <input
                                            type="text"
                                            value={envioData.claveOrden}
                                            onChange={e => set('claveOrden', e.target.value)}
                                            placeholder="37N7"
                                            autoComplete="off"
                                            className={inp}
                                        />
                                    </Field>
                                </div>

                                {/* N° Orden + Tipo paquetería */}
                                <div className="grid grid-cols-2 gap-3">
                                    <Field label="N° Orden courier">
                                        <input
                                            type="text"
                                            value={envioData.nroOrden}
                                            onChange={e => set('nroOrden', e.target.value)}
                                            placeholder="Ej: 78560415"
                                            className={inp}
                                        />
                                    </Field>
                                    <Field label="Tipo de paquetería">
                                        <input
                                            type="text"
                                            value={envioData.tipoMercaderia}
                                            onChange={e => set('tipoMercaderia', e.target.value)}
                                            placeholder="Ej: Caja, Sobre, Frágil..."
                                            className={inp}
                                        />
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
                                        <Field label="Monto a cobrar en destino S/" required error={errors.montoCOD}>
                                            <div className="relative">
                                                <span className="absolute inset-y-0 left-3 flex items-center text-xs font-bold text-slate-400 pointer-events-none">S/</span>
                                                <input
                                                    type="number"
                                                    min={0}
                                                    step={0.01}
                                                    value={envioData.montoCOD || ''}
                                                    onChange={e => set('montoCOD', Number(e.target.value) || 0)}
                                                    placeholder="0.00"
                                                    className={`${inputClass('montoCOD')} pl-9`}
                                                />
                                            </div>
                                        </Field>
                                    )}
                                </div>
                                {errors.fechaEstimada ? <p className="text-[11px] font-semibold text-red-500 -mt-1">{errors.fechaEstimada}</p> : null}
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
                       <Field label={envioData.tipoEnvio === 'AGENCIA' ? 'Agencia de destino' : 'Dirección de entrega'} required error={errors.agenciaDestino}>
                            {esShalom && envioData.tipoEnvio === 'AGENCIA' ? (
                                <ShalomAgenciaSelect
                                    value={envioData.agenciaDestino}
                                    onChange={v => set('agenciaDestino', v)}
                                    invalid={Boolean(errors.agenciaDestino)}
                                    placeholder="Buscar agencia Shalom por nombre, provincia o departamento..."
                                />
                            ) : (
                                <input type="text" value={envioData.agenciaDestino}
                                    onChange={e => set('agenciaDestino', e.target.value)}
                                    placeholder={envioData.tipoEnvio === 'AGENCIA' ? 'Ej: Olva Cusco Centro' : 'Dirección de entrega'}
                                    className={inputClass('agenciaDestino')} />
                            )}
                        </Field>
                       </div>
                        <div className="grid grid-cols-2 gap-3">

                            <Field label="Tipo de envío" required error={errors.tipoEnvio}>
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
                        <Field label="Celular destinatario" required error={errors.celularDest}>
                            <input type="text" value={envioData.celularDest}
                                onChange={e => set('celularDest', e.target.value.replace(/\D/g, '').slice(0, 9))}
                                placeholder="9XXXXXXXX" className={inputClass('celularDest')} />
                        </Field>
                        <Field label="N° Paquetes" required error={errors.nroPaquetes}>
                            <input type="number" min={1} value={envioData.nroPaquetes}
                                onChange={e => set('nroPaquetes', Number(e.target.value))} className={inputClass('nroPaquetes')} />
                        </Field>
                        <Field label="Turno" required error={errors.turnoEnvio}>
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
                                text="Fecha estimada"
                                name="fechaEstimada"
                                value={envioData.fechaEstimada ? moment(envioData.fechaEstimada).format('DD/MM/YYYY') : ''}
                                onChange={(date) => {
                                    if (!date) { set('fechaEstimada', ''); return; }
                                    const parsed = moment(date, 'DD/MM/YYYY');
                                    set('fechaEstimada', parsed.isValid() ? parsed.format('YYYY-MM-DD') : '');
                                }}
                            />
                            {errors.fechaEstimada ? <p className="-mt-2 text-[11px] font-semibold text-red-500 col-span-3">{errors.fechaEstimada}</p> : null}
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
                                <Field label="Repartidor" required error={errors.repartidor}>
                                    {repartidores.length > 0 ? (
                                        <select
                                            value={envioData.repartidorId ?? ''}
                                            onChange={e => {
                                                const selected = repartidores.find(r => String(r.id) === e.target.value);
                                                set('repartidorId', selected ? selected.id : null);
                                                set('repartidor', selected?.nombre ?? '');
                                            }}
                                            className={inputClass('repartidor')}
                                        >
                                            <option value="">Seleccionar repartidor</option>
                                            {repartidores.map(r => (
                                                <option key={r.id} value={r.id}>
                                                    {r.nombre}{r.celular ? ` · ${r.celular}` : ''}
                                                </option>
                                            ))}
                                        </select>
                                    ) : (
                                        <input type="text" value={envioData.repartidor}
                                            onChange={e => set('repartidor', e.target.value)}
                                            placeholder="Nombre del repartidor" className={inputClass('repartidor')} />
                                    )}
                                </Field>
                            )}
                            <Field label="Empaquetador" required error={errors.empaquetador}>
                                <input type="text" value={envioData.empaquetador}
                                    onChange={e => set('empaquetador', e.target.value)}
                                    placeholder="Nombre del empaquetador" className={inputClass('empaquetador')} />
                            </Field>
                        </div>
                    </div>

                    {/* Observaciones */}
                    <Field label="Observaciones">
                        <input type="text" value={envioData.observaciones}
                            onChange={e => set('observaciones', e.target.value)}
                            placeholder="Instrucciones especiales de embalaje o entrega..." className={inp} />
                    </Field>

                    {/* Monto cobrado al cliente */}
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
                                            {opcionesMontoCliente.map(opt => (
                                                <button key={opt.value} type="button"
                                                    onClick={() => {
                                                        set('aplicacionMontoCliente', opt.value);
                                                        set('pagarFlete', opt.value === 'NEGOCIO' ? 'NEGOCIO' : 'CLIENTE');
                                                    }}
                                                    className={`flex-1 py-2.5 rounded-xl border-2 text-xs font-bold transition-all ${aplicacionMontoCliente === opt.value
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
                        {Number(envioData.costoEnvio) > 0 && aplicacionMontoCliente === 'ITEM_ENVIO' && (
                            <p className="mt-2 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                <Icon icon="solar:bill-check-bold-duotone" className="text-base" />
                                S/ {Number(envioData.costoEnvio).toFixed(2)} se agregará como línea en el comprobante
                            </p>
                        )}
                        {Number(envioData.costoEnvio) > 0 && aplicacionMontoCliente === 'ADELANTO' && (
                            <p className="mt-2 text-[11px] font-semibold text-blue-600 dark:text-blue-300 flex items-center gap-1">
                                <Icon icon="solar:card-recive-bold-duotone" className="text-base" />
                                S/ {Number(envioData.costoEnvio).toFixed(2)} se registrará como adelanto y quedará saldo pendiente en la venta.
                            </p>
                        )}
                    </div>

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
                                {esShalom && envioData.nroOrden ? ` · Orden: ${envioData.nroOrden}` : ''}
                                {envioData.transportista === 'SHALOM_COD' && Number(envioData.montoCOD) > 0 ? ` · COD S/ ${Number(envioData.montoCOD).toFixed(2)}` : ''}
                                {Number(envioData.costoEnvio) > 0 ? ` · S/ ${Number(envioData.costoEnvio).toFixed(2)} (${aplicacionMontoCliente === 'ADELANTO' ? 'adelanto' : (aplicacionMontoCliente === 'ITEM_ENVIO' ? 'item de envío' : 'negocio')})` : ''}
                            </p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 pb-6 pt-3 flex gap-3 flex-shrink-0 border-t border-slate-100 dark:border-slate-800">
                    <button type="button" onClick={onClose}
                        className="flex-1 h-11 rounded-2xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                        Cancelar
                    </button>
                    <button type="button" onClick={handleConfirmar}
                        className="flex-[2] h-11 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-black text-sm shadow-lg shadow-indigo-500/25 hover:opacity-90 transition-opacity flex items-center justify-center gap-2">
                        <Icon icon="solar:check-circle-bold" className="text-lg" />
                        Confirmar envío
                    </button>
                </div>
            </div>
        </div>
    );
}
