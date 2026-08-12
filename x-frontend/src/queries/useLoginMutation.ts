import { useMutation, useQueryClient } from '@tanstack/react-query'
import { login } from '@/services/authService'
import { useAuthStore } from '@/stores/useAuthStore'
import type { LoginRequest } from '@/types/auth'

export function useLoginMutation() {
  const setSession = useAuthStore((state) => state.setSession)
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: LoginRequest) => login(payload),
    onSuccess: (data) => {
      setSession(data.accessToken, data.user)
      queryClient.setQueryData(['me'], data.user)
    },
  })
}
