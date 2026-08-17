import React, { useState, useRef, useEffect } from 'react';
import Modal from '@/components/Modal';
import InputPro from '@/components/InputPro';
import { Icon } from '@iconify/react';
import Button from '@/components/Button';
import apiClient from '@/utils/apiClient';

interface DigemidResult {
    id: number;
    nombreComercial: string;
    principioActivo: string | null;
    formaFarmaceutica: string | null;
    concentracion: string | null;
    presentacion: string | null;
    laboratorio: string | null;
    registroSanitario: string | null;
    condicionVenta: string | null;
}

interface IProps {
    isOpen: boolean;
    onClose: () => void;
    formValues: any;
    handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
    errors: any;
    onFillFromDigemid?: (data: Partial<Record<string, string>>) => void;
}

const ModalMedicamento = ({ isOpen, onClose, formValues, handleChange, errors, onFillFromDigemid }: IProps) => {
    const [digemidQuery, setDigemidQuery] = useState('');
    const [digemidResults, setDigemidResults] = useState<DigemidResult[]>([]);
    const [digemidLoading, setDigemidLoading] = useState(false);
    const [showResults, setShowResults] = useState(false);
    const [digemidCargado, setDigemidCargado] = useState<boolean | null>(null);
    const searchRef = useRef<HTMLDivElement>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        apiClient.get('/digemid/estado').then((r: any) => {
            setDigemidCargado((r.data?.data?.total ?? 0) > 0);
        }).catch(() => setDigemidCargado(false));
    }, []);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
                setShowResults(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const handleDigemidSearch = (q: string) => {
        setDigemidQuery(q);
        if (debounceRef.current) clearTimeout(debounceRef.current);
        if (q.trim().length < 2) { setDigemidResults([]); setShowResults(false); return; }
        debounceRef.current = setTimeout(async () => {
            setDigemidLoading(true);
            try {
                const resp: any = await apiClient.get(`/digemid/buscar?q=${encodeURIComponent(q)}&limit=10`);
                const results = Array.isArray(resp.data) ? resp.data : (resp.data?.data ?? []);
                setDigemidResults(results);
                setShowResults(true);
            } catch {
                setDigemidResults([]);
            } finally {
                setDigemidLoading(false);
            }
        }, 350);
    };

    const handleSelect = (item: DigemidResult) => {
        setDigemidQuery('');
        setShowResults(false);
        setDigemidResults([]);
        if (onFillFromDigemid) {
            onFillFromDigemid({
                descripcion: item.nombreComercial,
                principioActivo: item.principioActivo ?? '',
                concentracion: item.concentracion ?? '',
                presentacion: item.presentacion ?? '',
                laboratorio: item.laboratorio ?? '',
                tipoAfectacionIGV: '20',
            });
        }
    };

    return (
        <Modal
            isOpenModal={isOpen}
            closeModal={onClose}
            title="Detalles del Medicamento"
            position="right"
            width="500px"
            icon="solar:pill-bold-duotone"
            height="auto"
            backdropClassName="bg-transparent"
            style={{ marginRight: '510px' }}
        >
            <div className="space-y-6 pt-2 px-4 pt-4 pb-0">

                {/* Buscador DIGEMID */}
                <div className="p-4 rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50/60 dark:bg-blue-900/20">
                    <h5 className="text-sm font-bold text-blue-800 dark:text-blue-300 mb-3 flex items-center gap-2">
                        <Icon icon="solar:database-bold-duotone" width={16} className="text-blue-600" />
                        Buscar en DIGEMID
                        {digemidCargado === true && (
                            <span className="ml-auto text-[10px] font-semibold text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/20 px-2 py-0.5 rounded-full">
                                ✓ Disponible
                            </span>
                        )}
                        {digemidCargado === false && (
                            <span className="ml-auto text-[10px] font-semibold text-amber-600 bg-amber-100 dark:text-amber-400 dark:bg-amber-900/20 px-2 py-0.5 rounded-full">
                                Sin datos
                            </span>
                        )}
                    </h5>

                    {digemidCargado === false ? (
                        <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
                            El catálogo DIGEMID no está cargado. Ejecuta:{' '}
                            <code className="bg-amber-100 dark:bg-amber-900 px-1 rounded font-mono">pnpm run seed:digemid</code>{' '}
                            después de colocar el archivo en <code className="bg-amber-100 dark:bg-amber-900 px-1 rounded font-mono">backend/data/digemid_medicamentos.xlsx</code>
                        </p>
                    ) : (
                        <div ref={searchRef} className="relative">
                            <div className="relative">
                                <input
                                    type="text"
                                    value={digemidQuery}
                                    onChange={e => handleDigemidSearch(e.target.value)}
                                    placeholder="Nombre comercial o principio activo..."
                                    className="w-full pl-9 pr-4 py-2.5 text-sm rounded-lg border border-blue-200 dark:border-blue-700 bg-white dark:bg-[#111c44]/60 text-gray-800 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-400"
                                />
                                <Icon
                                    icon={digemidLoading ? 'svg-spinners:ring-resize' : 'solar:magnifer-linear'}
                                    width={16}
                                    className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-500"
                                />
                            </div>

                            {showResults && digemidResults.length > 0 && (
                                <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-white dark:bg-[#111c44]/60 border border-gray-200 dark:border-white/10 rounded-xl shadow-xl max-h-64 overflow-y-auto">
                                    {digemidResults.map(item => (
                                        <button
                                            key={item.id}
                                            type="button"
                                            onClick={() => handleSelect(item)}
                                            className="w-full text-left px-4 py-3 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors border-b border-gray-100 dark:border-white/10 last:border-0"
                                        >
                                            <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                                                {item.nombreComercial}
                                            </p>
                                            <div className="flex gap-3 mt-0.5 flex-wrap">
                                                {item.principioActivo && (
                                                    <span className="text-xs text-blue-600 dark:text-blue-400">{item.principioActivo}</span>
                                                )}
                                                {item.concentracion && (
                                                    <span className="text-xs text-gray-500 dark:text-gray-400">{item.concentracion}</span>
                                                )}
                                                {item.laboratorio && (
                                                    <span className="text-xs text-gray-400 dark:text-gray-500 truncate">{item.laboratorio}</span>
                                                )}
                                            </div>
                                            {item.registroSanitario && (
                                                <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">RS: {item.registroSanitario}</p>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            )}

                            {showResults && digemidResults.length === 0 && !digemidLoading && digemidQuery.length >= 2 && (
                                <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-white dark:bg-[#111c44]/60 border border-gray-200 dark:border-white/10 rounded-xl shadow-xl px-4 py-3">
                                    <p className="text-xs text-gray-500 dark:text-gray-400 text-center">No encontrado en DIGEMID</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Información farmacológica */}
                <div className="p-4 rounded-xl border border-dashed border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-[#111c44]/60">
                    <h5 className="text-sm font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                        <div className="p-1.5 bg-white dark:bg-white/10 rounded-lg shadow-sm dark:shadow-none">
                            <Icon icon="solar:pill-bold-duotone" width={16} className="text-blue-600 dark:text-blue-400" />
                        </div>
                        Farmacología
                    </h5>
                    <div className="space-y-4">
                        <InputPro autocomplete="off" value={(formValues as any)?.principioActivo || ''} name="principioActivo" onChange={handleChange} isLabel label="Principio Activo" placeholder="Ej. Paracetamol" />
                        <InputPro autocomplete="off" value={(formValues as any)?.concentracion || ''} name="concentracion" onChange={handleChange} isLabel label="Concentración" placeholder="Ej. 500 mg" />
                        <InputPro autocomplete="off" value={(formValues as any)?.presentacion || ''} name="presentacion" onChange={handleChange} isLabel label="Presentación" placeholder="Ej. Caja x 100" />
                        <InputPro autocomplete="off" value={(formValues as any)?.laboratorio || ''} name="laboratorio" onChange={handleChange} isLabel label="Laboratorio" placeholder="Ej. Bayer" />
                    </div>
                </div>

                {/* Unidades de Compra/Venta */}
                <div className="p-4 rounded-xl border border-dashed border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-[#111c44]/60">
                    <h5 className="text-sm font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                        <div className="p-1.5 bg-white dark:bg-white/10 rounded-lg shadow-sm dark:shadow-none">
                            <Icon icon="solar:box-minimalistic-bold-duotone" width={16} className="text-green-600 dark:text-green-400" />
                        </div>
                        Unidades y Conversión
                    </h5>
                    <div className="space-y-4">
                        <InputPro autocomplete="off" value={(formValues as any)?.unidadCompra || ''} name="unidadCompra" onChange={handleChange} isLabel label="Unidad Compra" placeholder="Ej. CAJA" />
                        <InputPro autocomplete="off" value={(formValues as any)?.unidadVenta || ''} name="unidadVenta" onChange={handleChange} isLabel label="Unidad Venta" placeholder="Ej. BLISTER" />
                        <div>
                            <InputPro autocomplete="off" type="number" value={(formValues as any)?.factorConversion || 1} name="factorConversion" onChange={handleChange} isLabel label="Factor Conversión" placeholder="Ej. 10" />
                            <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1.5 ml-1">
                                Ejemplo: 1 CAJA = 10 BLÍSTER (Factor = 10)
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex gap-4 justify-end pt-0 mt-auto pb-4">
                    <Button color="black" className="w-full" onClick={onClose}>
                        Confirmar Detalles
                    </Button>
                </div>
            </div>
        </Modal>
    );
};

export default ModalMedicamento;
