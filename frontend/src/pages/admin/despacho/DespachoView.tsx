import { useState, useEffect, useCallback, useMemo } from 'react';
import { Icon } from '@iconify/react';
import moment from 'moment';
import apiClient from '@/utils/apiClient';
import useAlertStore from '@/zustand/alert';
import DataTable from '@/components/Datatable';
import { Calendar } from '@/components/Date';
import { useLocation, useNavigate } from 'react-router-dom';
import { EditarDespachoModal } from './EditarDespachoModal';
import { ModalTrazabilidad } from './ModalTrazabilidad';
import { useRepartidoresStore } from '@/zustand/repartidores';
import { mapDetalleToInvoiceProduct } from '@/features/admin/facturacion/utils/comprobanteProductMapper';

const ACCENT = 'var(--accent, #7551FF)';

const KPI_CHIP: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400',
    amber: 'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400',
    indigo: 'bg-violet-50 text-violet-600 dark:bg-violet-900/20 dark:text-violet-400',
    orange: 'bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400',
    emerald: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400',
    red: 'bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400',
};

const SHALOM_COURIERS = new Set(['SHALOM_PRO', 'SHALOM_COD']);

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

function ShalomTrackingModal({ orderNumber, orderCode, onClose }: { orderNumber: string; orderCode: string; onClose: () => void }) {
    const [trackData, setTrackData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [blobLoading, setBlobLoading] = useState<'ticket' | 'label' | null>(null);
    const [retryKey, setRetryKey] = useState(0);

    useEffect(() => {
        let cancelled = false;
        const fetchTrack = async (): Promise<void> => {
            try {
                const res = await apiClient.post('/shalom/track', { orderNumber, orderCode });
                if (cancelled) return;
                setTrackData(res.data?.data ?? res.data);
                setError('');
            } catch (err: any) {
                if (cancelled) return;
                setError(err?.response?.data?.message || 'No se pudo obtener el tracking. Verifica el N° de orden.');
            }
            if (!cancelled) setLoading(false);
        };
        setLoading(true);
        setError('');
        void fetchTrack();
        return () => { cancelled = true; };
    }, [orderNumber, orderCode, retryKey]);

    const blobErrorMsg = async (e: any, fallback: string): Promise<string> => {
        try {
            const blob = e?.response?.data;
            if (blob instanceof Blob) { const txt = await blob.text(); return JSON.parse(txt)?.message || fallback; }
        } catch { /* no-op */ }
        return e?.response?.data?.message || fallback;
    };

    const openTicket = async () => {
        setBlobLoading('ticket');
        try {
            const oseId = trackData?.ose_id ?? trackData?.order?.ose_id;
            const qs = oseId ? `?oseId=${encodeURIComponent(oseId)}` : '';
            const res = await apiClient.get(`/shalom/ticket/${orderNumber}/${orderCode}${qs}`, { responseType: 'blob' });
            openBlob(res.data, `voucher-${orderNumber}.pdf`, 'application/pdf');
        } catch (e) { useAlertStore.getState().alert(await blobErrorMsg(e, 'No se pudo obtener el ticket'), 'error'); }
        finally { setBlobLoading(null); }
    };

    const openLabel = async () => {
        setBlobLoading('label');
        try {
            const oseId = trackData?.ose_id ?? trackData?.order?.ose_id;
            const qs = oseId ? `?oseId=${encodeURIComponent(oseId)}` : '';
            const res = await apiClient.get(`/shalom/label/${orderNumber}/${orderCode}${qs}`, { responseType: 'blob' });
            openBlob(res.data, `etiqueta-${orderNumber}.pdf`, 'application/pdf');
        } catch (e) { useAlertStore.getState().alert(await blobErrorMsg(e, 'No se pudo obtener la etiqueta'), 'error'); }
        finally { setBlobLoading(null); }
    };

    const search = trackData?.search?.data ?? trackData?.search ?? null;
    const statuses = trackData?.statuses?.data ?? trackData?.statuses ?? null;

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50  " onClick={onClose} />
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

                <div className="flex gap-3 px-6 pb-6 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <button type="button" onClick={openTicket} disabled={blobLoading === 'ticket'}
                        className="flex-1 flex items-center justify-center gap-2 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-sm font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors disabled:opacity-60">
                        {blobLoading === 'ticket' ? <Icon icon="eos-icons:loading" className="animate-spin" /> : <Icon icon="solar:bill-list-bold-duotone" />}
                        Comprobante
                    </button>
                    <button type="button" onClick={openLabel} disabled={blobLoading === 'label'}
                        className="flex-1 flex items-center justify-center gap-2 h-10 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 transition-colors disabled:opacity-60">
                        {blobLoading === 'label' ? <Icon icon="eos-icons:loading" className="animate-spin" /> : <Icon icon="solar:tag-price-bold-duotone" />}
                        Rótulo
                    </button>
                </div>
            </div>
        </div>
    );
}

const ESTADOS_WA_NOTIFICADOS = new Set(['EN_CAMINO', 'EN_AGENCIA', 'ENTREGADO']);

const WA_CONFIG_DEFAULTS = {
    mensajeEnCamino: 'Hola {{nombre}}, tu pedido {{pedido}} ya está en camino 🚚. Repartidor: {{repartidor}}.',
    mensajeEntregado: 'Hola {{nombre}}, tu pedido {{pedido}} fue entregado exitosamente ✅. ¡Gracias por tu preferencia!',
};

function buildWaMessage(item: DespachoItem, config: typeof WA_CONFIG_DEFAULTS): string {
    const interpolar = (tpl: string) =>
        tpl
            .replace(/\{\{nombre\}\}/g, item.cliente || 'Cliente')
            .replace(/\{\{pedido\}\}/g, item.referencia || '')
            .replace(/\{\{repartidor\}\}/g, item.repartidor || 'nuestro repartidor')
            .replace(/\{\{empresa\}\}/g, 'nuestra empresa');

    switch (item.estado) {
        case 'PREPARANDO':
        case 'POR_COORDINAR':
            return `Hola ${item.cliente}, estamos preparando tu pedido ${item.referencia} para el envío. Pronto te avisamos cuando esté en camino. 📦`;
        case 'EN_CAMINO':
        case 'EN_REPARTO':
        case 'ENVIADO':
            return interpolar(config.mensajeEnCamino);
        case 'EN_AGENCIA':
            return `Hola ${item.cliente}, tu pedido ${item.referencia} llegó a la agencia 📦. Para retirarlo necesitamos confirmar el pago restante. Te avisamos cuando esté listo. Gracias.`;
        case 'EN_DESTINO':
            return `Hola ${item.cliente}, tu pedido ${item.referencia} está llegando a su destino. ¡Por favor estate atento! 🚚`;
        case 'ENTREGADO':
        case 'ENTREGADO_COMPLETADO':
            return interpolar(config.mensajeEntregado);
        case 'DEVUELTO':
        case 'INCIDENCIA':
            return `Hola ${item.cliente}, hubo un inconveniente con tu pedido ${item.referencia}. Por favor contáctanos para coordinar. Disculpa las molestias. 🙏`;
        default:
            return `Hola ${item.cliente}, tu pedido ${item.referencia} está siendo procesado. Gracias.`;
    }
}

