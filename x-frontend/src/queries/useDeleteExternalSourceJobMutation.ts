import { useMutation, useQueryClient } from '@tanstack/react-query'
import { deleteExternalSourceJob } from '@/services/externalSourceJobService'

export function useDeleteExternalSourceJobMutation(externalSourceId: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number) => deleteExternalSourceJob(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['external-source-jobs', externalSourceId] })
    },
  })
}
