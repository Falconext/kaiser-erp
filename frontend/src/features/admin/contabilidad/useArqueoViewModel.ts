import { useState, useEffect } from 'react';
import moment from 'moment';
import { useAccountingStore } from '@/zustand/accounting';
import { useAuthStore } from '@/zustand/auth';
import { useSedesStore } from '@/zustand/sedes';

export const useArqueoViewModel = () => {
    const { arqueoData, getAllArqueo, exportExcelArqueo } = useAccountingStore();
    const { auth, sedeActiva } = useAuthStore();
    const { sedes, listarSedes } = useSedesStore();
    const [isHoveredExp, setIsHoveredExp] = useState(false);
    const [fechaInicio, setFechaInicio] = useState<string>(moment(new Date()).format('YYYY-MM-DD'));
    const [fechaFin, setFechaFin] = useState<string>(moment(new Date()).format('YYYY-MM-DD'));
    const [selectedSedeId, setSelectedSedeId] = useState<number | null>(null);

    const isAdmin = auth?.rol === 'ADMIN_EMPRESA' || auth?.rol === 'ADMIN_SISTEMA';
    const esPrincipal = !sedeActiva || sedeActiva.esPrincipal === true;
    const effectiveSedeId = esPrincipal ? selectedSedeId : (sedeActiva?.id ?? null);

    const sedesOptions = [
        { id: 0, value: "Todas las sedes" },
        ...sedes.map(s => ({ id: s.id, value: s.esPrincipal ? `${s.nombre}` : s.nombre }))
    ];

    const handleDate = (date: string, name: string) => {
        if (!moment(date, 'DD/MM/YYYY', true).isValid()) return;
        if (name === 'fechaInicio') setFechaInicio(moment(date, 'DD/MM/YYYY').format('YYYY-MM-DD'));
        else if (name === 'fechaFin') setFechaFin(moment(date, 'DD/MM/YYYY').format('YYYY-MM-DD'));
    };

    const handleSelectSede = (id: any, _value: string) => {
        setSelectedSedeId(id === 0 ? null : Number(id));
    };

    useEffect(() => {
        if (isAdmin && esPrincipal) listarSedes();
    }, [isAdmin, esPrincipal]);

    useEffect(() => {
        const params: any = { fechaInicio, fechaFin, empresaId: auth?.empresaId };
        if (effectiveSedeId) params.sedeId = effectiveSedeId;
        getAllArqueo(params);
    }, [fechaFin, fechaInicio, auth, effectiveSedeId]);

    const movimientos = arqueoData?.movimientosCaja?.map((item: any) => ({
        tipoMovimiento: item?.tipo,
        documento: item?.documento,
        cliente: item?.cliente,
        fecha: moment(item?.fecha).format('DD/MM/YYYY HH:mm'),
        concepto: item?.concepto,
        medioPago: item?.medioPago,
        monto: `S/ ${item?.monto.toFixed(2)}`,
        referencia: item?.referencia || '-',
    })) || [];

    const handleExport = () => {
        const params: any = { empresaId: auth?.empresaId, fechaInicio, fechaFin };
        if (effectiveSedeId) params.sedeId = effectiveSedeId;
        exportExcelArqueo(params);
    };

    return { arqueoData, movimientos, resumen: arqueoData?.resumen, isHoveredExp, setIsHoveredExp, handleDate, handleExport, isAdmin, esPrincipal, sedesOptions, handleSelectSede };
};
