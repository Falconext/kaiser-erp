import { useCallback, useEffect, useMemo, useState } from 'react';
import { get } from '@/utils/fetch';
import { AnalisisCouriersResponse, EnvioCourierItem } from './CouriersModel';

export type Periodo = 'dia' | 'mes' | 'rango' | 'historico';
export type FiltroCourier = 'TODOS' | string;

interface State {
    mesActual: number;
    anioActual: number;
    fechaInicio: string;
    fechaFin: string;
    dia: string;
    periodo: Periodo;
    data: AnalisisCouriersResponse | null;
    isLoading: boolean;
    /** Mensaje si la última carga falló (se conserva la data previa). */
    error: string | null;
    filtroCourier: FiltroCourier;
    busqueda: string;
    soloRetrasados: boolean;
    /** Envío abierto en el modal de rastreo. */
    rastreo: EnvioCourierItem | null;
}

const today = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const monthStart = (date = new Date()) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`;
const sumarDias = (iso: string, n: number) => {
    const [y, m, d] = iso.split('-').map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d));
    dt.setUTCDate(dt.getUTCDate() + n);
    return dt.toISOString().slice(0, 10);
};
const INICIO_HISTORICO = '2020-01-01';

export function useCouriersViewModel(sedeId?: number | null) {
    const now = new Date();
    const [state, setState] = useState<State>({
        mesActual: now.getMonth() + 1,
        anioActual: now.getFullYear(),
        fechaInicio: monthStart(now),
        fechaFin: today(),
        dia: today(),
        periodo: 'mes',
        data: null,
        isLoading: false,
        error: null,
        filtroCourier: 'TODOS',
        busqueda: '',
        soloRetrasados: false,
        rastreo: null,
    });

    const fetchData = useCallback(async () => {
        setState(prev => ({ ...prev, isLoading: true, error: null }));
        try {
            const params = new URLSearchParams();
            if (state.periodo === 'dia') {
                params.set('fechaInicio', state.dia);
                params.set('fechaFin', state.dia);
            } else if (state.periodo === 'rango') {
                params.set('fechaInicio', state.fechaInicio);
                params.set('fechaFin', state.fechaFin);
            } else if (state.periodo === 'historico') {
                params.set('fechaInicio', INICIO_HISTORICO);
                params.set('fechaFin', today());
            } else {
                params.set('mes', String(state.mesActual));
                params.set('anio', String(state.anioActual));
            }
            if (sedeId) params.set('sedeId', String(sedeId));
            const resp = await get<AnalisisCouriersResponse>(`analisis-financiero/couriers?${params}`);
            if (resp.data) setState(prev => ({ ...prev, data: resp.data! }));
        } catch (e: any) {
            // No se borra la data anterior: se avisa y se puede reintentar.
            setState(prev => ({ ...prev, error: e?.response?.data?.message || e?.message || 'No se pudo cargar la información' }));
        } finally {
            setState(prev => ({ ...prev, isLoading: false }));
        }
    }, [state.periodo, state.dia, state.fechaInicio, state.fechaFin, state.mesActual, state.anioActual, sedeId]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const navegarMes = useCallback((delta: -1 | 1) => {
        setState(prev => {
            let mes = prev.mesActual + delta;
            let anio = prev.anioActual;
            if (mes < 1) { mes = 12; anio -= 1; }
            else if (mes > 12) { mes = 1; anio += 1; }
            return { ...prev, mesActual: mes, anioActual: anio };
        });
    }, []);
    const navegarDia = useCallback((delta: -1 | 1) => {
        setState(prev => {
            const siguiente = sumarDias(prev.dia, delta);
            return siguiente > today() ? prev : { ...prev, dia: siguiente };
        });
    }, []);

    const nombresCouriers = useMemo(() => (state.data?.couriers ?? []).map(c => c.courier), [state.data]);

    /** Serie para el gráfico: por día si el período es corto, por semana si es largo. */
    const serieChart = useMemo(() => {
        const serie = state.data?.serieDiaria ?? [];
        if (serie.length <= 45) {
            return serie.map(s => ({ ...s, label: String(s.fecha).slice(8, 10) + '/' + String(s.fecha).slice(5, 7) }));
        }
        const semanas = new Map<string, any>();
        for (const s of serie) {
            const d = new Date(`${s.fecha}T12:00:00Z`);
            const lunes = new Date(d);
            lunes.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
            const key = lunes.toISOString().slice(0, 10);
            if (!semanas.has(key)) semanas.set(key, { fecha: key, label: `Sem ${key.slice(8, 10)}/${key.slice(5, 7)}` });
            const acc = semanas.get(key);
            for (const n of nombresCouriers) acc[n] = (acc[n] ?? 0) + Number(s[n] ?? 0);
        }
        return Array.from(semanas.values());
    }, [state.data, nombresCouriers]);

    const filtrar = useCallback((lista: EnvioCourierItem[]) => {
        const q = state.busqueda.trim().toLowerCase();
        return lista.filter(e =>
            (state.filtroCourier === 'TODOS' || e.courier === state.filtroCourier) &&
            (!state.soloRetrasados || e.retrasado) &&
            (!q || e.cliente.toLowerCase().includes(q) || e.documento.toLowerCase().includes(q) || e.destino.toLowerCase().includes(q) || (e.nroOrden ?? '').includes(q)),
        );
    }, [state.busqueda, state.filtroCourier, state.soloRetrasados]);

    const enCursoFiltrados = useMemo(() => filtrar(state.data?.enCurso ?? []), [state.data, filtrar]);
    const recientesFiltrados = useMemo(() => filtrar(state.data?.recientes ?? []), [state.data, filtrar]);

    const esHoy = state.dia >= today();
    const isCurrentOrFuture =
        state.anioActual > now.getFullYear() ||
        (state.anioActual === now.getFullYear() && state.mesActual >= now.getMonth() + 1);

    return {
        ...state,
        esHoy,
        hoy: today(),
        isCurrentOrFuture,
        nombresCouriers,
        serieChart,
        enCursoFiltrados,
        recientesFiltrados,
        navegarMes,
        navegarDia,
        refreshData: fetchData,
        setFechaInicio: (fechaInicio: string) => setState(prev => ({ ...prev, fechaInicio })),
        setFechaFin: (fechaFin: string) => setState(prev => ({ ...prev, fechaFin })),
        setDia: (dia: string) => setState(prev => ({ ...prev, dia })),
        setPeriodo: (periodo: Periodo) => setState(prev => ({ ...prev, periodo })),
        setFiltroCourier: (filtroCourier: FiltroCourier) => setState(prev => ({ ...prev, filtroCourier })),
        setBusqueda: (busqueda: string) => setState(prev => ({ ...prev, busqueda })),
        toggleSoloRetrasados: () => setState(prev => ({ ...prev, soloRetrasados: !prev.soloRetrasados })),
        abrirRastreo: (rastreo: EnvioCourierItem | null) => setState(prev => ({ ...prev, rastreo })),
    };
}
