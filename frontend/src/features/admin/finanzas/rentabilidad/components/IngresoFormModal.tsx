import { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';
import { IngresoManual, IngresoFormData, TIPOS_INGRESO, getMesFullLabel, esFinanciamiento } from '../RentabilidadModel';

interface IngresoFormModalProps {
    isOpen: boolean;
    mesActual: number;
    anioActual: number;
    ingresoEditando: IngresoManual | null;
    isSaving: boolean;
    onClose: () => void;
    onCrear: (data: IngresoFormData) => Promise<boolean>;
    onActualizar: (id: number, data: Partial<IngresoFormData>) => Promise<boolean>;
}

const INITIAL_FORM = { concepto: '', tipo: 'OTROS', monto: '', fecha: '', descripcion: '' };

function getDefaultDate(mes: number, anio: number): string {
    const now = new Date();
    if (now.getFullYear() === anio && now.getMonth() + 1 === mes) {
        return `${anio}-${String(mes).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    }
    return `${anio}-${String(mes).padStart(2, '0')}-01`;
}

export default function IngresoFormModal({ isOpen, mesActual, anioActual, ingresoEditando, isSaving, onClose, onCrear, onActualizar }: IngresoFormModalProps) {
    const [form, setForm] = useState(INITIAL_FORM);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const minDate = `${anioActual}-${String(mesActual).padStart(2, '0')}-01`;
    const maxDate = new Date(anioActual, mesActual, 0).toISOString().slice(0, 10);

    useEffect(() => {
        if (ingresoEditando) {
            setForm({
                concepto: ingresoEditando.concepto,
                tipo: ingresoEditando.tipo,
                monto: String(ingresoEditando.monto),
                fecha: ingresoEditando.fecha?.slice(0, 10) ?? getDefaultDate(mesActual, anioActual),
                descripcion: ingresoEditando.descripcion ?? '',
            });
        } else {
            setForm({ ...INITIAL_FORM, fecha: getDefaultDate(mesActual, anioActual) });
        }
        setErrors({});
    }, [ingresoEditando, isOpen, mesActual, anioActual]);

    if (!isOpen) return null;

    const validate = (): boolean => {
        const errs: Record<string, string> = {};
        if (!form.concepto.trim()) errs.concepto = 'El concepto es obligatorio';
        if (!form.fecha) errs.fecha = 'Selecciona la fecha';
        const montoNum = parseFloat(form.monto);
        if (!form.monto || isNaN(montoNum) || montoNum <= 0) errs.monto = 'Ingresa un monto válido mayor a 0';
        setErrors(errs);
        return Object.keys(errs).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return;
        const payload: IngresoFormData = {
            concepto: form.concepto.trim(),
            tipo: form.tipo,
            monto: parseFloat(form.monto),
            fecha: form.fecha,
            ...(form.descripcion.trim() ? { descripcion: form.descripcion.trim() } : {}),
        };
        if (ingresoEditando) {
            await onActualizar(ingresoEditando.id, payload);
        } else {
            await onCrear(payload);
        }
    };

    const handleChange = (field: keyof typeof form, value: string) => {
        setForm(prev => ({ ...prev, [field]: value }));
        if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }));
    };

    return (
        <div className="fixed top-[-30px] inset-0 z-[999999] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50" onClick={onClose} />
            <div className="relative z-10 w-full max-w-md bg-white dark:bg-[#111827] rounded-3xl shadow-2xl border border-gray-100/50 dark:border-transparent overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-slate-800">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center">
                            <Icon icon={ingresoEditando ? 'solar:pen-bold-duotone' : 'solar:add-circle-bold-duotone'} className="text-emerald-600 dark:text-emerald-400 text-xl" />
                        </div>
                        <div>
                            <h2 className="font-bold text-gray-900 dark:text-white text-base">
                                {ingresoEditando ? 'Editar Ingreso' : 'Registrar Ingreso'}
                            </h2>
                            <p className="text-xs text-gray-400 dark:text-gray-500">Período: {getMesFullLabel(mesActual)} {anioActual}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="w-8 h-8 rounded-xl flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors">
                        <Icon icon="solar:close-circle-bold" className="text-xl" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {/* Tipo */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Tipo de ingreso</label>
                        <div className="grid grid-cols-3 gap-2">
                            {TIPOS_INGRESO.map(t => (
                                <button key={t.key} type="button" onClick={() => handleChange('tipo', t.key)}
                                    className={`flex flex-col items-center gap-1.5 px-2 py-2.5 rounded-xl border-2 text-xs font-medium transition-all ${
                                        form.tipo === t.key
                                            ? t.esFinanciamiento
                                                ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300'
                                                : 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300'
                                            : 'border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-gray-600 dark:text-gray-400 hover:border-gray-300'
                                    }`}>
                                    <Icon icon={t.icon} className="text-lg flex-shrink-0" />
                                    <span className="truncate text-center leading-tight">{t.label}</span>
                                </button>
                            ))}
                        </div>

                        {/* Aviso contextual según tipo */}
                        {esFinanciamiento(form.tipo) ? (
                            <div className="mt-2.5 flex items-start gap-2 bg-amber-50 dark:bg-amber-900/15 border border-amber-200 dark:border-amber-800/40 rounded-xl px-3 py-2.5">
                                <Icon icon="solar:info-circle-bold-duotone" className="text-amber-500 text-base flex-shrink-0 mt-0.5" />
                                <p className="text-xs text-amber-700 dark:text-amber-300 leading-relaxed">
                                    <span className="font-semibold">Este tipo no aparece en el P&L.</span> Los préstamos, inversiones y aportes de capital son actividades de financiamiento, no ingresos operacionales. Se registran aquí para control interno pero no afectan la Ganancia Neta.
                                </p>
                            </div>
                        ) : (
                            <div className="mt-2.5 flex items-start gap-2 bg-emerald-50 dark:bg-emerald-900/15 border border-emerald-200 dark:border-emerald-800/40 rounded-xl px-3 py-2.5">
                                <Icon icon="solar:check-circle-bold-duotone" className="text-emerald-500 text-base flex-shrink-0 mt-0.5" />
                                <p className="text-xs text-emerald-700 dark:text-emerald-300 leading-relaxed">
                                    <span className="font-semibold">Ingreso operacional.</span> Se sumará a tus Ventas Netas en el Estado de Resultados y aumentará la Ganancia Neta del período.
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Concepto */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                            Concepto <span className="text-rose-500">*</span>
                        </label>
                        <input type="text" value={form.concepto} onChange={e => handleChange('concepto', e.target.value)}
                            placeholder="Ej: Pago mensualidad Cliente X, Inversión inicial..."
                            className={`w-full px-3 py-2.5 rounded-xl border text-sm bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-colors ${errors.concepto ? 'border-rose-400' : 'border-gray-200 dark:border-slate-700'}`} />
                        {errors.concepto && <p className="mt-1 text-xs text-rose-500">{errors.concepto}</p>}
                    </div>

                    {/* Monto + Fecha */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                                Monto (S/) <span className="text-rose-500">*</span>
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                                    <span className="text-gray-400 text-sm font-semibold">S/</span>
                                </div>
                                <input type="number" min="0.01" step="0.01" value={form.monto} onChange={e => handleChange('monto', e.target.value)}
                                    placeholder="0.00"
                                    className={`w-full pl-9 pr-3 py-2.5 rounded-xl border text-sm bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-colors tabular-nums ${errors.monto ? 'border-rose-400' : 'border-gray-200 dark:border-slate-700'}`} />
                            </div>
                            {errors.monto && <p className="mt-1 text-xs text-rose-500">{errors.monto}</p>}
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                                Fecha <span className="text-rose-500">*</span>
                            </label>
                            <input type="date" min={minDate} max={maxDate} value={form.fecha} onChange={e => handleChange('fecha', e.target.value)}
                                className={`w-full px-3 py-2.5 rounded-xl border text-sm bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-colors ${errors.fecha ? 'border-rose-400' : 'border-gray-200 dark:border-slate-700'}`} />
                            {errors.fecha && <p className="mt-1 text-xs text-rose-500">{errors.fecha}</p>}
                        </div>
                    </div>

                    {/* Descripción */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                            Descripción <span className="text-xs font-normal text-gray-400">(opcional)</span>
                        </label>
                        <textarea rows={2} value={form.descripcion} onChange={e => handleChange('descripcion', e.target.value)}
                            placeholder="Detalles adicionales del ingreso..."
                            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 text-sm bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-colors resize-none" />
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-2">
                        <button type="button" onClick={onClose} disabled={isSaving}
                            className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 text-sm font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50">
                            Cancelar
                        </button>
                        <button type="submit" disabled={isSaving}
                            className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors flex items-center justify-center gap-2 shadow-sm shadow-emerald-200 dark:shadow-emerald-900/20">
                            {isSaving ? (
                                <><Icon icon="eos-icons:loading" className="text-base animate-spin" />Guardando...</>
                            ) : (
                                <><Icon icon={ingresoEditando ? 'solar:pen-bold' : 'solar:add-circle-bold'} className="text-base" />{ingresoEditando ? 'Actualizar' : 'Guardar'}</>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
