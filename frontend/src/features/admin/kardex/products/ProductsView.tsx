import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarcodeScannerInput } from '@/components/BarcodeScannerInput';
import { Icon } from '@iconify/react';
import Select from '@/components/Select';
import ModalProduct from '@/pages/admin/kardex/modal-productos';
import ModalCategories from '@/pages/admin/kardex/modal-categorias';
import ModalMarcas from '@/pages/admin/kardex/modal-marcas';
import ModalCatalog from '@/features/admin/kardex/shared/ModalCatalog';
import ModalConfirm from '@/components/ModalConfirm';
import Pagination from '@/components/Pagination';
import CardRestaurante from '@/components/productos/CardRestaurante';
import ListaBodega from '@/components/productos/ListaBodega';
import TablaFerreteria from '@/components/productos/TablaFerreteria';
import TableActionMenu from '@/components/TableActionMenu';
import TableSkeleton from '@/components/Skeletons/table';
import { useProductsViewModel } from './useProductsViewModel';
import { get } from '@/utils/fetch';
import useAlertStore from '@/zustand/alert';
import ModalPreviewCatalogo from '../shared/ModalPreviewCatalogo';

const ACCENT = 'var(--accent, #7551FF)';
// Estilo unificado para los botones de acción del toolbar (Categorías, Marcas,
// Excel/CSV, Catálogo PDF): borde neutro + hover con tinte de acento, para que
// se sientan como un mismo grupo y sigan el color de la UI.
const TOOLBAR_BTN = 'h-10 px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 hover:text-[var(--accent)] hover:bg-[color-mix(in_srgb,var(--accent)_10%,transparent)] hover:border-[color-mix(in_srgb,var(--accent)_45%,transparent)]';

