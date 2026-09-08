import { useQuery } from '@tanstack/react-query'
import { getDatastreamTelemetry } from '@/services/datastreamService'

const REFRESH_MS = 60_000

/**
 * Lịch sử của 1 kênh theo khoảng thời gian. `rangeMinutes` nằm trong queryKey nên nhiều widget cùng
 * bind một kênh ở cùng khoảng chỉ tốn MỘT request — board đầy widget vẫn không nhân số lời gọi lên.
 *
 * Vẫn làm mới định kỳ dù kênh gateway có realtime qua STOMP: realtime chỉ nối thêm điểm mới ở đuôi,
 * còn phần đã gộp mẫu ở giữa thì chỉ server mới tính lại được.
 */
export function useDatastreamTelemetryQuery(datastreamId: number | undefined, rangeMinutes: number) {
  return useQuery({
    queryKey: ['datastream-telemetry', datastreamId, rangeMinutes],
    queryFn: () => getDatastreamTelemetry(datastreamId!, rangeMinutes),
    enabled: !!datastreamId,
    refetchInterval: REFRESH_MS,
  })
}
