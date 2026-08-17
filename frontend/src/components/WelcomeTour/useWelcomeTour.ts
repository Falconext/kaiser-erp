import { useState, useCallback } from 'react';
import { IUser } from '@/interfaces/auth';

export interface TourStep {
    target: string;          // data-tour attribute value
    title: string;
    description: string;
    icon: string;
    position: 'right' | 'bottom' | 'left';
}

export const TOUR_STEPS: TourStep[] = [
    {
        target: 'dashboard',
        title: 'Dashboard',
        description: 'Tus ventas, cobros y métricas del negocio en tiempo real.',
        icon: 'solar:home-angle-bold-duotone',
        position: 'right',
    },
    {
        target: 'facturacion',
        title: 'Facturación',
        description: 'Emite boletas, facturas y tickets con validez SUNAT en segundos.',
        icon: 'solar:bill-list-bold-duotone',
        position: 'right',
    },
    {
        target: 'kardex-toggle',
        title: 'Kardex',
        description: 'Desde aquí controlas inventario, movimientos, lotes y reservas.',
        icon: 'solar:box-bold-duotone',
        position: 'right',
    },
    {
        target: 'clientes',
        title: 'Clientes',
        description: 'Registro de clientes con DNI/RUC para emitir comprobantes.',
        icon: 'solar:users-group-rounded-bold-duotone',
        position: 'right',
    },
    {
        target: 'cotizaciones',
        title: 'Cotizaciones',
        description: 'Crea presupuestos y conviértelos en facturas con un clic.',
        icon: 'solar:document-text-bold-duotone',
        position: 'right',
    },
];

const getTourKey = (userId: number) => `tour:done:${userId}`;

export const useWelcomeTour = (user: IUser | null) => {
    const userId = user?.id;
    const alreadySeen = userId ? localStorage.getItem(getTourKey(userId)) === '1' : true;

    const [showModal, setShowModal] = useState(!alreadySeen);
    const [tourStep, setTourStep] = useState<number | null>(null);

    const markDone = useCallback(() => {
        if (userId) localStorage.setItem(getTourKey(userId), '1');
    }, [userId]);

    const startTour = useCallback(() => {
        setShowModal(false);
        markDone();
        setTourStep(0);
    }, [markDone]);

    const skipTour = useCallback(() => {
        setShowModal(false);
        markDone();
    }, [markDone]);

    const nextStep = useCallback(() => {
        setTourStep(prev => {
            if (prev === null) return null;
            if (prev >= TOUR_STEPS.length - 1) { return null; }
            return prev + 1;
        });
    }, []);

    const prevStep = useCallback(() => {
        setTourStep(prev => (prev !== null && prev > 0 ? prev - 1 : prev));
    }, []);

    const endTour = useCallback(() => setTourStep(null), []);

    return { showModal, tourStep, startTour, skipTour, nextStep, prevStep, endTour };
};
