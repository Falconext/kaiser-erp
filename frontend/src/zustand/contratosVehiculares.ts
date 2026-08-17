import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { del, get, patch, post } from '../utils/fetch';
import useAlertStore from './alert';
import type { IContratoVehicular } from '../interfaces/vehiculo';

export interface IContratosParams {
    estado?: string; // 'TODOS' | EstadoContrato
    search?: string;
    page?: number;
    limit?: number;
}

export interface IContratosState {
    contratos: IContratoVehicular[];
    alertas: IContratoVehicular[];
    totalContratos: number;
    loadingContratos: boolean;
    getContratos: (params?: IContratosParams) => Promise<void>;
    addContrato: (payload: any) => Promise<IContratoVehicular | null>;
    updateContrato: (id: number, payload: any) => Promise<IContratoVehicular | null>;
    renovarContrato: (id: number, meses?: number) => Promise<IContratoVehicular | null>;
    cancelarContrato: (id: number) => Promise<boolean>;
    deleteContrato: (id: number) => Promise<boolean>;
}

const errMsg = (error: any, fallback: string) =>
    error?.response?.data?.message || error?.message || fallback;

// ¿El contrato debe figurar en el panel de alertas (por vencer en ≤30 días)?
const esAlerta = (c: IContratoVehicular): boolean => {
    if (c.estado !== 'VIGENTE' && c.estado !== 'POR_VENCER') return false;
    const dias = Math.ceil((new Date(c.fechaFin).getTime() - Date.now()) / 86400000);
    return dias <= 30;
};

// Reordena las alertas por vencimiento más próximo primero.
const ordenarAlertas = (alertas: IContratoVehicular[]) =>
    [...alertas].sort(
        (a, b) => new Date(a.fechaFin).getTime() - new Date(b.fechaFin).getTime(),
    );

// Recalcula el arreglo de alertas tras insertar/actualizar un contrato.
const syncAlertas = (
    alertas: IContratoVehicular[],
    contrato: IContratoVehicular,
): IContratoVehicular[] => {
    const sin = alertas.filter((a) => a.id !== contrato.id);
    return esAlerta(contrato) ? ordenarAlertas([contrato, ...sin]) : sin;
};

const buildQuery = (params: IContratosParams = {}) => {
    const base: Record<string, string> = { page: '1', limit: '100' };
    if (params.page) base.page = String(params.page);
    if (params.limit) base.limit = String(params.limit);
    if (params.estado && params.estado !== 'TODOS') base.estado = params.estado;
    if (params.search) base.search = params.search;
    return new URLSearchParams(base).toString();
};

