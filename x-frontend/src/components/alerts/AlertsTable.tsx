import { ShieldCheck } from 'lucide-react'
import { DataTable, type DataTableColumn } from '@/components/patterns/DataTable'
import { EmptyState } from '@/components/patterns/EmptyState'
import { StatusBadge } from '@/components/patterns/StatusBadge'
import { AlertStatusBadge } from '@/components/alerts/AlertStatusBadge'
import { formatConditions } from '@/lib/alertConditions'
import { formatDateTime, formatRelativeTime } from '@/lib/datetime'
import type { Alert } from '@/types/alert'
import type { TenantNode } from '@/types/tenantNode'

export function AlertsTable({
  alerts,
  nodes,
  isLoading,
}: {
  alerts: Alert[] | undefined
  nodes: TenantNode[]
  isLoading: boolean
}) {
  const nodeName = (id: number) => nodes.find((node) => node.id === id)?.name ?? `#${id}`

  const columns: DataTableColumn<Alert>[] = [
    {
      key: 'status',
      header: 'Trạng thái',
      filter: {
        type: 'select',
        placeholder: 'Mọi trạng thái',
        getValue: (alert) => alert.status,
        options: [
          { value: 'ACTIVE', label: 'Đang cảnh báo' },
          { value: 'PENDING', label: 'Đang theo dõi' },
          { value: 'RECOVERED', label: 'Đã phục hồi' },
          { value: 'STALE', label: 'Ngừng theo dõi' },
        ],
      },
      cell: (alert) => <AlertStatusBadge status={alert.status} />,
    },
    {
      key: 'rule',
      header: 'Quy tắc',
      filter: { type: 'text', placeholder: 'Tìm theo quy tắc', getValue: (alert) => alert.ruleName ?? '' },
      cell: (alert) => (
        <div className="flex flex-col gap-0.5">
          <span className="font-medium">{alert.ruleName ?? 'Quy tắc đã xóa'}</span>
          <span className="text-[12.5px] text-muted-foreground">{nodeName(alert.tenantNodeId)}</span>
        </div>
      ),
    },
    {
      key: 'datastream',
      header: 'Kênh dữ liệu',
      cell: (alert) => alert.datastreamName ?? '—',
    },
    {
      key: 'value',
      header: 'Giá trị đo',
      cell: (alert) => (
        <div className="flex flex-col gap-0.5">
          <span className="tabular font-medium">
            {alert.lastObservedValue ?? '—'}
            {alert.metricUnit ? ` ${alert.metricUnit}` : ''}
          </span>
          {/* Ngưỡng chụp lúc alert mở, không phải ngưỡng hiện tại của rule — sửa rule sau đó
              không làm sai lịch sử. */}
          <span className="tabular text-[12.5px] text-muted-foreground">
            ngưỡng {formatConditions(alert.thresholdSnapshot, alert.metricUnit)}
          </span>
        </div>
      ),
    },
    {
      key: 'severity',
      header: 'Mức độ',
      filter: {
        type: 'select',
        placeholder: 'Mọi mức',
        getValue: (alert) => alert.severity,
        options: [
          { value: 'WARNING', label: 'Cảnh báo' },
          { value: 'CRITICAL', label: 'Nguy hiểm' },
        ],
      },
      cell: (alert) => <StatusBadge status={alert.severity} />,
    },
    {
      key: 'startedAt',
      header: 'Bắt đầu',
      cell: (alert) => (
        <div className="flex flex-col gap-0.5">
          <span className="tabular text-[12.5px]">{formatDateTime(alert.startedAt)}</span>
          <span className="text-[12.5px] text-muted-foreground">{formatRelativeTime(alert.startedAt)}</span>
        </div>
      ),
    },
    {
      key: 'recoveredAt',
      header: 'Phục hồi',
      cell: (alert) =>
        alert.recoveredAt ? (
          <span className="tabular text-[12.5px]">{formatDateTime(alert.recoveredAt)}</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
  ]

  return (
    <DataTable
      columns={columns}
      rows={alerts}
      getRowId={(alert) => alert.id}
      isLoading={isLoading}
      pageSize={20}
      empty={
        <EmptyState
          icon={ShieldCheck}
          title="Không có cảnh báo nào"
        />
      }
    />
  )
}
