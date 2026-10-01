import { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';
import moment from 'moment';
import apiClient from '@/utils/apiClient';
import useAlertStore from '@/zustand/alert';

// Etapas del envío Shalom (orden cronológico) para la línea de tiempo.
const SHALOM_TIMELINE = [
    { key: 'registrado', label: 'Registrado' },
    { key: 'origen',     label: 'En origen' },
    { key: 'transito',   label: 'En tránsito' },
    { key: 'destino',    label: 'En destino / Agencia' },
    { key: 'entregado',  label: 'Entregado' },
];

function openBlob(blob: Blob, filename: string, mimeType: string) {
    const url = URL.createObjectURL(new Blob([blob], { type: mimeType }));
    const a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    if (mimeType === 'application/pdf') a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

interface Props {
    orderNumber: string;
    orderCode: string;
    onClose: () => void;
    /** Si se pasa, muestra el botón "Marcar como entregado en el panel". */
    onEntregado?: () => Promise<void>;
    /** Clase extra para el contenedor fijo (p. ej. ajuste de posición). */
    wrapperClassName?: string;
}

/**
 * Modal de rastreo Shalom. El backend cachea el snapshot ~10 min (read-through),
 * por lo que la carga inicial es instantánea; "Actualizar" fuerza consulta en vivo.
 * Componente compartido por DespachoView y PanelVentasView.
 */
export default function ShalomTrackingModal({ orderNumber, orderCode, onClose, onEntregado, wrapperClassName = '' }: Props) {
    const [trackData, setTrackData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [blobLoading, setBlobLoading] = useState<'ticket' | 'label' | null>(null);
    const [markingEntregado, setMarkingEntregado] = useState(false);
    const [retryKey, setRetryKey] = useState(0);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        let cancelled = false;
        // `retryKey > 0` fuerza refresh (consulta a Shalom en vivo, sin caché).
        const force = retryKey > 0;
        const fetchTrack = async (): Promise<void> => {
            try {
                const res = await apiClient.post('/shalom/track', { orderNumber, orderCode, refresh: force });
                if (cancelled) return;
                setTrackData(res.data?.data ?? res.data);
                setError('');
            } catch (err: any) {
                if (cancelled) return;
                setError(err?.response?.data?.message || 'No se pudo obtener el tracking. Verifica el N° de orden.');
            }
            if (!cancelled) { setLoading(false); setRefreshing(false); }
        };
        if (force) setRefreshing(true); else setLoading(true);
        setError('');
        void fetchTrack();
        return () => { cancelled = true; };
    }, [orderNumber, orderCode, retryKey]);

    // Cuando responseType='blob', el error del backend también llega como Blob:
    // lo leemos para mostrar el motivo real (no un genérico).
    const blobErrorMsg = async (e: any, fallback: string): Promise<string> => {
        try {
            const blob = e?.response?.data;
            if (blob instanceof Blob) { const txt = await blob.text(); return JSON.parse(txt)?.message || fallback; }
        } catch { /* no-op */ }
        return e?.response?.data?.message || fallback;
    };

    const fetchDoc = async (kind: 'ticket' | 'label') => {
        setBlobLoading(kind);
        try {
            const oseId = trackData?.ose_id ?? trackData?.order?.ose_id;
            const qs = oseId ? `?oseId=${encodeURIComponent(oseId)}` : '';
            const res = await apiClient.get(`/shalom/${kind}/${orderNumber}/${orderCode}${qs}`, { responseType: 'blob' });
            // El documento llega como PDF (proveedor antiguo) o PNG (nuevo); se abre según su tipo real.
            const ct = (res.headers?.['content-type'] as string) || (res.data as Blob)?.type || 'application/pdf';
            const ext = ct.includes('png') ? 'png' : 'pdf';
            const name = kind === 'ticket' ? `voucher-${orderNumber}.${ext}` : `etiqueta-${orderNumber}.${ext}`;
            openBlob(res.data, name, ct);
        } catch (e) {
            useAlertStore.getState().alert(await blobErrorMsg(e, kind === 'ticket' ? 'No se pudo obtener el ticket' : 'No se pudo obtener la etiqueta'), 'error');
        } finally { setBlobLoading(null); }
    };

    const search = trackData?.search?.data ?? trackData?.search ?? null;
    const statuses = trackData?.statuses?.data ?? trackData?.statuses ?? null;
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
                            <p className="text-white font-black text-sm">Tracking Shalom</p>
                            <p className="text-slate-400 text-xs">Orden #{orderNumber} · clave {orderCode}</p>
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
                            <span className="text-sm">Consultando Shalom...</span>
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

                    {search && !loading && (
                        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4 text-xs space-y-1.5">
                            <p className="font-bold text-slate-700 dark:text-slate-200 text-sm">{search.contenido}</p>
                            <div className="flex gap-4 text-slate-500 dark:text-slate-400">
                                <span>De: <strong className="text-slate-700 dark:text-slate-200">{search.origen?.nombre}</strong></span>
                                <span>→</span>
                                <span>A: <strong className="text-slate-700 dark:text-slate-200">{search.destino?.nombre}</strong></span>
                            </div>
                            <p className="text-slate-500 dark:text-slate-400">
                                Destinatario: <strong className="text-slate-700 dark:text-slate-200">{search.destinatario?.nombre}</strong>
                            </p>
                            {search.entregado && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 font-bold">
                                    <Icon icon="solar:check-circle-bold" width={12} /> Entregado
                                </span>
                            )}
                        </div>
                    )}

                    {statuses && !loading && (
                        <div className="space-y-0">
                            {SHALOM_TIMELINE.map((step, i) => {
                                const ev = statuses[step.key];
                                const done = Boolean(ev?.fecha);
                                const isLast = i === SHALOM_TIMELINE.length - 1;
                                return (
                                    <div key={step.key} className="flex gap-3">
                                        <div className="flex flex-col items-center">
                                            <div className={`w-3 h-3 rounded-full mt-0.5 flex-shrink-0 ${done ? 'bg-indigo-500' : 'bg-slate-200 dark:bg-slate-700'}`} />
                                            {!isLast && <div className={`w-0.5 flex-1 my-0.5 ${done ? 'bg-indigo-200 dark:bg-indigo-900' : 'bg-slate-100 dark:bg-slate-800'}`} style={{ minHeight: 20 }} />}
                                        </div>
                                        <div className="pb-3">
                                            <p className={`text-sm font-semibold ${done ? 'text-slate-800 dark:text-white' : 'text-slate-400 dark:text-slate-600'}`}>{step.label}</p>
                                            {ev?.fecha && <p className="text-xs text-slate-400 dark:text-slate-500">{ev.fecha}</p>}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {!loading && (syncLabel || isStale) && (
                    <div className="flex items-center justify-between gap-2 px-6 pt-1 pb-1">
                        <span className={`text-[11px] ${isStale ? 'text-amber-500' : 'text-slate-400 dark:text-slate-500'}`}>
                            {isStale ? '⚠ Shalom no respondió, mostrando último estado conocido' : `Actualizado ${syncLabel}`}
                        </span>
                        <button type="button" onClick={() => setRetryKey(k => k + 1)} disabled={refreshing}
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-500 hover:text-indigo-600 disabled:opacity-50">
                            <Icon icon="solar:refresh-linear" className={refreshing ? 'animate-spin' : ''} />
                            {refreshing ? 'Actualizando…' : 'Actualizar'}
                        </button>
                    </div>
                )}

                <div className="flex flex-col gap-2 px-6 pb-6 pt-2 border-t border-slate-100 dark:border-slate-800">
                    {onEntregado && search?.entregado && (
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
                    )}
                    <div className="flex gap-3">
                        <button type="button" onClick={() => fetchDoc('ticket')} disabled={blobLoading === 'ticket'}
                            className="flex-1 flex items-center justify-center gap-2 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-sm font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors disabled:opacity-60">
                            {blobLoading === 'ticket' ? <Icon icon="eos-icons:loading" className="animate-spin" /> : <Icon icon="solar:bill-list-bold-duotone" />}
                            Comprobante
                        </button>
                        <button type="button" onClick={() => fetchDoc('label')} disabled={blobLoading === 'label'}
                            className="flex-1 flex items-center justify-center gap-2 h-10 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 transition-colors disabled:opacity-60">
                            {blobLoading === 'label' ? <Icon icon="eos-icons:loading" className="animate-spin" /> : <Icon icon="solar:tag-price-bold-duotone" />}
                            Rótulo
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
