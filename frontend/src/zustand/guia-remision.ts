import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { get as fetchGet, patch, post, del } from '../utils/fetch';
import apiClient from '../utils/apiClient';
import useAlertStore from './alert';

export interface IDetalleGuiaRemision {
    id?: number;
    productoId?: number;
    codigoProducto: string;
    descripcion: string;
    cantidad: number;
    unidadMedida: string;
}

export type TipoGuiaRemision = 'REMITENTE' | 'TRANSPORTISTA';

export interface IGuiaRemision {
    id?: number;
    tipoGuia?: TipoGuiaRemision;
    serie: string;
    correlativo: number;
    fechaEmision: string;
    horaEmision?: string;
    tipoDocumento: string;

    // Remitente
    remitenteRuc: string;
    remitenteRazonSocial: string;
    remitenteDireccion: string;

    // Destinatario
    destinatarioTipoDoc: string;
    destinatarioNumDoc: string;
    destinatarioRazonSocial: string;
    clienteId?: number;

    // Comprador (Para motivo 03: Venta con entrega a terceros)
    compradorTipoDoc?: string;
    compradorNumDoc?: string;
    compradorRazonSocial?: string;

    // Shipment
    tipoTraslado: string;
    modoTransporte: string;
    pesoTotal: number;
    unidadPeso: string;

    // Transportista (opcional)
    transportistaRuc?: string;
    transportistaRazonSocial?: string;
    transportistaMTC?: string;

    // Solo para GRE-T: RUC/Razón Social del remitente real de los bienes
    // (la empresa que envía la carga, puede ser diferente al transportista)
    greTRemitenteNumDoc?: string;
    greTRemitenteRazonSocial?: string;

    // Conductor/Vehículo (opcional)
    conductorTipoDoc?: string;
    conductorNumDoc?: string;
    conductorNombre?: string;
    conductorApellidos?: string;
    conductorLicencia?: string;
    vehiculoPlaca?: string;
    vehiculoAutorizacion?: string;

    // Ubicaciones
    partidaUbigeo: string;
    partidaDireccion: string;
    partidaCodigoEstablecimiento?: string;
    llegadaUbigeo: string;
    llegadaDireccion: string;
    llegadaCodigoEstablecimiento?: string;

    // Fecha de traslado
    fechaInicioTraslado: string;

    // Flags
    retornoVehiculoVacio: boolean;
    retornoEnvasesVacios: boolean;
    transbordoProgramado: boolean;
    trasladoTotal: boolean;
    vehiculoM1oL: boolean;
    datosTransportista: boolean;

    // SUNAT
    estadoSunat?: string;
    sunatXml?: string;
    sunatCdrResponse?: string;
    sunatErrorMsg?: string;

    observaciones?: string;
    detalles: IDetalleGuiaRemision[];
}

export interface IGuiaRemisionState {
    guiasRemision: any[];
    totalGuias: number;
    guiaRemisionActual: IGuiaRemision | null;
    detallesGuia: IDetalleGuiaRemision[];
    siguienteCorrelativo: number | null;

    // Funciones
    getAllGuiasRemision: (params: any) => Promise<{ success: boolean; error?: string }>;
    getGuiaRemision: (id: number) => Promise<{ success: boolean; error?: string }>;
    createGuiaRemision: (data: IGuiaRemision) => Promise<{ success: boolean; error?: string; data?: any }>;
    updateGuiaRemision: (id: number, data: Partial<IGuiaRemision>) => Promise<{ success: boolean; error?: string }>;
    deleteGuiaRemision: (id: number) => Promise<{ success: boolean; error?: string }>;
    enviarSunat: (id: number) => Promise<{ success: boolean; error?: string }>;
    getSiguienteCorrelativo: (serie: string) => Promise<{ success: boolean; error?: string }>;
    prefillDesdeComprobante: (comprobanteId: number) => Promise<{ success: boolean; data?: any; error?: string }>;
    importarItemsExcel: (archivoBase64: string) => Promise<{ success: boolean; items?: IDetalleGuiaRemision[]; errores?: { fila: number; motivo: string }[]; error?: string }>;
    descargarPlantillaItems: () => Promise<{ success: boolean; error?: string }>;
    downloadPdf: (id: number) => Promise<{ success: boolean; error?: string }>;
    enviarWhatsApp: (id: number, numero: string) => Promise<{ success: boolean; error?: string }>;

