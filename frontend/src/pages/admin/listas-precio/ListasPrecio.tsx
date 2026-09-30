"use client";
import { Icon } from '@iconify/react';
import {
  useListasPrecioViewModel,
  soles,
} from '@/features/admin/listas-precio/useListasPrecioViewModel';

const ACCENT = 'var(--accent, #7551FF)';
const CARD =
  'bg-white dark:bg-slate-800 rounded-3xl shadow-[0_2px_20px_rgba(15,23,42,0.05)] dark:shadow-none';
const INPUT =
  'h-9 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-[13px] outline-none focus:border-[var(--accent)]';

const ListasPrecio = () => {
  const vm = useListasPrecioViewModel();

  return (
    <div className="min-h-screen -m-5 p-5 bg-[#F7F8FB] dark:bg-[#0A0D14] font-jakarta">
      <div className="flex items-center gap-2 text-sm text-slate-400 dark:text-gray-400 mb-5">
        <Icon icon="solar:home-smile-linear" className="text-base" />
        <span>Panel</span>
        <Icon icon="solar:alt-arrow-right-linear" className="text-xs" />
        <span>Clientes</span>
        <Icon icon="solar:alt-arrow-right-linear" className="text-xs" />
        <span className="font-semibold" style={{ color: ACCENT }}>Listas de precio</span>
      </div>

      <div className="mb-5">
        <h1 className="text-[22px] font-extrabold text-slate-800 dark:text-white tracking-tight">
          Listas de precio
        </h1>
        <p className="text-[13px] text-slate-400 mt-0.5 max-w-3xl">
          Un precio acordado con un tipo de cliente. Se asigna en la ficha del cliente y el
          vendedor cotiza con él sin tener que recordarlo. Son otra cosa que los tramos por
          cantidad del producto (“de 50 en adelante, a 9,80”), que siguen valiendo para cualquiera.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,380px)_1fr] gap-5">
        {/* Columna de listas */}
        <div className={`${CARD} p-5 h-fit`}>
          <h2 className="text-[15px] font-bold text-slate-800 dark:text-white mb-3">
            Listas ({vm.listas.length})
          </h2>

          <div className="space-y-2 mb-4">
            {!vm.cargado && <p className="text-[13px] text-slate-400">Cargando…</p>}
            {vm.cargado && vm.listas.length === 0 && (
              <p className="text-[13px] text-slate-400 py-2">
                Todavía no hay listas. Crea la primera abajo — por ejemplo “Distribuidor” o
                “Constructora”.
              </p>
            )}
            {vm.listas.map((l) => (
              <div
                key={l.id}
                className={`rounded-xl border p-3 transition cursor-pointer ${
                  vm.detalle?.id === l.id
                    ? 'border-[var(--accent)] bg-[var(--accent)]/5'
                    : 'border-slate-200 dark:border-slate-700 hover:border-[var(--accent)]/50'
                }`}
                onClick={() => void vm.abrir(l.id)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[13px] font-bold text-slate-700 dark:text-slate-200 truncate">
                      {l.nombre}
                      {!l.activa && (
                        <span className="ml-2 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-500 text-[10px] font-bold px-2 py-0.5">
                          inactiva
                        </span>
                      )}
                    </p>
                    {l.descripcion && (
                      <p className="text-[11px] text-slate-400 truncate">{l.descripcion}</p>
                    )}
                    <p className="text-[11px] text-slate-500 mt-1">
                      {l.productos} producto{l.productos === 1 ? '' : 's'} · {l.clientes} cliente
                      {l.clientes === 1 ? '' : 's'}
                      {l.ajustePorcentaje !== null && (
                        <span className="ml-1 font-semibold" style={{ color: ACCENT }}>
                          · resto {l.ajustePorcentaje > 0 ? '+' : ''}
                          {l.ajustePorcentaje}%
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <button
                      title={l.activa ? 'Desactivar' : 'Activar'}
                      onClick={(e) => {
                        e.stopPropagation();
                        void vm.alternarActiva(l);
                      }}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-[var(--accent)] hover:bg-[var(--accent)]/10"
                    >
                      <Icon icon={l.activa ? 'solar:eye-closed-linear' : 'solar:eye-linear'} width={15} />
                    </button>
                    <button
                      title="Borrar"
                      onClick={(e) => {
                        e.stopPropagation();
                        void vm.eliminar(l);
                      }}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20"
                    >
                      <Icon icon="solar:trash-bin-trash-linear" width={15} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="border-t border-slate-100 dark:border-slate-700 pt-3 space-y-2">
            <p className="text-[12px] font-semibold text-slate-600 dark:text-slate-300">Nueva lista</p>
            <input
              className={INPUT}
              placeholder="Nombre (ej. Distribuidor)"
              value={vm.nuevoNombre}
              onChange={(e) => vm.setNuevoNombre(e.target.value)}
            />
            <input
              className={INPUT}
              placeholder="Descripción (opcional)"
              value={vm.nuevaDescripcion}
              onChange={(e) => vm.setNuevaDescripcion(e.target.value)}
            />
            <button
              onClick={() => void vm.crear()}
              className="w-full h-9 rounded-lg text-[13px] font-semibold text-white transition"
              style={{ background: ACCENT }}
            >
              Crear lista
            </button>
          </div>
        </div>

        {/* Detalle */}
        <div className={`${CARD} p-5`}>
          {!vm.detalle ? (
            <div className="py-12 text-center">
              <Icon icon="solar:tag-price-linear" width={34} className="mx-auto text-slate-300 mb-2" />
              <p className="text-[13px] text-slate-500">
                Elige una lista para ver y editar sus precios.
              </p>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                <div>
                  <h2 className="text-[16px] font-bold text-slate-800 dark:text-white">
                    {vm.detalle.nombre}
                  </h2>
                  <p className="text-[12px] text-slate-400">
                    {vm.detalle.items.length} producto{vm.detalle.items.length === 1 ? '' : 's'} con
                    precio propio · {vm.detalle.clientes.length} cliente
                    {vm.detalle.clientes.length === 1 ? '' : 's'} asignado
                    {vm.detalle.clientes.length === 1 ? '' : 's'}
                  </p>
                </div>
                <div className="flex items-end gap-2">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">
                      Ajuste para el resto del catálogo (%)
                    </label>
                    <input
                      className={`${INPUT} w-48`}
                      type="number"
                      placeholder="vacío = precio de catálogo"
                      defaultValue={vm.detalle.ajustePorcentaje ?? ''}
                      onBlur={(e) => void vm.cambiarAjuste(vm.detalle!.id, e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {vm.detalle.clientes.length > 0 && (
                <div className="mb-4 flex flex-wrap gap-1.5">
                  {vm.detalle.clientes.map((c) => (
                    <span
                      key={c.id}
                      className="rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[11px] px-2.5 py-1"
                    >
                      {c.nombre}
                    </span>
                  ))}
                </div>
              )}

              {/* Añadir un precio */}
              <div className="rounded-2xl border border-slate-200 dark:border-slate-700 p-3.5 mb-4">
                <p className="text-[12px] font-semibold text-slate-600 dark:text-slate-300 mb-2">
                  Fijar el precio de un producto
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-[1fr_150px_auto] gap-2">
                  <div className="relative">
                    <input
                      className={INPUT}
                      placeholder="Buscar por código o descripción…"
                      value={vm.busqueda}
                      onChange={(e) => void vm.buscar(e.target.value)}
                    />
                    {vm.resultados.length > 0 && (
                      <div className="absolute z-10 mt-1 w-full max-h-56 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-lg">
                        {vm.resultados.map((p) => (
                          <button
                            key={p.id}
                            onClick={() => vm.elegir(p)}
                            className="block w-full text-left px-3 py-2 text-[12px] hover:bg-slate-50 dark:hover:bg-slate-800"
                          >
                            <span className="font-mono text-slate-500">{p.codigo}</span>{' '}
                            <span className="text-slate-700 dark:text-slate-200">{p.descripcion}</span>
                            <span className="text-slate-400"> · {soles(p.precioUnitario)}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <input
                    className={INPUT}
                    type="number"
                    placeholder="Precio con IGV"
                    value={vm.precio}
                    onChange={(e) => vm.setPrecio(e.target.value)}
                  />
                  <button
                    onClick={() => void vm.fijarPrecio()}
                    disabled={!vm.elegido}
                    className="h-9 px-4 rounded-lg text-[13px] font-semibold text-white disabled:opacity-40 transition"
                    style={{ background: ACCENT }}
                  >
                    Fijar
                  </button>
                </div>
                <p className="text-[11px] text-slate-400 mt-1.5">
                  El precio va <b>con IGV</b>, igual que el del catálogo.
                </p>
              </div>

              {vm.detalle.items.length === 0 ? (
                <p className="text-[13px] text-slate-400 py-4 text-center">
                  La lista no fija ningún precio todavía.
                  {vm.detalle.ajustePorcentaje !== null
                    ? ` Con el ajuste del ${vm.detalle.ajustePorcentaje}% ya se aplica a todo el catálogo.`
                    : ' Sin precios ni ajuste, el cliente paga el precio de catálogo.'}
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-[13px]">
                    <thead>
                      <tr className="text-left text-slate-400 border-b border-slate-100 dark:border-slate-700">
                        <th className="py-2 pr-3 font-semibold">Código</th>
                        <th className="py-2 pr-3 font-semibold">Producto</th>
                        <th className="py-2 pr-3 font-semibold text-right">Catálogo</th>
                        <th className="py-2 pr-3 font-semibold text-right">Esta lista</th>
                        <th className="py-2 pr-3 font-semibold text-right">Dif.</th>
                        <th className="py-2 w-10" />
                      </tr>
                    </thead>
                    <tbody>
                      {vm.detalle.items.map((i) => (
                        <tr key={i.id} className="border-b border-slate-50 dark:border-slate-700/50">
                          <td className="py-2 pr-3 font-mono text-slate-500">{i.codigo}</td>
                          <td className="py-2 pr-3 text-slate-700 dark:text-slate-200">{i.descripcion}</td>
                          <td className="py-2 pr-3 text-right tabular-nums text-slate-400">
                            {soles(i.precioDeLista)}
                          </td>
                          <td className="py-2 pr-3 text-right tabular-nums font-semibold text-slate-700 dark:text-slate-200">
                            {soles(i.precio)}
                          </td>
                          <td
                            className={`py-2 pr-3 text-right tabular-nums font-semibold ${
                              (i.diferenciaPorcentaje ?? 0) < 0
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : (i.diferenciaPorcentaje ?? 0) > 0
                                  ? 'text-amber-600 dark:text-amber-400'
                                  : 'text-slate-400'
                            }`}
                          >
                            {i.diferenciaPorcentaje === null
                              ? '—'
                              : `${i.diferenciaPorcentaje > 0 ? '+' : ''}${i.diferenciaPorcentaje}%`}
                          </td>
                          <td className="py-2 text-right">
                            <button
                              title="Quitar de la lista"
                              onClick={() => void vm.quitarPrecio(i.productoId)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20"
                            >
                              <Icon icon="solar:close-circle-linear" width={15} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ListasPrecio;
