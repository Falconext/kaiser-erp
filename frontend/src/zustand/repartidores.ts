import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { del, get, post, put } from '@/utils/fetch';
import useAlertStore from './alert';

export type TipoRepartidor = 'PLANILLA' | 'EVENTUAL';

export interface Repartidor {
  id: number;
  nombre: string;
  celular?: string | null;
  tipo: TipoRepartidor;
  activo: boolean;
  sedeId?: number | null;
  sede?: { id: number; nombre: string; codigo?: string | null; esPrincipal?: boolean } | null;
}

export interface RepartidorFormData {
  nombre: string;
  celular?: string | null;
  tipo: TipoRepartidor;
  activo?: boolean;
}

interface RepartidoresState {
  repartidores: Repartidor[];
  loading: boolean;
  fetchRepartidores: () => Promise<void>;
  createRepartidor: (data: RepartidorFormData) => Promise<void>;
  updateRepartidor: (id: number, data: RepartidorFormData) => Promise<void>;
  toggleActivo: (id: number, activo: boolean) => Promise<void>;
  deleteRepartidor: (id: number) => Promise<void>;
  resetRepartidores: () => void;
}

const unwrapList = (response: any): Repartidor[] => {
  const payload = response?.data ?? response;
  return Array.isArray(payload) ? payload : [];
};

const getErrorMessage = (error: any, fallback: string) => (
  error?.response?.data?.message || error?.message || fallback
);

export const useRepartidoresStore = create<RepartidoresState>()(
  devtools(
    (set, getState) => ({
      repartidores: [],
      loading: false,

      fetchRepartidores: async () => {
        set({ loading: true });
        try {
          const response = await get<Repartidor[]>('repartidores');
          set({ repartidores: unwrapList(response) });
        } catch (error: any) {
          useAlertStore.getState().alert(getErrorMessage(error, 'Error al cargar repartidores'), 'error');
        } finally {
          set({ loading: false });
        }
      },

      createRepartidor: async (data) => {
        set({ loading: true });
        try {
          await post<Repartidor>('repartidores', data);
          await getState().fetchRepartidores();
          useAlertStore.getState().alert('Repartidor creado correctamente', 'success');
        } catch (error: any) {
          useAlertStore.getState().alert(getErrorMessage(error, 'Error al crear repartidor'), 'error');
          throw error;
        } finally {
          set({ loading: false });
        }
      },

      toggleActivo: async (id, activo) => {
        // Optimistic update — never re-fetches so inactive items stay visible
        set((state) => ({
          repartidores: state.repartidores.map((r) => r.id === id ? { ...r, activo } : r),
        }));
        const repartidor = getState().repartidores.find((r) => r.id === id);
        if (!repartidor) return;
        try {
          await put<Repartidor>(`repartidores/${id}`, {
            nombre: repartidor.nombre,
            celular: repartidor.celular,
            tipo: repartidor.tipo,
            activo,
          });
          useAlertStore.getState().alert(activo ? 'Repartidor activado' : 'Repartidor desactivado', 'success');
        } catch (error: any) {
          // Revert on failure
          set((state) => ({
            repartidores: state.repartidores.map((r) => r.id === id ? { ...r, activo: !activo } : r),
          }));
          useAlertStore.getState().alert(getErrorMessage(error, 'Error al actualizar repartidor'), 'error');
        }
      },

      updateRepartidor: async (id, data) => {
        set({ loading: true });
        try {
          await put<Repartidor>(`repartidores/${id}`, data);
          await getState().fetchRepartidores();
          useAlertStore.getState().alert('Repartidor actualizado correctamente', 'success');
        } catch (error: any) {
          useAlertStore.getState().alert(getErrorMessage(error, 'Error al actualizar repartidor'), 'error');
          throw error;
        } finally {
          set({ loading: false });
        }
      },

      deleteRepartidor: async (id) => {
        set({ loading: true });
        try {
          await del<Repartidor>(`repartidores/${id}`);
          await getState().fetchRepartidores();
          useAlertStore.getState().alert('Repartidor desactivado correctamente', 'success');
        } catch (error: any) {
          useAlertStore.getState().alert(getErrorMessage(error, 'Error al eliminar repartidor'), 'error');
          throw error;
        } finally {
          set({ loading: false });
        }
      },

      resetRepartidores: () => set({ repartidores: [] }),
    }),
    { name: 'repartidores-store' },
  ),
);
