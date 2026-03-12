import { useCallback, useRef } from 'react'
import { motion } from 'framer-motion'
import {
  Plus, Pencil, Trash2, Download, RefreshCw, Ban, CheckCircle2,
  FolderKanban, CheckSquare, AlertTriangle, FileText, Search,
  Play, Circle, Eye, ChevronRight, ArrowLeft,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useThemeConfig } from '@/hooks/ui/useThemeConfig'
import type { RadialAction } from '@/lib/radial-actions'

// ─── Icon resolution map ──────────────────────────────────────────────────────

const ICON_MAP: Record<string, LucideIcon> = {
  Plus,
  Pencil,
  Trash2,
  Download,
  RefreshCw,
  Ban,
  CheckCircle2,
  FolderKanban,
  CheckSquare,
  AlertTriangle,
  FileText,
  Search,
  Play,
  Circle,
  Eye,
  ChevronRight,
  ArrowLeft,
}

function resolveIcon(name: string): LucideIcon {
  return ICON_MAP[name] ?? Plus
}

// ─── RadialMenuItem ───────────────────────────────────────────────────────────

interface RadialMenuItemProps {
  action: RadialAction
  position: { x: number; y: number }
  index: number
  onActivate: (action: RadialAction) => void
  disabled?: boolean
}

export function RadialMenuItem({
  action,
  position,
  index,
  onActivate,
  disabled = false,
}: RadialMenuItemProps) {
  const { theme } = useThemeConfig()
  const buttonRef = useRef<HTMLButtonElement>(null)
  const Icon = resolveIcon(action.icon)
  const hasSubActions = Boolean(action.subActions?.length)

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        if (!disabled) onActivate(action)
      }
    },
    [action, disabled, onActivate]
  )

  const wrapperClass = cn(
    // Base: 48×48 circle button, absolutely positioned
    'absolute -translate-x-1/2 -translate-y-1/2',
    'flex flex-col items-center gap-0.5',
    'select-none cursor-pointer',
    disabled && 'opacity-40 pointer-events-none'
  )

  const buttonClass = cn(
    'h-12 w-12 flex items-center justify-center relative',
    'transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring',
    // Theme variants
    theme === 'office-classic' && [
      'bg-card border border-border shadow-sm rounded-lg',
      'hover:bg-accent hover:text-accent-foreground',
    ],
    theme === 'asana-like' && [
      'bg-card/90 backdrop-blur-sm rounded-full shadow-md',
      'hover:bg-accent hover:text-accent-foreground',
    ],
    theme === 'tech-hud' && [
      'bg-card/80 border border-primary/20 rounded-sm',
      'shadow-[0_0_8px] shadow-primary/20',
      'hover:border-primary/50 hover:shadow-primary/40',
    ]
  )

  return (
    <motion.div
      className={wrapperClass}
      style={{ left: position.x, top: position.y }}
      initial={{ opacity: 0, scale: 0 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0 }}
      transition={{
        type: 'spring',
        stiffness: 400,
        damping: 25,
        delay: index * 0.04,
      }}
    >
      <button
        ref={buttonRef}
        type="button"
        role="menuitem"
        aria-label={action.label}
        className={buttonClass}
        onClick={() => onActivate(action)}
        onKeyDown={handleKeyDown}
        tabIndex={0}
      >
        <Icon className="h-5 w-5" />
        {hasSubActions && (
          <ChevronRight className="absolute bottom-0.5 right-0.5 h-3 w-3 text-muted-foreground" />
        )}
      </button>
      <span className={cn('text-xs font-medium text-foreground max-w-[64px] text-center leading-tight')}>
        {action.label}
      </span>
    </motion.div>
  )
}
