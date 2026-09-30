"use client";
import { useCallback, useEffect, useState } from 'react';
import { Icon } from '@iconify/react';
import { get } from '@/utils/fetch';
import useAlertStore from '@/zustand/alert';
import { soles } from '@/features/admin/cotizaciones/seguimiento/useSeguimientoViewModel';

const ACCENT = 'var(--accent, #7551FF)';
const CARD =
  'bg-white dark:bg-slate-800 rounded-3xl shadow-[0_2px_20px_rgba(15,23,42,0.05)] dark:shadow-none';

interface Fila { motivo: string; etiqueta: string; cantidad: number; importe: number }
interface Reporte {
  ganadas: number; perdidas: number; tasaCierre: number | null;
  totalPerdido: number; filas: Fila[];
}

const PorQuePerdemos = () => {
  const { load } = useAlertStore();
  const [d, setD] = useState<Reporte | null>(null);
  const [cargado, setCargado] = useState(false);

  const cargar = useCallback(async () => {
    load(true);
    try {
      const r = await get<Reporte>('cotizaciones/por-que-perdemos');
      setD(r.data ?? null);
    } finally {
      load(false);
      setCargado(true);
    }
  }, [load]);

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
        <span className="font-semibold" style={{ color: ACCENT }}>Por qué perdemos</span>
      </div>

      <div className="mb-5">
        <h1 className="text-[22px] font-extrabold text-slate-800 dark:text-white tracking-tight">Por qué perdemos</h1>
        <p className="text-[13px] text-slate-400 mt-0.5 max-w-3xl">
          Cada cotización que se marca como perdida guarda su motivo. Aquí se suman, y se
          ordenan por <b>dinero</b>, no por cantidad: perder diez de S/ 500 por precio no es
          lo mismo que perder una de S/ 80.000 por plazo de entrega.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-5">
        {[
          { t: 'Ganadas', v: String(d?.ganadas ?? 0), c: 'text-emerald-600 dark:text-emerald-400' },
          { t: 'Perdidas', v: String(d?.perdidas ?? 0), c: 'text-rose-600 dark:text-rose-400' },
          { t: 'Tasa de cierre', v: d?.tasaCierre != null ? `${d.tasaCierre}%` : '—', c: 'text-slate-800 dark:text-white' },
          { t: 'Dinero perdido', v: soles(d?.totalPerdido), c: 'text-rose-600 dark:text-rose-400' },
        ].map((k) => (
          <div key={k.t} className={`${CARD} p-4`}>
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
            {d.filas.map((f) => (
              <div key={f.motivo}>
                <div className="flex items-baseline justify-between gap-3 mb-1">
                  <span className="text-[13px] font-semibold text-slate-700 dark:text-slate-200">{f.etiqueta}</span>
                  <span className="text-[12.5px] text-slate-500 dark:text-slate-400 tabular-nums shrink-0">
                    {f.cantidad} cotización{f.cantidad === 1 ? '' : 'es'} · <b className="text-rose-600 dark:text-rose-400">{soles(f.importe)}</b>
                  </span>
                </div>
                <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                  <div className="h-full rounded-full bg-rose-500" style={{ width: `${(f.importe / mayor) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PorQuePerdemos;
