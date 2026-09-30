"use client";
import { Icon } from '@iconify/react';
import moment from 'moment';
import { useCreditoViewModel, soles } from '@/features/admin/credito/useCreditoViewModel';

const ACCENT = 'var(--accent, #7551FF)';
const CARD =
  'bg-white dark:bg-slate-800 rounded-3xl shadow-[0_2px_20px_rgba(15,23,42,0.05)] dark:shadow-none';

const Credito = () => {
  const vm = useCreditoViewModel();

  return (
    <div className="min-h-screen -m-5 p-5 bg-[#F7F8FB] dark:bg-[#0A0D14] font-jakarta">
      <div className="flex items-center gap-2 text-sm text-slate-400 dark:text-gray-400 mb-5">
        <Icon icon="solar:home-smile-linear" className="text-base" />
        <span>Panel</span>
        <Icon icon="solar:alt-arrow-right-linear" className="text-xs" />
        <span>Ventas</span>
        <Icon icon="solar:alt-arrow-right-linear" className="text-xs" />
        <span className="font-semibold" style={{ color: ACCENT }}>Crédito de clientes</span>
      </div>

      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-extrabold text-slate-800 dark:text-white tracking-tight">
            Crédito de clientes
          </h1>
          <p className="text-[13px] text-slate-400 mt-0.5">
            Cuánto se le concede a cada cliente, cuánto debe y cuánto le queda. El límite se pone
            en la ficha del cliente.
          </p>
        </div>
        <button
          onClick={() => void vm.recargar()}
          className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-xl text-[13px] font-semibold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-[var(--accent)] transition"
        >
          <Icon icon="solar:refresh-linear" width={15} /> Actualizar
        </button>
      </div>

      {/* Bandeja del autorizador */}
      <div className={`${CARD} p-5 mb-5`}>
        <div className="flex items-center gap-2 mb-1">
          <Icon icon="solar:shield-warning-bold-duotone" width={18} className="text-amber-500" />
          <h2 className="text-[15px] font-bold text-slate-800 dark:text-white">
            Pedidos esperando V°B° por crédito
          </h2>
          {vm.retenidos.length > 0 && (
            <span className="ml-1 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 text-[11px] font-bold px-2 py-0.5">
              {vm.retenidos.length}
            </span>
          )}
        </div>
        <p className="text-[12px] text-slate-400 mb-3">
          Se tomaron por encima del límite del cliente. El pedido está guardado y en PENDIENTE: lo
          autoriza un responsable desde el pedido mismo.
        </p>

        {vm.retenidos.length === 0 ? (
          <p className="text-[13px] text-slate-400 py-3 text-center">
            {vm.cargado ? 'Ningún pedido está esperando autorización por crédito.' : 'Cargando…'}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="text-left text-slate-400 border-b border-slate-100 dark:border-slate-700">
                  <th className="py-2 pr-3 font-semibold">Documento</th>
                  <th className="py-2 pr-3 font-semibold">Fecha</th>
                  <th className="py-2 pr-3 font-semibold">Cliente</th>
                  <th className="py-2 pr-3 font-semibold text-right">Importe</th>
                  <th className="py-2 pr-3 font-semibold text-right">Debía</th>
                  <th className="py-2 pr-3 font-semibold text-right">Límite</th>
                  <th className="py-2 font-semibold text-right">Se pasa</th>
                </tr>
              </thead>
              <tbody>
                {vm.retenidos.map((p) => (
                  <tr key={p.id} className="border-b border-slate-50 dark:border-slate-700/50">
                    <td className="py-2 pr-3 font-mono text-slate-600 dark:text-slate-300">{p.documento}</td>
                    <td className="py-2 pr-3 text-slate-500">{moment(p.fechaEmision).format('DD/MM/YYYY')}</td>
                    <td className="py-2 pr-3 text-slate-700 dark:text-slate-200">{p.cliente?.nombre ?? '—'}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{soles(p.importe)}</td>
                    <td className="py-2 pr-3 text-right tabular-nums text-slate-500">{soles(p.deudaAlEmitir)}</td>
                    <td className="py-2 pr-3 text-right tabular-nums text-slate-500">{soles(p.limiteAlEmitir)}</td>
                    <td className="py-2 text-right tabular-nums font-bold text-rose-600 dark:text-rose-400">
                      {soles(p.excesoAlEmitir)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Situación por cliente */}
      <div className={`${CARD} p-5`}>
        <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
          <h2 className="text-[15px] font-bold text-slate-800 dark:text-white">Situación por cliente</h2>
          <label className="inline-flex items-center gap-2 text-[12px] text-slate-500 dark:text-slate-400 cursor-pointer">
            <input
              type="checkbox"
              checked={vm.soloExcedidos}
              onChange={(e) => vm.setSoloExcedidos(e.target.checked)}
              className="accent-[var(--accent)]"
            />
            Solo los excedidos
          </label>
        </div>

        {vm.conLimite === 0 ? (
          <div className="py-6 text-center">
            <Icon icon="solar:wallet-money-linear" width={30} className="mx-auto text-slate-300 mb-2" />
            <p className="text-[13px] font-semibold text-slate-600 dark:text-slate-300">
              Todavía no hay ningún cliente con límite de crédito
            </p>
            <p className="text-[12px] text-slate-400 mt-1 max-w-md mx-auto">
              El control está puesto pero no actúa hasta que se le asigne un límite a alguien. Se
              hace en la ficha del cliente, en el bloque <b>Crédito</b>. Sin límite, una venta al
              crédito se emite como siempre.
            </p>
          </div>
        ) : vm.visibles.length === 0 ? (
          <p className="text-[13px] text-slate-400 py-3 text-center">
            Ningún cliente con límite está excedido. Desmarca el filtro para ver todos.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="text-left text-slate-400 border-b border-slate-100 dark:border-slate-700">
                  <th className="py-2 pr-3 font-semibold">Cliente</th>
                  <th className="py-2 pr-3 font-semibold">RUC / DNI</th>
                  <th className="py-2 pr-3 font-semibold text-right">Límite</th>
                  <th className="py-2 pr-3 font-semibold text-right">Deuda</th>
                  <th className="py-2 pr-3 font-semibold text-right">Vencido</th>
                  <th className="py-2 font-semibold text-right">Disponible</th>
                </tr>
              </thead>
              <tbody>
                {vm.visibles.map((f) => (
                  <tr key={f.clienteId} className="border-b border-slate-50 dark:border-slate-700/50">
                    <td className="py-2 pr-3 text-slate-700 dark:text-slate-200">{f.nombre}</td>
                    <td className="py-2 pr-3 font-mono text-slate-500">{f.nroDoc}</td>
                    <td className="py-2 pr-3 text-right tabular-nums text-slate-500">{soles(f.limiteCredito)}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{soles(f.deuda)}</td>
                    <td className={`py-2 pr-3 text-right tabular-nums ${f.deudaVencida > 0 ? 'text-amber-600 dark:text-amber-400 font-semibold' : 'text-slate-400'}`}>
                      {soles(f.deudaVencida)}
                    </td>
                    <td className={`py-2 text-right tabular-nums font-bold ${f.disponible < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                      {soles(f.disponible)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Credito;
