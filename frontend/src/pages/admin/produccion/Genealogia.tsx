"use client";
import { Icon } from '@iconify/react';
import moment from 'moment';
import {
  useGenealogiaViewModel,
  soles,
  type CompraDeOrigen,
} from '@/features/admin/produccion/useGenealogiaViewModel';

const ACCENT = 'var(--accent, #7551FF)';
const CARD = 'bg-white dark:bg-slate-800 rounded-3xl shadow-[0_2px_20px_rgba(15,23,42,0.05)] dark:shadow-none';

/** De dónde entró un insumo: la compra concreta, con su proveedor. */
const VinoDe = ({ compras }: { compras: CompraDeOrigen[] }) => {
  if (!compras.length) return null;
  return (
    <div className="mt-1 space-y-0.5">
      {compras.map((v) => (
        <p key={`${v.compraId}-${v.documento}`} className="text-[11px] text-slate-400 dark:text-slate-500">
          <Icon icon="solar:arrow-left-down-linear" className="inline text-xs mr-1" />
          entró por <span className="font-mono text-slate-500 dark:text-slate-400">{v.documento}</span>
          {v.proveedor ? ` · ${v.proveedor}` : ''} · {v.cantidad} a {soles(v.costoUnitario)}
        </p>
      ))}
    </div>
  );
};

