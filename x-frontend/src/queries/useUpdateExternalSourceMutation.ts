import { useMutation, useQueryClient } from '@tanstack/react-query'
import { updateExternalSource } from '@/services/externalSourceService'
import type { UpdateExternalSourceRequest } from '@/types/externalSource'

export function useUpdateExternalSourceMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: UpdateExternalSourceRequest }) =>
      updateExternalSource(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['external-sources'] })
    },
  })
}
