import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Link, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { ArrowLeft, LayoutDashboard, Plus } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { getApiErrorMessage } from '@/lib/apiError'
import { createGatewaySchema, type CreateGatewayFormValues } from '@/lib/gatewaySchema'
import { createGatewayPinSchema, DIRECTION_TYPES, type CreateGatewayPinFormValues } from '@/lib/gatewayPinSchema'
import { useCreateGatewayMutation } from '@/queries/useCreateGatewayMutation'
import { useCreateGatewayPinMutation } from '@/queries/useCreateGatewayPinMutation'
import { useGatewayPinsQuery } from '@/queries/useGatewayPinsQuery'
import { useGatewaysQuery } from '@/queries/useGatewaysQuery'
import { useMetricsQuery } from '@/queries/useMetricsQuery'
import { useTenantNodesQuery } from '@/queries/useTenantNodesQuery'
import { useUpdateGatewayPinMutation } from '@/queries/useUpdateGatewayPinMutation'
import type { Gateway } from '@/types/gateway'
import type { PinDirection } from '@/types/gatewayPin'

const selectClassName =
  'h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50'

export default function SiteDetailPage() {
  const { siteId } = useParams()
  const tenantNodeId = Number(siteId)
  const { data: nodes } = useTenantNodesQuery()
  const site = nodes?.find((n) => n.id === tenantNodeId)
  const { data: gateways, isLoading } = useGatewaysQuery(tenantNodeId)
  const [isCreateOpen, setIsCreateOpen] = useState(false)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="size-7" asChild>
            <Link to="/organization">
              <ArrowLeft className="size-4" />
            </Link>
          </Button>
          <h2 className="text-lg font-semibold">{site?.name ?? 'Site'}</h2>
        </div>
        <Button size="sm" variant="outline" asChild>
          <Link to={`/dashboard/${tenantNodeId}`}>
            <LayoutDashboard />
            Xem Dashboard
          </Link>
        </Button>
      </div>

      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground">Gateway</h3>
        <Button size="sm" onClick={() => setIsCreateOpen(true)}>
          <Plus />
          Thêm gateway
        </Button>
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Đang tải...</p>}
      {!isLoading && gateways?.length === 0 && (
        <p className="text-sm text-muted-foreground">Chưa có gateway nào</p>
      )}

      <div className="space-y-4">
        {gateways?.map((gateway) => (
          <GatewayCard key={gateway.id} gateway={gateway} />
        ))}
      </div>

      <CreateGatewayDialog tenantNodeId={tenantNodeId} open={isCreateOpen} onOpenChange={setIsCreateOpen} />
    </div>
  )
}

