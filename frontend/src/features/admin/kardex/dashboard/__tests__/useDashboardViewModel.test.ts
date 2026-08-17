import { renderHook, act, waitFor } from '@testing-library/react';
import { useDashboardViewModel } from '../useDashboardViewModel';
import apiClient from '@/utils/apiClient';

// Mock apiClient
jest.mock('@/utils/apiClient', () => ({
    get: jest.fn(),
}));

describe('useDashboardViewModel', () => {
    const mockDashboardData = {
        resumenGeneral: {
            totalProductos: 100,
            valorTotalInventario: 5000,
            productosStockCritico: 5,
            productosStockCero: 2,
        },
        estadisticas: {
            totalProductos: 100,
            valorTotalInventario: 5000,
            productosStockCritico: 5,
            productosStockCero: 2,
        },
        movimientosRecientes: [],
        alertas: {
            stockCritico: 5,
            productosObsoletos: 0,
            valorInmovilizado: 0,
        },
        topProductos: {
            stockCritico: [],
            obsoletos: [],
        },
        fechaActualizacion: new Date(),
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should initialize with loading state', async () => {
        (apiClient.get as jest.Mock).mockResolvedValue({ data: mockDashboardData });
        const { result } = renderHook(() => useDashboardViewModel());

        expect(result.current.loading).toBe(true);

        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });
    });

    it('should fetch and set dashboard data on mount', async () => {
        (apiClient.get as jest.Mock).mockResolvedValue({ data: { data: mockDashboardData } });

        const { result } = renderHook(() => useDashboardViewModel());

        await waitFor(() => {
            expect(result.current.dashboardData).toEqual(mockDashboardData);
            expect(result.current.loading).toBe(false);
        });

        // Check charts logic
        expect(result.current.charts.barData).toHaveLength(3);
        expect(result.current.charts.barData[0].cantidad).toBe(93); // 100 - 5 - 2
    });

    it('should handle fetch errors', async () => {
        (apiClient.get as jest.Mock).mockRejectedValue({
            response: { data: { message: 'Error fetching' } }
        });

        const { result } = renderHook(() => useDashboardViewModel());

        await waitFor(() => {
            expect(result.current.error).toBe('Error fetching');
            expect(result.current.loading).toBe(false);
        });
    });

    it('should format currency correctly', () => {
        const { result } = renderHook(() => useDashboardViewModel());
        // Note: Intl formatting might depend on environment, but simple check
        const formatted = result.current.helpers.formatCurrency(100);
        expect(formatted).toContain('100');
    });
});
