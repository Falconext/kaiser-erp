import { renderHook, act } from '@testing-library/react';
import { useComprasViewModel } from '../useComprasViewModel';
import { useComprasStore } from '@/zustand/compras';

jest.mock('@/zustand/compras', () => ({
    useComprasStore: jest.fn(),
}));

const mockListarCompras = jest.fn();
const mockCompras = [
    {
        id: 1,
        fechaEmision: '2026-01-15',
        fechaVencimiento: '2026-01-30',
        proveedor: { nombre: 'Proveedor SAC', nroDoc: '20123456789' },
        serie: 'F001',
        numero: '000001',
        total: 1000,
        saldo: 500,
        estado: 'REGISTRADO',
        estadoPago: 'PAGO_PARCIAL',
    },
    {
        id: 2,
        fechaEmision: '2026-01-20',
        proveedor: { nombre: 'Distribuidor EIRL', nroDoc: '10987654321' },
        serie: 'F001',
        numero: '000002',
        total: 2000,
        saldo: 0,
        estado: 'REGISTRADO',
        estadoPago: 'COMPLETADO',
    },
];

const mockComprasConSaldoNegativo = [
    {
        id: 3,
        fechaEmision: '2026-06-03',
        proveedor: { nombre: 'Proveedor Test', nroDoc: '20999999999' },
        serie: 'F001',
        numero: '1111',
        total: 330.00,
        saldo: -0.00,
        estado: 'REGISTRADO',
        estadoPago: 'COMPLETADO',
    },
    {
        id: 4,
        fechaEmision: '2026-06-13',
        proveedor: { nombre: 'Proveedor Test', nroDoc: '20999999999' },
        serie: 'F001',
        numero: '0005',
        total: 445.00,
        saldo: -0.01,
        estado: 'REGISTRADO',
        estadoPago: 'COMPLETADO',
    },
];

