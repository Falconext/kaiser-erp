import { create } from 'zustand';
import apiClient from '../utils/apiClient';
import { useAuthStore } from './auth';

interface Empresa {
  id: number;
  ruc: string;
  razonSocial: string;
  direccion: string;
  logo?: string;
  fechaActivacion: string;
  fechaExpiracion: string;
  estado: 'ACTIVO' | 'INACTIVO';
  departamento?: string;
  provincia?: string;
  distrito?: string;
  ubigeo?: string;
  nombreComercial?: string;
  esAgenteRetencion?: boolean;
  usaCodigoBarrasManual?: boolean | null;
  usarPrecioLoteFefo?: boolean | null;
  permitirVentaSinStock?: boolean | null;
  cobranzaCampo?: boolean | null;
  brand?: string;
  producto?: string;
  providerId?: string;
  providerToken?: string;
  usaDemo?: boolean;
  ambienteFacturacion?: 'DEMO' | 'PRODUCCIÓN';
  usuarioPse?: string;
  contrasenaPse?: string;
  billingProvider?: 'QPSE' | 'APISUNAT' | 'JAMBLE';
  billingApiBaseUrl?: string;
  billingApiDemoBaseUrl?: string;
  billingApiToken?: string;
  billingApiUser?: string;
  billingApiPassword?: string;
  whatsappProvider?: 'PLATFORM' | 'EMPRESA' | 'DISABLED';
  whatsappApiToken?: string;
  whatsappPhoneNumberId?: string | null;
  whatsappBusinessId?: string | null;
  whatsappActivo?: boolean;
  plan: {
    id: number;
    nombre: string;
    tieneTienda: boolean
    descripcion?: string;
    limiteUsuarios?: number;
    costo?: number;
  };
  rubro?: {
    id: number;
    nombre: string;
  };
  usuarios?: Array<{
    nombre?: string | null;
    email?: string | null;
    celular?: string | null;
  }>;
  series?: EmpresaSerieConfig[];
}

export interface EmpresaSerieConfig {
  id?: number;
  empresaId?: number;
  tipoDoc: string;
  serie: string;
  correlativo: number;
  activo: boolean;
}

interface Plan {
  id: number;
  nombre: string;
  descripcion?: string;
  limiteUsuarios?: number;
  costo?: number;
  tieneTienda?: boolean;
  tieneTicketera?: boolean;
}

interface Rubro {
  id: number;
  nombre: string;
}

interface Ubigeo {
  codigo: string;
  departamento: string;
  provincia: string;
  distrito: string;
}

interface CreateEmpresaDto {
  ruc: string;
  razonSocial: string;
  direccion: string;
  logo?: File;
  planId?: number;
  esPrueba: boolean;
  tipoEmpresa: 'FORMAL' | 'INFORMAL';
  departamento: string;
  provincia: string;
  distrito: string;
  ubigeo: string;
  rubroId: number;
  nombreComercial: string;
  fechaActivacion: string;
  fechaExpiracion?: string;
  providerId?: string;
  providerToken?: string;
  usaDemo?: boolean;
  usarPrecioLoteFefo?: boolean;
  permitirVentaSinStock?: boolean;
  brand?: string;
  producto?: string;
  usuarioPse?: string;
  contrasenaPse?: string;
  billingProvider?: 'QPSE' | 'APISUNAT' | 'JAMBLE';
  billingApiBaseUrl?: string;
  billingApiDemoBaseUrl?: string;
  billingApiToken?: string;
  billingApiUser?: string;
  billingApiPassword?: string;
  whatsappProvider?: 'PLATFORM' | 'EMPRESA' | 'DISABLED';
  whatsappApiToken?: string;
  whatsappPhoneNumberId?: string | null;
  whatsappBusinessId?: string | null;
  whatsappActivo?: boolean;
  usuario: {
    nombre: string;
    email: string;
    password: string;
    dni: string;
    celular: string;
  };
}

