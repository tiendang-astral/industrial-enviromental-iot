export type PlatformUserStatus = 'ACTIVE' | 'LOCKED'

export interface PlatformUser {
  id: number
  username: string
  fullName: string
  email: string
  status: PlatformUserStatus
  createdAt: string
}

export interface CreatePlatformUserRequest {
  username: string
  fullName: string
  email?: string
  password: string
}
