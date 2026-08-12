import { useMutation } from '@tanstack/react-query'
import { httpClient } from '@/services/httpClient'
import { useAuthStore } from '@/stores/useAuthStore'
import type { ApiResponse } from '@/types/api'
import type { LoginRequest, LoginResponse } from '@/types/auth'

export function useLoginMutation() {
  const setSession = useAuthStore((s) => s.setSession)

  return useMutation({
    mutationFn: async (payload: LoginRequest) => {
      const { data } = await httpClient.post<ApiResponse<LoginResponse>>(
        '/platform/auth/login',
        payload
      )
      return data.data!
    },
    onSuccess: (data) => {
      setSession(data.accessToken, data.user)
    },
  })
}
