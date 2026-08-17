import axios from '@/utils/apiClient';

export interface Reseller {
    id: number;
    nombre: string;
    codigo: string;
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

export interface CreateResellerDto {
    nombre: string;
    codigo: string;
    representante?: string;
    telefono?: string;
    email: string;
}

// Helper to extract data from backend response wrapper { code, message, data }
const extractData = (response: any) => {
    return response.data?.data ?? response.data;
};

const resellerService = {
    getAll: async () => {
        const response = await axios.get<Reseller[]>('/resellers');
        return extractData(response);
    },

    create: async (payload: CreateResellerDto) => {
        const response = await axios.post<Reseller>('/resellers', payload);
        return extractData(response);
    },

    getById: async (id: number) => {
        const response = await axios.get<Reseller>(`/resellers/${id}`);
        return extractData(response);
    },

    recargar: async (id: number, monto: number, referencia?: string) => {
        const response = await axios.post(`/resellers/${id}/recargar`, {
            monto,
            referencia
        });
        return extractData(response);
    }
};

export default resellerService;
