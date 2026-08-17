import { renderHook, act } from '@testing-library/react';
import { useClientsViewModel } from '../useClientsViewModel';
import { useClientsStore } from '@/zustand/clients';
import { useAuthStore } from '@/zustand/auth';
import useAlertStore from '@/zustand/alert';

jest.mock('@/zustand/clients', () => ({
    useClientsStore: jest.fn(),
}));
jest.mock('@/zustand/auth', () => ({
    useAuthStore: jest.fn(),
}));
jest.mock('@/zustand/alert', () => ({
    __esModule: true,
    default: jest.fn(() => ({ success: false, alert: jest.fn() })),
}));
jest.mock('@/utils/apiClient', () => ({
    get: jest.fn().mockResolvedValue({ data: null }),
    put: jest.fn().mockResolvedValue({}),
}));

const mockGetAllClients = jest.fn();
const mockToggleStateClient = jest.fn();
const mockExportClients = jest.fn();
const mockImportClients = jest.fn();

const mockStoreState = {
    clients: [
        { id: 1, nombre: 'Juan Perez', nroDoc: '12345678', direccion: 'Av. Lima', email: 'juan@test.com', persona: 'CLIENTE', telefono: '987654321', estado: 'ACTIVO', tipoDocumentoId: 1, empresaId: 1, tipoDocumento: { id: 1, codigo: 'DNI', descripcion: 'DNI' } },
        { id: 2, nombre: 'Empresa SAC', nroDoc: '20123456789', direccion: 'Jr. Huallaga', email: 'empresa@test.com', persona: 'PROVEEDOR', telefono: '999888777', estado: 'ACTIVO', tipoDocumentoId: 2, empresaId: 1, tipoDocumento: { id: 2, codigo: 'RUC', descripcion: 'RUC' } },
    ],
    totalClients: 2,
    loading: false,
    getAllClients: mockGetAllClients,
    toggleStateClient: mockToggleStateClient,
    exportClients: mockExportClients,
    importClients: mockImportClients,
};

describe('useClientsViewModel', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (useClientsStore as unknown as jest.Mock).mockReturnValue(mockStoreState);
        (useAuthStore as unknown as jest.Mock).mockReturnValue({ auth: { empresaId: 1 }, success: false });
        (useAlertStore as unknown as jest.Mock).mockReturnValue({ success: false, alert: jest.fn() });
    });

    it('should initialize with default state', () => {
        const { result } = renderHook(() => useClientsViewModel());
        expect(result.current.currentPage).toBe(1);
        expect(result.current.itemsPerPage).toBe(50);
        expect(result.current.isOpenModal).toBe(false);
        expect(result.current.searchClient).toBe('');
    });

    it('should expose the clients from the store', () => {
        const { result } = renderHook(() => useClientsViewModel());
        expect(result.current.clients).toHaveLength(2);
        expect(result.current.totalClients).toBe(2);
    });

    it('should build clientsTable with correct columns', () => {
        const { result } = renderHook(() => useClientsViewModel());
        const table = result.current.clientsTable;
        expect(table).toHaveLength(2);
        expect(table[0]['Documento']).toBe('DNI');  // 8 digits
        expect(table[1]['Documento']).toBe('RUC');  // 11 digits
        expect(table[0]['Persona']).toBe('CLIENTE');
    });

    it('should open new modal with clean form', () => {
        const { result } = renderHook(() => useClientsViewModel());
        act(() => { result.current.actions.openNewModal(); });
        expect(result.current.isOpenModal).toBe(true);
        expect(result.current.isEdit).toBe(false);
        expect(result.current.formValues.nombre).toBe('');
    });

    it('should open edit modal with client data', () => {
        const { result } = renderHook(() => useClientsViewModel());
        const client = mockStoreState.clients[0];
        act(() => { result.current.actions.openEditModal(client as any); });
        expect(result.current.isOpenModal).toBe(true);
        expect(result.current.isEdit).toBe(true);
        expect(result.current.formValues.nombre).toBe('Juan Perez');
    });

    it('should close modal', () => {
        const { result } = renderHook(() => useClientsViewModel());
        act(() => { result.current.actions.openNewModal(); });
        act(() => { result.current.actions.closeModal(); });
        expect(result.current.isOpenModal).toBe(false);
        expect(result.current.isEdit).toBe(false);
    });

    it('should open confirm toggle modal', () => {
        const { result } = renderHook(() => useClientsViewModel());
        const client = mockStoreState.clients[0];
        act(() => { result.current.actions.openConfirmToggle(client as any); });
        expect(result.current.isOpenModalConfirm).toBe(true);
        expect(result.current.formValues.id).toBe(1);
    });

    it('should confirm toggle state', () => {
        const { result } = renderHook(() => useClientsViewModel());
        const client = mockStoreState.clients[0];
        act(() => { result.current.actions.openConfirmToggle(client as any); });
        act(() => { result.current.actions.confirmToggleState(); });
        expect(mockToggleStateClient).toHaveBeenCalledWith(1);
        expect(result.current.isOpenModalConfirm).toBe(false);
    });

    it('should handle search input change', () => {
        const { result } = renderHook(() => useClientsViewModel());
        act(() => {
            result.current.actions.handleSearchChange({ target: { value: 'Juan' } } as any);
        });
        expect(result.current.searchClient).toBe('Juan');
    });

    it('should update pagination', () => {
        const { result } = renderHook(() => useClientsViewModel());
        act(() => { result.current.actions.setcurrentPage(3); });
        expect(result.current.currentPage).toBe(3);
        act(() => { result.current.actions.setitemsPerPage(25); });
        expect(result.current.itemsPerPage).toBe(25);
    });
});
