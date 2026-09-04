import { Building, Building2, MapPinHouse, Warehouse, type LucideIcon } from 'lucide-react'
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

/**
 * Nhãn ngắn cho nút hành động trong hàng bảng ("Thêm chi nhánh", "Thêm xưởng"...).
 * Khác NODE_LABEL ở mỗi cấp SITE: "Xưởng/Chuồng trại" quá dài cho một nút nằm trong hàng.
 */
export const NODE_LABEL_SHORT: Record<NodeType, string> = {
  TENANT_ROOT: 'Công ty',
  BRANCH: 'Chi nhánh',
  PRODUCTION_AREA: 'Khu sản xuất',
  SITE: 'Xưởng',
}

/**
 * Khớp bộ icon cây tổ chức ở trang chi tiết tenant (x-frontend-admin) — cùng một cây thì cùng một
 * bộ ký hiệu, dù hai app deploy riêng. Dùng chung giữa bảng trang Tổ chức và `TenantNodePicker`.
 */
export const NODE_ICON: Record<NodeType, LucideIcon> = {
  TENANT_ROOT: Building2,
  BRANCH: Building,
  PRODUCTION_AREA: Warehouse,
  SITE: MapPinHouse,
}
