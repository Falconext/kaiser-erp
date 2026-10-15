import { useCallback, useEffect, useRef, useState } from 'react';
import { Icon } from '@iconify/react';
import apiClient from '@/utils/apiClient';
import useAlertStore from '@/zustand/alert';
import { usePuedeEscribir } from '@/hooks/usePuedeEscribir';

/**
 * El expediente digital de la recepción.
 *
 * Almacén lo pidió con estas palabras: «revisar la documentación: orden de
 * compra, packing list, factura, guía u otros documentos» y «esta documentación
 * debería poder subirse al ERP a fin de que podamos alimentar un archivo
 * digital». Y por separado, para las incidencias: «la nota de ingreso debe
 * tener la opción de subir el reporte de la incidencia en caso haya alguno».
 *
 * Los endpoints existían desde el 28-sep; lo que no existía era desde dónde
 * usarlos, así que los papeles seguían cruzándose a mano.
 */

type CompraDocumento = {
  id: number;
  tipo: string;
  nombre: string;
  url: string;
  mimeType: string | null;
  tamano: number | null;
  observacion: string | null;
  creadoEn: string;
  usuario?: { id: number; nombre: string } | null;
};

export const TIPOS_DOCUMENTO_COMPRA = [
  { value: 'ORDEN_COMPRA', label: 'Orden de compra' },
  { value: 'PACKING_LIST', label: 'Packing list' },
  { value: 'FACTURA', label: 'Factura del proveedor' },
  { value: 'GUIA_REMISION', label: 'Guía de remisión' },
  { value: 'INCIDENCIA', label: 'Reporte de incidencia' },
  { value: 'OTRO', label: 'Otro' },
];

const tipoLabel = (t: string) =>
  TIPOS_DOCUMENTO_COMPRA.find((x) => x.value === t)?.label || t;

const ICONO: Record<string, string> = {
  ORDEN_COMPRA: 'solar:clipboard-list-bold-duotone',
  PACKING_LIST: 'solar:box-bold-duotone',
  FACTURA: 'solar:bill-list-bold-duotone',
  GUIA_REMISION: 'solar:delivery-bold-duotone',
  INCIDENCIA: 'solar:danger-triangle-bold-duotone',
  OTRO: 'solar:file-text-bold-duotone',
};

const MAX_BYTES = 15 * 1024 * 1024;

