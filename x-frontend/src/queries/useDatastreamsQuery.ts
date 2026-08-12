import { useQuery } from '@tanstack/react-query'
import { listDatastreams } from '@/services/datastreamService'

export function useDatastreamsQuery(tenantNodeId: number) {
  return useQuery({
    queryKey: ['datastreams', tenantNodeId],
    queryFn: () => listDatastreams(tenantNodeId),
    enabled: !!tenantNodeId,
  })
}
