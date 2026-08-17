import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

/**
 * Verifica si WhatsApp está habilitado en el sistema
 */
export const verificarEstadoWhatsApp = async (): Promise<boolean> => {
    try {
        const token = localStorage.getItem('ACCESS_TOKEN');
        const response = await axios.get(`${API_URL}/whatsapp/status`, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });
        // Algunas APIs envuelven la respuesta dentro de múltiples niveles de 'data'
        // Soportar tanto { data: { habilitado } } como { data: { data: { habilitado } } }
        const d = response.data;
        const habilitado = d?.data?.habilitado ?? d?.data?.data?.habilitado ?? false;
        return !!habilitado;
    } catch (error) {
        console.error('Error verificando estado de WhatsApp:', error);
        return false;
    }
};

/**
 * Envía un comprobante por WhatsApp
 */
export const enviarComprobantePorWhatsApp = async (
    comprobanteId: number,
    numeroDestino: string,
    incluyeXML: boolean = false
): Promise<{ success: boolean; mensajeId?: string; error?: string }> => {
    try {
        const token = localStorage.getItem('ACCESS_TOKEN');
        const response = await axios.post(
            `${API_URL}/whatsapp/enviar/${comprobanteId}`,
            {
                numeroDestino,
                incluyeXML,
            },
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            }
        );
        console.log("RESPUESTA DEL WHATSAPP",response)
        if (response.data.data.code === 200) {
            return {
                success: true,
                mensajeId: response.data.data.mensajeId,
            };
        } else {
            return {
                success: false,
                error: response.data.data.message || 'Error al enviar comprobante',
            };
        }
    } catch (error: any) {
        console.error('Error enviando comprobante por WhatsApp:', error);
        return {
            success: false,
            error: error.response?.data?.data?.message || error.message || 'Error al enviar comprobante',
        };
    }
};

/**
 * Obtiene el historial de envíos de WhatsApp
 */
export const obtenerHistorialWhatsApp = async (
    page: number = 1,
    limit: number = 20
): Promise<any> => {
    try {
        const token = localStorage.getItem('ACCESS_TOKEN');
        const response = await axios.get(`${API_URL}/whatsapp/historial`, {
            params: { page, limit },
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });
        return response.data.data;
    } catch (error) {
        console.error('Error obteniendo historial de WhatsApp:', error);
        throw error;
    }
};

/**
 * Obtiene el costo de WhatsApp de la empresa
 */
export const obtenerCostoWhatsApp = async (
    fechaInicio?: string,
    fechaFin?: string
): Promise<any> => {
    try {
        const token = localStorage.getItem('ACCESS_TOKEN');
        const response = await axios.get(`${API_URL}/whatsapp/costo`, {
            params: { fechaInicio, fechaFin },
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });
        return response.data.data;
    } catch (error) {
        console.error('Error obteniendo costo de WhatsApp:', error);
        throw error;
    }
};

/**
 * Obtiene estadísticas globales de WhatsApp (solo ADMIN_SISTEMA)
 */
export const obtenerEstadisticasWhatsApp = async (
    fechaInicio?: string,
    fechaFin?: string
): Promise<any> => {
    try {
        const token = localStorage.getItem('ACCESS_TOKEN');
        const response = await axios.get(`${API_URL}/whatsapp/estadisticas`, {
            params: { fechaInicio, fechaFin },
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });
        return response.data.data;
    } catch (error) {
        console.error('Error obteniendo estadísticas de WhatsApp:', error);
        throw error;
    }
};
