"use client";
import { Icon } from '@iconify/react';
import { Link } from 'react-router-dom';
import moment from 'moment';
import { useMiDiaViewModel, soles, saludo } from '@/features/admin/mi-dia/useMiDiaViewModel';

const ACCENT = 'var(--accent, #7551FF)';
const CARD =
  'bg-white dark:bg-slate-800 rounded-3xl shadow-[0_2px_20px_rgba(15,23,42,0.05)] dark:shadow-none';

/** Un bloque de trabajo: título, cuántos hay y la lista. Vacío también informa. */
const Bloque = ({
  icono, titulo, cuantos, sub, tono, children, vacio, ver,
}: {
  icono: string; titulo: string; cuantos: number; sub: string;
  tono: 'rose' | 'amber' | 'sky' | 'emerald';
  children: React.ReactNode; vacio: string; ver?: { a: string; texto: string };
}) => {
  const tonos = {
    rose: 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/20',
    amber: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20',
    sky: 'text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-900/20',
    emerald: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20',
  } as const;
  return (
    <div className={`${CARD} p-5`}>
      <div className="flex items-start gap-3 mb-3">
        <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${tonos[tono]}`}>
          <Icon icon={icono} width={18} />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-[15px] font-bold text-slate-800 dark:text-white leading-tight">
            {titulo}
            {cuantos > 0 && (
              <span className={`ml-2 rounded-full px-2 py-0.5 text-[11px] font-bold ${tonos[tono]}`}>
                {cuantos}
              </span>
            )}
          </h2>
          <p className="text-[12px] text-slate-400 mt-0.5">{sub}</p>
        </div>
        {ver && (
          <Link
            to={ver.a}
            className="shrink-0 text-[12px] font-semibold hover:underline"
            style={{ color: ACCENT }}
          >
            {ver.texto}
          </Link>
        )}
      </div>
      {cuantos === 0 ? (
        <p className="text-[13px] text-slate-400 py-2">{vacio}</p>
      ) : (
        <div className="space-y-1.5">{children}</div>
      )}
    </div>
  );
};

/** Una fila de trabajo: documento, cliente, y el dato que decide si actúas. */
const Fila = ({
  documento, cliente, derecha, urgente, nota,
}: {
  documento: string; cliente: string; derecha: string; urgente?: boolean; nota?: string;
}) => (
  <div className="flex items-baseline gap-3 rounded-xl px-2.5 py-2 hover:bg-slate-50 dark:hover:bg-slate-700/40">
    <span className="font-mono text-[12px] font-semibold text-slate-600 dark:text-slate-300 shrink-0">
      {documento}
    </span>
    <span className="text-[13px] text-slate-700 dark:text-slate-200 truncate flex-1 min-w-0">
      {cliente}
      {nota && <span className="text-[11.5px] text-slate-400"> · {nota}</span>}
    </span>
    <span
      className={`text-[12.5px] font-bold tabular-nums shrink-0 ${
        urgente ? 'text-rose-600 dark:text-rose-400' : 'text-slate-500 dark:text-slate-400'
      }`}
    >
      {derecha}
    </span>
  </div>
);

const MiDia = () => {
  const vm = useMiDiaViewModel();
  const d = vm.datos;

  return (
    <div className="min-h-screen -m-5 p-5 bg-[#F7F8FB] dark:bg-[#0A0D14] font-jakarta">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-extrabold text-slate-800 dark:text-white tracking-tight">
            {saludo()}{vm.nombre ? `, ${vm.nombre}` : ''}
          </h1>
          <p className="text-[13px] text-slate-400 mt-0.5">
            {!vm.cargado
              ? 'Cargando tu día…'
              : d && d.pendientesTotal > 0
                ? `Tienes ${d.pendientesTotal} cosa${d.pendientesTotal === 1 ? '' : 's'} que atender hoy.`
                : 'No tienes nada pendiente. Buen momento para cotizar.'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {vm.esGerencia && (
            <label className="inline-flex items-center gap-2 text-[12px] text-slate-500 dark:text-slate-400 cursor-pointer mr-1">
              <input
                type="checkbox"
                checked={vm.todos}
                onChange={(e) => vm.setTodos(e.target.checked)}
                className="accent-[var(--accent)]"
              />
              Ver todo el equipo
            </label>
          )}
          <Link
            to="/administrador/facturacion/cotizaciones/nuevo"
            className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-xl text-[13px] font-semibold text-white transition"
            style={{ background: ACCENT }}
          >
            <Icon icon="solar:document-add-linear" width={15} /> Nueva cotización
          </Link>
          <button
            onClick={() => void vm.recargar()}
            className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-xl text-[13px] font-semibold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-[var(--accent)] transition"
          >
            <Icon icon="solar:refresh-linear" width={15} /> Actualizar
          </button>
        </div>
      </div>

      {/* Sus números, no los de la empresa */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
        <div className={`${CARD} p-4`}>
          <p className="text-[12px] text-slate-400">Vendido este mes</p>
          <p className="text-[26px] font-extrabold tabular-nums text-slate-800 dark:text-white">
            {soles(d?.ventasMes.importe)}
          </p>
          <p className="text-[11.5px] text-slate-400">
            {d?.ventasMes.documentos ?? 0} comprobante{d?.ventasMes.documentos === 1 ? '' : 's'}
          </p>
        </div>
        <div className={`${CARD} p-4`}>
          <p className="text-[12px] text-slate-400">Mi comisión del mes</p>
          <p className="text-[26px] font-extrabold tabular-nums text-emerald-600 dark:text-emerald-400">
            {soles(d?.comisiones.total)}
          </p>
          <p className="text-[11.5px] text-slate-400">
            {soles(d?.comisiones.pendiente)} sin pagar todavía
          </p>
        </div>
        <div className={`${CARD} p-4`}>
          <p className="text-[12px] text-slate-400">Me deben</p>
          <p className="text-[26px] font-extrabold tabular-nums text-slate-800 dark:text-white">
            {soles(d?.porCobrar.total)}
          </p>
          <p className="text-[11.5px] text-slate-400">
            {(d?.porCobrar.vencidos.length ?? 0) > 0
              ? `${d?.porCobrar.vencidos.length} documento(s) vencidos`
              : 'nada vencido'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* 0. Lo que prometí hacer */}
        <Bloque
          icono="solar:alarm-bold-duotone"
          titulo="Lo que quedaste en hacer"
          cuantos={d?.agenda.length ?? 0}
          sub="Gestiones que anotaste en el seguimiento y siguen pendientes."
          tono="amber"
          vacio="No tienes gestiones pendientes anotadas."
          ver={{ a: '/administrador/facturacion/cotizaciones', texto: 'Ver cotizaciones' }}
        >
          {(d?.agenda ?? []).map((a) => (
            <Fila
              key={a.seguimientoId}
              documento={a.documento}
              cliente={a.cliente}
              nota={a.que ?? undefined}
              urgente={a.vencida}
              derecha={
                a.vencida
                  ? `atrasada ${a.diasVencida} d`
                  : 'para hoy'
              }
            />
          ))}
        </Bloque>

        {/* 1. A quién persigo hoy */}
        <Bloque
          icono="solar:phone-calling-rounded-bold-duotone"
          titulo="Llamar hoy"
          cuantos={d?.cotizaciones.porVencer.length ?? 0}
          sub="Cotizaciones que vencen o ya vencieron: pasado el plazo el precio no vale."
          tono="rose"
          vacio="Ninguna cotización tuya está por vencer."
          ver={{ a: '/administrador/facturacion/cotizaciones', texto: 'Ver todas' }}
        >
          {(d?.cotizaciones.porVencer ?? []).map((c) => (
            <Fila
              key={c.id}
              documento={c.documento}
              cliente={c.cliente}
              nota={soles(c.importe)}
              urgente={c.vencida}
              derecha={
                c.vencida
                  ? `vencida hace ${Math.abs(c.diasParaVencer)} d`
                  : c.diasParaVencer === 0
                    ? 'vence hoy'
                    : `vence en ${c.diasParaVencer} d`
              }
            />
          ))}
        </Bloque>

        {/* 2. Qué pedido mío está trabado */}
        <Bloque
          icono="solar:hourglass-line-duotone"
          titulo="Esperando visto bueno"
          cuantos={d?.pedidos.esperandoVoBo.length ?? 0}
          sub="Pedidos tuyos que no avanzan hasta que un responsable los autorice."
          tono="amber"
          vacio="Ningún pedido tuyo está esperando autorización."
          ver={{ a: '/administrador/pedidos', texto: 'Ver pedidos' }}
        >
          {(d?.pedidos.esperandoVoBo ?? []).map((p) => (
            <Fila
              key={p.id}
              documento={p.documento}
              cliente={p.cliente}
              nota={soles(p.importe)}
              urgente={p.retenidoPorCredito}
              derecha={
                p.retenidoPorCredito
                  ? 'retenido por crédito'
                  : p.diasEsperando === 0
                    ? 'hoy'
                    : `${p.diasEsperando} d esperando`
              }
            />
          ))}
        </Bloque>

        {/* 3. Qué le debo al cliente */}
        <Bloque
          icono="solar:box-bold-duotone"
          titulo="Le debo mercadería"
          cuantos={d?.despachos.filas.length ?? 0}
          sub="Vendido y todavía sin salir del almacén. El cliente te va a llamar a ti."
          tono="sky"
          vacio="Todo lo tuyo salió completo del almacén."
          ver={{ a: '/administrador/facturacion/guia-remision/pendientes', texto: 'Ver despachos' }}
        >
          {(d?.despachos.filas ?? []).slice(0, 6).map((f) => {
            const linea = f.detalle.find((l) => l.pendiente > 0);
            return (
              <Fila
                key={f.comprobanteId}
                documento={f.documento}
                cliente={f.cliente?.nombre ?? 'Sin cliente'}
                nota={
                  linea
                    ? `faltan ${linea.pendiente} ${linea.unidad ?? ''} de ${linea.codigo}`
                    : undefined
                }
                urgente={f.diasDesdeEmision > 7}
                derecha={
                  f.estado === 'SIN_DESPACHAR'
                    ? 'sin despachar'
                    : `${f.porcentajeDespachado}% listo`
                }
              />
            );
          })}
          {(d?.despachos.filas.length ?? 0) > 6 && (
            <p className="px-2.5 pt-1 text-[11.5px] text-slate-400">
              y {(d?.despachos.filas.length ?? 0) - 6} más…
            </p>
          )}
        </Bloque>

        {/* 4. Quién me debe */}
        <Bloque
          icono="solar:hand-money-bold-duotone"
          titulo="Cobrar"
          cuantos={d?.porCobrar.vencidos.length ?? 0}
          sub="Documentos tuyos con el plazo vencido."
          tono="emerald"
          vacio={
            (d?.porCobrar.todos.length ?? 0) > 0
              ? `Nada vencido. Tienes ${soles(d?.porCobrar.total)} por cobrar dentro de plazo.`
              : 'No te deben nada.'
          }
          ver={{ a: '/administrador/ventas/pagos', texto: 'Ver cobranza' }}
        >
          {(d?.porCobrar.vencidos ?? []).map((c) => (
            <Fila
              key={c.id}
              documento={c.documento}
              cliente={c.cliente}
              urgente
              derecha={`${soles(c.saldo)} · ${c.diasVencido} d`}
            />
          ))}
        </Bloque>
      </div>
    </div>
  );
};

export default MiDia;
