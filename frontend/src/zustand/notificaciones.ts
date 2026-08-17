import { create } from 'zustand';
import axios from 'axios';
import { io, Socket } from 'socket.io-client';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4001/api';
const WS_URL = import.meta.env.VITE_WS_URL || (import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace('/api', '') : 'http://localhost:4001');

export interface NotificacionMetaData {
  comprobanteId?: number;
  guiaId?: number;
  serie?: string | null;
  correlativo?: number | null;
  tipoDoc?: string | null;
  errorMsg?: string | null;
}

export interface Notificacion {
  id: number;
  usuarioId: number;
  empresaId?: number;
  tipo: 'INFO' | 'WARNING' | 'CRITICAL';
  titulo: string;
  mensaje: string;
  leida: boolean;
  creadoEn: string;
  metaData?: NotificacionMetaData | null;
}

interface NotificacionesState {
  notificaciones: Notificacion[];
  noLeidas: number;
  loading: boolean;
  error: string | null;
  mostrarPanel: boolean;
  sonidoHabilitado: boolean;
  pushHabilitado: boolean;
  
  // Actions
  obtenerNotificaciones: () => Promise<void>;
  marcarComoLeida: (id: number) => Promise<void>;
  marcarTodasComoLeidas: () => Promise<void>;
  togglePanel: () => void;
  cerrarPanel: () => void;
  iniciarPolling: () => void;
  detenerPolling: () => void;
  iniciarWebSocket: () => void;
  detenerWebSocket: () => void;
  toggleSonido: () => void;
  togglePush: () => void;
  solicitarPermisoPush: () => Promise<void>;
  agregarNotificacion: (notificacion: Notificacion) => void;
}

let pollingInterval: NodeJS.Timeout | null = null;
let socket: Socket | null = null;
let audioContext: AudioContext | null = null;

// Función para reproducir sonido de notificación
const reproducirSonido = () => {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();
  
  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);
  
  oscillator.frequency.value = 800;
  oscillator.type = 'sine';
  
  gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
  
  oscillator.start(audioContext.currentTime);
  oscillator.stop(audioContext.currentTime + 0.5);
};

// Función para mostrar push notification
const mostrarPushNotification = (notificacion: Notificacion) => {
  if ('Notification' in window && Notification.permission === 'granted') {
    const notification = new Notification(notificacion.titulo, {
      body: notificacion.mensaje,
      icon: '/logonephi.png',
      badge: '/logonephi.png',
      tag: `notificacion-${notificacion.id}`,
      requireInteraction: notificacion.tipo === 'CRITICAL',
    });

    notification.onclick = () => {
      window.focus();
      notification.close();
    };
  }
};

