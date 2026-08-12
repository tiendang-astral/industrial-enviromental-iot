import { useCallback, useEffect, useRef } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { saveDashboardLayout } from '@/services/dashboardService'
import type { Widget } from '@/types/dashboard'

const DEBOUNCE_MS = 800

/** Debounce lưu layout_json (kéo-thả/resize bắn onLayoutChange liên tục) — theo CONVENTIONS.md. */
export function useSaveDashboardLayoutMutation(tenantNodeId: number) {
  const queryClient = useQueryClient()
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  const mutation = useMutation({
    mutationFn: (widgets: Widget[]) => saveDashboardLayout(tenantNodeId, widgets),
    onSuccess: (dashboard) => {
      queryClient.setQueryData(['dashboard', tenantNodeId], dashboard)
    },
  })

  useEffect(() => () => clearTimeout(timeoutRef.current), [])

  const saveDebounced = useCallback(
    (widgets: Widget[]) => {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = setTimeout(() => mutation.mutate(widgets), DEBOUNCE_MS)
    },
    [mutation]
  )

  /** Lưu ngay, không debounce — dùng cho thao tác rời rạc (thêm/xóa widget), khác kéo-thả liên tục. */
  const saveNow = useCallback(
    (widgets: Widget[]) => {
      clearTimeout(timeoutRef.current)
      mutation.mutate(widgets)
    },
    [mutation]
  )

  return { saveDebounced, saveNow, isSaving: mutation.isPending }
}
