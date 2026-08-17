export type TipoSede = 'PUNTO_DE_VENTA' | 'ALMACEN';

export interface Sede {
    id: number;
    empresaId: number;
    nombre: string;
    direccion: string | null;
    codigo: string | null;
    tipo: TipoSede;
    esPrincipal: boolean;
    /** Permite facturar aunque la sede sea tipo ALMACEN. */
    permiteFacturacion?: boolean;
    activo: boolean;
    estado: 'ACTIVO' | 'INACTIVO';
    creadoEn?: string;
    actualizadoEn?: string;
}

export interface CreateSedeDto {
    nombre: string;
    direccion?: string;
    codigo?: string;
    tipo?: TipoSede;
    esPrincipal?: boolean;
    permiteFacturacion?: boolean;
    activo?: boolean;
}

export interface UpdateSedeDto extends Partial<CreateSedeDto> {
    estado?: 'ACTIVO' | 'INACTIVO';
}
