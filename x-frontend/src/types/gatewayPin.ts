export type PinDirection = 'INPUT' | 'OUTPUT'
export type PinType = 'AI' | 'DI' | 'DO' | 'AO'

export interface GatewayPin {
  id: number
  gatewayId: number
  direction: PinDirection
  type: PinType
  name: string
  metricId: number | null
  pinNumber: number
  powerDesiredState: 'ON' | 'OFF' | null
  powerReportedState: 'ON' | 'OFF' | null
  enabled: boolean
}

export interface CreateGatewayPinRequest {
  direction: PinDirection
  type: PinType
  name: string
  metricId: number | null
  pinNumber: number
}

export interface UpdateGatewayPinRequest {
  name?: string
  enabled?: boolean
}
