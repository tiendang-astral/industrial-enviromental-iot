import { AlertTriangle, Database, Lock, Network, Server } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Card, CardContent } from '@/components/ui/card'
import { StatusBadge } from '@/components/patterns/StatusBadge'
import { formatDateTime } from '@/lib/datetime'
import type { ExternalSource } from '@/types/externalSource'

function InfoItem({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
      <div className="flex min-w-0 flex-col gap-0.5">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="truncate text-sm font-medium">{value}</p>
      </div>
    </div>
  )
}

export function SourceInfoCard({
  source,
  nodeName,
}: {
  source: ExternalSource
  nodeName: string
}) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <InfoItem icon={Network} label="Đơn vị" value={nodeName} />
          <InfoItem
            icon={Server}
            label="Host"
            value={`${source.connectionConfig.host}:${source.connectionConfig.port}`}
          />
          <InfoItem icon={Database} label="Database" value={source.connectionConfig.database} />
          <InfoItem icon={Lock} label="SSL mode" value={source.connectionConfig.sslMode ?? 'disable'} />
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t border-border pt-4 text-sm text-muted-foreground">
          <span>Đồng bộ gần nhất:</span>
          {source.lastSyncStatus ? (
            <StatusBadge status={source.lastSyncStatus} />
          ) : (
            <StatusBadge status="PENDING" label="Chưa đồng bộ" />
          )}
          <span className="tabular">{formatDateTime(source.lastSyncAt)}</span>
        </div>

        {source.lastError && (
          <Alert variant="destructive">
            <AlertTriangle />
            <AlertTitle>Lỗi kết nối gần nhất</AlertTitle>
            <AlertDescription>{source.lastError}</AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  )
}
