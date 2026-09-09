import { useQuery } from '@tanstack/react-query'
import { getEnvironmentReport } from '@/services/reportService'
import type { ReportFilter } from '@/types/report'

/**
 * `filter = null` cho tới khi người dùng bấm "Tạo báo cáo": đây là truy vấn nặng trải nhiều kênh
 * và nhiều ngày, chạy ngầm lúc mở trang là bắt cả InfluxDB lẫn Postgres làm việc không ai xem.
 */
export function useEnvironmentReportQuery(filter: ReportFilter | null) {
  return useQuery({
    queryKey: ['report', 'environment', filter],
    queryFn: () => getEnvironmentReport(filter!),
    enabled: filter !== null,
    staleTime: 5 * 60 * 1000,
  })
}
