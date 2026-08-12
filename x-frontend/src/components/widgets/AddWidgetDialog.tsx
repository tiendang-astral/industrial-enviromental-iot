import { useEffect, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import {
  addWidgetSchema,
  bindsDatastream,
  WIDGET_TYPE_LABELS,
  WIDGET_TYPE_OPTIONS,
  type AddWidgetFormValues,
} from '@/lib/addWidgetSchema'
import type { Datastream, WidgetType } from '@/types/dashboard'

const selectClassName =
  'h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50'

interface AddWidgetDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  datastreams: Datastream[]
  onAdd: (input: { type: WidgetType; title: string; datastreamId: number | null }) => void
}

type Step = 'type' | 'details'

export function AddWidgetDialog({ open, onOpenChange, datastreams, onAdd }: AddWidgetDialogProps) {
  const [step, setStep] = useState<Step>('type')
  const [selectedType, setSelectedType] = useState<WidgetType | null>(null)

  const form = useForm<AddWidgetFormValues>({
    resolver: zodResolver(addWidgetSchema),
    defaultValues: { type: 'VALUE', datastreamId: '', title: '' },
  })
  const datastreamId = form.watch('datastreamId')

  useEffect(() => {
    if (!selectedType || !bindsDatastream(selectedType)) {
      return
    }
    const ds = datastreams.find((d) => String(d.id) === datastreamId)
    if (ds) {
      form.setValue('title', ds.name)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [datastreamId])

  function reset() {
    setStep('type')
    setSelectedType(null)
    form.reset({ type: 'VALUE', datastreamId: '', title: '' })
  }

  function goToDetails() {
    if (!selectedType) return
    form.setValue('type', selectedType)
    form.setValue('datastreamId', '')
    form.setValue('title', bindsDatastream(selectedType) ? '' : WIDGET_TYPE_LABELS[selectedType])
    setStep('details')
  }

  function onSubmit(values: AddWidgetFormValues) {
    onAdd({
      type: values.type,
      title: values.title,
      datastreamId: bindsDatastream(values.type) && values.datastreamId ? Number(values.datastreamId) : null,
    })
    reset()
    onOpenChange(false)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset()
        onOpenChange(next)
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{step === 'type' ? 'Thêm widget — chọn loại' : 'Thêm widget — thông tin'}</DialogTitle>
          <DialogDescription>
            {step === 'type' ? 'Chọn loại widget muốn thêm vào dashboard.' : 'Gắn datastream (nếu cần) và đặt tên widget.'}
          </DialogDescription>
        </DialogHeader>

        {step === 'type' && (
          <>
            <div className="grid grid-cols-2 gap-2">
              {WIDGET_TYPE_OPTIONS.map((option) => {
                const Icon = option.icon
                const isSelected = selectedType === option.type
                return (
                  <button
                    key={option.type}
                    type="button"
                    onClick={() => setSelectedType(option.type)}
                    className={cn(
                      'flex flex-col items-start gap-1.5 rounded-lg border p-3 text-left transition-colors',
                      isSelected ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-input hover:bg-muted/50'
                    )}
                  >
                    <Icon className={cn('size-5', isSelected ? 'text-primary' : 'text-muted-foreground')} />
                    <span className="text-sm font-medium">{option.label}</span>
                    <span className="text-xs text-muted-foreground">{option.description}</span>
                  </button>
                )
              })}
            </div>
            <DialogFooter>
              <Button type="button" disabled={!selectedType} onClick={goToDetails}>
                Tiếp theo
              </Button>
            </DialogFooter>
          </>
        )}

        {step === 'details' && selectedType && (
          <Form {...form}>
            <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
              {bindsDatastream(selectedType) && (
                <FormField
                  control={form.control}
                  name="datastreamId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Datastream</FormLabel>
                      <FormControl>
                        <select className={selectClassName} {...field}>
                          <option value="">-- Chọn datastream --</option>
                          {datastreams.map((ds) => (
                            <option key={ds.id} value={ds.id}>
                              {ds.name} ({ds.metricCode ?? 'chưa gán metric'})
                            </option>
                          ))}
                        </select>
                      </FormControl>
                      <FormMessage />
                      {datastreams.length === 0 && (
                        <p className="text-xs text-muted-foreground">Node này chưa có datastream nào.</p>
                      )}
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tên widget</FormLabel>
                    <FormControl>
                      <Input autoFocus {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setStep('type')}>
                  <ArrowLeft />
                  Quay lại
                </Button>
                <Button type="submit">Thêm</Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  )
}
