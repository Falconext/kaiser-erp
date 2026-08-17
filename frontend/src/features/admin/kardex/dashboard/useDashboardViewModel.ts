import { useState, useEffect } from 'react';
import apiClient from '@/utils/apiClient';
import { DashboardData, IDashboardViewModelState, COLORS, PIE_COLORS } from './DashboardModel';

export const useDashboardViewModel = () => {
    const [state, setState] = useState<IDashboardViewModelState>({
        loading: true,
        dashboardData: null,
        error: null,
    });
    // Productos más vendidos (endpoint de ventas) — alimenta los gráficos de
    // barras (10 más vendidos) y de línea (5 más rentables de esos 10).
    const [ventas, setVentas] = useState<any[]>([]);

    const fetchDashboardData = async () => {
        try {
            setState(prev => ({ ...prev, loading: true, error: null }));
            const [dashResp, ventasResp] = await Promise.all([
                apiClient.get('/kardex/dashboard'),
                apiClient
                    .get('/dashboard/top-productos', { params: { limit: 10 } })
                    .catch(() => ({ data: [] as any })),
            ]);
            // Support both wrapped "data" and direct response
            const dashboardInfo = dashResp.data.data || dashResp.data;
            const ventasInfo = ventasResp.data?.data ?? ventasResp.data ?? [];
            setState(prev => ({ ...prev, dashboardData: dashboardInfo }));
            setVentas(Array.isArray(ventasInfo) ? ventasInfo : []);
        } catch (error: any) {
            console.error('Error al cargar dashboard:', error);
            setState(prev => ({
                ...prev,
                error: error.response?.data?.message || 'Error al cargar la información del dashboard'
            }));
        } finally {
            setState(prev => ({ ...prev, loading: false }));
        }
    };

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('es-PE', {
            style: 'currency',
            currency: 'PEN',
        }).format(amount);
    };

    const formatDate = (dateString: string | Date | null | undefined) => {
        if (!dateString) return '-';
        try {
            const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
            if (isNaN(date.getTime())) return '-';
            return new Intl.DateTimeFormat('es-PE', {
                dateStyle: 'short',
                timeStyle: 'short',
            }).format(date);
        } catch (error) {
            return '-';
        }
    };

    // Prepare chart data logic
    const prepareChartData = () => {
        if (!state.dashboardData) return { barData: [], pieData: [] };

        const { resumenGeneral } = state.dashboardData;
        const stockNormal = Math.max(0, resumenGeneral.totalProductos -
            resumenGeneral.productosStockCritico -
            resumenGeneral.productosStockCero);

        const barData = [
            {
                name: 'Stock Normal',
                cantidad: stockNormal,
                color: COLORS.success,
            },
            {
                name: 'Stock Crítico',
                cantidad: resumenGeneral.productosStockCritico,
                color: COLORS.warning,
            },
            {
                name: 'Sin Stock',
                cantidad: resumenGeneral.productosStockCero,
                color: COLORS.danger,
            },
        ];

        const pieData = [
            {
                name: 'Stock Normal',
                value: stockNormal,
                color: COLORS.success,
            },
            {
                name: 'Stock Crítico',
                value: resumenGeneral.productosStockCritico,
                color: COLORS.warning,
            },
            {
                name: 'Sin Stock',
                value: resumenGeneral.productosStockCero,
                color: COLORS.danger,
            },
        ].filter(item => item.value > 0);

        const stockChartData = [
            {
                estado: 'Inventario',
                'Stock normal': barData[0]?.cantidad ?? 0,
                'Stock crítico': barData[1]?.cantidad ?? 0,
                'Sin stock': barData[2]?.cantidad ?? 0,
            },
        ];

        return { barData, pieData, stockChartData };
    };

    // 10 más vendidos (por unidades) y, de esos 10, los 5 más rentables (por ganancia).
    const prepareVentasData = () => {
        const items = (ventas ?? []).map((v: any) => ({
            name: v?.producto?.descripcion || 'Sin nombre',
            codigo: v?.producto?.codigo || '',
            cantidad: Number(v?.cantidad ?? 0),
            total: Number(v?.total ?? 0),
            ganancia: Number(v?.ganancia ?? 0),
        }));
        const topVendidos = [...items]
            .sort((a, b) => b.cantidad - a.cantidad)
            .slice(0, 10);
        const topRentables = [...topVendidos]
            .sort((a, b) => b.ganancia - a.ganancia)
            .slice(0, 5)
            .map((v) => ({ name: v.name, codigo: v.codigo, ganancia: v.ganancia }));
        return { topVendidos, topRentables };
    };

    const chartData = prepareChartData();
    const ventasData = prepareVentasData();

    return {
        ...state,
        actions: {
            fetchDashboardData,
        },
        helpers: {
            formatCurrency,
            formatDate,
        },
        charts: {
            barData: chartData.barData,
            pieData: chartData.pieData,
            stockChartData: chartData.stockChartData,
            topVendidos: ventasData.topVendidos,
            topRentables: ventasData.topRentables,
        }
    };
};
