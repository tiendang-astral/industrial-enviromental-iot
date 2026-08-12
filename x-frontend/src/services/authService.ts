import { httpClient } from '@/services/httpClient'
import type { ApiEnvelope } from '@/types/api'
import type { ChangePasswordRequest, LoginRequest, LoginResponse, MeResponse } from '@/types/auth'

export async function login(payload: LoginRequest): Promise<LoginResponse> {
  const { data } = await httpClient.post<ApiEnvelope<LoginResponse>>('/tenant/auth/login', payload)
  return data.data!
}

export async function refresh(): Promise<LoginResponse> {
  const { data } = await httpClient.post<ApiEnvelope<LoginResponse>>('/tenant/auth/refresh')
  return data.data!
}

export async function logout(): Promise<void> {
  await httpClient.post('/tenant/auth/logout')
}

export async function getMe(): Promise<MeResponse> {
  const { data } = await httpClient.get<ApiEnvelope<MeResponse>>('/me')
  return data.data!
}

export async function changePassword(payload: ChangePasswordRequest): Promise<void> {
  await httpClient.put('/auth/password', payload)
}
