import { useMutation } from '@tanstack/react-query'
import { httpClient } from '@/services/httpClient'
import { useAuthStore } from '@/stores/useAuthStore'

export function useLogoutMutation() {
  const clearSession = useAuthStore((s) => s.clearSession)

  return useMutation({
    mutationFn: async () => {
      await httpClient.post('/platform/auth/logout')
    },
    onSettled: () => {
      // Always clear local session, even if the network call failed —
      // the user should never get stuck "logged in" client-side.
      clearSession()
    },
  })
}
