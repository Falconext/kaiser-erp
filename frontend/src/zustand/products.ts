import { create } from 'zustand';
import { del, get, patch, post, put } from '../utils/fetch';
import { IResponse } from '../interfaces/auth';
import { IFormProduct, IProduct } from '../interfaces/products';
import useAlertStore from './alert';
import { devtools } from 'zustand/middleware';

let latestProductsRequestId = 0;

export interface IProductsState {
    products: IProduct[];
    productsLoaded: boolean;
    product: string;
    productCode: string
    totalProducts: number;
    lastUpsertedProduct: IProduct | null;
    productMutationVersion: number;
    resetProducts: () => void;
    addProduct: (data: IFormProduct, options?: { skipStore?: boolean }) => Promise<any>
    editProduct: (data: IFormProduct) => Promise<any>
    getAllProducts: (params: any, callback?: Function,
        allProperties?: boolean) => void
    toggleStateProduct: (data: number) => void
    getCodeProduct: (empresa: number) => void
    exportProducts: (search?: string, sedeId?: number | null) => void;
    importProducts: (file: File, sedeId?: number | null) => Promise<void>;
    deleteProduct: (productoId: number) => Promise<void>;
    deleteAllProducts: (sedeId?: number) => Promise<void>;
    setProductImage: (productoId: number, imagenUrl: string, imagenUrlDisplay?: string) => void;
    upsertProductLocal: (product: Partial<IProduct> & Pick<IProduct, 'id'>) => void;
}

