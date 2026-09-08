import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { formatDateTime } from '@/lib/datetime'
import { bucketRunsByHour } from '@/lib/jobRuns'
import { cn } from '@/lib/utils'
import type { ExternalSourceJobRun } from '@/types/externalSource'

/**
 * Dải KẾT QUẢ: mỗi vạch là một lượt chạy, cũ bên trái, mới bên phải.
 *
 * Thay cho biểu đồ cột "số dòng đọc về" trước đây. Biểu đồ đó nhồi hai biến vào một ký hiệu:
 * chiều cao là khối lượng, màu là kết quả — mà lượt hỏng luôn đọc về 0 dòng nên chiều cao chỉ
 * lặp lại điều màu đã nói, còn lúc chạy tốt thì mọi cột cao bằng nhau thành một hàng rào phẳng.
 * Ở đây chỉ còn một biến duy nhất, và nó là biến người ta mở tab này để xem.
 */
export function RunStatusStrip({
  runs,
  hours,
  variant = 'compact',
  className,
}: {
  runs: ExternalSourceJobRun[]
  hours: number
  variant?: 'compact' | 'full'
  className?: string
}) {
  const compact = variant === 'compact'
  // API trả mới nhất trước; đọc theo trục thời gian thì phải cũ trước.
  const ordered = [...runs].reverse()
  const failedCount = ordered.filter((run) => run.status === 'FAILED').length
  const summary =
    ordered.length === 0
      ? `Chưa có lượt chạy nào trong ${hours} giờ qua`
      : `${ordered.length} lượt chạy trong ${hours} giờ qua · ${failedCount} thất bại`

  const strip =
    ordered.length === 0 ? (
      <div
        className={cn('rounded-sm bg-border', compact ? 'h-6' : 'h-8', className)}
        role="img"
        aria-label={summary}
      />
    ) : (
      <div
        className={cn('flex items-stretch gap-px', compact ? 'h-6' : 'h-8', className)}
        role="img"
        aria-label={summary}
      >
        {ordered.map((run) => (
          <div
            key={run.id}
            className={cn(
              'min-w-0 flex-1 rounded-[1px]',
              run.status === 'FAILED'
                ? 'bg-critical'
                : run.status === 'RUNNING'
                  ? 'bg-primary/50'
                  : 'bg-ok'
            )}
          />
        ))}
      </div>
    )

  // Bản gọn trên khối truy vấn không có tiêu đề lẫn chú giải màu như bản trong modal, nên nếu
  // không nói thì dải vạch màu này chỉ là một vệt trang trí không ai đoán ra nghĩa.
  if (!compact) return strip

  return (
    <Tooltip>
      <TooltipTrigger asChild>{strip}</TooltipTrigger>
      <TooltipContent>
        {summary}
        <br />
        Mỗi vạch là một lượt — xanh thành công, đỏ thất bại
      </TooltipContent>
    </Tooltip>
  )
}

/**
 * Dải KHỐI LƯỢNG: số dòng đọc về theo từng giờ.
 *
 * Hai bản vẽ giống hệt nhau, chỉ khác chiều cao cho vừa chỗ. Khác biệt duy nhất còn lại là cách
 * chú giải: bản trong modal có tooltip riêng cho từng giờ, bản trên khối gói cả dải vào một
 * tooltip tóm tắt vì ở đó không có chỗ cho người dùng dò từng cột.
 */
export function RunVolumeStrip({
  runs,
  hours,
  variant = 'full',
  className,
}: {
  runs: ExternalSourceJobRun[]
  hours: number
  variant?: 'compact' | 'full'
  className?: string
}) {
  const compact = variant === 'compact'
  const buckets = bucketRunsByHour(runs, hours)
  const maxRows = Math.max(1, ...buckets.map((bucket) => bucket.rows))
  const totalRows = buckets.reduce((total, bucket) => total + bucket.rows, 0)
  const summary = `${totalRows.toLocaleString('vi-VN')} dòng đọc về trong ${hours} giờ qua`

  const bar = (bucket: (typeof buckets)[number]) => (
    <div
      className={cn(
        'w-full rounded-sm transition-[height] duration-[--motion-slow] ease-[--motion-ease]',
        bucket.rows > 0 ? 'bg-primary/70' : 'bg-border'
      )}
      style={{ height: `${Math.max(3, (bucket.rows / maxRows) * 100)}%` }}
    />
  )

  if (compact) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn('flex h-6 items-end gap-1', className)} role="img" aria-label={summary}>
            {buckets.map((bucket) => (
              <div key={bucket.hourStart.toISOString()} className="flex h-full flex-1 items-end">
                {bar(bucket)}
              </div>
            ))}
          </div>
        </TooltipTrigger>
        <TooltipContent>{summary}</TooltipContent>
      </Tooltip>
    )
  }

  return (
    <div className={cn('flex h-12 items-end gap-1', className)}>
      {buckets.map((bucket) => (
        <Tooltip key={bucket.hourStart.toISOString()}>
          <TooltipTrigger asChild>
            <div className="flex h-full flex-1 items-end">{bar(bucket)}</div>
          </TooltipTrigger>
          <TooltipContent>
            {formatDateTime(bucket.hourStart.toISOString())} · {bucket.rows} dòng
          </TooltipContent>
        </Tooltip>
      ))}
    </div>
  )
}