    // Manejo de detalles
    addDetalle: (detalle: IDetalleGuiaRemision) => void;
    updateDetalle: (index: number, detalle: Partial<IDetalleGuiaRemision>) => void;
    deleteDetalle: (index: number) => void;
    resetDetalles: () => void;
    resetGuiaRemision: () => void;
}

export const useGuiaRemisionStore = create<IGuiaRemisionState>()(devtools((set, get) => ({
    guiasRemision: [],
    totalGuias: 0,
    guiaRemisionActual: null,
    detallesGuia: [],
    siguienteCorrelativo: null,

    getAllGuiasRemision: async (params: any) => {
        try {
            const filteredParams = Object.entries(params)
                .filter(([_, value]) => value !== undefined && value !== '')
                .reduce((obj, [key, value]) => ({ ...obj, [key]: value }), {});

            const query = new URLSearchParams(filteredParams).toString();
            const resp: any = await fetchGet(`guia-remision${query ? '?' + query : ''}`);

            if (resp && resp.data) {
                set({
                    guiasRemision: resp.data.data || [],
                    totalGuias: resp.data.meta?.total || 0
                }, false, 'GET_GUIAS_REMISION');

                useAlertStore.setState({ loading: false });
                return { success: true };
            } else {
                set({ guiasRemision: [], totalGuias: 0 });
                useAlertStore.setState({ loading: false });
                useAlertStore.getState().alert(resp?.error || 'Error al obtener las guías de remisión', 'error');
                return { success: false, error: resp?.error || 'Error al obtener las guías de remisión' };
            }
        } catch (error: any) {
            useAlertStore.setState({ loading: false });
            useAlertStore.getState().alert(error.message || 'Error al obtener las guías de remisión', 'error');
            return { success: false, error: error.message || 'Error al obtener las guías de remisión' };
        }
    },

    getGuiaRemision: async (id: number) => {
        try {
            useAlertStore.setState({ loading: true });
            const resp: any = await fetchGet(`guia-remision/${id}`);

            if (resp) {
                set({
                    guiaRemisionActual: resp,
                    detallesGuia: resp.detalles || []
                }, false, 'GET_GUIA_REMISION');

                useAlertStore.setState({ loading: false });
                return { success: true };
            } else {
                useAlertStore.setState({ loading: false });
                useAlertStore.getState().alert('Error al obtener la guía de remisión', 'error');
                return { success: false, error: 'Error al obtener la guía de remisión' };
            }
        } catch (error: any) {
            useAlertStore.setState({ loading: false });
            useAlertStore.getState().alert(error.message || 'Error al obtener la guía de remisión', 'error');
            return { success: false, error: error.message || 'Error al obtener la guía de remisión' };
        }
    },

    createGuiaRemision: async (data: IGuiaRemision) => {
        try {
            useAlertStore.setState({ loading: true });
            const resp: any = await post('guia-remision', data);

            if (resp) {
                useAlertStore.setState({ loading: false });
                useAlertStore.getState().alert('Guía de remisión creada exitosamente', 'success');
                set({ guiaRemisionActual: resp, detallesGuia: [] }, false, 'CREATE_GUIA_REMISION');
                return { success: true, data: resp };
            } else {
                useAlertStore.setState({ loading: false });
                useAlertStore.getState().alert('Error al crear la guía de remisión', 'error');
                return { success: false, error: 'Error al crear la guía de remisión' };
            }
        } catch (error: any) {
            useAlertStore.setState({ loading: false });
            useAlertStore.getState().alert(error.message || 'Error al crear la guía de remisión', 'error');
            return { success: false, error: error.message || 'Error al crear la guía de remisión' };
        }
    },

    updateGuiaRemision: async (id: number, data: Partial<IGuiaRemision>) => {
        try {
            useAlertStore.setState({ loading: true });
            const resp: any = await patch(`guia-remision/${id}`, data);

            if (resp) {
                useAlertStore.setState({ loading: false });
                useAlertStore.getState().alert('Guía de remisión actualizada exitosamente', 'success');
                set({ guiaRemisionActual: resp }, false, 'UPDATE_GUIA_REMISION');
                return { success: true };
            } else {
                useAlertStore.setState({ loading: false });
                useAlertStore.getState().alert('Error al actualizar la guía de remisión', 'error');
                return { success: false, error: 'Error al actualizar la guía de remisión' };
            }
        } catch (error: any) {
            useAlertStore.setState({ loading: false });
            useAlertStore.getState().alert(error.message || 'Error al actualizar la guía de remisión', 'error');
            return { success: false, error: error.message || 'Error al actualizar la guía de remisión' };
        }
    },

    deleteGuiaRemision: async (id: number) => {
        try {
            useAlertStore.setState({ loading: true });
            const resp: any = await del(`guia-remision/${id}`);

            if (resp) {
                useAlertStore.setState({ loading: false });
                useAlertStore.getState().alert('Guía de remisión eliminada exitosamente', 'success');
                set((state) => ({
                    guiasRemision: state.guiasRemision.filter((guia: any) => guia.id !== id)
                }), false, 'DELETE_GUIA_REMISION');
                return { success: true };
            } else {
                useAlertStore.setState({ loading: false });
                useAlertStore.getState().alert('Error al eliminar la guía de remisión', 'error');
                return { success: false, error: 'Error al eliminar la guía de remisión' };
            }
        } catch (error: any) {
            useAlertStore.setState({ loading: false });
            useAlertStore.getState().alert(error.message || 'Error al eliminar la guía de remisión', 'error');
            return { success: false, error: error.message || 'Error al eliminar la guía de remisión' };
        }
    },

    enviarSunat: async (id: number) => {
        try {
            useAlertStore.setState({ loading: true });
            const resp: any = await post(`guia-remision/${id}/enviar-sunat`, {});

            // El backend devuelve { code: 1, message, data: { success: true ... } }
            // 'post' retorna el body. Si es éxito, resp.data.success es true.
            const isSuccess = resp?.data?.success || resp?.success;

            if (isSuccess) {
                const guiaData = resp?.data?.guia || resp?.guia;

                useAlertStore.setState({ loading: false });
                useAlertStore.getState().alert(resp?.data?.message || resp?.message || 'Guía enviada a SUNAT exitosamente', 'success');

                // Actualizar el estado de la guía en la lista con TODOS los datos nuevos (URL pdf, estado, etc)
                set((state) => ({
                    guiasRemision: state.guiasRemision.map((guia: any) =>
                        guia.id === id ? { ...guia, ...guiaData } : guia
                    ),
                    guiaRemisionActual: guiaData
                }), false, 'ENVIAR_SUNAT');

                return { success: true };
            } else {
                useAlertStore.setState({ loading: false });
                useAlertStore.getState().alert(resp?.message || 'Error al enviar a SUNAT', 'error');
                return { success: false, error: resp?.message || 'Error al enviar a SUNAT' };
            }
        } catch (error: any) {
            useAlertStore.setState({ loading: false });
            useAlertStore.getState().alert(error.message || 'Error al enviar a SUNAT', 'error');
            return { success: false, error: error.message || 'Error al enviar a SUNAT' };
        }
    },

    getSiguienteCorrelativo: async (serie: string) => {
        try {
            const resp: any = await fetchGet(`guia-remision/next-correlativo/${serie}`);

            if (resp !== undefined && resp !== null) {
                set({ siguienteCorrelativo: resp }, false, 'GET_SIGUIENTE_CORRELATIVO');
                return { success: true };
            } else {
                useAlertStore.getState().alert('Error al obtener el siguiente correlativo', 'error');
                return { success: false, error: 'Error al obtener el siguiente correlativo' };
            }
        } catch (error: any) {
            useAlertStore.getState().alert(error.message || 'Error al obtener el siguiente correlativo', 'error');
            return { success: false, error: error.message || 'Error al obtener el siguiente correlativo' };
        }
    },

    prefillDesdeComprobante: async (comprobanteId: number) => {
        try {
            useAlertStore.setState({ loading: true });
            const resp: any = await fetchGet(`guia-remision/desde-comprobante/${comprobanteId}`);
            useAlertStore.setState({ loading: false });
            if (resp?.success === false) {
                useAlertStore.getState().alert(resp.error || 'No se pudo importar el comprobante', 'error');
                return { success: false, error: resp.error };
            }
            // fetch.ts entrega el body completo; el payload va en `data`.
            const data = resp?.data ?? resp;
            if (data && (data.detalles || data.destinatarioNumDoc)) {
                return { success: true, data };
            }
            useAlertStore.getState().alert('No se pudieron cargar los datos del comprobante', 'error');
            return { success: false, error: 'Comprobante sin datos' };
        } catch (error: any) {
            useAlertStore.setState({ loading: false });
            useAlertStore.getState().alert(error.message || 'Error al importar el comprobante', 'error');
            return { success: false, error: error.message || 'Error al importar el comprobante' };
        }
    },

    importarItemsExcel: async (archivoBase64: string) => {
        try {
            useAlertStore.setState({ loading: true });
            const resp: any = await post('guia-remision/importar-items', { archivo: archivoBase64 });
            useAlertStore.setState({ loading: false });
            if (resp?.success === false) {
                useAlertStore.getState().alert(resp.error || 'Error al importar el Excel', 'error');
                return { success: false, error: resp.error };
            }
            const data = resp?.data ?? resp;
            const items = (data?.items || []) as IDetalleGuiaRemision[];
            const errores = data?.errores || [];
            if (items.length === 0) {
                useAlertStore.getState().alert('El archivo no contiene ítems válidos', 'warning');
                return { success: false, items, errores };
            }
            return { success: true, items, errores };
        } catch (error: any) {
            useAlertStore.setState({ loading: false });
            useAlertStore.getState().alert(error.message || 'Error al importar el Excel', 'error');
            return { success: false, error: error.message || 'Error al importar el Excel' };
        }
    },

    descargarPlantillaItems: async () => {
        try {
            const response = await apiClient.get('guia-remision/plantilla-items', { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', 'plantilla_items_guia.xlsx');
            document.body.appendChild(link);
            link.click();
            link.remove();
            return { success: true };
        } catch (error: any) {
            useAlertStore.getState().alert(error.message || 'Error al descargar la plantilla', 'error');
            return { success: false, error: error.message || 'Error al descargar la plantilla' };
        }
    },

    // Manejo de detalles
    addDetalle: (detalle: IDetalleGuiaRemision) => {
        set((state) => ({
            detallesGuia: [...state.detallesGuia, detalle]
        }), false, 'ADD_DETALLE');
    },

    updateDetalle: (index: number, detalle: Partial<IDetalleGuiaRemision>) => {
        set((state) => ({
            detallesGuia: state.detallesGuia.map((d, i) =>
                i === index ? { ...d, ...detalle } : d
            )
        }), false, 'UPDATE_DETALLE');
    },

    deleteDetalle: (index: number) => {
        set((state) => ({
            detallesGuia: state.detallesGuia.filter((_, i) => i !== index)
        }), false, 'DELETE_DETALLE');
    },

    resetDetalles: () => {
        set({ detallesGuia: [] }, false, 'RESET_DETALLES');
    },

    resetGuiaRemision: () => {
        set({
            guiaRemisionActual: null,
            detallesGuia: [],
            siguienteCorrelativo: null
        }, false, 'RESET_GUIA_REMISION');
    },
    downloadPdf: async (id: number) => {
        try {
            useAlertStore.setState({ loading: true });
            const response = await apiClient.get(`guia-remision/${id}/pdf`, {
                responseType: 'blob'
            });

            if (response.data) {
                const url = window.URL.createObjectURL(new Blob([response.data]));
                const link = document.createElement('a');
                link.href = url;
                link.setAttribute('download', `guia-remision-${id}.pdf`);
                document.body.appendChild(link);
                link.click();
                link.remove();
                useAlertStore.setState({ loading: false });
                return { success: true };
            } else {
                useAlertStore.setState({ loading: false });
                useAlertStore.getState().alert('Error al descargar el PDF', 'error');
                return { success: false, error: 'Error al descargar el PDF' };
            }
        } catch (error: any) {
            useAlertStore.setState({ loading: false });
            useAlertStore.getState().alert(error.message || 'Error al descargar el PDF', 'error');
            return { success: false, error: error.message || 'Error al descargar el PDF' };
        }
    },
    enviarWhatsApp: async (id: number, numero: string) => {
        try {
            useAlertStore.setState({ loading: true });
            const resp: any = await post(`whatsapp/enviar-guia/${id}`, { numeroDestino: numero });

            if (resp && (resp.success || (resp.data && resp.data.success))) {
                useAlertStore.setState({ loading: false });
                useAlertStore.getState().alert('Guía enviada por WhatsApp exitosamente', 'success');
                return { success: true };
            } else {
                useAlertStore.setState({ loading: false });
                useAlertStore.getState().alert(resp?.message || resp?.error || 'Error al enviar WhatsApp', 'error');
                return { success: false, error: resp?.message || resp?.error || 'Error al enviar WhatsApp' };
            }
        } catch (error: any) {
            useAlertStore.setState({ loading: false });
            useAlertStore.getState().alert(error.message || 'Error al enviar WhatsApp', 'error');
            return { success: false, error: error.message || 'Error al enviar WhatsApp' };
        }
    },
})));
