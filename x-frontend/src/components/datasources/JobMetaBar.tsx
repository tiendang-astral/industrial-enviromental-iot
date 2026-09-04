import { AlertTriangle, Pencil, Play, Trash2 } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/patterns/StatusBadge'
import { formatDateTime, formatRelativeTime } from '@/lib/datetime'
import { CRON_PRESETS } from '@/lib/sqlTemplate'
import type { ExternalSourceJob } from '@/types/externalSource'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5 lg:px-4 lg:first:pl-0">
      <p className="text-[11px] tracking-wide text-muted-foreground uppercase">{label}</p>
      <div className="flex min-w-0 items-center gap-1.5 text-sm">{children}</div>
    </div>
  )
}

function cronLabel(cron: string) {
  return CRON_PRESETS.find((preset) => preset.value === cron)?.label ?? cron
}

/**
 * Hai câu hỏi người trực ca hỏi khi mở một job: nó chạy lần cuối bao giờ, và tới giờ đọc được
 * bao nhiêu. Cùng dải mảnh như SourceMetaBar chứ không phải lưới card — chỗ màn hình đầu để
 * dành cho câu truy vấn và dữ liệu, thứ họ vào đây để xem.
 */
export function JobMetaBar({
  job,
  onRunNow,
  onEdit,
  onDelete,
  isRunPending,
}: {
  job: ExternalSourceJob
  onRunNow: () => void
  onEdit: () => void
  onDelete: () => void
  isRunPending: boolean
}) {
  return (
    <div className="flex flex-col gap-3 border-b border-border pb-4">
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
        <div className="flex flex-wrap gap-x-0 gap-y-3 lg:divide-x lg:divide-border">
          <Field label="Lần đọc cuối">
            {job.lastRunStatus ? (
              <StatusBadge status={job.lastRunStatus} />
            ) : (
              <StatusBadge status="PENDING" label="Chưa chạy" />
            )}
            {job.lastRunAt && (
              <span className="tabular whitespace-nowrap text-muted-foreground">
                {formatRelativeTime(job.lastRunAt)} · {formatDateTime(job.lastRunAt)}
              </span>
            )}
          </Field>

          <Field label="Đã đọc">
            <span className="tabular font-medium">{job.totalRowCount.toLocaleString('vi-VN')}</span>
            <span className="text-muted-foreground">dòng</span>
          </Field>

          <Field label="Lịch chạy">
            <span className="whitespace-nowrap">{cronLabel(job.scheduleCron)}</span>
            {job.nextRunAt && (
              <span className="tabular whitespace-nowrap text-muted-foreground">
                · kế tiếp {formatDateTime(job.nextRunAt)}
              </span>
            )}
          </Field>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Button variant="outline" onClick={onRunNow} disabled={isRunPending}>
            <Play data-icon="inline-start" />
            Chạy ngay
          </Button>
          <Button variant="outline" onClick={onEdit}>
            <Pencil data-icon="inline-start" />
            Sửa job
          </Button>
          <Button
            variant="outline"
            className="text-destructive hover:text-destructive"
            onClick={onDelete}
          >
            <Trash2 data-icon="inline-start" />
            Xóa job
          </Button>
        </div>
      </div>

      {job.lastError && (
        <Alert variant="destructive">
          <AlertTriangle />
          <AlertTitle>Lỗi ở lần đọc gần nhất</AlertTitle>
          <AlertDescription className="font-mono text-xs break-words">{job.lastError}</AlertDescription>
        </Alert>
      )}
    </div>
  )
}
