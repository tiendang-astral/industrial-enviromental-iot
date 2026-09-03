import { useMutation, useQueryClient } from '@tanstack/react-query'
import { runJobNow } from '@/services/externalSourceJobService'

export function useRunJobNowMutation(externalSourceId: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (jobId: number) => runJobNow(jobId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['external-source-jobs', externalSourceId] })
      queryClient.invalidateQueries({ queryKey: ['external-source-job-runs'] })
    },
  })
}
