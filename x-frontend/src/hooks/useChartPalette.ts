import { useMemo } from 'react'
import { resolveChartPalette } from '@/lib/echarts'
import { useThemeStore } from '@/stores/useThemeStore'

/** Resolve lại token màu biểu đồ mỗi khi đổi sáng/tối — canvas không tự cập nhật theo CSS. */
export function useChartPalette() {
  const theme = useThemeStore((state) => state.theme)
  return useMemo(() => resolveChartPalette(), [theme])
}
