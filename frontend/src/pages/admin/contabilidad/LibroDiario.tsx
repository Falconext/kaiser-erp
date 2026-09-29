"use client";
import { Icon } from '@iconify/react';
import moment from 'moment';
import Modal from '@/components/Modal';
import ModalConfirm from '@/components/ModalConfirm';
import {
  useLibroDiarioViewModel,
  ORIGENES,
  MESES,
  soles,
  type Asiento,
} from '@/features/admin/contabilidad/useLibroDiarioViewModel';

const ACCENT = 'var(--accent, #7551FF)';
const CARD = 'bg-white dark:bg-slate-800 rounded-3xl shadow-[0_2px_20px_rgba(15,23,42,0.05)] dark:shadow-none';
const INPUT = 'h-10 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-300';

const ORIGEN_CHIP: Record<string, string> = {
  MANUAL: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-200',
  VENTA: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  COMPRA: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  COBRO: 'bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300',
  PAGO: 'bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  CAJA: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  GASTO: 'bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300',
  INGRESO: 'bg-lime-50 text-lime-700 dark:bg-lime-900/30 dark:text-lime-300',
  PLANILLA: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300',
  EXTORNO: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300',
};

const LibroDiario = () => {
  const vm = useLibroDiarioViewModel();
  const { diario, cuadre } = vm;
  const anios = Array.from({ length: 6 }, (_, i) => new Date().getFullYear() + 1 - i);

  const FilaAsiento = ({ a }: { a: Asiento }) => {
    const abierto = vm.expandidos.has(a.id);
    const extornado = a.estado === 'EXTORNADO';
    return (
      <>
        <tr
          className={`border-b border-slate-100 dark:border-slate-700 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/40 ${extornado ? 'opacity-60' : ''}`}
          onClick={() => vm.toggleExpandido(a.id)}
        >
          <td className="px-4 py-3">
            <div className="flex items-center gap-2">
              <Icon icon={abierto ? 'solar:alt-arrow-down-linear' : 'solar:alt-arrow-right-linear'} className="text-slate-400" />
              <span className="font-mono text-xs font-semibold text-slate-700 dark:text-slate-200">{a.cuo}</span>
            </div>
          </td>
          <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300 whitespace-nowrap">{moment(a.fecha).format('DD/MM/YYYY')}</td>
          <td className="px-4 py-3 text-sm text-slate-800 dark:text-white">
            <span className={extornado ? 'line-through' : ''}>{a.glosa}</span>
            {a.extornadoPor && (
              <span className="ml-2 text-xs text-red-600 dark:text-red-400">extornado por {a.extornadoPor.cuo}</span>
            )}
          </td>
          <td className="px-4 py-3">
            <span className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide ${ORIGEN_CHIP[a.origen] ?? ORIGEN_CHIP.MANUAL}`}>
              {ORIGENES[a.origen] ?? a.origen}
            </span>
          </td>
          <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400">{a.sede?.nombre ?? 'Empresa'}</td>
          <td className="px-4 py-3 text-right font-mono text-sm text-slate-800 dark:text-white whitespace-nowrap">{soles(a.totalDebe)}</td>
          <td className="px-4 py-3 text-right font-mono text-sm text-slate-800 dark:text-white whitespace-nowrap">{soles(a.totalHaber)}</td>
          <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
            {vm.puedeEscribir && !extornado && a.origen !== 'EXTORNO' && !vm.periodoCerrado && (
              <button
                type="button"
                onClick={() => vm.setConfirmacion({ tipo: 'extornar', asiento: a })}
                className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                title="Registrar el asiento inverso"
              >
                <Icon icon="solar:undo-left-round-linear" className="text-base" />
                Extornar
              </button>
            )}
          </td>
        </tr>
        {abierto && (
          <tr className="border-b border-slate-100 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-900/40">
            <td colSpan={8} className="px-6 py-3">
              <table className="w-full">
                <thead>
                  <tr className="text-[11px] uppercase tracking-wide text-slate-400">
                    <th className="text-left py-1 pr-3 w-24">Cuenta</th>
                    <th className="text-left py-1 pr-3">Denominación</th>
                    <th className="text-left py-1 pr-3">Glosa</th>
                    <th className="text-left py-1 pr-3 w-32">Documento</th>
                    <th className="text-right py-1 pr-3 w-32">Debe</th>
                    <th className="text-right py-1 w-32">Haber</th>
                  </tr>
                </thead>
                <tbody>
                  {a.detalles.map((d) => (
                    <tr key={d.id} className="text-sm">
                      <td className="py-1 pr-3 font-mono text-slate-700 dark:text-slate-200">{d.cuenta.codigo}</td>
                      <td className="py-1 pr-3 text-slate-700 dark:text-slate-200">{d.cuenta.denominacion}</td>
                      <td className="py-1 pr-3 text-slate-500 dark:text-slate-400">{d.glosa ?? ''}</td>
                      <td className="py-1 pr-3 text-xs text-slate-500 dark:text-slate-400">{d.serie && d.numero ? `${d.serie}-${d.numero}` : ''}</td>
                      <td className={`py-1 pr-3 text-right font-mono ${d.debe ? 'text-slate-800 dark:text-white' : 'text-slate-300 dark:text-slate-600'}`}>{d.debe ? soles(d.debe) : '—'}</td>
                      <td className={`py-1 text-right font-mono ${d.haber ? 'text-slate-800 dark:text-white' : 'text-slate-300 dark:text-slate-600'}`}>{d.haber ? soles(d.haber) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-2 text-[11px] text-slate-400">
                Registrado por {a.creadoPor?.nombre ?? 'el sistema'}
                {a.extornaA ? ` · extorna a ${a.extornaA.cuo}` : ''}
              </p>
            </td>
          </tr>
        )}
      </>
    );
  };

  return (
    <div className="min-h-screen -m-5 p-5 bg-[#F7F8FB] dark:bg-[#0A0D14] font-jakarta">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-400 dark:text-gray-400 mb-5">
        <Icon icon="solar:home-smile-linear" className="text-base" />
        <span>Panel</span>
        <Icon icon="solar:alt-arrow-right-linear" className="text-xs" />
        <span>Contabilidad</span>
        <Icon icon="solar:alt-arrow-right-linear" className="text-xs" />
        <span className="font-semibold" style={{ color: ACCENT }}>Libro Diario</span>
      </div>

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-5">
        <div className="min-w-0">
          <h1 className="text-[22px] font-extrabold text-slate-800 dark:text-white tracking-tight">Libro Diario</h1>
          <p className="text-sm text-slate-400 dark:text-gray-400 mt-0.5">
            Los asientos del período, con el documento que originó cada uno. Un asiento que no cuadra no entra.
          </p>
        </div>
        {vm.puedeEscribir && (
          <div className="flex items-center gap-2 shrink-0">
            {diario?.periodo && (
              vm.periodoCerrado ? (
                vm.isAdmin && (
                  <button
                    type="button"
                    onClick={() => vm.setConfirmacion({ tipo: 'reabrir' })}
                    className="h-11 px-4 rounded-2xl text-sm font-bold inline-flex items-center gap-1.5 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700"
                  >
                    <Icon icon="solar:lock-unlocked-linear" className="text-lg" />
                    Reabrir período
                  </button>
                )
              ) : (
                <button
                  type="button"
                  onClick={() => vm.setConfirmacion({ tipo: 'cerrar' })}
                  className="h-11 px-4 rounded-2xl text-sm font-bold inline-flex items-center gap-1.5 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700"
                >
                  <Icon icon="solar:lock-keyhole-linear" className="text-lg" />
                  Cerrar período
                </button>
              )
            )}
            <button
              type="button"
              onClick={vm.abrirNuevo}
              disabled={vm.periodoCerrado}
              className="h-11 px-4 rounded-2xl text-white text-sm font-bold inline-flex items-center gap-1.5 shadow-lg shadow-violet-500/30 hover:brightness-105 transition-all disabled:opacity-50 disabled:shadow-none"
              style={{ background: ACCENT }}
            >
              <Icon icon="solar:add-circle-bold" className="text-lg" />
              Nuevo asiento
            </button>
          </div>
        )}
      </div>

      {/* Filtros */}
      <div className={`${CARD} p-4 mb-5`}>
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex items-center gap-1">
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
          </div>
          <select value={vm.origen} onChange={(e) => vm.setOrigen(e.target.value)} className={`${INPUT} w-44`} aria-label="Origen">
            <option value="">Todos los orígenes</option>
            {Object.entries(ORIGENES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          {vm.isAdmin && vm.esPrincipal && (
            <select value={vm.sedeId ?? 0} onChange={(e) => vm.setSedeId(Number(e.target.value) || null)} className={`${INPUT} w-48`} aria-label="Sede">
              {vm.sedesOptions.map((s) => <option key={s.id} value={s.id}>{s.value}</option>)}
            </select>
          )}
          {diario?.periodo && (
            <span className={`ml-auto inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${vm.periodoCerrado ? 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200' : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'}`}>
              <Icon icon={vm.periodoCerrado ? 'solar:lock-keyhole-bold' : 'solar:lock-unlocked-bold'} />
              Período {vm.periodoCerrado ? 'cerrado' : 'abierto'}
            </span>
          )}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
        {[
          { label: 'Asientos', value: String(diario?.totales.asientos ?? 0), icon: 'solar:document-text-linear', chip: 'bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400' },
          { label: 'Total debe', value: soles(diario?.totales.debe ?? 0), icon: 'solar:arrow-left-down-linear', chip: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400' },
          { label: 'Total haber', value: soles(diario?.totales.haber ?? 0), icon: 'solar:arrow-right-up-linear', chip: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' },
        ].map((k) => (
          <div key={k.label} className={`${CARD} p-5`}>
            <div className={`h-11 w-11 rounded-2xl grid place-items-center mb-3 ${k.chip}`}>
              <Icon icon={k.icon} className="text-xl" />
            </div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-gray-400">{k.label}</p>
            <p className="text-2xl font-extrabold text-slate-800 dark:text-white mt-1">{k.value}</p>
          </div>
        ))}
      </div>

      {/* Tabla */}
      <div className={`${CARD} overflow-hidden`}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-[11px] uppercase tracking-wide text-slate-400 border-b border-slate-100 dark:border-slate-700">
                <th className="text-left px-4 py-3">Asiento</th>
                <th className="text-left px-4 py-3">Fecha</th>
                <th className="text-left px-4 py-3">Glosa</th>
                <th className="text-left px-4 py-3">Origen</th>
                <th className="text-left px-4 py-3">Sede</th>
                <th className="text-right px-4 py-3">Debe</th>
                <th className="text-right px-4 py-3">Haber</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {vm.cargando && !diario ? (
                <tr><td colSpan={8} className="px-4 py-10 text-center text-sm text-slate-400">Cargando…</td></tr>
              ) : !diario?.asientos.length ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center">
                    <Icon icon="solar:notebook-minimalistic-linear" className="text-4xl text-slate-300 mx-auto mb-2" />
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      Sin asientos en {MESES[vm.mes - 1]} {vm.anio}.
                    </p>
                  </td>
                </tr>
              ) : (
                diario.asientos.map((a) => <FilaAsiento key={a.id} a={a} />)
              )}
            </tbody>
            {diario && diario.asientos.length > 0 && (
              <tfoot>
                <tr className="bg-slate-50 dark:bg-slate-900/40">
                  <td colSpan={5} className="px-4 py-3 text-xs font-bold uppercase tracking-wide text-slate-500">Totales del período</td>
                  <td className="px-4 py-3 text-right font-mono text-sm font-bold text-slate-800 dark:text-white">{soles(diario.totales.debe)}</td>
                  <td className="px-4 py-3 text-right font-mono text-sm font-bold text-slate-800 dark:text-white">{soles(diario.totales.haber)}</td>
                  <td />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Nuevo asiento */}
      <Modal isOpenModal={vm.modalNuevo} closeModal={() => vm.setModalNuevo(false)} title="Nuevo asiento" width="900px" icon="solar:notebook-bold-duotone" height="auto">
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Fecha</label>
              <input type="date" value={vm.fecha} onChange={(e) => vm.setFecha(e.target.value)} className={`${INPUT} w-full`} />
            </div>
            <div className="sm:col-span-3">
              <label className="block text-xs font-semibold text-slate-500 mb-1">Glosa</label>
              <input type="text" value={vm.glosa} onChange={(e) => vm.setGlosa(e.target.value)} placeholder="Qué registra este asiento" className={`${INPUT} w-full`} maxLength={300} />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-[11px] uppercase tracking-wide text-slate-400">
                  <th className="text-left py-1 pr-2">Cuenta</th>
                  <th className="text-left py-1 pr-2 w-44">Glosa de línea</th>
                  <th className="text-right py-1 pr-2 w-32">Debe</th>
                  <th className="text-right py-1 pr-2 w-32">Haber</th>
                  <th className="w-8" />
                </tr>
              </thead>
              <tbody>
                {vm.lineas.map((l, i) => (
                  <tr key={i}>
                    <td className="py-1 pr-2">
                      <select value={l.cuenta} onChange={(e) => vm.setLinea(i, 'cuenta', e.target.value)} className={`${INPUT} w-full`} aria-label={`Cuenta línea ${i + 1}`}>
                        <option value="">Elige una cuenta</option>
                        {vm.plan.map((c) => <option key={c.id} value={c.codigo}>{c.codigo} — {c.denominacion}</option>)}
                      </select>
                    </td>
                    <td className="py-1 pr-2">
                      <input type="text" value={l.glosa} onChange={(e) => vm.setLinea(i, 'glosa', e.target.value)} className={`${INPUT} w-full`} maxLength={200} />
                    </td>
                    <td className="py-1 pr-2">
                      <input type="number" min="0" step="0.01" inputMode="decimal" value={l.debe} onChange={(e) => vm.setLinea(i, 'debe', e.target.value)} className={`${INPUT} w-full text-right font-mono`} aria-label={`Debe línea ${i + 1}`} />
                    </td>
                    <td className="py-1 pr-2">
                      <input type="number" min="0" step="0.01" inputMode="decimal" value={l.haber} onChange={(e) => vm.setLinea(i, 'haber', e.target.value)} className={`${INPUT} w-full text-right font-mono`} aria-label={`Haber línea ${i + 1}`} />
                    </td>
                    <td className="py-1">
                      <button type="button" onClick={() => vm.quitarLinea(i)} disabled={vm.lineas.length <= 2} className="h-8 w-8 rounded-lg grid place-items-center text-slate-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-30" aria-label="Quitar línea">
                        <Icon icon="solar:trash-bin-minimalistic-linear" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <button type="button" onClick={vm.agregarLinea} className="inline-flex items-center gap-1 text-sm font-semibold text-violet-600 hover:underline">
              <Icon icon="solar:add-circle-linear" /> Añadir línea
            </button>
            <div className="flex items-center gap-4 text-sm">
              <span className="font-mono text-slate-600 dark:text-slate-300">Debe {soles(cuadre.debe)}</span>
              <span className="font-mono text-slate-600 dark:text-slate-300">Haber {soles(cuadre.haber)}</span>
              <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold ${cuadre.cuadra ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' : 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300'}`}>
                <Icon icon={cuadre.cuadra ? 'solar:check-circle-bold' : 'solar:danger-circle-bold'} />
                {cuadre.cuadra ? 'Cuadra' : cuadre.debe === 0 && cuadre.haber === 0 ? 'Sin importes' : `Descuadre ${soles(Math.abs(cuadre.diferencia))}`}
              </span>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-700">
            <button type="button" onClick={() => vm.setModalNuevo(false)} className="h-10 px-4 rounded-xl text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700">
              Cancelar
            </button>
            <button
              type="button"
              onClick={vm.guardarAsiento}
              disabled={!vm.puedeGuardar}
              className="h-10 px-5 rounded-xl text-white text-sm font-bold inline-flex items-center gap-1.5 disabled:opacity-50"
              style={{ background: ACCENT }}
            >
              <Icon icon="solar:check-circle-bold" className="text-lg" />
              {vm.guardando ? 'Guardando…' : 'Registrar asiento'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Confirmaciones */}
      <ModalConfirm
        isOpenModal={!!vm.confirmacion}
        setIsOpenModal={(v: boolean) => { if (!v) vm.setConfirmacion(null); }}
        confirmSubmit={vm.confirmar}
        confirmLoading={vm.confirmando}
        title={
          vm.confirmacion?.tipo === 'extornar' ? `Extornar ${vm.confirmacion.asiento.cuo}`
            : vm.confirmacion?.tipo === 'cerrar' ? `Cerrar ${MESES[vm.mes - 1]} ${vm.anio}`
              : `Reabrir ${MESES[vm.mes - 1]} ${vm.anio}`
        }
        information={
          vm.confirmacion?.tipo === 'extornar'
            ? 'Se registra el asiento inverso con fecha de hoy y el original queda marcado como extornado. En contabilidad no se borra.'
            : vm.confirmacion?.tipo === 'cerrar'
              ? 'Un período cerrado no admite asientos nuevos ni extornos. Solo gerencia puede reabrirlo.'
              : 'El período vuelve a admitir asientos. Lo que ya se declaró a SUNAT no cambia solo.'
        }
        confirmText={vm.confirmacion?.tipo === 'extornar' ? 'Extornar' : vm.confirmacion?.tipo === 'cerrar' ? 'Cerrar período' : 'Reabrir'}
      />
    </div>
  );
};

export default LibroDiario;
