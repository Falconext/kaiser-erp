// --- Importaciones: tipos e interfaces compartidas ---

export interface IImportacionProveedor {
    id: number;
    nombre: string;
    nroDoc?: string;
    direccion?: string;
    email?: string;
}

export interface IImportacionProducto {
    id: number;
    codigo: string;
    descripcion: string;
    costoPromedio?: number | string | null;
    stock?: number | string | null;
}

export interface IImportacionItem {
    id: number;
    importacionId: number;
    productoId: number;
    descripcion: string;
    cantidad: number | string;
    unidad: string;
    precioFobUnitario: number | string;
    pesoKg?: number | string | null;
    volumenM3?: number | string | null;
    partidaArancelaria?: string | null;
    adValoremPorcentaje?: number | string | null;
    costoFobPen: number | string;
    gastosAsignados: number | string;
    costoTotalPen: number | string;
    costoUnitarioFinal: number | string;
    producto?: IImportacionProducto;
    // Solo presentes en la respuesta de /liquidar
    costoPromedioActual?: number;
    variacionPorcentaje?: number | null;
}

export type TipoGastoImportacion =
    | 'FLETE_INTERNACIONAL'
    | 'SEGURO'
    | 'AD_VALOREM'
    | 'IGV_IMPORTACION'
    | 'IPM'
    | 'ISC'
    | 'PERCEPCION'
    | 'AGENCIA_ADUANA'
    | 'ALMACEN_ADUANERO'
    | 'TRANSPORTE_INTERNO'
    | 'GASTOS_BANCARIOS'
    | 'OTROS';

export type BaseProrrateo = 'VALOR' | 'PESO' | 'VOLUMEN' | 'CANTIDAD';

export interface IImportacionGasto {
    id: number;
    importacionId: number;
    tipo: TipoGastoImportacion;
    descripcion?: string | null;
    proveedorNombre?: string | null;
    numeroDocumento?: string | null;
    fecha?: string | null;
    moneda: string;
    tipoCambio: number | string;
    monto: number | string;
    montoPen: number | string;
    afectaCosto: boolean;
    baseProrrateo: BaseProrrateo;
    creadoEn?: string;
}

export type EstadoImportacion =
    | 'BORRADOR'
    | 'EN_TRANSITO'
    | 'EN_ADUANA'
    | 'LIQUIDADA'
    | 'NACIONALIZADA'
    | 'ANULADA';

export interface IImportacion {
    id: number;
    empresaId: number;
    sedeId?: number | null;
    usuarioId?: number | null;
    proveedorId: number;
    numero: string;
    descripcion?: string | null;
    numeroFactura?: string | null;
    numeroDua?: string | null;
    incoterm: string;
    moneda: string;
    tipoCambio: number | string;
    fechaEmbarque?: string | null;
    fechaLlegada?: string | null;
    fechaNacionalizacion?: string | null;
    estado: EstadoImportacion;
    valorFob: number | string;
    valorFobPen: number | string;
    totalGastosCosto: number | string;
    totalGastosNoCosto: number | string;
    costoTotalNacionalizado: number | string;
    factorCosto: number | string;
    observaciones?: string | null;
    proveedor?: IImportacionProveedor;
    sede?: { id: number; nombre: string } | null;
    items?: IImportacionItem[];
    gastos?: IImportacionGasto[];
    _count?: { items: number; gastos: number };
}

export const ESTADO_IMPORTACION_LABEL: Record<EstadoImportacion, string> = {
    BORRADOR: 'Borrador',
    EN_TRANSITO: 'En tránsito',
    EN_ADUANA: 'En aduana',
    LIQUIDADA: 'Liquidada',
    NACIONALIZADA: 'Nacionalizada',
    ANULADA: 'Anulada',
};

