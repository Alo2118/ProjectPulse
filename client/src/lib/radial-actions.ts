import type { NavigateFunction } from 'react-router-dom'
import type { ResolvedPermissions } from '@/lib/permissions'
import type { Domain } from '@/hooks/ui/usePageContext'

export interface RadialAction {
  id: string
  label: string
  icon: string          // lucide icon name key (e.g., 'Plus', 'Edit', 'Trash')
  domain: Domain
  scope: 'list' | 'detail' | 'global'
  permission: (perms: ResolvedPermissions) => boolean
  action: (ctx: { navigate: NavigateFunction; entityId?: string }) => void
  shortcut?: string
  subActions?: RadialAction[]
}

// ─── Project actions ─────────────────────────────────────────────────────────

const projectListActions: RadialAction[] = [
  {
    id: 'project-create',
    label: 'Nuovo progetto',
    icon: 'Plus',
    domain: 'project',
    scope: 'list',
    permission: (p) => p.canCreate,
    action: ({ navigate }) => navigate('/projects/new'),
    shortcut: 'N',
  },
  {
    id: 'project-export',
    label: 'Esporta',
    icon: 'Download',
    domain: 'project',
    scope: 'list',
    permission: (p) => p.canExport,
    action: () => { /* handled by ExportButton in the page */ },
  },
]

const projectDetailActions: RadialAction[] = [
  {
    id: 'project-edit',
    label: 'Modifica',
    icon: 'Pencil',
    domain: 'project',
    scope: 'detail',
    permission: (p) => p.canEdit,
    action: ({ navigate, entityId }) => navigate(`/projects/${entityId ?? ''}/edit`),
  },
  {
    id: 'project-delete',
    label: 'Elimina',
    icon: 'Trash2',
    domain: 'project',
    scope: 'detail',
    permission: (p) => p.canDelete,
    action: () => { /* delete triggered via EntityDetail dialog */ },
  },
  {
    id: 'project-new-task',
    label: 'Nuovo task',
    icon: 'Plus',
    domain: 'project',
    scope: 'detail',
    permission: (p) => p.canCreate,
    action: ({ navigate, entityId }) => navigate(`/tasks/new?projectId=${entityId ?? ''}`),
  },
  {
    id: 'project-export-detail',
    label: 'Esporta',
    icon: 'Download',
    domain: 'project',
    scope: 'detail',
    permission: (p) => p.canExport,
    action: () => { /* handled by ExportButton in the page */ },
  },
]

// ─── Task actions ─────────────────────────────────────────────────────────────

const taskListActions: RadialAction[] = [
  {
    id: 'task-create',
    label: 'Nuovo task',
    icon: 'Plus',
    domain: 'task',
    scope: 'list',
    permission: (p) => p.canCreate,
    action: ({ navigate }) => navigate('/tasks/new'),
    shortcut: 'N',
  },
  {
    id: 'task-export',
    label: 'Esporta',
    icon: 'Download',
    domain: 'task',
    scope: 'list',
    permission: (p) => p.canExport,
    action: () => { /* handled by ExportButton in the page */ },
  },
]

const taskStatusSubActions: RadialAction[] = [
  {
    id: 'task-status-todo',
    label: 'Da fare',
    icon: 'Circle',
    domain: 'task',
    scope: 'detail',
    permission: (p) => p.canAdvancePhase,
    action: () => { /* status handled in page */ },
  },
  {
    id: 'task-status-in-progress',
    label: 'In corso',
    icon: 'Play',
    domain: 'task',
    scope: 'detail',
    permission: (p) => p.canAdvancePhase,
    action: () => { /* status handled in page */ },
  },
  {
    id: 'task-status-review',
    label: 'In revisione',
    icon: 'Eye',
    domain: 'task',
    scope: 'detail',
    permission: (p) => p.canAdvancePhase,
    action: () => { /* status handled in page */ },
  },
  {
    id: 'task-status-done',
    label: 'Completato',
    icon: 'CheckCircle2',
    domain: 'task',
    scope: 'detail',
    permission: (p) => p.canAdvancePhase,
    action: () => { /* status handled in page */ },
  },
]

const taskDetailActions: RadialAction[] = [
  {
    id: 'task-edit',
    label: 'Modifica',
    icon: 'Pencil',
    domain: 'task',
    scope: 'detail',
    permission: (p) => p.canEdit,
    action: ({ navigate, entityId }) => navigate(`/tasks/${entityId ?? ''}/edit`),
  },
  {
    id: 'task-delete',
    label: 'Elimina',
    icon: 'Trash2',
    domain: 'task',
    scope: 'detail',
    permission: (p) => p.canDelete,
    action: () => { /* delete triggered via EntityDetail dialog */ },
  },
  {
    id: 'task-change-status',
    label: 'Cambia stato',
    icon: 'RefreshCw',
    domain: 'task',
    scope: 'detail',
    permission: (p) => p.canAdvancePhase,
    action: () => { /* opens sub-menu */ },
    subActions: taskStatusSubActions,
  },
  {
    id: 'task-block',
    label: 'Blocca',
    icon: 'Ban',
    domain: 'task',
    scope: 'detail',
    permission: (p) => p.canBlock,
    action: () => { /* block handled in page */ },
  },
]

