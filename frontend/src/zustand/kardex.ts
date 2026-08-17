import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { get, post } from '../utils/fetch';
import useAlertStore from './alert';

export interface IKardexFilters {
  fechaInicio?: string;
  fechaFin?: string;
  productoId?: string;
  tipoMovimiento?: string;
  concepto?: string;
}

export interface IKardexPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface IMovimientoKardex {
  id: number;
  fecha: string | Date;
  tipoMovimiento: 'INGRESO' | 'SALIDA' | 'AJUSTE' | 'TRANSFERENCIA';
  concepto: string;
  cantidad: number;
  stockAnterior: number;
  stockActual: number;
  costoUnitario?: number;
  valorTotal?: number;
  observacion?: string;
  lote?: string;
  fechaVencimiento?: string | Date;
  producto: {
    id: number;
    codigo: string;
    descripcion: string;
    unidadMedida: {
      codigo: string;
      nombre: string;
    };
  };
}

export interface IKardexResponse {
  movimientos: IMovimientoKardex[];
  paginacion: IKardexPagination | any;
}

export interface IKardexState {
  kardex: IKardexResponse | null;
  loading: boolean;
  getKardex: (params: { page?: number; limit?: number } & IKardexFilters) => Promise<void>;
  createMovimientoAjuste: (data: {
    productoId: number;
    stockAnterior: number;
    stockNuevo: number;
    observacion?: string;
  }) => Promise<void>;
  reset: () => void;
}

export const useKardexStore = create<IKardexState>()(devtools((set, _get) => ({
  kardex: null,
  loading: false,
  reset: () => set({ kardex: null }, false, 'KARDEX_RESET'),
  getKardex: async (params) => {
    try {
      set({ loading: true }, false, 'KARDEX_LOADING');
      useAlertStore.setState({ loading: true });

      const filteredParams = Object.entries(params)
        .filter(([, value]) => value !== undefined && value !== '')
        .reduce((obj, [key, value]) => {
          // Enviar fechas en formato YYYY-MM-DD sin sufijo Z ni hora
          if ((key === 'fechaInicio' || key === 'fechaFin') && value) {
            const dateStr = typeof value === 'string' ? value : String(value);
            if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
              return { ...obj, [key]: dateStr };
            }
          }
          return { ...obj, [key]: value };
        }, {} as Record<string, any>);

      // Defaults
      const page = filteredParams.page ?? 1;
      const limit = filteredParams.limit ?? 20;

      const query = new URLSearchParams({ ...filteredParams, page: String(page), limit: String(limit) }).toString();
      const resp: any = await get(`kardex?${query}`);

      if (resp?.code === 1 || (resp?.movimientos && resp?.paginacion)) {
        // API style flexible: accept either wrapped or direct data
        const data: IKardexResponse = resp?.data ?? resp;
        set({ kardex: data }, false, 'KARDEX_SUCCESS');
        useAlertStore.setState({ success: true });
      } else {
        set({ kardex: { movimientos: [], paginacion: { page, limit, total: 0, totalPages: 0 } } }, false, 'KARDEX_EMPTY');
      }
    } catch (error) {
      useAlertStore.getState().alert('Error al cargar kardex', 'error');
    } finally {
      set({ loading: false }, false, 'KARDEX_LOADING_DONE');
      useAlertStore.setState({ loading: false });
    }
  },
  createMovimientoAjuste: async (data) => {
    try {
      const movimientoData = {
        productoId: data.productoId,
        tipoMovimiento: 'AJUSTE',
        concepto: 'Ajuste de inventario - Edición de producto',
        cantidad: data.stockNuevo - data.stockAnterior,
        stockAnterior: data.stockAnterior,
        stockActual: data.stockNuevo,
        observacion: data.observacion || `Stock ajustado de ${data.stockAnterior} a ${data.stockNuevo}`,
        fecha: new Date().toISOString()
      };

      const resp: any = await post('kardex/movimiento', movimientoData);
      
      if (resp?.code === 1) {
        // Opcional: agregar el nuevo movimiento al estado local si existe kardex cargado
        // No mostrar mensaje aquí para no interferir con el mensaje del producto
      } else {
        console.warn('No se pudo crear el movimiento de kardex:', resp);
      }
    } catch (error) {
      console.error('Error al crear movimiento de kardex:', error);
      // No mostrar error aquí para no interferir con la experiencia de edición del producto
    }
  },
})));
