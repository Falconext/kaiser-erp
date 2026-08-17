import { useState, useEffect } from 'react';
import moment from 'moment';
import { useAccountingStore } from '@/zustand/accounting';
import { useAuthStore } from '@/zustand/auth';
import { useSedesStore } from '@/zustand/sedes';

const useDateFilter = () => {
    const { auth } = useAuthStore();
    const [isHoveredExp, setIsHoveredExp] = useState(false);
    const [fechaInicio, setFechaInicio] = useState<string>(moment().startOf('month').format('YYYY-MM-DD'));
    const [fechaFin, setFechaFin] = useState<string>(moment().format('YYYY-MM-DD'));

    const handleDate = (date: string, name: string) => {
        if (!moment(date, 'DD/MM/YYYY', true).isValid()) return;
        if (name === 'fechaInicio') setFechaInicio(moment(date, 'DD/MM/YYYY').format('YYYY-MM-DD'));
        else if (name === 'fechaFin') setFechaFin(moment(date, 'DD/MM/YYYY').format('YYYY-MM-DD'));
    };

    return { auth, fechaInicio, fechaFin, isHoveredExp, setIsHoveredExp, handleDate };
};

export const useReporteViewModel = () => {
    const { reportInvoices, getAllReportInvoice, resumenReporte, exportExcelReport, exportPdfReport } = useAccountingStore();
    const { auth, fechaInicio, fechaFin, isHoveredExp, setIsHoveredExp, handleDate } = useDateFilter();
    const { sedes, listarSedes } = useSedesStore();
    const [selectedSedeId, setSelectedSedeId] = useState<number | null>(null);
    const [isExportingPdf, setIsExportingPdf] = useState(false);

    const isAdmin = auth?.rol === 'ADMIN_EMPRESA' || auth?.rol === 'ADMIN_SISTEMA';
    const canFilterSede = isAdmin || auth?.rol === 'USUARIO_EMPRESA';

    const sedesOptions = [
        { id: 0, value: "Todas las sedes" },
        ...sedes.map(s => ({ id: s.id, value: s.esPrincipal ? `${s.nombre} (Principal)` : s.nombre }))
    ];

    const handleSelectSede = (id: any, _value: string) => {
        setSelectedSedeId(id === 0 ? null : Number(id));
    };

    useEffect(() => {
        if (canFilterSede) listarSedes();
    }, [canFilterSede]);

    useEffect(() => {
        const params: any = { fechaInicio, fechaFin };
        if (selectedSedeId) params.sedeId = selectedSedeId;
        getAllReportInvoice(params);
    }, [fechaFin, fechaInicio, auth, selectedSedeId]);

    const estadoPagoLabel: Record<string, string> = {
        COMPLETADO: 'Pagado',
        PENDIENTE_PAGO: 'Pendiente',
        PAGO_PARCIAL: 'Parcial',
        ANULADO: 'Anulado',
    };

    const reports = reportInvoices?.map((item: any) => {
        const moneda = item?.tipoMoneda || 'PEN';
        const simbol = moneda === 'USD' ? '$' : 'S/';
        const fmt = (v: any) => v != null ? Number(v).toFixed(2) : '0.00';
        const formaPago = (item?.formaPagoTipo || '').toUpperCase() === 'CREDITO' ? 'Crédito' : 'Contado';
        return {
            sede: item?.sede?.nombre || '-',
            comprobante: item?.comprobante,
            serie: item?.serie,
            correlativo: item?.correlativo,
            ruc: item?.cliente?.nroDoc || '-',
            cliente: item?.cliente?.nombre || '-',
            vendedor: item?.usuario?.nombre || '-',
            fecha: moment(item?.fechaEmision).utcOffset(-5 * 60).format('DD/MM/YYYY'),
            moneda,
            formaPago,
            medioPago: item?.medioPago || '-',
            estadoSunat: item?.estadoEnvioSunat,
            estadoPago: estadoPagoLabel[item?.estadoPago] || item?.estadoPago || '-',
            gravadas: fmt(item?.mtoOperGravadas),
            inafectas: fmt(item?.mtoOperInafectas),
            igv: fmt(item?.mtoIGV),
            total: `${simbol} ${fmt(item?.mtoImpVenta)}`,
            saldo: item?.saldo != null && Number(item.saldo) > 0 ? `${simbol} ${fmt(item.saldo)}` : '-',
            motivo: item?.motivo?.descripcion || '-',
        };
    });

    const handleExport = () => {
        const params: any = { fechaInicio, fechaFin };
        if (selectedSedeId) params.sedeId = selectedSedeId;
        exportExcelReport(params);
    };

    const handleExportPdf = async (formato: 'zip' | 'pdf') => {
        const params: any = { fechaInicio, fechaFin };
        if (selectedSedeId) params.sedeId = selectedSedeId;
        setIsExportingPdf(true);
        try {
            await exportPdfReport(params, formato);
        } finally {
            setIsExportingPdf(false);
        }
    };

    return { reports, resumenReporte, fechaInicio, fechaFin, isHoveredExp, setIsHoveredExp, handleDate, handleExport, handleExportPdf, isExportingPdf, canFilterSede, sedesOptions, handleSelectSede };
};

