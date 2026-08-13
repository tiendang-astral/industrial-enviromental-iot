export type NodeType = 'TENANT_ROOT' | 'BRANCH' | 'PRODUCTION_AREA' | 'SITE'

export interface TenantNode {
  id: number
  parentId: number | null
  nodeType: NodeType
  name: string
  path: string
  depth: number
  enabled: boolean
}

export interface CreateTenantNodeRequest {
  parentId: number
  nodeType: NodeType
  name: string
}

export interface UpdateTenantNodeRequest {
  name: string
}

export interface MoveTenantNodeRequest {
  newParentId: number
}

export interface UpdateTenantNodeStatusRequest {
  enabled: boolean
}
