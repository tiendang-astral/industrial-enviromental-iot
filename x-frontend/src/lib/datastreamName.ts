/**
 * Tên kênh unique theo (đơn vị, tên) ở DB. Hai job cùng tên trong một nguồn sẽ sinh ra cùng một
 * tên gợi ý, nên phải né sẵn — đưa người dùng một giá trị điền sẵn mà bấm Lưu là lỗi thì tệ hơn
 * là để trống.
 */
export function uniqueName(base: string, taken: string[]): string {
  const lower = taken.map((name) => name.toLowerCase())
  if (!lower.includes(base.toLowerCase())) return base
  for (let index = 2; index < 100; index += 1) {
    const candidate = `${base} (${index})`
    if (!lower.includes(candidate.toLowerCase())) return candidate
  }
  return base
}
