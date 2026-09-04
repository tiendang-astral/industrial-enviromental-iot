import { useQuery } from '@tanstack/react-query'
import { getLatestBackfill } from '@/services/externalSourceJobService'

/** Poll nhanh khi còn chạy dở, dừng poll khi đã xong — tránh gọi API mỗi 5s vĩnh viễn. */
export function useBackfillQuery(datastreamId: number | null, enabled = true) {
  return useQuery({
    queryKey: ['datastream-backfill', datastreamId],
    queryFn: () => getLatestBackfill(datastreamId!),
    enabled: enabled && !!datastreamId,
    refetchInterval: (query) => {
      const status = query.state.data?.status
      return status === 'PENDING' || status === 'RUNNING' ? 5_000 : false
    },
  })
}
