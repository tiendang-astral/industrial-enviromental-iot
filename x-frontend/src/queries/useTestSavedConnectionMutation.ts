import { useMutation } from '@tanstack/react-query'
import { testSavedConnection } from '@/services/externalSourceService'
import type { ExternalSourceConnectionConfig, ExternalSourceCredential } from '@/types/externalSource'

export function useTestSavedConnectionMutation(sourceId: number) {
  return useMutation({
    mutationFn: (override?: {
      connectionConfig?: ExternalSourceConnectionConfig
      credential?: ExternalSourceCredential
    }) => testSavedConnection(sourceId, override),
  })
}
