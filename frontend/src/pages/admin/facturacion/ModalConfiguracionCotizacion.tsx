import React from "react";
import { Icon } from "@iconify/react";
import InputPro from "@/components/InputPro";
import Select from "@/components/Select";
import Modal from "@/components/Modal";
import { useAuthStore } from "@/zustand/auth";
import useEmpresasStore from "@/zustand/empresas";
import useAlertStore from "@/zustand/alert";

interface ModalConfiguracionCotizacionProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (config: QuotationConfig) => void;
    initialConfig?: QuotationConfig;
}

export interface QuotationConfig {
    includeProductImages: boolean;
    quotationDiscount: number;
    quotationValidity: number;
    quotationSignature: string;
    quotationTerms: string;
    quotationPaymentType: string;
    quotationAdvance: number;
    quotationCurrency: string;
    observaciones: string;
}

const ModalConfiguracionCotizacion = ({
    isOpen,
    onClose,
    onSave,
    initialConfig
}: ModalConfiguracionCotizacionProps) => {
    const [config, setConfig] = React.useState<QuotationConfig>(
        initialConfig || {
            includeProductImages: true,
            quotationDiscount: 0,
            quotationValidity: 7,
            quotationSignature: '',
            quotationTerms: '',
            quotationPaymentType: 'CONTADO',
            quotationAdvance: 0,
            quotationCurrency: 'PEN',
            observaciones: ''
        }
    );

    const auth = useAuthStore((s) => s.auth);
    const alertStore = useAlertStore();

    // Checks "Guardar como predeterminado para próximas cotizaciones".
    const [guardarTerminos, setGuardarTerminos] = React.useState(false);
    const [guardarObservaciones, setGuardarObservaciones] = React.useState(false);
    // Predeterminados actualmente guardados en la empresa (para el aviso "✓ guardado").
    const [defaults, setDefaults] = React.useState<{ terminos?: string; observaciones?: string }>({});

    // Al ABRIR el modal, precargar Términos/Observaciones con los predeterminados
    // guardados de la empresa (leídos frescos del store, ya que auth/me puede
    // completar después del primer render). Solo rellena si la cotización actual
    // no trae ya un valor propio.
    React.useEffect(() => {
        if (!isOpen) return;
        const freshTextos: Record<string, string> =
            ((useAuthStore.getState().auth?.empresa as any)?.cotizFormatoConfig?.textos) || {};
        setDefaults({ terminos: freshTextos.terminos || '', observaciones: freshTextos.observaciones || '' });
        setConfig((prev) => {
            const base = initialConfig || prev;
            return {
                ...base,
                quotationTerms: (base.quotationTerms || freshTextos.terminos || ''),
                observaciones: (base.observaciones || freshTextos.observaciones || ''),
            };
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, initialConfig]);

    const handleChange = (field: keyof QuotationConfig, value: any) => {
        setConfig(prev => ({ ...prev, [field]: value }));
    };

    // Persiste un texto como predeterminado (empresa.cotizFormatoConfig.textos).
    const persistirDefault = async (campo: 'terminos' | 'observaciones', valor: string) => {
        const prev = ((useAuthStore.getState().auth?.empresa as any)?.cotizFormatoConfig) || {};
        const nuevoConfig = { ...prev, textos: { ...(prev.textos || {}), [campo]: valor } };
        await useEmpresasStore.getState().actualizarMiEmpresa({ cotizFormatoConfig: nuevoConfig } as any);
        useAuthStore.setState((state: any) => ({
            auth: state.auth ? { ...state.auth, empresa: { ...state.auth.empresa, cotizFormatoConfig: nuevoConfig } } : state.auth,
        }));
        setDefaults((d) => ({ ...d, [campo]: valor }));
    };

    const handleSave = async () => {
        try {
            if (guardarTerminos) await persistirDefault('terminos', config.quotationTerms || '');
            if (guardarObservaciones) await persistirDefault('observaciones', config.observaciones || '');
            if (guardarTerminos || guardarObservaciones) {
                alertStore.alert('Guardado como predeterminado para próximas cotizaciones', 'success');
            }
        } catch {
            alertStore.alert('No se pudo guardar el predeterminado', 'error');
        }
        onSave(config);
        onClose();
    };

    const handleReset = () => {
        setConfig({
            includeProductImages: true,
            quotationDiscount: 0,
            quotationValidity: 7,
            quotationSignature: '',
            quotationTerms: '',
            quotationPaymentType: 'CONTADO',
            quotationAdvance: 0,
            quotationCurrency: 'PEN',
            observaciones: ''
        });
    };

    const paymentTypeOptions = [
        { id: 'CONTADO', value: 'CONTADO' },
        { id: 'CREDITO_15', value: 'CREDITO 15 DÍAS' },
        { id: 'CREDITO_30', value: 'CREDITO 30 DÍAS' },
        { id: 'CREDITO_45', value: 'CREDITO 45 DÍAS' },
        { id: 'CREDITO_60', value: 'CREDITO 60 DÍAS' },
    ];

    if (!isOpen) return null;

    return (
        <Modal
            isOpenModal={isOpen}
            closeModal={onClose}
            title="Configurar Cotización"
            width="800px"
            height="auto"
            position="right"
        >
            <div className="p-4">
                {/* Custom Header with Icon inside body if desired, or simplified */}
                <div className="mb-6 flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                        <Icon icon="solar:document-text-bold-duotone" className="text-2xl text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                        <h4 className="text-lg font-bold text-gray-900 dark:text-white">Parámetros</h4>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Configure los detalles de la cotización</p>
                    </div>
                </div>

                <div className="space-y-4">
                    {/* Content */}
                    {/* Grid de campos */}
                    <div className="grid grid-cols-2 gap-6">
                        <div>
                            <InputPro
                                name="quotationValidity"
                                label="Validez (días)"
                                type="number"
                                value={config.quotationValidity.toString()}
                                onChange={(e: any) => handleChange('quotationValidity', parseInt(e.target.value) || 7)}
                                isLabel
                                error=""
                            />
                        </div>
                        <div>
                            <Select
                                name="quotationPaymentType"
                                label="Forma de Pago"
                                value={config.quotationPaymentType}
                                onChange={(_id, value) => handleChange('quotationPaymentType', value)}
                                options={paymentTypeOptions}
                                error=""
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                        <div>
                            <InputPro
                                name="quotationAdvance"
                                label="Adelanto (%)"
                                type="number"
                                value={config.quotationAdvance.toString()}
                                onChange={(e: any) => handleChange('quotationAdvance', parseFloat(e.target.value) || 0)}
                                isLabel
                                error=""
                            />
                        </div>
                        <div>
                            <Select
                                name="quotationCurrency"
                                label="Moneda"
                                value={config.quotationCurrency}
                                onChange={(_id, value) => handleChange('quotationCurrency', value)}
                                options={[
                                    { id: 'PEN', value: 'SOLES (S/)' },
                                    { id: 'USD', value: 'DÓLARES (US$)' },
                                ]}
                                error=""
                            />
                        </div>
                    </div>

                    <div>
                        <InputPro
                            name="quotationSignature"
                            label="Firmante / Responsable"
                            value={config.quotationSignature}
                            onChange={(e: any) => handleChange('quotationSignature', e.target.value)}
                            isLabel
                            error=""
                            placeholder="Nombre del responsable que firma"
                        />
                    </div>

                    {/* Checkbox simple */}
                    <div className="flex items-center gap-3 pt-2">
                        <input
                            type="checkbox"
                            id="includeImages"
                            checked={config.includeProductImages}
                            onChange={(e) => handleChange('includeProductImages', e.target.checked)}
                            className="w-4 h-4 rounded border-gray-300 dark:border-slate-700 text-gray-900 dark:bg-slate-800 focus:ring-gray-900"
                        />
                        <label htmlFor="includeImages" className="text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                            Incluir imágenes de productos en la cotización
                        </label>
                    </div>

                    {/* Términos y Condiciones */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
                            Términos y Condiciones
                        </label>
                        <textarea
                            value={config.quotationTerms}
                            onChange={(e) => handleChange('quotationTerms', e.target.value)}
                            className="w-full px-3 py-2.5 border border-gray-200 dark:border-slate-700 rounded-lg focus:ring-1 focus:ring-gray-900 focus:border-gray-900 dark:focus:ring-blue-500 dark:focus:border-blue-500 bg-white dark:bg-slate-800 resize-none text-sm text-gray-700 dark:text-gray-200"
                            rows={3}
                            placeholder="Ej: El precio incluye instalación. Garantía de 1 año."
                        />
                        <div className="mt-2 flex items-center justify-between gap-2">
                            <label className="flex items-center gap-2 text-[13px] text-gray-500 dark:text-gray-400 cursor-pointer select-none">
                                <input
                                    type="checkbox"
                                    checked={guardarTerminos}
                                    onChange={(e) => setGuardarTerminos(e.target.checked)}
                                    className="w-4 h-4 rounded border-gray-300 dark:border-slate-700 text-gray-900 dark:bg-slate-800 focus:ring-gray-900"
                                />
                                Guardar como predeterminado para próximas cotizaciones
                            </label>
                            {!!defaults.terminos && config.quotationTerms === defaults.terminos && (
                                <span className="flex items-center gap-1 text-[12px] font-semibold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                                    <Icon icon="solar:check-circle-bold" width={14} /> Guardado
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Observaciones */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
                            Observaciones
                        </label>
                        <textarea
                            value={config.observaciones}
                            onChange={(e) => handleChange('observaciones', e.target.value)}
                            className="w-full px-3 py-2.5 border border-gray-200 dark:border-slate-700 rounded-lg focus:ring-1 focus:ring-gray-900 focus:border-gray-900 dark:focus:ring-blue-500 dark:focus:border-blue-500 bg-white dark:bg-slate-800 resize-none text-sm text-gray-700 dark:text-gray-200"
                            rows={3}
                            placeholder="Tiempo de entrega, condiciones especiales, etc."
                        />
                        <div className="mt-2 flex items-center justify-between gap-2">
                            <label className="flex items-center gap-2 text-[13px] text-gray-500 dark:text-gray-400 cursor-pointer select-none">
                                <input
                                    type="checkbox"
                                    checked={guardarObservaciones}
                                    onChange={(e) => setGuardarObservaciones(e.target.checked)}
                                    className="w-4 h-4 rounded border-gray-300 dark:border-slate-700 text-gray-900 dark:bg-slate-800 focus:ring-gray-900"
                                />
                                Guardar como predeterminado para próximas cotizaciones
                            </label>
                            {!!defaults.observaciones && config.observaciones === defaults.observaciones && (
                                <span className="flex items-center gap-1 text-[12px] font-semibold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                                    <Icon icon="solar:check-circle-bold" width={14} /> Guardado
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Footer fixed at bottom? Modal component handles scrolling in body, so maybe content needs margin-bottom. 
                    Or we can put buttons at the end of content. 
                */}
                <div className="mt-2 flex justify-between items-center">
                    <button
                        onClick={handleReset}
                        className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                    >
                        Restablecer
                    </button>
                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="px-5 text-sm py-1 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleSave}
                            className="px-5 text-sm py-1 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 transition-colors"
                        >
                            Guardar
                        </button>
                    </div>
                </div>
            </div>
        </Modal>
    );
};

export default ModalConfiguracionCotizacion;
