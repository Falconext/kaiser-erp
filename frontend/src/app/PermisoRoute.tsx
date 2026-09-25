import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../zustand/auth';
import { hasPermission } from '@/utils/permissions';
import Loading from '@/components/Loading';

interface PermisoRouteProps {
  children: React.ReactNode;
  /** Basta con tener UNO de estos permisos (mismo criterio que PermisosGuard en el backend). */
  permisos: string[];
  fallbackPath?: string;
}

/**
 * Bloquea una ruta si el usuario no tiene el permiso del módulo.
 *
 * Sin esto, un usuario sin permiso podía llegar a la página escribiendo la URL:
 * el backend respondía 403 pero la vista renderizaba igual y mostraba los
 * importes en S/ 0.00, como si el negocio no tuviera ventas. Es preferible no
 * entrar a la página que enseñar ceros que parecen datos.
 *
 * Los ADMIN pasan siempre (lo resuelve `hasPermission`).
 */
export function PermisoRoute({
  children,
  permisos,
  fallbackPath = '/administrador',
}: PermisoRouteProps) {
  const { auth, isLoading } = useAuthStore();
  const hasAccessToken =
    typeof window !== 'undefined' && !!localStorage.getItem('ACCESS_TOKEN');

  if (!hasAccessToken) return <Navigate to="/login" replace />;

  if (!auth) {
    if (isLoading) return <Loading />;
    return <Navigate to="/login" replace />;
  }

  const permitido = permisos.some((p) => hasPermission(auth as never, p));
  if (!permitido) return <Navigate to={fallbackPath} replace />;

  return <>{children}</>;
}
