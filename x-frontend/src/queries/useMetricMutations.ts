import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  createMetric,
  deleteMetric,
  resetMetricThreshold,
  setMetricThreshold,
  updateMetric,
} from '@/services/metricService'
import type {
  CreateMetricRequest,
  UpdateMetricRequest,
  UpdateMetricThresholdRequest,
} from '@/types/metric'

/**
 * Ngưỡng quyết định màu trạng thái ở mọi widget/badge đang mở, mà tất cả đều đọc từ cùng một
 * queryKey — xoá nó là cả app tô lại theo ngưỡng mới, không cần đụng tới từng nơi.
 */
function useInvalidateMetrics() {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: ['metrics'] })
}

export function useCreateMetricMutation() {
  const invalidate = useInvalidateMetrics()
  return useMutation({
    mutationFn: (payload: CreateMetricRequest) => createMetric(payload),
    onSuccess: invalidate,
  })
}

export function useUpdateMetricMutation() {
  const invalidate = useInvalidateMetrics()
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: UpdateMetricRequest }) =>
      updateMetric(id, payload),
    onSuccess: invalidate,
  })
}

export function useDeleteMetricMutation() {
  const invalidate = useInvalidateMetrics()
  return useMutation({
    mutationFn: (id: number) => deleteMetric(id),
    onSuccess: invalidate,
  })
}

export function useSetMetricThresholdMutation() {
  const invalidate = useInvalidateMetrics()
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: UpdateMetricThresholdRequest }) =>
      setMetricThreshold(id, payload),
    onSuccess: invalidate,
  })
}

export function useResetMetricThresholdMutation() {
  const invalidate = useInvalidateMetrics()
  return useMutation({
    mutationFn: (id: number) => resetMetricThreshold(id),
    onSuccess: invalidate,
  })
}
