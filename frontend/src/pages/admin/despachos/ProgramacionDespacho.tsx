"use client";
import { useEffect, useMemo, useState } from 'react';
import { Icon } from '@iconify/react';
import moment from 'moment';
import {
  useDespachosViewModel,
  type FilaDespacho,
} from '@/features/admin/despachos/useDespachosViewModel';

/**
 * Programación de despacho: qué pedidos entran en el camión que sale hoy.
 *
 * Almacén lo hace a mano en un Excel —tecleando vendedor, orden, cliente y
 * cantidades de cada pedido— y va sumando kilos hasta llegar al mínimo que
 * justifica sacar el camión. Luego avisa al grupo de ventas: «estamos al 80 %,
 * faltan 500 kilos». Lo repite con cada pedido: veinte ventas, veinte cuadros.
 *
 * Esta pantalla es ese Excel, con los pedidos ya puestos y el peso ya sumado.
 *
 * ⚠ El aviso de líneas sin peso NO es decorativo: 121 de los 419 productos del
 * catálogo todavía no tienen peso cargado. Un total que los ignorara en
 * silencio diría que el camión va a medias cuando va lleno, y de esta pantalla
 * depende que salga o no.
 */

const ACCENT = 'var(--accent, #7551FF)';
const CARD =
  'bg-white dark:bg-slate-800 rounded-3xl shadow-[0_2px_20px_rgba(15,23,42,0.05)] dark:shadow-none';

/** Lo que se guarda entre recargas: sin backend, es de quien usa el navegador. */
const LS_SELECCION = 'PROGRAMACION_DESPACHO_SELECCION';
const LS_MINIMO = 'PROGRAMACION_DESPACHO_MINIMO_KG';
const MINIMO_POR_DEFECTO = 2000;

