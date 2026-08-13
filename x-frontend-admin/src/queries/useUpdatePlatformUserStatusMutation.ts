import { useMutation, useQueryClient } from '@tanstack/react-query'
import { httpClient } from '@/services/httpClient'
import type { ApiResponse } from '@/types/api'
import type { PlatformUser, PlatformUserStatus } from '@/types/platformUser'

export function useUpdatePlatformUserStatusMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, status }: { id: number; status: PlatformUserStatus }) => {
      const { data } = await httpClient.put<ApiResponse<PlatformUser>>(`/platform-users/${id}/status`, {
        status,
      })
      return data.data!
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-users'] })
    },
  })
}
