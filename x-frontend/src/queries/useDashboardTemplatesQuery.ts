import { useQuery } from '@tanstack/react-query'
import { listDashboardTemplates } from '@/services/dashboardTemplateService'

export function useDashboardTemplatesQuery() {
  return useQuery({
    queryKey: ['dashboard-templates'],
    queryFn: listDashboardTemplates,
  })
}
