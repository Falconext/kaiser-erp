import { useRef } from 'react';
import { Icon } from '@iconify/react';
import { useConciliacionViewModel, type FiltroEstado } from './useConciliacionViewModel';
import { COLUMNAS_BANCO } from './ConciliacionModel';
import { KpiMini, RadialGauge } from '../shared/dashboardWidgets';
import { useThemeStore, SIDEBAR_COLOR_HEX } from '@/zustand/theme';

const fmt = (n: number) =>
  new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'PEN',
    minimumFractionDigits: 2,
  }).format(n || 0);

const FILTROS: { value: FiltroEstado; label: string }[] = [
  { value: 'TODOS', label: 'Todos' },
  { value: 'CONCILIADO', label: 'Conciliados' },
  { value: 'PENDIENTE', label: 'Pendientes' },
];

// Estilo de tarjeta unificado (mismo lenguaje visual del dashboard principal).
const CARD =
  'rounded-3xl bg-white dark:bg-[#111827] shadow-[0_2px_20px_rgba(15,23,42,0.05)] dark:shadow-none border border-slate-100 dark:border-slate-800';

export default function ConciliacionView() {
  const vm = useConciliacionViewModel();
  const fileRef = useRef<HTMLInputElement>(null);
  const r = vm.resultado?.resumen;

  const sidebarColor = useThemeStore((s) => s.sidebarColor);
  const ACCENT = SIDEBAR_COLOR_HEX[sidebarColor] ?? '#7551FF';

  const pctConciliado =
    r && r.movimientosBanco > 0
      ? Math.round((r.conciliados / r.movimientosBanco) * 100)
      : 0;

  const kpiCards: { label: string; value: string; sub: string; mini: 'bars' | 'donut' | 'wave' | 'line' }[] = r
    ? [
        { label: 'Mov. banco', value: String(r.movimientosBanco), sub: fmt(r.montoBanco), mini: 'bars' },
        { label: 'Conciliados', value: String(r.conciliados), sub: fmt(r.montoConciliado), mini: 'donut' },
        { label: 'Pend. banco', value: String(r.pendientesBanco), sub: fmt(r.montoPendienteBanco), mini: 'wave' },
        { label: 'Difs. de monto', value: String(r.diferenciasMonto), sub: 'montos que no cuadran', mini: 'line' },
      ]
    : [];

  return (
    <div className="space-y-5 font-jakarta">
      <div>
        <h2 className="text-[22px] font-extrabold tracking-tight text-slate-800 dark:text-white">
          Conciliación bancaria
        </h2>
        <p className="mt-1 text-sm text-slate-400 dark:text-gray-400">
          Sube el Excel del banco y crúzalo con las ventas y compras del sistema por número de operación.
        </p>
      </div>

      {/* Instrucciones + plantilla */}
      <div className={`${CARD} p-6`}>
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-bold text-slate-800 dark:text-white">Columnas esperadas del banco</p>
          <button
            onClick={vm.descargarPlantilla}
            className="flex items-center gap-1.5 text-sm font-semibold transition-colors hover:brightness-110"
            style={{ color: ACCENT }}
          >
            <Icon icon="solar:download-minimalistic-bold" width={16} /> Descargar plantilla
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {COLUMNAS_BANCO.map((c) => (
            <span
              key={c}
              className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-gray-300"
            >
              {c}
            </span>
          ))}
        </div>
        <p className="mt-3 text-xs text-slate-400 dark:text-gray-500">
          La primera fila debe ser el encabezado. <b>NumeroOperacion</b> es obligatorio (las filas sin operación se omiten).
          Tipo admite <b>ABONO</b> (venta) o <b>CARGO</b> (compra).
        </p>
      </div>

      {/* Carga + rango */}
      <div className={`${CARD} p-6`}>
        <input
          ref={fileRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          className="hidden"
          onChange={(e) => vm.setArchivo(e.target.files?.[0] ?? null)}
        />
        <div
          onClick={() => fileRef.current?.click()}
          className="cursor-pointer rounded-2xl border-2 border-dashed border-slate-300 p-8 text-center transition hover:border-[color:var(--dz,#7551FF)] dark:border-slate-700"
          style={{ ['--dz' as any]: ACCENT }}
        >
          <Icon icon="solar:cloud-upload-bold-duotone" width={40} className="mx-auto mb-2" style={{ color: ACCENT }} />
          {vm.archivo ? (
            <p className="text-sm font-medium text-slate-800 dark:text-gray-200">{vm.archivo.name}</p>
          ) : (
            <p className="text-sm text-slate-500 dark:text-gray-400">Haz clic para seleccionar el Excel del banco (.xlsx / .csv)</p>
          )}
        </div>

        <div className="mt-4 flex flex-wrap items-end gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-gray-400">Desde (opcional)</label>
            <input
              type="date"
              value={vm.fechaInicio}
              onChange={(e) => vm.setFechaInicio(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-gray-200"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-gray-400">Hasta (opcional)</label>
            <input
              type="date"
              value={vm.fechaFin}
              onChange={(e) => vm.setFechaFin(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-gray-200"
            />
          </div>
          <div className="ml-auto">
            <button
              onClick={vm.conciliar}
              disabled={!vm.archivo || vm.cargando}
              className="flex items-center gap-2 rounded-2xl px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-violet-500/30 transition-all hover:brightness-105 disabled:opacity-50"
              style={{ background: ACCENT }}
            >
              <Icon icon={vm.cargando ? 'svg-spinners:180-ring' : 'solar:refresh-bold'} width={18} />
              {vm.cargando ? 'Conciliando…' : 'Conciliar'}
            </button>
          </div>
        </div>
        <p className="mt-2 text-xs text-slate-400 dark:text-gray-500">
          El rango de fechas acota los pagos del sistema a comparar. Sin rango, se comparan todos los pagos con número de operación.
        </p>
      </div>

      {/* Resumen: KPIs unificados (tarjeta con columnas divididas) + gauge % conciliado */}
      {r && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {/* Tarjeta KPI unificada */}
          <div className={`${CARD} overflow-hidden lg:col-span-2`}>
            <div className="grid grid-cols-2">
              {kpiCards.map((c, idx) => (
                <div
                  key={c.label}
                  className={`p-5 border-slate-100 dark:border-slate-800 ${idx % 2 === 1 ? 'border-l' : ''} ${idx >= 2 ? 'border-t' : ''}`}
                >
                  <div className="flex items-center gap-1.5 text-slate-400 dark:text-gray-400">
                    <span className="text-[11px] font-black uppercase tracking-wide">{c.label}</span>
                  </div>
                  <div className="mt-2.5 flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-2xl font-extrabold text-slate-800 dark:text-white">{c.value}</p>
                      <p className="mt-1 truncate text-xs text-slate-400 dark:text-gray-400">{c.sub}</p>
                    </div>
                    <div className="shrink-0 pt-0.5">
                      <KpiMini type={c.mini} accent={ACCENT} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Gauge % conciliado */}
          <div className={`${CARD} flex flex-col p-5`}>
            <div className="flex items-center gap-1.5">
              <h3 className="text-sm font-extrabold text-slate-800 dark:text-white">% Conciliado</h3>
              <Icon icon="solar:info-circle-linear" className="text-[13px] text-slate-400" />
            </div>
            <div className="relative mx-auto mt-3 w-full max-w-[240px]">
              <div className="h-[128px]">
                <RadialGauge value={pctConciliado} accent={ACCENT} />
              </div>
              <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col items-center">
                <span className="text-4xl font-extrabold leading-none text-slate-800 dark:text-white">{pctConciliado}</span>
                <span className="mt-1 text-xs font-medium text-slate-400 dark:text-gray-400">de mov. del banco</span>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400 dark:text-gray-400">Pend. sistema</p>
                <p className="mt-0.5 text-lg font-extrabold text-rose-500">{r.pendientesSistema}</p>
                <p className="text-[11px] text-slate-400 dark:text-gray-500">sin match en banco</p>
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400 dark:text-gray-400">Conciliado</p>
                <p className="mt-0.5 text-lg font-extrabold text-emerald-600 dark:text-emerald-400">{fmt(r.montoConciliado)}</p>
                <p className="text-[11px] text-slate-400 dark:text-gray-500">monto cruzado</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Observaciones (se incluyen en el PDF y el Excel) */}
      {vm.resultado && (
        <div className={`${CARD} p-6`}>
          <label className="mb-1.5 block text-sm font-bold text-slate-800 dark:text-white">
            Observaciones (opcional)
          </label>
          <textarea
            value={vm.observaciones}
            onChange={(e) => vm.setObservaciones(e.target.value)}
            rows={3}
            placeholder="Notas para la conciliación (se incluirán al exportar a PDF y Excel)…"
            className="w-full resize-y rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-[color:var(--acc,#7551FF)] dark:border-slate-700 dark:bg-slate-900 dark:text-gray-200"
            style={{ ['--acc' as any]: ACCENT }}
          />
        </div>
      )}

      {/* Tabla banco vs sistema */}
      {vm.resultado && (
        <div className={CARD}>
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-4 dark:border-slate-800">
            <p className="text-sm font-bold text-slate-800 dark:text-white">Movimientos del banco</p>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={vm.guardarConciliacion}
                disabled={vm.guardando}
                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold text-white shadow-sm transition hover:brightness-105 disabled:opacity-50"
                style={{ background: ACCENT }}
              >
                <Icon icon={vm.guardando ? 'svg-spinners:180-ring' : 'solar:diskette-bold'} width={15} />
                {vm.guardando ? 'Guardando…' : 'Guardar conciliación'}
              </button>
              <button
                onClick={vm.descargarExcel}
                disabled={vm.generandoExcel}
                className="flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-50 disabled:opacity-50 dark:border-emerald-900/40 dark:bg-slate-900 dark:text-emerald-400 dark:hover:bg-slate-800"
              >
                <Icon icon={vm.generandoExcel ? 'svg-spinners:180-ring' : 'solar:file-download-bold'} width={15} />
                {vm.generandoExcel ? 'Generando…' : 'Exportar Excel'}
              </button>
              <button
                onClick={vm.descargarPdf}
                disabled={vm.generandoPdf}
                className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-gray-200 dark:hover:bg-slate-800"
              >
                <Icon icon={vm.generandoPdf ? 'svg-spinners:180-ring' : 'solar:file-download-bold'} width={15} />
                {vm.generandoPdf ? 'Generando…' : 'Guardar PDF'}
              </button>
              <div className="inline-flex items-center gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
                {FILTROS.map((f) => {
                  const activo = vm.filtro === f.value;
                  return (
                    <button
                      key={f.value}
                      onClick={() => vm.setFiltro(f.value)}
                      className={`rounded-lg px-3 py-1 text-xs font-semibold transition ${
                        activo
                          ? 'bg-white shadow-sm dark:bg-slate-900'
                          : 'text-slate-500 hover:text-slate-700 dark:text-gray-400'
                      }`}
                      style={activo ? { color: ACCENT } : undefined}
                    >
                      {f.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs font-semibold uppercase tracking-wide text-slate-400 dark:border-slate-800">
                  <th className="px-4 py-3">Fecha</th>
                  <th className="px-4 py-3">N° Operación</th>
                  <th className="px-4 py-3">Descripción</th>
                  <th className="px-4 py-3 text-right">Monto banco</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3">Documento sistema</th>
                  <th className="px-4 py-3 text-right">Monto sistema</th>
                  <th className="px-4 py-3 text-right">Diferencia</th>
                </tr>
              </thead>
              <tbody>
                {vm.movimientosFiltrados.map((m, i) => (
                  <tr key={i} className="border-b border-slate-50 last:border-0 dark:border-slate-800/60">
                    <td className="px-4 py-3 text-slate-600 dark:text-gray-300">{m.fecha ?? '—'}</td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-800 dark:text-gray-200">{m.operacion}</td>
                    <td className="px-4 py-3 text-slate-500 dark:text-gray-400">{m.descripcion || '—'}</td>
                    <td className="px-4 py-3 text-right font-medium text-slate-900 dark:text-white">{fmt(m.monto)}</td>
                    <td className="px-4 py-3">
                      {m.estado === 'CONCILIADO' ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400">
                          <Icon icon="solar:check-circle-bold" width={13} /> Conciliado
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-600 dark:bg-amber-900/20 dark:text-amber-400">
                          <Icon icon="solar:clock-circle-bold" width={13} /> Pendiente
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {m.match ? (
                        <div className="flex flex-col">
                          <span className="font-medium text-slate-800 dark:text-gray-200">{m.match.documento}</span>
                          <span className="text-xs text-slate-400">
                            {m.match.origen === 'VENTA' ? 'Venta' : 'Compra'} · {m.match.contraparte}
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-300 dark:text-gray-600">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-600 dark:text-gray-300">
                      {m.match ? fmt(m.match.monto) : '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {m.match ? (
                        <span
                          className={
                            Math.abs(m.match.diferenciaMonto) > 0.01
                              ? 'font-semibold text-rose-500'
                              : 'text-slate-400'
                          }
                        >
                          {fmt(m.match.diferenciaMonto)}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                  </tr>
                ))}
                {vm.movimientosFiltrados.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-sm text-slate-400">
                      Sin movimientos para este filtro.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagos del sistema sin match en banco */}
      {vm.resultado && vm.resultado.sistemaPendientes.length > 0 && (
        <div className={CARD}>
          <div className="border-b border-slate-100 p-4 dark:border-slate-800">
            <p className="text-sm font-bold text-slate-800 dark:text-white">
              Pagos del sistema sin coincidencia en el banco
            </p>
            <p className="text-xs text-slate-400">
              Ventas/compras con número de operación que no aparecieron en el Excel bancario.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs font-semibold uppercase tracking-wide text-slate-400 dark:border-slate-800">
                  <th className="px-4 py-3">Origen</th>
                  <th className="px-4 py-3">Documento</th>
                  <th className="px-4 py-3">Contraparte</th>
                  <th className="px-4 py-3">N° Operación</th>
                  <th className="px-4 py-3">Método</th>
                  <th className="px-4 py-3">Fecha</th>
                  <th className="px-4 py-3 text-right">Monto</th>
                </tr>
              </thead>
              <tbody>
                {vm.resultado.sistemaPendientes.map((p, i) => (
                  <tr key={i} className="border-b border-slate-50 last:border-0 dark:border-slate-800/60">
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                          p.origen === 'VENTA'
                            ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400'
                            : 'bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400'
                        }`}
                      >
                        {p.origen === 'VENTA' ? 'Venta' : 'Compra'}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-800 dark:text-gray-200">{p.documento}</td>
                    <td className="px-4 py-3 text-slate-500 dark:text-gray-400">{p.contraparte}</td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-700 dark:text-gray-300">{p.operacion}</td>
                    <td className="px-4 py-3 text-slate-500 dark:text-gray-400">{p.medioPago}</td>
                    <td className="px-4 py-3 text-slate-500 dark:text-gray-400">{p.fecha}</td>
                    <td className="px-4 py-3 text-right font-medium text-slate-900 dark:text-white">{fmt(p.monto)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Historial de conciliaciones guardadas */}
      <div className={CARD}>
        <div className="flex items-center justify-between border-b border-slate-100 p-4 dark:border-slate-800">
          <div>
            <p className="text-sm font-bold text-slate-800 dark:text-white">Conciliaciones guardadas</p>
            <p className="text-xs text-slate-400">Historial de conciliaciones que guardaste para consultar luego.</p>
          </div>
          <button
            onClick={vm.cargarGuardadas}
            disabled={vm.cargandoGuardadas}
            className="flex items-center gap-1.5 text-xs font-semibold transition-colors hover:brightness-110 disabled:opacity-50"
            style={{ color: ACCENT }}
          >
            <Icon icon={vm.cargandoGuardadas ? 'svg-spinners:180-ring' : 'solar:refresh-bold'} width={14} />
            Actualizar
          </button>
        </div>

        {vm.guardadas.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-slate-400">Aún no has guardado conciliaciones.</p>
        ) : (
          <div className="divide-y divide-slate-50 dark:divide-slate-800/60">
            {vm.guardadas.map((g) => (
              <div
                key={g.id}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
                style={vm.guardadaActivaId === g.id ? { background: `${ACCENT}10` } : undefined}
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-bold text-slate-800 dark:text-gray-100">
                      {new Date(g.creadoEn).toLocaleString('es-PE')}
                    </span>
                    {(g.fechaInicio || g.fechaFin) && (
                      <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-500 dark:bg-slate-800 dark:text-gray-400">
                        {g.fechaInicio || '…'} → {g.fechaFin || '…'}
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-gray-400">
                    {g.resumen.conciliados} conciliados · {g.resumen.pendientesBanco} pend. banco ·{' '}
                    {g.resumen.pendientesSistema} pend. sistema · {fmt(g.resumen.montoConciliado)} conciliado
                  </p>
                  {g.observaciones && (
                    <p className="mt-0.5 truncate text-xs italic text-slate-400" title={g.observaciones}>
                      “{g.observaciones}”
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => vm.verGuardada(g.id)}
                    className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold transition hover:brightness-105 dark:border-slate-700 dark:bg-slate-900"
                    style={{ color: ACCENT }}
                  >
                    <Icon icon="solar:eye-bold" width={14} /> Ver
                  </button>
                  <button
                    onClick={() => vm.eliminarGuardada(g.id)}
                    className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-rose-600 transition hover:bg-rose-50 dark:border-slate-700 dark:bg-slate-900 dark:text-rose-400 dark:hover:bg-slate-800"
                  >
                    <Icon icon="solar:trash-bin-trash-bold" width={14} /> Eliminar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
