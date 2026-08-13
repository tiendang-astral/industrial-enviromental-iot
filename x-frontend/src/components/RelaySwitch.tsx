import { useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Switch } from '@/components/ui/switch'
import { useCreateCommandMutation } from '@/queries/useCreateCommandMutation'
import type { CommandUpdate } from '@/types/command'
import type { GatewayPin } from '@/types/gatewayPin'

interface RelaySwitchProps {
  gatewayId: number
  pinId: number
  powerReportedState: 'ON' | 'OFF' | null
  /** Map commandId -> update mới nhất, nuôi bởi 1 subscription STOMP duy nhất ở trang cha. */
  commandUpdates: Record<string, CommandUpdate>
  disabled?: boolean
}

const TERMINAL_STATUSES = new Set(['ACKNOWLEDGED', 'FAILED', 'TIMED_OUT'])
// Cộng thêm chu kỳ quét của CommandTimeoutWorker (app.command.timeout-worker-interval-ms=5000)
// + độ trễ mạng, để không báo "mất phản hồi" sớm hơn lúc backend thực sự kết luận TIMED_OUT.
const FALLBACK_BUFFER_MS = 8000

/**
 * Toggle relay dùng chung giữa GatewayDetailPage (section pin OUTPUT) và SwitchWidget
 * (Dashboard) — bấm tạo command, khoá switch tới khi có trạng thái cuối (ACKNOWLEDGED/
 * FAILED/TIMED_OUT), patch thẳng cache gateway-pins thay vì giữ state riêng song song
 * (xem CONVENTIONS.md § Realtime).
 *
 * Không chỉ trông chờ message WebSocket — nếu mất kết nối STOMP tạm thời (reconnect,
 * chuyển tab...) đúng lúc lệnh timeout, message TIMED_OUT có thể không tới nơi, switch sẽ
 * đứng loading mãi không báo gì. Nên đặt thêm 1 timer fallback theo đúng `timeoutAt` server
 * trả về lúc tạo lệnh — hết hạn mà chưa có update thật thì tự báo lỗi, không phụ thuộc WS.
 */
export function RelaySwitch({ gatewayId, pinId, powerReportedState, commandUpdates, disabled }: RelaySwitchProps) {
  const [pendingCommandId, setPendingCommandId] = useState<string | null>(null)
  const createCommandMutation = useCreateCommandMutation(gatewayId, pinId)
  const queryClient = useQueryClient()
  const fallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const pendingUpdate = pendingCommandId ? commandUpdates[pendingCommandId] : undefined

  function clearFallbackTimer() {
    if (fallbackTimerRef.current != null) {
      clearTimeout(fallbackTimerRef.current)
      fallbackTimerRef.current = null
    }
  }

  useEffect(() => {
    if (!pendingUpdate || !TERMINAL_STATUSES.has(pendingUpdate.status)) return
    clearFallbackTimer()

    if (pendingUpdate.powerReportedState) {
      queryClient.setQueryData<GatewayPin[]>(['gateway-pins', gatewayId], (pins) =>
        pins?.map((pin) => (pin.id === pinId ? { ...pin, powerReportedState: pendingUpdate.powerReportedState } : pin))
      )
    }
    if (pendingUpdate.status !== 'ACKNOWLEDGED') {
      toast.error(pendingUpdate.error ?? 'Không điều khiển được relay')
    }
    setPendingCommandId(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingUpdate, gatewayId, pinId, queryClient])

  // Dọn timer khi unmount giữa chừng (VD điều hướng trang khác lúc đang chờ).
  useEffect(() => clearFallbackTimer, [])

  const isBusy = pendingCommandId != null && (!pendingUpdate || !TERMINAL_STATUSES.has(pendingUpdate.status))

  function handleToggle(checked: boolean) {
    createCommandMutation.mutate(
      { commandType: checked ? 'TURN_ON' : 'TURN_OFF', idempotencyKey: crypto.randomUUID() },
      {
        onSuccess: (command) => {
          setPendingCommandId(command.id)
          clearFallbackTimer()
          const delayMs = Math.max(0, new Date(command.timeoutAt).getTime() - Date.now() + FALLBACK_BUFFER_MS)
          fallbackTimerRef.current = setTimeout(() => {
            setPendingCommandId((current) => {
              if (current !== command.id) return current
              toast.error('Không nhận được phản hồi cho lệnh điều khiển — vui lòng thử lại')
              return null
            })
          }, delayMs)
        },
        onError: () => toast.error('Không gửi được lệnh điều khiển'),
      }
    )
  }

  return (
    <div className="flex items-center gap-2">
      {isBusy && <Loader2 className="size-3.5 shrink-0 animate-spin text-muted-foreground" />}
      <Switch
        checked={powerReportedState === 'ON'}
        disabled={disabled || isBusy || createCommandMutation.isPending}
        onCheckedChange={handleToggle}
      />
    </div>
  )
}
