import { useMutation, useQueryClient } from '@tanstack/react-query'
import { logout } from '@/services/authService'
import { useAuthStore } from '@/stores/useAuthStore'

export function useLogoutMutation() {
  const clearSession = useAuthStore((state) => state.clearSession)
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => logout(),
    onSettled: () => {
      clearSession()
      queryClient.removeQueries({ queryKey: ['me'] })
    },
  })
}
