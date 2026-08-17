import api from '../utils/apiClient';
import { Sede, CreateSedeDto, UpdateSedeDto } from '../interfaces/Sede';

const extractData = (response: any) => response.data;

export const sedeService = {
    listar: async () => {
        const response = await api.get<Sede[]>('/sede');
        return extractData(response);
    },

    crear: async (dto: CreateSedeDto) => {
        const response = await api.post<Sede>('/sede', dto);
        return extractData(response);
    },

    actualizar: async (id: number, dto: UpdateSedeDto) => {
        const response = await api.patch<Sede>(`/sede/${id}`, dto);
        return extractData(response);
    },

    eliminar: async (id: number) => {
        const response = await api.delete<Sede>(`/sede/${id}`);
        return extractData(response);
    },

    obtener: async (id: number) => {
        const response = await api.get<Sede>(`/sede/${id}`);
        return extractData(response);
    },

    toggleActivo: async (id: number, activo: boolean) => {
        const response = await api.patch<Sede>(`/sede/${id}`, { activo });
        return extractData(response);
    }
};
