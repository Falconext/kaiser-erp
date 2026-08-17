export type IInvoices = {
  id: number
  ublVersion: string
  tipoOperacionId: number
  tipoDoc: string
  serie: string
  correlativo: number
  fechaEmision: string
  formaPagoTipo: string
  formaPagoMoneda: string
  tipoMoneda: string
  fechaRecojo: string
  estadoPago: string
  observaciones: string
  sunatCdrZip: string
  sunatXml: string,
  s3XmlUrl?: string
  s3CdrUrl?: string
  saldo: number
  sede: {
    nombre: string
  },
  usuario?: {
    id: number
    nombre: string
  } | null
  // Cobranza en campo: vendedor de campo atribuido (se muestra en vez del usuario).
  vendedorCampoId?: number | null
  vendedorCampoNombre?: string | null
  numeroOrdenTrabajo: string
  mtoDescuentoGlobal: number
  mtoOperGravadas: number
  mtoIGV: number
  mtoOperInafectas: number
  s3PdfUrl: string
  valorVenta: number
  totalImpuestos: number
  subTotal: number
  mtoImpVenta: number
  estadoEnvioSunat: string
  envioDespacho?: {
    id: number
    comprobanteId: number
    estado: string
    transportista?: string | null
    tipoEnvio?: string | null
    agenciaDestino?: string | null
    direccionDestino?: string | null
    celularDest?: string | null
    nroPaquetes?: number | null
    turnoEnvio?: string | null
    creadoEn?: string
  } | null
  medioPago: any
  clienteId: number
  empresaId: number
  tipDocAfectado: string
  numDocAfectado: string
  motivoId: number
  creadoEn: string
  cliente: {
    id: number
    nombre: string
    nroDoc: string
    persona: string
  }
  detalles: Array<{
    producto: {
      id: number
      descripcion: string
    }
    unidad: string
    descripcion: string
    cantidad: number
    mtoValorUnitario: number
    mtoValorVenta: number
    mtoBaseIgv: number
    porcentajeIgv: number
    igv: number
    totalImpuestos: number
    mtoPrecioUnitario: number
  }>
  leyendas: Array<{
    code: string
    value: string
  }>
  motivo: {
    codigo: string
    descripcion: string
  }
  tipoOperacion: {
    codigo: string
    descripcion: string
  }
  comprobante: string
  sunatErrorMsg?: string | null
  sunatRetriesCount?: number
}


export interface IFormInvoice {
  sedeId?: number
  comprobante: string
  tipoDoc: string
  tipoOperacionId?: number
  relatedInvoiceId: string
  vuelto: number,
  clienteNombre: string
  medioPago: string
  discount: number
  tipDocAfectado: string,
  motivoId: number,
  motivo: string
  numDocAfectado: string
  observaciones: string
  clienteId: number
  detalles: Array<{
    productId: number
    quantity: number
  }>
  currencyCode: string
  // Optional fields for Credit/Detraction/Retention
  cuotas?: Array<{ monto: number, fechaVencimiento: string }>
  formaPagoTipo?: string
}
