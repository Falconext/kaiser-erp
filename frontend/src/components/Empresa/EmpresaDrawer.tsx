import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '@iconify/react';
import apiClient from '@/utils/apiClient';
import useAlertStore from '@/zustand/alert';

interface Empresa {
    id: number;
    ruc?: string;
    razonSocial?: string;
    nombreComercial?: string;
    direccion?: string;
    fechaActivacion?: string;
    plan?: { nombre: string; costo?: number | string; descripcion?: string };
    fechaExpiracion?: string;
    estado?: string;
    brand?: string;
    slugTienda?: string;
    usuarios?: Array<{ nombre?: string | null; email?: string | null; celular?: string | null }>;
}

interface Nota {
    id: number;
    contenido: string;
    autorNombre: string;
    autorEmail: string;
    notificado: boolean;
    creadoEn: string;
}

interface LogEntry {
    id: number;
    accion: string;
    detalle?: string;
    autorNombre: string;
    autorEmail: string;
    creadoEn: string;
}

const LOG_ICONS: Record<string, { icon: string; color: string; label: string }> = {
    CREADA: { icon: 'solar:add-circle-bold-duotone', color: '#10B981', label: 'Empresa creada' },
    ACTIVADA: { icon: 'solar:check-circle-bold-duotone', color: '#10B981', label: 'Activada' },
    DESACTIVADA: { icon: 'solar:close-circle-bold-duotone', color: '#EF4444', label: 'Desactivada' },
    EDITADA: { icon: 'solar:pen-bold-duotone', color: '#6366F1', label: 'Editada' },
    PLAN_CAMBIADO: { icon: 'solar:star-bold-duotone', color: '#F59E0B', label: 'Plan cambiado' },
};

const DAY_MS = 86400000;

const normalizeDateOnly = (value?: string | null): string => {
    if (!value) return '';
    const iso = value.slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? '' : parsed.toISOString().slice(0, 10);
};

const getDaysUntilDate = (value?: string | null): number | null => {
    const iso = normalizeDateOnly(value);
    if (!iso) return null;
    const [year, month, day] = iso.split('-').map(Number);
    const today = new Date();
    const todayUtc = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
    const targetUtc = Date.UTC(year, month - 1, day);
    return Math.ceil((targetUtc - todayUtc) / DAY_MS);
};

const relativeTime = (dateStr: string) => {
    const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
    if (diff < 60) return 'hace un momento';
    if (diff < 3600) return `hace ${Math.floor(diff / 60)} min`;
    if (diff < 86400) return `hace ${Math.floor(diff / 3600)} h`;
    if (diff < 2592000) return `hace ${Math.floor(diff / 86400)} días`;
    return new Date(dateStr).toLocaleDateString('es-PE');
};

