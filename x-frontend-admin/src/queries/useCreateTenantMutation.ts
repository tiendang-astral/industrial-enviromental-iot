import { useMutation, useQueryClient } from '@tanstack/react-query'
import { httpClient } from '@/services/httpClient'
import type { ApiResponse } from '@/types/api'
import type { CreateTenantRequest, Tenant } from '@/types/tenant'

export function useCreateTenantMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: CreateTenantRequest) => {
      const { data } = await httpClient.post<ApiResponse<Tenant>>('/tenants', payload)
      return data.data!
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] })
    },
  })
}
