import { BellPlus, MoreHorizontal, Pencil, Power, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { DataTable, type DataTableColumn } from '@/components/patterns/DataTable'
import { EmptyState } from '@/components/patterns/EmptyState'
import { EnumBadge } from '@/components/patterns/EnumBadge'
import { StatusBadge } from '@/components/patterns/StatusBadge'
import { formatConditions, formatDuration } from '@/lib/alertConditions'
import { sourceTypeLabel } from '@/lib/alertPresets'
import type { AlertRuleGroup } from '@/types/alert'
import type { Metric } from '@/types/metric'
import type { TenantNode } from '@/types/tenantNode'

export function AlertRuleGroupsTable({
  groups,
  nodes,
  metrics,
  isLoading,
  onEdit,
  onToggle,
  onDelete,
}: {
  groups: AlertRuleGroup[] | undefined
  nodes: TenantNode[]
  metrics: Metric[]
  isLoading: boolean
  onEdit: (group: AlertRuleGroup) => void
  onToggle: (group: AlertRuleGroup) => void
  onDelete: (group: AlertRuleGroup) => void
}) {
  const nodeName = (id: number) => nodes.find((node) => node.id === id)?.name ?? `#${id}`
  const metricName = (id: number) => metrics.find((metric) => metric.id === id)?.name ?? `#${id}`

  const columns: DataTableColumn<AlertRuleGroup>[] = [
    {
      key: 'name',
      header: 'Quy tắc',
      filter: { type: 'text', placeholder: 'Tìm theo tên', getValue: (group) => group.name },
      cell: (group) => (
        <div className="flex flex-col gap-0.5">
          <span className="font-medium">{group.name}</span>
          <span className="text-[12.5px] text-muted-foreground">
            {group.ruleCount} theo dõi · {sourceTypeLabel(group.sourceType)}
          </span>
        </div>
      ),
    },
    {
      key: 'nodes',
      header: 'Tổ chức',
      cell: (group) => (
        <div className="flex flex-wrap gap-1">
          {group.tenantNodeIds.slice(0, 2).map((id) => (
            <Badge key={id} variant="outline" className="font-normal">
              {nodeName(id)}
            </Badge>
          ))}
          {group.tenantNodeIds.length > 2 && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="outline" className="font-normal">
                  +{group.tenantNodeIds.length - 2}
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                {group.tenantNodeIds.slice(2).map(nodeName).join(', ')}
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      ),
    },
    {
      key: 'metrics',
      header: 'Chỉ số & ngưỡng',
      cell: (group) => (
        <div className="flex flex-col gap-1">
          {group.metricIds.map((metricId) => {
            // Mọi rule con của cùng chỉ số có cấu hình giống nhau, lấy dòng đầu là đủ đại diện.
            const rule = group.rules.find((item) => item.metricId === metricId)
            return (
              <div key={metricId} className="flex items-center gap-2">
                <EnumBadge>{metricName(metricId)}</EnumBadge>
                <span className="tabular font-mono text-[12.5px]">
                  {formatConditions(rule?.conditions, rule?.metricUnit)}
                </span>
                <span className="text-[12.5px] text-muted-foreground">
                  {formatDuration(rule?.durationSeconds ?? 0)}
                </span>
              </div>
            )
          })}
        </div>
      ),
    },
    {
      key: 'severity',
      header: 'Mức độ',
      filter: {
        type: 'select',
        placeholder: 'Mọi mức',
        getValue: (group) => group.severity,
        options: [
          { value: 'WARNING', label: 'Cảnh báo' },
          { value: 'CRITICAL', label: 'Nguy hiểm' },
        ],
      },
      cell: (group) => <StatusBadge status={group.severity} />,
    },
    {
      key: 'channels',
      header: 'Kênh nhận',
      cell: (group) => (
        <div className="flex flex-wrap gap-1">
          {group.channels.length === 0 ? (
            <span className="text-muted-foreground">—</span>
          ) : (
            group.channels.map((channel) => (
              <Badge key={channel.id} variant="outline" className="font-normal">
                {channel.channelType === 'EMAIL' ? 'Email' : 'Telegram'} · {channel.address}
              </Badge>
            ))
          )}
        </div>
      ),
    },
    {
      key: 'enabled',
      header: 'Trạng thái',
      filter: {
        type: 'select',
        placeholder: 'Tất cả',
        getValue: (group) => (group.enabled ? 'ENABLED' : 'DISABLED'),
        options: [
          { value: 'ENABLED', label: 'Đang bật' },
          { value: 'DISABLED', label: 'Đã tắt' },
        ],
      },
      cell: (group) => <StatusBadge status={group.enabled ? 'ENABLED' : 'DISABLED'} />,
    },
    {
      key: 'actions',
      header: '',
      headerClassName: 'w-12',
      cell: (group) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="size-8 text-muted-foreground">
              <MoreHorizontal />
              <span className="sr-only">Tác vụ cho quy tắc {group.name}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => onEdit(group)}>
              <Pencil />
              Sửa quy tắc
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onToggle(group)}>
              <Power />
              {group.enabled ? 'Tắt quy tắc' : 'Bật quy tắc'}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onSelect={() => onDelete(group)}>
              <Trash2 />
              Xóa quy tắc
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ]

  return (
    <DataTable
      columns={columns}
      rows={groups}
      getRowId={(group) => group.id}
      isLoading={isLoading}
      pageSize={20}
      empty={
        <EmptyState
          icon={BellPlus}
          title="Chưa có quy tắc cảnh báo nào"
          description="Tạo quy tắc để hệ thống tự theo dõi ngưỡng và báo qua Email hoặc Telegram."
        />
      }
    />
  )
}
