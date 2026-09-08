import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Check, History, Pencil, Trash2, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { ConfirmDialog } from '@/components/patterns/ConfirmDialog'
import { TrendChart } from '@/components/patterns/TrendChart'
import { BackfillDialog } from '@/components/datasources/BackfillDialog'
import { getApiErrorMessage } from '@/lib/apiError'
import { formatDateTime, formatRelativeTime } from '@/lib/datetime'
import { cn } from '@/lib/utils'
import { useBackfillQuery } from '@/queries/useBackfillQuery'
import { useDeleteDatastreamMutation } from '@/queries/useDeleteDatastreamMutation'
import { useRenameDatastreamMutation } from '@/queries/useRenameDatastreamMutation'
import type { Datastream } from '@/types/dashboard'
import type { DatastreamTelemetry, ExternalSourceJob } from '@/types/externalSource'

const RANGE_MINUTES = 720

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <p className="text-[11px] tracking-wide text-muted-foreground uppercase">{label}</p>
      <div className="flex min-w-0 items-center gap-1.5 text-sm">{children}</div>
    </div>
  )
}

/** Tên kênh sửa tại chỗ: đổi tên là việc một-ô, mở thêm một dialog nữa chỉ để gõ một dòng là thừa. */
function NameEditor({
  datastream,
  externalSourceId,
}: {
  datastream: Datastream
  externalSourceId: number
}) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(datastream.name)
  const renameMutation = useRenameDatastreamMutation(externalSourceId)

  useEffect(() => {
    setName(datastream.name)
    setEditing(false)
  }, [datastream.id, datastream.name])

  function save() {
    const trimmed = name.trim()
    if (!trimmed || trimmed === datastream.name) {
      setEditing(false)
      setName(datastream.name)
      return
    }
    renameMutation.mutate(
      { id: datastream.id, name: trimmed },
      {
        onSuccess: () => {
          setEditing(false)
          toast.success('Đã đổi tên kênh')
        },
        onError: (error) => toast.error(getApiErrorMessage(error, 'Đổi tên thất bại')),
      }
    )
  }

  if (!editing) {
    return (
      <span className="flex min-w-0 items-center gap-1.5">
        <span className="truncate">{datastream.name}</span>
        <Button
          variant="ghost"
          size="icon"
          className="size-7 shrink-0 text-muted-foreground"
          onClick={() => setEditing(true)}
        >
          <Pencil />
          <span className="sr-only">Đổi tên kênh</span>
        </Button>
      </span>
    )
  }

  return (
    <span className="flex min-w-0 flex-1 items-center gap-1.5">
      <Input
        value={name}
        onChange={(event) => setName(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') save()
          if (event.key === 'Escape') {
            setEditing(false)
            setName(datastream.name)
          }
        }}
        className="h-8 max-w-72 text-base"
        aria-label="Tên kênh"
        autoFocus
      />
      <Button
        variant="ghost"
        size="icon"
        className="size-7 shrink-0"
        disabled={renameMutation.isPending}
        onClick={save}
      >
        <Check />
        <span className="sr-only">Lưu tên</span>
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="size-7 shrink-0 text-muted-foreground"
        onClick={() => {
          setEditing(false)
          setName(datastream.name)
        }}
      >
        <X />
        <span className="sr-only">Hủy đổi tên</span>
      </Button>
    </span>
  )
}

/**
 * Chi tiết một kênh dữ liệu, mở từ khối kênh trên pipeline. Gộp mọi thứ trước đây nằm rải ở
 * bảng kênh của trang job: số đo, dải dữ liệu đã có, tiến độ vá, đổi tên và xoá.
 */
