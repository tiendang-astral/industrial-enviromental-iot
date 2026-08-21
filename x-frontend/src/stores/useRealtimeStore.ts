import { create } from 'zustand'

export type RealtimeStatus = 'idle' | 'connecting' | 'connected' | 'disconnected'

interface RealtimeState {
  status: RealtimeStatus
  /** Thời điểm nhận reading gần nhất — footer hiển thị để người vận hành biết dữ liệu còn "sống". */
  lastMessageAt: number | null
  setStatus: (status: RealtimeStatus) => void
  markMessage: () => void
}

// Trạng thái kết nối STOMP là thông tin vận hành quan trọng (mất WS = số trên dashboard đứng yên
// nhưng trông vẫn bình thường), nên nâng lên store toàn cục để header/footer hiển thị được.
export const useRealtimeStore = create<RealtimeState>((set) => ({
  status: 'idle',
  lastMessageAt: null,
  setStatus: (status) => set({ status }),
  markMessage: () => set({ lastMessageAt: Date.now() }),
}))
