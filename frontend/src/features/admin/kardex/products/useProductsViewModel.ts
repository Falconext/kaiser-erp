import { useState, useEffect, useRef, ChangeEvent, useMemo, useCallback } from 'react';
import { useDebounce } from '@/hooks/useDebounce';
import { useProductsStore } from '@/zustand/products';
import { useBrandsStore } from '@/zustand/brands';
import { useAuthStore } from '@/zustand/auth';
import { useSedesStore } from '@/zustand/sedes';
import useAlertStore from '@/zustand/alert';
import apiClient from '@/utils/apiClient';
import { get } from '@/utils/fetch';
import { hasPlanFeature, type IUserPermissions } from '@/utils/permissions';
import { useRubroFeatures } from '@/utils/rubro-features';
import { IProductsViewModelState, initialProductForm, IFormProduct, IProduct, buildEditFormValues } from './ProductsModel';

const COLUMNAS_CORPORATIVAS = ['Localización', '% Venta', '% Provisión'];
const REQUIRED_VISIBLE_COLUMNS = ['Valor Inventario'];
const FALLBACK_VISIBLE_COLUMNS = [
    'Producto',
    'Precio Venta',
    'Stock',
    'Costo',
    'Valor Inventario',
    'Sede',
    'Estado',
    'Acciones',
];

