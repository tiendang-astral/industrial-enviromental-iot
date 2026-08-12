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
        'overflow-hidden rounded-2xl border border-border bg-card shadow-[0_20px_50px_-20px_rgb(0_0_0_/_0.18)]',
        className
      )}
      {...props}
    />
  )
}

export function TreeTableHeader({ className, ...props }: React.ComponentProps<typeof TableHeader>) {
  return (
    <TableHeader
      className={cn('[&_tr]:border-b [&_tr]:border-border [&_tr]:bg-muted/40 [&_tr]:hover:bg-muted/40', className)}
      {...props}
    />
  )
}

export function TreeTableHead({ className, ...props }: React.ComponentProps<typeof TableHead>) {
  return (
    <TableHead
      className={cn('h-9 text-[11px] font-bold tracking-wide text-muted-foreground uppercase', className)}
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
      className={cn(!isActive && 'bg-muted/30 text-muted-foreground hover:bg-muted/40', className)}
      {...props}
    />
  )
}

export interface TreeTableNameCellProps {
  depth: number
  hasChildren: boolean
  isExpanded: boolean
  onToggle: () => void
  /** True when this node's *type* is always a leaf (e.g. it can never have children), not just currently childless. */
  isLeafType?: boolean
  /** Icon shown for leaf-type nodes instead of the expand chevron / connector glyph. */
  leafIcon?: LucideIcon
  /** Icon shown next to the name for non-leaf-type nodes. */
  typeIcon?: LucideIcon
  childCount?: number
  isActive?: boolean
  className?: string
  children: React.ReactNode
}

export function TreeTableNameCell({
  depth,
  hasChildren,
  isExpanded,
  onToggle,
  isLeafType = false,
  leafIcon: LeafIcon,
  typeIcon: TypeIcon,
  childCount = 0,
  isActive = true,
  className,
  children,
}: TreeTableNameCellProps) {
  const ShownTypeIcon = isLeafType ? undefined : TypeIcon

  return (
    <TableCell className={cn('border-l-2', depth > 0 ? 'border-l-border' : 'border-l-transparent', className)}>
      <div
        className={cn('flex items-center gap-1.5', depth === 0 ? 'py-1.5' : 'py-0')}
        style={{ paddingLeft: depth * 20 }}
      >
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
          ) : isLeafType && LeafIcon ? (
            <LeafIcon className="size-3.5 text-muted-foreground/70" aria-hidden />
          ) : depth > 0 ? (
            <span className="mb-1.5 size-2.5 rounded-bl-[3px] border-b border-l border-border" aria-hidden />
          ) : null}
        </span>
        {ShownTypeIcon && <ShownTypeIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden />}
        <span
          className={cn(
            'truncate',
            !isActive
              ? 'font-medium text-muted-foreground'
              : depth === 0
                ? 'text-sm font-semibold text-foreground'
                : depth === 1
                  ? 'text-[13px] font-medium text-foreground/85'
                  : 'text-[13px] font-medium text-muted-foreground'
          )}
        >
          {children}
        </span>
        {hasChildren && <span className="font-mono text-xs tabular-nums text-muted-foreground">({childCount})</span>}
      </div>
    </TableCell>
  )
}

export function TreeTableLevelLabel({ className, ...props }: React.ComponentProps<'span'>) {
  return <span className={cn('text-xs text-muted-foreground', className)} {...props} />
}

export function TreeTableStatusBadge({
  active,
  activeLabel = 'Hoạt động',
  inactiveLabel = 'Ngừng',
  className,
}: {
  active: boolean
  activeLabel?: string
  inactiveLabel?: string
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex w-fit items-center rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap',
        active
          ? 'border-green-200 bg-green-50 text-green-700 dark:border-green-500/25 dark:bg-green-500/10 dark:text-green-400'
          : 'border-border bg-muted text-muted-foreground',
        className
      )}
    >
      {active ? activeLabel : inactiveLabel}
    </span>
  )
}

export { Table, TableBody }
