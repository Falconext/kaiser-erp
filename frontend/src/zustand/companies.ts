import { create } from 'zustand';
import { get, post, put } from '../utils/fetch';
import useAlertStore from './alert';
import { devtools } from 'zustand/middleware';
import axios from 'axios';

export interface ICompaniesState {
    companies: [];
    companySunat: null,
    compania: any,
    getCompany: (ruc: string) => void
    obtenerDetalleCompania: (id: number) => boolean
    agregarEmpresa: (data: any) => void
    editarEmpresa: (data: any) => void
    getAllCompanies: (params: any, callback?: Function,
        allProperties?: boolean) => void
    totalCompanies: 0,
}

export const useCompaniesStore = create<ICompaniesState>()(devtools((set, _get) => ({
    companies: [],
    companySunat: null,
    rubros: [],
    getCompany: async (ruc: string) => {
        const resp: any = await axios.get(`https://dniruc.apisunat.com/ruc/${ruc}`)
        if (resp.source === 1) {
            useAlertStore.setState({ success: true });
            set({
                companySunat: resp.data
            }, false, "OBTENER COMPAÑIA");
            useAlertStore.setState({ loading: false })
        }
    },
    getAllCompanies: async (params: any, callback?: Function,
        _allProperties?: boolean) => {
        try {
            // useAlertStore.setState({ loading: true })
            const filteredParams = Object.entries(params)
                .filter(([_, value]) => value !== undefined)
                .reduce((obj, [key, value]) => ({ ...obj, [key]: value }), {});

            const query = new URLSearchParams(filteredParams).toString();
            const resp: any = await get(`empresa/listar?${query}`);
            console.log(resp)
            if (resp.code === 1) {
                useAlertStore.setState({ success: true });
                set({
                    companies: resp.data.empresas
                }, false, "GET_COMPANIES");
                useAlertStore.setState({ loading: false })
            } else {
                set({
                    companies: []
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
    agregarEmpresa: async (data: any) => {
        useAlertStore.setState({ loading: true });
        try {
            const resp: any = await post(`empresa/crear`, data);
            console.log(resp);
            if (resp.code === 1) {
                useAlertStore.setState({ success: true });
                useAlertStore.getState().alert("Empresa creada correctamente", "success");
                return true;    // <- resolvemos con éxito
            } else {
                useAlertStore.getState().alert(resp.message || "Error al crear empresa", "error");
                return false;   // <- resolvemos con fallo
            }
        } catch (error: any) {
            return useAlertStore.getState().alert(`${error}`, "error")
        }
    },
    editarEmpresa: async (data: any) => {
        useAlertStore.setState({ loading: true });
        console.log(data);
        try {
            const resp: any = await put(`empresa/${data.id}`,data);
            console.log(resp);
            if (resp.code === 1) {
                useAlertStore.setState({ success: true });
                useAlertStore.getState().alert("Empresa editada correctamente", "success");
                return true;    // <- resolvemos con éxito
            } else {
                useAlertStore.getState().alert(resp.message || "Error al crear empresa", "error");
                return false;   // <- resolvemos con fallo
            }
        } catch (error: any) {
            return useAlertStore.getState().alert(`${error}`, "error")
        }
    },
    obtenerDetalleCompania: async (id: number) => {
        const resp: any = await get(`empresa/${id}`)
        console.log(resp)
        if (resp.code === 1) {
            useAlertStore.setState({ success: true });
            set({
                compania: resp.data
            }, false, "OBTENER DETALLE DE COMPANIA");
            return true;
        }
    },
})));


