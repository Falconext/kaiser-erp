import { create } from 'zustand';
import { get } from '../utils/fetch';
import { devtools } from 'zustand/middleware';

export interface KPI {
    porPagar: number;
    porCobrar: number;
    ingresosPeriodo: number;
    egresosPeriodo: number;
    balancePeriodo: number;
}

export interface ChartData {
    fecha: string;
    ingresos: number;
    egresos: number;
}

export interface MetodoPagoResumen {
    metodo: string;
    total: number;
    cantidad: number;
    referencias: number;
    explicacion: string;
}

export interface ConciliacionResumen {
    fuentePrincipal: string;
    pagosRegistrados: number;
    comprobantesRespaldo: number;
    totalPorMetodo: number;
}

export interface IFinanzasState {
    kpis: KPI | null;
    chartData: ChartData[];
    metodosPago: MetodoPagoResumen[];
    conciliacion: ConciliacionResumen | null;
    getResumenFinanciero: (fechaInicio: string, fechaFin: string, sedeId?: number | null, usuarioId?: number | null) => void;
    isLoading: boolean;
}

export const useFinanzasStore = create<IFinanzasState>()(devtools((set) => ({
    kpis: null,
    chartData: [],
    metodosPago: [],
    conciliacion: null,
    isLoading: false,
    getResumenFinanciero: async (fechaInicio: string, fechaFin: string, sedeId?: number | null, usuarioId?: number | null) => {
        try {
            set({ isLoading: true });
            const params = new URLSearchParams({ fechaInicio, fechaFin });
            if (sedeId) params.append('sedeId', String(sedeId));
            if (usuarioId) params.append('usuarioId', String(usuarioId));
            const resp: any = await get(`finanzas/resumen?${params}`);
            console.log("Respuesta Resumen Financiero:", resp);
            if (resp.code === 1 || resp.success) { // Handle potential different response structure
                // Assuming resp.data contains { kpis: ..., chartData: ... }
                // Based on backend service return
                const data = resp.data || resp; // Fallback if data wrapper is different
                set({
                    kpis: data.kpis,
                    chartData: data.chartData,
                    metodosPago: data.metodosPago || [],
                    conciliacion: data.conciliacion || null,
                });
            } else {
                set({
                    kpis: null,
                    chartData: [],
                    metodosPago: [],
                    conciliacion: null,
                });
            }
        } catch (error) {
            console.error(error);
            set({
                kpis: null,
                chartData: [],
                metodosPago: [],
                conciliacion: null,
            });
        } finally {
            set({ isLoading: false });
        }
    }
})));
