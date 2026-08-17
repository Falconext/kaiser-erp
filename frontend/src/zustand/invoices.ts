import { create } from 'zustand';
import { get, patch, post } from '../utils/fetch';
import { IFormInvoice, IInvoices } from '../interfaces/invoices';
import useAlertStore from './alert';
import { devtools } from 'zustand/middleware';
import { useClientsStore } from './clients';
import { useProductsStore } from './products';
import { useAuthStore } from './auth';
import { mapDetalleToInvoiceProduct } from '@/features/admin/facturacion/utils/comprobanteProductMapper';

const normalizeSunatEstado = (invoice: any) => {
    const rawEstado = String(invoice?.estadoEnvioSunat ?? '').toUpperCase();
    const qpseCode = String(
        invoice?.qpseCode ??
        invoice?.sunatCode ??
        invoice?.sunatCdrResponse?.code ??
        ''
    );

    const rawResponse = typeof invoice?.sunatCdrResponse === 'string'
        ? (() => {
            try {
                return JSON.parse(invoice.sunatCdrResponse);
            } catch {
                return null;
            }
        })()
        : invoice?.sunatCdrResponse;

    const responseCode = String(rawResponse?.code ?? qpseCode ?? '');
    const responseLabel = String(rawResponse?.state_label ?? rawResponse?.estado ?? rawEstado).toUpperCase();

    let estadoEnvioSunat = rawEstado;

    // ANULADO y NO_APLICA son estados de negocio definitivos — tienen prioridad sobre
    // cualquier código de respuesta de SUNAT (el CDR original sigue diciendo "aceptado").
    if (rawEstado === 'ANULADO' || rawEstado === 'NO_APLICA' || rawEstado === 'PENDIENTE_CONCILIACION') {
        estadoEnvioSunat = rawEstado;
    } else if (responseCode === '0' || responseLabel === 'ACEPTADO' || responseLabel === 'OBSERVADO' || rawEstado === 'EMITIDO') {
        estadoEnvioSunat = 'ACEPTADO';
    } else if (responseCode === '98' || responseLabel === 'PENDIENTE' || responseLabel === 'EN_PROCESO' || responseLabel === 'INDETERMINADO' || rawEstado === 'FALLIDO_ENVIO') {
        estadoEnvioSunat = 'PENDIENTE';
    } else if (rawEstado === 'RECHAZADO') {
        estadoEnvioSunat = rawEstado;
    } else if (!estadoEnvioSunat) {
        estadoEnvioSunat = responseCode === '0' ? 'ACEPTADO' : responseCode === '98' ? 'PENDIENTE' : 'RECHAZADO';
    }

    return {
        ...invoice,
        estadoEnvioSunat,
        estadoSunatRaw: rawEstado,
    };
};

export interface IInvoicesState {
    invoices: IInvoices[];
    totalInvoices: number;
    receipt: string;
    productsInvoice: any;
    invoice: any;
    invoiceData: any;
    dataReceipt: any;
    addProductsInvoice: (product: any) => void;
    updateProductInvoice: (index: number, updatedProduct: any) => void;
    getReceipt: (receipt: string) => void;
    getSerieAndCorrelativeByReceipt: (empresaId: number, receipt: string, receiptNote?: string) => Promise<{ success: boolean, error?: string }>;
    getInvoiceBySerieCorrelative: (serie: string, correlative?: string, motivoId?: number) => Promise<{ success: boolean, error?: string }>;
    addInvoice: (data: IFormInvoice) => Promise<{ success: boolean, error?: string }>;
    addInformalInvoice: (data: IFormInvoice) => Promise<any>;
    getAllInvoices: (params: any, callback?: Function, allProperties?: boolean) => Promise<{ success: boolean, error?: string }>;
    deleteProductInvoice: (data: any) => void;
    deleteProductInvoiceByIndex: (index: number) => void;
    resetInvoice: () => void;
    resetProductInvoice: () => void;
    getInvoice: (id: number) => Promise<{ success: boolean, error?: string }>;
    completePay: (data: any, medioPago: string, montoPagado?: number) => Promise<{ success: boolean, error?: string }>;
    cancelInvoice: (id: number) => Promise<{ success: boolean, error?: string }>;
    discardInvoice: (id: number) => Promise<{ success: boolean, error?: string }>;
    conciliarInvoice: (id: number) => Promise<{ success: boolean, error?: string }>;
    updateQuotation: (id: number, data: any) => Promise<{ success: boolean, error?: string, serie?: string, correlativo?: number, id?: number, mtoImpVenta?: number, isUpdate?: boolean }>;
    updateNotaVenta: (id: number, data: any) => Promise<{ success: boolean, error?: string, serie?: string, correlativo?: number, id?: number, mtoImpVenta?: number, isUpdate?: boolean }>;
    importReference: number
}

