import React from 'react';
import moment from 'moment';
import { Icon } from '@iconify/react';
import useOutsideClick from '@/hooks/useOutsideClick';
import { useTrazabilidadViewModel } from './useTrazabilidadViewModel';
import { ETIQUETA_MOVIMIENTO, type MovimientoTraza } from './TrazabilidadModel';

const ACCENT = 'var(--accent, #7551FF)';

const soles = (n: number | null | undefined) =>
  n == null ? '—' : `S/ ${Number(n).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const dec = (n: number) => {
  const v = Number(n);
  return Number.isInteger(v) ? String(v) : v.toFixed(3).replace(/0+$/, '').replace(/\.$/, '');
};

/** Color del tipo de movimiento, igual que en Ingresos y salidas. */
const colorTipo = (t: string) =>
  t === 'INGRESO'
    ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400'
    : t === 'SALIDA'
      ? 'bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400'
      : t === 'TRANSFERENCIA'
        ? 'bg-violet-50 text-violet-600 dark:bg-violet-900/20 dark:text-violet-400'
        : 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400';

/**
 * El desfase es el dato que almacén pidió para detectar omisiones: si una
 * factura del día 3 se registró el 12, el stock estuvo nueve días mintiendo.
 */
function Desfase({ dias }: { dias: number | null }) {
  if (dias == null) return <span className="text-slate-300 dark:text-slate-600">—</span>;
  if (dias <= 1) {
    return <span className="text-emerald-600 dark:text-emerald-400">al día</span>;
  }
  return (
    <span
      className="inline-flex items-center gap-1 font-semibold text-amber-600 dark:text-amber-400"
      title={`Se registró ${dias} días después de la fecha del documento`}
    >
      <Icon icon="solar:clock-circle-bold" width={14} height={14} />
      +{dias} d
    </span>
  );
}

function Tarjeta({
  titulo, valor, detalle, icono, tono = 'normal',
}: {
  titulo: string; valor: string; detalle?: string; icono: string;
  tono?: 'normal' | 'alerta';
}) {
  const alerta = tono === 'alerta';
  return (
    <div className={`rounded-3xl p-5 border ${
      alerta
        ? 'bg-amber-50/60 border-amber-200 dark:bg-amber-900/10 dark:border-amber-900/40'
        : 'bg-white border-slate-100 dark:bg-slate-800 dark:border-slate-700'
    }`}>
      <div className="flex items-center gap-2 mb-2">
        <Icon
          icon={icono}
          width={18}
          height={18}
          className={alerta ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400'}
        />
        <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-gray-500">
          {titulo}
        </span>
      </div>
      <div className={`text-2xl font-extrabold ${
        alerta ? 'text-amber-700 dark:text-amber-300' : 'text-slate-800 dark:text-white'
      }`}>
        {valor}
      </div>
      {detalle && (
        <div className="text-xs text-slate-400 dark:text-gray-500 mt-0.5">{detalle}</div>
      )}
    </div>
  );
}

export default function TrazabilidadView() {
  const vm = useTrazabilidadViewModel();
  const { traza, actions } = vm;
  // El hook trae su propio estado y su ref: cierra las sugerencias al hacer
  // clic fuera.
  const [mostrarSugerencias, setMostrarSugerencias, contenedorRef] = useOutsideClick(false);

  const buscar = (valor: string) => {
    setMostrarSugerencias(false);
    actions.consultar(valor);
  };

  const descuadrePorMovimiento = new Map(
    (traza?.descuadres ?? []).map((d) => [d.despuesDelMovimiento, d]),
  );

  return (
    <div className="p-4 sm:p-6">
      {/* Migaja */}
      <div className="flex items-center gap-2 text-sm text-slate-400 dark:text-gray-500 mb-5">
        <Icon icon="solar:home-smile-linear" className="text-base" />
        <span>Panel</span>
        <Icon icon="solar:alt-arrow-right-linear" className="text-xs" />
        <span>Inventario</span>
        <Icon icon="solar:alt-arrow-right-linear" className="text-xs" />
        <span className="font-semibold" style={{ color: ACCENT }}>Trazabilidad</span>
      </div>

      <div className="flex items-center gap-3 mb-5">
        <div className="h-11 w-11 grid place-items-center rounded-2xl bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400 shrink-0">
          <Icon icon="solar:route-bold-duotone" width={24} height={24} />
        </div>
        <div className="min-w-0">
          <h1 className="text-[22px] font-extrabold text-slate-800 dark:text-white tracking-tight">
            Trazabilidad por código
          </h1>
          <p className="text-sm text-slate-400 dark:text-gray-500 mt-0.5">
            Todo lo que le pasó a un producto, en orden, con quién lo registró y cuándo se tecleó frente a la fecha del documento.
          </p>
        </div>
      </div>

      {/* Buscador */}
      <div className="mb-5 p-5 bg-white dark:bg-slate-800 rounded-3xl shadow-[0_2px_20px_rgba(15,23,42,0.05)] dark:shadow-none border border-slate-100 dark:border-slate-700">
        <label className="block text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-gray-500 mb-2">
          Código o nombre del producto
        </label>
        <div className="relative" ref={contenedorRef}>
          <div className="flex gap-2">
            <input
              value={vm.busqueda}
              onChange={(e) => { vm.setBusqueda(e.target.value); setMostrarSugerencias(true); }}
              onFocus={() => setMostrarSugerencias(true)}
              onKeyDown={(e) => { if (e.key === 'Enter') buscar(vm.busqueda); }}
              placeholder="Ej.: 22530COVI0001 o MALLA CORTAVIENTOS"
              className="flex-1 h-11 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 text-sm text-slate-700 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/40"
            />
            <button
              type="button"
              onClick={() => buscar(vm.busqueda)}
              disabled={vm.cargando || !vm.busqueda.trim()}
              className="h-11 px-5 rounded-2xl text-white text-sm font-bold flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ background: ACCENT }}
            >
              <Icon icon={vm.cargando ? 'svg-spinners:ring-resize' : 'solar:magnifer-bold'} width={18} />
              {vm.cargando ? 'Buscando…' : 'Ver historial'}
            </button>
            {traza && (
              <button
                type="button"
                onClick={actions.limpiar}
                className="h-11 px-4 rounded-2xl border border-slate-200 dark:border-slate-700 text-sm text-slate-500 dark:text-gray-400 hover:bg-slate-50 dark:hover:bg-slate-700"
              >
                Limpiar
              </button>
            )}
          </div>

          {mostrarSugerencias && vm.sugerencias.length > 0 && (
            <div className="absolute z-20 mt-1 w-full max-h-72 overflow-auto rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-lg">
              {vm.sugerencias.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => { setMostrarSugerencias(false); actions.elegirSugerencia(p); }}
                  className="w-full text-left px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-700"
                >
                  <div className="text-xs font-mono text-violet-600 dark:text-violet-400">{p.codigo}</div>
                  <div className="text-sm text-slate-700 dark:text-slate-200 truncate">{p.descripcion}</div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {!traza && !vm.cargando && (
        <div className="py-20 text-center">
          <Icon icon="solar:route-bold-duotone" width={48} className="mx-auto text-slate-200 dark:text-slate-700" />
          <p className="mt-3 text-sm text-slate-400 dark:text-gray-500">
            Busca un producto para ver todo su historial de movimientos.
          </p>
        </div>
      )}

      {traza && (
        <>
          {/* Cabecera del producto */}
          <div className="mb-5 p-5 rounded-3xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
            <div className="text-xs font-mono text-violet-600 dark:text-violet-400">{traza.producto.codigo}</div>
            <div className="text-lg font-bold text-slate-800 dark:text-white">{traza.producto.descripcion}</div>
          </div>

          {/* Resumen */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-5">
            <Tarjeta
              titulo="Movimientos"
              valor={String(traza.resumen.movimientos)}
              detalle={
                traza.resumen.primerMovimiento
                  ? `Desde ${moment(traza.resumen.primerMovimiento).format('DD/MM/YYYY')}`
                  : undefined
              }
              icono="solar:list-bold-duotone"
            />
            <Tarjeta
              titulo="Stock actual"
              valor={dec(traza.resumen.stockActual)}
              detalle={traza.producto.unidadVenta ?? undefined}
              icono="solar:box-bold-duotone"
            />
            <Tarjeta
              titulo="Registrados tarde"
              valor={String(traza.resumen.registradosTarde)}
              detalle={
                traza.resumen.registradosTarde > 0
                  ? `Hasta ${traza.resumen.mayorDesfaseEnDias} días de desfase`
                  : 'Todo se registró el mismo día'
              }
              icono="solar:clock-circle-bold-duotone"
              tono={traza.resumen.registradosTarde > 0 ? 'alerta' : 'normal'}
            />
            <Tarjeta
              titulo="Descuadres"
              valor={String(traza.resumen.descuadres)}
              detalle={
                traza.resumen.descuadres > 0
                  ? 'El saldo no encadena: revisar'
                  : 'Los saldos encadenan'
              }
              icono="solar:danger-triangle-bold-duotone"
              tono={traza.resumen.descuadres > 0 ? 'alerta' : 'normal'}
            />
          </div>

          {traza.resumen.descuadres > 0 && (
            <div className="mb-5 p-4 rounded-2xl bg-amber-50 dark:bg-amber-900/15 border border-amber-200 dark:border-amber-900/40 text-sm text-amber-800 dark:text-amber-300">
              <span className="font-semibold">Hay saldos que no encadenan.</span>{' '}
              El stock final de un movimiento no coincide con el inicial del siguiente, lo que significa
              que el inventario se tocó por fuera del kardex. Las filas afectadas van marcadas abajo.
            </div>
          )}

          {/* Línea de tiempo */}
          <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 overflow-hidden mb-5">
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center gap-2.5">
              <Icon icon="solar:history-bold-duotone" width={18} className="text-violet-500" />
              <span className="font-bold text-slate-800 dark:text-white">Línea de tiempo</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1080px]">
                <thead>
                  <tr className="text-[11px] uppercase tracking-wide text-slate-400 dark:text-gray-500 border-b border-slate-100 dark:border-slate-700">
                    <th className="text-left font-medium py-3 px-4">Fecha doc.</th>
                    <th className="text-left font-medium py-3 px-3">Registrado</th>
                    <th className="text-left font-medium py-3 px-3">Desfase</th>
                    <th className="text-left font-medium py-3 px-3">Tipo</th>
                    <th className="text-left font-medium py-3 px-3">Documento</th>
                    <th className="text-left font-medium py-3 px-3">Sede</th>
                    <th className="text-right font-medium py-3 px-3">Cantidad</th>
                    <th className="text-right font-medium py-3 px-3">Saldo</th>
                    <th className="text-left font-medium py-3 px-4">Quién</th>
                  </tr>
                </thead>
                <tbody>
                  {traza.lineaDeTiempo.map((m: MovimientoTraza) => {
                    const desc = descuadrePorMovimiento.get(m.id);
                    return (
                      <tr
                        key={m.id}
                        className="border-b border-slate-50 dark:border-slate-700/50 hover:bg-slate-50/60 dark:hover:bg-slate-700/30"
                      >
                        <td className="py-3 px-4 text-sm text-slate-700 dark:text-slate-200 whitespace-nowrap">
                          {moment(m.documento.fecha ?? m.fecha).format('DD/MM/YYYY')}
                        </td>
                        <td className="py-3 px-3 text-sm text-slate-500 dark:text-gray-400 whitespace-nowrap">
                          {moment(m.registradoEn).format('DD/MM/YYYY HH:mm')}
                        </td>
                        <td className="py-3 px-3 text-xs whitespace-nowrap">
                          <Desfase dias={m.diasDeDesfase} />
                        </td>
                        <td className="py-3 px-3">
                          <span className={`inline-flex px-2.5 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap ${colorTipo(m.tipoMovimiento)}`}>
                            {ETIQUETA_MOVIMIENTO[m.tipoMovimiento] ?? m.tipoMovimiento}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-sm text-slate-600 dark:text-slate-300">
                          <div className="font-medium whitespace-nowrap">{m.documento.tipo}</div>
                          {m.documento.numero && (
                            <div className="text-xs font-mono text-slate-400">{m.documento.numero}</div>
                          )}
                        </td>
                        <td className="py-3 px-3 text-sm text-slate-500 dark:text-gray-400 max-w-[160px] truncate" title={m.sede?.nombre ?? ''}>
                          {m.sede?.nombre ?? '—'}
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
                        </td>
                        <td className="py-3 px-3 text-right text-sm whitespace-nowrap">
                          <span className="text-slate-400">{dec(m.stockAnterior)}</span>
                          <span className="mx-1 text-slate-300">→</span>
                          <span className="font-bold text-slate-800 dark:text-white">{dec(m.stockActual)}</span>
                          {desc && (
                            <div
                              className="text-[11px] text-amber-600 dark:text-amber-400"
                              title={`El siguiente movimiento arranca de ${dec(desc.encontrado)}`}
                            >
                              no encadena
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4 text-sm text-slate-600 dark:text-slate-300">
                          {m.usuario?.nombre ?? (
                            <span className="text-slate-400 italic">automático</span>
                          )}
                          <div className="text-xs text-slate-400 truncate max-w-[220px]" title={m.concepto}>
                            {m.concepto}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {traza.lineaDeTiempo.length === 0 && (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-sm text-slate-400">
                        Este producto todavía no tiene movimientos.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Quién tocó este código */}
          {traza.porUsuario.length > 0 && (
            <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center gap-2.5">
                <Icon icon="solar:users-group-rounded-bold-duotone" width={18} className="text-violet-500" />
                <span className="font-bold text-slate-800 dark:text-white">Quién movió este código</span>
              </div>
              <div className="divide-y divide-slate-50 dark:divide-slate-700/50">
                {traza.porUsuario.map((u) => (
                  <div key={u.usuario} className="px-5 py-3 flex items-center justify-between gap-4">
                    <div className="text-sm text-slate-700 dark:text-slate-200">{u.usuario}</div>
                    <div className="flex items-center gap-5 text-sm whitespace-nowrap">
                      <span className="text-slate-400">{u.movimientos} mov.</span>
                      <span className="text-emerald-600 dark:text-emerald-400">+{dec(u.ingresos)}</span>
                      <span className="text-rose-600 dark:text-rose-400">−{dec(u.salidas)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
