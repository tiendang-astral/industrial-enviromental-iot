import { useQuery } from '@tanstack/react-query'
import { httpClient } from '@/services/httpClient'
import type { ApiResponse } from '@/types/api'
import type { PlatformUser } from '@/types/platformUser'

export function usePlatformUsersQuery() {
  return useQuery({
    queryKey: ['platform-users'],
    queryFn: async () => {
      const { data } = await httpClient.get<ApiResponse<PlatformUser[]>>('/platform-users')
      return data.data!
    },
  })
}
