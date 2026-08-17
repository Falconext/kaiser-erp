import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '@iconify/react';
import { get, put } from '@/utils/fetch';
import useAlertStore from '@/zustand/alert';

const ACCENT = 'var(--accent, #7551FF)';

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

interface SectionProps {
    title: string;
    icon: string;
    color: string;
    estadoLabel: string;
    habilitado: boolean;
    mensaje: string;
    placeholder: string;
    onToggle: (v: boolean) => void;
    onMensaje: (v: string) => void;
}

function SeccionTemplate({ title, icon, color, estadoLabel, habilitado, mensaje, placeholder, onToggle, onMensaje }: SectionProps) {
    const preview = interpolar(mensaje || placeholder);

    return (
        <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-[0_2px_20px_rgba(15,23,42,0.05)] dark:shadow-none border border-slate-100 dark:border-slate-700 p-6">
            <div className="flex items-start justify-between gap-4 mb-5">
                <div className="flex items-center gap-3">
                    <div className={`h-11 w-11 flex items-center justify-center rounded-2xl ${color}`}>
                        <Icon icon={icon} className="text-xl" />
                    </div>
                    <div>
                        <p className="font-bold text-slate-800 dark:text-white">{title}</p>
                        <p className="text-xs text-slate-400 dark:text-gray-400 mt-0.5">
                            Se envía cuando el estado cambia a{' '}
                            <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400">{estadoLabel}</span>
                        </p>
                    </div>
                </div>
                {/* Toggle */}
                <button
                    type="button"
                    onClick={() => onToggle(!habilitado)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${habilitado ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'}`}
                >
                    <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${habilitado ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
            </div>

            {habilitado && (
                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wide text-slate-400 dark:text-gray-400 mb-1.5">Mensaje</label>
                        <textarea
                            value={mensaje}
                            onChange={e => onMensaje(e.target.value)}
                            placeholder={placeholder}
                            rows={3}
                            className="w-full rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2.5 text-sm text-slate-700 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-gray-500 outline-none focus:border-[var(--accent)] transition-colors resize-none"
                        />
                        <p className="mt-2 text-[11px] text-slate-400 dark:text-gray-400 flex flex-wrap items-center gap-1">
                            <span className="font-semibold text-slate-500 dark:text-gray-400">Variables:</span>
                            <code className="bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-1.5 py-0.5 rounded-md font-mono">{'{{nombre}}'}</code>
                            <code className="bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-1.5 py-0.5 rounded-md font-mono">{'{{pedido}}'}</code>
                            <code className="bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-1.5 py-0.5 rounded-md font-mono">{'{{repartidor}}'}</code>
                            <code className="bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-1.5 py-0.5 rounded-md font-mono">{'{{empresa}}'}</code>
                        </p>
                    </div>

                    <div className="rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-900/40 p-3.5">
                        <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-600 dark:text-emerald-400 mb-1.5 flex items-center gap-1">
                            <Icon icon="mdi:whatsapp" className="text-sm" />
                            Vista previa
                        </p>
                        <p className="text-xs text-slate-700 dark:text-slate-200 leading-relaxed">{preview}</p>
                    </div>
                </div>
            )}

            {!habilitado && (
                <p className="text-sm text-slate-400 dark:text-gray-400 italic">Notificación desactivada para este estado.</p>
            )}
        </div>
    );
}

export default function DespachoConfigPage() {
    const navigate = useNavigate();
    const { alert } = useAlertStore();
    const [config, setConfig] = useState<DespachoConfig>(DEFAULTS);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const cargar = useCallback(async () => {
        setLoading(true);
        try {
            const res = await get<DespachoConfig>('/envio-despacho/config');
            if (res.data) {
                setConfig({
                    mensajeEnCamino: res.data.mensajeEnCamino ?? DEFAULTS.mensajeEnCamino,
                    mensajeEntregado: res.data.mensajeEntregado ?? DEFAULTS.mensajeEntregado,
                    notificarEnCamino: res.data.notificarEnCamino ?? true,
                    notificarEntregado: res.data.notificarEntregado ?? true,
                });
            }
        } catch {
            alert('Error al cargar configuración', 'error');
        } finally {
            setLoading(false);
        }
    }, [alert]);

    useEffect(() => { cargar(); }, [cargar]);

    const guardar = async () => {
        setSaving(true);
        try {
            await put('/envio-despacho/config', config);
            alert('Configuración guardada', 'success');
        } catch {
            alert('Error al guardar configuración', 'error');
        } finally {
            setSaving(false);
        }
    };

    const set = <K extends keyof DespachoConfig>(key: K, value: DespachoConfig[K]) =>
        setConfig(prev => ({ ...prev, [key]: value }));

    return (
        <div className="min-h-screen -m-5 p-5 bg-[#F7F8FB] dark:bg-[#0A0D14] font-jakarta">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm text-slate-400 dark:text-gray-400 mb-5">
                <Icon icon="solar:home-smile-linear" className="text-base" />
                <span>Panel</span>
                <Icon icon="solar:alt-arrow-right-linear" className="text-xs" />
                <span>Ventas</span>
                <Icon icon="solar:alt-arrow-right-linear" className="text-xs" />
                <span className="font-semibold" style={{ color: ACCENT }}>Notificaciones de Despacho</span>
            </div>

            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-5">
                <div className="flex items-center gap-3 min-w-0">
                    <button
                        type="button"
                        onClick={() => navigate('/administrador/ventas')}
                        className="h-9 w-9 grid place-items-center rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-400 dark:text-gray-400 hover:text-slate-600 dark:hover:text-gray-300 transition-colors shrink-0"
                    >
                        <Icon icon="solar:alt-arrow-left-linear" />
                    </button>
                    <div className="h-11 w-11 flex items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400 shrink-0">
                        <Icon icon="mdi:whatsapp" className="text-xl" />
                    </div>
                    <div className="min-w-0">
                        <h1 className="text-[22px] font-extrabold text-slate-800 dark:text-white tracking-tight truncate">Notificaciones de Despacho</h1>
                        <p className="text-sm text-slate-400 dark:text-gray-400 mt-0.5">Mensajes automáticos vía WhatsApp al cliente</p>
                    </div>
                </div>
                <button
                    type="button"
                    onClick={guardar}
                    disabled={saving || loading}
                    className="h-11 px-5 rounded-2xl text-white text-sm font-bold flex items-center gap-1.5 shadow-lg shadow-violet-500/30 hover:brightness-105 disabled:opacity-60 transition-all shrink-0"
                    style={{ background: ACCENT }}
                >
                    {saving
                        ? <Icon icon="eos-icons:loading" className="text-base" />
                        : <Icon icon="solar:floppy-disk-bold" className="text-base" />
                    }
                    Guardar cambios
                </button>
            </div>

            {/* Info banner */}
            <div className="mb-5 rounded-2xl border border-blue-100 dark:border-blue-900/40 bg-blue-50 dark:bg-blue-900/20 px-4 py-3.5 flex items-start gap-3">
                <div className="h-8 w-8 flex items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 shrink-0">
                    <Icon icon="solar:info-circle-bold-duotone" className="text-lg" />
                </div>
                <p className="text-sm text-blue-700 dark:text-blue-300 leading-relaxed">
                    Estas notificaciones se envían automáticamente cuando cambias el estado de un despacho.
                    Requiere tener WhatsApp activo en tu empresa.
                </p>
            </div>

            {/* Secciones */}
            {loading ? (
                <div className="space-y-4">
                    {Array.from({ length: 2 }).map((_, i) => (
                        <div key={i} className="bg-white dark:bg-slate-800 rounded-3xl shadow-[0_2px_20px_rgba(15,23,42,0.05)] dark:shadow-none border border-slate-100 dark:border-slate-700 p-6">
                            <div className="flex items-center gap-3 mb-5">
                                <div className="h-11 w-11 rounded-2xl bg-slate-100 dark:bg-slate-700 animate-pulse" />
                                <div className="flex-1 space-y-2">
                                    <div className="h-4 w-40 rounded-lg bg-slate-100 dark:bg-slate-700 animate-pulse" />
                                    <div className="h-3 w-64 rounded-lg bg-slate-100 dark:bg-slate-700 animate-pulse" />
                                </div>
                            </div>
                            <div className="h-20 rounded-2xl bg-slate-100 dark:bg-slate-700 animate-pulse" />
                        </div>
                    ))}
                </div>
            ) : (
                <div className="space-y-4">
                    <SeccionTemplate
                        title="Estado: En Camino"
                        icon="solar:delivery-bold-duotone"
                        color="bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400"
                        estadoLabel="EN CAMINO"
                        habilitado={config.notificarEnCamino}
                        mensaje={config.mensajeEnCamino}
                        placeholder={DEFAULTS.mensajeEnCamino}
                        onToggle={v => set('notificarEnCamino', v)}
                        onMensaje={v => set('mensajeEnCamino', v)}
                    />
                    <SeccionTemplate
                        title="Estado: Entregado"
                        icon="solar:check-circle-bold-duotone"
                        color="bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400"
                        estadoLabel="ENTREGADO"
                        habilitado={config.notificarEntregado}
                        mensaje={config.mensajeEntregado}
                        placeholder={DEFAULTS.mensajeEntregado}
                        onToggle={v => set('notificarEntregado', v)}
                        onMensaje={v => set('mensajeEntregado', v)}
                    />
                </div>
            )}
        </div>
    );
}