export const useProductsViewModel = () => {
    // Stores
    const {
        products: storeProducts,
        lastUpsertedProduct,
        productMutationVersion,
        exportProducts: exportProductsAction, importProducts: importProductsAction,
        deleteProduct, deleteAllProducts, setProductImage
    } = useProductsStore();
    const { success, loading } = useAlertStore();
    const { auth, sedeActiva } = useAuthStore();
    const { sedes, listarSedes } = useSedesStore();
    const { brands, getAllBrands } = useBrandsStore();

    const isAdmin = auth?.rol === 'ADMIN_EMPRESA' || auth?.rol === 'ADMIN_SISTEMA';
    const esPrincipal = !sedeActiva || sedeActiva.esPrincipal === true;
    const [selectedSedeId, setSelectedSedeId] = useState<number | null>(null);
    // Track whether the admin has explicitly chosen "Todas las sedes" (id=0 → null)
    // so we don't override that choice with the sedeActiva fallback.
    const userChoseSede = useRef(false);
    // For principal-sede admins: default to the current sede's stock instead of the
    // global total (sum of all sedes), which doesn't change on inter-sede transfers.
    const effectiveSedeId = useMemo(() => {
        const id = esPrincipal
            ? (userChoseSede.current ? selectedSedeId : (selectedSedeId ?? sedeActiva?.id ?? null))
            : (sedeActiva?.id ?? null);
        return id !== null && id !== undefined ? Number(id) : null;
    }, [esPrincipal, selectedSedeId, sedeActiva?.id]); // eslint-disable-line react-hooks/exhaustive-deps

    // Para importar/exportar stock necesitamos un almacén ELEGIDO EXPLÍCITAMENTE
    // (a diferencia de effectiveSedeId, que por defecto cae en la sede principal).
    // Un admin de sede principal debe seleccionar un almacén concreto en el dropdown;
    // un usuario de sede fija usa su propia sede.
    const sedeParaImportar = useMemo(() => {
        if (esPrincipal) {
            return userChoseSede.current && selectedSedeId != null
                ? Number(selectedSedeId)
                : null;
        }
        return sedeActiva?.id != null ? Number(sedeActiva.id) : null;
    }, [esPrincipal, selectedSedeId, sedeActiva?.id]); // eslint-disable-line react-hooks/exhaustive-deps

    const sedesOptions = [
        { id: 0, value: 'Todas las sedes' },
        ...sedes.map(s => ({ id: s.id, value: s.esPrincipal ? `${s.nombre}` : s.nombre }))
    ];

    const handleSelectSede = (id: any) => {
        userChoseSede.current = true;
        setSelectedSedeId(id === 0 ? null : Number(id));
    };

    // Derived State
    const isRestaurante = useMemo(() => {
        const rubroNombre = auth?.empresa?.rubro?.nombre?.toLowerCase() || '';
        return rubroNombre.includes('restaurante') || rubroNombre.includes('comida') || rubroNombre.includes('alimento');
    }, [auth?.empresa?.rubro?.nombre]);

    const features = useRubroFeatures(auth?.empresa?.rubro, {
        usaCodigoBarrasManual: auth?.empresa?.usaCodigoBarrasManual,
    });
    const isCodigoBarrasEnabled = features.usaCodigoBarras;

    const esFarmaceuticoRubro = (() => {
        const r = auth?.empresa?.rubro?.nombre?.toLowerCase() || '';
        return r.includes('farmacia') || r.includes('botica') || r.includes('medicament') || r.includes('drogueria') || r.includes('droguería');
    })();
    const createEmptyProductForm = (): IFormProduct => ({
        ...initialProductForm,
        preciosMayorista: [],
    });
    const createEmptyProductErrors = () => ({
        codigo: "",
        descripcion: "",
        categoriaId: 0,
        description: "",
        precioUnitario: "",
        stock: "",
        unidadMedida: "",
    });

    const userPermissions = auth ? (auth as unknown as IUserPermissions) : null;
    const tieneGestionProvisiones = hasPlanFeature(userPermissions, 'tieneGestionProvisiones');
    const tieneTienda = hasPlanFeature(userPermissions, 'tieneTienda');

    const COLUMNAS_ECOMMERCE = ['Tienda'];

    const allColumns = useMemo(() => {
        // Rubros farmacéuticos: "Lotes" (próximo vencimiento) al costado de Producto, sin U.M/%Venta/%Provisión
        const base = esFarmaceuticoRubro
            ? ['Img', 'Producto', 'Lotes', 'Categoria', 'Marca', 'Precio Venta', 'Stock', 'Costo', 'Valor Inventario', 'Localización', 'Estado', 'Tienda', 'Acciones']
            : ['Img', 'Producto', 'Categoria', 'Marca', 'Precio Venta', 'Stock', 'Costo', 'Valor Inventario', 'Localización', '% Venta', '% Provisión', 'U.M', 'Estado', 'Tienda', 'Acciones'];
        return base.filter(c => {
            if (COLUMNAS_CORPORATIVAS.includes(c) && !tieneGestionProvisiones) return false;
            if (COLUMNAS_ECOMMERCE.includes(c) && !tieneTienda) return false;
            return true;
        });
    }, [tieneGestionProvisiones, tieneTienda, esFarmaceuticoRubro]);

    const initialVisibleColumns = allColumns;

    const fallbackVisibleColumns = FALLBACK_VISIBLE_COLUMNS;

    // Labels
    const labels = useMemo(() => ({
        titulo: isRestaurante ? 'Platos' : 'Inventario',
        nuevoBtn: isRestaurante ? 'Nuevo plato' : 'Nuevo producto',
        nuevoBtnMobile: isRestaurante ? '+ Plato' : '+ Nuevo',
        buscar: isRestaurante ? 'Buscar plato' : 'Buscar nombre y código',
        confirmarEstado: isRestaurante ? '¿Estás seguro que deseas cambiar el estado de este plato?' : '¿Estás seguro que deseas cambiar el estado de este producto?',
        eliminar: isRestaurante ? 'Eliminar plato' : 'Eliminar producto',
        eliminarInfo: isRestaurante ? 'Esta acción eliminará el plato de tu catálogo. ¿Deseas continuar?' : 'Esta acción eliminará el producto de tu empresa (eliminación lógica). ¿Deseas continuar?',
    }), [isRestaurante]);

    // Refs
    const fileInputRef = useRef<HTMLInputElement>(null);
    const uploadImageRef = useRef<HTMLInputElement>(null);

    // State
    const [state, setState] = useState<IProductsViewModelState>({
        currentPage: 1,
        itemsPerPage: 50,
        searchClient: "",
        isOpenModal: false,
        isOpenModalCatalog: false,
        isOpenModalCategory: false,
        isOpenModalBrands: false,
        isOpenModalConfirm: false,
        isOpenModalDelete: false,
        isOpenModalDeleteAll: false,
        selectedDeleteId: null,
        formValues: createEmptyProductForm(),
        isEdit: false,
        errors: createEmptyProductErrors(),
        isHoveredExp: false,
        isHoveredImp: false,
        openAccionesId: null,
        anchorEl: null,
        uploadTarget: null,
        uploading: false,
        visibleColumns: initialVisibleColumns,
        showColumnFilter: false,
        vistaActual: isRestaurante ? 'cards' : 'tabla',
        marcaIdFilter: undefined,
        soloStockBajo: (() => {
            const searchParams = new URLSearchParams(window.location.search);
            return searchParams.get('soloStockBajo') === 'true';
        })()
    });

    const debounce = useDebounce(state.searchClient, 600);
    const [products, setProducts] = useState<IProduct[]>([]);
    const [totalProducts, setTotalProducts] = useState(0);
    const [productsLoaded, setProductsLoaded] = useState(false);
    const [productsLoading, setProductsLoading] = useState(false);
    // Ordenamiento por stock (client-side sobre la lista mostrada).
    // Ciclo al hacer click en el header "Stock": null → desc → asc → null.
    const [stockSort, setStockSort] = useState<'asc' | 'desc' | null>(null);
    const toggleStockSort = useCallback(() => {
        setStockSort(prev => (prev === null ? 'desc' : prev === 'desc' ? 'asc' : null));
    }, []);
    const columnsStorageKey = `datatable:${auth?.empresaId || 'default'}:productos:visibleColumns`;
    const vistaStorageKey = `productos:vista:${auth?.empresaId || 'default'}`;

    // Effects

    // Load Design/Vista Preference
    useEffect(() => {
        const loadDiseno = async () => {
            if (!auth?.empresaId) return;
            try {
                const savedVista = localStorage.getItem(vistaStorageKey) as any;
                if (savedVista) {
                    setState(prev => ({ ...prev, vistaActual: savedVista }));
                } else if (window.innerWidth < 768 && !isRestaurante) {
                    setState(prev => ({ ...prev, vistaActual: 'lista' }));
                }
            } catch (error) {
                console.error("Error cargando diseño:", error);
            }
        };
        loadDiseno();
    }, [auth?.empresaId, isRestaurante, vistaStorageKey]);

    // Save Vista Preference
    useEffect(() => {
        if (state.vistaActual) localStorage.setItem(vistaStorageKey, state.vistaActual);
    }, [state.vistaActual, vistaStorageKey]);

    // Load Columns
    useEffect(() => {
        const loadColumns = () => {
            if (!auth?.empresaId) return;
            try {
                const raw = localStorage.getItem(columnsStorageKey);
                if (raw) {
                    const parsed = JSON.parse(raw);
                    if (Array.isArray(parsed)) {
                        let restored = allColumns.filter(c => parsed.includes(c));
                        REQUIRED_VISIBLE_COLUMNS.forEach((column) => {
                            if (allColumns.includes(column) && !restored.includes(column)) {
                                restored = [...restored, column];
                            }
                        });
                        // Auto-include new columns that exist in allColumns but weren't in saved prefs
                        allColumns.forEach((column) => {
                            if (!parsed.includes(column) && !restored.includes(column) && column !== 'Acciones') {
                                restored = [...restored, column];
                            }
                        });
                        if (!restored.includes('Acciones')) restored = [...restored, 'Acciones'];
                        // Normaliza el orden al canónico de allColumns. Así columnas agregadas
                        // luego (p.ej. "Stock") quedan en su posición correcta y no al final por
                        // preferencias antiguas guardadas en localStorage.
                        restored = allColumns.filter(c => restored.includes(c));
                        // Evita dejar la grilla "en blanco" por configuración inválida/corrupta.
                        if (restored.length < 2) {
                            restored = [...fallbackVisibleColumns];
                        }
                        setState(prev => ({ ...prev, visibleColumns: restored }));
                    }
                }
            } catch (_e) { }
        };
        loadColumns();
    }, [auth?.empresaId, columnsStorageKey, allColumns, fallbackVisibleColumns]);

    // Save Columns
    useEffect(() => {
        try {
            const safeColumns = state.visibleColumns.length < 2
                ? fallbackVisibleColumns
                : state.visibleColumns;
            const toSave = safeColumns.includes('Acciones')
                ? safeColumns
                : [...safeColumns, 'Acciones'];
            localStorage.setItem(columnsStorageKey, JSON.stringify(toSave));
        } catch (_) { }
    }, [state.visibleColumns, columnsStorageKey, fallbackVisibleColumns]);

    // Cargar sedes solo en sede principal
    useEffect(() => {
        if (isAdmin && esPrincipal) listarSedes();
    }, [isAdmin, esPrincipal]);

    const fetchProductsList = useCallback(async () => {
        if (!auth?.empresaId) {
            setProducts([]);
            setTotalProducts(0);
            setProductsLoaded(false);
            setProductsLoading(false);
            return;
        }
        setProductsLoading(true);
        try {
            const params: Record<string, string> = {
                page: String(state.currentPage),
                limit: String(state.itemsPerPage),
                search: debounce || '',
            };
            if (state.marcaIdFilter) params.marcaId = String(state.marcaIdFilter);
            if (effectiveSedeId) params.sedeId = String(effectiveSedeId);
            if (state.soloStockBajo) params.soloStockBajo = 'true';
            const query = new URLSearchParams(params).toString();
            const resp: any = await get(`productos?${query}`);
            if (resp?.code === 1) {
                const nextProducts = Array.isArray(resp.data?.productos) ? resp.data.productos : [];
                const nextTotal = typeof resp.data?.total === 'number' ? resp.data.total : nextProducts.length;
                setProducts(nextProducts);
                setTotalProducts(nextTotal);
            } else {
                setProducts([]);
                setTotalProducts(0);
            }
        } catch (_error) {
            setProducts([]);
            setTotalProducts(0);
        } finally {
            setProductsLoaded(true);
            setProductsLoading(false);
        }
    }, [auth?.empresaId, state.currentPage, state.itemsPerPage, state.marcaIdFilter, debounce, effectiveSedeId, state.soloStockBajo]);

    // Siempre mantiene la ref actualizada sin recrear efectos dependientes
    const fetchProductsListRef = useRef(fetchProductsList);
    fetchProductsListRef.current = fetchProductsList;

    // Fetch Products — depende de los parámetros reales, no del callback
    useEffect(() => {
        if (!auth?.empresaId) return;
        fetchProductsListRef.current();
    }, [auth?.empresaId, state.currentPage, state.itemsPerPage, state.marcaIdFilter, debounce, effectiveSedeId, state.soloStockBajo]); // eslint-disable-line react-hooks/exhaustive-deps

    // Sincroniza actualizaciones optimistas desde Zustand (editar/crear sin recargar página).
    useEffect(() => {
        if (!Array.isArray(storeProducts) || storeProducts.length === 0) return;
        setProducts(prev => {
            if (!Array.isArray(prev) || prev.length === 0) return prev;
            const storeById = new Map<number, IProduct>();
            for (const item of storeProducts) {
                if (item?.id) storeById.set(item.id, item);
            }
            return prev.map((item) => {
                const fromStore = storeById.get(item.id);
                if (!fromStore) return item;

                const merged = { ...item, ...fromStore } as IProduct & {
                    imagenUrl?: string;
                    imagenUrlDisplay?: string;
                };

                // Conserva la imagen ya firmada/renderizable del listado actual para no
                // reemplazarla con copias viejas del store global.
                return {
                    ...merged,
                    imagenUrl: (item as any)?.imagenUrl || merged.imagenUrl,
                    imagenUrlDisplay:
                        (item as any)?.imagenUrlDisplay ||
                        (item as any)?.imagenUrl ||
                        merged.imagenUrlDisplay ||
                        merged.imagenUrl,
                } as IProduct;
            });
        });
    }, [storeProducts]);

    // Inserta únicamente el producto recién creado/actualizado. La versión evita
    // reinyectar una mutación antigua al volver a montar la pantalla.
    const observedProductMutationRef = useRef(productMutationVersion);
    useEffect(() => {
        if (
            observedProductMutationRef.current === productMutationVersion ||
            !lastUpsertedProduct?.id
        ) return;

        observedProductMutationRef.current = productMutationVersion;

        const normalizedSearch = (debounce || '').trim().toLocaleLowerCase();
        const matchesSearch =
            normalizedSearch.length === 0 ||
            lastUpsertedProduct.descripcion?.toLocaleLowerCase().includes(normalizedSearch) ||
            lastUpsertedProduct.codigo?.toLocaleLowerCase().includes(normalizedSearch);
        const matchesBrand =
            !state.marcaIdFilter ||
            Number(lastUpsertedProduct.marca?.id) === Number(state.marcaIdFilter);
        const canInsert = state.currentPage === 1 && matchesSearch && matchesBrand;
        const alreadyVisible = products.some(product => product.id === lastUpsertedProduct.id);

        setProducts(previousProducts => {
            const existingIndex = previousProducts.findIndex(
                product => Number(product.id) === Number(lastUpsertedProduct.id),
            );
            if (existingIndex >= 0) {
                return previousProducts.map(product =>
                    Number(product.id) === Number(lastUpsertedProduct.id)
                        ? ({ ...product, ...lastUpsertedProduct } as IProduct)
                        : product
                );
            }
            if (!canInsert) return previousProducts;
            return [lastUpsertedProduct, ...previousProducts].slice(0, state.itemsPerPage);
        });

        if (!alreadyVisible && canInsert) {
            setTotalProducts(previousTotal => previousTotal + 1);
        }
    }, [
        debounce,
        lastUpsertedProduct,
        productMutationVersion,
        products,
        state.currentPage,
        state.itemsPerPage,
        state.marcaIdFilter,
    ]);

    // Close Modals on Success — solo refresca cuando success cambia a true, no en el mount inicial
    const isMountedSuccessRef = useRef(false);
    useEffect(() => {
        if (!isMountedSuccessRef.current) {
            isMountedSuccessRef.current = true;
            return;
        }
        if (success === true) {
            const wasEdit = state.isEdit;
            if (wasEdit) return;
            setState(prev => ({
                ...prev,
                isOpenModal: false,
                isEdit: false,
                formValues: createEmptyProductForm(),
                errors: createEmptyProductErrors(),
            }));
            // En edición no re-fetcheamos — upsertProductLocal ya actualizó el estado local
            // incluyendo la nueva imagen subida a S3. Re-fetchear pisaría esa actualización.
            if (!wasEdit) {
                void fetchProductsListRef.current();
            }
        }
    }, [success]); // eslint-disable-line react-hooks/exhaustive-deps

    // Click outside para filtros auxiliares (el menú de acciones ya se maneja en TableActionMenu)
    useEffect(() => {
        const handleDocClick = () => {
            if (state.showColumnFilter) setState(prev => ({ ...prev, showColumnFilter: false }));
        };
        document.addEventListener('click', handleDocClick);
        return () => document.removeEventListener('click', handleDocClick);
    }, [state.showColumnFilter]);

    const hasFetchedBrands = useRef(false);

    // Load Brands
    useEffect(() => {
        if (!hasFetchedBrands.current && (!brands || brands.length === 0)) {
            getAllBrands();
            hasFetchedBrands.current = true;
        }
    }, [brands, getAllBrands]);

    // Handlers
    const handleGetProduct = async (data: any) => {
        setState(prev => ({ ...prev, isOpenModal: true, isEdit: true }));
        const originalProduct = products.find((p: IProduct) => p.id === data.productoId);

        if (originalProduct) {
            setState(prev => ({
                ...prev,
                formValues: buildEditFormValues(originalProduct),
            }));

            // El listado no trae campos pesados (descripcionLarga, atributosTecnicos).
            // Traemos el producto completo por id para poblar el editor de descripción.
            try {
                const resp = await apiClient.get(`/productos/${originalProduct.id}`);
                const full = resp?.data?.data || resp?.data;
                if (full) {
                    // Fuente autoritativa: re-sembramos las variantes desde el GET individual
                    // para asegurar que traen todos los campos (incl. codigoBarras). Así la
                    // columna BARRAS no queda vacía al reabrir el editor.
                    const fullVariantes = Array.isArray(full.variantes) ? full.variantes : null;
                    setState(prev => ({
                        ...prev,
                        formValues: {
                            ...prev.formValues,
                            descripcionLarga: full.descripcionLarga ?? (prev.formValues as any).descripcionLarga ?? '',
                            atributosTecnicos: full.atributosTecnicos ?? (prev.formValues as any).atributosTecnicos,
                            codigosBarrasExtra: Array.isArray(full.codigosBarrasExtra)
                                ? full.codigosBarrasExtra
                                : ((prev.formValues as any).codigosBarrasExtra ?? []),
                            ...(fullVariantes
                                ? {
                                    variantes: fullVariantes,
                                    variantesConfig: fullVariantes.map((variante: any) => ({
                                        id: variante.id,
                                        valoresAtributos: variante.valoresAtributos || {},
                                        codigo: variante.codigo || '',
                                        precioUnitario: Number(variante.precioUnitario || full.precioUnitario || 0),
                                        stock: Number(variante.stock || 0),
                                        imagenUrl: variante.imagenUrl || '',
                                        imagenUrlDisplay: variante.imagenUrlDisplay || variante.imagenUrl || '',
                                        codigoBarras: variante.codigoBarras || '',
                                        estado: variante.estado || 'ACTIVO',
                                    })),
                                }
                                : {}),
                        } as any,
                    }));
                }
            } catch {
                // Si falla, el formulario igual queda usable con los datos del listado
            }
        }
    };

    const openNewProduct = () => {
        setState(prev => ({
            ...prev,
            isOpenModal: true,
            isEdit: false,
            formValues: createEmptyProductForm(),
            errors: createEmptyProductErrors(),
        }));
    };

    const closeProductModal = () => {
        setState(prev => ({
            ...prev,
            isOpenModal: false,
            isEdit: false,
            formValues: createEmptyProductForm(),
            errors: createEmptyProductErrors(),
        }));
    };

    const handleUploadImage = async (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !state.uploadTarget) return;
        try {
            setState(prev => ({ ...prev, uploading: true }));
            const fd = new FormData();
            fd.append('file', file);
            const url = `/productos/${state.uploadTarget!.id}/imagen`;
            const resp = await apiClient.post(url, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
            useAlertStore.getState().alert('Imagen subida correctamente', 'success');
            const signed = resp?.data?.signedUrl || resp?.data?.data?.signedUrl;
            const nuevaUrl = resp?.data?.data?.url || resp?.data?.url || resp?.data?.data?.imagenUrl || resp?.data?.imagenUrl || undefined;
            if (nuevaUrl) {
                setProductImage(state.uploadTarget!.id, nuevaUrl, signed || nuevaUrl);
            } else {
                useAlertStore.getState().alert('No se recibió la URL de imagen.', 'warning');
            }
        } catch (error: any) {
            useAlertStore.getState().alert(error.response?.data?.message || 'Error al subir imagen', 'error');
        } finally {
            setState(prev => ({
                ...prev,
                uploading: false,
                uploadTarget: null
            }));
            if (uploadImageRef.current) uploadImageRef.current.value = '';
        }
    };

    const handleImportExcel = async (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        const allowedTypes = ["application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"];
        if (!allowedTypes.includes(file.type)) {
            useAlertStore.getState().alert("Use archivo .xlsx o .xls válido", "error");
            return;
        }
        // El stock del Excel se aplica a un almacén concreto: exigir sede elegida.
        if (sedeParaImportar == null) {
            useAlertStore.getState().alert("Seleccione el almacén de destino en el selector 'Sede' antes de importar.", "error");
            if (fileInputRef.current) fileInputRef.current.value = "";
            return;
        }
        await importProductsAction(file, sedeParaImportar);
        if (fileInputRef.current) fileInputRef.current.value = "";
        await fetchProductsList();
    };

    const toggleColumn = (column: string) => {
        if (column === 'Acciones') return;
        setState(prev => {
            if (prev.visibleColumns.includes(column)) {
                return { ...prev, visibleColumns: prev.visibleColumns.filter(c => c !== column) };
            } else {
                return { ...prev, visibleColumns: allColumns.filter(col => prev.visibleColumns.includes(col) || col === column) };
            }
        });
    };

    const handleOpenDelete = (data: any) => {
        setState(prev => ({ ...prev, selectedDeleteId: Number(data.productoId), isOpenModalDelete: true }));
    };

    const confirmDeleteProduct = async () => {
        if (!state.selectedDeleteId) return;
        await deleteProduct(state.selectedDeleteId);
        setState(prev => ({ ...prev, isOpenModalDelete: false, selectedDeleteId: null }));
        await fetchProductsList();
    };

    const confirmDeleteAllProducts = async () => {
        await deleteAllProducts(effectiveSedeId ?? undefined);
        setState(prev => ({ ...prev, isOpenModalDeleteAll: false }));
        await fetchProductsList();
    };

    const handleToggleClientState = async (data: any) => {
        setState(prev => ({ ...prev, formValues: data, isOpenModalConfirm: true }));
    };

    const confirmToggleroduct = async () => {
        const productoId = Number(state.formValues?.productoId);
        // Determine the new state from local products (not from Zustand store which may be stale)
        const localProduct = products.find(p => p.id === productoId);
        const nuevoEstado = localProduct?.estado === 'INACTIVO' ? 'ACTIVO' : 'INACTIVO';
        setState(prev => ({ ...prev, isOpenModalConfirm: false }));
        try {
            const resp: any = await apiClient.patch(`productos/${productoId}/estado`, { estado: nuevoEstado });
            if (resp?.data?.code === 1 || resp?.status === 200) {
                // Update local products state immediately for real-time UI feedback
                setProducts(prev => prev.map(p =>
                    p.id === productoId ? { ...p, estado: nuevoEstado } as IProduct : p
                ));
                useAlertStore.getState().alert('El producto ha cambiado su estado correctamente', 'success');
            } else {
                useAlertStore.getState().alert('Error al cambiar el estado del producto', 'error');
            }
        } catch {
            useAlertStore.getState().alert('Error al cambiar el estado del producto', 'error');
        }
    };

    const togglePublicarTienda = async (producto: any) => {
        try {
            await apiClient.patch(`productos/${producto.id}/publicar-tienda`, {
                publicarEnTienda: !producto.publicarEnTienda,
            });
            await fetchProductsList();
        } catch {
            // silently ignore
        }
    };

    const actions = {
        setcurrentPage: (page: number) => setState(prev => ({ ...prev, currentPage: page })),
        setitemsPerPage: (items: number) => setState(prev => ({ ...prev, itemsPerPage: items })),
        setSearchClient: (e: any) => setState(prev => ({ ...prev, searchClient: e.target.value })),
        setIsOpenModal: (v: boolean) => {
            if (!v) {
                closeProductModal();
                return;
            }
            setState(prev => ({ ...prev, isOpenModal: true }));
        },
        setIsOpenModalCatalog: (v: boolean) => setState(prev => ({ ...prev, isOpenModalCatalog: v })),
        setIsOpenModalCategory: (v: boolean) => setState(prev => ({ ...prev, isOpenModalCategory: v })),
        setIsOpenModalBrands: (v: boolean) => setState(prev => ({ ...prev, isOpenModalBrands: v })),
        setIsOpenModalConfirm: (v: boolean) => setState(prev => ({ ...prev, isOpenModalConfirm: v })),
        setIsOpenModalDelete: (v: boolean) => setState(prev => ({ ...prev, isOpenModalDelete: v })),
        setIsOpenModalDeleteAll: (v: boolean) => setState(prev => ({ ...prev, isOpenModalDeleteAll: v })),
        setIsEdit: (v: boolean) => setState(prev => ({ ...prev, isEdit: v })),
        setErrors: (errors: any) => setState(prev => ({ ...prev, errors })),
        setFormValues: (values: any) => setState(prev => ({
            ...prev,
            formValues: typeof values === 'function' ? values(prev.formValues) : values,
        })),
        setIsHoveredExp: (v: boolean) => setState(prev => ({ ...prev, isHoveredExp: v })),
        setIsHoveredImp: (v: boolean) => setState(prev => ({ ...prev, isHoveredImp: v })),
        setVistaActual: (v: any) => setState(prev => ({ ...prev, vistaActual: v })),
        setOpenAccionesId: (id: number | null) => setState(prev => ({ ...prev, openAccionesId: id })),
        setAnchorEl: (el: HTMLElement | null) => setState(prev => ({ ...prev, anchorEl: el })),
        setUploadTarget: (t: any) => setState(prev => ({ ...prev, uploadTarget: t })),
        // Complex Actions
        openNewProduct,
        closeProductModal,
        handleGetProduct,
        handleUploadImage,
        handleImportExcel,
        toggleColumn,
        handleOpenDelete,
        confirmDeleteProduct,
        confirmDeleteAllProducts,
        handleToggleClientState,
        confirmToggleroduct,
        togglePublicarTienda,
        toggleStockSort,
        exportProducts: () => exportProductsAction(debounce, effectiveSedeId),
        refreshProducts: async () => {
            await fetchProductsList();
        },
        setSoloStockBajo: (val: boolean) => {
            setState(prev => ({ ...prev, soloStockBajo: val, currentPage: 1 }));
            // Optional: update URL to remove the parameter if disabled
            if (!val) {
                const url = new URL(window.location.href);
                url.searchParams.delete('soloStockBajo');
                window.history.replaceState({}, '', url);
            }
        }
    };

    const selectedSedeName = effectiveSedeId
        ? (sedes.find(s => s.id === effectiveSedeId)?.nombre ?? null)
        : null;

    const safeVisibleColumns = state.visibleColumns.length < 2
        ? fallbackVisibleColumns
        : state.visibleColumns;

    return {
        ...state,
        auth,
        labels,
        products,
        productsLoaded,
        totalProducts,
        loading: productsLoading || loading,
        productsLoading,
        emptyProductForm: createEmptyProductForm(),
        fileInputRef,
        uploadImageRef,
        isRestaurante,
        isCodigoBarrasEnabled,
        safeVisibleColumns,
        stockSort,
        actions,
        // Sede filtering
        isAdmin,
        esPrincipal,
        effectiveSedeId,
        selectedSedeName,
        sedesOptions,
        handleSelectSede,
        tieneTienda,
        // Computed
        indexOfFirstItem: (state.currentPage - 1) * state.itemsPerPage,
        indexOfLastItem: state.currentPage * state.itemsPerPage,
        pages: Array.from({ length: Math.ceil(totalProducts / state.itemsPerPage) }, (_, i) => i + 1)
    };
};
