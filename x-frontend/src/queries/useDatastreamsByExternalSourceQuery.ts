import { useQuery } from '@tanstack/react-query'
import { listDatastreamsByExternalSource } from '@/services/datastreamService'

export function useDatastreamsByExternalSourceQuery(externalSourceId: number) {
  return useQuery({
    queryKey: ['datastreams-by-source', externalSourceId],
    queryFn: () => listDatastreamsByExternalSource(externalSourceId),
    enabled: !!externalSourceId,
    // Trang chi tiết nguồn hiện giá trị hiện tại/cập nhật gần nhất (đọc InfluxDB) — không có
    // realtime push ở đây (khác SourceDashboardPage dùng STOMP), nên refetch định kỳ.
    refetchInterval: 15000,
  })
}
