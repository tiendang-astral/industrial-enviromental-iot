import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createBackfill } from '@/services/externalSourceJobService'
import type { BackfillRequest } from '@/types/externalSource'

export function useCreateBackfillMutation(datastreamId: number, externalSourceId: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: BackfillRequest) => createBackfill(datastreamId, payload),
    onSuccess: (task) => {
      queryClient.setQueryData(['datastream-backfill', datastreamId], task)
      // oldestReadingAt của kênh sẽ lùi dần khi worker chạy — đọc lại danh sách kênh.
      queryClient.invalidateQueries({ queryKey: ['datastreams-by-source', externalSourceId] })
    },
  })
}
