import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import apiClient from '@/utils/apiClient';
import useAlertStore from '@/zustand/alert';
import { useAuthStore } from '@/zustand/auth';

export const ESTADOS = [
    { value: 'PENDIENTE', label: 'Pendiente', color: 'bg-amber-50 text-amber-700 border-amber-200', icon: 'solar:clock-circle-bold' },
    { value: 'CONFIRMADO', label: 'Confirmado', color: 'bg-blue-50 text-blue-700 border-blue-200', icon: 'solar:check-circle-bold' },
    { value: 'EN_PREPARACION', label: 'En preparación', color: 'bg-purple-50 text-purple-700 border-purple-200', icon: 'solar:chef-hat-bold' },
    { value: 'LISTO', label: 'Listo', color: 'bg-green-50 text-green-700 border-green-200', icon: 'solar:bag-check-bold' },
    { value: 'ENTREGADO', label: 'Entregado', color: 'bg-slate-50 text-slate-700 border-slate-200', icon: 'solar:box-bold' },
    { value: 'CANCELADO', label: 'Cancelado', color: 'bg-red-50 text-red-700 border-red-200', icon: 'solar:close-circle-bold' },
] as const;

export const ESTADOS_ENTREGA = [
    { value: 'PENDIENTE', label: 'Pendiente', color: 'text-amber-700' },
    { value: 'CONFIRMADO', label: 'Confirmado', color: 'text-sky-700' },
    { value: 'EN_TRANSITO', label: 'En tránsito', color: 'text-indigo-700' },
    { value: 'REPROGRAMADO', label: 'Reprogramado', color: 'text-orange-700' },
    { value: 'ENTREGADO_COMPLETADO', label: 'Entregado - Completado', color: 'text-emerald-700' },
    { value: 'CANCELADO_INTERNO', label: 'Cancelado Motivos Internos', color: 'text-rose-700' },
    { value: 'CANCELADO_CLIENTE', label: 'Cancelado por Cliente', color: 'text-red-700' },
] as const;

export const AGENCIAS_ENVIO = [
    { value: 'SHALOM_PRO', label: 'Shalom PRO', color: 'bg-slate-900 text-white' },
    { value: 'SHALOM_COD', label: 'Shalom COD', color: 'bg-red-600 text-white' },
    { value: 'OLVA', label: 'Olva Courier', color: 'bg-emerald-600 text-white' },
    { value: 'PROPIOS', label: 'Propios', color: 'bg-fuchsia-600 text-white' },
    { value: 'RECOJO_TIENDA', label: 'Recojo tienda', color: 'bg-blue-600 text-white' },
    { value: 'SIN_AGENCIA', label: 'Sin agencia', color: 'bg-slate-100 text-slate-600' },
] as const;

