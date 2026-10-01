import { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';
import moment from 'moment';
import { mensajeErrorOlva, olvaService } from '@/services/olva.service';

// Etapas del envío Olva (orden cronológico) para la línea de tiempo. El
// proveedor devuelve `status` en inglés; aquí se mapea a la etapa mostrada.
const OLVA_TIMELINE = [
    { key: 'REGISTERED', label: 'Registrado' },
    { key: 'IN_TRANSIT', label: 'En tránsito' },
    { key: 'OUT_FOR_DELIVERY', label: 'En reparto' },
    { key: 'READY_FOR_PICKUP', label: 'En agencia destino' },
    { key: 'DELIVERED', label: 'Entregado' },
];

// Estados terminales que NO son una entrega exitosa: se muestran aparte porque
// no encajan en la línea de tiempo de avance.
const ESTADOS_ADVERSOS: Record<string, string> = {
    RETURNED: 'Devuelto al remitente',
    REJECTED: 'Rechazado por el destinatario',
};

interface Props {
    /** N° de guía Olva. Acepta el sufijo de año ("2071856-26"). */
    trackingNumber: string;
    onClose: () => void;
    /** Si se pasa, muestra el botón "Marcar como entregado en el panel". */
    onEntregado?: () => Promise<void>;
    /** Clase extra para el contenedor fijo (p. ej. ajuste de posición). */
    wrapperClassName?: string;
}

/**
 * Modal de rastreo Olva. El backend cachea el snapshot ~10 min (read-through),
 * por lo que la carga inicial es instantánea; "Actualizar" fuerza consulta en
 * vivo. Componente compartido por DespachoView y PanelVentasView.
 */
export default function OlvaTrackingModal({ trackingNumber, onClose, onEntregado, wrapperClassName = '' }: Props) {
    const [trackData, setTrackData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [markingEntregado, setMarkingEntregado] = useState(false);
    const [retryKey, setRetryKey] = useState(0);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        let cancelled = false;
        // `retryKey > 0` fuerza refresh (consulta a Olva en vivo, sin caché).
        const force = retryKey > 0;
        const fetchTrack = async (): Promise<void> => {
            try {
                const data = await olvaService.track(trackingNumber, { refresh: force });
                if (cancelled) return;
                setTrackData(data);
                setError('');
            } catch (err) {
                if (cancelled) return;
                setError(mensajeErrorOlva(err, 'No se pudo obtener el tracking. Verifica el N° de guía.'));
            }
            if (!cancelled) { setLoading(false); setRefreshing(false); }
        };
        if (force) setRefreshing(true); else setLoading(true);
        setError('');
        void fetchTrack();
        return () => { cancelled = true; };
    }, [trackingNumber, retryKey]);

    const envio = trackData?.data ?? null;
    const eventos: any[] = Array.isArray(envio?.events) ? envio.events : [];
    const status: string | null = envio?.status ?? null;
    const entregado = status === 'DELIVERED' || Boolean(envio?.deliveredAt);
    const adverso = status ? ESTADOS_ADVERSOS[status] : null;
    // Índice de avance: hasta qué paso de la línea de tiempo llegó el paquete.
    const pasoActual = OLVA_TIMELINE.findIndex(s => s.key === status);
    const syncAt: string | null = trackData?.syncAt ?? null;
    const isStale: boolean = Boolean(trackData?.stale);
    const syncLabel = syncAt ? moment(syncAt).fromNow() : null;

    return (
        <div className={`fixed inset-0 z-[9999] flex items-center justify-center p-4 ${wrapperClassName}`}>
            <div className="absolute inset-0 bg-black/50" onClick={onClose} />
            <div className="relative w-full max-w-lg bg-white dark:bg-[#111827] rounded-3xl shadow-2xl overflow-hidden">
                <div className="bg-gradient-to-r from-slate-800 to-slate-900 px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center">
                            <Icon icon="solar:delivery-bold-duotone" className="text-white text-lg" />
                        </div>
                        <div>
                            <p className="text-white font-black text-sm">Tracking Olva</p>
                            <p className="text-slate-400 text-xs">Guía #{trackingNumber}</p>
                        </div>
                    </div>
                    <button type="button" onClick={onClose} className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-white">
                        <Icon icon="solar:close-circle-bold" />
                    </button>
                </div>

                <div className="p-6 max-h-[70vh] overflow-y-auto space-y-4">
                    {loading && (
                        <div className="flex items-center justify-center gap-2 py-8 text-slate-500">
                            <Icon icon="eos-icons:loading" className="animate-spin text-xl" />
                            <span className="text-sm">Consultando Olva...</span>
                        </div>
                    )}
                    {error && (
                        <div className="text-center py-6 space-y-3">
                            <p className="text-sm text-red-500">{error}</p>
                            <button
                                type="button"
                                onClick={() => setRetryKey(k => k + 1)}
                                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                            >
                                <Icon icon="solar:refresh-linear" />
                                Reintentar
                            </button>
                        </div>
                    )}

                    {envio && !loading && (
                        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4 text-xs space-y-1.5">
                            {envio.content && <p className="font-bold text-slate-700 dark:text-slate-200 text-sm">{envio.content}</p>}
                            <div className="flex gap-4 text-slate-500 dark:text-slate-400">
                                <span>De: <strong className="text-slate-700 dark:text-slate-200">{envio.origin?.agency ?? envio.origin?.department ?? '—'}</strong></span>
                                <span>→</span>
                                <span>A: <strong className="text-slate-700 dark:text-slate-200">{envio.destination?.agency ?? envio.destination?.department ?? '—'}</strong></span>
                            </div>
                            {envio.sender && (
                                <p className="text-slate-500 dark:text-slate-400">
                                    Remitente: <strong className="text-slate-700 dark:text-slate-200">{envio.sender}</strong>
                                </p>
                            )}
                            {envio.recipient?.name && (
                                <p className="text-slate-500 dark:text-slate-400">
                                    Destinatario: <strong className="text-slate-700 dark:text-slate-200">{envio.recipient.name}</strong>
                                </p>
                            )}
                            <div className="flex flex-wrap gap-3 text-slate-500 dark:text-slate-400">
                                {envio.weight && <span>Peso: <strong className="text-slate-700 dark:text-slate-200">{envio.weight}</strong></span>}
                                {envio.pieces && <span>Piezas: <strong className="text-slate-700 dark:text-slate-200">{envio.pieces}</strong></span>}
                                {envio.service && <span>Servicio: <strong className="text-slate-700 dark:text-slate-200">{envio.service}</strong></span>}
                            </div>
                            {envio.estimatedDelivery && (
                                <p className="text-slate-500 dark:text-slate-400">
                                    Entrega estimada: <strong className="text-slate-700 dark:text-slate-200">{envio.estimatedDelivery}</strong>
                                </p>
                            )}
                            {envio.statusDetail && (
                                <p className="text-slate-500 dark:text-slate-400">
                                    Detalle: <strong className="text-slate-700 dark:text-slate-200">{envio.statusDetail}</strong>
                                </p>
                            )}
                            {entregado && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 font-bold">
                                    <Icon icon="solar:check-circle-bold" width={12} /> Entregado
                                </span>
                            )}
                            {adverso && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 font-bold">
                                    <Icon icon="solar:danger-triangle-bold" width={12} /> {adverso}
                                </span>
                            )}
                        </div>
                    )}

                    {envio && !loading && (
                        <div className="space-y-0">
                            {OLVA_TIMELINE.map((step, i) => {
                                // Entregado marca toda la línea; en el resto se avanza hasta el paso actual.
                                const done = entregado || (pasoActual >= 0 && i <= pasoActual);
                                const isLast = i === OLVA_TIMELINE.length - 1;
                                return (
                                    <div key={step.key} className="flex gap-3">
                                        <div className="flex flex-col items-center">
                                            <div className={`w-3 h-3 rounded-full mt-0.5 flex-shrink-0 ${done ? 'bg-indigo-500' : 'bg-slate-200 dark:bg-slate-700'}`} />
                                            {!isLast && <div className={`w-0.5 flex-1 my-0.5 ${done ? 'bg-indigo-200 dark:bg-indigo-900' : 'bg-slate-100 dark:bg-slate-800'}`} style={{ minHeight: 20 }} />}
                                        </div>
                                        <div className="pb-3">
                                            <p className={`text-sm font-semibold ${done ? 'text-slate-800 dark:text-white' : 'text-slate-400 dark:text-slate-600'}`}>{step.label}</p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {eventos.length > 0 && !loading && (
                        <div className="space-y-2">
                            <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">Historial</p>
                            {/* Olva devuelve los eventos del más reciente al más antiguo: se listan tal cual. */}
                            {eventos.map((ev, i) => (
                                <div key={`${ev.date ?? i}-${i}`} className="bg-slate-50 dark:bg-slate-800/50 rounded-xl px-3 py-2">
                                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">{ev.detail || ev.status}</p>
                                    <p className="text-[11px] text-slate-400">
                                        {[ev.date ? moment(ev.date).format('DD/MM/YYYY') : '', ev.location].filter(Boolean).join(' · ')}
                                    </p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {!loading && (syncLabel || isStale) && (
                    <div className="flex items-center justify-between gap-2 px-6 pt-1 pb-1">
                        <span className={`text-[11px] ${isStale ? 'text-amber-500' : 'text-slate-400 dark:text-slate-500'}`}>
                            {isStale ? '⚠ Olva no respondió, mostrando último estado conocido' : `Actualizado ${syncLabel}`}
                        </span>
                        <button type="button" onClick={() => setRetryKey(k => k + 1)} disabled={refreshing}
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-500 hover:text-indigo-600 disabled:opacity-50">
                            <Icon icon="solar:refresh-linear" className={refreshing ? 'animate-spin' : ''} />
                            {refreshing ? 'Actualizando…' : 'Actualizar'}
                        </button>
                    </div>
                )}

                {onEntregado && entregado && (
                    <div className="px-6 pb-6 pt-2 border-t border-slate-100 dark:border-slate-800">
                        <button
                            type="button"
                            disabled={markingEntregado}
                            onClick={async () => {
                                setMarkingEntregado(true);
                                try { await onEntregado(); onClose(); }
                                finally { setMarkingEntregado(false); }
                            }}
                            className="w-full flex items-center justify-center gap-2 h-10 rounded-xl bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700 transition-colors disabled:opacity-60"
                        >
                            {markingEntregado
                                ? <Icon icon="eos-icons:loading" className="animate-spin" />
                                : <Icon icon="solar:check-circle-bold-duotone" />}
                            Marcar como entregado en el panel
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
