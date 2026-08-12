import { useQuery } from '@tanstack/react-query'
import { httpClient } from '@/services/httpClient'
import { useAuthStore } from '@/stores/useAuthStore'
import type { ApiResponse } from '@/types/api'
import type { MeResponse } from '@/types/auth'

export function useMeQuery() {
  const accessToken = useAuthStore((s) => s.accessToken)

  return useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      const { data } = await httpClient.get<ApiResponse<MeResponse>>('/me')
      return data.data!
    },
    enabled: !!accessToken,
  })
}
