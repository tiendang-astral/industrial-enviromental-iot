import { useMemo } from 'react'
import { FileBarChart } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DataTable, type DataTableColumn } from '@/components/patterns/DataTable'
import { EmptyState } from '@/components/patterns/EmptyState'
import { StatusBadge } from '@/components/patterns/StatusBadge'
import { TrendChart } from '@/components/patterns/TrendChart'
import { AlertStatusBadge } from '@/components/alerts/AlertStatusBadge'
import { ReportPrintHeader } from '@/components/reports/ReportPrintHeader'
import { formatConditions } from '@/lib/alertConditions'
import { formatDateTime } from '@/lib/datetime'
import { formatBucket, formatIncidentDuration, formatMeasure } from '@/lib/reportRange'
import { cn } from '@/lib/utils'
import type {
  EnvironmentChannel,
  EnvironmentReport,
  Incident,
  IncidentReport,
  ReportGroupBy,
} from '@/types/report'

/**
 * Kênh này lấy số đo từ đâu. Chỉ mỗi cái tên thì không đủ: "abcde" có thể là tên gateway lẫn tên
 * một nguồn database ngoài, mà hai thứ đó khác hẳn bản chất khi đọc báo cáo.
 */
function originLabelOf(channel: EnvironmentChannel): string {
  if (channel.sourceType === 'GATEWAY_PIN') {
    return channel.gatewayName ? `Thiết bị ${channel.gatewayName}` : 'Thiết bị không rõ'
  }
  return channel.externalSourceName ? `Nguồn ${channel.externalSourceName}` : 'Nguồn không rõ'
}

/** Đầu mục nhóm cũng nói rõ loại, vì cùng lý do ở `originLabelOf`. */
function groupLabelOf(channel: EnvironmentChannel, groupBy: ReportGroupBy): string {
  if (groupBy === 'gateway') {
    return channel.gatewayName ? `Thiết bị ${channel.gatewayName}` : 'Không thuộc thiết bị nào'
  }
  if (groupBy === 'source') {
    return channel.externalSourceName ? `Nguồn ${channel.externalSourceName}` : 'Không thuộc nguồn nào'
  }
  if (groupBy === 'metric') {
    const metric = channel.metricName ?? channel.metricCode
    return metric ? `Chỉ số ${metric}` : 'Không rõ chỉ số'
  }
  return channel.tenantNodeName ? `Đơn vị ${channel.tenantNodeName}` : 'Không rõ đơn vị'
}

interface Tally {
  label: string
  /** "Thiết bị abcde" / "Nguồn localhost" — xem `originLabelOf`. */
  origin: string
  total: number
  critical: number
  warning: number
}

/** Sự cố kèm nguồn gốc, tra ngược từ kênh của nó — bản thân `Incident` không mang thông tin này. */
interface IncidentRow extends Incident {
  origin: string
}

interface Group {
  label: string
  channels: EnvironmentChannel[]
  total: number
  critical: number
  warning: number
  /** Phân bố sự cố theo từng kênh trong nhóm — cái người đọc cần là "chỗ nào hay hỏng". */
  byChannel: Tally[]
  /** Từng sự cố một, mới nhất trước. Con số tổng nói có bao nhiêu, bảng này nói chuyện gì đã xảy ra. */
  incidents: IncidentRow[]
}