const ESTADO_COLOR: Record<string, string> = {
    PREPARANDO: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-900/50',
    EN_CAMINO: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-900/50',
    EN_DESTINO: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-900/20 dark:text-indigo-300 dark:border-indigo-900/50',
    EN_AGENCIA: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-300 dark:border-orange-900/50',
    ENTREGADO: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-900/50',
    DEVUELTO: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-900/50',
    SIN_ASIGNAR: 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
    POR_COORDINAR: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-900/50',
    ENVIADO: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-900/50',
    EN_REPARTO: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-900/20 dark:text-indigo-300 dark:border-indigo-900/50',
    INCIDENCIA: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-900/50',
    NO_APLICA: 'bg-slate-50 text-slate-400 border-slate-100 dark:bg-slate-800/50 dark:text-slate-500 dark:border-slate-800',
};

const ESTADOS_DESPACHO = [
    { value: 'PREPARANDO', label: 'Preparando' },
    { value: 'EN_CAMINO', label: 'En camino' },
    { value: 'EN_AGENCIA', label: 'En agencia' },
    { value: 'EN_DESTINO', label: 'En destino' },
    { value: 'ENTREGADO', label: 'Entregado' },
    { value: 'DEVUELTO', label: 'Devuelto' },
];

const DESPACHO_TO_PEDIDO: Record<string, { estadoEntrega: string; estadoEnvio: string }> = {
    PREPARANDO: { estadoEntrega: 'CONFIRMADO', estadoEnvio: 'POR_COORDINAR' },
    EN_CAMINO: { estadoEntrega: 'EN_TRANSITO', estadoEnvio: 'EN_REPARTO' },
    EN_AGENCIA: { estadoEntrega: 'EN_AGENCIA', estadoEnvio: 'ENVIADO' },
    EN_DESTINO: { estadoEntrega: 'EN_TRANSITO', estadoEnvio: 'EN_REPARTO' },
    ENTREGADO: { estadoEntrega: 'ENTREGADO_COMPLETADO', estadoEnvio: 'ENTREGADO' },
    DEVUELTO: { estadoEntrega: 'PENDIENTE', estadoEnvio: 'INCIDENCIA' },
};

const toDespachoEstado = (estado: string) => {
    if (ESTADOS_DESPACHO.some(e => e.value === estado)) return estado;
    if (['POR_COORDINAR', 'SIN_ASIGNAR', 'NO_APLICA'].includes(estado)) return 'PREPARANDO';
    if (['ENVIADO', 'EN_REPARTO'].includes(estado)) return 'EN_CAMINO';
    if (['EN_AGENCIA'].includes(estado)) return 'EN_AGENCIA';
    if (['ENTREGADO_COMPLETADO'].includes(estado)) return 'ENTREGADO';
    if (['INCIDENCIA'].includes(estado)) return 'DEVUELTO';
    return 'PREPARANDO';
};

const COURIER_LABEL: Record<string, string> = {
    SHALOM_PRO: 'Shalom PRO',
    SHALOM_COD: 'Shalom COD',
    OLVA: 'Olva Courier',
    URBANO: 'Urbano Express',
    CRUZ_SUR: 'Cruz del Sur',
    PROPIOS: 'Reparto propio',
    RECOJO_TIENDA: 'Recojo tienda',
    SIN_AGENCIA: 'Sin agencia',
    OTRO: 'Otro',
};

const COURIER_COLOR: Record<string, string> = {
    SHALOM_PRO: 'bg-slate-900 text-white',
    SHALOM_COD: 'bg-red-600 text-white',
    OLVA: 'bg-emerald-600 text-white',
    URBANO: 'bg-orange-500 text-white',
    CRUZ_SUR: 'bg-blue-700 text-white',
    PROPIOS: 'bg-fuchsia-600 text-white',
    RECOJO_TIENDA: 'bg-blue-600 text-white',
    SIN_AGENCIA: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
    OTRO: 'bg-slate-400 text-white',
};

const normalizeCourier = (value: string | null | undefined) => {
    if (!value || value === '—') return 'PROPIOS';
    if (COURIER_LABEL[value]) return value;
    const label = value.toUpperCase();
    if (label.includes('SHALOM') && label.includes('COD')) return 'SHALOM_COD';
    if (label.includes('SHALOM')) return 'SHALOM_PRO';
    if (label.includes('OLVA')) return 'OLVA';
    if (label.includes('URBANO')) return 'URBANO';
    if (label.includes('CRUZ')) return 'CRUZ_SUR';
    if (label.includes('RECOJO')) return 'RECOJO_TIENDA';
    if (label.includes('PROPIO')) return 'PROPIOS';
    if (label.includes('SIN')) return 'SIN_AGENCIA';
    return 'OTRO';
};

interface DespachoItem {
    tipo: 'COMPROBANTE' | 'PEDIDO_TIENDA';
    id: number;
    comprobanteId?: number;
    comprobanteTipoDoc?: string | null;
    pedidoId?: number;
    referencia: string;
    cliente: string;
    telefono: string;
    vendedor: string;
    total: number;
    montoPagado?: number;
    saldoPendiente?: number;
    courier: string;
    tipoEnvio: string;
    agenciaDestino: string;
    celularDest: string;
    nroPaquetes: number;
    turnoEnvio: string;
    codigoGuia: string;
    nroOrden?: string;
    claveOrden?: string;
    estado: string;
    creadoEn: string;
    repartidorId?: number | null;
    repartidor?: string;
    estadoEntrega?: string;
    items?: Array<{
        productoId?: number | null;
        cantidad: number;
        precioUnit?: number;
        producto?: { id?: number; codigo?: string | null; descripcion?: string | null } | null;
    }>;
}

interface RepartidorStat {
    repartidorId: number | null;
    nombre: string;
    preparando: number;
    enCamino: number;
    entregado: number;
    total: number;
}

const HEADER_COLUMNS = ['Tipo', 'Referencia', 'Cliente', 'Vendedor', 'Courier', 'Agencia destino', 'Celular', 'Paquetes', 'Guía', 'Total', 'Estado', 'Acciones'];

interface HistorialPedidoEntry {
    id: number;
    estadoAnterior: string | null;
    estadoNuevo: string;
    creadoEn: string;
    notas?: string | null;
    usuario?: { nombre?: string | null } | null;
}

interface EditarPedidoTiendaDespachoModalProps {
    item: DespachoItem;
    onClose: () => void;
    onSuccess: () => void;
}

