import { useCallback, useMemo } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useRealtimeGatewaySocket } from '@/hooks/useRealtimeGatewaySocket'
import type { RealtimeReadingMessage } from '@/types/telemetry'
import type { TenantNode } from '@/types/tenantNode'

/**
 * Trang Cảnh báo nghe alert của MỌI site trong scope: reading publish vào channel Redis của
 * chính site báo về, nên một trang gộp phải subscribe từng site (xem ARCHITECTURE.md § Contract
 * STOMP/WebSocket). Chỉ SITE mới có reading — subscribe cả node cấp trên là N frame không bao giờ
 * nhận được gì.
 */
export function useAlertRealtime(nodes: TenantNode[]) {
  const queryClient = useQueryClient()

  const siteIds = useMemo(
    () => nodes.filter((node) => node.nodeType === 'SITE').map((node) => node.id),
    [nodes]
  )

  const handleMessage = useCallback(
    (message: RealtimeReadingMessage) => {
      if (!message.alertId) return
      queryClient.invalidateQueries({ queryKey: ['alerts'] })
      if (message.status === 'ACTIVE') {
        toast.error(`Cảnh báo: ${message.ruleName ?? 'quy tắc'}`, {
          description: message.value != null ? `Giá trị đo ${message.value}` : undefined,
        })
      } else if (message.status === 'RECOVERED') {
        toast.success(`Đã phục hồi: ${message.ruleName ?? 'quy tắc'}`)
      }
    },
    [queryClient]
  )

  useRealtimeGatewaySocket(siteIds, handleMessage)
}
