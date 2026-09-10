import * as React from 'react'
import { ChevronDown, ChevronRight, Pencil, Plus, Trash2, TriangleAlert } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { StatusBadge } from '@/components/patterns/StatusBadge'
import { cn } from '@/lib/utils'
import { sortedChildrenByParentOf } from '@/lib/tenantNodeTree'
import { NEXT_TYPE, NODE_ICON, NODE_LABEL, NODE_LABEL_SHORT } from '@/lib/tenantNodeLabels'
import type { TenantNode } from '@/types/tenantNode'

/**
 * Cây tổ chức dạng thẻ lồng nhau.
 *
 * Trước đây trang này là một bảng phẳng: thứ bậc chỉ còn lại ở phần thụt lề của cột đầu, còn ba cột
 * bên phải cắt ngang làm mắt đọc theo hàng chứ không đọc theo nhánh. Ở đây mỗi cấp là một thẻ, con
 * nằm trong khối có đường dọc chạy dọc bên trái — nhìn ra ngay nhánh nào thuộc nhánh nào mà không
 * cần đếm khoảng trắng.
 *
 * Ba cấp trên (Công ty / Chi nhánh / Khu sản xuất) là vỏ tổ chức nên đeo chip loại và có nền thẻ.
 * Cấp SITE là lá — nơi thật sự gắn gateway — nên bỏ nền, chỉ còn chấm trạng thái và phần đếm bên
 * phải. Nhờ vậy lá không cạnh tranh thị giác với các cấp chứa nó.
 */

/** Lề của đường dọc: 10px padding trái của thẻ + nửa ô chevron (size-5) = 20px. */
const RAIL_OFFSET = 'ms-[20px]'

const SiteIcon = NODE_ICON.SITE

/**
 * Chip loại đơn vị.
 *
 * Cố ý không dùng `EnumBadge`: quy ước của nó là enum phân loại luôn neutral, để màu semantic dành
 * riêng cho trạng thái. Ở đây cấp gốc được tô màu thương hiệu — cyan nằm xa cả ba màu trạng thái
 * trên vòng hue (xem chú thích hệ màu trong `index.css`) nên không ai đọc "CÔNG TY" ra thành một
 * cảnh báo. Đổi lại, mắt tìm ra đỉnh cây ngay từ cái nhìn đầu tiên.
 */
function TypeChip({ nodeType }: { nodeType: TenantNode['nodeType'] }) {
  const isRoot = nodeType === 'TENANT_ROOT'
  return (
    <Badge
      variant={isRoot ? 'outline' : 'secondary'}
      className={cn(
        'h-6 shrink-0 rounded-md px-2 text-[11px] font-semibold tracking-wider uppercase',
        isRoot && 'border-primary/45 bg-primary/15 text-primary'
      )}
    >
      {NODE_LABEL[nodeType]}
    </Badge>
  )
}

export interface OrgTreeCounts {
  /** gateway đang gắn trực tiếp vào đơn vị — chỉ có ý nghĩa ở cấp SITE. */
  gatewayCountByNode: Map<number, number>
  /** cảnh báo còn mở của chính đơn vị đó (không cộng dồn lên cấp trên). */
  openAlertCountByNode: Map<number, number>
}

/** Phần dùng chung cho mọi hàng — truyền thẳng xuống các cấp con khi đệ quy. */
interface OrgTreeContext extends OrgTreeCounts {
  onAddChild: (parent: TenantNode) => void
  onEdit: (node: TenantNode) => void
  onDelete: (node: TenantNode) => void
}

export interface OrgTreeProps extends OrgTreeContext {
  nodes: TenantNode[]
}

/**
 * Nút hành động trong hàng. `showLabel` cho hai hành động hay dùng nhất (Thêm, Sửa) hiện nhãn ra
 * ngoài — bấm nhầm ở đây là sửa cấu trúc tổ chức thật, không đáng để người dùng phải rê chuột chờ
 * tooltip mới biết nút nào là nút nào. Vì lý do đó chúng cũng không ẩn đi rồi chỉ hiện khi hover.
 */
