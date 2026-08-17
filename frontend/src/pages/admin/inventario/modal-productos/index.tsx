import { ChangeEvent, Dispatch, useEffect, useRef, useState } from "react"
import Modal from "@/components/Modal"
import Select from "@/components/Select"
import { ICategory } from "@/interfaces/categories"
import { IFormProduct } from "@/interfaces/products"
import { useCategoriesStore } from "@/zustand/categories"
import { IExtentionsState, useExtentionsStore } from "@/zustand/extentions"
import { IProductsState, useProductsStore } from "@/zustand/products"
import { useAuthStore } from "@/zustand/auth"
import InputPro from "@/components/InputPro"
import Button from "@/components/Button"
import { Icon } from "@iconify/react"
import { get, post } from "@/utils/fetch"

interface IPropsProducts {
    formValues: IFormProduct
    isOpenModal: boolean
    setErrors: any
    closeModal: any
    isEdit: boolean
    errors: any
    setFormValues: any
    setIsOpenModal: Dispatch<boolean>
    initialForm: IFormProduct
    isInvoice?: boolean
    setSelectProduct?: any
}

const afectaciones = [
    { id: "10", value: "Gravado - Operación Onerosa" },
    { id: "20", value: "Exonerado" },
    { id: "30", value: "Inafecto" },
    { id: "40", value: "Exportación" },
    { id: "15", value: "Gravado - Bonificación (gratuito)" },
    { id: "13", value: "Gravado - Retiro (gratuito)" },
    { id: "21", value: "Exonerado - Transferencia gratuita" },
    { id: "31", value: "Inafecto - Bonificación (gratuito)" },
    { id: "32", value: "Inafecto - Retiro (gratuito)" }
]

