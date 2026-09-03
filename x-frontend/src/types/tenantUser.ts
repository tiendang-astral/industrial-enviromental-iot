export interface UserScope {
  id: number
  roleId: number
  roleValue: string | null
  roleName: string | null
  /** null = full-access toàn tenant. */
  tenantNodeId: number | null
  tenantNodeName: string | null
}

export interface TenantUser {
  id: number
  username: string
  fullName: string
  email: string | null
  status: 'ACTIVE' | 'LOCKED'
  createdAt: string
  scopes: UserScope[]
}

export interface UserScopePayload {
  roleId: number
  tenantNodeId: number | null
}

export interface CreateTenantUserRequest {
  username: string
  fullName: string
  email?: string | null
  password: string
  scopes: UserScopePayload[]
}

/** `scopes` là REPLACE toàn bộ, không merge — khớp hành vi backend. */
export interface UpdateTenantUserRequest {
  fullName: string
  email?: string | null
  scopes: UserScopePayload[]
}

export interface UpdateTenantUserStatusRequest {
  status: 'ACTIVE' | 'LOCKED'
}

export interface ResetTenantUserPasswordRequest {
  newPassword: string
}

export interface TenantRole {
  id: number
  name: string
  value: string
}
