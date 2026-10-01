import api from '../utils/apiClient';

// El backend envuelve todo en { code, message, data } (ResponseInterceptor).
const unwrap = (response: any) => response?.data?.data ?? response?.data;

/**
 * Mensaje legible de un error de la API. Los errores de Shalom son informativos
 * ("configura la agencia de origen", "ya tiene la guía X"), así que hay que
 * sacarlos del envelope { code: 0, message } en vez de mostrar el de axios.
 */
export const mensajeErrorShalom = (error: unknown, porDefecto: string): string => {
    const data = (error as any)?.response?.data;
    return data?.message || data?.error?.message || porDefecto;
};

/** Estado de la cuenta Shalom Pro conectada por la empresa. */
export interface ShalomInstancia {
    /** El plan de la empresa habilita crear guías (solo Corporativo). */
    habilitadoPorPlan: boolean;
    conectada: boolean;
    instanceId?: string | null;
    nombre?: string | null;
    estado?: 'CONECTADA' | 'ERROR' | null;
    error?: string | null;
    sincronizadoEn?: string | null;
    email?: string | null;
    credencialesGuardadas: boolean;
    securityCodeGuardado: boolean;
    agenciaOrigenId?: string | null;
    agenciaOrigenNombre?: string | null;
    /** La venta genera la guía sola al cerrarse (opt-in por empresa). */
    autoGuiaActivo?: boolean;
    /** Claves de retiro propias, separadas por coma ("1010,1011"); vacío = aleatoria. */
    clavesRetiro?: string;
    /** Tamaño de paquete por defecto (SOBRE|XXS|XS|S|M|L). */
    tamanoDefault?: string;
}

/** Clave de retiro sugerida para la próxima guía (GET /shalom/clave-retiro). */
export interface ShalomClaveRetiro {
    clave: string;
    origen: 'HOY' | 'CONFIGURADA' | 'ALEATORIA';
    /** Claves usadas ayer: Shalom las rechaza hoy. */
    usadasAyer: string[];
    claveHoy: string | null;
    configuradas: string[];
}

export interface ConectarInstanciaPayload {
    nombre?: string;
    username?: string;
    password?: string;
    securityCode?: string;
    agenciaOrigenId?: string;
    agenciaOrigenNombre?: string;
    autoGuiaActivo?: boolean;
    clavesRetiro?: string;
    tamanoDefault?: string;
}

export interface CrearGuiaPayload {
    /** Clave de retiro (4 dígitos) escrita por el usuario; si no va, el backend sugiere. */
    clave?: string;
    origenId?: string;
    origenNombre?: string;
    destinoId?: string;
    destinoNombre?: string;
    dni?: string;
    nombre?: string;
    telefono?: string;
    direccion?: string;
    forzar?: boolean;
}

export interface GuiaCreada {
    id: number;
    nroOrden: string | null;
    claveOrden: string | null;
    claveEnvio: string | null;
    shalomGuiaCreadaEn: string | null;
    /** Shalom rechazó la clave escrita y la guía salió con otra. */
    claveReemplazada?: { solicitada: string; usada: string; motivo: string };
}

/** Tipo de producto/paquete de Shalom, con sus medidas por defecto. */
export interface ShalomProducto {
    id: number;
    nombre: string;
    /** SOBRE | XXS | XS | S | M | L */
    key?: string;
    content?: string;
    porDefecto?: boolean;
}

/** Tarifa por tamaño para una ruta (GET /shalom/tarifa?destinoId=). */
export interface ShalomTarifa {
    origen: number;
    destino: number;
    leadTime: string | null;
    tamanos: { id: number; key: string; nombre: string; precio: number | null }[];
}

export const shalomService = {
    /** Productos de la cuenta Shalom Pro de la empresa (derivados de su historial). */
    claveRetiro: async (): Promise<ShalomClaveRetiro> =>
        unwrap(await api.get('/shalom/clave-retiro')),
    // La cotización del proveedor a veces tarda más de los 12 s del timeout
    // general la primera vez que se pide una ruta (luego responde en <1 s).
    tarifa: async (destinoId: string | number, origenId?: string | number): Promise<ShalomTarifa> =>
        unwrap(await api.get('/shalom/tarifa', { params: { destinoId, ...(origenId ? { origenId } : {}) }, timeout: 40_000 })),
    productos: async (): Promise<ShalomProducto[]> =>
        unwrap(await api.get('/shalom/productos')) ?? [],

    getInstancia: async (): Promise<ShalomInstancia> =>
        unwrap(await api.get('/shalom/instancia')),

    conectar: async (payload: ConectarInstanciaPayload): Promise<ShalomInstancia> =>
        unwrap(await api.post('/shalom/instancia', payload)),

    actualizarConfig: async (payload: ConectarInstanciaPayload): Promise<ShalomInstancia> =>
        unwrap(await api.patch('/shalom/instancia', payload)),

    reconectar: async (): Promise<ShalomInstancia> =>
        unwrap(await api.post('/shalom/instancia/reconectar', {})),

    desconectar: async (): Promise<ShalomInstancia> =>
        unwrap(await api.delete('/shalom/instancia')),

    pendientes: async (): Promise<any> => unwrap(await api.get('/shalom/pendientes')),

    /** Genera la guía en Shalom Pro desde el despacho de un comprobante. */
    // Crear la guía tarda más que el timeout general (12 s): el proveedor abre
    // sesión en Shalom Pro y registra el envío. Con 12 s el front decía "No se
    // pudo generar" cuando Shalom SÍ la había creado (y el N° de orden quedaba
    // guardado sin que la cajera lo viera hasta reabrir).
    crearGuia: async (comprobanteId: number, payload: CrearGuiaPayload = {}): Promise<GuiaCreada> =>
        unwrap(await api.post(`/shalom/guia/${comprobanteId}`, payload, { timeout: 90_000 })),
};
