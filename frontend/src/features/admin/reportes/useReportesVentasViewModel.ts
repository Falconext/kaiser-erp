import { useState, useEffect, useCallback, useMemo } from 'react';
import moment from 'moment';
import apiClient from '@/utils/apiClient';
import { get } from '@/utils/fetch';
import { useSedesStore } from '@/zustand/sedes';
import useAlertStore, { type AlertState } from '@/zustand/alert';
import {
    DIMENSIONES,
    REPORTE_VACIO,
    fechaHoy,
    primerDiaMes,
    type ComprobanteDetalle,
    type Dimension,
    type FilaReporte,
    type ReporteVentas,
} from './ReportesVentasModel';

export function useReportesVentasViewModel() {
    const { sedes, listarSedes } = useSedesStore();
    const alert = useAlertStore((s: AlertState) => s.alert);

    const [dimension, setDimension] = useState<Dimension>('vendedor');
    const [fechaInicio, setFechaInicio] = useState(primerDiaMes());
    const [fechaFin, setFechaFin] = useState(fechaHoy());
    const [selectedSedeId, setSelectedSedeId] = useState<number | null>(null);
    const [busqueda, setBusqueda] = useState('');

    const [reporte, setReporte] = useState<ReporteVentas>(REPORTE_VACIO);
    const [isLoading, setIsLoading] = useState(false);
    const [isExporting, setIsExporting] = useState(false);

    // Drill-down
    const [filaSeleccionada, setFilaSeleccionada] = useState<FilaReporte | null>(null);
    const [detalle, setDetalle] = useState<ComprobanteDetalle[]>([]);
    const [isLoadingDetalle, setIsLoadingDetalle] = useState(false);

    useEffect(() => {
        listarSedes();
    }, [listarSedes]);

    const buildParams = useCallback(
        (extra?: Record<string, string>) => {
            const params = new URLSearchParams({ dimension, fechaInicio, fechaFin, ...(extra ?? {}) });
            if (selectedSedeId) params.append('sedeId', String(selectedSedeId));
            return params;
        },
        [dimension, fechaInicio, fechaFin, selectedSedeId],
    );

    const cargarReporte = useCallback(async () => {
        if (!fechaInicio || !fechaFin) return;
        setIsLoading(true);
        try {
            const resp = await get<ReporteVentas>(`reportes/ventas?${buildParams()}`);
            setReporte(resp.data ?? REPORTE_VACIO);
        } catch (e: any) {
            setReporte(REPORTE_VACIO);
            alert(e?.response?.data?.message || 'No se pudo cargar el reporte', 'error');
        } finally {
            setIsLoading(false);
        }
    }, [fechaInicio, fechaFin, buildParams, alert]);

    useEffect(() => {
        cargarReporte();
    }, [cargarReporte]);

    const filasFiltradas = useMemo(() => {
        const q = busqueda.trim().toLowerCase();
        if (!q) return reporte.filas;
        return reporte.filas.filter(
            (f) =>
                f.nombre.toLowerCase().includes(q) ||
                String(f.extra?.nroDoc ?? '').toLowerCase().includes(q) ||
                String(f.extra?.codigo ?? '').toLowerCase().includes(q),
        );
    }, [reporte.filas, busqueda]);

    const top10 = useMemo(() => reporte.filas.slice(0, 10), [reporte.filas]);

    const ticketPromedio = reporte.totalDocumentos > 0 ? reporte.totalVentas / reporte.totalDocumentos : 0;

    const dimensionMeta = useMemo(
        () => DIMENSIONES.find((d) => d.key === dimension) ?? DIMENSIONES[0],
        [dimension],
    );

    // Calendar devuelve DD/MM/YYYY → convertir a YYYY-MM-DD para la API
    const handleDateChange = (date: string, name: string) => {
        if (!moment(date, 'DD/MM/YYYY', true).isValid()) return;
        const iso = moment(date, 'DD/MM/YYYY').format('YYYY-MM-DD');
        if (name === 'fechaInicio') setFechaInicio(iso);
        else if (name === 'fechaFin') setFechaFin(iso);
    };

    const handleVerDetalle = async (fila: FilaReporte) => {
        setFilaSeleccionada(fila);
        setDetalle([]);
        setIsLoadingDetalle(true);
        try {
            const resp = await get<ComprobanteDetalle[]>(
                `reportes/ventas/detalle?${buildParams({ clave: fila.clave })}`,
            );
            setDetalle(resp.data ?? []);
        } catch (e: any) {
            alert(e?.response?.data?.message || 'No se pudo cargar el detalle', 'error');
        } finally {
            setIsLoadingDetalle(false);
        }
    };

    const handleCerrarDetalle = () => {
        setFilaSeleccionada(null);
        setDetalle([]);
    };

    const handleExportar = async () => {
        setIsExporting(true);
        try {
            const response = await apiClient.get(`reportes/ventas/exportar?${buildParams()}`, {
                responseType: 'blob',
            });
            const blob = new Blob([response.data], {
                type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `ventas-por-${dimension}-${fechaInicio}-${fechaFin}.xlsx`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch {
            alert('No se pudo exportar el reporte', 'error');
        } finally {
            setIsExporting(false);
        }
    };

    const sedesActivas = sedes.filter((s) => s.activo !== false && s.estado !== 'INACTIVO');

    return {
        // filtros
        dimension,
        dimensionMeta,
        setDimension,
        fechaInicio,
        fechaFin,
        handleDateChange,
        sedes: sedesActivas,
        selectedSedeId,
        setSelectedSedeId,
        busqueda,
        setBusqueda,
        // datos
        reporte,
        filas: filasFiltradas,
        top10,
        ticketPromedio,
        isLoading,
        isExporting,
        // acciones
        recargar: cargarReporte,
        handleExportar,
        // drill-down
        filaSeleccionada,
        detalle,
        isLoadingDetalle,
        handleVerDetalle,
        handleCerrarDetalle,
    };
}
