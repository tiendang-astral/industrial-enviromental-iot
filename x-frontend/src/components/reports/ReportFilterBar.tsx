import { useMemo, useState } from 'react'
import type { DateRange } from 'react-day-picker'
import { Download, FileBarChart } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Field, FieldLabel } from '@/components/ui/field'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { DateRangePicker } from '@/components/patterns/DateRangePicker'
import { LoadingButton } from '@/components/patterns/LoadingButton'
import { MultiSelect } from '@/components/patterns/MultiSelect'
import { TenantNodePicker } from '@/components/patterns/TenantNodePicker'
import { RANGE_PRESETS, defaultRange, rangeToInstants, validateRange } from '@/lib/reportRange'
import type { ExternalSource } from '@/types/externalSource'
import type { Gateway } from '@/types/gateway'
import type { Metric } from '@/types/metric'
import type { ReportFilter, ReportScope } from '@/types/report'
import type { TenantNode } from '@/types/tenantNode'

const SCOPE_META: Record<ReportScope, { label: string; placeholder: string; empty: string; missing: string }> = {
  source: {
    label: 'Nguồn dữ liệu',
    placeholder: 'Chọn nguồn',
    empty: 'Chưa có nguồn dữ liệu nào',
    missing: 'Chọn ít nhất một nguồn dữ liệu',
  },
  // "Thiết bị" chứ không phải "Gateway": đó là chữ dùng ở mục điều hướng và ở nhãn nhóm trong
  // báo cáo ("Thiết bị abcde"), để một thứ không mang hai tên trong cùng một màn hình.
  gateway: {
    label: 'Thiết bị',
    placeholder: 'Chọn thiết bị',
    empty: 'Chưa có thiết bị nào',
    missing: 'Chọn ít nhất một thiết bị',
  },
  metric: {
    label: 'Chỉ số',
    placeholder: 'Chọn chỉ số',
    empty: 'Chưa có chỉ số nào',
    missing: 'Chọn ít nhất một chỉ số',
  },
}

/** Bề rộng ô: vừa nội dung, nhưng có sàn để ô rỗng không co lại thành một mẩu và có trần để một
    lựa chọn dài không đẩy hai nút rớt xuống hàng dưới. */
const CONTROL_WIDTH = 'lg:w-auto lg:min-w-40 lg:max-w-56'