export const useContratosVehicularesStore = create<IContratosState>()(
    devtools((set) => ({
        contratos: [],
        alertas: [],
        totalContratos: 0,
        loadingContratos: false,

        getContratos: async (params?: IContratosParams) => {
            set({ loadingContratos: true }, false, 'GET_CONTRATOS_START');
            try {
                const [resp, alertasResp]: any[] = await Promise.all([
                    get(`contratos-vehiculares?${buildQuery(params)}`),
                    get('contratos-vehiculares/alertas'),
                ]);
                const body = resp?.data ?? {};
                set(
                    {
                        contratos: body.data ?? [],
                        totalContratos: body.paginacion?.total ?? body.data?.length ?? 0,
                        alertas: ordenarAlertas(alertasResp?.data ?? []),
                        loadingContratos: false,
                    },
                    false,
                    'GET_CONTRATOS',
                );
            } catch (error: any) {
                set({ loadingContratos: false }, false, 'GET_CONTRATOS_ERROR');
                useAlertStore.getState().alert('Error al cargar contratos', 'error');
            }
        },

        addContrato: async (payload: any): Promise<IContratoVehicular | null> => {
            try {
                const resp: any = await post('contratos-vehiculares', payload);
                if (resp?.code === 1 || resp?.success === true) {
                    const creado: IContratoVehicular = resp.data;
                    set(
                        (state) => ({
                            contratos: [creado, ...state.contratos],
                            totalContratos: (state.totalContratos || 0) + 1,
                            alertas: syncAlertas(state.alertas, creado),
                        }),
                        false,
                        'ADD_CONTRATO',
                    );
                    useAlertStore.getState().alert('Contrato creado exitosamente', 'success');
                    return creado;
                }
                const msg = Array.isArray(resp?.message) ? resp.message.join('. ') : resp?.message;
                useAlertStore.getState().alert(msg || 'No se pudo crear el contrato', 'error');
                return null;
            } catch (error: any) {
                useAlertStore.getState().alert(errMsg(error, 'Error al guardar el contrato'), 'error');
                return null;
            }
        },

        updateContrato: async (id: number, payload: any): Promise<IContratoVehicular | null> => {
            try {
                const resp: any = await patch(`contratos-vehiculares/${id}`, payload);
                if (resp?.code === 1 || resp?.success === true) {
                    const actualizado: IContratoVehicular = resp.data;
                    set(
                        (state) => ({
                            contratos: state.contratos.map((c) =>
                                c.id === id ? { ...c, ...actualizado } : c,
                            ),
                            alertas: syncAlertas(state.alertas, actualizado),
                        }),
                        false,
                        'UPDATE_CONTRATO',
                    );
                    useAlertStore.getState().alert('Contrato actualizado', 'success');
                    return actualizado;
                }
                useAlertStore.getState().alert(resp?.message || 'Error al actualizar el contrato', 'error');
                return null;
            } catch (error: any) {
                useAlertStore.getState().alert(errMsg(error, 'Error al actualizar el contrato'), 'error');
                return null;
            }
        },

        renovarContrato: async (id: number, meses = 12): Promise<IContratoVehicular | null> => {
            try {
                const resp: any = await patch(`contratos-vehiculares/${id}/renovar`, { meses });
                if (resp?.code === 1 || resp?.success === true) {
                    const renovado: IContratoVehicular = resp.data;
                    set(
                        (state) => ({
                            contratos: state.contratos.map((c) =>
                                c.id === id ? { ...c, ...renovado } : c,
                            ),
                            alertas: syncAlertas(state.alertas, renovado),
                        }),
                        false,
                        'RENOVAR_CONTRATO',
                    );
                    useAlertStore
                        .getState()
                        .alert(`Contrato de ${renovado.vehiculo?.placa ?? ''} renovado por 12 meses`, 'success');
                    return renovado;
                }
                useAlertStore.getState().alert(resp?.message || 'Error al renovar', 'error');
                return null;
            } catch (error: any) {
                useAlertStore.getState().alert(errMsg(error, 'Error al renovar'), 'error');
                return null;
            }
        },

        cancelarContrato: async (id: number): Promise<boolean> => {
            try {
                const resp: any = await patch(`contratos-vehiculares/${id}/cancelar`, {});
                if (resp?.code === 1 || resp?.success === true) {
                    const cancelado: IContratoVehicular = resp.data;
                    set(
                        (state) => ({
                            contratos: state.contratos.map((c) =>
                                c.id === id ? { ...c, ...cancelado } : c,
                            ),
                            // Un contrato cancelado nunca es alerta.
                            alertas: state.alertas.filter((a) => a.id !== id),
                        }),
                        false,
                        'CANCELAR_CONTRATO',
                    );
                    useAlertStore.getState().alert('Contrato cancelado', 'success');
                    return true;
                }
                useAlertStore.getState().alert(resp?.message || 'Error al cancelar', 'error');
                return false;
            } catch (error: any) {
                useAlertStore.getState().alert(errMsg(error, 'Error al cancelar'), 'error');
                return false;
            }
        },

        deleteContrato: async (id: number): Promise<boolean> => {
            try {
                const resp: any = await del(`contratos-vehiculares/${id}`);
                if (resp?.code === 1 || resp?.success === true) {
                    set(
                        (state) => ({
                            contratos: state.contratos.filter((c) => c.id !== id),
                            totalContratos: Math.max(0, (state.totalContratos || 0) - 1),
                            alertas: state.alertas.filter((a) => a.id !== id),
                        }),
                        false,
                        'DELETE_CONTRATO',
                    );
                    useAlertStore.getState().alert('Contrato eliminado', 'success');
                    return true;
                }
                useAlertStore.getState().alert(resp?.message || 'No se pudo eliminar el contrato', 'error');
                return false;
            } catch (error: any) {
                useAlertStore.getState().alert(errMsg(error, 'Error al eliminar'), 'error');
                return false;
            }
        },
    })),
);
