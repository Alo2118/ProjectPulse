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

// Visual effects per theme (card styles, badges, progress bars, KPIs)
export const THEME_EFFECTS = {
  'office-classic': {
    cardHover: 'hover:bg-muted/50 transition-colors duration-150',
    cardShadow: 'shadow-sm',
    cardBorder: 'border',
    badgeStyle: 'border',
    progressStyle: 'rounded-sm',
    kpiStyle: 'bg-card',
    transitionDuration: 150,
    transitionType: 'ease' as const,
  },
  'asana-like': {
    cardHover: 'hover:scale-[1.01] hover:bg-accent/10 transition-all duration-200',
    cardShadow: 'shadow-md',
    cardBorder: 'border border-border/50',
    badgeStyle: 'rounded-full bg-opacity-20',
    progressStyle: 'rounded-full',
    kpiStyle: 'bg-gradient-to-br from-card to-accent/5',
    transitionDuration: 200,
    transitionType: 'spring' as const,
  },
  'tech-hud': {
    cardHover: 'hover:border-primary/30 hover:shadow-[0_0_6px] hover:shadow-primary/20 transition-all duration-[250ms]',
    cardShadow: 'shadow-[0_0_8px] shadow-primary/10',
    cardBorder: 'border border-primary/10',
    badgeStyle: 'border border-primary/20 font-mono text-xs',
    progressStyle: 'rounded shadow-[0_0_4px] shadow-primary/20',
    kpiStyle: 'bg-card border border-primary/10 shadow-[0_0_6px] shadow-primary/5',
    transitionDuration: 250,
    transitionType: 'ease' as const,
  },
} as const

export type ThemeEffects = typeof THEME_EFFECTS[keyof typeof THEME_EFFECTS]

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
