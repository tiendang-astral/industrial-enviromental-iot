import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createExternalSource } from '@/services/externalSourceService'
import type { CreateExternalSourceRequest } from '@/types/externalSource'

export function useCreateExternalSourceMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ tenantNodeId, payload }: { tenantNodeId: number; payload: CreateExternalSourceRequest }) =>
      createExternalSource(tenantNodeId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['external-sources'] })
    },
  })
}
