import { useQuery } from '@tanstack/react-query'
import { getIncidentReport } from '@/services/reportService'
import type { ReportFilter } from '@/types/report'

export function useIncidentReportQuery(filter: ReportFilter | null) {
  return useQuery({
    queryKey: ['report', 'incident', filter],
    queryFn: () => getIncidentReport(filter!),
    enabled: filter !== null,
    staleTime: 5 * 60 * 1000,
  })
}
