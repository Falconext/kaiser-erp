import { create } from 'zustand';
import { get, post, put, del } from '../utils/fetch';
import useAlertStore from './alert';
import { devtools } from 'zustand/middleware';

export interface ICompra {
    id: number;
    serie: string;
    numero: string;
    fechaEmision: string;
    fechaVencimiento?: string;
    proveedor: {
        nombre: string;
        nroDoc: string;
    };
    moneda: string;
    total: number;
    estado: string;
    estadoPago: string;
    detalles?: any[];
    cuotas?: any | string;
    saldo?: number;
}

export interface IComprasState {
    compras: ICompra[];
    totalCompras: number;
    compraDetalle: ICompra | null;
    listarCompras: (params: any) => Promise<void>;
    crearCompra: (data: any) => Promise<boolean>;
    editarCompra: (id: number, data: any) => Promise<boolean>;
    anularCompra: (id: number) => Promise<boolean>;
    obtenerCompra: (id: number) => Promise<void>;
    registrarPagoCompra: (compraId: number, data: any) => Promise<any>;
    getHistorialPagos: (compraId: number) => Promise<any>;
    loading?: boolean;
}

export const useComprasStore = create<IComprasState>()(devtools((set) => ({
    compras: [],
    totalCompras: 0,
    compraDetalle: null,

    listarCompras: async (params: any) => {
        try {
            // useAlertStore.setState({ loading: true });
            const filteredParams = Object.entries(params)
                .filter(([_, value]) => value !== undefined)
                .reduce((obj, [key, value]) => ({ ...obj, [key]: value }), {});

            const query = new URLSearchParams(filteredParams).toString();
            const resp: any = await get(`compras?${query}`);

            if (resp.data && Array.isArray(resp.data.data)) {
                set({
                    compras: resp.data.data,
                    totalCompras: resp.data.total
                });
            } else if (Array.isArray(resp.data)) {
                set({
                    compras: resp.data,
                    totalCompras: resp.data.length
                });
            } else {
                set({ compras: [], totalCompras: 0 });
            }
            // useAlertStore.setState({ loading: false });
        } catch (error) {
            console.error(error);
            useAlertStore.setState({ loading: false });
        }
    },

    crearCompra: async (data: any) => {
        useAlertStore.setState({ loading: true });
        try {
            const resp: any = await post(`compras`, data);
            const created = resp?.data || null;
            if (resp.code === 1 || (created && created.id)) {
                const proveedorNombre =
                    created?.proveedor?.nombre ||
                    data?.proveedorNombre ||
                    'Proveedor';
                const proveedorDoc =
                    created?.proveedor?.nroDoc ||
                    data?.proveedorRuc ||
                    '';

                const nuevaCompra: ICompra = {
                    id: Number(created?.id || Date.now()),
                    serie: String(created?.serie || data?.serie || ''),
                    numero: String(created?.numero || data?.numero || ''),
                    fechaEmision: String(created?.fechaEmision || data?.fechaEmision || new Date().toISOString()),
                    fechaVencimiento: created?.fechaVencimiento || data?.fechaVencimiento,
                    proveedor: {
                        nombre: proveedorNombre,
                        nroDoc: proveedorDoc,
                    },
                    moneda: String(created?.moneda || data?.moneda || 'PEN'),
                    total: Number(created?.total ?? data?.total ?? 0),
                    estado: String(created?.estado || 'REGISTRADO'),
                    estadoPago: String(created?.estadoPago || 'PENDIENTE_PAGO'),
                    saldo: Number(created?.saldo ?? (data?.total ?? 0)),
                };

                set((state) => ({
                    compras: [nuevaCompra, ...(state.compras || [])],
                    totalCompras: Number(state.totalCompras || 0) + 1,
                }));

                useAlertStore.setState({ success: true, loading: false });
                useAlertStore.getState().alert("Compra registrada correctamente", "success");
                return true;
            } else {
                useAlertStore.setState({ loading: false });
                useAlertStore.getState().alert((resp as any).error || "Error al registrar compra", "error");
                return false;
            }
        } catch (error: any) {
            useAlertStore.setState({ loading: false });
            useAlertStore.getState().alert(error.message || "Error al registrar compra", "error");
            return false;
        }
    },

    editarCompra: async (id: number, data: any) => {
        useAlertStore.setState({ loading: true });
        try {
            const resp: any = await put(`compras/${id}`, data);
            const updated = resp?.data || null;
            if (resp.code === 1 || (updated && updated.id)) {
                useAlertStore.setState({ loading: false });
                const warnings = updated?.stockWarnings as string[] | undefined;
                if (warnings && warnings.length) {
                    useAlertStore.getState().alert(warnings.join(' '), "warning");
                } else {
                    useAlertStore.getState().alert("Compra actualizada correctamente", "success");
                }
                return true;
            }
            useAlertStore.setState({ loading: false });
            useAlertStore.getState().alert((resp as any).error || (resp as any).msg || "Error al actualizar compra", "error");
            return false;
        } catch (error: any) {
            useAlertStore.setState({ loading: false });
            useAlertStore.getState().alert(error?.message || "Error al actualizar compra", "error");
            return false;
        }
    },

    anularCompra: async (id: number) => {
        useAlertStore.setState({ loading: true });
        try {
            const resp: any = await del(`compras/${id}`);
            const result = resp?.data || resp;
            if (resp.code === 1 || result?.success) {
                useAlertStore.setState({ loading: false });
                const warnings = result?.stockWarnings as string[] | undefined;
                if (warnings && warnings.length) {
                    useAlertStore.getState().alert(warnings.join(' '), "warning");
                } else {
                    useAlertStore.getState().alert(result?.message || "Compra anulada correctamente", "success");
                }
                set((state) => ({
                    compras: (state.compras || []).filter((c) => c.id !== id),
                    totalCompras: Math.max(0, Number(state.totalCompras || 0) - 1),
                }));
                return true;
            }
            useAlertStore.setState({ loading: false });
            useAlertStore.getState().alert((resp as any).error || (resp as any).msg || "Error al anular compra", "error");
            return false;
        } catch (error: any) {
            useAlertStore.setState({ loading: false });
            useAlertStore.getState().alert(error?.message || "Error al anular compra", "error");
            return false;
        }
    },

    obtenerCompra: async (id: number) => {
        useAlertStore.setState({ loading: true });
        try {
            const resp: any = await get(`compras/${id}`);
            if (resp.data && resp.data.id) {
                set({ compraDetalle: resp.data });
            }
            useAlertStore.setState({ loading: false });
        } catch (error) {
            useAlertStore.setState({ loading: false });
            console.error(error);
        }
    },

    registrarPagoCompra: async (compraId: number, data: any) => {
        useAlertStore.setState({ loading: true });
        try {
            const resp: any = await post(`compras/${compraId}/pagos`, data);
            // resp.data contains the actual backend response { success, pago, nuevoSaldo, nuevoEstado }
            const result = resp.data || resp;
            useAlertStore.setState({ loading: false });
            if (result.success) {
                useAlertStore.getState().alert("Pago registrado correctamente", "success");
                return { success: true, pago: result.pago, nuevoSaldo: result.nuevoSaldo, nuevoEstado: result.nuevoEstado };
            } else {
                useAlertStore.getState().alert(resp.msg || "Error al registrar pago", "error");
                return { success: false };
            }
        } catch (error: any) {
            useAlertStore.setState({ loading: false });
            useAlertStore.getState().alert(error.message || "Error al registrar pago", "error");
            return { success: false };
        }
    },

    getHistorialPagos: async (compraId: number) => {
        // useAlertStore.setState({ loading: true }); // Optional, modal handles its own loading usually
        try {
            const resp: any = await get(`compras/${compraId}/pagos`);
            // useAlertStore.setState({ loading: false });
            // resp.data contains { success, data (pagos array), totalPagado }
            const result = resp.data || resp;
            if (result.success || Array.isArray(result.data)) {
                return { success: true, pagos: Array.isArray(result.data) ? result.data : [], totalPagado: result.totalPagado || 0 };
            }
            return { success: false, pagos: [] };
        } catch (error) {
            console.error(error);
            // useAlertStore.setState({ loading: false });
            return { success: false, pagos: [] };
        }
    }
})));