export const useReporteInformalesViewModel = () => {
    const { reportInvoicesInformal, getAllReportInvoiceInformal, resumenReporteInformal, exportExcelReportInformal } = useAccountingStore();
    const { auth, fechaInicio, fechaFin, isHoveredExp, setIsHoveredExp, handleDate } = useDateFilter();
    const { sedes, listarSedes } = useSedesStore();
    const [selectedSedeId, setSelectedSedeId] = useState<number | null>(null);

    const canFilterSede = auth?.rol === 'ADMIN_EMPRESA' || auth?.rol === 'ADMIN_SISTEMA' || auth?.rol === 'USUARIO_EMPRESA';

    const sedesOptions = [
        { id: 0, value: "Todas las sedes" },
        ...sedes.map(s => ({ id: s.id, value: s.esPrincipal ? `${s.nombre} (Principal)` : s.nombre }))
    ];

    const handleSelectSede = (id: any, _value: string) => {
        setSelectedSedeId(id === 0 ? null : Number(id));
    };

    useEffect(() => {
        if (canFilterSede) listarSedes();
    }, [canFilterSede]);

    useEffect(() => {
        const params: any = { fechaInicio, fechaFin };
        if (selectedSedeId) params.sedeId = selectedSedeId;
        getAllReportInvoiceInformal(params);
    }, [fechaFin, fechaInicio, auth, selectedSedeId]);

    const reports = reportInvoicesInformal?.map((item: any) => ({
        sede: item?.sede?.nombre || '-',
        comprobante: item?.comprobante, serie: item?.serie, correlativo: item?.correlativo,
        ruc: item?.cliente?.nroDoc, cliente: item?.cliente?.nombre,
        fecha: moment(item?.fechaEmision).format('DD/MM/YYYY'), estadoPago: item?.estadoPago,
        saldo: item?.saldo != null ? `S/ ${Number(item.saldo).toFixed(2)}` : 'S/ 0.00',
        medioPago: item?.medioPago || '-', estadoOT: item?.estadoOT || '-',
        adelanto: item?.adelanto != null ? `S/ ${Number(item.adelanto).toFixed(2)}` : 'S/ 0.00',
        total: `S/ ${item?.mtoImpVenta != null ? Number(item.mtoImpVenta).toFixed(2) : '0.00'}`
    }));

    const handleExport = () => {
        const params: any = { fechaInicio, fechaFin };
        if (selectedSedeId) params.sedeId = selectedSedeId;
        exportExcelReportInformal(params);
    };

    return { reports, resumenReporteInformal, fechaInicio, fechaFin, isHoveredExp, setIsHoveredExp, handleDate, handleExport, canFilterSede, sedesOptions, handleSelectSede };
};

const estadoPagoLabel: Record<string, string> = {
    COMPLETADO: 'Pagado',
    PENDIENTE_PAGO: 'Pendiente',
    PAGO_PARCIAL: 'Parcial',
    ANULADO: 'Anulado',
};