// ─── Risk actions ─────────────────────────────────────────────────────────────

const riskListActions: RadialAction[] = [
  {
    id: 'risk-create',
    label: 'Nuovo rischio',
    icon: 'Plus',
    domain: 'risk',
    scope: 'list',
    permission: (p) => p.canCreate,
    action: ({ navigate }) => navigate('/risks/new'),
    shortcut: 'N',
  },
]

const riskDetailActions: RadialAction[] = [
  {
    id: 'risk-edit',
    label: 'Modifica',
    icon: 'Pencil',
    domain: 'risk',
    scope: 'detail',
    permission: (p) => p.canEdit,
    action: ({ navigate, entityId }) => navigate(`/risks/${entityId ?? ''}/edit`),
  },
  {
    id: 'risk-delete',
    label: 'Elimina',
    icon: 'Trash2',
    domain: 'risk',
    scope: 'detail',
    permission: (p) => p.canDelete,
    action: () => { /* delete triggered via EntityDetail dialog */ },
  },
]

// ─── Document actions ─────────────────────────────────────────────────────────

const documentListActions: RadialAction[] = [
  {
    id: 'document-create',
    label: 'Nuovo documento',
    icon: 'Plus',
    domain: 'document',
    scope: 'list',
    permission: (p) => p.canCreate,
    action: ({ navigate }) => navigate('/documents/new'),
    shortcut: 'N',
  },
]

const documentDetailActions: RadialAction[] = [
  {
    id: 'document-edit',
    label: 'Modifica',
    icon: 'Pencil',
    domain: 'document',
    scope: 'detail',
    permission: (p) => p.canEdit,
    action: ({ navigate, entityId }) => navigate(`/documents/${entityId ?? ''}/edit`),
  },
  {
    id: 'document-delete',
    label: 'Elimina',
    icon: 'Trash2',
    domain: 'document',
    scope: 'detail',
    permission: (p) => p.canDelete,
    action: () => { /* delete triggered via EntityDetail dialog */ },
  },
  {
    id: 'document-approve',
    label: 'Approva',
    icon: 'CheckCircle2',
    domain: 'document',
    scope: 'detail',
    permission: (p) => p.canApprove,
    action: () => { /* approve handled in page */ },
  },
]

// ─── Input (user request) actions ─────────────────────────────────────────────

const inputListActions: RadialAction[] = [
  {
    id: 'input-create',
    label: 'Nuova segnalazione',
    icon: 'Plus',
    domain: 'input',
    scope: 'list',
    permission: (p) => p.canCreate,
    action: ({ navigate }) => navigate('/inputs/new'),
    shortcut: 'N',
  },
]

// ─── Global actions (always visible) ─────────────────────────────────────────

const globalActions: RadialAction[] = [
  {
    id: 'global-go-projects',
    label: 'Vai a Progetti',
    icon: 'FolderKanban',
    domain: 'project',
    scope: 'global',
    permission: () => true,
    action: ({ navigate }) => navigate('/projects'),
  },
  {
    id: 'global-go-tasks',
    label: 'Vai a Task',
    icon: 'CheckSquare',
    domain: 'task',
    scope: 'global',
    permission: () => true,
    action: ({ navigate }) => navigate('/tasks'),
  },
  {
    id: 'global-search',
    label: 'Cerca',
    icon: 'Search',
    domain: 'home',
    scope: 'global',
    permission: () => true,
    action: () => {
      // Dispatch Ctrl+K to open CommandPalette
      window.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true })
      )
    },
    shortcut: 'Ctrl+K',
  },
]

// ─── Registry lookup ──────────────────────────────────────────────────────────

const ACTION_REGISTRY: Record<Domain, Partial<Record<'list' | 'detail', RadialAction[]>>> = {
  project: { list: projectListActions, detail: projectDetailActions },
  task: { list: taskListActions, detail: taskDetailActions },
  risk: { list: riskListActions, detail: riskDetailActions },
  document: { list: documentListActions, detail: documentDetailActions },
  input: { list: inputListActions },
  time_entry: {},
  user: {},
  analytics: {},
  admin: {},
  home: {},
}

/**
 * Returns the filtered set of actions for a given domain + scope,
 * combining domain-specific and global actions, then filtering by permissions.
 */
export function getActionsForContext(
  domain: Domain,
  scope: 'list' | 'detail' | 'global',
  permissions: ResolvedPermissions
): RadialAction[] {
  const domainActions = ACTION_REGISTRY[domain]?.[scope as 'list' | 'detail'] ?? []
  const combined = scope === 'global' ? globalActions : [...domainActions, ...globalActions]
  return combined.filter((action) => action.permission(permissions))
}
