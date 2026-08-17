import { create } from 'zustand';
import { get } from '../utils/fetch';
import useAlertStore from './alert';
import { devtools } from 'zustand/middleware';

export interface IResumenReporte {
    totalVenta: number,
    totalIGV: number,
    totalGravadas: number,
    totalInafectas: number,
    totalDescuentos: number,
    totalBoletas: number,
    totalFacturas: number,
    totalNotasCredito: number,
    totalNotasDebito: number
}

export interface IResumenReporteInformales {
    totalVenta: number,
    totalTickets: number,
    totalNotasVenta: number,
    totalRecibosHonorarios: number,
    totalComprobantesPago: number,
    totalNotasPedido: number,
    totalOrdenesTrabajo: number,
}

export interface IResumenReporteCompras {
    totalCompra: number,
    totalGravadas: number,
    totalIGV: number,
    totalSaldo: number,
    totalFacturas: number,
    totalBoletas: number,
    totalOtros: number,
}

export interface IResumenReporteGastos {
    totalGastos: number,
    totalPublicidad: number,
    totalSueldos: number,
    totalEnvios: number,
    totalComisiones: number,
    totalAlquiler: number,
    totalOtros: number,
}

export interface IAccountingState {
    // Reportes formales (existente)
    exportExcelReport: (params: any) => void
    exportPdfReport: (params: any, formato: 'zip' | 'pdf') => Promise<void>
    reportInvoices: [];
    resumenReporte: IResumenReporte | null,
    getAllReportInvoice: (params: any, callback?: Function,
        allProperties?: boolean) => void

    // Reportes informales
    exportExcelReportInformal: (params: any) => void
    reportInvoicesInformal: [];
    resumenReporteInformal: IResumenReporteInformales | null,
    getAllReportInvoiceInformal: (params: any, callback?: Function,
        allProperties?: boolean) => void

    // Arqueo de caja (nuevo)
    exportExcelArqueo: (params: any) => void
    arqueoData: any,
    getAllArqueo: (params: any, callback?: Function,
        allProperties?: boolean) => void

    // Reportes de compras
    reportCompras: [];
    resumenReporteCompras: IResumenReporteCompras | null,
    getAllReportCompras: (params: any, callback?: Function) => void
    exportExcelReportCompras: (params: any) => void

    // Reportes de gastos
    reportGastos: [];
    resumenReporteGastos: IResumenReporteGastos | null,
    getAllReportGastos: (params: any, callback?: Function) => void
    exportExcelReportGastos: (params: any) => void
}

