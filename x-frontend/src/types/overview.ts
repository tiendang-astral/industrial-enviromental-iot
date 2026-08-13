export interface ExternalSourceSummary {
  id: number
  name: string
  tenantNodeId: number
  tenantNodePath: string | null
}

export interface SiteSummary {
  id: number
  name: string
  path: string
}

/** Flatten toàn bộ subtree của 1 node — dùng cho card-grid Dashboard (xem DATABASE.md § dashboard). */
export interface TenantNodeOverview {
  sources: ExternalSourceSummary[]
  sites: SiteSummary[]
}
