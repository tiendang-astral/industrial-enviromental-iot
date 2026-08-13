import { useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useTenantDetailQuery } from '@/queries/useTenantDetailQuery'
import type { TenantNodeSummary } from '@/types/tenant'

const NODE_TYPE_LABEL: Record<TenantNodeSummary['nodeType'], string> = {
  TENANT_ROOT: 'Công ty',
  BRANCH: 'Chi nhánh',
  PRODUCTION_AREA: 'Khu sản xuất',
  SITE: 'Xưởng/Chuồng trại',
}

/** DFS order theo cây (children ngay sau cha) — ổn định hơn sort theo path text. */
function orderNodesDepthFirst(nodes: TenantNodeSummary[]) {
  const byParent = new Map<number | null, TenantNodeSummary[]>()
  for (const node of nodes) {
    const list = byParent.get(node.parentId) ?? []
    list.push(node)
    byParent.set(node.parentId, list)
  }
  for (const list of byParent.values()) {
    list.sort((a, b) => a.name.localeCompare(b.name))
  }
  const result: { node: TenantNodeSummary; depth: number }[] = []
  function visit(parentId: number | null, depth: number) {
    for (const node of byParent.get(parentId) ?? []) {
      result.push({ node, depth })
      visit(node.id, depth + 1)
    }
  }
  visit(null, 0)
  return result
}

function formatDate(value: string | null) {
  return value ? new Date(value).toLocaleString('vi-VN') : '—'
}

export default function TenantDetailPage() {
  const { id } = useParams<{ id: string }>()
  const tenantId = Number(id)
  const { data, isLoading } = useTenantDetailQuery(tenantId)
  const orderedNodes = useMemo(() => (data ? orderNodesDepthFirst(data.nodes) : []), [data])

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Đang tải...</p>
  }
  if (!data) {
    return <p className="text-sm text-muted-foreground">Không tìm thấy tenant</p>
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="size-7" asChild>
          <Link to="/tenants">
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <h2 className="text-lg font-semibold">{data.tenant.name}</h2>
        <Badge variant={data.tenant.status === 'ACTIVE' ? 'default' : 'outline'}>{data.tenant.status}</Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tổ chức</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tên</TableHead>
                <TableHead>Loại</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orderedNodes.length === 0 && (
                <TableRow>
                  <TableCell colSpan={2} className="text-center text-muted-foreground">
                    Chưa có node tổ chức nào
                  </TableCell>
                </TableRow>
              )}
              {orderedNodes.map(({ node, depth }) => (
                <TableRow key={node.id}>
                  <TableCell style={{ paddingLeft: `${depth * 20 + 16}px` }}>{node.name}</TableCell>
                  <TableCell>{NODE_TYPE_LABEL[node.nodeType]}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Thiết bị</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tên</TableHead>
                <TableHead>MAC address</TableHead>
                <TableHead>Lần cuối online</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.gateways.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground">
                    Chưa có thiết bị nào
                  </TableCell>
                </TableRow>
              )}
              {data.gateways.map((gateway) => (
                <TableRow key={gateway.id}>
                  <TableCell className="font-medium">{gateway.name}</TableCell>
                  <TableCell>{gateway.macAddress}</TableCell>
                  <TableCell>{formatDate(gateway.lastSeenAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Người dùng</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Username</TableHead>
                <TableHead>Họ tên</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Trạng thái</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.users.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    Chưa có người dùng nào
                  </TableCell>
                </TableRow>
              )}
              {data.users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.username}</TableCell>
                  <TableCell>{user.fullName}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <Badge variant={user.status === 'ACTIVE' ? 'default' : 'outline'}>{user.status}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
