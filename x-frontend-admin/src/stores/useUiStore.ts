import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface UiState {
  /** Sidebar nav. Lưu localStorage (scope theo origin gồm cả port) thay vì cookie mặc định của
   *  shadcn Sidebar — cookie không phân biệt port nên 2 app sẽ ghi đè trạng thái của nhau. */
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      sidebarOpen: true,
      setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
    }),
    { name: 'ui-prefs' }
  )
)
