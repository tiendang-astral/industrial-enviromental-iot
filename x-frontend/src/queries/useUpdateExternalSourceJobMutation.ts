import { useMutation, useQueryClient } from '@tanstack/react-query'
import { updateExternalSourceJob } from '@/services/externalSourceJobService'
import type { UpdateExternalSourceJobRequest } from '@/types/externalSource'

export function useUpdateExternalSourceJobMutation(externalSourceId: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: UpdateExternalSourceJobRequest }) =>
      updateExternalSourceJob(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['external-source-jobs', externalSourceId] })
    },
  })
}
