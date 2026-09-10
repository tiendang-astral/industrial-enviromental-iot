import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import ReactECharts, { type EChartsOption } from 'echarts-for-react'

interface ResizableChartProps {
  option: EChartsOption
  className?: string
  /** Bề ngang thực tế của khung — người gọi dùng để quyết định vẽ bao nhiêu điểm. */
  onWidthChange?: (width: number) => void
}

/**
 * echarts-for-react không tự resize khi container đổi kích thước qua CSS/transform
 * (chỉ nghe window resize) — widget trong react-grid-layout resize bằng cách RGL đổi
 * width/height trực tiếp trên DOM, không bắn window resize, nên chart bị tràn/không
 * co lại khi thu nhỏ widget. Dùng ResizeObserver gọi resize() thủ công.
 */
export function ResizableChart({ option, className, onWidthChange }: ResizableChartProps) {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<ReactECharts>(null)
  const [measured, setMeasured] = useState(false)

  /*
   * Đo bề ngang TRƯỚC khi tạo biểu đồ, trong cùng lượt render chưa kịp vẽ lên màn hình.
   *
   * Trước đây biểu đồ tạo ngay với bề ngang giả định của người gọi, rồi ResizeObserver mới báo bề
   * ngang thật và người gọi dựng lại option với số điểm khác. Nếu lượt báo đó trễ một frame, người
   * dùng thấy ECharts nội suy từ bộ điểm cũ sang bộ điểm mới — trên trục category điểm thứ i chạy
   * sang vị trí mới nên đường vẽ xoắn thành vòng rồi mới duỗi ra.
   *
   * `clientWidth` chứ không `getBoundingClientRect`: hộp thoại mở bằng hiệu ứng phóng 95% → 100%,
   * số đo có tính transform sẽ ra bề ngang hụt đúng lúc cần chính xác nhất.
   */
  useLayoutEffect(() => {
    const node = wrapperRef.current
    if (node) onWidthChange?.(node.clientWidth)
    setMeasured(true)
    // Chỉ đo một lần lúc mount; về sau ResizeObserver lo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const node = wrapperRef.current
    if (!node) return
    const observer = new ResizeObserver((entries) => {
      chartRef.current?.getEchartsInstance().resize()
      onWidthChange?.(entries[0].contentRect.width)
    })
    observer.observe(node)
    return () => observer.disconnect()
  }, [onWidthChange])

  /*
   * Tắt animation: biểu đồ giám sát phải hiện ĐÚNG số liệu ngay khi mở, không có pha "đang chạy
   * vào". Animation cập nhật của ECharts còn tệ hơn với dữ liệu realtime — mỗi lần số đo mới làm
   * đổi số điểm sau khi thưa bớt là đường lại xoắn một nhịp. Option của người gọi vẫn bật lại được.
   */
  const staticOption = useMemo(() => ({ animation: false, ...option }), [option])

  return (
    <div ref={wrapperRef} className={className ?? 'min-h-0 min-w-0 flex-1'}>
      {measured && (
        <ReactECharts ref={chartRef} option={staticOption} style={{ height: '100%', width: '100%' }} notMerge />
      )}
    </div>
  )
}
