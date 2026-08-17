import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { get, post, patch, del } from '../utils/fetch';
import useAlertStore from './alert';

export interface ComboItem {
  productoId: number;
  cantidad: number;
  producto?: {
    id: number;
    descripcion: string;
    imagenUrl?: string;
    precioUnitario: number;
    stock: number;
  };
}

export interface Combo {
  id: number;
  nombre: string;
  descripcion?: string;
  imagenUrl?: string;
  precioRegular: number;
  precioCombo: number;
  descuentoPorcentaje: number;
  activo: boolean;
  fechaInicio?: string;
  fechaFin?: string;
  items: ComboItem[];
}

export interface CreateComboDto {
  nombre: string;
  descripcion?: string;
  imagenUrl?: string;
  precioCombo: number;
  activo?: boolean;
  fechaInicio?: string;
  fechaFin?: string;
  items: { productoId: number; cantidad: number }[];
}

export interface UpdateComboDto extends Partial<CreateComboDto> {
  id: number;
}

interface CombosState {
  combos: Combo[];
  loading: boolean;
  fetchCombos: (includeInactive?: boolean) => Promise<void>;
  createCombo: (data: CreateComboDto) => Promise<boolean>;
  updateCombo: (id: number, data: Partial<CreateComboDto>) => Promise<boolean>;
  deleteCombo: (id: number) => Promise<boolean>;
  toggleActivo: (combo: Combo) => Promise<boolean>;
  resetCombos: () => void;
}

export const useCombosStore = create<CombosState>()(
  devtools((set, _get) => ({
    combos: [],
    loading: false,

    fetchCombos: async (includeInactive = true) => {
      try {
        set({ loading: true }, false, 'FETCH_COMBOS_START');
        const params = includeInactive ? '?includeInactive=true' : '';
        const resp: any = await get(`combos${params}`);
        
        if (resp.code === 1) {
          const combosData = resp.data?.data || resp.data || [];
          set({ combos: Array.isArray(combosData) ? combosData : [] }, false, 'FETCH_COMBOS_SUCCESS');
        } else {
          set({ combos: [] }, false, 'FETCH_COMBOS_EMPTY');
        }
      } catch (error: any) {
        console.error('Error al cargar combos:', error);
        useAlertStore.getState().alert(error?.message || 'Error al cargar combos', 'error');
        set({ combos: [] }, false, 'FETCH_COMBOS_ERROR');
      } finally {
        set({ loading: false }, false, 'FETCH_COMBOS_END');
      }
    },

    createCombo: async (data: CreateComboDto) => {
      try {
        set({ loading: true }, false, 'CREATE_COMBO_START');
        const resp: any = await post('combos', data);
        
        if (resp.code === 1) {
          const newCombo = resp.data;
          set((state) => ({
            combos: [newCombo, ...state.combos]
          }), false, 'CREATE_COMBO_SUCCESS');
          useAlertStore.getState().alert('Combo creado correctamente', 'success');
          return true;
        } else {
          useAlertStore.getState().alert(resp.message || 'Error al crear combo', 'error');
          return false;
        }
      } catch (error: any) {
        console.error('Error al crear combo:', error);
        useAlertStore.getState().alert(error?.message || 'Error al crear combo', 'error');
        return false;
      } finally {
        set({ loading: false }, false, 'CREATE_COMBO_END');
      }
    },

    updateCombo: async (id: number, data: Partial<CreateComboDto>) => {
      try {
        set({ loading: true }, false, 'UPDATE_COMBO_START');
        const resp: any = await patch(`combos/${id}`, data);
        
        if (resp.code === 1) {
          const updatedCombo = resp.data;
          set((state) => ({
            combos: state.combos.map((c) => c.id === id ? updatedCombo : c)
          }), false, 'UPDATE_COMBO_SUCCESS');
          useAlertStore.getState().alert('Combo actualizado correctamente', 'success');
          return true;
        } else {
          useAlertStore.getState().alert(resp.message || 'Error al actualizar combo', 'error');
          return false;
        }
      } catch (error: any) {
        console.error('Error al actualizar combo:', error);
        useAlertStore.getState().alert(error?.message || 'Error al actualizar combo', 'error');
        return false;
      } finally {
        set({ loading: false }, false, 'UPDATE_COMBO_END');
      }
    },

    deleteCombo: async (id: number) => {
      try {
        set({ loading: true }, false, 'DELETE_COMBO_START');
        const resp: any = await del(`combos/${id}`);
        
        if (resp.code === 1) {
          set((state) => ({
            combos: state.combos.filter((c) => c.id !== id)
          }), false, 'DELETE_COMBO_SUCCESS');
          useAlertStore.getState().alert('Combo eliminado correctamente', 'success');
          return true;
        } else {
          useAlertStore.getState().alert(resp.message || 'Error al eliminar combo', 'error');
          return false;
        }
      } catch (error: any) {
        console.error('Error al eliminar combo:', error);
        useAlertStore.getState().alert(error?.message || 'Error al eliminar combo', 'error');
        return false;
      } finally {
        set({ loading: false }, false, 'DELETE_COMBO_END');
      }
    },

    toggleActivo: async (combo: Combo) => {
      try {
        const resp: any = await patch(`combos/${combo.id}`, { activo: !combo.activo });
        
        if (resp.code === 1) {
          set((state) => ({
            combos: state.combos.map((c) => 
              c.id === combo.id ? { ...c, activo: !combo.activo } : c
            )
          }), false, 'TOGGLE_COMBO_ACTIVO');
          useAlertStore.getState().alert(
            combo.activo ? 'Combo desactivado' : 'Combo activado', 
            'success'
          );
          return true;
        } else {
          useAlertStore.getState().alert(resp.message || 'Error al actualizar combo', 'error');
          return false;
        }
      } catch (error: any) {
        console.error('Error al toggle activo:', error);
        useAlertStore.getState().alert(error?.message || 'Error al actualizar combo', 'error');
        return false;
      }
    },

    resetCombos: () => {
      set({ combos: [], loading: false }, false, 'RESET_COMBOS');
    }
  }))
);

export default useCombosStore;
