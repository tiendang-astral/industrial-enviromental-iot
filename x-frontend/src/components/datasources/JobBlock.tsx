import { ArrowRight, Database, Eye, Link2, MoreHorizontal, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Skeleton } from '@/components/ui/skeleton'
import { StatusBadge } from '@/components/patterns/StatusBadge'
import { AddChannelTile, DatastreamTile } from '@/components/datasources/DatastreamTile'
import { RunVolumeStrip } from '@/components/datasources/RunRhythm'
import { formatCountdown } from '@/lib/datetime'
import { sentenceCase } from '@/lib/text'
import { rowsPerHour, bucketRunsByHour } from '@/lib/jobRuns'
import { CRON_PRESETS } from '@/lib/sqlTemplate'
import type { Datastream } from '@/types/dashboard'
import type { DatastreamTelemetry, ExternalSourceJob, ExternalSourceJobRun } from '@/types/externalSource'

const HOURS = 12

function cronLabel(cron: string) {
  return CRON_PRESETS.find((preset) => preset.value === cron)?.label ?? cron
}

/**
 * Một job và các kênh nó sinh ra, đọc từ trái sang phải như đường đi của dữ liệu.
 *
 * Cố ý KHÔNG vẽ đường nối giữa khối job và các khối kênh: hàng kênh phải xuống dòng khi màn hẹp
 * hoặc job có nhiều kênh, mà đường nối vẽ tuyệt đối thì lệch sau mỗi lần wrap và phải đo lại DOM.
 * Quan hệ ở đây đọc được bằng cách xếp — job neo trái, kênh nằm trong vùng thụt vào bên phải.
 */
export function JobBlock({
  job,
  datastreams,
  telemetryById,
  runs,
  runsLoading,
  onOpenJob,
  onDeleteJob,
  onSelectDatastream,
  onAddChannel,
}: {
  job: ExternalSourceJob
  datastreams: Datastream[]
  telemetryById: Map<number, DatastreamTelemetry>
  runs: ExternalSourceJobRun[]
  runsLoading: boolean
  onOpenJob: () => void
  onDeleteJob: () => void
  onSelectDatastream: (datastream: Datastream) => void
  onAddChannel: () => void
}) {
  const perHour = rowsPerHour(bucketRunsByHour(runs, HOURS))

  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-4">
      <div className="flex w-full shrink-0 flex-col gap-3 rounded-lg border border-l-[3px] border-border border-l-primary bg-card p-4 lg:w-72">
        <div className="flex min-w-0 items-start gap-2.5">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Database className="size-4" />
          </span>
          <button
            type="button"
            onClick={onOpenJob}
            className="min-w-0 flex-1 text-left focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
          >
            <span className="block text-[10px] tracking-wide text-muted-foreground uppercase">
              Truy vấn định kỳ
            </span>
            <span className="block truncate text-[15px] font-semibold hover:underline">{job.name}</span>
          </button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="-mt-1 -mr-1 size-7 shrink-0 text-muted-foreground">
                <MoreHorizontal />
                <span className="sr-only">Tác vụ cho truy vấn {job.name}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={onOpenJob}>
                <Eye />
                Xem chi tiết
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onSelect={onDeleteJob}>
                <Trash2 />
                Xóa truy vấn
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {job.lastRunStatus ? (
            <StatusBadge status={job.lastRunStatus} />
          ) : (
            <StatusBadge status="PENDING" label="Chưa chạy" />
          )}
          <span className="text-[12.5px] text-muted-foreground">
            {sentenceCase(cronLabel(job.scheduleCron))}
          </span>
        </div>

        {runsLoading ? (
          <Skeleton className="h-6 w-full rounded-sm" />
        ) : (
          <RunVolumeStrip runs={runs} hours={HOURS} variant="compact" />
        )}

        <div className="flex flex-col gap-0.5 text-[12.5px] text-muted-foreground">
          <span className="tabular">
            {perHour === null ? 'Chưa đọc dòng nào' : `${perHour.toLocaleString('vi-VN')} dòng/giờ`}
          </span>
          <span className="tabular">
            {job.nextRunAt ? `Chạy tiếp ${formatCountdown(job.nextRunAt)}` : 'Chưa xếp lượt chạy'}
          </span>
        </div>
      </div>

      <div className="hidden shrink-0 flex-col items-center gap-1 self-center lg:flex">
        <span className="tabular text-[10px] tracking-wide text-muted-foreground uppercase">
          {datastreams.length} kênh
        </span>
        <div className="flex items-center">
          <span className="h-px w-4 bg-border" />
          <ArrowRight className="size-4 text-muted-foreground" />
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-wrap gap-3">
        {datastreams.map((datastream) => (
          <DatastreamTile
            key={datastream.id}
            datastream={datastream}
            telemetry={telemetryById.get(datastream.id) ?? null}
            onSelect={() => onSelectDatastream(datastream)}
          />
        ))}

        {datastreams.length === 0 && (
          <div className="flex flex-1 items-center gap-2.5 rounded-lg border border-dashed border-border px-4 py-6 text-[12.5px] text-muted-foreground">
            <Link2 className="size-4 shrink-0" />
            <span>
              {job.lastRunAt
                ? 'Truy vấn đang đọc dữ liệu về nhưng chưa cột nào thành kênh dùng được trên bảng theo dõi.'
                : 'Truy vấn chưa chạy lần nào. Mở chi tiết để xem dữ liệu và tạo kênh từ cột.'}
            </span>
          </div>
        )}

        <AddChannelTile onClick={onAddChannel} />
      </div>
    </div>
  )
}