const Genealogia = () => {
  const vm = useGenealogiaViewModel();
  const d = vm.datos;

  return (
    <div className="min-h-screen -m-5 p-5 bg-[#F7F8FB] dark:bg-[#0A0D14] font-jakarta">
      <div className="flex items-center gap-2 text-sm text-slate-400 dark:text-gray-400 mb-5">
        <Icon icon="solar:home-smile-linear" className="text-base" />
        <span>Panel</span>
        <Icon icon="solar:alt-arrow-right-linear" className="text-xs" />
        <span>Producción</span>
        <Icon icon="solar:alt-arrow-right-linear" className="text-xs" />
        <span className="font-semibold" style={{ color: ACCENT }}>Genealogía</span>
      </div>

      <div className="mb-5">
        <h1 className="text-[22px] font-extrabold text-slate-800 dark:text-white tracking-tight">Genealogía del producto</h1>
        <p className="text-sm text-slate-400 dark:text-gray-400 mt-0.5">
          De qué está hecho, qué se consumió de verdad en cada lote y de qué compra vino cada insumo.
        </p>
      </div>

      <div className={`${CARD} p-4 mb-5`}>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-[260px] relative">
            <Icon icon="solar:magnifer-linear" className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={vm.busqueda}
              onChange={(e) => vm.setBusqueda(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') void vm.buscar(); }}
              placeholder="Código del producto — por ejemplo 104-90VARI-0001"
              className="h-11 w-full rounded-2xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 pl-10 pr-3 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-300"
            />
          </div>
          <button
            type="button"
            onClick={() => void vm.buscar()}
            disabled={vm.cargando || !vm.busqueda.trim()}
            className="h-11 px-5 rounded-2xl text-white text-sm font-bold inline-flex items-center gap-1.5 shadow-lg shadow-violet-500/30 disabled:opacity-50 disabled:shadow-none"
            style={{ background: ACCENT }}
          >
            <Icon icon="solar:magnifer-bold" className="text-lg" />
            {vm.cargando ? 'Buscando…' : 'Ver genealogía'}
          </button>
        </div>
        {!d && vm.sugerencias.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="text-xs text-slate-400">Productos que Kaiser fabrica:</span>
            {vm.sugerencias.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => { vm.setBusqueda(s.codigo); void vm.buscar(s.codigo); }}
                className="rounded-full border border-slate-200 dark:border-slate-600 px-3 py-1 text-xs font-mono text-slate-600 dark:text-slate-300 hover:border-violet-400 hover:text-violet-600"
                title={s.descripcion}
              >
                {s.codigo}
              </button>
            ))}
          </div>
        )}
      </div>

      {!d ? (
        <div className={`${CARD} p-12 text-center`}>
          <Icon icon="solar:sitemap-linear" className="text-4xl text-slate-300 mx-auto mb-2" />
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Busca un producto para ver con qué se fabricó y a dónde fue.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          <div className={`${CARD} p-5`}>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="font-mono text-sm font-bold" style={{ color: ACCENT }}>{d.producto.codigo}</p>
                <h2 className="text-lg font-extrabold text-slate-800 dark:text-white">{d.producto.descripcion}</h2>
                <span className={`mt-2 inline-flex items-center gap-1 rounded-full px-3 py-0.5 text-[11px] font-bold ${d.esFabricado ? 'bg-violet-50 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'}`}>
                  <Icon icon={d.esFabricado ? 'solar:settings-minimalistic-bold' : 'solar:cart-large-minimalistic-bold'} />
                  {d.esFabricado ? 'Se fabrica' : 'Se compra'}
                </span>
              </div>
              <div className="flex gap-6 text-right">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Stock</p>
                  <p className="text-xl font-extrabold text-slate-800 dark:text-white">{d.producto.stock} {d.producto.unidad ?? ''}</p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Costo promedio</p>
                  <p className="text-xl font-extrabold text-slate-800 dark:text-white">{soles(d.producto.costoPromedio)}</p>
                </div>
              </div>
            </div>
          </div>

          {d.receta && (
            <div className={`${CARD} p-6`}>
              <div className="flex flex-wrap items-center gap-2.5 mb-1">
                <div className="h-8 w-8 rounded-xl grid place-items-center bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400">
                  <Icon icon="solar:clipboard-list-linear" className="text-lg" />
                </div>
                <h3 className="text-base font-extrabold text-slate-800 dark:text-white">De qué está hecho</h3>
                <span className="text-xs text-slate-400">
                  receta {d.receta.codigo} v{d.receta.version} · rinde {d.receta.rendimiento} {d.receta.unidadRendimiento}
                  {d.versionesDeReceta > 1 ? ` · ${d.versionesDeReceta} versiones` : ''}
                </span>
              </div>
              <p className="text-xs text-slate-400 mb-4">Lo que la receta dice que lleva cada unidad.</p>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-[11px] uppercase tracking-wide text-slate-400 border-b border-slate-100 dark:border-slate-700">
                      <th className="text-left py-2 pr-3">Componente</th>
                      <th className="text-right py-2 pr-3 w-32">Por unidad</th>
                      <th className="text-right py-2 pr-3 w-28">Merma esp.</th>
                      <th className="text-right py-2 w-32">Costo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {d.receta.componentes.map((c) => (
                      <tr key={c.productoId} className="border-b border-slate-50 dark:border-slate-700/50 last:border-0 align-top">
                        <td className="py-2.5 pr-3">
                          <p className="font-mono text-xs font-semibold text-slate-700 dark:text-slate-200">{c.codigo}</p>
                          <p className="text-sm text-slate-600 dark:text-slate-300">{c.descripcion}</p>
                          <VinoDe compras={c.vinoDe} />
                        </td>
                        <td className="py-2.5 pr-3 text-right font-mono text-sm text-slate-800 dark:text-white whitespace-nowrap">{c.cantidadBase} {c.unidad}</td>
                        <td className="py-2.5 pr-3 text-right text-sm text-slate-500">{c.mermaEsperadaPorcentaje != null ? `${c.mermaEsperadaPorcentaje} %` : '—'}</td>
                        <td className="py-2.5 text-right font-mono text-sm text-slate-600 dark:text-slate-300">{soles(c.costoPromedio)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className={`${CARD} p-6`}>
            <div className="flex flex-wrap items-center gap-2.5 mb-1">
              <div className="h-8 w-8 rounded-xl grid place-items-center bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400">
                <Icon icon="solar:box-linear" className="text-lg" />
              </div>
              <h3 className="text-base font-extrabold text-slate-800 dark:text-white">Lo que llevó de verdad</h3>
              <span className="text-xs text-slate-400">{d.ordenes.length} orden(es) de producción</span>
            </div>
            <p className="text-xs text-slate-400 mb-4">
              Lote a lote: lo teórico frente a lo consumido. La diferencia es la merma, y tiene su costo.
            </p>
            {d.ordenes.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-400">Todavía no se ha fabricado ningún lote.</p>
            ) : (
              <div className="space-y-3">
                {d.ordenes.map((o) => {
                  const abierta = vm.expandidas.has(o.id);
                  return (
                    <div key={o.id} className="rounded-2xl border border-slate-100 dark:border-slate-700 overflow-hidden">
                      <button
                        type="button"
                        onClick={() => vm.toggleOrden(o.id)}
                        className="w-full flex flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-700/40"
                      >
                        <Icon icon={abierta ? 'solar:alt-arrow-down-linear' : 'solar:alt-arrow-right-linear'} className="text-slate-400" />
                        <span className="font-mono text-xs font-bold text-slate-700 dark:text-slate-200">{o.lote}</span>
                        <span className="text-[11px] font-bold uppercase tracking-wide text-slate-400">{o.estado}</span>
                        <span className="text-sm text-slate-600 dark:text-slate-300">produjo <strong>{o.cantidadProducida}</strong> de {o.cantidadObjetivo}</span>
                        {o.mermaTotal > 0 && (
                          <span className="rounded-full bg-amber-50 dark:bg-amber-900/30 px-2.5 py-0.5 text-[11px] font-bold text-amber-700 dark:text-amber-300">
                            merma {o.mermaTotal} · {soles(o.costoMerma)}
                          </span>
                        )}
                        {o.desviacionPorcentaje != null && o.desviacionPorcentaje !== 0 && (
                          <span className={`text-[11px] font-bold ${o.desviacionPorcentaje > 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                            {o.desviacionPorcentaje > 0 ? '+' : ''}{o.desviacionPorcentaje} % sobre lo teórico
                          </span>
                        )}
                        <span className="ml-auto text-sm font-mono text-slate-800 dark:text-white">
                          {o.costoUnitario != null ? `${soles(o.costoUnitario)} / unidad` : soles(o.costoProduccion)}
                        </span>
                      </button>
                      {abierta && (
                        <div className="px-4 pb-4 bg-slate-50/70 dark:bg-slate-900/40">
                          <div className="flex flex-wrap gap-6 py-3 text-xs text-slate-500 dark:text-slate-400">
                            <span>Consumo <strong className="font-mono text-slate-700 dark:text-slate-200">{soles(o.costoConsumo)}</strong></span>
                            <span>Merma <strong className="font-mono text-slate-700 dark:text-slate-200">{soles(o.costoMerma)}</strong></span>
                            <span>Total <strong className="font-mono text-slate-700 dark:text-slate-200">{soles(o.costoProduccion)}</strong></span>
                            {o.responsable && <span>Responsable: {o.responsable}</span>}
                            {o.fechaFin && <span>Cerrada el {moment(o.fechaFin).format('DD/MM/YYYY')}</span>}
                          </div>
                          <div className="overflow-x-auto">
                            <table className="w-full">
                              <thead>
                                <tr className="text-[11px] uppercase tracking-wide text-slate-400">
                                  <th className="text-left py-1 pr-3">Componente</th>
                                  <th className="text-right py-1 pr-3 w-24">Teórico</th>
                                  <th className="text-right py-1 pr-3 w-24">Consumido</th>
                                  <th className="text-right py-1 pr-3 w-24">Merma</th>
                                  <th className="text-right py-1 w-28">Costo</th>
                                </tr>
                              </thead>
                              <tbody>
                                {o.componentes.map((c) => (
                                  <tr key={c.productoId} className="border-t border-slate-100 dark:border-slate-700/50 align-top">
                                    <td className="py-2 pr-3">
                                      <p className="font-mono text-xs text-slate-700 dark:text-slate-200">{c.codigo}</p>
                                      <p className="text-xs text-slate-500 dark:text-slate-400">{c.descripcion}</p>
                                      <VinoDe compras={c.vinoDe} />
                                    </td>
                                    <td className="py-2 pr-3 text-right font-mono text-sm text-slate-500">{c.cantidadTeorica}</td>
                                    <td className="py-2 pr-3 text-right font-mono text-sm text-slate-800 dark:text-white">{c.cantidadConsumida}</td>
                                    <td className={`py-2 pr-3 text-right font-mono text-sm ${c.mermaCantidad > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-300'}`}>{c.mermaCantidad || '—'}</td>
                                    <td className="py-2 text-right font-mono text-sm text-slate-600 dark:text-slate-300">{soles(c.costoTotal)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className={`${CARD} p-6`}>
              <div className="flex items-center gap-2.5 mb-4">
                <div className="h-8 w-8 rounded-xl grid place-items-center bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400">
                  <Icon icon="solar:arrow-right-up-linear" className="text-lg" />
                </div>
                <h3 className="text-base font-extrabold text-slate-800 dark:text-white">A dónde fue</h3>
              </div>
              {d.salidas.length === 0 ? (
                <p className="text-sm text-slate-400">Todavía no se ha vendido.</p>
              ) : (
                <div className="space-y-2">
                  {d.salidas.map((s) => (
                    <div key={`${s.comprobanteId}-${s.documento}`} className="flex items-center justify-between gap-3 text-sm border-b border-slate-50 dark:border-slate-700/50 pb-2 last:border-0">
                      <div className="min-w-0">
                        <p className="font-mono text-xs font-semibold text-slate-700 dark:text-slate-200">{s.documento}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{s.cliente ?? 'sin cliente'}</p>
                      </div>
                      <div className="text-right whitespace-nowrap">
                        <p className="font-mono text-slate-800 dark:text-white">{s.cantidad}</p>
                        <p className="text-xs text-slate-400">{moment(s.fecha).format('DD/MM/YYYY')}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className={`${CARD} p-6`}>
              <div className="flex items-center gap-2.5 mb-4">
                <div className="h-8 w-8 rounded-xl grid place-items-center bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400">
                  <Icon icon="solar:sitemap-linear" className="text-lg" />
                </div>
                <h3 className="text-base font-extrabold text-slate-800 dark:text-white">Se usa para fabricar</h3>
              </div>
              {d.seUsaEn.length === 0 ? (
                <p className="text-sm text-slate-400">No es insumo de ninguna otra receta.</p>
              ) : (
                <div className="space-y-2">
                  {d.seUsaEn.map((u) => (
                    <button
                      key={u.recetaId}
                      type="button"
                      onClick={() => { vm.setBusqueda(u.productoFinalCodigo); void vm.buscar(u.productoFinalCodigo); }}
                      className="w-full flex items-center justify-between gap-3 text-left text-sm border-b border-slate-50 dark:border-slate-700/50 pb-2 last:border-0 hover:opacity-70"
                    >
                      <div className="min-w-0">
                        <p className="font-mono text-xs font-semibold" style={{ color: ACCENT }}>{u.productoFinalCodigo}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{u.productoFinalDescripcion}</p>
                      </div>
                      <span className="text-xs font-mono text-slate-600 dark:text-slate-300 whitespace-nowrap">
                        {u.cantidadPorUnidad} {u.unidad} c/u
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Genealogia;
