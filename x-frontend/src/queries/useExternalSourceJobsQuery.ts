import { useQuery } from '@tanstack/react-query'
import { listExternalSourceJobs } from '@/services/externalSourceJobService'

export function useExternalSourceJobsQuery(externalSourceId: number) {
  return useQuery({
    queryKey: ['external-source-jobs', externalSourceId],
    queryFn: () => listExternalSourceJobs(externalSourceId),
    enabled: !!externalSourceId,
  })
}
