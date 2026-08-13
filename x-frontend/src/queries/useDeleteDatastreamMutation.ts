import { useMutation, useQueryClient } from '@tanstack/react-query'
import { deleteDatastream } from '@/services/datastreamService'

export function useDeleteDatastreamMutation(externalSourceId: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number) => deleteDatastream(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['datastreams-by-source', externalSourceId] })
    },
  })
}
