import { useMemo } from 'react'
import { NavLink, useMatch } from 'react-router-dom'
import { Building2, ChevronRight, Factory, MapPin, Network } from 'lucide-react'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Skeleton } from '@/components/ui/skeleton'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useTenantNodesQuery } from '@/queries/useTenantNodesQuery'
import { cn } from '@/lib/utils'
import type { NodeType, TenantNode } from '@/types/tenantNode'

const NODE_ICON: Record<NodeType, typeof Building2> = {
  TENANT_ROOT: Building2,
  BRANCH: Network,
  PRODUCTION_AREA: Factory,
  SITE: MapPin,
}

interface TreeNode extends TenantNode {
  children: TreeNode[]
}

function buildTree(nodes: TenantNode[]): TreeNode[] {
  const byId = new Map<number, TreeNode>()
  nodes.forEach((node) => byId.set(node.id, { ...node, children: [] }))
  const roots: TreeNode[] = []
  byId.forEach((node) => {
    const parent = node.parentId != null ? byId.get(node.parentId) : undefined
    if (parent) parent.children.push(node)
    else roots.push(node)
  })
  byId.forEach((node) => node.children.sort((a, b) => a.name.localeCompare(b.name, 'vi')))
  return roots.sort((a, b) => a.name.localeCompare(b.name, 'vi'))
}

/** Đường từ gốc tới node đang mở — dùng để bung sẵn đúng nhánh khi vào thẳng bằng URL. */
function pathToNode(roots: TreeNode[], targetId: number): Set<number> {
  const open = new Set<number>()
  const walk = (node: TreeNode, ancestors: number[]): boolean => {
    if (node.id === targetId) {
      ancestors.forEach((id) => open.add(id))
      return true
    }
    return node.children.some((child) => walk(child, [...ancestors, node.id]))
  }
  roots.forEach((root) => walk(root, []))
  return open
}

function NodeRow({
  node,
  depth,
  defaultOpen,
}: {
  node: TreeNode
  depth: number
  defaultOpen: Set<number>
}) {
  const Icon = NODE_ICON[node.nodeType]
  const hasChildren = node.children.length > 0
  const indent = { paddingInlineStart: `${depth * 12 + 8}px` }

  const link = (
    <NavLink
      to={`/dashboard/${node.id}`}
      className={({ isActive }) =>
        cn(
          'flex min-w-0 flex-1 items-center gap-2 rounded-md py-1.5 pe-2 text-sm transition-colors duration-[var(--motion-fast)]',
          'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
          isActive && 'bg-accent font-medium text-accent-foreground',
          !node.enabled && 'opacity-45'
        )
      }
      style={hasChildren ? undefined : indent}
    >
      <Icon className="size-3.5 shrink-0 opacity-70" />
      <span className="truncate">{node.name}</span>
    </NavLink>
  )

  const row = node.enabled ? (
    link
  ) : (
    <Tooltip>
      <TooltipTrigger asChild>{link}</TooltipTrigger>
      <TooltipContent side="right">Đơn vị đã tắt. Dữ liệu bên dưới vẫn chạy.</TooltipContent>
    </Tooltip>
  )

  if (!hasChildren) {
    return <div className="flex items-center">{row}</div>
  }

  return (
    <Collapsible defaultOpen={defaultOpen.has(node.id) || depth === 0} className="group/branch">
      <div className="flex items-center" style={indent}>
        <CollapsibleTrigger
          className="flex size-5 shrink-0 items-center justify-center rounded text-muted-foreground/60 transition-colors duration-[var(--motion-fast)] hover:bg-accent hover:text-accent-foreground"
          aria-label={`Mở rộng ${node.name}`}
        >
          <ChevronRight className="size-3.5 transition-transform duration-[var(--motion-fast)] group-data-[state=open]/branch:rotate-90" />
        </CollapsibleTrigger>
        {row}
      </div>
      <CollapsibleContent>
        {node.children.map((child) => (
          <NodeRow key={child.id} node={child} depth={depth + 1} defaultOpen={defaultOpen} />
        ))}
      </CollapsibleContent>
    </Collapsible>
  )
}

/**
 * Panel chọn đơn vị. Chỉ AppShell render ở nhóm trang Dashboard (xem `isNodeScopedRoute`) —
 * các trang danh sách/cấu hình chạy theo toàn bộ scope nên cây ở đó chỉ là nhiễu.
 * Nằm trong vùng nội dung chứ không phải khung app, nên dùng token surface/accent thường.
 */
export function OrgTreePanel() {
  const { data: nodes, isLoading } = useTenantNodesQuery()
  const dashboardMatch = useMatch('/dashboard/:nodeId')
  const activeNodeId = Number(dashboardMatch?.params.nodeId)

  const tree = useMemo(() => buildTree(nodes ?? []), [nodes])
  const defaultOpen = useMemo(
    () => (Number.isFinite(activeNodeId) ? pathToNode(tree, activeNodeId) : new Set<number>()),
    [tree, activeNodeId]
  )

  return (
    <aside className="flex w-60 shrink-0 flex-col gap-1 overflow-y-auto border-e border-border bg-surface/60 p-2">
      <p className="px-2 py-1 text-xs font-medium text-muted-foreground">Đơn vị</p>

      {isLoading &&
        Array.from({ length: 6 }).map((_, index) => (
          <Skeleton
            key={index}
            className="h-6"
            style={{ marginInlineStart: `${(index % 3) * 12 + 8}px` }}
          />
        ))}

      {!isLoading && tree.length === 0 && (
        <p className="px-2 py-4 text-xs text-muted-foreground">
          Chưa có đơn vị nào trong phạm vi của bạn.
        </p>
      )}

      {tree.map((root) => (
        <NodeRow key={root.id} node={root} depth={0} defaultOpen={defaultOpen} />
      ))}
    </aside>
  )
}
