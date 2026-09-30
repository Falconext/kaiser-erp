"use client";
import { Icon } from '@iconify/react';
import moment from 'moment';
import Modal from '@/components/Modal';
import { usePuedeEscribir } from '@/hooks/usePuedeEscribir';
import {
  useSeguimientoViewModel, TIPOS_MANUALES, RESULTADOS, MOTIVOS_PERDIDA,
  ETIQUETA_TIPO, soles,
} from './useSeguimientoViewModel';

const ACCENT = 'var(--accent, #7551FF)';
const INPUT =
  'h-9 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-[13px] outline-none focus:border-[var(--accent)]';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  comprobanteId: number | null;
  onCambio?: () => void;
}

const ModalSeguimiento = ({ isOpen, onClose, comprobanteId, onCambio }: Props) => {
  const vm = useSeguimientoViewModel(isOpen ? comprobanteId : null, onCambio);
  const puedeEscribir = usePuedeEscribir('cotizaciones');
  const d = vm.datos;
  const cerrada = d?.cotizacion.estado === 'FACTURADO' || d?.cotizacion.estado === 'ANULADO';

  return (
    <Modal width="760px" height="auto" position="right" isOpenModal={isOpen} closeModal={onClose} title="Seguimiento de la cotización">
      <div className="px-4 pb-4 sm:px-6">
        {!d ? (
          <p className="py-8 text-center text-[13px] text-slate-400">{vm.cargado ? 'No se pudo cargar.' : 'Cargando…'}</p>
        ) : (
          <>
            {/* Cabecera */}
            <div className="mt-4 rounded-2xl border border-slate-200 dark:border-slate-700 p-3.5">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="font-mono text-[14px] font-bold text-slate-800 dark:text-white">{d.cotizacion.documento}</span>
                <span className="text-[13px] text-slate-600 dark:text-slate-300">{d.cotizacion.cliente?.nombre ?? 'Sin cliente'}</span>
                <span className="ml-auto text-[14px] font-bold tabular-nums text-slate-800 dark:text-white">{soles(d.cotizacion.importe)}</span>
              </div>
              <p className="mt-1 text-[11.5px] text-slate-400">
                Emitida el {moment(d.cotizacion.fechaEmision).format('DD/MM/YYYY')} por {d.cotizacion.vendedor?.nombre ?? '—'} ·{' '}
                {d.cotizacion.diasParaVencer < 0
                  ? <span className="font-semibold text-rose-600 dark:text-rose-400">venció hace {Math.abs(d.cotizacion.diasParaVencer)} d</span>
                  : d.cotizacion.diasParaVencer === 0
                    ? <span className="font-semibold text-amber-600 dark:text-amber-400">vence hoy</span>
                    : <>vence en {d.cotizacion.diasParaVencer} d</>}
              </p>

              {d.cotizacion.motivoPerdida && (
                <p className="mt-2 rounded-lg bg-rose-50 dark:bg-rose-900/20 px-2.5 py-1.5 text-[12px] text-rose-700 dark:text-rose-300">
                  <b>Perdida:</b> {MOTIVOS_PERDIDA.find((m) => m.value === d.cotizacion.motivoPerdida)?.label}
                  {d.cotizacion.motivoPerdidaDetalle ? ` — ${d.cotizacion.motivoPerdidaDetalle}` : ''}
                </p>
              )}

              {vm.datos?.proximaAccion && (
                <p className={`mt-2 rounded-lg px-2.5 py-1.5 text-[12px] ${vm.datos.proximaAccion.vencida ? 'bg-rose-50 text-rose-700 dark:bg-rose-900/20 dark:text-rose-300' : 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300'}`}>
                  <Icon icon="solar:alarm-bold-duotone" className="inline mr-1" width={13} />
                  <b>Pendiente:</b> {vm.datos.proximaAccion.que} — {moment(vm.datos.proximaAccion.cuando).format('DD/MM/YYYY')}
                  {vm.datos.proximaAccion.vencida ? ' (vencida)' : ''}
                </p>
              )}
            </div>

            {/* Anotar un contacto */}
            {puedeEscribir && !cerrada && (
              <div className="mt-4 rounded-2xl border border-slate-200 dark:border-slate-700 p-3.5">
                <p className="mb-2 text-[12px] font-semibold text-slate-600 dark:text-slate-300">Anotar un contacto</p>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {TIPOS_MANUALES.map((t) => (
                    <button
                      key={t.value}
                      onClick={() => vm.setTipo(t.value)}
                      className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[12px] font-semibold transition ${
                        vm.tipo === t.value
                          ? 'text-white'
                          : 'text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                      style={vm.tipo === t.value ? { background: ACCENT } : undefined}
                    >
                      <Icon icon={t.icon} width={14} /> {t.label}
                    </button>
                  ))}
                </div>
                <textarea
                  className="w-full min-h-[64px] rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-[13px] outline-none focus:border-[var(--accent)]"
                  placeholder="Qué pasó. Ej: habló con el jefe de compras, pide 5 % y entrega en dos semanas"
                  value={vm.detalle}
                  onChange={(e) => vm.setDetalle(e.target.value)}
                />
                <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <select className={INPUT} value={vm.resultado} onChange={(e) => vm.setResultado(e.target.value as any)}>
                    <option value="">¿Cómo quedó?</option>
                    {RESULTADOS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                  </select>
                  <input className={INPUT} placeholder="Qué toca después" value={vm.proximaAccion} onChange={(e) => vm.setProximaAccion(e.target.value)} />
                  <input className={INPUT} type="date" value={vm.proximaAccionEn} onChange={(e) => vm.setProximaAccionEn(e.target.value)} />
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button onClick={() => void vm.registrar()} disabled={vm.guardando} className="h-9 px-4 rounded-lg text-[13px] font-semibold text-white disabled:opacity-50" style={{ background: ACCENT }}>
                    Guardar
                  </button>
                  <button onClick={() => vm.setPerdiendo(!vm.perdiendo)} className="h-9 px-4 rounded-lg text-[13px] font-semibold text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800 hover:bg-rose-50 dark:hover:bg-rose-900/20">
                    Marcar como perdida
                  </button>
                </div>

                {vm.perdiendo && (
                  <div className="mt-3 rounded-xl border border-rose-200 dark:border-rose-800 bg-rose-50/50 dark:bg-rose-900/10 p-3">
                    <p className="text-[12px] font-semibold text-rose-700 dark:text-rose-300 mb-2">
                      ¿Por qué se perdió? La cotización no se borra: queda con su motivo y suma al reporte.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      {MOTIVOS_PERDIDA.map((m) => (
                        <button
                          key={m.value}
                          onClick={() => vm.setMotivo(m.value)}
                          className={`rounded-lg border px-2.5 py-1.5 text-left transition ${
                            vm.motivo === m.value ? 'border-rose-400 bg-white dark:bg-slate-900' : 'border-transparent hover:bg-white/60 dark:hover:bg-slate-900/40'
                          }`}
                        >
                          <span className="block text-[12.5px] font-semibold text-slate-700 dark:text-slate-200">{m.label}</span>
                          <span className="block text-[11px] text-slate-400">{m.ayuda}</span>
                        </button>
                      ))}
                    </div>
                    <input className={`${INPUT} mt-2`} placeholder="Detalle (opcional): ej. el competidor entregaba en 5 días" value={vm.motivoDetalle} onChange={(e) => vm.setMotivoDetalle(e.target.value)} />
                    <button onClick={() => void vm.marcarPerdida()} disabled={vm.guardando || !vm.motivo} className="mt-2 h-9 px-4 rounded-lg text-[13px] font-semibold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-40">
                      Confirmar pérdida
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Bitácora */}
            <p className="mt-4 mb-2 text-[12px] font-semibold text-slate-600 dark:text-slate-300">
              Bitácora ({d.entradas.length})
            </p>
            <div className="space-y-0">
              {d.entradas.map((e, i) => {
                const meta = ETIQUETA_TIPO[e.tipo];
                return (
                  <div key={e.id} className="flex gap-3">
                    {/* Línea de tiempo */}
                    <div className="flex flex-col items-center shrink-0">
                      <Icon icon={meta.icon} width={18} className={meta.tono} />
                      {i < d.entradas.length - 1 && <div className="w-px flex-1 bg-slate-200 dark:bg-slate-700 my-1" />}
                    </div>
                    <div className="pb-4 min-w-0 flex-1">
                      <p className="text-[12.5px]">
                        <span className={`font-semibold ${meta.tono}`}>{meta.label}</span>
                        <span className="text-slate-400"> · {moment(e.creadoEn).format('DD/MM/YYYY HH:mm')}</span>
                        <span className="text-slate-400"> · {e.automatico ? 'sistema' : e.usuario ?? '—'}</span>
                      </p>
                      {e.detalle && <p className="text-[13px] text-slate-700 dark:text-slate-200 mt-0.5">{e.detalle}</p>}
                      {e.resultado && (
                        <span className="inline-block mt-1 rounded-full bg-slate-100 dark:bg-slate-700 px-2 py-0.5 text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                          {RESULTADOS.find((r) => r.value === e.resultado)?.label ?? e.resultado}
                        </span>
                      )}
                      {e.proximaAccion && (
                        <p className={`text-[11.5px] mt-1 ${e.cumplidaEn ? 'text-slate-400 line-through' : 'text-amber-600 dark:text-amber-400'}`}>
                          <Icon icon="solar:alarm-linear" className="inline mr-1" width={12} />
                          {e.proximaAccion} — {moment(e.proximaAccionEn).format('DD/MM/YYYY')}
                          {e.cumplidaEn ? ` · hecha el ${moment(e.cumplidaEn).format('DD/MM')}` : ''}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </Modal>
  );
};

export default ModalSeguimiento;
