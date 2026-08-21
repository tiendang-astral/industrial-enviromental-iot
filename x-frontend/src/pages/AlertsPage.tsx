import { AlertTriangle } from 'lucide-react'

export default function AlertsPage() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-center text-muted-foreground">
      <AlertTriangle className="size-8" />
      <p className="text-sm">Tính năng Cảnh báo đang được phát triển</p>
    </div>
  )
}
