import type { LucideIcon } from 'lucide-react'
import { FolderKanban, Flag, CheckSquare, GitBranch, AlertTriangle, FileText, Users } from 'lucide-react'

export const DOMAIN_ICONS: Record<string, LucideIcon> = {
  project: FolderKanban,
  milestone: Flag,
  task: CheckSquare,
  subtask: GitBranch,
  risk: AlertTriangle,
  document: FileText,
  team: Users,
}

export const THEME_EMOJIS = {
  'tech-hud': {
    completed: '⚡', inProgress: '▶️', blocked: '🔴',
    new: '🔧', success: '✔️', error: '⛔', warning: '⚠️',
  },
  'office-classic': {
    completed: '✅', inProgress: '🔄', blocked: '🛑',
    new: '📄', success: '✅', error: '❌', warning: '⚠️',
  },
  'asana-like': {
    completed: '🎉', inProgress: '🚀', blocked: '😟',
    new: '✨', success: '🎊', error: '😥', warning: '🤔',
  },
} as const

export type ThemeName = keyof typeof THEME_EMOJIS
export type DomainKey = keyof typeof DOMAIN_ICONS
