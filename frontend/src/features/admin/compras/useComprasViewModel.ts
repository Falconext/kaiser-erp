import { useState } from 'react';
import React from 'react';
import { Icon } from '@iconify/react';
import moment from 'moment';
import { useComprasStore, ICompra } from '@/zustand/compras';
import { useDebounce } from '@/hooks/useDebounce';
import {
    INITIAL_COMPRAS_STATE,
    VISIBLE_COMPRAS_COLUMNS,
    ESTADO_PAGO_OPTIONS,
    IComprasViewModelState,
} from './ComprasModel';

export const useComprasViewModel = () => {
    const { listarCompras, compras, totalCompras, anularCompra } = useComprasStore();
    const [state, setState] = useState<IComprasViewModelState>(INITIAL_COMPRAS_STATE);

    const debounce = useDebounce(state.filters.search, 600);

    // Pagination
    const indexOfLastItem = state.currentPage * state.itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - state.itemsPerPage;
    const pages = Array.from(
        { length: Math.ceil((totalCompras || 0) / state.itemsPerPage) },
        (_, i) => i + 1
    );

    // Helpers
    const calcularDiasVencidos = (fechaVencimiento: string | undefined, fechaEmision: string) => {
        const targetDate = fechaVencimiento ? moment(fechaVencimiento) : moment(fechaEmision);
        return moment().diff(targetDate, 'days');
    };

    const buildParams = () => {
        const { filters } = state;
        const params: any = {
            page: state.currentPage,
            limit: state.itemsPerPage,
            search: debounce,
            estadoPago: filters.estadoPago === 'TODOS' ? undefined : filters.estadoPago,
        };
        if (filters.fechaInicio) params.fechaInicio = filters.fechaInicio;
        if (filters.fechaFin) params.fechaFin = filters.fechaFin;
        if (filters.sedeId) params.sedeId = filters.sedeId;
        return params;
    };

    const refresh = () => listarCompras(buildParams());

    const normalizeEstadoPago = (item: ICompra) => {
        const saldo = Math.max(0, Number(item.saldo || 0));
        const total = Number(item.total || 0);
        if (saldo <= 0.01) return 'COMPLETADO';
        if (saldo < total - 0.01) return 'PAGO_PARCIAL';
        return 'PENDIENTE_PAGO';
    };

    const renderPagoBadge = (estadoPago: string) => {
        const config: Record<string, { label: string; icon: string; className: string }> = {
            COMPLETADO: {
                label: 'Pagado',
                icon: 'solar:check-circle-bold-duotone',
                className: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/70 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-400/20',
            },
            PAGO_PARCIAL: {
                label: 'Pago parcial',
                icon: 'solar:clock-circle-bold-duotone',
                className: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200/70 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-400/20',
            },
            PENDIENTE_PAGO: {
                label: 'Pendiente',
                icon: 'solar:danger-triangle-bold-duotone',
                className: 'bg-rose-50 text-rose-700 ring-1 ring-rose-200/70 dark:bg-rose-500/10 dark:text-rose-300 dark:ring-rose-400/20',
            },
        };
        const cfg = config[estadoPago] || config.PENDIENTE_PAGO;
        return React.createElement(
            'span',
            {
                className: `inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-wide ${cfg.className}`,
            },
            React.createElement(Icon, { icon: cfg.icon, className: 'text-sm' }),
            cfg.label,
        );
    };

    // Table data
    const tableData = compras?.map((item: ICompra) => {
        const diasVencidos = calcularDiasVencidos(item.fechaVencimiento, item.fechaEmision);
        const saldoNormalizado = Math.max(0, Number(item.saldo || 0));
        const estadoPagoNormalizado = normalizeEstadoPago(item);
        return {
            id: item.id,
            'Fecha': moment(item.fechaEmision).format('DD/MM/YYYY'),
            'Proveedor': item.proveedor?.nombre || item.proveedor?.nroDoc || 'Sin nombre',
            'Comprobante': `${item.serie}-${item.numero}`,
            'Total': `S/ ${Number(item.total).toFixed(2)}`,
            'Saldo': `S/ ${saldoNormalizado.toFixed(2)}`,
            'Días Venc.': diasVencidos > 0 ? diasVencidos : 0,
            'Estado': item.estado,
            'Pago': renderPagoBadge(estadoPagoNormalizado),
            _raw: { ...item, saldo: saldoNormalizado, estadoPago: estadoPagoNormalizado },
        };
    });

    // Stats derived from current page
    const totalPorPagar = compras?.reduce((sum: number, item: any) => sum + Math.max(0, Number(item.saldo || 0)), 0) || 0;
    const totalVencidos = compras?.filter((item: any) => calcularDiasVencidos(item.fechaVencimiento, item.fechaEmision) > 0).length || 0;

    // Actions
    const actions = {
        // Filters
        setSearch: (value: string) =>
            setState(prev => ({ ...prev, currentPage: 1, filters: { ...prev.filters, search: value } })),
        setEstadoPago: (value: string) =>
            setState(prev => ({ ...prev, currentPage: 1, filters: { ...prev.filters, estadoPago: value } })),
        setSedeId: (id: number | null) =>
            setState(prev => ({ ...prev, currentPage: 1, filters: { ...prev.filters, sedeId: id } })),
        handleDate: (date: string, name: string) => {
            if (!moment(date, 'DD/MM/YYYY', true).isValid()) return;
            const formatted = moment(date, 'DD/MM/YYYY').format('YYYY-MM-DD');
            setState(prev => ({
                ...prev,
                currentPage: 1,
                filters: { ...prev.filters, [name]: formatted },
            }));
        },
        // Pagination
        setcurrentPage: (page: number) => setState(prev => ({ ...prev, currentPage: page })),
        setitemsPerPage: (items: number) => setState(prev => ({ ...prev, itemsPerPage: items })),
        // Modal: Detalle
        openDetalle: (id: number) => setState(prev => ({ ...prev, isOpenDetalle: true, selectedCompraId: id })),
        closeDetalle: () => setState(prev => ({ ...prev, isOpenDetalle: false, selectedCompraId: null })),
        // Modal: Pago
        openPago: (compra: ICompra) => setState(prev => ({ ...prev, selectedCompra: compra, showPaymentModal: true })),
        closePago: () => setState(prev => ({ ...prev, showPaymentModal: false, selectedCompra: null })),
        handlePaymentSuccess: () => {
            setState(prev => ({ ...prev, showPaymentModal: false, selectedCompra: null }));
            refresh();
        },
        // Modal: Historial
        openHistorial: (compra: ICompra) => setState(prev => ({ ...prev, selectedCompra: compra, showHistorialModal: true })),
        closeHistorial: () => setState(prev => ({ ...prev, showHistorialModal: false, selectedCompra: null })),
        // Modal: Nueva Compra
        openNuevaCompra: () => setState(prev => ({ ...prev, showNuevaCompraModal: true })),
        closeNuevaCompra: () => setState(prev => ({ ...prev, showNuevaCompraModal: false })),
        handleNuevaCompraSuccess: () => {
            setState(prev => ({ ...prev, showNuevaCompraModal: false }));
        },
        // Modal: Editar Compra
        openEditar: (compra: ICompra) => setState(prev => ({ ...prev, showEditarModal: true, compraEditar: compra })),
        closeEditar: () => setState(prev => ({ ...prev, showEditarModal: false, compraEditar: null })),
        handleEditarSuccess: () => {
            setState(prev => ({ ...prev, showEditarModal: false, compraEditar: null }));
            refresh();
        },
        // Anular Compra (con confirmación)
        openAnular: (compra: ICompra) => setState(prev => ({ ...prev, showAnularConfirm: true, compraAnular: compra })),
        closeAnular: () => setState(prev => ({ ...prev, showAnularConfirm: false, compraAnular: null })),
        confirmAnular: async () => {
            const compra = state.compraAnular;
            if (!compra) return;
            const ok = await anularCompra(compra.id);
            setState(prev => ({ ...prev, showAnularConfirm: false, compraAnular: null }));
            if (ok) refresh();
        },
        // Refresh
        refresh,
        listarCompras,
        buildParams,
    };

    return {
        ...state,
        compras,
        totalCompras,
        tableData,
        totalPorPagar,
        totalVencidos,
        debounce,
        indexOfLastItem,
        indexOfFirstItem,
        pages,
        actions,
        VISIBLE_COMPRAS_COLUMNS,
        ESTADO_PAGO_OPTIONS,
    };
};
