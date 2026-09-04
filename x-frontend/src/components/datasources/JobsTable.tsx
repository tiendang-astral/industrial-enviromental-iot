import { useNavigate } from 'react-router-dom'
import { DataTable, type DataTableColumn } from '@/components/patterns/DataTable'
import { StatusBadge } from '@/components/patterns/StatusBadge'
import { formatDateTime, formatRelativeTime } from '@/lib/datetime'
import { CRON_PRESETS } from '@/lib/sqlTemplate'
import type { Datastream } from '@/types/dashboard'
import type { ExternalSourceJob } from '@/types/externalSource'

/** Cron 5 field thành câu tiếng Việt khi khớp preset, còn lại giữ nguyên biểu thức. */
function describeCron(cron: string) {
  return CRON_PRESETS.find((preset) => preset.value === cron)?.label ?? cron
}

export function JobsTable({
  externalSourceId,
  jobs,
  datastreams,
  isLoading,
  empty,
}: {
  externalSourceId: number
  jobs: ExternalSourceJob[]
  datastreams: Datastream[]
  isLoading: boolean
  empty: React.ReactNode
}) {
  const navigate = useNavigate()

  const columns: DataTableColumn<ExternalSourceJob>[] = [
    {
      key: 'name',
      header: 'Job',
      filter: { type: 'text', placeholder: 'Tìm kiếm tên', getValue: (row) => row.name },
      cell: (row) => <span className="font-medium">{row.name}</span>,
    },
    {
      key: 'schedule',
      header: 'Chu kỳ',
      className: 'text-muted-foreground',
      cell: (row) => describeCron(row.scheduleCron),
    },
    {
      // Gộp trạng thái + thời điểm: đứng riêng thì "Trạng thái" không nói của cái gì, còn
      // "Chạy gần nhất" đặt cạnh "Chạy tới" thì không rõ cái nào quá khứ cái nào tương lai.
      key: 'lastRun',
      header: 'Lần chạy cuối',
      filter: {
        type: 'select',
        placeholder: 'Trạng thái',
        getValue: (row) => row.lastRunStatus ?? 'NEVER_RUN',
        options: [
          { value: 'SUCCESS', label: 'Thành công' },
          { value: 'RUNNING', label: 'Đang chạy' },
          { value: 'FAILED', label: 'Thất bại' },
          { value: 'NEVER_RUN', label: 'Chưa chạy' },
        ],
      },
      cell: (row) => (
        <div className="flex items-center gap-2">
          {row.lastRunStatus ? (
            <StatusBadge status={row.lastRunStatus} />
          ) : (
            <StatusBadge status="PENDING" label="Chưa chạy" />
          )}
          {row.lastRunAt && (
            <span className="tabular text-muted-foreground">{formatDateTime(row.lastRunAt)}</span>
          )}
        </div>
      ),
    },
    {
      key: 'nextRun',
      header: 'Lần tới',
      className: 'text-muted-foreground',
      cell: (row) => formatRelativeTime(row.nextRunAt),
    },
    {
      key: 'channels',
      header: 'Kênh dữ liệu',
      headerClassName: 'text-right',
      className: 'tabular text-right',
      cell: (row) => datastreams.filter((item) => item.sourceId === row.id).length,
    },
    {
      key: 'rows',
      header: 'Dòng đã đọc',
      headerClassName: 'text-right',
      className: 'tabular text-right',
      cell: (row) => row.totalRowCount.toLocaleString('vi-VN'),
    },
  ]

  return (
    <DataTable
      columns={columns}
      rows={jobs}
      getRowId={(row) => row.id}
      isLoading={isLoading}
      onRowClick={(row) => navigate(`/data-sources/${externalSourceId}/jobs/${row.id}/config`)}
      empty={empty}
    />
  )
}