export const useReporteComprasViewModel = () => {
    const { reportCompras, getAllReportCompras, resumenReporteCompras, exportExcelReportCompras } = useAccountingStore();
    const { auth, fechaInicio, fechaFin, isHoveredExp, setIsHoveredExp, handleDate } = useDateFilter();
    const { sedes, listarSedes } = useSedesStore();
    const [selectedSedeId, setSelectedSedeId] = useState<number | null>(null);

    const canFilterSede = auth?.rol === 'ADMIN_EMPRESA' || auth?.rol === 'ADMIN_SISTEMA' || auth?.rol === 'USUARIO_EMPRESA';

    const sedesOptions = [
        { id: 0, value: "Todas las sedes" },
        ...sedes.map(s => ({ id: s.id, value: s.esPrincipal ? `${s.nombre} (Principal)` : s.nombre }))
    ];

    const handleSelectSede = (id: any, _value: string) => {
        setSelectedSedeId(id === 0 ? null : Number(id));
    };

    useEffect(() => {
        if (canFilterSede) listarSedes();
    }, [canFilterSede]);

    useEffect(() => {
        const params: any = { fechaInicio, fechaFin };
        if (selectedSedeId) params.sedeId = selectedSedeId;
        getAllReportCompras(params);
    }, [fechaFin, fechaInicio, auth, selectedSedeId]);

    const fmt = (v: any) => v != null ? Number(v).toFixed(2) : '0.00';

    const reports = reportCompras?.map((item: any) => {
        const moneda = item?.moneda || 'PEN';
        const simbol = moneda === 'USD' ? '$' : 'S/';
        return {
            sede: item?.sede?.nombre || '-',
            comprobante: item?.tipoDoc || '-',
            serie: item?.serie || '-',
            numero: item?.numero || '-',
            ruc: item?.proveedor?.nroDoc || '-',
            proveedor: item?.proveedor?.nombre || '-',
            fecha: moment(item?.fechaEmision).utcOffset(-5 * 60).format('DD/MM/YYYY'),
            moneda,
            estadoPago: estadoPagoLabel[item?.estadoPago] || item?.estadoPago || '-',
            gravadas: `${simbol} ${fmt(item?.subtotal)}`,
            igv: `${simbol} ${fmt(item?.igv)}`,
            total: `${simbol} ${fmt(item?.total)}`,
            saldo: item?.saldo != null && Number(item.saldo) > 0 ? `${simbol} ${fmt(item.saldo)}` : '-',
        };
    });

    const handleExport = () => {
        const params: any = { fechaInicio, fechaFin };
        if (selectedSedeId) params.sedeId = selectedSedeId;
        exportExcelReportCompras(params);
    };

    return { reports, resumenReporteCompras, fechaInicio, fechaFin, isHoveredExp, setIsHoveredExp, handleDate, handleExport, canFilterSede, sedesOptions, handleSelectSede };
};

const CATEGORIA_GASTO_LABEL: Record<string, string> = {
    PUBLICIDAD: 'Publicidad',
    SUELDOS: 'Sueldos',
    ENVIOS: 'Envíos',
    COMISIONES: 'Comisiones',
    ALQUILER: 'Alquiler',
    OTROS: 'Otros',
    PERSONALIZADA: 'Personalizada',
};

export const useReporteGastosViewModel = () => {
    const { reportGastos, getAllReportGastos, resumenReporteGastos, exportExcelReportGastos } = useAccountingStore();
    const { auth, fechaInicio, fechaFin, isHoveredExp, setIsHoveredExp, handleDate } = useDateFilter();

    useEffect(() => {
        getAllReportGastos({ fechaInicio, fechaFin });
    }, [fechaFin, fechaInicio, auth]);

    const fmt = (v: any) => v != null ? Number(v).toFixed(2) : '0.00';

    const reports = reportGastos?.map((item: any) => ({
        fecha: moment(item?.fecha).utcOffset(-5 * 60).format('DD/MM/YYYY'),
        categoria: CATEGORIA_GASTO_LABEL[item?.categoria] || item?.categoria || '-',
        etiqueta: item?.etiqueta || '-',
        descripcion: item?.descripcion || '-',
        recurrente: item?.recurrenteDiario ? 'Sí' : 'No',
        monto: `S/ ${fmt(item?.monto)}`,
    }));

    const handleExport = () => {
        exportExcelReportGastos({ fechaInicio, fechaFin });
    };

    return { reports, resumenReporteGastos, fechaInicio, fechaFin, isHoveredExp, setIsHoveredExp, handleDate, handleExport };
};