export default function EmpresaDrawer({
    empresa,
    onClose,
}: {
    empresa: Empresa | null;
    onClose: () => void;
}) {
    const { alert } = useAlertStore();
    const [tab, setTab] = useState<'notas' | 'historial' | 'comunicar'>('notas');
    const [notas, setNotas] = useState<Nota[]>([]);
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [loadingNotas, setLoadingNotas] = useState(false);
    const [loadingLog, setLoadingLog] = useState(false);
    const [nuevaNota, setNuevaNota] = useState('');
    const [notificar, setNotificar] = useState(false);
    const [guardando, setGuardando] = useState(false);
    const [emailTipo, setEmailTipo] = useState<'BIENVENIDA' | 'AGRADECIMIENTO' | 'RECORDATORIO' | 'PROMOCION' | null>(null);
    const [emailMensaje, setEmailMensaje] = useState('');
    const [emailTituloPromo, setEmailTituloPromo] = useState('');
    const [pagoConcepto, setPagoConcepto] = useState('');
    const [pagoMonto, setPagoMonto] = useState('');
    const [pagoReferencia, setPagoReferencia] = useState('');
    const [incluirInstalacion, setIncluirInstalacion] = useState(false);
    const [costoInstalacion, setCostoInstalacion] = useState('');
    const [enviandoEmail, setEnviandoEmail] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        if (!empresa) return;
        cargarNotas();
        cargarLog();
    }, [empresa?.id]);

    const cargarNotas = async () => {
        if (!empresa) return;
        setLoadingNotas(true);
        try {
            const { data } = await apiClient.get(`/empresa/${empresa.id}/notas`);
            setNotas((data?.data ?? data) || []);
        } catch { } finally { setLoadingNotas(false); }
    };

    const cargarLog = async () => {
        if (!empresa) return;
        setLoadingLog(true);
        try {
            const { data } = await apiClient.get(`/empresa/${empresa.id}/log`);
            setLogs((data?.data ?? data) || []);
        } catch { } finally { setLoadingLog(false); }
    };

    const guardarNota = async () => {
        if (!nuevaNota.trim() || !empresa) return;
        setGuardando(true);
        try {
            await apiClient.post(`/empresa/${empresa.id}/notas`, { contenido: nuevaNota.trim(), notificar });
            setNuevaNota('');
            setNotificar(false);
            await cargarNotas();
            alert(notificar ? 'Nota guardada y cliente notificado' : 'Nota guardada', 'success');
        } catch { alert('Error al guardar', 'error'); }
        finally { setGuardando(false); }
    };

    const eliminarNota = async (notaId: number) => {
        if (!empresa || !confirm('¿Eliminar esta nota?')) return;
        try {
            await apiClient.delete(`/empresa/${empresa.id}/notas/${notaId}`);
            setNotas((prev) => prev.filter((n) => n.id !== notaId));
        } catch { alert('Error al eliminar', 'error'); }
    };

    const enviarEmail = async () => {
        if (!emailTipo || !empresa) return;
        if (emailTipo === 'PROMOCION' && !emailMensaje.trim()) {
            alert('Escribe el mensaje de la promoción', 'error');
            return;
        }
        if (emailTipo === 'BIENVENIDA' && incluirInstalacion && !costoInstalacion.trim()) {
            alert('Ingresa el coste de instalación', 'error');
            return;
        }
        setEnviandoEmail(true);
        try {
            await apiClient.post(`/empresa/${empresa.id}/enviar-email`, {
                tipo: emailTipo,
                mensajeCustom: emailMensaje.trim() || undefined,
                tituloPromo: emailTituloPromo.trim() || undefined,
                pagoConcepto: pagoConcepto.trim() || undefined,
                pagoMonto: pagoMonto.trim() || undefined,
                pagoReferencia: pagoReferencia.trim() || undefined,
                costoInstalacion: (emailTipo === 'BIENVENIDA' && incluirInstalacion) ? costoInstalacion.trim() : undefined,
            });
            alert('Email enviado correctamente', 'success');
            setEmailMensaje('');
            setEmailTituloPromo('');
            setPagoConcepto('');
            setPagoMonto('');
            setPagoReferencia('');
            setIncluirInstalacion(false);
            setCostoInstalacion('');
            setEmailTipo(null);
        } catch { alert('Error al enviar el email', 'error'); }
        finally { setEnviandoEmail(false); }
    };

    const diasRestantes = getDaysUntilDate(empresa?.fechaExpiracion);
    const adminPrincipal = empresa?.usuarios?.[0];

    const expColor = diasRestantes === null ? '' :
        diasRestantes <= 0 ? 'text-red-600' :
        diasRestantes <= 7 ? 'text-red-500' :
        diasRestantes <= 30 ? 'text-amber-600' : 'text-emerald-600';

    if (!empresa) return null;

    return createPortal(
        <>
            {/* Overlay */}
            <div
                className="fixed inset-0 z-[9999999] bg-black/40"
                onClick={onClose}
            />

            {/* Drawer */}
            <div className="fixed right-0 top-0 bottom-0 z-[9999999] w-full max-w-[420px] bg-white dark:bg-[#0F1219] shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">

                {/* Header */}
                <div className="flex items-start justify-between px-5 py-4 border-b border-gray-100 dark:border-slate-800 flex-shrink-0">
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${empresa.estado === 'ACTIVO' ? 'bg-emerald-500' : 'bg-red-400'}`} />
                            <h2 className="text-base font-bold text-gray-900 dark:text-white truncate">
                                {empresa.nombreComercial || empresa.razonSocial}
                            </h2>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400 mt-1 flex-wrap">
                            <span className="font-mono">{empresa.ruc}</span>
                            {empresa.plan?.nombre && (
                                <span className="px-2 py-0.5 rounded-full bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-400 font-semibold">
                                    {empresa.plan.nombre}
                                </span>
                            )}
                            {diasRestantes !== null && (
                                <span className={`font-semibold ${expColor}`}>
                                    {diasRestantes <= 0 ? 'Vencido' : `Vence en ${diasRestantes}d`}
                                </span>
                            )}
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-400 ml-2 flex-shrink-0"
                    >
                        <Icon icon="solar:close-bold" width={20} />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex gap-1 px-4 pt-3 pb-0 flex-shrink-0">
                    {([
                        { key: 'notas', label: 'Notas', icon: 'solar:notes-bold-duotone', count: notas.length },
                        { key: 'comunicar', label: 'Email', icon: 'solar:letter-bold-duotone', count: 0 },
                        { key: 'historial', label: 'Historial', icon: 'solar:clock-circle-bold-duotone', count: logs.length },
                    ] as const).map((t) => (
                        <button
                            key={t.key}
                            onClick={() => setTab(t.key)}
                            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${tab === t.key
                                ? 'bg-violet-600 text-white shadow-md shadow-violet-500/25'
                                : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800'
                                }`}
                        >
                            <Icon icon={t.icon} width={14} />
                            {t.label}
                            {t.count > 0 && (
                                <span className={`ml-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${tab === t.key ? 'bg-white/20 text-white' : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-400'}`}>
                                    {t.count}
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto">
                    {tab === 'notas' && (
                        <div className="flex flex-col h-full">
                            {/* Add nota */}
                            <div className="px-4 pt-3 pb-2 border-b border-gray-50 dark:border-slate-800/60">
                                <textarea
                                    ref={textareaRef}
                                    value={nuevaNota}
                                    onChange={(e) => setNuevaNota(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) guardarNota();
                                    }}
                                    placeholder="Escribe una nota interna... (⌘ + Enter para guardar)"
                                    rows={3}
                                    className="w-full px-3 py-2.5 text-sm rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/60 text-gray-900 dark:text-white resize-none focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 placeholder:text-gray-400 transition-all"
                                />
                                <div className="flex items-center justify-between mt-2">
                                    <button
                                        type="button"
                                        onClick={() => setNotificar((v) => !v)}
                                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                                            notificar
                                                ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-400'
                                                : 'bg-gray-50 dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-500 dark:text-gray-400 hover:border-blue-300'
                                        }`}
                                    >
                                        <Icon icon={notificar ? 'solar:bell-bold-duotone' : 'solar:bell-linear'} width={14} />
                                        {notificar ? 'Notificar (WSP + Email)' : 'Solo nota interna'}
                                    </button>
                                    <button
                                        onClick={guardarNota}
                                        disabled={!nuevaNota.trim() || guardando}
                                        className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold btn-accent rounded-lg disabled:opacity-40 transition-colors"
                                    >
                                        {guardando && <Icon icon="eos-icons:loading" width={13} />}
                                        <Icon icon="solar:notes-bold" width={13} />
                                        Guardar nota
                                    </button>
                                </div>
                            </div>

                            {/* Lista notas */}
                            <div className="flex-1 px-4 py-3 space-y-3">
                                {loadingNotas ? (
                                    <div className="flex justify-center pt-8">
                                        <Icon icon="eos-icons:loading" className="w-6 h-6 text-violet-500" />
                                    </div>
                                ) : notas.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                                        <Icon icon="solar:notes-bold-duotone" width={40} className="opacity-30 mb-2" />
                                        <p className="text-sm font-medium">Sin notas aún</p>
                                        <p className="text-xs mt-1 text-center">Agrega recordatorios, pendientes o acuerdos con el cliente</p>
                                    </div>
                                ) : notas.map((nota) => (
                                    <div key={nota.id} className="group relative bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-800/30 rounded-xl p-3.5">
                                        <p className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed whitespace-pre-wrap">{nota.contenido}</p>
                                        <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-amber-100 dark:border-amber-800/20">
                                            <div className="flex items-center gap-1.5">
                                                <div className="w-5 h-5 rounded-full bg-amber-200 dark:bg-amber-800 flex items-center justify-center">
                                                    <span className="text-[9px] font-bold text-amber-700 dark:text-amber-300">
                                                        {nota.autorNombre.charAt(0).toUpperCase()}
                                                    </span>
                                                </div>
                                                <span className="text-[11px] text-gray-500 dark:text-gray-400 font-medium">{nota.autorNombre}</span>
                                                <span className="text-[11px] text-gray-400">·</span>
                                                <span className="text-[11px] text-gray-400">{relativeTime(nota.creadoEn)}</span>
                                                {nota.notificado && (
                                                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-[10px] font-semibold">
                                                        <Icon icon="solar:bell-bold" width={10} />
                                                        Notificado
                                                    </span>
                                                )}
                                            </div>
                                            <button
                                                onClick={() => eliminarNota(nota.id)}
                                                className="opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-400 transition-all"
                                            >
                                                <Icon icon="solar:trash-bin-trash-bold" width={13} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {tab === 'comunicar' && (
                        <div className="px-4 py-4 flex flex-col gap-4">
                            <div className="rounded-2xl border border-slate-200 dark:border-transparent bg-slate-50 dark:bg-slate-900/40 p-3">
                                <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                                    Selecciona una plantilla profesional. Se enviará al administrador activo
                                    {adminPrincipal?.email ? <>: <strong className="text-gray-800 dark:text-gray-200">{adminPrincipal.email}</strong></> : ' de esta empresa'}.
                                </p>
                            </div>

                            {/* Template cards */}
                            <div className="grid grid-cols-2 gap-2">
                                {([
                                    { tipo: 'BIENVENIDA', label: 'Bienvenida', icon: 'solar:hand-shake-bold-duotone', color: 'emerald', desc: 'Accesos, plan y primeros pasos' },
                                    { tipo: 'AGRADECIMIENTO', label: 'Agradecimiento', icon: 'solar:check-circle-bold-duotone', color: 'violet', desc: 'Constancia de pago o renovación' },
                                    { tipo: 'RECORDATORIO', label: 'Recordatorio', icon: 'solar:bell-bing-bold-duotone', color: 'amber', desc: 'Suscripción por vencer' },
                                    { tipo: 'PROMOCION', label: 'Promoción', icon: 'solar:tag-price-bold-duotone', color: 'pink', desc: 'Oferta o novedad especial' },
                                ] as const).map((t) => {
                                    const selected = emailTipo === t.tipo;
                                    const colors: Record<string, { wrap: string; icon: string; chip: string }> = {
                                        emerald: { wrap: selected ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 ring-2 ring-emerald-300/50' : 'border-gray-200 dark:border-slate-700 hover:border-emerald-300', icon: 'text-emerald-600 dark:text-emerald-400', chip: 'bg-emerald-100 dark:bg-emerald-900/30' },
                                        violet: { wrap: selected ? 'border-violet-400 bg-violet-50 dark:bg-violet-900/20 ring-2 ring-violet-300/50' : 'border-gray-200 dark:border-slate-700 hover:border-violet-300', icon: 'text-violet-600 dark:text-violet-400', chip: 'bg-violet-100 dark:bg-violet-900/30' },
                                        amber: { wrap: selected ? 'border-amber-400 bg-amber-50 dark:bg-amber-900/20 ring-2 ring-amber-300/50' : 'border-gray-200 dark:border-slate-700 hover:border-amber-300', icon: 'text-amber-600 dark:text-amber-400', chip: 'bg-amber-100 dark:bg-amber-900/30' },
                                        pink: { wrap: selected ? 'border-pink-400 bg-pink-50 dark:bg-pink-900/20 ring-2 ring-pink-300/50' : 'border-gray-200 dark:border-slate-700 hover:border-pink-300', icon: 'text-pink-600 dark:text-pink-400', chip: 'bg-pink-100 dark:bg-pink-900/30' },
                                    };
                                    const c = colors[t.color];
                                    return (
                                        <button
                                            key={t.tipo}
                                            onClick={() => {
                                                setEmailTipo(t.tipo);
                                                setEmailMensaje('');
                                                setEmailTituloPromo('');
                                                setPagoConcepto('');
                                                setPagoMonto('');
                                                setPagoReferencia('');
                                                setIncluirInstalacion(false);
                                                setCostoInstalacion('');
                                            }}
                                            className={`flex flex-col items-start p-3 rounded-xl border transition-all text-left ${c.wrap}`}
                                        >
                                            <span className={`w-9 h-9 rounded-lg flex items-center justify-center mb-2 ${c.chip}`}>
                                                <Icon icon={t.icon} width={20} className={c.icon} />
                                            </span>
                                            <span className="text-xs font-bold text-gray-800 dark:text-gray-100">{t.label}</span>
                                            <span className="text-[11px] text-gray-400 mt-0.5 leading-tight">{t.desc}</span>
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Dynamic fields */}
                            {emailTipo && (
                                <div className="flex flex-col gap-3">
                                    {emailTipo === 'BIENVENIDA' && (
                                        <>
                                            <div className="rounded-2xl border border-emerald-100 dark:border-emerald-900/50 bg-emerald-50 dark:bg-emerald-900/20 p-3">
                                                <div className="flex items-start gap-2">
                                                    <Icon icon="solar:login-3-bold-duotone" className="text-emerald-600 mt-0.5" width={18} />
                                                    <div>
                                                        <p className="text-xs font-bold text-emerald-800 dark:text-emerald-300">Se incluirá automáticamente</p>
                                                        <p className="text-[11px] leading-relaxed text-emerald-700/80 dark:text-emerald-300/80 mt-1">
                                                            URL de acceso, usuario administrador, plan, vigencia, seguridad de contraseña y primeros pasos.
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="rounded-2xl border border-gray-200 dark:border-transparent bg-gray-50 dark:bg-slate-800/40 p-3 space-y-3">
                                                <button
                                                    type="button"
                                                    onClick={() => setIncluirInstalacion((v) => !v)}
                                                    className="flex items-center justify-between w-full"
                                                >
                                                    <span className="flex items-center gap-2">
                                                        <Icon icon="solar:settings-bold-duotone" className="text-emerald-600" width={18} />
                                                        <span className="text-xs font-bold text-gray-700 dark:text-gray-200">Incluir coste de instalación</span>
                                                    </span>
                                                    <span className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${incluirInstalacion ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-slate-600'}`}>
                                                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${incluirInstalacion ? 'translate-x-4' : 'translate-x-0.5'}`} />
                                                    </span>
                                                </button>
                                                {incluirInstalacion && (
                                                    <div>
                                                        <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1 block">Coste de instalación *</label>
                                                        <input
                                                            type="text"
                                                            value={costoInstalacion}
                                                            onChange={(e) => setCostoInstalacion(e.target.value)}
                                                            placeholder="Ej: S/ 150.00"
                                                            className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 transition-all"
                                                        />
                                                        <p className="text-[11px] text-gray-400 mt-1">Se mostrará en el correo de bienvenida como un concepto de pago.</p>
                                                    </div>
                                                )}
                                            </div>
                                        </>
                                    )}

                                    {emailTipo === 'PROMOCION' && (
                                        <div>
                                            <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1 block">Título de la promoción *</label>
                                            <input
                                                type="text"
                                                value={emailTituloPromo}
                                                onChange={(e) => setEmailTituloPromo(e.target.value)}
                                                placeholder="Ej: 50% de descuento en renovación"
                                                className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/60 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-pink-500/30 focus:border-pink-400 transition-all"
                                            />
                                        </div>
                                    )}

                                    {emailTipo === 'AGRADECIMIENTO' && (
                                        <div className="rounded-2xl border border-violet-100 dark:border-violet-900/50 bg-violet-50/70 dark:bg-violet-900/10 p-3 space-y-3">
                                            <div className="flex items-start gap-2">
                                                <Icon icon="solar:receipt-bold-duotone" className="text-violet-600 mt-0.5" width={18} />
                                                <div>
                                                    <p className="text-xs font-bold text-violet-800 dark:text-violet-300">Detalle de pago opcional</p>
                                                    <p className="text-[11px] leading-relaxed text-violet-700/80 dark:text-violet-300/80 mt-1">
                                                        Úsalo para pago de instalación, renovación de plan o constancia administrativa.
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-1 gap-2">
                                                <input
                                                    type="text"
                                                    value={pagoConcepto}
                                                    onChange={(e) => setPagoConcepto(e.target.value)}
                                                    placeholder="Concepto: Instalación, renovación mensual, plan anual..."
                                                    className="w-full px-3 py-2 text-xs rounded-xl border border-violet-100 dark:border-slate-700 bg-white dark:bg-slate-800/60 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all"
                                                />
                                                <div className="grid grid-cols-2 gap-2">
                                                    <input
                                                        type="text"
                                                        value={pagoMonto}
                                                        onChange={(e) => setPagoMonto(e.target.value)}
                                                        placeholder="Monto: S/ 99.90"
                                                        className="w-full px-3 py-2 text-xs rounded-xl border border-violet-100 dark:border-slate-700 bg-white dark:bg-slate-800/60 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all"
                                                    />
                                                    <input
                                                        type="text"
                                                        value={pagoReferencia}
                                                        onChange={(e) => setPagoReferencia(e.target.value)}
                                                        placeholder="Ref./comprobante"
                                                        className="w-full px-3 py-2 text-xs rounded-xl border border-violet-100 dark:border-slate-700 bg-white dark:bg-slate-800/60 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    <div>
                                        <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1 block">
                                            {emailTipo === 'PROMOCION' ? 'Descripción de la oferta *' : 'Mensaje adicional (opcional)'}
                                        </label>
                                        <textarea
                                            value={emailMensaje}
                                            onChange={(e) => setEmailMensaje(e.target.value)}
                                            rows={4}
                                            placeholder={
                                                emailTipo === 'BIENVENIDA' ? 'Ej: Tu implementación ya quedó lista. Estamos atentos para acompañarte...' :
                                                emailTipo === 'AGRADECIMIENTO' ? 'Ej: Gracias por renovar. Adjuntamos la referencia registrada y quedamos atentos...' :
                                                emailTipo === 'RECORDATORIO' ? 'Ej: Puedes realizar tu pago mediante transferencia a...' :
                                                'Describe la oferta o promoción especial...'
                                            }
                                            className="w-full px-3 py-2.5 text-sm rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/60 text-gray-900 dark:text-white resize-none focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 placeholder:text-gray-400 transition-all"
                                        />
                                    </div>

                                    <div className="flex items-center gap-2 p-3 rounded-xl bg-blue-50 dark:bg-blue-900/15 border border-blue-100 dark:border-blue-800/30">
                                        <Icon icon="solar:info-circle-bold-duotone" className="text-blue-500 flex-shrink-0" width={16} />
                                        <p className="text-xs text-blue-700 dark:text-blue-400">
                                            El email se enviará con diseño profesional, datos del plan y contexto comercial de <strong>{empresa.nombreComercial || empresa.razonSocial}</strong>.
                                        </p>
                                    </div>

                                    <button
                                        onClick={enviarEmail}
                                        disabled={enviandoEmail || (emailTipo === 'PROMOCION' && !emailMensaje.trim())}
                                        className="flex items-center justify-center gap-2 w-full py-2.5 text-sm font-bold btn-accent rounded-xl disabled:opacity-40 transition-colors"
                                    >
                                        {enviandoEmail
                                            ? <><Icon icon="eos-icons:loading" width={16} /> Enviando...</>
                                            : <><Icon icon="solar:letter-bold" width={16} /> Enviar email</>
                                        }
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {tab === 'historial' && (
                        <div className="px-4 py-4">
                            {loadingLog ? (
                                <div className="flex justify-center pt-8">
                                    <Icon icon="eos-icons:loading" className="w-6 h-6 text-violet-500" />
                                </div>
                            ) : logs.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                                    <Icon icon="solar:clock-circle-bold-duotone" width={40} className="opacity-30 mb-2" />
                                    <p className="text-sm font-medium">Sin historial aún</p>
                                    <p className="text-xs mt-1">Los cambios aparecerán aquí automáticamente</p>
                                </div>
                            ) : (
                                <div className="relative">
                                    {/* Timeline line */}
                                    <div className="absolute left-[18px] top-2 bottom-2 w-0.5 bg-gray-100 dark:bg-slate-800" />
                                    <div className="space-y-4">
                                        {logs.map((log) => {
                                            const info = LOG_ICONS[log.accion] ?? { icon: 'solar:info-circle-bold-duotone', color: '#6B7280', label: log.accion };
                                            return (
                                                <div key={log.id} className="flex gap-3 relative">
                                                    <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 z-10" style={{ backgroundColor: info.color + '15' }}>
                                                        <Icon icon={info.icon} width={18} style={{ color: info.color }} />
                                                    </div>
                                                    <div className="flex-1 pt-1">
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <span className="text-sm font-semibold text-gray-800 dark:text-white">{info.label}</span>
                                                            <span className="text-[11px] text-gray-400">{relativeTime(log.creadoEn)}</span>
                                                        </div>
                                                        {log.detalle && (
                                                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{log.detalle}</p>
                                                        )}
                                                        <p className="text-[11px] text-gray-400 mt-0.5">por {log.autorNombre}</p>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </>,
        document.body
    );
}
