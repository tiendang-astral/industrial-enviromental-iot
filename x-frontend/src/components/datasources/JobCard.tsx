import { useState } from 'react'
import { toast } from 'sonner'
import { AlertTriangle, Pencil, Plus, Trash2 } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { ConfirmDialog } from '@/components/patterns/ConfirmDialog'
import { StatusBadge } from '@/components/patterns/StatusBadge'
import { DatastreamFormDialog } from '@/components/datasources/DatastreamFormDialog'
import { DatastreamsTable } from '@/components/datasources/DatastreamsTable'
import { JobFormDialog } from '@/components/datasources/JobFormDialog'
import { getApiErrorMessage } from '@/lib/apiError'
import { formatDateTime } from '@/lib/datetime'
import { useDeleteExternalSourceJobMutation } from '@/queries/useDeleteExternalSourceJobMutation'
import type { Datastream } from '@/types/dashboard'
import type { ExternalSourceJob } from '@/types/externalSource'
import type { Metric } from '@/types/metric'

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="truncate text-sm tabular">{value}</p>
    </div>
  )
}

export function JobCard({
  externalSourceId,
  job,
  datastreams,
  metrics,
}: {
  externalSourceId: number
  job: ExternalSourceJob
  datastreams: Datastream[]
  metrics: Metric[]
}) {
  const deleteMutation = useDeleteExternalSourceJobMutation(externalSourceId)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isAddDatastreamOpen, setIsAddDatastreamOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)

  function confirmDelete() {
    deleteMutation.mutate(job.id, {
      onSuccess: () => {
        setIsDeleteOpen(false)
        toast.success('Đã xóa job')
      },
      onError: (error) =>
        toast.error(getApiErrorMessage(error, 'Xóa thất bại — job còn datastream gắn vào')),
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2">
          {job.name}
          <StatusBadge status={job.lastRunStatus ?? 'PENDING'} label={job.lastRunStatus ? undefined : 'Chưa chạy'} />
        </CardTitle>
        <CardDescription className="tabular">
          {job.queryConfig.table} · thời gian theo {job.queryConfig.timestampColumn} ·{' '}
          {job.queryConfig.valueColumns.join(', ')}
        </CardDescription>
        <CardAction className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => setIsAddDatastreamOpen(true)}>
            <Plus data-icon="inline-start" />
            Thêm datastream
          </Button>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="size-8" onClick={() => setIsEditOpen(true)}>
                <Pencil />
                <span className="sr-only">Sửa job {job.name}</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Sửa job</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-8 text-destructive hover:text-destructive"
                onClick={() => setIsDeleteOpen(true)}
              >
                <Trash2 />
                <span className="sr-only">Xóa job {job.name}</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Xóa job</TooltipContent>
          </Tooltip>
        </CardAction>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        <div className="grid gap-3 border-y border-border py-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Lịch chạy" value={job.scheduleCron} />
          <Stat label="Chạy gần nhất" value={formatDateTime(job.lastRunAt)} />
          <Stat label="Lần chạy tiếp theo" value={formatDateTime(job.nextRunAt)} />
          <Stat label="Tổng dòng đã đọc" value={job.totalRowCount.toLocaleString('vi-VN')} />
        </div>

        {job.filterConfig && job.filterConfig.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground">Bộ lọc:</span>
            {job.filterConfig.map((filter) => (
              <Badge key={`${filter.column}${filter.operator}${filter.value}`} variant="outline" className="tabular">
                {filter.column} {filter.operator} {filter.value}
              </Badge>
            ))}
          </div>
        )}

        {job.lastError && (
          <Alert variant="destructive">
            <AlertTriangle />
            <AlertTitle>Lần chạy gần nhất bị lỗi</AlertTitle>
            <AlertDescription>{job.lastError}</AlertDescription>
          </Alert>
        )}

        <DatastreamsTable
          externalSourceId={externalSourceId}
          datastreams={datastreams}
          metrics={metrics}
          onAdd={() => setIsAddDatastreamOpen(true)}
        />
      </CardContent>

      <JobFormDialog
        externalSourceId={externalSourceId}
        job={job}
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
      />

      <DatastreamFormDialog
        externalSourceId={externalSourceId}
        job={job}
        metrics={metrics}
        open={isAddDatastreamOpen}
        onOpenChange={setIsAddDatastreamOpen}
      />

      <ConfirmDialog
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        title="Xóa job này?"
        description={`Job "${job.name}" sẽ ngừng đọc dữ liệu và bị xóa. Thao tác bị chặn nếu job còn datastream gắn vào — xóa hết datastream trước.`}
        confirmLabel="Xóa job"
        destructive
        isPending={deleteMutation.isPending}
        onConfirm={confirmDelete}
      />
    </Card>
  )
}
