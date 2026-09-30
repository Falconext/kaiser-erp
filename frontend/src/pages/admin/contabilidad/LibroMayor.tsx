"use client";
import { Icon } from '@iconify/react';
import moment from 'moment';
import {
  useLibroMayorViewModel, MESES, soles, CLASES, type FilaBalance,
} from '@/features/admin/contabilidad/useLibroMayorViewModel';

const ACCENT = 'var(--accent, #7551FF)';
const CARD = 'bg-white dark:bg-slate-800 rounded-3xl shadow-[0_2px_20px_rgba(15,23,42,0.05)] dark:shadow-none';
const INPUT = 'h-10 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-300';

/** El saldo se lee en la naturaleza de la cuenta, sin signos que despisten. */
const Saldo = ({ valor, naturaleza }: { valor: number; naturaleza: 'DEUDORA' | 'ACREEDORA' }) => {
  if (valor === 0) return <span className="text-slate-300">—</span>;
  const invertido = valor < 0;
  const lee = invertido ? (naturaleza === 'DEUDORA' ? 'A' : 'D') : (naturaleza === 'DEUDORA' ? 'D' : 'A');
  return (
    <span className="font-mono">
      {soles(Math.abs(valor))}
      <span className="ml-1 text-[10px] font-bold text-slate-400">{lee}</span>
    </span>
  );
};

