import { useMutation } from '@tanstack/react-query'
import { estimateBackfill } from '@/services/externalSourceJobService'
import type { BackfillRequest } from '@/types/externalSource'

export function useEstimateBackfillMutation(datastreamId: number) {
  return useMutation({
    mutationFn: (payload: BackfillRequest) => estimateBackfill(datastreamId, payload),
  })
}
