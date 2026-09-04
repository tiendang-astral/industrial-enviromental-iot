import { useMemo } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { formatDateTime, formatRelativeTime } from '@/lib/datetime'
import { cn } from '@/lib/utils'
import type { ExternalSourceJob, ExternalSourceJobRun } from '@/types/externalSource'

const HOURS = 12

function Stat({
  label,
  value,
  sub,
  tone,
}: {
  label: string
  value: string
  sub?: string
  tone?: 'ok' | 'warning' | 'critical'
}) {
  return (
    <div className="flex flex-col gap-0.5 rounded-md border border-border bg-muted/30 px-3 py-2.5">
      <p className="text-[11.5px] text-muted-foreground">{label}</p>
      <p
        className={cn(
          'tabular text-xl font-semibold tracking-tight',
          tone === 'ok' && 'text-ok',
          tone === 'warning' && 'text-warning',
          tone === 'critical' && 'text-critical'
        )}
      >
        {value}
      </p>
      {sub && <p className="tabular truncate font-mono text-[11px] text-muted-foreground">{sub}</p>}
    </div>
  )
}

/** Khoảng cách từ mốc đọc được tới hiện tại — job báo SUCCESS đều mà cursor đứng yên nghĩa là
 *  nguồn bên kia đã ngừng ghi, thứ mà lastRunStatus không nói ra. */
export function formatLag(cursor: string | null): {
  text: string
  tone: 'ok' | 'warning' | 'critical'
} {
  if (!cursor) return { text: 'chưa đọc', tone: 'warning' }
  const minutes = Math.floor((Date.now() - new Date(cursor).getTime()) / 60_000)
  if (Number.isNaN(minutes)) return { text: 'không rõ', tone: 'warning' }
  if (minutes < 1) return { text: 'vài giây', tone: 'ok' }
  if (minutes < 60) return { text: `${minutes} phút`, tone: minutes <= 15 ? 'ok' : 'warning' }
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return { text: `${hours} giờ`, tone: 'critical' }
  return { text: `${Math.floor(hours / 24)} ngày`, tone: 'critical' }
}

/** Sức khỏe vận hành của MỘT job. Ở cấp nguồn con số gộp che mất job đang chết, nên chỉ số
 *  chi tiết nằm đúng chỗ job của nó. */
export function JobHealthPanel({
  job,
  runs,
  isLoading,
}: {
  job: ExternalSourceJob
  runs: ExternalSourceJobRun[]
  isLoading: boolean
}) {
  const lag = formatLag(job.incrementalCursor)
  const failed = runs.filter((run) => run.status === 'FAILED')
  const rowsRead = runs.reduce((total, run) => total + run.rowCount, 0)

  // Gom số dòng theo từng giờ — backend chỉ trả danh sách lần chạy, không trả sẵn chuỗi thời gian.
  const buckets = useMemo(() => {
    const now = new Date()
    now.setMinutes(0, 0, 0)
    const result = Array.from({ length: HOURS }, (_, index) => ({
      hourStart: new Date(now.getTime() - (HOURS - 1 - index) * 3_600_000),
      rows: 0,
      failed: 0,
    }))
    runs.forEach((run) => {
      const started = new Date(run.startedAt)
      started.setMinutes(0, 0, 0)
      const bucket = result.find((b) => b.hourStart.getTime() === started.getTime())
      if (!bucket) return
      bucket.rows += run.rowCount
      if (run.status === 'FAILED') bucket.failed += 1
    })
    return result
  }, [runs])

  const maxRows = Math.max(1, ...buckets.map((b) => b.rows))

  if (isLoading) return <Skeleton className="h-40 w-full rounded-xl" />

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-border bg-card p-4">
      <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Độ trễ dữ liệu"
          value={lag.text}
          tone={lag.tone}
          sub={job.incrementalCursor ? `đọc tới ${formatDateTime(job.incrementalCursor)}` : undefined}
        />
        <Stat
          label={`Lần chạy · ${HOURS} giờ`}
          value={String(runs.length)}
          sub={`${failed.length} lỗi`}
          tone={failed.length > 0 ? 'warning' : undefined}
        />
        <Stat
          label={`Dòng đọc về · ${HOURS} giờ`}
          value={rowsRead.toLocaleString('vi-VN')}
          sub={`tổng cộng ${job.totalRowCount.toLocaleString('vi-VN')}`}
        />
        <Stat
          label="Lỗi gần nhất"
          value={failed[0] ? formatRelativeTime(failed[0].startedAt) : 'không có'}
          tone={failed[0] ? 'critical' : 'ok'}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <p className="text-[11px] tracking-wide text-muted-foreground uppercase">
          Số dòng đọc về · {HOURS} giờ qua
        </p>
        <div className="flex h-16 items-end gap-1">
          {buckets.map((bucket) => (
            <Tooltip key={bucket.hourStart.toISOString()}>
              <TooltipTrigger asChild>
                <div className="flex h-full flex-1 items-end">
                  <div
                    className={cn(
                      'w-full rounded-sm transition-[height] duration-[--motion-slow] ease-[--motion-ease]',
                      bucket.failed > 0 ? 'bg-critical/60' : 'bg-primary/70'
                    )}
                    style={{ height: `${Math.max(3, (bucket.rows / maxRows) * 100)}%` }}
                  />
                </div>
              </TooltipTrigger>
              <TooltipContent>
                {formatDateTime(bucket.hourStart.toISOString())} · {bucket.rows} dòng
                {bucket.failed > 0 && ` · ${bucket.failed} lỗi`}
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
      </div>

      {failed[0]?.error && (
        <div className="flex items-start gap-2.5 rounded-md border border-critical/40 bg-critical/10 px-3 py-2.5">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-critical" />
          <p className="font-mono text-[11.5px] break-words text-muted-foreground">
            {failed[0].error}
          </p>
        </div>
      )}
    </div>
  )
}
