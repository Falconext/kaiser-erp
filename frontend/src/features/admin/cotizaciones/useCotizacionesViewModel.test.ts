import { renderHook, act } from "@testing-library/react";


// Mock document for Node environment
global.document = {
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
} as any;
import { useCotizacionesViewModel } from "./useCotizacionesViewModel";
import { useInvoiceStore } from "@/zustand/invoices";
import { useAuthStore } from "@/zustand/auth";
import { usePaymentFlow } from "@/hooks/usePaymentFlow";
import moment from "moment";
import { BrowserRouter } from "react-router-dom";

// Mocking dependencies
jest.mock("react-router-dom", () => ({
    ...jest.requireActual("react-router-dom"),
    useNavigate: () => jest.fn(),
}));

jest.mock("@/zustand/invoices", () => ({
    useInvoiceStore: jest.fn(),
}));

jest.mock("@/zustand/alert", () => ({
    default: () => ({ success: false }),
}));

jest.mock("@/zustand/auth", () => ({
    useAuthStore: jest.fn(),
}));

jest.mock("@/hooks/usePaymentFlow", () => ({
    usePaymentFlow: jest.fn(),
}));

// Provide a default implementation for QRCode
jest.mock("qrcode", () => ({
    default: {
        toDataURL: jest.fn().mockResolvedValue("mocked-qr-code-url"),
    },
}));

describe("useCotizacionesViewModel", () => {
    const mockGetAllInvoices = jest.fn();
    const mockGetInvoice = jest.fn();
    const mockResetInvoice = jest.fn();
    const mockCancelInvoice = jest.fn();
    const mockCompletePay = jest.fn();
    const mockAuthData = { user: { id: 1, name: "Admin" } };

    const mockPaymentFlow = {
        initiatePayment: jest.fn(),
        processPayment: jest.fn(),
        closeReceipt: jest.fn(),
        reset: jest.fn(),
        isLoading: false,
        payment: null,
        showReceipt: false,
        receiptData: null,
        error: null,
    };

    beforeEach(() => {
        jest.clearAllMocks();

        (useAuthStore as unknown as any).mockReturnValue({
            auth: mockAuthData,
        });

        (useInvoiceStore as unknown as any).mockReturnValue({
            getAllInvoices: mockGetAllInvoices,
            getInvoice: mockGetInvoice,
            resetInvoice: mockResetInvoice,
            cancelInvoice: mockCancelInvoice,
            completePay: mockCompletePay,
            totalInvoices: 10,
            invoices: [{ id: 1, comprobante: 'COTIZACION', mtoImpVenta: 100 }],
            invoice: null,
        });

        (usePaymentFlow as unknown as any).mockReturnValue(mockPaymentFlow);
    });

    it("should initialize with default states", () => {
        const { result } = renderHook(() => useCotizacionesViewModel(), {
            wrapper: BrowserRouter,
        });

        expect(result.current.currentPage).toBe(1);
        expect(result.current.itemsPerPage).toBe(50);
        expect(result.current.paymentMethod).toBe("Efectivo");
        expect(result.current.printSize).toBe("A4");
        expect(result.current.totalInvoices).toBe(10);
        expect(result.current.invoices.length).toBe(1);

        // Check initial fetching was called
        expect(mockGetAllInvoices).toHaveBeenCalled();
    });

    it("should update dates via handleDate", () => {
        const { result } = renderHook(() => useCotizacionesViewModel(), {
            wrapper: BrowserRouter,
        });

        const testDate = "15/05/2026";
        const expectedFormat = "2026-05-15";

        act(() => {
            result.current.handleDate(testDate, "fechaInicio");
        });
        expect(result.current.fechaInicio).toBe(expectedFormat);

        act(() => {
            result.current.handleDate("20/05/2026", "fechaFin");
        });
        expect(result.current.fechaFin).toBe("2026-05-20");
    });

    it("should trigger prepare to print via handleGetReceipt", async () => {
        const { result } = renderHook(() => useCotizacionesViewModel(), {
            wrapper: BrowserRouter,
        });

        await act(async () => {
            await result.current.handleGetReceipt({ id: 1, comprobante: 'COTIZACION 001' });
        });

        expect(result.current.comprobante).toBe('COTIZACION 001');
        expect(mockGetInvoice).toHaveBeenCalledWith(1);
    });

    it("should invoke cancelInvoice when confirmCancelInvoice is called", () => {
        const { result } = renderHook(() => useCotizacionesViewModel(), {
            wrapper: BrowserRouter,
        });

        act(() => {
            // simulate modal open to set formValues (although not strictly required in test if we don't mock the row click)
            // We will directly call confirm
            result.current.confirmCancelInvoice();
        });

        expect(mockCancelInvoice).toHaveBeenCalled();
        expect(result.current.isOpenModalConfirm).toBe(false);
    });

});
