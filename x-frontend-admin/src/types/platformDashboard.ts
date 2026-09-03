export type TrendRange = '7d' | '30d' | '90d'

export interface TenantStats {
  tenantId: number
  tenantName: string
  userCount: number
  deviceCount: number
  dataSourceCount: number
}

export interface PlatformDashboardSummary {
  totalTenantUsers: number
  totalTenants: number
  totalDevices: number
  totalDataSources: number
  tenants: TenantStats[]
}

export interface TrendPoint {
  date: string
  value: number
}
