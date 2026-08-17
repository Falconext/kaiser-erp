import { useState, useEffect } from 'react';
import { useDebounce } from '@/hooks/useDebounce';
import { useUsersStore } from '@/zustand/users';
import { IUsuario, IUsersViewModelState } from './UsersModel';
import { MODULOS_SISTEMA } from '@/zustand/users';
import { useAuthStore } from '@/zustand/auth';
import useAlertStore from '@/zustand/alert';

export const useUsersViewModel = () => {
    const {
        usuarios,
        totalUsuarios,
        loading,
        getAllUsers,
        toggleUserState,
    } = useUsersStore();
    const { auth } = useAuthStore();
    const { alert } = useAlertStore();

    // Límite de usuarios del plan de la empresa (0/undefined = ilimitado)
    const limiteUsuarios = auth?.empresa?.plan?.limiteUsuarios ?? 0;
    const limiteAlcanzado = limiteUsuarios > 0 && totalUsuarios >= limiteUsuarios;

    const [state, setState] = useState<IUsersViewModelState>({
        currentPage: 1,
        itemsPerPage: 50,
        searchTerm: '',
        showUserModal: false,
        showConfirmModal: false,
        selectedUser: null,
        isEdit: false,
    });

    const debouncedSearchTerm = useDebounce(state.searchTerm, 1000);

    useEffect(() => {
        getAllUsers({
            page: state.currentPage,
            limit: state.itemsPerPage,
            search: debouncedSearchTerm || undefined,
        });
    }, [state.currentPage, state.itemsPerPage, debouncedSearchTerm, getAllUsers]);

    const handleCreateUser = () => {
        if (limiteAlcanzado) {
            alert(
                `Has alcanzado el máximo de usuarios de tu plan (${limiteUsuarios}). No puedes crear más usuarios; mejora tu plan para ampliar el límite.`,
                'warning',
            );
            return;
        }
        setState(prev => ({
            ...prev,
            selectedUser: null,
            isEdit: false,
            showUserModal: true
        }));
    };

    const handleEditUser = (user: IUsuario) => {
        setState(prev => ({
            ...prev,
            selectedUser: user,
            isEdit: true,
            showUserModal: true
        }));
    };

    const handleToggleState = (user: IUsuario) => {
        setState(prev => ({
            ...prev,
            selectedUser: user,
            showConfirmModal: true
        }));
    };

    const confirmToggleState = async () => {
        if (state.selectedUser) {
            await toggleUserState(state.selectedUser.id);
            setState(prev => ({
                ...prev,
                showConfirmModal: false,
                selectedUser: null
            }));
        }
    };

    const handleCloseUserModal = () => {
        setState(prev => ({ ...prev, showUserModal: false }));
    };

    const handleCloseConfirmModal = () => {
        setState(prev => ({ ...prev, showConfirmModal: false }));
    };

    const handleSearchChange = (value: string) => {
        setState(prev => ({ ...prev, searchTerm: value }));
    };

    const handlePageChange = (page: number) => {
        setState(prev => ({ ...prev, currentPage: page }));
    };

    const handleItemsPerPageChange = (items: number) => {
        setState(prev => ({ ...prev, itemsPerPage: items }));
    };

    // Helper functions for View
    const getEstadoBadge = (estado: string) => {
        // Logic moved to View or kept as pure helper, but ensuring VM provides data
        return estado;
    };

    const getRolBadge = (rol: string) => {
        return rol;
    };

    const getPermisosData = (permisos: string[] = [], rol?: string) => {
        if (rol === 'ADMIN_EMPRESA') return { type: 'full', label: 'Acceso completo' };
        if (!permisos || permisos.length === 0) return { type: 'none', label: 'Sin permisos' };
        if (permisos.includes('*')) return { type: 'full', label: 'Acceso completo' };

        const count = permisos.length;
        const tooltip = permisos.map(permiso => {
            const modulo = MODULOS_SISTEMA.find(m => m.id === permiso);
            return modulo ? modulo.nombre : permiso;
        }).join(', ');

        return { type: 'partial', count, label: `${count} módulo${count !== 1 ? 's' : ''}`, tooltip };
    };

    return {
        // State
        usuarios,
        totalUsuarios,
        limiteUsuarios,
        limiteAlcanzado,
        loading,
        currentPage: state.currentPage,
        itemsPerPage: state.itemsPerPage,
        searchTerm: state.searchTerm,
        showUserModal: state.showUserModal,
        showConfirmModal: state.showConfirmModal,
        selectedUser: state.selectedUser,
        isEdit: state.isEdit,

        // Actions
        handleCreateUser,
        handleEditUser,
        handleToggleState,
        confirmToggleState,
        handleCloseUserModal,
        handleCloseConfirmModal,
        handleSearchChange,
        handlePageChange,
        handleItemsPerPageChange,

        // Helpers
        getPermisosData
    };
};
