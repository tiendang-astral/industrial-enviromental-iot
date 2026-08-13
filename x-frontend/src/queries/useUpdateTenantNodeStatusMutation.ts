import { useMutation, useQueryClient } from '@tanstack/react-query'
import { updateTenantNodeStatus } from '@/services/tenantNodeService'
import type { UpdateTenantNodeStatusRequest } from '@/types/tenantNode'

export function useUpdateTenantNodeStatusMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: UpdateTenantNodeStatusRequest }) =>
      updateTenantNodeStatus(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-nodes'] })
    },
  })
}
