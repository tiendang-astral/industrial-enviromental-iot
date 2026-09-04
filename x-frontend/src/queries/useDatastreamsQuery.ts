import { useQuery } from '@tanstack/react-query'
import { listDatastreams } from '@/services/datastreamService'

export function useDatastreamsQuery(tenantNodeId: number, includeDescendants = false) {
  return useQuery({
    queryKey: ['datastreams', tenantNodeId, includeDescendants],
    queryFn: () => listDatastreams(tenantNodeId, includeDescendants),
    enabled: !!tenantNodeId,
  })
}