const ModalProduct = ({ setSelectProduct, isInvoice, initialForm, formValues, setErrors, isOpenModal, setFormValues, closeModal, isEdit, errors, setIsOpenModal }: IPropsProducts) => {

    const { getUnitOfMeasure }: IExtentionsState = useExtentionsStore();
    const { auth } = useAuthStore();
    const { getAllCategories } = useCategoriesStore();
    const { editProduct, addProduct, getCodeProduct, productCode }: IProductsState = useProductsStore();
    const { unitOfMeasure }: IExtentionsState = useExtentionsStore();
    const { categories } = useCategoriesStore();

    const [newWholesaleRow, setNewWholesaleRow] = useState({ cantidadMinima: '', precio: '' });
    // true = precio que ingresa el usuario YA incluye IGV (modo informal/pequeño negocio)
    // false = precio ingresado es NETO sin IGV (modo formal)
    const [modoConIgv, setModoConIgv] = useState(true);
    const [barcodeSearch, setBarcodeSearch] = useState('');
    const [searchingBarcode, setSearchingBarcode] = useState(false);
    const barcodeInputRef = useRef<HTMLInputElement>(null);

    const resolveBrand = async (brandRaw: string) => {
        const nombre = brandRaw.split(',')[0].trim();
        if (!nombre) return null;
        try {
            const resp: any = await post('marca/crear', { nombre });
            if (resp?.data?.id) return { marcaId: resp.data.id, marcaNombre: nombre };
        } catch { }
        return null;
    };

    const handleBarcodeSearch = async () => {
        const code = barcodeSearch.trim().replace(/\D/g, '');
        if (code.length < 8) return;
        setSearchingBarcode(true);
        try {
            let filled = false;

            // 1. Backend: local catalog lookup
            try {
                const resp: any = await get(`productos/barcode/${encodeURIComponent(code)}`);
                const product = resp?.data;
                if (product?.descripcion) {
                    setFormValues({
                        ...formValues,
                        descripcion: product.descripcion,
                        codigoBarras: code,
                        ...(product.imagenUrl ? { imagenUrl: product.imagenUrl } : {}),
                    });
                    filled = true;
                }
            } catch { }

            // 2. Open Food Facts fallback
            if (!filled) {
                const offResp = await fetch(`https://world.openfoodfacts.org/api/v2/product/${code}.json`);
                const offData = await offResp.json();
                if (offData?.status === 1 && offData?.product) {
                    const p = offData.product;
                    const imgUrl = p.image_front_url || p.image_url || null;
                    const brandData = p.brands ? await resolveBrand(p.brands) : null;
                    setFormValues({
                        ...formValues,
                        descripcion: p.product_name || p.product_name_es || p.generic_name || formValues.descripcion,
                        codigoBarras: code,
                        ...(imgUrl ? { imagenUrl: imgUrl } : {}),
                        ...(brandData ? { marcaId: brandData.marcaId, marcaNombre: brandData.marcaNombre } : {}),
                    });
                    filled = true;
                }
            }

            if (!filled) {
                setFormValues({ ...formValues, codigoBarras: code });
            }
        } finally {
            setSearchingBarcode(false);
        }
    };

    const validateForm = () => {
        const newErrors: any = {
            descripcion: formValues?.descripcion && formValues?.descripcion.trim() !== "" ? "" : "El nombre del producto es obligatorio",
            precioUnitario: formValues?.precioUnitario && Number(formValues?.precioUnitario) > 0 ? "" : "El producto debe tener un precio",
            stock: formValues?.stock && Number(formValues?.stock) > 0 ? "" : "El producto debe tener un stock"
        };
        setErrors(newErrors);
        return Object.values(newErrors).every((error) => !error);
    };

    const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormValues({
            ...formValues,
            [name]: value
        });
    };

    const handleChangeSelect = (idValue: any, value: any, name: any, id: any) => {
        setFormValues({
            ...formValues,
            [name]: value,
            [id]: idValue,
        });
    }

    useEffect(() => {
        getUnitOfMeasure();
        getAllCategories({});
    }, [])

    useEffect(() => {
        if (auth !== null) {
            getCodeProduct(auth?.empresaId)
        }
    }, [auth])

    const handleSubmitProduct = async () => {
        if (!validateForm()) {
            return;
        }
        if (Number(formValues?.productoId) !== 0 && isEdit) {
            editProduct({
                ...formValues,
                unidadMedidaId: Number(formValues?.unidadMedidaId),
                categoriaId: formValues?.categoriaId === "" ? null : Number(formValues?.categoriaId),
                precioUnitario: Number(formValues?.precioUnitario),
                stock: Number(formValues.stock),
            });
            setFormValues(initialForm)
            closeModal();
        } else {
            const product = await addProduct({
                ...formValues,
                unidadMedidaId: Number(formValues?.unidadMedidaId),
                categoriaId: formValues?.categoriaId === "" ? null : Number(formValues?.categoriaId),
                precioUnitario: Number(formValues?.precioUnitario),
                stock: Number(formValues.stock),
                estado: "ACTIVO"
            });
            setFormValues(initialForm)
            if (isInvoice) {
                setSelectProduct(product.data)
            }
            closeModal();
        }
    }

    useEffect(() => {
        if (!isEdit) {
            setFormValues({
                ...formValues,
                codigo: productCode
            })
        }
    }, [productCode])

    const wholesaleRules: { cantidadMinima: number; precio: number }[] = formValues.preciosMayorista || [];

    const handleAddWholesaleRow = () => {
        if (!newWholesaleRow.cantidadMinima || !newWholesaleRow.precio) return;
        setFormValues({
            ...formValues,
            preciosMayorista: [
                ...wholesaleRules,
                { cantidadMinima: Number(newWholesaleRow.cantidadMinima), precio: Number(newWholesaleRow.precio) }
            ]
        });
        setNewWholesaleRow({ cantidadMinima: '', precio: '' });
    };

    const handleRemoveWholesaleRow = (idx: number) => {
        setFormValues({
            ...formValues,
            preciosMayorista: wholesaleRules.filter((_, i) => i !== idx)
        });
    };

    return (
        <>
            {isOpenModal && <Modal width="750px" isOpenModal={isOpenModal} closeModal={closeModal} title={isEdit ? "Editar producto" : "Nuevo producto"}>

                {/* Barcode scanner */}
                <div className="md:px-6 px-3 mt-4">
                    <div className="flex items-end gap-2">
                        <div className="flex-1">
                            <InputPro
                                type="text"
                                name="barcodeSearch"
                                placeholder="EAN-13, UPC-A... auto-completa nombre e imagen"
                                isLabel
                                label="Código de barras"
                                value={barcodeSearch}
                                onChange={e => setBarcodeSearch(e.target.value.replace(/\D/g, '').slice(0, 14))}
                                onKeyDown={e => e.key === 'Enter' && void handleBarcodeSearch()}
                            />
                        </div>
                        <button
                            type="button"
                            onClick={() => void handleBarcodeSearch()}
                            disabled={searchingBarcode || barcodeSearch.length < 8}
                            className="h-10 px-4 flex items-center gap-1.5 rounded-xl btn-accent disabled:bg-gray-100 dark:disabled:bg-slate-700 disabled:cursor-not-allowed disabled:text-gray-400 text-sm font-semibold transition-all flex-shrink-0"
                        >
                            {searchingBarcode
                                ? <Icon icon="svg-spinners:ring-resize" width={15} />
                                : <Icon icon="solar:global-bold-duotone" width={15} />
                            }
                            <span className="hidden sm:inline">{searchingBarcode ? 'Buscando...' : 'Buscar'}</span>
                        </button>
                    </div>
                </div>

                {/* ── Sección de precios inteligente ── */}
                {(() => {
                    const esGravado = !['20', '30'].includes(formValues.tipoAfectacionIGV ?? '10');
                    const igvPct = esGravado ? 0.18 : 0;
                    const precio = Number(formValues.precioUnitario) || 0;
                    const costo = Number(formValues.costoPromedio) || 0;

                    // precioUnitario siempre se guarda CON IGV — derivar neto desde ahí
                    const precioConIgv = precio;
                    const precioSinIgv = esGravado ? parseFloat((precio / 1.18).toFixed(2)) : precio;
                    const igvMonto = parseFloat((precioConIgv - precioSinIgv).toFixed(2));

                    const margen = costo > 0 && precioSinIgv > 0
                        ? parseFloat(((precioSinIgv - costo) / costo * 100).toFixed(1))
                        : null;
                    const margenPositivo = margen !== null && margen >= 0;

                    const handlePrecioChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
                        const val = e.target.value;
                        const num = parseFloat(val) || 0;
                        if (modoConIgv) {
                            setFormValues({ ...formValues, precioUnitario: num });
                        } else {
                            // ingresa sin IGV → guardar el precio CON IGV en precioUnitario
                            const conIgv = parseFloat((num * (1 + igvPct)).toFixed(2));
                            setFormValues({ ...formValues, precioUnitario: conIgv });
                        }
                    };

                    return (
                        <div className="md:px-6 px-3 mt-4">
                            <div className="rounded-xl border border-gray-100 dark:border-transparent bg-gradient-to-br from-white to-gray-50/30 dark:from-slate-800/60 dark:to-slate-900/40 p-4 space-y-3">
                                {/* Header */}
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                                            <Icon icon="solar:dollar-minimalistic-bold-duotone" className="text-white" width={14} />
                                        </div>
                                        <span className="text-sm font-bold text-gray-800 dark:text-white">Precio de Venta</span>
                                    </div>
                                    {/* Toggle modo */}
                                    <div className="flex items-center gap-1 p-0.5 bg-gray-100 dark:bg-slate-700 rounded-lg">
                                        <button type="button"
                                            onClick={() => setModoConIgv(true)}
                                            className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all ${modoConIgv ? 'bg-white dark:bg-slate-600 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'}`}>
                                            Con IGV
                                        </button>
                                        <button type="button"
                                            onClick={() => setModoConIgv(false)}
                                            className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all ${!modoConIgv ? 'bg-white dark:bg-slate-600 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'}`}>
                                            Sin IGV
                                        </button>
                                    </div>
                                </div>

                                {/* Input principal */}
                                <InputPro
                                    type="number"
                                    step="0.01"
                                    name="precioUnitario"
                                    placeholder="0.00"
                                    isLabel
                                    label={modoConIgv
                                        ? `Precio de venta con IGV (S/)${!esGravado ? ' — ' + (formValues.tipoAfectacionIGV === '20' ? 'Exonerado' : 'Inafecto') : ''}`
                                        : 'Precio neto sin IGV (S/)'}
                                    value={modoConIgv ? (precio || '') : (precioSinIgv || '')}
                                    onChange={handlePrecioChange}
                                    error={errors.precioUnitario}
                                />

                                {/* Desglose IGV */}
                                {esGravado && precio > 0 && (
                                    <div className="grid grid-cols-3 gap-2">
                                        <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg px-3 py-2 text-center">
                                            <p className="text-[10px] text-gray-400 dark:text-gray-500 font-medium uppercase tracking-wide">Neto</p>
                                            <p className="text-sm font-bold text-gray-700 dark:text-gray-200 mt-0.5">S/ {precioSinIgv.toFixed(2)}</p>
                                        </div>
                                        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg px-3 py-2 text-center">
                                            <p className="text-[10px] text-blue-500 dark:text-blue-400 font-medium uppercase tracking-wide">IGV 18%</p>
                                            <p className="text-sm font-bold text-blue-600 dark:text-blue-400 mt-0.5">S/ {igvMonto.toFixed(2)}</p>
                                        </div>
                                        <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg px-3 py-2 text-center">
                                            <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium uppercase tracking-wide">Total</p>
                                            <p className="text-sm font-bold text-emerald-700 dark:text-emerald-400 mt-0.5">S/ {precioConIgv.toFixed(2)}</p>
                                        </div>
                                    </div>
                                )}

                                {/* Costo + margen */}
                                <div className="flex gap-3 items-end">
                                    <div className="flex-1">
                                        <InputPro
                                            type="number"
                                            step="0.01"
                                            name="costoPromedio"
                                            placeholder="0.00"
                                            isLabel
                                            label="Costo promedio S/ (neto sin IGV)"
                                            value={formValues.costoPromedio != null ? parseFloat(Number(formValues.costoPromedio).toFixed(2)) : ''}
                                            onChange={(e) => setFormValues({ ...formValues, costoPromedio: parseFloat(e.target.value) || 0 })}
                                        />
                                    </div>
                                    {margen !== null && (
                                        <div className={`px-3 py-2 rounded-xl text-center min-w-[80px] mb-0.5 ${margenPositivo ? 'bg-emerald-50 dark:bg-emerald-900/20' : 'bg-red-50 dark:bg-red-900/20'}`}>
                                            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Margen</p>
                                            <p className={`text-base font-bold mt-0.5 ${margenPositivo ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>
                                                {margenPositivo ? '+' : ''}{margen}%
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })()}

                <div className="md:px-6 px-3 grid md:grid-cols-2 grid-cols-2 mt-5 md:gap-5 gap-y-2">
                    <div className="col-span-3 md:col-span-1">
                        <InputPro autocomplete="off" error={errors.codigo} value={formValues?.codigo} name="codigo" onChange={handleChange} isLabel label="Codigo de producto" />
                    </div>
                    <div className="col-span-3 md:col-span-1">
                        <InputPro autocomplete="off" value={formValues?.descripcion} error={errors.descripcion} name="descripcion" onChange={handleChange} isLabel label="Nombre del producto" />
                    </div>
                    <div className="col-span-3 md:col-span-1">
                        <Select defaultValue={formValues.afectacionNombre || "Gravado - operación onerosa"} error={""} isSearch options={afectaciones} id="tipoAfectacionIGV" name="afectacionNombre" value="" onChange={handleChangeSelect} icon="clarity:box-plot-line" isIcon label="Tipo de afectación" />
                    </div>
                    <div className="col-span-3 md:col-span-1">
                        <InputPro autocomplete="off" value={formValues?.codProdSunat || ''} name="codProdSunat" onChange={handleChange} isLabel label="Código Producto SUNAT (UNSPSC · detracción)" />
                    </div>
                    <div className="col-span-3 md:col-span-1">
                        <Select defaultValue={formValues?.unidadMedidaNombre} error={""} isSearch options={unitOfMeasure?.map((item: ICategory) => ({
                            id: item?.id,
                            value: `${item?.nombre}`
                        }))} id="unidadMedidaId" name="unidadMedidaNombre" value="" onChange={handleChangeSelect} icon="clarity:box-plot-line" isIcon label="Unidad de medida" />
                    </div>
                    <div className="col-span-3 md:col-span-1">
                        <Select defaultValue={formValues.categoriaNombre} error={""} isSearch options={categories?.map((item: ICategory) => ({
                            id: item?.id,
                            value: `${item?.nombre}`
                        }))} id="categoriaId" name="categoriaNombre" value="" onChange={handleChangeSelect} icon="clarity:box-plot-line" isIcon label="Categoria" />
                    </div>
                    <div className="col-start-2 col-end-3 md:col-span-1">
                        <InputPro autocomplete="off" value={formValues?.stock} error={errors.stock} name="stock" onChange={handleChange} isLabel label="Stock" />
                    </div>
                </div>

                {/* Precios por Mayorista */}
                <div className="md:px-6 px-3 mt-6">
                    <div className="rounded-xl border border-gray-100 dark:border-transparent bg-gradient-to-br from-white to-gray-50/50 dark:from-slate-800/60 dark:to-slate-900/40 p-4">
                        {/* Header */}
                        <div className="flex items-center gap-2.5 mb-4">
                            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-400 to-green-600 flex items-center justify-center shadow-sm flex-shrink-0">
                                <Icon icon="solar:tag-price-bold-duotone" className="text-white" width={16} />
                            </div>
                            <div className="flex-1">
                                <h4 className="text-sm font-bold text-gray-900 dark:text-white leading-none">Precios por Mayorista</h4>
                                <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">Define rangos de precio según cantidad</p>
                            </div>
                            {wholesaleRules.length > 0 && (
                                <span className="text-[11px] font-semibold bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-0.5 rounded-full">
                                    {wholesaleRules.length} nivel{wholesaleRules.length > 1 ? 'es' : ''}
                                </span>
                            )}
                        </div>

                        {/* Tiers */}
                        {wholesaleRules.length > 0 ? (
                            <div className="space-y-1.5 mb-3">
                                {[...wholesaleRules].sort((a, b) => a.cantidadMinima - b.cantidadMinima).map((rule, idx) => {
                                    const baseP = Number(formValues.precioUnitario) || 0;
                                    const disc = baseP > 0 ? Math.round((1 - rule.precio / baseP) * 100) : 0;
                                    const originalIdx = wholesaleRules.findIndex(r => r.cantidadMinima === rule.cantidadMinima && r.precio === rule.precio);
                                    return (
                                        <div key={idx} className="flex items-center gap-3 px-3 py-2 rounded-xl bg-white dark:bg-slate-800/80 border border-gray-100 dark:border-slate-700/60 hover:border-green-200 dark:hover:border-green-800/60 transition-colors group">
                                            <div className="w-5 h-5 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center flex-shrink-0">
                                                <span className="text-[9px] font-bold text-green-700 dark:text-green-400">{idx + 1}</span>
                                            </div>
                                            <div className="flex-1 flex items-baseline gap-1.5">
                                                <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">{rule.cantidadMinima}+ u</span>
                                                <Icon icon="solar:arrow-right-linear" width={11} className="text-gray-400" />
                                                <span className="text-sm font-bold text-green-700 dark:text-green-400">S/ {Number(rule.precio).toFixed(2)}</span>
                                                {disc > 0 && baseP > 0 && (
                                                    <span className="text-[10px] text-green-500 font-medium">(-{disc}%)</span>
                                                )}
                                            </div>
                                            <button type="button" onClick={() => handleRemoveWholesaleRow(originalIdx)}
                                                className="opacity-0 group-hover:opacity-100 w-6 h-6 flex items-center justify-center rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all">
                                                <Icon icon="solar:trash-bin-2-linear" width={13} />
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="mb-3 py-4 flex flex-col items-center rounded-xl border border-dashed border-gray-200 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-800/20">
                                <Icon icon="solar:tag-price-linear" width={22} className="text-gray-300 dark:text-gray-600 mb-1" />
                                <p className="text-xs text-gray-400 dark:text-gray-500">Sin niveles configurados</p>
                            </div>
                        )}

                        <div className="flex gap-2 items-end">
                            {/* Cantidad mínima */}
                            <div className="flex-1">
                                <InputPro
                                    type="number"
                                    name="cantidadMinima"
                                    placeholder="Ej. 12"
                                    isLabel
                                    label="Cant. mínima"
                                    value={newWholesaleRow.cantidadMinima}
                                    onChange={e => setNewWholesaleRow({ ...newWholesaleRow, cantidadMinima: e.target.value })}
                                    onKeyDown={e => e.key === 'Enter' && handleAddWholesaleRow()}
                                />
                            </div>
                            {/* Precio */}
                            <div className="flex-1">
                                <div className="relative">
                                    <InputPro
                                        type="number"
                                        name="precio"
                                        placeholder="0.00"
                                        step="0.01"
                                        isLabel
                                        label="Precio (S/)"
                                        value={newWholesaleRow.precio}
                                        onChange={e => setNewWholesaleRow({ ...newWholesaleRow, precio: e.target.value })}
                                        onKeyDown={e => e.key === 'Enter' && handleAddWholesaleRow()}
                                    />
                                    {newWholesaleRow.precio && Number(formValues?.precioUnitario) > 0 && (() => {
                                        const disc = Math.round((1 - Number(newWholesaleRow.precio) / Number(formValues.precioUnitario)) * 100);
                                        return (
                                            <span className={`absolute right-2 top-1/2 translate-y-1 text-[10px] font-bold ${disc > 0 ? 'text-green-500' : 'text-red-400'}`}>
                                                {disc > 0 ? '-' : '+'}{Math.abs(disc)}%
                                            </span>
                                        );
                                    })()}
                                </div>
                            </div>
                            {/* Add button */}
                            <button
                                type="button"
                                onClick={handleAddWholesaleRow}
                                disabled={!newWholesaleRow.cantidadMinima || !newWholesaleRow.precio}
                                className="h-10 px-4 flex items-center gap-1 btn-accent disabled:bg-gray-100 dark:disabled:bg-slate-700 disabled:cursor-not-allowed disabled:text-gray-400 dark:disabled:text-gray-500 rounded-xl text-sm font-semibold transition-all flex-shrink-0"
                            >
                                <Icon icon="mdi:plus" width={16} />
                                <span className="hidden sm:inline">Agregar</span>
                            </button>
                        </div>
                    </div>

                </div>

                <div className="sticky bottom-0 z-10 flex gap-5 justify-end px-6 py-4 border-t border-gray-100 dark:border-slate-700/60 bg-white dark:bg-[#111827]">
                    <Button color="black" outline onClick={() => setIsOpenModal(false)}>Cancelar</Button>
                    <Button color="secondary" onClick={handleSubmitProduct}>{isEdit ? "Editar" : "Guardar"}</Button>
                </div>
            </Modal>
            }
        </>
    )
}

export default ModalProduct
