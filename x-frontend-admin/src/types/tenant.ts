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
