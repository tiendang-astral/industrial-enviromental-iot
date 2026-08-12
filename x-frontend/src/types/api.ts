export interface ApiError {
  code: string
  message: string
}

export interface ApiEnvelope<T> {
  data: T | null
  error: ApiError | null
}
