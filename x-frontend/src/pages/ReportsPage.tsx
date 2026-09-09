import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/patterns/PageHeader'
import { ReportFilterBar } from '@/components/reports/ReportFilterBar'
import { ReportPlaceholder } from '@/components/reports/ReportPlaceholder'
import { ReportSkeleton } from '@/components/reports/ReportSkeleton'
import { ReportView } from '@/components/reports/ReportView'
import { useEnvironmentReportQuery } from '@/queries/useEnvironmentReportQuery'
import { useIncidentReportQuery } from '@/queries/useIncidentReportQuery'
import { useAllGatewaysQuery } from '@/queries/useGatewaysQuery'
import { useExternalSourcesQuery } from '@/queries/useExternalSourcesQuery'
import { useMetricsQuery } from '@/queries/useMetricsQuery'
import { useTenantNodesQuery } from '@/queries/useTenantNodesQuery'
import { getApiErrorMessage } from '@/lib/apiError'
import { exportReportPdf } from '@/lib/reportPdf'
import type { ReportFilter } from '@/types/report'

export default function ReportsPage() {
  const [filter, setFilter] = useState<ReportFilter | null>(null)
  const [isExporting, setIsExporting] = useState(false)
  const reportRef = useRef<HTMLDivElement>(null)

  const { data: nodes } = useTenantNodesQuery()
  const { data: metrics } = useMetricsQuery()
  const { data: gateways } = useAllGatewaysQuery()
  const { data: sources } = useExternalSourcesQuery()

  // Hai truy vấn song song trên CÙNG một bộ lọc rồi ghép ở FE: số đo và sự cố nằm ở hai kho khác
  // nhau (InfluxDB / Postgres) nên gộp thành một endpoint cũng vẫn là hai lượt đọc.
  const environment = useEnvironmentReportQuery(filter)
  const incident = useIncidentReportQuery(filter)

  const isFetching = environment.isFetching || incident.isFetching
  const error = environment.error ?? incident.error
  const hasResult = environment.data !== undefined && incident.data !== undefined

  /** Tải thẳng file PDF về máy (không mở hộp thoại in) — xem `lib/reportPdf.ts`. */
  async function downloadPdf() {
    if (!reportRef.current) return
    setIsExporting(true)
    try {
      await exportReportPdf(reportRef.current, `bao-cao-${new Date().toISOString().slice(0, 10)}`)
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Xuất PDF thất bại'))
    } finally {
      setIsExporting(false)
    }
  }

  return (
    // `min-h-full` + `flex-1` ở khối trống: trang chưa có báo cáo vẫn cao bằng vùng nội dung.
    <div className="flex min-h-full flex-col gap-6">
      <PageHeader
        title="Báo cáo"
        description="Tổng hợp số đo môi trường và sự cố theo đơn vị, xem trực tiếp rồi tải về PDF."
        className="print:hidden"
      />

      <ReportFilterBar
        nodes={nodes ?? []}
        metrics={metrics ?? []}
        gateways={gateways ?? []}
        sources={sources ?? []}
        isLoading={isFetching}
        isExporting={isExporting}
        canDownload={hasResult && !isFetching}
        onSubmit={setFilter}
        onDownload={downloadPdf}
      />

      {error && (
        <p className="text-sm text-destructive print:hidden">
          {getApiErrorMessage(error, 'Tạo báo cáo thất bại')}
        </p>
      )}

      {!filter ? (
        <ReportPlaceholder />
      ) : isFetching ? (
        <ReportSkeleton />
      ) : (
        // ref bọc đúng phần nội dung báo cáo — vùng chụp của bản PDF không gồm thanh lọc.
        <div ref={reportRef}>
          <ReportView
            environment={environment.data}
            incident={incident.data}
            // Chưa chọn chiều lọc thì gom theo đơn vị — kênh nào cũng có đơn vị, còn gateway/nguồn
            // /chỉ số thì tuỳ kênh.
            groupBy={filter.scope ?? 'node'}
          />
        </div>
      )}
    </div>
  )
}
