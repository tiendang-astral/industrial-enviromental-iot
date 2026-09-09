import { useQueries, useQuery } from '@tanstack/react-query'
import { getDatastreamTelemetry } from '@/services/datastreamService'

const REFRESH_MS = 60_000
/** Không dùng tới khi bỏ lịch sử (`latest()` tự quét 8 ngày), nhưng endpoint vẫn nhận nên gửi giá trị nhỏ. */
const LATEST_RANGE_MINUTES = 60

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

/**
 * Nhiều kênh cùng lúc cho widget biểu đồ đa kênh. Dùng `useQueries` chứ không gọi hook trong vòng
 * lặp — số kênh đổi theo widget nên số hook phải đổi theo, thứ mà quy tắc hook không cho phép.
 */
export function useDatastreamsTelemetryQueries(datastreamIds: number[], rangeMinutes: number) {
  return useQueries({
    queries: datastreamIds.map((id) => ({
      queryKey: ['datastream-telemetry', id, rangeMinutes, true],
      queryFn: () => getDatastreamTelemetry(id, rangeMinutes),
      refetchInterval: REFRESH_MS,
    })),
    // `combine` được TanStack ghi nhớ theo identity của results. Không có nó thì `results.map(...)`
    // trả mảng MỚI mỗi lần render, mọi useMemo phía sau vô hiệu, và biểu đồ dựng lại option liên tục.
    combine: (results) => ({
      data: results.map((result) => result.data),
      isLoading: results.some((result) => result.isLoading),
    }),
  })
}

/**
 * CHỈ giá trị mới nhất, không kèm lịch sử — cho ô số. Nếu không có nó, ô số mở trang lên là trống
 * cho tới khi có message realtime kế tiếp (kênh chạy theo cron có thể là 5 phút sau).
 * `includeHistory` nằm trong queryKey để không đụng cache của biểu đồ cùng kênh.
 */
export function useDatastreamsLatestQueries(datastreamIds: number[]) {
  return useQueries({
    queries: datastreamIds.map((id) => ({
      queryKey: ['datastream-telemetry', id, LATEST_RANGE_MINUTES, false],
      queryFn: () => getDatastreamTelemetry(id, LATEST_RANGE_MINUTES, false),
      refetchInterval: REFRESH_MS,
    })),
    combine: (results) => results.map((result) => result.data),
  })
}
