import { useMutation, useQueryClient } from '@tanstack/react-query'
import { deleteTenantNode } from '@/services/tenantNodeService'

export function useDeleteTenantNodeMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteTenantNode,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-nodes'] })
    },
  })
}
