import React, { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';
import Modal from '@/components/Modal';
import InputPro from '@/components/InputPro';
import Button from '@/components/Button';
import { useSedesStore } from '@/zustand/sedes';
import { useAuthStore } from '@/zustand/auth';
import { Sede, TipoSede } from '@/interfaces/Sede';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    sede: Sede | null;
    isEdit: boolean;
}

const SedeModal: React.FC<Props> = ({ isOpen, onClose, sede, isEdit }) => {
    const { crearSede, actualizarSede, loading, sedes } = useSedesStore();
    const { auth } = useAuthStore();

    // Leer maxSedes desde el plan del usuario autenticado
    // Usamos ?? para que si es 0 (ilimitado) no se reemplace por 1
    const planMaxSedes = (auth as any)?.empresa?.plan?.maxSedes;
    const maxSedes = planMaxSedes ?? 1;
    const isUnlimited = maxSedes === 0;
    const currentSedes = sedes.filter(s => (s as any).activo !== false).length;
    const canCreate = isEdit || isUnlimited || currentSedes < maxSedes;

    const [formData, setFormData] = useState({
        nombre: '',
        direccion: '',
        codigo: '',
        tipo: 'PUNTO_DE_VENTA' as TipoSede,
        esPrincipal: false,
        permiteFacturacion: false,
    });

    const [errors, setErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        if (sede && isEdit) {
            setFormData({
                nombre: sede.nombre,
                direccion: sede.direccion || '',
                codigo: sede.codigo || '',
                tipo: sede.tipo ?? 'PUNTO_DE_VENTA',
                esPrincipal: sede.esPrincipal,
                permiteFacturacion: sede.permiteFacturacion ?? false,
            });
        } else {
            setFormData({
                nombre: '',
                direccion: '',
                codigo: '',
                tipo: 'PUNTO_DE_VENTA',
                esPrincipal: false,
                permiteFacturacion: false,
            });
        }
        setErrors({});
    }, [sede, isEdit, isOpen]);

    const handleInputChange = (e: any) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
    };

    const validateForm = (): boolean => {
        const newErrors: Record<string, string> = {};
        if (!formData.nombre.trim()) newErrors.nombre = 'El nombre es obligatorio';
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validateForm()) return;

        try {
            if (isEdit && sede) {
                await actualizarSede(sede.id, formData);
            } else {
                await crearSede(formData);
            }
            onClose();
        } catch (error) {
            console.error(error);
        }
    };

    return (
        <Modal
            isOpenModal={isOpen}
            closeModal={onClose}
            title={`${isEdit ? 'Editar' : 'Crear'} Sede`}
            width="600px"
        >
            <form onSubmit={handleSubmit} className="space-y-6 p-6">
                <div className="bg-white dark:bg-[#111827] rounded-2xl border border-gray-100 dark:border-transparent p-5">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-5 flex items-center gap-2">
                        <Icon icon="solar:buildings-bold-duotone" className="text-blue-600 dark:text-blue-400" />
                        Datos de la Sede
                    </h3>

                    {!isEdit && !canCreate && (
                        <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 p-4 mb-5 rounded-r-xl">
                            <div className="flex">
                                <div className="flex-shrink-0">
                                    <Icon icon="mdi:alert-circle" className="h-5 w-5 text-red-500" />
                                </div>
                                <div className="ml-3">
                                    <p className="text-sm text-red-700 dark:text-red-400 font-bold">
                                        Límite de sedes alcanzado ({maxSedes})
                                    </p>
                                    <p className="text-xs text-red-600 dark:text-red-400/80 mt-1">
                                        Has alcanzado el límite permitido por tu plan. Contacta a soporte para actualizarlo.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="space-y-4">
                        <InputPro
                            type="text"
                            name="nombre"
                            value={formData.nombre}
                            onChange={handleInputChange}
                            label="Nombre de la Sede"
                            isLabel
                            error={errors.nombre}
                            placeholder="Ej: Sede Principal, Sucursal A"
                        />

                        <InputPro
                            type="text"
                            name="direccion"
                            value={formData.direccion}
                            onChange={handleInputChange}
                            label="Dirección"
                            isLabel
                            placeholder="Av. Ejemplo 123"
                        />

                        <InputPro
                            type="text"
                            name="codigo"
                            value={formData.codigo}
                            onChange={handleInputChange}
                            label="Código SUNAT (Anexo)"
                            isLabel
                            placeholder="0000"
                            maxLength={4}
                        />

                        {/* Tipo de sede */}
                        <div>
                            <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Tipo de sede</p>
                            <div className="grid grid-cols-2 gap-3">
                                {([
                                    { value: 'PUNTO_DE_VENTA', label: 'Punto de Venta', desc: 'Vende, factura y cobra', icon: 'solar:shop-bold-duotone', color: 'blue' },
                                    { value: 'ALMACEN', label: 'Almacén', desc: 'Gestiona stock, abastece', icon: 'solar:box-bold-duotone', color: 'amber' },
                                ] as const).map(opt => {
                                    const active = formData.tipo === opt.value;
                                    return (
                                        <button
                                            key={opt.value}
                                            type="button"
                                            onClick={() => setFormData(prev => ({ ...prev, tipo: opt.value }))}
                                            className={`flex flex-col items-center gap-1.5 p-3.5 rounded-xl border-2 transition-all text-center ${
                                                active
                                                    ? opt.color === 'blue'
                                                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                                        : 'border-amber-500 bg-amber-50 dark:bg-amber-900/20'
                                                    : 'border-gray-100 dark:border-slate-700 hover:border-gray-200 dark:hover:border-slate-600'
                                            }`}
                                        >
                                            <Icon
                                                icon={opt.icon}
                                                className={active
                                                    ? opt.color === 'blue' ? 'text-blue-600 dark:text-blue-400' : 'text-amber-600 dark:text-amber-400'
                                                    : 'text-gray-400 dark:text-gray-500'}
                                                width={26}
                                            />
                                            <span className={`text-xs font-bold ${active
                                                ? opt.color === 'blue' ? 'text-blue-700 dark:text-blue-300' : 'text-amber-700 dark:text-amber-300'
                                                : 'text-gray-600 dark:text-gray-400'}`}>{opt.label}</span>
                                            <span className="text-[10px] text-gray-400 dark:text-gray-500">{opt.desc}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Facturación en Almacén: solo aplica a sedes tipo ALMACEN */}
                        {formData.tipo === 'ALMACEN' && (
                            <div className="flex items-start space-x-2 mt-4 bg-emerald-50/60 dark:bg-emerald-900/10 p-3 rounded-xl border border-emerald-200 dark:border-emerald-800/40">
                                <input
                                    type="checkbox"
                                    id="permiteFacturacion"
                                    checked={formData.permiteFacturacion}
                                    onChange={(e) => setFormData(prev => ({ ...prev, permiteFacturacion: e.target.checked }))}
                                    className="mt-0.5 h-5 w-5 text-emerald-600 dark:text-emerald-500 focus:ring-emerald-500 dark:focus:ring-emerald-600 bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-700 rounded transition-colors"
                                />
                                <label htmlFor="permiteFacturacion" className="cursor-pointer">
                                    <span className="block text-sm font-bold text-emerald-800 dark:text-emerald-300">Permitir facturación en este almacén</span>
                                    <span className="block text-[11px] text-emerald-600/90 dark:text-emerald-400/80 mt-0.5">Habilita el módulo de Comprobantes para emitir boletas/facturas desde esta sede.</span>
                                </label>
                            </div>
                        )}

                        <div className="flex items-center space-x-2 mt-4 bg-gray-50/50 dark:bg-slate-900/30 p-3 rounded-xl border border-gray-100 dark:border-transparent">
                            <input
                                type="checkbox"
                                id="esPrincipal"
                                checked={formData.esPrincipal}
                                onChange={(e) => setFormData(prev => ({ ...prev, esPrincipal: e.target.checked }))}
                                className="h-5 w-5 text-blue-600 dark:text-blue-500 focus:ring-blue-500 dark:focus:ring-blue-600 bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-700 rounded transition-colors"
                                disabled={isEdit && sede?.esPrincipal}
                            />
                            <label htmlFor="esPrincipal" className="text-sm font-bold text-gray-700 dark:text-gray-300 cursor-pointer">
                                Es Sede Principal
                            </label>
                            {isEdit && sede?.esPrincipal && <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold ml-2 px-2 py-0.5 bg-emerald-50 dark:bg-emerald-900/20 rounded-full border border-emerald-200 dark:border-emerald-800/50 uppercase tracking-wider">Sede Principal</span>}
                        </div>

                    </div>
                </div>

                <div className="flex justify-end gap-3">
                    <Button type="button" color="black" outline onClick={onClose} disabled={loading}>
                        Cancelar
                    </Button>
                    <Button type="submit" color="secondary" disabled={loading || (!isEdit && !canCreate)}>
                        {loading ? (
                            <>
                                <Icon icon="mdi:loading" className="animate-spin mr-2" /> Saving...
                            </>
                        ) : (
                            <>
                                <Icon icon="mdi:content-save" className="mr-2" /> {isEdit ? 'Actualizar' : 'Crear'}
                            </>
                        )}

                    </Button>
                </div>
            </form>
        </Modal>
    );
};

export default SedeModal;
