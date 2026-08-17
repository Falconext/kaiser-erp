import { useState } from 'react';
import { Icon } from '@iconify/react';
import apiClient from '@/utils/apiClient';
import { post } from '@/utils/fetch';
import useAlertStore from '@/zustand/alert';
import { useThemeStore, SIDEBAR_COLOR_HEX } from '@/zustand/theme';

const MESES = [
  { id: 1, value: 'Enero' }, { id: 2, value: 'Febrero' }, { id: 3, value: 'Marzo' },
  { id: 4, value: 'Abril' }, { id: 5, value: 'Mayo' }, { id: 6, value: 'Junio' },
  { id: 7, value: 'Julio' }, { id: 8, value: 'Agosto' }, { id: 9, value: 'Septiembre' },
  { id: 10, value: 'Octubre' }, { id: 11, value: 'Noviembre' }, { id: 12, value: 'Diciembre' },
];

const currentYear = new Date().getFullYear();
const ANIOS = Array.from({ length: 6 }, (_, i) => currentYear - i).map((y) => ({ id: y, value: String(y) }));

export default function LibroCompras() {
  const { alert, load } = useAlertStore();
  const sidebarColor = useThemeStore((s) => s.sidebarColor);
  const ACCENT = SIDEBAR_COLOR_HEX[sidebarColor] ?? '#7551FF';
  const [mes, setMes] = useState<number | null>(null);
  const [anio, setAnio] = useState<number | null>(null);
  const [simple, setSimple] = useState(false);
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
    return new URLSearchParams({
      mes: String(mes),
      anio: String(anio),
      simple: String(simple),
    }).toString();
  };

  const handleDescargarTxt = async () => {
    if (!validar()) return;
    try {
      load(true);
      const resp = await apiClient.get(`/contabilidad/sire/compras-txt?${buildQuery()}`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([resp.data], { type: 'text/plain' }));
      const link = document.createElement('a');
      link.href = url;
      const periodo = `${anio}${String(mes).padStart(2, '0')}`;
      link.setAttribute('download', `SIRE_RCE_${periodo}.txt`);
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
      const resp = await apiClient.get(`/contabilidad/sire/compras-excel?${buildQuery()}`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(
        new Blob([resp.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
      );
      const link = document.createElement('a');
      link.href = url;
      const periodo = `${anio}${String(mes).padStart(2, '0')}`;
      link.setAttribute('download', `SIRE_RCE_${periodo}.xlsx`);
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
      const result = await post('/contabilidad/sire/compras-correo', {
        mes,
        anio,
        simple,
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
        <span className="font-semibold" style={{ color: ACCENT }}>Libro electrónico de compras</span>
      </div>

      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <div className="h-11 w-11 grid place-items-center rounded-2xl bg-violet-50 text-violet-600 dark:bg-violet-900/20 dark:text-violet-400 shrink-0">
          <Icon icon="solar:bill-list-bold-duotone" className="text-2xl" />
        </div>
        <div className="min-w-0">
          <h1 className="text-[22px] font-extrabold text-slate-800 dark:text-white tracking-tight">Libro electrónico de compras</h1>
          <p className="text-sm text-slate-400 dark:text-gray-400 mt-0.5">RCE — Registro de Compras Electrónico</p>
        </div>
      </div>

      <div className="max-w-xl mx-auto">
        <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-[0_2px_20px_rgba(15,23,42,0.05)] dark:shadow-none p-8">
          {/* Checkbox */}
          <div className="flex justify-center mb-6">
            <label className="flex items-center gap-2 cursor-pointer select-none text-sm font-medium text-slate-600 dark:text-slate-300">
              <input
                type="checkbox"
                checked={simple}
                onChange={(e) => setSimple(e.target.checked)}
                className="w-4 h-4 rounded accent-violet-600"
              />
              Formato simple
            </label>
          </div>

          {/* Selectores */}
          <div className="flex gap-4 mb-8">
            <div className="flex-1">
              <label className="block text-xs font-bold uppercase tracking-wide text-slate-400 dark:text-gray-400 mb-1.5">Mes</label>
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
              <label className="block text-xs font-bold uppercase tracking-wide text-slate-400 dark:text-gray-400 mb-1.5">Año</label>
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
          <div className="flex flex-wrap justify-center gap-3 mb-3">
            <button
              onClick={handleDescargarTxt}
              className="flex items-center gap-2 h-11 px-5 rounded-2xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              <Icon icon="solar:file-text-bold-duotone" className="text-lg text-violet-500" />
              Descargar TXT
            </button>
            <button
              onClick={() => {
                if (!validar()) return;
                setMostrarCorreo((v) => !v);
              }}
              className="flex items-center gap-2 h-11 px-5 rounded-2xl text-white text-sm font-bold shadow-lg shadow-violet-500/30 hover:brightness-105 transition-all"
              style={{ background: ACCENT }}
            >
              <Icon icon="solar:letter-bold-duotone" className="text-lg" />
              Enviar por correo
            </button>
          </div>

          <div className="flex justify-center mb-6">
            <button
              onClick={handleDescargarExcel}
              className="flex items-center gap-2 h-11 px-6 rounded-2xl border-2 text-sm font-bold hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-colors"
              style={{ borderColor: `${ACCENT}55`, color: ACCENT }}
            >
              <Icon icon="solar:file-check-bold-duotone" className="text-lg" />
              Descargar Excel
            </button>
          </div>

          {/* Panel correo */}
          {mostrarCorreo && (
            <div className="border-t border-slate-100 dark:border-slate-700 pt-6">
              <p className="text-xs font-bold text-slate-400 dark:text-gray-400 uppercase tracking-wide mb-3 text-center">
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
              <p className="text-xs text-slate-400 dark:text-gray-400 mt-2 text-center">
                Se enviará el TXT y Excel adjuntos al correo indicado
              </p>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="mt-4 bg-white dark:bg-slate-800 rounded-3xl shadow-[0_2px_20px_rgba(15,23,42,0.05)] dark:shadow-none p-5">
          <div className="flex gap-3">
            <div className="h-9 w-9 grid place-items-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400 shrink-0">
              <Icon icon="solar:info-circle-bold-duotone" className="text-xl" />
            </div>
            <div className="text-sm text-slate-600 dark:text-slate-300">
              <p className="font-bold text-slate-800 dark:text-white mb-1">Sobre el RCE</p>
              <ul className="space-y-1 text-xs text-slate-500 dark:text-gray-400">
                <li>• El TXT sigue el formato SUNAT para importación en el sistema SIRE.</li>
                <li>• Incluye todas las compras registradas en el período seleccionado.</li>
                <li>• <strong className="text-slate-700 dark:text-slate-200">Formato simple:</strong> incluye solo los campos básicos (base, IGV, total).</li>
                <li>• El proveedor debe estar registrado con su RUC para el formato correcto.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
