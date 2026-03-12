import type { LucideIcon } from 'lucide-react'
import {
  FolderKanban, Flag, CheckSquare, GitBranch,
  AlertTriangle, FileText, Users, MessageSquarePlus,
} from 'lucide-react'
import type { ThemeStyle } from '@/types'

// Domain icons — same Lucide icons for all themes
export const DOMAIN_ICONS: Record<string, LucideIcon> = {
  project: FolderKanban,
  milestone: Flag,
  task: CheckSquare,
  subtask: GitBranch,
  risk: AlertTriangle,
  document: FileText,
  user: Users,
  input: MessageSquarePlus,
}

// Domain labels (Italian)
export const DOMAIN_LABELS: Record<string, string> = {
  project: 'Progetti',
  milestone: 'Milestone',
  task: 'Task',
  subtask: 'Subtask',
  risk: 'Rischi',
  document: 'Documenti',
  user: 'Utenti',
  input: 'Richieste',
}

// Icon wrapper styles per theme
export const ICON_STYLES: Record<ThemeStyle, {
  wrapper: string
  hover: string
}> = {
  'office-classic': {
    wrapper: 'p-1.5',
    hover: '',
  },
  'asana-like': {
    wrapper: 'p-2 rounded-full',
    hover: 'hover:scale-110 transition-transform',
  },
  'tech-hud': {
    wrapper: 'p-1.5',
    hover: 'hover:drop-shadow-[0_0_6px_currentColor] transition-all',
  },
}

export function getIconWrapperClass(theme: ThemeStyle, domainColor: string): string {
  const base = ICON_STYLES[theme]
  const asanaColorBg = domainColor.replace('text-', 'bg-').replace('-800', '-100')
  const asanaDarkBg = domainColor.replace('text-', 'dark:bg-').replace('-800', '-900/20').replace('-400', '-900/20')

  switch (theme) {
    case 'asana-like':
      return `${base.wrapper} ${asanaColorBg} ${asanaDarkBg} ${base.hover}`
    case 'tech-hud':
      return `${base.wrapper} shadow-[0_0_6px] shadow-current/40 ${base.hover}`
    default:
      return `${base.wrapper} ${base.hover}`
  }
}

// Emojis per theme
export const THEME_EMOJIS: Record<ThemeStyle, {
  completed: string
  inProgress: string
  blocked: string
  new: string
  success: string
  error: string
  warning: string
}> = {
  'office-classic': {
    completed: '✅',
    inProgress: '🔄',
    blocked: '🛑',
    new: '📄',
    success: '✅',
    error: '❌',
    warning: '⚠️',
  },
  'asana-like': {
    completed: '🎉',
    inProgress: '🚀',
    blocked: '😟',
    new: '✨',
    success: '🎊',
    error: '😥',
    warning: '🤔',
  },
  'tech-hud': {
    completed: '⚡',
    inProgress: '▶️',
    blocked: '🔴',
    new: '🔧',
    success: '✔️',
    error: '⛔',
    warning: '⚠️',
  },
}

// Animation config per theme
export const THEME_ANIMATIONS: Record<ThemeStyle, {
  pageTransition: { duration: number; ease: string }
  listStagger: number
  hoverScale: number
  openDuration: number
}> = {
  'office-classic': {
    pageTransition: { duration: 0.15, ease: 'easeOut' },
    listStagger: 0,
    hoverScale: 1.0,
    openDuration: 0.15,
  },
  'asana-like': {
    pageTransition: { duration: 0.2, ease: 'easeOut' },
    listStagger: 0.03,
    hoverScale: 1.08,
    openDuration: 0.2,
  },
  'tech-hud': {
    pageTransition: { duration: 0.22, ease: 'easeOut' },
    listStagger: 0.05,
    hoverScale: 1.0,
    openDuration: 0.2,
  },
}
