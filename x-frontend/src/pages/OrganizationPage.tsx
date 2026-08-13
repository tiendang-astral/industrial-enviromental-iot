import { useMemo, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { Building, Building2, Lock, LockOpen, MapPin, MoveRight, Pencil, Plus, Router, Trash2, Warehouse } from 'lucide-react'
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
import { TableCell, TableRow } from '@/components/ui/table'
import {
  Table,
  TableBody,
  TreeTableContainer,
  TreeTableHead,
  TreeTableHeader,
  TreeTableLevelLabel,
  TreeTableNameCell,
  TreeTableRow,
  TreeTableStatusBadge,
  useTreeTableRows,
} from '@/components/shared/TreeTable'
import { getApiErrorMessage } from '@/lib/apiError'
import { nodeNameSchema, type NodeNameFormValues } from '@/lib/tenantNodeSchema'
import { useCreateTenantNodeMutation } from '@/queries/useCreateTenantNodeMutation'
import { useDeleteTenantNodeMutation } from '@/queries/useDeleteTenantNodeMutation'
import { useMoveTenantNodeMutation } from '@/queries/useMoveTenantNodeMutation'
import { useRenameTenantNodeMutation } from '@/queries/useRenameTenantNodeMutation'
import { useTenantNodesQuery } from '@/queries/useTenantNodesQuery'
import { useUpdateTenantNodeStatusMutation } from '@/queries/useUpdateTenantNodeStatusMutation'
import type { NodeType, TenantNode } from '@/types/tenantNode'

const NEXT_TYPE: Partial<Record<NodeType, NodeType>> = {
  TENANT_ROOT: 'BRANCH',
  BRANCH: 'PRODUCTION_AREA',
  PRODUCTION_AREA: 'SITE',
}

const NODE_LABEL: Record<NodeType, string> = {
  TENANT_ROOT: 'Công ty',
  BRANCH: 'Chi nhánh',
  PRODUCTION_AREA: 'Khu sản xuất',
  SITE: 'Xưởng/Chuồng trại',
}

const NODE_ICON: Record<NodeType, typeof Building2> = {
  TENANT_ROOT: Building2,
  BRANCH: Building,
  PRODUCTION_AREA: Warehouse,
  SITE: MapPin,
}

/** DFS order theo cây (children luôn theo ngay sau cha) — ổn định hơn sort theo path text (label số nhiều chữ số sort sai theo lexical). */
function orderNodesDepthFirst(nodes: TenantNode[]): TenantNode[] {
  const byParent = new Map<number | null, TenantNode[]>()
  for (const node of nodes) {
    const list = byParent.get(node.parentId) ?? []
    list.push(node)
    byParent.set(node.parentId, list)
  }
  for (const list of byParent.values()) {
    list.sort((a, b) => a.name.localeCompare(b.name))
  }
  const result: TenantNode[] = []
  function visit(parentId: number | null) {
    for (const node of byParent.get(parentId) ?? []) {
      result.push(node)
      visit(node.id)
    }
  }
  visit(null)
  return result
}

export default function OrganizationPage() {
  const { data: nodes, isLoading } = useTenantNodesQuery()
  const orderedNodes = useMemo(() => (nodes ? orderNodesDepthFirst(nodes) : []), [nodes])
  const { rows } = useTreeTableRows(orderedNodes)

  const [createParent, setCreateParent] = useState<TenantNode | null>(null)
  const [renameTarget, setRenameTarget] = useState<TenantNode | null>(null)
  const [moveTarget, setMoveTarget] = useState<TenantNode | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<TenantNode | null>(null)

  const deleteMutation = useDeleteTenantNodeMutation()
  const updateStatusMutation = useUpdateTenantNodeStatusMutation()

  function handleDelete() {
    if (!deleteTarget) return
    deleteMutation.mutate(deleteTarget.id, {
      onSuccess: () => {
        setDeleteTarget(null)
        toast.success('Xóa thành công')
      },
      onError: (error) => {
        toast.error(getApiErrorMessage(error, 'Xóa thất bại, vui lòng thử lại'))
      },
    })
  }

  function handleToggleStatus(node: TenantNode) {
    updateStatusMutation.mutate(
      { id: node.id, payload: { enabled: !node.enabled } },
      {
        onSuccess: () => {
          toast.success(node.enabled ? 'Đã tắt' : 'Đã bật lại')
        },
        onError: (error) => {
          toast.error(getApiErrorMessage(error, 'Cập nhật trạng thái thất bại'))
        },
      }
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Tổ chức</h2>
      </div>

      <TreeTableContainer>
        <Table>
          <TreeTableHeader>
            <TableRow>
              <TreeTableHead>Tên</TreeTableHead>
              <TreeTableHead>Loại</TreeTableHead>
              <TreeTableHead>Trạng thái</TreeTableHead>
              <TreeTableHead className="w-56">Hành động</TreeTableHead>
            </TableRow>
          </TreeTableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground">
                  Đang tải...
                </TableCell>
              </TableRow>
            )}
            {!isLoading && rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground">
                  Chưa có node tổ chức nào
                </TableCell>
              </TableRow>
            )}
            {rows.map(({ node, depth, hasChildren, isExpanded, childCount, toggle }) => {
              const isLeafType = node.nodeType === 'SITE'
              const childType = NEXT_TYPE[node.nodeType]
              return (
                <TreeTableRow key={node.id} isActive={node.enabled}>
                  <TreeTableNameCell
                    depth={depth}
                    hasChildren={hasChildren}
                    isExpanded={isExpanded}
                    onToggle={toggle}
                    isLeafType={isLeafType}
                    leafIcon={MapPin}
                    typeIcon={NODE_ICON[node.nodeType]}
                    childCount={childCount}
                    isActive={node.enabled}
                  >
                    {isLeafType ? (
                      <Link to={`/organization/sites/${node.id}`} className="hover:underline">
                        {node.name}
                      </Link>
                    ) : (
                      node.name
                    )}
                  </TreeTableNameCell>
                  <TableCell>
                    <TreeTableLevelLabel>{NODE_LABEL[node.nodeType]}</TreeTableLevelLabel>
                  </TableCell>
                  <TableCell>
                    <TreeTableStatusBadge active={node.enabled} activeLabel="Hoạt động" inactiveLabel="Đã tắt" />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {childType && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7"
                          title={`Thêm ${NODE_LABEL[childType].toLowerCase()}`}
                          onClick={() => setCreateParent(node)}
                        >
                          <Plus className="size-4" />
                        </Button>
                      )}
                      {node.nodeType === 'SITE' && (
                        <Button variant="ghost" size="icon" className="size-7" title="Quản lý gateway" asChild>
                          <Link to={`/organization/sites/${node.id}`}>
                            <Router className="size-4" />
                          </Link>
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7"
                        title="Đổi tên"
                        onClick={() => setRenameTarget(node)}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      {node.nodeType !== 'TENANT_ROOT' && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7"
                          title="Di chuyển"
                          onClick={() => setMoveTarget(node)}
                        >
                          <MoveRight className="size-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7"
                        title={node.enabled ? 'Tắt' : 'Bật lại'}
                        disabled={updateStatusMutation.isPending}
                        onClick={() => handleToggleStatus(node)}
                      >
                        {node.enabled ? <Lock className="size-4" /> : <LockOpen className="size-4" />}
                      </Button>
                      {node.nodeType !== 'TENANT_ROOT' && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7 text-destructive hover:text-destructive"
                          title="Xóa"
                          onClick={() => setDeleteTarget(node)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TreeTableRow>
              )
            })}
          </TableBody>
        </Table>
      </TreeTableContainer>

      <CreateNodeDialog parent={createParent} onOpenChange={(open) => !open && setCreateParent(null)} />
      <RenameNodeDialog node={renameTarget} onOpenChange={(open) => !open && setRenameTarget(null)} />
      <MoveNodeDialog
        node={moveTarget}
        allNodes={nodes ?? []}
        onOpenChange={(open) => !open && setMoveTarget(null)}
      />

      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xóa node tổ chức</DialogTitle>
            <DialogDescription>
              Xóa "{deleteTarget?.name}"? Hành động này không thể hoàn tác.
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

function CreateNodeDialog({
  parent,
  onOpenChange,
}: {
  parent: TenantNode | null
  onOpenChange: (open: boolean) => void
}) {
  const createMutation = useCreateTenantNodeMutation()
  const form = useForm<NodeNameFormValues>({
    resolver: zodResolver(nodeNameSchema),
    defaultValues: { name: '' },
  })

  if (!parent) {
    return null
  }
  const childType = NEXT_TYPE[parent.nodeType]
  if (!childType) {
    return null
  }

  function onSubmit(values: NodeNameFormValues) {
    if (!parent || !childType) return
    createMutation.mutate(
      { parentId: parent.id, nodeType: childType, name: values.name },
      {
        onSuccess: () => {
          form.reset()
          onOpenChange(false)
          toast.success('Tạo node thành công')
        },
        onError: (error) => {
          toast.error(getApiErrorMessage(error, 'Tạo node thất bại'))
        },
      }
    )
  }

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Thêm {NODE_LABEL[childType].toLowerCase()}</DialogTitle>
          <DialogDescription>Trong "{parent.name}"</DialogDescription>
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

function RenameNodeDialog({
  node,
  onOpenChange,
}: {
  node: TenantNode | null
  onOpenChange: (open: boolean) => void
}) {
  const renameMutation = useRenameTenantNodeMutation()
  const form = useForm<NodeNameFormValues>({
    resolver: zodResolver(nodeNameSchema),
    values: { name: node?.name ?? '' },
  })

  if (!node) {
    return null
  }

  function onSubmit(values: NodeNameFormValues) {
    if (!node) return
    renameMutation.mutate(
      { id: node.id, payload: { name: values.name } },
      {
        onSuccess: () => {
          onOpenChange(false)
          toast.success('Đổi tên thành công')
        },
        onError: (error) => {
          toast.error(getApiErrorMessage(error, 'Đổi tên thất bại'))
        },
      }
    )
  }

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Đổi tên</DialogTitle>
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
              <Button type="submit" disabled={renameMutation.isPending}>
                {renameMutation.isPending ? 'Đang lưu...' : 'Lưu'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

function MoveNodeDialog({
  node,
  allNodes,
  onOpenChange,
}: {
  node: TenantNode | null
  allNodes: TenantNode[]
  onOpenChange: (open: boolean) => void
}) {
  const moveMutation = useMoveTenantNodeMutation()
  const [newParentId, setNewParentId] = useState<string>('')

  const requiredParentType = node
    ? (Object.entries(NEXT_TYPE).find(([, child]) => child === node.nodeType)?.[0] as NodeType | undefined)
    : undefined
  const candidates = requiredParentType
    ? allNodes.filter((n) => n.nodeType === requiredParentType && n.id !== node?.id)
    : []

  if (!node) {
    return null
  }

  function onSubmit() {
    if (!node || !newParentId) return
    moveMutation.mutate(
      { id: node.id, payload: { newParentId: Number(newParentId) } },
      {
        onSuccess: () => {
          setNewParentId('')
          onOpenChange(false)
          toast.success('Di chuyển thành công')
        },
        onError: (error) => {
          toast.error(getApiErrorMessage(error, 'Di chuyển thất bại'))
        },
      }
    )
  }

  return (
    <Dialog
      open
      onOpenChange={(next) => {
        if (!next) setNewParentId('')
        onOpenChange(next)
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Di chuyển "{node.name}"</DialogTitle>
          <DialogDescription>Chọn {requiredParentType ? NODE_LABEL[requiredParentType].toLowerCase() : ''} mới làm cha.</DialogDescription>
        </DialogHeader>
        <select
          className="h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          value={newParentId}
          onChange={(e) => setNewParentId(e.target.value)}
        >
          <option value="">-- Chọn --</option>
          {candidates.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <DialogFooter>
          <Button onClick={onSubmit} disabled={!newParentId || moveMutation.isPending}>
            {moveMutation.isPending ? 'Đang di chuyển...' : 'Di chuyển'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
