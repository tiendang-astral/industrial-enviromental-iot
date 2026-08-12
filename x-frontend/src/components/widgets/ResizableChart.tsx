import { useEffect, useRef } from 'react'
import ReactECharts, { type EChartsOption } from 'echarts-for-react'

interface ResizableChartProps {
  option: EChartsOption
  className?: string
}

/**
 * echarts-for-react không tự resize khi container đổi kích thước qua CSS/transform
 * (chỉ nghe window resize) — widget trong react-grid-layout resize bằng cách RGL đổi
 * width/height trực tiếp trên DOM, không bắn window resize, nên chart bị tràn/không
 * co lại khi thu nhỏ widget. Dùng ResizeObserver gọi resize() thủ công.
 */
export function ResizableChart({ option, className }: ResizableChartProps) {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<ReactECharts>(null)

  useEffect(() => {
    const node = wrapperRef.current
    if (!node) return
    const observer = new ResizeObserver(() => {
      chartRef.current?.getEchartsInstance().resize()
    })
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  return (
    <div ref={wrapperRef} className={className ?? 'min-h-0 min-w-0 flex-1'}>
      <ReactECharts ref={chartRef} option={option} style={{ height: '100%', width: '100%' }} notMerge />
    </div>
  )
}
