import type { AxiosResponse } from 'axios'
import apiClient from './apiClient'

interface ApiResponse<T> {
  code?: number
  success: boolean
  data?: T
  error?: string
}

async function handleResponse<T>(response: AxiosResponse<T>): Promise<T> {
  if (!response.status) {
    throw new Error('No se recibió respuesta del servidor')
  }
  if (!response.data) {
    throw new Error('La respuesta del servidor no contiene datos')
  }
  return response.data
}

export async function get<T>(endpoint: string): Promise<ApiResponse<T>> {
  try {
    const resp = await apiClient.get<T>(endpoint)
    const result: any = await handleResponse(resp)
    if (result.code === 0) {
      throw new Error(result.message || 'Error desconocido')
    }
    return { ...result, success: true }
  } catch (e: any) {
    return { success: false, error: e.response?.data?.message || e.message }
  }
}

export async function post<T>(endpoint: string, data: any, config?: any): Promise<ApiResponse<T>> {
  try {
    const resp = await apiClient.post<T>(endpoint, data, config)
    const result: any = await handleResponse(resp)
    if (result.code === 0) {
      throw new Error(result.message || 'Error desconocido')
    }
    return { ...result, success: true }
  } catch (e: any) {
    return { success: false, error: e.response?.data?.message || e.message }
  }
}

export async function put<T>(endpoint: string, data: any): Promise<ApiResponse<T>> {
  try {
    const resp = await apiClient.put<T>(endpoint, data)
    const result: any = await handleResponse(resp)
    if (result.code === 0) {
      throw new Error(result.message || 'Error desconocido')
    }
    return { ...result, success: true }
  } catch (e: any) {
    return { success: false, error: e.response?.data?.message || e.message }
  }
}

export async function patch<T>(endpoint: string, data: any = {}): Promise<ApiResponse<T>> {
  try {
    const resp = await apiClient.patch<T>(endpoint, data)
    const result: any = await handleResponse(resp)
    if (result.code === 0) {
      throw new Error(result.message || 'Error desconocido')
    }
    return { ...result, success: true }
  } catch (e: any) {
    return { success: false, error: e.response?.data?.message || e.message }
  }
}

export async function del<T>(endpoint: string): Promise<ApiResponse<T>> {
  try {
    const resp = await apiClient.delete<T>(endpoint)
    const result: any = await handleResponse(resp)
    if (result.code === 0) {
      throw new Error(result.message || 'Error desconocido')
    }
    return { ...result, success: true }
  } catch (e: any) {
    return { success: false, error: e.response?.data?.message || e.message }
  }
}
