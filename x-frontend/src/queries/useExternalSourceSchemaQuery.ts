import { useQuery } from '@tanstack/react-query'
import { getExternalSourceSchema } from '@/services/externalSourceService'

export function useExternalSourceSchemaQuery(externalSourceId: number, enabled = true) {
  return useQuery({
    queryKey: ['external-source-schema', externalSourceId],
    queryFn: () => getExternalSourceSchema(externalSourceId),
    enabled: !!externalSourceId && enabled,
    // Cấu trúc bảng bên kia hiếm khi đổi giữa phiên — khỏi gọi lại mỗi lần focus.
    staleTime: 5 * 60 * 1000,
    retry: false,
  })
}
