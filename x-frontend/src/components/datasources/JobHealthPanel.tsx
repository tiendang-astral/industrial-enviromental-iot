import { useState } from 'react'
import { Info, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { LoadingButton } from '@/components/patterns/LoadingButton'
import { JobRunHistoryDialog } from '@/components/datasources/JobRunHistoryDialog'
import { RunStatusStrip, RunVolumeStrip } from '@/components/datasources/RunRhythm'
import { formatDateTime, formatRelativeTime } from '@/lib/datetime'
import { cn } from '@/lib/utils'
import type { ExternalSourceJob, ExternalSourceJobRun } from '@/types/externalSource'

const HOURS = 12

function Stat({
  label,
  value,
  sub,
  tone,
  action,
}: {
  label: string
  value: string
  sub?: string
  tone?: 'ok' | 'warning' | 'critical'
  action?: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-0.5 rounded-md border border-border bg-muted/30 px-3 py-2.5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11.5px] text-muted-foreground">{label}</p>
        {action}
      </div>
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
      {sub && <p className="tabular truncate text-[11px] text-muted-foreground">{sub}</p>}
    </div>
  )
}

/** Nút chữ i mở hộp chi tiết — chỗ để thứ không nhét vừa một ô chỉ số. */
function InfoButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <Button
      variant="ghost"
      size="icon"
      className="-mr-1 size-6 shrink-0 text-muted-foreground"
      onClick={onClick}
    >
      <Info />
      <span className="sr-only">{label}</span>
    </Button>
  )
}

/**
 * Sức khỏe vận hành của MỘT truy vấn định kỳ.
 *
 * Bỏ chỉ số "độ trễ dữ liệu" cũ: nó trộn hai thứ khác nhau (chu kỳ cron và độ trễ của chính dữ
 * liệu nguồn) nên con số đọc ra không nói được tốt hay xấu. Thay bằng mốc thật của dòng mới nhất
 * đã đọc về, kèm nút kéo ngay một lượt.
 */
export function JobHealthPanel({
  job,
  runs,
  isLoading,
  isRunPending,
  onRunNow,
}: {
  job: ExternalSourceJob
  runs: ExternalSourceJobRun[]
  isLoading: boolean
  isRunPending: boolean
  onRunNow: () => void
}) {
  const [isHistoryOpen, setIsHistoryOpen] = useState(false)
  const [isErrorOpen, setIsErrorOpen] = useState(false)

  const failed = runs.filter((run) => run.status === 'FAILED')
  const lastFailed = failed[0]
  const rowsRead = runs.reduce((total, run) => total + run.rowCount, 0)

  // Trạng thái HIỆN TẠI suy từ lượt gần nhất, không từ số gộp 12 giờ: một sự cố đã tự khỏi
  // không được phép làm cả bảng trông như đang hỏng.
  const lastRun = runs[0]
  const isHealthyNow = !lastRun || lastRun.status !== 'FAILED'

  if (isLoading) return <Skeleton className="h-40 w-full rounded-xl" />

  return (
    <>
      <div className="flex flex-col gap-4 rounded-lg border border-border bg-card p-4">
        <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
          <Stat
            label="Dữ liệu mới nhất"
            value={job.incrementalCursor ? formatRelativeTime(job.incrementalCursor) : 'chưa đọc'}
            sub={
              job.incrementalCursor ? `đọc tới ${formatDateTime(job.incrementalCursor)}` : undefined
            }
            action={
              <Tooltip>
                <TooltipTrigger asChild>
                  <LoadingButton
                    variant="ghost"
                    size="icon"
                    className="-mr-1 size-6 shrink-0 text-muted-foreground"
                    isPending={isRunPending}
                    onClick={onRunNow}
                  >
                    <RefreshCw />
                    <span className="sr-only">Kéo dữ liệu mới nhất về ngay</span>
                  </LoadingButton>
                </TooltipTrigger>
                <TooltipContent>Kéo dữ liệu mới nhất về ngay, không đợi lịch</TooltipContent>
              </Tooltip>
            }
          />

          <Stat
            label={`Lượt chạy · ${HOURS} giờ`}
            value={String(runs.length)}
            sub={failed.length > 0 ? `${failed.length} lượt thất bại` : 'không có lượt nào lỗi'}
            tone={failed.length > 0 ? 'warning' : undefined}
            action={
              runs.length > 0 ? (
                <InfoButton label="Xem lịch sử chạy" onClick={() => setIsHistoryOpen(true)} />
              ) : undefined
            }
          />

          <Stat
            label={`Dòng đọc về · ${HOURS} giờ`}
            value={rowsRead.toLocaleString('vi-VN')}
            sub={`tổng cộng ${job.totalRowCount.toLocaleString('vi-VN')}`}
          />

          <Stat
            label="Lỗi gần nhất"
            value={lastFailed ? formatRelativeTime(lastFailed.startedAt) : 'không có'}
            // Mốc tuyệt đối của lượt pull hỏng: thiếu nó thì một sự cố đã khỏi từ lâu vẫn đọc
            // ra như đang xảy ra.
            sub={
              lastFailed
                ? `lúc ${formatDateTime(lastFailed.startedAt)}${isHealthyNow ? ' · đã phục hồi' : ''}`
                : undefined
            }
            tone={lastFailed ? (isHealthyNow ? 'warning' : 'critical') : 'ok'}
            action={
              lastFailed?.error ? (
                <InfoButton label="Xem nội dung lỗi" onClick={() => setIsErrorOpen(true)} />
              ) : undefined
            }
          />
        </div>

        {/* Hai biến, hai dải, chung một trục thời gian — gộp vào một biểu đồ thì chiều cao
            (khối lượng) át mất màu (kết quả), mà kết quả mới là thứ người ta vào đây để xem. */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-[11px] tracking-wide text-muted-foreground uppercase">
                Kết quả từng lượt · {HOURS} giờ qua
              </p>
              <span className="flex items-center gap-3 text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <span className="size-2 rounded-[1px] bg-ok" />
                  thành công
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="size-2 rounded-[1px] bg-critical" />
                  thất bại
                </span>
              </span>
            </div>
            <RunStatusStrip runs={runs} hours={HOURS} variant="full" />
          </div>

          <div className="flex flex-col gap-1.5">
            <p className="text-[11px] tracking-wide text-muted-foreground uppercase">
              Số dòng đọc về · {HOURS} giờ qua
            </p>
            <RunVolumeStrip runs={runs} hours={HOURS} />
          </div>
        </div>
      </div>

      <JobRunHistoryDialog
        runs={runs}
        hours={HOURS}
        open={isHistoryOpen}
        onOpenChange={setIsHistoryOpen}
      />

      <Dialog open={isErrorOpen} onOpenChange={setIsErrorOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Lỗi lượt chạy lúc {formatDateTime(lastFailed?.startedAt)}</DialogTitle>
            <DialogDescription>
              {isHealthyNow
                ? 'Sự cố này đã qua — các lượt sau đó chạy bình thường.'
                : 'Truy vấn vẫn đang hỏng ở lượt gần nhất.'}
            </DialogDescription>
          </DialogHeader>
          <p className="rounded-md border border-critical/40 bg-critical/10 px-3 py-2.5 font-mono text-[12px] break-words text-muted-foreground">
            {lastFailed?.error}
          </p>
        </DialogContent>
      </Dialog>
    </>
  )
}
