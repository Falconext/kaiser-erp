import { renderHook, act } from '@testing-library/react';
import { useProductsViewModel } from '../useProductsViewModel';
import { useProductsStore } from '@/zustand/products';
import { useBrandsStore } from '@/zustand/brands';
import { useAuthStore } from '@/zustand/auth';
import useAlertStore from '@/zustand/alert';

// Mock dependencies
jest.mock('@/zustand/products', () => ({
    useProductsStore: jest.fn(),
}));
jest.mock('@/zustand/brands', () => ({
    useBrandsStore: jest.fn(),
}));
jest.mock('@/zustand/auth', () => ({
    useAuthStore: jest.fn(),
}));
jest.mock('@/zustand/alert', () => ({
    __esModule: true,
    default: jest.fn(),
}));
jest.mock('@/hooks/useDebounce', () => ({
    useDebounce: (value: any) => value,
}));
// Mock apiClient if needed, but VM uses store actions mostly.
jest.mock('@/utils/apiClient', () => ({
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
}));

describe('useProductsViewModel', () => {
    const mockGetAllProducts = jest.fn();
    const mockGetAllBrands = jest.fn();
    const mockAlert = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();

        (useProductsStore as unknown as jest.Mock).mockReturnValue({
            getAllProducts: mockGetAllProducts,
            totalProducts: 10,
            products: [],
            toggleStateProduct: jest.fn(),
            exportProducts: jest.fn(),
            importProducts: jest.fn(),
            deleteProduct: jest.fn(),
            deleteAllProducts: jest.fn(),
            setProductImage: jest.fn(),
        });

        (useBrandsStore as unknown as jest.Mock).mockReturnValue({
            brands: [],
            getAllBrands: mockGetAllBrands,
        });

        (useAuthStore as unknown as jest.Mock).mockReturnValue({
            auth: { empresaId: 1, empresa: { rubro: { nombre: 'General' } } },
        });

        (useAlertStore as unknown as jest.Mock).mockReturnValue({
            success: false,
            loading: false,
            alert: mockAlert,
        });

        // Mock getState for non-hook usage
        (useAlertStore as any).getState = () => ({ alert: mockAlert });
    });

    it('should initialize with default state', () => {
        const { result } = renderHook(() => useProductsViewModel());

        expect(result.current.currentPage).toBe(1);
        expect(result.current.itemsPerPage).toBe(50);
        expect(result.current.searchClient).toBe('');
        expect(result.current.isOpenModal).toBe(false);
    });

    it('should fetch products on mount', () => {
        renderHook(() => useProductsViewModel());
        expect(mockGetAllProducts).toHaveBeenCalledWith(expect.objectContaining({
            page: 1,
            limit: 50,
            search: '',
        }));
    });

    it('should update search and fetch products', async () => {
        const { result } = renderHook(() => useProductsViewModel());

        act(() => {
            result.current.actions.setSearchClient({ target: { value: 'test' } });
        });

        expect(result.current.searchClient).toBe('test');
        // Debounce is mocked to return immediately, so it should trigger effect
        expect(mockGetAllProducts).toHaveBeenLastCalledWith(expect.objectContaining({
            search: 'test',
        }));
    });

    it('should handle pagination', () => {
        const { result } = renderHook(() => useProductsViewModel());

        act(() => {
            result.current.actions.setcurrentPage(2);
        });

        expect(result.current.currentPage).toBe(2);
        expect(mockGetAllProducts).toHaveBeenLastCalledWith(expect.objectContaining({
            page: 2,
        }));
    });

    it('should open modal for new product', () => {
        const { result } = renderHook(() => useProductsViewModel());

        act(() => {
            result.current.actions.setIsOpenModal(true);
        });

        expect(result.current.isOpenModal).toBe(true);
    });

    it('should load product data for editing', async () => {
        const mockProduct = { id: 123, descripcion: 'Test Product', precioUnitario: '10.00' };
        (useProductsStore as unknown as jest.Mock).mockReturnValue({
            getAllProducts: mockGetAllProducts,
            products: [mockProduct],
        });

        const { result } = renderHook(() => useProductsViewModel());

        await act(async () => {
            await result.current.actions.handleGetProduct({ productoId: 123 });
        });

        expect(result.current.isOpenModal).toBe(true);
        expect(result.current.isEdit).toBe(true);
        expect(result.current.formValues.descripcion).toBe('Test Product');
    });
});
