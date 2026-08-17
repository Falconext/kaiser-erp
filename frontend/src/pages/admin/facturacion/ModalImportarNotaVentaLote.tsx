import { useState, useRef } from "react";
import Modal from "@/components/Modal";
import Button from "@/components/Button";
import { Icon } from "@iconify/react/dist/iconify.js";
import useAlertStore from "@/zustand/alert";
import apiClient from "@/utils/apiClient";

interface ModalImportarNotaVentaLoteProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: () => void;
}

interface LoteResultadoNV {
    total: number;
    importados: number;
    conError: number;
    detalleImportados: { documento: string; comprobanteId: number }[];
    detalleErrores: { fila?: number; documento?: string; motivo: string }[];
}

const ModalImportarNotaVentaLote = ({ isOpen, onClose, onSuccess }: ModalImportarNotaVentaLoteProps) => {
    const { alert } = useAlertStore();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [file, setFile] = useState<File | null>(null);
    // Para carga histórica ambos van APAGADOS por defecto.
    const [afectarStock, setAfectarStock] = useState(false);
    const [afectarCaja, setAfectarCaja] = useState(false);
    const [importando, setImportando] = useState(false);
    const [descargando, setDescargando] = useState(false);
    const [resultado, setResultado] = useState<LoteResultadoNV | null>(null);

    const resetState = () => {
        setFile(null);
        setAfectarStock(false);
        setAfectarCaja(false);
        setImportando(false);
        setResultado(null);
    };

    const handleClose = () => {
        resetState();
        onClose();
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selected = e.target.files?.[0] || null;
        e.target.value = '';
        setFile(selected);
        setResultado(null);
    };

    const descargarPlantilla = async () => {
        setDescargando(true);
        try {
            const res = await apiClient.get('/comprobante/importar/nota-venta/plantilla', {
                responseType: 'blob',
            });
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', 'plantilla_notas_de_venta.xlsx');
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch {
            alert('No se pudo descargar la plantilla.', 'error');
        } finally {
            setDescargando(false);
        }
    };

    const importarLote = async () => {
        if (!file) {
            alert('Selecciona un archivo Excel o CSV.', 'error');
            return;
        }
        setImportando(true);
        setResultado(null);
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('afectarStock', String(afectarStock));
            formData.append('afectarCaja', String(afectarCaja));
            const res = await apiClient.post('/comprobante/importar/nota-venta/lote', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
                timeout: 180000,
            });
            const data: LoteResultadoNV = res.data?.data ?? res.data;
            setResultado(data);
            if (data.importados > 0) {
                alert(`${data.importados} de ${data.total} nota(s) de venta importada(s).`, data.conError > 0 ? 'warning' : 'success');
                if (onSuccess) onSuccess();
            } else {
                alert('No se importó ninguna nota de venta. Revisa los errores.', 'error');
            }
        } catch (err: any) {
            alert(err?.response?.data?.message || 'Error al importar las notas de venta.', 'error');
        } finally {
            setImportando(false);
        }
    };

    return (
        <Modal
            isOpenModal={isOpen}
            closeModal={handleClose}
            title="Importar histórico de notas de venta"
            icon="solar:import-bold-duotone"
            width="900px"
            position="right"
        >
            <div className="px-4 pb-4 space-y-5 pt-5">
                {/* Instrucciones + plantilla */}
                <div className="p-4 rounded-xl border border-amber-200 dark:border-amber-800/50 bg-amber-50/60 dark:bg-amber-900/10">
                    <div className="flex items-start gap-2.5">
                        <Icon icon="solar:info-circle-bold-duotone" width={22} className="text-amber-500 shrink-0 mt-0.5" />
                        <div className="text-xs text-amber-800 dark:text-amber-200 space-y-1">
                            <p className="font-semibold">Carga del movimiento histórico (año 2026).</p>
                            <p>Cada fila es una línea de producto. Las filas con la misma <b>Serie</b> y <b>Correlativo</b> se agrupan en una sola nota de venta. Se respeta la serie y el correlativo original.</p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={descargarPlantilla}
                        disabled={descargando}
                        className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 dark:text-amber-300 hover:underline disabled:opacity-60"
                    >
                        {descargando ? <Icon icon="svg-spinners:270-ring-with-bg" width={15} /> : <Icon icon="solar:download-minimalistic-bold" width={15} />}
                        Descargar plantilla (.xlsx)
                    </button>
                </div>

                {/* Selección de archivo */}
                <div className="p-4 rounded-xl border border-gray-200 dark:border-slate-800">
                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full flex flex-col items-center justify-center gap-2 py-8 rounded-xl border-2 border-dashed border-indigo-200 dark:border-indigo-800/50 bg-indigo-50/40 dark:bg-indigo-900/10 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"
                    >
                        <Icon icon="solar:upload-minimalistic-bold-duotone" width={34} className="text-indigo-500" />
                        <span className="text-sm font-semibold text-indigo-700 dark:text-indigo-300">Selecciona el archivo Excel o CSV</span>
                        <span className="text-xs text-gray-400">Formato .xlsx, .xls o .csv</span>
                    </button>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
                        className="hidden"
                        onChange={handleFileSelect}
                    />
                    {file && (
                        <div className="mt-3 flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-gray-50 dark:bg-slate-800/60 border border-gray-100 dark:border-slate-700">
                            <span className="flex items-center gap-2 text-xs text-gray-700 dark:text-gray-200 truncate">
                                <Icon icon="solar:file-text-bold-duotone" width={16} className="text-indigo-500 shrink-0" />
                                <span className="truncate">{file.name}</span>
                            </span>
                            <button type="button" onClick={() => setFile(null)} className="text-gray-400 hover:text-red-500 shrink-0">
                                <Icon icon="solar:close-circle-bold" width={16} />
                            </button>
                        </div>
                    )}
                </div>

                {/* Opciones (default OFF para histórico) */}
                <div className="p-4 rounded-xl border border-gray-200 dark:border-slate-800 space-y-3">
                    <p className="text-xs text-gray-500 dark:text-gray-400">Para carga histórica se recomienda dejar ambas opciones <b>desmarcadas</b>: no se moverá inventario ni caja.</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <button
                            type="button"
                            onClick={() => setAfectarStock(v => !v)}
                            className={`flex items-center gap-2.5 p-2.5 rounded-lg border text-left transition-all ${afectarStock ? 'border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/20' : 'border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50'}`}
                        >
                            <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${afectarStock ? 'bg-emerald-500 border-emerald-500' : 'border-gray-300 dark:border-slate-500'}`}>
                                {afectarStock && <Icon icon="mdi:check" width={11} className="text-white" />}
                            </div>
                            <span className="text-xs font-semibold text-gray-700 dark:text-gray-200">Descontar stock</span>
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
                </div>

                {/* Resultados */}
                {resultado && (
                    <div className="p-4 rounded-xl border border-gray-200 dark:border-slate-800 space-y-3">
                        <div className="flex flex-wrap gap-2 text-xs font-semibold">
                            <span className="px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">Total: {resultado.total}</span>
                            <span className="px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400">Importadas: {resultado.importados}</span>
                            <span className="px-2.5 py-1 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400">Con error: {resultado.conError}</span>
                        </div>
                        <div className="border border-gray-100 dark:border-slate-800 rounded-xl overflow-x-auto">
                            <table className="w-full min-w-[560px] text-sm text-left">
                                <thead className="bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-300 font-medium border-b border-gray-200 dark:border-slate-700">
                                    <tr>
                                        <th className="px-3 py-2">Documento</th>
                                        <th className="px-3 py-2">Estado</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                                    {resultado.detalleImportados.map((d, idx) => (
                                        <tr key={`ok-${idx}`} className="hover:bg-gray-50/50 dark:hover:bg-slate-800/50">
                                            <td className="px-3 py-2 text-gray-700 dark:text-gray-200">{d.documento}</td>
                                            <td className="px-3 py-2">
                                                <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                                                    <Icon icon="solar:check-circle-bold" width={14} /> Importada
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                    {resultado.detalleErrores.map((d, idx) => (
                                        <tr key={`err-${idx}`} className="hover:bg-gray-50/50 dark:hover:bg-slate-800/50">
                                            <td className="px-3 py-2 text-gray-600 dark:text-gray-300">{d.documento || (d.fila ? `Fila ${d.fila}` : '-')}</td>
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
                        disabled={importando || !file}
                        className="!bg-[var(--accent)] !text-white !border-none shadow-md hover:opacity-90"
                    >
                        {importando ? <Icon icon="svg-spinners:270-ring-with-bg" width={16} className="mr-1" /> : <Icon icon="solar:upload-bold" width={16} className="mr-1" />}
                        {importando ? 'Importando...' : 'Importar notas de venta'}
                    </Button>
                </div>
            </div>
        </Modal>
    );
};

export default ModalImportarNotaVentaLote;
