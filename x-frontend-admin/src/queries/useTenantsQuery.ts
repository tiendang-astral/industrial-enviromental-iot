import { useQuery } from '@tanstack/react-query'
import { httpClient } from '@/services/httpClient'
import type { ApiResponse } from '@/types/api'
import type { Tenant } from '@/types/tenant'

export function useTenantsQuery() {
  return useQuery({
    queryKey: ['tenants'],
    queryFn: async () => {
      const { data } = await httpClient.get<ApiResponse<Tenant[]>>('/tenants')
      return data.data!
    },
  })
}
