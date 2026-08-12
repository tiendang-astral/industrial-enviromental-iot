import { create } from 'zustand'
import { registerAuthCallbacks, setAccessToken } from '@/services/httpClient'
import type { MeResponse } from '@/types/auth'

interface AuthState {
  accessToken: string | null
  user: MeResponse | null
  setSession: (accessToken: string, user: MeResponse) => void
  clearSession: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  user: null,
  setSession: (accessToken, user) => {
    setAccessToken(accessToken)
    set({ accessToken, user })
  },
  clearSession: () => {
    setAccessToken(null)
    set({ accessToken: null, user: null })
  },
}))

// httpClient tự refresh token khi 401 (interceptor) — đăng ký callback ở đây để
// cập nhật/xóa session mà không cần httpClient import ngược lại store này.
registerAuthCallbacks({
  onTokenRefreshed: (data) => useAuthStore.getState().setSession(data.accessToken, data.user),
  onSessionExpired: () => useAuthStore.getState().clearSession(),
})