export const useNotificacionesStore = create<NotificacionesState>((set, get) => ({
  notificaciones: [],
  noLeidas: 0,
  loading: false,
  error: null,
  mostrarPanel: false,
  sonidoHabilitado: localStorage.getItem('notificaciones_sonido') !== 'false',
  pushHabilitado: localStorage.getItem('notificaciones_push') === 'true',

  obtenerNotificaciones: async () => {
    try {
      set({ loading: true, error: null });
      const token = localStorage.getItem('ACCESS_TOKEN');
      
      if (!token) {
        set({ loading: false });
        return;
      }

      const response = await axios.get(`${API_URL}/notificaciones`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log(response.data)
      set({
        notificaciones: response.data?.data?.notificaciones,
        noLeidas: response.data?.data?.noLeidas,
        loading: false,
      });
    } catch (error: any) {
      console.error('Error al obtener notificaciones:', error);
      set({
        error: error.response?.data?.message || 'Error al cargar notificaciones',
        loading: false,
      });
    }
  },

  marcarComoLeida: async (id: number) => {
    try {
      const token = localStorage.getItem('ACCESS_TOKEN');
      
      if (!token) return;

      await axios.patch(
        `${API_URL}/notificaciones/${id}/leer`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Actualizar estado local
      set((state) => ({
        notificaciones: state.notificaciones.map((n) =>
          n.id === id ? { ...n, leida: true } : n
        ),
        noLeidas: Math.max(0, state.noLeidas - 1),
      }));
    } catch (error: any) {
      console.error('Error al marcar notificación como leída:', error);
    }
  },

  marcarTodasComoLeidas: async () => {
    try {
      const token = localStorage.getItem('ACCESS_TOKEN');
      
      if (!token) return;

      await axios.patch(
        `${API_URL}/notificaciones/leer-todas`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Actualizar estado local
      set((state) => ({
        notificaciones: state.notificaciones.map((n) => ({ ...n, leida: true })),
        noLeidas: 0,
      }));
    } catch (error: any) {
      console.error('Error al marcar todas como leídas:', error);
    }
  },

  togglePanel: () => {
    set((state) => ({ mostrarPanel: !state.mostrarPanel }));
  },

  cerrarPanel: () => {
    set({ mostrarPanel: false });
  },

  iniciarPolling: () => {
    const token = localStorage.getItem('ACCESS_TOKEN');
    if (!token) {
      console.warn('⚠️ No hay token, polling no iniciará');
      return;
    }

    // Obtener notificaciones inmediatamente
    get().obtenerNotificaciones();

    // Configurar polling cada 30 segundos
    pollingInterval = setInterval(() => {
      get().obtenerNotificaciones();
    }, 30000); // 30 segundos
  },

  detenerPolling: () => {
    if (pollingInterval) {
      clearInterval(pollingInterval);
      pollingInterval = null;
    }
  },

  iniciarWebSocket: () => {
    const token = localStorage.getItem('ACCESS_TOKEN');
    
    if (!token) {
      console.warn('⚠️ No hay token en localStorage, WebSocket no se conectará');
      return;
    }
    
    if (socket?.connected) {
      console.log('ℹ️ WebSocket ya está conectado');
      return;
    }

    console.log('🔌 Iniciando conexión WebSocket...');

    socket = io(WS_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
    });

    socket.on('connect', () => {
      console.log('✅ WebSocket conectado exitosamente');
    });

    socket.on('nueva-notificacion', (notificacion: Notificacion) => {
      console.log('📬 Nueva notificación recibida:', notificacion);
      get().agregarNotificacion(notificacion);
    });

    socket.on('disconnect', () => {
      console.log('❌ WebSocket desconectado');
    });

    socket.on('error', (error: any) => {
      console.error('❌ Error en WebSocket:', error);
    });
  },

  detenerWebSocket: () => {
    if (socket) {
      socket.disconnect();
      socket = null;
    }
  },

  agregarNotificacion: (notificacion: Notificacion) => {
    set((state) => ({
      notificaciones: [notificacion, ...state.notificaciones],
      noLeidas: state.noLeidas + 1,
    }));

    // Reproducir sonido si está habilitado
    if (get().sonidoHabilitado) {
      reproducirSonido();
    }

    // Mostrar push notification si está habilitado
    if (get().pushHabilitado) {
      mostrarPushNotification(notificacion);
    }
  },

  toggleSonido: () => {
    set((state) => {
      const nuevoEstado = !state.sonidoHabilitado;
      localStorage.setItem('notificaciones_sonido', String(nuevoEstado));
      return { sonidoHabilitado: nuevoEstado };
    });
  },

  togglePush: () => {
    set((state) => {
      const nuevoEstado = !state.pushHabilitado;
      localStorage.setItem('notificaciones_push', String(nuevoEstado));
      return { pushHabilitado: nuevoEstado };
    });
  },

  solicitarPermisoPush: async () => {
    if (!('Notification' in window)) {
      console.warn('Este navegador no soporta notificaciones');
      return;
    }

    if (Notification.permission === 'granted') {
      set({ pushHabilitado: true });
      localStorage.setItem('notificaciones_push', 'true');
      return;
    }

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        set({ pushHabilitado: true });
        localStorage.setItem('notificaciones_push', 'true');
      }
    }
  },
}));
