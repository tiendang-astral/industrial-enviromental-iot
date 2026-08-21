import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Activity, LayoutDashboard, Plus, RadioTower } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { EmptyState } from '@/components/patterns/EmptyState'
import { PageHeader } from '@/components/patterns/PageHeader'
import { GatewayFormDialog } from '@/components/devices/GatewayFormDialog'
import { GatewayPinFormDialog } from '@/components/devices/GatewayPinFormDialog'
import { GatewayPinsTable } from '@/components/devices/GatewayPinsTable'
import { useGatewaysQuery } from '@/queries/useGatewaysQuery'
import { useTenantNodesQuery } from '@/queries/useTenantNodesQuery'
import type { Gateway } from '@/types/gateway'

function GatewayCard({ gateway }: { gateway: Gateway }) {
  const [isAddPinOpen, setIsAddPinOpen] = useState(false)

  return (
    <Card>
      <CardHeader>
        <CardTitle>{gateway.name}</CardTitle>
        <CardDescription className="tabular">{gateway.macAddress}</CardDescription>
        <CardAction className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => setIsAddPinOpen(true)}>
            <Plus data-icon="inline-start" />
            Thêm pin
          </Button>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button size="sm" variant="ghost" className="size-8" asChild>
                <Link to={`/devices/${gateway.id}`}>
                  <Activity />
                  <span className="sr-only">Xem số liệu realtime của {gateway.name}</span>
                </Link>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Xem số liệu realtime</TooltipContent>
          </Tooltip>
        </CardAction>
      </CardHeader>

      <CardContent>
        <GatewayPinsTable gatewayId={gateway.id} />
      </CardContent>

      <GatewayPinFormDialog
        gatewayId={gateway.id}
        open={isAddPinOpen}
        onOpenChange={setIsAddPinOpen}
      />
    </Card>
  )
}

export default function SiteDetailPage() {
  const { siteId } = useParams()
  const tenantNodeId = Number(siteId)
  const { data: nodes } = useTenantNodesQuery()
  const site = nodes?.find((node) => node.id === tenantNodeId)
  const { data: gateways, isLoading } = useGatewaysQuery(tenantNodeId)
  const [isCreateOpen, setIsCreateOpen] = useState(false)

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={site?.name ?? 'Xưởng/Chuồng trại'}
        description="Gateway đặt tại đơn vị này và các chân tín hiệu đã khai báo trên từng gateway."
        backTo="/organization"
        backLabel="Tổ chức"
        actions={
          <>
            <Button variant="outline" asChild>
              <Link to={`/dashboard/${tenantNodeId}`}>
                <LayoutDashboard data-icon="inline-start" />
                Xem dashboard
              </Link>
            </Button>
            <Button onClick={() => setIsCreateOpen(true)}>
              <Plus data-icon="inline-start" />
              Thêm gateway
            </Button>
          </>
        }
      />

      {isLoading && <Skeleton className="h-64 w-full rounded-xl" />}

      {!isLoading && (gateways?.length ?? 0) === 0 && (
        <EmptyState
          icon={RadioTower}
          title="Chưa có gateway nào"
          description="Gateway là thiết bị gom tín hiệu cảm biến tại chỗ rồi đẩy lên hệ thống. Chưa có gateway thì đơn vị này chưa nhận được dữ liệu nào."
          action={
            <Button variant="outline" onClick={() => setIsCreateOpen(true)}>
              Thêm gateway đầu tiên
            </Button>
          }
        />
      )}

      {gateways?.map((gateway) => <GatewayCard key={gateway.id} gateway={gateway} />)}

      <GatewayFormDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        sites={site ? [{ id: site.id, name: site.name }] : []}
        gateway={null}
      />
    </div>
  )
}
