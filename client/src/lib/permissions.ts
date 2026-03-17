export interface PermissionPolicy {
  role: string
  domain: string
  action: string
  allowed: boolean
}

export interface ResolvedPermissions {
  canView: boolean
  canCreate: boolean
  canEdit: boolean
  canDelete: boolean
  canAdvancePhase: boolean
  canBlock: boolean
  canAssign: boolean
  canLogTime: boolean
  canExport: boolean
  canManageTeam: boolean
  canEvaluate: boolean
  canConvert: boolean
  canApprove: boolean
}

export const ALL_PERMISSIONS: ResolvedPermissions = {
  canView: true,
  canCreate: true,
  canEdit: true,
  canDelete: true,
  canAdvancePhase: true,
  canBlock: true,
  canAssign: true,
  canLogTime: true,
  canExport: true,
  canManageTeam: true,
  canEvaluate: true,
  canConvert: true,
  canApprove: true,
}

export const NO_PERMISSIONS: ResolvedPermissions = {
  canView: false,
  canCreate: false,
  canEdit: false,
  canDelete: false,
  canAdvancePhase: false,
  canBlock: false,
  canAssign: false,
  canLogTime: false,
  canExport: false,
  canManageTeam: false,
  canEvaluate: false,
  canConvert: false,
  canApprove: false,
}

const ACTION_TO_KEY: Record<string, keyof ResolvedPermissions> = {
  view: 'canView',
  create: 'canCreate',
  edit: 'canEdit',
  delete: 'canDelete',
  advance_phase: 'canAdvancePhase',
  block: 'canBlock',
  assign: 'canAssign',
  export: 'canExport',
  manage_team: 'canManageTeam',
  evaluate: 'canEvaluate',
  convert: 'canConvert',
  approve: 'canApprove',
}

interface PermissionContext {
  user: { id: string; role: string }
  domain: string
  entity?: {
    creatorId?: string
    assigneeId?: string
    responsibleId?: string
  }
}

export function resolvePermissions(
  ctx: PermissionContext,
  policies: PermissionPolicy[]
): ResolvedPermissions {
  // Admin always gets everything
  if (ctx.user.role === 'admin') return ALL_PERMISSIONS

  // Start from no permissions
  const result = { ...NO_PERMISSIONS }

  // Apply policies for this role + domain
  for (const policy of policies) {
    if (policy.role === ctx.user.role && policy.domain === ctx.domain && policy.allowed) {
      const key = ACTION_TO_KEY[policy.action]
      if (key) result[key] = true
    }
  }

  // Automatic overrides based on entity ownership
  if (ctx.entity) {
    const isCreator = ctx.entity.creatorId === ctx.user.id
    const isAssignee = ctx.entity.assigneeId === ctx.user.id
    const isResponsible = ctx.entity.responsibleId === ctx.user.id

    if (isCreator) {
      result.canEdit = true
      result.canDelete = true
    }
    if (isAssignee || isResponsible) {
      result.canEdit = true
      result.canAdvancePhase = true
      result.canBlock = true
    }
  }

  // Anyone with view permission on time_entry domain can also log time
  if (result.canView && ctx.domain === 'time_entry') {
    result.canLogTime = true
  }

  return result
}
