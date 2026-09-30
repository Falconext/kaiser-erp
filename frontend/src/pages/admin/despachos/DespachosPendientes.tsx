"use client";
import { Icon } from '@iconify/react';
import moment from 'moment';
import {
  useDespachosViewModel,
  ETIQUETA_TIPO,
  type FilaDespacho,
} from '@/features/admin/despachos/useDespachosViewModel';

const ACCENT = 'var(--accent, #7551FF)';
const CARD =
  'bg-white dark:bg-slate-800 rounded-3xl shadow-[0_2px_20px_rgba(15,23,42,0.05)] dark:shadow-none';

const Chip = ({ estado }: { estado: FilaDespacho['estado'] }) => {
  const mapa = {
    SIN_DESPACHAR: { txt: 'Sin despachar', cls: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300' },
    PARCIAL: { txt: 'A medias', cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' },
    COMPLETO: { txt: 'Completo', cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' },
  } as const;
  const m = mapa[estado];
  return <span className={`rounded-full text-[11px] font-bold px-2 py-0.5 ${m.cls}`}>{m.txt}</span>;
};

const Barra = ({ pct }: { pct: number }) => (
  <div className="h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
    <div
      className="h-full rounded-full transition-all"
      style={{
        width: `${Math.min(100, Math.max(0, pct))}%`,
        background: pct >= 100 ? '#10b981' : pct > 0 ? '#f59e0b' : '#f43f5e',
      }}
    />
  </div>
);

const DespachosPendientes = () => {
  const vm = useDespachosViewModel();
  const d = vm.datos;

  return (
    <div className="min-h-screen -m-5 p-5 bg-[#F7F8FB] dark:bg-[#0A0D14] font-jakarta">
      <div className="flex items-center gap-2 text-sm text-slate-400 dark:text-gray-400 mb-5">
        <Icon icon="solar:home-smile-linear" className="text-base" />
        <span>Panel</span>
        <Icon icon="solar:alt-arrow-right-linear" className="text-xs" />
        <span>Guías de Remisión</span>
        <Icon icon="solar:alt-arrow-right-linear" className="text-xs" />
        <span className="font-semibold" style={{ color: ACCENT }}>Despachos pendientes</span>
      </div>

      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-extrabold text-slate-800 dark:text-white tracking-tight">
            Despachos pendientes
          </h1>
          <p className="text-[13px] text-slate-400 mt-0.5 max-w-3xl">
            Qué se vendió y todavía no salió del almacén, unidad por unidad. Si de 10 se
            despacharon 4, aquí están las 6 que faltan. Un aviso sale solo cada mañana a las 7:45.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="inline-flex items-center gap-2 text-[12px] text-slate-500 dark:text-slate-400 cursor-pointer mr-1">
            <input
              type="checkbox"
              checked={vm.incluirCompletos}
              onChange={(e) => vm.setIncluirCompletos(e.target.checked)}
              className="accent-[var(--accent)]"
            />
            Ver también los completos
          </label>
          <button
            onClick={() => void vm.avisar()}
            className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-xl text-[13px] font-semibold text-white transition"
            style={{ background: ACCENT }}
          >
            <Icon icon="solar:bell-bing-linear" width={15} /> Avisar ahora
          </button>
          <button
            onClick={() => void vm.recargar()}
            className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-xl text-[13px] font-semibold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-[var(--accent)] transition"
          >
            <Icon icon="solar:refresh-linear" width={15} /> Actualizar
          </button>
        </div>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
        {[
          { t: 'Documentos pendientes', v: d?.total ?? 0, c: 'text-slate-800 dark:text-white' },
          { t: 'Sin despachar', v: d?.sinDespachar ?? 0, c: 'text-rose-600 dark:text-rose-400' },
          { t: 'Despachados a medias', v: d?.parciales ?? 0, c: 'text-amber-600 dark:text-amber-400' },
        ].map((k) => (
          <div key={k.t} className={`${CARD} p-4`}>
            <p className="text-[12px] text-slate-400">{k.t}</p>
            <p className={`text-[26px] font-extrabold tabular-nums ${k.c}`}>{k.v}</p>
          </div>
        ))}
      </div>

      <div className={`${CARD} p-5`}>
        {!vm.cargado ? (
          <p className="text-[13px] text-slate-400 py-6 text-center">Cargando…</p>
        ) : !d || d.filas.length === 0 ? (
          <div className="py-10 text-center">
            <Icon icon="solar:check-circle-bold-duotone" width={34} className="mx-auto text-emerald-400 mb-2" />
            <p className="text-[13px] font-semibold text-slate-600 dark:text-slate-300">
              No queda nada por despachar
            </p>
            <p className="text-[12px] text-slate-400 mt-1">
              Todas las ventas tienen su guía con las cantidades completas.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {d.filas.map((f) => (
              <div
                key={f.comprobanteId}
                className="rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden"
              >
                <button
                  onClick={() => vm.alternar(f.comprobanteId)}
                  className="w-full text-left p-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition"
                >
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                    <Icon
                      icon={vm.abierta === f.comprobanteId ? 'solar:alt-arrow-down-linear' : 'solar:alt-arrow-right-linear'}
                      width={14}
                      className="text-slate-400 shrink-0"
                    />
                    <span className="font-mono text-[13px] font-semibold text-slate-700 dark:text-slate-200">
                      {f.documento}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {ETIQUETA_TIPO[f.tipoDoc] ?? f.tipoDoc}
                    </span>
                    <Chip estado={f.estado} />
                    {f.conExceso && (
                      <span className="rounded-full bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300 text-[11px] font-bold px-2 py-0.5">
                        salió de más
                      </span>
                    )}
                    <span className="text-[12px] text-slate-500 dark:text-slate-400 truncate">
                      {f.cliente?.nombre ?? 'Sin cliente'}
                    </span>
                    <span className="ml-auto text-[12px] text-slate-400 shrink-0">
                      {moment(f.fechaEmision).format('DD/MM/YYYY')}
                      {f.diasDesdeEmision > 0 && (
                        <span className={f.diasDesdeEmision > 7 ? 'text-amber-600 dark:text-amber-400 font-semibold' : ''}>
                          {' '}· hace {f.diasDesdeEmision} d
                        </span>
                      )}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center gap-3">
                    <Barra pct={f.porcentajeDespachado} />
                    <span className="text-[11px] tabular-nums text-slate-500 shrink-0 w-32 text-right">
                      {f.porcentajeDespachado}% · faltan {f.unidadesPendientes}
                    </span>
                  </div>
                </button>

                {vm.abierta === f.comprobanteId && (
                  <div className="border-t border-slate-100 dark:border-slate-700 p-3.5 bg-slate-50/60 dark:bg-slate-900/40">
                    <div className="overflow-x-auto">
                      <table className="w-full text-[12.5px]">
                        <thead>
                          <tr className="text-left text-slate-400">
                            <th className="pb-1.5 pr-3 font-semibold">Código</th>
                            <th className="pb-1.5 pr-3 font-semibold">Producto</th>
                            <th className="pb-1.5 pr-3 font-semibold text-right">Vendido</th>
                            <th className="pb-1.5 pr-3 font-semibold text-right">Despachado</th>
                            <th className="pb-1.5 font-semibold text-right">Falta</th>
                          </tr>
                        </thead>
                        <tbody>
                          {f.detalle.map((l) => (
                            <tr key={l.productoId} className="border-t border-slate-100 dark:border-slate-700/50">
                              <td className="py-1.5 pr-3 font-mono text-slate-500">{l.codigo}</td>
                              <td className="py-1.5 pr-3 text-slate-700 dark:text-slate-200">{l.descripcion}</td>
                              <td className="py-1.5 pr-3 text-right tabular-nums text-slate-500">
                                {l.vendida} {l.unidad ?? ''}
                              </td>
                              <td className="py-1.5 pr-3 text-right tabular-nums text-slate-500">
                                {l.despachada}
                                {l.deMas > 0 && (
                                  <span className="text-violet-600 dark:text-violet-400 font-semibold"> (+{l.deMas})</span>
                                )}
                              </td>
                              <td className={`py-1.5 text-right tabular-nums font-bold ${l.pendiente > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-300'}`}>
                                {l.pendiente}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {f.guias.length > 0 ? (
                      <p className="text-[11.5px] text-slate-500 dark:text-slate-400 mt-2.5">
                        <Icon icon="solar:file-check-linear" className="inline mr-1" width={13} />
                        Despachado con{' '}
                        {f.guias.map((g, i) => (
                          <span key={g.id}>
                            {i > 0 && ', '}
                            <span className="font-mono">{g.documento}</span> ({moment(g.fechaEmision).format('DD/MM')})
                          </span>
                        ))}
                      </p>
                    ) : (
                      <p className="text-[11.5px] text-slate-400 mt-2.5">
                        Sin ninguna guía de remisión todavía.
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DespachosPendientes;
