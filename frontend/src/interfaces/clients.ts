interface IDocument {
  id: number
  codigo: string
  descripcion: string
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
    estado: string
    tipoDocumentoId: number
    empresaId: number
    tipoDocumento: IDocument
  }