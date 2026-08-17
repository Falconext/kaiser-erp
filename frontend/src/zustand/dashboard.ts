import { create } from 'zustand';
import { get } from '../utils/fetch';
import { devtools } from 'zustand/middleware';

export interface IDashboardState {
    totalCLients: number;
    totalProducts: number;
    totalInvoices: number
    totalAmount: number;
    newClientsByDate: [],
    topSells: [],
    getTopSells: (fechaInicio: string, fechaFin: string, sedeId?: number | null) => void,
    amountByDate: [];
    totalPaymentToday: number;
    getTotalHeaderDashboard: (fechaInicio: string, fechaFin: string, sedeId?: number | null) => void;
    getTotalAttendancePatients: () => void;
    getTotalPaymentsMonth: () => void;
    getTotalPaymentToday: () => void;
    totalAttendancePatientsByToday: [];
    getTotalAmountByDate: (fechaInicio: string, fechaFin: string, sedeId?: number | null) => void;
    getPatientPackagesByState: () => void;
    dataPatientPackagesByState: []
    getPaymentMethods: () => void;
    dataPaymentMethods: []
    getTotalAmountByDatePayment: (fechaInicio: string, fechaFin: string, sedeId?: number | null) => void
    getNewClientsByDate: (fechaInicio: string, fechaFin: string, sedeId?: number | null) => void
    overviewData: any;
    getOverview: (fechaInicio: string, fechaFin: string, sedeId?: number | null) => void
    topPorCategoria: any;
    getTopPorCategoria: (fechaInicio: string, fechaFin: string, opts?: { sedeId?: number | null; moneda?: string; categoriaId?: number | null; limit?: number }) => void
}

export const useDashboardStore = create<IDashboardState>()(devtools((set, _get) => ({
    totalCLients: 0,
    amountByDate: [],
    totalInvoices: 0,
    topSells: [],
    totalAmount: 0,
    totalAttendancePatients: 0,
    totalPaymentsMonth: 0,
    overviewData: null,
    topPorCategoria: null,
    getTopPorCategoria: async (fechaInicio, fechaFin, opts) => {
        try {
            const params = new URLSearchParams({ fechaInicio, fechaFin });
            if (opts?.sedeId) params.append('sedeId', String(opts.sedeId));
            if (opts?.moneda) params.append('moneda', opts.moneda);
            if (opts?.categoriaId) params.append('categoriaId', String(opts.categoriaId));
            if (opts?.limit) params.append('limit', String(opts.limit));
            const resp: any = await get(`dashboard/top-productos-por-categoria?${params}`);
            if (resp.code === 1) {
                set({ topPorCategoria: resp.data }, false, "GET_TOP_POR_CATEGORIA");
            } else {
                set({ topPorCategoria: null });
            }
        } catch (error) {
            set({ topPorCategoria: null });
        }
    },
    getOverview: async (fechaInicio: string, fechaFin: string, sedeId?: number | null) => {
        try {
            const params = new URLSearchParams({ fechaInicio, fechaFin });
            if (sedeId) params.append('sedeId', String(sedeId));
            const resp: any = await get(`dashboard/overview?${params}`);
            if (resp.code === 1) {
                set({ overviewData: resp.data }, false, "GET_OVERVIEW");
            } else {
                set({ overviewData: null });
            }
        } catch (error) {
            set({ overviewData: null });
        }
    },
    getNewClientsByDate: async (fechaInicio: string, fechaFin: string, sedeId?: number | null) => {
        try {
            const params = new URLSearchParams({ fechaInicio, fechaFin });
            if (sedeId) params.append('sedeId', String(sedeId));
            const resp: any = await get(`dashboard/nuevos-clientes-por-fecha?${params}`);
            if (resp.code === 1) {
                set({ newClientsByDate: resp.data }, false, "GET_NEW_CLIENTS");
            } else {
                set({ newClientsByDate: [] });
            }
        } catch (error) {
        }
    },
    getTopSells: async (fechaInicio: string, fechaFin: string, sedeId?: number | null) => {
        try {
            const params = new URLSearchParams({ fechaInicio, fechaFin });
            if (sedeId) params.append('sedeId', String(sedeId));
            const resp: any = await get(`dashboard/top-productos?${params}`);
            if (resp.code === 1) {
                set({ topSells: resp.data }, false, "GET_TOP_SELLS");
            } else {
                set({ totalCLients: 0 });
            }
        } catch (error) {
        }
    },
    getTotalHeaderDashboard: async (fechaInicio: string, fechaFin: string, sedeId?: number | null) => {
        try {
            const params = new URLSearchParams({ fechaInicio, fechaFin });
            if (sedeId) params.append('sedeId', String(sedeId));
            const resp: any = await get(`dashboard/dashboard?${params}`);
            if (resp.code === 1) {
                set({
                    totalCLients: resp.data.totalClientes,
                    totalProducts: resp.data.totalProductos,
                    totalInvoices: resp.data.totalComprobantes,
                    totalAmount: resp.data.totalIngresos
                }, false, "GET_TOTALS_HEADER_DASHBOARD");
            } else {
                set({ totalCLients: 0 });
            }
        } catch (error) {
        }
    },
    getTotalAmountByDate: async (fechaInicio: string, fechaFin: string, sedeId?: number | null) => {
        try {
            const params = new URLSearchParams({ fechaInicio, fechaFin });
            if (sedeId) params.append('sedeId', String(sedeId));
            const resp: any = await get(`dashboard/ingresos-por-fecha-comprobante?${params}`);
            if (resp.code === 1) {
                set({ amountByDate: resp.data }, false, "GET_AMOUNT_BY_TOTAL");
            } else {
                set({ amountByDate: [] });
            }
        } catch (error) {
        }
    },
    getTotalAmountByDatePayment: async (fechaInicio: string, fechaFin: string, sedeId?: number | null) => {
        try {
            const params = new URLSearchParams({ fechaInicio, fechaFin });
            if (sedeId) params.append('sedeId', String(sedeId));
            const resp: any = await get(`dashboard/ingresos-por-fecha-medio-pago?${params}`);
            if (resp.code === 1) {
                set({ dataPaymentMethods: resp.data }, false, "GET_AMOUNT_BY_PAYMENTS");
            } else {
                set({ dataPaymentMethods: [] });
            }
        } catch (error) {
        }
    }
})));


