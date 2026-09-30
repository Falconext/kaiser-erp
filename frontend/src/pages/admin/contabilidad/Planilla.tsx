"use client";
import { Icon } from '@iconify/react';
import moment from 'moment';
import {
  usePlanillaViewModel,
  MESES,
  soles,
} from '@/features/admin/contabilidad/usePlanillaViewModel';

const ACCENT = 'var(--accent, #7551FF)';
const CARD = 'bg-white dark:bg-slate-800 rounded-3xl shadow-[0_2px_20px_rgba(15,23,42,0.05)] dark:shadow-none';
const INPUT = 'h-10 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-300';

const Planilla = () => {
  const vm = usePlanillaViewModel();
  const p = vm.previa;
  const anios = Array.from({ length: 6 }, (_, i) => new Date().getFullYear() + 1 - i);

  return (
    <div className="min-h-screen -m-5 p-5 bg-[#F7F8FB] dark:bg-[#0A0D14] font-jakarta">
      <div className="flex items-center gap-2 text-sm text-slate-400 dark:text-gray-400 mb-5">
        <Icon icon="solar:home-smile-linear" className="text-base" />
        <span>Panel</span>
        <Icon icon="solar:alt-arrow-right-linear" className="text-xs" />
        <span>Contabilidad</span>
        <Icon icon="solar:alt-arrow-right-linear" className="text-xs" />
        <span className="font-semibold" style={{ color: ACCENT }}>Planilla</span>
      </div>

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-5">
        <div className="min-w-0">
          <h1 className="text-[22px] font-extrabold text-slate-800 dark:text-white tracking-tight">Planilla</h1>
          <p className="text-sm text-slate-400 dark:text-gray-400 mt-0.5">
            El sistema no calcula la planilla: la recibe. Súbela como la calculas hoy y entra sola al gasto y a la contabilidad.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void vm.descargarPlantilla()}
          className="h-11 px-4 rounded-2xl text-sm font-bold inline-flex items-center gap-1.5 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 shrink-0"
        >
          <Icon icon="solar:download-minimalistic-linear" className="text-lg" />
          Descargar plantilla
        </button>
      </div>

      {/* Subir */}
      {vm.puedeEscribir && (
        <div className={`${CARD} p-5 mb-5`}>
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Mes</label>
              <select value={vm.mes} onChange={(e) => vm.setMes(Number(e.target.value))} className={`${INPUT} w-40`}>
                {MESES.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Año</label>
              <select value={vm.anio} onChange={(e) => vm.setAnio(Number(e.target.value))} className={`${INPUT} w-28`}>
                {anios.map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            <div className="flex-1 min-w-[240px]">
              <label className="block text-xs font-semibold text-slate-500 mb-1">Archivo de la planilla</label>
              <input
                ref={vm.inputArchivo}
                type="file"
                accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                onChange={(e) => void vm.elegirArchivo(e.target.files?.[0] ?? null)}
                className="block w-full text-sm text-slate-600 dark:text-slate-300 file:mr-3 file:h-10 file:rounded-xl file:border-0 file:bg-violet-50 dark:file:bg-violet-900/30 file:px-4 file:text-sm file:font-bold file:text-violet-700 dark:file:text-violet-300 hover:file:brightness-95"
              />
            </div>
          </div>
          {vm.trabajando && !p && <p className="mt-3 text-sm text-slate-500">Leyendo el archivo…</p>}
        </div>
      )}

      {/* Vista previa */}
      {p && (
        <div className={`${CARD} p-6 mb-5`}>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div>
              <h3 className="text-base font-extrabold text-slate-800 dark:text-white">
                Vista previa · {MESES[vm.mes - 1]} {vm.anio}
              </h3>
              <p className="text-xs text-slate-400">
                {p.errores.length ? 'Corrige lo de abajo antes de importar.' : 'Todavía no se ha escrito nada.'}
              </p>
            </div>
            {p.yaImportada && (
              <span className="rounded-full bg-amber-50 dark:bg-amber-900/30 px-3 py-1 text-xs font-bold text-amber-700 dark:text-amber-300">
                Este mes ya se importó ({p.yaImportada.trabajadores} trabajadores)
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-4">
            {[
              { label: 'Trabajadores', valor: String(p.totales.trabajadores) },
              { label: 'Ingresos', valor: soles(p.totales.totalIngresos) },
              { label: 'Descuentos', valor: soles(p.totales.totalDescuentos) },
              { label: 'Neto a pagar', valor: soles(p.totales.neto) },
              { label: 'EsSalud (empleador)', valor: soles(p.totales.essalud) },
            ].map((k) => (
              <div key={k.label} className="rounded-2xl border border-slate-100 dark:border-slate-700 p-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{k.label}</p>
                <p className="text-lg font-extrabold text-slate-800 dark:text-white">{k.valor}</p>
              </div>
            ))}
          </div>

          {p.errores.length > 0 && (
            <div className="rounded-2xl bg-red-50 dark:bg-red-900/20 p-4 mb-4">
              <p className="text-xs font-bold uppercase tracking-wide text-red-700 dark:text-red-400 mb-1">
                {p.errores.length} problema(s) que impiden importar
              </p>
              <div className="max-h-44 overflow-y-auto space-y-0.5">
                {p.errores.map((e, i) => (
                  <p key={i} className="text-xs text-red-700 dark:text-red-300">{e}</p>
                ))}
              </div>
            </div>
          )}

          {p.avisos.length > 0 && (
            <div className="rounded-2xl bg-amber-50 dark:bg-amber-900/20 p-4 mb-4">
              <p className="text-xs font-bold uppercase tracking-wide text-amber-700 dark:text-amber-400 mb-1">
                {p.avisos.length} aviso(s): se importa igual
              </p>
              <div className="max-h-32 overflow-y-auto space-y-0.5">
                {p.avisos.map((a, i) => (
                  <p key={i} className="text-xs text-amber-700 dark:text-amber-300">{a}</p>
                ))}
              </div>
            </div>
          )}

          {p.columnasIgnoradas.length > 0 && (
            <p className="text-xs text-slate-400 mb-3">
              Columnas del archivo que no se usan: {p.columnasIgnoradas.join(', ')}
            </p>
          )}

          {p.filas.length > 0 && (
            <div className="max-h-64 overflow-y-auto rounded-2xl border border-slate-100 dark:border-slate-700 mb-4">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-white dark:bg-slate-800">
                  <tr className="text-[11px] uppercase tracking-wide text-slate-400 border-b border-slate-100 dark:border-slate-700">
                    <th className="text-left px-3 py-2">Trabajador</th>
                    <th className="text-right px-3 py-2">Ingresos</th>
                    <th className="text-right px-3 py-2">Descuentos</th>
                    <th className="text-right px-3 py-2">Neto</th>
                  </tr>
                </thead>
                <tbody>
                  {p.filas.map((f) => (
                    <tr key={f.fila} className="border-b border-slate-50 dark:border-slate-700/50 last:border-0">
                      <td className="px-3 py-1.5">
                        <span className="text-slate-700 dark:text-slate-200">{f.nombres}</span>
                        {f.dni && <span className="ml-2 font-mono text-[11px] text-slate-400">{f.dni}</span>}
                      </td>
                      <td className="px-3 py-1.5 text-right font-mono text-slate-600 dark:text-slate-300">{soles(f.totalIngresos)}</td>
                      <td className="px-3 py-1.5 text-right font-mono text-slate-500">{soles(f.totalDescuentos)}</td>
                      <td className="px-3 py-1.5 text-right font-mono text-slate-800 dark:text-white">{soles(f.neto)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-700">
            <span className="text-sm text-slate-500">
              Le cuesta a la empresa <strong className="font-mono text-slate-800 dark:text-white">{soles(p.totales.totalIngresos + p.totales.essalud)}</strong>
              <span className="text-xs text-slate-400"> (ingresos + EsSalud)</span>
            </span>
            <button
              type="button"
              onClick={() => void vm.confirmar()}
              disabled={vm.trabajando || p.errores.length > 0 || !!p.yaImportada}
              className="h-10 px-5 rounded-xl text-white text-sm font-bold inline-flex items-center gap-1.5 disabled:opacity-50"
              style={{ background: ACCENT }}
            >
              <Icon icon="solar:check-circle-bold" className="text-lg" />
              {vm.trabajando ? 'Importando…' : 'Importar y contabilizar'}
            </button>
          </div>
        </div>
      )}

      {/* Historial */}
      <div className={`${CARD} overflow-hidden`}>
        <div className="px-6 pt-5 pb-3">
          <h3 className="text-base font-extrabold text-slate-800 dark:text-white">Planillas importadas</h3>
          <p className="text-xs text-slate-400">Cada una con su asiento. El detalle por trabajador queda guardado.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-[11px] uppercase tracking-wide text-slate-400 border-b border-slate-100 dark:border-slate-700">
                <th className="text-left px-6 py-3">Período</th>
                <th className="text-right px-4 py-3">Trabajadores</th>
                <th className="text-right px-4 py-3">Neto</th>
                <th className="text-right px-4 py-3">Costo empresa</th>
                <th className="text-left px-4 py-3">Asiento</th>
                <th className="text-left px-4 py-3">Importó</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {vm.historial.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <Icon icon="solar:users-group-rounded-linear" className="text-4xl text-slate-300 mx-auto mb-2" />
                    <p className="text-sm text-slate-500 dark:text-slate-400">Todavía no se ha importado ninguna planilla.</p>
                  </td>
                </tr>
              ) : (
                vm.historial.map((h) => (
                  <tr key={h.id} className="border-b border-slate-50 dark:border-slate-700/50 last:border-0">
                    <td className="px-6 py-3 font-semibold text-slate-800 dark:text-white">{MESES[h.mes - 1]} {h.anio}</td>
                    <td className="px-4 py-3 text-right font-mono text-slate-700 dark:text-slate-200">{h.trabajadores}</td>
                    <td className="px-4 py-3 text-right font-mono text-slate-700 dark:text-slate-200">{soles(h.totalNeto)}</td>
                    <td className="px-4 py-3 text-right font-mono text-slate-800 dark:text-white">{soles(h.costoEmpresa)}</td>
                    <td className="px-4 py-3">
                      {h.asiento ? (
                        <span className={`font-mono text-xs ${h.asiento.estado === 'EXTORNADO' ? 'text-slate-400 line-through' : 'text-slate-700 dark:text-slate-200'}`}>
                          {h.asiento.cuo}
                        </span>
                      ) : <span className="text-xs text-slate-400">—</span>}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400">
                      {h.importadoPor ?? '—'}
                      <span className="block text-[11px] text-slate-400">{moment(h.creadoEn).format('DD/MM/YYYY')}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {vm.puedeEscribir && (
                        <button
                          type="button"
                          onClick={() => void vm.eliminar(h.id)}
                          className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                          title="Solo si su asiento ya fue extornado"
                        >
                          <Icon icon="solar:trash-bin-minimalistic-linear" className="text-base" />
                          Eliminar
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Planilla;
