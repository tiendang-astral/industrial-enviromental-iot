import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Pencil, Plus, Router, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/patterns/ConfirmDialog'
import { CopyButton } from '@/components/patterns/CopyButton'
import { DataTable, type DataTableColumn } from '@/components/patterns/DataTable'
import { EmptyState } from '@/components/patterns/EmptyState'
import { PageHeader } from '@/components/patterns/PageHeader'
import { StatusBadge } from '@/components/patterns/StatusBadge'
import { GatewayFormDialog } from '@/components/devices/GatewayFormDialog'
import { getApiErrorMessage } from '@/lib/apiError'
import { formatRelativeTime } from '@/lib/datetime'
import { useAllGatewaysQuery } from '@/queries/useGatewaysQuery'
import { useDeleteGatewayMutation } from '@/queries/useDeleteGatewayMutation'
import { useTenantNodesQuery } from '@/queries/useTenantNodesQuery'
import type { Gateway } from '@/types/gateway'

/** Ngưỡng online khớp `app.device.online-threshold-minutes` mặc định ở backend (5'). */
const ONLINE_THRESHOLD_MINUTES = 5

function isOnline(lastSeenAt: string | null) {
  if (!lastSeenAt) return false
  return Date.now() - new Date(lastSeenAt).getTime() < ONLINE_THRESHOLD_MINUTES * 60000
}

export default function DevicesPage() {
  const navigate = useNavigate()
  const { data: gateways, isLoading } = useAllGatewaysQuery()
  const { data: nodes } = useTenantNodesQuery()
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Gateway | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Gateway | null>(null)

  const deleteMutation = useDeleteGatewayMutation()
  const sites = nodes?.filter((node) => node.nodeType === 'SITE') ?? []

  function siteName(tenantNodeId: number) {
    return nodes?.find((node) => node.id === tenantNodeId)?.name ?? `#${tenantNodeId}`
  }

  function confirmDelete() {
    if (!deleteTarget) return
    deleteMutation.mutate(deleteTarget.id, {
      onSuccess: () => {
        setDeleteTarget(null)
        toast.success('Xóa gateway thành công')
      },
      onError: (error) => toast.error(getApiErrorMessage(error, 'Xóa thất bại, vui lòng thử lại')),
    })
  }

  const columns: DataTableColumn<Gateway>[] = [
    {
      key: 'name',
      header: 'Tên',
      filter: { type: 'text', placeholder: 'Tìm kiếm tên', getValue: (row) => row.name },
      cell: (row) => (
        <Link to={`/devices/${row.id}`} className="font-medium hover:underline">
          {row.name}
        </Link>
      ),
    },
    {
      key: 'mac',
      header: 'Địa chỉ MAC',
      filter: { type: 'text', placeholder: 'Tìm kiếm MAC', getValue: (row) => row.macAddress },
      cell: (row) => (
        <span className="inline-flex items-center gap-1">
          <span className="tabular text-muted-foreground">{row.macAddress}</span>
          <CopyButton value={row.macAddress} label={`Sao chép địa chỉ MAC ${row.macAddress}`} />
        </span>
      ),
    },
    {
      key: 'site',
      header: 'Xưởng / Chuồng trại',
      filter: {
        type: 'select',
        placeholder: 'Xưởng',
        getValue: (row) => String(row.tenantNodeId),
        options: sites.map((site) => ({ value: String(site.id), label: site.name })),
      },
      cell: (row) => siteName(row.tenantNodeId),
    },
    {
      key: 'status',
      header: 'Trạng thái',
      filter: {
        type: 'select',
        placeholder: 'Trạng thái',
        getValue: (row) => (isOnline(row.lastSeenAt) ? 'ONLINE' : 'OFFLINE'),
        options: [
          { value: 'ONLINE', label: 'Trực tuyến' },
          { value: 'OFFLINE', label: 'Mất kết nối' },
        ],
      },
      cell: (row) => <StatusBadge status={isOnline(row.lastSeenAt) ? 'ONLINE' : 'OFFLINE'} />,
    },
    {
      key: 'lastSeen',
      header: 'Hoạt động lần cuối',
      headerClassName: 'text-right',
      className: 'text-muted-foreground tabular text-right',
      cell: (row) => (row.lastSeenAt ? formatRelativeTime(row.lastSeenAt) : 'Chưa từng kết nối'),
    },
    {
      key: 'actions',
      header: 'Hành động',
      headerClassName: 'w-40 text-right',
      className: 'text-right',
      // Bỏ nút "Xem chi tiết": click vào hàng đã mở đúng trang đó rồi, giữ lại chỉ là một đích bấm
      // thứ hai cho cùng một việc.
      cell: (row) => (
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() => setEditTarget(row)}
          >
            <Pencil data-icon="inline-start" />
            Sửa
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs text-destructive hover:text-destructive"
            onClick={() => setDeleteTarget(row)}
          >
            <Trash2 data-icon="inline-start" />
            Xóa
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Thiết bị"
        description="Danh sách gateway của đơn vị."
        actions={
          <Button onClick={() => setIsCreateOpen(true)}>
            <Plus data-icon="inline-start" />
            Thêm thiết bị
          </Button>
        }
      />

      <DataTable
        columns={columns}
        rows={gateways}
        getRowId={(row) => row.id}
        isLoading={isLoading}
        onRowClick={(row) => navigate(`/devices/${row.id}`)}
        empty={
          <EmptyState
            icon={Router}
            title="Chưa có thiết bị nào"
            description="Thêm thiết bị và gán vào xưởng để bắt đầu nhận dữ liệu cảm biến."
          />
        }
      />

      <GatewayFormDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        nodes={nodes ?? []}
        gateway={null}
      />
      <GatewayFormDialog
        open={!!editTarget}
        onOpenChange={(open) => !open && setEditTarget(null)}
        nodes={nodes ?? []}
        gateway={editTarget}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Xóa gateway này?"
        question={
          <>
            Bạn có chắc chắn muốn xóa{' '}
            <span className="font-semibold">&ldquo;{deleteTarget?.name}&rdquo;</span>?
          </>
        }
        description="Gateway sẽ bị gỡ khỏi hệ thống và ngừng nhận dữ liệu. Dữ liệu lịch sử đã ghi vẫn được giữ lại."
        confirmLabel="Xóa gateway"
        destructive
        isPending={deleteMutation.isPending}
        onConfirm={confirmDelete}
      />
    </div>
  )
}
