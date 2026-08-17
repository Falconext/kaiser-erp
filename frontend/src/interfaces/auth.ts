export interface Auth {
    token: string
    refreshToken: string
    user: IUser
}

export type TipoSede = 'PUNTO_DE_VENTA' | 'ALMACEN';

export interface ISede {
    id: number
    nombre: string
    codigo: string | null
    tipo: TipoSede
    esPrincipal: boolean
    /** Permite facturar aunque la sede sea tipo ALMACEN. */
    permiteFacturacion?: boolean
    activo: boolean
}

export interface IUser {
    id: number
    nombre: string
    email: string
    rol: 'ADMIN_SISTEMA' | 'ADMIN_EMPRESA' | 'USUARIO_EMPRESA' | 'RESELLER'
    empresaId: any
    resellerId?: number
    estado: string
    empresa: any
    usuario: any
    permisos?: string[]
    sedes?: ISede[]
    subModulos?: { id: number; codigo: string; nombre: string; moduloId: number }[]
    sistemaNegocio?: string | null
    sistemaProducto?: string | null
}

export interface IResponse {
    code: number;
    data: any;
    total?: number;
    message: string
    status: number
}

export interface IEmail {
    correo: string
}
