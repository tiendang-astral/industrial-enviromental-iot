import { useEffect, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { Eye, Pencil, Plus, Router, Trash2 } from 'lucide-react'
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
import { useAllGatewaysQuery } from '@/queries/useGatewaysQuery'
import { useCreateGatewayMutation } from '@/queries/useCreateGatewayMutation'
import { useDeleteGatewayMutation } from '@/queries/useDeleteGatewayMutation'
import { useUpdateGatewayMutation } from '@/queries/useUpdateGatewayMutation'
import { useTenantNodesQuery } from '@/queries/useTenantNodesQuery'
import type { Gateway } from '@/types/gateway'

const selectClassName =
  'h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50'

function deviceStatus(lastSeenAt: string | null) {
  if (!lastSeenAt) {
    return { label: 'Chưa kết nối', online: false }
  }
  const diffMinutes = Math.floor((Date.now() - new Date(lastSeenAt).getTime()) / 60000)
  if (diffMinutes < 1) {
    return { label: 'Online', online: true }
  }
  if (diffMinutes < 60) {
    return { label: `Online ${diffMinutes} phút trước`, online: false }
  }
  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24) {
    return { label: `Online ${diffHours} giờ trước`, online: false }
  }
  const diffDays = Math.floor(diffHours / 24)
  return { label: `Online ${diffDays} ngày trước`, online: false }
}

export default function DevicesPage() {
  const { data: gateways, isLoading } = useAllGatewaysQuery()
  const { data: nodes } = useTenantNodesQuery()
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Gateway | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Gateway | null>(null)

  const deleteMutation = useDeleteGatewayMutation()

  function siteName(tenantNodeId: number) {
    return nodes?.find((n) => n.id === tenantNodeId)?.name ?? `#${tenantNodeId}`
  }

  function handleDelete() {
    if (!deleteTarget) return
    deleteMutation.mutate(deleteTarget.id, {
      onSuccess: () => {
        setDeleteTarget(null)
        toast.success('Xóa gateway thành công')
      },
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
              <TableHead className="w-12">STT</TableHead>
              <TableHead>Tên</TableHead>
              <TableHead>MAC address</TableHead>
              <TableHead>Site</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead className="w-32">Hành động</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  Đang tải...
                </TableCell>
              </TableRow>
            )}
            {!isLoading && gateways?.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  Chưa có thiết bị nào
                </TableCell>
              </TableRow>
            )}
            {gateways?.map((gateway, index) => {
              const status = deviceStatus(gateway.lastSeenAt)
              return (
                <TableRow key={gateway.id}>
                  <TableCell className="text-muted-foreground">{index + 1}</TableCell>
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
                  <TableCell>
                    {status.online ? (
                      <Badge>{status.label}</Badge>
                    ) : (
                      <span className="text-muted-foreground">{status.label}</span>
                    )}
                  </TableCell>
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
                        title="Sửa"
                        onClick={() => setEditTarget(gateway)}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7 text-destructive hover:text-destructive"
                        title="Xóa"
                        onClick={() => setDeleteTarget(gateway)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      <CreateGatewayDialog
        sites={nodes?.filter((n) => n.nodeType === 'SITE') ?? []}
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
      />
      <EditGatewayDialog
        gateway={editTarget}
        sites={nodes?.filter((n) => n.nodeType === 'SITE') ?? []}
        onOpenChange={(open) => !open && setEditTarget(null)}
      />

      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xóa gateway</DialogTitle>
            <DialogDescription>
              Xóa gateway "{deleteTarget?.name}"? Hành động này không thể hoàn tác.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Hủy
            </Button>
            <Button variant="destructive" disabled={deleteMutation.isPending} onClick={handleDelete}>
              {deleteMutation.isPending ? 'Đang xóa...' : 'Xóa'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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

function EditGatewayDialog({
  gateway,
  sites,
  onOpenChange,
}: {
  gateway: Gateway | null
  sites: { id: number; name: string }[]
  onOpenChange: (open: boolean) => void
}) {
  const updateMutation = useUpdateGatewayMutation()
  const [tenantNodeId, setTenantNodeId] = useState('')
  const form = useForm<CreateGatewayFormValues>({
    resolver: zodResolver(createGatewaySchema),
    values: { name: gateway?.name ?? '', macAddress: gateway?.macAddress ?? '' },
  })

  useEffect(() => {
    if (gateway) {
      setTenantNodeId(String(gateway.tenantNodeId))
    }
  }, [gateway])

  if (!gateway) {
    return null
  }

  function onSubmit(values: CreateGatewayFormValues) {
    if (!gateway || !tenantNodeId) return
    updateMutation.mutate(
      { id: gateway.id, payload: { name: values.name, macAddress: values.macAddress, tenantNodeId: Number(tenantNodeId) } },
      {
        onSuccess: () => {
          onOpenChange(false)
          toast.success('Cập nhật gateway thành công')
        },
        onError: (error) => toast.error(getApiErrorMessage(error, 'Cập nhật thất bại')),
      }
    )
  }

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Sửa gateway</DialogTitle>
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
