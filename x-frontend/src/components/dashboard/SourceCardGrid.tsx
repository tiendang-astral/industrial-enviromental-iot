import { useNavigate } from 'react-router-dom'
import { Database } from 'lucide-react'
import type { ExternalSourceSummary } from '@/types/overview'

/** Card-grid nguồn dữ liệu — dùng chung giữa NodeOverviewCards và tab "Xem theo nguồn" ở SITE. */
export function SourceCardGrid({ sources }: { sources: ExternalSourceSummary[] }) {
  const navigate = useNavigate()

  if (sources.length === 0) {
    return <p className="text-sm text-muted-foreground">Chưa có nguồn dữ liệu nào ở đây</p>
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {sources.map((source) => (
        <button
          key={source.id}
          type="button"
          onClick={() => navigate(`/dashboard/source/${source.id}`)}
          className="flex items-start gap-3 rounded-xl border border-border p-4 text-left transition-colors hover:bg-muted/50"
        >
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
            <Database className="size-4 text-muted-foreground" />
          </div>
          <div className="min-w-0">
            <p className="truncate font-medium">{source.name}</p>
            <p className="truncate text-xs text-muted-foreground">Nguồn dữ liệu ngoài</p>
          </div>
        </button>
      ))}
    </div>
  )
}
