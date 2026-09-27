import { useAuthStore } from '@/zustand/auth';
import { hasPermission } from '@/utils/permissions';

/**
 * Espejo de `PermisosGuard` del backend para los controles que escriben.
 *
 * El backend abre las lecturas a cualquier usuario autenticado y exige el
 * permiso del área solo en lo que muta (ver PERMISOS_POR_ROL en init-db.ts).
 * Con esto la pantalla oculta el botón en vez de dejar que el usuario lo
 * pulse y se lleve un 403.
 *
 *   const puedeEditarInventario = usePuedeEscribir('kardex:escribir');
 */
export function usePuedeEscribir(...permisos: string[]): boolean {
  const auth = useAuthStore((s) => s.auth);
  return permisos.some((p) => hasPermission(auth as never, p));
}
