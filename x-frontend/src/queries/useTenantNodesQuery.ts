import { useQuery } from '@tanstack/react-query'
import { listTenantNodes } from '@/services/tenantNodeService'

export function useTenantNodesQuery() {
  return useQuery({
    queryKey: ['tenant-nodes'],
    queryFn: listTenantNodes,
  })
}
