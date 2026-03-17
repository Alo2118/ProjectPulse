import { z } from 'zod'

const ROLES = ['admin', 'direzione', 'dipendente', 'guest'] as const
const DOMAINS = ['project', 'task', 'risk', 'document', 'input', 'time_entry', 'user', 'analytics'] as const
const ACTIONS = ['view', 'create', 'edit', 'delete', 'advance_phase', 'block', 'assign', 'export', 'manage_team', 'approve', 'evaluate', 'convert'] as const

export const policySchema = z.object({
  role: z.enum(ROLES),
  domain: z.enum(DOMAINS),
  action: z.enum(ACTIONS),
  allowed: z.boolean(),
})

export const updatePoliciesSchema = z.object({
  policies: z.array(policySchema).min(1).max(500),
})

export { ROLES, DOMAINS, ACTIONS }
