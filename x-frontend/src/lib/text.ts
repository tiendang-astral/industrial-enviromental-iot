/**
 * Viết hoa chữ cái đầu cho giá trị hiển thị. KHÔNG dùng cho mã định danh (tên cột, mã metric,
 * biểu thức cron) — chúng phải giữ nguyên chữ như trong cơ sở dữ liệu.
 */
export function sentenceCase(value: string) {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : value
}
