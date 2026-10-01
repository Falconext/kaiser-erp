import { useCallback, useEffect, useState } from 'react';
import { Icon } from '@iconify/react';
import { get, put, patch } from '@/utils/fetch';
import useAlertStore from '@/zustand/alert';
import { BRAND } from '@/lib/branding';

interface DespachoConfig {
    mensajeEnCamino: string;
    mensajeEntregado: string;
    notificarEnCamino: boolean;
    notificarEntregado: boolean;
}

const DEFAULTS: DespachoConfig = {
    mensajeEnCamino: 'Hola {{nombre}}, tu pedido {{pedido}} ya está en camino 🚚. Repartidor: {{repartidor}}.',
    mensajeEntregado: 'Hola {{nombre}}, tu pedido {{pedido}} fue entregado exitosamente ✅. ¡Gracias por preferir {{empresa}}!',
    notificarEnCamino: true,
    notificarEntregado: true,
};

const EJEMPLO = { nombre: 'Juan Pérez', pedido: 'B001-00000123', repartidor: 'Carlos Quispe', empresa: 'Mi Empresa' };

function interpolar(template: string) {
    return template
        .replace(/\{\{nombre\}\}/g, EJEMPLO.nombre)
        .replace(/\{\{pedido\}\}/g, EJEMPLO.pedido)
        .replace(/\{\{repartidor\}\}/g, EJEMPLO.repartidor)
        .replace(/\{\{empresa\}\}/g, EJEMPLO.empresa);
}

function Switch({ activo, onChange, color = 'emerald', disabled }: { activo: boolean; onChange: (v: boolean) => void; color?: 'emerald' | 'amber'; disabled?: boolean }) {
    const on = color === 'amber' ? 'bg-amber-500' : 'bg-emerald-500';
    return (
        <button
            type="button"
            disabled={disabled}
            onClick={() => onChange(!activo)}
            className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'} ${activo ? on : 'bg-slate-300 dark:bg-slate-600'}`}
        >
            <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${activo ? 'translate-x-5' : 'translate-x-0'}`} />
        </button>
    );
}

function Plantilla({ title, icon, color, estadoLabel, habilitado, mensaje, placeholder, onToggle, onMensaje, bloqueado }: {
    title: string; icon: string; color: string; estadoLabel: string; habilitado: boolean;
    mensaje: string; placeholder: string; onToggle: (v: boolean) => void; onMensaje: (v: string) => void;
    bloqueado?: boolean;
}) {
    return (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4">
            <div className="mb-3 flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                    <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${color}`}>
                        <Icon icon={icon} className="text-lg" />
                    </div>
                    <div>
                        <p className="text-sm font-bold text-slate-900 dark:text-white">{title}</p>
                        <p className="text-[11px] text-slate-500">Se envía al pasar a <span className="font-semibold">{estadoLabel}</span></p>
                    </div>
                </div>
                <Switch activo={habilitado} onChange={onToggle} disabled={bloqueado} />
            </div>

            {habilitado ? (
                <div className="space-y-2.5">
                    <textarea
                        value={mensaje}
                        onChange={e => onMensaje(e.target.value)}
                        placeholder={placeholder}
                        rows={3}
                        disabled={bloqueado}
                        className={`w-full resize-none rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3 py-2.5 text-sm text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 ${bloqueado ? 'cursor-not-allowed opacity-60' : ''}`}
                    />
                    <p className="text-[11px] text-slate-400">
                        Variables: <code className="rounded bg-slate-100 px-1 dark:bg-slate-800">{'{{nombre}}'}</code>{' '}
                        <code className="rounded bg-slate-100 px-1 dark:bg-slate-800">{'{{pedido}}'}</code>{' '}
                        <code className="rounded bg-slate-100 px-1 dark:bg-slate-800">{'{{repartidor}}'}</code>{' '}
                        <code className="rounded bg-slate-100 px-1 dark:bg-slate-800">{'{{empresa}}'}</code>
                    </p>
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-800/40 dark:bg-emerald-900/20">
                        <p className="mb-1 flex items-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                            <Icon icon="mdi:whatsapp" /> Vista previa
                        </p>
                        <p className="text-xs text-slate-700 dark:text-slate-300">{interpolar(mensaje || placeholder)}</p>
                    </div>
                </div>
            ) : (
                <p className="text-sm italic text-slate-400">Notificación desactivada para este estado.</p>
            )}
        </div>
    );
}

