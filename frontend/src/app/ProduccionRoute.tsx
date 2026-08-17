import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../zustand/auth';
import { esRubroFabricacion } from '@/utils/rubro-features';
import Loading from '@/components/Loading';

interface ProduccionRouteProps {
  children: React.ReactNode;
  fallbackPath?: string;
}

export function ProduccionRoute({
  children,
  fallbackPath = '/administrador',
}: ProduccionRouteProps) {
  const { auth, isLoading } = useAuthStore();
  const hasAccessToken = typeof window !== 'undefined' && !!localStorage.getItem('ACCESS_TOKEN');

  if (!hasAccessToken) {
    return <Navigate to="/login" replace />;
  }

  if (!auth) {
    if (isLoading) return <Loading />;
    return <Navigate to="/login" replace />;
  }

  const habilitado = esRubroFabricacion(auth?.empresa?.rubro?.nombre);
  if (!habilitado) {
    return <Navigate to={fallbackPath} replace />;
  }

  return <>{children}</>;
}
