import { HelpCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { CURSOR_TOKEN } from '@/lib/externalSourceJobSchema'

/** Một vòng chạy giả lập — cho thấy mốc dịch lên sau mỗi lần, thứ khó nói bằng lời. */
const CYCLES = [
  { run: 'lần 1', bound: '01/01/1970', read: '500 dòng' },
  { run: 'lần 2', bound: '08:15', read: '12 dòng' },
  { run: 'lần 3', bound: '08:20', read: '9 dòng' },
]

/**
 * Dạy `:cursor` bằng hai lớp: dòng luôn hiện cho thấy nó SẼ BIẾN THÀNH GÌ ở lần chạy tới, và
 * popover giải thích VÌ SAO cho ai muốn biết. Đặt giá trị cạnh chỗ trống là cách gọn nhất để nói
 * "đây là tham số, không phải cú pháp lạ" — không đoạn văn nào làm được điều đó bằng.
 */
export function CursorExplainer({ nextValue }: { nextValue: string }) {
  return (
    <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[12.5px] text-muted-foreground">
      <span>Lần chạy tới,</span>
      <code className="rounded-sm bg-warning/15 px-1 font-mono text-warning">{CURSOR_TOKEN}</code>
      <span>=</span>
      <span className="tabular font-medium text-foreground">{nextValue}</span>

      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="icon" className="size-5 text-muted-foreground">
            <HelpCircle />
            <span className="sr-only">{CURSOR_TOKEN} là gì</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-96">
          <div className="flex flex-col gap-3">
            <p className="text-sm font-medium">{CURSOR_TOKEN} là gì</p>
            <p className="text-[12.5px] text-muted-foreground">
              Job chạy lặp theo lịch. Mỗi lần chạy, hệ thống thay{' '}
              <code className="font-mono text-warning">{CURSOR_TOKEN}</code> bằng mốc thời gian của
              dòng cuối cùng đã đọc lần trước — nhờ vậy lần sau chỉ lấy dòng mới.
            </p>

            <div className="flex flex-col gap-1 rounded-md border border-border bg-muted/30 p-2.5 font-mono text-[11.5px]">
              {CYCLES.map((cycle) => (
                <div key={cycle.run} className="flex items-center gap-2">
                  <span className="w-11 shrink-0 text-muted-foreground">{cycle.run}</span>
                  <span className="text-foreground/90">
                    &gt; <span className="text-warning">{cycle.bound}</span>
                  </span>
                  <span className="ml-auto text-muted-foreground">{cycle.read}</span>
                </div>
              ))}
            </div>

            <p className="text-[12.5px] text-muted-foreground">
              Không có nó, mỗi lần chạy đều quét lại toàn bộ bảng của bạn từ đầu.
            </p>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}
