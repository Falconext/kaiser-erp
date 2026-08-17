
import { create } from 'zustand';
import { del, get as httpGet, post, patch } from '../utils/fetch';
import useAlertStore from './alert';

export interface ResellerDashboardStats {
    saldo: number;
    porcentajeDescuento: number;
    clientesActivos: number;
    clientesProduccion?: number; // clientes en producción (usaDemo:false) — base del tier de volumen
    clientesSuspendidos: number;
    totalClientes: number;
    // Inteligencia de ganancias (calculada en backend)
    ingresoMensual?: number;
    costoMensual?: number;
    gananciaMensual?: number;
    margenPct?: number;
    clientesWhiteLabel?: number;
    clientesEstandar?: number;
    // Precio de venta que el reseller cobra por plan (configurable).
    preciosPlan?: Record<string, number> | null;
}

export interface ResellerProyeccionClienteRenovar {
    empresaId: number;
    razonSocial: string;
    plan: string;
    esWhiteLabel: boolean;
    fechaExpiracion: string;
    diasRestantes: number;
    vencida: boolean;
    costo: number;
    ingreso: number;
    ganancia: number;
}

export interface ResellerProyeccionCliente {
    empresaId: number;
    razonSocial: string;
    logo: string | null;
    plan: string;
    esWhiteLabel: boolean;
    fechaExpiracion: string;
    precioClienteFinal: number | null;
    ingreso: number;
    costo: number;
    ganancia: number;
    ingresoEsEstimado: boolean;
}

export interface ResellerProyeccionData {
    resumen: {
        clientesActivos: number;
        ingresoMensual: number;
        costoMensual: number;
        gananciaMensual: number;
        margenPct: number;
        clientesConPrecio: number;
        clientesEstimados: number;
        clientesWhiteLabel: number;
        clientesEstandar: number;
        ingresoProyectadoProximoMes: number;
        costoProyectadoProximoMes: number;
        gananciaProyectadaProximoMes: number;
        costoRenovacionesProximas: number;
        clientesPorRenovar: number;
    };
    clientes: ResellerProyeccionCliente[];
    proximasRenovaciones: ResellerProyeccionClienteRenovar[];
}

export interface ResellerEstadoCuentaResumen {
    recargas: { total: number; cantidad: number };
    activaciones: { cobrado: number; cantidad: number };
    mensualidades: { cobrado: number; aplicadas: number; pendientes: number; rechazadas: number };
    devoluciones: { total: number; cantidad: number };
    totalCobrado: number;
    flujoNeto: number;
}

export interface ResellerEstadoCuentaMovimiento {
    id: number;
    tipo: string;
    estado: string;
    monto: number;
    fecha: string;
    intento?: number;
    motivo?: string;
    descripcion?: string;
    empresa?: {
        id: number;
        razonSocial: string;
        ruc: string;
        estado: string;
        plan?: { id: number; nombre: string };
    };
}

export interface ResellerEstadoCuentaData {
    reseller: {
        id: number;
        nombre: string;
        codigo: string;
        saldoActual: number;
    };
    periodo: { desde: string; hasta: string };
    resumen: ResellerEstadoCuentaResumen;
    paginacion: { page: number; limit: number; total: number; totalPages: number };
    movimientos: ResellerEstadoCuentaMovimiento[];
    recargas: Array<{
        id: number;
        fecha: string;
        monto: number;
        medioPago?: string;
        referencia?: string;
        observacion?: string;
    }>;
}

