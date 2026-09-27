import { renderHook, act } from '@testing-library/react';
import { useProductsViewModel } from '../useProductsViewModel';
import { useProductsStore } from '@/zustand/products';
import { useBrandsStore } from '@/zustand/brands';
import { useAuthStore } from '@/zustand/auth';
import useAlertStore from '@/zustand/alert';
import { get } from '@/utils/fetch';

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
jest.mock('@/zustand/sedes', () => ({
    useSedesStore: jest.fn(() => ({ sedes: [], listarSedes: jest.fn() })),
}));
// `apiClient` es una instancia de axios exportada por defecto.
jest.mock('@/utils/apiClient', () => ({
    __esModule: true,
    default: { get: jest.fn(), post: jest.fn(), put: jest.fn(), delete: jest.fn() },
}));
// El ViewModel ya no pide los productos por el store: los trae él mismo con
// `get('productos?...')` y los guarda en estado local. Los tests comprueban esa
// llamada, que es el contrato real con el backend.
jest.mock('@/utils/fetch', () => ({
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    patch: jest.fn(),
    del: jest.fn(),
}));

describe('useProductsViewModel', () => {
    const mockGetAllProducts = jest.fn();
    const mockGetAllBrands = jest.fn();
    const mockAlert = jest.fn();

    const mockGet = get as unknown as jest.Mock;
    const respuestaCon = (productos: any[]) => ({
        code: 1,
        data: { productos, total: productos.length },
    });

    beforeEach(() => {
        jest.clearAllMocks();
        mockGet.mockResolvedValue(respuestaCon([]));

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

    it('should fetch products on mount', async () => {
        await act(async () => { renderHook(() => useProductsViewModel()); });
        expect(mockGet).toHaveBeenCalledWith(expect.stringContaining('productos?'));
        const url = mockGet.mock.calls.at(-1)![0] as string;
        expect(url).toContain('page=1');
        expect(url).toContain('limit=50');
        expect(url).toContain('search=');
    });

    it('should update search and fetch products', async () => {
        const { result } = renderHook(() => useProductsViewModel());

        await act(async () => {
            result.current.actions.setSearchClient({ target: { value: 'test' } });
        });

        expect(result.current.searchClient).toBe('test');
        // useDebounce está mockeado para devolver el valor al instante.
        expect(mockGet.mock.calls.at(-1)![0]).toContain('search=test');
    });

    it('should handle pagination', async () => {
        const { result } = renderHook(() => useProductsViewModel());

        await act(async () => {
            result.current.actions.setcurrentPage(2);
        });

        expect(result.current.currentPage).toBe(2);
        expect(mockGet.mock.calls.at(-1)![0]).toContain('page=2');
    });

    it('should open modal for new product', () => {
        const { result } = renderHook(() => useProductsViewModel());

        act(() => {
            result.current.actions.setIsOpenModal(true);
        });

        expect(result.current.isOpenModal).toBe(true);
    });

    it('should load product data for editing', async () => {
        // El producto a editar tiene que venir del listado que el ViewModel
        // carga de la API, no de un store.
        const mockProduct = { id: 123, descripcion: 'Test Product', precioUnitario: '10.00' };
        mockGet.mockResolvedValue(respuestaCon([mockProduct]));

        const { result } = renderHook(() => useProductsViewModel());
        await act(async () => { await Promise.resolve(); });

        await act(async () => {
            await result.current.actions.handleGetProduct({ productoId: 123 });
        });

        expect(result.current.isOpenModal).toBe(true);
        expect(result.current.isEdit).toBe(true);
        expect(result.current.formValues.descripcion).toBe('Test Product');
    });
});
