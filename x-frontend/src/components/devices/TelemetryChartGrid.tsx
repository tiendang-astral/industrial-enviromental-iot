import { ChannelChartCard } from '@/components/devices/ChannelChartCard'
import { Skeleton } from '@/components/ui/skeleton'
import type { PinView } from '@/lib/gatewayPinView'

export function TelemetryChartGridSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 3 }).map((_, index) => (
        <Skeleton key={index} className="h-72 w-full rounded-xl" />
      ))}
    </div>
  )
}

/** Mỗi kênh một biểu đồ riêng: đơn vị khác nhau (°C, %, ppm, %LEL) nên chồng chung trục Y là vô nghĩa. */
export function TelemetryChartGrid({ views }: { views: PinView[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {views.map((view) => (
        <ChannelChartCard key={view.pin.id} view={view} />
      ))}
    </div>
  )
}
