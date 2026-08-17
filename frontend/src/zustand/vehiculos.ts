import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { del, get, patch, post } from '../utils/fetch';
import useAlertStore from './alert';
import type { IVehiculo } from '../interfaces/vehiculo';

export interface IVehiculosParams {
    search?: string;
    page?: number;
    limit?: number;
}

export interface IVehiculosState {
    vehiculos: IVehiculo[];
    totalVehiculos: number;
    loadingVehiculos: boolean;
    getVehiculos: (params?: IVehiculosParams) => Promise<void>;
    addVehiculo: (payload: any) => Promise<IVehiculo | null>;
    updateVehiculo: (id: number, payload: any) => Promise<IVehiculo | null>;
    deleteVehiculo: (id: number) => Promise<boolean>;
}

const buildQuery = (params: IVehiculosParams = {}) => {
    const base: Record<string, string> = { page: '1', limit: '100' };
    if (params.page) base.page = String(params.page);
    if (params.limit) base.limit = String(params.limit);
    if (params.search) base.search = params.search;
    return new URLSearchParams(base).toString();
};

const errMsg = (error: any, fallback: string) =>
    error?.response?.data?.message || error?.message || fallback;

export const useVehiculosStore = create<IVehiculosState>()(
    devtools((set) => ({
        vehiculos: [],
        totalVehiculos: 0,
        loadingVehiculos: false,

        getVehiculos: async (params?: IVehiculosParams) => {
            set({ loadingVehiculos: true }, false, 'GET_VEHICULOS_START');
            try {
                const resp: any = await get(`vehiculos?${buildQuery(params)}`);
                const body = resp?.data ?? {};
                set(
                    {
                        vehiculos: body.data ?? [],
                        totalVehiculos: body.paginacion?.total ?? body.data?.length ?? 0,
                        loadingVehiculos: false,
                    },
                    false,
                    'GET_VEHICULOS',
                );
            } catch (error: any) {
                set({ loadingVehiculos: false }, false, 'GET_VEHICULOS_ERROR');
                useAlertStore.getState().alert('Error al cargar vehículos', 'error');
            }
        },

        // Devuelve el vehículo creado (para flujos posteriores, p. ej. el acta inicial).
        addVehiculo: async (payload: any): Promise<IVehiculo | null> => {
            try {
                const resp: any = await post('vehiculos', payload);
                if (resp?.code === 1 || resp?.success === true) {
                    const creado: IVehiculo = resp.data;
                    set(
                        (state) => ({
                            vehiculos: [creado, ...state.vehiculos],
                            totalVehiculos: (state.totalVehiculos || 0) + 1,
                        }),
                        false,
                        'ADD_VEHICULO',
                    );
                    useAlertStore.getState().alert('Vehículo registrado', 'success');
                    return creado;
                }
                const msg = Array.isArray(resp?.message) ? resp.message.join('. ') : resp?.message;
                useAlertStore.getState().alert(msg || 'No se pudo registrar el vehículo', 'error');
                return null;
            } catch (error: any) {
                useAlertStore.getState().alert(errMsg(error, 'Error al registrar el vehículo'), 'error');
                return null;
            }
        },

        updateVehiculo: async (id: number, payload: any): Promise<IVehiculo | null> => {
            try {
                const resp: any = await patch(`vehiculos/${id}`, payload);
                if (resp?.code === 1 || resp?.success === true) {
                    const actualizado: IVehiculo = resp.data;
                    // Merge para preservar relaciones ya cargadas en la lista
                    // (contratos, contratoItems, actas) que el update no devuelve.
                    set(
                        (state) => ({
                            vehiculos: state.vehiculos.map((v) =>
                                v.id === id ? { ...v, ...actualizado } : v,
                            ),
                        }),
                        false,
                        'UPDATE_VEHICULO',
                    );
                    useAlertStore.getState().alert('Vehículo actualizado', 'success');
                    return actualizado;
                }
                useAlertStore.getState().alert(resp?.message || 'Error al actualizar el vehículo', 'error');
                return null;
            } catch (error: any) {
                useAlertStore.getState().alert(errMsg(error, 'Error al actualizar el vehículo'), 'error');
                return null;
            }
        },

        deleteVehiculo: async (id: number): Promise<boolean> => {
            try {
                const resp: any = await del(`vehiculos/${id}`);
                if (resp?.code === 1 || resp?.success === true) {
                    set(
                        (state) => ({
                            vehiculos: state.vehiculos.filter((v) => v.id !== id),
                            totalVehiculos: Math.max(0, (state.totalVehiculos || 0) - 1),
                        }),
                        false,
                        'DELETE_VEHICULO',
                    );
                    useAlertStore.getState().alert('Vehículo eliminado', 'success');
                    return true;
                }
                useAlertStore.getState().alert(resp?.message || 'No se pudo eliminar el vehículo', 'error');
                return false;
            } catch (error: any) {
                useAlertStore.getState().alert(errMsg(error, 'Error al eliminar el vehículo'), 'error');
                return false;
            }
        },
    })),
);
