import { useCallback, useEffect, useMemo, useState } from 'react';
import { Icon } from '@iconify/react/dist/iconify.js';
import { get, patch } from '@/utils/fetch';
import useAlertStore from '@/zustand/alert';
import { usePuedeEscribir } from '@/hooks/usePuedeEscribir';

const ACCENT = 'var(--accent, #7551FF)';

/**
 * Inventario › Devoluciones — el visto bueno de almacén sobre la mercadería
 * que vuelve.
 *
 * Lo pidió almacén con estas palabras: «se realiza a través de notas de
 * crédito (contabilidad); en almacén verificamos la mercadería para poder dar
 * el visto bueno del reingreso, y el área comercial debe poder verlas y que
 * todos estén informados del lote u observación que pueda haber».
 *
 * La API existía desde el 28-sep y esta pantalla no: el resultado era que una
 * devolución nacía PENDIENTE y se quedaba ahí para siempre, porque no había
 * desde dónde confirmarla. El stock no volvía.
 *
 * Dos reglas que la pantalla hace visibles, y que son del servicio:
 *   · al kardex entra SOLO lo aprovechable (recibido menos dañado);
 *   · no se puede recibir más de lo que dice la nota de crédito — si llegó
 *     más, lo que está mal es la nota.
 */

type DetalleDevolucion = {
  id: number;
  productoId: number | null;
  descripcion: string;
  unidad: string;
  cantidadEsperada: number | string;
  cantidadRecibida: number | string;
  cantidadDanada: number | string;
  observacion: string | null;
};

type Devolucion = {
  id: number;
  estado: 'PENDIENTE' | 'CONFIRMADA' | 'RECHAZADA';
  motivoCodigo: string | null;
  observaciones: string | null;
  creadoEn: string;
  confirmadoEn: string | null;
  sede: { id: number; nombre: string } | null;
  usuarioConfirma: { id: number; nombre: string } | null;
  detalles: DetalleDevolucion[];
  comprobante: {
    id: number;
    serie: string;
    correlativo: number;
    fechaEmision: string;
    numDocAfectado: string | null;
    cliente: { id: number; nombre: string; nroDoc: string } | null;
  } | null;
};

const ESTADOS = [
  { id: 'PENDIENTE', label: 'Por revisar' },
  { id: 'CONFIRMADA', label: 'Confirmadas' },
  { id: 'RECHAZADA', label: 'Rechazadas' },
  { id: '', label: 'Todas' },
];

const MOTIVOS: Record<string, string> = {
  '01': 'Anulación de la operación',
  '06': 'Devolución total',
  '07': 'Devolución por ítem',
};

const num = (v: number | string | null | undefined) => Number(v ?? 0) || 0;

const numeroNota = (d: Devolucion) =>
  d.comprobante
    ? `${d.comprobante.serie}-${String(d.comprobante.correlativo).padStart(8, '0')}`
    : `#${d.id}`;

const fecha = (iso?: string | null) => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const BADGE: Record<string, string> = {
  PENDIENTE: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-900/40',
  CONFIRMADA: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-900/40',
  RECHAZADA: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-900/20 dark:text-rose-300 dark:border-rose-900/40',
};

