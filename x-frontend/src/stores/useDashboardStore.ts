import { create } from 'zustand'

interface DashboardState {
  /**
   * Board đang ở chế độ chỉnh sửa, định danh `node:{id}` / `source:{id}` — không phải cờ boolean
   * dùng chung. Một lúc chỉ sửa được một board, nên đổi tab/đơn vị/nguồn là board mới về chế độ
   * xem ngay, không thừa hưởng trạng thái sửa của board trước.
   */
  editingBoardKey: string | null
  /** Bản nháp có thay đổi chưa ghi lên server — chặn rời đi khi đang bật. */
  dirty: boolean
  toggleEditMode: (boardKey: string) => void
  markDirty: () => void
  /** Đã ghi xong nhưng VẪN ở chế độ sửa (áp mẫu) — khác `exitEdit` là thoát hẳn. */
  clearDirty: () => void
  /**
   * Băng cảnh báo đã tắt ở board nào, tính tới alert id nào. Lưu mốc id chứ không lưu cờ boolean:
   * tắt xong mà cảnh báo MỚI về thì băng phải hiện lại, nếu không người trực ca tắt một lần là mù
   * luôn phần còn lại của phiên.
   */
  dismissedAlertBanner: Record<string, number>
  dismissAlertBanner: (boardKey: string, latestAlertId: number) => void
  /** Thoát chế độ sửa và bỏ bản nháp — board tự đồng bộ lại từ server khi `editingBoardKey` rỗng. */
  exitEdit: () => void
}

/** UI/local state của trang Dashboard — không giữ data từ API (theo CONVENTIONS.md). */
export const useDashboardStore = create<DashboardState>((set) => ({
  editingBoardKey: null,
  dirty: false,
  toggleEditMode: (boardKey) =>
    set((state) => ({
      editingBoardKey: state.editingBoardKey === boardKey ? null : boardKey,
      dirty: false,
    })),
  markDirty: () => set({ dirty: true }),
  clearDirty: () => set({ dirty: false }),
  dismissedAlertBanner: {},
  dismissAlertBanner: (boardKey, latestAlertId) =>
    set((state) => ({
      dismissedAlertBanner: { ...state.dismissedAlertBanner, [boardKey]: latestAlertId },
    })),
  exitEdit: () => set({ editingBoardKey: null, dirty: false }),
}))
