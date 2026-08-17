import { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';
import Select from '@/components/Select';
import InputPro from '@/components/InputPro';
import Button from '@/components/Button';
import useAlertStore from '@/zustand/alert';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: DetraccionData) => void;
    initialData?: DetraccionData | null;
    totalFactura: number;
    tiposDetraccion: any[];
    mediosPagoDetraccion: any[];
    mode?: 'DETRACCION' | 'RETENCION';
    defaultCuentaBancoNacion?: string;
}

export interface DetraccionData {
    tipoDetraccionId: number;
    medioPagoDetraccionId: number;
    cuentaBancoNacion: string;
    porcentajeDetraccion: number;
    montoDetraccion: number;
    formaPago?: 'Contado' | 'Credito';
    cuotas?: Array<{ monto: number; fechaVencimiento: string }>;
}

const ModalDetraccion = ({
    isOpen,
    onClose,
    onSave,
    initialData,
    totalFactura,
    tiposDetraccion,
    mediosPagoDetraccion,
    mode = 'DETRACCION',
    defaultCuentaBancoNacion = ''
}: Props) => {
    const [formData, setFormData] = useState<DetraccionData>({
        tipoDetraccionId: 0,
        medioPagoDetraccionId: 0,
        cuentaBancoNacion: '',
        porcentajeDetraccion: 0,
        montoDetraccion: 0,
        formaPago: 'Contado',
        cuotas: [],
    });

    // Asegurar que totalFactura sea un número válido
    const totalFacturaNumber = Number(totalFactura) || 0;

    useEffect(() => {
        if (isOpen) {
            if (initialData) {
                setFormData({
                    ...initialData,
                    // Si aún no tiene cuenta configurada, pre-cargar la de la empresa
                    cuentaBancoNacion: initialData.cuentaBancoNacion || defaultCuentaBancoNacion || '',
                    formaPago: initialData.formaPago || 'Contado',
                    cuotas: initialData.cuotas || [],
                });
            } else {
                setFormData({
                    tipoDetraccionId: 0,
                    medioPagoDetraccionId: 0,
                    cuentaBancoNacion: defaultCuentaBancoNacion || '',
                    porcentajeDetraccion: 0,
                    montoDetraccion: 0,
                    formaPago: 'Contado',
                    cuotas: [],
                });
            }
        }
    }, [initialData, isOpen, defaultCuentaBancoNacion]);

    // Initializing 3% and calculating if it's Retencion
    useEffect(() => {
        if (isOpen && mode === 'RETENCION') {
            const porcentaje = 3;
            const monto = parseFloat(((totalFacturaNumber * porcentaje) / 100).toFixed(2));

            if (!initialData) {
                setFormData(prev => ({
                    ...prev,
                    porcentajeDetraccion: porcentaje,
                    montoDetraccion: monto,
                    tipoDetraccionId: 999, // Dummy ID
                    medioPagoDetraccionId: 999, // Dummy
                    cuentaBancoNacion: 'RETENCION-3%', // Dummy
                    formaPago: 'Contado'
                }));
            } else {
                // Recalculate based on current total if re-opening
                setFormData(prev => ({
                    ...initialData,
                    montoDetraccion: monto,
                    porcentajeDetraccion: porcentaje
                }));
            }
        }
    }, [mode, isOpen, totalFacturaNumber, initialData]);

    // Auto-calcular monto general (para Detracción normal cuando cambia el %)
    useEffect(() => {
        if (mode === 'DETRACCION' && formData.porcentajeDetraccion > 0 && totalFacturaNumber > 0) {
            const monto = (totalFacturaNumber * formData.porcentajeDetraccion) / 100;
            setFormData(prev => ({ ...prev, montoDetraccion: parseFloat(monto.toFixed(2)) }));
        }
    }, [formData.porcentajeDetraccion, totalFacturaNumber, mode]);

    const handleTipoChange = (id: any, value: any) => {
        const numId = Number(id);
        const tipo = tiposDetraccion.find(t => t.id === numId);
        if (tipo) {
            setFormData(prev => ({
                ...prev,
                tipoDetraccionId: numId,
                porcentajeDetraccion: Number(tipo.porcentaje) || 0,
            }));
        }
    };

    const handleMedioPagoChange = (id: any) => {
        setFormData(prev => ({ ...prev, medioPagoDetraccionId: Number(id) }));
    };

    const handleCuentaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData(prev => ({ ...prev, cuentaBancoNacion: e.target.value }));
    };

    const handleFormaPagoChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const value = e.target.value as 'Contado' | 'Credito';
        setFormData(prev => ({ ...prev, formaPago: value, cuotas: value === 'Contado' ? [] : prev.cuotas }));
    };

    const agregarCuota = () => {
        setFormData(prev => ({
            ...prev,
            cuotas: [...(prev.cuotas || []), { monto: 0, fechaVencimiento: '' }]
        }));
    };

    const eliminarCuota = (index: number) => {
        setFormData(prev => ({
            ...prev,
            cuotas: prev.cuotas?.filter((_, i) => i !== index) || []
        }));
    };

    const actualizarCuota = (index: number, field: 'monto' | 'fechaVencimiento', value: any) => {
        setFormData(prev => ({
            ...prev,
            cuotas: prev.cuotas?.map((c, i) => i === index ? { ...c, [field]: field === 'monto' ? parseFloat(value) || 0 : value } : c) || []
        }));
    };

    const handleGuardar = () => {
        // Diferentes validaciones según el modo
        if (mode === 'DETRACCION') {
            if (!formData.tipoDetraccionId || !formData.medioPagoDetraccionId || !formData.cuentaBancoNacion) {
                useAlertStore.getState().alert('Complete todos los campos obligatorios', 'error');
                return;
            }
        }
        // Para RETENCION solo validamos monto
        if (mode === 'RETENCION' && (!formData.montoDetraccion || formData.montoDetraccion <= 0)) {
            useAlertStore.getState().alert('El monto de retención debe ser mayor a 0', 'error');
            return;
        }

        // Validar cuotas si es crédito
        if (formData.formaPago === 'Credito' && (formData.cuotas || []).length > 0) {
            const montoACredito = totalFacturaNumber - formData.montoDetraccion;
            const sumaCuotas = (formData.cuotas || []).reduce((sum, c) => sum + (c.monto || 0), 0);

            if (Math.abs(sumaCuotas - montoACredito) > 0.01) {
                useAlertStore.getState().alert(`La suma de cuotas (S/ ${sumaCuotas.toFixed(2)}) debe ser igual al monto a crédito (S/ ${montoACredito.toFixed(2)})`, 'error');
                return;
            }

            // Validar fechas
            const cuotasInvalidas = (formData.cuotas || []).filter(c => !c.fechaVencimiento || c.monto <= 0);
            if (cuotasInvalidas.length > 0) {
                useAlertStore.getState().alert('Todas las cuotas deben tener monto y fecha válidos', 'error');
                return;
            }
        }

        onSave(formData);
        onClose();
    };

    if (!isOpen) return null;

    const tipoSeleccionado = tiposDetraccion.find(t => t.id === formData.tipoDetraccionId);

    return (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/60   p-4">
            <div className="bg-white dark:bg-[#111827] rounded-2xl shadow-2xl w-full max-w-2xl animate-in fade-in zoom-in duration-200 border dark:border-transparent">
                {/* Header */}
                <div className="p-6 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-900">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-500 rounded-lg">
                            <Icon icon="solar:calculator-bold" className="text-white" width={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-800 dark:text-white">{mode === 'RETENCION' ? 'Configurar Retención 3%' : 'Configurar Detracción'}</h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400">{mode === 'RETENCION' ? 'Régimen de Retenciones del IGV' : 'Sistema de Pago de Obligaciones Tributarias (SPOT)'}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/50 dark:hover:bg-slate-800 rounded-full transition-colors"
                    >
                        <Icon icon="solar:close-circle-bold" className="text-gray-400" width={24} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
                    {/* Bien/Servicio - Solo DETRACCION */}
                    {mode === 'DETRACCION' && (
                        <div>
                            <Select
                                name="tipoDetraccion"
                                label="Bien / servicio *"
                                options={tiposDetraccion.map(t => ({
                                    id: t.id,
                                    value: `${t.codigo} - ${t.descripcion} (${t.porcentaje}%)`,
                                }))}
                                onChange={handleTipoChange}
                                value={tipoSeleccionado ? `${tipoSeleccionado.codigo} - ${tipoSeleccionado.descripcion} (${tipoSeleccionado.porcentaje}%)` : ''}
                                error=""
                                isSearch
                            />
                            {tipoSeleccionado && (
                                <p className="text-xs text-blue-600 mt-1 flex items-center gap-1">
                                    <Icon icon="solar:info-circle-bold" width={14} />
                                    Porcentaje de detracción: {tipoSeleccionado.porcentaje}%
                                </p>
                            )}
                        </div>
                    )}

                    {/* Medio de Pago y Cuenta - Solo DETRACCION */}
                    {mode === 'DETRACCION' && (
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Select
                                    name="medioPago"
                                    label="Medio de Pago *"
                                    options={mediosPagoDetraccion.map(m => ({
                                        id: m.id,
                                        value: `${m.codigo} - ${m.descripcion}`,
                                    }))}
                                    onChange={handleMedioPagoChange}
                                    value={(() => {
                                        if (!formData.medioPagoDetraccionId) return '';
                                        const medio = mediosPagoDetraccion.find(m => m.id === formData.medioPagoDetraccionId);
                                        return medio ? `${medio.codigo} - ${medio.descripcion}` : '';
                                    })()}
                                    error=""
                                    isSearch
                                />
                            </div>
                            <div>
                                <InputPro
                                    name="cuenta"
                                    value={formData.cuentaBancoNacion}
                                    onChange={handleCuentaChange as any}
                                    placeholder="00-000-000000"
                                    error=""
                                    label='Cta. Banco Nación *'
                                    isLabel
                                />
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Cuenta de detracciones del emisor</p>
                            </div>
                        </div>
                    )}

                    {/* Resumen Visual */}
                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-800/50 dark:to-slate-900/50 rounded-xl p-4 border-2 border-blue-200 dark:border-blue-800/30">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-500 rounded-lg">
                                    <Icon icon="solar:wallet-money-bold" className="text-white" width={20} />
                                </div>
                                <div>
                                    <p className="text-xs text-gray-600 dark:text-gray-400">Monto a {mode === 'RETENCION' ? 'Retener' : 'Detraer'}</p>
                                    <p className="text-2xl font-bold text-gray-800 dark:text-white">
                                        S/ {formData.montoDetraccion.toFixed(2)}
                                    </p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-xs text-gray-600 dark:text-gray-400">Total Factura</p>
                                <p className="text-lg font-semibold text-gray-700 dark:text-gray-300">S/ {totalFacturaNumber.toFixed(2)}</p>
                                <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">{formData.porcentajeDetraccion}% {mode === 'RETENCION' ? 'retención' : 'detracción'}</p>
                            </div>
                        </div>
                    </div>

                    {/* Forma de Pago y Cuotas */}
                    <div className="bg-gray-50 dark:bg-slate-800/30 rounded-xl p-4 border border-gray-200 dark:border-transparent">
                        <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Forma de Pago</label>
                                    <select
                                        value={formData.formaPago || 'Contado'}
                                        onChange={handleFormaPagoChange}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                                    >
                                        <option value="Contado">Contado</option>
                                        <option value="Credito">Crédito</option>
                                    </select>
                                </div>
                                {formData.formaPago === 'Credito' && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Monto a Crédito</label>
                                        <div className="px-3 py-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800/30 rounded-lg">
                                            <p className="font-bold text-green-700 dark:text-green-400">S/ {(totalFacturaNumber - formData.montoDetraccion).toFixed(2)}</p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {formData.formaPago === 'Credito' && (
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Cuotas</label>
                                        <button
                                            type="button"
                                            onClick={agregarCuota}
                                            className="flex items-center gap-1 text-xs px-3 py-1.5 btn-accent rounded-lg transition-colors"
                                        >
                                            <Icon icon="solar:add-circle-bold" width={16} />
                                            Agregar Cuota
                                        </button>
                                    </div>

                                    <div className="space-y-2 max-h-40 overflow-y-auto">
                                        {(formData.cuotas || []).map((cuota, index) => (
                                            <div key={index} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-center bg-white dark:bg-slate-800 p-2 rounded-lg border border-gray-200 dark:border-slate-700">
                                                <input
                                                    type="number"
                                                    value={cuota.monto || ''}
                                                    onChange={(e) => actualizarCuota(index, 'monto', e.target.value)}
                                                    placeholder="Monto"
                                                    className="px-2 py-1.5 text-sm border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                                                />
                                                <input
                                                    type="date"
                                                    value={cuota.fechaVencimiento || ''}
                                                    onChange={(e) => actualizarCuota(index, 'fechaVencimiento', e.target.value)}
                                                    className="px-2 py-1.5 text-sm border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => eliminarCuota(index)}
                                                    className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                >
                                                    <Icon icon="solar:close-circle-bold" width={20} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>

                                    {(formData.cuotas || []).length > 0 && (
                                        <div className="flex justify-between items-center p-2 bg-blue-50 dark:bg-blue-900/10 rounded-lg border border-blue-200 dark:border-blue-800/30">
                                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Suma de Cuotas:</span>
                                            <span className={`font-bold ${Math.abs((formData.cuotas || []).reduce((sum, c) => sum + (c.monto || 0), 0) - (totalFacturaNumber - formData.montoDetraccion)) < 0.01
                                                ? 'text-green-600 dark:text-green-400'
                                                : 'text-red-600 dark:text-red-400'
                                                }`}>
                                                S/ {((formData.cuotas || []).reduce((sum, c) => sum + (c.monto || 0), 0)).toFixed(2)}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Info importante */}
                    <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/30 rounded-lg p-3">
                        <div className="flex gap-2">
                            <Icon icon="solar:danger-triangle-bold" className="text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" width={18} />
                            <div className="text-xs text-amber-800 dark:text-amber-300">
                                <p className="font-semibold mb-1 dark:text-amber-400">Recordatorio SUNAT:</p>
                                <ul className="list-disc list-inside space-y-0.5 text-amber-700 dark:text-amber-300/80">
                                    {mode === 'RETENCION' ? (
                                        <>
                                            <li>El cliente retiene el 3% del total (Agente de Retención)</li>
                                            <li>Se debe emitir un Comprobante de Retención</li>
                                        </>
                                    ) : (
                                        <>
                                            <li>El cliente debe depositar el monto de detracción en tu cuenta del Banco de la Nación</li>
                                            <li>La detracción aplica generalmente para montos mayores a S/ 700.00</li>
                                        </>
                                    )}
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-gray-100 dark:border-slate-800 flex gap-3 justify-end bg-gray-50 dark:bg-slate-800/30">
                    <Button
                        color="lila"
                        onClick={onClose}
                        outline
                    >
                        Cancelar
                    </Button>
                    <Button
                        color="primary"
                        onClick={handleGuardar}
                        className="shadow-lg shadow-black/20"
                    >
                        <Icon icon="solar:check-circle-bold" className="mr-2" width={18} />
                        Guardar {mode === 'RETENCION' ? 'Retención' : 'Detracción'}
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default ModalDetraccion;
