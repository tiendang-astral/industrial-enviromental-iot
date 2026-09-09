import { ChartSpline, FileBarChart, Table2, TriangleAlert } from 'lucide-react'

/** Ba phần một báo cáo sẽ dựng ra, theo đúng thứ tự chúng xuất hiện. */
const SECTIONS = [
  { icon: Table2, label: 'Bảng số đo theo kênh' },
  { icon: ChartSpline, label: 'Biểu đồ theo nhóm' },
  { icon: TriangleAlert, label: 'Thống kê sự cố' },
]

/**
 * Trạng thái trước khi bấm "Tạo báo cáo".
 *
 * Cố tình KHÔNG mô phỏng bố cục báo cáo bằng các khối xám: nhìn ra y hệt `ReportSkeleton`, người
 * dùng sẽ tưởng trang đang tải. Thay vào đó liệt kê ba phần báo cáo sẽ dựng ra — vừa lấp được
 * khoảng cao, vừa nói trước sẽ nhận được gì, mà không cần một câu hướng dẫn nào.
 */
export function ReportPlaceholder() {
  return (
    <div className="relative flex min-h-100 flex-1 items-center justify-center overflow-hidden rounded-lg border border-border bg-muted/40 px-6 py-16">
      {/* Vệt sáng rất nhạt sau khối icon để tâm điểm không phẳng lì với mặt nền. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_50%_at_50%_38%,var(--color-foreground)_0%,transparent_70%)] opacity-[0.04]"
      />

      <div className="relative flex flex-col items-center gap-8 text-center">
        <div className="flex flex-col items-center gap-4">
          <span className="flex size-14 items-center justify-center rounded-2xl border border-border bg-card text-muted-foreground shadow-sm ring-4 ring-border/20">
            <FileBarChart className="size-6" />
          </span>
          <p className="text-base font-medium">Chưa tạo báo cáo</p>
        </div>

        <ul className="flex flex-col items-stretch gap-2 sm:flex-row sm:gap-3">
          {SECTIONS.map((section) => (
            <li
              key={section.label}
              className="flex items-center gap-2 rounded-lg border border-border/70 bg-card/60 px-3 py-2 text-sm text-muted-foreground"
            >
              <section.icon className="size-4 shrink-0" />
              {section.label}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
