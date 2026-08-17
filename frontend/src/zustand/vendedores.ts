import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { get } from '../utils/fetch';

export interface VendedorRanking {
    posicion: number;
    usuario: { id: number; nombre: string; email: string; rol: string } | null;
    totalVentas: number;
    numComprobantes: number;
    ticketPromedio: number;
    totalVentasPeriodoAnterior: number;
    crecimientoPct: number | null;
}

export interface VendedorChartPoint {
    fecha: string;
    total: number;
}

export interface VendedorComprobante {
    id: number;
    serie: string;
    correlativo: number;
    tipoDoc: string;
    fechaEmision: string;
    clienteNombre: string;
    total: number;
    estadoEnvioSunat: string;
}

export interface VendedorProducto {
    productoId: number | null;
    descripcion: string;
    cantidad: number;
    monto: number;
}

export interface VendedorDetalle {
    usuario: { id: number; nombre: string; email: string; rol: string };
    chartData: VendedorChartPoint[];
    productos: VendedorProducto[];
    comprobantes: VendedorComprobante[];
}

interface VendedoresState {
    ranking: VendedorRanking[];
    detalle: VendedorDetalle | null;
    isLoadingRanking: boolean;
    isLoadingDetalle: boolean;
    getRanking: (fechaInicio: string, fechaFin: string, sedeId?: number | null) => Promise<void>;
    getDetalle: (id: number, fechaInicio: string, fechaFin: string) => Promise<void>;
    clearDetalle: () => void;
}

export const useVendedoresStore = create<VendedoresState>()(devtools((set) => ({
    ranking: [],
    detalle: null,
    isLoadingRanking: false,
    isLoadingDetalle: false,

    getRanking: async (fechaInicio, fechaFin, sedeId) => {
        set({ isLoadingRanking: true });
        try {
            const params = new URLSearchParams({ fechaInicio, fechaFin });
            if (sedeId) params.append('sedeId', String(sedeId));
            const resp: any = await get(`usuario/ranking-vendedores?${params}`);
            set({ ranking: resp.data ?? [] });
        } catch {
            set({ ranking: [] });
        } finally {
            set({ isLoadingRanking: false });
        }
    },

    getDetalle: async (id, fechaInicio, fechaFin) => {
        set({ isLoadingDetalle: true });
        try {
            const params = new URLSearchParams({ fechaInicio, fechaFin });
            const resp: any = await get(`usuario/ranking-vendedores/${id}?${params}`);
            set({ detalle: resp.data ?? null });
        } catch {
            set({ detalle: null });
        } finally {
            set({ isLoadingDetalle: false });
        }
    },

    clearDetalle: () => set({ detalle: null }),
})));
