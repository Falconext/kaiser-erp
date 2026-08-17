import { useState } from 'react';
import { Icon } from '@iconify/react';
import apiClient from '@/utils/apiClient';
import { post } from '@/utils/fetch';
import useAlertStore from '@/zustand/alert';

const MESES = [
  { id: 1, value: 'Enero' }, { id: 2, value: 'Febrero' }, { id: 3, value: 'Marzo' },
  { id: 4, value: 'Abril' }, { id: 5, value: 'Mayo' }, { id: 6, value: 'Junio' },
  { id: 7, value: 'Julio' }, { id: 8, value: 'Agosto' }, { id: 9, value: 'Septiembre' },
  { id: 10, value: 'Octubre' }, { id: 11, value: 'Noviembre' }, { id: 12, value: 'Diciembre' },
];

const currentYear = new Date().getFullYear();
const ANIOS = Array.from({ length: 6 }, (_, i) => currentYear - i).map((y) => ({ id: y, value: String(y) }));

const ACCENT = 'var(--accent, #7551FF)';

export default function LibroVentas() {
  const { alert, load } = useAlertStore();
  const [mes, setMes] = useState<number | null>(null);
  const [anio, setAnio] = useState<number | null>(null);
  const [simple, setSimple] = useState(false);
  const [empresarial, setEmpresarial] = useState(false);
  const [enviandoCorreo, setEnviandoCorreo] = useState(false);
  const [destinatario, setDestinatario] = useState('');
  const [mostrarCorreo, setMostrarCorreo] = useState(false);

  const validar = () => {
    if (!mes || !anio) {
      alert('Selecciona el mes y año', 'warning');
      return false;
    }
    return true;
  };

  const buildQuery = () => {
    const params = new URLSearchParams({
      mes: String(mes),
      anio: String(anio),
      simple: String(simple),
      empresarial: String(empresarial),
    });
    return params.toString();
  };

  const handleDescargarTxt = async () => {
    if (!validar()) return;
    try {
      load(true);
      const resp = await apiClient.get(`/contabilidad/sire/ventas-txt?${buildQuery()}`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([resp.data], { type: 'text/plain' }));
      const link = document.createElement('a');
      link.href = url;
      const periodo = `${anio}${String(mes).padStart(2, '0')}`;
      link.setAttribute('download', `SIRE_RVIE_${periodo}.txt`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      alert('Error al generar el TXT', 'error');
    } finally {
      load(false);
    }
  };

  const handleDescargarExcel = async () => {
    if (!validar()) return;
    try {
      load(true);
      const resp = await apiClient.get(`/contabilidad/sire/ventas-excel?${buildQuery()}`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(
        new Blob([resp.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
      );
      const link = document.createElement('a');
      link.href = url;
      const periodo = `${anio}${String(mes).padStart(2, '0')}`;
      link.setAttribute('download', `SIRE_RVIE_${periodo}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      alert('Error al generar el Excel', 'error');
    } finally {
      load(false);
    }
  };

  const handleEnviarCorreo = async () => {
    if (!validar()) return;
    if (!destinatario.trim()) {
      alert('Ingresa el correo destinatario', 'warning');
      return;
    }
    try {
      setEnviandoCorreo(true);
      const result = await post('/contabilidad/sire/ventas-correo', {
        mes,
        anio,
        simple,
        empresarial,
        destinatario: destinatario.trim(),
      });
      if (!result.success) {
        alert((result as any).error ?? 'Error al enviar el correo', 'error');
        return;
      }
      alert('Correo enviado correctamente', 'success');
      setMostrarCorreo(false);
      setDestinatario('');
    } finally {
      setEnviandoCorreo(false);
    }
  };

  return (
    <div className="min-h-screen -m-5 p-5 bg-[#F7F8FB] dark:bg-[#0A0D14] font-jakarta">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-400 dark:text-gray-400 mb-5">
        <Icon icon="solar:home-smile-linear" className="text-base" />
        <span>Reporte SUNAT</span>
        <Icon icon="solar:alt-arrow-right-linear" className="text-xs" />
        <span className="font-semibold" style={{ color: ACCENT }}>Libro electrónico de ventas</span>
      </div>

      {/* Header */}
      <div className="mb-5">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-2xl bg-violet-50 text-violet-600 dark:bg-violet-900/20 dark:text-violet-400 grid place-items-center shrink-0">
            <Icon icon="solar:notebook-bold-duotone" className="text-2xl" />
          </div>
          <div>
            <h1 className="text-[22px] font-extrabold text-slate-800 dark:text-white tracking-tight">Libro electrónico de ventas</h1>
            <p className="text-sm text-slate-400 dark:text-gray-400 mt-0.5">RVIE — Registro de Ventas e Ingresos Electrónico</p>
          </div>
        </div>
      </div>

      <div className="max-w-xl mx-auto">
        <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-[0_2px_20px_rgba(15,23,42,0.05)] dark:shadow-none border border-slate-100 dark:border-slate-700 p-8">
          {/* Opciones */}
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400 dark:text-gray-400 mb-3">Opciones del reporte</p>
          <div className="flex flex-wrap gap-3 mb-6">
            <label className="flex items-center gap-2.5 cursor-pointer select-none text-sm font-medium text-slate-600 dark:text-slate-300 rounded-2xl border-2 border-slate-200 dark:border-slate-700 px-4 py-2.5 hover:border-slate-300 dark:hover:border-slate-600 transition-colors has-[:checked]:border-[var(--accent)] has-[:checked]:bg-violet-50 dark:has-[:checked]:bg-violet-900/20">
              <input
                type="checkbox"
                checked={simple}
                onChange={(e) => setSimple(e.target.checked)}
                className="w-4 h-4 rounded accent-violet-600"
              />
              Formato simple
            </label>
            <label className="flex items-center gap-2.5 cursor-pointer select-none text-sm font-medium text-slate-600 dark:text-slate-300 rounded-2xl border-2 border-slate-200 dark:border-slate-700 px-4 py-2.5 hover:border-slate-300 dark:hover:border-slate-600 transition-colors has-[:checked]:border-[var(--accent)] has-[:checked]:bg-violet-50 dark:has-[:checked]:bg-violet-900/20">
              <input
                type="checkbox"
                checked={empresarial}
                onChange={(e) => setEmpresarial(e.target.checked)}
                className="w-4 h-4 rounded accent-violet-600"
              />
              Reporte empresarial
            </label>
          </div>

          {/* Selectores */}
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400 dark:text-gray-400 mb-3">Periodo</p>
          <div className="flex gap-4 mb-8">
            <div className="flex-1">
              <select
                value={mes ?? ''}
                onChange={(e) => setMes(e.target.value ? Number(e.target.value) : null)}
                className="w-full h-11 rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:border-[var(--accent)] transition-colors"
              >
                <option value="">Mes</option>
                {MESES.map((m) => (
                  <option key={m.id} value={m.id}>{m.value}</option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <select
                value={anio ?? ''}
                onChange={(e) => setAnio(e.target.value ? Number(e.target.value) : null)}
                className="w-full h-11 rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:border-[var(--accent)] transition-colors"
              >
                <option value="">Año</option>
                {ANIOS.map((a) => (
                  <option key={a.id} value={a.id}>{a.value}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Botones principales */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              onClick={handleDescargarTxt}
              className="h-11 flex items-center justify-center gap-2 rounded-2xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              <Icon icon="solar:file-text-bold-duotone" className="text-lg text-violet-500" />
              Descargar TXT
            </button>
            <button
              onClick={handleDescargarExcel}
              className="h-11 flex items-center justify-center gap-2 rounded-2xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              <Icon icon="solar:file-check-bold-duotone" className="text-lg text-emerald-500" />
              Descargar Excel
            </button>
          </div>

          <button
            onClick={() => {
              if (!validar()) return;
              setMostrarCorreo((v) => !v);
            }}
            className="mt-3 w-full h-11 flex items-center justify-center gap-2 rounded-2xl text-white text-sm font-bold shadow-lg shadow-violet-500/30 hover:brightness-105 transition-all"
            style={{ background: ACCENT }}
          >
            <Icon icon="solar:letter-bold-duotone" className="text-lg" />
            Enviar por correo
          </button>

          {/* Panel correo */}
          {mostrarCorreo && (
            <div className="mt-6 border-t border-slate-100 dark:border-slate-700 pt-6">
              <p className="text-xs font-bold text-slate-400 dark:text-gray-400 uppercase tracking-wide mb-3">
                Envío automático
              </p>
              <div className="flex gap-2">
                <input
                  type="email"
                  placeholder="correo@ejemplo.com"
                  value={destinatario}
                  onChange={(e) => setDestinatario(e.target.value)}
                  className="flex-1 h-11 rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 text-sm text-slate-700 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-gray-500 focus:outline-none focus:border-[var(--accent)] transition-colors"
                />
                <button
                  onClick={handleEnviarCorreo}
                  disabled={enviandoCorreo}
                  className="h-11 w-11 grid place-items-center rounded-2xl text-white shadow-lg shadow-violet-500/30 hover:brightness-105 transition-all disabled:opacity-50"
                  style={{ background: ACCENT }}
                >
                  {enviandoCorreo ? (
                    <Icon icon="solar:refresh-circle-bold-duotone" className="animate-spin text-lg" />
                  ) : (
                    <Icon icon="solar:plain-bold-duotone" className="text-lg" />
                  )}
                </button>
              </div>
              <p className="text-xs text-slate-400 dark:text-gray-400 mt-2">
                Se enviará el TXT y Excel adjuntos al correo indicado
              </p>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="mt-4 bg-white dark:bg-slate-800 rounded-3xl shadow-[0_2px_20px_rgba(15,23,42,0.05)] dark:shadow-none border border-slate-100 dark:border-slate-700 p-5">
          <div className="flex gap-3">
            <div className="h-9 w-9 rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400 grid place-items-center shrink-0">
              <Icon icon="solar:info-circle-bold-duotone" className="text-xl" />
            </div>
            <div className="text-sm">
              <p className="font-bold text-slate-800 dark:text-white mb-1.5">Sobre el RVIE</p>
              <ul className="space-y-1 text-xs text-slate-500 dark:text-gray-400">
                <li>• El TXT sigue el formato SUNAT para importación en el sistema SIRE.</li>
                <li>• Incluye Facturas (01), Boletas (03), Notas de Crédito (07) y Débito (08).</li>
                <li>• <strong className="text-slate-700 dark:text-slate-200">Formato simple:</strong> incluye los campos básicos del registro.</li>
                <li>• <strong className="text-slate-700 dark:text-slate-200">Reporte empresarial:</strong> consolida todas las sedes.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
