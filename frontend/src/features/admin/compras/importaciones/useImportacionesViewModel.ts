import { useCallback, useState } from 'react';
import { get, patch } from '@/utils/fetch';
import useAlertStore from '@/zustand/alert';
import { useDebounce } from '@/hooks/useDebounce';
import { IImportacion, INITIAL_IMPORTACIONES_FILTERS, IImportacionFilters } from './ImportacionesModel';

export const useImportacionesViewModel = () => {
    const { alert } = useAlertStore();
    const [importaciones, setImportaciones] = useState<IImportacion[]>([]);
    const [loading, setLoading] = useState(false);
    const [filters, setFilters] = useState<IImportacionFilters>(INITIAL_IMPORTACIONES_FILTERS);
    const [showNuevaModal, setShowNuevaModal] = useState(false);

    const debounce = useDebounce(filters.search, 500);

    const cargar = useCallback(async () => {
        setLoading(true);
        const params = new URLSearchParams();
        if (debounce) params.set('search', debounce);
        if (filters.estado && filters.estado !== 'TODOS') params.set('estado', filters.estado);
        const query = params.toString();
        const resp = await get<IImportacion[]>(`/importaciones${query ? `?${query}` : ''}`);
        if (resp.success) {
            setImportaciones((resp.data as any) || []);
        } else {
            alert(resp.error || 'No se pudo cargar las importaciones', 'error');
        }
        setLoading(false);
    }, [debounce, filters.estado]); // eslint-disable-line react-hooks/exhaustive-deps

    const anularImportacion = useCallback(async (id: number) => {
        const resp = await patch(`/importaciones/${id}/estado`, { estado: 'ANULADA' });
        if (!resp.success) {
            alert(resp.error || 'No se pudo anular la importación', 'error');
            return false;
        }
        return true;
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const actions = {
        setSearch: (value: string) => setFilters((prev) => ({ ...prev, search: value })),
        setEstado: (value: string) => setFilters((prev) => ({ ...prev, estado: value })),
        openNueva: () => setShowNuevaModal(true),
        closeNueva: () => setShowNuevaModal(false),
        handleNuevaSuccess: () => {
            setShowNuevaModal(false);
            cargar();
        },
        cargar,
        anularImportacion,
    };

    return {
        importaciones,
        loading,
        filters,
        debounce,
        showNuevaModal,
        actions,
    };
};
