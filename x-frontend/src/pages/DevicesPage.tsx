import { useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { Eye, MapPin, Pencil, Plus, Router, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { ConfirmDialog } from '@/components/patterns/ConfirmDialog'
import { DataTable, type DataTableColumn } from '@/components/patterns/DataTable'
import { EmptyState } from '@/components/patterns/EmptyState'
import { PageHeader } from '@/components/patterns/PageHeader'
import { StatusBadge } from '@/components/patterns/StatusBadge'
import { GatewayFormDialog } from '@/components/devices/GatewayFormDialog'
import { getApiErrorMessage } from '@/lib/apiError'
import { useAllGatewaysQuery } from '@/queries/useGatewaysQuery'
import { useDeleteGatewayMutation } from '@/queries/useDeleteGatewayMutation'
import { useTenantNodesQuery } from '@/queries/useTenantNodesQuery'
import type { Gateway } from '@/types/gateway'

/** Ngưỡng online khớp `app.device.online-threshold-minutes` mặc định ở backend (5'). */
const ONLINE_THRESHOLD_MINUTES = 5

function lastSeenLabel(lastSeenAt: string | null) {
  if (!lastSeenAt) return 'Chưa từng kết nối'
  const diffMinutes = Math.floor((Date.now() - new Date(lastSeenAt).getTime()) / 60000)
  if (diffMinutes < 1) return 'Vừa xong'
  if (diffMinutes < 60) return `${diffMinutes} phút trước`
  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24) return `${diffHours} giờ trước`
  return `${Math.floor(diffHours / 24)} ngày trước`
}

function isOnline(lastSeenAt: string | null) {
  if (!lastSeenAt) return false
  return Date.now() - new Date(lastSeenAt).getTime() < ONLINE_THRESHOLD_MINUTES * 60000
}

export default function DevicesPage() {
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
      sortValue: (row) => row.name,
      cell: (row) => (
        <Link to={`/devices/${row.id}`} className="font-medium hover:underline">
          {row.name}
        </Link>
      ),
    },
    {
      key: 'mac',
      header: 'MAC address',
      sortValue: (row) => row.macAddress,
      cell: (row) => <span className="tabular text-muted-foreground">{row.macAddress}</span>,
    },
    {
      key: 'site',
      header: 'Site',
      sortValue: (row) => siteName(row.tenantNodeId),
      cell: (row) => (
        <Link
          to={`/organization/sites/${row.tenantNodeId}`}
          className="inline-flex items-center gap-1.5 hover:underline"
        >
          <MapPin className="size-3.5 text-muted-foreground" />
          {siteName(row.tenantNodeId)}
        </Link>
      ),
    },
    {
      key: 'status',
      header: 'Trạng thái',
      sortValue: (row) => row.lastSeenAt ?? '',
      cell: (row) => (
        <div className="flex items-center gap-2">
          <StatusBadge status={isOnline(row.lastSeenAt) ? 'ONLINE' : 'OFFLINE'} />
          <span className="text-xs text-muted-foreground">{lastSeenLabel(row.lastSeenAt)}</span>
        </div>
      ),
    },
    {
      key: 'actions',
      header: 'Tác vụ',
      headerClassName: 'w-32 text-right',
      className: 'text-right',
      cell: (row) => (
        <div className="flex items-center justify-end gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="size-7" asChild>
                <Link to={`/devices/${row.id}`}>
                  <Eye />
                  <span className="sr-only">Xem chi tiết</span>
                </Link>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Xem chi tiết</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-7"
                onClick={() => setEditTarget(row)}
              >
                <Pencil />
                <span className="sr-only">Sửa gateway</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Sửa gateway</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-7 text-destructive hover:text-destructive"
                onClick={() => setDeleteTarget(row)}
              >
                <Trash2 />
                <span className="sr-only">Xóa gateway</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Xóa gateway</TooltipContent>
          </Tooltip>
        </div>
      ),
    },
  ]

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Thiết bị"
        description="Toàn bộ gateway trong phạm vi bạn được phân quyền."
        actions={
          <Button onClick={() => setIsCreateOpen(true)}>
            <Plus data-icon="inline-start" />
            Thêm gateway
          </Button>
        }
      />

      <DataTable
        columns={columns}
        rows={gateways}
        getRowId={(row) => row.id}
        isLoading={isLoading}
        searchable={{
          placeholder: 'Tìm theo tên hoặc MAC address',
          getText: (row) => `${row.name} ${row.macAddress} ${siteName(row.tenantNodeId)}`,
        }}
        empty={
          <EmptyState
            icon={Router}
            title="Chưa có gateway nào"
            description="Thêm gateway và gán vào site để bắt đầu nhận dữ liệu cảm biến."
            action={
              <Button onClick={() => setIsCreateOpen(true)}>
                <Plus data-icon="inline-start" />
                Thêm gateway
              </Button>
            }
          />
        }
      />

      <GatewayFormDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        sites={sites}
        gateway={null}
      />
      <GatewayFormDialog
        open={!!editTarget}
        onOpenChange={(open) => !open && setEditTarget(null)}
        sites={sites}
        gateway={editTarget}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Xóa gateway này?"
        description={`"${deleteTarget?.name}" sẽ bị gỡ khỏi hệ thống và ngừng nhận dữ liệu. Dữ liệu lịch sử đã ghi vẫn được giữ lại.`}
        confirmLabel="Xóa gateway"
        destructive
        isPending={deleteMutation.isPending}
        onConfirm={confirmDelete}
      />
    </div>
  )
}
