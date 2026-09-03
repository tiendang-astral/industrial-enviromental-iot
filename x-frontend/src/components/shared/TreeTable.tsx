import * as React from 'react'
import { ChevronDown, ChevronRight, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

/**
 * Shared "flattened tree as a single table" system: a flat, DFS-ordered node
 * list is rendered as one <table> (never nested tables), with a collapsed-id
 * set controlling which descendant rows are visible.
 */
export interface TreeTableNode {
  id: string | number
  parentId: string | number | null
  /** Raw depth from the source data — any starting index. Normalized to 0 = root internally. */
  depth: number
}

export interface TreeTableRowMeta<T extends TreeTableNode> {
  node: T
  /** Normalized depth, 0 = root. */
  depth: number
  hasChildren: boolean
  childCount: number
  isExpanded: boolean
  toggle: () => void
}

/**
 * `nodes` must already be in DFS order (every node's descendants come immediately
 * after it) — callers typically already produce this order for API/display reasons.
 */
export function useTreeTableRows<T extends TreeTableNode>(nodes: T[]) {
  const [collapsedIds, setCollapsedIds] = React.useState<Set<T['id']>>(() => new Set())

  const { childCountById, minDepth } = React.useMemo(() => {
    const childCountById = new Map<T['id'], number>()
    let minDepth = Infinity
    for (const node of nodes) {
      if (node.depth < minDepth) minDepth = node.depth
      if (node.parentId !== null) {
        childCountById.set(node.parentId as T['id'], (childCountById.get(node.parentId as T['id']) ?? 0) + 1)
      }
    }
    return { childCountById, minDepth: minDepth === Infinity ? 0 : minDepth }
  }, [nodes])

  const toggle = React.useCallback((id: T['id']) => {
    setCollapsedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const rows = React.useMemo(() => {
    const result: TreeTableRowMeta<T>[] = []
    const collapsedAncestors = new Set<T['id']>()
    for (const node of nodes) {
      if (node.parentId !== null && collapsedAncestors.has(node.parentId as T['id'])) {
        collapsedAncestors.add(node.id)
        continue
      }
      const childCount = childCountById.get(node.id) ?? 0
      const hasChildren = childCount > 0
      const isCollapsed = collapsedIds.has(node.id)
      if (hasChildren && isCollapsed) collapsedAncestors.add(node.id)
      result.push({
        node,
        depth: node.depth - minDepth,
        hasChildren,
        childCount,
        isExpanded: hasChildren && !isCollapsed,
        toggle: () => toggle(node.id),
      })
    }
    return result
  }, [nodes, collapsedIds, childCountById, minDepth, toggle])

  return { rows, collapsedIds }
}

export function TreeTableContainer({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      className={cn(
        'overflow-hidden rounded-lg border border-border bg-card shadow-[0_20px_50px_-20px_rgb(0_0_0_/_0.18)]',
        // Nới lề trái/phải của bảng: `TableHead`/`TableCell` mặc định chỉ px-2, cột đầu và cột
        // cuối vì thế dính sát viền hộp.
        '[&_td:first-child]:ps-4 [&_td:last-child]:pe-4 [&_th:first-child]:ps-4 [&_th:last-child]:pe-4',
        className
      )}
      {...props}
    />
  )
}

export function TreeTableHeader({ className, ...props }: React.ComponentProps<typeof TableHeader>) {
  return (
    <TableHeader
      className={cn(
        // Nền xám --muted, giống hàng tiêu đề của DataTable: cách nền bảng (--card) đúng một bậc
        // trong thang neutral, đủ tách bạch mà không thành thanh chắn.
        '[&_tr]:border-b [&_tr]:border-border [&_tr]:bg-muted [&_tr]:hover:bg-muted',
        className
      )}
      {...props}
    />
  )
}

export function TreeTableHead({ className, ...props }: React.ComponentProps<typeof TableHead>) {
  return (
    <TableHead
      className={cn(
        // Khớp hàng tiêu đề của cây tổ chức bên x-frontend-admin: chữ nhỏ, viết hoa, giãn chữ.
        // Tiêu đề cột là nhãn chứ không phải dữ liệu, nên nó lùi xuống dưới tên đơn vị.
        'h-9 text-xs font-semibold tracking-wide text-muted-foreground uppercase',
        className
      )}
      {...props}
    />
  )
}

export function TreeTableRow({
  isActive = true,
  className,
  ...props
}: React.ComponentProps<typeof TableRow> & { isActive?: boolean }) {
  return (
    <TableRow
      className={cn(
        // <TableRow> của shadcn tô nền cho mọi hàng có aria-expanded="true". Trong cây tổ chức
        // hàng cha (có chevron) xen kẽ hàng lá nên nền đó hiện ra đúng như kiểu kẻ sọc ngựa vằn.
        // Trạng thái mở/đóng đã có chevron biểu thị, không cần tô nền.
        // h-11 khớp chiều cao hàng của DataTable — trước đây hàng gốc có padding riêng nên cao
        // hơn các hàng khác, nhìn như bảng bị lệch nhịp ngay ở dòng đầu.
        'h-11 has-aria-expanded:bg-transparent hover:bg-muted/50',
        !isActive && 'text-muted-foreground',
        className
      )}
      {...props}
    />
  )
}

export interface TreeTableNameCellProps {
  depth: number
  hasChildren: boolean
  isExpanded: boolean
  onToggle: () => void
  /** Icon theo loại node. Truyền cho MỌI hàng — thiếu ở một cấp là tên cấp đó lệch sang trái. */
  icon?: LucideIcon
  childCount?: number
  isActive?: boolean
  className?: string
  children: React.ReactNode
}

/**
 * Ô tên trong bảng cây.
 *
 * Nguyên tắc: **thứ bậc do THỤT LỀ và đường nối vẽ ra, không do kiểu chữ.** Bản trước dùng 4 bậc
 * đậm/nhạt khác nhau cho 4 cấp, cộng thêm một bậc nữa cho hàng đã tắt — 5 tổ hợp chữ trong cùng một
 * cột, mỗi cấp chỉ có vài dòng nên mắt đọc ra là lộn xộn chứ không ra hệ thống. Giờ chỉ còn đúng
 * hai bậc: gốc cây đậm hơn một nấc, mọi cấp còn lại giống hệt nhau.
 */
const ROOT_WEIGHT = 'font-semibold'
const CHILD_WEIGHT = 'font-medium'

/** Bậc thụt lề mỗi cấp (px). Giữ ở một chỗ để đường nối và lề luôn khớp nhau. */
const INDENT_STEP = 24

export function TreeTableNameCell({
  depth,
  hasChildren,
  isExpanded,
  onToggle,
  icon: Icon,
  childCount = 0,
  isActive = true,
  className,
  children,
}: TreeTableNameCellProps) {
  const weight = depth === 0 ? ROOT_WEIGHT : CHILD_WEIGHT

  return (
    <TableCell className={className}>
      <div className="flex items-center gap-2" style={{ paddingLeft: depth * INDENT_STEP }}>
        {/* Ô chứa chevron/đường nối luôn chiếm chỗ kể cả khi rỗng — nếu để nó co lại theo nội dung
            thì tên ở các hàng cùng cấp bắt đầu ở những vị trí khác nhau. */}
        <span className="flex size-5 shrink-0 items-center justify-center">
          {hasChildren ? (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation()
                onToggle()
              }}
              className="flex size-5 shrink-0 items-center justify-center rounded text-muted-foreground/70 transition-colors hover:bg-muted hover:text-foreground"
              aria-label={isExpanded ? 'Thu gọn' : 'Mở rộng'}
              aria-expanded={isExpanded}
            >
              {isExpanded ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
            </button>
          ) : depth > 0 ? (
            <span className="mb-1.5 size-2.5 rounded-bl-[3px] border-b border-l border-border" aria-hidden />
          ) : null}
        </span>

        {Icon && <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden />}

        <span
          className={cn(
            'truncate text-sm',
            weight,
            isActive ? 'text-foreground' : 'text-muted-foreground'
          )}
        >
          {children}
        </span>

        {/* Số đơn vị con: cùng cỡ nhỏ, cùng độ đậm với tên của chính node đó, và cùng font chữ —
            bản trước để font-mono nên trong một ô có hai kiểu chữ khác nhau. */}
        {hasChildren && (
          <span className={cn('shrink-0 text-xs tabular text-muted-foreground', weight)}>
            ({childCount})
          </span>
        )}
      </div>
    </TableCell>
  )
}

export { Table, TableBody }
