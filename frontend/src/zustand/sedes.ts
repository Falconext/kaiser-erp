import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { sedeService } from '../services/sede.service';
import { Sede, CreateSedeDto, UpdateSedeDto } from '../interfaces/Sede';
import useAlertStore from './alert';
import { useAuthStore } from './auth';

interface ISedesState {
    sedes: Sede[];
    loading: boolean;
    totalSedes: number; // For pagination if needed later

    listarSedes: () => Promise<void>;
    crearSede: (data: CreateSedeDto) => Promise<void>;
    actualizarSede: (id: number, data: UpdateSedeDto) => Promise<void>;
    eliminarSede: (id: number) => Promise<void>;
    toggleActivoSede: (id: number, activo: boolean) => Promise<void>;
    resetSedes: () => void;
}

export const useSedesStore = create<ISedesState>()(
    devtools(
        (set, get) => ({
            sedes: [],
            loading: false,
            totalSedes: 0,

            listarSedes: async () => {
                try {
                    set({ loading: true });
                    const response: any = await sedeService.listar();

                    // Mapear respuesta según formato backend { code, data, ... } o directo array
                    const items = Array.isArray(response) ? response : (response.data || []);

                    set({ sedes: items, totalSedes: items.length });
                } catch (error: any) {
                    console.error('Error al listar sedes:', error);
                    useAlertStore.getState().alert(error.message || 'Error al listar sedes', 'error');
                } finally {
                    set({ loading: false });
                }
            },

            crearSede: async (data) => {
                try {
                    set({ loading: true });
                    await sedeService.crear(data);
                    await get().listarSedes();
                    await useAuthStore.getState().me();
                    useAlertStore.getState().alert('Sede creada exitosamente', 'success');
                } catch (error: any) {
                    console.error('Error al crear sede:', error);
                    const msg = error?.response?.data?.message || error.message || 'Error al crear sede';
                    useAlertStore.getState().alert(msg, 'error');
                    throw error;
                } finally {
                    set({ loading: false });
                }
            },

            actualizarSede: async (id, data) => {
                try {
                    set({ loading: true });
                    await sedeService.actualizar(id, data);
                    await get().listarSedes();
                    await useAuthStore.getState().me();
                    // Si se editó la sede activa, refrescar su copia en localStorage
                    // para que cambios como permiteFacturacion apliquen sin re-loguear.
                    const authState = useAuthStore.getState();
                    if (authState.sedeActiva?.id === id) {
                        const sedeActualizada = get().sedes.find((s) => s.id === id);
                        if (sedeActualizada) authState.setSedeActiva(sedeActualizada as any);
                    }
                    useAlertStore.getState().alert('Sede actualizada exitosamente', 'success');
                } catch (error: any) {
                    console.error('Error al actualizar sede:', error);
                    useAlertStore.getState().alert(error.message || 'Error al actualizar sede', 'error');
                    throw error;
                } finally {
                    set({ loading: false });
                }
            },

            eliminarSede: async (id) => {
                try {
                    set({ loading: true });
                    await sedeService.eliminar(id);
                    await get().listarSedes();
                    await useAuthStore.getState().me();
                    useAlertStore.getState().alert('Sede desactivada. Puedes reactivarla desde el ícono de encendido.', 'success');
                } catch (error: any) {
                    console.error('Error al eliminar sede:', error);
                    useAlertStore.getState().alert(error.message || 'Error al eliminar sede', 'error');
                    throw error;
                } finally {
                    set({ loading: false });
                }
            },

            toggleActivoSede: async (id, activo) => {
                try {
                    set({ loading: true });
                    await sedeService.toggleActivo(id, activo);
                    await get().listarSedes();
                    await useAuthStore.getState().me();
                    useAlertStore.getState().alert(`Sede ${activo ? 'activada' : 'desactivada'} correctamente`, 'success');
                } catch (error: any) {
                    console.error('Error al cambiar estado de sede:', error);
                    const msg = error?.response?.data?.message || error.message || 'Error al cambiar estado';
                    useAlertStore.getState().alert(msg, 'error');
                } finally {
                    set({ loading: false });
                }
            },

            resetSedes: () => set({ sedes: [], totalSedes: 0 })
        }),
        { name: 'sedes-storage' }
    )
);
