import { useQuery } from '@tanstack/react-query'
import { listAlerts } from '@/services/alertService'

export function useAlertsQuery(status?: string, tenantNodeId?: number, limit = 500) {
  return useQuery({
    queryKey: ['alerts', status ?? null, tenantNodeId ?? null, limit],
    queryFn: () => listAlerts(status, tenantNodeId, limit),
  })
}
