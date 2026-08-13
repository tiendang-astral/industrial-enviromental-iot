import { useEffect, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useFieldArray, useForm } from 'react-hook-form'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { ArrowLeft, LayoutDashboard, Plus, Trash2, X } from 'lucide-react'
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
import {
  createDatastreamSchema,
  externalSourceJobSchema,
  FILTER_OPERATORS,
  type CreateDatastreamFormValues,
  type ExternalSourceJobFormValues,
} from '@/lib/externalSourceJobSchema'
import {
  updateExternalSourceSchema,
  type UpdateExternalSourceFormValues,
} from '@/lib/externalSourceSchema'
import { useCreateDatastreamForJobMutation } from '@/queries/useCreateDatastreamForJobMutation'
import { useCreateExternalSourceJobMutation } from '@/queries/useCreateExternalSourceJobMutation'
import { useDatastreamsByExternalSourceQuery } from '@/queries/useDatastreamsByExternalSourceQuery'
import { useDeleteDatastreamMutation } from '@/queries/useDeleteDatastreamMutation'
import { useDeleteExternalSourceJobMutation } from '@/queries/useDeleteExternalSourceJobMutation'
import { useDeleteExternalSourceMutation } from '@/queries/useDeleteExternalSourceMutation'
import { useExternalSourceJobsQuery } from '@/queries/useExternalSourceJobsQuery'
import { useExternalSourcesQuery } from '@/queries/useExternalSourcesQuery'
import { useMetricsQuery } from '@/queries/useMetricsQuery'
import { useTenantNodesQuery } from '@/queries/useTenantNodesQuery'
import { useUpdateExternalSourceJobMutation } from '@/queries/useUpdateExternalSourceJobMutation'
import { useUpdateExternalSourceMutation } from '@/queries/useUpdateExternalSourceMutation'
import type { Datastream } from '@/types/dashboard'
import type { ExternalSourceJob } from '@/types/externalSource'
import type { Metric } from '@/types/metric'

const selectClassName =
  'h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50'

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('vi-VN')
}

function runStatusBadge(status: ExternalSourceJob['lastRunStatus']) {
  if (status === 'SUCCESS') return <Badge>Thành công</Badge>
  if (status === 'FAILED') return <Badge variant="destructive">Lỗi</Badge>
  if (status === 'RUNNING') return <Badge variant="outline">Đang chạy</Badge>
  return <Badge variant="outline">Chưa chạy</Badge>
}

