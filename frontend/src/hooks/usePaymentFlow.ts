import { useState, useCallback } from 'react';
import { get } from '@/utils/fetch';

export type PaymentType = 'ADELANTO' | 'PAGO_PARCIAL' | 'PAGO_TOTAL';
export type PaymentMethod = 'Efectivo' | 'Yape' | 'Plin' | 'Transferencia' | 'Tarjeta' | 'Otro';

export interface IPayment {
  id?: string;
  tipo: PaymentType;
  monto: number;
  medioPago: PaymentMethod;
  fecha?: Date;
  observacion?: string;
  referencia?: string;
  cuentaBancariaId?: number;
}

export interface IPaymentFlowState {
  payment: IPayment | null;
  isLoading: boolean;
  error: string | null;
  showReceipt: boolean;
  receiptData: any;
  comprobanteDetails: any;
  pagosHistorial: any[];
}

export const usePaymentFlow = () => {
  const [state, setState] = useState<IPaymentFlowState>({
    payment: null,
    isLoading: false,
    error: null,
    showReceipt: false,
    receiptData: null,
    comprobanteDetails: null,
    pagosHistorial: [],
  });

  // Cargar detalles completos del comprobante y pagos
  const loadComprobanteDetails = useCallback(async (comprobanteId: number) => {
    try {
      const [comprobanteDetails, pagosData] : any = await Promise.all([
        get(`/comprobante/${comprobanteId}`), // Asumiendo que existe este endpoint
        get(`/pago/comprobante/${comprobanteId}/historial`)
      ]);
      
      setState(prev => ({
        ...prev,
        comprobanteDetails,
        pagosHistorial: pagosData.pagos || [],
      }));
      
      return { comprobanteDetails, pagosHistorial: pagosData.pagos || [] };
    } catch (error) {
      console.error('Error loading comprobante details:', error);
      setState(prev => ({ ...prev, error: 'Error al cargar detalles del comprobante' }));
      return null;
    }
  }, []);

  // Iniciar pago
  const initiatePayment = useCallback(async (paymentType: PaymentType, comprobante: any, saldoActual: number) => {
    // Cargar detalles completos si no están disponibles
    if (!state.comprobanteDetails || state.comprobanteDetails.id !== comprobante.id) {
      await loadComprobanteDetails(comprobante.id);
    }
    
    setState(prev => ({
      ...prev,
      payment: {
        tipo: paymentType,
        monto: paymentType === 'ADELANTO' ? 0 : saldoActual,
        medioPago: 'Efectivo',
      },
      error: null,
    }));
  }, [state.comprobanteDetails, loadComprobanteDetails]);

  // Validar monto según tipo de pago
  const validatePayment = useCallback((payment: IPayment, saldoPendiente: number, mtoImpVenta: number): string => {
    if (payment.monto <= 0) {
      return 'El monto debe ser mayor a 0';
    }

    if (payment.tipo === 'ADELANTO') {
      if (payment.monto > mtoImpVenta) {
        return `El adelanto no puede exceder el total (S/ ${mtoImpVenta.toFixed(2)})`;
      }
    } else if (payment.tipo === 'PAGO_PARCIAL') {
      if (payment.monto > saldoPendiente) {
        return `El pago no puede exceder el saldo pendiente (S/ ${saldoPendiente.toFixed(2)})`;
      }
    } else if (payment.tipo === 'PAGO_TOTAL') {
      if (Math.abs(payment.monto - saldoPendiente) > 0.01) {
        return `El monto debe ser igual al saldo pendiente (S/ ${saldoPendiente.toFixed(2)})`;
      }
    }

    return '';
  }, []);

  // Procesar pago
  const processPayment = useCallback(async (
    payment: IPayment,
    comprobante: any,
    processPaymentFn: (data: any, medioPago: string, monto: number, observacion?: string, referencia?: string, cuentaBancariaId?: number) => Promise<any>
  ) => {
    const error = validatePayment(payment, comprobante.saldo, comprobante.mtoImpVenta);
    if (error) {
      setState(prev => ({ ...prev, error }));
      return { success: false, error };
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const result = await processPaymentFn(comprobante, payment.medioPago, payment.monto, payment.observacion, payment.referencia, payment.cuentaBancariaId);
      
      // Determinar el ID del comprobante correcto
      const comprobanteId = result?.pago?.comprobanteId || comprobante.id;
      
      // Recargar datos actualizados después del pago
      const updatedData = await loadComprobanteDetails(comprobanteId);
      
      // Usar los datos actualizados si están disponibles
      const currentComprobante = updatedData?.comprobanteDetails || comprobante;
      const currentPagos = updatedData?.pagosHistorial || [];
      
      // Calcular nuevo saldo
      let nuevoSaldo = comprobante.saldo;
      if (payment.tipo === 'ADELANTO') {
        // El saldo se reduce por el adelanto
        nuevoSaldo = comprobante.mtoImpVenta - payment.monto;
      } else if (payment.tipo === 'PAGO_PARCIAL' || payment.tipo === 'PAGO_TOTAL') {
        nuevoSaldo = Math.max(0, comprobante.saldo - payment.monto);
      }

      const receiptData = {
        comprobante: currentComprobante,
        payment,
        nuevoSaldo: currentComprobante.saldo || nuevoSaldo,
        montoPagado: payment.monto,
        numeroRecibo: result.pago?.id || result.id || `REC-${Date.now()}`,
        detalles: currentComprobante.detalles || [],
        cliente: currentComprobante.cliente || comprobante.cliente,
        pagosHistorial: currentPagos,
        totalPagado: currentPagos.reduce((sum: number, p: any) => sum + (p.monto || 0), 0),
      };

      setState(prev => ({
        ...prev,
        isLoading: false,
        payment,
        receiptData,
        showReceipt: true,
      }));

      return { success: true, receiptData };
    } catch (err: any) {
      const errorMsg = err.message || 'Error al procesar el pago';
      setState(prev => ({ ...prev, isLoading: false, error: errorMsg }));
      return { success: false, error: errorMsg };
    }
  }, [validatePayment, loadComprobanteDetails]);

  // Limpiar estado
  const reset = useCallback(() => {
    setState({
      payment: null,
      isLoading: false,
      error: null,
      showReceipt: false,
      receiptData: null,
      comprobanteDetails: null,
      pagosHistorial: [],
    });
  }, []);

  // Cerrar recibo sin hacer nada
  const closeReceipt = useCallback(() => {
    setState(prev => ({ ...prev, showReceipt: false }));
  }, []);

  // Función específica para cargar detalles desde tabla de pagos usando el comprobanteId
  const loadComprobanteDetailsFromPago = useCallback(async (pago: any) => {
    // Si el pago tiene el comprobanteId (que debería tenerlo)
    const comprobanteId = pago.comprobante?.id || pago.comprobanteId;
    if (comprobanteId) {
      return await loadComprobanteDetails(comprobanteId);
    }
    return null;
  }, [loadComprobanteDetails]);

  return {
    ...state,
    loadComprobanteDetails,
    loadComprobanteDetailsFromPago,
    initiatePayment,
    validatePayment,
    processPayment,
    reset,
    closeReceipt,
  };
};
