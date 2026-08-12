import { z } from 'zod'

export const nodeNameSchema = z.object({
  name: z.string().min(1, 'Vui lòng nhập tên'),
})

export type NodeNameFormValues = z.infer<typeof nodeNameSchema>
