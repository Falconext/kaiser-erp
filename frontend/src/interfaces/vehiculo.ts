export interface IVehiculo {
    id: number;
    placa: string;
    marca: string;
    modelo?: string | null;
    color?: string | null;
    anio?: number | null;
    kilometraje?: number | null;
    nivelCombustible?: NivelCombustible | null;
    clienteId?: number | null;
    sedeId?: number | null;
    observaciones?: string | null;
    creadoEn: string;
    actualizadoEn: string;
    cliente?: {
        id: number;
        nombre: string;
        nroDoc: string;
        telefono?: string | null;
        email?: string | null;
    } | null;
    actas?: IActaInspeccion[];
    contratos?: IContratoVehicular[];
    // Contratos donde el vehículo participa como unidad (multi-vehículo).
    contratoItems?: { id: number; contrato: IContratoVehicular }[];
}

export interface IContratoVehiculoItem {
    id: number;
    vehiculoId: number;
    montoAnual?: number | null;
    vehiculo?: Pick<IVehiculo, 'id' | 'placa' | 'marca' | 'modelo' | 'color' | 'anio'>;
}

export type TipoActa = 'INGRESO' | 'RETIRO';
export type NivelCombustible = 'LLENO' | '3/4' | '1/2' | '1/4' | 'VACIO';

export interface IActaInspeccion {
    id: number;
    vehiculoId: number;
    tipo: TipoActa;
    km?: number | null;
    nivelCombustible?: NivelCombustible | null;
    observaciones?: string | null;
    fotos?: string[];
    checklist?: { categoria: string; item: string; estado: string; nota?: string }[] | null;
    usuarioId?: number | null;
    creadoEn: string;
    usuario?: {
        id: number;
        nombre: string;
    } | null;
}

export type EstadoContrato = 'VIGENTE' | 'POR_VENCER' | 'VENCIDO' | 'CANCELADO';

export interface IContratoVehicular {
    id: number;
    empresaId: number;
    vehiculoId: number;
    productoId?: number | null;
    fechaInicio: string;
    fechaFin: string;
    estado: EstadoContrato;
    montoAnual?: number | null;
    observaciones?: string | null;
    creadoEn: string;
    actualizadoEn: string;
    vehiculo?: Pick<IVehiculo, 'id' | 'placa' | 'marca' | 'modelo' | 'color' | 'cliente'>;
    // Detalle de vehículos incluidos en el contrato (multi-vehículo).
    unidades?: IContratoVehiculoItem[];
    producto?: {
        id: number;
        descripcion: string;
        precioUnitario?: number;
    } | null;
}

export interface IVehiculosResponse {
    data: IVehiculo[];
    paginacion: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}

export interface IContratosResponse {
    data: IContratoVehicular[];
    paginacion: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}
