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
  history: ReadingPoint[]
}

/** Payload nhận qua STOMP /topic/realtime/{tenantId}/{tenantNodeId} — xem ARCHITECTURE.md. */
export interface RealtimeReadingMessage {
  gatewayId: number
  metric: string
  pinType: 'AI' | 'DI'
  pinNumber: number
  value: number
  measuredAt: string
}
