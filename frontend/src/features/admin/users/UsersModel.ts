import { IUsuario } from "../../../zustand/users";

export type { IUsuario };

export interface IUsersViewModelState {
    currentPage: number;
    itemsPerPage: number;
    searchTerm: string;
    showUserModal: boolean;
    showConfirmModal: boolean;
    selectedUser: IUsuario | null;
    isEdit: boolean;
}
