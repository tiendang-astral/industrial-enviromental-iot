import { useEffect, useMemo, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm } from 'react-hook-form'
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
import { Checkbox } from '@/components/ui/checkbox'
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { WIDGET_TYPE_SOURCE, WidgetTypePreview } from '@/components/widgets/WidgetTypePreview'
import { cn } from '@/lib/utils'
import {
  addWidgetSchema,
  bindsDatastream,
  bindsGatewayPin,
  WIDGET_TYPE_LABELS,
  WIDGET_TYPE_OPTIONS,
  type AddWidgetFormValues,
} from '@/lib/addWidgetSchema'
import { useGatewayPinsQuery } from '@/queries/useGatewayPinsQuery'
import { useGatewaysQuery } from '@/queries/useGatewaysQuery'
import { useTenantNodesQuery } from '@/queries/useTenantNodesQuery'
import { orderNodesDepthFirst } from '@/lib/tenantNodeTree'
import type { Datastream, WidgetType } from '@/types/dashboard'

interface AddWidgetDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  datastreams: Datastream[]
  /** Chỉ cần khi allowDeviceWidgets — dùng để load danh sách gateway/pin OUTPUT cho SWITCH. */
  tenantNodeId?: number
  onAdd: (input: {
    type: WidgetType
    title: string
    datastreamIds: number[]
    gatewayId: number | null
    pinId: number | null
  }) => void
  /** false = board theo nguồn (external_source) — không có khái niệm gateway/subtree để tổng hợp. */
  allowDeviceWidgets?: boolean
}

type Step = 'type' | 'details'