export const useInvoiceStore = create<IInvoicesState>()(devtools((set, _get) => ({
    dataReceipt: null,
    invoice: null,
    invoiceData: null,
    invoices: [],
    productsInvoice: [],
    totalInvoices: 0,
    receipt: "",
    importReference: 0,
    getAllInvoices: async (params: any, callback?: Function, _allProperties?: boolean) => {
        try {
            const filteredParams = Object.entries(params)
                .filter(([_, value]) => value !== undefined)
                .reduce((obj, [key, value]) => ({ ...obj, [key]: value }), {});

            const query = new URLSearchParams(filteredParams).toString();
            const resp: any = await get(`comprobante/listar?${query}`);
            console.log(resp);
            if (resp.code === 1) {
                useAlertStore.setState({ success: true });
                set({
                    invoices: (resp.data.comprobantes || []).map(normalizeSunatEstado),
                    totalInvoices: resp.data.total
                }, false, "GET_INVOICES");
                useAlertStore.setState({ loading: false });
                return { success: true };
            } else {
                set({
                    invoices: []
                });
                useAlertStore.setState({ loading: false });
                useAlertStore.getState().alert(resp.error || "Error al obtener las facturas", "error");
                return { success: false, error: resp.error || "Error al obtener las facturas" };
            }
        } catch (error: any) {
            useAlertStore.setState({ loading: false });
            useAlertStore.getState().alert(`${error.message || "Error al obtener las facturas"}`, "error");
            return { success: false, error: error.message || "Error al obtener las facturas" };
        } finally {
            if (callback) {
                callback();
            }
        }
    },

    getReceipt: async (receipt: string) => {
        try {
            set({
                receipt: receipt
            }, false, "GET_RECEIPT");
        } catch (error) {
            console.log(error);
        }
    },

    addProductsInvoice: async (data: any) => {
        console.log(data);
        try {
            set(
                (state) => {
                    const cantidadInicial = Number(data?.cantidadInicial ?? 1);
                    const precioUnitario = Number(data?.precioUnitario ?? 0);
                    const newProduct = {
                        ...data,
                        cantidad: cantidadInicial,
                        descuento: 0,
                        cantidadOriginal: data?.cantidad,
                        sale: ((precioUnitario * cantidadInicial) / 1.18).toFixed(2),
                        igv: ((precioUnitario * cantidadInicial) - ((precioUnitario * cantidadInicial) / 1.18)).toFixed(2),
                        total: (precioUnitario * cantidadInicial).toFixed(2),
                    };
                    return {
                        productsInvoice: [newProduct, ...state.productsInvoice]
                    };
                },
                false,
                'ADD_PRODUCTS_INVOICES'
            );
        } catch (error: any) {
            useAlertStore.getState().alert(`${error.message || "Error al agregar el producto"}`, "error");
        }
    },

    updateProductInvoice: async (index: number, updatedProduct: any) => {
        try {
            set(
                (state) => {
                    const updatedProducts = [...state.productsInvoice];
                    updatedProducts[index] = { ...updatedProducts[index], ...updatedProduct };
                    return { productsInvoice: updatedProducts };
                },
                false,
                'UPDATE_PRODUCT_INVOICE'
            );
        } catch (error) {
            console.log(error);
            useAlertStore.getState().alert("Error al actualizar el producto", "error");
        }
    },

    deleteProductInvoice: async (data: any) => {
        try {
            set(
                (state) => ({
                    productsInvoice: state.productsInvoice.filter((i: any) => i.descripcion !== data.descripcion),
                }),
                false,
                'DELETE_PRODUCT_INVOICE'
            );
        } catch (error) {
            console.log(error);
            useAlertStore.getState().alert("Error al eliminar el producto", "error");
        }
    },

    // Elimina por posición exacta: evita borrar en lote cuando dos líneas
    // comparten la misma descripción (ítems libres o el mismo producto repetido).
    deleteProductInvoiceByIndex: async (index: number) => {
        try {
            set(
                (state) => ({
                    productsInvoice: state.productsInvoice.filter((_: any, i: number) => i !== index),
                }),
                false,
                'DELETE_PRODUCT_INVOICE_BY_INDEX'
            );
        } catch (error) {
            console.log(error);
            useAlertStore.getState().alert("Error al eliminar el producto", "error");
        }
    },

    resetInvoice: async () => {
        try {
            set(
                (_state) => ({
                    productsInvoice: [],
                    invoice: null,
                    invoiceData: null
                }),
                false,
                'RESET_PRODUCT_INVOICE'
            );
            await useClientsStore.getState().resetClients();
            // NOTA: No llamar resetProducts() - borra el catálogo de productos disponibles
        } catch (error) {
            console.log(error);
            useAlertStore.getState().alert("Error al reiniciar el invoice", "error");
        }
    },
    resetProductInvoice: async () => {
        try {
            set(
                (_state) => ({
                    productsInvoice: []
                }),
                false,
                'RESET_PRODUCT_INVOICE'
            );
            await useClientsStore.getState().resetClients();
            // NOTA: No llamar resetProducts() porque borra el catálogo de productos disponibles
            // Solo queremos limpiar los productos de la factura actual (productsInvoice)
        } catch (error) {
            console.log(error);
            useAlertStore.getState().alert("Error al reiniciar el invoice", "error");
        }
    },

    addInvoice: async (data: any) => {
        try {
            const sedeActivaId = useAuthStore.getState().sedeActiva?.id;
            const payload = data?.sedeId ? data : { ...data, ...(sedeActivaId ? { sedeId: sedeActivaId } : {}) };
            // Emisión a SUNAT puede tardar más que el timeout global (12s). Damos 40s
            // para esperar la respuesta real y evitar el "timeout" y estados falsos.
            const resp: any = await post(`comprobante/${data.tipoDoc === "01" ? "factura" : data.tipoDoc === "03" ? "boleta" : data.tipoDoc === "07" ? "nota-credito" : "nota-debito"}`, payload, { timeout: 40000 });
            console.log(resp);
            if (resp.code === 1) {
                const isPendiente = (resp.data?.status ?? resp.status) === 'PENDIENTE';
                useAlertStore.setState({ success: true });
                useAlertStore.setState({ loading: false });
                await useClientsStore.getState().resetClients();
                // NOTA: No llamar resetProducts() - borra el catálogo de productos
                return {
                    success: true,
                    pendiente: isPendiente,
                    serie: resp.data?.serie ?? null,
                    correlativo: resp.data?.correlativo ?? null,
                    id: resp.data?.comprobanteId ?? null,
                    mtoImpVenta: resp.data?.mtoImpVenta != null ? Number(resp.data.mtoImpVenta) : null,
                };
            } else {
                useAlertStore.getState().alert(resp.error || "Error al crear el recibo", "error");
                return { success: false, error: resp.error || "Error al crear el recibo" };
            }
        } catch (error: any) {
            console.log(error);
            useAlertStore.getState().alert(`${error.message || "Error al crear el recibo"}`, "error");
            return { success: false, error: error.message || "Error al crear el recibo" };
        }
    },
    addInformalInvoice: async (data) => {
        console.log(data);
        try {
            const sedeActivaId = useAuthStore.getState().sedeActiva?.id;
            const payload = data?.sedeId ? data : { ...data, ...(sedeActivaId ? { sedeId: sedeActivaId } : {}) };
            const resp: any = await post('/comprobante/informal', payload, { timeout: 40000 });
            if (resp.code === 1) {
                useAlertStore.setState({ success: true });
                useAlertStore.setState({ loading: false });
                await useClientsStore.getState().resetClients();
                // NOTA: No llamar resetProducts() - borra el catálogo de productos
                return {
                    success: true,
                    id: resp.data?.id ?? resp.data?.comprobanteId ?? null,
                    serie: resp.data?.serie ?? null,
                    correlativo: resp.data?.correlativo ?? null,
                    mtoImpVenta: resp.data?.mtoImpVenta != null ? Number(resp.data.mtoImpVenta) : null,
                };
            }
            useAlertStore.getState().alert(resp.error || 'Error al crear comprobante informal', 'error');
            return { success: false, error: resp.error };
        } catch (error) {
            useAlertStore.getState().alert('Error al crear comprobante informal', 'error');
            return { success: false, error: 'Error al crear comprobante informal' };
        }
    },
    getInvoice: async (id: number) => {
        try {
            const resp: any = await get(`comprobante/${id}`);
            console.log(resp);
            if (resp.code === 1) {
                const data = resp.data || {};
                const vendedorNombre = data?.usuario?.nombre || undefined;

                set(
                    (_state) => ({
                        invoice: {
                            ...normalizeSunatEstado(data),
                            vendedor: vendedorNombre,
                        },
                    }),
                    false,
                    'GET_INVOICE'
                );
                return { success: true };
            } else {
                useAlertStore.setState({ loading: false });
                useAlertStore.getState().alert(resp.error || "Error al obtener el invoice", "error");
                return { success: false, error: resp.error || "Error al obtener el invoice" };
            }
        } catch (error: any) {
            useAlertStore.getState().alert(`${error.message || "Error al obtener el invoice"}`, "error");
            return { success: false, error: error.message || "Error al obtener el invoice" };
        }
    },
    getSerieAndCorrelativeByReceipt: async (empresaId: number, tipoDoc: string, tipDocAfectado?: string) => {
        console.log(tipoDoc);
        console.log(tipDocAfectado);
        //  @Get('empresa/:empresaId/siguiente-correlativo/:tipoDoc')
        try {
            const safeTipoDoc = encodeURIComponent(tipoDoc);
            const qs = tipDocAfectado !== undefined ? `?tipDocAfectado=${encodeURIComponent(tipDocAfectado)}` : "";
            const resp: any = await get(`/comprobante/empresa/${empresaId}/siguiente-correlativo/${safeTipoDoc}${qs}`);
            console.log(resp);
            if (resp.code === 1) {
                set(
                    (_state) => ({
                        dataReceipt: resp.data
                    }),
                    false,
                    'GET_SERIE_AND_CORRELATIVE'
                );
                return { success: true };
            } else {
                useAlertStore.setState({ loading: false });

                useAlertStore.getState().alert(resp.error || "Error al obtener la serie y correlativo", "error");
                return { success: false, error: resp.error || "Error al obtener la serie y correlativo" };
            }
        } catch (error: any) {
            console.log(error)
            useAlertStore.getState().alert(`${error.message || "Error al obtener la serie y correlativo"}`, "error");
            return { success: false, error: error.message || "Error al obtener la serie y correlativo" };
        }
    },

    getInvoiceBySerieCorrelative: async (serie: string, correlative?: string, motivoId?: number) => {
        try {
            const resp: any = await get(
                `/comprobante/detalle?serie=${serie}&correlativo=${correlative}`
            );
            console.log(resp);
            if (resp.code === 1) {
                // Mapeamos cada línea y calculamos su total
                let products = resp.data.detalles.map((item: any) => {
                    const mapped = mapDetalleToInvoiceProduct(item);
                    const total = (Number(item.mtoPrecioUnitario) * item.cantidad).toFixed(2);
                    return {
                        ...mapped,
                        unidadMedida: { nombre: mapped.unidad || item.unidad },
                        stock: mapped.stock,
                        precioUnitario: item.mtoPrecioUnitario,
                        sale: (Number(item.mtoPrecioUnitario * item.cantidad) / 1.18).toFixed(2),
                        igv: (
                            (Number(item.mtoPrecioUnitario) -
                                Number(item.mtoPrecioUnitario) / 1.18) *
                            item.cantidad
                        ).toFixed(2),
                        total
                    };
                });

                // Ahora sumamos todos los `total`
                const importReference = products
                    .map((p: any) => parseFloat(p.total))
                    .reduce((sum: any, t: any) => sum + t, 0);

                const productsWithMotivo = motivoId === 8 ? [{
                    descripcion: "Intereses por mora",
                    cantidad: 1,
                    unidadMedida: 'UNIDAD',
                    precioUnitario: 0,
                    descuento: 0,
                    stock: 0,
                    sale: Number(0).toFixed(2),
                    igv: Number(0).toFixed(2),
                    total: Number(0).toFixed(2),
                }] : motivoId === 4 ? [{
                    descripcion: "Descuento Global",
                    cantidad: 1,
                    unidadMedida: 'UNIDAD',
                    precioUnitario: 0,
                    descuento: 0,
                    stock: 0,
                    sale: Number(0).toFixed(2),
                    igv: Number(0).toFixed(2),
                    total: Number(0).toFixed(2),
                }] : motivoId === 10 ? [{
                    descripcion: "Penalidad",
                    cantidad: 1,
                    unidadMedida: 'UNIDAD',
                    precioUnitario: 0,
                    descuento: 0,
                    stock: 0,
                    sale: Number(0).toFixed(2),
                    igv: Number(0).toFixed(2),
                    total: Number(0).toFixed(2),
                }] : products

                set(
                    (_state) => ({
                        invoiceData: resp.data,
                        productsInvoice: productsWithMotivo,
                        importReference: parseFloat(importReference.toFixed(2)),
                    }),
                    false,
                    'GET_INVOICE_BY_SERIE_CORRELATIVE'
                );
                return { success: true };
            } else {
                console.log(resp);
                // Limpiar data si no se encuentra
                set({ invoiceData: null, productsInvoice: [] }, false, 'GET_INVOICE_ERROR');
                useAlertStore.getState().alert(resp.error || "Documento no encontrado", "error");
                return { success: false, error: resp.error };
            }
        } catch (error: any) {
            console.log(error)
            useAlertStore.getState().alert(
                `${error.message || 'Error al obtener el invoice por serie y correlativo'}`,
                'error'
            );
            return { success: false, error: error.message };
        }
    },
    completePay: async (data: any, medioPago: string, montoPagado?: number) => {
        console.log('=== DEBUG COMPLETE PAY ===');
        console.log('data:', data);
        console.log('medioPago:', medioPago);
        console.log('montoPagado:', montoPagado);
        try {
            const payload: any = {
                medioPago,
                observacion: data.observacion || '',
                referencia: data.referencia || '',
                cuentaBancariaId: data.cuentaBancariaId ?? null,
            };
            // Si viene un monto específico (pago parcial), incluirlo
            if (montoPagado !== undefined && montoPagado > 0) {
                payload.montoPagado = montoPagado;
            }
            console.log('payload enviado al backend:', payload);
            const resp: any = await patch(`/comprobante/${data?.id}/completar-pago`, payload);
            if (resp.code === 1) {
                set(
                    (state) => ({
                        invoices: state.invoices.map((invoice) =>
                            invoice.id === data.id || (`OT-${invoice.serie}-${invoice.correlativo}` === `${data?.documentoAfiliado}`)
                                ? { ...invoice, estadoPago: resp.data.comprobanteActualizado?.estadoPago, saldo: resp.data.comprobanteActualizado?.saldo }
                                : invoice
                        ),
                    }),
                    false,
                    'COMPLETAR_PAGO'
                );
                const mensajeEstado = resp.data.saldo > 0 ? 'Pago parcial registrado' : 'Pago completado exitosamente';
                useAlertStore.getState().alert(mensajeEstado, 'success');
                return { success: true };
            } else {
                useAlertStore.getState().alert(resp.error || 'Error al registrar el pago', 'error');
                return { success: false, error: resp.error || 'Error al registrar el pago' };
            }
        } catch (error: any) {
            useAlertStore.getState().alert(`${error.message || 'Error al registrar el pago'}`, 'error');
            return { success: false, error: error.message || 'Error al registrar el pago' };
        }
    },
    discardInvoice: async (id: number) => {
        try {
            const resp: any = await patch(`/comprobante/${id}/descartar`, {});
            if (resp.code === 1) {
                set(
                    (state) => ({
                        invoices: state.invoices.filter((inv) => inv.id !== id),
                    }),
                    false,
                    'DESCARTAR_COMPROBANTE'
                );
                useAlertStore.getState().alert('Comprobante descartado exitosamente', 'success');
                return { success: true };
            } else {
                useAlertStore.getState().alert(resp.error || 'Error al descartar el comprobante', 'error');
                return { success: false, error: resp.error };
            }
        } catch (error: any) {
            useAlertStore.getState().alert(error.message || 'Error al descartar el comprobante', 'error');
            return { success: false, error: error.message };
        }
    },
    conciliarInvoice: async (id: number) => {
        try {
            const resp: any = await patch(`/comprobante/${id}/conciliar`, {});
            if (resp.code === 1) {
                set(
                    (state) => ({
                        invoices: state.invoices.map((inv: any) =>
                            inv.id === id
                                ? { ...inv, estadoEnvioSunat: 'EMITIDO', estadoSunatRaw: 'EMITIDO' }
                                : inv,
                        ),
                    }),
                    false,
                    'CONCILIAR_COMPROBANTE'
                );
                useAlertStore.getState().alert('Boleta conciliada: marcada como aceptada.', 'success');
                return { success: true };
            } else {
                useAlertStore.getState().alert(resp.error || 'Error al conciliar el comprobante', 'error');
                return { success: false, error: resp.error };
            }
        } catch (error: any) {
            useAlertStore.getState().alert(error.message || 'Error al conciliar el comprobante', 'error');
            return { success: false, error: error.message };
        }
    },
    updateQuotation: async (id: number, data: any) => {
        try {
            const resp: any = await patch(`/comprobante/${id}`, data);
            if (resp.code === 1) {
                useAlertStore.getState().alert('Cotización actualizada exitosamente', 'success');
                // Devolver serie/correlativo del comprobante actualizado para que el modal
                // de éxito muestre el número editado (no el "siguiente" correlativo).
                return {
                    success: true,
                    serie: resp.data?.serie,
                    correlativo: resp.data?.correlativo,
                    id: resp.data?.id,
                    mtoImpVenta: resp.data?.mtoImpVenta,
                    isUpdate: true,
                };
            }
            useAlertStore.getState().alert(resp.error || 'Error al actualizar la cotización', 'error');
            return { success: false, error: resp.error };
        } catch (error: any) {
            useAlertStore.getState().alert(error.message || 'Error al actualizar la cotización', 'error');
            return { success: false, error: error.message };
        }
    },
    updateNotaVenta: async (id: number, data: any) => {
        try {
            const resp: any = await patch(`/comprobante/${id}/nota-venta`, data);
            if (resp.code === 1) {
                useAlertStore.getState().alert('Comprobante actualizado exitosamente', 'success');
                return {
                    success: true,
                    serie: resp.data?.serie,
                    correlativo: resp.data?.correlativo,
                    id: resp.data?.id,
                    mtoImpVenta: resp.data?.mtoImpVenta,
                    isUpdate: true,
                };
            }
            useAlertStore.getState().alert(resp.error || 'Error al actualizar la nota de venta', 'error');
            return { success: false, error: resp.error };
        } catch (error: any) {
            useAlertStore.getState().alert(error.message || 'Error al actualizar la nota de venta', 'error');
            return { success: false, error: error.message };
        }
    },
    cancelInvoice: async (id: number, motivo?: string) => {
        try {
            const body = motivo ? { motivo } : {};
            const resp: any = await patch(`/comprobante/${id}/anular`, body);
            if (resp.code === 1 || resp.id) {
                set(
                    (state) => ({
                        invoices: state.invoices.map((invoice) =>
                            invoice.id === id
                                ? { ...invoice, estadoPago: 'ANULADO', estadoEnvioSunat: 'ANULADO', saldo: 0 }
                                : invoice
                        ),
                        invoiceData: state.invoiceData && state.invoiceData.comprobante?.id === id
                            ? {
                                ...state.invoiceData,
                                comprobante: { ...state.invoiceData.comprobante, estadoPago: 'ANULADO', estadoEnvioSunat: 'ANULADO', saldo: 0 },
                                ordenTrabajo: state.invoiceData.ordenTrabajo
                                    ? { ...state.invoiceData.ordenTrabajo, estadoPago: 'ANULADO', saldo: 0 }
                                    : null
                            }
                            : state.invoiceData
                    }),
                    false,
                    'ANULAR_COMPROBANTE'
                );
                useAlertStore.getState().alert('Comprobante anulado exitosamente', 'success');
                return { success: true };
            } else {
                useAlertStore.getState().alert(resp.error || 'Error al anular el comprobante', 'error');
                return { success: false, error: resp.error || 'Error al anular el comprobante' };
            }
        } catch (error: any) {
            useAlertStore.getState().alert(`${error.message || 'Error al anular el comprobante'}`, 'error');
            return { success: false, error: error.message || 'Error al anular el comprobante' };
        }
    },
})));
