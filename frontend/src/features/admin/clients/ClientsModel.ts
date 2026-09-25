import { IFormClient } from '@/interfaces/clients';

export const ALL_COLUMNS = [
    'Nombre o Razon social',
    'Documento',
    'Num. doc',
    'Direccion',
    'Correo principal',
    'Persona',
    'Celular',
    'Sector',
    'Contacto',
    'Estado',
    'Acciones',
];

/** Columnas añadidas después del lanzamiento: se fuerzan visibles aunque el
 *  usuario tenga preferencias guardadas en localStorage (no hay UI para
 *  activarlas manualmente). */
export const NEW_COLUMNS = ['Sector', 'Contacto'];

/** Sector económico del cliente (Kaiser vende a agroexportadoras, avícolas, mineras...). */
export const SECTOR_OPTIONS: { id: string; value: string }[] = [
    { id: 'AGROEXPORTACION', value: 'Agroexportación' },
    { id: 'AVICOLA', value: 'Avícola' },
    { id: 'PECUARIO', value: 'Pecuario' },
    { id: 'MINERIA', value: 'Minería' },
    { id: 'CONSTRUCCION', value: 'Construcción' },
    { id: 'INDUSTRIA', value: 'Industria' },
    { id: 'COMERCIO', value: 'Comercio' },
    { id: 'OTRO', value: 'Otro' },
];

export const sectorLabel = (sector?: string | null): string =>
    SECTOR_OPTIONS.find((s) => s.id === sector)?.value ?? '';

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
    sector: '',
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
