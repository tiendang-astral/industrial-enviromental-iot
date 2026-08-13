import { useMutation, useQueryClient } from '@tanstack/react-query'
import { httpClient } from '@/services/httpClient'
import type { ApiResponse } from '@/types/api'
import type { Tenant, TenantStatus } from '@/types/tenant'

export function useUpdateTenantStatusMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, status }: { id: number; status: TenantStatus }) => {
      const { data } = await httpClient.put<ApiResponse<Tenant>>(`/tenants/${id}/status`, { status })
      return data.data!
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] })
      queryClient.invalidateQueries({ queryKey: ['tenant-detail'] })
    },
  })
}