interface UpdateEmpresaDto {
  id: number;
  ruc: string;
  razonSocial: string;
  direccion: string;
  logo?: File | string | any;
  planId: number;
  tipoEmpresa: 'FORMAL' | 'INFORMAL';
  regimenTributario?: 'GENERAL' | 'RER' | 'MYPE' | 'RUS';
  departamento: string;
  provincia: string;
  distrito: string;
  ubigeo: string;
  rubroId: number;
  nombreComercial: string;
  paginaWeb?: string;
  cuentaDetraccionBN?: string;
  fechaActivacion: string;
  fechaExpiracion: string;
  providerId?: string;
  providerToken?: string;
  usaDemo?: boolean;
  esAgenteRetencion?: boolean;
  usaCodigoBarrasManual?: boolean;
  usarPrecioLoteFefo?: boolean;
  permitirVentaSinStock?: boolean;
  cobranzaCampo?: boolean;
  ticketLogoSize?: number;
  directorTecnico?: string;
  brand?: string;
  producto?: string;
  usuarioPse?: string;
  contrasenaPse?: string;
  billingProvider?: 'QPSE' | 'APISUNAT' | 'JAMBLE';
  billingApiBaseUrl?: string;
  billingApiDemoBaseUrl?: string;
  billingApiToken?: string;
  billingApiUser?: string;
  billingApiPassword?: string;
  whatsappProvider?: 'PLATFORM' | 'EMPRESA' | 'DISABLED';
  whatsappApiToken?: string;
  whatsappPhoneNumberId?: string | null;
  whatsappBusinessId?: string | null;
  whatsappActivo?: boolean;
  shalomEmail?: string;
  shalomPassword?: string;
}

interface ListEmpresaDto {
  search?: string;
  page?: number;
  limit?: number;
  sort?: 'id' | 'ruc' | 'razonSocial' | 'fechaActivacion' | 'fechaExpiracion';
  order?: 'asc' | 'desc';
  estado?: 'ACTIVO' | 'INACTIVO' | 'TODOS';
  tipoEmpresa?: 'FORMAL' | 'INFORMAL' | '';
  brand?: string;
  producto?: 'facturacion' | 'hotel' | 'restaurante';
}

