import { useMutation, useQueryClient } from '@tanstack/react-query'
import { renameDatastream } from '@/services/datastreamService'

export function useRenameDatastreamMutation(externalSourceId: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, name }: { id: number; name: string }) => renameDatastream(id, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['datastreams-by-source', externalSourceId] })
      // Tên kênh hiện trên thẻ số đo nữa, mà telemetry là query riêng.
      queryClient.invalidateQueries({ queryKey: ['source-telemetry', externalSourceId] })
    },
  })
}
