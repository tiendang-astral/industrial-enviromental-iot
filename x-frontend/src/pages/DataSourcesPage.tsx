import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { Database, Plus } from 'lucide-react'
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
import { createExternalSourceSchema, type CreateExternalSourceFormValues } from '@/lib/externalSourceSchema'
import { useCreateExternalSourceMutation } from '@/queries/useCreateExternalSourceMutation'
import { useExternalSourcesQuery } from '@/queries/useExternalSourcesQuery'
import { useTenantNodesQuery } from '@/queries/useTenantNodesQuery'

const selectClassName =
  'h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50'

function syncStatusBadge(status: string | null) {
  if (status === 'SUCCESS') return <Badge>Đồng bộ OK</Badge>
  if (status === 'FAILED') return <Badge variant="destructive">Lỗi đồng bộ</Badge>
  return <Badge variant="outline">Chưa chạy</Badge>
}

export default function DataSourcesPage() {
  const { data: sources, isLoading } = useExternalSourcesQuery()
  const { data: nodes } = useTenantNodesQuery()
  const [isCreateOpen, setIsCreateOpen] = useState(false)

  function nodeName(tenantNodeId: number) {
    return nodes?.find((n) => n.id === tenantNodeId)?.name ?? `#${tenantNodeId}`
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Nguồn dữ liệu</h2>
        <Button onClick={() => setIsCreateOpen(true)}>
          <Plus />
          Thêm nguồn
        </Button>
      </div>

      <div className="rounded-xl border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tên</TableHead>
              <TableHead>Node</TableHead>
              <TableHead>Kết nối</TableHead>
              <TableHead>Trạng thái</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground">
                  Đang tải...
                </TableCell>
              </TableRow>
            )}
            {!isLoading && sources?.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground">
                  Chưa có nguồn dữ liệu nào
                </TableCell>
              </TableRow>
            )}
            {sources?.map((source) => (
              <TableRow key={source.id}>
                <TableCell className="font-medium">
                  <Link to={`/data-sources/${source.id}`} className="flex items-center gap-2 hover:underline">
                    <Database className="size-4 text-muted-foreground" />
                    {source.name}
                  </Link>
                </TableCell>
                <TableCell className="text-muted-foreground">{nodeName(source.tenantNodeId)}</TableCell>
                <TableCell className="text-muted-foreground">
                  {source.connectionConfig.host}:{source.connectionConfig.port}/{source.connectionConfig.database}
                </TableCell>
                <TableCell>{syncStatusBadge(source.lastSyncStatus)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <CreateExternalSourceDialog open={isCreateOpen} onOpenChange={setIsCreateOpen} />
    </div>
  )
}

function CreateExternalSourceDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { data: nodes } = useTenantNodesQuery()
  const createMutation = useCreateExternalSourceMutation()
  const form = useForm<CreateExternalSourceFormValues>({
    resolver: zodResolver(createExternalSourceSchema),
    defaultValues: { tenantNodeId: '', name: '', host: '', port: '5432', database: '', sslMode: '', username: '', password: '' },
  })

  function onSubmit(values: CreateExternalSourceFormValues) {
    createMutation.mutate(
      {
        tenantNodeId: Number(values.tenantNodeId),
        payload: {
          name: values.name,
          connectionType: 'POSTGRESQL',
          connectionConfig: {
            host: values.host,
            port: Number(values.port),
            database: values.database,
            sslMode: values.sslMode || null,
          },
          credential: { username: values.username, password: values.password },
        },
      },
      {
        onSuccess: () => {
          form.reset()
          onOpenChange(false)
          toast.success('Tạo nguồn dữ liệu thành công')
        },
        onError: (error) => toast.error(getApiErrorMessage(error, 'Tạo nguồn dữ liệu thất bại')),
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
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Thêm nguồn dữ liệu</DialogTitle>
          <DialogDescription>Kết nối 1 PostgreSQL ngoài để lấy dữ liệu theo lịch.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
            <FormField
              control={form.control}
              name="tenantNodeId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Gắn vào node</FormLabel>
                  <FormControl>
                    <select className={selectClassName} {...field}>
                      <option value="">-- Chọn node --</option>
                      {nodes?.map((n) => (
                        <option key={n.id} value={n.id}>
                          {'—'.repeat(n.depth - 1)} {n.name}
                        </option>
                      ))}
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tên nguồn</FormLabel>
                  <FormControl>
                    <Input autoFocus {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="host"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Host</FormLabel>
                    <FormControl>
                      <Input placeholder="203.0.113.10" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="port"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Port</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="database"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Database</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="sslMode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>SSL mode</FormLabel>
                    <FormControl>
                      <select className={selectClassName} {...field}>
                        <option value="">disable</option>
                        <option value="require">require</option>
                        <option value="prefer">prefer</option>
                      </select>
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input type="password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
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
