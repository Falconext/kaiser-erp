import { useCallback, useEffect, useMemo, useState } from 'react';
import { pdf } from '@react-pdf/renderer';
import React from 'react';
import { get } from '@/utils/fetch';
import { useAuthStore } from '@/zustand/auth';
import { MetodosPagoResponse } from './MetodosPagoModel';
import { MetodosPagoReportPDF } from './MetodosPagoReportPDF';

interface State {
    mesActual: number;
    anioActual: number;
    fechaInicio: string;
    fechaFin: string;
    usarRango: boolean;
    data: MetodosPagoResponse | null;
    isLoading: boolean;
    isGeneratingPDF: boolean;
    expandedMethod: string | null;
}

const today = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const monthStart = (date = new Date()) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`;

export function useMetodosPagoViewModel() {
    const now = new Date();
    const { auth } = useAuthStore();
    const [state, setState] = useState<State>({
        mesActual: now.getMonth() + 1,
        anioActual: now.getFullYear(),
        fechaInicio: monthStart(now),
        fechaFin: today(),
        usarRango: false,
        data: null,
        isLoading: false,
        isGeneratingPDF: false,
        expandedMethod: null,
    });

    const empresa = useMemo(() => auth?.empresa
        ? { nombre: auth.empresa.razonSocial || auth.empresa.nombre, ruc: auth.empresa.ruc, direccion: auth.empresa.direccion }
        : null, [auth?.empresa]);

    const fetchData = useCallback(async () => {
        setState(prev => ({ ...prev, isLoading: true }));
        try {
            const params = new URLSearchParams();
            if (state.usarRango) {
                params.set('fechaInicio', state.fechaInicio);
                params.set('fechaFin', state.fechaFin);
            } else {
                params.set('mes', String(state.mesActual));
                params.set('anio', String(state.anioActual));
            }
            const resp = await get<MetodosPagoResponse>(`analisis-financiero/metodos-pago?${params}`);
            if (resp.data) setState(prev => ({ ...prev, data: resp.data! }));
        } finally {
            setState(prev => ({ ...prev, isLoading: false }));
        }
    }, [state.usarRango, state.fechaInicio, state.fechaFin, state.mesActual, state.anioActual]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const navegarMes = useCallback((delta: -1 | 1) => {
        setState(prev => {
            let mes = prev.mesActual + delta;
            let anio = prev.anioActual;
            if (mes < 1) { mes = 12; anio -= 1; }
            else if (mes > 12) { mes = 1; anio += 1; }
            return { ...prev, mesActual: mes, anioActual: anio };
        });
    }, []);

    const handleExportPDF = useCallback(async () => {
        if (!state.data) return;
        setState(prev => ({ ...prev, isGeneratingPDF: true }));
        try {
            const blob = await pdf(
                React.createElement(MetodosPagoReportPDF, {
                    data: state.data,
                    empresa,
                }) as any
            ).toBlob();
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `metodos-pago-${state.data.periodo.label.replace(/\s+/g, '-').toLowerCase()}.pdf`;
            link.click();
            URL.revokeObjectURL(url);
        } finally {
            setState(prev => ({ ...prev, isGeneratingPDF: false }));
        }
    }, [state.data, empresa]);

    const isCurrentOrFuture =
        state.anioActual > now.getFullYear() ||
        (state.anioActual === now.getFullYear() && state.mesActual >= now.getMonth() + 1);

    return {
        ...state,
        isCurrentOrFuture,
        empresa,
        navegarMes,
        refreshData: fetchData,
        handleExportPDF,
        setFechaInicio: (fechaInicio: string) => setState(prev => ({ ...prev, fechaInicio })),
        setFechaFin: (fechaFin: string) => setState(prev => ({ ...prev, fechaFin })),
        setUsarRango: (usarRango: boolean) => setState(prev => ({ ...prev, usarRango })),
        toggleMethod: (metodo: string) => setState(prev => ({ ...prev, expandedMethod: prev.expandedMethod === metodo ? null : metodo })),
    };
}
