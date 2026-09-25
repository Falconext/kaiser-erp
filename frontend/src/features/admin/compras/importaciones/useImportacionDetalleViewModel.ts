import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { del, get, patch, post } from '@/utils/fetch';
import useAlertStore from '@/zustand/alert';
import { IImportacion, IImportacionGasto } from './ImportacionesModel';

type TabKey = 'items' | 'gastos' | 'liquidacion';

export const useImportacionDetalleViewModel = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { alert } = useAlertStore();

    const [importacion, setImportacion] = useState<IImportacion | null>(null);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState<TabKey>('items');

    const [showEditarItems, setShowEditarItems] = useState(false);
    const [showGastoModal, setShowGastoModal] = useState(false);
    const [gastoEdit, setGastoEdit] = useState<IImportacionGasto | null>(null);

    const [liquidando, setLiquidando] = useState(false);
    const [nacionalizando, setNacionalizando] = useState(false);
    const [showNacionalizarConfirm, setShowNacionalizarConfirm] = useState(false);
    const [sedeIdNacionalizar, setSedeIdNacionalizar] = useState<number | undefined>(undefined);

    const cargar = useCallback(async () => {
        if (!id) return;
        setLoading(true);
        const resp = await get<IImportacion>(`/importaciones/${id}`);
        if (resp.success) {
            setImportacion((resp.data as any) || null);
        } else {
            alert(resp.error || 'No se pudo cargar la importación', 'error');
        }
        setLoading(false);
    }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => { cargar(); }, [cargar]);

    const actions = {
        setTab,
        volver: () => navigate('/administrador/compras/importaciones'),

        openEditarItems: () => setShowEditarItems(true),
        closeEditarItems: () => setShowEditarItems(false),
        handleEditarItemsSuccess: () => { setShowEditarItems(false); cargar(); },

        openNuevoGasto: () => { setGastoEdit(null); setShowGastoModal(true); },
        openEditarGasto: (g: IImportacionGasto) => { setGastoEdit(g); setShowGastoModal(true); },
        closeGastoModal: () => setShowGastoModal(false),
        handleGastoSuccess: () => { setShowGastoModal(false); setGastoEdit(null); cargar(); },
        eliminarGasto: async (gastoId: number) => {
            if (!id) return;
            const resp = await del(`/importaciones/${id}/gastos/${gastoId}`);
            if (resp.success) {
                alert('Gasto eliminado', 'success');
                cargar();
            } else {
                alert(resp.error || 'No se pudo eliminar el gasto', 'error');
            }
        },

        cambiarEstado: async (estado: 'EN_TRANSITO' | 'EN_ADUANA' | 'ANULADA') => {
            if (!id) return;
            const resp = await patch(`/importaciones/${id}/estado`, { estado });
            if (resp.success) {
                alert('Estado actualizado', 'success');
                cargar();
            } else {
                alert(resp.error || 'No se pudo actualizar el estado', 'error');
            }
        },

        liquidar: async () => {
            if (!id) return;
            setLiquidando(true);
            const resp = await post<IImportacion>(`/importaciones/${id}/liquidar`, {});
            if (resp.success) {
                alert('Liquidación calculada correctamente', 'success');
                setImportacion((resp.data as any) || null);
                setTab('liquidacion');
            } else {
                alert(resp.error || 'No se pudo calcular la liquidación', 'error');
            }
            setLiquidando(false);
        },

        setSedeIdNacionalizar,
        openNacionalizarConfirm: () => setShowNacionalizarConfirm(true),
        closeNacionalizarConfirm: () => setShowNacionalizarConfirm(false),
        confirmNacionalizar: async () => {
            if (!id) return;
            setNacionalizando(true);
            const resp = await post(`/importaciones/${id}/nacionalizar`, sedeIdNacionalizar ? { sedeId: sedeIdNacionalizar } : {});
            if (resp.success) {
                alert('Importación nacionalizada: stock e inventario actualizados.', 'success');
                setShowNacionalizarConfirm(false);
                cargar();
            } else {
                alert(resp.error || 'No se pudo nacionalizar la importación', 'error');
            }
            setNacionalizando(false);
        },

        refresh: cargar,
    };

    return {
        importacion,
        loading,
        tab,
        showEditarItems,
        showGastoModal,
        gastoEdit,
        liquidando,
        nacionalizando,
        showNacionalizarConfirm,
        sedeIdNacionalizar,
        actions,
    };
};
