import { useMemo } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { formatDateTime, formatRelativeTime } from '@/lib/datetime'
import { cn } from '@/lib/utils'
import type { ExternalSourceJob, ExternalSourceJobRun } from '@/types/externalSource'

const HOURS = 12

function Stat({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: 'ok' | 'warning' | 'critical' }) {
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
      {sub && <p className="tabular font-mono text-[11px] text-muted-foreground">{sub}</p>}
    </div>
  )
}

/** Khoảng cách từ mốc đọc được tới hiện tại — job báo SUCCESS đều mà cursor đứng yên là dấu hiệu
 *  nguồn bên kia đã ngừng ghi, thứ mà lastRunStatus không nói ra. */
function formatLag(cursor: string | null): { text: string; tone: 'ok' | 'warning' | 'critical' } {
  if (!cursor) return { text: 'chưa đọc', tone: 'warning' }
  const lagMs = Date.now() - new Date(cursor).getTime()
  if (Number.isNaN(lagMs)) return { text: 'không rõ', tone: 'warning' }

  const minutes = Math.floor(lagMs / 60_000)
  if (minutes < 1) return { text: `${Math.max(0, Math.floor(lagMs / 1000))} giây`, tone: 'ok' }
  if (minutes < 60) return { text: `${minutes} phút`, tone: minutes <= 15 ? 'ok' : 'warning' }
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return { text: `${hours} giờ`, tone: 'critical' }
  return { text: `${Math.floor(hours / 24)} ngày`, tone: 'critical' }
}

export function JobHealthPanel({
  job,
  runs,
  isLoading,
  datastreamCount,
}: {
  job: ExternalSourceJob
  runs: ExternalSourceJobRun[]
  isLoading: boolean
  datastreamCount: number
}) {
  const lag = formatLag(job.incrementalCursor)
  const failed = runs.filter((run) => run.status === 'FAILED')
  const lastFailure = failed[0] ?? null

  const rowsToday = useMemo(() => {
    const startOfDay = new Date()
    startOfDay.setHours(0, 0, 0, 0)
    return runs
      .filter((run) => new Date(run.startedAt) >= startOfDay)
      .reduce((total, run) => total + run.rowCount, 0)
  }, [runs])

  // Gom số dòng theo từng giờ trong HOURS giờ gần nhất — backend chỉ trả danh sách lần chạy.
  const buckets = useMemo(() => {
    const now = new Date()
    now.setMinutes(0, 0, 0)
    const result = Array.from({ length: HOURS }, (_, index) => {
      const hourStart = new Date(now.getTime() - (HOURS - 1 - index) * 3_600_000)
      return { hourStart, rows: 0 }
    })
    runs.forEach((run) => {
      const started = new Date(run.startedAt)
      started.setMinutes(0, 0, 0)
      const bucket = result.find((item) => item.hourStart.getTime() === started.getTime())
      if (bucket) bucket.rows += run.rowCount
    })
    return result
  }, [runs])

  const maxRows = Math.max(...buckets.map((bucket) => bucket.rows), 1)
  const averageRows = Math.round(buckets.reduce((total, bucket) => total + bucket.rows, 0) / HOURS)

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-[76px] w-full rounded-md" />
          ))}
        </div>
        <Skeleton className="h-32 w-full rounded-md" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Độ trễ dữ liệu"
          value={lag.text}
          tone={lag.tone}
          sub={job.incrementalCursor ? `mốc ${formatDateTime(job.incrementalCursor)}` : undefined}
        />
        <Stat
          label="Dòng hôm nay"
          value={rowsToday.toLocaleString('vi-VN')}
          sub={`tổng cộng ${job.totalRowCount.toLocaleString('vi-VN')}`}
        />
        <Stat
          label="Lần chạy tới"
          value={job.nextRunAt ? formatRelativeTime(job.nextRunAt) : 'chưa lên lịch'}
          sub={job.nextRunAt ? formatDateTime(job.nextRunAt) : undefined}
        />
        <Stat label="Kênh dữ liệu" value={String(datastreamCount)} sub={job.scheduleCron} />
      </div>

      <div className="flex flex-col gap-3 rounded-md border border-border p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-[11.5px] tracking-wide text-muted-foreground uppercase">
            {runs.length} lần chạy trong {HOURS} giờ qua
          </p>
          {failed.length > 0 ? (
            <Badge variant="warning">{failed.length} lần lỗi</Badge>
          ) : (
            runs.length > 0 && <Badge variant="ok">không có lỗi</Badge>
          )}
        </div>

        {runs.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Chưa có lần chạy nào trong {HOURS} giờ qua. Bấm “Chạy ngay” nếu không muốn đợi tới lượt theo lịch.
          </p>
        ) : (
          <div className="flex flex-wrap items-end gap-[3px]">
            {[...runs].reverse().map((run) => (
              <Tooltip key={run.id}>
                <TooltipTrigger asChild>
                  <span
                    className={cn(
                      'h-6 w-2.5 rounded-[3px]',
                      run.status === 'SUCCESS' && 'bg-ok/60',
                      run.status === 'FAILED' && 'bg-critical/70',
                      run.status === 'RUNNING' && 'bg-warning/70'
                    )}
                  />
                </TooltipTrigger>
                <TooltipContent>
                  {formatDateTime(run.startedAt)} · {run.rowCount} dòng
                  {run.error ? ` · ${run.error}` : ''}
                </TooltipContent>
              </Tooltip>
            ))}
          </div>
        )}

        {lastFailure?.error && (
          <Alert variant="destructive">
            <AlertTriangle />
            <AlertTitle>Lần lỗi gần nhất lúc {formatDateTime(lastFailure.startedAt)}</AlertTitle>
            <AlertDescription className="font-mono text-xs">{lastFailure.error}</AlertDescription>
          </Alert>
        )}
      </div>

      {runs.length > 0 && (
        <div className="flex flex-col gap-3 rounded-md border border-border p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-[11.5px] tracking-wide text-muted-foreground uppercase">
              Số dòng đọc về · {HOURS} giờ qua
            </p>
            <span className="tabular text-xs text-muted-foreground">
              trung bình {averageRows.toLocaleString('vi-VN')}/giờ
            </span>
          </div>
          <div className="flex h-20 items-end gap-1">
            {buckets.map((bucket, index) => (
              <Tooltip key={bucket.hourStart.toISOString()}>
                <TooltipTrigger asChild>
                  <span
                    className={cn(
                      'min-w-1.5 flex-1 rounded-t-[3px]',
                      index === buckets.length - 1 ? 'bg-primary' : 'bg-primary/40'
                    )}
                    style={{ height: `${Math.max(4, (bucket.rows / maxRows) * 100)}%` }}
                  />
                </TooltipTrigger>
                <TooltipContent>
                  {bucket.hourStart.getHours().toString().padStart(2, '0')}:00 · {bucket.rows} dòng
                </TooltipContent>
              </Tooltip>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