function EditarPedidoTiendaDespachoModal({ item, onClose, onSuccess }: EditarPedidoTiendaDespachoModalProps) {
    const { repartidores, fetchRepartidores, loading: loadingRepartidores } = useRepartidoresStore();
    const { alert } = useAlertStore();
    const [saving, setSaving] = useState(false);
    const [confirmandoPago, setConfirmandoPago] = useState(false);
    const [montoPagadoInput, setMontoPagadoInput] = useState(String(item.montoPagado ?? 0));
    const [form, setForm] = useState({
        agenciaEnvio: normalizeCourier(item.courier),
        clienteDireccion: item.agenciaDestino && item.agenciaDestino !== '—' ? item.agenciaDestino : '',
        clienteTelefono: item.celularDest || item.telefono || '',
        numeroTracking: item.codigoGuia || '',
        repartidorId: item.repartidorId ? String(item.repartidorId) : '',
        notasInternas: '',
    });

    useEffect(() => { fetchRepartidores(); }, [fetchRepartidores]);

    const updateField = (field: keyof typeof form, value: string) =>
        setForm(prev => ({ ...prev, [field]: value }));

    const total = item.total ?? 0;
    const saldoActual = item.saldoPendiente ?? 0;
    const tieneSaldo = saldoActual > 0.01;
    const saldoCalcInput = Math.max(total - Number(montoPagadoInput || 0), 0);

    const guardar = async () => {
        if (!item.pedidoId) return;
        if (!form.clienteTelefono.trim()) { alert('Ingresa el celular de entrega', 'warning'); return; }
        setSaving(true);
        try {
            await apiClient.patch(`/tienda/pedidos/${item.pedidoId}/estado`, {
                agenciaEnvio: form.agenciaEnvio,
                clienteDireccion: form.clienteDireccion.trim(),
                clienteTelefono: form.clienteTelefono.trim(),
                numeroTracking: form.numeroTracking.trim(),
                repartidorId: form.repartidorId ? Number(form.repartidorId) : null,
                notasInternas: form.notasInternas.trim(),
            });
            alert('Despacho actualizado', 'success');
            onSuccess();
        } catch { alert('Error al actualizar el pedido', 'error'); }
        finally { setSaving(false); }
    };

    const confirmarPagoCompleto = async () => {
        setConfirmandoPago(true);
        try {
            if (item.tipo === 'COMPROBANTE' && item.comprobanteId) {
                await apiClient.patch(`/envio-despacho/comprobante/${item.comprobanteId}/confirmar-pago`);
            } else if (item.pedidoId) {
                await apiClient.patch(`/tienda/pedidos/${item.pedidoId}/estado`, { montoPagado: total });
            } else return;
            alert('¡Pago completo confirmado! Se notificó al cliente por WhatsApp', 'success');
            onSuccess();
        } catch { alert('Error al confirmar pago', 'error'); }
        finally { setConfirmandoPago(false); }
    };

    const actualizarMontoParcial = async () => {
        const monto = Number(montoPagadoInput || 0);
        if (monto < 0 || monto > total) { alert('Monto inválido', 'warning'); return; }
        setSaving(true);
        try {
            if (item.tipo === 'COMPROBANTE' && item.comprobanteId) {
                // Para comprobante, actualizar saldo directamente
                const nuevoSaldo = Math.max(total - monto, 0);
                await apiClient.patch(`/envio-despacho/comprobante/${item.comprobanteId}/actualizar-saldo`, { saldo: nuevoSaldo });
            } else if (item.pedidoId) {
                await apiClient.patch(`/tienda/pedidos/${item.pedidoId}/estado`, { montoPagado: monto });
            } else return;
            alert('Pago actualizado', 'success');
            onSuccess();
        } catch { alert('Error al actualizar pago', 'error'); }
        finally { setSaving(false); }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 px-4">
            <div className="w-full max-w-2xl rounded-3xl border border-slate-200 dark:border-transparent bg-white dark:bg-[#111827] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 px-6 py-4 flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <span className="h-11 w-11 rounded-2xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 flex items-center justify-center">
                            <Icon icon="solar:delivery-bold-duotone" className="text-2xl" />
                        </span>
                        <div>
                            <h2 className="text-lg font-black text-slate-900 dark:text-white">Editar despacho</h2>
                            <p className="text-xs text-slate-500">{item.referencia} · {item.cliente}</p>
                        </div>
                    </div>
                    <button type="button" onClick={onClose} className="h-9 w-9 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500">
                        <Icon icon="solar:close-circle-linear" className="text-xl" />
                    </button>
                </div>

                <div className="overflow-y-auto flex-1">
                    {/* ── Sección de pagos ── */}
                    <div className="mx-6 mt-5 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                        <div className="flex items-center gap-2 px-4 py-3 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700">
                            <Icon icon="solar:wallet-money-bold-duotone" className="text-indigo-500 text-lg" />
                            <span className="text-xs font-black uppercase text-slate-600 dark:text-slate-300">Estado de pago</span>
                        </div>

                        <div className="grid grid-cols-3 divide-x divide-slate-100 dark:divide-slate-700">
                            <div className="px-4 py-3 text-center">
                                <p className="text-[10px] text-slate-400 uppercase font-semibold">Total pedido</p>
                                <p className="text-base font-black text-slate-800 dark:text-white mt-0.5">S/ {total.toFixed(2)}</p>
                            </div>
                            <div className="px-4 py-3 text-center">
                                <p className="text-[10px] text-slate-400 uppercase font-semibold">Pagado</p>
                                <p className="text-base font-black text-emerald-600 dark:text-emerald-400 mt-0.5">S/ {(item.montoPagado ?? 0).toFixed(2)}</p>
                            </div>
                            <div className="px-4 py-3 text-center">
                                <p className="text-[10px] text-slate-400 uppercase font-semibold">Saldo pendiente</p>
                                <p className={`text-base font-black mt-0.5 ${tieneSaldo ? 'text-red-500' : 'text-emerald-600 dark:text-emerald-400'}`}>
                                    {tieneSaldo ? `S/ ${saldoActual.toFixed(2)}` : '✓ Pagado'}
                                </p>
                            </div>
                        </div>

                        {tieneSaldo && (
                            <div className="px-4 pb-4 pt-2 border-t border-slate-100 dark:border-slate-700 space-y-3">
                                {/* Confirmar pago completo */}
                                <button
                                    type="button"
                                    onClick={confirmarPagoCompleto}
                                    disabled={confirmandoPago}
                                    className="w-full h-11 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-black flex items-center justify-center gap-2 disabled:opacity-60 transition-colors"
                                >
                                    {confirmandoPago
                                        ? <><Icon icon="mdi:loading" className="animate-spin" /> Confirmando...</>
                                        : <><Icon icon="solar:check-circle-bold-duotone" className="text-lg" /> Confirmar pago completo (S/ {saldoActual.toFixed(2)})</>
                                    }
                                </button>

                                {/* O registrar pago parcial */}
                                <div className="flex items-center gap-2">
                                    <div className="flex-1 relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-500">S/</span>
                                        <input
                                            type="number"
                                            min={0}
                                            max={total}
                                            step={0.01}
                                            value={montoPagadoInput}
                                            onChange={e => setMontoPagadoInput(e.target.value)}
                                            className="h-10 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 pl-8 pr-3 text-sm text-slate-800 dark:text-white outline-none"
                                            placeholder="Monto pagado total"
                                        />
                                    </div>
                                    <button
                                        type="button"
                                        onClick={actualizarMontoParcial}
                                        disabled={saving}
                                        className="h-10 px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-60"
                                    >
                                        Actualizar
                                    </button>
                                </div>
                                {Number(montoPagadoInput) > 0 && Number(montoPagadoInput) < total && (
                                    <p className="text-xs text-amber-600 dark:text-amber-400">
                                        Quedará un saldo de S/ {saldoCalcInput.toFixed(2)} pendiente
                                    </p>
                                )}
                            </div>
                        )}
                    </div>

                    {/* ── Campos de despacho ── */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-6">
                        <label className="space-y-1.5">
                            <span className="text-[11px] font-black uppercase text-slate-500">Courier / modalidad</span>
                            <select
                                value={form.agenciaEnvio}
                                onChange={e => updateField('agenciaEnvio', e.target.value)}
                                className="h-11 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3 text-sm text-slate-800 dark:text-white outline-none"
                            >
                                {Object.entries(COURIER_LABEL).map(([value, label]) => (
                                    <option key={value} value={value}>{label}</option>
                                ))}
                            </select>
                        </label>

                        <label className="space-y-1.5">
                            <span className="text-[11px] font-black uppercase text-slate-500">Repartidor</span>
                            <select
                                value={form.repartidorId}
                                onChange={e => updateField('repartidorId', e.target.value)}
                                disabled={loadingRepartidores}
                                className="h-11 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3 text-sm text-slate-800 dark:text-white outline-none"
                            >
                                <option value="">Sin asignar</option>
                                {repartidores.filter(r => r.activo).map(r => (
                                    <option key={r.id} value={r.id}>{r.nombre}</option>
                                ))}
                            </select>
                        </label>

                        <label className="space-y-1.5 md:col-span-2">
                            <span className="text-[11px] font-black uppercase text-slate-500">Dirección / destino</span>
                            <input
                                value={form.clienteDireccion}
                                onChange={e => updateField('clienteDireccion', e.target.value)}
                                className="h-11 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3 text-sm text-slate-800 dark:text-white outline-none"
                                placeholder="Dirección de entrega o agencia destino"
                            />
                        </label>

                        <label className="space-y-1.5">
                            <span className="text-[11px] font-black uppercase text-slate-500">Celular entrega</span>
                            <input
                                value={form.clienteTelefono}
                                onChange={e => updateField('clienteTelefono', e.target.value)}
                                className="h-11 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3 text-sm text-slate-800 dark:text-white outline-none"
                                placeholder="999999999"
                            />
                        </label>

                        <label className="space-y-1.5">
                            <span className="text-[11px] font-black uppercase text-slate-500">Guía / tracking</span>
                            <input
                                value={form.numeroTracking}
                                onChange={e => updateField('numeroTracking', e.target.value)}
                                className="h-11 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3 text-sm text-slate-800 dark:text-white outline-none"
                                placeholder="Código de guía"
                            />
                        </label>

                        <label className="space-y-1.5 md:col-span-2">
                            <span className="text-[11px] font-black uppercase text-slate-500">Nota interna</span>
                            <textarea
                                value={form.notasInternas}
                                onChange={e => updateField('notasInternas', e.target.value)}
                                rows={2}
                                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-sm text-slate-800 dark:text-white outline-none resize-none"
                                placeholder="Indicaciones para despacho"
                            />
                        </label>
                    </div>
                </div>

                <div className="flex justify-end gap-2 border-t border-slate-100 dark:border-slate-800 px-6 py-4 flex-shrink-0">
                    <button type="button" onClick={onClose} className="h-11 px-5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-600 dark:text-slate-300">
                        Cancelar
                    </button>
                    <button
                        type="button"
                        onClick={guardar}
                        disabled={saving}
                        className="h-11 px-5 rounded-xl btn-accent text-sm font-black disabled:opacity-60"
                    >
                        {saving ? 'Guardando...' : 'Guardar despacho'}
                    </button>
                </div>
            </div>
        </div>
    );
}

function ModalTrazabilidadPedidoTienda({ item, onClose }: { item: DespachoItem; onClose: () => void }) {
    const { alert } = useAlertStore();
    const [loading, setLoading] = useState(true);
    const [historial, setHistorial] = useState<HistorialPedidoEntry[]>([]);

    useEffect(() => {
        if (!item.pedidoId) return;
        setLoading(true);
        apiClient.get(`/tienda/pedidos/${item.pedidoId}/historial`)
            .then(({ data }) => {
                const payload = data?.data ?? data;
                setHistorial(Array.isArray(payload) ? payload.slice().reverse() : []);
            })
            .catch(() => alert('Error al cargar trazabilidad del pedido', 'error'))
            .finally(() => setLoading(false));
    }, [item.pedidoId, alert]);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 px-4">
            <div className="w-full max-w-2xl rounded-3xl border border-slate-200 dark:border-transparent bg-white dark:bg-[#111827] shadow-2xl overflow-hidden">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 px-6 py-4">
                    <div className="flex items-center gap-3">
                        <span className="h-11 w-11 rounded-2xl bg-violet-50 dark:bg-violet-900/30 text-violet-600 flex items-center justify-center">
                            <Icon icon="solar:route-bold-duotone" className="text-2xl" />
                        </span>
                        <div>
                            <h2 className="text-lg font-black text-slate-900 dark:text-white">Trazabilidad pedido tienda</h2>
                            <p className="text-xs text-slate-500">{item.referencia} · {item.cliente}</p>
                        </div>
                    </div>
                    <button type="button" onClick={onClose} className="h-9 w-9 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500">
                        <Icon icon="solar:close-circle-linear" className="text-xl" />
                    </button>
                </div>

                <div className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-5">
                        <div className="rounded-2xl bg-slate-50 dark:bg-slate-900 p-4">
                            <p className="text-[11px] uppercase font-black text-slate-400">Estado actual</p>
                            <p className="mt-1 text-sm font-black text-slate-800 dark:text-white">{toDespachoEstado(item.estado)}</p>
                        </div>
                        <div className="rounded-2xl bg-slate-50 dark:bg-slate-900 p-4">
                            <p className="text-[11px] uppercase font-black text-slate-400">Repartidor</p>
                            <p className="mt-1 text-sm font-black text-slate-800 dark:text-white">{item.repartidor || 'Sin asignar'}</p>
                        </div>
                        <div className="rounded-2xl bg-slate-50 dark:bg-slate-900 p-4">
                            <p className="text-[11px] uppercase font-black text-slate-400">Destino</p>
                            <p className="mt-1 text-sm font-black text-slate-800 dark:text-white line-clamp-1">{item.agenciaDestino || '—'}</p>
                        </div>
                    </div>

                    {loading ? (
                        <div className="flex justify-center py-12">
                            <Icon icon="eos-icons:loading" className="text-3xl text-indigo-500" />
                        </div>
                    ) : historial.length === 0 ? (
                        <p className="text-center py-10 text-sm text-slate-400">Sin historial registrado</p>
                    ) : (
                        <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                            {historial.map((h) => (
                                <div key={h.id} className="rounded-2xl border border-slate-100 dark:border-transparent bg-slate-50 dark:bg-slate-900/70 p-4">
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <p className="text-sm font-black text-slate-800 dark:text-white">
                                                {h.estadoAnterior || 'Inicio'} → {h.estadoNuevo}
                                            </p>
                                            <p className="mt-1 text-xs text-slate-500">{h.notas || 'Actualización de pedido'}</p>
                                        </div>
                                        <p className="text-[11px] text-slate-400 whitespace-nowrap">{moment(h.creadoEn).format('DD/MM/YYYY HH:mm')}</p>
                                    </div>
                                    {h.usuario?.nombre && <p className="mt-2 text-[11px] text-slate-400">Por {h.usuario.nombre}</p>}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function DespachoView() {
    const location = useLocation();
    const navigate = useNavigate();
    const query = new URLSearchParams(location.search);
    const queryFecha = query.get('fecha');
    const queryComprobanteId = Number(query.get('comprobanteId') || 0) || null;
    const queryPedidoId = Number(query.get('pedidoId') || 0) || null;
    const queryRepartidorId = query.get('repartidorId');
    const [items, setItems] = useState<DespachoItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [fecha, setFecha] = useState(() => queryFecha || moment().format('YYYY-MM-DD'));
    const [busqueda, setBusqueda] = useState('');
    const [filtroEstado, setFiltroEstado] = useState('');
    const [filtroRepartidor, setFiltroRepartidor] = useState<number | null | undefined>(
        () => queryRepartidorId ? Number(queryRepartidorId) : undefined
    );
    const [editingDespacho, setEditingDespacho] = useState<number | null>(null);
    const [editingPedidoTienda, setEditingPedidoTienda] = useState<DespachoItem | null>(null);
    const [trazabilidadItem, setTrazabilidadItem] = useState<DespachoItem | null>(null);
    const [trazabilidadPedidoTienda, setTrazabilidadPedidoTienda] = useState<DespachoItem | null>(null);
    const [shalomTracking, setShalomTracking] = useState<{ orderNumber: string; orderCode: string } | null>(null);
    const [waConfig, setWaConfig] = useState(WA_CONFIG_DEFAULTS);
    const { alert } = useAlertStore();

    const pedidoTiendaDocumento = (item: DespachoItem) => ({
        id: item.pedidoId || item.id,
        codigoSeguimiento: item.referencia,
        clienteNombre: item.cliente,
        clienteTelefono: item.celularDest || item.telefono || '',
        clienteDireccion: item.agenciaDestino && item.agenciaDestino !== '—' ? item.agenciaDestino : '',
        tipoEntrega: 'ENVIO',
        estadoEntrega: item.estadoEntrega || (toDespachoEstado(item.estado) === 'ENTREGADO' ? 'ENTREGADO_COMPLETADO' : 'CONFIRMADO'),
        estadoEnvio: item.estado,
        agenciaEnvio: item.courier,
        total: item.total,
        montoPagado: item.montoPagado ?? item.total,
        saldoPendiente: item.saldoPendiente ?? 0,
        items: item.items || [],
    });

    const puedeDocumentarPedidoTienda = (item: DespachoItem) => (
        item.tipo === 'PEDIDO_TIENDA'
        && (toDespachoEstado(item.estado) === 'ENTREGADO' || (item.saldoPendiente !== undefined && Number(item.saldoPendiente) <= 0.01))
    );

    const puedeDocumentarComprobante = (item: DespachoItem) => (
        item.tipo === 'COMPROBANTE'
        && Boolean(item.comprobanteId)
        && toDespachoEstado(item.estado) === 'ENTREGADO'
        && !['01', '03'].includes(String(item.comprobanteTipoDoc || '').toUpperCase())
    );

    const cargarComprobante = async (comprobanteId: number) => {
        const { data } = await apiClient.get<any>(`/comprobante/${comprobanteId}`);
        return data?.data ?? data;
    };

    const mapProductosComprobante = (comprobante: any) => (
        Array.isArray(comprobante?.detalles) ? comprobante.detalles.map(mapDetalleToInvoiceProduct) : []
    );

    const navegarComprobanteDesdePos = async (item: DespachoItem, defaultType: 'BOLETA' | 'FACTURA') => {
        if (!item.comprobanteId) return;
        try {
            const comprobante = await cargarComprobante(item.comprobanteId);
            const cliente = comprobante?.cliente || null;
            const esRuc = String(cliente?.nroDoc || '').length === 11;
            navigate('/administrador/facturacion/nuevo', {
                state: {
                    defaultType,
                    fromNotaDeVenta: true,
                    notaDeVentaData: {
                        origenComprobanteId: item.comprobanteId,
                        cliente: defaultType === 'FACTURA' && !esRuc ? null : cliente,
                        clienteId: defaultType === 'FACTURA' && !esRuc ? null : comprobante?.clienteId,
                        observaciones: comprobante?.observaciones,
                        productos: mapProductosComprobante(comprobante),
                    },
                },
            });
        } catch {
            alert('No se pudo cargar el comprobante para convertirlo', 'error');
        }
    };

    const navegarGuiaDesdePos = async (item: DespachoItem) => {
        if (!item.comprobanteId) return;
        try {
            const comprobante = await cargarComprobante(item.comprobanteId);
            navigate('/administrador/facturacion/guia-remision', {
                state: {
                    fromDespachoComprobante: true,
                    comprobanteGuia: {
                        id: item.comprobanteId,
                        referencia: item.referencia,
                        clienteNombre: comprobante?.cliente?.nombre || item.cliente,
                        clienteNroDoc: comprobante?.cliente?.nroDoc || '10000000',
                        clienteDireccion: item.agenciaDestino && item.agenciaDestino !== '—' ? item.agenciaDestino : comprobante?.cliente?.direccion || '',
                        agenciaEnvio: item.courier,
                        items: mapProductosComprobante(comprobante),
                    },
                },
            });
        } catch {
            alert('No se pudo cargar el comprobante para generar guía', 'error');
        }
    };

    const navegarComprobantePedidoTienda = (item: DespachoItem, defaultType: 'BOLETA' | 'FACTURA') => {
        navigate('/administrador/facturacion/nuevo', {
            state: {
                defaultType,
                defaultClient: 'CLIENTES_VARIOS',
                fromPedidoTienda: true,
                pedidoTiendaData: pedidoTiendaDocumento(item),
            },
        });
    };

    const navegarGuiaPedidoTienda = (item: DespachoItem) => {
        navigate('/administrador/facturacion/guia-remision', {
            state: {
                fromPedidoTienda: true,
                pedidoTiendaGuia: pedidoTiendaDocumento(item),
            },
        });
    };

    useEffect(() => {
        apiClient.get<any>('/envio-despacho/config').then(({ data }) => {
            const p = data?.data ?? data;
            if (p) setWaConfig({
                mensajeEnCamino: p.mensajeEnCamino || WA_CONFIG_DEFAULTS.mensajeEnCamino,
                mensajeEntregado: p.mensajeEntregado || WA_CONFIG_DEFAULTS.mensajeEntregado,
            });
        }).catch(() => {});
    }, []);

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const nextFecha = params.get('fecha');
        if (nextFecha) setFecha(nextFecha);
        const nextRepartidorId = params.get('repartidorId');
        setFiltroRepartidor(nextRepartidorId ? Number(nextRepartidorId) : undefined);
    }, [location.search]);

    const cargar = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (fecha) params.set('fecha', fecha);
            const { data } = await apiClient.get<any>(`/envio-despacho/panel?${params}`);
            const raw = data?.data?.data ?? data?.data ?? [];
            setItems(Array.isArray(raw) ? raw : []);
        } catch {
            alert('Error al cargar el panel de despacho', 'error');
        } finally {
            setLoading(false);
        }
    }, [fecha, alert]);

    useEffect(() => { cargar(); }, [cargar]);

    const actualizarEstado = async (item: DespachoItem, nuevoEstado: string) => {
        try {
            if (item.tipo === 'COMPROBANTE' && item.comprobanteId) {
                await apiClient.put(`/envio-despacho/comprobante/${item.comprobanteId}`, { estado: nuevoEstado });
            } else if (item.tipo === 'PEDIDO_TIENDA' && item.pedidoId) {
                const mapped = DESPACHO_TO_PEDIDO[nuevoEstado];
                if (!mapped) return;
                await apiClient.patch(`/tienda/pedidos/${item.pedidoId}/estado`, mapped);
            } else {
                return;
            }
            setItems(prev => prev.map(i =>
                i.tipo === item.tipo && i.id === item.id ? { ...i, estado: nuevoEstado } : i
            ));
            alert('Estado sincronizado correctamente', 'success');
        } catch {
            alert('Error al actualizar estado', 'error');
        }
    };

    const repartidorStats = useMemo<RepartidorStat[]>(() => {
        const map = new Map<string, RepartidorStat>();
        items.forEach(item => {
            const key = item.repartidorId != null ? String(item.repartidorId) : '__sin__';
            const nombre = item.repartidorId != null ? (item.repartidor || 'Repartidor') : 'Sin asignar';
            if (!map.has(key)) {
                map.set(key, { repartidorId: item.repartidorId ?? null, nombre, preparando: 0, enCamino: 0, entregado: 0, total: 0 });
            }
            const s = map.get(key)!;
            s.total++;
            if (['PREPARANDO', 'POR_COORDINAR'].includes(item.estado)) s.preparando++;
            else if (['EN_CAMINO', 'EN_REPARTO', 'ENVIADO'].includes(item.estado)) s.enCamino++;
            else if (['ENTREGADO', 'ENTREGADO_COMPLETADO'].includes(item.estado)) s.entregado++;
        });
        return Array.from(map.values()).sort((a, b) => (b.repartidorId != null ? 1 : 0) - (a.repartidorId != null ? 1 : 0) || b.total - a.total);
    }, [items]);

    const hayRepartidores = repartidorStats.some(r => r.repartidorId !== null);

    const filtrados = items.filter(i => {
        if (queryComprobanteId && i.comprobanteId !== queryComprobanteId) return false;
        if (queryPedidoId && i.pedidoId !== queryPedidoId) return false;
        if (filtroEstado && toDespachoEstado(i.estado) !== filtroEstado) return false;
        if (filtroRepartidor !== undefined) {
            if (filtroRepartidor === null) {
                if (i.repartidorId != null) return false;
            } else {
                if (i.repartidorId !== filtroRepartidor) return false;
            }
        }
        if (busqueda) {
            const q = busqueda.toLowerCase();
            return i.cliente.toLowerCase().includes(q)
                || i.referencia.toLowerCase().includes(q)
                || i.telefono.includes(q)
                || i.agenciaDestino.toLowerCase().includes(q);
        }
        return true;
    });

    const kpis = {
        total: items.length,
        preparando: items.filter(i => i.estado === 'PREPARANDO' || i.estado === 'POR_COORDINAR').length,
        enCamino: items.filter(i => i.estado === 'EN_CAMINO' || i.estado === 'ENVIADO' || i.estado === 'EN_REPARTO').length,
        enAgencia: items.filter(i => i.estadoEntrega === 'EN_AGENCIA').length,
        entregado: items.filter(i => i.estado === 'ENTREGADO' || i.estado === 'ENTREGADO_COMPLETADO').length,
        conSaldo: items.filter(i => Number(i.saldoPendiente ?? 0) > 0.01).length,
    };

    const tableData = filtrados.map(item => {
        const partes = (item.vendedor ?? '').trim().split(' ').filter(Boolean);
        const iniciales = ((partes[0]?.[0] ?? '') + (partes[1]?.[0] ?? '')).toUpperCase();
        const nombreCorto = [partes[0], partes[1]].filter(Boolean).join(' ');
        const celular = item.celularDest || item.telefono || '';

        return {
            id: item.id,
            'Tipo': (
                <span className={`text-[10px] font-medium px-2 py-1 rounded-full ${item.tipo === 'COMPROBANTE' ? 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300' : 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300'}`}>
                    {item.tipo === 'COMPROBANTE' ? 'POS' : 'TIENDA'}
                </span>
            ),
            'Referencia': <span className="text-xs text-slate-600 dark:text-slate-300">{item.referencia}</span>,
            'Cliente': <span className="text-xs uppercase text-slate-700 dark:text-slate-200">{item.cliente}</span>,
            'Vendedor': (
                <span className="inline-flex items-center gap-1.5">
                    <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 text-[10px] font-medium">
                        {iniciales || '?'}
                    </span>
                    <span className="text-xs text-slate-600 dark:text-slate-300">{nombreCorto || '—'}</span>
                </span>
            ),
            'Courier': item.courier && item.courier !== '—'
                ? <span className={`text-[10px] font-medium px-2 py-1 rounded-lg ${COURIER_COLOR[item.courier] || 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200'}`}>{COURIER_LABEL[item.courier] || item.courier}</span>
                : <span className="text-slate-400 text-xs">—</span>,
            'Agencia destino': <span className="text-xs text-slate-600 dark:text-slate-300">{item.agenciaDestino || '—'}</span>,
            'Celular': (
                <span className="inline-flex items-center gap-1.5">
                    <span className="text-xs text-slate-600 dark:text-slate-300">{celular || '—'}</span>
                    {celular && ESTADOS_WA_NOTIFICADOS.has(item.estado) && (
                        <span title="Notificación WhatsApp enviada automáticamente">
                            <Icon icon="mdi:whatsapp" className="text-emerald-500 text-sm" />
                        </span>
                    )}
                </span>
            ),
            'Paquetes': <span className="text-xs text-center block text-slate-600 dark:text-slate-300">{item.nroPaquetes ?? 1}</span>,
            'Guía': item.codigoGuia
                ? <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 px-2 py-1 rounded-lg">{item.codigoGuia}</span>
                : <span className="text-slate-400 text-xs">—</span>,
            'Total': (
                <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">S/ {Number(item.total).toFixed(2)}</span>
                    {item.saldoPendiente !== undefined && Number(item.saldoPendiente) > 0.01 && (
                        <span className="text-[10px] font-bold text-red-500 bg-red-50 dark:bg-red-950/30 px-1.5 py-0.5 rounded-md">
                            Saldo: S/ {Number(item.saldoPendiente).toFixed(2)}
                        </span>
                    )}
                    {item.montoPagado !== undefined && item.saldoPendiente !== undefined && Number(item.saldoPendiente) <= 0.01 && Number(item.montoPagado) > 0 && (
                        <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 px-1.5 py-0.5 rounded-md">✓ Pagado</span>
                    )}
                </div>
            ),
            'Estado': (
                <select
                    value={toDespachoEstado(item.estado)}
                    onChange={e => actualizarEstado(item, e.target.value)}
                    className={`h-8 px-2 text-xs rounded-lg border outline-none transition ${ESTADO_COLOR[item.estado] || 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'}`}
                >
                    {ESTADOS_DESPACHO.map(e => <option key={e.value} value={e.value}>{e.label}</option>)}
                </select>
            ),
            'Acciones': (
                <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                    {item.tipo === 'COMPROBANTE' && item.comprobanteId && (
                        <button
                            type="button"
                            onClick={() => setTrazabilidadItem(item)}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500 text-white hover:bg-violet-600 transition-colors"
                            title="Ver trazabilidad"
                        >
                            <Icon icon="solar:route-bold-duotone" className="text-base" />
                        </button>
                    )}
                    {item.tipo === 'PEDIDO_TIENDA' && item.pedidoId && (
                        <button
                            type="button"
                            onClick={() => setTrazabilidadPedidoTienda(item)}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500 text-white hover:bg-violet-600 transition-colors"
                            title="Ver trazabilidad"
                        >
                            <Icon icon="solar:route-bold-duotone" className="text-base" />
                        </button>
                    )}
                    {puedeDocumentarPedidoTienda(item) && (
                        <>
                            <button
                                type="button"
                                onClick={() => navegarComprobantePedidoTienda(item, 'BOLETA')}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500 text-white hover:bg-violet-600 transition-colors"
                                title="Hacer boleta"
                            >
                                <Icon icon="solar:bill-list-bold" className="text-base" />
                            </button>
                            <button
                                type="button"
                                onClick={() => navegarComprobantePedidoTienda(item, 'FACTURA')}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                                title="Hacer factura"
                            >
                                <Icon icon="solar:document-add-bold" className="text-base" />
                            </button>
                            <button
                                type="button"
                                onClick={() => navegarGuiaPedidoTienda(item)}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500 text-white hover:bg-amber-600 transition-colors"
                                title="Hacer guía de remisión"
                            >
                                <Icon icon="solar:route-bold-duotone" className="text-base" />
                            </button>
                        </>
                    )}
                    {puedeDocumentarComprobante(item) && (
                        <>
                            <button
                                type="button"
                                onClick={() => navegarComprobanteDesdePos(item, 'BOLETA')}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500 text-white hover:bg-violet-600 transition-colors"
                                title="Hacer boleta"
                            >
                                <Icon icon="solar:bill-list-bold" className="text-base" />
                            </button>
                            <button
                                type="button"
                                onClick={() => navegarComprobanteDesdePos(item, 'FACTURA')}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                                title="Hacer factura"
                            >
                                <Icon icon="solar:document-add-bold" className="text-base" />
                            </button>
                            <button
                                type="button"
                                onClick={() => navegarGuiaDesdePos(item)}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500 text-white hover:bg-amber-600 transition-colors"
                                title="Hacer guía de remisión"
                            >
                                <Icon icon="solar:route-bold-duotone" className="text-base" />
                            </button>
                        </>
                    )}
                    {SHALOM_COURIERS.has(item.courier) && (
                        <button
                            type="button"
                            onClick={() => {
                                if (!item.nroOrden) {
                                    useAlertStore.getState().alert('Agrega el N° de orden Shalom en "Editar despacho" primero', 'warning');
                                    return;
                                }
                                setShalomTracking({ orderNumber: item.nroOrden, orderCode: item.claveOrden ?? '' });
                            }}
                            className={`inline-flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${item.nroOrden ? 'bg-slate-800 hover:bg-slate-900 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-400 dark:text-slate-500'}`}
                            title={item.nroOrden ? `Tracking Shalom #${item.nroOrden}` : 'Sin N° orden — edita el despacho para agregarlo'}
                        >
                            <Icon icon="solar:delivery-bold-duotone" className="text-base" />
                        </button>
                    )}
                    {celular ? (
                        <a
                            href={`https://wa.me/51${celular.replace(/\D/g, '')}?text=${encodeURIComponent(buildWaMessage(item, waConfig))}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 transition-colors"
                            title={`WhatsApp · ${item.estado}`}
                        >
                            <Icon icon="mdi:whatsapp" className="text-base" />
                        </a>
                    ) : null}
                    {item.tipo === 'COMPROBANTE' && item.comprobanteId && (
                        <button
                            type="button"
                            onClick={() => setEditingDespacho(item.comprobanteId!)}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500 text-white hover:bg-indigo-600 transition-colors"
                            title="Editar despacho"
                        >
                            <Icon icon="solar:pen-bold" className="text-base" />
                        </button>
                    )}
                    {item.tipo === 'PEDIDO_TIENDA' && item.pedidoId && (
                        <button
                            type="button"
                            onClick={() => setEditingPedidoTienda(item)}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500 text-white hover:bg-indigo-600 transition-colors"
                            title="Editar despacho"
                        >
                            <Icon icon="solar:pen-bold" className="text-base" />
                        </button>
                    )}
                </div>
            ),
        };
    });

    return (
        <div className="min-h-screen -m-5 p-5 bg-[#F7F8FB] dark:bg-[#0A0D14] font-jakarta">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm text-slate-400 mb-5">
                <Icon icon="solar:home-smile-linear" className="text-base" />
                <span>Panel</span>
                <Icon icon="solar:alt-arrow-right-linear" className="text-xs" />
                <span>Logística</span>
                <Icon icon="solar:alt-arrow-right-linear" className="text-xs" />
                <span className="font-semibold" style={{ color: ACCENT }}>Despacho</span>
            </div>

            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-5">
                <div className="flex items-center gap-3 min-w-0">
                    <div className="h-11 w-11 grid place-items-center rounded-2xl bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400 shrink-0">
                        <Icon icon="solar:delivery-bold-duotone" className="text-2xl" />
                    </div>
                    <div className="min-w-0">
                        <h1 className="text-[22px] font-extrabold text-slate-800 dark:text-white tracking-tight truncate">Panel de Despacho</h1>
                        <p className="text-sm text-slate-400 mt-0.5">Comprobantes + pedidos online pendientes de envío</p>
                    </div>
                </div>
                <div className="flex items-center gap-2.5">
                    <Calendar
                        text="Fecha"
                        name="fecha"
                        value={moment(fecha).format('DD/MM/YYYY')}
                        onChange={(date) => {
                            if (moment(date, 'DD/MM/YYYY', true).isValid()) {
                                setFecha(moment(date, 'DD/MM/YYYY').format('YYYY-MM-DD'));
                            }
                        }}
                    />
                    <button
                        onClick={() => navigate('/administrador/despacho/config')}
                        className="relative top-2 h-11 w-11 grid place-items-center rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-slate-700 transition-colors shrink-0"
                        title="Configurar notificaciones WhatsApp"
                    >
                        <Icon icon="mdi:whatsapp" className="text-lg" />
                    </button>
                    <button
                        onClick={cargar}
                        className="relative top-2 h-11 px-4 rounded-2xl text-white text-sm font-bold flex items-center gap-1.5 shadow-lg shadow-violet-500/30 hover:brightness-105 transition-all shrink-0"
                        style={{ background: ACCENT }}
                        title="Actualizar"
                    >
                        <Icon icon="solar:refresh-linear" className={loading ? 'animate-spin' : ''} /> <span className="hidden sm:inline">Actualizar</span>
                    </button>
                </div>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-5">
                {[
                    { label: 'Total hoy', value: kpis.total, icon: 'solar:box-bold-duotone', color: 'blue' },
                    { label: 'Por preparar', value: kpis.preparando, icon: 'solar:clock-circle-bold-duotone', color: 'amber' },
                    { label: 'En tránsito', value: kpis.enCamino, icon: 'solar:delivery-bold-duotone', color: 'indigo' },
                    { label: 'En agencia', value: kpis.enAgencia, icon: 'solar:buildings-3-bold-duotone', color: 'orange' },
                    { label: 'Entregados', value: kpis.entregado, icon: 'solar:check-circle-bold-duotone', color: 'emerald' },
                    { label: 'Saldo pendiente', value: kpis.conSaldo, icon: 'solar:wallet-money-bold-duotone', color: 'red' },
                ].map(k => (
                    <div key={k.label} className="bg-white dark:bg-[#111827] rounded-3xl shadow-[0_2px_20px_rgba(15,23,42,0.05)] p-4 flex items-center gap-3">
                        <span className={`h-10 w-10 grid place-items-center rounded-2xl shrink-0 ${KPI_CHIP[k.color]}`}>
                            <Icon icon={k.icon} className="text-xl" />
                        </span>
                        <div className="min-w-0">
                            <p className="text-2xl font-extrabold text-slate-800 dark:text-white leading-none">{k.value}</p>
                            <p className="text-xs text-slate-400 uppercase tracking-wide mt-1 truncate">{k.label}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Cards por repartidor */}
            {hayRepartidores && (
                <div className="bg-white dark:bg-[#111827] rounded-3xl shadow-[0_2px_20px_rgba(15,23,42,0.05)] p-4 mb-5">
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-3">Por repartidor</p>
                    <div className="flex gap-2 overflow-x-auto pb-1">
                        {/* Card "Todos" */}
                        <button
                            type="button"
                            onClick={() => setFiltroRepartidor(undefined)}
                            className="shrink-0 rounded-2xl px-4 py-2.5 text-xs font-bold transition-all"
                            style={filtroRepartidor === undefined
                                ? { background: ACCENT, color: '#fff' }
                                : undefined}
                        >
                            <span className={filtroRepartidor === undefined ? '' : 'text-slate-600 dark:text-slate-300'}>TODOS</span>
                        </button>

                        {repartidorStats.map(rep => {
                            const partes = rep.nombre.trim().split(' ').filter(Boolean);
                            const iniciales = ((partes[0]?.[0] ?? '') + (partes[1]?.[0] ?? '')).toUpperCase() || '?';
                            const isSelected = filtroRepartidor === rep.repartidorId;
                            const isSinAsignar = rep.repartidorId === null;

                            return (
                                <button
                                    key={rep.repartidorId ?? '__sin__'}
                                    type="button"
                                    onClick={() => setFiltroRepartidor(isSelected ? undefined : rep.repartidorId)}
                                    className={`shrink-0 rounded-2xl p-3 text-left transition-all w-44 border ${
                                        isSelected
                                            ? 'border-transparent text-white'
                                            : 'border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800'
                                    }`}
                                    style={isSelected ? { background: ACCENT } : undefined}
                                >
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-[11px] font-bold shrink-0 ${
                                            isSelected
                                                ? 'bg-white/20 text-white'
                                                : isSinAsignar
                                                    ? 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300'
                                                    : 'bg-gradient-to-br from-violet-400 to-indigo-500 text-white'
                                        }`}>
                                            {isSinAsignar ? <Icon icon="solar:user-cross-bold" className="text-sm" /> : iniciales}
                                        </span>
                                        <span className={`text-xs font-bold truncate ${isSelected ? 'text-white' : 'text-slate-800 dark:text-slate-100'}`}>
                                            {partes[0]}{partes[1] ? ` ${partes[1]}` : ''}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <span className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-bold ${isSelected ? 'bg-amber-400/30 text-amber-50' : 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400'}`}>
                                            <span>{rep.preparando}</span>
                                            <Icon icon="solar:clock-circle-bold" className="text-[10px]" />
                                        </span>
                                        <span className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-bold ${isSelected ? 'bg-blue-400/30 text-blue-50' : 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'}`}>
                                            <span>{rep.enCamino}</span>
                                            <Icon icon="solar:delivery-bold" className="text-[10px]" />
                                        </span>
                                        <span className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-bold ${isSelected ? 'bg-emerald-400/30 text-emerald-50' : 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400'}`}>
                                            <span>{rep.entregado}</span>
                                            <Icon icon="solar:check-circle-bold" className="text-[10px]" />
                                        </span>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Card contenedora: filtros + tabla */}
            <div className="bg-white dark:bg-[#111827] rounded-3xl shadow-[0_2px_20px_rgba(15,23,42,0.05)] overflow-hidden">
                {/* Toolbar / Filtros */}
                <div className="flex flex-wrap items-center gap-2.5 p-4 border-b border-slate-100 dark:border-slate-800">
                    <div className="relative flex-1 min-w-[220px]">
                        <Icon icon="solar:magnifer-linear" className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            value={busqueda}
                            onChange={e => setBusqueda(e.target.value)}
                            placeholder="Buscar cliente, código, agencia…"
                            className="w-full h-11 pl-10 pr-3 rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-700 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:border-[var(--accent)] transition-colors"
                        />
                    </div>
                    <button
                        onClick={() => setFiltroEstado('')}
                        className="h-9 px-3.5 rounded-xl text-sm font-semibold transition-colors"
                        style={!filtroEstado
                            ? { background: ACCENT, color: '#fff' }
                            : undefined}
                    >
                        <span className={!filtroEstado ? '' : 'text-slate-600 dark:text-slate-300'}>Todos</span>
                    </button>
                    {ESTADOS_DESPACHO.map(e => (
                        <button
                            key={e.value}
                            onClick={() => setFiltroEstado(filtroEstado === e.value ? '' : e.value)}
                            className={`h-9 px-3.5 rounded-xl text-sm font-semibold transition-colors ${filtroEstado === e.value ? 'bg-slate-900 dark:bg-slate-700 text-white' : 'border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                        >
                            {e.label}
                        </button>
                    ))}
                    <span className="text-sm text-slate-400 font-medium px-1 ml-auto">{filtrados.length} resultado{filtrados.length === 1 ? '' : 's'}</span>
                </div>

                {/* Tabla */}
                {loading ? (
                    <div className="p-4 space-y-2.5">
                        {Array.from({ length: 8 }).map((_, i) => (
                            <div key={i} className="h-10 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
                        ))}
                    </div>
                ) : filtrados.length === 0 ? (
                    <div className="flex flex-col items-center py-20 text-slate-400">
                        <Icon icon="solar:delivery-bold-duotone" className="text-5xl text-slate-200 dark:text-slate-700 mb-3" />
                        <p className="text-sm">Sin envíos pendientes para este día</p>
                    </div>
                ) : (
                    <DataTable
                        headerColumns={HEADER_COLUMNS}
                        bodyData={tableData}
                        color="white"
                        idTable="despacho-table"
                    />
                )}
            </div>

            {editingDespacho && (
                <EditarDespachoModal
                    comprobanteId={editingDespacho}
                    onClose={() => setEditingDespacho(null)}
                    onSuccess={() => {
                        setEditingDespacho(null);
                        cargar();
                    }}
                />
            )}

            {trazabilidadItem && trazabilidadItem.comprobanteId && (
                <ModalTrazabilidad
                    comprobanteId={trazabilidadItem.comprobanteId}
                    referencia={trazabilidadItem.referencia}
                    cliente={trazabilidadItem.cliente}
                    onClose={() => setTrazabilidadItem(null)}
                />
            )}

            {editingPedidoTienda && (
                <EditarPedidoTiendaDespachoModal
                    item={editingPedidoTienda}
                    onClose={() => setEditingPedidoTienda(null)}
                    onSuccess={() => {
                        setEditingPedidoTienda(null);
                        cargar();
                    }}
                />
            )}

            {trazabilidadPedidoTienda && (
                <ModalTrazabilidadPedidoTienda
                    item={trazabilidadPedidoTienda}
                    onClose={() => setTrazabilidadPedidoTienda(null)}
                />
            )}
            {shalomTracking && (
                <ShalomTrackingModal
                    orderNumber={shalomTracking.orderNumber}
                    orderCode={shalomTracking.orderCode}
                    onClose={() => setShalomTracking(null)}
                />
            )}
        </div>
    );
}
