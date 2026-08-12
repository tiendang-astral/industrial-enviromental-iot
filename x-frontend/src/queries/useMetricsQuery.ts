import { useQuery } from '@tanstack/react-query'
import { listMetrics } from '@/services/metricService'

export function useMetricsQuery() {
  return useQuery({
    queryKey: ['metrics'],
    queryFn: listMetrics,
  })
}
