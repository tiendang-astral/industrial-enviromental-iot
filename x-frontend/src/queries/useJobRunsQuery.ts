import { useQuery } from '@tanstack/react-query'
import { listJobRuns } from '@/services/externalSourceJobService'

export function useJobRunsQuery(jobId: number | null, sinceHours = 12) {
  return useQuery({
    queryKey: ['external-source-job-runs', jobId, sinceHours],
    queryFn: () => listJobRuns(jobId!, sinceHours),
    enabled: !!jobId,
    // Job chạy theo cron nên không có event realtime — làm mới định kỳ là đủ.
    refetchInterval: 60_000,
  })
}
