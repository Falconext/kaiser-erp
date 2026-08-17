import { useState, useEffect, ChangeEvent } from 'react';
import moment from 'moment';
import { useDebounce } from '@/hooks/useDebounce';
import { useKardexStore } from '@/zustand/kardex';
import { useProductsStore } from '@/zustand/products';
import useAlertStore from '@/zustand/alert';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { IMovementsViewModelState, MovimientoKardex, TIPOS_MOVIMIENTO } from './MovementsModel';

export const useMovementsViewModel = () => {
    // Stores
    const { kardex, loading, getKardex } = useKardexStore();
    const { getAllProducts, products } = useProductsStore();
    const { alert } = useAlertStore();

    // Initial State
    const todayStr = moment().format('YYYY-MM-DD');

    const [state, setState] = useState<IMovementsViewModelState>({
        filters: {
            fechaInicio: todayStr,
            fechaFin: todayStr,
            productoId: '',
            tipoMovimiento: '',
        },
        productQuery: '',
        showSuggestions: false,
        selectedMovimiento: null,
        currentPage: 1,
        itemsPerPage: 50,
    });

    const debouncedProductQuery = useDebounce(state.productQuery, 400);

    // Derived State
    const indexOfLastItem = state.currentPage * state.itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - state.itemsPerPage;
    const totalPages = kardex?.paginacion?.total ? Math.ceil(kardex.paginacion.total / state.itemsPerPage) : 0;
    const pages = Array.from({ length: totalPages }, (_, i) => i + 1);

    // Effects

    // Fetch Kardex on pagination change
    useEffect(() => {
        getKardex({
            page: state.currentPage,
            limit: state.itemsPerPage,
            ...state.filters,
        });
    }, [state.currentPage, state.itemsPerPage]); // eslint-disable-line react-hooks/exhaustive-deps

    // Auto-apply filters
    useEffect(() => {
        // Validate date range
        if (state.filters.fechaInicio && state.filters.fechaFin) {
            const start = new Date(state.filters.fechaInicio);
            const end = new Date(state.filters.fechaFin);
            if (!isNaN(start.getTime()) && !isNaN(end.getTime()) && start > end) {
                alert('La fecha inicio no puede ser mayor que la fecha fin', 'error');
                return;
            }
        }
        // Reset to page 1 and load
        if (state.currentPage !== 1) {
            setState(prev => ({ ...prev, currentPage: 1 }));
        } else {
            getKardex({ page: 1, limit: state.itemsPerPage, ...state.filters });
        }
    }, [state.filters.fechaInicio, state.filters.fechaFin, state.filters.tipoMovimiento, state.filters.productoId]); // eslint-disable-line react-hooks/exhaustive-deps

    // Search Products
    useEffect(() => {
        if (debouncedProductQuery && debouncedProductQuery.trim().length >= 2) {
            getAllProducts({ page: 1, limit: 10, search: debouncedProductQuery });
            setState(prev => ({ ...prev, showSuggestions: true }));
        } else {
            setState(prev => ({ ...prev, showSuggestions: false }));
        }
    }, [debouncedProductQuery, getAllProducts]);

    // Helpers
    const formatDate = (dateString: string | Date | null | undefined) => {
        if (!dateString) return '-';
        try {
            const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
            if (isNaN(date.getTime())) return '-';
            return format(date, 'dd/MM/yyyy HH:mm', { locale: es });
        } catch (error) {
            return '-';
        }
    };

    const formatCurrency = (amount?: number) => {
        if (amount === undefined || amount === null) return '-';
        return new Intl.NumberFormat('es-PE', {
            style: 'currency',
            currency: 'PEN',
        }).format(amount);
    };

    const getTipoMovimientoColor = (tipo: string) => {
        switch (tipo) {
            case 'INGRESO': return 'text-green-600 bg-green-100';
            case 'SALIDA': return 'text-red-600 bg-red-100';
            case 'AJUSTE': return 'text-blue-600 bg-blue-100';
            case 'TRANSFERENCIA': return 'text-purple-600 bg-purple-100';
            default: return 'text-gray-600 bg-gray-100';
        }
    };

    // Actions
    const handleFilterChange = (field: string, value: string) => {
        setState(prev => ({
            ...prev,
            filters: { ...prev.filters, [field]: value }
        }));
    };

    const clearFilters = () => {
        const cleared = {
            fechaInicio: todayStr,
            fechaFin: todayStr,
            productoId: '',
            tipoMovimiento: '',
        };
        setState(prev => ({
            ...prev,
            filters: cleared,
            productQuery: '',
            currentPage: 1
        }));
        getKardex({ page: 1, limit: state.itemsPerPage, ...cleared });
    };

    const applyFilters = () => {
        setState(prev => ({ ...prev, currentPage: 1 }));
        getKardex({ page: 1, limit: state.itemsPerPage, ...state.filters });
    };

    const handleDate = (date: string, name: string) => {
        if (!moment(date, 'DD/MM/YYYY', true).isValid()) return;
        const formattedDate = moment(date, 'DD/MM/YYYY').format('YYYY-MM-DD');
        setState(prev => ({
            ...prev,
            filters: { ...prev.filters, [name]: formattedDate }
        }));
    };

    const handleProductSearchChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const val = (e.target as HTMLInputElement).value;
        setState(prev => ({ ...prev, productQuery: val }));
        if (val === '') {
            handleFilterChange('productoId', '');
        }
    };

    const selectProduct = (p: any) => {
        setState(prev => ({
            ...prev,
            productQuery: `${p.codigo} - ${p.descripcion}`,
            showSuggestions: false,
            filters: { ...prev.filters, productoId: String(p.id) }
        }));
    };

    const openModal = (data: MovimientoKardex) => {
        setState(prev => ({ ...prev, selectedMovimiento: data }));
    };

    const closeModal = () => {
        setState(prev => ({ ...prev, selectedMovimiento: null }));
    };

    // Table Data Preparation
    // Limpia el drift de punto flotante: 3.8000000000000003 -> 3.8, 5.401 -> 5.401
    const fmtDec = (v: any) => parseFloat(Number(v ?? 0).toFixed(3));

    const movimientosTable = kardex?.movimientos?.map((item: MovimientoKardex) => {
        const conceptoFormatted = item.concepto
            // Recorta decimales largos incrustados en el texto (ej. "+3.8000000000000003" -> "+3.8")
            .replace(/(\d+\.\d{1,3})\d+/g, '$1')
            .replace(/([a-zA-Z0-9]+-[a-zA-Z0-9]+)/g, match => match.toUpperCase());
        const costoUnitarioNumber = Number(item.costoUnitario ?? 0);
        const gananciaUnidadNumber = Number(item.gananciaUnidad ?? 0);
        const precioUnitarioNumber = Number(item.precioUnitario ?? (costoUnitarioNumber + gananciaUnidadNumber));

        const cantidadNum = Number(item.cantidad);
        let cantidadDisplay = cantidadNum;
        if (item.tipoMovimiento === 'INGRESO') {
            cantidadDisplay = Math.abs(cantidadNum);
        } else if (item.tipoMovimiento === 'SALIDA' || item.tipoMovimiento === 'TRANSFERENCIA') {
            cantidadDisplay = -Math.abs(cantidadNum);
        } else if (item.tipoMovimiento === 'AJUSTE') {
            cantidadDisplay = Number(item.stockActual) - Number(item.stockAnterior);
        }

        return {
        fecha: formatDate(item.fecha),
        producto: item.producto.descripcion,
        sede: item.sede?.nombre ?? '-',
        tipo: item.tipoMovimiento,
        concepto: conceptoFormatted,
        cantidad: fmtDec(cantidadDisplay),
        stockAnterior: fmtDec(item.stockAnterior),
        stockActual: fmtDec(item.stockActual),
        costoUnitario: formatCurrency(costoUnitarioNumber),
        precioUnitario: formatCurrency(precioUnitarioNumber),
        gananciaUnidad: formatCurrency(gananciaUnidadNumber),
        _original: item
    }}) || [];

    const actions = {
        setcurrentPage: (page: number) => setState(prev => ({ ...prev, currentPage: page })),
        setitemsPerPage: (items: number) => setState(prev => ({ ...prev, itemsPerPage: items })),
        handleFilterChange,
        handleDate,
        handleProductSearchChange,
        selectProduct,
        setShowSuggestions: (v: boolean) => setState(prev => ({ ...prev, showSuggestions: v })),
        clearFilters,
        applyFilters,
        openModal,
        closeModal
    };

    return {
        ...state, // filters, productQuery, showSuggestions, selectedMovimiento, currentPage, itemsPerPage
        loading,
        kardex, // raw response if needed, but table data is better
        products, // for suggestions
        movimientosTable,
        actions,
        helpers: {
            formatCurrency,
            formatDate,
            getTipoMovimientoColor
        },
        pagination: {
            indexOfFirstItem,
            indexOfLastItem,
            pages,
            total: kardex?.paginacion?.total || 0
        },
        TIPOS_MOVIMIENTO
    };
};
