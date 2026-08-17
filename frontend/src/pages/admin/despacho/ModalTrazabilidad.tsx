import { useEffect, useState } from 'react';
import { Icon } from '@iconify/react';
import moment from 'moment';
import apiClient from '@/utils/apiClient';

// ─── Types ───────────────────────────────────────────────────────────────────

interface HistorialEntry {
    estado: string;
    fecha: string;
    nota?: string | null;
    usuarioNombre?: string | null;
}

interface DespachoDetalle {
    id: number;
    estado: string;
    historial: HistorialEntry[];
    transportista?: string | null;
    tipoEnvio?: string | null;
    agenciaDestino?: string | null;
    celularDest?: string | null;
    codigoGuia?: string | null;
    nroPaquetes?: number | null;
    turnoEnvio?: string | null;
    fechaEstimada?: string | null;
    observaciones?: string | null;
    repartidor?: string | null;
    empaquetador?: string | null;
    establecimiento?: string | null;
    nroOrden?: string | null;
    creadoEn?: string;
}

interface Props {
    comprobanteId: number;
    referencia?: string;
    cliente?: string;
    onClose: () => void;
}

// ─── Config visual ────────────────────────────────────────────────────────────

const ESTADO_CONFIG: Record<string, { label: string; icon: string; dot: string; text: string; bg: string; border: string }> = {
    PREPARANDO:  { label: 'Preparando',  icon: 'solar:box-bold-duotone',           dot: 'bg-amber-400',   text: 'text-amber-700 dark:text-amber-300',   bg: 'bg-amber-50 dark:bg-amber-900/20',   border: 'border-amber-200 dark:border-amber-800/40'   },
    EN_CAMINO:   { label: 'En camino',   icon: 'solar:delivery-bold-duotone',      dot: 'bg-blue-500',    text: 'text-blue-700 dark:text-blue-300',     bg: 'bg-blue-50 dark:bg-blue-900/20',     border: 'border-blue-200 dark:border-blue-800/40'     },
    EN_DESTINO:  { label: 'En destino',  icon: 'solar:map-point-bold-duotone',     dot: 'bg-violet-500',  text: 'text-violet-700 dark:text-violet-300', bg: 'bg-violet-50 dark:bg-violet-900/20', border: 'border-violet-200 dark:border-violet-800/40' },
    ENTREGADO:   { label: 'Entregado',   icon: 'solar:check-circle-bold-duotone',  dot: 'bg-emerald-500', text: 'text-emerald-700 dark:text-emerald-300',bg: 'bg-emerald-50 dark:bg-emerald-900/20',border: 'border-emerald-200 dark:border-emerald-800/40'},
    DEVUELTO:    { label: 'Devuelto',    icon: 'solar:arrow-left-bold-duotone',    dot: 'bg-red-500',     text: 'text-red-700 dark:text-red-300',       bg: 'bg-red-50 dark:bg-red-900/20',       border: 'border-red-200 dark:border-red-800/40'       },
};

const COURIER_LABEL: Record<string, string> = {
    SHALOM_PRO: 'Shalom PRO', SHALOM_COD: 'Shalom COD', OLVA: 'Olva Courier',
    URBANO: 'Urbano Express', CRUZ_SUR: 'Cruz del Sur', PROPIOS: 'Reparto propio', OTRO: 'Otro',
};

const TURNO_LABEL: Record<string, string> = { MANANA: 'Mañana', TARDE: 'Tarde', NOCHE: 'Noche' };

const ORDEN_ESTADOS = ['PREPARANDO', 'EN_CAMINO', 'EN_DESTINO', 'ENTREGADO'];

function getEstadoCfg(estado: string) {
    return ESTADO_CONFIG[estado] ?? { label: estado, icon: 'solar:info-circle-bold-duotone', dot: 'bg-slate-400', text: 'text-slate-600', bg: 'bg-slate-50', border: 'border-slate-200' };
}

// ─── Component ───────────────────────────────────────────────────────────────

