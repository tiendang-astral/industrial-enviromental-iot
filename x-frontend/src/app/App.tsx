import { useEffect, useState } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from 'react-router-dom'
import { Toaster } from 'sonner'
import { queryClient } from '@/app/queryClient'
import { router } from '@/app/router'
import { refresh } from '@/services/authService'
import { useAuthStore } from '@/stores/useAuthStore'
import { useThemeStore } from '@/stores/useThemeStore'

/**
 * Attempts a silent `/auth/refresh` once on app boot, using the httpOnly
 * refresh cookie the browser sends automatically. This is what lets a
 * logged-in session survive a full page refresh. Falls through to the
 * `/login` route (via RequireAuth) if there is no valid cookie.
 */
function AuthBootstrap({ children }: { children: React.ReactNode }) {
  const [isReady, setIsReady] = useState(false)
  const setSession = useAuthStore((state) => state.setSession)

  useEffect(() => {
    let isMounted = true

    refresh()
      .then((data) => {
        if (!isMounted) return
        setSession(data.accessToken, data.user)
        queryClient.setQueryData(['me'], data.user)
      })
      .catch(() => {
        // No valid refresh cookie — stay logged out.
      })
      .finally(() => {
        if (isMounted) setIsReady(true)
      })

    return () => {
      isMounted = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!isReady) {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <p className="text-sm text-muted-foreground">Đang tải...</p>
      </div>
    )
  }

  return <>{children}</>
}

export default function App() {
  // sonner mặc định theme="light" — không truyền prop thì toast trắng lốp trên nền dark.
  const theme = useThemeStore((state) => state.theme)

  return (
    <QueryClientProvider client={queryClient}>
      <AuthBootstrap>
        <RouterProvider router={router} />
      </AuthBootstrap>
      <Toaster theme={theme} richColors closeButton position="top-right" />
    </QueryClientProvider>
  )
}