export function ReportView({
  environment,
  incident,
  groupBy,
}: {
  environment: EnvironmentReport | undefined
  incident: IncidentReport | undefined
  groupBy: ReportGroupBy
}) {
  /**
   * Một lượt gom cho cả biểu đồ lẫn thống kê cảnh báo. Sự cố quy về nhóm qua CHÍNH kênh của nó
   * (`datastreamId` → kênh → nhãn nhóm) chứ không tự suy từ trường của sự cố: có vậy hai phần mới
   * chắc chắn cùng một cách chia, không sinh ra nhóm chỉ có cảnh báo mà không có kênh nào.
   */
  const groups = useMemo<Group[]>(() => {
    const channels = environment?.channels ?? []
    if (channels.length === 0) return []

    const byLabel = new Map<string, Group>()
    const labelOfDatastream = new Map<number, string>()
    const channelById = new Map<number, EnvironmentChannel>()
    for (const channel of channels) {
      const label = groupLabelOf(channel, groupBy)
      labelOfDatastream.set(channel.datastreamId, label)
      channelById.set(channel.datastreamId, channel)
      const group = byLabel.get(label)
      if (group) group.channels.push(channel)
      else byLabel.set(label, { label, channels: [channel], total: 0, critical: 0, warning: 0, byChannel: [], incidents: [] })
    }

    const perChannel = new Map<number, Tally>()
    for (const alert of incident?.incidents ?? []) {
      const label = alert.datastreamId != null ? labelOfDatastream.get(alert.datastreamId) : undefined
      const group = label ? byLabel.get(label) : undefined
      if (!group || alert.datastreamId == null) continue
      const channel = channelById.get(alert.datastreamId)
      const origin = channel ? originLabelOf(channel) : 'Không rõ nguồn'

      group.total += 1
      group.incidents.push({ ...alert, origin })
      if (alert.severity === 'CRITICAL') group.critical += 1
      else group.warning += 1

      const tally = perChannel.get(alert.datastreamId) ?? {
        label: alert.datastreamName ?? 'Kênh đã xoá',
        origin,
        total: 0,
        critical: 0,
        warning: 0,
      }
      tally.total += 1
      if (alert.severity === 'CRITICAL') tally.critical += 1
      else tally.warning += 1
      perChannel.set(alert.datastreamId, tally)
    }
    for (const group of byLabel.values()) {
      group.byChannel = group.channels
        .map((channel) => perChannel.get(channel.datastreamId))
        .filter((tally): tally is Tally => tally !== undefined)
        .sort((a, b) => b.total - a.total)
    }
    return [...byLabel.values()]
  }, [environment, incident, groupBy])

  const columns: DataTableColumn<EnvironmentChannel>[] = [
    { key: 'node', header: 'Đơn vị', cell: (row) => row.tenantNodeName ?? '—' },
    { key: 'origin', header: 'Nguồn', cell: (row) => originLabelOf(row) },
    // Cột "Kênh" in chỉ số chứ không in tên kênh: tên kênh vốn đã lặp lại tên thiết bị/nguồn vừa
    // nằm ở cột bên trái ("abcde - Nhiet do" cạnh "Thiết bị abcde"). Tên đầy đủ vẫn còn ở tiêu đề
    // từng biểu đồ bên dưới.
    {
      key: 'channel',
      header: 'Kênh',
      cell: (row) => <span className="font-medium">{row.metricName ?? row.metricCode ?? '—'}</span>,
    },
    {
      key: 'min',
      header: 'Nhỏ nhất',
      className: 'tabular text-right',
      headerClassName: 'text-right',
      cell: (row) => formatMeasure(row.minValue, row.metricUnit),
    },
    {
      key: 'max',
      header: 'Lớn nhất',
      className: 'tabular text-right',
      headerClassName: 'text-right',
      cell: (row) => formatMeasure(row.maxValue, row.metricUnit),
    },
    {
      key: 'avg',
      header: 'Trung bình',
      className: 'tabular text-right',
      headerClassName: 'text-right',
      cell: (row) => formatMeasure(row.avgValue, row.metricUnit),
    },
    {
      key: 'samples',
      header: 'Số điểm đo',
      className: 'tabular text-right',
      headerClassName: 'text-right',
      cell: (row) => row.sampleCount.toLocaleString('vi-VN'),
    },
    {
      key: 'alerts',
      header: 'Lần cảnh báo',
      className: 'tabular text-right',
      headerClassName: 'text-right',
      cell: (row) => (
        <span className={row.alertCount > 0 ? undefined : 'text-muted-foreground'}>{row.alertCount}</span>
      ),
    },
  ]

  return (
    <div className="flex flex-col gap-6">
      {environment && (
        <ReportPrintHeader
          title="Báo cáo môi trường và sự cố"
          from={environment.from}
          to={environment.to}
          generatedAt={environment.generatedAt}
        />
      )}

      <div className="break-inside-avoid">
        <DataTable
          columns={columns}
          rows={environment?.channels}
          getRowId={(row) => row.datastreamId}
          pageSize={0}
          empty={
            <EmptyState
              icon={FileBarChart}
              title="Không có kênh dữ liệu nào"
              description="Không có kênh nào khớp bộ lọc đã chọn. Nới bộ lọc rồi tạo lại báo cáo."
            />
          }
        />
      </div>

      {environment &&
        groups.map((group) => (
          <section key={group.label} className="flex flex-col gap-4">
            <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 border-b border-border pb-2">
              <h2 className="flex items-baseline gap-2 text-sm font-semibold">
                {group.label}
                <span className="text-xs font-normal text-muted-foreground">
                  {group.channels.length} kênh
                </span>
              </h2>
            </div>

            <IncidentStatsCard group={group} />

            {/* Trên màn hình 2 cột cho đỡ phải cuộn; bản xuất ra ép 1 cột full width
                (index.css § [data-report-charts]) — trên giấy A4 hai biểu đồ cạnh nhau thì mỗi cái
                chỉ còn ~9cm, đọc không ra mốc thời gian. */}
            <div data-report-charts className="grid gap-4 lg:grid-cols-2">
              {group.channels.map((channel) => (
                <Card key={channel.datastreamId} className="break-inside-avoid">
                  <CardHeader>
                    {/* Nguồn gốc đứng trước tên kênh: trong một nhóm gom theo chỉ số, ba biểu đồ
                        đều tên "Nhiệt độ" thì không có gì cho biết cái nào của thiết bị, cái nào
                        của database ngoài. */}
                    <CardTitle className="text-sm font-medium">
                      {originLabelOf(channel)} · {channel.datastreamName}
                    </CardTitle>
                    {/* Số đo đã gộp mẫu — không ghi rõ thì người đọc tưởng đây là từng lần đo. */}
                    <p className="text-xs text-muted-foreground">
                      Mỗi điểm gộp {formatBucket(environment.bucketSeconds)}
                    </p>
                  </CardHeader>
                  <CardContent data-report-chart className="h-56">
                    <TrendChart
                      history={channel.history}
                      variant="axis"
                      unit={channel.metricUnit}
                      className="size-full"
                    />
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        ))}
    </div>
  )
}

/**
 * Thống kê sự cố của một nhóm: ba con số tổng, rồi phân bố theo từng kênh có sự cố. Vạch tỉ lệ so
 * theo kênh nhiều sự cố nhất TRONG nhóm chứ không theo toàn báo cáo — mục đích ở đây là "trong khu
 * này chỗ nào hay hỏng", so với nhóm khác đã có phần tổng ở trên lo.
 */
function IncidentStatsCard({ group }: { group: Group }) {
  const max = Math.max(...group.byChannel.map((row) => row.total), 1)
  return (
    <Card className="break-inside-avoid">
      <CardHeader className="flex flex-wrap items-center justify-between gap-3">
        <CardTitle className="text-sm font-medium">Thống kê sự cố</CardTitle>
        <div className="flex items-center gap-2">
          <StatChip label="Tổng" value={group.total} />
          <StatChip label="Nguy hiểm" value={group.critical} tone="critical" />
          <StatChip label="Cảnh báo" value={group.warning} tone="warning" />
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        {group.byChannel.length === 0 ? (
          <p className="text-sm text-muted-foreground">Không có sự cố nào trong kỳ báo cáo.</p>
        ) : (
          <>
            <div className="flex flex-col gap-3">
              {group.byChannel.map((row) => (
                <div key={row.label} className="flex flex-col gap-1">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="truncate text-sm">
                      {row.origin} · {row.label}
                    </span>
                    <span className="tabular shrink-0 text-sm font-medium">
                      {row.total}
                      <span className="ms-2 text-xs font-normal text-muted-foreground">
                        {row.critical} nguy hiểm · {row.warning} cảnh báo
                      </span>
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className={cn('h-full rounded-full', row.critical > 0 ? 'bg-critical' : 'bg-warning')}
                      style={{ width: `${(row.total / max) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Con số ở trên nói CÓ BAO NHIÊU, bảng này nói CHUYỆN GÌ đã xảy ra — thiếu nó thì
                người đọc báo cáo thấy "4 sự cố" mà không biết vào lúc nào, ngưỡng nào, kéo dài
                bao lâu, và có phục hồi hay không. */}
            <IncidentTable incidents={group.incidents} />
          </>
        )}
      </CardContent>
    </Card>
  )
}

/**
 * Chi tiết từng sự cố trong nhóm. `pageSize={0}` tắt phân trang: đây là báo cáo, và bản PDF chỉ
 * chụp được đúng những gì đang hiện trên màn hình — còn phân trang thì các trang sau biến mất khỏi
 * file mà không ai biết.
 */
function IncidentTable({ incidents }: { incidents: IncidentRow[] }) {
  const columns: DataTableColumn<IncidentRow>[] = [
    { key: 'startedAt', header: 'Bắt đầu', cell: (row) => formatDateTime(row.startedAt) },
    {
      key: 'recoveredAt',
      header: 'Kết thúc',
      cell: (row) =>
        row.recoveredAt ? (
          formatDateTime(row.recoveredAt)
        ) : (
          <span className="text-muted-foreground">Chưa kết thúc</span>
        ),
    },
    {
      key: 'duration',
      header: 'Kéo dài',
      className: 'tabular',
      cell: (row) => formatIncidentDuration(row.durationSeconds) ?? '—',
    },
    { key: 'origin', header: 'Nguồn', cell: (row) => row.origin },
    // Cùng quy ước với bảng tổng quan: cột "Kênh" in chỉ số, nguồn gốc tách sang cột riêng.
    { key: 'channel', header: 'Kênh', cell: (row) => row.metricName ?? row.metricCode ?? '—' },
    { key: 'rule', header: 'Quy tắc', cell: (row) => row.ruleName ?? 'Quy tắc đã xóa' },
    {
      key: 'threshold',
      header: 'Ngưỡng',
      className: 'tabular',
      cell: (row) => formatConditions(row.thresholdSnapshot, row.metricUnit),
    },
    {
      key: 'observed',
      header: 'Giá trị đo',
      className: 'tabular text-right',
      headerClassName: 'text-right',
      cell: (row) => formatMeasure(row.lastObservedValue, row.metricUnit),
    },
    { key: 'severity', header: 'Mức độ', cell: (row) => <StatusBadge status={row.severity} /> },
    { key: 'status', header: 'Trạng thái', cell: (row) => <AlertStatusBadge status={row.status} /> },
  ]

  return (
    <DataTable columns={columns} rows={incidents} getRowId={(row) => row.id} pageSize={0} showIndex />
  )
}

/** Con số 0 để màu mờ: nhóm không có sự cố nguy hiểm nào thì đó là tin tốt, không cần nhấn đỏ. */
function StatChip({ label, value, tone }: { label: string; value: number; tone?: 'critical' | 'warning' }) {
  return (
    <span
      className={cn(
        'rounded-md border border-border px-2 py-0.5 text-xs',
        value === 0 || !tone
          ? 'text-muted-foreground'
          : tone === 'critical'
            ? 'border-critical/40 text-critical'
            : 'border-warning/40 text-warning'
      )}
    >
      <strong className="tabular font-semibold">{value}</strong> {label.toLowerCase()}
    </span>
  )
}
