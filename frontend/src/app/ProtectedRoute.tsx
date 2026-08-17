import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../zustand/auth'
import Loading from '@/components/Loading'


export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { auth, isLoading, bootstrapDone } = useAuthStore()
  const hasAccessToken = typeof window !== 'undefined' && !!localStorage.getItem('ACCESS_TOKEN')
  const hasRefreshToken = typeof window !== 'undefined' && !!localStorage.getItem('REFRESH_TOKEN')

  if (!hasAccessToken || !hasRefreshToken) {
    return <Navigate to="/login" replace />
  }

  if (auth) return <>{children}</>
  if (!bootstrapDone || isLoading) return <Loading />
  if (!auth) return <Navigate to="/login" replace />
  return <>{children}</>
}
