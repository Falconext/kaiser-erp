import { create } from 'zustand';
import { get, post, patch } from '../utils/fetch';
import useAlertStore from './alert';
import { devtools } from 'zustand/middleware';

export interface Reseller {
    id: number;
    nombre: string;
    codigo: string;
    dominioPersonalizado?: string;
    whiteLabelNombre?: string;
    whiteLabelLogoUrl?: string;
    whiteLabelLogoWhiteUrl?: string;
    whiteLabelFaviconUrl?: string;
    whiteLabelColorPrimario?: string;
    whiteLabelColorSecundario?: string;
    whiteLabelWebsite?: string;
    whiteLabelEmail?: string;
    whiteLabelTelefono?: string;
    whiteLabelWhatsapp?: string;
    representante?: string;
    telefono?: string;
    email: string;
    saldo: number;
    activo: boolean;
    creadoEn: string;
    _count?: {
        empresas: number;
    };
}

export interface ResellerProfitability {
    resellerId: number;
    clientesActivos: number;
    mrrBruto: number;
    mrrNeto: number;
    margenMensual: number;
    margenPct: number;
    churn30dPct: number;
    clientesPerdidos30d: number;
    renovacionesAplicadas30d: number;
    cobradoRenovaciones30d: number;
}

export interface IResellerState {
    resellers: Reseller[];
    reseller: Reseller | null;
    rentabilidad: ResellerProfitability[];
    getAllResellers: () => Promise<{ success: boolean; error?: string }>;
    getRentabilidad: (days?: number) => Promise<{ success: boolean; error?: string }>;
    createReseller: (data: any) => Promise<{ success: boolean; error?: string }>;
    getResellerById: (id: number) => Promise<{ success: boolean; error?: string }>;
    recargarSaldo: (id: number, monto: number, referencia?: string) => Promise<{ success: boolean; error?: string }>;
    ajustarSaldo: (id: number, nuevoSaldo: number, motivo: string) => Promise<{ success: boolean; error?: string }>;
    updateReseller: (id: number, data: any) => Promise<{ success: boolean; error?: string }>;
    toggleEstadoReseller: (id: number, activo: boolean) => Promise<{ success: boolean; error?: string }>;
    resetReseller: () => void;
}

