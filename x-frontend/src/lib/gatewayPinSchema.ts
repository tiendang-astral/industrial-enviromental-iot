import { z } from 'zod'
import type { PinDirection, PinType } from '@/types/gatewayPin'

/**
 * Loại pin đã quy định chiều tín hiệu — AI/DI luôn là đầu vào, DO/AO luôn là đầu ra. Hỏi người
 * dùng cả hai thứ là bắt họ nhập lại một thông tin hệ thống đã biết, và mở đường cho tổ hợp sai.
 */
export const PIN_TYPE_DIRECTION: Record<PinType, PinDirection> = {
  AI: 'INPUT',
  DI: 'INPUT',
  DO: 'OUTPUT',
  AO: 'OUTPUT',
}

export const createGatewayPinSchema = z
  .object({
    type: z.enum(['AI', 'DI', 'DO', 'AO']),
    name: z.string().min(1, 'Vui lòng nhập tên pin'),
    metricId: z.string().optional(),
    pinNumber: z
      .string()
      .min(1, 'Vui lòng nhập số chân')
      .refine((v) => Number.isInteger(Number(v)) && Number(v) >= 1, 'Số chân phải là số nguyên >= 1'),
  })
  .refine((data) => PIN_TYPE_DIRECTION[data.type] !== 'INPUT' || !!data.metricId, {
    message: 'Chân đầu vào bắt buộc chọn đơn vị',
    path: ['metricId'],
  })

export type CreateGatewayPinFormValues = z.infer<typeof createGatewayPinSchema>
