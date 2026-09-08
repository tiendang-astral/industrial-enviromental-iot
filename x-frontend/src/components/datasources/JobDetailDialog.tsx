import { useEffect, useState } from 'react'
import { Clock } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { StatusBadge } from '@/components/patterns/StatusBadge'
import { DatastreamFormDialog } from '@/components/datasources/DatastreamFormDialog'
import { JobDataTable } from '@/components/datasources/JobDataTable'
import { JobHealthPanel } from '@/components/datasources/JobHealthPanel'
import { JobQueryForm } from '@/components/datasources/JobQueryForm'
import { getApiErrorMessage } from '@/lib/apiError'
import { CRON_PRESETS } from '@/lib/sqlTemplate'
import { sentenceCase } from '@/lib/text'
import { useJobSampleQuery } from '@/queries/useJobSampleQuery'
import { useMetricsQuery } from '@/queries/useMetricsQuery'
import type { Datastream } from '@/types/dashboard'
import type { ExternalSourceJob, ExternalSourceJobRun, PreviewColumn } from '@/types/externalSource'

const SAMPLE_SIZES = [10, 20, 50]

function cronLabel(cron: string) {
  return CRON_PRESETS.find((preset) => preset.value === cron)?.label ?? cron
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <p className="text-[11px] tracking-wide text-muted-foreground uppercase">{label}</p>
      <div className="flex min-w-0 items-center gap-1.5 text-sm">{children}</div>
    </div>
  )
}

/**
 * Chi tiết một truy vấn định kỳ, mở từ khối trên pipeline. Ba tab tách theo việc người dùng
 * đang làm: xem dữ liệu, sửa câu, xem sức khỏe. Cố ý KHÔNG lặp lại danh sách kênh — khối ngoài
 * kia đã hiện đủ kênh kèm số đo.
 */
export function JobDetailDialog({
  job,
  externalSourceId,
  datastreams,
  allDatastreamNames,
  runs,
  runsLoading,
  isRunPending,
  open,
  onOpenChange,
  onRunNow,
  onSelectDatastream,
}: {
  job: ExternalSourceJob | null
  externalSourceId: number
  /** Kênh của riêng truy vấn này — dùng để đánh dấu cột nào đã gán. */
  datastreams: Datastream[]
  /** Tên kênh toàn nguồn — tên gợi ý phải né uq_datastream_name. */
  allDatastreamNames: string[]
  runs: ExternalSourceJobRun[]
  runsLoading: boolean
  isRunPending: boolean
  open: boolean
  onOpenChange: (open: boolean) => void
  onRunNow: () => void
  onSelectDatastream: (datastream: Datastream) => void
}) {
  const [tab, setTab] = useState('data')
  const [bindColumn, setBindColumn] = useState<PreviewColumn | null>(null)
  const [sampleRows, setSampleRows] = useState(20)

  const sampleQuery = useJobSampleQuery(open ? (job?.id ?? null) : null, sampleRows)
  const { data: metrics } = useMetricsQuery()

  useEffect(() => {
    if (open) setTab('data')
  }, [open, job?.id])

  if (!job) return null

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="flex max-h-[92vh] flex-col gap-4 overflow-hidden sm:max-w-6xl">
          <DialogHeader className="gap-2">
            <DialogTitle className="flex flex-wrap items-center gap-2 pr-6">
              {job.name}
              {job.lastRunStatus ? (
                <StatusBadge status={job.lastRunStatus} />
              ) : (
                <StatusBadge status="PENDING" label="Chưa chạy" />
              )}
            </DialogTitle>
            <DialogDescription>
              Truy vấn định kỳ · chạy {cronLabel(job.scheduleCron)}
            </DialogDescription>
          </DialogHeader>

          <Tabs value={tab} onValueChange={setTab} className="flex min-h-0 flex-1 flex-col gap-4">
            <TabsList>
              <TabsTrigger value="data">Dữ liệu</TabsTrigger>
              <TabsTrigger value="query">Truy vấn</TabsTrigger>
              <TabsTrigger value="health">Sức khỏe</TabsTrigger>
            </TabsList>

            <TabsContent value="data" className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto">
              <div className="grid gap-4 sm:grid-cols-3">
                <Fact label="Lịch chạy">{sentenceCase(cronLabel(job.scheduleCron))}</Fact>
                <Fact label="Cột thời gian">
                  <Badge variant="secondary" className="gap-1 font-mono font-normal">
                    <Clock className="size-3" />
                    {job.queryConfig.timestampColumn}
                  </Badge>
                </Fact>
                <Fact label="Tổng dòng đã đọc">
                  <span className="tabular text-2xl leading-tight font-semibold tracking-tight">
                    {job.totalRowCount.toLocaleString('vi-VN')}
                  </span>
                </Fact>
              </div>

              <div className="flex flex-col gap-2">
                <h3 className="text-sm font-medium">Câu truy vấn</h3>
                <pre className="overflow-x-auto rounded-md border border-border bg-muted/30 p-3 font-mono text-[12px] leading-[1.7]">
                  {job.queryConfig.sql}
                </pre>
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-sm font-medium">Dữ liệu đọc được</h3>
                  <div className="flex items-center gap-2">
                    {sampleQuery.data && (
                      <span className="tabular text-xs text-muted-foreground">
                        {sampleQuery.data.rowCount} dòng mới nhất
                      </span>
                    )}
                    <Select
                      value={String(sampleRows)}
                      onValueChange={(next) => setSampleRows(Number(next))}
                    >
                      <SelectTrigger size="sm" className="h-7 w-28" aria-label="Số dòng lấy về">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SAMPLE_SIZES.map((size) => (
                          <SelectItem key={size} value={String(size)}>
                            {size} dòng
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <JobDataTable
                  result={sampleQuery.data ?? null}
                  isLoading={sampleQuery.isLoading}
                  error={
                    sampleQuery.error
                      ? getApiErrorMessage(sampleQuery.error, 'Không chạy được truy vấn')
                      : null
                  }
                  timestampColumn={job.queryConfig.timestampColumn}
                  datastreams={datastreams}
                  onBind={setBindColumn}
                  onOpenDatastream={onSelectDatastream}
                />
              </div>
            </TabsContent>

            <TabsContent value="query" className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <JobQueryForm
                externalSourceId={externalSourceId}
                job={job}
                submitLabel="Lưu thay đổi"
                onSaved={() => setTab('data')}
              />
            </TabsContent>

            <TabsContent
              value="health"
              className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto"
            >
              <JobHealthPanel
                job={job}
                runs={runs}
                isLoading={runsLoading}
                isRunPending={isRunPending}
                onRunNow={onRunNow}
              />
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      <DatastreamFormDialog
        externalSourceId={externalSourceId}
        job={job}
        column={bindColumn}
        metrics={metrics ?? []}
        existingNames={allDatastreamNames}
        open={!!bindColumn}
        onOpenChange={(next) => !next && setBindColumn(null)}
      />
    </>
  )
}