interface EmpresasListResponse {
  empresas: Empresa[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface Suscripcion {
  planActual: Plan;
  fechaExpiracion: string;
  diasRestantes: number;
  estado: 'ACTIVA' | 'VENCIDA' | 'PROXIMA_VENCER';
}

interface EmpresasState {
  // Estado
  empresas: Empresa[];
  empresa: Empresa | null;
  miEmpresa: Empresa | null;
  planes: Plan[];
  rubros: Rubro[];
  ubigeos: Ubigeo[];
  suscripcion: Suscripcion | null;
  loading: boolean;
  error: string | null;

  // Paginación
  currentPage: number;
  totalPages: number;
  totalEmpresas: number;

  // Acciones - Empresas
  listarEmpresas: (params?: ListEmpresaDto) => Promise<void>;
  crearEmpresa: (data: CreateEmpresaDto) => Promise<Empresa>;
  obtenerEmpresa: (id: number) => Promise<void>;
  actualizarEmpresa: (data: UpdateEmpresaDto) => Promise<void>;
  listarSeriesEmpresa: (id: number) => Promise<EmpresaSerieConfig[]>;
  guardarSeriesEmpresa: (id: number, series: EmpresaSerieConfig[]) => Promise<EmpresaSerieConfig[]>;
  cambiarEstadoEmpresa: (id: number, estado: 'ACTIVO' | 'INACTIVO') => Promise<void>;
  eliminarEmpresa: (id: number) => Promise<void>;
  obtenerMiEmpresa: () => Promise<void>;
  actualizarMiEmpresa: (data: Partial<UpdateEmpresaDto>) => Promise<Empresa>;


  // Acciones - Suscripciones
  obtenerSuscripcion: () => Promise<void>;

  // Acciones auxiliares
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
  reset: () => void;
}

export const useEmpresasStore = create<EmpresasState>((set, get) => ({
  // Estado inicial
  empresas: [],
  empresa: null,
  miEmpresa: null,
  planes: [],
  rubros: [],
  ubigeos: [],
  suscripcion: null,
  loading: false,
  error: null,
  currentPage: 1,
  totalPages: 0,
  totalEmpresas: 0,

  // Acciones - Empresas
  listarEmpresas: async (params = {}) => {
    set({ loading: true, error: null });
    try {
      const response = await apiClient.get<EmpresasListResponse>('/empresa/listar', {
        params: {
          page: 1,
          limit: 10,
          ...params
        }
      });
      const { data }: any = response;
      set({
        empresas: data.data.empresas,
        currentPage: data.data.page,
        totalPages: data.data.totalPages,
        totalEmpresas: data.data.total,
        loading: false
      });
    } catch (error: any) {
      set({
        error: error?.response?.data?.message || 'Error al cargar empresas',
        loading: false
      });
    }
  },

  crearEmpresa: async (data: CreateEmpresaDto) => {
    set({ loading: true, error: null });
    try {
      const payload = {
        ...data,
        brand: data.brand || import.meta.env.VITE_PUBLIC_BRAND || 'default',
        producto: data.producto || 'facturacion',
      };
      const response = await apiClient.post<Empresa>('/empresa/crear', payload);

      set({ loading: false });
      return response.data;
    } catch (error: any) {
      set({
        error: error?.response?.data?.message || 'Error al crear empresa',
        loading: false
      });
      throw error;
    }
  },

  obtenerEmpresa: async (id: number) => {
    set({ loading: true, error: null });
    try {
      const response: any = await apiClient.get<Empresa>(`/empresa/${id}`);
      console.log(response)
      set({ empresa: response?.data?.data, loading: false });
    } catch (error: any) {
      set({
        error: error?.response?.data?.message || 'Error al obtener empresa',
        loading: false
      });
    }
  },

  actualizarEmpresa: async (data: UpdateEmpresaDto) => {
    set({ loading: true, error: null });
    try {
      // Preparar datos para envío como JSON
      const updateData: any = { ...data };

      // Si hay logo como File, convertir a base64
      if (data.logo instanceof File) {
        const reader = new FileReader();
        const base64Promise = new Promise<string>((resolve) => {
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(data.logo!);
        });
        updateData.logo = await base64Promise;
      }

      const response: any = await apiClient.put<Empresa>(`/empresa/${data.id}`, updateData, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      const updatedEmpresa = response?.data?.data || response?.data;

      // Actualizar la empresa en la lista si existe
      const { empresas } = get();
      const updatedEmpresas = empresas.map(emp =>
        emp.id === data.id ? updatedEmpresa : emp
      );

      set({
        empresas: updatedEmpresas,
        empresa: updatedEmpresa,
        loading: false
      });
    } catch (error: any) {
      set({
        error: error?.response?.data?.message || 'Error al actualizar empresa',
        loading: false
      });
      throw error;
    }
  },

  listarSeriesEmpresa: async (id: number) => {
    try {
      const response: any = await apiClient.get(`/empresa/${id}/series`);
      return response?.data?.data || response?.data || [];
    } catch (error: any) {
      set({ error: error?.response?.data?.message || 'Error al obtener series SUNAT' });
      throw error;
    }
  },

  guardarSeriesEmpresa: async (id: number, series: EmpresaSerieConfig[]) => {
    try {
      const response: any = await apiClient.put(`/empresa/${id}/series`, { series });
      const payload = response?.data?.data || response?.data || [];
      set((state) => ({
        empresa: state.empresa?.id === id ? { ...state.empresa, series: payload } : state.empresa,
      }));
      return payload;
    } catch (error: any) {
      set({ error: error?.response?.data?.message || 'Error al guardar series SUNAT' });
      throw error;
    }
  },

  cambiarEstadoEmpresa: async (id: number, estado: 'ACTIVO' | 'INACTIVO') => {
    set({ loading: true, error: null });
    try {
      const response = await apiClient.patch(`/empresa/${id}/estado`, { estado });

      // Actualizar la empresa en la lista
      const { empresas } = get();
      const updatedEmpresas = empresas.map(emp =>
        emp.id === id ? { ...emp, estado } : emp
      );

      set({
        empresas: updatedEmpresas,
        loading: false
      });
    } catch (error: any) {
      set({
        error: error?.response?.data?.message || 'Error al cambiar estado',
        loading: false
      });
      throw error;
    }
  },

  eliminarEmpresa: async (id: number) => {
    set({ loading: true, error: null });
    try {
      await apiClient.delete(`/empresa/${id}`);

      // Remover la empresa de la lista
      const { empresas } = get();
      const updatedEmpresas = empresas.filter(emp => emp.id !== id);

      set({
        empresas: updatedEmpresas,
        totalEmpresas: get().totalEmpresas - 1,
        loading: false
      });
    } catch (error: any) {
      set({
        error: error?.response?.data?.message || 'Error al eliminar empresa',
        loading: false
      });
      throw error;
    }
  },

  obtenerMiEmpresa: async () => {
    set({ loading: true, error: null });
    try {
      const response = await apiClient.get<Empresa>('/empresa/mia');
      set({ miEmpresa: response.data, loading: false });
    } catch (error: any) {
      set({
        error: error?.response?.data?.message || 'Error al obtener mi empresa',
        loading: false
      });
    }
  },

  actualizarMiEmpresa: async (data: Partial<UpdateEmpresaDto>) => {
    set({ loading: true, error: null });
    try {
      // Si hay logo como File, convertir a base64
      const updateData: any = { ...data };
      if (data.logo instanceof File) {
        const reader = new FileReader();
        const base64Promise = new Promise<string>((resolve) => {
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(data.logo!);
        });
        updateData.logo = await base64Promise;
      }

      const response: any = await apiClient.put('/empresa/mia', updateData);
      const payload = response?.data?.data ?? response?.data;

      set({ miEmpresa: payload, loading: false });

      // Mantener sincronizado auth.empresa sin llamada adicional al backend.
      // OJO: PUT /empresa/mia puede devolver `plan` SIN `modulosAsignados`/
      // `subModulosAsignados`. Un merge superficial borraría esos arrays y el
      // sidebar (que se arma desde plan.modulosAsignados) quedaría solo con
      // Dashboard. Por eso preservamos los módulos del plan previo.
      useAuthStore.setState((state: any) => {
        if (!state?.auth) return state;
        const prevEmpresa = state.auth.empresa || {};
        const prevPlan = prevEmpresa.plan || {};
        const nextPlan = (payload as any)?.plan;
        const mergedPlan = nextPlan
          ? {
              ...prevPlan,
              ...nextPlan,
              modulosAsignados: nextPlan.modulosAsignados ?? prevPlan.modulosAsignados,
              subModulosAsignados: nextPlan.subModulosAsignados ?? prevPlan.subModulosAsignados,
            }
          : prevPlan;
        return {
          ...state,
          auth: {
            ...state.auth,
            empresa: {
              ...prevEmpresa,
              ...(payload || {}),
              plan: mergedPlan,
            },
          },
        };
      });

      return payload as Empresa;
    } catch (error: any) {
      set({
        error: error?.response?.data?.message || 'Error al actualizar mi empresa',
        loading: false
      });
      throw error;
    }
  },

  // Acciones - Suscripciones
  obtenerSuscripcion: async () => {
    set({ loading: true, error: null });
    try {
      const response = await apiClient.get<Suscripcion>('/suscripcion');
      set({ suscripcion: response.data, loading: false });
    } catch (error: any) {
      set({
        error: error?.response?.data?.message || 'Error al obtener suscripción',
        loading: false
      });
    }
  },

  // Búsqueda de RUC
  buscarPorRuc: async (ruc: string) => {
    try {
      const response = await apiClient.get(`/empresa/consultar-ruc/${ruc}`);
      return response.data?.data || response.data;
    } catch (error: any) {
      throw error;
    }
  },

  // Acciones auxiliares
  setLoading: (loading: boolean) => set({ loading }),
  setError: (error: string | null) => set({ error }),
  clearError: () => set({ error: null }),
  reset: () => set({
    empresas: [],
    empresa: null,
    miEmpresa: null,
    planes: [],
    rubros: [],
    ubigeos: [],
    suscripcion: null,
    loading: false,
    error: null,
    currentPage: 1,
    totalPages: 0,
    totalEmpresas: 0
  })
}));

export default useEmpresasStore;
