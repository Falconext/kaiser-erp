// ─── Types ───────────────────────────────────────────────────────────────────

export interface OtroIngreso {
    concepto: string;
    tipo: string;
    monto: number;
}

export interface PnlResponse {
    periodo: { mes: number; anio: number; label: string };
    ventasNetas: number;
    costoBaseProductos: number;
    costosFijosProducto: number;
    costoMercaderia: number;
    unidadesVendidas: number;
    lineasProducto: number;
    lineasServicio: number;
    gananciaBruta: number;
    margenBruto: number;
    otrosIngresos: number;
    otrosIngresosDetalle: OtroIngreso[];
    gastosTotales: number;
    gastoPublicidad: number;
    gastosPorCategoria: Array<{ categoria: string; etiqueta: string | null; monto: number }>;
    gananciaNeta: number;
    margenNeto: number;
    resumenDiario: RentabilidadDia[];
    comparacion: {
        mesAnterior: { gananciaNeta: number; margenNeto: number; otrosIngresos: number } | null;
        variacionMonto: number | null;
        variacionPorcentaje: number | null;
    };
}

export interface RentabilidadDia {
    fecha: any;
    ventasNetas: number;
    costoMercaderia: number;
    gananciaBruta: number;
    margenBruto: number;
    publicidad: number;
    otrosGastos: number;
    gastosOperativos: number;
    gananciaNeta: number;
    margenNeto: number;
    pedidos: number;
    roas: number | null;
    costoPublicidadPorPedido: number | null;
}

export interface EvolucionPoint {
    mes: number;
    anio: number;
    label: string;
    ventasNetas: number;
    gananciaBruta: number;
    gananciaNeta: number;
}

export interface GastoOperativo {
    id: number;
    mes: number;
    anio: number;
    fecha: string | null;
    recurrenteDiario: boolean;
    fechaInicio: string | null;
    fechaFin: string | null;
    categoria: string;
    etiqueta: string | null;
    monto: number;
    moneda?: string | null;
    tipoCambio?: number | string | null;
    cuentaBancariaId?: number | null;
    medioPago?: string | null;
    descripcion: string | null;
    creadoEn: string;
}

export interface IngresoManual {
    id: number;
    concepto: string;
    tipo: string;
    monto: number;
    fecha: string;
    descripcion?: string | null;
    creadoEn: string;
}

export interface IngresoFormData {
    concepto: string;
    tipo: string;
    monto: number;
    fecha: string;
    descripcion?: string;
}

export const TIPOS_INGRESO = [
    { key: 'SUSCRIPCION', label: 'Suscripción',      icon: 'solar:refresh-circle-bold-duotone',        esFinanciamiento: false },
    { key: 'VENTA',       label: 'Venta',             icon: 'solar:bag-bold-duotone',                   esFinanciamiento: false },
    { key: 'OTROS',       label: 'Otros',             icon: 'solar:box-bold-duotone',                   esFinanciamiento: false },
    { key: 'PRESTAMO',    label: 'Préstamo',          icon: 'solar:hand-money-bold-duotone',            esFinanciamiento: true  },
    { key: 'INVERSION',   label: 'Inversión',         icon: 'solar:graph-up-bold-duotone',              esFinanciamiento: true  },
    { key: 'CAPITAL',     label: 'Capital adicional', icon: 'solar:dollar-minimalistic-bold-duotone',   esFinanciamiento: true  },
] as const;

export const TIPOS_FINANCIAMIENTO = ['PRESTAMO', 'INVERSION', 'CAPITAL'] as const;

export function esFinanciamiento(tipo: string): boolean {
    return (TIPOS_FINANCIAMIENTO as readonly string[]).includes(tipo);
}

export interface GastoFormData {
    mes: number;
    anio: number;
    fecha?: string;
    recurrenteDiario?: boolean;
    fechaInicio?: string;
    fechaFin?: string;
    categoria: string;
    etiqueta?: string;
    monto: number;
    moneda?: string;
    tipoCambio?: number;
    cuentaBancariaId?: number;
    medioPago?: string;
    descripcion?: string;
}

export const MEDIOS_PAGO_GASTO = [
    { key: 'TRANSFERENCIA', label: 'Transferencia' },
    { key: 'TARJETA',       label: 'Tarjeta' },
    { key: 'EFECTIVO',      label: 'Efectivo' },
    { key: 'YAPE',          label: 'Yape' },
    { key: 'PLIN',          label: 'Plin' },
] as const;

export function formatMonto(value: number, moneda?: string | null): string {
    const simbolo = moneda === 'USD' ? 'US$' : 'S/';
    return `${simbolo} ${value.toLocaleString('es-PE', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })}`;
}

// ─── Constants ────────────────────────────────────────────────────────────────

export const CATEGORIAS_FIJAS = [
    { key: 'PUBLICIDAD',      label: 'Publicidad',     icon: 'solar:target-bold-duotone' },
    { key: 'SUELDOS',         label: 'Sueldos',        icon: 'solar:users-group-rounded-bold-duotone' },
    { key: 'ENVIOS',          label: 'Envíos',         icon: 'solar:delivery-bold-duotone' },
    { key: 'COMISIONES',      label: 'Comisiones',     icon: 'solar:card-bold-duotone' },
    { key: 'ALQUILER',        label: 'Alquiler',       icon: 'solar:home-bold-duotone' },
    { key: 'OTROS',           label: 'Otros',          icon: 'solar:box-bold-duotone' },
    { key: 'PERSONALIZADA',   label: 'Personalizada',  icon: 'solar:tag-bold-duotone' },
] as const;

export type CategoriaKey = typeof CATEGORIAS_FIJAS[number]['key'];

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function getCategoriaLabel(key: string): string {
    const found = CATEGORIAS_FIJAS.find(c => c.key === key);
    return found ? found.label : key;
}

export function getCategoriaIcon(key: string): string {
    const found = CATEGORIAS_FIJAS.find(c => c.key === key);
    return found ? found.icon : 'solar:box-bold-duotone';
}

export function formatCurrency(value: number): string {
    return `S/ ${value.toLocaleString('es-PE', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })}`;
}

export function formatPercent(value: number): string {
    return `${Math.abs(value).toFixed(1)}%`;
}

export function formatDate(value: string): string {
    const [year, month, day] = value.slice(0, 10).split('-');
    return `${day}/${month}/${year}`;
}

export const MESES_LABELS = [
    'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
    'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic',
];

export function getMesLabel(mes: number): string {
    return MESES_LABELS[mes - 1] ?? String(mes);
}

export function getMesFullLabel(mes: number): string {
    const full = [
        'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
    ];
    return full[mes - 1] ?? String(mes);
}
