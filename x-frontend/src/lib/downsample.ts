import type { ReadingPoint } from '@/types/telemetry'

/**
 * Giảm số điểm bằng LTTB (Largest-Triangle-Three-Buckets).
 *
 * Không lấy mẫu cách đều và cũng không lấy trung bình: cả hai cách đó đều xoá mất đỉnh và đáy —
 * đúng những chỗ người trực ca cần thấy ở dữ liệu môi trường. LTTB chia dãy thành N khoảng rồi
 * mỗi khoảng giữ lại đúng điểm tạo ra tam giác lớn nhất với điểm đã chọn trước đó và trọng tâm
 * khoảng sau, nên đường vẽ ra bám sát hình dạng gốc kể cả khi bỏ đi 95% số điểm.
 *
 * Luôn giữ nguyên điểm đầu và điểm cuối để hai đầu biểu đồ không bị cụt.
 */
export function downsampleReadings(points: ReadingPoint[], maxPoints: number): ReadingPoint[] {
  if (maxPoints < 3 || points.length <= maxPoints) return points

  const time = points.map((point) => new Date(point.measuredAt).getTime())
  const sampled: ReadingPoint[] = [points[0]]
  // Trừ 2 đầu cố định, phần giữa chia đều thành maxPoints - 2 khoảng.
  const bucketSize = (points.length - 2) / (maxPoints - 2)
  let previous = 0

  for (let bucket = 0; bucket < maxPoints - 2; bucket += 1) {
    const nextStart = Math.floor((bucket + 1) * bucketSize) + 1
    const nextEnd = Math.min(Math.floor((bucket + 2) * bucketSize) + 1, points.length - 1)

    // Trọng tâm khoảng kế tiếp — đỉnh thứ ba của tam giác.
    let avgTime = 0
    let avgValue = 0
    for (let i = nextStart; i < nextEnd; i += 1) {
      avgTime += time[i]
      avgValue += points[i].value
    }
    const nextCount = Math.max(nextEnd - nextStart, 1)
    avgTime /= nextCount
    avgValue /= nextCount

    const rangeStart = Math.floor(bucket * bucketSize) + 1
    const rangeEnd = Math.floor((bucket + 1) * bucketSize) + 1
    let bestArea = -1
    let bestIndex = rangeStart

    for (let i = rangeStart; i < rangeEnd && i < points.length - 1; i += 1) {
      const area = Math.abs(
        (time[previous] - avgTime) * (points[i].value - points[previous].value) -
          (time[previous] - time[i]) * (avgValue - points[previous].value)
      )
      if (area > bestArea) {
        bestArea = area
        bestIndex = i
      }
    }

    sampled.push(points[bestIndex])
    previous = bestIndex
  }

  sampled.push(points[points.length - 1])
  return sampled
}
