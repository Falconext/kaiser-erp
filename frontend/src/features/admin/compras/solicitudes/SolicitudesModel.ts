// --- Solicitudes de Compra Model ---
// Flujo: Solicitud (requerimiento interno) → cotizaciones de proveedores
// A/B/C → comparativo → selección → Orden de Compra.

export type EstadoSolicitud =
    | 'PENDIENTE'
    | 'EN_COTIZACION'
    | 'APROBADA'
    | 'CONVERTIDA'
    | 'ANULADA';

export type EstadoCotizacion = 'RECIBIDA' | 'SELECCIONADA' | 'DESCARTADA';

export interface ISolicitudItem {
    id: number;
    solicitudId: number;
    productoId?: number | null;
    descripcion: string;
    cantidad: number | string;
    unidad: string;
    observacion?: string | null;
    producto?: {
        id: number;
        codigo: string;
        descripcion: string;
        costoPromedio: number | string;
        stock: number | string;
    } | null;
}

export interface ICotizacionItem {
    id?: number;
    cotizacionId?: number;
    solicitudItemId: number;
    precioUnitario: number | string;
    cantidad?: number | string | null;
    marca?: string | null;
    plazoEntregaDias?: number | null;
    observacion?: string | null;
}

export interface ICotizacionProveedor {
    id: number;
    solicitudId: number;
    proveedorId: number;
    proveedor?: { id: number; nombre: string; nroDoc?: string | null };
    referencia?: string | null;
    fecha: string;
    moneda: string;
    tipoCambio: number | string;
    plazoEntregaDias?: number | null;
    condicionesPago?: string | null;
    validezDias?: number | null;
    incluyeIgv: boolean;
    subtotal: number | string;
    total: number | string;
    totalPen: number | string;
    estado: EstadoCotizacion;
    observaciones?: string | null;
    archivoUrl?: string | null;
    items: ICotizacionItem[];
}

export interface ISolicitudCompra {
    id: number;
    empresaId: number;
    sedeId?: number | null;
    solicitanteId?: number | null;
    solicitante?: { nombre: string } | null;
    sede?: { nombre: string } | null;
    numero: string;
    area?: string | null;
    motivo?: string | null;
    fechaRequerida?: string | null;
    estado: EstadoSolicitud;
    observaciones?: string | null;
    creadoEn: string;
    items: ISolicitudItem[];
    cotizaciones: ICotizacionProveedor[];
    ordenesCompra?: { id: number; numero: number; numeroFormato: string; estado: string }[];
    nItems?: number;
    nCotizaciones?: number;
    mejorTotal?: number | null;
}

export interface IComparativoPrecio {
    cotizacionId: number;
    precioUnitario: number | null;
    precioUnitarioPen: number | null;
    subtotalPen: number | null;
    esMejor: boolean;
}

export interface IComparativoFila {
    solicitudItemId: number;
    descripcion: string;
    cantidad: number;
    unidad: string;
    costoPromedioActual: number | null;
    precios: IComparativoPrecio[];
    mejorCotizacionId: number | null;
}

export interface IComparativoProveedor {
    cotizacionId: number;
    proveedor: { id: number; nombre: string; nroDoc?: string | null };
    moneda: string;
    tipoCambio: number;
    plazoEntregaDias?: number | null;
    condicionesPago?: string | null;
    referencia?: string | null;
    totalPen: number;
    esMejorTotal: boolean;
}

export interface IComparativo {
    solicitud: {
        id: number;
        numero: string;
        area?: string | null;
        motivo?: string | null;
        estado: EstadoSolicitud;
        fechaRequerida?: string | null;
    };
    proveedores: IComparativoProveedor[];
    filas: IComparativoFila[];
    resumen: {
        ahorroVsMasCaro: number | null;
        ahorroPct: number | null;
        mejorProveedor: string | null;
        recomendacion: string;
    };
}

export const AREAS = ['Producción', 'Almacén', 'Mantenimiento', 'Administración', 'Ventas'];

export const ESTADO_SOLICITUD_LABEL: Record<EstadoSolicitud, string> = {
    PENDIENTE: 'Pendiente',
    EN_COTIZACION: 'En cotización',
    APROBADA: 'Aprobada',
    CONVERTIDA: 'Convertida en OC',
    ANULADA: 'Anulada',
};

export const ESTADO_SOLICITUD_STYLE: Record<EstadoSolicitud, string> = {
    PENDIENTE: 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-300',
    EN_COTIZACION: 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300',
    APROBADA: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-300',
    CONVERTIDA: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300',
    ANULADA: 'bg-rose-50 text-rose-500 dark:bg-rose-900/30 dark:text-rose-300',
};

export const ESTADO_STEPS: { key: EstadoSolicitud; label: string }[] = [
    { key: 'PENDIENTE', label: 'Pendiente' },
    { key: 'EN_COTIZACION', label: 'En cotización' },
    { key: 'CONVERTIDA', label: 'Convertida' },
];

export interface INuevoItem {
    productoId?: number;
    descripcion: string;
    cantidad: number;
    unidad: string;
}
