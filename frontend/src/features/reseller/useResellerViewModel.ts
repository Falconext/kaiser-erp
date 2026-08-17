import { useEffect } from 'react';
import { useAuthStore } from '@/zustand/auth';
import { useResellerPanelStore } from '@/zustand/reseller-panel';

export const useResellerDashboardViewModel = () => {
    const { auth } = useAuthStore();
    const { stats, clientes, proyeccion, getDashboard, getClientes, getProyeccion } = useResellerPanelStore();

    useEffect(() => {
        if (auth?.resellerId) {
            getDashboard(auth.resellerId);
            getClientes(auth.resellerId);
            getProyeccion(auth.resellerId);
        }
    }, [auth]);

    return { auth, stats, clientes, proyeccion };
};

export const useResellerRecargasViewModel = () => {
    const { auth } = useAuthStore();
    const { recargas, getRecargas, stats, getDashboard, renovaciones, renovacionesResumen, getRenovaciones } = useResellerPanelStore();

    useEffect(() => {
        if (auth?.resellerId) {
            getRecargas(auth.resellerId);
            getDashboard(auth.resellerId);
            getRenovaciones(auth.resellerId);
        }
    }, [auth]);

    return { recargas, stats, renovaciones, renovacionesResumen, getRenovaciones, auth };
};

export const useResellerGananciasViewModel = () => {
    const { auth } = useAuthStore();
    const { proyeccion, getProyeccion } = useResellerPanelStore();

    useEffect(() => {
        if (auth?.resellerId) {
            getProyeccion(auth.resellerId);
        }
    }, [auth, getProyeccion]);

    return { auth, proyeccion };
};

export const useResellerEstadoCuentaViewModel = () => {
    const { auth } = useAuthStore();
    const { estadoCuenta, getEstadoCuenta } = useResellerPanelStore();

    useEffect(() => {
        if (auth?.resellerId) {
            getEstadoCuenta(auth.resellerId);
        }
    }, [auth, getEstadoCuenta]);

    return { auth, estadoCuenta, getEstadoCuenta };
};
