import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

interface Alert {
    id: number; // ID único para identificar la alerta
    message: string | string[]; // Mensaje de la alerta
    type: string; // Tipo de alerta (success, error, notification, warning)
    title?: string; // Título opcional
}

export interface AlertState {
    loading?: boolean
    message: string | string[]; // Mensaje de la alerta
    errors?: string | string[]
    type: string
    alert: (message: string | string[], type: string, title?: string) => void
    resetAlerts: () => void; // Limpiar todas las alertas
    removeAlert: (id: number) => void; // Eliminar una alerta específica
    load: (loading: boolean) => void
    success?: boolean
    alerts: Alert[]; // Arreglo de alertas
}


// Crea el store con Zustand
const useAlertStore = create<AlertState>()(
    devtools(
        (set) => ({
            success: false,
            loading: false,
            message: "",
            alerts: [],
            type: "",
            alert: (message: string | string[], type: string, title?: string) => {
                set((state) => ({
                    alerts: [
                        ...state.alerts,
                        {
                            id: Date.now(), // Usar timestamp como ID único
                            message,
                            type,
                            title,
                        },
                    ],
                }));
            },
            load: (loading: boolean) => {
                set({ loading: loading })
            },
            removeAlert: (id: number) => {
                set((state) => ({
                    loading: false,
                    alerts: state.alerts.filter((alert) => alert.id !== id),
                }));
            },
            resetAlerts: () => {
                set({ alerts: [], loading: false });
            },
        })));


export default useAlertStore;