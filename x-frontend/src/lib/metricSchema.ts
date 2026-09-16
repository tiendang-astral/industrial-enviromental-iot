import { z } from 'zod'
import { METRIC_COLORS } from '@/types/metric'

/**
 * Một schema cho cả hai loại chỉ số. Chỉ số hệ thống chỉ mở ô ngưỡng nên `code`/`name`/`unit`/màu
 * không validate lúc đó — dùng chung schema thay vì tách đôi để `formState.errors` không bị thu
 * hẹp thành kiểu union (cùng lý do với `tenantUserSchema`).
 *
 * Ngưỡng nhập bằng chuỗi: `<input type="number">` rỗng trả về `''`, ép sang number sớm sẽ thành
 * `NaN` và nuốt mất thông báo "chưa nhập".
 */
export function metricSchema(isSystem: boolean) {
  return z
    .object({
      code: z.string().trim().optional(),
      name: z.string().trim().optional(),
      unit: z.string().trim().optional(),
      color: z.enum(METRIC_COLORS).optional(),
      minValue: z.string().trim(),
      maxValue: z.string().trim(),
    })
    .superRefine((values, ctx) => {
      if (!isSystem) {
        const code = values.code ?? ''
        if (!code) {
          ctx.addIssue({ code: 'custom', path: ['code'], message: 'Vui lòng nhập mã chỉ số' })
        } else if (!/^[a-z][a-z0-9_]*$/.test(code)) {
          ctx.addIssue({
            code: 'custom',
            path: ['code'],
            message: 'Bắt đầu bằng chữ thường, chỉ dùng chữ thường, số và dấu _',
          })
        }
        if (!(values.name ?? '')) {
          ctx.addIssue({ code: 'custom', path: ['name'], message: 'Vui lòng nhập tên chỉ số' })
        }
        if (!(values.unit ?? '')) {
          ctx.addIssue({ code: 'custom', path: ['unit'], message: 'Vui lòng nhập đơn vị' })
        }
        if (!values.color) {
          ctx.addIssue({ code: 'custom', path: ['color'], message: 'Vui lòng chọn màu' })
        }
      }

      // Ngưỡng luôn đi theo cặp: một đầu thì không đánh giá được giá trị nằm trong hay ngoài.
      const hasMin = values.minValue !== ''
      const hasMax = values.maxValue !== ''
      if (hasMin !== hasMax) {
        ctx.addIssue({
          code: 'custom',
          path: [hasMin ? 'maxValue' : 'minValue'],
          message: 'Nhập cả hai ngưỡng, hoặc để trống cả hai',
        })
        return
      }
      if (hasMin && hasMax && Number(values.minValue) >= Number(values.maxValue)) {
        ctx.addIssue({
          code: 'custom',
          path: ['maxValue'],
          message: 'Ngưỡng trên phải lớn hơn ngưỡng dưới',
        })
      }
    })
}

export type MetricFormValues = z.infer<ReturnType<typeof metricSchema>>