export default function ProductsView() {
    const navigate = useNavigate();
    const vm = useProductsViewModel();
    const { actions } = vm;
    const { alert } = useAlertStore();
    const productsSource = Array.isArray(vm.products) ? vm.products : [];

    // Editar ahora abre la página del formulario (no el modal), con el producto
    // completo en el state de navegación para precargar todos los campos.
    const goEditProduct = (p: any) => {
        const prod = productsSource.find((x: any) => x.id === p.id) || p;
        navigate(`/administrador/kardex/productos/editar/${p.id}`, { state: { product: prod } });
    };

    const [barcodeInput, setBarcodeInput] = useState('');
    const [barcodeLoading, setBarcodeLoading] = useState(false);
    const barcodeRef = useRef<HTMLInputElement>(null);

    const handleBarcodeScan = async (codigo: string) => {
        const trimmed = codigo.trim();
        if (!trimmed) return;
        setBarcodeLoading(true);
        try {
            const resp: any = await get(`productos/barcode/${encodeURIComponent(trimmed)}`);
            if (resp.code === 1 && resp.data?.multipleMatches) {
                // Prefijo (4+) coincide con varios: vuelca el prefijo en el buscador
                // para que el debounce liste todas las coincidencias y el usuario elija.
                actions.setSearchClient({ target: { value: trimmed } });
                alert(`Hay ${resp.data.count} productos cuyo código empieza con "${trimmed}". Se muestran en la lista.`, 'warning');
                setBarcodeInput('');
            } else if (resp.code === 1 && resp.data) {
                // Vuelca la descripción en el buscador existente → el debounce filtra la lista
                actions.setSearchClient({ target: { value: resp.data.descripcion } });
                setBarcodeInput('');
            } else {
                alert(`Producto no encontrado: ${trimmed}`, 'error');
                setBarcodeInput('');
            }
        } catch {
            alert(`Código de barras no encontrado: ${trimmed}`, 'error');
            setBarcodeInput('');
        } finally {
            setBarcodeLoading(false);
            barcodeRef.current?.focus();
        }
    };

    const [showOptionsDropdown, setShowOptionsDropdown] = useState(false);
    const [showFilterMenu, setShowFilterMenu] = useState(false);
    const [isOpenModalPreviewCatalogo, setIsOpenModalPreviewCatalogo] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const filterMenuRef = useRef<HTMLDivElement>(null);
    React.useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setShowOptionsDropdown(false);
            }
            if (filterMenuRef.current && !filterMenuRef.current.contains(event.target as Node)) {
                setShowFilterMenu(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const renderContent = () => {
        if (vm.vistaActual === 'cards' && vm.loading) {
            return (
                <CardRestaurante
                    loading
                    skeletonCount={vm.itemsPerPage > 0 ? Math.min(vm.itemsPerPage, 12) : 8}
                    products={[] as any}
                    onEdit={() => { }}
                    onDelete={() => { }}
                    onToggleState={() => { }}
                    onUploadImage={() => { }}
                />
            );
        }

        if (!vm.productsLoaded && productsSource.length === 0) return <TableSkeleton />;

        // Palette for category badges — picked deterministically from the category name
        const CAT_PALETTE = [
            { bg: '#EEF2FF', text: '#6366F1' },
            { bg: '#F0FDF4', text: '#16A34A' },
            { bg: '#FFF7ED', text: '#EA580C' },
            { bg: '#FDF4FF', text: '#A855F7' },
            { bg: '#F0F9FF', text: '#0284C7' },
            { bg: '#FFF1F2', text: '#E11D48' },
            { bg: '#FEFCE8', text: '#CA8A04' },
            { bg: '#F0FDFA', text: '#0D9488' },
            { bg: '#F5F3FF', text: '#7C3AED' },
            { bg: '#FFF8F1', text: '#C2410C' },
        ];
        const getCatColor = (name: string) => {
            let h = 0;
            for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
            return CAT_PALETTE[Math.abs(h) % CAT_PALETTE.length];
        };

        // Ordenamiento por stock (client-side, solo la lista mostrada de la tabla).
        // Los servicios (sin stock real) se envían al final en ambas direcciones.
        const tableSource = vm.stockSort
            ? [...productsSource].sort((a: any, b: any) => {
                const esServicioA = String(a?.atributosTecnicos?.tipoProducto || '').toUpperCase() === 'SERVICIO';
                const esServicioB = String(b?.atributosTecnicos?.tipoProducto || '').toUpperCase() === 'SERVICIO';
                if (esServicioA && !esServicioB) return 1;
                if (!esServicioA && esServicioB) return -1;
                const diff = Number(a?.stock || 0) - Number(b?.stock || 0);
                return vm.stockSort === 'asc' ? diff : -diff;
            })
            : productsSource;

        // Prepare table data for TablaFerreteria
        const productsTable = tableSource.map((item) => {
            const itemAny = item as any;
            const unidadNombre =
                item?.unidadMedida?.nombre ||
                (typeof itemAny?.unidadMedidaNombre === 'string' ? itemAny.unidadMedidaNombre : '') ||
                (typeof item?.unidadMedidaId !== 'undefined' ? 'Unidad' : '-') ||
                '-';
            const formatMoney = (value: number) => value.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            const costo = Number(item?.costoUnitario > 0 ? item?.costoUnitario : item?.costoPromedio || 0);
            const precio = Number(item?.precioUnitario || 0);
            const simbolo = String(itemAny?.moneda || 'PEN').toUpperCase() === 'USD' ? '$' : 'S/';
            const stock = Number(item?.stock || 0);
            const esServicio = String(itemAny?.atributosTecnicos?.tipoProducto || '').toUpperCase() === 'SERVICIO';
            const valorInventario = stock * costo;
            const margen = precio > 0 && costo > 0 ? ((precio - costo) / precio * 100) : 0;
            const gananciaUnidad = precio - costo;
            const imageSrc = (item as any)?.imagenUrlDisplay || (item as any)?.imagenUrl;

            const allData: any = {
                productoId: item?.id,
                'Img': imageSrc ? (
                    <div className="h-[43px] w-[43px] bg-white dark:bg-[#111c44]/60 border border-gray-200 dark:border-white/10 rounded-lg overflow-hidden flex items-center justify-center p-1">
                        <img
                            key={imageSrc}
                            src={imageSrc}
                            alt={item?.descripcion}
                            className="h-full w-full object-contain"
                            onError={(e) => {
                                const target = e.currentTarget;
                                target.onerror = null; // Prevent infinite loop
                                target.src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0Ij48cGF0aCBmaWxsPSIjOWNhM2FmIiBkPSJNMjEgMTlWMWMwLS41NS0uNDUtMS0xLTFIM2MtLjU1IDAtMSAuNDUtMSAxdjE4YzAgLjU1LjQ1IDEgMWgxN2MuNTUgMCAxLS40NSAxLTF6TTguNSAxMy41bDIuNSAzLjAxTDE0LjUgMTJsNC41IDZIM2w1LjUtNy41eiIvPjwvc3ZnPg==';
                                target.className = "h-6 w-6 object-contain opacity-50";
                            }}
                        />
                    </div>
                ) : (
                    <div className="h-11 w-11 bg-gray-50 dark:bg-[#111c44]/60 border border-gray-100 dark:border-white/10 rounded-lg flex items-center justify-center text-gray-400 dark:text-slate-500">
                        <Icon icon="solar:gallery-linear" width={24} height={24} />
                    </div>
                ),
                'Código': item?.codigo?.toUpperCase(),
                'Producto': (
                    <div className="flex flex-col max-w-[260px] min-w-0">
                        <span className="font-semibold text-gray-900 dark:text-white text-[13px] leading-tight uppercase truncate" title={item?.descripcion}>{item?.descripcion}</span>
                        <span className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5 uppercase">{item?.codigo}</span>
                        {item?.codigoBarras && (
                            <span className="text-[10px] text-violet-400 dark:text-violet-400 mt-0.5 font-mono tracking-wide">{item.codigoBarras}</span>
                        )}
                    </div>
                ),
                'Categoria': (() => {
                    const nombre = item?.categoria?.nombre || 'Sin categoría';
                    const c = getCatColor(nombre);
                    return (
                        <span
                            style={{ backgroundColor: c.bg, color: c.text }}
                            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap uppercase"
                        >
                            {nombre}
                        </span>
                    );
                })(),
                'Marca': ((item as any)?.marca?.nombre || 'Sin marca').toUpperCase(),
                categoriaId: item?.categoriaId !== null ? "" : item?.categoria?.id,
                unidadMedidaId: item?.unidadMedida?.id || item?.unidadMedidaId,
                marcaId: (item as any)?.marca?.id || (item as any)?.marcaId || null,
                marcaNombre: (item as any)?.marca?.nombre || "",
                'Precio Venta': `${simbolo} ${precio.toFixed(2)}`,
                'Costo': costo > 0 ? `${simbolo} ${costo.toFixed(2)}` : '-',
                'Valor Inventario': esServicio ? '-' : valorInventario > 0 ? `${simbolo} ${formatMoney(valorInventario)}` : '-',
                'Margen': margen > 0 ? `${margen.toFixed(1)}%` : '-',
                'Ganancia/Unidad': gananciaUnidad > 0 ? `${simbolo} ${gananciaUnidad.toFixed(2)}` : '-',
                'Stock': (
                    <span
                        style={{
                            backgroundColor: esServicio ? '#7C3AED' : stock <= 0 ? '#F43F5F' : stock <= 10 ? '#F49D0D' : '#0BB980',
                            color: '#ffffff',
                        }}
                        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold"
                    >
                        {esServicio ? 'Servicio' : stock}
                    </span>
                ),
                'Localización': item?.localizacion?.trim() ? item.localizacion.toUpperCase() : '-',
                '% Venta': `${Number((item as any)?.porcentajeVenta ?? 100)}%`,
                '% Provisión': `${Number((item as any)?.porcentajeProvision ?? 0)}%`,
                'Stock minimo': esServicio ? '-' : item?.stockMinimo ?? 0,
                'U.M': unidadNombre.toUpperCase(),
                'Lotes': (() => {
                    const lotes = Array.isArray(itemAny?.lotes) ? itemAny.lotes : [];
                    if (esServicio || lotes.length === 0) return <span className="text-gray-400 dark:text-gray-500">—</span>;
                    const prox = lotes[0];
                    const venc = new Date(prox.fechaVencimiento);
                    const dias = Math.ceil((venc.getTime() - Date.now()) / 86400000);
                    const color = dias < 0
                        ? { bg: '#FEE2E2', text: '#B91C1C' }
                        : dias <= 60
                            ? { bg: '#FEF3C7', text: '#B45309' }
                            : { bg: '#DCFCE7', text: '#15803D' };
                    const totalStock = lotes.reduce((s: number, l: any) => s + Number(l.stockActual || 0), 0);
                    return (
                        <div className="flex flex-col gap-0.5">
                            <span style={{ backgroundColor: color.bg, color: color.text }} className="inline-flex w-fit items-center px-2 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap">
                                {dias < 0 ? 'Vencido' : `Vence ${venc.toLocaleDateString('es-PE')}`}
                            </span>
                            <span className="text-[10px] text-gray-400 dark:text-gray-500">{lotes.length} lote{lotes.length > 1 ? 's' : ''} · {totalStock} und</span>
                        </div>
                    );
                })(),
                'Sede': (() => {
                    const cfg = (item as any).sedeStockConfig;
                    if (!cfg) return '-';
                    if (cfg.visibleEnSede === false) {
                        return (
                            <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 dark:bg-slate-700 px-2 py-0.5 text-[11px] font-semibold text-gray-500 dark:text-gray-400">
                                <Icon icon="mdi:eye-off-outline" width={12} /> Oculto
                            </span>
                        );
                    }
                    if (cfg.vendibleEnSede === false) {
                        return (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                                <Icon icon="mdi:archive-outline" width={12} /> Solo inventario
                            </span>
                        );
                    }
                    return (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                            <Icon icon="mdi:cash-register" width={12} /> Vendible
                        </span>
                    );
                })(),
                'Estado': item.estado,
                'Tienda': (item as any).publicarEnTienda ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400">
                        <Icon icon="mdi:store" width={12} /> Sí
                    </span>
                ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-gray-100 dark:bg-slate-700 text-gray-400 dark:text-gray-500">
                        <Icon icon="mdi:store-off" width={12} /> No
                    </span>
                ),
                _original: item
            };

            const acciones = (
                <div
                    className="relative inline-block"
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={(e) => e.stopPropagation()}
                >
                    <button
                        type="button"
                        onMouseDown={(e) => e.stopPropagation()}
                        onClick={(e) => {
                            e.stopPropagation();
                            if (vm.openAccionesId === item.id) {
                                actions.setOpenAccionesId(null);
                                actions.setAnchorEl(null);
                            } else {
                                actions.setOpenAccionesId(item.id);
                                actions.setAnchorEl(e.currentTarget);
                            }
                        }}
                        className="h-8 w-8 flex items-center justify-center rounded-full text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                    >
                        <Icon icon="mdi:dots-vertical" width={20} height={20} />
                    </button>
                </div>
            );

            return { ...allData, 'Acciones': acciones };
        });

        switch (vm.vistaActual) {
            case 'cards':
                return (
                    <>
                        <CardRestaurante
                            loading={vm.loading}
                            skeletonCount={vm.itemsPerPage > 0 ? Math.min(vm.itemsPerPage, 12) : 8}
                            products={productsSource}
                            onEdit={(p) => goEditProduct(p)}
                            onDelete={(p) => actions.handleOpenDelete({ ...p, productoId: p.id })}
                            onToggleState={(p) => actions.handleToggleClientState({ ...p, productoId: p.id })}
                            onUploadImage={(p) => { actions.setUploadTarget({ id: p.id, tipo: 'principal' }); vm.uploadImageRef.current?.click(); }}
                        />
                        <Pagination
                            data={productsSource}
                            optionSelect
                            currentPage={vm.currentPage}
                            indexOfFirstItem={vm.indexOfFirstItem}
                            indexOfLastItem={vm.indexOfLastItem}
                            setcurrentPage={actions.setcurrentPage}
                            setitemsPerPage={actions.setitemsPerPage}
                            pages={vm.pages}
                            total={vm.totalProducts}
                        />
                    </>
                );
            case 'lista':
                return (
                    <>
                        <ListaBodega
                            products={productsSource}
                            onEdit={(p) => goEditProduct(p)}
                            onDelete={(p) => actions.handleOpenDelete({ ...p, productoId: p.id })}
                            onToggleState={(p) => actions.handleToggleClientState({ ...p, productoId: p.id })}
                        />
                        <Pagination
                            data={productsSource}
                            optionSelect
                            currentPage={vm.currentPage}
                            indexOfFirstItem={vm.indexOfFirstItem}
                            indexOfLastItem={vm.indexOfLastItem}
                            setcurrentPage={actions.setcurrentPage}
                            setitemsPerPage={actions.setitemsPerPage}
                            pages={vm.pages}
                            total={vm.totalProducts}
                        />
                    </>
                );
            case 'tabla':
            default:
                return (
                    <TablaFerreteria
                        productsTable={productsTable}
                        productsLoaded={vm.productsLoaded}
                        visibleColumns={vm.safeVisibleColumns}
                        currentPage={vm.currentPage}
                        itemsPerPage={vm.itemsPerPage}
                        totalProducts={vm.totalProducts}
                        indexOfFirstItem={vm.indexOfFirstItem}
                        indexOfLastItem={vm.indexOfLastItem}
                        pages={vm.pages}
                        setcurrentPage={actions.setcurrentPage}
                        setitemsPerPage={actions.setitemsPerPage}
                        onSort={(key) => { if (key === 'Stock') actions.toggleStockSort(); }}
                        sortColumn={vm.stockSort ? 'Stock' : undefined}
                        sortDirection={vm.stockSort ?? undefined}
                    />
                );
        }
    };

    const renderMobileProducts = () => {
        if (vm.loading || (!vm.productsLoaded && productsSource.length === 0)) {
            return <TableSkeleton />;
        }

        if (productsSource.length === 0) {
            return (
                <div className="py-12 text-center">
                    <Icon icon="solar:box-linear" className="mx-auto mb-3 text-5xl text-gray-300 dark:text-slate-600" />
                    <p className="text-sm font-bold text-gray-500 dark:text-gray-400">No se encontraron productos</p>
                </div>
            );
        }

        return (
            <div className="space-y-3">
                {productsSource.map((item: any) => {
                    const imageSrc = item?.imagenUrlDisplay || item?.imagenUrl;
                    const stock = Number(item?.stock || 0);
                    const esServicio = String(item?.atributosTecnicos?.tipoProducto || '').toUpperCase() === 'SERVICIO';
                    const stockTone = esServicio
                        ? 'bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300'
                        : stock <= 0
                            ? 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300'
                            : stock <= 10
                                ? 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300'
                                : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300';

                    return (
                        <article key={item.id} className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-[#111c44]/70 dark:backdrop-blur-xl">
                            <div className="flex items-start gap-3">
                                <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-gray-100 bg-gray-50 p-1 dark:border-white/10 dark:bg-[#111c44]/60">
                                    {imageSrc ? (
                                        <img src={imageSrc} alt={item?.descripcion} className="h-full w-full object-contain" />
                                    ) : (
                                        <Icon icon="solar:gallery-linear" width={28} className="text-gray-300 dark:text-slate-600" />
                                    )}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="line-clamp-2 text-sm font-black uppercase leading-snug text-gray-900 dark:text-white">{item?.descripcion}</p>
                                    <p className="mt-1 text-[11px] font-mono text-gray-400 dark:text-gray-500">{item?.codigo || 'Sin código'}</p>
                                    <div className="mt-2 flex flex-wrap gap-2">
                                        <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-[10px] font-black uppercase text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-300">
                                            {item?.categoria?.nombre || 'Sin categoría'}
                                        </span>
                                        <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${stockTone}`}>
                                            {esServicio ? 'Servicio' : `${stock} stock`}
                                        </span>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        actions.setOpenAccionesId(item.id);
                                        actions.setAnchorEl(e.currentTarget);
                                    }}
                                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-gray-50 text-gray-700 dark:border-white/10 dark:bg-[#111c44]/60 dark:text-gray-200"
                                    aria-label="Acciones"
                                >
                                    <Icon icon="mdi:dots-vertical" width={20} height={20} />
                                </button>
                            </div>

                            <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                                <div className="rounded-xl bg-gray-50 p-3 dark:bg-[#111c44]/60">
                                    <p className="font-bold uppercase tracking-wide text-gray-400 dark:text-gray-500">Precio venta</p>
                                    <p className="mt-1 text-sm font-black text-gray-900 dark:text-white">{String((item as any)?.moneda || 'PEN').toUpperCase() === 'USD' ? '$' : 'S/'} {Number(item?.precioUnitario || 0).toFixed(2)}</p>
                                </div>
                                <div className="rounded-xl bg-gray-50 p-3 dark:bg-[#111c44]/60">
                                    <p className="font-bold uppercase tracking-wide text-gray-400 dark:text-gray-500">Costo</p>
                                    <p className="mt-1 text-sm font-black text-gray-900 dark:text-white">{String((item as any)?.moneda || 'PEN').toUpperCase() === 'USD' ? '$' : 'S/'} {Number(item?.costoUnitario || item?.costoPromedio || 0).toFixed(2)}</p>
                                </div>
                                <div className="rounded-xl bg-gray-50 p-3 dark:bg-[#111c44]/60">
                                    <p className="font-bold uppercase tracking-wide text-gray-400 dark:text-gray-500">Marca</p>
                                    <p className="mt-1 truncate font-bold text-gray-700 dark:text-gray-200">{item?.marca?.nombre || 'Sin marca'}</p>
                                </div>
                                <div className="rounded-xl bg-gray-50 p-3 dark:bg-[#111c44]/60">
                                    <p className="font-bold uppercase tracking-wide text-gray-400 dark:text-gray-500">Tienda</p>
                                    <p className={`mt-1 font-bold ${(item as any).publicarEnTienda ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-400 dark:text-gray-500'}`}>{(item as any).publicarEnTienda ? 'Publicado' : 'Oculto'}</p>
                                </div>
                            </div>
                        </article>
                    );
                })}

                <Pagination
                    data={productsSource}
                    optionSelect
                    currentPage={vm.currentPage}
                    indexOfFirstItem={vm.indexOfFirstItem}
                    indexOfLastItem={vm.indexOfLastItem}
                    setcurrentPage={actions.setcurrentPage}
                    setitemsPerPage={actions.setitemsPerPage}
                    pages={vm.pages}
                    total={vm.totalProducts}
                />
            </div>
        );
    };

    return (
        <div className="min-h-screen -m-5 p-5 bg-[#F7F8FB] dark:bg-[#0A0D14] font-jakarta">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm text-slate-400 dark:text-slate-500 mb-5">
                <Icon icon="solar:home-smile-linear" className="text-base" />
                <span>Panel</span>
                <Icon icon="solar:alt-arrow-right-linear" className="text-xs" />
                <span>Inventario</span>
                <Icon icon="solar:alt-arrow-right-linear" className="text-xs" />
                <span className="font-semibold" style={{ color: ACCENT }}>{vm.labels.titulo}</span>
            </div>

            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-5">
                <div className="min-w-0">
                    <h1 className="text-[22px] font-extrabold text-slate-800 dark:text-white tracking-tight truncate">{vm.labels.titulo}</h1>
                    <p className="text-sm text-slate-400 dark:text-slate-500 mt-0.5">Gestiona tu inventario de productos</p>
                </div>
                <div className="flex w-full sm:w-auto gap-3">
                    <button
                        type="button"
                        onClick={() => navigate('/administrador/kardex/productos/nuevo')}
                        className="h-11 w-full sm:w-auto px-4 rounded-2xl text-white text-sm font-bold flex items-center justify-center gap-1.5 shadow-lg shadow-violet-500/30 hover:brightness-105 transition-all shrink-0"
                        style={{ background: ACCENT }}
                    >
                        <Icon icon="solar:add-circle-bold" className="text-lg" />
                        {vm.labels.nuevoBtn}
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-[0_2px_20px_rgba(15,23,42,0.05)] dark:shadow-none relative z-0 overflow-hidden">
                <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-700">
                    <div className="space-y-3">
                        {/* Fila 1: título + búsqueda + filtro + orden · acciones a la derecha */}
                        <div className="flex flex-wrap items-center gap-2.5">
                            <h3 className="shrink-0 pr-1 text-base font-extrabold text-slate-800 dark:text-white">Productos</h3>
                            <div className="relative min-w-[200px] flex-1 sm:max-w-md">
                                <Icon icon="solar:magnifer-linear" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400 dark:text-gray-400" />
                                <input
                                    name="search"
                                    value={vm.searchClient}
                                    onChange={actions.setSearchClient}
                                    placeholder={vm.labels.buscar}
                                    className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-8 text-sm text-slate-700 outline-none transition-colors placeholder:text-slate-400 focus:border-[var(--accent)] dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder:text-gray-500"
                                />
                                {vm.searchClient && (
                                    <button type="button" onClick={() => actions.setSearchClient({ target: { value: '' } } as any)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500 dark:text-slate-600 dark:hover:text-slate-400">
                                        <Icon icon="solar:close-circle-bold" />
                                    </button>
                                )}
                            </div>
                            <div className="relative shrink-0" ref={filterMenuRef}>
                                <button
                                    type="button"
                                    onClick={() => setShowFilterMenu((v) => !v)}
                                    className={`h-10 rounded-xl border px-3.5 text-sm font-semibold flex items-center gap-1.5 transition-colors ${vm.soloStockBajo ? 'border-transparent text-white' : 'border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700'}`}
                                    style={vm.soloStockBajo ? { background: ACCENT } : undefined}
                                >
                                    <Icon icon="solar:filter-linear" /> Filtro
                                    {vm.soloStockBajo && <span className="ml-0.5 h-4 min-w-4 px-1 grid place-items-center rounded-full bg-white/25 text-[10px] font-bold">1</span>}
                                    <Icon icon={showFilterMenu ? 'solar:alt-arrow-up-linear' : 'solar:alt-arrow-down-linear'} className="text-xs opacity-70" />
                                </button>
                                {showFilterMenu && (
                                    <div className="absolute left-0 z-50 mt-2 w-56 rounded-2xl border border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-xl dark:shadow-none p-1.5">
                                        <p className="px-3 pt-1.5 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-gray-500">Stock</p>
                                        {[
                                            { key: false, label: 'Todos los productos', icon: 'solar:widget-2-linear' },
                                            { key: true, label: 'Solo stock bajo', icon: 'solar:box-minimalistic-linear' },
                                        ].map((opt) => {
                                            const active = vm.soloStockBajo === opt.key;
                                            return (
                                                <button
                                                    key={String(opt.key)}
                                                    type="button"
                                                    onClick={() => { actions.setSoloStockBajo(opt.key); setShowFilterMenu(false); }}
                                                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${active ? 'bg-slate-50 text-slate-800 dark:bg-slate-700/60 dark:text-white' : 'text-slate-600 hover:bg-slate-50 dark:text-gray-300 dark:hover:bg-slate-700'}`}
                                                >
                                                    <Icon icon={opt.icon} className="text-base text-slate-400 dark:text-gray-400" />
                                                    <span className="flex-1 text-left">{opt.label}</span>
                                                    {active && <Icon icon="solar:check-circle-bold" style={{ color: ACCENT }} />}
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                            <button
                                type="button"
                                onClick={() => actions.toggleStockSort()}
                                className={TOOLBAR_BTN}
                            >
                                <Icon icon="solar:sort-vertical-linear" /> {vm.stockSort === 'asc' ? 'Stock ↑' : vm.stockSort === 'desc' ? 'Stock ↓' : 'Ordenar'}
                            </button>
                            <div className="ml-auto flex items-center gap-2 overflow-x-auto pb-1 lg:pb-0 lg:flex-wrap lg:overflow-visible [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                                <button type="button" onClick={() => actions.setIsOpenModalCategory(true)} className={TOOLBAR_BTN}>
                                    <Icon icon="solar:tag-bold-duotone" style={{ color: ACCENT }} /> Categorías
                                </button>
                                <button type="button" onClick={() => actions.setIsOpenModalBrands(true)} className={TOOLBAR_BTN}>
                                    <Icon icon="solar:star-bold-duotone" style={{ color: ACCENT }} /> Marcas
                                </button>
                                <div className="relative inline-block shrink-0" ref={dropdownRef}>
                                    <button
                                        type="button"
                                        onClick={() => setShowOptionsDropdown(!showOptionsDropdown)}
                                        className={TOOLBAR_BTN}
                                    >
                                        <Icon icon="solar:file-bold-duotone" style={{ color: ACCENT }} width={16} />
                                        Excel / CSV
                                        <Icon icon={showOptionsDropdown ? "solar:alt-arrow-up-linear" : "solar:alt-arrow-down-linear"} className="text-slate-400 dark:text-slate-500" width={14} />
                                    </button>

                                    {showOptionsDropdown && (
                                        <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl shadow-xl dark:shadow-none z-50 overflow-hidden py-1.5 font-inter">
                                            <input
                                                type="file"
                                                accept=".xlsx, .xls"
                                                ref={vm.fileInputRef}
                                                onChange={(e) => {
                                                    actions.handleImportExcel(e);
                                                    setShowOptionsDropdown(false);
                                                }}
                                                className="hidden"
                                            />
                                            <button
                                                onClick={() => { actions.exportProducts(); setShowOptionsDropdown(false); }}
                                                className="w-full flex items-center px-4 py-2.5 text-[13px] font-medium text-slate-600 dark:text-slate-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors"
                                            >
                                                <Icon icon="solar:export-bold" className="mr-2 text-emerald-500" width={18} />
                                                Exportar Productos
                                            </button>
                                            <button
                                                onClick={() => { vm.fileInputRef.current?.click(); }}
                                                className="w-full flex items-center px-4 py-2.5 text-[13px] font-medium text-slate-600 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-700 dark:hover:text-blue-400 transition-colors"
                                            >
                                                <Icon icon="solar:import-bold" className="mr-2 text-blue-500" width={18} />
                                                Importar desde Excel
                                            </button>
                                            <div className="mx-4 my-1 border-t border-slate-100 dark:border-slate-700"></div>
                                            <button
                                                onClick={async () => {
                                                    setShowOptionsDropdown(false);
                                                    const baseUrl = (import.meta.env.VITE_API_URL as string) || '';
                                                    const resp = await fetch(`${baseUrl}/productos/plantilla`, {
                                                        headers: { Authorization: `Bearer ${localStorage.getItem('ACCESS_TOKEN')}` },
                                                    });
                                                    const blob = await resp.blob();
                                                    const url = URL.createObjectURL(blob);
                                                    const a = document.createElement('a');
                                                    a.href = url;
                                                    a.download = 'plantilla_productos.xlsx';
                                                    a.click();
                                                    URL.revokeObjectURL(url);
                                                }}
                                                className="w-full flex items-center px-4 py-2.5 text-[13px] font-medium text-slate-600 dark:text-slate-300 hover:bg-amber-50 dark:hover:bg-amber-900/20 hover:text-amber-700 dark:hover:text-amber-400 transition-colors"
                                            >
                                                <Icon icon="solar:file-download-bold" className="mr-2 text-amber-500" width={18} />
                                                Descargar Modelo (Guía)
                                            </button>
                                        </div>
                                    )}
                                </div>
                                <button type="button" onClick={() => setIsOpenModalPreviewCatalogo(true)} className={TOOLBAR_BTN}>
                                    <Icon icon="solar:shop-bold" style={{ color: ACCENT }} /> Catálogo PDF
                                </button>
                                {/* Botón "Autocompletar" oculto a pedido del usuario. */}
                            </div>
                        </div>
                        {/* Fila 2: escáner + sede (compactos, sin etiqueta) */}
                        <div className="flex flex-col sm:flex-row gap-2.5">
                            <BarcodeScannerInput
                                className="w-full sm:max-w-xs"
                                inputRef={barcodeRef}
                                value={barcodeInput}
                                onChange={(e) => setBarcodeInput(e.target.value)}
                                onScan={handleBarcodeScan}
                                loading={barcodeLoading}
                                placeholder="Escanear código de barras…"
                            />
                            {vm.isAdmin && vm.esPrincipal && (
                                <div className="w-full sm:w-52">
                                    <Select
                                        withLabel={false}
                                        onChange={(id: any) => vm.handleSelectSede(id)}
                                        label=""
                                        name="sedeId"
                                        options={vm.sedesOptions}
                                        error=""
                                        defaultValue="Todas las sedes"
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                <div className="p-3 sm:p-0">
                    {vm.soloStockBajo && (
                        <div className="flex items-center gap-2 mb-4 px-4 py-2.5 ml-3 bg-rose-50 dark:bg-rose-950/20 border mt-2 border-rose-100 dark:border-rose-900/40 rounded-xl max-w-fit animate-in fade-in slide-in-from-top-2 duration-300">
                            <div className="w-8 h-8 rounded-lg bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center text-rose-600 dark:text-rose-400">
                                <Icon icon="solar:box-minimalistic-bold-duotone" width={18} />
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-rose-700 dark:text-rose-400">Filtro de Stock Bajo Activo</p>
                                <p className="text-xs text-rose-600/70 dark:text-rose-400/70">Mostrando productos con stock igual o menor al mínimo establecido.</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => actions.setSoloStockBajo(false)}
                                className="ml-4 p-1.5 hover:bg-rose-200/50 dark:hover:bg-rose-900/30 rounded-lg text-rose-500 dark:text-rose-400 transition-colors shrink-0"
                            >
                                <Icon icon="solar:close-circle-bold" width={20} />
                            </button>
                        </div>
                    )}
                    <input
                        type="file"
                        accept="image/*"
                        ref={vm.uploadImageRef}
                        onChange={actions.handleUploadImage}
                        className="hidden"
                        disabled={vm.uploading}
                    />

                    <div className="hidden md:block overflow-x-auto">
                        {renderContent()}
                    </div>
                    <div className="md:hidden">
                        {renderMobileProducts()}
                    </div>

                    {/* Modals */}
                    <ModalCategories isOpenModal={vm.isOpenModalCategory} closeModal={() => actions.setIsOpenModalCategory(false)} setIsOpenModal={actions.setIsOpenModalCategory} />
                    <ModalMarcas isOpenModal={vm.isOpenModalBrands} closeModal={() => actions.setIsOpenModalBrands(false)} setIsOpenModal={actions.setIsOpenModalBrands} />
                    {vm.isOpenModalCatalog && <ModalCatalog
                        isOpen={vm.isOpenModalCatalog}
                        onClose={() => actions.setIsOpenModalCatalog(false)}
                        onSuccess={() => {
                            actions.setIsOpenModalCatalog(false);
                            actions.refreshProducts();
                        }}
                    />}

                    <TableActionMenu
                        isOpen={!!vm.openAccionesId && !!vm.anchorEl}
                        anchorEl={vm.anchorEl}
                        onClose={() => { actions.setOpenAccionesId(null); actions.setAnchorEl(null); }}
                    >
                        {vm.openAccionesId && (() => {
                            const rowBase = productsSource.find((r) => r.id === vm.openAccionesId);
                            if (!rowBase) return null;
                            return (
                                <>
                                    <button type="button" onClick={() => { goEditProduct(rowBase); actions.setOpenAccionesId(null); actions.setAnchorEl(null); }} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700">
                                        <Icon icon="material-symbols:edit" width={16} height={16} /> <span>Editar</span>
                                    </button>
                                    <button type="button" onClick={() => { actions.setUploadTarget({ id: rowBase.id, tipo: 'principal' }); vm.uploadImageRef.current?.click(); actions.setOpenAccionesId(null); actions.setAnchorEl(null); }} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700">
                                        <Icon icon="solar:upload-minimalistic-bold" width={16} height={16} /> <span>Subir imagen</span>
                                    </button>
                                    <button type="button" onClick={() => { actions.handleToggleClientState({ ...rowBase, productoId: rowBase.id }); actions.setOpenAccionesId(null); actions.setAnchorEl(null); }} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700">
                                        <Icon icon="mdi:power" width={16} height={16} /> <span>{rowBase.estado === 'INACTIVO' ? 'Activar' : 'Desactivar'}</span>
                                    </button>
                                    {vm.tieneTienda && (
                                        <button type="button" onClick={() => { actions.togglePublicarTienda(rowBase); actions.setOpenAccionesId(null); actions.setAnchorEl(null); }} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700">
                                            <Icon icon={(rowBase as any).publicarEnTienda ? 'mdi:store-off' : 'mdi:store'} width={16} height={16} className={(rowBase as any).publicarEnTienda ? 'text-orange-500 dark:text-orange-400' : 'text-emerald-500 dark:text-emerald-400'} />
                                            <span>{(rowBase as any).publicarEnTienda ? 'Quitar de tienda' : 'Publicar en tienda'}</span>
                                        </button>
                                    )}
                                    <button type="button" onClick={() => { actions.handleOpenDelete({ ...rowBase, productoId: rowBase.id }); actions.setOpenAccionesId(null); actions.setAnchorEl(null); }} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/10 border-t border-gray-100 dark:border-white/10">
                                        <Icon icon="solar:trash-bin-trash-bold" width={16} height={16} /> <span>Eliminar</span>
                                    </button>
                                </>
                            );
                        })()}
                    </TableActionMenu>
                </div>
            </div>

            {vm.isOpenModal && <ModalProduct
                isOpenModal={vm.isOpenModal}
                setIsOpenModal={actions.setIsOpenModal}
                closeModal={actions.closeProductModal}
                errors={vm.errors}
                initialForm={vm.emptyProductForm}
                formValues={vm.formValues}
                setErrors={actions.setErrors}
                setFormValues={actions.setFormValues}
                isEdit={vm.isEdit}
            />}

            <ModalConfirm
                isOpenModal={vm.isOpenModalConfirm}
                setIsOpenModal={actions.setIsOpenModalConfirm}
                confirmSubmit={actions.confirmToggleroduct}
                title={vm.labels.confirmarEstado}
                information={`¿Estás seguro que deseas cambiar el estado de este ${vm.isRestaurante ? 'plato' : 'producto'}?`}
            />

            <ModalConfirm
                isOpenModal={vm.isOpenModalDelete}
                setIsOpenModal={actions.setIsOpenModalDelete}
                confirmSubmit={actions.confirmDeleteProduct}
                title={vm.labels.eliminar}
                information={vm.labels.eliminarInfo}
            />

            <ModalPreviewCatalogo 
                isOpen={isOpenModalPreviewCatalogo} 
                onClose={() => setIsOpenModalPreviewCatalogo(false)} 
            />

        </div>
    );
}
