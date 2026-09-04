import { useEffect, useRef } from 'react'
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

  return (
    <div ref={wrapperRef} className={className ?? 'min-h-0 min-w-0 flex-1'}>
      <ReactECharts ref={chartRef} option={option} style={{ height: '100%', width: '100%' }} notMerge />
    </div>
  )
}
