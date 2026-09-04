import { Link } from 'react-router-dom'
import { ChevronRight, Link2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/patterns/EmptyState'
import { StatusBadge } from '@/components/patterns/StatusBadge'
import { DatastreamTileGrid } from '@/components/datasources/DatastreamTileGrid'
import { formatRelativeTime } from '@/lib/datetime'
import type { DatastreamTelemetry, ExternalSourceJob } from '@/types/externalSource'

/**
 * Kênh của một job, kèm trạng thái chính job đó ngay trên tiêu đề nhóm. Thay cho một khối sức
 * khỏe gộp cả nguồn: con số trung bình che mất job đang chết, còn hai dòng trạng thái cụ thể thì
 * chỉ thẳng ra job nào cần vào xem.
 */
export function JobChannelGroup({
  job,
  externalSourceId,
  telemetry,
  isLoading,
  error,
}: {
  job: ExternalSourceJob
  externalSourceId: number
  telemetry: DatastreamTelemetry[]
  isLoading: boolean
  error?: unknown
}) {
  const jobPath = `/data-sources/${externalSourceId}/jobs/${job.id}`

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-border pb-2">
        <div className="flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-1">
          <h3 className="truncate text-sm font-medium">Job {job.name}</h3>
          {job.lastRunStatus ? (
            <StatusBadge status={job.lastRunStatus} />
          ) : (
            <StatusBadge status="PENDING" label="Chưa chạy" />
          )}
          <span className="tabular text-[12.5px] text-muted-foreground">
            {job.lastRunAt ? formatRelativeTime(job.lastRunAt) : 'chưa chạy lần nào'} ·{' '}
            {job.totalRowCount.toLocaleString('vi-VN')} dòng
          </span>
        </div>

        <Button variant="ghost" size="sm" className="text-muted-foreground" asChild>
          <Link to={`${jobPath}/overview`}>
            Xem job
            <ChevronRight data-icon="inline-end" />
          </Link>
        </Button>
      </div>

      <DatastreamTileGrid
        telemetry={telemetry}
        isLoading={isLoading}
        error={error}
        empty={
          <EmptyState
            icon={Link2}
            title="Job này chưa có kênh nào"
            description={
              job.lastRunAt
                ? 'Job đang đọc dữ liệu về nhưng chưa cột nào thành kênh dùng được trên dashboard.'
                : 'Job chưa chạy lần nào — vào Cấu hình để xem dữ liệu và tạo kênh.'
            }
            action={
              <Button variant="outline" asChild>
                <Link to={`${jobPath}/config`}>Tạo kênh từ cột</Link>
              </Button>
            }
          />
        }
      />
    </div>
  )
}
