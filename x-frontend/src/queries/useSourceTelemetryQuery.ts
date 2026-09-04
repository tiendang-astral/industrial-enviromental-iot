import { useQuery } from '@tanstack/react-query'
import { getSourceTelemetry } from '@/services/externalSourceService'

/**
 * Lịch sử số đo mọi kênh của nguồn. Job chạy theo cron nên không có event realtime đều đặn —
 * làm mới định kỳ là đủ, không cần STOMP như board của site.
 */
export function useSourceTelemetryQuery(externalSourceId: number, rangeMinutes = 720) {
  return useQuery({
    queryKey: ['source-telemetry', externalSourceId, rangeMinutes],
    queryFn: () => getSourceTelemetry(externalSourceId, rangeMinutes),
    enabled: !!externalSourceId,
    refetchInterval: 60_000,
  })
}
