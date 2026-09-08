import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { ArrowLeft, ArrowRight, Mail, Send, X } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { LoadingButton } from '@/components/patterns/LoadingButton'
import { TenantNodePicker } from '@/components/patterns/TenantNodePicker'
import { MetricMultiSelect } from '@/components/alerts/MetricMultiSelect'
import { RecipientChipsField } from '@/components/alerts/RecipientChipsField'
import { getApiErrorMessage } from '@/lib/apiError'
import { topMostNodeIds } from '@/lib/tenantNodeTree'
import {
  CONDITION_PRESETS,
  DURATION_UNITS,
  SOURCE_TYPE_OPTIONS,
  conditionsToPreset,
  needsTwoThresholds,
  presetToConditions,
  splitDuration,
  type ConditionPreset,
} from '@/lib/alertPresets'
import { useSaveAlertRuleGroupMutation } from '@/queries/useAlertRuleGroupMutations'
import { useTenantUsersQuery } from '@/queries/useTenantUsersQuery'
import type { AlertRuleGroup, AlertSeverity, AlertSourceType, MetricRuleInput } from '@/types/alert'
import type { Metric } from '@/types/metric'
import type { TenantNode } from '@/types/tenantNode'

/** Cấu hình một chỉ số trong lúc điền form — chuyển sang `conditions_json` khi bấm Lưu. */
interface MetricDraft {
  preset: ConditionPreset
  low: string
  high: string
  durationAmount: string
  durationUnit: number
}

/** Liệt kê tối đa 3 tên rồi gộp phần dư — nêu hết thì câu dài hơn cả form. */
function nameList(names: (string | undefined)[]) {
  const valid = names.filter((name): name is string => !!name)
  if (valid.length <= 3) return valid.join(', ')
  return `${valid.slice(0, 3).join(', ')} và ${valid.length - 3} mục nữa`
}

const DEFAULT_DRAFT: MetricDraft = {
  preset: 'GT',
  low: '',
  high: '',
  durationAmount: '0',
  durationUnit: 1,
}

