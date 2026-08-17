import axios from 'axios'
import { useAuthStore } from '@/zustand/auth'

const inferDefaultBaseUrl = () => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL
  }

  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'http://localhost:4001/api'
    }
    if (/^192\.168\./.test(hostname) || /^10\./.test(hostname)) {
      return `http://${hostname}:4001/api`
    }
  }

  return import.meta.env.VITE_API_FALLBACK_URL || 'https://api.vendify.pe/api'
}

const BASE_URL = inferDefaultBaseUrl()

let isRefreshing = false
let failedQueue: Array<{
  resolve: (token: string) => void
  reject: (err: any) => void
}> = []

function processQueue(error: any, token: string | null = null) {
  failedQueue.forEach(({ resolve, reject }) => {
    error ? reject(error) : resolve(token!)
  })
  failedQueue = []
}

const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 12_000, // 12s — evita que requests colgados dejen el loading indefinido
})

// Request interceptor: inject access token
apiClient.interceptors.request.use(config => {
  const url = String(config.url || '')
  const token = url.includes('auth/select-sede')
    ? localStorage.getItem('PENDING_SEDE_TOKEN') || localStorage.getItem('ACCESS_TOKEN')
    : localStorage.getItem('ACCESS_TOKEN')
  const isFormData =
    typeof FormData !== 'undefined' &&
    config.data instanceof FormData

  if (config.headers) {
    // Cuando es FormData, dejar que el navegador construya el multipart boundary
    if (isFormData) {
      if (typeof (config.headers as { set?: (name: string, value?: string) => void }).set === 'function') {
        (config.headers as { set: (name: string, value?: string) => void }).set('Content-Type', undefined)
      } else {
        const raw = config.headers as Record<string, unknown>
        delete raw['Content-Type']
        delete raw['content-type']
      }
    } else if (
      typeof (config.headers as { set?: (name: string, value?: string) => void }).set === 'function'
    ) {
      (config.headers as { set: (name: string, value?: string) => void }).set('Content-Type', 'application/json')
    }
  }

  if (token && config.headers) {
    config.headers['Authorization'] = `Bearer ${token}`
  }
  return config
})

// Response interceptor: handle token refresh
apiClient.interceptors.response.use(
  res => res,
  async err => {
    const originalReq = err.config
    const status = err.response?.status
    const errorCode = err.response?.data?.code
    const url = (originalReq?.url || '') as string
    const isAuthLogin = url.includes('/auth/login')
    const isAuthRefresh = url.includes('/auth/refresh')

    // Never try to refresh for authentication endpoints
    if (isAuthLogin || isAuthRefresh) {
      return Promise.reject(err)
    }

    if (!originalReq._retry && (status === 401 || errorCode === 21)) {
      originalReq._retry = true

      const storedRefresh = localStorage.getItem('REFRESH_TOKEN')
      if (!storedRefresh) {
        // No refresh token available: reject without redirect to avoid page reloads on login screen
        return Promise.reject(err)
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        }).then(token => {
          originalReq.headers!['Authorization'] = `Bearer ${token}`
          return apiClient(originalReq)
        })
      }

      isRefreshing = true
      try {
        const refreshToken = storedRefresh

        const { data: refreshResp }: any = await axios.post(
          `${BASE_URL}/auth/refresh`,
          { refreshToken }
        )

        // Support both wrapped and plain responses
        const payload = refreshResp?.data && refreshResp?.code !== undefined ? refreshResp.data : refreshResp
        if (!payload?.accessToken || !payload?.refreshToken) {
          throw new Error('Refresh failed')
        }

        const { accessToken, refreshToken: newRt } = payload
        localStorage.setItem('ACCESS_TOKEN', accessToken)
        localStorage.setItem('REFRESH_TOKEN', newRt)

        processQueue(null, accessToken)

        originalReq.headers!['Authorization'] = `Bearer ${accessToken}`
        return apiClient(originalReq)

      } catch (refreshError) {
        processQueue(refreshError, null)
        // Only force logout+redirect if user had tokens stored
        const hadAccess = !!localStorage.getItem('ACCESS_TOKEN')
        const hadRefresh = !!localStorage.getItem('REFRESH_TOKEN')
        if (hadAccess || hadRefresh) {
          useAuthStore.getState().logout()
          window.location.href = '/login'
        }
        return Promise.reject(refreshError)
      } finally {
        isRefreshing = false
      }
    }

    return Promise.reject(err)
  }
)

export default apiClient
