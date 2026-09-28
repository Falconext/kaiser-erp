import React from 'react';
import moment from 'moment';
import { Icon } from '@iconify/react';
import { useConsolidadoViewModel } from './useConsolidadoViewModel';
import {
  ETIQUETA_MOVIMIENTO, PESTANAS,
  type FilaConsolidado, type TipoConsolidado,
} from './ConsolidadoModel';

const ACCENT = 'var(--accent, #7551FF)';

const soles = (n: number | null | undefined) =>
  n == null
    ? '—'
    : `S/ ${Number(n).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const dec = (n: number) => {
  const v = Number(n);
  return Number.isInteger(v) ? String(v) : v.toFixed(3).replace(/0+$/, '').replace(/\.$/, '');
};

const colorTipo = (t: string) =>
  t === 'INGRESO'
    ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400'
    : t === 'SALIDA'
      ? 'bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400'
      : t === 'TRANSFERENCIA'
        ? 'bg-violet-50 text-violet-600 dark:bg-violet-900/20 dark:text-violet-400'
        : 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400';

export default function ConsolidadoView() {
  const vm = useConsolidadoViewModel();
  const { datos, actions } = vm;

  return (
    <div className="p-4 sm:p-6">
      <div className="flex items-center gap-2 text-sm text-slate-400 dark:text-gray-500 mb-5">
        <Icon icon="solar:home-smile-linear" className="text-base" />
        <span>Panel</span>
        <Icon icon="solar:alt-arrow-right-linear" className="text-xs" />
        <span>Inventario</span>
        <Icon icon="solar:alt-arrow-right-linear" className="text-xs" />
        <span className="font-semibold" style={{ color: ACCENT }}>Consolidado</span>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-11 w-11 grid place-items-center rounded-2xl bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400 shrink-0">
            <Icon icon="solar:clipboard-list-bold-duotone" width={24} height={24} />
          </div>
          <div className="min-w-0">
            <h1 className="text-[22px] font-extrabold text-slate-800 dark:text-white tracking-tight">
              Consolidado de almacén
            </h1>
            <p className="text-sm text-slate-400 dark:text-gray-500 mt-0.5">
              Qué se movió, de qué documento vino y quién lo registró. Todo en una sola vista, descargable.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={actions.descargarExcel}
          disabled={vm.descargando || !datos?.movimientos?.length}
          className="h-11 px-5 rounded-2xl text-white text-sm font-bold flex items-center justify-center gap-2 shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ background: ACCENT }}
        >
          <Icon icon={vm.descargando ? 'svg-spinners:ring-resize' : 'solar:file-download-bold'} width={18} />
          {vm.descargando ? 'Generando…' : 'Descargar Excel'}
        </button>
      </div>

      {/* Pestañas por tipo */}
      <div className="flex flex-wrap gap-2 mb-4">
        {PESTANAS.map((p) => {
          const activa = vm.tipo === p.valor;
          return (
            <button
              key={p.valor}
              type="button"
              onClick={() => vm.setTipo(p.valor as TipoConsolidado)}
              className={`h-10 px-4 rounded-2xl text-sm font-semibold flex items-center gap-2 border transition-colors ${
                activa
                  ? 'text-white border-transparent'
                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-slate-700'
              }`}
              style={activa ? { background: ACCENT } : undefined}
            >
              <Icon icon={p.icono} width={16} />
              {p.etiqueta}
            </button>
          );
        })}
      </div>

      {/* Filtros */}
      <div className="mb-5 p-5 bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-gray-500 mb-1.5">Desde</label>
            <input
              type="date"
              value={vm.desde}
              onChange={(e) => vm.setDesde(e.target.value)}
              className="w-full h-11 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-sm text-slate-700 dark:text-slate-200"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-gray-500 mb-1.5">Hasta</label>
            <input
              type="date"
              value={vm.hasta}
              onChange={(e) => vm.setHasta(e.target.value)}
              className="w-full h-11 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-sm text-slate-700 dark:text-slate-200"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-gray-500 mb-1.5">Sede</label>
            <select
              value={vm.sedeId}
              onChange={(e) => vm.setSedeId(e.target.value)}
              className="w-full h-11 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-sm text-slate-700 dark:text-slate-200"
            >
              <option value="">Todas las sedes</option>
              {vm.sedes.map((s: any) => (
                <option key={s.id} value={s.id}>{s.nombre}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Resumen */}
      {datos && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-5">
          <div className="rounded-3xl p-5 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-gray-500 mb-1">Movimientos</div>
            <div className="text-2xl font-extrabold text-slate-800 dark:text-white">{datos.resumen.movimientos}</div>
          </div>
          <div className="rounded-3xl p-5 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-gray-500 mb-1">Valor total</div>
            <div className="text-2xl font-extrabold text-slate-800 dark:text-white">{soles(datos.resumen.valorTotal)}</div>
          </div>
          {datos.resumen.porTipo.slice(0, 2).map((t) => (
            <div key={t.tipoMovimiento} className="rounded-3xl p-5 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-gray-500 mb-1">
                {ETIQUETA_MOVIMIENTO[t.tipoMovimiento] ?? t.tipoMovimiento}
              </div>
              <div className="text-2xl font-extrabold text-slate-800 dark:text-white">{t.movimientos}</div>
              <div className="text-xs text-slate-400 dark:text-gray-500 mt-0.5">
                {dec(t.cantidad)} und · {soles(t.valor)}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detalle */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Icon icon="solar:document-text-bold-duotone" width={18} className="text-violet-500" />
            <span className="font-bold text-slate-800 dark:text-white">Detalle</span>
          </div>
          {datos && (
            <span className="text-xs text-slate-400 dark:text-gray-500">
              {datos.movimientos.length} registro(s)
            </span>
          )}
        </div>

        {vm.cargando ? (
          <div className="py-20 text-center text-sm text-slate-400">
            <Icon icon="svg-spinners:ring-resize" width={28} className="mx-auto mb-2" />
            Cargando…
          </div>
        ) : !datos?.movimientos?.length ? (
          <div className="py-20 text-center">
            <Icon icon="solar:clipboard-remove-bold-duotone" width={44} className="mx-auto text-slate-200 dark:text-slate-700" />
            <p className="mt-3 text-sm text-slate-400 dark:text-gray-500">
              No hay movimientos en ese rango de fechas.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1180px]">
              <thead>
                <tr className="text-[11px] uppercase tracking-wide text-slate-400 dark:text-gray-500 border-b border-slate-100 dark:border-slate-700">
                  <th className="text-left font-medium py-3 px-4">Fecha mov.</th>
                  <th className="text-left font-medium py-3 px-3">Tipo</th>
                  <th className="text-left font-medium py-3 px-3">Documento</th>
                  <th className="text-left font-medium py-3 px-3">Cliente / Proveedor</th>
                  <th className="text-left font-medium py-3 px-3">Producto</th>
                  <th className="text-right font-medium py-3 px-3">Cantidad</th>
                  <th className="text-right font-medium py-3 px-3">Valor</th>
                  <th className="text-right font-medium py-3 px-3">Saldo</th>
                  <th className="text-left font-medium py-3 px-4">Sede / quién</th>
                </tr>
              </thead>
              <tbody>
                {datos.movimientos.map((m: FilaConsolidado) => (
                  <tr key={m.id} className="border-b border-slate-50 dark:border-slate-700/50 hover:bg-slate-50/60 dark:hover:bg-slate-700/30">
                    <td className="py-3 px-4 text-sm text-slate-700 dark:text-slate-200 whitespace-nowrap">
                      {moment(m.fecha).format('DD/MM/YYYY')}
                      {/* La fecha del documento cuando no coincide con la del
                          movimiento: es lo que almacén cruza al cuadrar. */}
                      {m.documentoFecha &&
                        !moment(m.documentoFecha).isSame(m.fecha, 'day') && (
                          <div className="text-xs text-slate-400" title="Fecha del documento">
                            doc. {moment(m.documentoFecha).format('DD/MM/YYYY')}
                          </div>
                        )}
                    </td>
                    <td className="py-3 px-3">
                      <span className={`inline-flex px-2.5 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap ${colorTipo(m.tipoMovimiento)}`}>
                        {ETIQUETA_MOVIMIENTO[m.tipoMovimiento] ?? m.tipoMovimiento}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-sm text-slate-600 dark:text-slate-300">
                      <div className="font-medium whitespace-nowrap">{m.documentoTipo}</div>
                      {m.documentoNumero && (
                        <div className="text-xs font-mono text-slate-400">{m.documentoNumero}</div>
                      )}
                    </td>
                    <td className="py-3 px-3 text-sm text-slate-600 dark:text-slate-300 max-w-[210px] truncate" title={m.contraparte ?? ''}>
                      {m.contraparte ?? <span className="text-slate-300 dark:text-slate-600">—</span>}
                    </td>
                    <td className="py-3 px-3 text-sm text-slate-600 dark:text-slate-300 max-w-[280px]">
                      <div className="truncate" title={m.descripcion ?? ''}>{m.descripcion ?? '—'}</div>
                      {m.codigo && <div className="text-xs font-mono text-slate-400">{m.codigo}</div>}
                    </td>
                    <td className={`py-3 px-3 text-right text-sm font-semibold whitespace-nowrap ${
                      m.tipoMovimiento === 'INGRESO'
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : m.tipoMovimiento === 'SALIDA'
                          ? 'text-rose-600 dark:text-rose-400'
                          : 'text-slate-600 dark:text-slate-300'
                    }`}>
                      {m.tipoMovimiento === 'SALIDA' ? '−' : m.tipoMovimiento === 'INGRESO' ? '+' : ''}
                      {dec(Math.abs(m.cantidad))}
                      {m.unidad && <span className="text-slate-400 font-normal"> {m.unidad}</span>}
                    </td>
                    <td className="py-3 px-3 text-right text-sm text-slate-600 dark:text-slate-300 whitespace-nowrap">
                      {soles(m.valorTotal)}
                    </td>
                    <td className="py-3 px-3 text-right text-sm whitespace-nowrap">
                      <span className="text-slate-400">{dec(m.stockAnterior)}</span>
                      <span className="mx-1 text-slate-300">→</span>
                      <span className="font-bold text-slate-800 dark:text-white">{dec(m.stockActual)}</span>
                    </td>
                    <td className="py-3 px-4 text-sm text-slate-600 dark:text-slate-300">
                      <div className="truncate max-w-[200px]" title={m.sede ?? ''}>{m.sede ?? '—'}</div>
                      <div className="text-xs text-slate-400 truncate max-w-[200px]">
                        {m.usuario ?? 'automático'}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
