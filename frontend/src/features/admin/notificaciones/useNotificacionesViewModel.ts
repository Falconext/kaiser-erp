import { useEffect } from 'react';
import { useNotificacionesStore } from '@/zustand/notificaciones';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

export const useNotificacionesViewModel = () => {
    const { notificaciones, noLeidas, loading, obtenerNotificaciones, marcarComoLeida, marcarTodasComoLeidas } = useNotificacionesStore();

    useEffect(() => { obtenerNotificaciones(); }, [obtenerNotificaciones]);

    const getTipoIcon = (tipo: string) => {
        switch (tipo) {
            case 'CRITICAL': return { icon: 'mdi:alert-circle', iconColor: 'text-red-400', badgeBg: 'bg-red-100', badgeText: 'text-red-800' };
            case 'WARNING': return { icon: 'mdi:alert', iconColor: 'text-yellow-400', badgeBg: 'bg-yellow-100', badgeText: 'text-yellow-800' };
            default: return { icon: 'mdi:information', iconColor: 'text-blue-400', badgeBg: 'bg-blue-100', badgeText: 'text-blue-800' };
        }
    };

    const formatFecha = (fecha: string) => {
        try { return formatDistanceToNow(new Date(fecha), { addSuffix: true, locale: es }); }
        catch { return 'Hace un momento'; }
    };

    const handleNotificacionClick = async (notificacion: any) => {
        if (!notificacion.leida) await marcarComoLeida(notificacion.id);
    };

    return { notificaciones, noLeidas, loading, getTipoIcon, formatFecha, handleNotificacionClick, marcarTodasComoLeidas };
};