export interface IResellerPanelState {
    stats: ResellerDashboardStats;
    clientes: any[];
    planes: any[];
    recargas: any[];
    renovaciones: any[];
    estadoCuenta: ResellerEstadoCuentaData | null;
    proyeccion: ResellerProyeccionData | null;
    branding: any | null;
    renovacionesResumen: {
        aplicados: number;
        pendientes: number;
        rechazados: number;
        total: number;
    };
    getDashboard: (resellerId: number) => Promise<void>;
    getProyeccion: (resellerId: number) => Promise<void>;
    getBranding: (resellerId: number) => Promise<void>;
    updateBranding: (resellerId: number, data: any) => Promise<{ success: boolean; error?: string }>;
    checkDominio: (resellerId: number, dominio: string) => Promise<{ disponible: boolean; motivo?: string; dominio: string } | null>;
    getClientes: (resellerId: number) => Promise<void>;
    getRecargas: (resellerId: number) => Promise<void>;
    getRenovaciones: (resellerId: number, estado?: 'APLICADO' | 'PENDIENTE' | 'RECHAZADO' | '') => Promise<void>;
    getEstadoCuenta: (
        resellerId: number,
        filtros?: { desde?: string; hasta?: string; tipo?: string; estado?: string; page?: number; limit?: number }
    ) => Promise<void>;
    getPlanes: () => Promise<void>;
    createCliente: (resellerId: number, data: any) => Promise<{ success: boolean; error?: string }>;
    toggleEstadoCliente: (resellerId: number, clienteId: number, nuevoEstado: 'ACTIVO' | 'INACTIVO') => Promise<{ success: boolean; error?: string }>;
    deleteDemoCliente: (resellerId: number, clienteId: number) => Promise<{ success: boolean; error?: string }>;
    getClienteDetalle: (resellerId: number, clienteId: number) => Promise<any>;
    updateClienteConfig: (resellerId: number, clienteId: number, data: any) => Promise<{ success: boolean; error?: string }>;
    aprovisionarQpse: (resellerId: number, clienteId: number, forzar?: boolean) => Promise<{ success: boolean; message?: string }>;
    pasarProduccionCliente: (resellerId: number, clienteId: number, planType: '01' | '02') => Promise<{ success: boolean; message?: string }>;
    updatePreciosPlan: (resellerId: number, precios: Record<string, number>) => Promise<{ success: boolean }>;
    updateCliente: (resellerId: number, clienteId: number, data: any) => Promise<{ success: boolean; error?: string }>;
    consultarDocumento: (resellerId: number, tipo: 'DNI' | 'RUC', numero: string) => Promise<any>;
    getClienteSeries: (resellerId: number, clienteId: number) => Promise<any[]>;
    updateClienteSeries: (resellerId: number, clienteId: number, series: any[]) => Promise<{ success: boolean; error?: string }>;
}

