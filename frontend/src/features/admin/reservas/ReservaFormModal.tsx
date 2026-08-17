import React, { useEffect, useMemo, useState } from 'react'
import Modal from '@/components/Modal'
import InputPro from '@/components/InputPro'
import Button from '@/components/Button'
import Select from '@/components/Select'
import { EstadoReserva, IReserva, RESERVA_ESTADOS } from './ReservaModel'
import { IProduct } from '@/interfaces/products'

interface Props {
  isOpen: boolean
  onClose: () => void
  onSubmit: (payload: {
    productoId: number
    cantidad: number
    motivo?: string
    estado: EstadoReserva
    fechaVencimiento?: string
  }) => Promise<void>
  productos: IProduct[]
  initialData?: IReserva | null
  loading?: boolean
}

export default function ReservaFormModal({
  isOpen,
  onClose,
  onSubmit,
  productos = [],
  initialData,
  loading = false,
}: Props) {
  const [productoId, setProductoId] = useState<number>(0)
  const [cantidad, setCantidad] = useState<number>(1)
  const [motivo, setMotivo] = useState('')
  const [estado, setEstado] = useState<EstadoReserva>('PENDIENTE')
  const [fechaVencimiento, setFechaVencimiento] = useState('')

  useEffect(() => {
    if (!isOpen) return
    setProductoId(initialData?.productoId || 0)
    setCantidad(initialData?.cantidad || 1)
    setMotivo(initialData?.motivo || '')
    setEstado(initialData?.estado || 'PENDIENTE')
    setFechaVencimiento(initialData?.fechaVencimiento ? String(initialData.fechaVencimiento).slice(0, 10) : '')
  }, [isOpen, initialData])

  const productoOptions = useMemo(() => {
    const base = productos.map((p) => ({
      id: p.id,
      value: `${p.descripcion}${p.codigo ? ` (${p.codigo})` : ''}`,
    }))

    if (!initialData?.productoId) return base

    const exists = base.some((option) => Number(option.id) === Number(initialData.productoId))
    if (exists) return base

    return [
      {
        id: initialData.productoId,
        value: `${initialData.producto?.nombre || 'Producto'}${initialData.producto?.sku ? ` (${initialData.producto.sku})` : ''}`,
      },
      ...base,
    ]
  }, [productos, initialData])

  const selectedProductoLabel = useMemo(
    () => productoOptions.find((option) => Number(option.id) === Number(productoId))?.value || '',
    [productoOptions, productoId],
  )

  const handleSubmit = async () => {
    if (!productoId || cantidad <= 0) return
    await onSubmit({
      productoId,
      cantidad,
      motivo: motivo?.trim() || undefined,
      estado,
      fechaVencimiento: fechaVencimiento || undefined,
    })
  }

  return (
    <Modal
      isOpenModal={isOpen}
      closeModal={onClose}
      title={initialData ? 'Editar Reserva' : 'Nueva Reserva'}
      width="760px"
      icon="solar:bookmark-bold-duotone"
    >
      <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <Select
            label="Producto"
            name="productoId"
            value={selectedProductoLabel}
            defaultValue={selectedProductoLabel || 'Seleccionar producto'}
            options={productoOptions}
            isSearch
            error=""
            onChange={(id: number | string) => setProductoId(Number(id))}
          />
        </div>

        <InputPro
          isLabel
          label="Cantidad"
          name="cantidad"
          type="number"
          value={cantidad}
          onChange={(event) => setCantidad(Number(event.target.value || 0))}
        />

        <Select
          label="Estado"
          name="estado"
          value={estado}
          defaultValue={estado}
          options={RESERVA_ESTADOS.map((item) => ({ id: item.id, value: item.value }))}
          error=""
          onChange={(id: string) => setEstado(id as EstadoReserva)}
        />

        <div className="md:col-span-2">
          <InputPro
            isLabel
            label="Motivo"
            name="motivo"
            value={motivo}
            onChange={(event) => setMotivo(event.target.value)}
            placeholder="Ej: Pre-orden, Producción, Cliente especial"
          />
        </div>

        <InputPro
          isLabel
          label="Fecha Vencimiento (Opcional)"
          name="fechaVencimiento"
          type="date"
          value={fechaVencimiento}
          onChange={(event) => setFechaVencimiento(event.target.value)}
        />

        <div className="md:col-span-2 flex justify-end gap-2 pt-1">
          <Button outline onClick={onClose} className="px-5">
            Cancelar
          </Button>
          <Button
            color="secondary"
            className="px-5"
            disabled={loading || !productoId || cantidad <= 0}
            onClick={handleSubmit}
          >
            {loading ? 'Guardando...' : initialData ? 'Actualizar' : 'Crear Reserva'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
