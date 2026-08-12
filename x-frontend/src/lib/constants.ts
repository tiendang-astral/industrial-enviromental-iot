export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080/api/v1'

/** Endpoint STOMP WebSocket — cùng host với API_BASE_URL, bỏ /api/v1, đổi http(s) -> ws(s). */
export const WS_BASE_URL =
  import.meta.env.VITE_WS_BASE_URL ?? API_BASE_URL.replace(/\/api\/v1\/?$/, '').replace(/^http/, 'ws') + '/ws'
