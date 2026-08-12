import { useMutation, useQueryClient } from '@tanstack/react-query'
import { moveTenantNode } from '@/services/tenantNodeService'
import type { MoveTenantNodeRequest } from '@/types/tenantNode'

export function useMoveTenantNodeMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: MoveTenantNodeRequest }) => moveTenantNode(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-nodes'] })
    },
  })
}