/**
 * Automatización de despacho dentro de Perfil → Configuración: rastreo automático
 * Shalom (interruptor maestro) + plantillas de WhatsApp por estado. Reemplaza a la
 * antigua página `/administrador/despacho/config`, a la que no se llegaba desde el menú.
 */
export default function DespachoAutomatizacionCard({ className, sinTitulo }: { className?: string; sinTitulo?: boolean }) {
    const { alert } = useAlertStore();
    const [config, setConfig] = useState<DespachoConfig>(DEFAULTS);
    const [autoTracking, setAutoTracking] = useState(false);
    // El plan habilita editar esta configuración (solo Corporativo). Lo decide el
    // backend, que además rechaza los cambios: acá solo se refleja.
    const [habilitado, setHabilitado] = useState(true);
    const [cargando, setCargando] = useState(true);
    const [guardando, setGuardando] = useState(false);

    const cargar = useCallback(async () => {
        try {
            const res = await get<DespachoConfig & { shalomAutoTrackingActivo?: boolean; habilitadoPorPlan?: boolean }>('/envio-despacho/config');
            if (res.data) {
                setConfig({
                    mensajeEnCamino: res.data.mensajeEnCamino ?? DEFAULTS.mensajeEnCamino,
                    mensajeEntregado: res.data.mensajeEntregado ?? DEFAULTS.mensajeEntregado,
                    notificarEnCamino: res.data.notificarEnCamino ?? true,
                    notificarEntregado: res.data.notificarEntregado ?? true,
                });
                setAutoTracking(res.data.shalomAutoTrackingActivo ?? false);
                setHabilitado(res.data.habilitadoPorPlan ?? false);
            }
        } catch {
            alert('Error al cargar la configuración de despacho', 'error');
        } finally {
            setCargando(false);
        }
    }, [alert]);

    useEffect(() => { cargar(); }, [cargar]);

    // El rastreo automático se guarda al instante (no espera al botón "Guardar"),
    // porque activa un comportamiento con efectos hacia el cliente (WhatsApp).
    const toggleAutoTracking = async (activo: boolean) => {
        setAutoTracking(activo); // optimista
        try {
            await patch('/envio-despacho/auto-tracking', { activo });
            alert(
                activo
                    ? 'Rastreo automático Shalom ACTIVADO: los estados se actualizarán solos. Si tienes plantillas de WhatsApp contratadas, también se avisará a tus clientes.'
                    : 'Rastreo automático Shalom desactivado.',
                activo ? 'warning' : 'success',
            );
        } catch {
            setAutoTracking(!activo); // revertir
            alert('No se pudo cambiar el rastreo automático', 'error');
        }
    };

    const guardar = async () => {
        setGuardando(true);
        try {
            await put('/envio-despacho/config', config);
            alert('Configuración de despacho guardada', 'success');
        } catch {
            alert('Error al guardar la configuración', 'error');
        } finally {
            setGuardando(false);
        }
    };

    const set = <K extends keyof DespachoConfig>(key: K, value: DespachoConfig[K]) =>
        setConfig(prev => ({ ...prev, [key]: value }));

    return (
        <div className={`lg:order-2 rounded-2xl border border-gray-200/60 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-[#111827] ${className ?? ''}`}>
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                {sinTitulo ? <div /> : (
                <h2 className="flex items-center gap-2 text-lg font-bold text-gray-900 dark:text-white">
                    <div className="rounded-lg bg-emerald-50 p-2 text-emerald-600 dark:bg-emerald-900/30">
                        <Icon icon="solar:delivery-bold-duotone" width="20" />
                    </div>
                    Automatización de despacho
                </h2>
                )}
                <button
                    type="button"
                    onClick={guardar}
                    disabled={guardando || cargando || !habilitado}
                    className="inline-flex h-10 items-center gap-2 rounded-xl bg-indigo-600 px-5 text-sm font-bold text-white transition-colors hover:bg-indigo-700 disabled:opacity-60"
                >
                    <Icon icon={guardando ? 'eos-icons:loading' : 'solar:floppy-disk-bold'} className="text-base" />
                    Guardar cambios
                </button>
            </div>

            {cargando ? (
                <div className="flex h-32 items-center justify-center">
                    <Icon icon="eos-icons:loading" className="text-3xl text-indigo-500" />
                </div>
            ) : (
                <div className="space-y-4">
                    {!habilitado && (
                        <div className="flex items-start gap-2 rounded-xl border border-violet-200 bg-violet-50 p-3 dark:border-violet-900/40 dark:bg-violet-900/15">
                            <Icon icon="solar:lock-keyhole-bold-duotone" className="mt-0.5 shrink-0 text-lg text-violet-500" />
                            <p className="text-xs leading-5 text-violet-800 dark:text-violet-200">
                                El rastreo automático todavía no está disponible. Puedes ver cómo funciona
                                y seguir cambiando los estados a mano en el panel.
                            </p>
                        </div>
                    )}

                    {/* Interruptor maestro: rastreo automático Shalom */}
                    <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 dark:border-amber-800/40 dark:bg-amber-900/15">
                        <div className="flex items-start justify-between gap-4">
                            <div className="flex items-start gap-3">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-600 dark:bg-amber-900/40">
                                    <Icon icon="solar:routing-2-bold-duotone" className="text-xl" />
                                </div>
                                <div>
                                    <div className="flex flex-wrap items-center gap-2">
                                        <p className="font-bold text-slate-900 dark:text-white">Rastreo automático Shalom</p>
                                        <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-bold text-violet-700 dark:bg-violet-900/40 dark:text-violet-300">Cuenta Shalom Pro</span>
                                    </div>
                                    <p className="mt-1 text-xs leading-5 text-slate-600 dark:text-slate-400">
                                        Cada 30 min consulta Shalom y <b>actualiza solo</b> el estado de tus despachos
                                        en tu panel (En camino / En agencia / Entregado). Por sí solo <b>no le envía
                                        nada a tus clientes</b>.
                                        <br />
                                        Si además tienes contratadas las plantillas de WhatsApp, cada cambio de estado
                                        le avisa al cliente automáticamente — actívalo cuando estés listo para eso.
                                    </p>
                                </div>
                            </div>
                            <Switch activo={autoTracking} onChange={toggleAutoTracking} color="amber" disabled={!habilitado} />
                        </div>
                        {!autoTracking && (
                            <p className="mt-3 text-xs italic text-slate-500">
                                Desactivado: los estados no se actualizan solos. Puedes seguir cambiándolos a mano
                                en el panel.
                            </p>
                        )}
                    </div>

                    {/* Plantillas de WhatsApp — se contratan aparte */}
                    <div>
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                            <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Avisos por WhatsApp al cliente</p>
                            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">WhatsApp</span>
                        </div>
                        {/* En falconext-mype aquí iba un enlace "Ver planes" a la
                            web comercial. Kaiser no vende planes: el WhatsApp es
                            el de la empresa y se configura en su propia pantalla. */}
                        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                Las plantillas tienen que estar aprobadas por Meta en el WhatsApp Business de la empresa.
                            </p>
                        </div>
                        <div className="space-y-3">
                            <Plantilla
                                title="Estado: En Camino"
                                icon="solar:delivery-bold-duotone"
                                color="bg-blue-50 text-blue-600 dark:bg-blue-900/30"
                                estadoLabel="EN CAMINO"
                                habilitado={config.notificarEnCamino}
                                mensaje={config.mensajeEnCamino}
                                placeholder={DEFAULTS.mensajeEnCamino}
                                onToggle={v => set('notificarEnCamino', v)}
                                onMensaje={v => set('mensajeEnCamino', v)}
                                bloqueado={!habilitado}
                            />
                            <Plantilla
                                title="Estado: Entregado"
                                icon="solar:check-circle-bold-duotone"
                                color="bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30"
                                estadoLabel="ENTREGADO"
                                habilitado={config.notificarEntregado}
                                mensaje={config.mensajeEntregado}
                                placeholder={DEFAULTS.mensajeEntregado}
                                onToggle={v => set('notificarEntregado', v)}
                                onMensaje={v => set('mensajeEntregado', v)}
                                bloqueado={!habilitado}
                            />
                        </div>
                    </div>

                    {/* Crear guías Shalom Pro — necesita la cuenta conectada */}
                    <div className="rounded-xl border border-red-100 bg-red-50/40 p-4 dark:border-red-900/30 dark:bg-red-900/10">
                        <div className="flex flex-wrap items-center gap-2">
                            <p className="font-bold text-slate-900 dark:text-white">Crear guías en Shalom Pro</p>
                            <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-bold text-violet-700 dark:bg-violet-900/40 dark:text-violet-300">Cuenta Shalom Pro</span>
                        </div>
                        <p className="mt-1 text-xs leading-5 text-slate-600 dark:text-slate-400">
                            Genera la guía de cada pedido desde el panel, sin entrar a Shalom: el N° de orden y la clave
                            se guardan solos en el despacho.
                            {habilitado
                                ? ' Conecta tu cuenta en la tarjeta de arriba.'
                                : ' Necesita conectar la cuenta Shalom Pro arriba.'}
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}
