import { useState, useEffect, useCallback, useMemo } from 'react';
import moment from 'moment';
import { useVendedoresStore } from '@/zustand/vendedores';
import { useSedesStore } from '@/zustand/sedes';
import { fechaHoy, primerDiaMes } from './VendedoresModel';

export function useVendedoresViewModel() {
    const { ranking, detalle, isLoadingRanking, isLoadingDetalle, getRanking, getDetalle, clearDetalle } = useVendedoresStore();
    const { sedes, listarSedes } = useSedesStore();

    const [fechaInicio, setFechaInicio] = useState(primerDiaMes());
    const [fechaFin, setFechaFin] = useState(fechaHoy());
    const [vendedorSeleccionadoId, setVendedorSeleccionadoId] = useState<number | null>(null);
    const [drawerOpen, setDrawerOpen] = useState(false);

    // Filtros nuevos
    const [selectedSedeId, setSelectedSedeId] = useState<number | null>(null);
    const [vendedorSearch, setVendedorSearch] = useState('');

    // Cargar sedes al montar
    useEffect(() => {
        listarSedes();
    }, [listarSedes]);

    const cargarRanking = useCallback(() => {
        if (fechaInicio && fechaFin) {
            getRanking(fechaInicio, fechaFin, selectedSedeId ?? undefined);
        }
    }, [fechaInicio, fechaFin, selectedSedeId, getRanking]);

    useEffect(() => {
        cargarRanking();
    }, [cargarRanking]);

    // Filtrar por nombre de vendedor en cliente
    const rankingFiltrado = useMemo(() => {
        if (!vendedorSearch.trim()) return ranking;
        const q = vendedorSearch.trim().toLowerCase();
        return ranking.filter(
            (v) =>
                v.usuario?.nombre?.toLowerCase().includes(q) ||
                v.usuario?.email?.toLowerCase().includes(q),
        );
    }, [ranking, vendedorSearch]);

    const handleVerDetalle = (id: number) => {
        setVendedorSeleccionadoId(id);
        setDrawerOpen(true);
        getDetalle(id, fechaInicio, fechaFin);
    };

    const handleCerrarDrawer = () => {
        setDrawerOpen(false);
        clearDetalle();
        setVendedorSeleccionadoId(null);
    };

    // Calendar devuelve DD/MM/YYYY → convertir a YYYY-MM-DD para la API
    const handleDateChange = (date: string, name: string) => {
        if (!moment(date, 'DD/MM/YYYY', true).isValid()) return;
        const iso = moment(date, 'DD/MM/YYYY').format('YYYY-MM-DD');
        if (name === 'fechaInicio') setFechaInicio(iso);
        else if (name === 'fechaFin') setFechaFin(iso);
    };

    const handleAplicarFiltro = () => cargarRanking();

    const handleSelectSede = (id: number | null) => {
        setSelectedSedeId(id);
    };

    const sedesActivas = sedes.filter((s) => s.activo !== false && s.estado !== 'INACTIVO');

    return {
        ranking: rankingFiltrado,
        rankingTotal: ranking,
        detalle,
        isLoadingRanking,
        isLoadingDetalle,
        fechaInicio,
        fechaFin,
        drawerOpen,
        vendedorSeleccionadoId,
        // Filtros
        sedes: sedesActivas,
        selectedSedeId,
        vendedorSearch,
        setVendedorSearch,
        handleSelectSede,
        handleVerDetalle,
        handleCerrarDrawer,
        handleDateChange,
        handleAplicarFiltro,
    };
}
