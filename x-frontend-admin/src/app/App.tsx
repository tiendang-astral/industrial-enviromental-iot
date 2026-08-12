import { useEffect, useState } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from 'react-router-dom'
import { Toaster } from 'sonner'
import { queryClient } from '@/app/queryClient'
import { router } from '@/app/router'
import { httpClient } from '@/services/httpClient'
import { useAuthStore } from '@/stores/useAuthStore'
import type { ApiResponse } from '@/types/api'
import type { LoginResponse } from '@/types/auth'

function AuthBootstrap() {
  const [isBootstrapping, setIsBootstrapping] = useState(true)
  const setSession = useAuthStore((s) => s.setSession)

  useEffect(() => {
    let isMounted = true

    httpClient
      .post<ApiResponse<LoginResponse>>('/platform/auth/refresh')
      .then(({ data }) => {
        if (isMounted) {
          setSession(data.data!.accessToken, data.data!.user)
        }
      })
      .catch(() => {
        // No valid refresh cookie — user will land on /login via RequireAuth.
      })
      .finally(() => {
        if (isMounted) {
          setIsBootstrapping(false)
        }
      })

    return () => {
      isMounted = false
    }
    // Run once on app boot only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (isBootstrapping) {
    return (
      <div className="flex min-h-svh items-center justify-center text-sm text-muted-foreground">
        Đang tải...
      </div>
    )
  }

  return (
    <>
      <RouterProvider router={router} />
      <Toaster richColors position="top-right" />
    </>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthBootstrap />
    </QueryClientProvider>
  )
}
