import { Icon } from "@iconify/react";
import { useEffect, useMemo, useRef, useState } from "react";
import Pagination from "@/components/Pagination";
import { BarcodeScannerInput } from "@/components/BarcodeScannerInput";
import apiClient from "@/utils/apiClient";
import ModalAnticipos from "./ModalAnticipos";

export const POSCatalogLayout = ({ vm, layout = 'CATALOGO' }: { vm: any; layout?: 'CATALOGO' | 'CAJA' }) => {
    const compacto = layout === 'CAJA';
    const [infoProduct, setInfoProduct] = useState<any | null>(null);
    const [brokenImages, setBrokenImages] = useState<Record<string, boolean>>({});
    // Subir/cambiar imagen del producto directo desde la card del POS
    const [uploadingId, setUploadingId] = useState<number | null>(null);
    const [uploadedImages, setUploadedImages] = useState<Record<number, string>>({});
    const fileInputRefs = useRef<Record<number, HTMLInputElement | null>>({});

    const handleImageUpload = async (productoId: number, file: File) => {
        setUploadingId(productoId);
        try {
            const form = new FormData();
            form.append('file', file);
            const { data } = await apiClient.post(`/productos/${productoId}/imagen`, form, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            const url = data?.data?.imagenUrl ?? data?.imagenUrl;
            if (url) {
                setUploadedImages(prev => ({ ...prev, [productoId]: url }));
                setBrokenImages(prev => { const n = { ...prev }; delete n[`PRODUCTO-${productoId}`]; return n; });
            }
        } catch {

        } finally {
            setUploadingId(null);
        }
    };
    const searchRef = useRef<HTMLInputElement | null>(null);

    // Captura de anticipos previos a descontar (solo facturas)
    const [showAnticipos, setShowAnticipos] = useState(false);
    const [anticipoForm, setAnticipoForm] = useState({ tipoDoc: '01', serie: '', numero: '', monto: '', fecha: '' });
    const handleAddAnticipo = () => {
        vm.agregarAnticipo({
            tipoDoc: anticipoForm.tipoDoc,
            serie: anticipoForm.serie,
            numero: anticipoForm.numero,
            monto: Number(anticipoForm.monto),
            fecha: anticipoForm.fecha || undefined,
        });
        setAnticipoForm({ tipoDoc: '01', serie: '', numero: '', monto: '', fecha: '' });
    };

    // Atajo "/" para enfocar la búsqueda (estilo POS), salvo si ya se escribe en un campo.
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key !== '/') return;
            const el = document.activeElement as HTMLElement | null;
            const tag = el?.tagName;
            if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el?.isContentEditable) return;
            e.preventDefault();
            searchRef.current?.focus();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, []);

    const getProvisionInfo = (item: any) => {
        const stockBase = Number(item?.stockBase ?? item?.stock ?? 0);
        const porcentajeProvision = Number(item?.porcentajeProvision ?? 0);
        const cupoProvision = Math.max(0, Math.floor((stockBase * porcentajeProvision) / 100));
        const reservadoActual = Number(item?.stockReservado ?? 0);
        const cupoVenta = Math.max(0, stockBase - cupoProvision);
        const disponibleVenta = Math.max(0, Math.min(stockBase - reservadoActual, cupoVenta));
        return { cupoProvision, reservadoActual, porcentajeProvision, cupoVenta, disponibleVenta };
    };
    const formatDate = (value: string | Date | null | undefined) => {
        if (!value) return null;
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return null;
        return date.toLocaleDateString("es-PE");
    };
    const lotesInfo = useMemo(() => {
        // El catálogo farmacia retorna lotesDisponibles; el catálogo general retorna lotes
        const raw: any[] = Array.isArray(infoProduct?.lotesDisponibles)
            ? infoProduct.lotesDisponibles
            : Array.isArray(infoProduct?.lotes)
                ? infoProduct.lotes
                : [];
        return raw.map((l: any) => ({
            lote: l?.loteNumero || l?.lote || "-",
            stock: Number(l?.stockActual ?? 0),
            costo: l?.costoUnitario !== null && l?.costoUnitario !== undefined ? Number(l.costoUnitario) : null,
            venc: formatDate(l?.fechaVencimiento),
            fechaOrden: l?.fechaVencimiento ? new Date(l.fechaVencimiento).getTime() : Number.MAX_SAFE_INTEGER,
        })).sort((a: any, b: any) => a.fechaOrden - b.fechaOrden);
    }, [infoProduct]);

    const getComboStock = (combo: any) => {
        const items = Array.isArray(combo?.items) ? combo.items : [];
        if (!items.length) return 0;

        const stockByItem = items.map((item: any) => {
            const stock = Number(item?.producto?.stock || 0);
            const qty = Number(item?.cantidad || 1);
            if (!Number.isFinite(stock) || !Number.isFinite(qty) || qty <= 0) return 0;
            return Math.floor(stock / qty);
        });

        return Math.max(0, Math.min(...stockByItem));
    };
    const esServicio = (item: any) => String(item?.atributosTecnicos?.tipoProducto || '').toUpperCase() === 'SERVICIO';
    const categoryFilter = useMemo(() => {
        const visibleCounts = new Map<number, number>();

        (vm.catalogItems || []).forEach((item: any) => {
            if (item?.__catalogType === 'COMBO') {
                const comboCategoryIds = new Set<number>(
                    (item?.items || [])
                        .map((comboItem: any) => Number(comboItem?.producto?.categoria?.id || comboItem?.producto?.categoriaId || 0))
                        .filter((id: number) => id > 0),
                );
                comboCategoryIds.forEach((id) => visibleCounts.set(id, (visibleCounts.get(id) || 0) + 1));
                return;
            }

            const categoryId = Number(item?.categoria?.id || item?.categoriaId || 0);
            if (categoryId > 0) visibleCounts.set(categoryId, (visibleCounts.get(categoryId) || 0) + 1);
        });

        const tabs = (Array.isArray(vm.categories) ? vm.categories : [])
            .map((category: any) => {
                const id = Number(category?.id || 0);
                const inventoryCount = Number(
                    category?._count?.productos
                    ?? category?.productosCount
                    ?? category?.totalProductos
                    ?? category?.cantidadProductos
                    ?? NaN,
                );
                const count = Number.isFinite(inventoryCount) ? inventoryCount : (visibleCounts.get(id) || 0);
                return { id, name: String(category?.nombre || 'Sin categoria'), count };
            })
            .filter((category: any) => category.id > 0 && (category.count > 0 || Number(vm.selectedCategoryId || 0) === category.id))
            .sort((a: any, b: any) => a.name.localeCompare(b.name, 'es'));

        const total = tabs.reduce((sum: number, category: any) => sum + Number(category.count || 0), 0) || Number(vm.totalProducts || vm.catalogItems?.length || 0);
        return { tabs, total };
    }, [vm.catalogItems, vm.categories, vm.selectedCategoryId, vm.totalProducts]);

    return (
        <>
        <div className={`w-full ${compacto ? 'md:w-[45%]' : 'md:w-[65%]'} flex flex-col gap-4 bg-white dark:bg-[#111827] rounded-[24px] shadow-gray-200/50 h-auto min-h-[500px] md:h-full overflow-hidden border border-white dark:border-transparent`}>
            {/* Header: Search & Categories */}
            <div className="p-4 md:p-5 border-b border-gray-100 dark:border-slate-800 bg-white dark:bg-[#111827]">
                <div className="flex gap-2 mb-3">
                    <div className="relative flex-1">
                        <input
                            ref={searchRef}
                            type="text"
                            placeholder="Buscar productos...  ( / )"
                            className="w-full pl-12 pr-4 py-3 bg-gray-50 dark:bg-slate-800 border-none rounded-xl focus:ring-2 focus:ring-violet-500/20 text-gray-700 dark:text-gray-200 outline-none transition-all placeholder-gray-400 dark:placeholder-gray-500 font-medium"
                            value={vm.searchTerm}
                            onChange={(e) => vm.setSearchTerm(e.target.value)}
                        />
                        <Icon icon="solar:magnifer-linear" className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 text-xl" />
                    </div>

                    <button
                        onClick={() => vm.setIsOpenModalProduct(true)}
                        className="flex items-center gap-2 px-4 py-3 btn-accent rounded-xl font-semibold shadow-md shadow-black/20 transition-all"
                        title="Crear producto nuevo"
                    >
                        <Icon icon="solar:add-circle-bold" className="text-xl" />
                        <span className="hidden md:inline">Producto</span>
                    </button>

                        <button
                            onClick={() => vm.setShowFreeQuoteItemForm((open: boolean) => !open)}
                            className="flex items-center gap-2 px-4 py-3 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 rounded-xl font-semibold shadow-md transition-all"
                            title="Añadir ítem sin registrar en inventario (libre)"
                        >
                            <Icon icon="solar:document-add-bold-duotone" className="text-xl" />
                            <span className="hidden md:inline">Ítem libre</span>
                        </button>
                </div>

                {/* Barcode scanner — auto-adds to cart on Enter */}
                <BarcodeScannerInput
                    className="mb-4"
                    inputRef={vm.barcodeRef}
                    value={vm.barcodeInput}
                    onChange={(e) => vm.setBarcodeInput(e.target.value)}
                    onScan={(val) => vm.handleBarcodeScan(val)}
                    loading={vm.barcodeLoading}
                    error={vm.barcodeError}
                />

                {vm.showFreeQuoteItemForm && (
                    <div className="mb-4 rounded-2xl border border-violet-100 dark:border-violet-900/40 bg-violet-50/70 dark:bg-violet-950/10 p-3">
                        <div className="flex flex-col gap-2">
                            {/* El nombre del ítem es el dato principal: fila propia a todo el ancho */}
                            <input
                                value={vm.freeQuoteItem.descripcion}
                                onChange={(e) => vm.setFreeQuoteItem((prev: any) => ({ ...prev, descripcion: e.target.value }))}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') vm.handleAddFreeQuoteItem();
                                }}
                                autoFocus
                                placeholder="Nombre del producto o servicio — Ej: Instalación de Windows, mantenimiento, producto a pedido..."
                                className="w-full px-4 py-3 rounded-xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 text-sm font-semibold text-gray-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-violet-300"
                            />
                            <div className="flex flex-col lg:flex-row gap-2">
                            <div className="flex rounded-xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 p-1">
                                {(['SERVICIO', 'PRODUCTO'] as const).map((tipo) => (
                                    <button
                                        key={tipo}
                                        type="button"
                                        onClick={() => vm.setFreeQuoteItem((prev: any) => ({ ...prev, tipo }))}
                                        className={`px-3 py-2 rounded-lg text-xs font-black transition-all ${vm.freeQuoteItem.tipo === tipo ? 'bg-violet-600 text-white shadow-sm' : 'text-gray-500 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800'}`}
                                    >
                                        {tipo === 'SERVICIO' ? 'Servicio' : 'Producto'}
                                    </button>
                                ))}
                            </div>
                            {/* Afectación IGV: permite emitir la línea sin IGV (anticipo export/exonerado) */}
                            <select
                                value={vm.freeQuoteItem.afectacion}
                                onChange={(e) => vm.setFreeQuoteItem((prev: any) => ({ ...prev, afectacion: e.target.value }))}
                                title="Afectación IGV de la línea"
                                className="px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 text-xs font-bold text-gray-700 dark:text-slate-100 outline-none focus:ring-2 focus:ring-violet-300"
                            >
                                <option value="10">Gravado (IGV)</option>
                                <option value="20">Exonerado</option>
                                <option value="30">Inafecto</option>
                                <option value="40">Exportación</option>
                                <optgroup label="Gratuito (transferencia gratuita)">
                                    <option value="15">Gravado – Bonificación</option>
                                    <option value="13">Gravado – Retiro</option>
                                    <option value="21">Exonerado – Transf. gratuita</option>
                                    <option value="31">Inafecto – Bonificación</option>
                                    <option value="32">Inafecto – Retiro</option>
                                </optgroup>
                            </select>
                            {/* Atajo: anticipo/adelanto del pedido como línea de servicio (exportación) */}
                            <button
                                type="button"
                                onClick={() => vm.setFreeQuoteItem((prev: any) => ({ ...prev, tipo: 'SERVICIO', descripcion: 'ADELANTO DEL PEDIDO', afectacion: '40' }))}
                                title="Rellenar como anticipo / adelanto del pedido"
                                className="px-3 py-2 rounded-xl bg-amber-100 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800/40 text-xs font-black text-amber-700 dark:text-amber-300 hover:bg-amber-200 dark:hover:bg-amber-900/50 transition-all whitespace-nowrap"
                            >
                                Anticipo
                            </button>
                            <div className="flex-1" />
                            <input
                                type="number"
                                min="0.001"
                                step="0.001"
                                value={vm.freeQuoteItem.cantidad}
                                onChange={(e) => vm.setFreeQuoteItem((prev: any) => ({ ...prev, cantidad: e.target.value }))}
                                placeholder="Cant."
                                className="w-full lg:w-24 px-4 py-3 rounded-xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 text-sm font-bold text-gray-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-violet-300"
                            />
                            <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={vm.freeQuoteItem.precioUnitario}
                                onChange={(e) => vm.setFreeQuoteItem((prev: any) => ({ ...prev, precioUnitario: e.target.value }))}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') vm.handleAddFreeQuoteItem();
                                }}
                                placeholder="P. Unit."
                                className="w-full lg:w-32 px-4 py-3 rounded-xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 text-sm font-bold text-gray-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-violet-300"
                            />
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={vm.handleAddFreeQuoteItem}
                                    className="px-5 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-black text-sm shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2"
                                >
                                    <Icon icon="solar:cart-plus-bold-duotone" className="text-lg" />
                                    Agregar
                                </button>
                                <button
                                    type="button"
                                    onClick={() => vm.setShowFreeQuoteItemForm(false)}
                                    className="px-4 py-3 rounded-xl bg-gray-200 dark:bg-slate-800 hover:bg-gray-300 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-300 font-bold text-sm transition-all flex items-center justify-center"
                                    title="Cerrar form"
                                >
                                    <Icon icon="solar:close-circle-bold-duotone" className="text-lg" />
                                </button>
                            </div>
                            </div>
                        </div>
                        <p className="mt-2 text-xs text-violet-700/80 dark:text-violet-300/80 font-semibold">
                            No se creará en inventario ni descontará stock; solo quedará como línea temporal para este comprobante.
                        </p>
                    </div>
                )}

                {/* ANTICIPOS a regularizar/descontar — solo Factura */}
                {vm.formValues?.comprobante === "FACTURA" && (
                    <div className="mb-4">
                        <button
                            type="button"
                            onClick={() => setShowAnticipos(true)}
                            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900/40 text-indigo-700 dark:text-indigo-300 font-bold text-sm transition-all hover:bg-indigo-100 dark:hover:bg-indigo-950/50"
                            title="Descontar anticipos previos en esta factura"
                        >
                            <Icon icon="solar:hand-money-bold-duotone" className="text-lg" />
                            Anticipos a descontar
                            {vm.anticipos?.length > 0 && (
                                <span className="ml-1 px-2 py-0.5 rounded-full bg-indigo-500 text-white text-xs font-black">
                                    {vm.anticipos.length} · {String(vm.formValues?.tipoMoneda === 'USD' || vm.quotationCurrency === 'USD' ? 'US$' : 'S/')} {Number(vm.totalAnticipos || 0).toFixed(2)}
                                </span>
                            )}
                        </button>

                        <ModalAnticipos
                            isOpen={showAnticipos}
                            onClose={() => setShowAnticipos(false)}
                            form={anticipoForm}
                            setForm={setAnticipoForm}
                            onAdd={handleAddAnticipo}
                            anticipos={vm.anticipos || []}
                            totalAnticipos={Number(vm.totalAnticipos || 0)}
                            currencySymbol={String(vm.formValues?.tipoMoneda === 'USD' || vm.quotationCurrency === 'USD' ? 'US$' : 'S/')}
                            onRemove={(i: number) => vm.eliminarAnticipo(i)}
                        />
                    </div>
                )}


                {/* Toggle rápido de precio por lote FEFO — solo rubros con lotes */}
                {vm.usaLotesFarmacia && (
                    <div className="mx-1 mb-3 flex items-center justify-between gap-3 rounded-2xl border border-violet-100 dark:border-violet-900/40 bg-violet-50/60 dark:bg-violet-950/10 px-4 py-2.5">
                        <div className="flex items-center gap-2 min-w-0">
                            <Icon icon="solar:tag-price-bold-duotone" className="text-violet-500 text-lg flex-shrink-0" />
                            <div className="min-w-0">
                                <p className="text-[13px] font-bold text-gray-800 dark:text-gray-100">Precio por lote (FEFO)</p>
                                <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
                                    {vm.usarPrecioLoteFefo ? 'El precio se toma del costo del lote que vence primero' : 'Se usa el precio de venta del producto'}
                                </p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={vm.togglePrecioLoteFefo}
                            disabled={vm.togglingPrecioLote}
                            aria-pressed={vm.usarPrecioLoteFefo}
                            className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors disabled:opacity-50 ${vm.usarPrecioLoteFefo ? 'bg-violet-600' : 'bg-gray-300 dark:bg-slate-600'}`}
                        >
                            <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${vm.usarPrecioLoteFefo ? 'translate-x-5' : 'translate-x-1'}`} />
                        </button>
                    </div>
                )}

                {categoryFilter.tabs.length > 0 && (
                    <div className="mt-4 -mx-1">
                        <div className="flex items-center gap-2 overflow-x-auto px-1 pb-1 scrollbar-thin">
                            {[
                                { id: 0, name: 'Todos', count: categoryFilter.total },
                                ...categoryFilter.tabs,
                            ].map((category: any) => {
                                const active = Number(vm.selectedCategoryId || 0) === category.id;
                                return (
                                    <button
                                        key={category.id}
                                        type="button"
                                        onClick={() => vm.setSelectedCategoryId(category.id)}
                                        className={`group inline-flex shrink-0 items-center gap-2 rounded-xl border px-3 py-2 text-xs font-black transition-all ${
                                            active
                                                ? 'border-violet-500 bg-violet-600 text-white shadow-lg shadow-violet-500/20'
                                                : 'border-gray-200 bg-white text-gray-600 hover:border-violet-200 hover:bg-violet-50 hover:text-violet-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-violet-800 dark:hover:bg-violet-950/30'
                                        }`}
                                    >
                                        <span className="max-w-[150px] truncate">{category.name}</span>
                                        <span className={`rounded-lg px-1.5 py-0.5 text-[10px] font-black ${
                                            active
                                                ? 'bg-white/20 text-white'
                                                : 'bg-gray-100 text-gray-500 group-hover:bg-violet-100 group-hover:text-violet-700 dark:bg-slate-800 dark:text-slate-400'
                                        }`}>
                                            {category.count}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>

            {/* Product Grid */}
            <div className="flex-1 overflow-y-auto p-3 md:p-4 scrollbar-thin">
                {compacto ? (
                <div className="flex flex-col gap-1.5">
                    {vm.catalogItems?.map((item: any, itemIndex: number) => {
                        const isExpired = vm.usaLotesFarmacia && item.__catalogType === 'PRODUCTO' && item?.loteFefo?.diasAlVencimiento !== undefined && item?.loteFefo?.diasAlVencimiento < 0;
                        const precio = item.__catalogType === 'COMBO'
                            ? Number(item.precioCombo)
                            : Number(item.precioUnitario);
                        const simbolo = String(item.moneda || 'PEN').toUpperCase() === 'USD' ? '$' : 'S/';
                        const stockTxt = esServicio(item) ? 'Servicio' : `Stock: ${item.__catalogType === 'COMBO' ? getComboStock(item) : (item.stock ?? 0)}`;
                        return (
                            <button
                                key={`c-${item.__catalogType}-${item.id}-${itemIndex}`}
                                type="button"
                                disabled={isExpired}
                                onClick={() => { if (isExpired) return; item.__catalogType === 'COMBO' ? vm.handleComboClick(item) : vm.handleProductClick(item); }}
                                className="group flex w-full items-center gap-3 rounded-xl border border-gray-100 bg-white px-3 py-2 text-left transition-all hover:border-violet-300 hover:bg-violet-50/40 active:scale-[0.99] disabled:opacity-50 dark:border-slate-800 dark:bg-[#1E2435] dark:hover:bg-slate-800"
                            >
                                <div className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-lg bg-gray-50 dark:bg-slate-800">
                                    {(uploadedImages[item.id] || item.imagenUrl) && !brokenImages[`${item.__catalogType}-${item.id}`] ? (
                                        <img src={uploadedImages[item.id] ?? item.imagenUrl} alt="" className="h-full w-full object-contain" loading="lazy" onError={() => setBrokenImages((prev) => ({ ...prev, [`${item.__catalogType}-${item.id}`]: true }))} />
                                    ) : (
                                        <Icon icon="solar:box-minimalistic-linear" className="text-lg text-gray-300 dark:text-slate-600" />
                                    )}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-[13px] font-bold uppercase text-gray-800 dark:text-gray-200">{item.__catalogType === 'COMBO' ? item.nombre : item.descripcion}</p>
                                    <p className="text-[11px] font-semibold text-gray-400">{stockTxt}{item.__catalogType === 'COMBO' ? ' · KIT' : ''}</p>
                                </div>
                                <span className="shrink-0 text-sm font-black text-gray-900 dark:text-white">{simbolo}{precio.toFixed(2)}</span>
                                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-violet-600 text-white shadow-sm transition group-hover:bg-violet-700">
                                    <Icon icon="solar:add-circle-bold" className="text-lg" />
                                </span>
                            </button>
                        );
                    })}
                </div>
                ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-5 gap-3 md:gap-4">
                    {vm.catalogItems?.map((item: any, itemIndex: number) => (
                        <div
                            key={`${item.__catalogType}-${item.id}-${itemIndex}`}
                            className="group bg-white dark:bg-[#1E2435] rounded-[20px] p-2 hover:shadow-xl transition-all duration-300 border border-gray-200 hover:border-violet-300 dark:border-transparent shadow-sm flex flex-col"
                            style={{ contentVisibility: 'auto', containIntrinsicSize: '0 280px' } as React.CSSProperties}
                        >
                            <div
                                className="aspect-[4/3] bg-white dark:bg-slate-800/50 rounded-xl mb-2 overflow-hidden relative flex items-center justify-center cursor-pointer hover:opacity-90 transition-opacity active:scale-95"
                                onClick={() => {
                                    const isExpired = vm.usaLotesFarmacia && item.__catalogType === 'PRODUCTO' && item?.loteFefo?.diasAlVencimiento !== undefined && item?.loteFefo?.diasAlVencimiento < 0;
                                    if (isExpired) return;
                                    item.__catalogType === 'COMBO' ? vm.handleComboClick(item) : vm.handleProductClick(item);
                                }}
                            >
                                {(uploadedImages[item.id] || item.imagenUrl) && !brokenImages[`${item.__catalogType}-${item.id}`] ? (
                                    <img
                                        src={uploadedImages[item.id] ?? item.imagenUrl}
                                        alt={item.descripcion || "Producto"}
                                        className="w-full h-full object-contain"
                                        loading="lazy"
                                        decoding="async"
                                        onError={() => setBrokenImages((prev) => ({ ...prev, [`${item.__catalogType}-${item.id}`]: true }))}
                                    />
                                ) : (
                                    <Icon icon="solar:box-minimalistic-linear" className="text-3xl text-gray-300 dark:text-slate-600" />
                                )}
                                {/* Overlay "Agregar" al hover — refuerza que la card es accionable */}
                                <div className="pointer-events-none absolute inset-0 hidden md:flex items-center justify-center bg-violet-600/0 opacity-0 group-hover:bg-violet-600/15 group-hover:opacity-100 transition-all duration-200">
                                    <span className="flex items-center gap-1 rounded-full bg-white/95 dark:bg-slate-900/90 px-3 py-1.5 text-xs font-black text-violet-700 dark:text-violet-300 shadow-lg">
                                        <Icon icon="solar:add-circle-bold" className="text-base" />
                                        Agregar
                                    </span>
                                </div>
                                {item.__catalogType === 'COMBO' && (
                                    <span className="absolute left-2 top-2 text-[10px] px-2 py-0.5 rounded-full bg-violet-600 text-white font-bold tracking-wide">
                                        KIT
                                    </span>
                                )}
                                {/* Farmacia: badge cadena de frío */}
                                {vm.usaLotesFarmacia && item.refrigerado && (
                                    <span className="absolute right-2 top-2 text-[10px] px-1.5 py-0.5 rounded-full bg-blue-500 text-white font-bold flex items-center gap-0.5">
                                        🧊
                                    </span>
                                )}
                                {/* Farmacia: badge vencimiento */}
                                {vm.usaLotesFarmacia && item.__catalogType === 'PRODUCTO' && (() => {
                                    const dias = item?.loteFefo?.diasAlVencimiento;
                                    if (dias === null || dias === undefined) return null;
                                    if (dias < 0) return (
                                        <span className="absolute left-2 bottom-2 text-[9px] px-1.5 py-0.5 rounded-full bg-red-600 text-white font-bold">
                                            🚫 Vencido
                                        </span>
                                    );
                                    if (dias <= 30) return (
                                        <span className="absolute left-2 bottom-2 text-[9px] px-1.5 py-0.5 rounded-full bg-amber-400 text-white font-bold">
                                            ⚠️ Vence en {dias}d
                                        </span>
                                    );
                                    return null;
                                })()}
                            </div>

                            <div className="flex-1 flex flex-col justify-between px-1">
                                <h4 className="font-bold text-gray-800 dark:text-gray-200 text-[13px] mb-2 line-clamp-2 leading-snug uppercase">
                                    {item.__catalogType === 'COMBO' ? item.nombre : item.descripcion}
                                </h4>

                                {/* Fraccionamiento: selector CAJA / UNIDAD */}
                                {vm.isFarmaciaRetail && item.__catalogType === 'PRODUCTO' && Number(item.factorConversion ?? 1) > 1 && (
                                    <div className="flex gap-1 mb-1.5">
                                        {(['CAJA', 'UNIDAD'] as const).map((modo) => {
                                            const activo = (vm.modoFraccionPorProducto[item.id] ?? 'CAJA') === modo;
                                            return (
                                                <button
                                                    key={modo}
                                                    onClick={(e) => { e.stopPropagation(); vm.setModoFraccionProducto(item.id, modo); }}
                                                    className={`flex-1 text-[10px] font-bold py-0.5 rounded-md transition-colors ${activo ? 'bg-violet-600 text-white' : 'bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-gray-400'}`}
                                                >
                                                    {modo === 'CAJA' ? (item.unidadCompra || 'CAJA') : (item.unidadVenta || 'UNIDAD')}
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}

                                <div>
                                    <p className="text-base font-black text-gray-900 dark:text-white leading-none mb-0.5">
                                        {(() => {
                                            if (item.__catalogType === 'COMBO') return `S/${Number(item.precioCombo).toFixed(2)}`;
                                            const factor = Number(item.factorConversion ?? 1);
                                            const modo = vm.modoFraccionPorProducto?.[item.id] ?? 'CAJA';
                                            const precio = Number(item.precioUnitario);
                                            const simbolo = String(item.moneda || 'PEN').toUpperCase() === 'USD' ? '$' : 'S/';
                                            return `${simbolo}${(vm.isFarmaciaRetail && factor > 1 && modo === 'UNIDAD' ? precio / factor : precio).toFixed(2)}`;
                                        })()}
                                    </p>
                                    <div className="text-[10px] leading-tight font-medium space-y-0.5">
                                        {(() => {
                                            const variantesActivas = Array.isArray(item?.variantes)
                                                ? item.variantes.filter((v: any) => String(v?.estado || 'ACTIVO').toUpperCase() === 'ACTIVO')
                                                : [];
                                            if (!esServicio(item) && variantesActivas.length > 0) {
                                                const stockVariantes = variantesActivas.reduce((s: number, v: any) => s + Number(v?.stock ?? 0), 0);
                                                return (
                                                    <p className="text-indigo-600 dark:text-indigo-400">
                                                        {variantesActivas.length} variantes · Stock: {stockVariantes}
                                                    </p>
                                                );
                                            }
                                            return (
                                                <p className={esServicio(item) ? "text-violet-600 dark:text-violet-400" : "text-emerald-600 dark:text-emerald-400"}>
                                                    {esServicio(item) ? "Servicio técnico" : `Disponible: ${item.__catalogType === 'COMBO' ? getComboStock(item) : (item.stock ?? 0)}`}
                                                </p>
                                            );
                                        })()}
                                    </div>

                                    {/* Acciones ocultas temporalmente: detalle, cámara y botón Agregar. */}
                                    <div className="mt-2 flex items-center gap-1.5">
                                        {/* <button
                                            onClick={(e) => { e.stopPropagation(); setInfoProduct(item); }}
                                            className="shrink-0 p-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-500 dark:text-slate-300 rounded-lg transition-all active:scale-95 flex items-center justify-center"
                                            title="Ver detalle"
                                            aria-label="Ver detalle"
                                        >
                                            <Icon icon="solar:info-circle-linear" className="text-lg" />
                                        </button> */}

                                        {/* {item.__catalogType === 'PRODUCTO' && (
                                            <>
                                                <input
                                                    ref={el => { fileInputRefs.current[item.id] = el; }}
                                                    type="file"
                                                    accept="image/*"
                                                    className="hidden"
                                                    onChange={e => {
                                                        const f = e.target.files?.[0];
                                                        if (f) handleImageUpload(item.id, f);
                                                        e.target.value = '';
                                                    }}
                                                />
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); fileInputRefs.current[item.id]?.click(); }}
                                                    disabled={uploadingId === item.id}
                                                    className="shrink-0 p-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-500 dark:text-slate-300 rounded-lg transition-all active:scale-95 flex items-center justify-center disabled:opacity-60 disabled:cursor-not-allowed"
                                                    title={(uploadedImages[item.id] || item.imagenUrl) ? "Cambiar imagen" : "Subir imagen"}
                                                >
                                                    {uploadingId === item.id
                                                        ? <Icon icon="eos-icons:loading" className="text-lg animate-spin" />
                                                        : <Icon icon={uploadedImages[item.id] || item.imagenUrl ? "solar:camera-rotate-bold-duotone" : "solar:camera-add-bold-duotone"} className="text-lg" />
                                                    }
                                                </button>
                                            </>
                                        )} */}

                                        {/* {(() => {
                                            const isExpired = vm.usaLotesFarmacia && item.__catalogType === 'PRODUCTO' && item?.loteFefo?.diasAlVencimiento !== undefined && item?.loteFefo?.diasAlVencimiento < 0;
                                            return (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        if (isExpired) return;
                                                        item.__catalogType === 'COMBO' ? vm.handleComboClick(item) : vm.handleProductClick(item);
                                                    }}
                                                    disabled={isExpired}
                                                    className="flex-1 flex items-center justify-center gap-1 px-2 py-2 rounded-lg bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs shadow-sm shadow-violet-500/20 transition-all active:scale-95 disabled:bg-gray-300 disabled:text-gray-500 disabled:shadow-none"
                                                    title={isExpired ? "Producto vencido" : "Agregar"}
                                                    aria-label="Agregar al comprobante"
                                                >
                                                    <Icon icon="solar:add-circle-bold" className="text-base" />
                                                    Agregar
                                                </button>
                                            );
                                        })()} */}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
                )}
                {!vm.catalogItems?.length && (
                    <div className="h-full flex flex-col items-center justify-center text-gray-400">
                        <Icon icon="solar:sad-square-linear" className="text-6xl mb-2 opacity-50" />
                        <p>No se encontraron productos ni kits</p>
                    </div>
                )}
            </div>

            <div className="px-4 py-2 border-t border-gray-100 dark:border-slate-800 bg-white dark:bg-[#111827]">
                <Pagination
                    data={vm.catalogItems}
                    optionSelect
                    currentPage={vm.page}
                    indexOfFirstItem={vm.indexOfFirstItem}
                    indexOfLastItem={vm.indexOfLastItem}
                    setcurrentPage={vm.setPage}
                    setitemsPerPage={vm.setLimit}
                    pages={vm.pages}
                    total={vm.totalProducts || 0}
                />
            </div>
        </div>
        {infoProduct && (
            <div className="fixed inset-0 z-[120] bg-black/50 backdrop-blur-[1px] flex items-center justify-center p-4">
                <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white dark:bg-[#111827] border border-gray-200 dark:border-transparent shadow-2xl">
                    <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-slate-700">
                        <h3 className="text-lg font-extrabold text-gray-900 dark:text-white">
                            {String(infoProduct.__catalogType === 'COMBO' ? infoProduct.nombre : infoProduct.descripcion || "").toUpperCase()}
                        </h3>
                        <button
                            onClick={() => setInfoProduct(null)}
                            className="p-1.5 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-slate-300 dark:hover:bg-slate-700"
                        >
                            <Icon icon="solar:close-circle-linear" className="text-2xl" />
                        </button>
                    </div>
                    <div className="p-5 space-y-4">
                        {infoProduct.__catalogType === 'COMBO' ? (
                            <>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                    <div className="rounded-xl bg-slate-50 dark:bg-slate-800 p-3">
                                        <p className="text-xs text-slate-500">Precio combo</p>
                                        <p className="text-lg font-bold text-slate-900 dark:text-white">S/{Number(infoProduct.precioCombo || 0).toFixed(2)}</p>
                                    </div>
                                    <div className="rounded-xl bg-emerald-50 dark:bg-emerald-900/20 p-3">
                                        <p className="text-xs text-emerald-700 dark:text-emerald-300">Precio regular</p>
                                        <p className="text-lg font-bold text-emerald-700 dark:text-emerald-300">S/{Number(infoProduct.precioRegular || 0).toFixed(2)}</p>
                                    </div>
                                    <div className="rounded-xl bg-violet-50 dark:bg-violet-900/20 p-3">
                                        <p className="text-xs text-violet-700 dark:text-violet-300">Ahorro</p>
                                        <p className="text-lg font-bold text-violet-700 dark:text-violet-300">-{Number(infoProduct.descuentoPorcentaje || 0).toFixed(1)}%</p>
                                    </div>
                                </div>
                                <div className="rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden">
                                    <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-800/70">
                                        <p className="text-sm font-bold text-slate-800 dark:text-slate-200">Componentes del kit</p>
                                    </div>
                                    <div className="divide-y divide-gray-100 dark:divide-slate-700">
                                        {(infoProduct?.items || []).map((kitItem: any, idx: number) => (
                                            <div key={`kit-item-${kitItem?.productoId}-${idx}`} className="px-4 py-3 flex items-center justify-between gap-3">
                                                <div>
                                                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{String(kitItem?.producto?.descripcion || "-").toUpperCase()}</p>
                                                    <p className="text-xs text-gray-500 dark:text-slate-400">Cantidad en kit: {Number(kitItem?.cantidad || 0)}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">Stock: {Number(kitItem?.producto?.stock || 0)}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                    <div className="rounded-xl bg-slate-50 dark:bg-slate-800 p-3">
                                        <p className="text-xs text-slate-500">Precio venta</p>
                                        <p className="text-lg font-bold text-slate-900 dark:text-white">S/{Number(infoProduct.precioUnitario || 0).toFixed(2)}</p>
                                    </div>
                                    <div className="rounded-xl bg-emerald-50 dark:bg-emerald-900/20 p-3">
                                        <p className="text-xs text-emerald-700 dark:text-emerald-300">Disponible venta</p>
                                        <p className="text-lg font-bold text-emerald-700 dark:text-emerald-300">{getProvisionInfo(infoProduct).disponibleVenta}</p>
                                    </div>
                                    <div className="rounded-xl bg-blue-50 dark:bg-blue-900/20 p-3">
                                        <p className="text-xs text-blue-700 dark:text-blue-300">Stock base</p>
                                        <p className="text-lg font-bold text-blue-700 dark:text-blue-300">{infoProduct.stockBase ?? infoProduct.stock ?? 0}</p>
                                    </div>
                                    <div className="rounded-xl bg-amber-50 dark:bg-amber-900/20 p-3">
                                        <p className="text-xs text-amber-700 dark:text-amber-300">Reservado actual</p>
                                        <p className="text-lg font-bold text-amber-700 dark:text-amber-300">{getProvisionInfo(infoProduct).reservadoActual}</p>
                                    </div>
                                    <div className="rounded-xl bg-purple-50 dark:bg-purple-900/20 p-3">
                                        <p className="text-xs text-purple-700 dark:text-purple-300">Cupo provisión ({getProvisionInfo(infoProduct).porcentajeProvision}%)</p>
                                        <p className="text-lg font-bold text-purple-700 dark:text-purple-300">{getProvisionInfo(infoProduct).cupoProvision}</p>
                                    </div>
                                    <div className="rounded-xl bg-cyan-50 dark:bg-cyan-900/20 p-3">
                                        <p className="text-xs text-cyan-700 dark:text-cyan-300">Cupo venta</p>
                                        <p className="text-lg font-bold text-cyan-700 dark:text-cyan-300">{getProvisionInfo(infoProduct).cupoVenta}</p>
                                    </div>
                                </div>

                                <div className="rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden">
                                    <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-800/70">
                                        <p className="text-sm font-bold text-slate-800 dark:text-slate-200">Lotes activos (FEFO primero)</p>
                                    </div>
                                    <div className="divide-y divide-gray-100 dark:divide-slate-700">
                                        {lotesInfo.length > 0 ? lotesInfo.map((l: any, i: number) => (
                                            <div key={`${l.lote}-${i}`} className="px-4 py-3 flex items-center justify-between gap-3">
                                                <div>
                                                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                                                        {l.lote} {i === 0 && <span className="ml-2 text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">FEFO ACTIVO</span>}
                                                    </p>
                                                    <p className="text-xs text-gray-500 dark:text-slate-400">Vence: {l.venc || "-"}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">Stock: {l.stock}</p>
                                                    <p className="text-xs text-gray-600 dark:text-amber-400">Costo lote: {l.costo !== null ? `S/${l.costo.toFixed(2)}` : "-"}</p>
                                                </div>
                                            </div>
                                        )) : infoProduct?.tieneLotesVencidos ? (
                                            <div className="px-4 py-5 text-sm font-semibold text-red-600 dark:text-red-400 flex items-start gap-2">
                                                <Icon icon="solar:danger-triangle-bold" className="text-base flex-shrink-0 mt-0.5" />
                                                <span>
                                                    Solo hay lotes VENCIDOS ({Number(infoProduct?.stockVencido ?? 0)} und). No se puede vender medicación vencida — registra un lote vigente en Kardex.
                                                </span>
                                            </div>
                                        ) : (
                                            <div className="px-4 py-5 text-sm text-gray-500 dark:text-slate-400">
                                                Este producto no tiene lotes activos con stock.
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>
        )}
        </>
    );
};
