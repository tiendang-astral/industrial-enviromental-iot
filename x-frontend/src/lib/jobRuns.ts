import type { ExternalSourceJobRun } from '@/types/externalSource'

export interface RunBucket {
  hourStart: Date
  rows: number
  failed: number
}

/**
 * Gom lượt chạy thành từng giờ. Backend chỉ trả danh sách lần chạy, không trả sẵn chuỗi thời
 * gian — mà cả khối job lẫn bảng sức khỏe trong modal đều cần đúng phép gom này, nên nó nằm đây
 * thay vì được viết lại ở hai nơi.
 */
export function bucketRunsByHour(runs: ExternalSourceJobRun[], hours: number): RunBucket[] {
  const now = new Date()
  now.setMinutes(0, 0, 0)

  const buckets: RunBucket[] = Array.from({ length: hours }, (_, index) => ({
    hourStart: new Date(now.getTime() - (hours - 1 - index) * 3_600_000),
    rows: 0,
    failed: 0,
  }))

  runs.forEach((run) => {
    const started = new Date(run.startedAt)
    started.setMinutes(0, 0, 0)
    const bucket = buckets.find((item) => item.hourStart.getTime() === started.getTime())
    if (!bucket) return
    bucket.rows += run.rowCount
    if (run.status === 'FAILED') bucket.failed += 1
  })

  return buckets
}

/** Số dòng đọc về mỗi giờ, tính trên các giờ thực sự có lượt chạy — giờ trống kéo tụt trung bình. */
export function rowsPerHour(buckets: RunBucket[]): number | null {
  const active = buckets.filter((bucket) => bucket.rows > 0)
  if (active.length === 0) return null
  return Math.round(active.reduce((total, bucket) => total + bucket.rows, 0) / active.length)
}
