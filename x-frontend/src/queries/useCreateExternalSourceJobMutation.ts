import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createExternalSourceJob } from '@/services/externalSourceJobService'
import type { CreateExternalSourceJobRequest } from '@/types/externalSource'

export function useCreateExternalSourceJobMutation(externalSourceId: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: CreateExternalSourceJobRequest) => createExternalSourceJob(externalSourceId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['external-source-jobs', externalSourceId] })
    },
  })
}
