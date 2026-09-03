import { AlertTriangle, Clock, PlayCircle } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDateTime } from '@/lib/datetime'
import { cn } from '@/lib/utils'
import type { PreviewResult } from '@/types/externalSource'

function renderCell(value: string | number | boolean | null) {
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
}: {
  result: PreviewResult | null
  isPending: boolean
  error: string | null
  timestampColumn: string
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
        <p className="text-sm font-medium">Chưa chạy thử lần nào</p>
        <p className="max-w-[46ch] text-sm text-muted-foreground">
          Bấm “Chạy thử” để xem dữ liệu thật mà job sẽ đọc về. Phải chạy thử thành công mới lưu được job.
        </p>
      </div>
    )
  }

  if (result.rowCount === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-md border border-dashed border-border px-4 py-10 text-center">
        <Clock className="size-5 text-muted-foreground" />
        <p className="text-sm font-medium">Truy vấn chạy được nhưng không có dòng nào</p>
        <p className="max-w-[52ch] text-sm text-muted-foreground">
          Câu lệnh hợp lệ và trả về {result.columns.length} cột. Bảng nguồn có thể chưa có dữ liệu, hoặc điều kiện lọc
          đang loại hết. Job vẫn lưu được và sẽ đọc khi có dòng mới.
        </p>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-md border border-border">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-muted/40 px-3 py-2">
        <p className="text-xs text-muted-foreground">Kết quả chạy thử</p>
        <div className="flex items-center gap-2">
          <Badge variant="ok" className="tabular">
            {result.rowCount} dòng · {result.elapsedMs} ms
          </Badge>
          <Badge variant="outline" className="tabular">
            {result.columns.length} cột
          </Badge>
        </div>
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
                  <span className="ml-2 text-[10.5px] opacity-70">{column.dataType}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {result.rows.slice(0, 10).map((row, rowIndex) => (
              <tr key={rowIndex}>
                {row.map((cell, cellIndex) => (
                  <td
                    key={cellIndex}
                    className="border-b border-border/60 px-3 py-1.5 whitespace-nowrap text-foreground/90"
                  >
                    {renderCell(cell)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {result.rows.length > 10 && (
        <p className="border-t border-border px-3 py-2 text-xs text-muted-foreground">
          Hiện 10 / {result.rowCount} dòng lấy về.
        </p>
      )}
    </div>
  )
}