export const useResellerStore = create<IResellerState>()(devtools((set) => ({
    resellers: [],
    reseller: null,
    rentabilidad: [],

    getAllResellers: async () => {
        try {
            useAlertStore.setState({ loading: true });
            const resp: any = await get('resellers');

            if (resp.code === 1) {
                // Handle wrapped data { code: 1, message: 'OK', data: [...] }
                // or ensure response interceptor matches expected format
                const data = Array.isArray(resp.data) ? resp.data : [];
                set({ resellers: data }, false, 'GET_RESELLERS');
                useAlertStore.setState({ loading: false });
                return { success: true };
            } else {
                useAlertStore.setState({ loading: false });
                useAlertStore.getState().alert(resp.error || 'Error al obtener distribuidores', 'error');
                return { success: false, error: resp.error };
            }
        } catch (error: any) {
            useAlertStore.setState({ loading: false });
            useAlertStore.getState().alert(error.message || 'Error al obtener distribuidores', 'error');
            return { success: false, error: error.message };
        }
    },

    getRentabilidad: async (days = 30) => {
        try {
            const resp: any = await get(`resellers/rentabilidad?days=${days}`);

            if (resp.code === 1) {
                set({ rentabilidad: Array.isArray(resp.data) ? resp.data : [] }, false, 'GET_RENTABILIDAD_RESELLERS');
                return { success: true };
            }

            useAlertStore.getState().alert(resp.error || 'Error al obtener rentabilidad de distribuidores', 'error');
            return { success: false, error: resp.error };
        } catch (error: any) {
            useAlertStore.getState().alert(error.message || 'Error al obtener rentabilidad de distribuidores', 'error');
            return { success: false, error: error.message };
        }
    },

    createReseller: async (data: any) => {
        try {
            useAlertStore.setState({ loading: true });
            const resp: any = await post('resellers', data);

            if (resp.code === 1) {
                useAlertStore.setState({ loading: false });
                useAlertStore.getState().alert('Distribuidor creado exitosamente', 'success');
                // Refresh list
                // We manually append or reload. Reloading ensures sync.
                const currentResellers = await get('resellers');
                if (currentResellers.code === 1) {
                    set({ resellers: Array.isArray(currentResellers.data) ? currentResellers.data : [] }, false, 'REFRESH_RESELLERS');
                }
                return { success: true };
            } else {
                useAlertStore.setState({ loading: false });
                useAlertStore.getState().alert(resp.error || 'Error al crear distribuidor', 'error');
                return { success: false, error: resp.error };
            }
        } catch (error: any) {
            useAlertStore.setState({ loading: false });
            useAlertStore.getState().alert(error.message || 'Error al crear distribuidor', 'error');
            return { success: false, error: error.message };
        }
    },

    getResellerById: async (id: number) => {
        try {
            useAlertStore.setState({ loading: true });
            const resp: any = await get(`resellers/${id}`);

            if (resp.code === 1) {
                set({ reseller: resp.data }, false, 'GET_RESELLER');
                useAlertStore.setState({ loading: false });
                return { success: true };
            } else {
                useAlertStore.setState({ loading: false });
                useAlertStore.getState().alert(resp.error || 'Error al obtener distribuidor', 'error');
                return { success: false, error: resp.error };
            }
        } catch (error: any) {
            useAlertStore.setState({ loading: false });
            useAlertStore.getState().alert(error.message || 'Error al obtener distribuidor', 'error');
            return { success: false, error: error.message };
        }
    },

    recargarSaldo: async (id: number, monto: number, referencia?: string) => {
        try {
            useAlertStore.setState({ loading: true });
            const resp: any = await post(`resellers/${id}/recargar`, { monto, referencia });

            if (resp.code === 1) {
                useAlertStore.setState({ loading: false });
                useAlertStore.getState().alert('Saldo recargado exitosamente', 'success');

                // Update local state if possible to reflect balance change immediately
                set((state) => ({
                    resellers: state.resellers.map(r => r.id === id ? { ...r, saldo: Number(r.saldo) + Number(monto) } : r),
                    reseller: state.reseller?.id === id ? { ...state.reseller, saldo: Number(state.reseller.saldo) + Number(monto) } : state.reseller
                }), false, 'UPDATE_SALDO');

                return { success: true };
            } else {
                useAlertStore.setState({ loading: false });
                useAlertStore.getState().alert(resp.error || 'Error al recargar saldo', 'error');
                return { success: false, error: resp.error };
            }
        } catch (error: any) {
            useAlertStore.setState({ loading: false });
            useAlertStore.getState().alert(error.message || 'Error al recargar saldo', 'error');
            return { success: false, error: error.message };
        }
    },

    ajustarSaldo: async (id: number, nuevoSaldo: number, motivo: string) => {
        try {
            useAlertStore.setState({ loading: true });
            const resp: any = await patch(`resellers/${id}/saldo`, { nuevoSaldo, motivo });
            if (resp.code === 1) {
                useAlertStore.setState({ loading: false });
                useAlertStore.getState().alert('Saldo ajustado correctamente', 'success');
                set((state) => ({
                    resellers: state.resellers.map(r => r.id === id ? { ...r, saldo: Number(nuevoSaldo) } : r),
                    reseller: state.reseller?.id === id ? { ...state.reseller, saldo: Number(nuevoSaldo) } : state.reseller
                }), false, 'ADJUST_SALDO');
                return { success: true };
            }
            useAlertStore.setState({ loading: false });
            useAlertStore.getState().alert(resp.error || 'Error al ajustar saldo', 'error');
            return { success: false, error: resp.error };
        } catch (error: any) {
            useAlertStore.setState({ loading: false });
            useAlertStore.getState().alert(error.message || 'Error al ajustar saldo', 'error');
            return { success: false, error: error.message };
        }
    },

    updateReseller: async (id: number, data: any) => {
        try {
            useAlertStore.setState({ loading: true });
            const resp: any = await patch(`resellers/${id}`, data);

            if (resp.code === 1) {
                useAlertStore.setState({ loading: false });
                useAlertStore.getState().alert('Distribuidor actualizado exitosamente', 'success');

                // Update local state
                // Fetch simple or manual update
                const updatedReseller = resp.data;
                set((state) => ({
                    resellers: state.resellers.map(r => r.id === id ? { ...r, ...data } : r), // Optimistic or loose refetch
                    reseller: state.reseller?.id === id ? { ...state.reseller, ...data } : state.reseller
                }), false, 'UPDATE_RESELLER');

                // Trigger refresh to be safe
                const currentResellers = await get('resellers');
                if (currentResellers.code === 1) {
                    set({ resellers: Array.isArray(currentResellers.data) ? currentResellers.data : [] }, false, 'REFRESH_RESELLERS');
                }

                return { success: true };
            } else {
                useAlertStore.setState({ loading: false });
                useAlertStore.getState().alert(resp.error || 'Error al actualizar distribuidor', 'error');
                return { success: false, error: resp.error };
            }
        } catch (error: any) {
            useAlertStore.setState({ loading: false });
            useAlertStore.getState().alert(error.message || 'Error al actualizar distribuidor', 'error');
            return { success: false, error: error.message };
        }
    },

    toggleEstadoReseller: async (id: number, activo: boolean) => {
        try {
            useAlertStore.setState({ loading: true });
            const resp: any = await patch(`resellers/${id}/estado`, { activo });

            if (resp.code === 1) {
                useAlertStore.setState({ loading: false });
                useAlertStore.getState().alert(`Distribuidor ${activo ? 'activado' : 'desactivado'} correctamente`, 'success');

                const currentResellers = await get('resellers');
                if (currentResellers.code === 1) {
                    set({ resellers: Array.isArray(currentResellers.data) ? currentResellers.data : [] }, false, 'REFRESH_RESELLERS_STATUS');
                }

                return { success: true };
            }

            useAlertStore.setState({ loading: false });
            useAlertStore.getState().alert(resp.error || 'Error al cambiar estado del distribuidor', 'error');
            return { success: false, error: resp.error };
        } catch (error: any) {
            useAlertStore.setState({ loading: false });
            useAlertStore.getState().alert(error.message || 'Error al cambiar estado del distribuidor', 'error');
            return { success: false, error: error.message };
        }
    },

    resetReseller: () => {
        set({ reseller: null, rentabilidad: [] }, false, 'RESET_RESELLER');
    }

})));
