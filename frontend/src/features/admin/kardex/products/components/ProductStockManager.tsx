import React from 'react';
import { Icon } from '@iconify/react';
import InputPro from '@/components/InputPro';
import { useAuthStore } from '@/zustand/auth';
import { useProductModalViewModel } from '../useProductModalViewModel';

type ViewProps = ReturnType<typeof useProductModalViewModel>;

export const ProductStockManager: React.FC<{ vm: ViewProps }> = ({ vm }) => {
    const { auth } = useAuthStore();
    const {
        isEdit, isRestaurante, isFarmacia, esFarmaceutico, isFabricacion, tipoAjusteStock, cantidadAjuste, stockOriginal, productSections,
        formValues, errors, isMobile,
        setTipoAjusteStock, setCantidadAjuste, handleChange, sedeActiva
    } = vm;

    const esServicio = String((formValues as any)?.atributosTecnicos?.tipoProducto || '').toUpperCase() === 'SERVICIO';
    if (!productSections.inventario && !esServicio) return null;
    const tieneSedeActiva = Boolean(sedeActiva?.id);

    const hasSedePolicy = productSections.multiplesSedes;

    const sedePolicy = (
        <div className={`${hasSedePolicy ? 'mt-0' : 'mt-4'} rounded-xl border border-violet-100 p-3 dark:border-violet-900/40 dark:bg-violet-950/20 h-full`}>
            <div className="flex items-start justify-between gap-3">
                <div>
                    <h6 className="text-xs font-bold uppercase tracking-wide">
                        Disponibilidad por sede
                    </h6>
                    <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
                        {tieneSedeActiva
                            ? `Aplica para ${sedeActiva?.nombre}.`
                            : 'Selecciona una sede para aplicar reglas locales.'}
                    </p>
                </div>
                <Icon icon={sedeActiva?.tipo === 'ALMACEN' ? 'solar:box-bold-duotone' : 'solar:shop-bold-duotone'} className="text-violet-600 shrink-0" width={22} />
            </div>

            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 mb-10">
                <label className="flex items-center gap-2 rounded-lg border border-white/70 bg-white px-3 py-2 text-[11px] font-semibold text-gray-700 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-gray-200">
                    <input
                        type="checkbox"
                        name="visibleEnSede"
                        checked={formValues?.visibleEnSede !== false}
                        onChange={(e) => handleChange({ target: { name: 'visibleEnSede', value: e.target.checked } } as any)}
                        className="h-3.5 w-3.5 rounded border-gray-300 dark:border-slate-700 text-violet-600 focus:ring-violet-500"
                    />
                    Visible en catálogo
                </label>
                <label className="flex items-center gap-2 rounded-lg border border-white/70 bg-white px-3 py-2 text-[11px] font-semibold text-gray-700 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-gray-200">
                    <input
                        type="checkbox"
                        name="disponibleParaVenta"
                        checked={formValues?.disponibleParaVenta !== false}
                        onChange={(e) => handleChange({ target: { name: 'disponibleParaVenta', value: e.target.checked } } as any)}
                        className="h-3.5 w-3.5 rounded border-gray-300 dark:border-slate-700 text-violet-600 focus:ring-violet-500"
                    />
                    Permite vender
                </label>
            </div>

            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-4">
                <div className="col-span-2">
                    <InputPro autocomplete="off" type="text" value={formValues?.ubicacionSede ?? ''} name="ubicacionSede" onChange={handleChange} isLabel label="Ubicación" placeholder="Ej. Vitrina A-1" />
                </div>
                <InputPro autocomplete="off" type="number" value={formValues?.precioUnitarioSede ?? ''} name="precioUnitarioSede" onChange={handleChange} isLabel label="Precio sede" placeholder="Usar general" />
                <InputPro autocomplete="off" type="number" value={formValues?.precioOfertaSede ?? ''} name="precioOfertaSede" onChange={handleChange} isLabel label="Oferta sede" placeholder="Opcional" />
            </div>

            {!tieneSedeActiva && (
                <p className="mt-2 text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                    <Icon icon="mdi:alert-circle" className="inline mr-1" width={12} />
                    Para configurar por sede, edita el producto desde la sucursal.
                </p>
            )}
        </div>
    );

    return (
        <div className="col-span-1 md:col-span-2">
            <div className="rounded-xl border border-gray-100 dark:border-white/10 bg-gradient-to-br from-white to-gray-50/30 dark:from-slate-800/60 dark:to-slate-900/40 p-4">
                <h5 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
                    <Icon icon="mdi:cube-outline" width={16} height={16} />
                    {isRestaurante ? 'Disponibilidad' : esFarmaceutico ? 'Stock' : isFabricacion ? 'Stock del ítem' : 'Gestión de Inventario'}
                </h5>

                {esServicio ? (
                    <div className={hasSedePolicy ? 'grid grid-cols-1 lg:grid-cols-4 gap-6' : ''}>
                        <div className={hasSedePolicy ? 'lg:col-span-1' : ''}>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                Los servicios no descuentan inventario, pero puedes controlar si se muestran y venden en cada sede.
                            </p>
                        </div>
                        {hasSedePolicy && (
                            <div className="lg:col-span-3">
                                {sedePolicy}
                            </div>
                        )}
                    </div>
                ) : isRestaurante ? (
                    <div className={hasSedePolicy ? 'grid grid-cols-1 lg:grid-cols-4 gap-6' : ''}>
                        <div className={hasSedePolicy ? 'lg:col-span-1' : ''}>
                            <InputPro
                                autocomplete="off"
                                type="number"
                                value={formValues?.stock}
                                error={errors.stock}
                                name="stock"
                                onChange={handleChange}
                                isLabel
                                label="Cantidad disponible"
                                placeholder="Ej. 50"
                            />
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                                Indica cuántas porciones/unidades tienes disponibles para vender.
                            </p>
                        </div>
                        {hasSedePolicy && (
                            <div className="lg:col-span-3">
                                {sedePolicy}
                            </div>
                        )}
                    </div>
                ) : isEdit ? (
                    <div className={hasSedePolicy ? 'grid grid-cols-1 lg:grid-cols-4 gap-6' : ''}>
                        <div className={hasSedePolicy ? 'lg:col-span-1 space-y-4' : 'space-y-4'}>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="bg-white dark:bg-slate-800 p-3 rounded-lg border border-blue-100 dark:border-blue-900/30">
                                    <div className="text-lg font-bold text-blue-600 dark:text-blue-400">{stockOriginal}</div>
                                    <div className="text-xs text-gray-600 dark:text-gray-400">Stock Actual</div>
                                </div>
                                <div className="bg-white dark:bg-slate-800 p-3 rounded-lg border border-green-100 dark:border-green-900/30">
                                    <div className="text-lg font-bold text-green-600 dark:text-green-400">
                                        {tipoAjusteStock === 'ninguno' ? stockOriginal :
                                            tipoAjusteStock === 'reemplazar' ? cantidadAjuste :
                                                tipoAjusteStock === 'sumar' ? stockOriginal + cantidadAjuste :
                                                    tipoAjusteStock === 'restar' ? Math.max(0, stockOriginal - cantidadAjuste) : stockOriginal
                                        }
                                    </div>
                                    <div className="text-xs text-gray-600 dark:text-gray-400">Stock Resultante</div>
                                </div>
                            </div>

                            <div>
                                <div>
                                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">Tipo de Ajuste</label>
                                    <div className="flex flex-wrap gap-2">
                                        {[
                                            { value: 'ninguno', label: 'Sin cambios', color: 'bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300' },
                                            { value: 'reemplazar', label: 'Reemplazar', color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' },
                                            { value: 'sumar', label: 'Agregar', color: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' },
                                            { value: 'restar', label: 'Quitar', color: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' }
                                        ].map((tipo) => (
                                            <button
                                                key={tipo.value}
                                                type="button"
                                                onClick={() => setTipoAjusteStock(tipo.value as any)}
                                                className={`px-3 py-2 rounded-lg text-[11px] font-semibold transition-all ${tipoAjusteStock === tipo.value
                                                    ? tipo.color + ' ring-2 ring-offset-2 dark:ring-offset-slate-900 ring-blue-400'
                                                    : 'bg-gray-50 dark:bg-slate-800/50 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700'
                                                    }`}
                                            >
                                                {tipo.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {tipoAjusteStock !== 'ninguno' && (
                                    <div className="mt-3">
                                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">
                                            {tipoAjusteStock === 'reemplazar' ? 'Nuevo stock total:' :
                                                tipoAjusteStock === 'sumar' ? 'Cantidad a agregar:' :
                                                    'Cantidad a quitar:'}
                                        </label>
                                        <input
                                            type="number"
                                            min="0"
                                            value={cantidadAjuste}
                                            onChange={(e) => setCantidadAjuste(Number(e.target.value))}
                                            className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                            placeholder="Ingrese la cantidad"
                                        />
                                    </div>
                                )}

                                {tipoAjusteStock !== 'ninguno' && (
                                    <div className="mt-2 text-[10px] text-gray-600 dark:text-amber-400 bg-yellow-50 dark:bg-amber-900/20 p-2 rounded border border-yellow-200 dark:border-amber-800/50">
                                        <Icon icon="mdi:information" className="inline mr-1" width={14} height={14} />
                                        Este ajuste se registrará automáticamente en el kardex.
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <InputPro autocomplete="off" type="number" value={formValues?.stockMinimo ?? ''} name="stockMinimo" onChange={handleChange} isLabel label="Stock mínimo" placeholder="Ej. 5" />
                                <InputPro autocomplete="off" type="number" value={formValues?.stockMaximo ?? ''} name="stockMaximo" onChange={handleChange} isLabel label={isMobile ? "Stock máximo" : "Stock máximo"} placeholder="Ej. 100" />
                            </div>
                        </div>
                        {hasSedePolicy && (
                            <div className="lg:col-span-3">
                                {sedePolicy}
                            </div>
                        )}
                    </div>
                ) : (
                    <div className={hasSedePolicy ? 'grid grid-cols-1 lg:grid-cols-4 gap-6' : ''}>
                        <div className={hasSedePolicy ? 'lg:col-span-1' : ''}>
                            <InputPro autocomplete="off" type="number" readOnly={esFarmaceutico} value={formValues?.stock} error={errors.stock} name="stock" onChange={handleChange} isLabel label="Stock Inicial" placeholder="Cantidad inicial en inventario" />
                            {esFarmaceutico && <p className="text-[11px] text-amber-500 dark:text-amber-400 mt-1"><Icon icon="mdi:information" className="inline mr-1" />En farmacia, ingresa el stock inicial usando el botón "Gestión de Lotes".</p>}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                                <InputPro autocomplete="off" type="number" value={formValues?.stockMinimo ?? ''} name="stockMinimo" onChange={handleChange} isLabel label="Stock mínimo" placeholder="Ej. 5" />
                                <InputPro autocomplete="off" type="number" value={formValues?.stockMaximo ?? ''} name="stockMaximo" onChange={handleChange} isLabel label={isMobile ? "Stock máximo" : "Stock máximo"} placeholder="Ej. 100" />
                            </div>
                        </div>
                        {hasSedePolicy && (
                            <div className="lg:col-span-3">
                                {sedePolicy}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};
