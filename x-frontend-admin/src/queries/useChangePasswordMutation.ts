import { useMutation } from '@tanstack/react-query'
import { httpClient } from '@/services/httpClient'
import type { ChangePasswordRequest } from '@/types/auth'

export function useChangePasswordMutation() {
  return useMutation({
    mutationFn: async (payload: ChangePasswordRequest) => {
      await httpClient.put('/auth/password', payload)
    },
  })
}
