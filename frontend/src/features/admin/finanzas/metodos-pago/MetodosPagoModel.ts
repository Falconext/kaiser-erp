export interface MetodoPagoItem {
    id: string;
    origen: 'PAGO' | 'COMPROBANTE_SIN_PAGO';
    fecha: string;
    metodo: string;
    monto: number;
    referencia?: string | null;
    cuenta?: string | null;
    observacion?: string | null;
    documento: string;
    comprobanteId: number;
    cliente: string;
    clienteDoc?: string | null;
    estadoPago?: string | null;
}

export interface MetodoPagoGrupo {
    metodo: string;
    total: number;
    cantidad: number;
    referencias: number;
    cuentas: string[];
    items: MetodoPagoItem[];
}

export interface MetodosPagoResponse {
    periodo: {
        mes: number;
        anio: number;
        fechaInicio?: string | null;
        fechaFin?: string | null;
        label: string;
    };
    resumen: {
        totalCobrado: number;
        totalMetodos: number;
        totalPagos: number;
        totalConReferencia: number;
        totalRespaldo: number;
    };
    metodos: MetodoPagoGrupo[];
}

export const MESES_FULL = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

export function formatSoles(value: number): string {
    return `S/ ${Number(value || 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function methodColor(method: string): string {
    const colors: Record<string, string> = {
        EFECTIVO: '#10b981',
        YAPE: '#8b5cf6',
        PLIN: '#06b6d4',
        TRANSFERENCIA: '#2563eb',
        TARJETA: '#f59e0b',
        MIXTO: '#64748b',
    };
    return colors[String(method || '').toUpperCase()] || '#111827';
}

export function methodIcon(method: string): string {
    const icons: Record<string, string> = {
        EFECTIVO: 'solar:wallet-money-bold-duotone',
        YAPE: 'solar:smartphone-bold-duotone',
        PLIN: 'solar:smartphone-2-bold-duotone',
        TRANSFERENCIA: 'solar:banknote-2-bold-duotone',
        TARJETA: 'solar:card-bold-duotone',
        MIXTO: 'solar:card-2-bold-duotone',
    };
    return icons[String(method || '').toUpperCase()] || 'solar:money-bag-bold-duotone';
}
