import { useCurrentUser } from '@/hooks/api/useAuth'
import { isPrivileged } from '@/lib/constants'

export function usePrivilegedRole() {
  const { data: user } = useCurrentUser()
  return {
    user,
    isPrivileged: user ? isPrivileged(user.role) : false,
    isAdmin: user?.role === 'admin',
    isGuest: user?.role === 'guest',
  }
}
