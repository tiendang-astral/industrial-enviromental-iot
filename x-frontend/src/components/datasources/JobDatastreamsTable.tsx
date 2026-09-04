import { History, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { DataTable, type DataTableColumn } from '@/components/patterns/DataTable'
import { formatDateTime } from '@/lib/datetime'
import { useBackfillQuery } from '@/queries/useBackfillQuery'
import type { Datastream } from '@/types/dashboard'
import type { DatastreamTelemetry } from '@/types/externalSource'

/** Tiến độ vá chạy nền — thay chỗ mốc "có số đo từ" khi đang chạy, vì lúc đó mốc đang lùi dần. */
function CoverageCell({ datastream }: { datastream: Datastream }) {
  const { data: backfill } = useBackfillQuery(datastream.id)

  if (backfill?.status === 'PENDING' || backfill?.status === 'RUNNING') {
    return <span className="tabular text-primary">đang đọc lại {backfill.progressPercent ?? 0}%</span>
  }
  if (backfill?.status === 'FAILED') {
    return <span className="text-critical">đọc lại lỗi</span>
  }
  return (
    <span className="tabular text-muted-foreground">
      {datastream.oldestReadingAt ? formatDateTime(datastream.oldestReadingAt) : '—'}
    </span>
  )
}

interface Row {
  datastream: Datastream
  telemetry: DatastreamTelemetry | null
}

export function JobDatastreamsTable({
  datastreams,
  telemetry,
  onUnbind,
  onBackfill,
}: {
  datastreams: Datastream[]
  telemetry: DatastreamTelemetry[]
  onUnbind: (datastream: Datastream) => void
  onBackfill: (datastream: Datastream) => void
}) {
  const rows: Row[] = datastreams.map((datastream) => ({
    datastream,
    telemetry: telemetry.find((item) => item.datastreamId === datastream.id) ?? null,
  }))

  const columns: DataTableColumn<Row>[] = [
    {
      key: 'name',
      header: 'Kênh dữ liệu',
      className: 'font-medium',
      cell: (row) => row.datastream.name,
    },
    {
      key: 'sourceField',
      header: 'Cột nguồn',
      className: 'font-mono text-[12.5px] text-muted-foreground',
      cell: (row) => row.datastream.sourceField ?? '—',
    },
    {
      key: 'metric',
      header: 'Metric',
      className: 'text-muted-foreground',
      cell: (row) => row.telemetry?.metricCode ?? row.datastream.metricCode ?? '—',
    },
    {
      key: 'latest',
      header: 'Số đo mới nhất',
      headerClassName: 'text-right',
      className: 'tabular text-right',
      cell: (row) => {
        const value = row.telemetry?.latestValue ?? row.datastream.latestValue
        if (value == null) return <span className="text-muted-foreground">—</span>
        return (
          <span>
            {value.toLocaleString('vi-VN', { maximumFractionDigits: 4 })}
            <span className="ml-1 text-muted-foreground">
              {row.telemetry?.unit ?? row.datastream.metricUnit}
            </span>
          </span>
        )
      },
    },
    {
      key: 'coverage',
      header: 'Có số đo từ',
      headerClassName: 'text-right',
      className: 'text-right text-[12.5px]',
      cell: (row) => <CoverageCell datastream={row.datastream} />,
    },
    {
      key: 'actions',
      header: '',
      headerClassName: 'w-20',
      className: 'text-right',
      cell: (row) => (
        <div className="flex items-center justify-end">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-7 text-muted-foreground hover:text-foreground"
                onClick={() => onBackfill(row.datastream)}
              >
                <History />
                <span className="sr-only">Đọc lại lịch sử cho kênh {row.datastream.name}</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Đọc lại lịch sử</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-7 text-muted-foreground hover:text-destructive"
                onClick={() => onUnbind(row.datastream)}
              >
                <Trash2 />
                <span className="sr-only">Xóa kênh {row.datastream.name}</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Xóa kênh</TooltipContent>
          </Tooltip>
        </div>
      ),
    },
  ]

  return (
    <DataTable
      columns={columns}
      rows={rows}
      getRowId={(row) => row.datastream.id}
      showIndex={false}
      pageSize={0}
    />
  )
}
