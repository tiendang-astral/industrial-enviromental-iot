import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { LoadingButton } from '@/components/patterns/LoadingButton'
import {
  buildChannelDrafts,
  ChannelSetupStep,
  readyDrafts,
  type ChannelSetupValue,
} from '@/components/datasources/ChannelSetupStep'
import { JobQueryForm } from '@/components/datasources/JobQueryForm'
import { StepBar } from '@/components/datasources/StepBar'
import { getApiErrorMessage } from '@/lib/apiError'
import { useCreateDatastreamForJobMutation } from '@/queries/useCreateDatastreamForJobMutation'
import { useDatastreamsByExternalSourceQuery } from '@/queries/useDatastreamsByExternalSourceQuery'
import { useMetricsQuery } from '@/queries/useMetricsQuery'
import type { ExternalSourceJob, PreviewColumn } from '@/types/externalSource'

const STEPS = [
  { title: 'Câu truy vấn', description: 'Viết câu SELECT và chạy thử' },
  { title: 'Kênh dữ liệu', description: 'Gán cột thành kênh dùng được trên bảng theo dõi' },
] as const

const EMPTY_CHANNELS: ChannelSetupValue = {
  drafts: [],
  startFrom: 'NEW_ONLY',
  startFromDate: undefined,
}

/**
 * Luồng TẠO truy vấn định kỳ: soạn câu ở bước 1, gán cột thành kênh ngay ở bước 2 — không đóng
 * dialog rồi bắt người dùng đi tìm lại chỗ gán. Việc SỬA nay nằm trong một tab của modal chi
 * tiết, không mở dialog đè lên dialog nữa.
 */
export function JobEditorDialog({
  externalSourceId,
  open,
  onOpenChange,
}: {
  externalSourceId: number
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [step, setStep] = useState(0)
  const [savedJob, setSavedJob] = useState<ExternalSourceJob | null>(null)
  const [channels, setChannels] = useState<ChannelSetupValue>(EMPTY_CHANNELS)

  const { data: metrics } = useMetricsQuery()
  const { data: allDatastreams } = useDatastreamsByExternalSourceQuery(externalSourceId)
  const createDatastreamMutation = useCreateDatastreamForJobMutation(externalSourceId)

  useEffect(() => {
    if (!open) return
    setStep(0)
    setSavedJob(null)
    setChannels(EMPTY_CHANNELS)
  }, [open])

  function goToChannels(saved: ExternalSourceJob, columns: PreviewColumn[]) {
    setSavedJob(saved)
    setChannels({
      drafts: buildChannelDrafts({
        columns,
        timestampColumn: saved.queryConfig.timestampColumn,
        metrics: metrics ?? [],
        boundFields: [],
        takenNames: (allDatastreams ?? []).map((item) => item.name),
        jobName: saved.name,
      }),
      startFrom: 'NEW_ONLY',
      startFromDate: undefined,
    })
    setStep(1)
  }

  async function handleCreateChannels() {
    if (!savedJob) return
    const ready = readyDrafts(channels)
    if (ready.length === 0) {
      onOpenChange(false)
      return
    }

    // Không có API tạo hàng loạt; chạy tuần tự để lỗi ở kênh thứ n không nuốt mất n-1 kênh
    // đã tạo thành công trước đó.
    let created = 0
    for (const draft of ready) {
      try {
        await createDatastreamMutation.mutateAsync({
          jobId: savedJob.id,
          payload: {
            name: draft.name.trim(),
            metricId: Number(draft.metricId),
            sourceField: draft.sourceField,
          },
        })
        created += 1
      } catch (error) {
        toast.error(
          `Tạo kênh “${draft.name}” thất bại: ${getApiErrorMessage(error, 'lỗi không rõ')}`
        )
        break
      }
    }

    if (created > 0) toast.success(`Đã tạo ${created} kênh dữ liệu`)
    if (created === ready.length) onOpenChange(false)
  }

  const readyCount = readyDrafts(channels).length

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[92vh] flex-col gap-4 overflow-hidden sm:max-w-6xl">
        <DialogHeader className="gap-3">
          <DialogTitle>Truy vấn định kỳ mới</DialogTitle>
          <StepBar steps={STEPS} step={step} />
        </DialogHeader>

        {step === 0 ? (
          <JobQueryForm
            externalSourceId={externalSourceId}
            job={null}
            submitLabel="Lưu và tiếp tục"
            onCancel={() => onOpenChange(false)}
            onSaved={goToChannels}
          />
        ) : (
          savedJob && (
            <>
              <div className="min-h-0 flex-1 overflow-y-auto">
                <ChannelSetupStep
                  job={savedJob}
                  metrics={metrics ?? []}
                  value={channels}
                  onChange={setChannels}
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                  Để sau
                </Button>
                <LoadingButton
                  isPending={createDatastreamMutation.isPending}
                  onClick={handleCreateChannels}
                >
                  {readyCount > 0 ? `Tạo ${readyCount} kênh` : 'Xong'}
                </LoadingButton>
              </DialogFooter>
            </>
          )
        )}
      </DialogContent>
    </Dialog>
  )
}
