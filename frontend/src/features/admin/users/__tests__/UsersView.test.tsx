import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import UsersView from '../UsersView';
import { useUsersViewModel } from '../useUsersViewModel';

// Mock dependencies
jest.mock('../useUsersViewModel', () => ({
    useUsersViewModel: jest.fn(),
}));

jest.mock('../../../../pages/admin/usuarios/ModalUsuario', () => () => <div data-testid="modal-usuario">ModalUsuario</div>);
jest.mock('@/components/ModalConfirm', () => () => <div data-testid="modal-confirm">ModalConfirm</div>);
jest.mock('@/components/Datatable', () => ({
    __esModule: true,
    default: ({ bodyData, actions }: any) => (
        <table>
            <tbody>
                {bodyData.map((row: any) => (
                    <tr key={row.id}>
                        <td>{row.nombre}</td>
                        {actions && actions.map((action: any, idx: number) => (
                            <td key={idx}>
                                <button onClick={() => action.onClick({ _original: row._original })}>Action</button>
                            </td>
                        ))}
                    </tr>
                ))}
            </tbody>
        </table>
    )
}));

describe('UsersView', () => {
    const mockHandleCreateUser = jest.fn();
    const mockHandleEditUser = jest.fn();
    const mockHandleToggleState = jest.fn();
    const mockGetPermisosData = jest.fn().mockReturnValue({ type: 'none', label: 'Sin permisos' });

    const defaultMockReturn = {
        usuarios: [],
        totalUsuarios: 0,
        loading: false,
        currentPage: 1,
        itemsPerPage: 50,
        searchTerm: '',
        showUserModal: false,
        showConfirmModal: false,
        selectedUser: null,
        isEdit: false,
        handleCreateUser: mockHandleCreateUser,
        handleEditUser: mockHandleEditUser,
        handleToggleState: mockHandleToggleState,
        confirmToggleState: jest.fn(),
        handleCloseUserModal: jest.fn(),
        handleCloseConfirmModal: jest.fn(),
        handleSearchChange: jest.fn(),
        handlePageChange: jest.fn(),
        handleItemsPerPageChange: jest.fn(),
        getPermisosData: mockGetPermisosData, // Add mocked helper
    };

    beforeEach(() => {
        jest.clearAllMocks();
        (useUsersViewModel as jest.Mock).mockReturnValue(defaultMockReturn);
    });

    it('should render header and create button', () => {
        render(<UsersView />);
        expect(screen.getByText('Gestión de Usuarios')).toBeInTheDocument();
        expect(screen.getByText('Nuevo Usuario')).toBeInTheDocument();
    });

    it('should call handleCreateUser when new user button is clicked', () => {
        render(<UsersView />);
        fireEvent.click(screen.getByText('Nuevo Usuario'));
        expect(mockHandleCreateUser).toHaveBeenCalled();
    });

    it('should render data table when users exist', () => {
        (useUsersViewModel as jest.Mock).mockReturnValue({
            ...defaultMockReturn,
            usuarios: [
                { id: 1, nombre: 'User 1', estado: 'ACTIVO' },
                { id: 2, nombre: 'User 2', estado: 'INACTIVO' },
            ],
            totalUsuarios: 2,
        });

        render(<UsersView />);
        expect(screen.getByText('User 1')).toBeInTheDocument();
        expect(screen.getByText('User 2')).toBeInTheDocument();
    });

    it('should show user modal when showUserModal is true', () => {
        (useUsersViewModel as jest.Mock).mockReturnValue({
            ...defaultMockReturn,
            showUserModal: true,
        });

        render(<UsersView />);
        expect(screen.getByTestId('modal-usuario')).toBeInTheDocument();
    });
});