export function ModalTrazabilidad({ comprobanteId, referencia, cliente, onClose }: Props) {
    const [despacho, setDespacho] = useState<DespachoDetalle | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        apiClient.get<any>(`/envio-despacho/comprobante/${comprobanteId}`)
            .then(({ data }) => {
                const payload = data?.data ?? data;
                if (payload) setDespacho(payload);
            })
            .catch(() => {})
            .finally(() => setLoading(false));
    }, [comprobanteId]);

    const historial: HistorialEntry[] = Array.isArray(despacho?.historial) ? [...despacho.historial].reverse() : [];
    const cfg = getEstadoCfg(despacho?.estado ?? '');
    const estadoActualIdx = ORDEN_ESTADOS.indexOf(despacho?.estado ?? '');
    const estaDevuelto = despacho?.estado === 'DEVUELTO';

    return (
        <div className="fixed inset-0 z-[9999] top-[-30px] flex items-end sm:items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50  " onClick={onClose} />

            <div className="relative w-full max-w-lg bg-white dark:bg-[#111827] rounded-3xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">

                {/* ── Header ── */}
                <div className="px-6 pt-6 pb-4 flex-shrink-0 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${cfg.bg} border ${cfg.border} flex-shrink-0`}>
                                <Icon icon={cfg.icon} className={`text-2xl ${cfg.text}`} />
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Trazabilidad de Envío</p>
                                <h2 className="text-lg font-black text-slate-900 dark:text-white leading-tight">{referencia ?? `Comp. #${comprobanteId}`}</h2>
                                {cliente && <p className="text-sm text-slate-500 dark:text-slate-400 truncate">{cliente}</p>}
                            </div>
                        </div>
                        <button type="button" onClick={onClose}
                            className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors flex-shrink-0">
                            <Icon icon="solar:close-circle-bold" className="text-lg" />
                        </button>
                    </div>

                    {/* Estado actual badge */}
                    {despacho && (
                        <div className={`mt-4 flex items-center gap-2 px-4 py-2.5 rounded-2xl ${cfg.bg} border ${cfg.border}`}>
                            <div className={`w-2.5 h-2.5 rounded-full ${cfg.dot} flex-shrink-0 ${despacho.estado === 'EN_CAMINO' ? 'animate-pulse' : ''}`} />
                            <span className={`text-sm font-black ${cfg.text}`}>{cfg.label}</span>
                            {despacho.codigoGuia && (
                                <span className="ml-auto font-mono text-xs font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-lg">
                                    {despacho.codigoGuia}
                                </span>
                            )}
                        </div>
                    )}
                </div>

                {/* ── Body ── */}
                <div className="overflow-y-auto flex-1 p-6 space-y-6">

                    {loading && (
                        <div className="flex flex-col items-center py-12 gap-3 text-slate-400">
                            <Icon icon="eos-icons:loading" className="text-3xl animate-spin text-indigo-500" />
                            <p className="text-sm">Cargando trazabilidad...</p>
                        </div>
                    )}

                    {!loading && despacho && (
                        <>
                            {/* ── Progress bar (solo no-devuelto) ── */}
                            {!estaDevuelto && estadoActualIdx >= 0 && (
                                <div>
                                    <div className="flex items-center gap-0">
                                        {ORDEN_ESTADOS.map((e, idx) => {
                                            const eCfg = getEstadoCfg(e);
                                            const done = idx <= estadoActualIdx;
                                            const current = idx === estadoActualIdx;
                                            return (
                                                <div key={e} className="flex-1 flex items-center">
                                                    <div className="flex flex-col items-center gap-1 w-full">
                                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all ${done ? `${eCfg.dot} border-transparent` : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700'} ${current ? 'ring-4 ring-offset-2 ring-current/30 scale-110' : ''}`}>
                                                            <Icon icon={eCfg.icon} className={`text-base ${done ? 'text-white' : 'text-slate-400'}`} />
                                                        </div>
                                                        <span className={`text-[9px] font-bold text-center leading-tight ${done ? eCfg.text : 'text-slate-400'}`}>
                                                            {eCfg.label}
                                                        </span>
                                                    </div>
                                                    {idx < ORDEN_ESTADOS.length - 1 && (
                                                        <div className={`h-0.5 flex-1 mx-1 mb-5 rounded-full transition-all ${idx < estadoActualIdx ? 'bg-emerald-400' : 'bg-slate-200 dark:bg-slate-700'}`} />
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* ── Datos del envío ── */}
                            <div className="grid grid-cols-2 gap-3">
                                {despacho.transportista && (
                                    <DataChip icon="solar:delivery-bold-duotone" label="Courier" value={COURIER_LABEL[despacho.transportista] ?? despacho.transportista} />
                                )}
                                {despacho.tipoEnvio && (
                                    <DataChip icon="solar:map-point-bold-duotone" label="Tipo de envío" value={despacho.tipoEnvio === 'AGENCIA' ? 'Para agencia' : 'A domicilio'} />
                                )}
                                {despacho.agenciaDestino && (
                                    <DataChip icon="solar:buildings-2-bold-duotone" label="Destino" value={despacho.agenciaDestino} />
                                )}
                                {despacho.nroPaquetes && (
                                    <DataChip icon="solar:box-bold-duotone" label="Paquetes" value={String(despacho.nroPaquetes)} />
                                )}
                                {despacho.turnoEnvio && (
                                    <DataChip icon="solar:clock-circle-bold-duotone" label="Turno" value={TURNO_LABEL[despacho.turnoEnvio] ?? despacho.turnoEnvio} />
                                )}
                                {despacho.fechaEstimada && (
                                    <DataChip icon="solar:calendar-bold-duotone" label="Fecha estimada" value={moment(despacho.fechaEstimada).format('DD/MM/YYYY')} />
                                )}
                                {despacho.repartidor && (
                                    <DataChip icon="solar:user-bold-duotone" label="Repartidor" value={despacho.repartidor} />
                                )}
                                {despacho.empaquetador && (
                                    <DataChip icon="solar:user-check-rounded-bold-duotone" label="Empaquetador" value={despacho.empaquetador} />
                                )}
                                {despacho.nroOrden && (
                                    <DataChip icon="solar:hashtag-bold-duotone" label="N° Orden courier" value={despacho.nroOrden} mono />
                                )}
                                {despacho.establecimiento && (
                                    <DataChip icon="solar:shop-bold-duotone" label="Establecimiento" value={despacho.establecimiento} />
                                )}
                            </div>

                            {despacho.observaciones && (
                                <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800/30">
                                    <Icon icon="solar:notes-bold-duotone" className="text-amber-600 dark:text-amber-400 text-lg mt-0.5 flex-shrink-0" />
                                    <p className="text-xs text-amber-800 dark:text-amber-300 font-medium">{despacho.observaciones}</p>
                                </div>
                            )}

                            {/* ── Timeline historial ── */}
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                                    <Icon icon="solar:route-bold-duotone" className="text-indigo-400 text-sm" />
                                    Historial de estados
                                </p>

                                {historial.length === 0 ? (
                                    <p className="text-sm text-slate-400 text-center py-4">Sin historial registrado</p>
                                ) : (
                                    <div className="space-y-0">
                                        {historial.map((h, idx) => {
                                            const hCfg = getEstadoCfg(h.estado);
                                            const isFirst = idx === 0;
                                            const isLast = idx === historial.length - 1;
                                            return (
                                                <div key={idx} className="flex gap-3">
                                                    {/* Timeline line + dot */}
                                                    <div className="flex flex-col items-center">
                                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 border-2 transition-all ${isFirst ? `${hCfg.dot} border-transparent shadow-sm` : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700'}`}>
                                                            <Icon icon={hCfg.icon} className={`text-sm ${isFirst ? 'text-white' : 'text-slate-400'}`} />
                                                        </div>
                                                        {!isLast && <div className="w-px flex-1 min-h-[20px] mt-1 bg-slate-200 dark:bg-slate-700" />}
                                                    </div>

                                                    {/* Content */}
                                                    <div className={`flex-1 pb-4 ${!isFirst ? 'opacity-55' : ''}`}>
                                                        <div className="flex items-center justify-between gap-2">
                                                            <span className={`text-sm font-black ${isFirst ? hCfg.text : 'text-slate-600 dark:text-slate-400'}`}>
                                                                {hCfg.label}
                                                            </span>
                                                            <span className="text-[10px] text-slate-400 font-sans flex-shrink-0">
                                                                {moment(h.fecha).format('DD/MM HH:mm')}
                                                            </span>
                                                        </div>
                                                        {h.usuarioNombre && (
                                                            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1">
                                                                <Icon icon="solar:user-bold-duotone" className="text-xs flex-shrink-0" />
                                                                {h.usuarioNombre}
                                                            </p>
                                                        )}
                                                        {h.nota && (
                                                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 italic">{h.nota}</p>
                                                        )}
                                                        <p className="text-[10px] text-slate-400 font-sans mt-0.5">
                                                            {moment(h.fecha).fromNow()}
                                                        </p>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </>
                    )}

                    {!loading && !despacho && (
                        <div className="flex flex-col items-center py-12 gap-3 text-slate-400">
                            <Icon icon="solar:delivery-bold-duotone" className="text-4xl opacity-40" />
                            <p className="text-sm">No se encontró información de despacho</p>
                        </div>
                    )}
                </div>

                {/* ── Footer ── */}
                {despacho?.celularDest && (
                    <div className="px-6 pb-6 pt-3 flex-shrink-0 border-t border-slate-100 dark:border-slate-800">
                        <a
                            href={`https://wa.me/51${despacho.celularDest.replace(/\D/g, '')}?text=${encodeURIComponent(
                                `Hola, su pedido ${referencia ?? ''} está en estado: ${getEstadoCfg(despacho.estado).label}.${despacho.codigoGuia ? ` Guía: ${despacho.codigoGuia}.` : ''} Gracias.`
                            )}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-center gap-2 w-full h-11 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-black text-sm transition-colors shadow-sm"
                        >
                            <Icon icon="mdi:whatsapp" className="text-lg" />
                            Notificar al cliente por WhatsApp
                        </a>
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function DataChip({ icon, label, value, mono }: { icon: string; label: string; value: string; mono?: boolean }) {
    return (
        <div className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-transparent">
            <Icon icon={icon} className="text-slate-400 text-lg mt-0.5 flex-shrink-0" />
            <div className="min-w-0">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-0.5">{label}</p>
                <p className={`text-sm font-bold text-slate-700 dark:text-slate-200 truncate ${mono ? 'font-mono' : ''}`}>{value}</p>
            </div>
        </div>
    );
}
