import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

const COLUMN_WIDTHS = [64, 96, 80, 56, 56, 56, 64, 56]

/**
 * Khung chờ dựng theo đúng hình dạng kết quả sắp hiện (bảng rồi tới các nhóm biểu đồ) chứ không
 * phải một vòng xoay giữa màn hình: báo cáo mất vài giây, thấy trước bố cục thì mắt biết chỗ nào
 * sắp có gì và trang không nhảy khi dữ liệu về.
 */
export function ReportSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <div className="flex h-10 items-center gap-4 border-b border-border bg-muted px-4">
          {COLUMN_WIDTHS.map((w, i) => (
            <Skeleton key={i} className="h-3.5" style={{ width: w }} />
          ))}
        </div>
        {[0, 1, 2, 3, 4].map((row) => (
          <div key={row} className="flex h-12 items-center gap-4 border-b border-border px-4 last:border-b-0">
            {COLUMN_WIDTHS.map((w, i) => (
              <Skeleton key={i} className="h-3.5" style={{ width: w }} />
            ))}
          </div>
        ))}
      </div>

      {[0, 1].map((group) => (
        <div key={group} className="flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-border pb-2">
            <Skeleton className="h-4 w-44" />
            <Skeleton className="h-3.5 w-40" />
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            {[0, 1].map((i) => (
              <Card key={i}>
                <CardHeader className="gap-2">
                  <Skeleton className="h-4 w-52" />
                  <Skeleton className="h-3 w-28" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-44 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
