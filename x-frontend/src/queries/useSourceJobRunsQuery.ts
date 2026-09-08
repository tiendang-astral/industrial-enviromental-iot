import { useQuery } from '@tanstack/react-query'
import { listJobRunsBySource } from '@/services/externalSourceJobService'
import type { ExternalSourceJobRun } from '@/types/externalSource'

/**
 * Lịch sử chạy của mọi job thuộc một nguồn, trả về dạng Map để khối job tra thẳng theo id.
 * Gọi lẻ từng job sẽ thành N request cho một màn hình vốn hiện mọi job cùng lúc.
 */
export function useSourceJobRunsQuery(externalSourceId: number, sinceHours = 12) {
  return useQuery({
    queryKey: ['external-source-job-runs-by-source', externalSourceId, sinceHours],
    queryFn: async () => {
      const groups = await listJobRunsBySource(externalSourceId, sinceHours)
      return new Map<number, ExternalSourceJobRun[]>(
        groups.map((group) => [group.jobId, group.runs])
      )
    },
    // Job chạy theo cron nên không có event realtime — làm mới định kỳ là đủ.
    refetchInterval: 60_000,
  })
}
