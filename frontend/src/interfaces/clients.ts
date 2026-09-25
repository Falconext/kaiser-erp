interface IDocument {
  id: number
  codigo: string
  descripcion: string
}

/** Sector económico del cliente (B2B). */
export type ClienteSector =
  | 'AGROEXPORTACION' | 'AVICOLA' | 'PECUARIO' | 'MINERIA'
  | 'CONSTRUCCION' | 'INDUSTRIA' | 'COMERCIO' | 'OTRO';

/** Contacto de un cliente (comprador, jefe de planta, logística, etc.). */
export interface IClienteContacto {
  id?: number
  clienteId?: number
  nombre: string
  cargo?: string | null
  telefono?: string | null
  email?: string | null
  area?: string | null
  observacion?: string | null
  esPrincipal?: boolean
  activo?: boolean
}

export type IClient = {
    id: number
    nombre: string
    nroDoc: string
    direccion: any
    departamento: string
    distrito: string
    provincia: any
    ubigeo: any
    email: string
    persona: string
    telefono: string
    contactoNombre?: string
    contactoEmail?: string
    contactoTelefono?: string
    contactoDireccion?: string
    sector?: ClienteSector | string
    contactos?: IClienteContacto[]
    estado: string
    tipoDocumentoId: number
    empresaId: number
    tipoDocumento: IDocument
  }


  export type IFormClient = {
    id: number
    nombre: string
    persona: string
    nroDoc: string
    direccion: any
    departamento: string
    distrito: string
    tipoDoc: string
    provincia: any
    ubigeo: any
    email: string
    telefono: string
    contactoNombre?: string
    contactoEmail?: string
    contactoTelefono?: string
    contactoDireccion?: string
    sector?: ClienteSector | string
    contactos?: IClienteContacto[]
    estado: string
    tipoDocumentoId: number
    empresaId: number
    tipoDocumento: IDocument
  }