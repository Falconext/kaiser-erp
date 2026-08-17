import { useCallback, useEffect, useMemo, useState } from 'react';
import moment from 'moment';
import apiClient from '@/utils/apiClient';
import useAlertStore from '@/zustand/alert';
import { useAuthStore } from '@/zustand/auth';

export type TipoVenta =
    | 'BOLETA' | 'FACTURA' | 'NOTA_CREDITO' | 'NOTA_DEBITO'
    | 'TICKET' | 'NOTA_VENTA' | 'NOTA_PEDIDO' | 'RECIBO_HONORARIOS' | 'COMP_PAGO' | 'OTRO'
    | 'PEDIDO_TIENDA';

export type EstadoPago = 'PAGADO' | 'PENDIENTE' | 'PARCIAL';
export type EstadoSunat = 'ACEPTADO' | 'PENDIENTE' | 'RECHAZADO' | 'NO_APLICA' | 'ANULADO';
export type EstadoDespacho = 'PREPARANDO' | 'EN_CAMINO' | 'EN_DESTINO' | 'ENTREGADO' | 'DEVUELTO' | 'NO_APLICA';

export interface VentaPanelItem {
    id: number;
    tipo: TipoVenta;
    referencia: string;
    fecha: string;
    clienteDoc: string;
    clienteTelefono: string;
    clienteEmail: string;
    seriesGarantia: string[];
    cliente: string;
    total: number;
    estadoPago: EstadoPago;
    metodoPago: string;
    estadoSunat: EstadoSunat;
    estadoDespacho: EstadoDespacho;
    repartidorId: number | null;
    repartidor: string;
    tipoEnvio: string;
    agenciaDestino: string;
    celularDest: string;
    nroPaquetes: number | null;
    turnoEnvio: string;
    vendedor: string;
    // Cobranza en campo: id del vendedor de campo atribuido (para preseleccionar al cobrar).
    vendedorCampoId?: number | null;
    sede: string;
    comprobanteId: number | null;
    pedidoId: number | null;
    // Conversión informal → formal
    esConvertida: boolean;
    convertidaEn: string | null;
    origenReferencia: string | null;
    // Courier / Shalom
    courier: string;
    nroOrden: string;
    claveOrden: string;
    // Cobros inline
    saldo: number;
    estadoPagoRaw: string;
    formaPagoTipo: string;
    montoDetraccion: number;
    porcentajeDetraccion: number;
    cuotas: any;
    observaciones: string | null;
    // Productos vendidos
    productos: { nombre: string; cantidad: number; precioUnitario: number; unidad: string }[];
}

export type TabVentas = 'TODO' | 'VENTAS' | 'CON_DESPACHO' | 'POR_COBRAR';

const TIPOS_NO_VENTA = new Set(['NOTA_PEDIDO', 'COTIZACION', 'ORDEN_TRABAJO', 'OTRO']);

const tieneSaldoPendiente = (item: VentaPanelItem) => Number(item.saldo ?? 0) > 0.01;
const esDocumentoVisible = (item: VentaPanelItem) => item.tipo !== 'NOTA_CREDITO';
const esVentaFinal = (item: VentaPanelItem) => !item.esConvertida && !TIPOS_NO_VENTA.has(item.tipo);
const esCuentaPorCobrar = (item: VentaPanelItem) => esDocumentoVisible(item) && esVentaFinal(item) && tieneSaldoPendiente(item);

const DESPACHO_TO_PEDIDO: Record<string, { estadoEntrega: string; estadoEnvio: string }> = {
    PREPARANDO: { estadoEntrega: 'CONFIRMADO',           estadoEnvio: 'POR_COORDINAR' },
    EN_CAMINO:  { estadoEntrega: 'EN_TRANSITO',          estadoEnvio: 'EN_REPARTO' },
    EN_DESTINO: { estadoEntrega: 'EN_TRANSITO',          estadoEnvio: 'EN_REPARTO' },
    ENTREGADO:  { estadoEntrega: 'ENTREGADO_COMPLETADO', estadoEnvio: 'ENTREGADO' },
    DEVUELTO:   { estadoEntrega: 'PENDIENTE',            estadoEnvio: 'INCIDENCIA' },
};

export interface RepartidorOpcion {
    id: number | null;
    nombre: string;
}

