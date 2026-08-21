import { Moon, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useThemeStore } from '@/stores/useThemeStore'

/** Tách khỏi menu avatar: đổi sáng/tối là thao tác lặp nhiều, không nên nằm sau 2 lần click. */
export function ThemeToggle() {
  const theme = useThemeStore((state) => state.theme)
  const toggleTheme = useThemeStore((state) => state.toggleTheme)
  const label = theme === 'dark' ? 'Chuyển giao diện sáng' : 'Chuyển giao diện tối'

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={toggleTheme}
          className="text-surface-deep-muted hover:bg-surface-deep-hover hover:text-surface-deep-foreground"
        >
          {theme === 'dark' ? <Sun /> : <Moon />}
          <span className="sr-only">{label}</span>
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}
