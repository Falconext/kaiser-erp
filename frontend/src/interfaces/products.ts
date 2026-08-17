export type IProduct = {
  id: number
  codigo: string
  descripcion: string
  categoriaId: number
  unidadMedidaId: number
  tipoAfectacionIGV: string
  moneda?: string
  precioUnitario: string
  valorUnitario: string
  igvPorcentaje: string
  stock: number
  stockBase?: number
  stockReservado?: number
  stockDisponibleVenta?: number
  localizacion?: string
  porcentajeVenta?: number
  porcentajeProvision?: number
  loteFefoCodigo?: string | null
  loteFefoVencimiento?: string | Date | null
  loteFefoCostoUnitario?: number | null
  stockMinimo?: number
  stockMaximo?: number
  sedeStockConfig?: {
    sedeId: number
    stock?: number
    stockMinimo?: number
    stockMaximo?: number | null
    ubicacionSede?: string | null
    visibleEnSede?: boolean
    vendibleEnSede?: boolean
    precioUnitarioSede?: number | null
    precioOfertaSede?: number | null
  } | null
  estado: string
  creadoEn: string
  empresaId: number
  costoPromedio?: number
  costoUnitario: number
  costoFijo?: number
  comisionPorVenta?: number
  comisionPorcentaje?: number
  imagenUrl?: string | null
  imagenUrlDisplay?: string | null
  imagenesExtra?: string[]
  unidadMedida: {
    id: number
    codigo: string
    nombre: string
  }
  categoria: {
    id: number
    nombre: string
    empresaId: number
  }
  marca?: {
    id: number
    nombre: string
  }
  // Campos Farmacia
  principioActivo?: string
  concentracion?: string
  presentacion?: string
  laboratorio?: string
  requiereReceta?: boolean
  controlado?: boolean
  refrigerado?: boolean
  // Campos Bodega/Supermercado
  codigoBarras?: string
  codigosBarrasExtra?: string[]
  codProdSunat?: string
  unidadCompra?: string
  unidadVenta?: string
  factorConversion?: number
  // Campos Ofertas
  precioOferta?: number | null
  fechaInicioOferta?: string | Date | null
  fechaFinOferta?: string | Date | null
  // Precios por Mayorista
  preciosMayorista?: { cantidadMinima: number; precio: number }[]
  atributosTecnicos?: Record<string, any>
  descripcionLarga?: string | null
  opcionesAtributos?: any
  valoresAtributos?: any
  productoPadreId?: number | null
  variantes?: IProduct[]
}



export type IFormProduct = {
  productoId: number
  descripcion: string,
  categoriaNombre: string
  disponibleParaVenta: boolean
  categoriaId: string | number | null,
  marcaNombre?: string
  marcaId?: number | null,
  afectacionNombre: string
  unidadMedidaNombre: string
  estado: string
  tipoAfectacionIGV: string
  moneda?: string
  precioUnitario: number,
  stock: number,
  localizacion?: string,
  porcentajeVenta?: number,
  porcentajeProvision?: number,
  stockMinimo?: number,
  stockMaximo?: number,
  visibleEnSede?: boolean,
  vendibleEnSede?: boolean,
  precioUnitarioSede?: number | null,
  precioOfertaSede?: number | null,
  ubicacionSede?: string | null,
  codigo: string,
  unidadMedidaId: number
  costoPromedio?: number
  costoUnitario?: number
  costoFijo?: number
  comisionPorVenta?: number
  comisionPorcentaje?: number
  imagenUrl?: string | null
  // Campos Farmacia
  principioActivo?: string
  concentracion?: string
  presentacion?: string
  laboratorio?: string
  requiereReceta?: boolean
  controlado?: boolean
  refrigerado?: boolean
  // Campos Bodega/Supermercado
  codigoBarras?: string
  codigosBarrasExtra?: string[]
  codProdSunat?: string
  unidadCompra?: string
  unidadVenta?: string
  factorConversion?: number
  // Campos Ofertas
  precioOferta?: number | null
  fechaInicioOferta?: string | Date | null
  fechaFinOferta?: string | Date | null
  // Precios por Mayorista
  preciosMayorista?: { cantidadMinima: number; precio: number }[]
  atributosTecnicos?: Record<string, any>
  descripcionLarga?: string | null
  opcionesAtributos?: any
  valoresAtributos?: any
  productoPadreId?: number | null
  variantesConfig?: any[]
}
