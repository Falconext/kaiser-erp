import { useState, useEffect, useCallback } from 'react';
import { pdf } from '@react-pdf/renderer';
import React from 'react';
import { get } from '@/utils/fetch';
import { useAuthStore } from '@/zustand/auth';
import { CategoriasResponse } from './CategoriasModel';
import { CategoriasReportPDF } from './CategoriasReportPDF';

interface State {
    mesActual: number;
    anioActual: number;
    data: CategoriasResponse | null;
    isLoading: boolean;
    expandedCat: string | null;
    isGeneratingPDF: boolean;
}

export function useCategoriasViewModel() {
    const { auth } = useAuthStore();
    const now = new Date();
    const [state, setState] = useState<State>({
        mesActual: now.getMonth() + 1,
        anioActual: now.getFullYear(),
        data: null,
        isLoading: false,
        expandedCat: null,
        isGeneratingPDF: false,
    });

    const fetchData = useCallback(async (mes: number, anio: number) => {
        setState(prev => ({ ...prev, isLoading: true }));
        try {
            const resp = await get<CategoriasResponse>(
                `analisis-financiero/categorias?mes=${mes}&anio=${anio}`,
            );
            if (resp.data) setState(prev => ({ ...prev, data: resp.data! }));
        } finally {
            setState(prev => ({ ...prev, isLoading: false }));
        }
    }, []);

    useEffect(() => {
        fetchData(state.mesActual, state.anioActual);
    }, [state.mesActual, state.anioActual]);

    const navegarMes = useCallback((delta: -1 | 1) => {
        setState(prev => {
            let mes = prev.mesActual + delta;
            let anio = prev.anioActual;
            if (mes < 1) { mes = 12; anio -= 1; }
            else if (mes > 12) { mes = 1; anio += 1; }
            return { ...prev, mesActual: mes, anioActual: anio };
        });
    }, []);

    const toggleCat = useCallback((nombre: string) => {
        setState(prev => ({
            ...prev,
            expandedCat: prev.expandedCat === nombre ? null : nombre,
        }));
    }, []);

    const handleExportPDF = useCallback(async () => {
        if (!state.data) return;
        setState(prev => ({ ...prev, isGeneratingPDF: true }));
        try {
            const empresa = auth?.empresa
                ? { nombre: auth.empresa.razonSocial || auth.empresa.nombre, ruc: auth.empresa.ruc, direccion: auth.empresa.direccion }
                : null;
            const blob = await pdf(
                React.createElement(CategoriasReportPDF, {
                    data: state.data,
                    empresa,
                }) as any
            ).toBlob();
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `categorias-${state.data.periodo.label.replace(/\s+/g, '-').toLowerCase()}.pdf`;
            link.click();
            URL.revokeObjectURL(url);
        } finally {
            setState(prev => ({ ...prev, isGeneratingPDF: false }));
        }
    }, [state.data, auth?.empresa]);

    const now2 = new Date();
    const isCurrentOrFuture =
        state.anioActual > now2.getFullYear() ||
        (state.anioActual === now2.getFullYear() && state.mesActual >= now2.getMonth() + 1);

    return {
        mesActual: state.mesActual,
        anioActual: state.anioActual,
        data: state.data,
        isLoading: state.isLoading,
        expandedCat: state.expandedCat,
        isGeneratingPDF: state.isGeneratingPDF,
        isCurrentOrFuture,
        navegarMes,
        toggleCat,
        handleExportPDF,
    };
}