const formatBytes = (bytes?: number | null) => {
  if (!bytes || bytes <= 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

interface Props {
  isOpen: boolean;
  compra: any | null;
  onClose: () => void;
}

export default function ModalDocumentosCompra({ isOpen, compra, onClose }: Props) {
  const alert = useAlertStore((s) => s.alert);
  const puedeEscribir = usePuedeEscribir('compras:escribir');
  const fileRef = useRef<HTMLInputElement | null>(null);

  const [docs, setDocs] = useState<CompraDocumento[]>([]);
  const [loading, setLoading] = useState(false);
  const [subiendo, setSubiendo] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);

  const [file, setFile] = useState<File | null>(null);
  const [tipo, setTipo] = useState('PACKING_LIST');
  const [nombre, setNombre] = useState('');
  const [observacion, setObservacion] = useState('');

  const compraId = compra?.id ?? null;

  const cargar = useCallback(async () => {
    if (!compraId) return;
    setLoading(true);
    try {
      const resp: any = await apiClient.get(`/compras/${compraId}/documentos`);
      const lista = Array.isArray(resp?.data?.data) ? resp.data.data : Array.isArray(resp?.data) ? resp.data : [];
      setDocs(lista);
    } catch {
      setDocs([]);
    } finally {
      setLoading(false);
    }
  }, [compraId]);

  useEffect(() => {
    if (isOpen && compraId) void cargar();
    if (!isOpen) {
      setFile(null);
      setNombre('');
      setObservacion('');
      setTipo('PACKING_LIST');
      if (fileRef.current) fileRef.current.value = '';
    }
  }, [isOpen, compraId, cargar]);

  const handleFile = (f: File | null) => {
    if (!f) { setFile(null); return; }
    if (f.size > MAX_BYTES) {
      alert('El archivo supera el máximo de 15 MB', 'error');
      if (fileRef.current) fileRef.current.value = '';
      return;
    }
    setFile(f);
    if (!nombre.trim()) setNombre(f.name.replace(/\.[^.]+$/, ''));
  };

  const subir = async () => {
    if (!compraId || !file) return;
    setSubiendo(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('tipo', tipo);
      if (nombre.trim()) fd.append('nombre', nombre.trim());
      if (observacion.trim()) fd.append('observacion', observacion.trim());
      await apiClient.post(`/compras/${compraId}/documentos`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      alert('Documento adjuntado a la recepción', 'success');
      setFile(null);
      setNombre('');
      setObservacion('');
      if (fileRef.current) fileRef.current.value = '';
      await cargar();
    } catch (e: any) {
      alert(e?.response?.data?.message || 'No se pudo subir el documento', 'error');
    } finally {
      setSubiendo(false);
    }
  };

  const eliminar = async (doc: CompraDocumento) => {
    if (!compraId) return;
    if (!window.confirm(`¿Quitar "${doc.nombre}" del expediente de esta compra?`)) return;
    setBusyId(doc.id);
    try {
      await apiClient.delete(`/compras/${compraId}/documentos/${doc.id}`);
      alert('Documento eliminado', 'success');
      await cargar();
    } catch (e: any) {
      alert(e?.response?.data?.message || 'No se pudo eliminar el documento', 'error');
    } finally {
      setBusyId(null);
    }
  };

  if (!isOpen || !compra) return null;

  const incidencias = docs.filter((d) => d.tipo === 'INCIDENCIA').length;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/50 p-0 sm:p-5" onClick={onClose}>
      <div
        className="bg-white dark:bg-[#111827] w-full sm:max-w-2xl max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white dark:bg-[#111827] px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-lg font-extrabold text-slate-800 dark:text-white">
              Documentos de la recepción
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {compra.serie || ''}{compra.numero ? `-${compra.numero}` : ''}
              {compra.proveedor?.nombre ? ` · ${compra.proveedor.nombre}` : ''}
            </p>
          </div>
          <button onClick={onClose} className="h-9 w-9 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-500 flex items-center justify-center shrink-0">
            <Icon icon="solar:close-circle-bold" className="text-lg" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {puedeEscribir && (
            <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/30 p-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-300 mb-1">
                    Archivo (PDF, imagen o Excel · máx. 15 MB)
                  </label>
                  <input
                    ref={fileRef}
                    type="file"
                    onChange={(e) => handleFile(e.target.files?.[0] || null)}
                    className="w-full text-sm text-slate-600 dark:text-slate-300 file:mr-3 file:h-9 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-slate-200 dark:file:bg-slate-700 file:text-slate-700 dark:file:text-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-300 mb-1">Tipo</label>
                  <select
                    value={tipo}
                    onChange={(e) => setTipo(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200"
                  >
                    {TIPOS_DOCUMENTO_COMPRA.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-300 mb-1">Nombre</label>
                  <input
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    placeholder="Packing list PL-2026-114"
                    className="w-full h-10 px-3 rounded-xl text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-300 mb-1">
                    Observación {tipo === 'INCIDENCIA' ? '— qué faltó, qué sobró o qué vino dañado' : '(opcional)'}
                  </label>
                  <input
                    value={observacion}
                    onChange={(e) => setObservacion(e.target.value)}
                    placeholder={tipo === 'INCIDENCIA' ? 'Faltaron 2 rollos del lote 4412' : 'Lo que almacén deba recordar de este papel'}
                    className="w-full h-10 px-3 rounded-xl text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200"
                  />
                </div>
              </div>
              <div className="flex justify-end mt-3">
                <button
                  onClick={() => void subir()}
                  disabled={!file || subiendo}
                  className="h-10 px-5 rounded-xl text-sm font-bold text-white bg-slate-900 dark:bg-slate-200 dark:text-slate-900 hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center gap-2"
                >
                  <Icon icon="solar:upload-bold" className="text-base" />
                  {subiendo ? 'Subiendo…' : 'Adjuntar'}
                </button>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
              Expediente · {docs.length} documento{docs.length === 1 ? '' : 's'}
            </p>
            {incidencias > 0 && (
              <span className="text-[11px] font-bold px-2 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-900/40">
                {incidencias} incidencia{incidencias === 1 ? '' : 's'}
              </span>
            )}
          </div>

          <div className="space-y-2">
            {docs.map((doc) => (
              <div key={doc.id} className="flex items-start gap-3 rounded-2xl border border-slate-100 dark:border-slate-800 p-3">
                <div className="h-10 w-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 flex items-center justify-center shrink-0">
                  <Icon icon={ICONO[doc.tipo] || ICONO.OTRO} className="text-xl" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-slate-800 dark:text-white truncate">{doc.nombre}</p>
                  <p className="text-xs text-slate-400">
                    {tipoLabel(doc.tipo)}
                    {doc.tamano ? ` · ${formatBytes(doc.tamano)}` : ''}
                    {doc.usuario?.nombre ? ` · ${doc.usuario.nombre}` : ''}
                  </p>
                  {doc.observacion && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{doc.observacion}</p>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => window.open(doc.url, '_blank')}
                    className="h-9 w-9 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-200 flex items-center justify-center"
                    title="Abrir"
                  >
                    <Icon icon="solar:eye-bold" className="text-base" />
                  </button>
                  {puedeEscribir && (
                    <button
                      onClick={() => void eliminar(doc)}
                      disabled={busyId === doc.id}
                      className="h-9 w-9 rounded-xl bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-300 flex items-center justify-center disabled:opacity-40"
                      title="Quitar del expediente"
                    >
                      <Icon icon="solar:trash-bin-trash-bold-duotone" className="text-base" />
                    </button>
                  )}
                </div>
              </div>
            ))}

            {!docs.length && !loading && (
              <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 p-6 text-center">
                <Icon icon="solar:folder-open-bold-duotone" className="mx-auto mb-2 text-4xl text-slate-200 dark:text-slate-600" />
                <p className="text-sm text-slate-400">Esta recepción todavía no tiene papeles adjuntos.</p>
                <p className="text-xs text-slate-400 mt-1">
                  Sube la orden de compra, el packing list, la factura del proveedor o el reporte de incidencia.
                </p>
              </div>
            )}

            {loading && <p className="text-sm text-slate-400 text-center py-4">Cargando…</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
