// Reportes de gestión — ventas por vendedor / cliente / producto / categoría /
// sector / ubigeo. Backend: GET /api/reportes/ventas (ver backend/src/reportes).

export type Dimension =
    | 'vendedor'
    | 'cliente'
    | 'producto'
    | 'categoria'
    | 'sector'
    | 'departamento'
    | 'provincia'
    | 'distrito';

export interface DimensionMeta {
    key: Dimension;
    label: string;
    icon: string;
    /** Encabezado de la columna "Nombre" en la tabla */
    columna: string;
}

export const DIMENSIONES: DimensionMeta[] = [
    { key: 'vendedor', label: 'Vendedor', icon: 'solar:user-id-linear', columna: 'Vendedor' },
    { key: 'cliente', label: 'Cliente', icon: 'solar:users-group-rounded-linear', columna: 'Cliente' },
    { key: 'producto', label: 'Producto', icon: 'solar:box-linear', columna: 'Producto' },
    { key: 'categoria', label: 'Categoría', icon: 'solar:folder-2-linear', columna: 'Categoría' },
    { key: 'sector', label: 'Sector', icon: 'solar:buildings-2-linear', columna: 'Sector' },
    { key: 'departamento', label: 'Departamento', icon: 'solar:map-linear', columna: 'Departamento' },
    { key: 'provincia', label: 'Provincia', icon: 'solar:map-point-linear', columna: 'Provincia' },
    { key: 'distrito', label: 'Distrito', icon: 'solar:map-point-wave-linear', columna: 'Distrito' },
];

export interface FilaReporte {
    clave: string;
    nombre: string;
    ventas: number;
    documentos: number;
    unidades?: number;
    participacion: number;
    extra?: Record<string, any>;
}

export interface ReporteVentas {
    dimension: Dimension;
    periodo: { fechaInicio: string; fechaFin: string };
    moneda: 'PEN';
    totalVentas: number;
    totalDocumentos: number;
    filas: FilaReporte[];
}

export interface ComprobanteDetalle {
    id: number;
    fecha: string;
    tipoDoc: string;
    numero: string;
    cliente: string;
    vendedor: string;
    moneda: string;
    total: number;
    totalPEN: number;
    estado: string;
}

export const TIPO_DOC_LABEL: Record<string, string> = {
    '01': 'Factura',
    '03': 'Boleta',
    '07': 'N. Crédito',
    '08': 'N. Débito',
    NV: 'Nota de venta',
    TICKET: 'Ticket',
    RH: 'Recibo hon.',
    CP: 'Comp. pago',
};

export const REPORTE_VACIO: ReporteVentas = {
    dimension: 'vendedor',
    periodo: { fechaInicio: '', fechaFin: '' },
    moneda: 'PEN',
    totalVentas: 0,
    totalDocumentos: 0,
    filas: [],
};

export function fechaHoy(): string {
    return new Date().toISOString().split('T')[0];
}

export function primerDiaMes(): string {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
}

export function formatSoles(n: number): string {
    return `S/ ${Number(n || 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatNumero(n: number, decimales = 0): string {
    return Number(n || 0).toLocaleString('es-PE', { minimumFractionDigits: decimales, maximumFractionDigits: decimales });
}

export function formatCompacto(n: number): string {
    const abs = Math.abs(n);
    if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (abs >= 10_000) return `${(n / 1_000).toFixed(0)}k`;
    if (abs >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
    return n.toFixed(0);
}