function RowAction({
  label,
  icon: Icon,
  onClick,
  destructive,
  disabled,
  showLabel,
}: {
  label: string
  icon: typeof Plus
  onClick?: () => void
  destructive?: boolean
  disabled?: boolean
  showLabel?: boolean
}) {
  const button = (
    <Button
      variant="ghost"
      size={showLabel ? 'sm' : 'icon'}
      className={cn(
        showLabel ? 'h-7 px-2 text-xs whitespace-nowrap' : 'size-7',
        destructive && 'text-destructive hover:text-destructive'
      )}
      disabled={disabled}
      onClick={onClick}
    >
      <Icon data-icon={showLabel ? 'inline-start' : undefined} />
      {showLabel ? label : <span className="sr-only">{label}</span>}
    </Button>
  )

  // Nút đã hiện nhãn thì tooltip chỉ lặp lại đúng chữ đó.
  if (showLabel) return button

  return (
    <Tooltip>
      <TooltipTrigger asChild>{button}</TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}

interface OrgNodeProps extends OrgTreeContext {
  node: TenantNode
  childrenByParent: Map<number | null, TenantNode[]>
  collapsedIds: Set<number>
  onToggle: (id: number) => void
}

function OrgNode({ node, childrenByParent, collapsedIds, onToggle, ...tree }: OrgNodeProps) {
  const children = childrenByParent.get(node.id) ?? []
  const hasChildren = children.length > 0
  const isExpanded = hasChildren && !collapsedIds.has(node.id)

  const isRoot = node.nodeType === 'TENANT_ROOT'
  const isSite = node.nodeType === 'SITE'
  const childType = NEXT_TYPE[node.nodeType]

  const gatewayCount = tree.gatewayCountByNode.get(node.id) ?? 0
  const openAlertCount = tree.openAlertCountByNode.get(node.id) ?? 0

  return (
    <div>
      <div
        className={cn(
          // h-9 cố định: chiều cao row không được phụ thuộc vào việc row đó có chip, có badge
          // trạng thái hay chỉ có mỗi cái tên — lệch vài pixel giữa các cấp là cây mất nhịp ngay.
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
            // gateway và kênh dữ liệu. Trạng thái bật/tắt đã có badge "Đã tắt" nói, không cần
            // thêm một chấm màu nữa ở đây.
            <SiteIcon className="size-4 text-muted-foreground" aria-hidden />
          ) : null}
        </span>

        {/* Chip loại chỉ cho ba cấp vỏ tổ chức. SITE là cấp lá duy nhất nên chấm + độ sâu đã nói đủ,
            thêm chip nữa chỉ làm mọi hàng lá trông giống nhau một cách ồn ào. */}
        {!isSite && <TypeChip nodeType={node.nodeType} />}

        <span
          className={cn(
            'truncate text-sm',
            isRoot ? 'font-semibold text-foreground' : 'font-normal text-foreground-subtle',
            !node.enabled && 'text-muted-foreground'
          )}
        >
          {node.name}
        </span>

        {hasChildren && (
          <span className="tabular shrink-0 text-sm text-muted-foreground">({children.length})</span>
        )}

        <div className="ms-auto flex shrink-0 items-center gap-2">
          {gatewayCount > 0 && (
            <span className="tabular text-xs text-muted-foreground">{gatewayCount} gateway</span>
          )}
          {openAlertCount > 0 && (
            <Badge variant="destructive">
              <TriangleAlert data-icon="inline-start" />
              {openAlertCount} cảnh báo
            </Badge>
          )}
          {!node.enabled && <StatusBadge status="DISABLED" label="Đã tắt" />}

          <div className="flex items-center gap-1">
            {childType && (
              <RowAction
                showLabel
                label={`Thêm ${NODE_LABEL_SHORT[childType].toLowerCase()}`}
                icon={Plus}
                disabled={!node.enabled}
                onClick={() => tree.onAddChild(node)}
              />
            )}
            <RowAction showLabel label="Sửa" icon={Pencil} onClick={() => tree.onEdit(node)} />
            {!isRoot && (
              <RowAction
                label="Xóa đơn vị"
                icon={Trash2}
                destructive
                onClick={() => tree.onDelete(node)}
              />
            )}
          </div>
        </div>
      </div>

      {isExpanded && (
        <div className={cn('flex flex-col gap-2 border-l border-border ps-3.5 pt-2', RAIL_OFFSET)}>
          {children.map((child) => (
            <OrgNode
              key={child.id}
              {...tree}
              node={child}
              childrenByParent={childrenByParent}
              collapsedIds={collapsedIds}
              onToggle={onToggle}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export function OrgTree({ nodes, ...tree }: OrgTreeProps) {
  const [collapsedIds, setCollapsedIds] = React.useState<Set<number>>(() => new Set())
  const childrenByParent = React.useMemo(() => sortedChildrenByParentOf(nodes), [nodes])

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
          {...tree}
          node={node}
          childrenByParent={childrenByParent}
          collapsedIds={collapsedIds}
          onToggle={toggle}
        />
      ))}
    </div>
  )
}
