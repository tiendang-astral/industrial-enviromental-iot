import { useMutation, useQueryClient } from '@tanstack/react-query'
import { applyDashboardTemplate } from '@/services/dashboardTemplateService'

export function useApplyTemplateMutation(tenantNodeId: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (templateId: number) => applyDashboardTemplate(tenantNodeId, templateId),
    onSuccess: (dashboard) => {
      queryClient.setQueryData(['dashboard', tenantNodeId], dashboard)
    },
  })
}
