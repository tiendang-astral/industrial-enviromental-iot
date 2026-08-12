import { isAxiosError } from 'axios'
import type { ApiError, ApiResponse } from '@/types/api'

export function getApiError(error: unknown): ApiError | null {
  if (isAxiosError<ApiResponse<null>>(error) && error.response?.data?.error) {
    return error.response.data.error
  }
  return null
}

export function getApiErrorMessage(
  error: unknown,
  fallback = 'Đã xảy ra lỗi, vui lòng thử lại'
): string {
  return getApiError(error)?.message ?? fallback
}
