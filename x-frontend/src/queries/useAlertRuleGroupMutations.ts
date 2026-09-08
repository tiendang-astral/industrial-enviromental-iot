import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  createAlertRuleGroup,
  deleteAlertRuleGroup,
  updateAlertRuleGroup,
  updateAlertRuleGroupStatus,
} from '@/services/alertService'
import type { SaveAlertRuleGroupRequest } from '@/types/alert'

type SaveInput =
  | { mode: 'create'; payload: SaveAlertRuleGroupRequest }
  | { mode: 'update'; id: number; payload: SaveAlertRuleGroupRequest }

function useInvalidate() {
  const queryClient = useQueryClient()
  // Đổi nhóm là đổi cả rule con bên dưới nên phải dọn luôn cache của bảng rule.
  return () => {
    queryClient.invalidateQueries({ queryKey: ['alert-rule-groups'] })
    queryClient.invalidateQueries({ queryKey: ['alert-rules'] })
  }
}

export function useSaveAlertRuleGroupMutation() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: (input: SaveInput) =>
      input.mode === 'create'
        ? createAlertRuleGroup(input.payload)
        : updateAlertRuleGroup(input.id, input.payload),
    onSuccess: invalidate,
  })
}

export function useUpdateAlertRuleGroupStatusMutation() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: ({ id, enabled }: { id: number; enabled: boolean }) => updateAlertRuleGroupStatus(id, enabled),
    onSuccess: invalidate,
  })
}

export function useDeleteAlertRuleGroupMutation() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: (id: number) => deleteAlertRuleGroup(id),
    onSuccess: invalidate,
  })
}
