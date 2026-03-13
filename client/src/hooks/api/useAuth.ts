import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useThemeStore } from '@/stores/themeStore'
import type { User } from '@/types'

const AUTH_KEY = ['auth', 'me'] as const

export function useCurrentUser() {
  return useQuery<User>({
    queryKey: [...AUTH_KEY],
    queryFn: async () => {
      const { data } = await api.get('/auth/me')
      return data.data
    },
    retry: false,
    staleTime: 5 * 60 * 1000,
    enabled: !!localStorage.getItem('accessToken'),
  })
}

export function useLogin() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (credentials: { email: string; password: string }) => {
      const { data } = await api.post('/auth/login', credentials)
      return data.data as { token: string; refreshToken: string; user: User }
    },
    onSuccess: (data) => {
      localStorage.setItem('accessToken', data.token)
      localStorage.setItem('refreshToken', data.refreshToken)
      qc.setQueryData([...AUTH_KEY], data.user)

      // Sync theme preferences from server
      // Backend fields: theme = light/dark/system, themeStyle = tech-hud/basic/classic
      const user = data.user
      if (user.theme || user.themeStyle) {
        useThemeStore.getState().initFromServer(user.theme, user.themeStyle)
      }
    },
  })
}

export function useLogout() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api.post('/auth/logout'),
    onSettled: () => {
      localStorage.removeItem('accessToken')
      localStorage.removeItem('refreshToken')
      qc.clear()
      window.location.href = '/login'
    },
  })
}
