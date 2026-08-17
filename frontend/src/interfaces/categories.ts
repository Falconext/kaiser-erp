export type ICategory = {
  id?: number
  nombre: string
  empresaId: string
  imagenUrl?: string
  _count?: {
    productos: number
  }
}

export type IFormCategories = {
  categoriaId?: number
  nombre: string
  imagenUrl?: string
}