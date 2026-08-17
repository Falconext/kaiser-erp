import { create } from 'zustand';
import { del, get, patch, post, put } from '../utils/fetch';
import { IResponse } from '../interfaces/auth';
import { IFormClient, IClient } from '../interfaces/clients';
import useAlertStore from './alert';
import { devtools } from 'zustand/middleware';

export interface IClientsState {
    clients: IClient[];
    totalClients: number;
    resetClients: () => void;
    // getDocument: (data: IDocument) => void
    addClients: (data: IFormClient) => Promise<any>

    editClients: (data: IFormClient) => void
    getAllClients: (params: any, callback?: Function,
        allProperties?: boolean) => void
    // updateDocument: (data: any) => void
    toggleStateClient: (data: number) => void
    deleteClient: (id: number) => Promise<void>;
    getClientFromDoc: (nroDoc: string, tipoDoc?: string) => Promise<any>;
    exportClients: (search?: string) => Promise<void>;
    importClients: (file: File) => Promise<void>;
}

// Solo estos campos acepta el DTO del backend; el resto (id, estado,
// tipoDocumentoId, empresaId, tipoDocumento, etc.) son de UI/relación y deben omitirse.
const CLIENTE_PAYLOAD_KEYS = [
    'nombre', 'tipoDoc', 'nroDoc', 'direccion', 'email', 'telefono',
    'ubigeo', 'departamento', 'provincia', 'distrito', 'persona',
    'grupoSanguineo', 'alergias', 'fechaNacimiento', 'medicoTratanteId',
    'contactoNombre', 'contactoEmail', 'contactoTelefono', 'contactoDireccion',
] as const;

const sanitizeClientePayload = (data: any) => {
    const payload: Record<string, any> = {};
    for (const key of CLIENTE_PAYLOAD_KEYS) {
        if (data?.[key] !== undefined && data?.[key] !== null) payload[key] = data[key];
    }
    return payload;
};