export function DatastreamDetailDialog({
  datastream,
  job,
  telemetry,
  externalSourceId,
  open,
  onOpenChange,
}: {
  datastream: Datastream | null
  job: ExternalSourceJob | null
  telemetry: DatastreamTelemetry | null
  externalSourceId: number
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [isBackfillOpen, setIsBackfillOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const { data: backfill } = useBackfillQuery(datastream?.id ?? null)
  const deleteMutation = useDeleteDatastreamMutation(externalSourceId)

  if (!datastream) return null

  const running = backfill?.status === 'PENDING' || backfill?.status === 'RUNNING'
  const oldest = telemetry?.oldestReadingAt ?? datastream.oldestReadingAt ?? null

  function confirmDelete() {
    if (!datastream) return
    deleteMutation.mutate(datastream.id, {
      onSuccess: () => {
        setIsDeleteOpen(false)
        onOpenChange(false)
        toast.success('Đã xóa kênh dữ liệu')
      },
      onError: (error) => {
        setIsDeleteOpen(false)
        toast.error(getApiErrorMessage(error, 'Xóa kênh thất bại'))
      },
    })
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="flex max-h-[88vh] flex-col gap-5 overflow-y-auto sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle asChild>
              <div className="flex min-w-0 items-center gap-2 pr-6">
                <NameEditor datastream={datastream} externalSourceId={externalSourceId} />
              </div>
            </DialogTitle>
            <DialogDescription>
              {job ? <>Thuộc truy vấn định kỳ {job.name}</> : 'Kênh dữ liệu'}
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-baseline gap-2">
            <span className="tabular text-4xl font-semibold tracking-tight">
              {telemetry?.latestValue ?? '—'}
            </span>
            {datastream.metricUnit && (
              <span className="text-base text-muted-foreground">{datastream.metricUnit}</span>
            )}
            <span className="ml-auto text-[12.5px] text-muted-foreground">
              {telemetry?.latestMeasuredAt
                ? `cập nhật ${formatRelativeTime(telemetry.latestMeasuredAt)}`
                : 'chưa có số đo nào'}
            </span>
          </div>

          <div className="flex h-72 rounded-lg border border-border bg-card p-3">
            <TrendChart
              history={telemetry?.history ?? []}
              variant="axis"
              unit={datastream.metricUnit}
              rangeMinutes={RANGE_MINUTES}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <Fact label="Metric">
              <Badge variant="secondary" className="font-mono font-normal">
                {datastream.metricCode ?? '—'}
              </Badge>
            </Fact>
            <Fact label="Cột dữ liệu">
              <span className="truncate font-mono">{datastream.sourceField}</span>
            </Fact>
            <Fact label="Có số đo từ">
              {running ? (
                <span className="tabular text-primary">
                  đang đọc lại {backfill?.progressPercent ?? 0}%
                </span>
              ) : backfill?.status === 'FAILED' ? (
                <span className="text-critical">đọc lại lỗi</span>
              ) : (
                <span className="tabular">{oldest ? formatDateTime(oldest) : '—'}</span>
              )}
            </Fact>
          </div>

          {backfill?.status === 'FAILED' && backfill.error && (
            <p className="rounded-md border border-critical/40 bg-critical/10 px-3 py-2.5 font-mono text-[11.5px] break-words text-muted-foreground">
              {backfill.error}
            </p>
          )}

          {/* Hành động dựng lại dữ liệu bên trái, hành động phá huỷ dạt hẳn sang phải — bấm
              nhầm "Xóa kênh" khi định bấm "Đọc lại" là mất cả widget đang gắn vào nó. */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-4">
            <Button
              variant="outline"
              disabled={running}
              onClick={() => setIsBackfillOpen(true)}
              className={cn(running && 'text-muted-foreground')}
            >
              <History data-icon="inline-start" />
              {running ? 'Đang đọc lại lịch sử' : 'Đọc lại lịch sử'}
            </Button>
            <Button
              variant="outline"
              className="text-critical hover:bg-critical/10 hover:text-critical"
              onClick={() => setIsDeleteOpen(true)}
            >
              <Trash2 data-icon="inline-start" />
              Xóa kênh
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {isBackfillOpen && (
        <BackfillDialog
          datastream={datastream}
          externalSourceId={externalSourceId}
          open
          onOpenChange={setIsBackfillOpen}
        />
      )}

      <ConfirmDialog
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        title="Xóa kênh dữ liệu này?"
        question={
          <>
            Xóa kênh <span className="font-semibold">&ldquo;{datastream.name}&rdquo;</span>?
          </>
        }
        description="Widget dashboard đang bind kênh này sẽ mất liên kết và cần gắn lại thủ công. Dữ liệu đã ghi vào InfluxDB không bị xóa."
        confirmLabel="Xóa kênh"
        destructive
        isPending={deleteMutation.isPending}
        onConfirm={confirmDelete}
      />
    </>
  )
}