export default function DevolucionesPage() {
  const alert = useAlertStore((s) => s.alert);
  const puedeConfirmar = usePuedeEscribir('kardex:escribir');

  const [loading, setLoading] = useState(false);
  const [estado, setEstado] = useState('PENDIENTE');
  const [devoluciones, setDevoluciones] = useState<Devolucion[]>([]);
  const [abierta, setAbierta] = useState<Devolucion | null>(null);
  const [lineas, setLineas] = useState<Record<number, { recibida: string; danada: string; observacion: string }>>({});
  const [observaciones, setObservaciones] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [motivoRechazo, setMotivoRechazo] = useState('');
  const [modoRechazo, setModoRechazo] = useState(false);

  const cargar = useCallback(async () => {
    setLoading(true);
    const qs = estado ? `?estado=${estado}&limit=100` : '?limit=100';
    const resp = await get<{ devoluciones: Devolucion[] }>(`/devoluciones${qs}`);
    if (!resp.success) {
      alert(resp.error || 'No se pudieron cargar las devoluciones', 'error');
      setDevoluciones([]);
    } else {
      setDevoluciones(resp.data?.devoluciones || []);
    }
    setLoading(false);
  }, [estado, alert]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const abrir = (d: Devolucion) => {
    setAbierta(d);
    setModoRechazo(false);
    setMotivoRechazo('');
    setObservaciones(d.observaciones || '');
    const base: Record<number, { recibida: string; danada: string; observacion: string }> = {};
    d.detalles.forEach((det) => {
      base[det.id] = {
        // Lo esperado como punto de partida: casi siempre llega todo, y el
        // caso raro es el que se corrige a mano.
        recibida: String(d.estado === 'PENDIENTE' ? num(det.cantidadEsperada) : num(det.cantidadRecibida)),
        danada: String(num(det.cantidadDanada)),
        observacion: det.observacion || '',
      };
    });
    setLineas(base);
  };

  const cerrar = () => {
    setAbierta(null);
    setLineas({});
    setObservaciones('');
    setModoRechazo(false);
    setMotivoRechazo('');
  };

  const errorLinea = (det: DetalleDevolucion): string | null => {
    const l = lineas[det.id];
    if (!l) return null;
    const recibida = Number(l.recibida);
    const danada = Number(l.danada || 0);
    if (!isFinite(recibida) || recibida < 0) return 'Cantidad inválida';
    if (!isFinite(danada) || danada < 0) return 'Cantidad dañada inválida';
    if (danada > recibida) return 'Lo dañado no puede superar lo recibido';
    if (recibida > num(det.cantidadEsperada))
      return `La nota dice ${num(det.cantidadEsperada)}: corrige la nota antes de confirmar`;
    return null;
  };

  const errores = useMemo(() => {
    if (!abierta) return [];
    return abierta.detalles
      .map((d) => ({ descripcion: d.descripcion, error: errorLinea(d) }))
      .filter((e) => e.error);
  }, [abierta, lineas]); // eslint-disable-line react-hooks/exhaustive-deps

  const totalAlStock = useMemo(() => {
    if (!abierta) return 0;
    return abierta.detalles.reduce((acc, det) => {
      const l = lineas[det.id];
      if (!l) return acc;
      return acc + Math.max(0, Number(l.recibida || 0) - Number(l.danada || 0));
    }, 0);
  }, [abierta, lineas]);

  const confirmar = async () => {
    if (!abierta) return;
    if (errores.length) {
      alert(`Revisa "${errores[0].descripcion}": ${errores[0].error}`, 'error');
      return;
    }
    setGuardando(true);
    const resp = await patch<{ movimientosKardex: number }>(`/devoluciones/${abierta.id}/confirmar`, {
      observaciones: observaciones.trim() || undefined,
      lineas: abierta.detalles.map((det) => ({
        detalleId: det.id,
        cantidadRecibida: Number(lineas[det.id]?.recibida || 0),
        cantidadDanada: Number(lineas[det.id]?.danada || 0),
        observacion: lineas[det.id]?.observacion?.trim() || undefined,
      })),
    });
    setGuardando(false);
    if (!resp.success) {
      alert(resp.error || 'No se pudo confirmar la devolución', 'error');
      return;
    }
    const movs = resp.data?.movimientosKardex ?? 0;
    alert(
      movs > 0
        ? `Devolución confirmada. ${movs} producto(s) volvieron al almacén.`
        : 'Devolución confirmada. No entró nada al almacén: todo vino dañado o sin producto de catálogo.',
      'success',
    );
    cerrar();
    void cargar();
  };

  const rechazar = async () => {
    if (!abierta) return;
    if (!motivoRechazo.trim()) {
      alert('Escribe por qué se rechaza', 'error');
      return;
    }
    setGuardando(true);
    const resp = await patch(`/devoluciones/${abierta.id}/rechazar`, { motivo: motivoRechazo.trim() });
    setGuardando(false);
    if (!resp.success) {
      alert(resp.error || 'No se pudo rechazar la devolución', 'error');
      return;
    }
    alert('Devolución rechazada. El stock no se movió.', 'success');
    cerrar();
    void cargar();
  };

  const pendientes = devoluciones.filter((d) => d.estado === 'PENDIENTE').length;

  return (
    <div className="min-h-screen -m-5 p-5 bg-[#F7F8FB] dark:bg-[#0B1120] font-jakarta">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-400 mb-5">
        <Icon icon="solar:home-smile-linear" className="text-base" />
        <span>Panel</span>
        <Icon icon="solar:alt-arrow-right-linear" className="text-xs" />
        <span>Inventario</span>
        <Icon icon="solar:alt-arrow-right-linear" className="text-xs" />
        <span className="font-semibold" style={{ color: ACCENT }}>Devoluciones</span>
      </div>

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-5">
        <div className="min-w-0">
          <h1 className="text-[22px] font-extrabold text-slate-800 dark:text-white tracking-tight">
            Mercadería que vuelve
          </h1>
          <p className="text-sm text-slate-400 mt-0.5">
            La nota de crédito abre la devolución; el stock vuelve cuando almacén dice cuánto llegó
            y cuánto vino dañado.
          </p>
        </div>
        <button
          onClick={() => void cargar()}
          className="h-11 px-4 rounded-2xl text-white text-sm font-bold flex items-center gap-1.5 shadow-lg shadow-violet-500/30 hover:brightness-105 transition-all self-start"
          style={{ background: ACCENT }}
        >
          <Icon icon="solar:refresh-linear" className={`text-lg ${loading ? 'animate-spin' : ''}`} />
          Recargar
        </button>
      </div>

      {/* Filtro por estado */}
      <div className="flex flex-wrap items-center gap-2 mb-5">
        {ESTADOS.map((e) => (
          <button
            key={e.id || 'todas'}
            onClick={() => setEstado(e.id)}
            className={`h-9 px-4 rounded-xl text-xs font-bold transition ${
              estado === e.id
                ? 'text-white shadow-md'
                : 'bg-white dark:bg-[#111827] text-slate-500 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
            style={estado === e.id ? { background: ACCENT } : undefined}
          >
            {e.label}
            {e.id === 'PENDIENTE' && pendientes > 0 && estado !== 'PENDIENTE' ? ` (${pendientes})` : ''}
          </button>
        ))}
      </div>

      {/* Lista */}
      <div className="bg-white dark:bg-[#111827] rounded-3xl shadow-[0_2px_20px_rgba(15,23,42,0.05)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wide text-slate-400 border-b border-slate-100 dark:border-slate-800">
                <th className="px-4 py-3 font-bold">Nota de crédito</th>
                <th className="px-4 py-3 font-bold">Factura afectada</th>
                <th className="px-4 py-3 font-bold">Cliente</th>
                <th className="px-4 py-3 font-bold">Motivo</th>
                <th className="px-4 py-3 font-bold">Almacén</th>
                <th className="px-4 py-3 font-bold text-right">Líneas</th>
                <th className="px-4 py-3 font-bold">Estado</th>
                <th className="px-4 py-3 font-bold text-right">&nbsp;</th>
              </tr>
            </thead>
            <tbody>
              {devoluciones.map((d) => (
                <tr key={d.id} className="border-b border-slate-50 dark:border-slate-800/60 hover:bg-slate-50/60 dark:hover:bg-slate-800/30">
                  <td className="px-4 py-3">
                    <p className="font-bold text-slate-800 dark:text-white">{numeroNota(d)}</p>
                    <p className="text-xs text-slate-400">{fecha(d.creadoEn)}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                    {d.comprobante?.numDocAfectado || '—'}
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-slate-700 dark:text-slate-200">{d.comprobante?.cliente?.nombre || '—'}</p>
                    <p className="text-xs text-slate-400">{d.comprobante?.cliente?.nroDoc || ''}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                    {d.motivoCodigo ? MOTIVOS[d.motivoCodigo] || d.motivoCodigo : '—'}
                  </td>
                  <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                    {d.sede?.nombre || (
                      <span className="text-amber-600 dark:text-amber-400">sin almacén</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-slate-600 dark:text-slate-300">
                    {d.detalles.length}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-[11px] font-bold px-2 py-1 rounded-full border ${BADGE[d.estado]}`}>
                      {d.estado === 'PENDIENTE' ? 'Por revisar' : d.estado === 'CONFIRMADA' ? 'Confirmada' : 'Rechazada'}
                    </span>
                    {d.usuarioConfirma && (
                      <p className="text-[11px] text-slate-400 mt-1">{d.usuarioConfirma.nombre}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => abrir(d)}
                      className="h-9 px-3 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600 inline-flex items-center gap-1.5"
                    >
                      <Icon icon={d.estado === 'PENDIENTE' ? 'solar:clipboard-check-bold-duotone' : 'solar:eye-bold'} className="text-base" />
                      {d.estado === 'PENDIENTE' ? 'Revisar' : 'Ver'}
                    </button>
                  </td>
                </tr>
              ))}
              {!devoluciones.length && !loading && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center">
                    <Icon icon="solar:box-minimalistic-linear" className="mx-auto mb-2 text-5xl text-slate-200 dark:text-gray-600" />
                    <p className="text-sm text-slate-400">
                      {estado === 'PENDIENTE'
                        ? 'No hay mercadería esperando el visto bueno de almacén.'
                        : 'No hay devoluciones con ese estado.'}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      Una devolución se abre sola al emitir una nota de crédito por devolución (motivo 01, 06 o 07).
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detalle / visto bueno */}
      {abierta && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/50 p-0 sm:p-5" onClick={cerrar}>
          <div
            className="bg-white dark:bg-[#111827] w-full sm:max-w-3xl max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white dark:bg-[#111827] px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-lg font-extrabold text-slate-800 dark:text-white">
                  Nota de crédito {numeroNota(abierta)}
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  {abierta.comprobante?.cliente?.nombre || 'Sin cliente'}
                  {abierta.comprobante?.numDocAfectado ? ` · afecta a ${abierta.comprobante.numDocAfectado}` : ''}
                </p>
              </div>
              <button onClick={cerrar} className="h-9 w-9 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-500 flex items-center justify-center shrink-0">
                <Icon icon="solar:close-circle-bold" className="text-lg" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {!abierta.sede && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 dark:bg-amber-900/10 dark:border-amber-900/40 p-3 text-xs text-amber-800 dark:text-amber-300 flex gap-2">
                  <Icon icon="solar:danger-triangle-bold-duotone" className="text-base shrink-0" />
                  <span>
                    Esta devolución no tiene almacén asignado, así que al confirmarla <b>no entrará
                    nada al kardex</b>. Queda registrada igual.
                  </span>
                </div>
              )}

              <div className="rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-[11px] uppercase tracking-wide text-slate-400 bg-slate-50 dark:bg-slate-800/40">
                      <th className="px-3 py-2 font-bold">Producto</th>
                      <th className="px-3 py-2 font-bold text-right">Dice la nota</th>
                      <th className="px-3 py-2 font-bold text-right">Llegó</th>
                      <th className="px-3 py-2 font-bold text-right">De eso, dañado</th>
                      <th className="px-3 py-2 font-bold text-right">Vuelve al stock</th>
                    </tr>
                  </thead>
                  <tbody>
                    {abierta.detalles.map((det) => {
                      const l = lineas[det.id] || { recibida: '0', danada: '0', observacion: '' };
                      const err = errorLinea(det);
                      const util = Math.max(0, Number(l.recibida || 0) - Number(l.danada || 0));
                      const editable = abierta.estado === 'PENDIENTE' && puedeConfirmar && !modoRechazo;
                      return (
                        <tr key={det.id} className="border-t border-slate-100 dark:border-slate-800 align-top">
                          <td className="px-3 py-2">
                            <p className="text-slate-800 dark:text-white font-semibold">{det.descripcion}</p>
                            <p className="text-xs text-slate-400">{det.unidad}{!det.productoId ? ' · fuera de catálogo, no mueve stock' : ''}</p>
                            {editable && (
                              <input
                                value={l.observacion}
                                onChange={(e) => setLineas((p) => ({ ...p, [det.id]: { ...l, observacion: e.target.value } }))}
                                placeholder="Lote, estado en que llegó…"
                                className="mt-1.5 w-full h-8 px-2 rounded-lg text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200"
                              />
                            )}
                            {!editable && det.observacion && (
                              <p className="text-xs text-slate-500 mt-1">{det.observacion}</p>
                            )}
                            {err && <p className="text-[11px] text-rose-600 mt-1 font-semibold">{err}</p>}
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums text-slate-600 dark:text-slate-300">
                            {num(det.cantidadEsperada)}
                          </td>
                          <td className="px-3 py-2 text-right">
                            {editable ? (
                              <input
                                type="number" min="0" step="0.001"
                                value={l.recibida}
                                onChange={(e) => setLineas((p) => ({ ...p, [det.id]: { ...l, recibida: e.target.value } }))}
                                className={`w-24 h-9 px-2 rounded-lg text-right tabular-nums bg-white dark:bg-slate-800 border text-slate-800 dark:text-white ${err ? 'border-rose-400' : 'border-slate-200 dark:border-slate-700'}`}
                              />
                            ) : (
                              <span className="tabular-nums text-slate-600 dark:text-slate-300">{num(det.cantidadRecibida)}</span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-right">
                            {editable ? (
                              <input
                                type="number" min="0" step="0.001"
                                value={l.danada}
                                onChange={(e) => setLineas((p) => ({ ...p, [det.id]: { ...l, danada: e.target.value } }))}
                                className="w-24 h-9 px-2 rounded-lg text-right tabular-nums bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white"
                              />
                            ) : (
                              <span className="tabular-nums text-slate-600 dark:text-slate-300">{num(det.cantidadDanada)}</span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-right font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                            {util.toFixed(3)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {abierta.estado === 'PENDIENTE' && puedeConfirmar && !modoRechazo && (
                <>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-300 mb-1">
                      Lo que comercial debe saber
                    </label>
                    <textarea
                      value={observaciones}
                      onChange={(e) => setObservaciones(e.target.value)}
                      rows={2}
                      placeholder="Lote, estado de la mercadería, acuerdo con el cliente…"
                      className="w-full px-3 py-2 rounded-xl text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200"
                    />
                  </div>
                  <div className="flex items-center justify-between gap-3 pt-1">
                    <p className="text-xs text-slate-400">
                      Vuelven al almacén <b className="text-emerald-600 dark:text-emerald-400">{totalAlStock.toFixed(3)}</b> unidades
                      en total. Lo dañado queda registrado pero no entra al stock.
                    </p>
                    <div className="flex gap-2 shrink-0">
                      <button
                        onClick={() => setModoRechazo(true)}
                        className="h-11 px-4 rounded-2xl text-sm font-bold bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-300 hover:bg-rose-100"
                      >
                        Rechazar
                      </button>
                      <button
                        onClick={() => void confirmar()}
                        disabled={guardando || errores.length > 0}
                        className="h-11 px-5 rounded-2xl text-sm font-bold text-white shadow-lg shadow-emerald-200 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
                      >
                        <Icon icon="solar:check-circle-bold" className="text-lg" />
                        {guardando ? 'Guardando…' : 'Confirmar reingreso'}
                      </button>
                    </div>
                  </div>
                </>
              )}

              {modoRechazo && (
                <div className="rounded-2xl border border-rose-200 dark:border-rose-900/40 bg-rose-50/60 dark:bg-rose-900/10 p-4 space-y-3">
                  <p className="text-sm font-bold text-rose-700 dark:text-rose-300">
                    ¿Por qué se rechaza? El stock no se moverá.
                  </p>
                  <textarea
                    value={motivoRechazo}
                    onChange={(e) => setMotivoRechazo(e.target.value)}
                    rows={2}
                    placeholder="La mercadería nunca llegó, llegó inservible, el cliente se retractó…"
                    className="w-full px-3 py-2 rounded-xl text-sm bg-white dark:bg-slate-800 border border-rose-200 dark:border-rose-900/40 text-slate-700 dark:text-slate-200"
                  />
                  <div className="flex justify-end gap-2">
                    <button onClick={() => setModoRechazo(false)} className="h-10 px-4 rounded-xl text-sm font-bold bg-white dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700">
                      Volver
                    </button>
                    <button
                      onClick={() => void rechazar()}
                      disabled={guardando}
                      className="h-10 px-5 rounded-xl text-sm font-bold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50"
                    >
                      {guardando ? 'Guardando…' : 'Rechazar devolución'}
                    </button>
                  </div>
                </div>
              )}

              {abierta.estado !== 'PENDIENTE' && (
                <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/40 p-4 text-sm text-slate-500 dark:text-slate-400">
                  {abierta.estado === 'CONFIRMADA' ? 'Confirmada' : 'Rechazada'}
                  {abierta.usuarioConfirma ? ` por ${abierta.usuarioConfirma.nombre}` : ''}
                  {abierta.confirmadoEn ? ` el ${fecha(abierta.confirmadoEn)}` : ''}.
                  {abierta.observaciones ? ` ${abierta.observaciones}` : ''}
                </div>
              )}

              {abierta.estado === 'PENDIENTE' && !puedeConfirmar && (
                <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/40 p-4 text-sm text-slate-500 dark:text-slate-400 flex gap-2">
                  <Icon icon="solar:lock-keyhole-minimalistic-bold-duotone" className="text-base shrink-0" />
                  <span>El visto bueno lo da almacén. Aquí puedes ver qué se devolvió y qué anotaron.</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
