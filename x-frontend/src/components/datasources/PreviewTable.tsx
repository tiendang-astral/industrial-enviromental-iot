import { AlertTriangle, Clock, PlayCircle } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDateTime } from '@/lib/datetime'
import { cn } from '@/lib/utils'
import type { PreviewResult } from '@/types/externalSource'

/** Dùng chung với bảng dữ liệu ở trang chi tiết job. */
export function renderPreviewCell(value: string | number | boolean | null) {
  if (value === null || value === undefined) return <span className="text-muted-foreground">NULL</span>
  if (typeof value === 'boolean') return value ? 'true' : 'false'
  if (typeof value === 'number') return value.toLocaleString('vi-VN', { maximumFractionDigits: 4 })
  // Instant từ backend về dạng ISO — hiện theo giờ địa phương cho dễ đối chiếu.
  if (/^\d{4}-\d{2}-\d{2}T/.test(value)) return formatDateTime(value)
  return value
}

export function PreviewTable({
  result,
  isPending,
  error,
  timestampColumn,
  headerAction,
  className,
}: {
  result: PreviewResult | null
  isPending: boolean
  error: string | null
  timestampColumn: string
  /** Đặt ở thanh tiêu đề bảng — chỗ duy nhất luôn nhìn thấy dù bảng dài bao nhiêu. */
  headerAction?: React.ReactNode
  className?: string
}) {
  if (isPending) {
    return (
      <div className="flex flex-col gap-2 rounded-md border border-border p-3">
        <Skeleton className="h-5 w-40" />
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-7 w-full" />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle />
        <AlertTitle>Truy vấn không chạy được</AlertTitle>
        <AlertDescription className="font-mono text-xs whitespace-pre-wrap">{error}</AlertDescription>
      </Alert>
    )
  }

  if (!result) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-md border border-dashed border-border px-4 py-10 text-center">
        <PlayCircle className="size-5 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Chưa chạy thử lần nào</p>
      </div>
    )
  }

  if (result.rowCount === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-md border border-dashed border-border px-4 py-10 text-center">
        <Clock className="size-5 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          Không có dòng nào · {result.columns.length} cột
        </p>
      </div>
    )
  }

  return (
    <div className={cn('flex flex-col overflow-hidden rounded-md border border-border', className)}>
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b border-border bg-muted/40 px-3 py-2">
        <p className="tabular text-xs text-muted-foreground">
          Kết quả · {result.rowCount} dòng · {result.columns.length} cột · {result.elapsedMs} ms
        </p>
        {headerAction}
      </div>

      <div className="overflow-x-auto">
        <table className="tabular w-full border-collapse font-mono text-xs">
          <thead>
            <tr>
              {result.columns.map((column) => (
                <th
                  key={column.name}
                  className={cn(
                    'border-b border-border px-3 py-2 text-left font-medium whitespace-nowrap text-muted-foreground',
                    column.name.toLowerCase() === timestampColumn.toLowerCase() && 'text-primary'
                  )}
                >
                  {column.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {result.rows.slice(0, 5).map((row, rowIndex) => (
              <tr key={rowIndex}>
                {row.map((cell, cellIndex) => (
                  <td
                    key={cellIndex}
                    className="border-b border-border/60 px-3 py-1.5 whitespace-nowrap text-foreground/90"
                  >
                    {renderPreviewCell(cell)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {result.rows.length > 5 && (
        <p className="border-t border-border px-3 py-2 text-xs text-muted-foreground">
          Hiện 5 / {result.rowCount} dòng lấy về.
        </p>
      )}
    </div>
  )
}
