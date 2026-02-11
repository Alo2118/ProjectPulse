import {
  Clipboard,
  Zap,
  Eye,
  Ban,
  CheckCircle2,
  XCircle,
  Ruler,
  Palette,
  Search,
  CheckSquare,
  Rocket,
  Wrench,
  Trophy,
  PauseCircle,
} from 'lucide-react'
import type { TaskStatus, TaskPriority, ProjectStatus } from '../../types'

type StatusIconType = 'taskStatus' | 'taskPriority' | 'projectStatus' | 'riskLevel'

interface StatusIconProps {
  type: StatusIconType
  value: string
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
  className?: string
}

const ICON_SIZES = { sm: 14, md: 18, lg: 24 } as const
const TEXT_SIZES = { sm: 'text-xs', md: 'text-sm', lg: 'text-base' } as const

const TASK_STATUS_CONFIG: Record<TaskStatus, { emoji: string; icon: typeof Clipboard; color: string; label: string; pulse?: boolean }> = {
  todo: { emoji: '\u{1F4CB}', icon: Clipboard, color: 'text-gray-400', label: 'To Do' },
  in_progress: { emoji: '\u26A1', icon: Zap, color: 'text-blue-500', label: 'In Progress' },
  review: { emoji: '\u{1F441}\uFE0F', icon: Eye, color: 'text-violet-500', label: 'Review' },
  blocked: { emoji: '\u{1F6AB}', icon: Ban, color: 'text-red-500 animate-pulse', label: 'Blocked', pulse: true },
  done: { emoji: '\u2705', icon: CheckCircle2, color: 'text-green-500', label: 'Done' },
  cancelled: { emoji: '\u274C', icon: XCircle, color: 'text-gray-500', label: 'Cancelled' },
}

const TASK_PRIORITY_CONFIG: Record<TaskPriority, { emoji: string; color: string; label: string; glow?: string }> = {
  low: { emoji: '\u{1F7E2}', color: 'text-green-500', label: 'Low' },
  medium: { emoji: '\u{1F7E1}', color: 'text-amber-500', label: 'Medium' },
  high: { emoji: '\u{1F7E0}', color: 'text-orange-500', label: 'High' },
  critical: { emoji: '\u{1F534}', color: 'text-red-500 animate-pulse', label: 'Critical', glow: 'drop-shadow-[0_0_6px_rgba(239,68,68,0.6)]' },
}

const PROJECT_STATUS_CONFIG: Record<ProjectStatus, { emoji: string; icon: typeof Clipboard; color: string; label: string }> = {
  planning: { emoji: '\u{1F4D0}', icon: Ruler, color: 'text-blue-400', label: 'Planning' },
  design: { emoji: '\u{1F3A8}', icon: Palette, color: 'text-purple-500', label: 'Design' },
  verification: { emoji: '\u{1F50D}', icon: Search, color: 'text-cyan-500', label: 'Verification' },
  validation: { emoji: '\u2705', icon: CheckSquare, color: 'text-green-500', label: 'Validation' },
  transfer: { emoji: '\u{1F680}', icon: Rocket, color: 'text-orange-500', label: 'Transfer' },
  maintenance: { emoji: '\u{1F527}', icon: Wrench, color: 'text-gray-500', label: 'Maintenance' },
  completed: { emoji: '\u{1F3C6}', icon: Trophy, color: 'text-yellow-500', label: 'Completed' },
  on_hold: { emoji: '\u23F8\uFE0F', icon: PauseCircle, color: 'text-gray-400', label: 'On Hold' },
  cancelled: { emoji: '\u274C', icon: XCircle, color: 'text-gray-500', label: 'Cancelled' },
}

const RISK_LEVEL_CONFIG: Record<string, { emoji: string; color: string; label: string; glow?: string }> = {
  low: { emoji: '\u{1F7E2}', color: 'text-green-500', label: 'Low' },
  medium: { emoji: '\u{1F7E1}', color: 'text-amber-500', label: 'Medium' },
  high: { emoji: '\u{1F534}', color: 'text-red-500 animate-pulse', label: 'High', glow: 'drop-shadow-[0_0_6px_rgba(239,68,68,0.6)]' },
}

export function StatusIcon({ type, value, size = 'md', showLabel = false, className = '' }: StatusIconProps) {
  const iconSize = ICON_SIZES[size]
  const textSize = TEXT_SIZES[size]

  let config: { emoji: string; icon?: typeof Clipboard; color: string; label: string; glow?: string; pulse?: boolean } | undefined

  switch (type) {
    case 'taskStatus':
      config = TASK_STATUS_CONFIG[value as TaskStatus]
      break
    case 'taskPriority':
      config = TASK_PRIORITY_CONFIG[value as TaskPriority]
      break
    case 'projectStatus':
      config = PROJECT_STATUS_CONFIG[value as ProjectStatus]
      break
    case 'riskLevel':
      config = RISK_LEVEL_CONFIG[value]
      break
  }

  if (!config) return null

  const Icon = config.icon

  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      <span className={`${config.color} ${config.glow ?? ''}`}>
        {Icon ? (
          <Icon size={iconSize} />
        ) : (
          <span className={textSize}>{config.emoji}</span>
        )}
      </span>
      {showLabel && (
        <span className={`${textSize} ${config.color} font-medium`}>
          {config.label}
        </span>
      )}
    </span>
  )
}
