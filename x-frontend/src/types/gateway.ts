export interface Gateway {
  id: number
  tenantNodeId: number
  name: string
  macAddress: string
  lastSeenAt: string | null
}

/** Giá trị điền lên thiết bị. Mọi gateway dùng chung tài khoản, phân biệt bằng `clientId` = MAC. */
export interface GatewayConnectionInfo {
  brokerUrl: string
  clientId: string
  username: string
  password: string
  dataTopic: string
  commandTopic: string
  ackTopic: string
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
