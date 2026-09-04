import { useMutation, useQueryClient } from '@tanstack/react-query'
import { saveDashboardLayout } from '@/services/dashboardService'
import type { Widget } from '@/types/dashboard'

/**
 * Ghi `layout_json` một lần khi người dùng bấm Lưu — không debounce theo từng cú kéo nữa: chế độ
 * chỉnh sửa là bản nháp cục bộ, rời đi giữa chừng thì bỏ (xem DashboardBoard).
 */
export function useSaveDashboardLayoutMutation(tenantNodeId: number) {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: (widgets: Widget[]) => saveDashboardLayout(tenantNodeId, widgets),
    onSuccess: (dashboard) => {
      queryClient.setQueryData(['dashboard', tenantNodeId], dashboard)
    },
  })

  return { save: mutation.mutateAsync, isSaving: mutation.isPending }
}
