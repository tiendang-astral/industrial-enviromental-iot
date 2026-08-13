import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createDatastreamForJob } from '@/services/datastreamService'

/** externalSourceId chỉ để invalidate đúng cache list — API thật gọi theo jobId. */
export function useCreateDatastreamForJobMutation(externalSourceId: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      jobId,
      payload,
    }: {
      jobId: number
      payload: { name: string; metricId: number; sourceField: string }
    }) => createDatastreamForJob(jobId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['datastreams-by-source', externalSourceId] })
    },
  })
}