export const useClientsStore = create<IClientsState>()(devtools((set, _get) => ({
    clients: [],
    getAllClients: async (params: any, callback?: Function,
        _allProperties?: boolean) => {
        try {
            // useAlertStore.setState({ loading: true })
            const filteredParams = Object.entries(params)
                .filter(([_, value]) => value !== undefined)
                .reduce((obj, [key, value]) => ({ ...obj, [key]: value }), {});

            const query = new URLSearchParams(filteredParams).toString();
            const resp: any = await get(`clientes?${query}`);
            console.log(resp)
            if (resp.code === 1) {
                useAlertStore.setState({ success: true });
                set({
                    clients: resp.data.clientes,
                    totalClients: resp.data.total
                }, false, "GET_CLIENTS");
                useAlertStore.setState({ loading: false })
            } else {
                set({
                    clients: []
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
    addClients: async (data: any) => {
        useAlertStore.setState({ loading: true });
        try {
            const resp: any = await post(`clientes`, sanitizeClientePayload(data));
            if (resp.code === 1 || resp.success === true) {
                useAlertStore.setState({ success: true, loading: false });
                const created = { ...data, id: resp.data?.id || resp.id };
                set((state) => ({
                    clients: [created, ...state.clients]
                }), false, "ADD_CLIENTS");
                useAlertStore.getState().alert("Se agregó el cliente correctamente", "success");
                return created;
            } else {
                useAlertStore.setState({ success: false, loading: false });
                const msg = Array.isArray(resp.message) ? resp.message.join('. ') : (resp.message || resp.error);
                useAlertStore.getState().alert(msg || `No se pudo guardar el cliente`, "error");
                return null;
            }
        } catch (error: any) {
            useAlertStore.setState({ success: false, loading: false });
            const errMsg = error?.response?.data?.message || error?.message || "Error al guardar el cliente";
            useAlertStore.getState().alert(errMsg, "error");
            return null;
        }
    },
    editClients: async (data: any) => {
        useAlertStore.setState({ loading: true });
        try {
            const resp: any = await put(`clientes/${data.id}`, sanitizeClientePayload(data));
            if (resp.code === 1 || resp.success === true) {
                useAlertStore.setState({ success: true, loading: false });
                set((state) => ({
                    clients: state.clients.map((item: IClient) =>
                        item.id === data?.id ? { ...item, ...data } : item
                    ),
                }), false, "UPDATE_Clients");
                useAlertStore.getState().alert("Se actualizó el cliente correctamente", "success");
            } else {
                useAlertStore.setState({ success: false, loading: false });
                useAlertStore.getState().alert(resp.message || "Error al editar el Cliente", "error");
            }
        } catch (error: any) {
            return useAlertStore.getState().alert(`${error}`, "error")
        }
    },
    toggleStateClient: async (id: number) => {
        try {
            const current = _get().clients.find(c => c.id === id);
            const nuevoEstado = current?.estado === 'INACTIVO' ? 'ACTIVO' : 'INACTIVO';
            const resp: any = await patch(`clientes/${id}/estado`, { estado: nuevoEstado });
            if (resp.code === 1) {
                set((state) => ({
                    clients: state.clients.map((client) =>
                        client.id === id ? { ...client, estado: nuevoEstado } : client
                    ),
                }), false, "TOGGLE_STATE_CLIENT");
                useAlertStore.getState().alert("El cliente se ha cambiado su estado correctamente", "success");
            } else {
                useAlertStore.getState().alert("Error al cambiar el estado del cliente", "error");
            }
        } catch (error) {
            useAlertStore.getState().alert("Error al cambiar el estado del cliente", "error");
        }
    },
    deleteClient: async (id: number) => {
        useAlertStore.setState({ loading: true });
        try {
            const resp: any = await del(`clientes/${id}`);
            if (resp.code === 1 || resp.success === true) {
                useAlertStore.setState({ success: true, loading: false });
                set((state) => ({
                    clients: state.clients.filter((c) => c.id !== id),
                    totalClients: Math.max(0, (state.totalClients || 0) - 1),
                }), false, "DELETE_CLIENT");
                useAlertStore.getState().alert("Cliente eliminado correctamente", "success");
            } else {
                useAlertStore.setState({ success: false, loading: false });
                const msg = Array.isArray(resp.message) ? resp.message.join('. ') : (resp.message || resp.error);
                useAlertStore.getState().alert(msg || "No se pudo eliminar el cliente", "error");
            }
        } catch (error: any) {
            useAlertStore.setState({ success: false, loading: false });
            const errMsg = error?.response?.data?.message || error?.message || "Error al eliminar el cliente";
            useAlertStore.getState().alert(errMsg, "error");
        }
    },
    getClientFromDoc: async (nroDoc: string, tipoDoc?: string) => {
        useAlertStore.setState({ loading: true });
        try {
            const explicitType = String(tipoDoc || '').toUpperCase();
            const type = explicitType || (nroDoc.length === 11 ? 'RUC' : nroDoc.length === 8 ? 'DNI' : '');
            if (type !== 'DNI' && type !== 'RUC') {
                useAlertStore.setState({ loading: false });
                useAlertStore.getState().alert('La consulta automática solo está disponible para DNI y RUC. Registra este documento manualmente.', 'warning');
                return null;
            }
            const endpoint = `clientes/consultar/${type}/${nroDoc}`;
            const resp: any = await get(endpoint);
            console.log("Respuesta backend:", resp);
            useAlertStore.setState({ loading: false });
            if (resp.code === 1) {
                return resp.data;
            } else {
                useAlertStore.getState().alert(`Error: ${resp.message || 'No se encontraron datos'}`, "error");
                return null;
            }
        } catch (error: any) {
            console.error("Error en frontend:", error);
            useAlertStore.setState({ loading: false });
            const errorMessage = error.response?.data?.message || error.message || 'Error al consultar el documento';
            useAlertStore.getState().alert(errorMessage, "error");
            return null;
        }
    },
    exportClients: async (search?: string) => {
        try {
            useAlertStore.setState({ loading: true });
            const baseUrl = import.meta.env.VITE_API_URL as string;
            const qs = search ? `?search=${encodeURIComponent(search)}` : '';
            const response = await fetch(`${baseUrl}/clientes/exportar${qs}`, {
                method: 'GET',
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('ACCESS_TOKEN')}`,
                },
            });
            if (!response.ok) {
                const text = await response.text();
                throw new Error(text || 'Error al descargar el archivo');
            }
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'clientes.xlsx';
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
            useAlertStore.setState({ success: true });
            useAlertStore.getState().alert('Exportación exitosa', 'success');
        } catch (error: any) {
            console.error('Error en exportClients:', error.message || error);
            useAlertStore.getState().alert(error.message || 'Error al exportar los clientes', 'error');
        } finally {
            useAlertStore.setState({ loading: false });
        }
    },
    importClients: async (file: File) => {
        try {
            useAlertStore.setState({ loading: true });
            const formData = new FormData();
            formData.append('file', file);
            const baseUrl = import.meta.env.VITE_API_URL as string;
            const response = await fetch(`${baseUrl}/clientes/importar`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('ACCESS_TOKEN')}`,
                },
                body: formData,
            });
            const result = await response.json();
            if (!response.ok) {
                throw new Error(result.message || 'Error al importar los clientes');
            }
            if (result.code === 1 || result.total >= 0) {
                useAlertStore.setState({ success: true });
                useAlertStore.getState().alert('Clientes importados exitosamente', 'success');
            } else {
                throw new Error(result.message || 'Error al importar los clientes');
            }
        } catch (error: any) {
            console.error('Error en importClients:', error.message || error);
            useAlertStore.getState().alert(error.message || 'Error al importar los clientes', 'error');
        } finally {
            useAlertStore.setState({ loading: false });
        }
    },
    resetClients: async () => {
        try {
            set(
                (_state) => ({
                    clients: []
                }),
                false,
                'RESET_CLIENTS'
            );
        } catch (error) {
            console.log(error);
        }
    },
}))); 

