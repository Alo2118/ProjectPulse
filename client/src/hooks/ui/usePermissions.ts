import { useMemo } from 'react'
import { usePermissionPoliciesQuery } from '@/hooks/api/usePermissionPolicies'
import { resolvePermissions, NO_PERMISSIONS, type ResolvedPermissions } from '@/lib/permissions'
import { useCurrentUser } from '@/hooks/api/useAuth'

interface EntityRef {
  creatorId?: string
  assigneeId?: string
  responsibleId?: string
}

export function usePermissions(domain?: string, entity?: EntityRef): ResolvedPermissions {
  const { data: policies } = usePermissionPoliciesQuery()
  const { data: user } = useCurrentUser()

  return useMemo(() => {
    if (!policies || !domain || !user) {
      return NO_PERMISSIONS
    }

    return resolvePermissions(
      { user: { id: user.id, role: user.role }, domain, entity },
      policies
    )
  }, [policies, domain, entity, user])
}
