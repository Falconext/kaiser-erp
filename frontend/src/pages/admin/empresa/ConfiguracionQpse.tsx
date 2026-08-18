import { useEffect, useState } from 'react';
import { Icon } from '@iconify/react';
import useEmpresasStore from '@/zustand/empresas';
import { useAuthStore } from '@/zustand/auth';
import useAlertStore from '@/zustand/alert';

/**
 * Configuración de facturación electrónica SUNAT vía QPSE (mono-empresa Kaiser).
 * Guarda usuario/contraseña del PSE (QPSE) en la empresa; el backend los usa al
 * emitir boletas/facturas (ver enviar-sunat.service). Sin planes ni límites.
 */
export default function ConfiguracionQpse() {
  const alert = useAlertStore((s) => s.alert);
  const empresa = (useAuthStore((s) => s.auth) as any)?.empresa;

  const [usuarioPse, setUsuarioPse] = useState('');
  const [contrasenaPse, setContrasenaPse] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [saving, setSaving] = useState(false);
  const [usaDemo, setUsaDemo] = useState(false);

  useEffect(() => {
    setUsuarioPse(empresa?.usuarioPse ?? '');
    setContrasenaPse(empresa?.contrasenaPse ?? '');
    setUsaDemo(String(empresa?.qpseUseDemo ?? '') === 'true' || empresa?.qpseUseDemo === true);
  }, [empresa?.id, empresa?.usuarioPse, empresa?.contrasenaPse]);

  const configurado = !!(empresa?.usuarioPse && empresa?.contrasenaPse);

  const guardar = async () => {
    if (!usuarioPse.trim() || !contrasenaPse.trim()) {
      alert('Ingresa el usuario y la contraseña de QPSE', 'error');
      return;
    }
    setSaving(true);
    try {
      await useEmpresasStore.getState().actualizarMiEmpresa({
        billingProvider: 'QPSE',
        usuarioPse: usuarioPse.trim(),
        contrasenaPse: contrasenaPse.trim(),
      } as any);
      // Reflejar en el store para que quede "configurado".
      useAuthStore.setState((state: any) => ({
        auth: state.auth
          ? { ...state.auth, empresa: { ...state.auth.empresa, billingProvider: 'QPSE', usuarioPse: usuarioPse.trim(), contrasenaPse: contrasenaPse.trim() } }
          : state.auth,
      }));
      alert('Credenciales QPSE guardadas. Ya puedes emitir comprobantes a SUNAT.', 'success');
    } catch (e: any) {
      alert(e?.message || 'No se pudieron guardar las credenciales', 'error');
    } finally {
      setSaving(false);
    }
  };

  const inputCls =
    'h-11 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 text-[14px] text-slate-800 dark:text-white outline-none transition-colors placeholder:text-slate-400 focus:border-[var(--accent,#7551FF)] focus:ring-4 focus:ring-[var(--accent,#7551FF)]/10';

  return (
    <div>
      {/* Estado */}
      <div className={`mb-4 flex items-center gap-2 rounded-xl px-3 py-2.5 text-[13px] font-semibold ${configurado ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300' : 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300'}`}>
        <Icon icon={configurado ? 'solar:check-circle-bold' : 'solar:danger-triangle-bold'} width={17} />
        {configurado ? 'Facturación electrónica configurada (QPSE)' : 'Falta configurar las credenciales de QPSE para emitir a SUNAT'}
      </div>

      <p className="text-[12.5px] text-slate-500 dark:text-slate-400 mb-4">
        Ingresa el usuario y la contraseña que te dio <b>QPSE</b> (proveedor de facturación electrónica).
        El sistema los usará para emitir boletas, facturas y guías de remisión a SUNAT.
      </p>

      <div className="space-y-3.5">
        <div>
          <label className="mb-1 block text-[12px] font-semibold text-slate-600 dark:text-slate-300">Usuario QPSE</label>
          <input value={usuarioPse} onChange={(e) => setUsuarioPse(e.target.value)} placeholder="Usuario del PSE" className={inputCls} autoComplete="off" />
        </div>
        <div>
          <label className="mb-1 block text-[12px] font-semibold text-slate-600 dark:text-slate-300">Contraseña QPSE</label>
          <div className="relative">
            <input value={contrasenaPse} onChange={(e) => setContrasenaPse(e.target.value)} type={showPass ? 'text' : 'password'} placeholder="Contraseña del PSE" className={inputCls} autoComplete="off" />
            <button type="button" onClick={() => setShowPass((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 grid h-7 w-7 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700">
              <Icon icon={showPass ? 'solar:eye-closed-bold' : 'solar:eye-bold'} width={17} />
            </button>
          </div>
        </div>
      </div>

      <button
        onClick={guardar}
        disabled={saving}
        className="mt-5 inline-flex h-11 items-center justify-center gap-2 rounded-xl px-5 text-[14px] font-bold text-white disabled:opacity-60"
        style={{ background: 'var(--accent, #7551FF)' }}
      >
        {saving ? 'Guardando…' : (<><Icon icon="solar:diskette-bold" width={17} /> Guardar credenciales</>)}
      </button>

      <p className="mt-3 text-[11px] text-slate-400">
        Las credenciales se guardan de forma segura y solo se usan para emitir comprobantes electrónicos.
      </p>
    </div>
  );
}
