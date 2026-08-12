import { useQuery } from '@tanstack/react-query'
import { getMe } from '@/services/authService'
import { useAuthStore } from '@/stores/useAuthStore'

export function useMeQuery() {
  const accessToken = useAuthStore((state) => state.accessToken)

  return useQuery({
    queryKey: ['me'],
    queryFn: getMe,
    enabled: !!accessToken,
  })
}
