import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { del, get, post, put } from '@/utils/fetch';
import useAlertStore from '@/zustand/alert';
import type { IComparativo, ICotizacionItem, ISolicitudCompra } from './SolicitudesModel';

export interface INuevaCotizacionPayload {
    proveedorId: number;
    referencia?: string;
    fecha?: string;
    moneda: string;
    tipoCambio: number;
    plazoEntregaDias?: number;
    condicionesPago?: string;
    validezDias?: number;
    incluyeIgv: boolean;
    observaciones?: string;
    items: ICotizacionItem[];
}

export function useSolicitudDetalleViewModel() {
    const { id } = useParams();
    const solicitudId = Number(id);
    const { alert } = useAlertStore();
    const navigate = useNavigate();

    const [solicitud, setSolicitud] = useState<ISolicitudCompra | null>(null);
    const [comparativo, setComparativo] = useState<IComparativo | null>(null);
    const [loading, setLoading] = useState(true);

    const [isCotizacionModalOpen, setIsCotizacionModalOpen] = useState(false);
    const [guardandoCotizacion, setGuardandoCotizacion] = useState(false);

    const [seleccionCotizacionId, setSeleccionCotizacionId] = useState<number | null>(null);
    const [seleccionando, setSeleccionando] = useState(false);

    const cargar = useCallback(async () => {
        if (!solicitudId) return;
        setLoading(true);
        try {
            const [respSol, respComp] = await Promise.all([
                get(`compras/solicitudes/${solicitudId}`),
                get(`compras/solicitudes/${solicitudId}/comparativo`),
            ]);
            if ((respSol as any).success) setSolicitud((respSol as any).data);
            if ((respComp as any).success) setComparativo((respComp as any).data);
        } catch {
            alert('No se pudo cargar la solicitud', 'error');
        } finally {
            setLoading(false);
        }
    }, [solicitudId, alert]);

    useEffect(() => { cargar(); }, [cargar]);

    const agregarCotizacion = async (payload: INuevaCotizacionPayload) => {
        setGuardandoCotizacion(true);
        try {
            const resp: any = await post(`compras/solicitudes/${solicitudId}/cotizaciones`, payload);
            if (resp.success) {
                alert('Cotización agregada', 'success');
                setIsCotizacionModalOpen(false);
                cargar();
                return true;
            }
            alert(resp.error || 'No se pudo agregar la cotización', 'error');
            return false;
        } finally {
            setGuardandoCotizacion(false);
        }
    };

    const eliminarCotizacion = async (cotId: number) => {
        const resp: any = await del(`compras/solicitudes/${solicitudId}/cotizaciones/${cotId}`);
        if (resp.success) {
            alert('Cotización eliminada', 'success');
            cargar();
        } else {
            alert(resp.error || 'No se pudo eliminar la cotización', 'error');
        }
    };

    const seleccionarCotizacion = async (cotizacionId: number, extra?: { fechaEntrega?: string; lugarEntrega?: string }) => {
        setSeleccionando(true);
        try {
            const resp: any = await post(`compras/solicitudes/${solicitudId}/seleccionar`, {
                cotizacionId,
                ...extra,
            });
            if (resp.success) {
                alert(`Orden de compra ${resp.data?.numeroFormato ?? ''} generada`, 'success');
                setSeleccionCotizacionId(null);
                cargar();
                return resp.data;
            }
            alert(resp.error || 'No se pudo generar la orden de compra', 'error');
            return null;
        } finally {
            setSeleccionando(false);
        }
    };

    return {
        solicitudId,
        solicitud,
        comparativo,
        loading,
        isCotizacionModalOpen,
        setIsCotizacionModalOpen,
        guardandoCotizacion,
        agregarCotizacion,
        eliminarCotizacion,
        seleccionCotizacionId,
        setSeleccionCotizacionId,
        seleccionando,
        seleccionarCotizacion,
        recargar: cargar,
        irAOrdenes: () => navigate('/administrador/compras/ordenes'),
    };
}
