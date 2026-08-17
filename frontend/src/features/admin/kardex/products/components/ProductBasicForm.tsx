import React, { useState, useEffect, useRef } from 'react';
import { BarcodeScannerInput } from '@/components/BarcodeScannerInput';
import { Icon } from '@iconify/react';
import Select from '@/components/Select';
import InputPro from '@/components/InputPro';
import { ICategory } from '@/interfaces/categories';
import { IBrand } from '@/zustand/brands';
import { GrupoModificador } from '@/zustand/modificadores';
import { useProductModalViewModel } from '../useProductModalViewModel';
import { ProductStockManager } from './ProductStockManager';

import { ProductVariantsManager } from './ProductVariantsManager';
import { ProductFinancialAnalysis } from './ProductFinancialAnalysis';
import { tipoCambioService } from '@/services/tipoCambio.service';

const afectaciones = [
    { id: "10", value: "Gravado - Operación Onerosa" },
    { id: "20", value: "Exonerado" },
    { id: "30", value: "Inafecto" },
    { id: "40", value: "Exportación" }
];

type ViewProps = ReturnType<typeof useProductModalViewModel>;

export const ProductBasicForm: React.FC<{ vm: ViewProps }> = ({ vm }) => {
    const {
        isFarmacia, esDrogueria, esFarmaceutico, isFabricacion, isRestaurante, isMobile, isEdit, features, productSections, labels,
        formValues, errors, unitOfMeasure, categories, brands, gruposModificadores, gruposSeleccionados,
        isCategorizing, tieneGestionProvisiones, tieneTienda, tieneGestionLotes,
        handleChange, handleChangeSelect, handleAutoCategorize, handlePrecioUnitarioBlur,
        setShowMedicamentoModal, setShowLotesModal, toggleGrupoSeleccionado,
        setFormValues, addCategory, addBrand,
    } = vm;

    // Creación inline de categoría/marca (sin salir del modal de producto)
    const [creatingCat, setCreatingCat] = useState(false);
    const [newCatName, setNewCatName] = useState('');
    const [savingCat, setSavingCat] = useState(false);
    const [creatingBrand, setCreatingBrand] = useState(false);
    const [newBrandName, setNewBrandName] = useState('');
    const [savingBrand, setSavingBrand] = useState(false);

    const handleCrearCategoria = async () => {
        const nombre = newCatName.trim();
        if (!nombre || savingCat) return;
        setSavingCat(true);
        try {
            const creada: any = await (addCategory as any)({ nombre });
            if (creada?.id) {
                handleChangeSelect(creada.id, creada.nombre ?? nombre, 'categoriaNombre', 'categoriaId');
                setCreatingCat(false);
                setNewCatName('');
            }
        } finally {
            setSavingCat(false);
        }
    };

    const handleCrearMarca = async () => {
        const nombre = newBrandName.trim();
        if (!nombre || savingBrand) return;
        setSavingBrand(true);
        try {
            const creada: any = await (addBrand as any)({ nombre });
            if (creada?.id) {
                handleChangeSelect(creada.id, creada.nombre ?? nombre, 'marcaNombre', 'marcaId');
                setCreatingBrand(false);
                setNewBrandName('');
            }
        } finally {
            setSavingBrand(false);
        }
    };

    // Render del control inline "+ Nueva …" reutilizable para categoría y marca.
    const renderInlineCreate = (
        active: boolean,
        setActive: (v: boolean) => void,
        name: string,
        setName: (v: string) => void,
        saving: boolean,
        onCreate: () => void,
        labelNuevo: string,
        placeholder: string,
    ) => active ? (
        <div className="flex items-center gap-1.5 mt-1.5">
            <input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => {
                    if (e.key === 'Enter') { e.preventDefault(); onCreate(); }
                    else if (e.key === 'Escape') { setActive(false); setName(''); }
                }}
                placeholder={placeholder}
                className="flex-1 min-w-0 px-2.5 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button type="button" onClick={onCreate} disabled={saving || !name.trim()} className="p-1.5 rounded-lg bg-blue-600 text-white shrink-0 disabled:opacity-50">
                <Icon icon={saving ? 'line-md:loading-twotone-loop' : 'mdi:check'} className="text-base" />
            </button>
            <button type="button" onClick={() => { setActive(false); setName(''); }} className="p-1.5 rounded-lg bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-gray-400 shrink-0">
                <Icon icon="mdi:close" className="text-base" />
            </button>
        </div>
    ) : (
        <button type="button" onClick={() => setActive(true)} className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline">
            <Icon icon="solar:add-circle-linear" className="text-sm" /> {labelNuevo}
        </button>
    );

    const [modoConIgv, setModoConIgv] = useState(true);
    const [simVentasDia, setSimVentasDia] = useState('');
    const [simPublicidadDia, setSimPublicidadDia] = useState('');
    const [advancedFinancialOpen, setAdvancedFinancialOpen] = useState(false);
    const [provisionOpen, setProvisionOpen] = useState(false);

    // Costo de venta ingresado CON IGV (texto crudo del input). costoUnitario SIEMPRE se guarda NETO.
    const [costoConIgvInput, setCostoConIgvInput] = useState('');
    const _costoNet = Number((formValues as any)?.costoUnitario) || 0;
    const _esGravadoCosto = !['20', '30'].includes((formValues as any).tipoAfectacionIGV ?? '10');
    const _costoBrutoDerivado = _costoNet > 0
        ? (_esGravadoCosto ? parseFloat((_costoNet * 1.18).toFixed(2)) : _costoNet)
        : 0;
    useEffect(() => {
        // Sincroniza el texto del input con el neto almacenado cuando cambia por fuera (carga en edición
        // o cambio de afectación), pero respeta lo que el usuario está tecleando si ya cuadra con ese neto.
        const implicitoNet = costoConIgvInput === ''
            ? 0
            : (_esGravadoCosto ? parseFloat((parseFloat(costoConIgvInput) / 1.18).toFixed(2)) : parseFloat(costoConIgvInput)) || 0;
        if (Math.abs(implicitoNet - _costoNet) > 0.005) {
            setCostoConIgvInput(_costoBrutoDerivado > 0 ? String(_costoBrutoDerivado) : '');
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [_costoNet, _esGravadoCosto]);

    const esServicio = String(((formValues as any)?.atributosTecnicos || {})?.tipoProducto || '').toUpperCase() === 'SERVICIO';

    // Moneda del producto: 'PEN' (soles) o 'USD' (dólares). Al facturar, USD se convierte a soles con el TC del día.
    const moneda = ((formValues as any)?.moneda === 'USD') ? 'USD' : 'PEN';
    const simbolo = moneda === 'USD' ? '$' : 'S/';
    const setMoneda = (m: 'PEN' | 'USD') => setFormValues({ ...formValues, moneda: m } as any);
    const [tcVenta, setTcVenta] = useState<number | null>(null);
    useEffect(() => {
        if (moneda === 'USD' && tcVenta == null) {
            tipoCambioService
                .consultar()
                .then((tc) => setTcVenta(Number(tc?.venta) || null))
                .catch(() => setTcVenta(null));
        }
    }, [moneda, tcVenta]);

    const setAtributoTecnico = (key: string, value: string) => {
        setFormValues({
            ...formValues,
            atributosTecnicos: {
                ...((formValues as any)?.atributosTecnicos || {}),
                [key]: value,
            },
        });
    };

    const getAtributoTecnico = (key: string) => String(((formValues as any)?.atributosTecnicos || {})[key] || '');
    const getAtributoTecnicoBool = (key: string) => Boolean(((formValues as any)?.atributosTecnicos || {})[key]);

    // Códigos de barra ADICIONALES: mismo producto con distinto EAN por lote/importación.
    // Al escanear cualquiera de estos códigos, el POS resuelve a este mismo producto.
    const codigosExtra: string[] = Array.isArray((formValues as any)?.codigosBarrasExtra)
        ? (formValues as any).codigosBarrasExtra
        : [];
    const setCodigosExtra = (next: string[]) =>
        setFormValues({ ...formValues, codigosBarrasExtra: next } as any);
    const addCodigoExtra = () => setCodigosExtra([...codigosExtra, '']);
    const updateCodigoExtra = (i: number, val: string) =>
        setCodigosExtra(codigosExtra.map((c, idx) => (idx === i ? val : c)));
    const removeCodigoExtra = (i: number) =>
        setCodigosExtra(codigosExtra.filter((_, idx) => idx !== i));

    const technicalFields = Array.isArray((vm as any).technicalTemplate?.campos)
        ? [...((vm as any).technicalTemplate.campos as any[])].sort((a, b) => Number(a?.orden || 0) - Number(b?.orden || 0))
        : [];

    const setAtributoTecnicoValue = (key: string, value: any) => {
        setFormValues({
            ...formValues,
            atributosTecnicos: {
                ...((formValues as any)?.atributosTecnicos || {}),
                [key]: value,
            },
        });
    };

    const setTipoProducto = (tipoProducto: 'PRODUCTO' | 'SERVICIO') => {
        const nextAtributos = {
            ...((formValues as any)?.atributosTecnicos || {}),
            tipoProducto,
        };
        if (tipoProducto === 'PRODUCTO') delete (nextAtributos as any).tipoProducto;
        delete (nextAtributos as any).controlSeries;

        setFormValues({
            ...formValues,
            stock: tipoProducto === 'SERVICIO' ? 0 : formValues.stock,
            stockMinimo: tipoProducto === 'SERVICIO' ? 0 : formValues.stockMinimo,
            stockMaximo: tipoProducto === 'SERVICIO' ? 0 : formValues.stockMaximo,
            atributosTecnicos: nextAtributos,
        } as any);
    };

    const renderTechnicalInput = (field: any) => {
        const key = String(field?.key || '');
        if (!key) return null;
        if (key === 'marca') {
            return (
                <InputPro
                    key={key}
                    autocomplete="off"
                    value={(formValues as any)?.marcaNombre || getAtributoTecnico(key)}
                    name={`ficha-${key}`}
                    onChange={(e: any) => setAtributoTecnicoValue(key, e.target.value)}
                    isLabel
                    label={field.label || 'Marca'}
                    placeholder="Ej: Logitech"
                />
            );
        }
        if (field?.tipo === 'booleano') {
            const active = getAtributoTecnicoBool(key);
            return (
                <button
                    key={key}
                    type="button"
                    onClick={() => setAtributoTecnicoValue(key, active ? '' : 'true')}
                    className={`h-[52px] rounded-xl border px-4 text-left transition-all ${active
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-300'
                        : 'border-gray-200 bg-white text-gray-600 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-300'
                        }`}
                >
                    <span className="flex items-center justify-between gap-3">
                        <span>
                            <span className="block text-[11px] font-black uppercase tracking-wide opacity-70">{field.label}</span>
                            <span className="block text-sm font-bold">{active ? 'Sí' : 'No'}</span>
                        </span>
                        <Icon icon={active ? 'solar:check-circle-bold' : 'solar:close-circle-linear'} width={20} />
                    </span>
                </button>
            );
        }
        if (field?.tipo === 'textarea') {
            return (
                <label key={key} className="block">
                    <span className="mb-1.5 block text-xs font-black uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        {field.label || key}
                    </span>
                    <textarea
                        value={getAtributoTecnico(key)}
                        name={`ficha-${key}`}
                        onChange={(e: any) => setAtributoTecnicoValue(key, e.target.value)}
                        rows={2}
                        placeholder={field.placeholder || 'Completar característica'}
                        className="w-full resize-none rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-800 outline-none transition-all placeholder:text-gray-400 focus:border-sky-300 focus:ring-4 focus:ring-sky-100 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-100 dark:focus:border-sky-700 dark:focus:ring-sky-950/40"
                    />
                </label>
            );
        }
        return (
            <InputPro
                key={key}
                autocomplete="off"
                type={field?.tipo === 'numero' ? 'number' : 'text'}
                value={getAtributoTecnico(key)}
                name={`ficha-${key}`}
                onChange={(e: any) => setAtributoTecnicoValue(key, e.target.value)}
                isLabel
                label={`${field.label || key}${field.unidad ? ` (${field.unidad})` : ''}`}
                placeholder={field.placeholder || 'Completar característica'}
            />
        );
    };

    const groupedTechnicalFields = technicalFields.reduce((acc: Record<string, any[]>, field: any) => {
        const group = field?.grupo || 'Características';
        acc[group] = acc[group] || [];
        acc[group].push(field);
        return acc;
    }, {});

    const fichaTecnicaComputo = productSections.fichaComputo ? (
        <div className="col-span-1 md:col-span-2 rounded-2xl border border-sky-100 dark:border-sky-900/40 bg-sky-50/60 dark:bg-sky-950/10 p-4">
            <div className="flex items-start gap-3 mb-4">
                <div className="h-10 w-10 rounded-2xl bg-sky-100 dark:bg-sky-900/40 text-sky-600 dark:text-sky-300 flex items-center justify-center">
                    <Icon icon="solar:document-text-bold-duotone" width={20} />
                </div>
                <div>
                    <h5 className="text-sm font-black text-gray-900 dark:text-white">Ficha técnica del producto</h5>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {((vm as any).technicalTemplate?.nombre || 'Campos técnicos por rubro/categoría')}. Se mostrará en la tienda virtual tipo ficha técnica.
                    </p>
                </div>
            </div>
            {!esServicio && productSections.seriesGarantia && (
                <button
                    type="button"
                    onClick={() => setAtributoTecnico('controlSeries', getAtributoTecnicoBool('controlSeries') ? '' : 'true')}
                    className={`w-full mb-4 px-4 py-3 rounded-xl border flex items-center justify-between text-left transition-all ${getAtributoTecnicoBool('controlSeries')
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/20 dark:border-emerald-800 dark:text-emerald-300'
                        : 'bg-white/80 border-gray-200 text-gray-600 dark:bg-slate-900/40 dark:border-slate-700 dark:text-slate-300'
                        }`}
                >
                    <span>
                        <span className="block text-sm font-black">Controlar series y garantía al vender</span>
                        <span className="block text-xs opacity-80">Exigirá una serie por cada unidad vendida.</span>
                    </span>
                    <Icon icon={getAtributoTecnicoBool('controlSeries') ? 'solar:check-circle-bold' : 'solar:shield-check-linear'} width={22} />
                </button>
            )}
            {technicalFields.length > 0 ? (
                <div className="space-y-4">
                    {Object.entries(groupedTechnicalFields).map(([group, fields]) => (
                        <div key={group} className="rounded-2xl border border-white/70 bg-white/70 p-3 dark:border-white/10 dark:bg-slate-950/20">
                            <h6 className="mb-3 text-xs font-black uppercase tracking-wide text-slate-500 dark:text-slate-400">{group}</h6>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {(fields as any[]).map(renderTechnicalInput)}
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="rounded-xl border border-dashed border-sky-200 bg-white/70 p-4 text-sm text-slate-500 dark:border-sky-900 dark:bg-slate-950/20 dark:text-slate-400">
                    Aún no hay plantilla técnica para esta categoría. Puedes guardar el producto sin ficha por ahora.
                </div>
            )}
        </div>
    ) : null;

    const fixedCostFields = (
        <div className="col-span-1 md:col-span-2 space-y-3">
            {/* Costo fijo por venta */}
            <div className="rounded-xl border border-amber-100 dark:border-amber-900/40 bg-amber-50/40 dark:bg-amber-950/10 p-4">
                <div className="flex items-start gap-3 mb-3">
                    <div className="h-9 w-9 rounded-xl bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-300 flex items-center justify-center">
                        <Icon icon="solar:box-bold-duotone" width={18} />
                    </div>
                    <div>
                        <h5 className="text-sm font-bold text-gray-900 dark:text-white">Costo variable fijo por venta (S/)</h5>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                            Envío, empaque, regalo u otros costos por unidad vendida. Se suma al costo en el P&amp;L.
                        </p>
                    </div>
                </div>
                <InputPro
                    autocomplete="off"
                    type="number"
                    step="0.01"
                    value={(formValues as any)?.costoFijo || ''}
                    name="costoFijo"
                    onChange={handleChange}
                    isLabel
                    label="Costo fijo por unidad (S/)"
                    placeholder="0.00"
                />
            </div>
            {/* Comisión por vendedor */}
            <div className="rounded-xl border border-violet-100 dark:border-violet-900/40 bg-violet-50/40 dark:bg-violet-950/10 p-4">
                <div className="flex items-start gap-3 mb-3">
                    <div className="h-9 w-9 rounded-xl bg-violet-100 dark:bg-violet-900/40 text-violet-600 dark:text-violet-300 flex items-center justify-center">
                        <Icon icon="solar:users-group-rounded-bold-duotone" width={18} />
                    </div>
                    <div>
                        <h5 className="text-sm font-bold text-gray-900 dark:text-white">Comisión por vendedor</h5>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                            Se registra automáticamente al emitir el comprobante. Usa monto fijo <strong>o</strong> porcentaje, no ambos.
                        </p>
                    </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <InputPro
                        autocomplete="off"
                        type="number"
                        step="0.01"
                        value={(formValues as any)?.comisionPorVenta || ''}
                        name="comisionPorVenta"
                        onChange={handleChange}
                        isLabel
                        label="Comisión fija por unidad (S/)"
                        placeholder="0.00"
                    />
                    <InputPro
                        autocomplete="off"
                        type="number"
                        step="0.01"
                        value={(formValues as any)?.comisionPorcentaje || ''}
                        name="comisionPorcentaje"
                        onChange={handleChange}
                        isLabel
                        label="Comisión % sobre precio venta"
                        placeholder="0.0"
                    />
                </div>
            </div>
        </div>
    );

    if (isFarmacia) {
        return (
            <div className="w-full mt-3 space-y-5">
                {/* Inputs Básicos */}
                <div className="flex flex-col gap-4">
                    <InputPro autocomplete="off" error={errors.codigo} value={formValues?.codigo} name="codigo" onChange={handleChange} isLabel label="Código" />
                    <InputPro autocomplete="off" value={formValues?.descripcion} error={errors.descripcion} name="descripcion" onChange={handleChange} isLabel label="Nombre del medicamento" />

                    <Select defaultValue={formValues?.unidadMedidaNombre} error={""} isSearch options={unitOfMeasure?.map((item: ICategory) => ({ id: item?.id, value: `${item?.nombre}` }))} id="unidadMedidaId" name="unidadMedidaNombre" value="" onChange={handleChangeSelect} icon="clarity:box-plot-line" isIcon label="Unidad de medida" withLabel />
                    <div>
                        <Select defaultValue={formValues.categoriaNombre} error={""} isSearch options={categories?.map((item: ICategory) => ({ id: item?.id, value: `${item?.nombre}` }))} id="categoriaId" name="categoriaNombre" value="" onChange={handleChangeSelect} icon="clarity:box-plot-line" isIcon label="Categoría" withLabel />
                        {renderInlineCreate(creatingCat, setCreatingCat, newCatName, setNewCatName, savingCat, handleCrearCategoria, 'Nueva categoría', 'Nombre de la categoría')}
                    </div>
                    <div>
                        <Select defaultValue={formValues.marcaNombre} error={""} isSearch options={brands?.map((item: IBrand) => ({ id: item?.id, value: `${item?.nombre}` }))} id="marcaId" name="marcaNombre" value="" onChange={handleChangeSelect} icon="clarity:box-plot-line" isIcon label="Laboratorio/Marca" withLabel />
                        {renderInlineCreate(creatingBrand, setCreatingBrand, newBrandName, setNewBrandName, savingBrand, handleCrearMarca, 'Nueva marca', 'Nombre de la marca')}
                    </div>
                </div>

                {/* Botones Selectores de Drawers */}
                <div className="flex flex-col gap-4">
                    <button type="button" onClick={() => setShowMedicamentoModal(true)} className="flex items-center justify-between p-4 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#1E2435] hover:border-blue-400 hover:shadow-md transition-all group text-left">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                <Icon icon="solar:pill-bold-duotone" width={20} />
                            </div>
                            <div>
                                <h4 className="text-sm font-bold text-gray-900 dark:text-white">Detalles del Medicamento</h4>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Principio activo, concentración...</p>
                            </div>
                        </div>
                        <Icon icon="solar:alt-arrow-right-linear" width={20} className="text-gray-400 dark:text-gray-500 group-hover:text-blue-600" />
                    </button>

                    <button type="button" onClick={() => setShowLotesModal(true)} className="flex items-center justify-between p-4 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#1E2435] hover:border-indigo-400 hover:shadow-md transition-all group text-left">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                <Icon icon="solar:box-minimalistic-bold-duotone" width={20} />
                            </div>
                            <div>
                                <h4 className="text-sm font-bold text-gray-900 dark:text-white">Gestión de Lotes</h4>
                                <p className="text-xs text-gray-500 dark:text-gray-400">{isEdit ? 'Historial y vencimientos' : 'Configurar lote inicial'}</p>
                            </div>
                        </div>
                        <Icon icon="solar:alt-arrow-right-linear" width={20} className="text-gray-400 dark:text-gray-500 group-hover:text-indigo-600" />
                    </button>
                </div>

                {/* Stock Global */}
                <div className="p-4 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-slate-800/30">
                    <h5 className="text-sm font-bold text-gray-900 dark:text-white mb-3 ml-1">Inventario General</h5>
                    <div className="flex flex-col gap-4">
                        <InputPro autocomplete="off" type="number" value={formValues?.stock} error={errors.stock} name="stock" onChange={handleChange} isLabel label="Stock Total" placeholder="0" />
                        <div className="flex gap-2">
                            <InputPro autocomplete="off" type="number" value={formValues?.stockMinimo ?? ''} name="stockMinimo" onChange={handleChange} isLabel label="Min." placeholder="5" />
                            <InputPro autocomplete="off" type="number" value={formValues?.stockMaximo ?? ''} name="stockMaximo" onChange={handleChange} isLabel label="Max." placeholder="100" />
                        </div>
                    </div>
                </div>

                {/* Precios */}
                <div className="grid grid-cols-1 gap-4">
                    <Select
                        defaultValue={formValues.afectacionNombre || "Gravado - Operación Onerosa"}
                        error=""
                        isSearch
                        options={afectaciones}
                        id="tipoAfectacionIGV"
                        name="afectacionNombre"
                        value=""
                        onChange={handleChangeSelect}
                        icon="clarity:box-plot-line"
                        isIcon
                        label="Tipo de afectación IGV"
                        withLabel
                    />
                    <InputPro autocomplete="off" type="number" step="0.01" value={formValues?.precioUnitario} error={errors.precioUnitario} name="precioUnitario" onChange={handleChange} handleOnBlur={handlePrecioUnitarioBlur} isLabel label="Precio Venta (S/)" />
                    <InputPro autocomplete="off" type="number" step="0.01" value={formValues?.costoUnitario || ''} name="costoUnitario" onChange={handleChange} isLabel label="Costo (S/)" placeholder="0.00" />
                    {productSections.localizacion && (
                        <InputPro autocomplete="off" value={(formValues as any)?.localizacion || ''} name="localizacion" onChange={handleChange} isLabel label="Ubicación / Localización" placeholder="Ej: Pasillo 3 - Estante B" />
                    )}
                    {productSections.ecommerce && fixedCostFields}
                </div>
            </div>
        );
    }

    // GENERAL AND RESTAURANTS LAYOUT
    return (
        <div className={`md:px-2 px-3 ${isRestaurante ? 'col-span-1' : 'col-span-2'} grid grid-cols-1 md:grid-cols-2 mt-5 gap-4 md:gap-5`}>
            {productSections.codigos && (
                <div className="col-span-1 md:col-span-1">
                    <InputPro
                        autocomplete="off"
                        value={(formValues as any)?.codigoBarras || ''}
                        name="codigoBarras"
                        onChange={handleChange}
                        isLabel
                        label="Código de Barras"
                        placeholder="EAN-13 / UPC"
                    />
                </div>
            )}

            {productSections.codigos && (
                <div className="col-span-1 md:col-span-2">
                    <div className="flex items-center justify-between mb-1">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Códigos de barra adicionales
                        </label>
                        <button
                            type="button"
                            onClick={addCodigoExtra}
                            className="text-[11px] flex items-center gap-1 px-2 py-1 rounded-full bg-violet-50 dark:bg-violet-900/30 text-violet-600 dark:text-violet-300 hover:bg-violet-100 dark:hover:bg-violet-900/50 transition-colors"
                        >
                            <Icon icon="mdi:plus" className="w-3.5 h-3.5" />
                            Agregar código
                        </button>
                    </div>
                    <p className="text-[11px] text-gray-400 dark:text-gray-500 mb-2 leading-snug">
                        Para el mismo producto que llega con distinto código de barras según el lote o la importación
                        (ej. perfumes sellados). Al escanear cualquiera de estos códigos aparece este mismo producto,
                        con el mismo precio y stock.
                    </p>
                    {codigosExtra.length === 0 ? (
                        <p className="text-[11px] italic text-gray-400 dark:text-gray-600">
                            Sin códigos adicionales. Usa “Agregar código” si un mismo perfume tiene varios EAN.
                        </p>
                    ) : (
                        <div className="flex flex-col gap-2">
                            {codigosExtra.map((codigo, i) => (
                                <div key={i} className="flex items-center gap-2">
                                    <div className="flex-1">
                                        <InputPro
                                            autocomplete="off"
                                            value={codigo}
                                            name={`codigoBarrasExtra-${i}`}
                                            onChange={(e: any) => updateCodigoExtra(i, e.target.value)}
                                            placeholder="EAN-13 / UPC del otro lote"
                                        />
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => removeCodigoExtra(i)}
                                        className="shrink-0 p-2 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                                        title="Quitar código"
                                    >
                                        <Icon icon="mdi:trash-can-outline" className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            <div className="col-span-1 md:col-span-1">
                <InputPro
                    autocomplete="off"
                    value={(formValues as any)?.codProdSunat || ''}
                    name="codProdSunat"
                    onChange={handleChange}
                    isLabel
                    label="Código de producto SUNAT"
                    placeholder="Requerido para detracción (ej. UNSPSC / cód. SUNAT)"
                />
            </div>

            <div className={`col-span-1 ${productSections.codigos ? 'md:col-span-1' : 'md:col-span-2'} relative`}>
                <div className="flex justify-between items-center mb-1">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{labels.nombre}</label>
                    <button
                        type="button"
                        onClick={handleAutoCategorize}
                        disabled={isCategorizing || !formValues.descripcion}
                        className={`text-[10px] flex items-center gap-1 px-2 py-0.5 rounded-full transition-colors ${!formValues.descripcion
                            ? 'text-gray-300 dark:text-gray-600 bg-gray-50 dark:bg-slate-800'
                            : 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 border border-indigo-200 dark:border-indigo-800'
                            }`}
                        title="Auto-detectar categoría y marca basada en el nombre"
                    >
                        <Icon icon={isCategorizing ? "mdi:loading" : "mdi:sparkles"} className={isCategorizing ? "animate-spin" : ""} />
                        {isCategorizing ? 'Analizando...' : 'Auto-Categorizar'}
                    </button>
                </div>
                <InputPro autocomplete="off" value={formValues?.descripcion} error={errors.descripcion} name="descripcion" onChange={handleChange} isLabel={false} />
            </div>

            <div className="col-span-1 md:col-span-1">
                <InputPro autocomplete="off" error={errors.codigo} value={formValues?.codigo} name="codigo" onChange={handleChange} isLabel label={labels.codigo} />
            </div>

            <div className="col-span-1 md:col-span-1">
                <Select defaultValue={afectaciones.find(a => a.id === String((formValues as any)?.tipoAfectacionIGV))?.value || "Gravado - Operación Onerosa"} error={""} isSearch options={afectaciones} id="tipoAfectacionIGV" name="afectacionNombre" value={afectaciones.find(a => a.id === String((formValues as any)?.tipoAfectacionIGV))?.value || "Gravado - Operación Onerosa"} onChange={handleChangeSelect} icon="clarity:box-plot-line" isIcon label="Tipo de afectación" />
            </div>

            <div className="col-span-1 md:col-span-1">
                <Select defaultValue={formValues?.unidadMedidaNombre} error={""} isSearch options={unitOfMeasure?.map((item: ICategory) => ({ id: item?.id, value: `${item?.nombre}` }))} id="unidadMedidaId" name="unidadMedidaNombre" value={formValues?.unidadMedidaNombre || ""} onChange={handleChangeSelect} icon="clarity:box-plot-line" isIcon label="Unidad de medida" />
            </div>
            <div className={`col-span-1 md:col-span-1 ${isRestaurante ? '' : 'flex gap-2'} w-full`}>
                <div className="w-full">
                    <Select defaultValue={formValues.categoriaNombre} error={""} isSearch options={categories?.map((item: ICategory) => ({ id: item?.id, value: `${item?.nombre}` }))} id="categoriaId" name="categoriaNombre" value={formValues?.categoriaNombre || ""} onChange={handleChangeSelect} icon="clarity:box-plot-line" isIcon label="Categoria" />
                    {renderInlineCreate(creatingCat, setCreatingCat, newCatName, setNewCatName, savingCat, handleCrearCategoria, 'Nueva categoría', 'Nombre de la categoría')}
                </div>
                {!isRestaurante && (
                    <div className="w-full">
                        <Select defaultValue={formValues.marcaNombre} error={""} isSearch options={brands?.map((item: IBrand) => ({ id: item?.id, value: `${item?.nombre}` }))} id="marcaId" name="marcaNombre" value={formValues?.marcaNombre || ""} onChange={handleChangeSelect} icon="clarity:box-plot-line" isIcon label="Marca" />
                        {renderInlineCreate(creatingBrand, setCreatingBrand, newBrandName, setNewBrandName, savingBrand, handleCrearMarca, 'Nueva marca', 'Nombre de la marca')}
                    </div>
                )}
            </div>



            {(vm.isModaRubro || vm.features?.usaVariantes) && <ProductVariantsManager vm={vm} />}

            {productSections.fichaComputo && (
                <div className="col-span-1 md:col-span-2 rounded-2xl border border-violet-100 bg-white p-3 dark:border-violet-900/40 dark:bg-slate-950/20">
                    <div className="mb-3 flex items-start gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-50 text-violet-600 dark:bg-violet-950/40 dark:text-violet-300">
                            <Icon icon="solar:layers-bold-duotone" width={18} />
                        </div>
                        <div>
                            <h5 className="text-sm font-black text-gray-900 dark:text-white">Tipo de ítem</h5>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Los servicios no manejan stock, lotes ni series.</p>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {[
                            { id: 'PRODUCTO', title: 'Producto físico', desc: 'Descuenta inventario y usa stock.' },
                            { id: 'SERVICIO', title: 'Servicio técnico', desc: 'Instalación, formateo, soporte.' },
                        ].map((option) => {
                            const active = option.id === 'SERVICIO' ? esServicio : !esServicio;
                            return (
                                <button
                                    key={option.id}
                                    type="button"
                                    onClick={() => setTipoProducto(option.id as 'PRODUCTO' | 'SERVICIO')}
                                    className={`rounded-xl border px-4 py-3 text-left transition-all ${active
                                        ? 'border-violet-300 bg-violet-50 text-violet-800 dark:border-violet-700 dark:bg-violet-950/30 dark:text-violet-200'
                                        : 'border-gray-200 bg-gray-50/70 text-gray-600 hover:bg-white dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-300'
                                        }`}
                                >
                                    <span className="flex items-center justify-between gap-3">
                                        <span>
                                            <span className="block text-sm font-black">{option.title}</span>
                                            <span className="block text-xs opacity-75">{option.desc}</span>
                                        </span>
                                        <Icon icon={active ? 'solar:check-circle-bold' : 'solar:circle-linear'} width={20} />
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {fichaTecnicaComputo}

            {isFabricacion && (
                <>
                    <div className="col-span-1 md:col-span-2 rounded-lg border border-blue-100 dark:border-blue-900/40 bg-blue-50/50 dark:bg-blue-950/20 p-3">
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <h5 className="text-sm font-semibold text-blue-800 dark:text-blue-300">Flujo de fabricación</h5>
                                <p className="text-xs text-blue-700/90 dark:text-blue-200/80 mt-1">
                                    Aquí solo registras el ítem y su stock. Luego configuras componentes y merma en Producción &gt; Recetas y Producción &gt; Órdenes.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowLotesModal(true)}
                                className="text-xs px-3 py-1.5 rounded-lg border border-blue-200 dark:border-blue-700 bg-white/90 dark:bg-slate-800 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-slate-700 transition-colors"
                            >
                                Gestionar lotes
                            </button>
                        </div>
                    </div>
                </>
            )}
            {productSections.localizacion && (
                <div className="col-span-1 md:col-span-2 mt-2">
                    <InputPro
                        autocomplete="off"
                        value={(formValues as any)?.localizacion || ''}
                        name="localizacion"
                        onChange={handleChange}
                        isLabel
                        label="Ubicación / Localización"
                        placeholder="Ej: Pasillo 3 - Estante B"
                    />
                </div>
            )}
            {!esServicio && productSections.lotes && (
                <div className="col-span-1 md:col-span-2">
                    <button type="button" onClick={() => setShowLotesModal(true)} className="w-full flex items-center justify-between p-4 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#1E2435] hover:border-indigo-400 hover:shadow-md transition-all group text-left">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                <Icon icon="solar:box-minimalistic-bold-duotone" width={20} />
                            </div>
                            <div>
                                <h4 className="text-sm font-bold text-gray-900 dark:text-white">Gestión de Lotes</h4>
                                <p className="text-xs text-gray-500 dark:text-gray-400">{isEdit ? 'Historial y vencimientos' : 'Configurar lote inicial'}</p>
                            </div>
                        </div>
                        <Icon icon="solar:alt-arrow-right-linear" width={20} className="text-gray-400 dark:text-gray-500 group-hover:text-indigo-600" />
                    </button>
                </div>
            )}

            {productSections.farmacia && esFarmaceutico && (
                <>
                    <div className="col-span-1 md:col-span-1">
                        <InputPro autocomplete="off" value={(formValues as any)?.principioActivo || ''} name="principioActivo" onChange={handleChange} isLabel label="Principio Activo" placeholder="Ej: Paracetamol" />
                    </div>
                    <div className="col-span-1 md:col-span-1">
                        <InputPro autocomplete="off" value={(formValues as any)?.laboratorio || ''} name="laboratorio" onChange={handleChange} isLabel label="Laboratorio" placeholder="Ej: Bayer" />
                    </div>
                    <div className="col-span-1 md:col-span-1">
                        <InputPro autocomplete="off" value={(formValues as any)?.concentracion || ''} name="concentracion" onChange={handleChange} isLabel label="Concentración" placeholder="Ej: 500mg" />
                    </div>
                    <div className="col-span-1 md:col-span-1">
                        <InputPro autocomplete="off" value={(formValues as any)?.presentacion || ''} name="presentacion" onChange={handleChange} isLabel label="Presentación" placeholder="Ej: Caja x 100 tabletas" />
                    </div>
                </>
            )}

            {/* Campos regulatorios para cualquier rubro farmacéutico (farmacia, botica, droguería) */}
            {productSections.farmacia && (
                <div className="col-span-1 md:col-span-2 border-t dark:border-slate-800 pt-4 mt-2">
                    <h5 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                        <Icon icon="solar:medical-kit-bold-duotone" width={16} className="text-violet-500" />
                        Regulatorio Farmacéutico
                    </h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-gray-100 dark:border-slate-800/60 pt-4">
                        <InputPro
                            autocomplete="off"
                            value={(formValues as any)?.codigoDigemid || ''}
                            name="codigoDigemid"
                            onChange={handleChange}
                            isLabel
                            label="Código DIGEMID"
                            placeholder="Ej: 1234567"
                        />
                        {/* requiereReceta: farmacia, botica y droguería */}
                        {esFarmaceutico && (
                            <label className="flex items-start gap-3 cursor-pointer group mt-1 md:mt-2">
                                <div className="relative mt-0.5 shrink-0">
                                    <input
                                        type="checkbox"
                                        name="requiereReceta"
                                        checked={Boolean((formValues as any)?.requiereReceta)}
                                        onChange={handleChange}
                                        className="sr-only peer"
                                    />
                                    <div className="w-10 h-5 bg-gray-200 dark:bg-slate-700 rounded-full peer-checked:bg-violet-600 transition-colors" />
                                    <div className="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform peer-checked:translate-x-5" />
                                </div>
                                <div>
                                    <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 leading-tight">Requiere Receta Médica</p>
                                    <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5 leading-tight">Bloquea venta en POS hasta ingresar Nº receta</p>
                                </div>
                            </label>
                        )}
                        <label className="flex items-start gap-3 cursor-pointer group mt-1 md:mt-2">
                            <div className="relative mt-0.5 shrink-0">
                                <input
                                    type="checkbox"
                                    name="controlado"
                                    checked={Boolean((formValues as any)?.controlado)}
                                    onChange={handleChange}
                                    className="sr-only peer"
                                />
                                <div className="w-10 h-5 bg-gray-200 dark:bg-slate-700 rounded-full peer-checked:bg-red-600 transition-colors" />
                                <div className="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform peer-checked:translate-x-5" />
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 leading-tight">Medicamento Controlado</p>
                                <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5 leading-tight">Requiere DNI paciente y nombre del médico</p>
                            </div>
                        </label>
                        <label className="flex items-start gap-3 cursor-pointer group mt-1 md:mt-2">
                            <div className="relative mt-0.5 shrink-0">
                                <input
                                    type="checkbox"
                                    name="refrigerado"
                                    checked={Boolean((formValues as any)?.refrigerado)}
                                    onChange={handleChange}
                                    className="sr-only peer"
                                />
                                <div className="w-10 h-5 bg-gray-200 dark:bg-slate-700 rounded-full peer-checked:bg-blue-500 transition-colors" />
                                <div className="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform peer-checked:translate-x-5" />
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 leading-tight">🧊 Cadena de Frío</p>
                                <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5 leading-tight">Muestra alerta en POS y en el carrito</p>
                            </div>
                        </label>
                    </div>
                </div>
            )}

            {productSections.fraccionamiento && (
                <div className="col-span-1 md:col-span-2 border-t dark:border-slate-800 pt-4 mt-4">
                    <h5 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                        <Icon icon="solar:box-minimalistic-bold-duotone" width={16} />
                        Unidades de Compra/Venta
                    </h5>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <InputPro autocomplete="off" value={(formValues as any)?.unidadCompra || ''} name="unidadCompra" onChange={handleChange} isLabel label="Unidad Compra" placeholder="CAJA" />
                        <InputPro autocomplete="off" value={(formValues as any)?.unidadVenta || ''} name="unidadVenta" onChange={handleChange} isLabel label="Unidad Venta" placeholder="BLISTER" />
                        <InputPro autocomplete="off" type="number" value={(formValues as any)?.factorConversion || 1} name="factorConversion" onChange={handleChange} isLabel label="Factor" placeholder="1" />
                    </div>
                </div>
            )}



            {productSections.ofertas && (
                <div className="col-span-1 md:col-span-2 border-t dark:border-slate-800 pt-4 mt-4">
                    <h5 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                        <Icon icon="solar:tag-price-bold-duotone" width={16} />
                        Ofertas y Promociones
                    </h5>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <InputPro autocomplete="off" type="number" step="0.01" value={(formValues as any)?.precioOferta || ''} name="precioOferta" onChange={handleChange} isLabel label="Precio Oferta (S/)" placeholder="0.00" />
                        <InputPro autocomplete="off" type="date" value={(formValues as any)?.fechaInicioOferta ? String((formValues as any).fechaInicioOferta).split('T')[0] : ''} name="fechaInicioOferta" onChange={handleChange} isLabel label="Inicio Oferta" />
                        <InputPro autocomplete="off" type="date" value={(formValues as any)?.fechaFinOferta ? String((formValues as any).fechaFinOferta).split('T')[0] : ''} name="fechaFinOferta" onChange={handleChange} isLabel label="Fin Oferta" />
                    </div>
                </div>
            )}

            {/* ── Tarjeta de precio inteligente y Resumen de Margen ── */}
            <div className="col-span-1 md:col-span-2 mt-2 grid grid-cols-1 xl:grid-cols-2 gap-4 items-stretch">
                <div className="w-full h-full flex">
                    {(() => {
                        const esGravado = !['20', '30'].includes((formValues as any).tipoAfectacionIGV ?? '10');
                        const igvPct = esGravado ? 0.18 : 0;
                        const precio = Number(formValues?.precioUnitario) || 0;

                        // precioUnitario siempre se guarda CON IGV — derivar neto desde ahí
                        const precioConIgv = precio;
                        const precioSinIgv = esGravado ? parseFloat((precio / 1.18).toFixed(2)) : precio;
                        const igvMonto = parseFloat((precioConIgv - precioSinIgv).toFixed(2));

                        // El costo se INGRESA con IGV, pero se guarda NETO (sin IGV) en costoUnitario.
                        // costo = neto almacenado; costoConIgv = bruto (lo que el usuario ve/teclea); costoIgvMonto = IGV del costo.
                        const costo = Number((formValues as any)?.costoUnitario) || 0;
                        const costoConIgv = esGravado ? parseFloat((costo * 1.18).toFixed(2)) : costo;
                        const costoIgvMonto = parseFloat((costoConIgv - costo).toFixed(2));

                        const handlePrecioChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
                            const num = parseFloat(e.target.value) || 0;
                            const conIgv = modoConIgv ? num : parseFloat((num * (1 + igvPct)).toFixed(2));
                            setFormValues({ ...formValues, precioUnitario: conIgv } as any);
                        };

                        return (
                            <div className="w-full flex flex-col justify-between rounded-xl border border-gray-100 dark:border-white/10 bg-gradient-to-br from-white to-gray-50/30 dark:from-slate-800/60 dark:to-slate-900/40 p-4 space-y-3">
                                <div>
                                    {/* Header con toggle */}
                                    <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                                        <div className="flex items-center gap-2">
                                            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                                                <Icon icon="solar:dollar-minimalistic-bold-duotone" className="text-white" width={14} />
                                            </div>
                                            <span className="text-sm font-bold text-gray-800 dark:text-white">Precio de Venta</span>
                                        </div>
                                        <div className="flex items-center gap-1 p-0.5 bg-gray-100 dark:bg-slate-700 rounded-lg">
                                            <button type="button" onClick={() => setModoConIgv(true)}
                                                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all ${modoConIgv ? 'bg-white dark:bg-slate-600 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'}`}>
                                                Con IGV
                                            </button>
                                            <button type="button" onClick={() => setModoConIgv(false)}
                                                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all ${!modoConIgv ? 'bg-white dark:bg-slate-600 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'}`}>
                                                Sin IGV
                                            </button>
                                        </div>
                                    </div>

                                    {/* Selector de moneda: soles (S/) o dólares ($) */}
                                    <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                                        <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400">Moneda del precio</span>
                                        <div className="flex items-center gap-1 p-0.5 bg-gray-100 dark:bg-slate-700 rounded-lg">
                                            <button type="button" onClick={() => setMoneda('PEN')}
                                                className={`px-3 py-1 rounded-md text-[11px] font-semibold transition-all ${moneda === 'PEN' ? 'bg-white dark:bg-slate-600 text-emerald-600 dark:text-emerald-400 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'}`}>
                                                S/ Soles
                                            </button>
                                            <button type="button" onClick={() => setMoneda('USD')}
                                                className={`px-3 py-1 rounded-md text-[11px] font-semibold transition-all ${moneda === 'USD' ? 'bg-white dark:bg-slate-600 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'}`}>
                                                $ Dólares
                                            </button>
                                        </div>
                                    </div>

                                    {/* Input precio */}
                                    <InputPro
                                        type="number"
                                        step="0.01"
                                        name="precioUnitario"
                                        placeholder="0.00"
                                        isLabel
                                        label={modoConIgv ? `Precio de venta con IGV (${simbolo})${esGravado ? '' : ' — ' + ((formValues as any).tipoAfectacionIGV === '20' ? 'Exonerado' : 'Inafecto')}` : `Precio neto sin IGV (${simbolo})`}
                                        value={modoConIgv ? (precio || '') : (precioSinIgv || '')}
                                        onChange={handlePrecioChange}
                                        handleOnBlur={handlePrecioUnitarioBlur}
                                        error={errors.precioUnitario}
                                    />

                                    {/* Referencia en soles cuando el precio está en dólares */}
                                    {moneda === 'USD' && (
                                        <div className="mt-2 flex items-start gap-1.5 rounded-lg bg-blue-50 dark:bg-blue-900/20 px-3 py-2">
                                            <Icon icon="solar:info-circle-bold" className="text-blue-500 mt-0.5 shrink-0" width={13} />
                                            <p className="text-[11px] leading-snug text-blue-700 dark:text-blue-300">
                                                Se facturará en <strong>soles</strong> al tipo de cambio del día.
                                                {tcVenta && precio > 0
                                                    ? ` Hoy ≈ S/ ${(precio * tcVenta).toFixed(2)} (TC venta S/ ${tcVenta.toFixed(3)}).`
                                                    : tcVenta
                                                        ? ` TC venta de hoy: S/ ${tcVenta.toFixed(3)}.`
                                                        : ''}
                                            </p>
                                        </div>
                                    )}

                                    {/* Desglose IGV */}
                                    {esGravado && precio > 0 && (
                                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-8">
                                            <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg px-3 py-2 text-center">
                                                <p className="text-[10px] text-gray-400 dark:text-gray-500 font-medium uppercase tracking-wide">Bruto</p>
                                                <p className="text-sm font-bold text-gray-700 dark:text-gray-200 mt-0.5">{simbolo} {precioSinIgv.toFixed(2)}</p>
                                            </div>
                                            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg px-3 py-2 text-center">
                                                <p className="text-[10px] text-blue-500 font-medium uppercase tracking-wide">IGV 18%</p>
                                                <p className="text-sm font-bold text-blue-600 dark:text-blue-400 mt-0.5">{simbolo} {igvMonto.toFixed(2)}</p>
                                            </div>
                                            <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg px-3 py-2 text-center">
                                                <p className="text-[10px] text-emerald-600 font-medium uppercase tracking-wide">Neto</p>
                                                <p className="text-sm font-bold text-emerald-700 dark:text-emerald-400 mt-0.5">{simbolo} {precioConIgv.toFixed(2)}</p>
                                            </div>
                                        </div>
                                    )}

                                    {/* Costo unitario */}
                                    {!isRestaurante && (
                                        <div className="mt-10">
                                            <InputPro
                                                type="number"
                                                step="0.01"
                                                name="costoUnitario"
                                                placeholder="0.00"
                                                isLabel
                                                label={`Costo de venta con IGV (${simbolo})${esGravado ? '' : ' — ' + ((formValues as any).tipoAfectacionIGV === '20' ? 'Exonerado' : 'Inafecto')}`}
                                                value={costoConIgvInput}
                                                onChange={(e) => {
                                                    const raw = e.target.value;
                                                    setCostoConIgvInput(raw);
                                                    const num = parseFloat(raw) || 0;
                                                    const neto = esGravado ? parseFloat((num / 1.18).toFixed(2)) : num;
                                                    setFormValues({ ...formValues, costoUnitario: neto } as any);
                                                }}
                                            />
                                            {/* Desglose IGV del costo (referenciado al costo de venta) */}
                                            {esGravado && costo > 0 && (
                                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-3">
                                                    <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg px-3 py-2 text-center">
                                                        <p className="text-[10px] text-gray-400 dark:text-gray-500 font-medium uppercase tracking-wide">Bruto</p>
                                                        <p className="text-sm font-bold text-gray-700 dark:text-gray-200 mt-0.5">{simbolo} {costo.toFixed(2)}</p>
                                                    </div>
                                                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg px-3 py-2 text-center">
                                                        <p className="text-[10px] text-blue-500 font-medium uppercase tracking-wide">IGV 18%</p>
                                                        <p className="text-sm font-bold text-blue-600 dark:text-blue-400 mt-0.5">{simbolo} {costoIgvMonto.toFixed(2)}</p>
                                                    </div>
                                                    <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg px-3 py-2 text-center">
                                                        <p className="text-[10px] text-emerald-600 font-medium uppercase tracking-wide">Neto</p>
                                                        <p className="text-sm font-bold text-emerald-700 dark:text-emerald-400 mt-0.5">{simbolo} {costoConIgv.toFixed(2)}</p>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })()}
                </div>
                <div className="w-full h-full">
                    <ProductFinancialAnalysis vm={vm} />
                </div>
            </div>

            {!esServicio && productSections.inventario && <ProductStockManager vm={vm} />}

            {!isRestaurante && productSections.analisisAvanzado && (
                <div className="col-span-1 md:col-span-2">
                    <div className={`rounded-2xl border transition-all duration-200 overflow-hidden ${advancedFinancialOpen ? 'border-indigo-200 dark:border-indigo-900/40' : 'border-gray-200 dark:border-white/10 hover:border-indigo-200 dark:hover:border-indigo-900/50 hover:shadow-sm'}`}>
                        <button
                            type="button"
                            onClick={() => setAdvancedFinancialOpen(o => !o)}
                            className="w-full flex items-center justify-between p-4 text-left group bg-white dark:bg-[#1E2435]"
                        >
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg transition-colors ${advancedFinancialOpen ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400' : 'bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-gray-400 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/30 group-hover:text-indigo-600 dark:group-hover:text-indigo-400'}`}>
                                    <Icon icon="solar:calculator-bold-duotone" width={20} />
                                </div>
                                <div>
                                    <h4 className="text-sm font-bold text-gray-900 dark:text-white">Análisis Financiero Avanzado</h4>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                        Simulador de rentabilidad diaria, comisiones y costos por venta.
                                    </p>
                                </div>
                            </div>
                            <Icon
                                icon="solar:alt-arrow-down-bold"
                                width={16}
                                className={`text-gray-400 dark:text-gray-500 transition-transform duration-200 ${advancedFinancialOpen ? 'rotate-180' : ''}`}
                            />
                        </button>
                        {advancedFinancialOpen && (
                            <div className="p-4 border-t border-indigo-100 dark:border-indigo-900/30 bg-indigo-50/20 dark:bg-indigo-950/5 space-y-4">
                                {fixedCostFields}

                                {/* ── Simulador de Rentabilidad Diaria ── */}
                                {(() => {
                                    const esGravado = !['20', '30'].includes((formValues as any).tipoAfectacionIGV ?? '10');
                                    const precio = Number(formValues?.precioUnitario) || 0;
                                    const precioNeto = esGravado ? precio / 1.18 : precio;
                                    const costo = Number((formValues as any)?.costoUnitario) || 0;
                                    const costoFijo = Number((formValues as any)?.costoFijo) || 0;
                                    const comision = Number((formValues as any)?.comisionPorVenta) || 0;

                                    const ventasDia = parseFloat(simVentasDia) || 0;
                                    const pubDia = parseFloat(simPublicidadDia) || 0;

                                    const gananciaXUnidad = precioNeto - costo - costoFijo - comision;
                                    const gananciaXDia = ventasDia > 0
                                        ? (gananciaXUnidad * ventasDia) - pubDia
                                        : null;
                                    const cpaDia = ventasDia > 0 ? pubDia / ventasDia : 0;
                                    const ganaXUnidadConAds = ventasDia > 0 ? gananciaXUnidad - cpaDia : null;

                                    const tieneBaseDatos = precioNeto > 0 && costo > 0;
                                    const gana = gananciaXDia !== null && gananciaXDia > 0;
                                    const empata = gananciaXDia !== null && gananciaXDia === 0;

                                    return (
                                        <div className="col-span-1 md:col-span-2">
                                            <div className="rounded-2xl border border-indigo-100 dark:border-indigo-900/40 bg-gradient-to-br from-indigo-50/60 to-violet-50/40 dark:from-indigo-950/20 dark:to-violet-950/10 p-5 space-y-4">
                                                {/* Header */}
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-sm">
                                                        <Icon icon="solar:chart-bold-duotone" className="text-white" width={18} />
                                                    </div>
                                                    <div>
                                                        <h5 className="text-sm font-bold text-gray-900 dark:text-white">Simulador de Rentabilidad Diaria</h5>
                                                        <p className="text-xs text-gray-500 dark:text-gray-400">¿Cuánto ganarías al día si vendes X unidades con Y de publicidad?</p>
                                                    </div>
                                                </div>

                                                {/* Inputs del simulador */}
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                    <div>
                                                        <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">
                                                            Unidades vendidas por día
                                                        </label>
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            step="1"
                                                            value={simVentasDia}
                                                            onChange={e => setSimVentasDia(e.target.value)}
                                                            placeholder="Ej: 10"
                                                            className="w-full px-3 py-2.5 rounded-xl border border-indigo-200 dark:border-indigo-800/60 bg-white dark:bg-slate-800 text-gray-900 dark:text-white text-sm font-semibold placeholder-gray-300 dark:placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:focus:ring-indigo-600"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">
                                                            Publicidad al día (S/)
                                                        </label>
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            step="0.01"
                                                            value={simPublicidadDia}
                                                            onChange={e => setSimPublicidadDia(e.target.value)}
                                                            placeholder="Ej: 100"
                                                            className="w-full px-3 py-2.5 rounded-xl border border-indigo-200 dark:border-indigo-800/60 bg-white dark:bg-slate-800 text-gray-900 dark:text-white text-sm font-semibold placeholder-gray-300 dark:placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:focus:ring-indigo-600"
                                                        />
                                                    </div>
                                                </div>

                                                {/* Resultado */}
                                                {!tieneBaseDatos && (
                                                    <div className="flex items-center gap-2 py-2.5 px-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-xl text-xs text-amber-700 dark:text-amber-400">
                                                        <Icon icon="mdi:alert-circle-outline" width={15} />
                                                        Ingresa el precio y costo del producto para activar el simulador.
                                                    </div>
                                                )}

                                                {tieneBaseDatos && gananciaXDia === null && (
                                                    <div className="bg-white/70 dark:bg-slate-800/60 rounded-xl p-4 space-y-2 border border-indigo-100 dark:border-indigo-900/40">
                                                        <p className="text-xs text-gray-400 dark:text-gray-500 font-medium uppercase tracking-wide mb-3">Desglose por unidad vendida</p>
                                                        <div className="space-y-1.5 text-sm">
                                                            {[
                                                                { label: 'Precio de venta (neto)', val: precioNeto, color: 'text-gray-700 dark:text-gray-200', sign: '' },
                                                                { label: 'Costo del producto', val: -costo, color: 'text-red-500', sign: '−' },
                                                                ...(costoFijo > 0 ? [{ label: 'Regalo / envío', val: -costoFijo, color: 'text-red-500', sign: '−' }] : []),
                                                                ...(comision > 0 ? [{ label: 'Comisión vendedor', val: -comision, color: 'text-red-500', sign: '−' }] : []),
                                                            ].map((r, i) => (
                                                                <div key={i} className="flex justify-between items-center">
                                                                    <span className="text-gray-500 dark:text-gray-400">{r.label}</span>
                                                                    <span className={`font-semibold ${r.color}`}>{r.sign} S/ {Math.abs(r.val).toFixed(2)}</span>
                                                                </div>
                                                            ))}
                                                            <div className="border-t border-indigo-100 dark:border-indigo-900/50 pt-2 flex justify-between items-center">
                                                                <span className="font-bold text-gray-700 dark:text-gray-200 text-sm">Ganancia sin ads</span>
                                                                <span className={`text-lg font-bold ${gananciaXUnidad >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>
                                                                    S/ {gananciaXUnidad.toFixed(2)}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <p className="text-[11px] text-indigo-400 dark:text-indigo-500 text-center pt-1">
                                                            Ingresa las unidades/día y publicidad para ver la proyección diaria
                                                        </p>
                                                    </div>
                                                )}

                                                {tieneBaseDatos && gananciaXDia !== null && (
                                                    <div className="space-y-3">
                                                        {/* Desglose diario */}
                                                        <div className="bg-white/70 dark:bg-slate-800/60 rounded-xl p-4 border border-indigo-100 dark:border-indigo-900/40">
                                                            <p className="text-xs text-gray-400 dark:text-gray-500 font-medium uppercase tracking-wide mb-3">Desglose diario ({ventasDia} unidades)</p>
                                                            <div className="space-y-1.5 text-sm">
                                                                {[
                                                                    { label: `Ingresos (${ventasDia} × S/${precioNeto.toFixed(2)})`, val: precioNeto * ventasDia, color: 'text-emerald-600 dark:text-emerald-400', sign: '' },
                                                                    { label: `Costo producto (${ventasDia} × S/${costo.toFixed(2)})`, val: -(costo * ventasDia), color: 'text-red-400', sign: '−' },
                                                                    ...(costoFijo > 0 ? [{ label: `Regalo/envío (${ventasDia} × S/${costoFijo.toFixed(2)})`, val: -(costoFijo * ventasDia), color: 'text-red-400', sign: '−' }] : []),
                                                                    ...(comision > 0 ? [{ label: `Comisión vendedor (${ventasDia} × S/${comision.toFixed(2)})`, val: -(comision * ventasDia), color: 'text-red-400', sign: '−' }] : []),
                                                                    ...(pubDia > 0 ? [{ label: 'Publicidad (TikTok / Meta)', val: -pubDia, color: 'text-amber-500', sign: '−' }] : []),
                                                                ].map((r, i) => (
                                                                    <div key={i} className="flex justify-between items-center">
                                                                        <span className="text-gray-500 dark:text-gray-400 text-xs">{r.label}</span>
                                                                        <span className={`font-semibold text-sm ${r.color}`}>{r.sign} S/ {Math.abs(r.val).toFixed(2)}</span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>

                                                        {/* Resultado grande */}
                                                        <div className={`rounded-xl p-4 text-center border-2 ${gana ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-700' : empata ? 'bg-gray-50 dark:bg-slate-800 border-gray-200 dark:border-slate-700' : 'bg-red-50 dark:bg-red-950/30 border-red-300 dark:border-red-700'}`}>
                                                            <p className={`text-xs font-bold uppercase tracking-widest mb-1 ${gana ? 'text-emerald-600 dark:text-emerald-400' : empata ? 'text-gray-500 dark:text-gray-400' : 'text-red-500'}`}>
                                                                {gana ? '¡Estás ganando!' : empata ? 'Punto de equilibrio' : 'Estás perdiendo dinero'}
                                                            </p>
                                                            <p className={`text-4xl font-black tracking-tight ${gana ? 'text-emerald-600 dark:text-emerald-400' : empata ? 'text-gray-600 dark:text-gray-300' : 'text-red-500'}`}>
                                                                {gana ? '+' : ''} S/ {gananciaXDia.toFixed(2)}
                                                            </p>
                                                            <p className={`text-xs mt-1 ${gana ? 'text-emerald-500' : empata ? 'text-gray-400 dark:text-gray-500' : 'text-red-400'}`}>
                                                                al día
                                                            </p>
                                                        </div>

                                                        {/* Info adicional: CPA y ganancia con ads */}
                                                        {pubDia > 0 && ventasDia > 0 && (
                                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                                <div className="bg-white/60 dark:bg-slate-800/50 rounded-xl p-3 text-center border border-indigo-100 dark:border-indigo-900/40">
                                                                    <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wide font-semibold">CPA (costo por venta)</p>
                                                                    <p className="text-base font-bold text-amber-600 dark:text-amber-400 mt-0.5">S/ {cpaDia.toFixed(2)}</p>
                                                                    <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">publicidad ÷ ventas</p>
                                                                </div>
                                                                <div className={`rounded-xl p-3 text-center border ${ganaXUnidadConAds !== null && ganaXUnidadConAds >= 0 ? 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900/40' : 'bg-red-50/60 dark:bg-red-950/20 border-red-100 dark:border-red-900/40'}`}>
                                                                    <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wide font-semibold">Ganancia por unidad</p>
                                                                    <p className={`text-base font-bold mt-0.5 ${ganaXUnidadConAds !== null && ganaXUnidadConAds >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>
                                                                        S/ {(ganaXUnidadConAds ?? 0).toFixed(2)}
                                                                    </p>
                                                                    <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">incluyendo publicidad</p>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })()}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {productSections.provisiones && (
                <div className="col-span-1 md:col-span-2 mb-4">
                    <div className={`rounded-2xl border transition-all duration-200 overflow-hidden ${provisionOpen ? 'border-gray-300 dark:border-slate-600' : 'border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-slate-600 hover:shadow-sm'}`}>
                        <button
                            type="button"
                            onClick={() => setProvisionOpen(o => !o)}
                            className="w-full flex items-center justify-between p-4 text-left group bg-white dark:bg-[#1E2435]"
                        >
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg transition-colors ${provisionOpen ? 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300' : 'bg-gray-50 dark:bg-slate-800 text-gray-500 dark:text-gray-400 group-hover:bg-gray-100 dark:group-hover:bg-slate-700 group-hover:text-gray-600 dark:group-hover:text-gray-300'}`}>
                                    <Icon icon="solar:box-minimalistic-bold-duotone" width={20} />
                                </div>
                                <div>
                                    <h4 className="text-sm font-bold text-gray-900 dark:text-white">Gestión de Provisiones</h4>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Define el máximo para despacho y reservas activas</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                                {Number((formValues as any)?.porcentajeProvision ?? 0) > 0 && (
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300">
                                        Activo
                                    </span>
                                )}
                                <div className={`p-1 rounded-full transition-colors ${provisionOpen ? 'bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-gray-300' : 'text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-300'}`}>
                                    <Icon icon="mdi:chevron-down" className={`transition-transform duration-300 ${provisionOpen ? 'rotate-180' : ''}`} width={20} />
                                </div>
                            </div>
                        </button>
                        <div className={`transition-all duration-300 ease-in-out ${provisionOpen ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'}`}>
                            <div className="p-4 border-t border-gray-100 dark:border-slate-800 bg-white dark:bg-[#1E2435]">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <p className="col-span-2 text-[11px] leading-4 text-gray-500 dark:text-gray-400">
                                        Venta define el máximo para despacho inmediato. Provisión define el máximo para reservas activas. Ambos porcentajes deben sumar 100%.
                                    </p>
                                    <InputPro
                                        autocomplete="off"
                                        type="number"
                                        value={(formValues as any)?.porcentajeVenta ?? 100}
                                        name="porcentajeVenta"
                                        onChange={handleChange}
                                        isLabel
                                        label="% Venta"
                                        placeholder="100"
                                    />
                                    <InputPro
                                        autocomplete="off"
                                        type="number"
                                        value={(formValues as any)?.porcentajeProvision ?? 0}
                                        name="porcentajeProvision"
                                        onChange={handleChange}
                                        isLabel
                                        label="% Provisión"
                                        placeholder="0"
                                    />

                                    {(() => {
                                        const stockBase = Number((formValues as any)?.stock ?? 0);
                                        const reservadoReal = Number((formValues as any)?.stockReservado ?? 0);
                                        const porcentajeProvision = Number((formValues as any)?.porcentajeProvision ?? 0);

                                        const cupoProvision = Math.max(0, Math.floor((stockBase * porcentajeProvision) / 100));
                                        const cupoVenta = Math.max(0, stockBase - cupoProvision);
                                        const provisionDisponible = Math.max(0, cupoProvision - reservadoReal);
                                        const ventaDisponible = Math.max(0, Math.min(stockBase - reservadoReal, cupoVenta));

                                        const statusColor =
                                            reservadoReal > cupoProvision
                                                ? 'text-red-600 dark:text-red-400'
                                                : 'text-emerald-600 dark:text-emerald-400';

                                        return (
                                            <div className="col-span-2 mt-1 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-slate-800 p-3">
                                                <div className="flex items-center gap-2 mb-3">
                                                    <Icon icon="solar:pie-chart-3-bold-duotone" className="text-gray-500 dark:text-gray-400" width={16} />
                                                    <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                                                        Distribución de stock
                                                    </span>
                                                </div>

                                                <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-slate-700 mt-2">
                                                    <table className="w-full text-left border-collapse">
                                                        <thead>
                                                            <tr className="bg-gray-50 dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                                                                <th className="px-3 py-2 font-semibold">Stock Base</th>
                                                                <th className="px-3 py-2 font-semibold">Cupo Venta</th>
                                                                <th className="px-3 py-2 font-semibold">Cupo Provisión</th>
                                                                <th className="px-3 py-2 font-semibold">Reservado Real</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            <tr className="text-sm font-bold text-gray-800 dark:text-gray-100 bg-white dark:bg-slate-900">
                                                                <td className="px-3 py-2">{stockBase}</td>
                                                                <td className="px-3 py-2">{cupoVenta}</td>
                                                                <td className="px-3 py-2">{cupoProvision}</td>
                                                                <td className={`px-3 py-2 ${statusColor}`}>{reservadoReal}</td>
                                                            </tr>
                                                        </tbody>
                                                    </table>
                                                </div>

                                                <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px]">
                                                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-gray-200 text-gray-700 dark:bg-slate-700 dark:text-gray-300">
                                                        Venta disponible: <strong>{ventaDisponible}</strong>
                                                    </span>
                                                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-gray-200 text-gray-700 dark:bg-slate-700 dark:text-gray-300">
                                                        Provisión disponible: <strong>{provisionDisponible}</strong>
                                                    </span>
                                                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-gray-400">
                                                        Provisión se redondea hacia abajo y las unidades restantes quedan disponibles para venta.
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })()}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {isRestaurante && gruposModificadores && gruposModificadores.length > 0 && (
                <div className="col-span-1 md:col-span-2 mt-4">
                    <div className="p-4 rounded-lg border border-gray-200 dark:border-white/10">
                        <h5 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                            <Icon icon="mdi:food-variant" width={16} height={16} />
                            Personalización del Plato
                        </h5>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                            Selecciona los grupos de modificadores que los clientes podrán elegir al pedir este plato (ej: cremas, acompañamientos, extras)
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {gruposModificadores.map((grupo: GrupoModificador) => (
                                <button
                                    key={grupo.id}
                                    type="button"
                                    onClick={() => toggleGrupoSeleccionado(grupo.id)}
                                    className={`p-3 rounded-lg border-2 transition-all text-left ${gruposSeleccionados.includes(grupo.id) ? 'border-[#6A6CFF] bg-[#6A6CFF]/5 dark:bg-[#6A6CFF]/10' : 'border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-slate-600'}`}
                                >
                                    <div className="flex items-start gap-2">
                                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center mt-0.5 transition-colors ${gruposSeleccionados.includes(grupo.id) ? 'border-[#6A6CFF] bg-[#6A6CFF]' : 'border-gray-300 dark:border-slate-600'}`}>
                                            {gruposSeleccionados.includes(grupo.id) && <Icon icon="mdi:check" className="text-white" width={12} height={12} />}
                                        </div>
                                        <div className="flex-1">
                                            <div className="font-medium text-sm text-gray-800 dark:text-gray-200">{grupo.nombre}</div>
                                            {grupo.descripcion && <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{grupo.descripcion}</div>}
                                            <div className="flex items-center gap-2 mt-1">
                                                {grupo.esObligatorio && <span className="text-[10px] px-1.5 py-0.5 bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded">Obligatorio</span>}
                                                <span className="text-[10px] text-gray-400 dark:text-gray-500">{grupo.opciones?.length || 0} opciones</span>
                                            </div>
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
