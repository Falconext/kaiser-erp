import { useEffect, useMemo, useState } from 'react'
import { Icon } from '@iconify/react'
import Select from '@/components/Select'
import ReservaFormModal from './ReservaFormModal'
import { RESERVA_ESTADOS, EstadoReserva, IReserva } from './ReservaModel'
import { useReservaViewModel } from './useReservaViewModel'
import { useThemeStore, SIDEBAR_COLOR_HEX } from '@/zustand/theme'

// Pills de estado — punto de color + texto pastel, estilo CRM.
const estadoPill: Record<EstadoReserva, { label: string; dot: string; text: string; bg: string }> = {
  PENDIENTE: { label: 'Pendiente', dot: 'bg-amber-500', text: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/20' },
  CONFIRMADA: { label: 'Confirmada', dot: 'bg-emerald-500', text: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
  CANCELADA: { label: 'Cancelada', dot: 'bg-rose-500', text: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-50 dark:bg-rose-900/20' },
}

const PER_PAGE = [10, 20, 50]

export default function ReservaView() {
  const vm = useReservaViewModel()
  const sidebarColor = useThemeStore((s) => s.sidebarColor)
  const ACCENT = SIDEBAR_COLOR_HEX[sidebarColor] ?? '#7551FF'

  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)

  // Reinicia la página al cambiar filtros o tamaño.
  useEffect(() => { setPage(1) }, [vm.productoFiltro, vm.estadoFiltro, limit])

  const total = vm.reservas.length
  const totalPages = Math.max(1, Math.ceil(total / limit))
  const fromRow = total === 0 ? 0 : (page - 1) * limit + 1
  const toRow = Math.min(page * limit, total)
  const pageRows = vm.reservas.slice((page - 1) * limit, page * limit)

  const pageNumbers = useMemo(() => {
    const nums: number[] = []
    const win = 2
    for (let i = Math.max(1, page - win); i <= Math.min(totalPages, page + win); i++) nums.push(i)
    if (!nums.includes(1)) nums.unshift(1)
    if (!nums.includes(totalPages)) nums.push(totalPages)
    return [...new Set(nums)].sort((a, b) => a - b)
  }, [page, totalPages])

  return (
    <div className="min-h-screen -m-5 p-5 bg-[#F7F8FB] dark:bg-[#0A0D14] font-jakarta">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-400 dark:text-gray-500 mb-5">
        <Icon icon="solar:home-smile-linear" className="text-base" />
        <span>Panel</span>
        <Icon icon="solar:alt-arrow-right-linear" className="text-xs" />
        <span>Inventario</span>
        <Icon icon="solar:alt-arrow-right-linear" className="text-xs" />
        <span className="font-semibold" style={{ color: ACCENT }}>Reservas</span>
      </div>

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-5">
        <div className="min-w-0">
          <h1 className="text-[22px] font-extrabold text-slate-800 dark:text-white tracking-tight">Reservas</h1>
          <p className="text-sm text-slate-400 dark:text-gray-500 mt-0.5">Reserva stock para pre-órdenes y planificación.</p>
        </div>
        <button
          onClick={vm.openCreateModal}
          className="h-11 px-4 rounded-2xl text-white text-sm font-bold flex items-center gap-1.5 shadow-lg shadow-violet-500/30 hover:brightness-105 transition-all shrink-0 self-start"
          style={{ background: ACCENT }}
        >
          <Icon icon="solar:bookmark-bold-duotone" className="text-lg" /> Nueva Reserva
        </button>
      </div>

      {/* Filtros */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-[0_2px_20px_rgba(15,23,42,0.05)] dark:shadow-none p-4 mb-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Select
            label="Producto"
            name="productoFiltro"
            defaultValue={vm.productoOptions.find((opt) => Number(opt.id) === Number(vm.productoFiltro))?.value || 'Todos'}
            options={[{ id: 0, value: 'Todos' }, ...vm.productoOptions]}
            error=""
            isSearch
            onChange={(id: string | number) => vm.setProductoFiltro(Number(id) === 0 ? null : Number(id))}
          />

          <Select
            label="Estado"
            name="estadoFiltro"
            defaultValue={vm.estadoFiltro}
            options={[{ id: 'TODOS', value: 'TODOS' }, ...RESERVA_ESTADOS.map((item) => ({ id: item.id, value: item.value }))]}
            error=""
            onChange={(id: string | number) => vm.setEstadoFiltro(id as EstadoReserva | 'TODOS')}
          />
        </div>
      </div>

      {/* Card contenedora */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-[0_2px_20px_rgba(15,23,42,0.05)] dark:shadow-none overflow-hidden">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-2.5 p-4 border-b border-slate-100 dark:border-slate-700">
          <button
            onClick={() => { void vm.refresh() }}
            className="h-9 px-3.5 rounded-xl border-2 text-sm font-bold flex items-center gap-1.5 transition-colors"
            style={{ borderColor: `${ACCENT}55`, color: ACCENT }}
          >
            <Icon icon="solar:refresh-linear" className={vm.loading ? 'animate-spin' : ''} /> Actualizar
          </button>
          <span className="text-sm text-slate-400 dark:text-gray-500 font-medium px-1">{total.toLocaleString('es-PE')} resultados</span>
        </div>

        {/* Tabla */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[860px]">
            <thead>
              <tr className="text-[11px] font-bold uppercase tracking-wide text-slate-400 dark:text-gray-500 border-b border-slate-100 dark:border-slate-700">
                <th className="py-3 pl-5 px-3">Producto</th>
                <th className="py-3 px-3">Cantidad</th>
                <th className="py-3 px-3">Motivo</th>
                <th className="py-3 px-3">Estado</th>
                <th className="py-3 px-3">Fecha Vencimiento</th>
                <th className="py-3 px-3">Creado</th>
                <th className="py-3 px-3 pr-5 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {vm.loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="border-b border-slate-50 dark:border-slate-700/50">
                    <td colSpan={7} className="py-3.5 px-5">
                      <div className="h-6 rounded-lg bg-slate-100 dark:bg-slate-700 animate-pulse" />
                    </td>
                  </tr>
                ))
              ) : pageRows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center">
                    <Icon icon="solar:bookmark-linear" className="text-5xl text-slate-200 dark:text-slate-700 mx-auto mb-2" />
                    <p className="text-slate-400 dark:text-gray-500 text-sm">No hay reservas para mostrar.</p>
                  </td>
                </tr>
              ) : pageRows.map((reserva: IReserva) => {
                const pill = estadoPill[reserva.estado]
                const nombre = reserva.producto.nombre || 'Producto'
                return (
                  <tr key={reserva.id} className="border-b border-slate-50 dark:border-slate-700/50 hover:bg-slate-50/60 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="py-3 pl-5 px-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-violet-400 to-indigo-500 text-white grid place-items-center text-xs font-bold shrink-0">
                          {nombre.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="font-semibold text-slate-700 dark:text-slate-200 text-sm truncate max-w-[200px]">{nombre}</span>
                          <span className="text-xs text-slate-400 dark:text-gray-500 truncate">{reserva.producto.sku || '-'}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-3 font-bold text-slate-800 dark:text-white text-sm">{reserva.cantidad}</td>
                    <td className="py-3 px-3 text-sm text-slate-500 dark:text-gray-400 truncate max-w-[200px]">{reserva.motivo || '-'}</td>
                    <td className="py-3 px-3">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${pill.bg} ${pill.text}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${pill.dot}`} /> {pill.label}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-sm text-slate-500 dark:text-gray-400">
                      {reserva.fechaVencimiento ? String(reserva.fechaVencimiento).slice(0, 10) : '-'}
                    </td>
                    <td className="py-3 px-3 text-sm text-slate-500 dark:text-gray-400">{String(reserva.createdAt).slice(0, 10)}</td>
                    <td className="py-3 px-3 pr-5">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => vm.openEditModal(reserva)}
                          title="Editar"
                          className="h-8 w-8 grid place-items-center rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                        >
                          <Icon icon="solar:pen-bold" width="16" />
                        </button>
                        {reserva.estado !== 'CONFIRMADA' && (
                          <button
                            onClick={() => { void vm.updateEstado(reserva, 'CONFIRMADA') }}
                            title="Confirmar"
                            className="h-8 w-8 grid place-items-center rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-colors"
                          >
                            <Icon icon="solar:check-circle-bold" width="16" />
                          </button>
                        )}
                        {reserva.estado !== 'CANCELADA' && (
                          <button
                            onClick={() => { void vm.updateEstado(reserva, 'CANCELADA') }}
                            title="Cancelar"
                            className="h-8 w-8 grid place-items-center rounded-lg bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors"
                          >
                            <Icon icon="solar:close-circle-bold" width="16" />
                          </button>
                        )}
                        <button
                          onClick={() => { void vm.deleteReserva(reserva) }}
                          title="Eliminar"
                          className="h-8 w-8 grid place-items-center rounded-lg bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/30 transition-colors"
                        >
                          <Icon icon="solar:trash-bin-trash-bold" width="16" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 border-t border-slate-100 dark:border-slate-700">
          <span className="text-sm text-slate-400 dark:text-gray-500">{fromRow}-{toRow} de {total.toLocaleString('es-PE')}</span>
          <div className="flex items-center gap-1">
            <button disabled={page <= 1} onClick={() => setPage(1)} className="h-8 w-8 grid place-items-center rounded-lg text-slate-400 dark:text-gray-500 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30"><Icon icon="solar:double-alt-arrow-left-linear" /></button>
            <button disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="h-8 w-8 grid place-items-center rounded-lg text-slate-400 dark:text-gray-500 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30"><Icon icon="solar:alt-arrow-left-linear" /></button>
            {pageNumbers.map((n, i) => {
              const prev = pageNumbers[i - 1]
              const gap = prev && n - prev > 1
              return (
                <span key={n} className="flex items-center">
                  {gap && <span className="px-1 text-slate-300 dark:text-slate-600">…</span>}
                  <button onClick={() => setPage(n)}
                    className={`h-8 min-w-8 px-2 grid place-items-center rounded-lg text-sm font-semibold transition-colors ${n === page ? 'text-white' : 'text-slate-500 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
                    style={n === page ? { background: ACCENT } : undefined}>
                    {n}
                  </button>
                </span>
              )
            })}
            <button disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} className="h-8 w-8 grid place-items-center rounded-lg text-slate-400 dark:text-gray-500 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30"><Icon icon="solar:alt-arrow-right-linear" /></button>
            <button disabled={page >= totalPages} onClick={() => setPage(totalPages)} className="h-8 w-8 grid place-items-center rounded-lg text-slate-400 dark:text-gray-500 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30"><Icon icon="solar:double-alt-arrow-right-linear" /></button>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-400 dark:text-gray-500">
            <span>Filas/pág</span>
            <select value={limit} onChange={(e) => setLimit(Number(e.target.value))}
              className="h-8 w-[68px] rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 pl-3 pr-6 text-slate-600 dark:text-slate-300 font-semibold focus:outline-none focus:border-[var(--accent)]">
              {PER_PAGE.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
        </div>
      </div>

      <ReservaFormModal
        isOpen={vm.isOpenModal}
        onClose={vm.closeModal}
        onSubmit={vm.submitModal}
        productos={vm.productos}
        initialData={vm.editingReserva}
        loading={vm.saving}
      />
    </div>
  )
}