export function AlertRuleWizardDialog({
  group,
  nodes,
  metrics,
  open,
  onOpenChange,
}: {
  /** null = tạo mới. */
  group: AlertRuleGroup | null
  nodes: TenantNode[]
  metrics: Metric[]
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const saveMutation = useSaveAlertRuleGroupMutation()
  const { data: tenantUsers } = useTenantUsersQuery()

  const [step, setStep] = useState<1 | 2>(1)
  const [name, setName] = useState('')
  const [severity, setSeverity] = useState<AlertSeverity>('WARNING')
  const [sourceType, setSourceType] = useState<string>('ALL')
  const [nodeIds, setNodeIds] = useState<number[]>([])
  const [metricIds, setMetricIds] = useState<number[]>([])
  const [drafts, setDrafts] = useState<Record<number, MetricDraft>>({})

  const [emailOn, setEmailOn] = useState(true)
  const [emails, setEmails] = useState<string[]>([])
  const [telegramOn, setTelegramOn] = useState(false)
  const [chatIds, setChatIds] = useState<string[]>([])
  const [botToken, setBotToken] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const emailSuggestions = useMemo(
    () => (tenantUsers ?? []).map((user) => user.email).filter((email): email is string => !!email),
    [tenantUsers]
  )

  useEffect(() => {
    if (!open) return
    setStep(1)
    setSubmitted(false)
    if (group) {
      setName(group.name)
      setSeverity(group.severity)
      setSourceType(group.sourceType ?? 'ALL')
      setNodeIds(group.tenantNodeIds)
      setMetricIds(group.metricIds)
      // Mọi rule con của cùng một chỉ số có cấu hình giống nhau — lấy dòng đầu là đủ.
      const restored: Record<number, MetricDraft> = {}
      for (const metricId of group.metricIds) {
        const rule = group.rules.find((item) => item.metricId === metricId)
        const { preset, low, high } = conditionsToPreset(rule?.conditions)
        const { amount, unit } = splitDuration(rule?.durationSeconds ?? 0)
        restored[metricId] = {
          preset,
          low: String(low),
          high: String(high),
          durationAmount: String(amount),
          durationUnit: unit,
        }
      }
      setDrafts(restored)

      const email = group.channels.filter((channel) => channel.channelType === 'EMAIL')
      const telegram = group.channels.filter((channel) => channel.channelType === 'TELEGRAM')
      setEmailOn(email.length > 0)
      setEmails(email.map((channel) => channel.address))
      setTelegramOn(telegram.length > 0)
      setChatIds(telegram.map((channel) => channel.address))
      // Token không bao giờ được trả về — phải nhập lại nếu muốn giữ kênh Telegram.
      setBotToken('')
    } else {
      setName('')
      setSeverity('WARNING')
      setSourceType('ALL')
      setNodeIds([])
      setMetricIds([])
      setDrafts({})
      setEmailOn(true)
      setEmails([])
      setTelegramOn(false)
      setChatIds([])
      setBotToken('')
    }
  }, [open, group])

  // Chọn thêm chỉ số thì thẻ mới phải có sẵn giá trị mặc định; bỏ chọn thì dọn luôn bản nháp.
  useEffect(() => {
    setDrafts((prev) => {
      const next: Record<number, MetricDraft> = {}
      for (const metricId of metricIds) next[metricId] = prev[metricId] ?? { ...DEFAULT_DRAFT }
      return next
    })
  }, [metricIds])

  function patchDraft(metricId: number, patch: Partial<MetricDraft>) {
    setDrafts((prev) => ({ ...prev, [metricId]: { ...(prev[metricId] ?? DEFAULT_DRAFT), ...patch } }))
  }

  const metricById = useMemo(() => new Map(metrics.map((metric) => [metric.id, metric])), [metrics])

  // Quy tắc đã phủ toàn bộ đơn vị con, nên node có tổ tiên cũng được chọn là thừa — backend thu
  // gọn y hệt trước khi ghi. Đếm ở đây theo con số thật sẽ tạo ra, không theo số ô đã tick.
  const effectiveNodeIds = useMemo(() => topMostNodeIds(nodeIds, nodes), [nodeIds, nodes])

  // Kể tên thay vì đọc ra phép nhân: "2 theo dõi (1 đơn vị × 2 chỉ số)" đúng về số nhưng không nói
  // được là theo dõi CÁI GÌ, Ở ĐÂU — thứ người dùng cần đối chiếu trước khi bấm Lưu.
  const summaryNodes = useMemo(
    () => nameList(effectiveNodeIds.map((id) => nodes.find((node) => node.id === id)?.name)),
    [effectiveNodeIds, nodes]
  )
  const summaryMetrics = useMemo(
    () => nameList(metricIds.map((id) => metrics.find((metric) => metric.id === id)?.name)),
    [metricIds, metrics]
  )

  const step1Errors = {
    name: !name.trim() ? 'Nhập tên quy tắc' : null,
    nodes: nodeIds.length === 0 ? 'Chọn ít nhất một tổ chức' : null,
    metrics: metricIds.length === 0 ? 'Chọn ít nhất một chỉ số' : null,
    thresholds: metricIds.some((metricId) => {
      const draft = drafts[metricId] ?? DEFAULT_DRAFT
      if (draft.low.trim() === '' || Number.isNaN(Number(draft.low))) return true
      return needsTwoThresholds(draft.preset) && (draft.high.trim() === '' || Number.isNaN(Number(draft.high)))
    })
      ? 'Điền đủ ngưỡng cho mọi chỉ số'
      : null,
  }
  const step1Valid = Object.values(step1Errors).every((error) => error === null)

  const step2Errors = {
    channels:
      (!emailOn && !telegramOn) || (emailOn && emails.length === 0) || (telegramOn && chatIds.length === 0)
        ? 'Chọn ít nhất một kênh và điền người nhận'
        : null,
    token: telegramOn && !botToken.trim() ? 'Nhập bot token Telegram' : null,
  }
  const step2Valid = Object.values(step2Errors).every((error) => error === null)

  function submit() {
    setSubmitted(true)
    if (!step2Valid) return

    const metricInputs: MetricRuleInput[] = metricIds.map((metricId) => {
      const draft = drafts[metricId] ?? DEFAULT_DRAFT
      return {
        metricId,
        conditions: presetToConditions(draft.preset, Number(draft.low), Number(draft.high || 0)),
        durationSeconds: Number(draft.durationAmount || 0) * draft.durationUnit,
      }
    })

    const channels = [
      ...(emailOn ? emails.map((address) => ({ channelType: 'EMAIL' as const, address })) : []),
      ...(telegramOn
        ? chatIds.map((address) => ({
            channelType: 'TELEGRAM' as const,
            address,
            telegramBotToken: botToken.trim(),
          }))
        : []),
    ]

    const payload = {
      name: name.trim(),
      severity,
      sourceType: (sourceType === 'ALL' ? null : sourceType) as AlertSourceType,
      tenantNodeIds: nodeIds,
      metrics: metricInputs,
      channels,
    }
    saveMutation.mutate(
      group ? { mode: 'update', id: group.id, payload } : { mode: 'create', payload },
      {
        onSuccess: (saved) => {
          onOpenChange(false)
          toast.success(
            group ? 'Đã cập nhật quy tắc' : `Đã tạo quy tắc cho ${saved.ruleCount} cặp đơn vị · chỉ số`
          )
        },
        onError: (error) => toast.error(getApiErrorMessage(error, 'Lưu quy tắc thất bại')),
      }
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* Cao theo nội dung, chỉ chặn trần 90vh: bước 1 lúc mới mở chỉ có vài field, khoá cứng
          chiều cao thì hộp rỗng quá nửa. Chạm trần thì grid 3 hàng giữ header/footer đứng yên và
          cho riêng phần thân cuộn. */}
      <DialogContent className="grid max-h-[90vh] grid-rows-[auto_minmax(0,1fr)_auto] sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>{group ? `Sửa quy tắc ${group.name}` : 'Thêm quy tắc cảnh báo'}</DialogTitle>
          <DialogDescription>
            {step === 1
              ? 'Bước 1/2 — Chọn phạm vi áp dụng và ngưỡng cho từng chỉ số.'
              : 'Bước 2/2 — Chọn nơi nhận cảnh báo.'}
          </DialogDescription>
        </DialogHeader>

        {/* px/py để vòng focus của control sát mép không bị thanh cuộn cắt mất. */}
        <div className="min-h-0 overflow-y-auto px-1 py-1">
        {step === 1 ? (
          <FieldGroup>
            <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
              <Field data-invalid={(submitted && !!step1Errors.name) || undefined}>
                <FieldLabel htmlFor="group-name" data-required>
                  Tên quy tắc
                </FieldLabel>
                <Input
                  id="group-name"
                  placeholder="Giám sát môi trường chuồng"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  aria-invalid={(submitted && !!step1Errors.name) || undefined}
                />
                {submitted && step1Errors.name && <FieldError>{step1Errors.name}</FieldError>}
              </Field>

              <Field>
                <FieldLabel htmlFor="group-severity">Mức độ</FieldLabel>
                <Select value={severity} onValueChange={(value) => setSeverity(value as AlertSeverity)}>
                  <SelectTrigger id="group-severity" className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="WARNING">Cảnh báo</SelectItem>
                      <SelectItem value="CRITICAL">Nguy hiểm</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
            </div>

            <Field data-invalid={(submitted && !!step1Errors.nodes) || undefined}>
              <FieldLabel htmlFor="group-nodes" data-required>
                Tổ chức áp dụng
              </FieldLabel>
              <TenantNodePicker
                id="group-nodes"
                nodes={nodes}
                mode="multiple"
                value={nodeIds}
                onChange={setNodeIds}
                invalid={submitted && !!step1Errors.nodes}
              />
              {submitted && step1Errors.nodes && <FieldError>{step1Errors.nodes}</FieldError>}
            </Field>

            <Field>
              <FieldLabel htmlFor="group-source">Áp cho nguồn</FieldLabel>
              <Select value={sourceType} onValueChange={setSourceType}>
                <SelectTrigger id="group-source">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {SOURCE_TYPE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
              <FieldDescription>
                Một đơn vị có thể vừa có cảm biến trong chuồng vừa có dữ liệu thời tiết từ database
                ngoài — cùng chỉ số nhưng khác bản chất. Chọn nguồn để quy tắc không bắn nhầm sang loại kia.
              </FieldDescription>
            </Field>

            <Field data-invalid={(submitted && !!step1Errors.metrics) || undefined}>
              <FieldLabel htmlFor="group-metrics" data-required>
                Chỉ số theo dõi
              </FieldLabel>
              <MetricMultiSelect
                id="group-metrics"
                metrics={metrics}
                value={metricIds}
                onChange={setMetricIds}
                invalid={submitted && !!step1Errors.metrics}
              />
              {submitted && step1Errors.metrics && <FieldError>{step1Errors.metrics}</FieldError>}
            </Field>

            {metricIds.length > 0 && (
              <FieldSet>
                <FieldLegend>Ngưỡng theo từng chỉ số</FieldLegend>
                <div className="flex flex-col gap-3">
                  {metricIds.map((metricId) => {
                    const draft = drafts[metricId] ?? DEFAULT_DRAFT
                    const metric = metricById.get(metricId)
                    const unit = metric?.unit ?? ''
                    const twoThresholds = needsTwoThresholds(draft.preset)
                    const missingLow = submitted && draft.low.trim() === ''
                    const missingHigh = submitted && twoThresholds && draft.high.trim() === ''

                    return (
                      <div
                        key={metricId}
                        className="flex flex-col gap-3 rounded-lg border border-border bg-card p-3"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{metric?.name ?? `#${metricId}`}</span>
                          {unit && <span className="text-[12.5px] text-muted-foreground">{unit}</span>}
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="-my-1 -mr-1 ml-auto size-7 text-muted-foreground"
                            onClick={() => setMetricIds(metricIds.filter((id) => id !== metricId))}
                          >
                            <X />
                            <span className="sr-only">Bỏ theo dõi {metric?.name}</span>
                          </Button>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <Select
                            value={draft.preset}
                            onValueChange={(value) =>
                              patchDraft(metricId, { preset: value as ConditionPreset })
                            }
                          >
                            <SelectTrigger
                              className="w-36"
                              aria-label={`Kiểu điều kiện cho ${metric?.name}`}
                            >
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectGroup>
                                {CONDITION_PRESETS.map((preset) => (
                                  <SelectItem key={preset.value} value={preset.value}>
                                    {preset.label}
                                  </SelectItem>
                                ))}
                              </SelectGroup>
                            </SelectContent>
                          </Select>

                          <InputGroup className="w-28">
                            <InputGroupInput
                              type="number"
                              step="any"
                              className="tabular"
                              aria-label={
                                twoThresholds ? `Cận dưới ${metric?.name}` : `Ngưỡng ${metric?.name}`
                              }
                              aria-invalid={missingLow || undefined}
                              value={draft.low}
                              onChange={(event) => patchDraft(metricId, { low: event.target.value })}
                            />
                            {unit && <InputGroupAddon align="inline-end">{unit}</InputGroupAddon>}
                          </InputGroup>

                          {twoThresholds && (
                            <>
                              <span className="text-muted-foreground">–</span>
                              <InputGroup className="w-28">
                                <InputGroupInput
                                  type="number"
                                  step="any"
                                  className="tabular"
                                  aria-label={`Cận trên ${metric?.name}`}
                                  aria-invalid={missingHigh || undefined}
                                  value={draft.high}
                                  onChange={(event) =>
                                    patchDraft(metricId, { high: event.target.value })
                                  }
                                />
                                {unit && <InputGroupAddon align="inline-end">{unit}</InputGroupAddon>}
                              </InputGroup>
                            </>
                          )}

                          <span className="ml-1 text-[12.5px] text-muted-foreground">
                            Vi phạm trong
                          </span>
                          {/* Số và đơn vị gộp trong MỘT ô: chúng là một đại lượng, tách thành hai
                              control cạnh nhau thì mắt phải ghép lại mới đọc ra "5 phút". */}
                          <InputGroup className="w-40">
                            <InputGroupInput
                              type="number"
                              min={0}
                              className="tabular"
                              aria-label={`Thời gian vi phạm liên tục ${metric?.name}`}
                              value={draft.durationAmount}
                              onChange={(event) =>
                                patchDraft(metricId, { durationAmount: event.target.value })
                              }
                            />
                            {/* `inline-end` tự thêm mr-[-0.3rem] khi bên trong có <button> (dành cho
                                InputGroupButton) — huỷ đi, không thì trigger tràn ra ngoài viền. */}
                            <InputGroupAddon align="inline-end" className="py-0 pr-1 has-[>button]:mr-0">
                              <Select
                                value={String(draft.durationUnit)}
                                onValueChange={(value) =>
                                  patchDraft(metricId, { durationUnit: Number(value) })
                                }
                              >
                                {/* Phải ghi đè `data-[size=default]:h-8` của SelectTrigger: cao bằng
                                    đúng InputGroup thì nó phủ kín viền trên/dưới ở nửa phải. Nền và
                                    viền cũng phải trong suốt để không vẽ một hộp thứ hai bên trong. */}
                                <SelectTrigger
                                  className="h-6 gap-1 rounded-md border-0 bg-transparent px-1.5 shadow-none data-[size=default]:h-6 focus-visible:ring-1 dark:bg-transparent dark:hover:bg-transparent"
                                  aria-label={`Đơn vị thời gian ${metric?.name}`}
                                >
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectGroup>
                                    {DURATION_UNITS.map((option) => (
                                      <SelectItem key={option.value} value={String(option.value)}>
                                        {option.label}
                                      </SelectItem>
                                    ))}
                                  </SelectGroup>
                                </SelectContent>
                              </Select>
                            </InputGroupAddon>
                          </InputGroup>
                        </div>
                      </div>
                    )
                  })}
                </div>
                {submitted && step1Errors.thresholds && <FieldError>{step1Errors.thresholds}</FieldError>}
              </FieldSet>
            )}
          </FieldGroup>
        ) : (
          <FieldGroup>
            <FieldSet>
              <FieldLegend>Kênh thông báo</FieldLegend>
              <FieldDescription>Gửi khi cảnh báo bắt đầu và khi đã phục hồi.</FieldDescription>

              {/* Không bọc card: hai kênh là hai lựa chọn ngang hàng, ngăn bằng một đường kẻ
                  là đủ. Nội dung thụt vào cho thấy nó thuộc về ô tick ngay trên. */}
              <div className="flex flex-col">
                <div className="flex flex-col gap-2.5 pb-3">
                  <label className="flex w-fit items-center gap-2.5 text-sm font-medium">
                    <Checkbox checked={emailOn} onCheckedChange={(next) => setEmailOn(next === true)} />
                    <Mail className="size-4 text-muted-foreground" />
                    Email
                  </label>
                  {emailOn && (
                    <div className="pl-7">
                      <RecipientChipsField
                        id="alert-emails"
                        value={emails}
                        onChange={setEmails}
                        suggestions={emailSuggestions}
                        placeholder="VD: nguyenvana@gmail.com"
                        addLabel="Thêm email"
                        invalid={submitted && emails.length === 0}
                      />
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-2.5 border-t border-border pt-3">
                  <label className="flex w-fit items-center gap-2.5 text-sm font-medium">
                    <Checkbox
                      checked={telegramOn}
                      onCheckedChange={(next) => setTelegramOn(next === true)}
                    />
                    <Send className="size-4 text-muted-foreground" />
                    Telegram
                  </label>
                  {telegramOn && (
                    <div className="flex flex-col gap-3 pl-7">
                      <RecipientChipsField
                        id="alert-chat-ids"
                        value={chatIds}
                        onChange={setChatIds}
                        suggestions={[]}
                        placeholder="VD: -1001234567890"
                        addLabel="Thêm nhóm"
                        invalid={submitted && chatIds.length === 0}
                      />
                      <FieldDescription>
                        Group ID của nhóm chat đã thêm bot vào — số âm với nhóm, dương với chat riêng.
                      </FieldDescription>
                      <Field data-invalid={(submitted && !!step2Errors.token) || undefined}>
                        <FieldLabel htmlFor="alert-bot-token" data-required>
                          Bot token
                        </FieldLabel>
                        <Input
                          id="alert-bot-token"
                          value={botToken}
                          onChange={(event) => setBotToken(event.target.value)}
                          placeholder="VD: 123456789:AAF-xxxxxxxxxxxxxxxxxxxx"
                          aria-invalid={(submitted && !!step2Errors.token) || undefined}
                        />
                        {submitted && step2Errors.token && <FieldError>{step2Errors.token}</FieldError>}
                      </Field>
                    </div>
                  )}
                </div>
              </div>
              {submitted && step2Errors.channels && <FieldError>{step2Errors.channels}</FieldError>}
            </FieldSet>

            <FieldDescription>
              Theo dõi <strong>{summaryMetrics}</strong> tại <strong>{summaryNodes}</strong>, kể cả các
              đơn vị con bên dưới.
            </FieldDescription>
          </FieldGroup>
        )}
        </div>

        <DialogFooter className="border-t-0 bg-transparent">
          {step === 2 && (
            <Button type="button" variant="outline" onClick={() => setStep(1)}>
              <ArrowLeft data-icon="inline-start" />
              Quay lại
            </Button>
          )}
          {step === 1 && (
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Hủy
            </Button>
          )}
          {step === 1 ? (
            <Button
              type="button"
              onClick={() => {
                setSubmitted(true)
                if (step1Valid) {
                  setSubmitted(false)
                  setStep(2)
                }
              }}
            >
              Tiếp tục
              <ArrowRight data-icon="inline-end" />
            </Button>
          ) : (
            <LoadingButton type="button" isPending={saveMutation.isPending} onClick={submit}>
              {group ? 'Lưu thay đổi' : 'Tạo quy tắc'}
            </LoadingButton>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
