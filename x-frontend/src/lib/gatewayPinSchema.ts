import { z } from 'zod'

export const createGatewayPinSchema = z
  .object({
    direction: z.enum(['INPUT', 'OUTPUT']),
    type: z.enum(['AI', 'DI', 'DO', 'AO']),
    name: z.string().min(1, 'Vui lòng nhập tên pin'),
    metricId: z.string().optional(),
    pinNumber: z
      .string()
      .min(1, 'Vui lòng nhập số chân')
      .refine((v) => Number.isInteger(Number(v)) && Number(v) >= 1, 'Số chân phải là số nguyên >= 1'),
  })
  .refine((data) => data.direction !== 'INPUT' || !!data.metricId, {
    message: 'Pin INPUT bắt buộc chọn metric',
    path: ['metricId'],
  })

export type CreateGatewayPinFormValues = z.infer<typeof createGatewayPinSchema>

export const DIRECTION_TYPES: Record<'INPUT' | 'OUTPUT', Array<'AI' | 'DI' | 'DO' | 'AO'>> = {
  INPUT: ['AI', 'DI'],
  OUTPUT: ['DO', 'AO'],
}
