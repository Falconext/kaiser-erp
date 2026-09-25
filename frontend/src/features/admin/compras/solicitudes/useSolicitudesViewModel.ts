import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { get, post } from '@/utils/fetch';
import useAlertStore from '@/zustand/alert';
import { useDebounce } from '@/hooks/useDebounce';
import type { INuevoItem, ISolicitudCompra } from './SolicitudesModel';

export function useSolicitudesViewModel() {
    const { alert } = useAlertStore();
    const navigate = useNavigate();

    const [solicitudes, setSolicitudes] = useState<ISolicitudCompra[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [estado, setEstado] = useState('TODOS');
    const debouncedSearch = useDebounce(search, 500);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [guardando, setGuardando] = useState(false);

    const cargar = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({ estado });
            if (debouncedSearch) params.set('search', debouncedSearch);
            const resp: any = await get(`compras/solicitudes?${params.toString()}`);
            setSolicitudes(resp?.data ?? []);
        } catch {
            alert('No se pudieron cargar las solicitudes de compra', 'error');
        } finally {
            setLoading(false);
        }
    }, [debouncedSearch, estado, alert]);

    useEffect(() => { cargar(); }, [cargar]);

    const crearSolicitud = async (payload: {
        area: string;
        motivo: string;
        fechaRequerida: string;
        observaciones?: string;
        items: INuevoItem[];
    }) => {
        if (!payload.items.length) {
            alert('Agrega al menos un ítem a la solicitud', 'warning');
            return false;
        }
        setGuardando(true);
        try {
            const resp: any = await post('compras/solicitudes', payload);
            if (resp.success) {
                alert(`Solicitud ${resp.data?.numero ?? ''} creada`, 'success');
                setIsModalOpen(false);
                cargar();
                if (resp.data?.id) navigate(`/administrador/compras/solicitudes/${resp.data.id}`);
                return true;
            }
            alert(resp.error || 'No se pudo crear la solicitud', 'error');
            return false;
        } finally {
            setGuardando(false);
        }
    };

    return {
        solicitudes,
        loading,
        search,
        setSearch,
        estado,
        setEstado,
        isModalOpen,
        setIsModalOpen,
        guardando,
        crearSolicitud,
        recargar: cargar,
        irADetalle: (id: number) => navigate(`/administrador/compras/solicitudes/${id}`),
    };
}