export function AddWidgetDialog({
  open,
  onOpenChange,
  datastreams,
  tenantNodeId,
  onAdd,
  allowDeviceWidgets = true,
}: AddWidgetDialogProps) {
  const [step, setStep] = useState<Step>('type')
  const [selectedType, setSelectedType] = useState<WidgetType | null>(null)
  const typeOptions = allowDeviceWidgets
    ? WIDGET_TYPE_OPTIONS
    : WIDGET_TYPE_OPTIONS.filter((option) => bindsDatastream(option.type))

  const form = useForm<AddWidgetFormValues>({
    resolver: zodResolver(addWidgetSchema),
    defaultValues: { type: 'VALUE', datastreamIds: [], gatewayId: '', pinId: '', title: '' },
  })
  const {
    register,
    control,
    watch,
    setValue,
    handleSubmit,
    formState: { errors },
  } = form
  const datastreamIds = watch('datastreamIds')
  const gatewayId = watch('gatewayId')
  const pinId = watch('pinId')

  const { data: gateways } = useGatewaysQuery(tenantNodeId ?? 0, true)
  const { data: tenantNodes } = useTenantNodesQuery()

  // Board ở cấp gộp kê kênh của nhiều site cạnh nhau; không tách nhóm thì hai chuồng cùng có
  // "Nhiệt độ" đọc ra y hệt nhau. Board ở SITE chỉ có 1 nhóm nên bỏ tiêu đề nhóm cho đỡ nhiễu.
  const datastreamGroups = useMemo(() => {
    const nodeName = new Map(tenantNodes?.map((node) => [node.id, node.name]) ?? [])
    const order = orderNodesDepthFirst(tenantNodes ?? []).map((node) => node.id)
    const byNode = new Map<number, Datastream[]>()
    for (const datastream of datastreams) {
      const list = byNode.get(datastream.tenantNodeId) ?? []
      list.push(datastream)
      byNode.set(datastream.tenantNodeId, list)
    }
    return [...byNode.entries()]
      .sort((a, b) => order.indexOf(a[0]) - order.indexOf(b[0]))
      .map(([nodeId, items]) => ({ nodeId, name: nodeName.get(nodeId) ?? `#${nodeId}`, items }))
  }, [datastreams, tenantNodes])
  const showGroupLabels = datastreamGroups.length > 1
  const { data: gatewayPins } = useGatewayPinsQuery(gatewayId ? Number(gatewayId) : 0)
  const outputPins = gatewayPins?.filter((pin) => pin.direction === 'OUTPUT') ?? []

  const bindingReady = !selectedType
    ? false
    : bindsDatastream(selectedType)
      ? datastreamIds.length > 0
      : bindsGatewayPin(selectedType)
        ? !!pinId
        : true

  useEffect(() => {
    if (!selectedType || !bindsDatastream(selectedType)) {
      return
    }
    const selected = datastreams.filter((item) => datastreamIds.includes(String(item.id)))
    if (selected.length === 1) {
      const datastream = selected[0]
      const site = datastreamGroups.find((group) => group.nodeId === datastream.tenantNodeId)
      setValue(
        'title',
        datastream.tenantNodeId !== tenantNodeId && site
          ? `${site.name} · ${datastream.name}`
          : datastream.name
      )
    } else if (selected.length > 1) {
      // Không tên kênh nào đại diện được cho cả ô — dùng mã chỉ số, giống cách backend đặt tên khi áp mẫu.
      setValue('title', selected[0].metricCode ?? 'Nhiều kênh')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [datastreamIds.join(',')])

  useEffect(() => {
    if (!selectedType || !bindsGatewayPin(selectedType)) {
      return
    }
    const pin = outputPins.find((item) => String(item.id) === pinId)
    if (pin) {
      setValue('title', pin.name)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pinId])

  // Đổi gateway -> pin cũ (thuộc gateway khác) không còn hợp lệ, reset lại.
  useEffect(() => {
    setValue('pinId', '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gatewayId])

  function reset() {
    setStep('type')
    setSelectedType(null)
    form.reset({ type: 'VALUE', datastreamIds: [], gatewayId: '', pinId: '', title: '' })
  }

  function goToDetails() {
    if (!selectedType) return
    setValue('type', selectedType)
    setValue('datastreamIds', [])
    setValue('gatewayId', '')
    setValue('pinId', '')
    setValue(
      'title',
      bindsDatastream(selectedType) || bindsGatewayPin(selectedType)
        ? ''
        : WIDGET_TYPE_LABELS[selectedType]
    )
    setStep('details')
  }

  function onSubmit(values: AddWidgetFormValues) {
    onAdd({
      type: values.type,
      title: values.title,
      datastreamIds: bindsDatastream(values.type) ? values.datastreamIds.map(Number) : [],
      gatewayId: bindsGatewayPin(values.type) && values.gatewayId ? Number(values.gatewayId) : null,
      pinId: bindsGatewayPin(values.type) && values.pinId ? Number(values.pinId) : null,
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
      <DialogContent
        className="sm:max-w-lg"
        // Bước chọn loại không còn dòng mô tả nào — nói rõ để Radix không cảnh báo thiếu Description.
        {...(step === 'type' ? { 'aria-describedby': undefined } : {})}
      >
        <DialogHeader>
          <DialogTitle>
            {  'Thêm widget' }
          </DialogTitle>
          {step === 'details' && (
            <DialogDescription>
              Gắn dữ liệu cho widget và đặt tên hiển thị trên bảng điều khiển.
            </DialogDescription>
          )}
        </DialogHeader>

        {step === 'type' && (
          <>
            <div className="grid grid-cols-2 gap-2.5">
              {typeOptions.map((option) => {
                const Icon = option.icon
                const isSelected = selectedType === option.type
                return (
                  <button
                    key={option.type}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => setSelectedType(option.type)}
                    onDoubleClick={goToDetails}
                    className={cn(
                      'flex flex-col gap-2 rounded-xl border p-3 text-center transition-colors duration-(--motion-fast) focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none',
                      isSelected
                        ? 'border-primary bg-primary/5 ring-1 ring-primary'
                        : 'border-input hover:border-border hover:bg-muted/40'
                    )}
                  >
                    <WidgetTypePreview type={option.type} selected={isSelected} />
                    <span className="flex min-w-0 items-center justify-center gap-1.5">
                      <Icon className={cn('size-4 shrink-0', isSelected ? 'text-primary' : 'text-muted-foreground')} />
                      <span className="min-w-0 truncate text-sm font-medium">{option.label}</span>
                    </span>
                    {/* Bind vào cái gì — thứ quyết định người dùng chọn loại nào, thay cho dòng mô tả cũ. */}
                    <span className="text-[11px] text-muted-foreground">{WIDGET_TYPE_SOURCE[option.type]}</span>
                  </button>
                )
              })}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Hủy
              </Button>
              <Button type="button" disabled={!selectedType} onClick={goToDetails}>
                Tiếp theo
              </Button>
            </DialogFooter>
          </>
        )}

        {step === 'details' && selectedType && (
          <form className="flex flex-col gap-6" onSubmit={handleSubmit(onSubmit)} noValidate>
            <FieldGroup>
              {bindsDatastream(selectedType) && (
                <Field>
                  <FieldLabel htmlFor="widget-datastreams">Kênh dữ liệu</FieldLabel>
                  <Controller
                    control={control}
                    name="datastreamIds"
                    render={({ field }) => {
                      // Chỉ gộp được kênh CÙNG chỉ số: khác chỉ số là khác đơn vị, chồng chung một
                      // trục Y thì con số đọc ra vô nghĩa (xem PLAN.md Phase 2).
                      const lockedMetric = datastreams.find((item) =>
                        field.value.includes(String(item.id))
                      )?.metricCode
                      const toggle = (id: string, checked: boolean) =>
                        field.onChange(
                          checked ? [...field.value, id] : field.value.filter((item) => item !== id)
                        )
                      return (
                        <div
                          id="widget-datastreams"
                          className="max-h-56 overflow-y-auto rounded-lg border border-input p-1"
                        >
                          {datastreamGroups.map((group) => (
                            <div key={group.nodeId} className="flex flex-col">
                              {showGroupLabels && (
                                <p className="px-2 pt-2 pb-1 text-xs font-medium text-muted-foreground">
                                  {group.name}
                                </p>
                              )}
                              {group.items.map((datastream) => {
                                const id = String(datastream.id)
                                const checked = field.value.includes(id)
                                const blocked =
                                  !checked && !!lockedMetric && datastream.metricCode !== lockedMetric
                                return (
                                  <label
                                    key={datastream.id}
                                    className={cn(
                                      'flex items-center gap-2 rounded-md px-2 py-1.5 text-sm',
                                      blocked ? 'opacity-40' : 'cursor-pointer hover:bg-muted/50'
                                    )}
                                  >
                                    <Checkbox
                                      checked={checked}
                                      disabled={blocked}
                                      onCheckedChange={(next) => toggle(id, next === true)}
                                    />
                                    <span className="min-w-0 flex-1 truncate">{datastream.name}</span>
                                    <span className="shrink-0 text-xs text-muted-foreground">
                                      {datastream.metricCode ?? 'chưa gán chỉ số'}
                                    </span>
                                  </label>
                                )
                              })}
                            </div>
                          ))}
                        </div>
                      )
                    }}
                  />
                  <FieldDescription>
                    {datastreams.length === 0
                      && 'Đơn vị này và các đơn vị bên dưới chưa có kênh dữ liệu nào — khai báo pin INPUT trên gateway hoặc gắn kênh cho nguồn dữ liệu trước.'
                      }
                  </FieldDescription>
                </Field>
              )}

              {bindsGatewayPin(selectedType) && (
                <>
                  <Field data-invalid={!!errors.gatewayId}>
                    <FieldLabel htmlFor="widget-gateway">Gateway</FieldLabel>
                    <Controller
                      control={control}
                      name="gatewayId"
                      render={({ field }) => (
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger
                            id="widget-gateway"
                            aria-invalid={!!errors.gatewayId}
                            className="w-full"
                          >
                            <SelectValue placeholder="Chọn gateway" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectGroup>
                              {gateways?.map((gateway) => (
                                <SelectItem key={gateway.id} value={String(gateway.id)}>
                                  {gateway.name}
                                </SelectItem>
                              ))}
                            </SelectGroup>
                          </SelectContent>
                        </Select>
                      )}
                    />
                    <FieldError errors={[errors.gatewayId]} />
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="widget-pin">Chân điều khiển</FieldLabel>
                    <Controller
                      control={control}
                      name="pinId"
                      render={({ field }) => (
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                          disabled={!gatewayId || outputPins.length === 0}
                        >
                          <SelectTrigger
                            id="widget-pin"
                            aria-invalid={!!errors.pinId}
                            className="w-full"
                          >
                            <SelectValue placeholder="Chọn chân OUTPUT" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectGroup>
                              {outputPins.map((pin) => (
                                <SelectItem key={pin.id} value={String(pin.id)}>
                                  {pin.name} ({pin.type} {pin.pinNumber})
                                </SelectItem>
                              ))}
                            </SelectGroup>
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {gatewayId && outputPins.length === 0 && (
                      <FieldDescription>Gateway này chưa có chân OUTPUT nào.</FieldDescription>
                    )}
                  </Field>
                </>
              )}

              <Field data-invalid={!!errors.title}>
                <FieldLabel htmlFor="widget-title">Tên widget</FieldLabel>
                <Input
                  id="widget-title"
                  autoFocus
                  aria-invalid={!!errors.title}
                  {...register('title')}
                />
                <FieldError errors={[errors.title]} />
              </Field>
            </FieldGroup>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setStep('type')}>
                <ArrowLeft data-icon="inline-start" />
                Quay lại
              </Button>
              {/* Chưa chọn nguồn thì khoá nút, không tô đỏ danh sách: người dùng chưa làm gì sai,
                  họ mới chỉ chưa làm xong. */}
              <Button type="submit" disabled={!bindingReady}>
                Thêm widget
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
