import { useCallback, useEffect, useRef } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { saveSourceDashboardLayout } from '@/services/dashboardService'
import type { Widget } from '@/types/dashboard'

const DEBOUNCE_MS = 800

/** Song song useSaveDashboardLayoutMutation nhưng lưu theo external_source_id. */
export function useSaveSourceDashboardLayoutMutation(externalSourceId: number) {
  const queryClient = useQueryClient()
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  const mutation = useMutation({
    mutationFn: (widgets: Widget[]) => saveSourceDashboardLayout(externalSourceId, widgets),
    onSuccess: (dashboard) => {
      queryClient.setQueryData(['source-dashboard', externalSourceId], dashboard)
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

  const saveNow = useCallback(
    (widgets: Widget[]) => {
      clearTimeout(timeoutRef.current)
      mutation.mutate(widgets)
    },
    [mutation]
  )

  return { saveDebounced, saveNow, isSaving: mutation.isPending }
}
