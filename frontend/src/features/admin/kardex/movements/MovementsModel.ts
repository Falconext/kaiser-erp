export interface MovimientoKardex {
    id: number;
    fecha: string | Date;
    tipoMovimiento: 'INGRESO' | 'SALIDA' | 'AJUSTE' | 'TRANSFERENCIA';
    concepto: string;
    cantidad: number;
    stockAnterior: number;
    gananciaUnidad?: number;
    stockActual: number;
    precioUnitario?: number;
    costoUnitario?: any;
    valorTotal?: number;
    observacion?: string;
    lote?: string;
    fechaVencimiento?: string | Date;
    sedeId?: number;
    sede?: { id: number; nombre: string };
    usuario?: {
        id: number;
        nombre: string;
    };
    comprobante?: {
        id: number;
        tipoDoc: string;
        serie: string;
        correlativo: number;
    };
    producto: {
        id: number;
        codigo: string;
        descripcion: string;
        unidadMedida: {
            codigo: string;
            nombre: string;
        };
    };
}

export interface KardexResponse {
    movimientos: MovimientoKardex[];
    paginacion: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}

export const TIPOS_MOVIMIENTO = [
    { value: '', label: 'Todos los movimientos' },
    { value: 'INGRESO', label: 'Ingresos' },
    { value: 'SALIDA', label: 'Salidas' },
    { value: 'AJUSTE', label: 'Ajustes' },
    { value: 'TRANSFERENCIA', label: 'Transferencias' },
];

export interface IMovementsViewModelState {
    filters: {
        fechaInicio: string;
        fechaFin: string;
        productoId: string;
        tipoMovimiento: string;
    };
    productQuery: string;
    showSuggestions: boolean;
    selectedMovimiento: MovimientoKardex | null;
    currentPage: number;
    itemsPerPage: number;
}
