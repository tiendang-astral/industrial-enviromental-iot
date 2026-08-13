export interface Gateway {
  id: number
  tenantNodeId: number
  name: string
  macAddress: string
  lastSeenAt: string | null
}

export interface CreateGatewayRequest {
  tenantNodeId: number
  name: string
  macAddress: string
}

export interface UpdateGatewayRequest {
  name: string
  macAddress?: string
  tenantNodeId?: number
}