export const ESTADO_IMPORTACION_STYLE: Record<EstadoImportacion, string> = {
    BORRADOR: 'bg-gray-100 text-gray-600 dark:bg-slate-700/60 dark:text-gray-300',
    EN_TRANSITO: 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300',
    EN_ADUANA: 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-300',
    LIQUIDADA: 'bg-violet-50 text-violet-600 dark:bg-violet-900/30 dark:text-violet-300',
    NACIONALIZADA: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300',
    ANULADA: 'bg-rose-50 text-rose-500 dark:bg-rose-900/30 dark:text-rose-300',
};

// Orden del "stepper" de estados en el detalle (ANULADA queda fuera del flujo feliz).
export const ESTADO_IMPORTACION_FLUJO: EstadoImportacion[] = [
    'BORRADOR',
    'EN_TRANSITO',
    'EN_ADUANA',
    'LIQUIDADA',
    'NACIONALIZADA',
];

export const TIPO_GASTO_OPTIONS: { value: TipoGastoImportacion; label: string }[] = [
    { value: 'FLETE_INTERNACIONAL', label: 'Flete internacional' },
    { value: 'SEGURO', label: 'Seguro' },
    { value: 'AD_VALOREM', label: 'Ad valorem' },
    { value: 'IGV_IMPORTACION', label: 'IGV importación' },
    { value: 'IPM', label: 'IPM' },
    { value: 'ISC', label: 'ISC' },
    { value: 'PERCEPCION', label: 'Percepción' },
    { value: 'AGENCIA_ADUANA', label: 'Agencia de aduana' },
    { value: 'ALMACEN_ADUANERO', label: 'Almacén aduanero' },
    { value: 'TRANSPORTE_INTERNO', label: 'Transporte interno' },
    { value: 'GASTOS_BANCARIOS', label: 'Gastos bancarios' },
    { value: 'OTROS', label: 'Otros' },
];

export const TIPO_GASTO_LABEL: Record<string, string> = TIPO_GASTO_OPTIONS.reduce(
    (acc, o) => ({ ...acc, [o.value]: o.label }),
    {} as Record<string, string>,
);

// Gastos que NO capitalizan por defecto: crédito fiscal recuperable vía SUNAT.
export const TIPOS_NO_CAPITALIZAN: TipoGastoImportacion[] = ['IGV_IMPORTACION', 'IPM', 'PERCEPCION'];

export const BASE_PRORRATEO_OPTIONS: { value: BaseProrrateo; label: string }[] = [
    { value: 'VALOR', label: 'Valor FOB' },
    { value: 'PESO', label: 'Peso (Kg)' },
    { value: 'VOLUMEN', label: 'Volumen (m³)' },
    { value: 'CANTIDAD', label: 'Cantidad' },
];

export interface IImportacionItemForm {
    productoId: number;
    productoLabel?: string;
    descripcion?: string;
    cantidad: string;
    unidad: string;
    precioFobUnitario: string;
    pesoKg?: string;
    volumenM3?: string;
    partidaArancelaria?: string;
    adValoremPorcentaje?: string;
}

export const INITIAL_ITEM_FORM: IImportacionItemForm = {
    productoId: 0,
    cantidad: '',
    unidad: 'KG',
    precioFobUnitario: '',
    pesoKg: '',
    volumenM3: '',
    partidaArancelaria: '',
    adValoremPorcentaje: '',
};

export interface IImportacionFilters {
    search: string;
    estado: string;
}

export const INITIAL_IMPORTACIONES_FILTERS: IImportacionFilters = {
    search: '',
    estado: 'TODOS',
};

export const ESTADO_FILTRO_OPTIONS = [
    { value: 'TODOS', label: 'Todos los estados' },
    ...Object.entries(ESTADO_IMPORTACION_LABEL).map(([value, label]) => ({ value, label })),
];

export const fmtMoneda = (value: number | string | undefined | null, moneda = 'PEN'): string => {
    const n = Number(value || 0);
    const symbol = moneda === 'USD' ? '$' : 'S/';
    return `${symbol} ${n.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};
