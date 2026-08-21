import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Theme = 'light' | 'dark'

function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle('dark', theme === 'dark')
}

interface ThemeState {
  theme: Theme
  toggleTheme: () => void
}

// Mặc định light (không theo prefers-color-scheme): app quản trị làm việc với form/bảng,
// và giữ tương phản cố định với x-frontend (dark) để phân biệt ngay khi mở song song.
export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: 'light',
      toggleTheme: () => {
        const next: Theme = get().theme === 'dark' ? 'light' : 'dark'
        applyTheme(next)
        set({ theme: next })
      },
    }),
    { name: 'theme' }
  )
)

// zustand persist đọc localStorage đồng bộ lúc create() ở trên, nên state đã đúng ngay tại đây —
// apply trước khi React render lần đầu (import side-effect trong main.tsx) để tránh flash sai theme.
applyTheme(useThemeStore.getState().theme)
