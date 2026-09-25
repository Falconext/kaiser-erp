import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Icon } from '@iconify/react';
import apiClient from '@/utils/apiClient';
import useAlertStore from '@/zustand/alert';

export type TipoDocumentoProducto = 'FICHA_TECNICA' | 'CERTIFICADO' | 'MANUAL' | 'OTRO';

export interface IProductoDocumento {
    id: number;
    productoId: number;
    tipo: TipoDocumentoProducto | string;
    nombre: string;
    url: string;
    urlDescarga?: string | null;
    key?: string | null;
    mimeType?: string | null;
    tamano?: number | null;
    esPrincipal: boolean;
    creadoEn?: string;
}

export const TIPOS_DOCUMENTO_PRODUCTO: { value: TipoDocumentoProducto; label: string }[] = [
    { value: 'FICHA_TECNICA', label: 'Ficha técnica' },
    { value: 'CERTIFICADO', label: 'Certificado' },
    { value: 'MANUAL', label: 'Manual' },
    { value: 'OTRO', label: 'Otro' },
];

const tipoLabel = (tipo: string) =>
    TIPOS_DOCUMENTO_PRODUCTO.find((t) => t.value === tipo)?.label || tipo;

const formatBytes = (bytes?: number | null) => {
    if (!bytes || bytes <= 0) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const MAX_BYTES = 15 * 1024 * 1024;

interface Props {
    productoId: number | null;
    isEdit: boolean;
}

/**
 * Documentos adjuntos del producto (ficha técnica PDF, certificados, manuales).
 * Solo funciona cuando el producto ya existe (necesita productoId).
 */
export const ProductDocumentsManager: React.FC<Props> = ({ productoId, isEdit }) => {
    const alert = useAlertStore((s) => s.alert);
    const fileRef = useRef<HTMLInputElement | null>(null);

    const [docs, setDocs] = useState<IProductoDocumento[]>([]);
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [busyId, setBusyId] = useState<number | null>(null);

    const [file, setFile] = useState<File | null>(null);
    const [tipo, setTipo] = useState<TipoDocumentoProducto>('FICHA_TECNICA');
    const [nombre, setNombre] = useState('');
    const [esPrincipal, setEsPrincipal] = useState(false);

    const enabled = isEdit && !!productoId;

    const cargar = useCallback(async () => {
        if (!productoId) return;
        setLoading(true);
        try {
            const resp: any = await apiClient.get(`/productos/${productoId}/documentos`);
            setDocs(Array.isArray(resp?.data?.data) ? resp.data.data : Array.isArray(resp?.data) ? resp.data : []);
        } catch (e: any) {
            setDocs([]);
        } finally {
            setLoading(false);
        }
    }, [productoId]);

    useEffect(() => {
        if (enabled) void cargar();
        else setDocs([]);
    }, [enabled, cargar]);

    const handleFile = (f: File | null) => {
        if (!f) { setFile(null); return; }
        const okType = f.type === 'application/pdf' || /\.pdf$/i.test(f.name) || /^image\/(png|jpe?g)$/i.test(f.type);
        if (!okType) {
            alert('Solo se permiten documentos PDF (o imágenes PNG/JPEG escaneadas)', 'error');
            if (fileRef.current) fileRef.current.value = '';
            return;
        }
        if (f.size > MAX_BYTES) {
            alert('El archivo supera el máximo de 15 MB', 'error');
            if (fileRef.current) fileRef.current.value = '';
            return;
        }
        setFile(f);
        if (!nombre.trim()) setNombre(f.name.replace(/\.[^.]+$/, ''));
    };

    const handleUpload = async () => {
        if (!productoId || !file) return;
        setUploading(true);
        try {
            const fd = new FormData();
            fd.append('file', file);
            fd.append('tipo', tipo);
            if (nombre.trim()) fd.append('nombre', nombre.trim());
            if (esPrincipal) fd.append('esPrincipal', 'true');
            await apiClient.post(`/productos/${productoId}/documentos`, fd, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            alert('Documento adjuntado correctamente', 'success');
            setFile(null);
            setNombre('');
            setEsPrincipal(false);
            if (fileRef.current) fileRef.current.value = '';
            await cargar();
        } catch (e: any) {
            alert(e?.response?.data?.message || e?.message || 'No se pudo subir el documento', 'error');
        } finally {
            setUploading(false);
        }
    };

    const handleDelete = async (doc: IProductoDocumento) => {
        if (!productoId) return;
        if (!window.confirm(`¿Eliminar el documento "${doc.nombre}"?`)) return;
        setBusyId(doc.id);
        try {
            await apiClient.delete(`/productos/${productoId}/documentos/${doc.id}`);
            alert('Documento eliminado', 'success');
            await cargar();
        } catch (e: any) {
            alert(e?.response?.data?.message || 'No se pudo eliminar el documento', 'error');
        } finally {
            setBusyId(null);
        }
    };

    const handleSetPrincipal = async (doc: IProductoDocumento) => {
        if (!productoId || doc.esPrincipal) return;
        setBusyId(doc.id);
        try {
            await apiClient.patch(`/productos/${productoId}/documentos/${doc.id}`, { esPrincipal: true });
            await cargar();
        } catch (e: any) {
            alert(e?.response?.data?.message || 'No se pudo actualizar el documento', 'error');
        } finally {
            setBusyId(null);
        }
    };

    const handleDownload = async (doc: IProductoDocumento) => {
        // Abrimos la ventana de forma síncrona (evita bloqueo de popups) y luego
        // pedimos una URL firmada fresca por si la de la lista ya expiró.
        const win = window.open('', '_blank');
        try {
            const resp: any = await apiClient.get(`/productos/${productoId}/documentos`);
            const lista: IProductoDocumento[] = Array.isArray(resp?.data?.data) ? resp.data.data : [];
            const fresh = lista.find((d) => d.id === doc.id);
            const url = fresh?.urlDescarga || doc.urlDescarga || doc.url;
            if (win) win.location.href = url; else window.open(url, '_blank');
        } catch {
            const url = doc.urlDescarga || doc.url;
            if (win) win.location.href = url; else window.open(url, '_blank');
        }
    };

    return (
        <div className="col-span-1 md:col-span-2 rounded-2xl border border-rose-100 dark:border-rose-900/40 bg-rose-50/40 dark:bg-rose-950/10 p-4">
            <div className="flex items-start gap-3 mb-4">
                <div className="h-10 w-10 rounded-2xl bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-300 flex items-center justify-center">
                    <Icon icon="solar:file-text-bold-duotone" width={20} />
                </div>
                <div className="flex-1 min-w-0">
                    <h5 className="text-sm font-black text-gray-900 dark:text-white">Documentos / Ficha técnica (PDF)</h5>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        Adjunta la ficha técnica, certificados o manuales. Estarán disponibles para descarga al consultar el producto y al cotizar.
                    </p>
                </div>
                {enabled && (
                    <span className="text-[11px] font-bold px-2 py-1 rounded-full bg-white/80 dark:bg-slate-900/40 text-rose-700 dark:text-rose-300 border border-rose-100 dark:border-rose-900/40">
                        {docs.length} {docs.length === 1 ? 'documento' : 'documentos'}
                    </span>
                )}
            </div>

            {!enabled ? (
                <div className="rounded-xl border border-dashed border-rose-200 bg-white/70 p-4 text-sm text-slate-500 dark:border-rose-900 dark:bg-slate-950/20 dark:text-slate-400 flex items-center gap-2">
                    <Icon icon="solar:info-circle-linear" width={18} className="shrink-0" />
                    <span>Guarda el producto para adjuntar documentos.</span>
                </div>
            ) : (
                <div className="space-y-4">
                    {/* Formulario de carga */}
                    <div className="rounded-2xl border border-white/70 bg-white/70 p-3 dark:border-white/10 dark:bg-slate-950/20">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="md:col-span-2">
                                <label className="block text-xs font-bold text-gray-600 dark:text-gray-300 mb-1">Archivo (PDF, máx. 15 MB)</label>
                                <input
                                    ref={fileRef}
                                    type="file"
                                    accept=".pdf,application/pdf,image/png,image/jpeg"
                                    onChange={(e) => handleFile(e.target.files?.[0] || null)}
                                    disabled={uploading}
                                    className="block w-full text-sm text-gray-700 dark:text-gray-200 file:mr-3 file:rounded-lg file:border-0 file:bg-rose-600 file:px-3 file:py-1.5 file:text-xs file:font-bold file:text-white hover:file:bg-rose-700 file:cursor-pointer"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-600 dark:text-gray-300 mb-1">Tipo</label>
                                <select
                                    value={tipo}
                                    onChange={(e) => setTipo(e.target.value as TipoDocumentoProducto)}
                                    disabled={uploading}
                                    className="w-full rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-gray-800 dark:text-gray-100"
                                >
                                    {TIPOS_DOCUMENTO_PRODUCTO.map((t) => (
                                        <option key={t.value} value={t.value}>{t.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-600 dark:text-gray-300 mb-1">Nombre visible</label>
                                <input
                                    type="text"
                                    value={nombre}
                                    onChange={(e) => setNombre(e.target.value)}
                                    placeholder="Ej. Ficha técnica malla raschel 80%"
                                    disabled={uploading}
                                    maxLength={200}
                                    className="w-full rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-gray-800 dark:text-gray-100"
                                />
                            </div>
                        </div>
                        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                            <label className="inline-flex items-center gap-2 text-xs font-semibold text-gray-600 dark:text-gray-300 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={esPrincipal}
                                    onChange={(e) => setEsPrincipal(e.target.checked)}
                                    disabled={uploading}
                                    className="rounded border-gray-300"
                                />
                                Marcar como documento principal
                            </label>
                            <button
                                type="button"
                                onClick={handleUpload}
                                disabled={!file || uploading}
                                className="inline-flex items-center gap-2 rounded-lg bg-rose-600 hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2 text-xs font-bold text-white transition"
                            >
                                <Icon icon={uploading ? 'svg-spinners:ring-resize' : 'solar:upload-minimalistic-bold'} width={16} />
                                {uploading ? 'Subiendo…' : 'Adjuntar documento'}
                            </button>
                        </div>
                    </div>

                    {/* Lista de documentos */}
                    <div className="rounded-2xl border border-white/70 bg-white/70 dark:border-white/10 dark:bg-slate-950/20 overflow-hidden">
                        {loading && docs.length === 0 ? (
                            <div className="px-4 py-5 text-sm text-slate-500 dark:text-slate-400 flex items-center gap-2">
                                <Icon icon="svg-spinners:ring-resize" width={16} /> Cargando documentos…
                            </div>
                        ) : docs.length === 0 ? (
                            <div className="px-4 py-5 text-sm text-slate-500 dark:text-slate-400">
                                Este producto aún no tiene documentos adjuntos.
                            </div>
                        ) : (
                            <ul className="divide-y divide-gray-100 dark:divide-slate-800">
                                {docs.map((doc) => {
                                    const isPdf = (doc.mimeType || '').includes('pdf') || /\.pdf$/i.test(doc.url);
                                    const busy = busyId === doc.id;
                                    return (
                                        <li key={doc.id} className="px-3 py-2.5 flex items-center gap-3">
                                            <div className={`h-9 w-9 shrink-0 rounded-lg grid place-items-center ${isPdf ? 'bg-rose-100 text-rose-600 dark:bg-rose-900/40 dark:text-rose-300' : 'bg-sky-100 text-sky-600 dark:bg-sky-900/40 dark:text-sky-300'}`}>
                                                <Icon icon={isPdf ? 'solar:document-text-bold' : 'solar:gallery-bold'} width={18} />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className="text-sm font-semibold text-gray-900 dark:text-white truncate flex items-center gap-2">
                                                    <span className="truncate">{doc.nombre}</span>
                                                    {doc.esPrincipal && (
                                                        <span className="shrink-0 text-[10px] font-black uppercase px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">Principal</span>
                                                    )}
                                                </p>
                                                <p className="text-[11px] text-gray-500 dark:text-gray-400">
                                                    {tipoLabel(doc.tipo)}
                                                    {doc.tamano ? ` · ${formatBytes(doc.tamano)}` : ''}
                                                    {doc.creadoEn ? ` · ${new Date(doc.creadoEn).toLocaleDateString('es-PE')}` : ''}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-1 shrink-0">
                                                <button
                                                    type="button"
                                                    onClick={() => handleDownload(doc)}
                                                    title="Descargar"
                                                    className="inline-flex items-center gap-1 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-1.5 text-xs font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-800"
                                                >
                                                    <Icon icon="solar:download-minimalistic-bold" width={14} /> Descargar
                                                </button>
                                                {!doc.esPrincipal && (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleSetPrincipal(doc)}
                                                        disabled={busy}
                                                        title="Marcar como principal"
                                                        className="grid h-8 w-8 place-items-center rounded-lg text-gray-500 hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-emerald-900/20 disabled:opacity-50"
                                                    >
                                                        <Icon icon="solar:star-linear" width={16} />
                                                    </button>
                                                )}
                                                <button
                                                    type="button"
                                                    onClick={() => handleDelete(doc)}
                                                    disabled={busy}
                                                    title="Eliminar"
                                                    className="grid h-8 w-8 place-items-center rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 disabled:opacity-50"
                                                >
                                                    <Icon icon={busy ? 'svg-spinners:ring-resize' : 'solar:trash-bin-trash-bold'} width={16} />
                                                </button>
                                            </div>
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProductDocumentsManager;
