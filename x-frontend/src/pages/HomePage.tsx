import { useMeQuery } from '@/queries/useMeQuery'

export default function HomePage() {
  const { data: me } = useMeQuery()

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="w-full max-w-md rounded-xl border border-border bg-background p-6 text-center shadow-sm">
        <h1 className="text-xl font-semibold text-foreground">
          Chào {me?.fullName ?? me?.username ?? ''}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Dashboard tùy biến sẽ có ở giai đoạn tiếp theo (Phase 4). Hiện tại đây là trang chủ tạm
          thời sau khi đăng nhập.
        </p>
      </div>
    </div>
  )
}
