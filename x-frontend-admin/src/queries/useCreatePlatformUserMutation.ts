import { useMutation, useQueryClient } from '@tanstack/react-query'
import { httpClient } from '@/services/httpClient'
import type { ApiResponse } from '@/types/api'
import type { CreatePlatformUserRequest, PlatformUser } from '@/types/platformUser'

export function useCreatePlatformUserMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: CreatePlatformUserRequest) => {
      const { data } = await httpClient.post<ApiResponse<PlatformUser>>(
        '/platform-users',
        payload
      )
      return data.data!
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-users'] })
    },
  })
}