const kg = (n: number) =>
  n.toLocaleString('es-PE', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

const leerLS = <T,>(clave: string, porDefecto: T): T => {
  try {
    const v = localStorage.getItem(clave);
    return v ? (JSON.parse(v) as T) : porDefecto;
  } catch {
    return porDefecto;
  }
};

const ProgramacionDespacho = () => {
  const vm = useDespachosViewModel();
  const filas: FilaDespacho[] = vm.datos?.filas ?? [];

  const [seleccion, setSeleccion] = useState<number[]>(() => leerLS(LS_SELECCION, []));
  const [minimoKg, setMinimoKg] = useState<number>(() => leerLS(LS_MINIMO, MINIMO_POR_DEFECTO));

  useEffect(() => {
    try { localStorage.setItem(LS_SELECCION, JSON.stringify(seleccion)); } catch { /* sin guardar */ }
  }, [seleccion]);
  useEffect(() => {
    try { localStorage.setItem(LS_MINIMO, JSON.stringify(minimoKg)); } catch { /* sin guardar */ }
  }, [minimoKg]);

  const alternar = (id: number) =>
    setSeleccion((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );

  const resumen = useMemo(() => {
    const elegidas = filas.filter((f) => seleccion.includes(f.comprobanteId));
    const pesoKg = elegidas.reduce((a, f) => a + (f.pesoPendienteKg ?? 0), 0);
    const sinPeso = elegidas.reduce((a, f) => a + (f.lineasSinPeso ?? 0), 0);
    const falta = Math.max(0, minimoKg - pesoKg);
    return {
      elegidas,
      pesoKg,
      sinPeso,
      falta,
      pct: minimoKg > 0 ? (pesoKg / minimoKg) * 100 : 0,
      listo: pesoKg >= minimoKg && minimoKg > 0,
    };
  }, [filas, seleccion, minimoKg]);

  const copiarListado = async () => {
    const lineas = resumen.elegidas.map(
      (f) =>
        `${f.documento}\t${f.cliente?.nombre ?? ''}\t${kg(f.pesoPendienteKg ?? 0)} kg`,
    );
    const texto = [
      `Programación de despacho · ${moment().format('DD/MM/YYYY')}`,
      ...lineas,
      `TOTAL\t\t${kg(resumen.pesoKg)} kg de ${kg(minimoKg)} kg`,
      resumen.listo
        ? 'El camión llega al mínimo.'
        : `Faltan ${kg(resumen.falta)} kg para salir.`,
    ].join('\n');
    try {
      await navigator.clipboard.writeText(texto);
    } catch {
      /* si el navegador no deja copiar, el listado igual está en pantalla */
    }
  };

  return (
    <div className="min-h-screen -m-5 p-5 bg-[#F7F8FB] dark:bg-[#0A0D14] font-jakarta">
      <div className="flex items-center gap-2 text-sm text-slate-400 dark:text-gray-400 mb-5">
        <Icon icon="solar:home-smile-linear" />
        <span>Panel</span>
        <Icon icon="solar:alt-arrow-right-linear" className="text-xs" />
        <span>Guías de Remisión</span>
        <Icon icon="solar:alt-arrow-right-linear" className="text-xs" />
        <span className="text-slate-700 dark:text-white font-semibold">Programación de despacho</span>
      </div>

      <div className="flex flex-wrap items-end justify-between gap-3 mb-5">
        <div>
          <h1 className="text-[22px] font-extrabold text-slate-800 dark:text-white">
            Programación de despacho
          </h1>
          <p className="text-sm text-slate-400 dark:text-gray-400">
            Marca los pedidos que entran al camión. El peso se suma solo.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs font-bold text-slate-500 dark:text-gray-400">
            Mínimo para salir
          </label>
          <div className="relative">
            <input
              type="number"
              min={0}
              step={100}
              value={minimoKg}
              onChange={(e) => setMinimoKg(Math.max(0, Number(e.target.value) || 0))}
              className="h-10 w-32 pl-3 pr-9 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-semibold text-slate-700 dark:text-white"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">kg</span>
          </div>
        </div>
      </div>

      {/* ── El camión ───────────────────────────────────────────────── */}
      <div className={`${CARD} p-5 mb-5`}>
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-800 dark:text-white tabular-nums">
              {kg(resumen.pesoKg)}
            </span>
            <span className="text-sm font-semibold text-slate-400">
              de {kg(minimoKg)} kg
            </span>
            <span className="text-sm text-slate-400">
              · {resumen.elegidas.length} pedido{resumen.elegidas.length === 1 ? '' : 's'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {resumen.elegidas.length > 0 && (
              <>
                <button
                  onClick={() => void copiarListado()}
                  className="h-10 px-4 rounded-2xl text-sm font-bold text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/40 flex items-center gap-1.5"
                >
                  <Icon icon="solar:copy-linear" /> Copiar listado
                </button>
                <button
                  onClick={() => setSeleccion([])}
                  className="h-10 px-4 rounded-2xl text-sm font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700/40"
                >
                  Vaciar
                </button>
              </>
            )}
          </div>
        </div>

        <div className="h-3 w-full rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${Math.min(100, Math.max(0, resumen.pct))}%`,
              background: resumen.listo ? '#10b981' : '#f59e0b',
            }}
          />
        </div>

        <p className="mt-3 text-sm font-semibold">
          {resumen.elegidas.length === 0 ? (
            <span className="text-slate-400">Marca pedidos abajo para armar el camión.</span>
          ) : resumen.listo ? (
            <span className="text-emerald-600 dark:text-emerald-400">
              El camión llega al mínimo: puede salir.
            </span>
          ) : (
            <span className="text-amber-600 dark:text-amber-400">
              Vas al {Math.round(resumen.pct)} %. Faltan {kg(resumen.falta)} kg para salir.
            </span>
          )}
        </p>

        {resumen.sinPeso > 0 && (
          <p className="mt-2 flex items-start gap-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400">
            <Icon icon="solar:danger-triangle-linear" className="mt-0.5 shrink-0" />
            <span>
              {resumen.sinPeso} línea{resumen.sinPeso === 1 ? '' : 's'} de lo marcado no tiene peso
              cargado: el camión pesa MÁS de lo que dice este total.
            </span>
          </p>
        )}
      </div>

      {/* ── Pedidos pendientes ──────────────────────────────────────── */}
      <div className={`${CARD} overflow-hidden`}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-700">
          <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
            Pedidos por despachar
          </p>
          <span className="text-xs text-slate-400">{filas.length} pendiente(s)</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm min-width-0" style={{ minWidth: 820 }}>
            <thead>
              <tr className="text-[11px] uppercase tracking-wide text-slate-400 border-b border-slate-100 dark:border-slate-700">
                <th className="py-3 pl-5 pr-3 w-10"></th>
                <th className="py-3 px-3 text-left">Documento</th>
                <th className="py-3 px-3 text-left">Cliente</th>
                <th className="py-3 px-3 text-left">Emitido</th>
                <th className="py-3 px-3 text-right">Pendiente</th>
                <th className="py-3 px-3 text-right pr-5">Peso</th>
              </tr>
            </thead>
            <tbody>
              {filas.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-sm text-slate-400">
                    No hay pedidos por despachar.
                  </td>
                </tr>
              )}
              {filas.map((f) => {
                const marcado = seleccion.includes(f.comprobanteId);
                return (
                  <tr
                    key={f.comprobanteId}
                    onClick={() => alternar(f.comprobanteId)}
                    className={`border-b border-slate-50 dark:border-slate-700/50 cursor-pointer transition-colors ${
                      marcado
                        ? 'bg-violet-50/60 dark:bg-violet-900/15'
                        : 'hover:bg-slate-50/60 dark:hover:bg-slate-700/30'
                    }`}
                  >
                    <td className="py-3 pl-5 pr-3">
                      <input
                        type="checkbox"
                        checked={marcado}
                        onChange={() => alternar(f.comprobanteId)}
                        onClick={(e) => e.stopPropagation()}
                        className="h-4 w-4 rounded border-slate-300 dark:border-slate-600"
                        style={{ accentColor: ACCENT }}
                      />
                    </td>
                    <td className="py-3 px-3">
                      <span className="font-mono text-xs font-bold text-slate-700 dark:text-slate-200">
                        {f.documento}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-600 dark:text-slate-300 max-w-[260px] truncate"
                        title={f.cliente?.nombre ?? ''}>
                      {f.cliente?.nombre ?? '—'}
                    </td>
                    <td className="py-3 px-3 text-slate-500 dark:text-gray-400 whitespace-nowrap">
                      {moment(f.fechaEmision).format('DD/MM/YYYY')}
                      {f.diasDesdeEmision > 0 && (
                        <span className="ml-1.5 text-xs text-slate-400">
                          ({f.diasDesdeEmision} d)
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right tabular-nums text-slate-600 dark:text-slate-300">
                      {f.unidadesPendientes} und
                    </td>
                    <td className="py-3 px-3 pr-5 text-right whitespace-nowrap">
                      <span className="font-bold tabular-nums text-slate-800 dark:text-white">
                        {kg(f.pesoPendienteKg ?? 0)} kg
                      </span>
                      {f.lineasSinPeso > 0 && (
                        <span
                          className="ml-2 text-[11px] font-bold text-rose-600 dark:text-rose-400"
                          title={`${f.lineasSinPeso} producto(s) de este pedido no tienen peso cargado`}
                        >
                          +{f.lineasSinPeso} sin pesar
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ProgramacionDespacho;
