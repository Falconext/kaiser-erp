import { useEffect, useMemo, useState } from 'react'
import { del, get, patch, post } from '@/utils/fetch'
import useAlertStore from '@/zustand/alert'
import { useProductsStore } from '@/zustand/products'
import { EstadoReserva, IReserva } from './ReservaModel'

interface ReservaApiItem {
  id: number
  productoId: number
  producto?: {
    descripcion?: string
    codigo?: string
  }
  cantidad: number
  motivo?: string
  estado: EstadoReserva
  fechaVencimiento?: string
  createdAt: string
}

export function useReservaViewModel() {
  const { alert } = useAlertStore()
  const { products, getAllProducts } = useProductsStore()

  const [reservas, setReservas] = useState<IReserva[]>([])
  const [estadoFiltro, setEstadoFiltro] = useState<EstadoReserva | 'TODOS'>('TODOS')
  const [productoFiltro, setProductoFiltro] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [isOpenModal, setIsOpenModal] = useState(false)
  const [editingReserva, setEditingReserva] = useState<IReserva | null>(null)

  const mapReserva = (item: ReservaApiItem): IReserva => ({
    id: item.id,
    productoId: item.productoId,
    producto: {
      nombre: item.producto?.descripcion || 'Producto',
      sku: item.producto?.codigo,
    },
    cantidad: item.cantidad,
    motivo: item.motivo,
    estado: item.estado,
    fechaVencimiento: item.fechaVencimiento,
    createdAt: item.createdAt,
  })

  const fetchReservas = async () => {
    setLoading(true)
    try {
      const query = new URLSearchParams()
      if (estadoFiltro !== 'TODOS') query.append('estado', estadoFiltro)
      if (productoFiltro) query.append('productoId', String(productoFiltro))

      const response: any = await get(`reservas${query.toString() ? `?${query.toString()}` : ''}`)
      if (response.code === 1) {
        const data = (response.data || []) as ReservaApiItem[]
        setReservas(data.map(mapReserva))
      } else {
        setReservas([])
      }
    } catch (error: any) {
      alert(error?.message || 'No se pudo listar reservas', 'error')
    } finally {
      setLoading(false)
    }
  }

  const fetchProducts = async () => {
    await getAllProducts({ page: 1, limit: 200, search: '' })
  }

  useEffect(() => {
    fetchReservas()
  }, [estadoFiltro, productoFiltro])

  useEffect(() => {
    fetchProducts()
  }, [])

  const openCreateModal = () => {
    setEditingReserva(null)
    setIsOpenModal(true)
  }

  const openEditModal = (reserva: IReserva) => {
    setEditingReserva(reserva)
    setIsOpenModal(true)
  }

  const closeModal = () => {
    setEditingReserva(null)
    setIsOpenModal(false)
  }

  const createReserva = async (payload: {
    productoId: number
    cantidad: number
    motivo?: string
    estado: EstadoReserva
    fechaVencimiento?: string
  }) => {
    setSaving(true)
    try {
      const response: any = await post('reservas', payload)
      if (response.code === 1) {
        alert('Reserva creada correctamente', 'success')
        closeModal()
        await fetchReservas()
        return
      }
      alert(response.error || 'No se pudo crear la reserva', 'error')
    } catch (error: any) {
      alert(error?.message || 'No se pudo crear la reserva', 'error')
    } finally {
      setSaving(false)
    }
  }

  const updateReserva = async (
    id: number,
    payload: {
      cantidad?: number
      motivo?: string
      estado?: EstadoReserva
      fechaVencimiento?: string
    },
  ) => {
    const response: any = await patch(`reservas/${id}`, payload)
    if (response.code === 1) {
      alert('Reserva actualizada correctamente', 'success')
      await fetchReservas()
      return
    }
    throw new Error(response.error || 'No se pudo actualizar la reserva')
  }

  const submitModal = async (payload: {
    productoId: number
    cantidad: number
    motivo?: string
    estado: EstadoReserva
    fechaVencimiento?: string
  }) => {
    if (!editingReserva) {
      await createReserva(payload)
      return
    }

    setSaving(true)
    try {
      await updateReserva(editingReserva.id, {
        cantidad: payload.cantidad,
        motivo: payload.motivo,
        estado: payload.estado,
        fechaVencimiento: payload.fechaVencimiento,
      })
      closeModal()
    } catch (error: any) {
      alert(error?.message || 'No se pudo actualizar la reserva', 'error')
    } finally {
      setSaving(false)
    }
  }

  const updateEstado = async (reserva: IReserva, estado: EstadoReserva) => {
    try {
      await updateReserva(reserva.id, { estado })
    } catch (error: any) {
      alert(error?.message || 'No se pudo actualizar el estado', 'error')
    }
  }

  const deleteReserva = async (reserva: IReserva) => {
    try {
      const response: any = await del(`reservas/${reserva.id}`)
      if (response.code === 1) {
        alert('Reserva eliminada correctamente', 'success')
        await fetchReservas()
        return
      }
      alert(response.error || 'No se pudo eliminar la reserva', 'error')
    } catch (error: any) {
      alert(error?.message || 'No se pudo eliminar la reserva', 'error')
    }
  }

  const productoOptions = useMemo(
    () =>
      (products || []).map((product) => ({
        id: product.id,
        value: `${product.descripcion}${product.codigo ? ` (${product.codigo})` : ''}`,
      })),
    [products],
  )

  return {
    reservas,
    loading,
    saving,
    estadoFiltro,
    productoFiltro,
    setEstadoFiltro,
    setProductoFiltro,
    isOpenModal,
    editingReserva,
    openCreateModal,
    openEditModal,
    closeModal,
    submitModal,
    updateEstado,
    deleteReserva,
    productoOptions,
    productos: products,
    refresh: fetchReservas,
  }
}