export default function DataSourceDetailPage() {
  const { sourceId } = useParams()
  const externalSourceId = Number(sourceId)
  const navigate = useNavigate()

  const { data: sources } = useExternalSourcesQuery()
  const source = sources?.find((s) => s.id === externalSourceId)
  const { data: nodes } = useTenantNodesQuery()
  const { data: jobs, isLoading: jobsLoading } = useExternalSourceJobsQuery(externalSourceId)
  const { data: datastreams } = useDatastreamsByExternalSourceQuery(externalSourceId)
  const { data: metrics } = useMetricsQuery()

  const deleteSourceMutation = useDeleteExternalSourceMutation()
  const [isEditSourceOpen, setIsEditSourceOpen] = useState(false)
  const [isCreateJobOpen, setIsCreateJobOpen] = useState(false)
  const [isDeleteSourceOpen, setIsDeleteSourceOpen] = useState(false)

  function handleDeleteSource() {
    deleteSourceMutation.mutate(externalSourceId, {
      onSuccess: () => {
        toast.success('Xóa nguồn dữ liệu thành công')
        navigate('/data-sources')
      },
      onError: (error) => {
        setIsDeleteSourceOpen(false)
        toast.error(getApiErrorMessage(error, 'Xóa thất bại — nguồn còn job gắn vào'))
      },
    })
  }

  if (!source) {
    return <p className="text-sm text-muted-foreground">Đang tải...</p>
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="size-7" asChild>
            <Link to="/data-sources">
              <ArrowLeft className="size-4" />
            </Link>
          </Button>
          <h2 className="text-lg font-semibold">{source.name}</h2>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" asChild>
            <Link to={`/dashboard/source/${externalSourceId}`}>
              <LayoutDashboard />
              Xem Dashboard
            </Link>
          </Button>
          <Button size="sm" variant="outline" onClick={() => setIsEditSourceOpen(true)}>
            Sửa
          </Button>
          <Button size="sm" variant="outline" onClick={() => setIsDeleteSourceOpen(true)}>
            <Trash2 />
            Xóa
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-border p-4 text-sm">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <div>
            <p className="text-xs text-muted-foreground">Node</p>
            <p>{nodes?.find((n) => n.id === source.tenantNodeId)?.name ?? `#${source.tenantNodeId}`}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Host</p>
            <p>
              {source.connectionConfig.host}:{source.connectionConfig.port}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Database</p>
            <p>{source.connectionConfig.database}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">SSL mode</p>
            <p>{source.connectionConfig.sslMode ?? 'disable'}</p>
          </div>
        </div>
        {source.lastError && <p className="mt-2 text-xs text-destructive">Lỗi gần nhất: {source.lastError}</p>}
      </div>

      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground">Job</h3>
        <Button size="sm" onClick={() => setIsCreateJobOpen(true)}>
          <Plus />
          Thêm job
        </Button>
      </div>

      {jobsLoading && <p className="text-sm text-muted-foreground">Đang tải...</p>}
      {!jobsLoading && jobs?.length === 0 && <p className="text-sm text-muted-foreground">Chưa có job nào</p>}

      <div className="space-y-4">
        {jobs?.map((job) => (
          <JobCard
            key={job.id}
            job={job}
            datastreams={datastreams?.filter((d) => d.sourceId === job.id) ?? []}
            metrics={metrics ?? []}
            externalSourceId={externalSourceId}
          />
        ))}
      </div>

      <EditExternalSourceDialog
        externalSourceId={externalSourceId}
        open={isEditSourceOpen}
        onOpenChange={setIsEditSourceOpen}
      />

      <JobFormDialog
        mode="create"
        externalSourceId={externalSourceId}
        open={isCreateJobOpen}
        onOpenChange={setIsCreateJobOpen}
      />

      <Dialog open={isDeleteSourceOpen} onOpenChange={setIsDeleteSourceOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xóa nguồn dữ liệu</DialogTitle>
            <DialogDescription>Xóa nguồn "{source.name}"? Nguồn phải hết job mới xóa được.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteSourceOpen(false)}>
              Hủy
            </Button>
            <Button variant="destructive" onClick={handleDeleteSource} disabled={deleteSourceMutation.isPending}>
              Xóa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function JobCard({
  job,
  datastreams,
  metrics,
  externalSourceId,
}: {
  job: ExternalSourceJob
  datastreams: Datastream[]
  metrics: Metric[]
  externalSourceId: number
}) {
  const deleteJobMutation = useDeleteExternalSourceJobMutation(externalSourceId)
  const deleteDatastreamMutation = useDeleteDatastreamMutation(externalSourceId)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [isCreateDsOpen, setIsCreateDsOpen] = useState(false)

  function metricLabel(metricId: number) {
    const metric = metrics.find((m) => m.id === metricId)
    return metric ? `${metric.name} (${metric.unit})` : `#${metricId}`
  }

  function handleDeleteJob() {
    deleteJobMutation.mutate(job.id, {
      onSuccess: () => {
        setIsDeleteOpen(false)
        toast.success('Xóa job thành công')
      },
      onError: (error) => toast.error(getApiErrorMessage(error, 'Xóa thất bại — job còn datastream gắn vào')),
    })
  }

  function handleDeleteDatastream(id: number) {
    deleteDatastreamMutation.mutate(id, {
      onError: (error) => toast.error(getApiErrorMessage(error, 'Xóa datastream thất bại')),
    })
  }

  return (
    <div className="rounded-xl border border-border p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <p className="font-medium">{job.name}</p>
          {runStatusBadge(job.lastRunStatus)}
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => setIsCreateDsOpen(true)}>
            <Plus />
            Thêm datastream
          </Button>
          <Button size="sm" variant="outline" onClick={() => setIsEditOpen(true)}>
            Sửa
          </Button>
          <Button size="sm" variant="outline" onClick={() => setIsDeleteOpen(true)}>
            <Trash2 />
          </Button>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-muted-foreground sm:grid-cols-3">
        <p>
          Bảng: <span className="text-foreground">{job.queryConfig.table}</span>
        </p>
        <p>
          Cột thời gian: <span className="text-foreground">{job.queryConfig.timestampColumn}</span>
        </p>
        <p className="sm:col-span-1">
          Cột dữ liệu: <span className="text-foreground">{job.queryConfig.valueColumns.join(', ')}</span>
        </p>
        {job.filterConfig && job.filterConfig.length > 0 && (
          <p className="sm:col-span-3">
            Bộ lọc:{' '}
            <span className="text-foreground">
              {job.filterConfig.map((f) => `${f.column} ${f.operator} ${f.value}`).join(', ')}
            </span>
          </p>
        )}
      </div>

      <div className="mt-2 grid grid-cols-2 gap-2 border-t border-border pt-2 text-xs text-muted-foreground sm:grid-cols-4">
        <p>
          Lịch chạy: <span className="text-foreground">{job.scheduleCron}</span>
        </p>
        <p>
          Chạy gần nhất:{' '}
          <span className="text-foreground">{job.lastRunAt ? formatDateTime(job.lastRunAt) : 'Chưa chạy'}</span>
        </p>
        <p>
          Lần chạy tiếp theo:{' '}
          <span className="text-foreground">{job.nextRunAt ? formatDateTime(job.nextRunAt) : '—'}</span>
        </p>
        <p>
          Tổng dòng đã đọc: <span className="text-foreground">{job.totalRowCount}</span>
        </p>
      </div>
      {job.lastError && <p className="mt-2 text-xs text-destructive">Lỗi gần nhất: {job.lastError}</p>}

      <Table className="mt-3">
        <TableHeader>
          <TableRow>
            <TableHead>Tên datastream</TableHead>
            <TableHead>Field</TableHead>
            <TableHead>Metric</TableHead>
            <TableHead>Giá trị hiện tại</TableHead>
            <TableHead>Cập nhật gần nhất</TableHead>
            <TableHead className="w-12"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {datastreams.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground">
                Chưa có datastream nào
              </TableCell>
            </TableRow>
          )}
          {datastreams.map((ds) => (
            <TableRow key={ds.id}>
              <TableCell>{ds.name}</TableCell>
              <TableCell className="text-muted-foreground">{ds.sourceField}</TableCell>
              <TableCell className="text-muted-foreground">{metricLabel(ds.metricId)}</TableCell>
              <TableCell className="font-medium tabular-nums">
                {ds.latestValue != null ? `${ds.latestValue}${ds.metricUnit ? ` ${ds.metricUnit}` : ''}` : '—'}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {ds.latestMeasuredAt ? formatDateTime(ds.latestMeasuredAt) : 'Chưa có dữ liệu'}
              </TableCell>
              <TableCell>
                <button
                  type="button"
                  className="text-muted-foreground hover:text-destructive"
                  onClick={() => handleDeleteDatastream(ds.id)}
                  title="Xóa datastream"
                >
                  <X className="size-3.5" />
                </button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <JobFormDialog
        mode="edit"
        externalSourceId={externalSourceId}
        job={job}
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
      />

      <CreateDatastreamDialog
        job={job}
        metrics={metrics}
        externalSourceId={externalSourceId}
        open={isCreateDsOpen}
        onOpenChange={setIsCreateDsOpen}
      />

      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xóa job</DialogTitle>
            <DialogDescription>Xóa job "{job.name}"? Job phải hết datastream mới xóa được.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>
              Hủy
            </Button>
            <Button variant="destructive" onClick={handleDeleteJob} disabled={deleteJobMutation.isPending}>
              Xóa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function EditExternalSourceDialog({
  externalSourceId,
  open,
  onOpenChange,
}: {
  externalSourceId: number
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { data: sources } = useExternalSourcesQuery()
  const source = sources?.find((s) => s.id === externalSourceId)
  const updateMutation = useUpdateExternalSourceMutation()
  const form = useForm<UpdateExternalSourceFormValues>({
    resolver: zodResolver(updateExternalSourceSchema),
    defaultValues: { name: '', host: '', port: '', database: '', sslMode: '', username: '', password: '' },
  })

  useEffect(() => {
    if (source && open) {
      form.reset({
        name: source.name,
        host: source.connectionConfig.host,
        port: String(source.connectionConfig.port),
        database: source.connectionConfig.database,
        sslMode: source.connectionConfig.sslMode ?? '',
        username: '',
        password: '',
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source, open])

  function onSubmit(values: UpdateExternalSourceFormValues) {
    const connectionConfig =
      values.host && values.port && values.database
        ? { host: values.host, port: Number(values.port), database: values.database, sslMode: values.sslMode || null }
        : undefined
    const credential = values.username && values.password ? { username: values.username, password: values.password } : undefined

    updateMutation.mutate(
      { id: externalSourceId, payload: { name: values.name, connectionConfig, credential } },
      {
        onSuccess: () => {
          onOpenChange(false)
          toast.success('Cập nhật nguồn dữ liệu thành công')
        },
        onError: (error) => toast.error(getApiErrorMessage(error, 'Cập nhật thất bại')),
      }
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Sửa nguồn dữ liệu</DialogTitle>
          <DialogDescription>Bỏ trống username/password nếu không đổi credential.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
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
                      <Input {...field} />
                    </FormControl>
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
                    <FormLabel>Username mới</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password mới</FormLabel>
                    <FormControl>
                      <Input type="password" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
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

function JobFormDialog({
  mode,
  externalSourceId,
  job,
  open,
  onOpenChange,
}: {
  mode: 'create' | 'edit'
  externalSourceId: number
  job?: ExternalSourceJob
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const createMutation = useCreateExternalSourceJobMutation(externalSourceId)
  const updateMutation = useUpdateExternalSourceJobMutation(externalSourceId)
  const mutation = mode === 'create' ? createMutation : updateMutation

  const form = useForm<ExternalSourceJobFormValues>({
    resolver: zodResolver(externalSourceJobSchema),
    defaultValues: { name: '', table: '', timestampColumn: '', valueColumns: '', filters: [], scheduleCron: '*/5 * * * *' },
  })
  const { fields, append, remove } = useFieldArray({ control: form.control, name: 'filters' })

  useEffect(() => {
    if (open) {
      if (mode === 'edit' && job) {
        form.reset({
          name: job.name,
          table: job.queryConfig.table,
          timestampColumn: job.queryConfig.timestampColumn,
          valueColumns: job.queryConfig.valueColumns.join(', '),
          filters: job.filterConfig ?? [],
          scheduleCron: job.scheduleCron,
        })
      } else {
        form.reset({ name: '', table: '', timestampColumn: '', valueColumns: '', filters: [], scheduleCron: '*/5 * * * *' })
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, mode, job])

  function onSubmit(values: ExternalSourceJobFormValues) {
    const payload = {
      name: values.name,
      queryConfig: {
        table: values.table,
        timestampColumn: values.timestampColumn,
        valueColumns: values.valueColumns
          .split(',')
          .map((c) => c.trim())
          .filter(Boolean),
      },
      filterConfig: values.filters,
      scheduleCron: values.scheduleCron,
    }

    const onSuccess = () => {
      onOpenChange(false)
      toast.success(mode === 'create' ? 'Tạo job thành công' : 'Cập nhật job thành công')
    }
    const onError = (error: unknown) => toast.error(getApiErrorMessage(error, 'Lưu job thất bại'))

    if (mode === 'create') {
      createMutation.mutate(payload, { onSuccess, onError })
    } else if (job) {
      updateMutation.mutate({ id: job.id, payload }, { onSuccess, onError })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'Thêm job' : 'Sửa job'}</DialogTitle>
          <DialogDescription>
            Job đọc dữ liệu mới từ 1 bảng theo lịch cron — đổi bảng/cột sẽ reset lại vị trí đọc (cursor).
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tên job</FormLabel>
                  <FormControl>
                    <Input autoFocus {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="table"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tên bảng</FormLabel>
                    <FormControl>
                      <Input placeholder="readings" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="timestampColumn"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cột thời gian</FormLabel>
                    <FormControl>
                      <Input placeholder="measured_at" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="valueColumns"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cột dữ liệu (cách nhau bằng dấu phẩy)</FormLabel>
                  <FormControl>
                    <Input placeholder="temperature_c, humidity_pct" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="scheduleCron"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Lịch chạy (cron)</FormLabel>
                  <FormControl>
                    <Input placeholder="*/5 * * * *" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <FormLabel>Bộ lọc (tùy chọn)</FormLabel>
                <Button type="button" size="sm" variant="outline" onClick={() => append({ column: '', operator: '=', value: '' })}>
                  <Plus />
                  Thêm điều kiện
                </Button>
              </div>
              {fields.map((f, index) => (
                <div key={f.id} className="flex items-center gap-2">
                  <Input placeholder="cột" {...form.register(`filters.${index}.column`)} />
                  <select className={`${selectClassName} w-24`} {...form.register(`filters.${index}.operator`)}>
                    {FILTER_OPERATORS.map((op) => (
                      <option key={op} value={op}>
                        {op}
                      </option>
                    ))}
                  </select>
                  <Input placeholder="giá trị" {...form.register(`filters.${index}.value`)} />
                  <button type="button" onClick={() => remove(index)} className="shrink-0 text-muted-foreground hover:text-destructive">
                    <X className="size-4" />
                  </button>
                </div>
              ))}
            </div>

            <DialogFooter>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? 'Đang lưu...' : 'Lưu'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

function CreateDatastreamDialog({
  job,
  metrics,
  externalSourceId,
  open,
  onOpenChange,
}: {
  job: ExternalSourceJob
  metrics: Metric[]
  externalSourceId: number
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const createMutation = useCreateDatastreamForJobMutation(externalSourceId)
  const form = useForm<CreateDatastreamFormValues>({
    resolver: zodResolver(createDatastreamSchema),
    defaultValues: { name: '', metricId: '', sourceField: '' },
  })

  function onSubmit(values: CreateDatastreamFormValues) {
    createMutation.mutate(
      { jobId: job.id, payload: { name: values.name, metricId: Number(values.metricId), sourceField: values.sourceField } },
      {
        onSuccess: () => {
          form.reset()
          onOpenChange(false)
          toast.success('Tạo datastream thành công')
        },
        onError: (error) => toast.error(getApiErrorMessage(error, 'Tạo datastream thất bại')),
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
          <DialogTitle>Thêm datastream</DialogTitle>
          <DialogDescription>Gắn 1 field trong job "{job.name}" vào 1 metric.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
            <FormField
              control={form.control}
              name="sourceField"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Field</FormLabel>
                  <FormControl>
                    <select className={selectClassName} {...field}>
                      <option value="">-- Chọn field --</option>
                      {job.queryConfig.valueColumns.map((col) => (
                        <option key={col} value={col}>
                          {col}
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
              name="metricId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Metric</FormLabel>
                  <FormControl>
                    <select className={selectClassName} {...field}>
                      <option value="">-- Chọn metric --</option>
                      {metrics.map((m) => (
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
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tên datastream</FormLabel>
                  <FormControl>
                    <Input {...field} />
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
