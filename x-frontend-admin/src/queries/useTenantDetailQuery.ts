import { useQuery } from '@tanstack/react-query'
import { httpClient } from '@/services/httpClient'
import type { ApiResponse } from '@/types/api'
import type { TenantDetail } from '@/types/tenant'

export function useTenantDetailQuery(id: number) {
  return useQuery({
    queryKey: ['tenant-detail', id],
    queryFn: async () => {
      const { data } = await httpClient.get<ApiResponse<TenantDetail>>(`/tenants/${id}`)
      return data.data!
    },
  })
}
