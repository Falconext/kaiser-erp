import { create } from 'zustand';
import apiClient from '@/utils/apiClient';

interface Plantilla {
    id: number;
    nombre: string;
    descripcion: string;
    imagenUrl: string;
    precioSugerido: number;
    rubroId: number;
    categoria?: string;
    rubro?: { nombre: string; id: number };
    unidadConteo: string;
    marca?: string | null;
}

interface PlantillasState {
    plantillas: Plantilla[];
    total: number;
    loading: boolean;
    page: number;
    limit: number;
    search: string;
    rubroId: number | undefined;

    // Actions
    setPage: (page: number) => void;
    setLimit: (limit: number) => void;
    setSearch: (search: string) => void;
    setRubroId: (id: number | undefined) => void;

    getPlantillas: (isRefresh?: boolean) => Promise<void>;
    deletePlantilla: (id: number) => Promise<void>;
    deletePlantillasMasivo: (ids: number[]) => Promise<void>;

    // For creation/update we might still want to refresh or manual add
    // Ideally we refresh list on create to ensure sort order/IDs
    refreshPlantillas: () => Promise<void>;

    // Update local item (for edit or image update)
    updateLocalPlantilla: (id: number, data: Partial<Plantilla>) => void;
}

export const usePlantillasStore = create<PlantillasState>((set, get) => ({
    plantillas: [],
    total: 0,
    loading: false,
    page: 1,
    limit: 50,
    search: '',
    rubroId: undefined,

    setPage: (page) => {
        set({ page });
        get().getPlantillas();
    },
    setLimit: (limit) => {
        set({ limit, page: 1 });
        get().getPlantillas();
    },
    setSearch: (search) => {
        set({ search, page: 1 });
        // Debounce could be handled in component, here we just fetch
        get().getPlantillas();
    },
    setRubroId: (rubroId) => {
        set({ rubroId, page: 1 });
        get().getPlantillas();
    },

    getPlantillas: async (isRefresh = false) => {
        if (!isRefresh) set({ loading: true });
        try {
            const { page, limit, search, rubroId } = get();
            const { data } = await apiClient.get('/plantillas', {
                params: { page, limit, search, rubroId }
            });

            // Backend returns { data: { data: [], total: ... } } usually
            const responseData = data.data || data;
            const list = Array.isArray(responseData.data) ? responseData.data : [];
            const total = responseData.total || 0;

            set({ plantillas: list, total, loading: false });
        } catch (error) {
            console.error(error);
            set({ loading: false });
        }
    },

    refreshPlantillas: async () => {
        return get().getPlantillas(true);
    },

    deletePlantilla: async (id) => {
        try {
            await apiClient.post(`/plantillas/${id}/delete`);
            // Local update: Remove from list and decrement total
            set(state => ({
                plantillas: state.plantillas.filter(p => p.id !== id),
                total: Math.max(0, state.total - 1)
            }));
        } catch (error) {
            throw error;
        }
    },

    deletePlantillasMasivo: async (ids) => {
        try {
            await apiClient.post('/plantillas/masivo/delete', { ids });
            // Local update
            set(state => ({
                plantillas: state.plantillas.filter(p => !ids.includes(p.id)),
                total: Math.max(0, state.total - ids.length)
            }));
        } catch (error) {
            throw error;
        }
    },

    updateLocalPlantilla: (id, data) => {
        set(state => ({
            plantillas: state.plantillas.map(p => p.id === id ? { ...p, ...data } : p)
        }));
    }
}));
