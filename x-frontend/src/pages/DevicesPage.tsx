import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { Eye, Pencil, Plus, Router, Trash2 } from 'lucide-react'
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
import { nodeNameSchema, type NodeNameFormValues } from '@/lib/tenantNodeSchema'
import { useAllGatewaysQuery } from '@/queries/useGatewaysQuery'
import { useCreateGatewayMutation } from '@/queries/useCreateGatewayMutation'
import { useDeleteGatewayMutation } from '@/queries/useDeleteGatewayMutation'
import { useUpdateGatewayMutation } from '@/queries/useUpdateGatewayMutation'
import { useTenantNodesQuery } from '@/queries/useTenantNodesQuery'
import type { Gateway } from '@/types/gateway'

const selectClassName =
  'h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50'

function formatLastSeen(value: string | null) {
  return value ? new Date(value).toLocaleString('vi-VN') : 'Chưa kết nối'
}

export default function DevicesPage() {
  const { data: gateways, isLoading } = useAllGatewaysQuery()
  const { data: nodes } = useTenantNodesQuery()
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [renameTarget, setRenameTarget] = useState<Gateway | null>(null)

  const deleteMutation = useDeleteGatewayMutation()

  function siteName(tenantNodeId: number) {
    return nodes?.find((n) => n.id === tenantNodeId)?.name ?? `#${tenantNodeId}`
  }

  function handleDelete(gateway: Gateway) {
    if (!window.confirm(`Xóa gateway "${gateway.name}"? Hành động này không thể hoàn tác.`)) {
      return
    }
    deleteMutation.mutate(gateway.id, {
      onSuccess: () => toast.success('Xóa gateway thành công'),
      onError: (error) => toast.error(getApiErrorMessage(error, 'Xóa thất bại, vui lòng thử lại')),
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Thiết bị</h2>
        <Button onClick={() => setIsCreateOpen(true)}>
          <Plus />
          Thêm gateway
        </Button>
      </div>

      <div className="rounded-xl border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tên</TableHead>
              <TableHead>MAC address</TableHead>
              <TableHead>Site</TableHead>
              <TableHead>Lần cuối online</TableHead>
              <TableHead className="w-32">Hành động</TableHead>
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
            {!isLoading && gateways?.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  Chưa có thiết bị nào
                </TableCell>
              </TableRow>
            )}
            {gateways?.map((gateway) => (
              <TableRow key={gateway.id}>
                <TableCell className="font-medium">
                  <Link to={`/devices/${gateway.id}`} className="hover:underline">
                    {gateway.name}
                  </Link>
                </TableCell>
                <TableCell>{gateway.macAddress}</TableCell>
                <TableCell>
                  <Link
                    to={`/organization/sites/${gateway.tenantNodeId}`}
                    className="inline-flex items-center gap-1 hover:underline"
                  >
                    <Router className="size-3.5 text-muted-foreground" />
                    {siteName(gateway.tenantNodeId)}
                  </Link>
                </TableCell>
                <TableCell className="text-muted-foreground">{formatLastSeen(gateway.lastSeenAt)}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="size-7" title="Xem chi tiết" asChild>
                      <Link to={`/devices/${gateway.id}`}>
                        <Eye className="size-4" />
                      </Link>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7"
                      title="Đổi tên"
                      onClick={() => setRenameTarget(gateway)}
                    >
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7 text-destructive hover:text-destructive"
                      title="Xóa"
                      onClick={() => handleDelete(gateway)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <CreateGatewayDialog
        sites={nodes?.filter((n) => n.nodeType === 'SITE') ?? []}
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
      />
      <RenameGatewayDialog gateway={renameTarget} onOpenChange={(open) => !open && setRenameTarget(null)} />
    </div>
  )
}

function CreateGatewayDialog({
  sites,
  open,
  onOpenChange,
}: {
  sites: { id: number; name: string }[]
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const createMutation = useCreateGatewayMutation()
  const [tenantNodeId, setTenantNodeId] = useState('')
  const form = useForm<CreateGatewayFormValues>({
    resolver: zodResolver(createGatewaySchema),
    defaultValues: { name: '', macAddress: '' },
  })

  function onSubmit(values: CreateGatewayFormValues) {
    if (!tenantNodeId) {
      toast.error('Vui lòng chọn site')
      return
    }
    createMutation.mutate(
      { tenantNodeId: Number(tenantNodeId), name: values.name, macAddress: values.macAddress },
      {
        onSuccess: () => {
          form.reset()
          setTenantNodeId('')
          onOpenChange(false)
          toast.success('Tạo gateway thành công')
        },
        onError: (error) => toast.error(getApiErrorMessage(error, 'Tạo gateway thất bại')),
      }
    )
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          form.reset()
          setTenantNodeId('')
        }
        onOpenChange(next)
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Thêm gateway</DialogTitle>
          <DialogDescription>Chọn site gateway sẽ được gán vào.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Site</label>
              <select
                className={selectClassName}
                value={tenantNodeId}
                onChange={(e) => setTenantNodeId(e.target.value)}
              >
                <option value="">-- Chọn site --</option>
                {sites.map((site) => (
                  <option key={site.id} value={site.id}>
                    {site.name}
                  </option>
                ))}
              </select>
            </div>
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tên gateway</FormLabel>
                  <FormControl>
                    <Input {...field} />
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

function RenameGatewayDialog({
  gateway,
  onOpenChange,
}: {
  gateway: Gateway | null
  onOpenChange: (open: boolean) => void
}) {
  const updateMutation = useUpdateGatewayMutation()
  const form = useForm<NodeNameFormValues>({
    resolver: zodResolver(nodeNameSchema),
    values: { name: gateway?.name ?? '' },
  })

  if (!gateway) {
    return null
  }

  function onSubmit(values: NodeNameFormValues) {
    if (!gateway) return
    updateMutation.mutate(
      { id: gateway.id, payload: { name: values.name } },
      {
        onSuccess: () => {
          onOpenChange(false)
          toast.success('Đổi tên thành công')
        },
        onError: (error) => toast.error(getApiErrorMessage(error, 'Đổi tên thất bại')),
      }
    )
  }

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Đổi tên gateway</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tên</FormLabel>
                  <FormControl>
                    <Input autoFocus {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? 'Đang lưu...' : 'Lưu'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
