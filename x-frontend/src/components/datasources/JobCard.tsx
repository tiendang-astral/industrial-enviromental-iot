import { useState } from 'react'
import { toast } from 'sonner'
import { ChevronDown, Code2, Link2, Pencil, Play, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { ConfirmDialog } from '@/components/patterns/ConfirmDialog'
import { StatusBadge } from '@/components/patterns/StatusBadge'
import { JobChannelsPanel } from '@/components/datasources/JobChannelsPanel'
import { JobEditorDialog } from '@/components/datasources/JobEditorDialog'
import { JobHealthPanel } from '@/components/datasources/JobHealthPanel'
import { getApiErrorMessage } from '@/lib/apiError'
import { cn } from '@/lib/utils'
import { useDeleteExternalSourceJobMutation } from '@/queries/useDeleteExternalSourceJobMutation'
import { useJobRunsQuery } from '@/queries/useJobRunsQuery'
import { useRunJobNowMutation } from '@/queries/useRunJobNowMutation'
import type { Datastream } from '@/types/dashboard'
import type { ExternalSourceJob } from '@/types/externalSource'
import type { Metric } from '@/types/metric'

function CollapsedRow({
  icon: Icon,
  label,
  summary,
  actionLabel,
  open,
  onOpenChange,
  children,
}: {
  icon: typeof Code2
  label: string
  summary: string
  actionLabel: string
  open: boolean
  onOpenChange: (open: boolean) => void
  children: React.ReactNode
}) {
  return (
    <Collapsible open={open} onOpenChange={onOpenChange}>
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className={cn(
            'flex w-full items-center gap-3 rounded-md border border-border bg-muted/30 px-3 py-2.5 text-left',
            'transition-colors duration-(--motion-fast) hover:bg-muted/60',
            'focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none'
          )}
        >
          <Icon className="size-4 shrink-0 text-muted-foreground" />
          <span className="shrink-0 text-xs font-medium">{label}</span>
          <span className="min-w-0 flex-1 truncate font-mono text-[11.5px] text-muted-foreground">{summary}</span>
          <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
            {actionLabel}
            <ChevronDown className={cn('size-4 transition-transform duration-(--motion-fast)', open && 'rotate-180')} />
          </span>
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-3">{children}</CollapsibleContent>
    </Collapsible>
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
  const runNowMutation = useRunJobNowMutation(externalSourceId)
  const { data: runs, isLoading: runsLoading } = useJobRunsQuery(job.id)

  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [isSqlOpen, setIsSqlOpen] = useState(false)
  const [isChannelsOpen, setIsChannelsOpen] = useState(false)

  function confirmDelete() {
    deleteMutation.mutate(job.id, {
      onSuccess: () => {
        setIsDeleteOpen(false)
        toast.success('Đã xóa job')
      },
      onError: (error) =>
        toast.error(getApiErrorMessage(error, 'Xóa thất bại — job còn kênh dữ liệu gắn vào')),
    })
  }

  function handleRunNow() {
    runNowMutation.mutate(job.id, {
      onSuccess: () => toast.success('Đã xếp job chạy ngay — kết quả về trong khoảng 15 giây'),
      onError: (error) => toast.error(getApiErrorMessage(error, 'Không xếp được lịch chạy')),
    })
  }

  const channelSummary =
    datastreams.length === 0
      ? 'chưa gán cột nào vào metric'
      : datastreams.map((item) => `${item.sourceField} → ${item.metricCode ?? item.name}`).join(' · ')

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2">
          {job.name}
          <StatusBadge
            status={job.lastRunStatus ?? 'PENDING'}
            label={job.lastRunStatus ? undefined : 'Chưa chạy'}
          />
        </CardTitle>
        <CardAction className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={handleRunNow} disabled={runNowMutation.isPending}>
            <Play data-icon="inline-start" />
            Chạy ngay
          </Button>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="size-8" onClick={() => setIsEditOpen(true)}>
                <Pencil />
                <span className="sr-only">Sửa job {job.name}</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Sửa truy vấn và lịch chạy</TooltipContent>
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
        <JobHealthPanel
          job={job}
          runs={runs ?? []}
          isLoading={runsLoading}
          datastreamCount={datastreams.length}
        />

        <CollapsedRow
          icon={Code2}
          label="Truy vấn"
          summary={job.queryConfig.sql.replace(/\s+/g, ' ').slice(0, 90)}
          actionLabel={isSqlOpen ? 'Thu gọn' : 'Xem'}
          open={isSqlOpen}
          onOpenChange={setIsSqlOpen}
        >
          <pre className="overflow-x-auto rounded-md border border-border bg-muted/30 p-3 font-mono text-[12px] leading-[1.7]">
            {job.queryConfig.sql}
          </pre>
        </CollapsedRow>

        <CollapsedRow
          icon={Link2}
          label={`${datastreams.length} kênh`}
          summary={channelSummary}
          actionLabel={isChannelsOpen ? 'Thu gọn' : 'Quản lý'}
          open={isChannelsOpen}
          onOpenChange={setIsChannelsOpen}
        >
          {isChannelsOpen && (
            <JobChannelsPanel
              externalSourceId={externalSourceId}
              job={job}
              datastreams={datastreams}
              metrics={metrics}
            />
          )}
        </CollapsedRow>
      </CardContent>

      <JobEditorDialog
        externalSourceId={externalSourceId}
        job={job}
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
      />

      <ConfirmDialog
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        title="Xóa job này?"
        question={
          <>
            Bạn có chắc chắn muốn xóa job{' '}
            <span className="font-semibold">&ldquo;{job.name}&rdquo;</span>?
          </>
        }
        description="Cần bỏ gán các kênh dữ liệu của job này trước."
        confirmLabel="Xóa job"
        destructive
        isPending={deleteMutation.isPending}
        onConfirm={confirmDelete}
      />
    </Card>
  )
}
