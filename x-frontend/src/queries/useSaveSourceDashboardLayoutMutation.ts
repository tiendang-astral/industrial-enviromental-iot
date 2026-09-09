import { useMutation, useQueryClient } from '@tanstack/react-query'
import { saveSourceDashboardLayout } from '@/services/dashboardService'
import type { Widget } from '@/types/dashboard'

/** Song song useSaveDashboardLayoutMutation nhưng lưu theo external_source_id. */
export function useSaveSourceDashboardLayoutMutation(externalSourceId: number) {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    // Huỷ mọi GET đang bay trước khi ghi: một GET phát trước lúc PUT nhưng đáp SAU sẽ mang dữ liệu
    // CŨ ghi đè lên cache, và bản vừa lưu biến mất ngay trên màn hình đang mở.
    onMutate: () => queryClient.cancelQueries({ queryKey: ['source-dashboard', externalSourceId] }),
    mutationFn: (widgets: Widget[]) => saveSourceDashboardLayout(externalSourceId, widgets),
    onSuccess: (dashboard) => {
      queryClient.setQueryData(['source-dashboard', externalSourceId], dashboard)
    },
  })

  return { save: mutation.mutateAsync, isSaving: mutation.isPending }
}