export function usePanelVentasViewModel() {
    const { auth, sedeActiva } = useAuthStore();
    const { alert } = useAlertStore();

    const [fecha, setFecha] = useState(() => moment().format('YYYY-MM-DD'));
    // Fin del rango (opcional). Vacío = panel de un solo día (comportamiento original).
    const [fechaFin, setFechaFin] = useState('');
    const [items, setItems] = useState<VentaPanelItem[]>([]);
    const [porCobrarGlobal, setPorCobrarGlobal] = useState({ total: 0, cantidad: 0 });
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState<TabVentas>('TODO');
    const [busqueda, setBusqueda] = useState('');
    const [filtroSerie, setFiltroSerie] = useState('');
    const [filtroDni, setFiltroDni] = useState('');
    const [filtroRepartidorId, setFiltroRepartidorId] = useState<number | null | undefined>(undefined);
    const [filtroUsuarioId, setFiltroUsuarioId] = useState<number | null>(null);
    const isAdmin = auth?.rol === 'ADMIN_EMPRESA' || auth?.rol === 'ADMIN_SISTEMA';
    const canFilterByUsuario = isAdmin;
    const esPrincipalAdmin = isAdmin && Boolean(sedeActiva?.esPrincipal);

    const cargar = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({ fecha });
            // Rango: solo se envía si el usuario eligió una fecha final posterior
            if (fechaFin && fechaFin > fecha) params.set('fechaFin', fechaFin);
            // Admins on the principal sede see all sedes; everyone else filters by their sede
            if (sedeActiva?.id && !esPrincipalAdmin) params.set('sedeId', String(sedeActiva.id));
            if (canFilterByUsuario && filtroUsuarioId) params.set('usuarioId', String(filtroUsuarioId));
            // Reporte pesado: damos más margen que el timeout global de 12s
            const { data } = await apiClient.get<any>(`/ventas/panel?${params}`, { timeout: 30_000 });
            const raw = data?.data?.data ?? data?.data ?? [];
            setItems(Array.isArray(raw) ? raw : []);
            const resumenGlobal = data?.data?.resumen?.porCobrarGlobal ?? data?.resumen?.porCobrarGlobal;
            setPorCobrarGlobal({
                total: Number(resumenGlobal?.total ?? 0),
                cantidad: Number(resumenGlobal?.cantidad ?? 0),
            });
        } catch {
            alert('Error al cargar el panel de ventas', 'error');
        } finally {
            setLoading(false);
        }
    }, [fecha, fechaFin, sedeActiva?.id, esPrincipalAdmin, filtroUsuarioId, canFilterByUsuario, alert]);

    useEffect(() => { cargar(); }, [cargar]);

    const repartidoresOpciones = useMemo<RepartidorOpcion[]>(() => {
        const map = new Map<string, RepartidorOpcion>();
        items.forEach((i) => {
            if (i.estadoDespacho === 'NO_APLICA') return;
            const key = i.repartidorId != null ? String(i.repartidorId) : '__sin__';
            if (!map.has(key)) {
                map.set(key, {
                    id: i.repartidorId,
                    nombre: i.repartidorId != null ? i.repartidor : 'Sin asignar',
                });
            }
        });
        return Array.from(map.values());
    }, [items]);

    const filtrados = useMemo(() => {
        const search = busqueda.toLowerCase().trim();
        const serie = filtroSerie.trim().toUpperCase();
        const dni = filtroDni.trim();
        let base = items.filter(esDocumentoVisible);

        if (tab === 'VENTAS') base = base.filter((i) => i.estadoDespacho === 'NO_APLICA' && esVentaFinal(i));
        else if (tab === 'CON_DESPACHO') base = base.filter((i) => i.estadoDespacho !== 'NO_APLICA');
        else if (tab === 'POR_COBRAR') base = base.filter(esCuentaPorCobrar);

        if (filtroRepartidorId !== undefined) {
            base = base.filter((i) =>
                filtroRepartidorId === null
                    ? i.repartidorId == null
                    : i.repartidorId === filtroRepartidorId,
            );
        }

        if (serie) base = base.filter((i) => (i.seriesGarantia ?? []).some((s) => s.toUpperCase().includes(serie)));
        if (dni) base = base.filter((i) => (i.clienteDoc ?? '').includes(dni));

        if (search) {
            base = base.filter(
                (i) =>
                    i.cliente.toLowerCase().includes(search) ||
                    i.referencia.toLowerCase().includes(search) ||
                    i.vendedor.toLowerCase().includes(search) ||
                    i.agenciaDestino.toLowerCase().includes(search) ||
                    i.celularDest.includes(search),
            );
        }

        return base;
    }, [items, tab, busqueda, filtroSerie, filtroDni, filtroRepartidorId]);

    const actualizarEstado = useCallback(async (item: VentaPanelItem, nuevoEstado: string) => {
        try {
            if (item.comprobanteId) {
                await apiClient.put(`/envio-despacho/comprobante/${item.comprobanteId}`, { estado: nuevoEstado });
            } else if (item.pedidoId) {
                const mapped = DESPACHO_TO_PEDIDO[nuevoEstado];
                if (!mapped) return;
                await apiClient.patch(`/tienda/pedidos/${item.pedidoId}/estado`, mapped);
            } else {
                return;
            }
            setItems((prev) =>
                prev.map((i) =>
                    i.id === item.id && i.tipo === item.tipo
                        ? { ...i, estadoDespacho: nuevoEstado as EstadoDespacho }
                        : i,
                ),
            );
            alert('Estado actualizado', 'success');
        } catch {
            alert('Error al actualizar estado', 'error');
        }
    }, [alert]);

    const itemsVisibles = useMemo(() => items.filter(esDocumentoVisible), [items]);
    const countTodo = itemsVisibles.length;
    const countVentas = useMemo(() => itemsVisibles.filter((i) => i.estadoDespacho === 'NO_APLICA' && esVentaFinal(i)).length, [itemsVisibles]);
    const countDespacho = useMemo(() => itemsVisibles.filter((i) => i.estadoDespacho !== 'NO_APLICA').length, [itemsVisibles]);
    const countPorCobrar = useMemo(() => itemsVisibles.filter(esCuentaPorCobrar).length, [itemsVisibles]);
    const ventasDiaFinales = useMemo(() => itemsVisibles.filter(esVentaFinal), [itemsVisibles]);
    const totalVentasDia = useMemo(() => ventasDiaFinales.reduce((s, i) => s + (i.total ?? 0), 0), [ventasDiaFinales]);
    const totalPorCobrarDia = useMemo(() => itemsVisibles.filter(esCuentaPorCobrar).reduce((s, i) => s + (i.saldo ?? 0), 0), [itemsVisibles]);
    // Excluye convertidas y documentos que no son ventas finales (como Notas de Pedido)
    const ventasFinales = useMemo(() => filtrados.filter((i) => !i.esConvertida && !TIPOS_NO_VENTA.has(i.tipo)), [filtrados]);
    const totalVentas = useMemo(() => ventasFinales.reduce((s, i) => s + (i.total ?? 0), 0), [ventasFinales]);
    const totalPorCobrar = useMemo(() => ventasFinales.reduce((s, i) => s + (i.saldo ?? 0), 0), [ventasFinales]);

    // Exporta el rango visible del panel en PDF o Excel (resumen para cierre de mes)
    const [exportando, setExportando] = useState<'pdf' | 'excel' | null>(null);
    const exportarResumen = useCallback(async (formato: 'pdf' | 'excel') => {
        setExportando(formato);
        try {
            const hasta = fechaFin && fechaFin > fecha ? fechaFin : fecha;
            const params = new URLSearchParams({
                tipoComprobante: 'TODOS',
                fechaInicio: fecha,
                fechaFin: hasta,
                formato,
            });
            if (sedeActiva?.id && !esPrincipalAdmin) params.set('sedeId', String(sedeActiva.id));
            if (canFilterByUsuario && filtroUsuarioId) params.set('usuarioId', String(filtroUsuarioId));
            const resp = await apiClient.get(`/comprobante/exportar-resumen?${params.toString()}`, {
                responseType: 'blob',
                timeout: 60_000,
            });
            const url = window.URL.createObjectURL(new Blob([resp.data as any]));
            const link = document.createElement('a');
            link.href = url;
            link.download = `ventas_${fecha}_a_${hasta}.${formato === 'pdf' ? 'pdf' : 'xlsx'}`;
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch {
            alert('No se pudo exportar: verifica que existan ventas en el rango seleccionado', 'error');
        } finally {
            setExportando(null);
        }
    }, [fecha, fechaFin, sedeActiva?.id, esPrincipalAdmin, filtroUsuarioId, canFilterByUsuario, alert]);

    return {
        fecha, setFecha,
        fechaFin, setFechaFin,
        exportando, exportarResumen,
        items, filtrados,
        loading,
        tab, setTab,
        busqueda, setBusqueda,
        filtroSerie, setFiltroSerie,
        filtroDni, setFiltroDni,
        filtroRepartidorId, setFiltroRepartidorId,
        filtroUsuarioId, setFiltroUsuarioId,
        canFilterByUsuario,
        esPrincipalAdmin,
        repartidoresOpciones,
        countTodo, countVentas, countDespacho, countPorCobrar,
        totalVentasDia,
        totalPorCobrarDia,
        totalVentas,
        totalPorCobrar,
        porCobrarGlobal,
        actualizarEstado,
        cargar,
    };
}
