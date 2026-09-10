import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Network, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ConfirmDialog } from '@/components/patterns/ConfirmDialog'
import { EmptyState } from '@/components/patterns/EmptyState'
import { PageHeader } from '@/components/patterns/PageHeader'
import { CreateNodeDialog, EditNodeDialog } from '@/components/organization/NodeDialogs'
import { OrgTree } from '@/components/organization/OrgTree'
import { getApiErrorMessage } from '@/lib/apiError'
import { useAlertsQuery } from '@/queries/useAlertsQuery'
import { useAllGatewaysQuery } from '@/queries/useGatewaysQuery'
import { useDeleteTenantNodeMutation } from '@/queries/useDeleteTenantNodeMutation'
import { useTenantNodesQuery } from '@/queries/useTenantNodesQuery'
import type { TenantNode } from '@/types/tenantNode'

/** Đếm số phần tử theo `tenantNodeId` — dùng chung cho cả gateway lẫn cảnh báo. */
function countByNode(items: { tenantNodeId: number }[] | undefined): Map<number, number> {
  const result = new Map<number, number>()
  for (const item of items ?? []) {
    result.set(item.tenantNodeId, (result.get(item.tenantNodeId) ?? 0) + 1)
  }
  return result
}

export default function OrganizationPage() {
  const { data: nodes, isLoading } = useTenantNodesQuery()

  // Cây tổ chức mà không nói đơn vị nào đang có thiết bị, đơn vị nào đang có sự cố thì chỉ là sơ đồ
  // treo tường. Hai truy vấn này đều đã dùng ở nơi khác nên không thêm endpoint mới.
  const { data: gateways } = useAllGatewaysQuery()
  const { data: openAlerts } = useAlertsQuery('OPEN')

  const gatewayCountByNode = useMemo(() => countByNode(gateways), [gateways])
  const openAlertCountByNode = useMemo(() => countByNode(openAlerts), [openAlerts])

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

      <div className="overflow-hidden rounded-lg border border-border bg-card shadow-panel">
        <div className="flex h-9 items-center justify-between border-b border-border bg-table-header px-4">
          <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            Cây tổ chức
          </span>
          {!isLoading && nodes && nodes.length > 0 && (
            <span className="tabular text-xs text-muted-foreground">{nodes.length} đơn vị</span>
          )}
        </div>

        <div className="flex flex-col gap-2 p-3">
          {isLoading &&
            Array.from({ length: 5 }).map((_, index) => (
              <Skeleton
                key={index}
                className="h-9 rounded-lg"
                // Thụt lề tăng dần để khung chờ có đúng dáng cây, không phải năm thanh bằng nhau.
                style={{ marginLeft: `${Math.min(index, 3) * 24}px` }}
              />
            ))}

          {!isLoading && (!nodes || nodes.length === 0) && (
            <div className="py-10">
              <EmptyState
                icon={Network}
                title="Chưa có đơn vị nào"
                description="Cây tổ chức bắt đầu từ đơn vị gốc của tenant. Liên hệ quản trị viên nếu bạn không thấy đơn vị gốc."
              />
            </div>
          )}

          {!isLoading && nodes && nodes.length > 0 && (
            <OrgTree
              nodes={nodes}
              gatewayCountByNode={gatewayCountByNode}
              openAlertCountByNode={openAlertCountByNode}
              onAddChild={(parent) => setCreateState({ parent })}
              onEdit={setEditTarget}
              onDelete={setDeleteTarget}
            />
          )}
        </div>
      </div>

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