function GatewayCard({ gateway }: { gateway: Gateway }) {
  const { data: pins, isLoading } = useGatewayPinsQuery(gateway.id)
  const { data: metrics } = useMetricsQuery()
  const updatePinMutation = useUpdateGatewayPinMutation(gateway.id)
  const [isCreatePinOpen, setIsCreatePinOpen] = useState(false)

  function metricLabel(metricId: number | null) {
    if (metricId == null) return '—'
    const metric = metrics?.find((m) => m.id === metricId)
    return metric ? `${metric.name} (${metric.unit})` : `#${metricId}`
  }

  function toggleEnabled(pinId: number, enabled: boolean) {
    updatePinMutation.mutate(
      { pinId, payload: { enabled: !enabled } },
      {
        onError: (error) => toast.error(getApiErrorMessage(error, 'Cập nhật pin thất bại')),
      }
    )
  }

  return (
    <div className="rounded-xl border border-border p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-medium">{gateway.name}</p>
          <p className="text-xs text-muted-foreground">{gateway.macAddress}</p>
        </div>
        <Button size="sm" variant="outline" onClick={() => setIsCreatePinOpen(true)}>
          <Plus />
          Thêm pin
        </Button>
      </div>

      <Table className="mt-3">
        <TableHeader>
          <TableRow>
            <TableHead>Tên</TableHead>
            <TableHead>Direction/Type</TableHead>
            <TableHead>Chân</TableHead>
            <TableHead>Metric</TableHead>
            <TableHead>Trạng thái</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-muted-foreground">
                Đang tải...
              </TableCell>
            </TableRow>
          )}
          {!isLoading && pins?.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-muted-foreground">
                Chưa có pin nào
              </TableCell>
            </TableRow>
          )}
          {pins?.map((pin) => (
            <TableRow key={pin.id}>
              <TableCell className="font-medium">{pin.name}</TableCell>
              <TableCell>
                {pin.direction} / {pin.type}
              </TableCell>
              <TableCell>{pin.pinNumber}</TableCell>
              <TableCell>{metricLabel(pin.metricId)}</TableCell>
              <TableCell>
                <Badge
                  variant={pin.enabled ? 'default' : 'outline'}
                  className="cursor-pointer"
                  onClick={() => toggleEnabled(pin.id, pin.enabled)}
                >
                  {pin.enabled ? 'Bật' : 'Tắt'}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <CreateGatewayPinDialog
        gatewayId={gateway.id}
        open={isCreatePinOpen}
        onOpenChange={setIsCreatePinOpen}
      />
    </div>
  )
}

function CreateGatewayDialog({
  tenantNodeId,
  open,
  onOpenChange,
}: {
  tenantNodeId: number
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const createMutation = useCreateGatewayMutation()
  const form = useForm<CreateGatewayFormValues>({
    resolver: zodResolver(createGatewaySchema),
    defaultValues: { name: '', macAddress: '' },
  })

  function onSubmit(values: CreateGatewayFormValues) {
    createMutation.mutate(
      { tenantNodeId, name: values.name, macAddress: values.macAddress },
      {
        onSuccess: () => {
          form.reset()
          onOpenChange(false)
          toast.success('Tạo gateway thành công')
        },
        onError: (error) => {
          toast.error(getApiErrorMessage(error, 'Tạo gateway thất bại'))
        },
      }
    )
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) form.reset()
        onOpenChange(next)
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Thêm gateway</DialogTitle>
          <DialogDescription>Gateway sẽ được gán vào site hiện tại.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tên gateway</FormLabel>
                  <FormControl>
                    <Input autoFocus {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="macAddress"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>MAC address</FormLabel>
                  <FormControl>
                    <Input placeholder="AA:BB:CC:DD:EE:FF" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Đang tạo...' : 'Tạo'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

function CreateGatewayPinDialog({
  gatewayId,
  open,
  onOpenChange,
}: {
  gatewayId: number
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const createMutation = useCreateGatewayPinMutation(gatewayId)
  const { data: metrics } = useMetricsQuery()
  const form = useForm<CreateGatewayPinFormValues>({
    resolver: zodResolver(createGatewayPinSchema),
    defaultValues: { direction: 'INPUT', type: 'AI', name: '', metricId: '', pinNumber: '1' },
  })
  const direction = form.watch('direction') as PinDirection

  function onSubmit(values: CreateGatewayPinFormValues) {
    createMutation.mutate(
      {
        direction: values.direction,
        type: values.type,
        name: values.name,
        metricId: values.direction === 'INPUT' && values.metricId ? Number(values.metricId) : null,
        pinNumber: Number(values.pinNumber),
      },
      {
        onSuccess: () => {
          form.reset()
          onOpenChange(false)
          toast.success('Tạo pin thành công')
        },
        onError: (error) => {
          toast.error(getApiErrorMessage(error, 'Tạo pin thất bại'))
        },
      }
    )
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) form.reset()
        onOpenChange(next)
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Thêm pin</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="direction"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Direction</FormLabel>
                    <FormControl>
                      <select
                        className={selectClassName}
                        {...field}
                        onChange={(e) => {
                          const nextDirection = e.target.value as PinDirection
                          field.onChange(nextDirection)
                          form.setValue('type', DIRECTION_TYPES[nextDirection][0])
                        }}
                      >
                        <option value="INPUT">INPUT</option>
                        <option value="OUTPUT">OUTPUT</option>
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <FormControl>
                      <select className={selectClassName} {...field}>
                        {DIRECTION_TYPES[direction].map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tên pin</FormLabel>
                  <FormControl>
                    <Input autoFocus {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {direction === 'INPUT' && (
              <FormField
                control={form.control}
                name="metricId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Metric</FormLabel>
                    <FormControl>
                      <select className={selectClassName} {...field}>
                        <option value="">-- Chọn metric --</option>
                        {metrics?.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.name} ({m.unit})
                          </option>
                        ))}
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            <FormField
              control={form.control}
              name="pinNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Số chân</FormLabel>
                  <FormControl>
                    <Input type="number" min={1} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Đang tạo...' : 'Tạo'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
