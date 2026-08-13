export type TenantStatus = 'ACTIVE' | 'LOCKED'

export interface Tenant {
  id: number
  name: string
  email: string
  status: TenantStatus
  createdAt: string
}

export interface CreateTenantRequest {
  name: string
  email: string
  adminUsername: string
  adminFullName: string
  adminEmail?: string
  adminPassword: string
}

export type NodeType = 'TENANT_ROOT' | 'BRANCH' | 'PRODUCTION_AREA' | 'SITE'

export interface TenantNodeSummary {
  id: number
  parentId: number | null
  nodeType: NodeType
  name: string
  path: string
  depth: number
}

export interface GatewaySummary {
  id: number
  tenantNodeId: number
  name: string
  macAddress: string
  lastSeenAt: string | null
}

export interface TenantUserSummary {
  id: number
  username: string
  fullName: string
  email: string
  status: TenantStatus
}

export interface TenantDetail {
  tenant: Tenant
  nodes: TenantNodeSummary[]
  gateways: GatewaySummary[]
  users: TenantUserSummary[]
}
