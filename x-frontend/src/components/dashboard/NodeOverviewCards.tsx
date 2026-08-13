import { useNavigate } from 'react-router-dom'
import { LayoutGrid, MapPin } from 'lucide-react'
import { SourceCardGrid } from '@/components/dashboard/SourceCardGrid'
import { useTenantNodeOverviewQuery } from '@/queries/useTenantNodeOverviewQuery'

/**
 * Card-grid hiện khi vào Dashboard tại node không phải SITE — flatten toàn bộ subtree
 * (tất cả external_source + tất cả SITE bên dưới, bất kể sâu bao nhiêu cấp), thay cho
 * widget-grid trực tiếp (chỉ SITE mới có board thật, xem DATABASE.md § dashboard).
 */
export function NodeOverviewCards({ nodeId }: { nodeId: number }) {
  const navigate = useNavigate()
  const { data: overview, isLoading } = useTenantNodeOverviewQuery(nodeId)

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Đang tải...</p>
  }

  const hasSources = (overview?.sources.length ?? 0) > 0
  const hasSites = (overview?.sites.length ?? 0) > 0

  if (!hasSources && !hasSites) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border py-16 text-center">
        <LayoutGrid className="size-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Chưa có site hoặc nguồn dữ liệu nào trong tổ chức này</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {hasSources && (
        <section className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground">Nguồn dữ liệu</h3>
          <SourceCardGrid sources={overview!.sources} />
        </section>
      )}

      {hasSites && (
        <section className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground">Site</h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {overview!.sites.map((site) => (
              <button
                key={site.id}
                type="button"
                onClick={() => navigate(`/dashboard/${site.id}`)}
                className="flex items-start gap-3 rounded-xl border border-border p-4 text-left transition-colors hover:bg-muted/50"
              >
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                  <MapPin className="size-4 text-muted-foreground" />
                </div>
                <div className="min-w-0">
                  <p className="truncate font-medium">{site.name}</p>
                  <p className="truncate text-xs text-muted-foreground">Xem dashboard site</p>
                </div>
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