export const ESTADOS_ENVIO = [
    { value: 'SIN_ASIGNAR', label: 'Sin asignar', color: 'bg-slate-100 text-slate-600 border-slate-200' },
    { value: 'POR_COORDINAR', label: 'Por coordinar', color: 'bg-amber-50 text-amber-700 border-amber-200' },
    { value: 'ENVIADO', label: 'Enviado', color: 'bg-blue-50 text-blue-700 border-blue-200' },
    { value: 'EN_REPARTO', label: 'En reparto', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
    { value: 'ENTREGADO', label: 'Entregado', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    { value: 'INCIDENCIA', label: 'Incidencia', color: 'bg-red-50 text-red-700 border-red-200' },
    { value: 'NO_APLICA', label: 'No aplica', color: 'bg-slate-50 text-slate-500 border-slate-200' },
] as const;

const POLLING_MS = 30_000;

type EstadoPedido = typeof ESTADOS[number]['value'];
type EstadoEntrega = typeof ESTADOS_ENTREGA[number]['value'];
type AgenciaEnvio = typeof AGENCIAS_ENVIO[number]['value'];
type EstadoEnvio = typeof ESTADOS_ENVIO[number]['value'];

interface ApiEnvelope<T> {
    code?: number;
    data?: T;
    message?: string;
}

interface PaginatedResponse<T> {
    data?: T[];
    total?: number;
}

interface ProductoPedido {
    id?: number | null;
    codigo?: string | null;
    descripcion?: string | null;
    imagenUrl?: string | null;
    atributosTecnicos?: Record<string, any> | null;
}

export interface PedidoItemTienda {
    id: number;
    productoId?: number | null;
    cantidad: number;
    precioUnit: number;
    subtotal: number;
    producto?: ProductoPedido | null;
}

export interface PedidoTiendaAdmin {
    id: number;
    codigoSeguimiento: string;
    clienteNombre: string;
    clienteTelefono: string;
    clienteEmail?: string | null;
    clienteDireccion?: string | null;
    clienteReferencia?: string | null;
    tipoEntrega: 'RECOJO' | 'ENVIO';
    estado: EstadoPedido;
    estadoEntrega: EstadoEntrega;
    agenciaEnvio: AgenciaEnvio;
    estadoEnvio: EstadoEnvio;
    numeroTracking?: string | null;
    vendedorNombre: string;
    medioPago: string;
    subtotal: number;
    igv: number;
    total: number;
    costoEnvio: number;
    montoPagado: number;
    saldoPendiente: number;
    observaciones?: string | null;
    notasInternas?: string | null;
    creadoEn: string;
    items: PedidoItemTienda[];
}

type PedidoPatch = Partial<Pick<PedidoTiendaAdmin,
    'estado' | 'estadoEntrega' | 'agenciaEnvio' | 'estadoEnvio' | 'numeroTracking' | 'vendedorNombre' | 'notasInternas' | 'montoPagado'
>>;

type PedidoApi = Partial<Omit<PedidoTiendaAdmin, 'items'>> & {
    items?: unknown[];
};

const toNumber = (value: unknown): number => {
    const n = Number(value ?? 0);
    return Number.isFinite(n) ? n : 0;
};

const isRecord = (value: unknown): value is Record<string, unknown> => (
    typeof value === 'object' && value !== null
);

const asString = (value: unknown, fallback = ''): string => (
    typeof value === 'string' && value.trim() ? value : fallback
);

const normalizeEstado = (value: unknown): EstadoPedido => (
    ESTADOS.some((estado) => estado.value === value) ? value as EstadoPedido : 'PENDIENTE'
);

const normalizeEstadoEntrega = (value: unknown, fallback: EstadoEntrega = 'PENDIENTE'): EstadoEntrega => (
    ESTADOS_ENTREGA.some((estado) => estado.value === value) ? value as EstadoEntrega : fallback
);

const normalizeAgencia = (value: unknown, tipoEntrega: 'RECOJO' | 'ENVIO'): AgenciaEnvio => {
    if (AGENCIAS_ENVIO.some((agencia) => agencia.value === value)) return value as AgenciaEnvio;
    const label = asString(value).toUpperCase();
    if (label.includes('SHALOM') && label.includes('COD')) return 'SHALOM_COD';
    if (label.includes('SHALOM')) return 'SHALOM_PRO';
    if (label.includes('PROPIO')) return 'PROPIOS';
    if (tipoEntrega === 'RECOJO') return 'RECOJO_TIENDA';
    return 'SIN_AGENCIA';
};

const normalizeEstadoEnvio = (value: unknown, tipoEntrega: 'RECOJO' | 'ENVIO'): EstadoEnvio => {
    if (ESTADOS_ENVIO.some((estado) => estado.value === value)) return value as EstadoEnvio;
    return tipoEntrega === 'ENVIO' ? 'POR_COORDINAR' : 'NO_APLICA';
};

const normalizarItem = (raw: unknown): PedidoItemTienda => {
    const item = isRecord(raw) ? raw : {};
    const producto = isRecord(item.producto) ? item.producto : null;

    return {
        id: toNumber(item.id),
        productoId: toNumber(item.productoId ?? producto?.id),
        cantidad: toNumber(item.cantidad),
        precioUnit: toNumber(item.precioUnit ?? item.precioUnitario),
        subtotal: toNumber(item.subtotal),
        producto: producto ? {
            id: toNumber(producto.id),
            codigo: asString(producto.codigo, ''),
            descripcion: asString(producto.descripcion, 'Producto'),
            imagenUrl: asString(producto.imagenUrl, ''),
            atributosTecnicos: isRecord(producto.atributosTecnicos) ? producto.atributosTecnicos : undefined,
        } : null,
    };
};

const normalizarPedido = (pedido: PedidoApi): PedidoTiendaAdmin => {
    const tipoEntrega = pedido.tipoEntrega === 'ENVIO' ? 'ENVIO' : 'RECOJO';
    const total = toNumber(pedido.total);
    const montoPagado = toNumber(pedido.montoPagado ?? (pedido.medioPago === 'TARJETA' ? total : 0));
    const estado = normalizeEstado(pedido.estado);

    return {
        id: toNumber(pedido.id),
        codigoSeguimiento: asString(pedido.codigoSeguimiento, `PED-${toNumber(pedido.id)}`),
        clienteNombre: asString(pedido.clienteNombre, 'Clientes - Varios'),
        clienteTelefono: asString(pedido.clienteTelefono, ''),
        clienteEmail: asString(pedido.clienteEmail, ''),
        clienteDireccion: asString(pedido.clienteDireccion, ''),
        clienteReferencia: asString(pedido.clienteReferencia, ''),
        tipoEntrega,
        estado,
        estadoEntrega: normalizeEstadoEntrega(pedido.estadoEntrega, estado === 'ENTREGADO' ? 'ENTREGADO_COMPLETADO' : 'PENDIENTE'),
        agenciaEnvio: normalizeAgencia(pedido.agenciaEnvio, tipoEntrega),
        estadoEnvio: normalizeEstadoEnvio(pedido.estadoEnvio, tipoEntrega),
        numeroTracking: asString(pedido.numeroTracking, ''),
        vendedorNombre: asString(pedido.vendedorNombre, tipoEntrega === 'ENVIO' ? 'Tienda online' : 'Mostrador'),
        medioPago: asString(pedido.medioPago, 'EFECTIVO'),
        subtotal: toNumber(pedido.subtotal),
        igv: toNumber(pedido.igv),
        total,
        costoEnvio: toNumber(pedido.costoEnvio),
        montoPagado,
        saldoPendiente: toNumber(pedido.saldoPendiente ?? Math.max(total - montoPagado, 0)),
        observaciones: asString(pedido.observaciones, ''),
        notasInternas: asString(pedido.notasInternas, ''),
        creadoEn: asString(pedido.creadoEn, new Date().toISOString()),
        items: Array.isArray(pedido.items) ? pedido.items.map(normalizarItem) : [],
    };
};

const unwrapPedidos = (payload: ApiEnvelope<PedidoApi[] | PaginatedResponse<PedidoApi>>): PedidoApi[] => {
    const responseData = payload.data;
    if (Array.isArray(responseData)) return responseData;
    if (responseData && Array.isArray(responseData.data)) return responseData.data;
    return [];
};

export const usePedidosViewModel = () => {
    const [pedidos, setPedidos] = useState<PedidoTiendaAdmin[]>([]);
    const [loading, setLoading] = useState(true);
    const [filtroEstado, setFiltroEstado] = useState(() => {
        const params = new URLSearchParams(window.location.search);
        return params.get('soloPendientesAtencion') === 'true' ? 'PENDIENTE' : '';
    });
    const [expandedOrders, setExpandedOrders] = useState<Set<number>>(new Set());
    const [newOrdersCount, setNewOrdersCount] = useState(0);
    const [busqueda, setBusqueda] = useState('');
    const [fechaDesde, setFechaDesde] = useState('');
    const [fechaHasta, setFechaHasta] = useState('');
    const { alert } = useAlertStore();
    const { auth } = useAuthStore();

    const knownIdsRef = useRef<Set<number>>(new Set());
    const isFirstLoad = useRef(true);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const cargarPedidos = useCallback(async () => {
        try {
            const { data } = await apiClient.get<ApiEnvelope<PedidoApi[] | PaginatedResponse<PedidoApi>>>(`/tienda/pedidos`);
            const normalizados = unwrapPedidos(data).map(normalizarPedido);

            if (isFirstLoad.current) {
                knownIdsRef.current = new Set(normalizados.map((p) => p.id));
                isFirstLoad.current = false;
            } else {
                const nuevos = normalizados.filter((p) => !knownIdsRef.current.has(p.id));
                if (nuevos.length > 0) {
                    setNewOrdersCount((prev) => prev + nuevos.length);
                    nuevos.forEach((p) => knownIdsRef.current.add(p.id));
                }
            }

            setPedidos(normalizados);
        } catch (error: unknown) {
            const message = isRecord(error) && isRecord(error.response) && isRecord(error.response.data)
                ? asString(error.response.data.message, 'Error al cargar pedidos')
                : 'Error al cargar pedidos';
            alert(message, 'error');
        } finally {
            setLoading(false);
        }
    }, [alert]);

    const playBeep = useCallback(() => {
        try {
            const ctx = new window.AudioContext();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.type = 'sine';
            osc.frequency.setValueAtTime(880, ctx.currentTime);
            gain.gain.setValueAtTime(0.22, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.5);
        } catch {
            // AudioContext can be blocked until a user gesture.
        }
    }, []);

    const notificarNuevosPedidos = useCallback((count: number) => {
        playBeep();
        if (Notification.permission === 'granted') {
            new Notification(`${count} nuevo${count > 1 ? 's' : ''} pedido${count > 1 ? 's' : ''}`, {
                body: 'Tienes nuevos pedidos en tu tienda virtual',
                icon: '/favicon.ico',
            });
        }
    }, [playBeep]);

    const fetchSilencioso = useCallback(async () => {
        try {
            const { data } = await apiClient.get<ApiEnvelope<PedidoApi[] | PaginatedResponse<PedidoApi>>>(`/tienda/pedidos`);
            const normalizados = unwrapPedidos(data).map(normalizarPedido);
            const nuevos = normalizados.filter((p) => !knownIdsRef.current.has(p.id));

            if (nuevos.length > 0) {
                setNewOrdersCount((prev) => prev + nuevos.length);
                nuevos.forEach((p) => knownIdsRef.current.add(p.id));
                notificarNuevosPedidos(nuevos.length);
            }

            setPedidos(normalizados);
        } catch {
            // polling silencioso
        }
    }, [notificarNuevosPedidos]);

    useEffect(() => {
        if (Notification.permission === 'default') {
            Notification.requestPermission().catch(() => undefined);
        }
        void cargarPedidos();
        intervalRef.current = setInterval(fetchSilencioso, POLLING_MS);
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [cargarPedidos, fetchSilencioso]);

    const actualizarPedidoOperativo = async (pedidoId: number, patch: PedidoPatch) => {
        const pedidoActual = pedidos.find((pedido) => pedido.id === pedidoId);
        if (!pedidoActual) return;

        const snapshot = pedidos;
        const montoPagado = patch.montoPagado ?? pedidoActual.montoPagado;
        const nextPedido: PedidoTiendaAdmin = {
            ...pedidoActual,
            ...patch,
            vendedorNombre: patch.vendedorNombre || auth?.nombre || pedidoActual.vendedorNombre,
            saldoPendiente: Math.max(pedidoActual.total - montoPagado, 0),
        };

        setPedidos((prev) => prev.map((pedido) => pedido.id === pedidoId ? nextPedido : pedido));

        try {
            const payload = {
                ...patch,
                estado: patch.estado ?? pedidoActual.estado,
                vendedorNombre: patch.vendedorNombre || auth?.nombre || pedidoActual.vendedorNombre,
            };
            const { data } = await apiClient.patch<ApiEnvelope<PedidoApi>>(`/tienda/pedidos/${pedidoId}/estado`, payload);
            if (data?.data) {
                const actualizado = normalizarPedido(data.data);
                setPedidos((prev) => prev.map((pedido) => pedido.id === pedidoId ? actualizado : pedido));
            }
            alert('Pedido actualizado', 'success');
        } catch (error: unknown) {
            setPedidos(snapshot);
            const message = isRecord(error) && isRecord(error.response) && isRecord(error.response.data)
                ? asString(error.response.data.message, 'Error al actualizar pedido')
                : 'Error al actualizar pedido';
            alert(message, 'error');
        }
    };

    const cambiarEstado = async (pedidoId: number, nuevoEstado: string) => {
        if (!ESTADOS.some((estado) => estado.value === nuevoEstado)) return;
        await actualizarPedidoOperativo(pedidoId, { estado: nuevoEstado as EstadoPedido });
    };

    const getEstadoInfo = (estado: string) => ESTADOS.find((e) => e.value === estado) || ESTADOS[0];
    const getEntregaInfo = (estado: string) => ESTADOS_ENTREGA.find((e) => e.value === estado) || ESTADOS_ENTREGA[0];
    const getAgenciaInfo = (agencia: string) => AGENCIAS_ENVIO.find((e) => e.value === agencia) || AGENCIAS_ENVIO[5];
    const getEnvioInfo = (estado: string) => ESTADOS_ENVIO.find((e) => e.value === estado) || ESTADOS_ENVIO[0];

    const toggleOrderExpanded = (orderId: number) => {
        setExpandedOrders((prev) => {
            const next = new Set(prev);
            next.has(orderId) ? next.delete(orderId) : next.add(orderId);
            return next;
        });
    };

    const clearNewOrders = () => setNewOrdersCount(0);

    const buildWhatsappUrl = (pedido: PedidoTiendaAdmin, nuevoEstado: string) => {
        const estadoLabel = getEntregaInfo(nuevoEstado)?.label ?? getEstadoInfo(nuevoEstado)?.label ?? nuevoEstado;
        const digits = (pedido.clienteTelefono || '').replace(/\D/g, '');
        if (!digits) return null;
        const telefono = digits.startsWith('51') ? digits : `51${digits}`;
        const seguimiento = `${window.location.origin}/tienda/seguimiento?codigo=${encodeURIComponent(pedido.codigoSeguimiento)}`;
        const envio = pedido.tipoEntrega === 'ENVIO'
            ? `\nDestino: ${pedido.clienteDireccion || 'por coordinar'}`
            : '\nModalidad: Recojo en tienda';
        const msg = encodeURIComponent(
            `Hola ${pedido.clienteNombre}, tu pedido ${pedido.codigoSeguimiento} está en estado: ${estadoLabel}.${envio}\nTotal: S/ ${pedido.total.toFixed(2)}\nSeguimiento: ${seguimiento}\nGracias por tu preferencia.`
        );
        return `https://wa.me/${telefono}?text=${msg}`;
    };

    const buildReviewWhatsappUrl = (pedido: PedidoTiendaAdmin) => {
        const digits = (pedido.clienteTelefono || '').replace(/\D/g, '');
        const firstProduct = pedido.items.find((item) => Number(item.productoId || item.producto?.id) > 0);
        const productoId = Number(firstProduct?.productoId || firstProduct?.producto?.id || 0);
        const slug = auth?.empresa?.slugTienda;
        if (!digits || !slug || !productoId) return null;
        const telefono = digits.startsWith('51') ? digits : `51${digits}`;
        const reviewUrl = `${window.location.origin}/tienda/${slug}/producto/${productoId}?review=1&codigo=${encodeURIComponent(pedido.codigoSeguimiento)}&telefono=${encodeURIComponent(pedido.clienteTelefono || '')}&nombre=${encodeURIComponent(pedido.clienteNombre || '')}`;
        const productoNombre = firstProduct?.producto?.descripcion || 'tu producto';
        const msg = encodeURIComponent(
            `Hola ${pedido.clienteNombre}, gracias por tu compra 🙌\n¿Nos ayudas dejando una reseña de ${productoNombre}?\n${reviewUrl}`
        );
        return `https://wa.me/${telefono}?text=${msg}`;
    };

    const estadisticas = useMemo(() => ESTADOS_ENTREGA.slice(0, 5).map((estado) => ({
        ...estado,
        count: pedidos.filter((pedido) => pedido.estadoEntrega === estado.value).length,
    })), [pedidos]);

    const pedidosFiltrados = useMemo(() => pedidos.filter((p) => {
        if (filtroEstado && p.estadoEntrega !== filtroEstado && p.estado !== filtroEstado) return false;
        if (busqueda) {
            const q = busqueda.toLowerCase();
            const matchNombre = p.clienteNombre.toLowerCase().includes(q);
            const matchCodigo = p.codigoSeguimiento.toLowerCase().includes(q);
            const matchTelefono = p.clienteTelefono.includes(q);
            const matchVendedor = p.vendedorNombre.toLowerCase().includes(q);
            if (!matchNombre && !matchCodigo && !matchTelefono && !matchVendedor) return false;
        }
        if (fechaDesde) {
            const fecha = new Date(p.creadoEn);
            if (fecha < new Date(`${fechaDesde}T00:00:00`)) return false;
        }
        if (fechaHasta) {
            const fecha = new Date(p.creadoEn);
            if (fecha > new Date(`${fechaHasta}T23:59:59`)) return false;
        }
        return true;
    }), [pedidos, filtroEstado, busqueda, fechaDesde, fechaHasta]);

    return {
        loading, pedidos, pedidosFiltrados, estadisticas,
        filtroEstado, setFiltroEstado,
        busqueda, setBusqueda,
        fechaDesde, setFechaDesde,
        fechaHasta, setFechaHasta,
        expandedOrders, newOrdersCount, clearNewOrders,
        cambiarEstado, actualizarPedidoOperativo,
        getEstadoInfo, getEntregaInfo, getAgenciaInfo, getEnvioInfo,
        toggleOrderExpanded,
        buildWhatsappUrl,
        buildReviewWhatsappUrl,
    };
};
