import { useCallback, useEffect, useMemo, useState } from 'react';
import { get } from '@/utils/fetch';
import useAlertStore from '@/zustand/alert';
import type { Dimension } from './ReportesVentasModel';
import type { MatrizVentas } from './MapaConsumoModel';
import { TILES_PERU, normalizarZona, nivelIntensidad } from './MapaConsumoModel';

const hoy = () => new Date().toISOString().slice(0, 10);
const haceMeses = (n: number) => {
    const d = new Date();
    d.setMonth(d.getMonth() - n);
    return d.toISOString().slice(0, 10);
};

export const useMapaConsumoViewModel = () => {
    const [que, setQue] = useState<Dimension>('producto');
    const [donde, setDonde] = useState<Dimension>('departamento');
    const [fechaInicio, setFechaInicio] = useState(haceMeses(3));
    const [fechaFin, setFechaFin] = useState(hoy());
    const [matriz, setMatriz] = useState<MatrizVentas | null>(null);
    const [cargando, setCargando] = useState(false);
    /** Zona seleccionada en el mapa; null = todo el país. */
    const [zonaFoco, setZonaFoco] = useState<string | null>(null);

    const cargar = useCallback(async () => {
        setCargando(true);
        try {
            const params = new URLSearchParams({
                filas: que,
                columnas: donde,
                fechaInicio,
                fechaFin,
                limiteFilas: '20',
                limiteColumnas: '25',
            });
            const resp: any = await get(`reportes/ventas/matriz?${params}`);
            setMatriz(resp?.data ?? resp ?? null);
        } catch {
            useAlertStore.getState().alert('No se pudo cargar el mapa de consumo', 'error');
            setMatriz(null);
        } finally {
            setCargando(false);
        }
    }, [que, donde, fechaInicio, fechaFin]);

    useEffect(() => { cargar(); }, [cargar]);

    // Al cambiar de eje, la zona enfocada deja de existir: se limpia o la tabla
    // de la derecha queda mostrando el detalle de algo que ya no está en pantalla.
    useEffect(() => { setZonaFoco(null); }, [donde, que]);

    /** Ventas por zona, indexadas por la clave normalizada que usa el mapa. */
    const ventasPorZona = useMemo(() => {
        const m = new Map<string, { etiqueta: string; total: number }>();
        for (const c of matriz?.columnas ?? []) {
            m.set(normalizarZona(c.etiqueta), { etiqueta: c.etiqueta, total: c.total });
        }
        return m;
    }, [matriz]);

    const maximoZona = useMemo(
        () => Math.max(0, ...[...ventasPorZona.values()].map((v) => v.total)),
        [ventasPorZona],
    );

    const tiles = useMemo(
        () => TILES_PERU.map((t) => {
            const v = ventasPorZona.get(t.clave);
            const total = v?.total ?? 0;
            return { ...t, total, nivel: nivelIntensidad(total, maximoZona), conVentas: total > 0 };
        }),
        [ventasPorZona, maximoZona],
    );

    /**
     * Zonas que el backend devolvió pero que el mosaico no dibuja: "Sin ubigeo",
     * o una provincia cuando el eje no es departamento. Se listan aparte en vez de
     * descartarlas: si el 30 % de la venta cae ahí, hay que verlo, no esconderlo.
     */
    const zonasFueraDelMapa = useMemo(() => {
        const enMapa = new Set(TILES_PERU.map((t) => t.clave));
        return (matriz?.columnas ?? [])
            .filter((c) => !enMapa.has(normalizarZona(c.etiqueta)))
            .map((c) => ({ etiqueta: c.etiqueta, total: c.total }));
    }, [matriz]);

    /** Ranking de la zona enfocada, o el general si no hay ninguna. */
    const rankingFoco = useMemo(() => {
        if (!matriz) return [];
        if (!zonaFoco) {
            return matriz.filas.map((f) => ({ etiqueta: f.etiqueta, monto: f.total, unidades: 0 }));
        }
        const j = matriz.columnas.findIndex((c) => normalizarZona(c.etiqueta) === zonaFoco);
        if (j < 0) return [];
        return matriz.filas
            .map((f, i) => ({
                etiqueta: f.etiqueta,
                monto: matriz.valores[i]?.[j]?.montoPEN ?? 0,
                unidades: matriz.valores[i]?.[j]?.unidades ?? 0,
            }))
            .filter((r) => r.monto !== 0)
            .sort((a, b) => b.monto - a.monto);
    }, [matriz, zonaFoco]);

    const etiquetaFoco = useMemo(() => {
        if (!zonaFoco) return null;
        return matriz?.columnas.find((c) => normalizarZona(c.etiqueta) === zonaFoco)?.etiqueta ?? zonaFoco;
    }, [zonaFoco, matriz]);

    const esMapeable = donde === 'departamento';

    /**
     * Zonas para el mapa. Se excluyen las que no son un lugar —"Sin ubigeo",
     * "Sin sector"—: no tienen coordenada, y dejarlas dispararía una
     * geocodificación por cada una que nunca va a resolver.
     */
    const zonasMapa = useMemo(
        () => (matriz?.columnas ?? [])
            .filter((c) => c.total > 0 && !/^SIN[ _]/i.test(normalizarZona(c.etiqueta)))
            .map((c) => ({
                clave: normalizarZona(c.etiqueta),
                etiqueta: c.etiqueta,
                total: c.total,
            })),
        [matriz],
    );

    return {
        que, setQue, donde, setDonde,
        fechaInicio, setFechaInicio, fechaFin, setFechaFin,
        matriz, cargando, cargar,
        zonaFoco, setZonaFoco, etiquetaFoco,
        tiles, maximoZona, zonasFueraDelMapa, rankingFoco, esMapeable, zonasMapa,
    };
};
