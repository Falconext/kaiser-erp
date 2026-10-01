import api from '../utils/apiClient';

// El backend envuelve todo en { code, message, data } (ResponseInterceptor).
const unwrap = (response: any) => response?.data?.data ?? response?.data;

/**
 * Mensaje legible de un error de la API. Los errores de Olva son informativos
 * ("configura la agencia de origen", "ya tiene la guía X"), así que hay que
 * sacarlos del envelope { code: 0, message } en vez de mostrar el de axios.
 */
export const mensajeErrorOlva = (error: unknown, porDefecto: string): string => {
    const data = (error as any)?.response?.data;
    return data?.message || data?.error?.message || porDefecto;
};

/** Configuración Olva de la empresa (no hay cuenta que conectar, solo origen). */
export interface OlvaConfig {
    /** El plan habilita el módulo Olva (Negocio y Corporativo). */
    habilitado: boolean;
    /** El plan habilita CREAR guías desde el sistema (solo Corporativo). */
    habilitadoPorPlan: boolean;
    /** Hay OLVA_API_KEY configurada en el backend. */
    apiConfigurada: boolean;
    agenciaOrigenCodigo?: string | null;
    agenciaOrigenNombre?: string | null;
    agenciaOrigenUbigeo?: string | null;
    autoTrackingActivo: boolean;
}

export interface ConfigOlvaPayload {
    agenciaOrigenCodigo?: string;
    agenciaOrigenNombre?: string;
    agenciaOrigenUbigeo?: string;
    autoTrackingActivo?: boolean;
}

export interface CrearGuiaOlvaPayload {
    origenCodigo?: string;
    destinoCodigo?: string;
    destinoNombre?: string;
    /** AGENCIA (entrega en oficina) | DOMICILIO (entrega en la dirección). */
    tipoEnvio?: 'AGENCIA' | 'DOMICILIO';
    documento?: string;
    nombre?: string;
    telefono?: string;
    direccion?: string;
    referencia?: string;
    departamento?: string;
    provincia?: string;
    distrito?: string;
    pesoKg?: number;
    valorDeclarado?: number;
    contenido?: string;
    observaciones?: string;
    forzar?: boolean;
}

export interface GuiaOlvaCreada {
    id: number;
    nroOrden: string | null;
    codigoGuia: string | null;
    olvaAgenciaDestinoCodigo: string | null;
    olvaGuiaCreadaEn: string | null;
}

export interface CotizarOlvaPayload {
    ubigeoOrigen: string;
    ubigeoDestino: string;
    /** D = domicilio, O = oficina/tienda. */
    tipoEntrega?: 'D' | 'O';
    tipoEnvio?: number;
    peso: number;
    tarifaSocio?: boolean;
}

export const olvaService = {
    getConfig: async (): Promise<OlvaConfig> => unwrap(await api.get('/olva/config')),

    actualizarConfig: async (payload: ConfigOlvaPayload): Promise<OlvaConfig> =>
        unwrap(await api.patch('/olva/config', payload)),

    /** Rastreo con caché de 10 min; `refresh` fuerza consulta en vivo. */
    track: async (trackingNumber: string, opts: { year?: string; refresh?: boolean } = {}): Promise<any> =>
        unwrap(await api.post('/olva/track', { trackingNumber, ...opts })),

    cotizar: async (payload: CotizarOlvaPayload): Promise<any> =>
        unwrap(await api.post('/olva/cotizar', payload)),

    /** Datos del destinatario por DNI/RUC (los expone el propio proveedor). */
    buscarPersona: async (tipoDoc: 'DNI' | 'RUC' | 'CE', nroDoc: string): Promise<any> =>
        unwrap(await api.get(`/olva/persona/${tipoDoc}/${nroDoc}`)),

    /** Genera la guía en Olva desde el despacho de un comprobante. */
    // Igual que Shalom: registrar la guía tarda más que el timeout general de 12 s.
    crearGuia: async (comprobanteId: number, payload: CrearGuiaOlvaPayload = {}): Promise<GuiaOlvaCreada> =>
        unwrap(await api.post(`/olva/guia/${comprobanteId}`, payload, { timeout: 90_000 })),
};
