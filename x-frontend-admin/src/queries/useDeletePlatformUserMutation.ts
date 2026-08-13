import { useMutation, useQueryClient } from '@tanstack/react-query'
import { httpClient } from '@/services/httpClient'

export function useDeletePlatformUserMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: number) => {
      await httpClient.delete(`/platform-users/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-users'] })
    },
  })
}
