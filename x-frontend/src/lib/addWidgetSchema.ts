import { Gauge, LineChart, ListChecks, Wifi } from 'lucide-react'
import { z } from 'zod'
import type { WidgetType } from '@/types/dashboard'

export const addWidgetSchema = z
  .object({
    type: z.enum(['VALUE', 'LINE', 'DEVICE_LIST', 'DEVICES_ONLINE']),
    datastreamId: z.string().optional(),
    title: z.string().min(1, 'Vui lòng nhập tên widget'),
  })
  .refine((data) => (data.type !== 'VALUE' && data.type !== 'LINE') || !!data.datastreamId, {
    message: 'Vui lòng chọn datastream',
    path: ['datastreamId'],
  })

export type AddWidgetFormValues = z.infer<typeof addWidgetSchema>

export const WIDGET_TYPE_LABELS: Record<WidgetType, string> = {
  VALUE: 'Giá trị',
  LINE: 'Biểu đồ',
  DEVICE_LIST: 'Danh sách thiết bị',
  DEVICES_ONLINE: 'Thiết bị online',
}

export interface WidgetTypeOption {
  type: WidgetType
  label: string
  description: string
  icon: typeof Gauge
}

export const WIDGET_TYPE_OPTIONS: WidgetTypeOption[] = [
  { type: 'VALUE', label: 'Giá trị', description: 'Hiện giá trị mới nhất của 1 datastream', icon: Gauge },
  { type: 'LINE', label: 'Biểu đồ', description: 'Biểu đồ đường theo thời gian của 1 datastream', icon: LineChart },
  { type: 'DEVICE_LIST', label: 'Danh sách thiết bị', description: 'Liệt kê gateway trong node, kèm trạng thái online', icon: ListChecks },
  { type: 'DEVICES_ONLINE', label: 'Thiết bị online', description: 'Số lượng online/offline, xem nhanh thiết bị offline', icon: Wifi },
]

export const WIDGET_TYPES: WidgetType[] = ['VALUE', 'LINE', 'DEVICE_LIST', 'DEVICES_ONLINE']

export function bindsDatastream(type: WidgetType): boolean {
  return type === 'VALUE' || type === 'LINE'
}
