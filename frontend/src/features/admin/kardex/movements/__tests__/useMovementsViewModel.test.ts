import { renderHook, act, waitFor } from '@testing-library/react';
import { useMovementsViewModel } from '../useMovementsViewModel';
import { useKardexStore } from '@/zustand/kardex';
import { useProductsStore } from '@/zustand/products';
// import useAlertStore from '@/zustand/alert';

// Mock stores
jest.mock('@/zustand/kardex', () => ({
    useKardexStore: jest.fn(),
}));
jest.mock('@/zustand/products', () => ({
    useProductsStore: jest.fn(),
}));
jest.mock('@/zustand/alert', () => ({
    __esModule: true,
    default: jest.fn(() => ({ alert: jest.fn() })),
}));

describe('useMovementsViewModel', () => {
    const mockGetKardex = jest.fn();
    const mockGetAllProducts = jest.fn();
    const mockKardexState = {
        kardex: {
            movimientos: [],
            paginacion: { total: 0, page: 1, limit: 50, totalPages: 0 }
        },
        loading: false,
        getKardex: mockGetKardex,
    };
    const mockProductsState = {
        products: [],
        getAllProducts: mockGetAllProducts,
    };

    beforeEach(() => {
        jest.clearAllMocks();
        (useKardexStore as unknown as jest.Mock).mockReturnValue(mockKardexState);
        (useProductsStore as unknown as jest.Mock).mockReturnValue(mockProductsState);
    });

    it('should initialize with default state', () => {
        const { result } = renderHook(() => useMovementsViewModel());

        expect(result.current.itemsPerPage).toBe(50);
        expect(result.current.currentPage).toBe(1);
        expect(result.current.filters.productoId).toBe('');
    });

    it('should fetch kardex on mount', () => {
        renderHook(() => useMovementsViewModel());
        expect(mockGetKardex).toHaveBeenCalled();
    });

    it('should handle filter changes', () => {
        const { result } = renderHook(() => useMovementsViewModel());

        act(() => {
            result.current.actions.handleFilterChange('tipoMovimiento', 'INGRESO');
        });

        expect(result.current.filters.tipoMovimiento).toBe('INGRESO');
    });

    it('should search products with debounce', async () => {
        jest.useFakeTimers();
        const { result } = renderHook(() => useMovementsViewModel());

        act(() => {
            result.current.actions.handleProductSearchChange({ target: { value: 'Prod' } } as any);
        });

        expect(result.current.productQuery).toBe('Prod');

        // Fast forward debounce
        act(() => {
            jest.runAllTimers();
        });

        expect(mockGetAllProducts).toHaveBeenCalledWith(expect.objectContaining({ search: 'Prod' }));
        expect(result.current.showSuggestions).toBe(true);

        jest.useRealTimers();
    });

    it('should clear filters', () => {
        const { result } = renderHook(() => useMovementsViewModel());

        act(() => {
            result.current.actions.handleFilterChange('tipoMovimiento', 'SALIDA');
            result.current.actions.clearFilters();
        });

        expect(result.current.filters.tipoMovimiento).toBe('');
        expect(result.current.productQuery).toBe('');
        expect(result.current.currentPage).toBe(1);
        expect(mockGetKardex).toHaveBeenCalledWith(expect.objectContaining({ page: 1, limit: 50, tipoMovimiento: '' }));
    });
});
