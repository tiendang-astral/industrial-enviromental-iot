import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createTenantNode } from '@/services/tenantNodeService'

export function useCreateTenantNodeMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createTenantNode,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-nodes'] })
    },
  })
}
