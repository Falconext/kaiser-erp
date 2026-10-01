import { useState, useCallback, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Icon } from '@iconify/react';
import moment from 'moment';
import apiClient from '@/utils/apiClient';
import useAlertStore from '@/zustand/alert';
import { useAuthStore } from '@/zustand/auth';
import ShalomTrackingModal from '@/components/ShalomTrackingModal';
import Select from '@/components/Select';
import { Calendar } from '@/components/Date';
import OlvaTrackingModal from '@/components/OlvaTrackingModal';
import AutoScrollTable from '@/components/Autoscrolltable';
import RotuloPrint from './RotuloPrint';
import RotulosLotePrint, { type RotuloLoteItem } from './RotulosLotePrint';
import { ROTULO_FORMATOS, guardarRotuloFormato, leerRotuloFormato, type RotuloFormato } from './rotuloFormato';
import { useInvoiceStore } from '@/zustand/invoices';
import {
    usePanelVentasViewModel,
    VentaPanelItem,
    TabVentas,
    TipoVenta,
    EstadoDespacho,
} from './usePanelVentasViewModel';
import { EditarDespachoModal } from './EditarDespachoModal';
import { ModalTrazabilidad } from './ModalTrazabilidad';
import ModalDetalleComprobante from '@/pages/admin/facturacion/ModalDetalleComprobante';
import ModalEnviarWhatsApp from '@/pages/admin/facturacion/ModalEnviarWhatsApp';
import ModalRegistrarPago from '@/pages/admin/facturacion/ModalRegistrarPago';
import ModalHistorialPagos from '@/pages/admin/facturacion/ModalHistorialPagos';
import ModalDetalleCuenta from '@/pages/admin/facturacion/ModalDetalleCuenta';
import TableActionMenu from '@/components/TableActionMenu';
import ModalConfirm from '@/components/ModalConfirm';
import { useUsersStore } from '@/zustand/users';
import { mapDetalleToInvoiceProduct } from '@/features/admin/facturacion/utils/comprobanteProductMapper';

// ─── Config badges ────────────────────────────────────────────────────────────

