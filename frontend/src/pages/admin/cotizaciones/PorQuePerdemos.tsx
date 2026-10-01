"use client";
import { useCallback, useEffect, useState } from 'react';
import { Icon } from '@iconify/react';
import moment from 'moment';
import { useNavigate } from 'react-router-dom';
import { get } from '@/utils/fetch';
import { Calendar } from '@/components/Date';
import useAlertStore from '@/zustand/alert';
import { soles } from '@/features/admin/cotizaciones/seguimiento/useSeguimientoViewModel';

const ACCENT = 'var(--accent, #7551FF)';
const CARD =
  'bg-white dark:bg-slate-800 rounded-3xl shadow-[0_2px_20px_rgba(15,23,42,0.05)] dark:shadow-none';

interface CotizacionPerdida {
  id: number; documento: string; cliente: string;
  importe: number; fecha: string; nota: string | null;
}
interface Fila {
  motivo: string; etiqueta: string; cantidad: number; importe: number;
  cotizaciones: CotizacionPerdida[];
}
interface Reporte {
  ganadas: number; perdidas: number; abiertas: number; tasaCierre: number | null;
  totalPerdido: number; filas: Fila[];
}

const PorQuePerdemos = () => {
  const { load } = useAlertStore();
  const navigate = useNavigate();
  const [d, setD] = useState<Reporte | null>(null);
  const [cargado, setCargado] = useState(false);
  // Por defecto el año corriente, no todo el histórico: "¿por qué perdemos?" es
  // una pregunta sobre el presente, y sin acotar el periodo los motivos de hace
  // tres años pesan igual que los de este mes.
  const [desde, setDesde] = useState(moment().startOf('year').format('YYYY-MM-DD'));
  const [hasta, setHasta] = useState(moment().format('YYYY-MM-DD'));
  const [abierto, setAbierto] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    load(true);
    try {
      const q = new URLSearchParams({ desde, hasta });
      const r = await get<Reporte>(`cotizaciones/por-que-perdemos?${q}`);
      setD(r.data ?? null);
    } finally {
      load(false);
      setCargado(true);
    }
  }, [load, desde, hasta]);

  useEffect(() => { void cargar(); }, [cargar]);

  const mayor = Math.max(1, ...(d?.filas ?? []).map((f) => f.importe));

  return (
    <div className="min-h-screen -m-5 p-5 bg-[#F7F8FB] dark:bg-[#0A0D14] font-jakarta">
      <div className="flex items-center gap-2 text-sm text-slate-400 dark:text-gray-400 mb-5">
        <Icon icon="solar:home-smile-linear" className="text-base" />
        <span>Panel</span>
        <Icon icon="solar:alt-arrow-right-linear" className="text-xs" />
        <span>Cotizaciones</span>
        <Icon icon="solar:alt-arrow-right-linear" className="text-xs" />
        <span className="font-semibold" style={{ color: ACCENT }}>Cierre de cotizaciones</span>
      </div>

      <div className="mb-5">
        <h1 className="text-[22px] font-extrabold text-slate-800 dark:text-white tracking-tight">Cierre de cotizaciones</h1>
        <p className="text-[13px] text-slate-400 mt-0.5 max-w-3xl">
          Por qué ganamos y por qué perdemos. Cada cotización marcada como perdida guarda
          su motivo; aquí se suman y se ordenan por <b>dinero</b>, no por cantidad: perder
          diez de S/ 500 por precio no es lo mismo que perder una de S/ 80.000 por plazo
          de entrega. Pulsa un motivo para ver de qué clientes.
        </p>
        {/* Cada Calendar en su caja con ancho: el componente ocupa el 100 % del
            contenedor, así que sueltos en el flex salían a lo ancho de la página. */}
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <div className="w-[170px]">
            <Calendar
              text="Desde" name="desde" portal className="admin-date-filter"
              value={moment(desde, 'YYYY-MM-DD').format('DD/MM/YYYY')}
              onChange={(f: string) => { if (moment(f, 'DD/MM/YYYY', true).isValid()) setDesde(moment(f, 'DD/MM/YYYY').format('YYYY-MM-DD')); }}
            />
          </div>
          <div className="w-[170px]">
            <Calendar
              text="Hasta" name="hasta" portal className="admin-date-filter"
              value={moment(hasta, 'YYYY-MM-DD').format('DD/MM/YYYY')}
              onChange={(f: string) => { if (moment(f, 'DD/MM/YYYY', true).isValid()) setHasta(moment(f, 'DD/MM/YYYY').format('YYYY-MM-DD')); }}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-5 gap-4 mb-5">
        {[
          { t: 'Ganadas', v: String(d?.ganadas ?? 0), c: 'text-emerald-600 dark:text-emerald-400', ayuda: 'Cotizaciones que terminaron en comprobante' },
          { t: 'Perdidas', v: String(d?.perdidas ?? 0), c: 'text-rose-600 dark:text-rose-400', ayuda: 'Marcadas como perdidas, con su motivo' },
          { t: 'Abiertas', v: String(d?.abiertas ?? 0), c: 'text-slate-500 dark:text-slate-300', ayuda: 'Ni ganadas ni perdidas: siguen vivas y no entran en la tasa' },
          { t: 'Tasa de cierre', v: d?.tasaCierre != null ? `${d.tasaCierre}%` : '—', c: 'text-slate-800 dark:text-white', ayuda: 'Ganadas sobre cotizaciones ya cerradas (ganadas + perdidas)' },
          { t: 'Dinero perdido', v: soles(d?.totalPerdido), c: 'text-rose-600 dark:text-rose-400', ayuda: 'Suma de lo cotizado que no se cerró' },
        ].map((k) => (
          <div key={k.t} className={`${CARD} p-4`} title={k.ayuda}>
            <p className="text-[12px] text-slate-400">{k.t}</p>
            <p className={`text-[24px] font-extrabold tabular-nums ${k.c}`}>{k.v}</p>
          </div>
        ))}
      </div>

      <div className={`${CARD} p-5`}>
        {!cargado ? (
          <p className="text-[13px] text-slate-400 py-6 text-center">Cargando…</p>
        ) : !d || d.filas.length === 0 ? (
          <div className="py-10 text-center">
            <Icon icon="solar:chart-square-linear" width={32} className="mx-auto text-slate-300 mb-2" />
            <p className="text-[13px] font-semibold text-slate-600 dark:text-slate-300">
              Todavía no hay cotizaciones marcadas como perdidas
            </p>
            <p className="text-[12px] text-slate-400 mt-1 max-w-lg mx-auto">
              Cuando una cotización no prospere, ábrela y usa <b>Seguimiento → Marcar como
              perdida</b>. El documento no se borra: queda con su motivo y aparece aquí.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {d.filas.map((f) => {
              const desplegado = abierto === f.motivo;
              return (
              <div key={f.motivo}>
                {/* La barra abre el detalle: un motivo con tres cotizaciones y
                    S/ 1.341 no dice qué hacer hasta que se ve DE QUIÉN son. */}
                <button
                  type="button"
                  onClick={() => setAbierto(desplegado ? null : f.motivo)}
                  className="w-full text-left rounded-lg px-1 py-0.5 transition hover:bg-slate-50 dark:hover:bg-slate-700/40"
                >
                  <div className="flex items-baseline justify-between gap-3 mb-1">
                    <span className="flex items-center gap-1 text-[13px] font-semibold text-slate-700 dark:text-slate-200">
                      <Icon icon={desplegado ? 'solar:alt-arrow-down-linear' : 'solar:alt-arrow-right-linear'} width={13} className="text-slate-400" />
                      {f.etiqueta}
                    </span>
                    <span className="text-[12.5px] text-slate-500 dark:text-slate-400 tabular-nums shrink-0">
                      {f.cantidad} cotización{f.cantidad === 1 ? '' : 'es'} · <b className="text-rose-600 dark:text-rose-400">{soles(f.importe)}</b>
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                    <div className="h-full rounded-full bg-rose-500" style={{ width: `${(f.importe / mayor) * 100}%` }} />
                  </div>
                </button>

                {desplegado && (
                  <div className="mt-2 ml-4 rounded-xl border border-slate-100 dark:border-slate-700 overflow-hidden">
                    {f.cotizaciones.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => navigate(`/administrador/facturacion/cotizaciones?buscar=${encodeURIComponent(c.documento)}`)}
                        title="Ver en el listado de cotizaciones"
                        className="w-full flex flex-wrap items-baseline gap-x-3 gap-y-0.5 px-3 py-2 text-left border-b border-slate-50 dark:border-slate-700/50 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-700/40"
                      >
                        <span className="font-mono text-[11.5px] text-slate-500 dark:text-slate-400">{c.documento}</span>
                        <span className="flex-1 min-w-[140px] text-[12.5px] font-semibold text-slate-700 dark:text-slate-200">{c.cliente}</span>
                        <span className="text-[11.5px] text-slate-400">{moment(c.fecha).format('DD/MM/YYYY')}</span>
                        <span className="text-[12.5px] font-bold tabular-nums text-rose-600 dark:text-rose-400">{soles(c.importe)}</span>
                        {c.nota && (
                          <span className="w-full text-[11.5px] text-slate-400 italic">“{c.nota}”</span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default PorQuePerdemos;
