import { renderHook, act, waitFor } from '@testing-library/react';
import { useUsersViewModel } from '../useUsersViewModel';
import { useUsersStore } from '@/zustand/users';

// Mock store
jest.mock('@/zustand/users', () => ({
    useUsersStore: jest.fn(),
    MODULOS_SISTEMA: [{ id: 'test-module', nombre: 'Test Module' }],
}));

// Mock debounce
jest.mock('@/hooks/useDebounce', () => ({
    useDebounce: (value: any, delay: number) => value,
}));

describe('useUsersViewModel', () => {
    const mockGetAllUsers = jest.fn();
    const mockToggleUserState = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
        (useUsersStore as unknown as jest.Mock).mockReturnValue({
            usuarios: [],
            totalUsuarios: 0,
            loading: false,
            getAllUsers: mockGetAllUsers,
            toggleUserState: mockToggleUserState,
        });
    });

    it('should fetch users on mount', () => {
        renderHook(() => useUsersViewModel());
        expect(mockGetAllUsers).toHaveBeenCalledWith({
            page: 1,
            limit: 50,
            search: undefined,
        });
    });

    it('should update search term and fetch users', () => {
        const { result } = renderHook(() => useUsersViewModel());

        act(() => {
            result.current.handleSearchChange('John');
        });

        expect(result.current.searchTerm).toBe('John');

        // Since we mocked debounce to be instant, it should call fetch immediately
        expect(mockGetAllUsers).toHaveBeenCalledWith({
            page: 1,
            limit: 50,
            search: 'John',
        });
    });

    it('should handle pagination changes', () => {
        const { result } = renderHook(() => useUsersViewModel());

        act(() => {
            result.current.handlePageChange(2);
        });

        expect(result.current.currentPage).toBe(2);
        expect(mockGetAllUsers).toHaveBeenCalledWith({
            page: 2,
            limit: 50,
            search: undefined,
        });
    });

    it('should open modal for creating user', () => {
        const { result } = renderHook(() => useUsersViewModel());

        act(() => {
            result.current.handleCreateUser();
        });

        expect(result.current.showUserModal).toBe(true);
        expect(result.current.isEdit).toBe(false);
        expect(result.current.selectedUser).toBeNull();
    });

    it('should open modal for editing user', () => {
        const { result } = renderHook(() => useUsersViewModel());
        const mockUser = { id: 1, nombre: 'Test' } as any;

        act(() => {
            result.current.handleEditUser(mockUser);
        });

        expect(result.current.showUserModal).toBe(true);
        expect(result.current.isEdit).toBe(true);
        expect(result.current.selectedUser).toBe(mockUser);
    });
});