export function ReportFilterBar({
  nodes,
  metrics,
  gateways,
  sources,
  isLoading,
  isExporting,
  canDownload,
  onSubmit,
  onDownload,
}: {
  nodes: TenantNode[]
  metrics: Metric[]
  gateways: Gateway[]
  sources: ExternalSource[]
  isLoading: boolean
  isExporting: boolean
  /** Đã có kết quả trên màn hình để mà tải về. */
  canDownload: boolean
  onSubmit: (filter: ReportFilter) => void
  onDownload: () => void
}) {
  const [range, setRange] = useState<DateRange | undefined>(defaultRange)
  const [tenantNodeIds, setTenantNodeIds] = useState<number[]>([])
  const [scope, setScope] = useState<ReportScope | null>(null)
  /** Một danh sách id duy nhất — chiều nào đang chọn thì nó thuộc về chiều đó. */
  const [scopeIds, setScopeIds] = useState<number[]>([])

  const nodeNameById = useMemo(() => new Map(nodes.map((node) => [node.id, node.name])), [nodes])
  const scopeOptions = useMemo(() => {
    if (scope === 'gateway') {
      return gateways.map((g) => ({ value: g.id, label: g.name, hint: nodeNameById.get(g.tenantNodeId) }))
    }
    if (scope === 'source') {
      return sources.map((s) => ({ value: s.id, label: s.name, hint: nodeNameById.get(s.tenantNodeId) }))
    }
    if (scope === 'metric') {
      return metrics.map((m) => ({ value: m.id, label: m.name, hint: m.unit }))
    }
    return []
  }, [scope, gateways, sources, metrics, nodeNameById])

  /**
   * Nút "Tạo báo cáo" khoá cho tới khi đủ điều kiện, thay vì cho bấm rồi báo lỗi: mọi ô đều bắt
   * buộc và đã có dấu `*`, nên một dòng chữ đỏ chỉ nhắc lại thứ người dùng vừa thấy.
   */
  const isValid =
    validateRange(range) === null &&
    tenantNodeIds.length > 0 &&
    scope !== null &&
    scopeIds.length > 0

  /** Đổi chiều thì xoá lựa chọn cũ — id gateway vô nghĩa trong danh sách chỉ số. */
  function changeScope(next: string) {
    setScope(next as ReportScope)
    setScopeIds([])
  }

  function submit() {
    const instants = rangeToInstants(range)
    if (!isValid || !instants || scope === null) return
    onSubmit({
      ...instants,
      tenantNodeIds,
      scope,
      gatewayIds: scope === 'gateway' ? scopeIds : [],
      externalSourceIds: scope === 'source' ? scopeIds : [],
      metricIds: scope === 'metric' ? scopeIds : [],
    })
  }

  return (
    <Card className="py-0 print:hidden">
      {/* Ô rộng vừa nội dung (`lg:w-fit`) và cả hàng `lg:flex-nowrap` nên mọi thứ nằm đúng MỘT
          hàng; hai nút `shrink-0` + `ms-auto` luôn dính mép phải. */}
      <CardContent className="flex flex-col gap-4 px-5 py-4 lg:flex-row lg:flex-nowrap lg:items-end">
        <Field className="w-full lg:w-fit lg:shrink-0">
          <FieldLabel htmlFor="report-range" data-required>
            Khoảng thời gian
          </FieldLabel>
          <DateRangePicker
            id="report-range"
            value={range}
            onChange={setRange}
            presets={RANGE_PRESETS}
            className={CONTROL_WIDTH}
          />
        </Field>

        <Field className="w-full lg:w-fit">
          <FieldLabel htmlFor="report-nodes" data-required>
            Đơn vị
          </FieldLabel>
          <TenantNodePicker
            id="report-nodes"
            mode="multiple"
            nodes={nodes}
            value={tenantNodeIds}
            onChange={setTenantNodeIds}
            placeholder="Chọn đơn vị"
            className={CONTROL_WIDTH}
          />
        </Field>

        <Field className="w-full lg:w-fit">
          <FieldLabel htmlFor="report-scope" data-required>
            Lọc theo
          </FieldLabel>
          <Select value={scope ?? undefined} onValueChange={changeScope}>
            <SelectTrigger
              id="report-scope"
              className={`w-full ${CONTROL_WIDTH}`}
            >
              <SelectValue placeholder="Chọn" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="source">{SCOPE_META.source.label}</SelectItem>
                <SelectItem value="gateway">{SCOPE_META.gateway.label}</SelectItem>
                <SelectItem value="metric">{SCOPE_META.metric.label}</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </Field>

        {/* Chỉ có nghĩa khi đã chọn chiều lọc — hiện sẵn một ô rỗng không bấm được thì người dùng
            phải tự đoán vì sao nó vô dụng. */}
        {scope && (
          <Field className="w-full lg:w-fit">
            <FieldLabel htmlFor="report-scope-values" data-required>
              {SCOPE_META[scope].label}
            </FieldLabel>
            <MultiSelect
              id="report-scope-values"
              options={scopeOptions}
              value={scopeIds}
              onChange={setScopeIds}
              placeholder={SCOPE_META[scope].placeholder}
              emptyLabel={SCOPE_META[scope].empty}
              className={CONTROL_WIDTH}
            />
          </Field>
        )}

        {/* `ms-auto` giữ hai nút luôn dính mép phải dù thêm/bớt ô lọc ở giữa. */}
        <div className="flex shrink-0 items-center gap-2 lg:ms-auto">
          {/* Chỉ hiện khi đã có báo cáo trên màn hình — một nút xám không bấm được ngay từ lúc mở
              trang bắt người dùng tự đoán phải làm gì để nó sống dậy. */}
          {canDownload && (
            <LoadingButton variant="outline" isPending={isExporting} onClick={onDownload}>
              <Download data-icon="inline-start" />
              Tải PDF
            </LoadingButton>
          )}
          <LoadingButton isPending={isLoading} disabled={!isValid} onClick={submit}>
            <FileBarChart data-icon="inline-start" />
            Tạo báo cáo
          </LoadingButton>
        </div>
      </CardContent>

    </Card>
  )
}