describe('useComprasViewModel', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (useComprasStore as unknown as jest.Mock).mockReturnValue({
            listarCompras: mockListarCompras,
            compras: mockCompras,
            totalCompras: 2,
        });
    });

    it('should initialize with default state', () => {
        const { result } = renderHook(() => useComprasViewModel());
        expect(result.current.currentPage).toBe(1);
        expect(result.current.itemsPerPage).toBe(50);
        expect(result.current.filters.estadoPago).toBe('TODOS');
        expect(result.current.filters.search).toBe('');
        expect(result.current.isOpenDetalle).toBe(false);
        expect(result.current.showNuevaCompraModal).toBe(false);
    });

    it('should build tableData with correct formatting', () => {
        const { result } = renderHook(() => useComprasViewModel());
        const table = result.current.tableData;
        expect(table).toHaveLength(2);
        expect(table![0]['Comprobante']).toBe('F001-000001');
        expect(table![0]['Total']).toBe('S/ 1000.00');
        expect(table![0]['Pago']).toBe('PAGO PARCIAL');
        expect(table![1]['Pago']).toBe('PAGADO');
    });

    it('should calculate stats correctly', () => {
        const { result } = renderHook(() => useComprasViewModel());
        // totalPorPagar = 500 + 0 = 500
        expect(result.current.totalPorPagar).toBe(500);
    });

    // ─── Bug fix: saldo negativo por redondeo de punto flotante ───────────────

    describe('negative saldo clamping (float rounding bug)', () => {
        beforeEach(() => {
            (useComprasStore as unknown as jest.Mock).mockReturnValue({
                listarCompras: mockListarCompras,
                compras: mockComprasConSaldoNegativo,
                totalCompras: 2,
            });
        });

        it('should clamp saldo -0.00 to S/ 0.00 in table display', () => {
            const { result } = renderHook(() => useComprasViewModel());
            const table = result.current.tableData;
            expect(table![0]['Saldo']).toBe('S/ 0.00');
        });

        it('should clamp saldo -0.01 to S/ 0.00 in table display', () => {
            const { result } = renderHook(() => useComprasViewModel());
            const table = result.current.tableData;
            expect(table![1]['Saldo']).toBe('S/ 0.00');
        });

        it('should not include negative saldo in totalPorPagar stat', () => {
            const { result } = renderHook(() => useComprasViewModel());
            // Both compras have negative saldo → total should be 0, not negative
            expect(result.current.totalPorPagar).toBe(0);
        });

        it('should never show negative totalPorPagar even with mixed data', () => {
            const mixed = [
                ...mockComprasConSaldoNegativo,
                { ...mockCompras[0], saldo: 200 },
            ];
            (useComprasStore as unknown as jest.Mock).mockReturnValue({
                listarCompras: mockListarCompras,
                compras: mixed,
                totalCompras: 3,
            });
            const { result } = renderHook(() => useComprasViewModel());
            expect(result.current.totalPorPagar).toBe(200);
        });
    });

    // ─── Modals ───────────────────────────────────────────────────────────────

    it('should open and close detalle modal', () => {
        const { result } = renderHook(() => useComprasViewModel());
        act(() => { result.current.actions.openDetalle(1); });
        expect(result.current.isOpenDetalle).toBe(true);
        expect(result.current.selectedCompraId).toBe(1);
        act(() => { result.current.actions.closeDetalle(); });
        expect(result.current.isOpenDetalle).toBe(false);
        expect(result.current.selectedCompraId).toBeNull();
    });

    it('should open and close nueva compra modal', () => {
        const { result } = renderHook(() => useComprasViewModel());
        act(() => { result.current.actions.openNuevaCompra(); });
        expect(result.current.showNuevaCompraModal).toBe(true);
        act(() => { result.current.actions.closeNuevaCompra(); });
        expect(result.current.showNuevaCompraModal).toBe(false);
    });

    it('should update search filter', () => {
        const { result } = renderHook(() => useComprasViewModel());
        act(() => { result.current.actions.setSearch('Proveedor'); });
        expect(result.current.filters.search).toBe('Proveedor');
        expect(result.current.currentPage).toBe(1);
    });

    it('should update estadoPago filter', () => {
        const { result } = renderHook(() => useComprasViewModel());
        act(() => { result.current.actions.setEstadoPago('PENDIENTE_PAGO'); });
        expect(result.current.filters.estadoPago).toBe('PENDIENTE_PAGO');
    });

    it('should handle pago modal lifecycle', () => {
        const { result } = renderHook(() => useComprasViewModel());
        const compra = mockCompras[0] as any;
        act(() => { result.current.actions.openPago(compra); });
        expect(result.current.showPaymentModal).toBe(true);
        expect(result.current.selectedCompra).toEqual(compra);
        act(() => { result.current.actions.closePago(); });
        expect(result.current.showPaymentModal).toBe(false);
        expect(result.current.selectedCompra).toBeNull();
    });

    it('should update pagination', () => {
        const { result } = renderHook(() => useComprasViewModel());
        act(() => { result.current.actions.setcurrentPage(2); });
        expect(result.current.currentPage).toBe(2);
        act(() => { result.current.actions.setitemsPerPage(25); });
        expect(result.current.itemsPerPage).toBe(25);
    });

    // ─── Saldo display edge cases ─────────────────────────────────────────────

    it('should display saldo 0.00 for completed payments', () => {
        const { result } = renderHook(() => useComprasViewModel());
        const table = result.current.tableData;
        expect(table![1]['Saldo']).toBe('S/ 0.00');
    });

    it('should display correct saldo for partial payments', () => {
        const { result } = renderHook(() => useComprasViewModel());
        const table = result.current.tableData;
        expect(table![0]['Saldo']).toBe('S/ 500.00');
    });

    it('should handle null/undefined saldo gracefully', () => {
        const withNullSaldo = [{ ...mockCompras[0], saldo: null }];
        (useComprasStore as unknown as jest.Mock).mockReturnValue({
            listarCompras: mockListarCompras,
            compras: withNullSaldo,
            totalCompras: 1,
        });
        const { result } = renderHook(() => useComprasViewModel());
        expect(result.current.tableData![0]['Saldo']).toBe('S/ 0.00');
        expect(result.current.totalPorPagar).toBe(0);
    });
});
