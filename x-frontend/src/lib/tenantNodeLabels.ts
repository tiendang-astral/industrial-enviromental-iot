import type { NodeType } from '@/types/tenantNode'

/** Cấp con hợp lệ ngay dưới mỗi cấp — khớp CHECK thứ bậc của `tenant_node` ở DB. */
export const NEXT_TYPE: Partial<Record<NodeType, NodeType>> = {
  TENANT_ROOT: 'BRANCH',
  BRANCH: 'PRODUCTION_AREA',
  PRODUCTION_AREA: 'SITE',
}

export const NODE_LABEL: Record<NodeType, string> = {
  TENANT_ROOT: 'Công ty',
  BRANCH: 'Chi nhánh',
  PRODUCTION_AREA: 'Khu sản xuất',
  SITE: 'Xưởng/Chuồng trại',
}
