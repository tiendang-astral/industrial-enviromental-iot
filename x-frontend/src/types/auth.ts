export type UserType = 'PLATFORM' | 'TENANT'

export interface MeResponse {
  id: number
  username: string
  fullName: string
  email: string
  type: UserType
  tenantId: number | null
  authorities: string[]
  organizationPath: string | null
}

export interface LoginRequest {
  username: string
  password: string
}

export interface LoginResponse {
  accessToken: string
  expiresIn: number
  user: MeResponse
}

export interface ChangePasswordRequest {
  currentPassword: string
  newPassword: string
}

export interface UpdateMeRequest {
  fullName: string
  email: string | null
}
