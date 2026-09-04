import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Network, Pencil, Plus, Trash2 } from 'lucide-react'
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
  TreeTableNameCell,
  TreeTableRow,
  useTreeTableRows,
} from '@/components/shared/TreeTable'
import { ConfirmDialog } from '@/components/patterns/ConfirmDialog'
import { EmptyState } from '@/components/patterns/EmptyState'
import { EnumBadge } from '@/components/patterns/EnumBadge'
import { PageHeader } from '@/components/patterns/PageHeader'
import { StatusBadge } from '@/components/patterns/StatusBadge'
import { CreateNodeDialog, EditNodeDialog } from '@/components/organization/NodeDialogs'
import { getApiErrorMessage } from '@/lib/apiError'
import { orderNodesDepthFirst } from '@/lib/tenantNodeTree'
import { cn } from '@/lib/utils'
import { NEXT_TYPE, NODE_ICON, NODE_LABEL, NODE_LABEL_SHORT } from '@/lib/tenantNodeLabels'
import { useDeleteTenantNodeMutation } from '@/queries/useDeleteTenantNodeMutation'
import { useTenantNodesQuery } from '@/queries/useTenantNodesQuery'
import type { TenantNode } from '@/types/tenantNode'

/**
 * Nút hành động trong hàng cây. `showLabel` cho hai hành động hay dùng nhất (Thêm, Sửa) hiện nhãn
 * ra ngoài — bấm nhầm ở đây là sửa cấu trúc tổ chức thật, không đáng để người dùng phải rê chuột
 * chờ tooltip mới biết nút nào là nút nào. Các nút còn lại giữ dạng icon để hàng không bị vỡ.
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

export default function OrganizationPage() {
  const { data: nodes, isLoading } = useTenantNodesQuery()
  const orderedNodes = useMemo(() => (nodes ? orderNodesDepthFirst(nodes) : []), [nodes])
  const { rows } = useTreeTableRows(orderedNodes)

  // `{ parent: null }` = mở dialog ở chế độ tự chọn đơn vị cha; `null` = dialog đóng.
  const [createState, setCreateState] = useState<{ parent: TenantNode | null } | null>(null)
  const [editTarget, setEditTarget] = useState<TenantNode | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<TenantNode | null>(null)

  const deleteMutation = useDeleteTenantNodeMutation()

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

  const rootNode = nodes?.find((node) => node.nodeType === 'TENANT_ROOT')

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Tổ chức"
        description="Các cấp tổ chức: Công ty → Chi nhánh → Khu sản xuất → Xưởng/Chuồng trại."
        actions={
          rootNode && (
            <Button onClick={() => setCreateState({ parent: null })}>
              <Plus data-icon="inline-start" />
              Thêm tổ chức
            </Button>
          )
        }
      />

      <TreeTableContainer>
        <Table>
          <TreeTableHeader>
            <TableRow>
              <TreeTableHead>Tổ chức</TreeTableHead>
              <TreeTableHead>Loại</TreeTableHead>
              <TreeTableHead>Trạng thái</TreeTableHead>
              <TreeTableHead className="w-[20rem] text-right">Hành động</TreeTableHead>
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
              const childType = NEXT_TYPE[node.nodeType]
              return (
                <TreeTableRow key={node.id} isActive={node.enabled}>
                  <TreeTableNameCell
                    depth={depth}
                    hasChildren={hasChildren}
                    isExpanded={isExpanded}
                    onToggle={toggle}
                    icon={NODE_ICON[node.nodeType]}
                    childCount={childCount}
                    isActive={node.enabled}
                  >
                    {node.name}
                  </TreeTableNameCell>
                  <TableCell>
                    <EnumBadge>{NODE_LABEL[node.nodeType]}</EnumBadge>
                  </TableCell>
                  <TableCell>
                    <StatusBadge
                      status={node.enabled ? 'ENABLED' : 'DISABLED'}
                      label={node.enabled ? 'Đang hoạt động' : 'Đã tắt'}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      {childType && (
                        <RowAction
                          showLabel
                          label={`Thêm ${NODE_LABEL_SHORT[childType].toLowerCase()}`}
                          icon={Plus}
                          disabled={!node.enabled}
                          onClick={() => setCreateState({ parent: node })}
                        />
                      )}
                      <RowAction
                        showLabel
                        label="Sửa"
                        icon={Pencil}
                        onClick={() => setEditTarget(node)}
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
        open={!!createState}
        parent={createState?.parent ?? null}
        allNodes={nodes ?? []}
        onOpenChange={(open) => !open && setCreateState(null)}
      />
      <EditNodeDialog
        node={editTarget}
        allNodes={nodes ?? []}
        onOpenChange={(open) => !open && setEditTarget(null)}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Xóa đơn vị này?"
        description={
          <>
            Bạn có chắc chắn muốn xóa{' '}
            <span className="font-semibold">&ldquo;{deleteTarget?.name}&rdquo;</span>?
          </>
        }
        confirmLabel="Xóa đơn vị"
        destructive
        isPending={deleteMutation.isPending}
        onConfirm={confirmDelete}
      />
    </div>
  )
}
