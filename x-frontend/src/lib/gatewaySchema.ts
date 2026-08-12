import { z } from 'zod'

export const createGatewaySchema = z.object({
  name: z.string().min(1, 'Vui lòng nhập tên gateway'),
  macAddress: z
    .string()
    .min(1, 'Vui lòng nhập MAC address')
    .regex(/^([0-9A-Fa-f]{2}[:-]){5}[0-9A-Fa-f]{2}$/, 'MAC address không đúng định dạng (VD: AA:BB:CC:DD:EE:FF)'),
})

export type CreateGatewayFormValues = z.infer<typeof createGatewaySchema>
