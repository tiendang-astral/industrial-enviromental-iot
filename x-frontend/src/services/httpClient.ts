import axios from 'axios'
import { API_BASE_URL } from '@/lib/constants'
import type { ApiEnvelope } from '@/types/api'
import type { LoginResponse } from '@/types/auth'

let accessToken: string | null = null
let refreshInFlight: Promise<string> | null = null
let onTokenRefreshed: ((data: LoginResponse) => void) | null = null
let onSessionExpired: (() => void) | null = null

export function setAccessToken(token: string | null) {
  accessToken = token
}

/** Dùng cho STOMP client — CONNECT frame cần raw token, không đi qua axios interceptor. */
export function getAccessToken(): string | null {
  return accessToken
}

/**
 * Đăng ký callback cập nhật/xóa session khi interceptor tự refresh token —
 * tránh import vòng (useAuthStore đã import setAccessToken từ file này).
 */
export function registerAuthCallbacks(handlers: {
  onTokenRefreshed: (data: LoginResponse) => void
  onSessionExpired: () => void
}) {
  onTokenRefreshed = handlers.onTokenRefreshed
  onSessionExpired = handlers.onSessionExpired
}

export const httpClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
})

httpClient.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`
  }
  return config
})

httpClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config
    const isAuthEndpoint = originalRequest?.url?.startsWith('/tenant/auth/')
    // JWT thiếu/hết hạn ở backend trả 403 (Spring Security 6 coi request anonymous
    // là AccessDenied, không phải 401) — bắt cả 2 mã để không bỏ sót; @PreAuthorize
    // từ chối thật (role/scope không đủ) cũng 403 nhưng retry sau refresh vẫn 403,
    // không lặp vô hạn nhờ cờ __isRetry, chỉ tốn 1 lần gọi thừa.
    const status = error.response?.status
    const isAuthFailure = status === 401 || status === 403

    if (isAuthFailure && originalRequest && !isAuthEndpoint && !originalRequest.__isRetry) {
      originalRequest.__isRetry = true
      try {
        const token = await refreshAccessToken()
        originalRequest.headers.Authorization = `Bearer ${token}`
        return httpClient.request(originalRequest)
      } catch (refreshError) {
        setAccessToken(null)
        onSessionExpired?.()
        return Promise.reject(refreshError)
      }
    }
    return Promise.reject(error)
  }
)

function refreshAccessToken(): Promise<string> {
  if (!refreshInFlight) {
    refreshInFlight = httpClient
      .post<ApiEnvelope<LoginResponse>>('/tenant/auth/refresh')
      .then(({ data }) => {
        const result = data.data!
        setAccessToken(result.accessToken)
        onTokenRefreshed?.(result)
        return result.accessToken
      })
      .finally(() => {
        refreshInFlight = null
      })
  }
  return refreshInFlight
}
