import { IFormClient } from '@/interfaces/clients';

export const ALL_COLUMNS = [
    'Nombre o Razon social',
    'Documento',
    'Num. doc',
    'Direccion',
    'Correo principal',
    'Persona',
    'Celular',
    'Estado',
    'Acciones',
];

export const INITIAL_FORM: IFormClient = {
    id: 0,
    nombre: '',
    nroDoc: '',
    direccion: '',
    departamento: '',
    distrito: '',
    provincia: '',
    persona: 'CLIENTE',
    ubigeo: '',
    email: '',
    telefono: '',
    tipoDoc: 'DNI',
    estado: '',
    tipoDocumentoId: 0,
    empresaId: 0,
    tipoDocumento: {
        codigo: '',
        descripcion: '',
        id: 0,
    },
};

export const INITIAL_ERRORS = {
    nombre: '',
    nroDoc: '',
    direccion: '',
    departamento: '',
    distrito: '',
    provincia: '',
    ubigeo: '',
    email: '',
    telefono: '',
    estado: '',
    tipoDocumentoId: 0,
    empresaId: 0,
};

export type GrupoFarmacia = 'pacientes' | 'empresas' | 'medicos';

export interface IClientsViewModelState {
    currentPage: number;
    itemsPerPage: number;
    isOpenModal: boolean;
    isOpenModalConfirm: boolean;
    searchClient: string;
    formValues: IFormClient;
    isEdit: boolean;
    errors: typeof INITIAL_ERRORS;
    openAccionesId: number | null;
    anchorEl: HTMLElement | null;
    visibleColumns: string[];
    showColumnFilter: boolean;
    isHoveredExp: boolean;
    isHoveredImp: boolean;
    grupoFarmacia: GrupoFarmacia;
}
