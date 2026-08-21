import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import {
  Building,
  Building2,
  MapPin,
  MoveRight,
  Network,
  Pencil,
  Plus,
  Power,
  PowerOff,
  Router,
  Trash2,
  Warehouse,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { TableCell, TableRow } from '@/components/ui/table'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import {
  Table,
  TableBody,
  TreeTableContainer,
  TreeTableHead,
  TreeTableHeader,
  TreeTableLevelLabel,
  TreeTableNameCell,
  TreeTableRow,
  TreeTableStatusBadge,
  useTreeTableRows,
} from '@/components/shared/TreeTable'
import { ConfirmDialog } from '@/components/patterns/ConfirmDialog'
import { EmptyState } from '@/components/patterns/EmptyState'
import { PageHeader } from '@/components/patterns/PageHeader'
import {
  CreateNodeDialog,
  MoveNodeDialog,
  RenameNodeDialog,
} from '@/components/organization/NodeDialogs'
import { getApiErrorMessage } from '@/lib/apiError'
import { NEXT_TYPE, NODE_LABEL } from '@/lib/tenantNodeLabels'
import { useDeleteTenantNodeMutation } from '@/queries/useDeleteTenantNodeMutation'
import { useTenantNodesQuery } from '@/queries/useTenantNodesQuery'
import { useUpdateTenantNodeStatusMutation } from '@/queries/useUpdateTenantNodeStatusMutation'
import type { NodeType, TenantNode } from '@/types/tenantNode'

const NODE_ICON: Record<NodeType, typeof Building2> = {
  TENANT_ROOT: Building2,
  BRANCH: Building,
  PRODUCTION_AREA: Warehouse,
  SITE: MapPin,
}

/** DFS order theo cây (children luôn theo ngay sau cha) — ổn định hơn sort theo path text (label số nhiều chữ số sort sai theo lexical). */
function orderNodesDepthFirst(nodes: TenantNode[]): TenantNode[] {
  const byParent = new Map<number | null, TenantNode[]>()
  for (const node of nodes) {
    const list = byParent.get(node.parentId) ?? []
    list.push(node)
    byParent.set(node.parentId, list)
  }
  for (const list of byParent.values()) {
    list.sort((a, b) => a.name.localeCompare(b.name))
  }
  const result: TenantNode[] = []
  function visit(parentId: number | null) {
    for (const node of byParent.get(parentId) ?? []) {
      result.push(node)
      visit(node.id)
    }
  }
  visit(null)
  return result
}

/** Nút icon trong hàng cây — luôn kèm Tooltip + sr-only để không phải đoán ý nghĩa icon. */
function RowAction({
  label,
  icon: Icon,
  onClick,
  to,
  destructive,
  disabled,
}: {
  label: string
  icon: typeof Plus
  onClick?: () => void
  to?: string
  destructive?: boolean
  disabled?: boolean
}) {
  const button = (
    <Button
      variant="ghost"
      size="icon"
      className={destructive ? 'size-7 text-destructive hover:text-destructive' : 'size-7'}
      disabled={disabled}
      onClick={onClick}
      asChild={!!to}
    >
      {to ? (
        <Link to={to}>
          <Icon />
          <span className="sr-only">{label}</span>
        </Link>
      ) : (
        <>
          <Icon />
          <span className="sr-only">{label}</span>
        </>
      )}
    </Button>
  )

  return (
    <Tooltip>
      <TooltipTrigger asChild>{button}</TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}

export default function OrganizationPage() {
  const { data: nodes, isLoading } = useTenantNodesQuery()
  const orderedNodes = useMemo(() => (nodes ? orderNodesDepthFirst(nodes) : []), [nodes])
  const { rows } = useTreeTableRows(orderedNodes)

  const [createParent, setCreateParent] = useState<TenantNode | null>(null)
  const [renameTarget, setRenameTarget] = useState<TenantNode | null>(null)
  const [moveTarget, setMoveTarget] = useState<TenantNode | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<TenantNode | null>(null)
  const [disableTarget, setDisableTarget] = useState<TenantNode | null>(null)

  const deleteMutation = useDeleteTenantNodeMutation()
  const updateStatusMutation = useUpdateTenantNodeStatusMutation()

  function confirmDelete() {
    if (!deleteTarget) return
    deleteMutation.mutate(deleteTarget.id, {
      onSuccess: () => {
        setDeleteTarget(null)
        toast.success('Xóa thành công')
      },
      onError: (error) => toast.error(getApiErrorMessage(error, 'Xóa thất bại, vui lòng thử lại')),
    })
  }

  function toggleStatus(node: TenantNode, onDone?: () => void) {
    updateStatusMutation.mutate(
      { id: node.id, payload: { enabled: !node.enabled } },
      {
        onSuccess: () => {
          onDone?.()
          toast.success(node.enabled ? 'Đã tắt đơn vị' : 'Đã bật lại đơn vị')
        },
        onError: (error) =>
          toast.error(getApiErrorMessage(error, 'Cập nhật trạng thái thất bại')),
      }
    )
  }

  const rootNode = nodes?.find((node) => node.nodeType === 'TENANT_ROOT')

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Tổ chức"
        description="Cây đơn vị của tenant: Công ty → Chi nhánh → Khu sản xuất → Xưởng/Chuồng trại."
        actions={
          rootNode && (
            <Button onClick={() => setCreateParent(rootNode)}>
              <Plus data-icon="inline-start" />
              Thêm chi nhánh
            </Button>
          )
        }
      />

      <TreeTableContainer>
        <Table>
          <TreeTableHeader>
            <TableRow>
              <TreeTableHead>Tên</TreeTableHead>
              <TreeTableHead>Loại</TreeTableHead>
              <TreeTableHead>Trạng thái</TreeTableHead>
              <TreeTableHead className="w-56 text-right">Tác vụ</TreeTableHead>
            </TableRow>
          </TreeTableHeader>
          <TableBody>
            {isLoading &&
              Array.from({ length: 5 }).map((_, index) => (
                <TableRow key={index} className="h-11">
                  <TableCell>
                    <Skeleton className="h-4 w-40" style={{ marginLeft: `${(index % 3) * 16}px` }} />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-20" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-16 rounded-4xl" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="ml-auto h-7 w-32" />
                  </TableCell>
                </TableRow>
              ))}
            {!isLoading && rows.length === 0 && (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={4} className="py-10">
                  <EmptyState
                    icon={Network}
                    title="Chưa có đơn vị nào"
                    description="Cây tổ chức bắt đầu từ đơn vị gốc của tenant. Liên hệ quản trị viên nếu bạn không thấy đơn vị gốc."
                  />
                </TableCell>
              </TableRow>
            )}
            {rows.map(({ node, depth, hasChildren, isExpanded, childCount, toggle }) => {
              const isLeafType = node.nodeType === 'SITE'
              const childType = NEXT_TYPE[node.nodeType]
              return (
                <TreeTableRow key={node.id} isActive={node.enabled}>
                  <TreeTableNameCell
                    depth={depth}
                    hasChildren={hasChildren}
                    isExpanded={isExpanded}
                    onToggle={toggle}
                    isLeafType={isLeafType}
                    leafIcon={MapPin}
                    typeIcon={NODE_ICON[node.nodeType]}
                    childCount={childCount}
                    isActive={node.enabled}
                  >
                    {isLeafType ? (
                      <Link to={`/organization/sites/${node.id}`} className="hover:underline">
                        {node.name}
                      </Link>
                    ) : (
                      node.name
                    )}
                  </TreeTableNameCell>
                  <TableCell>
                    <TreeTableLevelLabel>{NODE_LABEL[node.nodeType]}</TreeTableLevelLabel>
                  </TableCell>
                  <TableCell>
                    <TreeTableStatusBadge
                      active={node.enabled}
                      activeLabel="Đang hoạt động"
                      inactiveLabel="Đã tắt"
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      {childType && (
                        <RowAction
                          label={`Thêm ${NODE_LABEL[childType].toLowerCase()}`}
                          icon={Plus}
                          disabled={!node.enabled}
                          onClick={() => setCreateParent(node)}
                        />
                      )}
                      {isLeafType && (
                        <RowAction
                          label="Quản lý gateway"
                          icon={Router}
                          to={`/organization/sites/${node.id}`}
                        />
                      )}
                      <RowAction
                        label="Đổi tên"
                        icon={Pencil}
                        onClick={() => setRenameTarget(node)}
                      />
                      {node.nodeType !== 'TENANT_ROOT' && (
                        <RowAction
                          label="Di chuyển"
                          icon={MoveRight}
                          onClick={() => setMoveTarget(node)}
                        />
                      )}
                      <RowAction
                        label={node.enabled ? 'Tắt đơn vị' : 'Bật lại đơn vị'}
                        icon={node.enabled ? PowerOff : Power}
                        disabled={updateStatusMutation.isPending}
                        onClick={() =>
                          node.enabled ? setDisableTarget(node) : toggleStatus(node)
                        }
                      />
                      {node.nodeType !== 'TENANT_ROOT' && (
                        <RowAction
                          label="Xóa đơn vị"
                          icon={Trash2}
                          destructive
                          onClick={() => setDeleteTarget(node)}
                        />
                      )}
                    </div>
                  </TableCell>
                </TreeTableRow>
              )
            })}
          </TableBody>
        </Table>
      </TreeTableContainer>

      <CreateNodeDialog
        parent={createParent}
        onOpenChange={(open) => !open && setCreateParent(null)}
      />
      <RenameNodeDialog
        node={renameTarget}
        onOpenChange={(open) => !open && setRenameTarget(null)}
      />
      <MoveNodeDialog
        node={moveTarget}
        allNodes={nodes ?? []}
        onOpenChange={(open) => !open && setMoveTarget(null)}
      />

      <ConfirmDialog
        open={!!disableTarget}
        onOpenChange={(open) => !open && setDisableTarget(null)}
        title="Tắt đơn vị này?"
        description={`"${disableTarget?.name}" sẽ được đánh dấu đã tắt và không tạo được đơn vị con mới. Gateway và cảnh báo bên dưới vẫn tiếp tục chạy bình thường.`}
        confirmLabel="Tắt đơn vị"
        isPending={updateStatusMutation.isPending}
        onConfirm={() =>
          disableTarget && toggleStatus(disableTarget, () => setDisableTarget(null))
        }
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Xóa đơn vị này?"
        description={`"${deleteTarget?.name}" sẽ bị xóa khỏi cây tổ chức. Thao tác bị chặn nếu đơn vị còn đơn vị con, gateway hoặc nguồn dữ liệu gắn vào. Hành động này không thể hoàn tác.`}
        confirmLabel="Xóa đơn vị"
        destructive
        isPending={deleteMutation.isPending}
        onConfirm={confirmDelete}
      />
    </div>
  )
}