const LibroMayor = () => {
  const vm = useLibroMayorViewModel();
  const b = vm.balance;
  const anios = Array.from({ length: 6 }, (_, i) => new Date().getFullYear() + 1 - i);

  const porClase = (b?.filas ?? []).reduce<Record<string, FilaBalance[]>>((acc, f) => {
    (acc[f.clase] ??= []).push(f);
    return acc;
  }, {});

  return (
    <div className="min-h-screen -m-5 p-5 bg-[#F7F8FB] dark:bg-[#0A0D14] font-jakarta">
      <div className="flex items-center gap-2 text-sm text-slate-400 dark:text-gray-400 mb-5">
        <Icon icon="solar:home-smile-linear" className="text-base" />
        <span>Panel</span>
        <Icon icon="solar:alt-arrow-right-linear" className="text-xs" />
        <span>Contabilidad</span>
        <Icon icon="solar:alt-arrow-right-linear" className="text-xs" />
        <span className="font-semibold" style={{ color: ACCENT }}>Libro Mayor</span>
      </div>

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-5">
        <div className="min-w-0">
          <h1 className="text-[22px] font-extrabold text-slate-800 dark:text-white tracking-tight">Libro Mayor</h1>
          <p className="text-sm text-slate-400 dark:text-gray-400 mt-0.5">
            El balance de comprobación del período. Entra a una cuenta para ver qué la movió.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button type="button" onClick={() => void vm.descargar('contabilidad/asientos/exportar', 'Asientos.xlsx')}
            className="h-11 px-4 rounded-2xl text-sm font-bold inline-flex items-center gap-1.5 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700">
            <Icon icon="solar:file-download-linear" className="text-lg" />
            Excel para la contadora
          </button>
          <button type="button" onClick={() => void vm.descargar('contabilidad/ple/diario', 'LibroDiario.txt')}
            className="h-11 px-4 rounded-2xl text-sm font-bold inline-flex items-center gap-1.5 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700">
            <Icon icon="solar:document-text-linear" className="text-lg" />
            PLE 5.1
          </button>
          <button type="button" onClick={() => void vm.descargar('contabilidad/ple/mayor', 'LibroMayor.txt')}
            className="h-11 px-4 rounded-2xl text-sm font-bold inline-flex items-center gap-1.5 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700">
            <Icon icon="solar:document-text-linear" className="text-lg" />
            PLE 6.1
          </button>
        </div>
      </div>

      <div className={`${CARD} p-4 mb-5`}>
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" onClick={vm.mesAnterior} className="h-10 w-10 rounded-xl grid place-items-center text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700" aria-label="Mes anterior">
            <Icon icon="solar:alt-arrow-left-linear" />
          </button>
          <select value={vm.mes} onChange={(e) => vm.setMes(Number(e.target.value))} className={`${INPUT} w-40`} aria-label="Mes">
            {MESES.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
          </select>
          <select value={vm.anio} onChange={(e) => vm.setAnio(Number(e.target.value))} className={`${INPUT} w-24`} aria-label="Año">
            {anios.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
          <button type="button" onClick={vm.mesSiguiente} className="h-10 w-10 rounded-xl grid place-items-center text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700" aria-label="Mes siguiente">
            <Icon icon="solar:alt-arrow-right-linear" />
          </button>
          {b && (
            <span className={`ml-auto inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${b.cuadra ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' : 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300'}`}>
              <Icon icon={b.cuadra ? 'solar:check-circle-bold' : 'solar:danger-circle-bold'} />
              {b.cuadra ? 'El balance cuadra' : 'EL BALANCE NO CUADRA'}
            </span>
          )}
        </div>
        <p className="mt-3 text-[11px] text-slate-400">
          Los archivos del PLE se generan pero <strong>no están validados con el Programa Validador de SUNAT</strong>:
          pásalos por el PVS antes de presentarlos. El libro de ventas y el de compras sí van por SIRE, ya verificado.
        </p>
      </div>

      {!b ? (
        <div className={`${CARD} p-12 text-center`}>
          <p className="text-sm text-slate-500 dark:text-slate-400">{vm.cargando ? 'Cargando…' : 'Sin datos.'}</p>
        </div>
      ) : b.filas.length === 0 ? (
        <div className={`${CARD} p-12 text-center`}>
          <Icon icon="solar:notebook-bold-duotone" className="text-4xl text-slate-300 mx-auto mb-2" />
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Ninguna cuenta se movió en {MESES[vm.mes - 1]} {vm.anio}.
          </p>
        </div>
      ) : (
        <div className={`${CARD} overflow-hidden`}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-[11px] uppercase tracking-wide text-slate-400 border-b border-slate-100 dark:border-slate-700">
                  <th className="text-left px-6 py-3">Cuenta</th>
                  <th className="text-right px-4 py-3 w-36">Saldo inicial</th>
                  <th className="text-right px-4 py-3 w-32">Debe</th>
                  <th className="text-right px-4 py-3 w-32">Haber</th>
                  <th className="text-right px-6 py-3 w-36">Saldo final</th>
                </tr>
              </thead>
              <tbody>
                {Object.keys(porClase).sort().map((clase) => (
                  <>
                    <tr key={`c-${clase}`} className="bg-slate-50 dark:bg-slate-900/40">
                      <td colSpan={5} className="px-6 py-2 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                        Clase {clase} · {CLASES[clase] ?? ''}
                      </td>
                    </tr>
                    {porClase[clase].map((f) => (
                      <tr
                        key={f.cuentaId}
                        onClick={() => void vm.abrirCuenta(f.codigo)}
                        className="border-b border-slate-50 dark:border-slate-700/50 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/40"
                      >
                        <td className="px-6 py-2.5">
                          <span className="font-mono text-xs font-semibold text-slate-700 dark:text-slate-200">{f.codigo}</span>
                          <span className="ml-3 text-sm text-slate-600 dark:text-slate-300">{f.denominacion}</span>
                        </td>
                        <td className="px-4 py-2.5 text-right text-sm text-slate-500"><Saldo valor={f.saldoInicial} naturaleza={f.naturaleza} /></td>
                        <td className="px-4 py-2.5 text-right font-mono text-sm text-slate-700 dark:text-slate-200">{f.debe ? soles(f.debe) : <span className="text-slate-300">—</span>}</td>
                        <td className="px-4 py-2.5 text-right font-mono text-sm text-slate-700 dark:text-slate-200">{f.haber ? soles(f.haber) : <span className="text-slate-300">—</span>}</td>
                        <td className="px-6 py-2.5 text-right text-sm font-semibold text-slate-800 dark:text-white"><Saldo valor={f.saldoFinal} naturaleza={f.naturaleza} /></td>
                      </tr>
                    ))}
                  </>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-50 dark:bg-slate-900/40">
                  <td className="px-6 py-3 text-xs font-bold uppercase tracking-wide text-slate-500">
                    {b.totales.cuentas} cuenta(s) con movimiento
                  </td>
                  <td />
                  <td className="px-4 py-3 text-right font-mono text-sm font-bold text-slate-800 dark:text-white">{soles(b.totales.debe)}</td>
                  <td className="px-4 py-3 text-right font-mono text-sm font-bold text-slate-800 dark:text-white">{soles(b.totales.haber)}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* El mayor de la cuenta elegida */}
      {vm.cuenta && (
        <div className={`${CARD} p-6 mt-5`}>
          {!vm.mayor ? (
            <p className="text-sm text-slate-500">Cargando {vm.cuenta}…</p>
          ) : (
            <>
              <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                <div>
                  <p className="font-mono text-sm font-bold" style={{ color: ACCENT }}>{vm.mayor.cuenta.codigo}</p>
                  <h3 className="text-base font-extrabold text-slate-800 dark:text-white">{vm.mayor.cuenta.denominacion}</h3>
                  <p className="text-xs text-slate-400">
                    Viene de {soles(Math.abs(vm.mayor.saldoInicial))} · {vm.mayor.totales.movimientos} movimiento(s) ·
                    queda en <strong>{soles(Math.abs(vm.mayor.saldoFinal))}</strong> {vm.mayor.naturalezaSaldo === 'DEUDORA' ? 'deudor' : 'acreedor'}
                  </p>
                </div>
                <button type="button" onClick={vm.cerrarCuenta} className="h-9 w-9 rounded-xl grid place-items-center text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700" aria-label="Cerrar">
                  <Icon icon="solar:close-circle-linear" className="text-xl" />
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-[11px] uppercase tracking-wide text-slate-400 border-b border-slate-100 dark:border-slate-700">
                      <th className="text-left py-2 pr-3">Asiento</th>
                      <th className="text-left py-2 pr-3 w-28">Fecha</th>
                      <th className="text-left py-2 pr-3">Glosa</th>
                      <th className="text-left py-2 pr-3 w-32">Documento</th>
                      <th className="text-right py-2 pr-3 w-28">Debe</th>
                      <th className="text-right py-2 pr-3 w-28">Haber</th>
                      <th className="text-right py-2 w-32">Saldo</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-slate-50 dark:border-slate-700/50">
                      <td colSpan={6} className="py-2 pr-3 text-xs italic text-slate-400">Saldo que venía del período anterior</td>
                      <td className="py-2 text-right font-mono text-sm text-slate-500">{soles(Math.abs(vm.mayor.saldoInicial))}</td>
                    </tr>
                    {vm.mayor.lineas.map((l, i) => (
                      <tr key={`${l.asientoId}-${i}`} className="border-b border-slate-50 dark:border-slate-700/50 last:border-0">
                        <td className="py-2 pr-3 font-mono text-xs text-slate-700 dark:text-slate-200">{l.cuo}</td>
                        <td className="py-2 pr-3 text-sm text-slate-600 dark:text-slate-300">{moment(l.fecha).format('DD/MM/YYYY')}</td>
                        <td className="py-2 pr-3 text-sm text-slate-600 dark:text-slate-300">{l.glosa}</td>
                        <td className="py-2 pr-3 font-mono text-xs text-slate-500">{l.documento ?? '—'}</td>
                        <td className="py-2 pr-3 text-right font-mono text-sm text-slate-700 dark:text-slate-200">{l.debe ? soles(l.debe) : <span className="text-slate-300">—</span>}</td>
                        <td className="py-2 pr-3 text-right font-mono text-sm text-slate-700 dark:text-slate-200">{l.haber ? soles(l.haber) : <span className="text-slate-300">—</span>}</td>
                        <td className="py-2 text-right font-mono text-sm font-semibold text-slate-800 dark:text-white">{soles(Math.abs(l.saldo))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default LibroMayor;
