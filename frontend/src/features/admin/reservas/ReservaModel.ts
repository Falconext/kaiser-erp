export type EstadoReserva = 'PENDIENTE' | 'CONFIRMADA' | 'CANCELADA'

export interface IReserva {
  id: number
  productoId: number
  producto: { nombre: string; sku?: string }
  cantidad: number
  motivo?: string
  estado: EstadoReserva
  fechaVencimiento?: string
  createdAt: string
}

export const RESERVA_ESTADOS: { id: EstadoReserva; value: string }[] = [
  { id: 'PENDIENTE', value: 'PENDIENTE' },
  { id: 'CONFIRMADA', value: 'CONFIRMADA' },
  { id: 'CANCELADA', value: 'CANCELADA' },
]

export const RESERVA_COLUMNS = [
  'Producto',
  'Cantidad',
  'Motivo',
  'Estado',
  'Fecha Vencimiento',
  'Creado',
  'Acciones',
]