export const useResellerPanelStore = create<IResellerPanelState>((set, get) => ({
    stats: {
        saldo: 0,
        porcentajeDescuento: 0,
        clientesActivos: 0,
        clientesProduccion: 0,
        clientesSuspendidos: 0,
        totalClientes: 0
    },
    clientes: [],
    planes: [],
    recargas: [],
    renovaciones: [],
    estadoCuenta: null,
    proyeccion: null,
    branding: null,
    renovacionesResumen: {
        aplicados: 0,
        pendientes: 0,
        rechazados: 0,
        total: 0,
    },

    getDashboard: async (resellerId: number) => {
        console.log('[Store] getDashboard called for:', resellerId);
        try {
            const resp: any = await httpGet(`resellers/${resellerId}/dashboard`);
            console.log('[Store] getDashboard response:', resp);

            if (resp.code === 1) {
                // Fetch reseller detail for Discount
                const resellerResp: any = await httpGet(`resellers/${resellerId}`);
                console.log('[Store] reseller detail response:', resellerResp);

                let descuento = 0;
                if (resellerResp.code === 1) descuento = resellerResp.data.porcentajeDescuento;

                console.log('[Store] Setting stats:', { ...resp.data, porcentajeDescuento: descuento });
                set({
                    stats: {
                        ...resp.data,
                        porcentajeDescuento: descuento
                    }
                });
            } else {
                console.error('[Store] Response code not 1:', resp);
            }
        } catch (error) {
            console.error('[Store] Error in getDashboard:', error);
        }
    },

    getProyeccion: async (resellerId: number) => {
        try {
            const resp: any = await httpGet(`resellers/${resellerId}/proyeccion`);
            if (resp.code === 1) {
                set({ proyeccion: resp.data as ResellerProyeccionData });
            }
        } catch (error) {
            console.error('[Store] Error in getProyeccion:', error);
        }
    },

    getBranding: async (resellerId: number) => {
        try {
            const resp: any = await httpGet(`resellers/${resellerId}/branding`);
            if (resp.code === 1) set({ branding: resp.data });
        } catch (error) {
            console.error('[Store] Error in getBranding:', error);
        }
    },

    updateBranding: async (resellerId: number, data: any) => {
        try {
            useAlertStore.setState({ loading: true });
            const resp: any = await patch(`resellers/${resellerId}/branding`, data);
            useAlertStore.setState({ loading: false });
            if (resp.code === 1) {
                set({ branding: resp.data });
                useAlertStore.getState().alert('Marca actualizada correctamente', 'success');
                return { success: true };
            }
            useAlertStore.getState().alert(resp.message || 'Error al actualizar la marca', 'error');
            return { success: false, error: resp.message };
        } catch (error: any) {
            useAlertStore.setState({ loading: false });
            useAlertStore.getState().alert(error.message || 'Error al actualizar la marca', 'error');
            return { success: false, error: error.message };
        }
    },

    checkDominio: async (resellerId: number, dominio: string) => {
        try {
            const resp: any = await httpGet(`resellers/${resellerId}/dominio/check?dominio=${encodeURIComponent(dominio)}`);
            return resp.code === 1 ? resp.data : null;
        } catch {
            return null;
        }
    },

    getClientes: async (resellerId: number) => {
        try {
            const resp: any = await httpGet(`resellers/${resellerId}`);
            if (resp.code === 1) {
                set({
                    clientes: (resp.data.empresas || []).filter((cliente: any) => cliente.estado !== 'ELIMINADO'),
                    recargas: resp.data.recargas || []
                });
            }
        } catch (error) {
            console.error(error);
        }
    },

    getRecargas: async (resellerId: number) => {
        try {
            const resp: any = await httpGet(`resellers/${resellerId}`);
            if (resp.code === 1) {
                set({ recargas: resp.data.recargas || [] });
            }
        } catch (error) {
            console.error(error);
        }
    },

    getRenovaciones: async (resellerId: number, estado = '') => {
        try {
            const query = estado ? `?estado=${estado}` : '';
            const resp: any = await httpGet(`resellers/${resellerId}/renovaciones${query}`);

            if (resp.code === 1) {
                set({
                    renovaciones: resp.data.movimientos || [],
                    renovacionesResumen: resp.data.resumen || {
                        aplicados: 0,
                        pendientes: 0,
                        rechazados: 0,
                        total: 0,
                    },
                });
            }
        } catch (error) {
            console.error(error);
        }
    },

    getEstadoCuenta: async (resellerId: number, filtros) => {
        try {
            const params = new URLSearchParams();
            if (filtros?.desde) params.set('desde', filtros.desde);
            if (filtros?.hasta) params.set('hasta', filtros.hasta);
            if (filtros?.tipo) params.set('tipo', filtros.tipo);
            if (filtros?.estado) params.set('estado', filtros.estado);
            if (filtros?.page) params.set('page', String(filtros.page));
            if (filtros?.limit) params.set('limit', String(filtros.limit));

            const query = params.toString();
            const resp: any = await httpGet(`resellers/${resellerId}/estado-cuenta${query ? `?${query}` : ''}`);

            if (resp.code === 1) {
                set({ estadoCuenta: resp.data as ResellerEstadoCuentaData });
            }
        } catch (error) {
            console.error(error);
        }
    },

    getPlanes: async () => {
        try {
            const resp: any = await httpGet(`plan`);
            // resp might be array directly if not wrapped? Controller returns array.
            // But fetch wrapper usually returns { code: 1, data: ... } or raw?
            // Checking Plan output from curl.... It returns JSON array directly?
            // "curl http://localhost:4001/api/plan" returned `[{"id":1,...}, ...]`
            // Wait, fetch util handles response. If standard NestJS setup, it might be raw array.
            // Let's assume raw array or check if `get` wrapper handles it.
            // Actually, best to inspect `utils/fetch`. But I'll assume it returns the data.
            // If the response is array, set it.
            if (Array.isArray(resp)) {
                set({ planes: resp });
            } else if (resp.data && Array.isArray(resp.data)) {
                set({ planes: resp.data });
            }
        } catch (error) {
            console.error(error);
        }
    },

    createCliente: async (resellerId: number, data: any) => {
        try {
            useAlertStore.setState({ loading: true });
            const resp: any = await post(`resellers/${resellerId}/clientes`, data);

            if (resp.code === 1) {
                useAlertStore.setState({ loading: false });
                useAlertStore.getState().alert('Cliente creado exitosamente', 'success');
                return { success: true };
            } else {
                useAlertStore.setState({ loading: false });
                useAlertStore.getState().alert(resp.error || 'Error al crear cliente', 'error');
                return { success: false, error: resp.error };
            }
        } catch (error: any) {
            useAlertStore.setState({ loading: false });
            useAlertStore.getState().alert(error.message || 'Error al crear cliente', 'error');
            return { success: false, error: error.message };
        }
    },

    toggleEstadoCliente: async (resellerId: number, clienteId: number, nuevoEstado: 'ACTIVO' | 'INACTIVO') => {
        try {
            useAlertStore.setState({ loading: true });
            const resp: any = await patch(`resellers/${resellerId}/clientes/${clienteId}/estado`, { estado: nuevoEstado });

            if (resp.code === 1) {
                useAlertStore.setState({ loading: false });
                useAlertStore.getState().alert(`Cliente ${nuevoEstado === 'ACTIVO' ? 'activado' : 'suspendido'} correctamente`, 'success');
                // Refresh list using get()
                await get().getClientes(resellerId);
                return { success: true };
            } else {
                useAlertStore.setState({ loading: false });
                useAlertStore.getState().alert(resp.error || 'Error al cambiar estado', 'error');
                return { success: false, error: resp.error };
            }
        } catch (error: any) {
            useAlertStore.setState({ loading: false });
            useAlertStore.getState().alert(error.message || 'Error de conexión', 'error');
            return { success: false, error: error.message };
        }
    },

    deleteDemoCliente: async (resellerId: number, clienteId: number) => {
        try {
            useAlertStore.setState({ loading: true });
            const resp: any = await del(`resellers/${resellerId}/clientes/${clienteId}`);
            useAlertStore.setState({ loading: false });

            if (resp.code === 1) {
                useAlertStore.getState().alert('Cliente demo eliminado correctamente', 'success');
                await get().getClientes(resellerId);
                await get().getDashboard(resellerId);
                return { success: true };
            }

            useAlertStore.getState().alert(resp.error || 'No se pudo eliminar el cliente', 'error');
            return { success: false, error: resp.error };
        } catch (error: any) {
            useAlertStore.setState({ loading: false });
            useAlertStore.getState().alert(error.message || 'Error al eliminar cliente', 'error');
            return { success: false, error: error.message };
        }
    },

    getClienteDetalle: async (resellerId: number, clienteId: number) => {
        try {
            const resp: any = await httpGet(`resellers/${resellerId}/clientes/${clienteId}`);
            if (resp.code === 1) {
                return resp.data;
            }
            return null;
        } catch (error) {
            console.error(error);
            return null;
        }
    },

    updateCliente: async (resellerId: number, clienteId: number, data: any) => {
        try {
            useAlertStore.setState({ loading: true });
            const resp: any = await patch(`resellers/${resellerId}/clientes/${clienteId}`, data);
            useAlertStore.setState({ loading: false });
            if (resp.code === 1) {
                useAlertStore.getState().alert('Cliente actualizado correctamente', 'success');
                return { success: true };
            }
            useAlertStore.getState().alert(resp.message || 'Error al actualizar cliente', 'error');
            return { success: false };
        } catch (error: any) {
            useAlertStore.setState({ loading: false });
            useAlertStore.getState().alert(error.message || 'Error al actualizar cliente', 'error');
            return { success: false };
        }
    },

    updateClienteConfig: async (resellerId: number, clienteId: number, data: any) => {
        try {
            useAlertStore.setState({ loading: true });
            const resp: any = await patch(`resellers/${resellerId}/clientes/${clienteId}/config`, data);

            if (resp.code === 1) {
                useAlertStore.setState({ loading: false });
                useAlertStore.getState().alert('Configuración del cliente actualizada correctamente', 'success');
                return { success: true };
            }

            useAlertStore.setState({ loading: false });
            useAlertStore.getState().alert(resp.error || 'Error al actualizar configuración del cliente', 'error');
            return { success: false, error: resp.error };
        } catch (error: any) {
            useAlertStore.setState({ loading: false });
            useAlertStore.getState().alert(error.message || 'Error al actualizar configuración del cliente', 'error');
            return { success: false, error: error.message };
        }
    },

    updatePreciosPlan: async (resellerId: number, precios: Record<string, number>) => {
        try {
            const resp: any = await patch(`resellers/${resellerId}/precios-plan`, precios);
            if (resp.code === 1) {
                set((s: any) => ({ stats: { ...s.stats, preciosPlan: resp.data?.preciosPlan ?? precios } }));
                useAlertStore.getState().alert('Precios de venta guardados', 'success');
                return { success: true };
            }
            useAlertStore.getState().alert(resp.error || 'No se pudieron guardar los precios', 'error');
            return { success: false };
        } catch (error: any) {
            useAlertStore.getState().alert(error.message || 'Error al guardar precios', 'error');
            return { success: false };
        }
    },

    aprovisionarQpse: async (resellerId: number, clienteId: number, forzar?: boolean) => {
        try {
            useAlertStore.setState({ loading: true });
            const resp: any = await post(`resellers/${resellerId}/clientes/${clienteId}/aprovisionar-qpse`, { forzar: Boolean(forzar) });
            useAlertStore.setState({ loading: false });
            const data = resp?.data ?? resp;
            if (resp.code === 1 && data?.ok) {
                useAlertStore.getState().alert(data?.message || 'Credenciales QPSE generadas', 'success');
                return { success: true, message: data?.message };
            }
            useAlertStore.getState().alert(data?.message || resp.error || 'No se pudo aprovisionar QPSE', 'error');
            return { success: false, message: data?.message || resp.error };
        } catch (error: any) {
            useAlertStore.setState({ loading: false });
            useAlertStore.getState().alert(error.message || 'Error al aprovisionar QPSE', 'error');
            return { success: false, message: error.message };
        }
    },

    pasarProduccionCliente: async (resellerId: number, clienteId: number, planType: '01' | '02') => {
        try {
            useAlertStore.setState({ loading: true });
            const resp: any = await post(`resellers/${resellerId}/clientes/${clienteId}/pasar-produccion`, { planType });
            useAlertStore.setState({ loading: false });
            const data = resp?.data ?? resp;
            if (resp.code === 1 && data?.ok) {
                useAlertStore.getState().alert(data?.message || 'Empresa pasada a producción', 'success');
                return { success: true, message: data?.message };
            }
            useAlertStore.getState().alert(data?.message || resp.error || 'No se pudo pasar a producción', 'error');
            return { success: false, message: data?.message || resp.error };
        } catch (error: any) {
            useAlertStore.setState({ loading: false });
            useAlertStore.getState().alert(error.message || 'Error al pasar a producción', 'error');
            return { success: false, message: error.message };
        }
    },

    consultarDocumento: async (resellerId: number, tipo: 'DNI' | 'RUC', numero: string) => {
        const params = new URLSearchParams({ tipo, numero });
        const resp: any = await httpGet(`resellers/${resellerId}/consultar-documento?${params.toString()}`);
        if (resp.code === 1) return resp.data;
        throw new Error(resp.error || 'No se pudo consultar el documento');
    },

    getClienteSeries: async (resellerId: number, clienteId: number) => {
        try {
            const resp: any = await httpGet(`resellers/${resellerId}/clientes/${clienteId}/series`);
            return resp.code === 1 ? (resp.data || []) : [];
        } catch {
            return [];
        }
    },

    updateClienteSeries: async (resellerId: number, clienteId: number, series: any[]) => {
        try {
            useAlertStore.setState({ loading: true });
            const resp: any = await patch(`resellers/${resellerId}/clientes/${clienteId}/series`, { series });
            useAlertStore.setState({ loading: false });
            if (resp.code === 1) {
                useAlertStore.getState().alert('Series actualizadas correctamente', 'success');
                return { success: true };
            }
            useAlertStore.getState().alert(resp.error || 'Error al guardar series', 'error');
            return { success: false, error: resp.error };
        } catch (error: any) {
            useAlertStore.setState({ loading: false });
            useAlertStore.getState().alert(error.message || 'Error al guardar series', 'error');
            return { success: false, error: error.message };
        }
    },
}));
