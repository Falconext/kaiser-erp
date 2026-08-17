import { create } from 'zustand';
import { get } from '../utils/fetch';
import useAlertStore from './alert';
import { devtools } from 'zustand/middleware';
import { IResponse } from '../interfaces/auth';

export interface IExtentionsState {
    currencies: [];
    creditDebitNoteTypes: [];
    documentTypes: []
    rubros: [],
    planes: [],
    getRubros: () => void
    getCurrencies: () => void;
    getCreditDebitNoteTypes: () => void;
    getDocumentTypes: () => void
    getUnitOfMeasure: () => void
    getUbigeos: () => void
    getPlanes: (producto?: string, plataforma?: string) => void
    ubigeos: []
    unitOfMeasure: []
}

export const useExtentionsStore = create<IExtentionsState>()(devtools((set, _get) => ({
    currencies:[],
    rubros: [],
    planes: [],
    creditDebitNoteTypes: [],
    ubigeos: [],
    documentTypes: [],
    unitOfMeasure: [],
    getRubros: async () => {
        try {
            const resp : any = await get(`extensiones/rubros`);
            if (resp.code === 1) {
                set({
                    rubros: resp.data?.map((item: any) => ({
                        id: item.id,
                        value: item.nombre
                    }))
                }, false, "GET_RUBROS");
            } else {
                set({
                    rubros: []
                });
            }
        } catch (error) {
        }
    },
    getUbigeos: async () => {
        try {
            const resp : any = await get(`extensiones/ubigeos`);
            if (resp.code === 1) {
                set({
                    ubigeos: resp.data
                }, false, "GET_UBIGEOS");
            } else {
                set({
                    ubigeos: []
                });
            }
        } catch (error) {
        }
    },
    getUnitOfMeasure: async () => {
        try {
            const resp : any = await get(`extensiones/unidad-medida`);
            if (resp.code === 1) {
                set({
                    unitOfMeasure: resp.data
                }, false, "GET_CURRENCIES");
            } else {
                set({
                    unitOfMeasure: []
                });
            }
        } catch (error) {
        }
    },
    getCurrencies: async () => {
        try {
            const resp : any = await get(`/extensiones/currencies`);
            if (resp.code === 1) {
                set({
                    currencies: resp.data?.currencies
                }, false, "GET_CURRENCIES");
            } else {
                set({
                    currencies: []
                });
            }
        } catch (error) {
        }
    },
    getCreditDebitNoteTypes: async () => {
        try {
            // useAlertStore.setState({loading : true})
            const resp : any = await get(`/extensiones/motivos-nota`);
            console.log(resp)
            if (resp.code === 1) {
                set({
                    creditDebitNoteTypes: resp.data
                }, false, "GET_CREDIT_DEBIT_NOTE_TYPES");
                useAlertStore.setState({loading : false})
            } else {
                set({
                    creditDebitNoteTypes: []
                });
            }
        } catch (error) {
        }
    },
    getDocumentTypes: async () => {
        try {
            // useAlertStore.setState({loading : true})
            const resp : any = await get(`/extensiones/document-types`);
            if (resp.code === 1) {
                set({
                    documentTypes: resp.data?.documentTypes
                }, false, "GET_DOCUMENT_TYPES");
                useAlertStore.setState({loading : false})
            } else {
                set({
                    documentTypes: []
                });
            }
        } catch (error) {
        }
    },
    getPlanes: async (producto?: string, plataforma?: string) => {
        try {
            const params = new URLSearchParams();
            if (producto) params.set('producto', producto);
            if (plataforma) params.set('plataforma', plataforma);
            const query = params.toString();
            const resp: any = await get(`extensiones/planes${query ? `?${query}` : ''}`);
            // Soportar ambos formatos: { code:1, data: [...] } o directamente [...]
            const planesResp = Array.isArray(resp)
              ? resp
              : (resp && resp.code === 1 && Array.isArray(resp.data))
                ? resp.data
                : [];
            set({ planes: planesResp }, false, "GET_PLANES");
        } catch (error) {
            set({ planes: [] }, false, "GET_PLANES_ERROR");
        }
    },
})));
