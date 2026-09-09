import { formatDateTime } from '@/lib/datetime'

/**
 * Chỉ hiện trong bản xuất ra (file PDF hoặc lệnh in). Bản PDF rời khỏi màn hình và được gửi đi nơi
 * khác, nên nó phải tự nói được nó là báo cáo gì, của khoảng nào, kết xuất lúc nào — trên màn hình
 * các thông tin đó đã nằm ở PageHeader và thanh lọc.
 *
 * Ẩn/hiện bằng `data-report-header` + CSS chứ không bằng `print:block`: nút "Tải PDF" chụp DOM theo
 * SCREEN media nên biến thể `print:` không kích hoạt, và khối này từng bị rơi khỏi file PDF.
 */
export function ReportPrintHeader({
  title,
  from,
  to,
  generatedAt,
  organization,
}: {
  title: string
  from: string
  to: string
  generatedAt: string
  organization?: string | null
}) {
  return (
    <div data-report-header className="hidden">
      <h1 className="text-lg font-semibold">{title}</h1>
      <p className="text-sm text-muted-foreground">
        Kỳ báo cáo: {formatDateTime(from)} - {formatDateTime(to)}
      </p>
      {organization && <p className="text-sm text-muted-foreground">Đơn vị: {organization}</p>}
      <p className="text-sm text-muted-foreground">Kết xuất lúc: {formatDateTime(generatedAt)}</p>
    </div>
  )
}
