import { useQuery } from '@tanstack/react-query'
import { sampleJobRows } from '@/services/externalSourceJobService'

export function useJobSampleQuery(jobId: number | null, limit = 10) {
  return useQuery({
    queryKey: ['external-source-job-sample', jobId, limit],
    queryFn: () => sampleJobRows(jobId!, limit),
    enabled: !!jobId,
    // Query chạy sang database khách hàng nên không làm mới liên tục — mỗi lần vào trang là đủ.
    staleTime: 30_000,
    retry: false,
  })
}
