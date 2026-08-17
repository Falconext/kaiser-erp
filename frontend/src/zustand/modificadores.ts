import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { del, get as fetchGet, post, patch } from '../utils/fetch';
import useAlertStore from './alert';

export interface OpcionModificador {
  id: number;
  nombre: string;
  descripcion?: string;
  precioExtra: number;
  orden: number;
  activo: boolean;
  esDefault: boolean;
}

export interface GrupoModificador {
  id: number;
  nombre: string;
  descripcion?: string;
  esObligatorio: boolean;
  seleccionMin: number;
  seleccionMax: number;
  orden: number;
  activo: boolean;
  opciones: OpcionModificador[];
  _count?: { productos: number };
}

interface CrearGrupoPayload {
  nombre: string;
  descripcion?: string;
  esObligatorio?: boolean;
  seleccionMin?: number;
  seleccionMax?: number;
  orden?: number;
}

interface CrearOpcionPayload {
  nombre: string;
  descripcion?: string;
  precioExtra?: number;
  orden?: number;
  esDefault?: boolean;
}

export interface ModificadoresState {
  grupos: GrupoModificador[];
  loading: boolean;
  getAllGrupos: () => Promise<void>;
  crearGrupo: (data: CrearGrupoPayload) => Promise<void>;
  actualizarGrupo: (id: number, data: CrearGrupoPayload) => Promise<void>;
  eliminarGrupo: (id: number) => Promise<void>;
  agregarOpcion: (grupoId: number, data: CrearOpcionPayload) => Promise<void>;
  actualizarOpcion: (id: number, data: Partial<CrearOpcionPayload & { activo: boolean }>) => Promise<void>;
  eliminarOpcion: (id: number) => Promise<void>;
  toggleOpcionActivo: (opcion: OpcionModificador) => Promise<void>;
}

export const useModificadoresStore = create<ModificadoresState>()(
  devtools((set, get) => ({
    grupos: [],
    loading: false,

    getAllGrupos: async () => {
      try {
        set({ loading: true }, false, 'MODS_GET_ALL_START');
        const res: any = await fetchGet('modificadores/grupos?incluirInactivos=true');
        const data: GrupoModificador[] = res.data || [];
        set({ grupos: data, loading: false }, false, 'MODS_GET_ALL_SUCCESS');
      } catch (error) {
        set({ grupos: [], loading: false }, false, 'MODS_GET_ALL_ERROR');
        useAlertStore.getState().alert('Error al cargar modificadores', 'error');
      }
    },

    crearGrupo: async (data) => {
      try {
        useAlertStore.setState({ loading: true });
        const res: any = await post('modificadores/grupos', data);
        if (res.code === 1 || res.success !== false) {
          useAlertStore.setState({ success: true });
          await get().getAllGrupos();
        } else {
          useAlertStore.getState().alert(res.error || 'Error al crear grupo', 'error');
        }
      } catch (error) {
        useAlertStore.getState().alert('Error al crear grupo', 'error');
      } finally {
        useAlertStore.setState({ loading: false });
      }
    },

    actualizarGrupo: async (id, data) => {
      try {
        useAlertStore.setState({ loading: true });
        const res: any = await patch(`modificadores/grupos/${id}`, data);
        if (res.code === 1 || res.success !== false) {
          useAlertStore.setState({ success: true });
          await get().getAllGrupos();
        } else {
          useAlertStore.getState().alert(res.error || 'Error al actualizar grupo', 'error');
        }
      } catch (error) {
        useAlertStore.getState().alert('Error al actualizar grupo', 'error');
      } finally {
        useAlertStore.setState({ loading: false });
      }
    },

    eliminarGrupo: async (id) => {
      try {
        const res: any = await del(`modificadores/grupos/${id}`);
        if (res.code === 1 || res.success !== false) {
          set((state) => ({
            grupos: state.grupos.filter(g => g.id !== id)
          }), false, 'MODS_DELETE_GROUP');
          useAlertStore.getState().alert('Grupo eliminado correctamente', 'success');
        } else {
          useAlertStore.getState().alert(res.error || 'Error al eliminar grupo', 'error');
        }
      } catch (error) {
        useAlertStore.getState().alert('Error al eliminar grupo', 'error');
      }
    },

    agregarOpcion: async (grupoId, data) => {
      try {
        useAlertStore.setState({ loading: true });
        const res: any = await post(`modificadores/grupos/${grupoId}/opciones`, data);
        if (res.code === 1 || res.success !== false) {
          useAlertStore.setState({ success: true });
          await get().getAllGrupos();
        } else {
          useAlertStore.getState().alert(res.error || 'Error al agregar opción', 'error');
        }
      } catch (error) {
        useAlertStore.getState().alert('Error al agregar opción', 'error');
      } finally {
        useAlertStore.setState({ loading: false });
      }
    },

    actualizarOpcion: async (id, data) => {
      try {
        useAlertStore.setState({ loading: true });
        const res: any = await patch(`modificadores/opciones/${id}`, data);
        if (res.code === 1 || res.success !== false) {
          useAlertStore.setState({ success: true });
          await get().getAllGrupos();
        } else {
          useAlertStore.getState().alert(res.error || 'Error al actualizar opción', 'error');
        }
      } catch (error) {
        useAlertStore.getState().alert('Error al actualizar opción', 'error');
      } finally {
        useAlertStore.setState({ loading: false });
      }
    },

    eliminarOpcion: async (id) => {
      try {
        const res: any = await del(`modificadores/opciones/${id}`);
        if (res.code === 1 || res.success !== false) {
          set((state) => ({
            grupos: state.grupos.map(g => ({
              ...g,
              opciones: g.opciones?.filter(o => o.id !== id) || []
            }))
          }), false, 'MODS_DELETE_OPTION');
          useAlertStore.getState().alert('Opción eliminada correctamente', 'success');
        } else {
          useAlertStore.getState().alert(res.error || 'Error al eliminar opción', 'error');
        }
      } catch (error) {
        useAlertStore.getState().alert('Error al eliminar opción', 'error');
      }
    },

    toggleOpcionActivo: async (opcion) => {
      try {
        const res: any = await patch(`modificadores/opciones/${opcion.id}`, {
          activo: !opcion.activo
        });
        if (res.code === 1 || res.success !== false) {
          set((state) => ({
            grupos: state.grupos.map(g => ({
              ...g,
              opciones: g.opciones?.map(o => 
                o.id === opcion.id ? { ...o, activo: !o.activo } : o
              ) || []
            }))
          }), false, 'MODS_TOGGLE_OPTION');
          useAlertStore.getState().alert(
            `Opción ${!opcion.activo ? 'activada' : 'desactivada'} correctamente`,
            'success'
          );
        } else {
          useAlertStore.getState().alert(res.error || 'Error al cambiar estado de opción', 'error');
        }
      } catch (error) {
        useAlertStore.getState().alert('Error al cambiar estado de opción', 'error');
      }
    },
  })),
);
