import { useCallback, useEffect, useMemo, useState } from 'react';
import moment from 'moment';
import apiClient from '@/utils/apiClient';
import useAlertStore from '@/zustand/alert';
import { useSedesStore } from '@/zustand/sedes';
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
    // Cobros: a quién se dirigió el pago + comprobantes de pago subidos (registrar cobro).
    dirigidoA?: string;
    cobros?: { monto: number; medioPago: string; fecha: string | null; dirigidoA: string; comprobanteUrl: string | null }[];
    comprobantesPago?: string[];
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
    const [filtroProducto, setFiltroProducto] = useState('');
    const [filtroMetodoPago, setFiltroMetodoPago] = useState('');
    const [filtroRepartidorId, setFiltroRepartidorId] = useState<number | null | undefined>(undefined);
    const [filtroUsuarioId, setFiltroUsuarioId] = useState<number | null>(null);
    const isAdmin = auth?.rol === 'ADMIN_EMPRESA' || auth?.rol === 'ADMIN_SISTEMA';
    const canFilterByUsuario = isAdmin;
    const esPrincipalAdmin = isAdmin && Boolean(sedeActiva?.esPrincipal);

    // Alcance de la vista para el admin parado en la sede principal: por
    // defecto CONSOLIDADO (todas las sedes), que es como se comportó siempre.
    // `null` = todas; un id = solo esa sede. Antes no había forma de acotar y
    // el encabezado decía "Sede Principal" mientras la tabla y los KPIs
    // mostraban todas las sedes, que confundía a los usuarios.
    const [sedeVista, setSedeVista] = useState<number | null>(null);
    const { sedes, listarSedes } = useSedesStore();
    useEffect(() => {
        if (esPrincipalAdmin) void listarSedes();
    }, [esPrincipalAdmin, listarSedes]);
    const sedesOpciones = useMemo(
        () => sedes.map((s: any) => ({ id: s.id as number, nombre: s.nombre as string })),
        [sedes],
    );

    const cargar = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({ fecha });
            // Rango: solo se envía si el usuario eligió una fecha final posterior
            if (fechaFin && fechaFin > fecha) params.set('fechaFin', fechaFin);
            // El admin en la sede principal ve todas por defecto, o solo una si
            // la eligió en el selector; el resto siempre ve la suya.
            if (esPrincipalAdmin) {
                if (sedeVista) params.set('sedeId', String(sedeVista));
            } else if (sedeActiva?.id) {
                params.set('sedeId', String(sedeActiva.id));
            }
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
    }, [fecha, fechaFin, sedeActiva?.id, esPrincipalAdmin, sedeVista, filtroUsuarioId, canFilterByUsuario, alert]);

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

    // Medios de pago presentes en los datos del período: se arma de lo que hay
    // (no de una lista fija) para que también aparezcan los personalizados.
    const metodosPagoOpciones = useMemo(() => {
        const set = new Set<string>();
        items.forEach((i) => {
            const m = String(i.metodoPago ?? '').trim();
            // '—' es el marcador de "sin pago registrado": no es un medio de pago.
            if (m && m !== '—') set.add(m.toUpperCase());
        });
        return Array.from(set).sort();
    }, [items]);

    const filtrados = useMemo(() => {
        const search = busqueda.toLowerCase().trim();
        const serie = filtroSerie.trim().toUpperCase();
        const dni = filtroDni.trim();
        const producto = filtroProducto.trim().toLowerCase();
        const metodoPago = filtroMetodoPago.trim().toUpperCase();
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
        if (producto) base = base.filter((i) => (i.productos ?? []).some((p) => (p.nombre ?? '').toLowerCase().includes(producto)));
        if (metodoPago) base = base.filter((i) => String(i.metodoPago ?? '').trim().toUpperCase() === metodoPago);

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
    }, [items, tab, busqueda, filtroSerie, filtroDni, filtroProducto, filtroMetodoPago, filtroRepartidorId]);

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
    const exportarResumen = useCallback(async (formato: 'pdf' | 'excel', columnas?: string) => {
        setExportando(formato);
        try {
            const hasta = fechaFin && fechaFin > fecha ? fechaFin : fecha;
            const params = new URLSearchParams({
                tipoComprobante: 'TODOS',
                fechaInicio: fecha,
                fechaFin: hasta,
                formato,
            });
            if (esPrincipalAdmin) {
                if (sedeVista) params.set('sedeId', String(sedeVista));
            } else if (sedeActiva?.id) {
                params.set('sedeId', String(sedeActiva.id));
            }
            if (canFilterByUsuario && filtroUsuarioId) params.set('usuarioId', String(filtroUsuarioId));
            // Columnas visibles elegidas por el usuario (para que el Excel coincida con la tabla).
            if (columnas) params.set('columnas', columnas);
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
    }, [fecha, fechaFin, sedeActiva?.id, esPrincipalAdmin, sedeVista, filtroUsuarioId, canFilterByUsuario, alert]);

    // ── Reparto propio / motorizado: resumen del rango (misma sede/fechas del
    // panel) y descarga del Excel con la plantilla de carga masiva del courier.
    const [repartoResumen, setRepartoResumen] = useState<any>(null);
    const [exportandoReparto, setExportandoReparto] = useState(false);
    const paramsReparto = useCallback(() => {
        const hasta = fechaFin && fechaFin > fecha ? fechaFin : fecha;
        const params = new URLSearchParams({ fecha });
        if (hasta !== fecha) params.set('fechaFin', hasta);
        if (esPrincipalAdmin) {
            if (sedeVista) params.set('sedeId', String(sedeVista));
        } else if (sedeActiva?.id) {
            params.set('sedeId', String(sedeActiva.id));
        }
        if (filtroRepartidorId) params.set('repartidorId', String(filtroRepartidorId));
        return { params, hasta };
    }, [fecha, fechaFin, esPrincipalAdmin, sedeVista, sedeActiva?.id, filtroRepartidorId]);

    useEffect(() => {
        let vivo = true;
        const { params } = paramsReparto();
        apiClient.get<any>(`/envio-despacho/reparto/resumen?${params.toString()}`)
            .then(({ data }) => {
                if (!vivo) return;
                const r = data?.data ?? data ?? null;
                setRepartoResumen(r && typeof r === 'object' && 'totales' in r ? r : null);
            })
            .catch(() => { if (vivo) setRepartoResumen(null); });
        return () => { vivo = false; };
    // Se refresca junto con el panel (mismos filtros) y tras guardar un despacho.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [paramsReparto, items]);

    const exportarReparto = useCallback(async () => {
        if (exportandoReparto) return;
        // Sin pedidos de reparto propio en el rango no hay nada que mandar al motorizado.
        if (!repartoResumen || Number(repartoResumen.totales?.pedidos ?? 0) === 0) {
            alert('No hay pedidos de reparto propio en el rango y sede seleccionados', 'warning');
            return;
        }
        setExportandoReparto(true);
        try {
            const { params, hasta } = paramsReparto();
            const resp = await apiClient.get(`/envio-despacho/reparto/exportar?${params.toString()}`, { responseType: 'blob', timeout: 60_000 });
            const url = window.URL.createObjectURL(new Blob([resp.data as any]));
            const link = document.createElement('a');
            link.href = url;
            link.download = `reparto_${fecha}${hasta !== fecha ? `_a_${hasta}` : ''}.xlsx`;
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
            const inc = Number(repartoResumen?.incompletos?.length ?? 0);
            alert(inc > 0 ? `Excel de reparto descargado. ${inc} pedido${inc !== 1 ? 's' : ''} con datos incompletos (ver columna CARGA).` : 'Excel de reparto descargado', inc > 0 ? 'warning' : 'success');
        } catch {
            alert('No se pudo exportar el reparto', 'error');
        } finally {
            setExportandoReparto(false);
        }
    }, [exportandoReparto, paramsReparto, fecha, repartoResumen, alert]);

    return {
        fecha, setFecha,
        fechaFin, setFechaFin,
        exportando, exportarResumen,
        repartoResumen, exportandoReparto, exportarReparto,
        items, filtrados, itemsVisibles,
        loading,
        tab, setTab,
        busqueda, setBusqueda,
        filtroSerie, setFiltroSerie,
        filtroDni, setFiltroDni,
        filtroProducto, setFiltroProducto,
        filtroMetodoPago, setFiltroMetodoPago, metodosPagoOpciones,
        filtroRepartidorId, setFiltroRepartidorId,
        filtroUsuarioId, setFiltroUsuarioId,
        canFilterByUsuario,
        esPrincipalAdmin,
        sedeVista, setSedeVista, sedesOpciones,
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
