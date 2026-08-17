export interface DashboardData {
    resumenGeneral: {
        totalProductos: number;
        valorTotalInventario: number;
        productosStockCritico: number;
        productosStockCero: number;
    };
    movimientosRecientes: Array<{
        id: number;
        fecha: Date;
        tipoMovimiento: string;
        concepto: string;
        cantidad: number;
        producto: {
            codigo: string;
            descripcion: string;
        };
    }>;
    alertas: {
        stockCritico: number;
        productosObsoletos: number;
        valorInmovilizado: number;
    };
    topProductos: {
        stockCritico: Array<{
            id: number;
            codigo: string;
            descripcion: string;
            stock: number;
            stockMinimo: number;
            valorTotal: number;
        }>;
        obsoletos: Array<{
            id: number;
            codigo: string;
            descripcion: string;
            stock: number;
            valorInmovilizado: number;
            diasSinMovimiento: number;
        }>;
    };
    fechaActualizacion: Date;
    farmacia: {
        lotesVencidos: number;
        lotesPorVencer30d: number;
        valorLotesVencidos: number;
        top5PorVencer: Array<{
            id: number;
            lote: string;
            fechaVencimiento: string;
            diasAlVencimiento: number;
            stockActual: number;
            producto: { descripcion: string; codigo: string };
        }>;
        top5Vencidos: Array<{
            id: number;
            lote: string;
            fechaVencimiento: string;
            diasAlVencimiento: number;
            stockActual: number;
            producto: { descripcion: string; codigo: string };
        }>;
    } | null;
}

export interface IDashboardViewModelState {
    loading: boolean;
    dashboardData: DashboardData | null;
    error: string | null;
}

export const COLORS = {
    primary: '#3B82F6',
    success: '#10B981',
    warning: '#F59E0B',
    danger: '#EF4444',
    info: '#06B6D4',
    purple: '#8B5CF6',
};

export const PIE_COLORS = [COLORS.success, COLORS.warning, COLORS.danger, COLORS.info];