const TIPO_CONFIG: Record<TipoVenta, { label: string; cls: string }> = {
    BOLETA:            { label: 'Boleta',    cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
    FACTURA:           { label: 'Factura',   cls: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300' },
    NOTA_CREDITO:      { label: 'N.Crédito', cls: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300' },
    NOTA_DEBITO:       { label: 'N.Débito',  cls: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300' },
    TICKET:            { label: 'Ticket',    cls: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300' },
    NOTA_VENTA:        { label: 'N.Venta',   cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
    NOTA_PEDIDO:       { label: 'N.Pedido',  cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
    RECIBO_HONORARIOS: { label: 'R.Honor.',  cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
    COMP_PAGO:         { label: 'C.Pago',    cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
    OTRO:              { label: 'Otro',      cls: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300' },
    PEDIDO_TIENDA:     { label: 'Tienda',    cls: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300' },
};


/**
 * Si el cliente ya compró antes, y cuántas veces.
 *
 * Se muestra el número de compra y no un sí/no: "3ra compra" le dice al
 * vendedor mucho más que "recurrente" — sabe si tiene delante a alguien que
 * vuelve seguido o a uno que compró dos veces en un año.
 *
 * El conteo es de TODA la historia del cliente con la empresa, no del rango que
 * se está viendo: el panel muestra un día y ahí todos parecerían nuevos.
 */
const recurrencia = (compras: number | undefined) => {
  const n = Number(compras ?? 0);
  // `Number.isFinite` y no `n <= 0`: un NaN pasa de largo las comparaciones y
  // terminaba pintando "NaN compras" en la fila.
  if (!Number.isFinite(n) || n <= 0) return { texto: '—', clase: 'text-gray-400' };
  if (n === 1) return { texto: 'Nuevo', clase: 'bg-blue-50 text-blue-700 border-blue-200' };
  if (n <= 3) return { texto: `${n}ª compra`, clase: 'bg-amber-50 text-amber-700 border-amber-200' };
  return { texto: `${n} compras`, clase: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
};

// Columnas configurables de la tabla de ventas (el usuario elige cuáles ver).
// Las columnas fijas (Fecha, Referencia, Tipo, Cliente, Total, Pago, Vendedor,
// Acciones) siempre se muestran. `sede` solo aplica al admin principal.
const COLUMNAS_CONFIG: { key: string; label: string; soloAdminPrincipal?: boolean }[] = [
    { key: 'sede', label: 'Sede', soloAdminPrincipal: true },
    { key: 'recurrente', label: 'Cliente recurrente' },
    { key: 'saldo', label: 'Saldo' },
    { key: 'mpago', label: 'Medio de pago' },
    { key: 'productos', label: 'Productos' },
    { key: 'sunat', label: 'SUNAT' },
    { key: 'despacho', label: 'Despacho' },
    { key: 'turno', label: 'Turno' },
    { key: 'celular', label: 'Celular' },
    { key: 'agencia', label: 'Agencia' },
    { key: 'paq', label: 'Paquetes' },
    { key: 'repartidor', label: 'Repartidor' },
    { key: 'dirigidoA', label: 'Cobro dirigido a' },
];
const COLUMNAS_OPCIONALES = COLUMNAS_CONFIG.map((c) => c.key);

// Etiquetas de estado de pago — alineadas con Comprobantes/Notas de venta
// ("Pagado" / "Pago parcial" / "Pendiente de pago") para que el usuario vea lo mismo.
const PAGO_CONFIG: Record<string, { label: string; cls: string }> = {
    PAGADO:   { label: 'Pagado',            cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' },
    PARCIAL:  { label: 'Pago parcial',      cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
    PENDIENTE:{ label: 'Pendiente de pago', cls: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' },
};

const SUNAT_CONFIG: Record<string, { label: string; cls: string }> = {
    ACEPTADO: { label: 'Aceptado',  cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' },
    PENDIENTE:{ label: 'Pendiente', cls: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300' },
    RECHAZADO:{ label: 'Rechazado', cls: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' },
    ANULADO:  { label: 'Anulado',   cls: 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400' },
    NO_APLICA:{ label: '—',         cls: 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500' },
};

const ESTADOS_DESPACHO: { value: EstadoDespacho; label: string }[] = [
    { value: 'PREPARANDO', label: 'Preparando' },
    { value: 'EN_CAMINO',  label: 'En camino' },
    { value: 'EN_DESTINO', label: 'En destino' },
    { value: 'ENTREGADO',  label: 'Entregado' },
    { value: 'DEVUELTO',   label: 'Devuelto' },
];

const DESPACHO_CLS: Record<EstadoDespacho, string> = {
    PREPARANDO: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
    EN_CAMINO:  'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    EN_DESTINO: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300',
    ENTREGADO:  'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
    DEVUELTO:   'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
    NO_APLICA:  'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500',
};

// ─── Small components ─────────────────────────────────────────────────────────

function Badge({ label, cls }: { label: string; cls: string }) {
    return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap ${cls}`}>
            {label}
        </span>
    );
}

function TabBtn({ active, onClick, label, count, variant = 'blue' }: {
    active: boolean; onClick: () => void; label: string; count: number;
    variant?: 'blue' | 'orange';
}) {
    const activeCls = variant === 'orange'
        ? '!bg-orange-500 text-white shadow-md shadow-orange-200/50 dark:shadow-orange-900/30 border-none'
        : '!bg-blue-500 text-white shadow-md shadow-blue-200/50 border-none';
    const activeBadgeCls = variant === 'orange' ? 'bg-white text-orange-600' : 'bg-white text-blue-600';
    return (
        <button
            onClick={onClick}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${
                active
                    ? activeCls
                    : 'bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700'
            }`}
        >
            {label}
            <span className={`min-w-[22px] h-5 px-1.5 flex items-center justify-center rounded-full text-xs font-bold ${
                active ? activeBadgeCls : 'bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-gray-400'
            }`}>
                {count}
            </span>
        </button>
    );
}

function KpiCard({ label, value, detail, icon, tone }: {
    label: string;
    value: string;
    detail: string;
    icon: string;
    tone: 'emerald' | 'red' | 'amber' | 'blue';
}) {
    const styles = {
        emerald: 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-900/40',
        red: 'bg-red-50 text-red-700 border-red-100 dark:bg-red-900/20 dark:text-red-300 dark:border-red-900/40',
        amber: 'bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-900/40',
        blue: 'bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-900/40',
    }[tone];

    return (
        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-[#111827]">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.14em] text-gray-400 dark:text-slate-500">{label}</p>
                    <p className="mt-1 text-xl font-black text-gray-900 dark:text-white">{value}</p>
                    <p className="mt-1 text-xs font-medium text-gray-500 dark:text-slate-400">{detail}</p>
                </div>
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${styles}`}>
                    <Icon icon={icon} width={20} />
                </span>
            </div>
        </div>
    );
}

// Dropdown selector de estado inline para filas con despacho
function EstadoDespachoSelector({ item, onChange }: {
    item: VentaPanelItem;
    onChange: (item: VentaPanelItem, nuevoEstado: string) => void;
}) {
    if (item.estadoDespacho === 'NO_APLICA') {
        return <Badge label="—" cls={DESPACHO_CLS.NO_APLICA} />;
    }
    return (
        <select
            value={item.estadoDespacho}
            onChange={(e) => onChange(item, e.target.value)}
            className={`text-[10px] font-bold rounded-full px-2 py-0.5 border-none outline-none cursor-pointer ${DESPACHO_CLS[item.estadoDespacho] ?? DESPACHO_CLS.PREPARANDO}`}
        >
            {ESTADOS_DESPACHO.map((e) => (
                <option key={e.value} value={e.value}>{e.label}</option>
            ))}
        </select>
    );
}

// ─── Conversion helpers ───────────────────────────────────────────────────────

const TIPOS_INFORMALES = new Set<TipoVenta>([
    'TICKET', 'NOTA_VENTA', 'NOTA_PEDIDO', 'RECIBO_HONORARIOS', 'COMP_PAGO', 'OTRO',
]);

function mapProductosComprobante(comprobante: any) {
    return Array.isArray(comprobante?.detalles)
        ? comprobante.detalles.map(mapDetalleToInvoiceProduct)
        : [];
}

// ─── Shalom ───────────────────────────────────────────────────────────────────

const SHALOM_COURIERS = new Set(['SHALOM_PRO', 'SHALOM_COD']);
// Documentos a los que no tiene sentido coordinar un envío desde el panel.
const TIPOS_NO_ENVIABLES = new Set(['COT', '07', '08', 'PEDIDO_TIENDA']);
const OLVA_COURIER = 'OLVA';


// ─── Main view ────────────────────────────────────────────────────────────────

export default function PanelVentasView() {
    const vm = usePanelVentasViewModel();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { alert } = useAlertStore();
    const { usuarios, getAllUsers } = useUsersStore();
    const queryFecha = searchParams.get('fecha');
    const queryComprobanteId = Number(searchParams.get('comprobanteId') || 0) || null;

    // ── Configuración de columnas visibles (persistida por usuario) ──────────────
    const [visibleCols, setVisibleCols] = useState<Record<string, boolean>>(() => {
        const defaults: Record<string, boolean> = {};
        COLUMNAS_CONFIG.forEach((c) => { defaults[c.key] = true; });
        try {
            // Migra la preferencia antigua de productos si existía.
            const legacy = localStorage.getItem('panel_mostrar_productos');
            if (legacy === 'false') defaults.productos = false;
            const saved = localStorage.getItem('panel_columnas');
            if (saved) return { ...defaults, ...JSON.parse(saved) };
        } catch { /* usa defaults */ }
        return defaults;
    });
    // El componente Calendar entrega la fecha en DD/MM/YYYY; el VM trabaja en
    // YYYY-MM-DD. Reemplaza a los <input type="date"> nativos para usar el
    // mismo datepicker que el resto del sistema.
    const handleFecha = (date: string, name: string) => {
        const iso = date ? moment(date, 'DD/MM/YYYY').format('YYYY-MM-DD') : '';
        if (name === 'fecha') {
            if (iso) vm.setFecha(iso); // la fecha de inicio siempre debe tener valor
        } else if (name === 'fechaFin') {
            vm.setFechaFin(iso); // vacío = quitar rango (un solo día)
        }
    };

    const [showColsMenu, setShowColsMenu] = useState(false);
    const [showFiltrosMenu, setShowFiltrosMenu] = useState(false);
    // El Select del proyecto espera {id, value}; el id 0 representa "todas".
    const sedesSelectOptions = [
        { id: 0, value: 'Todas las sedes (consolidado)' },
        ...vm.sedesOpciones.map((x: { id: number; nombre: string }) => ({ id: x.id, value: x.nombre })),
    ];
    // Contador para el badge: cuántos filtros secundarios están puestos.
    // La sede no cuenta acá porque tiene su propio selector siempre visible.
    const filtrosActivos =
        (vm.filtroRepartidorId !== undefined ? 1 : 0) +
        (vm.filtroUsuarioId ? 1 : 0) +
        (vm.filtroProducto ? 1 : 0) +
        (vm.filtroMetodoPago ? 1 : 0) +
        (vm.filtroSerie ? 1 : 0) +
        (vm.filtroDni ? 1 : 0);
    const limpiarFiltros = () => {
        vm.setFiltroRepartidorId(undefined);
        vm.setFiltroUsuarioId(null);
        vm.setFiltroProducto('');
        vm.setFiltroMetodoPago('');
        vm.setFiltroSerie('');
        vm.setFiltroDni('');
    };
    // Fila cuyo popover "ver más productos" está abierto (key = `${tipo}-${id}`).
    const [prodPopover, setProdPopover] = useState<string | null>(null);
    const col = (key: string) => visibleCols[key] !== false;
    const toggleCol = (key: string) => {
        setVisibleCols((prev) => {
            const next = { ...prev, [key]: prev[key] === false };
            localStorage.setItem('panel_columnas', JSON.stringify(next));
            return next;
        });
    };
    const resetCols = () => {
        const all: Record<string, boolean> = {};
        COLUMNAS_CONFIG.forEach((c) => { all[c.key] = true; });
        localStorage.setItem('panel_columnas', JSON.stringify(all));
        setVisibleCols(all);
    };
    // Alias para no tocar todas las referencias existentes a "mostrarProductos".
    const mostrarProductos = col('productos');
    // CSV de columnas opcionales visibles, para que el export coincida con la tabla.
    const columnasVisiblesCSV = COLUMNAS_OPCIONALES.filter((k) => col(k)).join(',');
    // Total de columnas visibles (para colSpan de estados vacíos/carga).
    const totalCols =
        8 + // fijas: fecha, referencia, tipo, cliente, total, pago, vendedor, acciones
        (vm.esPrincipalAdmin && col('sede') ? 1 : 0) +
        COLUMNAS_OPCIONALES.filter((k) => k !== 'sede' && col(k)).length;

    const [detalleId, setDetalleId] = useState<number | null>(null);
    const [editDespachoId, setEditDespachoId] = useState<number | null>(null);
    const [confirmDespachoItem, setConfirmDespachoItem] = useState<VentaPanelItem | null>(null);
    // Pedido de tienda pendiente de pago: confirmación antes de marcarlo cobrado.
    const [confirmPagoPedido, setConfirmPagoPedido] = useState<VentaPanelItem | null>(null);

    // Los pedidos de tienda no tienen comprobante (comprobanteId = null): sus
    // acciones van contra /tienda/pedidos, igual que el módulo Tienda → Pedidos.
    const marcarPedidoPagado = useCallback(async (item: VentaPanelItem) => {
        if (!item.pedidoId) return;
        try {
            await apiClient.patch(`/tienda/pedidos/${item.pedidoId}/estado`, {
                estado: 'CONFIRMADO',
                montoPagado: item.total,
            });
            useAlertStore.getState().alert(`Pedido ${item.referencia} marcado como pagado`, 'success');
            vm.cargar();
        } catch (e: any) {
            useAlertStore.getState().alert(e?.response?.data?.message || 'No se pudo registrar el pago del pedido', 'error');
        }
    }, [vm]);

    // Venta emitida sin coordinación de envío (Despacho "—"): se crea el
    // despacho aquí mismo y se abre el modal para completarlo (courier,
    // agencia, destinatario). Antes no había forma de hacerlo desde el panel.
    // Abrir el modal NO crea el seguimiento: el despacho nace recién al guardar con
    // destino (antes, con solo abrirlo la venta ya quedaba "con despacho").
    const coordinarEnvio = useCallback((item: VentaPanelItem) => {
        if (!item.comprobanteId) return;
        setEditDespachoId(item.comprobanteId);
    }, []);

    const whatsappPedido = (item: VentaPanelItem) => {
        const digits = String(item.clienteTelefono || item.celularDest || "").replace(/\D/g, '');
        if (!digits) {
            useAlertStore.getState().alert('El pedido no tiene celular del cliente', 'warning');
            return;
        }
        const telefono = digits.startsWith('51') ? digits : `51${digits}`;
        const seguimiento = `${window.location.origin}/tienda/seguimiento?codigo=${encodeURIComponent(item.referencia)}`;
        const saldo = Number(item.saldo ?? 0);
        const msg = encodeURIComponent(
            `Hola ${item.cliente}, te escribimos por tu pedido ${item.referencia} (S/ ${Number(item.total).toFixed(2)}).` +
            (saldo > 0.01 ? `\nTiene un saldo pendiente de S/ ${saldo.toFixed(2)}.` : '') +
            `\nSeguimiento: ${seguimiento}\nGracias por tu preferencia.`
        );
        window.open(`https://wa.me/${telefono}?text=${msg}`, '_blank', 'noopener');
    };
    const [trazabilidadItem, setTrazabilidadItem] = useState<VentaPanelItem | null>(null);
    const [waItem, setWaItem] = useState<VentaPanelItem | null>(null);
    const [pagoItem, setPagoItem] = useState<VentaPanelItem | null>(null);
    const [historialItem, setHistorialItem] = useState<VentaPanelItem | null>(null);
    const [detalleCuentaItem, setDetalleCuentaItem] = useState<VentaPanelItem | null>(null);
    const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
    const [menuItem, setMenuItem] = useState<VentaPanelItem | null>(null);
    const [shalomTracking, setShalomTracking] = useState<{ orderNumber: string; orderCode: string; item: VentaPanelItem } | null>(null);
    const [olvaTracking, setOlvaTracking] = useState<{ trackingNumber: string; item: VentaPanelItem } | null>(null);
    const [anularItem, setAnularItem] = useState<VentaPanelItem | null>(null);
    const [rotuloPrintComprobanteId, setRotuloPrintComprobanteId] = useState<number | null>(null);
    // Rótulos en lote: los despachos "Preparando" que se ven en la tabla
    // (respeta pestaña, búsqueda y filtros; cualquier courier), un rótulo por página.
    const [rotulosLote, setRotulosLote] = useState<RotuloLoteItem[]>([]);
    // Formato del rótulo (ticket 80 mm o etiqueta 80×50): es de la caja/impresora,
    // se recuerda en este navegador por empresa.
    const empresaIdRotulo = useAuthStore((st) => (st.auth as any)?.empresa?.id ?? (st.auth as any)?.empresaId);
    const [rotuloFormato, setRotuloFormatoState] = useState<RotuloFormato>(() => leerRotuloFormato(empresaIdRotulo));
    const setRotuloFormato = (f: RotuloFormato) => { setRotuloFormatoState(f); guardarRotuloFormato(empresaIdRotulo, f); };
    const preparandoParaRotulo = useMemo<RotuloLoteItem[]>(
        () => vm.filtrados
            .filter((i) => i.comprobanteId && i.estadoDespacho === 'PREPARANDO')
            .map((i) => ({
                comprobanteId: i.comprobanteId as number,
                referencia: i.referencia,
                courier: i.courier || '',
                celular: i.celularDest && i.celularDest !== '—' ? i.celularDest : (i.clienteTelefono || ''),
            })),
        [vm.filtrados],
    );
    const { cancelInvoice } = useInvoiceStore((s) => s);

    useEffect(() => {
        if (vm.canFilterByUsuario) {
            getAllUsers({ page: 1, limit: 200 });
        }
    }, [vm.canFilterByUsuario, getAllUsers]);

    useEffect(() => {
        if (queryFecha && moment(queryFecha, 'YYYY-MM-DD', true).isValid() && queryFecha !== vm.fecha) {
            vm.setFecha(queryFecha);
        }
    }, [queryFecha, vm.fecha, vm.setFecha]);

    const filasVisibles = queryComprobanteId
        ? vm.filtrados.filter((item) => item.comprobanteId === queryComprobanteId)
        : vm.filtrados;

    // Paginación (client-side) de la tabla de ventas.
    const PAGE_SIZE = 20;
    const [page, setPage] = useState(1);
    useEffect(() => { setPage(1); }, [vm.tab, vm.filtroUsuarioId, vm.busqueda, vm.filtroProducto, vm.fecha, vm.fechaFin, filasVisibles.length]);
    const totalPages = Math.max(1, Math.ceil(filasVisibles.length / PAGE_SIZE));
    const filasPagina = filasVisibles.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    const handleOpenMenu = (e: React.MouseEvent<HTMLElement>, item: VentaPanelItem) => {
        e.stopPropagation();
        setMenuAnchor(e.currentTarget);
        setMenuItem(item);
    };
    const handleCloseMenu = () => {
        setMenuAnchor(null);
        setMenuItem(null);
    };

    const parseSerie = (ref: string) => ref.split('-')[0] ?? ref;
    const parseCorrelativo = (ref: string) => {
        const parts = ref.split('-');
        return parts.length > 1 ? parseInt(parts[parts.length - 1], 10) || 0 : 0;
    };

    const toComprobanteObj = (item: VentaPanelItem) => ({
        id: item.comprobanteId,
        serie: parseSerie(item.referencia),
        correlativo: parseCorrelativo(item.referencia),
        mtoImpVenta: item.total,
        saldo: item.saldo,
        estadoPago: item.estadoPagoRaw,
        fechaEmision: item.fecha,
        formaPagoTipo: item.formaPagoTipo,
        montoDetraccion: item.montoDetraccion,
        porcentajeDetraccion: item.porcentajeDetraccion,
        cuotas: item.cuotas,
        observaciones: item.observaciones,
        cliente: { nombre: item.cliente, nroDoc: null },
        comprobante: TIPO_CONFIG[item.tipo]?.label ?? item.tipo,
        // Cobranza en campo: para preseleccionar el vendedor de campo al registrar el cobro.
        vendedorCampoId: item.vendedorCampoId ?? null,
        vendedorCampoNombre: item.vendedor,
    });

    const puedeRegistrarCobro = (item: VentaPanelItem) =>
        item.comprobanteId !== null && (item.estadoPago === 'PARCIAL' || item.estadoPago === 'PENDIENTE');

    // Guarda: ¿se puede convertir este comprobante informal a boleta/factura?
    const puedeDocumentarComprobante = (item: VentaPanelItem) =>
        item.comprobanteId !== null &&
        TIPOS_INFORMALES.has(item.tipo) &&
        !item.esConvertida &&
        item.estadoPago === 'PAGADO';

    // Guarda: ¿se puede documentar este pedido de tienda?
    const puedeDocumentarPedidoTienda = (item: VentaPanelItem) =>
        item.tipo === 'PEDIDO_TIENDA' &&
        item.estadoPago === 'PAGADO';

    const convertirComprobante = useCallback(async (item: VentaPanelItem, defaultType: 'BOLETA' | 'FACTURA') => {
        if (!item.comprobanteId) return;
        try {
            const { data } = await apiClient.get<any>(`/comprobante/${item.comprobanteId}`);
            const comp = data?.data ?? data;
            const cliente = comp?.cliente || null;
            const esRuc = String(cliente?.nroDoc || '').length === 11;
            navigate('/administrador/facturacion/nuevo', {
                state: {
                    defaultType,
                    fromNotaDeVenta: true,
                    notaDeVentaData: {
                        origenComprobanteId: item.comprobanteId,
                        cliente: defaultType === 'FACTURA' && !esRuc ? null : cliente,
                        clienteId: defaultType === 'FACTURA' && !esRuc ? null : comp?.clienteId,
                        observaciones: comp?.observaciones,
                        productos: mapProductosComprobante(comp),
                    },
                },
            });
        } catch {
            alert('No se pudo cargar el comprobante para convertirlo', 'error');
        }
    }, [navigate, alert]);

    const convertirGuiaComprobante = useCallback(async (item: VentaPanelItem) => {
        if (!item.comprobanteId) return;
        try {
            const { data } = await apiClient.get<any>(`/comprobante/${item.comprobanteId}`);
            const comp = data?.data ?? data;
            navigate('/administrador/facturacion/guia-remision', {
                state: {
                    fromDespachoComprobante: true,
                    comprobanteGuia: {
                        id: item.comprobanteId,
                        referencia: item.referencia,
                        clienteNombre: comp?.cliente?.nombre || item.cliente,
                        clienteNroDoc: comp?.cliente?.nroDoc || '10000000',
                        clienteDireccion: item.agenciaDestino && item.agenciaDestino !== '—' ? item.agenciaDestino : comp?.cliente?.direccion || '',
                        agenciaEnvio: item.tipoEnvio,
                        items: mapProductosComprobante(comp),
                    },
                },
            });
        } catch {
            alert('No se pudo cargar el comprobante para generar la guía', 'error');
        }
    }, [navigate, alert]);

    /**
     * Rótulo propio (no el PDF con la marca de Shalom): solo el bloque de
     * destinatario/destino, con el formato de ticket que ya usan los demás
     * comprobantes. `RotuloPrint` hace el fetch y dispara la impresión sola
     * apenas tiene los datos.
     */
    const imprimirRotuloShalom = useCallback((item: VentaPanelItem) => {
        if (!item.comprobanteId) return;
        setRotuloPrintComprobanteId(item.comprobanteId);
    }, []);

    const convertirPedidoTienda = useCallback(async (item: VentaPanelItem, defaultType: 'BOLETA' | 'FACTURA') => {
        if (!item.pedidoId) return;
        try {
            const { data } = await apiClient.get<any>(`/tienda/pedidos/${item.pedidoId}`);
            const pedido = data?.data ?? data;
            navigate('/administrador/facturacion/nuevo', {
                state: {
                    defaultType,
                    defaultClient: 'CLIENTES_VARIOS',
                    fromPedidoTienda: true,
                    pedidoTiendaData: {
                        id: item.pedidoId,
                        codigoSeguimiento: item.referencia,
                        clienteNombre: item.cliente,
                        clienteTelefono: item.celularDest || '',
                        clienteDireccion: item.agenciaDestino && item.agenciaDestino !== '—' ? item.agenciaDestino : '',
                        tipoEntrega: 'ENVIO',
                        estadoEntrega: item.estadoDespacho === 'ENTREGADO' ? 'ENTREGADO_COMPLETADO' : 'CONFIRMADO',
                        estadoEnvio: item.estadoDespacho,
                        agenciaEnvio: item.tipoEnvio,
                        total: item.total,
                        montoPagado: item.total,
                        saldoPendiente: 0,
                        items: pedido?.items || pedido?.detalles || [],
                    },
                },
            });
        } catch {
            alert('No se pudo cargar el pedido para convertirlo', 'error');
        }
    }, [navigate, alert]);

    const convertirGuiaPedidoTienda = useCallback(async (item: VentaPanelItem) => {
        if (!item.pedidoId) return;
        navigate('/administrador/facturacion/guia-remision', {
            state: {
                fromPedidoTienda: true,
                pedidoTiendaGuia: {
                    id: item.pedidoId,
                    codigoSeguimiento: item.referencia,
                    clienteNombre: item.cliente,
                    clienteTelefono: item.celularDest || '',
                    clienteDireccion: item.agenciaDestino && item.agenciaDestino !== '—' ? item.agenciaDestino : '',
                    tipoEntrega: 'ENVIO',
                    estadoEnvio: item.estadoDespacho,
                    agenciaEnvio: item.tipoEnvio,
                    total: item.total,
                    montoPagado: item.total,
                    saldoPendiente: 0,
                    items: [],
                },
            },
        });
    }, [navigate]);

    const TABS: { key: TabVentas; label: string; count: number; variant?: 'blue' | 'orange' }[] = [
        { key: 'TODO',         label: 'Todo',         count: vm.countTodo },
        { key: 'VENTAS',       label: 'Ventas',       count: vm.countVentas },
        { key: 'CON_DESPACHO', label: 'Con despacho', count: vm.countDespacho },
        { key: 'POR_COBRAR',   label: 'Por cobrar',   count: vm.countPorCobrar, variant: 'orange' },
    ];
    const vendedoresOptions = usuarios.filter((u) => u.estado === 'ACTIVO');
    const totalVentasDia = Number(vm.totalVentasDia ?? 0);
    const totalPorCobrarDia = Number(vm.totalPorCobrarDia ?? 0);
    const porCobrarGlobalTotal = Number(vm.porCobrarGlobal?.total ?? 0);
    const porCobrarGlobalCantidad = Number(vm.porCobrarGlobal?.cantidad ?? 0);

    const kpis = [
        {
            label: 'Vendido hoy',
            value: `S/ ${totalVentasDia.toFixed(2)}`,
            detail: `${vm.countTodo ?? 0} registro${(vm.countTodo ?? 0) !== 1 ? 's' : ''} del día`,
            icon: 'solar:wallet-money-bold-duotone',
            tone: 'emerald' as const,
        },
        {
            label: 'Por cobrar hoy',
            value: `S/ ${totalPorCobrarDia.toFixed(2)}`,
            detail: `${vm.countPorCobrar ?? 0} venta${(vm.countPorCobrar ?? 0) !== 1 ? 's' : ''} con saldo hoy`,
            icon: 'solar:bill-list-bold-duotone',
            tone: totalPorCobrarDia > 0 ? 'red' as const : 'blue' as const,
        },
        {
            label: 'Pendiente total',
            value: `S/ ${porCobrarGlobalTotal.toFixed(2)}`,
            detail: `${porCobrarGlobalCantidad} cuenta${porCobrarGlobalCantidad !== 1 ? 's' : ''} acumulada${porCobrarGlobalCantidad !== 1 ? 's' : ''}`,
            icon: 'solar:alarm-bold-duotone',
            tone: porCobrarGlobalTotal > 0 ? 'amber' as const : 'blue' as const,
        },
        {
            label: 'Con despacho',
            value: String(vm.countDespacho),
            detail: 'Ventas del día con seguimiento',
            icon: 'solar:delivery-bold-duotone',
            tone: 'blue' as const,
        },
    ];

    return (
        <div className="p-4 md:p-6 space-y-4">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <h1 className="text-xl font-extrabold text-gray-900 dark:text-white">Panel de Ventas</h1>
                    <p className="text-sm text-gray-500 dark:text-slate-400">
                        {vm.fechaFin && vm.fechaFin > vm.fecha
                            ? 'Resumen del rango seleccionado y deuda pendiente acumulada.'
                            : 'Resumen del día seleccionado y deuda pendiente acumulada.'}
                        {/* El alcance se dice explícitamente: los KPIs y la tabla
                            cambian con él, y antes no había forma de saberlo. */}
                        {vm.esPrincipalAdmin && (
                            <span className="font-semibold">
                                {' '}Mostrando{' '}
                                {vm.sedeVista
                                    ? vm.sedesOpciones.find((s: { id: number; nombre: string }) => s.id === vm.sedeVista)?.nombre ?? 'una sede'
                                    : 'todas las sedes'}.
                            </span>
                        )}
                    </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    <button
                        onClick={() => vm.setFecha(moment(vm.fecha).subtract(1, 'day').format('YYYY-MM-DD'))}
                        className="h-10 w-10 grid place-items-center rounded-lg bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-500 hover:bg-gray-50 dark:hover:bg-slate-700 transition"
                        title="Día anterior"
                    >
                        <Icon icon="solar:arrow-left-linear" className="text-lg" />
                    </button>
                    <div className="w-40 shrink-0">
                        <Calendar
                            name="fecha"
                            value={vm.fecha ? moment(vm.fecha).format('DD/MM/YYYY') : ''}
                            onChange={handleFecha}
                            className="admin-date-filter"
                            portal
                        />
                    </div>
                    <span className="text-xs font-medium text-gray-400 dark:text-slate-500">hasta</span>
                    <div className="w-40 shrink-0">
                        <Calendar
                            name="fechaFin"
                            value={vm.fechaFin ? moment(vm.fechaFin).format('DD/MM/YYYY') : ''}
                            onChange={handleFecha}
                            className="admin-date-filter"
                            portal
                        />
                    </div>
                    {vm.fechaFin && (
                        <button
                            onClick={() => vm.setFechaFin('')}
                            className="h-10 w-10 grid place-items-center rounded-lg bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-400 hover:text-rose-500 hover:bg-gray-50 dark:hover:bg-slate-700 transition"
                            title="Quitar rango (volver a un solo día)"
                        >
                            <Icon icon="solar:close-circle-linear" className="text-lg" />
                        </button>
                    )}
                    <button
                        onClick={() => vm.setFecha(moment(vm.fecha).add(1, 'day').format('YYYY-MM-DD'))}
                        className="h-10 w-10 grid place-items-center rounded-lg bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-500 hover:bg-gray-50 dark:hover:bg-slate-700 transition"
                        title="Día siguiente"
                    >
                        <Icon icon="solar:arrow-right-linear" className="text-lg" />
                    </button>
                    <button
                        onClick={vm.cargar}
                        className="h-10 w-10 grid place-items-center rounded-lg bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-500 hover:bg-gray-50 dark:hover:bg-slate-700 transition"
                        title="Recargar"
                    >
                        <Icon icon="solar:refresh-linear" className={`text-lg ${vm.loading ? 'animate-spin' : ''}`} />
                    </button>
                    <button
                        onClick={() => vm.exportarResumen('pdf', columnasVisiblesCSV)}
                        disabled={vm.exportando !== null}
                        className="inline-flex items-center gap-1.5 h-10 px-3 rounded-lg bg-white dark:bg-slate-800 border border-rose-200 dark:border-slate-700 text-rose-600 dark:text-rose-300 text-sm font-semibold hover:bg-rose-50 dark:hover:bg-slate-700 transition disabled:opacity-50"
                        title="Exportar el rango en PDF imprimible"
                    >
                        <Icon icon={vm.exportando === 'pdf' ? 'svg-spinners:180-ring' : 'solar:file-text-bold-duotone'} className="text-lg" />
                        PDF
                    </button>
                    <button
                        onClick={() => vm.exportarResumen('excel', columnasVisiblesCSV)}
                        disabled={vm.exportando !== null}
                        className="inline-flex items-center gap-1.5 h-10 px-3 rounded-lg bg-white dark:bg-slate-800 border border-emerald-200 dark:border-slate-700 text-emerald-600 dark:text-emerald-300 text-sm font-semibold hover:bg-emerald-50 dark:hover:bg-slate-700 transition disabled:opacity-50"
                        title="Exportar el rango en Excel"
                    >
                        <Icon icon={vm.exportando === 'excel' ? 'svg-spinners:180-ring' : 'solar:document-add-bold-duotone'} className="text-lg" />
                        Excel
                    </button>
                    <button
                        type="button"
                        onClick={vm.exportarReparto}
                        disabled={vm.exportandoReparto}
                        className="inline-flex items-center gap-1.5 h-10 px-3 rounded-lg bg-white dark:bg-slate-800 border border-fuchsia-200 dark:border-slate-700 text-fuchsia-600 dark:text-fuchsia-300 text-sm font-semibold hover:bg-fuchsia-50 dark:hover:bg-slate-700 transition disabled:opacity-50"
                        title="Descargar el Excel del reparto propio (formato de carga masiva del motorizado) para el rango seleccionado"
                        data-testid="btn-exportar-reparto"
                    >
                        <Icon icon={vm.exportandoReparto ? 'svg-spinners:180-ring' : 'solar:scooter-bold-duotone'} className="text-lg" />
                        Reparto
                    </button>
                </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {kpis.map((kpi) => (
                    <KpiCard key={kpi.label} {...kpi} />
                ))}
            </div>

            {/* Reparto propio / motorizado: resumen del rango (solo si hay despachos propios) */}
            {vm.repartoResumen && (Number(vm.repartoResumen.totales?.pedidos ?? 0) > 0 || (vm.repartoResumen.otrasFechas?.length ?? 0) > 0) && (
                <div className="rounded-2xl border border-fuchsia-200 bg-fuchsia-50/60 p-4 dark:border-fuchsia-900/40 dark:bg-fuchsia-950/10" data-testid="reparto-resumen">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-[11px] font-black uppercase tracking-widest text-fuchsia-700 dark:text-fuchsia-300 flex items-center gap-1.5">
                            <Icon icon="solar:scooter-bold-duotone" className="text-base" />
                            Reparto propio · {moment(vm.fecha).format('DD/MM')}{vm.fechaFin && vm.fechaFin > vm.fecha ? ` – ${moment(vm.fechaFin).format('DD/MM')}` : ''}
                            <span className="ml-1 font-semibold normal-case tracking-normal text-fuchsia-500/80 dark:text-fuchsia-300/70">(por fecha de entrega)</span>
                        </p>
                        {Number(vm.repartoResumen.incompletos?.length ?? 0) > 0 && (
                            <span className="text-[11px] font-bold text-amber-700 dark:text-amber-400 flex items-center gap-1">
                                <Icon icon="solar:danger-triangle-bold" />
                                {vm.repartoResumen.incompletos.length} con datos incompletos: {vm.repartoResumen.incompletos.slice(0, 3).map((i: any) => i.documento).join(', ')}{vm.repartoResumen.incompletos.length > 3 ? '…' : ''}
                            </span>
                        )}
                    </div>
                    <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {[
                            { label: 'Pedidos', value: vm.repartoResumen.totales.pedidos },
                            { label: 'Contraentrega', value: vm.repartoResumen.totales.contraentrega },
                            { label: 'A cobrar (S/)', value: Number(vm.repartoResumen.totales.montoCobrar).toFixed(2) },
                            { label: 'Entregados', value: vm.repartoResumen.totales.entregados },
                        ].map((k) => (
                            <div key={k.label} className="rounded-xl bg-white/80 dark:bg-slate-900/40 px-3 py-2">
                                <p className="text-lg font-black text-slate-900 dark:text-white leading-tight">{k.value}</p>
                                <p className="text-[11px] text-slate-500">{k.label}</p>
                            </div>
                        ))}
                    </div>
                    {Array.isArray(vm.repartoResumen.porDistrito) && vm.repartoResumen.porDistrito.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                            {vm.repartoResumen.porDistrito.slice(0, 8).map((d: any) => (
                                <span key={d.nombre} className="rounded-lg bg-white dark:bg-slate-800 border border-fuchsia-100 dark:border-fuchsia-900/40 px-2 py-0.5 text-[11px] font-semibold text-slate-700 dark:text-slate-200">
                                    {d.nombre} · {d.pedidos}{d.montoCobrar > 0 ? ` · S/ ${Number(d.montoCobrar).toFixed(2)}` : ''}
                                </span>
                            ))}
                        </div>
                    )}
                    {Array.isArray(vm.repartoResumen.otrasFechas) && vm.repartoResumen.otrasFechas.length > 0 && (
                        <p className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-600 dark:text-slate-300" data-testid="reparto-otras-fechas">
                            <Icon icon="solar:calendar-mark-bold-duotone" className="text-fuchsia-500" />
                            Por entregar otro día (no salen en este Excel):
                            {vm.repartoResumen.otrasFechas.map((o: any) => (
                                <button key={o.fecha} type="button"
                                    onClick={() => { vm.setFecha(o.fecha); vm.setFechaFin(''); }}
                                    title="Ver ese día"
                                    className="rounded-lg border border-fuchsia-200 bg-white px-2 py-0.5 font-bold text-fuchsia-700 hover:bg-fuchsia-100 dark:border-fuchsia-900/40 dark:bg-slate-800 dark:text-fuchsia-300">
                                    {moment(o.fecha).format('DD/MM')} · {o.pedidos}
                                </button>
                            ))}
                        </p>
                    )}
                </div>
            )}

            {/* Tabs + filtros */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-wrap">
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                    {TABS.map((t) => (
                        <TabBtn key={t.key} active={vm.tab === t.key} onClick={() => vm.setTab(t.key)} label={t.label} count={t.count} variant={t.variant} />
                    ))}
                </div>
                <div className="flex gap-2 flex-wrap ml-auto items-center">
                    {/* Alcance por sede: el admin de la sede principal ve TODAS por defecto.
                        Antes no había forma de acotar y el encabezado decía "Sede Principal"
                        mientras la tabla y los KPIs mostraban todas las sedes. */}
                    {vm.esPrincipalAdmin && vm.sedesOpciones.length > 1 && (
                        <div className="w-[280px] shrink-0">
                            <Select
                                error=""
                                label="Sede"
                                withLabel={false}
                                name="sedeVista"
                                defaultValue="Todas las sedes (consolidado)"
                                value={
                                    vm.sedeVista
                                        ? vm.sedesOpciones.find((x: { id: number; nombre: string }) => x.id === vm.sedeVista)?.nombre ?? ''
                                        : 'Todas las sedes (consolidado)'
                                }
                                onChange={(id: any) => vm.setSedeVista(Number(id) === 0 ? null : Number(id))}
                                options={sedesSelectOptions}
                            />
                        </div>
                    )}
                    {/* Formato del rótulo: ticket 80 mm o etiqueta adhesiva 80×50 (impresora etiquetera) */}
                    <select
                        value={rotuloFormato}
                        onChange={(e) => setRotuloFormato(e.target.value as RotuloFormato)}
                        title="Formato con el que se imprimen los rótulos (individuales y en lote) desde esta caja"
                        aria-label="Formato del rótulo"
                        data-testid="rotulo-formato"
                        className="h-10 rounded-xl border border-gray-200 bg-white px-2 text-xs font-bold text-gray-600 dark:border-slate-700 dark:bg-slate-800 dark:text-gray-300"
                    >
                        {ROTULO_FORMATOS.map((f) => <option key={f.value} value={f.value} title={f.hint}>{f.label}</option>)}
                    </select>
                    {/* Rótulos de todos los paquetes en preparación (un rótulo por página) */}
                    <button
                        type="button"
                        onClick={() => setRotulosLote(preparandoParaRotulo)}
                        disabled={preparandoParaRotulo.length === 0 || rotulosLote.length > 0}
                        title={preparandoParaRotulo.length ? `Imprimir ${preparandoParaRotulo.length} rótulo(s) de los despachos en Preparando de la lista` : 'No hay despachos en Preparando en la lista'}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl border text-sm font-bold transition-all whitespace-nowrap bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        <Icon icon="solar:printer-2-bold-duotone" className="text-base" />
                        Rótulos
                        {preparandoParaRotulo.length > 0 && (
                            <span className="min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-amber-500 text-white text-[10px] font-black">
                                {preparandoParaRotulo.length}
                            </span>
                        )}
                    </button>
                    {/* Filtros secundarios agrupados: la fila tenía 9 controles y los
                        selects se recortaban. Solo queda a la vista lo que cambia los
                        totales (sede) o el layout (columnas), más la búsqueda. */}
                    <div className="relative">
                        <button
                            onClick={() => setShowFiltrosMenu((v) => !v)}
                            title="Filtrar por repartidor, vendedor, producto, serie o documento"
                            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-sm font-bold transition-all whitespace-nowrap ${
                                filtrosActivos > 0 || showFiltrosMenu
                                    ? 'bg-blue-100 border-blue-200 text-blue-700 dark:bg-blue-900/30 dark:border-blue-800 dark:text-blue-300'
                                    : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700'
                            }`}
                        >
                            <Icon icon="solar:filter-bold-duotone" className="text-base" />
                            Filtros
                            {filtrosActivos > 0 && (
                                <span className="min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-blue-600 text-white text-[10px] font-black">
                                    {filtrosActivos}
                                </span>
                            )}
                        </button>
                        {showFiltrosMenu && (
                            <>
                                <div className="fixed inset-0 z-20" onClick={() => setShowFiltrosMenu(false)} />
                                <div className="absolute right-0 mt-2 z-30 w-72 rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-xl p-3 space-y-2.5">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[11px] font-bold uppercase tracking-wide text-gray-400">Filtros</span>
                                        {filtrosActivos > 0 && (
                                            <button onClick={limpiarFiltros} className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline">Limpiar</button>
                                        )}
                                    </div>
                        {/* Filtro repartidor */}
                        {vm.repartidoresOpciones.length > 0 && (
                            <select
                                value={vm.filtroRepartidorId === undefined ? '' : vm.filtroRepartidorId === null ? 'sin' : String(vm.filtroRepartidorId)}
                                onChange={(e) => {
                                    const v = e.target.value;
                                    if (v === '') vm.setFiltroRepartidorId(undefined);
                                    else if (v === 'sin') vm.setFiltroRepartidorId(null);
                                    else vm.setFiltroRepartidorId(Number(v));
                                }}
                                className="px-3 py-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 w-full"
                            >
                                <option value="">Todos los repartidores</option>
                                <option value="sin">Sin asignar</option>
                                {vm.repartidoresOpciones
                                    .filter((r) => r.id !== null)
                                    .map((r) => (
                                        <option key={r.id} value={String(r.id)}>{r.nombre}</option>
                                    ))}
                            </select>
                        )}
                        {vm.canFilterByUsuario && (
                            <select
                                value={vm.filtroUsuarioId ?? ''}
                                onChange={(e) => vm.setFiltroUsuarioId(e.target.value ? Number(e.target.value) : null)}
                                className="px-3 py-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 w-full"
                            >
                                <option value="">Todos los vendedores</option>
                                {vendedoresOptions.map((usuario) => (
                                    <option key={usuario.id} value={usuario.id}>{usuario.nombre}</option>
                                ))}
                            </select>
                        )}
                        {/* Filtro por Medio de pago */}
                        <div className="relative">
                            <Icon icon="solar:wallet-money-bold-duotone" className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-base pointer-events-none" />
                            <select
                                value={vm.filtroMetodoPago}
                                onChange={(e) => vm.setFiltroMetodoPago(e.target.value)}
                                className="pl-9 pr-4 py-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 w-full appearance-none"
                            >
                                <option value="">Todos los medios de pago</option>
                                {vm.metodosPagoOpciones.map((m: string) => (
                                    <option key={m} value={m}>{m}</option>
                                ))}
                            </select>
                        </div>
                        {/* Filtro por Producto */}
                        <div className="relative">
                            <Icon icon="solar:box-minimalistic-bold-duotone" className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-base" />
                            <input
                                type="text"
                                placeholder="Producto"
                                value={vm.filtroProducto}
                                onChange={(e) => vm.setFiltroProducto(e.target.value)}
                                className="pl-9 pr-4 py-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 w-full"
                            />
                        </div>
                        {/* Filtro Serie Garantía */}
                        <div className="relative">
                            <Icon icon="solar:shield-check-bold-duotone" className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-base" />
                            <input
                                type="text"
                                placeholder="N° serie garantía"
                                value={vm.filtroSerie}
                                onChange={(e) => vm.setFiltroSerie(e.target.value.toUpperCase())}
                                className="pl-9 pr-4 py-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 w-full"
                            />
                        </div>
                        {/* Filtro DNI */}
                        <div className="relative">
                            <Icon icon="solar:card-2-bold-duotone" className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-base" />
                            <input
                                type="text"
                                placeholder="DNI / RUC"
                                value={vm.filtroDni}
                                onChange={(e) => vm.setFiltroDni(e.target.value)}
                                className="pl-9 pr-4 py-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 w-full"
                            />
                        </div>
                                </div>
                            </>
                        )}
                    </div>
                    {/* Configurar columnas visibles (reemplaza el toggle de productos) */}
                    <div className="relative">
                        <button
                            onClick={() => setShowColsMenu((s) => !s)}
                            title="Elegir qué columnas ver"
                            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-sm font-bold transition-all whitespace-nowrap ${
                                showColsMenu
                                    ? 'bg-blue-100 border-blue-200 text-blue-700 dark:bg-blue-900/30 dark:border-blue-800 dark:text-blue-300'
                                    : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700'
                            }`}
                        >
                            <Icon icon="solar:tuning-square-bold-duotone" className="text-base" />
                            Columnas
                        </button>
                        {showColsMenu && (
                            <>
                                <div className="fixed inset-0 z-20" onClick={() => setShowColsMenu(false)} />
                                <div className="absolute right-0 mt-2 z-30 w-60 rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-xl p-2">
                                    <div className="flex items-center justify-between px-2 py-1.5">
                                        <span className="text-[11px] font-bold uppercase tracking-wide text-gray-400">Columnas visibles</span>
                                        <button onClick={resetCols} className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline">Restablecer</button>
                                    </div>
                                    <div className="max-h-72 overflow-y-auto">
                                        {COLUMNAS_CONFIG
                                            .filter((c) => !c.soloAdminPrincipal || vm.esPrincipalAdmin)
                                            .map((c) => (
                                                <label key={c.key} className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700/50 cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={col(c.key)}
                                                        onChange={() => toggleCol(c.key)}
                                                        className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                    />
                                                    <span className="text-sm text-gray-700 dark:text-gray-200">{c.label}</span>
                                                </label>
                                            ))}
                                    </div>
                                    <p className="px-2 pt-2 mt-1 border-t border-gray-100 dark:border-slate-700 text-[10px] text-gray-400">
                                        Se guarda para tus próximas sesiones.
                                    </p>
                                </div>
                            </>
                        )}
                    </div>
                    {/* Búsqueda */}
                    <div className="relative">
                        <Icon icon="solar:magnifer-linear" className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-base" />
                        <input
                            type="text"
                            placeholder="Buscar..."
                            value={vm.busqueda}
                            onChange={(e) => vm.setBusqueda(e.target.value)}
                            className="pl-9 pr-4 py-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 w-48"
                        />
                    </div>
                </div>
            </div>

            {/* Tabla */}
            <div className="bg-white dark:bg-[#111827] rounded-2xl border border-gray-100 dark:border-slate-800 overflow-hidden shadow-sm">
                <AutoScrollTable>
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-gray-100 dark:border-slate-800 bg-gray-50/80 dark:bg-slate-800/50">
                                <th className="px-3 py-3 text-left text-[11px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wide whitespace-nowrap">Fecha</th>
                                <th className="px-3 py-3 text-left text-[11px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wide whitespace-nowrap">Referencia</th>
                                <th className="px-3 py-3 text-left text-[11px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wide">Tipo</th>
                                {vm.esPrincipalAdmin && col('sede') && (
                                    <th className="px-3 py-3 text-left text-[11px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wide whitespace-nowrap">Sede</th>
                                )}
                                <th className="px-3 py-3 text-left text-[11px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wide">Cliente</th>
                                <th className="px-3 py-3 text-right text-[11px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wide whitespace-nowrap">Total</th>
                                {col('saldo') && <th className="px-3 py-3 text-right text-[11px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wide whitespace-nowrap">Saldo</th>}
                                {col('mpago') && <th className="px-3 py-3 text-left text-[11px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wide whitespace-nowrap">M.Pago</th>}
                                <th className="px-3 py-3 text-left text-[11px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wide">Pago</th>
                                {mostrarProductos && (
                                    <th className="px-3 py-3 text-left text-[11px] font-bold text-violet-500 dark:text-violet-400 uppercase tracking-wide whitespace-nowrap">
                                        <span className="flex items-center gap-1">
                                            <Icon icon="solar:box-bold-duotone" className="text-sm" />
                                            Productos
                                        </span>
                                    </th>
                                )}
                                {col('sunat') && <th className="px-3 py-3 text-left text-[11px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wide">SUNAT</th>}
                                {col('despacho') && <th className="px-3 py-3 text-left text-[11px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wide">Despacho</th>}
                                {col('turno') && <th className="px-3 py-3 text-left text-[11px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wide">Turno</th>}
                                {col('recurrente') && <th className="px-3 py-3 text-left text-[11px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wide">Recurrente</th>}
                                {col('celular') && <th className="px-3 py-3 text-left text-[11px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wide">Celular</th>}
                                {col('agencia') && <th className="px-3 py-3 text-left text-[11px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wide">Agencia</th>}
                                {col('paq') && <th className="px-3 py-3 text-center text-[11px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wide whitespace-nowrap">Paq.</th>}
                                {col('repartidor') && <th className="px-3 py-3 text-left text-[11px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wide">Repartidor</th>}
                                <th className="px-3 py-3 text-left text-[11px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wide">Vendedor</th>
                                {col('dirigidoA') && <th className="px-3 py-3 text-left text-[11px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wide whitespace-nowrap">Cobro dirigido a</th>}
                                <th className="px-3 py-3 text-center text-[11px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wide">Acc.</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 dark:divide-slate-800">
                            {vm.loading ? (
                                <tr>
                                    <td colSpan={totalCols} className="py-16 text-center text-gray-400 dark:text-slate-500">
                                        <Icon icon="eos-icons:loading" className="text-3xl animate-spin mx-auto mb-2" />
                                        <p className="text-sm">Cargando ventas...</p>
                                    </td>
                                </tr>
                            ) : filasVisibles.length === 0 ? (
                                <tr>
                                    <td colSpan={totalCols} className="py-16 text-center text-gray-400 dark:text-slate-500">
                                        <Icon icon="solar:sad-square-linear" className="text-4xl mx-auto mb-2 opacity-40" />
                                        <p className="text-sm">No hay ventas para este día</p>
                                    </td>
                                </tr>
                            ) : (
                                filasPagina.map((item) => {
                                    const tipoConf = TIPO_CONFIG[item.tipo] ?? { label: item.tipo, cls: 'bg-slate-100 text-slate-500' };
                                    const pagoConf = PAGO_CONFIG[item.estadoPago] ?? PAGO_CONFIG.PENDIENTE;
                                    const sunatConf = SUNAT_CONFIG[item.estadoSunat] ?? SUNAT_CONFIG.NO_APLICA;
                                    const rowCls = item.esConvertida
                                        ? 'opacity-50 bg-slate-50/60 dark:bg-slate-900/40'
                                        : 'hover:bg-gray-50/50 dark:hover:bg-slate-800/40';

                                    return (
                                        <tr key={`${item.tipo}-${item.id}`} className={`transition-colors ${rowCls}`}>
                                            <td className="px-3 py-2.5 text-xs text-gray-500 dark:text-slate-400 whitespace-nowrap">
                                                <div>{moment(item.fecha).format('DD/MM/YY')}</div>
                                                <div className="text-[10px] opacity-70">{moment(item.fecha).format('HH:mm')}</div>
                                            </td>
                                            <td className="px-3 py-2.5 font-mono text-xs font-semibold text-gray-700 dark:text-gray-300 whitespace-nowrap">
                                                <span className={item.esConvertida ? 'line-through' : ''}>
                                                    {item.referencia}
                                                </span>
                                                {item.esConvertida && item.convertidaEn && (
                                                    <div className="text-[10px] text-slate-400 font-normal mt-0.5">
                                                        → {item.convertidaEn}
                                                    </div>
                                                )}
                                                {item.origenReferencia && (
                                                    <div className="text-[10px] text-violet-500 font-normal mt-0.5">
                                                        origen: {item.origenReferencia}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-3 py-2.5">
                                                <div className="flex flex-col gap-0.5">
                                                    <Badge label={tipoConf.label} cls={tipoConf.cls} />
                                                    {item.esConvertida && (
                                                        <Badge label="Convertida" cls="bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-400" />
                                                    )}
                                                </div>
                                            </td>
                                            {vm.esPrincipalAdmin && col('sede') && (
                                                <td className="px-3 py-2.5 text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap max-w-[100px] truncate" title={item.sede}>
                                                    {item.sede}
                                                </td>
                                            )}
                                            <td className="px-3 py-2.5 text-xs text-gray-800 dark:text-gray-200 max-w-[140px] truncate" title={item.cliente}>
                                                {item.cliente}
                                            </td>
                                            <td className="px-3 py-2.5 text-xs font-bold text-right whitespace-nowrap">
                                                <span className={item.esConvertida ? 'line-through text-slate-400' : 'text-gray-900 dark:text-white'}>
                                                    S/ {Number(item.total ?? 0).toFixed(2)}
                                                </span>
                                            </td>
                                            {col('saldo') && (
                                                <td className="px-3 py-2.5 text-xs font-bold text-right whitespace-nowrap">
                                                    {(item.saldo ?? 0) > 0 ? (
                                                        <span className="text-red-500 dark:text-red-400">
                                                            S/ {Number(item.saldo ?? 0).toFixed(2)}
                                                        </span>
                                                    ) : (
                                                        <span className="text-slate-300 dark:text-slate-600">—</span>
                                                    )}
                                                </td>
                                            )}
                                            {col('mpago') && (
                                                <td className="px-3 py-2.5 text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap">
                                                    {item.metodoPago}
                                                </td>
                                            )}
                                            <td className="px-3 py-2.5">
                                                <Badge label={pagoConf.label} cls={pagoConf.cls} />
                                            </td>
                                            {mostrarProductos && (
                                                <td className="px-3 py-2.5 max-w-[220px]">
                                                    {item.productos && item.productos.length > 0 ? (() => {
                                                        const prodKey = `${item.tipo}-${item.id}`;
                                                        const abierto = prodPopover === prodKey;
                                                        const visibles = abierto ? item.productos : item.productos.slice(0, 3);
                                                        return (
                                                            <div className="space-y-1">
                                                                {visibles.map((prod, idx) => (
                                                                    <div key={idx} className="flex items-center gap-1.5">
                                                                        <span className="flex-shrink-0 min-w-[22px] h-[18px] flex items-center justify-center rounded-md bg-violet-100 dark:bg-violet-900/30 text-[9px] font-black text-violet-600 dark:text-violet-400 px-1">
                                                                            {prod.cantidad}x
                                                                        </span>
                                                                        <span className={`text-[10px] text-gray-700 dark:text-gray-300 leading-tight ${abierto ? '' : 'truncate'}`} title={prod.nombre}>
                                                                            {prod.nombre}
                                                                        </span>
                                                                    </div>
                                                                ))}
                                                                {item.productos.length > 3 && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => setProdPopover(abierto ? null : prodKey)}
                                                                        className="text-[9px] font-bold text-violet-600 dark:text-violet-400 hover:underline pl-0.5"
                                                                    >
                                                                        {abierto ? 'ver menos' : `+${item.productos.length - 3} más · ver todos`}
                                                                    </button>
                                                                )}
                                                            </div>
                                                        );
                                                    })() : (
                                                        <span className="text-slate-300 dark:text-slate-600 text-xs">—</span>
                                                    )}
                                                </td>
                                            )}
                                            {col('sunat') && (
                                                <td className="px-3 py-2.5">
                                                    <Badge label={sunatConf.label} cls={sunatConf.cls} />
                                                </td>
                                            )}
                                            {col('despacho') && (
                                                <td className="px-3 py-2.5">
                                                    <EstadoDespachoSelector item={item} onChange={vm.actualizarEstado} />
                                                </td>
                                            )}
                                            {col('turno') && (
                                                <td className="px-3 py-2.5 text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap">
                                                    {item.estadoDespacho !== 'NO_APLICA' ? (item.turnoEnvio ?? '—') : '—'}
                                                </td>
                                            )}
                                            {col('recurrente') && (() => {
                                                const r = recurrencia((item as any).clienteCompras);
                                                return (
                                                    <td className="px-3 py-2.5 whitespace-nowrap">
                                                        {r.texto === '—' ? (
                                                            <span className="text-xs text-gray-400">—</span>
                                                        ) : (
                                                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[11px] font-semibold ${r.clase}`}>
                                                                {r.texto}
                                                            </span>
                                                        )}
                                                    </td>
                                                );
                                            })()}
                                            {col('celular') && (
                                                <td className="px-3 py-2.5 text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap">
                                                    {item.estadoDespacho !== 'NO_APLICA' ? (item.celularDest ?? '—') : '—'}
                                                </td>
                                            )}
                                            {col('agencia') && (
                                                <td className="px-3 py-2.5 text-xs text-gray-600 dark:text-gray-400 max-w-[140px]" title={item.agenciaDestino}>
                                                    <div className="truncate">{item.estadoDespacho !== 'NO_APLICA' ? (item.agenciaDestino ?? '—') : '—'}</div>
                                                    {/* Cliente "WSP 9…" (sin DNI) con courier que exige documento y sin guía aún:
                                                        atajo directo al bloque Destinatario del despacho. */}
                                                    {Boolean(item.comprobanteId)
                                                        && !TIPOS_NO_ENVIABLES.has(item.tipo)
                                                        && (item.estadoDespacho === 'NO_APLICA' || SHALOM_COURIERS.has(item.courier) || item.courier === OLVA_COURIER)
                                                        && !item.nroOrden
                                                        && !/^\d{8}$|^\d{11}$/.test(String(item.clienteDoc ?? '').trim()) && (
                                                        <button type="button"
                                                            onClick={(e) => { e.stopPropagation(); setEditDespachoId(item.comprobanteId); }}
                                                            className="mt-1 inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700 hover:bg-amber-100 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-400"
                                                            title="El cliente no tiene DNI registrado; complétalo para generar la guía">
                                                            <Icon icon="solar:danger-triangle-bold" className="text-xs" /> Falta DNI para la guía
                                                        </button>
                                                    )}
                                                </td>
                                            )}
                                            {col('paq') && (
                                                <td className="px-3 py-2.5 text-xs text-center text-gray-600 dark:text-gray-400">
                                                    {item.estadoDespacho !== 'NO_APLICA' ? (item.nroPaquetes ?? '—') : '—'}
                                                </td>
                                            )}
                                            {col('repartidor') && (
                                                <td className="px-3 py-2.5 text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap max-w-[100px] truncate" title={item.repartidor}>
                                                    {item.estadoDespacho !== 'NO_APLICA' ? item.repartidor : '—'}
                                                </td>
                                            )}
                                            <td className="px-3 py-2.5 text-xs text-gray-600 dark:text-gray-400 max-w-[100px] truncate" title={item.vendedor}>
                                                {item.vendedor}
                                            </td>
                                            {col('dirigidoA') && (
                                            <td className="px-3 py-2.5 text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap">
                                                {item.dirigidoA ? (
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="truncate max-w-[150px]" title={item.dirigidoA}>{item.dirigidoA}</span>
                                                        {(item.comprobantesPago?.length ?? 0) > 0 && (
                                                            <a
                                                                href={item.comprobantesPago![0]}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                title="Ver comprobante de pago subido"
                                                                className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300 text-[10px] font-bold hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
                                                            >
                                                                <Icon icon="mdi:paperclip" width={12} height={12} />
                                                                {item.comprobantesPago!.length > 1 ? item.comprobantesPago!.length : ''}
                                                            </a>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className="text-gray-300 dark:text-slate-600">—</span>
                                                )}
                                            </td>
                                            )}
                                            <td className="px-3 py-2.5 text-center">
                                                <button
                                                    type="button"
                                                    onClick={(e) => handleOpenMenu(e, item)}
                                                    className="px-2 py-1 text-xs rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-200 flex items-center gap-1 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors mx-auto"
                                                >
                                                    <Icon icon="mdi:dots-vertical" width={18} height={18} />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </AutoScrollTable>
                {filasVisibles.length > PAGE_SIZE && (
                    <div className="flex items-center justify-between gap-3 px-4 py-3 border-t border-gray-100 dark:border-slate-800 text-xs">
                        <span className="text-gray-500 dark:text-gray-400">
                            {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filasVisibles.length)} de {filasVisibles.length}
                        </span>
                        <div className="flex items-center gap-1.5">
                            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-2.5 py-1 rounded-lg border border-gray-200 dark:border-slate-700 font-semibold text-gray-600 dark:text-gray-300 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors">Anterior</button>
                            <span className="px-2 text-gray-500 dark:text-gray-400">{page} / {totalPages}</span>
                            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-2.5 py-1 rounded-lg border border-gray-200 dark:border-slate-700 font-semibold text-gray-600 dark:text-gray-300 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors">Siguiente</button>
                        </div>
                    </div>
                )}
            </div>

            {/* Modales */}
            {detalleId && (
                <ModalDetalleComprobante
                    comprobanteId={detalleId}
                    isOpen={true}
                    onClose={() => setDetalleId(null)}
                    onUpdated={vm.cargar}
                />
            )}
            {editDespachoId && (
                <EditarDespachoModal
                    comprobanteId={editDespachoId}
                    onClose={() => setEditDespachoId(null)}
                    onSuccess={() => { setEditDespachoId(null); vm.cargar(); }}
                />
            )}
            <ModalConfirm
                isOpenModal={confirmPagoPedido !== null}
                setIsOpenModal={(v) => { if (!v) setConfirmPagoPedido(null); }}
                title="Marcar pedido como pagado"
                information={confirmPagoPedido ? `Se registrará el cobro completo de S/ ${Number(confirmPagoPedido.total).toFixed(2)} del pedido ${confirmPagoPedido.referencia} (${confirmPagoPedido.metodoPago}) y pasará a CONFIRMADO. ¿Ya verificaste el pago?` : ''}
                confirmText="Sí, marcar pagado"
                confirmSubmit={() => { const it = confirmPagoPedido; setConfirmPagoPedido(null); if (it) void marcarPedidoPagado(it); }}
            />
            <ModalConfirm
                isOpenModal={confirmDespachoItem !== null}
                setIsOpenModal={(v) => { if (!v) setConfirmDespachoItem(null); }}
                title="Este pedido ya fue entregado"
                information={`"${confirmDespachoItem?.referencia ?? ''}" tiene estado Entregado. Editar el despacho podría modificar información de un pedido ya cerrado. ¿Deseas continuar de todos modos?`}
                confirmText="Sí, editar despacho"
                confirmSubmit={() => {
                    if (confirmDespachoItem?.comprobanteId) {
                        setEditDespachoId(confirmDespachoItem.comprobanteId);
                    }
                    setConfirmDespachoItem(null);
                }}
            />
            {trazabilidadItem?.comprobanteId && (
                <ModalTrazabilidad
                    comprobanteId={trazabilidadItem.comprobanteId}
                    referencia={trazabilidadItem.referencia}
                    cliente={trazabilidadItem.cliente}
                    onClose={() => setTrazabilidadItem(null)}
                />
            )}
            {waItem?.comprobanteId && (
                <ModalEnviarWhatsApp
                    isOpen={true}
                    onClose={() => setWaItem(null)}
                    comprobante={{
                        id: waItem.comprobanteId,
                        serie: parseSerie(waItem.referencia),
                        correlativo: parseCorrelativo(waItem.referencia),
                        comprobante: TIPO_CONFIG[waItem.tipo]?.label ?? waItem.tipo,
                        total: waItem.total,
                        clienteNombre: waItem.cliente,
                        // Prefill del número: teléfono del cliente; si no tiene, el celular del despacho
                        clienteCelular: waItem.clienteTelefono || (waItem.celularDest && waItem.celularDest !== '—' ? waItem.celularDest : ''),
                        clienteEmail: waItem.clienteEmail || '',
                    }}
                />
            )}

            {/* Cobros inline */}
            {pagoItem?.comprobanteId && (
                <ModalRegistrarPago
                    comprobante={toComprobanteObj(pagoItem)}
                    onClose={() => setPagoItem(null)}
                    onSuccess={() => { setPagoItem(null); vm.cargar(); }}
                />
            )}
            {historialItem?.comprobanteId && (
                <ModalHistorialPagos
                    comprobante={toComprobanteObj(historialItem)}
                    onClose={() => setHistorialItem(null)}
                />
            )}
            {detalleCuentaItem?.comprobanteId && (
                <ModalDetalleCuenta
                    comprobante={toComprobanteObj(detalleCuentaItem)}
                    onClose={() => setDetalleCuentaItem(null)}
                />
            )}

            {/* Dropdown de acciones por fila */}
            <TableActionMenu
                isOpen={Boolean(menuAnchor)}
                anchorEl={menuAnchor}
                onClose={handleCloseMenu}
            >
                {menuItem && (() => {
                    const it = menuItem;
                    const canDetalle = Boolean(it.comprobanteId);
                    const canDespacho = Boolean(it.comprobanteId) && it.estadoDespacho !== 'NO_APLICA';
                    const canWa = Boolean(it.comprobanteId);
                    const canConvertirComp = puedeDocumentarComprobante(it);
                    const canConvertirPedido = puedeDocumentarPedidoTienda(it);
                    const canCobro = puedeRegistrarCobro(it);
                    const esPedidoTienda = it.tipo === 'PEDIDO_TIENDA' && Boolean(it.pedidoId);
                    const pedidoConSaldo = esPedidoTienda && Number(it.saldo ?? 0) > 0.01;

                    return (
                        <>
                            {/* — Pedido de tienda (sin comprobante): gestión directa del pedido — */}
                            {esPedidoTienda && (
                                <>
                                    <button type="button"
                                        onClick={() => { handleCloseMenu(); navigate(`/administrador/tienda/pedidos?codigo=${encodeURIComponent(it.referencia)}`); }}
                                        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 font-medium"
                                    >
                                        <Icon icon="solar:bag-check-bold-duotone" width={15} />
                                        <span>Ver / gestionar pedido</span>
                                    </button>
                                    {pedidoConSaldo && (
                                        <button type="button"
                                            onClick={() => { handleCloseMenu(); setConfirmPagoPedido(it); }}
                                            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 font-medium"
                                        >
                                            <Icon icon="solar:hand-money-bold-duotone" width={15} />
                                            <span>Marcar como pagado (S/ {Number(it.saldo).toFixed(2)})</span>
                                        </button>
                                    )}
                                    <button type="button"
                                        onClick={() => { handleCloseMenu(); whatsappPedido(it); }}
                                        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
                                    >
                                        <Icon icon="mdi:whatsapp" width={15} />
                                        <span>WhatsApp al cliente</span>
                                    </button>
                                    {!canConvertirPedido && (
                                        <p className="px-3 py-1.5 text-[10px] leading-4 text-slate-400">
                                            Boleta/Factura/Guía se habilitan cuando el pedido esté pagado.
                                        </p>
                                    )}
                                </>
                            )}
                            {/* — Visualización — */}
                            {canDetalle && (
                                <button type="button"
                                    onClick={() => { setDetalleId(it.comprobanteId); handleCloseMenu(); }}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 font-medium"
                                >
                                    <Icon icon="solar:eye-bold-duotone" width={15} />
                                    <span>Ver detalle</span>
                                </button>
                            )}
                            {/* Comprobante(s) de pago subido(s) en registrar cobro */}
                            {(it.comprobantesPago?.length ?? 0) > 0 && it.comprobantesPago!.map((url, idx) => (
                                <a key={idx}
                                    href={url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={handleCloseMenu}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 font-medium"
                                >
                                    <Icon icon="mdi:receipt-text-check-outline" width={15} />
                                    <span>Ver comprobante de pago{it.comprobantesPago!.length > 1 ? ` ${idx + 1}` : ''}</span>
                                </a>
                            ))}
                            {canWa && (
                                <button type="button"
                                    onClick={() => { setWaItem(it); handleCloseMenu(); }}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
                                >
                                    <Icon icon="mdi:whatsapp" width={15} />
                                    <span>Enviar WhatsApp / Email</span>
                                </button>
                            )}

                            {/* — Sin despacho: crearlo desde aquí — */}
                            {Boolean(it.comprobanteId) && it.estadoDespacho === 'NO_APLICA' && !TIPOS_NO_ENVIABLES.has(it.tipo) && (
                                <>
                                    <div className="border-t border-gray-100 dark:border-slate-700 my-0.5" />
                                    <button type="button"
                                        onClick={() => { handleCloseMenu(); coordinarEnvio(it); }}
                                        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 font-medium"
                                    >
                                        <Icon icon="solar:delivery-bold-duotone" width={15} />
                                        <span>Coordinar envío</span>
                                    </button>
                                </>
                            )}

                            {/* — Despacho — */}
                            {canDespacho && (
                                <>
                                    <div className="border-t border-gray-100 dark:border-slate-700 my-0.5" />
                                    <button type="button"
                                        onClick={() => {
                                            handleCloseMenu();
                                            if (it.estadoDespacho === 'ENTREGADO') {
                                                setConfirmDespachoItem(it);
                                            } else {
                                                setEditDespachoId(it.comprobanteId);
                                            }
                                        }}
                                        className={`w-full flex items-center gap-2 px-3 py-2 text-xs ${
                                            it.estadoDespacho === 'ENTREGADO'
                                                ? 'text-slate-400 dark:text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                                                : 'text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20'
                                        }`}
                                    >
                                        <Icon
                                            icon={it.estadoDespacho === 'ENTREGADO' ? 'solar:lock-unlocked-bold-duotone' : 'solar:delivery-bold-duotone'}
                                            width={15}
                                        />
                                        <span>
                                            Editar despacho
                                            {it.estadoDespacho === 'ENTREGADO' && <span className="ml-1 text-[10px] opacity-70">(entregado)</span>}
                                        </span>
                                    </button>
                                    <button type="button"
                                        onClick={() => { setTrazabilidadItem(it); handleCloseMenu(); }}
                                        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20"
                                    >
                                        <Icon icon="solar:map-point-wave-bold-duotone" width={15} />
                                        <span>Trazabilidad</span>
                                    </button>
                                    {SHALOM_COURIERS.has(it.courier) && (
                                        <button type="button"
                                            onClick={() => {
                                                handleCloseMenu();
                                                if (!it.nroOrden) {
                                                    useAlertStore.getState().alert('Agrega el N° de orden Shalom en "Editar despacho" primero', 'warning');
                                                    return;
                                                }
                                                setShalomTracking({ orderNumber: it.nroOrden, orderCode: it.claveOrden ?? '', item: it });
                                            }}
                                            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
                                        >
                                            <Icon icon="solar:delivery-bold-duotone" width={15} />
                                            <span>{it.nroOrden ? `Tracking Shalom #${it.nroOrden}` : 'Tracking Shalom (sin N° orden)'}</span>
                                        </button>
                                    )}
                                    {SHALOM_COURIERS.has(it.courier) && (
                                        <button type="button"
                                            onClick={() => { handleCloseMenu(); imprimirRotuloShalom(it); }}
                                            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
                                        >
                                            <Icon icon="solar:printer-2-bold-duotone" width={15} />
                                            <span>Imprimir Rótulo</span>
                                        </button>
                                    )}
                                    {it.courier === OLVA_COURIER && (
                                        <button type="button"
                                            onClick={() => {
                                                handleCloseMenu();
                                                if (!it.nroOrden) {
                                                    useAlertStore.getState().alert('Agrega el N° de guía Olva en "Editar despacho" primero', 'warning');
                                                    return;
                                                }
                                                setOlvaTracking({ trackingNumber: it.nroOrden, item: it });
                                            }}
                                            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
                                        >
                                            <Icon icon="solar:delivery-bold-duotone" width={15} />
                                            <span>{it.nroOrden ? `Tracking Olva #${it.nroOrden}` : 'Tracking Olva (sin N° de guía)'}</span>
                                        </button>
                                    )}
                                </>
                            )}

                            {/* — Conversión informal → formal — */}
                            {canConvertirComp && (
                                <>
                                    <div className="border-t border-gray-100 dark:border-slate-700 my-0.5" />
                                    <button type="button"
                                        onClick={() => { convertirComprobante(it, 'BOLETA'); handleCloseMenu(); }}
                                        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20 font-medium"
                                    >
                                        <Icon icon="solar:bill-list-bold-duotone" width={15} />
                                        <span>Convertir a Boleta</span>
                                    </button>
                                    <button type="button"
                                        onClick={() => { convertirComprobante(it, 'FACTURA'); handleCloseMenu(); }}
                                        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 font-medium"
                                    >
                                        <Icon icon="solar:document-add-bold-duotone" width={15} />
                                        <span>Convertir a Factura</span>
                                    </button>
                                    <button type="button"
                                        onClick={() => { convertirGuiaComprobante(it); handleCloseMenu(); }}
                                        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 font-medium"
                                    >
                                        <Icon icon="solar:route-bold-duotone" width={15} />
                                        <span>Hacer Guía de Remisión</span>
                                    </button>
                                </>
                            )}

                            {/* — Conversión pedido tienda → formal — */}
                            {canConvertirPedido && (
                                <>
                                    <div className="border-t border-gray-100 dark:border-slate-700 my-0.5" />
                                    <button type="button"
                                        onClick={() => { convertirPedidoTienda(it, 'BOLETA'); handleCloseMenu(); }}
                                        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20 font-medium"
                                    >
                                        <Icon icon="solar:bill-list-bold-duotone" width={15} />
                                        <span>Hacer Boleta</span>
                                    </button>
                                    <button type="button"
                                        onClick={() => { convertirPedidoTienda(it, 'FACTURA'); handleCloseMenu(); }}
                                        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 font-medium"
                                    >
                                        <Icon icon="solar:document-add-bold-duotone" width={15} />
                                        <span>Hacer Factura</span>
                                    </button>
                                    <button type="button"
                                        onClick={() => { convertirGuiaPedidoTienda(it); handleCloseMenu(); }}
                                        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 font-medium"
                                    >
                                        <Icon icon="solar:route-bold-duotone" width={15} />
                                        <span>Hacer Guía de Remisión</span>
                                    </button>
                                </>
                            )}

                            {/* — Cobros — */}
                            {(canCobro || canDetalle) && (
                                <>
                                    <div className="border-t border-gray-100 dark:border-slate-700 my-0.5" />
                                    {canCobro && (
                                        <button type="button"
                                            onClick={() => { setPagoItem(it); handleCloseMenu(); }}
                                            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 font-medium"
                                        >
                                            <Icon icon="solar:hand-money-bold-duotone" width={15} />
                                            <span>Registrar cobro</span>
                                        </button>
                                    )}
                                    {canDetalle && (
                                        <>
                                            <button type="button"
                                                onClick={() => { setHistorialItem(it); handleCloseMenu(); }}
                                                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700"
                                            >
                                                <Icon icon="solar:history-bold-duotone" width={15} />
                                                <span>Historial de pagos</span>
                                            </button>
                                            <button type="button"
                                                onClick={() => { setDetalleCuentaItem(it); handleCloseMenu(); }}
                                                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700"
                                            >
                                                <Icon icon="solar:document-text-bold-duotone" width={15} />
                                                <span>Detalle de cuenta</span>
                                            </button>
                                        </>
                                    )}
                                </>
                            )}

                            {/* — Anular — */}
                            {it.comprobanteId && it.estadoSunat !== 'ANULADO' && !it.esConvertida && (
                                <>
                                    <div className="border-t border-gray-100 dark:border-slate-700 my-0.5" />
                                    <button type="button"
                                        onClick={() => { setAnularItem(it); handleCloseMenu(); }}
                                        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                                    >
                                        <Icon icon="mdi:cancel" width={15} />
                                        <span>Anular</span>
                                    </button>
                                </>
                            )}
                        </>
                    );
                })()}
            </TableActionMenu>

            {/* Modal confirmación anulación */}
            {anularItem && (
                <div className="fixed inset-0 z-[999999] top-[-30px] flex items-center justify-center bg-black/50">
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl p-6 max-w-sm w-full mx-4">
                        <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100 mb-2">Anular comprobante</h3>
                        <p className="text-xs text-gray-600 dark:text-gray-300 mb-4">
                            ¿Estás seguro que deseas anular este comprobante? Se revertirá el stock y se eliminarán los pagos registrados.
                        </p>
                        <div className="flex justify-end gap-2">
                            <button
                                onClick={() => setAnularItem(null)}
                                className="px-3 py-1.5 text-xs rounded-lg border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-700"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={async () => {
                                    const id = anularItem.comprobanteId!;
                                    setAnularItem(null);
                                    const res = await cancelInvoice(id);
                                    if (res.success) vm.cargar();
                                }}
                                className="px-3 py-1.5 text-xs rounded-lg bg-red-600 text-white hover:bg-red-700"
                            >
                                Sí, anular
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <RotuloPrint
                comprobanteId={rotuloPrintComprobanteId}
                onDone={() => setRotuloPrintComprobanteId(null)}
                formato={rotuloFormato}
            />
            <RotulosLotePrint items={rotulosLote} onDone={() => setRotulosLote([])} formato={rotuloFormato} />

            {shalomTracking && (
                <ShalomTrackingModal
                    orderNumber={shalomTracking.orderNumber}
                    orderCode={shalomTracking.orderCode}
                    onClose={() => setShalomTracking(null)}
                    onEntregado={async () => { await vm.actualizarEstado(shalomTracking.item, 'ENTREGADO'); }}
                    wrapperClassName="top-[-30px]"
                />
            )}
            {olvaTracking && (
                <OlvaTrackingModal
                    trackingNumber={olvaTracking.trackingNumber}
                    onClose={() => setOlvaTracking(null)}
                    onEntregado={async () => { await vm.actualizarEstado(olvaTracking.item, 'ENTREGADO'); }}
                    wrapperClassName="top-[-30px]"
                />
            )}
        </div>
    );
}
