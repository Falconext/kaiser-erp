import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { del, get, patch, post, put } from '../utils/fetch';
import useAlertStore from './alert';

// Definición de permisos por módulos
export const MODULOS_SISTEMA = [
  { id: 'dashboard', nombre: 'Dashboard', descripcion: 'Acceso al panel principal' },
  { id: 'comprobantes', nombre: 'Comprobantes', descripcion: 'Gestión de facturas, boletas y notas' },
  { id: 'clientes', nombre: 'Clientes', descripcion: 'Gestión de clientes' },
  { id: 'kardex', nombre: 'Kardex', descripcion: 'Gestión de inventario y movimientos' },
  { id: 'reportes', nombre: 'Reportes', descripcion: 'Reportes y contabilidad' },
  { id: 'configuracion', nombre: 'Configuración', descripcion: 'Configuración del sistema' },
  { id: 'usuarios', nombre: 'Usuarios', descripcion: 'Gestión de usuarios del sistema' },
  { id: 'caja', nombre: 'Caja', descripcion: 'Apertura, cierre y movimientos de caja' },
  { id: 'pagos', nombre: 'Gestión de pagos', descripcion: 'Cobros, pagos y conciliaciones' },
];

// Helper para parsear permisos de forma segura (maneja JSON y formato legacy 'ALL')
const safeParsePermisos = (permisos: string | null | undefined): string[] => {
  if (!permisos) return [];
  // Si ya es un array (no debería pasar pero por seguridad)
  if (Array.isArray(permisos)) return permisos;
  // Manejar formato legacy 'ALL' 
  if (permisos === 'ALL') return ['*'];
  // Intentar parsear como JSON
  try {
    const parsed = JSON.parse(permisos);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    // Si falla el parsing, devolver array vacío
    console.warn('Error parsing permisos:', permisos);
    return [];
  }
};

export interface IUsuario {
  id: number;
  nombre: string;
  email: string;
  dni: string;
  celular: string;
  rol: 'ADMIN_EMPRESA' | 'USUARIO_EMPRESA';
  empresaId: number;
  estado: 'ACTIVO' | 'INACTIVO';
  permisos?: string[];
  sedes?: { id: number; nombre: string; codigo: string | null; esPrincipal: boolean }[];
  subModulos?: { id: number; codigo: string; nombre: string; moduloId: number }[];
  comisionGlobal?: number;
  comisionGlobalFija?: number;
  comisionGlobalVenta?: number;
}

export interface IFormUsuario {
  id?: number;
  nombre: string;
  email: string;
  dni: string;
  celular: string;
  password?: string;
  permisos: string[];
  sedeIds?: number[];
  subModuloIds?: number[];
  comisionGlobal?: number;
  comisionGlobalFija?: number;
  comisionGlobalVenta?: number;
}

export interface IUsersState {
  usuarios: IUsuario[];
  totalUsuarios: number;
  loading: boolean;

  // Métodos CRUD
  getAllUsers: (params: { page?: number; limit?: number; search?: string }) => Promise<void>;
  createUser: (data: IFormUsuario) => Promise<void>;
  updateUser: (id: number, data: Partial<IFormUsuario>) => Promise<void>;
  toggleUserState: (id: number) => Promise<void>;

  // Utilidades
  resetUsers: () => void;
  hasPermission: (userPermisos: string[], modulo: string) => boolean;
}

export const useUsersStore = create<IUsersState>()(
  devtools(
    (set, _get) => ({
      usuarios: [],
      totalUsuarios: 0,
      loading: false,

      getAllUsers: async (params) => {
        try {
          set({ loading: true });

          const filteredParams = Object.entries(params)
            .filter(([_, value]) => value !== undefined)
            .reduce((obj, [key, value]) => ({ ...obj, [key]: value }), {});

          const query = new URLSearchParams(filteredParams).toString();
          const response: any = await get(`usuario?${query}`);

          if (response.code === 1) {
            // Parsear permisos de JSON a array
            const usuariosConPermisos = (response.data.items || []).map((user: any) => ({
              ...user,
              permisos: safeParsePermisos(user.permisos),
              subModulos: user.subModulos || [],
            }));

            set({
              usuarios: usuariosConPermisos,
              totalUsuarios: response.data.total || 0,
            });

            useAlertStore.setState({ success: true });
          } else {
            set({ usuarios: [], totalUsuarios: 0 });
            useAlertStore.getState().alert(response.message || 'Error al cargar usuarios', 'error');
          }
        } catch (error: any) {
          console.error('Error al cargar usuarios:', error);
          useAlertStore.getState().alert(error.message || 'Error al cargar usuarios', 'error');
          set({ usuarios: [], totalUsuarios: 0 });
        } finally {
          set({ loading: false });
        }
      },

      createUser: async (data) => {
        try {
          set({ loading: true });

          const response: any = await post('usuario', data);

          if (response.code === 1) {
            await _get().getAllUsers({ page: 1, limit: 50 });
            useAlertStore.getState().alert('Usuario creado exitosamente', 'success');
          } else {
            const raw = (response as any).error || (response as any).message;
            const msg = Array.isArray(raw) ? raw.join(', ') : (raw || 'Error al crear usuario');
            throw new Error(msg);
          }
        } catch (error: any) {
          set({ loading: false });
          throw error;
        } finally {
          set({ loading: false });
        }
      },

      updateUser: async (id, data) => {
        try {
          set({ loading: true });

          const response: any = await put(`usuario/${id}`, data);

          if (response.code === 1) {
            await _get().getAllUsers({ page: 1, limit: 50 });
            useAlertStore.getState().alert('Usuario actualizado exitosamente', 'success');
          } else {
            useAlertStore.getState().alert(response.message || 'Error al actualizar usuario', 'error');
          }
        } catch (error: any) {
          console.error('Error al actualizar usuario:', error);
          useAlertStore.getState().alert(error.message || 'Error al actualizar usuario', 'error');
        } finally {
          set({ loading: false });
        }
      },

      toggleUserState: async (id) => {
        try {
          set({ loading: true });

          const usuario = _get().usuarios.find((u) => u.id === id);
          if (!usuario) {
            useAlertStore.getState().alert('Usuario no encontrado', 'error');
            return;
          }

          const nuevoEstado = usuario.estado === 'ACTIVO' ? 'INACTIVO' : 'ACTIVO';
          const response: any = await patch(`usuario/${id}/estado`, { estado: nuevoEstado });

          if (response.code === 1) {
            set((state) => ({
              usuarios: state.usuarios.map((user) =>
                user.id === id ? { ...user, estado: nuevoEstado } : user
              ),
            }));

            const mensaje = nuevoEstado === 'ACTIVO' ? 'Usuario activado' : 'Usuario desactivado';
            useAlertStore.getState().alert(mensaje, 'success');
          } else {
            useAlertStore.getState().alert(response.message || 'Error al cambiar estado', 'error');
          }
        } catch (error: any) {
          console.error('Error al cambiar estado:', error);
          useAlertStore.getState().alert(error.message || 'Error al cambiar estado', 'error');
        } finally {
          set({ loading: false });
        }
      },

      resetUsers: () => {
        set({ usuarios: [], totalUsuarios: 0 });
      },

      hasPermission: (userPermisos: string[], modulo: string) => {
        // Si no tiene permisos definidos, no tiene acceso
        if (!userPermisos || userPermisos.length === 0) return false;

        // Si tiene acceso completo
        if (userPermisos.includes('*')) return true;

        // Si tiene acceso específico al módulo
        return userPermisos.includes(modulo);
      },
    }),
    {
      name: 'users-storage',
    }
  )
);