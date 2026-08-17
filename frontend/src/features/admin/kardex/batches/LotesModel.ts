export type EstadoLote = 'TODOS' | 'VIGENTE' | 'POR_VENCER' | 'VENCIDO';

export interface ILoteGestion {
    id: number;
    lote: string;
    fechaVencimiento: string;
    stockActual: number;
    stockInicial: number;
    costoUnitario: number | null;
    proveedor: string | null;
    activo: boolean;
    creadoEn: string;
    diasAlVencimiento: number;
    valorEnStock: number;
    totalVentas: number;
    producto: {
        id: number;
        descripcion: string;
        codigo: string;
        imagenUrl: string | null;
        categoriaId: number | null;
    };
}

export interface ILotesKpis {
    totalActivos: number;
    porVencer30d: number;
    vencidosConStock: number;
    valorTotalInventario: number;
}

export interface ILotesResponse {
    kpis: ILotesKpis;
    lotes: ILoteGestion[];
    total: number;
    page: number;
    limit: number;
}

export const ESTADO_LOTE_OPTIONS: { label: string; value: EstadoLote }[] = [
    { label: 'Todos', value: 'TODOS' },
    { label: 'Vigentes', value: 'VIGENTE' },
    { label: 'Por vencer', value: 'POR_VENCER' },
    { label: 'Vencidos', value: 'VENCIDO' },
];
