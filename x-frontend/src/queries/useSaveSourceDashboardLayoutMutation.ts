import { useMutation, useQueryClient } from '@tanstack/react-query'
import { saveSourceDashboardLayout } from '@/services/dashboardService'
import type { Widget } from '@/types/dashboard'

/** Song song useSaveDashboardLayoutMutation nhưng lưu theo external_source_id. */
export function useSaveSourceDashboardLayoutMutation(externalSourceId: number) {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: (widgets: Widget[]) => saveSourceDashboardLayout(externalSourceId, widgets),
    onSuccess: (dashboard) => {
      queryClient.setQueryData(['source-dashboard', externalSourceId], dashboard)
    },
  })

  return { save: mutation.mutateAsync, isSaving: mutation.isPending }
}
