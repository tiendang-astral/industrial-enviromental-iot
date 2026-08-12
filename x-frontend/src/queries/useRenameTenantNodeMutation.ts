import { useMutation, useQueryClient } from '@tanstack/react-query'
import { renameTenantNode } from '@/services/tenantNodeService'
import type { UpdateTenantNodeRequest } from '@/types/tenantNode'

export function useRenameTenantNodeMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: UpdateTenantNodeRequest }) =>
      renameTenantNode(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-nodes'] })
    },
  })
}
