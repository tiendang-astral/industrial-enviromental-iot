import { create } from 'zustand'

interface DashboardState {
  editMode: boolean
  toggleEditMode: () => void
}

/** UI/local state của trang Dashboard — không giữ data từ API (theo CONVENTIONS.md). */
export const useDashboardStore = create<DashboardState>((set) => ({
  editMode: false,
  toggleEditMode: () => set((state) => ({ editMode: !state.editMode })),
}))
