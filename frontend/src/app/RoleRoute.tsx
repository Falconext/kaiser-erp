import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../zustand/auth'
import Loading from '@/components/Loading'

interface RoleRouteProps {
  children: React.ReactNode
  allowedRoles: string[]
  fallbackPath?: string
}

export function RoleRoute({ children, allowedRoles, fallbackPath = '/administrador' }: RoleRouteProps) {
  const { auth, isLoading, bootstrapDone } = useAuthStore()
  const hasAccessToken = typeof window !== 'undefined' && !!localStorage.getItem('ACCESS_TOKEN')
  const hasRefreshToken = typeof window !== 'undefined' && !!localStorage.getItem('REFRESH_TOKEN')

  if (!hasAccessToken || !hasRefreshToken) {
    return <Navigate to="/login" replace />
  }

  if (!auth) {
    if (!bootstrapDone || isLoading) return <Loading />
    return <Navigate to="/login" replace />
  }

  if (!allowedRoles.includes(auth.rol)) {
    return <Navigate to={fallbackPath} replace />
  }

  return <>{children}</>
}
