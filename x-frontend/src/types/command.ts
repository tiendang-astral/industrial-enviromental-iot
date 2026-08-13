export type CommandType = 'TURN_ON' | 'TURN_OFF'
export type CommandStatus = 'PENDING' | 'DISPATCHED' | 'ACKNOWLEDGED' | 'FAILED' | 'TIMED_OUT'

export interface Command {
  id: string
  gatewayId: number
  pinId: number
  commandType: CommandType
  status: CommandStatus
  requestedAt: string
  timeoutAt: string
  error: string | null
}

export interface CreateCommandRequest {
  commandType: CommandType
  idempotencyKey: string
}

/** Update realtime nhận qua STOMP, khớp field commandId trong RealtimeReadingMessage. */
export interface CommandUpdate {
  status: CommandStatus
  powerReportedState: 'ON' | 'OFF' | null
  error: string | null
}
