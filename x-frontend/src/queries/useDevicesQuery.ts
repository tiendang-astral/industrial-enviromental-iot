import { useQuery } from '@tanstack/react-query'
import { listDevices } from '@/services/deviceService'

const POLL_INTERVAL_MS = 30_000

/** Không có realtime event riêng cho online/offline gateway — polling theo CONVENTIONS.md. */
export function useDevicesQuery(tenantNodeId: number) {
  return useQuery({
    queryKey: ['devices', tenantNodeId],
    queryFn: () => listDevices(tenantNodeId),
    enabled: !!tenantNodeId,
    refetchInterval: POLL_INTERVAL_MS,
  })
}
