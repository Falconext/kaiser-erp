import { IFormClient } from '@/interfaces/clients';
import { ICompra } from '@/zustand/compras';

// --- Compras Index Model ---

export interface IComprasFilters {
    search: string;
    fechaInicio: string;
    fechaFin: string;
    estadoPago: string;
    sedeId?: number | null;
}

export interface IComprasViewModelState {
    currentPage: number;
    itemsPerPage: number;
    filters: IComprasFilters;
    // Modals
    isOpenDetalle: boolean;
    selectedCompraId: number | null;
    selectedCompra: ICompra | null;
    showPaymentModal: boolean;
    showHistorialModal: boolean;
    showNuevaCompraModal: boolean;
    // Editar / Anular
    showEditarModal: boolean;
    compraEditar: ICompra | null;
    showAnularConfirm: boolean;
    compraAnular: ICompra | null;
}

export const INITIAL_COMPRAS_STATE: IComprasViewModelState = {
    currentPage: 1,
    itemsPerPage: 50,
    filters: {
        search: '',
        fechaInicio: '',
        fechaFin: '',
        estadoPago: 'TODOS',
        sedeId: null,
    },
    isOpenDetalle: false,
    selectedCompraId: null,
    selectedCompra: null,
    showPaymentModal: false,
    showHistorialModal: false,
    showNuevaCompraModal: false,
    showEditarModal: false,
    compraEditar: null,
    showAnularConfirm: false,
    compraAnular: null,
};

export const VISIBLE_COMPRAS_COLUMNS = [
    'Fecha', 'Comprobante', 'Proveedor', 'Total', 'Saldo', 'Días Venc.', 'Pago',
];

export const ESTADO_PAGO_OPTIONS = [
    { value: 'TODOS', label: 'Todos' },
    { value: 'PENDIENTE_PAGO', label: 'Pendiente' },
    { value: 'PAGO_PARCIAL', label: 'Pago Parcial' },
    { value: 'COMPLETADO', label: 'Pagado' },
];

// --- Proveedores Model ---

export const INITIAL_PROVEEDOR_FORM: IFormClient = {
    id: 0,
    nombre: '',
    nroDoc: '',
    direccion: '',
    departamento: '',
    distrito: '',
    provincia: '',
    persona: 'PROVEEDOR',
    ubigeo: '',
    email: '',
    telefono: '',
    tipoDoc: 'RUC',
    estado: '',
    tipoDocumentoId: 0,
    empresaId: 0,
    tipoDocumento: { codigo: '', descripcion: '', id: 0 },
};

export const INITIAL_PROVEEDOR_ERRORS = {
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

export const VISIBLE_PROVEEDOR_COLUMNS = [
    'Razón Social / Nombre', 'Documento', 'Nro. Doc', 'Celular', 'Dirección', 'Estado', 'Acciones',
];

export interface IProveedoresViewModelState {
    currentPage: number;
    itemsPerPage: number;
    searchClient: string;
    isOpenModal: boolean;
    isOpenModalConfirm: boolean;
    formValues: IFormClient;
    isEdit: boolean;
    errors: typeof INITIAL_PROVEEDOR_ERRORS;
    openAccionesId: number | null;
    anchorEl: HTMLElement | null;
}
