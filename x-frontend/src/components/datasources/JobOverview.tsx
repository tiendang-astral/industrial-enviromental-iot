import { Link2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/patterns/EmptyState'
import { DatastreamTileGrid } from '@/components/datasources/DatastreamTileGrid'
import { JobHealthPanel } from '@/components/datasources/JobHealthPanel'
import { useJobRunsQuery } from '@/queries/useJobRunsQuery'
import type { DatastreamTelemetry, ExternalSourceJob } from '@/types/externalSource'

/** Tab Tổng quan của một job: job chạy ra sao, và ra những kênh nào. */
export function JobOverview({
  job,
  telemetry,
  telemetryLoading,
  telemetryError,
  onCreateChannel,
}: {
  job: ExternalSourceJob
  telemetry: DatastreamTelemetry[]
  telemetryLoading: boolean
  telemetryError?: unknown
  /** Đưa người dùng sang tab Cấu hình — chỗ duy nhất tạo được kênh (cần thấy cột dữ liệu thật). */
  onCreateChannel: () => void
}) {
  const { data: runs, isLoading: runsLoading } = useJobRunsQuery(job.id)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h2 className="text-base font-medium">Sức khỏe vận hành</h2>
        <JobHealthPanel job={job} runs={runs ?? []} isLoading={runsLoading} />
      </div>

      <div className="flex flex-col gap-2">
        <h2 className="text-base font-medium">Kênh dữ liệu</h2>
        <DatastreamTileGrid
          telemetry={telemetry}
          isLoading={telemetryLoading}
          error={telemetryError}
          empty={
            <EmptyState
              icon={Link2}
              title="Job này chưa có kênh nào"
              description={
                job.lastRunAt
                  ? 'Job đang đọc dữ liệu về nhưng chưa cột nào thành kênh dùng được trên dashboard.'
                  : 'Job chưa chạy lần nào — sang Cấu hình để xem dữ liệu và tạo kênh.'
              }
              action={
                <Button variant="outline" onClick={onCreateChannel}>
                  Sang tab Cấu hình để tạo kênh
                </Button>
              }
            />
          }
        />
      </div>
    </div>
  )
}
