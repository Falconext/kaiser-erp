import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { del, get, post, put } from '../utils/fetch';
import useAlertStore from './alert';

export interface IBrand {
  id: number;
  nombre: string;
  imagenUrl?: string;
}

export interface IBrandsState {
  brands: IBrand[];
  totalBrands: number;
  isLoadingBrands: boolean;
  getAllBrands: () => Promise<void>;
  addBrand: (data: { nombre: string }) => Promise<void>;
  editBrand: (data: { id: number; nombre: string }) => Promise<void>;
  updateBrandImage: (id: number, imageUrl: string) => void;
  deleteBrand: (id: number) => Promise<void>;
  formValues: { id: number; nombre: string; imagenUrl?: string };
  isEdit: boolean;
  setFormValues: (data: { id: number; nombre: string; imagenUrl?: string }) => void;
  setIsEdit: (value: boolean) => void;
}

export const useBrandsStore = create<IBrandsState>()(devtools((set, _get) => ({
  brands: [],
  totalBrands: 0,
  isLoadingBrands: false,
  formValues: { id: 0, nombre: "", imagenUrl: "" },
  isEdit: false,
  setFormValues: (data: { id: number; nombre: string; imagenUrl?: string }) => set({ formValues: data }),
  setIsEdit: (value: boolean) => set({ isEdit: value }),

  getAllBrands: async () => {
    if (_get().isLoadingBrands) return;
    set({ isLoadingBrands: true }, false, 'GET_BRANDS_START');
    try {
      const resp: any = await get('marca/listar');
      if ((resp as any).code === 1 || Array.isArray(resp?.data) || Array.isArray(resp)) {
        const list = Array.isArray(resp?.data) ? resp.data : resp.data?.data ?? resp;
        set({
          brands: list || [],
          totalBrands: Array.isArray(list) ? list.length : 0,
          isLoadingBrands: false,
        }, false, 'GET_BRANDS');
      } else {
        set({ brands: [], totalBrands: 0, isLoadingBrands: false }, false, 'GET_BRANDS_EMPTY');
      }
    } catch (_e) {
      set({ brands: [], totalBrands: 0, isLoadingBrands: false }, false, 'GET_BRANDS_ERROR');
    }
  },

  addBrand: async (data: { nombre: string }) => {
    try {
      useAlertStore.setState({ loading: true });
      const resp: any = await post('marca/crear', { nombre: data.nombre.trim() });
      if (resp.code === 1) {
        useAlertStore.setState({ success: true });
        set((state) => ({
          brands: [{ id: resp.data?.id, nombre: data.nombre.trim(), imagenUrl: resp.data?.imagenUrl }, ...state.brands],
          totalBrands: (state.totalBrands || 0) + 1,
        }), false, 'ADD_BRAND');
        useAlertStore.getState().alert('Se agregó la marca correctamente', 'success');
        return resp.data;
      } else {
        useAlertStore.getState().alert('Error al agregar la marca', 'error');
      }
    } catch (error: any) {
      useAlertStore.getState().alert(error?.message || 'Error al agregar la marca', 'error');
    } finally {
      useAlertStore.setState({ loading: false });
    }
  },

  editBrand: async (data: { id: number; nombre: string }) => {
    try {
      useAlertStore.setState({ loading: true });
      const resp: any = await put(`marca/${data.id}`, { nombre: data.nombre.trim() });
      if (resp.code === 1) {
        useAlertStore.setState({ success: true });
        set((state) => ({
          brands: state.brands.map((b) => (b.id === data.id ? { ...b, ...data } : b)),
        }), false, 'EDIT_BRAND');
        useAlertStore.getState().alert('Se actualizó la marca correctamente', 'success');
        return resp.data;
      } else {
        useAlertStore.getState().alert('Error al actualizar la marca', 'error');
      }
    } catch (error: any) {
      useAlertStore.getState().alert(error?.message || 'Error al actualizar la marca', 'error');
    } finally {
      useAlertStore.setState({ loading: false });
    }
  },

  updateBrandImage: (id: number, imageUrl: string) => {
    set((state) => ({
      brands: state.brands.map((b) => (b.id === id ? { ...b, imagenUrl: imageUrl } : b)),
    }), false, 'UPDATE_BRAND_IMAGE');
  },

  deleteBrand: async (id: number) => {
    try {
      useAlertStore.setState({ loading: true });
      const resp: any = await del(`marca/${id}`);
      if (resp.code === 1) {
        set((state) => ({
          brands: state.brands.filter((b) => b.id !== id),
          totalBrands: Math.max(0, (state.totalBrands || 0) - 1),
        }), false, 'DELETE_BRAND');
        useAlertStore.setState({ success: true });
        useAlertStore.getState().alert('Se eliminó la marca correctamente', 'success');
      } else {
        useAlertStore.getState().alert('Error al eliminar la marca', 'error');
      }
    } catch (error: any) {
      useAlertStore.getState().alert(error?.message || 'Error al eliminar la marca', 'error');
    } finally {
      useAlertStore.setState({ loading: false });
    }
  },
})));
