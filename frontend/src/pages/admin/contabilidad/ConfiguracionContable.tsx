"use client";
import { Icon } from '@iconify/react';
import { useConfiguracionContableViewModel } from '@/features/admin/contabilidad/useConfiguracionContableViewModel';

const ACCENT = 'var(--accent, #7551FF)';
const CARD = 'bg-white dark:bg-slate-800 rounded-3xl shadow-[0_2px_20px_rgba(15,23,42,0.05)] dark:shadow-none';
const INPUT = 'h-10 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-300 disabled:opacity-60';

const ConfiguracionContable = () => {
  const vm = useConfiguracionContableViewModel();

  return (
    <div className="min-h-screen -m-5 p-5 bg-[#F7F8FB] dark:bg-[#0A0D14] font-jakarta">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-400 dark:text-gray-400 mb-5">
        <Icon icon="solar:home-smile-linear" className="text-base" />
        <span>Panel</span>
        <Icon icon="solar:alt-arrow-right-linear" className="text-xs" />
        <span>Contabilidad</span>
        <Icon icon="solar:alt-arrow-right-linear" className="text-xs" />
        <span className="font-semibold" style={{ color: ACCENT }}>Configuración contable</span>
      </div>

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-5">
        <div className="min-w-0">
          <h1 className="text-[22px] font-extrabold text-slate-800 dark:text-white tracking-tight">Configuración contable</h1>
          <p className="text-sm text-slate-400 dark:text-gray-400 mt-0.5">
            Qué cuenta usa cada operación al generar los asientos. Se cambia aquí, no en el código:
            si su contadora usa otras cuentas, no hace falta tocar el sistema.
          </p>
        </div>
        {vm.puedeEscribir && (
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={vm.descartar}
              disabled={!vm.hayCambios || vm.guardando}
              className="h-11 px-4 rounded-2xl text-sm font-bold inline-flex items-center gap-1.5 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40"
            >
              <Icon icon="solar:restart-linear" className="text-lg" />
              Descartar
            </button>
            <button
              type="button"
              onClick={vm.guardar}
              disabled={!vm.hayCambios || vm.guardando}
              className="h-11 px-4 rounded-2xl text-white text-sm font-bold inline-flex items-center gap-1.5 shadow-lg shadow-violet-500/30 hover:brightness-105 transition-all disabled:opacity-50 disabled:shadow-none"
              style={{ background: ACCENT }}
            >
              <Icon icon="solar:check-circle-bold" className="text-lg" />
              {vm.guardando ? 'Guardando…' : 'Guardar cambios'}
            </button>
          </div>
        )}
      </div>

      {/* Avisos */}
      {vm.sinConfigurar > 0 && (
        <div className={`${CARD} p-4 mb-5 flex items-start gap-3`}>
          <Icon icon="solar:danger-triangle-bold" className="text-xl text-amber-500 mt-0.5 shrink-0" />
          <p className="text-sm text-slate-600 dark:text-slate-300">
            <strong>{vm.sinConfigurar}</strong> {vm.sinConfigurar === 1 ? 'clave sin cuenta' : 'claves sin cuenta'}.
            La generación de asientos se detiene con un aviso claro en cuanto necesita una de ellas.
          </p>
        </div>
      )}

      {/* Bloques */}
      {vm.cargando ? (
        <div className={`${CARD} p-10 text-center text-sm text-slate-400`}>Cargando…</div>
      ) : (
        <div className="space-y-5">
          {vm.bloques.map((bloque) => (
            <div key={bloque.titulo} className={`${CARD} overflow-hidden`}>
              <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100 dark:border-slate-700">
                <div className="h-10 w-10 rounded-2xl grid place-items-center bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400">
                  <Icon icon={bloque.icono} className="text-xl" />
                </div>
                <h2 className="text-sm font-extrabold uppercase tracking-wide text-slate-600 dark:text-slate-300">{bloque.titulo}</h2>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-[11px] uppercase tracking-wide text-slate-400 border-b border-slate-100 dark:border-slate-700">
                      <th className="text-left px-5 py-2 w-72">Operación</th>
                      <th className="text-left px-5 py-2">Cuenta</th>
                      <th className="text-left px-5 py-2 w-28">Por defecto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bloque.filas.map((f) => {
                      const valor = vm.valorDe(f.clave);
                      const vacia = f.tipo === 'CUENTA' && !Number(valor);
                      return (
                        <tr key={f.clave} className="border-b border-slate-50 dark:border-slate-700/50 last:border-0">
                          <td className="px-5 py-3">
                            <p className="text-sm font-semibold text-slate-800 dark:text-white">{f.descripcion}</p>
                            <p className="font-mono text-[11px] text-slate-400">{f.clave}</p>
                          </td>
                          <td className="px-5 py-3">
                            {f.tipo === 'VALOR' ? (
                              // El único ajuste que no es una cuenta: generar o no el
                              // asiento de destino del gasto (94/95 contra 791).
                              <button
                                type="button"
                                role="switch"
                                aria-checked={valor === 'true'}
                                disabled={!vm.puedeEscribir}
                                onClick={() => vm.cambiar(f.clave, valor === 'true' ? 'false' : 'true')}
                                className={`inline-flex items-center gap-2.5 rounded-xl border px-3 py-2 text-sm font-semibold transition-colors disabled:opacity-60 ${
                                  valor === 'true'
                                    ? 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-300'
                                    : 'border-slate-200 text-slate-500 dark:border-slate-600 dark:text-slate-400'
                                }`}
                              >
                                <span className={`relative h-5 w-9 rounded-full transition-colors ${valor === 'true' ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'}`}>
                                  <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${valor === 'true' ? 'left-[18px]' : 'left-0.5'}`} />
                                </span>
                                {valor === 'true' ? 'Activado' : 'Desactivado'}
                              </button>
                            ) : (
                              <select
                                value={valor}
                                disabled={!vm.puedeEscribir}
                                onChange={(e) => vm.cambiar(f.clave, e.target.value)}
                                aria-label={f.descripcion}
                                className={`${INPUT} w-full max-w-xl ${vacia ? 'border-amber-300 dark:border-amber-500/50' : ''}`}
                              >
                                <option value="0">Sin configurar</option>
                                {vm.plan.map((c) => (
                                  <option key={c.id} value={c.id}>{c.codigo} — {c.denominacion}</option>
                                ))}
                              </select>
                            )}
                          </td>
                          <td className="px-5 py-3 font-mono text-xs text-slate-400">{f.porDefecto ?? '—'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {bloque.titulo.startsWith('Destino') && (
                <p className="px-5 pb-4 text-xs text-slate-400 dark:text-slate-500">
                  Con el destino activado, cada asiento de gasto lleva además su par 94/95 contra 791.
                  El PCGE lo deja opcional, pero la mayoría de contadoras lo piden: pregúntele a la suya
                  antes de apagarlo.
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {!vm.puedeEscribir && !vm.cargando && (
        <p className="mt-5 text-xs text-slate-400">
          Solo lectura: hace falta el permiso de contabilidad para cambiar el mapeo.
        </p>
      )}
    </div>
  );
};

export default ConfiguracionContable;
