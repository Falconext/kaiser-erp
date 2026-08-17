import React, { useEffect, useState } from 'react';
import { Icon } from '@iconify/react';
import { useCuentasBancariasStore, BANCOS_PERU, ICuentaBancaria, ICreateCuentaBancaria } from '@/zustand/cuentasBancarias';
import useEmpresasStore from '@/zustand/empresas';
import { useAuthStore } from '@/zustand/auth';
import useAlertStore from '@/zustand/alert';

// Dominios oficiales para obtener logos reales via Clearbit
const BANCO_DOMINIOS: Record<string, string> = {
  BCP:        'viabcp.com',
  INTERBANK:  'interbank.pe',
  BBVA:       'bbva.pe',
  SCOTIABANK: 'scotiabank.com.pe',
  PICHINCHA:  'bancopichincha.com.pe',
  BANBIF:     'banbif.com.pe',
  NACION:     'bn.com.pe',
};

const BancoLogo = ({ banco, size = 36 }: { banco: string; size?: number }) => {
  const [error, setError] = useState(false);
  const dominio = BANCO_DOMINIOS[banco];

  // Colores de fallback por banco
  const FALLBACK: Record<string, { bg: string; label: string; color: string }> = {
    BCP:        { bg: '#002F6C', label: 'BCP',    color: '#fff' },
    INTERBANK:  { bg: '#007A4D', label: 'IB',     color: '#fff' },
    BBVA:       { bg: '#004481', label: 'BBVA',   color: '#fff' },
    SCOTIABANK: { bg: '#C8102E', label: 'SB',     color: '#fff' },
    PICHINCHA:  { bg: '#FFD100', label: 'PICH',   color: '#111' },
    BANBIF:     { bg: '#6B21A8', label: 'BIF',    color: '#fff' },
    NACION:     { bg: '#F97316', label: 'BN',     color: '#fff' },
  };
  const fb = FALLBACK[banco] ?? { bg: '#6B7280', label: banco.slice(0, 3), color: '#fff' };

  if (!dominio || error) {
    return (
      <div
        style={{ width: size, height: size, background: fb.bg, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        <span style={{ color: fb.color, fontSize: size * 0.27, fontWeight: 700, fontFamily: 'Arial', letterSpacing: '-0.5px' }}>
          {fb.label}
        </span>
      </div>
    );
  }

  return (
    <img
      src={`https://logo.clearbit.com/${dominio}`}
      alt={banco}
      width={size}
      height={size}
      onError={() => setError(true)}
      style={{ borderRadius: 8, objectFit: 'contain', background: '#f9fafb', border: '1px solid #e5e7eb' }}
    />
  );
};

const EMPTY_FORM: ICreateCuentaBancaria = {
  banco: 'BCP',
  numeroCuenta: '',
  cci: '',
  titular: '',
  tipoCuenta: 'AHORROS',
  moneda: 'PEN',
  alias: '',
  mostrarEnCotizacion: true,
};

export default function CuentasBancariasConfig() {
  const { cuentas, loading, listar, crear, actualizar, eliminar } = useCuentasBancariasStore();
  const [showForm, setShowForm] = useState(false);
  const [editando, setEditando] = useState<ICuentaBancaria | null>(null);
  const [form, setForm] = useState<ICreateCuentaBancaria>(EMPTY_FORM);
  const [mostrarInactivas, setMostrarInactivas] = useState(false);

  // Cuenta de detracciones (Banco de la Nación) — dato de la empresa, se pre-carga en el modal de detracción
  const cuentaDetraccionActual = ((useAuthStore.getState().auth as any)?.empresa?.cuentaDetraccionBN ?? '') as string;
  const [bnCuenta, setBnCuenta] = useState<string>(cuentaDetraccionActual);
  const [savingBN, setSavingBN] = useState(false);

  useEffect(() => { listar(); }, [listar]);

  const guardarCuentaDetraccion = async () => {
    if (savingBN) return;
    try {
      setSavingBN(true);
      const valor = bnCuenta.trim();
      await useEmpresasStore.getState().actualizarMiEmpresa({ cuentaDetraccionBN: valor });
      // Reflejar en la sesión para que el modal de detracción la pre-cargue al instante
      useAuthStore.setState((state: any) =>
        state.auth
          ? { auth: { ...state.auth, empresa: { ...state.auth.empresa, cuentaDetraccionBN: valor } } }
          : state,
      );
      useAlertStore.getState().alert('Cuenta de detracciones guardada', 'success');
    } catch (error: any) {
      useAlertStore.getState().alert(error?.response?.data?.message || error?.message || 'No se pudo guardar', 'error');
    } finally {
      setSavingBN(false);
    }
  };

  const cuentasVisibles = mostrarInactivas ? cuentas : cuentas.filter((c) => c.activo);

  const abrirNuevo = () => { setEditando(null); setForm(EMPTY_FORM); setShowForm(true); };

  const abrirEditar = (cuenta: ICuentaBancaria) => {
    setEditando(cuenta);
    setForm({
      banco: cuenta.banco,
      numeroCuenta: cuenta.numeroCuenta,
      cci: cuenta.cci ?? '',
      titular: cuenta.titular ?? '',
      tipoCuenta: cuenta.tipoCuenta,
      moneda: cuenta.moneda,
      alias: cuenta.alias ?? '',
      mostrarEnCotizacion: cuenta.mostrarEnCotizacion ?? true,
    });
    setShowForm(true);
  };

  const cerrar = () => { setShowForm(false); setEditando(null); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.numeroCuenta.trim()) return;
    const payload = { ...form, cci: form.cci || undefined, alias: form.alias || undefined, titular: form.titular || undefined };
    if (editando) {
      await actualizar(editando.id, payload);
    } else {
      await crear(payload);
    }
    cerrar();
  };

  const handleToggle = async (cuenta: ICuentaBancaria) => {
    if (cuenta.activo) {
      await eliminar(cuenta.id);
    } else {
      await actualizar(cuenta.id, { activo: true });
    }
  };

  const handleToggleCotizacion = async (cuenta: ICuentaBancaria) => {
    await actualizar(cuenta.id, { mostrarEnCotizacion: !(cuenta.mostrarEnCotizacion ?? true) });
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Icon icon="solar:card-bold-duotone" className="text-blue-500" width={20} />
            Cuentas Bancarias
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Agrega las cuentas donde recibes transferencias. Usa el interruptor "En cotización" para elegir cuáles aparecen en tus cotizaciones.
          </p>
        </div>
        <button
          onClick={abrirNuevo}
          className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold btn-accent rounded-xl transition-all shadow-sm"
        >
          <Icon icon="solar:add-circle-bold" width={16} />
          Nueva cuenta
        </button>
      </div>

      {/* Cuenta de detracciones (Banco de la Nación) */}
      <div className="rounded-2xl border border-orange-100 dark:border-orange-900/30 bg-orange-50/40 dark:bg-orange-900/10 p-4">
        <label className="flex items-center gap-1.5 text-xs font-bold text-orange-700 dark:text-orange-300 uppercase tracking-wider mb-1.5">
          <Icon icon="solar:bank-bold-duotone" width={14} /> Cuenta de detracciones (Banco de la Nación)
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={bnCuenta}
            onChange={(e) => setBnCuenta(e.target.value)}
            placeholder="00-000-000000"
            className="flex-1 px-3 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 outline-none"
          />
          <button
            onClick={guardarCuentaDetraccion}
            disabled={savingBN || bnCuenta.trim() === cuentaDetraccionActual.trim()}
            className="px-4 py-2.5 rounded-xl bg-orange-600 text-white text-sm font-semibold hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {savingBN ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
        <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1.5">
          Se rellena automáticamente al configurar la detracción en cotizaciones y comprobantes. Es tu cuenta SPOT en el Banco de la Nación (única y solo para detracciones).
        </p>
      </div>

      {/* Lista */}
      {cuentasVisibles.length === 0 && !loading ? (
        <div className="py-10 text-center border-2 border-dashed border-gray-200 dark:border-slate-700 rounded-2xl">
          <Icon icon="solar:bank-bold-duotone" width={40} className="mx-auto text-gray-300 dark:text-slate-600 mb-3" />
          <p className="text-sm text-gray-500 dark:text-gray-400">No hay cuentas bancarias registradas</p>
          <button onClick={abrirNuevo} className="mt-3 text-sm text-blue-600 hover:underline font-medium">
            Agregar primera cuenta
          </button>
        </div>
      ) : (
        <div className="grid gap-2">
          {cuentasVisibles.map((cuenta) => (
            <div
              key={cuenta.id}
              className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                cuenta.activo
                  ? 'bg-white dark:bg-[#111827] border-gray-100 dark:border-transparent'
                  : 'bg-gray-50 dark:bg-slate-900/50 border-gray-100 dark:border-transparent opacity-60'
              }`}
            >
              <div className="shrink-0">
                <BancoLogo banco={cuenta.banco} size={36} />
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                  {cuenta.alias || cuenta.banco} · {cuenta.numeroCuenta}
                </p>
                <p className="text-xs text-gray-400">
                  {cuenta.tipoCuenta} · {cuenta.moneda}
                  {cuenta.cci ? ` · CCI: ${cuenta.cci}` : ''}
                </p>
              </div>

              {!cuenta.activo && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-200 dark:bg-slate-700 text-gray-500 dark:text-gray-400">
                  INACTIVA
                </span>
              )}

              {cuenta.activo && (
                <button
                  onClick={() => handleToggleCotizacion(cuenta)}
                  disabled={loading}
                  title={(cuenta.mostrarEnCotizacion ?? true) ? 'Se muestra en las cotizaciones — clic para ocultar' : 'Oculta en las cotizaciones — clic para mostrar'}
                  className={`flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold transition-colors disabled:opacity-50 ${
                    (cuenta.mostrarEnCotizacion ?? true)
                      ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/30'
                      : 'bg-gray-100 dark:bg-slate-700 text-gray-400 hover:bg-gray-200 dark:hover:bg-slate-600'
                  }`}
                >
                  <Icon icon={(cuenta.mostrarEnCotizacion ?? true) ? 'solar:check-circle-bold' : 'solar:eye-closed-bold'} width={12} />
                  <span className="hidden sm:inline">En cotización</span>
                </button>
              )}

              <div className="flex items-center gap-1">
                <button
                  onClick={() => abrirEditar(cuenta)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                  title="Editar"
                >
                  <Icon icon="solar:pen-bold" width={15} />
                </button>
                <button
                  onClick={() => handleToggle(cuenta)}
                  className={`p-1.5 rounded-lg transition-colors ${
                    cuenta.activo
                      ? 'text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20'
                      : 'text-gray-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20'
                  }`}
                  title={cuenta.activo ? 'Desactivar' : 'Reactivar'}
                >
                  <Icon icon={cuenta.activo ? 'solar:trash-bin-trash-bold' : 'solar:restart-bold'} width={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {cuentas.some((c) => !c.activo) && (
        <button
          onClick={() => setMostrarInactivas((v) => !v)}
          className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 flex items-center gap-1"
        >
          <Icon icon={mostrarInactivas ? 'solar:eye-closed-bold' : 'solar:eye-bold'} width={13} />
          {mostrarInactivas ? 'Ocultar inactivas' : 'Mostrar inactivas'}
        </button>
      )}

      {/* Modal — z-[9999] para quedar encima del sidebar y su stacking context */}
      {showForm && (
        <div className="fixed top-[-30px] inset-0 bg-black/40 z-[9999] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#111827] rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center gap-3 mb-5">
              <BancoLogo banco={form.banco} size={36} />
              <h4 className="flex-1 font-bold text-gray-900 dark:text-white text-base">
                {editando ? 'Editar cuenta bancaria' : 'Nueva cuenta bancaria'}
              </h4>
              <button onClick={cerrar} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                <Icon icon="solar:close-circle-bold" width={22} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                    Banco *
                  </label>
                  <select
                    value={form.banco}
                    onChange={(e) => setForm((f) => ({ ...f, banco: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  >
                    {BANCOS_PERU.map((b) => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                    Número de cuenta *
                  </label>
                  <input
                    type="text"
                    value={form.numeroCuenta}
                    onChange={(e) => setForm((f) => ({ ...f, numeroCuenta: e.target.value }))}
                    placeholder="Ej: 191-123456789-0-12"
                    required
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                    CCI (opcional)
                  </label>
                  <input
                    type="text"
                    value={form.cci}
                    onChange={(e) => setForm((f) => ({ ...f, cci: e.target.value }))}
                    placeholder="20 dígitos"
                    maxLength={20}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                    Titular (a nombre de)
                  </label>
                  <input
                    type="text"
                    value={form.titular ?? ''}
                    onChange={(e) => setForm((f) => ({ ...f, titular: e.target.value }))}
                    placeholder="Ej: Diego Jesús Ortega Roldán"
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                  <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">Nombre que aparece en "DEPOSITAR A NOMBRE DE" en la cotización. Si lo dejas vacío, se usa la razón social.</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                    Tipo
                  </label>
                  <select
                    value={form.tipoCuenta}
                    onChange={(e) => setForm((f) => ({ ...f, tipoCuenta: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="AHORROS">Ahorros</option>
                    <option value="CORRIENTE">Corriente</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                    Moneda
                  </label>
                  <select
                    value={form.moneda}
                    onChange={(e) => setForm((f) => ({ ...f, moneda: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="PEN">PEN (Soles)</option>
                    <option value="USD">USD (Dólares)</option>
                  </select>
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                    Alias (opcional)
                  </label>
                  <input
                    type="text"
                    value={form.alias}
                    onChange={(e) => setForm((f) => ({ ...f, alias: e.target.value }))}
                    placeholder="Ej: BCP Principal, Cuenta Ventas"
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div className="col-span-2">
                  <label className="flex items-start gap-3 p-3 rounded-xl border border-emerald-100 dark:border-emerald-900/30 bg-emerald-50/40 dark:bg-emerald-900/10 cursor-pointer hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors">
                    <input
                      type="checkbox"
                      checked={form.mostrarEnCotizacion ?? true}
                      onChange={(e) => setForm((f) => ({ ...f, mostrarEnCotizacion: e.target.checked }))}
                      className="mt-0.5 w-4 h-4 text-emerald-600 rounded border-gray-300 dark:border-slate-700 focus:ring-emerald-500"
                    />
                    <span>
                      <span className="block text-sm font-semibold text-gray-900 dark:text-white">Mostrar en cotizaciones</span>
                      <span className="block text-xs text-gray-500 dark:text-gray-400 mt-0.5">Si lo desactivas, esta cuenta no aparecerá en el PDF de las cotizaciones.</span>
                    </span>
                  </label>
                </div>
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={cerrar}
                  className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2.5 rounded-xl btn-accent text-sm font-semibold transition-colors disabled:opacity-60"
                >
                  {loading ? 'Guardando...' : editando ? 'Actualizar' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
