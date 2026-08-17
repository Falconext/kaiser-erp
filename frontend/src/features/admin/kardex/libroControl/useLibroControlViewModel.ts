import { useState, useCallback, useEffect } from 'react';
import { get } from '@/utils/fetch';
import useAlertStore from '@/zustand/alert';
import { useAuthStore } from '@/zustand/auth';
import type { IMovimientoLibroControl, IProductoControlado } from './LibroControlModel';

const hoy = new Date().toISOString().slice(0, 10);
const inicioAnio = `${new Date().getFullYear()}-01-01`;

export const useLibroControlViewModel = () => {
    const { auth } = useAuthStore();
    const [movimientos, setMovimientos] = useState<IMovimientoLibroControl[]>([]);
    const [productosControlados, setProductosControlados] = useState<IProductoControlado[]>([]);
    const [loading, setLoading] = useState(false);

    const [fechaInicio, setFechaInicio] = useState(inicioAnio);
    const [fechaFin, setFechaFin] = useState(hoy);
    const [productoId, setProductoId] = useState<number | ''>('');

    const fetchLibro = useCallback(async () => {
        if (!fechaInicio || !fechaFin) return;
        setLoading(true);
        try {
            const params = new URLSearchParams({ fechaInicio, fechaFin });
            if (productoId) params.set('productoId', String(productoId));
            const resp: any = await get(`kardex/libro-control-psicotropicos?${params}`);
            setMovimientos(resp?.data?.movimientos ?? []);
            setProductosControlados(resp?.data?.productosControlados ?? []);
        } catch {
            useAlertStore.getState().alert('Error al cargar el libro de control', 'error');
        } finally {
            setLoading(false);
        }
    }, [fechaInicio, fechaFin, productoId]);

    useEffect(() => { fetchLibro(); }, [fetchLibro]);

    const exportarCSV = () => {
        const empresa = (auth?.empresa as any);
        const headers = [
            'N°', 'Fecha', 'Tipo', 'Proveedor/Paciente', 'Doc. Identidad',
            'N° Receta/Comprobante', 'Médico Prescriptor',
            'Nombre del Medicamento', 'Concentración', 'Forma Farmacéutica',
            'N° Lote', 'Cantidad Entrada', 'Cantidad Salida', 'Saldo'
        ];
        const rows = movimientos.map((m, i) => [
            i + 1,
            new Date(m.fecha).toLocaleDateString('es-PE'),
            m.tipo,
            m.tipo === 'ENTRADA' ? (m.proveedor ?? '') : (m.nombrePaciente ?? m.paciente ?? ''),
            m.tipo === 'ENTRADA' ? (m.proveedorDoc ?? '') : (m.dniPaciente ?? ''),
            m.tipo === 'ENTRADA' ? (m.documento ?? '') : (m.numeroReceta ?? ''),
            m.tipo === 'SALIDA' ? (m.medico ?? '') : '',
            m.productoNombre,
            m.concentracion ?? '',
            m.formaFarmaceutica ?? '',
            m.lote ?? '',
            m.tipo === 'ENTRADA' ? m.cantidad : '',
            m.tipo === 'SALIDA' ? m.cantidad : '',
            m.saldo,
        ]);

        const header = [
            `LIBRO DE CONTROL DE PSICOTRÓPICOS Y ESTUPEFACIENTES`,
            `Establecimiento: ${empresa?.razonSocial ?? empresa?.nombre ?? ''} | RUC: ${empresa?.ruc ?? empresa?.nroDoc ?? ''}`,
            `Período: ${fechaInicio} al ${fechaFin}`,
            `Director Técnico: ${empresa?.directorTecnico ?? ''}`,
            '',
        ];

        const csv = [
            ...header.map(h => `"${h}"`),
            headers.map(h => `"${h}"`).join(';'),
            ...rows.map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(';')),
        ].join('\n');

        const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `libro_control_psicotropicos_${fechaInicio}_${fechaFin}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    return {
        auth, movimientos, productosControlados, loading,
        fechaInicio, setFechaInicio,
        fechaFin, setFechaFin,
        productoId, setProductoId,
        fetchLibro, exportarCSV,
    };
};
