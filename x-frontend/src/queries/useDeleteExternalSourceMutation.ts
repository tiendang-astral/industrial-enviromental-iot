import { useMutation, useQueryClient } from '@tanstack/react-query'
import { deleteExternalSource } from '@/services/externalSourceService'

export function useDeleteExternalSourceMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number) => deleteExternalSource(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['external-sources'] })
    },
  })
}
