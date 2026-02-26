/**
 * TaskTreeView - Hierarchical view of projects, tasks and subtasks
 * Supports multiple modes: compact (dashboard), full (reports/tasks page)
 * @module components/reports/TaskTreeView
 */

import { useEffect, useMemo, memo, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { useTaskTreeStore } from '@stores/taskTreeStore'
import { useTaskStore } from '@stores/taskStore'
import {
  ChevronRight,
  FolderKanban,
  CheckSquare,
  Loader2,
  Clock,
  AlertTriangle,
  CheckCircle,
  Circle,
  Pause,
  XCircle,
  ChevronDown,
  ChevronUp,
  BarChart3,
  Filter,
  Play,
  Square,
  Target,
  Link2,
  ArrowRightCircle,
} from 'lucide-react'
import type { ProjectNode, TaskNode, SubtaskNode, MilestoneNode, TaskTreeStats, TaskStatus, TaskPriority } from '@/types'
import { EmptyState } from '@/components/common/EmptyState'
import { DepartmentBadge } from '@/components/ui/DepartmentBadge'
import { InlineSelect } from '@components/ui/InlineSelect'
import type { InlineSelectOption } from '@components/ui/InlineSelect'
import { InlineUserSelect } from '@components/ui/InlineUserSelect'
import { getAvatarColorByName } from '@utils/avatarColors'
import { formatHoursFromDecimal } from '@utils/dateFormatters'

interface TaskTreeViewProps {
  /** Display mode */
  mode?: 'compact' | 'full'
  /** Show only user's assigned tasks */
  myTasksOnly?: boolean
  /** Filter by specific user ID */
  filterUserId?: string
  /** Hide completed tasks */
  excludeCompleted?: boolean
  /** Show summary cards at top */
  showSummary?: boolean
  /** Show expand/collapse controls */
  showControls?: boolean
  /** Show filter controls */
  showFilters?: boolean
  /** Maximum tree depth to show (0 = unlimited) */
  maxDepth?: number
  /** Project ID to filter */
  projectId?: string
  /** Parent task ID - shows only subtasks of this task */
  parentTaskId?: string
  /** Skip the project level, render milestones/tasks directly */
  skipProjectLevel?: boolean
  /** Callback when timer button is clicked */
  onTimerToggle?: (taskId: string) => void
  /** Currently running timer task ID */
  runningTimerId?: string | null
  /** Whether user can track time */
  canTrackTime?: boolean
  /** Custom class name */
  className?: string
  /** Enable inline editing of status, priority, assignee */
  editable?: boolean
}


const STATUS_CONFIG: Record<string, { color: string; icon: React.ElementType; label: string }> = {
  todo: { color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300', icon: Circle, label: 'Da fare' },
  in_progress: { color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', icon: Loader2, label: 'In corso' },
  review: { color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400', icon: CheckSquare, label: 'Review' },
  blocked: { color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', icon: AlertTriangle, label: 'Bloccato' },
  done: { color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', icon: CheckCircle, label: 'Completato' },
  cancelled: { color: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-500', icon: XCircle, label: 'Annullato' },
  planning: { color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300', icon: Circle, label: 'Pianificazione' },
  design: { color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', icon: Loader2, label: 'Design' },
  verification: { color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400', icon: CheckSquare, label: 'Verifica' },
  validation: { color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400', icon: CheckSquare, label: 'Validazione' },
  transfer: { color: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400', icon: CheckSquare, label: 'Transfer' },
  maintenance: { color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400', icon: Pause, label: 'Manutenzione' },
  completed: { color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', icon: CheckCircle, label: 'Completato' },
  on_hold: { color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400', icon: Pause, label: 'In pausa' },
}

const PRIORITY_CONFIG: Record<string, { bg: string; text: string; dot: string; label: string }> = {
  low: { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-500 dark:text-gray-400', dot: 'bg-gray-400', label: 'Bassa' },
  medium: { bg: 'bg-yellow-50 dark:bg-yellow-900/20', text: 'text-yellow-700 dark:text-yellow-400', dot: 'bg-yellow-500', label: 'Media' },
  high: { bg: 'bg-orange-50 dark:bg-orange-900/20', text: 'text-orange-700 dark:text-orange-400', dot: 'bg-orange-500', label: 'Alta' },
  critical: { bg: 'bg-red-50 dark:bg-red-900/20', text: 'text-red-700 dark:text-red-400', dot: 'bg-red-500', label: 'Critica' },
}

const STATUS_OPTIONS: InlineSelectOption[] = [
  { value: 'todo', label: 'Da fare', color: 'text-gray-400', bgColor: 'bg-gray-100 dark:bg-gray-800' },
  { value: 'in_progress', label: 'In Corso', color: 'text-blue-500', bgColor: 'bg-blue-100 dark:bg-blue-900/30' },
  { value: 'review', label: 'Review', color: 'text-violet-500', bgColor: 'bg-violet-100 dark:bg-violet-900/30' },
  { value: 'blocked', label: 'Bloccato', color: 'text-red-500', bgColor: 'bg-red-100 dark:bg-red-900/30' },
  { value: 'done', label: 'Completato', color: 'text-green-500', bgColor: 'bg-green-100 dark:bg-green-900/30' },
  { value: 'cancelled', label: 'Annullato', color: 'text-gray-500', bgColor: 'bg-gray-100 dark:bg-gray-800' },
]

const PRIORITY_OPTIONS: InlineSelectOption[] = [
  { value: 'low', label: 'Bassa', dotColor: 'bg-green-500' },
  { value: 'medium', label: 'Media', dotColor: 'bg-amber-500' },
  { value: 'high', label: 'Alta', dotColor: 'bg-orange-500' },
  { value: 'critical', label: 'Critica', dotColor: 'bg-red-500' },
]

/**
 * Status badge component
 */
const StatusBadge = memo(function StatusBadge({ status, compact = false }: { status: string; compact?: boolean }) {
  const { color, icon: Icon, label } = STATUS_CONFIG[status] || STATUS_CONFIG.todo

  if (compact) {
    return (
      <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full ${color}`} title={label}>
        <Icon className="w-3 h-3" />
      </span>
    )
  }

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full ${color}`}>
      <Icon className="w-3 h-3" />
      {label}
    </span>
  )
})

/**
 * Priority badge component (replaces the old PriorityDot)
 */
const PriorityBadge = memo(function PriorityBadge({ priority, compact = false }: { priority: string; compact?: boolean }) {
  const { bg, text, dot, label } = PRIORITY_CONFIG[priority] ?? PRIORITY_CONFIG.medium

  if (compact) {
    return (
      <span
        className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${dot}`}
        title={`Priorità: ${label}`}
        aria-label={`Priorità ${label}`}
      />
    )
  }
  return (
    <span
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${bg} ${text}`}
      title={`Priorità: ${label}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
      {label}
    </span>
  )
})

/**
 * Progress bar component
 */
const ProgressBar = memo(function ProgressBar({ progress, size = 'md' }: { progress: number; size?: 'sm' | 'md' }) {
  const height = size === 'sm' ? 'h-1.5' : 'h-2'
  const capped = Math.min(Math.round(progress), 100)
  const fillClass =
    capped === 100
      ? 'bg-gradient-to-r from-green-400 to-green-500'
      : capped > 50
        ? 'bg-gradient-to-r from-blue-400 to-blue-500'
        : 'bg-gradient-to-r from-amber-400 to-amber-500'

  return (
    <div
      className={`w-full bg-gray-200/70 dark:bg-gray-700/70 rounded-full ${height} overflow-hidden`}
      role="progressbar"
      aria-valuenow={capped}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`Progresso: ${capped}%`}
    >
      <div
        className={`${height} rounded-full ${fillClass} transition-all duration-500`}
        style={{ width: `${capped}%` }}
      />
    </div>
  )
})

/**
 * Smooth height animation wrapper for collapsible tree sections
 */
const AnimatedCollapse = memo(function AnimatedCollapse({ isVisible, children }: { isVisible: boolean; children: React.ReactNode }) {
  return (
    <AnimatePresence initial={false}>
      {isVisible && (
        <motion.div
          key="content"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.2, ease: 'easeInOut' }}
          style={{ overflow: 'hidden' }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  )
})

/**
 * Assignee avatar with initials
 */
const AssigneeAvatar = memo(function AssigneeAvatar({
  assignee,
  compact = false,
}: {
  assignee: { firstName: string; lastName: string; avatarUrl?: string | null } | null
  compact?: boolean
}) {
  if (!assignee) return null
  const initials = `${assignee.firstName[0] ?? ''}${assignee.lastName[0] ?? ''}`.toUpperCase()
  const { bg, text } = getAvatarColorByName(assignee.firstName, assignee.lastName)

  if (compact) {
    return (
      <span
        className={`w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center flex-shrink-0 ${bg} ${text}`}
        title={`${assignee.firstName} ${assignee.lastName}`}
        aria-label={`Assegnato a ${assignee.firstName} ${assignee.lastName}`}
      >
        {initials}
      </span>
    )
  }

  return (
    <span
      className="flex items-center gap-1.5 flex-shrink-0"
      title={`${assignee.firstName} ${assignee.lastName}`}
    >
      <span
        className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center ${bg} ${text}`}
        aria-hidden="true"
      >
        {initials}
      </span>
      <span className="text-xs text-gray-600 dark:text-gray-400">
        {assignee.firstName} {assignee.lastName[0]}.
      </span>
    </span>
  )
})

/**
 * Statistics summary component
 */
const StatsSummary = memo(function StatsSummary({ stats, compact = false }: { stats: TaskTreeStats; compact?: boolean }) {
  if (compact) {
    return (
      <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
        <span className="flex items-center gap-1" title="Completati">
          <CheckCircle className="w-3 h-3 text-green-500" />
          {stats.completed}
        </span>
        <span className="flex items-center gap-1" title="In corso">
          <Loader2 className="w-3 h-3 text-blue-500" />
          {stats.inProgress}
        </span>
        {stats.blocked > 0 && (
          <span className="flex items-center gap-1" title="Bloccati">
            <AlertTriangle className="w-3 h-3 text-red-500" />
            {stats.blocked}
          </span>
        )}
        {stats.totalHours > 0 && (
          <span className="flex items-center gap-1" title="Ore registrate">
            <Clock className="w-3 h-3" />
            {formatHoursFromDecimal(stats.totalHours)}
          </span>
        )}
      </div>
    )
  }

  const progress = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0

  return (
    <div className="flex flex-wrap items-center gap-3 text-xs">
      <div className="flex items-center gap-2">
        <span className="text-gray-500 dark:text-gray-400">Avanzamento:</span>
        <div className="w-24">
          <ProgressBar progress={progress} size="sm" />
        </div>
        <span className="font-medium text-gray-700 dark:text-gray-300">{progress}%</span>
      </div>
      <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
        <span className="flex items-center gap-1">
          <CheckCircle className="w-3 h-3 text-green-500" />
          {stats.completed}/{stats.total}
        </span>
        {stats.blocked > 0 && (
          <span className="flex items-center gap-1 text-red-500">
            <AlertTriangle className="w-3 h-3" />
            {stats.blocked} bloccati
          </span>
        )}
        {stats.totalHours > 0 && (
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {formatHoursFromDecimal(stats.totalHours)}
          </span>
        )}
      </div>
    </div>
  )
})

/**
 * Subtask node component (recursive)
 */
const SubtaskNodeItem = memo(function SubtaskNodeItem({
  subtask,
  level,
  isExpanded,
  onToggle,
  expandedTasks,
  maxDepth,
  compact,
  onTimerToggle,
  runningTimerId,
  canTrackTime,
  editable = false,
  onEditChange,
}: {
  subtask: SubtaskNode
  level: number
  isExpanded: boolean
  onToggle: (id: string) => void
  expandedTasks: Set<string>
  maxDepth: number
  compact: boolean
  onTimerToggle?: (taskId: string) => void
  runningTimerId?: string | null
  canTrackTime?: boolean
  editable?: boolean
  onEditChange?: () => void
}) {
  const hasChildren = subtask.subtasks && subtask.subtasks.length > 0
  const canExpand = maxDepth === 0 || level < maxDepth
  const paddingLeft = compact ? 16 + level * 12 : 24 + level * 20
  const isTimerRunning = runningTimerId === subtask.id

  return (
    <div>
      <div
        className={`tree-connector-row flex items-center gap-2 py-2 px-3 hover:bg-gray-50/80 dark:hover:bg-surface-800/50 cursor-pointer transition-colors duration-150 ${
          compact ? 'py-1.5' : ''
        }`}
        style={{ paddingLeft: `${paddingLeft}px` }}
        onClick={() => hasChildren && canExpand && onToggle(subtask.id)}
      >
        {hasChildren && canExpand ? (
          <ChevronRight
            className={`w-4 h-4 text-gray-400 transition-transform flex-shrink-0 ${isExpanded ? 'rotate-90' : ''}`}
          />
        ) : (
          <span className="w-4 flex-shrink-0" />
        )}

        {editable ? (
          <InlineSelect
            value={subtask.priority}
            options={PRIORITY_OPTIONS}
            onChange={async (newPriority) => {
              const { updateTask } = useTaskStore.getState()
              await updateTask(subtask.id, { priority: newPriority as TaskPriority })
              onEditChange?.()
            }}
            size="sm"
          />
        ) : (
          <PriorityBadge priority={subtask.priority} compact />
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Link
              to={`/tasks/${subtask.id}`}
              className={`text-gray-500 dark:text-gray-400 truncate hover:text-primary-600 dark:hover:text-primary-400 transition-colors ${
                compact ? 'text-xs' : 'text-sm'
              } ${subtask.status === 'done' || subtask.status === 'cancelled' ? 'line-through opacity-60' : ''}`}
              onClick={(e) => e.stopPropagation()}
            >
              {subtask.title}
            </Link>
          </div>
        </div>

        {editable ? (
          <InlineSelect
            value={subtask.status}
            options={STATUS_OPTIONS}
            onChange={async (newStatus) => {
              const { changeTaskStatus } = useTaskStore.getState()
              await changeTaskStatus(subtask.id, newStatus as TaskStatus)
              onEditChange?.()
            }}
            size="sm"
          />
        ) : (
          <StatusBadge status={subtask.status} compact={compact} />
        )}

        {editable ? (
          <InlineUserSelect
            value={subtask.assignee?.id ?? null}
            displayUser={subtask.assignee}
            onChange={async (userId) => {
              const { updateTask } = useTaskStore.getState()
              await updateTask(subtask.id, { assigneeId: userId })
              onEditChange?.()
            }}
            size="sm"
            allowClear
          />
        ) : (
          <AssigneeAvatar assignee={subtask.assignee} compact={compact} />
        )}

        {!compact && <DepartmentBadge department={subtask.department} size="sm" />}

        {/* Dependency indicators */}
        {subtask.blockedBy && subtask.blockedBy.length > 0 && (
          <span
            className="flex items-center gap-0.5 text-xs text-red-500 dark:text-red-400 flex-shrink-0"
            title={`Bloccato da: ${subtask.blockedBy.map((d) => d.code).join(', ')}`}
          >
            <Link2 className={`${compact ? 'w-3 h-3' : 'w-3.5 h-3.5'}`} />
            <span className="hidden sm:inline">{subtask.blockedBy.length}</span>
          </span>
        )}
        {subtask.blocks && subtask.blocks.length > 0 && (
          <span
            className="flex items-center gap-0.5 text-xs text-blue-500 dark:text-blue-400 flex-shrink-0"
            title={`Blocca: ${subtask.blocks.map((d) => d.code).join(', ')}`}
          >
            <ArrowRightCircle className={`${compact ? 'w-3 h-3' : 'w-3.5 h-3.5'}`} />
            <span className="hidden sm:inline">{subtask.blocks.length}</span>
          </span>
        )}

        {canTrackTime && onTimerToggle && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onTimerToggle(subtask.id)
            }}
            className={`p-1.5 rounded-lg transition-all flex-shrink-0 ${
              isTimerRunning
                ? 'bg-red-100 dark:bg-red-900/30 text-red-500'
                : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-primary-500'
            }`}
            title={isTimerRunning ? 'Stop timer' : 'Avvia timer'}
          >
            {isTimerRunning ? <Square className="w-3 h-3" /> : <Play className="w-3 h-3" />}
          </button>
        )}

        {!compact && hasChildren && <StatsSummary stats={subtask.stats} compact />}
      </div>

      <AnimatedCollapse isVisible={!!(hasChildren && isExpanded && canExpand)}>
        <div>
          {subtask.subtasks.map((child) => (
            <SubtaskNodeItem
              key={child.id}
              subtask={child}
              level={level + 1}
              isExpanded={expandedTasks.has(child.id)}
              onToggle={onToggle}
              expandedTasks={expandedTasks}
              maxDepth={maxDepth}
              compact={compact}
              onTimerToggle={onTimerToggle}
              runningTimerId={runningTimerId}
              canTrackTime={canTrackTime}
              editable={editable}
              onEditChange={onEditChange}
            />
          ))}
        </div>
      </AnimatedCollapse>
    </div>
  )
})

/**
 * Task node component
 */
const TaskNodeItem = memo(function TaskNodeItem({
  task,
  isExpanded,
  onToggle,
  expandedTasks,
  maxDepth,
  compact,
  onTimerToggle,
  runningTimerId,
  canTrackTime,
  editable = false,
  onEditChange,
}: {
  task: TaskNode
  isExpanded: boolean
  onToggle: (id: string) => void
  expandedTasks: Set<string>
  maxDepth: number
  compact: boolean
  onTimerToggle?: (taskId: string) => void
  runningTimerId?: string | null
  canTrackTime?: boolean
  editable?: boolean
  onEditChange?: () => void
}) {
  const hasChildren = task.subtasks && task.subtasks.length > 0
  const canExpand = maxDepth === 0 || maxDepth > 1
  const isTimerRunning = runningTimerId === task.id

  return (
    <div className={compact ? 'ml-2' : 'ml-4'}>
      <div
        className={`tree-connector-row flex items-center gap-2 px-3 hover:bg-blue-50/60 dark:hover:bg-blue-900/10 cursor-pointer transition-colors duration-150 rounded-r-lg ${
          compact ? 'py-1.5' : 'py-2.5'
        }`}
        onClick={() => hasChildren && canExpand && onToggle(task.id)}
      >
        {hasChildren && canExpand ? (
          <ChevronRight
            className={`w-4 h-4 text-gray-400 transition-transform flex-shrink-0 ${isExpanded ? 'rotate-90' : ''}`}
          />
        ) : (
          <span className="w-4 flex-shrink-0" />
        )}

        <CheckSquare className={`text-blue-500 flex-shrink-0 ${compact ? 'w-3.5 h-3.5' : 'w-4 h-4'}`} />

        {editable ? (
          <InlineSelect
            value={task.priority}
            options={PRIORITY_OPTIONS}
            onChange={async (newPriority) => {
              const { updateTask } = useTaskStore.getState()
              await updateTask(task.id, { priority: newPriority as TaskPriority })
              onEditChange?.()
            }}
            size="sm"
          />
        ) : (
          <PriorityBadge priority={task.priority} compact={compact} />
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Link
              to={`/tasks/${task.id}`}
              className={`font-medium text-gray-800 dark:text-gray-200 truncate hover:text-primary-600 dark:hover:text-primary-400 transition-colors ${
                compact ? 'text-sm' : ''
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              {task.title}
            </Link>
          </div>
        </div>

        {editable ? (
          <InlineSelect
            value={task.status}
            options={STATUS_OPTIONS}
            onChange={async (newStatus) => {
              const { changeTaskStatus } = useTaskStore.getState()
              await changeTaskStatus(task.id, newStatus as TaskStatus)
              onEditChange?.()
            }}
            size="sm"
          />
        ) : (
          <StatusBadge status={task.status} compact={compact} />
        )}

        {editable ? (
          <InlineUserSelect
            value={task.assignee?.id ?? null}
            displayUser={task.assignee}
            onChange={async (userId) => {
              const { updateTask } = useTaskStore.getState()
              await updateTask(task.id, { assigneeId: userId })
              onEditChange?.()
            }}
            size="sm"
            allowClear
          />
        ) : (
          <AssigneeAvatar assignee={task.assignee} compact={compact} />
        )}

        {!compact && <DepartmentBadge department={task.department} size="sm" />}

        {/* Dependency indicators */}
        {task.blockedBy && task.blockedBy.length > 0 && (
          <span
            className="flex items-center gap-0.5 text-xs text-red-500 dark:text-red-400 flex-shrink-0"
            title={`Bloccato da: ${task.blockedBy.map((d) => d.code).join(', ')}`}
          >
            <Link2 className={`${compact ? 'w-3 h-3' : 'w-3.5 h-3.5'}`} />
            <span className="hidden sm:inline">{task.blockedBy.length}</span>
          </span>
        )}
        {task.blocks && task.blocks.length > 0 && (
          <span
            className="flex items-center gap-0.5 text-xs text-blue-500 dark:text-blue-400 flex-shrink-0"
            title={`Blocca: ${task.blocks.map((d) => d.code).join(', ')}`}
          >
            <ArrowRightCircle className={`${compact ? 'w-3 h-3' : 'w-3.5 h-3.5'}`} />
            <span className="hidden sm:inline">{task.blocks.length}</span>
          </span>
        )}

        {canTrackTime && onTimerToggle && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onTimerToggle(task.id)
            }}
            className={`p-1.5 rounded-lg transition-all flex-shrink-0 ${
              isTimerRunning
                ? 'bg-red-100 dark:bg-red-900/30 text-red-500'
                : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-primary-500'
            }`}
            title={isTimerRunning ? 'Stop timer' : 'Avvia timer'}
          >
            {isTimerRunning ? <Square className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          </button>
        )}

        {!compact && hasChildren && <StatsSummary stats={task.stats} compact />}
      </div>

      <AnimatedCollapse isVisible={!!(hasChildren && isExpanded && canExpand)}>
        <div className={`tree-connector ${compact ? 'ml-1' : 'ml-2'}`}>
          {task.subtasks.map((subtask) => (
            <SubtaskNodeItem
              key={subtask.id}
              subtask={subtask}
              level={0}
              isExpanded={expandedTasks.has(subtask.id)}
              onToggle={onToggle}
              expandedTasks={expandedTasks}
              maxDepth={maxDepth > 0 ? maxDepth - 1 : 0}
              compact={compact}
              onTimerToggle={onTimerToggle}
              runningTimerId={runningTimerId}
              canTrackTime={canTrackTime}
              editable={editable}
              onEditChange={onEditChange}
            />
          ))}
        </div>
      </AnimatedCollapse>
    </div>
  )
})

/**
 * Milestone node component
 */
const MilestoneNodeItem = memo(function MilestoneNodeItem({
  milestone,
  isExpanded,
  onToggle,
  expandedTasks,
  onToggleTask,
  maxDepth,
  compact,
  onTimerToggle,
  runningTimerId,
  canTrackTime,
  editable = false,
  onEditChange,
}: {
  milestone: MilestoneNode
  isExpanded: boolean
  onToggle: () => void
  expandedTasks: Set<string>
  onToggleTask: (id: string) => void
  maxDepth: number
  compact: boolean
  onTimerToggle?: (taskId: string) => void
  runningTimerId?: string | null
  canTrackTime?: boolean
  editable?: boolean
  onEditChange?: () => void
}) {
  const hasTasks = milestone.tasks && milestone.tasks.length > 0
  const canExpand = maxDepth === 0 || maxDepth > 1
  const progress = milestone.stats.total > 0 ? Math.round((milestone.stats.completed / milestone.stats.total) * 100) : 0

  return (
    <div className={`border-l-4 border-amber-400 dark:border-amber-500 ${compact ? 'ml-2' : 'ml-4'}`}>
      <div
        className={`tree-connector-row flex items-center gap-2 px-3 bg-gradient-to-r from-amber-50/80 to-transparent dark:from-amber-900/15 dark:to-transparent hover:from-amber-100/60 dark:hover:from-amber-900/25 cursor-pointer transition-colors duration-150 ${
          compact ? 'py-2' : 'py-3'
        }`}
        onClick={() => hasTasks && canExpand && onToggle()}
      >
        {hasTasks && canExpand ? (
          <ChevronRight
            className={`w-4 h-4 text-gray-400 transition-transform flex-shrink-0 ${isExpanded ? 'rotate-90' : ''}`}
          />
        ) : (
          <span className="w-4 flex-shrink-0" />
        )}

        <Target className={`text-amber-500 flex-shrink-0 ${compact ? 'w-4 h-4' : 'w-5 h-5'}`} />

        {editable ? (
          <InlineSelect
            value={milestone.priority}
            options={PRIORITY_OPTIONS}
            onChange={async (newPriority) => {
              const { updateTask } = useTaskStore.getState()
              await updateTask(milestone.id, { priority: newPriority as TaskPriority })
              onEditChange?.()
            }}
            size="sm"
          />
        ) : (
          <PriorityBadge priority={milestone.priority} compact={compact} />
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Link
              to={`/tasks/${milestone.id}`}
              className={`font-semibold text-amber-800 dark:text-amber-300 truncate hover:text-amber-600 dark:hover:text-amber-200 transition-colors ${
                compact ? 'text-xs' : 'text-sm'
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              {milestone.title}
            </Link>
          </div>
        </div>

        {/* Progress for milestone */}
        <div className="flex items-center gap-1.5 sm:gap-2 min-w-[100px] sm:min-w-[120px]">
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {milestone.stats.completed}/{milestone.stats.total}
          </span>
          <div className="w-16">
            <ProgressBar progress={progress} size="sm" />
          </div>
          <span className="text-xs font-medium text-gray-700 dark:text-gray-300 w-8">{progress}%</span>
        </div>

        {!compact && (
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {formatHoursFromDecimal(milestone.stats.totalHours)}/{formatHoursFromDecimal(milestone.stats.estimatedHours)}
          </span>
        )}

        {editable ? (
          <InlineUserSelect
            value={milestone.assignee?.id ?? null}
            displayUser={milestone.assignee}
            onChange={async (userId) => {
              const { updateTask } = useTaskStore.getState()
              await updateTask(milestone.id, { assigneeId: userId })
              onEditChange?.()
            }}
            size="sm"
            allowClear
          />
        ) : (
          <AssigneeAvatar assignee={milestone.assignee} compact={compact} />
        )}

        {/* Dependency indicators */}
        {milestone.blockedBy && milestone.blockedBy.length > 0 && (
          <span
            className="flex items-center gap-0.5 text-xs text-red-500 dark:text-red-400 flex-shrink-0"
            title={`Bloccato da: ${milestone.blockedBy.map((d) => d.code).join(', ')}`}
          >
            <Link2 className={`${compact ? 'w-3 h-3' : 'w-3.5 h-3.5'}`} />
            <span className="hidden sm:inline">{milestone.blockedBy.length}</span>
          </span>
        )}
        {milestone.blocks && milestone.blocks.length > 0 && (
          <span
            className="flex items-center gap-0.5 text-xs text-blue-500 dark:text-blue-400 flex-shrink-0"
            title={`Blocca: ${milestone.blocks.map((d) => d.code).join(', ')}`}
          >
            <ArrowRightCircle className={`${compact ? 'w-3 h-3' : 'w-3.5 h-3.5'}`} />
            <span className="hidden sm:inline">{milestone.blocks.length}</span>
          </span>
        )}

        {!compact && <DepartmentBadge department={milestone.department} size="sm" />}
      </div>

      <AnimatedCollapse isVisible={!!(hasTasks && isExpanded && canExpand)}>
        <div className={`tree-connector ${compact ? 'ml-1' : 'ml-2'}`}>
          {milestone.tasks.map((task) => (
            <TaskNodeItem
              key={task.id}
              task={task}
              isExpanded={expandedTasks.has(task.id)}
              onToggle={onToggleTask}
              expandedTasks={expandedTasks}
              maxDepth={maxDepth > 0 ? maxDepth - 1 : 0}
              compact={compact}
              onTimerToggle={onTimerToggle}
              runningTimerId={runningTimerId}
              canTrackTime={canTrackTime}
              editable={editable}
              onEditChange={onEditChange}
            />
          ))}
        </div>
      </AnimatedCollapse>
    </div>
  )
})

/**
 * Project node component
 */
const ProjectNodeItem = memo(function ProjectNodeItem({
  project,
  isExpanded,
  onToggle,
  expandedMilestones,
  onToggleMilestone,
  expandedTasks,
  onToggleTask,
  maxDepth,
  compact,
  onTimerToggle,
  runningTimerId,
  canTrackTime,
  editable = false,
  onEditChange,
}: {
  project: ProjectNode
  isExpanded: boolean
  onToggle: () => void
  expandedMilestones: Set<string>
  onToggleMilestone: (id: string) => void
  expandedTasks: Set<string>
  onToggleTask: (id: string) => void
  maxDepth: number
  compact: boolean
  onTimerToggle?: (taskId: string) => void
  runningTimerId?: string | null
  canTrackTime?: boolean
  editable?: boolean
  onEditChange?: () => void
}) {
  const hasMilestones = project.milestones && project.milestones.length > 0
  const hasTasks = project.tasks && project.tasks.length > 0
  const hasContent = hasMilestones || hasTasks

  return (
    <div className={`card overflow-hidden ${compact ? 'shadow-sm' : ''}`}>
      <div
        className={`flex items-center gap-3 bg-gradient-to-r from-primary-100/80 to-transparent dark:from-primary-900/30 dark:to-transparent border-l-4 border-primary-400 dark:border-primary-600 cursor-pointer ${
          compact ? 'p-3' : 'p-4'
        }`}
        onClick={onToggle}
      >
        <ChevronRight
          className={`w-5 h-5 text-gray-400 transition-transform flex-shrink-0 ${isExpanded ? 'rotate-90' : ''}`}
        />

        <div className={`flex items-center justify-center rounded-lg bg-primary-100 dark:bg-primary-900/40 flex-shrink-0 ${compact ? 'w-7 h-7' : 'w-8 h-8'}`}>
          <FolderKanban className={`text-primary-600 dark:text-primary-400 ${compact ? 'w-4 h-4' : 'w-5 h-5'}`} />
        </div>

        <PriorityBadge priority={project.priority} compact={compact} />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Link
              to={`/projects/${project.id}`}
              className={`font-bold text-gray-900 dark:text-white truncate hover:text-primary-600 dark:hover:text-primary-400 transition-colors ${
                compact ? 'text-sm' : 'text-base'
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              {project.name}
            </Link>
          </div>
        </div>

        {!compact && <StatusBadge status={project.status} />}
        <AssigneeAvatar assignee={project.owner} compact={compact} />
      </div>

      {!compact && (
        <div className="px-4 pb-3 border-b border-gray-100 dark:border-gray-800">
          <StatsSummary stats={project.stats} />
        </div>
      )}

      <AnimatedCollapse isVisible={!!(hasContent && isExpanded)}>
        <div className={`tree-connector ${compact ? 'py-1' : 'py-2'}`}>
          {/* Render milestones first */}
          {hasMilestones &&
            project.milestones.map((milestone) => (
              <MilestoneNodeItem
                key={milestone.id}
                milestone={milestone}
                isExpanded={expandedMilestones.has(milestone.id)}
                onToggle={() => onToggleMilestone(milestone.id)}
                expandedTasks={expandedTasks}
                onToggleTask={onToggleTask}
                maxDepth={maxDepth}
                compact={compact}
                onTimerToggle={onTimerToggle}
                runningTimerId={runningTimerId}
                canTrackTime={canTrackTime}
                editable={editable}
                onEditChange={onEditChange}
              />
            ))}

          {/* Render orphan tasks (tasks without milestone) */}
          {hasTasks &&
            project.tasks.map((task) => (
              <TaskNodeItem
                key={task.id}
                task={task}
                isExpanded={expandedTasks.has(task.id)}
                onToggle={onToggleTask}
                expandedTasks={expandedTasks}
                maxDepth={maxDepth}
                compact={compact}
                onTimerToggle={onTimerToggle}
                runningTimerId={runningTimerId}
                canTrackTime={canTrackTime}
                editable={editable}
                onEditChange={onEditChange}
              />
            ))}
        </div>
      </AnimatedCollapse>

      {!hasContent && isExpanded && (
        <EmptyState icon={CheckSquare} title="Nessun task in questo progetto" compact />
      )}
    </div>
  )
})

/**
 * Skeleton loading state for TaskTreeView
 */
const TaskTreeSkeleton = memo(function TaskTreeSkeleton() {
  return (
    <div className="space-y-3 animate-fade-in">
      {/* Summary cards skeleton */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
            <div className="skeleton h-3 w-16 mb-2 rounded" />
            <div className="skeleton h-6 w-10 rounded" />
          </div>
        ))}
      </div>
      {/* Project nodes skeleton */}
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="p-4 flex items-center gap-3">
            <div className="skeleton h-5 w-5 rounded" />
            <div className="skeleton h-5 w-48 rounded" />
            <div className="ml-auto skeleton h-4 w-24 rounded" />
          </div>
          <div className="px-4 pb-4 space-y-2">
            {Array.from({ length: 2 + i }).map((_, j) => (
              <div key={j} className="flex items-center gap-3 py-2 px-3">
                <div className="skeleton h-4 w-4 rounded" />
                <div className="skeleton h-4 w-16 rounded" />
                <div className="skeleton h-4 rounded" style={{ width: `${120 + j * 40}px` }} />
                <div className="ml-auto skeleton h-4 w-20 rounded" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
})

/**
 * Summary cards component
 */
const SummaryCards = memo(function SummaryCards({
  summary,
}: {
  summary: {
    totalProjects: number
    totalMilestones: number
    totalTasks: number
    totalSubtasks: number
    overallProgress: number
    totalHoursLogged: number
  }
}) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 mb-6">
      <div className="card p-4 bg-primary-50/50 dark:bg-primary-900/10">
        <div className="flex items-center justify-between mb-1">
          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide font-medium">Progetti</p>
          <FolderKanban className="w-4 h-4 text-primary-500 dark:text-primary-400 opacity-70" />
        </div>
        <p className="text-2xl font-bold text-primary-600 dark:text-primary-400">{summary.totalProjects}</p>
      </div>
      <div className="card p-4 bg-amber-50/50 dark:bg-amber-900/10">
        <div className="flex items-center justify-between mb-1">
          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide font-medium">Milestone</p>
          <Target className="w-4 h-4 text-amber-500 dark:text-amber-400 opacity-70" />
        </div>
        <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{summary.totalMilestones}</p>
      </div>
      <div className="card p-4 bg-blue-50/50 dark:bg-blue-900/10">
        <div className="flex items-center justify-between mb-1">
          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide font-medium">Task</p>
          <CheckSquare className="w-4 h-4 text-blue-500 dark:text-blue-400 opacity-70" />
        </div>
        <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{summary.totalTasks}</p>
      </div>
      <div className="card p-4 bg-gray-50/50 dark:bg-gray-800/30">
        <div className="flex items-center justify-between mb-1">
          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide font-medium">Subtask</p>
          <CheckCircle className="w-4 h-4 text-gray-500 dark:text-gray-400 opacity-70" />
        </div>
        <p className="text-2xl font-bold text-gray-700 dark:text-gray-300">{summary.totalSubtasks}</p>
      </div>
      <div className="card p-4 bg-gradient-to-br from-blue-50/80 to-transparent dark:from-blue-900/15 dark:to-transparent">
        <div className="flex items-center justify-between mb-1">
          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide font-medium">Avanzamento</p>
          <BarChart3 className="w-4 h-4 text-blue-500 opacity-70" />
        </div>
        <div className="flex items-center gap-2">
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{summary.overallProgress}%</p>
          <div className="flex-1 mt-1">
            <ProgressBar progress={summary.overallProgress} size="sm" />
          </div>
        </div>
      </div>
      <div className="card p-4 bg-teal-50/50 dark:bg-teal-900/10">
        <div className="flex items-center justify-between mb-1">
          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide font-medium">Ore Totali</p>
          <Clock className="w-4 h-4 text-teal-500 dark:text-teal-400 opacity-70" />
        </div>
        <p className="text-2xl font-bold text-gray-900 dark:text-white">{summary.totalHoursLogged}h</p>
      </div>
    </div>
  )
})

/**
 * Main TaskTreeView component
 */
export function TaskTreeView({
  mode = 'full',
  myTasksOnly: propMyTasksOnly,
  filterUserId: propFilterUserId,
  excludeCompleted: propExcludeCompleted,
  showSummary = true,
  showControls = true,
  showFilters = false,
  maxDepth = 0,
  projectId,
  parentTaskId,
  skipProjectLevel = false,
  onTimerToggle,
  runningTimerId,
  canTrackTime = false,
  className = '',
  editable = false,
}: TaskTreeViewProps) {
  const {
    treeData,
    expandedProjects,
    expandedMilestones,
    expandedTasks,
    isLoading,
    error,
    myTasksOnly,
    filterUserId,
    excludeCompleted,
    fetchTaskTree,
    toggleProject,
    toggleMilestone,
    toggleTask,
    expandAll,
    collapseAll,
    setMyTasksOnly,
    setExcludeCompleted,
    clearError,
  } = useTaskTreeStore()

  const compact = mode === 'compact'

  const fetchParams = useMemo(() => ({
    projectId,
    parentTaskId,
    myTasksOnly: propMyTasksOnly ?? myTasksOnly,
    filterUserId: propFilterUserId ?? filterUserId ?? undefined,
    excludeCompleted: propExcludeCompleted ?? excludeCompleted,
  }), [projectId, parentTaskId, propMyTasksOnly, myTasksOnly, propFilterUserId, filterUserId, propExcludeCompleted, excludeCompleted])

  useEffect(() => {
    fetchTaskTree(fetchParams)
  }, [fetchTaskTree, fetchParams])

  const handleEditChange = useCallback(() => {
    fetchTaskTree(fetchParams)
  }, [fetchTaskTree, fetchParams])

  if (isLoading && !treeData) {
    return <TaskTreeSkeleton />
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
        <p className="text-red-600 dark:text-red-400">{error}</p>
        <button onClick={clearError} className="text-sm text-red-500 underline mt-1">
          Chiudi
        </button>
      </div>
    )
  }

  // Subtask mode (parentTaskId)
  if (parentTaskId) {
    const subtasks = treeData?.subtasks
    if (!subtasks || subtasks.length === 0) {
      return <EmptyState icon={CheckSquare} title="Nessun subtask" compact={compact} />
    }

    return (
      <div className={className}>
        {subtasks.map((subtask) => (
          <SubtaskNodeItem
            key={subtask.id}
            subtask={subtask}
            level={0}
            isExpanded={expandedTasks.has(subtask.id)}
            onToggle={toggleTask}
            expandedTasks={expandedTasks}
            maxDepth={maxDepth}
            compact={compact}
            onTimerToggle={onTimerToggle}
            runningTimerId={runningTimerId}
            canTrackTime={canTrackTime}
            editable={editable}
            onEditChange={handleEditChange}
          />
        ))}
      </div>
    )
  }

  if (!treeData || treeData.projects.length === 0) {
    return (
      <EmptyState
        icon={FolderKanban}
        title="Nessun task disponibile"
        description={!compact ? "I task a cui hai accesso appariranno qui" : undefined}
        compact={compact}
      />
    )
  }

  // Skip project level: render milestones/tasks directly from first project
  if (skipProjectLevel && treeData.projects.length > 0) {
    const project = treeData.projects[0]!
    const hasMilestones = project.milestones && project.milestones.length > 0
    const hasTasks = project.tasks && project.tasks.length > 0

    if (!hasMilestones && !hasTasks) {
      return (
        <EmptyState icon={CheckSquare} title="Nessun task in questo progetto" compact />
      )
    }

    return (
      <div className={className}>
        {hasMilestones &&
          project.milestones.map((milestone) => (
            <MilestoneNodeItem
              key={milestone.id}
              milestone={milestone}
              isExpanded={expandedMilestones.has(milestone.id)}
              onToggle={() => toggleMilestone(milestone.id)}
              expandedTasks={expandedTasks}
              onToggleTask={toggleTask}
              maxDepth={maxDepth}
              compact={compact}
              onTimerToggle={onTimerToggle}
              runningTimerId={runningTimerId}
              canTrackTime={canTrackTime}
              editable={editable}
              onEditChange={handleEditChange}
            />
          ))}
        {hasTasks &&
          project.tasks.map((task) => (
            <TaskNodeItem
              key={task.id}
              task={task}
              isExpanded={expandedTasks.has(task.id)}
              onToggle={toggleTask}
              expandedTasks={expandedTasks}
              maxDepth={maxDepth}
              compact={compact}
              onTimerToggle={onTimerToggle}
              runningTimerId={runningTimerId}
              canTrackTime={canTrackTime}
              editable={editable}
              onEditChange={handleEditChange}
            />
          ))}
      </div>
    )
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Summary */}
      {showSummary && !compact && <SummaryCards summary={treeData.summary} />}

      {/* Controls */}
      {(showControls || showFilters) && (
        <div className="flex items-center justify-between flex-wrap gap-2">
          {!compact && (
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <BarChart3 className="w-4 h-4" />
              <span>Vista gerarchica progetti e task</span>
            </div>
          )}

          <div className="flex items-center gap-2">
            {showFilters && (
              <>
                <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={propMyTasksOnly ?? myTasksOnly}
                    onChange={(e) => setMyTasksOnly(e.target.checked)}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <Filter className="w-3.5 h-3.5" />
                  Solo i miei
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={propExcludeCompleted ?? excludeCompleted}
                    onChange={(e) => setExcludeCompleted(e.target.checked)}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  Nascondi completati
                </label>
              </>
            )}

            {showControls && (
              <>
                <button
                  onClick={expandAll}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors"
                >
                  <ChevronDown className="w-4 h-4" />
                  {!compact && 'Espandi'}
                </button>
                <button
                  onClick={collapseAll}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors"
                >
                  <ChevronUp className="w-4 h-4" />
                  {!compact && 'Comprimi'}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Project tree */}
      <div className={compact ? 'space-y-2' : 'space-y-4'}>
        {treeData.projects.map((project) => (
          <ProjectNodeItem
            key={project.id}
            project={project}
            isExpanded={expandedProjects.has(project.id)}
            onToggle={() => toggleProject(project.id)}
            expandedMilestones={expandedMilestones}
            onToggleMilestone={toggleMilestone}
            expandedTasks={expandedTasks}
            onToggleTask={toggleTask}
            maxDepth={maxDepth}
            compact={compact}
            onTimerToggle={onTimerToggle}
            runningTimerId={runningTimerId}
            canTrackTime={canTrackTime}
            editable={editable}
            onEditChange={handleEditChange}
          />
        ))}
      </div>
    </div>
  )
}
