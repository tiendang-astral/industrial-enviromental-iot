import { useMutation } from '@tanstack/react-query'
import { previewQuery } from '@/services/externalSourceService'

export function usePreviewQueryMutation(externalSourceId: number) {
  return useMutation({
    mutationFn: (payload: { sql: string; timestampColumn: string }) =>
      previewQuery(externalSourceId, payload.sql, payload.timestampColumn),
  })
}
