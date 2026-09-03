import { useMutation } from '@tanstack/react-query'
import { testConnection } from '@/services/externalSourceService'
import type { ExternalSourceConnectionConfig, ExternalSourceCredential } from '@/types/externalSource'

export function useTestConnectionMutation() {
  return useMutation({
    mutationFn: (payload: {
      connectionConfig: ExternalSourceConnectionConfig
      credential: ExternalSourceCredential
    }) => testConnection(payload.connectionConfig, payload.credential),
  })
}