export const useProductsStore = create<IProductsState>()(devtools((set, _get) => ({
    products: [],
    product: '',
    productCode: '',
    totalProducts: 0,
    productsLoaded: false,
    lastUpsertedProduct: null,
    productMutationVersion: 0,
    getAllProducts: async (params: any, callback?: Function,
        _allProperties?: boolean) => {
        const requestId = latestProductsRequestId + 1;
        latestProductsRequestId = requestId;
        try {
            // useAlertStore.setState({ loading: true })
            const filteredParams = Object.entries(params)
                .filter(([_, value]) => value !== undefined)
                .reduce((obj, [key, value]) => ({ ...obj, [key]: value }), {});

            const query = new URLSearchParams(filteredParams).toString();
            const resp: any = await get(`productos?${query}`);
            if (requestId !== latestProductsRequestId) {
                return;
            }
            if (resp.code === 1) {
                useAlertStore.setState({ success: true });
                const productos = Array.isArray(resp.data?.productos) ? resp.data.productos : [];
                const total = typeof resp.data?.total === 'number' ? resp.data.total : productos.length;
                set({
                    products: productos,
                    totalProducts: total,
                    productsLoaded: true,
                }, false, "GET_PRODUCTS");
                useAlertStore.setState({ loading: false })
            } else {
                // Mantener data previa para evitar parpadeos/tabla vacía por errores transitorios
                set({ productsLoaded: true }, false, "GET_PRODUCTS_FAILED");
                useAlertStore.setState({ loading: false })
            }
        } catch (error) {
            if (requestId !== latestProductsRequestId) {
                return;
            }
            // Mantener data previa para evitar parpadeos/tabla vacía por errores transitorios
            set({ productsLoaded: true }, false, "GET_PRODUCTS_ERROR");
            useAlertStore.setState({ loading: false })
        } finally {
            if (callback) {
                callback();
            }
        }
    },
    deleteProduct: async (productoId: number) => {
        try {
            useAlertStore.setState({ loading: true });
            await del(`productos/${productoId}`);
            set((state) => ({
                products: state.products.filter((p: IProduct) => p.id !== productoId),
                totalProducts: Math.max(0, (state.totalProducts || 0) - 1),
            }), false, 'DELETE_PRODUCT');
            useAlertStore.setState({ success: true });
            useAlertStore.getState().alert('Producto eliminado correctamente', 'success');
        } catch (error: any) {
            useAlertStore.getState().alert(error?.message || 'Error al eliminar el producto', 'error');
        } finally {
            useAlertStore.setState({ loading: false });
        }
    },
    deleteAllProducts: async (sedeId?: number) => {
        try {
            useAlertStore.setState({ loading: true });
            const url = sedeId ? `productos/eliminar-todo?sedeId=${sedeId}` : `productos/eliminar-todo`;
            const resp: any = await del(url);
            if (resp.code === 1) {
                set({
                    products: [],
                    totalProducts: 0,
                    productsLoaded: true,
                }, false, 'DELETE_ALL_PRODUCTS');
                useAlertStore.setState({ success: true });
                useAlertStore.getState().alert(resp.message || 'Se eliminaron todos los productos', 'success');
            } else {
                useAlertStore.getState().alert('Error al eliminar productos', 'error');
            }
        } catch (error: any) {
            useAlertStore.getState().alert(error?.message || 'Error al eliminar productos', 'error');
        } finally {
            useAlertStore.setState({ loading: false });
        }
    },
    setProductImage: (id: number, imagenUrl: string, imagenUrlDisplay?: string) => {
        set((state: any) => {
            const currentProds = Array.isArray(state.products) ? state.products : [];
            const index = currentProds.findIndex((p: any) => p.id === id);
            if (index < 0) return state;

            const t = new Date().getTime();
            const finalImgUrl = (imagenUrl && !imagenUrl.includes('?') && imagenUrl.startsWith('http')) 
                ? `${imagenUrl}?t=${t}` 
                : imagenUrl;
            
            let finalImgDisplayUrl = imagenUrlDisplay || imagenUrl;
            if (finalImgDisplayUrl && !finalImgDisplayUrl.includes('?') && finalImgDisplayUrl.startsWith('http')) {
                finalImgDisplayUrl = `${finalImgDisplayUrl}?t=${t}`;
            }

            const updatedProduct = {
                ...currentProds[index],
                imagenUrl: finalImgUrl,
                imagenUrlDisplay: finalImgDisplayUrl
            };
            const nextProds = [...currentProds];
            nextProds[index] = updatedProduct;
            return { products: nextProds };
        }, false, 'SET_PRODUCT_IMAGE');
    },
    upsertProductLocal: (product: Partial<IProduct> & Pick<IProduct, 'id'>) => {
        const productId = Number(product.id);
        if (!Number.isFinite(productId) || productId <= 0) return;

        set((state) => {
            const currentProduct = state.products?.find((p: IProduct) => p.id === productId);
            let nextProduct = {
                ...(currentProduct || {}),
                ...product,
                id: productId,
            } as IProduct;

            const t = new Date().getTime();
            if (nextProduct.imagenUrl && !nextProduct.imagenUrl.includes('?') && nextProduct.imagenUrl.startsWith('http')) {
                nextProduct.imagenUrl = `${nextProduct.imagenUrl}?t=${t}`;
            }
            if (nextProduct.imagenUrlDisplay && !nextProduct.imagenUrlDisplay.includes('?') && nextProduct.imagenUrlDisplay.startsWith('http')) {
                nextProduct.imagenUrlDisplay = `${nextProduct.imagenUrlDisplay}?t=${t}`;
            }

            const exists = Boolean(currentProduct);
            const merged = exists
                ? state.products.map((p: IProduct) => p.id === productId ? nextProduct : p)
                : [nextProduct, ...(state.products || [])];
            return {
                products: merged,
                totalProducts: exists ? state.totalProducts : (state.totalProducts || 0) + 1,
                lastUpsertedProduct: nextProduct,
                productMutationVersion: state.productMutationVersion + 1,
            };
        }, false, 'UPSERT_PRODUCT_LOCAL');
    },
    addProduct: async (data: any, options?: { skipStore?: boolean }) => {
        useAlertStore.setState({ loading: true });
        try {
            const resp: any = await post(`productos`, data);
            console.log(resp);
            if (resp.code === 1) {
                useAlertStore.setState({ success: true });
                const createdProduct = {
                    ...data,
                    ...resp.data,
                    id: Number(resp.data?.id),
                    codigo: data?.codigo || resp.data?.codigo,
                    imagenUrl: resp.data?.imagenUrl ?? data.imagenUrl,
                    imagenUrlDisplay: resp.data?.imagenUrlDisplay ?? data.imagenUrlDisplay ?? data.imagenUrl,
                    categoria: {
                        ...(resp.data?.categoria || {}),
                        nombre: data.categoriaNombre || resp.data?.categoria?.nombre,
                    },
                    unidadMedida: {
                        ...(resp.data?.unidadMedida || {}),
                        nombre: data.unidadMedidaNombre || resp.data?.unidadMedida?.nombre,
                    },
                    marca: data.marcaId ? {
                        ...(resp.data?.marca || {}),
                        id: Number(data.marcaId),
                        nombre: data.marcaNombre || resp.data?.marca?.nombre,
                    } : undefined,
                } as IProduct;

                if (!options?.skipStore) {
                    _get().upsertProductLocal(createdProduct);
                }

                useAlertStore.getState().alert("Se agrego el producto correctamente", "success")
                return {
                    data: {
                        ...createdProduct,
                    }
                };
            }
            if (resp.code === 2) {
                useAlertStore.getState().alert(`Este código ya ha sido registrado en un producto`, "error")
            }
        } catch (error: any) {
            return useAlertStore.getState().alert(`${error}`, "error")
        } finally {
            useAlertStore.setState({ loading: false });
        }
    },
    editProduct: async (data: any) => {
        console.log(data);
        useAlertStore.setState({ loading: true });
        try {
            const resp: any = await put(`productos/${data.productoId}`, data);
            if (resp.code === 1) {
                const updatedFromApi = (resp.data ?? {}) as Record<string, unknown>;
                const preciosMayorista = Array.isArray((data as any)?.preciosMayorista)
                    ? (data as any).preciosMayorista
                    : undefined;

                const prodId = Number(data?.productoId || data?.id);

                // Construye el producto actualizado fusionando: producto previo (si existe en
                // el store) + payload enviado + respuesta del API. Se calcula aquí para poder
                // devolverlo SIEMPRE, incluso cuando el store local está vacío (la pantalla de
                // productos carga su lista en estado local, no en este store).
                const buildUpdatedProduct = (product: Partial<IProduct> = {}): IProduct => {
                    const nextImagenUrl =
                        data.removerImagen
                            ? null
                            : data.imagenUrl ??
                                (updatedFromApi as any).imagenUrl ??
                                (product as any).imagenUrl;
                    const nextImagenUrlDisplay =
                        data.removerImagen
                            ? null
                            : data.imagenUrlDisplay ??
                                data.imagenUrl ??
                                (updatedFromApi as any).imagenUrlDisplay ??
                                (updatedFromApi as any).imagenUrl ??
                                (product as any).imagenUrlDisplay ??
                                (product as any).imagenUrl;
                    return {
                        ...product,
                        ...data,
                        ...updatedFromApi,
                        id: prodId,
                        imagenUrl: nextImagenUrl,
                        imagenUrlDisplay: nextImagenUrlDisplay,
                        stock: Number((updatedFromApi as any).stock ?? data.stock ?? (product as any).stock ?? 0),
                        stockBase: Number((updatedFromApi as any).stockBase ?? data.stock ?? (product as any).stockBase ?? (product as any).stock ?? 0),
                        preciosMayorista: preciosMayorista ?? (product as any).preciosMayorista ?? [],
                        unidadMedida: (updatedFromApi as any).unidadMedida ?? (data.unidadMedidaNombre ? { ...(product as any).unidadMedida, nombre: data.unidadMedidaNombre } : (product as any).unidadMedida),
                        categoria: (updatedFromApi as any).categoria ?? (data.categoriaNombre ? { ...(product as any).categoria, nombre: data.categoriaNombre } : (product as any).categoria),
                        marca: (updatedFromApi as any).marca ?? (data.marcaId ? {
                            id: Number(data.marcaId),
                            nombre: data.marcaNombre
                        } : undefined),
                    } as any;
                };

                const existingProduct = (_get().products ?? []).find((p: IProduct) => p.id === prodId);
                const nextProduct = buildUpdatedProduct(existingProduct);

                useAlertStore.setState({ success: true });
                set((state) => ({
                    products: (state.products ?? []).map((product: IProduct) =>
                        product.id === prodId ? nextProduct : product
                    ),
                }), false, "UPDATE_PRODUCT");
                useAlertStore.setState({ loading: false })
                useAlertStore.getState().alert("Se actualizó el producto correctamente", "success");
                return nextProduct;
            } else {
                useAlertStore.setState({ loading: false })
                useAlertStore.getState().alert((resp as any)?.error || (resp as any)?.message || "Error al editar el producto", "error");
                return null;
            }
        } catch (error: any) {
            useAlertStore.setState({ loading: false })
            useAlertStore.getState().alert(`${error}`, "error");
            return null;
        }
    },
    toggleStateProduct: async (productoId: number) => {
        try {
            const current = _get().products.find(p => p.id === productoId);
            const nuevoEstado = current?.estado === 'INACTIVO' ? 'ACTIVO' : 'INACTIVO';
            const resp: any = await patch(`productos/${productoId}/estado`, { estado: nuevoEstado });
            if (resp.code === 1) {
                set((state) => ({
                    products: (state.products ?? []).map((product) =>
                        product.id === productoId ? { ...product, estado: nuevoEstado } : product
                    ),
                }), false, "TOGGLE_STATE_PRODUCT");
                useAlertStore.getState().alert(`El producto ha cambiado su estado correctamente`, "success");
            } else {
                useAlertStore.getState().alert("Error al cambiar el estado del producto", "error");
            }
        } catch (error) {
            useAlertStore.getState().alert("Error al cambiar el estado del producto", "error");
        }
    },
    getCodeProduct: async (empresa_id: number) => {
        console.log(empresa_id)
        try {
            const resp: any = await get(`productos/codigo-siguiente`);
            console.log(resp)
            if (resp.code === 1) {
                set((_state) => ({
                    productCode: resp.data?.codigo
                }), false, "GET_PRODUCT_NEXT_CODE");
            } else {
                useAlertStore.getState().alert("Error al encontrar el codigo siguiente del producto", "error");
            }
        } catch (error) {

        }
    },
    resetProducts: async () => {
        try {
            set(
                (_state) => ({
                    products: [],
                    productsLoaded: true,
                }),
                false,
                'RESET_CLIENTS'
            );
        } catch (error) {
            console.log(error);
        }
    },
    exportProducts: async (search?: string, sedeId?: number | null) => {
        try {
            useAlertStore.setState({ loading: true });
            const baseUrl = import.meta.env.VITE_API_URL as string;
            const params = new URLSearchParams();
            if (search) params.set('search', search);
            if (sedeId != null) params.set('sedeId', String(sedeId));
            const qs = params.toString() ? `?${params.toString()}` : '';
            const response = await fetch(`${baseUrl}/productos/exportar${qs}`, {
                method: 'GET',
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('ACCESS_TOKEN')}`,
                },
            });
            if (!response.ok) {
                throw new Error('Error al descargar el archivo');
            }
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'productos.xlsx';
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
            useAlertStore.setState({ success: true });
            useAlertStore.getState().alert('Exportación exitosa', 'success');
        } catch (error: any) {
            console.error('Error en exportProducts:', error.message || error);
            useAlertStore.getState().alert(error.message || 'Error al exportar los productos', 'error');
        } finally {
            useAlertStore.setState({ loading: false });
        }
    },
    importProducts: async (file: File, sedeId?: number | null) => {
        try {
            useAlertStore.setState({ loading: true });

            const formData = new FormData();
            formData.append('file', file);
            // Enviar sedeId también en el body por compatibilidad.
            if (sedeId != null) formData.append('sedeId', String(sedeId));
            console.log('Archivo enviado:', {
                name: file.name,
                size: file.size,
                type: file.type,
                sedeId,
            });
            const baseUrl = import.meta.env.VITE_API_URL as string;
            // sedeId va en el query param: es 100% confiable (no depende del parseo multipart).
            const qs = sedeId != null ? `?sedeId=${sedeId}` : '';
            const response = await fetch(`${baseUrl}/productos/importar${qs}`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('ACCESS_TOKEN')}`,
                },
                body: formData,
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || 'Error al importar los productos');
            }

            if (result.code === 1) {
                const details = result.data || {};
                const exitosos = details.exitosos || 0;
                const creados = details.creados ?? exitosos;
                const actualizados = details.actualizados ?? 0;
                const fallidos = details.fallidos || 0;

                if (exitosos === 0 && fallidos > 0) {
                    const primerError = details.detalles?.find((d: any) => d.error)?.error || 'Error desconocido';
                    useAlertStore.getState().alert(`No se importó ningún producto. ${primerError}`, 'error');
                } else {
                    useAlertStore.setState({ success: true });
                    const partes: string[] = [];
                    if (creados > 0) partes.push(`${creados} creado${creados !== 1 ? 's' : ''}`);
                    if (actualizados > 0) partes.push(`${actualizados} actualizado${actualizados !== 1 ? 's' : ''}`);
                    if (fallidos > 0) partes.push(`${fallidos} con error`);
                    useAlertStore.getState().alert(`Importación completada: ${partes.join(', ')}.`, 'success');
                    await _get().getAllProducts({ page: 1, limit: 50 });
                }
            } else {
                throw new Error(result.message || 'Error al importar los productos');
            }
        } catch (error: any) {
            console.error('Error en importProducts:', error.message || error);
            useAlertStore.getState().alert(error.message || 'Error al importar los productos', 'error');
        } finally {
            useAlertStore.setState({ loading: false });
        }
    },
})));
