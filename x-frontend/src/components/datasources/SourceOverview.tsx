import { DatabaseZap } from 'lucide-react'
import { EmptyState } from '@/components/patterns/EmptyState'
import { JobChannelGroup } from '@/components/datasources/JobChannelGroup'
import { useDatastreamsByExternalSourceQuery } from '@/queries/useDatastreamsByExternalSourceQuery'
import { useSourceTelemetryQuery } from '@/queries/useSourceTelemetryQuery'
import type { ExternalSource, ExternalSourceJob } from '@/types/externalSource'

/**
 * Tổng quan một nguồn, tổ chức theo JOB chứ không theo nguồn: job mới là thứ người dùng tạo, sửa
 * và đi vào xem. Trước đây trang này gộp mọi kênh vào một lưới phẳng nên nhìn xong vẫn phải sang
 * tab Cấu hình mới biết kênh nào thuộc job nào.
 */
export function SourceOverview({
  source,
  jobs,
  isLoading,
}: {
  source: ExternalSource
  jobs: ExternalSourceJob[]
  isLoading: boolean
}) {
  const {
    data: telemetry,
    isLoading: telemetryLoading,
    error: telemetryError,
  } = useSourceTelemetryQuery(source.id)
  // Telemetry không mang jobId; ánh xạ kênh → job lấy từ Postgres (datastream.source_id).
  const { data: datastreams } = useDatastreamsByExternalSourceQuery(source.id)

  const jobIdByDatastream = new Map(datastreams?.map((item) => [item.id, item.sourceId]))

  if (!isLoading && jobs.length === 0) {
    return (
      <EmptyState
        icon={DatabaseZap}
        title="Chưa có job nào"
        description="Job là một câu truy vấn chạy theo lịch. Thêm job ở tab Cấu hình để bắt đầu đọc dữ liệu về."
      />
    )
  }

  return (
    <div className="flex flex-col gap-8">
      {jobs.map((job) => (
        <JobChannelGroup
          key={job.id}
          job={job}
          externalSourceId={source.id}
          telemetry={(telemetry ?? []).filter(
            (item) => jobIdByDatastream.get(item.datastreamId) === job.id
          )}
          isLoading={telemetryLoading}
          error={telemetryError}
        />
      ))}
    </div>
  )
}
