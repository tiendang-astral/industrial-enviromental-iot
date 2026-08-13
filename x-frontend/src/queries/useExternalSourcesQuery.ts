import { useQuery } from '@tanstack/react-query'
import { listExternalSources } from '@/services/externalSourceService'

/** Toàn bộ nguồn dữ liệu trong scope user — trang "Nguồn dữ liệu". */
export function useExternalSourcesQuery() {
  return useQuery({
    queryKey: ['external-sources'],
    queryFn: listExternalSources,
  })
}
