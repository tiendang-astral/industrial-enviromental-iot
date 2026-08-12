import { useMutation, useQueryClient } from '@tanstack/react-query'
import { changePassword } from '@/services/authService'
import { useAuthStore } from '@/stores/useAuthStore'
import type { ChangePasswordRequest } from '@/types/auth'

export function useChangePasswordMutation() {
  const clearSession = useAuthStore((state) => state.clearSession)
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: ChangePasswordRequest) => changePassword(payload),
    onSuccess: () => {
      // Backend revokes all refresh tokens on password change — force a fresh login.
      clearSession()
      queryClient.removeQueries({ queryKey: ['me'] })
    },
  })
}
