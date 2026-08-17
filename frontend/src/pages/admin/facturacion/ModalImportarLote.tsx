import { useState, useRef } from "react";
import Modal from "@/components/Modal";
import Button from "@/components/Button";
import { Icon } from "@iconify/react/dist/iconify.js";
import useAlertStore from "@/zustand/alert";
import apiClient from "@/utils/apiClient";

interface ModalImportarLoteProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: () => void;
}

interface LoteResultado {
    total: number;
    importados: number;
    conError: number;
    detalleImportados: { archivo: string; comprobanteId: number; documento: string }[];
    detalleErrores: { archivo: string; documento?: string; motivo: string }[];
}

const ModalImportarLote = ({ isOpen, onClose, onSuccess }: ModalImportarLoteProps) => {
    const { alert } = useAlertStore();
    const filesInputRef = useRef<HTMLInputElement>(null);

    const [files, setFiles] = useState<File[]>([]);
    const [afectarStock, setAfectarStock] = useState(true);
    const [afectarCaja, setAfectarCaja] = useState(true);
    const [importando, setImportando] = useState(false);
    const [resultado, setResultado] = useState<LoteResultado | null>(null);

    const resetState = () => {
        setFiles([]);
        setAfectarStock(true);
        setAfectarCaja(true);
        setImportando(false);
        setResultado(null);
    };

    const handleClose = () => {
        resetState();
        onClose();
    };

    const handleFilesSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selected = Array.from(e.target.files || []);
        e.target.value = '';
        if (selected.length === 0) return;
        setFiles(prev => {
            const nombres = new Set(prev.map(f => f.name));
            const nuevos = selected.filter(f => !nombres.has(f.name));
            return [...prev, ...nuevos];
        });
        setResultado(null);
    };

    const removeFile = (idx: number) => {
        setFiles(prev => prev.filter((_, i) => i !== idx));
    };

    const importarLote = async () => {
        if (files.length === 0) {
            alert('Selecciona al menos un archivo XML.', 'error');
            return;
        }
        setImportando(true);
        setResultado(null);
        try {
            const formData = new FormData();
            files.forEach(f => formData.append('files', f));
            formData.append('afectarStock', String(afectarStock));
            formData.append('afectarCaja', String(afectarCaja));
            const res = await apiClient.post('/comprobante/importar/lote', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
                timeout: 120000,
            });
            const data: LoteResultado = res.data?.data ?? res.data;
            setResultado(data);
            if (data.importados > 0) {
                alert(`${data.importados} de ${data.total} documento(s) importado(s).`, data.conError > 0 ? 'warning' : 'success');
                if (onSuccess) onSuccess();
            } else {
                alert('No se importó ningún documento. Revisa los errores.', 'error');
            }
        } catch (err: any) {
            alert(err?.response?.data?.message || 'Error al importar los XML en lote.', 'error');
        } finally {
            setImportando(false);
        }
    };

    return (
        <Modal
            isOpenModal={isOpen}
            closeModal={handleClose}
            title="Importar comprobantes en lote"
            icon="solar:documents-bold-duotone"
            width="900px"
            position="right"
        >
            <div className="px-4 pb-4 space-y-5 pt-5">
                {/* Dropzone / selección de archivos */}
                <div className="p-4 rounded-xl border border-gray-200 dark:border-slate-800">
                    <button
                        type="button"
                        onClick={() => filesInputRef.current?.click()}
                        className="w-full flex flex-col items-center justify-center gap-2 py-8 rounded-xl border-2 border-dashed border-indigo-200 dark:border-indigo-800/50 bg-indigo-50/40 dark:bg-indigo-900/10 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"
                    >
                        <Icon icon="solar:upload-minimalistic-bold-duotone" width={34} className="text-indigo-500" />
                        <span className="text-sm font-semibold text-indigo-700 dark:text-indigo-300">Selecciona los archivos XML</span>
                        <span className="text-xs text-gray-400">Puedes elegir varios comprobantes ya emitidos (Factura / Boleta)</span>
                    </button>
                    <input
                        ref={filesInputRef}
                        type="file"
                        accept=".xml,application/xml,text/xml"
                        multiple
                        className="hidden"
                        onChange={handleFilesSelect}
                    />

                    {files.length > 0 && (
                        <div className="mt-3 space-y-1.5">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{files.length} archivo(s) seleccionado(s)</span>
                                <button type="button" onClick={() => setFiles([])} className="text-xs font-semibold text-red-500 hover:text-red-700">Quitar todos</button>
                            </div>
                            <div className="max-h-40 overflow-y-auto space-y-1">
                                {files.map((f, idx) => (
                                    <div key={`${f.name}-${idx}`} className="flex items-center justify-between gap-2 px-3 py-1.5 rounded-lg bg-gray-50 dark:bg-slate-800/60 border border-gray-100 dark:border-slate-700">
                                        <span className="flex items-center gap-2 text-xs text-gray-700 dark:text-gray-200 truncate">
                                            <Icon icon="solar:file-text-bold-duotone" width={16} className="text-indigo-500 shrink-0" />
                                            <span className="truncate">{f.name}</span>
                                        </span>
                                        <button type="button" onClick={() => removeFile(idx)} className="text-gray-400 hover:text-red-500 shrink-0">
                                            <Icon icon="solar:close-circle-bold" width={16} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Opciones */}
                <div className="p-4 rounded-xl border border-gray-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                        type="button"
                        onClick={() => setAfectarStock(v => !v)}
                        className={`flex items-center gap-2.5 p-2.5 rounded-lg border text-left transition-all ${afectarStock ? 'border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/20' : 'border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50'}`}
                    >
                        <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${afectarStock ? 'bg-emerald-500 border-emerald-500' : 'border-gray-300 dark:border-slate-500'}`}>
                            {afectarStock && <Icon icon="mdi:check" width={11} className="text-white" />}
                        </div>
                        <span className="text-xs font-semibold text-gray-700 dark:text-gray-200">Afectar inventario (stock)</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setAfectarCaja(v => !v)}
                        className={`flex items-center gap-2.5 p-2.5 rounded-lg border text-left transition-all ${afectarCaja ? 'border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/20' : 'border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50'}`}
                    >
                        <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${afectarCaja ? 'bg-emerald-500 border-emerald-500' : 'border-gray-300 dark:border-slate-500'}`}>
                            {afectarCaja && <Icon icon="mdi:check" width={11} className="text-white" />}
                        </div>
                        <span className="text-xs font-semibold text-gray-700 dark:text-gray-200">Registrar cobro en caja</span>
                    </button>
                </div>

                {/* Resultados */}
                {resultado && (
                    <div className="p-4 rounded-xl border border-gray-200 dark:border-slate-800 space-y-3">
                        <div className="flex flex-wrap gap-2 text-xs font-semibold">
                            <span className="px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">Total: {resultado.total}</span>
                            <span className="px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400">Importados: {resultado.importados}</span>
                            <span className="px-2.5 py-1 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400">Con error: {resultado.conError}</span>
                        </div>
                        <div className="border border-gray-100 dark:border-slate-800 rounded-xl overflow-x-auto">
                            <table className="w-full min-w-[560px] text-sm text-left">
                                <thead className="bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-300 font-medium border-b border-gray-200 dark:border-slate-700">
                                    <tr>
                                        <th className="px-3 py-2">Archivo</th>
                                        <th className="px-3 py-2">Documento</th>
                                        <th className="px-3 py-2">Estado</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                                    {resultado.detalleImportados.map((d, idx) => (
                                        <tr key={`ok-${idx}`} className="hover:bg-gray-50/50 dark:hover:bg-slate-800/50">
                                            <td className="px-3 py-2 text-gray-700 dark:text-gray-200 truncate max-w-[220px]">{d.archivo}</td>
                                            <td className="px-3 py-2 text-gray-600 dark:text-gray-300">{d.documento}</td>
                                            <td className="px-3 py-2">
                                                <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                                                    <Icon icon="solar:check-circle-bold" width={14} /> Importado
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                    {resultado.detalleErrores.map((d, idx) => (
                                        <tr key={`err-${idx}`} className="hover:bg-gray-50/50 dark:hover:bg-slate-800/50">
                                            <td className="px-3 py-2 text-gray-700 dark:text-gray-200 truncate max-w-[220px]">{d.archivo}</td>
                                            <td className="px-3 py-2 text-gray-600 dark:text-gray-300">{d.documento || '-'}</td>
                                            <td className="px-3 py-2">
                                                <span className="inline-flex items-start gap-1 text-xs font-semibold text-red-500 dark:text-red-400">
                                                    <Icon icon="solar:close-circle-bold" width={14} className="mt-0.5 shrink-0" />
                                                    <span>{d.motivo}</span>
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Actions */}
                <div className="flex gap-3 justify-end pt-4 border-t border-gray-200 dark:border-slate-800">
                    <Button color="gray" onClick={handleClose} type="button">Cerrar</Button>
                    <Button
                        outline
                        color="black"
                        onClick={importarLote}
                        disabled={importando || files.length === 0}
                        className="!bg-[var(--accent)] !text-white !border-none shadow-md hover:opacity-90"
                    >
                        {importando ? <Icon icon="svg-spinners:270-ring-with-bg" width={16} className="mr-1" /> : <Icon icon="solar:upload-bold" width={16} className="mr-1" />}
                        {importando ? 'Importando...' : `Importar ${files.length || ''} documento(s)`}
                    </Button>
                </div>
            </div>
        </Modal>
    );
};

export default ModalImportarLote;
