import * as React from 'react'
import {
  Building,
  Building2,
  ChevronDown,
  ChevronRight,
  MapPinHouse,
  Warehouse,
  type LucideIcon,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { GatewaySummary, TenantNodeSummary } from '@/types/tenant'

/**
 * Cây tổ chức dạng thẻ lồng nhau — cùng một ngôn ngữ hình ảnh với bảng Tổ chức bên x-frontend.
 *
 * Bản trước là danh sách phẳng chia dòng bằng `divide-y`: thứ bậc chỉ còn ở phần thụt lề, mà cột
 * "Loại" bên phải lại cắt ngang nên mắt đọc theo dòng chứ không đọc theo nhánh. Ở đây mỗi cấp là
 * một thẻ, con nằm trong khối có đường dọc chạy bên trái — nhìn ra ngay nhánh nào thuộc nhánh nào.
 *
 * Trang này chỉ để xem: không có nút sửa/xóa như bên app tenant.
 */

const NODE_TYPE_LABEL: Record<TenantNodeSummary['nodeType'], string> = {
  TENANT_ROOT: 'Công ty',
  BRANCH: 'Chi nhánh',
  PRODUCTION_AREA: 'Khu sản xuất',
  SITE: 'Xưởng/Chuồng trại',
}

const NODE_TYPE_ICON: Record<TenantNodeSummary['nodeType'], LucideIcon> = {
  TENANT_ROOT: Building2,
  BRANCH: Building,
  PRODUCTION_AREA: Warehouse,
  SITE: MapPinHouse,
}

/** Lề của đường dọc: 10px padding trái của thẻ + nửa ô chevron (size-5) = 20px. */
const RAIL_OFFSET = 'ms-[20px]'

const SiteIcon = NODE_TYPE_ICON.SITE

/**
 * Chip loại đơn vị.
 *
 * Cố ý không dùng `EnumBadge`: quy ước của nó là enum phân loại luôn neutral, để màu semantic dành
 * riêng cho trạng thái. Ở đây cấp gốc được tô màu thương hiệu — cyan nằm xa cả ba màu trạng thái
 * trên vòng hue (xem chú thích hệ màu trong `index.css`) nên không ai đọc "CÔNG TY" ra thành một
 * cảnh báo. Đổi lại, mắt tìm ra đỉnh cây ngay từ cái nhìn đầu tiên.
 */
function TypeChip({ nodeType }: { nodeType: TenantNodeSummary['nodeType'] }) {
  const isRoot = nodeType === 'TENANT_ROOT'
  return (
    <Badge
      variant={isRoot ? 'outline' : 'secondary'}
      className={cn(
        'h-6 shrink-0 rounded-md px-2 text-[11px] font-semibold tracking-wider uppercase',
        isRoot && 'border-primary/45 bg-primary/15 text-primary'
      )}
    >
      {NODE_TYPE_LABEL[nodeType]}
    </Badge>
  )
}

/** Con trực tiếp theo `parentId`, mỗi danh sách đã sắp theo tên — khóa `null` là các node gốc. */
function sortedChildrenByParent(nodes: TenantNodeSummary[]) {
  const byParent = new Map<number | null, TenantNodeSummary[]>()
  for (const node of nodes) {
    const list = byParent.get(node.parentId) ?? []
    list.push(node)
    byParent.set(node.parentId, list)
  }
  for (const list of byParent.values()) {
    list.sort((a, b) => a.name.localeCompare(b.name, 'vi'))
  }
  return byParent
}

interface OrgNodeProps {
  node: TenantNodeSummary
  childrenByParent: Map<number | null, TenantNodeSummary[]>
  gatewayCountByNode: Map<number, number>
  collapsedIds: Set<number>
  onToggle: (id: number) => void
}

function OrgNode({ node, childrenByParent, gatewayCountByNode, collapsedIds, onToggle }: OrgNodeProps) {
  const children = childrenByParent.get(node.id) ?? []
  const hasChildren = children.length > 0
  const isExpanded = hasChildren && !collapsedIds.has(node.id)

  const isRoot = node.nodeType === 'TENANT_ROOT'
  const isSite = node.nodeType === 'SITE'
  const gatewayCount = gatewayCountByNode.get(node.id) ?? 0

  return (
    <div>
      <div
        className={cn(
          // h-9 cố định: chiều cao row không được phụ thuộc vào việc row đó có chip hay chỉ có mỗi
          // cái tên — lệch vài pixel giữa các cấp là cây mất nhịp ngay.
          'flex h-9 items-center gap-2.5 rounded-lg border px-2.5 transition-colors',
          isRoot && 'border-primary/30 bg-primary/10',
          !isRoot && !isSite && 'border-border bg-muted/40',
          // Lá không có khung riêng: nền của nó chính là khoảng trắng trong khối cha.
          isSite && 'border-transparent hover:bg-muted/40'
        )}
      >
        {/* Ô chevron luôn chiếm chỗ kể cả khi rỗng — để nó co lại theo nội dung thì tên ở các hàng
            cùng cấp bắt đầu ở những vị trí khác nhau. */}
        <span className="flex size-5 shrink-0 items-center justify-center">
          {hasChildren ? (
            <button
              type="button"
              onClick={() => onToggle(node.id)}
              className="flex size-5 items-center justify-center rounded text-muted-foreground/70 transition-colors hover:bg-muted hover:text-foreground"
              aria-label={isExpanded ? 'Thu gọn' : 'Mở rộng'}
              aria-expanded={isExpanded}
            >
              {isExpanded ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
            </button>
          ) : isSite ? (
            // Chỉ cấp SITE đeo icon — ba cấp trên chỉ là vỏ tổ chức, còn SITE là nơi thật sự gắn
            // gateway và kênh dữ liệu.
            <SiteIcon className="size-4 text-muted-foreground" aria-hidden />
          ) : null}
        </span>

        {/* Chip loại chỉ cho ba cấp vỏ tổ chức. SITE là cấp lá duy nhất nên icon + độ sâu đã nói đủ,
            thêm chip nữa chỉ làm mọi hàng lá trông giống nhau một cách ồn ào. */}
        {!isSite && <TypeChip nodeType={node.nodeType} />}

        <span
          className={cn(
            'truncate text-sm',
            isRoot ? 'font-semibold text-foreground' : 'font-normal text-foreground-subtle'
          )}
        >
          {node.name}
        </span>

        {hasChildren && (
          <span className="tabular shrink-0 text-sm text-muted-foreground">({children.length})</span>
        )}

        {gatewayCount > 0 && (
          <span className="tabular ms-auto shrink-0 text-xs text-muted-foreground">
            {gatewayCount} gateway
          </span>
        )}
      </div>

      {isExpanded && (
        <div className={cn('flex flex-col gap-2 border-l border-border ps-3.5 pt-2', RAIL_OFFSET)}>
          {children.map((child) => (
            <OrgNode
              key={child.id}
              node={child}
              childrenByParent={childrenByParent}
              gatewayCountByNode={gatewayCountByNode}
              collapsedIds={collapsedIds}
              onToggle={onToggle}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export function OrgTree({
  nodes,
  gateways,
}: {
  nodes: TenantNodeSummary[]
  gateways: GatewaySummary[]
}) {
  const [collapsedIds, setCollapsedIds] = React.useState<Set<number>>(() => new Set())
  const childrenByParent = React.useMemo(() => sortedChildrenByParent(nodes), [nodes])

  // Cây tổ chức mà không nói đơn vị nào đang có thiết bị thì chỉ là sơ đồ treo tường. Gateway đã
  // nằm sẵn trong response chi tiết tenant nên chỗ này không thêm request nào.
  const gatewayCountByNode = React.useMemo(() => {
    const result = new Map<number, number>()
    for (const gateway of gateways) {
      result.set(gateway.tenantNodeId, (result.get(gateway.tenantNodeId) ?? 0) + 1)
    }
    return result
  }, [gateways])

  const toggle = React.useCallback((id: number) => {
    setCollapsedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  return (
    <div className="flex flex-col gap-2">
      {(childrenByParent.get(null) ?? []).map((node) => (
        <OrgNode
          key={node.id}
          node={node}
          childrenByParent={childrenByParent}
          gatewayCountByNode={gatewayCountByNode}
          collapsedIds={collapsedIds}
          onToggle={toggle}
        />
      ))}
    </div>
  )
}
