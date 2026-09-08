export interface ReadingPoint {
  value: number
  measuredAt: string
}

export interface PinTelemetry {
  pinId: number
  pinNumber: number
  type: 'AI' | 'DI'
  name: string
  metricCode: string | null
  unit: string | null
  latestValue: number | null
  latestMeasuredAt: string | null
  /** Bề rộng cửa sổ gộp mẫu của `history` — backend gộp trước khi trả, xem AggregationWindow. */
  bucketSeconds: number
  history: ReadingPoint[]
}

/**
 * Payload nhận qua STOMP /topic/realtime/{tenantId}/{tenantNodeId} — xem ARCHITECTURE.md.
 * 4 dạng: nguồn gateway (gatewayId+pinType+pinNumber, cần tra datastreamId qua map riêng),
 * nguồn external (datastreamId thẳng, không có pin — Phase 5), trạng thái Command
 * (commandId có mặt — Phase 7, match trực tiếp bằng commandId, không cần gatewayId/pinId),
 * và trạng thái Alert (alertId có mặt — Phase 6a).
 *
 * `status` dùng chung cho Command lẫn Alert nên trùng giá trị 'PENDING' — phân biệt bằng
 * commandId/alertId có mặt, không bao giờ bằng riêng `status`.
 */
export interface RealtimeReadingMessage {
  gatewayId?: number
  pinType?: 'AI' | 'DI'
  pinNumber?: number
  datastreamId?: number
  metric?: string
  value?: number
  measuredAt?: string
  commandId?: string
  status?: CommandStatus | AlertRealtimeStatus
  powerReportedState?: 'ON' | 'OFF' | null
  error?: string | null
  alertId?: number
  ruleId?: number
  ruleName?: string
  severity?: 'WARNING' | 'CRITICAL'
}

export type CommandStatus = 'PENDING' | 'DISPATCHED' | 'ACKNOWLEDGED' | 'FAILED' | 'TIMED_OUT'

export type AlertRealtimeStatus = 'PENDING' | 'ACTIVE' | 'RECOVERED'

const COMMAND_STATUSES: CommandStatus[] = ['PENDING', 'DISPATCHED', 'ACKNOWLEDGED', 'FAILED', 'TIMED_OUT']

export function isCommandStatus(status: string | undefined): status is CommandStatus {
  return !!status && (COMMAND_STATUSES as string[]).includes(status)
}
