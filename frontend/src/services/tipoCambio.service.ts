import api from '../utils/apiClient';

export interface TipoCambio {
  moneda: string;   // "USD"
  fecha: string;    // yyyy-mm-dd
  compra: number;   // TC compra
  venta: number;    // TC venta (el usado normalmente para facturar)
}

// El backend envuelve las respuestas en { code, message, data }. Extraemos el data interno.
const extractData = (response: any) => response.data?.data ?? response.data;

export const tipoCambioService = {
  /** Tipo de cambio de hoy (o de una fecha yyyy-mm-dd si se indica). */
  consultar: async (fecha?: string): Promise<TipoCambio> => {
    const response = await api.get<TipoCambio>('/tipo-cambio', {
      params: fecha ? { fecha } : undefined,
    });
    return extractData(response);
  },
};