export const useAccountingStore = create<IAccountingState>()(devtools((set, _get) => ({
    // Estados para reportes formales
    reportInvoices: [],
    resumenReporte: null,
    
    // Estados para reportes informales
    reportInvoicesInformal: [],
    resumenReporteInformal: null,
    
    // Estados para arqueo de caja
    arqueoData: null,

    // Estados para reportes de compras y gastos
    reportCompras: [],
    resumenReporteCompras: null,
    reportGastos: [],
    resumenReporteGastos: null,
    getAllReportInvoice: async (params: any, callback?: Function,
        _allProperties?: boolean) => {
        try {
            // useAlertStore.setState({ loading: true })
            const filteredParams = Object.entries(params)
                .filter(([_, value]) => value !== undefined)
                .reduce((obj, [key, value]) => ({ ...obj, [key]: value }), {});

            const query = new URLSearchParams(filteredParams).toString();
            const resp: any = await get(`/contabilidad/obtener-reporte?${query}`);
            console.log(resp)
            if (resp.code === 1) {
                useAlertStore.setState({ success: true });
                set({
                    reportInvoices: resp.data.comprobantes,
                    resumenReporte: resp.data.resumen
                }, false, "OBTENER REPORTE DE COMPROBANTES");
                useAlertStore.setState({ loading: false })
            } else {
                set({
                    reportInvoices: []
                });
                useAlertStore.setState({ loading: false })
            }
        } catch (error) {
            useAlertStore.setState({ loading: false })
        } finally {
            if (callback) {
                callback();
            }
        }
    },
    exportExcelReport: async (params) => {
        try {
            useAlertStore.setState({ loading: true });
            const filteredParams : any = Object.entries(params)
                .filter(([_, value]) => value !== undefined)
                .reduce((obj, [key, value]) => ({ ...obj, [key]: value }), {});

            const query = new URLSearchParams(filteredParams).toString();
            const response = await fetch(`${import.meta.env.VITE_API_URL}/contabilidad/reporte-exportar?${query}`, {
                method: 'GET',
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('ACCESS_TOKEN')}`,
                },
            });
            if (!response.ok) {
                throw new Error('Error al descargar el archivo');
            }
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `reporte-contabilidad-${filteredParams.fechaInicio}_a_${filteredParams.fechaFin}.xlsx`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
            useAlertStore.setState({ success: true });
            useAlertStore.getState().alert('Exportación exitosa', 'success');
        } catch (error: any) {
            console.error('Error en exportar reporte:', error.message || error);
            useAlertStore.getState().alert(error.message || 'Error al exportar los productos', 'error');
        } finally {
            useAlertStore.setState({ loading: false });
        }
    },

    exportPdfReport: async (params, formato) => {
        try {
            useAlertStore.setState({ loading: true });
            const base: any = { ...params, tipoComprobante: 'FORMAL', formato };
            const filteredParams: any = Object.entries(base)
                .filter(([_, value]) => value !== undefined && value !== null && value !== '')
                .reduce((obj, [key, value]) => ({ ...obj, [key]: value }), {});

            const query = new URLSearchParams(filteredParams).toString();
            const response = await fetch(`${import.meta.env.VITE_API_URL}/comprobante/exportar-pdf?${query}`, {
                method: 'GET',
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('ACCESS_TOKEN')}`,
                },
            });
            if (!response.ok) {
                let msg = 'No se pudo exportar los comprobantes';
                try { const j = await response.json(); msg = j?.message || msg; } catch { /* respuesta binaria/no-JSON */ }
                throw new Error(msg);
            }
            const blob = await response.blob();
            const disposition = response.headers.get('Content-Disposition') || '';
            const match = disposition.match(/filename="?([^"]+)"?/);
            const filename = match?.[1] || `comprobantes_${filteredParams.fechaInicio}_a_${filteredParams.fechaFin}.${formato === 'pdf' ? 'pdf' : 'zip'}`;

            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
            useAlertStore.getState().alert('Exportación generada correctamente', 'success');
        } catch (error: any) {
            useAlertStore.getState().alert(error.message || 'No se pudo exportar los comprobantes', 'error');
        } finally {
            useAlertStore.setState({ loading: false });
        }
    },

    // Funciones para reportes informales
    getAllReportInvoiceInformal: async (params: any, callback?: Function,
        _allProperties?: boolean) => {
        try {
            const filteredParams = Object.entries(params)
                .filter(([_, value]) => value !== undefined)
                .reduce((obj, [key, value]) => ({ ...obj, [key]: value }), {});

            const query = new URLSearchParams(filteredParams).toString();
            const resp: any = await get(`/contabilidad/obtener-reporte-informales?${query}`);
            console.log('Reporte informales:', resp)
            if (resp.code === 1) {
                useAlertStore.setState({ success: true });
                set({
                    reportInvoicesInformal: resp.data.comprobantes,
                    resumenReporteInformal: resp.data.resumen
                }, false, "OBTENER REPORTE DE COMPROBANTES INFORMALES");
                useAlertStore.setState({ loading: false })
            } else {
                set({
                    reportInvoicesInformal: []
                });
                useAlertStore.setState({ loading: false })
            }
        } catch (error) {
            useAlertStore.setState({ loading: false })
        } finally {
            if (callback) {
                callback();
            }
        }
    },
    
    exportExcelReportInformal: async (params) => {
        try {
            useAlertStore.setState({ loading: true });
            const filteredParams : any = Object.entries(params)
                .filter(([_, value]) => value !== undefined)
                .reduce((obj, [key, value]) => ({ ...obj, [key]: value }), {});

            const query = new URLSearchParams(filteredParams).toString();
            const response = await fetch(`${import.meta.env.VITE_API_URL}/contabilidad/reporte-informales-exportar?${query}`, {
                method: 'GET',
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('ACCESS_TOKEN')}`,
                },
            });
            if (!response.ok) {
                throw new Error('Error al descargar el archivo');
            }
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `reporte-informales-${filteredParams.fechaInicio}_a_${filteredParams.fechaFin}.xlsx`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
            useAlertStore.setState({ success: true });
            useAlertStore.getState().alert('Exportación exitosa', 'success');
        } catch (error: any) {
            console.error('Error en exportar reporte informales:', error.message || error);
            useAlertStore.getState().alert(error.message || 'Error al exportar el reporte', 'error');
        } finally {
            useAlertStore.setState({ loading: false });
        }
    },
    
    // Funciones para arqueo de caja
    getAllArqueo: async (params: any, callback?: Function,
        _allProperties?: boolean) => {
        try {
            const filteredParams = Object.entries(params)
                .filter(([_, value]) => value !== undefined)
                .reduce((obj, [key, value]) => ({ ...obj, [key]: value }), {});

            const query = new URLSearchParams(filteredParams).toString();
            const resp: any = await get(`/contabilidad/obtener-arqueo?${query}`);
            console.log('Arqueo de caja:', resp)
            if (resp.code === 1) {
                useAlertStore.setState({ success: true });
                set({
                    arqueoData: resp.data
                }, false, "OBTENER ARQUEO DE CAJA");
                useAlertStore.setState({ loading: false })
            } else {
                set({
                    arqueoData: null
                });
                useAlertStore.setState({ loading: false })
            }
        } catch (error) {
            console.error('Error obteniendo arqueo:', error);
            useAlertStore.setState({ loading: false })
        } finally {
            if (callback) {
                callback();
            }
        }
    },
    
    exportExcelArqueo: async (params) => {
        try {
            useAlertStore.setState({ loading: true });
            const filteredParams : any = Object.entries(params)
                .filter(([_, value]) => value !== undefined)
                .reduce((obj, [key, value]) => ({ ...obj, [key]: value }), {});

            const query = new URLSearchParams(filteredParams).toString();
            const response = await fetch(`${import.meta.env.VITE_API_URL}/contabilidad/arqueo-exportar?${query}`, {
                method: 'GET',
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('ACCESS_TOKEN')}`,
                },
            });
            if (!response.ok) {
                throw new Error('Error al descargar el archivo');
            }
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `arqueo-caja-${filteredParams.fechaInicio}_a_${filteredParams.fechaFin}.xlsx`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
            useAlertStore.setState({ success: true });
            useAlertStore.getState().alert('Exportación exitosa', 'success');
        } catch (error: any) {
            console.error('Error en exportar arqueo:', error.message || error);
            useAlertStore.getState().alert(error.message || 'Error al exportar el arqueo', 'error');
        } finally {
            useAlertStore.setState({ loading: false });
        }
    },

    // Funciones para reportes de compras
    getAllReportCompras: async (params: any, callback?: Function) => {
        try {
            const filteredParams = Object.entries(params)
                .filter(([_, value]) => value !== undefined)
                .reduce((obj, [key, value]) => ({ ...obj, [key]: value }), {});
            const query = new URLSearchParams(filteredParams).toString();
            const resp: any = await get(`/contabilidad/obtener-reporte-compras?${query}`);
            if (resp.code === 1) {
                set({
                    reportCompras: resp.data.compras,
                    resumenReporteCompras: resp.data.resumen
                }, false, "OBTENER REPORTE DE COMPRAS");
            } else {
                set({ reportCompras: [], resumenReporteCompras: null });
            }
        } catch (error) {
            console.error('Error obteniendo reporte compras:', error);
        } finally {
            if (callback) callback();
        }
    },

    exportExcelReportCompras: async (params) => {
        try {
            useAlertStore.setState({ loading: true });
            const filteredParams: any = Object.entries(params)
                .filter(([_, value]) => value !== undefined)
                .reduce((obj, [key, value]) => ({ ...obj, [key]: value }), {});
            const query = new URLSearchParams(filteredParams).toString();
            const response = await fetch(`${import.meta.env.VITE_API_URL}/contabilidad/reporte-compras-exportar?${query}`, {
                method: 'GET',
                headers: { Authorization: `Bearer ${localStorage.getItem('ACCESS_TOKEN')}` },
            });
            if (!response.ok) throw new Error('Error al descargar el archivo');
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `reporte-compras-${filteredParams.fechaInicio}_a_${filteredParams.fechaFin}.xlsx`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
            useAlertStore.getState().alert('Exportación exitosa', 'success');
        } catch (error: any) {
            useAlertStore.getState().alert(error.message || 'Error al exportar el reporte', 'error');
        } finally {
            useAlertStore.setState({ loading: false });
        }
    },

    // Funciones para reportes de gastos
    getAllReportGastos: async (params: any, callback?: Function) => {
        try {
            const filteredParams = Object.entries(params)
                .filter(([_, value]) => value !== undefined)
                .reduce((obj, [key, value]) => ({ ...obj, [key]: value }), {});
            const query = new URLSearchParams(filteredParams).toString();
            const resp: any = await get(`/contabilidad/obtener-reporte-gastos?${query}`);
            if (resp.code === 1) {
                set({
                    reportGastos: resp.data.gastos,
                    resumenReporteGastos: resp.data.resumen
                }, false, "OBTENER REPORTE DE GASTOS");
            } else {
                set({ reportGastos: [], resumenReporteGastos: null });
            }
        } catch (error) {
            console.error('Error obteniendo reporte gastos:', error);
        } finally {
            if (callback) callback();
        }
    },

    exportExcelReportGastos: async (params) => {
        try {
            useAlertStore.setState({ loading: true });
            const filteredParams: any = Object.entries(params)
                .filter(([_, value]) => value !== undefined)
                .reduce((obj, [key, value]) => ({ ...obj, [key]: value }), {});
            const query = new URLSearchParams(filteredParams).toString();
            const response = await fetch(`${import.meta.env.VITE_API_URL}/contabilidad/reporte-gastos-exportar?${query}`, {
                method: 'GET',
                headers: { Authorization: `Bearer ${localStorage.getItem('ACCESS_TOKEN')}` },
            });
            if (!response.ok) throw new Error('Error al descargar el archivo');
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `reporte-gastos-${filteredParams.fechaInicio}_a_${filteredParams.fechaFin}.xlsx`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
            useAlertStore.getState().alert('Exportación exitosa', 'success');
        } catch (error: any) {
            useAlertStore.getState().alert(error.message || 'Error al exportar el reporte', 'error');
        } finally {
            useAlertStore.setState({ loading: false });
        }
    },
})));


